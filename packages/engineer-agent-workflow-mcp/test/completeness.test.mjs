import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import test, { after, before } from "node:test";
import { parse } from "yaml";

import { createSharedStdioHarness } from "../test-support/stdio-harness.mjs";

const server = createSharedStdioHarness({
  entrypoint: fileURLToPath(new URL("../dist/main.js", import.meta.url)),
  name: "coverage-simulation",
});

before(() => server.start());
after(() => server.close());

for (const operation of ["decision_link_requirements", "decision_record_instruction"]) {
  test(`enrolled ledgers reject prose-only links through ${operation} without recording them`, async (t) => {
    const f = await fixture(t);
    await f.write("Status: Draft\n\n### REAL-001: Actual requirement\nAccept JSON.\n");
    const source = await f.call("decision_record_instruction", {
      category: "media", text: "Accept JSON.", source: "fixture-customer:initial",
      kind: "initial_request", requirement_ids: ["REAL-001"],
    });
    await f.call("specification_review_start");
    await f.write("Status: Draft\n\nExample mentions FAKE-001; this is not a requirement definition.\n");
    const ledgerPath = join(f.project, "docs/specs/coverage/decisions.yaml");
    const before = await readFile(ledgerPath, "utf8");
    const arguments_ = operation === "decision_link_requirements"
      ? { decision_ref: source.decision_ref, requirement_ids: ["FAKE-001"] }
      : {
        category: "media", text: "Accept XML too.", source: "fixture-customer:follow-up",
        kind: "follow_up", requirement_ids: ["FAKE-001"],
      };
    await f.call(operation, arguments_, "BROKEN_REFERENCE");
    assert.equal(await readFile(ledgerPath, "utf8"), before);
  });
}

test("unenrolled legacy ledgers retain prose-based requirement links", async (t) => {
  const f = await fixture(t);
  await f.write("Status: Approved\n\nOLD-001: Accept JSON.\n");
  const source = await f.call("decision_record_instruction", {
    category: "media", text: "Accept JSON.", source: "fixture-customer:initial",
    kind: "initial_request", requirement_ids: ["OLD-001"],
  });
  await f.call("decision_link_requirements", { decision_ref: source.decision_ref, requirement_ids: ["OLD-001"] });
  const state = await f.call("specification_check_state");
  assert.equal(state.status, "pass");
  assert.equal(state.coverage_status, "legacy_unverified");
});

async function fixture(t, specification = "coverage") {
  const project = await mkdtemp(join(tmpdir(), "workflow-coverage-"));
  t.after(() => rm(project, { recursive: true, force: true }));
  let context;
  async function call(name, args = {}, error) {
    const r = await server.callTool({ name, arguments: { ...(context ? { context } : {}), ...args } });
    assert.ok(Buffer.byteLength(JSON.stringify(r)) <= 65536);
    if (error) { assert.equal(r.isError, true); assert.equal(r.structuredContent.error.code, error); return r.structuredContent; }
    assert.notEqual(r.isError, true, JSON.stringify(r));
    context = r.structuredContent.context ?? context;
    return r.structuredContent.result;
  }
  await call("specification_open", { project, specification });
  const p = await call("scope_propose", { depth: "standard", rationale: ["Simulation of completeness."], profiles: [{ id: "core", reason: "CLI contract." }] });
  const a = await call("question_record_answer", { question_ref: p.question_ref, selected_ids: ["confirm"], text: "Confirmed simulation scope.", source: "fixture-customer:scope" });
  await call("scope_confirm", { proposal_ref: p.question_ref, answer_ref: a.decision_ref });
  const path = join(project, "docs/specs", specification, "spec.md");
  await mkdir(join(project, "docs/specs", specification), { recursive: true });
  return { call, project, path, write: (text) => writeFile(path, text) };
}

test("definition links reject an ID present only as prose, quoted heading, or code", async (t) => {
  const f = await fixture(t);
  await f.write("Status: Draft\n\n### REAL-001: Real requirement\nAccept valid JSON.\n\nMention ONLY-001 here.\n\n> ### QUOTE-001: Not a definition\n\n```md\n### CODE-001: Not a definition\n```\n");
  const d = await f.call("decision_record_fact", { category: "baseline", fact: "Existing JSON contract.", evidence: ["src/cli.js"] });
  for (const requirement_id of ["ONLY-001", "QUOTE-001", "CODE-001"])
    await f.call("decision_link_requirements", { decision_ref: d.decision_ref, requirement_ids: [requirement_id] }, "BROKEN_REFERENCE");
  await f.call("decision_link_requirements", { decision_ref: d.decision_ref, requirement_ids: ["REAL-001"] });
});

