import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { reviewWorkflowFixture } from "../packages/engineer-agent-workflow-mcp/test-support/review-workflow-fixture.mjs";
import { createReviewProtocolRunner, readCorrectionEvidence } from "./lib/specification-review-protocol.mjs";

async function generatedWorkflowUsesRealMcpAndIndependentDirectSubmittingProcesses(t) {
  const fixture = await reviewWorkflowFixture(t, { requirements: 26 });
  const runner = await createReviewProtocolRunner(fixture);
  const result = await runner.run();
  assert.equal(result.status, "completed");
  assert.equal(result.outcome, "reviewed");
  assert.equal(result.workflow.status, "incomplete");
  assert.equal(result.workflow.next_action, "verify_review_completion");
  const observer = await fixture.openActor("p03-fresh-observer-simulation");
  const status = await observer.call("specification_review_status", { review_ref: fixture.review.review_ref });
  assert.equal(status.coverage_status, "reviewed");
  assert.equal(status.recorded_items, fixture.review.total_items);
  assert.ok(runner.actors.length >= 3, "Parent, independent detailed judges and final judge use separate MCP processes.");
  const submissions = runner.trace.filter((event) => event.kind === "call" && event.name === "specification_review_submit_batch");
  assert.ok(submissions.length > 0);
  for (const submission of submissions) {
    assert.equal(submission.role, "detailed");
    for (const index of submission.indices) {
      assert.ok(runner.trace.some((event) => event.kind === "read-complete"
        && event.actor === submission.actor && event.item_index === index));
    }
  }
  const detailedActors = runner.actors.filter((actor) => actor.role === "detailed");
  for (const actor of detailedActors) {
    assert.ok(Array.isArray(actor.acknowledgments));
    assert.ok(actor.acknowledgments.length > 0);
    assert.ok(actor.acknowledgments.every((ack) => ack.result.saved === true
      && ack.result.review_ref === fixture.review.review_ref && ack.result.source_version === fixture.review.source_version));
  }
  for (const acknowledgment of runner.trace.filter((event) => event.kind === "ack")) {
    function earlierMatchingSave(event) {
      return event.kind === "saved" && event.actor === acknowledgment.actor && event.seq < acknowledgment.seq
        && event.indices.join(",") === acknowledgment.indices.join(",");
    }
    assert.ok(runner.trace.some(earlierMatchingSave), "An ACK cannot precede its real saved MCP response.");
  }
}
test("generated workflow completes through real MCP with independent direct-submitting processes", { timeout: 120_000 }, generatedWorkflowUsesRealMcpAndIndependentDirectSubmittingProcesses);

function deferred(t) {
  let release;
  function register(resolve) { release = resolve; }
  const promise = new Promise(register);
  t.after(release);
  return { promise, release };
}

async function publicStatus(fixture) {
  const observer = await fixture.openActor("p03-observer-simulation");
  return observer.call("specification_review_status", { review_ref: fixture.review.review_ref });
}

async function completeWithKnownMetadataRecovery(fixture, runner) {
  const deadline = Date.now() + 60_000;
  let previousSaved = 0;
  for (;;) {
    const checkpoint = runner.trace.length;
    const result = await runner.run();
    if (result.status === "completed") return result;
    const events = runner.trace.slice(checkpoint);
    const blocked = events.filter((event) => event.kind === "preparation-blocked");
    const errors = events.filter((event) => event.kind === "actor-error");
    const diagnostic = { status: result.status, reason: result.reason, blocked, errors };
    assert.ok(blocked.length > 0, JSON.stringify(diagnostic));
    assert.ok(blocked.every((event) => event.codes.includes("CONFLICT")));
    assert.deepEqual(errors, []);
    assert.equal(result.progress.unknown_items, 0);
    const status = await publicStatus(fixture);
    assert.ok(status.recorded_items > previousSaved);
    previousSaved = status.recorded_items;
    assert.equal(result.prepared.result.review_ref, fixture.review.review_ref);
    assert.ok(Date.now() < deadline);
  }
}

