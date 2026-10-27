import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { parse } from "yaml";
import { reviewWorkflowFixture } from "../test-support/review-workflow-fixture.mjs";

const reason = "Some saved judgments used compressed summaries after context compaction instead of complete original evidence.";

async function ledger(fixture) {
  return parse(await readFile(join(fixture.directory, "decisions.yaml"), "utf8"));
}

async function saveItem(fixture, reader, index) {
  const read = await fixture.readItem(reader, index);
  return reader.call("specification_review_record", {
    review_ref: fixture.review.review_ref,
    ...fixture.verdict(index, read),
  });
}

async function restart(fixture, extra = {}, error) {
  return fixture.author.call("specification_review_restart", {
    review_ref: fixture.review.review_ref,
    source_version: fixture.review.source_version,
    reason,
    ...extra,
  }, error);
}

test("audit restart withdraws an unfinished full review without changing inputs or its history", async (t) => {
  const requirementText = "Return the requested fixture value. " + "Exact input text is preserved. ".repeat(600);
  const fixture = await reviewWorkflowFixture(t, { requirements: 4, independentSources: true, requirementText });
  for (let index = 0; index < 3; index++) await saveItem(fixture, fixture.author, index);
  const original = fixture.review;
  const before = await ledger(fixture);
  const originalRun = before.specification_reviews.runs.at(-1);
  const oldRead = await fixture.readItem(fixture.author, 3);
  const oldContextPage = await fixture.author.call("specification_review_get", {
    review_ref: original.review_ref, item_index: original.total_items - 1,
  });
  assert.ok(oldContextPage.next_cursor);
  const fresh = await restart(fixture);

  assert.notEqual(fresh.review_ref, original.review_ref);
  assert.equal(fresh.source_version, original.source_version);
  assert.equal(fresh.recorded_items, 0);
  assert.equal(fresh.next_item_index, 0);
  assert.equal(fresh.consistency_required, true);
  assert.equal(fresh.previous_review_ref, original.review_ref);
  assert.equal(fresh.reason, reason);
  const after = await ledger(fixture);
  assert.equal(after.specification_reviews.runs.length, 2);
  assert.deepEqual(after.specification_reviews.runs[0], originalRun);
  const newRun = after.specification_reviews.runs[1];
  assert.equal(newRun.input_snapshot, originalRun.input_snapshot);
  assert.equal(newRun.specification_version, originalRun.specification_version);
  assert.deepEqual(newRun.audit_restart, { previous_review_ref: original.review_ref, reason });
  assert.deepEqual(newRun.results, []);
  const auditor = await fixture.openActor("fresh-audit-reader");
  const auditStatus = await auditor.call("specification_review_status", { review_ref: fresh.review_ref });
  assert.deepEqual(auditStatus.audit_restart, { previous_review_ref: original.review_ref, reason });
  assert.match(await readFile(join(fixture.directory, "spec.md"), "utf8"), /Status: Draft/u);

  const historical = await fixture.author.call("specification_review_status", { review_ref: original.review_ref });
  assert.equal(historical.coverage_status, "stale");
  assert.equal(historical.audit_status, "superseded");
  assert.equal(historical.superseded_by, fresh.review_ref);
  assert.equal(historical.recorded_items, 3);
  assert.equal(historical.next_item_index, null);
  await fixture.author.call("specification_review_record", {
    review_ref: original.review_ref, ...fixture.verdict(3, oldRead),
  }, "INVALID_STATE");
  await fixture.author.call("specification_review_complete", { review_ref: original.review_ref }, "INVALID_STATE");

  fixture.selectReview(fresh);
  await fixture.author.call("specification_review_get", {
    review_ref: fresh.review_ref, item_index: fresh.total_items - 1, cursor: oldContextPage.next_cursor,
  }, "STALE_CURSOR");
  await fixture.author.call("specification_review_record", {
    review_ref: fresh.review_ref, ...fixture.verdict(3, oldRead),
  }, "INCOMPLETE_READ");
  await fixture.author.call("specification_review_complete", { review_ref: fresh.review_ref }, "INCOMPLETE_REVIEW");
  const prepared = await fixture.prepare(fixture.author);
  assert.equal(prepared.status, "ready_to_run");
  assert.equal(prepared.saved_items, 0);
  assert.equal(prepared.remaining_items, fresh.total_items - 1);
  await saveItem(fixture, fixture.author, 3);
  assert.equal((await fixture.author.call("specification_review_status", { review_ref: fresh.review_ref })).recorded_items, 1);
  assert.equal((await fixture.author.call("specification_check_state")).coverage_status, "pending");
});

