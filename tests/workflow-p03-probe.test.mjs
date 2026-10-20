import assert from "node:assert/strict";
import test from "node:test";
import { EventEmitter } from "node:events";
import { mkdtemp, readFile, writeFile, rm, chmod, mkdir, symlink, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createFixture, evaluateAttempt, validatePolicy, runCase, prepareProbe, redact, main, readMcpHealth, assertProtocolSchema, reserveTurnRequest } from "../docs/research/workflow-probe-plans/p03/probe.mjs";
import { JsonlClient } from "../docs/research/workflow-probe-plans/p03/rpc.mjs";

const validPolicy = () => ({
  authorized: true, owner: "fixture-owner", primary: "primary", fallback: "fallback",
  allowedModels: ["primary", "fallback"], invalidModel: "p03-invalid-model",
  deadlineMs: 1000, effort: "medium", binary: "/scratch/codex", binarySha256: "a".repeat(64),
  binaryVersion: "codex-cli fixture", sourceVersion: "b".repeat(64),
  sourceReadbackConfirmed: true, requiredCapabilities: ["skill", "file", "shell", "mcp", "structured", "subagent"],
  sourcePins: Object.fromEntries(["PRD-0007", "PRD-0013", "TD-0008", "TD-0016", "TD-0023"].map(id => [id, "c".repeat(64)])),
});

async function scratch(fn) {
  const root = await mkdtemp(join(tmpdir(), "p03-test-"));
  try { return await fn(root); } finally { await rm(root, { recursive: true, force: true }); }
}

function successfulAttempt(fixture, overrides = {}) {
  return {
    threadId: "thread", turnId: "turn", terminal: { id: "turn", status: "completed" },
    requestedModel: "primary", reportedModel: "primary", catalogModel: "primary",
    acceptedTurns: 1, items: [
      { id: "read", type: "commandExecution", status: "completed", command: "rtk proxy cat input.txt", exitCode: 0, aggregatedOutput: "alpha\n" },
      { id: "check", type: "commandExecution", status: "completed", command: "rtk proxy node check.mjs", exitCode: 0, aggregatedOutput: `P03_CHECK:${fixture.canary}\n` },
      { id: "mcp", type: "mcpToolCall", server: "p03", tool: "workflow_runtime_info", status: "completed", result: { structuredContent: fixture.health } },
      { id: "spawn", type: "collabAgentToolCall", tool: "spawnAgent", status: "completed", senderThreadId: "thread", receiverThreadIds: ["child"], agentsStates: {}, model: overrides.requestedModel ?? "primary" },
      { id: "wait", type: "collabAgentToolCall", tool: "wait", status: "completed", senderThreadId: "thread", receiverThreadIds: ["child"], agentsStates: { child: { status: "completed", message: `P03_SUBAGENT:${fixture.canary}:5` } } },
      { id: "close", type: "collabAgentToolCall", tool: "closeAgent", status: "completed", senderThreadId: "thread", receiverThreadIds: ["child"], agentsStates: { child: { status: "shutdown", message: null } } },
      { id: "final", type: "agentMessage", phase: "final_answer", text: JSON.stringify({ skillCanary: fixture.canary, artifactSha256: fixture.expectedHash, mcpProtocolVersion: 2, checkExitCode: 0, subagentThreadId: "child", subagentResult: `P03_SUBAGENT:${fixture.canary}:5` }) },
    ], ...overrides,
  };
}

test("policy rejects absent authority, unapproved fallback, invented pins and invalid deadlines before spawning", () => {
  for (const bad of [
    { authorized: false }, { owner: "" }, { fallback: "other" }, { sourceReadbackConfirmed: false },
    { binary: "relative" }, { binarySha256: "unknown" }, { invalidModel: "primary" }, { deadlineMs: 0 },
  ]) assert.throws(() => validatePolicy({ ...validPolicy(), ...bad }));
  assert.equal(validatePolicy(validPolicy()).primary, "primary");
});

