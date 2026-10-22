import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath, URL } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

import * as review from "../dist/product/review.js";
import { workflowTools } from "../dist/server.js";
import { createSharedStdioHarness } from "../test-support/stdio-harness.mjs";
import { fixture, snapshot, expectCode, recordItem, recordConsistency, digest, bytes, replaceArtifactDocument,
  candidateVersion, context, writeCandidate, completeReview } from "../test-support/product-review-fixture.mjs";

const valueFor = (portion) => ({ item_key: portion.item_key, verdict: "covered", explanation: "Synthetic block evidence.",
  counterexample: null, evidence_refs: [], evidence_sources: [], read_receipt: portion.read_receipt, inherited_from: null });

test("pending stdio scan consumes Unicode continuations, skips acknowledged items and terminates empty", async (t) => {
  const f = await fixture(t, "prd");
  await replaceArtifactDocument(f, "prd", `# PRD\n\n### PRD-0001: Unicode\n\n${"🙂".repeat(18000)}\n`);
  const harness = createSharedStdioHarness({
    entrypoint: fileURLToPath(new URL("../dist/main.js", import.meta.url)), name: "pending-scan",
    createClient: async ({ entrypoint, name }) => {
      const client = new Client({ name, version: "1" });
      await client.connect(new StdioClientTransport({ command: process.execPath, args: [entrypoint], stderr: "pipe",
        env: { ...process.env, EAW_PRODUCT_DATA_DIR: f.root } }));
      return client;
    },
  });
  t.after(() => harness.close());
  let current = f.context;
  const call = async (name, args = {}) => {
    const raw = await harness.callTool({ name, arguments: { context: current, ...args } });
    const response = raw.structuredContent ?? JSON.parse(raw.content.find((entry) => entry.type === "text").text);
    assert.ok(Buffer.byteLength(JSON.stringify(raw)) <= 64 * 1024);
    assert.ok(Buffer.byteLength(JSON.stringify(response)) <= 24 * 1024);
    if (response.context) current = response.context;
    return response;
  };
  const started = await call("product_review_start", { candidate_ref: f.candidateRef, mode: "full" });
  assert.equal(started.error, undefined);
  const input = { review_ref: started.result.review_ref };
  assert.equal((await call("product_review_complete", input)).error.code, "PREREQUISITE_REQUIRED");
  let index = started.result.next_item_index, retained = 0, empty = 0, continuations = 0;
  const keys = new Set();
  // Acknowledged suffix leaves the multi-portion element as the final pending item.
  const suffix = [];
  for (let itemIndex = 2; itemIndex < started.result.total_items; itemIndex++) {
    const item = await call("product_review_get", { ...input, item_index: itemIndex });
    assert.equal(item.error, undefined);
    assert.equal(item.result.complete, true);
    suffix.push(valueFor(item.result)); keys.add(item.result.item_key);
  }
  assert.ok(suffix.length > 0);
  assert.equal((await call("product_review_record_batch", { ...input, items: suffix })).error, undefined);
  while (index !== null) {
    const page = await call("product_review_get_batch", { ...input, start_index: index, pending_only: true, limit: 20 });
    assert.equal(page.error, undefined);
    const verdicts = [];
    for (const item of page.result.items) {
      let portion = item.portion, text = portion.text;
      assert.equal(keys.has(portion.item_key), false, "Acknowledged items must not be delivered again.");
      if (!portion.complete) {
        assert.equal(page.result.next_item_index, item.item_index);
        retained++;
        assert.equal((await call("product_review_record_batch", { ...input, items: [valueFor(portion)] })).error.code, "INVALID_INPUT");
      }
      while (!portion.complete) {
        const next = await call("product_review_get", { ...input, item_index: item.item_index, cursor: portion.next_cursor });
        assert.equal(next.error, undefined);
        portion = next.result; text += portion.text; continuations++;
      }
      if (text.includes("🙂")) assert.equal(text.match(/🙂/gu).length, 18000);
      keys.add(portion.item_key); verdicts.push(valueFor(portion));
    }
    if (verdicts.length) {
      assert.equal((await call("product_review_record_batch", { ...input, items: verdicts })).error, undefined);
    } else {
      assert.deepEqual(page.result.items, []);
      assert.equal(page.result.next_item_index, null); empty++;
    }
    index = page.result.next_item_index;
  }
  assert.ok(retained > 0 && continuations > 0);
  assert.equal(empty, 1);
  assert.equal(keys.size, started.result.total_items);
  assert.equal((await call("product_review_complete", input)).error.code, "PREREQUISITE_REQUIRED");
  let consistency = await call("product_review_consistency_get", input);
  while (!consistency.result.complete) consistency = await call("product_review_consistency_get", { ...input, cursor: consistency.result.next_cursor });
  assert.equal((await call("product_review_consistency_record", { ...input, read_receipt: consistency.result.read_receipt,
    verdict: "covered", explanation: "Synthetic consistency judgment.", counterexample: null })).error, undefined);
  assert.equal((await call("product_review_complete", input)).result.coverage_status, "reviewed");
});

