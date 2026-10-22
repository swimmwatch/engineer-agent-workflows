import assert from "node:assert/strict";
import test from "node:test";
import { auditStartup } from "./audit-startup.mjs";
import { observeInvocations } from "./capture.mjs";
import { evaluateWorkflowEfficiency } from "../../../../tests/lib/workflow-efficiency.mjs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

const fixture = { app: "/fixture", state: { source_version: "source", specification_version: "spec", review_ref: "review" },
  agreement: { agreement_ref: { id: "answer", revision: 2 }, proposal_digest: "proposal" } };
const sources = [{ id: "instructions", owner: "skill", version: "digest", revision: 1, selection: "whole", portions: 1 }];
const check = (tool, at) => ({ id: tool, type: "mcpToolCall", tool, startedAtMs: at, completedAtMs: at + 10,
  arguments: { expected_source_version: "source", packet_id: "p1", agreement_ref: fixture.agreement.agreement_ref, expected_proposal_digest: "proposal" },
  result: { result: { ...fixture.state, ...fixture.agreement, status: tool === "planning_packet_check" ? "ready" : "pass" } } });
const root = { turnId: "root", invokedAtMs: 0, completedAtMs: 100, issues: [], items: [
  check("specification_check_state", 10), check("planning_packet_check", 20),
  { id: "edit", type: "fileChange", startedAtMs: 40, completedAtMs: 50, changes: [{ path: "/fixture/src/parse.mjs" }] },
] };

test("an attachment reference alone does not prove full skill delivery", () => {
  const result = auditStartup({ invocations: [root], fixture, sources, independent: {},
    delivery: { passthroughVerified: true, texts: { instructions: "exact instructions" }, skillAttachment: "instructions" } });
  assert.equal(result.observed.events.filter(event => event.kind === "delivery").length, 0);
  const verified = auditStartup({ invocations: [root], fixture, sources, independent: {},
    delivery: { passthroughVerified: true, texts: { instructions: "exact instructions" },
      skillAttachment: "instructions", attachmentVerified: true } });
  assert.equal(verified.observed.events.filter(event => event.kind === "delivery").length, 1);
});

test("native output alone cannot certify model receipt; gate results keep their own time", () => {
  const result = auditStartup({ invocations: [root], fixture, sources, independent: { localExit: 0, oracleExit: 0 } });
  assert.equal(result.observed.events.filter(event => event.kind === "delivery").length, 0);
  assert.equal(result.metrics.entryReadyAtMs, 30);
  assert.equal(result.metrics.firstEditAtMs, 40);
  assert.ok(result.expected.actions[0].sources.includes("instructions"));
});

test("a child gate and a stale pin cannot satisfy the root entry", () => {
  const bad = structuredClone(root);
  bad.items[0].arguments.expected_source_version = "old";
  const child = { ...root, turnId: "child", origin: "native-child", rootTurnId: "root" };
  const result = auditStartup({ invocations: [bad, child], fixture, sources, independent: { localExit: 0, oracleExit: 0 } });
  assert.equal(result.metrics.entryReadyAtMs, null);
  assert.equal(result.observed.events.filter(event => event.purpose?.endsWith(":readiness")).length, 2);
  assert.equal(result.observed.events.find(event => event.owner === "specification_check_state").result, "fail");
});

test("gate requests without results and failed independent checks cannot become completion", () => {
  const incomplete = structuredClone(root);
  incomplete.items[1].completedAtMs = null;
  const result = auditStartup({ invocations: [incomplete], fixture, sources, independent: { localExit: 1, oracleExit: 0 } });
  assert.equal(result.metrics.entryReadyAtMs, null);
  assert.equal(result.observed.events.some(event => event.action === "complete"), false);
});

