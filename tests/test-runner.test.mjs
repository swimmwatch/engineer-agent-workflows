import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { MAX_TEST_CONCURRENCY, parseTestRunnerArguments } from "../scripts/run-tests.mjs";

test("parallel test runner caps its default at eight available processes", () => {
  assert.equal(MAX_TEST_CONCURRENCY, 8);
  assert.deepEqual(parseTestRunnerArguments([], 24), { concurrency: 8, nodeArguments: [] });
  assert.deepEqual(parseTestRunnerArguments([], 4), { concurrency: 4, nodeArguments: [] });
});

test("parallel test runner accepts lower limits and rejects limits above eight", () => {
  assert.deepEqual(
    parseTestRunnerArguments(["--test-concurrency=4", "tests/governance.test.mjs"], 24),
    { concurrency: 4, nodeArguments: ["tests/governance.test.mjs"] },
  );
  assert.throws(
    () => parseTestRunnerArguments(["--test-concurrency=9"], 24),
    /between 1 and 8/u,
  );
  assert.throws(
    () => parseTestRunnerArguments(["--test-concurrency=invalid"], 24),
    /between 1 and 8/u,
  );
  assert.deepEqual(parseTestRunnerArguments(["--test_concurrency", "4", "tests/governance.test.mjs"], 24), { concurrency: 4, nodeArguments: ["tests/governance.test.mjs"] });
});

test("serial mode selects one process and preserves Node test arguments", () => {
  assert.deepEqual(
    parseTestRunnerArguments(["--serial", "--test-name-pattern=governance"], 24),
    { concurrency: 1, nodeArguments: ["--test-name-pattern=governance"] },
  );
  assert.throws(
    () => parseTestRunnerArguments(["--serial", "--test-concurrency=2"], 24),
    /cannot be combined/u,
  );
});

test("the positional delimiter preserves tail bytes and earlier concurrency bounds", () => {
  const tail = ["--", "--serial", "--conditions", "--test-concurrency=9", "--test_isolation=none", "custom.test.mjs"];
  assert.deepEqual(parseTestRunnerArguments(["--test-concurrency", "4", ...tail], 2), { concurrency: 2, nodeArguments: tail });
  assert.deepEqual(parseTestRunnerArguments(["--serial", ...tail], 2), { concurrency: 1, nodeArguments: tail });
});

test("default discovery executes canonical sentinels without executing retained proof artifacts", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "eaw-runner-discovery-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await Promise.all(["tests", "packages/sample/test", "artifacts/retained/tests", "effects"].map((relative) => mkdir(join(root, relative), { recursive: true })));
  const source = (name) => `import test from "node:test"; import { writeFile } from "node:fs/promises"; test(${JSON.stringify(name)}, async () => { await writeFile(${JSON.stringify(join(root, "effects", name))}, JSON.stringify({pid:process.pid,execPath:process.execPath,node:process.versions.node})); });\n`;
  await writeFile(join(root, "tests/root.test.mjs"), source("root-canonical"));
  await writeFile(join(root, "packages/sample/test/workspace.test.mjs"), source("workspace-canonical"));
  await writeFile(join(root, "artifacts/retained/tests/proof.test.mjs"), source("archived-proof"));
  const runner = fileURLToPath(new URL("../scripts/run-tests.mjs", import.meta.url));
  const execute = promisify(execFile);
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  await execute(process.execPath, [runner], { cwd: root, env, timeout: 10_000 });
  assert.deepEqual((await readdir(join(root, "effects"))).sort(), ["root-canonical", "workspace-canonical"], "default discovery must exclude archived effects while executing both canonical roots");
  const observations = await Promise.all(["root-canonical", "workspace-canonical"].map(async (name) => JSON.parse(await readFile(join(root, "effects", name), "utf8"))));
  assert.equal(new Set(observations.map((record) => record.pid)).size, 2, "each canonical test file must execute in a separate actual process");
  for (const observation of observations) {
    assert.notEqual(observation.pid, process.pid);
    assert.equal(observation.execPath, process.execPath);
    assert.equal(observation.node, process.versions.node);
  }
  await rm(join(root, "effects"), { recursive: true });
  await mkdir(join(root, "effects"));
  await execute(process.execPath, [runner, "--serial", "artifacts/retained/tests/proof.test.mjs"], { cwd: root, env, timeout: 10_000 });
  assert.deepEqual(await readdir(join(root, "effects")), ["archived-proof"], "an explicit selector remains authorized even outside default roots");
  await rm(join(root, "effects"), { recursive: true });
  await mkdir(join(root, "effects"));
  await execute(process.execPath, [runner, "--test-name-pattern", "workspace-canonical"], { cwd: root, env, timeout: 10_000 });
  assert.deepEqual(await readdir(join(root, "effects")), ["workspace-canonical"], "a name filter without a selector still uses canonical default roots");
});

