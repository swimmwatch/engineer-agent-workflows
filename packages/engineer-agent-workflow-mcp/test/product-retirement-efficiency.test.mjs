import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { channel } from "node:diagnostics_channel";
import * as review from "../dist/product/review.js";
import * as documents from "../dist/product/documents.js";
import { fixture, completeReview, snapshot, expectCode, replaceArtifactDocument, readItemFully, bytes, candidateVersion, context, writeCandidate } from "../test-support/product-review-fixture.mjs";
import { loadGeneration, saveGeneration, saveObject } from "../dist/product/storage.js";
import * as storage from "../dist/product/storage.js";
import { retireRoadmapTask } from "../dist/product/roadmap.js";
import { benchmarkRetirement } from "../../../scripts/benchmark-roadmap-retirement.mjs";

const ref = (f, id) => ({ product_id: f.productId, artifact: "roadmap", element_id: id });
const scope = (f) => ({ kind: "task_retirement", task_ref: ref(f, "TASK-0029"), redistributed_to: [ref(f, "TASK-0001"), ref(f, "TASK-0003")] });

async function ready(t, elements = 30, shared = false) {
  const f = await fixture(t, "roadmap", { elements, ...(shared ? { upstreamElements: { prd: 2 } } : {}) });
  if (shared) {
    const decisionRef = { product_id: f.productId, artifact: "roadmap", id: randomUUID(), revision: 1 };
    const value = { schema_version: 1, kind: "decision", ref: decisionRef, state: "observed", category: "shared-constraint", question: null,
      text: "The unchanged global policy applies to task 29.", source: "Synthetic retained policy", selected_ids: [], predecessors: [],
      affected_refs: [ref(f, "TASK-0029"), f.refs.prd], reconsider_when: null, candidate_id: f.candidateId };
    const saved = await saveObject(f.root, { productId: f.productId, kind: "decision", artifact: "roadmap", decisionId: decisionRef.id, revision: 1, bytes: bytes(value) });
    f.candidate = { ...f.candidate, decision_heads: [{ decision_ref: decisionRef, object_sha256: saved.sha256 }] };
    f.candidate.source_version = candidateVersion(f.candidate); await writeCandidate(f, f.candidate); f.context = context(f, f.candidate);
  }
  const parent = await completeReview(f, f.context);
  const published = await review.activateAmendment({ root: f.root, context: parent.context, candidates: [f.candidateRef], reviewRefs: [parent.reviewRef] });
  const args = { root: f.root, context: published.context, artifact: "roadmap", baseGeneration: JSON.parse(Buffer.from(published.context, "base64url")).target_revision,
    intentText: "Retire TASK-0029 and distribute its checks to existing tasks 1 and 3.", source: "Synthetic explicit owner instruction", changeScope: scope(f) };
  return { f, parent, published, args };
}

