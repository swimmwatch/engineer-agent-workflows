import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  completeProductReview,
  getProductReviewStatus,
  readProductReviewConsistency,
  readProductReviewItem,
  recordProductReviewConsistency,
  recordProductVerdict,
  startProductReview,
} from "../dist/product/review.js";
import { saveGeneration, saveObject } from "../dist/product/storage.js";

const digest = (value) => createHash("sha256").update(value).digest("hex");
const bytes = (value) => Buffer.from(`${JSON.stringify(value)}\n`);

function expectCode(code) {
  return (error) => {
    assert.equal(error?.code, code);
    assert.doesNotMatch(error?.message ?? "", /\/tmp\/|\\Users\\|EAW_PRODUCT_DATA_DIR/u);
    return true;
  };
}

function candidateVersion(candidate) {
  return digest(bytes(Object.fromEntries(Object.entries(candidate).filter(([key]) => key !== "source_version"))));
}

function context(f, candidate) {
  return Buffer.from(JSON.stringify({
    contract: "product-1",
    store_id: f.storeId,
    product_id: f.productId,
    workspace_id: candidate.workspace_id,
    candidate_ref: { product_id: f.productId, candidate_id: candidate.candidate_id },
    selected_sources_sha256: candidate.source_version,
    target_revision: candidate.base_generation,
    canonical_workspace: f.workspace,
  })).toString("base64url");
}

async function snapshot(root, relative = "") {
  const entries = await readdir(join(root, relative), { withFileTypes: true }).catch((error) => {
    if (error?.code === "ENOENT") return [];
    throw error;
  });
  const result = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...await snapshot(root, child));
    else result.push([child, digest(await readFile(join(root, child)))]);
  }
  return result;
}

const artifactOrder = ["idea", "prd", "technical-design", "roadmap"];
const elementIds = {
  idea: "IDEA-0001",
  prd: "PRD-0001",
  "technical-design": "TD-0001",
  roadmap: "TASK-0001",
};
const semanticTypes = {
  idea: "IdeaProblem",
  prd: "PrdGoal",
  "technical-design": "TechnicalBoundary",
  roadmap: "Task",
};

