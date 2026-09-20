import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath, URL } from "node:url";

import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

import { load, mutate, readConsistent, WorkflowError } from "../dist/state.js";

const server = fileURLToPath(new URL("../dist/main.js", import.meta.url));

async function actor(t, name) {
  const client = new Client({ name, version: "1" });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [server], stderr: "pipe" }));
  t.after(() => client.close());
  let context;
  return {
    context: () => context,
    async raw(tool, input = {}) {
      return client.callTool({
        name: tool,
        arguments: { ...(context && tool !== "specification_open" ? { context } : {}), ...input },
      });
    },
    async call(tool, input = {}, expectedError) {
      const response = await this.raw(tool, input);
      if (expectedError) {
        assert.equal(response.isError, true, JSON.stringify(response));
        assert.equal(response.structuredContent.error.code, expectedError);
        return response.structuredContent;
      }
      assert.notEqual(response.isError, true, JSON.stringify(response.structuredContent));
      context = response.structuredContent.context ?? context;
      return response.structuredContent.result;
    },
  };
}

async function readItem(client, reviewRef, itemIndex) {
  let cursor;
  let page;
  let text = "";
  do {
    page = await client.call("specification_review_get", {
      review_ref: reviewRef,
      item_index: itemIndex,
      ...(cursor ? { cursor } : {}),
    });
    text += page.text;
    cursor = page.next_cursor;
  } while (cursor);
  return { page, body: JSON.parse(text) };
}

function covered(reviewRef, itemIndex, read) {
  return {
    review_ref: reviewRef,
    item_index: itemIndex,
    read_receipt: read.page.read_receipt,
    verdict: "covered",
    explanation: "Synthetic conflict-cause coverage.",
    evidence_requirement_ids: read.body.kind === "source" ? read.body.source.requirement_ids ?? [] : [],
    evidence_source_refs: read.body.kind === "requirement" ? read.body.source_refs : [],
  };
}

function conflictDetails(error) {
  const details = typeof error.conflict_cause === "string"
    ? error
    : error.details && typeof error.details === "object" ? error.details : error;
  assert.equal(typeof details.conflict_cause, "string", JSON.stringify(error));
  assert.equal(typeof details.next_action, "string", JSON.stringify(error));
  assert.ok(details.details && typeof details.details === "object", JSON.stringify(error));
  assert.ok(Array.isArray(details.details.issues), JSON.stringify(error));
  return details;
}

async function fixture(t, name) {
  const project = await mkdtemp(join(tmpdir(), `workflow-review-conflict-${name}-`));
  t.after(() => rm(project, { recursive: true, force: true }));
  const author = await actor(t, `${name}-author`);
  const reviewer = await actor(t, `${name}-reviewer`);
  const observer = await actor(t, `${name}-observer`);
  const specification = `review-conflict-${name}`;
  const directory = join(project, "docs/specs", specification);

  await author.call("specification_open", { project, specification });
  const proposal = await author.call("scope_propose", {
    depth: "standard",
    rationale: ["Exercise review conflict diagnostics."],
    profiles: [{ id: "core", reason: "Review protocol behavior." }],
  });
  const answer = await author.call("question_record_answer", {
    question_ref: proposal.question_ref,
    selected_ids: ["confirm"],
    text: "Confirmed synthetic scope.",
    source: "fixture-customer:scope",
  });
  await author.call("scope_confirm", { proposal_ref: proposal.question_ref, answer_ref: answer.decision_ref });
  await mkdir(directory, { recursive: true });
  const source = "# Conflict fixture\n\nStatus: Draft\n\n### CF-001: Input\nAccept JSON.\n";
  await writeFile(join(directory, "spec.md"), source);
  await author.call("decision_record_instruction", {
    category: "behavior",
    kind: "initial_request",
    text: "Accept JSON.",
    source: "fixture-customer:initial",
    requirement_ids: ["CF-001"],
  });
  const review = await author.call("specification_review_start");
  await reviewer.call("specification_open", { project, specification });
  await observer.call("specification_open", { project, specification });
  return { project, directory, source, author, reviewer, observer, review };
}

test("guarded read reports a journal race without claiming semantic source drift", async (t) => {
  const f = await fixture(t, "read-race");
  const first = await readItem(f.author, f.review.review_ref, 0);
  let entered;
  const atBarrier = new Promise((resolve) => { entered = resolve; });
  let release;
  const released = new Promise((resolve) => { release = resolve; });

  const guarded = readConsistent(f.observer.context(), async (context) => {
    await load(context, "decisions");
    entered();
    await released;
    return { inconsistent_result_must_not_escape: true };
  });
  await atBarrier;
  await f.author.call("specification_review_record", covered(f.review.review_ref, 0, first));
  release();

  await assert.rejects(guarded, (error) => {
    assert.equal(error.code, "CONFLICT");
    const details = conflictDetails(error);
    assert.equal(details.conflict_cause, "dependency_changed_during_read");
    assert.equal(details.next_action, "reopen_and_inspect_review");
    assert.equal(details.operation_applied, undefined);
    assert.ok(!JSON.stringify(details.details).includes(f.project));
    return true;
  });

  await f.observer.call("specification_open", { project: f.project, specification: "review-conflict-read-race" });
  const status = await f.observer.call("specification_review_status", { review_ref: f.review.review_ref });
  assert.equal(status.recorded_items, 1);
});

