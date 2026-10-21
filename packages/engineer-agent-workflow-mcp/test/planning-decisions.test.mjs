import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import { fileURLToPath, URL } from "node:url";
import { createSharedStdioHarness } from "../test-support/stdio-harness.mjs";
import { planningFixture } from "../test-support/planning-fixture.mjs";
import { parse } from "yaml";

const server = createSharedStdioHarness({ entrypoint: fileURLToPath(new URL("../dist/main.js", import.meta.url)), name: "planning-decisions" });
before(() => server.start());
after(() => server.close());

test("technical answers retain exact evidence and preserve reviewed behavioral versions", async t => {
  const f = await planningFixture(t, server), before = f.context;
  const prepared = await f.prepare();
  assert.notEqual(f.context, before);
  assert.equal((await f.call("specification_check_state")).source_version, f.state.source_version);
  const answer = await f.record(prepared.question_ref, ["p1", "p2", "independent"], { text: "  Exact answer\nwith whitespace.  " });
  const saved = await f.exact(answer.decision_ref);
  assert.equal(saved.answer.text, "  Exact answer\nwith whitespace.  ");
  assert.equal(saved.answer.source, "fixture:native-answer");
  assert.equal(saved.proposals[0].sources[0].text, "## Shared\nUse plain functions.\n");
  for (const agreement of answer.agreements) assert.equal((await f.check(agreement)).status, "ready");
  const state = await f.call("specification_check_state", { expected_source_version: f.state.source_version });
  for (const key of ["source_version", "specification_version", "review_ref", "coverage_status", "approval_checkpoint_status"]) assert.equal(state[key], f.state[key]);
});

test("partial answers survive resume and another answer without replacing prior agreement", async t => {
  const f = await planningFixture(t, server), q = await f.prepare();
  const first = await f.record(q.question_ref, ["p1"]);
  assert.deepEqual(first.unresolved_packet_ids, ["p2", "independent"]);
  assert.equal((await f.call("planning_packet_check", { packet_id: "p2" })).status, "needs_agreement");
  await f.call("specification_open", { project: f.project, specification: "planning" });
  const second = await f.record(first.question_ref, ["p2"]);
  assert.equal((await f.check(first.agreements[0])).status, "ready");
  assert.equal((await f.check(second.agreements.find(a => a.packet_id === "p2"))).status, "ready");
  await f.call("planning_question_record_no_answer", { question_ref: second.question_ref, outcome: "dismissed" }, "INVALID_STATE");
});

test("dismissal, lost-response replay, and exact history never manufacture acceptance", async t => {
  const f = await planningFixture(t, server), q = await f.prepare();
  const noAnswer = await f.call("planning_question_record_no_answer", { question_ref: q.question_ref, outcome: "dismissed" });
  assert.equal((await f.call("planning_packet_check", { packet_id: "p1" })).status, "needs_agreement");
  const input = { context: f.context, question_ref: noAnswer.question_ref, text: "Accept p1.", source: "fixture:native-answer", accepted_proposal_ids: ["p1"] };
  const a = await f.call("planning_question_record_answer", input);
  const bytes = await f.bytes();
  const retry = await f.raw("planning_question_record_answer", input);
  assert.equal(retry.structuredContent.replayed, true);
  assert.deepEqual(retry.structuredContent.result.decision_ref, a.decision_ref);
  assert.equal(await f.bytes(), bytes);
  const history = await f.call("planning_decision_find", { history: true, limit: 1 });
  assert.equal(history.total, 3);
  assert.ok(history.next_cursor);
  assert.equal((await f.exact(q.question_ref)).answer, null);
});