async function preparationAndActualHostChecksControlDispatchForBothFormats(t) {
  for (const host of ["harness", "claude"]) {
    const fixture = await reviewWorkflowFixture(t, { requirements: 2 });
    const runner = await createReviewProtocolRunner(fixture, { host });
    const before = await fixture.digest();
    for (const settings of [{ available: false }, { routes: false }, { target: { source_version: "0".repeat(64) } }]) {
      const checkpoint = runner.trace.length;
      const result = await runner.run(settings);
      assert.equal(result.status, "incomplete");
      const events = runner.trace.slice(checkpoint);
      assert.equal(events.filter((event) => event.kind === "native-start").length, 0);
      assert.equal(events.filter((event) => event.kind === "actor-start").length, 0);
      const parentCalls = events.filter((event) => event.kind === "call" && event.role === "parent");
      assert.deepEqual(parentCalls.map((event) => event.name), ["specification_review_prepare_workflow"]);
      assert.equal(await fixture.digest(), before);
    }
    assert.equal((await runner.run()).status, "completed");
    const bundle = host === "claude" ? join("plugins", "claude-code", "engineer-agent-workflows") : join("exports", "deepseek-harness");
    const children = runner.actors.filter((actor) => actor.role !== "parent");
    assert.ok(children.every((actor) => actor.job.reviewer_reference.includes(bundle)));
    const checkpoint = runner.trace.length;
    const completed = await runner.run();
    assert.equal(completed.status, "completed");
    assert.equal(completed.outcome, "reviewed");
    const events = runner.trace.slice(checkpoint);
    assert.equal(events.filter((event) => event.kind === "native-start").length, 0);
    assert.equal(events.filter((event) => event.kind === "call").length, 1);
  }
}
test("real preparation and separate host checks gate both generated native formats without side effects", { timeout: 120_000 }, preparationAndActualHostChecksControlDispatchForBothFormats);

async function moreThan160ItemsAdvancePastAHeldSavedAcknowledgmentWithoutParentPolling(t) {
  const fixture = await reviewWorkflowFixture(t, { requirements: 175 });
  const hold = deferred(t);
  const initialSaves = deferred(t);
  const overlappingRequests = deferred(t);
  const readyLanes = new Set();
  const firstSavedLanes = new Set();
  async function overlapFirstSubmissions({ job }) {
    if (readyLanes.has(job.lane)) return;
    readyLanes.add(job.lane);
    if (readyLanes.size === 4) overlappingRequests.release();
    await overlappingRequests.promise;
  }
  async function holdFirstSavedResponse({ job }) {
    if (firstSavedLanes.has(job.lane)) return;
    firstSavedLanes.add(job.lane);
    if (firstSavedLanes.size === 4) initialSaves.release();
    await initialSaves.promise;
    if (job.lane !== 1) await hold.promise;
  }
  const runner = await createReviewProtocolRunner(fixture, {
    beforeSubmit: overlapFirstSubmissions, afterSave: holdFirstSavedResponse,
  });
  const running = runner.run();
  let pendingFailure;
  try {
    await runner.waitFor((event) => event.kind === "saved" && event.lane === 0);
    function anotherLaneAdvanced(event) {
      return event.kind === "group" && event.lane !== 0
        && runner.trace.filter((candidate) => candidate.kind === "group" && candidate.lane === event.lane).length >= 2;
    }
    await runner.waitFor(anotherLaneAdvanced, 30_000);
    assert.equal(firstSavedLanes.size, 4);
    assert.equal(runner.trace.some((event) => event.kind === "actor-start" && event.role === "final"), false);
    assert.equal(runner.trace.some((event) => event.kind === "native-end"), false);
    const start = runner.trace.find((event) => event.kind === "native-start");
    const parentCallsWhilePending = runner.trace.filter((event) => event.seq > start.seq && event.kind === "call" && event.role === "parent");
    assert.deepEqual(parentCallsWhilePending, []);
    assert.ok((await publicStatus(fixture)).recorded_items > 0, "Held ACK effects are already durably visible to a fresh process.");
  } catch (error) {
    pendingFailure = error;
  } finally {
    overlappingRequests.release();
    initialSaves.release();
    hold.release();
  }
  let result = await running;
  if (pendingFailure) throw pendingFailure;
  const workload = result.prepared.result.args.workload;
  const deadline = Date.now() + 60_000;
  let savedCount = 0;
  while (result.status !== "completed") {
    const blocked = runner.trace.filter((event) => event.kind === "preparation-blocked");
    assert.ok(blocked.length > 0, "Only a real concurrent-read conflict permits a recovery invocation here.");
    assert.ok(blocked.every((event) => event.codes.includes("CONFLICT")));
    assert.deepEqual(runner.trace.filter((event) => event.kind === "actor-error"), []);
    assert.equal(result.progress.unknown_items, 0);
    const status = await publicStatus(fixture);
    assert.ok(status.recorded_items > savedCount, "Every interrupted pass must retain real saved progress.");
    savedCount = status.recorded_items;
    const failed = runner.actors.find((actor) => actor.identity === blocked.at(-1).actor);
    const observer = await fixture.actor("p03-stable-old-cursor-simulation");
    const sameCursor = await fixture.prepare(observer, { cursor: failed.job.metadata_cursor });
    assert.equal(sameCursor.status, "ready_to_run", "Other saves must not invalidate the retained allocation cursor.");
    assert.ok(Date.now() < deadline);
    result = await runner.run();
    assert.equal(result.prepared.result.review_ref, fixture.review.review_ref);
  }
  assert.ok(workload.pending_items > 160);
  assert.equal(workload.lane_count, 4);
  const firstSubmissions = runner.trace.filter((event) => event.kind === "call" && event.name === "specification_review_submit_batch").slice(0, 4);
  const firstSaveReply = runner.trace.find((event) => event.kind === "response" && event.name === "specification_review_submit_batch");
  assert.equal(new Set(firstSubmissions.map((event) => event.actor)).size, 4);
  assert.ok(firstSubmissions.every((event) => event.seq < firstSaveReply.seq));
  const detailed = runner.reads.filter((read) => read.kind === "detailed");
  assert.equal(new Set(detailed.map((read) => read.item_index)).size, workload.pending_items);
  const savedIndices = runner.trace.filter((event) => event.kind === "saved").flatMap((event) => event.indices);
  assert.equal(savedIndices.length, workload.pending_items);
  assert.equal(new Set(savedIndices).size, savedIndices.length);
  const finalStart = runner.trace.find((event) => event.kind === "actor-start" && event.role === "final");
  const acknowledgments = runner.trace.filter((event) => event.kind === "ack");
  assert.ok(acknowledgments.every((event) => event.seq < finalStart.seq));
  const nativeEnd = runner.trace.findLast((event) => event.kind === "native-end");
  const verification = runner.trace.filter((event) => event.kind === "call" && event.role === "parent" && event.seq > nativeEnd.seq);
  assert.deepEqual(verification.map((event) => event.name), ["specification_review_prepare_workflow"]);
  assert.equal((await publicStatus(fixture)).recorded_items, fixture.review.total_items);
}
test("more than 160 items advance past a held saved ACK with independent lanes, final JOIN and zero parent polling", { timeout: 120_000 }, moreThan160ItemsAdvancePastAHeldSavedAcknowledgmentWithoutParentPolling);

