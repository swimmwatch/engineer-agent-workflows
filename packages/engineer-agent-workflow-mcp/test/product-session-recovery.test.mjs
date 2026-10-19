import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { execFile, spawn } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, posix, win32 } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { setTimeout, clearTimeout } from "node:timers";
import { fileURLToPath, URL } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { createTemporaryDirectory } from "./support/temporary-directory.mjs";
import { injectRecoveryCheckpointFailure } from "./support/recovery-checkpoint.mjs";

const execute = promisify(execFile);
const server = fileURLToPath(new URL("../dist/main.js", import.meta.url));
const moduleURL = new URL("../dist/server.js", import.meta.url).href;
const sessionURL = new URL("../dist/product/sessions.js", import.meta.url).href;
const stateURL = new URL("../dist/state.js", import.meta.url).href;
const recoveryCheckpointURL = new URL("./support/recovery-checkpoint.mjs", import.meta.url).href;

test("I11-N4: real recovery checkpoint injection uses native paths and preserves unmatched renames", async (t) => {
  const ref = { product_id: "synthetic-product", id: "synthetic-session" };
  const sessionRef = Buffer.from(JSON.stringify(ref)).toString("base64url");
  for (const [name, pathAPI, root] of [["posix", posix, "/synthetic/store"], ["win32", win32, "C:\\synthetic\\store"]]) {
    for (const phase of ["before-attempt", "after-response"]) await t.test(`${name} ${phase}`, async () => {
      const renamed = [];
      const rename = async (...args) => { renamed.push(args); };
      let next = { state: "unknown", pending: { phase: "unknown", recovery: { attempts: 0 } } };
      const fs = { rename, async readFile() { return JSON.stringify(next); } };
      const injection = injectRecoveryCheckpointFailure(fs, root, sessionRef, phase, pathAPI);
      const target = pathAPI.join(root, "products", ref.product_id, "sessions", `${ref.id}.json`);
      try {
        await fs.rename("unrelated.tmp", "unrelated.json");
        await fs.rename(`${target}.tmp`, target);
        assert.equal(injection.injected, false);
        assert.equal(renamed.length, 2);
        next = { state: phase === "before-attempt" ? "unknown" : "acknowledged",
          pending: { phase: "acknowledged", recovery: { attempts: 1 } } };
        await assert.rejects(fs.rename(`${target}.tmp`, target), /Synthetic recovery checkpoint failure/);
        assert.equal(injection.injected, true, "the actual worker hook must fire before interpreting recovery");
        assert.equal(renamed.length, 2, "injected checkpoint must not reach the original rename");
        await fs.rename(`${target}.tmp`, target);
        assert.equal(renamed.length, 3, "injection is a single selected checkpoint failure");
      } finally { injection.restore(); }
      assert.equal(fs.rename, rename);
    });
  }
});
async function fixture(t) {
  const directory = await createTemporaryDirectory(t, "eaw-session-recovery-");
  const root = join(directory, "store"), workspace = join(directory, "workspace");
  await mkdir(workspace);
  await execute("git", ["init", "--quiet", "--initial-branch=main"], { cwd: workspace });
  await writeFile(join(workspace, "README.md"), "# Recovery fixture\n");
  await execute("git", ["add", "README.md"], { cwd: workspace });
  await execute("git", ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "--quiet", "-m", "fixture"], { cwd: workspace });
  let client;
  async function start() { client = new Client({ name: "session-recovery", version: "1" });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [server], env: { ...process.env, EAW_PRODUCT_DATA_DIR: root }, stderr: "pipe" })); }
  await start(); t.after(() => client.close());
  const raw = (name, args) => client.callTool({ name, arguments: args });
  async function call(name, args) { const r = await raw(name, args); assert.notEqual(r.isError, true, JSON.stringify(r.structuredContent)); return r.structuredContent; }
  const product = await call("product_initialize", { workspace, name: "Recovery fixture", known_idea: "Count durable effects." });
  const draft = await call("product_artifact_draft", { context: product.context, artifact: "idea", upstream_pins: [] });
  async function open(context = draft.context) { const r = await call("product_session_open", { context, candidate_ref: draft.result.candidate_ref }); return { session_ref: r.result.session_ref, expected_revision: r.result.session_revision }; }
  const args = { candidate_ref: draft.result.candidate_ref, text: "One durable instruction.", source: "fixture", related_refs: [], affected_refs: [] };
  const candidatePath = join(root, "products", draft.result.product_id, "drafts", draft.result.candidate_ref.candidate_id, "candidate.yaml");
  async function effects() { return JSON.parse(await readFile(candidatePath, "utf8")).decision_heads.map((h) => h.decision_ref); }
  function checkpointPath(session) { const r = JSON.parse(Buffer.from(session.session_ref, "base64url")); return join(root, "products", r.product_id, "sessions", `${r.id}.json`); }
  return { root, directory, draft, args, raw, call, open, effects, checkpointPath,
    async restart() { await client.close(); await start(); } };
}
async function snapshot(root, relative = "") {
  const result = [];
  for (const e of (await readdir(join(root, relative), { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
    if (e.name === "sessions") continue;
    const child = relative ? `${relative}/${e.name}` : e.name;
    if (e.isDirectory()) result.push(...await snapshot(root, child));
    else result.push([child, createHash("sha256").update(await readFile(join(root, child))).digest("hex")]);
  } return result;
}
async function lostResponse(f, session, phase = "after-effect", scenario = "product_record_instruction", args = f.args) {
  const worker = `
    import { syncBuiltinESMExports } from "node:module";
    import fs from "node:fs/promises";
    const input = JSON.parse(process.argv[1]); process.env.EAW_PRODUCT_DATA_DIR = input.root;
    const { workflowTools } = await import(${JSON.stringify(moduleURL)});
    const { productSessionHandlers } = await import(${JSON.stringify(sessionURL)});
    const { WorkflowError } = await import(${JSON.stringify(stateURL)});
    const selected = workflowTools.find(t => t.name === input.scenario);
    const tools = workflowTools.map(t => t === selected ? { ...t, run: async args => {
      if (input.phase === "before-dispatch") throw new WorkflowError("RECOVERY_REQUIRED", "Synthetic interruption before business dispatch.");
      const output = await t.run(args);
      if (input.phase === "after-effect") throw new WorkflowError("RECOVERY_REQUIRED", "Synthetic lost response.");
      return output;
    }} : t);
    if (input.phase === "operation-persisted" || input.phase === "effect-persisted") {
      const rename = fs.rename; let interrupted = false;
      fs.rename = async (from, to) => {
        await rename(from, to);
        const normalized = String(to).split(String.fromCharCode(92)).join("/");
        if (!interrupted && ((input.phase === "operation-persisted" && normalized.includes("/operations/")) || (input.phase === "effect-persisted" && normalized.endsWith("/candidate.yaml")))) {
          interrupted = true; throw new WorkflowError("RECOVERY_REQUIRED", "Synthetic interruption after persisted checkpoint.");
        }
      }; syncBuiltinESMExports();
    }
    if (input.phase === "checkpoint") {
      const rename = fs.rename; let failed = false;
      fs.rename = async (from, to) => {
        if (!failed && String(to).endsWith(".json") && String(from).includes(".tmp")) {
          const value = JSON.parse(await fs.readFile(from, "utf8"));
          if (value.pending?.phase === "acknowledged") { failed = true; throw new Error("Synthetic checkpoint failure after acknowledged effect"); }
        } return rename(from, to);
      }; syncBuiltinESMExports();
    }
    try { await productSessionHandlers(tools).call(input.root, input.call); throw new Error("Expected interruption"); }
    catch (e) { if (e.code !== "RECOVERY_REQUIRED") throw e; console.log(JSON.stringify({ code: e.code, details: e.details })); }
  `;
  const call = { ...session, request_id: randomUUID(), scenario, arguments: args };
  const r = await execute(process.execPath, ["--input-type=module", "--eval", worker, JSON.stringify({ root: f.root, phase, scenario, call })]);
  assert.equal(JSON.parse(r.stdout).code, "RECOVERY_REQUIRED");
  session.expected_revision = (await f.call("product_session_status", { session_ref: session.session_ref })).result.session_revision;
  return call;
}
async function collect(f, session, first) {
  let result = first, text = "";
  for (let i = 0; i < 100; i++) {
    text += result.delivery.text;
    session.expected_revision = result.session_revision;
    if (result.complete) return JSON.parse(text);
    result = (await f.call("product_session_next", { ...session, read_ref: first.read_ref })).result;
  } assert.fail("bounded acknowledgement delivery must finish");
}
function blocked(r) {
  assert.equal(r.isError, true);
  assert.equal(r.structuredContent.error.code, "RECOVERY_REQUIRED");
  assert.equal(r.structuredContent.error.outcome, "blocked");
  assert.equal(typeof r.structuredContent.error.next_action, "string");
  assert.equal(Object.hasOwn(r.structuredContent.error, "operation_ref"), true);
  assert.equal(Object.hasOwn(r.structuredContent.error, "known_effects"), true);
  if (r.structuredContent.error.known_effects !== null) assert.equal(r.structuredContent.error.known_effects.replay_safe, false);
}

test("public session resume exposes retained acknowledgement without dispatching new work", async (t) => {
  const f = await fixture(t), s = await f.open();
  const r = await f.call("product_session_resume", s);
  assert.equal(r.result.state, "idle"); assert.equal((await f.effects()).length, 0);
});
test("completed lost-response recovery returns exact result/context and never duplicates durable effects", async (t) => {
  for (const phase of ["after-effect", "checkpoint"]) await t.test(phase, async (sub) => {
    const f = await fixture(sub), s = await f.open();
    await lostResponse(f, s, phase); assert.equal((await f.effects()).length, 1);
    const before = await snapshot(f.root);
    await f.restart();
    const first = await f.call("product_session_resume", s);
    const exact = await collect(f, s, first.result);
    assert.equal(exact.replayed, true); assert.equal(exact.result.decision_ref.id, (await f.effects())[0].id);
    assert.notEqual(exact.context, f.draft.context);
    assert.deepEqual(await snapshot(f.root), before);
    sub.diagnostic(JSON.stringify({ phase, durable_decision_heads: (await f.effects()).length,
      effect_snapshot_sha256: createHash("sha256").update(JSON.stringify(before)).digest("hex"), exact_result_replayed: exact.replayed }));
    const saved = JSON.parse(await readFile(f.checkpointPath(s), "utf8"));
    assert.equal(saved.pending.recovery.attempts, 1);
    const again = await f.call("product_session_resume", s);
    assert.equal(again.result.complete, true); assert.notEqual(again.result.delivery, null);
    assert.equal(again.result.read_ref, first.result.read_ref);
    assert.equal(JSON.parse(await readFile(f.checkpointPath(s), "utf8")).pending.recovery.attempts, 1);
    assert.deepEqual(await snapshot(f.root), before);
  });
});
test("unknown outcome without operation evidence remains blocked and retains the last valid context", async (t) => {
  const f = await fixture(t), s = await f.open(); await lostResponse(f, s, "before-dispatch");
  blocked(await f.raw("product_session_resume", s)); assert.equal((await f.effects()).length, 0);
  const saved = JSON.parse(await readFile(f.checkpointPath(s), "utf8")); assert.equal(saved.context, f.draft.context);
  assert.equal(saved.state, "blocked");
});
test("changed exact request, original context and predecessor references cannot authorize a recovery replay", async (t) => {
  for (const change of ["arguments", "context", "order"]) await t.test(change, async (sub) => {
    const f = await fixture(sub), s = await f.open(); await lostResponse(f, s);
    const path = f.checkpointPath(s), value = JSON.parse(await readFile(path, "utf8"));
    if (change === "arguments") value.pending.arguments.text = "Changed payload.";
    if (change === "context") value.pending.context = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(value.pending.context, "base64url")), selected_sources_sha256: "f".repeat(64) })).toString("base64url");
    if (change === "order") value.pending.arguments.related_refs = [{ id: randomUUID(), revision: 1, product_id: f.draft.result.product_id, artifact: "idea" }];
    await writeFile(path, JSON.stringify(value)); const before = await snapshot(f.root);
    blocked(await f.raw("product_session_resume", s)); assert.deepEqual(await snapshot(f.root), before); assert.equal((await f.effects()).length, 1);
  });
});


