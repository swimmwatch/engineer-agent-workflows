import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile, readFile, lstat, realpath, open, unlink } from "node:fs/promises";
import { readFileSync, writeFileSync, openSync, writeSync, fsyncSync, closeSync } from "node:fs";
import { isAbsolute, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { platform, arch } from "node:os";
import { isDeepStrictEqual } from "node:util";
import Ajv from "ajv";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { JsonlClient } from "./rpc.mjs";
import { createSharedStdioHarness } from "../../../../packages/engineer-agent-workflow-mcp/test-support/stdio-harness.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const SOURCE_IDS = ["PRD-0007", "PRD-0013", "TD-0008", "TD-0016", "TD-0023"];
const CASES = ["healthy", "missing-mcp", "unavailable-model", "interrupted"];
const ROWS = ["skill", "file", "shell", "mcp", "structured", "subagent"];
const sha = value => createHash("sha256").update(value).digest("hex");
const row = (verdict, reason) => ({ verdict, reason });
const hashPattern = /^[a-f0-9]{64}$/;

export function validatePolicy(policy) {
  if (policy.authorized !== true || typeof policy.owner !== "string" || !policy.owner.trim()) throw new Error("Explicit execution authority and owner are required");
  if (!isAbsolute(policy.binary ?? "") || !hashPattern.test(policy.binarySha256 ?? "") || !policy.binaryVersion) throw new Error("Pin the absolute Codex binary, version and SHA-256");
  if (!policy.sourceReadbackConfirmed || !hashPattern.test(policy.sourceVersion ?? "") || SOURCE_IDS.some(id => !hashPattern.test(policy.sourcePins?.[id] ?? ""))) throw new Error("Read and pin the exact PRD/TD elements before execution");
  if (!Array.isArray(policy.allowedModels) || !policy.allowedModels.length || new Set(policy.allowedModels).size !== policy.allowedModels.length || policy.allowedModels.some(m => typeof m !== "string" || !m.trim())) throw new Error("Use an explicit model allowlist");
  if (!policy.allowedModels.includes(policy.primary) || (policy.fallback !== null && !policy.allowedModels.includes(policy.fallback))) throw new Error("Primary and fallback must belong to the approved allowlist");
  if (typeof policy.invalidModel !== "string" || !policy.invalidModel.startsWith("p03-invalid-") || policy.allowedModels.includes(policy.invalidModel)) throw new Error("Use a separate explicitly invalid fixture model");
  if (!Number.isInteger(policy.deadlineMs) || policy.deadlineMs < 1 || policy.deadlineMs > 300_000) throw new Error("Deadline must be between 1 and 300000 ms");
  if (!Array.isArray(policy.requiredCapabilities) || ROWS.some(k => !policy.requiredCapabilities.includes(k))) throw new Error("Keep every fixture capability required");
  if (typeof policy.effort !== "string" || !policy.effort.trim()) throw new Error("Freeze the reasoning setting");
  return policy;
}

export async function prepareProbe(root) {
  if (!isAbsolute(root)) throw new Error("Use a new absolute scratch directory");
  await mkdir(root, { mode: 0o700 });
  await writeFile(join(root, ".p03-root"), `${randomBytes(16).toString("hex")}\n`, { mode: 0o600 });
  await mkdir(join(root, "codex-home"), { mode: 0o700 });
  const policy = {
    authorized: false, owner: "", primary: "", fallback: null, allowedModels: [],
    invalidModel: "p03-invalid-model", effort: "medium", deadlineMs: 300_000,
    binary: "", binaryVersion: "", binarySha256: "", sourceVersion: "",
    sourceReadbackConfirmed: false, sourcePins: Object.fromEntries(SOURCE_IDS.map(id => [id, ""])),
    requiredCapabilities: ROWS,
  };
  await writeFile(join(root, "policy.json"), `${JSON.stringify(policy, null, 2)}\n`, { mode: 0o600 });
  await writeFile(join(root, "requests.json"), '{"sent":0}\n', { mode: 0o600 });
  return root;
}

export function reserveTurnRequest(root) {
  const budgetPath = join(root, "requests.json");
  const budget = JSON.parse(readFileSync(budgetPath, "utf8"));
  if (!Number.isInteger(budget.sent) || budget.sent < 0 || budget.sent >= 4) throw new Error("P03 root exhausted or invalidated its four-request inference budget");
  writeFileSync(budgetPath, `${JSON.stringify({ sent: budget.sent + 1 })}\n`, { mode: 0o600 });
  const fd = openSync(budgetPath, "r"); try { fsyncSync(fd); } finally { closeSync(fd); }
}

export async function createFixture(root, caseName, health) {
  if (!CASES.includes(caseName)) throw new Error("Unknown P03 case");
  const cwd = join(root, "workspaces", caseName);
  const skillPath = join(cwd, ".agents", "skills", "p03-fixture", "SKILL.md");
  const referencePath = join(dirname(skillPath), "references", "contract.md");
  const metadataPath = join(dirname(skillPath), "agents", "openai.yaml");
  await mkdir(join(root, "workspaces"), { recursive: true, mode: 0o700 });
  await mkdir(cwd, { mode: 0o700 });
  await mkdir(dirname(referencePath), { recursive: true, mode: 0o700 });
  await mkdir(dirname(metadataPath), { mode: 0o700 });
  const canary = randomBytes(16).toString("hex");
  const check = `import { readFileSync } from "node:fs";\nimport assert from "node:assert/strict";\nassert.equal(readFileSync("result.txt", "utf8"), "ALPHA\\n");\nconsole.log("P03_CHECK:${canary}");\n`;
  const wait = `import { writeFileSync, unlinkSync } from "node:fs";\nwriteFileSync("wait.pid", String(process.pid));\nconst stop = () => { try { unlinkSync("wait.pid"); } catch {} process.exit(0); };\nprocess.on("SIGTERM", stop);\nprocess.on("SIGINT", stop);\nsetTimeout(stop, 120000);\n`;
  const skill = "---\nname: p03-fixture\ndescription: Explicit harmless P03 capability fixture.\n---\n\nRead references/contract.md and perform only its bounded task.\n";
  const reference = `# P03 fixture contract\n\nUse only this scratch workspace. Do not ask for broader permissions, access secrets, install anything, or use network/shell commands beyond this task.\n\n${caseName === "interrupted" ? "First run `rtk proxy node wait.mjs` and wait for it to finish. Do not write result.txt, spawn a subagent or produce a success response before the wait.\n\n" : ""}Read input.txt with \`rtk proxy cat input.txt\`. Write result.txt as the uppercase form of the input, preserving the final newline. Call the MCP p03 server's workflow_runtime_info tool with empty arguments. Run \`rtk proxy node check.mjs\`.\n\nExplicitly spawn exactly one native read-only subagent, using the same explicitly requested model as this parent turn. Give it this independent task: read input.txt in this workspace, count ASCII letters (exclude the newline), and return only P03_SUBAGENT:${canary}:<count>. It must not edit files, call MCP, spawn agents or request broader permissions. Wait for that exact child's completion; do not send follow-up input or start any other agent. Close the child after receiving its result. A shell/CLI substitute is not allowed.\n\nReturn only the requested JSON with skillCanary \"${canary}\", artifactSha256 equal to the SHA-256 of result.txt, mcpProtocolVersion from the MCP receipt, checkExitCode from the shell check, subagentThreadId from the native spawn result and subagentResult from the completed child.\n`;
  const files = { "input.txt": "alpha\n", "check.mjs": check, "wait.mjs": wait, [skillPath]: skill, [referencePath]: reference, [metadataPath]: "policy:\n  allow_implicit_invocation: false\n" };
  const protectedFiles = {};
  for (const [name, content] of Object.entries(files)) {
    const target = isAbsolute(name) ? name : join(cwd, name);
    await writeFile(target, content, { mode: 0o600 });
    protectedFiles[target] = sha(content);
  }
  const outputSchema = {
    type: "object", additionalProperties: false,
    properties: { skillCanary: { type: "string" }, artifactSha256: { type: "string", pattern: "^[a-f0-9]{64}$" }, mcpProtocolVersion: { type: "integer" }, checkExitCode: { type: "integer" }, subagentThreadId: { type: "string" }, subagentResult: { type: "string" } },
    required: ["skillCanary", "artifactSha256", "mcpProtocolVersion", "checkExitCode", "subagentThreadId", "subagentResult"],
  };
  return { cwd, skillPath, referencePath, canary, expectedHash: sha("ALPHA\n"), protectedFiles, outputSchema, health };
}

function mcpPayload(item) {
  const result = item.result;
  if (result?.structuredContent) return result.structuredContent;
  const text = result?.content?.find(x => x.type === "text")?.text;
  try { return JSON.parse(text); } catch { return undefined; }
}

export async function evaluateAttempt(attempt, fixture, policy) {
  const result = { success: false, capabilities: {}, model: { effectiveVersion: "unknown" }, terminal: attempt.terminal?.status ?? "unknown" };
  const terminal = attempt.terminal?.id === attempt.turnId && attempt.terminal?.status === "completed" && !attempt.terminal.error;
  const items = attempt.items ?? [];
  let pristine = true;
  for (const [file, hash] of Object.entries(fixture.protectedFiles)) {
    try { pristine &&= (await lstat(file)).isFile() && sha(await readFile(file)) === hash; } catch { pristine = false; }
  }
  let artifact = false;
  try { artifact = (await lstat(join(fixture.cwd, "result.txt"))).isFile() && sha(await readFile(join(fixture.cwd, "result.txt"))) === fixture.expectedHash; } catch {}
  const finals = items.filter(x => x.type === "agentMessage" && x.phase === "final_answer");
  let final;
  try { if (finals.length === 1) final = JSON.parse(finals[0].text); } catch {}
  const valid = new Ajv({ allErrors: true }).validate(fixture.outputSchema, final);
  const read = items.some(x => x.type === "commandExecution" && x.status === "completed" && x.exitCode === 0 && /\bcat input\.txt\b/.test(x.command ?? "") && (x.aggregatedOutput ?? "").includes("alpha"));
  const shell = items.some(x => x.type === "commandExecution" && x.status === "completed" && x.exitCode === 0 && /\bcheck\.mjs\b/.test(x.command ?? "") && (x.aggregatedOutput ?? "").includes(`P03_CHECK:${fixture.canary}`));
  const mcp = items.some(x => x.type === "mcpToolCall" && x.server === "p03" && x.tool === "workflow_runtime_info" && x.status === "completed" && !x.error && !x.result?.isError && isDeepStrictEqual(mcpPayload(x), fixture.health));
  const collaboration = items.filter(x => ["collabAgentToolCall", "collabToolCall"].includes(x.type));
  const spawned = collaboration.filter(x => x.tool === "spawnAgent");
  const spawn = spawned.length === 1 ? spawned[0] : undefined;
  const childIds = spawn?.receiverThreadIds ?? (spawn?.newThreadId ? [spawn.newThreadId] : []);
  const childId = childIds.length === 1 ? childIds[0] : undefined;
  const expectedChildResult = `P03_SUBAGENT:${fixture.canary}:5`;
  const sameChild = item => {
    const receivers = item.receiverThreadIds ?? (item.receiverThreadId ? [item.receiverThreadId] : []);
    return item.senderThreadId === attempt.threadId && receivers.length === 1 && receivers[0] === childId;
  };
  const completedChild = collaboration.some(x => x.tool === "wait" && x.status === "completed" && sameChild(x)
    && x.agentsStates?.[childId]?.status === "completed" && x.agentsStates[childId].message === expectedChildResult);
  const closedChild = collaboration.some(x => x.tool === "closeAgent" && x.status === "completed" && sameChild(x));
  const subagent = valid && childId && childId !== attempt.threadId && spawn.status === "completed" && spawn.senderThreadId === attempt.threadId
    && spawn.model === attempt.requestedModel && policy.allowedModels.includes(spawn.model) && completedChild && closedChild
    && collaboration.every(x => ["spawnAgent", "wait", "closeAgent"].includes(x.tool) && sameChild(x))
    && final.subagentThreadId === childId && final.subagentResult === expectedChildResult;
  result.subagent = { threadId: childId ?? "unknown", requestedModel: spawn?.model ?? "unknown", effectiveVersion: "unknown" };
  const predicates = { skill: pristine && valid && final.skillCanary === fixture.canary, file: pristine && artifact && read, shell: pristine && shell, mcp,
    structured: pristine && artifact && valid && final.artifactSha256 === fixture.expectedHash && final.mcpProtocolVersion === 2 && final.checkExitCode === 0, subagent: Boolean(subagent) };
  for (const [key, passed] of Object.entries(predicates)) result.capabilities[key] = row(terminal && passed ? "pass" : terminal ? "fail" : "inconclusive", terminal && passed ? "Observed and checked fixture execution" : "Missing matching terminal, action, receipt or independent check");
  const modelAllowed = policy.allowedModels.includes(attempt.requestedModel) && policy.allowedModels.includes(attempt.reportedModel) && (attempt.reroutes ?? []).every(x => policy.allowedModels.includes(x.toModel));
  const expectedDiagnostic = attempt.requestedModel === policy.invalidModel && !terminal && attempt.reportedModel === policy.invalidModel;
  result.model = { requested: attempt.requestedModel, catalog: attempt.catalogModel ?? "unknown", reported: attempt.reportedModel ?? "unknown", effectiveVersion: "unknown",
    verdict: !modelAllowed && attempt.reportedModel && !expectedDiagnostic ? "fail" : terminal && modelAllowed ? "pass" : "inconclusive" };
  result.success = terminal && pristine && Object.values(predicates).every(Boolean) && modelAllowed && !attempt.serverRequests?.length;
  return result;
}

async function paged(client, method, params, bounded) {
  const data = [], cursors = new Set();
  let cursor;
  do {
    const response = await bounded(client.request(method, { ...params, ...(cursor ? { cursor } : {}) }));
    if (!Array.isArray(response.data)) throw new Error(`Invalid discovery response: ${method}`);
    data.push(...response.data);
    cursor = response.nextCursor;
    if (cursor && cursors.has(cursor)) throw new Error("Repeated discovery cursor");
    cursors.add(cursor);
    if (cursors.size > 100) throw new Error("Discovery page budget exceeded");
  } while (cursor);
  return data;
}

async function executeAttempt({ model, caseName, policy, fixture, createClient, bounded, record }) {
  const attempt = { requestedModel: model, acceptedTurns: 0, items: [], reroutes: [], serverRequests: [] };
  let client, active = false, interruptSent = false, complete, interruptTask;
  const events = [];
  const completion = new Promise(resolve => { complete = resolve; });
  const consume = () => {
    if (!attempt.turnId) return;
    for (const event of events.splice(0)) {
      const p = event.params;
      if (p?.threadId !== attempt.threadId) continue;
      if (event.method === "turn/completed" && p.turn?.id === attempt.turnId) { attempt.terminal = p.turn; active = false; complete(p.turn); }
      if (p.turnId !== attempt.turnId) continue;
      if (event.method === "item/completed") attempt.items.push(p.item);
      if (event.method === "model/rerouted") attempt.reroutes.push(p);
      if (caseName === "interrupted" && event.method === "item/started" && p.item?.type === "commandExecution" && /\bwait\.mjs\b/.test(p.item.command ?? "") && !interruptSent) {
        interruptSent = true;
        interruptTask = (async () => {
          // Command-start can precede the actual wait process; capture its PID first.
          const end = Date.now() + 1000;
          while (Date.now() < end && active) {
            try {
              const pid = Number(await readFile(join(fixture.cwd, "wait.pid"), "utf8"));
              if (Number.isInteger(pid) && pid > 1 && pid !== process.pid) { attempt.waitPid = pid; break; }
            } catch {}
            await new Promise(resolve => setTimeout(resolve, 10));
          }
          if (active) await client.request("turn/interrupt", { threadId: attempt.threadId, turnId: attempt.turnId }, 1000);
        })().catch(error => { attempt.interruptError = error.message; });
      }
    }
  };
  try {
    client = createClient({ missingMcp: caseName === "missing-mcp", record });
    client.on("notification", event => { events.push(event); consume(); });
    client.on("serverRequest", method => { attempt.serverRequests.push(method); });
    client.on("failure", error => { attempt.transportError = error.message; complete(); });
    attempt.initialize = await bounded(client.request("initialize", { clientInfo: { name: "p03_probe", version: "0.1.0" } }));
    client.notify({ method: "initialized", params: {} });
    const models = await paged(client, "model/list", { limit: 100 }, bounded);
    attempt.catalogModel = models.find(x => x.id === model || x.model === model)?.model;
    if (model !== policy.invalidModel && !attempt.catalogModel) throw new Error("Requested approved model is absent from the catalog");
    const started = await bounded(client.request("thread/start", { cwd: fixture.cwd, model, approvalPolicy: "never", sandbox: "workspace-write", ephemeral: true }));
    attempt.threadId = started.thread?.id;
    attempt.reportedModel = started.model;
    if (!attempt.threadId || started.cwd !== fixture.cwd || started.approvalPolicy !== "never" || started.sandbox?.type !== "workspaceWrite" || started.sandbox.networkAccess !== false
      || started.sandbox.excludeSlashTmp !== true || started.sandbox.excludeTmpdirEnvVar !== true
      || !Array.isArray(started.sandbox.writableRoots) || started.sandbox.writableRoots.length !== 1 || started.sandbox.writableRoots[0] !== fixture.cwd) throw new Error("Effective workspace or permission policy differs from the fixture");
    if (model !== policy.invalidModel && !policy.allowedModels.includes(started.model)) throw new Error("Reported model is outside the approved allowlist");
    const skills = await bounded(client.request("skills/list", { cwds: [fixture.cwd], forceReload: true }));
    if (!skills.data?.some(x => x.cwd === fixture.cwd && !x.errors?.length && x.skills?.some(s => s.name === "p03-fixture" && s.path === fixture.skillPath && s.enabled))) throw new Error("Required explicit fixture skill is unavailable");
    const servers = await paged(client, "mcpServerStatus/list", { limit: 100 }, bounded);
    if (!servers.some(x => x.name === "p03" && (x.tools?.workflow_runtime_info || x.tools?.some?.(t => t.name === "workflow_runtime_info")))) throw new Error("Required MCP tool is unavailable");
    const startedTurn = await bounded(client.request("turn/start", {
      threadId: attempt.threadId, cwd: fixture.cwd, model, effort: policy.effort, approvalPolicy: "never",
      sandboxPolicy: { type: "workspaceWrite", writableRoots: [fixture.cwd], networkAccess: false, excludeSlashTmp: true, excludeTmpdirEnvVar: true },
      input: [{ type: "text", text: `$p03-fixture Execute the bounded fixture contract, including its one explicitly requested native subagent. Request model ${model} for that child; do not expand the scope.` }, { type: "skill", name: "p03-fixture", path: fixture.skillPath }],
      outputSchema: fixture.outputSchema,
    }));
    attempt.turnId = startedTurn.turn?.id;
    if (!attempt.turnId) throw new Error("turn/start supplied no actual turn identity");
    attempt.acceptedTurns = 1;
    active = true;
    consume();
    if (!attempt.terminal) await bounded(completion);
    if (!attempt.terminal) throw new Error(attempt.transportError ?? "No matching terminal event");
  } catch (error) {
    attempt.error = error.message;
    if (error.rpcError) attempt.rejection = error.rpcError;
  } finally {
    if (client && active && !interruptSent) {
      try { await client.request("turn/interrupt", { threadId: attempt.threadId, turnId: attempt.turnId }, 1000); } catch {}
    }
    if (interruptTask) await interruptTask;
    if (client) attempt.cleanup = await client.close();
    if (attempt.waitPid) {
      try { process.kill(attempt.waitPid, 0); attempt.waitStopped = false; }
      catch (error) { attempt.waitStopped = error.code === "ESRCH"; }
    }
  }
  return attempt;
}

export async function runCase({ caseName, policy, fixture, createClient, healthyControl = false, record = () => {}, signal }) {
  validatePolicy(policy);
  if (!CASES.includes(caseName)) throw new Error("Unknown P03 case");
  let expired = false, timer, cancel;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => { expired = true; reject(new Error("P03 case deadline exceeded")); }, policy.deadlineMs);
    cancel = () => reject(new Error("P03 case cancelled"));
    signal?.addEventListener("abort", cancel, { once: true });
    if (signal?.aborted) cancel();
  });
  deadline.catch(() => {});
  const bounded = operation => Promise.race([operation, deadline]);
  const report = { caseName, success: false, evidenceClass: "actual-provider-required", attempts: [], openCapabilities: policy.requiredCapabilities.filter(x => !ROWS.includes(x)) };
  try {
    if (signal?.aborted) { report.cancelled = true; return report; }
    const model = caseName === "unavailable-model" ? policy.invalidModel : policy.primary;
    const first = await executeAttempt({ model, caseName, policy, fixture, createClient, bounded, record });
    report.attempts.push(first);
    const checked = await evaluateAttempt(first, fixture, policy);
    Object.assign(report, checked);
    if (!first.cleanup?.reaped) report.success = false;
    report.cleanup = row(first.cleanup?.reaped ? "pass" : "inconclusive", "Owned app-server process reaped");
    report.failure = row(first.terminal?.status === "failed" ? "pass" : "inconclusive", first.terminal?.status === "failed" ? "Actual failed turn stayed non-success" : "No actual failed terminal observed");
    if (caseName === "missing-mcp") {
      let artifact = false;
      try { await lstat(join(fixture.cwd, "result.txt")); artifact = true; } catch {}
      const rejected = first.rejection && /mcp|p03/i.test(first.rejection.message ?? "") && first.acceptedTurns === 0 && !artifact;
      report.admission = row(healthyControl && rejected && first.cleanup?.reaped ? "pass" : first.acceptedTurns || artifact ? "fail" : "inconclusive", "Requires a healthy control, actual required-MCP startup rejection and cleanup");
      report.success = false;
    } else if (caseName === "unavailable-model") {
      const errorText = first.rejection?.message ?? first.terminal?.error?.message ?? "";
      const modelError = /model.{0,100}(unavailable|unknown|invalid|not found|not supported|does not exist)|(?:unknown|invalid|unavailable).{0,100}model/i.test(errorText);
      const rejected = modelError && (first.rejection || first.terminal?.status === "failed");
      let partialEffect = false;
      try { await lstat(join(fixture.cwd, "result.txt")); partialEffect = true; } catch {}
      if (partialEffect) report.fallback = row("fail", "Primary left effects; no fallback or automatic cleanup is authorized");
      else if (rejected && !expired && !signal?.aborted && first.cleanup?.reaped && policy.fallback) {
        const fallback = await executeAttempt({ model: policy.fallback, caseName: "healthy", policy, fixture, createClient, bounded, record });
        report.attempts.push(fallback);
        const checkedFallback = await evaluateAttempt(fallback, fixture, policy);
        report.fallback = row(checkedFallback.success && fallback.cleanup?.reaped ? "pass" : checkedFallback.model.verdict === "fail" ? "fail" : "inconclusive", "At most one approved fallback with the same fixture and checks");
        report.fallbackChecks = checkedFallback;
      } else report.fallback = row(first.terminal?.status === "completed" ? "fail" : "inconclusive", "No usable authorized fallback after actual primary rejection");
      report.success = false;
    } else if (caseName === "interrupted") {
      let artifactExists = false;
      try { await lstat(join(fixture.cwd, "result.txt")); artifactExists = true; } catch {}
      report.interruption = row(artifactExists ? "fail" : first.terminal?.status === "interrupted" && first.cleanup?.reaped && first.waitStopped ? "pass" : "inconclusive", "Requires actual interrupted terminal, captured wait PID stopped and no premature result");
      report.success = false;
    }
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
    report.deadlineExceeded = expired;
  }
  return report;
}

