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
  "project-pull-request",
  "project-release",
]);
const SOURCE_ASSUMPTIONS =
  /\bprompt-mcp\b|\bGo\b|\bGTK\b|\bZenity\b|\bgh\s+(?:pr|release)\b|\bgo test\b|\bnpm publish\b/i;
const PROVIDER_ASSUMPTIONS = /\bGitHub\b|\bGitLab\b|\.github\//;
const ECOSYSTEM_COMMANDS =
  /\b(?:npm|pnpm|yarn|pytest|cargo|gradle|maven|golangci-lint)\b/i;

async function readScenarios(skill) {
  return JSON.parse(
    await readFixture("delivery", skill, "scenarios.json"),
  );
}

async function readSharedFixture(name) {
  return JSON.parse(await readFixture("delivery", `${name}.json`));
}

function findCase(fixture, id) {
  const scenario = fixture.cases.find((entry) => entry.id === id);
  assert.ok(scenario, `${fixture.skill ?? "fixture"} is missing ${id}`);
  return scenario;
}

function isSemVer(value) {
  const match =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(
      value,
    );
  if (match === null || match[4] === undefined) {
    return match !== null;
  }
  return match[4]
    .split(".")
    .every(
      (identifier) =>
        !/^\d+$/.test(identifier) ||
        identifier === "0" ||
        !identifier.startsWith("0"),
    );
}

test("pull request and release skills are portable, explicit-only, and bounded", async () => {
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
      /In Codex.*`AGENTS\.md`/s,
      /in Claude Code.*`CLAUDE\.md`/s,
      /repository/,
      /authority/,
      /unknown|block/,
      /bounded|redact/,
      /Stop|stop/,
    ]) {
      assert.match(validated.body, pattern, `${name} misses ${pattern}`);
    }
    assert.doesNotMatch(validated.body, SOURCE_ASSUMPTIONS);
    assert.doesNotMatch(validated.body, PROVIDER_ASSUMPTIONS);
    assert.doesNotMatch(validated.body, ECOSYSTEM_COMMANDS);
    assert.doesNotMatch(validated.body, /\bmain\b/);
    assert.deepEqual(
      await fs.readdir(path.join(projectRoot, "skills", name)),
      ["SKILL.md"],
    );
  }
});

test("pull request and release repository fixtures discover different policies", async () => {
  const fixture = await readSharedFixture("repositories");
  assert.equal(fixture.schemaVersion, 1);
  assert.deepEqual(
    fixture.repositories.map((repository) => repository.id),
    ["hosted-github", "self-hosted-forge", "local-only"],
  );
  const hosted = fixture.repositories[0];
  const forge = fixture.repositories[1];
  const local = fixture.repositories[2];
  assert.notEqual(hosted.defaultBranch, "main");
  assert.notEqual(forge.defaultBranch, "main");
  assert.notEqual(hosted.defaultBranch, forge.defaultBranch);
  assert.notEqual(hosted.template, forge.template);
  assert.notDeepEqual(hosted.requiredChecks, forge.requiredChecks);
  assert.notEqual(hosted.commitConvention, forge.commitConvention);
  assert.equal(local.provider, null);
  assert.equal(local.remote, null);
  assert.equal(local.releasePolicy, null);
  assert.ok(
    fixture.repositories.every((repository) =>
      ["AGENTS.md", "CLAUDE.md"].includes(repository.guidance),
    ),
  );
});

test("pull request discovery uses repository values without provider fabrication", async () => {
  const repositories = await readSharedFixture("repositories");
  const fixture = await readScenarios("project-pull-request");
  for (const id of [
    "github-policy-discovery",
    "non-github-policy-discovery",
  ]) {
    const scenario = findCase(fixture, id);
    const repository = repositories.repositories.find(
      (candidate) => candidate.id === scenario.repositoryId,
    );
    assert.ok(repository);
    assert.equal(scenario.expected.provider, repository.provider);
    assert.equal(scenario.expected.remote, repository.remote);
    assert.equal(scenario.expected.base, repository.defaultBranch);
    assert.equal(scenario.expected.head, repository.headBranch);
    assert.equal(scenario.expected.template, repository.template);
    assert.deepEqual(
      scenario.expected.requiredChecks,
      repository.requiredChecks,
    );
    assert.equal(
      scenario.expected.commitConvention,
      repository.commitConvention,
    );
    assert.deepEqual(scenario.expected.fabricatedValues, []);
  }

  const missing = findCase(fixture, "no-remote-capability");
  assert.equal(missing.expected.status, "blocked");
  assert.deepEqual(missing.expected.fabricatedCommands, []);
  assert.equal(missing.expected.boundedGuidance, true);
  assert.equal(missing.expected.externalMutation, false);
});

