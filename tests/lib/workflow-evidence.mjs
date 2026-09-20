import fs from "node:fs/promises";

import { fixturePath } from "./fixtures.mjs";

const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const REQUIRED_STAGES = ["specification", "planning", "implementation"];
const REQUIRED_PLANNING_ARTIFACTS = ["plan.md", "todo.md", "handoff.md"];

export async function loadWorkflowEvidenceRegistry(
  registryPath = fixturePath("workflow-loop", "registry.json"),
) {
  return JSON.parse(await fs.readFile(registryPath, "utf8"));
}

function sameMembers(actual, expected) {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    expected.every((value) => actual.includes(value))
  );
}

function acceptanceIds(scenario) {
  return scenario.acceptanceRequirements.map(
    (_, index) => `${scenario.id}-AR-${index + 1}`,
  );
}

function indexEvents(events) {
  if (!Array.isArray(events)) return [];
  return [...events].sort((left, right) => left.seq - right.seq);
}

function eventOf(events, type, predicate = () => true) {
  return events.find((event) => event.type === type && predicate(event));
}

function verifyReference(
  ref,
  digest,
  evidence,
  run,
  add,
  allowSynthetic,
  verifySyntheticReferences,
) {
  if (
    allowSynthetic &&
    run.provenance?.classification === "SYNTHETIC" &&
    !verifySyntheticReferences
  ) {
    return;
  }
  const safeRef =
    typeof ref === "string" &&
    ref.length > 0 &&
    !ref.startsWith("/") &&
    !ref.split(/[\\/]/).includes("..");
  const artifact = (evidence.artifacts ?? []).find((item) => item.ref === ref);
  if (
    !safeRef ||
    !DIGEST_PATTERN.test(digest ?? "") ||
    artifact?.digest !== digest
  ) {
    add(
      "evidence-reference-unresolved",
      `Evidence reference ${ref || "missing"} does not resolve to its captured digest.`,
      run,
    );
  }
}

function verifyProvenance(
  run,
  evidence,
  add,
  allowSynthetic,
  verifySyntheticReferences,
) {
  const provenance = run.provenance ?? {};
  if (provenance.classification === "SYNTHETIC" && !allowSynthetic) {
    add("synthetic-evidence", "Synthetic traces cannot establish model behavior.", run);
  } else if (
    provenance.classification !== "ACTUAL" &&
    provenance.classification !== "SYNTHETIC"
  ) {
    add("actual-provenance-missing", "Trace provenance is not marked ACTUAL.", run);
  }
  if (!run.host || provenance.actualHost !== run.host) {
    add("host-provenance-mismatch", "Actual host provenance is missing or mismatched.", run);
  }
  const supportedKind = ["raw-cli-events", "derived-trace"].includes(
    provenance.traceKind,
  );
  const hasDerivedSources =
    provenance.traceKind !== "derived-trace" ||
    (Array.isArray(provenance.sourceRefs) && provenance.sourceRefs.length > 0);
  if (
    !supportedKind ||
    !provenance.traceRef ||
    !DIGEST_PATTERN.test(provenance.traceDigest ?? "") ||
    !hasDerivedSources
  ) {
    add(
      "trace-provenance-missing",
      "A raw event reference or derived trace with source references is required.",
      run,
    );
  }
  verifyReference(
    provenance.traceRef,
    provenance.traceDigest,
    evidence,
    run,
    add,
    allowSynthetic,
    verifySyntheticReferences,
  );
  for (const source of provenance.sourceRefs ?? []) {
    verifyReference(
      source.ref,
      source.digest,
      evidence,
      run,
      add,
      allowSynthetic,
      verifySyntheticReferences,
    );
  }
}

function verifyStageActors(run, selectedRoles, add) {
  const actors = run.stageActors ?? {};
  const sessions = new Set();
  const actorIds = new Set();
  for (const stage of REQUIRED_STAGES) {
    const stageActors = [actors[stage]].flat();
    if (stageActors.length === 0) {
      add("stage-actor-missing", `Stage ${stage} lacks actor and session provenance.`, run);
    }
    for (const actor of stageActors) {
      if (!actor || !actor.actorId || !actor.sessionId) {
        add("stage-actor-missing", `Stage ${stage} lacks actor and session provenance.`, run);
        continue;
      }
      if (actor.actualModel !== selectedRoles?.[stage]) {
        add(
          "stage-model-mismatch",
          `Stage ${stage} model does not match its selected host role.`,
          run,
        );
      }
      if (sessions.has(actor.sessionId) || actorIds.has(actor.actorId)) {
        add(
          "stage-session-invalid",
          "Workflow invocations require distinct actor and session identities.",
          run,
        );
      }
      sessions.add(actor.sessionId);
      actorIds.add(actor.actorId);
    }
  }
}

