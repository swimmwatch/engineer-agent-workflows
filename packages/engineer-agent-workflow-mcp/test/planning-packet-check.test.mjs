import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import { writeFile, symlink } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { createSharedStdioHarness } from "../test-support/stdio-harness.mjs";
import { planningFixture } from "../test-support/planning-fixture.mjs";
import { parse, stringify } from "yaml";

const server = createSharedStdioHarness({ entrypoint: fileURLToPath(new URL("../dist/main.js", import.meta.url)), name: "planning-freshness" });
before(() => server.start());
after(() => server.close());

test("shared drift stales only dependent packets and preserves behavioral approval", async t => {
  const f = await planningFixture(t, server), q = await f.prepare();
  const a = await f.record(q.question_ref, ["p1", "p2", "independent"]);
  await f.write("p1", f.sources.p1.replace("Pending.", "Verified implementation and handoff."));
  assert.equal((await f.check(a.agreements[0])).status, "ready");
  await f.write("shared", f.sources.shared.replace("plain functions", "a class hierarchy"));
  for (const agreement of a.agreements) assert.equal((await f.check(agreement)).status, agreement.packet_id === "independent" ? "ready" : "stale");
  assert.equal((await f.call("specification_check_state")).source_version, f.state.source_version);
  const revised = await f.prepare({ revises: a.question_ref });
  const next = await f.record(revised.question_ref, ["p1"]);
  assert.equal((await f.check(a.agreements[0])).status, "stale");
  assert.equal((await f.check(next.agreements[0])).status, "ready");
});

test("readiness binds exact packet membership, digest, origin and current answers", async t => {
  const f = await planningFixture(t, server), q = await f.prepare(), a = await f.record(q.question_ref, ["p1"]);
  const agreement = a.agreements[0];
  assert.equal((await f.check(agreement, { packet_id: "p2" })).status, "stale");
  assert.equal((await f.check(agreement, { expected_proposal_digest: "0".repeat(64) })).status, "stale");
  await f.call("planning_packet_check", { packet_id: "p1", agreement_ref: { id: "foreign", revision: 1 }, expected_proposal_digest: agreement.proposal_digest }, "BROKEN_REFERENCE");
  await f.call("planning_decision_get", { decision_ref: { id: "foreign", revision: 1 } }, "BROKEN_REFERENCE");
  const other = await f.prepare({ proposals: [f.proposals[0]] });
  assert.equal((await f.check(agreement)).status, "stale");
  assert.equal((await f.call("planning_packet_check", { packet_id: "p1" })).status, "needs_agreement");
  assert.equal((await f.exact(other.question_ref)).answer, null);
});

test("proposal preparation rejects unsafe, missing, duplicate and oversized sections atomically", async t => {
  const f = await planningFixture(t, server);
  const bytes = await f.bytes();
  await writeFile(join(f.project, "outside.md"), "## Technical proposal\nPrivate.\n");
  await symlink(join(f.project, "outside.md"), join(f.project, f.directory, "tasks/link.md"));
  const invalid = [
    ["outside.md", "Technical proposal", "UNSAFE_PATH"],
    [`${f.directory}/tasks/../spec.md`, "Technical proposal", "UNSAFE_PATH"],
    [`${f.directory}/tasks/link.md`, "Technical proposal", "UNSAFE_PATH"],
    [f.paths.p1, "Missing", "BROKEN_REFERENCE"],
    [`${f.directory}/tasks/missing.md`, "Technical proposal", "NOT_FOUND"],
  ];
  for (const [path, heading, error] of invalid) {
    await f.call("planning_question_prepare", { expected_source_version: f.state.source_version, text: "Agree?", kind: "free_text", proposals: [{ ...f.proposals[0], sources: [{ path, heading }] }] }, error);
    assert.equal(await f.bytes(), bytes);
  }
  await f.write("p1", "## Technical proposal\nFirst.\n## Technical proposal\nSecond.\n");
  await f.call("planning_question_prepare", { expected_source_version: f.state.source_version, text: "Agree?", kind: "free_text", proposals: [f.proposals[0]] }, "BROKEN_REFERENCE");
  assert.equal(await f.bytes(), bytes);
  const { MAX_PROPOSAL_BYTES } = await import("../dist/planning.js");
  const header = "## Technical proposal\n";
  await f.write("p1", header + "x".repeat(MAX_PROPOSAL_BYTES - Buffer.byteLength(header)));
  const q = await f.prepare({ proposals: [{ ...f.proposals[0], sources: [{ path: f.paths.p1, heading: "Technical proposal" }] }] });
  assert.ok(q.question_ref);
  const saved = await f.bytes();
  await f.write("p1", header + "x".repeat(MAX_PROPOSAL_BYTES - Buffer.byteLength(header) + 1));
  await f.call("planning_question_prepare", { expected_source_version: f.state.source_version, text: "Agree?", kind: "free_text", proposals: [{ ...f.proposals[0], sources: [{ path: f.paths.p1, heading: "Technical proposal" }] }] }, "SOURCE_LIMIT");
  assert.equal(await f.bytes(), saved);
});

