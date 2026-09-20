import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  acceptDocumentEdits,
  beginDocumentEdit,
  createDocumentSubject,
  inspectDocumentEdits,
  listProductDocuments,
  moveDocumentElements,
  renameProductDocument,
} from "../dist/product/documents.js";
import { saveGeneration, saveObject } from "../dist/product/storage.js";
import { workflowTools } from "../dist/server.js";

const digest = (value) => createHash("sha256").update(value).digest("hex");

function expectCode(code) {
  return (error) => {
    assert.equal(error?.code, code);
    assert.doesNotMatch(error?.message ?? "", /\/tmp\/|\\Users\\|EAW_PRODUCT_DATA_DIR/u);
    return true;
  };
}

async function temporaryDirectory(t, prefix) {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
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

async function fixture(t) {
  const directory = await temporaryDirectory(t, "eaw-product-documents-");
  const root = join(directory, "product-data");
  const workspace = join(directory, "workspace");
  await mkdir(workspace);
  const productId = randomUUID();
  const workspaceId = randomUUID();
  const candidateId = randomUUID();
  const registryId = randomUUID();
  const documentIds = {
    prdIndex: randomUUID(),
    prdOverview: randomUUID(),
    technicalIndex: randomUUID(),
    technicalOverview: randomUUID(),
  };
  const sources = {
    "prd/index.md": "# PRD\n\n- [Overview](overview.md)\n",
    "prd/overview.md": "# Overview\n\nIntro stays byte exact.\n\n### PRD-0001: Goal\n\nFirst body.\n\n### PRD-0002: Rule\n\nSecond body.\n",
    "technical-design/index.md": "# Technical Design\n\n- [Overview](overview.md)\n",
    "technical-design/overview.md": "# Overview\r\n\r\n### TD-0001: Boundary\r\n\r\nTechnical body.\r\n",
  };
  const documents = [];
  for (const [relativePath, source] of Object.entries(sources)) {
    const artifact = relativePath.startsWith("prd/") ? "prd" : "technical-design";
    const navigation = relativePath.endsWith("index.md");
    const stored = await saveObject(root, {
      productId,
      kind: "markdown",
      bytes: Buffer.from(source),
    });
    const id = relativePath === "prd/index.md" ? documentIds.prdIndex
      : relativePath === "prd/overview.md" ? documentIds.prdOverview
        : relativePath === "technical-design/index.md" ? documentIds.technicalIndex
          : documentIds.technicalOverview;
    documents.push({
      id,
      artifact,
      role: navigation ? "navigation" : "semantic",
      subject: navigation ? "Index" : "Overview",
      relative_path: relativePath,
      object_sha256: stored.sha256,
    });
  }
  const metadata = [
    ["prd", "PRD-0001", "PrdGoal"],
    ["prd", "PRD-0002", "PrdRule"],
    ["technical-design", "TD-0001", "TechnicalBoundary"],
  ].map(([artifact, elementId, semanticType]) => ({
    ref: { product_id: productId, artifact, element_id: elementId },
    semantic_type: semanticType,
    applicability: { state: "current", stage_refs: [], global: true, reason: "Fixture scope." },
    provenance: [],
    state: "active",
  }));
  const registry = {
    schema_version: 1,
    kind: "registry",
    product_id: productId,
    documents,
    element_metadata: metadata,
  };
  const registryObject = await saveObject(root, {
    productId,
    kind: "record",
    bytes: Buffer.from(`${JSON.stringify(registry)}\n`),
  });
  const generation = await saveGeneration(root, {
    schema_version: 1,
    kind: "generation",
    product_id: productId,
    parent: null,
    registry: { id: registryId, object_sha256: registryObject.sha256 },
    ready_artifacts: [],
    decision_heads: [],
    relations: [],
  });
  await mkdir(join(root, "products", productId), { recursive: true });
  await writeFile(join(root, "products", productId, "head.yaml"), `${JSON.stringify({
    schema_version: 1,
    kind: "head",
    product_id: productId,
    generation: generation.sha256,
    operation_id: randomUUID(),
  })}\n`);
  for (const [relativePath, source] of Object.entries(sources)) {
    const target = join(root, "products", productId, "drafts", candidateId, "documents", relativePath);
    await mkdir(join(target, ".."), { recursive: true });
    await writeFile(target, source);
  }
  const sourceVersion = digest("fixture candidate");
  const instructionRef = { product_id: productId, artifact: "prd", id: randomUUID(), revision: 1 };
  const candidate = {
    schema_version: 1,
    kind: "candidate",
    product_id: productId,
    candidate_id: candidateId,
    artifact: "prd",
    base_generation: generation.sha256,
    workspace_id: workspaceId,
    state: "draft",
    scope: {
      depth: "lite",
      profiles: [{ id: "core", reason: "Fixture." }],
      rationale: ["Fixture."],
      confirmed_answer: null,
    },
    registry: { id: registryId, object_sha256: registryObject.sha256 },
    upstream_pins: [],
    decision_heads: [{ decision_ref: instructionRef, object_sha256: digest("instruction") }],
    relations: [],
    source_version: sourceVersion,
  };
  const candidatePath = join(root, "products", productId, "drafts", candidateId, "candidate.yaml");
  await writeFile(candidatePath, `${JSON.stringify(candidate)}\n`);
  const contextValue = {
    contract: "product-1",
    store_id: randomUUID(),
    product_id: productId,
    workspace_id: workspaceId,
    candidate_ref: { product_id: productId, candidate_id: candidateId },
    selected_sources_sha256: sourceVersion,
    target_revision: generation.sha256,
    canonical_workspace: workspace,
  };
  return {
    root,
    productId,
    candidateId,
    candidateRef: contextValue.candidate_ref,
    context: Buffer.from(JSON.stringify(contextValue)).toString("base64url"),
    documentIds,
    instructionRef,
    path(relativePath) {
      return join(root, "products", productId, "drafts", candidateId, "documents", relativePath);
    },
  };
}

test("P05 publishes the document scenarios with their strict contract schemas", () => {
  const expected = [
    "product_document_accept_edits",
    "product_document_begin_edit",
    "product_document_create_subject",
    "product_document_inspect_edits",
    "product_document_list",
    "product_document_move_elements",
    "product_document_rename",
  ];
  const tools = workflowTools.filter((tool) => expected.includes(tool.name));
  assert.deepEqual(tools.map((tool) => tool.name).sort(), expected);
  for (const tool of tools) {
    assert.equal(tool.schemaKind, "json");
    assert.equal(tool.inputSchema.type, "object");
    assert.equal(tool.outputSchema.type, "object");
    assert.ok(tool.outputSchema.definitions);
  }
});

test("Q11: Lite documents stay minimal and addressed moves preserve bytes and identities", async (t) => {
  const f = await fixture(t);
  const initial = await listProductDocuments({ root: f.root, context: f.context, artifact: "prd", limit: 20 });
  assert.equal(initial.result.total, 2);
  assert.deepEqual(initial.result.items.map((item) => item.document.role).sort(), ["navigation", "semantic"]);

  const created = await createDocumentSubject({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    subject: "Security",
    title: "Security",
  });
  const replayedCreate = await createDocumentSubject({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    subject: "Security",
    title: "Security",
  });
  assert.equal(replayedCreate.replayed, true);
  assert.deepEqual(replayedCreate.result, created.result);
  const securityId = created.result.document_id;
  assert.equal(typeof securityId, "string");
  const afterCreate = await listProductDocuments({ root: f.root, context: created.context, artifact: "prd", limit: 20 });
  assert.equal(afterCreate.result.total, 3);
  assert.equal((await readFile(f.path("prd/security.md"), "utf8")), "# Security\n");

  const beforeTechnical = await readFile(f.path("technical-design/overview.md"));
  const moved = await moveDocumentElements({
    root: f.root,
    context: created.context,
    candidateRef: f.candidateRef,
    elementRefs: [{ product_id: f.productId, artifact: "prd", element_id: "PRD-0002" }],
    targetDocumentId: securityId,
  });
  assert.equal((await readFile(f.path("prd/overview.md"), "utf8")), "# Overview\n\nIntro stays byte exact.\n\n### PRD-0001: Goal\n\nFirst body.\n");
  assert.equal((await readFile(f.path("prd/security.md"), "utf8")), "# Security\n\n### PRD-0002: Rule\n\nSecond body.\n");
  assert.deepEqual(await readFile(f.path("technical-design/overview.md")), beforeTechnical);

  const renamed = await renameProductDocument({
    root: f.root,
    context: moved.context,
    candidateRef: f.candidateRef,
    documentId: securityId,
    subject: "Risk",
    title: "Risk",
  });
  assert.equal((await readFile(f.path("prd/risk.md"), "utf8")), "# Risk\n\n### PRD-0002: Rule\n\nSecond body.\n");
  await assert.rejects(stat(f.path("prd/security.md")), { code: "ENOENT" });
  assert.match(await readFile(f.path("prd/index.md"), "utf8"), /\[Risk\]\(risk\.md\)/u);
  assert.equal(renamed.result.changed_refs[0].element_id, "PRD-0002");
});

test("Q11: recreating a renamed subject keeps document identities unique", async (t) => {
  const f = await fixture(t);
  const created = await createDocumentSubject({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    subject: "Security",
    title: "Security",
  });
  const renamed = await renameProductDocument({
    root: f.root,
    context: created.context,
    candidateRef: f.candidateRef,
    documentId: created.result.document_id,
    subject: "Risk",
    title: "Risk",
  });
  const recreated = await createDocumentSubject({
    root: f.root,
    context: renamed.context,
    candidateRef: f.candidateRef,
    subject: "Security",
    title: "Security",
  });
  const listed = await listProductDocuments({
    root: f.root,
    context: recreated.context,
    artifact: "prd",
    limit: 20,
  });
  const ids = listed.result.items.map((item) => item.document.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(await readFile(f.path("prd/risk.md"), "utf8"), "# Risk\n");
  assert.equal(await readFile(f.path("prd/security.md"), "utf8"), "# Security\n");
});

test("Q12: duplicate, unregistered and stale document state fails without affected writes", async (t) => {
  const duplicate = await fixture(t);
  const duplicateSubject = await createDocumentSubject({
    root: duplicate.root,
    context: duplicate.context,
    candidateRef: duplicate.candidateRef,
    subject: "Duplicate",
    title: "Duplicate",
  });
  await writeFile(duplicate.path("prd/duplicate.md"), "# Duplicate\n\n### PRD-0001: Duplicate\n\nWrong.\n");
  const beforeDuplicate = await snapshot(duplicate.root);
  await assert.rejects(createDocumentSubject({
    root: duplicate.root,
    context: duplicateSubject.context,
    candidateRef: duplicate.candidateRef,
    subject: "Extra",
    title: "Extra",
  }), expectCode("INVALID_MARKDOWN"));
  assert.deepEqual(await snapshot(duplicate.root), beforeDuplicate);

  const unregistered = await fixture(t);
  await writeFile(unregistered.path("prd/rogue.md"), "# Rogue\n");
  const beforeRogue = await snapshot(unregistered.root);
  await assert.rejects(createDocumentSubject({
    root: unregistered.root,
    context: unregistered.context,
    candidateRef: unregistered.candidateRef,
    subject: "Extra",
    title: "Extra",
  }), expectCode("INVALID_STATE"));
  assert.deepEqual(await snapshot(unregistered.root), beforeRogue);

  const stale = await fixture(t);
  await createDocumentSubject({
    root: stale.root,
    context: stale.context,
    candidateRef: stale.candidateRef,
    subject: "Extra",
    title: "Extra",
  });
  await assert.rejects(createDocumentSubject({
    root: stale.root,
    context: stale.context,
    candidateRef: stale.candidateRef,
    subject: "Another",
    title: "Another",
  }), expectCode("CONFLICT"));
});

test("Q12: document labels cannot inject Markdown and rejected input leaves no objects", async (t) => {
  const subject = await fixture(t);
  await createDocumentSubject({
    root: subject.root,
    context: subject.context,
    candidateRef: subject.candidateRef,
    subject: "Docs](https://example.invalid) [Local",
    title: "Docs",
  });
  const navigation = await readFile(subject.path("prd/index.md"), "utf8");
  assert.match(navigation, /Docs\\\]\(https:\/\/example\.invalid\) \\\[Local/u);
  assert.doesNotMatch(navigation, /(^|[^\\])\]\(https:\/\/example\.invalid\)/u);

  const title = await fixture(t);
  const beforeTitle = await snapshot(title.root);
  await assert.rejects(createDocumentSubject({
    root: title.root,
    context: title.context,
    candidateRef: title.candidateRef,
    subject: "Injected",
    title: "Injected\n\n### PRD-9999: Unexpected",
  }), expectCode("INVALID_INPUT"));
  assert.deepEqual(await snapshot(title.root), beforeTitle);
});

test("Q12: draft inventory traversal is bounded", async (t) => {
  const f = await fixture(t);
  const nested = Array.from({ length: 33 }, (_, index) => `level-${index}`).join("/");
  const target = f.path(`${nested}/rogue.md`);
  await mkdir(join(target, ".."), { recursive: true });
  await writeFile(target, "# Rogue\n");
  await assert.rejects(listProductDocuments({
    root: f.root,
    context: f.context,
    artifact: "prd",
    limit: 20,
  }), expectCode("SOURCE_LIMIT"));
});

test("Q13: direct edits retain base evidence and require exact observed provenance", async (t) => {
  const unchanged = await fixture(t);
  const unchangedBegin = await beginDocumentEdit({
    root: unchanged.root,
    context: unchanged.context,
    artifact: "prd",
    documentId: unchanged.documentIds.prdOverview,
  });
  const unchangedInspection = await inspectDocumentEdits({
    root: unchanged.root,
    context: unchangedBegin.context,
    candidateRef: unchanged.candidateRef,
    documentId: unchanged.documentIds.prdOverview,
    limit: 20,
  });
  assert.equal(unchangedInspection.result.items[0].state, "unchanged");
  const beforeNoop = await snapshot(unchanged.root);
  await assert.rejects(acceptDocumentEdits({
    root: unchanged.root,
    context: unchangedBegin.context,
    candidateRef: unchanged.candidateRef,
    documentId: unchanged.documentIds.prdOverview,
    observedDigest: unchangedInspection.result.source_version,
    instructionRef: unchanged.instructionRef,
  }), expectCode("INVALID_INPUT"));
  assert.deepEqual(await snapshot(unchanged.root), beforeNoop);

  const f = await fixture(t);
  const begun = await beginDocumentEdit({
    root: f.root,
    context: f.context,
    artifact: "prd",
    documentId: f.documentIds.prdOverview,
  });
  const replayedBegin = await beginDocumentEdit({
    root: f.root,
    context: f.context,
    artifact: "prd",
    documentId: f.documentIds.prdOverview,
  });
  assert.equal(replayedBegin.replayed, true);
  assert.deepEqual(replayedBegin.result, begun.result);
  assert.equal(begun.result.base_pin.object_sha256, digest(await readFile(f.path("prd/overview.md"))));
  await writeFile(f.path("prd/overview.md"), "# Overview\n\n### PRD-0001: Goal\n\nUser revised body.\n\n### PRD-0002: Rule\n\nSecond body.\n");

  const inspected = await inspectDocumentEdits({
    root: f.root,
    context: begun.context,
    candidateRef: f.candidateRef,
    documentId: f.documentIds.prdOverview,
    limit: 20,
  });
  assert.equal(inspected.result.items[0].state, "changed");
  const observedDigest = inspected.result.source_version;
  const beforeRejected = await snapshot(f.root);
  await assert.rejects(acceptDocumentEdits({
    root: f.root,
    context: begun.context,
    candidateRef: f.candidateRef,
    documentId: f.documentIds.prdOverview,
    observedDigest,
    instructionRef: { ...f.instructionRef, id: randomUUID() },
  }), expectCode("NOT_FOUND"));
  assert.deepEqual(await snapshot(f.root), beforeRejected);

  const accepted = await acceptDocumentEdits({
    root: f.root,
    context: begun.context,
    candidateRef: f.candidateRef,
    documentId: f.documentIds.prdOverview,
    observedDigest,
    instructionRef: f.instructionRef,
  });
  const replayedAccept = await acceptDocumentEdits({
    root: f.root,
    context: begun.context,
    candidateRef: f.candidateRef,
    documentId: f.documentIds.prdOverview,
    observedDigest,
    instructionRef: f.instructionRef,
  });
  assert.equal(replayedAccept.replayed, true);
  assert.deepEqual(replayedAccept.result, accepted.result);
  assert.deepEqual(accepted.result.changed_refs.map((ref) => ref.element_id), ["PRD-0001"]);
  assert.notEqual(accepted.context, begun.context);
});
