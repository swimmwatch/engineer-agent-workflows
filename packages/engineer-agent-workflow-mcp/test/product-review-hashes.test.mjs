import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { lstat, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath, URL } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { readProductReviewItem, readProductReviewBatch, readProductReviewConsistency, recordProductVerdict, recordProductReviewConsistency, startProductReview, getProductReviewStatus, completeProductReview } from "../dist/product/review.js";
import { saveObject } from "../dist/product/storage.js";
import { productCapabilities } from "../dist/product/bindings.js";
import { fixture, bytes, context, writeCandidate, candidateVersion, digest, replaceArtifactDocument, completeReview, expectCode } from "../test-support/product-review-fixture.mjs";

const canonical = (value) => value === null || typeof value !== "object" ? JSON.stringify(value) : Array.isArray(value) ? `[${value.map(canonical).join(",")}]` : `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
async function snapshot(root, relative = "") {
  const current = join(root, relative);
  const info = await lstat(current);
  const entry = [relative, info.mode, info.mtimeMs, info.ctimeMs, info.isDirectory() ? null : digest(await readFile(current))];
  if (!info.isDirectory()) return [entry];
  const children = (await readdir(current)).sort();
  return [entry, ...(await Promise.all(children.map((name) => snapshot(root, join(relative, name))))).flat()];
}
async function full(f, reviewRef, itemIndex, representation, reader = readProductReviewItem) {
  const input = { root: f.root, context: f.context, reviewRef, ...(itemIndex === null ? {} : { itemIndex }), ...(representation ? { representation } : {}) };
  let page = await reader(input), text = page.result.text;
  while (page.result.next_cursor !== null) {
    page = await reader({ ...input, cursor: page.result.next_cursor });
    text += page.result.text;
  }
  return { ...page.result, text };
}
async function judge(f, reviewRef, index, explanation) {
  const part = await full(f, reviewRef, index, "explicit-v1");
  const value = { item_key: part.item_key, verdict: "covered", explanation, counterexample: null, evidence_refs: [], evidence_sources: [], read_receipt: part.read_receipt, inherited_from: null };
  const saved = await recordProductVerdict({ root: f.root, context: f.context, reviewRef, value });
  f.context = saved.context;
  return value;
}
test("explicit review hashes name actual source and canonical verdict domains while legacy stays exact", async (t) => {
  const f = await fixture(t, "idea");
  const started = await startProductReview({ root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "full" });
  const legacy = await full(f, started.result.review_ref, 0);
  const explicit = await full(f, started.result.review_ref, 0, "explicit-v1");
  assert.equal(explicit.representation, "explicit-v1", "opt-in reader must return the requested explicit representation");
  const source = JSON.parse(explicit.text);
  assert.equal(source.source_content.source_content_sha256, digest(legacy.text));
  assert.equal(source.source_content.text, legacy.text);
  assert.equal(source.source_content.domain, "review-item-text-utf8");
  assert.equal(source.source_version.source_version_sha256, started.result.source_version);
  assert.equal(explicit.verdict_object_sha256, null);
  const value = await judge(f, started.result.review_ref, 0, "First independent verdict.");
  const after = await full(f, started.result.review_ref, 0, "explicit-v1");
  assert.equal(after.text, explicit.text, "source projection cannot incorporate a newly saved verdict");
  assert.equal(after.verdict_object_sha256, digest(`${canonical(value)}\n`));
  assert.equal(after.object_sha256, after.verdict_object_sha256);
  assert.equal(after.verdict_digest_domain, "canonical-verdict-json-utf8-newline");
  assert.deepEqual(Object.keys(await full(f, started.result.review_ref, 0)).sort(), Object.keys(legacy).sort());
  const withoutVersion = { ...f.candidate, candidate_id: randomUUID() }; delete withoutVersion.source_version;
  f.candidate = { ...withoutVersion, source_version: candidateVersion(withoutVersion) };
  f.candidateRef = { product_id: f.productId, candidate_id: f.candidate.candidate_id };
  await writeCandidate(f, f.candidate); f.context = context(f, f.candidate);
  const second = await startProductReview({ root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "full" });
  await judge(f, second.result.review_ref, 0, "Another fresh independent verdict.");
  const fresh = await full(f, second.result.review_ref, 0, "explicit-v1");
  assert.equal(JSON.parse(fresh.text).source_content.source_content_sha256, source.source_content.source_content_sha256);
  assert.notEqual(fresh.verdict_object_sha256, after.verdict_object_sha256);
});

test("explicit source objects identify retained immutable bytes and stale coverage rejects domain substitution", async (t) => {
  const f = await fixture(t, "idea");
  const started = await startProductReview({ root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "full" });
  let index = 0, part, source;
  for (; index < started.result.total_items; index++) {
    part = await full(f, started.result.review_ref, index, "explicit-v1"); source = JSON.parse(part.text);
    if (source.source_objects.length) break;
  }
  assert.ok(source.source_objects.length);
  const object = source.source_objects.find((entry) => entry.identity.kind === "markdown");
  assert.equal(object.source_object_sha256, digest(f.documentBytes.get("idea")));
  assert.equal(object.domain, "immutable-object-bytes");
  assert.equal(object.identity.product_id, f.productId);
  const value = await judge(f, started.result.review_ref, index, "Exact source evidence.");
  const recorded = await full(f, started.result.review_ref, index, "explicit-v1");
  const previousDigest = object.source_object_sha256;
  assert.equal(JSON.parse(recorded.text).source_objects.find((entry) => entry.identity.kind === "markdown").source_object_sha256, previousDigest, "saving a verdict cannot change an immutable source-object digest");
  await assert.rejects(recordProductVerdict({ root: f.root, context: f.context, reviewRef: started.result.review_ref, value: { ...value, evidence_sources: [{ ...f.pin("idea"), object_sha256: recorded.verdict_object_sha256 }] } }), expectCode("SOURCE_CHANGED"));
  await replaceArtifactDocument(f, "idea", f.documentBytes.get("idea").toString().replace("Current idea", "Updated idea"));
  assert.equal((await getProductReviewStatus({ root: f.root, context: f.context, reviewRef: started.result.review_ref })).result.coverage_status, "stale");
  const next = await startProductReview({ root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "full" });
  const changed = JSON.parse((await full(f, next.result.review_ref, index, "explicit-v1")).text);
  assert.notEqual(changed.source_objects[0].source_object_sha256, previousDigest);
});

test("consistency explicit domains, complete receipts and retained reads cause no migration writes", async (t) => {
  const f = await fixture(t, "idea", { elements: 4 });
  const started = await startProductReview({ root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "full" });
  for (let index = 0; index < started.result.total_items; index++) await judge(f, started.result.review_ref, index, `Evidence ${index}.`);
  const legacy = await full(f, started.result.review_ref, null, undefined, readProductReviewConsistency);
  const explicit = await full(f, started.result.review_ref, null, "explicit-v1", readProductReviewConsistency);
  const old = JSON.parse(legacy.text.slice(legacy.text.indexOf("\n{") + 1)), current = JSON.parse(explicit.text);
  for (const result of current.results) {
    assert.equal(result.verdict_object_sha256, old.results.find((entry) => entry.item_key === result.item_key).object_sha256);
    assert.equal(result.object_sha256, result.verdict_object_sha256);
    assert.ok(result.source_evidence.source_content.source_content_sha256);
  }
  await recordProductReviewConsistency({ root: f.root, context: f.context, reviewRef: started.result.review_ref, readReceipt: explicit.read_receipt, verdict: "covered", explanation: "Current consistency.", counterexample: null });
  await completeProductReview({ root: f.root, context: f.context, reviewRef: started.result.review_ref });
  const before = await snapshot(f.root);
  await full(f, started.result.review_ref, 0);
  await full(f, started.result.review_ref, 0, "explicit-v1");
  await full(f, started.result.review_ref, null, "explicit-v1", readProductReviewConsistency);
  await getProductReviewStatus({ root: f.root, context: f.context, reviewRef: started.result.review_ref });
  assert.deepEqual(await snapshot(f.root), before, "all retained read paths must preserve bytes and file/directory metadata");
});

test("public stdio gates representation through capabilities and strict schemas without changing old consumers", { timeout: 20000 }, async (t) => {
  const f = await fixture(t, "idea");
  const started = await startProductReview({ root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "full" });
  const transport = new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL("../dist/main.js", import.meta.url))], env: { ...process.env, EAW_PRODUCT_DATA_DIR: f.root }, stderr: "pipe" });
  const client = new Client({ name: "review-hash-contract", version: "1.0.0" });
  t.after(() => client.close()); await client.connect(transport);
  const definitions = (await client.listTools()).tools;
  const input = { context: f.context, review_ref: started.result.review_ref, item_index: 0 };
  const legacy = await client.callTool({ name: "product_review_get", arguments: input });
  assert.notEqual(legacy.isError, true);
  assert.equal(legacy.structuredContent.result.representation, undefined);
  const explicit = await client.callTool({ name: "product_review_get", arguments: { ...input, representation: "explicit-v1" } });
  assert.notEqual(explicit.isError, true, JSON.stringify(explicit));
  assert.equal(explicit.structuredContent.result.representation, "explicit-v1");
  for (const name of ["product_review_get", "product_review_get_batch", "product_review_consistency_get"]) assert.deepEqual(definitions.find((entry) => entry.name === name).inputSchema.properties.representation.enum, ["explicit-v1"]);
  const capabilities = await client.callTool({ name: "product_capabilities", arguments: { representation: "explicit-v1" } });
  assert.deepEqual(capabilities.structuredContent.result.review_representations, ["explicit-v1"]);
  assert.equal((await productCapabilities({ root: f.root })).result.review_representations, undefined);
  const unsupported = await client.callTool({ name: "product_review_get", arguments: { ...input, representation: "explicit-v2" } });
  assert.equal(unsupported.isError, true);
  assert.equal(unsupported.structuredContent.error.code, "INVALID_INPUT");
});


test("old atomic review records remain readable without rewriting retained objects", async (t) => {
  const f = await fixture(t, "idea");
  const started = await startProductReview({ root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "full" });
  const path = join(f.root, "products", f.productId, "drafts", f.candidateId, "reviews", `${started.result.review_ref}.yaml`);
  const current = JSON.parse(await readFile(path, "utf8"));
  const inventory = JSON.parse(await readFile(join(f.root, "products", f.productId, "objects", `${current.inventory_sha256}.yaml`), "utf8"));
  delete inventory.blocks;
  for (const atom of inventory.items) delete atom.sources;
  const saved = await saveObject(f.root, { productId: f.productId, kind: "record", bytes: bytes(inventory) });
  const old = { ...current, schema_version: 1, inventory_sha256: saved.sha256, verdict_objects: [] }; delete old.verdict_index;
  await writeFile(path, bytes(old));
  const legacy = await full(f, started.result.review_ref, 0);
  const value = { item_key: legacy.item_key, verdict: "covered", explanation: "Pre-explicit retained verdict.", counterexample: null, evidence_refs: [], evidence_sources: [], read_receipt: legacy.read_receipt, inherited_from: null };
  await recordProductVerdict({ root: f.root, context: f.context, reviewRef: started.result.review_ref, value });
  const indexed = JSON.parse(await readFile(path, "utf8"));
  old.verdict_objects = indexed.verdict_index.map(({ id, object_sha256 }) => ({ id, object_sha256 }));
  await writeFile(path, bytes(old));
  const before = await snapshot(f.root);
  const explicit = await full(f, started.result.review_ref, 0, "explicit-v1");
  assert.equal(explicit.verdict_object_sha256, digest(`${canonical(value)}\n`));
  assert.equal(JSON.parse(explicit.text).source_content.source_content_sha256, digest(legacy.text));
  assert.equal((await getProductReviewStatus({ root: f.root, context: f.context, reviewRef: started.result.review_ref })).result.inventory_contract, "atomic-v1");
  assert.deepEqual(await snapshot(f.root), before);
});

test("large explicit evidence is losslessly paginated and representation-bound cursors cannot cross domains", async (t) => {
  const f = await fixture(t, "prd");
  await replaceArtifactDocument(f, "prd", f.documentBytes.get("prd").toString().replace("Current prd behavior", `Unicode ${"🧪漢字".repeat(4500)} prd behavior`));
  const started = await startProductReview({ root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "full" });
  let index = 0, first;
  for (; index < started.result.total_items; index++) {
    first = await readProductReviewItem({ root: f.root, context: f.context, reviewRef: started.result.review_ref, itemIndex: index, representation: "explicit-v1" });
    if (first.result.next_cursor !== null) break;
  }
  assert.ok(first.result.next_cursor);
  assert.equal(first.result.read_receipt, null);
  const replay = JSON.parse(Buffer.from(first.result.next_cursor, "base64url").toString("utf8"));
  replay.offset = 0; replay.prefix_sha256 = digest("");
  const { checksum: ignoredChecksum, ...body } = replay;
  assert.ok(ignoredChecksum);
  replay.checksum = digest(canonical(body)).slice(0, 16);
  const emptyPrefix = Buffer.from(JSON.stringify(replay)).toString("base64url");
  await assert.rejects(readProductReviewItem({ root: f.root, context: f.context, reviewRef: started.result.review_ref, itemIndex: index, cursor: emptyPrefix }), expectCode("STALE_CURSOR"));
  await assert.rejects(readProductReviewItem({ root: f.root, context: f.context, reviewRef: started.result.review_ref, itemIndex: index, cursor: first.result.next_cursor }), expectCode("STALE_CURSOR"));
  const complete = await full(f, started.result.review_ref, index, "explicit-v1");
  const original = await full(f, started.result.review_ref, index);
  assert.equal(JSON.parse(complete.text).source_content.text, original.text);
  assert.equal(JSON.parse(complete.text).source_content.source_content_sha256, digest(original.text));
  const batch = await readProductReviewBatch({ root: f.root, context: f.context, reviewRef: started.result.review_ref, startIndex: index, representation: "explicit-v1" });
  assert.equal(batch.result.items[0].portion.representation, "explicit-v1");
  assert.ok(Buffer.byteLength(JSON.stringify({ protocol_version: 2, context: batch.context, result: batch.result, replayed: false, operation_ref: null })) <= 24 * 1024);
  assert.equal(batch.result.items[0].portion.next_cursor, first.result.next_cursor);
});


test("explicit followup consistency reads whole current source and preserves inherited evidence digests", async (t) => {
  const f = await fixture(t, "prd");
  const initial = await completeReview(f, f.context, { gapText: "Current prd behavior" });
  await replaceArtifactDocument(f, "prd", f.documentBytes.get("prd").toString().replace("Current prd behavior", "Corrected prd behavior"));
  const followup = await startProductReview({ root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "followup", parentReviewRef: initial.reviewRef, fixes: [{ finding_key: initial.gapKey, changed_refs: [f.refs.prd], explanation: "The current PRD contains the correction." }] });
  await judge(f, followup.result.review_ref, followup.result.next_item_index, "Current corrected evidence.");
  const explicit = await full(f, followup.result.review_ref, null, "explicit-v1", readProductReviewConsistency);
  const legacy = await full(f, followup.result.review_ref, null, undefined, readProductReviewConsistency);
  const evidence = JSON.parse(explicit.text);
  assert.equal(evidence.representation, "explicit-v1");
  for (const source of evidence.sources) {
    assert.equal(source.source_content.source_content_sha256, digest(source.source_content.text));
    assert.ok(legacy.text.includes(source.source_content.text));
  }
  assert.ok(evidence.sources.some((source) => source.source_content.text.includes("Corrected prd behavior")));
  assert.ok(evidence.sources.flatMap((source) => source.source_pins).every((pin) => pin.domain === "immutable-object-bytes"));
  await recordProductReviewConsistency({ root: f.root, context: f.context, reviewRef: followup.result.review_ref, readReceipt: explicit.read_receipt, verdict: "covered", explanation: "Whole current PRD remains consistent.", counterexample: null });
  assert.equal((await completeProductReview({ root: f.root, context: f.context, reviewRef: followup.result.review_ref })).result.coverage_status, "reviewed");
});


test("public atomic explicit receipts remain historical after candidate drift and server restart", { timeout: 20000 }, async (t) => {
  const f = await fixture(t, "idea");
  const started = await startProductReview({ root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "full" });
  const reviewRef = started.result.review_ref;
  const path = join(f.root, "products", f.productId, "drafts", f.candidateId, "reviews", `${reviewRef}.yaml`);
  const current = JSON.parse(await readFile(path, "utf8"));
  const inventory = JSON.parse(await readFile(join(f.root, "products", f.productId, "objects", `${current.inventory_sha256}.yaml`), "utf8"));
  delete inventory.blocks;
  for (const atom of inventory.items) delete atom.sources;
  const saved = await saveObject(f.root, { productId: f.productId, kind: "record", bytes: bytes(inventory) });
  const old = { ...current, schema_version: 1, inventory_sha256: saved.sha256, verdict_objects: [] }; delete old.verdict_index;
  await writeFile(path, bytes(old));
  const index = inventory.items.findIndex((atom) => atom.item_key.startsWith("element:"));
  assert.ok(index >= 0);
  async function connect() {
    const transport = new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL("../dist/main.js", import.meta.url))], env: { ...process.env, EAW_PRODUCT_DATA_DIR: f.root }, stderr: "pipe" });
    const client = new Client({ name: "historical-explicit-receipt", version: "1.0.0" });
    await client.connect(transport); t.after(() => client.close());
    return client;
  }
  let client = await connect();
  async function call(name, args) {
    const reply = await client.callTool({ name, arguments: args });
    assert.notEqual(reply.isError, true, `${name} must accept retained historical evidence: ${JSON.stringify(reply)}`);
    return reply.structuredContent;
  }
  async function item() {
    const input = { context: f.context, review_ref: reviewRef, item_index: index, representation: "explicit-v1" };
    let page = await call("product_review_get", input), text = page.result.text;
    while (page.result.next_cursor !== null) {
      page = await call("product_review_get", { ...input, cursor: page.result.next_cursor }); text += page.result.text;
    }
    return { ...page.result, text };
  }
  const before = await item();
  await call("product_review_record", { context: f.context, review_ref: reviewRef, value: { item_key: before.item_key, verdict: "covered", explanation: "A complete retained atomic source was reviewed.", counterexample: null, evidence_refs: [], evidence_sources: [], read_receipt: before.read_receipt, inherited_from: null } });
  await replaceArtifactDocument(f, "idea", f.documentBytes.get("idea").toString().replace("Current idea", "Updated idea"));
  const beforeRead = await snapshot(f.root);
  assert.equal((await call("product_review_status", { context: f.context, review_ref: reviewRef })).result.coverage_status, "stale", "candidate drift cannot invalidate retained explicit receipt evidence");
  const after = await item();
  assert.equal(after.text, before.text, "historical projection must not depend on current candidate hydration");
  assert.equal(after.read_receipt, before.read_receipt);
  const evidence = JSON.parse(after.text);
  assert.deepEqual(evidence.source_objects, [], "missing retained legacy provenance cannot be fabricated from current inputs");
  assert.equal(evidence.source_objects_status, "unavailable-in-legacy-inventory");
  assert.equal(evidence.source_content.source_content_sha256, digest(inventory.items[index].text));
  assert.deepEqual(await snapshot(f.root), beforeRead, "stale historical reads perform no migration");
  await client.close(); client = await connect();
  assert.equal((await call("product_review_status", { context: f.context, review_ref: reviewRef })).result.coverage_status, "stale");
  assert.equal((await item()).text, before.text, "a fresh process reconstructs the same historical projection");
  assert.deepEqual(await snapshot(f.root), beforeRead);
});