test("declared evidence replay contracts share owning projections and preserve original handler results", async (t) => {
  for (const scenario of ["product_record_instruction", "product_record_observation", "product_record_assumption", "product_record_research"]) await t.test(scenario, async (sub) => {
    const f = await fixture(sub); let context = f.draft.context;
    let args;
    if (scenario === "product_record_instruction") args = { affected_refs: [], source: " fixture ", text: "  exact whitespace 😀  ", related_refs: [], candidate_ref: f.draft.result.candidate_ref };
    if (scenario === "product_record_observation") args = { source: " fixture ", finding: "  observed 😀  ", affected_refs: [], candidate_ref: f.draft.result.candidate_ref };
    if (scenario === "product_record_assumption") args = { reconsider_when: "  changed condition  ", affected_refs: [], candidate_ref: f.draft.result.candidate_ref, assumption: "  assumption 😀  " };
    if (scenario === "product_record_research") {
      const q = await f.call("product_question_prepare", { context, candidate_ref: f.draft.result.candidate_ref, category: "research", text: "Which source applies?", options: [] });
      context = q.context;
      args = { evidence: { limitations: ["second", "first"], uncertainty: [], sources: [{ url: "https://example.invalid/b", checked_date: "2026-10-11", version_applicability: "fixture", finding: "Synthetic observed finding." }, { url: "https://example.invalid/a", checked_date: "2026-10-10", version_applicability: "fixture", finding: "Synthetic observed finding." }], conclusion: "  exact conclusion 😀  ", question_ref: q.result.question_ref }, candidate_ref: f.draft.result.candidate_ref };
    }
    const beforeCount = (await f.effects()).length;
    const s = await f.open(context); await lostResponse(f, s, "after-effect", scenario, args);
    const op = JSON.parse(await readFile(f.checkpointPath(s), "utf8")).pending.operation_ref;
    const opRecord = JSON.parse(await readFile(join(f.root, "products", f.draft.result.product_id, "operations", `${op}.yaml`), "utf8"));
    const retainedIntent = JSON.parse(await readFile(join(f.root, "products", f.draft.result.product_id, "objects", `${opRecord.intent_sha256}.yaml`), "utf8"));
    assert.deepEqual(retainedIntent.input, args, "The owner projection retains every exact caller field and ordered source array.");
    const before = await snapshot(f.root);
    const recovered = await collect(f, s, (await f.call("product_session_resume", s)).result);
    assert.equal(recovered.operation_ref, op); assert.equal(recovered.replayed, true);
    assert.equal((await f.effects()).length, beforeCount + 1); assert.deepEqual(await snapshot(f.root), before);
    const direct = await f.call(scenario, { ...args, context });
    assert.deepEqual(direct, recovered);
  });
});

