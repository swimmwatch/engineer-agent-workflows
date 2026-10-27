import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { main as verifyEvidenceMain } from "../scripts/verify-workflow-evidence.mjs";

import {
  loadWorkflowEvidenceRegistry,
  verifyWorkflowEvidence,
} from "./lib/workflow-evidence.mjs";
import { makeTempTree, readFixture } from "./lib/fixtures.mjs";

const digest = "a".repeat(64);

function eventsFor(scenario) {
  let seq = 0;
  const event = (type, fields = {}) => ({ seq: ++seq, type, ...fields });
  const requirementIds = scenario.acceptanceRequirements.map(
    (_, index) => `${scenario.id}-AR-${index + 1}`,
  );
  return [
    event("stage_started", { stage: "specification" }),
    event("material_answer", { questionId: "scope-1", status: "answered" }),
    event("profile_confirmation", {
      explicit: true,
      depth: scenario.depth,
      profiles: scenario.profiles,
    }),
    ...scenario.profiles.map((profile) =>
      event("profile_reference_read", { stage: "specification", profile }),
    ),
    event("artifact_write", {
      stage: "specification",
      target: "specification-artifact",
      artifact: "spec.md",
      digest: "b".repeat(64),
    }),
    event("stage_completed", {
      stage: "specification",
      status: "passed",
      contractDigest: "b".repeat(64),
    }),
    event("stage_started", { stage: "planning" }),
    event("contract_read", { digest: "b".repeat(64), status: "approved" }),
    ...scenario.profiles.map((profile) =>
      event("profile_reference_read", { stage: "planning", profile }),
    ),
    event("artifact_write", {
      stage: "planning",
      target: "planning-artifact",
      artifact: "plan.md",
    }),
    event("artifact_write", {
      stage: "planning",
      target: "planning-artifact",
      artifact: "todo.md",
    }),
    event("artifact_write", {
      stage: "planning",
      target: "planning-artifact",
      artifact: "handoff.md",
    }),
    event("packet_declared", { packetId: "packet-1", requirementIds, requiredProofs: [] }),
    event("stage_completed", { stage: "planning", status: "passed" }),
    event("stage_started", { stage: "implementation" }),
    event("packet_authorized", { packetId: "packet-1" }),
    event("packet_prerequisites", { packetId: "packet-1", status: "passed" }),
    event("packet_started", { packetId: "packet-1" }),
    event("test_observation", {
      packetId: "packet-1",
      testId: "behavior-1",
      requirementIds,
      phase: "red",
      status: "failed",
      meaningful: true,
      contractAligned: true,
    }),
    event("artifact_write", {
      stage: "implementation",
      target: "production",
      packetId: "packet-1",
      artifact: "src/change.example",
    }),
    event("test_observation", {
      packetId: "packet-1",
      testId: "behavior-1",
      requirementIds,
      phase: "green",
      status: "passed",
      meaningful: true,
      contractAligned: true,
    }),
    event("check", {
      stage: "implementation",
      packetId: "packet-1",
      checkId: "focused-tests",
      status: "passed",
    }),
    event("packet_completed", { packetId: "packet-1", status: "passed" }),
    event("stage_completed", { stage: "implementation", status: "passed" }),
    event("external_acceptance", {
      status: "passed",
      requirementIds,
      evidenceRef: `acceptance/${scenario.id}.json`,
      evidenceDigest: "f".repeat(64),
    }),
    event("evaluation_claim", { claim: "workflow-compliant" }),
  ];
}

