import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import test from "node:test";
import { fileURLToPath, URL } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { workflowTools } from "../dist/server.js";
import { productSessionHandlers } from "../dist/product/sessions.js";
import { WorkflowError } from "../dist/state.js";
import { productInterviewReplayIdentity } from "../dist/product/interview.js";
import { inspectCompletedProductReplay } from "../dist/product/operations.js";
import Ajv from "ajv";
import { saveObject, saveGeneration } from "../dist/product/storage.js";
import { createSharedStdioHarness } from "../test-support/stdio-harness.mjs";

const execute = promisify(execFile);
const server = fileURLToPath(new URL("../dist/main.js", import.meta.url));
async function initializeWorkspace(workspace) {
  await mkdir(workspace);
  await execute("git", ["init", "--quiet", "--initial-branch=main"], { cwd: workspace });
  await writeFile(join(workspace, "README.md"), "# Session fixture\n");
  await execute("git", ["add", "README.md"], { cwd: workspace });
  await execute("git", ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "--quiet", "-m", "fixture"], { cwd: workspace });
}
async function withRoot(root, work) {
  const previous = process.env.EAW_PRODUCT_DATA_DIR;
  process.env.EAW_PRODUCT_DATA_DIR = root;
  try { return await work(); }
  finally { if (previous === undefined) delete process.env.EAW_PRODUCT_DATA_DIR; else process.env.EAW_PRODUCT_DATA_DIR = previous; }
}
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), "eaw-product-sessions-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const root = join(directory, "store");
  const workspace = join(directory, "workspace");
  await initializeWorkspace(workspace);
  let client;
  async function start() {
    client = new Client({ name: "session-fixture", version: "1" });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [server], env: { ...process.env, EAW_PRODUCT_DATA_DIR: root }, stderr: "pipe" }));
  }
  await start();
  t.after(() => client.close());
  async function raw(name, args) { return client.callTool({ name, arguments: args }); }
  async function call(name, args) {
    const response = await raw(name, args);
    assert.notEqual(response.isError, true, JSON.stringify(response.structuredContent));
    assert.ok(Buffer.byteLength(JSON.stringify(response)) <= 64 * 1024);
    return response.structuredContent;
  }
  const initialized = await call("product_initialize", { workspace, name: "Session fixture", known_idea: "Preserve exact actor state." });
  const draft = await call("product_artifact_draft", { context: initialized.context, artifact: "idea", upstream_pins: [] });
  async function open(context = draft.context, candidate = draft.result.candidate_ref) {
    const response = await call("product_session_open", { context, candidate_ref: candidate });
    return { ref: response.result.session_ref, revision: response.result.session_revision };
  }
  async function sessionCall(session, scenario, args, requestId = randomUUID()) {
    const response = await call("product_session_call", { session_ref: session.ref, expected_revision: session.revision, request_id: requestId, scenario, arguments: args });
    session.revision = response.result.session_revision;
    return response.result;
  }
  async function next(session, readRef) {
    const response = await call("product_session_next", { session_ref: session.ref, expected_revision: session.revision, read_ref: readRef });
    session.revision = response.result.session_revision;
    return response.result;
  }
  async function collect(session, first) {
    let page = first;
    const outputs = [];
    let text = "";
    for (let portions = 0; portions < 10000; portions += 1) {
      text += page.delivery.text;
      if (page.delivery.complete) { outputs.push(JSON.parse(text)); text = ""; }
      if (page.complete) { assert.equal(text, ""); return outputs; }
      page = await next(session, first.read_ref);
    }
    assert.fail("session delivery must terminate");
  }
  return { directory, root, workspace, initialized, draft, open, call, raw, sessionCall, next, collect, listTools: () => client.listTools(),
    async restart() { await client.close(); await start(); },
  };
}
async function snapshot(root, relative = "") {
  const entries = await readdir(join(root, relative), { withFileTypes: true });
  const result = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...await snapshot(root, child));
    else result.push([child, createHash("sha256").update(await readFile(join(root, child))).digest("hex")]);
  }
  return result;
}

