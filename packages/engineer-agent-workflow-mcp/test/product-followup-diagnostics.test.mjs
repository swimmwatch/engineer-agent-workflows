import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath, URL } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import * as review from "../dist/product/review.js";
import { retireRoadmapTask } from "../dist/product/roadmap.js";
import { readObject, saveObject } from "../dist/product/storage.js";
import { bytes, candidateVersion, completeReview, context, expectCode, fixture, replaceArtifactDocument, snapshot, writeCandidate } from "../test-support/product-review-fixture.mjs";

const ref = (f, id) => ({ product_id: f.productId, artifact: "roadmap", element_id: id });

test("followup diagnostics identify missing recipient and retired provenance refs through public MCP", async (t) => {
  const f = await fixture(t, "roadmap", { elements: 30 });
  const initial = await completeReview(f, f.context);
  const published = await review.activateAmendment({ root: f.root, context: initial.context, candidates: [f.candidateRef], reviewRefs: [initial.reviewRef] });
  const prepared = await review.prepareAmendment({ root: f.root, context: published.context, artifact: "roadmap",
    baseGeneration: JSON.parse(Buffer.from(published.context, "base64url")).target_revision,
    intentText: "Retire TASK-0029 and retain its checks in TASK-0001 and TASK-0003.", source: "Synthetic explicit qualification instruction",
    changeScope: { kind: "task_retirement", task_ref: ref(f, "TASK-0029"), redistributed_to: [ref(f, "TASK-0001"), ref(f, "TASK-0003")] } });
  const retired = await retireRoadmapTask({
    root: f.root, context: prepared.context, candidateRef: prepared.result.candidate_ref, taskRef: ref(f, "TASK-0029"),
    redistributedTo: [ref(f, "TASK-0001"), ref(f, "TASK-0003")], answerRef: prepared.result.decision_ref, reason: "Keep both release-check owners." });
  f.candidateRef = prepared.result.candidate_ref;
  f.candidate = JSON.parse(await readFile(join(f.root, "products", f.productId, "drafts", f.candidateRef.candidate_id, "candidate.yaml"), "utf8"));
  f.registry = JSON.parse(await readObject(f.root, { productId: f.productId, kind: "record", sha256: f.candidate.registry.object_sha256 }));
  const document = f.registry.documents.find((entry) => entry.artifact === "roadmap");
  f.documentBytes.set("roadmap", Buffer.from(await readObject(f.root, { productId: f.productId, kind: "markdown", sha256: document.object_sha256 })));
  f.context = retired.context;
  const parent = await completeReview(f, f.context, { gapText: "### TASK-0001:" });
  await replaceArtifactDocument(f, "roadmap", f.documentBytes.get("roadmap").toString().replace(
    "Current roadmap behavior is explicit.", "Corrected release checks preserve private-source-marker content."));
  const input = { context: f.context, candidate_ref: f.candidateRef, mode: "followup", parent_review_ref: parent.reviewRef,
    fixes: [{ finding_key: parent.gapKey, changed_refs: [ref(f, "TASK-0001")], explanation: "Retain the complete release checks." }] };
  const before = await snapshot(f.root);
  const client = new Client({ name: "followup-diagnostics-test", version: "1" });
  t.after(() => client.close());
  await client.connect(new StdioClientTransport({ command: process.execPath,
    args: [fileURLToPath(new URL("../dist/main.js", import.meta.url))], env: { ...process.env, EAW_PRODUCT_DATA_DIR: f.root }, stderr: "pipe" }));
  const response = await client.callTool({ name: "product_review_start", arguments: input });
  assert.equal(response.isError, true);
  const error = response.structuredContent.error;
  assert.equal(error.code, "PREREQUISITE_REQUIRED");
  assert.doesNotMatch(error.message, /full independent review/i);
  assert.equal(error.details.next_action, "complete_correction_mapping");
  assert.equal(error.details.truncated, false);
  const missing = error.details.issues.map((issue) => issue.missing_ref);
  assert.deepEqual(missing, [ref(f, "TASK-0003"), ref(f, "TASK-0029")]);
  assert.ok(error.details.issues.every((issue) => issue.review_ref === parent.reviewRef && issue.mode === "followup"));
  assert.ok(Buffer.byteLength(JSON.stringify(error.details)) <= 8192);
  assert.doesNotMatch(JSON.stringify(error), /private-source-marker|\/tmp\/|stack/);
  assert.deepEqual(await snapshot(f.root), before);
  input.fixes[0].changed_refs.push(...missing);
  const retried = await client.callTool({ name: "product_review_start", arguments: input });
  assert.notEqual(retried.isError, true, JSON.stringify(retried));
  assert.equal(retried.structuredContent.result.coverage_status, "pending");
  await assert.rejects(review.completeProductReview({ root: f.root, context: retried.structuredContent.context,
    reviewRef: retried.structuredContent.result.review_ref }), expectCode("PREREQUISITE_REQUIRED"));
});

