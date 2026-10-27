import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { createNativeCaseFixture } from "./specification-review-native-fixtures.mjs";
import { assessConflictEvidence, assessOmissionEvidence, reviewOutcome, summarizeUsage } from "./specification-review-native-report.mjs";
import { nativeTelemetrySource } from "./specification-review-native-telemetry.mjs";
import { createReviewAccessPolicy, createReviewAccessAudit, installReviewAccessGuard } from "./specification-review-native-access.mjs";

const repository = fileURLToPath(new URL("../../", import.meta.url));
const allowedTools = new Set(["specification_open", "specification_review_get", "specification_review_prepare_workflow",
  "specification_review_submit_batch", "specification_review_consistency_record", "specification_review_complete", "specification_review_scope_expand",
  "scope_get", "requirement_list", "requirement_get", "decision_find", "decision_get", "specification_review_status"]);

function fail(code) { throw Object.assign(new Error(code), { code }); }
function sha(value) { return createHash("sha256").update(value).digest("hex"); }
function safeCode(value) { return typeof value === "string" && /^[A-Z][A-Z0-9_]{0,63}$/u.test(value) ? value : "NATIVE_EXECUTION_FAILED"; }

export function parentProgramGuard(program, execution) {
  if (execution.name !== "run_code") return undefined;
  const code = execution.arguments?.code;
  if (typeof program !== "string" || typeof code !== "string" || code.trim() !== program.trim()) {
    return "QUALIFICATION_PARENT_PROGRAM_MISMATCH";
  }
  return undefined;
}

async function hostModules(options) {
  const require = createRequire(join(options.clientRoot, "package.json"));
  const cache = new Map();
  async function load(name) {
    if (!cache.has(name)) {
      const modulePath = require.resolve("@deepseek-ai/" + name);
      cache.set(name, await import(pathToFileURL(modulePath).href));
    }
    return cache.get(name);
  }
  const { Context } = await load("cordis");
  const tools = await load("dsh-tools");
  const bridge = await load("dsh-mcp-client");
  const llm = await load("dsh-llm");
  const workflow = await load("dsh-workflow-ptc");
  if (sha(await readFile(options.providerModule)) !== options.providerSha256) fail("PROVIDER_CHANGED");
  const codex = await import(pathToFileURL(options.providerModule).href);
  codex.OpenAICodexCredentialStore.prototype.writeDocument = async function refuseCredentialMutation() {
    fail("TRIAL_AUTH_WRITE_BLOCKED");
  };
  return { Context, tools, bridge, llm, workflow, codex, load };
}

function createState() {
  return { actors: new Map(), errors: [], rpc_ms: 0, response_bytes: 0, rpc_calls: 0, rejections: 0,
    lock_wait_ms: 0, lock_samples: 0, native_start: 0, native_end: 0, active: 0, peak: 0,
    parent_steps_pending: 0, pending: false, build: null, actorIndex: 0,
    intentional_cancel: false, recovering: false, cancelled_runs: 0, expected_abort_errors: 0,
    omission_found: false, native_schema_checks: 0, parent_program: null, parent_program_rejections: 0,
    scope_order_rejections: 0, submitted_verdicts: new Map(), saved_consistency: null };
}

function observeSession(state, session, event) {
  state.access_audit.observe(session, event);
  const actor = state.actors.get(session.id);
  if (!actor) return;
  if (event.type === "turn/start") actor.metrics.turns += 1;
  if (event.type === "step/start") {
    actor.metrics.steps += 1;
    if (actor.role === "parent" && state.pending) state.parent_steps_pending += 1;
  }
  if (event.type === "user/message" && actor.role === "unknown") {
    const texts = event.data.content.filter(isText).map(textValue);
    const message = texts.join("\n");
    const offset = message.lastIndexOf("Assignment:\n");
    if (offset >= 0) {
      const assignment = JSON.parse(message.slice(offset + "Assignment:\n".length));
      if (["detailed", "final"].includes(assignment.kind)) actor.role = assignment.kind;
    }
  }
  if (event.type === "request/header") {
    const config = event.data.header.config;
    if (config.provider !== state.options.provider || config.model !== state.options.model || config.reasoningEffort !== state.options.reasoningEffort) {
      state.errors.push("MODEL_ROUTE_CHANGED");
      actor.agent.cancel({ kind: "hook", reason: "Qualification route changed." });
    }
  }
  if (event.type === "assistant/message") {
    const message = event.data.message;
    if (message.source?.kind === "model") actor.metrics.model_responses += 1;
    const usage = event.data.usage;
    if (usage) {
      actor.metrics.usage_observations += 1;
      actor.metrics.input_tokens_observed += usage.inputTokens;
      actor.metrics.output_tokens_observed += usage.outputTokens;
    }
  }
}

