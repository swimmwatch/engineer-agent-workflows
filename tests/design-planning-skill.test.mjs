import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { readCatalog } from "../scripts/lib/catalog.mjs";
import { projectRoot } from "./lib/fixtures.mjs";

test("design planning is a separate explicit workflow depending on the main plan", async () => {
  const catalog = await readCatalog(projectRoot);
  const entry = catalog.skills.find(skill => skill.name === "design-planning");
  assert.ok(entry, "The requested design stage must be independently invocable.");
  assert.equal(entry.classification, "bundle-required");
  assert.deepEqual(entry.dependencies, ["planning-and-task-breakdown"]);
  assert.equal(entry.policies.codex.allowImplicitInvocation, false);
  assert.equal(entry.policies.claude.disableModelInvocation, true);
  assert.equal(entry.policies.claude.userInvocable, true);
  for (const root of ["skills", "plugins/codex/engineer-agent-workflows/skills", "plugins/claude-code/engineer-agent-workflows/skills"]) {
    const text = await fs.readFile(path.join(projectRoot, root, "design-planning/SKILL.md"), "utf8");
    assert.ok(Buffer.byteLength(text) <= 4096);
  }
});