async function sourceDriftAfterPreparationOrBeforeSubmissionCannotBecomeCompletion(t) {
  for (const boundary of ["launch", "submission"]) {
    const fixture = await reviewWorkflowFixture(t, { requirements: 3 });
    let changed = false;
    async function changeSourceOnce() {
      if (changed) return;
      changed = true;
      await writeFile(join(fixture.directory, "spec.md"), fixture.spec + "\nRetain a newly changed obligation.\n");
    }
    const settings = boundary === "launch" ? { beforeLaunch: changeSourceOnce } : { beforeSubmit: changeSourceOnce };
    const runner = await createReviewProtocolRunner(fixture, settings);
    const result = await runner.run();
    assert.notEqual(result.status, "completed");
    assert.equal(runner.trace.some((event) => event.kind === "actor-start" && event.role === "final"), false);
    assert.equal((await publicStatus(fixture)).recorded_items, 0);
    const observer = await fixture.actor("p03-stale-preparation-simulation");
    assert.equal((await fixture.prepare(observer)).status, "blocked");
    await fixture.author.call("specification_open", { project: fixture.project, specification: fixture.specification });
    const review = await fixture.author.call("specification_review_start", { mode: "full", require_consistency: true });
    fixture.selectReview(review);
    const resumed = await runner.run();
    assert.equal(resumed.status, "completed");
    assert.equal(resumed.prepared.result.review_ref, review.review_ref);
  }
}
test("source drift after preparation and before direct submission stays incomplete and new invocation prepares afresh", { timeout: 120_000 }, sourceDriftAfterPreparationOrBeforeSubmissionCannotBecomeCompletion);