test("subagent requires one actual native spawn, matching child completion and independently expected result", async () => {
  await scratch(async root => {
    const fixture = await createFixture(root, "healthy", { protocol_version: 2 });
    await writeFile(join(fixture.cwd, "result.txt"), "ALPHA\n");
    const good = successfulAttempt(fixture);
    const invalid = [
      good.items.filter(x => x.type !== "collabAgentToolCall"),
      good.items.filter(x => x.id !== "wait"),
      good.items.filter(x => x.id !== "close"),
      good.items.map(x => x.id === "wait" ? { ...x, agentsStates: { other: { status: "completed", message: `P03_SUBAGENT:${fixture.canary}:5` } } } : x),
      good.items.map(x => x.id === "wait" ? { ...x, agentsStates: { child: { status: "errored", message: `P03_SUBAGENT:${fixture.canary}:5` } } } : x),
      good.items.map(x => x.id === "wait" ? { ...x, agentsStates: { child: { status: "completed", message: "wrong" } } } : x),
      good.items.map(x => x.id === "spawn" ? { ...x, model: "unapproved" } : x),
      [...good.items, { ...good.items.find(x => x.id === "spawn"), id: "extra", receiverThreadIds: ["second"] }],
      [...good.items, { id: "followup", type: "collabAgentToolCall", tool: "sendInput", senderThreadId: "thread", receiverThreadIds: ["child"], status: "completed", agentsStates: {} }],
    ];
    for (const items of invalid) {
      const result = await evaluateAttempt({ ...good, items }, fixture, validPolicy());
      assert.equal(result.success, false);
      assert.notEqual(result.capabilities.subagent.verdict, "pass");
    }
    assert.equal((await evaluateAttempt(good, fixture, validPolicy())).capabilities.subagent.verdict, "pass");
  });
});

test("prepare creates an inert isolated fixture and refuses to reuse an existing directory", async () => {
  await scratch(async root => {
    const target = join(root, "probe");
    await prepareProbe(target);
    const policy = JSON.parse(await readFile(join(target, "policy.json"), "utf8"));
    assert.equal(policy.authorized, false);
    assert.equal(policy.sourceReadbackConfirmed, false);
    await assert.rejects(prepareProbe(target), /exist/i);
  });
});

test("healthy verdict requires actual tool items and independently checked bytes; unknown model release stays unknown", async () => {
  await scratch(async root => {
    const fixture = await createFixture(root, "healthy", { protocol_version: 2, runtime: { source_digest: "fixture" } });
    assert.ok(!(await readFile(fixture.skillPath, "utf8")).includes("disable-model-invocation"));
    assert.match(await readFile(join(fixture.cwd, ".agents/skills/p03-fixture/agents/openai.yaml"), "utf8"), /allow_implicit_invocation: false/);
    await writeFile(join(fixture.cwd, "result.txt"), "ALPHA\n");
    const report = await evaluateAttempt(successfulAttempt(fixture), fixture, validPolicy());
    assert.equal(report.success, true);
    assert.ok(Object.values(report.capabilities).every(row => row.verdict === "pass"));
    assert.equal(report.model.effectiveVersion, "unknown");
    assert.equal(report.model.verdict, "pass");
  });
});

test("completion name, stdout, a discovery entry and unrelated IDs cannot substitute for checked tool execution", async () => {
  await scratch(async root => {
    const fixture = await createFixture(root, "healthy", { protocol_version: 2 });
    await writeFile(join(fixture.cwd, "result.txt"), "ALPHA\n");
    const good = successfulAttempt(fixture);
    for (const mutation of [
      { terminal: { id: "turn", status: "failed" } },
      { terminal: { id: "turn", status: "interrupted" } },
      { terminal: { id: "other", status: "completed" } },
      { items: good.items.filter(x => x.type !== "mcpToolCall") },
      { items: good.items.map(x => x.type === "mcpToolCall" ? { ...x, error: { message: "failed" } } : x) },
      { items: good.items.filter(x => x.type !== "agentMessage") },
      { reportedModel: "unapproved" },
      { reroutes: [{ toModel: "unapproved" }] },
    ]) assert.equal((await evaluateAttempt({ ...good, ...mutation }, fixture, validPolicy())).success, false);
    await writeFile(join(fixture.cwd, "result.txt"), "wrong\n");
    assert.equal((await evaluateAttempt(good, fixture, validPolicy())).success, false);
  });
});