test("missing capabilities and retained pre-recovery checkpoints never authorize blind replay", async (t) => {
  for (const mode of ["old-checkpoint", "missing-tool"]) await t.test(mode, async (sub) => {
    const f = await fixture(sub), s = await f.open(); await lostResponse(f, s); const before = await snapshot(f.root);
    if (mode === "old-checkpoint") { const p = f.checkpointPath(s), value = JSON.parse(await readFile(p, "utf8")); delete value.pending.recovery; await writeFile(p, JSON.stringify(value)); blocked(await f.raw("product_session_resume", s)); }
    else {
      const worker = `process.env.EAW_PRODUCT_DATA_DIR = process.argv[1]; const { workflowTools } = await import(${JSON.stringify(moduleURL)}); const { productSessionHandlers } = await import(${JSON.stringify(sessionURL)}); try { await productSessionHandlers(workflowTools.filter(t => t.name !== "product_record_instruction")).resume(process.argv[1], JSON.parse(process.argv[2])); throw new Error("Unsupported replay succeeded"); } catch(e) { if(e.code !== "RECOVERY_REQUIRED" || e.details.outcome !== "blocked") throw e; }`;
      await execute(process.execPath, ["--input-type=module", "--eval", worker, f.root, JSON.stringify(s)]);
    }
    assert.equal((await f.effects()).length, 1); assert.deepEqual(await snapshot(f.root), before);
  });
});