function runFor(scenario, host, pass, set = scenario.set) {
  const sharedModel = host === "codex" ? "gpt-6.1-sol" : "claude-opus-5";
  const implementationModel = host === "codex" ? "gpt-6.1-terra" : "claude-sonnet-5";
  return {
    runId: `${set}-${host}-${scenario.id}-${pass}`,
    scenarioId: scenario.id,
    host,
    stageActors: {
      specification: {
        actorId: `${host}-${scenario.id}-${pass}-spec-actor`,
        sessionId: `${host}-${scenario.id}-${pass}-spec-session`,
        actualModel: sharedModel,
      },
      planning: {
        actorId: `${host}-${scenario.id}-${pass}-plan-actor`,
        sessionId: `${host}-${scenario.id}-${pass}-plan-session`,
        actualModel: sharedModel,
      },
      implementation: {
        actorId: `${host}-${scenario.id}-${pass}-implementation-actor`,
        sessionId: `${host}-${scenario.id}-${pass}-implementation-session`,
        actualModel: implementationModel,
      }
    },
    provenance: {
      classification: "SYNTHETIC",
      actualHost: host,
      bundleRef: "source/generated-bundles",
      bundleDigest: digest,
      traceKind: "derived-trace",
      traceRef: `synthetic/${host}/${scenario.id}/${pass}/trace.json`,
      traceDigest: "c".repeat(64),
      sourceRefs: [{
        ref: `synthetic/${host}/${scenario.id}/${pass}/events.jsonl`,
        digest: "d".repeat(64)
      }],
    },
    events: eventsFor(scenario),
  };
}

function validEvidence(registry) {
  const byId = new Map(registry.scenarios.map((scenario) => [scenario.id, scenario]));
  const runsForMatrix = (matrix, pass, set) =>
    Object.entries(matrix).flatMap(([host, scenarioIds]) =>
      scenarioIds.map((scenarioId) => runFor(byId.get(scenarioId), host, pass, set)),
    );
  const allRuns = [];
  const fullPasses = Array.from(
    { length: registry.policy.stablePasses },
    (_, index) => {
      const pass = index + 1;
      const runs = runsForMatrix(registry.policy.fullMatrix, pass, "full");
      allRuns.push(...runs);
      return {
        pass,
        sourceRef: "source/generated-bundles",
        sourceDigest: digest,
        sourceBeforeDigest: digest,
        sourceAfterDigest: digest,
        sourceChanged: false,
        runs,
      };
    },
  );
  const holdoutRuns = runsForMatrix(registry.policy.holdoutMatrix, 1, "holdout");
  allRuns.push(...holdoutRuns);
  return {
    schemaVersion: 1,
    classification: "SYNTHETIC",
    selectedHostRoles: Object.fromEntries(
      Object.keys(registry.policy.fullMatrix).map((host) => [host, {
        specification: host === "codex" ? "gpt-6.1-sol" : "claude-opus-5",
        planning: host === "codex" ? "gpt-6.1-sol" : "claude-opus-5",
        review: host === "codex" ? "gpt-6.1-sol" : "claude-opus-5",
        implementation: host === "codex" ? "gpt-6.1-terra" : "claude-sonnet-5"
      }]),
    ),
    fullPasses,
    holdoutRuns,
    evaluations: allRuns.map((run) => ({
      runId: run.runId,
      reviewerActorId: `external-${run.runId}-actor`,
      reviewerSessionId: `external-${run.runId}-session`,
      reviewerModel: run.stageActors.specification.actualModel,
      reviewerType: "external",
      status: "passed",
      evidenceRef: `${run.provenance.traceRef}.review.json`,
      evidenceDigest: "e".repeat(64),
    })),
  };
}

function attachSyntheticArtifactManifest(evidence) {
  const artifacts = new Map();
  const capture = (ref, digest) => artifacts.set(ref, { ref, digest });
  for (const pass of evidence.fullPasses) capture(pass.sourceRef, pass.sourceDigest);
  const runs = [
    ...evidence.fullPasses.flatMap(({ runs: passRuns }) => passRuns),
    ...evidence.holdoutRuns,
  ];
  for (const run of runs) {
    capture(run.provenance.traceRef, run.provenance.traceDigest);
    for (const source of run.provenance.sourceRefs ?? []) {
      capture(source.ref, source.digest);
    }
    const acceptance = run.events.find(({ type }) => type === "external_acceptance");
    capture(acceptance.evidenceRef, acceptance.evidenceDigest);
  }
  for (const evaluation of evidence.evaluations) {
    capture(evaluation.evidenceRef, evaluation.evidenceDigest);
  }
  evidence.artifacts = [...artifacts.values()];
  return evidence;
}

