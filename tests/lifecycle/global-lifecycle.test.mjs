import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { readCatalog, readReleaseMetadata } from "../../scripts/lib/catalog.mjs";
import { snapshotTree } from "../../scripts/lib/files.mjs";
import { projectRoot, readFixture } from "../lib/fixtures.mjs";
import {
  assertProfileContained,
  createIsolatedProfile,
  environmentFor,
} from "./isolated-profile.mjs";
import {
  assertProjectUnchanged,
  snapshotProject,
} from "./project-snapshot.mjs";
import { runSkills, SKILLS_PACKAGE } from "./skills-command.mjs";
import {
  commitFixtureUpdate,
  createSourceFixture,
} from "./source-fixture.mjs";

const STANDALONE_SKILL = "code-review-and-quality";
const BUNDLE_REQUIRED_SKILL = "incremental-implementation";
const UNKNOWN_SKILL = "definitely-not-a-skill";
const HOSTS = Object.freeze([
  { sourceKey: "codex", agent: "codex" },
  { sourceKey: "claudeCode", agent: "claude-code" },
]);

async function exists(candidate) {
  try {
    await fs.lstat(candidate);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function findNamed(root, name) {
  const matches = [];
  async function visit(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(candidate);
      } else if (entry.isFile() && entry.name === name) {
        matches.push(candidate);
      }
    }
  }
  await visit(root);
  return matches;
}

function failureMessage(label, result) {
  return `${label} failed\n${result.stdout}\n${result.stderr}`.slice(0, 2_000);
}

async function resolvedSkillPath(profile, agent, skillName) {
  const root =
    agent === "codex"
      ? path.join(profile.home, ".agents", "skills")
      : path.join(profile.home, ".claude", "skills");
  return await fs.realpath(path.join(root, skillName));
}

async function assertInstalledSkillEquals(profile, sources, skillName) {
  for (const host of HOSTS) {
    const expected = await snapshotTree(
      path.join(sources[host.sourceKey].root, "skills", skillName),
    );
    const installed = await resolvedSkillPath(profile, host.agent, skillName);
    assert.deepEqual(await snapshotTree(installed), expected, host.agent);
  }
}

async function globalNames(profile, environment, agent) {
  const result = await runSkills(
    ["list", "--global", "--agent", agent, "--json"],
    {
      cwd: profile.project,
      env: environment,
      redactRoot: profile.root,
    },
  );
  assert.equal(result.exitCode, 0, failureMessage(`list ${agent}`, result));
  const entries = JSON.parse(result.stdout);
  assert.ok(Array.isArray(entries));
  return entries.map((entry) => entry.name).sort();
}