test("a conflict raised inside the read callback keeps fixed recovery diagnostics", async (t) => {
  const f = await fixture(t, "callback-race");
  const first = await readItem(f.author, f.review.review_ref, 0);

  await assert.rejects(
    readConsistent(f.observer.context(), async (context) => {
      await load(context, "decisions");
      await f.author.call("specification_review_record", covered(f.review.review_ref, 0, first));
      await load(context, "decisions");
      return { inconsistent_result_must_not_escape: true };
    }),
    (error) => {
      assert.equal(error.code, "CONFLICT");
      const details = conflictDetails(error);
      assert.equal(details.conflict_cause, "dependency_changed_during_read");
      assert.equal(details.next_action, "reopen_and_inspect_review");
      assert.equal(details.operation_applied, undefined);
      return true;
    },
  );
});

test("stale workflow context and semantic review drift have distinct fixed causes", async (t) => {
  const stale = await fixture(t, "stale-context");
  const first = await readItem(stale.author, stale.review.review_ref, 0);
  const reviewerContext = stale.reviewer.context();
  await stale.author.call("specification_review_record", covered(stale.review.review_ref, 0, first));
  const staleResponse = await stale.reviewer.call("specification_review_complete", {
    context: reviewerContext,
    review_ref: stale.review.review_ref,
  }, "CONFLICT");
  const staleDetails = conflictDetails(staleResponse.error);
  assert.equal(staleDetails.conflict_cause, "stale_context");
  assert.equal(staleDetails.next_action, "reopen_and_inspect_review");
  assert.equal(staleDetails.operation_applied, false);
  const staleLifecycle = staleDetails.details.issues.find((issue) => issue.kind === "review_lifecycle");
  assert.equal(staleLifecycle?.review_ref, stale.review.review_ref);
  assert.equal(staleLifecycle?.mode, "full");

  const changed = await fixture(t, "source-changed");
  const read = await readItem(changed.reviewer, changed.review.review_ref, 0);
  await writeFile(
    join(changed.directory, "spec.md"),
    `${changed.source}\n### CF-002: Recovery\nReject output before recovery.\n`,
  );
  const changedResponse = await changed.reviewer.call(
    "specification_review_record",
    covered(changed.review.review_ref, 0, read),
    "STALE_REVIEW",
  );
  const changedDetails = conflictDetails(changedResponse.error);
  assert.equal(changedDetails.conflict_cause, "review_source_changed");
  assert.equal(changedDetails.next_action, "start_fresh_review");
  assert.equal(changedDetails.operation_applied, undefined);
});

test("unclassified conflicts use bounded redacted unknown diagnostics", async (t) => {
  const f = await fixture(t, "unknown");
  const sentinel = `private-conflict-${"x".repeat(400)}`;
  const response = await f.author.call("decision_link_requirements_batch", {
    items: [{ decision_ref: { id: sentinel, revision: 1 }, requirement_ids: ["CF-001"] }],
  }, "CONFLICT");
  const details = conflictDetails(response.error);
  assert.equal(details.conflict_cause, "unknown");
  assert.equal(details.next_action, "reopen_and_inspect_review");
  assert.ok(Buffer.byteLength(JSON.stringify(details.details)) <= 8192);
  assert.ok(!JSON.stringify(details.details).includes(sentinel));
  assert.ok(!JSON.stringify(details.details).includes(f.project));
});

test("failed conflict enrichment retains a bounded redacted unknown fallback", async (t) => {
  const f = await fixture(t, "fallback");
  const sentinel = `private-fallback-${"x".repeat(400)}`;
  const oversizedIssues = Array.from({ length: 24 }, (_, index) => ({
    kind: "validation",
    category: "stale",
    item_index: index,
    path: [sentinel, "nested", index],
    raw: sentinel.repeat(8),
  }));

  await assert.rejects(
    mutate(f.author.context(), "decisions", "test_conflict_fallback", {}, async () => {
      await writeFile(join(f.directory, "decisions.yaml"), "invalid: [yaml\n");
      throw new WorkflowError("CONFLICT", "Synthetic safe conflict.", {
        conflict_cause: "stale_context",
        details: { issues: oversizedIssues },
      });
    }),
    (error) => {
      assert.equal(error.code, "CONFLICT");
      const details = conflictDetails(error);
      assert.equal(details.conflict_cause, "unknown");
      assert.equal(details.next_action, "reopen_and_inspect_review");
      assert.equal(details.operation_applied, false);
      const encoded = JSON.stringify(details.details);
      assert.ok(Buffer.byteLength(encoded) <= 8192);
      assert.ok(!encoded.includes(sentinel));
      assert.ok(!encoded.includes(f.project));
      return true;
    },
  );
});