export function redact(value) {
  if (Array.isArray(value)) return value.filter(v => v?.type !== "reasoning").map(redact);
  if (value?.type === "reasoning") return { type: "reasoning", id: value.id, redacted: true };
  if (typeof value?.method === "string" && /reasoning/i.test(value.method)) return { method: value.method, params: { threadId: value.params?.threadId, turnId: value.params?.turnId, itemId: value.params?.itemId, redacted: true } };
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !/token|secret|password|credential|authorization|account|email|reasoning/i.test(key)).map(([k, v]) => [k, redact(v)]));
  if (typeof value === "string") return value.replace(/Bearer\s+\S+|sk-[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED]");
  return value;
}

async function command(binary, args, env, cwd) {
  return await new Promise((resolveCommand, reject) => {
    const child = spawn("rtk", ["proxy", binary, ...args], { env, cwd, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("Preflight command timed out")); }, 15_000);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", s => { output += s; if (output.length > 1024 * 1024) { child.kill("SIGKILL"); reject(new Error("Oversized preflight output")); } });
    child.stderr.resume();
    child.once("error", error => { clearTimeout(timer); reject(error); });
    child.once("exit", code => { clearTimeout(timer); code === 0 ? resolveCommand(output.trim()) : reject(new Error(`Preflight command failed: ${code}`)); });
  });
}

