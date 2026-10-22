import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("planning establishes scenario access before checking workflow state", async () => {
  for (const source of [
    "skills/planning-and-task-breakdown/SKILL.md",
    ...["codex", "claude-code"].map(host =>
      `plugins/${host}/engineer-agent-workflows/skills/planning-and-task-breakdown/SKILL.md`),
  ]) {
    const text = await readFile(new URL(`../${source}`, import.meta.url), "utf8");
    const access = text.indexOf("shared/references/yaml-contracts.md");
    const prerequisite = text.indexOf("Require `spec.md`");
    assert.ok(access >= 0 && prerequisite > access, source);
    assert.match(text.slice(access, prerequisite), /scenario MCP tools/);
  }
});

test("technical readiness is checked before implementation context and after the scoped diff", async () => {
  for (const prefix of ["", ...["codex", "claude-code"].map(host => `plugins/${host}/engineer-agent-workflows/`)]) {
    const source = `${prefix}skills/incremental-implementation/SKILL.md`;
    const text = await readFile(new URL(`../${source}`, import.meta.url), "utf8");
    const firstGate = text.indexOf("planning_packet_check");
    const context = text.indexOf("engineering-principles.md");
    const finalGate = text.lastIndexOf("planning_packet_check");
    const complete = text.indexOf("mark only the current checklist item");
    assert.ok(firstGate >= 0 && firstGate < context, source);
    assert.ok(finalGate > context && finalGate < complete, source);
    assert.match(text.slice(0, context), /specification_check_state/);
    assert.match(text.slice(0, context), /agreement_ref.*expected_proposal_digest/s);
    assert.match(text, /scoped diff.*technical commitments/s);
    assert.match(text, /legacy.*planning/is);
  }
});

test("implementation establishes scenario access before discovering packet state", async () => {
  for (const source of [
    "skills/incremental-implementation/SKILL.md",
    ...["codex", "claude-code"].map(host =>
      `plugins/${host}/engineer-agent-workflows/skills/incremental-implementation/SKILL.md`),
  ]) {
    const text = await readFile(new URL(`../${source}`, import.meta.url), "utf8");
    const access = text.indexOf("shared/references/workflow-state-access.md");
    const discovery = text.search(/Read the\s+current checklist/);
    assert.ok(access >= 0 && discovery > access, source);
    assert.match(text.slice(access, discovery), /scenario MCP/);
  }
});
