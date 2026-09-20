import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile, rename, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import test, { after, before } from "node:test";

import { createSharedStdioHarness } from "../test-support/stdio-harness.mjs";

const server = fileURLToPath(new URL("../dist/main.js", import.meta.url));
const authorServer = createSharedStdioHarness({ entrypoint: server, name: "followup-author-simulation" });
const reviewerServer = createSharedStdioHarness({ entrypoint: server, name: "followup-reviewer-simulation" });

before(() => Promise.all([authorServer.start(), reviewerServer.start()]));
after(() => Promise.all([authorServer.close(), reviewerServer.close()]));

function actor(harness) {
  let context;
  const stats = { calls: 0, bytes: 0 };
  return { stats, context: () => context, async call(name, input = {}, error) {
    const response = await harness.callTool({ name, arguments: { ...(context && name !== "specification_open" ? { context } : {}), ...input } });
    stats.calls++;
    stats.bytes += Buffer.byteLength(JSON.stringify(response));
    if (error) {
      assert.equal(response.isError, true, JSON.stringify(response));
      assert.equal(response.structuredContent.error.code, error);
      return response.structuredContent;
    }
    assert.notEqual(response.isError, true, JSON.stringify(response.structuredContent));
    context = response.structuredContent.context ?? context;
    return response.structuredContent.result;
  } };
}

async function isolatedActor(t) {
  const harness = createSharedStdioHarness({ entrypoint: server, name: "followup-restart-simulation" });
  await harness.start();
  t.after(() => harness.close());
  return actor(harness);
}
async function item(actor_, review, index) {
  let cursor, result, text = "";
  do {
    result = await actor_.call("specification_review_get", { review_ref: review.review_ref, item_index: index, ...(cursor ? { cursor } : {}) });
    text += result.text;
    cursor = result.next_cursor;
  } while (cursor);
  return { ...result, body: JSON.parse(text) };
}
async function record(actor_, review, index, gap = false, previouslyRead) {
  const read = previouslyRead ?? await item(actor_, review, index);
  return actor_.call("specification_review_record", {
    review_ref: review.review_ref, item_index: index, read_receipt: read.read_receipt,
    verdict: gap ? "gap" : "covered", explanation: "Simulation-only evidence for review protocol.",
    ...(gap ? { counterexample: "A-001 does not define rejection of an empty name." } : {}),
    evidence_requirement_ids: read.body.kind === "source" ? read.body.source.requirement_ids ?? [] : [],
    evidence_source_refs: read.body.kind === "requirement" ? read.body.source_refs : [],
  });
}
async function changes(actor_, parent) {
  let cursor, result, text = "";
  do {
    result = await actor_.call("specification_review_changes", { review_ref: parent.review_ref, ...(cursor ? { cursor } : {}) });
    text += result.text;
    cursor = result.next_cursor;
  } while (cursor);
  return { ...result, body: JSON.parse(text) };
}
async function fixture(t) {
  const project = await mkdtemp(join(tmpdir(), "workflow-followup-"));
  t.after(() => rm(project, { recursive: true, force: true }));
  const author = actor(authorServer), reviewer = actor(reviewerServer), specification = "followup";
  const directory = join(project, "docs/specs", specification);
  await author.call("specification_open", { project, specification });
  const proposal = await author.call("scope_propose", { depth: "standard", rationale: ["Simulation-only review corrections."], profiles: [{ id: "core", reason: "CLI behavior." }] });
  const answer = await author.call("question_record_answer", { question_ref: proposal.question_ref, selected_ids: ["confirm"], text: "Confirmed fixture scope.", source: "fixture-customer:scope" });
  await author.call("scope_confirm", { proposal_ref: proposal.question_ref, answer_ref: answer.decision_ref });
  const source = "# Fixture\n\nStatus: Draft\n\n### A-001: Name\nAccept a name.\n\n### B-001: Output\nPrint JSON.\n\n### C-001: Exit\nExit successfully for a valid request.\n";
  await writeFile(join(directory, "spec.md"), source);
  for (const [requirement, text] of [["A-001", "Accept a nonempty name and reject an empty name."], ["B-001", "Print JSON."], ["C-001", "Exit successfully for a valid request."]]) {
    await author.call("decision_record_instruction", { category: "behavior", kind: "initial_request", text, source: "fixture-customer:initial", requirement_ids: [requirement] });
  }
  const review = await author.call("specification_review_start");
  await reviewer.call("specification_open", { project, specification });
  const metrics = { ...reviewer.stats };
  for (let i = 0; i < review.total_items; i++) {
    const read = await item(reviewer, review, i);
    await record(reviewer, review, i, read.item_key === "requirement:A-001", read);
  }
  assert.equal((await reviewer.call("specification_review_complete", { review_ref: review.review_ref })).coverage_status, "gaps");
  metrics.calls = reviewer.stats.calls - metrics.calls;
  metrics.bytes = reviewer.stats.bytes - metrics.bytes;
  return { project, specification, directory, author, reviewer, review, source, metrics };
}

