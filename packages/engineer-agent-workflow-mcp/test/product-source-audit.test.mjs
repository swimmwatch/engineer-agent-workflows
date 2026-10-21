import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { channel } from "node:diagnostics_channel";
import { randomUUID } from "node:crypto";

import * as storage from "../dist/product/storage.js";
import { parseProductDocument } from "../dist/product/documents.js";
import { fixture, expectCode, completeReview, replaceArtifactDocument, bytes, candidateVersion, context, writeCandidate } from "../test-support/product-review-fixture.mjs";
import { startProductReview } from "../dist/product/review.js";
import { runProductMutation } from "../dist/product/operations.js";
import { retireRoadmapTask } from "../dist/product/roadmap.js";

test("one audit loads and validates the same full generation once", async (t) => {
  const f = await fixture(t, "roadmap");
  let first;
  await storage.withProductObjectReads(async () => {
    first = await storage.loadGeneration(f.root, f.productId, f.generation.sha256);
    const repeated = await storage.loadGeneration(f.root, f.productId, f.generation.sha256);
    assert.strictEqual(repeated, first);
    const metadata = await storage.readGenerationMetadata(f.root, f.productId, f.generation.sha256);
    assert.strictEqual(metadata, first.generation);
  });
  const next = await storage.withProductObjectReads(() => storage.loadGeneration(f.root, f.productId, f.generation.sha256));
  assert.notStrictEqual(next, first, "A separate audit must validate sources again.");
});

test("a full generation reads independent immutable sources in bounded parallel groups", async (t) => {
  const f = await fixture(t, "roadmap");
  let active = 0, peak = 0;
  const audits = channel("engineer-agent-workflows.product.source-audit"), reads = channel("engineer-agent-workflows.product.source-validation");
  const started = (event) => { if (event.kind === "object" && !event.hit) peak = Math.max(peak, ++active); };
  const completed = () => { active--; };
  audits.subscribe(started); reads.subscribe(completed);
  try {
    await storage.loadGeneration(f.root, f.productId, f.generation.sha256);
    assert.ok(peak > 1, "Independent source reads must overlap instead of serializing filesystem latency.");
    assert.ok(peak <= 4, "Source read concurrency must remain bounded.");
    assert.equal(active, 0, "All reads must finish before the audit returns.");
  } finally { audits.unsubscribe(started); reads.unsubscribe(completed); }
});

test("parallel source errors preserve source order and wait for every current read", async (t) => {
  const f = await fixture(t, "roadmap");
  const path = (index) => join(f.root, "products", f.productId, "objects", `${f.registry.documents[index].object_sha256}.md`);
  await unlink(path(0)); await writeFile(path(1), "corrupt later source");
  let active = 0;
  const audits = channel("engineer-agent-workflows.product.source-audit"), reads = channel("engineer-agent-workflows.product.source-validation");
  const started = (event) => { if (event.kind === "object" && !event.hit) active++; };
  const completed = () => { active--; };
  audits.subscribe(started); reads.subscribe(completed);
  try {
    await assert.rejects(storage.loadGeneration(f.root, f.productId, f.generation.sha256), expectCode("MISSING_EVIDENCE"));
    assert.equal(active, 0, "No sibling read may outlive a failed audit.");
  } finally { audits.unsubscribe(started); reads.unsubscribe(completed); }
});

test("generation metadata reuse cannot satisfy a full source audit", async (t) => {
  const f = await fixture(t, "roadmap");
  await storage.withProductObjectReads(async () => {
    const metadata = await storage.readGenerationMetadata(f.root, f.productId, f.generation.sha256);
    assert.strictEqual(await storage.readGenerationMetadata(f.root, f.productId, f.generation.sha256), metadata);
    const document = f.registry.documents[0];
    await writeFile(join(f.root, "products", f.productId, "objects", `${document.object_sha256}.md`), "corrupt source");
    await assert.rejects(storage.loadGeneration(f.root, f.productId, f.generation.sha256), expectCode("SOURCE_CHANGED"));
  });
});

test("Markdown parsing is reused by exact bytes only within one audit", async () => {
  const value = Buffer.from("# Source\n\n### TASK-0001: First\n\nCurrent behavior.\n");
  let parsed;
  await storage.withProductObjectReads(async () => {
    parsed = parseProductDocument(value);
    assert.strictEqual(parseProductDocument(Buffer.from(value)), parsed);
    assert.notStrictEqual(parseProductDocument(Buffer.from(value.toString().replace("First", "Changed"))), parsed);
  });
  assert.notStrictEqual(parseProductDocument(value), parsed);
});

test("transaction entry cannot revive cached preflight bytes after writing", async (t) => {
  const f = await fixture(t, "idea");
  const saved = await storage.saveObject(f.root, { productId: f.productId, kind: "markdown", bytes: Buffer.from("# Before transaction\n") });
  await storage.withProductObjectReads(async () => {
    await storage.readObject(f.root, saved);
    await storage.withoutProductObjectReads(async () => {
      await writeFile(join(f.root, saved.relativePath), "corrupt after preflight");
      await assert.rejects(storage.withProductObjectReads(() => storage.readObject(f.root, saved)), expectCode("SOURCE_CHANGED"));
    });
    await assert.rejects(storage.readObject(f.root, saved), expectCode("SOURCE_CHANGED"));
  });
});

