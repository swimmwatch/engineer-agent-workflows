import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { nativeTelemetrySource } from "../scripts/lib/specification-review-native-telemetry.mjs";
import { parentProgram, runNativeCases } from "../scripts/lib/specification-review-native-worker.mjs";
import { reviewWorkflowFixture } from "../packages/engineer-agent-workflow-mcp/test-support/review-workflow-fixture.mjs";

async function fixtureDefinesEachContractAndSource(t) {
  function requirementText(id, index) { return "Return the explicit value for " + id + " at position " + index + "."; }
  function sourceText(ids, offset) { return "Define " + ids.join(",") + " from source position " + offset + "."; }
  const fixture = await reviewWorkflowFixture(t, { requirements: 2, independentSources: true, requirementText, sourceText });
  assert.ok(fixture.spec.includes(requirementText("CLI-001", 0)));
  assert.ok(fixture.spec.includes(requirementText("CLI-002", 1)));
  const reader = await fixture.openActor("defined-source-probe");
  const first = await fixture.readItem(reader, 1);
  const second = await fixture.readItem(reader, 2);
  assert.equal(first.payload.source.instruction.text, sourceText(["CLI-001"], 0));
  assert.equal(second.payload.source.instruction.text, sourceText(["CLI-002"], 1));
}
test("qualification fixtures retain distinct fully defined requirement and source contracts", fixtureDefinesEachContractAndSource);

async function fixtureUsesItsOwnedServerEntrypoint(t) {
  const { root } = await ownedRoot(t);
  const entrypoint = join(root, "fixture-entrypoint.mjs");
  const marker = join(root, "server-started");
  const source = "import {writeFileSync} from 'node:fs'; writeFileSync(" + JSON.stringify(marker)
    + ",'owned-entrypoint'); await import(" + JSON.stringify(pathToFileURL(fileURLToPath(new URL("../packages/engineer-agent-workflow-mcp/dist/main.js", import.meta.url))).href) + ");";
  await writeFile(entrypoint, source);
  await reviewWorkflowFixture(t, { requirements: 1, entrypoint });
  assert.equal(await readFile(marker, "utf8"), "owned-entrypoint");
}
test("the qualification fixture starts its supplied immutable MCP entrypoint", fixtureUsesItsOwnedServerEntrypoint);

async function parentProgramRejectsUnexpectedExecution() {
  const workerModule = await import("../scripts/lib/specification-review-native-worker.mjs");
  assert.equal(typeof workerModule.parentProgramGuard, "function");
  const expected = "return await tools.workflow({script, meta, args});";
  assert.equal(workerModule.parentProgramGuard(expected, { name: "run_code", arguments: { code: expected } }), undefined);
  assert.equal(workerModule.parentProgramGuard(expected, { name: "run_code", arguments: { code: "\n" + expected + "\n" } }), undefined);
  assert.equal(workerModule.parentProgramGuard(expected, { name: "run_code", arguments: { code: "return await fs.readFile('manifest.yaml');" } }), "QUALIFICATION_PARENT_PROGRAM_MISMATCH");
  assert.equal(workerModule.parentProgramGuard(undefined, { name: "run_code", arguments: {} }), "QUALIFICATION_PARENT_PROGRAM_MISMATCH");
  assert.equal(workerModule.parentProgramGuard(expected, { name: "mcp__eaw__scope_get", arguments: {} }), undefined);
}
test("only the supplied canonical parent program may execute in the qualification scope", parentProgramRejectsUnexpectedExecution);

async function nativeWorkerRequiresFrozenMcpBeforeAnyHostWork() {
  const authorized = { run: true, allowModelRequests: true, mode: "native-models" };
  for (const fields of [{}, { serverEntrypoint: "/private/mcp.js" }, { expectedMcpBuildId: "a".repeat(64) }]) {
    await assert.rejects(runNativeCases({ ...authorized, ...fields }, new AbortController().signal), { code: "MCP_SNAPSHOT_REQUIRED" });
  }
}
test("direct native worker dispatch requires its frozen MCP entrypoint and identity", nativeWorkerRequiresFrozenMcpBeforeAnyHostWork);

