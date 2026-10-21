import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { packetChecklistComplete } from "./checklist.mjs";
const control = ".cache/technical-implementation-planning-precision-v3";
const out = "docs/evidence/technical-implementation-planning-precision-v3";
const state = JSON.parse(await readFile(control + "/control.json", "utf8"));
const id = process.argv[2] ?? "b2-baseline-precision-v3-1";
const run = state.runs.find(run => run.id === id);
assert.equal(run.error, "Authorized packet remains incomplete; the next packet was not started");
const packet = run.packetFiles[run.stages.length - 2];
const todo = await readFile(run.app + "/docs/specs/" + run.fixture + "/tasks/todo.md", "utf8");
const before = todo.split("\n").some(line => /^\s*-\s*\[[xX]\]/.test(line) && line.includes(packet));
const after = packetChecklistComplete(todo, packet);
assert.equal(before, false);
assert.equal(after, true);
const sha = value => createHash("sha256").update(value).digest("hex");
const codeBefore = run.finalFiles;
for (const [path, digest] of Object.entries(codeBefore)) assert.equal(sha(await readFile(run.app + "/" + path)), digest, path);
const startMs = performance.now();
const local = spawnSync("rtk", ["proxy", "npm", "test"], { cwd: run.app, encoding: "utf8", timeout: 60000 });
const oracle = spawnSync("rtk", ["proxy", process.execPath, process.cwd() + "/tests/fixtures/workflow-loop/technical-agreement-oracle.mjs", run.fixture, run.app], { encoding: "utf8", timeout: 60000 });
const endMs = performance.now();
for (const [path, digest] of Object.entries(codeBefore)) assert.equal(sha(await readFile(run.app + "/" + path)), digest, path);
const redact = text => text.replaceAll(state.root, "$TRIAL_ROOT").replaceAll(process.cwd(), "$SOURCE_ROOT");
await writeFile(out + "/matrix/" + id + "/controller-readback.json", JSON.stringify({
  classification: "ACTUAL", attemptId: id, checkedAt: new Date().toISOString(),
  originalStatus: run.status, originalError: run.error, rawResultDigest: sha(await readFile(out + "/matrix/" + id + "/result.json")),
  packet, checklistText: todo, originalGuardAccepted: before, correctedGuardAccepted: after,
  codeUnchangedSinceCapture: true,
  diagnosticVerification: { startMs, endMs, local: { exitCode: local.status, stdout: redact(local.stdout), stderr: redact(local.stderr) }, oracle: { exitCode: oracle.status, stdout: redact(oracle.stdout), stderr: redact(oracle.stderr) } },
  interpretation: "Controller false negative for an explicitly linked single-packet checklist whose every step is completed. Post-run checks are diagnostic only; the original attempt remains incomplete and has no original verification-phase timing. It will be repeated with a new ID."
}, null, 2) + "\n");
assert.equal(local.status, 0);
assert.equal(oracle.status, 0);
console.log(JSON.stringify({ attemptId: id, originalStatusPreserved: run.status, correctedGuardAccepted: after, diagnosticLocal: local.status, diagnosticOracle: oracle.status }));