test("technical source edits during a managed mutation prevent installation", async t => {
  const f = await planningFixture(t, server), bytes = await f.bytes();
  const { mutate } = await import("../dist/state.js");
  const { readProposalSources } = await import("../dist/planning.js");
  await assert.rejects(mutate(f.context, "decisions", "fixture-concurrent-edit", {}, async (_value, context) => {
    await readProposalSources(context, f.proposals);
    await f.write("shared", f.sources.shared + "Changed during operation.\n");
    return { fixture: true };
  }), error => error.code === "CONFLICT");
  assert.equal(await f.bytes(), bytes);
});

test("answer source freshness and stale contexts cannot append phantom agreements", async t => {
  const f = await planningFixture(t, server), q = await f.prepare(), staleContext = f.context;
  await f.write("p1", f.sources.p1.replace("validated", "unchecked"));
  const bytes = await f.bytes();
  await f.call("planning_question_record_answer", { question_ref: q.question_ref, text: "Accept.", source: "fixture:native-answer", accepted_proposal_ids: ["p1"] }, "SOURCE_CHANGED");
  assert.equal(await f.bytes(), bytes);
  await f.write("p1", f.sources.p1);
  const a = await f.record(q.question_ref, ["p1"]);
  const saved = await f.bytes();
  await f.call("planning_question_record_no_answer", { context: staleContext, question_ref: q.question_ref, outcome: "cancelled" }, "CONFLICT");
  assert.equal(await f.bytes(), saved);
  assert.equal((await f.check(a.agreements[0])).status, "ready");
});

test("readiness rejects a forged accepted-member mapping and altered historical source text", async t => {
  const f = await planningFixture(t, server), q = await f.prepare(), a = await f.record(q.question_ref, ["p1"]);
  const original = await f.bytes(), path = join(f.project, f.directory, "decisions.yaml");
  const membership = parse(original);
  membership.planning_decisions.records.at(-1).answer.accepted_proposal_ids = [];
  await writeFile(path, stringify(membership));
  assert.equal((await f.check(a.agreements[0])).status, "stale");
  const source = parse(original);
  source.planning_decisions.records.at(-1).proposals[0].sources[0].text = "Invented historical text.";
  await writeFile(path, stringify(source));
  await f.call("planning_decision_get", { decision_ref: a.decision_ref }, "INVALID_STATE");
});

test("oversized question readback fails before persisting a prepared question", async t => {
  const f = await planningFixture(t, server), bytes = await f.bytes();
  const options = Array.from({ length: 20 }, (_, i) => ({ id: `option-${i}`, label: "x".repeat(4096) }));
  await f.call("planning_question_prepare", { expected_source_version: f.state.source_version, text: "Agree?", kind: "single_choice", proposals: [f.proposals[0]], options, option_bindings: options.map(option => ({ option_id: option.id, proposal_ids: ["p1"] })) }, "RESULT_LIMIT");
  assert.equal(await f.bytes(), bytes);
});

test("continuing an older group cannot resurrect a packet superseded by a newer question", async t => {
  const f = await planningFixture(t, server), q = await f.prepare(), first = await f.record(q.question_ref, ["p1"]);
  await f.write("p1", f.sources.p1 + "\n## Revised proposal\nparseInput(raw, options) replaces the old shared signature.\n");
  const latest = await f.prepare({ proposals: [{ ...f.proposals[0], id: "p1-revised", sources: [{ path: f.paths.p1, heading: "Revised proposal" }] }] });
  assert.equal((await f.check(first.agreements[0])).status, "stale");
  const resumed = await f.record(first.question_ref, ["p2"]);
  assert.equal((await f.check(first.agreements[0])).status, "stale");
  assert.equal((await f.check(resumed.agreements.find(a => a.packet_id === "p2"))).status, "ready");
  const accepted = await f.record(latest.question_ref, ["p1-revised"]);
  await f.record(resumed.question_ref, ["independent"]);
  assert.equal((await f.check(accepted.agreements[0])).status, "ready");
  assert.equal((await f.check(first.agreements[0])).status, "stale");
});