test("corrupt, expired and changed operation evidence is retained as blocked without false success", async (t) => {
  for (const mode of ["result", "intent", "generation", "request", "scenario", "active-lock", "uncertain-lock", "source-drift"]) await t.test(mode, async (sub) => {
    const f = await fixture(sub), s = await f.open(); await lostResponse(f, s);
    const saved = JSON.parse(await readFile(f.checkpointPath(s), "utf8")); const id = saved.pending.operation_ref;
    const product = f.draft.result.product_id, dir = join(f.root, "products", product), opPath = join(dir, "operations", `${id}.yaml`);
    const op = JSON.parse(await readFile(opPath, "utf8"));
    if (mode === "result") await rm(join(dir, "objects", `${op.result_sha256}.yaml`));
    if (mode === "intent") op.intent_sha256 = "f".repeat(64);
    if (mode === "generation") await rm(join(dir, "generations", `${op.base_revision}.yaml`));
    if (mode === "request") op.request_digest = "f".repeat(64);
    if (mode === "scenario") op.scenario = "product_record_observation";
    if (["intent", "request", "scenario"].includes(mode)) await writeFile(opPath, JSON.stringify(op));
    if (mode === "active-lock" || mode === "uncertain-lock") await writeFile(join(dir, "lock.yaml"), JSON.stringify({ schema_version: 1, kind: "lock", operation_id: id, session_id: randomUUID(), pid: mode === "active-lock" ? process.pid : 999999999, expected_revision: op.base_revision }));
    if (mode === "source-drift") {
      const replay = await f.call("product_record_instruction", { ...f.args, context: f.draft.context });
      await f.call("product_record_instruction", { ...f.args, text: "Another writer.", context: replay.context });
    }
    const before = await snapshot(f.root); blocked(await f.raw("product_session_resume", s)); assert.deepEqual(await snapshot(f.root), before);
  });
});


test("real process interruptions and cancellation retain uncertain claims without new work", async (t) => {
  for (const phase of ["prepared", "operation", "effect", "response", "cancel"]) await t.test(phase, async (sub) => {
    const f = await fixture(sub), s = await f.open();
    const worker = `
      import { syncBuiltinESMExports } from "node:module";
      import fs from "node:fs/promises";
      const input = JSON.parse(process.argv[1]); process.env.EAW_PRODUCT_DATA_DIR = input.root;
      const { workflowTools } = await import(${JSON.stringify(moduleURL)});
      const { productSessionHandlers } = await import(${JSON.stringify(sessionURL)});
      const rename = fs.rename;
      fs.rename = async (from, to) => {
        await rename(from, to);
        if (input.phase === "prepared" && String(to).endsWith(".json")) {
          const value = JSON.parse(await fs.readFile(to, "utf8")); if(value.pending?.phase === "prepared") process.exit(86);
        }
        const normalized = String(to).split(String.fromCharCode(92)).join("/");
        if (input.phase === "operation" && normalized.includes("/operations/")) process.exit(86);
        if (input.phase === "effect" && normalized.endsWith("/candidate.yaml")) process.exit(86);
      }; syncBuiltinESMExports();
      const tools = workflowTools.map(t => t.name !== "product_record_instruction" ? t : { ...t, run: async args => {
        const output = await t.run(args);
        if (input.phase === "response") process.exit(86);
        if (input.phase === "cancel") { console.log("effect-persisted"); setInterval(() => {}, 1000); await new Promise(() => {}); }
        return output;
      }});
      await productSessionHandlers(tools).call(input.root, input.call);
    `;
    const call = { ...s, request_id: randomUUID(), scenario: "product_record_instruction", arguments: f.args };
    const argv = ["--input-type=module", "--eval", worker, JSON.stringify({ root: f.root, call, phase })];
    if (phase !== "cancel") await assert.rejects(execute(process.execPath, argv), e => e.code === 86);
    else {
      const child = spawn(process.execPath, argv, { stdio: ["ignore", "pipe", "pipe"] });
      let output = "", errors = "";
      child.stderr.on("data", d => { errors += d; });
      await new Promise((resolve, reject) => { const timer = setTimeout(() => { child.kill(); reject(new Error("Cancellation worker did not reach durable effect.")); }, 15000);
        child.stdout.on("data", d => { output += d; if(output.includes("effect-persisted")) { clearTimeout(timer); resolve(); } });
        child.once("error", reject); child.once("exit", () => { if(!output.includes("effect-persisted")) reject(new Error(errors || "Worker exited before cancellation checkpoint.")); }); });
      const exited = new Promise(resolve => child.once("exit", (code, signal) => resolve({ code, signal })));
      child.kill("SIGTERM"); const result = await exited; assert.equal(result.signal, "SIGTERM");
    }
    const status = await f.call("product_session_status", { session_ref: s.session_ref }); s.expected_revision = status.result.session_revision;
    assert.equal(status.result.complete, false);
    assert.equal((await f.effects()).length, ["effect", "response", "cancel"].includes(phase) ? 1 : 0);
    const claim = `${f.checkpointPath(s)}.claim`; assert.equal((await readFile(claim)).length, 0);
    const before = await snapshot(f.root), checkpoint = await readFile(f.checkpointPath(s));
    blocked(await f.raw("product_session_resume", s));
    assert.deepEqual(await snapshot(f.root), before); assert.deepEqual(await readFile(f.checkpointPath(s)), checkpoint);
    assert.equal((await readFile(claim)).length, 0);
    sub.diagnostic(JSON.stringify({ phase, durable_decision_heads: (await f.effects()).length, uncertain_claim_bytes: (await readFile(claim)).length,
      effect_snapshot_sha256: createHash("sha256").update(JSON.stringify(before)).digest("hex"), outcome: "blocked" }));
  });
});