test("completeReview resumes an acknowledged suffix and finds a gap in the final Unicode portion", async (t) => {
  const f = await fixture(t, "prd");
  await replaceArtifactDocument(f, "prd", `# PRD\n\n### PRD-0001: Unicode\n\n${"🙂".repeat(18000)}\nFINAL_GAP_MARKER\n`);
  const started = await review.startProductReview({ ...f, candidateRef: f.candidateRef, mode: "full" });
  const args = { root: f.root, context: started.context, reviewRef: started.result.review_ref };
  const suffix = [];
  for (let itemIndex = 2; itemIndex < started.result.total_items; itemIndex++) {
    const item = await review.readProductReviewItem({ ...args, itemIndex });
    assert.equal(item.result.complete, true);
    suffix.push(valueFor(item.result));
  }
  assert.ok(suffix.length > 0);
  const recorded = await review.recordProductVerdictBatch({ ...args, items: suffix });
  const result = await completeReview(f, recorded.context, { gapText: "FINAL_GAP_MARKER" });
  assert.equal(result.reviewRef, started.result.review_ref);
  assert.equal(result.gapKey, "element:prd:PRD-0001");
  assert.equal(result.status.recorded_items, started.result.total_items);
  assert.equal(result.status.coverage_status, "gaps");
});

test("product review exposes bounded batch tools", () => {
  for (const name of ["product_review_get_batch", "product_review_record_batch"]) {
    assert.ok(workflowTools.find((tool) => tool.name === name), name);
  }
});

test("relation-heavy inventory retains all selected atoms while grouping participant evidence", async (t) => {
  const f = await fixture(t, "prd", { elements: 100 });
  const refs = f.registry.element_metadata.filter((entry) => entry.ref.artifact === "prd").map((entry) => entry.ref);
  const candidate = { ...f.candidate, relations: refs.flatMap((from, index) => [1, 2, 3].map((offset) => ({
    from, kind: "affects", to: refs[(index + offset) % refs.length],
  }))) };
  candidate.source_version = candidateVersion(candidate);
  await writeCandidate(f, candidate);
  const start = await review.startProductReview({ ...f, context: context(f, candidate), candidateRef: f.candidateRef, mode: "full" });
  assert.equal(start.result.source_atoms, 403);
  assert.equal(start.result.total_items, 103);
  const path = join(f.root, "products", f.productId, "drafts", f.candidateId, "reviews", `${start.result.review_ref}.yaml`);
  const state = JSON.parse(await readFile(path, "utf8"));
  const inventory = JSON.parse(await readFile(join(f.root, "products", f.productId, "objects", `${state.inventory_sha256}.yaml`), "utf8"));
  assert.deepEqual(inventory.blocks.flatMap((block) => block.primary_atoms).sort(), inventory.items.map((item) => item.item_key).sort());
  assert.equal(inventory.blocks.flatMap((block) => block.related_atoms).filter((key) => key.startsWith("relation:")).length, 300);
});

test("full audit rejects a hash-valid verdict with a forged read receipt", async (t) => {
  const f = await fixture(t, "prd");
  const started = await review.startProductReview({ ...f, candidateRef: f.candidateRef, mode: "full" });
  const args = { root: f.root, context: started.context, reviewRef: started.result.review_ref };
  await recordItem(f, args.reviewRef, 0, args.context);
  const path = join(f.root, "products", f.productId, "drafts", f.candidateId, "reviews", `${args.reviewRef}.yaml`);
  const state = JSON.parse(await readFile(path, "utf8"));
  const entry = state.verdict_index[0];
  const objectPath = (hash) => join(f.root, "products", f.productId, "objects", `${hash}.yaml`);
  const verdict = JSON.parse(await readFile(objectPath(entry.object_sha256), "utf8"));
  verdict.read_receipt = "0".repeat(64);
  const content = bytes(verdict);
  entry.object_sha256 = digest(content);
  entry.bytes = content.byteLength;
  await writeFile(objectPath(entry.object_sha256), content);
  await writeFile(path, bytes(state));
  await assert.rejects(review.startProductReview({ ...f, candidateRef: f.candidateRef, mode: "full" }), expectCode("SOURCE_CHANGED"));
});

