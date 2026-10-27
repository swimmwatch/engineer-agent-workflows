import assert from "node:assert/strict";
import { mkdir, open, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import test from "node:test";
import { reviewWorkflowFixture } from "../test-support/review-workflow-fixture.mjs";

test("two real processes save disjoint batches from one source view without context relay", async (t) => {
  const fixture = await reviewWorkflowFixture(t, { requirements: 40, concurrency: 2 });
  const launcher = await fixture.actor("concurrent-launcher-simulation");
  const prepared = await fixture.prepare(launcher);
  assert.equal(prepared.args.workload.lane_count, 2);
  const left = await fixture.openActor("left-judge-simulation", "lock-attempt");
  const right = await fixture.openActor("right-judge-simulation", "lock-attempt");
  const leftBatch = await fixture.batch(left, prepared.args.lanes[0]);
  const rightBatch = await fixture.batch(right, prepared.args.lanes[1]);
  const lockPath = join(fixture.directory, "decisions.yaml.workflow-lock");
  const lock = await open(lockPath, "wx");
  let leftSettled = false;
  let rightSettled = false;
  const saveLeft = left.raw("specification_review_submit_batch", leftBatch).then((value) => {
    leftSettled = true;
    return value;
  });
  const saveRight = right.raw("specification_review_submit_batch", rightBatch).then((value) => {
    rightSettled = true;
    return value;
  });
  try {
    await Promise.all([left.waitFor("LOCK_ATTEMPT"), right.waitFor("LOCK_ATTEMPT")]);
    assert.equal(leftSettled, false);
    assert.equal(rightSettled, false);
  } finally {
    await lock.close();
    await unlink(lockPath);
  }
  const responses = await Promise.all([saveLeft, saveRight]);
  for (const response of responses) {
    assert.notEqual(response.isError, true, JSON.stringify(response.structuredContent));
    assert.equal(response.structuredContent.result.saved, true);
    assert.equal(typeof response.structuredContent.result.lock_wait_ms, "number");
    assert.ok(response.structuredContent.result.lock_wait_ms > 0,
      "Actual lock acquisition time must be observable for contended saved submissions.");
  }
  await Promise.all([left.harness.close(), right.harness.close()]);
  const observer = await fixture.openActor("saved-observer-simulation");
  const status = await observer.call("specification_review_status", { review_ref: fixture.review.review_ref });
  assert.equal(status.recorded_items, leftBatch.items.length + rightBatch.items.length);
  const strict = await observer.call("specification_review_record", {
    context: leftBatch.context, review_ref: fixture.review.review_ref, ...rightBatch.items[0],
  }, "CONFLICT");
  assert.equal(strict.error.operation_applied, false);
});

test("a native batch is atomic and validates receipts and assignment membership", async (t) => {
  const fixture = await reviewWorkflowFixture(t, { requirements: 25 });
  const launcher = await fixture.actor("atomic-launcher-simulation");
  const prepared = await fixture.prepare(launcher);
  const reader = await fixture.openActor("atomic-judge-simulation");
  const batch = await fixture.batch(reader, prepared.args.lanes[0]);
  const before = await fixture.digest();
  const invalid = globalThis.structuredClone(batch);
  invalid.items.at(-1).read_receipt = "incomplete";
  await reader.call("specification_review_submit_batch", invalid, "INCOMPLETE_READ");
  assert.equal(await fixture.digest(), before);
  const foreign = globalThis.structuredClone(batch);
  foreign.items[0].item_index = fixture.review.total_items - 1;
  await reader.call("specification_review_submit_batch", foreign, ["INVALID_INPUT", "CONFLICT"]);
  assert.equal(await fixture.digest(), before);
  const wrongSource = { ...batch, source_version: "0".repeat(64) };
  await reader.call("specification_review_submit_batch", wrongSource, "STALE_REVIEW");
  assert.equal(await fixture.digest(), before);
  const oversized = globalThis.structuredClone(batch);
  for (const item of oversized.items) {
    item.verdict = "gap";
    item.explanation = "x".repeat(4096);
    item.counterexample = "y".repeat(4096);
  }
  assert.ok(Buffer.byteLength(JSON.stringify(oversized)) > 131_072);
  await reader.call("specification_review_submit_batch", oversized, "INVALID_INPUT");
  assert.equal(await fixture.digest(), before);
  const saved = await reader.call("specification_review_submit_batch", batch);
  assert.equal(saved.saved, true);
  const conflict = globalThis.structuredClone(batch);
  conflict.items[0].explanation = "Conflicting simulation verdict.";
  await reader.call("specification_review_submit_batch", conflict, ["CONFLICT", "INVALID_STATE"]);
  assert.equal((await reader.call("specification_review_status", {
    review_ref: fixture.review.review_ref,
  })).recorded_items, batch.items.length);
});

test("a lost saved response replays after restart and beyond the generic 64-receipt window", async (t) => {
  const fixture = await reviewWorkflowFixture(t);
  const launcher = await fixture.actor("replay-launcher-simulation");
  const prepared = await fixture.prepare(launcher);
  const reader = await fixture.openActor("lost-reply-judge-simulation", "after-save");
  const batch = await fixture.batch(reader, prepared.args.lanes[0]);
  const lostResponse = reader.raw("specification_review_submit_batch", batch).catch(() => undefined);
  await reader.waitFor("SAVED_AFTER_CLEANUP");
  const observer = await fixture.openActor("saved-reply-observer-simulation");
  const saved = await observer.call("specification_review_status", { review_ref: fixture.review.review_ref });
  assert.equal(saved.recorded_items, batch.items.length);
  await reader.harness.close();
  await lostResponse;
  await fixture.finish();
  await fixture.author.call("specification_review_complete", { review_ref: fixture.review.review_ref });
  await writeFile(join(fixture.directory, "spec.md"), fixture.spec.replace("Status: Draft", "Status: Approved"));
  await fixture.author.call("specification_check_state");
  const tasks = join(fixture.directory, "tasks");
  await mkdir(tasks);
  await writeFile(join(tasks, "plan.md"), "# Fixture planning\n\n## Technical proposal\n\nUse the fixture contract.\n\n## Delivery\n");
  for (let index = 0; index < 70; index++) {
    await fixture.author.call("planning_question_prepare", {
      expected_source_version: fixture.review.source_version, kind: "free_text",
      text: "Simulation-only unrelated technical proposal " + index,
      proposals: [{ id: "simulation-" + index, packet_id: "SIM-" + index,
        requirement_ids: [fixture.ids[0]], sources: [{
          path: "docs/specs/fixture/tasks/plan.md", heading: "Technical proposal",
        }] }],
    });
  }
  await observer.harness.restart();
  const before = await fixture.digest();
  const response = await observer.raw("specification_review_submit_batch", batch);
  assert.notEqual(response.isError, true, JSON.stringify(response.structuredContent));
  assert.equal(response.structuredContent.result.saved, true);
  assert.equal(response.structuredContent.replayed, true);
  assert.equal(await fixture.digest(), before);
  await writeFile(join(fixture.directory, "spec.md"), fixture.spec + "\nA new obligation.\n");
  await observer.call("specification_review_submit_batch", batch, "STALE_REVIEW");
});

test("persistence failure never acknowledges a save", async (t) => {
  const fixture = await reviewWorkflowFixture(t);
  const launcher = await fixture.actor("failure-launcher-simulation");
  const prepared = await fixture.prepare(launcher);
  const reader = await fixture.openActor("failed-commit-judge-simulation", "fail-commit");
  const batch = await fixture.batch(reader, prepared.args.lanes[0]);
  const before = await fixture.digest();
  await reader.call("specification_review_submit_batch", batch, "INTERNAL_ERROR");
  assert.equal(await fixture.digest(), before);
  const observer = await fixture.openActor("failed-commit-observer-simulation");
  const status = await observer.call("specification_review_status", { review_ref: fixture.review.review_ref });
  assert.equal(status.recorded_items, 0);
});

test("bounded contention preserves a crash-held lock and cancellation stops an uncommitted waiter", async (t) => {
  const fixture = await reviewWorkflowFixture(t);
  const launcher = await fixture.actor("contention-launcher-simulation");
  const prepared = await fixture.prepare(launcher);
  const reader = await fixture.openActor("waiting-judge-simulation", "observe-cancel");
  const batch = await fixture.batch(reader, prepared.args.lanes[0]);
  const path = join(fixture.directory, "decisions.yaml.workflow-lock");
  const lock = await open(path, "wx");
  try {
    const started = performance.now();
    await reader.call("specification_review_submit_batch", batch, "BUSY");
    const elapsed = performance.now() - started;
    assert.ok(elapsed >= 4500 && elapsed < 8000, "Lock acquisition must have the agreed finite deadline.");
    assert.ok(await stat(path), "The server must not delete a crash-held lock.");
  } finally {
    await lock.close();
    await unlink(path);
  }
  const cancelled = await fixture.openActor("cancelled-judge-simulation", "observe-cancel");
  const controller = new globalThis.AbortController();
  const held = await open(path, "wx");
  try {
    const pending = cancelled.raw("specification_review_submit_batch", batch, { signal: controller.signal });
    const rejected = assert.rejects(pending);
    await cancelled.waitFor("LOCK_ATTEMPT");
    controller.abort();
    await cancelled.waitFor("CANCELLED");
    await cancelled.waitFor("SUBMISSION_SETTLED", 4000);
    await rejected;
    assert.ok(await stat(path));
  } finally {
    await held.close();
    await unlink(path);
  }
  const observer = await fixture.openActor("cancelled-observer-simulation");
  const status = await observer.call("specification_review_status", { review_ref: fixture.review.review_ref });
  assert.equal(status.recorded_items, 0);
});
