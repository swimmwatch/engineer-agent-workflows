import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { defineTechnicalElement } from "../dist/product/technical.js";
import { readObject, saveGeneration, saveObject } from "../dist/product/storage.js";
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

async function temporaryDirectory(t) {
  const directory = await mkdtemp(join(tmpdir(), "eaw-product-technical-"));
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

function candidateVersion(candidate) {
  return digest(bytes(Object.fromEntries(
    Object.entries(candidate).filter(([key]) => key !== "source_version"),
  )));
}

function context(f, candidate) {
  return Buffer.from(JSON.stringify({
    contract: "product-1",
    store_id: f.storeId,
    product_id: f.productId,
    workspace_id: f.workspaceId,
    candidate_ref: { product_id: f.productId, candidate_id: f.candidateId },
    selected_sources_sha256: candidate.source_version,
    target_revision: candidate.base_generation,
    canonical_workspace: f.workspace,
  })).toString("base64url");
}

function applicability(state, stageRefs = []) {
  return {
    state,
    stage_refs: stageRefs,
    global: stageRefs.length === 0,
    reason: state === "current" ? "Observed in the selected implementation." : "Accepted only for the named planning state.",
  };
}

async function fixture(t, { readyPrd = true, newline = "\n" } = {}) {
  const temporaryRoot = await temporaryDirectory(t);
  const root = join(temporaryRoot, "product-data");
  const workspace = join(temporaryRoot, "workspace");
  await mkdir(root, { recursive: true });
  await mkdir(workspace, { recursive: true });

  const f = {
    root,
    workspace,
    productId: randomUUID(),
    workspaceId: randomUUID(),
    candidateId: randomUUID(),
    storeId: randomUUID(),
    registryId: randomUUID(),
    evidenceRef: null,
    prdRef: null,
    stageRef: null,
  };
  f.evidenceRef = { product_id: f.productId, artifact: "technical-design", id: randomUUID(), revision: 1 };
  f.prdRef = { product_id: f.productId, artifact: "prd", element_id: "PRD-0001" };
  f.stageRef = { product_id: f.productId, artifact: "roadmap", element_id: "STAGE-0001" };

  const documentIds = {
    prdIndex: randomUUID(),
    prdOverview: randomUUID(),
    technicalIndex: randomUUID(),
    technicalOverview: randomUUID(),
    roadmapIndex: randomUUID(),
    roadmapOverview: randomUUID(),
  };
  const sources = {
    "prd/index.md": "# PRD\n\n- [Overview](overview.md)\n",
    "prd/overview.md": "# Overview\n\n### PRD-0001: Shared authoring\n\n#### Outcome\n\nTwo agents retrieve the same shared rule.\n",
    "technical-design/index.md": "# Technical Design\n\n- [Overview](overview.md)\n",
    "technical-design/overview.md": "# Overview\n",
    "roadmap/index.md": "# Roadmap\n\n- [Overview](overview.md)\n",
    "roadmap/overview.md": "# Overview\n\n### STAGE-0001: MVP\n\n#### Outcome\n\nValidate the shared workflow.\n",
  };
  const documents = [];
  for (const [relativePath, rawSource] of Object.entries(sources)) {
    const source = rawSource.replaceAll("\n", newline);
    const saved = await saveObject(root, { productId: f.productId, kind: "markdown", bytes: Buffer.from(source) });
    const artifact = relativePath.startsWith("prd/")
      ? "prd"
      : relativePath.startsWith("technical-design/") ? "technical-design" : "roadmap";
    const role = relativePath.endsWith("index.md") ? "navigation" : "semantic";
    const key = artifact === "prd"
      ? (role === "navigation" ? "prdIndex" : "prdOverview")
      : artifact === "technical-design"
        ? (role === "navigation" ? "technicalIndex" : "technicalOverview")
        : (role === "navigation" ? "roadmapIndex" : "roadmapOverview");
    documents.push({
      id: documentIds[key],
      artifact,
      role,
      subject: role === "navigation" ? "Index" : "Overview",
      relative_path: relativePath,
      object_sha256: saved.sha256,
    });
  }

  const registry = {
    schema_version: 1,
    kind: "registry",
    product_id: f.productId,
    documents,
    element_metadata: [
      {
        ref: f.prdRef,
        semantic_type: "PrdCapability",
        applicability: applicability("current"),
        provenance: [],
        state: "active",
      },
      {
        ref: f.stageRef,
        semantic_type: "Stage",
        applicability: applicability("current"),
        provenance: [],
        state: "active",
      },
    ],
  };
  const registryObject = await saveObject(root, {
    productId: f.productId,
    kind: "record",
    bytes: bytes(registry),
  });
  const base = await saveGeneration(root, {
    schema_version: 1,
    kind: "generation",
    product_id: f.productId,
    parent: null,
    registry: { id: f.registryId, object_sha256: registryObject.sha256 },
    ready_artifacts: [],
    decision_heads: [],
    relations: [],
  });
  const prdDocument = documents.find((document) => document.id === documentIds.prdOverview);
  const prdPin = {
    product_id: f.productId,
    artifact: "prd",
    source_kind: "markdown",
    source_id: prdDocument.id,
    generation: base.sha256,
    object_sha256: prdDocument.object_sha256,
    element_ids: [f.prdRef.element_id],
    decision_ref: null,
  };
  const generation = readyPrd ? await saveGeneration(root, {
    schema_version: 1,
    kind: "generation",
    product_id: f.productId,
    parent: base.sha256,
    registry: { id: f.registryId, object_sha256: registryObject.sha256 },
    ready_artifacts: [{
      artifact: "prd",
      source_version: digest("ready prd fixture"),
      review_id: randomUUID(),
      upstream_pins: [],
    }],
    decision_heads: [],
    relations: [],
  }) : base;

  const decision = {
    schema_version: 1,
    kind: "decision",
    ref: f.evidenceRef,
    state: "observed",
    category: "research",
    question: null,
    text: "Repository evidence supports the selected boundary.",
    source: "synthetic repository fixture",
    selected_ids: [],
    predecessors: [],
    affected_refs: [],
    reconsider_when: null,
    candidate_id: f.candidateId,
  };
  const savedDecision = await saveObject(root, {
    productId: f.productId,
    kind: "decision",
    artifact: "technical-design",
    decisionId: f.evidenceRef.id,
    revision: f.evidenceRef.revision,
    bytes: bytes(decision),
  });
  const candidateWithoutVersion = {
    schema_version: 1,
    kind: "candidate",
    product_id: f.productId,
    candidate_id: f.candidateId,
    artifact: "technical-design",
    base_generation: generation.sha256,
    workspace_id: f.workspaceId,
    state: "draft",
    scope: {
      depth: "standard",
      profiles: [{ id: "backend", reason: "Shared technical ownership." }],
      rationale: ["Synthetic Q19 scenario."],
      confirmed_answer: null,
    },
    registry: { id: f.registryId, object_sha256: registryObject.sha256 },
    upstream_pins: readyPrd ? [prdPin] : [],
    decision_heads: [{ decision_ref: f.evidenceRef, object_sha256: savedDecision.sha256 }],
    relations: [],
  };
  const candidate = {
    ...candidateWithoutVersion,
    source_version: candidateVersion(candidateWithoutVersion),
  };
  const draft = join(root, "products", f.productId, "drafts", f.candidateId);
  for (const [relativePath, source] of Object.entries(sources)) {
    await mkdir(join(draft, "documents", relativePath.split("/")[0]), { recursive: true });
    await writeFile(join(draft, "documents", relativePath), source.replaceAll("\n", newline));
  }
  await writeFile(join(draft, "candidate.yaml"), bytes(candidate));
  await mkdir(join(root, "products", f.productId), { recursive: true });
  await writeFile(join(root, "products", f.productId, "head.yaml"), bytes({
    schema_version: 1,
    kind: "head",
    product_id: f.productId,
    generation: generation.sha256,
    operation_id: randomUUID(),
  }));
  f.context = context(f, candidate);
  f.candidateRef = { product_id: f.productId, candidate_id: f.candidateId };
  f.candidatePath = join(draft, "candidate.yaml");
  f.technicalDocument = join(draft, "documents", "technical-design", "overview.md");
  return f;
}

test("P08 publishes strict Technical Design scenario tools", () => {
  const expected = ["technical_define_boundary", "technical_define_policy", "technical_define_technology"];
  const tools = workflowTools.filter((tool) => expected.includes(tool.name));
  assert.deepEqual(tools.map((tool) => tool.name).sort(), expected);
  for (const tool of tools) {
    assert.equal(tool.schemaKind, "json");
    assert.equal(tool.inputSchema.type, "object");
    assert.equal(tool.outputSchema.type, "object");
    assert.equal(tool.write, true);
    assert.equal(tool.destructive, true);
  }
});

test("Q19: Technical Design retains PRD justification and exact applicability", async (t) => {
  const f = await fixture(t);
  const boundary = await defineTechnicalElement({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    subject: "Overview",
    semanticType: "TechnicalBoundary",
    value: {
      title: "Workflow state boundary",
      provenance: [f.evidenceRef],
      applicability: applicability("current"),
      purpose: "Own durable product workflow state.",
      inputs: ["Typed scenario requests."],
      outputs: ["Version-bound scenario results."],
      ownership: "The workflow MCP owns persistence; host skills own orchestration.",
      dependencies: [],
      data_flows: ["Typed request -> validated immutable object -> candidate generation."],
      errors: ["Reject stale context before new effects."],
      prd_refs: [f.prdRef],
    },
  });
  const technology = await defineTechnicalElement({
    root: f.root,
    context: boundary.context,
    candidateRef: f.candidateRef,
    subject: "Overview",
    semanticType: "TechnologyChoice",
    value: {
      title: "TypeScript workflow runtime",
      provenance: [f.evidenceRef],
      applicability: applicability("accepted_target", [f.stageRef]),
      choice: "Use the repository-pinned TypeScript runtime.",
      alternatives: ["A separate unpinned service."],
      rationale: "It reuses the current validated MCP transport.",
      evidence_refs: [],
      prd_refs: [f.prdRef],
      revisit_when: "The pinned runtime cannot satisfy a measured requirement.",
    },
  });
  const policy = await defineTechnicalElement({
    root: f.root,
    context: technology.context,
    candidateRef: f.candidateRef,
    subject: "Overview",
    semanticType: "TechnicalPolicy",
    value: {
      title: "Single API contract authority",
      provenance: [f.evidenceRef],
      applicability: applicability("hypothesis"),
      kind: "interface",
      rule: "Reference the existing API contract instead of copying exact text.",
      verification: "Compare stored authoritative_contract references.",
      exceptions: [],
      authoritative_contract: "docs/specs/example/contracts/api.yaml#/paths/~1items",
      prd_refs: [f.prdRef],
    },
  });

  const source = await readFile(f.technicalDocument, "utf8");
  assert.match(source, /### TD-0001: Workflow state boundary/u);
  assert.match(source, /### TD-0002: TypeScript workflow runtime/u);
  assert.match(source, /### TD-0003: Single API contract authority/u);
  assert.equal((source.match(/docs\/specs\/example\/contracts\/api\.yaml#/gu) ?? []).length, 1);

  const candidate = JSON.parse(await readFile(f.candidatePath, "utf8"));
  for (const changed of [boundary, technology, policy]) {
    assert.ok(candidate.relations.some((relation) =>
      relation.from.element_id === changed.result.changed_refs[0].element_id
      && relation.kind === "derived_from"
      && relation.to.element_id === f.prdRef.element_id));
  }
  const registry = JSON.parse(Buffer.from(await readObject(f.root, {
    productId: f.productId,
    kind: "record",
    sha256: candidate.registry.object_sha256,
  })).toString("utf8"));
  assert.deepEqual(
    registry.element_metadata.filter((entry) => entry.ref.artifact === "technical-design").map((entry) => entry.applicability.state),
    ["current", "accepted_target", "hypothesis"],
  );

  const beforeReplay = await snapshot(f.root);
  const replay = await defineTechnicalElement({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    subject: "Overview",
    semanticType: "TechnicalBoundary",
    value: {
      title: "Workflow state boundary",
      provenance: [f.evidenceRef],
      applicability: applicability("current"),
      purpose: "Own durable product workflow state.",
      inputs: ["Typed scenario requests."],
      outputs: ["Version-bound scenario results."],
      ownership: "The workflow MCP owns persistence; host skills own orchestration.",
      dependencies: [],
      data_flows: ["Typed request -> validated immutable object -> candidate generation."],
      errors: ["Reject stale context before new effects."],
      prd_refs: [f.prdRef],
    },
  });
  assert.equal(replay.replayed, true);
  assert.deepEqual(await snapshot(f.root), beforeReplay);
});

test("P08 rejects missing PRD lineage and stale or foreign references without effects", async (t) => {
  const missing = await fixture(t, { readyPrd: false });
  const value = {
    title: "Blocked boundary",
    provenance: [missing.evidenceRef],
    applicability: applicability("current"),
    purpose: "Must not be saved without ready PRD lineage.",
    inputs: [],
    outputs: [],
    ownership: "No owner until prerequisite ready.",
    dependencies: [],
    data_flows: [],
    errors: ["Report missing PRD."],
    prd_refs: [missing.prdRef],
  };
  const beforeMissing = await snapshot(missing.root);
  await assert.rejects(defineTechnicalElement({
    root: missing.root,
    context: missing.context,
    candidateRef: missing.candidateRef,
    subject: "Overview",
    semanticType: "TechnicalBoundary",
    value,
  }), expectCode("PREREQUISITE_REQUIRED"));
  assert.deepEqual(await snapshot(missing.root), beforeMissing);

  const f = await fixture(t, { newline: "\r\n" });
  const beforeUnnamedTarget = await snapshot(f.root);
  await assert.rejects(defineTechnicalElement({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    subject: "Overview",
    semanticType: "TechnologyChoice",
    value: {
      title: "Unnamed target",
      provenance: [f.evidenceRef],
      applicability: applicability("accepted_target"),
      choice: "A future runtime.",
      alternatives: [],
      rationale: "No named stage was supplied.",
      evidence_refs: [],
      prd_refs: [f.prdRef],
      revisit_when: "A stage is selected.",
    },
  }), expectCode("INVALID_INPUT"));
  assert.deepEqual(await snapshot(f.root), beforeUnnamedTarget);

  const foreign = {
    ...value,
    provenance: [f.evidenceRef],
    prd_refs: [{ ...f.prdRef, product_id: randomUUID() }],
  };
  const beforeForeign = await snapshot(f.root);
  await assert.rejects(defineTechnicalElement({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    subject: "Overview",
    semanticType: "TechnicalBoundary",
    value: foreign,
  }), expectCode("BROKEN_REFERENCE"));
  assert.deepEqual(await snapshot(f.root), beforeForeign);

  const applied = await defineTechnicalElement({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    subject: "Overview",
    semanticType: "TechnicalBoundary",
    value: { ...value, provenance: [f.evidenceRef], prd_refs: [f.prdRef] },
  });
  const beforeStale = await snapshot(f.root);
  await assert.rejects(defineTechnicalElement({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    subject: "Overview",
    semanticType: "TechnicalBoundary",
    value: { ...value, title: "Different stale write", provenance: [f.evidenceRef], prd_refs: [f.prdRef] },
  }), expectCode("CONFLICT"));
  assert.deepEqual(await snapshot(f.root), beforeStale);
  assert.doesNotMatch(await readFile(f.technicalDocument, "utf8"), /(?<!\r)\n/u);
  assert.equal(applied.result.task_id, null);
  assert.equal(applied.result.specification_id, null);
});