function isText(value) { return value.type === "text"; }
function textValue(value) { return value.text; }

async function openReader(fixture, directory, index, signal) {
  const loader = join(directory, "reader-" + index + ".mjs");
  const telemetry = nativeTelemetrySource({ actor: index, serverModule: import.meta.resolve("@modelcontextprotocol/server"), output: join(directory, "handler-times.jsonl") });
  await writeFile(loader, telemetry, { mode: 0o600 });
  const client = new Client({ name: "native-qualification-" + index, version: "1" });
  const entrypoint = fixture.mcpEntrypoint ?? join(repository, "packages/engineer-agent-workflow-mcp/dist/main.js");
  const transport = new StdioClientTransport({ command: process.execPath, args: ["--import", pathToFileURL(loader).href, entrypoint], cwd: fixture.project, stderr: "pipe" });
  transport.stderr?.on("data", ignoreDiagnostic);
  let closing;
  function closeReader() { closing ??= client.close(); return closing; }
  function aborted() { void closeReader(); }
  signal?.addEventListener("abort", aborted, { once: true });
  try {
    signal?.throwIfAborted();
    await client.connect(transport);
    signal?.throwIfAborted();
    return { client, close: closeReader };
  } catch (error) { await closeReader(); throw error; }
  finally { signal?.removeEventListener("abort", aborted); }
}

function measuredCalls(runtime, actor, client) {
  const { state, record } = runtime;
  async function call(name, args, signal) {
    const started = performance.now();
    actor.metrics.mcp_calls += 1;
    state.rpc_calls += 1;
    await record({ type: "mcp-call", actor: actor.index, name, arguments: args });
    const response = await client.callTool({ name, arguments: args }, undefined, { signal, timeout: 120_000 });
    state.rpc_ms += performance.now() - started;
    state.response_bytes += Buffer.byteLength(JSON.stringify(response));
    if (response.isError) state.rejections += 1;
    const result = response.structuredContent?.result;
    if (name === "specification_review_submit_batch" && result?.saved && Number.isFinite(result.lock_wait_ms)) {
      state.lock_wait_ms += result.lock_wait_ms;
      state.lock_samples += 1;
    }
    if (name === "specification_review_submit_batch" && result?.saved) {
      for (const item of args.items ?? []) state.submitted_verdicts.set(item.item_index, structuredClone(item));
    }
    if (name === "specification_review_consistency_record" && !response.isError
      && result?.review_ref === args.review_ref && result?.consistency_status === args.verdict) {
      state.saved_consistency = structuredClone(args);
    }
    if (name === "scope_get" && !response.isError) actor.metrics.scope_reads += 1;
    await record({ type: "mcp-result", actor: actor.index, name, response });
    if (runtime.options.cancellationCase === runtime.selected.name && !state.intentional_cancel
      && name === "specification_review_submit_batch" && result?.saved
      && result.recorded_items === runtime.detailedItems) {
      state.intentional_cancel = true;
      await record({ type: "intentional-cancel-after-saves", saved_items: result.recorded_items });
      runtime.cancelParent();
    }
    return response;
  }
  return call;
}