test("modified checker or bundled reference and wrong MCP receipt cannot pass", async () => {
  await scratch(async root => {
    const fixture = await createFixture(root, "healthy", { protocol_version: 2, runtime: { source_digest: "fixture" } });
    await writeFile(join(fixture.cwd, "result.txt"), "ALPHA\n");
    const good = successfulAttempt(fixture);
    const bad = { ...good, items: good.items.map(x => x.type === "mcpToolCall" ? { ...x, result: { structuredContent: { protocol_version: 2, runtime: { source_digest: "other" } } } } : x) };
    assert.equal((await evaluateAttempt(bad, fixture, validPolicy())).success, false);
    await writeFile(join(fixture.cwd, "check.mjs"), "process.exit(0);\n");
    assert.equal((await evaluateAttempt(good, fixture, validPolicy())).success, false);
  });
});

class FakeClient extends EventEmitter {
  constructor(fixture, options = {}) { super(); this.fixture = fixture; this.options = options; this.calls = []; this.closed = false; }
  notify(message) { this.calls.push(message); }
  async request(method, params) {
    this.calls.push({ method, params });
    if (method === "initialize") return { platformOs: "fixture" };
    if (method === "model/list") return { data: [{ id: "primary", model: "primary" }, { id: "fallback", model: "fallback" }], nextCursor: null };
    if (method === "skills/list") return { data: [{ cwd: this.fixture.cwd, skills: [{ name: "p03-fixture", path: this.fixture.skillPath, enabled: true }], errors: [] }] };
    if (method === "mcpServerStatus/list") return { data: [{ name: "p03", tools: { workflow_runtime_info: {} } }], nextCursor: null };
    if (method === "thread/start") {
      if (this.options.missingMcp) throw Object.assign(new Error("Required MCP p03 failed to initialize"), { rpcError: { code: -32000, message: "Required MCP p03 failed to initialize" } });
      return { thread: { id: "thread", cwd: this.fixture.cwd }, cwd: this.fixture.cwd, model: params.model, modelProvider: "fixture", approvalPolicy: "never", sandbox: { type: "workspaceWrite", writableRoots: [this.fixture.cwd], networkAccess: false, excludeSlashTmp: true, excludeTmpdirEnvVar: true } };
    }
    if (method === "turn/start") {
      if (params.model === "p03-invalid-model") throw Object.assign(new Error("Model unavailable"), { rpcError: { code: -32602, message: "Model unavailable" } });
      if (this.options.hang) return { turn: { id: "turn", status: "inProgress" } };
      const attempt = successfulAttempt(this.fixture, { requestedModel: params.model, reportedModel: params.model });
      if (this.options.interrupt) this.waitChild = spawn(process.execPath, ["wait.mjs"], { cwd: this.fixture.cwd, stdio: "ignore" });
      else await writeFile(join(this.fixture.cwd, "result.txt"), "ALPHA\n");
      queueMicrotask(() => {
        if (this.options.interrupt) this.emit("notification", { method: "item/started", params: { threadId: "thread", turnId: "turn", item: { id: "wait", type: "commandExecution", command: "rtk proxy node wait.mjs", status: "inProgress" } } });
        else {
          for (const item of attempt.items) this.emit("notification", { method: "item/completed", params: { threadId: this.options.foreign ? "foreign" : "thread", turnId: "turn", item } });
          this.emit("notification", { method: "turn/completed", params: { threadId: this.options.foreign ? "foreign" : "thread", turn: this.options.failed ? { id: "turn", status: "failed", error: { message: "Fixture upstream failure" } } : attempt.terminal } });
        }
      });
      return { turn: { id: "turn", status: "inProgress" } };
    }
    if (method === "turn/interrupt") {
      queueMicrotask(() => this.emit("notification", { method: "turn/completed", params: { threadId: "thread", turn: { id: "turn", status: "interrupted" } } }));
      return {};
    }
    throw new Error(`Unexpected method ${method}`);
  }
  async close() {
    this.closed = true;
    if (this.waitChild && this.waitChild.exitCode === null) {
      const exit = once(this.waitChild, "exit");
      this.waitChild.kill("SIGTERM");
      await exit;
    }
    return { reaped: true };
  }
}

test("healthy runner subscribes before turn/start, checks explicit skill and closes the client", async () => {
  await scratch(async root => {
    const fixture = await createFixture(root, "healthy", { protocol_version: 2 });
    const client = new FakeClient(fixture);
    const report = await runCase({ caseName: "healthy", policy: validPolicy(), fixture, createClient: () => client });
    assert.equal(report.success, true);
    const call = client.calls.find(c => c.method === "turn/start");
    assert.ok(call.params.input.some(x => x.type === "skill" && x.path === fixture.skillPath));
    assert.equal(call.params.sandboxPolicy.networkAccess, false);
    assert.equal(client.closed, true);
  });
});

