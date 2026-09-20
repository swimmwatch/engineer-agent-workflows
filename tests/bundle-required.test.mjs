import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  layoutPaths,
  verifyEngineeringManual,
} from "../shared/scripts/verify-engineering-manual.mjs";
import {
  makeTempTree,
  projectRoot,
} from "./lib/fixtures.mjs";

const FIXED_INSTRUCTION =
  "Install or update the complete matching engineer-agent-workflows bundle " +
  "for {{HOST_DISPLAY_NAME}} using the documented pinned global command, " +
  "then retry.";
const SKILLS = Object.freeze([
  "design-planning",
  "spec-driven-development",
  "planning-and-task-breakdown",
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

test("bundle-required copy and native plugin layouts verify the dependency graph", async (t) => {
  for (const prefix of [
    "skills",
    "plugins/codex/engineer-agent-workflows/skills",
    "plugins/claude-code/engineer-agent-workflows/skills",
  ]) {
    const bundle = await copyBundle(t, prefix);
    for (const caller of SKILLS) {
      const result = await runBundleWorkflow(
        path.join(bundle.skillsRoot, caller),
      );
      assert.deepEqual(result, { artifactCreated: true, output: "" });
    }
  }
});

test("bundle-required symlinked global layouts verify the dependency graph", async (t) => {
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
  for (const caller of SKILLS) {
    assert.equal(
      (await runBundleWorkflow(path.join(installed, caller))).artifactCreated,
      true,
    );
  }
});

test("bundle-required missing and mismatched bundles stop before artifacts", async (t) => {
  const cases = [
    {
      failedCallers: SKILLS,
      async mutate(bundle) {
        await fs.rm(
          path.join(bundle.skillsRoot, "spec-driven-development"),
          { recursive: true },
        );
      },
    },
    {
      failedCallers: [
        "design-planning",
        "planning-and-task-breakdown",
        "incremental-implementation",
      ],
      async mutate(bundle) {
        await fs.rm(
          path.join(bundle.skillsRoot, "planning-and-task-breakdown"),
          { recursive: true },
        );
      },
    },
    {
      failedCallers: SKILLS,
      async mutate(bundle) {
        await fs.rm(
          path.join(
            bundle.skillsRoot,
            "spec-driven-development",
            "shared",
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
            "shared",
            "engineering-manual.sha256",
          ),
          `${"0".repeat(64)}\n`,
        );
      },
    },
    {
      failedCallers: [
        "design-planning",
        "planning-and-task-breakdown",
        "incremental-implementation",
      ],
      async mutate(bundle) {
        await fs.rm(
          path.join(
            bundle.skillsRoot,
            "planning-and-task-breakdown",
            "shared",
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
    for (const caller of SKILLS) {
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

test("bundle-required dependency graph rejects a partial planning update", async (t) => {
  const bundle = await copyBundle(t);
  const manual = path.join(
    bundle.skillsRoot,
    "planning-and-task-breakdown",
    "shared",
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
      "planning-and-task-breakdown",
      "shared",
      "engineering-manual.sha256",
    ),
    `${updatedDigest}\n`,
  );

  const results = Object.fromEntries(
    await Promise.all(
      SKILLS.map(async (skill) => [
        skill,
        await runBundleWorkflow(path.join(bundle.skillsRoot, skill)),
      ]),
    ),
  );
  assert.deepEqual(results["spec-driven-development"], {
    artifactCreated: true,
    output: "",
  });
  for (const skill of [
    "design-planning",
    "planning-and-task-breakdown",
    "incremental-implementation",
  ]) {
    assert.deepEqual(results[skill], {
      artifactCreated: false,
      output: FIXED_INSTRUCTION,
    });
  }
});

test("bundle-required POSIX, macOS, and Windows forms keep sibling identity", () => {
  for (const caller of SKILLS) {
    const linux = layoutPaths(`/opt/agents/skills/${caller}`, path.posix);
    assert.equal(
      linux.planningSkill,
      "/opt/agents/skills/planning-and-task-breakdown",
    );
    assert.equal(
      linux.specificationSkill,
      "/opt/agents/skills/spec-driven-development",
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
  for (const caller of SKILLS) {
    const document = await fs.readFile(
      path.join(projectRoot, "skills", caller, "SKILL.md"),
      "utf8",
    );
    const normalized = document.replace(/\s+/g, " ");
    assert.equal(normalized.split(FIXED_INSTRUCTION).length - 1, 1);
    assert.doesNotMatch(FIXED_INSTRUCTION, /[/\\]|PRIVATE|SENTINEL/);
  }
});
