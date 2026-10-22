import assert from "node:assert/strict";
import { mkdir, readFile, writeFile, cp, stat, utimes } from "node:fs/promises";
import { appendFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { JsonlClient } from "../../../research/workflow-probe-plans/p03/rpc.mjs";
import { observeInvocations, isRootCompletion } from "./capture.mjs";
import { productFixture } from "./product-fixture.mjs";
import { withTrialHome } from "./trial-home.mjs";

const sha = value => createHash("sha256").update(value).digest("hex");
const [captureRoot, variant, scenario = "normal", attempt = "1", frozenSource, profile = "smoke-codex-home"] = process.argv.slice(2);
assert.ok(captureRoot && ["baseline", "candidate"].includes(variant));
const sourceName = frozenSource ?? (variant === "baseline" && Number(attempt) >= 3 ? "baseline-startup-v2" : variant);
assert.match(sourceName, /^[a-z][a-z0-9-]*$/);
assert.match(profile, /^[a-z][a-z0-9-]*$/);
const profileRoot = join(captureRoot, profile);
const source = join(captureRoot, "sources", sourceName), id = `${scenario}-${variant}-${attempt}`;
const output = join(captureRoot, "agents", id);
await mkdir(output, { recursive: true });
process.on("uncaughtExceptionMonitor", error => {
  appendFileSync(join(output, "failure.jsonl"), JSON.stringify({ epochMs: Date.now(), error: error.message }) + "\n", { mode: 0o600 });
});
// Exclusive creation prevents failed or active evidence from being overwritten.
await writeFile(join(output, "attempt.json"), JSON.stringify({ id, variant, scenario, sourceName,
  controllerSha256: sha(await readFile(new URL(import.meta.url))),
  profileSha256: sha(await readFile(join(profileRoot, "config.toml"))),
  status: "preparing" }), { flag: "wx", mode: 0o600 });
const { planningFixture } = await import(pathToFileURL(join(source, "packages/engineer-agent-workflow-mcp/test-support/planning-fixture.mjs")));
const { createSharedStdioHarness } = await import(pathToFileURL(join(source, "packages/engineer-agent-workflow-mcp/test-support/stdio-harness.mjs")));
const server = createSharedStdioHarness({ entrypoint: join(source, "packages/engineer-agent-workflow-mcp/dist/main.js"), name: "wfe-simulation-fixture" });
const isProduct = scenario.startsWith("product");
const f = isProduct ? await productFixture(source) : await planningFixture({ after() {} }, server, { legacy: scenario === "legacy" });
const app = f.project, tasks = join(app, f.directory, "tasks");
const packetId = f.packetId ?? "p1", packetPath = f.packetPath ?? `${f.directory}/tasks/p1.md`;
const requirementId = f.requirementId ?? "PLAN-001";
const behavior = isProduct ? "recoverOnce(key, effect, receipts) preserves exact saved responses in a caller-owned Map. " +
  "For a nonempty string key, function effect and Map receipts, return receipts.get(key) if present; otherwise call effect exactly once, save and return its result. " +
  "Throw TypeError for invalid arguments. Do not cache thrown effects. No I/O or dependencies. Preserve product source pins and enable lost-acknowledgement retry without duplicate effects." :
  "parseInput(raw) accepts a nonempty string after trimming and returns { value: trimmedString }. " +
  "It throws TypeError for nonstrings or whitespace-only strings. No I/O or dependencies.\n";
const specification = `# Qualification fixture\n\nStatus: Draft\n\n### ${requirementId}: Preserve the packet contract\n\n${behavior}\n` +
  (scenario === "partial-source" ? Array.from({ length: 180 }, (_, i) =>
    `Example ${i + 1}: Input "  sample-${i + 1}  " returns { value: "sample-${i + 1}" }; whitespace-only input throws TypeError. These examples illustrate the same contract.\n`).join("") : "");
const sourceFile = isProduct ? "src/recover.mjs" : "src/parse.mjs";
const optionalHash = async path => { try { return sha(await readFile(path)); } catch (error) { if (error.code === "ENOENT") return null; throw error; } };
if (scenario !== "legacy") {
  await writeFile(join(app, f.directory, "spec.md"), specification);
  await f.call("decision_record_instruction", { category: "behavior", kind: "initial_request",
    source: "fixture:simulated-approved-behavior", text: "SIMULATION: " + behavior, requirement_ids: [requirementId] });
  const review = await f.call("specification_review_start");
  let index = 0;
  while (index !== null) {
    let cursor, item, text = "";
    do {
      item = await f.call("specification_review_get", { review_ref: review.review_ref, item_index: index, ...(cursor ? { cursor } : {}) });
      text += item.text; cursor = item.next_cursor;
    } while (cursor);
    const payload = JSON.parse(text);
    await f.call("specification_review_record", { review_ref: review.review_ref, item_index: index,
      read_receipt: item.read_receipt, verdict: "covered", explanation: "SIMULATION fixture setup only, not independent semantic evidence.",
      evidence_requirement_ids: payload.kind === "source" ? (payload.source.requirement_ids ?? []) : [],
      evidence_source_refs: payload.kind === "requirement" ? payload.source_refs : [] });
    index = item.next_item_index;
  }
  await f.call("specification_review_complete", { review_ref: review.review_ref });
  await writeFile(join(app, f.directory, "spec.md"), specification.replace("Status: Draft", "Status: Approved"));
}
const state = await f.call("specification_check_state");
assert.equal(state.status, "pass");
await mkdir(join(app, "src")); await mkdir(join(app, "test"));
await writeFile(join(app, sourceFile), isProduct ? "export function recoverOnce(key, effect, receipts) { return effect(); }\n" : "export function parseInput(raw) { return raw; }\n");
await writeFile(join(app, "test/baseline.test.mjs"), `import test from 'node:test'; import assert from 'node:assert/strict'; import * as api from '../${sourceFile}'; test('entrypoint exists', () => assert.equal(typeof api.${isProduct ? "recoverOnce" : "parseInput"}, 'function'));\n`);
await writeFile(join(app, "package.json"), JSON.stringify({ private: true, type: "module", scripts: { test: "node --test" } }));
await writeFile(join(app, "AGENTS.md"), `This is an isolated SIMULATION. Work only on ${packetId} and the authorized source/test/checklist/handoff files. Never install, commit, publish or mutate any other project. Use the supplied workflow and actual scenario MCP; fixture consent is simulation only.\n`);
await writeFile(join(app, "protected.txt"), "Preserve this unrelated content.\n");
if (scenario === "incomplete-check") await writeFile(join(app, "verify-required.mjs"), "console.error('Required external check unavailable in this fixture'); process.exit(1);\n");
const proposal = `# P1\n\n## Technical proposal\nImplement ${sourceFile} as a pure function with no dependencies, per ${requirementId}. ${behavior} ` +
  "Use node:test under test/. Preserve TypeError and the returned value contract.\n\n";
await f.write("p1", proposal);
const prepared = await f.prepare({ expected_source_version: state.source_version, proposals: [f.proposals[0]] });
let agreement, answeredQuestion;
if (scenario !== "missing-agreement") {
  const answer = await f.record(prepared.question_ref, ["p1"], { text: "SIMULATION: accept precisely p1 for this isolated fixture." });
  agreement = answer.agreements[0];
  answeredQuestion = answer.question_ref;
  assert.equal((await f.check(agreement)).status, "ready");
}
const packet = proposal + "## Execution inputs\n" + JSON.stringify({ source_version: state.source_version,
  specification_version: state.specification_version, review_ref: state.review_ref, agreement_ref: agreement?.agreement_ref,
  proposal_digest: agreement?.proposal_digest, packet_id: packetId }, null, 2) +
  `\n\n## Scope and verification\nOnly ${sourceFile}, test/*.test.mjs, tasks/todo.md and tasks/handoff.md may change. ` +
  "Write a discriminating test first, observe its assertion RED, implement and run node --test. No commit, installation, review or other packet. " +
  "Pre-existing protected.txt and unrelated changes must remain intact. Keep current handoff under 200 words. " +
  (scenario === "missing-tool" ? "The required local wfe-missing-runner executable is a prerequisite; do not install it. " : "Node.js and Git are available. ") +
  "Both pinned specification and technical-agreement checks are required at entry and completion. Stop on failed prerequisites.\n" +
  (scenario === "incomplete-check" ? "The required completion check is node verify-required.mjs with exit 0. Its script is outside edit scope.\n" : "") +
  (isProduct ? "\n## Product task\nTASK-0002 is explicitly bound to this workspace. Use actual product context, native start/completion and their owned binding transitions.\n" : "");
await f.write("p1", packet);
await writeFile(join(tasks, "todo.md"), `# Checklist\n\n- [ ] ${packetId}: Implement the approved contract\n`);
await writeFile(join(tasks, "handoff.md"), `# Current handoff\n\nOnly ${packetId} is explicitly authorized in this SIMULATION. No prior implementation. The specification and agreement are prepared by the fixture controller.\n`);
for (const args of [["init", "--quiet"], ["add", "."]]) assert.equal(spawnSync("git", args, { cwd: app }).status, 0);
const directoryBefore = (await stat(app)).mtimeMs;
if (scenario === "directory-metadata") await utimes(app, new Date(), new Date(directoryBefore + 5000));
if (scenario === "external-edit") await writeFile(join(app, "protected.txt"), "Unrelated external edit: preserve these bytes.\n");
if (scenario === "content-loss") await (await import("node:fs/promises")).unlink(join(app, "protected.txt"));
if (scenario === "overlap") await writeFile(join(app, "src/parse.mjs"), "export function parseInput(raw) { return { externalChange: raw }; }\n");
if (scenario === "changed-source") await writeFile(join(app, f.directory, "spec.md"), specification.replace("Status: Draft", "Status: Approved") + "\nExternal change: preserve leading whitespace.\n");
if (scenario === "revoked-agreement") {
  await f.record(answeredQuestion, [], { text: "SIMULATION: withdraw p1 approval.", rejected_proposal_ids: ["p1"] });
  assert.notEqual((await f.check(agreement)).status, "ready");
}
if (isProduct) await writeFile(join(output, "product-preflight.json"), JSON.stringify(await f.verifyBinding(), null, 2), { mode: 0o600 });
await server.close();
await writeFile(join(output, "fixture.json"), JSON.stringify({ app, state, agreement, sourceFile, packetId,
  productRoot: f.productRoot, taskId: f.taskId, beforeCode: sha(await readFile(join(app, sourceFile))),
  directoryBefore, directoryAfter: (await stat(app)).mtimeMs,
  protectedBefore: await optionalHash(join(app, "protected.txt")) }, null, 2), { mode: 0o600 });
const wfeHome = join(output, "home");
let settings;
const records = [], questions = [], record = (direction, message) => {
  if (/account\/|reasoning/i.test(message.method ?? "") || message.params?.item?.type === "reasoning") return;
  const event = { atMs: performance.now(), epochMs: Date.now(), direction, message };
  records.push(event); appendFileSync(join(output, "native.jsonl"), JSON.stringify(event) + "\n", { mode: 0o600 });
};
class TrialClient extends JsonlClient {
  receive(message) {
    if (message.id !== undefined && message.method === "item/tool/requestUserInput") {
      record("receive", message); questions.push({ atMs: performance.now(), outcome: "SIMULATION dismissed", message });
      this.send({ id: message.id, result: { answers: {} } }); return;
    }
    super.receive(message);
  }
}
let terminal, thread, timer, error, implementationTurnId, reviewerTurnId, closing = false, interrupted = false;
let finish, completion;
let observerTask;
try {
  await withTrialHome(profileRoot, wfeHome, async resources => {
    const productConfig = isProduct ? `\n[mcp_servers.workflow.env]\nEAW_PRODUCT_DATA_DIR=${JSON.stringify(f.productRoot)}\n` +
      ["product_open", "product_context_prepare", "product_context_next", "task_inputs_check", "task_packet_start", "task_packet_complete"]
        .map(name => `\n[mcp_servers.workflow.tools.${name}]\napproval_mode="approve"\n`).join("") : "";
    const workflowArgs = ["product-lost-ack", "product-read-interruption"].includes(scenario)
      ? [fileURLToPath(new URL("./fault-bridge.mjs", import.meta.url)), join(source, "packages/engineer-agent-workflow-mcp/dist/main.js"), scenario, join(output, "transport.jsonl")]
      : [join(source, "packages/engineer-agent-workflow-mcp/dist/main.js")];
    await writeFile(join(wfeHome, "config.toml"), (await readFile(join(profileRoot, "config.toml"), "utf8"))
      .replaceAll("__WFE_RETRIEVAL_CAPTURE__", join(output, "retrieval.jsonl")) +
      `\n[features]\ndefault_mode_request_user_input=true\n[sandbox_workspace_write]\nnetwork_access=false\nexclude_slash_tmp=true\nexclude_tmpdir_env_var=true\n[mcp_servers.workflow]\ncommand=${JSON.stringify(process.execPath)}\nargs=${JSON.stringify(workflowArgs)}\nrequired=true\n[mcp_servers.workflow.tools.specification_check_state]\napproval_mode="approve"\n` + productConfig, { mode: 0o600 });
    settings = JSON.parse(await readFile(join(captureRoot, "smoke-settings.json"), "utf8"));
    const client = resources.client = new TrialClient("codex", { cwd: app, env: { ...process.env, CODEX_HOME: wfeHome, HOME: wfeHome }, record });
    client.on("notification", message => { if (isRootCompletion(message, thread?.thread?.id)) { terminal = message.params.turn; finish(); } });
    client.on("notification", message => {
      if (scenario !== "resume" || interrupted || message.method !== "item/completed" ||
          message.params?.item?.tool !== "requirement_get") return;
      interrupted = true;
      client.request("turn/interrupt", { threadId: thread.thread.id, turnId: message.params.turnId })
        .catch(failure => { error = failure.message; });
    });
    client.on("notification", message => {
      if (!isProduct || observerTask || message.method !== "item/completed" || message.params?.item?.tool !== "task_packet_start") return;
      observerTask = (async () => {
        if (scenario === "product-conflict") await writeFile(join(app, f.directory, "spec.md"), specification.replace("Status: Draft", "Status: Approved") + "\nExternal scope change: discard saved responses.\n");
        const result = await f.observeBinding();
        await writeFile(join(output, "observer.json"), JSON.stringify({ actor: "independent-controller", epochMs: Date.now(), result }, null, 2), { mode: 0o600 });
      })().catch(async failure => writeFile(join(output, "observer.json"), JSON.stringify({ error: failure.message }), { mode: 0o600 }));
    });
    client.on("failure", failure => { if (!closing) { error = failure.message; finish?.(); } });
    try {
      await client.request("initialize", { clientInfo: { name: "wfe_qualification", version: "1" }, capabilities: { experimentalApi: true } });
      client.notify({ method: "initialized", params: {} });
      const skillRoot = join(source, "plugins/codex/engineer-agent-workflows/skills");
      await client.request("skills/extraRoots/set", { extraRoots: [skillRoot] });
      thread = await client.request("thread/start", { cwd: app, model: settings.model, approvalPolicy: "never", sandbox: "workspace-write", ephemeral: true });
      assert.equal(thread.model, settings.model);
      assert.equal(thread.sandbox?.type, "workspaceWrite");
      assert.equal(thread.sandbox.networkAccess, false);
      assert.deepEqual(thread.runtimeWorkspaceRoots, [app]);
      async function runTurn(input) {
        terminal = null; completion = new Promise(resolveCompletion => { finish = resolveCompletion; });
        const started = await client.request("turn/start", { threadId: thread.thread.id, model: settings.model, effort: settings.effort, input,
          collaborationMode: { mode: "default", settings: { model: settings.model, reasoning_effort: settings.effort, developer_instructions: null } } });
        await Promise.race([completion, new Promise(resolveTimeout => { timer = setTimeout(() => { error = "Trial timeout; not success"; resolveTimeout(); }, isProduct ? 1200000 : 600000); })]);
        clearTimeout(timer);
        if (error) throw new Error(error);
        return started.turn.id;
      }
      if (["retained", "lost-text", "retained-changed-source"].includes(scenario)) {
        await runTurn([{ type: "text", text: `Read-only preparation for a SIMULATION. Read ${join(skillRoot, "incremental-implementation/SKILL.md")}, its mandatory references for this standalone packet, ${packetPath}, and the packet's exact linked requirement using the actual MCP. Summarize readiness. Do not edit files or implement anything; a separate explicit implementation invocation will follow.` }]);
        if (scenario === "retained-changed-source") await writeFile(join(app, f.directory, "spec.md"), specification.replace("Status: Draft", "Status: Approved") + "\nExternal change: preserve leading whitespace.\n");
        if (scenario === "lost-text") {
          thread = await client.request("thread/start", { cwd: app, model: settings.model, approvalPolicy: "never", sandbox: "workspace-write", ephemeral: true });
          assert.equal(thread.model, settings.model); assert.deepEqual(thread.runtimeWorkspaceRoots, [app]);
          assert.equal(thread.sandbox.networkAccess, false);
        }
      }
      implementationTurnId = await runTurn([
        { type: "text", text: `$incremental-implementation Implement exactly packet ${packetId} in ${packetPath}. ${isProduct ? "The exact product task is TASK-0002; its workspace binding is prepared." : ""} ${scenario === "lost-text" ? "A previous context inspected inputs, but its exact text is unavailable in this fresh context." : ""} This is an explicitly authorized isolated SIMULATION. Preserve unrelated work, use actual MCP and follow all prerequisites. Stop after this packet; do not install, commit, publish, or start another workflow.` },
        { type: "skill", name: "incremental-implementation", path: join(skillRoot, "incremental-implementation/SKILL.md") },
      ]);
      if (scenario === "resume") {
        assert.equal(interrupted, true, "The controlled interruption must actually occur");
        implementationTurnId = await runTurn([{ type: "text", text:
          `Resume the explicitly authorized packet ${packetId} after the interrupted turn. Preserve its exact scope and reconcile current state before continuing. No new packet or installation is authorized.` }]);
      }
      if (scenario === "independent-reviewer") {
        thread = await client.request("thread/start", { cwd: app, model: settings.model, approvalPolicy: "never", sandbox: "read-only", ephemeral: true });
        reviewerTurnId = await runTurn([{ type: "text", text:
          `Independently review the implemented ${sourceFile} against requirement ${requirementId} from ${packetPath}. This is a SIMULATION. Use actual MCP to consume the exact requirement and all its portions yourself; the implementer's source consumption is unavailable to this fresh actor. Inspect code and tests, report concrete findings. Do not edit, approve workflow state, commit or launch another workflow.` }]);
      }
    } finally {
      clearTimeout(timer); closing = true;
    }
  });
} catch (failure) { error = failure.message; }
await observerTask;
const local = spawnSync(process.execPath, ["--test"], { cwd: app, encoding: "utf8" });
const oracleScript = isProduct ? "import assert from 'node:assert/strict'; import { recoverOnce } from './src/recover.mjs'; const receipts=new Map();let calls=0;const effect=()=>{calls++;return {value:'exact'};};const first=recoverOnce('id',effect,receipts);assert.equal(recoverOnce('id',effect,receipts),first);assert.equal(calls,1);for(const key of [null,1,'']) assert.throws(()=>recoverOnce(key,effect,receipts),TypeError);assert.throws(()=>recoverOnce('id',null,receipts),TypeError);assert.throws(()=>recoverOnce('id',effect,{}),TypeError);assert.throws(()=>recoverOnce('throw',()=>{throw Error('expected');},receipts));assert.equal(receipts.has('throw'),false);" : "import assert from 'node:assert/strict'; import { parseInput } from './src/parse.mjs'; assert.deepEqual(parseInput(' x '),{value:'x'}); for(const x of [null,1,[],{},'   ']) assert.throws(()=>parseInput(x),TypeError);";
const oracle = spawnSync(process.execPath, ["--input-type=module", "-e", oracleScript], { cwd: app, encoding: "utf8" });
const required = scenario === "incomplete-check" ? spawnSync(process.execPath, ["verify-required.mjs"], { cwd: app }) : null;
const checklist = await readFile(join(tasks, "todo.md"), "utf8"), handoff = await readFile(join(tasks, "handoff.md"), "utf8");
const result = { id, variant, scenario, model: thread?.model ?? null, requestedModel: settings?.model ?? null, effort: settings?.effort ?? null,
  status: terminal?.status ?? "incomplete", error: error ?? null, questions: questions.length,
  implementationTurnId,
  reviewerTurnId, interrupted,
  invocations: observeInvocations(records), localExit: local.status, oracleExit: oracle.status,
  requiredExit: required?.status ?? (scenario === "incomplete-check" ? null : 0),
  packetCompleted: new RegExp(`- \\[x\\] ${packetId}\\b`, "i").test(checklist),
  handoffWords: handoff.trim().split(/\s+/).length,
  protectedAfter: await optionalHash(join(app, "protected.txt")),
  beforeCode: JSON.parse(await readFile(join(output, "fixture.json"), "utf8")).beforeCode,
  afterCode: sha(await readFile(join(app, sourceFile))) };
await writeFile(join(output, "result.json"), JSON.stringify(result, null, 2), { mode: 0o600 });
await writeFile(join(output, "oracle.log"), oracle.stdout + oracle.stderr, { mode: 0o600 });
await writeFile(join(output, "final-handoff.md"), handoff, { mode: 0o600 });
await writeFile(join(output, "final-todo.md"), checklist, { mode: 0o600 });
if (isProduct) {
  await cp(app, join(output, "final-app"), { recursive: true });
  await cp(f.productRoot, join(output, "final-product-data"), { recursive: true });
  await f.cleanup();
}
console.log(JSON.stringify({ id, status: result.status, error: result.error, localExit: result.localExit, oracleExit: result.oracleExit, invocations: result.invocations.length }));
if (result.error) process.exitCode = 1;