test("pull request operations keep independent authority and exact staging", async () => {
  const fixture = await readScenarios("project-pull-request");
  const review = findCase(fixture, "explicit-review-only");
  assert.equal(review.request.explicit, true);
  assert.equal(review.expected.localMutation, false);
  assert.equal(review.expected.externalMutation, false);

  const authority = findCase(fixture, "operation-authority-boundaries");
  assert.deepEqual(
    authority.expected.simulatedAllowed,
    authority.authorizedOperations,
  );
  assert.ok(
    authority.expected.simulatedBlocked.every(
      (operation) => !authority.authorizedOperations.includes(operation),
    ),
  );
  assert.equal(authority.expected.authorizationInherited, false);

  const staging = findCase(fixture, "exact-staging");
  assert.deepEqual(staging.expected.stagedPaths, staging.requestedPaths);
  assert.equal(staging.expected.cachedDiffInspected, true);
  assert.deepEqual(
    staging.expected.preservedUnrelatedPaths,
    staging.worktreeChangedPaths.filter(
      (name) => !staging.requestedPaths.includes(name),
    ),
  );

  const existing = findCase(fixture, "update-existing-request");
  assert.ok(
    existing.providerEvidence.existingRequests.some(
      (request) => request.id === existing.expected.selectedRequest,
    ),
  );
  assert.equal(existing.expected.operation, "update");
  assert.equal(existing.expected.duplicateCreated, false);
});

test("release fixtures require confirmed exact SemVer and consistent version sources", async () => {
  const fixture = await readScenarios("project-release");
  const stable = findCase(fixture, "confirmed-stable-preparation");
  assert.equal(stable.request.confirmed, true);
  assert.equal(stable.request.classification, "stable");
  assert.equal(isSemVer(stable.request.version), true);
  assert.deepEqual(
    [...new Set(Object.values(stable.versionSources))],
    [stable.request.version],
  );
  assert.equal(stable.expected.publishAuthorized, false);

  const prerelease = findCase(fixture, "confirmed-prerelease");
  assert.equal(isSemVer(prerelease.request.version), true);
  assert.match(prerelease.request.version, /-/);
  assert.equal(prerelease.request.classification, "prerelease");

  const invalid = findCase(fixture, "unconfirmed-and-invalid-versions");
  assert.ok(
    invalid.candidates.every(
      (candidate) => !candidate.confirmed || !isSemVer(candidate.version),
    ),
  );
  assert.deepEqual(invalid.expected.acceptedVersions, []);

  const conflict = findCase(fixture, "version-source-disagreement");
  assert.ok(new Set(Object.values(conflict.versionSources)).size > 1);
  assert.equal(conflict.expected.versionAgreement, false);
  assert.equal(conflict.expected.publishEligible, false);
});

test("stable releases require a human-signed immutable tag bound to source", async () => {
  const repositories = await readSharedFixture("repositories");
  const fixture = await readScenarios("project-release");
  const signed = findCase(fixture, "human-signed-stable-tag");
  const policy = repositories.repositories.find(
    (repository) => repository.id === "hosted-github",
  ).releasePolicy;
  assert.equal(
    signed.tag.name,
    policy.tagFormat.replace("{version}", signed.confirmedVersion),
  );
  assert.equal(signed.tag.createdBy, "human");
  assert.equal(signed.tag.signed, true);
  assert.equal(signed.tag.signatureVerified, true);
  assert.match(signed.tag.sourceRevision, /^[0-9a-f]{40}$/);
  assert.equal(signed.tag.immutable, true);
  assert.equal(signed.expected.publishEligible, true);
  assert.equal(signed.expected.automationCreatedTag, false);

  const unsigned = findCase(fixture, "unsigned-stable-tag");
  assert.equal(unsigned.tag.signed, false);
  assert.equal(unsigned.expected.publishEligible, false);
  assert.equal(unsigned.expected.unsignedReplacementCreated, false);

  const floating = findCase(fixture, "floating-source-rejection");
  assert.notEqual(floating.sourceIdentity.kind, "commit");
  assert.equal(floating.expected.publishEligible, false);
});

test("release artifacts use verified SHA-256 and distinct trust statements", async () => {
  const fixture = await readScenarios("project-release");
  const artifacts = findCase(fixture, "artifact-checksums");
  assert.ok(
    artifacts.artifacts.every(
      (artifact) =>
        /^[0-9a-f]{64}$/.test(artifact.sha256) && artifact.verified,
    ),
  );
  assert.equal(artifacts.expected.allChecksumsVerified, true);

  const missing = findCase(fixture, "missing-checksum");
  assert.ok(
    missing.artifacts.some(
      (artifact) => artifact.sha256 === null || !artifact.verified,
    ),
  );
  assert.equal(missing.expected.publishEligible, false);

  const trust = findCase(fixture, "separate-trust-statements");
  assert.equal(
    new Set(trust.trustStatements).size,
    trust.trustStatements.length,
  );
  assert.equal(trust.expected.allDistinct, true);
  assert.equal(trust.expected.substitutionsAllowed, false);
});