async function committedButUnacknowledgedGroupsRecoverWithoutReadingSavedItemsAgain(t) {
  const fixture = await reviewWorkflowFixture(t, { requirements: 80 });
  let lost = false;
  async function loseOneAcknowledgment() {
    if (lost) return;
    lost = true;
    throw Object.assign(new Error("Simulation-only loss after an actual saved MCP response."), { name: "AbortError" });
  }
  const runner = await createReviewProtocolRunner(fixture, { afterSave: loseOneAcknowledgment });
  const interrupted = await runner.run();
  assert.notEqual(interrupted.status, "completed");
  assert.ok(interrupted.progress.unknown_items > 0);
  const saved = new Set(runner.trace.filter((event) => event.kind === "saved").flatMap((event) => event.indices));
  assert.ok(saved.size > 0);
  assert.equal((await publicStatus(fixture)).recorded_items, saved.size);
  const start = runner.reads.length;
  const resumed = await runner.run();
  assert.equal(resumed.status, "completed");
  const rereads = runner.reads.slice(start).filter((read) => read.kind === "detailed");
  assert.ok(rereads.every((read) => !saved.has(read.item_index)));
  assert.equal((await publicStatus(fixture)).recorded_items, fixture.review.total_items);
}
test("unknown saved effects recover through actual preparation without overwriting or rereading saved items", { timeout: 120_000 }, committedButUnacknowledgedGroupsRecoverWithoutReadingSavedItemsAgain);

async function finalInterruptionsDistinguishFreshAssessmentCompletionOnlyAndCompletedState(t) {
  for (const boundary of ["beforeConsistency", "afterConsistency", "afterCompletion"]) {
    const fixture = await reviewWorkflowFixture(t, { requirements: 2 });
    let interrupted = false;
    async function interruptOnce() {
      if (interrupted) return;
      interrupted = true;
      throw new Error("Simulation-only final operation interruption.");
    }
    const runner = await createReviewProtocolRunner(fixture, { [boundary]: interruptOnce, finalVerdict: "gap" });
    const first = await runner.run();
    assert.notEqual(first.status, "completed");
    const start = runner.trace.length;
    const recovered = await runner.run();
    assert.equal(recovered.status, "completed");
    assert.equal(recovered.outcome, "gaps");
    const starts = runner.trace.slice(start).filter((event) => event.kind === "actor-start");
    assert.equal(starts.filter((event) => event.role === "detailed").length, 0);
    assert.equal(starts.filter((event) => event.role === "final").length, boundary === "beforeConsistency" ? 1 : 0);
    const markdown = await readFile(join(fixture.directory, "spec.md"), "utf8");
    assert.equal(markdown, fixture.spec);
  }
}
test("final interruption before save, after consistency and after completion preserves the actual negative outcome", { timeout: 120_000 }, finalInterruptionsDistinguishFreshAssessmentCompletionOnlyAndCompletedState);

async function separateTargetsKeepStateAndReceiptsIndependent(t) {
  const left = await reviewWorkflowFixture(t, { requirements: 4 });
  const right = await reviewWorkflowFixture(t, { requirements: 4 });
  const first = await createReviewProtocolRunner(left, { batchSize: 1 });
  const second = await createReviewProtocolRunner(right, { batchSize: 2 });
  const rightReader = await right.openActor("p03-right-receipt-simulation");
  const read = await right.readItem(rightReader, 0);
  const foreign = await left.openActor("p03-foreign-receipt-simulation");
  await foreign.call("specification_review_record", {
    review_ref: left.review.review_ref, item_index: 0, read_receipt: read.last.read_receipt,
    verdict: "covered", explanation: "Simulation-only foreign receipt attempt.",
  }, "INCOMPLETE_READ");
  await rightReader.call("specification_review_record", {
    review_ref: right.review.review_ref, ...right.verdict(0, read),
  });
  const results = await Promise.all([first.run(), second.run()]);
  assert.ok(results.every((result) => result.status === "completed"));
  assert.notEqual(left.review.review_ref, right.review.review_ref);
  for (const [runner, fixture] of [[first, left], [second, right]]) {
    assert.ok(runner.reads.every((read) => read.target.project === fixture.project
      && read.target.review_ref === fixture.review.review_ref));
    assert.equal((await publicStatus(fixture)).recorded_items, fixture.review.total_items);
  }
}
test("separate real target projects never share workflow state or accept foreign receipts", { timeout: 120_000 }, separateTargetsKeepStateAndReceiptsIndependent);

