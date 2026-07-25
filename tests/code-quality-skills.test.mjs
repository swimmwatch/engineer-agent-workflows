import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { readCatalog } from "../scripts/lib/catalog.mjs";
import { snapshotTree, walkFiles } from "../scripts/lib/files.mjs";
import {
  countCodePoints,
  validateSkillDocument,
} from "../scripts/lib/skill-document.mjs";
import {
  projectRoot,
  readFixture,
} from "./lib/fixtures.mjs";

const SKILLS = Object.freeze([
  "code-review-and-quality",
  "code-simplification",
  "doubt-driven-development",
  "performance-optimization",
  "security-and-hardening",
]);
const CASE_IDS = Object.freeze([
  "explicit-invocation",
  "incomplete-input",
  "out-of-scope",
  "positive",
  "safety",
  "outcome-equivalence",
]);
const SOURCE_ASSUMPTIONS =
  /\bprompt-mcp\b|\binternal\/|\bgo test\b|\bMCP\b|\bGTK\b|\bZenity\b|\bcmd\//i;
const EMBEDDED_COMMANDS =
  /\b(?:npm|pnpm|yarn|pytest|cargo|gradle|maven|golangci-lint)\b/i;

async function readScenarios(skill) {
  return JSON.parse(
    await readFixture("code-quality", skill, "scenarios.json"),
  );
}

function findCase(fixture, id) {
  const value = fixture.cases.find((entry) => entry.id === id);
  assert.ok(value, `${fixture.skill} is missing ${id}`);
  return value;
}

test("code quality skills are standalone, explicit-only, bounded, and portable", async () => {
  const catalog = await readCatalog(projectRoot);
  for (const name of SKILLS) {
    const entry = catalog.skills.find((candidate) => candidate.name === name);
    assert.ok(entry, `${name} is missing from the catalog`);
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
      /explicit request|explicitly asks|explicit audit/,
      /`AGENTS\.md` in Codex/,
      /`CLAUDE\.md` in Claude Code/,
      /repository\s+evidence/,
      /do not invent[^.]*tools[^.]*commands/,
      /bounded/,
      /redact|never expose|do not expose/i,
      /stop without|stop after|stop if/i,
    ]) {
      assert.match(validated.body, pattern, `${name} misses ${pattern}`);
    }
    assert.doesNotMatch(validated.body, SOURCE_ASSUMPTIONS);
    assert.doesNotMatch(validated.body, EMBEDDED_COMMANDS);

    const entries = await fs.readdir(path.join(projectRoot, "skills", name));
    assert.deepEqual(entries, ["SKILL.md"]);
  }
});

test("code quality fixtures expose six explicit cross-ecosystem cases", async () => {
  const ecosystems = new Set();
  for (const name of SKILLS) {
    const fixture = await readScenarios(name);
    assert.equal(fixture.schemaVersion, 1);
    assert.equal(fixture.skill, name);
    assert.deepEqual(
      fixture.cases.map((entry) => entry.id),
      CASE_IDS,
    );
    assert.equal(new Set(fixture.cases.map((entry) => entry.id)).size, 6);
    for (const scenario of fixture.cases) {
      ecosystems.add(scenario.ecosystem);
      assert.ok(["AGENTS.md", "CLAUDE.md"].includes(
        scenario.evidence.repositoryGuidance,
      ));
      assert.equal(scenario.request.explicit, true);
    }
    assert.equal(findCase(fixture, "explicit-invocation").expected.status, "ready");
    const incomplete = findCase(fixture, "incomplete-input");
    assert.equal(incomplete.expected.status, "blocked");
    assert.deepEqual(incomplete.evidence.availableTools, []);
    assert.equal(incomplete.expected.inventedCommand, false);
    assert.equal(findCase(fixture, "out-of-scope").expected.status, "out-of-scope");
  }
  assert.deepEqual([...ecosystems].sort(), [
    "documentation-configuration",
    "node-service",
    "python-package",
    "rust-cli",
  ]);
});

test("review and doubt stay read-only and report evidence-led outcomes", async () => {
  const review = await readScenarios("code-review-and-quality");
  const doubt = await readScenarios("doubt-driven-development");

  assert.ok(review.cases.every((scenario) => scenario.expected.mutation === false));
  const finding = findCase(review, "positive").evidence.finding;
  assert.equal(finding.severity, "blocking");
  assert.match(finding.location, /^[^/].+:\d+$/);
  assert.match(finding.basis, /verified/);
  assert.match(finding.minimalCorrection, /./);
  assert.equal(findCase(review, "positive").expected.findingsFirst, true);

  assert.ok(doubt.cases.every((scenario) => scenario.expected.mutation === false));
  const challenge = findCase(doubt, "positive");
  for (const field of [
    "decision",
    "decisionDeadline",
    "steelman",
    "alternative",
    "disconfirmingEvidence",
    "safeExperiment",
  ]) {
    assert.match(challenge.evidence[field], /./);
  }
  assert.ok(["proceed", "revise", "defer", "reject"].includes(
    challenge.expected.recommendation,
  ));
  assert.equal(challenge.expected.conditionsPresent, true);

  for (const fixture of [review, doubt]) {
    const outcome = findCase(fixture, "outcome-equivalence");
    assert.equal(
      outcome.evidence.treeDigestAfter,
      outcome.evidence.treeDigestBefore,
    );
  }
});

