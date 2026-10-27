import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdtemp, open, readFile, realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createNativeMcpSnapshot } from "./lib/specification-review-native-snapshot.mjs";

const baselineVersion = "0.2.1-rc.3";
const baselineCommit = "22ddee3792402c3e70ec5f86a63c3e3e895a2f60";
const maximumOutputBytes = 32 * 1024;
const maximumScriptBytes = 256 * 1024;
const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

// Run only bounded declaration inspection and the prepared host's own validator.
// This is not a native workflow engine, model judgment, or qualification pass.
const schemaProbe = `
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { pathToFileURL } from 'node:url';
try {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  const { script, modulePath } = JSON.parse(input);
  const { assertObjectJsonSchema } = await import(pathToFileURL(modulePath));
  assert.equal(typeof assertObjectJsonSchema, 'function');
  assertObjectJsonSchema({type:'object',properties:{value:{type:'string'}},required:['value'],additionalProperties:false});
  let controlFailed = false;
  try {
    assert.throws(()=>assertObjectJsonSchema({type:'object',properties:{value:{type:['string','null']}}}),{code:'UNSUPPORTED_SCHEMA'});
    assert.throws(()=>assertObjectJsonSchema({type:'object',properties:{values:{type:'array',maxItems:20,items:{type:'string'}}}}),{code:'UNSUPPORTED_SCHEMA'});
  } catch {
    process.stdout.write(JSON.stringify({error:'VALIDATOR_CONTROL_FAILED'}));
    controlFailed = true;
  }
  if (!controlFailed) {
    const declaration = /\\bconst\\s+readingPolicy\\s*=/u.exec(script);
    const boundary = declaration?.index ?? -1;
    assert.ok(boundary > 0);
    const expression = script.slice(0,boundary) + '\\nJSON.stringify({detailSchema,finalSchema});';
    const serialized = runInNewContext(expression,Object.create(null),{timeout:100,contextCodeGeneration:{strings:false,wasm:false}});
    const schemas = JSON.parse(serialized);
    const checks = [];
    for (const name of ['detailSchema','finalSchema']) {
      try { assertObjectJsonSchema(schemas[name]); checks.push({name,status:'pass',violation_count:0}); }
      catch (error) {
        assert.equal(error.code,'UNSUPPORTED_SCHEMA');
        assert.ok(Array.isArray(error.violations));
        checks.push({name,status:'fail',violation_count:error.violations.length});
      }
    }
    process.stdout.write(JSON.stringify({checks}));
  }
} catch {
  process.stdout.write(JSON.stringify({error:'SCHEMA_PROBE_FAILED'}));
  process.exitCode = 2;
}
`;

function failure(code, metrics) {
  return Object.assign(new Error(code), { code, metrics });
}

