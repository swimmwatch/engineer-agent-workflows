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
const planningProfiles = [
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
  return `references/${profile}-planning.md`;
}

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

test("planning requires a concrete per-task agreement before readiness", async () => {
  const entry = await fs.readFile(path.join(skillRoot, "SKILL.md"), "utf8");
  assert.match(entry, /references\/technical-agreement\.md/);
  assert.match(entry, /every task.*explicit agreement/is);
  assert.match(entry, /alternatives.*recommendation/is);
  assert.match(entry, /planning_packet_check/);
  const packets = await fs.readFile(path.join(skillRoot, "references/task-packets.md"), "utf8");
  for (const field of ["Technical proposal", "Technical agreement", "agreement_ref", "proposal_digest", "sources", "heading"]) {
    assert.ok(packets.includes(field), field);
  }
});

test("technical choices are explained in conversation before the question and full packet drafting", async () => {
  const reference = await fs.readFile(path.join(skillRoot, "references/technical-agreement.md"), "utf8");
  assert.match(reference, /before the native question.*conversation/is);
  assert.match(reference, /not.*only in files or proposal identifiers/is);
  assert.match(reference, /only the binding proposal sections.*before.*complete.*packet details after agreement/is);
});

test("draft proposal boundaries are frozen before delivery detail is appended", async () => {
  const reference = await fs.readFile(path.join(skillRoot, "references/technical-agreement.md"), "utf8");
  assert.match(reference, /before freezing.*next same-level heading/is);
  assert.match(reference, /boundary whitespace unchanged/is);
});

test("technical discussion uses the managed technical journal and preserves unresolved tasks", async () => {
  const reference = await fs.readFile(path.join(skillRoot, "references/technical-agreement.md"), "utf8");
  for (const name of ["planning_question_prepare", "planning_question_record_answer", "planning_question_record_no_answer", "planning_decision_find", "planning_decision_get", "planning_packet_check"]) {
    assert.match(reference, new RegExp(`\\b${name}\\b`));
  }
  for (const pattern of [
    /inspect.*before.*ask/is,
    /one.*adequate.*without.*invent/is,
    /shared.*once/is,
    /partial.*only.*explicit/is,
    /dismiss.*not.*agreement/is,
    /selected_ids/,
    /accepted_proposal_ids/,
    /rejected_proposal_ids/,
    /revises/,
    /latest.*question_ref/is,
    /every.*binding.*commitment.*hashed/is,
    /private helpers/is,
    /source.*provenance/is,
    /legacy.*affected/is,
    /capability.*block/is,
    /conversational fallback/is,
  ]) assert.match(reference, pattern);
  for (const name of ["technical-agreement.md", "adaptive-planning.md"]) {
    const text = await fs.readFile(path.join(skillRoot, "references", name), "utf8");
    assert.doesNotMatch(text, /(?<!planning_)\bquestion_(?:prepare|record_answer|record_no_answer)\b/);
  }
});

async function readPlanningFixture(name) {
  return JSON.parse(await readFixture("planning", `${name}.json`));
}

test("planning skill is portable, explicit-only, bounded, and catalog-aligned", async () => {
  const entry = await planningEntry();
  assert.ok(entry);
  assert.equal(entry.classification, "bundle-required");
  assert.deepEqual(entry.dependencies, ["spec-driven-development"]);
  assert.ok(countCodePoints(entry.description) <= 240);

  const document = await fs.readFile(path.join(skillRoot, "SKILL.md"));
  const validated = validateSkillDocument(entry, document);
  assert.ok(validated.bytes <= 4096);
  assert.match(validated.body, /explicit request/);
  assert.match(validated.body, /`\{\{HOST_PROJECT_INSTRUCTIONS\}\}`/);
  assert.match(validated.body, /verify-engineering-manual/);
  assert.match(validated.body, /planning-and-task-breakdown.*sole argument/is);
  assert.match(validated.body, /Stop without a plan if\s+verification fails/);
  assert.match(validated.body, /`\{\{HOST_QUESTION_TOOL\}\}`/);
  assert.match(validated.body, /do not enter plan mode solely to\s+ask/is);
  assert.match(
    validated.body,
    /tool is unavailable, ask the question directly/is,
  );
  assert.match(validated.body, /language-appropriate/);
  assert.match(validated.body, /Do not invent classes/);
  assert.match(validated.body, /contradicted by repository evidence/);
  assert.match(validated.body, /substantial multi-step work/);
  assert.match(validated.body, /references\/test-discipline\.md/);
  assert.match(validated.body, /references\/developer-documentation\.md/);
  assert.match(validated.body, /references\/adaptive-planning\.md/);
  assert.match(validated.body, /references\/<profile>-planning\.md/);
  assert.match(validated.body, /Status: Approved.*manifest\.yaml/is);
  assert.match(validated.body, /Lite.*Standard.*Deep/is);
  assert.match(validated.body, /only.*active profile.*manifest/is);
  assert.match(validated.body, /one compact.*packet/is);
  assert.match(validated.body, /planning artifacts.*not production/is);
  assert.match(validated.body, /Never mutate production\s+artifacts/);
  assert.doesNotMatch(validated.body, /Prompt MCP|prompt-mcp|mcp__/);
  assert.doesNotMatch(
    validated.body,
    /AGENTS\.md|CLAUDE\.md|request_user_input|AskUserQuestion/,
  );
});

