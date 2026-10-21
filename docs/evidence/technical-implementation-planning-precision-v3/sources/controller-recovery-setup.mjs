import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, cp, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { connect, reviewFrozen } from "./mcp.mjs";
import { packetChecklistComplete } from "./checklist.mjs";
const control = ".cache/technical-implementation-planning-precision-v3";
const out = "docs/evidence/technical-implementation-planning-precision-v3";
const state = JSON.parse(await readFile(control + "/control.json", "utf8"));
assert.equal(state.runs.length, 8, "Finish the original matrix before declaring recovery");
assert.ok(state.runs.every(run => run.status !== "running"));
const sha = value => createHash("sha256").update(value).digest("hex");
const ref = async path => ({ ref: path, digest: sha(await readFile(out + "/" + path)) });
const save = async (path, value) => { await mkdir(dirname(path), { recursive: true }); await writeFile(path, JSON.stringify(value, null, 2) + "\n"); };
const replacements = [], excluded = [];
state.qualifiedRunIds = [];
state.recoverySchedule = [];
for (const original of state.schedule) {
  const result = state.runs.find(run => run.id === original.id);
  if (result.status === "product-checks-passed") {
    state.qualifiedRunIds.push(original.id);
    continue;
  }
  assert.equal(result.error, "Authorized packet remains incomplete; the next packet was not started", "Unclassified failure requires investigation");
  const packet = result.packetFiles[result.stages.length - 2];
  assert.equal(packetChecklistComplete(await readFile(result.app + "/docs/specs/" + result.fixture + "/tasks/todo.md", "utf8"), packet), true);
  const diagnostic = JSON.parse(await readFile(out + "/matrix/" + result.id + "/controller-readback.json", "utf8"));
  assert.equal(diagnostic.diagnosticVerification.local.exitCode, 0);
  assert.equal(diagnostic.diagnosticVerification.oracle.exitCode, 0);
  const id = result.fixture + "-" + result.variant + "-precision-v3-checklist-r1-" + result.repetition;
  const app = join(state.root, "runs", id, "app");
  await mkdir(dirname(app), { recursive: true });
  await cp(state.preparedFixtures[result.fixture].path, app, { recursive: true, errorOnExist: true, force: false });
  for (const name of [".tmp", ".mcp-home", ".product-store"]) await rm(join(app, name), { recursive: true, force: true });
  const setupTrace = [], mcp = await connect(state.sources.baseline.path, app, event => setupTrace.push(event));
  let prepared;
  try {
    await mcp.call("specification_open", { project: app, specification: result.fixture });
    prepared = await reviewFrozen(mcp);
    assert.equal(prepared.status, "pass");
  } finally { await mcp.client.close(); }
  for (const args of [["init", "--quiet", "-b", "trial"], ["add", "."]]) assert.equal(spawnSync("rtk", ["proxy", "git", ...args], { cwd: app }).status, 0);
  const recovery = { id, fixture: result.fixture, variant: result.variant, repetition: result.repetition, app, prepared, setupTrace, matrix: "precision-v3-checklist-repair", recoveryOf: result.id };
  state.recoverySchedule.push(recovery);
  state.qualifiedRunIds.push(id);
  replacements.push({ originalId: result.id, recoveryId: id, reason: "Proven controller checklist-format false negative; original attempt remains incomplete and separately reported" });
  excluded.push({ runId: result.id, status: result.status, rawResult: await ref("matrix/" + result.id + "/result.json"), diagnostic: await ref("matrix/" + result.id + "/controller-readback.json") });
}
assert.ok(replacements.length > 0);
state.excludedControllerAttempts = excluded;
const originalFrozen = JSON.parse(await readFile(out + "/frozen-inputs.json", "utf8"));
const frozen = { ...originalFrozen, revision: "exact-integer-precision-v3-checklist-repair", parentFrozenInput: await ref("frozen-inputs.json"), recoveryDeclaredAt: new Date().toISOString(), sourceAndFixtureFreeze: "Unchanged from original pre-matrix freeze", qualificationSelection: state.qualifiedRunIds, originalAttempts: state.schedule.map(run => run.id), replacements, recoveryOrder: state.recoverySchedule.map(({ id, fixture, variant, repetition }) => ({ id, fixture, variant, repetition })), controllerDigests: {} };
for (const name of ["run.mjs", "checklist.mjs", "checklist.test.mjs"]) frozen.controllerDigests[name] = sha(await readFile(control + "/" + name));
await save(out + "/recovery-inputs.json", frozen);
await save(out + "/sources/comparison-recovery.json", { classification: "ACTUAL", kind: "immutable-comparison-input-manifest", frozenInput: await ref("recovery-inputs.json"), sources: { baseline: await ref("sources/baseline.json"), candidate: await ref("sources/candidate.json") }, sourceIdentities: originalFrozen.sourceDigests, parentComparison: await ref("sources/comparison.json") });
await writeFile(control + "/control.json", JSON.stringify(state, null, 2) + "\n", { mode: 0o600 });
console.log(JSON.stringify({ recoveryDeclared: replacements, originalAttemptsPreserved: true }));
