import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, before } from "node:test";
import { TextEncoder } from "node:util";
import { fileURLToPath, URL } from "node:url";

import { z } from "zod";
import { stringify } from "yaml";

import { tool } from "../dist/api.js";
import { parseLedger } from "../dist/ledger.js";
import { WorkflowError } from "../dist/state.js";
import { createSharedStdioHarness } from "../test-support/stdio-harness.mjs";

const entrypoint = fileURLToPath(new URL("../dist/main.js", import.meta.url));
const server = createSharedStdioHarness({ entrypoint, name: "workflow-diagnostics-test" });

before(() => server.start());
after(() => server.close());

async function fixture(t, specification) {
  const project = await mkdtemp(join(tmpdir(), "workflow-diagnostics-"));
  t.after(() => rm(project, { recursive: true, force: true }));
  let context;

  async function raw(name, arguments_ = {}) {
    return server.callTool({
      name,
      arguments: {
        ...(context && name !== "specification_open" ? { context } : {}),
        ...arguments_,
      },
    });
  }

  async function call(name, arguments_ = {}, expectedError) {
    const response = await raw(name, arguments_);
    if (expectedError) {
      assert.equal(response.isError, true, JSON.stringify(response));
      assert.equal(response.structuredContent.error.code, expectedError);
      return response.structuredContent;
    }
    assert.notEqual(response.isError, true, JSON.stringify(response));
    context = response.structuredContent.context ?? context;
    return response.structuredContent.result;
  }

  await call("specification_open", { project, specification });
  const proposal = await call("scope_propose", {
    depth: "deep",
    rationale: ["Exercise workflow diagnostics."],
    profiles: [{ id: "core", reason: "Workflow behavior." }],
  });
  const answer = await call("question_record_answer", {
    question_ref: proposal.question_ref,
    selected_ids: ["confirm"],
    text: "Confirmed fixture scope.",
    source: "fixture-customer:scope",
  });
  await call("scope_confirm", {
    proposal_ref: proposal.question_ref,
    answer_ref: answer.decision_ref,
  });
  const directory = join(project, "docs/specs", specification);
  await mkdir(directory, { recursive: true });
  return {
    project,
    directory,
    call,
    raw,
    context: () => context,
    ledger: join(directory, "decisions.yaml"),
    spec: join(directory, "spec.md"),
  };
}

function diagnostic(response) {
  const details = response.error.details;
  assert.ok(details && typeof details === "object", JSON.stringify(response));
  assert.ok(Array.isArray(details.issues), JSON.stringify(response));
  return details;
}

async function exactDecision(f, decisionRef) {
  let cursor;
  let text = "";
  do {
    const result = await f.call("decision_get", {
      decision_ref: decisionRef,
      ...(cursor ? { cursor } : {}),
    });
    text += result.text;
    cursor = result.next_cursor;
  } while (cursor);
  return JSON.parse(text);
}

test("workflow validation diagnostics are bounded, closed, and non-reflecting", async () => {
  const sentinelKey = "private_source_marker_key";
  const sentinelValue = "private-source-marker-value";
  const scenario = tool(
    "diagnostic_fixture",
    "Exercise workflow validation diagnostics.",
    z.object({
      items: z.array(z.object({ name: z.string().max(4) }).strict()).max(20),
    }).strict(),
    false,
    async () => ({ ok: true }),
  );

  let failure;
  try {
    await scenario.run({
      items: [
        { name: 42, [sentinelKey]: sentinelValue },
        ...Array.from({ length: 20 }, () => ({ name: "ok" })),
      ],
      [sentinelKey]: sentinelValue,
    });
  } catch (error) {
    failure = error;
  }

  assert.ok(failure instanceof WorkflowError);
  assert.equal(failure.code, "INVALID_INPUT");
  const details = failure.details.details;
  assert.ok(details && typeof details === "object");
  assert.ok(Array.isArray(details.issues));
  assert.ok(details.issues.length > 0 && details.issues.length <= 20);
  assert.ok(details.issues.every((issue) => issue.kind === "validation"));
  assert.ok(details.issues.some((issue) => issue.category === "unknown_field"));
  assert.ok(details.issues.some((issue) => issue.limit === 20));
  assert.equal(typeof details.truncated, "boolean");
  assert.equal(details.next_action, "use_published_schema");
  const encoded = JSON.stringify(details);
  assert.ok(Buffer.byteLength(encoded) <= 8192);
  assert.ok(!encoded.includes(sentinelKey));
  assert.ok(!encoded.includes(sentinelValue));
  assert.ok(!encoded.includes("stack"));
});

