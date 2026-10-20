import assert from "node:assert/strict";
import test from "node:test";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { fileURLToPath, URL } from "node:url";
import * as review from "../dist/product/review.js";
import { saveObject, saveGeneration, readGenerationMetadata } from "../dist/product/storage.js";
import { fixture, completeReview, replaceArtifactDocument, context, bytes, candidateVersion, writeCandidate,
  recordItem, recordConsistency, expectCode, snapshot, readItemFully } from "../test-support/product-review-fixture.mjs";

const reviewPath = (f, id) => join(f.root, "products", f.productId, "drafts", f.candidateId, "reviews", `${id}.yaml`);
const objectPath = (f, hash) => join(f.root, "products", f.productId, "objects", `${hash}.yaml`);
async function saved(f, id) {
  const record = JSON.parse(await readFile(reviewPath(f, id), "utf8"));
  const inventory = JSON.parse(await readFile(objectPath(f, record.inventory_sha256), "utf8"));
  const verdicts = await Promise.all(record.verdict_index.map(async (entry) => JSON.parse(await readFile(objectPath(f, entry.object_sha256), "utf8"))));
  return { record, inventory, verdicts };
}
async function amendCandidate(f, changes) {
  const value = { ...f.candidate, ...changes }; delete value.source_version;
  f.candidate = { ...value, source_version: candidateVersion(value) }; await writeCandidate(f, f.candidate);
  f.context = context(f, f.candidate);
}
async function amendRegistry(f, registry) {
  const object = await saveObject(f.root, { productId: f.productId, kind: "record", bytes: bytes(registry) });
  f.registry = registry; await amendCandidate(f, { registry: { id: f.registryId, object_sha256: object.sha256 } });
}
async function start(f, parent) {
  return review.startProductReview({ root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "recheck", parentReviewRef: parent });
}
async function finish(f, begun) {
  let state = begun.result;
  while (state.next_item_index !== null) {
    const recorded = await recordItem(f, state.review_ref, state.next_item_index, f.context);
    f.context = recorded.context;
    state = (await review.getProductReviewStatus({ root: f.root, context: f.context, reviewRef: state.review_ref })).result;
  }
  const consistent = await recordConsistency(f, state.review_ref, f.context); f.context = consistent.context;
  return review.completeProductReview({ root: f.root, context: f.context, reviewRef: state.review_ref });
}

test("119-block recheck persists 118 exact parent attributions, one fresh verdict and a fresh consistency", { timeout: 60000 }, async (t) => {
  const f = await fixture(t, "idea", { elements: 117 });
  await replaceArtifactDocument(f, "idea", f.documentBytes.get("idea").toString().replace("Current idea behavior", "```mermaid\nflowchart LR\nA-->B\n```\n\nCurrent idea behavior"));
  const parent = await completeReview(f, f.context); f.context = parent.context;
  assert.equal(parent.status.total_items, 119);
  const before = await saved(f, parent.reviewRef);
  const parentBytes = await readFile(reviewPath(f, parent.reviewRef));
  await replaceArtifactDocument(f, "idea", f.documentBytes.get("idea").toString().replace("A-->B", "A-->>B"));
  const begun = await start(f, parent.reviewRef); f.context = begun.context;
  assert.equal(begun.result.recorded_items, 118, "only one localized source block needs fresh judgment");
  assert.equal(begun.result.recheck.pending_items, 1);
  assert.equal(begun.result.recheck.inherited_items, 118);
  const staged = await saved(f, begun.result.review_ref);
  assert.equal(staged.verdicts.length, 118);
  const oldByKey = new Map(before.verdicts.map((v) => [v.item_key, v]));
  for (const v of staged.verdicts) assert.deepEqual(v, { ...oldByKey.get(v.item_key), inherited_from: parent.reviewRef });
  assert.notEqual(staged.inventory.items.find((a) => a.item_key === "element:idea:IDEA-0001").sources[0].sha256, before.inventory.items.find((a) => a.item_key === "element:idea:IDEA-0001").sources[0].sha256);
  const recorded = await recordItem(f, begun.result.review_ref, begun.result.next_item_index, f.context); f.context = recorded.context;
  await assert.rejects(review.completeProductReview({ root: f.root, context: f.context, reviewRef: begun.result.review_ref }), expectCode("PREREQUISITE_REQUIRED"));
  const consistent = await recordConsistency(f, begun.result.review_ref, f.context); f.context = consistent.context;
  const final = await review.completeProductReview({ root: f.root, context: f.context, reviewRef: begun.result.review_ref });
  assert.equal(final.result.coverage_status, "reviewed");
  const finalSaved = await saved(f, begun.result.review_ref);
  assert.equal(finalSaved.verdicts.filter((v) => v.item_key !== "__consistency__" && v.inherited_from === null).length, 1);
  assert.equal(finalSaved.verdicts.filter((v) => v.inherited_from === parent.reviewRef).length, 118);
  assert.equal(finalSaved.verdicts.find((v) => v.item_key === "__consistency__").inherited_from, null);
  assert.notEqual(finalSaved.verdicts.find((v) => v.item_key === "__consistency__").read_receipt, before.verdicts.find((v) => v.item_key === "__consistency__").read_receipt);
  assert.deepEqual(await readFile(reviewPath(f, parent.reviewRef)), parentBytes);
  const snap = await snapshot(f.root); assert.equal((await start(f, parent.reviewRef)).replayed, true); assert.deepEqual(await snapshot(f.root), snap);
});

