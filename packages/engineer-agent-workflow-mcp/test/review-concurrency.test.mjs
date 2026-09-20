import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { URL } from "node:url";
import test from "node:test";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const server = new URL("../dist/main.js", import.meta.url).pathname;

async function actor(t, name) {
  const client = new Client({ name, version: "1" });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [server], stderr: "pipe" }));
  t.after(() => client.close());
  let context;
  return {
    context: () => context,
    listTools: () => client.listTools(),
    call: async (tool, arguments_ = {}, expectedError) => {
      const response = await client.callTool({
        name: tool,
        arguments: { ...(context && tool !== "specification_open" ? { context } : {}), ...arguments_ },
      });
      if (expectedError) {
        assert.equal(response.isError, true);
        assert.equal(response.structuredContent.error.code, expectedError);
        return response.structuredContent;
      }
      assert.notEqual(response.isError, true, JSON.stringify(response.structuredContent));
      context = response.structuredContent.context ?? context;
      return response.structuredContent.result;
    },
  };
}

async function readItem(actor_, reviewRef, itemIndex) {
  let cursor, item, text = "";
  do {
    item = await actor_.call("specification_review_get", {
      review_ref: reviewRef,
      item_index: itemIndex,
      ...(cursor ? { cursor } : {}),
    });
    text += item.text;
    cursor = item.next_cursor;
  } while (cursor);
  return { item, payload: JSON.parse(text) };
}

function covered(reviewRef, itemIndex, read) {
  return {
    review_ref: reviewRef,
    item_index: itemIndex,
    read_receipt: read.item.read_receipt,
    verdict: "covered",
    explanation: "Simulation-only verdict for the concurrency protocol.",
    evidence_requirement_ids: read.payload.kind === "source" ? read.payload.source.requirement_ids ?? [] : [],
    evidence_source_refs: read.payload.kind === "requirement" ? read.payload.source_refs : [],
  };
}

async function reviewFixture(t, specification = "coverage") {
  const project = await mkdtemp(join(tmpdir(), "workflow-review-concurrency-"));
  t.after(() => rm(project, { recursive: true, force: true }));
  const author = await actor(t, "review-author-simulation");
  const reviewer = await actor(t, "reviewer-simulation");
  const observer = await actor(t, "review-observer-simulation");
  const directory = join(project, `docs/specs/${specification}`);

  await author.call("specification_open", { project, specification });
  const proposal = await author.call("scope_propose", {
    depth: "standard",
    rationale: ["Two-client review concurrency simulation."],
    profiles: [{ id: "core", reason: "CLI contract." }],
  });
  const answer = await author.call("question_record_answer", {
    question_ref: proposal.question_ref,
    selected_ids: ["confirm"],
    text: "Confirmed simulation scope.",
    source: "fixture-customer:scope",
  });
  await author.call("scope_confirm", { proposal_ref: proposal.question_ref, answer_ref: answer.decision_ref });
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "spec.md"), "# Protocol fixture\n\nStatus: Draft\n\n### JSON-001: Media support\nAccept JSON.\n");
  await author.call("decision_record_instruction", {
    category: "media",
    kind: "initial_request",
    text: "Accept JSON.",
    source: "fixture-customer:initial",
    requirement_ids: ["JSON-001"],
  });
  const review = await author.call("specification_review_start");
  await reviewer.call("specification_open", { project, specification });
  await observer.call("specification_open", { project, specification });
  return { project, directory, author, reviewer, observer, review };
}

async function recordAll(actor_, review) {
  for (let index = 0; index < review.total_items; index++) {
    const read = await readItem(actor_, review.review_ref, index);
    await actor_.call("specification_review_record", covered(review.review_ref, index, read));
  }
}

test("an observer can resume an unchanged review without invalidating the reviewer context", async (t) => {
  const project = await mkdtemp(join(tmpdir(), "workflow-review-concurrency-"));
  t.after(() => rm(project, { recursive: true, force: true }));
  const author = await actor(t, "review-author-simulation");
  const reviewer = await actor(t, "reviewer-simulation");
  const directory = join(project, "docs/specs/coverage");

  await author.call("specification_open", { project, specification: "coverage" });
  const proposal = await author.call("scope_propose", {
    depth: "standard",
    rationale: ["Two-client review concurrency simulation."],
    profiles: [{ id: "core", reason: "CLI contract." }],
  });
  const answer = await author.call("question_record_answer", {
    question_ref: proposal.question_ref,
    selected_ids: ["confirm"],
    text: "Confirmed simulation scope.",
    source: "fixture-customer:scope",
  });
  await author.call("scope_confirm", { proposal_ref: proposal.question_ref, answer_ref: answer.decision_ref });
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "spec.md"), "# Protocol fixture\n\nStatus: Draft\n\n### JSON-001: Media support\nAccept JSON.\n");
  await author.call("decision_record_instruction", {
    category: "media",
    kind: "initial_request",
    text: "Accept JSON.",
    source: "fixture-customer:initial",
    requirement_ids: ["JSON-001"],
  });
  const review = await author.call("specification_review_start");

  await reviewer.call("specification_open", { project, specification: "coverage" });
  const first = await readItem(reviewer, review.review_ref, 0);
  await reviewer.call("specification_review_record", covered(review.review_ref, 0, first));
  const reviewerContext = reviewer.context();
  const second = await readItem(reviewer, review.review_ref, 1);
  assert.equal(reviewer.context(), reviewerContext, "read-only review calls must preserve the reviewer context");

  await author.call("specification_open", { project, specification: "coverage" });
  const before = await readFile(join(directory, "decisions.yaml"));
  const observerContext = author.context();
  const resumed = await author.call("specification_review_start");
  const after = await readFile(join(directory, "decisions.yaml"));
  assert.equal(author.context(), observerContext, "a no-op resume must preserve the observer context");
  assert.deepEqual(after, before, "a no-op resume must preserve the journal bytes");
  assert.equal(resumed.review_ref, review.review_ref);
  assert.equal(resumed.source_version, review.source_version);
  assert.equal(resumed.recorded_items, 1);

  const recorded = await reviewer.call("specification_review_record", covered(review.review_ref, 1, second));
  assert.equal(recorded.recorded_items, 2);
});