async function largeUnicodeSourcesRetainBothPartialAmendmentsAndAll26Requirements(t) {
  const requirementText = "Retain 🧪 漢字 \\\"quoted\\\" \\ path and reject an empty name. ".repeat(65);
  const fixture = await reviewWorkflowFixture(t, { requirements: 26, requirementText, concurrency: 2 });
  const originalText = "Preserve RETAINED-CLAUSE-42 and every earlier obligation.\n" + "Original 🧪 \\ \"quoted\" text.\n".repeat(250);
  const original = await fixture.author.call("decision_record_instruction", {
    category: "behavior", kind: "initial_request", text: originalText,
    source: "fixture-customer:large-original", requirement_ids: fixture.ids,
  });
  const amendments = ["Change only the label; retain all earlier obligations.", "Add a final condition; retain the earlier correction."];
  let predecessor = original.decision_ref;
  for (const text of amendments) {
    const amended = await fixture.author.call("decision_record_instruction", {
      category: "behavior", kind: "user_edit", text,
      source: "fixture-customer:partial-correction", requirement_ids: fixture.ids, related_decisions: [predecessor],
    });
    predecessor = amended.decision_ref;
  }
  const review = await fixture.author.call("specification_review_start", { mode: "full", require_consistency: true });
  fixture.selectReview(review);
  let ordinary;
  async function obtainOrdinaryExactEvidence() {
    const reader = await fixture.openActor("p03-ordinary-exact-reader-simulation");
    for (let index = 0; index < fixture.review.total_items - 1; index += 1) {
      const read = await fixture.readItem(reader, index);
      if (read.payload.source?.instruction?.text === amendments[1]) {
        ordinary = read;
        break;
      }
    }
    assert.ok(ordinary);
  }
  function simulatedRetainedClauseFinding(read) {
    if (read.payload.kind !== "requirement" || read.payload.source.id !== fixture.ids[0]) return {};
    return { verdict: "gap", explanation: "Simulation-only retained clause omission with unchanged requirement IDs.",
      counterexample: "The fixture requirement omits RETAINED-CLAUSE-42." };
  }
  const runner = await createReviewProtocolRunner(fixture, {
    beforeLaunch: obtainOrdinaryExactEvidence, judge: simulatedRetainedClauseFinding,
  });
  const result = await runner.run({ programmatic: true });
  assert.equal(result.status, "completed");
  assert.equal(result.outcome, "gaps");
  assert.equal(result.prepared.result.args.workload.lane_count, 2);
  const heavy = runner.trace.filter((event) => event.kind === "group" && event.weight > 20);
  assert.ok(heavy.length > 0);
  assert.ok(heavy.every((event) => event.indices.length === 1));
  const exact = runner.reads.find((read) => read.payload.source?.instruction?.text === amendments[1]);
  assert.ok(exact.portions > 1);
  assert.equal(exact.text, ordinary.body);
  assert.equal(exact.payload.requirements.length, 26);
  assert.ok(exact.payload.related_sources.some((entry) => entry.instruction?.text === originalText));
  assert.ok(exact.payload.related_sources.some((entry) => entry.instruction?.text === amendments[0]));
  assert.equal(result.workflow.final_pagination, "programmatic");
}
test("large Unicode originals, two partial amendments and 26 retained IDs reconstruct exactly across reading paths", { timeout: 120_000 }, largeUnicodeSourcesRetainBothPartialAmendmentsAndAll26Requirements);