async function verifyReader(runtime, call, signal) {
  const identity = await call("workflow_runtime_info", {}, signal);
  const build = identity.structuredContent?.result;
  if (build?.identity_status !== "verified" || !build.build_id) fail("MCP_BUILD_UNVERIFIED");
  if (runtime.options.expectedMcpBuildId && runtime.options.expectedMcpBuildId !== build.build_id) fail("MCP_BUILD_CHANGED");
  if (runtime.state.build && runtime.state.build !== build.build_id) fail("MCP_BUILD_CHANGED");
  runtime.state.build = build.build_id;
}

async function attachReader(agent, runtime, fixture, directory, host, signal) {
  const { state, record } = runtime;
  const index = state.actorIndex++;
  const actor = { role: agent.session.header.parentSession ? "unknown" : "parent", index, agent,
    metrics: { turns: 0, steps: 0, model_responses: 0, usage_observations: 0, input_tokens_observed: 0, output_tokens_observed: 0, mcp_calls: 0, scope_reads: 0 } };
  state.actors.set(agent.id, actor);
  installReviewAccessGuard(agent, runtime.access_policy, state.access_audit.recordDecision);
  if (actor.role !== "parent") {
    agent.ctx.tools.restrict({ allow: ["read"] });
    function requireScopeBeforeJudgment(execution) {
      const judging = execution.name === "mcp__eaw__specification_review_submit_batch"
        || execution.name === "mcp__eaw__specification_review_consistency_record";
      if (judging && actor.metrics.scope_reads === 0) {
        state.scope_order_rejections += 1;
        state.errors.push("QUALIFICATION_SCOPE_READ_REQUIRED");
        return "QUALIFICATION_SCOPE_READ_REQUIRED";
      }
      return undefined;
    }
    agent.ctx.tools.guard(requireScopeBeforeJudgment);
    // Full MCP schemas contain validation keywords outside the Host PTC SDK
    // projection subset. Native presentation preserves them without guessing.
    agent.ctx.tools.presentAs("native");
    agent.ctx.systemPrompt.section({ name: "qualification:behavior-witness", order: 9000,
      text: "This is an isolated qualification fixture. Obtain confirmed scope with the advertised scope_get MCP operation before judging. Do not read managed workflow files or review archives through filesystem tools. For a behavioral gap or conflict, encode counterexample as a JSON object string with fields operation (the affected operation identifier), input (a concrete input object), permitted_by_spec (a concrete result allowed by the current specification), and required_by_source (the concrete result required by the exact sources). For a contradiction, permitted_by_spec is the result required by one applicable normative section, while required_by_source is the incompatible result required by the sources or another applicable section for that same input; explain why they cannot both hold. Choose these values independently from the consumed evidence. This format prescribes neither a verdict nor a defect. Keep the semantic explanation in explanation. A pure prose counterexample cannot be machine-verified by this fixture control.", interpolate: false });
  } else {
    function guardParentProgram(execution) {
      const reason = parentProgramGuard(state.parent_program, execution);
      if (reason) {
        state.parent_program_rejections += 1;
        state.errors.push(reason);
      }
      return reason;
    }
    agent.ctx.tools.guard(guardParentProgram);
  }
  const reader = await openReader(fixture, directory, index, signal);
  agent.ctx.effect(function readerOwnership() { return reader.close; });
  const { client } = reader;
  const call = measuredCalls(runtime, actor, client);
  await verifyReader(runtime, call, signal);
  const catalog = await client.listTools();
  for (const tool of catalog.tools) {
    if (!allowedTools.has(tool.name)) continue;
    async function invoke(args, execution) { return call(tool.name, args, execution.signal); }
    const definition = host.bridge.createMcpToolDefinition(agent.ctx, {
      name: "mcp__eaw__" + tool.name, rawName: tool.name, description: tool.description ?? tool.name,
      inputSchema: tool.inputSchema, outputSchema: tool.outputSchema, call: invoke,
    });
    assert.deepEqual(definition.parameters, tool.inputSchema);
    agent.ctx.tools.register(definition);
  }
  if (actor.role !== "parent") {
    const submission = agent.ctx.tools.get("mcp__eaw__specification_review_submit_batch", agent);
    assert.ok(submission.parameters.properties.context.minLength > 0);
    agent.ctx.tools.executionMode({ callId: "native-schema-check", name: submission.name, arguments: {}, agent, signal: signal ?? new AbortController().signal });
    state.native_schema_checks += 1;
  }
  await record({ type: "reader-ready", actor: index, presentation: actor.role === "parent" ? "ptc" : "native", build_id: state.build });
}