test("followup rechecks a correction and preserves unrelated verdict provenance with an independent consistency gate", async (t) => {
  const f = await fixture(t);
  const { author, reviewer, review, directory } = f;
  const archiveDirectory = join(directory, ".workflow/review-inputs");
  const baselineFiles = await readdir(archiveDirectory);
  assert.equal(baselineFiles.length, 1);
  await writeFile(join(directory, "spec.md"), f.source.replace("Accept a name.", "Accept a name; reject an empty name."));
  await author.call("specification_open", { project: f.project, specification: f.specification });
  const journal = await readFile(join(directory, "decisions.yaml"));
  const delta = await changes(author, review);
  assert.deepEqual(await readFile(join(directory, "decisions.yaml")), journal);
  assert.equal(delta.body.eligible, true);
  assert.ok(delta.body.required_item_keys.includes("requirement:A-001"));
  assert.ok(delta.body.candidate_item_keys.includes("requirement:B-001"));
  assert.ok(delta.body.changes.some((change) => change.item_key === "requirement:A-001" && JSON.stringify(change.before).includes("Accept a name.")));
  const followup = await author.call("specification_review_followup_start", { review_ref: review.review_ref, changes_receipt: delta.changes_receipt, fixes: [{ finding_key: "requirement:A-001", changed_item_keys: ["requirement:A-001"], explanation: "Define the missing empty-name case." }] });
  assert.ok(followup.required_items < review.total_items);
  assert.ok(!followup.required_item_indices.includes(review.total_items - 1), "Consistency must require only one whole-specification read, not a duplicate context verdict.");
  assert.equal((await readdir(archiveDirectory)).length, 2);
  await reviewer.call("specification_open", { project: f.project, specification: f.specification });
  const detailedPending = await reviewer.call("specification_review_complete", { review_ref: followup.review_ref }, "INCOMPLETE_REVIEW");
  assert.deepEqual(detailedPending.error.details.issues[0], {
    kind: "review_lifecycle",
    review_ref: followup.review_ref,
    mode: "followup",
    reason: "detailed_checks_pending",
    next_action: "read_and_record_next_item",
  });
  for (const index of followup.required_item_indices) await record(reviewer, followup, index);
  const consistencyPending = await reviewer.call("specification_review_complete", { review_ref: followup.review_ref }, "CONSISTENCY_REQUIRED");
  assert.deepEqual(consistencyPending.error.details.issues[0], {
    kind: "review_lifecycle",
    review_ref: followup.review_ref,
    mode: "followup",
    reason: "consistency_pending",
    next_action: "record_consistency",
  });
  const contextIndex = review.total_items - 1;
  const context = await item(reviewer, followup, contextIndex);
  assert.equal(context.body.kind, "context");
  assert.ok(context.body.source.text.includes("### B-001"), "The consistency read must include the whole current specification.");
  const consistencyInput = { review_ref: followup.review_ref, read_receipt: context.consistency_read_receipt, verdict: "consistent", explanation: "Simulation-only whole-spec check: the correction does not change output or success conditions." };
  await reviewer.call("specification_review_consistency_record", consistencyInput);
  const consistencyRecorded = await reviewer.call("specification_review_consistency_record", consistencyInput, "INVALID_STATE");
  assert.deepEqual(consistencyRecorded.error.details.issues[0], {
    kind: "review_lifecycle",
    review_ref: followup.review_ref,
    mode: "followup",
    reason: "consistency_recorded",
    next_action: "complete_review",
  });
  assert.equal((await reviewer.call("specification_review_complete", { review_ref: followup.review_ref })).coverage_status, "reviewed");
  const saved = await item(reviewer, followup, 5);
  assert.ok(saved.body.recorded_result.carried_from);
  t.diagnostic(`Baseline full-review calls: ${f.metrics.calls}, bytes: ${f.metrics.bytes}; followup detailed items: ${followup.required_items}/${review.total_items}.`);
});

