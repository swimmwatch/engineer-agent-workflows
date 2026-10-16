import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { fileURLToPath, URL } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { workflowTools } from "../dist/server.js";
import { productSessionHandlers } from "../dist/product/sessions.js";
import { verifyProductReviewDelivery } from "../dist/product/review.js";
import Ajv from "ajv";

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
  return { directory, root, workspace, initialized, draft, open, call, raw, sessionCall, next, collect,
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
async function metadataSnapshot(root, relative = "") {
  const current = await stat(join(root, relative));
  const result = [[relative, current.mode, current.mtimeMs, current.ctimeMs]];
  if (current.isDirectory()) for (const entry of (await readdir(join(root, relative))).sort()) result.push(...await metadataSnapshot(root, relative ? `${relative}/${entry}` : entry));
  return result;
}
test("public sessions carry the latest acknowledged context across dependent writes and restart", async (t) => {
  const f = await fixture(t);
  const s = await f.open();
  const a = await f.collect(s, await f.sessionCall(s, "product_record_instruction", { candidate_ref: f.draft.result.candidate_ref, text: "First exact instruction.", source: "fixture", related_refs: [], affected_refs: [] }));
  assert.equal(a.length, 1);
  await f.restart();
  const b = await f.collect(s, await f.sessionCall(s, "product_record_instruction", { candidate_ref: f.draft.result.candidate_ref, text: "Second exact instruction.", source: "fixture", related_refs: [], affected_refs: [] }));
  assert.notEqual(a[0].context, b[0].context);
  const status = await f.call("product_session_status", { session_ref: s.ref });
  assert.equal(status.result.state, "acknowledged");
  assert.equal(status.result.session_revision, s.revision);
});
test("invalid dispatch preserves context and candidate isolation; stale actors require explicit reopening", async (t) => {
  const f = await fixture(t);
  const a = await f.open();
  const b = await f.open();
  const before = await snapshot(f.root);
  const invalid = await f.raw("product_session_call", { session_ref: a.ref, expected_revision: a.revision, request_id: randomUUID(), scenario: "product_record_instruction", arguments: { candidate_ref: { ...f.draft.result.candidate_ref, candidate_id: randomUUID() }, text: "Foreign mutation.", source: "fixture", related_refs: [], affected_refs: [] } });
  assert.equal(invalid.isError, true);
  assert.deepEqual(await snapshot(f.root), before);
  const written = await f.collect(a, await f.sessionCall(a, "product_record_instruction", { candidate_ref: f.draft.result.candidate_ref, text: "Current writer.", source: "fixture", related_refs: [], affected_refs: [] }));
  const stale = await f.raw("product_session_call", { session_ref: b.ref, expected_revision: b.revision, request_id: randomUUID(), scenario: "product_record_instruction", arguments: { candidate_ref: f.draft.result.candidate_ref, text: "Stale intention.", source: "fixture", related_refs: [], affected_refs: [] } });
  assert.equal(stale.structuredContent.error.code, "CONFLICT");
  const c = await f.open(written[0].context);
  await f.collect(c, await f.sessionCall(c, "product_interview_resume", { candidate_ref: f.draft.result.candidate_ref }));
});
test("bounded record delivery reconstructs every exact Unicode byte and blocks writes until terminal delivery", async (t) => {
  const f = await fixture(t);
  const s = await f.open();
  const [saved] = await f.collect(s, await f.sessionCall(s, "product_record_instruction", { candidate_ref: f.draft.result.candidate_ref, text: "😀данные".repeat(650), source: "fixture", related_refs: [], affected_refs: [] }));
  const args = { candidate_ref: f.draft.result.candidate_ref, record_ref: { kind: "decision", id: saved.result.decision_ref.id, revision: saved.result.decision_ref.revision } };
  const direct = [];
  let cursor;
  do { const page = await f.call("product_candidate_record_get", { context: saved.context, ...args, ...(cursor ? { cursor } : {}) }); direct.push(page.result.text); cursor = page.result.next_cursor; } while (cursor);
  const first = await f.sessionCall(s, "product_candidate_record_get", args);
  assert.equal(first.complete, false);
  const blocked = await f.raw("product_session_call", { session_ref: s.ref, expected_revision: s.revision, request_id: randomUUID(), scenario: "product_record_instruction", arguments: { candidate_ref: f.draft.result.candidate_ref, text: "Must wait.", source: "fixture", related_refs: [], affected_refs: [] } });
  assert.equal(blocked.structuredContent.error.code, "PREREQUISITE_REQUIRED");
  const wrong = await f.raw("product_session_next", { session_ref: s.ref, expected_revision: s.revision, read_ref: randomUUID() });
  assert.equal(wrong.isError, true);
  const pages = await f.collect(s, first);
  assert.equal(pages.map((p) => p.result.text).join(""), direct.join(""));
  assert.ok(pages.length > 1);
  assert.equal(pages.at(-1).result.complete, true);
});
test("sessions do not fabricate answers or verdicts and status is strictly read only", async (t) => {
  const f = await fixture(t);
  const s = await f.open();
  const before = await snapshot(f.root);
  const metadataBefore = await metadataSnapshot(f.root);
  for (const scenario of ["product_session_call", "product_initialize", "product_operation_resume", "arbitrary_command"]) {
    const r = await f.raw("product_session_call", { session_ref: s.ref, expected_revision: s.revision, request_id: randomUUID(), scenario, arguments: {} });
    assert.equal(r.isError, true);
  }
  await f.call("product_session_status", { session_ref: s.ref });
  assert.deepEqual(await snapshot(f.root), before);
  assert.deepEqual(await metadataSnapshot(f.root), metadataBefore);
  const incomplete = await f.raw("product_session_call", { session_ref: s.ref, expected_revision: s.revision, request_id: randomUUID(), scenario: "product_question_answer", arguments: { candidate_ref: f.draft.result.candidate_ref } });
  assert.equal(incomplete.isError, true);
  assert.deepEqual(await snapshot(f.root), before);
});
test("two candidate identities retain their own contexts without cross-session effects", async (t) => {
  const f = await fixture(t);
  const first = await f.open();
  const workspace = join(f.directory, "other-workspace");
  await initializeWorkspace(workspace);
  const product = await f.call("product_initialize", { workspace, name: "Other actor", known_idea: "Keep contexts independent." });
  const other = await f.call("product_artifact_draft", { context: product.context, artifact: "idea", upstream_pins: [] });
  const second = await f.open(other.context, other.result.candidate_ref);
  const [one] = await f.collect(first, await f.sessionCall(first, "product_record_instruction", { candidate_ref: f.draft.result.candidate_ref, text: "First actor only.", source: "fixture", related_refs: [], affected_refs: [] }));
  const [two] = await f.collect(second, await f.sessionCall(second, "product_record_instruction", { candidate_ref: other.result.candidate_ref, text: "Second actor only.", source: "fixture", related_refs: [], affected_refs: [] }));
  assert.equal(one.result.decision_ref.product_id, f.draft.result.candidate_ref.product_id);
  assert.equal(two.result.decision_ref.product_id, other.result.candidate_ref.product_id);
  const before = await snapshot(f.root);
  const foreign = await f.raw("product_session_call", { session_ref: first.ref, expected_revision: first.revision, request_id: randomUUID(), scenario: "product_record_instruction", arguments: { candidate_ref: other.result.candidate_ref, text: "Foreign actor.", source: "fixture", related_refs: [], affected_refs: [] } });
  assert.equal(foreign.isError, true);
  assert.deepEqual(await snapshot(f.root), before);
  const [continued] = await f.collect(first, await f.sessionCall(first, "product_record_instruction", { candidate_ref: f.draft.result.candidate_ref, text: "First actor continues.", source: "fixture", related_refs: [], affected_refs: [] }));
  assert.equal(continued.result.decision_ref.product_id, one.result.decision_ref.product_id);
});
test("unrelated reviewer effects during dispatch cannot silently refresh a session", async (t) => {
  for (const scenario of ["product_interview_resume", "product_record_instruction"]) {
    const f = await fixture(t);
    const s = await f.open();
    const reviewer = workflowTools.find((tool) => tool.name === "product_review_start");
    const selected = workflowTools.map((tool) => tool.name !== scenario ? tool : { ...tool, async run(input) {
      const output = await withRoot(f.root, () => tool.run(input));
      await withRoot(f.root, () => reviewer.run({ context: output.context, candidate_ref: f.draft.result.candidate_ref, mode: "full" }));
      return output;
    } });
    const handlers = productSessionHandlers(selected);
    const args = scenario === "product_interview_resume" ? { candidate_ref: f.draft.result.candidate_ref } : { candidate_ref: f.draft.result.candidate_ref, text: "Actor-owned effect.", source: "fixture", related_refs: [], affected_refs: [] };
    await assert.rejects(handlers.call(f.root, { session_ref: s.ref, expected_revision: s.revision, request_id: randomUUID(), scenario, arguments: args }), (error) => error.code === (scenario === "product_interview_resume" ? "CONFLICT" : "RECOVERY_REQUIRED"));
    const status = await handlers.status(f.root, s.ref);
    assert.equal(status.state, scenario === "product_interview_resume" ? "idle" : "unknown");
    assert.notEqual(status.freshness, "current");
  }
});
test("secret-bearing input is rejected before retaining a checkpoint or dispatching", async (t) => {
  const f = await fixture(t);
  const s = await f.open();
  const before = await snapshot(f.root);
  const response = await f.raw("product_session_call", { session_ref: s.ref, expected_revision: s.revision, request_id: randomUUID(), scenario: "product_record_instruction", arguments: { candidate_ref: f.draft.result.candidate_ref, text: "password=session-fixture-secret", source: "fixture", related_refs: [], affected_refs: [] } });
  assert.equal(response.isError, true);
  assert.deepEqual(await snapshot(f.root), before, "secret must never reach a retained checkpoint");
});
test("a reviewer ledger change requires explicit inspection and only session-delivered receipts permit verdicts", async (t) => {
  const f = await fixture(t);
  const author = await f.open();
  const started = await f.call("product_review_start", { context: f.draft.context, candidate_ref: f.draft.result.candidate_ref, mode: "full" });
  const observed = await f.call("product_session_status", { session_ref: author.ref });
  assert.equal(observed.result.freshness, "review_changed");
  const stale = await f.raw("product_session_call", { session_ref: author.ref, expected_revision: author.revision, request_id: randomUUID(), scenario: "product_record_instruction", arguments: { candidate_ref: f.draft.result.candidate_ref, text: "Unreconciled author change.", source: "fixture", related_refs: [], affected_refs: [] } });
  assert.equal(stale.structuredContent.error.code, "CONFLICT");
  const reviewer = await f.open(started.context);
  let read;
  let cursor;
  do { read = await f.call("product_review_get", { context: started.context, review_ref: started.result.review_ref, item_index: 0, ...(cursor ? { cursor } : {}) }); cursor = read.result.next_cursor; } while (cursor);
  const verdict = { item_key: read.result.item_key, verdict: "covered", explanation: "Fixture evidence agrees.", counterexample: null,
    evidence_refs: [], evidence_sources: [], read_receipt: read.result.read_receipt, inherited_from: null };
  const before = await snapshot(f.root);
  const foreignReceipt = await f.raw("product_session_call", { session_ref: reviewer.ref, expected_revision: reviewer.revision, request_id: randomUUID(), scenario: "product_review_record", arguments: { review_ref: started.result.review_ref, value: verdict } });
  assert.equal(foreignReceipt.structuredContent.error.code, "PREREQUISITE_REQUIRED");
  assert.deepEqual(await snapshot(f.root), before);
  const [exact] = await f.collect(reviewer, await f.sessionCall(reviewer, "product_review_get", { review_ref: started.result.review_ref, item_index: 0 }));
  verdict.read_receipt = exact.result.read_receipt;
  const beforeMissingVerdict = await snapshot(f.root);
  const missingVerdict = { ...verdict };
  delete missingVerdict.verdict;
  const fabricated = await f.raw("product_session_call", { session_ref: reviewer.ref, expected_revision: reviewer.revision, request_id: randomUUID(), scenario: "product_review_record", arguments: { review_ref: started.result.review_ref, value: missingVerdict } });
  assert.equal(fabricated.isError, true, "the session cannot choose a verdict for its actor");
  assert.deepEqual(await snapshot(f.root), beforeMissingVerdict);
  const [written] = await f.collect(reviewer, await f.sessionCall(reviewer, "product_review_record", { review_ref: started.result.review_ref, value: verdict }));
  assert.equal(written.result.applied, true);
  const [status] = await f.collect(reviewer, await f.sessionCall(reviewer, "product_review_status", { review_ref: started.result.review_ref }));
  assert.equal(status.result.recorded_items, 1);
});
test("a prepared question never gains an invented answer when caller text is absent", async (t) => {
  const f = await fixture(t);
  const s = await f.open();
  const [prepared] = await f.collect(s, await f.sessionCall(s, "product_question_prepare", { candidate_ref: f.draft.result.candidate_ref, category: "fixture", text: "Which explicit option?", options: [{ id: "one", label: "One" }, { id: "two", label: "Two" }] }));
  const before = await snapshot(f.root);
  const missing = await f.raw("product_session_call", { session_ref: s.ref, expected_revision: s.revision, request_id: randomUUID(), scenario: "product_question_answer", arguments: { candidate_ref: f.draft.result.candidate_ref, question_ref: prepared.result.question_ref, source: "fixture-native-question", selected_ids: ["one"] } });
  assert.equal(missing.isError, true, "the session cannot invent the actor's answer text");
  assert.deepEqual(await snapshot(f.root), before);
  const [stillPending] = await f.collect(s, await f.sessionCall(s, "product_interview_resume", { candidate_ref: f.draft.result.candidate_ref }));
  assert.equal(stillPending.result.state, "needs_user");
});
test("source drift during partially delivered record cannot become complete", async (t) => {
  const f = await fixture(t);
  const s = await f.open();
  const [saved] = await f.collect(s, await f.sessionCall(s, "product_record_instruction", { candidate_ref: f.draft.result.candidate_ref, text: "😀данные".repeat(650), source: "fixture", related_refs: [], affected_refs: [] }));
  const first = await f.sessionCall(s, "product_candidate_record_get", { candidate_ref: f.draft.result.candidate_ref, record_ref: { kind: "decision", id: saved.result.decision_ref.id, revision: 1 } });
  await f.call("product_record_instruction", { context: saved.context, candidate_ref: f.draft.result.candidate_ref, text: "Concurrent source change.", source: "fixture", related_refs: [], affected_refs: [] });
  let stopped = false;
  for (let n = 0; n < 20 && !stopped; n += 1) {
    const response = await f.raw("product_session_next", { session_ref: s.ref, expected_revision: s.revision, read_ref: first.read_ref });
    if (response.isError) { assert.equal(response.structuredContent.error.code, "CONFLICT"); stopped = true; }
    else { const page = response.structuredContent.result; s.revision = page.session_revision; assert.equal(page.complete, false); }
  }
  assert.equal(stopped, true);
  const status = await f.call("product_session_status", { session_ref: s.ref });
  assert.equal(status.result.complete, false);
});
test("registered continuation faults reject malformed, repeated and changed-version pages", async (t) => {
  for (const fault of ["repeat", "version", "nonadvance", "malformed"]) {
    const f = await fixture(t);
    const s = await f.open();
    const [saved] = await f.collect(s, await f.sessionCall(s, "product_record_instruction", { candidate_ref: f.draft.result.candidate_ref, text: "😀данные".repeat(650), source: "fixture", related_refs: [], affected_refs: [] }));
    let count = 0;
    let firstCursor;
    const selected = workflowTools.map((tool) => tool.name !== "product_candidate_record_get" ? tool : { ...tool, async run(input) {
      const output = await withRoot(f.root, () => tool.run(input));
      count += 1;
      if (count === 1) firstCursor = output.result.next_cursor;
      else {
        if (fault === "repeat") output.result.next_cursor = firstCursor;
        if (fault === "version") output.result.source_version = "0".repeat(64);
        if (fault === "nonadvance") { output.result.complete = false; output.result.next_cursor = firstCursor; }
        if (fault === "malformed") output.result.complete = false;
      }
      return output;
    } });
    const handlers = productSessionHandlers(selected);
    let page = await handlers.call(f.root, { session_ref: s.ref, expected_revision: s.revision, request_id: randomUUID(), scenario: "product_candidate_record_get", arguments: { candidate_ref: f.draft.result.candidate_ref, record_ref: { kind: "decision", id: saved.result.decision_ref.id, revision: 1 } } });
    s.revision = page.session_revision;
    while (!page.delivery.complete) { page = await handlers.next(f.root, { session_ref: s.ref, expected_revision: s.revision, read_ref: page.read_ref }); s.revision = page.session_revision; }
    const before = await snapshot(f.root);
    await assert.rejects(handlers.next(f.root, { session_ref: s.ref, expected_revision: s.revision, read_ref: page.read_ref }), (error) => ["STALE_CURSOR", "INVALID_STATE", "INVALID_CURSOR"].includes(error.code), fault);
    assert.deepEqual(await snapshot(f.root), before, fault);
  }
});
test("an unknown dispatched mutation retains identity and blocks every replacement request", async (t) => {
  const f = await fixture(t);
  const s = await f.open();
  let dispatches = 0;
  const selected = workflowTools.map((tool) => tool.name !== "product_record_instruction" ? tool : { ...tool, async run(input) {
    dispatches += 1;
    await withRoot(f.root, () => tool.run(input));
    throw new Error("Simulated lost acknowledgement after durable effect.");
  } });
  const handlers = productSessionHandlers(selected);
  const request = { session_ref: s.ref, expected_revision: s.revision, request_id: randomUUID(), scenario: "product_record_instruction", arguments: { candidate_ref: f.draft.result.candidate_ref, text: "Exactly one applied effect.", source: "fixture", related_refs: [], affected_refs: [] } };
  const beforeEffect = await snapshot(f.root);
  await assert.rejects(handlers.call(f.root, request));
  const afterEffect = await snapshot(f.root);
  assert.equal(afterEffect.filter(([name]) => name.includes("/decisions/")).length - beforeEffect.filter(([name]) => name.includes("/decisions/")).length, 1, "the handler actually saved exactly one decision before losing its acknowledgement");
  const status = await handlers.status(f.root, s.ref);
  assert.equal(status.state, "unknown");
  assert.equal(status.pending.request_id, request.request_id);
  assert.equal(status.complete, false);
  const before = await snapshot(f.root);
  await assert.rejects(handlers.call(f.root, { ...request, expected_revision: status.session_revision }), (error) => error.code === "RECOVERY_REQUIRED");
  await assert.rejects(handlers.call(f.root, { ...request, request_id: randomUUID(), expected_revision: status.session_revision }), (error) => error.code === "RECOVERY_REQUIRED");
  assert.equal(dispatches, 1);
  assert.deepEqual(await snapshot(f.root), before);
});
test("expected revisions serialize concurrent callers and repeated next cannot advance twice", async (t) => {
  const f = await fixture(t);
  const s = await f.open();
  const args = { session_ref: s.ref, expected_revision: s.revision, scenario: "product_interview_resume", arguments: { candidate_ref: f.draft.result.candidate_ref } };
  const responses = await Promise.all([f.raw("product_session_call", { ...args, request_id: randomUUID() }), f.raw("product_session_call", { ...args, request_id: randomUUID() })]);
  assert.equal(responses.filter((r) => r.isError !== true).length, 1);
  const first = responses.find((r) => r.isError !== true).structuredContent.result;
  s.revision = first.session_revision;
  await f.collect(s, first);
  const before = await snapshot(f.root);
  const repeated = await f.raw("product_session_next", { session_ref: s.ref, expected_revision: first.session_revision, read_ref: first.read_ref });
  assert.equal(repeated.isError, true);
  assert.deepEqual(await snapshot(f.root), before);
});
test("missing context and structurally valid oversized requests fail before checkpoint changes", async (t) => {
  const f = await fixture(t);
  const s = await f.open();
  const before = await snapshot(f.root);
  const missing = await f.raw("product_session_open", { candidate_ref: f.draft.result.candidate_ref });
  assert.equal(missing.isError, true);
  const args = { candidate_ref: f.draft.result.candidate_ref, subject: "Overview", value: { title: "Bounded architecture", provenance: [],
    applicability: { state: "current", global: true, stage_refs: [], reason: "Fixture" }, purpose: "Bounded delivery", inputs: Array.from({ length: 40 }, () => "x".repeat(4096)), outputs: [], ownership: "Fixture", dependencies: [], data_flows: [], errors: [], prd_refs: [] } };
  const schema = workflowTools.find((tool) => tool.name === "technical_define_boundary").inputSchema;
  const validate = new Ajv().compile(schema);
  assert.equal(validate({ ...args, context: f.draft.context }), true, JSON.stringify(validate.errors));
  const oversized = await f.raw("product_session_call", { session_ref: s.ref, expected_revision: s.revision, request_id: randomUUID(), scenario: "technical_define_boundary", arguments: args });
  assert.equal(oversized.structuredContent.error.code, "INVALID_INPUT");
  assert.deepEqual(await snapshot(f.root), before);
});

test("blocked ready context is delivered exactly without granting semantic readiness or a receipt", async (t) => {
  const f = await fixture(t);
  const s = await f.open();
  const args = { purpose: "review", artifact: "prd", required_refs: [], budget_bytes: 8192 };
  const direct = await f.call("product_context_prepare", { context: f.initialized.context, ...args });
  assert.equal(direct.result.complete, false);
  assert.equal(direct.result.next_cursor, null);
  assert.ok(direct.result.blockers.length > 0);
  const [delivered] = await f.collect(s, await f.sessionCall(s, "product_context_prepare", args));
  assert.deepEqual(delivered.result, direct.result);
  const identity = JSON.parse(Buffer.from(s.ref, "base64url").toString("utf8"));
  const checkpoint = JSON.parse(await readFile(join(f.root, "products", identity.product_id, "sessions", `${identity.id}.json`), "utf8"));
  assert.equal(checkpoint.completed_read, null);
  const before = await snapshot(f.root);
  const verdict = await f.raw("product_session_call", { session_ref: s.ref, expected_revision: s.revision, request_id: randomUUID(), scenario: "product_review_consistency_record", arguments: { review_ref: randomUUID(), read_receipt: "0".repeat(64), verdict: "covered", explanation: "No ready evidence.", counterexample: null } });
  assert.equal(verdict.isError, true);
  assert.deepEqual(await snapshot(f.root), before);
  const [continued] = await f.collect(s, await f.sessionCall(s, "product_interview_resume", { candidate_ref: f.draft.result.candidate_ref }));
  const resumed = await f.call("product_interview_resume", { context: f.draft.context, candidate_ref: f.draft.result.candidate_ref });
  assert.deepEqual(continued.result, resumed.result);
  const blocked = await f.open();
  const selected = workflowTools.map((tool) => tool.name !== "product_context_prepare" ? tool : { ...tool, async run(input) {
    const output = await withRoot(f.root, () => tool.run(input));
    output.result.read_receipt = "0".repeat(64);
    return output;
  } });
  const handlers = productSessionHandlers(selected);
  const blockedBefore = await snapshot(f.root);
  await assert.rejects(handlers.call(f.root, { session_ref: blocked.ref, expected_revision: blocked.revision, request_id: randomUUID(), scenario: "product_context_prepare", arguments: args }), (error) => error.code === "INVALID_STATE");
  assert.deepEqual(await snapshot(f.root), blockedBefore, "an unpublished receipt must not be accepted or retained");
  const blockedIdentity = JSON.parse(Buffer.from(blocked.ref, "base64url").toString("utf8"));
  const blockedCheckpoint = JSON.parse(await readFile(join(f.root, "products", blockedIdentity.product_id, "sessions", `${blockedIdentity.id}.json`), "utf8"));
  assert.equal(blockedCheckpoint.completed_read, null, "delivery exhaustion cannot grant semantic-read credit");
});

test("safe public prose preserves direct scenario semantics while nested credentials never reach checkpoints", async (t) => {
  const f = await fixture(t);
  const args = { candidate_ref: f.draft.result.candidate_ref, text: "Configuration parameter nonsecret=public is safe to disclose.", source: "fixture", related_refs: [], affected_refs: [] };
  const direct = await f.call("product_record_instruction", { context: f.draft.context, ...args });
  const s = await f.open(direct.context);
  const [saved] = await f.collect(s, await f.sessionCall(s, "product_record_instruction", args));
  const [record] = await f.collect(s, await f.sessionCall(s, "product_candidate_record_get", { candidate_ref: f.draft.result.candidate_ref, record_ref: { kind: "decision", id: saved.result.decision_ref.id, revision: saved.result.decision_ref.revision } }));
  assert.equal(JSON.parse(record.result.text).text, args.text);
  const before = await snapshot(f.root);
  const metadata = await metadataSnapshot(f.root);
  const nested = { candidate_ref: f.draft.result.candidate_ref, subject: "Overview", value: { title: "Nested input", provenance: [], applicability: { state: "current", global: true, stage_refs: [], reason: "Fixture" }, purpose: "Fixture", inputs: ["password=fixture-only-sentinel"], outputs: [], ownership: "Fixture", dependencies: [], data_flows: [], errors: [], prd_refs: [] } };
  assert.equal(new Ajv().compile(workflowTools.find((tool) => tool.name === "technical_define_boundary").inputSchema)({ ...nested, context: saved.context }), true);
  const rejected = await f.raw("product_session_call", { session_ref: s.ref, expected_revision: s.revision, request_id: randomUUID(), scenario: "technical_define_boundary", arguments: nested });
  assert.equal(rejected.structuredContent.error.code, "INVALID_INPUT");
  assert.deepEqual(await snapshot(f.root), before);
  assert.deepEqual(await metadataSnapshot(f.root), metadata);
});

test("source range faults reject premature terminal declarations and discontinuous text coverage", async (t) => {
  for (const fault of ["dropped-terminal", "first-offset", "next-offset", "changed-total", "skipped-range"]) {
    await t.test(fault, async (t) => {
    const f = await fixture(t);
    const s = await f.open();
    const [saved] = await f.collect(s, await f.sessionCall(s, "product_record_instruction", { candidate_ref: f.draft.result.candidate_ref, text: "😀данные".repeat(650), source: "fixture", related_refs: [], affected_refs: [] }));
    let calls = 0;
    const selected = workflowTools.map((tool) => tool.name !== "product_candidate_record_get" ? tool : { ...tool, async run(input) {
      const output = await withRoot(f.root, () => tool.run(input));
      calls += 1;
      if (calls === 1) {
        assert.ok(output.result.offset + Array.from(output.result.text).length < output.result.total_characters);
        if (fault === "dropped-terminal") { output.result.complete = true; output.result.next_cursor = null; }
        if (fault === "first-offset") output.result.offset = 1;
      } else {
        if (fault === "next-offset") output.result.offset += 1;
        if (fault === "changed-total") output.result.total_characters += 1;
        if (fault === "skipped-range") { output.result.offset += 1; output.result.text = Array.from(output.result.text).slice(1).join(""); }
      }
      return output;
    } });
    const handlers = productSessionHandlers(selected);
    const before = await snapshot(f.root);
    const request = { session_ref: s.ref, expected_revision: s.revision, request_id: randomUUID(), scenario: "product_candidate_record_get", arguments: { candidate_ref: f.draft.result.candidate_ref, record_ref: { kind: "decision", id: saved.result.decision_ref.id, revision: 1 } } };
    if (["dropped-terminal", "first-offset"].includes(fault)) {
      await assert.rejects(handlers.call(f.root, request), (error) => ["INVALID_STATE", "INVALID_CURSOR", "STALE_CURSOR"].includes(error.code), fault);
      assert.deepEqual(await snapshot(f.root), before);
    } else {
      let page = await handlers.call(f.root, request);
      while (!page.delivery.complete) page = await handlers.next(f.root, { session_ref: s.ref, expected_revision: page.session_revision, read_ref: page.read_ref });
      assert.equal(page.complete, false);
      const partial = await snapshot(f.root);
      await assert.rejects(handlers.next(f.root, { session_ref: s.ref, expected_revision: page.session_revision, read_ref: page.read_ref }), (error) => ["INVALID_STATE", "INVALID_CURSOR", "STALE_CURSOR"].includes(error.code), fault);
      assert.deepEqual(await snapshot(f.root), partial);
      assert.equal((await handlers.status(f.root, s.ref)).complete, false);
    }
    });
  }
});

test("paged inventories must deliver their declared totals even with mutually consistent terminal flags", async (t) => {
  for (const scenario of ["product_document_list", "product_context_prepare"]) {
    await t.test(scenario, async (t) => {
    const f = await fixture(t);
    const s = await f.open();
    const selected = workflowTools.map((tool) => tool.name !== scenario ? tool : { ...tool, async run(input) {
      const output = await withRoot(f.root, () => tool.run(input));
      if (scenario === "product_document_list") { assert.ok(output.result.items.length > 0); output.result.items = []; }
      else output.result.required_total += 1;
      return output;
    } });
    const handlers = productSessionHandlers(selected);
    const before = await snapshot(f.root);
    const args = scenario === "product_document_list" ? { artifact: "idea", limit: 1 } : { purpose: "review", artifact: "prd", required_refs: [], budget_bytes: 8192 };
    await assert.rejects(handlers.call(f.root, { session_ref: s.ref, expected_revision: s.revision, request_id: randomUUID(), scenario, arguments: args }), (error) => ["INVALID_STATE", "INVALID_CURSOR", "STALE_CURSOR"].includes(error.code), scenario);
    assert.deepEqual(await snapshot(f.root), before);
    });
  }
});

test("review terminal loss cannot grant credit even with a genuine complete source receipt", async (t) => {
  const f = await fixture(t);
  const written = await f.call("product_record_instruction", { context: f.draft.context, candidate_ref: f.draft.result.candidate_ref, text: "😀review".repeat(700), source: "fixture", related_refs: [], affected_refs: [] });
  const started = await f.call("product_review_start", { context: written.context, candidate_ref: f.draft.result.candidate_ref, mode: "full" });
  const status = await f.call("product_review_status", { context: started.context, review_ref: started.result.review_ref });
  let itemIndex;
  for (let index = 0; index < status.result.total_items; index += 1) {
    const page = await f.call("product_review_get", { context: started.context, review_ref: started.result.review_ref, item_index: index });
    if (!page.result.complete) { itemIndex = index; break; }
  }
  assert.notEqual(itemIndex, undefined, "the real fixture must have a multi-portion review item");
  for (const scenario of ["product_review_get", "product_review_consistency_get"]) {
    await t.test(scenario, async () => {
    if (scenario === "product_review_consistency_get") {
      for (let index = 0; index < status.result.total_items; index += 1) {
        let read;
        let cursor;
        do { read = await f.call("product_review_get", { context: started.context, review_ref: started.result.review_ref, item_index: index, ...(cursor ? { cursor } : {}) }); cursor = read.result.next_cursor; } while (cursor);
        await f.call("product_review_record", { context: started.context, review_ref: started.result.review_ref, value: { item_key: read.result.item_key, verdict: "covered", explanation: "Fixture range read completely.", counterexample: null, evidence_refs: [], evidence_sources: [], read_receipt: read.result.read_receipt, inherited_from: null } });
      }
    }
    const args = { review_ref: started.result.review_ref, ...(scenario === "product_review_get" ? { item_index: itemIndex } : {}) };
    let cursor;
    let terminal;
    do { terminal = await f.call(scenario, { context: started.context, ...args, ...(cursor ? { cursor } : {}) }); cursor = terminal.result.next_cursor; } while (cursor);
    assert.equal(typeof terminal.result.read_receipt, "string");
    const s = await f.open(started.context);
    const selected = workflowTools.map((tool) => tool.name !== scenario ? tool : { ...tool, async run(input) {
      const output = await withRoot(f.root, () => tool.run(input));
      if (scenario === "product_review_get") assert.equal(output.result.complete, false);
      else output.result.text = Array.from(output.result.text).slice(0, 1).join("");
      output.result.complete = true;
      output.result.next_cursor = null;
      output.result.read_receipt = terminal.result.read_receipt;
      return output;
    } });
    const handlers = productSessionHandlers(selected);
    const before = await snapshot(f.root);
    await assert.rejects(handlers.call(f.root, { session_ref: s.ref, expected_revision: s.revision, request_id: randomUUID(), scenario, arguments: args }), (error) => ["INVALID_STATE", "INVALID_CURSOR", "STALE_CURSOR", "SOURCE_CHANGED"].includes(error.code), scenario);
    assert.deepEqual(await snapshot(f.root), before);
    const identity = JSON.parse(Buffer.from(s.ref, "base64url").toString("utf8"));
    const checkpoint = JSON.parse(await readFile(join(f.root, "products", identity.product_id, "sessions", `${identity.id}.json`), "utf8"));
    assert.equal(checkpoint.completed_read, null);
    });
  }
});

test("review verification preserves exact legacy and explicit outputs without writes and rejects intervening source change", async (t) => {
  const f = await fixture(t);
  const started = await f.call("product_review_start", { context: f.draft.context, candidate_ref: f.draft.result.candidate_ref, mode: "full" });
  for (const representation of [undefined, "explicit-v1"]) {
    const args = { review_ref: started.result.review_ref, item_index: 0, ...(representation ? { representation } : {}) };
    const before = await snapshot(f.root);
    const metadata = await metadataSnapshot(f.root);
    const direct = await f.call("product_review_get", { context: started.context, ...args });
    await verifyProductReviewDelivery({ root: f.root, context: started.context, reviewRef: args.review_ref, itemIndex: args.item_index, ...(representation ? { representation } : {}) }, direct.result);
    assert.deepEqual(await snapshot(f.root), before);
    assert.deepEqual(await metadataSnapshot(f.root), metadata);
    const s = await f.open(started.context);
    const [delivered] = await f.collect(s, await f.sessionCall(s, "product_review_get", args));
    assert.deepEqual(delivered, direct, "the original public shape and exact bytes stay authoritative");
  }
  const s = await f.open(started.context);
  const selected = workflowTools.map((tool) => tool.name !== "product_review_get" ? tool : { ...tool, async run(input) {
    const output = await withRoot(f.root, () => tool.run(input));
    const writer = workflowTools.find((value) => value.name === "product_record_instruction");
    await withRoot(f.root, () => writer.run({ context: started.context, candidate_ref: f.draft.result.candidate_ref, text: "Intervening source change.", source: "fixture", related_refs: [], affected_refs: [] }));
    return output;
  } });
  const handlers = productSessionHandlers(selected);
  const identity = JSON.parse(Buffer.from(s.ref, "base64url").toString("utf8"));
  const path = join(f.root, "products", identity.product_id, "sessions", `${identity.id}.json`);
  const before = await readFile(path);
  await assert.rejects(handlers.call(f.root, { session_ref: s.ref, expected_revision: s.revision, request_id: randomUUID(), scenario: "product_review_get", arguments: { review_ref: started.result.review_ref, item_index: 0 } }), (error) => ["CONFLICT", "SOURCE_CHANGED"].includes(error.code));
  assert.deepEqual(await readFile(path), before);
  assert.equal(JSON.parse(await readFile(path, "utf8")).completed_read, null);
});
