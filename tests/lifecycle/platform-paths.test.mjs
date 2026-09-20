import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  assertPathContained,
  assertProfileContained,
  createIsolatedProfile,
  environmentFor,
} from "./isolated-profile.mjs";
import {
  buildSkillsInvocation,
  runSkills,
  sanitizeLifecycleOutput,
  SKILLS_PACKAGE,
} from "./skills-command.mjs";

const PRIVATE_SENTINEL = "PRIVATE_LIFECYCLE_SENTINEL_7fbd";

test("isolated profile models Linux, macOS, and Windows state", async (t) => {
  for (const platform of ["linux", "darwin", "win32"]) {
    const profile = await createIsolatedProfile(t, { platform });
    const environment = environmentFor(profile, {
      ...process.env,
      NPM_TOKEN: PRIVATE_SENTINEL,
      GITHUB_TOKEN: PRIVATE_SENTINEL,
      ANTHROPIC_API_KEY: PRIVATE_SENTINEL,
      OPENAI_API_KEY: PRIVATE_SENTINEL,
      MCP_PRIVATE_STATE: PRIVATE_SENTINEL,
      HTTPS_PROXY: PRIVATE_SENTINEL,
      NODE_OPTIONS: `--require=${PRIVATE_SENTINEL}`,
    });

    for (const key of [
      "HOME",
      "USERPROFILE",
      "APPDATA",
      "LOCALAPPDATA",
      "XDG_CACHE_HOME",
      "XDG_CONFIG_HOME",
      "XDG_DATA_HOME",
      "XDG_STATE_HOME",
      "TMPDIR",
      "TMP",
      "TEMP",
      "npm_config_cache",
      "npm_config_userconfig",
      "npm_config_globalconfig",
      "npm_config_prefix",
      "GIT_CONFIG_GLOBAL",
    ]) {
      assertPathContained(profile, environment[key]);
    }
    assert.equal(environment.DISABLE_TELEMETRY, "1");
    assert.equal(environment.CI, "1");
    assert.equal(JSON.stringify(environment).includes(PRIVATE_SENTINEL), false);
    assert.equal("NPM_TOKEN" in environment, false);
    assert.equal("GITHUB_TOKEN" in environment, false);
    assert.equal("NODE_OPTIONS" in environment, false);

    const second = environmentFor(profile);
    environment.HOME = "caller mutation";
    assert.equal(second.HOME, profile.home);
  }
});

test("lifecycle invocation is pinned, global, explicit, and copy-isolated", () => {
  const addArgs = [
    "add",
    "file:///fixture",
    "--global",
    "--agent",
    "codex",
    "--skill",
    "*",
    "--copy",
    "--yes",
  ];
  const invocation = buildSkillsInvocation(addArgs, { platform: "linux" });
  assert.equal(invocation.executable, "npx");
  assert.deepEqual(invocation.args, ["--yes", SKILLS_PACKAGE, ...addArgs]);
  invocation.args[0] = "caller mutation";
  assert.deepEqual(buildSkillsInvocation(addArgs).args.slice(0, 2), [
    "--yes",
    SKILLS_PACKAGE,
  ]);
  assert.equal(
    buildSkillsInvocation(addArgs, { platform: "win32" }).executable,
    "npx.cmd",
  );

  assert.throws(
    () =>
      buildSkillsInvocation([
        "update",
        "code-review-and-quality",
        "--global",
        "--yes",
      ]),
    /unsupported lifecycle command/,
  );
  assert.throws(
    () =>
      buildSkillsInvocation([
        "add",
        "file:///fixture",
        "--global",
        "--agent",
        "codex",
        "--agent",
        "claude-code",
        "--skill",
        "*",
        "--copy",
        "--yes",
      ]),
    /one agent/,
  );
  assert.throws(
    () => buildSkillsInvocation(["list", "--project", "--agent", "codex"]),
    /must be global/,
  );
  assert.throws(
    () => buildSkillsInvocation(["init", "unsafe", "--global"]),
    /unsupported lifecycle command/,
  );
});

test("lifecycle output is bounded and temporary paths are redacted", async (t) => {
  const profile = await createIsolatedProfile(t);
  const environment = environmentFor(profile);
  const spawnOutput = (_executable, _args, options) =>
    spawn(
      process.execPath,
      ["-e", 'process.stdout.write("x".repeat(8192));'],
      options,
    );

  const result = await runSkills(
    [
      "add",
      "file:///fixture",
      "--global",
      "--agent",
      "codex",
      "--skill",
      "code-review-and-quality",
      "--copy",
      "--yes",
    ],
    {
      cwd: profile.project,
      env: environment,
      maxOutputBytes: 1024,
      redactRoot: profile.root,
      spawnImpl: spawnOutput,
    },
  );
  assert.equal(result.outputExceeded, true);
  assert.equal(Buffer.byteLength(result.stdout), 1024);
  assert.deepEqual(result.command.args.slice(0, 2), [
    "--yes",
    SKILLS_PACKAGE,
  ]);

  const decorated = `\u001b[31m${profile.root}\u001b[0m`;
  assert.equal(
    sanitizeLifecycleOutput(decorated, profile.root),
    "<TEMP>",
  );
});

test("timeout and cancellation terminate and reap the command", async (t) => {
  const profile = await createIsolatedProfile(t);
  const environment = environmentFor(profile);
  const spawnWaiting = (_executable, _args, options) =>
    spawn(
      process.execPath,
      [
        "-e",
        'process.on("SIGTERM", () => {}); setInterval(() => {}, 1000);',
      ],
      options,
    );
  const args = [
    "add",
    "file:///fixture",
    "--global",
    "--agent",
    "codex",
    "--skill",
    "code-review-and-quality",
    "--copy",
    "--yes",
  ];

  const timedOut = await runSkills(args, {
    cwd: profile.project,
    env: environment,
    timeoutMs: 30,
    redactRoot: profile.root,
    spawnImpl: spawnWaiting,
  });
  assert.equal(timedOut.timedOut, true);
  assert.notEqual(timedOut.signal, null);

  const controller = new AbortController();
  const pending = runSkills(args, {
    cwd: profile.project,
    env: environment,
    timeoutMs: 5_000,
    signal: controller.signal,
    redactRoot: profile.root,
    spawnImpl: spawnWaiting,
  });
  setTimeout(() => controller.abort(), 30);
  const cancelled = await pending;
  assert.equal(cancelled.cancelled, true);
  assert.notEqual(cancelled.signal, null);
});

test("profile traversal permits only contained links", async (t) => {
  const profile = await createIsolatedProfile(t);
  const target = path.join(profile.root, "contained-target");
  const link = path.join(profile.root, "contained-link");
  await fs.writeFile(target, "contained\n", "utf8");
  try {
    await fs.symlink(target, link);
  } catch (error) {
    if (error?.code === "EPERM") {
      t.skip("symbolic links are unavailable");
      return;
    }
    throw error;
  }
  await assertProfileContained(profile);

  const outside = `${profile.root}-outside`;
  t.after(async () => {
    await fs.rm(outside, { force: true });
  });
  await fs.writeFile(outside, "outside\n", "utf8");
  await fs.rm(link);
  await fs.symlink(outside, link);
  await assert.rejects(
    () => assertProfileContained(profile),
    /E_PROFILE_ESCAPE/,
  );
});
