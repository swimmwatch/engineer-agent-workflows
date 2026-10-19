import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { URL } from "node:url";
import { inspectOperation, resumeOperation } from "../dist/product/operations.js";
import * as review from "../dist/product/review.js";
import { saveObject } from "../dist/product/storage.js";
import { fixture, bytes, digest, recordItem, snapshot } from "../test-support/product-review-fixture.mjs";

const execute = promisify(execFile);
const canonical = (value) => Array.isArray(value) ? `[${value.map(canonical).join(",")}]`
  : value !== null && typeof value === "object"
    ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`
    : JSON.stringify(value);
const encoded = (value) => Buffer.from(`${canonical(value)}\n`);
const uuid = (seed) => {
  const value = digest(seed).slice(0, 32);
  const variant = ((Number.parseInt(value[16], 16) & 3) | 8).toString(16);
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-5${value.slice(13, 16)}-${variant}${value.slice(17, 20)}-${value.slice(20)}`;
};

test("review mutation rechecks used sources after acquiring the product lock", async (t) => {
  const f = await fixture(t, "prd");
  const start = await review.startProductReview({ ...f, candidateRef: f.candidateRef, mode: "full" });
  const args = { root: f.root, context: start.context, reviewRef: start.result.review_ref };
  const part = (await review.readProductReviewItem({ ...args, itemIndex: 0 })).result;
  const value = { item_key: part.item_key, verdict: "covered", explanation: "Synthetic judgment.", counterexample: null,
    evidence_refs: [], evidence_sources: [], read_receipt: part.read_receipt, inherited_from: null };
  const path = join(f.root, "products", f.productId, "drafts", f.candidateId, "reviews", `${args.reviewRef}.yaml`);
  const before = await readFile(path);
  const document = f.registry.documents.find((entry) => entry.artifact === "prd");
  const sourcePath = join(f.root, "products", f.productId, "objects", `${document.object_sha256}.md`);
  const worker = `
    import fs from "node:fs/promises";
    import { syncBuiltinESMExports } from "node:module";
    const input = JSON.parse(process.argv[1]);
    const rename = fs.rename;
    fs.rename = async (from, to) => {
      await rename(from, to);
      if (String(to).replaceAll("\\\\", "/").includes("/operations/") && JSON.parse(await fs.readFile(to, "utf8")).phase === "prepared") {
        await fs.writeFile(input.sourcePath, "corrupt after preflight");
      }
    };
    syncBuiltinESMExports();
    const { recordProductVerdictBatch } = await import(${JSON.stringify(new URL("../dist/product/review.js", import.meta.url).href)});
    try { await recordProductVerdictBatch(input.args); console.log("APPLIED"); }
    catch (error) { console.log(error.code); }
  `;
  const output = await execute(process.execPath, ["--input-type=module", "--eval", worker,
    JSON.stringify({ sourcePath, args: { ...args, items: [value] } })]);
  assert.equal(output.stdout.trim(), "RECOVERY_REQUIRED");
  assert.deepEqual(await readFile(path), before);
});

