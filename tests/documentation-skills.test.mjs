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
  "documentation-and-adrs",
]);
const CLAIM_STATES = Object.freeze([
  "current",
  "proposed",
  "experimental",
  "deprecated",
  "unknown",
]);
const SOURCE_ASSUMPTIONS =
  /prompt-mcp|\bGo\b|\bGTK\b|\bZenity\b|README\.md and docs\//i;

async function readScenarios(skill) {
  return JSON.parse(
    await readFixture("documentation", skill, "scenarios.json"),
  );
}

async function readSharedFixture(name) {
  return JSON.parse(await readFixture("documentation", `${name}.json`));
}

function findCase(fixture, id) {
  const scenario = fixture.cases.find((entry) => entry.id === id);
  assert.ok(scenario, `${fixture.skill ?? "fixture"} is missing ${id}`);
  return scenario;
}

function changedPaths(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((name) => before[name] !== after[name])
    .sort();
}

test("documentation skill is portable, explicit-only, and bounded", async () => {
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
      /explicit request/,
      /`\{\{HOST_PROJECT_INSTRUCTIONS\}\}`/,
      /current/,
      /proposed/,
      /experimental/,
      /deprecated/,
      /unknown/,
      /authoritative/,
      /not run|unrun/,
      /Stop|stop/,
    ]) {
      assert.match(validated.body, pattern, `${name} misses ${pattern}`);
    }
    assert.doesNotMatch(validated.body, SOURCE_ASSUMPTIONS);
    assert.doesNotMatch(validated.body, /AGENTS\.md|CLAUDE\.md/);
    assert.deepEqual(
      await fs.readdir(path.join(projectRoot, "skills", name)),
      ["SKILL.md", "agents"],
    );
  }
});

test("documentation layouts preserve established README, docs-site, and ADR structures", async () => {
  const fixture = await readSharedFixture("layouts");
  assert.equal(fixture.schemaVersion, 1);
  assert.deepEqual(
    fixture.layouts.map((layout) => layout.id),
    [
      "readme-centric",
      "docs-site",
      "established-adr",
      "no-adr-convention",
    ],
  );
  for (const layout of fixture.layouts) {
    assert.ok(layout.files.includes(layout.expected.primaryEntry ?? "README.md"));
    assert.deepEqual(layout.expected.inventedDirectories, []);
  }
  const established = fixture.layouts.find(
    (layout) => layout.id === "established-adr",
  );
  assert.match(established.adrConvention, /NNNN-title\.md$/);
  const missing = fixture.layouts.find(
    (layout) => layout.id === "no-adr-convention",
  );
  assert.equal(missing.adrConvention, null);
  assert.equal(missing.expected.adrCreated, false);
  assert.equal(missing.expected.choiceRequired, true);
});

test("documentation claim states remain distinct and only current is shipped", async () => {
  const fixture = await readSharedFixture("state-classification");
  assert.deepEqual(
    fixture.states.map((state) => state.name),
    CLAIM_STATES,
  );
  assert.equal(new Set(fixture.states.map((state) => state.name)).size, 5);
  assert.deepEqual(
    fixture.states
      .filter((state) => state.presentAsShipped)
      .map((state) => state.name),
    ["current"],
  );

  const scenarios = await readScenarios("documentation-and-adrs");
  const mixed = findCase(scenarios, "technical-document-states");
  assert.deepEqual(
    mixed.claims.map((claim) => claim.state),
    CLAIM_STATES,
  );
  assert.ok(
    mixed.claims
      .filter((claim) => claim.state === "current")
      .every((claim) => claim.evidence.length > 0),
  );
  assert.equal(mixed.expected.statesRemainDistinct, true);
  assert.equal(mixed.expected.plannedPresentedAsCurrent, false);
});