function ignoreDiagnostic() { /* Raw server stderr never enters the public report. */ }

export async function createRuntime(options, fixture, directory, selected, signal) {
  const host = await hostModules(options);
  const ctx = new host.Context();
  const state = createState();
  state.options = options;
  const reviewerReference = options.reviewerReference ?? join(repository, "exports/deepseek-harness/skills/spec-driven-development/references/completeness-review.md");
  const accessPolicy = createReviewAccessPolicy({ project: fixture.project, specification: fixture.specification,
    referenceRoots: [dirname(dirname(reviewerReference))] });
  state.access_audit = createReviewAccessAudit(accessPolicy, { requireGuards: true });
  let writing = Promise.resolve();
  let traceBytes = 0;
  function record(value) {
    const row = JSON.stringify({ at: performance.now(), ...value }) + "\n";
    traceBytes += Buffer.byteLength(row);
    if (traceBytes > 32 * 1024 * 1024) fail("TRACE_LIMIT");
    async function persist() { await appendFile(join(directory, "trace.jsonl"), row, { mode: 0o600 }); }
    writing = writing.then(persist);
    return writing;
  }
  function cancelParent() { handle?.agent.cancel({ kind: "hook", reason: "Qualification interruption after detailed saves." }); }
  const runtime = { state, record, options, selected, access_policy: accessPolicy, detailedItems: fixture.review.total_items - 1, cancelParent };
  let handle;
  function abortParent() { handle?.agent.cancel({ kind: "user" }); }
  try {
    for (const name of ["session", "session-projection", "agent", "system-prompt", "tools", "llm", "fs-local", "working-directory", "subprocess-local", "sandbox-local"]) {
      const module = await host.load("dsh-" + name);
      await ctx.plugin(module.default ?? module, name === "tools" ? { mode: "ptc" } : {});
    }
    await ctx.plugin((await host.load("dsh-sandbox-policy")).default, { mode: "read-only", workspaceRoot: fixture.project });
    await ctx.plugin((await host.load("dsh-ptc-runtime-node")).default, { timeoutMs: options.modelTimeoutMs, maxTimeoutMs: options.modelTimeoutMs, maxOutputBytes: 1024 * 1024 });
    const metrics = join(directory, "provider-metrics");
    await mkdir(metrics, { mode: 0o700 });
    await ctx.plugin(host.codex, { models: [options.model], reasoningEffort: options.reasoningEffort, retryPolicy: { mode: "normal", maxRetries: 0 },
      enableProxy: false, enableSearch: false, enableReserveFallback: false, enableNativeCompaction: false,
      enableImageTool: false, enableImageGeneration: false, enableAutoReview: false, requestMetricsDirectory: metrics });
    const advertised = await ctx.llm.listModels(options.provider);
    function selectedModel(model) { return model.id === options.model; }
    if (!advertised.some(selectedModel)) fail("MODEL_ROUTE_UNAVAILABLE");
    const callConfig = await ctx.llm.resolveCallConfig({ provider: options.provider, model: options.model, reasoningEffort: options.reasoningEffort });
    assert.equal(callConfig.reasoningEffort, options.reasoningEffort);
    await ctx.plugin((await host.load("dsh-agent-loop")).default, { agents: [] });
    await ctx.plugin(await host.load("dsh-session-persistence-jsonl"), { root: join(directory, "sessions"), compression: "none" });
    await ctx.plugin((await host.load("dsh-session-query-sqlite")).default, { path: ":memory:", openAt: "never" });
    await ctx.plugin((await host.load("dsh-subagent")).default, {});
    await ctx.plugin(await host.load("dsh-subagent-spawn-in-process"), { providerName: "spawn" });
    await ctx.plugin(host.workflow.default, { provider: "spawn", maxConcurrentAgents: 4, maxTotalAgents: 1000 });
    await ctx.plugin(await host.load("dsh-tool-fs"), { read: true, readImage: false, write: false, edit: false });
    await ctx.plugin(await host.load("dsh-tool-workflow"), { enableRunInBackground: false });
    if (selected.name === "sequential-omission") registerSequential(ctx, host, options, fixture);
    async function created({ agent, signal: creationSignal }) { await attachReader(agent, runtime, fixture, directory, host, creationSignal); }
    ctx.on("agent/created", created);
    function sessionEvent(session, event) { observeSession(state, session, event); }
    ctx.on("session/event", sessionEvent);
    function failed({ error }) {
      const expected = state.intentional_cancel && !state.recovering
        && (error.name === "AbortError" || ["ABORTED", "CANCELLED"].includes(error.code));
      if (expected) state.expected_abort_errors += 1;
      else state.errors.push(safeCode(error.code));
    }
    ctx.on("agent/error", failed);
    ctx.on("workflow/start", function workflowStarted() { state.pending = true; state.native_start += 1; });
    ctx.on("workflow/end", function workflowEnded(_info, result) {
      state.pending = false;
      state.native_end += 1;
      if (result.stopReason === "cancelled") state.cancelled_runs += 1;
    });
    ctx.on("workflow/agent-start", function childStarted() { state.active += 1; state.peak = Math.max(state.peak, state.active); });
    ctx.on("workflow/agent-end", function childEnded() { state.active -= 1; });
    const route = { provider: options.provider, model: options.model, reasoningEffort: options.reasoningEffort };
    handle = await ctx.agents.create({ sessionId: "qualification-parent-" + randomUUID(), meta: { cwd: fixture.project }, agentOptions: route, signal });
    signal.addEventListener("abort", abortParent, { once: true });
    if (signal.aborted) abortParent();
    async function drive(prompt) {
      signal.throwIfAborted();
      const message = host.llm.createUserMessage({ content: [{ type: "text", text: prompt }], source: { kind: "user" } });
      handle.agent.followup(message);
      await handle.agent.whenIdle();
      if (state.errors.length) fail(state.errors[0]);
      signal.throwIfAborted();
    }
    async function dispose() {
      signal.removeEventListener("abort", abortParent);
      await handle.dispose();
      await ctx.fiber.dispose();
      await writing;
      assert.equal(state.active, 0);
      await writeFile(join(directory, "disposed.json"), JSON.stringify({ completed: true }), { mode: 0o600 });
    }
    return { ...runtime, drive, dispose, ctx, parent: handle.agent };
  } catch (error) {
    signal.removeEventListener("abort", abortParent);
    await ctx.fiber.dispose();
    await writing;
    throw error;
  }
}

