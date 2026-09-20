import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import test, { after, before } from "node:test";

import { createSharedStdioHarness } from "../test-support/stdio-harness.mjs";

const server = fileURLToPath(new URL("../dist/main.js", import.meta.url));
const authorServer = createSharedStdioHarness({ entrypoint: server, name: "structured-changes-author" });
const reviewerServer = createSharedStdioHarness({ entrypoint: server, name: "structured-changes-reviewer" });

before(() => Promise.all([authorServer.start(), reviewerServer.start()]));
after(() => Promise.all([authorServer.close(), reviewerServer.close()]));

function actor(harness) {
  let context;
  const stats = { calls: 0, bytes: 0 };
  return { stats, context: () => context, async call(name, input = {}, error) {
    const response = await harness.callTool({ name, arguments: { ...(context && name !== "specification_open" ? { context } : {}), ...input } });
    stats.calls += 1;
    stats.bytes += Buffer.byteLength(JSON.stringify(response));
    if (error) {
      assert.equal(response.isError, true, JSON.stringify(response));
      assert.equal(response.structuredContent.error.code, error, JSON.stringify(response.structuredContent));
      return response.structuredContent;
    }
    assert.notEqual(response.isError, true, JSON.stringify(response.structuredContent));
    context = response.structuredContent.context ?? context;
    return response.structuredContent.result;
  } };
}

async function readItem(client, review, itemIndex) {
  let cursor, result, text = "";
  do {
    result = await client.call("specification_review_get", { review_ref: review.review_ref, item_index: itemIndex, ...(cursor ? { cursor } : {}) });
    text += result.text;
    cursor = result.next_cursor;
  } while (cursor);
  return { ...result, body: JSON.parse(text) };
}

async function recordItem(client, review, itemIndex, gap = false) {
  const read = await readItem(client, review, itemIndex);
  return client.call("specification_review_record", {
    review_ref: review.review_ref,
    item_index: itemIndex,
    read_receipt: read.read_receipt,
    verdict: gap ? "gap" : "covered",
    explanation: gap
      ? `The baseline publication ordering remains contradictory. ${"Detailed Unicode evidence Ω🙂 must remain exact. ".repeat(60)}`
      : "Synthetic structured-change review evidence.",
    ...(gap ? { counterexample: "The shared baseline can publish before validation." } : {}),
    evidence_requirement_ids: read.body.kind === "source" ? read.body.source.requirement_ids ?? [] : [],
    evidence_source_refs: read.body.kind === "requirement" ? read.body.source_refs : [],
  });
}

async function legacyChanges(client, reviewRef) {
  let cursor, result, text = "";
  do {
    result = await client.call("specification_review_changes", { review_ref: reviewRef, ...(cursor ? { cursor } : {}) });
    text += result.text;
    cursor = result.next_cursor;
  } while (cursor);
  return { ...result, body: JSON.parse(text) };
}

async function summary(client, reviewRef) {
  let cursor, result;
  const entries = [];
  do {
    result = await client.call("specification_review_changes_summary", { review_ref: reviewRef, ...(cursor ? { cursor } : {}) });
    assert.equal(result.changes_receipt, undefined);
    assert.ok(result.entries.length <= 20);
    entries.push(...result.entries);
    cursor = result.next_cursor;
  } while (cursor);
  return { ...result, entries };
}

function decodeField(valueType, text) {
  if (valueType === "string") return text;
  if (valueType === "null") return null;
  return JSON.parse(text);
}

async function evidence(client, reviewRef, reportVersion) {
  let cursor, result;
  const fields = new Map();
  do {
    result = await client.call("specification_review_changes_read", {
      review_ref: reviewRef,
      report_version: reportVersion,
      ...(cursor ? { cursor } : {}),
    });
    const fragment = result.fragment;
    if (fragment) {
      const key = `${fragment.evidence_selector}\0${fragment.field}`;
      const current = fields.get(key) ?? { ...fragment, text: "" };
      current.text += fragment.text;
      fields.set(key, current);
    }
    cursor = result.next_cursor;
  } while (cursor);
  const records = new Map();
  for (const fragment of fields.values()) {
    const record = records.get(fragment.evidence_selector) ?? {};
    record[fragment.field] = decodeField(fragment.value_type, fragment.text);
    records.set(fragment.evidence_selector, record);
  }
  return { ...result, records };
}

async function fixture(t, name) {
  const project = await mkdtemp(join(tmpdir(), `workflow-structured-${name}-`));
  t.after(() => rm(project, { recursive: true, force: true }));
  const author = actor(authorServer), reviewer = actor(reviewerServer), specification = `structured-${name}`;
  const directory = join(project, "docs/specs", specification);
  await author.call("specification_open", { project, specification });
  const proposal = await author.call("scope_propose", {
    depth: "standard",
    rationale: ["Synthetic structured correction report."],
    profiles: [{ id: "core", reason: "Review navigation and correction lifecycle." }],
  });
  const answer = await author.call("question_record_answer", {
    question_ref: proposal.question_ref,
    selected_ids: ["confirm"],
    text: "Confirmed synthetic scope.",
    source: "fixture-customer:scope",
  });
  await author.call("scope_confirm", { proposal_ref: proposal.question_ref, answer_ref: answer.decision_ref });
  const requirements = Array.from({ length: 12 }, (_, index) => `### R-${String(index + 1).padStart(3, "0")}: Rule ${index + 1}\nPreserve rule ${index + 1}.\n`).join("\n");
  const source = `# Structured changes fixture\n\nStatus: Draft\n\nBaseline order: publish before validation.\n\n${requirements}`;
  await writeFile(join(directory, "spec.md"), source);
  for (let index = 0; index < 12; index += 1) {
    const requirement = `R-${String(index + 1).padStart(3, "0")}`;
    await author.call("decision_record_instruction", {
      category: "behavior",
      kind: "initial_request",
      text: `Preserve rule ${index + 1}.`,
      source: "fixture-customer:initial",
      requirement_ids: [requirement],
    });
  }
  const review = await author.call("specification_review_start");
  await reviewer.call("specification_open", { project, specification });
  for (let index = 0; index < review.total_items; index += 1) await recordItem(reviewer, review, index, index === review.total_items - 1);
  assert.equal((await reviewer.call("specification_review_complete", { review_ref: review.review_ref })).coverage_status, "gaps");
  await writeFile(join(directory, "spec.md"), source.replace("publish before validation", "validate before publication"));
  await author.call("specification_open", { project, specification });
  return { project, specification, directory, source, author, reviewer, review };
}

