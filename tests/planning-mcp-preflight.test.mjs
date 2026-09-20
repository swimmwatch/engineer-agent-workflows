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

test("implementation establishes scenario access before discovering packet state", async () => {
  for (const source of [
    "skills/incremental-implementation/SKILL.md",
    ...["codex", "claude-code"].map(host =>
      `plugins/${host}/engineer-agent-workflows/skills/incremental-implementation/SKILL.md`),
  ]) {
    const text = await readFile(new URL(`../${source}`, import.meta.url), "utf8");
    const access = text.indexOf("shared/references/yaml-contracts.md");
    const discovery = text.search(/Read the\s+current checklist/);
    assert.ok(access >= 0 && discovery > access, source);
    assert.match(text.slice(access, discovery), /scenario MCP/);
  }
});
