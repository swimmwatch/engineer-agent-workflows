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
} from "../shared/scripts/verify-engineering-manual.mjs";
import {
  makeTempTree,
  projectRoot,
} from "./lib/fixtures.mjs";

const sourceSkill = path.join(
  projectRoot,
  "skills",
  "planning-and-task-breakdown",
);
const SKILLS = Object.freeze([
  "spec-driven-development",
  "planning-and-task-breakdown",
  "incremental-implementation",
]);
const execFileAsync = promisify(execFile);

async function copyBundle(t, prefix = "skills") {
  const root = await makeTempTree(t);
  const skillsRoot = path.join(root, ...prefix.split("/"));
  const specification = path.join(skillsRoot, "spec-driven-development");
  const planning = path.join(skillsRoot, "planning-and-task-breakdown");
  const incremental = path.join(skillsRoot, "incremental-implementation");
  await fs.mkdir(skillsRoot, { recursive: true });
  for (const skill of SKILLS) {
    await fs.cp(
      path.join(projectRoot, "skills", skill),
      path.join(skillsRoot, skill),
      { recursive: true },
    );
  }
  return { root, skillsRoot, specification, planning, incremental };
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
  assert.match(second.testDisciplineDigest, /^[a-f0-9]{64}$/);
  const captured = capture();
  assert.equal(await main([sourceSkill], captured.io), 0);
  assert.deepEqual(captured.output(), { stdout: "", stderr: "" });
  assert.deepEqual(await snapshotTree(sourceSkill), before);
});

test("engineering manual resolves copied, dependent-sibling, and host plugin layouts", async (t) => {
  const copied = await copyBundle(t);
  assert.equal(
    (await verifyEngineeringManual(copied.planning)).digest,
    (await verifyEngineeringManual(copied.incremental)).digest,
  );
  assert.equal(
    path.basename((await locateBundleRoot(copied.incremental)).planningSkill),
    "planning-and-task-breakdown",
  );
  assert.equal(
    path.basename(
      (await locateBundleRoot(copied.incremental)).specificationSkill,
    ),
    "spec-driven-development",
  );

  for (const prefix of [
    "plugins/codex/engineer-agent-workflows/skills",
    "plugins/claude-code/engineer-agent-workflows/skills",
  ]) {
    const plugin = await copyBundle(t, prefix);
    assert.equal(
      (await verifyEngineeringManual(plugin.specification)).digest,
      await readExpectedDigest(plugin.specification),
    );
  }
});

test("specification verifies its own resources without planning installed", async (t) => {
  const root = await makeTempTree(t);
  const skillsRoot = path.join(root, "skills");
  const specification = path.join(skillsRoot, "spec-driven-development");
  await fs.mkdir(skillsRoot, { recursive: true });
  await fs.cp(
    path.join(projectRoot, "skills", "spec-driven-development"),
    specification,
    { recursive: true },
  );

  assert.equal(
    (await verifyEngineeringManual(specification)).digest,
    await readExpectedDigest(specification),
  );
});

test("planning and incremental verify specification transitively", async (t) => {
  const withoutSpecification = await copyBundle(t);
  await fs.rm(withoutSpecification.specification, { recursive: true });
  await assert.rejects(
    () => verifyEngineeringManual(withoutSpecification.planning),
    /bundle is unavailable/,
  );
  await assert.rejects(
    () => verifyEngineeringManual(withoutSpecification.incremental),
    /bundle is unavailable/,
  );

  const withoutPlanning = await copyBundle(t);
  await fs.rm(withoutPlanning.planning, { recursive: true });
  assert.equal(
    (await verifyEngineeringManual(withoutPlanning.specification)).digest,
    await readExpectedDigest(withoutPlanning.specification),
  );
  await assert.rejects(
    () => verifyEngineeringManual(withoutPlanning.incremental),
    /bundle is unavailable/,
  );
});

