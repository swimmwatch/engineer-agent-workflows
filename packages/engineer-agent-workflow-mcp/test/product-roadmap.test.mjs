import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { link, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  defineRoadmapElement,
  linkRoadmapDependency,
  recordRoadmapStageOutcome,
  retireRoadmapTask,
  splitRoadmapTask,
  unlinkRoadmapDependency,
} from "../dist/product/roadmap.js";
import { readObject, saveGeneration, saveObject } from "../dist/product/storage.js";
import {
  activateAmendment, checkProductCandidate, completeProductReview, readProductReviewConsistency, readProductReviewItem,
  recordProductReviewConsistency, recordProductVerdict, startProductReview,
} from "../dist/product/review.js";
import { renameProductDocument } from "../dist/product/documents.js";
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
  const directory = await mkdtemp(join(tmpdir(), "eaw-product-roadmap-"));
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

function applicability(state = "current", stageRefs = []) {
  return {
    state,
    stage_refs: stageRefs,
    global: stageRefs.length === 0,
    reason: stageRefs.length === 0 ? "Applies to the shared product." : "Applies to the named roadmap stages.",
  };
}

async function fixture(t, {
  readyInputs = true,
  answerState = "answered",
  answerStoredRef = null,
  answerAffectedRefs = null,
  answerTaskIds = ["TASK-0002", "TASK-0003"],
  newline = "\n",
  roadmapPath = "roadmap/overview.md",
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
  };
  f.actorRef = { product_id: f.productId, artifact: "prd", element_id: "PRD-0001" };
  f.goalRef = { product_id: f.productId, artifact: "prd", element_id: "PRD-0002" };
  f.unpinnedGoalRef = { product_id: f.productId, artifact: "prd", element_id: "PRD-0003" };
  f.technicalRef = { product_id: f.productId, artifact: "technical-design", element_id: "TD-0001" };
  f.answerRef = { product_id: f.productId, artifact: "roadmap", id: randomUUID(), revision: 1 };

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
    "prd/overview.md": "# Overview\n\n### PRD-0001: Operator\n\n#### Role\n\nMaintains the workflow.\n\n### PRD-0002: Reliable delivery\n\n#### Outcome\n\nChanges remain traceable.\n\n### PRD-0003: Unpinned outcome\n\n#### Outcome\n\nThis goal is intentionally outside the selected source pin.\n",
    "technical-design/index.md": "# Technical Design\n\n- [Overview](overview.md)\n",
    "technical-design/overview.md": "# Overview\n\n### TD-0001: Workflow boundary\n\n#### Purpose\n\nOwn product workflow state.\n",
    "roadmap/index.md": "# Roadmap\n\n- [Overview](overview.md)\n",
    "roadmap/overview.md": "# Overview\n",
  };
  if (roadmapPath !== "roadmap/overview.md") {
    sources[roadmapPath] = sources["roadmap/overview.md"];
    delete sources["roadmap/overview.md"];
    sources["roadmap/index.md"] = `# Roadmap\n\n- [Overview](${roadmapPath.split("/").at(-1)})\n`;
  }
  for (const path of Object.keys(sources)) sources[path] = sources[path].replaceAll("\n", newline);
  const documents = [];
  for (const [relativePath, source] of Object.entries(sources)) {
    const saved = await saveObject(root, { productId: f.productId, kind: "markdown", bytes: Buffer.from(source) });
    const artifact = relativePath.startsWith("prd/")
      ? "prd"
      : relativePath.startsWith("technical-design/") ? "technical-design" : "roadmap";
    const role = relativePath.endsWith("index.md") ? "navigation" : "semantic";
    const prefix = artifact === "technical-design" ? "technical" : artifact;
    const key = `${prefix}${role === "navigation" ? "Index" : "Overview"}`;
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
      { ref: f.actorRef, semantic_type: "PrdActor", applicability: applicability(), provenance: [], state: "active" },
      { ref: f.goalRef, semantic_type: "PrdGoal", applicability: applicability(), provenance: [], state: "active" },
      { ref: f.unpinnedGoalRef, semantic_type: "PrdGoal", applicability: applicability(), provenance: [], state: "active" },
      { ref: f.technicalRef, semantic_type: "TechnicalBoundary", applicability: applicability(), provenance: [], state: "active" },
    ],
  };
  const registryObject = await saveObject(root, { productId: f.productId, kind: "record", bytes: bytes(registry) });
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
  const sourcePin = (artifact, documentId, elementIds) => {
    const document = documents.find((item) => item.id === documentId);
    return {
      product_id: f.productId,
      artifact,
      source_kind: "markdown",
      source_id: document.id,
      generation: base.sha256,
      object_sha256: document.object_sha256,
      element_ids: elementIds,
      decision_ref: null,
    };
  };
  const upstreamPins = readyInputs ? [
    sourcePin("prd", documentIds.prdOverview, [f.actorRef.element_id, f.goalRef.element_id]),
    sourcePin("technical-design", documentIds.technicalOverview, [f.technicalRef.element_id]),
  ] : [];
  const generation = readyInputs ? await saveGeneration(root, {
    schema_version: 1,
    kind: "generation",
    product_id: f.productId,
    parent: base.sha256,
    registry: { id: f.registryId, object_sha256: registryObject.sha256 },
    ready_artifacts: [
      { artifact: "prd", source_version: digest("ready prd"), review_id: randomUUID(), upstream_pins: [] },
      { artifact: "technical-design", source_version: digest("ready technical design"), review_id: randomUUID(), upstream_pins: [] },
    ],
    decision_heads: [],
    relations: [],
  }) : base;
  const decision = {
    schema_version: 1,
    kind: "decision",
    ref: answerStoredRef ?? f.answerRef,
    state: answerState,
    category: "roadmap",
    question: null,
    text: "Split the delivery task into independently verifiable outcomes.",
    source: "synthetic customer answer",
    selected_ids: [],
    predecessors: [],
    affected_refs: answerAffectedRefs ?? answerTaskIds.map((element_id) => ({ product_id: f.productId, artifact: "roadmap", element_id })),
    reconsider_when: null,
    candidate_id: f.candidateId,
  };
  const savedDecision = await saveObject(root, {
    productId: f.productId,
    kind: "decision",
    artifact: "roadmap",
    decisionId: f.answerRef.id,
    revision: f.answerRef.revision,
    bytes: bytes(decision),
  });
  const candidateWithoutVersion = {
    schema_version: 1,
    kind: "candidate",
    product_id: f.productId,
    candidate_id: f.candidateId,
    artifact: "roadmap",
    base_generation: generation.sha256,
    workspace_id: f.workspaceId,
    state: "draft",
    scope: {
      depth: "standard",
      profiles: [{ id: "core", reason: "Roadmap ownership and traceability." }],
      rationale: ["Synthetic Q20 and Q21 scenarios."],
      confirmed_answer: null,
    },
    registry: { id: f.registryId, object_sha256: registryObject.sha256 },
    upstream_pins: upstreamPins,
    decision_heads: [{ decision_ref: f.answerRef, object_sha256: savedDecision.sha256 }],
    relations: [],
  };
  const candidate = { ...candidateWithoutVersion, source_version: candidateVersion(candidateWithoutVersion) };
  const draft = join(root, "products", f.productId, "drafts", f.candidateId);
  for (const [relativePath, source] of Object.entries(sources)) {
    await mkdir(join(draft, "documents", relativePath.split("/")[0]), { recursive: true });
    await writeFile(join(draft, "documents", relativePath), source);
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
  f.roadmapDocument = join(draft, "documents", ...roadmapPath.split("/"));
  return f;
}