test("option bindings validate alternatives, custom answers and explicit rejection", async t => {
  const f = await planningFixture(t, server);
  const alternative = { ...f.proposals[0], id: "p1-class" };
  const q = await f.prepare({ kind: "single_choice", proposals: [f.proposals[0], alternative], options: [{ id: "plain", label: "Plain functions" }, { id: "reject", label: "Revise" }], option_bindings: [{ option_id: "plain", proposal_ids: ["p1"] }, { option_id: "reject", proposal_ids: [] }] });
  const bytes = await f.bytes();
  for (const extra of [{ selected_ids: ["unknown"] }, { selected_ids: ["plain", "plain"] }, { selected_ids: ["plain", "reject"] }, { selected_ids: ["plain"], accepted_proposal_ids: ["p1-class"] }, { accepted_proposal_ids: ["p1", "p1-class"] }, { accepted_proposal_ids: ["foreign"] }, { accepted_proposal_ids: ["p1"], text: " " }]) {
    await f.call("planning_question_record_answer", { question_ref: q.question_ref, text: "Fixture response", source: "fixture:native-answer", ...extra }, "INVALID_INPUT");
    assert.equal(await f.bytes(), bytes);
  }
  const rejection = await f.call("planning_question_record_answer", { question_ref: q.question_ref, text: "Please revise.", source: "fixture:native-answer", selected_ids: ["reject"] });
  assert.deepEqual(rejection.agreements, []);
  const custom = await f.record(rejection.question_ref, ["p1-class"]);
  assert.equal((await f.check(custom.agreements[0])).status, "ready");
  const saved = await f.bytes();
  await f.call("planning_question_record_answer", { question_ref: custom.question_ref, text: "Replace the selected alternative.", source: "fixture:native-correction", accepted_proposal_ids: ["p1"], rejected_proposal_ids: ["p1-class"] }, "INVALID_INPUT");
  assert.equal(await f.bytes(), saved);
});

test("a behavioral amendment still invalidates the reviewed specification", async t => {
  const f = await planningFixture(t, server), q = await f.prepare();
  const answer = await f.record(q.question_ref, ["p1"]);
  await f.call("decision_record_instruction", { category: "behavior", text: "Accept invalid input too.", kind: "follow_up", source: "fixture:behavior-change", requirement_ids: ["PLAN-001"] });
  assert.equal((await f.call("specification_check_state")).coverage_status, "stale");
  assert.equal((await f.check(answer.agreements[0])).status, "blocked");
  await f.call("planning_question_prepare", { expected_source_version: f.state.source_version, text: "Agree?", kind: "free_text", proposals: f.proposals }, "SOURCE_CHANGED");
});

test("runtime advertises all six scenario tools with bounded metadata", async () => {
  const listed = await server.listTools();
  const names = listed.tools.filter(t => t.name.startsWith("planning_")).map(t => t.name).sort();
  assert.deepEqual(names, ["planning_decision_find", "planning_decision_get", "planning_packet_check", "planning_question_prepare", "planning_question_record_answer", "planning_question_record_no_answer"]);
  const response = await server.callTool({ name: "workflow_runtime_info", arguments: {} });
  for (const name of names) assert.ok(response.structuredContent.result.capabilities.includes(name));
});

test("native selected-only and standard multiple-choice answers retain their actual evidence", async t => {
  const f = await planningFixture(t, server);
  const options = [{ id: "one", label: "Agree p1" }, { id: "two", label: "Agree p2" }];
  const q = await f.prepare({ kind: "multiple_choice", options, option_bindings: [{ option_id: "one", proposal_ids: ["p1"] }, { option_id: "two", proposal_ids: ["p2"] }] });
  const answer = await f.call("planning_question_record_answer", { question_ref: q.question_ref, text: "", source: "fixture:native-selection", selected_ids: ["one", "two"] });
  const saved = await f.exact(answer.decision_ref);
  assert.equal(saved.answer.text, "");
  assert.deepEqual(saved.answer.selected_ids, ["one", "two"]);
  assert.equal(answer.agreements.length, 2);
});

test("legacy eligibility retains existing decision meaning without enrolling or relabeling history", async t => {
  const f = await planningFixture(t, server, { legacy: true });
  const before = parse(await f.bytes());
  assert.equal(f.state.coverage_status, "legacy_unverified");
  const q = await f.prepare(), answer = await f.record(q.question_ref, ["p1"]);
  assert.equal((await f.check(answer.agreements[0])).status, "ready");
  const after = parse(await f.bytes());
  assert.deepEqual(after.decisions, before.decisions);
  assert.equal(after.specification_reviews, undefined);
});