function request(f, s, scenario, args) {
  return { session_ref: s.ref, expected_revision: s.revision, request_id: randomUUID(), scenario, arguments: args };
}
function adapted(f, name, fault, ordinal = 1) {
  let calls = 0;
  const handlers = productSessionHandlers(workflowTools.map(tool => ({ ...tool,
    async run(input) { const output = globalThis.structuredClone(await withRoot(f.root, () => tool.run(input))); if (tool.name === name) { calls += 1; if (calls === ordinal) fault(output); } return output; },
  })));
  return { handlers, calls: () => calls };
}
async function checkpoint(f, s) {
  const identity = JSON.parse(Buffer.from(s.ref, "base64url").toString());
  return JSON.parse(await readFile(join(f.root, "products", identity.product_id, "sessions", `${identity.id}.json`), "utf8"));
}
async function record(f, text) {
  return f.call("product_record_instruction", { context: f.draft.context, candidate_ref: f.draft.result.candidate_ref,
    text, source: "fixture", related_refs: [], affected_refs: [] });
}
const corruption = {
  "extra field": o => { o.result.unpublished = true; },
  "missing field": o => { delete o.result.encoding; },
  "invalid uuid": o => { o.result.record_ref.id = "invalid"; },
  "record kind": o => { o.result.record_ref.kind = "research"; },
  "valid foreign cursor": o => {
    const bytes = Buffer.from(o.result.next_cursor, "base64url"), value = JSON.parse(inflateRawSync(bytes.subarray(8)).toString());
    value.i = "0".repeat(64); const serialized = Buffer.from(JSON.stringify(value));
    o.result.next_cursor = Buffer.concat([createHash("sha256").update(serialized).digest().subarray(0,8),deflateRawSync(serialized)]).toString("base64url");
  },
  "invalid type": o => { o.result.total_characters = "wrong"; },
  "wrong candidate": o => { o.result.candidate_ref.candidate_id = randomUUID(); },
  "wrong record": o => { o.result.record_ref.id = randomUUID(); },
  "wrong revision": o => { o.result.record_ref.revision += 1; },
  "wrong source version": o => { o.result.source_version = "0".repeat(64); },
  "wrong digest": o => { o.result.source_object_sha256 = "0".repeat(64); },
  "same length text": o => { o.result.text = "x".repeat(Array.from(o.result.text).length); },
  "short terminal body": o => { o.result.text = "{}"; o.result.total_characters = 2; o.result.complete = true; o.result.next_cursor = null; },
  "marker context": o => { o.context = "<<ccr:opaque>>"; },
  "other context": o => { const c = JSON.parse(Buffer.from(o.context, "base64url").toString()); c.workspace_id = randomUUID(); o.context = Buffer.from(JSON.stringify(c)).toString("base64url"); },
  "read replay flag": o => { o.replayed = true; },
  "read operation": o => { o.operation_ref = randomUUID(); },
};
test("candidate first portions reject schema and schema-valid losses before retaining delivery", async t => {
  const f = await fixture(t), saved = await record(f, "😀é данные and quoted <<ccr:literal>> ".repeat(140));
  const args = { candidate_ref: f.draft.result.candidate_ref, record_ref: { kind: "decision", ...saved.result.decision_ref } };
  delete args.record_ref.product_id; delete args.record_ref.artifact;
  for (const [name, fault] of Object.entries(corruption)) await t.test(name, async () => {
    const s = await f.open(saved.context), before = await snapshot(f.root), a = adapted(f, "product_candidate_record_get", fault);
    await assert.rejects(a.handlers.call(f.root, request(f, s, "product_candidate_record_get", args)), e => ["INVALID_STATE", "SOURCE_CHANGED", "INVALID_CURSOR", "STALE_CURSOR"].includes(e.code));
    assert.equal(a.calls(), 1); assert.deepEqual(await snapshot(f.root), before);
    const retained = await checkpoint(f, s); assert.equal(retained.completed_read, null); assert.equal(retained.delivery, null); assert.equal(retained.context, saved.context);
  });
});
test("new source-page corruption retains the last accepted incomplete checkpoint", async t => {
  const f = await fixture(t), saved = await record(f, "😀данные".repeat(650));
  const args = { candidate_ref: f.draft.result.candidate_ref, record_ref: { kind: "decision", id: saved.result.decision_ref.id, revision: 1 } };
  for (const name of ["wrong digest", "same length text", "marker context", "wrong record"]) await t.test(name, async () => {
    const s = await f.open(saved.context), a = adapted(f, "product_candidate_record_get", corruption[name], 2);
    let page = await a.handlers.call(f.root, request(f, s, "product_candidate_record_get", args));
    while (!page.delivery.complete) page = await a.handlers.next(f.root, { session_ref: s.ref, expected_revision: page.session_revision, read_ref: page.read_ref });
    assert.equal(page.complete, false); const before = await snapshot(f.root);
    await assert.rejects(a.handlers.next(f.root, { session_ref: s.ref, expected_revision: page.session_revision, read_ref: page.read_ref }), e => ["INVALID_STATE", "SOURCE_CHANGED", "INVALID_CURSOR", "STALE_CURSOR"].includes(e.code));
    assert.deepEqual(await snapshot(f.root), before); assert.equal((await checkpoint(f, s)).completed_read, null);
  });
});
test("review delivery authenticates saved verdict, explicit digests, next index and unchanged context", async t => {
  const f = await fixture(t), started = await f.call("product_review_start", { context: f.draft.context, candidate_ref: f.draft.result.candidate_ref, mode: "full" });
  const faults = {
    "explicit digest": o => { o.result.verdict_object_sha256 = "0".repeat(64); o.result.object_sha256 = "0".repeat(64); },
    "saved verdict": o => { o.result.recorded_result = { item_key: o.result.item_key, verdict: "covered", explanation: "Forged", counterexample: null, evidence_refs: [], evidence_sources: [], read_receipt: "forged", inherited_from: null }; },
    "next item": o => { o.result.next_item_index = 1; },
    "marker context": corruption["marker context"],
  };
  for (const [name, fault] of Object.entries(faults)) await t.test(name, async () => {
    const s = await f.open(started.context), before = await snapshot(f.root), a = adapted(f, "product_review_get", fault);
    await assert.rejects(a.handlers.call(f.root, request(f, s, "product_review_get", { review_ref: started.result.review_ref, item_index: 0, representation: "explicit-v1" })), e => ["INVALID_STATE", "SOURCE_CHANGED", "INVALID_CURSOR", "STALE_CURSOR"].includes(e.code));
    assert.deepEqual(await snapshot(f.root), before); assert.equal((await checkpoint(f, s)).completed_read, null);
  });
});
test("context selection authenticates its first source headers and read envelope", async t => {
  const f = await fixture(t);
  const faults = {
    version: o => { o.result.source_version = "0".repeat(64); },
    purpose: o => { o.result.purpose = "implementation"; },
    product: o => { o.result.product_id = randomUUID(); },
    context: corruption["marker context"],
  };
  for (const [name, fault] of Object.entries(faults)) await t.test(name, async () => {
    const s = await f.open(), before = await snapshot(f.root), a = adapted(f, "product_context_prepare", fault);
    await assert.rejects(a.handlers.call(f.root, request(f, s, "product_context_prepare", { purpose: "review", artifact: "prd", required_refs: [], budget_bytes: 8192 })), e => ["INVALID_STATE", "SOURCE_CHANGED", "INVALID_CURSOR", "STALE_CURSOR"].includes(e.code));
    assert.deepEqual(await snapshot(f.root), before);
  });
});
test("invalid mutation context retains real unknown effects and consumes only one recovery attempt", async t => {
  const f = await fixture(t), s = await f.open(); let calls = 0;
  const handlers = productSessionHandlers(workflowTools.map(tool => tool.name !== "product_record_instruction" ? tool : { ...tool,
    async run(input) { calls += 1; const output = await withRoot(f.root, () => tool.run(input)); output.context = "<<ccr:mutation>>"; return output; },
  }));
  const args = { candidate_ref: f.draft.result.candidate_ref, text: "One applied decision.", source: "fixture", related_refs: [], affected_refs: [] };
  await assert.rejects(handlers.call(f.root, request(f, s, "product_record_instruction", args)), e => e.code === "RECOVERY_REQUIRED");
  let retained = await checkpoint(f, s); assert.equal(retained.state, "unknown"); assert.equal(retained.context, f.draft.context); assert.equal(retained.delivery, null); assert.equal(calls, 1);
  const effect = (await snapshot(f.root)).filter(([p]) => p.includes("/decisions/")); assert.equal(effect.length, 1);
  await assert.rejects(handlers.resume(f.root, { session_ref: s.ref, expected_revision: retained.revision }), e => e.code === "RECOVERY_REQUIRED");
  retained = await checkpoint(f, s); assert.equal(retained.state, "blocked"); assert.equal(retained.pending.recovery.attempts, 1); assert.equal(calls, 2);
  await assert.rejects(handlers.resume(f.root, { session_ref: s.ref, expected_revision: retained.revision }), e => e.code === "RECOVERY_REQUIRED");
  assert.equal(calls, 2); assert.deepEqual((await snapshot(f.root)).filter(([p]) => p.includes("/decisions/")), effect);
});

