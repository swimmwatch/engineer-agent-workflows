import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, URL } from "node:url";
import { createQualificationScope } from "./support/product-e2e-harness.mjs";
const executeFile = promisify(execFile);
import { createQualificationDiagnostics } from "./support/qualification-diagnostics.mjs";

test("I11-N2: timeout diagnostics identify pending work without payloads or contexts", async () => {
  const controller = new globalThis.AbortController();
  const lines = [], hooks = [];
  const diagnostics = createQualificationDiagnostics({ signal: controller.signal,
    diagnostic(line) { lines.push(JSON.parse(line)); }, after(hook) { hooks.push(hook); } });
  let release;
  const work = diagnostics.phase("reliability", () => new Promise((resolve) => { release = resolve; }));
  diagnostics.observe({ event: "start", actor: "product-reviewer-qualification", tool: "product_session_call",
    scenario: "product_review_record", arguments: { context: "SENTINEL_OPAQUE_CONTEXT", body: "SENTINEL_BODY" } });
  diagnostics.observe({ event: "review-item", itemIndex: 118, totalItems: 119 });
  controller.abort();
  const aborted = lines.find((line) => line.event === "aborted");
  assert.equal(aborted.phase, "reliability");
  assert.equal(aborted.completed, 0);
  assert.deepEqual(aborted.review, { itemIndex: 118, totalItems: 119 });
  assert.equal(aborted.phaseCompleted, 0);
  assert.equal(aborted.pending.length, 1);
  assert.equal(aborted.pending[0].tool, "product_session_call");
  assert.equal(aborted.pending[0].scenario, "product_review_record");
  assert.ok(Number.isFinite(aborted.pending[0].elapsedMs));
  assert.ok(Number.isFinite(aborted.elapsedMs));
  release(); await work;
  diagnostics.observe({ event: "end", actor: "product-reviewer-qualification", tool: "product_session_call", scenario: "product_review_record" });
  diagnostics.observe({ event: "start", actor: "product-reviewer-qualification", tool: "close" });
  assert.equal(lines.at(-1).event, "cleanup-start");
  assert.equal(lines.at(-1).pending[0].tool, "close");
  diagnostics.observe({ event: "end", actor: "product-reviewer-qualification", tool: "close" });
  assert.equal(lines.at(-1).event, "cleanup-end");
  for (const hook of hooks) hook();
  assert.equal(lines.at(-1).completed, 2);
  assert.equal(lines.at(-1).pending.length, 0);
  assert.doesNotMatch(JSON.stringify(lines), /SENTINEL_OPAQUE_CONTEXT|SENTINEL_BODY/);
});

test("I11-N2: progress output is bounded and rejects unknown identifiers", async () => {
  const lines = [], hooks = [];
  const controller = new globalThis.AbortController();
  const diagnostics = createQualificationDiagnostics({ signal: controller.signal,
    diagnostic(line) { lines.push(JSON.parse(line)); }, after(hook) { hooks.push(hook); } });
  await diagnostics.phase("inventory", async () => {
    for (let index = 0; index < 205; index += 1) {
      diagnostics.observe({ event: "start", actor: "product-author-qualification", tool: "product_session_call", scenario: "product_review_get" });
      diagnostics.observe({ event: "end", actor: "product-author-qualification", tool: "product_session_call", scenario: "product_review_get" });
    }
  });
  diagnostics.observe({ event: "start", actor: "SENTINEL_PRIVATE_PATH", tool: "SENTINEL_SECRET_TOOL", scenario: "SENTINEL_SECRET_SCENARIO" });
  controller.abort();
  const aborted = lines.find((line) => line.event === "aborted");
  assert.equal(aborted.completed, 205);
  assert.equal(aborted.pending[0].tool, "redacted");
  assert.equal(aborted.pending[0].scenario, "redacted");
  assert.equal(aborted.pending[0].actor, "redacted");
  assert.deepEqual(lines.filter((line) => line.event === "checkpoint").map((line) => line.completed), [100, 200]);
  assert.ok(lines.length <= 6, "progress must not emit a line for every request");
  assert.ok(lines.every((line) => JSON.stringify(line).length < 2_000));
  assert.doesNotMatch(JSON.stringify(lines), /SENTINEL/);
  for (const hook of hooks) hook();
});

