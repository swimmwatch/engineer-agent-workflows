import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import test, { after, before } from "node:test";
import { parse, stringify } from "yaml";

import { createSharedStdioHarness } from "../test-support/stdio-harness.mjs";

const document = (body = "Accept JSON.", status = "Draft") => `# Protocol fixture\n\nStatus: ${status}\n\n### JSON-001: Media support\n${body}\n`;
const server = createSharedStdioHarness({
  entrypoint: fileURLToPath(new URL("../dist/main.js", import.meta.url)),
  name: "completeness-protocol-simulation",
});

before(() => server.start());
after(() => server.close());

async function fixture(t) {
  const project = await mkdtemp(join(tmpdir(), "workflow-completeness-protocol-"));
  let context;
  t.after(() => rm(project, { recursive: true, force: true }));
  async function request(name, args) {
    const response = await server.callTool({ name, arguments: args });
    assert.ok(Buffer.byteLength(JSON.stringify(response)) <= 65536, `${name} exceeded its MCP response budget`);
    context = response.structuredContent?.context ?? context;
    return response;
  }
  async function call(name, args = {}, error) {
    const response = await request(name, { ...(context ? { context } : {}), ...args });
    if (error) {
      assert.equal(response.isError, true);
      assert.equal(response.structuredContent.error.code, error);
      return response.structuredContent;
    }
    assert.notEqual(response.isError, true, JSON.stringify(response.structuredContent));
    return response.structuredContent.result;
  }
  async function confirmScope(depth = "standard") {
    const proposal = await call("scope_propose", { depth, rationale: ["Independent protocol simulation."], profiles: [{ id: "core", reason: "CLI contract." }] });
    const answer = await call("question_record_answer", { question_ref: proposal.question_ref, selected_ids: ["confirm"], text: "Confirmed simulation scope.", source: "fixture-customer:scope" });
    await call("scope_confirm", { proposal_ref: proposal.question_ref, answer_ref: answer.decision_ref });
  }
  await call("specification_open", { project, specification: "coverage" });
  await confirmScope();
  const directory = join(project, "docs/specs/coverage");
  await mkdir(directory, { recursive: true });
  return {
    call, request, confirmScope, project, context: () => context,
    write: (content) => writeFile(join(directory, "spec.md"), content),
    restart: () => server.restart(),
  };
}

async function startReview(f, body = "Accept JSON.") {
  await f.write(document(body));
  await f.call("decision_record_instruction", { category: "media", kind: "initial_request", text: "Accept JSON.", source: "fixture-customer:initial", requirement_ids: ["JSON-001"] });
  return f.call("specification_review_start");
}

async function readItem(f, reviewRef, index, first) {
  let item = first ?? await f.call("specification_review_get", { review_ref: reviewRef, item_index: index });
  let text = item.text;
  while (item.next_cursor) {
    assert.equal(item.complete, false);
    assert.equal(item.read_receipt, null);
    item = await f.call("specification_review_get", { review_ref: reviewRef, item_index: index, cursor: item.next_cursor });
    text += item.text;
  }
  assert.equal(item.complete, true);
  assert.equal(typeof item.read_receipt, "string");
  return { ...item, text };
}

