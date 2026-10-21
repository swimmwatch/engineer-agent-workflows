import assert from "node:assert/strict";
import { readFile, writeFile, readdir, mkdir, copyFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createHash } from "node:crypto";
const control = ".cache/technical-implementation-planning-precision-v3";
const out = "docs/evidence/technical-implementation-planning-precision-v3";
const state = JSON.parse(await readFile(control + "/control.json", "utf8"));
const sha = value => createHash("sha256").update(value).digest("hex");
const ref = async path => ({ ref: path, digest: sha(await readFile(out + "/" + path)) });
const artifacts = [], attempts = [];
for (const run of state.runs) {
  assert.notEqual(run.status, "running");
  const folder = "matrix/" + run.id;
  const evaluation = JSON.parse(await readFile(out + "/" + folder + "/evaluation.json", "utf8"));
  const diagnosticPath = folder + "/controller-readback.json";
  let diagnostic;
  try { diagnostic = await ref(diagnosticPath); } catch (error) { if (error.code !== "ENOENT") throw error; }
  const qualified = state.qualifiedRunIds.includes(run.id);
  if (!qualified) {
    for (const [path, digest] of Object.entries(run.finalFiles).filter(([path]) => !path.startsWith("docs/"))) {
      const source = run.app + "/" + path;
      assert.equal(sha(await readFile(source)), digest);
      const target = folder + "/final/" + path;
      await mkdir(dirname(out + "/" + target), { recursive: true });
      await copyFile(source, out + "/" + target);
      artifacts.push(await ref(target));
    }
    for (const name of await readdir(out + "/" + folder)) if (name.endsWith(".json") || name.endsWith(".jsonl")) artifacts.push(await ref(folder + "/" + name));
  }
  attempts.push({
    runId: run.id, fixture: run.fixture, variant: run.variant, repetition: run.repetition,
    workflowSourceIdentity: run.workflowSourceDigest, originalControllerStatus: run.status, originalControllerError: run.error ?? null,
    selectedForCompletePairedTimings: qualified, recoveryOf: run.recoveryOf ?? null,
    result: await ref(folder + "/result.json"), independentEvaluation: await ref(folder + "/evaluation.json"),
    modelQualityVerdict: evaluation.verdict?.verdict ?? "incomplete", evaluationError: evaluation.error,
    firstAttemptSuccess: evaluation.verdict?.firstAttemptSuccess ?? null, correctiveCycles: evaluation.verdict?.correctiveCycles ?? null,
    diagnosticReadback: diagnostic ?? null,
    observedModelPhaseMs: run.stages.reduce((total, stage) => total + stage.endMs - stage.startMs, 0),
    fullElapsedMs: run.verification ? run.verification.endMs - run.stages[0].startMs : null,
    phases: run.stages.map(stage => ({ stage: stage.stage, stageId: stage.stageId, sessionId: stage.sessionId, elapsedMs: stage.endMs - stage.startMs }))
  });
}
await writeFile(out + "/attempts.json", JSON.stringify({
  classification: "ACTUAL", checkedAt: new Date().toISOString(),
  originalOrder: state.schedule.map(run => run.id), correctiveOrder: state.recoverySchedule.map(run => run.id),
  selectedForPairedTimings: state.qualifiedRunIds,
  attemptCount: attempts.length, attempts, artifacts,
  interpretation: "Original alternating attempts remain unchanged and visible. Proven controller-format false negatives lack an original verification phase and are excluded only from complete paired timing summaries. Fresh corrective attempts follow the original matrix; their order is a timing limitation. Original model-phase durations and independent quality verdicts remain reported; a corrective success never relabels an original attempt."
}, null, 2) + "\n");
console.log(JSON.stringify({ attempts: attempts.length, selectedForPairedTimings: state.qualifiedRunIds.length, preservedNonselected: attempts.filter(attempt => !attempt.selectedForCompletePairedTimings).length }));