test("adaptive planning requires approved scope and scales output", async () => {
  const reference = await fs.readFile(
    path.join(skillRoot, "references", "adaptive-planning.md"),
    "utf8",
  );
  for (const pattern of [
    /Approved.*spec\.md/is,
    /confirmed.*manifest\.yaml/is,
    /missing.*stop.*specification/is,
    /Lite.*one compact.*packet/is,
    /Standard.*profile/is,
    /Deep.*quality.*risk/is,
    /core.*profile/is,
    /highest applicable depth/i,
    /do not silently downgrade/i,
  ]) {
    assert.match(reference, pattern);
  }

  const fixture = await readPlanningFixture("adaptive-profile-artifacts");
  assert.equal(fixture.schemaVersion, 1);
  assert.equal(fixture.prerequisites.specStatus, "Approved");
  assert.equal(fixture.prerequisites.manifestConfirmed, true);
  for (const entry of fixture.cases) {
    assert.deepEqual(
      entry.expectedLoadedProfileReferences,
      entry.profiles.map(profileReference),
    );
  }
  const lite = fixture.cases.find((entry) => entry.depth === "lite");
  assert.deepEqual(lite.outputs.numberedPackets, ["01_implementation.md"]);
  assert.equal(lite.outputs.profileArtifacts.length, 0);
  const standard = fixture.cases.find((entry) => entry.depth === "standard");
  assert.ok(standard.profiles.includes("core"));
  assert.ok(standard.outputs.profileArtifacts.includes("core/contracts.yaml"));
  assert.ok(standard.outputs.projectArtifacts.includes("design/specs/example/experience.yaml"));
  assert.deepEqual(lite.outputs.projectArtifacts, []);
  const deep = fixture.cases.find((entry) => entry.depth === "deep");
  assert.ok(deep.outputs.profileArtifacts.includes("contracts/openapi.yaml"));
  assert.ok(deep.outputs.profileArtifacts.includes("architecture/model.dsl"));
});

test("planning loads one isolated reference for each active profile", async () => {
  const references = Object.fromEntries(
    await Promise.all(
      planningProfiles.map(async (profile) => [
        profile,
        await fs.readFile(
          path.join(skillRoot, profileReference(profile)),
          "utf8",
        ),
      ]),
    ),
  );
  for (const profile of planningProfiles) {
    assert.match(
      references[profile],
      new RegExp(`manifest.*${profile}.*active`, "is"),
    );
  }
  for (const pattern of [
    /core\/contracts\.yaml/,
    /library.*CLI.*configuration/is,
    /public interface/i,
    /compatibility/i,
  ]) {
    assert.match(references.core, pattern);
  }
  for (const pattern of [
    /experience\.yaml/,
    /design tokens/i,
    /wireframe/i,
    /state transition/i,
    /derived preview/i,
  ]) {
    assert.match(references.ui, pattern);
  }
  for (const pattern of [
    /OpenAPI.*HTTP/is,
    /problem type/i,
    /contract test/i,
  ]) {
    assert.match(references.backend, pattern);
  }
  assert.match(references.events, /AsyncAPI.*event/is);
  assert.match(references.data, /JSON Schema.*migration/is);
  assert.match(references.operations, /SLI.*SLO.*operator recovery/is);
  assert.match(references.security, /trust boundaries.*least\s+privilege/is);
  assert.match(references["cross-surface"], /C4.*dynamic view.*ADR/is);
  assert.match(
    Object.values(references).join("\n"),
    /repository-local planning artifact/i,
  );
});

