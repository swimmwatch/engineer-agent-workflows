import assert from "node:assert/strict";
import test from "node:test";
import { verifyWorkflowEvidence } from "./lib/workflow-evidence.mjs";

const digest = "a".repeat(64);
function fixture() {
  const scenario = { id: "b2-candidate", fixture: "b2", variant: "candidate", depth: "Lite", profiles: ["core"], specificationInput: "frozen-approved", requireTechnicalAgreement: true, requiredPacketCount: 1, acceptanceRequirements: ["Fixture contract"] };
  const run = {
    runId: "simulation", host: "codex", scenarioId: scenario.id,
    provenance: { classification: "SYNTHETIC", actualHost: "codex", traceKind: "raw-cli-events", traceRef: "trace.jsonl", traceDigest: digest, bundleRef: "sources.json", bundleDigest: digest },
    events: [
      { seq: 1, type: "packet_declared", packetId: "P01" },
      { seq: 2, type: "packet_started", packetId: "P01", sessionId: "impl-session", atMs: 240 },
      { seq: 3, type: "artifact_write", target: "production", packetId: "P01", artifact: "configuration.mjs", atMs: 250, itemId: "write-1", digest },
      { seq: 4, type: "artifact_write", target: "production", packetId: "P01", artifact: "configuration.mjs", atMs: 350, itemId: "write-2", digest },
    ], stageActors: { specification: { actorId: "setup", sessionId: "setup-session", kind: "fixture-setup", actualModel: null }, planning: { actorId: "plan", sessionId: "plan-session", actualModel: "fixture-model" }, implementation: { actorId: "impl", sessionId: "impl-session", actualModel: "fixture-model" } },
    specificationSetup: { kind: "frozen-approved", status: "approved", ref: "approved-input.json", digest, sourceVersion: digest, specificationVersion: digest, reviewRef: "fixture-review" },
    workflowSource: { variant: "candidate", ref: "candidate-inputs.json", digest },
    benchmark: { clock: "monotonic-ms", startMs: 100, endMs: 410, setupMs: 20, elapsedMs: 310, blockingRespondentMs: 10, respondentMs: 10, orchestrationMs: 40, activeMs: 260, phases: [{ stage: "planning", sessionId: "plan-session", startMs: 100, endMs: 200 }, { stage: "implementation", sessionId: "impl-session", startMs: 220, endMs: 380 }, { stage: "verification", sessionId: "oracle", startMs: 400, endMs: 410 }] },
    nativeQuestions: [{ requestId: "native-1", askedAtMs: 130, answeredAtMs: 140, blocking: true, outcome: "answered", explicit: true }],
    technicalAgreements: [{ packetId: "P01", requestId: "native-1", proposalDigest: digest, agreementRef: { id: "decision-1", revision: 2 }, firstWriteAtMs: 250, lastWriteAtMs: 350, entry: { status: "ready", observedBy: "actor", atMs: 230, proposalDigest: digest, agreementRef: { id: "decision-1", revision: 2 } }, exit: { status: "ready", observedBy: "actor", atMs: 375, proposalDigest: digest, agreementRef: { id: "decision-1", revision: 2 } } }],
  };
  const roles = Object.fromEntries(["specification", "planning", "implementation", "review"].map(x => [x, "fixture-model"]));
  const registry = { policy: { stablePasses: 1, holdoutPasses: 0, fullMatrix: { codex: [scenario.id] }, holdoutMatrix: {}, hostModelRoles: { codex: Object.fromEntries(Object.keys(roles).map(x => [x, [roles[x]]])) }, technicalBenchmark: true }, scenarios: [scenario] };
  const evidence = { classification: "SYNTHETIC", selectedHostRoles: { codex: roles }, fullPasses: [{ pass: 1, sourceRef: "sources.json", sourceDigest: digest, sourceBeforeDigest: digest, sourceAfterDigest: digest, sourceChanged: false, runs: [run] }] };
  return { run, registry, evidence };
}
function codes(f) {
  return verifyWorkflowEvidence(f.evidence, f.registry, { allowSynthetic: true }).findings.map(x => x.code).filter(x => /^(technical-|frozen-)/.test(x));
}

