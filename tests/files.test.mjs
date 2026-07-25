import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  sha256File,
  snapshotTree,
  validateRelativePath,
  walkFiles,
} from "../scripts/lib/files.mjs";
import { makeTempTree } from "./lib/fixtures.mjs";

test("relative paths reject absolute, traversal, aliases, and NUL", () => {
  for (const unsafe of [
    "/absolute",
    "C:/absolute",
    "../escape",
    "a/../escape",
    "a//b",
    "a\\b",
    "a/\0b",
    "./a",
  ]) {
    assert.throws(() => validateRelativePath(unsafe), /unsafe|normalized/);
  }
  assert.equal(validateRelativePath("a/b.json"), "a/b.json");
});

test("walkFiles returns deterministic POSIX ordering", async (t) => {
  const root = await makeTempTree(t, {
    "z.txt": "z",
    "a/b.txt": "b",
    "a/a.txt": "a",
  });
  assert.deepEqual(await walkFiles(root), ["a/a.txt", "a/b.txt", "z.txt"]);
  assert.deepEqual(await walkFiles(root), ["a/a.txt", "a/b.txt", "z.txt"]);
});

test("walkFiles rejects symbolic links without following them", async (t) => {
  const root = await makeTempTree(t, {
    "real.txt": "content",
  });
  try {
    await fs.symlink(path.join(root, "real.txt"), path.join(root, "link.txt"));
  } catch (error) {
    if (error?.code === "EPERM") {
      t.skip("symlink creation is not permitted");
      return;
    }
    throw error;
  }
  await assert.rejects(() => walkFiles(root), /symbolic links/);
});

test("walkFiles rejects a symlink root", async (t) => {
  const root = await makeTempTree(t, {
    "directory/file.txt": "content",
  });
  const link = `${root}-link`;
  t.after(async () => fs.rm(link, { recursive: true, force: true }));
  try {
    await fs.symlink(path.join(root, "directory"), link, "dir");
  } catch (error) {
    if (error?.code === "EPERM") {
      t.skip("symlink creation is not permitted");
      return;
    }
    throw error;
  }
  await assert.rejects(() => walkFiles(link), /real directory/);
});

test("walkFiles rejects case-colliding paths", async (t) => {
  const root = await makeTempTree(t, {
    "Case.txt": "one",
    "case.txt": "two",
  });
  await assert.rejects(() => walkFiles(root), /collide by case/);
});

test("hashes and snapshots are stable and copy-isolated", async (t) => {
  const root = await makeTempTree(t, {
    "a.txt": "abc",
    "nested/b.txt": "def",
  });
  assert.equal(
    await sha256File(path.join(root, "a.txt")),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
  const first = await snapshotTree(root);
  const second = await snapshotTree(root);
  assert.deepEqual(first, second);
  first["a.txt"].size = 999;
  assert.equal((await snapshotTree(root))["a.txt"].size, 3);
});