test("related source references are independent of YAML mapping key order", async (t) => {
  const f = await fixture(t);
  await f.write(document());
  const original = await f.call("decision_record_instruction", { category: "media", kind: "initial_request", text: "Preserve the original JSON obligation.", source: "fixture:original", requirement_ids: ["JSON-001"] });
  const amendment = await f.call("decision_record_instruction", { category: "media", kind: "follow_up", text: "Change only the charset condition.", source: "fixture:amendment", related_decisions: [original.decision_ref], requirement_ids: ["JSON-001"] });
  async function relatedSources() {
    const review = await f.call("specification_review_start");
    for (let index = 0; index < review.total_items; index++) {
      const item = await readItem(f, review.review_ref, index);
      if (item.item_key === `source:${amendment.decision_ref.id}`) return JSON.parse(item.text).related_sources;
    }
    assert.fail("The amendment must be included in the source inventory");
  }
  const baseline = await relatedSources();
  assert.ok(baseline.some((source) => source.id === original.decision_ref.id));
  const path = join(f.project, "docs/specs/coverage/decisions.yaml");
  const ledger = parse(await readFile(path, "utf8"));
  const record = ledger.decisions.find((source) => source.id === amendment.decision_ref.id);
  const target = record.related_decisions[0];
  record.related_decisions[0] = { revision: target.revision, id: target.id };
  await writeFile(path, stringify(ledger));
  const reopened = await f.request("specification_open", { project: f.project, specification: "coverage" });
  assert.notEqual(reopened.isError, true);
  assert.deepEqual(await relatedSources(), baseline);
});

test("partial answer amendments retain the predecessor question and every original obligation in review evidence", async (t) => {
  const f = await fixture(t);
  await f.write(`${document()}\n### IDENTITY-001: Identity boundary\nPreserve identity checks.\n`);
  const originalQuestion = "Which media and identity requirements apply?";
  const originalAnswer = "Accept JSON with and without charset; preserve ORIGINAL_IDENTITY_OBLIGATION without modification.";
  const first = await f.call("question_prepare", { category: "media", kind: "free_text", text: originalQuestion });
  const answer = await f.call("question_record_answer", { question_ref: first.question_ref, text: originalAnswer, source: "fixture-customer:original" });
  const linked = await f.call("decision_link_requirements", { decision_ref: answer.decision_ref, requirement_ids: ["JSON-001", "IDENTITY-001"] });
  const amendmentQuestion = "Which charset is supported? Amend only the charset clause.";
  const amendmentAnswer = "Only UTF-8 charset is supported.";
  const amendment = await f.call("question_prepare", { category: "media", kind: "free_text", text: amendmentQuestion, revises: linked.decision_ref });
  const updated = await f.call("question_record_answer", { question_ref: amendment.question_ref, text: amendmentAnswer, source: "fixture-customer:amendment" });
  assert.equal(updated.decision_ref.id, answer.decision_ref.id);
  assert.ok(updated.decision_ref.revision > answer.decision_ref.revision);
  const review = await f.call("specification_review_start");
  const bodies = [];
  for (let index = 0; index < review.total_items; index++) bodies.push((await readItem(f, review.review_ref, index)).text);
  const completeEvidence = bodies.join("\n");
  for (const original of [originalQuestion, originalAnswer, amendmentQuestion, amendmentAnswer, "fixture-customer:original", "fixture-customer:amendment"]) {
    assert.ok(completeEvidence.includes(original), `The review inventory omitted source evidence: ${original}`);
  }
});

test("legacy specifications with explicit requirement headings are not enrolled in new coverage checks", async (t) => {
  const f = await fixture(t);
  await f.write(`${document("Accept JSON.", "Approved")}\n### OLD-002: Existing identity boundary\nPreserve identity checks.\n`);
  const fact = await f.call("decision_record_fact", { category: "legacy", fact: "Existing implementation accepts JSON.", evidence: ["README.md"] });
  await f.call("decision_link_requirements", { decision_ref: fact.decision_ref, requirement_ids: ["JSON-001"] });
  const checked = await f.call("specification_check_state");
  assert.equal(checked.coverage_status, "legacy_unverified");
  assert.equal(checked.review_ref, null);
  assert.equal(checked.status, "pass");
  assert.equal(checked.approved_by_tool, false);
});

