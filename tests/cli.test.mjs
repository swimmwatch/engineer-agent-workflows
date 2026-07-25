import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { main as generateMain } from "../scripts/generate.mjs";
import { main as validateMain } from "../scripts/validate.mjs";
import { snapshotTree } from "../scripts/lib/files.mjs";
import {
  copyFoundationCatalog,
  makeTempTree,
} from "./lib/fixtures.mjs";

function capture() {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      stdout: {
        write(value) {
          stdout += value;
        },
      },
      stderr: {
        write(value) {
          stderr += value;
        },
      },
    },
    output() {
      return { stdout, stderr };
    },
  };
}

async function run(main, args, root) {
  const captured = capture();
  const status = await main(args, { root, ...captured.io });
  return { status, ...captured.output() };
}

test("foundation validation succeeds and strict validation fails closed", async (t) => {
  const root = await copyFoundationCatalog(t);
  const foundation = await run(validateMain, ["--allow-incomplete"], root);
  assert.equal(foundation.status, 0);
  assert.match(foundation.stdout, /0\/15 skills present/);
  assert.equal(foundation.stderr, "");

  const strict = await run(validateMain, [], root);
  assert.equal(strict.status, 1);
  assert.equal(strict.stdout, "");
  assert.match(strict.stderr, /^E_INCOMPLETE:/);
  assert.doesNotMatch(strict.stderr, new RegExp(root.replaceAll("\\", "\\\\")));
});

test("unknown, duplicate, and invalid option combinations use exit code 2", async (t) => {
  const root = await copyFoundationCatalog(t);
  for (const [main, args] of [
    [validateMain, ["--unknown"]],
    [validateMain, ["--allow-incomplete", "--allow-incomplete"]],
    [generateMain, ["--allow-incomplete"]],
    [generateMain, ["--check", "--check"]],
    [generateMain, ["positional"]],
  ]) {
    const result = await run(main, args, root);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /^E_USAGE:/);
  }
});

test("incomplete generation check is read-only", async (t) => {
  const root = await copyFoundationCatalog(t);
  const before = await snapshotTree(root);
  const result = await run(
    generateMain,
    ["--check", "--allow-incomplete"],
    root,
  );
  const after = await snapshotTree(root);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /15 skills pending/);
  assert.equal(result.stderr, "");
  assert.deepEqual(after, before);
});

test("premature packaging output fails without mutation", async (t) => {
  const root = await copyFoundationCatalog(t);
  await fs.mkdir(
    path.join(root, "plugins", "engineer-agent-workflows"),
    { recursive: true },
  );
  const before = await snapshotTree(root);
  const result = await run(
    generateMain,
    ["--check", "--allow-incomplete"],
    root,
  );
  const after = await snapshotTree(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^E_GENERATED_DIFF/);
  assert.deepEqual(after, before);
});

test("malformed input diagnostics do not echo sentinel content or paths", async (t) => {
  const sentinel = "PRIVATE_SENTINEL_DO_NOT_ECHO";
  const root = await makeTempTree(t, {
    "catalog/skills.json": `{${sentinel}`,
    "catalog/release.json": "{}",
  });
  const result = await run(validateMain, ["--allow-incomplete"], root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^E_INVALID_JSON catalog\/skills\.json:/);
  assert.doesNotMatch(result.stderr, new RegExp(sentinel));
  assert.doesNotMatch(result.stderr, new RegExp(root.replaceAll("\\", "\\\\")));
});