test("exact requirement reads preserve nested content, Unicode, and bounded continuations", async (t) => {
  const f = await fixture(t);
  const body = "### REQ-001: Unicode\n" + "Accept 😀 and Ж.\n".repeat(700) + "\n#### Recovery\nPreserve input.\n";
  await f.write("Status: Draft\n\n" + body + "\n### REQ-002: Other\nReject invalid input.\n");
  const list = await f.call("requirement_list", { limit: 1 });
  assert.equal(list.total, 2); assert.equal(list.items[0].id, "REQ-001"); assert.ok(list.next_cursor);
  assert.equal((await f.call("requirement_list", { limit: 1, cursor: list.next_cursor })).items[0].id, "REQ-002");
  let text = "", cursor;
  do { const r = await f.call("requirement_get", { requirement_id: "REQ-001", ...(cursor ? { cursor } : {}) }); text += r.text; cursor = r.next_cursor; } while (cursor);
  assert.equal(text, body + "\n");
  const first = await f.call("requirement_get", { requirement_id: "REQ-001" });
  await f.write("Status: Draft\n\n### REQ-001: Changed\nDifferent behavior.\n");
  await f.call("requirement_get", { requirement_id: "REQ-001", cursor: first.next_cursor }, "STALE_CURSOR");
});

test("duplicate and empty requirement blocks fail structurally", async (t) => {
  const f = await fixture(t);
  await f.write("### A-001: First\nBehavior.\n### A-001: Duplicate\nOther.\n");
  await f.call("requirement_list", {}, "INVALID_SPECIFICATION");
  await f.write("### A-001: Empty\n\n### B-001: Full\nBehavior.\n");
  await f.call("requirement_list", {}, "INVALID_SPECIFICATION");
});

test("mechanical state exposes unlinked sources and unsupported requirements", async (t) => {
  const f = await fixture(t);
  await f.write("Status: Draft\n\n### A-001: Required\nPreserve existing behavior.\n");
  const d = await f.call("decision_record_fact", { category: "baseline", fact: "Existing behavior must remain.", evidence: ["src/cli.js"] });
  await f.call("specification_review_start");
  const incomplete = await f.call("specification_check_state");
  assert.equal(incomplete.status, "fail");
  assert.ok(incomplete.issues.some((i) => i.code === "UNLINKED_SOURCE"));
  assert.ok(incomplete.issues.some((i) => i.code === "UNSUPPORTED_REQUIREMENT"));
  await f.call("decision_link_requirements", { decision_ref: d.decision_ref, requirement_ids: ["A-001"] });
  assert.equal((await f.call("specification_check_state")).coverage_status, "stale");
});

test("instructions and context preserve provenance and broad predecessor obligations", async (t) => {
  const f = await fixture(t);
  await f.write("### JSON-001: Media types\nAccept JSON with and without UTF-8 charset.\n");
  const initial = await f.call("decision_record_instruction", { category: "media", text: "Accept JSON with and without charset; do not change identity checks.", source: "fixture-customer:initial", kind: "initial_request" });
  const linked = await f.call("decision_link_requirements", { decision_ref: initial.decision_ref, requirement_ids: ["JSON-001"] });
  const amendment = await f.call("decision_record_instruction", { category: "media", text: "Only UTF-8 charset is supported.", source: "fixture-customer:follow-up", kind: "follow_up", related_decisions: [linked.decision_ref], requirement_ids: ["JSON-001"] });
  assert.notEqual(initial.decision_ref.id, amendment.decision_ref.id);
  const found = await f.call("decision_find", { categories: ["media"] }); assert.equal(found.items.length, 2);
  const full = await f.call("decision_get", { decision_ref: linked.decision_ref });
  assert.match(full.text, /do not change identity checks/);
  const context = await f.call("decision_record_instruction", { category: "process", text: "Report progress in Russian.", source: "fixture-customer:process", kind: "follow_up" });
  const classified = await f.call("decision_mark_context", { decision_ref: context.decision_ref, reason: "Conversation language, not application behavior." });
  assert.equal(classified.classification, "context");
});

test("legacy state is explicit and does not claim the new review", async (t) => {
  const f = await fixture(t);
  await f.write("Status: Approved\n\n- OLD-001: Existing behavior.\n");
  const state = await f.call("specification_check_state");
  assert.equal(state.status, "pass");
  assert.equal(state.coverage_status, "legacy_unverified");
  assert.equal(state.approved_by_tool, false);
});

