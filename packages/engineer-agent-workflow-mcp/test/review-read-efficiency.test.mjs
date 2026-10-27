import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath, URL } from "node:url";
import { performance } from "node:perf_hooks";
import test from "node:test";

import { portion } from "../dist/requirements.js";
import { workflowTools, successResult } from "../dist/server.js";
import { boundedSuccessResult } from "../dist/response-budget.js";
import { createSharedStdioHarness } from "../test-support/stdio-harness.mjs";

function actor(tools = workflowTools, wrap = successResult) {
  let context;
  const metrics = { server_ms: 0 };
  return {
    metrics,
    context: () => context,
    async raw(name, input = {}) {
      const started = performance.now();
      const payload = await tools.find((entry) => entry.name === name).run({
        ...(context && name !== "specification_open" ? { context } : {}), ...input,
      });
      metrics.server_ms += performance.now() - started;
      const raw = wrap(payload);
      assert.notEqual(raw.isError, true, JSON.stringify(raw));
      assert.ok(Buffer.byteLength(JSON.stringify(raw.structuredContent)) <= 24 * 1024);
      assert.ok(Buffer.byteLength(JSON.stringify(raw)) <= 64 * 1024);
      context = payload.context ?? context;
      return raw;
    },
    async call(name, input = {}) { return (await this.raw(name, input)).structuredContent.result; },
  };
}

async function fixture(t, client = actor()) {
  const project = await mkdtemp(join(tmpdir(), "review-read-efficiency-"));
  t.after(() => rm(project, { recursive: true, force: true }));
  const specification = "read-efficiency";
  await client.call("specification_open", { project, specification });
  const scope = await client.call("scope_propose", {
    depth: "standard", rationale: ["Simulation-only pagination qualification."],
    profiles: [{ id: "core", reason: "Exact review evidence." }],
  });
  const answer = await client.call("question_record_answer", {
    question_ref: scope.question_ref, selected_ids: ["confirm"],
    text: "Confirmed synthetic scope, preserving all obligations.", source: "fixture-customer:scope",
  });
  await client.call("scope_confirm", { proposal_ref: scope.question_ref, answer_ref: answer.decision_ref });
  const ids = Array.from({ length: 26 }, (_, i) => `READ-${i + 1}`);
  const source = `# Fixture\n\nStatus: Draft\n\nKeep every original obligation.\n\n${ids.map((id) =>
    `### ${id}: Exact evidence\n${'Retain 🧪 漢字 \\"quoted\\" \\ path. '.repeat(70)}\n`).join("\n")}`;
  await writeFile(join(project, "docs/specs", specification, "spec.md"), source);
  const initialText = `Keep every obligation. ${"Original text 🧪 \\ \"quoted\"\n".repeat(250)}`;
  const original = await client.call("decision_record_instruction", {
    category: "behavior", kind: "initial_request", text: initialText,
    source: "fixture-customer:initial", requirement_ids: ids,
  });
  const amendments = ["Change only the label; retain all earlier obligations.", "Add the final condition; retain the earlier correction."];
  let predecessor = original.decision_ref;
  for (const text of amendments) {
    const change = await client.call("decision_record_instruction", {
      category: "behavior", kind: "user_edit", text, source: "fixture-customer:correction",
      requirement_ids: ids, related_decisions: [predecessor],
    });
    predecessor = change.decision_ref;
  }
  const review = await client.call("specification_review_start", { require_consistency: true });
  return { project, specification, client, review, source, initialText, amendments, ids };
}

async function readItem(client, review, index, first) {
  let page = first, cursor, text = "", calls = 0, bytes = 0;
  const started = performance.now();
  const serverStarted = client.metrics.server_ms;
  do {
    const raw = page ? null : await client.raw("specification_review_get", {
      review_ref: review.review_ref, item_index: index, ...(cursor ? { cursor } : {}),
    });
    page ??= raw.structuredContent.result;
    if (raw) bytes += Buffer.byteLength(JSON.stringify(raw));
    assert.equal(page.offset, Array.from(text).length + (first?.offset ?? 0));
    if (!page.complete) {
      assert.equal(page.read_receipt, null);
      assert.ok(page.next_cursor);
      if (Object.hasOwn(page, "consistency_read_receipt")) assert.equal(page.consistency_read_receipt, null);
    }
    text += page.text;
    cursor = page.next_cursor;
    calls++;
    if (cursor) page = null;
  } while (cursor);
  assert.equal(page.complete, true);
  assert.equal(page.next_cursor, null);
  assert.ok(page.read_receipt);
  return { text, page, calls, bytes, server_ms: client.metrics.server_ms - serverStarted, elapsed_ms: performance.now() - started };
}