test("candidate readiness and activation reject corrupted completed index evidence", async (t) => {
  const f = await fixture(t, "prd");
  const completed = await completeReview(f, f.context);
  const path = join(f.root, "products", f.productId, "drafts", f.candidateId, "reviews", `${completed.reviewRef}.yaml`);
  const state = JSON.parse(await readFile(path, "utf8"));
  state.verdict_index[0].bytes++;
  await writeFile(path, bytes(state));
  const before = await snapshot(f.root);
  await assert.rejects(review.checkProductCandidate({ ...f, context: completed.context, candidateRef: f.candidateRef }), expectCode("SOURCE_CHANGED"));
  await assert.rejects(review.activateAmendment({ root: f.root, context: completed.context,
    candidates: [f.candidateRef], reviewRefs: [completed.reviewRef] }), expectCode("SOURCE_CHANGED"));
  assert.deepEqual(await snapshot(f.root), before);
});

test("large Unicode batch portions stay within the wire budget and old candidate writes conflict", async (t) => {
  const f = await fixture(t, "prd");
  await replaceArtifactDocument(f, "prd", `# PRD\n\n### PRD-0001: Unicode\n\n${"🙂".repeat(18000)}\n`);
  const started = await review.startProductReview({ ...f, candidateRef: f.candidateRef, mode: "full" });
  const args = { root: f.root, context: started.context, reviewRef: started.result.review_ref };
  const page = await review.readProductReviewBatch({ ...args, startIndex: 0 });
  const envelope = { protocol_version: 2, context: page.context, result: page.result, replayed: page.replayed, operation_ref: page.operationRef };
  assert.ok(Buffer.byteLength(JSON.stringify(envelope)) <= 24 * 1024);
  const partial = page.result.items.at(-1);
  assert.equal(partial.portion.complete, false);
  assert.equal(partial.portion.read_receipt, null);
  let part = partial.portion;
  let text = part.text;
  while (!part.complete) {
    part = (await review.readProductReviewItem({ ...args, itemIndex: partial.item_index, cursor: part.next_cursor })).result;
    text += part.text;
  }
  assert.equal(text.match(/🙂/gu).length, 18000);
  await replaceArtifactDocument(f, "prd", "# PRD\n\n### PRD-0001: Changed\n\nChanged behavior.\n");
  await assert.rejects(review.recordProductVerdictBatch({ ...args, items: [valueFor(part)] }), expectCode("CONFLICT"));
});

test("batch verdicts are atomic, replayable and require final semantic consistency", async (t) => {
  const f = await fixture(t, "prd", { elements: 6 });
  const started = await review.startProductReview({ ...f, candidateRef: f.candidateRef, mode: "full" });
  const args = { root: f.root, context: started.context, reviewRef: started.result.review_ref };
  const page = await review.readProductReviewBatch({ ...args, startIndex: 0, limit: 20 });
  assert.equal(page.result.items.length, started.result.total_items);
  const items = page.result.items.map(({ portion }) => valueFor(portion));
  const before = await snapshot(f.root);
  const invalid = JSON.parse(JSON.stringify(items)); invalid.at(-1).read_receipt = "invalid";
  await assert.rejects(review.recordProductVerdictBatch({ ...args, items: invalid }), expectCode("INVALID_INPUT"));
  assert.deepEqual(await snapshot(f.root), before);
  const recorded = await review.recordProductVerdictBatch({ ...args, items });
  const saved = await snapshot(f.root);
  assert.equal((await review.recordProductVerdictBatch({ ...args, items })).replayed, true);
  assert.deepEqual(await snapshot(f.root), saved);
  await assert.rejects(review.recordProductVerdictBatch({ ...args, items: [...items].reverse() }), expectCode("CONFLICT"));
  await assert.rejects(review.completeProductReview(args), expectCode("PREREQUISITE_REQUIRED"));
  await recordConsistency(f, args.reviewRef, recorded.context);
  assert.equal((await review.completeProductReview(args)).result.coverage_status, "reviewed");
});