function findingCodes(report) {
  return report.findings.map((finding) => finding.code);
}

test("CLI rejects self-attested actual metadata without captured artifact bytes", async (t) => {
  const registry = await loadWorkflowEvidenceRegistry();
  const forged = attachSyntheticArtifactManifest(validEvidence(registry));
  forged.classification = "ACTUAL";
  for (const run of [...forged.fullPasses.flatMap(({ runs }) => runs), ...forged.holdoutRuns]) {
    run.provenance.classification = "ACTUAL";
  }
  const root = await makeTempTree(t, { "evidence.json": JSON.stringify(forged) });
  let output = "";
  const io = { stdout: { write(value) { output += value; } }, stderr: { write() {} } };
  assert.equal(await verifyEvidenceMain([path.join(root, "evidence.json")], io), 1);
  assert.equal(JSON.parse(output).behaviorCertified, false);
});

test("malformed report diagnostics do not repeat input contents", async (t) => {
  const root = await makeTempTree(t, { "invalid.json": "NOT_JSON_CANARY" });
  let diagnostic = "";
  const io = { stdout: { write() {} }, stderr: { write(value) { diagnostic += value; } } };
  assert.equal(await verifyEvidenceMain([path.join(root, "invalid.json")], io), 2);
  assert.doesNotMatch(diagnostic, /NOT_JSON/);
});

function mutateFirstRun(evidence, mutate) {
  const changed = structuredClone(evidence);
  mutate(changed.fullPasses[0].runs[0], changed);
  return changed;
}

function useTwoAuthorizedPacketsWithoutReviewOrCommit(run) {
  const implementationStart = run.events.find(
    (event) => event.type === "stage_started" && event.stage === "implementation",
  );
  const implementationComplete = run.events.find(
    (event) => event.type === "stage_completed" && event.stage === "implementation",
  );
  const acceptance = run.events.find(({ type }) => type === "external_acceptance");
  const claim = run.events.find(({ type }) => type === "evaluation_claim");
  const requirements = run.events.find(({ type }) => type === "packet_declared")
    .requirementIds;
  run.events = run.events.filter(
    (event) =>
      event.seq <= implementationStart.seq ||
      ![
        "packet_started",
        "packet_authorized",
        "packet_prerequisites",
        "test_observation",
        "artifact_write",
        "check",
        "packet_review",
        "packet_commit",
        "packet_completed",
        "stage_completed",
        "external_acceptance",
        "evaluation_claim",
      ].includes(event.type),
  );
  const declaration = run.events.find(({ type }) => type === "packet_declared");
  declaration.requirementIds = requirements.slice(0, 2);
  run.events.push({
    seq: declaration.seq + 0.25,
    type: "packet_declared",
    packetId: "packet-2",
    requirementIds: requirements.slice(2),
    requiredProofs: [],
  });
  let seq = implementationStart.seq;
  for (const [packetId, packetRequirements] of [
    ["packet-1", requirements.slice(0, 2)],
    ["packet-2", requirements.slice(2)],
  ]) {
    run.events.push({ seq: (seq += 1), type: "packet_authorized", packetId });
    run.events.push({
      seq: (seq += 1),
      type: "packet_prerequisites",
      packetId,
      status: "passed",
    });
    run.events.push({ seq: (seq += 1), type: "packet_started", packetId });
    run.events.push({
      seq: (seq += 1),
      type: "test_observation",
      packetId,
      testId: `${packetId}-behavior`,
      requirementIds: packetRequirements,
      phase: "red",
      status: "failed",
      meaningful: true,
      contractAligned: true,
    });
    run.events.push({
      seq: (seq += 1),
      type: "artifact_write",
      stage: "implementation",
      target: "production",
      packetId,
      artifact: `src/${packetId}.example`,
    });
    run.events.push({
      seq: (seq += 1),
      type: "test_observation",
      packetId,
      testId: `${packetId}-behavior`,
      requirementIds: packetRequirements,
      phase: "green",
      status: "passed",
      meaningful: true,
      contractAligned: true,
    });
    run.events.push({
      seq: (seq += 1),
      type: "check",
      stage: "implementation",
      packetId,
      checkId: `${packetId}-focused-tests`,
      status: "passed",
    });
    run.events.push({
      seq: (seq += 1),
      type: "packet_completed",
      packetId,
      status: "passed",
    });
  }
  run.events.push({ ...implementationComplete, seq: (seq += 1) });
  run.events.push({ ...acceptance, seq: (seq += 1) });
  run.events.push({ ...claim, seq: (seq += 1) });
}