async function completedFindingsAndCorrection(t) {
  const fixture = await reviewWorkflowFixture(t, { requirements: 35, independentSources: true });
  function simulatedMissingCondition(read) {
    if (read.payload.kind !== "requirement" || read.payload.source.id !== fixture.ids[0]) return {};
    return { verdict: "gap", explanation: "Simulation-only missing empty-input rule.",
      counterexample: "An empty fixture value is accepted." };
  }
  const first = await createReviewProtocolRunner(fixture, { judge: simulatedMissingCondition });
  const firstResult = await completeWithKnownMetadataRecovery(fixture, first);
  assert.equal(firstResult.outcome, "gaps");
  const parent = fixture.review;
  const corrected = fixture.spec.replace("Return the requested fixture value.", "Return the requested fixture value and reject an empty input.");
  await writeFile(join(fixture.directory, "spec.md"), corrected);
  const evidence = await readCorrectionEvidence(fixture, parent.review_ref);
  assert.equal(evidence.navigation.eligible, true);
  assert.equal(evidence.navigation.entries.length, evidence.navigation.counts.total_entries);
  const finding = evidence.navigation.entries.find((entry) => entry.kind === "finding" && entry.item_key === `requirement:${fixture.ids[0]}`);
  const changes = evidence.navigation.entries.filter((entry) => entry.kind === "change");
  assert.ok(finding);
  assert.ok(evidence.records.get(finding.evidence_selector).counterexample);
  for (const change of changes) {
    assert.ok(evidence.records.has(change.before_evidence_selector));
    assert.ok(evidence.records.has(change.after_evidence_selector));
  }
  const followup = await fixture.author.call("specification_review_followup_start", {
    review_ref: parent.review_ref, changes_receipt: evidence.changes_receipt,
    fixes: [{ finding_key: finding.finding_key, changed_item_keys: changes.map((change) => change.item_key),
      explanation: "Restore the missing fixture empty-input rule." }],
  });
  fixture.selectReview(followup);
  return { fixture, parent, followup, evidence, corrected };
}

async function correctionsRunOnlyMandatoryItemsAndKeepCarriedEvidenceHistorical(t) {
  const { fixture, parent, followup, corrected } = await completedFindingsAndCorrection(t);
  assert.ok(followup.carried_items > 0);
  assert.ok(followup.required_items < fixture.review.total_items - 1);
  const runner = await createReviewProtocolRunner(fixture);
  const result = await runner.run();
  assert.equal(result.status, "completed");
  assert.equal(result.outcome, "reviewed");
  const detailed = runner.reads.filter((read) => read.kind === "detailed").map((read) => read.item_index).sort((a, b) => a - b);
  assert.deepEqual(detailed, [...followup.required_item_indices].sort((a, b) => a - b));
  const finalResults = runner.reads.filter((read) => read.kind === "required-result");
  assert.deepEqual(finalResults.map((read) => read.item_index).sort((a, b) => a - b), detailed);
  assert.ok(finalResults.every((read) => read.last.recorded_result && !read.last.recorded_result.carried_from));
  const whole = runner.reads.find((read) => read.kind === "consistency");
  assert.ok(whole.text.includes(fixture.ids.at(-1)));
  assert.ok(whole.text.includes("missing empty-input rule"));
  const observer = await fixture.openActor("p03-carried-observer-simulation");
  const required = new Set(followup.required_item_indices);
  let carried;
  for (let index = 0; index < followup.total_items - 1; index += 1) {
    if (required.has(index)) continue;
    carried = await fixture.readItem(observer, index);
    if (carried.last.recorded_result?.carried_from) break;
  }
  assert.equal(carried.last.recorded_result.carried_from.review_ref, parent.review_ref);
  assert.equal(await readFile(join(fixture.directory, "spec.md"), "utf8"), corrected);
}
test("full findings and exact correction evidence lead to pending-only native followup with historical carried provenance", { timeout: 120_000 }, correctionsRunOnlyMandatoryItemsAndKeepCarriedEvidenceHistorical);

