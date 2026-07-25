import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { snapshotTree } from "../scripts/lib/files.mjs";
import {
  layoutPaths,
  locateBundleRoot,
  main,
  readExpectedDigest,
  verifyEngineeringManual,
} from "../skills/planning-and-task-breakdown/scripts/verify-engineering-manual.mjs";
import {
  makeTempTree,
  projectRoot,
} from "./lib/fixtures.mjs";

const sourceSkill = path.join(
  projectRoot,
  "skills",
  "planning-and-task-breakdown",
);
const execFileAsync = promisify(execFile);

async function copyBundle(t, prefix = "skills") {
  const root = await makeTempTree(t);
  const skillsRoot = path.join(root, ...prefix.split("/"));
  const planning = path.join(skillsRoot, "planning-and-task-breakdown");
  await fs.mkdir(skillsRoot, { recursive: true });
  await fs.cp(sourceSkill, planning, { recursive: true });
  return { root, skillsRoot, planning };
}

async function addCaller(skillsRoot, name = "incremental-implementation") {
  const caller = path.join(skillsRoot, name);
  await fs.mkdir(caller, { recursive: true });
  await fs.copyFile(
    path.join(sourceSkill, "engineering-manual.sha256"),
    path.join(caller, "engineering-manual.sha256"),
  );
  return caller;
}

function capture() {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      stdout: { write(value) { stdout += value; } },
      stderr: { write(value) { stderr += value; } },
    },
    output() {
      return { stdout, stderr };
    },
  };
}

test("engineering manual verification is deterministic, silent, and copy-isolated", async () => {
  const before = await snapshotTree(sourceSkill);
  const first = await verifyEngineeringManual(sourceSkill);
  first.digest = "mutated";
  const second = await verifyEngineeringManual(sourceSkill);
  assert.equal(
    second.digest,
    "c5b85c4e25c1de77a9f22bdce417fde2861b3310e7f3cc96b13e070d2c3b0637",
  );
  assert.equal(await readExpectedDigest(sourceSkill), second.digest);
  const captured = capture();
  assert.equal(await main([sourceSkill], captured.io), 0);
  assert.deepEqual(captured.output(), { stdout: "", stderr: "" });
  assert.deepEqual(await snapshotTree(sourceSkill), before);
});

test("engineering manual resolves copied, dependent-sibling, and plugin layouts", async (t) => {
  const copied = await copyBundle(t);
  const caller = await addCaller(copied.skillsRoot);
  assert.equal(
    (await verifyEngineeringManual(copied.planning)).digest,
    (await verifyEngineeringManual(caller)).digest,
  );
  assert.equal(
    path.basename((await locateBundleRoot(caller)).planningSkill),
    "planning-and-task-breakdown",
  );

  const plugin = await copyBundle(
    t,
    "plugins/engineer-agent-workflows/skills",
  );
  const pluginCaller = await addCaller(
    plugin.skillsRoot,
    "spec-driven-development",
  );
  assert.equal(
    (await verifyEngineeringManual(pluginCaller)).digest,
    await readExpectedDigest(pluginCaller),
  );
});

test("engineering manual resolves symlinked global installs", async (t) => {
  const source = await copyBundle(t, "source/skills");
  const caller = await addCaller(source.skillsRoot);
  const installRoot = path.join(source.root, "global");
  await fs.mkdir(installRoot);
  const planningLink = path.join(
    installRoot,
    "planning-and-task-breakdown",
  );
  const callerLink = path.join(installRoot, "incremental-implementation");
  try {
    await fs.symlink(source.planning, planningLink, "dir");
    await fs.symlink(caller, callerLink, "dir");
  } catch (error) {
    if (error?.code === "EPERM") {
      t.skip("symlink creation is not permitted");
      return;
    }
    throw error;
  }
  assert.equal(
    (await verifyEngineeringManual(planningLink)).digest,
    (await verifyEngineeringManual(callerLink)).digest,
  );
  const result = await execFileAsync(process.execPath, [
    path.join(
      planningLink,
      "scripts",
      "verify-engineering-manual.mjs",
    ),
    callerLink,
  ]);
  assert.deepEqual(result, { stdout: "", stderr: "" });
});