test("server derives shared relation impact and independent expansion is exact retry safe", async (t) => {
  const f = await fixture(t, "idea", { elements: 3 });
  const second = { ...f.refs.idea, element_id: "IDEA-0002" };
  await amendCandidate(f, { relations: [{ from: f.refs.idea, kind: "affects", to: second }] });
  const parent = await completeReview(f, f.context);
  await amendCandidate(f, { relations: [{ from: f.refs.idea, kind: "depends_on", to: second }] });
  const begun = await start(f, parent.reviewRef); f.context = begun.context;
  assert.equal(begun.result.recheck.pending_items, 2, "both participants consume changed shared relationship evidence");
  assert.equal(typeof review.expandProductReviewScope, "function");
  const args = { root: f.root, context: f.context, reviewRef: begun.result.review_ref, itemKeys: ["element:idea:IDEA-0003"], reason: "The independent reviewer needs related component evidence." };
  const expanded = await review.expandProductReviewScope(args); f.context = expanded.context;
  assert.equal(expanded.result.recheck.pending_items, 3);
  const snap = await snapshot(f.root); assert.equal((await review.expandProductReviewScope(args)).replayed, true); assert.deepEqual(await snapshot(f.root), snap);
  await assert.rejects(review.expandProductReviewScope({ ...args, context: f.context, itemKeys: ["element:idea:FOREIGN-0001"] }), expectCode("NOT_FOUND"));
  assert.equal((await finish(f, { ...begun, result: expanded.result })).result.coverage_status, "reviewed");
});

test("scope, original instructions and insufficient historical inputs require a fresh full review without writes", async (t) => {
  const f = await fixture(t, "idea"); const parent = await completeReview(f, f.context);
  await amendCandidate(f, { scope: { ...f.candidate.scope, rationale: ["New scope answer."] } });
  const before = await snapshot(f.root);
  await assert.rejects(start(f, parent.reviewRef), (error) => { assert.equal(error.code, "PREREQUISITE_REQUIRED"); assert.match(error.message, /full/i); return true; });
  assert.deepEqual(await snapshot(f.root), before);
  assert.equal((await review.startProductReview({ root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "full" })).result.recorded_items, 0);
  const legacyFixture = await fixture(t, "idea"); const old = await completeReview(legacyFixture, legacyFixture.context);
  const prior = await saved(legacyFixture, old.reviewRef); delete prior.inventory.recheck_basis;
  const stored = await saveObject(legacyFixture.root, { productId: legacyFixture.productId, kind: "record", bytes: bytes(prior.inventory) });
  await writeFile(reviewPath(legacyFixture, old.reviewRef), bytes({ ...prior.record, inventory_sha256: stored.sha256 }));
  await replaceArtifactDocument(legacyFixture, "idea", legacyFixture.documentBytes.get("idea").toString().replace("Current idea", "Changed idea"));
  const legacySnap = await snapshot(legacyFixture.root);
  await assert.rejects(start(legacyFixture, old.reviewRef), (error) => { assert.equal(error.code, "PREREQUISITE_REQUIRED"); assert.match(error.message, /full/i); return true; });
  assert.deepEqual(await snapshot(legacyFixture.root), legacySnap);
});

test("moves and metadata changes cannot retain unchanged-text verdicts as applicable current coverage", async (t) => {
  const f = await fixture(t, "idea", { elements: 2 }); const parent = await completeReview(f, f.context);
  await amendRegistry(f, { ...f.registry, documents: f.registry.documents.map((d) => d.artifact === "idea" ? { ...d, relative_path: "idea/moved.md", subject: "Moved subject" } : d), element_metadata: f.registry.element_metadata.map((m) => m.ref.artifact === "idea" ? { ...m, applicability: { ...m.applicability, reason: "Changed applicability" } } : m) });
  const begun = await start(f, parent.reviewRef);
  const state = await saved(f, begun.result.review_ref);
  assert.ok(!state.verdicts.some((v) => v.item_key.startsWith("element:idea:")), "moved source identity or changed applicability requires judgment even with identical text");
  assert.equal((await finish(f, begun)).result.coverage_status, "reviewed");
});

test("missing history, stale parent receipt and concurrent current drift never complete recheck", async (t) => {
  const f = await fixture(t, "idea", { elements: 2 }); const parent = await completeReview(f, f.context);
  const prior = await saved(f, parent.reviewRef);
  await replaceArtifactDocument(f, "idea", f.documentBytes.get("idea").toString().replace("Current idea", "Changed idea"));
  const begun = await start(f, parent.reviewRef); f.context = begun.context;
  const entry = await readItemFully(f, begun.result.review_ref, begun.result.next_item_index, f.context);
  const parentVerdict = prior.verdicts.find((v) => v.item_key === entry.item_key);
  await assert.rejects(review.recordProductVerdict({ root: f.root, context: f.context, reviewRef: begun.result.review_ref, value: { ...parentVerdict, inherited_from: null } }), expectCode("INVALID_INPUT"));
  await replaceArtifactDocument(f, "idea", f.documentBytes.get("idea").toString().replace("Changed idea", "Concurrent idea"));
  await assert.rejects(review.completeProductReview({ root: f.root, context: f.context, reviewRef: begun.result.review_ref }), expectCode("CONFLICT"));
  await unlink(objectPath(f, prior.record.verdict_index[0].object_sha256));
  await assert.rejects(start(f, parent.reviewRef));
});

