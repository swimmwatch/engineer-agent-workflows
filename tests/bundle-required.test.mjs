import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  layoutPaths,
  verifyEngineeringManual,
} from "../skills/planning-and-task-breakdown/scripts/verify-engineering-manual.mjs";
import {
  makeTempTree,
  projectRoot,
} from "./lib/fixtures.mjs";

const FIXED_INSTRUCTION =
  "Install or update the complete matching engineer-agent-workflows bundle " +
  "for Codex and Claude Code using the documented pinned global command, " +
  "then retry.";
const SKILLS = Object.freeze([
  "planning-and-task-breakdown",
  "spec-driven-development",
  "incremental-implementation",
]);

async function copyBundle(t, prefix = "skills") {
  const root = await makeTempTree(t);
  const skillsRoot = path.join(root, ...prefix.split("/"));
  await fs.mkdir(skillsRoot, { recursive: true });
  for (const skill of SKILLS) {
    await fs.cp(
      path.join(projectRoot, "skills", skill),
      path.join(skillsRoot, skill),
      { recursive: true },
    );
  }
  return { root, skillsRoot };
}

async function runBundleWorkflow(skillDirectory) {
  try {
    await verifyEngineeringManual(skillDirectory);
    return { artifactCreated: true, output: "" };
  } catch {
    return { artifactCreated: false, output: FIXED_INSTRUCTION };
  }
}

test("bundle-required direct callers verify the byte-identical owned manual", async () => {
  const results = await Promise.all(
    SKILLS.map((skill) =>
      verifyEngineeringManual(path.join(projectRoot, "skills", skill)),
    ),
  );
  assert.equal(new Set(results.map((result) => result.digest)).size, 1);
  assert.equal(
    results[0].digest,
    "c5b85c4e25c1de77a9f22bdce417fde2861b3310e7f3cc96b13e070d2c3b0637",
  );
});

test("bundle-required copy and native plugin layouts verify both callers", async (t) => {
  for (const prefix of [
    "skills",
    "plugins/engineer-agent-workflows/skills",
  ]) {
    const bundle = await copyBundle(t, prefix);
    for (const caller of SKILLS.slice(1)) {
      const result = await runBundleWorkflow(
        path.join(bundle.skillsRoot, caller),
      );
      assert.deepEqual(result, { artifactCreated: true, output: "" });
    }
  }
});

test("bundle-required symlinked global layouts verify both callers", async (t) => {
  const source = await copyBundle(t, "source/skills");
  const installed = path.join(source.root, "global");
  await fs.mkdir(installed);
  try {
    for (const skill of SKILLS) {
      await fs.symlink(
        path.join(source.skillsRoot, skill),
        path.join(installed, skill),
        "dir",
      );
    }
  } catch (error) {
    if (error?.code === "EPERM") {
      t.skip("symlink creation is not permitted");
      return;
    }
    throw error;
  }
  for (const caller of SKILLS.slice(1)) {
    assert.equal(
      (await runBundleWorkflow(path.join(installed, caller))).artifactCreated,
      true,
    );
  }
});

test("bundle-required missing and mismatched bundles stop before artifacts", async (t) => {
  const cases = [
    {
      failedCallers: SKILLS.slice(1),
      async mutate(bundle) {
        await fs.rm(
          path.join(bundle.skillsRoot, "planning-and-task-breakdown"),
          { recursive: true },
        );
      },
    },
    {
      failedCallers: ["spec-driven-development"],
      async mutate(bundle) {
        await fs.rm(
          path.join(
            bundle.skillsRoot,
            "spec-driven-development",
            "engineering-manual.sha256",
          ),
        );
      },
    },
    {
      failedCallers: ["incremental-implementation"],
      async mutate(bundle) {
        await fs.writeFile(
          path.join(
            bundle.skillsRoot,
            "incremental-implementation",
            "engineering-manual.sha256",
          ),
          `${"0".repeat(64)}\n`,
        );
      },
    },
    {
      failedCallers: SKILLS.slice(1),
      async mutate(bundle) {
        await fs.rm(
          path.join(
            bundle.skillsRoot,
            "planning-and-task-breakdown",
            "references",
            "engineering-principles.md",
          ),
        );
      },
    },
  ];
  for (const bundleCase of cases) {
    const bundle = await copyBundle(t);
    await bundleCase.mutate(bundle);
    for (const caller of SKILLS.slice(1)) {
      const result = await runBundleWorkflow(
        path.join(bundle.skillsRoot, caller),
      );
      if (bundleCase.failedCallers.includes(caller)) {
        assert.deepEqual(result, {
          artifactCreated: false,
          output: FIXED_INSTRUCTION,
        });
      } else {
        assert.deepEqual(result, { artifactCreated: true, output: "" });
      }
    }
  }
});

test("bundle-required mixed-release update is rejected by owner and caller markers", async (t) => {
  const bundle = await copyBundle(t);
  const manual = path.join(
    bundle.skillsRoot,
    "planning-and-task-breakdown",
    "references",
    "engineering-principles.md",
  );
  const updated = `${await fs.readFile(manual, "utf8")}\nUpdated fixture.\n`;
  await fs.writeFile(manual, updated);
  const updatedDigest = crypto
    .createHash("sha256")
    .update(updated)
    .digest("hex");
  await fs.writeFile(
    path.join(
      bundle.skillsRoot,
      "spec-driven-development",
      "engineering-manual.sha256",
    ),
    `${updatedDigest}\n`,
  );

  const specification = await runBundleWorkflow(
    path.join(bundle.skillsRoot, "spec-driven-development"),
  );
  const incremental = await runBundleWorkflow(
    path.join(bundle.skillsRoot, "incremental-implementation"),
  );
  assert.deepEqual(specification, {
    artifactCreated: false,
    output: FIXED_INSTRUCTION,
  });
  assert.deepEqual(incremental, {
    artifactCreated: false,
    output: FIXED_INSTRUCTION,
  });
});

test("bundle-required POSIX, macOS, and Windows forms keep sibling identity", () => {
  for (const caller of SKILLS.slice(1)) {
    const linux = layoutPaths(`/opt/agents/skills/${caller}`, path.posix);
    assert.equal(
      linux.planningSkill,
      "/opt/agents/skills/planning-and-task-breakdown",
    );
    const macOS = layoutPaths(`/Users/user/.claude/skills/${caller}`, path.posix);
    assert.equal(path.posix.basename(macOS.callerSkill), caller);
    const windows = layoutPaths(
      `C:\\Users\\user\\.agents\\skills\\${caller}`,
      path.win32,
    );
    assert.equal(
      windows.planningSkill,
      "C:\\Users\\user\\.agents\\skills\\planning-and-task-breakdown",
    );
  }
});

test("bundle-required skills expose one exact content-free failure instruction", async () => {
  for (const caller of SKILLS.slice(1)) {
    const document = await fs.readFile(
      path.join(projectRoot, "skills", caller, "SKILL.md"),
      "utf8",
    );
    const normalized = document.replace(/\s+/g, " ");
    assert.equal(normalized.split(FIXED_INSTRUCTION).length - 1, 1);
    assert.doesNotMatch(FIXED_INSTRUCTION, /[/\\]|PRIVATE|SENTINEL/);
  }
});
