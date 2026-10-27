import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { lstat, mkdtemp, mkdir, readFile, realpath, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import test from "node:test";
import ts from "typescript";
import { createNativeMcpSnapshot } from "../scripts/lib/specification-review-native-snapshot.mjs";

const execute = promisify(execFile);
const runtimeSource = new URL("../packages/engineer-agent-workflow-mcp/src/runtime-info.ts", import.meta.url);

async function verifySnapshot({ runtimeInfoModule }) {
  const program = "const {runtimeIdentity}=await import(" + JSON.stringify(pathToFileURL(runtimeInfoModule).href) + ");process.stdout.write(JSON.stringify(runtimeIdentity));";
  const result = await execute(process.execPath, ["--input-type=module", "-e", program], { timeout: 5000, maxBuffer: 16 * 1024 });
  return JSON.parse(result.stdout);
}

async function fixture(t, options = {}) {
  const root = await mkdtemp(join(tmpdir(), "eaw-mcp-snapshot-"));
  async function cleanup() { await rm(root, { recursive: true, force: true }); }
  t.after(cleanup);
  const sourcePackage = join(root, "source");
  const dist = join(sourcePackage, "dist");
  const dependencyRoot = join(root, "node_modules");
  const invocation = join(root, "invocation");
  for (const directory of [dist, dependencyRoot, invocation]) await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(join(sourcePackage, "package.json"), JSON.stringify({ name: "@engineer-agent-workflows/engineer-agent-workflow-mcp", version: "0.0.0-development", type: "module" }));
  await writeFile(join(dist, "main.js"), options.main ?? "export const fixtureOnly = true;\n");
  await writeFile(join(dist, "tool-contracts.json"), "[]\n");
  const source = await readFile(runtimeSource, "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  const runtimeInfoModule = join(dist, "runtime-info.js");
  await writeFile(runtimeInfoModule, compiled);
  const helpers = await import(pathToFileURL(runtimeInfoModule).href);
  const artifacts = helpers.runtimeArtifacts(dist);
  const stamp = { stamp_version: 1, package_version: "0.0.0-development", ...helpers.runtimeDigests(artifacts), artifacts };
  await writeFile(join(dist, "runtime-stamp.json"), JSON.stringify(stamp));
  await writeFile(runtimeInfoModule, helpers.replaceEmbeddedRuntimeStamp(compiled, stamp));
  const destination = join(invocation, "mcp");
  return { root, sourcePackage, dist, destination, dependencyRoot, stamp,
    options: { sourcePackage, destination, dependencyRoot, verify: verifySnapshot } };
}

async function frozenSnapshotSurvivesLaterSourceReplacement(t) {
  const f = await fixture(t);
  const snapshot = await createNativeMcpSnapshot(f.options);
  assert.equal(snapshot.identity.identity_status, "verified");
  assert.equal(snapshot.identity.build_id, f.stamp.build_id);
  const original = await readFile(snapshot.entrypoint, "utf8");
  await writeFile(join(f.dist, "main.js"), "export const changedLater = true;\n");
  assert.equal(await readFile(snapshot.entrypoint, "utf8"), original);
  assert.equal((await verifySnapshot(snapshot)).build_id, f.stamp.build_id);
  assert.equal((await stat(snapshot.packageRoot)).mode & 0o077, 0);
}
test("a verified private MCP snapshot keeps its exact build when shared source is rebuilt later", frozenSnapshotSurvivesLaterSourceReplacement);

async function mixedArtifactsCannotBecomeAUsableSnapshot(t) {
  const f = await fixture(t);
  await writeFile(join(f.dist, "main.js"), "export const mixed = true;\n");
  await assert.rejects(createNativeMcpSnapshot(f.options), { code: "MCP_SNAPSHOT_UNVERIFIED" });
  await assert.rejects(stat(f.destination), { code: "ENOENT" });
}
test("a mixed runtime stamp fails verification and removes its owned destination before model use", mixedArtifactsCannotBecomeAUsableSnapshot);

async function symlinkedSourceArtifactsCannotBeCopied(t) {
  const f = await fixture(t);
  const external = join(f.root, "external.js");
  await writeFile(external, "export const external = true;\n");
  await symlink(external, join(f.dist, "alias.js"));
  await assert.rejects(createNativeMcpSnapshot(f.options), { code: "MCP_SNAPSHOT_SOURCE_UNSAFE" });
  await assert.rejects(stat(f.destination), { code: "ENOENT" });
}
test("snapshot copying rejects symlinks instead of capturing external runtime artifacts", symlinkedSourceArtifactsCannotBeCopied);

async function changeDuringSnapshotCreationIsRejected(t) {
  const f = await fixture(t);
  async function verifyAndObserveConcurrentBuild(paths) {
    const identity = await verifySnapshot(paths);
    await writeFile(join(f.dist, "main.js"), "export const concurrent = true;\n");
    return identity;
  }
  await assert.rejects(createNativeMcpSnapshot({ ...f.options, verify: verifyAndObserveConcurrentBuild }), { code: "MCP_SNAPSHOT_SOURCE_CHANGED" });
  await assert.rejects(stat(f.destination), { code: "ENOENT" });
}
test("source changes during the snapshot operation are detected without a mixed accepted build", changeDuringSnapshotCreationIsRejected);

async function verificationCannotBeSkippedOrInvented(t) {
  const f = await fixture(t);
  await assert.rejects(createNativeMcpSnapshot({ ...f.options, verify: undefined }), { code: "MCP_SNAPSHOT_VERIFIER_REQUIRED" });
  await assert.rejects(stat(f.destination), { code: "ENOENT" });
  async function unavailable() { return { identity_status: "unavailable", build_id: null }; }
  await assert.rejects(createNativeMcpSnapshot({ ...f.options, verify: unavailable }), { code: "MCP_SNAPSHOT_UNVERIFIED" });
  await assert.rejects(stat(f.destination), { code: "ENOENT" });
}
test("explicit fresh-process verification is required and unavailable identity never means success", verificationCannotBeSkippedOrInvented);

async function preexistingDestinationIsNotModified(t) {
  const f = await fixture(t);
  await mkdir(f.destination);
  const marker = join(f.destination, "existing.txt");
  await writeFile(marker, "preserved");
  await assert.rejects(createNativeMcpSnapshot(f.options), { code: "MCP_SNAPSHOT_DESTINATION_EXISTS" });
  assert.equal(await readFile(marker, "utf8"), "preserved");
}
test("an existing destination is preserved rather than overwritten or cleaned as owned output", preexistingDestinationIsNotModified);

async function modifiedCopiedBytesCannotRetainPriorVerification(t) {
  const f = await fixture(t);
  async function verifyThenModify(paths) {
    const identity = await verifySnapshot(paths);
    await writeFile(paths.entrypoint, "export const changedCopy = true;\n");
    return identity;
  }
  await assert.rejects(createNativeMcpSnapshot({ ...f.options, verify: verifyThenModify }), { code: "MCP_SNAPSHOT_COPY_CHANGED" });
  await assert.rejects(stat(f.destination), { code: "ENOENT" });
}
test("copy changes during verification invalidate the snapshot and are cleaned before use", modifiedCopiedBytesCannotRetainPriorVerification);

async function cancellationClosesOnlyOwnedSnapshot(t) {
  const f = await fixture(t);
  async function cancelled() { throw Object.assign(new Error("CANCELLED"), { code: "CANCELLED" }); }
  await assert.rejects(createNativeMcpSnapshot({ ...f.options, verify: cancelled }), { code: "CANCELLED" });
  await assert.rejects(stat(f.destination), { code: "ENOENT" });
  assert.equal(await readFile(join(f.dist, "main.js"), "utf8"), "export const fixtureOnly = true;\n");
}
test("verifier cancellation remains cancellation and cleans only the private copy", cancellationClosesOnlyOwnedSnapshot);

async function dependencyResolutionUsesOnlyTheExistingDependencyLink(t) {
  const f = await fixture(t, { main: "import { value } from 'fixture-dependency'; export const observed = value;\n" });
  const dependency = join(f.dependencyRoot, "fixture-dependency");
  await mkdir(dependency);
  await writeFile(join(dependency, "package.json"), JSON.stringify({ name: "fixture-dependency", type: "module", exports: "./index.js" }));
  await writeFile(join(dependency, "index.js"), "export const value = 7;\n");
  const snapshot = await createNativeMcpSnapshot(f.options);
  const link = join(snapshot.packageRoot, "node_modules");
  assert.equal((await lstat(link)).isSymbolicLink(), true);
  assert.equal(await realpath(link), f.dependencyRoot);
  const program = "const {observed}=await import(" + JSON.stringify(pathToFileURL(snapshot.entrypoint).href) + ");process.stdout.write(String(observed));";
  const result = await execute(process.execPath, ["--input-type=module", "-e", program], { timeout: 5000, maxBuffer: 1024 });
  assert.equal(result.stdout, "7");
  await rm(snapshot.packageRoot, { recursive: true });
  assert.equal(await readFile(join(dependency, "index.js"), "utf8"), "export const value = 7;\n");
}
test("the frozen entrypoint resolves existing dependencies through a single owned symlink without copying or deleting them", dependencyResolutionUsesOnlyTheExistingDependencyLink);
