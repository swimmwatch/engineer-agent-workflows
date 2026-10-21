import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function planningFixture(
  t,
  server,
  { legacy = false, observeApproval = true } = {},
) {
  const project = await mkdtemp(join(tmpdir(), "workflow-planning-"));
  t.after(() => rm(project, { recursive: true, force: true }));
  const specification = "planning",
    directory = "docs/specs/planning";
  let context;
  async function raw(name, args = {}) {
    return server.callTool({
      name,
      arguments: {
        ...(name === "specification_open" ? {} : { context }),
        ...args,
      },
    });
  }
  async function call(name, args = {}, error) {
    const response = await raw(name, args);
    assert.ok(Buffer.byteLength(JSON.stringify(response)) <= 65536);
    if (error) {
      assert.equal(response.isError, true, JSON.stringify(response));
      assert.equal(response.structuredContent.error.code, error);
      return response.structuredContent;
    }
    assert.notEqual(response.isError, true, JSON.stringify(response));
    context = response.structuredContent.context ?? context;
    return response.structuredContent.result;
  }
  await call("specification_open", { project, specification });
  const scope = await call("scope_propose", {
    depth: "standard",
    rationale: ["Simulation only."],
    profiles: [{ id: "core", reason: "Small fixture." }],
  });
  const answer = await call("question_record_answer", {
    question_ref: scope.question_ref,
    selected_ids: ["confirm"],
    text: "Confirm simulation scope.",
    source: "fixture:scope",
  });
  await call("scope_confirm", {
    proposal_ref: scope.question_ref,
    answer_ref: answer.decision_ref,
  });
  const body =
    "\n\n### PLAN-001: Fixture behavior\nAccept valid input and reject invalid input.\n";
  await writeFile(join(project, directory, "spec.md"), "Status: Draft" + body);
  await call("decision_record_instruction", {
    category: "behavior",
    text: "Accept valid input and reject invalid input.",
    source: "fixture:initial",
    kind: "initial_request",
    requirement_ids: ["PLAN-001"],
  });
  if (!legacy) {
    const review = await call("specification_review_start");
    let index = 0;
    while (index !== null) {
      let item,
        cursor,
        text = "";
      do {
        item = await call("specification_review_get", {
          review_ref: review.review_ref,
          item_index: index,
          ...(cursor ? { cursor } : {}),
        });
        text += item.text;
        cursor = item.next_cursor;
      } while (cursor);
      const payload = JSON.parse(text);
      await call("specification_review_record", {
        review_ref: review.review_ref,
        item_index: index,
        read_receipt: item.read_receipt,
        verdict: "covered",
        explanation: "Simulation-only fixture verdict.",
        evidence_requirement_ids:
          payload.kind === "source"
            ? (payload.source.requirement_ids ?? [])
            : [],
        evidence_source_refs:
          payload.kind === "requirement" ? payload.source_refs : [],
      });
      index = item.next_item_index;
    }
    await call("specification_review_complete", {
      review_ref: review.review_ref,
    });
  }
  await writeFile(
    join(project, directory, "spec.md"),
    "Status: Approved" + body,
  );
  const state = observeApproval
    ? await call("specification_check_state")
    : await (
        await import("../dist/checks.js")
      ).specificationState(
        (await import("../dist/state.js")).decode(context),
        undefined,
        false,
      );
  assert.equal(state.status, "pass");
  await mkdir(join(project, directory, "tasks"));
  const sources = {
    shared: "# Plan\n\n## Shared\nUse plain functions.\n",
    p1: "# P1\n\n## Technical proposal\nparseInput(raw) returns validated records.\n\n## Progress\nPending.\n",
    p2: "# P2\n\n## Technical proposal\nsummarize(records) returns totals.\n",
    independent: "# P3\n\n## Technical proposal\nUpdate configuration.\n",
  };
  const paths = Object.fromEntries(
    Object.keys(sources).map((key) => [key, `${directory}/tasks/${key}.md`]),
  );
  for (const [key, text] of Object.entries(sources))
    await writeFile(join(project, paths[key]), text);
  const proposals = ["p1", "p2", "independent"].map((key) => ({
    id: key,
    packet_id: key,
    requirement_ids: ["PLAN-001"],
    sources: [
      ...(key !== "independent"
        ? [{ path: paths.shared, heading: "Shared" }]
        : []),
      { path: paths[key], heading: "Technical proposal" },
    ],
  }));
  const prepare = (extra = {}) =>
    call("planning_question_prepare", {
      expected_source_version: state.source_version,
      text: "Agree the named concrete proposals?",
      kind: "free_text",
      proposals,
      ...extra,
    });
  const record = (question_ref, accepted_proposal_ids, extra = {}) =>
    call("planning_question_record_answer", {
      question_ref,
      text: "Fixture customer accepts these proposals.",
      source: "fixture:native-answer",
      accepted_proposal_ids,
      ...extra,
    });
  const check = (agreement, extra = {}) =>
    call("planning_packet_check", {
      packet_id: agreement.packet_id,
      agreement_ref: agreement.agreement_ref,
      expected_proposal_digest: agreement.proposal_digest,
      ...extra,
    });
  async function exact(decision_ref) {
    let cursor,
      part,
      text = "";
    do {
      part = await call("planning_decision_get", {
        decision_ref,
        ...(cursor ? { cursor } : {}),
      });
      text += part.text;
      cursor = part.next_cursor;
    } while (cursor);
    return JSON.parse(text);
  }
  return {
    project,
    directory,
    paths,
    proposals,
    sources,
    state,
    call,
    raw,
    prepare,
    record,
    check,
    exact,
    get context() {
      return context;
    },
    bytes: () => readFile(join(project, directory, "decisions.yaml"), "utf8"),
    write: (key, text) => writeFile(join(project, paths[key]), text),
  };
}