test("public stdio advertises recheck and scope expansion, validates selectors and bounded exact evidence", { timeout: 30000 }, async (t) => {
  const f = await fixture(t, "idea", { elements: 2 }); const parent = await completeReview(f, f.context);
  await replaceArtifactDocument(f, "idea", f.documentBytes.get("idea").toString().replace("Current idea", "Changed idea"));
  const client = new Client({ name: "recheck-contract", version: "1" });
  t.after(() => client.close()); await client.connect(new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL("../dist/main.js", import.meta.url))], env: { ...process.env, EAW_PRODUCT_DATA_DIR: f.root }, stderr: "pipe" }));
  const definitions = (await client.listTools()).tools;
  assert.ok(definitions.find((d) => d.name === "product_review_start").inputSchema.properties.mode.enum.includes("recheck"));
  assert.ok(definitions.some((d) => d.name === "product_review_scope_expand"));
  const cap = await client.callTool({ name: "product_capabilities", arguments: { representation: "explicit-v1" } });
  assert.ok(cap.structuredContent.result.review_modes.includes("recheck"));
  const begun = await client.callTool({ name: "product_review_start", arguments: { context: f.context, candidate_ref: f.candidateRef, mode: "recheck", parent_review_ref: parent.reviewRef } });
  assert.notEqual(begun.isError, true, JSON.stringify(begun));
  const args = { context: begun.structuredContent.context, review_ref: begun.structuredContent.result.review_ref, item_keys: ["scope"], reason: "Independent scope inspection." };
  const expanded = await client.callTool({ name: "product_review_scope_expand", arguments: args });
  assert.notEqual(expanded.isError, true, JSON.stringify(expanded));
  assert.equal(expanded.structuredContent.result.recheck.pending_items, 2);
  const invalid = await client.callTool({ name: "product_review_start", arguments: { context: f.context, candidate_ref: f.candidateRef, mode: "recheck", parent_review_ref: parent.reviewRef, fixes: [] } });
  assert.equal(invalid.isError, true);
  assert.ok(Buffer.byteLength(JSON.stringify(expanded.structuredContent)) <= 24 * 1024);
  async function call(name, args) {
    const reply = await client.callTool({ name, arguments: args });
    assert.notEqual(reply.isError, true, `${name}: ${JSON.stringify(reply)}`);
    assert.ok(Buffer.byteLength(JSON.stringify(reply.structuredContent)) <= 24 * 1024);
    assert.ok(Buffer.byteLength(JSON.stringify(reply)) <= 64 * 1024, "actual text plus structured tool response stays within the wire budget");
    return reply.structuredContent;
  }
  let current = expanded.structuredContent.context, status = expanded.structuredContent.result;
  while (status.next_item_index !== null) {
    const input = { context: current, review_ref: status.review_ref, item_index: status.next_item_index, representation: "explicit-v1" };
    let portion = await call("product_review_get", input);
    while (portion.result.next_cursor) portion = await call("product_review_get", { ...input, cursor: portion.result.next_cursor });
    const recorded = await call("product_review_record", { context: current, review_ref: status.review_ref, value: {
      item_key: portion.result.item_key, verdict: "covered", explanation: "Synthetic independent current evidence.", counterexample: null,
      evidence_refs: [], evidence_sources: [], read_receipt: portion.result.read_receipt, inherited_from: null } }); current = recorded.context;
    status = (await call("product_review_status", { context: current, review_ref: status.review_ref })).result;
  }
  const consistencyInput = { context: current, review_ref: status.review_ref, representation: "explicit-v1" };
  let portion = await call("product_review_consistency_get", consistencyInput), text = portion.result.text;
  while (portion.result.next_cursor) { portion = await call("product_review_consistency_get", { ...consistencyInput, cursor: portion.result.next_cursor }); text += portion.result.text; }
  const consistency = JSON.parse(text);
  assert.equal(consistency.impact.parent_review_ref, parent.reviewRef);
  assert.ok(consistency.impact.changes.some((entry) => entry.atom_key === "element:idea:IDEA-0001"));
  assert.ok(consistency.results.every((result) => result.object_sha256 === result.verdict_object_sha256));
  current = (await call("product_review_consistency_record", { context: current, review_ref: status.review_ref, read_receipt: portion.result.read_receipt, verdict: "covered", explanation: "Synthetic whole-artifact consistency.", counterexample: null })).context;
  const completed = await call("product_review_complete", { context: current, review_ref: status.review_ref });
  assert.equal(completed.result.coverage_status, "reviewed");
  const stable = await snapshot(f.root);
  assert.equal((await call("product_review_status", { context: completed.context, review_ref: status.review_ref })).result.coverage_status, "reviewed");
  assert.equal((await call("product_candidate_check", { context: completed.context, candidate_ref: f.candidateRef })).result.status, "pass");
  assert.deepEqual(await snapshot(f.root), stable, "public current coverage read-back has no migration effects");
});