test(
  "global lifecycle uses isolated profiles and leaves project unchanged",
  { timeout: 300_000 },
  async (t) => {
    const profile = await createIsolatedProfile(t);
    const environment = environmentFor(profile, {
      ...process.env,
      NPM_TOKEN: "PRIVATE_LIFECYCLE_SENTINEL_7fbd",
      GITHUB_TOKEN: "PRIVATE_LIFECYCLE_SENTINEL_7fbd",
      MCP_PRIVATE_STATE: "PRIVATE_LIFECYCLE_SENTINEL_7fbd",
    });
    await fs.writeFile(
      path.join(profile.project, "consumer.txt"),
      "consumer project sentinel\n",
      "utf8",
    );
    const projectBaseline = await snapshotProject(profile.project);
    assert.deepEqual(projectBaseline, {
      "consumer.txt": {
        sha256:
          "a927a7f89101239638029af8efff0cb1ee96d6e906f63d8c8c7bdef1e2991b58",
        size: 26,
      },
    });
    const sources = await createSourceFixture(t, profile, projectRoot);
    const catalog = await readCatalog(projectRoot);
    const release = await readReleaseMetadata(projectRoot);
    const names = catalog.skills.map((skill) => skill.name);

    assert.equal(release.lifecycleTool.package, "skills");
    assert.equal(release.lifecycleTool.version, "1.5.20");
    assert.equal(SKILLS_PACKAGE, "skills@1.5.20");
    const reviewed = JSON.parse(
      await readFixture("skills-cli-1.5.20", "metadata.json"),
    );
    assert.equal(reviewed.version, release.lifecycleTool.version);
    assert.equal(reviewed.nodeMinimum, release.node.minimum);
    assert.equal(reviewed.integrity, release.lifecycleTool.integrity);

    async function invoke(args, label, expectedExit = 0) {
      const before = await snapshotProject(profile.project);
      const result = await runSkills(args, {
        cwd: profile.project,
        env: environment,
        redactRoot: profile.root,
      });
      assert.equal(
        result.exitCode,
        expectedExit,
        failureMessage(label, result),
      );
      assert.equal(result.timedOut, false, label);
      assert.equal(result.outputExceeded, false, label);
      assert.equal(
        `${result.stdout}${result.stderr}`.includes(
          "PRIVATE_LIFECYCLE_SENTINEL_7fbd",
        ),
        false,
        label,
      );
      assertProjectUnchanged(before, await snapshotProject(profile.project));
      return result;
    }

    async function addForHosts(skill, label, extra = []) {
      for (const host of HOSTS) {
        await invoke(
          [
            "add",
            sources[host.sourceKey].url,
            "--global",
            "--agent",
            host.agent,
            "--skill",
            skill,
            "--copy",
            ...extra,
            "--yes",
          ],
          `${label} ${host.agent}`,
        );
      }
    }

    for (const host of HOSTS) {
      const discovery = await invoke(
        [
          "add",
          sources[host.sourceKey].url,
          "--global",
          "--agent",
          host.agent,
          "--skill",
          "*",
          "--copy",
          "--list",
          "--yes",
        ],
        `source discovery ${host.agent}`,
      );
      for (const name of names) {
        assert.match(discovery.stdout, new RegExp(`\\b${name}\\b`));
      }
    }
    assert.equal(
      await exists(path.join(profile.home, ".agents", "skills")),
      false,
    );

    await addForHosts(STANDALONE_SKILL, "standalone add");
    await assertInstalledSkillEquals(profile, sources, STANDALONE_SKILL);
    const codexEntry = await fs.lstat(
      path.join(
        profile.home,
        ".agents",
        "skills",
        STANDALONE_SKILL,
      ),
    );
    const claudeEntry = await fs.lstat(
      path.join(
        profile.home,
        ".claude",
        "skills",
        STANDALONE_SKILL,
      ),
    );
    assert.equal(codexEntry.isDirectory(), true);
    assert.equal(claudeEntry.isDirectory(), true);
    assert.deepEqual(await globalNames(profile, environment, "codex"), [
      STANDALONE_SKILL,
    ]);
    assert.deepEqual(
      await globalNames(profile, environment, "claude-code"),
      [STANDALONE_SKILL],
    );
    await invoke(
      [
        "remove",
        "--global",
        "--agent",
        "codex",
        "--agent",
        "claude-code",
        "--skill",
        STANDALONE_SKILL,
        "--yes",
      ],
      "standalone remove",
    );
    assert.equal(
      await exists(
        path.join(
          profile.home,
          ".agents",
          "skills",
          STANDALONE_SKILL,
        ),
      ),
      false,
    );

    await addForHosts("*", "complete add");
    const lockPaths = await findNamed(profile.root, ".skill-lock.json");
    assert.equal(lockPaths.length, 1, JSON.stringify(lockPaths));
    assert.equal(
      lockPaths[0],
      path.join(profile.xdgState, "skills", ".skill-lock.json"),
    );
    const lock = JSON.parse(await fs.readFile(lockPaths[0], "utf8"));
    assert.deepEqual(Object.keys(lock.skills).sort(), [...names].sort());
    for (const name of names) {
      await assertInstalledSkillEquals(profile, sources, name);
    }
    assert.deepEqual(await globalNames(profile, environment, "codex"), [
      ...names,
    ].sort());
    assert.deepEqual(
      await globalNames(profile, environment, "claude-code"),
      [...names].sort(),
    );

    const unchangedBefore = new Map();
    for (const host of HOSTS) {
      for (const name of names.filter((name) => name !== STANDALONE_SKILL)) {
        unchangedBefore.set(
          `${host.agent}:${name}`,
          await snapshotTree(
            await resolvedSkillPath(profile, host.agent, name),
          ),
        );
      }
    }
    const updates = {};
    for (const host of HOSTS) {
      updates[host.agent] = await commitFixtureUpdate(
        profile,
        sources[host.sourceKey],
        STANDALONE_SKILL,
      );
    }
    await addForHosts(STANDALONE_SKILL, "host-specific repeat add");
    await assertInstalledSkillEquals(profile, sources, STANDALONE_SKILL);
    for (const host of HOSTS) {
      const installed = await resolvedSkillPath(
        profile,
        host.agent,
        STANDALONE_SKILL,
      );
      assert.equal(
        await fs.readFile(
          path.join(installed, updates[host.agent].relativeMarker),
          "utf8",
        ),
        updates[host.agent].marker,
      );
    }
    for (const [identity, before] of unchangedBefore) {
      const [agent, name] = identity.split(":");
      assert.deepEqual(
        await snapshotTree(await resolvedSkillPath(profile, agent, name)),
        before,
        identity,
      );
    }

    await invoke(
      [
        "remove",
        "--global",
        "--agent",
        "codex",
        "--agent",
        "claude-code",
        "--all",
        "--yes",
      ],
      "complete remove",
    );
    assert.deepEqual(await globalNames(profile, environment, "codex"), []);
    assert.deepEqual(
      await globalNames(profile, environment, "claude-code"),
      [],
    );

    await addForHosts(
      BUNDLE_REQUIRED_SKILL,
      "bundle-required individual add",
    );
    assert.equal(
      await exists(
        path.join(
          profile.home,
          ".agents",
          "skills",
          "planning-and-task-breakdown",
        ),
      ),
      false,
    );
    await assertInstalledSkillEquals(
      profile,
      sources,
      BUNDLE_REQUIRED_SKILL,
    );
    await invoke(
      [
        "remove",
        "--global",
        "--agent",
        "codex",
        "--agent",
        "claude-code",
        "--skill",
        BUNDLE_REQUIRED_SKILL,
        "--yes",
      ],
      "bundle-required individual remove",
    );

    const unknown = await invoke(
      [
        "add",
        sources.codex.url,
        "--global",
        "--agent",
        "codex",
        "--skill",
        UNKNOWN_SKILL,
        "--copy",
        "--yes",
      ],
      "unknown skill",
      1,
    );
    const unknownEvidence = (
      await readFixture("skills-cli-1.5.20", "unknown-skill.txt")
    ).trim();
    const unknownOutput = `${unknown.stdout}\n${unknown.stderr}`;
    assert.match(unknownOutput, new RegExp(unknownEvidence, "s"));
    for (const name of names) {
      assert.match(unknownOutput, new RegExp(`\\b${name}\\b`));
    }

    assertProjectUnchanged(
      projectBaseline,
      await snapshotProject(profile.project),
    );
    await assertProfileContained(profile);
  },
);