test("negative control rejects unavailable required MCP without accepted turns", async () => {
  await scratch(async root => {
    const fixture = await createFixture(root, "missing-mcp", { protocol_version: 2 });
    const client = new FakeClient(fixture, { missingMcp: true });
    const report = await runCase({ caseName: "missing-mcp", policy: validPolicy(), fixture, createClient: () => client, healthyControl: true });
    assert.equal(report.admission.verdict, "pass");
    assert.equal(report.attempts[0].acceptedTurns, 0);
    assert.ok(!client.calls.some(c => c.method === "turn/start"));
    assert.equal(report.success, false);
    assert.equal(client.closed, true);
  });
});

test("pre-turn model rejection permits one allowed fallback but does not invent failed-turn evidence", async () => {
  await scratch(async root => {
    const fixture = await createFixture(root, "unavailable-model", { protocol_version: 2 });
    const clients = [];
    const report = await runCase({ caseName: "unavailable-model", policy: validPolicy(), fixture, createClient: () => { const c = new FakeClient(fixture); clients.push(c); return c; } });
    assert.equal(report.fallback.verdict, "pass");
    assert.equal(report.failure.verdict, "inconclusive");
    assert.equal(report.model.verdict, "inconclusive");
    assert.equal(report.attempts.length, 2);
    assert.equal(report.attempts[0].turnId, undefined);
    assert.ok(clients.every(c => c.closed));
    assert.equal(clients.flatMap(c => c.calls).filter(c => c.method === "turn/start").length, 2);
  });
});

test("interruption acknowledgment cannot be success and targets the actual started turn", async () => {
  await scratch(async root => {
    const fixture = await createFixture(root, "interrupted", { protocol_version: 2 });
    const client = new FakeClient(fixture, { interrupt: true });
    const report = await runCase({ caseName: "interrupted", policy: validPolicy(), fixture, createClient: () => client });
    assert.equal(report.success, false);
    assert.equal(report.interruption.verdict, "pass");
    assert.deepEqual(client.calls.find(c => c.method === "turn/interrupt").params, { threadId: "thread", turnId: "turn" });
  });
});

test("deadline and foreign terminal events cannot pass; cancellation closes owned children", async () => {
  await scratch(async root => {
    const fixture = await createFixture(root, "healthy", { protocol_version: 2 });
    for (const options of [{ hang: true }, { foreign: true }]) {
      const client = new FakeClient(fixture, options);
      const report = await runCase({ caseName: "healthy", policy: { ...validPolicy(), deadlineMs: 25 }, fixture, createClient: () => client });
      assert.equal(report.success, false);
      assert.equal(report.deadlineExceeded, true);
      assert.equal(client.closed, true);
    }
  });
});

test("evidence redaction drops reasoning and credential/account fields recursively", () => {
  const value = redact({ token: "secret", account: { email: "private" }, reasoning: "hidden", params: { result: { access_token: "secret", protocol_version: 2 } } });
  assert.equal(JSON.stringify(value).includes("secret"), false);
  assert.equal(JSON.stringify(value).includes("private"), false);
  assert.equal(JSON.stringify(value).includes("hidden"), false);
  assert.equal(value.params.result.protocol_version, 2);
  const event = redact({ method: "item/reasoning/textDelta", params: { threadId: "t", delta: "private thoughts" } });
  assert.equal(JSON.stringify(event).includes("private thoughts"), false);
  assert.equal(JSON.stringify(redact({ item: { type: "reasoning", summary: "private thoughts" } })).includes("private thoughts"), false);
});

test("a setup or permission rejection cannot trigger model fallback", async () => {
  await scratch(async root => {
    const fixture = await createFixture(root, "unavailable-model", { protocol_version: 2 });
    const clients = [];
    const report = await runCase({ caseName: "unavailable-model", policy: validPolicy(), fixture, createClient: () => {
      const client = new FakeClient(fixture, { missingMcp: true }); clients.push(client); return client;
    } });
    assert.equal(clients.length, 1);
    assert.equal(report.fallback.verdict, "inconclusive");
  });
});