test("concurrent restarted actors preserve revision ownership and one durable effect", async (t) => {
  const f = await fixture(t), s = await f.open(), other = await f.open(); await lostResponse(f, s);
  const otherBefore = await readFile(f.checkpointPath(other)), before = await snapshot(f.root);
  const worker = `process.env.EAW_PRODUCT_DATA_DIR = process.argv[1]; const { workflowTools } = await import(${JSON.stringify(moduleURL)}); const { productSessionHandlers } = await import(${JSON.stringify(sessionURL)}); try { const result = await productSessionHandlers(workflowTools).resume(process.argv[1], JSON.parse(process.argv[2])); console.log(JSON.stringify({ result })); } catch(e) { if(!["CONFLICT","RECOVERY_REQUIRED"].includes(e.code)) throw e; console.log(JSON.stringify({ code: e.code })); }`;
  const runs = await Promise.all([1, 2].map(() => execute(process.execPath, ["--input-type=module", "--eval", worker, f.root, JSON.stringify(s)])));
  const outcomes = runs.map(r => JSON.parse(r.stdout));
  assert.equal(outcomes.filter(o => o.result).length, 1); assert.equal(outcomes.filter(o => o.code).length, 1);
  const checkpoint = JSON.parse(await readFile(f.checkpointPath(s), "utf8")); assert.equal(checkpoint.pending.recovery.attempts, 1);
  assert.equal((await f.effects()).length, 1); assert.deepEqual(await snapshot(f.root), before); assert.deepEqual(await readFile(f.checkpointPath(other)), otherBefore);
});

test("replay budget is durably consumed before a failed attempt and explicit resume cannot reset it", async (t) => {
  const f = await fixture(t), s = await f.open(); await lostResponse(f, s); const before = await snapshot(f.root);
  const worker = `process.env.EAW_PRODUCT_DATA_DIR = process.argv[1]; const { workflowTools } = await import(${JSON.stringify(moduleURL)}); const { productSessionHandlers } = await import(${JSON.stringify(sessionURL)}); const { WorkflowError } = await import(${JSON.stringify(stateURL)}); const fs = await import("node:fs/promises"); const input = JSON.parse(process.argv[2]); const ref = JSON.parse(Buffer.from(input.session_ref,"base64url")); const path = process.argv[1]+"/products/"+ref.product_id+"/sessions/"+ref.id+".json"; let calls=0; const tools = workflowTools.map(t => t.name !== "product_record_instruction" ? t : { ...t, run: async args => { calls++; const retained = JSON.parse(await fs.readFile(path,"utf8")); if(retained.pending.recovery.attempts !== 1) throw new Error("Replay budget was not durably consumed before dispatch"); throw new WorkflowError("RECOVERY_REQUIRED","Synthetic replay response failure"); }}); const handlers = productSessionHandlers(tools); for(let n=0;n<2;n++) { const value=JSON.parse(await fs.readFile(path,"utf8")); try { await handlers.resume(process.argv[1], { ...input,expected_revision:value.revision }); throw new Error("Failed replay became success"); } catch(e) { if(e.code !== "RECOVERY_REQUIRED") throw e; }} if(calls !== 1) throw new Error("Repeated resume bypassed one-attempt budget");`;
  await execute(process.execPath, ["--input-type=module", "--eval", worker, f.root, JSON.stringify(s)]);
  const value = JSON.parse(await readFile(f.checkpointPath(s), "utf8")); assert.equal(value.pending.recovery.attempts, 1); assert.equal(value.state, "blocked");
  assert.deepEqual(await snapshot(f.root), before); assert.equal((await f.effects()).length, 1);
});


