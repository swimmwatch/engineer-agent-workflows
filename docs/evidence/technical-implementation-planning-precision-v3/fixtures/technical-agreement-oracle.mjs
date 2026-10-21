import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [fixture, application] = process.argv.slice(2);
assert.ok(["b1", "b2"].includes(fixture));
const cwd = resolve(application);
const temporary = mkdtempSync(join(tmpdir(), "tip-oracle-"));
const checks = [];
function run(args, env = {}) {
  const result = spawnSync(process.execPath, [join(cwd, "cli.mjs"), ...args], {
    cwd, encoding: "utf8", timeout: 5000,
    env: { PATH: process.env.PATH, LANG: "C.UTF-8", ...env },
  });
  assert.equal(result.error, undefined);
  return result;
}
function dataset(name, body) {
  const path = join(temporary, name);
  writeFileSync(path, body);
  return path;
}
function rejects(args, marker, env) {
  const result = run(args, env);
  assert.equal(result.status, 2);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, new RegExp(marker));
}
try {
  if (fixture === "b1") {
    const help = run(["help"]);
    assert.equal(help.status, 0);
    assert.equal(help.stdout, "record-report: validate <file> | summarize <file>\n");
    checks.push("help-compatibility");
    const good = dataset("valid.csv", "alpha,2\nbeta,5\n");
    const records = run(["validate", good]);
    assert.equal(records.status, 0);
    assert.deepEqual(JSON.parse(records.stdout), [{ id: "alpha", amount: 2 }, { id: "beta", amount: 5 }]);
    checks.push("validated-records");
    const total = run(["summarize", good]);
    assert.equal(total.status, 0);
    assert.deepEqual(JSON.parse(total.stdout), { count: 2, total: 7 });
    const boundary = run(["summarize", dataset("aggregate-boundary.csv", "alpha,9007199254740991\nbeta,2\n")]);
    assert.equal(boundary.status, 0);
    const aggregate = JSON.parse(boundary.stdout);
    assert.deepEqual(Object.keys(aggregate).sort(), ["count", "total"]);
    assert.equal(aggregate.count, 2);
    assert.equal(typeof aggregate.total, "number");
    // Compare the JSON numeric token directly: Number would conceal rounding.
    const totalToken = /"total"\s*:\s*(-?\d+)(?=\s*[,}])/.exec(boundary.stdout)?.[1];
    assert.equal(totalToken, "9007199254740993");
    checks.push("exact-aggregate-integer");
    for (const command of ["validate", "summarize"]) {
      const empty = run([command, dataset("empty.csv", "")]);
      assert.equal(empty.status, 0);
      assert.deepEqual(JSON.parse(empty.stdout), command === "validate" ? [] : { count: 0, total: 0 });
      for (const [index, body] of ["alpha,-1\n", "alpha,1.5\n", "alpha,1\nalpha,2\n", "alpha,1\nbad\n", ",1\n", "alpha,9007199254740992\n", "a b,2\n"].entries()) {
        rejects([command, dataset(`invalid-${index}.csv`, body)], "INVALID_INPUT");
      }
    }
    checks.push("shared-errors-and-empty-input");
  } else {
    const { parseTimeout } = await import(pathToFileURL(join(cwd, "configuration.mjs")));
    assert.equal(parseTimeout(undefined), 5000);
    for (const raw of ["1", "10", "11", "60", "005"]) {
      assert.doesNotThrow(() => parseTimeout(raw));
      assert.equal(parseTimeout(raw), Number(raw) * 1000);
    }
    checks.push("function-contract");
    for (const raw of ["1", "11", "60", "005"]) {
      const result = run([], { TIMEOUT_SECONDS: raw });
      assert.equal(result.status, 0);
      assert.deepEqual(JSON.parse(result.stdout), { timeoutMs: Number(raw) * 1000, format: "json" });
    }
    const result = run([]);
    assert.deepEqual(JSON.parse(result.stdout), { timeoutMs: 5000, format: "json" });
    checks.push("cli-compatibility");
    for (const raw of ["0", "61", "1.5", "+1", "-1", " 1", "1 ", "", "abc"]) {
      assert.throws(() => parseTimeout(raw), /INVALID_TIMEOUT/);
      rejects([], "INVALID_TIMEOUT", { TIMEOUT_SECONDS: raw });
    }
    checks.push("strict-rejection");
  }
  process.stdout.write(JSON.stringify({ fixture, status: "passed", checks }) + "\n");
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