async function inheritedCrossImpactQuiescesAndRestartsTheSameFollowup(t) {
  const { fixture, followup, evidence } = await completedFindingsAndCorrection(t);
  const candidates = evidence.navigation.entries.filter((entry) => entry.kind === "candidate_item"
    && entry.item_key.startsWith("requirement:")).map((entry) => entry.item_key);
  assert.ok(candidates.length > 20);
  const request = { item_keys: candidates.slice(0, 20), reason: "Simulation-only inherited cross-impact." };
  function requestExpansion() { return request; }
  const interrupted = await createReviewProtocolRunner(fixture, { requestExpansion });
  const result = await interrupted.run();
  assert.equal(result.status, "incomplete");
  assert.equal(result.next_action, "expand_review_scope");
  assert.deepEqual(result.expansion_requests, [request]);
  assert.equal(interrupted.trace.some((event) => event.kind === "actor-start" && event.role === "final"), false);
  assert.equal(interrupted.trace.filter((event) => event.kind === "actor-start").length,
    interrupted.trace.filter((event) => event.kind === "actor-end").length);
  const oldCursor = result.prepared.result.args.lanes[0].group_ref;
  const observer = await fixture.openActor("p03-expansion-observer-simulation");
  const oldContext = await fixture.readItem(observer, followup.total_items - 1);
  await fixture.author.call("specification_open", { project: fixture.project, specification: fixture.specification });
  const expanded = await fixture.author.call("specification_review_scope_expand", {
    review_ref: followup.review_ref, ...request,
  });
  assert.ok(expanded.required_items > followup.required_items);
  assert.equal((await fixture.prepare(observer, { cursor: oldCursor })).status, "blocked");
  assert.equal((await publicStatus(fixture)).review_ref, followup.review_ref);
  let requiredPages = 0;
  async function restartBetweenReferencePages({ state, references }) {
    requiredPages += 1;
    assert.ok(references.items.every((item) => item.recorded === true));
    assert.ok(references.items.every((item) => item.recorded_result === undefined));
    if (references.next_cursor) await state.client.harness.restart();
  }
  async function rejectOldConsistencyReceipt() {
    await observer.call("specification_open", { project: fixture.project, specification: fixture.specification });
    await observer.call("specification_review_consistency_record", {
      review_ref: followup.review_ref, read_receipt: oldContext.last.consistency_read_receipt,
      verdict: "consistent", explanation: "Simulation-only obsolete receipt attempt.",
    }, "INCOMPLETE_READ");
  }
  const resumed = await createReviewProtocolRunner(fixture, {
    onRequiredPage: restartBetweenReferencePages, beforeConsistency: rejectOldConsistencyReceipt,
  });
  const completed = await resumed.run();
  assert.equal(completed.status, "completed");
  assert.equal(completed.outcome, "reviewed");
  assert.equal(completed.prepared.result.review_ref, followup.review_ref);
  assert.ok(requiredPages >= 2);
  const savedBeforeExpansion = new Set(interrupted.trace.filter((event) => event.kind === "saved").flatMap((event) => event.indices));
  const rereads = resumed.reads.filter((read) => read.kind === "detailed");
  assert.ok(rereads.every((read) => !savedBeforeExpansion.has(read.item_index)));
  const mandatory = resumed.reads.filter((read) => read.kind === "required-result");
  assert.equal(mandatory.length, expanded.required_items);
  assert.ok(mandatory.some((read) => savedBeforeExpansion.has(read.item_index)));
}
test("inherited cross-impact quiesces, expands the same review, rejects old cursors and preserves fresh saves across restart", { timeout: 120_000 }, inheritedCrossImpactQuiescesAndRestartsTheSameFollowup);

async function changedSourceCannotReuseASavedConsistencyAssessment(t) {
  const fixture = await reviewWorkflowFixture(t, { requirements: 2 });
  async function changeAfterConsistency() {
    await writeFile(join(fixture.directory, "spec.md"), fixture.spec + "\nA changed post-assessment obligation.\n");
    throw new Error("Simulation-only source change after a real saved consistency assessment.");
  }
  const runner = await createReviewProtocolRunner(fixture, { afterConsistency: changeAfterConsistency });
  const interrupted = await runner.run();
  assert.notEqual(interrupted.status, "completed");
  assert.equal(runner.assessments.length, 1);
  const checkpoint = runner.trace.length;
  const stale = await runner.run();
  assert.equal(stale.status, "incomplete");
  assert.equal(stale.prepared.result.status, "blocked");
  const events = runner.trace.slice(checkpoint);
  assert.equal(events.filter((event) => event.kind === "actor-start").length, 0);
  assert.equal(events.filter((event) => event.kind === "call" && event.name === "specification_review_complete").length, 0);
}
test("source changes invalidate saved consistency instead of selecting completion-only reuse", { timeout: 120_000 }, changedSourceCannotReuseASavedConsistencyAssessment);