test("successful unit tests cannot substitute for the packet checklist or a required check", () => {
  for (const independent of [
    { localExit: 0, oracleExit: 0, requiredExit: 0, packetCompleted: false },
    { localExit: 0, oracleExit: 0, requiredExit: 1, packetCompleted: true },
    { localExit: 0, oracleExit: 0, requiredExit: 0, packetCompleted: true, error: "Cleanup failed" },
  ]) {
    const result = auditStartup({ invocations: [root], fixture, sources, independent });
    assert.equal(result.observed.events.some(event => event.action === "complete"), false);
  }
});

test("controlled passthrough accepts exact whole source returns only", () => {
  const capture = structuredClone(root);
  capture.items.unshift({ id: "read", type: "commandExecution", startedAtMs: 2, completedAtMs: 3,
    command: "cat instructions.md", output: "before\nexact instructions\nafter", exitCode: 0 });
  const evidence = { passthroughVerified: true, texts: { instructions: "exact instructions\n" } };
  const good = auditStartup({ invocations: [capture], fixture, sources, independent: {}, delivery: evidence });
  assert.equal(good.observed.events.filter(event => event.kind === "delivery").length, 1);
  evidence.texts.instructions += "missing portion";
  const incomplete = auditStartup({ invocations: [capture], fixture, sources, independent: {}, delivery: evidence });
  assert.equal(incomplete.observed.events.filter(event => event.kind === "delivery").length, 0);
});

test("line-numbered code exploration counts as useful work before a native start", () => {
  const capture = structuredClone(root);
  capture.items.unshift({ id: "code-read", type: "commandExecution", startedAtMs: 3, completedAtMs: 4,
    command: "nl -ba src/parse.mjs\nnl -ba test/baseline.test.mjs", output: "code", exitCode: 0 });
  const result = auditStartup({ invocations: [capture], fixture, sources, independent: {} });
  assert.equal(result.metrics.firstExplorationAtMs, 3);
});

