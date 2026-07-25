import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { readCatalog } from "../scripts/lib/catalog.mjs";
import { snapshotTree } from "../scripts/lib/files.mjs";
import {
  countCodePoints,
  validateSkillDocument,
} from "../scripts/lib/skill-document.mjs";
import {
  projectRoot,
  readFixture,
} from "./lib/fixtures.mjs";

const SKILLS = Object.freeze([
  "context-engineering",
  "idea-refine",
  "interview-me",
]);
const NON_ANSWERS = Object.freeze([
  "paused",
  "cancelled",
  "timed_out",
  "unavailable",
  "invalid_request",
  "conflict",
  "failed",
]);
const SOURCE_ASSUMPTIONS =
  /mcp__|prompt-mcp\/\.agents|\binternal\/|\bgo test\b|\bGTK\b|\bZenity\b/i;

async function readScenarios(skill) {
  return JSON.parse(
    await readFixture("context-discovery", skill, "scenarios.json"),
  );
}

async function readSharedFixture(name) {
  return JSON.parse(await readFixture("context-discovery", `${name}.json`));
}

function findCase(fixture, id) {
  const scenario = fixture.cases.find((entry) => entry.id === id);
  assert.ok(scenario, `${fixture.skill ?? "shared fixture"} is missing ${id}`);
  return scenario;
}

function callableByName(scenario, name) {
  return scenario.callableTools.find((tool) => tool.name === name);
}

test("context engineering, idea refine, and interview skills are portable and explicit-only", async () => {
  const catalog = await readCatalog(projectRoot);
  for (const name of SKILLS) {
    const entry = catalog.skills.find((candidate) => candidate.name === name);
    assert.ok(entry);
    assert.equal(entry.classification, "standalone");
    assert.deepEqual(entry.dependencies, []);
    assert.equal(entry.policies.codex.allowImplicitInvocation, false);
    assert.equal(entry.policies.claude.disableModelInvocation, true);
    assert.equal(entry.policies.claude.userInvocable, true);
    assert.ok(countCodePoints(entry.description) <= 240);

    const document = await fs.readFile(
      path.join(projectRoot, "skills", name, "SKILL.md"),
    );
    const validated = validateSkillDocument(entry, document);
    assert.ok(validated.bytes <= 4096);
    for (const pattern of [
      /explicit request|explicitly asks/,
      /In Codex.*`AGENTS\.md`/s,
      /in Claude Code.*`CLAUDE\.md`/s,
      /Do not fabricate the other host's file/,
      /Current repository evidence|current repository evidence/,
      /unknown/,
      /bounded/,
      /Stop|stop/,
    ]) {
      assert.match(validated.body, pattern, `${name} misses ${pattern}`);
    }
    assert.doesNotMatch(validated.body, SOURCE_ASSUMPTIONS);
  }

  assert.deepEqual(
    (await fs.readdir(path.join(projectRoot, "skills", "context-engineering"))).sort(),
    ["SKILL.md", "agents"],
  );
  assert.deepEqual(
    (await fs.readdir(path.join(projectRoot, "skills", "idea-refine"))).sort(),
    ["SKILL.md", "agents"],
  );
  assert.deepEqual(
    (await fs.readdir(path.join(projectRoot, "skills", "interview-me"))).sort(),
    ["SKILL.md", "agents", "references"],
  );
});

test("context engineering applies host guidance and current-evidence precedence", async () => {
  const fixture = await readScenarios("context-engineering");
  const codex = findCase(fixture, "codex-nearest-guidance");
  assert.equal(codex.expected.selectedGuidance, "services/api/AGENTS.md");
  assert.ok(codex.availableGuidance.includes(codex.expected.selectedGuidance));
  assert.doesNotMatch(codex.expected.selectedGuidance, /CLAUDE\.md/);
  assert.deepEqual(codex.expected.fabricatedGuidance, []);

  const claude = findCase(fixture, "claude-applicable-guidance");
  assert.equal(claude.expected.selectedGuidance, "CLAUDE.md");
  assert.ok(claude.availableGuidance.includes(claude.expected.selectedGuidance));
  assert.doesNotMatch(claude.expected.selectedGuidance, /AGENTS\.md/);
  assert.deepEqual(claude.expected.fabricatedGuidance, []);

  const missing = findCase(fixture, "missing-guidance");
  assert.equal(missing.expected.selectedGuidance, null);
  assert.deepEqual(missing.expected.fabricatedGuidance, []);
  assert.ok(missing.expected.unknown.length > 0);

  const stale = findCase(fixture, "current-evidence-beats-stale-handoff");
  assert.equal(stale.evidence.handoffState, "stale");
  assert.notEqual(stale.evidence.repository, stale.evidence.handoff);
  assert.equal(stale.expected.precedenceWinner, "repository");
});