function verifyStages(
  run,
  scenario,
  evidence,
  add,
  allowSynthetic,
  verifySyntheticReferences,
) {
  const events = indexEvents(run.events);
  if (
    events.length === 0 ||
    events.some(
      (event, index) =>
        !Number.isFinite(event.seq) || (index > 0 && event.seq <= events[index - 1].seq),
    )
  ) {
    add("event-sequence-invalid", "Trace events require unique numeric sequence values.", run);
    return;
  }

  const stageBounds = new Map();
  for (const stage of REQUIRED_STAGES) {
    const starts = events.filter(
      (event) => event.type === "stage_started" && event.stage === stage,
    );
    const completions = events.filter(
      (event) => event.type === "stage_completed" && event.stage === stage,
    );
    if (
      starts.length !== 1 ||
      completions.length !== 1 ||
      completions[0]?.status !== "passed" ||
      starts[0]?.seq >= completions[0]?.seq
    ) {
      add(
        "required-stage-evidence-missing",
        `Stage ${stage} lacks one successful start-to-completion record.`,
        run,
      );
      continue;
    }
    stageBounds.set(stage, { start: starts[0], complete: completions[0] });
  }
  if (
    stageBounds.size === REQUIRED_STAGES.length &&
    !(
      stageBounds.get("specification").complete.seq < stageBounds.get("planning").start.seq &&
      stageBounds.get("planning").complete.seq < stageBounds.get("implementation").start.seq
    )
  ) {
    add("stage-order-invalid", "Workflow stages overlap or run out of order.", run);
  }

  const confirmation = eventOf(events, "profile_confirmation");
  const question = eventOf(
    events,
    "material_question",
    (event) => event.status === "asked",
  );
  const answer = eventOf(
    events,
    "material_answer",
    (event) => event.status === "answered",
  );
  if (
    question &&
    (!answer ||
      answer.questionId !== question.questionId ||
      answer.seq <= question.seq ||
      !confirmation ||
      answer.seq >= confirmation.seq)
  ) {
    add(
      "material-answer-missing",
      "A successful material answer must precede profile confirmation.",
      run,
    );
  }
  if (
    !confirmation ||
    confirmation.explicit !== true ||
    confirmation.depth !== scenario.depth ||
    !sameMembers(confirmation.profiles, scenario.profiles)
  ) {
    add(
      "profile-confirmation-invalid",
      "Depth and active profiles require exact explicit confirmation.",
      run,
    );
  }

  const referenceReads = events.filter(
    (event) => event.type === "profile_reference_read",
  );
  for (const reference of referenceReads) {
    if (!confirmation || reference.seq < confirmation.seq) {
      add(
        "reference-before-confirmation",
        `Profile reference ${reference.profile ?? "unknown"} was read before confirmation.`,
        run,
      );
    }
    if (!scenario.profiles.includes(reference.profile)) {
      add(
        "inactive-profile-reference",
        `Inactive profile reference ${reference.profile ?? "unknown"} was loaded.`,
        run,
      );
    }
  }
  for (const stage of ["specification", "planning"]) {
    const bounds = stageBounds.get(stage);
    for (const profile of scenario.profiles) {
      if (
        !referenceReads.some(
          (reference) =>
            reference.profile === profile &&
            reference.stage === stage &&
            bounds &&
            reference.seq > bounds.start.seq &&
            reference.seq < bounds.complete.seq,
        )
      ) {
        add(
          "active-profile-reference-missing",
          `Active profile reference ${profile} was not observed within ${stage}.`,
          run,
        );
      }
    }
  }

  const specificationWrite = eventOf(
    events,
    "artifact_write",
    (event) =>
      event.stage === "specification" &&
      event.target === "specification-artifact" &&
      event.artifact === "spec.md" &&
      DIGEST_PATTERN.test(event.digest ?? ""),
  );
  const specificationComplete = stageBounds.get("specification")?.complete;
  const contractRead = eventOf(
    events,
    "contract_read",
    (event) => event.status === "approved",
  );
  if (!specificationWrite) {
    add("specification-artifact-missing", "Approved specification evidence is missing.", run);
  }
  if (
    !specificationComplete?.contractDigest ||
    specificationWrite?.digest !== specificationComplete?.contractDigest ||
    contractRead?.digest !== specificationComplete?.contractDigest
  ) {
    add(
      "contract-digest-mismatch",
      "Planning did not consume the exact approved specification digest.",
      run,
    );
  }

  for (const artifact of REQUIRED_PLANNING_ARTIFACTS) {
    if (
      !eventOf(
        events,
        "artifact_write",
        (event) =>
          event.stage === "planning" &&
          event.target === "planning-artifact" &&
          event.artifact === artifact,
      )
    ) {
      add(
        "planning-artifact-missing",
        `Planning artifact ${artifact} is missing.`,
        run,
      );
    }
  }

  for (const write of events.filter((event) => event.type === "artifact_write")) {
    const bounds = stageBounds.get(write.stage);
    if (!bounds || write.seq <= bounds.start.seq || write.seq >= bounds.complete.seq) {
      add(
        "artifact-stage-boundary-invalid",
        `Artifact ${write.artifact ?? "unknown"} lies outside its declared stage.`,
        run,
      );
    }
  }

  const implementationStart = stageBounds.get("implementation")?.start;
  for (const write of events.filter(
    (event) => event.type === "artifact_write" && event.target === "production",
  )) {
    if (
      write.stage !== "implementation" ||
      !implementationStart ||
      write.seq <= implementationStart.seq
    ) {
      add(
        "production-write-before-implementation",
        "Specification and planning runs must not write production artifacts.",
        run,
      );
    }
  }

  verifyPackets(run, scenario, events, add);

  const checks = events.filter((event) => event.type === "check");
  if (checks.length === 0) {
    add("required-check-missing", "At least one objective implementation check is required.", run);
  }
  for (const check of checks) {
    const bounds = stageBounds.get(check.stage);
    if (
      check.stage !== "implementation" ||
      !bounds ||
      check.seq <= bounds.start.seq ||
      check.seq >= bounds.complete.seq
    ) {
      add(
        "check-stage-boundary-invalid",
        `Check ${check.checkId ?? "unknown"} lies outside implementation.`,
        run,
      );
    }
    if (check.status !== "passed") {
      add(
        "failed-check-counted-as-pass",
        `Check ${check.checkId ?? "unknown"} is ${check.status ?? "missing"}, not passed.`,
        run,
      );
    }
  }

  const expectedAcceptance = acceptanceIds(scenario);
  const implementationComplete = stageBounds.get("implementation")?.complete;
  const externalAcceptance = eventOf(
    events,
    "external_acceptance",
    (event) => event.status === "passed",
  );
  if (!externalAcceptance || !externalAcceptance.evidenceRef) {
    add(
      "external-acceptance-missing",
      "Successful final external acceptance evidence is required.",
      run,
    );
  } else {
    verifyReference(
      externalAcceptance.evidenceRef,
      externalAcceptance.evidenceDigest,
      evidence,
      run,
      add,
      allowSynthetic,
      verifySyntheticReferences,
    );
    if (!sameMembers(externalAcceptance.requirementIds, expectedAcceptance)) {
      add(
        "external-acceptance-incomplete",
        "External acceptance does not cover every objective requirement.",
        run,
      );
    }
    if (!implementationComplete || externalAcceptance.seq <= implementationComplete.seq) {
      add(
        "external-acceptance-order-invalid",
        "Final external acceptance must follow implementation completion.",
        run,
      );
    }
  }
  if (!eventOf(events, "evaluation_claim")) {
    add("evaluation-claim-missing", "A run cannot be credited without an evaluation claim.", run);
  }
}

