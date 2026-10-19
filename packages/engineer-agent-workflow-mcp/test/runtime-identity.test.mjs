import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, URL } from "node:url";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const executeFile = promisify(execFile);
const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const artifactRoot = fileURLToPath(new URL("../../../.artifacts/", import.meta.url));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const clientRoots = new WeakMap();

async function snapshot(root, relative = "") {
  const entries = await readdir(path.join(root, relative), { withFileTypes: true });
  const directory = await lstat(path.join(root, relative));
  const result = [[relative || ".", "directory", directory.mode, directory.mtimeMs, directory.ctimeMs]];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const name = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) result.push(...await snapshot(root, name));
    else {
      const status = await lstat(path.join(root, name));
      result.push([name, sha256(await readFile(path.join(root, name))), status.mode, status.mtimeMs, status.ctimeMs]);
    }
  }
  return result;
}

async function fixture(t) {
  await mkdir(artifactRoot, { recursive: true });
  const root = await mkdtemp(path.join(artifactRoot, "runtime-identity-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(path.join(packageRoot, "dist"), path.join(root, "dist"), { recursive: true });
  await cp(path.join(packageRoot, "scripts"), path.join(root, "scripts"), { recursive: true });
  await cp(path.join(packageRoot, "package.json"), path.join(root, "package.json"));
  for (const name of ["home", "store"]) {
    await mkdir(path.join(root, name));
    await writeFile(path.join(root, name, "sentinel"), "unchanged\n");
  }
  return root;
}

async function connect(t, root) {
  const transport = new StdioClientTransport({
    command: process.execPath, args: [path.join(root, "dist/main.js")], stderr: "pipe",
    env: { ...process.env, HOME: path.join(root, "home"), USERPROFILE: path.join(root, "home"),
      EAW_PRODUCT_DATA_DIR: path.join(root, "store") },
  });
  let stderr = "";
  transport.stderr.on("data", (chunk) => { stderr += chunk; });
  const client = new Client({ name: "runtime-identity-test", version: "1.0.0" });
  t.after(async () => { await client.close(); assert.equal(stderr, ""); });
  await client.connect(transport);
  clientRoots.set(client, root);
  return client;
}

async function info(client) {
  const tools = (await client.listTools()).tools;
  const definition = tools.find((tool) => tool.name === "workflow_runtime_info");
  assert.ok(definition, "the serving MCP must advertise workflow_runtime_info");
  assert.equal(definition.annotations.readOnlyHint, true);
  const root = clientRoots.get(client);
  const before = await Promise.all([snapshot(path.join(root, "store")), snapshot(path.join(root, "home"))]);
  const response = await client.callTool({ name: definition.name, arguments: {} });
  assert.deepEqual(await Promise.all([snapshot(path.join(root, "store")), snapshot(path.join(root, "home"))]), before,
    "every diagnostic read must preserve store and global configuration trees");
  assert.notEqual(response.isError, true, JSON.stringify(response));
  assert.ok(Buffer.byteLength(JSON.stringify(response.structuredContent)) <= 24 * 1024);
  assert.ok(Buffer.byteLength(JSON.stringify(response)) <= 64 * 1024);
  assert.deepEqual(JSON.parse(response.content[0].text), response.structuredContent);
  assert.deepEqual(response.structuredContent.result.capabilities, tools.map((tool) => tool.name).sort());
  return response.structuredContent.result;
}

async function stamp(root) {
  await executeFile(process.execPath, [path.join(root, "scripts/build-runtime-info.mjs")]);
}

test("serving runtime advertises exact capabilities and leaves store and home unchanged", async (t) => {
  const root = await fixture(t);
  const before = await Promise.all([snapshot(path.join(root, "store")), snapshot(path.join(root, "home"))]);
  const client = await connect(t, root);
  const result = await info(client);
  assert.equal(result.identity_status, "verified");
  assert.equal(result.package_version, JSON.parse(await readFile(path.join(root, "package.json"), "utf8")).version);
  assert.match(result.build_id, /^[a-f0-9]{64}$/u);
  assert.match(result.contract_digest, /^[a-f0-9]{64}$/u);
  assert.equal(typeof result.contract_id, "string");
  assert.deepEqual(await info(client), result);
  const invalid = await client.callTool({ name: "workflow_runtime_info", arguments: { project: "private-marker" } });
  assert.equal(invalid.isError, true);
  assert.ok(!JSON.stringify(invalid).includes("private-marker"));
  assert.deepEqual(await Promise.all([snapshot(path.join(root, "store")), snapshot(path.join(root, "home"))]), before);
});

test("a running A process keeps A while a same-version build B replaces its files", async (t) => {
  const root = await fixture(t);
  const a = await connect(t, root);
  const initial = await info(a);
  const stampPath = path.join(root, "dist/runtime-stamp.json");
  const firstStamp = await readFile(stampPath, "utf8");
  await stamp(root);
  assert.equal(await readFile(stampPath, "utf8"), firstStamp, "repeated builds must be deterministic");
  const serverPath = path.join(root, "dist/server.js");
  const server = await readFile(serverPath, "utf8");
  assert.ok(server.includes("Missing decision-reader output schema."));
  await writeFile(serverPath, server.replace("Missing decision-reader output schema.", "Missing compiled fixture output schema."));
  await stamp(root);
  const b = await connect(t, root);
  const replacement = await info(b);
  assert.equal(replacement.identity_status, "verified");
  assert.equal(initial.package_version, replacement.package_version);
  assert.notEqual(initial.build_id, replacement.build_id);
  assert.deepEqual(await info(a), initial, "running A must never report the unloaded B identity");
  assert.deepEqual(replacement.capabilities, initial.capabilities);
});

test("missing and mixed startup metadata is explicitly unavailable with a safe refresh action", async (t) => {
  for (const kind of ["missing", "mixed", "incomplete", "extra"]) {
    const root = await fixture(t);
    if (kind === "missing") await rm(path.join(root, "dist/runtime-stamp.json"));
    if (kind === "mixed") await writeFile(path.join(root, "dist/schemas/manifest.schema.json"), "{}\n");
    if (kind === "incomplete") {
      const filename = path.join(root, "dist/runtime-stamp.json");
      const record = JSON.parse(await readFile(filename, "utf8"));
      record.artifacts.pop();
      await writeFile(filename, JSON.stringify(record));
    }
    if (kind === "extra") await writeFile(path.join(root, "dist/unexpected.js"), "export const value = 1;\n");
    const before = await Promise.all([snapshot(path.join(root, "store")), snapshot(path.join(root, "home"))]);
    const result = await info(await connect(t, root));
    assert.equal(result.identity_status, "unavailable", kind);
    assert.equal(result.build_id, null);
    assert.equal(result.contract_digest, null);
    assert.match(result.reason, /metadata|artifact/u);
    assert.match(result.refresh_requirement, /restart/u);
    assert.ok(!JSON.stringify(result).includes(root));
    assert.deepEqual(await Promise.all([snapshot(path.join(root, "store")), snapshot(path.join(root, "home"))]), before);
  }
});

test("schema and contract payload changes affect the serving contract digest", async (t) => {
  const root = await fixture(t);
  const initial = await info(await connect(t, root));
  const schemaPath = path.join(root, "dist/schemas/manifest.schema.json");
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  schema.title = "Isolated contract fingerprint variant";
  await writeFile(schemaPath, JSON.stringify(schema));
  await stamp(root);
  const replacement = await info(await connect(t, root));
  assert.equal(replacement.identity_status, "verified");
  assert.notEqual(initial.build_id, replacement.build_id);
  assert.notEqual(initial.contract_digest, replacement.contract_digest);
});

test("runtime validation code remains in the executable identity digest domain", async (t) => {
  const root = await fixture(t);
  const initial = await info(await connect(t, root));
  const modulePath = path.join(root, "dist/runtime-info.js");
  const contents = await readFile(modulePath, "utf8");
  assert.ok(contents.includes("Build metadata is missing"));
  await writeFile(modulePath, contents.replace("Build metadata is missing", "Runtime metadata is missing"));
  await stamp(root);
  const replacement = await info(await connect(t, root));
  assert.equal(replacement.identity_status, "verified");
  assert.notEqual(initial.build_id, replacement.build_id, "only the embedded data literal may be excluded");
  assert.equal(initial.contract_digest, replacement.contract_digest);
});

test("a server registry without the new diagnostic cannot advertise that capability", async (t) => {
  const root = await fixture(t);
  const serverPath = path.join(root, "dist/server.js");
  const contents = await readFile(serverPath, "utf8");
  assert.ok(contents.includes(", runtimeInfo]"));
  await writeFile(serverPath, contents.replace(", runtimeInfo]", "]"));
  await stamp(root);
  const client = await connect(t, root);
  assert.ok(!(await client.listTools()).tools.some((tool) => tool.name === "workflow_runtime_info"));
  const response = await client.callTool({ name: "workflow_runtime_info", arguments: {} });
  assert.equal(response.isError, true);
});

test("executable statements adjacent to identity data cannot retain a verified old build", async (t) => {
  const injections = [
    (payload) => `${payload}; globalThis.__i04SafeProbe = true`,
    (payload) => `${payload}; globalThis.__i04SafeProbe = (() => ({ nested: "safe" }))()`,
    (payload) => `${payload}; (() => { globalThis.__i04SafeProbe = true; })()`,
    (payload) => `(${payload}, (globalThis.__i04SafeProbe = true), ${payload})`,
    (payload) => `Object.assign(${payload}, {})`,
  ];
  for (const injection of injections) {
    const root = await fixture(t);
    const initial = await info(await connect(t, root));
    const modulePath = path.join(root, "dist/runtime-info.js");
    const source = await readFile(modulePath, "utf8");
    const marker = "; // Runtime identity payload.";
    const declaration = /^const embeddedStamp = (.*); \/\/ Runtime identity payload\.\r?$/mu;
    assert.ok(declaration.test(source));
    await writeFile(modulePath, source.replace(declaration, (_line, payload) => `const embeddedStamp = ${injection(payload)}${marker}`));
    const response = await info(await connect(t, root));
    assert.equal(response.identity_status, "unavailable", "executable suffix is not an excluded identity payload");
    assert.equal(response.build_id, null);
    assert.match(initial.build_id, /^[a-f0-9]{64}$/u);
  }
});

test("stamp generation rejects executable initializers without overwriting artifacts", async (t) => {
  const root = await fixture(t);
  const modulePath = path.join(root, "dist/runtime-info.js");
  const stampPath = path.join(root, "dist/runtime-stamp.json");
  const oldStamp = await readFile(stampPath, "utf8");
  const contents = await readFile(modulePath, "utf8");
  const mutation = contents.replace(/^const embeddedStamp = (.*); \/\/ Runtime identity payload\.\r?$/mu,
    (_line, payload) => `const embeddedStamp = ${payload}; globalThis.__i04SafeProbe = true; // Runtime identity payload.`);
  assert.notEqual(mutation, contents);
  await writeFile(modulePath, mutation);
  await assert.rejects(() => stamp(root));
  assert.equal(await readFile(modulePath, "utf8"), mutation);
  assert.equal(await readFile(stampPath, "utf8"), oldStamp);
});

test("stamp generation preserves code outside data and accepts CRLF and quoted punctuation", async (t) => {
  const root = await fixture(t);
  const modulePath = path.join(root, "dist/runtime-info.js");
  const contents = await readFile(modulePath, "utf8");
  const code = "\nglobalThis.__i04SafeProbe = true;\n";
  await writeFile(modulePath, contents.replace(/\r?\n/gu, "\r\n") + code);
  await writeFile(path.join(root, "dist/safe;{}literal.js"), "export const value = 1;\n");
  await stamp(root);
  const rebuilt = await readFile(modulePath, "utf8");
  assert.ok(rebuilt.endsWith(code));
  assert.ok(rebuilt.includes("\r\n"));
  const result = await info(await connect(t, root));
  assert.equal(result.identity_status, "verified");
  const firstStamp = await readFile(path.join(root, "dist/runtime-stamp.json"), "utf8");
  await stamp(root);
  assert.equal(await readFile(path.join(root, "dist/runtime-stamp.json"), "utf8"), firstStamp);
});
