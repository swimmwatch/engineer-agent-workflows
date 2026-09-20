import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { performance } from "node:perf_hooks";
import test, { after, before } from "node:test";

import { createSharedStdioHarness } from "../test-support/stdio-harness.mjs";
import { portion } from "../dist/requirements.js";

const server = fileURLToPath(new URL("../dist/main.js", import.meta.url));
const authorServer = createSharedStdioHarness({ entrypoint: server, name: "full-consistency-author" });
const reviewerServer = createSharedStdioHarness({ entrypoint: server, name: "full-consistency-reviewer" });

before(() => Promise.all([authorServer.start(), reviewerServer.start()]));
after(() => Promise.all([authorServer.close(), reviewerServer.close()]));

function actor(harness) {
  let context;
  return {
    context: () => context,
    async call(name, input = {}, error) {
      const response = await harness.callTool({
        name,
        arguments: { ...(context && name !== "specification_open" ? { context } : {}), ...input },
      });
      if (error) {
        assert.equal(response.isError, true, JSON.stringify(response));
        assert.equal(response.structuredContent.error.code, error);
        return response.structuredContent;
      }
      assert.notEqual(response.isError, true, JSON.stringify(response.structuredContent));
      context = response.structuredContent.context ?? context;
      return response.structuredContent.result;
    },
  };
}

async function readItem(client, review, itemIndex) {
  let cursor;
  let result;
  let body = "";
  do {
    result = await client.call("specification_review_get", {
      review_ref: review.review_ref,
      item_index: itemIndex,
      ...(cursor ? { cursor } : {}),
    });
    body += result.text;
    cursor = result.next_cursor;
  } while (cursor);
  return { ...result, body: JSON.parse(body) };
}

async function recordItem(client, review, itemIndex, previouslyRead) {
  const read = previouslyRead ?? await readItem(client, review, itemIndex);
  return client.call("specification_review_record", {
    review_ref: review.review_ref,
    item_index: itemIndex,
    read_receipt: read.read_receipt,
    verdict: "covered",
    explanation: "Synthetic detailed-review evidence.",
    evidence_requirement_ids: read.body.kind === "source" ? read.body.source.requirement_ids ?? [] : [],
    evidence_source_refs: read.body.kind === "requirement" ? read.body.source_refs : [],
  });
}

async function fixture(t, name) {
  const project = await mkdtemp(join(tmpdir(), `workflow-full-consistency-${name}-`));
  t.after(() => rm(project, { recursive: true, force: true }));
  const author = actor(authorServer);
  const reviewer = actor(reviewerServer);
  const specification = `full-consistency-${name}`;
  const directory = join(project, "docs/specs", specification);
  await author.call("specification_open", { project, specification });
  const proposal = await author.call("scope_propose", {
    depth: "standard",
    rationale: ["Synthetic enhanced full-review protocol coverage."],
    profiles: [{ id: "core", reason: "Command behavior and review lifecycle." }],
  });
  const answer = await author.call("question_record_answer", {
    question_ref: proposal.question_ref,
    selected_ids: ["confirm"],
    text: "Confirmed synthetic scope.",
    source: "fixture-customer:scope",
  });
  await author.call("scope_confirm", { proposal_ref: proposal.question_ref, answer_ref: answer.decision_ref });
  const longNormativeProse = `Recovery ordering is mandatory before publishing output.\n${"Retained normative context must remain available. ".repeat(1_500)}`;
  const source = `# Full consistency fixture\n\nStatus: Draft\n\n${longNormativeProse}\n\nIllustrative example only: a caller may use any label.\n\n### FC-001: Input\nAccept a nonempty name.\n\n### FC-002: Output\nPublish JSON only after recovery succeeds.\n`;
  await writeFile(join(directory, "spec.md"), source);
  await author.call("decision_record_instruction", {
    category: "behavior",
    kind: "initial_request",
    text: "Accept a nonempty name.",
    source: "fixture-customer:initial",
    requirement_ids: ["FC-001"],
  });
  await author.call("decision_record_instruction", {
    category: "behavior",
    kind: "initial_request",
    text: "Publish JSON only after recovery succeeds.",
    source: "fixture-customer:initial",
    requirement_ids: ["FC-002"],
  });
  await reviewer.call("specification_open", { project, specification });
  return { project, specification, directory, source, author, reviewer };
}