async function parentAwaitsTheForegroundWorkflow(t) {
  const { root } = await ownedRoot(t);
  const workflowScript = join(root, "workflow.js");
  await writeFile(workflowScript, "ready-workflow");
  const fixture = { target: { project: "synthetic", specification: "review" } };
  const options = { workflowScript, reviewerReference: "reference", provider: "openai-codex", model: "gpt-6.1-sol" };
  const program = parentProgram(options, fixture, { name: "native-paraphrase", concurrency: 2 });
  const calls = [];
  let release;
  let entered;
  const pending = new Promise(function hold(resolve) { release = resolve; });
  const started = new Promise(function signal(resolve) { entered = resolve; });
  async function prepare(target) {
    assert.deepEqual(target, fixture.target);
    calls.push("prepare");
    return { structuredContent: { result: { status: "ready_to_run" } } };
  }
  async function workflow(args) {
    assert.equal(args.script, "ready-workflow");
    calls.push("workflow");
    entered();
    return pending;
  }
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const execute = new AsyncFunction("tools", program);
  const completion = execute({ mcp__eaw__specification_review_prepare_workflow: prepare, workflow });
  await started;
  assert.deepEqual(calls, ["prepare", "workflow"]);
  release({ status: "reviewed" });
  const result = await completion;
  assert.deepEqual(calls, ["prepare", "workflow", "prepare"]);
  assert.equal(result.result.status, "reviewed");
}
test("the parent hands off once and verifies only after the foreground workflow resolves", parentAwaitsTheForegroundWorkflow);

async function blockedPreparationDoesNotLoadOrLaunch(t) {
  const { root } = await ownedRoot(t);
  const options = { workflowScript: join(root, "absent.js"), reviewerReference: "reference", provider: "openai-codex", model: "gpt-6.1-sol" };
  const program = parentProgram(options, { target: {} }, { name: "native-paraphrase", concurrency: 1 });
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const execute = new AsyncFunction("tools", program);
  let calls = 0;
  async function prepare() { calls += 1; return { structuredContent: { result: { status: "blocked" } } }; }
  async function workflow() { assert.fail("Blocked preparation cannot dispatch a workflow."); }
  const result = await execute({ mcp__eaw__specification_review_prepare_workflow: prepare, workflow });
  assert.equal(calls, 1);
  assert.equal(result.prepared.structuredContent.result.status, "blocked");
}
test("blocked preparation returns before reading the script or dispatching actors", blockedPreparationDoesNotLoadOrLaunch);

const worker = fileURLToPath(new URL("../scripts/lib/specification-review-native-worker.mjs", import.meta.url));
const entrypoint = fileURLToPath(new URL("../packages/engineer-agent-workflow-mcp/dist/main.js", import.meta.url));