test("workflow registry contains the five full and two held-out simulation scenarios", async () => {
  const registry = await loadWorkflowEvidenceRegistry();
  const adversarial = JSON.parse(
    await readFixture("workflow-loop", "adversarial.json"),
  );

  assert.equal(registry.classification, "SIMULATION");
  assert.equal(registry.scenarios.filter(({ set }) => set === "full").length, 5);
  assert.equal(registry.scenarios.filter(({ set }) => set === "holdout").length, 2);
  assert.deepEqual(Object.keys(registry.policy.fullMatrix), ["codex", "claude-code"]);
  assert.equal(registry.policy.fullMatrix.codex.length, 5);
  assert.equal(registry.policy.fullMatrix["claude-code"].length, 2);
  assert.deepEqual(Object.keys(registry.policy.holdoutMatrix), ["codex"]);
  assert.deepEqual(
    adversarial.scenarios.map(({ id }) => id),
    [
      "no-answer",
      "stale-contract",
      "contradictory-test",
      "unavailable-environment",
      "resume-incomplete-packet",
      "next-packet-without-review-commit",
    ],
  );
  for (const scenario of adversarial.scenarios) {
    assert.equal(scenario.customerFacts.classification, "SIMULATION");
    assert.equal(scenario.answerRubric.classification, "SIMULATION");
    assert.ok(scenario.prompt.length > 20);
    assert.ok(scenario.acceptanceRequirements.length >= 2);
  }
  for (const scenario of registry.scenarios) {
    assert.equal(scenario.customerFacts.classification, "SIMULATION");
    assert.equal(scenario.answerRubric.classification, "SIMULATION");
    assert.ok(scenario.prompt.length > 20);
    assert.ok(scenario.acceptanceRequirements.length >= 2);
  }
  const fixtureText = `${JSON.stringify(registry)}\n${JSON.stringify(adversarial)}`;
  assert.doesNotMatch(fixtureText, /\/home\/|[A-Z]:\\Users\\|TOKEN=|PASSWORD=|PRIVATE_/);
  assert.doesNotMatch(fixtureText, /expectedSkillWording|intendedCodeFix/);
});

test("synthetic traces validate only under the explicit unit-test option", async () => {
  const registry = await loadWorkflowEvidenceRegistry();
  const evidence = validEvidence(registry);

  const report = verifyWorkflowEvidence(evidence, registry, {
    allowSynthetic: true,
  });
  assert.equal(report.ok, true, JSON.stringify(report.findings, null, 2));
  assert.match(report.sourceDigest, /^[a-f0-9]{64}$/);
  assert.equal(report.verificationKind, "evidence-consistency");
  assert.equal(report.behaviorCertified, false);

  const rawEvidence = structuredClone(evidence);
  const rawRun = rawEvidence.fullPasses[0].runs[0];
  rawRun.provenance.traceKind = "raw-cli-events";
  delete rawRun.provenance.sourceRefs;
  assert.equal(
    verifyWorkflowEvidence(rawEvidence, registry, { allowSynthetic: true }).ok,
    true,
  );

  const productionReport = verifyWorkflowEvidence(evidence, registry);
  assert.equal(productionReport.ok, false);
  assert.ok(findingCodes(productionReport).includes("synthetic-evidence"));
});

