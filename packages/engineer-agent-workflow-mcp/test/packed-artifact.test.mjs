import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { fileURLToPath, URL } from "node:url";
import { promisify, TextDecoder } from "node:util";
import {
  mkdtemp,
  copyFile,
  mkdir,
  readdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { gunzipSync } from "fflate";
import { createQualificationScope, runProductWorkflowQualification } from "./support/product-e2e-harness.mjs";
import { packArtifact } from "./support/npm-pack.mjs";
import { createQualificationDiagnostics } from "./support/qualification-diagnostics.mjs";

const executeFile = promisify(execFile);
const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const artifactsRoot = path.join(packageRoot, "artifacts");
const expectedInventory = [
  "LICENSE",
  "README.md",
  "dist/api.d.ts",
  "dist/api.js",
  "dist/catalog.d.ts",
  "dist/catalog.js",
  "dist/checks.d.ts",
  "dist/checks.js",
  "dist/decisions.d.ts",
  "dist/decisions.js",
  "dist/design.d.ts",
  "dist/design.js",
  "dist/diagnostics.d.ts",
  "dist/diagnostics.js",
  "dist/experience.d.ts",
  "dist/experience.js",
  "dist/ledger.d.ts",
  "dist/ledger.js",
  "dist/main.d.ts",
  "dist/main.js",
  "dist/metadata.d.ts",
  "dist/metadata.js",
  "dist/penpot.d.ts",
  "dist/penpot.js",
  "dist/product/bindings.d.ts",
  "dist/product/bindings.js",
  "dist/product/config.d.ts",
  "dist/product/config.js",
  "dist/product/context.d.ts",
  "dist/product/context.js",
    "dist/product/definition.d.ts",
    "dist/product/definition.js",
    "dist/product/documents.d.ts",
    "dist/product/documents.js",
    "dist/product/interview.d.ts",
  "dist/product/interview.js",
  "dist/product/operations.d.ts",
  "dist/product/operations.js",
  "dist/product/review-blocks.d.ts",
  "dist/product/review-blocks.js",
  "dist/product/review.d.ts",
  "dist/product/review.js",
  "dist/product/roadmap.d.ts",
  "dist/product/roadmap.js",
  "dist/product/schemas.d.ts",
  "dist/product/schemas.js",
  "dist/product/sessions.d.ts",
  "dist/product/sessions.js",
  "dist/product/storage.d.ts",
  "dist/product/storage.js",
  "dist/product/tasks.d.ts",
  "dist/product/tasks.js",
  "dist/product/technical.d.ts",
  "dist/product/technical.js",
  "dist/product/tools.d.ts",
  "dist/product/tools.js",
  "dist/requirements.d.ts",
  "dist/requirements.js",
  "dist/review-followup.d.ts",
  "dist/review-followup.js",
  "dist/review-model.d.ts",
  "dist/review-model.js",
  "dist/review-snapshots.d.ts",
  "dist/review-snapshots.js",
  "dist/reviews.d.ts",
  "dist/reviews.js",
  "dist/runtime-info.d.ts",
  "dist/runtime-info.js",
  "dist/runtime-stamp.json",
  "dist/schemas/catalog.schema.json",
  "dist/schemas/decisions.schema.json",
  "dist/schemas/experience.schema.json",
  "dist/schemas/manifest.schema.json",
  "dist/schemas/product.schema.json",
  "dist/scope.d.ts",
  "dist/scope.js",
  "dist/server.d.ts",
  "dist/server.js",
  "dist/service.d.ts",
  "dist/service.js",
  "dist/source.d.ts",
  "dist/source.js",
  "dist/state.d.ts",
  "dist/state.js",
  "dist/tool-contracts.json",
  "package.json",
];

async function packagedFiles(directory, relative = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryRelative = path.posix.join(relative, entry.name);
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await packagedFiles(entryPath, entryRelative));
    else if (entry.isFile()) files.push(entryRelative);
  }
  return files;
}

