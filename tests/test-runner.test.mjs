import assert from "node:assert/strict";
import test from "node:test";

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