test("legacy checks do not impose new definition syntax before enrollment", async (t) => {
  const f = await fixture(t);
  await f.write("Status: Approved\n\n### OLD-001: Existing section\n\n### OLD-001: Repeated old label\nExisting behavior.\n");
  const state = await f.call("specification_check_state");
  assert.equal(state.status, "pass");
  assert.equal(state.coverage_status, "legacy_unverified");
  await f.call("specification_review_start", {}, "INVALID_SPECIFICATION");
});

async function startReview(f, body = "Accept JSON with and without UTF-8 charset.") {
  await f.write("Status: Draft\n\n### JSON-001: Media types\n" + body + "\n");
  const d = await f.call("decision_record_instruction", { category: "media", text: body, source: "fixture-customer:initial", kind: "initial_request" });
  await f.call("decision_link_requirements", { decision_ref: d.decision_ref, requirement_ids: ["JSON-001"] });
  return f.call("specification_review_start");
}

async function reviewAll(f, review_ref, gapIndex) {
  let index = 0;
  while (index !== null) {
    let cursor, item, body = "";
    do { item = await f.call("specification_review_get", { review_ref, item_index: index, ...(cursor ? { cursor } : {}) }); body += item.text; cursor = item.next_cursor; } while (cursor);
    const payload = JSON.parse(body);
    if (!item.recorded_result) await f.call("specification_review_record", { review_ref, item_index: index, read_receipt: item.read_receipt, verdict: index === gapIndex ? "gap" : "covered", explanation: "Simulation-only verdict; production review requires a separate model context.", evidence_requirement_ids: payload.kind === "source" ? payload.source.requirement_ids ?? [] : [], evidence_source_refs: payload.kind === "requirement" ? payload.source_refs : [], ...(index === gapIndex ? { counterexample: "A compliant bare JSON request would be rejected." } : {}) });
    index = item.next_item_index;
  }
}

test("review completeness, status transition, and source invalidation are persistent", async (t) => {
  const f = await fixture(t), r = await startReview(f);
  assert.equal((await f.call("specification_check_state")).coverage_status, "pending");
  await f.call("specification_review_complete", { review_ref: r.review_ref }, "INCOMPLETE_REVIEW");
  await reviewAll(f, r.review_ref);
  const completed = await f.call("specification_review_complete", { review_ref: r.review_ref });
  assert.equal(completed.coverage_status, "reviewed");
  assert.equal(completed.semantic_correctness_proven, false);
  await f.write("Status: Approved\n\n### JSON-001: Media types\nAccept JSON with and without UTF-8 charset.\n");
  const approved = await f.call("specification_check_state", { expected_source_version: completed.source_version });
  assert.equal(approved.status, "pass"); assert.equal(approved.coverage_status, "reviewed");
  await f.write("Status: Approved\n\n### JSON-001: Media types\nAccept JSON only with charset.\n");
  const stale = await f.call("specification_check_state");
  assert.equal(stale.status, "fail"); assert.equal(stale.coverage_status, "stale");
});

test("review gaps cannot be overwritten into success", async (t) => {
  const f = await fixture(t), r = await startReview(f);
  await reviewAll(f, r.review_ref, 1);
  assert.equal((await f.call("specification_review_complete", { review_ref: r.review_ref })).coverage_status, "gaps");
  assert.equal((await f.call("specification_check_state")).status, "fail");
  let item, cursor;
  do { item = await f.call("specification_review_get", { review_ref: r.review_ref, item_index: 1, ...(cursor ? { cursor } : {}) }); cursor = item.next_cursor; } while (cursor);
  await f.call("specification_review_record", { review_ref: r.review_ref, item_index: 1, read_receipt: item.read_receipt, verdict: "covered", explanation: "Attempt to replace a completed finding." }, "INVALID_STATE");
  const next = await f.call("specification_review_start"); assert.notEqual(next.review_ref, r.review_ref);
});

test("partial review reads do not provide completion evidence", async (t) => {
  const f = await fixture(t), r = await startReview(f, "Accept JSON. ".repeat(300));
  const first = await f.call("specification_review_get", { review_ref: r.review_ref, item_index: 1 });
  assert.equal(first.complete, false); assert.equal(first.read_receipt, null);
  await f.call("specification_review_record", { review_ref: r.review_ref, item_index: 1, read_receipt: "invented", verdict: "covered", explanation: "No complete read." }, "INCOMPLETE_READ");
  const changed = JSON.parse(Buffer.from(first.next_cursor, "base64url").toString()); changed.offset += 4096;
  await f.call("specification_review_get", { review_ref: r.review_ref, item_index: 1, cursor: Buffer.from(JSON.stringify(changed)).toString("base64url") }, "INVALID_CURSOR");
});