test("technical timing rejects missing endpoints and invented active duration", () => {
  for (const mutate of [r => { delete r.benchmark.endMs; }, r => { r.benchmark.activeMs = 1; }, r => { r.benchmark.phases[1].startMs = 150; }, r => { r.nativeQuestions[0].answeredAtMs = 500; }]) {
    const f = fixture(); mutate(f.run);
    assert.ok(codes(f).includes("technical-timing-invalid"));
  }
});
test("technical timing preserves a valid interval calculation without treating unknown tokens as zero", () => {
  const f = fixture();
  assert.deepEqual(codes(f), []);
  assert.equal(f.run.benchmark.tokens, undefined);
});
test("technical agreement rejects a default or a non-answer and requires both actor readiness checks", () => {
  for (const mutate of [r => { r.nativeQuestions[0].explicit = false; }, r => { r.nativeQuestions[0].outcome = "dismissed"; }, r => { r.technicalAgreements[0].entry.status = "stale"; }, r => { r.technicalAgreements[0].exit.observedBy = "evaluator"; }, r => { r.technicalAgreements[0].entry.atMs = 270; }, r => { r.technicalAgreements[0].exit.proposalDigest = "b".repeat(64); }]) {
    const f = fixture(); mutate(f.run);
    assert.ok(codes(f).includes("technical-agreement-invalid"));
  }
});
test("frozen specification setup cannot claim a model actor or missing reviewed input", () => {
  for (const mutate of [r => { r.stageActors.specification.actualModel = "fixture-model"; }, r => { delete r.specificationSetup; }]) {
    const f = fixture(); mutate(f.run);
    assert.ok(codes(f).includes("frozen-specification-invalid"));
  }
});
test("benchmark source identity must match its frozen variant", () => {
  const f = fixture(); f.run.workflowSource.variant = "baseline";
  assert.ok(codes(f).includes("technical-source-invalid"));
});

test("technical agreements cover the declared packets and their actual write windows", () => {
  for (const mutate of [
    r => { r.technicalAgreements[0].packetId = "OTHER"; },
    r => { r.events.find(e => e.type === "packet_declared").packetId = "OTHER"; },
    r => { r.technicalAgreements[0].firstWriteAtMs = 251; },
    r => { r.technicalAgreements[0].lastWriteAtMs = 349; },
    r => { r.benchmark.phases[1].sessionId = "OTHER"; },
    r => { r.technicalAgreements[0].exit.atMs = 390; },
  ]) {
    const f = fixture(); mutate(f.run);
    assert.ok(codes(f).some(code => ["technical-agreement-invalid", "technical-timing-invalid"].includes(code)));
  }
});

function capturedFixture() {
  const f = fixture(), identity = "b".repeat(64), baselineIdentity = "c".repeat(64);
  f.run.workflowSource.sourceIdentity = identity;
  f.run.provenance.sourceRefs = [{ ref: "result.json", digest }];
  const agreement = f.run.technicalAgreements[0];
  agreement.entry.itemId = "entry";
  agreement.exit.itemId = "exit";
  const items = [agreement.entry, agreement.exit].map(gate => ({ atMs: gate.atMs, item: {
    id: gate.itemId, type: "mcpToolCall", tool: "planning_packet_check", status: "completed", error: null,
    arguments: { packet_id: agreement.packetId, agreement_ref: agreement.agreementRef, expected_proposal_digest: digest },
    result: { structuredContent: { result: { status: "ready", proposal_digest: digest, agreement_ref: agreement.agreementRef } } },
  } }));
  const capturedDocuments = new Map([
    ["sources.json", { kind: "immutable-comparison-input-manifest", frozenInput: { ref: "frozen.json", digest },
      sources: { candidate: { ref: "candidate-inputs.json", digest }, baseline: { ref: "baseline.json", digest } },
      sourceIdentities: { candidate: identity, baseline: baselineIdentity } }],
    ["frozen.json", { sourceDigests: { candidate: identity, baseline: baselineIdentity } }],
    ["candidate-inputs.json", { variant: "candidate", sourceDigest: identity }],
    ["baseline.json", { variant: "baseline", sourceDigest: baselineIdentity }],
    ["result.json", { id: f.run.runId, variant: "candidate", workflowSourceDigest: identity, stages: [
      { stage: "planning", sessionId: "plan-session", nativeQuestions: structuredClone(f.run.nativeQuestions) },
      { stage: "implementation", sessionId: "impl-session", items, writes: f.run.events.filter(e => e.type === "artifact_write")
        .map(e => ({ path: e.artifact, atMs: e.atMs, itemId: e.itemId, after: e.digest })) },
    ] }],
  ]);
  f.evidence.artifacts = [...capturedDocuments.keys()].map(ref => ({ ref, digest }));
  return { ...f, capturedDocuments };
}