test("reordering a retained evidence source batch blocks exact recovery", async (t) => {
  const f = await fixture(t);
  const q = await f.call("product_question_prepare", { context: f.draft.context, candidate_ref: f.draft.result.candidate_ref, category: "research", text: "Which ordered evidence applies?", options: [] });
  const s = await f.open(q.context);
  const args = { candidate_ref: f.draft.result.candidate_ref, evidence: { question_ref: q.result.question_ref, conclusion: "Exact ordered evidence.", uncertainty: [], limitations: [], sources: [
    { url: "https://example.invalid/first", checked_date: "2026-10-11", version_applicability: "fixture", finding: "First source." },
    { url: "https://example.invalid/second", checked_date: "2026-10-10", version_applicability: "fixture", finding: "Second source." },
  ] } };
  await lostResponse(f, s, "after-effect", "product_record_research", args);
  const p = f.checkpointPath(s), value = JSON.parse(await readFile(p, "utf8")); value.pending.arguments.evidence.sources.reverse();
  await writeFile(p, JSON.stringify(value)); const before = await snapshot(f.root);
  blocked(await f.raw("product_session_resume", s)); assert.deepEqual(await snapshot(f.root), before); assert.equal((await f.effects()).length, 2);
});

test("incompatible checkpoint evidence is preserved and reports explicit recovery action", async (t) => {
  const f = await fixture(t), s = await f.open(); await lostResponse(f, s);
  const p = f.checkpointPath(s), value = JSON.parse(await readFile(p, "utf8")); value.schema_version = 999;
  await writeFile(p, JSON.stringify(value)); const before = await readFile(p), effects = await snapshot(f.root);
  blocked(await f.raw("product_session_resume", s)); assert.deepEqual(await readFile(p), before); assert.deepEqual(await snapshot(f.root), effects);
});

test("checkpoint failures before and after the recovery attempt never acknowledge unknown outcomes", async (t) => {
  for (const phase of ["before-attempt", "after-response"]) await t.test(phase, async (sub) => {
    const f = await fixture(sub), s = await f.open(); await lostResponse(f, s); const before = await snapshot(f.root);
    const worker = `
      import { syncBuiltinESMExports } from "node:module"; import fs from "node:fs/promises";
      process.env.EAW_PRODUCT_DATA_DIR = process.argv[1];
      const input = JSON.parse(process.argv[2]); const phase = process.argv[3];
      const { workflowTools } = await import(${JSON.stringify(moduleURL)}); const { productSessionHandlers } = await import(${JSON.stringify(sessionURL)});
      const { injectRecoveryCheckpointFailure } = await import(${JSON.stringify(recoveryCheckpointURL)});
      const injection = injectRecoveryCheckpointFailure(fs, process.argv[1], input.session_ref, phase);
      let calls = 0; syncBuiltinESMExports();
      try {
      const tools = workflowTools.map(t => t.name !== "product_record_instruction" ? t : { ...t, run: async args => { calls++; return t.run(args); }});
      const handlers = productSessionHandlers(tools);
      try { await handlers.resume(process.argv[1],input); throw new Error("Unknown checkpoint was acknowledged"); } catch(e) { if(e.code !== "RECOVERY_REQUIRED" || e.details.outcome !== "blocked") throw e; }
      if (!injection.injected) throw new Error("Recovery checkpoint injection did not fire");
      const saved = JSON.parse(await fs.readFile(injection.path,"utf8"));
      if(calls !== (phase === "before-attempt" ? 0 : 1) || saved.pending.recovery.attempts !== (phase === "before-attempt" ? 0 : 1)) throw new Error("Replay consumption did not match real dispatch");
      if(phase === "after-response") { try { await handlers.resume(process.argv[1],{...input,expected_revision:saved.revision}); throw new Error("Repeated recovery bypassed consumed budget"); } catch(e) { if(e.code !== "RECOVERY_REQUIRED") throw e; } if(calls !== 1) throw new Error("Duplicate recovery dispatch"); }
      } finally { injection.restore(); syncBuiltinESMExports(); }
    `;
    await execute(process.execPath, ["--input-type=module", "--eval", worker, f.root, JSON.stringify(s), phase]);
    assert.deepEqual(await snapshot(f.root), before); assert.equal((await f.effects()).length, 1);
  });
});


test("incomplete persisted operations remain blocked even when the session claim was released", async (t) => {
  for (const phase of ["operation-persisted", "effect-persisted"]) await t.test(phase, async (sub) => {
    const f = await fixture(sub), s = await f.open(); await lostResponse(f, s, phase);
    assert.equal((await f.effects()).length, phase === "effect-persisted" ? 1 : 0);
    await assert.rejects(readFile(`${f.checkpointPath(s)}.claim`), e => e.code === "ENOENT");
    const before = await snapshot(f.root); const result = await f.raw("product_session_resume", s); blocked(result);
    assert.notEqual(result.structuredContent.error.known_effects, null, "Inspectable incomplete operation checkpoints must disclose their bounded state.");
    assert.equal(result.structuredContent.error.known_effects.checkpoint_state, phase === "effect-persisted" ? "blocked" : "incomplete");
    assert.equal(result.structuredContent.error.known_effects.checkpoint_phase, "prepared");
    assert.deepEqual(await snapshot(f.root), before);
    sub.diagnostic(JSON.stringify({ phase, durable_decision_heads: (await f.effects()).length,
      checkpoint: result.structuredContent.error.known_effects, effect_snapshot_sha256: createHash("sha256").update(JSON.stringify(before)).digest("hex") }));
  });
});