async function fatalNativeCancellationAccountsForRealSavedEffectsAndOwnedChildren(t) {
  const fixture = await reviewWorkflowFixture(t, { requirements: 26 });
  let cancelled = false;
  async function cancelAfterActualCommit() {
    if (cancelled) return;
    cancelled = true;
    throw Object.assign(new Error("Simulation-only fatal native cancellation after a real commit."), {
      fatal: true, name: "AbortError",
    });
  }
  const runner = await createReviewProtocolRunner(fixture, { afterSave: cancelAfterActualCommit });
  await assert.rejects(runner.run(), { name: "AbortError" });
  assert.equal(runner.trace.filter((event) => event.kind === "native-error").length, 1);
  assert.equal(runner.trace.filter((event) => event.kind === "actor-start").length,
    runner.trace.filter((event) => event.kind === "actor-end").length);
  assert.equal(runner.trace.some((event) => event.kind === "actor-start" && event.role === "final"), false);
  const status = await publicStatus(fixture);
  assert.ok(status.recorded_items > 0, "Already committed effects cannot be reported as rolled back.");
  const resumed = await createReviewProtocolRunner(fixture);
  assert.equal((await resumed.run()).status, "completed");
}
test("fatal native cancellation reaches quiescence and preserves actual committed effects for a fresh invocation", { timeout: 120_000 }, fatalNativeCancellationAccountsForRealSavedEffectsAndOwnedChildren);

async function aSecondCorrectionCycleUsesTheLatestCompletedFindingsParent(t) {
  const { fixture, followup, corrected } = await completedFindingsAndCorrection(t);
  const firstFollowup = await createReviewProtocolRunner(fixture, { finalVerdict: "gap" });
  assert.equal((await firstFollowup.run()).outcome, "gaps");
  const changed = corrected.replace("Return the requested fixture value.", "Return the requested fixture value with a clarified valid result.");
  await writeFile(join(fixture.directory, "spec.md"), changed);
  const evidence = await readCorrectionEvidence(fixture, followup.review_ref);
  assert.equal(evidence.navigation.eligible, true);
  const finding = evidence.navigation.entries.find((entry) => entry.kind === "finding");
  const changes = evidence.navigation.entries.filter((entry) => entry.kind === "change");
  assert.ok(finding);
  assert.ok(evidence.records.get(finding.evidence_selector).counterexample);
  const second = await fixture.author.call("specification_review_followup_start", {
    review_ref: followup.review_ref, changes_receipt: evidence.changes_receipt,
    fixes: [{ finding_key: finding.finding_key, changed_item_keys: changes.map((entry) => entry.item_key),
      explanation: "Address the latest simulated consistency finding." }],
  });
  fixture.selectReview(second);
  const final = await createReviewProtocolRunner(fixture);
  const result = await final.run();
  assert.equal(result.status, "completed");
  assert.equal(result.outcome, "reviewed");
  const observer = await fixture.openActor("p03-second-cycle-provenance-simulation");
  const required = new Set(second.required_item_indices);
  for (let index = 0; index < second.total_items - 1; index += 1) {
    if (required.has(index)) continue;
    const read = await fixture.readItem(observer, index);
    assert.equal(read.last.recorded_result.carried_from.review_ref, followup.review_ref);
    break;
  }
}
test("a second source-supported correction cycle starts from the latest completed findings review", { timeout: 120_000 }, aSecondCorrectionCycleUsesTheLatestCompletedFindingsParent);

async function aSchemaValidFinalClaimCannotReplaceDirectMcpCompletionVerification(t) {
  const fixture = await reviewWorkflowFixture(t, { requirements: 3 });
  function fabricateCompletion({ job }) {
    const target = { review_ref: job.target.review_ref, source_version: job.target.source_version };
    return { status: "completed", pagination: "not_read", ...target,
      completion: { protocol_version: 2, context: "simulation-only-unverified-model-claim", replayed: false,
        result: { ...target, coverage_status: "reviewed", semantic_correctness_proven: false,
          reviewer_independence_authenticated: false, approved_by_tool: false } },
      expansion: null, scope_expansion: null };
  }
  const runner = await createReviewProtocolRunner(fixture, { finalReply: fabricateCompletion });
  const result = await runner.run();
  assert.notEqual(result.status, "completed");
  assert.equal(result.workflow.next_action, "verify_review_completion");
  assert.equal(result.verified.result.status, "ready_to_run");
  const status = await publicStatus(fixture);
  assert.equal(status.recorded_items, fixture.review.total_items - 1);
  assert.notEqual(status.coverage_status, "reviewed");
  const recovered = await createReviewProtocolRunner(fixture);
  assert.equal((await recovered.run()).status, "completed");
  assert.equal(recovered.trace.filter((event) => event.kind === "actor-start" && event.role === "detailed").length, 0);
}
test("a schema-valid final model claim cannot certify an unsaved review across the real MCP boundary", { timeout: 120_000 }, aSchemaValidFinalClaimCannotReplaceDirectMcpCompletionVerification);