test("planning blocks when paired specification artifacts are absent", async () => {
  const fixture = await readPlanningFixture("missing-specification-scope");
  assert.equal(fixture.schemaVersion, 1);
  for (const scenario of fixture.scenarios) {
    assert.equal(scenario.expected.status, "blocked");
    assert.equal(scenario.expected.productionMutation, false);
    assert.match(scenario.expected.nextAction, /spec-driven-development/);
  }
});

test("shared engineering manual is authoritative and covers the complete quality contract", async () => {
  const sharedRoot = path.join(projectRoot, "shared");
  const files = await walkFiles(sharedRoot);
  assert.deepEqual(
    files,
    [
      "references/engineering-principles.md",
      "references/implementation-context.md",
      "references/product-workflow.md",
      "references/test-discipline.md",
      "references/workflow-state-access.md",
    "references/yaml-contracts.md",
    "schemas/catalog.schema.json",
    "schemas/decisions.schema.json",
    "schemas/experience.schema.json",
    "schemas/manifest.schema.json",
      "schemas/product.schema.json",
      "scripts/verify-engineering-manual.mjs",
      "scripts/verify-product-workflow.mjs",
    ],
  );
  const manual = await fs.readFile(
    path.join(sharedRoot, "references", "engineering-principles.md"),
    "utf8",
  );
  const verifier = await fs.readFile(
    path.join(sharedRoot, "scripts", "verify-engineering-manual.mjs"),
    "utf8",
  );
  for (const skill of [
    "planning-and-task-breakdown",
    "incremental-implementation",
    "spec-driven-development",
  ]) {
    assert.equal(
      await fs.readFile(
        path.join(
          projectRoot,
          "skills",
          skill,
          "shared",
          "references",
          "engineering-principles.md",
        ),
        "utf8",
      ),
      manual,
    );
    assert.equal(
      await fs.readFile(
        path.join(
          projectRoot,
          "skills",
          skill,
          "shared",
          "scripts",
          "verify-engineering-manual.mjs",
        ),
        "utf8",
      ),
      verifier,
    );
  }
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

test("planning task packet reference is generalized and bounded", async () => {
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
  assert.match(reference, /test plan/i);
  assert.match(reference, /(?:written|writes).*before\s+implementation/is);
  assert.match(reference, /correct.*check.*implementation/is);
  assert.match(reference, /`file:line`/);
  assert.match(reference, /`MANUAL GATE`/);
  assert.match(reference, /implementation-context\.md/);
  const implementation = await fs.readFile(
    path.join(projectRoot, "shared/references/implementation-context.md"), "utf8",
  );
  assert.match(implementation, /explicit authorization/);
  assert.doesNotMatch(reference, /Go\/MCP|prompt-mcp|GTK|Zenity/);
});

test("planning makes a repository-localized developer-documentation decision", async () => {
  const reference = await fs.readFile(
    path.join(skillRoot, "references", "developer-documentation.md"),
    "utf8",
  );
  for (const pattern of [
    /two\s+or\s+more/i,
    /state the decision either way/i,
    /after.*behavior.*end-to-end/is,
    /repository.*guidance.*language/is,
    /reader who did not write/i,
  ]) {
    assert.match(reference, pattern);
  }

  const notWarranted = await readPlanningFixture(
    "developer-documentation-not-warranted",
  );
  assert.equal(notWarranted.expected.packetPlanned, false);
  assert.match(notWarranted.expected.reason, /one layer/i);
  assert.equal(notWarranted.expected.decisionRecorded, true);

  const warranted = await readPlanningFixture(
    "developer-documentation-warranted",
  );
  assert.ok(Object.values(warranted.signals).filter(Boolean).length >= 2);
  assert.equal(warranted.expected.packetPlanned, true);
  assert.equal(warranted.expected.finalPacket, true);
  assert.equal(warranted.expected.afterImplementation, true);
  assert.equal(warranted.expected.afterEndToEndVerification, true);
  assert.equal(warranted.expected.languageSource, "repository-guidance");
  assert.match(warranted.expected.readerAcceptance, /reader/i);
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
    "adaptive-profile-artifacts.json",
    "developer-documentation-not-warranted.json",
    "developer-documentation-warranted.json",
    "disproved-boundary.json",
    "documentation-configuration.json",
    "functional-procedural.json",
    "incomplete-evidence.json",
    "missing-specification-scope.json",
    "object-oriented.json",
    "rule-conflict.json",
  ]);
  const after = await snapshotTree(path.join(projectRoot, "skills"));
  assert.deepEqual(after, before);
});
