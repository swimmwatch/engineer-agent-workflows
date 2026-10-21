import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
const control = ".cache/technical-implementation-planning-precision-v3";
const out = "docs/evidence/technical-implementation-planning-precision-v3";
const state = JSON.parse(await readFile(control + "/control.json", "utf8"));
assert.ok(state.runs.every(run => run.status !== "running"));
const sha = value => createHash("sha256").update(value).digest("hex");
const redact = value => typeof value === "string" ? value.replaceAll(state.root, "$TRIAL_ROOT").replaceAll(process.cwd(), "$SOURCE_ROOT").replaceAll(homedir(), "$USER_HOME") : Array.isArray(value) ? value.map(redact) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).filter(([key]) => !/(access.?token|refresh.?token|id.?token|password|secret|email|accountId|authorization|encrypted_content)/i.test(key)).map(([key, value]) => [key, redact(value)])) : value;
const sources = [], captures = [];
for (const [variant, source] of Object.entries(state.sources)) {
  for (const [path, digest] of Object.entries(source.manifest.files)) assert.equal(sha(await readFile(source.path + "/" + path)), digest, variant + "/" + path);
  sources.push({ variant, sourceDigest: source.digest, fileCount: Object.keys(source.manifest.files).length, changed: [] });
}
for (const run of state.runs) {
  const folder = "matrix/" + run.id, resultPath = folder + "/result.json";
  const resultBytes = await readFile(out + "/" + resultPath), result = JSON.parse(resultBytes);
  assert.deepEqual(result, redact(run), run.id + " raw capture differs from private state");
  assert.equal(result.workflowSourceDigest, state.sources[run.sourceKey ?? run.variant].digest);
  for (const stage of result.stages) {
    assert.equal(stage.terminal, "completed");
    assert.equal(stage.error, null);
    assert.equal(stage.reportedModel, state.model);
    assert.deepEqual(JSON.parse(await readFile(out + "/" + folder + "/" + stage.stageId + ".json", "utf8")), stage);
    const records = (await readFile(out + "/" + folder + "/" + stage.stageId + ".jsonl", "utf8")).trim().split("\n").map(JSON.parse);
    const turn = records.find(record => record.direction === "send" && record.message.method === "turn/start");
    assert.equal(turn.message.params.effort, state.effort);
    assert.equal(turn.message.params.model, state.model);
    assert.equal(turn.message.params.threadId, stage.sessionId);
    assert.ok(records.some(record => record.message.method === "turn/completed" && record.message.params.turn.status === "completed"));
  }
  for (const [path, digest] of Object.entries(run.finalFiles)) assert.equal(sha(await readFile(run.app + "/" + path)), digest, run.id + "/" + path);
  if (state.qualifiedRunIds.includes(run.id)) {
    assert.equal(run.status, "product-checks-passed");
    assert.equal(result.verification.local.exitCode, 0);
    assert.equal(result.verification.oracle.exitCode, 0);
  }
  captures.push({ runId: run.id, controllerStatus: run.status, stageCount: result.stages.length, allActualTurnsCompleted: true, model: state.model, effort: state.effort, result: { ref: resultPath, digest: sha(resultBytes) }, finalBytesPreserved: true });
}
await writeFile(out + "/capture-integrity.json", JSON.stringify({
  classification: "ACTUAL", checkedAt: new Date().toISOString(), status: "passed", sources, captures,
  originalCollectorWrapper: { observedExitCode: 143, scheduledCapturesPersisted: 8, completedModelStages: true, cause: null, note: "Nonzero wrapper exit is retained as an unexplained collection-process limitation, not relabeled successful or used as a model verdict. Each persisted model turn and final file was independently checked above." }
}, null, 2) + "\n");
console.log(JSON.stringify({ status: "passed", attempts: captures.length, sources: sources.length, allActualTurnsAndFinalBytesVerified: true }));