test("portion size changes preserve issued continuations and exact Unicode text", () => {
  const text = "🧪漢字\\\"\n".repeat(3000);
  const first = portion(text, "size-change");
  assert.equal(Array.from(first.text).length, 1024);
  const larger = portion(text, "size-change", first.next_cursor, 4096);
  assert.equal(Array.from(larger.text).length, 4096);
  const smaller = portion(text, "size-change", larger.next_cursor, 257);
  let body = first.text + larger.text + smaller.text, cursor = smaller.next_cursor;
  while (cursor) {
    const page = portion(text, "size-change", cursor, 4096);
    body += page.text;
    cursor = page.next_cursor;
  }
  assert.equal(body, text);
  assert.deepEqual(portion(text, "size-change", first.next_cursor, 4096), larger);
  assert.throws(() => portion(text, "foreign", first.next_cursor, 4096), { code: "STALE_CURSOR" });
  for (const invalid of [0, -1, 4097, 1.5]) assert.throws(() => portion(text, "size-change", undefined, invalid), { code: "INVALID_INPUT" });
});

test("response budgeting counts UTF-8, nested JSON escaping and both envelope copies", () => {
  for (const text of ["🧪".repeat(4096), "\\\"\n\u0000".repeat(800)]) {
    const raw = boundedSuccessResult({ protocol_version: 2, result: { text, read_receipt: "a".repeat(64) } });
    assert.ok(raw);
    assert.ok(Buffer.byteLength(JSON.stringify(raw.structuredContent)) <= 24 * 1024);
    assert.ok(Buffer.byteLength(JSON.stringify(raw)) <= 64 * 1024);
  }
  assert.equal(boundedSuccessResult({ result: { text: "🧪".repeat(6200) } }), null);
  const escaped = { result: { text: "\\".repeat(11500) } };
  assert.ok(Buffer.byteLength(JSON.stringify(escaped)) < 24 * 1024);
  assert.equal(boundedSuccessResult(escaped), null, "The doubled and escaped wire envelope exceeds 64 KiB.");
});

test("review reads use larger bounded pages without changing evidence or receipts", async (t) => {
  const f = await fixture(t);
  const first = await f.client.call("specification_review_get", { review_ref: f.review.review_ref, item_index: 1 });
  assert.ok(Array.from(first.text).length > 1024);
  assert.ok(Array.from(first.text).length <= 4096);
  const peer = actor();
  await peer.call("specification_open", { project: f.project, specification: f.specification });
  const [a, b] = await Promise.all([readItem(f.client, f.review, 3), readItem(peer, f.review, 3)]);
  assert.equal(a.text, b.text);
  assert.equal(a.page.read_receipt, b.page.read_receipt);
  const body = JSON.parse(a.text);
  assert.equal(body.requirements.length, 26);
  assert.equal(body.source.instruction.text, f.amendments[1]);
  assert.ok(body.related_sources.some((entry) => entry.instruction?.text === f.initialText));
  assert.ok(body.related_sources.some((entry) => entry.instruction?.text === f.amendments[0]));
  assert.equal(body.requirements.map((entry) => entry.text).join(""), f.source.slice(f.source.indexOf("### READ-1")));
  const resumed = await readItem(f.client, f.review, 1, first);
  const repeated = await readItem(f.client, f.review, 1);
  assert.equal(resumed.text, repeated.text);
  assert.equal(resumed.page.read_receipt, repeated.page.read_receipt);
  const verdict = { review_ref: f.review.review_ref, item_index: 3, read_receipt: a.page.read_receipt,
    verdict: "covered", explanation: "Simulation-only independent read evidence.", evidence_requirement_ids: f.ids };
  const staleContext = peer.context();
  const writes = await Promise.allSettled([f.client.call("specification_review_record", verdict), peer.call("specification_review_record", verdict)]);
  assert.equal(writes.filter((entry) => entry.status === "fulfilled").length, 1);
  const rejected = writes.find((entry) => entry.status === "rejected");
  assert.ok(["BUSY", "CONFLICT"].includes(rejected.reason.code));
  await assert.rejects(workflowTools.find((entry) => entry.name === "specification_review_record").run({
    ...verdict, context: staleContext, explanation: "A different stale write must not replace saved evidence.",
  }), { code: "CONFLICT" });
  assert.equal((await f.client.call("specification_review_status", { review_ref: f.review.review_ref })).recorded_items, 1);
  const foreign = actor();
  const other = await fixture(t, foreign);
  await assert.rejects(foreign.call("specification_review_get", {
    review_ref: other.review.review_ref, item_index: 1, cursor: first.next_cursor,
  }), { code: "STALE_CURSOR" });
  await writeFile(join(f.project, "docs/specs", f.specification, "spec.md"), f.source.replace("Keep every", "Preserve every"));
  await assert.rejects(f.client.call("specification_review_get", {
    review_ref: f.review.review_ref, item_index: 1, cursor: first.next_cursor,
  }), { code: "STALE_REVIEW" });
});