function contained(root, target) {
  const path = relative(root, target);
  return path === "" || (!isAbsolute(path) && path !== ".." && !path.startsWith(`..${sep}`));
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function ownedPaths(options) {
  const fields = ["privateRoot", "clientRoot", "clientHome", "workspace", "workflowScript"];
  for (const field of fields) {
    if (typeof options[field] !== "string" || !isAbsolute(options[field])) throw failure("INVALID_INPUT");
  }
  const privateRoot = await realpath(options.privateRoot);
  if (privateRoot === await realpath(homedir()) || ((await stat(privateRoot)).mode & 0o077) !== 0) {
    throw failure("PRIVATE_ROOT_NOT_PRIVATE");
  }
  const clientRoot = await realpath(options.clientRoot);
  const clientHome = await realpath(options.clientHome);
  const workspace = await realpath(options.workspace);
  if (!contained(privateRoot, clientRoot) || clientRoot === privateRoot) throw failure("UNSAFE_CLIENT_PATH");
  if (!contained(privateRoot, clientHome) || clientHome === privateRoot) throw failure("UNSAFE_HOME_PATH");
  if (!contained(privateRoot, workspace) || workspace === privateRoot) throw failure("UNSAFE_WORKSPACE_PATH");
  if (!(await stat(clientRoot)).isDirectory() || !(await stat(clientHome)).isDirectory() || !(await stat(workspace)).isDirectory()) {
    throw failure("INVALID_INPUT");
  }
  const workflowScript = await realpath(options.workflowScript);
  const artifactRoot = join(repositoryRoot, "exports/deepseek-harness/skills/spec-driven-development/workflows");
  if (!contained(privateRoot, workflowScript) && !contained(artifactRoot, workflowScript)) throw failure("UNSAFE_WORKFLOW_PATH");
  if (!/\.(?:m?js)$/u.test(workflowScript) || !(await stat(workflowScript)).isFile()) throw failure("INVALID_INPUT");
  return { privateRoot, clientRoot, clientHome, workspace, workflowScript };
}

async function preparedPackage(clientRoot, name) {
  const directory = await realpath(join(clientRoot, "node_modules/@deepseek-ai", name));
  if (!contained(clientRoot, directory)) throw failure("UNSAFE_CLIENT_PATH");
  const manifestPath = join(directory, "package.json");
  if ((await stat(manifestPath)).size > 128 * 1024) throw failure("INVALID_CLIENT_MANIFEST");
  const manifestText = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(manifestText);
  if (manifest.name !== `@deepseek-ai/${name}` || typeof manifest.version !== "string"
    || manifest.version.length > 64 || !/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/u.test(manifest.version)) {
    throw failure("INVALID_CLIENT_MANIFEST");
  }
  return { directory, manifest };
}

async function packageFile(clientRoot, directory, relativePath) {
  if (typeof relativePath !== "string" || isAbsolute(relativePath)) throw failure("INVALID_CLIENT_MANIFEST");
  const target = await realpath(join(directory, relativePath));
  if (!contained(directory, target) || !contained(clientRoot, target)) throw failure("UNSAFE_CLIENT_PATH");
  if (!(await stat(target)).isFile()) throw failure("INVALID_CLIENT_MANIFEST");
  return target;
}

function childEnvironment(paths) {
  const environment = {};
  for (const key of ["PATH", "LANG", "LC_ALL", "SystemRoot", "WINDIR"]) {
    if (process.env[key] !== undefined) environment[key] = process.env[key];
  }
  return { ...environment, HOME: paths.clientHome, DSH_HOME: paths.clientHome, TMPDIR: paths.workspace };
}

// The existing model-trial helper closes stdin immediately and has no abort
// contract. These two preflight probes need bounded input and owned-group cleanup.
async function ownedProbe(args, { paths, timeoutMs, signal, input = "", graceMs = 250 }) {
  if (signal?.aborted) throw failure("CANCELLED");
  const started = performance.now();
  function supervise(resolve, reject) {
    const child = spawn(process.execPath, args, {
      cwd: paths.workspace, env: childEnvironment(paths), detached: true,
      stdio: ["pipe", "pipe", "pipe"], shell: false,
    });
    const stdout = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let stopCode;
    let escalation;
    function killGroup(signalName) {
      if (!Number.isInteger(child.pid) || child.pid <= 1) return;
      try { process.kill(-child.pid, signalName); } catch (error) {
        if (error.code !== "ESRCH") stopCode ??= "CLEANUP_FAILED";
      }
    }
    function stop(code) {
      if (stopCode) return;
      stopCode = code;
      killGroup("SIGTERM");
      escalation = setTimeout(() => killGroup("SIGKILL"), graceMs);
    }
    function abort() { stop("CANCELLED"); }
    function onStdout(chunk) {
      stdoutBytes += chunk.length;
      if (stdoutBytes + stderrBytes > maximumOutputBytes) stop("OUTPUT_LIMIT");
      else stdout.push(Buffer.from(chunk));
    }
    function onStderr(chunk) {
      stderrBytes += chunk.length;
      if (stdoutBytes + stderrBytes > maximumOutputBytes) stop("OUTPUT_LIMIT");
    }
    const timer = setTimeout(() => stop("TIMEOUT"), timeoutMs);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    child.stdout.on("data", onStdout);
    child.stderr.on("data", onStderr);
    child.once("error", () => { stopCode ??= "PROCESS_FAILED"; });
    child.once("exit", () => killGroup("SIGTERM"));
    function finish(code, terminationSignal) {
      killGroup("SIGKILL");
      clearTimeout(timer);
      clearTimeout(escalation);
      signal?.removeEventListener("abort", abort);
      const metrics = { elapsed_ms: performance.now() - started, stdin_bytes: Buffer.byteLength(input),
        stdout_bytes: stdoutBytes, stderr_bytes: stderrBytes, exit_code: code,
        signal: ["SIGTERM", "SIGKILL", "SIGINT"].includes(terminationSignal) ? terminationSignal : null };
      if (stopCode || code !== 0) reject(failure(stopCode ?? "PROCESS_FAILED", metrics));
      else resolve({ stdout: Buffer.concat(stdout).toString("utf8"), metrics });
    }
    child.once("close", finish);
    child.stdin.on("error", () => {});
    child.stdin.end(input);
  }
  return new Promise(supervise);
}

const nativeCases = new Set(["sequential-omission", "native-omission", "native-clean", "native-paraphrase", "native-conflict"]);

function validateNativeSelection(options) {
  if (options.allowModelRequests !== true) throw failure("EXPLICIT_MODEL_RUN_REQUIRED");
  const selection = [options.provider, options.model, options.reasoningEffort, options.expectedClientVersion];
  if (selection.some(invalidSelection) || options.provider !== "openai-codex"
    || !Array.isArray(options.cases) || options.cases.length < 1 || options.cases.length > nativeCases.size
    || new Set(options.cases).size !== options.cases.length || options.cases.some(unknownCase)
    || typeof options.providerRoot !== "string" || !isAbsolute(options.providerRoot)
    || !/^[a-f0-9]{64}$/u.test(options.expectedProviderSha256 ?? "")) {
    throw failure("INVALID_NATIVE_INPUT");
  }
  if (options.cancellationCase !== undefined
    && (options.cancellationCase !== "native-conflict" || !options.cases.includes(options.cancellationCase))) throw failure("INVALID_NATIVE_INPUT");
  const deadline = options.modelTimeoutMs ?? 3_600_000;
  if (!Number.isSafeInteger(deadline) || deadline < 1000 || deadline > 14_400_000) throw failure("INVALID_NATIVE_INPUT");
  return deadline;
}

function invalidSelection(value) {
  return typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/u.test(value);
}

function unknownCase(value) { return !nativeCases.has(value); }

async function qualifyNativeModels(options) {
  const modelTimeoutMs = validateNativeSelection(options);
  const report = await qualifySpecificationReview({ ...options, mode: "preflight" });
  const blocking = report.blockers.some(isNativePreflightBlocker);
  if (blocking) return report;
  if (report.observed.client_version !== options.expectedClientVersion) throw failure("CLIENT_VERSION_MISMATCH");
  const paths = await ownedPaths(options);
  const providerRoot = await realpath(options.providerRoot);
  if (!contained(paths.privateRoot, providerRoot) || providerRoot === paths.privateRoot) throw failure("UNSAFE_PROVIDER_PATH");
  const providerManifest = join(providerRoot, "package.json");
  if ((await stat(providerManifest)).size > 128 * 1024) throw failure("INVALID_PROVIDER_MANIFEST");
  const manifestText = await readFile(providerManifest, "utf8");
  const manifest = JSON.parse(manifestText);
  if (manifest.name !== "dsh-codex-connect" || invalidSelection(manifest.version)) throw failure("INVALID_PROVIDER_MANIFEST");
  const providerModule = await packageFile(paths.privateRoot, providerRoot, manifest.exports?.["."]?.default ?? manifest.main);
  const providerBytes = await readFile(providerModule);
  if (digest(providerBytes) !== options.expectedProviderSha256) throw failure("PROVIDER_CHANGED");
  const reviewerReference = await realpath(join(dirname(paths.workflowScript), "../references/completeness-review.md"));
  const generatedSkill = join(repositoryRoot, "exports/deepseek-harness/skills/spec-driven-development");
  if (!contained(paths.privateRoot, reviewerReference) && !contained(generatedSkill, reviewerReference)) throw failure("UNSAFE_WORKFLOW_PATH");
  if ((await stat(reviewerReference)).size > 128 * 1024) throw failure("INVALID_REVIEWER_REFERENCE");
  const reviewerText = await readFile(reviewerReference, "utf8");
  if (/\{\{HOST_/u.test(reviewerText)) throw failure("INVALID_REVIEWER_REFERENCE");
  const reviewerSha256 = digest(reviewerText);
  const worker = fileURLToPath(new URL("./lib/specification-review-native-worker.mjs", import.meta.url));
  const workspace = await mkdtemp(join(paths.workspace, "native-run-"));
  const invocationPaths = { ...paths, workspace };
  async function verifySnapshot({ runtimeInfoModule }) {
    const moduleUrl = pathToFileURL(runtimeInfoModule).href;
    const code = `const {runtimeIdentity}=await import(${JSON.stringify(moduleUrl)}); process.stdout.write(JSON.stringify(runtimeIdentity));`;
    const probe = await ownedProbe(["--input-type=module", "-e", code], {
      paths: invocationPaths, timeoutMs: 10_000, signal: options.signal,
    });
    return JSON.parse(probe.stdout);
  }
  const snapshot = await createNativeMcpSnapshot({
    sourcePackage: join(repositoryRoot, "packages/engineer-agent-workflow-mcp"),
    destination: join(workspace, "mcp-snapshot"),
    dependencyRoot: join(repositoryRoot, "node_modules"),
    verify: verifySnapshot,
  });
  const input = JSON.stringify({ ...invocationPaths, run: true, allowModelRequests: true, mode: "native-models",
    providerModule, providerSha256: options.expectedProviderSha256, providerVersion: manifest.version,
    provider: options.provider, model: options.model, reasoningEffort: options.reasoningEffort,
    cases: options.cases, cancellationCase: options.cancellationCase, modelTimeoutMs,
    workflowSha256: options.expectedWorkflowSha256, reviewerReference, reviewerSha256,
    clientVersion: report.observed.client_version,
    serverEntrypoint: snapshot.entrypoint, expectedMcpBuildId: snapshot.identity.build_id });
  const execution = await ownedProbe([worker, "--worker-run"], { paths: invocationPaths, timeoutMs: modelTimeoutMs, signal: options.signal, input, graceMs: 5000 });
  const nativeReport = JSON.parse(execution.stdout);
  const { validateNativeReport } = await import("./lib/specification-review-native-report.mjs");
  validateNativeReport(nativeReport, options);
  if (nativeReport.mcp_build_id !== snapshot.identity.build_id) throw failure("MCP_SNAPSHOT_IDENTITY_MISMATCH");
  return { ...nativeReport, baseline: report.baseline, observed: { ...report.observed, provider_version: manifest.version,
    provider_module_sha256: options.expectedProviderSha256, reviewer_sha256: reviewerSha256,
    mcp_snapshot_sha256: snapshot.source_fingerprint, mcp_snapshot_artifact_count: snapshot.artifact_count },
    preflight: { checks: report.checks, metrics: report.metrics }, process: execution.metrics };
}

function isNativePreflightBlocker(blocker) {
  return !["NATIVE_QUALIFICATION_REQUIRED", "HOST_VERSION_REQUIRES_RECONCILIATION"].includes(blocker.code);
}

function initialReport() {
  return {
    schema_version: 1, packet_id: "P04", status: "incomplete", evidence_level: "preflight",
    baseline: { client_version: baselineVersion, upstream_commit: baselineCommit },
    observed: { client_version: null, tools_version: null, workflow_sha256: null, tools_module_sha256: null },
    checks: { client_version: { status: "not_run" }, native_schemas: [] },
    blockers: [],
    metrics: { preflight_elapsed_ms: null, version_probe: null, schema_probe: null,
      model_reviews: 0, model_turns: null, input_tokens: null, output_tokens: null, cache_tokens: null,
      scenario_handler_ms: null, lock_wait_ms: null, submission_ack_ms: null, lane_idle_ms: null },
    required_evidence: ["native_engine", "four_model_reviews", "native_cancellation_cleanup", "all_actor_metrics"],
    next_action: "resolve_preflight_blockers",
  };
}

function block(report, code, component) {
  report.blockers.push({ code, ...(component ? { component } : {}) });
}

/** Explicit isolated preflight or selected model trials; neither certifies an omitted workload. */
export async function qualifySpecificationReview(options) {
  if (options?.run !== true) throw failure("EXPLICIT_RUN_REQUIRED");
  if (options.mode === "native-models") return qualifyNativeModels(options);
  if (options.mode !== undefined && options.mode !== "preflight") throw failure("INVALID_MODE");
  if (process.platform === "win32") throw failure("UNSUPPORTED_PLATFORM");
  if (!/^[a-f0-9]{64}$/u.test(options.expectedWorkflowSha256 ?? "")) throw failure("INVALID_INPUT");
  const timeoutMs = options.timeoutMs ?? 10_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30_000) throw failure("INVALID_INPUT");
  const paths = await ownedPaths(options);
  const started = performance.now();
  const report = initialReport();
  try {
    if (options.signal?.aborted) {
      block(report, "CANCELLED");
      report.next_action = "resume_preflight_after_cancellation";
      return report;
    }
    if ((await stat(paths.workflowScript)).size > maximumScriptBytes) throw failure("WORKFLOW_TOO_LARGE");
    const script = await readFile(paths.workflowScript, "utf8");
    report.observed.workflow_sha256 = digest(script);
    if (report.observed.workflow_sha256 !== options.expectedWorkflowSha256) {
      block(report, "WORKFLOW_CHANGED");
      report.next_action = "reconcile_workflow_identity";
      return report;
    }
    const cli = await preparedPackage(paths.clientRoot, "dsh");
    const tools = await preparedPackage(paths.clientRoot, "dsh-tools");
    report.observed.client_version = cli.manifest.version;
    report.observed.tools_version = tools.manifest.version;
    if (tools.manifest.version !== cli.manifest.version) throw failure("CLIENT_PACKAGE_VERSION_MISMATCH");
    if (cli.manifest.version !== baselineVersion) block(report, "HOST_VERSION_REQUIRES_RECONCILIATION");
    const bin = await packageFile(paths.clientRoot, cli.directory, cli.manifest.bin?.dsh);
    const module = await packageFile(paths.clientRoot, tools.directory, tools.manifest.exports?.["."]?.default);
    const moduleBytes = await readFile(module);
    report.observed.tools_module_sha256 = digest(moduleBytes);
    try {
      const version = await ownedProbe([bin, "--version"], { paths, timeoutMs, signal: options.signal });
      report.metrics.version_probe = version.metrics;
      if (version.stdout.trim() !== cli.manifest.version) throw failure("CLIENT_VERSION_MISMATCH");
      report.checks.client_version = { status: "pass" };
    } catch (error) {
      const code = ["CANCELLED", "OUTPUT_LIMIT", "TIMEOUT", "CLEANUP_FAILED", "CLIENT_VERSION_MISMATCH"].includes(error.code)
        ? error.code : "PROCESS_FAILED";
      report.metrics.version_probe = error.metrics ?? report.metrics.version_probe;
      report.checks.client_version = { status: "fail", code };
      block(report, code, "client_version");
      report.next_action = code === "CANCELLED" ? "resume_preflight_after_cancellation" : "resolve_preflight_failure";
      return report;
    }
    if (options.signal?.aborted) {
      block(report, "CANCELLED");
      report.next_action = "resume_preflight_after_cancellation";
      return report;
    }
    let observed;
    try {
      const input = JSON.stringify({ script, modulePath: module });
      const probe = await ownedProbe(["--input-type=module", "-e", schemaProbe], { paths, timeoutMs, signal: options.signal, input });
      report.metrics.schema_probe = probe.metrics;
      observed = JSON.parse(probe.stdout);
    } catch (error) {
      report.metrics.schema_probe = error.metrics ?? report.metrics.schema_probe;
      const code = ["CANCELLED", "OUTPUT_LIMIT", "TIMEOUT", "CLEANUP_FAILED"].includes(error.code) ? error.code : "SCHEMA_PROBE_FAILED";
      block(report, code, "native_schemas");
      report.next_action = code === "CANCELLED" ? "resume_preflight_after_cancellation" : "resolve_schema_probe_failure";
      return report;
    }
    if (observed.error) {
      block(report, observed.error === "VALIDATOR_CONTROL_FAILED" ? observed.error : "SCHEMA_PROBE_FAILED", "native_schemas");
      report.next_action = "repair_validator_contract";
      return report;
    }
    assert.ok(Array.isArray(observed.checks) && observed.checks.length === 2);
    for (const [index, name] of ["detailSchema", "finalSchema"].entries()) {
      const check = observed.checks[index];
      assert.equal(check.name, name);
      assert.ok(["pass", "fail"].includes(check.status));
      assert.ok(Number.isSafeInteger(check.violation_count) && check.violation_count >= 0);
      report.checks.native_schemas.push({ component: name, status: check.status, violation_count: check.violation_count });
      if (check.status === "fail") block(report, "UNSUPPORTED_SCHEMA", name);
    }
    block(report, "NATIVE_QUALIFICATION_REQUIRED");
    if (report.checks.native_schemas.some((check) => check.status === "fail")) report.next_action = "repair_schema_compatibility";
    else if (cli.manifest.version !== baselineVersion) report.next_action = "reconcile_host_version";
    else report.next_action = "native_qualification_required";
    return report;
  } catch {
    block(report, "PREFLIGHT_FAILED");
    return report;
  } finally {
    report.metrics.preflight_elapsed_ms = performance.now() - started;
  }
}

async function validateReportDestination(output, privateRoot) {
  if (!isAbsolute(output) || !output.endsWith(".json")) throw failure("UNSAFE_OUTPUT_PATH");
  const parent = await realpath(dirname(output));
  const ownedRoot = await realpath(privateRoot);
  if (!contained(ownedRoot, parent)) {
    const evidenceDirectory = await realpath(join(repositoryRoot, "docs/evidence/specification-review-native-workflow"));
    if (!contained(evidenceDirectory, parent)) throw failure("UNSAFE_OUTPUT_PATH");
  }
  try {
    await lstat(output);
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  throw failure("OUTPUT_EXISTS");
}

async function writeReport(output, report) {
  const handle = await open(output, "wx", 0o600);
  try { await handle.writeFile(JSON.stringify(report, null, 2) + "\n"); } finally { await handle.close(); }
}

async function main(argv = process.argv.slice(2)) {
  if (!argv.includes("--run")) {
    process.stderr.write("Explicit qualification requires --run.\n");
    return 1;
  }
  let configPath;
  let output;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--run") continue;
    if (argument === "--config" && !configPath) configPath = argv[++index];
    else if (argument === "--output" && !output) output = argv[++index];
    else throw failure("INVALID_ARGUMENTS");
  }
  if (!configPath || !isAbsolute(configPath) || !output) throw failure("INVALID_ARGUMENTS");
  if ((await stat(configPath)).size > 16 * 1024) throw failure("INVALID_INPUT");
  const configText = await readFile(configPath, "utf8");
  const config = JSON.parse(configText);
  const allowed = ["privateRoot", "clientRoot", "clientHome", "workspace", "workflowScript", "expectedWorkflowSha256", "timeoutMs",
    "mode", "allowModelRequests", "providerRoot", "expectedProviderSha256", "expectedClientVersion", "provider", "model", "reasoningEffort", "cases", "modelTimeoutMs", "cancellationCase"];
  if (!config || typeof config !== "object" || Array.isArray(config) || Object.keys(config).some((key) => !allowed.includes(key))) {
    throw failure("INVALID_INPUT");
  }
  await validateReportDestination(output, config.privateRoot);
  const controller = new AbortController();
  function abort() { controller.abort(); }
  process.once("SIGINT", abort);
  process.once("SIGTERM", abort);
  try {
    const report = await qualifySpecificationReview({ ...config, run: true, signal: controller.signal });
    await writeReport(output, report);
    process.stdout.write(JSON.stringify(report) + "\n");
    return report.status === "pass" ? 0 : 2;
  } finally {
    process.removeListener("SIGINT", abort);
    process.removeListener("SIGTERM", abort);
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try { process.exitCode = await main(); } catch {
    process.stderr.write("Qualification failed; no raw diagnostics are published.\n");
    process.exitCode = 1;
  }
}