test("read-only review status preserves journal bytes and another client's context", async (t) => {
  const { directory, reviewer, observer, review } = await reviewFixture(t);
  const statusTool = (await observer.listTools()).tools.find((tool) => tool.name === "specification_review_status");
  assert.equal(statusTool.annotations.readOnlyHint, true);
  assert.equal(statusTool.annotations.destructiveHint, false);
  const first = await readItem(reviewer, review.review_ref, 0);
  await reviewer.call("specification_review_record", covered(review.review_ref, 0, first));
  const reviewerContext = reviewer.context();
  const before = await readFile(join(directory, "decisions.yaml"));

  const status = await observer.call("specification_review_status", { review_ref: review.review_ref });

  assert.equal(status.coverage_status, "pending");
  assert.equal(status.recorded_items, 1);
  assert.equal(status.next_item_index, 1);
  assert.equal(reviewer.context(), reviewerContext);
  assert.deepEqual(await readFile(join(directory, "decisions.yaml")), before);
  const second = await readItem(reviewer, review.review_ref, 1);
  await reviewer.call("specification_review_record", covered(review.review_ref, 1, second));
});

test("review status reports completed, stale, and unknown reviews without writes", async (t) => {
  const { directory, reviewer, observer, review } = await reviewFixture(t);
  await recordAll(reviewer, review);
  const completed = await reviewer.call("specification_review_complete", { review_ref: review.review_ref });
  assert.equal(completed.coverage_status, "reviewed");

  let status = await observer.call("specification_review_status", { review_ref: review.review_ref });
  assert.equal(status.coverage_status, "reviewed");
  assert.equal(status.recorded_items, review.total_items);
  assert.equal(status.next_item_index, null);

  await writeFile(join(directory, "spec.md"), "# Protocol fixture\n\nStatus: Draft\n\n### JSON-001: Media support\nAccept JSON without a charset.\n");
  status = await observer.call("specification_review_status", { review_ref: review.review_ref });
  assert.equal(status.coverage_status, "stale");
  assert.equal(status.next_item_index, null);
  assert.notEqual(status.current_source_version, status.review_source_version);

  await observer.call("specification_review_status", { review_ref: "unknown-review" }, "NOT_FOUND");
});

test("review status preserves a completed gaps outcome", async (t) => {
  const { reviewer, observer, review } = await reviewFixture(t);
  const first = await readItem(reviewer, review.review_ref, 0);
  await reviewer.call("specification_review_record", {
    review_ref: review.review_ref,
    item_index: 0,
    read_receipt: first.item.read_receipt,
    verdict: "gap",
    explanation: "Simulation-only finding for status coverage.",
    counterexample: "The fixture could omit its confirmed media behavior.",
    evidence_requirement_ids: [],
    evidence_source_refs: [],
  });
  for (let index = 1; index < review.total_items; index++) {
    const read = await readItem(reviewer, review.review_ref, index);
    await reviewer.call("specification_review_record", covered(review.review_ref, index, read));
  }
  const completed = await reviewer.call("specification_review_complete", { review_ref: review.review_ref });
  assert.equal(completed.coverage_status, "gaps");

  const status = await observer.call("specification_review_status", { review_ref: review.review_ref });
  assert.equal(status.coverage_status, "gaps");
  assert.equal(status.next_item_index, null);
});

test("a real concurrent source mutation still conflicts with a reviewer write", async (t) => {
  const { author, reviewer, review } = await reviewFixture(t);
  const first = await readItem(reviewer, review.review_ref, 0);
  const reviewerContext = reviewer.context();
  await author.call("decision_record_instruction", {
    category: "media",
    kind: "follow_up",
    text: "Also preserve bare JSON support.",
    source: "fixture-customer:concurrent",
    requirement_ids: ["JSON-001"],
  });

  await reviewer.call("specification_review_record", { ...covered(review.review_ref, 0, first), context: reviewerContext }, "CONFLICT");
});
