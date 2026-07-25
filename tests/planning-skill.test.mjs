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
  fixturePath,
  projectRoot,
  readFixture,
} from "./lib/fixtures.mjs";

const skillRoot = path.join(
  projectRoot,
  "skills",
  "planning-and-task-breakdown",
);

async function planningEntry() {
  const catalog = await readCatalog(projectRoot);
  return catalog.skills.find(
    (entry) => entry.name === "planning-and-task-breakdown",
  );
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
  assert.match(unit.boundary, /./);
  assert.match(unit.symbol, /./);
  assert.match(unit.purpose, /./);
  assert.ok(["existing", "proposed"].includes(unit.state));
  assert.ok(Array.isArray(unit.inputs));
  assert.ok(Array.isArray(unit.outputs));
  assert.ok(Array.isArray(unit.errorsInvariants));
  assert.ok(unit.errorsInvariants.length > 0);
  assert.ok(Array.isArray(unit.dependencies));
  for (const dependency of unit.dependencies) {
    assert.deepEqual(Object.keys(dependency).sort(), [
      "direction",
      "reason",
      "target",
    ]);
    assert.ok(["inbound", "outbound"].includes(dependency.direction));
    assert.match(dependency.reason, /./);
  }
  assert.ok(unit.requirements.length > 0);
  assert.ok(
    unit.requirements.every((requirement) => requirements.includes(requirement)),
  );
  assert.ok(unit.verification.length > 0);
}

async function readPlanningFixture(name) {
  return JSON.parse(await readFixture("planning", `${name}.json`));
}

test("planning skill is portable, explicit-only, bounded, and catalog-aligned", async () => {
  const entry = await planningEntry();
  assert.ok(entry);
  assert.equal(entry.classification, "standalone");
  assert.deepEqual(entry.dependencies, []);
  assert.ok(countCodePoints(entry.description) <= 240);

  const document = await fs.readFile(path.join(skillRoot, "SKILL.md"));
  const validated = validateSkillDocument(entry, document);
  assert.ok(validated.bytes <= 4096);
  assert.match(validated.body, /explicit request/);
  assert.match(validated.body, /`AGENTS\.md` in Codex/);
  assert.match(validated.body, /`CLAUDE\.md` in Claude Code/);
  assert.match(validated.body, /verify-engineering-manual/);
  assert.match(validated.body, /Stop without a plan if\s+verification fails/);
  assert.match(validated.body, /language-appropriate/);
  assert.match(validated.body, /Do not invent classes/);
  assert.match(validated.body, /contradicted by repository evidence/);
  assert.match(validated.body, /substantial multi-step work/);
  assert.match(validated.body, /Never mutate production\s+artifacts/);
});

test("planning engineering manual exists once and covers the complete quality contract", async () => {
  const files = await walkFiles(path.join(projectRoot, "skills"));
  assert.deepEqual(
    files.filter((file) => file.endsWith("/engineering-principles.md")),
    [
      "planning-and-task-breakdown/references/engineering-principles.md",
    ],
  );
  const manual = await fs.readFile(
    path.join(skillRoot, "references", "engineering-principles.md"),
    "utf8",
  );
  for (const pattern of [
    /requirements and applicable repository\s+instructions outrank/is,
    /contracts, invariants/is,
    /KISS/,
    /YAGNI/,
    /DRY/,
    /SOLID.*object-oriented/is,
    /Separate concerns.*information hiding.*encapsulate/is,
    /low coupling, high cohesion.*low cognitive\s+complexity/is,
    /meaningful names.*bounded control flow/is,
    /composition over\s+inheritance/is,
    /dependencies directed.*Invert a dependency/is,
    /meaningful names.*cohesive units/is,
    /ownership, lifecycle.*cancellation, concurrency.*cleanup/is,
    /Fail safely.*fail closed.*least privilege.*privacy/is,
    /compatibility.*idempotency, retries.*migration/is,
    /testability.*deterministic/is,
    /observability.*Bound.*redact/is,
    /Optimize from measurements/is,
    /platform conventions.*accessibility/is,
    /changes scoped.*review the final diff/is,
    /### Specification/,
    /### Plan/,
    /### Implementation/,
  ]) {
    assert.match(manual, pattern);
  }
});

