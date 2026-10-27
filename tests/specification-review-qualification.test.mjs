import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const runnerPath = fileURLToPath(new URL("../scripts/qualify-specification-review.mjs", import.meta.url));
const { qualifySpecificationReview } = await import(pathToFileURL(runnerPath));
const unsupportedProcessGroups = process.platform === "win32" ? "Owned POSIX process groups are unqualified on Windows." : false;

const fixtureValidator = `
export function assertObjectJsonSchema(schema) {
  const violations = [];
  function inspect(value) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value.type)) violations.push('unsupported type array');
    if (Object.hasOwn(value, 'maxItems')) violations.push('unsupported keyword');
    for (const child of Object.values(value)) inspect(child);
  }
  inspect(schema);
  if (violations.length) throw Object.assign(new Error('fixture-only-token must stay private'), { code: 'UNSUPPORTED_SCHEMA', violations });
}
`;

async function fixture(t, options = {}) {
  const privateRoot = await mkdtemp(join(tmpdir(), "eaw-p04-unit-"));
  t.after(() => rm(privateRoot, { recursive: true, force: true }));
  const clientRoot = join(privateRoot, "client");
  const clientHome = join(privateRoot, "home");
  const workspace = join(privateRoot, "workspace");
  const cliPackage = join(clientRoot, "node_modules/@deepseek-ai/dsh");
  const toolsPackage = join(clientRoot, "node_modules/@deepseek-ai/dsh-tools");
  for (const directory of [clientHome, workspace, join(cliPackage, "lib"), join(toolsPackage, "lib")]) {
    await mkdir(directory, { recursive: true, mode: 0o700 });
  }
  const version = options.version ?? "0.2.1-rc.3";
  await writeFile(join(cliPackage, "package.json"), JSON.stringify({ name: "@deepseek-ai/dsh", version, type: "module", bin: { dsh: "lib/bin.js" } }));
  await writeFile(join(toolsPackage, "package.json"), JSON.stringify({ name: "@deepseek-ai/dsh-tools", version, type: "module", exports: { ".": { default: "./lib/index.js" } } }));
  const marker = join(workspace, "version-started.json");
  const childCode = options.childCode ?? `import {writeFileSync} from 'node:fs'; writeFileSync(${JSON.stringify(marker)},JSON.stringify({pid:process.pid,home:process.env.HOME,dshHome:process.env.DSH_HOME,ambient:process.env.EAW_P04_AMBIENT_SECRET??null})); console.log(${JSON.stringify(version)});`;
  await writeFile(join(cliPackage, "lib/bin.js"), childCode);
  await writeFile(join(toolsPackage, "lib/index.js"), options.validator ?? fixtureValidator);
  const workflowScript = join(workspace, "workflow.js");
  const script = options.script ?? `const detailSchema={type:'object',properties:{result:{type:'string'}},additionalProperties:false}; const finalSchema={type:'object',properties:{result:{type:'string'}},additionalProperties:false}; const readingPolicy='fixture-only';`;
  await writeFile(workflowScript, script);
  const expectedWorkflowSha256 = createHash("sha256").update(script).digest("hex");
  const config = { privateRoot, clientRoot, clientHome, workspace, workflowScript, expectedWorkflowSha256, timeoutMs: 3000 };
  const configPath = join(privateRoot, "config.json");
  await writeFile(configPath, JSON.stringify(config));
  return { config, configPath, marker, privateRoot, cliPackage, toolsPackage, workflowScript };
}