test("bounded retirement inherits ready predecessor coverage through a new candidate", async (t) => {
  const { f, parent, args } = await ready(t, 30, true);
  const amendment = await review.prepareAmendment(args);
  assert.deepEqual(amendment.result.review_basis, { candidate_ref: f.candidateRef, review_ref: parent.reviewRef });
  assert.ok(amendment.result.changed_refs.length < 10);
  const events = [], metrics = channel("engineer-agent-workflows.product.source-audit");
  const collect = (event) => events.push(event); metrics.subscribe(collect); t.after(() => metrics.unsubscribe(collect));
  const retired = await retireRoadmapTask({ root: f.root, context: amendment.context, candidateRef: amendment.result.candidate_ref,
    taskRef: scope(f).task_ref, redistributedTo: scope(f).redistributed_to, answerRef: amendment.result.decision_ref, reason: args.intentText });
  metrics.unsubscribe(collect);
  assert.equal(events.filter((event) => event.kind === "roadmap-lineage" && !event.hit).length, 1, "Ready PRD and Technical Design share one fully validated lineage pass.");
  const fullLoads = events.filter((event) => event.kind === "generation-full" && !event.hit);
  assert.equal(new Set(fullLoads.map((event) => `${event.audit_id}:${event.key}`)).size, fullLoads.length);
  const begun = await review.startProductReview({ root: f.root, context: retired.context, candidateRef: amendment.result.candidate_ref,
    mode: "recheck", parentReviewRef: parent.reviewRef, parentCandidateRef: f.candidateRef });
  assert.ok(begun.result.recheck.inherited_items >= 20);
  assert.ok(begun.result.recheck.pending_items > 0);
  assert.ok(begun.result.recheck.pending_items < begun.result.total_items);
  const pending = await review.readProductReviewBatch({ root: f.root, context: begun.context, reviewRef: begun.result.review_ref,
    startIndex: begun.result.next_item_index, pendingOnly: true });
  assert.ok(pending.result.items.every((entry) => entry.portion.recorded_result === null));
  assert.ok(pending.result.items.some((entry) => entry.portion.item_key.startsWith("document:")), "Unchanged summaries need fresh review after task-count/ownership changes.");
  assert.ok(!pending.result.items.some((entry) => entry.portion.item_key === "element:prd:PRD-0002"), "An unchanged shared upstream pin does not make every independent policy a changed participant.");
});

test("bounded amendment does not enumerate every task as instruction impact", async (t) => {
  const { f, args } = await ready(t, 101);
  const amended = await review.prepareAmendment(args);
  assert.ok(amended.result.changed_refs.length < 10);
  const before = await snapshot(f.root);
  await assert.rejects(review.prepareAmendment({ ...args, changeScope: { ...scope(f), redistributed_to: [scope(f).task_ref] } }), expectCode("INVALID_INPUT"));
  assert.deepEqual(await snapshot(f.root), before);
});

test("native retirement cannot silently change the bounded instruction recipients", async (t) => {
  const { f, args } = await ready(t);
  const amendment = await review.prepareAmendment(args), before = await snapshot(f.root);
  await assert.rejects(retireRoadmapTask({ root: f.root, context: amendment.context, candidateRef: amendment.result.candidate_ref,
    taskRef: scope(f).task_ref, redistributedTo: [ref(f, "TASK-0001")], answerRef: amendment.result.decision_ref, reason: args.intentText }), expectCode("INVALID_INPUT"));
  assert.deepEqual(await snapshot(f.root), before);
});

test("activation status inspects a lost response without writes and exact replay keeps one generation", async (t) => {
  const { f, parent, published } = await ready(t);
  const args = { root: f.root, context: parent.context, candidates: [f.candidateRef], reviewRefs: [parent.reviewRef] };
  const before = await snapshot(f.root);
  const status = await review.inspectAmendmentActivation(args);
  assert.equal(status.result.state, "applied");
  assert.equal(status.result.published_generation, JSON.parse(Buffer.from(published.context, "base64url")).target_revision);
  assert.equal(status.result.current_generation, status.result.published_generation);
  assert.deepEqual(await snapshot(f.root), before);
  assert.equal((await review.activateAmendment(args)).operationRef, published.operationRef);
  assert.deepEqual(await snapshot(f.root), before);
  const generation = await loadGeneration(f.root, f.productId, status.result.published_generation);
  const advanced = await saveGeneration(f.root, { ...generation.generation, parent: status.result.published_generation });
  await writeFile(join(f.root, "products", f.productId, "head.yaml"), bytes({ schema_version: 1, kind: "head", product_id: f.productId,
    generation: advanced.sha256, operation_id: randomUUID() }));
  const later = await snapshot(f.root), historical = await review.inspectAmendmentActivation(args);
  assert.equal(historical.result.published_generation, status.result.published_generation);
  assert.equal(historical.result.current_generation, advanced.sha256);
  assert.deepEqual(await snapshot(f.root), later);
});

