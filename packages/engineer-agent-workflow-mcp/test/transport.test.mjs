import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, URL } from "node:url";
import test from "node:test";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { stringify } from "yaml";

const entrypoint = fileURLToPath(new URL("../dist/main.js", import.meta.url));

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "decision-mcp-transport-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const projects = [path.join(root, "alpha"), path.join(root, "beta")];
  const files = [];
  for (const [index, project] of projects.entries()) {
    const directory = path.join(project, "docs/specs/example");
    await mkdir(directory, { recursive: true });
    const file = path.join(directory, "decisions.yaml");
    await writeFile(file, stringify({
      schema_version: 1, spec_slug: "example", decisions: [{
        id: "api.errors", revision: 1, category: "behavior", state: "answered",
        provenance: "user", answer: { selected_ids: [], text: `Project ${index}: preserve this answer.` },
        requirement_ids: ["API-003"],
      }],
    }));
    files.push(file);
  }
  const sibling = path.join(projects[0], "docs/specs/other");
  await mkdir(sibling);
  await writeFile(path.join(sibling, "decisions.yaml"), "invalid: yaml: must not be read by catalog\n");
  return { root, projects, files };
}

async function connect(t) {
  const transport = new StdioClientTransport({
    command: process.execPath, args: [entrypoint], stderr: "pipe",
  });
  let stderr = "";
  transport.stderr.on("data", (chunk) => { stderr += chunk; });
  const client = new Client({ name: "decision-reader-test", version: "1.0.0" });
  t.after(async () => {
    await client.close();
    assert.equal(stderr, "", "normal queries must not log journal data or diagnostics");
  });
  await client.connect(transport);
  return client;
}

test("actual stdio serves isolated project/spec queries without roots or configuration", { timeout: 20000 }, async (t) => {
  const { projects, files } = await fixture(t);
  const before = await Promise.all(files.map((file) => readFile(file, "utf8")));
  const client = await connect(t);
  const definitions = (await client.listTools()).tools.filter((tool) => tool.name.startsWith("decisions_"));
  assert.deepEqual(definitions.map((tool) => tool.name).sort(), [
    "decisions_catalog", "decisions_get", "decisions_overview", "decisions_search",
  ]);
  for (const tool of definitions) {
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.destructiveHint, false);
    assert.ok(tool.inputSchema.properties.project);
    assert.ok(tool.outputSchema);
  }
  async function call(name, args) {
    const result = await client.callTool({ name, arguments: args });
    assert.notEqual(result.isError, true, JSON.stringify(result));
    assert.ok(Buffer.byteLength(JSON.stringify(result)) <= 65536);
    assert.equal(result.structuredContent.protocol_version, 1);
    assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
    return result.structuredContent;
  }
  const catalog = await call("decisions_catalog", { project: projects[0] });
  assert.deepEqual(catalog.items, ["example", "other"]);
  for (const [index, project] of projects.entries()) {
    const source = { project, specification: "example" };
    const overview = await call("decisions_overview", source);
    assert.equal(overview.current, 1);
    const search = await call("decisions_search", { ...source, requirement_ids: ["API-003"] });
    assert.deepEqual(search.items.map((item) => item.id), ["api.errors"]);
    const exact = await call("decisions_get", { ...source, id: "api.errors" });
    assert.equal(exact.complete, true);
    assert.equal(JSON.parse(exact.text).answer.text, `Project ${index}: preserve this answer.`);
  }
  const invalid = await client.callTool({
    name: "decisions_overview", arguments: { project: projects[0], specification: "other" },
  });
  assert.equal(invalid.isError, true);
  assert.ok(!JSON.stringify(invalid).includes("must not be read"));
  assert.deepEqual(await Promise.all(files.map((file) => readFile(file, "utf8"))), before);
});