test("engineering manual resolves symlinked global installs", async (t) => {
  const source = await copyBundle(t, "source/skills");
  const installRoot = path.join(source.root, "global");
  await fs.mkdir(installRoot);
  const specificationLink = path.join(installRoot, "spec-driven-development");
  const planningLink = path.join(
    installRoot,
    "planning-and-task-breakdown",
  );
  const callerLink = path.join(installRoot, "incremental-implementation");
  try {
    await fs.symlink(source.specification, specificationLink, "dir");
    await fs.symlink(source.planning, planningLink, "dir");
    await fs.symlink(source.incremental, callerLink, "dir");
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
      callerLink,
      "shared",
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
    "/home/user/.agents/skills/incremental-implementation/shared/references/engineering-principles.md",
  );
  assert.equal(
    linux.specificationSkill,
    "/home/user/.agents/skills/spec-driven-development",
  );
  const macOS = layoutPaths(
    "/Users/user/.claude/skills/spec-driven-development",
    path.posix,
  );
  assert.equal(
    macOS.marker,
    "/Users/user/.claude/skills/spec-driven-development/shared/engineering-manual.sha256",
  );
  const windows = layoutPaths(
    "C:\\Users\\user\\.agents\\skills\\incremental-implementation",
    path.win32,
  );
  assert.equal(
    windows.manual,
    "C:\\Users\\user\\.agents\\skills\\incremental-implementation\\shared\\references\\engineering-principles.md",
  );
  assert.equal(
    windows.testDiscipline,
    "C:\\Users\\user\\.agents\\skills\\incremental-implementation\\shared\\references\\test-discipline.md",
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

test("engineering resource verification rejects mismatched test discipline", async (t) => {
  const bundle = await copyBundle(t);
  await fs.appendFile(
    path.join(
      bundle.incremental,
      "shared",
      "references",
      "test-discipline.md",
    ),
    "tampered\n",
  );
  await assert.rejects(
    () => verifyEngineeringManual(bundle.incremental),
    /test discipline does not match the installed bundle/,
  );
});

test("task workflow verification rejects a tampered product protocol", async (t) => {
  const bundle = await copyBundle(t);
  await fs.appendFile(
    path.join(
      bundle.incremental,
      "shared",
      "references",
      "product-workflow.md",
    ),
    "tampered\n",
  );

  await assert.rejects(
    () => verifyEngineeringManual(bundle.incremental),
    /product protocol does not match the installed bundle/,
  );
});

test("task workflow verification requires and aligns product protocol markers", async (t) => {
  const bundle = await copyBundle(t);
  const specification = await verifyEngineeringManual(bundle.specification);
  const planning = await verifyEngineeringManual(bundle.planning);
  const incremental = await verifyEngineeringManual(bundle.incremental);

  assert.match(specification.productProtocolDigest, /^[a-f0-9]{64}$/u);
  assert.equal(planning.productProtocolDigest, specification.productProtocolDigest);
  assert.equal(incremental.productProtocolDigest, specification.productProtocolDigest);

  await fs.rm(path.join(
    bundle.planning,
    "shared",
    "product-protocol.sha256",
  ));
  await assert.rejects(
    () => verifyEngineeringManual(bundle.planning),
    /product protocol marker is unavailable/,
  );
});

test("engineering manual failures stop before planning output", async (t) => {
  const bundle = await copyBundle(t);
  const caller = bundle.incremental;
  await fs.writeFile(
    path.join(caller, "shared", "engineering-manual.sha256"),
    `${"0".repeat(64)}\n`,
  );
  await assert.rejects(
    () => verifyEngineeringManual(caller),
    /does not match/,
  );

  await fs.writeFile(
    path.join(caller, "shared", "engineering-manual.sha256"),
    "not-a-digest\n",
  );
  await assert.rejects(() => verifyEngineeringManual(caller), /marker is invalid/);

  await fs.rm(path.join(caller, "shared", "engineering-manual.sha256"));
  await assert.rejects(() => verifyEngineeringManual(caller), /marker is unavailable/);

  await fs.rm(caller, { recursive: true });
  await fs.cp(
    path.join(projectRoot, "skills", "incremental-implementation"),
    caller,
    { recursive: true },
  );
  await fs.rm(
    path.join(
      bundle.specification,
      "shared",
      "references",
      "engineering-principles.md",
    ),
  );
  let planProduced = false;
  await assert.rejects(async () => {
    await verifyEngineeringManual(bundle.planning);
    planProduced = true;
  }, /manual is unavailable/);
  assert.equal(planProduced, false);
});

test("engineering manual rejects symlinked content and network paths", async (t) => {
  const bundle = await copyBundle(t);
  const marker = path.join(
    bundle.planning,
    "shared",
    "engineering-manual.sha256",
  );
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