function verifyPackets(run, scenario, events, add) {
  const expectedRequirementIds = acceptanceIds(scenario);
  const declarations = new Map(
    events
      .filter((event) => event.type === "packet_declared")
      .map((event) => [event.packetId, event]),
  );
  const declaredRequirements = new Set(
    [...declarations.values()].flatMap((declaration) => declaration.requirementIds ?? []),
  );
  if (
    declarations.size === 0 ||
    !sameMembers([...declaredRequirements], expectedRequirementIds)
  ) {
    add(
      "packet-requirements-incomplete",
      "The declared packet union must cover the objective requirements exactly.",
      run,
    );
  }

  const packets = new Map();
  const authorized = new Set();
  const prerequisitesPassed = new Set();
  const implementationActors = [run.stageActors?.implementation].flat();
  const usedSessions = new Set();
  let activePacket = null;
  let previousPacket = null;
  for (const event of events) {
    if (event.type === "packet_authorized") {
      authorized.add(event.packetId);
      continue;
    }
    if (event.type === "packet_prerequisites" && event.status === "passed") {
      prerequisitesPassed.add(event.packetId);
      continue;
    }
    if (event.type === "packet_started") {
      const sessionId = event.sessionId ?? (
        implementationActors.length === 1 ? implementationActors[0]?.sessionId : null
      );
      if (!sessionId || !implementationActors.some((actor) => actor?.sessionId === sessionId)) {
        add("packet-invocation-missing", "Packet execution lacks a declared implementation session.", run);
      } else if (usedSessions.has(sessionId)) {
        add("multiple-packets-per-invocation", "An implementation invocation started more than one packet.", run);
      }
      usedSessions.add(sessionId);
      if (previousPacket && !previousPacket.completed) {
        add(
          "next-packet-before-completion",
          "A packet started before the prior packet completed.",
          run,
        );
      }
      if (!declarations.has(event.packetId)) {
        add("packet-not-declared", `Packet ${event.packetId} was not planned.`, run);
      }
      if (!authorized.has(event.packetId) || !prerequisitesPassed.has(event.packetId)) {
        add(
          "packet-start-unready",
          `Packet ${event.packetId} lacks explicit authority or passed prerequisites.`,
          run,
        );
      }
      const state = {
        id: event.packetId,
        startSeq: event.seq,
        completed: false,
        writes: [],
        red: [],
        green: [],
        checks: [],
        observations: [],
      };
      packets.set(event.packetId, state);
      activePacket = state;
      previousPacket = state;
      continue;
    }
    if (event.type === "artifact_write" && event.target === "production") {
      if (!activePacket || event.packetId !== activePacket.id) {
        add(
          "cross-packet-write",
          `Production write is outside the active packet ${activePacket?.id ?? "none"}.`,
          run,
        );
      } else {
        activePacket.writes.push(event);
      }
      continue;
    }
    if (event.type === "test_observation") {
      const state = packets.get(event.packetId);
      if (!activePacket || activePacket.id !== event.packetId) {
        add("inactive-packet-check", "A test observation is outside active packet execution.", run);
      }
      if (state) {
        state.observations.push(event);
        if (event.phase === "red") state.red.push(event);
        if (event.phase === "green") state.green.push(event);
      }
      continue;
    }
    if (event.type === "check") {
      const state = packets.get(event.packetId);
      if (!activePacket || activePacket.id !== event.packetId) {
        add("inactive-packet-check", "A check is outside active packet execution.", run);
      }
      if (state) state.checks.push(event);
      continue;
    }
    if (event.type === "packet_paused") {
      const state = packets.get(event.packetId);
      if (!state || state.completed || activePacket?.id !== event.packetId) {
        add(
          "packet-pause-invalid",
          `Packet ${event.packetId ?? "unknown"} cannot be paused from this state.`,
          run,
        );
      } else {
        activePacket = null;
      }
      continue;
    }
    if (event.type === "packet_resumed") {
      const state = packets.get(event.packetId);
      if (!state || state.completed || previousPacket?.id !== event.packetId) {
        add(
          "resume-packet-mismatch",
          `Resume did not select the recorded incomplete packet ${previousPacket?.id ?? "none"}.`,
          run,
        );
      } else {
        activePacket = state;
      }
      continue;
    }
    if (event.type === "packet_completed") {
      const state = packets.get(event.packetId);
      const checksPassed =
        state?.checks.length > 0 && state.checks.every((check) => check.status === "passed");
      if (!state || activePacket?.id !== event.packetId || event.status !== "passed" || !checksPassed) {
        add(
          "packet-completion-invalid",
          `Packet ${event.packetId ?? "unknown"} lacks successful completion evidence.`,
          run,
        );
      } else {
        state.completed = true;
        state.completeSeq = event.seq;
        activePacket = null;
      }
    }
  }

  if (packets.size === 0) {
    add("packet-evidence-missing", "Implementation packet evidence is missing.", run);
  }
  for (const packet of packets.values()) {
    const declaration = declarations.get(packet.id);
    if (!Array.isArray(declaration?.requiredProofs)) {
      add("prove-requirements-unknown", "Packet evidence must explicitly identify required PROVE checks.", run);
    }
    for (const testId of declaration?.requiredProofs ?? []) {
      const mutation = packet.observations.find((observation) =>
        observation.phase === "prove" && observation.testId === testId &&
        observation.status === "failed" && observation.meaningful === true &&
        observation.contractAligned === true && observation.mutationId &&
        observation.seq < packet.completeSeq);
      const restored = mutation && packet.observations.find((observation) =>
        observation.phase === "restored-green" && observation.testId === testId &&
        observation.mutationId === mutation.mutationId && observation.status === "passed" &&
        observation.seq > mutation.seq && observation.seq < packet.completeSeq);
      if (!restored) {
        add("required-prove-missing", `Packet ${packet.id} lacks PROVE and restored GREEN for ${testId}.`, run);
      }
    }
    const requirements = declaration?.requirementIds ?? [];
    const firstWrite = packet.writes[0];
    const meaningfulRed = packet.red.find(
      (observation) =>
        observation.status === "failed" &&
        observation.meaningful === true &&
        observation.contractAligned === true &&
        observation.seq < (firstWrite?.seq ?? Number.NEGATIVE_INFINITY) &&
        Array.isArray(observation.requirementIds) &&
        observation.requirementIds.length > 0 &&
        observation.requirementIds.every((id) => requirements.includes(id)),
    );
    const meaningfulGreen = packet.green.find(
      (observation) =>
        observation.status === "passed" &&
        observation.meaningful === true &&
        observation.contractAligned === true &&
        observation.testId === meaningfulRed?.testId &&
        observation.seq > (firstWrite?.seq ?? Number.POSITIVE_INFINITY),
    );
    const passedCheck = packet.checks.some(
      (check) =>
        check.status === "passed" &&
        check.seq > (meaningfulGreen?.seq ?? Infinity) &&
        check.seq < (packet.completeSeq ?? -Infinity),
    );
    if (!firstWrite || !meaningfulRed || !meaningfulGreen || !passedCheck) {
      add(
        "meaningful-test-first-missing",
        `Packet ${packet.id} lacks RED, production write, GREEN, then passed check evidence.`,
        run,
      );
    }
    if (!packet.completed) {
      add("packet-incomplete", `Packet ${packet.id} is incomplete.`, run);
    }
  }
}

