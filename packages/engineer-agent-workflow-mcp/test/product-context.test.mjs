import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  findProductDecisions,
  findProductElements,
  prepareProductContext,
  readContextPage,
  readProductDecision,
  readProductElement,
} from "../dist/product/context.js";
import { saveGeneration, saveObject } from "../dist/product/storage.js";
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

async function fixture(t) {
  const base = await mkdtemp(join(tmpdir(), "eaw-product-context-"));
  t.after(() => rm(base, { recursive: true, force: true }));
  const root = join(base, "product-data");
  const workspace = join(base, "workspace");
  await mkdir(root, { recursive: true });
  await mkdir(workspace, { recursive: true });

  const productId = randomUUID();
  const registryId = randomUUID();
  const refs = {
    task: { product_id: productId, artifact: "roadmap", element_id: "TASK-0001" },
    dependency: { product_id: productId, artifact: "roadmap", element_id: "TASK-0002" },
    unrelatedTask: { product_id: productId, artifact: "roadmap", element_id: "TASK-0003" },
    goal: { product_id: productId, artifact: "prd", element_id: "PRD-0001" },
    constraint: { product_id: productId, artifact: "prd", element_id: "PRD-0002" },
    unrelatedUi: { product_id: productId, artifact: "prd", element_id: "PRD-0003" },
    boundary: { product_id: productId, artifact: "technical-design", element_id: "TD-0001" },
    policy: { product_id: productId, artifact: "technical-design", element_id: "TD-0002" },
  };
  const historicalRef = { product_id: productId, artifact: "roadmap", id: randomUUID(), revision: 1 };
  const currentRef = { ...historicalRef, revision: 2 };
  const largeText = Array.from({ length: 300 }, (_, index) => `line-${String(index).padStart(5, "0")}-данные`).join("\n");
  const historicalDecision = {
    schema_version: 1,
    kind: "decision",
    ref: historicalRef,
    state: "answered",
    category: "context-selection",
    question: null,
    text: largeText,
    source: "synthetic fixture",
    selected_ids: [],
    predecessors: [],
    affected_refs: [refs.task],
    reconsider_when: null,
    candidate_id: randomUUID(),
  };
  const currentDecision = {
    ...historicalDecision,
    ref: currentRef,
    text: "Current context selection decision.",
    predecessors: [historicalRef],
  };
  const historicalObject = await saveObject(root, {
    productId, kind: "decision", artifact: "roadmap",
    decisionId: historicalRef.id, revision: historicalRef.revision, bytes: bytes(historicalDecision),
  });
  const currentObject = await saveObject(root, {
    productId, kind: "decision", artifact: "roadmap",
    decisionId: currentRef.id, revision: currentRef.revision, bytes: bytes(currentDecision),
  });
  const fillerHeads = [];
  let decisionHistoryLines = largeText.split("\n").length;
  for (let index = 0; index < 100; index += 1) {
    const ref = { product_id: productId, artifact: "prd", id: randomUUID(), revision: 1 };
    const text = Array.from({ length: 100 }, (_, line) => `filler-${String(index).padStart(3, "0")}-${String(line).padStart(3, "0")}`).join("\n");
    decisionHistoryLines += text.split("\n").length;
    const saved = await saveObject(root, {
      productId, kind: "decision", artifact: "prd", decisionId: ref.id, revision: ref.revision,
      bytes: bytes({
        ...historicalDecision, ref, text, category: "unrelated-history", affected_refs: [], predecessors: [],
      }),
    });
    fillerHeads.push({ decision_ref: ref, object_sha256: saved.sha256 });
  }

  const sources = {
    idea: "# Idea\n\nEstablished problem: preserve exact context.\n",
    prd: "# Product Definition\n\n### PRD-0001: Reliable delivery\n\n#### Outcome\n\nBackend work remains traceable.\n\n### PRD-0002: Global privacy boundary\n\n#### Constraint\n\nNever expose unrelated history.\n\n### PRD-0003: UI dashboard\n\n#### Capability\n\nRender visual analytics.\n",
    technical: "# Technical Design\n\n### TD-0001: Context service\n\n#### Purpose\n\nSelect exact backend inputs.\n\n### TD-0002: Global failure policy\n\n#### Policy\n\nFail closed on missing evidence.\n",
    roadmap: "# Roadmap\n\n### TASK-0001: Implement backend context\n\n#### Scope\n\nSelect exact inputs.\n\n### TASK-0002: Preserve immutable evidence\n\n#### Scope\n\nRetain required sources.\n\n### TASK-0003: Redesign dashboard\n\n#### Scope\n\nUnrelated UI work.\n",
  };
  const artifacts = {
    idea: "idea",
    prd: "prd",
    technical: "technical-design",
    roadmap: "roadmap",
  };
  const documents = [];
  for (const [name, source] of Object.entries(sources)) {
    const saved = await saveObject(root, { productId, kind: "markdown", bytes: Buffer.from(source) });
    documents.push({
      id: randomUUID(), artifact: artifacts[name], role: "semantic", subject: `${name} source`,
      relative_path: `${artifacts[name]}/source.md`, object_sha256: saved.sha256,
    });
  }
  const applicability = (global) => ({
    state: "current", stage_refs: [], global, reason: global ? "Applies across stages." : "Applies to selected work.",
  });
  const metadata = [
    [refs.task, "Task", false, [historicalRef]],
    [refs.dependency, "Task", false, []],
    [refs.unrelatedTask, "Task", false, []],
    [refs.goal, "PrdGoal", false, []],
    [refs.constraint, "PrdConstraint", true, [currentRef]],
    [refs.unrelatedUi, "PrdCapability", false, []],
    [refs.boundary, "TechnicalBoundary", false, []],
    [refs.policy, "TechnicalPolicy", true, []],
  ].map(([ref, semantic_type, global, provenance]) => ({
    ref, semantic_type, applicability: applicability(global), provenance, state: "active",
  }));
  const registry = { schema_version: 1, kind: "registry", product_id: productId, documents, element_metadata: metadata };
  const registryObject = await saveObject(root, { productId, kind: "record", bytes: bytes(registry) });
  const relations = [
    { from: refs.task, kind: "depends_on", to: refs.dependency },
    { from: refs.task, kind: "derived_from", to: refs.boundary },
    { from: refs.dependency, kind: "derived_from", to: refs.goal },
    { from: refs.boundary, kind: "derived_from", to: refs.goal },
  ];
  const first = await saveGeneration(root, {
    schema_version: 1, kind: "generation", product_id: productId, parent: null,
    registry: { id: registryId, object_sha256: registryObject.sha256 },
    ready_artifacts: [],
    decision_heads: [{ decision_ref: historicalRef, object_sha256: historicalObject.sha256 }],
    relations,
  });
  const pin = (artifact, elementIds) => {
    const document = documents.find((candidate) => candidate.artifact === artifact);
    return {
      product_id: productId, artifact, source_kind: "markdown", source_id: document.id,
      generation: first.sha256, object_sha256: document.object_sha256,
      element_ids: elementIds, decision_ref: null,
    };
  };
  const second = await saveGeneration(root, {
    schema_version: 1, kind: "generation", product_id: productId, parent: first.sha256,
    registry: { id: registryId, object_sha256: registryObject.sha256 },
    ready_artifacts: [
      { artifact: "prd", source_version: digest("ready-prd"), review_id: randomUUID(), upstream_pins: [] },
      { artifact: "technical-design", source_version: digest("ready-technical"), review_id: randomUUID(), upstream_pins: [pin("prd", [refs.goal.element_id, refs.constraint.element_id])] },
      { artifact: "roadmap", source_version: digest("ready-roadmap"), review_id: randomUUID(), upstream_pins: [pin("prd", [refs.goal.element_id, refs.constraint.element_id]), pin("technical-design", [refs.boundary.element_id, refs.policy.element_id])] },
    ],
    decision_heads: [{ decision_ref: currentRef, object_sha256: currentObject.sha256 }, ...fillerHeads],
    relations,
  });
  const context = Buffer.from(JSON.stringify({
    contract: "product-1", store_id: randomUUID(), product_id: productId, workspace_id: randomUUID(),
    candidate_ref: null, selected_sources_sha256: digest(`selection:${second.sha256}`),
    target_revision: second.sha256, canonical_workspace: workspace,
  })).toString("base64url");
  return {
    root, context, productId, refs, historicalRef, currentRef,
    historicalBytes: bytes(historicalDecision).toString("utf8"), sourceVersion: second.sha256,
    decisionHistoryLines,
  };
}