function assertPackInventory(inventory) {
  assert.deepEqual(
    [...inventory].sort(),
    expectedInventory,
    "the packed artifact must contain only declared runtime files",
  );
}

const decoder = new TextDecoder();

function tarText(bytes, offset, length) {
  const field = bytes.subarray(offset, offset + length);
  const terminator = field.indexOf(0);
  return decoder.decode(terminator === -1 ? field : field.subarray(0, terminator));
}

function tarSize(bytes, offset, length) {
  const text = tarText(bytes, offset, length).trim();
  const size = text === "" ? 0 : Number.parseInt(text, 8);
  assert.ok(Number.isSafeInteger(size) && size >= 0, "tar entry size must be a non-negative octal integer");
  return size;
}

function packagePath(bytes) {
  const name = tarText(bytes, 0, 100);
  const prefix = tarText(bytes, 345, 155);
  const archived = prefix ? `${prefix}/${name}` : name;
  assert.ok(archived.startsWith("package/"), "tar entry must remain within package/");
  const relative = archived.slice("package/".length);
  assert.ok(relative.length > 0, "tar entry must name a package file or directory");
  assert.ok(
    relative.split("/").every((part) => part && part !== "." && part !== ".." && !/[\\\\:\0]/u.test(part)),
    "tar entry path must be a safe relative path",
  );
  return relative;
}

async function unpackPackageArchive(archive, destination) {
  const contents = gunzipSync(await readFile(archive));
  let offset = 0;
  while (offset + 512 <= contents.length) {
    const header = contents.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) return;
    const relative = packagePath(header);
    const size = tarSize(header, 124, 12);
    const bodyOffset = offset + 512;
    const bodyEnd = bodyOffset + size;
    assert.ok(bodyEnd <= contents.length, "tar entry must fit within the archive");
    const target = path.resolve(destination, ...relative.split("/"));
    const root = path.resolve(destination);
    assert.ok(target.startsWith(`${root}${path.sep}`), "tar entry must stay within the extraction directory");
    const type = header[156];
    if (type === 0 || type === "0".charCodeAt(0)) {
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, contents.subarray(bodyOffset, bodyEnd), { flag: "wx" });
    } else if (type === "5".charCodeAt(0)) {
      assert.equal(size, 0, "tar directory entry must not include data");
      await mkdir(target, { recursive: true });
    } else {
      assert.fail(`unsupported tar entry type: ${String.fromCharCode(type)}`);
    }
    offset = bodyOffset + Math.ceil(size / 512) * 512;
  }
  assert.fail("tar archive is missing its terminating empty block");
}

async function writeFixtureProject(workspace) {
  const project = path.join(workspace, "fixture-project");
  const ledgerDirectory = path.join(project, "docs", "specs", "packed-example");
  await mkdir(ledgerDirectory, { recursive: true });
  await writeFile(
    path.join(ledgerDirectory, "decisions.yaml"),
    `schema_version: 1
spec_slug: packed-example
decisions:
  - id: packed.artifact
    revision: 1
    category: package
    state: answered
    provenance: test
    evidence: [packed-artifact.test.mjs]
    question: null
    answer:
      text: Packed artifact serves MCP calls.
      selected_ids: [packed]
    supersedes_revision: null
    requirement_ids: [PKG-001]
`,
  );
  return project;
}

async function connectPackedClient(t, entrypoint, diagnostics) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [entrypoint],
    stderr: "pipe",
  });
  const client = new Client({ name: "packed-artifact-test", version: "0.0.0" });
  t.after(async () => diagnostics
    ? diagnostics.phase("smoke-teardown", () => client.close())
    : client.close());
  await client.connect(transport);
  return client;
}