test("escaped Unicode final context fits actual stdio envelopes and retains detailed results", async (t) => {
  const f = await fixture(t);
  const index = f.review.total_items - 1;
  const context = await readItem(f.client, f.review, index);
  assert.equal(JSON.parse(context.text).source.text, f.source);
  assert.deepEqual(JSON.parse(context.text).detailed_results, []);
  assert.ok(context.page.consistency_read_receipt);
  const harness = createSharedStdioHarness({
    entrypoint: fileURLToPath(new URL("../dist/main.js", import.meta.url)), name: "bounded-review-reader",
  });
  t.after(() => harness.close());
  let cursor, body = "";
  do {
    const raw = await harness.callTool({ name: "specification_review_get", arguments: {
      context: f.client.context(), review_ref: f.review.review_ref, item_index: index, ...(cursor ? { cursor } : {}),
    } });
    assert.notEqual(raw.isError, true, JSON.stringify(raw));
    assert.ok(Buffer.byteLength(JSON.stringify(raw.structuredContent)) <= 24 * 1024);
    assert.ok(Buffer.byteLength(JSON.stringify(raw)) <= 64 * 1024);
    body += raw.structuredContent.result.text;
    cursor = raw.structuredContent.result.next_cursor;
  } while (cursor);
  assert.equal(body, context.text);
});

test("a retained pre-upgrade run resumes with old cursors and receipts", {
  skip: !process.env.REVIEW_BASELINE_ENTRYPOINT && "Set REVIEW_BASELINE_ENTRYPOINT to the preserved pre-change dist/main.js.",
}, async (t) => {
  const baseline = await import(pathToFileURL(join(process.env.REVIEW_BASELINE_ENTRYPOINT, "../server.js")).href);
  const old = actor(baseline.workflowTools, baseline.successResult);
  const f = await fixture(t, old);
  const saved = await readItem(old, f.review, 2);
  await old.call("specification_review_record", {
    review_ref: f.review.review_ref, item_index: 2, read_receipt: saved.page.read_receipt,
    verdict: "covered", explanation: "Saved before upgrade; simulation only.", evidence_requirement_ids: f.ids,
  });
  const before = await readItem(old, f.review, 1);
  const oldFirst = await old.call("specification_review_get", { review_ref: f.review.review_ref, item_index: 1 });
  assert.equal(Array.from(oldFirst.text).length, 1024);
  const updated = actor();
  await updated.call("specification_open", { project: f.project, specification: f.specification });
  assert.equal((await updated.call("specification_review_start", { require_consistency: true })).review_ref, f.review.review_ref);
  const suffix = await updated.call("specification_review_get", {
    review_ref: f.review.review_ref, item_index: 1, cursor: oldFirst.next_cursor,
  });
  assert.equal(suffix.offset, 1024);
  const after = await readItem(updated, f.review, 1);
  assert.equal(after.text, before.text);
  assert.equal(after.page.read_receipt, before.page.read_receipt);
  assert.ok(after.calls < before.calls);
  assert.ok(after.bytes < before.bytes);
  const reverse = await old.call("specification_review_get", {
    review_ref: f.review.review_ref, item_index: 1, cursor: suffix.next_cursor,
  });
  assert.equal(reverse.offset, suffix.offset + Array.from(suffix.text).length);
  await updated.call("specification_review_record", {
    review_ref: f.review.review_ref, item_index: 1, read_receipt: before.page.read_receipt,
    verdict: "covered", explanation: "Synthetic compatibility evidence; no model comprehension claim.", evidence_requirement_ids: f.ids,
  });
  await assert.rejects(updated.call("specification_review_record", {
    review_ref: f.review.review_ref, item_index: 1, read_receipt: before.page.read_receipt,
    verdict: "covered", explanation: "Must not overwrite.", evidence_requirement_ids: f.ids,
  }), { code: "INVALID_STATE" });
  const retained = await readItem(old, f.review, 1);
  const retainedNew = await readItem(updated, f.review, 1);
  assert.equal(retainedNew.text, retained.text);
  assert.equal((await updated.call("specification_review_status", { review_ref: f.review.review_ref })).recorded_items, 2);
  const oldSaved = await readItem(old, f.review, 2);
  const newSaved = await readItem(updated, f.review, 2);
  assert.equal(newSaved.text, oldSaved.text);
  assert.equal(newSaved.page.recorded_result.verdict, "covered");
  const oldFinal = await readItem(old, f.review, f.review.total_items - 1);
  const newFinal = await readItem(updated, f.review, f.review.total_items - 1);
  assert.equal(newFinal.text, oldFinal.text);
  assert.equal(newFinal.page.consistency_read_receipt, oldFinal.page.consistency_read_receipt);
  assert.equal(JSON.parse(newFinal.text).detailed_results.length, 2);
  const metrics = { scenario: "same-frozen-item", before: { calls: before.calls, bytes: before.bytes, server_ms: before.server_ms, harness_ms: before.elapsed_ms },
    after: { calls: after.calls, bytes: after.bytes, server_ms: after.server_ms, harness_ms: after.elapsed_ms }, exact_body_bytes: Buffer.byteLength(before.text), model_trial: false };
  if (process.env.REVIEW_METRICS_FILE) await writeFile(process.env.REVIEW_METRICS_FILE, JSON.stringify(metrics, null, 2) + "\n");
  t.diagnostic(JSON.stringify(metrics));
});