test("stdio accepts schema-bounded filters including worst-case JSON escaping", { timeout: 20000 }, async (t) => {
  const { projects } = await fixture(t);
  const client = await connect(t);
  for (const character of ["x", "\u0001"]) {
    const values = Array.from({ length: 100 }, () => character.repeat(512));
    const result = await client.callTool({
      name: "decisions_search", arguments: {
        project: projects[0], specification: "example",
        ids: values, states: values, categories: values, requirement_ids: values,
      },
    });
    assert.notEqual(result.isError, true, JSON.stringify(result));
    assert.equal(result.structuredContent.total, 0);
    assert.equal(result.structuredContent.complete, true);
  }
  assert.equal((await client.listTools()).tools.filter((tool) => tool.name.startsWith("decisions_")).length, 4);
});
test("SDK validation and unknown tools return bounded non-reflecting errors", { timeout: 20000 }, async (t) => {
  const { projects } = await fixture(t);
  const client = await connect(t);
  const invalidValues = Array(1000).fill(null);
  for (const request of [
    { name: "decisions_search", arguments: {
      project: projects[0], specification: "example", ids: invalidValues,
      states: invalidValues, categories: invalidValues, requirement_ids: invalidValues,
    } },
    { name: "private-source-marker-" + "x".repeat(100000), arguments: {} },
  ]) {
    const result = await client.callTool(request);
    const encoded = JSON.stringify(result);
    assert.equal(result.isError, true);
    assert.ok(Buffer.byteLength(encoded) <= 65536);
    assert.equal(result.structuredContent.protocol_version, 1);
    assert.equal(result.structuredContent.error.code, "INVALID_INPUT");
    assert.ok(!encoded.includes("private-source-marker"));
  }
  assert.equal((await client.listTools()).tools.filter((tool) => tool.name.startsWith("decisions_")).length, 4);
});
test("legacy stdio performs bounded tool calls in both supported 2025 versions", { timeout: 10000 }, async (t) => {
  const { projects } = await fixture(t);
  for (const protocolVersion of ["2025-06-18", "2025-11-25"]) {
    const child = spawn(process.execPath, [entrypoint], { stdio: ["pipe", "pipe", "pipe"] });
    t.after(() => { child.kill(); });
    let output = "";
    let errors = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { errors += chunk; });
    async function request(id, method, params) {
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
      const deadline = Date.now() + 5000;
      while (child.exitCode === null && Date.now() < deadline) {
        const lines = output.split("\n").slice(0, -1);
        const message = lines.map((line) => JSON.parse(line)).find((entry) => entry.id === id);
        if (message) {
          assert.equal(message.error, undefined, JSON.stringify(message));
          assert.equal(errors, "");
          return message.result;
        }
        await delay(20);
      }
      assert.fail("The legacy server did not return a protocol response.");
    }
    const initialized = await request(1, "initialize", {
      protocolVersion, capabilities: {}, clientInfo: { name: "legacy-test", version: "1.0.0" },
    });
    assert.equal(initialized.protocolVersion, protocolVersion);
    assert.ok(initialized.capabilities.tools);
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
    const listed = await request(2, "tools/list", {});
    assert.equal(listed.tools.filter((tool) => tool.name.startsWith("decisions_")).length, 4);
    const source = { project: projects[0], specification: "example" };
    let id = 3;
    for (const [name, args] of [
      ["decisions_catalog", { project: projects[0] }],
      ["decisions_overview", source],
      ["decisions_search", { ...source, ids: ["api.errors"] }],
      ["decisions_get", { ...source, id: "api.errors" }],
    ]) {
      const result = await request(id++, "tools/call", { name, arguments: args });
      assert.notEqual(result.isError, true, JSON.stringify(result));
      assert.ok(Buffer.byteLength(JSON.stringify(result)) <= 65536);
      assert.equal(result.structuredContent.protocol_version, 1);
      assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
    }
    for (const call of [
      { name: "decisions_search", arguments: { ...source, ids: Array(1000).fill(null) } },
      { name: "private-source-marker-" + "x".repeat(100000), arguments: {} },
    ]) {
      const result = await request(id++, "tools/call", call);
      assert.equal(result.isError, true);
      assert.equal(result.structuredContent.error.code, "INVALID_INPUT");
      assert.ok(Buffer.byteLength(JSON.stringify(result)) <= 65536);
      assert.ok(!JSON.stringify(result).includes("private-source-marker"));
    }
    assert.equal((await request(id, "tools/list", {})).tools.filter((tool) => tool.name.startsWith("decisions_")).length, 4);
    child.kill();
  }
});

test("server rejects startup path flags instead of enabling a query-command fallback", { timeout: 10000 }, async () => {
  const child = spawn(process.execPath, [entrypoint, "--project", "untrusted"], { stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const exit = await new Promise((resolve, reject) => { child.once("error", reject); child.once("close", resolve); });
  assert.equal(exit, 2);
  assert.equal(stdout, "");
  assert.match(stderr, /no startup arguments/);
  assert.ok(!stderr.includes("untrusted"));
});