test("engineering manual preserves POSIX, macOS, and Windows path forms", () => {
  const linux = layoutPaths(
    "/home/user/.agents/skills/incremental-implementation",
    path.posix,
  );
  assert.equal(
    linux.manual,
    "/home/user/.agents/skills/planning-and-task-breakdown/references/engineering-principles.md",
  );
  const macOS = layoutPaths(
    "/Users/user/.claude/skills/spec-driven-development",
    path.posix,
  );
  assert.equal(
    macOS.marker,
    "/Users/user/.claude/skills/spec-driven-development/engineering-manual.sha256",
  );
  const windows = layoutPaths(
    "C:\\Users\\user\\.agents\\skills\\incremental-implementation",
    path.win32,
  );
  assert.equal(
    windows.manual,
    "C:\\Users\\user\\.agents\\skills\\planning-and-task-breakdown\\references\\engineering-principles.md",
  );
  assert.throws(
    () =>
      layoutPaths(
        "\\\\server\\share\\skills\\incremental-implementation",
        path.win32,
    ),
    /bundle is unavailable/,
  );
  assert.throws(
    () =>
      layoutPaths(
        "/opt/skills/../skills/incremental-implementation",
        path.posix,
      ),
    /bundle is unavailable/,
  );
});

test("engineering manual failures stop before planning output", async (t) => {
  const bundle = await copyBundle(t);
  const caller = await addCaller(bundle.skillsRoot);
  await fs.writeFile(
    path.join(caller, "engineering-manual.sha256"),
    `${"0".repeat(64)}\n`,
  );
  await assert.rejects(
    () => verifyEngineeringManual(caller),
    /does not match/,
  );

  await fs.writeFile(
    path.join(caller, "engineering-manual.sha256"),
    "not-a-digest\n",
  );
  await assert.rejects(() => verifyEngineeringManual(caller), /marker is invalid/);

  await fs.rm(path.join(caller, "engineering-manual.sha256"));
  await assert.rejects(() => verifyEngineeringManual(caller), /marker is unavailable/);

  const valid = await addCaller(
    bundle.skillsRoot,
    "spec-driven-development",
  );
  await fs.rm(
    path.join(
      bundle.planning,
      "references",
      "engineering-principles.md",
    ),
  );
  let planProduced = false;
  await assert.rejects(async () => {
    await verifyEngineeringManual(valid);
    planProduced = true;
  }, /manual is unavailable/);
  assert.equal(planProduced, false);
});

test("engineering manual rejects symlinked content and network paths", async (t) => {
  const bundle = await copyBundle(t);
  const marker = path.join(bundle.planning, "engineering-manual.sha256");
  const markerTarget = path.join(bundle.root, "marker.txt");
  await fs.copyFile(marker, markerTarget);
  await fs.rm(marker);
  try {
    await fs.symlink(markerTarget, marker);
  } catch (error) {
    if (error?.code === "EPERM") {
      t.skip("symlink creation is not permitted");
      return;
    }
    throw error;
  }
  await assert.rejects(
    () => verifyEngineeringManual(bundle.planning),
    /marker is unavailable/,
  );
  await assert.rejects(
    () => verifyEngineeringManual("//server/share/incremental-implementation"),
    /bundle is unavailable/,
  );
});

test("engineering manual CLI failures use fixed content-free diagnostics", async (t) => {
  const sentinel = "PRIVATE_MANUAL_SENTINEL";
  const captured = capture();
  const missing = path.join(
    await makeTempTree(t),
    sentinel,
    "incremental-implementation",
  );
  assert.equal(await main([missing], captured.io), 1);
  assert.equal(captured.output().stdout, "");
  assert.match(captured.output().stderr, /^E_MANUAL_LAYOUT:/);
  assert.doesNotMatch(captured.output().stderr, new RegExp(sentinel));
  assert.doesNotMatch(
    captured.output().stderr,
    new RegExp(missing.replaceAll("\\", "\\\\")),
  );

  const usage = capture();
  assert.equal(await main([], usage.io), 2);
  assert.equal(
    usage.output().stderr,
    "E_USAGE: verify-engineering-manual.mjs <skill-directory>\n",
  );
});