function child(args, env) {
  function collect(resolve, reject) {
    const process_ = spawn(process.execPath, args, { env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    function output(value) { stdout += value; }
    function diagnostic(value) { stderr += value; }
    function closed(code) { resolve({ code, stdout, stderr }); }
    process_.stdout.on("data", output);
    process_.stderr.on("data", diagnostic);
    process_.on("error", reject);
    process_.on("close", closed);
  }
  return new Promise(collect);
}

async function ownedRoot(t) {
  const root = await mkdtemp(join(tmpdir(), "eaw-native-unit-"));
  function cleanup() { return rm(root, { recursive: true, force: true }); }
  t.after(cleanup);
  const env = { PATH: process.env.PATH, LANG: "C.UTF-8", HOME: root, DSH_HOME: root, TMPDIR: root };
  return { root, env };
}

async function workerIsInertWithoutRun(t) {
  const { env } = await ownedRoot(t);
  const imported = await child(["--input-type=module", "-e", "await import(" + JSON.stringify(pathToFileURL(worker).href) + ");"], env);
  assert.equal(imported.code, 0);
  assert.equal(imported.stdout, "");
  const invoked = await child([worker], env);
  assert.equal(invoked.code, 1);
  assert.equal(invoked.stdout, "");
}
test("the native worker import and invocation without its explicit marker are inert", workerIsInertWithoutRun);

async function telemetryMeasuresTheRealHandlerWithoutItsPayload(t) {
  const { root, env } = await ownedRoot(t);
  const output = join(root, "handler.jsonl");
  const loader = join(root, "telemetry.mjs");
  const source = nativeTelemetrySource({ actor: 7, serverModule: import.meta.resolve("@modelcontextprotocol/server"), output });
  await writeFile(loader, source);
  const client = new Client({ name: "owned-telemetry-test", version: "1" });
  async function close() { await client.close(); }
  t.after(close);
  const transport = new StdioClientTransport({ command: process.execPath, args: ["--import", pathToFileURL(loader).href, entrypoint], env, stderr: "pipe" });
  function ignore() {}
  transport.stderr?.on("data", ignore);
  await client.connect(transport);
  await client.callTool({ name: "workflow_runtime_info", arguments: {} });
  const text = await readFile(output, "utf8");
  const records = text.trim().split("\n").map(JSON.parse);
  assert.equal(records.length, 1);
  assert.equal(records[0].name, "workflow_runtime_info");
  assert.equal(records[0].actor, 7);
  assert.ok(Number.isFinite(records[0].handler_ms) && records[0].handler_ms >= 0);
  assert.deepEqual(Object.keys(records[0]).sort(), ["actor", "handler_ms", "name"]);
  assert.doesNotMatch(text, /build_id|capabilities|context|arguments|\/home\//u);
}
test("server-side telemetry observes the real MCP handler without recording its input or result", telemetryMeasuresTheRealHandlerWithoutItsPayload);

async function nativeChildSchemasStayCallableWithoutAModel(t) {
  const { root, env } = await ownedRoot(t);
  const directory = join(root, "runtime");
  await mkdir(directory, { mode: 0o700 });
  const source = `
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createRuntime} from ${JSON.stringify(pathToFileURL(worker).href)};
import {createNativeCaseFixture} from ${JSON.stringify(new URL("../scripts/lib/specification-review-native-fixtures.mjs", import.meta.url).href)};
const callbacks=[];
function cleanup(callback){callbacks.push(callback)}
const controller=new AbortController();
const providerModule=${JSON.stringify(process.env.EAW_HARNESS_CODEX_MODULE)};
const options={clientRoot:${JSON.stringify(process.env.EAW_HARNESS_CLIENT_ROOT)},providerModule,
providerSha256:createHash('sha256').update(await readFile(providerModule)).digest('hex'),
provider:'openai-codex',model:'gpt-6.1-sol',reasoningEffort:'xhigh',modelTimeoutMs:10000};
let runtime;
try {
 const {fixture,selected}=await createNativeCaseFixture('native-paraphrase',cleanup);
 runtime=await createRuntime(options,fixture,${JSON.stringify(directory)},selected,controller.signal);
 runtime.state.parent_program='return 2;';
 const deniedProgram=await runtime.ctx.tools.execute({callId:'parent-guard-probe',name:'run_code',arguments:{code:'return 1;',description:'Probe canonical parent guard without a model.'},agent:runtime.parent,signal:controller.signal});
 assert.equal(deniedProgram.isError,true);
 assert.match(JSON.stringify(deniedProgram),/QUALIFICATION_PARENT_PROGRAM_MISMATCH/u);
 const beforeDirect=runtime.state.rpc_calls;
 const direct=await runtime.ctx.tools.execute({callId:'parent-native-probe',name:'mcp__eaw__scope_get',arguments:{},agent:runtime.parent,signal:controller.signal});
 assert.equal(direct.isError,true);
 assert.match(JSON.stringify(direct),/UNKNOWN_TOOL/u);
 assert.equal(runtime.state.rpc_calls,beforeDirect,'A model-direct parent MCP call must not reach its body in PTC mode.');
 runtime.ctx.on('agent/created',async function stopBeforePublication({agent}){
  if(!agent.session.header.parentSession)return;
  const definition=agent.ctx.tools.get('mcp__eaw__specification_review_submit_batch',agent);
  assert.deepEqual(definition.parameters.required,['context','review_ref','source_version','group_ref','items']);
  assert.equal(definition.parameters.properties.items.maxItems,20);
  const visible=agent.ctx.tools.schemas(agent);
  const submission=visible.find(function isSubmission(tool){return tool.name===definition.name});
  assert.ok(submission,'The actual model-facing schema must expose the direct submission tool.');
  assert.deepEqual(submission.parameters,definition.parameters);
  assert.equal(visible.some(function isPtc(tool){return tool.name==='run_code'}),false);
  for(const name of ['scope_get','decision_find','decision_get','requirement_list','requirement_get','specification_review_status']){
    assert.ok(visible.some(function isRequiredRead(tool){return tool.name==='mcp__eaw__'+name}),name);
  }
  const deniedRead=await runtime.ctx.tools.execute({callId:'managed-read-probe',name:'read',arguments:{file_path:fixture.directory+'/manifest.yaml'},agent,signal:controller.signal});
  assert.equal(deniedRead.isError,true);
  assert.match(JSON.stringify(deniedRead),/MCP_MANAGED_FILE_ACCESS_DENIED/u);
  for(const name of ['specification_review_submit_batch','specification_review_consistency_record']){
    const premature=await runtime.ctx.tools.execute({callId:'scope-order-'+name,name:'mcp__eaw__'+name,arguments:{},agent,signal:controller.signal});
    assert.equal(premature.isError,true);
    assert.match(JSON.stringify(premature),/QUALIFICATION_SCOPE_READ_REQUIRED/u);
  }
  assert.equal(runtime.state.scope_order_rejections,2);
  const mode=agent.ctx.tools.executionMode({callId:'schema-probe',name:definition.name,arguments:{},agent,signal:controller.signal});
  assert.equal(mode.kind,'exclusive');
  throw new Error('EXPECTED_UNPUBLISHED_CHILD');
 });
 await assert.rejects(runtime.ctx.subagents.startActivation({provider:'spawn',label:'No-model schema probe',delivery:'caller',signal:controller.signal,
 request:{parent:runtime.parent,cwd:fixture.project,prompt:[{type:'text',text:'Never start a model request.'}],agentOptions:{provider:'openai-codex',model:'gpt-6.1-sol'}}}),/EXPECTED_UNPUBLISHED_CHILD/u);
 assert.equal(runtime.ctx.agents.list().length,1);
 runtime.parent.session.append('tool/call',{turn:1,step:1,callId:'simulated-pending-audit',name:'read',arguments:{file_path:fixture.directory+'/manifest.yaml'}});
 assert.equal(runtime.state.access_audit.summary().pending_filesystem_calls,1,'The actual session observer must retain an unsettled filesystem call.');
 for(const actor of runtime.state.actors.values())assert.equal(actor.metrics.model_responses,0);
 console.log('native-child-schema-and-rollback-pass');
}finally{if(runtime)await runtime.dispose();for(const callback of callbacks.reverse())await callback()}
`;
  const result = await child(["--input-type=module", "-e", source], env);
  assert.equal(result.code, 0, result.stderr + result.stdout);
  assert.match(result.stdout, /native-child-schema-and-rollback-pass/u);
}
const unavailableHost = !process.env.EAW_HARNESS_CLIENT_ROOT || !process.env.EAW_HARNESS_CODEX_MODULE;
test("actual Harness child scopes expose bounded MCP inputs natively and roll back without model requests", {
  skip: unavailableHost ? "Prepared Harness is opt-in; structural tests do not qualify an absent host." : false,
}, nativeChildSchemasStayCallableWithoutAModel);

async function runtimeRejectsAReaderOutsideTheFrozenBuild(t) {
  const { root, env } = await ownedRoot(t);
  const directory = join(root, "runtime");
  await mkdir(directory, { mode: 0o700 });
  const source = `
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createRuntime} from ${JSON.stringify(pathToFileURL(worker).href)};
import {createNativeCaseFixture} from ${JSON.stringify(new URL("../scripts/lib/specification-review-native-fixtures.mjs", import.meta.url).href)};
const callbacks=[];
function cleanup(callback){callbacks.push(callback)}
const providerModule=${JSON.stringify(process.env.EAW_HARNESS_CODEX_MODULE)};
const options={clientRoot:${JSON.stringify(process.env.EAW_HARNESS_CLIENT_ROOT)},providerModule,
providerSha256:createHash('sha256').update(await readFile(providerModule)).digest('hex'),
provider:'openai-codex',model:'gpt-6.1-sol',reasoningEffort:'xhigh',modelTimeoutMs:10000,
expectedMcpBuildId:'0'.repeat(64)};
let runtime;
try{
 const {fixture,selected}=await createNativeCaseFixture('native-paraphrase',cleanup);
 async function startWrongBuild(){runtime=await createRuntime(options,fixture,${JSON.stringify(directory)},selected,new AbortController().signal)}
 await assert.rejects(startWrongBuild,{code:'MCP_BUILD_CHANGED'});
 console.log('reader-build-mismatch-rejected-before-model');
}finally{if(runtime)await runtime.dispose();for(const callback of callbacks.reverse())await callback()}
`;
  const result = await child(["--input-type=module", "-e", source], env);
  assert.equal(result.code, 0, result.stderr + result.stdout);
  assert.match(result.stdout, /reader-build-mismatch-rejected-before-model/u);
}
test("actual MCP readers reject a build outside the frozen invocation before model execution", {
  skip: unavailableHost ? "Prepared Harness is opt-in; structural tests do not qualify an absent host." : false,
}, runtimeRejectsAReaderOutsideTheFrozenBuild);