function reconstruct(portions) {
  const outputs = []; let body = "", offset = 0, total, identity;
  for (const p of portions) {
    identity ??= [p.session_ref, p.read_ref]; assert.deepEqual([p.session_ref, p.read_ref], identity);
    assert.equal(p.delivery.encoding, "json-utf8"); assert.equal(p.delivery.offset, offset);
    total ??= p.delivery.total_characters; assert.equal(p.delivery.total_characters, total);
    body += p.delivery.text; offset += Array.from(p.delivery.text).length;
    assert.ok(offset <= total); assert.equal(p.delivery.complete, offset === total);
    if (p.delivery.complete) { outputs.push(JSON.parse(body)); body = ""; offset = 0; total = undefined; }
  }
  assert.equal(body, ""); assert.equal(portions.at(-1)?.complete, true);
  const pages = outputs.filter(o => o.result.encoding === "canonical-json-utf8");
  if (pages.length) {
    let next = 0, text = ""; const first = pages[0];
    for (const o of pages) {
      for (const key of ["candidate_ref", "record_ref", "source_version", "source_object_sha256", "total_characters"]) assert.deepEqual(o.result[key], first.result[key]);
      assert.equal(o.context, first.context); assert.equal(o.result.offset, next);
      text += o.result.text; next += Array.from(o.result.text).length;
      assert.equal(o.result.complete, next === first.result.total_characters);
    }
    assert.equal(next, first.result.total_characters);
    assert.equal(createHash("sha256").update(text).digest("hex"), first.result.source_object_sha256);
    JSON.parse(text);
  }
  return outputs;
}
test("real public corpus round-trips nested schemas, opaque identities, Unicode and literal marker prose", async t => {
  const f = await fixture(t), saved = await record(f, "😀é данные quoted <<ccr:literal-prose>> ".repeat(190));
  const s = await f.open(saved.context), args = { candidate_ref: f.draft.result.candidate_ref, record_ref: { kind: "decision", id: saved.result.decision_ref.id, revision: 1 } };
  const direct = []; let cursor;
  do { const o = await f.call("product_candidate_record_get", { ...args, context: saved.context, ...(cursor ? { cursor } : {}) }); direct.push(o); cursor = o.result.next_cursor; } while (cursor);
  let page = await f.sessionCall(s, "product_candidate_record_get", args); const portions = [page];
  while (!page.complete) { page = await f.next(s, page.read_ref); portions.push(page); }
  const restored = reconstruct(portions); assert.deepEqual(restored, direct); assert.ok(direct.length > 1);
  const schema = new Ajv().compile(workflowTools.find(x => x.name === "product_candidate_record_get").outputSchema);
  for (const o of restored) assert.equal(schema(o), true);
  assert.match(restored.map(o => o.result.text).join(""), /<<ccr:literal-prose>>/u);
  const selection = await f.call("product_context_prepare", { context: f.initialized.context, purpose: "review", artifact: "idea", budget_bytes: 1024 });
  const selections = [selection]; cursor = selection.result.next_cursor;
  while (cursor) { const o = await f.call("product_context_next", { context: f.initialized.context, cursor }); selections.push(o); cursor = o.result.next_cursor; }
  const started = await f.call("product_review_start", { context: saved.context, candidate_ref: f.draft.result.candidate_ref, mode: "full" });
  const review = []; cursor = undefined;
  do { const o = await f.call("product_review_get", { context: started.context, review_ref: started.result.review_ref, item_index: 0, representation: "explicit-v1", ...(cursor ? { cursor } : {}) }); review.push(o); cursor = o.result.next_cursor; } while (cursor);
  assert.equal(typeof review.at(-1).result.read_receipt, "string");
  const published = await f.listTools();
  const corpus = { schema_version: 1, origin: "public MCP stdio owning outputs", published: published.tools.filter(x => ["product_candidate_record_get", "product_context_prepare", "product_review_get", "product_session_call"].includes(x.name)), saved, direct, portions, selections, review };
  if (process.env.EAW_Q13_CORPUS_DIR) { await mkdir(process.env.EAW_Q13_CORPUS_DIR, { recursive: true }); await writeFile(join(process.env.EAW_Q13_CORPUS_DIR, "corpus.json"), JSON.stringify(corpus, null, 2) + "\n"); }
  t.diagnostic(JSON.stringify({ source_pages: direct.length, session_portions: portions.length, context_pins: selections.reduce((n,o) => n+o.result.required.length+o.result.optional.length, 0), original_sha256: direct[0].result.source_object_sha256 }));
  let dependentCalls = 0;
  const harness = createSharedStdioHarness({ entrypoint: server, name: "wire-loss-fixture", createClient: async () => ({
    listTools: () => f.listTools(), close: async () => {},
    async callTool(input) { if (input.name === "product_record_instruction") dependentCalls += 1; const raw = await f.raw(input.name, input.arguments); if (input.name === "product_candidate_record_get") raw.content[0].text = raw.content[0].text.slice(0, -1); return raw; },
  }) });
  t.after(() => harness.close());
  const before = await snapshot(f.root), raw = await harness.callTool({ name: "product_candidate_record_get", arguments: { ...args, context: saved.context } });
  const consume = async delivered => {
    const complete = reconstruct(delivered);
    const result = await harness.callTool({ name: "product_record_instruction", arguments: { context: saved.context, candidate_ref: f.draft.result.candidate_ref, text: "Dependent verified read.", source: "fixture", related_refs: [], affected_refs: [] } });
    assert.notEqual(result.isError,true); assert.equal(result.structuredContent.result.applied,true);
    return complete;
  };
  await assert.rejects(async () => { JSON.parse(raw.content[0].text); await consume(portions); });
  assert.equal(dependentCalls, 0); assert.deepEqual(await snapshot(f.root), before);
  for (const fault of ["drop", "reorder", "duplicate", "opaque", "digest", "recursive"]) {
    const broken = globalThis.structuredClone(portions);
    if (fault === "drop") broken.pop();
    if (fault === "reorder") [broken[0], broken[1]] = [broken[1], broken[0]];
    if (fault === "duplicate") broken.splice(1,0,globalThis.structuredClone(broken[0]));
    if (fault === "opaque") broken[0].read_ref = "<<ccr:opaque>>";
    if (fault === "digest") broken[0].delivery.text = broken[0].delivery.text.replace(direct[0].result.source_object_sha256, "0".repeat(64));
    if (fault === "recursive") broken[0].delivery.text = "<<ccr:original-is-marker>>";
    await assert.rejects(consume(broken), undefined, fault); assert.equal(dependentCalls, 0);
  }
  assert.deepEqual(await snapshot(f.root), before);
  assert.deepEqual(await consume(portions),direct); assert.equal(dependentCalls,1);
  const effectsBefore = before.filter(([path])=>path.includes("/decisions/")).length;
  assert.equal((await snapshot(f.root)).filter(([path])=>path.includes("/decisions/")).length,effectsBefore+1,"the same consumer must actually dispatch exactly one effect after complete verified reconstruction");
});
test("cached retransmission remains exact without dispatch after owning state advances", async t => {
  const f = await fixture(t), saved = await record(f, "😀данные".repeat(650)), s = await f.open(saved.context);
  const a = adapted(f, "product_candidate_record_get", () => {});
  let page = await a.handlers.call(f.root, request(f, s, "product_candidate_record_get", { candidate_ref: f.draft.result.candidate_ref, record_ref: { kind: "decision", id: saved.result.decision_ref.id, revision: 1 } }));
  for (const phase of ["first", "intermediate", "final"]) {
    if (phase === "intermediate") page = await a.handlers.next(f.root, { session_ref: s.ref, expected_revision: page.session_revision, read_ref: page.read_ref });
    if (phase === "final") while (!page.complete) page = await a.handlers.next(f.root, { session_ref: s.ref, expected_revision: page.session_revision, read_ref: page.read_ref });
    const calls = a.calls(), before = await snapshot(f.root);
    assert.deepEqual(await a.handlers.resume(f.root, { session_ref: s.ref, expected_revision: page.session_revision }), page);
    assert.equal(a.calls(), calls); assert.deepEqual(await snapshot(f.root), before);
  }
  await f.call("product_record_instruction", { context: saved.context, candidate_ref: f.draft.result.candidate_ref, text: "Owning state advanced.", source: "fixture", related_refs: [], affected_refs: [] });
  const before = await snapshot(f.root), calls = a.calls();
  assert.deepEqual(await a.handlers.resume(f.root, { session_ref: s.ref, expected_revision: page.session_revision }), page);
  assert.equal(a.calls(), calls); assert.deepEqual(await snapshot(f.root), before);
});

