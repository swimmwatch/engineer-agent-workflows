import assert from "node:assert/strict";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const control = ".cache/technical-implementation-planning-precision-v3";
const out = "docs/evidence/technical-implementation-planning-precision-v3";
const state = JSON.parse(await readFile(control + "/control.json", "utf8"));
const entries = [], ids = new Set();
const sha = value => createHash("sha256").update(value).digest("hex");
async function check(folder, document, role) {
  const value = JSON.parse(await readFile(out + "/" + folder + "/" + document + ".json", "utf8"));
  assert.equal(value.terminal, "completed");
  assert.equal(value.error, null);
  assert.equal(role === "review" ? value.actualModel : value.reportedModel, state.model);
  assert.ok(value.sessionId && !ids.has(value.sessionId), folder + " context reused");
  ids.add(value.sessionId);
  const path = folder + "/" + document + ".jsonl", bytes = await readFile(out + "/" + path);
  const records = bytes.toString("utf8").trim().split("\n").map(JSON.parse);
  const starts = records.filter(record => record.direction === "send" && record.message.method === "thread/start");
  assert.equal(starts.length, 1);
  assert.equal(starts[0].message.params.ephemeral, true);
  assert.equal(starts[0].message.params.model, state.model);
  const response = records.find(record => record.direction === "receive" && record.message.id === starts[0].message.id && record.message.result);
  assert.equal(response.message.result.thread.id, value.sessionId);
  assert.equal(response.message.result.model, state.model);
  assert.equal(response.message.result.sandbox.type, role === "review" ? "readOnly" : "workspaceWrite");
  const turns = records.filter(record => record.direction === "send" && record.message.method === "turn/start");
  assert.equal(turns.length, 1);
  assert.equal(turns[0].message.params.effort, state.effort);
  assert.equal(turns[0].message.params.threadId, value.sessionId);
  assert.ok(!records.some(record => record.message.method === "thread/resume"));
  assert.ok(records.some(record => record.message.method === "turn/completed" && record.message.params.turn.status === "completed"));
  entries.push({ folder, document, role, sessionId: value.sessionId, actualModel: state.model, requestedEffort: state.effort, ephemeral: true, sandbox: response.message.result.sandbox.type, rawCapture: { ref: path, digest: sha(bytes) } });
}
for (const run of state.runs) {
  const folder = "matrix/" + run.id;
  for (const stage of run.stages) await check(folder, stage.stageId, stage.stage);
  await check(folder, "evaluation", "review");
}
for (const id of ["q3-partial-resume", "q4-shared-drift", "q5-execution-boundaries", "q6-behavior-routing"]) {
  const folder = "focused/" + id;
  for (const name of await readdir(out + "/" + folder)) {
    if (!name.endsWith(".json")) continue;
    const value = JSON.parse(await readFile(out + "/" + folder + "/" + name, "utf8"));
    if (value.stage && value.stageId && value.sessionId) await check(folder, name.slice(0, -5), value.stage);
  }
  await check(folder, "evaluation", "review");
}
assert.equal(entries.length, 43);
assert.equal(entries.filter(entry => entry.role === "review").length, 13);
await writeFile(out + "/context-separation.json", JSON.stringify({ classification: "ACTUAL", checkedAt: new Date().toISOString(), status: "passed", contexts: entries.length, independentReviews: 13, allSessionIdsUnique: true, actualModel: state.model, requestedEffort: state.effort, entries }, null, 2) + "\n");
console.log(JSON.stringify({ status: "passed", contexts: entries.length, independentReviews: 13, allSessionIdsUnique: true }));