// This uses real owner hooks and the native TAP surface, with controlled SDK failures.
test("I11-N5: native TAP exposes actual actor and temporary-root failures safely", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "eaw-cleanup-diagnostics-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const runner = join(directory, "owner.test.mjs");
  await writeFile(runner, `import test from 'node:test';
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {actor,createQualificationScope} from ${JSON.stringify(new URL("./support/product-e2e-harness.mjs", import.meta.url).href)};
import {createTemporaryDirectory} from ${JSON.stringify(new URL("./support/temporary-directory.mjs", import.meta.url).href)};
import {Client} from ${JSON.stringify(import.meta.resolve("@modelcontextprotocol/client"))};
import {StdioClientTransport} from ${JSON.stringify(import.meta.resolve("@modelcontextprotocol/client/stdio"))};
test('controlled real cleanup owners', async native => {
 const scope=createQualificationScope(native);
 const root=await createTemporaryDirectory(scope,'eaw-controlled-root-');
 const original=fs.promises.rm;
 native.after(async()=>{fs.promises.rm=original;syncBuiltinESMExports();await original(root,{recursive:true,force:true});});
 fs.promises.rm=async()=>{throw Object.assign(new Error('PRIVATE_ROOT_PATH_CONTEXT_12345'),{code:'EBUSY'});};syncBuiltinESMExports();
 Client.prototype.connect=async()=>{};
 Client.prototype.callTool=async()=>({structuredContent:{}});
 StdioClientTransport.prototype.close=async()=>{throw Object.assign(new Error('PRIVATE_TRANSPORT_TOKEN_12345'),{code:'EPERM'});};
 Client.prototype.close=async()=>{throw Object.assign(new Error('PRIVATE_CLIENT_TOKEN_12345'),{code:'EACCES'});};
 const owned=actor(scope,{name:'product-author-qualification',root,calls:[]});
 await owned.raw('controlled',{});
});`);
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  const result = await executeFile(process.execPath, ["--test", "--test-reporter=tap", runner], { env, timeout: 10_000 }).catch(error => error);
  assert.equal(result.code, 1, "controlled cleanup failures must keep the native test failed");
  assert.equal(result.killed, false, "the runner must exit naturally");
  const events = result.stdout.split("\n").map(line => line.match(/\{"event":"cleanup-failed".*\}/u)?.[0]).filter(Boolean).map(line => JSON.parse(line));
  assert.ok(events.some(event => event.resource === "actor" && event.actor === "product-author-qualification" && event.boundary === "transport-close" && event.error.code === "EPERM"), "actual actor transport failure must reach TAP with its safe boundary/code");
  assert.ok(events.some(event => event.resource === "actor" && event.boundary === "client-close" && event.error.code === "EACCES"));
  assert.ok(events.some(event => event.resource === "temporary-root" && event.boundary === "filesystem-remove" && event.error.code === "EBUSY"), "actual temporary-directory owner must identify its failed removal");
  assert.doesNotMatch(JSON.stringify(events), /PRIVATE|12345/);
});

test("I11-N5: cleanup diagnostics preserve original errors, LIFO and all attempts", async () => {
  const hooks = [], lines = [], attempted = [];
  const scope = createQualificationScope({ after(fn) { hooks.push(fn); }, diagnostic(line) { lines.push(JSON.parse(line)); } });
  const first = Object.assign(new Error("PRIVATE_FIRST"), { code: "EBUSY" });
  const second = new AggregateError([first], "PRIVATE_NESTED");
  scope.after(() => { attempted.push("first"); throw first; }, { resource: "temporary-root", boundary: "filesystem-remove" });
  scope.after(() => { attempted.push("second"); throw second; }, { resource: "actor", actor: "product-author-qualification" });
  scope.after(() => { attempted.push("last"); });
  await assert.rejects(hooks[0](), error => {
    assert.ok(error instanceof AggregateError);
    assert.deepEqual(error.errors, [second, first]);
    assert.equal(error.errors[0], second); assert.equal(error.errors[1], first);
    assert.equal(error.errors[0].errors[0], first); return true;
  });
  assert.deepEqual(attempted, ["last", "second", "first"]);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].resource, "actor");
  assert.equal(lines[0].error.kind, "aggregate");
  assert.equal(lines[0].error.children[0].code, "EBUSY");
  assert.equal(lines[1].resource, "temporary-root");
  assert.doesNotMatch(JSON.stringify(lines), /PRIVATE/);
});

