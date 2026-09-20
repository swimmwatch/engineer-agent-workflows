import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  chooseIdeaDirection,
  compareIdeaDirection,
  defineIdeaProblem,
  definePrdElement,
} from "../dist/product/definition.js";
import { recordProductResearch } from "../dist/product/interview.js";
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
  const directory = await mkdtemp(join(tmpdir(), "eaw-product-definition-"));
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

function contextFor(f, sourceVersion) {
  return Buffer.from(JSON.stringify({
    contract: "product-1",
    store_id: f.storeId,
    product_id: f.productId,
    workspace_id: f.workspaceId,
    candidate_ref: { product_id: f.productId, candidate_id: f.candidateId },
    selected_sources_sha256: sourceVersion,
    target_revision: f.generation,
    canonical_workspace: f.workspace,
  })).toString("base64url");
}

async function fixture(t, {
  artifact = "idea",
  readyIdea = false,
  newline = "\n",
  answerCategory = null,
} = {}) {
  const directory = await temporaryDirectory(t);
  const root = join(directory, "product-data");
  const workspace = join(directory, "workspace");
  await mkdir(workspace);
  const productId = randomUUID();
  const workspaceId = randomUUID();
  const candidateId = randomUUID();
  const storeId = randomUUID();
  const registryId = randomUUID();
  const documentIds = {
    ideaIndex: randomUUID(),
    ideaOverview: randomUUID(),
    prdIndex: randomUUID(),
    prdOverview: randomUUID(),
  };
  const establishedIdea = (readyIdea
    ? "# Idea\n\n### IDEA-0001: Established problem\n\n#### Problem\n\nTeams cannot retain product reasoning.\n\n### IDEA-0002: Guided direction\n\n#### Approach\n\nUse addressed product artifacts.\n"
    : "# Idea\n").replaceAll("\n", newline);
  const sources = {
    "idea/index.md": "# Idea\n\n- [Overview](overview.md)\n",
    "idea/overview.md": establishedIdea,
    "prd/index.md": "# PRD\n\n- [Overview](overview.md)\n",
    "prd/overview.md": "# Overview\n",
  };
  const documents = [];
  for (const [relativePath, source] of Object.entries(sources)) {
    const saved = await saveObject(root, { productId, kind: "markdown", bytes: Buffer.from(source) });
    const key = relativePath === "idea/index.md" ? "ideaIndex"
      : relativePath === "idea/overview.md" ? "ideaOverview"
        : relativePath === "prd/index.md" ? "prdIndex" : "prdOverview";
    documents.push({
      id: documentIds[key],
      artifact: relativePath.startsWith("idea/") ? "idea" : "prd",
      role: relativePath.endsWith("index.md") ? "navigation" : "semantic",
      subject: relativePath.endsWith("index.md") ? "Index" : "Overview",
      relative_path: relativePath,
      object_sha256: saved.sha256,
    });
  }
  const metadata = readyIdea ? [
    {
      ref: { product_id: productId, artifact: "idea", element_id: "IDEA-0001" },
      semantic_type: "IdeaProblem",
      applicability: { state: "current", stage_refs: [], global: true, reason: "Established idea." },
      provenance: [],
      state: "active",
    },
    {
      ref: { product_id: productId, artifact: "idea", element_id: "IDEA-0002" },
      semantic_type: "IdeaDirection",
      applicability: { state: "current", stage_refs: [], global: true, reason: "Selected direction." },
      provenance: [],
      state: "active",
    },
  ] : [];
  const registry = {
    schema_version: 1,
    kind: "registry",
    product_id: productId,
    documents,
    element_metadata: metadata,
  };
  const registryObject = await saveObject(root, { productId, kind: "record", bytes: bytes(registry) });
  const base = await saveGeneration(root, {
    schema_version: 1,
    kind: "generation",
    product_id: productId,
    parent: null,
    registry: { id: registryId, object_sha256: registryObject.sha256 },
    ready_artifacts: [],
    decision_heads: [],
    relations: [],
  });
  const ideaPin = {
    product_id: productId,
    artifact: "idea",
    source_kind: "markdown",
    source_id: documentIds.ideaOverview,
    generation: base.sha256,
    object_sha256: documents.find((document) => document.id === documentIds.ideaOverview).object_sha256,
    element_ids: readyIdea ? ["IDEA-0001", "IDEA-0002"] : [],
    decision_ref: null,
  };
  const generation = readyIdea ? await saveGeneration(root, {
    schema_version: 1,
    kind: "generation",
    product_id: productId,
    parent: base.sha256,
    registry: { id: registryId, object_sha256: registryObject.sha256 },
    ready_artifacts: [{
      artifact: "idea",
      source_version: digest("ready idea fixture"),
      review_id: randomUUID(),
      upstream_pins: [],
    }],
    decision_heads: [],
    relations: [],
  }) : base;
  await mkdir(join(root, "products", productId), { recursive: true });
  await writeFile(join(root, "products", productId, "head.yaml"), bytes({
    schema_version: 1,
    kind: "head",
    product_id: productId,
    generation: generation.sha256,
    operation_id: randomUUID(),
  }));

  const evidenceRef = { product_id: productId, artifact, id: randomUUID(), revision: 1 };
  const questionRef = { product_id: productId, artifact, id: randomUUID(), revision: 1 };
  const answerRef = artifact === "idea" ? { ...questionRef, revision: 2 } : questionRef;
  const questionCategory = answerCategory ?? (artifact === "idea" ? "direction" : "research");
  const decisions = [
    {
      schema_version: 1,
      kind: "decision",
      ref: evidenceRef,
      state: "observed",
      category: "evidence",
      question: null,
      text: "Fixture evidence supports the stated problem.",
      source: "fixture repository evidence",
      selected_ids: [],
      predecessors: [],
      affected_refs: [],
      reconsider_when: null,
      candidate_id: candidateId,
    },
    {
      schema_version: 1,
      kind: "decision",
      ref: questionRef,
      state: "needs_user",
      category: questionCategory,
      question: artifact === "idea" ? "Which direction is chosen?" : "Which documented approach fits?",
      text: JSON.stringify({
        text: artifact === "idea" ? "Which direction is chosen?" : "Which documented approach fits?",
        options: artifact === "idea" ? [{ id: "IDEA-0003", label: "Guided product artifacts" }] : [],
      }),
      source: "product_question_prepare",
      selected_ids: [],
      predecessors: [],
      affected_refs: [],
      reconsider_when: null,
      candidate_id: candidateId,
    },
    ...(artifact === "idea" ? [{
      schema_version: 1,
      kind: "decision",
      ref: answerRef,
      state: "answered",
      category: questionCategory,
      question: "Which direction is chosen?",
      text: "Choose the guided direction.",
      source: "request_user_input",
      selected_ids: ["IDEA-0003"],
      predecessors: [questionRef],
      affected_refs: [],
      reconsider_when: null,
      candidate_id: candidateId,
    }] : []),
  ];
  const savedDecisions = new Map();
  for (const decision of decisions) {
    const saved = await saveObject(root, {
      productId,
      kind: "decision",
      artifact,
      decisionId: decision.ref.id,
      revision: decision.ref.revision,
      bytes: bytes(decision),
    });
    savedDecisions.set(`${decision.ref.id}:${decision.ref.revision}`, saved.sha256);
  }
  const decisionHeads = [
    { decision_ref: evidenceRef, object_sha256: savedDecisions.get(`${evidenceRef.id}:1`) },
    { decision_ref: answerRef, object_sha256: savedDecisions.get(`${answerRef.id}:${answerRef.revision}`) },
  ];

  const candidateWithoutVersion = {
    schema_version: 1,
    kind: "candidate",
    product_id: productId,
    candidate_id: candidateId,
    artifact,
    base_generation: generation.sha256,
    workspace_id: workspaceId,
    state: "draft",
    scope: {
      depth: "standard",
      profiles: [{ id: "core", reason: "Product meaning." }],
      rationale: ["Synthetic P07 scenario."],
      confirmed_answer: artifact === "idea" ? answerRef : null,
    },
    registry: { id: registryId, object_sha256: registryObject.sha256 },
    upstream_pins: artifact === "prd" && readyIdea ? [ideaPin] : [],
    decision_heads: decisionHeads,
    relations: [],
  };
  const sourceVersion = candidateVersion(candidateWithoutVersion);
  const candidate = { ...candidateWithoutVersion, source_version: sourceVersion };
  const draft = join(root, "products", productId, "drafts", candidateId);
  for (const [relativePath, source] of Object.entries(sources)) {
    const target = join(draft, "documents", relativePath);
    await mkdir(join(target, ".."), { recursive: true });
    await writeFile(target, source);
  }
  await writeFile(join(draft, "candidate.yaml"), bytes(candidate));
  const result = {
    root,
    workspace,
    productId,
    workspaceId,
    candidateId,
    candidateRef: { product_id: productId, candidate_id: candidateId },
    storeId,
    generation: generation.sha256,
    evidenceRef,
    answerRef,
    context: null,
    candidatePath: join(draft, "candidate.yaml"),
    document(relativePath) { return join(draft, "documents", relativePath); },
  };
  result.context = contextFor(result, sourceVersion);
  return result;
}

