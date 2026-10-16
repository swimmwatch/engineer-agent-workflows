import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, realpath, lstat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

const manifestPath = ".github/qualification/workflow-reliability-inputs.json";

export async function verifySnapshot(root) {
  const physicalRoot = await realpath(root);
  const manifest = JSON.parse(await readFile(path.join(physicalRoot, manifestPath), "utf8"));
  assert.equal(manifest.version, 1, "Unsupported qualification manifest version");
  assert.ok(Array.isArray(manifest.inputs) && manifest.inputs.length > 0, "Empty qualification inventory");
  const seen = new Set();
  for (const input of manifest.inputs) {
    assert.equal(typeof input.path, "string");
    assert.ok(input.path.length > 0 && !input.path.includes("\\") && !input.path.includes(":"));
    assert.ok(!path.posix.isAbsolute(input.path) && input.path === path.posix.normalize(input.path));
    assert.ok(!input.path.startsWith("../") && input.path !== ".." && !seen.has(input.path));
    assert.match(input.sha256, /^[a-f0-9]{64}$/u);
    seen.add(input.path);
    const file = path.join(physicalRoot, input.path);
    assert.ok((await lstat(file)).isFile(), `Not a regular input: ${input.path}`);
    assert.ok((await realpath(file)).startsWith(physicalRoot + path.sep), "Input escapes snapshot");
    const actual = createHash("sha256").update(await readFile(file)).digest("hex");
    assert.equal(actual, input.sha256, `Changed qualification input: ${input.path}`);
  }
  return [...seen].sort();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.cwd();
  const expected = [...await verifySnapshot(root), manifestPath].sort();
  const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean).sort();
  assert.deepEqual(tracked, expected, "Checkout includes unapproved tracked paths or omits approved paths");
  if (process.env.GITHUB_SHA) {
    assert.equal(execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(), process.env.GITHUB_SHA);
  }
  console.log(`Verified ${expected.length} qualification paths`);
}
