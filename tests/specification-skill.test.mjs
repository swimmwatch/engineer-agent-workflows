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
  assert.equal(entry.classification, "bundle-required");
  assert.deepEqual(entry.dependencies, ["planning-and-task-breakdown"]);
  assert.ok(countCodePoints(entry.description) <= 240);

  const document = await fs.readFile(path.join(skillRoot, "SKILL.md"));
  const validated = validateSkillDocument(entry, document);
  assert.ok(validated.bytes <= 4096);
  for (const pattern of [
    /verify-engineering-manual/,
    /`AGENTS\.md` in Codex/,
    /`CLAUDE\.md` in Claude Code/,
    /only callable Prompt MCP tools/,
    /Do not construct a tool namespace/,
    /checkpoint each\s+non-sensitive committed answer/is,
    /Status: Draft/,
    /committed positive approval/,
    /Never\s+create an implementation plan/is,
  ]) {
    assert.match(validated.body, pattern);
  }
  assert.doesNotMatch(validated.body, /prompt-mcp|GTK|Zenity|Go\/MCP/);
});

test("specification interview reference defines durable callable-tool recovery", async () => {
  const reference = await fs.readFile(
    path.join(skillRoot, "references", "specification-interview.md"),
    "utf8",
  );
  for (const pattern of [
    /AGENTS\.md|host project guidance/,
    /decisions\.yaml/,
    /stable\s+semantic IDs/,
    /append positive integer revisions/,
    /Inspect the callable tool list and schemas at runtime/,
    /Do not hard-code an MCP\s+namespace/is,
    /recoverable workspace interview/,
    /bounded batches/,
    /single-question Prompt MCP/,
    /cancelled.*timed_out.*unavailable.*conflict.*invalid_request.*failed/is,
    /Do not draft while material decisions/,
    /Keep the artifact behavioral/,
    /approval\.spec/,
    /explicitly committed `approve`/,
  ]) {
    assert.match(reference, pattern);
  }
  assert.doesNotMatch(reference, /mcp__[a-z0-9_]+/);
});

test("specification fixtures keep contracts behavioral and requirement-complete", async () => {
  const fixture = await specificationFixture("behavioral-contract");
  assert.equal(fixture.schemaVersion, 1);
  assert.equal(fixture.expectedSpecification.status, "Draft");
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

test("specification recovery persists only committed answers and preserves revisions", async () => {
  const fixture = await specificationFixture("status-recovery");
  const nonAnswers = new Set([
    "cancelled",
    "timed_out",
    "unavailable",
    "conflict",
    "invalid_request",
    "failed",
  ]);
  const persisted = fixture.outcomes.map((outcome) => {
    if (outcome.persistAnswer) {
      assert.equal(outcome.status, "answered");
      assert.equal(outcome.committed, true);
      assert.equal(outcome.durable, true);
      return {
        status: outcome.status,
        state: outcome.expectedState,
        answer: { selectedIds: ["approved-choice"], text: "" },
      };
    }
    assert.ok(nonAnswers.has(outcome.status));
    assert.equal(outcome.committed, false);
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

test("specification approval is separate, committed, positive, and durable", async () => {
  const fixture = await specificationFixture("draft-approval");
  assert.equal(fixture.approvalDecisionId, "approval.spec");
  assert.equal(fixture.separateFromInterview, true);
  for (const approval of fixture.cases) {
    const actual =
      approval.selection === "approve" &&
      approval.committed === true &&
      approval.durable === true
        ? "Approved"
        : "Draft";
    assert.equal(actual, approval.expectedStatus);
  }
});

test("specification fixtures and validation do not mutate production", async () => {
  const before = await snapshotTree(path.join(projectRoot, "skills"));
  for (const fixture of [
    "behavioral-contract",
    "status-recovery",
    "draft-approval",
  ]) {
    await specificationFixture(fixture);
  }
  const after = await snapshotTree(path.join(projectRoot, "skills"));
  assert.deepEqual(after, before);

  const skill = await fs.readFile(path.join(skillRoot, "SKILL.md"), "utf8");
  const fixedInstruction =
    "Install or update the complete matching engineer-agent-workflows bundle " +
    "for Codex and Claude Code using the documented pinned global command, " +
    "then retry.";
  assert.ok(normalizeWhitespace(skill).includes(fixedInstruction));
});