const applicability = (state = "current") => ({
  state,
  stage_refs: [],
  global: true,
  reason: "Synthetic product scope.",
});

function problemValue(f, overrides = {}) {
  return {
    title: "Lost product reasoning",
    provenance: [f.evidenceRef],
    applicability: applicability(),
    problem: "Teams lose settled product reasoning between tasks.",
    actors: ["Product author", "Implementing engineer"],
    workarounds: ["Search old conversations", "Repeat interviews"],
    value: "Reuse exact product meaning without repeating settled questions.",
    success_signals: ["A fresh author retrieves the chosen result."],
    constraints: ["Do not infer implementation technology."],
    non_goals: ["Create a delivery backlog."],
    assumptions: ["The saved evidence remains applicable."],
    risks: ["Stale evidence could be treated as current."],
    open_questions: ["Which later stage needs delivery dates?"],
    ...overrides,
  };
}

function directionValue(f, evidenceRef) {
  return {
    title: "Guided product artifacts",
    provenance: [f.evidenceRef],
    applicability: applicability("hypothesis"),
    approach: "Persist addressed semantic product elements.",
    benefits: ["Fresh agents can retrieve exact meaning."],
    tradeoffs: ["Requires explicit artifact maintenance."],
    evidence_refs: [evidenceRef],
    revisit_when: "The workflow cannot preserve exact source identity.",
  };
}

