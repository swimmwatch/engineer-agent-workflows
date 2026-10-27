import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createHash } from "node:crypto";
import { projectRoot, makeTempTree } from "./lib/fixtures.mjs";
import { verifyEngineeringManual } from "../shared/scripts/verify-engineering-manual.mjs";
import { evaluateWorkflowEfficiency } from "./lib/workflow-efficiency.mjs";
import { renderHostTemplate } from "../scripts/lib/distribution.mjs";

const sha = value => createHash("sha256").update(value).digest("hex");
const read = relative => fs.readFile(path.join(projectRoot, relative), "utf8");

test("completion readiness waits for local checks and restored PROVE mutations", async () => {
  const context = await read("shared/references/implementation-context.md");
  assert.match(context, /Finish all required local checks and restore PROVE mutations before final/);
  assert.match(context, /Do not run a preliminary completion gate while tests or mutations/);
});

test("ordinary implementation loads the unknown-content-loss stop before editing", async () => {
  const context = await read("shared/references/implementation-context.md");
  assert.match(context, /Unexplained deletion or loss of protected content blocks edits and completion/);
  assert.match(context, /even when already present at entry/);
  assert.match(context, /do not accept it as a new baseline or restore another writer's files/);
});

test("incomplete-output recovery is available before the first mandatory reference", async () => {
  const entry = await read("skills/incremental-implementation/SKILL.md");
  const rule = "Do not reread supplied SKILL.md or references; retrieve gaps or stop; never rerender.";
  assert.ok(entry.includes(rule));
  assert.ok(entry.indexOf(rule) < entry.indexOf("2. Read `shared/references/workflow-state-access.md`"));
  assert.ok(Buffer.byteLength(entry) <= 4096);
});

test("moved obligations remain exact and ordinary startup reads fewer instruction bytes", async () => {
  const mapping = JSON.parse(await read("tests/fixtures/workflow-loop/obligations.json"));
  for (const obligation of mapping.obligations) {
    const text = await read(obligation.target);
    const start = text.indexOf(obligation.start);
    assert.ok(start >= 0, obligation.id);
    assert.equal(sha(text.slice(start, start + obligation.characters)), obligation.sha256, obligation.id);
  }
  const candidatePaths = ["skills/incremental-implementation/SKILL.md", "shared/references/workflow-state-access.md",
    "shared/references/implementation-context.md", "shared/references/engineering-principles.md", "shared/references/test-discipline.md"];
  const candidate = (await Promise.all(candidatePaths.map(read))).reduce((sum, source) => sum + Buffer.byteLength(source), 0);
  const baseline = Object.entries(mapping.baselineBytes).filter(([name]) => !name.endsWith("product-workflow.md")).reduce((sum, [, bytes]) => sum + bytes, 0);
  assert.ok(candidate < baseline, `${candidate} must be less than ${baseline}`);
  for (const [host, root] of [["codex", "plugins/codex/engineer-agent-workflows"], ["claude-code", "plugins/claude-code/engineer-agent-workflows"], ["deepseek-harness", "exports/deepseek-harness"]]) {
    for (const name of ["workflow-state-access", "implementation-context"]) {
      const relative = `shared/references/${name}.md`;
      assert.equal(await read(`${root}/skills/incremental-implementation/${relative}`), renderHostTemplate(await read(relative), host, relative).toString());
    }
  }
});

test("incremental entry loads execution obligations without authoring references", async () => {
  const entry = await read("skills/incremental-implementation/SKILL.md");
  assert.match(entry, /shared\/references\/workflow-state-access\.md/);
  assert.match(entry, /shared\/references\/implementation-context\.md/);
  assert.doesNotMatch(entry, /yaml-contracts\.md|task-packets\.md|product-workflow\.md/);
  assert.equal(entry.match(/specification_check_state/g)?.length, 2);
  assert.equal(entry.match(/planning_packet_check/g)?.length, 2);
});

for (const resource of ["workflow-state-access", "implementation-context"]) {
  test(`missing execution resource ${resource} blocks the complete bundle`, async t => {
    const root = await makeTempTree(t);
    const skills = path.join(root, "skills");
    for (const name of ["spec-driven-development", "planning-and-task-breakdown", "incremental-implementation"]) {
      await fs.cp(path.join(projectRoot, "skills", name), path.join(skills, name), { recursive: true });
    }
    const incremental = path.join(skills, "incremental-implementation");
    await fs.rm(path.join(incremental, "shared/references", `${resource}.md`), { force: true });
    await assert.rejects(verifyEngineeringManual(incremental), { code: "E_WORKFLOW_CONTEXT_FILE" });
  });
}

test("captured negative source delivery cannot pass the efficiency evaluator", async t => {
  const trace = { events: [
    { id: "d1", kind: "delivery", actor: "author", context: "turn", source: "requirement-v1", portion: 0, total: 1, complete: true, bytes: 10 },
    { id: "d2", kind: "delivery", actor: "author", context: "turn", source: "requirement-v1", portion: 0, total: 1, complete: true, bytes: 10 },
  ] };
  const outcomes = { sources: [{ id: "requirement-v1", owner: "fixture", version: "v1", revision: 1, selection: "R1", portions: 1 }], actions: [], triggers: [], changes: [] };
  const root = await makeTempTree(t, { "trace.json": JSON.stringify(trace), "outcomes.json": JSON.stringify(outcomes) });
  const findings = await evaluateWorkflowEfficiency({ root, trace: { ref: "trace.json", digest: sha(JSON.stringify(trace)) }, outcomes: { ref: "outcomes.json", digest: sha(JSON.stringify(outcomes)) } });
  assert.ok(findings.some(item => item.code === "redundant-delivery"));
});

async function scenario(t, change = () => {}) {
  const trace = JSON.parse(await read("tests/fixtures/workflow-loop/efficiency-observations.json"));
  const outcomes = JSON.parse(await read("tests/fixtures/workflow-loop/efficiency-outcomes.json"));
  change(trace, outcomes);
  const observed = JSON.stringify(trace), expected = JSON.stringify(outcomes);
  const root = await makeTempTree(t, { "trace.json": observed, "outcomes.json": expected });
  return evaluateWorkflowEfficiency({ root, trace: { ref: "trace.json", digest: sha(observed) },
    outcomes: { ref: "outcomes.json", digest: sha(expected) } });
}

test("synthetic normal capture preserves all four gates, exact reuse and inspected changes", async t => {
  assert.deepEqual(await scenario(t), []);
});

const negatives = [
  ["duplicate source", "redundant-delivery", trace => trace.events.splice(6, 0, { ...trace.events[3], id: "duplicate" })],
  ["missing source portion", "missing-source-portion", trace => { trace.events = trace.events.filter(event => event.id !== "read-requirement"); }],
  ["missing instruction", "missing-source-portion", trace => { trace.events = trace.events.filter(event => event.id !== "read-execution"); }],
  ["incomplete receipt", "missing-complete-receipt", trace => { trace.events.find(event => event.id === "read-requirement").receipt = null; }],
  ["suppressed owning validation", "missing-owning-validation", trace => { trace.events = trace.events.filter(event => event.id !== "entry-agreement"); }],
  ["missing completion validation", "missing-owning-validation", trace => { trace.events = trace.events.filter(event => event.id !== "completion-specification"); }],
  ["missing post-mutation read-back", "missing-owning-validation", trace => { trace.events = trace.events.filter(event => event.id !== "completion-read-back"); }],
  ["duplicate check", "redundant-check", trace => trace.events.splice(9, 0, { ...trace.events[6], id: "duplicate-check" })],
  ["changed validation inputs", "missing-owning-validation", (_trace, outcomes) => { outcomes.actions[0].checks[0].input = "changed-source"; }],
  ["lost exact text", "invalid-source-reuse", trace => trace.events.splice(8, 0, { id: "lost", kind: "forget", actor: "implementer", context: "cold", source: "requirement" })],
  ["independent actor reuses unseen text", "invalid-source-reuse", trace => { trace.events.find(event => event.id === "reuse-source").actor = "independent"; }],
  ["resume without synchronization", "missing-recovery-sync", trace => trace.events.splice(10, 0, { id: "resume", kind: "disruption", actor: "implementer", context: "cold" })],
  ["accepted overlap", "unsafe-preservation", (_trace, outcomes) => { outcomes.changes[2].overlap = true; }],
  ["accepted content loss", "unsafe-preservation", (_trace, outcomes) => { outcomes.changes[0].protectedLoss = true; }],
  ["unexplained native transition", "unsafe-preservation", (_trace, outcomes) => { outcomes.changes[0].after = "unknown"; }],
  ["uninspected external edit", "unsafe-preservation", trace => { trace.events.find(event => event.id === "preserve-external").inspected = false; }],
  ["late prerequisite", "late-prerequisite", trace => { trace.events.find(event => event.id === "pre-runner").result = "missing"; }],
  ["unnecessary approval", "reopened-readiness", trace => trace.events.splice(10, 0, { id: "ask-again", kind: "approval", actor: "implementer", context: "cold" })],
  ["inapplicable instruction", "inapplicable-instruction", (_trace, outcomes) => { outcomes.sources[0].trigger = "design-authoring"; }],
];
for (const [name, code, change] of negatives) {
  test(`synthetic evaluator rejects ${name}`, async t => {
    const findings = await scenario(t, change);
    assert.ok(findings.some(finding => finding.code === code), JSON.stringify(findings));
  });
}

test("fresh synchronization, source delivery and owning validation permit resume", async t => {
  assert.deepEqual(await scenario(t, trace => trace.events.splice(3, 0,
    { id: "resume", kind: "disruption", actor: "implementer", context: "cold" },
    { id: "sync", kind: "sync", actor: "implementer", context: "cold", operation: "task_inputs_check", result: "pass" })), []);
});

test("lost text permits fresh exact delivery; another actor must consume its own source", async t => {
  assert.deepEqual(await scenario(t, trace => {
    const original = trace.events.find(event => event.id === "read-requirement");
    trace.events.splice(8, 0,
      { id: "lost", kind: "forget", actor: "implementer", context: "cold", source: "requirement" },
      { ...original, id: "fresh" },
      { ...original, id: "independent", actor: "reviewer", bulk: false });
    trace.events.find(event => event.id === "reuse-source").delivery = "fresh";
  }), []);
});

test("changed source identity requires and permits a new delivery", async t => {
  assert.deepEqual(await scenario(t, (trace, outcomes) => {
    outcomes.sources.push({ ...outcomes.sources[2], id: "requirement-v2", version: "v2" });
    outcomes.actions[1].sources = ["requirement-v2"];
    trace.events.splice(-1, 0, { ...trace.events.find(event => event.id === "read-requirement"), id: "read-v2", source: "requirement-v2" });
  }), []);
});

test("unavailable prerequisite or exact delivery blocks dependent actions without bulk retries", async t => {
  assert.deepEqual(await scenario(t, (trace, outcomes) => {
    trace.events = trace.events.slice(0, 3);
    trace.events[2].result = "missing";
    outcomes.changes = [];
    for (const action of outcomes.actions) {
      action.blocked = true;
      trace.events.push({ id: `blocked-${action.id}`, kind: "blocked", actor: action.actor, context: action.context, action: action.id });
    }
  }), []);
});

test("all portions are required even when the final receipt is complete", async t => {
  const partial = (trace, outcomes) => {
    outcomes.sources[2].portions = 2;
    const item = trace.events.find(event => event.id === "read-requirement");
    item.total = 2; item.portion = 1;
  };
  assert.ok((await scenario(t, partial)).some(item => item.code === "missing-source-portion"));
  assert.deepEqual(await scenario(t, (trace, outcomes) => {
    partial(trace, outcomes);
    const last = trace.events.find(event => event.id === "read-requirement");
    trace.events.splice(trace.events.indexOf(last), 0, { ...last, id: "first-portion", portion: 0, complete: false, receipt: null });
  }), []);
});

test("unavailable exact delivery stops work without an alternate rendering loop", async t => {
  const block = (trace, outcomes) => {
    outcomes.changes = [];
    trace.events = trace.events.filter(event => event.kind === "prerequisite" || event.kind === "validation");
    trace.events.push({ id: "retrieve", kind: "retrieval", actor: "implementer", context: "cold",
      source: "requirement", operation: "continuation", result: "unavailable" });
    for (const action of outcomes.actions) {
      action.blocked = true;
      action.retrievals = [{ source: "requirement", operation: "continuation", result: "unavailable" }];
      trace.events.push({ id: `blocked-${action.id}`, kind: "blocked", actor: action.actor, context: action.context, action: action.id });
    }
  };
  assert.deepEqual(await scenario(t, block), []);
  assert.ok((await scenario(t, (trace, outcomes) => {
    block(trace, outcomes);
    trace.events = trace.events.filter(event => event.kind !== "retrieval");
  })).some(item => item.code === "missing-supported-retrieval"));
  assert.ok((await scenario(t, (trace, outcomes) => {
    block(trace, outcomes);
    trace.events.push({ id: "alternate-rendering", kind: "encoding-retry", actor: "implementer", context: "cold" });
  })).some(item => item.code === "invalid-event"));
});

test("new execution assets reject corruption, symlinks and self-consistent sibling mismatch", async t => {
  const root = await makeTempTree(t);
  const skills = path.join(root, "skills");
  for (const name of ["spec-driven-development", "planning-and-task-breakdown", "incremental-implementation"]) {
    await fs.cp(path.join(projectRoot, "skills", name), path.join(skills, name), { recursive: true });
  }
  const incremental = path.join(skills, "incremental-implementation");
  const shared = path.join(incremental, "shared");
  const file = path.join(shared, "references/implementation-context.md");
  const original = await fs.readFile(file);
  await fs.appendFile(file, "Corrupt instruction.\n");
  await assert.rejects(verifyEngineeringManual(incremental), { code: "E_WORKFLOW_CONTEXT_MISMATCH" });
  const hash = createHash("sha256");
  for (const relative of ["references/workflow-state-access.md", "references/implementation-context.md"]) {
    hash.update(relative).update("\0").update(await fs.readFile(path.join(shared, relative))).update("\0");
  }
  const marker = path.join(shared, "workflow-context.sha256"), originalMarker = await fs.readFile(marker);
  await fs.writeFile(marker, `${hash.digest("hex")}\n`);
  await assert.rejects(verifyEngineeringManual(incremental), { code: "E_WORKFLOW_CONTEXT_MISMATCH" });
  await fs.writeFile(marker, originalMarker);
  await fs.rm(file);
  const outside = path.join(root, "outside.md");
  await fs.writeFile(outside, original);
  await fs.symlink(outside, file);
  await assert.rejects(verifyEngineeringManual(incremental), { code: "E_WORKFLOW_CONTEXT_FILE" });
  await fs.rm(file); await fs.writeFile(file, original);
  await fs.writeFile(marker, "invalid\n");
  await assert.rejects(verifyEngineeringManual(incremental), { code: "E_WORKFLOW_CONTEXT_MARKER" });
  const nonAsciiMarker = Buffer.from(originalMarker);
  nonAsciiMarker[0] |= 0x80;
  await fs.writeFile(marker, nonAsciiMarker);
  await assert.rejects(verifyEngineeringManual(incremental), { code: "E_WORKFLOW_CONTEXT_MARKER" });
  await fs.writeFile(marker, originalMarker);
  await verifyEngineeringManual(incremental);
});

for (const [name, change] of [
  ["null source", (_trace, outcomes) => { outcomes.sources[0] = null; }],
  ["null event", trace => { trace.events[0] = null; }],
  ["omitted action requirements", (_trace, outcomes) => { delete outcomes.actions[0].checks; }],
  ["non-array action requirements", (_trace, outcomes) => { outcomes.actions[0].sources = "requirement"; }],
  ["duplicate action identity", (_trace, outcomes) => { outcomes.actions.push({ ...outcomes.actions[0] }); }],
  ["duplicate change identity", (_trace, outcomes) => { outcomes.changes.push({ ...outcomes.changes[0] }); }],
]) {
  test(`malformed capture rejects ${name} without throwing`, async t => {
    const findings = await scenario(t, change);
    assert.ok(findings.some(item => item.code.startsWith("invalid-")), JSON.stringify(findings));
  });
}

test("a preservation block prevents dependent completion even after synchronization", async t => {
  const block = (trace, outcomes) => {
    outcomes.changes[2].overlap = true;
    trace.events.find(event => event.id === "preserve-external").disposition = "block";
  };
  assert.ok((await scenario(t, block)).some(item => item.code === "unresolved-preservation-block"));
  assert.ok((await scenario(t, (trace, outcomes) => {
    block(trace, outcomes);
    trace.events.splice(-1, 0, { id: "sync-after-block", kind: "sync", actor: "implementer",
      context: "cold", operation: "task_inputs_check", result: "pass" });
  })).some(item => item.code === "unresolved-preservation-block"));
  assert.deepEqual(await scenario(t, (trace, outcomes) => {
    block(trace, outcomes);
    outcomes.actions[1].blocked = true;
    trace.events.find(event => event.id === "complete").kind = "blocked";
  }), []);
});
