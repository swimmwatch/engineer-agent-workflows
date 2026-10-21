import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { workflowTools } from "../packages/engineer-agent-workflow-mcp/dist/server.js";
import { projectRoot } from "./lib/fixtures.mjs";

const TASK_SKILLS = Object.freeze([
  "spec-driven-development",
  "planning-and-task-breakdown",
  "incremental-implementation",
]);
const read = relativePath => readFile(path.join(projectRoot, relativePath), "utf8");

function assertStandaloneProductBoundary(document) {
  assert.match(
    document,
    /otherwise[^.]*?(?:do\s+not\s+call|skip)\s+product\s+task tools/iu,
  );
}

function assertOrdered(document, values) {
  let offset = -1;
  for (const value of values) {
    const next = document.indexOf(value, offset + 1);
    assert.ok(next > offset, `${value} must appear after the prior lifecycle step`);
    offset = next;
  }
}

test("P16 keeps product task integration conditional and legacy-safe", async () => {
  const protocol = await read("shared/references/product-workflow.md");
  assert.match(protocol, /exact product task ID[\s\S]+valid binding/iu);
  assert.match(
    protocol,
    /standalone[\s\S]+do not call\s+product\s+task tools/iu,
  );
  assert.match(protocol, /never infer[\s\S]+task ID/iu);

  for (const skill of TASK_SKILLS) {
    const document = await read(`skills/${skill}/SKILL.md`);
    assert.match(document, /shared\/references\/product-workflow\.md/u);
    assert.match(document, /product-linked/iu);
    assertStandaloneProductBoundary(document);
    assert.doesNotMatch(document, /mcp__engineer_agent_workflow/u);
  }
});

test("P16 rejects a missing standalone product-tool restriction", async () => {
  for (const skill of TASK_SKILLS) {
    const document = await read(`skills/${skill}/SKILL.md`);
    const unrestricted = document.replace(
      /(?:do\s+not\s+call|skip)\s+product\s+task tools/iu,
      "use product task tools",
    );
    assert.notEqual(unrestricted, document);
    assert.throws(() => assertStandaloneProductBoundary(unrestricted));
  }
});

test("P16 specification selects exact product context before local profile reads", async () => {
  const [skill, protocol] = await Promise.all([
    read("skills/spec-driven-development/SKILL.md"),
    read("shared/references/product-workflow.md"),
  ]);
  assert.match(skill, /product-linked[\s\S]+specification role/iu);
  assert.match(protocol, /Specification role/iu);
  assertOrdered(protocol, [
    "task_specification_reserve",
    "product_context_prepare",
    "product_context_next",
    "product_element_get",
    "product_decision_get",
    "scope_confirm",
  ]);
  assert.match(protocol, /own confirmed manifest[\s\S]+profile/iu);
  assert.match(protocol, /never inherit[\s\S]+product profile/iu);
  assert.match(protocol, /existing[\s\S]+specification[\s\S]+not[\s\S]+enroll/iu);
});

test("P16 planning validates selected inputs without starting implementation", async () => {
  const [skill, protocol] = await Promise.all([
    read("skills/planning-and-task-breakdown/SKILL.md"),
    read("shared/references/product-workflow.md"),
  ]);
  assert.match(skill, /product-linked[\s\S]+planning role/iu);
  assert.match(protocol, /Planning role/iu);
  assertOrdered(protocol, [
    "purpose `planning`",
    "product_context_next",
    "product_element_get",
    "product_decision_get",
    "task_inputs_check",
    "never call `task_packet_start`",
  ]);
  assert.match(protocol, /Approved specification[\s\S]+confirmed manifest/iu);
  assert.match(protocol, /design-planning[\s\S]+separate explicit/iu);
});

test("P16 incremental lifecycle pins, verifies and completes one packet", async () => {
  const [skill, protocol] = await Promise.all([
    read("skills/incremental-implementation/SKILL.md"),
    read("shared/references/product-workflow.md"),
  ]);
  assert.match(skill, /product-linked[\s\S]+implementation role/iu);
  assert.match(protocol, /Implementation role/iu);
  assertOrdered(protocol, [
    "purpose `implementation`",
    "product_context_next",
    "product_sources_get_batch",
    "product_element_get",
    "product_decision_get",
    "task_inputs_check",
    "task_packet_start",
    "RED/GREEN/PROVE",
    "task_packet_complete",
  ]);
  assert.match(protocol, /operation_ref[\s\S]+owner_ref/iu);
  assert.match(
    protocol,
    /failed or unavailable\s+required check[\s\S]+do not call `task_packet_complete`/iu,
  );
  assert.match(protocol, /product_safety_block[\s\S]+pause/iu);
  assert.match(protocol, /local implementation defect[\s\S]+not[\s\S]+product rewrite/iu);
  assert.match(protocol, /review[\s\S]+commit[\s\S]+not[\s\S]+gate/iu);
});

test("P16 treats selected product content as untrusted data", async () => {
  const protocol = await read("shared/references/product-workflow.md");
  assert.match(protocol, /repository[\s\S]+document[\s\S]+research[\s\S]+data/iu);
  assert.match(protocol, /cannot authorize[\s\S]+commands[\s\S]+network access/iu);
  assert.match(protocol, /higher-priority instructions/iu);
  assert.match(protocol, /sensitive data[\s\S]+durable evidence/iu);
});

test("P16 relies on typed product task scenario tools", () => {
  const expected = [
    "product_context_next",
    "product_context_prepare",
    "product_safety_block",
    "task_inputs_check",
    "task_packet_complete",
    "task_packet_start",
    "task_specification_register_copy",
    "task_specification_reserve",
  ];
  const selected = workflowTools.filter(tool => expected.includes(tool.name));
  assert.deepEqual(selected.map(tool => tool.name).sort(), expected.toSorted());
  for (const tool of selected) {
    assert.equal(tool.schemaKind, "json");
    assert.equal(tool.outputSchema.type, "object");
  }
  assert.equal(
    selected.find(tool => tool.name === "task_inputs_check")?.write,
    false,
  );
});

test("P16 packages the shared task protocol for both isolated hosts", async () => {
  const protocol = await read("shared/references/product-workflow.md");
  for (const root of [
    "plugins/codex/engineer-agent-workflows",
    "plugins/claude-code/engineer-agent-workflows",
  ]) {
    for (const skill of TASK_SKILLS) {
      const reference = path.join(
        projectRoot,
        root,
        "skills",
        skill,
        "shared/references/product-workflow.md",
      );
      await access(reference);
      assert.equal(await readFile(reference, "utf8"), protocol);
      await access(path.join(
        projectRoot,
        root,
        "skills",
        skill,
        "shared/product-protocol.sha256",
      ));
    }
  }
});