test("interrupted real review batches migrate retained legacy verdicts atomically and support operator recovery", async (t) => {
  for (const phase of ["prepared", "objects_saved", "review_written", "local_binding_saved", "head_written", "published", "complete"]) {
    await t.test(phase, async (t) => {
      const f = await fixture(t, "prd", { elements: 3 });
      const started = await review.startProductReview({ ...f, candidateRef: f.candidateRef, mode: "full" });
      const args = { root: f.root, context: started.context, reviewRef: started.result.review_ref };
      const relativePath = `products/${f.productId}/drafts/${f.candidateId}/reviews/${args.reviewRef}.yaml`;
      const path = join(f.root, relativePath);
      const current = JSON.parse(await readFile(path, "utf8"));
      const inventory = JSON.parse(await readFile(join(f.root, "products", f.productId, "objects", `${current.inventory_sha256}.yaml`), "utf8"));
      delete inventory.blocks;
      for (const atom of inventory.items) delete atom.sources;
      const inv = await saveObject(f.root, { productId: f.productId, kind: "record", bytes: bytes(inventory) });
      const legacy = { ...current, schema_version: 1, inventory_sha256: inv.sha256, verdict_objects: [] };
      delete legacy.verdict_index;
      await writeFile(path, bytes(legacy));
      await recordItem(f, args.reviewRef, 0, args.context);
      const migrated = JSON.parse(await readFile(path, "utf8"));
      const retained = migrated.verdict_index[0];
      legacy.verdict_objects = [{ id: retained.id, object_sha256: retained.object_sha256 }];
      await writeFile(path, bytes(legacy));
      const before = await readFile(path);
      const page = await review.readProductReviewBatch({ ...args, startIndex: 1, limit: 2 });
      const items = page.result.items.map(({ portion }) => ({ item_key: portion.item_key,
        verdict: "covered", explanation: "Independent synthetic evidence.", counterexample: null,
        evidence_refs: [], evidence_sources: [], read_receipt: portion.read_receipt, inherited_from: null }));
      const scenario = "product_review_record_batch";
      const scenarioInput = { review_ref: args.reviewRef, items };
      const operationId = uuid(`${scenario}:${f.candidate.source_version}:${canonical(scenarioInput)}`);
      const entries = [retained, ...items.map((value) => {
        const body = encoded(value);
        return { item_key: value.item_key, verdict: value.verdict, bytes: body.byteLength,
          object_sha256: digest(body), id: uuid(`${f.productId}:${value.item_key}:${digest(body)}`) };
      })].sort((a, b) => a.item_key.localeCompare(b.item_key));
      const next = { ...legacy, schema_version: 2, verdict_index: entries };
      delete next.verdict_objects;
      const after = encoded(next);
      const operationPath = join(f.root, "products", f.productId, "operations", `${operationId}.yaml`);
      const headPath = join(f.root, "products", f.productId, "head.yaml");
      const worker = `
        import fs from "node:fs/promises";
        import { syncBuiltinESMExports } from "node:module";
        const input = JSON.parse(process.argv[1]);
        const rename = fs.rename;
        fs.rename = async (from, to) => {
          await rename(from, to);
          if ((input.phase === "review_written" && to === input.path)
            || (input.phase === "head_written" && to === input.headPath)
            || (to === input.operationPath && JSON.parse(await fs.readFile(to, "utf8")).phase === input.phase)) process.exit(86);
        };
        syncBuiltinESMExports();
        const { recordProductVerdictBatch } = await import(${JSON.stringify(new URL("../dist/product/review.js", import.meta.url).href)});
        await recordProductVerdictBatch(input.args);
      `;
      await assert.rejects(execute(process.execPath, ["--input-type=module", "--eval", worker,
        JSON.stringify({ phase, path, headPath, operationPath, args: { ...args, items } })]), (error) => error.code === 86);
      const actual = await readFile(path);
      assert.ok(actual.equals(before) || actual.equals(after), "Review is entirely legacy or entirely indexed, never partial.");
      const state = await inspectOperation(f.root, f.productId, operationId);
      const result = { operation_ref: operationId, applied: true, candidate_ref: f.candidateRef,
        changed_refs: [], decision_ref: null, question_ref: null, product_id: f.productId,
        workspace_id: f.workspaceId, task_id: null, specification_id: null, review_ref: args.reviewRef,
        next: "Continue with the next unrecorded semantic block.", document_id: null };
      const verify = async () => assert.deepEqual(await readFile(path), after);
      await resumeOperation({ root: f.root, productId: f.productId, operationId, sessionId: randomUUID(),
        scenario, expectedRevision: f.candidate.base_generation, nextRevision: f.candidate.base_generation,
        intent: { schema_version: 1, kind: "operation_intent", scenario, input: scenarioInput }, result,
        targets: [{ root: "store", binding_id: null, relative_path: relativePath, before: digest(before), after: digest(after) }],
        saveObjects: async () => { for (const value of items) await saveObject(f.root, { productId: f.productId, kind: "record", bytes: encoded(value) }); },
        saveLocalBinding: async () => {
          const existing = await readFile(path);
          assert.ok(existing.equals(before) || existing.equals(after));
          await writeFile(path, after);
        }, verifyTargets: verify,
      }, state.inspectionToken);
      await verify();
      assert.equal((await inspectOperation(f.root, f.productId, operationId)).phase, "complete");
      const saved = await snapshot(f.root);
      assert.equal((await review.recordProductVerdictBatch({ ...args, items })).replayed, true);
      assert.deepEqual(await snapshot(f.root), saved);
      assert.equal((await review.getProductReviewStatus(args)).result.recorded_items, entries.length);
      assert.deepEqual(JSON.parse(await readFile(path, "utf8")).verdict_index.find((entry) => entry.item_key === retained.item_key), retained);
    });
  }
});
