import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { buildDevSnapshot } from "../scripts/build-dev.mjs";
import { readCatalog } from "../scripts/lib/catalog.mjs";
import { copyReleaseSource, projectRoot } from "./lib/fixtures.mjs";

const execFile = promisify(execFileCallback);

async function makeDevelopmentSource(t) {
  const root = await copyReleaseSource(t);
  const packageRoot = path.join(root, "packages", "engineer-agent-workflow-mcp");
  await mkdir(packageRoot, { recursive: true });
  await writeFile(
    path.join(packageRoot, "package.json"),
    JSON.stringify({ name: "@engineer-agent-workflows/engineer-agent-workflow-mcp" }),
  );
  await execFile("git", ["init", "--quiet"], { cwd: root });
  await execFile("git", ["add", "--all"], { cwd: root });
  return root;
}

function fakeRunner() {
  return async (command, args, options) => {
    if (args.join(" ") === "--version") {
      return { stdout: "11.19.0\n", stderr: "" };
    }
    if (args.at(0) === "pack") {
      const destination = args.at(-1);
      assert.equal(command, process.platform === "win32" ? "npm.cmd" : "npm");
      assert.equal(typeof destination, "string");
      await mkdir(destination, { recursive: true });
      const filename = "engineer-agent-workflow-mcp-test.tgz";
      await writeFile(path.join(destination, filename), "test archive\n");
      return { stdout: JSON.stringify([{ filename }]), stderr: "" };
    }
    assert.deepEqual(args.slice(0, 2), ["run", args[1]]);
    assert.equal(options.cwd.endsWith("engineer-agent-workflows-"), false);
    return { stdout: "", stderr: "" };
  };
}

test("dev snapshot is isolated, content-addressed, and contains only permitted artifacts", async (t) => {
  const root = await makeDevelopmentSource(t);
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "engineer-agent-workflows-dev-"));
  t.after(() => rm(outputRoot, { recursive: true, force: true }));

  const first = await buildDevSnapshot({ root, outputRoot, runCommand: fakeRunner() });
  const manifest = JSON.parse(await readFile(path.join(first.directory, "manifest.json"), "utf8"));
  const catalog = await readCatalog(root);
  assert.equal(manifest.schema_version, 1);
  assert.equal(manifest.build_id, first.buildId);
  assert.deepEqual(manifest.skill_names, catalog.skills.map(skill => skill.name));
  assert.equal(first.reused, false);
  assert.equal(
    await readFile(path.join(first.directory, "plugin", ".codex-plugin", "plugin.json"), "utf8"),
    await readFile(
      path.join(projectRoot, "plugins", "codex", "engineer-agent-workflows", ".codex-plugin", "plugin.json"),
      "utf8",
    ),
  );
  assert.deepEqual((await readdir(first.directory)).sort(), ["manifest.json", "mcp", "plugin"]);
  assert.deepEqual(await readdir(path.join(first.directory, "mcp")), ["engineer-agent-workflow-mcp-test.tgz"]);
  await assert.rejects(readFile(path.join(first.directory, "plugin", "decisions.yaml")));

  const repeated = await buildDevSnapshot({ root, outputRoot, runCommand: fakeRunner() });
  assert.equal(repeated.reused, true);
  assert.equal(repeated.directory, first.directory);

  await writeFile(path.join(root, "uncommitted-change.txt"), "local development input\n");
  const changed = await buildDevSnapshot({ root, outputRoot, runCommand: fakeRunner() });
  assert.equal(changed.reused, false);
  assert.notEqual(changed.buildId, first.buildId);

  await writeFile(path.join(root, "removed-local-file.txt"), "tracked then removed\n");
  await execFile("git", ["add", "removed-local-file.txt"], { cwd: root });
  await rm(path.join(root, "removed-local-file.txt"));
  const deletion = await buildDevSnapshot({ root, outputRoot, runCommand: fakeRunner() });
  assert.notEqual(deletion.buildId, changed.buildId);
  assert.equal(deletion.manifest.deleted_source_file_count, 1);
});

test("a failed dev build never creates or replaces a snapshot", async (t) => {
  const root = await makeDevelopmentSource(t);
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "engineer-agent-workflows-dev-"));
  t.after(() => rm(outputRoot, { recursive: true, force: true }));

  await assert.rejects(
    buildDevSnapshot({
      root,
      outputRoot,
      runCommand: async (_command, args) => {
        if (args.at(0) === "pack") {
          throw new Error("pack failed");
        }
        return { stdout: args.join(" ") === "--version" ? "11.19.0\n" : "", stderr: "" };
      },
    }),
    /pack failed/,
  );
  assert.deepEqual(await readdir(outputRoot), []);
});

test("concurrent identical dev builds reuse the snapshot published by the other builder", async (t) => {
  const root = await makeDevelopmentSource(t);
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "engineer-agent-workflows-dev-"));
  t.after(() => rm(outputRoot, { recursive: true, force: true }));

  const baseRunner = fakeRunner();
  let versionCalls = 0;
  let releaseVersions;
  const bothBuildersReachedVersion = new Promise((resolve) => { releaseVersions = resolve; });
  const synchronizedRunner = async (command, args, options) => {
    if (args.join(" ") === "--version") {
      versionCalls += 1;
      if (versionCalls === 2) releaseVersions();
      await bothBuildersReachedVersion;
    }
    return baseRunner(command, args, options);
  };

  const [first, second] = await Promise.all([
    buildDevSnapshot({ root, outputRoot, runCommand: synchronizedRunner }),
    buildDevSnapshot({ root, outputRoot, runCommand: synchronizedRunner }),
  ]);

  assert.equal(first.directory, second.directory);
  assert.equal(first.buildId, second.buildId);
  assert.equal(first.reused || second.reused, true);
  assert.equal((await readdir(outputRoot)).length, 1);
});

test("development-facing plugin metadata does not hard-code the skill count", async () => {
  const manifestSource = await readFile(path.join(projectRoot, "scripts", "lib", "manifests.mjs"), "utf8");
  const codexManifest = await readFile(
    path.join(projectRoot, "plugins", "codex", "engineer-agent-workflows", ".codex-plugin", "plugin.json"),
    "utf8",
  );
  const readme = await readFile(path.join(projectRoot, "README.md"), "utf8");
  assert.doesNotMatch(manifestSource, /Fifteen reusable/);
  assert.doesNotMatch(codexManifest, /Fifteen reusable/);
  assert.match(readme, /local dev/i);
});