test("warm status does not read untouched verdicts but final audit rejects their corruption", async (t) => {
  const f = await fixture(t, "prd");
  const started = await review.startProductReview({ ...f, candidateRef: f.candidateRef, mode: "full" });
  const args = { root: f.root, context: started.context, reviewRef: started.result.review_ref };
  await recordItem(f, args.reviewRef, 0, args.context);
  const path = join(f.root, "products", f.productId, "drafts", f.candidateId, "reviews", `${args.reviewRef}.yaml`);
  const saved = JSON.parse(await readFile(path, "utf8"));
  assert.equal(saved.schema_version, 2);
  assert.equal(saved.verdict_objects, undefined);
  const entry = saved.verdict_index[0];
  await writeFile(join(f.root, "products", f.productId, "objects", `${entry.object_sha256}.yaml`), "corrupt");
  assert.equal((await review.getProductReviewStatus(args)).result.recorded_items, 1);
  await assert.rejects(review.readProductReviewItem({ ...args, itemIndex: 0 }), expectCode("SOURCE_CHANGED"));
  await assert.rejects(review.completeProductReview(args), expectCode("SOURCE_CHANGED"));
});

test("a requested block verifies its used retained document even in a warm process", async (t) => {
  const f = await fixture(t, "prd");
  const started = await review.startProductReview({ ...f, candidateRef: f.candidateRef, mode: "full" });
  const args = { root: f.root, context: started.context, reviewRef: started.result.review_ref };
  await review.getProductReviewStatus(args);
  const document = f.registry.documents.find((entry) => entry.artifact === "prd");
  await writeFile(join(f.root, "products", f.productId, "objects", `${document.object_sha256}.md`), "corrupt");
  await assert.rejects(review.readProductReviewItem({ ...args, itemIndex: 0 }), expectCode("SOURCE_CHANGED"));
});

test("legacy storage migration preserves identity and inventory and is read-only until the first actual write", async (t) => {
  const f = await fixture(t, "prd");
  const started = await review.startProductReview({ ...f, candidateRef: f.candidateRef, mode: "full" });
  const args = { root: f.root, context: started.context, reviewRef: started.result.review_ref };
  const path = join(f.root, "products", f.productId, "drafts", f.candidateId, "reviews", `${args.reviewRef}.yaml`);
  const current = JSON.parse(await readFile(path, "utf8"));
  const inventoryPath = join(f.root, "products", f.productId, "objects", `${current.inventory_sha256}.yaml`);
  const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
  delete inventory.blocks;
  for (const atom of inventory.items) delete atom.sources;
  const inventoryBytes = bytes(inventory);
  await writeFile(join(f.root, "products", f.productId, "objects", `${digest(inventoryBytes)}.yaml`), inventoryBytes);
  const legacy = { ...current, schema_version: 1, inventory_sha256: digest(inventoryBytes), verdict_objects: [] };
  delete legacy.verdict_index;
  await writeFile(path, bytes(legacy));
  const before = await snapshot(f.root);
  assert.equal((await review.getProductReviewStatus(args)).result.inventory_contract, "atomic-v1");
  assert.deepEqual(await snapshot(f.root), before);
  await recordItem(f, args.reviewRef, 0, args.context);
  const migrated = JSON.parse(await readFile(path, "utf8"));
  assert.equal(migrated.schema_version, 2);
  for (const key of ["id", "source_version", "inventory_sha256"]) assert.equal(migrated[key], legacy[key]);
  assert.equal(migrated.verdict_index.length, 1);
  assert.equal((await review.getProductReviewStatus(args)).result.inventory_contract, "atomic-v1");
  const retained = migrated.verdict_index[0];
  const withRetainedLegacyVerdict = { ...migrated, schema_version: 1,
    verdict_objects: [{ id: retained.id, object_sha256: retained.object_sha256 }] };
  delete withRetainedLegacyVerdict.verdict_index;
  await writeFile(path, bytes(withRetainedLegacyVerdict));
  const retainedBytes = await readFile(join(f.root, "products", f.productId, "objects", `${retained.object_sha256}.yaml`));
  await recordItem(f, args.reviewRef, 1, args.context);
  const remigrated = JSON.parse(await readFile(path, "utf8"));
  assert.equal(remigrated.schema_version, 2);
  assert.equal(remigrated.verdict_index.length, 2);
  assert.deepEqual(remigrated.verdict_index.find((entry) => entry.item_key === retained.item_key), retained);
  assert.deepEqual(await readFile(join(f.root, "products", f.productId, "objects", `${retained.object_sha256}.yaml`)), retainedBytes);
});