test("nonpaged read acknowledgements must satisfy their actual published schema", async t => {
  const f = await fixture(t), s = await f.open(), before = await snapshot(f.root);
  const a = adapted(f, "product_interview_resume", o => { o.unpublished = "<<ccr:schema-loss>>"; });
  await assert.rejects(a.handlers.call(f.root, request(f, s, "product_interview_resume", { candidate_ref: f.draft.result.candidate_ref })), e => e.code === "INVALID_STATE");
  assert.deepEqual(await snapshot(f.root), before); assert.equal(a.calls(), 1);
});

// Seed isolated retained data through existing storage owners; all observed
// delivery values below are produced by the actual public scenario readers.
async function seedPinBase(f, expanded = false) {
  const context = JSON.parse(Buffer.from(f.draft.context, "base64url").toString()), documents = [], bodies = new Map();
  for (let i = 0; i < 12; i += 1) {
    const object = await saveObject(f.root, { productId: context.product_id, kind: "markdown", bytes: Buffer.from(`# Source ${i} 😀\n`) });
    documents.push({ id: randomUUID(), artifact: "idea", role: "navigation", subject: `Navigation ${i}`, relative_path: `idea/navigation-${i}.md`, object_sha256: object.sha256 });
    bodies.set(`idea/navigation-${i}.md`, `# Source ${i} 😀\n`);
  }
  const source = expanded ? "# Semantic source\n\n" + Array.from({ length: 3 }, (_, i) => `### IDEA-000${i + 1}: Exact delivery ${i}\n\n${"😀é данные <<ccr:literal>> ".repeat(550)}\n`).join("\n") : "# Semantic source\n\n### IDEA-0001: Exact delivery\n\nExplicit fixture outcome.\n";
  const semantic = await saveObject(f.root, { productId: context.product_id, kind: "markdown", bytes: Buffer.from(source) });
  documents.push({ id: randomUUID(), artifact: "idea", role: "semantic", subject: "Semantic", relative_path: "idea/semantic.md", object_sha256: semantic.sha256 });
  bodies.set("idea/semantic.md", source);
  const metadata = Array.from({ length: expanded ? 3 : 1 }, (_, i) => ({ ref: { product_id: context.product_id, artifact: "idea", element_id: `IDEA-000${i + 1}` }, semantic_type: "IdeaProblem", applicability: { state: "current", stage_refs: [], global: true, reason: "Isolated fixture." }, provenance: [], state: "active" }));
  const heads = [];
  if (expanded) for (let i = 0; i < 3; i += 1) {
    const ref = { product_id: context.product_id, artifact: "idea", id: randomUUID(), revision: i + 1 };
    const decision = { schema_version: 1, kind: "decision", ref, state: "answered", category: "fixture", question: null, text: `Exact decision ${i}\n${Array.from("😀é данные <<ccr:literal>> ".repeat(550)).slice(0, 8100).join("")}`, source: "Isolated storage fixture", selected_ids: [], predecessors: [], affected_refs: [], reconsider_when: null, candidate_id: f.draft.result.candidate_ref.candidate_id };
    const saved = await saveObject(f.root, { productId: context.product_id, kind: "decision", artifact: "idea", decisionId: ref.id, revision: ref.revision, bytes: Buffer.from(JSON.stringify(decision) + "\n") });
    heads.push({ decision_ref: ref, object_sha256: saved.sha256 });
  }
  const registry = await saveObject(f.root, { productId: context.product_id, kind: "record", bytes: Buffer.from(JSON.stringify({ schema_version: 1, kind: "registry", product_id: context.product_id, documents, element_metadata: metadata }) + "\n") });
  const generation = await saveGeneration(f.root, { schema_version: 1, kind: "generation", product_id: context.product_id, parent: context.target_revision,
    registry: { id: randomUUID(), object_sha256: registry.sha256 }, ready_artifacts: [{ artifact: "idea", source_version: createHash("sha256").update(JSON.stringify(documents)).digest("hex"), review_id: randomUUID(), upstream_pins: [] }], decision_heads: heads, relations: [] });
  const path = join(f.root, "products", context.product_id, "drafts", f.draft.result.candidate_ref.candidate_id, "candidate.yaml");
  const candidate = JSON.parse(await readFile(path, "utf8")); candidate.base_generation = generation.sha256;
  if (expanded) {
    candidate.registry = { id: candidate.registry.id, object_sha256: registry.sha256 };
    const folder = join(f.root, "products", context.product_id, "drafts", f.draft.result.candidate_ref.candidate_id, "documents");
    await rm(folder, { recursive: true, force: true });
    for (const [relative, body] of bodies) {
      const file = join(folder, relative);
      await mkdir(join(folder, "idea"), { recursive: true }); await writeFile(file, body);
    }
  }
  candidate.source_version = createHash("sha256").update(JSON.stringify(Object.fromEntries(Object.entries(candidate).filter(([k]) => k !== "source_version"))) + "\n").digest("hex");
  await writeFile(path, JSON.stringify(candidate) + "\n"); context.target_revision = generation.sha256; context.selected_sources_sha256 = candidate.source_version;
  return Buffer.from(JSON.stringify(context)).toString("base64url");
}
test("context pin identities, digests and continuation pages agree with the exact owning selection", async t => {
  const f = await fixture(t), context = await seedPinBase(f), args = { purpose: "review", artifact: "idea", required_refs: [], budget_bytes: 1024 };
  const positive = await f.open(context), actual = await f.collect(positive, await f.sessionCall(positive, "product_context_prepare", args));
  assert.ok(actual.length > 1); assert.equal(actual.at(-1).result.complete, true);
  assert.equal(actual.reduce((n,o) => n+o.result.optional.length,0),12); assert.equal(actual.reduce((n,o) => n+o.result.required.length,0),1);
  if (process.env.EAW_Q13_CORPUS_DIR) await writeFile(join(process.env.EAW_Q13_CORPUS_DIR, "context-pin-corpus.json"), JSON.stringify({ origin: "public stdio outputs from isolated seeded retained fixture", inputs: { context, args }, portions: actual }, null, 2) + "\n");
  for (const ordinal of [1,2,actual.length]) for (const field of ["source_id", "object_sha256", "generation", "product_id", "element_ids"]) await t.test(`${ordinal}:${field}`, async () => {
    const s = await f.open(context), a = adapted(f, ordinal === 1 ? "product_context_prepare" : "product_context_next", o => { (o.result.required[0] ?? o.result.optional[0])[field] = field === "element_ids" ? ["IDEA-9999"] : field.endsWith("id") ? randomUUID() : "0".repeat(64); }, ordinal === 1 ? 1 : ordinal - 1);
    const before = await snapshot(f.root), req = request(f,s,"product_context_prepare",args);
    if (ordinal === 1) { await assert.rejects(a.handlers.call(f.root,req), e => e.code === "SOURCE_CHANGED"); assert.deepEqual(await snapshot(f.root),before); }
    else {
      let p = await a.handlers.call(f.root,req);
      while (!p.delivery.complete) p = await a.handlers.next(f.root,{session_ref:s.ref,expected_revision:p.session_revision,read_ref:p.read_ref});
      for (let n = 2; n < ordinal; n += 1) { p = await a.handlers.next(f.root,{session_ref:s.ref,expected_revision:p.session_revision,read_ref:p.read_ref}); while (!p.delivery.complete) p = await a.handlers.next(f.root,{session_ref:s.ref,expected_revision:p.session_revision,read_ref:p.read_ref}); }
      const partial = await snapshot(f.root); assert.equal(p.complete,false);
      await assert.rejects(a.handlers.next(f.root,{session_ref:s.ref,expected_revision:p.session_revision,read_ref:p.read_ref}),e=>e.code === "SOURCE_CHANGED");
      assert.deepEqual(await snapshot(f.root),partial);
    }
    assert.equal((await checkpoint(f,s)).completed_read,null);
  });
});

