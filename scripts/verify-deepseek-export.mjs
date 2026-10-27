#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readCatalog } from "./lib/catalog.mjs";

// The caller supplies the actual upstream provider, built in an isolated runtime.
// This verifier never installs packages, configures Harness, or invokes a model.
const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const providerModule = process.argv[2];
if (process.argv.length !== 3 || !path.isAbsolute(providerModule ?? "")) {
  throw new Error("usage: verify-deepseek-export.mjs <absolute-provider-module-path>");
}
const { FileSystemSkillProvider } = await import(pathToFileURL(providerModule).href);
assert.equal(typeof FileSystemSkillProvider, "function", "upstream filesystem provider is required");
const isolatedRoot = await fs.mkdtemp(path.join(os.tmpdir(), "eaw-deepseek-provider-"));
const warnings = [];
const lifecycle = new AbortController();
const provider = new FileSystemSkillProvider(
  { get: () => undefined, logger: { warn: message => warnings.push(message) } },
  { invalidate() {}, signal: lifecycle.signal },
  {
    includeDefaultRoots: false,
    customSkillDirs: [path.join(repository, "exports/deepseek-harness/skills")],
    dshHome: path.join(isolatedRoot, "dsh"),
    agentsHome: path.join(isolatedRoot, "agents"),
    watch: false,
  },
);
try {
  const observation = await provider.list({ cwd: isolatedRoot });
  const candidates = Array.isArray(observation) ? observation : observation.candidates;
  if (!Array.isArray(observation)) assert.equal(observation.complete, true);
  const catalog = await readCatalog(repository);
  assert.deepEqual(candidates.map(candidate => candidate.name).sort(), catalog.skills.map(skill => skill.name).sort());
  for (const candidate of candidates) {
    assert.deepEqual(candidate.invocation, { modelInvocable: false, userInvocable: true });
    const loaded = await provider.get(candidate, { cwd: isolatedRoot });
    assert.ok(loaded, `Missing loaded skill: ${candidate.name}`);
    assert.deepEqual(loaded.invocation, candidate.invocation);
    assert.equal(loaded.resourceBase.kind, "directory");
    const original = await fs.readFile(path.join(loaded.resourceBase.path, "SKILL.md"), "utf8");
    assert.equal(loaded.content, original.slice(original.indexOf("\n---\n", 4) + 5).trim());
    assert.doesNotMatch(loaded.content, /\{\{HOST_/);
  }
  assert.deepEqual(warnings, [], "upstream provider must not skip malformed skills");
  console.log(`DeepSeek filesystem provider passed: ${candidates.length} discovered and loaded; all user-invocable and model-invocation disabled; no model calls`);
} finally {
  lifecycle.abort();
  await provider.dispose();
  await fs.rm(isolatedRoot, { recursive: true, force: true });
}
