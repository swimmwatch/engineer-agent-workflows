import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { reviewWorkflowFixture } from "../test-support/review-workflow-fixture.mjs";

test("one read-only preparation supplies bounded native arguments without an opener", async (t) => {
  const fixture = await reviewWorkflowFixture(t);
  const launcher = await fixture.actor("launcher-simulation");
  const tools = await launcher.harness.listTools();
  const definition = tools.tools.find((tool) => tool.name === "specification_review_prepare_workflow");
  assert.ok(definition, "The native preparation scenario must be published.");
  assert.equal(definition.annotations.readOnlyHint, true);
  const before = await fixture.digest();
  const prepared = await fixture.prepare(launcher);
  assert.equal(prepared.status, "ready_to_run");
  assert.equal(prepared.next_stage, "detailed");
  assert.equal(prepared.args.review_ref, fixture.review.review_ref);
  assert.equal(prepared.args.source_version, fixture.review.source_version);
  assert.equal(prepared.args.workload.pending_items, fixture.review.total_items - 1);
  assert.equal(prepared.args.workload.lane_count, 1);
  assert.equal(prepared.args.lanes.length, 1);
  assert.ok(prepared.args.lanes[0].group_ref);
  assert.equal(launcher.trace.length, 1);
  assert.equal(await fixture.digest(), before);
  const serialized = JSON.stringify(prepared);
  assert.ok(!serialized.includes("Preserve every linked fixture behavior."));
  assert.ok(!serialized.includes("Return the requested fixture value."));
});

test("preparation blocks mismatched targets and pending final checks without writes", async (t) => {
  const fixture = await reviewWorkflowFixture(t);
  const launcher = await fixture.actor("blocked-launcher-simulation");
  const before = await fixture.digest();
  for (const extra of [
    { review_ref: "unknown-review" },
    { source_version: "0".repeat(64) },
    { host_concurrency: 0 },
    { stage: "final" },
    { specification: "missing" },
  ]) {
    const result = await fixture.prepare(launcher, extra);
    assert.equal(result.status, "blocked");
    assert.ok(result.reasons.length);
    assert.equal(result.args, undefined);
    assert.equal(await fixture.digest(), before);
  }
});

test("preparation observes author approval without recording its checkpoint", async (t) => {
  const fixture = await reviewWorkflowFixture(t);
  await writeFile(join(fixture.directory, "spec.md"), fixture.spec.replace("Status: Draft", "Status: Approved"));
  const before = await fixture.digest();
  const launcher = await fixture.actor("approval-observer-simulation");
  const result = await fixture.prepare(launcher);
  assert.equal(await fixture.digest(), before);
  assert.equal(result.status, "ready_to_run");
  const state = await fixture.author.call("specification_check_state");
  assert.equal(state.approval_checkpoint_written, true);
});

test("a source change during preparation cannot produce mixed ready arguments", async (t) => {
  const fixture = await reviewWorkflowFixture(t);
  const launcher = await fixture.actor("changing-source-simulation", "pause-spec-read");
  const before = await fixture.digest();
  const pending = fixture.prepare(launcher);
  await launcher.waitFor("SOURCE_READ");
  await writeFile(join(fixture.directory, "spec.md"), fixture.spec + "\nChanged fixture obligation.\n");
  await launcher.release();
  const result = await pending;
  assert.equal(result.status, "blocked");
  assert.equal(result.args, undefined);
  assert.equal(await fixture.digest(), before);
});