async function corrected(f) {
  await writeFile(join(f.directory, "spec.md"), f.source.replace("Accept a name.", "Accept a name; reject an empty name."));
  await f.author.call("specification_open", { project: f.project, specification: f.specification });
  const delta = await changes(f.author, f.review);
  const input = { review_ref: f.review.review_ref, changes_receipt: delta.changes_receipt, fixes: [{ finding_key: "requirement:A-001", changed_item_keys: ["requirement:A-001"], explanation: "Define the missing empty-name case." }] };
  return { delta, input, run: await f.author.call("specification_review_followup_start", input) };
}

test("explicit full mode replaces followup without inherited results and preserves ordinary resume and retry", async (t) => {
  const f = await fixture(t), { run } = await corrected(f), a = f.author;
  const path = join(f.directory, "decisions.yaml"), before = await readFile(path);
  const ordinary = await a.call("specification_review_start");
  assert.equal(ordinary.review_ref, run.review_ref);
  assert.equal(ordinary.consistency_required, true);
  assert.deepEqual(await readFile(path), before);
  await f.reviewer.call("specification_review_start", { mode: "full" }, "CONFLICT");
  assert.deepEqual(await readFile(path), before);
  const args = { context: a.context(), mode: "full" };
  const full = await a.call("specification_review_start", args);
  assert.notEqual(full.review_ref, run.review_ref);
  assert.equal(full.recorded_items, 0);
  const written = await readFile(path), restarted = await isolatedActor(t);
  assert.equal((await restarted.call("specification_review_start", args)).review_ref, full.review_ref);
  assert.deepEqual(await readFile(path), written);
  const status = await a.call("specification_review_status", { review_ref: full.review_ref });
  assert.equal(status.next_item_index, 0);
  assert.equal(status.carried_items, undefined);
  assert.equal((await a.call("specification_review_start", { mode: "full" })).review_ref, full.review_ref);
  assert.deepEqual(await readFile(path), written);
  for (let i = 0; i < full.total_items; i++) await record(a, full, i);
  assert.equal((await a.call("specification_review_complete", { review_ref: full.review_ref })).coverage_status, "reviewed");
});

test("explicit enhanced full mode replaces an active followup without rewriting either mode", async (t) => {
  const f = await fixture(t), { run } = await corrected(f), a = f.author;
  const path = join(f.directory, "decisions.yaml");
  const enhanced = await a.call("specification_review_start", { mode: "full", require_consistency: true });
  assert.notEqual(enhanced.review_ref, run.review_ref);
  assert.equal(enhanced.consistency_required, true);
  assert.equal(enhanced.recorded_items, 0);
  assert.equal((await a.call("specification_review_status", { review_ref: run.review_ref })).coverage_status, "pending");
  assert.equal((await a.call("specification_review_status", { review_ref: run.review_ref })).consistency_required, true);
  const journal = await readFile(path);
  assert.equal((await a.call("specification_review_start", { mode: "full", require_consistency: true })).review_ref, enhanced.review_ref);
  assert.deepEqual(await readFile(path), journal);
});