test("P10 publishes six read-only exact-context tools", () => {
  const expected = [
    "product_context_next", "product_context_prepare", "product_decision_find",
    "product_decision_get", "product_element_find", "product_element_get",
  ];
  const tools = workflowTools.filter((tool) => expected.includes(tool.name));
  assert.deepEqual(tools.map((tool) => tool.name).sort(), expected);
  for (const tool of tools) {
    assert.equal(tool.schemaKind, "json");
    assert.equal(tool.inputSchema.type, "object");
    assert.equal(tool.outputSchema.type, "object");
    assert.equal(tool.write, false);
    assert.equal(tool.destructive, false);
  }
});

test("Q22: task context returns only transitive inputs and applicable global constraints", async (t) => {
  const f = await fixture(t);
  const first = await prepareProductContext({
    root: f.root, context: f.context, purpose: "implementation", taskId: f.refs.task.element_id,
    budgetBytes: 1024,
  });
  const repeat = await prepareProductContext({
    root: f.root, context: f.context, purpose: "implementation", taskId: f.refs.task.element_id,
    budgetBytes: 1024,
  });
  assert.deepEqual(repeat.result, first.result);
  const pages = [first.result];
  let cursor = first.result.next_cursor;
  while (cursor !== null) {
    const page = await readContextPage({ root: f.root, context: f.context, cursor });
    pages.push(page.result);
    cursor = page.result.next_cursor;
  }
  const selectedIds = new Set(pages.flatMap((page) => [...page.required, ...page.optional])
    .flatMap((pin) => pin.element_ids));
  for (const required of [f.refs.task, f.refs.dependency, f.refs.goal, f.refs.constraint, f.refs.boundary, f.refs.policy]) {
    assert.equal(selectedIds.has(required.element_id), true, required.element_id);
  }
  assert.equal(selectedIds.has(f.refs.unrelatedTask.element_id), false);
  assert.equal(selectedIds.has(f.refs.unrelatedUi.element_id), false);
  assert.equal(pages.at(-1).complete, true);
  assert.equal(pages.every((page) => page.blockers.length === 0), true);
  assert.equal(pages.every((page) => page.source_version === f.sourceVersion), true);
  assert.equal(JSON.stringify(pages).includes("line-00001"), false);
  assert.equal(pages.every((page) => Buffer.byteLength(JSON.stringify(page)) <= 16_384), true);

  await assert.rejects(readContextPage({
    root: f.root,
    context: Buffer.from(JSON.stringify({
      ...JSON.parse(Buffer.from(f.context, "base64url").toString("utf8")),
      target_revision: digest("another-generation"),
    })).toString("base64url"),
    cursor: first.result.next_cursor,
  }), expectCode("STALE_CURSOR"));
});