test("a long original instruction is preserved exactly through bounded reads", async (t) => {
  const f = await fixture(t), original = "Preserve this condition and its alternative.\n".repeat(300);
  const recorded = await f.call("decision_record_instruction", { category: "source", text: original, source: "fixture-customer:long-request", kind: "initial_request" });
  let cursor, body = "";
  do { const part = await f.call("decision_get", { decision_ref: recorded.decision_ref, ...(cursor ? { cursor } : {}) }); body += part.text; cursor = part.next_cursor; } while (cursor);
  assert.ok(body.includes(original) || JSON.parse(body).instruction?.text === original);
});

async function readItem(f, review_ref, item_index) {
  let cursor, item, text = "";
  do { item = await f.call("specification_review_get", { review_ref, item_index, ...(cursor ? { cursor } : {}) }); text += item.text; cursor = item.next_cursor; } while (cursor);
  return { ...item, payload: JSON.parse(text) };
}

test("review findings need real references and counterexamples, and cannot exclude an ordinary source", async (t) => {
  const f = await fixture(t), r = await startReview(f), item = await readItem(f, r.review_ref, 1);
  const base = { review_ref: r.review_ref, item_index: 1, read_receipt: item.read_receipt, explanation: "Simulation of an invalid registration." };
  await f.call("specification_review_record", { ...base, verdict: "gap" }, "INVALID_INPUT");
  await f.call("specification_review_record", { ...base, verdict: "not_applicable" }, "INVALID_INPUT");
  await f.call("specification_review_record", { ...base, verdict: "covered" }, "EVIDENCE_REQUIRED");
  await f.call("specification_review_record", { ...base, verdict: "covered", evidence_requirement_ids: ["MISSING-001"] }, "BROKEN_REFERENCE");
  await f.call("specification_review_record", { ...base, verdict: "covered", evidence_requirement_ids: ["JSON-001"], evidence_source_refs: [{ id: "not-a-source", revision: 1 }] }, "BROKEN_REFERENCE");
});

test("pending questions cannot begin review or become context exclusions", async (t) => {
  const f = await fixture(t);
  await startReview(f);
  const q = await f.call("question_prepare", { category: "scope-detail", text: "Which validation rule applies?" });
  const pending = await f.call("question_record_no_answer", { question_ref: q.question_ref, outcome: "dismissed" });
  await f.call("decision_mark_context", { decision_ref: pending.question_ref, reason: "Attempt to exclude an unanswered choice." }, "INVALID_STATE");
  await f.call("specification_review_start", {}, "ANSWER_REQUIRED");
  const state = await f.call("specification_check_state");
  assert.equal(state.status, "fail"); assert.equal(state.issues[0].code, "ANSWER_REQUIRED");
});

test("stored review findings are readable after completion but absent from product search and contain no spec copies", async (t) => {
  const f = await fixture(t), body = "Accept JSON with and without UTF-8 charset.", r = await startReview(f, body);
  const item = await readItem(f, r.review_ref, 1);
  await f.call("specification_review_record", { review_ref: r.review_ref, item_index: 1, read_receipt: item.read_receipt, verdict: "gap", explanation: "REPORT_ONLY_MARKER", counterexample: "A compliant bare request is wrongly rejected." });
  await reviewAll(f, r.review_ref);
  assert.equal((await f.call("specification_review_complete", { review_ref: r.review_ref })).coverage_status, "gaps");
  const retrieved = await readItem(f, r.review_ref, 1);
  assert.equal(retrieved.payload.recorded_result.explanation, "REPORT_ONLY_MARKER");
  assert.equal((await f.call("decision_find", { text: "REPORT_ONLY_MARKER", history: true })).total, 0);
  // This is an isolated fixture assertion, not a workflow YAML access fallback.
  const ledger = parse(await readFile(join(f.project, "docs/specs/coverage/decisions.yaml"), "utf8"));
  assert.equal(ledger.specification_reviews.version, 1);
  assert.equal(JSON.stringify(ledger.specification_reviews).includes(body), false);
  assert.equal(JSON.stringify(ledger.extensions.workflow_mcp_receipts).includes(body), false);
});