test("an already cancelled run spawns no client", async () => {
  await scratch(async root => {
    const fixture = await createFixture(root, "healthy", { protocol_version: 2 });
    const controller = new AbortController(); controller.abort();
    let calls = 0;
    const report = await runCase({ caseName: "healthy", policy: validPolicy(), fixture, signal: controller.signal, createClient: () => { calls++; return new FakeClient(fixture); } });
    assert.equal(calls, 0);
    assert.equal(report.success, false);
  });
});

test("fixture setup refuses existing workspace content rather than overwriting it", async () => {
  await scratch(async root => {
    await createFixture(root, "healthy", { protocol_version: 2 });
    await assert.rejects(createFixture(root, "healthy", { protocol_version: 2 }), /exist/i);
  });
});

test("reported out-of-list model and active-child cleanup failures remain explicit failures", async () => {
  await scratch(async root => {
    const fixture = await createFixture(root, "healthy", { protocol_version: 2 });
    const client = new FakeClient(fixture);
    const original = client.request.bind(client);
    client.request = async (method, params) => {
      const result = await original(method, params);
      if (method === "thread/start") result.model = "unapproved";
      return result;
    };
    const report = await runCase({ caseName: "healthy", policy: validPolicy(), fixture, createClient: () => client });
    assert.equal(report.model.verdict, "fail");
    assert.equal(report.success, false);
  });
});

test("a fallback is forbidden after partial primary effects and cleanup failure prevents healthy success", async () => {
  await scratch(async root => {
    const fixture = await createFixture(root, "unavailable-model", { protocol_version: 2 });
    await writeFile(join(fixture.cwd, "result.txt"), "ALPHA\n");
    let created = 0;
    const report = await runCase({ caseName: "unavailable-model", policy: validPolicy(), fixture, createClient: () => { created++; return new FakeClient(fixture); } });
    assert.equal(created, 1);
    assert.equal(report.fallback.verdict, "fail");
    const client = new FakeClient(fixture);
    client.close = async () => ({ reaped: false });
    const healthy = await runCase({ caseName: "healthy", policy: validPolicy(), fixture, createClient: () => client });
    assert.equal(healthy.success, false);
  });
});

test("CLI never silently enables execution and refuses relative preparation paths", async () => {
  await scratch(async root => {
    const target = join(root, "inert");
    await prepareProbe(target);
    await assert.rejects(main(["--execute", target, "--case", "healthy"]), /authority/i);
    await assert.rejects(main(["--prepare", "relative-p03-root"]), /absolute/i);
  });
});

test("JSONL transport handles fragmented messages in an isolated child environment and refuses implicit server requests", async () => {
  await scratch(async root => {
    const binary = join(root, "fake-codex.mjs");
    await writeFile(binary, `#!${process.execPath}\nimport { createInterface } from 'node:readline';
createInterface({input:process.stdin}).on('line', line=>{
 const m=JSON.parse(line); if(m.method==='exit') return process.exit(7);
 if(m.method==='server-request') {process.stdout.write(JSON.stringify({id:'server',method:'tool/requestUserInput',params:{}})+'\\n');return;}
 if(!m.method) return;
 const reply=JSON.stringify({id:m.id,result:{echo:m.params,home:process.env.CODEX_HOME}})+'\\n';
 process.stdout.write(reply.slice(0,5));setTimeout(()=>process.stdout.write(reply.slice(5)),5);
});\n`, { mode: 0o700 });
    await chmod(binary, 0o700);
    const originalHome = process.env.CODEX_HOME;
    const records = [];
    const client = new JsonlClient(binary, { cwd: root, env: { PATH: process.env.PATH, CODEX_HOME: root }, record: (d, m) => records.push({ d, m }) });
    try {
      assert.deepEqual(await client.request("echo", { value: 42 }), { echo: { value: 42 }, home: root });
      const serverRequest = once(client, "serverRequest");
      client.notify({ method: "server-request", params: {} });
      await serverRequest;
      assert.ok(records.some(x => x.d === "send" && x.m.id === "server" && x.m.error.code === -32601));
      await assert.rejects(client.request("exit"), /exited: 7/);
    } finally { assert.equal((await client.close()).reaped, true); }
    assert.equal(process.env.CODEX_HOME, originalHome);
  });
});