test("the cumulative raw source budget is checked before Markdown parsing and counts each file once", async t => {
  const f = await planningFixture(t, server);
  const { MAX_PROPOSAL_INPUT_BYTES } = await import("../dist/planning.js");
  const budget = MAX_PROPOSAL_INPUT_BYTES;
  const source = key => ({ path: f.paths[key], heading: "Technical proposal" });
  const sized = size => {
    const prefix = "## Unrelated\n", suffix = "\n\n## Technical proposal\nUse plain functions.\n";
    return prefix + "x".repeat(size - Buffer.byteLength(prefix + suffix)) + suffix;
  };
  await f.write("p1", sized(budget));
  const repeated = [f.proposals[0], f.proposals[1]].map(proposal => ({ ...proposal, sources: [source("p1")] }));
  assert.ok((await f.prepare({ proposals: repeated })).question_ref);
  const bytes = await f.bytes();
  await f.write("p2", sized(100));
  await f.call("planning_question_prepare", { expected_source_version: f.state.source_version, text: "Agree?", kind: "free_text", proposals: [{ ...f.proposals[0], sources: [source("p1"), source("p2")] }] }, "SOURCE_LIMIT");
  assert.equal(await f.bytes(), bytes);
  await f.write("p1", sized(Math.floor(budget / 2)));
  await f.write("p2", sized(budget - Math.floor(budget / 2)));
  assert.ok((await f.prepare({ proposals: [{ ...f.proposals[0], sources: [source("p1"), source("p2")] }] })).question_ref);
  const before = await f.bytes();
  await writeFile(join(f.project, f.paths.p2), Buffer.alloc(budget - Math.floor(budget / 2) + 1, 255));
  await f.call("planning_question_prepare", { expected_source_version: f.state.source_version, text: "Agree?", kind: "free_text", proposals: [{ ...f.proposals[0], sources: [source("p1"), source("p2")] }] }, "SOURCE_LIMIT");
  assert.equal(await f.bytes(), before);
});

test("repreparing a shadowed question cannot reuse its obsolete agreement before a new answer", async t => {
  const f = await planningFixture(t, server), q = await f.prepare(), first = await f.record(q.question_ref, ["p1", "p2"]);
  await f.prepare({ proposals: [{ ...f.proposals[0], id: "p1-new-question" }] });
  assert.equal((await f.check(first.agreements[0])).status, "stale");
  const reask = await f.prepare({ revises: first.question_ref });
  assert.equal((await f.check(first.agreements[0])).status, "stale");
  assert.equal((await f.check(first.agreements.find(a => a.packet_id === "p2"))).status, "ready");
  const next = await f.record(reask.question_ref, ["p1"]);
  assert.equal((await f.check(next.agreements.find(a => a.packet_id === "p1"))).status, "ready");
});

test("readiness rejects old-writer withdrawal history even when a later answer retained the stale binding", async t => {
  const f = await planningFixture(t, server);
  const q = await f.prepare({ kind: "multiple_choice", options: [{ id: "one", label: "Accept p1" }, { id: "two", label: "Accept p2" }, { id: "revise", label: "Revise all" }], option_bindings: [{ option_id: "one", proposal_ids: ["p1"] }, { option_id: "two", proposal_ids: ["p2"] }, { option_id: "revise", proposal_ids: [] }] });
  const first = await f.record(q.question_ref, ["p1"], { selected_ids: ["one"] });
  const withdrawn = await f.call("planning_question_record_answer", { question_ref: first.question_ref, text: "Withdraw these proposals.", source: "fixture:native-correction", selected_ids: ["revise"] });
  const resumed = await f.record(withdrawn.question_ref, ["p2"], { selected_ids: ["two"] });
  const ledger = parse(await f.bytes());
  // Emulate the pre-fix writer without migrating real workflow state.
  for (const record of ledger.planning_decisions.records) {
    if (record.answer) delete record.answer.rejected_proposal_ids;
    if (record.id === first.decision_ref.id && record.revision >= withdrawn.decision_ref.revision) {
      record.agreements = [globalThis.structuredClone(first.agreements[0]), ...record.agreements.filter(a => a.packet_id !== "p1")];
    }
  }
  await writeFile(join(f.project, f.directory, "decisions.yaml"), stringify(ledger));
  const before = await f.bytes();
  assert.equal((await f.check(first.agreements[0])).status, "stale");
  assert.equal((await f.check(resumed.agreements.find(a => a.packet_id === "p2"))).status, "ready");
  assert.equal(await f.bytes(), before);
});