const capturedCodes = f => verifyWorkflowEvidence(f.evidence, f.registry, {
  allowSynthetic: true, capturedDocuments: f.capturedDocuments,
}).findings.map(x => x.code).filter(x => /^technical-/.test(x));

test("captured source selection and packet gates accept matching original observations", () => {
  assert.deepEqual(capturedCodes(capturedFixture()), []);
});

test("candidate source binding rejects baseline reuse and inconsistent frozen identities", () => {
  for (const mutate of [
    f => { f.run.workflowSource = { variant: "candidate", ref: "baseline.json", digest, sourceIdentity: "c".repeat(64) }; },
    f => { f.run.workflowSource.sourceIdentity = "c".repeat(64); },
    f => { f.capturedDocuments.get("result.json").workflowSourceDigest = "c".repeat(64); },
    f => { f.capturedDocuments.get("candidate-inputs.json").variant = "baseline"; },
    f => { f.capturedDocuments.get("frozen.json").sourceDigests.candidate = "c".repeat(64); },
    f => { f.capturedDocuments.delete("sources.json"); },
  ]) {
    const f = capturedFixture(); mutate(f);
    assert.ok(capturedCodes(f).includes("technical-source-invalid"));
  }
});

test("agreement gate pointers must resolve to the matching raw packet invocation", () => {
  for (const mutate of [
    f => { f.capturedDocuments.get("result.json").stages[1].items[0].item.arguments.packet_id = "OTHER"; },
    f => { f.capturedDocuments.get("result.json").stages[1].items[0].item.tool = "specification_check_state"; },
    f => { f.capturedDocuments.get("result.json").stages[1].items[1].item.result.structuredContent.result.proposal_digest = "d".repeat(64); },
    f => { f.run.technicalAgreements[0].entry.itemId = "missing"; },
    f => { f.capturedDocuments.get("result.json").stages[1].sessionId = "OTHER"; },
    f => { f.capturedDocuments.get("result.json").stages[1].writes[0].atMs = 200; },
    f => { f.capturedDocuments.get("result.json").stages[0].nativeQuestions[0].outcome = "dismissed"; },
  ]) {
    const f = capturedFixture(); mutate(f);
    assert.ok(capturedCodes(f).includes("technical-agreement-invalid"));
  }
});

test("actual technical reports cannot omit captured source and invocation documents", () => {
  const f = fixture(); f.run.provenance.classification = "ACTUAL";
  assert.ok(codes(f).includes("technical-capture-missing"));
});

test("focused semantic routing rejects a technical label that preserves behavioral approval", () => {
  const f = fixture();
  f.registry.scenarios[0].set = "focused";
  f.registry.scenarios[0].safeguard = "behavior-routing";
  f.registry.policy.fullMatrix = {};
  f.registry.policy.focusedMatrix = { codex: [f.run.scenarioId] };
  f.evidence.fullPasses[0].runs = [];
  f.evidence.focusedRuns = [f.run];
  f.run.focusedObservations = { returnedTo: "planning", behavioralReviewInvalidated: false, noProductionWrites: true };
  assert.ok(codes(f).includes("technical-safeguard-invalid"));
});