test("weighted stateless lane cursors cover more than 160 items across process restart", async (t) => {
  const fixture = await reviewWorkflowFixture(t, { requirements: 175 });
  const launcher = await fixture.actor("large-launcher-simulation");
  const prepared = await fixture.prepare(launcher);
  assert.equal(prepared.status, "ready_to_run");
  assert.equal(prepared.args.workload.lane_count, 4);
  assert.ok(prepared.args.workload.pending_items > 160);
  const repeated = await fixture.prepare(launcher);
  assert.deepEqual(repeated.args.lanes, prepared.args.lanes);
  const reader = await fixture.openActor("lane-reader-simulation");
  const first = prepared.args.lanes[0];
  const firstBatch = await fixture.batch(reader, first);
  await reader.call("specification_review_submit_batch", firstBatch);
  const indexes = [];
  for (const initial of prepared.args.lanes) {
    let group = initial;
    while (group) {
      assert.ok(group.item_count >= 1 && group.item_count <= 20);
      assert.ok(group.weight <= 20 || group.item_count === 1);
      let part = group;
      for (;;) {
        indexes.push(...part.items.map((item) => item.item_index));
        if (!part.items_cursor) break;
        const result = await fixture.prepare(launcher, { cursor: part.items_cursor });
        part = result.args.lanes[0];
      }
      if (!group.next_cursor) break;
      await launcher.harness.restart();
      const result = await fixture.prepare(launcher, { cursor: group.next_cursor });
      assert.equal(result.status, "ready_to_run");
      group = result.args.lanes[0];
    }
  }
  assert.equal(new Set(indexes).size, prepared.args.workload.pending_items);
  assert.equal(indexes.length, prepared.args.workload.pending_items);
  assert.deepEqual([...indexes].sort((a, b) => a - b),
    Array.from({ length: fixture.review.total_items - 1 }, (_, index) => index));
  const damaged = first.group_ref.slice(0, -4) + "AAAA";
  const invalid = await fixture.prepare(launcher, { cursor: damaged });
  assert.equal(invalid.status, "blocked");
  assert.equal(invalid.args, undefined);
});

test("a heavy original remains one actor-owned group and host admission stays bounded", async (t) => {
  const fixture = await reviewWorkflowFixture(t, { requirements: 45,
    requirementText: "Retain Unicode 😀 and escaped input. ".repeat(70), concurrency: 2 });
  const launcher = await fixture.actor("heavy-launcher-simulation");
  const result = await fixture.prepare(launcher);
  assert.equal(result.status, "ready_to_run");
  assert.equal(result.args.workload.lane_count, 2);
  const groups = [...result.args.lanes];
  for (let index = 0; index < groups.length; index++) {
    if (groups[index].next_cursor) {
      const next = await fixture.prepare(launcher, { cursor: groups[index].next_cursor });
      groups.push(next.args.lanes[0]);
    }
  }
  const heavy = groups.find((group) => group.weight > 20);
  assert.ok(heavy);
  assert.equal(heavy.item_count, 1);
});

test("fresh saved consistency selects completion only and completed review launches nothing", async (t) => {
  for (const consistency of ["consistent", "gap"]) {
    const fixture = await reviewWorkflowFixture(t);
    const launcher = await fixture.actor("final-launcher-simulation");
    await fixture.finish(consistency);
    await launcher.harness.restart();
    const before = await fixture.digest();
    const ready = await fixture.prepare(launcher);
    assert.equal(ready.status, "ready_to_run");
    assert.equal(ready.next_stage, "completion_only");
    assert.equal(ready.args.workload.pending_items, 0);
    assert.deepEqual(ready.args.lanes, []);
    assert.equal(await fixture.digest(), before);
    const completed = await launcher.call("specification_review_complete", { review_ref: fixture.review.review_ref });
    assert.equal(completed.coverage_status, consistency === "consistent" ? "reviewed" : "gaps");
    const unchanged = await fixture.digest();
    const result = await fixture.prepare(launcher);
    assert.equal(result.status, "completed");
    assert.equal(result.outcome, completed.coverage_status);
    assert.equal(result.args, undefined);
    assert.equal(await fixture.digest(), unchanged);
  }
});

test("long identifiers use real bounded metadata continuations without dropping assignments", async (t) => {
  const fixture = await reviewWorkflowFixture(t, { requirements: 100, idPrefix: "CLI" + "X".repeat(350) });
  const launcher = await fixture.actor("bounded-metadata-launcher-simulation");
  const prepared = await fixture.prepare(launcher);
  assert.equal(prepared.status, "ready_to_run");
  assert.ok(prepared.args.lanes.some((group) => group.items_cursor));
  const indexes = [];
  for (const initial of prepared.args.lanes) {
    let group = initial;
    for (;;) {
      let part = group;
      for (;;) {
        indexes.push(...part.items.map((item) => item.item_index));
        if (!part.items_cursor) break;
        const continuation = await fixture.prepare(launcher, { cursor: part.items_cursor });
        part = continuation.args.lanes[0];
      }
      if (!group.next_cursor) break;
      const continuation = await fixture.prepare(launcher, { cursor: group.next_cursor });
      group = continuation.args.lanes[0];
    }
  }
  assert.equal(indexes.length, fixture.review.total_items - 1);
  assert.equal(new Set(indexes).size, indexes.length);
});

