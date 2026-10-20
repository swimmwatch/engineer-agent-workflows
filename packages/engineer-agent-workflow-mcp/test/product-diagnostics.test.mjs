import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { saveGeneration, saveObject } from "../dist/product/storage.js";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import Ajv from "ajv";
import { fileURLToPath, URL } from "node:url";

const digest = (value) => createHash("sha256").update(value).digest("hex");
const bytes = (value) => Buffer.from(`${JSON.stringify(value)}\n`);

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

async function fixture(t, {
  readyPrd = true, includePrdDecisionPin = false, includeRoadmap = true, newline = "\n", extraSubjects = [],
} = {}) {
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
    ...Object.fromEntries(extraSubjects.map((subject, index) => [`technical-design/subject-${index}.md`, `# ${subject}\n`])),
    ...(includeRoadmap ? {
      "roadmap/index.md": "# Roadmap\n\n- [Overview](overview.md)\n",
      "roadmap/overview.md": "# Overview\n\n### STAGE-0001: MVP\n\n#### Outcome\n\nValidate the shared workflow.\n",
    } : {}),
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
      id: relativePath.startsWith("technical-design/subject-") ? randomUUID() : documentIds[key],
      artifact,
      role,
      subject: relativePath.startsWith("technical-design/subject-")
        ? extraSubjects[Number(relativePath.match(/subject-([0-9]+)/u)[1])]
        : role === "navigation" ? "Index" : "Overview",
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
      ...(includeRoadmap ? [{
        ref: f.stageRef,
        semantic_type: "Stage",
        applicability: applicability("current"),
        provenance: [],
        state: "active",
      }] : []),
    ],
  };
  const registryObject = await saveObject(root, {
    productId: f.productId,
    kind: "record",
    bytes: bytes(registry),
  });
  const prdDecisionRef = { product_id: f.productId, artifact: "prd", id: randomUUID(), revision: 1 };
  const prdDecision = {
    schema_version: 1,
    kind: "decision",
    ref: prdDecisionRef,
    state: "observed",
    category: "scope",
    question: null,
    text: "The ready PRD decision is retained as evidence.",
    source: "synthetic PRD fixture",
    selected_ids: [],
    predecessors: [],
    affected_refs: [f.prdRef],
    reconsider_when: null,
    candidate_id: f.candidateId,
  };
  const savedPrdDecision = await saveObject(root, {
    productId: f.productId,
    kind: "decision",
    artifact: "prd",
    decisionId: prdDecisionRef.id,
    revision: prdDecisionRef.revision,
    bytes: bytes(prdDecision),
  });
  const base = await saveGeneration(root, {
    schema_version: 1,
    kind: "generation",
    product_id: f.productId,
    parent: null,
    registry: { id: f.registryId, object_sha256: registryObject.sha256 },
    ready_artifacts: [],
    decision_heads: [{ decision_ref: prdDecisionRef, object_sha256: savedPrdDecision.sha256 }],
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
  const prdDecisionPin = {
    product_id: f.productId,
    artifact: "prd",
    source_kind: "decision",
    source_id: prdDecisionRef.id,
    generation: base.sha256,
    object_sha256: savedPrdDecision.sha256,
    element_ids: [],
    decision_ref: prdDecisionRef,
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
      upstream_pins: [prdPin, ...(includePrdDecisionPin ? [prdDecisionPin] : [])],
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
    upstream_pins: readyPrd ? [prdPin, ...(includePrdDecisionPin ? [prdDecisionPin] : [])] : [],
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

async function connect(t, f) {
  const client = new Client({ name: "product-diagnostics-test", version: "1" });
  await client.connect(new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL("../dist/main.js", import.meta.url))],
    env: { ...process.env, EAW_PRODUCT_DATA_DIR: f.root },
    stderr: "pipe",
  }));
  t.after(() => client.close());
  return client;
}

function boundary(f) {
  return {
    context: f.context, candidate_ref: f.candidateRef, subject: "Overview",
    value: {
      title: "Workflow boundary", provenance: [f.evidenceRef],
      applicability: applicability("current"), purpose: "Own product state.",
      inputs: ["Typed requests."], outputs: ["Versioned results."],
      ownership: "The MCP owns state.", dependencies: [],
      data_flows: ["Request -> validated state."], errors: ["Reject stale requests."],
      prd_refs: [f.prdRef],
    },
  };
}

function diagnostic(response, code = "INVALID_INPUT") {
  assert.equal(response.isError, true, JSON.stringify(response));
  assert.equal(response.structuredContent.error.code, code);
  const details = response.structuredContent.error.details;
  assert.ok(Array.isArray(details?.issues), JSON.stringify(response));
  assert.ok(details.issues.length > 0 && details.issues.length <= 20);
  assert.ok(Buffer.byteLength(JSON.stringify(details)) <= 8192);
  assert.equal(typeof details.truncated, "boolean");
  return details;
}