test("GFM retirement preflight rejects detached task table rows and preserves valid tables and code", () => {
  const valid = "# Tasks\n\n| Task | Outcome |\n| --- | --- |\n| TASK-0001 | First |\n| TASK-0030 | Plugin |\n";
  assert.doesNotThrow(() => documents.validateProductTables(valid, new Set(["TASK-0001", "TASK-0030"])));
  assert.throws(() => documents.validateProductTables(valid.replace("\n| TASK-0030", "\n\n| TASK-0030"), new Set(["TASK-0001", "TASK-0030"])), expectCode("INVALID_MARKDOWN"));
  assert.throws(() => documents.validateProductTables(valid, new Set(["TASK-0001"])), expectCode("BROKEN_REFERENCE"));
  assert.doesNotThrow(() => documents.validateProductTables("```md\n| TASK-0030 | Historical example |\n```", new Set()));
});

test("table validation preserves literal inline examples without hiding detached formatted task rows", () => {
  for (const example of ["`| TASK-0030 | Historical example |`", "**`| TASK-0030 | Historical example |`**"]) {
    assert.doesNotThrow(() => documents.validateProductTables(`# Reference\n\n${example} is a literal example.\n`, new Set()));
  }
  assert.throws(() => documents.validateProductTables("| `TASK-0030` | Detached row |\n", new Set()), expectCode("INVALID_MARKDOWN"));
  const table = "| Task | Outcome |\n| --- | --- |\n| `TASK-0030` | Current task |\n";
  assert.doesNotThrow(() => documents.validateProductTables(table, new Set(["TASK-0030"])));
  assert.throws(() => documents.validateProductTables(table, new Set()), expectCode("BROKEN_REFERENCE"));
});

test("one source audit reuses identical immutable bytes and the next audit detects corruption", async (t) => {
  const f = await fixture(t, "idea");
  const saved = await saveObject(f.root, { productId: f.productId, kind: "markdown", bytes: Buffer.from("# Isolated immutable source\n") });
  let reads = 0; const metrics = channel("engineer-agent-workflows.product.source-validation");
  const collect = () => { reads++; }; metrics.subscribe(collect); t.after(() => metrics.unsubscribe(collect));
  await storage.withProductObjectReads(async () => {
    const [first, second] = await Promise.all([storage.readObject(f.root, saved), storage.readObject(f.root, saved)]);
    assert.deepEqual(first, second);
  });
  assert.equal(reads, 1);
  await writeFile(join(f.root, saved.relativePath), "corrupted source");
  await assert.rejects(storage.withProductObjectReads(() => storage.readObject(f.root, saved)), expectCode("SOURCE_CHANGED"));
});

