import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import test from "node:test";
import * as contextOperations from "../dist/product/context.js";

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

async function fixture(t, { taskText = "Select exact inputs." } = {}) {
  const base = await mkdtemp(join(tmpdir(), "eaw-product-context-"));
  t.after(() => rm(base, { recursive: true, force: true }));
  const root = join(base, "product-data");
  const workspace = join(base, "workspace café '[source]'");
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
    roadmap: `# Roadmap\n\n### TASK-0001: Implement backend context\n\n#### Scope\n\n${taskText}\n\n### TASK-0002: Preserve immutable evidence\n\n#### Scope\n\nRetain required sources.\n\n### TASK-0003: Redesign dashboard\n\n#### Scope\n\nUnrelated UI work.\n`,
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
    historicalPath: historicalObject.relativePath,
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

test("exact source batches preserve portions, byte bounds and query-bound continuations", async (t) => {
  const f = await fixture(t);
  const selection = await prepareProductContext({
    root: f.root, context: f.context, purpose: "implementation", taskId: f.refs.task.element_id,
    budgetBytes: 16_384,
  });
  const pin = selection.result.required.find((candidate) => candidate.element_ids.includes(f.refs.task.element_id));
  const requests = [
    { element_ref: f.refs.task, pin },
    ...Array.from({ length: 19 }, () => ({ decision_ref: f.historicalRef })),
  ];
  const expected = await readProductDecision({ root: f.root, context: f.context, decisionRef: f.historicalRef });
  let cursor;
  const items = [];
  let firstCursor;
  do {
    const page = await contextOperations.readProductSourcesBatch({ root: f.root, context: f.context, requests, cursor });
    assert.ok(Buffer.byteLength(JSON.stringify(page.result)) <= 24 * 1024);
    assert.ok(Buffer.byteLength(JSON.stringify({ content: [{ type: "text", text: JSON.stringify(page) }], structuredContent: page })) <= 64 * 1024);
    assert.ok(page.result.items.length > 0);
    items.push(...page.result.items);
    firstCursor ??= page.result.next_cursor;
    cursor = page.result.next_cursor ?? undefined;
    assert.equal(page.result.complete, cursor === undefined);
  } while (cursor !== undefined);
  assert.deepEqual(items.map((item) => item.index), requests.map((_, index) => index));
  assert.match(items[0].portion.text, /### TASK-0001/u);
  for (const item of items.slice(1)) assert.deepEqual(item.portion, expected.result);
  assert.ok(firstCursor);
  const reorderFields = (value) => {
    if (Array.isArray(value)) return value.map(reorderFields);
    if (value === null || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value).toReversed().map(([key, entry]) => [key, reorderFields(entry)]));
  };
  const reordered = await contextOperations.readProductSourcesBatch({
    root: f.root, context: f.context, requests: reorderFields(requests), cursor: firstCursor,
  });
  assert.deepEqual(reordered.result.items, items.slice(reordered.result.items[0].index, reordered.result.items.at(-1).index + 1));
  const decisionContinuation = await readProductDecision({
    root: f.root, context: f.context, decisionRef: reorderFields(f.historicalRef), cursor: expected.result.next_cursor,
  });
  assert.equal(decisionContinuation.result.offset, Array.from(expected.result.text).length);
  await assert.rejects(contextOperations.readProductSourcesBatch({
    root: f.root, context: f.context, requests: requests.toReversed(), cursor: firstCursor,
  }), expectCode("STALE_CURSOR"));
  await assert.rejects(contextOperations.readProductSourcesBatch({
    root: f.root, context: f.context, requests: [],
  }), expectCode("INVALID_INPUT"));
  await assert.rejects(contextOperations.readProductSourcesBatch({
    root: f.root, context: f.context,
    requests: [{ element_ref: f.refs.unrelatedTask, pin }],
  }), expectCode("BROKEN_REFERENCE"));
  const continued = await contextOperations.readProductSourcesBatch({
    root: f.root, context: f.context,
    requests: [{ decision_ref: f.historicalRef, cursor: expected.result.next_cursor }],
  });
  assert.equal(continued.result.items[0].portion.offset, Array.from(expected.result.text).length);
  await writeFile(join(f.root, f.historicalPath), "corrupt retained decision\n");
  await assert.rejects(contextOperations.readProductSourcesBatch({
    root: f.root, context: f.context, requests: [{ decision_ref: f.historicalRef }],
  }), (error) => ["SOURCE_CHANGED", "INVALID_STATE"].includes(error?.code));
});

test("element continuations preserve Unicode ranges when JSON fields are reordered", async (t) => {
  const taskText = "Exact source 👩‍💻 — данные. ".repeat(500);
  const f = await fixture(t, { taskText });
  const selection = await prepareProductContext({ root: f.root, context: f.context, purpose: "implementation", taskId: f.refs.task.element_id });
  const pin = selection.result.required.find((candidate) => candidate.element_ids.includes(f.refs.task.element_id));
  const first = await readProductElement({ root: f.root, context: f.context, elementRef: f.refs.task, pin });
  assert.equal(first.result.complete, false);
  let cursor = first.result.next_cursor;
  let text = first.result.text;
  while (cursor !== null) {
    const next = await readProductElement({
      root: f.root, context: f.context,
      elementRef: Object.fromEntries(Object.entries(f.refs.task).toReversed()),
      pin: Object.fromEntries(Object.entries(pin).toReversed()), cursor,
    });
    assert.equal(next.result.offset, Array.from(text).length);
    text += next.result.text;
    cursor = next.result.next_cursor;
  }
  assert.equal(text, `\n### TASK-0001: Implement backend context\n\n#### Scope\n\n${taskText}\n\n`);
});

test("packet roots exclude unrelated task dependencies but retain provenance and global policies", async (t) => {
  const f = await fixture(t);
  const selection = await prepareProductContext({
    root: f.root, context: f.context, purpose: "implementation", taskId: f.refs.task.element_id,
    packetId: "P01", packetRefs: [f.refs.boundary], budgetBytes: 1024,
  });
  const pages = [selection.result];
  while (pages.at(-1).next_cursor !== null) {
    pages.push((await readContextPage({ root: f.root, context: f.context, cursor: pages.at(-1).next_cursor })).result);
  }
  const pins = pages.flatMap((page) => page.required);
  const ids = new Set(pins.flatMap((pin) => pin.element_ids));
  assert.deepEqual(ids, new Set([f.refs.task, f.refs.boundary, f.refs.goal, f.refs.constraint, f.refs.policy].map((ref) => ref.element_id)));
  assert.ok(pins.some((pin) => pin.decision_ref?.revision === f.historicalRef.revision));
  assert.ok(pins.some((pin) => pin.decision_ref?.revision === f.currentRef.revision));
});

test("source batches expose a read-only typed tool and measure the same exact reads", async (t) => {
  const f = await fixture(t);
  const requests = Array.from({ length: 20 }, () => ({ decision_ref: f.currentRef }));
  const individualStart = performance.now();
  const individual = [];
  for (const request of requests) individual.push((await readProductDecision({ root: f.root, context: f.context, decisionRef: request.decision_ref })).result);
  const individualMs = performance.now() - individualStart;
  const tool = workflowTools.find((candidate) => candidate.name === "product_sources_get_batch");
  assert.ok(tool);
  assert.equal(tool.write, false);
  assert.equal(tool.destructive, false);
  const previousRoot = process.env.EAW_PRODUCT_DATA_DIR;
  process.env.EAW_PRODUCT_DATA_DIR = f.root;
  t.after(() => {
    if (previousRoot === undefined) delete process.env.EAW_PRODUCT_DATA_DIR;
    else process.env.EAW_PRODUCT_DATA_DIR = previousRoot;
  });
  const batchStart = performance.now();
  let batch = await tool.run({ context: f.context, requests });
  const items = [...batch.result.items];
  let pages = 1;
  while (batch.result.next_cursor !== null) {
    batch = await tool.run({ context: f.context, requests, cursor: batch.result.next_cursor });
    items.push(...batch.result.items);
    pages++;
  }
  const batchMs = performance.now() - batchStart;
  assert.equal(batch.result.complete, true);
  assert.deepEqual(items.map((item) => item.portion), individual);
  await assert.rejects(tool.run({ context: f.context, requests: [...requests, requests[0]] }), expectCode("INVALID_INPUT"));
  t.diagnostic(JSON.stringify({ records: requests.length, pages, individual_ms: Math.round(individualMs), batch_ms: Math.round(batchMs), scope: "synthetic server reads; excludes model time" }));
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