test("revision warnings count ambiguous heads rather than linear history", () => {
  const decision = (revision, supersedesRevision = null, state = "answered") => ({
    id: "workflow.policy",
    revision,
    category: "workflow",
    state,
    provenance: "fixture",
    question: null,
    answer: null,
    supersedes_revision: supersedesRevision,
    requirement_ids: ["PWF-036"],
  });
  const parse = (decisions) => parseLedger(
    new TextEncoder().encode(stringify({
      schema_version: 1,
      spec_slug: "workflow-diagnostics",
      decisions,
    })),
    "workflow-diagnostics",
  );

  const linear = parse([decision(1), decision(2, 1), decision(3, 2)]);
  assert.equal(linear.warningCounts.multiple_current_revisions, 0);
  assert.deepEqual(linear.current.map(({ id, revision }) => [id, revision]), [
    ["workflow.policy", 3],
  ]);

  const branch = parse([decision(1), decision(2, 1), decision(3, 1)]);
  assert.equal(branch.warningCounts.multiple_current_revisions, 1);

  const explicit = parse([
    decision(1, null, "superseded"),
    decision(2, 1),
  ]);
  assert.equal(explicit.warningCounts.multiple_current_revisions, 0);
});

test("saved-option and batch diagnostics identify recoverable state without partial writes", async (t) => {
  const f = await fixture(t, "diagnostic-links");
  const optionIds = Array.from(
    { length: 20 },
    (_, index) => `option-${String(index).padStart(2, "0")}-${"x".repeat(480)}`,
  );
  const question = await f.call("question_prepare", {
    category: "behavior",
    text: "Select a saved option.",
    kind: "single_choice",
    options: optionIds.map((id, index) => ({ id, label: `Option ${index}` })),
  });
  const beforeInvalidAnswer = await readFile(f.ledger, "utf8");
  const invalidAnswer = await f.call("question_record_answer", {
    question_ref: question.question_ref,
    selected_ids: ["private-source-marker-invalid-option"],
    text: "private-source-marker-answer",
    source: "fixture-customer:answer",
  }, "INVALID_INPUT");
  const answerDetails = diagnostic(invalidAnswer);
  const answerIssue = answerDetails.issues[0];
  assert.equal(answerIssue.kind, "question_options");
  assert.deepEqual(answerIssue.question_ref, question.question_ref);
  assert.equal(answerIssue.allowed_option_ids_complete, false);
  assert.deepEqual(answerIssue.decision_ref, question.question_ref);
  assert.equal(answerDetails.truncated, true);
  assert.ok(Buffer.byteLength(JSON.stringify(answerDetails)) <= 8192);
  assert.ok(!JSON.stringify(answerDetails).includes("private-source-marker"));
  assert.equal(await readFile(f.ledger, "utf8"), beforeInvalidAnswer);
  const savedQuestion = await exactDecision(f, question.question_ref);
  assert.deepEqual(savedQuestion.question.options.map(({ id }) => id), optionIds);
  await f.call("question_record_answer", {
    question_ref: question.question_ref,
    selected_ids: [optionIds[0]],
    text: "Selected the first saved option.",
    source: "fixture-customer:answer",
  });

  await writeFile(f.spec, "Status: Draft\n\n### PWF-035: Diagnostics\nPreserve atomic links.\n");
  const references = [];
  for (let index = 0; index < 20; index += 1) {
    const saved = await f.call("decision_record_fact", {
      category: "diagnostic",
      fact: `Observed fact ${index}.`,
      evidence: [`src/fixture-${index}.ts`],
    });
    references.push(saved.decision_ref);
  }
  const linked = await f.call("decision_link_requirements_batch", {
    items: references.map((decision_ref) => ({
      decision_ref,
      requirement_ids: ["PWF-035"],
    })),
  });
  assert.equal(linked.items.length, 20);
  const afterLinked = await readFile(f.ledger, "utf8");
  const noOp = await f.call("decision_link_requirements_batch", {
    items: linked.items.map(({ decision_ref }) => ({
      decision_ref,
      requirement_ids: ["PWF-035"],
    })),
  });
  assert.equal(noOp.operation_applied, false);
  assert.equal(await readFile(f.ledger, "utf8"), afterLinked);

  const oversized = await f.call("decision_link_requirements_batch", {
    items: Array.from({ length: 21 }, () => ({
      decision_ref: linked.items[0].decision_ref,
      requirement_ids: ["PWF-035"],
    })),
  }, "INVALID_INPUT");
  assert.ok(diagnostic(oversized).issues.some((issue) => (
    issue.kind === "validation" && issue.limit === 20
  )));

  const cases = [
    {
      name: "duplicate",
      error: "INVALID_INPUT",
      items: [linked.items[0], linked.items[0]].map(({ decision_ref }) => ({
        decision_ref,
        requirement_ids: ["PWF-035"],
      })),
      category: "duplicate",
      index: 1,
    },
    {
      name: "unknown",
      error: "CONFLICT",
      items: [{ decision_ref: { id: "missing.decision", revision: 1 }, requirement_ids: ["PWF-035"] }],
      category: "unknown",
      index: 0,
    },
    {
      name: "stale",
      error: "CONFLICT",
      items: [{ decision_ref: references[0], requirement_ids: ["PWF-035"] }],
      category: "stale",
      index: 0,
    },
    {
      name: "unknown requirement",
      error: "BROKEN_REFERENCE",
      items: [{ decision_ref: linked.items[0].decision_ref, requirement_ids: ["MISSING-001"] }],
      category: "unknown_requirement",
      index: 0,
    },
  ];
  for (const scenario of cases) {
    const before = await readFile(f.ledger, "utf8");
    const response = await f.call(
      "decision_link_requirements_batch",
      { items: scenario.items },
      scenario.error,
    );
    const issue = diagnostic(response).issues[0];
    assert.equal(issue.kind, "batch_member", scenario.name);
    assert.equal(issue.category, scenario.category, scenario.name);
    assert.equal(issue.item_index, scenario.index, scenario.name);
    assert.equal(await readFile(f.ledger, "utf8"), before, scenario.name);
  }
});