test("I11-N1: Windows npm selection executes bundled JavaScript with literal arguments on this host", async (t) => {
  await mkdir(artifactsRoot, { recursive: true });
  const workspace = await realpath(await mkdtemp(path.join(artifactsRoot, "npm invocation & data-")));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const executable = path.join(workspace, process.platform === "win32" ? "node.exe" : "node");
  await copyFile(process.execPath, executable);
  const npmDirectory = path.join(workspace, "node_modules", "npm", "bin");
  await mkdir(npmDirectory, { recursive: true });
  await writeFile(path.join(npmDirectory, "npm-cli.js"),
    "process.stdout.write(JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd() }));\n");
  await writeFile(path.join(workspace, "npm.cmd"), "@echo off\r\nexit /b 91\r\n");
  const destination = path.join(workspace, "pack %PATH% & $HOME data");
  const worker = `
    import "node:child_process";
    const [executable, module, workspace, destination] = process.argv.slice(1);
    Object.defineProperty(process, "platform", { value: "win32" });
    process.execPath = executable;
    const { packArtifact } = await import(module);
    const result = await packArtifact(workspace, destination);
    process.stdout.write(result.stdout);
  `;
  const result = await executeFile(process.execPath, ["--input-type=module", "--eval", worker,
    executable, new URL("./support/npm-pack.mjs", import.meta.url).href, workspace, destination], {
    env: { ...process.env, PATH: workspace + path.delimiter + process.env.PATH },
  });
  assert.deepEqual(JSON.parse(result.stdout), {
    args: ["pack", "--json", "--ignore-scripts", "--pack-destination", destination],
    cwd: workspace,
  });
  assert.equal(result.stderr, "");
});

function processIsAlive(pid) {
  try { process.kill(pid, 0); return true; }
  catch (error) { if (error.code === "ESRCH") return false; throw error; }
}