function expectedMatrixEntries(matrix, repetitions = 1) {
  const expected = new Map();
  for (const [host, scenarioIds] of Object.entries(matrix)) {
    for (const scenarioId of scenarioIds) {
      expected.set(`${host}:${scenarioId}`, repetitions);
    }
  }
  return expected;
}

function verifyMatrix(runs, matrix, repetitions, code, add) {
  const expected = expectedMatrixEntries(matrix, repetitions);
  const actual = new Map();
  for (const run of runs) {
    const key = `${run.host}:${run.scenarioId}`;
    actual.set(key, (actual.get(key) ?? 0) + 1);
  }
  for (const [key, count] of expected) {
    if (actual.get(key) !== count) {
      add(code, `Required run ${key} appears ${actual.get(key) ?? 0} times; expected ${count}.`);
    }
  }
  for (const key of actual.keys()) {
    if (!expected.has(key)) add("matrix-run-unexpected", `Unexpected matrix run ${key}.`);
  }
}

export function verifyWorkflowEvidence(evidence, registry, options = {}) {
  const findings = [];
  const seenFindings = new Set();
  const add = (code, message, run) => {
    const key = `${code}:${run?.runId ?? "bundle"}:${message}`;
    if (seenFindings.has(key)) return;
    seenFindings.add(key);
    findings.push({
      code,
      message,
      ...(run
        ? {
            runId: run.runId,
            traceRef: run.provenance?.traceRef ?? null,
          }
        : {}),
    });
  };

  if (evidence?.classification === "SYNTHETIC" && !options.allowSynthetic) {
    add("synthetic-evidence", "Synthetic evidence is limited to verifier unit tests.");
  }
  const fullPasses = Array.isArray(evidence?.fullPasses) ? evidence.fullPasses : [];
  if (fullPasses.length !== registry.policy.stablePasses) {
    add(
      "full-pass-count",
      `Expected ${registry.policy.stablePasses} stable full passes, found ${fullPasses.length}.`,
    );
  }
  const sourceDigests = new Set();
  for (const [host, roles] of Object.entries(registry.policy.hostModelRoles ?? {})) {
    for (const [role, permittedModels] of Object.entries(roles)) {
      if (!permittedModels.includes(evidence.selectedHostRoles?.[host]?.[role])) {
        add("host-role-not-permitted", `Selected ${host} ${role} model is outside the fixed trial policy.`);
      }
    }
  }
  for (const pass of fullPasses) {
    verifyReference(pass.sourceRef, pass.sourceDigest, evidence,
      { provenance: { classification: evidence.classification } }, add,
      options.allowSynthetic === true, options.verifySyntheticReferences === true);
    if (DIGEST_PATTERN.test(pass.sourceDigest ?? "")) sourceDigests.add(pass.sourceDigest);
    if (
      !DIGEST_PATTERN.test(pass.sourceDigest ?? "") ||
      pass.sourceBeforeDigest !== pass.sourceDigest ||
      pass.sourceAfterDigest !== pass.sourceDigest ||
      pass.sourceChanged !== false
    ) {
      add(
        "source-mutated-during-pass",
        `Full pass ${pass.pass ?? "unknown"} did not preserve its exact source digest.`,
      );
    }
    verifyMatrix(pass.runs ?? [], registry.policy.fullMatrix, 1, "matrix-run-missing", add);
  }
  if (sourceDigests.size > 1) {
    add("source-digest-changed", "Stable full passes used different source digests.");
  }

  const holdoutRuns = Array.isArray(evidence?.holdoutRuns) ? evidence.holdoutRuns : [];
  verifyMatrix(
    holdoutRuns,
    registry.policy.holdoutMatrix,
    registry.policy.holdoutPasses,
    "holdout-run-missing",
    add,
  );

  const scenarios = new Map(
    registry.scenarios.map((scenario) => [scenario.id, scenario]),
  );
  const allRuns = [...fullPasses.flatMap((pass) => pass.runs ?? []), ...holdoutRuns];
  const runIds = new Set();
  for (const run of allRuns) {
    if (!run.runId || runIds.has(run.runId)) {
      add("run-id-invalid", "Run identifiers must be present and unique.", run);
    }
    runIds.add(run.runId);
    const scenario = scenarios.get(run.scenarioId);
    if (!scenario) {
      add("scenario-unknown", `Unknown scenario ${run.scenarioId ?? "missing"}.`, run);
      continue;
    }
    const allowSynthetic = options.allowSynthetic === true;
    const verifySyntheticReferences = options.verifySyntheticReferences === true;
    verifyProvenance(
      run,
      evidence,
      add,
      allowSynthetic,
      verifySyntheticReferences,
    );
    const pass = fullPasses.find((item) => item.runs?.includes(run)) ?? fullPasses[0];
    if (!pass || !run.provenance?.bundleRef ||
        run.provenance.bundleRef !== pass.sourceRef ||
        run.provenance.bundleDigest !== pass.sourceDigest) {
      add("run-source-mismatch", "Run source does not match the captured frozen bundle.", run);
    }
    verifyStageActors(run, evidence.selectedHostRoles?.[run.host], add);
    verifyStages(
      run,
      scenario,
      evidence,
      add,
      allowSynthetic,
      verifySyntheticReferences,
    );

    const claim = eventOf(indexEvents(run.events), "evaluation_claim");
    if (claim) {
      const review = (evidence.evaluations ?? []).find(
        (evaluation) => evaluation.runId === run.runId,
      );
      if (
        !review ||
        review.reviewerType !== "external" ||
        review.status !== "passed" ||
        !review.reviewerActorId ||
        !review.reviewerSessionId ||
        !review.evidenceRef ||
        Object.values(run.stageActors ?? {}).flat().some(
          (actor) =>
            actor.actorId === review.reviewerActorId ||
            actor.sessionId === review.reviewerSessionId,
        )
      ) {
        add(
          "evaluation-unreviewed",
          "The evaluation claim lacks a successful external review record.",
          run,
        );
      } else {
        if (!review.reviewerModel ||
            review.reviewerModel !== evidence.selectedHostRoles?.[run.host]?.review) {
          add("review-model-mismatch", "External reviewer model does not match the selected review role.", run);
        }
        verifyReference(
          review.evidenceRef,
          review.evidenceDigest,
          evidence,
          run,
          add,
          allowSynthetic,
          verifySyntheticReferences,
        );
      }
    }
  }

  return {
    ok: findings.length === 0,
    verificationKind: "evidence-consistency",
    behaviorCertified: false,
    sourceDigest: sourceDigests.size === 1 ? [...sourceDigests][0] : null,
    findings,
  };
}