test("finding-linked context-only correction has equivalent legacy and structured evidence", async (t) => {
  const f = await fixture(t, "eligible");
  const legacyStart = { ...f.author.stats };
  const legacy = await legacyChanges(f.author, f.review.review_ref);
  const legacyMetrics = { calls: f.author.stats.calls - legacyStart.calls, bytes: f.author.stats.bytes - legacyStart.bytes };
  assert.equal(legacy.body.eligible, true);
  assert.deepEqual(legacy.body.full_review_reasons, []);

  const structuredStart = { ...f.author.stats };
  const navigation = await summary(f.author, f.review.review_ref);
  assert.equal(navigation.eligible, true);
  assert.deepEqual(navigation.full_review_reasons, []);
  assert.equal(navigation.counts.total_entries, navigation.entries.length);
  assert.ok(navigation.entries.length > 20);
  const finding = navigation.entries.find((entry) => entry.kind === "finding");
  const change = navigation.entries.find((entry) => entry.kind === "change" && entry.item_key === "context:specification");
  assert.ok(finding.finding_key.startsWith("finding:"));
  assert.ok(change.before_evidence_selector);
  assert.ok(change.after_evidence_selector);

  const exact = await evidence(f.author, f.review.review_ref, navigation.report_version);
  const structuredMetrics = { calls: f.author.stats.calls - structuredStart.calls, bytes: f.author.stats.bytes - structuredStart.bytes };
  assert.ok(exact.changes_receipt);
  assert.deepEqual(exact.records.get(finding.evidence_selector), legacy.body.findings[0]);
  assert.deepEqual(exact.records.get(change.before_evidence_selector), legacy.body.changes[0].before);
  assert.deepEqual(exact.records.get(change.after_evidence_selector), legacy.body.changes[0].after);

  const followup = await f.author.call("specification_review_followup_start", {
    review_ref: f.review.review_ref,
    changes_receipt: exact.changes_receipt,
    fixes: [{ finding_key: finding.finding_key, changed_item_keys: [change.item_key], explanation: "Correct the contradictory shared baseline." }],
  });
  assert.equal(followup.consistency_required, true);
  assert.ok(followup.required_item_indices.includes(f.review.total_items - 2), "The active profile must be freshly checked.");
  assert.ok(followup.carried_items > 0);
  t.diagnostic(`Legacy report calls=${legacyMetrics.calls}, bytes=${legacyMetrics.bytes}; structured report calls=${structuredMetrics.calls}, bytes=${structuredMetrics.bytes}.`);
});

test("structured change evidence rejects incomplete, foreign, stale and tampered reads without writes", async (t) => {
  const a = await fixture(t, "guards-a"), b = await fixture(t, "guards-b");
  const navigation = await summary(a.author, a.review.review_ref);
  const journalPath = join(a.directory, "decisions.yaml"), before = await readFile(journalPath);
  const first = await a.author.call("specification_review_changes_read", {
    review_ref: a.review.review_ref,
    report_version: navigation.report_version,
  });
  assert.equal(first.changes_receipt, null);
  await a.author.call("specification_review_followup_start", {
    review_ref: a.review.review_ref,
    changes_receipt: "0".repeat(64),
    fixes: [{ finding_key: "context:specification", changed_item_keys: ["context:specification"], explanation: "Incomplete evidence." }],
  }, "INCOMPLETE_READ");
  assert.deepEqual(await readFile(journalPath), before);

  const changed = JSON.parse(Buffer.from(first.next_cursor, "base64url").toString("utf8"));
  changed.field_index += 1;
  await a.author.call("specification_review_changes_read", {
    review_ref: a.review.review_ref,
    report_version: navigation.report_version,
    cursor: Buffer.from(JSON.stringify(changed)).toString("base64url"),
  }, "INVALID_CURSOR");
  await b.author.call("specification_review_changes_read", {
    review_ref: b.review.review_ref,
    report_version: navigation.report_version,
    cursor: first.next_cursor,
  }, "STALE_CURSOR");

  await writeFile(join(a.directory, "spec.md"), a.source.replace("publish before validation", "publish only after validation and recovery"));
  await a.author.call("specification_open", { project: a.project, specification: a.specification });
  await a.author.call("specification_review_changes_read", {
    review_ref: a.review.review_ref,
    report_version: navigation.report_version,
    cursor: first.next_cursor,
  }, "STALE_CURSOR");
  assert.deepEqual(await readFile(journalPath), before);
});