test("added and removed atoms are reconciled exactly once and removed coverage is never retained", async (t) => {
  const f = await fixture(t, "idea", { elements: 3 }); const parent = await completeReview(f, f.context);
  const original = f.documentBytes.get("idea").toString();
  const changed = original.replace(/### IDEA-0002:[\s\S]*?(?=### IDEA-0003:)/u, "")
    + "\n### IDEA-0004: New capability\n\nFresh independent evidence is required.\n";
  await amendRegistry(f, { ...f.registry, element_metadata: [...f.registry.element_metadata.filter((m) => m.ref.element_id !== "IDEA-0002"), { ...f.registry.element_metadata.find((m) => m.ref.element_id === "IDEA-0001"), ref: { ...f.refs.idea, element_id: "IDEA-0004" } }] });
  await replaceArtifactDocument(f, "idea", changed);
  const begun = await start(f, parent.reviewRef);
  const state = await saved(f, begun.result.review_ref);
  assert.equal(state.inventory.recheck_impact.changes.find((a) => a.atom_key === "element:idea:IDEA-0002").change, "removed");
  assert.equal(state.inventory.recheck_impact.changes.find((a) => a.atom_key === "element:idea:IDEA-0004").change, "added");
  assert.ok(!state.verdicts.some((v) => v.item_key === "element:idea:IDEA-0002"));
  const memberships = state.inventory.blocks.flatMap((b) => b.primary_atoms);
  assert.deepEqual([...memberships].sort(), state.inventory.items.map((a) => a.item_key).sort());
  assert.equal(new Set(memberships).size, memberships.length);
  assert.equal((await finish(f, begun)).result.coverage_status, "reviewed");
});

test("new original instruction and answer evidence blocks inheritance and has zero rejected effects", async (t) => {
  for (const state of ["observed", "answered"]) {
    const f = await fixture(t, "idea"); const parent = await completeReview(f, f.context);
    const decisionRef = { product_id: f.productId, artifact: "idea", id: randomUUID(), revision: 1 };
    const value = { schema_version: 1, kind: "decision", ref: decisionRef, state, category: state === "observed" ? "instruction" : "technology",
      question: state === "answered" ? "Choose an engine?" : null, text: "A newly recorded material input.", source: "Synthetic original answer", selected_ids: [], predecessors: [], affected_refs: [f.refs.idea], reconsider_when: null, candidate_id: f.candidateId };
    const stored = await saveObject(f.root, { productId: f.productId, kind: "decision", bytes: bytes(value), artifact: "idea", decisionId: decisionRef.id, revision: 1 });
    await amendCandidate(f, { decision_heads: [{ decision_ref: decisionRef, object_sha256: stored.sha256 }] });
    const before = await snapshot(f.root);
    await assert.rejects(start(f, parent.reviewRef), (error) => { assert.equal(error.code, "PREREQUISITE_REQUIRED"); assert.match(error.message, /original instructions, answers/); return true; });
    assert.deepEqual(await snapshot(f.root), before);
  }
});

test("changed shared decision evidence widens independent judgment to every participant", async (t) => {
  const f = await fixture(t, "idea", { elements: 3 });
  const id = randomUUID(), participants = [f.refs.idea, { ...f.refs.idea, element_id: "IDEA-0002" }];
  async function decision(revision, text) {
    const ref = { product_id: f.productId, artifact: "idea", id, revision };
    const value = { schema_version: 1, kind: "decision", ref, state: "observed", category: "observation", question: null, text,
      source: "Synthetic shared observation", selected_ids: [], predecessors: revision === 1 ? [] : [{ ...ref, revision: 1 }], affected_refs: participants, reconsider_when: null, candidate_id: f.candidateId };
    const stored = await saveObject(f.root, { productId: f.productId, kind: "decision", bytes: bytes(value), artifact: "idea", decisionId: id, revision });
    await amendCandidate(f, { decision_heads: [{ decision_ref: ref, object_sha256: stored.sha256 }] });
  }
  await decision(1, "Both participants share a local assumption."); const parent = await completeReview(f, f.context);
  await decision(2, "Both participants require the updated integration.");
  const begun = await start(f, parent.reviewRef);
  assert.equal(begun.result.recheck.pending_items, 2);
  assert.equal((await finish(f, begun)).result.coverage_status, "reviewed");
});

test("related evidence outside the selected inventory cannot remain inherited after source or applicability drift", async (t) => {
  const f = await fixture(t, "idea", { elements: 2 });
  const begun = await review.startProductReview({ root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "full" });
  for (let index = 0; index < begun.result.total_items; index++) {
    const item = await readItemFully(f, begun.result.review_ref, index, f.context);
    const response = await review.recordProductVerdict({ root: f.root, context: f.context, reviewRef: begun.result.review_ref, value: {
      item_key: item.item_key, verdict: "covered", explanation: "Synthetic independent evidence from the PRD.", counterexample: null,
      evidence_refs: item.item_key === "element:idea:IDEA-0002" ? [f.refs.prd] : [], evidence_sources: [], read_receipt: item.read_receipt, inherited_from: null } }); f.context = response.context;
  }
  await recordConsistency(f, begun.result.review_ref, f.context);
  await review.completeProductReview({ root: f.root, context: f.context, reviewRef: begun.result.review_ref });
  await replaceArtifactDocument(f, "prd", f.documentBytes.get("prd").toString().replace("Current prd", "Changed prd"));
  const rechecked = await start(f, begun.result.review_ref);
  const retained = await saved(f, rechecked.result.review_ref);
  assert.ok(!retained.verdicts.some((v) => v.item_key === "element:idea:IDEA-0002"), "unchanged selected block depends on changed external source evidence");
  assert.equal((await finish(f, rechecked)).result.coverage_status, "reviewed");
});

test("expansion invalidates old consistency, and completed rechecks retain verifiable parent chains", async (t) => {
  const f = await fixture(t, "idea", { elements: 2 }); const parent = await completeReview(f, f.context);
  await replaceArtifactDocument(f, "idea", f.documentBytes.get("idea").toString().replace("Current idea", "Changed idea"));
  const begun = await start(f, parent.reviewRef); f.context = begun.context;
  const record = await recordItem(f, begun.result.review_ref, begun.result.next_item_index, f.context); f.context = record.context;
  let part = await review.readProductReviewConsistency({ root: f.root, context: f.context, reviewRef: begun.result.review_ref });
  while (part.result.next_cursor) part = await review.readProductReviewConsistency({ root: f.root, context: f.context, reviewRef: begun.result.review_ref, cursor: part.result.next_cursor });
  await recordConsistency(f, begun.result.review_ref, f.context);
  const expansion = await review.expandProductReviewScope({ root: f.root, context: f.context, reviewRef: begun.result.review_ref, itemKeys: ["scope"], reason: "The reviewer widens scope after reading consistency." }); f.context = expansion.context;
  const judgment = await recordItem(f, begun.result.review_ref, expansion.result.next_item_index, f.context); f.context = judgment.context;
  await assert.rejects(review.recordProductReviewConsistency({ root: f.root, context: f.context, reviewRef: begun.result.review_ref, readReceipt: part.result.read_receipt, verdict: "covered", explanation: "Old consistency cannot cover expansion.", counterexample: null }), expectCode("INVALID_INPUT"));
  const final = await finish(f, { ...begun, result: { ...expansion.result, next_item_index: null } }); f.context = final.context;
  await replaceArtifactDocument(f, "idea", f.documentBytes.get("idea").toString().replace("Changed idea", "Second idea"));
  const next = await start(f, begun.result.review_ref);
  const stored = await saved(f, next.result.review_ref);
  for (const v of stored.verdicts) assert.equal(v.inherited_from, begun.result.review_ref);
  assert.equal((await finish(f, next)).result.coverage_status, "reviewed");
});

test("tampered immutable history rejects inheritance without writing, while intact current full review stays available", async (t) => {
  const f = await fixture(t, "idea");
  await replaceArtifactDocument(f, "idea", f.documentBytes.get("idea").toString().replace("Current idea", "Reviewed idea"));
  const parent = await completeReview(f, f.context);
  const prior = await saved(f, parent.reviewRef);
  const old = prior.inventory.items.find((a) => a.sources?.length).sources[0];
  const path = old.kind === "markdown" ? join(f.root, "products", f.productId, "objects", `${old.sha256}.md`) : objectPath(f, old.sha256);
  await replaceArtifactDocument(f, "idea", f.documentBytes.get("idea").toString().replace("Reviewed idea", "Changed idea"));
  await writeFile(path, "Tampered historical source.\n");
  const before = await snapshot(f.root);
  await assert.rejects(start(f, parent.reviewRef), (error) => { assert.equal(error.code, "PREREQUISITE_REQUIRED"); assert.match(error.message, /full independent review/); return true; });
  assert.deepEqual(await snapshot(f.root), before);
  assert.equal((await review.startProductReview({ root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "full" })).result.recorded_items, 0);
});

test("corrupt current inputs block both recheck and full fallback with zero effects", async (t) => {
  const f = await fixture(t, "idea"); const parent = await completeReview(f, f.context);
  await replaceArtifactDocument(f, "idea", f.documentBytes.get("idea").toString().replace("Current idea", "Changed idea"));
  const document = f.registry.documents.find((d) => d.artifact === "idea");
  await writeFile(join(f.root, "products", f.productId, "objects", `${document.object_sha256}.md`), "Corrupt current source.\n");
  const before = await snapshot(f.root);
  await assert.rejects(start(f, parent.reviewRef), expectCode("SOURCE_CHANGED"));
  await assert.rejects(review.startProductReview({ root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "full" }), expectCode("SOURCE_CHANGED"));
  assert.deepEqual(await snapshot(f.root), before);
});

test("changed globally applicable evidence requires fresh judgment across the whole current inventory", async (t) => {
  const f = await fixture(t, "idea", { elements: 3 });
  await amendRegistry(f, { ...f.registry, element_metadata: f.registry.element_metadata.map((m) => m.ref.element_id === "IDEA-0001" ? { ...m, applicability: { ...m.applicability, global: true } } : m) });
  const parent = await completeReview(f, f.context);
  await replaceArtifactDocument(f, "idea", f.documentBytes.get("idea").toString().replace("Current idea behavior", "Changed global behavior"));
  const begun = await start(f, parent.reviewRef);
  assert.equal(begun.result.recheck.pending_items, begun.result.total_items, "global evidence has no safely isolated influence");
  assert.equal((await saved(f, begun.result.review_ref)).verdicts.length, 0);
  assert.equal((await finish(f, begun)).result.coverage_status, "reviewed");
});


for (const change of ["removed", "applicability", "moved", "unchanged", "digest", "dependencies", "dependency_digest", "dependency_applicability", "terminal_digest", "terminal_applicability", "chain_unchanged", "stage_digest"]) {
  test(`source-only external evidence ${change} preserves only current valid inheritance`, async (t) => {
    const f = await fixture(t, "idea", { elements: 2 });
    if (["dependencies", "dependency_digest", "dependency_applicability", "terminal_digest", "terminal_applicability", "chain_unchanged"].includes(change)) await amendCandidate(f, { relations: [
      { from: f.refs.prd, kind: "affects", to: f.refs["technical-design"] },
      { from: f.refs["technical-design"], kind: "affects", to: f.refs.roadmap },
    ] });
    if (change === "stage_digest") await amendRegistry(f, { ...f.registry,
      element_metadata: f.registry.element_metadata.map((m) => m.ref.artifact === "prd"
        ? { ...m, applicability: { ...m.applicability, stage_refs: [f.refs.roadmap] } } : m),
    });
    const parent = await review.startProductReview({ root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "full" });
    for (let index = 0; index < parent.result.total_items; index++) {
      const item = await readItemFully(f, parent.result.review_ref, index, f.context);
      const recorded = await review.recordProductVerdict({ root: f.root, context: f.context, reviewRef: parent.result.review_ref, value: {
        item_key: item.item_key, verdict: "covered", explanation: "Synthetic source-only external evidence.", counterexample: null,
        evidence_refs: [], evidence_sources: item.item_key === "element:idea:IDEA-0002" ? [f.pin("prd")] : [],
        read_receipt: item.read_receipt, inherited_from: null,
      } }); f.context = recorded.context;
    }
    await recordConsistency(f, parent.result.review_ref, f.context);
    await review.completeProductReview({ root: f.root, context: f.context, reviewRef: parent.result.review_ref });
    const parentBytes = await readFile(reviewPath(f, parent.result.review_ref));
    if (change === "removed") await amendRegistry(f, { ...f.registry,
      documents: f.registry.documents.filter((d) => d.artifact !== "prd"),
      element_metadata: f.registry.element_metadata.filter((m) => m.ref.artifact !== "prd"),
    });
    if (change === "applicability") await amendRegistry(f, { ...f.registry,
      element_metadata: f.registry.element_metadata.map((m) => m.ref.artifact === "prd"
        ? { ...m, applicability: { ...m.applicability, state: "hypothesis", reason: "Changed external applicability." } } : m),
    });
    if (change === "moved") await amendRegistry(f, { ...f.registry,
      documents: f.registry.documents.map((d) => d.artifact === "prd" ? { ...d, subject: "Moved evidence", relative_path: "prd/moved.md" } : d),
    });
    if (change === "digest") await replaceArtifactDocument(f, "prd", f.documentBytes.get("prd").toString().replace("Current prd", "Changed prd"));
    if (change === "dependencies") await amendCandidate(f, { relations: f.candidate.relations.map((relation, index) =>
      index === 1 ? { ...relation, kind: "depends_on" } : relation) });
    const dependencyArtifact = change.startsWith("terminal_") || change === "stage_digest" ? "roadmap" : "technical-design";
    if (["dependency_digest", "terminal_digest", "stage_digest"].includes(change)) await replaceArtifactDocument(f, dependencyArtifact,
      f.documentBytes.get(dependencyArtifact).toString().replace(`Current ${dependencyArtifact}`, `Changed ${dependencyArtifact}`));
    if (["dependency_applicability", "terminal_applicability"].includes(change)) await amendRegistry(f, { ...f.registry,
      element_metadata: f.registry.element_metadata.map((m) => m.ref.artifact === dependencyArtifact
        ? { ...m, applicability: { ...m.applicability, state: "hypothesis", reason: "Reached dependency changed applicability." } } : m),
    });
    const unchanged = ["unchanged", "chain_unchanged"].includes(change);
    const begun = await start(f, parent.result.review_ref);
    const retained = await saved(f, begun.result.review_ref);
    if (change === "dependencies") assert.equal(retained.inventory.recheck_impact.changes.length, 0,
      "external relation drift must be checked even when the selected atomic inventory did not change");
    assert.equal(retained.verdicts.some((v) => v.item_key === "element:idea:IDEA-0002"), unchanged,
      "changed source-only identity, membership, applicability or bytes cannot inherit the dependent verdict");
    assert.equal(begun.result.recheck.pending_items, unchanged ? 0 : 1);
    assert.equal(begun.result.recheck.inherited_items, unchanged ? 4 : 3);
    assert.equal((await finish(f, begun)).result.coverage_status, "reviewed");
    assert.deepEqual(await readFile(reviewPath(f, parent.result.review_ref)), parentBytes);
  });
}


for (const kind of ["record", "decision"]) {
  for (const changed of [false, true, "removed"]) {
    test(`source-only ${kind} evidence ${changed === "removed" ? "removed" : changed ? "changed" : "unchanged"} verifies its own pin domain`, async (t) => {
      const f = await fixture(t, "idea", { elements: 2 });
      let pin;
      let decision;
      if (kind === "record") {
        pin = { ...f.pin("prd"), source_kind: "record", source_id: f.registryId, object_sha256: f.registryObject.sha256, element_ids: [] };
      } else {
        const ref = { product_id: f.productId, artifact: "prd", id: randomUUID(), revision: 1 };
        decision = { schema_version: 1, kind: "decision", ref, state: "observed", category: "observation", question: null,
          text: "Synthetic external decision evidence.", source: "Synthetic fixture", selected_ids: [], predecessors: [],
          affected_refs: [f.refs.prd], reconsider_when: null, candidate_id: f.candidateId };
        const object = await saveObject(f.root, { productId: f.productId, kind: "decision", artifact: "prd", decisionId: ref.id, revision: 1, bytes: bytes(decision) });
        const head = { decision_ref: ref, object_sha256: object.sha256 };
        const base = await readGenerationMetadata(f.root, f.productId, f.candidate.base_generation);
        const generation = await saveGeneration(f.root, { ...base, decision_heads: [head] });
        await amendCandidate(f, { base_generation: generation.sha256, decision_heads: [head] });
        const headPath = join(f.root, "products", f.productId, "head.yaml");
        const productHead = JSON.parse(await readFile(headPath, "utf8"));
        await writeFile(headPath, bytes({ ...productHead, generation: generation.sha256 }));
        pin = { ...f.pin("prd"), generation: generation.sha256, source_kind: "decision", source_id: ref.id,
          object_sha256: object.sha256, element_ids: [], decision_ref: ref };
      }
      const parent = await review.startProductReview({ root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "full" });
      for (let index = 0; index < parent.result.total_items; index++) {
        const item = await readItemFully(f, parent.result.review_ref, index, f.context);
        const recorded = await review.recordProductVerdict({ root: f.root, context: f.context, reviewRef: parent.result.review_ref, value: {
          item_key: item.item_key, verdict: "covered", explanation: "Synthetic source-only typed evidence.", counterexample: null,
          evidence_refs: [], evidence_sources: item.item_key === "element:idea:IDEA-0002" ? [pin] : [], read_receipt: item.read_receipt, inherited_from: null,
        } }); f.context = recorded.context;
      }
      await recordConsistency(f, parent.result.review_ref, f.context);
      await review.completeProductReview({ root: f.root, context: f.context, reviewRef: parent.result.review_ref });
      if (changed === true && kind === "record") await amendRegistry(f, { ...f.registry, element_metadata: f.registry.element_metadata.map((m) =>
        m.ref.artifact === "prd" ? { ...m, applicability: { ...m.applicability, reason: "Changed registry evidence." } } : m) });
      if (changed === true && kind === "decision") {
        const ref = { ...decision.ref, revision: 2 };
        const value = { ...decision, ref, text: "Changed source-only decision.", predecessors: [decision.ref] };
        const object = await saveObject(f.root, { productId: f.productId, kind: "decision", artifact: "prd", decisionId: ref.id, revision: 2, bytes: bytes(value) });
        await amendCandidate(f, { decision_heads: [{ decision_ref: ref, object_sha256: object.sha256 }] });
      }
      if (changed === "removed" && kind === "record") await amendCandidate(f, { registry: { ...f.candidate.registry, id: randomUUID() } });
      if (changed === "removed" && kind === "decision") await amendCandidate(f, { decision_heads: [] });
      const begun = await start(f, parent.result.review_ref);
      const retained = await saved(f, begun.result.review_ref);
      assert.equal(retained.verdicts.some((v) => v.item_key === "element:idea:IDEA-0002"), !changed,
        "registry and decision pins cannot be checked as markdown digests");
      assert.equal((await finish(f, begun)).result.coverage_status, "reviewed");
    });
  }
}


for (const evidence of ["refs", "pins", "mixed"]) {
test(`${evidence} missing retained dependency bytes requires full fallback while current intact inputs remain usable`, async (t) => {
  const f = await fixture(t, "idea", { elements: 2 });
  await amendCandidate(f, { relations: [{ from: f.refs.prd, kind: "depends_on", to: f.refs["technical-design"] }] });
  await replaceArtifactDocument(f, "technical-design", f.documentBytes.get("technical-design").toString().replace("Current technical-design", "Reviewed technical-design"));
  const parent = await review.startProductReview({ root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "full" });
  for (let index = 0; index < parent.result.total_items; index++) {
    const item = await readItemFully(f, parent.result.review_ref, index, f.context);
    const recorded = await review.recordProductVerdict({ root: f.root, context: f.context, reviewRef: parent.result.review_ref, value: {
      item_key: item.item_key, verdict: "covered", explanation: "Synthetic retained dependency evidence.", counterexample: null,
      evidence_refs: item.item_key === "element:idea:IDEA-0002" && evidence !== "pins" ? [f.refs.prd] : [],
      evidence_sources: item.item_key === "element:idea:IDEA-0002" && evidence !== "refs" ? [f.pin("prd")] : [], read_receipt: item.read_receipt, inherited_from: null,
    } }); f.context = recorded.context;
  }
  await recordConsistency(f, parent.result.review_ref, f.context);
  await review.completeProductReview({ root: f.root, context: f.context, reviewRef: parent.result.review_ref });
  const historical = f.registry.documents.find((d) => d.artifact === "technical-design").object_sha256;
  await replaceArtifactDocument(f, "technical-design", f.documentBytes.get("technical-design").toString().replace("Reviewed technical-design", "Changed technical-design"));
  await unlink(join(f.root, "products", f.productId, "objects", `${historical}.md`));
  const before = await snapshot(f.root);
  await assert.rejects(start(f, parent.result.review_ref), (error) => {
    assert.equal(error.code, "PREREQUISITE_REQUIRED"); assert.match(error.message, /full independent review/); return true;
  });
  assert.deepEqual(await snapshot(f.root), before);
  assert.equal((await review.startProductReview({ root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "full" })).result.recorded_items, 0);
});
}


for (const evidence of ["refs", "pins", "mixed"]) {
  for (const change of ["dependency_digest", "dependency_applicability", "terminal_digest", "terminal_applicability", "unchanged"]) {
    test(`${evidence} selector dependency closure ${change} retains only current applicable evidence`, async (t) => {
      const f = await fixture(t, "idea", { elements: 2 });
      await amendCandidate(f, { relations: [
        { from: f.refs.prd, kind: "depends_on", to: f.refs["technical-design"] },
        { from: f.refs["technical-design"], kind: "depends_on", to: f.refs.roadmap },
      ] });
      const parent = await review.startProductReview({ root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "full" });
      for (let index = 0; index < parent.result.total_items; index++) {
        const item = await readItemFully(f, parent.result.review_ref, index, f.context);
        const relevant = item.item_key === "element:idea:IDEA-0002";
        const recorded = await review.recordProductVerdict({ root: f.root, context: f.context, reviewRef: parent.result.review_ref, value: {
          item_key: item.item_key, verdict: "covered", explanation: "Synthetic declared selector evidence.", counterexample: null,
          evidence_refs: relevant && evidence !== "pins" ? [f.refs.prd] : [],
          evidence_sources: relevant && evidence !== "refs" ? [f.pin("prd")] : [], read_receipt: item.read_receipt, inherited_from: null,
        } }); f.context = recorded.context;
      }
      await recordConsistency(f, parent.result.review_ref, f.context);
      await review.completeProductReview({ root: f.root, context: f.context, reviewRef: parent.result.review_ref });
      const before = await saved(f, parent.result.review_ref);
      const declared = before.verdicts.find((v) => v.item_key === "element:idea:IDEA-0002");
      assert.deepEqual(declared.evidence_refs, evidence === "pins" ? [] : [f.refs.prd]);
      assert.deepEqual(declared.evidence_sources, evidence === "refs" ? [] : [f.pin("prd")]);
      const parentBytes = await readFile(reviewPath(f, parent.result.review_ref));
      const artifact = change.startsWith("terminal_") ? "roadmap" : "technical-design";
      if (change.endsWith("digest")) await replaceArtifactDocument(f, artifact,
        f.documentBytes.get(artifact).toString().replace(`Current ${artifact}`, `Changed ${artifact}`));
      if (change.endsWith("applicability")) await amendRegistry(f, { ...f.registry,
        element_metadata: f.registry.element_metadata.map((m) => m.ref.artifact === artifact
          ? { ...m, applicability: { ...m.applicability, state: "hypothesis", reason: "Declared dependency no longer established." } } : m),
      });
      const begun = await start(f, parent.result.review_ref);
      const retained = await saved(f, begun.result.review_ref);
      const inherited = retained.verdicts.find((v) => v.item_key === "element:idea:IDEA-0002");
      assert.equal(inherited !== undefined, change === "unchanged", "every declared selector must check reached participant content and applicability");
      if (inherited !== undefined) assert.deepEqual(inherited, { ...declared, inherited_from: parent.result.review_ref });
      assert.equal(begun.result.recheck.pending_items, change === "unchanged" ? 0 : 1);
      assert.equal(begun.result.recheck.inherited_items, change === "unchanged" ? 4 : 3);
      assert.equal((await finish(f, begun)).result.coverage_status, "reviewed");
      assert.deepEqual(await readFile(reviewPath(f, parent.result.review_ref)), parentBytes);
    });
  }
}