test("forwarded Node option values never authorize retained test execution", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "eaw-runner-options-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await Promise.all(["tests", "packages/sample/test", "artifacts/retained/tests", "effects"].map((relative) => mkdir(join(root, relative), { recursive: true })));
  const source = (name) => `import test from "node:test"; import { writeFile } from "node:fs/promises"; test(${JSON.stringify(name)}, async () => { await writeFile(${JSON.stringify(join(root, "effects", name))}, JSON.stringify({pid:process.pid,execPath:process.execPath,node:process.versions.node,execArgv:process.execArgv})); });\n`;
  await writeFile(join(root, "tests/root.test.mjs"), source("root"));
  await writeFile(join(root, "packages/sample/test/workspace.test.mjs"), source("workspace"));
  await writeFile(join(root, "artifacts/retained/tests/proof.test.mjs"), source("archive"));
  const runner = fileURLToPath(new URL("../scripts/run-tests.mjs", import.meta.url));
  const execute = promisify(execFile);
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const cases = [
    ["conditions split", ["--conditions", "review-proof"]],
    ["conditions alias", ["-C", "review-proof"]],
    ["conditions inline", ["--conditions=review-proof"]],
    ["string option", ["--title", "runner-proof"]],
    ["enum option", ["--unhandled-rejections", "strict"]],
    ["integer option", ["--max-http-header-size", "16384"]],
    ["inspector address option", ["--inspect-port", "127.0.0.1:0"]],
    ["V8 inline value", ["--stack-size=984"]],
    ["V8 inline underscore spelling", ["--stack_size=984"]],
    ["Node underscore spelling", ["--max_http_header_size", "16384"]],
    ["boolean option", ["--trace-warnings"]],
  ];
  for (const [name, args] of cases) await t.test(name, async () => {
    await rm(join(root, "effects"), { recursive: true });
    await mkdir(join(root, "effects"));
    await execute(process.execPath, [runner, ...args], { cwd: root, env, timeout: 10_000 });
    assert.deepEqual((await readdir(join(root, "effects"))).sort(), ["root", "workspace"], `${name}: option values must not select retained tests`);
    const observations = await Promise.all(["root", "workspace"].map(async (entry) => JSON.parse(await readFile(join(root, "effects", entry), "utf8"))));
    assert.equal(new Set(observations.map((record) => record.pid)).size, 2);
    for (const observation of observations) {
      assert.equal(observation.execPath, process.execPath);
      assert.equal(observation.node, process.versions.node);
      for (const argument of args) assert.ok(observation.execArgv.includes(argument), `forwarded argument must retain its exact spelling: ${argument}`);
    }
  });
  await t.test("split option and genuine explicit archive selector", async () => {
    await rm(join(root, "effects"), { recursive: true });
    await mkdir(join(root, "effects"));
    await execute(process.execPath, [runner, "--conditions", "review-proof", "artifacts/retained/tests/proof.test.mjs"], { cwd: root, env, timeout: 10_000 });
    assert.deepEqual(await readdir(join(root, "effects")), ["archive"]);
  });
  await t.test("boolean option and genuine explicit archive selector", async () => {
    await rm(join(root, "effects"), { recursive: true });
    await mkdir(join(root, "effects"));
    await execute(process.execPath, [runner, "--trace-warnings", "artifacts/retained/tests/proof.test.mjs"], { cwd: root, env, timeout: 10_000 });
    assert.deepEqual(await readdir(join(root, "effects")), ["archive"]);
  });
  await t.test("native underscore aliases retain managed concurrency and isolation guards", async () => {
    await rm(join(root, "effects"), { recursive: true });
    await mkdir(join(root, "effects"));
    for (const args of [["--test_concurrency=9"], ["--test_concurrency", "9"], ["--test_isolation=none"], ["--experimental_test_isolation=none"]]) {
      await assert.rejects(execute(process.execPath, [runner, ...args], { cwd: root, env, timeout: 10_000 }), (error) => error.code === 2 && /Test concurrency|Test isolation/u.test(error.stderr), `managed aliases must reject invalid overrides: ${args.join(" ")}`);
      assert.deepEqual(await readdir(join(root, "effects")), []);
    }
  });
  await t.test("invalid values keep native Node diagnostics without effects", async () => {
    await rm(join(root, "effects"), { recursive: true });
    await mkdir(join(root, "effects"));
    const observe = async (args) => {
      try { const result = await execute(process.execPath, args, { cwd: root, env, timeout: 10_000 }); return { code: 0, stderr: result.stderr }; }
      catch (error) { return { code: error.code, stderr: error.stderr }; }
    };
    for (const args of [["--conditions"], ["-C"], ["--title"], ["--stack-size", "984"]]) {
      const native = await observe(["--test", ...args]);
      assert.notEqual(native.code, 0, `the direct native control must reject ${args.join(" ")}`);
      assert.deepEqual(await observe([runner, ...args]), native, `the wrapper must preserve native diagnostics for ${args.join(" ")}`);
      assert.deepEqual(await readdir(join(root, "effects")), []);
    }
  });
});