test("simplification requires and proves before-after behavior equivalence", async () => {
  const fixture = await readScenarios("code-simplification");
  const incomplete = findCase(fixture, "incomplete-input");
  assert.equal(incomplete.evidence.behaviorSnapshot, null);
  assert.equal(incomplete.expected.mutation, false);
  assert.equal(incomplete.expected.claimEquivalent, false);

  const positive = findCase(fixture, "positive");
  assert.equal(positive.expected.dependencyAdded, false);
  assert.equal(positive.expected.scopeExpansion, false);
  assert.ok(positive.evidence.preservedContracts.length >= 4);

  const outcome = findCase(fixture, "outcome-equivalence");
  assert.notEqual(
    outcome.evidence.sourceDigestAfter,
    outcome.evidence.sourceDigestBefore,
  );
  assert.equal(
    outcome.evidence.behaviorDigestAfter,
    outcome.evidence.behaviorDigestBefore,
  );
  assert.deepEqual(outcome.evidence.checksAfter, outcome.evidence.checksBefore);
  assert.equal(outcome.expected.claimEquivalent, true);
});

test("performance requires measurement and rejects correctness or tail regressions", async () => {
  const fixture = await readScenarios("performance-optimization");
  const incomplete = findCase(fixture, "incomplete-input");
  assert.equal(incomplete.evidence.baseline, null);
  assert.equal(incomplete.expected.claimImprovement, false);
  assert.equal(incomplete.expected.mutation, false);

  const positive = findCase(fixture, "positive");
  assert.ok(positive.evidence.result.p95 < positive.evidence.baseline.p95);
  assert.ok(positive.evidence.result.p99 <= positive.evidence.baseline.p99);
  assert.equal(
    positive.evidence.correctnessDigestAfter,
    positive.evidence.correctnessDigestBefore,
  );
  assert.equal(positive.expected.tailRegression, false);
  assert.equal(positive.expected.claimImprovement, true);

  const outcome = findCase(fixture, "outcome-equivalence");
  assert.equal(outcome.evidence.workloadAfter, outcome.evidence.workloadBefore);
  assert.equal(
    outcome.evidence.correctnessDigestAfter,
    outcome.evidence.correctnessDigestBefore,
  );
});

test("security names the boundary and preserves controls while rejecting abuse", async () => {
  const fixture = await readScenarios("security-and-hardening");
  const incomplete = findCase(fixture, "incomplete-input");
  assert.equal(incomplete.evidence.asset, null);
  assert.equal(incomplete.evidence.boundary, null);
  assert.equal(incomplete.expected.claimSecure, false);

  const positive = findCase(fixture, "positive");
  for (const field of ["asset", "boundary", "actor"]) {
    assert.match(positive.evidence[field], /./);
  }
  const abuseEvidence = positive.evidence.abuseCases.join(" ");
  for (const pattern of [
    /invalid input/,
    /credential/,
    /path/,
    /process/,
    /dependency provenance/,
  ]) {
    assert.match(abuseEvidence, pattern);
  }
  assert.ok(positive.evidence.positiveControls.length > 0);
  assert.equal(positive.expected.controlWeakened, false);

  const outcome = findCase(fixture, "outcome-equivalence");
  assert.equal(
    outcome.evidence.normalBehaviorDigestAfter,
    outcome.evidence.normalBehaviorDigestBefore,
  );
  assert.equal(
    outcome.evidence.existingControlDigestAfter,
    outcome.evidence.existingControlDigestBefore,
  );
  assert.equal(outcome.evidence.abuseBefore, "accepted");
  assert.equal(outcome.evidence.abuseAfter, "rejected");
  assert.equal(outcome.expected.controlWeakened, false);
});

test("safety fixtures redact sensitive inputs and remain caller-isolated", async () => {
  const sentinels = [];
  for (const name of SKILLS) {
    const fixture = await readScenarios(name);
    sentinels.push(fixture.skillSentinel);
  }

  for (const name of SKILLS) {
    const fixture = await readScenarios(name);
    const safety = findCase(fixture, "safety");
    assert.equal(safety.expected.boundedDiagnostics, true);
    assert.equal(safety.expected.outputContainsSensitiveInput, false);
    const modeledOutput = JSON.stringify(safety.expected);
    assert.doesNotMatch(
      modeledOutput,
      new RegExp(safety.evidence.sensitiveInput),
    );

    const serialized = JSON.stringify(fixture);
    assert.match(serialized, new RegExp(fixture.skillSentinel));
    for (const sentinel of sentinels.filter(
      (candidate) => candidate !== fixture.skillSentinel,
    )) {
      assert.doesNotMatch(serialized, new RegExp(sentinel));
    }

    fixture.cases[0].expected.status = "mutated-by-caller";
    const reloaded = await readScenarios(name);
    assert.equal(findCase(reloaded, "explicit-invocation").expected.status, "ready");
  }
});

test("code quality fixture evaluation leaves production snapshots unchanged", async () => {
  const before = await snapshotTree(path.join(projectRoot, "skills"));
  for (const name of SKILLS) {
    await readScenarios(name);
  }
  assert.deepEqual(await snapshotTree(path.join(projectRoot, "skills")), before);

  const files = await walkFiles(
    path.join(projectRoot, "tests", "fixtures", "code-quality"),
  );
  assert.deepEqual(files, SKILLS.map((name) => `${name}/scenarios.json`));
});