test("explicit full mode recovers from missing followup archives using intact current sources", async (t) => {
  const f = await fixture(t), { run } = await corrected(f), a = f.author;
  const archive = join(f.directory, ".workflow/review-inputs");
  for (const name of await readdir(archive)) await rename(join(archive, name), join(archive, name + ".missing"));
  const full = await a.call("specification_review_start", { mode: "full" });
  assert.notEqual(full.review_ref, run.review_ref);
  assert.equal(full.recorded_items, 0);
  assert.equal((await readdir(archive)).filter((name) => name.endsWith(".json")).length, 1);
  for (let i = 0; i < full.total_items; i++) await record(a, full, i);
  assert.equal((await a.call("specification_review_complete", { review_ref: full.review_ref })).coverage_status, "reviewed");
});
test("snapshots deduplicate exact inputs and reject corruption without journal writes", async (t) => {
  const f = await fixture(t), archive = join(f.directory, ".workflow/review-inputs");
  const [name] = await readdir(archive);
  const original = await readFile(join(archive, name));
  const parsed = JSON.parse(original);
  assert.equal(parsed.content, f.source);
  assert.ok(parsed.decisions.every((d) => Object.keys(d).sort().join() === "fingerprint,id,revision"));
  assert.ok(!original.includes(Buffer.from(f.project)), "Do not embed personal project paths.");
  await f.author.call("specification_open", { project: f.project, specification: f.specification });
  await f.author.call("specification_review_start");
  assert.deepEqual(await readdir(archive), [name]);
  await writeFile(join(archive, name), "{}");
  const journal = await readFile(join(f.directory, "decisions.yaml"));
  await f.author.call("specification_review_changes", { review_ref: f.review.review_ref }, "INVALID_SNAPSHOT");
  assert.deepEqual(await readFile(join(f.directory, "decisions.yaml")), journal);
});

test("source movement does not invalidate unrelated item fingerprints; unexplained changes cannot start followup", async (t) => {
  const f = await fixture(t);
  await writeFile(join(f.directory, "spec.md"), f.source.replace("Accept a name.", "Accept a name.\nReject an empty name.\nValidate whitespace."));
  await f.author.call("specification_open", { project: f.project, specification: f.specification });
  const delta = await changes(f.author, f.review);
  assert.equal(delta.body.changes.length, 1);
  assert.equal(delta.body.changes[0].item_key, "requirement:A-001");
  await f.author.call("specification_review_followup_start", { review_ref: f.review.review_ref, changes_receipt: delta.changes_receipt, fixes: [{ finding_key: "requirement:A-001", changed_item_keys: ["requirement:B-001"], explanation: "Invalid fixture mapping." }] }, "FULL_REVIEW_REQUIRED");
  await writeFile(join(f.directory, "spec.md"), f.source.replace("### B-001", "### B-002"));
  const renamed = await changes(f.author, f.review);
  assert.equal(renamed.body.eligible, false);
});

test("cross-impact expansion withdraws inherited evidence and invalidates the consistency read", async (t) => {
  const f = await fixture(t), { run } = await corrected(f);
  const a = f.author;
  for (const index of run.required_item_indices) await record(a, run, index);
  const oldRead = await item(a, run, run.total_items - 1);
  const expanded = await a.call("specification_review_scope_expand", { review_ref: run.review_ref, item_keys: ["requirement:B-001"], reason: "The empty-name error may need a defined JSON response." });
  assert.equal(expanded.required_items, run.required_items + 1);
  await a.call("specification_review_complete", { review_ref: run.review_ref }, "INCOMPLETE_REVIEW");
  await record(a, run, 5, true);
  await a.call("specification_review_consistency_record", { review_ref: run.review_ref, read_receipt: oldRead.consistency_read_receipt, verdict: "consistent", explanation: "Stale fixture assessment." }, "INCOMPLETE_READ");
  const fresh = await item(a, run, run.total_items - 1);
  await a.call("specification_review_consistency_record", { review_ref: run.review_ref, read_receipt: fresh.consistency_read_receipt, verdict: "consistent", explanation: "The known detailed gap remains; no additional cross-impact." });
  assert.equal((await a.call("specification_review_complete", { review_ref: run.review_ref })).coverage_status, "gaps");
});

test("observer reads and unchanged followup resumes preserve the writer context and exact retries survive restart", async (t) => {
  const f = await fixture(t), { input, run } = await corrected(f);
  await f.reviewer.call("specification_open", { project: f.project, specification: f.specification });
  const writerContext = f.reviewer.context(), journal = await readFile(join(f.directory, "decisions.yaml"));
  await f.author.call("specification_review_status", { review_ref: run.review_ref });
  const resumed = await f.author.call("specification_review_followup_start", input);
  assert.equal(resumed.review_ref, run.review_ref);
  assert.deepEqual(await readFile(join(f.directory, "decisions.yaml")), journal);
  const read = await item(f.reviewer, run, run.required_item_indices[0]);
  const args = { context: writerContext, review_ref: run.review_ref, item_index: run.required_item_indices[0], read_receipt: read.read_receipt, verdict: "covered", explanation: "Retry fixture.", evidence_requirement_ids: read.body.source.requirement_ids ?? [], evidence_source_refs: [] };
  await f.reviewer.call("specification_review_record", args);
  const journalAfterRecord = await readFile(join(f.directory, "decisions.yaml")), restarted = await isolatedActor(t);
  await restarted.call("specification_review_record", args);
  assert.deepEqual(await readFile(join(f.directory, "decisions.yaml")), journalAfterRecord);
  await f.author.call("specification_review_scope_expand", { review_ref: run.review_ref, item_keys: ["requirement:B-001"], reason: "Concurrent change." }, "CONFLICT");
});