test("planning task packet reference is generalized and review-gated", async () => {
  const reference = await fs.readFile(
    path.join(skillRoot, "references", "task-packets.md"),
    "utf8",
  );
  assert.match(reference, /arbitrary|language-appropriate/);
  assert.match(reference, /Outcome and requirement identifiers/);
  assert.match(reference, /Prerequisites and repository evidence/);
  assert.match(reference, /Scope and explicit non-goals/);
  assert.match(reference, /ownership boundaries/);
  assert.match(reference, /Objective acceptance criteria/);
  assert.match(reference, /`MANUAL GATE`/);
  assert.match(reference, /explicit authorization/);
  assert.doesNotMatch(reference, /Go\/MCP|prompt-mcp|GTK|Zenity/);
});

test("planning architecture fixtures expose complete language-appropriate units", async () => {
  const objectOriented = await readPlanningFixture("object-oriented");
  const functional = await readPlanningFixture("functional-procedural");
  const documentation = await readPlanningFixture(
    "documentation-configuration",
  );
  for (const fixture of [objectOriented, functional, documentation]) {
    assert.equal(fixture.schemaVersion, 1);
    assert.equal(fixture.expected.status, "ready");
    assert.ok(fixture.expected.units.length > 0);
    fixture.expected.units.forEach((unit) =>
      validateUnit(unit, fixture.requirements),
    );
    const covered = new Set(
      fixture.expected.units.flatMap((unit) => unit.requirements),
    );
    assert.deepEqual(
      [...covered].sort(),
      [...fixture.requirements].sort(),
    );
  }
  assert.ok(
    objectOriented.expected.units.some((unit) => unit.kind === "class"),
  );
  assert.ok(
    functional.expected.units.every((unit) => unit.kind === "function"),
  );
  assert.ok(
    documentation.expected.units.every((unit) =>
      ["document-section", "configuration-key"].includes(unit.kind),
    ),
  );
  assert.ok(
    [...functional.expected.units, ...documentation.expected.units].every(
      (unit) => !["class", "interface", "method"].includes(unit.kind),
    ),
  );
});

test("planning revises disproved boundaries and applies repository rules", async () => {
  const disproved = await readPlanningFixture("disproved-boundary");
  assert.equal(disproved.expected.status, "revised");
  assert.ok(
    disproved.expected.units.every(
      (unit) =>
        unit.boundary !== disproved.initialProposal.boundary &&
        unit.symbol !== disproved.initialProposal.symbol,
    ),
  );
  disproved.expected.units.forEach((unit) =>
    validateUnit(unit, disproved.requirements),
  );

  const conflict = await readPlanningFixture("rule-conflict");
  assert.equal(conflict.conflict.appliedRule, "repositoryRule");
  assert.ok(conflict.expected.tradeoffs.length > 0);
  assert.ok(
    conflict.expected.units.every(
      (unit) => !["class", "interface"].includes(unit.kind),
    ),
  );
});

test("planning blocks incomplete evidence without mutating production", async () => {
  const before = await snapshotTree(path.join(projectRoot, "skills"));
  const incomplete = await readPlanningFixture("incomplete-evidence");
  assert.equal(incomplete.expected.status, "blocked");
  assert.ok(incomplete.expected.uncertainties.length > 0);
  assert.deepEqual(incomplete.expected.units, []);
  const fixtureFiles = await fs.readdir(fixturePath("planning"));
  assert.deepEqual(fixtureFiles.sort(), [
    "disproved-boundary.json",
    "documentation-configuration.json",
    "functional-procedural.json",
    "incomplete-evidence.json",
    "object-oriented.json",
    "rule-conflict.json",
  ]);
  const after = await snapshotTree(path.join(projectRoot, "skills"));
  assert.deepEqual(after, before);
});
