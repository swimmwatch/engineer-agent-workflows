import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { makeTempTree, projectRoot } from "./lib/fixtures.mjs";

for (const host of ["codex", "claude-code"]) {
  test(`${host} incremental Git preflight distinguishes worktrees without requiring a commit`, async (t) => {
    const skill = path.join(projectRoot, "plugins", host,
      "engineer-agent-workflows", "skills", "incremental-implementation", "SKILL.md");
    const document = await fs.readFile(skill, "utf8");
    assert.ok(document.includes("`git rev-parse --is-inside-work-tree`"),
      "Publish the executable Git prerequisite in the entrypoint");
    const root = await makeTempTree(t, { app: null, bare: null });
    const app = path.join(root, "app");
    const env = { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: path.join(root, "absent-config") };
    for (const key of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR", "GIT_CONFIG_COUNT"]) {
      delete env[key];
    }
    function git(cwd, args) {
      const result = spawnSync("git", args, { cwd, env, encoding: "utf8", timeout: 10_000 });
      assert.ifError(result.error);
      return result;
    }
    const probe = cwd => {
      const result = git(cwd, ["rev-parse", "--is-inside-work-tree"]);
      return result.status === 0 && result.stdout.trim() === "true";
    };
    assert.equal(probe(app), false, "A non-Git directory does not satisfy the prerequisite");
    assert.equal(git(app, ["init", "--quiet"]).status, 0);
    assert.equal(probe(app), true, "An initialized worktree qualifies without a commit");
    assert.notEqual(git(app, ["rev-parse", "--verify", "HEAD"]).status, 0);
    await fs.writeFile(path.join(app, "untracked.txt"), "User work\n");
    assert.equal(probe(app), true, "Untracked user work is not a clean-tree gate");
    assert.equal(await fs.readFile(path.join(app, "untracked.txt"), "utf8"), "User work\n");
    const bare = path.join(root, "bare");
    assert.equal(git(bare, ["init", "--bare", "--quiet"]).status, 0);
    assert.equal(probe(bare), false, "A bare repository is not an implementation worktree");
  });
}