async function fixture(t, artifact, { elements = 1, upstreamElements = {} } = {}) {
  const base = await mkdtemp(join(tmpdir(), "eaw-product-review-"));
  t.after(() => rm(base, { recursive: true, force: true }));
  const f = {
    root: join(base, "product-data"),
    workspace: join(base, "workspace"),
    productId: randomUUID(),
    workspaceId: randomUUID(),
    candidateId: randomUUID(),
    storeId: randomUUID(),
    registryId: randomUUID(),
  };
  await mkdir(f.root, { recursive: true });
  await mkdir(f.workspace, { recursive: true });
  f.refs = Object.fromEntries(artifactOrder.map((kind) => [kind, {
    product_id: f.productId, artifact: kind, element_id: elementIds[kind],
  }]));

  const documents = [];
  const documentBytes = new Map();
  for (const kind of artifactOrder) {
    const source = `# ${kind}\n\nIntroductory prose for ${kind}.\n\n` + Array.from({ length: kind === artifact ? elements : upstreamElements[kind] ?? 1 }, (_, index) =>
      `### ${elementIds[kind].replace(/0001$/u, String(index + 1).padStart(4, "0"))}: ${kind} result\n\n#### Outcome\n\nCurrent ${kind} behavior${index === 0 ? "" : ` ${index + 1}`} is explicit.\n`).join("\n");
    const saved = await saveObject(f.root, { productId: f.productId, kind: "markdown", bytes: Buffer.from(source) });
    const document = {
      id: randomUUID(), artifact: kind, role: "semantic", subject: `${kind} overview`,
      relative_path: `${kind}/overview.md`, object_sha256: saved.sha256,
    };
    documents.push(document);
    documentBytes.set(kind, Buffer.from(source));
  }
  const applicability = { state: "current", stage_refs: [], global: false, reason: "Synthetic review fixture." };
  const registry = {
    schema_version: 1,
    kind: "registry",
    product_id: f.productId,
    documents,
    element_metadata: artifactOrder.flatMap((kind) => Array.from({ length: kind === artifact ? elements : upstreamElements[kind] ?? 1 }, (_, index) => ({
      ref: { ...f.refs[kind], element_id: elementIds[kind].replace(/0001$/u, String(index + 1).padStart(4, "0")) },
      semantic_type: semanticTypes[kind], applicability: { ...applicability, global: kind !== artifact && (upstreamElements[kind] ?? 1) > 1 }, provenance: [], state: "active",
    }))),
  };
  const registryObject = await saveObject(f.root, { productId: f.productId, kind: "record", bytes: bytes(registry) });
  f.registry = registry;
  f.registryObject = registryObject;
  f.documentBytes = documentBytes;

  const pin = (kind, generation) => {
    const document = documents.find((entry) => entry.artifact === kind);
    return {
      product_id: f.productId,
      artifact: kind,
      source_kind: "markdown",
      source_id: document.id,
      generation,
      object_sha256: document.object_sha256,
      element_ids: registry.element_metadata.filter((entry) => entry.ref.artifact === kind).map((entry) => entry.ref.element_id),
      decision_ref: null,
    };
  };
  const baseGeneration = await saveGeneration(f.root, {
    schema_version: 1,
    kind: "generation",
    product_id: f.productId,
    parent: null,
    registry: { id: f.registryId, object_sha256: registryObject.sha256 },
    ready_artifacts: [],
    decision_heads: [],
    relations: [],
  });
  const prerequisites = artifactOrder.slice(0, artifactOrder.indexOf(artifact));
  const generation = prerequisites.length === 0 ? baseGeneration : await saveGeneration(f.root, {
    schema_version: 1,
    kind: "generation",
    product_id: f.productId,
    parent: baseGeneration.sha256,
    registry: { id: f.registryId, object_sha256: registryObject.sha256 },
    ready_artifacts: prerequisites.map((kind) => ({
      artifact: kind,
      source_version: digest(`ready-${kind}`),
      review_id: randomUUID(),
      upstream_pins: artifactOrder.slice(0, artifactOrder.indexOf(kind)).map((parent) => pin(parent, baseGeneration.sha256)),
    })),
    decision_heads: [],
    relations: [],
  });
  f.pin = (kind) => pin(kind, generation.sha256);
  f.generation = generation;

  const candidateWithoutVersion = {
    schema_version: 1,
    kind: "candidate",
    product_id: f.productId,
    candidate_id: f.candidateId,
    artifact,
    base_generation: generation.sha256,
    workspace_id: f.workspaceId,
    state: "draft",
    scope: {
      depth: "standard",
      profiles: [{ id: "core", reason: "Independent review evidence." }],
      rationale: ["Synthetic Q24-Q26 fixture."],
      confirmed_answer: null,
    },
    registry: { id: f.registryId, object_sha256: registryObject.sha256 },
    upstream_pins: prerequisites.map((kind) => f.pin(kind)),
    decision_heads: [],
    relations: [],
  };
  f.candidate = { ...candidateWithoutVersion, source_version: candidateVersion(candidateWithoutVersion) };
  await writeCandidate(f, f.candidate);
  await mkdir(join(f.root, "products", f.productId), { recursive: true });
  await writeFile(join(f.root, "products", f.productId, "head.yaml"), bytes({
    schema_version: 1,
    kind: "head",
    product_id: f.productId,
    generation: generation.sha256,
    operation_id: randomUUID(),
  }));
  f.context = context(f, f.candidate);
  f.candidateRef = { product_id: f.productId, candidate_id: f.candidateId };
  return f;
}

async function writeCandidate(f, candidate) {
  const directory = join(f.root, "products", f.productId, "drafts", candidate.candidate_id);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "candidate.yaml"), bytes(candidate));
}

async function replaceArtifactDocument(f, artifact, source) {
  const currentDocument = f.registry.documents.find((entry) => entry.artifact === artifact);
  assert.ok(currentDocument);
  const savedDocument = await saveObject(f.root, {
    productId: f.productId,
    kind: "markdown",
    bytes: Buffer.from(source),
  });
  const nextRegistry = {
    ...f.registry,
    documents: f.registry.documents.map((entry) => (
      entry.id === currentDocument.id ? { ...entry, object_sha256: savedDocument.sha256 } : entry
    )),
  };
  const savedRegistry = await saveObject(f.root, {
    productId: f.productId,
    kind: "record",
    bytes: bytes(nextRegistry),
  });
  const amendedWithoutVersion = {
    ...f.candidate,
    registry: { id: f.registryId, object_sha256: savedRegistry.sha256 },
  };
  delete amendedWithoutVersion.source_version;
  const amended = { ...amendedWithoutVersion, source_version: candidateVersion(amendedWithoutVersion) };
  await writeCandidate(f, amended);
  f.candidate = amended;
  f.registry = nextRegistry;
  f.registryObject = savedRegistry;
  f.documentBytes.set(artifact, Buffer.from(source));
  f.context = context(f, amended);
}