test("enhanced full review preserves its mode and requires fresh final consistency evidence", async (t) => {
  const f = await fixture(t, "required");
  const review = await f.author.call("specification_review_start", { require_consistency: true });
  assert.equal(review.consistency_required, true);
  const journalPath = join(f.directory, "decisions.yaml");
  const journal = await readFile(journalPath);

  assert.equal((await f.author.call("specification_review_start", { require_consistency: true })).review_ref, review.review_ref);
  assert.deepEqual(await readFile(journalPath), journal, "Same-mode resume must not rewrite the journal.");
  await f.reviewer.call("specification_open", { project: f.project, specification: f.specification });
  const mismatch = await f.reviewer.call("specification_review_start", {}, "INVALID_STATE");
  assert.equal(mismatch.error.details.issues[0].reason, "review_mode_mismatch");
  assert.equal(mismatch.error.details.issues[0].next_action, "start_fresh_review");
  assert.deepEqual(await readFile(journalPath), journal, "A mode mismatch must not modify the retained run.");

  const status = await f.author.call("specification_review_status", { review_ref: review.review_ref });
  assert.equal(status.consistency_required, true);
  assert.equal(status.consistency_status, "pending");
  const contextIndex = review.total_items - 1;
  for (let index = 0; index < contextIndex; index++) await recordItem(f.author, review, index);

  const incomplete = await f.author.call("specification_review_complete", { review_ref: review.review_ref }, "CONSISTENCY_REQUIRED");
  assert.equal(incomplete.error.details.issues[0].reason, "consistency_pending");
  const context = await readItem(f.author, review, contextIndex);
  assert.equal(context.body.kind, "context");
  assert.equal(context.body.source.text, f.source);
  assert.equal(context.body.detailed_results.length, contextIndex);
  assert.ok(context.consistency_read_receipt);

  await f.author.call("specification_review_record", {
    review_ref: review.review_ref,
    item_index: contextIndex,
    read_receipt: context.read_receipt,
    verdict: "covered",
    explanation: "The final item cannot be recorded as an ordinary verdict.",
    evidence_requirement_ids: [],
    evidence_source_refs: [],
  }, "INVALID_STATE");
  await f.author.call("specification_review_record_batch", {
    review_ref: review.review_ref,
    items: [{
      item_index: contextIndex,
      read_receipt: context.read_receipt,
      verdict: "covered",
      explanation: "The final item cannot be batched.",
      evidence_requirement_ids: [],
      evidence_source_refs: [],
    }],
  }, "INVALID_STATE");

  await f.author.call("specification_review_consistency_record", {
    review_ref: review.review_ref,
    read_receipt: context.consistency_read_receipt,
    verdict: "conflict",
    explanation: "The normative recovery ordering conflicts with an unconditional output interpretation.",
    counterexample: "An implementation could publish JSON before recovery succeeds.",
  });
  assert.equal((await f.author.call("specification_review_complete", { review_ref: review.review_ref })).coverage_status, "gaps");
});

test("enhanced final receipt is invalidated by later detailed verdicts", async (t) => {
  const f = await fixture(t, "stale-receipt");
  const review = await f.author.call("specification_review_start", { require_consistency: true });
  const contextIndex = review.total_items - 1;
  for (let index = 0; index < contextIndex - 1; index++) await recordItem(f.author, review, index);
  const earlyContext = await readItem(f.author, review, contextIndex);
  await recordItem(f.author, review, contextIndex - 1);
  await f.author.call("specification_review_consistency_record", {
    review_ref: review.review_ref,
    read_receipt: earlyContext.consistency_read_receipt,
    verdict: "consistent",
    explanation: "This receipt predates the complete detailed verdict set.",
  }, "INCOMPLETE_READ");
  const currentContext = await readItem(f.author, review, contextIndex);
  assert.equal(
    currentContext.body.detailed_results.length,
    contextIndex,
    "A reread must expose every current detailed verdict, not a cached earlier body.",
  );
  await f.author.call("specification_review_consistency_record", {
    review_ref: review.review_ref,
    read_receipt: currentContext.consistency_read_receipt,
    verdict: "consistent",
    explanation: "All detailed outcomes and the complete specification were assessed together.",
  });
  assert.equal((await f.author.call("specification_review_complete", { review_ref: review.review_ref })).coverage_status, "reviewed");
});

test("legacy full review remains compatible and does not acquire an enhanced gate", async (t) => {
  const f = await fixture(t, "legacy");
  const review = await f.author.call("specification_review_start");
  assert.equal(review.consistency_required, false);
  for (let index = 0; index < review.total_items; index++) await recordItem(f.author, review, index);
  assert.equal((await f.author.call("specification_review_complete", { review_ref: review.review_ref })).coverage_status, "reviewed");
  const status = await f.author.call("specification_review_status", { review_ref: review.review_ref });
  assert.equal(status.consistency_required, false);
  assert.equal(status.consistency_status, undefined);
});

test("explicit full mode replaces a pending legacy review with enhanced mode", async (t) => {
  const f = await fixture(t, "legacy-to-enhanced");
  const legacy = await f.author.call("specification_review_start");
  const enhanced = await f.author.call("specification_review_start", { mode: "full", require_consistency: true });
  assert.notEqual(enhanced.review_ref, legacy.review_ref);
  assert.equal(enhanced.consistency_required, true);
  assert.equal((await f.author.call("specification_review_status", { review_ref: legacy.review_ref })).coverage_status, "pending");
});

test("explicit full mode replaces a pending enhanced review with legacy mode", async (t) => {
  const f = await fixture(t, "enhanced-to-legacy");
  const enhanced = await f.author.call("specification_review_start", { require_consistency: true });
  const legacy = await f.author.call("specification_review_start", { mode: "full" });
  assert.notEqual(legacy.review_ref, enhanced.review_ref);
  assert.equal(legacy.consistency_required, false);
  assert.equal((await f.author.call("specification_review_status", { review_ref: enhanced.review_ref })).coverage_status, "pending");
});

test("long review portions advance without quadratic prefix reconstruction", () => {
  const value = "Long review evidence. ".repeat(24_000);
  let cursor;
  let calls = 0;
  const started = performance.now();
  do {
    const page = portion(value, "long-review-performance", cursor);
    cursor = page.next_cursor;
    calls += 1;
  } while (cursor);
  const elapsed = performance.now() - started;
  assert.ok(calls > 100);
  assert.ok(elapsed < 5_000, `Long review pagination took ${Math.round(elapsed)}ms.`);
});
