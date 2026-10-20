import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  activateAmendment,
  checkProductCandidate,
  completeProductReview,
  getProductReviewStatus,
  readProductReviewConsistency,
  readProductReviewItem,
  recordProductReviewConsistency,
  recordProductVerdict,
  startProductReview,
} from "../dist/product/review.js";
import { loadGeneration, saveGeneration, saveObject } from "../dist/product/storage.js";
import { workflowTools } from "../dist/server.js";

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

async function fixture(t, artifact) {
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
    const source = `# ${kind}\n\nIntroductory prose for ${kind}.\n\n### ${elementIds[kind]}: ${kind} result\n\n#### Outcome\n\nCurrent ${kind} behavior is explicit.\n`;
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
    element_metadata: artifactOrder.map((kind) => ({
      ref: f.refs[kind], semantic_type: semanticTypes[kind], applicability, provenance: [], state: "active",
    })),
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
      element_ids: [elementIds[kind]],
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

async function completeReview(f, contextValue, { gapText } = {}) {
  const started = await startProductReview({
    root: f.root, context: contextValue, candidateRef: f.candidateRef, mode: "full",
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
  const completed = await completeProductReview({
    root: f.root, context: currentContext, reviewRef: status.review_ref,
  });
  return { reviewRef: status.review_ref, context: completed.context, status: completed.result, gapKey };
}

test("P11 publishes independent review, candidate check and activation tools", () => {
  const expected = [
    "product_amendment_activate",
    "product_candidate_check",
    "product_review_complete",
    "product_review_consistency_get",
    "product_review_consistency_record",
    "product_review_get",
    "product_review_record",
    "product_review_start",
    "product_review_status",
  ];
  const tools = workflowTools.filter((tool) => expected.includes(tool.name));
  assert.deepEqual(tools.map((tool) => tool.name).sort(), expected);
  for (const tool of tools) {
    assert.equal(tool.schemaKind, "json");
    assert.equal(tool.inputSchema.type, "object");
    assert.equal(tool.outputSchema.type, "object");
  }
  assert.equal(tools.find((tool) => tool.name === "product_review_status").write, false);
  assert.equal(tools.find((tool) => tool.name === "product_review_get").write, false);
  assert.equal(tools.find((tool) => tool.name === "product_review_consistency_get").write, false);
  assert.equal(tools.find((tool) => tool.name === "product_candidate_check").write, false);
});

test("Q24: all four artifact kinds require a fresh complete independent pass", async (t) => {
  for (const artifact of artifactOrder) {
    const f = await fixture(t, artifact);
    const before = await snapshot(f.root);
    const check = await checkProductCandidate({ root: f.root, context: f.context, candidateRef: f.candidateRef });
    assert.equal(check.result.status, "fail");
    assert.equal(check.result.coverage_status, null);
    assert.equal((await snapshot(f.root)).some(([path]) => path.includes("/reviews/")), false);
    assert.deepEqual(await snapshot(f.root), before, `${artifact} check must be read-only`);
    await assert.rejects(activateAmendment({
      root: f.root, context: f.context, candidates: [f.candidateRef], reviewRefs: [randomUUID()],
    }), expectCode("REVIEW_REQUIRED"));

    const reviewed = await completeReview(f, f.context);
    assert.equal(reviewed.status.coverage_status, "reviewed", artifact);
    const ready = await checkProductCandidate({
      root: f.root, context: reviewed.context, candidateRef: f.candidateRef,
    });
    assert.equal(ready.result.status, "pass", artifact);
    assert.equal(ready.result.review_ref, reviewed.reviewRef);
    const activated = await activateAmendment({
      root: f.root,
      context: reviewed.context,
      candidates: [f.candidateRef],
      reviewRefs: [reviewed.reviewRef],
    });
    const activatedContext = JSON.parse(Buffer.from(activated.context, "base64url").toString("utf8"));
    const generation = await loadGeneration(f.root, f.productId, activatedContext.target_revision);
    const result = generation.generation.ready_artifacts.find((entry) => entry.artifact === artifact);
    assert.equal(result.review_id, reviewed.reviewRef);
    assert.equal(result.source_version, f.candidate.source_version);
    assert.equal(activatedContext.candidate_ref, null);

    const replayed = await activateAmendment({
      root: f.root,
      context: reviewed.context,
      candidates: [f.candidateRef],
      reviewRefs: [reviewed.reviewRef],
    });
    assert.equal(replayed.replayed, true);
    assert.deepEqual(replayed.result, activated.result);
    assert.equal(replayed.context, activated.context);
  }
});

test("Q25: review cursors cannot skip unread portions", async (t) => {
  const f = await fixture(t, "prd");
  const source = `# prd\n\n### ${elementIds.prd}: prd result\n\n#### Outcome\n\n${"x".repeat(14_000)}\n`;
  await replaceArtifactDocument(f, "prd", source);
  const started = await startProductReview({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    mode: "full",
  });
  const first = await readProductReviewItem({
    root: f.root,
    context: started.context,
    reviewRef: started.result.review_ref,
    itemIndex: 1,
  });
  assert.notEqual(first.result.next_cursor, null);
  const decoded = JSON.parse(Buffer.from(first.result.next_cursor, "base64url").toString("utf8"));
  decoded.offset = 12_288;
  const body = Object.fromEntries(Object.entries(decoded)
    .filter(([key]) => key !== "checksum")
    .sort(([left], [right]) => left.localeCompare(right)));
  decoded.checksum = digest(JSON.stringify(body)).slice(0, 16);
  const forged = Buffer.from(JSON.stringify(decoded)).toString("base64url");
  await assert.rejects(readProductReviewItem({
    root: f.root,
    context: started.context,
    reviewRef: started.result.review_ref,
    itemIndex: 1,
    cursor: forged,
  }), expectCode("STALE_CURSOR"));
});

test("Q25: oversized aggregate inventory fails before mutation state is written", async (t) => {
  const f = await fixture(t, "prd");
  const source = `# prd\n\n### ${elementIds.prd}: prd result\n\n#### Outcome\n\n${"x".repeat(8_500_000)}\n`;
  await replaceArtifactDocument(f, "prd", source);
  const before = await snapshot(f.root);
  await assert.rejects(startProductReview({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    mode: "full",
  }), expectCode("SOURCE_LIMIT"));
  assert.deepEqual(await snapshot(f.root), before);
});

test("Q25: observers are byte-stable while reviewer contexts support sequential verdicts", async (t) => {
  const f = await fixture(t, "prd");
  const started = await startProductReview({
    root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "full",
  });
  const first = await recordItem(f, started.result.review_ref, 0, started.context);
  const beforeObserver = await snapshot(f.root);
  const status = await getProductReviewStatus({
    root: f.root, context: first.context, reviewRef: started.result.review_ref,
  });
  const repeated = await startProductReview({
    root: f.root, context: first.context, candidateRef: f.candidateRef, mode: "full",
  });
  assert.deepEqual(repeated.result, status.result);
  assert.deepEqual(await snapshot(f.root), beforeObserver);
  assert.ok(status.result.next_item_index !== null);
  await recordItem(f, started.result.review_ref, status.result.next_item_index, first.context);
  const afterSecond = await getProductReviewStatus({
    root: f.root, context: first.context, reviewRef: started.result.review_ref,
  });
  assert.equal(afterSecond.result.recorded_items, 2);

  const changed = {
    ...f.candidate,
    scope: { ...f.candidate.scope, rationale: [...f.candidate.scope.rationale, "Concurrent semantic change."] },
  };
  const changedWithoutVersion = Object.fromEntries(Object.entries(changed).filter(([key]) => key !== "source_version"));
  const nextCandidate = { ...changedWithoutVersion, source_version: candidateVersion(changedWithoutVersion) };
  await writeCandidate(f, nextCandidate);
  const nextContext = context(f, nextCandidate);
  const stale = await getProductReviewStatus({
    root: f.root, context: nextContext, reviewRef: started.result.review_ref,
  });
  assert.equal(stale.result.coverage_status, "stale");
  await assert.rejects(recordItem(f, started.result.review_ref, 2, first.context), expectCode("CONFLICT"));
});

test("Q26: corrections inherit only unchanged passes and joint activation publishes one generation", async (t) => {
  const f = await fixture(t, "prd");
  const initial = await completeReview(f, f.context, { gapText: "Current prd behavior" });
  assert.equal(initial.status.coverage_status, "gaps");
  assert.ok(initial.gapKey);

  const currentDocument = f.registry.documents.find((entry) => entry.artifact === "prd");
  const nextSource = f.documentBytes.get("prd").toString("utf8").replace(
    "Current prd behavior is explicit.",
    "Corrected prd behavior is explicit and independently testable.",
  );
  const savedDocument = await saveObject(f.root, {
    productId: f.productId, kind: "markdown", bytes: Buffer.from(nextSource),
  });
  const nextRegistry = {
    ...f.registry,
    documents: f.registry.documents.map((entry) => entry.id === currentDocument.id
      ? { ...entry, object_sha256: savedDocument.sha256 }
      : entry),
  };
  const savedRegistry = await saveObject(f.root, {
    productId: f.productId, kind: "record", bytes: bytes(nextRegistry),
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
  f.context = context(f, amended);

  const followup = await startProductReview({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    mode: "followup",
    parentReviewRef: initial.reviewRef,
    fixes: [{
      finding_key: initial.gapKey,
      changed_refs: [f.refs.prd],
      explanation: "The PRD goal now states the independently testable behavior.",
    }],
  });
  assert.equal(followup.result.recorded_items, followup.result.total_items - 1);
  const corrected = await recordItem(
    f, followup.result.review_ref, followup.result.next_item_index, followup.context,
  );
  let consistency = await readProductReviewConsistency({
    root: f.root, context: corrected.context, reviewRef: followup.result.review_ref,
  });
  while (consistency.result.next_cursor !== null) {
    consistency = await readProductReviewConsistency({
      root: f.root,
      context: corrected.context,
      reviewRef: followup.result.review_ref,
      cursor: consistency.result.next_cursor,
    });
  }
  const consistencyRecorded = await recordProductReviewConsistency({
    root: f.root,
    context: corrected.context,
    reviewRef: followup.result.review_ref,
    readReceipt: consistency.result.read_receipt,
    verdict: "covered",
    explanation: "The complete current PRD remains consistent after the correction.",
    counterexample: null,
  });
  const completedFollowup = await completeProductReview({
    root: f.root,
    context: consistencyRecorded.context,
    reviewRef: followup.result.review_ref,
  });
  assert.equal(completedFollowup.result.coverage_status, "reviewed");

  const ideaCandidateWithoutVersion = {
    ...amendedWithoutVersion,
    candidate_id: randomUUID(),
    artifact: "idea",
    workspace_id: randomUUID(),
    upstream_pins: [],
  };
  const ideaCandidate = {
    ...ideaCandidateWithoutVersion,
    source_version: candidateVersion(ideaCandidateWithoutVersion),
  };
  await writeCandidate(f, ideaCandidate);
  const ideaRef = { product_id: f.productId, candidate_id: ideaCandidate.candidate_id };
  const ideaContext = context(f, ideaCandidate);
  const originalRef = f.candidateRef;
  f.candidateRef = ideaRef;
  f.candidate = ideaCandidate;
  const ideaReview = await completeReview(f, ideaContext);
  f.candidateRef = originalRef;
  f.candidate = amended;

  const activated = await activateAmendment({
    root: f.root,
    context: completedFollowup.context,
    candidates: [ideaRef, originalRef],
    reviewRefs: [ideaReview.reviewRef, followup.result.review_ref],
  });
  const activatedContext = JSON.parse(Buffer.from(activated.context, "base64url").toString("utf8"));
  const generation = await loadGeneration(f.root, f.productId, activatedContext.target_revision);
  assert.equal(generation.generation.parent, f.generation.sha256);
  assert.deepEqual(
    generation.generation.ready_artifacts.map((entry) => entry.artifact).sort(),
    ["idea", "prd"],
  );
  assert.equal(generation.generation.ready_artifacts.find((entry) => entry.artifact === "idea").review_id, ideaReview.reviewRef);
  assert.equal(generation.generation.ready_artifacts.find((entry) => entry.artifact === "prd").review_id, followup.result.review_ref);
});