test("a foreign allocation cannot launch another review of the unchanged source", async (t) => {
  const fixture = await reviewWorkflowFixture(t);
  const launcher = await fixture.actor("foreign-allocation-launcher-simulation");
  const first = await fixture.prepare(launcher);
  const oldGroup = first.args.lanes[0].group_ref;
  const oldSource = fixture.review.source_version;
  await fixture.finish();
  await fixture.author.call("specification_review_complete", { review_ref: fixture.review.review_ref });
  const next = await fixture.author.call("specification_review_start", { require_consistency: true });
  fixture.selectReview(next);
  assert.equal(next.source_version, oldSource);
  const before = await fixture.digest();
  const result = await fixture.prepare(launcher, { cursor: oldGroup });
  assert.equal(result.status, "blocked");
  assert.equal(result.args, undefined);
  assert.equal(await fixture.digest(), before);
});

async function correctionsFixture(t) {
  const fixture = await reviewWorkflowFixture(t, { requirements: 35, independentSources: true });
  const parent = fixture.review;
  let findingKey;
  for (let index = 0; index < parent.total_items - 1; index++) {
    const read = await fixture.readItem(fixture.author, index);
    if (read.payload.kind !== "requirement" || read.payload.source.id !== fixture.ids[0]) continue;
    findingKey = read.last.item_key;
    await fixture.author.call("specification_review_record", {
      review_ref: parent.review_ref, item_index: index, read_receipt: read.last.read_receipt,
      verdict: "gap", explanation: "Simulation-only omitted fixture behavior.",
      counterexample: "The fixture value does not cover a corrected input.",
      evidence_requirement_ids: [], evidence_source_refs: [],
    });
    break;
  }
  assert.ok(findingKey);
  await fixture.finish();
  const completed = await fixture.author.call("specification_review_complete", { review_ref: parent.review_ref });
  assert.equal(completed.coverage_status, "gaps");
  const corrected = fixture.spec.replace("Return the requested fixture value.", "Return the corrected fixture value.");
  await writeFile(join(fixture.directory, "spec.md"), corrected);
  await fixture.author.call("specification_open", { project: fixture.project, specification: fixture.specification });
  let cursor;
  let last;
  const parts = [];
  do {
    last = await fixture.author.call("specification_review_changes", {
      review_ref: parent.review_ref, ...(cursor ? { cursor } : {}),
    });
    parts.push(last.text);
    cursor = last.next_cursor;
  } while (cursor);
  const changes = JSON.parse(parts.join(""));
  assert.equal(changes.eligible, true);
  const followup = await fixture.author.call("specification_review_followup_start", {
    review_ref: parent.review_ref, changes_receipt: last.changes_receipt,
    fixes: [{ finding_key: findingKey, changed_item_keys: changes.changes.map((change) => change.item_key),
      explanation: "Clarify the simulated omitted fixture behavior." }],
  });
  fixture.selectReview(followup);
  return { fixture, candidates: changes.candidate_item_keys.filter((key) => key.startsWith("requirement:")) };
}