test("JSONL transport rejects malformed and oversized lines rather than losing pending requests", async () => {
  await scratch(async root => {
    const binary = join(root, "fake-bad.mjs");
    for (const output of ['{invalid}\n', 'x'.repeat(200)]) {
      await writeFile(binary, `#!${process.execPath}\nprocess.stdin.once('data',()=>process.stdout.write(${JSON.stringify(output)}));\n`, { mode: 0o700 });
      const client = new JsonlClient(binary, { cwd: root, env: { PATH: process.env.PATH }, maxLineBytes: 100 });
      try { await assert.rejects(client.request("echo"), /Invalid JSONL|Oversized/); }
      finally { await client.close(); }
    }
  });
});

test("existing MCP supplies the read-only health receipt through an isolated local child", async () => {
  await scratch(async root => {
    await mkdirForHealth(root);
    const health = await readMcpHealth(root);
    assert.equal(health.protocol_version, 2);
    assert.ok(health.result.capabilities.includes("workflow_runtime_info"));
  });
});

async function mkdirForHealth(root) {
  const { mkdir } = await import("node:fs/promises");
  await mkdir(join(root, "codex-home"));
  await mkdir(join(root, "tmp"));
}

test("failed terminal notification maps to non-success without starting another turn", async () => {
  await scratch(async root => {
    const fixture = await createFixture(root, "healthy", { protocol_version: 2 });
    const client = new FakeClient(fixture, { failed: true });
    const report = await runCase({ caseName: "healthy", policy: validPolicy(), fixture, createClient: () => client });
    assert.equal(report.success, false);
    assert.equal(report.failure.verdict, "pass");
    assert.equal(client.calls.filter(c => c.method === "turn/start").length, 1);
  });
});

test("case evidence symlinks are rejected before preflight or outside writes", async () => {
  await scratch(async root => {
    const target = join(root, "probe"), outside = join(root, "outside");
    await prepareProbe(target);
    await writeFile(join(target, "policy.json"), JSON.stringify(validPolicy()));
    await mkdir(outside);
    await mkdir(join(target, "evidence"));
    await symlink(outside, join(target, "evidence", "healthy"));
    await assert.rejects(main(["--execute", target, "--case", "healthy"]), /exist/i);
    assert.deepEqual(await readdir(outside), []);
  });
});

test("the durable scratch request budget is charged at most four times and malformed counters fail closed", async () => {
  await scratch(async root => {
    const target = join(root, "probe");
    await prepareProbe(target);
    for (let i = 0; i < 4; i++) reserveTurnRequest(target);
    assert.throws(() => reserveTurnRequest(target), /budget/);
    assert.equal(JSON.parse(await readFile(join(target, "requests.json"), "utf8")).sent, 4);
    await writeFile(join(target, "requests.json"), '{"sent":-1}');
    assert.throws(() => reserveTurnRequest(target), /budget/);
  });
});

test("effective extra writable roots are rejected before inference", async () => {
  await scratch(async root => {
    const fixture = await createFixture(root, "healthy", { protocol_version: 2 });
    const client = new FakeClient(fixture);
    const original = client.request.bind(client);
    client.request = async (method, params) => {
      const result = await original(method, params);
      if (method === "thread/start") result.sandbox.writableRoots.push("/outside");
      return result;
    };
    const report = await runCase({ caseName: "healthy", policy: validPolicy(), fixture, createClient: () => client });
    assert.equal(report.success, false);
    assert.ok(!client.calls.some(c => c.method === "turn/start"));
  });
});

test("unsupported pinned schema blocks execution instead of deleting required request fields", () => {
  const methods = ["initialize", "thread/start", "turn/start", "model/list", "skills/list", "mcpServerStatus/list", "turn/interrupt"];
  const schema = { type: "object", oneOf: methods.map(method => ({ properties: { method: { enum: [method] } }, required: ["method"] })) };
  schema.properties = { id: { type: "integer", format: "int64" } };
  assert.doesNotThrow(() => assertProtocolSchema(schema, validPolicy(), "/scratch"));
  assert.throws(() => assertProtocolSchema({ ...schema, oneOf: schema.oneOf.slice(0, -1) }, validPolicy(), "/scratch"), /required method/);
  const strict = structuredClone(schema);
  strict.oneOf.find(x => x.properties.method.enum.includes("turn/start")).properties.params = { type: "object", properties: { input: { type: "array", maxItems: 0 } }, required: ["input"] };
  assert.throws(() => assertProtocolSchema(strict, validPolicy(), "/scratch"), /rejects.*turn\/start/);
});