test("audit restart also withdraws saved consistency and completion-only recovery", async (t) => {
  const fixture = await reviewWorkflowFixture(t, { requirements: 1 });
  await fixture.finish();
  const original = fixture.review;
  const oldFinal = await fixture.readItem(fixture.author, original.total_items - 1);
  assert.equal((await fixture.prepare(fixture.author)).next_stage, "completion_only");
  const before = await ledger(fixture);
  const fresh = await restart(fixture);
  fixture.selectReview(fresh);
  assert.equal((await fixture.prepare(fixture.author)).status, "ready_to_run");
  for (let index = 0; index < fresh.total_items - 1; index++) await saveItem(fixture, fixture.author, index);
  await fixture.author.call("specification_review_consistency_record", {
    review_ref: fresh.review_ref, read_receipt: oldFinal.last.consistency_read_receipt,
    verdict: "consistent", explanation: "Simulation-only obsolete whole-context read.",
  }, "INCOMPLETE_READ");
  assert.deepEqual((await ledger(fixture)).specification_reviews.runs[0], before.specification_reviews.runs[0]);
});

test("the reported 80-of-95 case becomes a fresh 0-of-95 full review with preserved audit history", async (t) => {
  const fixture = await reviewWorkflowFixture(t, { requirements: 45, independentSources: true, idPrefix: "REQ" });
  await fixture.author.call("decision_record_instruction", {
    category: "fixture", kind: "initial_request", text: "Simulation-only supporting source for the first requirement.",
    source: "fixture:audit-recovery", requirement_ids: [fixture.ids[0]],
  });
  await fixture.author.call("decision_record_instruction", {
    category: "fixture", kind: "initial_request", text: "Simulation-only independent confirmation of the first requirement.",
    source: "fixture:audit-recovery", requirement_ids: [fixture.ids[0]],
  });
  const current = await fixture.author.call("specification_review_start", { require_consistency: true });
  fixture.selectReview(current);
  assert.equal(current.total_items, 95);
  for (let index = 0; index < 80; index++) await saveItem(fixture, fixture.author, index);
  const before = await ledger(fixture);
  const oldReceipt = await fixture.readItem(fixture.author, 60);
  const fresh = await restart(fixture);
  assert.equal(fresh.total_items, 95);
  assert.equal(fresh.recorded_items, 0);
  assert.equal(fresh.next_item_index, 0);
  const after = await ledger(fixture);
  assert.deepEqual(after.specification_reviews.runs.slice(0, -1), before.specification_reviews.runs);
  fixture.selectReview(fresh);
  await fixture.author.call("specification_review_record", {
    review_ref: fresh.review_ref, ...fixture.verdict(60, oldReceipt),
  }, "INCOMPLETE_READ");
  await saveItem(fixture, fixture.author, 60);
  const status = await fixture.author.call("specification_review_status", { review_ref: fresh.review_ref });
  assert.equal(status.recorded_items, 1);
  assert.equal(status.coverage_status, "pending");
  assert.equal(status.consistency_status, "pending");
});

test("an identical audit restart retry reuses the same generation and preserves newly saved work", async (t) => {
  const fixture = await reviewWorkflowFixture(t, { requirements: 1 });
  const original = fixture.review;
  const fresh = await restart(fixture);
  fixture.selectReview(fresh);
  await saveItem(fixture, fixture.author, 0);
  const before = await fixture.digest();
  const replay = await fixture.author.call("specification_review_restart", {
    review_ref: original.review_ref, source_version: original.source_version, reason,
  });
  assert.equal(replay.review_ref, fresh.review_ref);
  assert.equal(replay.recorded_items, 1);
  assert.equal(await fixture.digest(), before);
  assert.equal((await ledger(fixture)).specification_reviews.runs.length, 2);
});

test("audit restart validates cause, source pin and current review before any journal write", async (t) => {
  const fixture = await reviewWorkflowFixture(t, { requirements: 1 });
  const before = await fixture.digest();
  await restart(fixture, { reason: "   " }, "INVALID_INPUT");
  await restart(fixture, { source_version: "0".repeat(64) }, "STALE_REVIEW");
  await restart(fixture, { review_ref: "another-review" }, "NOT_FOUND");
  assert.equal(await fixture.digest(), before);
});

test("an exact restart request replay reports current successor progress after a server restart", async (t) => {
  const fixture = await reviewWorkflowFixture(t, { requirements: 1 });
  const request = {
    context: fixture.author.context(), review_ref: fixture.review.review_ref,
    source_version: fixture.review.source_version, reason,
  };
  const fresh = await fixture.author.call("specification_review_restart", request);
  fixture.selectReview(fresh);
  await saveItem(fixture, fixture.author, 0);
  const before = await fixture.digest();
  await fixture.author.harness.restart();
  const replay = await fixture.author.call("specification_review_restart", request);
  assert.equal(replay.review_ref, fresh.review_ref);
  assert.equal(replay.recorded_items, 1);
  assert.equal(replay.next_item_index, 1);
  assert.equal(await fixture.digest(), before);
});

