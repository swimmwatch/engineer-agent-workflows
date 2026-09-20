import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { productCapabilities } from "../dist/product/bindings.js";
import {
  answerProductQuestion,
  confirmProductScope,
  draftProductArtifact,
  prepareProductQuestion,
  proposeProductScope,
  recordProductAssumption,
  recordProductInstruction,
  recordProductNoAnswer,
  recordProductObservation,
  recordProductResearch,
} from "../dist/product/interview.js";
import { saveGeneration, saveObject } from "../dist/product/storage.js";
import { workflowTools } from "../dist/server.js";

const digest = (value) => createHash("sha256").update(value).digest("hex");
const canonicalBytes = (value) => Buffer.from(`${JSON.stringify(value)}\n`);

function expectCode(code, secret) {
  return (error) => {
    assert.equal(error?.code, code);
    assert.doesNotMatch(error?.message ?? "", /\/tmp\/|\\Users\\|EAW_PRODUCT_DATA_DIR/u);
    if (secret !== undefined) assert.doesNotMatch(error?.message ?? "", new RegExp(secret, "u"));
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

function candidateVersion(candidate) {
  return digest(canonicalBytes(Object.fromEntries(
    Object.entries(candidate).filter(([key]) => key !== "source_version"),
  )));
}

async function fixture(t, { candidate = true, generationDecision = false } = {}) {
  const directory = await temporaryDirectory(t, "eaw-product-interview-");
  const root = join(directory, "product-data");
  const workspace = join(directory, "workspace");
  await mkdir(workspace);
  const productId = randomUUID();
  const workspaceId = randomUUID();
  const registryId = randomUUID();
  const ideaDocumentId = randomUUID();
  const ideaBytes = Buffer.from("# Idea\n\nKnown problem.\n");
  const ideaObject = await saveObject(root, { productId, kind: "markdown", bytes: ideaBytes });
  const registry = {
    schema_version: 1,
    kind: "registry",
    product_id: productId,
    documents: [{
      id: ideaDocumentId,
      artifact: "idea",
      role: "semantic",
      subject: "Initial idea",
      relative_path: "idea/overview.md",
      object_sha256: ideaObject.sha256,
    }],
    element_metadata: [],
  };
  const registryObject = await saveObject(root, {
    productId,
    kind: "record",
    bytes: canonicalBytes(registry),
  });
  const generationDecisionRef = {
    product_id: productId,
    artifact: "idea",
    id: randomUUID(),
    revision: 1,
  };
  const generationDecisionObject = generationDecision
    ? await saveObject(root, {
      productId,
      kind: "decision",
      artifact: "idea",
      decisionId: generationDecisionRef.id,
      revision: generationDecisionRef.revision,
      bytes: canonicalBytes({
        schema_version: 1,
        kind: "decision",
        ref: generationDecisionRef,
        state: "observed",
        category: "fixture",
        question: null,
        text: "Retained generation evidence.",
        source: "fixture",
        selected_ids: [],
        predecessors: [],
        affected_refs: [],
        reconsider_when: null,
        candidate_id: randomUUID(),
      }),
    })
    : null;
  const generation = await saveGeneration(root, {
    schema_version: 1,
    kind: "generation",
    product_id: productId,
    parent: null,
    registry: { id: registryId, object_sha256: registryObject.sha256 },
    ready_artifacts: [],
    decision_heads: generationDecisionObject === null ? [] : [{
      decision_ref: generationDecisionRef,
      object_sha256: generationDecisionObject.sha256,
    }],
    relations: [],
  });
  await mkdir(join(root, "products", productId), { recursive: true });
  await writeFile(join(root, "products", productId, "head.yaml"), canonicalBytes({
    schema_version: 1,
    kind: "head",
    product_id: productId,
    generation: generation.sha256,
    operation_id: randomUUID(),
  }));

  let candidateId = null;
  let contextCandidate = null;
  let selectedSources = digest("unselected fixture context");
  if (candidate) {
    candidateId = randomUUID();
    const value = {
      schema_version: 1,
      kind: "candidate",
      product_id: productId,
      candidate_id: candidateId,
      artifact: "idea",
      base_generation: generation.sha256,
      workspace_id: workspaceId,
      state: "draft",
      scope: { depth: "lite", profiles: [], rationale: [], confirmed_answer: null },
      registry: { id: registryId, object_sha256: registryObject.sha256 },
      upstream_pins: [],
      decision_heads: [],
      relations: [],
    };
    selectedSources = candidateVersion(value);
    const complete = { ...value, source_version: selectedSources };
    const draftRoot = join(root, "products", productId, "drafts", candidateId);
    await mkdir(join(draftRoot, "documents", "idea"), { recursive: true });
    await writeFile(join(draftRoot, "candidate.yaml"), canonicalBytes(complete));
    await writeFile(join(draftRoot, "documents", "idea", "overview.md"), ideaBytes);
    contextCandidate = { product_id: productId, candidate_id: candidateId };
  }

  const context = Buffer.from(JSON.stringify({
    contract: "product-1",
    store_id: randomUUID(),
    product_id: productId,
    workspace_id: workspaceId,
    candidate_ref: contextCandidate,
    selected_sources_sha256: selectedSources,
    target_revision: generation.sha256,
    canonical_workspace: workspace,
  })).toString("base64url");

  return {
    root,
    workspace,
    productId,
    workspaceId,
    candidateId,
    candidateRef: contextCandidate,
    context,
    generation: generation.sha256,
    generationDecisionRef,
    generationDecisionObject,
    candidatePath(id = candidateId) {
      return join(root, "products", productId, "drafts", id, "candidate.yaml");
    },
    decisionPath(ref) {
      return join(root, "products", productId, "decisions", ref.artifact, ref.id, `${ref.revision}.yaml`);
    },
  };
}

async function readCandidate(f, id = f.candidateId) {
  return JSON.parse(await readFile(f.candidatePath(id), "utf8"));
}

async function readDecision(f, ref) {
  return JSON.parse(await readFile(f.decisionPath(ref), "utf8"));
}

test("P06 publishes the complete interview contract and capability inventory", async (t) => {
  const expected = [
    "product_artifact_draft",
    "product_interview_resume",
    "product_question_answer",
    "product_question_no_answer",
    "product_question_prepare",
    "product_record_assumption",
    "product_record_instruction",
    "product_record_observation",
    "product_record_research",
    "product_scope_confirm",
    "product_scope_propose",
  ];
  const tools = workflowTools.filter((tool) => expected.includes(tool.name));
  assert.deepEqual(tools.map((tool) => tool.name).sort(), expected);
  for (const tool of tools) {
    assert.equal(tool.schemaKind, "json");
    assert.equal(tool.inputSchema.type, "object");
    assert.equal(tool.outputSchema.type, "object");
    assert.ok(tool.outputSchema.definitions);
  }
  assert.equal(tools.find((tool) => tool.name === "product_interview_resume").write, false);
  const f = await fixture(t, { candidate: false });
  const capabilities = await productCapabilities({ root: f.root });
  for (const name of expected) assert.ok(capabilities.result.tools.includes(name));
});

test("Q14: artifact draft and explicit scope answers resume without inventing consent", async (t) => {
  const empty = await fixture(t, { candidate: false });
  const drafted = await draftProductArtifact({
    root: empty.root,
    context: empty.context,
    artifact: "prd",
    upstreamPins: [],
  });
  const replayedDraft = await draftProductArtifact({
    root: empty.root,
    context: empty.context,
    artifact: "prd",
    upstreamPins: [],
  });
  assert.equal(replayedDraft.replayed, true);
  assert.deepEqual(replayedDraft.result, drafted.result);
  const draftedCandidate = await readCandidate(empty, drafted.result.candidate_ref.candidate_id);
  assert.equal(draftedCandidate.artifact, "prd");
  assert.equal(draftedCandidate.scope.confirmed_answer, null);

  const f = await fixture(t);
  const proposed = await proposeProductScope({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    depth: "standard",
    profiles: [{ id: "core", reason: "Product definition needs core behavior." }],
    rationale: ["One product stage and no implementation design."],
  });
  const replayedProposal = await proposeProductScope({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    depth: "standard",
    profiles: [{ id: "core", reason: "Product definition needs core behavior." }],
    rationale: ["One product stage and no implementation design."],
  });
  assert.equal(replayedProposal.replayed, true);
  assert.deepEqual(replayedProposal.result, proposed.result);

  const answered = await answerProductQuestion({
    root: f.root,
    context: proposed.context,
    candidateRef: f.candidateRef,
    questionRef: proposed.result.question_ref,
    text: "Confirm the proposed scope.",
    source: "request_user_input",
    selectedIds: ["confirm"],
  });
  const confirmed = await confirmProductScope({
    root: f.root,
    context: answered.context,
    candidateRef: f.candidateRef,
    proposalRef: proposed.result.question_ref,
    answerRef: answered.result.decision_ref,
  });
  const confirmedCandidate = await readCandidate(f);
  assert.deepEqual(confirmedCandidate.scope.confirmed_answer, answered.result.decision_ref);
  assert.equal(confirmed.result.question_ref, null);

  const unresolved = await fixture(t);
  const unresolvedProposal = await proposeProductScope({
    root: unresolved.root,
    context: unresolved.context,
    candidateRef: unresolved.candidateRef,
    depth: "lite",
    profiles: [{ id: "core", reason: "Only product essentials." }],
    rationale: ["Compact known idea."],
  });
  const noAnswer = await recordProductNoAnswer({
    root: unresolved.root,
    context: unresolvedProposal.context,
    candidateRef: unresolved.candidateRef,
    questionRef: unresolvedProposal.result.question_ref,
    outcome: "dismissed",
  });
  await assert.rejects(confirmProductScope({
    root: unresolved.root,
    context: noAnswer.context,
    candidateRef: unresolved.candidateRef,
    proposalRef: unresolvedProposal.result.question_ref,
    answerRef: noAnswer.result.decision_ref,
  }), expectCode("ANSWER_REQUIRED"));
  assert.equal((await readCandidate(unresolved)).scope.confirmed_answer, null);
});

test("Q15: partial amendments preserve predecessor evidence and unrelated source pins", async (t) => {
  const f = await fixture(t);
  const prepared = await prepareProductQuestion({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    category: "scope",
    text: "Which actors are affected?",
    options: [{ id: "operators", label: "Operators" }],
  });
  const answered = await answerProductQuestion({
    root: f.root,
    context: prepared.context,
    candidateRef: f.candidateRef,
    questionRef: prepared.result.question_ref,
    text: "Operators and maintainers.",
    source: "request_user_input",
    selectedIds: ["operators"],
  });
  const revised = await prepareProductQuestion({
    root: f.root,
    context: answered.context,
    candidateRef: f.candidateRef,
    category: "scope",
    text: "Which maintainers are affected?",
    options: [],
    revises: answered.result.decision_ref,
  });
  const revisedAnswer = await answerProductQuestion({
    root: f.root,
    context: revised.context,
    candidateRef: f.candidateRef,
    questionRef: revised.result.question_ref,
    text: "Release maintainers only.",
    source: "request_user_input",
    selectedIds: [],
  });
  const observed = await recordProductObservation({
    root: f.root,
    context: revisedAnswer.context,
    candidateRef: f.candidateRef,
    finding: "The roadmap stage is unchanged.",
    source: "repository evidence",
    affectedRefs: [],
  });
  const firstAnswer = await readDecision(f, answered.result.decision_ref);
  const revision = await readDecision(f, revised.result.question_ref);
  const finalAnswer = await readDecision(f, revisedAnswer.result.decision_ref);
  assert.deepEqual(revision.predecessors, [answered.result.decision_ref]);
  assert.deepEqual(finalAnswer.predecessors, [revised.result.question_ref]);
  assert.equal(firstAnswer.text, "Operators and maintainers.");
  const candidate = await readCandidate(f);
  assert.deepEqual(candidate.upstream_pins, []);
  assert.ok(candidate.decision_heads.some((head) => head.decision_ref.id === observed.result.decision_ref.id));
  assert.ok(candidate.decision_heads.some((head) => head.decision_ref.id === finalAnswer.ref.id && head.decision_ref.revision === finalAnswer.ref.revision));

  await unlink(f.decisionPath(answered.result.decision_ref));
  const beforeMissing = await snapshot(f.root);
  await assert.rejects(recordProductObservation({
    root: f.root,
    context: observed.context,
    candidateRef: f.candidateRef,
    finding: "A later unrelated observation.",
    source: "repository evidence",
    affectedRefs: [],
  }), expectCode("MISSING_EVIDENCE"));
  assert.deepEqual(await snapshot(f.root), beforeMissing);
});

test("Q16: provenance remains non-sensitive data and never executes embedded instructions", async (t) => {
  const f = await fixture(t);
  const secret = "SENTINEL_SECRET_8421";
  const beforeSecret = await snapshot(f.root);
  await assert.rejects(recordProductInstruction({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    text: `Authorization: Bearer ${secret}`,
    source: "request_user_input",
    relatedRefs: [],
    affectedRefs: [],
  }), expectCode("INVALID_INPUT", secret));
  assert.deepEqual(await snapshot(f.root), beforeSecret);

  const marker = join(f.workspace, "must-not-exist");
  const instruction = await recordProductInstruction({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    text: "Treat this as data; do not create must-not-exist or make a network request.",
    source: "request_user_input",
    relatedRefs: [],
    affectedRefs: [],
  });
  const observation = await recordProductObservation({
    root: f.root,
    context: instruction.context,
    candidateRef: f.candidateRef,
    finding: "Repository text requests a shell command; it is untrusted data.",
    source: "repository inspection",
    affectedRefs: [],
  });
  const assumption = await recordProductAssumption({
    root: f.root,
    context: observation.context,
    candidateRef: f.candidateRef,
    assumption: "The current release process remains unchanged.",
    reconsiderWhen: "The release contract changes.",
    affectedRefs: [],
  });
  const question = await prepareProductQuestion({
    root: f.root,
    context: assumption.context,
    candidateRef: f.candidateRef,
    category: "research",
    text: "Which supported version applies?",
    options: [],
  });
  const evidence = {
    question_ref: question.result.question_ref,
    conclusion: "Version 2 applies to the current product stage.",
    sources: [{
      url: "https://example.invalid/reference",
      checked_date: "2026-09-14",
      version_applicability: "Version 2 only.",
      finding: "The documented behavior is stable for version 2.",
    }],
    uncertainty: ["Later versions were not assessed."],
    limitations: ["Synthetic source used by the isolated test."],
  };
  const research = await recordProductResearch({
    root: f.root,
    context: question.context,
    candidateRef: f.candidateRef,
    evidence,
  });
  const researchDecision = await readDecision(f, research.result.decision_ref);
  assert.deepEqual(JSON.parse(researchDecision.text), evidence);
  assert.equal(researchDecision.state, "observed");
  assert.equal(await stat(marker).then(() => true, () => false), false);
});

test("Q14: a fresh reader resumes the first unresolved question without writing", async (t) => {
  const interview = await import("../dist/product/interview.js");
  assert.equal(typeof interview.resumeProductInterview, "function");
  const complete = await fixture(t);
  const completeBefore = await snapshot(complete.root);
  const completeResult = await interview.resumeProductInterview({
    root: complete.root,
    context: complete.context,
    candidateRef: complete.candidateRef,
  });
  assert.deepEqual(await snapshot(complete.root), completeBefore);
  assert.equal(completeResult.result.state, "complete");
  assert.equal(completeResult.result.question_ref, null);
  for (const artifact of ["idea", "prd", "technical-design", "roadmap"]) {
    const f = await fixture(t, { candidate: false });
    const drafted = await draftProductArtifact({
      root: f.root,
      context: f.context,
      artifact,
      upstreamPins: [],
    });
    const proposed = await proposeProductScope({
      root: f.root,
      context: drafted.context,
      candidateRef: drafted.result.candidate_ref,
      depth: "lite",
      profiles: [{ id: "core", reason: "Resume fixture." }],
      rationale: ["Resume the first unresolved question."],
    });
    const noAnswer = await recordProductNoAnswer({
      root: f.root,
      context: proposed.context,
      candidateRef: drafted.result.candidate_ref,
      questionRef: proposed.result.question_ref,
      outcome: "dismissed",
    });
    const before = await snapshot(f.root);
    const resumed = await interview.resumeProductInterview({
      root: f.root,
      context: noAnswer.context,
      candidateRef: drafted.result.candidate_ref,
    });
    assert.deepEqual(await snapshot(f.root), before);
    assert.equal(resumed.context, noAnswer.context);
    assert.equal(resumed.result.state, "no_answer");
    assert.deepEqual(resumed.result.question_ref, noAnswer.result.decision_ref);
    assert.equal(resumed.result.question, "Confirm the proposed interview depth, active profiles, and artifact scope.");
    assert.deepEqual(resumed.result.options.map((option) => option.id), ["confirm", "change"]);
    assert.equal(resumed.result.last_outcome, "dismissed");
  }
});

test("Q15: artifact drafting rejects inconsistent decision source-pin identities", async (t) => {
  const f = await fixture(t, { candidate: false, generationDecision: true });
  const badPin = {
    product_id: f.productId,
    artifact: "roadmap",
    source_kind: "decision",
    source_id: randomUUID(),
    generation: f.generation,
    object_sha256: f.generationDecisionObject.sha256,
    element_ids: [],
    decision_ref: f.generationDecisionRef,
  };
  const before = await snapshot(f.root);
  await assert.rejects(draftProductArtifact({
    root: f.root,
    context: f.context,
    artifact: "prd",
    upstreamPins: [badPin],
  }), expectCode("SOURCE_CHANGED"));
  assert.deepEqual(await snapshot(f.root), before);
});

test("Q16: research requires a question owner and never truncates reconsideration evidence", async (t) => {
  const f = await fixture(t);
  const instruction = await recordProductInstruction({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    text: "Use the current workflow.",
    source: "request_user_input",
    relatedRefs: [],
    affectedRefs: [],
  });
  const beforeOwner = await snapshot(f.root);
  await assert.rejects(recordProductResearch({
    root: f.root,
    context: instruction.context,
    candidateRef: f.candidateRef,
    evidence: {
      question_ref: instruction.result.decision_ref,
      conclusion: "This evidence has no owning question.",
      sources: [],
      uncertainty: [],
      limitations: [],
    },
  }), expectCode("INVALID_INPUT"));
  assert.deepEqual(await snapshot(f.root), beforeOwner);

  const question = await prepareProductQuestion({
    root: f.root,
    context: instruction.context,
    candidateRef: f.candidateRef,
    category: "research",
    text: "What remains uncertain?",
    options: [],
  });
  const beforeLimit = await snapshot(f.root);
  await assert.rejects(recordProductResearch({
    root: f.root,
    context: question.context,
    candidateRef: f.candidateRef,
    evidence: {
      question_ref: question.result.question_ref,
      conclusion: "Bounded evidence.",
      sources: [],
      uncertainty: ["A".repeat(4090), "BBBBBBBBBB"],
      limitations: [],
    },
  }), expectCode("SOURCE_LIMIT"));
  assert.deepEqual(await snapshot(f.root), beforeLimit);
});

test("Q16: credential-bearing URIs are rejected before evidence is written", async (t) => {
  const f = await fixture(t);
  const secret = "SyntheticPassword42";
  const before = await snapshot(f.root);
  await assert.rejects(recordProductInstruction({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    text: `postgresql://fixture:${secret}@db.example.invalid/app`,
    source: "request_user_input",
    relatedRefs: [],
    affectedRefs: [],
  }), expectCode("INVALID_INPUT", secret));
  assert.deepEqual(await snapshot(f.root), before);
});
