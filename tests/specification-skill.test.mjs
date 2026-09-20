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

const skillRoot = path.join(projectRoot, "skills", "spec-driven-development");
const specificationProfiles = [
  "core",
  "ui",
  "backend",
  "events",
  "data",
  "operations",
  "security",
  "cross-surface",
];

function profileReference(profile) {
  return `references/${profile}-requirements.md`;
}

async function specificationEntry() {
  const catalog = await readCatalog(projectRoot);
  return catalog.skills.find(
    (entry) => entry.name === "spec-driven-development",
  );
}

async function specificationFixture(name) {
  return JSON.parse(await readFixture("specification", `${name}.json`));
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

test("specification skill is explicit, bounded, bundle-required, and catalog-aligned", async () => {
  const entry = await specificationEntry();
  assert.ok(entry);
  assert.equal(entry.classification, "standalone");
  assert.deepEqual(entry.dependencies, []);
  assert.ok(countCodePoints(entry.description) <= 240);

  const document = await fs.readFile(path.join(skillRoot, "SKILL.md"));
  const validated = validateSkillDocument(entry, document);
  assert.ok(validated.bytes <= 4096);
  for (const pattern of [
    /verify-engineering-manual/,
    /spec-driven-development.*sole argument/is,
    /`\{\{HOST_PROJECT_INSTRUCTIONS\}\}`/,
    /`\{\{HOST_QUESTION_TOOL\}\}`/,
    /do not enter plan mode\s+solely to ask/is,
    /Checkpoint each non-sensitive answer immediately/,
    /references\/test-discipline\.md/,
    /references\/adaptive-scope\.md/,
    /references\/<profile>-requirements\.md/,
    /Lite.*Standard.*Deep/is,
    /propose.*confirm.*depth.*profiles/is,
    /confirmed manifest.*only.*active profile/is,
    /manifest\.yaml/,
    /planning.*profile artifacts/is,
    /observation.*excluded\s+outcome/is,
    /absence.*observable/is,
    /verified.*assumed.*superseded/is,
    /Status: Approved/,
    /without a separate\s+approval question/,
    /user\s+edits.*authoritative/is,
    /Do not plan, implement/,
  ]) {
    assert.match(validated.body, pattern);
  }
  assert.doesNotMatch(
    `${entry.description}\n${validated.body}`,
    /Prompt MCP|prompt-mcp|mcp__|GTK|Zenity|Go\/MCP|AGENTS\.md|CLAUDE\.md|request_user_input|AskUserQuestion/,
  );
  assert.doesNotMatch(
    validated.body,
    /Status: Draft|draft approval|explicit `approve`/i,
  );
});

test("specification scope reference defines adaptive confirmed manifests", async () => {
  const reference = await fs.readFile(
    path.join(skillRoot, "references", "adaptive-scope.md"),
    "utf8",
  );
  for (const pattern of [
    /Lite.*Standard.*Deep/is,
    /highest applicable depth/i,
    /do not ask.*already established/is,
    /do not load.*profile reference.*before.*confirmed/is,
    /simple examples/i,
    /propose.*rationale.*confirm/is,
    /decisions\.yaml.*manifest\.yaml/is,
    /core.*ui.*backend/is,
    /profile.*state.*reason/is,
    /planning_artifacts/,
    /schema_version/,
    /Compact Artifact Registry/,
    /core.*core\/contracts\.yaml/is,
    /ui.*design\/specs\/<slug>\/experience\.yaml/is,
    /backend.*contracts\/openapi\.yaml/is,
  ]) {
    assert.match(reference, pattern);
  }
});

test("specification loads one isolated reference for each active profile", async () => {
  const references = Object.fromEntries(
    await Promise.all(
      specificationProfiles.map(async (profile) => [
        profile,
        await fs.readFile(
          path.join(skillRoot, profileReference(profile)),
          "utf8",
        ),
      ]),
    ),
  );
  for (const profile of specificationProfiles) {
    assert.match(
      references[profile],
      new RegExp(`manifest\\.yaml.*${profile}.*active`, "is"),
    );
  }
  for (const pattern of [
    /library.*CLI.*configuration/is,
    /public interface/i,
    /compatibility.*version/is,
    /deterministic/i,
  ]) {
    assert.match(references.core, pattern);
  }
  for (const pattern of [
    /loading.*empty.*error.*offline.*permission/is,
    /responsive/i,
    /keyboard.*focus/is,
    /accessibility/i,
    /visual.*behavior/is,
  ]) {
    assert.match(references.ui, pattern);
  }
  for (const pattern of [
    /HTTP.*RPC.*external service/is,
    /authentication.*authorization/is,
    /idempotency.*retry/is,
  ]) {
    assert.match(references.backend, pattern);
  }
  for (const pattern of [
    /ordering.*deduplication.*replay/is,
    /schema evolution/i,
  ]) {
    assert.match(references.events, pattern);
  }
  for (const pattern of [
    /migration.*rollback/is,
    /retention.*deletion/is,
  ]) {
    assert.match(references.data, pattern);
  }
  for (const pattern of [
    /observability/i,
    /SLI.*SLO/is,
    /operator\s+recovery/i,
  ]) {
    assert.match(references.operations, pattern);
  }
  assert.match(references.security, /trust boundaries.*least\s+privilege/is);
  assert.match(
    references["cross-surface"],
    /UI action.*operation.*state.*UI outcome/is,
  );
});

test("adaptive specification fixture keeps confirmed scope deterministic", async () => {
  const fixture = await specificationFixture("adaptive-scope");
  assert.equal(fixture.schemaVersion, 1);
  assert.deepEqual(
    fixture.depths.map((entry) => entry.id),
    ["lite", "standard", "deep"],
  );
  for (const scenario of fixture.scenarios) {
    assert.ok(fixture.depths.some((entry) => entry.id === scenario.expectedDepth));
    assert.equal(scenario.scopeProposed, true);
    assert.equal(typeof scenario.scopeConfirmed, "boolean");
    assert.ok(scenario.expectedProfiles.length > 0);
    assert.ok(Array.isArray(scenario.expectedLoadedProfileReferences));
    const allowedReferences = new Set(
      specificationProfiles.map(profileReference),
    );
    assert.ok(
      scenario.expectedLoadedProfileReferences.every((reference) =>
        allowedReferences.has(reference),
      ),
    );
    const expectedReferences = scenario.scopeConfirmed
      ? scenario.expectedProfiles.map(profileReference)
      : [];
    assert.deepEqual(
      scenario.expectedLoadedProfileReferences,
      expectedReferences,
    );
  }
  assert.ok(
    fixture.scenarios.some((scenario) =>
      scenario.expectedProfiles.includes("core"),
    ),
  );
  assert.ok(
    fixture.scenarios.some(
      (scenario) =>
        scenario.scopeConfirmed === false &&
        scenario.expectedLoadedProfileReferences.length === 0,
    ),
  );
  assert.deepEqual(Object.keys(fixture.manifest).sort(), [
    "confirmed",
    "depth",
    "planning_artifacts",
    "profiles",
    "rationale",
    "schema_version",
  ]);
  assert.equal(fixture.manifest.confirmed, true);
  for (const profile of fixture.manifest.profiles) {
    assert.deepEqual(Object.keys(profile).sort(), ["id", "reason", "state"]);
    assert.ok(specificationProfiles.includes(profile.id));
    assert.ok(["active", "not_applicable", "needs_user"].includes(profile.state));
  }
  assert.ok(
    fixture.manifest.profiles.some(
      (profile) => profile.id === "core" && profile.state === "active",
    ),
  );
});

test("specification interview reference defines durable callable-tool recovery", async () => {
  const reference = await fs.readFile(
    path.join(skillRoot, "references", "specification-interview.md"),
    "utf8",
  );
  for (const pattern of [
    /AGENTS\.md|host and project guidance/,
    /decisions\.yaml/,
    /IDs, revisions.*server-owned/s,
    /MCP appends a revision/s,
    /Inspect the callable tool list and schemas at runtime/,
    /`\{\{HOST_QUESTION_TOOL\}\}`/,
    /Never enter plan mode\s+solely/is,
    /advertised batch limit/,
    /ask the exact saved question directly/is,
    /dismissed.*cancelled.*timed_out.*unavailable.*invalid_response.*failed/is,
    /Do not draft while material decisions/,
    /Keep the artifact behavioral/,
    /Automatic Approval/,
    /Status: Approved/,
    /do not create.*approval\.spec/is,
    /user\s+edits.*authoritative/is,
  ]) {
    assert.match(reference, pattern);
  }
  assert.doesNotMatch(
    reference,
    /Prompt MCP|prompt-mcp|mcp__[a-z0-9_]+|request_user_input|AskUserQuestion/,
  );
  assert.doesNotMatch(
    reference,
    /request-changes|leave-draft|explicit `approve` answer/i,
  );
  // Draft is now an explicit input to the independently persisted review.
  // The behavioral gates themselves are exercised through the stdio tests.
  const completion = reference.slice(reference.indexOf("## Automatic Approval"));
  assert.match(completion, /specification_review_start/);
  assert.match(completion, /coverage_status: reviewed/);
  assert.match(completion, /separate fresh context/);
  assert.match(completion, /Status: Approved` immediately/);
});

test("specification fixtures keep contracts behavioral and requirement-complete", async () => {
  const fixture = await specificationFixture("behavioral-contract");
  assert.equal(fixture.schemaVersion, 1);
  assert.equal(fixture.expectedSpecification.status, "Approved");
  assert.deepEqual(
    [...fixture.expectedSpecification.requirementIds].sort(),
    [...fixture.requirements].sort(),
  );
  assert.ok(fixture.expectedSpecification.sections.includes("interfaces"));
  assert.ok(
    fixture.expectedSpecification.sections.includes("failure-and-recovery"),
  );
  assert.ok(
    fixture.expectedSpecification.sections.includes("security-and-privacy"),
  );
  for (const criterion of fixture.expectedSpecification.acceptanceCriteria) {
    assert.match(criterion.observation, /./);
    assert.match(criterion.excludedOutcome, /./);
    if (criterion.kind === "absence") {
      assert.match(criterion.observable, /./);
    }
  }
  assert.ok(
    fixture.expectedSpecification.forbiddenImplementationUnits.includes(
      "class",
    ),
  );
  const serialized = JSON.stringify(fixture.expectedSpecification);
  for (const forbidden of fixture.expectedSpecification
    .forbiddenImplementationUnits) {
    assert.doesNotMatch(serialized, new RegExp(`"${forbidden}"\\s*:`));
  }
});

test("specification recovery persists only explicit answers and preserves revisions", async () => {
  const fixture = await specificationFixture("status-recovery");
  const nonAnswers = new Set([
    "dismissed",
    "cancelled",
    "timed_out",
    "unavailable",
    "invalid_response",
    "failed",
  ]);
  const persisted = fixture.outcomes.map((outcome) => {
    if (outcome.persistAnswer) {
      assert.equal(outcome.status, "answered");
      assert.equal(outcome.hasExplicitAnswer, true);
      return {
        status: outcome.status,
        state: outcome.expectedState,
        answer: { selectedIds: ["approved-choice"], text: "" },
      };
    }
    assert.ok(nonAnswers.has(outcome.status));
    assert.equal(outcome.hasExplicitAnswer, false);
    return {
      status: outcome.status,
      state: outcome.expectedState,
    };
  });
  assert.doesNotMatch(
    JSON.stringify(persisted),
    new RegExp(fixture.syntheticSentinel),
  );

  assert.deepEqual(
    fixture.revisions.map((revision) => revision.revision),
    [1, 2],
  );
  assert.equal(fixture.revisions[0].state, "superseded");
  assert.equal(fixture.revisions[1].supersedesRevision, 1);
  assert.match(fixture.resumeFrom, /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
});

test("completed specification is approved automatically and preserves user edits", async () => {
  const fixture = await specificationFixture("automatic-approval");
  const complete = Object.values(fixture.generationPreconditions).every(Boolean);
  const actualStatus = complete ? "Approved" : null;

  assert.equal(actualStatus, fixture.expectedStatus);
  assert.equal(fixture.separateApprovalQuestion, false);
  assert.equal(fixture.approvalDecisionCreated, false);
  assert.equal(fixture.userEdits.authoritative, true);
  assert.equal(fixture.userEdits.statusAfterEdit, "Approved");
  assert.equal(fixture.userEdits.reconcileOnNextInvocation, true);
});

test("specification fixtures and validation do not mutate production", async () => {
  const before = await snapshotTree(path.join(projectRoot, "skills"));
  for (const fixture of [
    "behavioral-contract",
    "status-recovery",
    "automatic-approval",
    "adaptive-scope",
  ]) {
    await specificationFixture(fixture);
  }
  const after = await snapshotTree(path.join(projectRoot, "skills"));
  assert.deepEqual(after, before);

  const skill = await fs.readFile(path.join(skillRoot, "SKILL.md"), "utf8");
  const fixedInstruction =
    "Install or update the complete matching engineer-agent-workflows bundle " +
    "for {{HOST_DISPLAY_NAME}} using the documented pinned global command, " +
    "then retry.";
  assert.ok(normalizeWhitespace(skill).includes(fixedInstruction));
});