test("Q23: exact element and historical decision reads are bounded and source-bound", async (t) => {
  const f = await fixture(t);
  assert.equal(f.decisionHistoryLines >= 10_000, true);
  const found = await findProductElements({ root: f.root, context: f.context, artifact: "prd", text: "reliable", limit: 1 });
  assert.deepEqual(found.result.items.map((item) => item.ref.element_id), [f.refs.goal.element_id]);

  const selection = await prepareProductContext({
    root: f.root, context: f.context, purpose: "implementation", taskId: f.refs.task.element_id,
    budgetBytes: 16_384,
  });
  const taskPin = selection.result.required.find((pin) => pin.element_ids.includes(f.refs.task.element_id));
  const element = await readProductElement({ root: f.root, context: f.context, elementRef: f.refs.task, pin: taskPin });
  assert.match(element.result.text, /### TASK-0001: Implement backend context/u);
  assert.doesNotMatch(element.result.text, /TASK-0002|Redesign dashboard/u);

  const decisions = await findProductDecisions({
    root: f.root, context: f.context, artifact: "roadmap", text: "current context", limit: 20,
  });
  assert.deepEqual(decisions.result.items.map((item) => item.decision_ref), [f.currentRef]);

  const portions = [];
  let portion = await readProductDecision({ root: f.root, context: f.context, decisionRef: f.historicalRef });
  const firstPortion = portion.result;
  while (true) {
    portions.push(portion.result.text);
    assert.equal(Array.from(portion.result.text).length <= 4096, true);
    assert.equal(portion.result.pin.decision_ref.revision, f.historicalRef.revision);
    if (portion.result.next_cursor === null) break;
    portion = await readProductDecision({
      root: f.root, context: f.context, decisionRef: f.historicalRef, cursor: portion.result.next_cursor,
    });
  }
  assert.equal(portions.join(""), f.historicalBytes);
  const afterRestart = await readProductDecision({ root: f.root, context: f.context, decisionRef: f.historicalRef });
  assert.deepEqual(afterRestart.result, firstPortion);
  await assert.rejects(readProductDecision({
    root: f.root, context: f.context, decisionRef: f.historicalRef, cursor: element.result.next_cursor,
  }), expectCode("STALE_CURSOR"));
});