function registerSequential(ctx, host, options, fixture) {
  async function execute({ args }, execution) {
    const script = await readFile(options.workflowScript, "utf8");
    assert.equal(sha(script), options.workflowSha256);
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const evaluate = new AsyncFunction("args", "agent", "parallel", "phase", "log", script);
    async function agent(prompt, settings) {
      const active = await ctx.subagents.startActivation({ provider: "spawn", label: "Sequential independent review", delivery: "caller", signal: execution.signal,
        request: { parent: execution.agent, cwd: fixture.project, prompt: [{ type: "text", text: prompt }], outputSchema: settings.schema,
          agentOptions: { provider: settings.provider, model: settings.model } } });
      try {
        const result = await active.result;
        if (result.stopReason !== "completed") fail("SEQUENTIAL_JUDGE_FAILED");
        return result.structured;
      } finally { await active.dispose(); }
    }
    async function parallel(thunks) {
      const results = [];
      for (const thunk of thunks) results.push(await thunk());
      return results;
    }
    function noProgress() {}
    return evaluate(args, agent, parallel, noProgress, noProgress);
  }
  function render(_args, value) { return [{ type: "text", text: JSON.stringify(value) }]; }
  const baseline = host.tools.defineTool({ name: "ordinary_sequential_review", description: "Explicit synthetic qualification baseline through ordinary sequential subagent activations.",
    parameters: { args: { type: "object", additionalProperties: true, required: true } },
    output: { schema: { type: "object", additionalProperties: true }, render }, execute });
  ctx.tools.register(baseline);
}

