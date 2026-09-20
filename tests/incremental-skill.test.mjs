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

const skillRoot = path.join(projectRoot, "skills", "incremental-implementation");

async function incrementalEntry() {
  const catalog = await readCatalog(projectRoot);
  return catalog.skills.find(
    (entry) => entry.name === "incremental-implementation",
  );
}

async function incrementalFixture(name) {
  return JSON.parse(await readFixture("incremental", `${name}.json`));
}

function validateUnit(unit, requirements) {
  for (const field of [
    "boundary",
    "state",
    "kind",
    "symbol",
    "purpose",
    "inputs",
    "outputs",
    "stateLifecycle",
    "errorsInvariants",
    "dependencies",
    "requirements",
    "verification",
  ]) {
    assert.ok(Object.hasOwn(unit, field), `unit is missing ${field}`);
  }
  assert.ok(["existing", "proposed"].includes(unit.state));
  assert.ok(unit.requirements.every((value) => requirements.includes(value)));
  assert.ok(unit.errorsInvariants.length > 0);
  assert.ok(unit.verification.length > 0);
}

test("incremental skill is explicit, bounded, bundle-required, and catalog-aligned", async () => {
  const entry = await incrementalEntry();
  assert.ok(entry);
  assert.equal(entry.classification, "bundle-required");
  assert.deepEqual(entry.dependencies, ["planning-and-task-breakdown"]);
  assert.ok(countCodePoints(entry.description) <= 240);

  const document = await fs.readFile(path.join(skillRoot, "SKILL.md"));
  const validated = validateSkillDocument(entry, document);
  assert.ok(validated.bytes <= 4096);
  for (const pattern of [
    /verify-engineering-manual/,
    /references\/task-packets\.md/,
    /exactly one explicitly authorized packet/,
    /explicitly authorized commits/,
    /Inspect every\s+staged diff/is,
    /host planning mode/,
    /existing plan/,
    /keep production unchanged/,
    /references\/test-discipline\.md/,
    /test.*before.*implementation/is,
    /RED.*GREEN.*PROVE/is,
    /correct.*check.*implementation/is,
    /do not weaken.*test/is,
    /mark only the current checklist item/,
    /Approved/,
    /confirmed.*manifest/is,
    /\{\{HOST_QUESTION_TOOL\}\}/,
    /references\/packet-recovery\.md/,
    /review.*not.*prerequisite/is,
  ]) {
    assert.match(validated.body, pattern);
  }
  assert.doesNotMatch(validated.body, /prompt-mcp|GTK|Zenity|Go\/MCP/);
});

test("incremental execution fixture changes one packet and preserves unrelated paths", async () => {
  const fixture = await incrementalFixture("packet-execution");
  assert.equal(fixture.schemaVersion, 1);
  assert.ok(fixture.availablePackets.includes(fixture.authorizedPacket));
  assert.ok(
    fixture.changedPaths.every(
      (changed) => !fixture.unrelatedPaths.includes(changed),
    ),
  );
  assert.deepEqual(fixture.expected.checkedItems, [fixture.authorizedPacket]);
  assert.equal(fixture.expected.completedPacket, fixture.authorizedPacket);
  assert.equal(fixture.expected.handoffReplaced, true);
  assert.equal(fixture.expected.stoppedAfterPacket, true);
  assert.equal(fixture.expected.reviewRequired, false);
  assert.equal(fixture.expected.currentPacketCommitted, false);
  assert.ok(
    fixture.verification.every((check) => check.status === "passed"),
  );
  assert.deepEqual(fixture.executionOrder, [
    "write-check",
    "observe-red",
    "implement",
    "prove-when-required",
    "verify",
  ]);
  assert.equal(fixture.expected.weakenedChecks, false);
});

test("synthetic transition examples separate execution authority from optional review and commits", async () => {
  const fixture = await incrementalFixture("transition-commit");
  assert.equal(fixture.evidenceKind, "synthetic-contract-examples");
  for (const transition of fixture.cases) {
    const commitAllowed =
      transition.previousComplete === true &&
      transition.commitAuthorized === true &&
      transition.stagedPathsExact === true;
    const executionAllowed =
      transition.nextPacketAuthorized === true &&
      transition.prerequisitesPassed === true;
    assert.equal(transition.expectedCommit, commitAllowed);
    assert.equal(transition.expectedStartNext, executionAllowed);
  }
  assert.ok(fixture.cases.some((entry) => entry.expectedStartNext &&
    !entry.commitAuthorized && !entry.reviewCompleted));
});

test("incremental planning mode exposes complete non-object-oriented architecture", async () => {
  const fixture = await incrementalFixture("planning-mode");
  assert.equal(fixture.productionMutation, false);
  assert.ok(fixture.units.length > 0);
  fixture.units.forEach((unit) => validateUnit(unit, fixture.requirements));
  assert.ok(
    fixture.units.every(
      (unit) => !["class", "interface", "method"].includes(unit.kind),
    ),
  );
});

test("incremental verification failure leaves the packet incomplete", async () => {
  const fixture = await incrementalFixture("verification-failure");
  assert.ok(
    fixture.verification.some((check) => check.status === "failed"),
  );
  assert.equal(fixture.expected.checklistCompleted, false);
  assert.equal(fixture.expected.handoffRecordsFailure, true);
  assert.equal(fixture.expected.nextPacketStarted, false);
  assert.equal(fixture.expected.stoppedIncomplete, true);
  assert.equal(fixture.expected.correctImplementation, true);
  assert.equal(fixture.expected.weakenChecks, false);
  assert.equal(fixture.expected.repeatUntilChecksPass, true);
});

test("incremental fixtures and validation do not mutate production", async () => {
  const before = await snapshotTree(path.join(projectRoot, "skills"));
  for (const fixture of [
    "packet-execution",
    "transition-commit",
    "planning-mode",
    "verification-failure",
  ]) {
    await incrementalFixture(fixture);
  }
  assert.deepEqual(await snapshotTree(path.join(projectRoot, "skills")), before);
});