test("equal object references in different stores do not share verification", async (t) => {
  const first = await fixture(t, "idea"), second = await fixture(t, "idea");
  const input = { productId: first.productId, kind: "markdown", bytes: Buffer.from("# Same object in separate stores\n") };
  const saved = await storage.saveObject(first.root, input);
  await storage.saveObject(second.root, input);
  await writeFile(join(second.root, saved.relativePath), "corrupted second store");
  await storage.withProductObjectReads(async () => {
    await storage.readObject(first.root, saved);
    await assert.rejects(storage.readObject(second.root, saved), expectCode("SOURCE_CHANGED"));
  });
});

test("a locked mutation revalidates a source corrupted after preflight", async (t) => {
  const f = await fixture(t, "idea");
  const saved = await storage.saveObject(f.root, { productId: f.productId, kind: "markdown", bytes: Buffer.from("# Transaction evidence\n") });
  const operationId = randomUUID();
  const plan = {
    root: f.root, productId: f.productId, operationId, sessionId: randomUUID(), scenario: "product_artifact_draft",
    expectedRevision: f.generation.sha256, nextRevision: f.generation.sha256,
    intent: { schema_version: 1, kind: "operation_intent", scenario: "product_artifact_draft", input: { evidence: saved.sha256 } },
    result: { operation_ref: operationId, applied: true, candidate_ref: null, changed_refs: [], decision_ref: null, question_ref: null,
      product_id: f.productId, workspace_id: null, task_id: null, specification_id: null, review_ref: null, next: "Verify current evidence.", document_id: null },
    saveObjects: () => storage.withProductObjectReads(() => storage.readObject(f.root, saved)),
  };
  await storage.withProductObjectReads(async () => {
    await storage.readObject(f.root, saved);
    await writeFile(join(f.root, saved.relativePath), "changed after preflight");
    await assert.rejects(runProductMutation(plan), expectCode("RECOVERY_REQUIRED"));
  });
});

test("a shared document snapshot preserves the stricter Roadmap registry checks", async (t) => {
  const f = await fixture(t, "roadmap");
  const navigation = Buffer.from("# Navigation\n");
  const saved = await storage.saveObject(f.root, { productId: f.productId, kind: "markdown", bytes: navigation });
  const extra = { id: randomUUID(), artifact: "roadmap", role: ["navigation"], subject: "Navigation", relative_path: "roadmap/navigation.md", object_sha256: saved.sha256 };
  const registry = { ...f.registry, documents: [...f.registry.documents, extra] };
  for (const document of registry.documents) {
    const path = join(f.root, "products", f.productId, "drafts", f.candidateId, "documents", document.relative_path);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, document.id === extra.id ? navigation : f.documentBytes.get(document.artifact));
  }
  const object = await storage.saveObject(f.root, { productId: f.productId, kind: "record", bytes: bytes(registry) });
  const candidate = { ...f.candidate, registry: { ...f.candidate.registry, object_sha256: object.sha256 } };
  candidate.source_version = candidateVersion(candidate); await writeCandidate(f, candidate);
  await assert.rejects(retireRoadmapTask({ root: f.root, context: context(f, candidate), candidateRef: f.candidateRef,
    taskRef: f.refs.roadmap, redistributedTo: [], answerRef: { product_id: f.productId, artifact: "roadmap", id: randomUUID(), revision: 1 },
    reason: "Preserve exact Roadmap registry field types." }), expectCode("INVALID_STATE"));
});

test("a recheck audits each retained predecessor once per source audit", async (t) => {
  const f = await fixture(t, "roadmap", { elements: 3 });
  let parent = await completeReview(f, f.context);
  for (let index = 0; index < 2; index++) {
    await replaceArtifactDocument(f, "roadmap", f.documentBytes.get("roadmap").toString().replace("Introductory prose", `Revision ${index} introductory prose`));
    parent = await completeReview(f, f.context, { mode: "recheck", parentReviewRef: parent.reviewRef });
  }
  await replaceArtifactDocument(f, "roadmap", f.documentBytes.get("roadmap").toString().replace("Current roadmap behavior", "Revised current roadmap behavior"));
  const events = [], metrics = channel("engineer-agent-workflows.product.source-audit");
  const collect = (event) => events.push(event); metrics.subscribe(collect);
  t.after(() => metrics.unsubscribe(collect));
  await startProductReview({ root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "recheck", parentReviewRef: parent.reviewRef });
  const audits = events.filter((event) => event.kind === "review-audit" && !event.hit);
  assert.ok(audits.length > 0, "Predecessor audits must be measured.");
  assert.equal(new Set(audits.map((event) => `${event.audit_id}:${event.key}`)).size, audits.length);
  for (const id of new Set(audits.map((event) => event.audit_id))) {
    assert.ok(audits.filter((event) => event.audit_id === id).length <= 3, "History work must follow unique predecessors, not recursive call count.");
  }
});