test("release publication and recovery preserve authority and published evidence", async () => {
  const fixture = await readScenarios("project-release");
  const publication = findCase(
    fixture,
    "publication-needs-separate-authority",
  );
  assert.ok(!publication.authority.includes("publish"));
  assert.equal(publication.expected.publishAuthorized, false);
  assert.equal(publication.expected.publishAttempted, false);
  assert.equal(publication.expected.authorizationInherited, false);

  const unavailable = findCase(fixture, "insufficient-provider-evidence");
  assert.equal(unavailable.expected.status, "blocked");
  assert.deepEqual(unavailable.expected.fabricatedCommands, []);
  assert.ok(unavailable.expected.missingCapabilities.length > 0);

  const recovery = findCase(fixture, "published-recovery");
  assert.ok(!recovery.authority.includes("destructive-recovery"));
  assert.equal(recovery.expected.publishedEvidencePreserved, true);
  assert.equal(recovery.expected.tagDeleted, false);
  assert.equal(recovery.expected.tagRetargeted, false);
  assert.equal(recovery.expected.releaseOverwritten, false);
  assert.equal(recovery.expected.followUpPreferred, true);
});

test("release automation evidence is pinned and least-privilege", async () => {
  const fixture = await readSharedFixture("automation");
  assert.equal(fixture.selectedByRepositoryEvidence, "github");
  assert.deepEqual(fixture.topLevelPermissions, { contents: "read" });
  const writeJobs = fixture.jobs
    .filter((job) => Object.values(job.permissions).includes("write"))
    .map((job) => job.name);
  assert.deepEqual(writeJobs, fixture.expected.releaseWriteJobs);
  assert.ok(
    fixture.thirdPartyActions.every((action) =>
      /@[0-9a-f]{40}$/.test(action.uses),
    ),
  );
  assert.equal(fixture.expected.defaultReadOnly, true);
  assert.equal(fixture.expected.allThirdPartyActionsPinnedByFullSHA, true);
  assert.equal(fixture.expected.workflowExecuted, false);
});

test("pull request and release fixtures are read-only, private, and isolated", async () => {
  const before = await snapshotTree(path.join(projectRoot, "skills"));
  const pullRequest = await readScenarios("project-pull-request");
  const release = await readScenarios("project-release");
  for (const fixture of [pullRequest, release]) {
    assert.ok(
      fixture.cases.every(
        (scenario) =>
          (scenario.expected.executedMutations ?? []).length === 0,
      ),
    );
    const privacy = findCase(fixture, "privacy");
    assert.match(privacy.syntheticPrivateValue, /^[A-Z_]+$/);
    assert.equal(privacy.expected.outputContainsPrivateValue, false);
    assert.doesNotMatch(
      JSON.stringify(privacy.expected),
      new RegExp(privacy.syntheticPrivateValue),
    );
    fixture.cases[0].id = "caller-mutated";
  }
  assert.notEqual(
    (await readScenarios("project-pull-request")).cases[0].id,
    "caller-mutated",
  );
  assert.notEqual(
    (await readScenarios("project-release")).cases[0].id,
    "caller-mutated",
  );

  const disclosure = await readSharedFixture("progressive-disclosure");
  const allSentinels = Object.values(disclosure.sentinels);
  for (const scenario of disclosure.cases) {
    assert.equal(scenario.expectedLoaded.length, 1);
    assert.ok(allSentinels.includes(scenario.expectedLoaded[0]));
    assert.ok(
      allSentinels
        .filter((sentinel) => sentinel !== scenario.expectedLoaded[0])
        .every((sentinel) => !scenario.expectedLoaded.includes(sentinel)),
    );
  }

  const equivalence = await readSharedFixture("source-equivalence");
  const bodies = await Promise.all(
    SKILLS.map((name) =>
      fs.readFile(path.join(projectRoot, "skills", name, "SKILL.md"), "utf8"),
    ),
  );
  assert.ok(equivalence.generalizedResponsibilities.length >= 4);
  assert.equal(equivalence.expected.responsibilitiesPreserved, true);
  for (const term of equivalence.sourceTerms) {
    assert.ok(bodies.every((body) => !body.includes(term)));
  }

  await readSharedFixture("repositories");
  await readSharedFixture("automation");
  assert.deepEqual(await snapshotTree(path.join(projectRoot, "skills")), before);
});