test("frozen Approved setup does not fabricate a specification model profile read", () => {
  const f = fixture();
  f.run.events = [
    { seq: 1, type: "stage_started", stage: "specification" },
    { seq: 2, type: "profile_confirmation", explicit: true, depth: "Lite", profiles: ["core"] },
    { seq: 3, type: "stage_completed", stage: "specification", status: "passed" },
    { seq: 4, type: "stage_started", stage: "planning" },
    { seq: 5, type: "stage_completed", stage: "planning", status: "passed" },
    { seq: 6, type: "stage_started", stage: "implementation" },
    { seq: 7, type: "stage_completed", stage: "implementation", status: "passed" },
  ];
  const missing = () => verifyWorkflowEvidence(f.evidence, f.registry, { allowSynthetic: true }).findings
    .filter(x => x.code === "active-profile-reference-missing").map(x => x.message);
  assert.deepEqual(missing(), ["Active profile reference core was not observed within planning."]);
  delete f.registry.scenarios[0].specificationInput;
  assert.ok(missing().some(x => x.endsWith("within specification.")));
});

function incompleteBaseline() {
  const f = fixture();
  const scenario = f.registry.scenarios[0];
  scenario.id = "b2-baseline";
  scenario.variant = "baseline";
  scenario.requireTechnicalAgreement = false;
  f.registry.policy.fullMatrix.codex = [scenario.id];
  f.run.scenarioId = scenario.id;
  f.run.workflowSource = { variant: "baseline", ref: "baseline.json", digest };
  f.run.comparisonOutcome = { status: "incomplete", findingCodes: ["required-prove-missing"], evidenceRef: "review.json", evidenceDigest: digest };
  const requirements = ["b2-baseline-AR-1"];
  f.run.events = [
    { type: "stage_started", stage: "specification" },
    { type: "profile_confirmation", explicit: true, depth: "Lite", profiles: ["core"] },
    { type: "artifact_write", stage: "specification", target: "specification-artifact", artifact: "spec.md", digest },
    { type: "stage_completed", stage: "specification", status: "passed", contractDigest: digest },
    { type: "stage_started", stage: "planning" },
    { type: "contract_read", status: "approved", digest },
    { type: "profile_reference_read", stage: "planning", profile: "core" },
    ...["plan.md", "todo.md", "handoff.md"].map(artifact => ({ type: "artifact_write", stage: "planning", target: "planning-artifact", artifact })),
    { type: "packet_declared", packetId: "P01", requirementIds: requirements, requiredProofs: ["valid-output"] },
    { type: "stage_completed", stage: "planning", status: "passed" },
    { type: "stage_started", stage: "implementation" },
    { type: "packet_authorized", packetId: "P01" },
    { type: "packet_prerequisites", packetId: "P01", status: "passed" },
    { type: "packet_started", packetId: "P01" },
    { type: "test_observation", packetId: "P01", testId: "behavior", requirementIds: requirements, phase: "red", status: "failed", meaningful: true, contractAligned: true },
    { type: "artifact_write", stage: "implementation", target: "production", packetId: "P01", artifact: "configuration.mjs" },
    { type: "test_observation", packetId: "P01", testId: "behavior", phase: "green", status: "passed", meaningful: true, contractAligned: true },
    { type: "check", stage: "implementation", packetId: "P01", checkId: "suite", status: "passed" },
    { type: "packet_completed", packetId: "P01", status: "passed" },
    { type: "stage_completed", stage: "implementation", status: "passed" },
    { type: "external_acceptance", status: "passed", requirementIds: requirements, evidenceRef: "acceptance.json", evidenceDigest: digest },
    { type: "evaluation_claim" },
  ].map((event, index) => ({ seq: index + 1, ...event }));
  f.evidence.evaluations = [{ runId: f.run.runId, reviewerType: "external", reviewerActorId: "review", reviewerSessionId: "review-session", reviewerModel: "fixture-model", status: "incomplete", evidenceRef: "review.json", evidenceDigest: digest }];
  f.evidence.artifacts = ["sources.json", "trace.jsonl", "approved-input.json", "baseline.json", "review.json", "acceptance.json"].map(ref => ({ ref, digest }));
  return f;
}