test("specification state separates document, review, and approval checkpoint observations", async (t) => {
  const missing = await fixture(t, "diagnostic-missing");
  const missingState = await missing.call("specification_check_state");
  assert.equal(missingState.status, "fail");
  assert.equal(missingState.document_status, "missing");
  assert.equal(missingState.approval_checkpoint_status, "not_applicable");
  assert.equal(missingState.approval_checkpoint_written, false);

  const f = await fixture(t, "diagnostic-state");
  await writeFile(f.spec, "Status: Draft\n\n### PWF-037: State\nExpose independent observations.\n");
  await f.call("decision_record_instruction", {
    category: "state",
    text: "Expose independent observations.",
    source: "fixture-customer:initial",
    kind: "initial_request",
    requirement_ids: ["PWF-037"],
  });
  const review = await f.call("specification_review_start");
  const draft = await f.call("specification_check_state");
  assert.equal(draft.document_status, "draft");
  assert.equal(draft.coverage_status, "pending");
  assert.equal(draft.approval_checkpoint_status, "not_applicable");
  assert.equal(draft.approval_checkpoint_written, false);
  const staleReviewContext = f.context();

  await writeFile(f.spec, "Status: Approved\n\n### PWF-037: State\nExpose independent observations.\n");
  const observed = await f.call("specification_check_state");
  assert.equal(observed.document_status, "approved");
  assert.equal(observed.approval_checkpoint_status, "recorded");
  assert.equal(observed.approval_checkpoint_written, true);
  const afterObservation = await readFile(f.ledger, "utf8");
  const repeated = await f.call("specification_check_state");
  assert.equal(repeated.approval_checkpoint_status, "recorded");
  assert.equal(repeated.approval_checkpoint_written, false);
  assert.equal(await readFile(f.ledger, "utf8"), afterObservation);
  await f.call("specification_review_status", { review_ref: review.review_ref });
  assert.equal(await readFile(f.ledger, "utf8"), afterObservation);

  const staleResponse = await f.raw("specification_review_complete", {
    context: staleReviewContext,
    review_ref: review.review_ref,
  });
  assert.equal(staleResponse.isError, true, JSON.stringify(staleResponse));
  assert.equal(staleResponse.structuredContent.error.code, "CONFLICT");
  const staleIssue = diagnostic(staleResponse.structuredContent).issues[0];
  assert.equal(staleIssue.kind, "review_lifecycle");
  assert.equal(staleIssue.reason, "stale_context");
  assert.equal(staleIssue.next_action, "reopen_and_inspect_review");
  assert.equal(await readFile(f.ledger, "utf8"), afterObservation);

  const fullFailure = await f.call(
    "specification_review_complete",
    { review_ref: review.review_ref },
    "INCOMPLETE_REVIEW",
  );
  const fullIssue = diagnostic(fullFailure).issues[0];
  assert.equal(fullIssue.kind, "review_lifecycle");
  assert.equal(fullIssue.mode, "full");
  assert.equal(fullIssue.reason, "detailed_checks_pending");
  assert.equal(fullIssue.next_action, "read_and_record_next_item");

  await writeFile(f.spec, "Status: Approved\n\n### PWF-037: State\nExpose changed observations.\n");
  const staleCheckpoint = await f.call("specification_check_state");
  assert.equal(staleCheckpoint.coverage_status, "stale");
  assert.equal(staleCheckpoint.approval_checkpoint_status, "absent");
  assert.equal(staleCheckpoint.approval_checkpoint_written, false);
});

test("an Approved-at-review-start document does not invent a transition checkpoint", async (t) => {
  const f = await fixture(t, "diagnostic-approved-start");
  await writeFile(f.spec, "Status: Approved\n\n### PWF-037: State\nPreserve author status.\n");
  await f.call("decision_record_instruction", {
    category: "state",
    text: "Preserve author status.",
    source: "fixture-customer:initial",
    kind: "initial_request",
    requirement_ids: ["PWF-037"],
  });
  await f.call("specification_review_start");
  const state = await f.call("specification_check_state");
  assert.equal(state.document_status, "approved");
  assert.equal(state.approval_checkpoint_status, "absent");
  assert.equal(state.approval_checkpoint_written, false);
});