test("an exact restart request replay cannot revive a superseded generation", async (t) => {
  const fixture = await reviewWorkflowFixture(t, { requirements: 1 });
  const request = {
    context: fixture.author.context(), review_ref: fixture.review.review_ref,
    source_version: fixture.review.source_version, reason,
  };
  const first = await fixture.author.call("specification_review_restart", request);
  fixture.selectReview(first);
  const second = await restart(fixture);
  const before = await fixture.digest();
  await fixture.author.call("specification_review_restart", request, "INVALID_STATE");
  assert.equal(await fixture.digest(), before);
  const status = await fixture.author.call("specification_review_status", { review_ref: first.review_ref });
  assert.equal(status.superseded_by, second.review_ref);
});

test("restart retries reject a successor replaced by an ordinary full-mode change", async (t) => {
  const fixture = await reviewWorkflowFixture(t, { requirements: 1 });
  const request = {
    context: fixture.author.context(), review_ref: fixture.review.review_ref,
    source_version: fixture.review.source_version, reason,
  };
  await fixture.author.call("specification_review_restart", request);
  await fixture.author.call("specification_review_start", { mode: "full" });
  const before = await fixture.digest();
  const currentRequest = { ...request, context: fixture.author.context() };
  await fixture.author.call("specification_review_restart", currentRequest, "INVALID_STATE");
  await fixture.author.call("specification_review_restart", request, "INVALID_STATE");
  assert.equal(await fixture.digest(), before);
});

test("an exact restart request replay rejects changed authoritative inputs", async (t) => {
  const fixture = await reviewWorkflowFixture(t, { requirements: 1 });
  const request = {
    context: fixture.author.context(), review_ref: fixture.review.review_ref,
    source_version: fixture.review.source_version, reason,
  };
  await fixture.author.call("specification_review_restart", request);
  const specPath = join(fixture.directory, "spec.md");
  const content = await readFile(specPath, "utf8");
  await writeFile(specPath, content + "\nAdditional simulation-only constraint.\n");
  const before = await fixture.digest();
  await fixture.author.call("specification_review_restart", request, "STALE_REVIEW");
  assert.equal(await fixture.digest(), before);
});

test("audit restart is advertised with explicit review, source and reason provenance", async (t) => {
  const fixture = await reviewWorkflowFixture(t, { requirements: 1 });
  const client = await fixture.author.harness.start();
  const tools = (await client.listTools()).tools;
  const restartTool = tools.find((entry) => entry.name === "specification_review_restart");
  assert.ok(restartTool);
  assert.match(restartTool.description, /unfinished FULL/iu);
  const properties = restartTool.inputSchema.properties;
  for (const key of ["context", "review_ref", "source_version", "reason"]) {
    assert.ok(properties[key].description?.trim(), key);
    assert.ok(restartTool.inputSchema.required.includes(key), key);
  }
  assert.equal(restartTool.inputSchema.additionalProperties, false);
  const response = await client.callTool({ name: "workflow_runtime_info", arguments: {} });
  assert.notEqual(response.isError, true);
  assert.ok(response.structuredContent.result.capabilities.includes("specification_review_restart"));
});

test("the restarted enhanced full still requires fresh whole-context consistency before completion", async (t) => {
  const fixture = await reviewWorkflowFixture(t, { requirements: 1 });
  const fresh = await restart(fixture);
  fixture.selectReview(fresh);
  for (let index = 0; index < fresh.total_items - 1; index++) await saveItem(fixture, fixture.author, index);
  await fixture.author.call("specification_review_complete", { review_ref: fresh.review_ref }, "CONSISTENCY_REQUIRED");
  const final = await fixture.readItem(fixture.author, fresh.total_items - 1);
  await fixture.author.call("specification_review_consistency_record", {
    review_ref: fresh.review_ref, read_receipt: final.last.consistency_read_receipt,
    verdict: "consistent", explanation: "Simulation-only fresh full-context assessment after audit restart.",
  });
  const completed = await fixture.author.call("specification_review_complete", { review_ref: fresh.review_ref });
  assert.equal(completed.coverage_status, "reviewed");
  assert.match(await readFile(join(fixture.directory, "spec.md"), "utf8"), /Status: Draft/u);
  const before = await fixture.digest();
  await restart(fixture, {}, "INVALID_STATE");
  assert.equal(await fixture.digest(), before);
});
