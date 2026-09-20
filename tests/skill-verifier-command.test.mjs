import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { makeTempTree, projectRoot } from "./lib/fixtures.mjs";

const workflows = [
  "design-planning",
  "spec-driven-development",
  "planning-and-task-breakdown",
  "incremental-implementation",
];

for (const host of ["codex", "claude-code"]) {
  for (const workflow of workflows) {
    test(`${host} ${workflow} verifier command works outside its skill directory`, async (t) => {
      const skillDirectory = path.join(
        projectRoot, "plugins", host, "engineer-agent-workflows", "skills", workflow,
      );
      const document = await fs.readFile(path.join(skillDirectory, "SKILL.md"), "utf8");
      const command = document.match(/`node "\$skill_dir\/([^"\n]+)" "\$skill_dir"`/u);
      assert.ok(command, "The entrypoint must provide the executable skill-local verifier command");
      assert.equal(command[1], "shared/scripts/verify-engineering-manual.mjs");

      const consumer = await makeTempTree(t);
      const verifier = path.join(skillDirectory, command[1]);
      execFileSync(process.execPath, [verifier, skillDirectory], {
        cwd: consumer,
        encoding: "utf8",
        timeout: 10_000,
      });
      const wrongCaller = spawnSync(process.execPath, [verifier, consumer], {
        cwd: consumer,
        encoding: "utf8",
        timeout: 10_000,
      });
      assert.ifError(wrongCaller.error);
      assert.equal(wrongCaller.status, 1, "The verifier must reject the consuming directory as its caller");
      assert.deepEqual(await fs.readdir(consumer), [], "Verification must not modify the consuming project");
    });
  }
}