test("public research records retain nested canonical JSON, Unicode and quoted marker bytes", async t => {
  const f = await fixture(t), q = await f.call("product_question_prepare", { context: f.draft.context, candidate_ref: f.draft.result.candidate_ref, category: "research", text: "Which bounded source applies?", options: [] });
  const evidence = { question_ref: q.result.question_ref, conclusion: "Synthetic fixture conclusion 😀 ".repeat(20), sources: Array.from({length:4},(_,i) => ({ url: `https://example.invalid/fixture-${i}`, checked_date: "2026-10-12", version_applicability: "Isolated fixture only.", finding: "Unicode é and quoted <<ccr:research-prose>> ".repeat(25) })), uncertainty: ["No external source was consulted."], limitations: ["Simulation only; no semantic research assertion."] };
  const saved = await f.call("product_record_research", { context: q.context, candidate_ref: f.draft.result.candidate_ref, evidence }), s = await f.open(saved.context);
  const first = await f.sessionCall(s,"product_candidate_record_get",{candidate_ref:f.draft.result.candidate_ref,record_ref:{kind:"research",id:saved.result.decision_ref.id,revision:saved.result.decision_ref.revision}});
  let p = first;const portions=[p];while (!p.complete) {p=await f.next(s,p.read_ref);portions.push(p);}
  const outputs = reconstruct(portions), parsed = JSON.parse(outputs.map(o=>o.result.text).join(""));
  assert.ok(outputs.length>1);assert.deepEqual(JSON.parse(parsed.text),evidence);
  assert.equal((await checkpoint(f,s)).completed_read,null);
  if (process.env.EAW_Q13_CORPUS_DIR) await writeFile(join(process.env.EAW_Q13_CORPUS_DIR,"research-corpus.json"),JSON.stringify({origin:"public stdio author and reader outputs from isolated fixture",q,saved,portions,outputs},null,2)+"\n");
});