test("positional selection after the delimiter matches native Node execution", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "eaw-runner-delimiter-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await Promise.all(["tests", "packages/sample/test", "artifacts/retained/tests", "effects"].map((relative) => mkdir(join(root, relative), { recursive: true })));
  const source = (name) => `import test from "node:test"; import { writeFile } from "node:fs/promises"; test(${JSON.stringify(name)}, async () => { await writeFile(${JSON.stringify(join(root, "effects", name))}, JSON.stringify({pid:process.pid,execPath:process.execPath,node:process.versions.node})); });\n`;
  for (const [path, name] of [["tests/root.test.mjs", "root"], ["packages/sample/test/workspace.test.mjs", "workspace"], ["artifacts/retained/tests/proof.test.mjs", "archive"], ["custom.test.mjs", "custom"]]) await writeFile(join(root, path), source(name));
  const runner = fileURLToPath(new URL("../scripts/run-tests.mjs", import.meta.url));
  const execute = promisify(execFile);
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const observe = async (args) => {
    await rm(join(root, "effects"), { recursive: true });
    await mkdir(join(root, "effects"));
    let code = 0;
    try { await execute(process.execPath, args, { cwd: root, env, timeout: 10_000 }); }
    catch (error) {
      if (!Number.isInteger(error.code)) throw error;
      code = error.code;
    }
    const effects = (await readdir(join(root, "effects"))).sort();
    const observations = await Promise.all(effects.map(async (name) => JSON.parse(await readFile(join(root, "effects", name), "utf8"))));
    for (const observation of observations) {
      assert.equal(observation.execPath, process.execPath);
      assert.equal(observation.node, process.versions.node);
    }
    return { code, effects, observations };
  };
  for (const [name, args] of [
    ["plain selector", ["--", "custom.test.mjs"]],
    ["native option-looking operand", ["--", "--conditions", "custom.test.mjs"]],
    ["managed-looking operand", ["--", "--test-concurrency=9", "custom.test.mjs"]],
    ["underscore managed-looking operand", ["--", "--test_concurrency=9", "custom.test.mjs"]],
  ]) await t.test(name, async () => {
    const native = await observe(["--test", ...args]);
    assert.equal(native.code, 0, "the direct native control must succeed before wrapper comparison");
    assert.deepEqual(native.effects, ["custom"], "the direct native control must execute only the selected sentinel");
    const wrapped = await observe([runner, ...args]);
    t.diagnostic(JSON.stringify({ node: process.versions.node, args, native, wrapped }));
    assert.deepEqual({ code: wrapped.code, effects: wrapped.effects }, { code: native.code, effects: native.effects }, `${name}: post-delimiter selection must match the observed native effects and exit`);
  });
  await t.test("trailing delimiter keeps canonical default discovery", async () => {
    const wrapped = await observe([runner, "--"]);
    assert.equal(wrapped.code, 0);
    assert.deepEqual(wrapped.effects, ["root", "workspace"]);
    assert.equal(new Set(wrapped.observations.map((record) => record.pid)).size, 2);
  });
});
