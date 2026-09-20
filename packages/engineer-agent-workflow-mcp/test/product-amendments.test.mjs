import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { initializeProduct, resolveWorkspace } from "../dist/product/bindings.js";
import {
  inspectAmendmentImpact,
  prepareAmendment,
  rebaseAmendment,
} from "../dist/product/review.js";
import { pendingOperationsForTarget } from "../dist/product/operations.js";
import { loadGeneration, saveGeneration, saveObject } from "../dist/product/storage.js";
import {
  checkTaskInputs,
  completeTaskPacket,
  recordSafetyBlock,
  reserveTaskSpecification,
  resolveSafetyBlock,
  startTaskPacket,
} from "../dist/product/tasks.js";
import { workflowTools } from "../dist/server.js";

const executeFile = promisify(execFile);
const bytes = (value) => Buffer.from(`${JSON.stringify(value)}\n`, "utf8");

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

async function git(cwd, ...args) {
  return (await executeFile("git", args, {
    cwd,
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_TERMINAL_PROMPT: "0" },
  })).stdout.trim();
}

async function initializeRepository(path) {
  await mkdir(path, { recursive: true });
  await git(path, "init", "--initial-branch=main");
  await writeFile(join(path, "README.md"), "fixture\n");
  await git(path, "add", "README.md");
  await git(path, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-m", "fixture");
}

function decodedContext(context) {
  return JSON.parse(Buffer.from(context, "base64url").toString("utf8"));
}

async function publishRoadmapTasks(root, initialized) {
  const selected = decodedContext(initialized.context);
  const loaded = await loadGeneration(root, initialized.result.product_id, selected.target_revision);
  const registry = JSON.parse(Buffer.from(loaded.registry).toString("utf8"));
  const documentId = randomUUID();
  const taskText = [
    "# Roadmap",
    "",
    "### TASK-0001: Started delivery",
    "",
    "#### Outcome",
    "",
    "Finish one pinned packet after a compatible amendment.",
    "",
    "#### Kind",
    "",
    "technical",
    "",
    "#### Scope",
    "",
    "- One bounded packet.",
    "",
    "#### Non Goals",
    "",
    "- Adopting unrelated later scope.",
    "",
    "#### Acceptance",
    "",
    "- Frozen evidence remains valid.",
    "",
    "### TASK-0002: Unstarted delivery",
    "",
    "#### Outcome",
    "",
    "Use current product inputs when implementation begins.",
    "",
    "#### Kind",
    "",
    "technical",
    "",
    "#### Scope",
    "",
    "- One bounded packet.",
    "",
    "#### Non Goals",
    "",
    "- Inventing an earlier start marker.",
    "",
    "#### Acceptance",
    "",
    "- The current generation is selected.",
    "",
  ].join("\n");
  const taskObject = await saveObject(root, {
    productId: initialized.result.product_id,
    kind: "markdown",
    bytes: Buffer.from(taskText, "utf8"),
  });
  const nextRegistry = {
    ...registry,
    documents: [...registry.documents, {
      id: documentId,
      artifact: "roadmap",
      role: "semantic",
      subject: "Delivery",
      relative_path: "roadmap/delivery.md",
      object_sha256: taskObject.sha256,
    }],
    element_metadata: [...registry.element_metadata, ...["TASK-0001", "TASK-0002"].map((taskId) => ({
      ref: { product_id: initialized.result.product_id, artifact: "roadmap", element_id: taskId },
      semantic_type: "Task",
      applicability: { state: "current", stage_refs: [], global: true, reason: "Synthetic P13 task." },
      provenance: [],
      state: "active",
    }))],
  };
  const registryObject = await saveObject(root, {
    productId: initialized.result.product_id,
    kind: "record",
    bytes: bytes(nextRegistry),
  });
  const generation = await saveGeneration(root, {
    ...loaded.generation,
    parent: loaded.sha256,
    registry: { id: loaded.generation.registry.id, object_sha256: registryObject.sha256 },
    ready_artifacts: [...loaded.generation.ready_artifacts, {
      artifact: "roadmap",
      source_version: taskObject.sha256,
      review_id: randomUUID(),
      upstream_pins: [],
    }],
  });
  await writeFile(join(root, "products", initialized.result.product_id, "head.yaml"), bytes({
    schema_version: 1,
    kind: "head",
    product_id: initialized.result.product_id,
    generation: generation.sha256,
    operation_id: randomUUID(),
  }));
  return generation;
}

async function callSpecification(name, state, args = {}) {
  const tool = workflowTools.find((candidate) => candidate.name === name);
  assert.ok(tool, `missing workflow tool ${name}`);
  const output = await tool.run({ ...(state.context ? { context: state.context } : {}), ...args });
  if (typeof output.context === "string") state.context = output.context;
  return output.result ?? output;
}

async function recordCoveredReview(state, review, sourceRef) {
  for (let index = 0; index < review.total_items; index += 1) {
    let cursor;
    let item;
    do {
      item = await callSpecification("specification_review_get", state, {
        review_ref: review.review_ref,
        item_index: index,
        ...(cursor ? { cursor } : {}),
      });
      cursor = item.next_cursor;
    } while (cursor);
    await callSpecification("specification_review_record", state, {
      review_ref: review.review_ref,
      item_index: index,
      read_receipt: item.read_receipt,
      verdict: "covered",
      explanation: "The synthetic requirement and decision agree.",
      evidence_requirement_ids: item.kind === "source" ? ["PIN-001"] : [],
      evidence_source_refs: item.kind === "requirement" ? [sourceRef] : [],
    });
  }
  await callSpecification("specification_review_complete", state, { review_ref: review.review_ref });
}

async function createReviewedSpecification(workspace, slug, packetCount = 1) {
  const state = { context: null };
  await callSpecification("specification_open", state, { project: workspace, specification: slug });
  const proposal = await callSpecification("scope_propose", state, {
    depth: "lite",
    rationale: ["Synthetic P13 task checkpoint."],
    profiles: [{ id: "core", reason: "One bounded implementation task." }],
    exclusions: [],
    artifacts: [],
  });
  const answer = await callSpecification("question_record_answer", state, {
    question_ref: proposal.question_ref,
    selected_ids: ["confirm"],
    text: "Confirm the synthetic scope.",
    source: "fixture-customer:scope",
  });
  await callSpecification("scope_confirm", state, {
    proposal_ref: proposal.question_ref,
    answer_ref: answer.decision_ref,
  });
  const specificationDirectory = join(workspace, "docs", "specs", slug);
  const specificationPath = join(specificationDirectory, "spec.md");
  await writeFile(specificationPath, [
    "# Reserved task specification",
    "",
    "Status: Draft",
    "",
    "### PIN-001: Durable packet pins",
    "The first explicit start freezes exact implementation inputs.",
    "",
  ].join("\n"));
  const sourceDecision = await callSpecification("decision_record_instruction", state, {
    category: "task-pins",
    text: "Freeze exact approved inputs at explicit implementation start.",
    source: "fixture-customer:initial",
    kind: "initial_request",
    requirement_ids: ["PIN-001"],
  });
  const review = await callSpecification("specification_review_start", state, { mode: "full" });
  await recordCoveredReview(state, review, sourceDecision.decision_ref);
  await writeFile(specificationPath, (await readFile(specificationPath, "utf8")).replace("Status: Draft", "Status: Approved"));
  const checked = await callSpecification("specification_check_state", state);
  assert.equal(checked.status, "pass");
  const tasks = join(specificationDirectory, "tasks");
  await mkdir(tasks, { recursive: true });
  await writeFile(join(tasks, "plan.md"), packetCount === 1
    ? "# Plan\n\nImplement P01, then stop.\n"
    : "# Plan\n\nImplement P01, then P02, then stop.\n");
  await writeFile(join(tasks, "01_delivery.md"), "# P01\n\nImplement and verify the bounded result.\n");
  if (packetCount === 2) {
    await writeFile(join(tasks, "02_followup.md"), "# P02\n\nVerify the frozen product inputs remain authoritative.\n");
  }
}

async function fixture(t) {
  const directory = await temporaryDirectory(t, "eaw-product-amendments-");
  const root = join(directory, "product-data");
  const workspace = join(directory, "workspace");
  await initializeRepository(workspace);
  const initialized = await initializeProduct({
    root,
    workspace,
    name: "Amendment product",
    knownIdea: "Keep product amendments isolated and task checkpoints safe.",
  });
  await publishRoadmapTasks(root, initialized);
  return {
    root,
    workspace,
    productId: initialized.result.product_id,
    context: (await resolveWorkspace({ root, workspace })).context,
  };
}

async function reserveAndPrepare(f, taskId, slug, packetCount = 1) {
  const reserved = await reserveTaskSpecification({
    root: f.root,
    context: f.context,
    taskId,
    specificationSlug: slug,
  });
  await createReviewedSpecification(f.workspace, slug, packetCount);
  return reserved;
}

async function advanceGeneration(root, productId, contextValue, decision) {
  const selected = decodedContext(contextValue);
  const loaded = await loadGeneration(root, productId, selected.target_revision);
  let decisionHeads = loaded.generation.decision_heads;
  if (decision !== undefined) {
    const saved = await saveObject(root, {
      productId,
      kind: "decision",
      artifact: decision.ref.artifact,
      decisionId: decision.ref.id,
      revision: decision.ref.revision,
      bytes: bytes(decision),
    });
    decisionHeads = [...decisionHeads.filter((entry) => entry.decision_ref.id !== decision.ref.id), {
      decision_ref: decision.ref,
      object_sha256: saved.sha256,
    }];
  }
  const generation = await saveGeneration(root, {
    ...loaded.generation,
    parent: loaded.sha256,
    decision_heads: decisionHeads,
  });
  await writeFile(join(root, "products", productId, "head.yaml"), bytes({
    schema_version: 1,
    kind: "head",
    product_id: productId,
    generation: generation.sha256,
    operation_id: randomUUID(),
  }));
  return generation;
}

function decision(productId, state, text, id = randomUUID(), predecessors = []) {
  return {
    schema_version: 1,
    kind: "decision",
    ref: { product_id: productId, artifact: "roadmap", id, revision: 1 },
    state,
    category: "implementation-safety",
    question: state === "answered" ? "How should affected work proceed?" : null,
    text,
    source: state === "answered" ? "fixture-customer:answer" : "fixture-agent:finding",
    selected_ids: state === "answered" ? ["accept-safe-path"] : [],
    predecessors,
    affected_refs: [{ product_id: productId, artifact: "roadmap", element_id: "TASK-0001" }],
    reconsider_when: null,
    candidate_id: randomUUID(),
  };
}

test("P13 publishes amendment and safety scenarios with exact effects", () => {
  const expected = new Map([
    ["product_amendment_prepare", true],
    ["product_amendment_impact", false],
    ["product_amendment_rebase", true],
    ["product_safety_block", true],
    ["product_safety_resolve", true],
  ]);
  for (const [name, write] of expected) {
    const tool = workflowTools.find((candidate) => candidate.name === name);
    assert.ok(tool, `missing workflow tool ${name}`);
    assert.equal(tool.schemaKind, "json");
    assert.equal(tool.inputSchema.type, "object");
    assert.equal(tool.outputSchema.type, "object");
    assert.equal(tool.write, write);
  }
});

test("Q29: started work keeps frozen inputs while unstarted work reconciles current product", async (t) => {
  const f = await fixture(t);
  const first = await reserveAndPrepare(f, "TASK-0001", "started-task", 2);
  const second = await reserveAndPrepare(f, "TASK-0002", "unstarted-task");
  const started = await startTaskPacket({
    root: f.root,
    context: first.context,
    taskId: "TASK-0001",
    packetId: "P01",
    invocationSource: "fixture-invocation:p13",
  });
  const oldVersion = decodedContext(started.context).target_revision;
  const nextGeneration = await advanceGeneration(f.root, f.productId, started.context);
  assert.notEqual(nextGeneration.sha256, oldVersion);

  const staleStartedCheck = await checkTaskInputs({
    root: f.root,
    context: started.context,
    taskId: "TASK-0001",
    packetId: "P01",
  });
  assert.equal(staleStartedCheck.result.status, "pass");
  assert.equal(staleStartedCheck.result.source_version, oldVersion);
  const firstCompleted = await completeTaskPacket({
    root: f.root,
    context: started.context,
    taskId: "TASK-0001",
    packetId: "P01",
    ownerRef: started.operationRef,
    evidenceRefs: ["focused:product-amendments:q29"],
    taskFinished: false,
  });
  assert.equal(firstCompleted.result.task_id, "TASK-0001");
  const secondStarted = await startTaskPacket({
    root: f.root,
    context: started.context,
    taskId: "TASK-0001",
    packetId: "P02",
    invocationSource: "fixture-invocation:p13-followup",
  });
  assert.equal(secondStarted.result.task_id, "TASK-0001");
  await completeTaskPacket({
    root: f.root,
    context: secondStarted.context,
    taskId: "TASK-0001",
    packetId: "P02",
    ownerRef: secondStarted.operationRef,
    evidenceRefs: ["focused:product-amendments:q29-followup"],
    taskFinished: true,
  });

  await assert.rejects(startTaskPacket({
    root: f.root,
    context: second.context,
    taskId: "TASK-0002",
    packetId: "P01",
    invocationSource: "fixture-invocation:obsolete",
  }), expectCode("CONFLICT"));
  const current = (await resolveWorkspace({ root: f.root, workspace: f.workspace })).context;
  const currentUnstarted = await checkTaskInputs({
    root: f.root,
    context: current,
    taskId: "TASK-0002",
    packetId: "P01",
  });
  assert.equal(currentUnstarted.result.status, "pass");
  assert.equal(currentUnstarted.result.source_version, nextGeneration.sha256);
});

test("Q29: amendment preparation, impact and explicit no-overlap rebase remain bounded", async (t) => {
  const f = await fixture(t);
  await reserveAndPrepare(f, "TASK-0001", "amendment-impact");
  const base = decodedContext(f.context).target_revision;
  const prepared = await prepareAmendment({
    root: f.root,
    context: f.context,
    artifact: "roadmap",
    baseGeneration: base,
    intentText: "Clarify delivery wording without changing the shared interface.",
    source: "fixture-customer:amendment",
  });
  assert.equal(prepared.result.candidate_ref.product_id, f.productId);
  assert.equal(prepared.result.decision_ref.artifact, "roadmap");
  const impact = await inspectAmendmentImpact({
    root: f.root,
    context: prepared.context,
    candidateRef: prepared.result.candidate_ref,
    limit: 20,
  });
  assert.equal(impact.result.complete, true);
  assert.ok(impact.result.items.some((entry) => entry.title === "TASK-0001" && entry.state === "reconcile"));

  const answer = decision(f.productId, "answered", "Carry the isolated wording clarification onto the unchanged registry.");
  const rebasedGeneration = await advanceGeneration(f.root, f.productId, f.context, answer);
  const rebased = await rebaseAmendment({
    root: f.root,
    context: prepared.context,
    candidateRef: prepared.result.candidate_ref,
    newBaseGeneration: rebasedGeneration.sha256,
    resolutionRef: answer.ref,
  });
  assert.equal(decodedContext(rebased.context).target_revision, rebasedGeneration.sha256);
});

test("Q30: a concrete safety finding blocks only affected checkpoints until answered disposition", async (t) => {
  const f = await fixture(t);
  const first = await reserveAndPrepare(f, "TASK-0001", "affected-task");
  await reserveAndPrepare(f, "TASK-0002", "unaffected-task");
  const started = await startTaskPacket({
    root: f.root,
    context: first.context,
    taskId: "TASK-0001",
    packetId: "P01",
    invocationSource: "fixture-invocation:safety",
  });
  const finding = decision(f.productId, "observed", "A revoked authorization rule makes the old path unsafe.");
  await advanceGeneration(f.root, f.productId, started.context, finding);
  const current = (await resolveWorkspace({ root: f.root, workspace: f.workspace })).context;
  const blocked = await recordSafetyBlock({
    root: f.root,
    context: current,
    affectedRefs: finding.affected_refs,
    affectedTaskIds: ["TASK-0001"],
    reason: "security",
    explanation: finding.text,
    sourceRef: finding.ref,
  });
  assert.match(blocked.result.next, /disposition/u);

  const affected = await checkTaskInputs({
    root: f.root,
    context: current,
    taskId: "TASK-0001",
    packetId: "P01",
  });
  assert.equal(affected.result.status, "fail");
  assert.ok(affected.result.issues.some((entry) => entry.code === "SAFETY_BLOCK"));
  const unaffected = await checkTaskInputs({
    root: f.root,
    context: current,
    taskId: "TASK-0002",
    packetId: "P01",
  });
  assert.equal(unaffected.result.status, "pass");
  await assert.rejects(completeTaskPacket({
    root: f.root,
    context: current,
    taskId: "TASK-0001",
    packetId: "P01",
    ownerRef: started.operationRef,
    evidenceRefs: ["focused:product-amendments:q30"],
    taskFinished: true,
  }), expectCode("PREREQUISITE_REQUIRED"));
  await assert.rejects(resolveSafetyBlock({
    root: f.root,
    context: current,
    blockId: blocked.operationRef,
    answerRef: finding.ref,
  }), expectCode("PREREQUISITE_REQUIRED"));

  const unrelatedAnswer = decision(f.productId, "answered", "Answer an unrelated implementation question.");
  await advanceGeneration(f.root, f.productId, current, unrelatedAnswer);
  const unrelatedContext = (await resolveWorkspace({ root: f.root, workspace: f.workspace })).context;
  await assert.rejects(resolveSafetyBlock({
    root: f.root,
    context: unrelatedContext,
    blockId: blocked.operationRef,
    answerRef: unrelatedAnswer.ref,
  }), expectCode("PREREQUISITE_REQUIRED"));

  const answer = decision(
    f.productId,
    "answered",
    "Use the reviewed replacement authorization rule before resuming.",
    randomUUID(),
    [finding.ref],
  );
  await advanceGeneration(f.root, f.productId, unrelatedContext, answer);
  const answeredContext = (await resolveWorkspace({ root: f.root, workspace: f.workspace })).context;
  const resolved = await resolveSafetyBlock({
    root: f.root,
    context: answeredContext,
    blockId: blocked.operationRef,
    answerRef: answer.ref,
  });
  const ready = await checkTaskInputs({
    root: f.root,
    context: resolved.context,
    taskId: "TASK-0001",
    packetId: "P01",
  });
  assert.equal(ready.result.status, "pass");
});

test("P13 amendment impact cursor rejects a changed task-binding inventory", async (t) => {
  const f = await fixture(t);
  await reserveAndPrepare(f, "TASK-0001", "impact-page-one");
  await reserveAndPrepare(f, "TASK-0002", "impact-page-two");
  const base = decodedContext(f.context).target_revision;
  const prepared = await prepareAmendment({
    root: f.root,
    context: f.context,
    artifact: "roadmap",
    baseGeneration: base,
    intentText: "Clarify delivery wording while preserving task identities.",
    source: "fixture-customer:impact-cursor",
  });
  const first = await inspectAmendmentImpact({
    root: f.root,
    context: prepared.context,
    candidateRef: prepared.result.candidate_ref,
    limit: 1,
  });
  assert.equal(first.result.complete, false);
  assert.equal(typeof first.result.next_cursor, "string");

  const bindingPath = join(
    f.root,
    "products",
    f.productId,
    "tasks",
    "TASK-0002.yaml",
  );
  const binding = JSON.parse(await readFile(bindingPath, "utf8"));
  binding.safety_blocks = [randomUUID()];
  await writeFile(bindingPath, bytes(binding));

  await assert.rejects(inspectAmendmentImpact({
    root: f.root,
    context: prepared.context,
    candidateRef: prepared.result.candidate_ref,
    cursor: first.result.next_cursor,
    limit: 1,
  }), expectCode("STALE_CURSOR"));
});

test("P13 interrupted multi-task safety block fails closed and exact retry resumes", async (t) => {
  const f = await fixture(t);
  await reserveAndPrepare(f, "TASK-0001", "interrupted-affected-one");
  await reserveAndPrepare(f, "TASK-0002", "interrupted-affected-two");
  const finding = decision(f.productId, "observed", "A shared authorization rule is unsafe for both tasks.");
  await advanceGeneration(f.root, f.productId, f.context, finding);
  const context = (await resolveWorkspace({ root: f.root, workspace: f.workspace })).context;
  const input = {
    root: f.root,
    context,
    affectedRefs: finding.affected_refs,
    affectedTaskIds: ["TASK-0001", "TASK-0002"],
    reason: "security",
    explanation: finding.text,
    sourceRef: finding.ref,
  };

  await assert.rejects(recordSafetyBlock(input, {
    checkpoint: async (checkpoint) => {
      if (checkpoint === "binding:0") throw new Error("fixture interruption");
    },
  }), expectCode("RECOVERY_REQUIRED"));

  for (const taskId of input.affectedTaskIds) {
    const checked = await checkTaskInputs({ root: f.root, context, taskId });
    assert.equal(checked.result.status, "fail");
    assert.ok(checked.result.issues.some((entry) => entry.code === "RECOVERY_REQUIRED"));
  }

  const sourceRef = Object.fromEntries(Object.entries(finding.ref).reverse());
  const resumed = await recordSafetyBlock({ ...input, sourceRef });
  assert.equal(resumed.replayed, false);
  for (const taskId of input.affectedTaskIds) {
    const pending = await pendingOperationsForTarget({
      root: f.root,
      productId: f.productId,
      relativePath: `products/${f.productId}/tasks/${taskId}.yaml`,
    });
    const pendingRecords = await Promise.all(pending.map(async (operationId) => JSON.parse(await readFile(join(
      f.root,
      "products",
      f.productId,
      "operations",
      `${operationId}.yaml`,
    ), "utf8"))));
    assert.deepEqual(pendingRecords, []);
    const checked = await checkTaskInputs({ root: f.root, context: resumed.context, taskId });
    assert.equal(checked.result.status, "fail");
    assert.ok(checked.result.issues.some((entry) => entry.code === "SAFETY_BLOCK"));
    assert.ok(
      !checked.result.issues.some((entry) => entry.code === "RECOVERY_REQUIRED"),
      JSON.stringify(checked.result.issues),
    );
  }

  const replayed = await recordSafetyBlock({ ...input, context: resumed.context, sourceRef });
  assert.equal(replayed.replayed, true);
  assert.equal(replayed.operationRef, resumed.operationRef);

  const answer = decision(
    f.productId,
    "answered",
    "Continue only after applying the safe authorization path.",
    randomUUID(),
    [finding.ref],
  );
  await advanceGeneration(f.root, f.productId, resumed.context, answer);
  const answeredContext = (await resolveWorkspace({ root: f.root, workspace: f.workspace })).context;
  const resolved = await resolveSafetyBlock({
    root: f.root,
    context: answeredContext,
    blockId: resumed.operationRef,
    answerRef: answer.ref,
  });
  const reorderedAnswer = Object.fromEntries(Object.entries(answer.ref).reverse());
  const replayedResolution = await resolveSafetyBlock({
    root: f.root,
    context: resolved.context,
    blockId: resumed.operationRef,
    answerRef: reorderedAnswer,
  });
  assert.equal(replayedResolution.replayed, true);
  assert.equal(replayedResolution.operationRef, resolved.operationRef);
});