test("planning readiness and authoring reuse eligibility without writing an approval checkpoint", async t => {
  const f = await planningFixture(t, server, { observeApproval: false });
  const before = parse(await f.bytes());
  assert.equal(f.state.approval_checkpoint_status, "absent");
  const q = await f.prepare(), answer = await f.record(q.question_ref, ["p1"]);
  assert.equal((await f.check(answer.agreements[0])).status, "ready");
  assert.deepEqual(parse(await f.bytes()).specification_reviews, before.specification_reviews);
  const bytes = await f.bytes();
  await f.check(answer.agreements[0]);
  assert.equal(await f.bytes(), bytes);
});

test("an explicit rejection revokes prior agreement and reacceptance needs a new answer reference", async t => {
  const f = await planningFixture(t, server);
  const q = await f.prepare({ proposals: [f.proposals[0]], kind: "single_choice", options: [{ id: "accept", label: "Accept" }, { id: "revise", label: "Revise" }], option_bindings: [{ option_id: "accept", proposal_ids: ["p1"] }, { option_id: "revise", proposal_ids: [] }] });
  const yes = await f.record(q.question_ref, ["p1"], { selected_ids: ["accept"] });
  const no = await f.call("planning_question_record_answer", { question_ref: yes.question_ref, text: "Reject the proposal and revise it.", source: "fixture:native-correction", selected_ids: ["revise"] });
  assert.deepEqual(no.agreements, []);
  assert.deepEqual(no.unresolved_packet_ids, ["p1"]);
  assert.equal((await f.check(yes.agreements[0])).status, "stale");
  assert.deepEqual((await f.exact(yes.decision_ref)).answer.accepted_proposal_ids, ["p1"]);
  const again = await f.record(no.question_ref, ["p1"], { selected_ids: ["accept"] });
  assert.notDeepEqual(again.agreements[0].agreement_ref, yes.agreements[0].agreement_ref);
  assert.equal((await f.check(again.agreements[0])).status, "ready");
  assert.equal((await f.check(yes.agreements[0])).status, "stale");
  assert.equal((await f.call("specification_check_state")).source_version, f.state.source_version);
});

test("custom rejection withdraws only named proposals and rejects conflicting or foreign selections atomically", async t => {
  const f = await planningFixture(t, server), q = await f.prepare();
  const yes = await f.record(q.question_ref, ["p1", "p2"]);
  const bytes = await f.bytes();
  for (const rejected_proposal_ids of [["foreign"], ["p1", "p1"], ["p2"]]) {
    await f.call("planning_question_record_answer", { question_ref: yes.question_ref, text: "Fixture correction", source: "fixture:native-correction", accepted_proposal_ids: ["p2"], rejected_proposal_ids }, "INVALID_INPUT");
    assert.equal(await f.bytes(), bytes);
  }
  const no = await f.call("planning_question_record_answer", { question_ref: yes.question_ref, text: "Withdraw p1; keep p2.", source: "fixture:native-correction", rejected_proposal_ids: ["p1"] });
  assert.equal((await f.check(yes.agreements.find(a => a.packet_id === "p1"))).status, "stale");
  assert.equal((await f.check(yes.agreements.find(a => a.packet_id === "p2"))).status, "ready");
  const saved = await f.exact(no.decision_ref);
  assert.deepEqual(saved.answer.rejected_proposal_ids, ["p1"]);
  assert.equal(saved.answer.text, "Withdraw p1; keep p2.");
});

test("a rejection option cannot be mixed with acceptance or silently overridden by custom rejection IDs", async t => {
  const f = await planningFixture(t, server);
  const q = await f.prepare({ kind: "multiple_choice", options: [{ id: "accept", label: "Accept p1" }, { id: "revise", label: "Revise this question" }], option_bindings: [{ option_id: "accept", proposal_ids: ["p1"] }, { option_id: "revise", proposal_ids: [] }] });
  const bytes = await f.bytes();
  for (const args of [{ selected_ids: ["accept", "revise"] }, { selected_ids: ["revise"], rejected_proposal_ids: ["p1"] }]) {
    await f.call("planning_question_record_answer", { question_ref: q.question_ref, text: "Fixture selection", source: "fixture:native-selection", ...args }, "INVALID_INPUT");
    assert.equal(await f.bytes(), bytes);
  }
});