test("captured reference digests are consistency-checked without certifying behavior", async () => {
  const registry = await loadWorkflowEvidenceRegistry();
  const evidence = attachSyntheticArtifactManifest(validEvidence(registry));
  const options = { allowSynthetic: true, verifySyntheticReferences: true };
  const report = verifyWorkflowEvidence(evidence, registry, options);

  assert.equal(report.ok, true, JSON.stringify(report.findings, null, 2));
  assert.equal(report.behaviorCertified, false);
  assert.equal(
    evidence.evaluations[0].reviewerModel,
    evidence.selectedHostRoles.codex.review,
  );

  for (const evidenceRef of [
    evidence.fullPasses[0].runs[0].provenance.traceRef,
    evidence.fullPasses[0].runs[0].events.find(
      ({ type }) => type === "external_acceptance",
    ).evidenceRef,
  ]) {
    const changed = structuredClone(evidence);
    changed.artifacts.find(({ ref }) => ref === evidenceRef).digest = "0".repeat(64);
    const changedReport = verifyWorkflowEvidence(changed, registry, options);
    assert.ok(
      findingCodes(changedReport).includes("evidence-reference-unresolved"),
      evidenceRef,
    );
    assert.equal(changedReport.behaviorCertified, false);
  }
});

test("provenance must identify the actual host, model, and trace sources", async () => {
  const registry = await loadWorkflowEvidenceRegistry();
  const evidence = validEvidence(registry);
  const variants = [
    ["host-provenance-mismatch", (run) => (run.provenance.actualHost = "claude-code")],
    ["stage-model-mismatch", (run) => {
      run.stageActors.implementation.actualModel = "other-model";
    }],
    ["stage-session-invalid", (run) => {
      run.stageActors.planning.sessionId = run.stageActors.specification.sessionId;
    }],
    ["trace-provenance-missing", (run) => (run.provenance.traceRef = "")],
    ["trace-provenance-missing", (run) => (run.provenance.sourceRefs = [])],
  ];

  for (const [expectedCode, mutate] of variants) {
    const report = verifyWorkflowEvidence(
      mutateFirstRun(evidence, mutate),
      registry,
      { allowSynthetic: true },
    );
    assert.ok(findingCodes(report).includes(expectedCode), expectedCode);
  }
});

test("stage boundaries, confirmed profile routing, and approved contract are enforced", async () => {
  const registry = await loadWorkflowEvidenceRegistry();
  const evidence = validEvidence(registry);
  const variants = [
    ["material-answer-missing", (run) => {
      run.events = run.events.filter(({ type }) => type !== "material_answer");
      const confirmation = run.events.find(
        ({ type }) => type === "profile_confirmation",
      );
      run.events.push({
        seq: confirmation.seq - 0.5,
        type: "material_question",
        questionId: "scope-1",
        status: "asked",
      });
    }],
    ["reference-before-confirmation", (run) => {
      const reference = run.events.find(({ type }) => type === "profile_reference_read");
      reference.seq = 1.5;
    }],
    ["inactive-profile-reference", (run) => {
      run.events.push({ seq: 999, type: "profile_reference_read", profile: "security" });
    }],
    ["contract-digest-mismatch", (run) => {
      run.events.find(({ type }) => type === "contract_read").digest = "c".repeat(64);
    }],
    ["production-write-before-implementation", (run) => {
      run.events.push({
        seq: 5.5,
        type: "artifact_write",
        stage: "specification",
        target: "production",
        artifact: "src/too-early.example",
      });
    }],
    ["required-stage-evidence-missing", (run) => {
      run.events = run.events.filter(
        (event) => !(event.type === "stage_completed" && event.stage === "planning"),
      );
    }],
  ];

  for (const [expectedCode, mutate] of variants) {
    const report = verifyWorkflowEvidence(
      mutateFirstRun(evidence, mutate),
      registry,
      { allowSynthetic: true },
    );
    assert.ok(findingCodes(report).includes(expectedCode), expectedCode);
  }
});