test("an observed status downgrade invalidates an unfinished review after restart", async (t) => {
  const f = await fixture(t), review = await startReview(f);
  await f.write(document("Accept JSON.", "Approved"));
  const observed = await f.call("specification_check_state");
  assert.equal(observed.coverage_status, "pending");
  await f.restart();
  await f.write(document());
  const reversed = await f.call("specification_check_state");
  assert.equal(reversed.coverage_status, "stale");
  assert.equal(reversed.status, "fail");
  await f.call("specification_review_get", { review_ref: review.review_ref, item_index: 0 }, "STALE_REVIEW");
  await f.call("specification_review_complete", { review_ref: review.review_ref }, "STALE_REVIEW");
  const fresh = await f.call("specification_review_start");
  assert.notEqual(fresh.review_ref, review.review_ref);
});

test("a requirement with 600 linked source revisions remains completely readable within bounded responses", async (t) => {
  const f = await fixture(t);
  const content = document();
  await f.write(content);
  const seed = await f.call("decision_record_instruction", { category: "media", kind: "follow_up", text: "Instruction 0: accept JSON.", source: "fixture-customer:0", requirement_ids: ["JSON-001"] });
  const ledgerPath = join(f.project, "docs/specs/coverage/decisions.yaml");
  const ledger = parse(await readFile(ledgerPath, "utf8"));
  const template = ledger.decisions.find((decision) => decision.id === seed.decision_ref.id);
  assert.ok(template, "The fixture seed decision must be present in the journal");
  const expanded = Array.from({ length: 600 }, (_, index) => {
    const decision = JSON.parse(JSON.stringify(template));
    decision.id = `bulk-source-${String(index).padStart(3, "0")}`;
    return decision;
  });
  ledger.decisions.splice(ledger.decisions.indexOf(template), 1, ...expanded);
  await writeFile(ledgerPath, stringify(ledger));
  const reopened = await f.request("specification_open", { project: f.project, specification: "coverage" });
  assert.notEqual(reopened.isError, true, JSON.stringify(reopened.structuredContent));
  const expected = new Set(expanded.map((decision) => JSON.stringify({ id: decision.id, revision: decision.revision })));
  const listed = await f.call("requirement_list");
  const actual = new Set(), seenCursors = new Set();
  let cursor, text = "", portions = 0;
  do {
    const part = await f.call("requirement_get", { requirement_id: "JSON-001", source_version: listed.source_version, ...(cursor ? { cursor } : {}) });
    text += part.text;
    for (const reference of part.decision_refs) actual.add(JSON.stringify(reference));
    assert.equal(part.complete, !part.next_cursor);
    cursor = part.next_cursor;
    if (cursor) {
      assert.ok(!seenCursors.has(cursor), "Requirement continuation did not advance");
      seenCursors.add(cursor);
    }
    portions++;
  } while (cursor);
  assert.ok(portions > 1);
  assert.equal(text, content.slice(content.indexOf("### JSON-001")));
  assert.deepEqual(actual, expected);
});

test("review continuations and exact mutation retries survive a stdio server restart", async (t) => {
  const f = await fixture(t);
  const review = await startReview(f, "Accept JSON. ".repeat(1000));
  const first = await f.call("specification_review_get", { review_ref: review.review_ref, item_index: 1 });
  assert.equal(first.complete, false);
  assert.equal(first.read_receipt, null);
  await f.restart();
  const item = await readItem(f, review.review_ref, 1, first);
  const recordArgs = { context: f.context(), review_ref: review.review_ref, item_index: 1, read_receipt: item.read_receipt, verdict: "covered", explanation: "Simulation-only verdict checks restart and exact retry recovery.", evidence_requirement_ids: ["JSON-001"], evidence_source_refs: JSON.parse(item.text).source_refs };
  const recorded = await f.request("specification_review_record", recordArgs);
  assert.notEqual(recorded.isError, true, JSON.stringify(recorded.structuredContent));
  assert.equal(recorded.structuredContent.result.recorded_items, 1);
  await f.restart();
  const retried = await f.request("specification_review_record", recordArgs);
  assert.notEqual(retried.isError, true, JSON.stringify(retried.structuredContent));
  assert.equal(retried.structuredContent.replayed, true);
  assert.deepEqual(retried.structuredContent.result, recorded.structuredContent.result);
  const resumed = await f.call("specification_review_start");
  assert.equal(resumed.review_ref, review.review_ref);
  assert.equal(resumed.recorded_items, 1);
  await f.call("specification_review_complete", { review_ref: review.review_ref }, "INCOMPLETE_REVIEW");
});