test("followup diagnostics bound and deduplicate missing references without source text", async (t) => {
  const f = await fixture(t, "roadmap", { elements: 30 });
  const decisionRef = { product_id: f.productId, artifact: "roadmap", id: randomUUID(), revision: 1 };
  const saved = await saveObject(f.root, { productId: f.productId, kind: "decision", artifact: "roadmap", decisionId: decisionRef.id, revision: 1,
    bytes: bytes({ schema_version: 1, kind: "decision", ref: decisionRef, state: "observed", category: "shared-constraint", question: null,
      text: "private-source-marker shared policy", source: "Synthetic diagnostics fixture", selected_ids: [], predecessors: [],
      affected_refs: Array.from({ length: 30 }, (_, index) => ref(f, `TASK-${String(index + 1).padStart(4, "0")}`)), reconsider_when: null, candidate_id: f.candidateId }) });
  f.candidate = { ...f.candidate, decision_heads: [{ decision_ref: decisionRef, object_sha256: saved.sha256 }] };
  f.candidate.source_version = candidateVersion(f.candidate); await writeCandidate(f, f.candidate); f.context = context(f, f.candidate);
  const parent = await completeReview(f, f.context, { gapText: "### TASK-0001:" });
  await replaceArtifactDocument(f, "roadmap", f.documentBytes.get("roadmap").toString().replace("Current roadmap behavior is explicit.", "Corrected roadmap behavior."));
  const before = await snapshot(f.root);
  await assert.rejects(review.startProductReview({ root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "followup",
    parentReviewRef: parent.reviewRef, fixes: [{ finding_key: parent.gapKey, changed_refs: [ref(f, "TASK-0001")], explanation: "Complete the policy owner." }] }), (error) => {
    assert.equal(error.code, "PREREQUISITE_REQUIRED");
    assert.equal(error.details.details.next_action, "complete_correction_mapping");
    assert.equal(error.details.details.truncated, true);
    const refs = error.details.details.issues.map((issue) => issue.missing_ref);
    assert.ok(refs.length > 0 && refs.length <= 20);
    assert.equal(new Set(refs.map((value) => value.element_id)).size, refs.length);
    assert.ok(refs.every((value) => value.element_id !== "TASK-0001"));
    assert.ok(Buffer.byteLength(JSON.stringify(error.details.details)) <= 8192);
    assert.doesNotMatch(JSON.stringify(error.details), /private-source-marker|\/tmp\//);
    return true;
  });
  assert.deepEqual(await snapshot(f.root), before);
});

test("followup still requires full review for unmappable scope changes", async (t) => {
  const f = await fixture(t, "prd");
  const parent = await completeReview(f, f.context, { gapText: "Current prd behavior" });
  f.candidate = { ...f.candidate, scope: { ...f.candidate.scope, rationale: ["Changed scope outside the finding."] } };
  f.candidate.source_version = candidateVersion(f.candidate); await writeCandidate(f, f.candidate); f.context = context(f, f.candidate);
  const before = await snapshot(f.root);
  await assert.rejects(review.startProductReview({ root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "followup", parentReviewRef: parent.reviewRef,
    fixes: [{ finding_key: parent.gapKey, changed_refs: [f.refs.prd], explanation: "The scope changed too." }] }), (error) => {
    assert.equal(error.code, "PREREQUISITE_REQUIRED");
    assert.match(error.message, /full independent review/i);
    assert.notEqual(error.details.details?.next_action, "complete_correction_mapping");
    return true;
  });
  assert.deepEqual(await snapshot(f.root), before);
});

test("followup cannot map prose without a recorded consistency finding", async (t) => {
  const f = await fixture(t, "prd");
  const parent = await completeReview(f, f.context, { gapText: "Introductory prose" });
  await replaceArtifactDocument(f, "prd", f.documentBytes.get("prd").toString().replace("Introductory prose", "Corrected prose"));
  const args = { root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "followup", parentReviewRef: parent.reviewRef,
    fixes: [{ finding_key: parent.gapKey, changed_refs: [], explanation: "The prose changed without a consistency finding." }] };
  const before = await snapshot(f.root);
  await assert.rejects(review.startProductReview(args), (error) => {
    assert.equal(error.code, "PREREQUISITE_REQUIRED");
    assert.match(error.message, /full independent review/i);
    assert.notEqual(error.details.details?.next_action, "complete_correction_mapping");
    return true;
  });
  await assert.rejects(review.startProductReview({ ...args,
    fixes: [{ ...args.fixes[0], changed_item_keys: [parent.gapKey] }] }), expectCode("INVALID_INPUT"));
  assert.deepEqual(await snapshot(f.root), before);
});