test("I11-N5: hostile metadata, cycles and overflow remain bounded without reading secrets", async () => {
  const hooks = [], lines = [], originals = [];
  let getters = 0, attempts = 0;
  const scope = createQualificationScope({ after(fn) { hooks.push(fn); }, diagnostic(line) { lines.push(JSON.parse(line)); } });
  const hostile = Object.defineProperties(new Error("PRIVATE_MESSAGE"), {
    code: { get() { getters += 1; throw new Error("PRIVATE_CODE"); } },
    stack: { get() { getters += 1; throw new Error("PRIVATE_STACK"); } },
    toJSON: { get() { getters += 1; throw new Error("PRIVATE_JSON"); } },
  });
  const cyclic = new AggregateError([], "PRIVATE_CYCLE"); cyclic.errors.push(cyclic);
  const wide = new AggregateError(Array.from({ length: 20 }, () => hostile), "PRIVATE_WIDE");
  let deep = hostile; for (let index = 0; index < 9; index += 1) deep = new AggregateError([deep], "PRIVATE_DEEP");
  let tree = hostile; for (let index = 0; index < 4; index += 1) tree = new AggregateError(Array(8).fill(tree), "PRIVATE_TREE");
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  const metadata = { resource: "PRIVATE_RESOURCE", actor: "PRIVATE_ACTOR", boundary: "PRIVATE_BOUNDARY" };
  const withGetter = Object.defineProperty({}, "resource", { get() { getters += 1; throw hostile; } });
  for (let index = 0; index < 20; index += 1) {
    const error = [hostile, cyclic, wide, deep, revoked.proxy, null, "PRIVATE_VALUE", { code: "PRIVATE_CODE" }, tree][index % 9];
    originals.unshift(error);
    scope.after(() => { attempts += 1; throw error; }, index % 2 ? metadata : withGetter);
  }
  await assert.rejects(hooks[0](), error => {
    assert.equal(error.errors.length, 20);
    error.errors.forEach((value, index) => assert.equal(value, originals[index])); return true;
  });
  assert.equal(attempts, 20); assert.equal(getters, 0);
  assert.equal(lines.length, 16);
  assert.ok(lines.every(line => line.resource === "redacted" && line.actor === "redacted" && line.boundary === "redacted"));
  assert.ok(lines.every(line => line.truncated === true));
  assert.ok(lines.some(line => line.error.truncated));
  assert.ok(lines.some(line => line.error.kind === "non-error"));
  assert.ok(lines.some(line => line.error.count === 20 && line.error.children.length === 8));
  function verifyBounds(error, depth = 0) {
    assert.ok(depth <= 4, "aggregate projection must stop at depth four");
    assert.ok((error.children?.length ?? 0) <= 8);
    if (depth === 4) assert.equal(error.children?.length ?? 0, 0);
    let nodes = 1;
    for (const child of error.children ?? []) nodes += verifyBounds(child, depth + 1);
    return nodes;
  }
  assert.ok(lines.every(line => verifyBounds(line.error) <= 64));
  const cycle = lines.find(line => line.error.kind === "aggregate" && line.error.children?.[0]?.kind === "aggregate" && line.error.children[0].truncated && line.error.children[0].children?.length === 0);
  assert.ok(cycle, "a repeated aggregate must be truncated at its first repeated edge");
  assert.ok(lines.every(line => JSON.stringify(line).length < 12_000));
  assert.doesNotMatch(JSON.stringify(lines), /PRIVATE/);
});

test("I11-N5: successful and after-only cleanup remain silent; sink failures preserve all errors", async () => {
  const successHooks = [], successLines = [];
  const success = createQualificationScope({ after(fn) { successHooks.push(fn); }, diagnostic(line) { successLines.push(line); } });
  success.after(() => {}, { resource: "temporary-root", boundary: "filesystem-remove" });
  await successHooks[0](); assert.deepEqual(successLines, []);
  for (const sink of [undefined, () => { throw new Error("PRIVATE_SINK"); }]) {
    const hooks = [], attempted = [], first = new Error("first"), second = new Error("second");
    const scope = createQualificationScope({ after(fn) { hooks.push(fn); }, diagnostic: sink });
    scope.after(() => { attempted.push(1); throw first; });
    scope.after(() => { attempted.push(2); throw second; });
    await assert.rejects(hooks[0](), error => {
      assert.ok(error instanceof AggregateError, "a diagnostic sink must not replace the original cleanup aggregate");
      assert.equal(error.errors[0], second); assert.equal(error.errors[1], first); return true;
    });
    assert.deepEqual(attempted, [2, 1]);
  }
});

test("I11-N5: actual packed smoke and root owners identify controlled failures in TAP", async () => {
  const env = { ...process.env, EAW_PACKED_CLEANUP_DIAGNOSTICS_PROBE: "1" }; delete env.NODE_TEST_CONTEXT;
  const result = await executeFile(process.execPath, ["--test", "--test-reporter=tap", "--test-name-pattern=I11-N5: controlled packed cleanup owners", fileURLToPath(new URL("./packed-artifact.test.mjs", import.meta.url))], { env, timeout: 10_000 }).catch(error => error);
  assert.equal(result.code, 1); assert.equal(result.killed, false);
  const events = result.stdout.split("\n").map(line => line.match(/\{"event":"cleanup-failed".*\}/u)?.[0]).filter(Boolean).map(line => JSON.parse(line));
  assert.ok(events.some(event => event.resource === "packed-smoke" && event.actor === "packed-smoke" && event.boundary === "client-close" && event.error.code === "EACCES"));
  assert.ok(events.some(event => event.resource === "packed-root" && event.boundary === "filesystem-remove" && event.error.code === "EBUSY"));
  assert.doesNotMatch(JSON.stringify(events), /PRIVATE|controlled/);
});