test("identical content in another project cannot reuse requirement or review continuations", async (t) => {
  const a = await fixture(t), b = await fixture(t);
  const reviewA = await startReview(a, "Accept JSON. ".repeat(1000));
  const reviewB = await startReview(b, "Accept JSON. ".repeat(1000));
  const requirement = await a.call("requirement_get", { requirement_id: "JSON-001" });
  assert.ok(requirement.next_cursor);
  await b.call("requirement_get", { requirement_id: "JSON-001", cursor: requirement.next_cursor }, "STALE_CURSOR");
  const item = await a.call("specification_review_get", { review_ref: reviewA.review_ref, item_index: 1 });
  assert.ok(item.next_cursor);
  await b.call("specification_review_get", { review_ref: reviewA.review_ref, item_index: 1 }, "NOT_FOUND");
  await b.call("specification_review_get", { review_ref: reviewB.review_ref, item_index: 1, cursor: item.next_cursor }, "STALE_CURSOR");
});

test("source amendments, same-ID specification edits and confirmed scope changes invalidate existing review evidence", async (t) => {
  const f = await fixture(t);
  let review = await startReview(f);
  await f.call("decision_record_instruction", { category: "media", kind: "follow_up", text: "Preserve bare JSON support.", source: "fixture-customer:follow-up", requirement_ids: ["JSON-001"] });
  await f.call("specification_review_get", { review_ref: review.review_ref, item_index: 0 }, "STALE_REVIEW");
  assert.equal((await f.call("specification_check_state")).coverage_status, "stale");
  review = await f.call("specification_review_start");
  await f.write(document("Accept JSON with and without a charset."));
  await f.call("specification_review_complete", { review_ref: review.review_ref }, "STALE_REVIEW");
  assert.equal((await f.call("specification_check_state")).coverage_status, "stale");
  review = await f.call("specification_review_start");
  await f.confirmScope("deep");
  await f.call("specification_review_get", { review_ref: review.review_ref, item_index: 0 }, "STALE_REVIEW");
  const checked = await f.call("specification_check_state", { expected_source_version: review.source_version });
  assert.equal(checked.coverage_status, "stale");
  assert.equal(checked.status, "fail");
  assert.notEqual(checked.source_version, review.source_version);
});

test("an observed approval followed by a restart and a return to Draft invalidates the completed review", async (t) => {
  const f = await fixture(t), review = await startReview(f);
  for (let index = 0; index < review.total_items; index++) {
    const item = await readItem(f, review.review_ref, index);
    await f.call("specification_review_record", { review_ref: review.review_ref, item_index: index, read_receipt: item.read_receipt, verdict: "covered", explanation: "Simulation-only verdict checks the observed approval transition.", evidence_requirement_ids: ["JSON-001"], evidence_source_refs: JSON.parse(item.text).source_refs });
  }
  const completed = await f.call("specification_review_complete", { review_ref: review.review_ref });
  await f.write(document("Accept JSON.", "Approved"));
  const approved = await f.call("specification_check_state", { expected_source_version: completed.source_version });
  assert.equal(approved.coverage_status, "reviewed");
  assert.equal(approved.status, "pass");
  await f.restart();
  await f.write(document());
  const reversed = await f.call("specification_check_state", { expected_source_version: completed.source_version });
  assert.equal(reversed.coverage_status, "stale");
  assert.equal(reversed.status, "fail");
  await f.call("specification_review_get", { review_ref: review.review_ref, item_index: 0 }, "STALE_REVIEW");
});