test("finding-linked prose correction retains unrelated judgments and requires fresh consistency", async (t) => {
  const f = await fixture(t, "roadmap", { elements: 6 });
  const begun = await review.startProductReview({ root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "full" });
  let current = begun.context, proseKey;
  for (let index = 0; index < begun.result.total_items; index++) {
    const portion = await readItemFully(f, begun.result.review_ref, index, current);
    const gap = portion.item_key.startsWith("document:"); if (gap) proseKey = portion.item_key;
    const saved = await review.recordProductVerdict({ root: f.root, context: current, reviewRef: begun.result.review_ref, value: {
      item_key: portion.item_key, read_receipt: portion.read_receipt, verdict: gap ? "gap" : "covered", counterexample: gap ? "Stale shared task count in prose." : null,
      explanation: "Synthetic source judgment.", evidence_refs: [], evidence_sources: [], inherited_from: null } }); current = saved.context;
  }
  let page = await review.readProductReviewConsistency({ root: f.root, context: current, reviewRef: begun.result.review_ref });
  while (!page.result.complete) page = await review.readProductReviewConsistency({ root: f.root, context: current, reviewRef: begun.result.review_ref, cursor: page.result.next_cursor });
  current = (await review.recordProductReviewConsistency({ root: f.root, context: current, reviewRef: begun.result.review_ref,
    readReceipt: page.result.read_receipt, verdict: "gap", explanation: "Stale count contradicts current task ownership.", counterexample: "Two shared tasks still claimed." })).context;
  await review.completeProductReview({ root: f.root, context: current, reviewRef: begun.result.review_ref });
  await replaceArtifactDocument(f, "roadmap", f.documentBytes.get("roadmap").toString().replace("Introductory prose", "Corrected retirement prose"));
  const fixes = [proseKey, "__consistency__"].map((finding_key) => ({ finding_key, changed_refs: [], changed_item_keys: [proseKey], explanation: "Correct the shared task summary only." }));
  const beforeIncomplete = await snapshot(f.root);
  await assert.rejects(review.startProductReview({ root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "followup", parentReviewRef: begun.result.review_ref,
    fixes: fixes.map((fix) => ({ ...fix, changed_item_keys: [] })) }), (error) => {
    assert.equal(error.code, "PREREQUISITE_REQUIRED");
    assert.doesNotMatch(error.message, /full independent review/i);
    assert.equal(error.details.details.next_action, "complete_correction_mapping");
    assert.deepEqual(error.details.details.issues.map((issue) => issue.missing_item_key), [proseKey]);
    return true;
  });
  assert.deepEqual(await snapshot(f.root), beforeIncomplete);
  const followup = await review.startProductReview({ root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "followup", parentReviewRef: begun.result.review_ref, fixes });
  assert.equal(followup.result.recorded_items, followup.result.total_items - 1);
  await assert.rejects(review.completeProductReview({ root: f.root, context: f.context, reviewRef: followup.result.review_ref }), expectCode("PREREQUISITE_REQUIRED"));
  const corrected = await readItemFully(f, followup.result.review_ref, followup.result.next_item_index, f.context);
  current = (await review.recordProductVerdict({ root: f.root, context: f.context, reviewRef: followup.result.review_ref, value: {
    item_key: corrected.item_key, read_receipt: corrected.read_receipt, verdict: "covered", counterexample: null,
    explanation: "The corrected summary matches the retained task ownership.", evidence_refs: [], evidence_sources: [], inherited_from: null } })).context;
  page = await review.readProductReviewConsistency({ root: f.root, context: current, reviewRef: followup.result.review_ref, representation: "compact-v1" });
  while (!page.result.complete) page = await review.readProductReviewConsistency({ root: f.root, context: current, reviewRef: followup.result.review_ref, representation: "compact-v1", cursor: page.result.next_cursor });
  current = (await review.recordProductReviewConsistency({ root: f.root, context: current, reviewRef: followup.result.review_ref, readReceipt: page.result.read_receipt,
    verdict: "covered", counterexample: null, explanation: "Synthetic fresh whole-artifact consistency." })).context;
  assert.equal((await review.completeProductReview({ root: f.root, context: current, reviewRef: followup.result.review_ref })).result.coverage_status, "reviewed");
  assert.equal((await review.checkProductCandidate({ root: f.root, context: current, candidateRef: f.candidateRef })).result.status, "pass");
});

test("public stdio retirement reads pending blocks only, completes and replays activation after restart", { timeout: 120000 }, async () => {
  const result = await benchmarkRetirement({ mode: "recheck", transport: "stdio", elements: 30, findings: true, profile: true });
  assert.ok(result.inherited >= 20);
  assert.equal(result.delivered + result.inherited, result.blocks);
  assert.ok(result.source_atoms_delivered < result.atoms);
  assert.equal(result.correction.delivered, 1);
  assert.equal(result.correction.delivered + result.correction.inherited, result.correction.blocks);
  assert.equal(result.server_profile.responses, result.calls);
  assert.ok(result.server_profile.reads > 0);
  assert.ok(result.timings.some((entry) => entry.name === "product_amendment_activation_status"));
  assert.equal(result.timings.filter((entry) => entry.name === "product_amendment_activate").length, 2);
});