test("batch bounds reject duplicate keys, over-count and oversized UTF-8 input without state writes", async (t) => {
  const f = await fixture(t, "prd");
  const started = await review.startProductReview({ ...f, candidateRef: f.candidateRef, mode: "full" });
  const args = { root: f.root, context: started.context, reviewRef: started.result.review_ref };
  const one = (await review.readProductReviewItem({ ...args, itemIndex: 0 })).result;
  const value = valueFor(one);
  const before = await snapshot(f.root);
  await assert.rejects(review.recordProductVerdictBatch({ ...args, items: [value, value] }), expectCode("INVALID_INPUT"));
  await assert.rejects(review.recordProductVerdictBatch({ ...args, items: Array(21).fill(value) }), expectCode("INVALID_INPUT"));
  await assert.rejects(review.recordProductVerdictBatch({ ...args, items: [{ ...value, explanation: "😀".repeat(40_000) }] }), expectCode("SOURCE_LIMIT"));
  await assert.rejects(review.readProductReviewBatch({ ...args, startIndex: 0, limit: 21 }), expectCode("INVALID_INPUT"));
  assert.deepEqual(await snapshot(f.root), before);
});

test("independent stdio clients observe without writes, replay a lost response and audit corruption after restart", async (t) => {
  const f = await fixture(t, "prd", { elements: 4 });
  const started = await review.startProductReview({ ...f, candidateRef: f.candidateRef, mode: "full" });
  const input = { context: started.context, review_ref: started.result.review_ref };
  const connect = async ({ entrypoint, name }) => {
    const client = new Client({ name, version: "1" });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [entrypoint], stderr: "pipe",
      env: Object.fromEntries(Object.entries({ ...process.env, EAW_PRODUCT_DATA_DIR: f.root }).filter(([, value]) => typeof value === "string")) }));
    return client;
  };
  const entrypoint = fileURLToPath(new URL("../dist/main.js", import.meta.url));
  const writer = createSharedStdioHarness({ entrypoint, name: "review-writer", createClient: connect });
  const observer = createSharedStdioHarness({ entrypoint, name: "review-observer", createClient: connect });
  const call = async (client, name, args) => {
    const response = await client.callTool({ name, arguments: args });
    return response.structuredContent ?? JSON.parse(response.content.find((entry) => entry.type === "text").text);
  };
  try {
    const page = await call(writer, "product_review_get_batch", { ...input, start_index: 0 });
    const items = page.result.items.map(({ portion }) => valueFor(portion));
    const batch = { ...input, items };
    const first = await call(writer, "product_review_record_batch", batch);
    assert.equal(first.result.applied, true);
    const saved = await snapshot(f.root);
    const status = await call(observer, "product_review_status", input);
    assert.equal(status.result.recorded_items, items.length);
    assert.deepEqual(await snapshot(f.root), saved);
    await writer.restart();
    const replay = await call(writer, "product_review_record_batch", batch);
    assert.equal(replay.replayed, true);
    assert.equal(replay.operation_ref, first.operation_ref);
    assert.deepEqual(await snapshot(f.root), saved);
    const staleWriter = await call(observer, "product_review_record_batch", { ...input,
      items: [{ ...items[0], explanation: "Competing judgment from another reviewer." }] });
    assert.equal(staleWriter.error.code, "CONFLICT");
    assert.deepEqual(await snapshot(f.root), saved);
    const path = join(f.root, "products", f.productId, "drafts", f.candidateId, "reviews", `${input.review_ref}.yaml`);
    const state = JSON.parse(await readFile(path, "utf8"));
    await writeFile(join(f.root, "products", f.productId, "objects", `${state.verdict_index[0].object_sha256}.yaml`), "corrupt");
    await observer.restart();
    const corrupt = await call(observer, "product_review_status", input);
    assert.equal(corrupt.error.code, "SOURCE_CHANGED");
  } finally { await writer.close(); await observer.close(); }
});