test("shared-context changes and missing or unsafe archives cannot reuse results", async (t) => {
  const f = await fixture(t), archive = join(f.directory, ".workflow/review-inputs");
  await writeFile(join(f.directory, "spec.md"), f.source.replace("# Fixture", "# Fixture\n\nNew global behavior."));
  await f.author.call("specification_open", { project: f.project, specification: f.specification });
  assert.equal((await changes(f.author, f.review)).body.eligible, false);
  const [name] = await readdir(archive), archived = join(archive, name), moved = join(archive, "saved.json");
  await rename(archived, moved);
  await f.author.call("specification_review_changes", { review_ref: f.review.review_ref }, "INVALID_SNAPSHOT");
  try { await symlink(moved, archived); }
  catch (error) { if (process.platform === "win32" && ["EPERM", "EACCES"].includes(error.code)) { t.diagnostic("Symlink probe unavailable under current Windows privileges."); return; } throw error; }
  await f.author.call("specification_review_changes", { review_ref: f.review.review_ref }, "UNSAFE_PATH");
});

test("a consistency finding remains mandatory on the next correction cycle", async (t) => {
  const f = await fixture(t), { run } = await corrected(f), a = f.author;
  for (const index of run.required_item_indices) await record(a, run, index);
  const read = await item(a, run, run.total_items - 1);
  await a.call("specification_review_consistency_record", { review_ref: run.review_ref, read_receipt: read.consistency_read_receipt, verdict: "conflict", explanation: "The error response format is unspecified.", counterexample: "An empty name could produce plain text despite the JSON output contract." });
  assert.equal((await a.call("specification_review_complete", { review_ref: run.review_ref })).coverage_status, "gaps");
  await writeFile(join(f.directory, "spec.md"), f.source.replace("Accept a name.", "Accept a name; reject an empty name with a JSON error."));
  const delta = await changes(a, run);
  assert.ok(delta.body.findings.some((finding) => finding.item_key === "context:specification"));
  const next = await a.call("specification_review_followup_start", { review_ref: run.review_ref, changes_receipt: delta.changes_receipt, fixes: [{ finding_key: "context:specification", changed_item_keys: ["requirement:A-001"], explanation: "Specify the error representation." }] });
  assert.notEqual(next.review_ref, run.review_ref);
  await a.call("specification_review_complete", { review_ref: next.review_ref }, "INCOMPLETE_REVIEW");
});

test("new customer instructions require full review even when attached to existing requirements", async (t) => {
  const f = await fixture(t);
  await f.author.call("specification_open", { project: f.project, specification: f.specification });
  await f.author.call("decision_record_instruction", { category: "behavior", kind: "follow_up", text: "Also print XML.", source: "fixture-customer:new-request", requirement_ids: ["B-001"] });
  const delta = await changes(f.author, f.review);
  assert.equal(delta.body.eligible, false);
  assert.ok(delta.body.full_review_reasons.some((reason) => reason.includes("source")));
});

test("archive loss after starting followup prevents completion without changing the journal", async (t) => {
  const f = await fixture(t), { run } = await corrected(f), a = f.author;
  for (const index of run.required_item_indices) await record(a, run, index);
  const read = await item(a, run, run.total_items - 1);
  await a.call("specification_review_consistency_record", { review_ref: run.review_ref, read_receipt: read.consistency_read_receipt, verdict: "consistent", explanation: "Simulation check." });
  const archive = join(f.directory, ".workflow/review-inputs");
  for (const name of await readdir(archive)) await rename(join(archive, name), join(archive, `${name}.missing`));
  const journal = await readFile(join(f.directory, "decisions.yaml"));
  await a.call("specification_review_complete", { review_ref: run.review_ref }, "INVALID_SNAPSHOT");
  assert.deepEqual(await readFile(join(f.directory, "decisions.yaml")), journal);
});