async function readChildPid(pidPath) {
  try { return Number(await readFile(pidPath, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return undefined; throw error; }
}

if (process.env.EAW_PACKED_HANDSHAKE_PROBE === "1") {
  test("I11-N2: controlled handshake timeout", { timeout: 20_000 }, async (t) => {
    t.after(() => writeFile(process.env.EAW_PACKED_HOOK_FILE, "ran"));
    const connecting = connectPackedClient(t, process.env.EAW_PACKED_SILENT_ENTRYPOINT);
    connecting.catch(() => {});
    let pid;
    for (let attempt = 0; attempt < 1_000 && !pid; attempt += 1) {
      pid = await readChildPid(process.env.EAW_PACKED_PID_FILE);
      if (!pid) await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.ok(pid, "the silent child must complete startup before measuring handshake timeout");
    assert.equal(processIsAlive(pid), true, "the child must be alive before the timed handshake wait");
    await t.test("pending handshake", { timeout: 150 }, async (waiting) => {
      const diagnostics = createQualificationDiagnostics(waiting);
      diagnostics.observe({ event: "start", actor: "packed-smoke", tool: "connect" });
      await diagnostics.phase("smoke-connect", () => connecting);
    });
  });
}

test("I11-N2: packed handshake timeout reaps its child and lets the runner exit", { timeout: 30_000 }, async (t) => {
  await mkdir(artifactsRoot, { recursive: true });
  const workspace = await mkdtemp(path.join(artifactsRoot, "silent-handshake-"));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const pidPath = path.join(workspace, "child.pid");
  const hookPath = path.join(workspace, "hook.ran");
  const entrypoint = path.join(workspace, "silent.mjs");
  await writeFile(entrypoint, `import { writeFileSync } from "node:fs";
writeFileSync(${JSON.stringify(pidPath)}, String(process.pid));
process.stdin.resume();
`);
  let pid;
  try {
    const env = { ...process.env, EAW_PACKED_HANDSHAKE_PROBE: "1",
      EAW_PACKED_HOOK_FILE: hookPath, EAW_PACKED_SILENT_ENTRYPOINT: entrypoint, EAW_PACKED_PID_FILE: pidPath };
    delete env.NODE_TEST_CONTEXT;
    const result = await executeFile(process.execPath, ["--test", "--test-reporter=tap",
      "--test-name-pattern=I11-N2: controlled handshake timeout", fileURLToPath(import.meta.url)],
    { env, timeout: 15_000 }).catch((error) => error);
    pid = Number(await readFile(pidPath, "utf8"));
    assert.equal(result.killed, false, "helper cleanup must let the timed-out runner exit before the watchdog");
    assert.equal(result.code, 1, "the controlled handshake must still report its timeout failure");
    assert.match(result.stdout, /testTimeoutFailure/);
    assert.match(result.stdout, /test timed out after 150ms/);
    const snapshots = result.stdout.split("\n")
      .map((line) => line.match(/\{"qualification":.*\}$/u)?.[0])
      .filter(Boolean).map((line) => JSON.parse(line));
    const aborted = snapshots.find((snapshot) => snapshot.event === "aborted");
    assert.equal(aborted?.phase, "smoke-connect", "real timeout must identify the stalled handshake phase");
    assert.equal(aborted.pending[0].tool, "connect");
    assert.equal(aborted.completed, 0);
    assert.ok(Number.isFinite(aborted.pending[0].elapsedMs));
    assert.doesNotMatch(result.stdout + result.stderr, /UnhandledPromiseRejection|unhandledRejection/);
    assert.equal(await readFile(hookPath, "utf8"), "ran", "timeout teardown must execute");
    assert.equal(processIsAlive(pid), false, "the actual helper must reap its pending handshake child");
    t.diagnostic(JSON.stringify({ controlledHandshakeTimeout: aborted, childReaped: true, runnerExited: true }));
  } finally {
    pid ??= await readChildPid(pidPath);
    if (pid && processIsAlive(pid)) process.kill(pid, "SIGKILL");
  }
});

test("packed artifact has the exact runtime inventory and serves MCP calls", { timeout: process.platform === "win32" ? 1_200_000 : 600_000 }, async (t) => {
  t.signal?.throwIfAborted();
  t = createQualificationScope(t);
  const diagnostics = createQualificationDiagnostics(t);
  await mkdir(artifactsRoot, { recursive: true });
  t.checkActive();
  const creatingWorkspace = mkdtemp(path.join(artifactsRoot, "packed-"));
  t.after(async () => rm(await creatingWorkspace, { recursive: true, force: true }));
  const workspace = await creatingWorkspace;
  t.checkActive();

  const { stdout } = await diagnostics.phase("npm-pack", () => packArtifact(packageRoot, workspace));
  const packed = JSON.parse(stdout);
  assert.equal(packed.length, 1);
  assert.equal(typeof packed[0].filename, "string");
  assert.ok(Array.isArray(packed[0].files));
  assertPackInventory(packed[0].files.map((file) => file.path));

  const mainPath = await diagnostics.phase("inventory", async () => {
    const archive = path.join(workspace, packed[0].filename);
    const extractedPackage = path.join(workspace, "extracted-package");
    await unpackPackageArchive(archive, extractedPackage);
    assertPackInventory(await packagedFiles(extractedPackage));

    const mainPath = path.join(extractedPackage, "dist", "main.js");
    const mainContents = await readFile(mainPath);
    await rm(mainPath);
    try {
      const incompleteInventory = await packagedFiles(extractedPackage);
      assert.throws(
        () => assertPackInventory(incompleteInventory),
        /packed artifact must contain only declared runtime files/,
      );
    } finally {
      await writeFile(mainPath, mainContents);
    }
    assertPackInventory(await packagedFiles(extractedPackage));
    return mainPath;
  });

  const fixtureProject = await writeFixtureProject(workspace);
  const client = await diagnostics.phase("smoke-connect", () => connectPackedClient(t, mainPath, diagnostics));
  const callTool = async (request) => {
    const operation = { actor: "packed-smoke", tool: request.name };
    diagnostics.observe({ event: "start", ...operation });
    try { return await client.callTool(request); }
    finally { diagnostics.observe({ event: "end", ...operation }); }
  };
  const stamp = await diagnostics.phase("smoke-calls", async () => {
    diagnostics.observe({ event: "start", actor: "packed-smoke", tool: "list_tools" });
    const tools = await client.listTools();
    diagnostics.observe({ event: "end", actor: "packed-smoke", tool: "list_tools" });
    const runtime = await callTool({ name: "workflow_runtime_info", arguments: {} });
    assert.notEqual(runtime.isError, true, JSON.stringify(runtime));
    assert.equal(runtime.structuredContent.result.identity_status, "verified", "packed metadata must match shipped executable artifacts");
    const stamp = JSON.parse(await readFile(path.join(path.dirname(mainPath), "runtime-stamp.json"), "utf8"));
    assert.equal(runtime.structuredContent.result.build_id, stamp.build_id);
    assert.equal(runtime.structuredContent.result.contract_digest, stamp.contract_digest);
    assert.deepEqual(runtime.structuredContent.result.capabilities, tools.tools.map((tool) => tool.name).sort());
    assert.deepEqual(
      tools.tools.filter((tool) => tool.name.startsWith("decisions_")).map((tool) => tool.name).sort(),
      ["decisions_catalog", "decisions_get", "decisions_overview", "decisions_search"],
    );

    const source = { project: fixtureProject, specification: "packed-example" };
    const catalog = await callTool({
      name: "decisions_catalog",
      arguments: { project: fixtureProject },
    });
    assert.notEqual(catalog.isError, true, JSON.stringify(catalog));
    assert.deepEqual(catalog.structuredContent.items, ["packed-example"]);

    const overview = await callTool({ name: "decisions_overview", arguments: source });
    assert.notEqual(overview.isError, true, JSON.stringify(overview));
    assert.equal(overview.structuredContent.current, 1);

    const search = await callTool({
      name: "decisions_search",
      arguments: { ...source, requirement_ids: ["PKG-001"] },
    });
    assert.notEqual(search.isError, true, JSON.stringify(search));
    assert.deepEqual(search.structuredContent.items.map((item) => item.id), ["packed.artifact"]);

    const exact = await callTool({
      name: "decisions_get",
      arguments: { ...source, id: "packed.artifact" },
    });
    assert.notEqual(exact.isError, true, JSON.stringify(exact));
    assert.equal(exact.structuredContent.complete, true);
    assert.equal(JSON.parse(exact.structuredContent.text).answer.text, "Packed artifact serves MCP calls.");
    return stamp;
  });

  const integrated = await diagnostics.phase("reliability", () => runProductWorkflowQualification(t, { entrypoint: mainPath, reliability: true, onProgress: diagnostics.observe }));
  assert.equal(integrated.reliability.parentItems, 119);
  assert.equal(integrated.reliability.inheritedItems, 118);
  assert.equal(integrated.reliability.freshItems, 1);
  assert.equal(integrated.reliability.exactDraftReads, 2);
  assert.equal(integrated.reliability.restartDeliveryExact, true);
  assert.equal(integrated.reliability.executedEntrypoint, mainPath, "integrated public calls must execute the extracted package");
  assert.equal(integrated.reliability.runtimeBuildId, stamp.build_id);
  const architecture = await diagnostics.phase("remediation", () => runProductWorkflowQualification(t, { entrypoint: mainPath, remediation: true, onProgress: diagnostics.observe }));
  assert.equal(architecture.remediation.acceptedTargetBeforeRoadmap, true);
  assert.equal(architecture.remediation.emptyDecisionPins > 0, true);
  assert.equal(architecture.remediation.acceptedTargetReadBack, true);
  t.diagnostic(JSON.stringify({ os: process.platform, node: process.versions.node,
    packed_build_id: stamp.build_id, packed_contract_digest: stamp.contract_digest,
    reliability: integrated.reliability }));
});