function runProcess(args, options = {}) {
  function collect(resolve, reject) {
    const child = spawn(process.execPath, args, { stdio: ["ignore", "pipe", "pipe"], ...options });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => { stderr += data; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  }
  return new Promise(collect);
}

async function importAndMissingRunHaveNoProcessOrReportEffects(t) {
  const f = await fixture(t);
  const output = join(f.privateRoot, "report.json");
  const imported = await runProcess(["--input-type=module", "-e", `await import(${JSON.stringify(pathToFileURL(runnerPath).href)});`]);
  assert.equal(imported.code, 0);
  assert.equal(imported.stdout, "");
  const invoked = await runProcess([runnerPath, "--config", f.configPath, "--output", output]);
  assert.notEqual(invoked.code, 0);
  await assert.rejects(readFile(f.marker), { code: "ENOENT" });
  await assert.rejects(readFile(output), { code: "ENOENT" });
}
test("import and missing --run have no process or report effects", importAndMissingRunHaveNoProcessOrReportEffects);

async function exportedOperationRequiresExplicitOptIn(t) {
  const f = await fixture(t);
  await assert.rejects(qualifySpecificationReview(f.config), { code: "EXPLICIT_RUN_REQUIRED" });
  await assert.rejects(readFile(f.marker), { code: "ENOENT" });
}
test("the exported operation also requires explicit opt-in", exportedOperationRequiresExplicitOptIn);

async function nativeModelsNeedSeparateAuthorityBeforeHostProcesses(t) {
  const f = await fixture(t);
  await assert.rejects(qualifySpecificationReview({ ...f.config, run: true, mode: "native-models" }), { code: "EXPLICIT_MODEL_RUN_REQUIRED" });
  await assert.rejects(readFile(f.marker), { code: "ENOENT" });
}
test("native model mode requires explicit model authority before any host process", nativeModelsNeedSeparateAuthorityBeforeHostProcesses);

async function unknownQualificationModeCannotFallThroughToPreflight(t) {
  const f = await fixture(t);
  await assert.rejects(qualifySpecificationReview({ ...f.config, run: true, mode: "unrecognized" }), { code: "INVALID_MODE" });
  await assert.rejects(readFile(f.marker), { code: "ENOENT" });
}
test("unknown qualification modes never silently execute preflight", unknownQualificationModeCannotFallThroughToPreflight);

async function nativeModelsNeedExactRouteAndCaseSelection(t) {
  const f = await fixture(t);
  const valid = { provider: "openai-codex", model: "gpt-test", reasoningEffort: "xhigh", expectedClientVersion: "0.2.1-rc.3",
    providerRoot: f.config.clientRoot, expectedProviderSha256: "a".repeat(64), cases: ["native-paraphrase"] };
  const cases = [
    { provider: "different-provider" }, { model: "" }, { reasoningEffort: undefined }, { expectedClientVersion: " " },
    { cases: ["unknown-case"] }, { cases: ["native-paraphrase", "native-paraphrase"] },
  ];
  for (const selection of cases) {
    await assert.rejects(qualifySpecificationReview({ ...f.config, run: true, mode: "native-models", allowModelRequests: true, ...valid, ...selection }), { code: "INVALID_NATIVE_INPUT" });
  }
  await assert.rejects(readFile(f.marker), { code: "ENOENT" });
}
test("native model mode requires an exact route and a bounded unique case selection", nativeModelsNeedExactRouteAndCaseSelection);

async function cancellationProbeCannotEscapeItsSelectedControl(t) {
  const f = await fixture(t);
  const selected = { ...f.config, run: true, mode: "native-models", allowModelRequests: true,
    provider: "openai-codex", model: "gpt-test", reasoningEffort: "xhigh", expectedClientVersion: "0.2.1-rc.3",
    providerRoot: f.config.clientRoot, expectedProviderSha256: "a".repeat(64), cases: ["native-paraphrase"] };
  await assert.rejects(qualifySpecificationReview({ ...selected, cancellationCase: "native-conflict" }), { code: "INVALID_NATIVE_INPUT" });
  await assert.rejects(readFile(f.marker), { code: "ENOENT" });
}
test("cancellation instrumentation is restricted to an explicitly selected conflict control", cancellationProbeCannotEscapeItsSelectedControl);

async function changedProviderCannotBeLoadedForModelQualification(t) {
  const f = await fixture(t);
  const providerRoot = join(f.privateRoot, "provider");
  await mkdir(providerRoot);
  await writeFile(join(providerRoot, "package.json"), JSON.stringify({ name: "dsh-codex-connect", version: "0.1.0", main: "index.mjs" }));
  const marker = join(f.config.workspace, "provider-loaded");
  const module = "import {writeFileSync} from 'node:fs'; writeFileSync(" + JSON.stringify(marker) + ",'unexpected');";
  await writeFile(join(providerRoot, "index.mjs"), module);
  await assert.rejects(qualifySpecificationReview({ ...f.config, run: true, mode: "native-models", allowModelRequests: true,
    provider: "openai-codex", model: "gpt-test", reasoningEffort: "xhigh", expectedClientVersion: "0.2.1-rc.3",
    providerRoot, expectedProviderSha256: "a".repeat(64), cases: ["native-paraphrase"] }), { code: "PROVIDER_CHANGED" });
  await assert.rejects(readFile(marker), { code: "ENOENT" });
}
test("a changed provider module is rejected before its code or model client can load", { skip: unsupportedProcessGroups }, changedProviderCannotBeLoadedForModelQualification);

async function exactObservedHostVersionIsRequiredBeforeNativeDispatch(t) {
  const f = await fixture(t);
  await assert.rejects(qualifySpecificationReview({ ...f.config, run: true, mode: "native-models", allowModelRequests: true,
    provider: "openai-codex", model: "gpt-test", reasoningEffort: "xhigh", expectedClientVersion: "0.2.1-rc.2",
    providerRoot: f.config.clientRoot, expectedProviderSha256: "a".repeat(64), cases: ["native-paraphrase"] }), { code: "CLIENT_VERSION_MISMATCH" });
}
test("native dispatch requires the exact explicitly selected observed host version", { skip: unsupportedProcessGroups }, exactObservedHostVersionIsRequiredBeforeNativeDispatch);

async function preflightSuccessDoesNotCertifyNativeQualification(t) {
  const f = await fixture(t);
  const report = await qualifySpecificationReview({ ...f.config, run: true });
  assert.equal(report.status, "incomplete");
  assert.equal(report.evidence_level, "preflight");
  assert.equal(report.checks.client_version.status, "pass");
  assert.ok(report.checks.native_schemas.every((check) => check.status === "pass"));
  assert.ok(report.blockers.some((blocker) => blocker.code === "NATIVE_QUALIFICATION_REQUIRED"));
  assert.equal(report.metrics.model_reviews, 0);
  assert.equal(report.metrics.input_tokens, null);
  assert.equal(report.metrics.output_tokens, null);
  assert.equal(report.metrics.cache_tokens, null);
  assert.equal(report.metrics.model_turns, null);
  assert.ok(report.metrics.version_probe.elapsed_ms >= 0);
  assert.ok(report.metrics.schema_probe.elapsed_ms >= 0);
}
test("preflight success does not certify native or semantic qualification", { skip: unsupportedProcessGroups }, preflightSuccessDoesNotCertifyNativeQualification);

async function unsupportedSchemasRemainBlockedWithoutRawDiagnostics(t) {
  const script = `const detailSchema={type:'object',properties:{cursor:{type:['string','null']}}}; const finalSchema={type:'object',properties:{items:{type:'array',maxItems:20,items:{type:'string'}}}}; const readingPolicy='fixture';`;
  const f = await fixture(t, { script });
  const report = await qualifySpecificationReview({ ...f.config, run: true });
  assert.equal(report.status, "incomplete");
  assert.equal(report.checks.native_schemas.filter((check) => check.status === "fail").length, 2);
  assert.ok(report.blockers.some((blocker) => blocker.code === "UNSUPPORTED_SCHEMA"));
  assert.equal(report.next_action, "repair_schema_compatibility");
  const serialized = JSON.stringify(report);
  assert.ok(!serialized.includes("fixture-only-token"));
  assert.ok(!serialized.includes(f.privateRoot));
}
test("unsupported native schemas stay blocked and disclose no raw diagnostics", { skip: unsupportedProcessGroups }, unsupportedSchemasRemainBlockedWithoutRawDiagnostics);

async function alternateVersionDoesNotBecomePinnedBaseline(t) {
  const f = await fixture(t, { version: "0.2.1-rc.2" });
  const report = await qualifySpecificationReview({ ...f.config, run: true });
  assert.equal(report.checks.client_version.status, "pass");
  assert.equal(report.observed.client_version, "0.2.1-rc.2");
  assert.ok(report.blockers.some((blocker) => blocker.code === "HOST_VERSION_REQUIRES_RECONCILIATION"));
  assert.equal(report.next_action, "reconcile_host_version");
  assert.equal(report.status, "incomplete");
}
test("a different installed version is not promoted to the pinned baseline", { skip: unsupportedProcessGroups }, alternateVersionDoesNotBecomePinnedBaseline);

async function changedWorkflowPreventsRuntimeProcesses(t) {
  const f = await fixture(t);
  await writeFile(f.workflowScript, "throw new Error('changed fixture');");
  const report = await qualifySpecificationReview({ ...f.config, run: true });
  assert.ok(report.blockers.some((blocker) => blocker.code === "WORKFLOW_CHANGED"));
  await assert.rejects(readFile(f.marker), { code: "ENOENT" });
}
test("changed workflow bytes prevent any runtime process", { skip: unsupportedProcessGroups }, changedWorkflowPreventsRuntimeProcesses);

async function resolvedContainmentIsCheckedBeforeExecution(t) {
  const f = await fixture(t);
  const other = await mkdtemp(join(tmpdir(), "eaw-p04-external-"));
  t.after(() => rm(other, { recursive: true, force: true }));
  const escaped = join(f.privateRoot, "escaped-client");
  await symlink(other, escaped, "dir");
  await assert.rejects(qualifySpecificationReview({ ...f.config, clientRoot: escaped, run: true }), { code: "UNSAFE_CLIENT_PATH" });
  await assert.rejects(readFile(f.marker), { code: "ENOENT" });
}
test("private ownership and resolved containment are checked before execution", { skip: unsupportedProcessGroups }, resolvedContainmentIsCheckedBeforeExecution);

async function versionProcessHasIsolatedEnvironment(t) {
  const f = await fixture(t);
  const output = join(f.privateRoot, "environment-report.json");
  const result = await runProcess([runnerPath, "--run", "--config", f.configPath, "--output", output], {
    env: { ...process.env, EAW_P04_AMBIENT_SECRET: "fixture-only-ambient" },
  });
  assert.equal(result.code, 2);
  const reportText = await readFile(output, "utf8");
  const report = JSON.parse(reportText);
  assert.equal(report.checks.client_version.status, "pass");
  const markerText = await readFile(f.marker, "utf8");
  const actual = JSON.parse(markerText);
  assert.equal(actual.home, f.config.clientHome);
  assert.equal(actual.dshHome, f.config.clientHome);
  assert.equal(actual.ambient, null);
}
test("version processes do not inherit ambient provider secrets", { skip: unsupportedProcessGroups }, versionProcessHasIsolatedEnvironment);

async function processFailuresExposeOnlyBoundedMetadata(t) {
  const f = await fixture(t, { childCode: "process.stderr.write('fixture-only-token /private/fixture/profile'); process.exit(7);" });
  const report = await qualifySpecificationReview({ ...f.config, run: true });
  assert.equal(report.checks.client_version.status, "fail");
  assert.equal(report.checks.client_version.code, "PROCESS_FAILED");
  assert.equal(report.metrics.version_probe.exit_code, 7);
  assert.equal(report.metrics.schema_probe, null);
  assert.equal(report.next_action, "resolve_preflight_failure");
  const serialized = JSON.stringify(report);
  assert.ok(!serialized.includes("fixture-only-token"));
  assert.ok(!serialized.includes("/private/fixture"));
}
test("process failures retain bounded metadata without stderr or paths", { skip: unsupportedProcessGroups }, processFailuresExposeOnlyBoundedMetadata);

async function oversizedOutputIsStoppedWithoutDisclosure(t) {
  const f = await fixture(t, { childCode: "process.stderr.write('fixture-only-token'.repeat(100000)); setInterval(()=>{},1000);" });
  const report = await qualifySpecificationReview({ ...f.config, run: true });
  assert.equal(report.checks.client_version.code, "OUTPUT_LIMIT");
  assert.equal(report.metrics.schema_probe, null);
  assert.ok(!JSON.stringify(report).includes("fixture-only-token"));
}
test("unbounded process output is stopped and never published", { skip: unsupportedProcessGroups }, oversizedOutputIsStoppedWithoutDisclosure);

async function waitForMarker(path) {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    try { return JSON.parse(await readFile(path, "utf8")); } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail("Owned process did not reach its fixture marker.");
}

function noLiveProcess(pid) {
  try { process.kill(pid, 0); return false; } catch (error) { return error.code === "ESRCH"; }
}

async function cancellationWaitsForOwnedProcessExit(t) {
  const f = await fixture(t);
  const childCode = `import {writeFileSync} from 'node:fs'; writeFileSync(${JSON.stringify(f.marker)},JSON.stringify({pid:process.pid})); process.on('SIGTERM',()=>{}); setInterval(()=>{},1000);`;
  await writeFile(join(f.cliPackage, "lib/bin.js"), childCode);
  const controller = new AbortController();
  const pending = qualifySpecificationReview({ ...f.config, run: true, signal: controller.signal });
  const marker = await waitForMarker(f.marker);
  function cleanupFixtureGroup() { try { process.kill(-marker.pid, "SIGKILL"); } catch {} }
  t.after(cleanupFixtureGroup);
  controller.abort();
  const report = await pending;
  assert.equal(report.checks.client_version.code, "CANCELLED");
  assert.equal(report.next_action, "resume_preflight_after_cancellation");
  assert.equal(report.metrics.schema_probe, null);
  assert.ok(noLiveProcess(marker.pid));
}
test("cancellation waits for owned process exit and prevents later probes", { skip: unsupportedProcessGroups }, cancellationWaitsForOwnedProcessExit);

async function cancelledInvocationStartsNoProcess(t) {
  const f = await fixture(t);
  const controller = new AbortController();
  controller.abort();
  const report = await qualifySpecificationReview({ ...f.config, run: true, signal: controller.signal });
  assert.ok(report.blockers.some((blocker) => blocker.code === "CANCELLED"));
  assert.equal(report.metrics.version_probe, null);
  assert.equal(report.metrics.schema_probe, null);
  await assert.rejects(readFile(f.marker), { code: "ENOENT" });
}
test("an already cancelled invocation starts no process", { skip: unsupportedProcessGroups }, cancelledInvocationStartsNoProcess);

async function exitingProbeCannotLeaveDescendantRunning(t) {
  const f = await fixture(t);
  const descendant = "process.on('SIGTERM',()=>{}); process.send('ready'); setInterval(()=>{},1000);";
  const parent = `import {spawn} from 'node:child_process'; import {writeFileSync} from 'node:fs'; const child=spawn(process.execPath,['--input-type=module','-e',${JSON.stringify(descendant)}],{stdio:['ignore','ignore','ignore','ipc']}); child.once('message',()=>{writeFileSync(${JSON.stringify(f.marker)},JSON.stringify({pid:process.pid,descendant:child.pid}));console.log('0.2.1-rc.3');process.exit(0);});`;
  await writeFile(join(f.cliPackage, "lib/bin.js"), parent);
  const pending = qualifySpecificationReview({ ...f.config, run: true });
  const marker = await waitForMarker(f.marker);
  function cleanupFixtureGroup() { try { process.kill(-marker.pid, "SIGKILL"); } catch {} }
  t.after(cleanupFixtureGroup);
  const report = await pending;
  assert.equal(report.checks.client_version.status, "pass");
  const deadline = Date.now() + 2000;
  let running = true;
  while (Date.now() < deadline) {
    if (noLiveProcess(marker.descendant)) { running = false; break; }
    if (process.platform === "linux") {
      const state = await readFile(`/proc/${marker.descendant}/stat`, "utf8").catch(() => "");
      if (!state || state.slice(state.lastIndexOf(")") + 2).startsWith("Z ")) { running = false; break; }
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(running, false, "The owned descendant must be stopped even when its parent already exited.");
}
test("a normally exiting probe cannot leave its owned descendant running", { skip: unsupportedProcessGroups }, exitingProbeCannotLeaveDescendantRunning);

async function timeoutsReapNoncooperativeChild(t) {
  const f = await fixture(t);
  await writeFile(join(f.cliPackage, "lib/bin.js"), `import {writeFileSync} from 'node:fs'; writeFileSync(${JSON.stringify(f.marker)},JSON.stringify({pid:process.pid})); process.on('SIGTERM',()=>{}); setInterval(()=>{},1000);`);
  const report = await qualifySpecificationReview({ ...f.config, run: true, timeoutMs: 200 });
  assert.equal(report.checks.client_version.code, "TIMEOUT");
  let marker;
  try {
    const markerText = await readFile(f.marker, "utf8");
    marker = JSON.parse(markerText);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (marker) assert.ok(noLiveProcess(marker.pid));
}
test("timeouts reap a noncooperative child", { skip: unsupportedProcessGroups }, timeoutsReapNoncooperativeChild);

async function invalidValidatorControlsPreventPositiveSchemaCheck(t) {
  const f = await fixture(t, { validator: "export function assertObjectJsonSchema() {}" });
  const report = await qualifySpecificationReview({ ...f.config, run: true });
  assert.ok(report.blockers.some((blocker) => blocker.code === "VALIDATOR_CONTROL_FAILED"));
  assert.equal(report.status, "incomplete");
}
test("a native validator that accepts invalid controls cannot certify schema checks", { skip: unsupportedProcessGroups }, invalidValidatorControlsPreventPositiveSchemaCheck);

async function validatorImportFailureDoesNotExposeRawException(t) {
  const f = await fixture(t, { validator: "throw new Error('fixture-only-token /private/fixture/account');" });
  const report = await qualifySpecificationReview({ ...f.config, run: true });
  assert.ok(report.blockers.some((blocker) => blocker.code === "SCHEMA_PROBE_FAILED"));
  assert.equal(report.checks.native_schemas.length, 0);
  const serialized = JSON.stringify(report);
  assert.ok(!serialized.includes("fixture-only-token"));
  assert.ok(!serialized.includes("/private/fixture/account"));
}
test("a validator import failure cannot publish raw exception text", { skip: unsupportedProcessGroups }, validatorImportFailureDoesNotExposeRawException);

async function explicitReportsCannotOverwriteExistingFiles(t) {
  const f = await fixture(t);
  const output = join(f.privateRoot, "report.json");
  const args = [runnerPath, "--run", "--config", f.configPath, "--output", output];
  const result = await runProcess(args);
  assert.equal(result.code, 2);
  const saved = await readFile(output, "utf8");
  const firstMarker = await readFile(f.marker, "utf8");
  assert.equal(JSON.parse(saved).status, "incomplete");
  assert.ok(!saved.includes(f.privateRoot));
  const repeated = await runProcess(args);
  assert.notEqual(repeated.code, 0);
  assert.equal(await readFile(output, "utf8"), saved);
  assert.equal(await readFile(f.marker, "utf8"), firstMarker);
}
test("CLI reports are explicit, redacted and never overwrite existing files", { skip: unsupportedProcessGroups }, explicitReportsCannotOverwriteExistingFiles);

async function reportCreatedDuringProbeIsNotOverwritten(t) {
  const f = await fixture(t);
  const output = join(f.privateRoot, "concurrent-report.json");
  const preserved = "fixture report created after destination validation";
  const childCode = `import {writeFileSync} from 'node:fs'; writeFileSync(${JSON.stringify(output)},${JSON.stringify(preserved)});console.log('0.2.1-rc.3');`;
  await writeFile(join(f.cliPackage, "lib/bin.js"), childCode);
  const result = await runProcess([runnerPath, "--run", "--config", f.configPath, "--output", output]);
  assert.equal(result.code, 1);
  assert.equal(await readFile(output, "utf8"), preserved);
}
test("a report created while probes run retains its original bytes", { skip: unsupportedProcessGroups }, reportCreatedDuringProbeIsNotOverwritten);