test("P07 publishes strict Idea and PRD scenario tools", () => {
  const expected = [
    "idea_choose_direction",
    "idea_compare_direction",
    "idea_define_problem",
    "prd_define_actor",
    "prd_define_capability",
    "prd_define_constraint",
    "prd_define_goal",
    "prd_define_rule",
    "prd_define_term",
    "prd_define_use_case",
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

test("Q17: a known Idea remains durable and reuses settled evidence without another interview", async (t) => {
  const f = await fixture(t);
  const decisionsBefore = await snapshot(f.root, `products/${f.productId}/decisions`);
  const problem = await defineIdeaProblem({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    subject: "Overview",
    value: {
      title: "Lost product reasoning",
      provenance: [f.evidenceRef],
      applicability: applicability(),
      problem: "Teams lose settled product reasoning between tasks.",
      actors: ["Product author", "Implementing engineer"],
      workarounds: ["Search old conversations", "Repeat interviews"],
      value: "Reuse exact product meaning without repeating settled questions.",
      success_signals: ["A fresh author retrieves the chosen result."],
      constraints: ["Do not infer implementation technology."],
      non_goals: ["Create a delivery backlog."],
      assumptions: ["The saved evidence remains applicable."],
      risks: ["Stale evidence could be treated as current."],
      open_questions: ["Which later stage needs delivery dates?"],
    },
  });
  const problemRef = problem.result.changed_refs[0];
  const alternate = await compareIdeaDirection({
    root: f.root,
    context: problem.context,
    candidateRef: f.candidateRef,
    subject: "Overview",
    value: {
      title: "Conversation archive",
      provenance: [f.evidenceRef],
      applicability: applicability("hypothesis"),
      approach: "Retain unstructured conversations.",
      benefits: ["Low initial authoring cost."],
      tradeoffs: ["Hard to address deterministically."],
      evidence_refs: [problemRef],
      revisit_when: "Addressed artifacts are unavailable.",
    },
  });
  const chosen = await compareIdeaDirection({
    root: f.root,
    context: alternate.context,
    candidateRef: f.candidateRef,
    subject: "Overview",
    value: {
      title: "Guided product artifacts",
      provenance: [f.evidenceRef],
      applicability: applicability("hypothesis"),
      approach: "Persist addressed semantic product elements.",
      benefits: ["Fresh agents can retrieve exact meaning."],
      tradeoffs: ["Requires explicit artifact maintenance."],
      evidence_refs: [problemRef],
      revisit_when: "The workflow cannot preserve exact source identity.",
    },
  });
  const chosenRef = chosen.result.changed_refs[0];
  const beforeMismatchedChoice = await snapshot(f.root);
  await assert.rejects(chooseIdeaDirection({
    root: f.root,
    context: chosen.context,
    candidateRef: f.candidateRef,
    directionRef: alternate.result.changed_refs[0],
    answerRef: f.answerRef,
  }), expectCode("ANSWER_REQUIRED"));
  assert.deepEqual(await snapshot(f.root), beforeMismatchedChoice);
  const selected = await chooseIdeaDirection({
    root: f.root,
    context: chosen.context,
    candidateRef: f.candidateRef,
    directionRef: chosenRef,
    answerRef: f.answerRef,
  });
  const replay = await defineIdeaProblem({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    subject: "Overview",
    value: {
      title: "Lost product reasoning",
      provenance: [f.evidenceRef],
      applicability: applicability(),
      problem: "Teams lose settled product reasoning between tasks.",
      actors: ["Product author", "Implementing engineer"],
      workarounds: ["Search old conversations", "Repeat interviews"],
      value: "Reuse exact product meaning without repeating settled questions.",
      success_signals: ["A fresh author retrieves the chosen result."],
      constraints: ["Do not infer implementation technology."],
      non_goals: ["Create a delivery backlog."],
      assumptions: ["The saved evidence remains applicable."],
      risks: ["Stale evidence could be treated as current."],
      open_questions: ["Which later stage needs delivery dates?"],
    },
  });
  assert.equal(replay.replayed, true);
  assert.deepEqual(await snapshot(f.root, `products/${f.productId}/decisions`), decisionsBefore);
  const source = await readFile(f.document("idea/overview.md"), "utf8");
  assert.match(source, /#### Workarounds\n\n- Search old conversations\n- Repeat interviews/u);
  assert.match(source, /#### Open Questions\n\n- Which later stage needs delivery dates\?/u);
  assert.match(source, /### IDEA-\d{4}: Conversation archive/u);
  assert.match(source, /### IDEA-\d{4}: Guided product artifacts/u);
  assert.doesNotMatch(source, /TypeScript|PostgreSQL|MVP backlog/iu);
  const candidate = JSON.parse(await readFile(f.candidatePath, "utf8"));
  const metadata = JSON.parse(Buffer.from(await readObject(f.root, {
    productId: f.productId,
    kind: "record",
    sha256: candidate.registry.object_sha256,
  })).toString("utf8")).element_metadata;
  const selectedMetadata = metadata.find((entry) => entry.ref.element_id === chosenRef.element_id);
  assert.equal(selectedMetadata.applicability.state, "current");
  assert.deepEqual(selectedMetadata.provenance.at(-1), f.answerRef);
  assert.equal(selected.result.task_id, null);
  assert.equal(selected.result.specification_id, null);
});

test("P07 direction choice requires a direction answer bound to the selected element", async (t) => {
  const f = await fixture(t, { answerCategory: "scope" });
  const problem = await defineIdeaProblem({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    subject: "Overview",
    value: problemValue(f),
  });
  const direction = await compareIdeaDirection({
    root: f.root,
    context: problem.context,
    candidateRef: f.candidateRef,
    subject: "Overview",
    value: directionValue(f, problem.result.changed_refs[0]),
  });
  const before = await snapshot(f.root);

  await assert.rejects(chooseIdeaDirection({
    root: f.root,
    context: direction.context,
    candidateRef: f.candidateRef,
    directionRef: direction.result.changed_refs[0],
    answerRef: f.answerRef,
  }), expectCode("ANSWER_REQUIRED"));
  assert.deepEqual(await snapshot(f.root), before);
});

test("P07 exact replay ignores JSON object member order", async (t) => {
  const f = await fixture(t);
  const value = problemValue(f);
  const applied = await defineIdeaProblem({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    subject: "Overview",
    value,
  });
  const beforeReplay = await snapshot(f.root);

  const replay = await defineIdeaProblem({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    subject: "Overview",
    value: Object.fromEntries(Object.entries(value).reverse()),
  });

  assert.equal(applied.replayed, false);
  assert.equal(replay.replayed, true);
  assert.deepEqual(await snapshot(f.root), beforeReplay);
});

test("P07 semantic authoring rejects common client-secret assignments", async (t) => {
  const f = await fixture(t);
  const before = await snapshot(f.root);

  await assert.rejects(defineIdeaProblem({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    subject: "Overview",
    value: problemValue(f, { constraints: ["client_secret=SENTINEL_SECRET_8421"] }),
  }), expectCode("INVALID_INPUT"));
  assert.deepEqual(await snapshot(f.root), before);
});

test("P07 semantic rendering preserves CRLF documents without lone LF", async (t) => {
  const f = await fixture(t, { newline: "\r\n" });
  await defineIdeaProblem({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    subject: "Overview",
    value: problemValue(f),
  });

  const source = await readFile(f.document("idea/overview.md"), "utf8");
  assert.doesNotMatch(source, /(?<!\r)\n/u);
});

test("Q18: PRD elements preserve unknown measures, typed links and research boundaries", async (t) => {
  const blocked = await fixture(t, { artifact: "prd", readyIdea: false });
  const blockedBefore = await snapshot(blocked.root);
  await assert.rejects(definePrdElement({
    root: blocked.root,
    context: blocked.context,
    candidateRef: blocked.candidateRef,
    subject: "Overview",
    semanticType: "PrdActor",
    value: {
      title: "Product author",
      provenance: [],
      applicability: applicability(),
      role: "Defines product meaning.",
      needs: ["Durable decisions."],
      constraints: [],
    },
  }), expectCode("PREREQUISITE_REQUIRED"));
  assert.deepEqual(await snapshot(blocked.root), blockedBefore);

  const f = await fixture(t, { artifact: "prd", readyIdea: true });
  const research = await recordProductResearch({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    evidence: {
      question_ref: f.answerRef,
      conclusion: "Addressed Markdown supports deterministic product element lookup.",
      sources: [{
        url: "https://example.invalid/addressed-markdown",
        checked_date: "2026-09-14",
        version_applicability: "Synthetic fixture contract.",
        finding: "Stable headings preserve semantic identity.",
      }],
      uncertainty: ["Native platform qualification remains pending."],
      limitations: ["This conclusion does not authorize implementation."],
    },
  });
  const actor = await definePrdElement({
    root: f.root,
    context: research.context,
    candidateRef: f.candidateRef,
    subject: "Overview",
    semanticType: "PrdActor",
    value: {
      title: "Product author",
      provenance: [research.result.decision_ref],
      applicability: applicability(),
      role: "Defines product meaning.",
      needs: ["Retrieve settled decisions in a fresh context."],
      constraints: ["No redundant interview."],
    },
  });
  const actorRef = actor.result.changed_refs[0];
  const goal = await definePrdElement({
    root: f.root,
    context: actor.context,
    candidateRef: f.candidateRef,
    subject: "Overview",
    semanticType: "PrdGoal",
    value: {
      title: "Durable product meaning",
      provenance: [research.result.decision_ref],
      applicability: applicability(),
      outcome: "Authors reuse agreed product meaning.",
      measurement: "Compare retrieved elements with saved source evidence.",
      baseline: null,
      target: null,
    },
  });
  const capability = await definePrdElement({
    root: f.root,
    context: goal.context,
    candidateRef: f.candidateRef,
    subject: "Overview",
    semanticType: "PrdCapability",
    value: {
      title: "Retrieve product meaning",
      provenance: [],
      applicability: applicability(),
      outcome: "Return addressed product elements.",
      actor_refs: [actorRef],
      acceptance: ["The source identity is retained."],
    },
  });
  const useCase = await definePrdElement({
    root: f.root,
    context: capability.context,
    candidateRef: f.candidateRef,
    subject: "Overview",
    semanticType: "PrdUseCase",
    value: {
      title: "Resume product definition",
      provenance: [],
      applicability: applicability(),
      actor_refs: [actorRef],
      trigger: "A fresh author opens the product.",
      preconditions: ["A ready Idea is pinned."],
      main_flow: ["Load addressed PRD elements."],
      alternatives: ["Report an unresolved product decision."],
      failures: ["Reject stale upstream evidence."],
      postconditions: ["No implementation task is launched."],
    },
  });
  const rule = await definePrdElement({
    root: f.root,
    context: useCase.context,
    candidateRef: f.candidateRef,
    subject: "Overview",
    semanticType: "PrdRule",
    value: {
      title: "Unknown metrics remain unknown",
      provenance: [],
      applicability: applicability(),
      condition: "A baseline or target is not established.",
      obligation: "Persist the value as unknown.",
      exceptions: [],
      observation: "No numeric value is inferred.",
    },
  });
  const constraint = await definePrdElement({
    root: f.root,
    context: rule.context,
    candidateRef: f.candidateRef,
    subject: "Overview",
    semanticType: "PrdConstraint",
    value: {
      title: "Research is analytical",
      provenance: [research.result.decision_ref],
      applicability: applicability(),
      constraint: "Research cannot launch an executable spike before product readiness.",
      kind: "product",
      observation: "The conclusion retains sources and limitations.",
    },
  });
  const source = await readFile(f.document("prd/overview.md"), "utf8");
  assert.match(source, /#### Baseline\n\nUnknown\./u);
  assert.match(source, /#### Target\n\nUnknown\./u);
  assert.match(source, /#### Alternatives\n\n- Report an unresolved product decision\./u);
  assert.match(source, /#### Failures\n\n- Reject stale upstream evidence\./u);
  assert.doesNotMatch(source, /baseline[^\n]*0|target[^\n]*0/iu);
  const candidate = JSON.parse(await readFile(f.candidatePath, "utf8"));
  assert.ok(candidate.relations.some((relation) => (
    relation.from.element_id === capability.result.changed_refs[0].element_id
      && relation.kind === "depends_on"
      && relation.to.element_id === actorRef.element_id
  )));
  assert.ok(candidate.relations.some((relation) => (
    relation.from.element_id === useCase.result.changed_refs[0].element_id
      && relation.kind === "depends_on"
      && relation.to.element_id === actorRef.element_id
  )));
  assert.equal(constraint.result.task_id, null);
  assert.equal(constraint.result.specification_id, null);
  assert.doesNotMatch(constraint.result.next, /execute|implement|spike/iu);
});