test("context engineering repairs only the authorized surface", async () => {
  const fixture = await readScenarios("context-engineering");
  const repair = findCase(fixture, "authorized-durable-repair");
  assert.equal(repair.authority.mode, "mutation");
  assert.deepEqual(repair.expected.changedPaths, [
    repair.authority.selectedSurface,
  ]);
  assert.equal(
    repair.evidence.codeDigestAfter,
    repair.evidence.codeDigestBefore,
  );
  assert.equal(repair.expected.projectCodeChanged, false);

  const audit = findCase(fixture, "read-only-context-audit");
  assert.equal(audit.authority.mode, "read-only");
  assert.deepEqual(audit.expected.changedPaths, []);
  assert.equal(audit.expected.projectCodeChanged, false);
});

test("idea refine compares distinct reversible alternatives and stops downstream", async () => {
  const fixture = await readScenarios("idea-refine");
  const explicit = findCase(fixture, "explicit-refinement");
  assert.equal(explicit.request.explicit, true);
  assert.equal(explicit.expected.projectMutation, false);

  const alternatives = findCase(fixture, "material-alternatives");
  assert.ok(alternatives.expected.alternatives.length >= 2);
  assert.ok(alternatives.expected.alternatives.length <= 4);
  assert.equal(
    new Set(alternatives.expected.alternatives).size,
    alternatives.expected.alternatives.length,
  );
  assert.match(alternatives.expected.alternatives.join(" "), /reversible/);
  assert.match(alternatives.expected.alternatives.join(" "), /retain/);
  assert.ok(
    alternatives.expected.alternatives.includes(
      alternatives.expected.recommendation,
    ),
  );

  const stopped = findCase(fixture, "downstream-stop");
  assert.equal(stopped.expected.specificationCreated, false);
  assert.equal(stopped.expected.planCreated, false);
  assert.equal(stopped.expected.implementationChanged, false);
});

test("idea refine follows a callable schema and leaves unavailable choices unresolved", async () => {
  const fixture = await readScenarios("idea-refine");
  const callable = findCase(fixture, "schema-defined-user-choice");
  const selected = callable.evidence.callableTools.find(
    (tool) => tool.name === callable.expected.calledTool,
  );
  assert.ok(selected);
  assert.ok(callable.expected.questionCount <= selected.inputSchema.maxQuestions);
  assert.match(callable.expected.stableQuestionId, /^[a-z]+(?:\.[a-z]+)+$/);
  assert.equal(callable.expected.namespaceConstructed, false);

  const unavailable = findCase(fixture, "unavailable-user-choice");
  assert.deepEqual(unavailable.evidence.callableTools, []);
  assert.equal(unavailable.expected.calledTool, null);
  assert.equal(unavailable.expected.decisionState, "unresolved");
  assert.equal(unavailable.expected.fallbackQuestionnaire, false);
});

test("interview uses only callable schema-defined modes and limits", async () => {
  const fixture = await readScenarios("interview-me");
  const recoverable = findCase(fixture, "recoverable-callable-registry");
  for (const name of recoverable.expected.calledTools) {
    assert.ok(callableByName(recoverable, name));
  }
  const batchTool = callableByName(recoverable, "collect_decision_batch");
  assert.ok(recoverable.expected.batchSize <= batchTool.inputSchema.maxQuestions);
  assert.equal(recoverable.expected.namespaceConstructed, false);
  assert.equal(recoverable.expected.referenceLoaded, true);
  assert.ok(
    recoverable.questions.every((id) => /^[a-z]+(?:\.[a-z]+)+$/.test(id)),
  );

  const single = findCase(fixture, "single-callable-registry");
  assert.deepEqual(single.expected.calledTools, ["collect_one_decision"]);
  assert.equal(single.expected.batchSize, 1);
  assert.equal(
    single.expected.batchSize,
    callableByName(single, "collect_one_decision").inputSchema.maxQuestions,
  );

  const missing = findCase(fixture, "no-callable-interview");
  assert.deepEqual(missing.callableTools, []);
  assert.deepEqual(missing.expected.calledTools, []);
  assert.equal(missing.expected.fallbackQuestionnaire, false);
  assert.equal(missing.expected.referenceLoaded, false);
  assert.equal(missing.expected.status, "unavailable");
});