test("expanding after consistency withdraws its old context verdict before the final reread", async (t) => {
  const f = await fixture(t), { run } = await corrected(f), a = f.author;
  for (const index of run.required_item_indices) await record(a, run, index);
  const read = await item(a, run, run.total_items - 1);
  await a.call("specification_review_consistency_record", { review_ref: run.review_ref, read_receipt: read.consistency_read_receipt, verdict: "consistent", explanation: "Initial global assessment." });
  await a.call("specification_review_scope_expand", { review_ref: run.review_ref, item_keys: ["requirement:B-001"], reason: "Reconsider error output before completing." });
  await record(a, run, 5);
  const refreshed = await item(a, run, run.total_items - 1);
  assert.equal(refreshed.recorded_result, null);
  await a.call("specification_review_consistency_record", { review_ref: run.review_ref, read_receipt: refreshed.consistency_read_receipt, verdict: "consistent", explanation: "Rechecked after the expanded detailed review." });
  assert.equal((await a.call("specification_review_complete", { review_ref: run.review_ref })).coverage_status, "reviewed");
});

test("followup lifecycle rejections return actionable diagnostics without journal writes", async (t) => {
  const f = await fixture(t), a = f.author;
  const issue = (response) => response.error.details.issues[0];

  await a.call("specification_open", { project: f.project, specification: f.specification });
  const fullJournal = await readFile(join(f.directory, "decisions.yaml"));
  const fullConsistency = await a.call("specification_review_consistency_record", {
    review_ref: f.review.review_ref,
    read_receipt: "not-a-current-read-receipt",
    verdict: "consistent",
    explanation: "This call must be rejected before reading evidence.",
  }, "INVALID_STATE");
  assert.deepEqual(issue(fullConsistency), {
    kind: "review_lifecycle",
    review_ref: f.review.review_ref,
    mode: "full",
    reason: "review_completed",
    next_action: "inspect_review_status",
  });
  assert.deepEqual(await readFile(join(f.directory, "decisions.yaml")), fullJournal);
  const fullExpansion = await a.call("specification_review_scope_expand", {
    review_ref: f.review.review_ref,
    item_keys: ["requirement:B-001"],
    reason: "Completed full reviews cannot be expanded.",
  }, "INVALID_STATE");
  assert.equal(issue(fullExpansion).reason, "review_completed");
  assert.equal(issue(fullExpansion).next_action, "inspect_review_status");
  assert.deepEqual(await readFile(join(f.directory, "decisions.yaml")), fullJournal);

  await writeFile(join(f.directory, "spec.md"), f.source.replace("Accept a name.", "Accept a name; reject an empty name."));
  await a.call("specification_open", { project: f.project, specification: f.specification });
  const delta = await changes(a, f.review);
  const input = {
    review_ref: f.review.review_ref,
    changes_receipt: delta.changes_receipt,
    fixes: [{
      finding_key: "requirement:A-001",
      changed_item_keys: ["requirement:A-001"],
      explanation: "Define the missing empty-name case.",
    }],
  };

  const correctedJournal = await readFile(join(f.directory, "decisions.yaml"));
  const incompleteRead = await a.call("specification_review_followup_start", {
    ...input,
    changes_receipt: "not-the-complete-change-receipt",
  }, "INCOMPLETE_READ");
  assert.equal(issue(incompleteRead).reason, "changes_read_incomplete");
  assert.equal(issue(incompleteRead).next_action, "finish_changes_read");
  assert.deepEqual(await readFile(join(f.directory, "decisions.yaml")), correctedJournal);

  const invalidMapping = await a.call("specification_review_followup_start", {
    ...input,
    fixes: [{
      finding_key: "requirement:A-001",
      changed_item_keys: ["requirement:B-001"],
      explanation: "This unrelated mapping must be rejected.",
    }],
  }, "FULL_REVIEW_REQUIRED");
  assert.equal(issue(invalidMapping).reason, "fix_mapping_invalid");
  assert.equal(issue(invalidMapping).next_action, "inspect_parent_findings");
  assert.deepEqual(await readFile(join(f.directory, "decisions.yaml")), correctedJournal);

  const run = await a.call("specification_review_followup_start", input);
  const runJournal = await readFile(join(f.directory, "decisions.yaml"));
  const unknownItem = await a.call("specification_review_scope_expand", {
    review_ref: run.review_ref,
    item_keys: ["requirement:missing"],
    reason: "Exercise unknown inventory recovery.",
  }, "NOT_FOUND");
  assert.equal(issue(unknownItem).reason, "review_item_not_found");
  assert.equal(issue(unknownItem).next_action, "inspect_review_status");
  assert.deepEqual(await readFile(join(f.directory, "decisions.yaml")), runJournal);

  for (const index of run.required_item_indices) await record(a, run, index);
  const context = await item(a, run, run.total_items - 1);
  const incompleteFindingJournal = await readFile(join(f.directory, "decisions.yaml"));
  const incompleteFinding = await a.call("specification_review_consistency_record", {
    review_ref: run.review_ref,
    read_receipt: context.consistency_read_receipt,
    verdict: "gap",
    explanation: "A finding without its required counterexample.",
  }, "INVALID_INPUT");
  assert.equal(issue(incompleteFinding).reason, "finding_incomplete");
  assert.equal(issue(incompleteFinding).next_action, "correct_verdict_input");
  assert.deepEqual(await readFile(join(f.directory, "decisions.yaml")), incompleteFindingJournal);

  await a.call("specification_review_consistency_record", {
    review_ref: run.review_ref,
    read_receipt: context.consistency_read_receipt,
    verdict: "consistent",
    explanation: "The corrected requirement remains consistent with the complete specification.",
  });
  await a.call("specification_review_complete", { review_ref: run.review_ref });
  const completedJournal = await readFile(join(f.directory, "decisions.yaml"));
  const repeatedCompletion = await a.call("specification_review_complete", {
    review_ref: run.review_ref,
  }, "INVALID_STATE");
  assert.equal(issue(repeatedCompletion).reason, "review_completed");
  assert.equal(issue(repeatedCompletion).next_action, "inspect_review_status");
  assert.deepEqual(await readFile(join(f.directory, "decisions.yaml")), completedJournal);
  const completedContextRecord = await a.call("specification_review_record", {
    review_ref: run.review_ref,
    item_index: run.total_items - 1,
    read_receipt: context.read_receipt,
    verdict: "covered",
    explanation: "Completed reviews cannot accept another context verdict.",
    evidence_requirement_ids: [],
    evidence_source_refs: [],
  }, "INVALID_STATE");
  assert.equal(issue(completedContextRecord).reason, "review_completed");
  assert.equal(issue(completedContextRecord).next_action, "inspect_review_status");
  assert.deepEqual(await readFile(join(f.directory, "decisions.yaml")), completedJournal);
  const completed = await a.call("specification_review_scope_expand", {
    review_ref: run.review_ref,
    item_keys: ["requirement:B-001"],
    reason: "Completed reviews cannot be expanded.",
  }, "INVALID_STATE");
  assert.equal(issue(completed).reason, "review_completed");
  assert.equal(issue(completed).next_action, "inspect_review_status");
  assert.deepEqual(await readFile(join(f.directory, "decisions.yaml")), completedJournal);
});

test("failure after archiving leaves no journal reference and retry reuses the orphan", async (t) => {
  const f = await fixture(t), a = f.author, archive = join(f.directory, ".workflow/review-inputs");
  await writeFile(join(f.directory, "spec.md"), f.source.replace("Accept a name.", "Reject an empty name."));
  await a.call("specification_open", { project: f.project, specification: f.specification });
  const journal = await readFile(join(f.directory, "decisions.yaml"));
  await writeFile(join(f.project, "package.json"), JSON.stringify({ prettier: { tabWidth: "invalid" } }));
  await a.call("specification_review_start", {}, "INVALID_FORMATTER_CONFIG");
  assert.deepEqual(await readFile(join(f.directory, "decisions.yaml")), journal);
  assert.equal((await readdir(archive)).length, 2);
  await writeFile(join(f.project, "package.json"), "{}");
  await a.call("specification_review_start");
  assert.equal((await readdir(archive)).length, 2);
});