test("ADR fixture records a complete settled decision", async () => {
  const fixture = await readScenarios("documentation-and-adrs");
  const scenario = findCase(fixture, "complete-settled-adr");
  assert.equal(scenario.decisionState, "settled");
  assert.equal(scenario.expected.adrCreated, true);
  for (const field of [
    "status",
    "decisionDate",
    "context",
    "forces",
    "decision",
    "scope",
    "alternatives",
    "positiveConsequences",
    "negativeConsequences",
    "implications",
    "reversalConditions",
    "unresolvedFollowUp",
  ]) {
    assert.ok(Object.hasOwn(scenario.adr, field), `ADR misses ${field}`);
  }
  assert.match(scenario.adr.decisionDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(scenario.adr.forces.length > 0);
  assert.ok(scenario.adr.alternatives.length >= 2);
  assert.ok(
    scenario.adr.alternatives.every(
      (alternative) => alternative.name && alternative.tradeoff,
    ),
  );
  assert.deepEqual(
    Object.keys(scenario.adr.implications).sort(),
    ["compatibility", "migration", "operations", "security"],
  );
  assert.ok(scenario.adr.positiveConsequences.length > 0);
  assert.ok(scenario.adr.negativeConsequences.length > 0);
  assert.ok(scenario.adr.reversalConditions.length > 0);
});

test("ADR workflow rejects unresolved decisions and invented conventions", async () => {
  const fixture = await readScenarios("documentation-and-adrs");
  const unresolved = findCase(fixture, "unresolved-decision");
  assert.equal(unresolved.decisionState, "unresolved");
  assert.ok(unresolved.unresolvedChoices.length > 0);
  assert.equal(unresolved.expected.status, "blocked");
  assert.equal(unresolved.expected.adrCreated, false);
  assert.equal(unresolved.expected.consensusFabricated, false);

  const noConvention = findCase(fixture, "no-adr-convention");
  assert.equal(noConvention.establishedConvention, null);
  assert.equal(noConvention.expected.adrCreated, false);
  assert.equal(noConvention.expected.choiceRequired, true);
  assert.equal(noConvention.expected.proposalVisible, true);
});

test("documentation workflow labels stale commands and limits edits to documents", async () => {
  const fixture = await readScenarios("documentation-and-adrs");
  const stale = findCase(fixture, "stale-command");
  assert.notEqual(stale.documentedCommand, stale.repositoryCommand);
  assert.equal(stale.commandRun, false);
  assert.equal(stale.expected.verificationLabel, "not run");
  assert.equal(stale.expected.presentedAsWorking, false);

  const minimal = findCase(fixture, "minimal-document-only-edit");
  assert.deepEqual(
    changedPaths(minimal.beforeDigests, minimal.afterDigests),
    minimal.expected.changedPaths,
  );
  assert.ok(
    minimal.expected.changedPaths.every((name) => name.endsWith(".md")),
  );
  assert.equal(minimal.expected.unrelatedProseChanged, false);
});

test("documentation uses progressive disclosure", async () => {
  const fixture = await readSharedFixture("progressive-disclosure");
  const allSentinels = Object.values(fixture.sentinels);
  for (const scenario of fixture.cases) {
    assert.equal(scenario.selectedSkill, "documentation-and-adrs");
    const expected = fixture.sentinels.documentationBody;
    assert.deepEqual(scenario.expectedLoaded, [expected]);
    assert.ok(
      allSentinels
        .filter((sentinel) => sentinel !== expected)
        .every((sentinel) => !scenario.expectedLoaded.includes(sentinel)),
    );
  }
});

test("documentation preserves source equivalence without source assumptions", async () => {
  const fixture = await readSharedFixture("source-equivalence");
  assert.ok(fixture.sourceTerms.length > 0);
  assert.ok(fixture.generalizedResponsibilities.length >= 4);
  assert.equal(fixture.expected.sourceTermsInProductionSkills, false);
  assert.equal(fixture.expected.responsibilitiesPreserved, true);

  const bodies = await Promise.all(
    SKILLS.map((name) =>
      fs.readFile(path.join(projectRoot, "skills", name, "SKILL.md"), "utf8"),
    ),
  );
  for (const term of fixture.sourceTerms) {
    assert.ok(bodies.every((body) => !body.includes(term)));
  }
});

test("documentation redacts, copies state, and leaves skills unchanged", async () => {
  const before = await snapshotTree(path.join(projectRoot, "skills"));
  for (const name of SKILLS) {
    const fixture = await readScenarios(name);
    const privacy = findCase(fixture, "privacy");
    assert.match(privacy.syntheticPrivateValue, /^[A-Z_]+$/);
    assert.equal(privacy.expected.outputContainsPrivateValue, false);
    assert.equal(privacy.expected.boundedDiagnostics, true);
    assert.doesNotMatch(
      JSON.stringify(privacy.expected),
      new RegExp(privacy.syntheticPrivateValue),
    );

    fixture.cases[0].id = "caller-mutated";
    assert.notEqual((await readScenarios(name)).cases[0].id, "caller-mutated");
  }
  await readSharedFixture("layouts");
  await readSharedFixture("state-classification");
  await readSharedFixture("progressive-disclosure");
  await readSharedFixture("source-equivalence");
  assert.deepEqual(await snapshotTree(path.join(projectRoot, "skills")), before);
});