test("interview excludes settled and non-committed decisions from new checkpoints", async () => {
  const fixture = await readScenarios("interview-me");
  const settled = findCase(fixture, "settled-decisions-not-reasked");
  assert.ok(
    settled.expected.askedQuestionIds.every(
      (id) => !settled.settledQuestionIds.includes(id),
    ),
  );
  assert.deepEqual(settled.expected.askedQuestionIds, ["failure.recovery"]);

  const partial = findCase(fixture, "committed-partial-results");
  assert.deepEqual(partial.expected.checkpointedQuestionIds, [
    "retention.policy",
  ]);
  assert.deepEqual(partial.expected.remainingQuestionIds, ["failure.recovery"]);
  assert.equal(partial.results[0].committed, true);
  assert.equal(partial.results[1].status, "paused");
  assert.equal(partial.results[1].committed, false);

  const outcomes = await readSharedFixture("prompt-mcp-outcomes");
  assert.deepEqual(
    outcomes.outcomes
      .filter((outcome) => outcome.checkpoint)
      .map((outcome) => outcome.status),
    outcomes.expected.checkpointedStatuses,
  );
  assert.deepEqual(
    outcomes.outcomes
      .filter((outcome) => !outcome.checkpoint)
      .map((outcome) => outcome.status),
    NON_ANSWERS,
  );
  assert.ok(
    outcomes.outcomes
      .filter((outcome) => outcome.checkpoint)
      .every((outcome) => outcome.committed && outcome.durable),
  );
});

test("interview reference is conditional and defines bounded recovery and privacy", async () => {
  const reference = await fs.readFile(
    path.join(
      projectRoot,
      "skills",
      "interview-me",
      "references",
      "prompt-mcp-interview.md",
    ),
    "utf8",
  );
  for (const pattern of [
    /only after `interview-me` has found a suitable Prompt MCP/,
    /callable tool names, descriptions, and input\/output schemas/,
    /Never hard-code or construct a\s+server namespace/is,
    /stable semantic question IDs/,
    /advertised item and payload limit/,
    /paused.*cancelled.*timed_out.*unavailable.*invalid_request.*conflict.*failed/is,
    /Checkpoint each committed non-sensitive answer immediately/,
    /Preserve committed partial results/,
    /Never place them in logs, diagnostics, generated host\s+metadata/is,
    /Stop before specification, planning, implementation/,
  ]) {
    assert.match(reference, pattern);
  }
  assert.doesNotMatch(reference, /mcp__[a-z0-9_]+/);
});

test("context engineering, idea refine, and interview use progressive disclosure", async () => {
  const fixture = await readSharedFixture("progressive-disclosure");
  const allSentinels = Object.values(fixture.sentinels);
  for (const scenario of fixture.cases) {
    const expectedBody =
      scenario.selectedSkill === "context-engineering"
        ? fixture.sentinels.contextBody
        : scenario.selectedSkill === "idea-refine"
          ? fixture.sentinels.ideaBody
          : fixture.sentinels.interviewBody;
    const loaded = [expectedBody];
    if (
      scenario.selectedSkill === "interview-me" &&
      scenario.callableInterviewTool
    ) {
      loaded.push(fixture.sentinels.interviewReference);
    }
    assert.deepEqual(loaded, scenario.expectedLoaded);
    for (const unselected of allSentinels.filter(
      (sentinel) => !scenario.expectedLoaded.includes(sentinel),
    )) {
      assert.ok(!loaded.includes(unselected));
    }
  }
});

test("context engineering, idea refine, and interview redact and copy fixture state", async () => {
  const cases = [
    ["context-engineering", "privacy"],
    ["idea-refine", "privacy"],
    ["interview-me", "downstream-stop-and-privacy"],
  ];
  for (const [skill, id] of cases) {
    const fixture = await readScenarios(skill);
    const scenario = findCase(fixture, id);
    const marker =
      scenario.evidence?.syntheticPrivateValue ??
      scenario.syntheticPrivateValue;
    assert.match(marker, /^[A-Z_]+$/);
    assert.equal(scenario.expected.outputContainsPrivateValue, false);
    assert.equal(scenario.expected.boundedDiagnostics, true);
    assert.doesNotMatch(JSON.stringify(scenario.expected), new RegExp(marker));

    fixture.cases[0].id = "caller-mutated";
    const reloaded = await readScenarios(skill);
    assert.notEqual(reloaded.cases[0].id, "caller-mutated");
  }

  const outcomes = await readSharedFixture("prompt-mcp-outcomes");
  assert.equal(outcomes.expected.outputContainsPrivateValue, false);
  assert.doesNotMatch(
    JSON.stringify(outcomes.expected),
    new RegExp(outcomes.syntheticPrivateValue),
  );
});

test("context engineering, idea refine, and interview fixtures leave skills unchanged", async () => {
  const before = await snapshotTree(path.join(projectRoot, "skills"));
  for (const name of SKILLS) {
    await readScenarios(name);
  }
  await readSharedFixture("prompt-mcp-outcomes");
  await readSharedFixture("progressive-disclosure");
  assert.deepEqual(await snapshotTree(path.join(projectRoot, "skills")), before);
});