test("lost outbound acknowledgement redelivers its exact retained portion without new dispatch", async (t) => {
  const f = await fixture(t), s = await f.open();
  const worker = `process.env.EAW_PRODUCT_DATA_DIR = process.argv[1]; const { workflowTools } = await import(${JSON.stringify(moduleURL)}); const { productSessionHandlers } = await import(${JSON.stringify(sessionURL)}); await productSessionHandlers(workflowTools).call(process.argv[1], JSON.parse(process.argv[2])); process.exit(86);`;
  await assert.rejects(execute(process.execPath, ["--input-type=module", "--eval", worker, f.root, JSON.stringify({ ...s, request_id: randomUUID(), scenario: "product_record_instruction", arguments: f.args })]), e => e.code === 86);
  const checkpoint = JSON.parse(await readFile(f.checkpointPath(s), "utf8")); s.expected_revision = checkpoint.revision;
  const before = await snapshot(f.root), saved = await readFile(f.checkpointPath(s));
  const resumed = (await f.call("product_session_resume", s)).result;
  assert.notEqual(resumed.delivery, null, "A retained acknowledgement must remain retrievable after its outbound response is lost.");
  assert.equal(resumed.delivery.offset, 0); assert.equal(resumed.delivery.text, Array.from(checkpoint.delivery.response).slice(0, checkpoint.delivery.offset).join(""));
  assert.equal(resumed.read_ref, checkpoint.delivery.read_ref);
  const exact = await collect(f, s, resumed); assert.equal(exact.context, checkpoint.context); assert.equal(exact.result.decision_ref.id, (await f.effects())[0].id);
  assert.deepEqual(await snapshot(f.root), before); assert.deepEqual(await readFile(f.checkpointPath(s)), saved);
  assert.equal((await f.effects()).length, 1); assert.equal(checkpoint.pending.recovery.attempts, 0);
});


test("cached intermediate and short final portions retain exact identity without new semantic credit", async (t) => {
  for (const phase of ["first", "intermediate", "short-final"]) await t.test(phase, async (sub) => {
    const f = await fixture(sub);
    const q = await f.call("product_question_prepare", { context: f.draft.context, candidate_ref: f.draft.result.candidate_ref,
      category: "retained-source", text: "Unresolved exact question 😀 ".repeat(230), options: [] });
    const s = await f.open(q.context), capture = join(f.directory, "captured-response.json");
    const worker = `process.env.EAW_PRODUCT_DATA_DIR=process.argv[1]; const { workflowTools }=await import(${JSON.stringify(moduleURL)}); const { productSessionHandlers }=await import(${JSON.stringify(sessionURL)}); const fs=await import("node:fs/promises"); const input=JSON.parse(process.argv[2]); const h=productSessionHandlers(workflowTools); let response=await h.call(process.argv[1],input); const phase=process.argv[4]; if(phase==="intermediate") response=await h.next(process.argv[1],{session_ref:input.session_ref,expected_revision:response.session_revision,read_ref:response.read_ref}); if(phase==="short-final") while(!response.delivery.complete) response=await h.next(process.argv[1],{session_ref:input.session_ref,expected_revision:response.session_revision,read_ref:response.read_ref}); await fs.writeFile(process.argv[3],JSON.stringify(response),{mode:0o600}); process.exit(86);`;
    const call = { ...s, request_id: randomUUID(), scenario: "product_interview_resume", arguments: { candidate_ref: f.draft.result.candidate_ref } };
    await assert.rejects(execute(process.execPath, ["--input-type=module", "--eval", worker, f.root, JSON.stringify(call), capture, phase]), e=>e.code===86);
    const exact = JSON.parse(await readFile(capture, "utf8")); s.expected_revision=exact.session_revision;
    if(phase==="intermediate") assert.ok(exact.delivery.offset>0 && !exact.delivery.complete);
    if(phase==="short-final") assert.ok(exact.delivery.complete && exact.delivery.offset>0 && Array.from(exact.delivery.text).length<2048);
    const checkpoint=await readFile(f.checkpointPath(s)), before=await snapshot(f.root);
    assert.deepEqual((await f.call("product_session_resume",s)).result,exact);
    assert.deepEqual((await f.call("product_session_resume",s)).result,exact);
    assert.deepEqual(await readFile(f.checkpointPath(s)),checkpoint); assert.deepEqual(await snapshot(f.root),before);
    assert.equal(JSON.parse(checkpoint).completed_read,null);
    const retained = JSON.parse(checkpoint);
    sub.diagnostic(JSON.stringify({ phase, session_revision: exact.session_revision, read_ref: exact.read_ref,
      offset: exact.delivery.offset, portion_characters: Array.from(exact.delivery.text).length,
      next_cursor: retained.delivery.next_cursor, result_context: JSON.parse(retained.delivery.response).context,
      receipt: JSON.parse(retained.delivery.response).result.read_receipt ?? null,
      replay_attempts: retained.pending.recovery?.attempts ?? null, completed_read: retained.completed_read,
      checkpoint_sha256: createHash("sha256").update(checkpoint).digest("hex") }));
    const stale = await f.raw("product_session_resume",{...s,expected_revision:s.expected_revision-1}); assert.equal(stale.structuredContent.error.code,"CONFLICT");
    const wrong = JSON.parse(Buffer.from(s.session_ref,"base64url"));wrong.id=randomUUID();
    blocked(await f.raw("product_session_resume",{...s,session_ref:Buffer.from(JSON.stringify(wrong)).toString("base64url")}));
    // A newer product source cannot replace the retained context or source body.
    await f.call("product_record_instruction",{...f.args,context:q.context,text:"An explicit independent later writer."});
    assert.deepEqual((await f.call("product_session_resume",s)).result,exact);
    assert.notEqual((await f.call("product_session_status",{session_ref:s.session_ref})).result.freshness,"current");
    assert.equal(JSON.parse(await readFile(f.checkpointPath(s),"utf8")).completed_read,null);
  });
});

