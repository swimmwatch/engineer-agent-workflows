import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const oracle = resolve("tests/fixtures/workflow-loop/technical-agreement-oracle.mjs");

function checkOracle(exact) {
  const app = mkdtempSync(join(tmpdir(), "tip-oracle-regression-"));
  try {
    writeFileSync(join(app, "cli.mjs"), `
import { readFileSync } from "node:fs";
const [command, file] = process.argv.slice(2);
if (command === "help") {
  process.stdout.write("record-report: validate <file> | summarize <file>\\n");
} else {
  try {
    const body = readFileSync(file, "utf8");
    const seen = new Set();
    const records = body.trim() === "" ? [] : body.trimEnd().split("\\n").map(line => {
      const match = /^([A-Za-z0-9_-]+),([0-9]+)$/.exec(line);
      if (!match || seen.has(match[1]) || !Number.isSafeInteger(Number(match[2]))) throw Error("INVALID_INPUT");
      seen.add(match[1]);
      return { id: match[1], amount: Number(match[2]) };
    });
    if (command === "validate") process.stdout.write(JSON.stringify(records));
    else {
      const total = records.reduce((sum, record) => sum + BigInt(record.amount), 0n);
      const token = ${exact ? "String(total)" : "String(Number(total))"};
      process.stdout.write('{"count":' + records.length + ',"total":' + token + '}');
    }
  } catch {
    process.stderr.write("INVALID_INPUT");
    process.exitCode = 2;
  }
}
`);
    return spawnSync(process.execPath, [oracle, "b1", app], { encoding: "utf8", timeout: 15000 });
  } finally {
    rmSync(app, { recursive: true, force: true });
  }
}

test("B1 oracle rejects rounded aggregate JSON tokens", () => {
  const result = checkOracle(false);
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /9007199254740993/);
});

test("B1 oracle accepts exact aggregate JSON integers", () => {
  const result = checkOracle(true);
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.ok(JSON.parse(result.stdout).checks.includes("exact-aggregate-integer"));
});