test("inline-confirmed Lite facts do not require an invented question answer", async () => {
  const registry = await loadWorkflowEvidenceRegistry();
  const evidence = validEvidence(registry);
  const liteRuns = evidence.fullPasses.flatMap(({ runs }) =>
    runs.filter(({ scenarioId }) => scenarioId === "lite-cli-core"),
  );
  for (const run of liteRuns) {
    run.events = run.events.filter(({ type }) => type !== "material_answer");
  }

  const report = verifyWorkflowEvidence(evidence, registry, {
    allowSynthetic: true,
  });
  assert.equal(report.ok, true, JSON.stringify(report.findings, null, 2));
});

test("test-first, packet isolation, checks, and final acceptance cannot be waived", async () => {
  const registry = await loadWorkflowEvidenceRegistry();
  const evidence = validEvidence(registry);
  const variants = [
    ["meaningful-test-first-missing", (run) => {
      run.events.find((event) => event.phase === "red").meaningful = false;
    }],
    ["meaningful-test-first-missing", (run) => {
      run.events.find((event) => event.phase === "red").requirementIds = [];
    }],
    ["meaningful-test-first-missing", (run) => {
      run.events.find((event) => event.phase === "red").contractAligned = false;
    }],
    ["failed-check-counted-as-pass", (run) => {
      run.events.find(({ type }) => type === "check").status = "skipped";
    }],
    ["failed-check-counted-as-pass", (run) => {
      run.events.find(({ type }) => type === "check").status = "unavailable";
    }],
    ["failed-check-counted-as-pass", (run) => {
      run.events.find(({ type }) => type === "check").status = "failed";
    }],
    ["cross-packet-write", (run) => {
      run.events.find(
        (event) => event.type === "artifact_write" && event.target === "production",
      ).packetId = "packet-2";
    }],
    ["resume-packet-mismatch", (run) => {
      const write = run.events.find(
        (event) => event.type === "artifact_write" && event.target === "production",
      );
      run.events.push({
        seq: write.seq - 0.75,
        type: "packet_paused",
        packetId: "packet-1",
      });
      run.events.push({
        seq: write.seq - 0.5,
        type: "packet_resumed",
        packetId: "packet-2",
      });
    }],
    ["next-packet-before-completion", (run) => {
      const completion = run.events.find(({ type }) => type === "packet_completed");
      run.events.push({
        seq: completion.seq - 0.5,
        type: "packet_started",
        packetId: "packet-2",
      });
    }],
    ["external-acceptance-missing", (run) => {
      run.events = run.events.filter(({ type }) => type !== "external_acceptance");
    }],
    ["external-acceptance-incomplete", (run) => {
      run.events.find(({ type }) => type === "external_acceptance").requirementIds.pop();
    }],
    ["evaluation-unreviewed", (run, changed) => {
      changed.evaluations = changed.evaluations.filter(({ runId }) => runId !== run.runId);
    }],
  ];

  for (const [expectedCode, mutate] of variants) {
    const report = verifyWorkflowEvidence(
      mutateFirstRun(evidence, mutate),
      registry,
      { allowSynthetic: true },
    );
    assert.ok(findingCodes(report).includes(expectedCode), expectedCode);
  }
});

test("two authorized packets need passed prerequisites and checks, not review or commit", async () => {
  const registry = await loadWorkflowEvidenceRegistry();
  const evidence = validEvidence(registry);
  useTwoAuthorizedPacketsWithoutReviewOrCommit(evidence.fullPasses[0].runs[0]);
  const run = evidence.fullPasses[0].runs[0];
  const firstActor = run.stageActors.implementation;
  const secondActor = {
    ...firstActor,
    actorId: `${firstActor.actorId}-next-invocation`,
    sessionId: `${firstActor.sessionId}-next-invocation`,
  };
  run.stageActors.implementation = [firstActor, secondActor];
  run.events.filter(({ type }) => type === "packet_started").forEach((event, index) => {
    event.sessionId = run.stageActors.implementation[index].sessionId;
  });

  const report = verifyWorkflowEvidence(evidence, registry, {
    allowSynthetic: true,
  });
  assert.equal(report.ok, true, JSON.stringify(report.findings, null, 2));
});