test("product schema diagnostics report published paths, types and numeric limits through stdio", async (t) => {
  const f = await fixture(t, { includeRoadmap: false });
  const client = await connect(t, f);
  const before = await snapshot(f.root);
  const args = { context: f.context, artifact: "technical-design" };
  for (const [limit, category, bound] of [[0, "too_small", "minimum"], [51, "too_big", "maximum"], [100, "too_big", "maximum"]]) {
    const details = diagnostic(await client.callTool({ name: "product_document_list", arguments: { ...args, limit } }));
    assert.equal(details.next_action, "use_published_schema");
    const issue = details.issues.find((item) => item.path.join(".") === "limit");
    assert.equal(issue?.category, category);
    assert.equal(issue?.[bound], bound === "minimum" ? 1 : 50);
    assert.equal(issue?.limit, issue?.[bound]);
    assert.equal(issue?.minimum, 1);
    assert.equal(issue?.maximum, 50);
  }
  for (const limit of [1, 50]) {
    const result = await client.callTool({ name: "product_document_list", arguments: { ...args, limit } });
    assert.notEqual(result.isError, true, JSON.stringify(result));
  }
  const cases = [
    { name: "product_document_list", args: { ...args, limit: "100" }, path: ["limit"], category: "invalid_type", expected: "integer" },
    { name: "technical_define_boundary", args: { ...boundary(f), value: { ...boundary(f).value, inputs: 42 } }, path: ["value", "inputs"], category: "invalid_type", expected: "array" },
    { name: "technical_define_boundary", args: { ...boundary(f), candidate_ref: { product_id: f.productId } }, path: ["candidate_ref", "candidate_id"], category: "invalid_type" },
    { name: "technical_define_boundary", args: { ...boundary(f), subject: "雪".repeat(129) }, path: ["subject"], category: "too_big" },
  ];
  for (const item of cases) {
    const details = diagnostic(await client.callTool({ name: item.name, arguments: item.args }));
    const issue = details.issues.find((entry) => JSON.stringify(entry.path) === JSON.stringify(item.path));
    assert.equal(issue?.category, item.category);
    if (item.expected) assert.equal(issue.expected, item.expected);
  }
  assert.deepEqual(await snapshot(f.root), before);
});

test("product diagnostics redact arbitrary input and explicitly bound oversized error lists", async (t) => {
  const f = await fixture(t);
  const client = await connect(t, f);
  const before = await snapshot(f.root);
  const secrets = ["api_key=secret-value", "-----BEGIN PRIVATE KEY-----", "private_雪_key", "/home/private-user/secret"];
  const value = boundary(f).value;
  const input = { ...boundary(f), [secrets[2]]: secrets[0], value: {
    ...value, [secrets[3]]: secrets[1],
    inputs: Array.from({ length: 60 }, (_, index) => ({ [secrets[2]]: `${secrets[0]}-${index}` })),
  } };
  const response = await client.callTool({ name: "technical_define_boundary", arguments: input });
  const details = diagnostic(response);
  assert.equal(details.truncated, true);
  assert.equal(details.next_action, "use_published_schema");
  assert.ok(details.issues.some((issue) => issue.category === "unknown_field"));
  for (const secret of secrets) assert.ok(!JSON.stringify(response).includes(secret), secret);
  assert.deepEqual(await snapshot(f.root), before);
});

test("unknown Technical Design subjects provide candidate discovery and corrected advertised calls succeed", async (t) => {
  const f = await fixture(t, { includeRoadmap: false });
  const client = await connect(t, f);
  const tools = new Map((await client.listTools()).tools.map((tool) => [tool.name, tool]));
  const ajv = new Ajv({ allErrors: true });
  const define = boundary(f);
  const before = await snapshot(f.root);
  const response = await client.callTool({ name: "technical_define_boundary", arguments: { ...define, subject: "Architecture" } });
  const details = diagnostic(response, "NOT_FOUND");
  const issue = details.issues.find((item) => item.kind === "document_subject");
  assert.deepEqual(issue.path, ["subject"]);
  assert.equal(issue.category, "unknown");
  assert.deepEqual(issue.allowed_subjects, ["Overview"]);
  assert.equal(issue.allowed_subjects_complete, true);
  assert.equal(issue.discovery.tool, "product_document_list");
  assert.deepEqual(issue.discovery.candidate_ref, f.candidateRef);
  const discovery = { context: f.context, ...issue.discovery.arguments };
  assert.equal(ajv.validate(tools.get(issue.discovery.tool).inputSchema, discovery), true, JSON.stringify(ajv.errors));
  const documents = await client.callTool({ name: issue.discovery.tool, arguments: discovery });
  assert.notEqual(documents.isError, true, JSON.stringify(documents));
  assert.deepEqual(await snapshot(f.root), before);
  assert.match(tools.get("technical_define_boundary").inputSchema.properties.subject.description, /product_document_list/u);
  assert.match(tools.get("product_document_list").inputSchema.properties.limit.description, /1.*50/u);
  for (const [name, arguments_] of [["product_document_list", { context: f.context, artifact: "technical-design", limit: 1 }], ["technical_define_boundary", define]]) {
    assert.equal(ajv.validate(tools.get(name).inputSchema, arguments_), true, JSON.stringify(ajv.errors));
    const success = await client.callTool({ name, arguments: arguments_ });
    assert.notEqual(success.isError, true, JSON.stringify(success));
  }
  assert.notDeepEqual(await snapshot(f.root), before);
});