const successful = { localExit: 0, oracleExit: 0, requiredExit: 0, packetCompleted: true };
function completedCapture() {
  const capture = structuredClone(root);
  capture.items.push(...["specification_check_state", "planning_packet_check"].map((tool, index) => ({
    ...check(tool, 60 + index * 10), id: `final-${tool}`,
  })));
  return capture;
}
async function findings(t, capture) {
  const result = auditStartup({ invocations: [capture], fixture, sources: [], independent: successful });
  const dir = await mkdtemp(join(tmpdir(), "wfe-startup-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const refs = {};
  for (const [key, data] of [["trace", result.observed], ["outcomes", result.expected]]) {
    const bytes = JSON.stringify(data), ref = `${key}.json`;
    await writeFile(join(dir, ref), bytes);
    refs[key] = { ref, digest: createHash("sha256").update(bytes).digest("hex") };
  }
  return evaluateWorkflowEfficiency({ root: dir, ...refs });
}

test("invalid native intervals cannot certify startup even with passing final state", async t => {
  const capture = completedCapture();
  const records = [
    { atMs: 0, direction: "send", message: { id: 1, method: "turn/start", params: { threadId: "thread" } } },
    { atMs: 1, direction: "receive", message: { id: 1, result: { turn: { id: "root" } } } },
  ];
  for (const item of capture.items) for (const phase of ["started", "completed"]) {
    const atMs = item.id === "specification_check_state" ? -20 + (phase === "completed" ? 10 : 0) : item[`${phase}AtMs`];
    records.push({ atMs, direction: "receive", message: { method: `item/${phase}`, params: {
      threadId: "thread", turnId: "root", item,
    } } });
  }
  records.push({ atMs: 100, direction: "receive", message: { method: "turn/completed",
    params: { threadId: "thread", turn: { id: "root", status: "completed" } } } });
  const observed = observeInvocations(records)[0];
  assert.ok(observed.issues.includes("invalid-item-interval"));
  assert.notDeepEqual(await findings(t, observed), []);
  assert.deepEqual(await findings(t, completedCapture()), []);
});

for (const lateItem of [
  { id: "late-edit", type: "fileChange", changes: [{ path: "/fixture/src/parse.mjs" }] },
  { id: "late-test", type: "commandExecution", command: "node --test", exitCode: 0 },
  { id: "late-prove", type: "commandExecution", command: "node --input-type=module <<'NODE'\nrestore();\nNODE", exitCode: 0 },
  { id: "late-restore", type: "commandExecution", command: "cp /tmp/original.mjs src/parse.mjs", exitCode: 0 },
]) test(`${lateItem.id} after final gates invalidates completion`, async t => {
  const capture = completedCapture();
  capture.items.push({ ...lateItem, startedAtMs: 85, completedAtMs: 90 });
  assert.ok((await findings(t, capture)).some(item => item.code === "missing-owning-validation"));
  capture.items.at(-1).startedAtMs = 51;
  capture.items.at(-1).completedAtMs = 59;
  assert.deepEqual(await findings(t, capture), []);
});

test("a final gate requested before a check finishes is premature", async t => {
  const capture = completedCapture();
  capture.items.push({ id: "overlap", type: "commandExecution", command: "node --test", startedAtMs: 55, completedAtMs: 65 });
  assert.ok((await findings(t, capture)).some(item => item.code === "missing-owning-validation"));
});

test("repeating premature gates after restoration does not erase their failure", async t => {
  const capture = completedCapture();
  capture.completedAtMs = 150;
  capture.items.push({ id: "prove", type: "commandExecution", command: "node --test", startedAtMs: 85, completedAtMs: 90 },
    ...["specification_check_state", "planning_packet_check"].map((tool, index) => ({
      ...check(tool, 100 + index * 10), id: `retry-${tool}`,
    })));
  const issues = await findings(t, capture);
  assert.ok(issues.some(item => item.code === "missing-owning-validation"));
  assert.ok(issues.some(item => item.code === "redundant-check"));
});

test("handoff writes and read-back do not reopen implementation readiness", async t => {
  const capture = completedCapture();
  capture.items.push({ id: "handoff", type: "fileChange", startedAtMs: 85, completedAtMs: 90,
    changes: [{ path: "/fixture/tasks/handoff.md" }] },
  { id: "readback", type: "commandExecution", startedAtMs: 91, completedAtMs: 92, command: "git diff --check\nwc -w tasks/handoff.md" });
  assert.deepEqual(await findings(t, capture), []);
});

test("reviewed read-only snapshot is exact; altered executable input is not exempt", async t => {
  const command = "/bin/bash -lc \"node --input-type=module <<'NODE'\nimport { readdirSync, lstatSync, readFileSync, readlinkSync } from 'node:fs';\nimport { createHash } from 'node:crypto';\nconst snapshot = {};\nfunction walk(dir) {\n  for (const entry of readdirSync(dir, { withFileTypes: true })) {\n    const path = dir === '.' ? entry.name : \"'`${dir}/${entry.name}`;\n    if (/''^docs'\"\\\\/specs\\\\/[\"'^/]+'\"\\\\/(manifest|decisions)\\\\.yaml\"'$/.test(path) || path === '\"'design/system/catalog.yaml' || /\"'^design'\"\\\\/specs\\\\/[\"'^/]+'\"\\\\/experience\\\\.yaml\"'$/.test(path)) continue;\n    const stat = lstatSync(path);\n    if (stat.isDirectory()) walk(path);\n    else if (stat.isSymbolicLink()) snapshot[path] = { link: readlinkSync(path), mode: stat.mode };\n    else if (stat.isFile()) snapshot[path] = { sha256: createHash('\"'sha256').update(readFileSync(path)).digest('hex'), mode: stat.mode };\n  }\n}\nwalk('.');\nprocess.stdout.write(JSON.stringify(snapshot));\nNODE\"";
  const capture = completedCapture();
  capture.items.push({ id: "snapshot", type: "commandExecution", command, startedAtMs: 85, completedAtMs: 90 });
  assert.deepEqual(await findings(t, capture), []);
  capture.items.at(-1).command += "\nnode --test";
  assert.ok((await findings(t, capture)).some(item => item.code === "missing-owning-validation"));
});