async function finishHandlerDelivery(handlers, f, s, page) {
  let text = page.delivery.text;
  while (!page.complete) {
    page = await handlers.next(f.root, { session_ref: s.ref, expected_revision: page.session_revision, read_ref: page.read_ref });
    text += page.delivery.text;
  }
  return { page, output: JSON.parse(text) };
}
function evidenceCount(values) { return values.filter(([path]) => path.includes("/decisions/")).length; }
test("all registered owning source readers authenticate initial, continued and final envelopes", async t => {
  const f = await fixture(t);
  const context = await seedPinBase(f, true), selected = JSON.parse(Buffer.from(context, "base64url").toString());
  selected.candidate_ref = null;
  const readyContext = Buffer.from(JSON.stringify(selected)).toString("base64url");
  const elements = await f.call("product_element_find", { context: readyContext, artifact: "idea", text: "Exact", limit: 1 });
  const decisions = await f.call("product_decision_find", { context: readyContext, artifact: "idea", text: "Exact", limit: 1 });
  const selection = await f.call("product_context_prepare", { context: readyContext, purpose: "review", artifact: "idea", required_refs: [elements.result.items[0].ref], budget_bytes: 8192 });
  const pin = selection.result.required.find(p => p.source_kind === "markdown");
  const cases = [
    ["product_element_get", { element_ref: elements.result.items[0].ref, pin }],
    ["product_decision_get", { decision_ref: decisions.result.items[0].decision_ref }],
    ["product_element_find", { artifact: "idea", text: "Exact", limit: 1 }],
    ["product_decision_find", { artifact: "idea", text: "Exact", limit: 1 }],
    ["product_document_list", { artifact: "idea", limit: 1 }],
  ];
  for (const [scenario, args] of cases) {
    const ownerContext = scenario === "product_document_list" ? context : readyContext;
    const direct = []; let cursor;
    do {
      const output = await f.call(scenario, { context: ownerContext, ...args, ...(cursor ? { cursor } : {}) });
      direct.push(output); cursor = output.result.next_cursor;
    } while (cursor);
    assert.ok(direct.length >= 3, `${scenario} must exercise first, middle and terminal source pages`);
    const validate = new Ajv().compile(workflowTools.find(tool => tool.name === scenario).outputSchema);
    const portion = scenario.endsWith("_get");
    const faults = portion ? {
      text: o => { o.result.text = "x".repeat(Array.from(o.result.text).length); },
      digest: o => { o.result.pin.object_sha256 = "0".repeat(64); },
      identity: o => { o.result.pin.source_id = randomUUID(); },
      generation: o => { o.result.pin.generation = "0".repeat(64); },
      selector: o => { if (scenario === "product_element_get") o.result.pin.element_ids = ["IDEA-9999"]; else o.result.pin.decision_ref.revision += 1; },
    } : {
      title: o => { o.result.items[0].title = "Altered same owning inventory"; },
      identity: o => { const item = o.result.items[0]; if (item.ref) item.ref.element_id = "IDEA-9999"; else if (item.decision_ref) item.decision_ref.id = randomUUID(); else item.document.id = randomUUID(); },
      revisionOrDigest: o => { const item = o.result.items[0]; if (item.decision_ref) item.decision_ref.revision += 1; else item.document.object_sha256 = "0".repeat(64); },
      sourceVersion: o => { o.result.source_version = "0".repeat(64); },
    };
    faults.replayed = o => { o.replayed = true; };
    faults.operation = o => { o.operation_ref = randomUUID(); };
    faults.cursor = o => {
      if (o.result.next_cursor === null) return;
      if (scenario === "product_document_list") {
        const c = JSON.parse(Buffer.from(o.result.next_cursor, "base64url").toString()); c.source_version = "0".repeat(64);
        o.result.next_cursor = Buffer.from(JSON.stringify(c)).toString("base64url");
      } else {
        const bytes = Buffer.from(o.result.next_cursor, "base64url"), c = JSON.parse(inflateRawSync(bytes.subarray(8)).toString());
        c.v = "0".repeat(64);
        const serialized = Buffer.from(JSON.stringify(c));
        o.result.next_cursor = Buffer.concat([createHash("sha256").update(serialized).digest().subarray(0,8), deflateRawSync(serialized)]).toString("base64url");
      }
    };
    await t.test(`${scenario}:honest`, async () => {
      const s = await f.open(context), a = adapted(f, scenario, () => {});
      let page = await a.handlers.call(f.root, request(f, s, scenario, args)), text = "", outputs = [];
      for (;;) {
        text += page.delivery.text;
        if (page.delivery.complete) { outputs.push(JSON.parse(text)); text = ""; }
        if (page.complete) break;
        page = await a.handlers.next(f.root, { session_ref: s.ref, expected_revision: page.session_revision, read_ref: page.read_ref });
      }
      assert.deepEqual(outputs, direct); assert.equal(a.calls(), direct.length);
      assert.equal((await checkpoint(f, s)).completed_read, null);
      const before = await snapshot(f.root);
      assert.deepEqual(await a.handlers.resume(f.root, { session_ref: s.ref, expected_revision: page.session_revision }), page);
      assert.equal(a.calls(), direct.length); assert.deepEqual(await snapshot(f.root), before);
    });
    for (const ordinal of [1, 2, direct.length]) for (const [name, fault] of Object.entries(faults)) {
      if (name === "cursor" && ordinal === direct.length) continue;
      await t.test(`${scenario}:${ordinal}:${name}`, async () => {
        const altered = globalThis.structuredClone(direct[ordinal - 1]); fault(altered);
        assert.notDeepEqual(altered, direct[ordinal - 1]); assert.equal(validate(altered), true, JSON.stringify(validate.errors));
        const s = await f.open(context), a = adapted(f, scenario, fault, ordinal);
        const before = await snapshot(f.root), original = await checkpoint(f, s), req = request(f, s, scenario, args);
        if (ordinal === 1) {
          await assert.rejects(a.handlers.call(f.root, req), e => ["SOURCE_CHANGED", "STALE_CURSOR", "INVALID_CURSOR"].includes(e.code));
          assert.deepEqual(await snapshot(f.root), before); assert.deepEqual(await checkpoint(f, s), original);
        } else {
          let page = await a.handlers.call(f.root, req);
          for (let accepted = 1; accepted < ordinal; accepted += 1) {
            while (!page.delivery.complete) page = await a.handlers.next(f.root, { session_ref: s.ref, expected_revision: page.session_revision, read_ref: page.read_ref });
            if (accepted < ordinal - 1) page = await a.handlers.next(f.root, { session_ref: s.ref, expected_revision: page.session_revision, read_ref: page.read_ref });
          }
          assert.equal(page.complete, false);
          const partial = await snapshot(f.root), retained = await checkpoint(f, s);
          await assert.rejects(a.handlers.next(f.root, { session_ref: s.ref, expected_revision: page.session_revision, read_ref: page.read_ref }), e => ["SOURCE_CHANGED", "STALE_CURSOR", "INVALID_CURSOR"].includes(e.code));
          assert.deepEqual(await snapshot(f.root), partial); assert.deepEqual(await checkpoint(f, s), retained);
        }
        assert.equal(a.calls(), ordinal); assert.equal((await checkpoint(f, s)).completed_read, null);
      });
    }
  }
});
test("known evidence operation acknowledgements preserve exact identity and recover one real effect", async t => {
  for (const mode of ["honest", "foreign", "null"]) await t.test(mode, async sub => {
    const f = await fixture(sub), s = await f.open(); let dispatches = 0, actual;
    const handlers = productSessionHandlers(workflowTools.map(tool => ({ ...tool, async run(input) {
      const output = globalThis.structuredClone(await withRoot(f.root, () => tool.run(input)));
      if (tool.name === "product_record_instruction") {
        dispatches += 1; actual ??= output.operation_ref;
        if (dispatches === 1 && mode !== "honest") output.operation_ref = mode === "null" ? null : randomUUID();
      }
      return output;
    } })));
    const before = await snapshot(f.root), original = await checkpoint(f,s);
    const args = { candidate_ref: f.draft.result.candidate_ref, text: "Exactly one retained operation effect.", source: "fixture", related_refs: [], affected_refs: [] };
    let page;
    if (mode === "honest") page = await handlers.call(f.root,request(f,s,"product_record_instruction",args));
    else {
      await assert.rejects(handlers.call(f.root,request(f,s,"product_record_instruction",args)), error => error.code === "RECOVERY_REQUIRED" && error.details.operation_ref === actual);
      const pending = await checkpoint(f,s);
      assert.equal(pending.state,"unknown"); assert.equal(pending.pending.operation_ref,actual);
      assert.equal(pending.context,original.context); assert.equal(pending.delivery,null); assert.equal(pending.completed_read,null);
      assert.equal(pending.pending.recovery.attempts,0); assert.equal(dispatches,1);
      assert.equal(evidenceCount(await snapshot(f.root))-evidenceCount(before),1);
      page = await handlers.resume(f.root,{session_ref:s.ref,expected_revision:pending.revision});
    }
    const restored = await finishHandlerDelivery(handlers,f,s,page), after = await checkpoint(f,s);
    assert.equal(restored.output.operation_ref,actual); assert.equal(restored.output.result.operation_ref,actual);
    assert.equal(after.pending.operation_ref,actual); assert.equal(after.state,"acknowledged");
    assert.equal(after.pending.recovery.attempts,mode === "honest" ? 0 : 1);
    assert.equal(dispatches,mode === "honest" ? 1 : 2);
    assert.equal(evidenceCount(await snapshot(f.root))-evidenceCount(before),1);
    const accepted = await snapshot(f.root), calls = dispatches;
    assert.deepEqual(await handlers.resume(f.root,{session_ref:s.ref,expected_revision:after.revision}),restored.page);
    assert.equal(dispatches,calls); assert.deepEqual(await snapshot(f.root),accepted);
  });
});
test("known evidence operation exception metadata cannot replace the computed identity", async t => {
  for (const mode of ["matching", "foreign", "absent"]) await t.test(mode, async sub => {
    const f = await fixture(sub), s = await f.open(); let dispatches = 0, actual;
    const handlers = productSessionHandlers(workflowTools.map(tool => ({ ...tool, async run(input) {
      const output = await withRoot(f.root, () => tool.run(input));
      if (tool.name === "product_record_instruction") {
        dispatches += 1; actual ??= output.operation_ref;
        if (dispatches === 1) throw new WorkflowError("RECOVERY_REQUIRED","Isolated post-effect exception.",mode === "absent" ? {} : {operation_ref:mode === "foreign" ? randomUUID() : actual});
      }
      return output;
    } })));
    const before = await snapshot(f.root), original = await checkpoint(f,s);
    const args = {candidate_ref:f.draft.result.candidate_ref,text:"One retained exception effect.",source:"fixture",related_refs:[],affected_refs:[]};
    await assert.rejects(handlers.call(f.root,request(f,s,"product_record_instruction",args)),error => error.code === "RECOVERY_REQUIRED" && error.details.operation_ref === actual);
    const pending = await checkpoint(f,s);
    assert.equal(pending.pending.operation_ref,actual); assert.equal(pending.state,"unknown"); assert.equal(pending.context,original.context);
    assert.equal(pending.delivery,null); assert.equal(pending.completed_read,null); assert.equal(pending.pending.recovery.attempts,0); assert.equal(dispatches,1);
    assert.equal(evidenceCount(await snapshot(f.root))-evidenceCount(before),1);
    const restored = await finishHandlerDelivery(handlers,f,s,await handlers.resume(f.root,{session_ref:s.ref,expected_revision:pending.revision}));
    const accepted = await checkpoint(f,s); assert.equal(accepted.pending.operation_ref,actual); assert.equal(accepted.pending.recovery.attempts,1);
    assert.equal(restored.output.operation_ref,actual); assert.equal(dispatches,2);
    const after = await snapshot(f.root); assert.equal(evidenceCount(after)-evidenceCount(before),1);
    assert.deepEqual(await handlers.resume(f.root,{session_ref:s.ref,expected_revision:accepted.revision}),restored.page);
    assert.equal(dispatches,2); assert.deepEqual(await snapshot(f.root),after);
  });
});
test("operations unknown before dispatch retain their existing acknowledgement and exception behavior", async t => {
  for (const mode of ["honest", "exception"]) await t.test(mode, async sub => {
    const f = await fixture(sub), s = await f.open(); let actual, calls = 0;
    const handlers = productSessionHandlers(workflowTools.map(tool => ({ ...tool, async run(input) {
      const output = await withRoot(f.root,()=>tool.run(input));
      if (tool.name === "product_question_prepare") { actual = output.operation_ref; calls += 1; if (mode === "exception") throw new WorkflowError("RECOVERY_REQUIRED","Isolated unknown-before-dispatch operation.",{operation_ref:actual}); }
      return output;
    } })));
    const req = request(f,s,"product_question_prepare",{candidate_ref:f.draft.result.candidate_ref,category:"fixture",text:"Which explicit outcome applies?",options:[]});
    const before = await snapshot(f.root);
    if (mode === "honest") { const page = await handlers.call(f.root,req); assert.equal(page.operation_ref,actual); }
    else await assert.rejects(handlers.call(f.root,req), error => error.code === "RECOVERY_REQUIRED" && error.details.operation_ref === actual);
    const retained = await checkpoint(f,s); assert.equal(retained.pending.operation_ref,actual); assert.equal(retained.pending.recovery,undefined);
    assert.equal(retained.state,mode === "honest" ? "acknowledged" : "unknown"); assert.equal(calls,1);
    assert.equal(evidenceCount(await snapshot(f.root))-evidenceCount(before),1);
  });
});