test("one implementation invocation cannot start a second packet", async () => {
  const registry = await loadWorkflowEvidenceRegistry();
  const evidence = validEvidence(registry);
  useTwoAuthorizedPacketsWithoutReviewOrCommit(evidence.fullPasses[0].runs[0]);
  const report = verifyWorkflowEvidence(evidence, registry, { allowSynthetic: true });
  assert.ok(findingCodes(report).includes("multiple-packets-per-invocation"));
});

test("a paused packet cannot verify or complete until explicitly resumed", async () => {
  const registry = await loadWorkflowEvidenceRegistry();
  const evidence = validEvidence(registry);
  const run = evidence.fullPasses[0].runs[0];
  const green = run.events.find(({ phase }) => phase === "green");
  run.events.push({ seq: green.seq - 0.2, type: "packet_paused", packetId: "packet-1" });
  const options = { allowSynthetic: true };
  const failed = verifyWorkflowEvidence(evidence, registry, options);
  assert.ok(findingCodes(failed).includes("inactive-packet-check"));
  assert.ok(findingCodes(failed).includes("packet-completion-invalid"));
  run.events.push({ seq: green.seq - 0.1, type: "packet_resumed", packetId: "packet-1" });
  const resumed = verifyWorkflowEvidence(evidence, registry, options);
  assert.equal(resumed.ok, true, JSON.stringify(resumed.findings));
});

test("external review uses the selected review model, not the implementation model", async () => {
  const registry = await loadWorkflowEvidenceRegistry();
  for (const host of Object.keys(registry.policy.fullMatrix)) {
    const evidence = validEvidence(registry);
    const run = evidence.fullPasses[0].runs.find((item) => item.host === host);
    evidence.evaluations.find(({ runId }) => runId === run.runId).reviewerModel =
      evidence.selectedHostRoles[host].implementation;
    const report = verifyWorkflowEvidence(evidence, registry, { allowSynthetic: true });
    assert.ok(findingCodes(report).includes("review-model-mismatch"), host);
  }
});

test("frozen source resolves to a captured artifact and matches every run", async () => {
  const registry = await loadWorkflowEvidenceRegistry();
  const evidence = attachSyntheticArtifactManifest(validEvidence(registry));
  const options = { allowSynthetic: true, verifySyntheticReferences: true };
  const unresolved = structuredClone(evidence);
  unresolved.artifacts = unresolved.artifacts.filter(({ ref }) => ref !== evidence.fullPasses[0].sourceRef);
  assert.ok(findingCodes(verifyWorkflowEvidence(unresolved, registry, options))
    .includes("evidence-reference-unresolved"));
  const changed = structuredClone(evidence);
  changed.holdoutRuns[0].provenance.bundleDigest = "0".repeat(64);
  assert.ok(findingCodes(verifyWorkflowEvidence(changed, registry, options))
    .includes("run-source-mismatch"));
});

test("selected role labels cannot override the independent trial policy", async () => {
  const registry = await loadWorkflowEvidenceRegistry();
  const evidence = validEvidence(registry);
  evidence.selectedHostRoles.codex.review = "gpt-6.1-terra";
  for (const evaluation of evidence.evaluations) {
    if (evaluation.runId.includes("-codex-")) evaluation.reviewerModel = "gpt-6.1-terra";
  }
  assert.ok(findingCodes(verifyWorkflowEvidence(evidence, registry, { allowSynthetic: true }))
    .includes("host-role-not-permitted"));
  evidence.selectedHostRoles.codex.review = "gpt-6-astra";
  for (const evaluation of evidence.evaluations) {
    if (evaluation.runId.includes("-codex-")) evaluation.reviewerModel = "gpt-6-astra";
  }
  const report = verifyWorkflowEvidence(evidence, registry, { allowSynthetic: true });
  assert.equal(report.ok, true, JSON.stringify(report.findings));
});