export function parentProgram(options, fixture, selected) {
  const target = JSON.stringify(fixture.target);
  const reference = JSON.stringify(options.reviewerReference);
  const roles = JSON.stringify({ judge: { provider: options.provider, model: options.model }, final: { provider: options.provider, model: options.model } });
  const invoke = selected.name === "sequential-omission" ? "const result = await tools.ordinary_sequential_review({args});"
    : "const script = await fs.readFile(" + JSON.stringify(options.workflowScript) + ", 'utf8');\nconst result = await tools.workflow({script,meta:{name:'specification-review',description:'Explicit isolated model qualification.'},args});";
  return "const fs = await import('node:fs/promises');\nconst target = " + target + ";\n"
    + "const prepared = await tools.mcp__eaw__specification_review_prepare_workflow(target);\n"
    + "if (prepared.structuredContent.result.status !== 'ready_to_run') return {prepared};\n"
    + "const args = {target,prepared:prepared.structuredContent,reviewer_reference:" + reference + ",host:{available:true,concurrency:" + selected.concurrency
    + ",pagination:{same_actor:false,tools:false,context:false,results:false}},roles:" + roles + "};\n" + invoke
    + "\nconst verified = await tools.mcp__eaw__specification_review_prepare_workflow(target);\nreturn {result,verified};";
}