function childEnvironment(root) {
  // The documented Codex home selector applies only to these private children.
  return { PATH: process.env.PATH, HOME: join(root, "codex-home"), CODEX_HOME: join(root, "codex-home"), TMPDIR: join(root, "tmp"), LANG: "C.UTF-8", DISABLE_TELEMETRY: "1" };
}

async function assertRoot(root) {
  if (!isAbsolute(root) || (await lstat(root)).isSymbolicLink() || await realpath(root) !== resolve(root)) throw new Error("Use the original non-symlink absolute scratch root");
  const marker = await readFile(join(root, ".p03-root"), "utf8");
  if (!/^[a-f0-9]{32}\n$/.test(marker)) throw new Error("Not a P03-owned scratch root");
  for (const member of [".p03-root", "policy.json", "requests.json", "codex-home"]) if ((await lstat(join(root, member))).isSymbolicLink()) throw new Error("Scratch members cannot be symlinks");
  for (const member of ["tmp", "evidence", "workspaces"]) {
    try { if ((await lstat(join(root, member))).isSymbolicLink()) throw new Error("Scratch members cannot be symlinks"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  try { if ((await lstat(join(root, "codex-home", "config.toml"))).isSymbolicLink()) throw new Error("Scratch config cannot be a symlink"); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}

async function writeConfig(root, missingMcp) {
  const entry = missingMcp ? join(root, "intentionally-missing.mjs") : join(REPO, "packages/engineer-agent-workflow-mcp/dist/main.js");
  const config = `[analytics]\nenabled = false\n\n[features]\nmulti_agent = true\n\n[agents]\nmax_threads = 1\n\n[sandbox_workspace_write]\nnetwork_access = false\nexclude_slash_tmp = true\nexclude_tmpdir_env_var = true\n\n[mcp_servers.p03]\ncommand = ${JSON.stringify(process.execPath)}\nargs = [${JSON.stringify(entry)}]\nrequired = true\nenabled_tools = ["workflow_runtime_info"]\n`;
  await writeFile(join(root, "codex-home", "config.toml"), config, { mode: 0o600 });
}

async function verifySchema(root, policy, env) {
  const schemaRoot = join(root, "schema");
  await command(policy.binary, ["app-server", "generate-json-schema", "--out", schemaRoot], env, root);
  const requests = JSON.parse(await readFile(join(schemaRoot, "ClientRequest.json"), "utf8"));
  assertProtocolSchema(requests, policy, root);
  return sha(await readFile(join(schemaRoot, "ClientRequest.json")));
}

export function assertProtocolSchema(requests, policy, root) {
  const ajv = new Ajv();
  // JSON numeric values outside safe integer precision cannot represent exact IDs.
  ajv.addFormat("int64", { type: "number", validate: Number.isSafeInteger });
  ajv.addFormat("uint64", { type: "number", validate: n => Number.isSafeInteger(n) && n >= 0 });
  ajv.addFormat("uint32", { type: "number", validate: n => Number.isInteger(n) && n >= 0 && n <= 4294967295 });
  ajv.addFormat("uint16", { type: "number", validate: n => Number.isInteger(n) && n >= 0 && n <= 65535 });
  ajv.addFormat("uint", { type: "number", validate: n => Number.isSafeInteger(n) && n >= 0 });
  const validate = ajv.compile(requests);
  const thread = { id: 1, method: "thread/start", params: { cwd: root, model: policy.primary, approvalPolicy: "never", sandbox: "workspace-write", ephemeral: true } };
  const turn = { id: 2, method: "turn/start", params: { threadId: "fixture", cwd: root, model: policy.primary, effort: policy.effort, input: [{ type: "skill", name: "p03-fixture", path: join(root, "SKILL.md") }], outputSchema: {}, sandboxPolicy: { type: "workspaceWrite", writableRoots: [root], networkAccess: false, excludeSlashTmp: true, excludeTmpdirEnvVar: true } } };
  for (const request of [thread, turn, ...["initialize", "model/list", "skills/list", "mcpServerStatus/list", "turn/interrupt"].map(method => ({ method }))]) {
    if (!requests.oneOf?.some(x => x.properties?.method?.enum?.includes(request.method))) throw new Error(`Pinned schema lacks required method ${request.method}`);
    if (request.id && !validate(request)) throw new Error(`Pinned schema rejects the fixture request: ${request.method}`);
  }
}

export async function readMcpHealth(root, env = childEnvironment(root)) {
  const mcpEntry = join(REPO, "packages/engineer-agent-workflow-mcp/dist/main.js");
  const harness = createSharedStdioHarness({ entrypoint: mcpEntry, name: "p03_health", createClient: async () => {
    const client = new Client({ name: "p03_health", version: "1" });
    const transport = new StdioClientTransport({ command: "rtk", args: ["proxy", process.execPath, mcpEntry], cwd: root, env, stderr: "pipe" });
    transport.stderr?.resume();
    try { await client.connect(transport); } catch (error) { await transport.close(); throw error; }
    return client;
  } });
  let health;
  try {
    const response = await harness.callTool({ name: "workflow_runtime_info", arguments: {} });
    health = response.structuredContent ?? JSON.parse(response.content.find(c => c.type === "text").text);
    if (response.isError || health.protocol_version !== 2) throw new Error("Existing MCP health control failed");
  } finally { await harness.close(); }
  return health;
}

async function runCli(root, caseName) {
  await assertRoot(root);
  const lockPath = join(root, ".p03-run.lock");
  const lock = await open(lockPath, "wx", 0o600);
  try {
    await lock.writeFile(String(process.pid));
    return await executeCli(root, caseName);
  } finally { await lock.close(); await unlink(lockPath); }
}

async function executeCli(root, caseName) {
  if (platform() === "win32") throw new Error("This fixture requires POSIX owned process-group cleanup; Windows remains unqualified");
  const policy = validatePolicy(JSON.parse(await readFile(join(root, "policy.json"), "utf8")));
  if (!CASES.includes(caseName)) throw new Error("Unknown P03 case");
  const evidenceDir = join(root, "evidence", caseName);
  await mkdir(join(root, "evidence"), { recursive: true, mode: 0o700 });
  await mkdir(evidenceDir, { mode: 0o700 });
  await mkdir(join(root, "tmp"), { recursive: true, mode: 0o700 });
  const env = childEnvironment(root);
  if (sha(await readFile(policy.binary)) !== policy.binarySha256 || await command(policy.binary, ["--version"], env, root) !== policy.binaryVersion) throw new Error("Codex binary does not match the authorized pin");
  const schemaHash = await verifySchema(root, policy, env);
  const mcpEntry = join(REPO, "packages/engineer-agent-workflow-mcp/dist/main.js");
  const mcpHash = sha(await readFile(mcpEntry));
  const health = await readMcpHealth(root, env);
  const fixture = await createFixture(root, caseName, health);
  await writeConfig(root, caseName === "missing-mcp");
  const tracePath = join(evidenceDir, "trace.jsonl");
  const traceFd = openSync(tracePath, "wx", 0o600);
  let traceCount = 0, traceBytesWritten = 0;
  const record = (direction, message) => {
    if (direction === "send" && message.method === "turn/start") reserveTurnRequest(root);
    if (++traceCount > 10000) throw new Error("Trace budget exceeded");
    const entry = JSON.stringify({ direction, message: redact(message) }).replaceAll(root, "$P03_ROOT").replaceAll(REPO, "$REPO");
    traceBytesWritten += Buffer.byteLength(entry) + 1;
    if (traceBytesWritten > 8 * 1024 * 1024) throw new Error("Trace byte budget exceeded");
    writeSync(traceFd, `${entry}\n`); fsyncSync(traceFd);
  };
  let healthyControl = false;
  try { const prior = JSON.parse(await readFile(join(root, "evidence", "healthy", "report.json"), "utf8")); healthyControl = prior.success === true && prior.environment.binarySha256 === policy.binarySha256 && prior.environment.mcpEntrypointSha256 === mcpHash && prior.environment.schemaSha256 === schemaHash && prior.environment.node === process.version && prior.policySha256 === sha(JSON.stringify(policy)); } catch {}
  const controller = new AbortController();
  const abort = () => controller.abort();
  process.once("SIGINT", abort); process.once("SIGTERM", abort);
  let report;
  try {
    report = await runCase({ caseName, policy, fixture, healthyControl, signal: controller.signal,
      createClient: () => new JsonlClient(policy.binary, { cwd: fixture.cwd, env, record }), record });
  } finally {
    process.removeListener("SIGINT", abort); process.removeListener("SIGTERM", abort);
    closeSync(traceFd);
    await writeConfig(root, false);
  }
  report.environment = { os: platform(), arch: arch(), node: process.version, binaryVersion: policy.binaryVersion, binarySha256: policy.binarySha256, schemaSha256: schemaHash, mcpEntrypointSha256: sha(await readFile(mcpEntry)) };
  report.policySha256 = sha(JSON.stringify(policy));
  report.sourceVersion = policy.sourceVersion;
  report.sourcePins = policy.sourcePins;
  report.owner = policy.owner;
  report.fixtureAdmission = report.success && report.openCapabilities.length === 0;
  const traceBytes = await readFile(tracePath);
  report.traceSha256 = sha(traceBytes);
  await writeFile(join(evidenceDir, "report.json"), `${JSON.stringify(redact(report), null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ caseName, success: report.success, report: join(evidenceDir, "report.json"), liveHostAcceptance: "P04 and required Desktop/application tools remain open" }));
  return report;
}

export async function main(args = process.argv.slice(2)) {
  if (args.length === 2 && args[0] === "--prepare") { await prepareProbe(args[1]); console.log("Prepared inert P03 scratch policy; no provider process was started."); return 0; }
  if (args.length === 4 && args[0] === "--execute" && args[2] === "--case") {
    if (!isAbsolute(args[1])) throw new Error("Use an absolute P03 scratch root");
    const report = await runCli(resolve(args[1]), args[3]);
    const verdicts = [report.admission, report.fallback, report.interruption].filter(Boolean);
    const failed = Object.values(report.capabilities ?? {}).some(x => x.verdict === "fail") || report.model?.verdict === "fail" || verdicts.some(x => x.verdict === "fail");
    return !failed && (report.success || verdicts.some(x => x.verdict === "pass")) ? 0 : 1;
  }
  throw new Error("Usage: node probe.mjs --prepare NEW_ABSOLUTE_ROOT | --execute ROOT --case healthy|missing-mcp|unavailable-model|interrupted");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(code => { process.exitCode = code; }).catch(error => { console.error(redact(error.message)); process.exitCode = 1; });
}