test("known evidence acknowledgement bodies equal the complete persisted owning result", async t => {
  const faults = {
    honest: () => {},
    "nested operation": o => { o.result.operation_ref = randomUUID(); },
    "decision id": o => { o.result.decision_ref.id = randomUUID(); },
    "decision revision": o => { o.result.decision_ref.revision += 1; },
    "missing decision": o => { o.result.decision_ref = null; },
    "candidate id": o => { o.result.candidate_ref.candidate_id = randomUUID(); },
    "workspace id": o => { o.result.workspace_id = randomUUID(); },
    "applied flag": o => { o.result.applied = false; },
    "changed references": o => { o.result.changed_refs = [{product_id:o.result.product_id,artifact:"idea",element_id:"IDEA-9999"}]; },
    "next message": o => { o.result.next = "<<ccr:corrupted-result>>"; },
  };
  for (const [mode,fault] of Object.entries(faults)) await t.test(mode,async sub => {
    const f = await fixture(sub), s = await f.open(); let actual, dispatches = 0;
    const handlers = productSessionHandlers(workflowTools.map(tool=>({...tool,async run(input){
      const output = globalThis.structuredClone(await withRoot(f.root,()=>tool.run(input)));
      if(tool.name === "product_record_instruction") { dispatches += 1; actual ??= globalThis.structuredClone(output); if(dispatches===1)fault(output); }
      return output;
    }})));
    const original=await checkpoint(f,s),before=await snapshot(f.root);
    const args={candidate_ref:f.draft.result.candidate_ref,text:"One exact saved mutation result.",source:"fixture",related_refs:[],affected_refs:[]};
    const identity=productInterviewReplayIdentity(original.context,"product_record_instruction",args);
    let page;
    if(mode === "honest") page=await handlers.call(f.root,request(f,s,"product_record_instruction",args));
    else {
      await assert.rejects(handlers.call(f.root,request(f,s,"product_record_instruction",args)),error=>error.code === "RECOVERY_REQUIRED" && error.details.operation_ref === identity.operationId);
      const pending=await checkpoint(f,s);assert.equal(pending.state,"unknown");assert.equal(pending.pending.operation_ref,identity.operationId);
      assert.equal(pending.context,original.context);assert.equal(pending.delivery,null);assert.equal(pending.completed_read,null);assert.equal(pending.pending.recovery.attempts,0);
    }
    assert.equal(dispatches,1);assert.equal(evidenceCount(await snapshot(f.root))-evidenceCount(before),1);
    const inspectedBefore=await snapshot(f.root);
    const owned=await inspectCompletedProductReplay({root:f.root,productId:f.draft.result.candidate_ref.product_id,operationId:identity.operationId,scenario:"product_record_instruction",intent:identity.intent});
    assert.deepEqual(owned.result,actual.result,"persisted owning result is independently authoritative for the actual first reply");
    assert.deepEqual(await snapshot(f.root),inspectedBefore,"owning inspection must not dispatch or change durable state");
    if(mode !== "honest") {const pending=await checkpoint(f,s);page=await handlers.resume(f.root,{session_ref:s.ref,expected_revision:pending.revision});}
    const restored=await finishHandlerDelivery(handlers,f,s,page),accepted=await checkpoint(f,s);
    assert.deepEqual(restored.output.result,owned.result);assert.equal(restored.output.operation_ref,identity.operationId);
    assert.equal(accepted.pending.operation_ref,identity.operationId);assert.equal(accepted.pending.recovery.attempts,mode === "honest" ? 0 : 1);
    assert.equal(dispatches,mode === "honest" ? 1 : 2);const after=await snapshot(f.root);assert.equal(evidenceCount(after)-evidenceCount(before),1);
    assert.deepEqual(await handlers.resume(f.root,{session_ref:s.ref,expected_revision:accepted.revision}),restored.page);
    assert.equal(dispatches,mode === "honest" ? 1 : 2);assert.deepEqual(await snapshot(f.root),after);
  });
});