async function readTelemetry(directory) {
  let handlerMs = 0;
  let handlerCalls = 0;
  try {
    const text = await readFile(join(directory, "handler-times.jsonl"), "utf8");
    for (const line of text.trim().split("\n")) {
      if (!line) continue;
      const row = JSON.parse(line);
      handlerMs += row.handler_ms;
      handlerCalls += 1;
    }
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  const { readdir } = await import("node:fs/promises");
  const observations = [];
  const files = await readdir(join(directory, "provider-metrics"));
  for (const file of files) {
    const text = await readFile(join(directory, "provider-metrics", file), "utf8");
    for (const line of text.trim().split("\n")) {
      if (!line) continue;
      const row = JSON.parse(line);
      if (row.event === "finish") observations.push(row);
    }
  }
  return { handlerMs: handlerCalls ? handlerMs : null, handlerCalls, usage: summarizeUsage(observations) };
}

async function runCase(options, name, signal) {
  const callbacks = [];
  function cleanup(callback) { callbacks.push(callback); }
  const directory = join(options.workspace, name + "-" + randomUUID());
  await mkdir(directory, { mode: 0o700 });
  let runtime;
  const setupStarted = performance.now();
  try {
    await checkFrozenInputs(options);
    const created = await createNativeCaseFixture(name, cleanup, { entrypoint: options.serverEntrypoint });
    const { fixture, selected } = created;
    runtime = await createRuntime(options, fixture, directory, selected, signal);
    const setupMs = performance.now() - setupStarted;
    const started = performance.now();
    const program = parentProgram(options, fixture, selected);
    runtime.state.parent_program = program;
const prompt = "The user explicitly authorized this synthetic model qualification. Execute exactly the following program in one run_code call, including its fixed filesystem import and readFile loader for the runner-validated workflow artifact. Do not replace that loader with tools.read, pagination or reconstructed text. The execution guard rejects every altered program. Use the ready generated workflow unchanged. Await its foreground result; do not poll, create background jobs, write another workflow, or launch an inspection actor. Detailed and final actors must judge the evidence independently; no verdict is prescribed. After return, briefly report only the observed result.\n\n" + program;
    let failed = false;
    try { await runtime.drive(prompt); }
    catch (error) { failed = true; runtime.state.errors.push(safeCode(error.code)); }
    if (runtime.state.intentional_cancel) {
      const index = runtime.state.actorIndex++;
      const reader = await openReader(fixture, directory, index, signal);
      const readerState = { index, metrics: { mcp_calls: 0 } };
      const inspect = measuredCalls(runtime, readerState, reader.client);
      try {
        await verifyReader(runtime, inspect, signal);
        const fresh = await inspect("specification_review_prepare_workflow", fixture.target, signal);
        assert.equal(fresh.structuredContent.result.saved_items, fixture.review.total_items - 1);
        assert.equal(fresh.structuredContent.result.remaining_items, 0);
      } finally { await reader.close(); }
      assert.equal(runtime.state.cancelled_runs, 1);
      runtime.state.recovering = true;
      const resumed = "Resume the same synthetic review with a fresh workflow invocation. The prior cancellation was deliberate; saved verdicts must remain saved. Obtain fresh MCP preparation and process only the remaining work. Run exactly this program once, await the foreground result, then report it.\n\n" + program;
      try { await runtime.drive(resumed); }
      catch (error) { failed = true; runtime.state.errors.push(safeCode(error.code)); }
    }
    const observerIndex = runtime.state.actorIndex++;
    const observer = await openReader(fixture, directory, observerIndex, signal);
    const observerState = { index: observerIndex, metrics: { mcp_calls: 0 } };
    const observe = measuredCalls(runtime, observerState, observer.client);
    let status;
    try {
      await verifyReader(runtime, observe, signal);
      const opened = await observe("specification_open", { project: fixture.project, specification: fixture.specification }, signal);
      const reply = await observe("specification_review_status", { context: opened.structuredContent.context, review_ref: fixture.review.review_ref }, signal);
      status = reply.structuredContent.result;
    } finally { await observer.close(); }
    const elapsedMs = performance.now() - started;
    await runtime.dispose();
    const state = runtime.state;
    runtime = undefined;
    const telemetry = await readTelemetry(directory);
    const access = state.access_audit.summary();
const savedItems = [...state.submitted_verdicts.values()];
const semantic = selected.kind === "conflict"
  ? assessConflictEvidence(savedItems, state.saved_consistency, created.oracle)
  : created.oracle ? assessOmissionEvidence(savedItems, created.oracle) : null;
    const missingScope = [...state.actors.values()].filter(function lacksScope(actor) {
      return actor.role !== "parent" && actor.metrics.scope_reads === 0;
    }).length;
    const actors = [];
    for (const actor of state.actors.values()) actors.push({ index: actor.index, role: actor.role, metrics: actor.metrics });
    const result = { name, status: reviewOutcome(status, selected.expected, failed, selected.consistency), expected: selected.expected,
      observed: status.coverage_status, consistency: status.consistency_status,
      spec_sha256: created.specSha256, source_sha256: created.sourceSha256, actors,
      metrics: { elapsed_ms: elapsedMs, setup_ms: setupMs, total_items: status.total_items, recorded_items: status.recorded_items,
        mcp_calls: state.rpc_calls, mcp_rpc_ms: state.rpc_ms, mcp_response_bytes: state.response_bytes,
        scenario_handler_ms: telemetry.handlerMs, handler_calls: telemetry.handlerCalls,
        lock_wait_ms: state.lock_samples ? state.lock_wait_ms : null, submission_samples: state.lock_samples,
        native_runs_started: state.native_start, native_runs_ended: state.native_end, peak_judges: state.peak,
        parent_model_steps_while_pending: state.parent_steps_pending, rejected_model_arguments: state.rejections,
        intentional_cancellations: state.cancelled_runs, resumed_invocations: state.recovering ? 1 : 0,
        native_schema_checks: state.native_schema_checks, omission_evidence_found: state.omission_found ? 1 : 0,
        filesystem_calls: access.filesystem_calls, forbidden_filesystem_successes: access.forbidden_successes,
        denied_filesystem_attempts: access.denied_protected_attempts, filesystem_audit_pass: access.status === "pass" ? 1 : 0,
        judges_missing_scope: missingScope, scope_order_rejections: state.scope_order_rejections,
        parent_program_rejections: state.parent_program_rejections,
        semantic_witness_verified: semantic ? (semantic.status === "verified" ? 1 : 0) : null,
        matched_semantic_items: semantic?.matched_item_indices?.length ?? 0,
        lane_idle_ms: null, cleanup_completed: 1 }, usage: telemetry.usage, errors: state.errors.slice(0,100) };
    if (state.parent_steps_pending || state.native_start !== state.native_end) result.status = "fail";
    if (options.cancellationCase === name && (!state.recovering || state.cancelled_runs !== 1)) result.status = "fail";
if (access.status !== "pass" || missingScope || state.scope_order_rejections || state.parent_program_rejections) result.status = "fail";
if (["omission", "conflict"].includes(selected.kind) && semantic?.status !== "verified") result.status = "fail";
result.metrics.omission_evidence_found = selected.kind === "omission" && semantic?.status === "verified" ? 1 : 0;
    await checkFrozenInputs(options);
    return { result, build: state.build };
  } finally {
    if (runtime) await runtime.dispose();
    for (const callback of callbacks.reverse()) await callback();
  }
}

async function checkFrozenInputs(options) {
  if (sha(await readFile(options.workflowScript)) !== options.workflowSha256) fail("WORKFLOW_CHANGED");
  if (sha(await readFile(options.reviewerReference)) !== options.reviewerSha256) fail("REVIEWER_REFERENCE_CHANGED");
  if (sha(await readFile(options.providerModule)) !== options.providerSha256) fail("PROVIDER_CHANGED");
}

export async function runNativeCases(options, signal) {
  if (options.run !== true || options.allowModelRequests !== true || options.mode !== "native-models") fail("EXPLICIT_MODEL_RUN_REQUIRED");
  if (typeof options.serverEntrypoint !== "string" || !/^[a-f0-9]{64}$/u.test(options.expectedMcpBuildId ?? "")) fail("MCP_SNAPSHOT_REQUIRED");
  const started = performance.now();
  const cases = [];
  let build = null;
  for (const name of options.cases) {
    signal.throwIfAborted();
    const finished = await runCase(options, name, signal);
    if (build && build !== finished.build) fail("MCP_BUILD_CHANGED");
    build = finished.build;
    cases.push(finished.result);
    await writeFile(join(options.workspace, "progress.json"), JSON.stringify({ cases }), { mode: 0o600 });
    if (finished.result.status !== "pass") break;
  }
  function passed(item) { return item.status === "pass"; }
  function failed(item) { return item.status === "fail"; }
  const status = cases.length === options.cases.length && cases.every(passed) ? "pass" : cases.some(failed) ? "fail" : "incomplete";
  return { schema_version: 1, packet_id: "P04", status, evidence_level: "native_models", packet_complete: false,
    provider: options.provider, model: options.model, reasoning_effort: options.reasoningEffort, child_tool_presentation: "native",
    workflow_sha256: options.workflowSha256, mcp_build_id: build, cases, metrics: { elapsed_ms: performance.now() - started },
    next_action: status === "pass" ? "qualification_evidence_ready" : "resolve_native_failure" };
}

async function main() {
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
    if (Buffer.byteLength(input) > 16 * 1024) fail("INVALID_NATIVE_INPUT");
  }
  const options = JSON.parse(input);
  const controller = new AbortController();
  function abort() { controller.abort(); }
  process.once("SIGINT", abort);
  process.once("SIGTERM", abort);
  try { process.stdout.write(JSON.stringify(await runNativeCases(options, controller.signal))); }
  finally { process.removeListener("SIGINT", abort); process.removeListener("SIGTERM", abort); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (!process.argv.includes("--worker-run")) process.exitCode = 1;
  else {
    try { await main(); }
    catch { process.stderr.write("Native qualification worker failed; raw diagnostics remain private.\n"); process.exitCode = 1; }
  }
}