test("required PROVE needs a discriminating mutation and restored passing check", async () => {
  const registry = await loadWorkflowEvidenceRegistry();
  const evidence = validEvidence(registry);
  const run = evidence.fullPasses[0].runs[0];
  run.events.find(({ type }) => type === "packet_declared").requiredProofs = ["behavior-1"];
  const verify = () => verifyWorkflowEvidence(evidence, registry, { allowSynthetic: true });
  assert.ok(findingCodes(verify()).includes("required-prove-missing"));
  const green = run.events.find(({ phase }) => phase === "green");
  run.events.push({ ...green, seq: green.seq + 0.1, phase: "prove", status: "failed", mutationId: "wrong-result" });
  assert.ok(findingCodes(verify()).includes("required-prove-missing"));
  run.events.push({ ...green, seq: green.seq + 0.2, phase: "restored-green", mutationId: "wrong-result" });
  assert.equal(verify().ok, true, JSON.stringify(verify().findings));
  run.events.find(({ phase }) => phase === "prove").meaningful = false;
  assert.ok(findingCodes(verify()).includes("required-prove-missing"));
});

test("every active profile is read within both specification and planning", async () => {
  const registry = await loadWorkflowEvidenceRegistry();
  const evidence = validEvidence(registry);
  const changed = mutateFirstRun(evidence, (run) => {
    run.events = run.events.filter(
      (event) =>
        !(
          event.type === "profile_reference_read" &&
          event.stage === "planning" &&
          event.profile === "core"
        ),
    );
  });

  const report = verifyWorkflowEvidence(changed, registry, {
    allowSynthetic: true,
  });
  assert.ok(findingCodes(report).includes("active-profile-reference-missing"));
});

test("artifact writes and final checks stay inside their declared stages", async () => {
  const registry = await loadWorkflowEvidenceRegistry();
  const evidence = validEvidence(registry);
  const variants = [
    ["artifact-stage-boundary-invalid", (run) => {
      run.events.find(
        (event) => event.type === "artifact_write" && event.artifact === "plan.md",
      ).seq = run.events.find(
        (event) => event.type === "stage_started" && event.stage === "implementation",
      ).seq + 0.25;
    }],
    ["check-stage-boundary-invalid", (run) => {
      run.events.find(({ type }) => type === "check").stage = "planning";
    }],
  ];

  for (const [expectedCode, mutate] of variants) {
    const report = verifyWorkflowEvidence(
      mutateFirstRun(evidence, mutate),
      registry,
      { allowSynthetic: true },
    );
    assert.ok(findingCodes(report).includes(expectedCode), expectedCode);
  }
});

test("two unchanged full passes and the separate holdout matrix are required", async () => {
  const registry = await loadWorkflowEvidenceRegistry();
  const evidence = validEvidence(registry);
  const variants = [
    ["full-pass-count", (changed) => changed.fullPasses.pop()],
    ["source-digest-changed", (changed) => {
      changed.fullPasses[1].sourceDigest = "d".repeat(64);
    }],
    ["source-mutated-during-pass", (changed) => {
      changed.fullPasses[0].sourceChanged = true;
    }],
    ["matrix-run-missing", (changed) => changed.fullPasses[0].runs.pop()],
    ["holdout-run-missing", (changed) => changed.holdoutRuns.pop()],
  ];

  for (const [expectedCode, mutate] of variants) {
    const changed = structuredClone(evidence);
    mutate(changed);
    const report = verifyWorkflowEvidence(changed, registry, {
      allowSynthetic: true,
    });
    assert.ok(findingCodes(report).includes(expectedCode), expectedCode);
  }
});