function stageValue(title, position) {
  return {
    title,
    provenance: [],
    applicability: applicability(),
    outcome: `${title} produces an independently observable product outcome.`,
    verification: "Inspect integrated product evidence against the stage outcome.",
    scope: ["Selected roadmap work."],
    exclusions: ["Unrelated future work."],
    entry: ["Required product inputs are ready."],
    exit: ["Integrated outcome evidence is recorded."],
    risks: ["Incomplete evidence could mask a partial result."],
    position,
  };
}

function taskValue(f, title, stageRef, { kind = "technical", epicRef = null, storyRef = null } = {}) {
  return {
    title,
    provenance: [],
    applicability: applicability("accepted_target", [stageRef]),
    outcome: `${title} has one independently verifiable outcome.`,
    kind,
    stage_ref: stageRef,
    epic_ref: epicRef,
    story_ref: storyRef,
    upstream_refs: [f.goalRef, f.technicalRef],
    scope: ["One bounded delivery result."],
    non_goals: ["Creating a task specification during roadmap authoring."],
    acceptance: ["The result is independently verified."],
  };
}

test("P09 publishes strict roadmap scenario tools", () => {
  const expected = [
    "roadmap_define_epic",
    "roadmap_define_stage",
    "roadmap_define_story",
    "roadmap_define_task",
    "roadmap_link_dependency",
    "roadmap_record_stage_outcome",
    "roadmap_retire_task",
    "roadmap_split_task",
    "roadmap_unlink_dependency",
  ];
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

test("Q20: roadmap identities survive renaming and model cross-stage and technical work", async (t) => {
  const f = await fixture(t);
  const first = await defineRoadmapElement({
    root: f.root, context: f.context, candidateRef: f.candidateRef, subject: "Overview",
    semanticType: "Stage", value: stageValue("MVP 1", 0),
  });
  const firstRef = first.result.changed_refs[0];
  assert.equal(firstRef.element_id, "STAGE-0001");
  const second = await defineRoadmapElement({
    root: f.root, context: first.context, candidateRef: f.candidateRef, subject: "Overview",
    semanticType: "Stage", value: stageValue("MVP 2", 1),
  });
  const secondRef = second.result.changed_refs[0];
  const later = await defineRoadmapElement({
    root: f.root, context: second.context, candidateRef: f.candidateRef, subject: "Overview",
    semanticType: "Stage", value: stageValue("Operational scale", 2),
  });
  const laterRef = later.result.changed_refs[0];
  const renamed = await defineRoadmapElement({
    root: f.root, context: later.context, candidateRef: f.candidateRef, subject: "Overview",
    semanticType: "Stage", elementRef: firstRef, value: stageValue("Pilot", 2),
  });
  assert.deepEqual(renamed.result.changed_refs, [firstRef]);

  const epic = await defineRoadmapElement({
    root: f.root, context: renamed.context, candidateRef: f.candidateRef, subject: "Overview",
    semanticType: "Epic",
    value: {
      title: "Traceable delivery", provenance: [], applicability: applicability("accepted_target", [firstRef, secondRef]),
      outcome: "Delivery state remains traceable across stages.", goal_refs: [f.goalRef],
      stage_refs: [firstRef, secondRef], acceptance: ["Both stages expose exact evidence."],
    },
  });
  const epicRef = epic.result.changed_refs[0];
  await assert.rejects(defineRoadmapElement({
    root: f.root, context: epic.context, candidateRef: f.candidateRef, subject: "Overview",
    semanticType: "Story",
    value: {
      title: "Inconsistent later story", provenance: [], applicability: applicability("accepted_target", [laterRef]),
      actor_ref: f.actorRef, intent: "use a later stage", value: "without changing the epic",
      epic_ref: epicRef, stage_refs: [laterRef], acceptance: ["This inconsistent link must be rejected."],
    },
  }), expectCode("INVALID_INPUT"));
  const story = await defineRoadmapElement({
    root: f.root, context: epic.context, candidateRef: f.candidateRef, subject: "Overview",
    semanticType: "Story",
    value: {
      title: "Inspect delivery", provenance: [], applicability: applicability("accepted_target", [firstRef, secondRef]),
      actor_ref: f.actorRef, intent: "inspect the selected delivery", value: "understand its verified state",
      epic_ref: epicRef, stage_refs: [firstRef, secondRef], acceptance: ["Exact evidence is visible."],
    },
  });
  const storyRef = story.result.changed_refs[0];
  const technical = await defineRoadmapElement({
    root: f.root, context: story.context, candidateRef: f.candidateRef, subject: "Overview",
    semanticType: "Task", value: taskValue(f, "Implement durable identities", firstRef, { epicRef }),
  });
  assert.equal(technical.result.changed_refs[0].element_id, "TASK-0001");
  assert.equal(technical.result.specification_id, null);
  const feature = await defineRoadmapElement({
    root: f.root, context: technical.context, candidateRef: f.candidateRef, subject: "Overview",
    semanticType: "Task",
    value: taskValue(f, "Expose delivery state", secondRef, { kind: "feature", epicRef, storyRef }),
  });
  await assert.rejects(defineRoadmapElement({
    root: f.root, context: feature.context, candidateRef: f.candidateRef, subject: "Overview",
    semanticType: "Epic", elementRef: epicRef,
    value: {
      title: "Traceable delivery", provenance: [], applicability: applicability("accepted_target", [secondRef]),
      outcome: "Delivery state remains traceable across stages.", goal_refs: [f.goalRef],
      stage_refs: [secondRef], acceptance: ["Both stages expose exact evidence."],
    },
  }), expectCode("CONFLICT"));
  await assert.rejects(defineRoadmapElement({
    root: f.root, context: feature.context, candidateRef: f.candidateRef, subject: "Overview",
    semanticType: "Story", elementRef: storyRef,
    value: {
      title: "Inspect delivery", provenance: [], applicability: applicability("accepted_target", [firstRef]),
      actor_ref: f.actorRef, intent: "inspect the selected delivery", value: "understand its verified state",
      epic_ref: epicRef, stage_refs: [firstRef], acceptance: ["Exact evidence is visible."],
    },
  }), expectCode("CONFLICT"));
  const future = await defineRoadmapElement({
    root: f.root, context: feature.context, candidateRef: f.candidateRef, subject: "Overview",
    semanticType: "Task", value: taskValue(f, "Explore later scaling", laterRef, { kind: "research" }),
  });
  assert.equal(future.result.specification_id, null);
  assert.equal(future.result.next.includes("specification"), true);

  const source = await readFile(f.roadmapDocument, "utf8");
  assert.match(source, /### STAGE-0001: Pilot/u);
  assert.doesNotMatch(source, /### STAGE-0001: MVP 1/u);
  const candidate = JSON.parse(await readFile(f.candidatePath, "utf8"));
  assert.ok(candidate.relations.some((relation) => relation.from.element_id === epicRef.element_id
    && relation.kind === "scheduled_in" && relation.to.element_id === secondRef.element_id));
  assert.ok(candidate.relations.some((relation) => relation.from.element_id === storyRef.element_id
    && relation.kind === "belongs_to" && relation.to.element_id === epicRef.element_id));
  assert.equal(candidate.relations.some((relation) => relation.from.element_id === technical.result.changed_refs[0].element_id
    && relation.kind === "belongs_to" && relation.to.artifact === "roadmap" && relation.to.element_id.startsWith("STORY-")), false);
  assert.deepEqual((await snapshot(f.root)).filter(([path]) => path.includes("specification")), []);
});

test("Q21: dependency cycles and incomplete outcomes fail; split retires the old task", async (t) => {
  const f = await fixture(t);
  const stage = await defineRoadmapElement({
    root: f.root, context: f.context, candidateRef: f.candidateRef, subject: "Overview",
    semanticType: "Stage", value: stageValue("Pilot", 0),
  });
  const stageRef = stage.result.changed_refs[0];
  const first = await defineRoadmapElement({
    root: f.root, context: stage.context, candidateRef: f.candidateRef, subject: "Overview",
    semanticType: "Task", value: taskValue(f, "First task", stageRef),
  });
  const firstRef = first.result.changed_refs[0];
  const second = await defineRoadmapElement({
    root: f.root, context: first.context, candidateRef: f.candidateRef, subject: "Overview",
    semanticType: "Task", value: taskValue(f, "Second task", stageRef),
  });
  const secondRef = second.result.changed_refs[0];
  const linked = await linkRoadmapDependency({
    root: f.root, context: second.context, candidateRef: f.candidateRef,
    taskRef: secondRef, requiresTaskRef: firstRef,
  });
  const beforeCycle = await snapshot(f.root);
  await assert.rejects(linkRoadmapDependency({
    root: f.root, context: linked.context, candidateRef: f.candidateRef,
    taskRef: firstRef, requiresTaskRef: secondRef,
  }), expectCode("INVALID_INPUT"));
  assert.deepEqual(await snapshot(f.root), beforeCycle);

  await assert.rejects(recordRoadmapStageOutcome({
    root: f.root, context: linked.context, candidateRef: f.candidateRef,
    stageRef, evidenceRefs: [firstRef], observation: "One task is complete.", source: "synthetic task counter",
  }), expectCode("INVALID_INPUT"));
  await assert.rejects(recordRoadmapStageOutcome({
    root: f.root, context: linked.context, candidateRef: f.candidateRef,
    stageRef, evidenceRefs: [firstRef, stageRef], observation: "A task and its stage exist.", source: "synthetic structure only",
  }), expectCode("INVALID_INPUT"));

  const third = await defineRoadmapElement({
    root: f.root, context: linked.context, candidateRef: f.candidateRef, subject: "Overview",
    semanticType: "Task", value: taskValue(f, "Dependent task", stageRef),
  });
  const thirdRef = third.result.changed_refs[0];
  const thirdLinked = await linkRoadmapDependency({
    root: f.root, context: third.context, candidateRef: f.candidateRef,
    taskRef: thirdRef, requiresTaskRef: secondRef,
  });
  await assert.rejects(splitRoadmapTask({
    root: f.root, context: thirdLinked.context, candidateRef: f.candidateRef, taskRef: secondRef,
    replacements: [taskValue(f, "Ambiguous A", stageRef), taskValue(f, "Ambiguous B", stageRef)],
    answerRef: f.answerRef,
  }), expectCode("CONFLICT"));

  const split = await splitRoadmapTask({
    root: f.root, context: thirdLinked.context, candidateRef: f.candidateRef, taskRef: thirdRef,
    replacements: [
      taskValue(f, "Persist roadmap state", stageRef),
      taskValue(f, "Expose roadmap state", stageRef),
    ],
    answerRef: f.answerRef,
  });
  assert.deepEqual(split.result.changed_refs.map((ref) => ref.element_id), ["TASK-0003", "TASK-0004", "TASK-0005"]);
  const candidate = JSON.parse(await readFile(f.candidatePath, "utf8"));
  const registry = JSON.parse(Buffer.from(await readObject(f.root, {
    productId: f.productId, kind: "record", sha256: candidate.registry.object_sha256,
  })).toString("utf8"));
  assert.equal(registry.element_metadata.find((entry) => entry.ref.element_id === thirdRef.element_id).state, "retired");
  assert.ok(registry.element_metadata.find((entry) => entry.ref.element_id === thirdRef.element_id).provenance
    .some((reference) => reference.id === f.answerRef.id && reference.revision === f.answerRef.revision));
  assert.deepEqual(registry.element_metadata.filter((entry) => entry.semantic_type === "Task" && entry.state === "active")
    .map((entry) => entry.ref.element_id), ["TASK-0001", "TASK-0002", "TASK-0004", "TASK-0005"]);
  for (const replacement of registry.element_metadata.filter((entry) => ["TASK-0004", "TASK-0005"].includes(entry.ref.element_id))) {
    assert.ok(replacement.provenance.some((reference) => reference.id === f.answerRef.id
      && reference.revision === f.answerRef.revision));
  }

  const outcome = await recordRoadmapStageOutcome({
    root: f.root, context: split.context, candidateRef: f.candidateRef,
    stageRef, evidenceRefs: [firstRef, f.goalRef],
    observation: "The integrated stage outcome is observable against its product goal.",
    source: "synthetic integrated acceptance run",
  });
  assert.equal(outcome.result.decision_ref.artifact, "roadmap");
  assert.deepEqual(outcome.result.changed_refs, [stageRef]);
  const beforeReplay = await snapshot(f.root);
  const replay = await recordRoadmapStageOutcome({
    root: f.root, context: split.context, candidateRef: f.candidateRef,
    stageRef, evidenceRefs: [firstRef, f.goalRef],
    observation: "The integrated stage outcome is observable against its product goal.",
    source: "synthetic integrated acceptance run",
  });
  assert.equal(replay.replayed, true);
  assert.deepEqual(await snapshot(f.root), beforeReplay);
});

test("P09 task split requires an answered, internally consistent decision", async (t) => {
  const observed = await fixture(t, { answerState: "observed" });
  const observedStage = await defineRoadmapElement({
    root: observed.root, context: observed.context, candidateRef: observed.candidateRef, subject: "Overview",
    semanticType: "Stage", value: stageValue("Pilot", 0),
  });
  const observedTask = await defineRoadmapElement({
    root: observed.root, context: observedStage.context, candidateRef: observed.candidateRef, subject: "Overview",
    semanticType: "Task", value: taskValue(observed, "Split candidate", observedStage.result.changed_refs[0]),
  });
  await assert.rejects(splitRoadmapTask({
    root: observed.root, context: observedTask.context, candidateRef: observed.candidateRef,
    taskRef: observedTask.result.changed_refs[0],
    replacements: [
      taskValue(observed, "Replacement A", observedStage.result.changed_refs[0]),
      taskValue(observed, "Replacement B", observedStage.result.changed_refs[0]),
    ],
    answerRef: observed.answerRef,
  }), expectCode("ANSWER_REQUIRED"));

  const unrelated = await fixture(t, { answerAffectedRefs: [] });
  const unrelatedStage = await defineRoadmapElement({
    root: unrelated.root, context: unrelated.context, candidateRef: unrelated.candidateRef, subject: "Overview",
    semanticType: "Stage", value: stageValue("Pilot", 0),
  });
  const unrelatedTask = await defineRoadmapElement({
    root: unrelated.root, context: unrelatedStage.context, candidateRef: unrelated.candidateRef, subject: "Overview",
    semanticType: "Task", value: taskValue(unrelated, "Split candidate", unrelatedStage.result.changed_refs[0]),
  });
  await assert.rejects(splitRoadmapTask({
    root: unrelated.root, context: unrelatedTask.context, candidateRef: unrelated.candidateRef,
    taskRef: unrelatedTask.result.changed_refs[0],
    replacements: [
      taskValue(unrelated, "Replacement A", unrelatedStage.result.changed_refs[0]),
      taskValue(unrelated, "Replacement B", unrelatedStage.result.changed_refs[0]),
    ],
    answerRef: unrelated.answerRef,
  }), expectCode("ANSWER_REQUIRED"));

  const mismatchedRef = {
    product_id: observed.productId,
    artifact: "roadmap",
    id: randomUUID(),
    revision: 1,
  };
  const mismatched = await fixture(t, { answerStoredRef: mismatchedRef });
  const mismatchedStage = await defineRoadmapElement({
    root: mismatched.root, context: mismatched.context, candidateRef: mismatched.candidateRef, subject: "Overview",
    semanticType: "Stage", value: stageValue("Pilot", 0),
  });
  const mismatchedTask = await defineRoadmapElement({
    root: mismatched.root, context: mismatchedStage.context, candidateRef: mismatched.candidateRef, subject: "Overview",
    semanticType: "Task", value: taskValue(mismatched, "Split candidate", mismatchedStage.result.changed_refs[0]),
  });
  await assert.rejects(splitRoadmapTask({
    root: mismatched.root, context: mismatchedTask.context, candidateRef: mismatched.candidateRef,
    taskRef: mismatchedTask.result.changed_refs[0],
    replacements: [
      taskValue(mismatched, "Replacement A", mismatchedStage.result.changed_refs[0]),
      taskValue(mismatched, "Replacement B", mismatchedStage.result.changed_refs[0]),
    ],
    answerRef: mismatched.answerRef,
  }), expectCode("SOURCE_CHANGED"));
});

test("P09 stage outcome accepts only pinned integrated outcome evidence", async (t) => {
  const f = await fixture(t);
  const stage = await defineRoadmapElement({
    root: f.root, context: f.context, candidateRef: f.candidateRef, subject: "Overview",
    semanticType: "Stage", value: stageValue("Pilot", 0),
  });
  const stageRef = stage.result.changed_refs[0];
  const task = await defineRoadmapElement({
    root: f.root, context: stage.context, candidateRef: f.candidateRef, subject: "Overview",
    semanticType: "Task", value: taskValue(f, "Verified delivery", stageRef),
  });
  await assert.rejects(recordRoadmapStageOutcome({
    root: f.root, context: task.context, candidateRef: f.candidateRef, stageRef,
    evidenceRefs: [task.result.changed_refs[0], f.unpinnedGoalRef],
    observation: "An unpinned outcome must not qualify.", source: "synthetic acceptance run",
  }), expectCode("SOURCE_CHANGED"));
  await assert.rejects(recordRoadmapStageOutcome({
    root: f.root, context: task.context, candidateRef: f.candidateRef, stageRef,
    evidenceRefs: [task.result.changed_refs[0], f.actorRef],
    observation: "An actor is not an integrated outcome.", source: "synthetic acceptance run",
  }), expectCode("INVALID_INPUT"));
});

test("P09 rejects missing ready PRD and Technical Design inputs without effects", async (t) => {
  const f = await fixture(t, { readyInputs: false });
  const before = await snapshot(f.root);
  await assert.rejects(defineRoadmapElement({
    root: f.root, context: f.context, candidateRef: f.candidateRef, subject: "Overview",
    semanticType: "Stage", value: stageValue("Blocked stage", 0),
  }), expectCode("PREREQUISITE_REQUIRED"));
  assert.deepEqual(await snapshot(f.root), before);
});


async function taskChangeFixture(t, options = {}) {
  const f = await fixture(t, { answerTaskIds: ["TASK-0001", "TASK-0002", "TASK-0003"], ...options });
  let current = await defineRoadmapElement({ root: f.root, context: f.context, candidateRef: f.candidateRef,
    subject: "Overview", semanticType: "Stage", value: stageValue("Pilot", 0) });
  f.stageRef = current.result.changed_refs[0];
  f.tasks = [];
  for (let index = 1; index <= 3; index += 1) {
    current = await defineRoadmapElement({ root: f.root, context: current.context, candidateRef: f.candidateRef,
      subject: "Overview", semanticType: "Task", value: taskValue(f, `Task ${index}`, f.stageRef) });
    f.tasks.push(current.result.changed_refs[0]);
  }
  f.context = current.context;
  f.retire = { root: f.root, context: f.context, candidateRef: f.candidateRef, taskRef: f.tasks[2],
    redistributedTo: [f.tasks[0]], answerRef: f.answerRef, reason: "Remove duplicate work; the existing first task owns the template audit." };
  f.unlink = { root: f.root, context: f.context, candidateRef: f.candidateRef,
    taskRef: f.tasks[1], requiresTaskRef: f.tasks[2], answerRef: f.answerRef,
    reason: "The consumer uses the existing template directly and no longer needs the duplicate prerequisite." };
  return f;
}

async function candidateRegistry(f) {
  const candidate = JSON.parse(await readFile(f.candidatePath, "utf8"));
  const registry = JSON.parse(Buffer.from(await readObject(f.root, {
    productId: f.productId, kind: "record", sha256: candidate.registry.object_sha256,
  })).toString("utf8"));
  return { candidate, registry };
}

async function writeTaskBinding(f, taskId, state) {
  const value = {
    schema_version: 1, kind: "task_binding", product_id: f.productId, task_id: taskId,
    specification_id: randomUUID(), specification_slug: "historical-task", workspace_id: f.workspaceId,
    reservation_operation: randomUUID(), state, owner_session: state === "started" ? randomUUID() : null,
    current_packet: state === "started" ? "P01" : null,
    product_pins: (await candidateRegistry(f)).candidate.upstream_pins,
    product_source_version: digest("frozen product"), specification_source_version: digest("frozen specification"),
    specification_version: digest("approved specification"), specification_review_ref: randomUUID(),
    plan_pins: [{ relative_path: "docs/specs/historical-task/tasks/plan.md", sha256: digest("frozen plan") }],
    safety_blocks: [], completed_packets: state === "completed" ? [{ packet_id: "P01", evidence_refs: ["fixture:test-pass"], operation_id: randomUUID() }] : [],
  };
  const path = join(f.root, "products", f.productId, "tasks", `${taskId}.yaml`);
  await mkdir(join(f.root, "products", f.productId, "tasks"), { recursive: true });
  await writeFile(path, bytes(value));
  return path;
}

test("retirement requires explicit consumer resolution and preserves immutable history and existing identities", async (t) => {
  const f = await taskChangeFixture(t);
  const linked = await linkRoadmapDependency({ ...f.unlink, context: f.context });
  const headPath = join(f.root, "products", f.productId, "head.yaml");
  const readyGeneration = JSON.parse(await readFile(headPath, "utf8")).generation;
  const historical = await candidateRegistry(f);
  const historicalDocument = await readFile(f.roadmapDocument);
  const before = await snapshot(f.root);
  await assert.rejects(retireRoadmapTask({ ...f.retire, context: linked.context }), expectCode("CONFLICT"));
  assert.deepEqual(await snapshot(f.root), before);
  const unlinked = await unlinkRoadmapDependency({ ...f.unlink, context: linked.context });
  const replay = await unlinkRoadmapDependency({ ...f.unlink, context: linked.context });
  assert.equal(replay.replayed, true);
  assert.equal(replay.context, unlinked.context);
  await assert.rejects(unlinkRoadmapDependency({ ...f.unlink, context: unlinked.context }), expectCode("NOT_FOUND"));
  await assert.rejects(retireRoadmapTask(f.retire), expectCode("CONFLICT"));
  const bindingPath = await writeTaskBinding(f, "TASK-0003", "completed");
  const frozen = await readFile(bindingPath);
  const retired = await retireRoadmapTask({ ...f.retire, context: unlinked.context });
  const after = await candidateRegistry(f);
  assert.deepEqual(after.registry.element_metadata.map((entry) => entry.ref.element_id), historical.registry.element_metadata.map((entry) => entry.ref.element_id));
  assert.equal(after.registry.element_metadata.find((entry) => entry.ref.element_id === "TASK-0003").state, "retired");
  assert.ok(after.registry.element_metadata.find((entry) => entry.ref.element_id === "TASK-0003").provenance
    .some((ref) => ref.id === f.answerRef.id));
  assert.equal(after.candidate.relations.some((edge) => edge.from.element_id === "TASK-0003" || edge.to.element_id === "TASK-0003"), false);
  assert.doesNotMatch(await readFile(f.roadmapDocument, "utf8"), /### TASK-0003:/u);
  assert.deepEqual(await readFile(bindingPath), frozen);
  assert.equal(JSON.parse(await readFile(headPath, "utf8")).generation, readyGeneration);
  const oldDoc = historical.registry.documents.find((entry) => entry.relative_path === "roadmap/overview.md");
  assert.deepEqual(Buffer.from(await readObject(f.root, { productId: f.productId, kind: "markdown", sha256: oldDoc.object_sha256 })), historicalDocument);
  const eventHead = after.candidate.decision_heads.find((head) => head.decision_ref.id === retired.result.decision_ref.id);
  const event = JSON.parse(Buffer.from(await readObject(f.root, { productId: f.productId, kind: "decision", artifact: "roadmap",
    decisionId: eventHead.decision_ref.id, revision: 1, sha256: eventHead.object_sha256 })).toString("utf8"));
  assert.equal(event.text, f.retire.reason);
  assert.deepEqual(event.predecessors, [f.answerRef]);
  assert.deepEqual(event.selected_ids, ["TASK-0001"]);
  const beforeReplay = await snapshot(f.root);
  assert.equal((await retireRoadmapTask({ ...f.retire, context: unlinked.context })).replayed, true);
  assert.deepEqual(await snapshot(f.root), beforeReplay);
  await assert.rejects(retireRoadmapTask({ ...f.retire, context: retired.context }), expectCode("BROKEN_REFERENCE"));
  const next = await defineRoadmapElement({ root: f.root, context: retired.context, candidateRef: f.candidateRef,
    subject: "Overview", semanticType: "Task", value: taskValue(f, "Next independent task", f.stageRef) });
  assert.equal(next.result.task_id, "TASK-0004");
});

test("task changes reject non-answers, foreign refs, closed candidates and every unfinished binding without side effects", async (t) => {
  for (const state of ["reserved", "specified", "planned", "started", "blocked"]) {
    const f = await taskChangeFixture(t);
    await writeTaskBinding(f, "TASK-0003", state);
    const before = await snapshot(f.root);
    await assert.rejects(retireRoadmapTask(f.retire), expectCode("CONFLICT"));
    assert.deepEqual(await snapshot(f.root), before);
  }
  const observed = await taskChangeFixture(t, { answerState: "observed" });
  await assert.rejects(retireRoadmapTask(observed.retire), expectCode("ANSWER_REQUIRED"));
  const missing = await taskChangeFixture(t, { answerAffectedRefs: [] });
  await assert.rejects(retireRoadmapTask(missing.retire), expectCode("ANSWER_REQUIRED"));
  const f = await taskChangeFixture(t);
  await assert.rejects(retireRoadmapTask({ ...f.retire, redistributedTo: [f.tasks[2]] }), expectCode("INVALID_INPUT"));
  await assert.rejects(retireRoadmapTask({ ...f.retire, redistributedTo: [f.tasks[0], f.tasks[0]] }), expectCode("INVALID_INPUT"));
  await assert.rejects(retireRoadmapTask({ ...f.retire, taskRef: { ...f.tasks[2], product_id: randomUUID() } }), expectCode("BROKEN_REFERENCE"));
  await assert.rejects(retireRoadmapTask({ ...f.retire, reason: " " }), expectCode("INVALID_INPUT"));
  const linked = await linkRoadmapDependency(f.unlink);
  const path = await writeTaskBinding(f, "TASK-0002", "started");
  const frozen = await readFile(path);
  await assert.rejects(unlinkRoadmapDependency({ ...f.unlink, context: linked.context }), expectCode("CONFLICT"));
  assert.deepEqual(await readFile(path), frozen);
  const candidate = (await candidateRegistry(f)).candidate;
  for (const state of ["activated", "abandoned"]) {
    const closed = { ...candidate, state };
    closed.source_version = candidateVersion(closed);
    await writeFile(f.candidatePath, bytes(closed));
    await assert.rejects(retireRoadmapTask({ ...f.retire, context: context(f, closed) }), expectCode("CONFLICT"));
  }
});

test("interrupted retirement exposes no ready change and resumes the exact journaled transaction", async (t) => {
  const f = await taskChangeFixture(t);
  const original = await candidateRegistry(f);
  const headPath = join(f.root, "products", f.productId, "head.yaml");
  const head = await readFile(headPath);
  let operationRef;
  await assert.rejects(retireRoadmapTask(f.retire, { afterChange: async (path) => {
    if (path.endsWith("overview.md")) throw new Error("Synthetic interruption after a document write.");
  } }), (error) => {
    assert.equal(error.code, "RECOVERY_REQUIRED");
    operationRef = error.details.operation_ref;
    assert.ok(operationRef);
    return true;
  });
  assert.deepEqual(await readFile(headPath), head);
  assert.equal((await candidateRegistry(f)).candidate.source_version, original.candidate.source_version);
  await assert.rejects(retireRoadmapTask(f.retire), expectCode("RECOVERY_REQUIRED"));
  await assert.rejects(retireRoadmapTask({ ...f.retire, resumeOperationRef: operationRef, reason: "Changed intent" }), expectCode("CONFLICT"));
  const resumed = await retireRoadmapTask({ ...f.retire, resumeOperationRef: operationRef });
  assert.equal(resumed.result.operation_ref, operationRef);
  const after = await candidateRegistry(f);
  assert.equal(after.registry.element_metadata.find((entry) => entry.ref.element_id === "TASK-0003").state, "retired");
  const document = after.registry.documents.find((entry) => entry.relative_path === "roadmap/overview.md");
  assert.equal(digest(await readFile(f.roadmapDocument)), document.object_sha256);
  assert.equal(after.candidate.relations.some((edge) => edge.from.element_id === "TASK-0003" || edge.to.element_id === "TASK-0003"), false);
  assert.equal((await retireRoadmapTask({ ...f.retire, resumeOperationRef: operationRef })).replayed, true);
});


test("a binding created after retirement blocks candidate activation readiness", async (t) => {
  const f = await taskChangeFixture(t);
  const retired = await retireRoadmapTask(f.retire);
  const path = await writeTaskBinding(f, "TASK-0003", "started");
  const frozen = await readFile(path);
  const checked = await checkProductCandidate({ root: f.root, context: retired.context, candidateRef: f.candidateRef });
  assert.equal(checked.result.status, "fail");
  assert.ok(checked.result.issues.some((issue) => issue.code === "CONFLICT"));
  assert.deepEqual(await readFile(path), frozen);
});

test("recovery never overwrites unknown document bytes after an interrupted retirement", async (t) => {
  const f = await taskChangeFixture(t);
  let operationRef;
  await assert.rejects(retireRoadmapTask(f.retire, { afterChange: async () => { throw new Error("Synthetic stop"); } }), (error) => {
    operationRef = error.details.operation_ref;
    return error.code === "RECOVERY_REQUIRED";
  });
  await writeFile(f.roadmapDocument, "# Unexpected external edit\n");
  const before = await snapshot(f.root);
  await assert.rejects(retireRoadmapTask({ ...f.retire, resumeOperationRef: operationRef }), expectCode("CONFLICT"));
  assert.deepEqual(await snapshot(f.root), before);
});


test("unlink recovery is exact and cancellation permits no redistribution recipients", async (t) => {
  const f = await taskChangeFixture(t);
  const linked = await linkRoadmapDependency(f.unlink);
  let operationRef;
  const request = { ...f.unlink, context: linked.context };
  await assert.rejects(unlinkRoadmapDependency(request, { afterChange: async () => { throw new Error("Synthetic stop"); } }), (error) => {
    operationRef = error.details.operation_ref;
    return error.code === "RECOVERY_REQUIRED";
  });
  const resumed = await unlinkRoadmapDependency({ ...request, resumeOperationRef: operationRef });
  assert.equal(resumed.result.operation_ref, operationRef);
  assert.equal((await candidateRegistry(f)).candidate.relations.some((edge) => edge.kind === "depends_on"), false);
  const retired = await retireRoadmapTask({ ...f.retire, context: resumed.context, redistributedTo: [] });
  assert.deepEqual(retired.result.changed_refs, [f.tasks[2]]);
  await assert.rejects(defineRoadmapElement({ root: f.root, context: retired.context, candidateRef: f.candidateRef,
    subject: "Overview", semanticType: "Task", elementRef: f.tasks[2], value: taskValue(f, "Attempted resurrection", f.stageRef) }), expectCode("NOT_FOUND"));
  const after = await candidateRegistry(f);
  const malformed = { ...after.candidate, relations: [...after.candidate.relations,
    { from: f.tasks[1], kind: "depends_on", to: f.tasks[2] }] };
  malformed.source_version = candidateVersion(malformed);
  await writeFile(f.candidatePath, bytes(malformed));
  const checked = await checkProductCandidate({ root: f.root, context: context(f, malformed), candidateRef: f.candidateRef });
  assert.equal(checked.result.status, "fail");
  assert.ok(checked.result.issues.some((issue) => issue.code === "BROKEN_REFERENCE"));
});


async function completeSyntheticReview(f) {
  const started = await startProductReview({ root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "full" });
  let selected = started.context;
  for (let index = 0; index < started.result.total_items; index += 1) {
    let cursor;
    let item;
    do {
      item = (await readProductReviewItem({ root: f.root, context: selected, reviewRef: started.result.review_ref,
        itemIndex: index, ...(cursor === undefined ? {} : { cursor }) })).result;
      cursor = item.next_cursor ?? undefined;
    } while (cursor !== undefined);
    const recorded = await recordProductVerdict({ root: f.root, context: selected, reviewRef: started.result.review_ref, value: {
      item_key: item.item_key, verdict: "covered", explanation: "Synthetic protocol fixture only.", counterexample: null,
      evidence_refs: [], evidence_sources: [], read_receipt: item.read_receipt, inherited_from: null,
    } });
    selected = recorded.context;
  }
  let consistency = await readProductReviewConsistency({ root: f.root, context: selected, reviewRef: started.result.review_ref });
  while (consistency.result.next_cursor !== null) {
    consistency = await readProductReviewConsistency({ root: f.root, context: selected,
      reviewRef: started.result.review_ref, cursor: consistency.result.next_cursor });
  }
  const consistent = await recordProductReviewConsistency({ root: f.root, context: selected,
    reviewRef: started.result.review_ref, readReceipt: consistency.result.read_receipt,
    verdict: "covered", explanation: "Synthetic protocol fixture only.", counterexample: null });
  const completed = await completeProductReview({ root: f.root, context: consistent.context, reviewRef: started.result.review_ref });
  assert.equal(completed.result.coverage_status, "reviewed");
  return { context: completed.context, reviewRef: started.result.review_ref };
}

test("an interrupted task change must be recovered before reviewing or editing its candidate", async (t) => {
  for (const action of ["check", "review", "edit", "document", "activation"]) {
    await t.test(action, async (t) => {
      const f = await taskChangeFixture(t);
      const reviewed = action === "activation" ? await completeSyntheticReview(f) : null;
      await assert.rejects(retireRoadmapTask({ ...f.retire, context: reviewed?.context ?? f.context }, { afterChange: async (path) => {
        if (path.endsWith(action === "activation" ? "/overview.md" : "/candidate.yaml")) throw new Error("Synthetic interrupted candidate operation.");
      } }), expectCode("RECOVERY_REQUIRED"));
      const current = (await candidateRegistry(f)).candidate;
      const selected = context(f, current);
      const before = await snapshot(f.root);
      if (action === "check") {
        const checked = await checkProductCandidate({ root: f.root, context: selected, candidateRef: f.candidateRef });
        assert.ok(checked.result.issues.some((issue) => issue.code === "RECOVERY_REQUIRED"));
      } else if (action === "review") {
        await assert.rejects(startProductReview({ root: f.root, context: selected, candidateRef: f.candidateRef, mode: "full" }), expectCode("RECOVERY_REQUIRED"));
      } else if (action === "document") {
        const document = (await candidateRegistry(f)).registry.documents.find((entry) => entry.relative_path === "roadmap/overview.md");
        await assert.rejects(renameProductDocument({ root: f.root, context: selected, candidateRef: f.candidateRef,
          documentId: document.id, subject: "Renamed", title: "Renamed" }), expectCode("RECOVERY_REQUIRED"));
      } else if (action === "activation") {
        await assert.rejects(activateAmendment({ root: f.root, context: selected, candidates: [f.candidateRef], reviewRefs: [reviewed.reviewRef] }),
          expectCode("PREREQUISITE_REQUIRED"));
      } else {
        await assert.rejects(defineRoadmapElement({ root: f.root, context: selected, candidateRef: f.candidateRef,
          subject: "Overview", semanticType: "Task", elementRef: f.tasks[0], value: taskValue(f, "Changed after interruption", f.stageRef) }), expectCode("RECOVERY_REQUIRED"));
      }
      assert.deepEqual(await snapshot(f.root), before);
    });
  }
});

test("an unchanged historical retirement must not block an unrelated amendment with frozen work", async (t) => {
  const f = await taskChangeFixture(t);
  await retireRoadmapTask(f.retire);
  const { candidate } = await candidateRegistry(f);
  const base = await saveGeneration(f.root, {
    schema_version: 1, kind: "generation", product_id: f.productId, parent: candidate.base_generation,
    registry: candidate.registry, ready_artifacts: [], decision_heads: candidate.decision_heads, relations: candidate.relations,
  });
  const next = { ...candidate, base_generation: base.sha256 };
  next.source_version = candidateVersion(next);
  await writeFile(f.candidatePath, bytes(next));
  const bindingPath = await writeTaskBinding(f, "TASK-0003", "started");
  const frozen = await readFile(bindingPath);
  const checked = await checkProductCandidate({ root: f.root, context: context(f, next), candidateRef: f.candidateRef });
  assert.equal(checked.result.issues.some((issue) => issue.code === "CONFLICT"), false);
  assert.deepEqual(await readFile(bindingPath), frozen);
});

test("task change reasons honor the schema Unicode code-point limit", async (t) => {
  const f = await taskChangeFixture(t);
  const retired = await retireRoadmapTask({ ...f.retire, reason: "🧭".repeat(4096) });
  assert.equal(retired.result.applied, true);
});


test("retirement preserves CRLF documents and Unicode portable paths", async (t) => {
  const f = await taskChangeFixture(t, { newline: "\r\n", roadmapPath: "roadmap/план-路线.md" });
  const oldDocument = await readFile(f.roadmapDocument, "utf8");
  assert.doesNotMatch(oldDocument, /(?<!\r)\n/u);
  const retired = await retireRoadmapTask(f.retire);
  const document = await readFile(f.roadmapDocument, "utf8");
  assert.doesNotMatch(document, /(?<!\r)\n/u);
  assert.match(document, /### TASK-0001:/u);
  assert.match(document, /### TASK-0002:/u);
  assert.doesNotMatch(document, /### TASK-0003:/u);
  assert.equal((await retireRoadmapTask(f.retire)).replayed, true);
  assert.equal(await readFile(f.roadmapDocument, "utf8"), document);
  assert.equal(retired.result.applied, true);
});

test("task change binding guards reject hard links and symbolic links without touching their targets", async (t) => {
  for (const kind of ["hard", "symbolic"]) {
    await t.test(kind, async (t) => {
      const f = await taskChangeFixture(t);
      const path = await writeTaskBinding(f, "TASK-0003", "completed");
      const external = join(f.workspace, "retained-binding.yaml");
      const original = await readFile(path);
      if (kind === "hard") await link(path, external);
      else {
        await writeFile(external, original);
        await rm(path);
        try {
          await symlink(external, path, "file");
        } catch (error) {
          if (process.platform === "win32" && error.code === "EPERM") {
            t.skip("Windows requires symbolic-link privileges.");
            return;
          }
          throw error;
        }
      }
      const before = await snapshot(f.root);
      await assert.rejects(retireRoadmapTask(f.retire), expectCode("UNSAFE_PATH"));
      assert.deepEqual(await snapshot(f.root), before);
      assert.deepEqual(await readFile(external), original);
    });
  }
});