test("cached reviewer receipt remains exact and read-only after an independent verdict changes review state", async (t) => {
  const f = await fixture(t);
  const written = await f.call("product_record_instruction", { ...f.args, context: f.draft.context, text: "😀review".repeat(700) });
  const started = await f.call("product_review_start", { context: written.context, candidate_ref: f.draft.result.candidate_ref, mode: "full" });
  const status = await f.call("product_review_status", { context: started.context, review_ref: started.result.review_ref });
  let itemIndex;
  for (let index = 0; index < status.result.total_items; index++) {
    const item = await f.call("product_review_get", { context: started.context, review_ref: started.result.review_ref, item_index: index });
    if (item.result.next_cursor !== null) { itemIndex = index; break; }
  }
  assert.notEqual(itemIndex, undefined, "A real multi-page source must exercise cached continuation identity.");
  const s = await f.open(started.context);
  let last = (await f.call("product_session_call", { ...s, request_id: randomUUID(), scenario: "product_review_get",
    arguments: { review_ref: started.result.review_ref, item_index: itemIndex } })).result;
  let body = last.delivery.text, continued = false;
  while (!last.complete) {
    if (last.delivery.complete) {
      const checkpoint = await readFile(f.checkpointPath(s)), retained = JSON.parse(checkpoint), before = await snapshot(f.root);
      assert.equal(typeof retained.delivery.next_cursor, "string");
      assert.equal(retained.completed_read, null);
      assert.deepEqual((await f.call("product_session_resume", { session_ref: s.session_ref, expected_revision: last.session_revision })).result, last);
      assert.deepEqual(await readFile(f.checkpointPath(s)), checkpoint);
      assert.deepEqual(await snapshot(f.root), before);
      t.diagnostic(JSON.stringify({ phase: "source-continuation", session_revision: last.session_revision,
        read_ref: last.read_ref, offset: last.delivery.offset, next_cursor: retained.delivery.next_cursor,
        result_context: JSON.parse(body).context, receipt: JSON.parse(body).result.read_receipt, completed_read: retained.completed_read }));
      body = ""; continued = true;
    }
    last = (await f.call("product_session_next", { session_ref: s.session_ref, expected_revision: last.session_revision, read_ref: last.read_ref })).result;
    body += last.delivery.text;
  }
  assert.equal(continued, true);
  s.expected_revision = last.session_revision;
  const source = JSON.parse(body), saved = await readFile(f.checkpointPath(s));
  const checkpoint = JSON.parse(saved);
  assert.equal(typeof source.result.read_receipt, "string");
  assert.equal(checkpoint.completed_read.receipt, source.result.read_receipt);
  await f.call("product_review_record", { context: started.context, review_ref: started.result.review_ref,
    value: { item_key: source.result.item_key, verdict: "covered", explanation: "Independent exact source review.",
      counterexample: null, evidence_refs: [], evidence_sources: [], read_receipt: source.result.read_receipt, inherited_from: null } });
  assert.equal((await f.call("product_session_status", { session_ref: s.session_ref })).result.freshness, "review_changed");
  const before = await snapshot(f.root);
  assert.deepEqual((await f.call("product_session_resume", s)).result, last);
  assert.deepEqual((await f.call("product_session_resume", s)).result, last);
  assert.deepEqual(await readFile(f.checkpointPath(s)), saved);
  assert.deepEqual(await snapshot(f.root), before);
  t.diagnostic(JSON.stringify({ session_revision: last.session_revision, read_ref: last.read_ref,
    offset: last.delivery.offset, next_cursor: checkpoint.delivery.next_cursor, result_context: source.context,
    receipt: source.result.read_receipt, completed_read: checkpoint.completed_read,
    checkpoint_sha256: createHash("sha256").update(saved).digest("hex") }));
});