test("subject diagnostics preserve a bounded discovery route when registered values overflow or require redaction", async (t) => {
  const privateSubject = "api_key=private-registry-key";
  const privatePath = "/home/private-user/registered-subject";
  const subjects = Array.from({ length: 80 }, (_, index) => `Subject ${String(index).padStart(3, "0")} ${"雪".repeat(100)}`);
  const f = await fixture(t, { includeRoadmap: false, extraSubjects: [...subjects, privateSubject, privatePath] });
  const client = await connect(t, f);
  const before = await snapshot(f.root);
  const response = await client.callTool({ name: "technical_define_boundary", arguments: { ...boundary(f), subject: "Architecture" } });
  const details = diagnostic(response, "NOT_FOUND");
  const issue = details.issues[0];
  assert.equal(details.truncated, true);
  assert.equal(issue.allowed_subjects_complete, false);
  assert.equal(issue.discovery.tool, "product_document_list");
  assert.ok(issue.allowed_subjects.includes("Overview"));
  assert.ok(!JSON.stringify(response).includes(privateSubject));
  assert.ok(!JSON.stringify(response).includes(privatePath));
  let cursor;
  const discovered = [];
  do {
    const result = await client.callTool({ name: issue.discovery.tool, arguments: { context: f.context, ...issue.discovery.arguments, ...(cursor ? { cursor } : {}) } });
    assert.notEqual(result.isError, true, JSON.stringify(result));
    discovered.push(...result.structuredContent.result.items);
    cursor = result.structuredContent.result.next_cursor;
  } while (cursor);
  for (const subject of subjects) assert.ok(discovered.some((item) => item.document.subject === subject), subject);
  assert.deepEqual(await snapshot(f.root), before);
});

test("subject diagnostics suppress embedded personal paths and recognizable standalone credentials", async (t) => {
  const unsafeSubjects = [
    "Notes /home/private-user/work",
    "Notes C:\\Users\\private-user\\work",
    "Owner ~/private",
    "sk-proj-synthetic_private_fixture_key_1234567890",
    "Bearer synthetic-private-fixture-token",
    "Notes:/home/example-user/secret",
    "Notes[C:\\Users\\example-user\\secret]",
    "Owner:~/private",
    "Prefix/home/example-user/secret",
    "Token:sk-proj-synthetic_private_fixture_key_1234567890",
    "Credential[Bearer synthetic-private-fixture-token]",
    "Credential(api_key=synthetic-value)",
    "Token_sk-proj-synthetic_private_fixture_key_1234567890",
    "Credential_Bearer synthetic-private-fixture-token",
  ];
  const safeSubjects = ["Overview", "Границы компонентов", "Input / Output"];
  for (const subject of unsafeSubjects) {
    await t.test(subject, async (t) => {
      const f = await fixture(t, { includeRoadmap: false, extraSubjects: [subject, ...safeSubjects.slice(1)] });
      const client = await connect(t, f);
      const before = await snapshot(f.root);
      const response = await client.callTool({ name: "technical_define_boundary", arguments: { ...boundary(f), subject: "Architecture" } });
      const details = diagnostic(response, "NOT_FOUND");
      assert.ok(!JSON.stringify(response).includes(JSON.stringify(subject).slice(1, -1)), "Unsafe registry text must not be reflected in diagnostics.");
      assert.equal(details.truncated, true);
      const issue = details.issues[0];
      assert.equal(issue.allowed_subjects_complete, false);
      assert.deepEqual(issue.allowed_subjects, [...safeSubjects].sort());
      assert.equal(issue.discovery.tool, "product_document_list");
      const discovery = await client.callTool({ name: issue.discovery.tool, arguments: { context: f.context, ...issue.discovery.arguments } });
      assert.notEqual(discovery.isError, true, JSON.stringify(discovery));
      assert.deepEqual(await snapshot(f.root), before);
    });
  }
});