const comparisonReport = f => verifyWorkflowEvidence(f.evidence, f.registry, { allowSynthetic: true, verifySyntheticReferences: true });

test("an attributed incomplete baseline remains visible without becoming a successful delivery", () => {
  const f = incompleteBaseline(), before = structuredClone(f.evidence);
  const report = comparisonReport(f);
  assert.equal(report.ok, true);
  assert.deepEqual(report.findings, []);
  assert.deepEqual(report.comparisonFindings.map(x => x.code), ["required-prove-missing"]);
  assert.ok(report.comparisonFindings.every(x => x.runId === f.run.runId && x.comparisonOutcome === "incomplete" && x.countedAsSuccess === false));
  assert.equal(report.behaviorCertified, false);
  assert.deepEqual(f.evidence, before);
});

test("a baseline omission remains a required failure without its explicit comparison outcome", () => {
  const f = incompleteBaseline(); delete f.run.comparisonOutcome;
  const report = comparisonReport(f);
  assert.equal(report.ok, false);
  assert.ok(report.findings.some(x => x.code === "required-prove-missing"));
  assert.ok(report.findings.some(x => x.code === "evaluation-unreviewed"));
});

test("negative baseline accounting rejects candidates, unverifiable reviews and invented outcomes", () => {
  const mutations = [
    f => { f.run.comparisonOutcome = null; },
    f => { f.run.comparisonOutcome = "incomplete"; },
    f => { f.registry.scenarios[0].variant = "candidate"; f.run.workflowSource.variant = "candidate"; },
    f => { f.registry.policy.technicalBenchmark = false; },
    f => { f.registry.scenarios[0].set = "focused"; },
    f => { f.run.comparisonOutcome.status = "passed"; },
    f => { f.run.comparisonOutcome.findingCodes = []; },
    f => { f.run.comparisonOutcome.findingCodes = ["technical-timing-invalid"]; },
    f => { f.run.comparisonOutcome.evidenceDigest = "b".repeat(64); },
    f => { f.run.comparisonOutcome.evidenceRef = "another-review.json"; },
    f => { f.evidence.evaluations[0].status = "passed"; },
    f => { f.evidence.evaluations[0].reviewerActorId = "impl"; },
    f => { f.evidence.evaluations[0].reviewerModel = "another-model"; },
    f => { f.evidence.evaluations = []; },
    f => { f.run.events.find(e => e.type === "packet_declared").requiredProofs = []; },
  ];
  for (const mutate of mutations) {
    const f = incompleteBaseline(); mutate(f);
    const report = comparisonReport(f);
    assert.equal(report.ok, false);
    assert.ok(report.findings.some(x => x.code === "comparison-outcome-invalid"));
  }
});

test("comparison outcomes cannot hide timing, provenance, captured-reference or failed-check errors", () => {
  for (const [mutate, code] of [
    [f => { f.run.benchmark.activeMs = 1; }, "technical-timing-invalid"],
    [f => { f.run.provenance.bundleDigest = "b".repeat(64); }, "run-source-mismatch"],
    [f => { f.evidence.artifacts = f.evidence.artifacts.filter(a => a.ref !== "review.json"); }, "evidence-reference-unresolved"],
    [f => { f.run.events.find(e => e.type === "check").status = "failed"; }, "failed-check-counted-as-pass"],
  ]) {
    const f = incompleteBaseline(); mutate(f);
    const report = comparisonReport(f);
    assert.equal(report.ok, false);
    assert.ok(report.findings.some(x => x.code === code));
  }
});