test("followup metadata preserves saved results through expansion and paginates every mandatory result", async (t) => {
  const { fixture, candidates } = await correctionsFixture(t);
  assert.ok(candidates.length > 21);
  const expanded = await fixture.author.call("specification_review_scope_expand", {
    review_ref: fixture.review.review_ref, item_keys: candidates.slice(0, 20),
    reason: "Simulation-only cross-impact requiring exact rechecks.",
  });
  const reader = await fixture.openActor("followup-native-judge-simulation");
  const first = await fixture.prepare(reader);
  assert.equal(first.mode, "followup");
  assert.equal(first.args.workload.pending_items, expanded.required_items);
  assert.ok(first.args.workload.pending_items < fixture.review.total_items - 1);
  let retainedBatch;
  for (const initial of first.args.lanes) {
    let group = initial;
    for (;;) {
      const batch = await fixture.batch(reader, group);
      retainedBatch ??= batch;
      await reader.call("specification_review_submit_batch", batch);
      if (!group.next_cursor) break;
      const next = await fixture.prepare(reader, { cursor: group.next_cursor });
      group = next.args.lanes[0];
    }
  }
  const requiredReads = new Set(reader.trace.filter((entry) => entry.name === "specification_review_get")
    .map((entry) => entry.item_index));
  assert.deepEqual([...requiredReads].sort((a, b) => a - b),
    [...expanded.required_item_indices].sort((a, b) => a - b));
  const finalPrepared = await fixture.prepare(reader, { stage: "final" });
  assert.equal(finalPrepared.next_stage, "final_assessment");
  const oldRequiredCursor = finalPrepared.args.required_results.next_cursor;
  assert.ok(oldRequiredCursor);
  const oldFinalRead = await fixture.readItem(reader, fixture.review.total_items - 1);
  await reader.call("specification_review_consistency_record", {
    review_ref: fixture.review.review_ref, read_receipt: oldFinalRead.last.consistency_read_receipt,
    verdict: "consistent", explanation: "Simulation-only initial whole-context assessment.",
  });
  assert.equal((await fixture.prepare(reader)).next_stage, "completion_only");
  await fixture.author.call("specification_open", { project: fixture.project, specification: fixture.specification });
  await fixture.author.call("specification_review_scope_expand", {
    review_ref: fixture.review.review_ref, item_keys: [candidates[20]],
    reason: "Simulation-only later inherited cross-impact.",
  });
  const obsolete = await fixture.prepare(reader, { cursor: oldRequiredCursor });
  assert.equal(obsolete.status, "blocked");
  assert.equal(obsolete.reasons[0].code, "STALE_CURSOR");
  assert.equal((await fixture.prepare(reader, { stage: "final" })).status, "blocked");
  const savedReplay = await reader.raw("specification_review_submit_batch", retainedBatch);
  assert.notEqual(savedReplay.isError, true, JSON.stringify(savedReplay.structuredContent));
  assert.equal(savedReplay.structuredContent.result.saved, true);
  const pending = await fixture.prepare(reader);
  assert.equal(pending.args.workload.pending_items, 1);
  assert.equal(pending.args.workload.lane_count, 1);
  const batch = await fixture.batch(reader, pending.args.lanes[0]);
  await reader.call("specification_review_submit_batch", {
    ...batch, group_ref: retainedBatch.group_ref,
  }, "STALE_CURSOR");
  await reader.call("specification_review_submit_batch", batch);
  await reader.call("specification_review_consistency_record", {
    review_ref: fixture.review.review_ref, read_receipt: oldFinalRead.last.consistency_read_receipt,
    verdict: "consistent", explanation: "Invalid stale simulation assessment.",
  }, "INCOMPLETE_READ");
  const fresh = await fixture.prepare(reader, { stage: "final" });
  assert.equal(fresh.next_stage, "final_assessment");
  const references = [...fresh.args.required_results.items];
  for (let cursor = fresh.args.required_results.next_cursor; cursor;) {
    await reader.harness.restart();
    const next = await fixture.prepare(reader, { stage: "final", cursor });
    references.push(...next.args.required_results.items);
    cursor = next.args.required_results.next_cursor;
  }
  assert.equal(references.length, expanded.required_items + 1);
  assert.equal(new Set(references.map((item) => item.item_key)).size, references.length);
  for (const reference of references) {
    assert.equal(reference.recorded, true);
    assert.equal(reference.carried_from, undefined);
    const read = await fixture.readItem(reader, reference.item_index);
    assert.equal(read.last.recorded_result.verdict, "covered");
  }
  const context = await fixture.readItem(reader, fixture.review.total_items - 1);
  assert.ok(context.payload.source.text.includes(fixture.ids.at(-1)));
  await reader.call("specification_review_consistency_record", {
    review_ref: fixture.review.review_ref, read_receipt: context.last.consistency_read_receipt,
    verdict: "consistent", explanation: "Simulation-only renewed whole-context assessment.",
  });
  const completed = await reader.call("specification_review_complete", { review_ref: fixture.review.review_ref });
  assert.equal(completed.coverage_status, "reviewed");
});