async function readItemFully(f, reviewRef, itemIndex, contextValue) {
  let page = await readProductReviewItem({
    root: f.root, context: contextValue, reviewRef, itemIndex,
  });
  let text = page.result.text;
  while (page.result.next_cursor !== null) {
    page = await readProductReviewItem({
      root: f.root, context: contextValue, reviewRef, itemIndex, cursor: page.result.next_cursor,
    });
    text += page.result.text;
  }
  return { ...page.result, text };
}

async function recordItem(f, reviewRef, itemIndex, contextValue, verdict = "covered") {
  const item = await readItemFully(f, reviewRef, itemIndex, contextValue);
  const recorded = await recordProductVerdict({
    root: f.root,
    context: contextValue,
    reviewRef,
    value: {
      item_key: item.item_key,
      verdict,
      explanation: verdict === "covered" ? "Synthetic evidence covers this item." : "Synthetic correction is required.",
      counterexample: verdict === "covered" ? null : "The previous source does not satisfy the stated outcome.",
      evidence_refs: [],
      evidence_sources: [],
      read_receipt: item.read_receipt,
      inherited_from: null,
    },
  });
  return { item, context: recorded.context };
}

async function completeReview(f, contextValue, { gapText, mode = "full", parentReviewRef, parentCandidateRef } = {}) {
  const started = await startProductReview({
    root: f.root, context: contextValue, candidateRef: f.candidateRef, mode,
    ...(parentReviewRef === undefined ? {} : { parentReviewRef }),
    ...(parentCandidateRef === undefined ? {} : { parentCandidateRef }),
  });
  let currentContext = started.context;
  let status = started.result;
  let gapKey = null;
  while (status.next_item_index !== null) {
    const item = await readItemFully(f, status.review_ref, status.next_item_index, currentContext);
    const verdict = gapText !== undefined && item.text.includes(gapText) ? "gap" : "covered";
    const recorded = await recordProductVerdict({
      root: f.root,
      context: currentContext,
      reviewRef: status.review_ref,
      value: {
        item_key: item.item_key,
        verdict,
        explanation: verdict === "covered" ? "Synthetic evidence covers this item." : "Synthetic correction is required.",
        counterexample: verdict === "covered" ? null : "The current source omits the corrected behavior.",
        evidence_refs: verdict === "gap" ? [f.refs[f.candidate.artifact]] : [],
        evidence_sources: [],
        read_receipt: item.read_receipt,
        inherited_from: null,
      },
    });
    if (verdict === "gap") gapKey = item.item_key;
    currentContext = recorded.context;
    status = (await getProductReviewStatus({
      root: f.root, context: currentContext, reviewRef: status.review_ref,
    })).result;
  }
  if (status.inventory_contract === "semantic-v2") {
    await recordConsistency(f, status.review_ref, currentContext);
  }
  const completed = await completeProductReview({
    root: f.root, context: currentContext, reviewRef: status.review_ref,
  });
  return { reviewRef: status.review_ref, context: completed.context, status: completed.result, gapKey };
}

async function recordConsistency(f, reviewRef, contextValue) {
  let page = await readProductReviewConsistency({ root: f.root, context: contextValue, reviewRef });
  while (page.result.next_cursor !== null) page = await readProductReviewConsistency({
    root: f.root, context: contextValue, reviewRef, cursor: page.result.next_cursor,
  });
  return recordProductReviewConsistency({ root: f.root, context: contextValue, reviewRef,
    readReceipt: page.result.read_receipt, verdict: "covered", explanation: "Synthetic cross-block consistency evidence.", counterexample: null });
}

export { recordConsistency };


export { digest, bytes, expectCode, candidateVersion, context, snapshot, artifactOrder, elementIds, fixture, writeCandidate, replaceArtifactDocument, readItemFully, recordItem, completeReview };
