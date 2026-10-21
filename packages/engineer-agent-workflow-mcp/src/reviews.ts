import { randomUUID } from "node:crypto";
import { z } from "zod";
import { tool } from "./api.js";
import { reviewLifecycleDiagnostics, workflowDiagnostics } from "./diagnostics.js";
import { mechanicalCoverage, portion } from "./requirements.js";
import type { RequirementSource } from "./requirements.js";
import { reference } from "./scope.js";
import { contextInput, decode, fail, hash, id, mutate, readConsistent, result, rows, text, unchanged } from "./state.js";
import { getRun, inventory, itemAt, receipt, reviewRuns, snapshot, statusRegressed } from "./review-model.js";
import { consistencyReceipt, reviewBody, validateFollowup } from "./review-followup.js";
import type { Context, Data } from "./state.js";
import { saveReviewInputs } from "./review-snapshots.js";

const reviewInput = { ...contextInput, review_ref: id };
const verdict = z.enum(["covered", "gap", "conflict", "not_applicable"]);
const MAX_REVIEW_BATCH_ITEMS = 20;
const MAX_REVIEW_BATCH_ARGUMENT_BYTES = 131_072;

const batchVerdict = z.object({
  item_index: z.number().int().nonnegative(),
  read_receipt: text.describe("Exact complete-read receipt returned by specification_review_get for this review item; do not reconstruct or reuse another item's receipt."),
  verdict,
  explanation: text,
  evidence_requirement_ids: z.array(id).max(100).optional(),
  evidence_source_refs: z.array(reference).max(100).optional().describe("Exact decision references supporting this item verdict, as returned by the managed specification workflow."),
  counterexample: text.optional(),
}).strict();

const reviewBatchInput = z.object({
  ...reviewInput,
  items: z.array(batchVerdict).min(1).max(MAX_REVIEW_BATCH_ITEMS),
}).strict().superRefine((value, context) => {
  if (Buffer.byteLength(JSON.stringify(value), "utf8") > MAX_REVIEW_BATCH_ARGUMENT_BYTES) {
    context.addIssue({
      code: "custom",
      message: `Compact review batch arguments must not exceed ${MAX_REVIEW_BATCH_ARGUMENT_BYTES} UTF-8 bytes.`,
    });
  }
  const indexes = new Set<number>();
  value.items.forEach((item, itemIndex) => {
    if (indexes.has(item.item_index)) {
      context.addIssue({
        code: "custom",
        message: "Review batch items must use distinct item indexes.",
        path: ["items", itemIndex, "item_index"],
      });
    }
    indexes.add(item.item_index);
  });
});

interface VerdictArguments {
  readonly item_index: number;
  readonly read_receipt: string;
  readonly verdict: "covered" | "gap" | "conflict" | "not_applicable";
  readonly explanation: string;
  readonly evidence_requirement_ids: readonly string[];
  readonly evidence_source_refs: readonly Data[];
  readonly counterexample?: string;
}

type BatchFailure =
  | { readonly kind: "batch_member"; readonly category: "duplicate" | "unknown" | "foreign" | "stale" | "unknown_requirement" }
  | { readonly kind: "validation"; readonly field?: keyof VerdictArguments };

export async function reviewState(context: Context, source: RequirementSource, ledger: Data, expected?: string, observeApproval = true): Promise<Data> {
  const s = await snapshot(context, ledger, source), runs = reviewRuns(ledger), run = runs.at(-1);
  let approvalCheckpointWritten = false;
  if (observeApproval && run && run.source_version === s.version && run.status_at_start === "Draft" && source.status === "Approved" && !run.approval_observed) {
    // Observe an author-made status transition; never approve or rewrite spec.md.
    const fresh = await result(context, {});
    await mutate(String(fresh.context), "decisions", "specification_check_state_observe_approval", { review_ref: run.id, source_version: s.version }, async (value, current) => {
      const latest = await snapshot(current), target = getRun(latest, String(run.id));
      if (latest.source.status !== "Approved" || target.source_version !== s.version) fail("CONFLICT", "The specification changed while observing its status.");
      const saved = reviewRuns(value).find((r) => r.id === run.id)!;
      saved.approval_observed = true;
      return { review_ref: run.id, approval_observed: true };
    });
    run.approval_observed = true;
    approvalCheckpointWritten = true;
  }
  let coverage_status = "legacy_unverified";
  if (run) coverage_status = run.source_version !== s.version || statusRegressed(run, source) ? "stale" : run.completed ? String(run.outcome) : "pending";
  if (expected && expected !== s.version) coverage_status = "stale";
  const currentCheckpoint = Boolean(
    run
    && run.source_version === s.version
    && !statusRegressed(run, source)
    && run.status_at_start === "Draft"
    && run.approval_observed === true
    && source.status === "Approved",
  );
  return {
    document_status: source.status === "Draft" ? "draft"
      : source.status === "Approved" ? "approved" : "missing",
    approval_checkpoint_status: source.status !== "Approved"
      ? "not_applicable" : currentCheckpoint ? "recorded" : "absent",
    approval_checkpoint_written: approvalCheckpointWritten,
    coverage_status,
    source_version: s.version,
    specification_version: source.version,
    review_ref: run?.id ?? null,
    semantic_correctness_proven: false,
    reviewer_independence_authenticated: false,
  };
}

function reviewFailure(
  code: string,
  message: string,
  run: Data,
  reason: string,
  nextAction: string,
  batchPosition?: number,
  batchFailure: BatchFailure = { kind: "validation" },
): never {
  if (batchPosition !== undefined) {
    const issue: Data = batchFailure.kind === "batch_member"
      ? {
        kind: "batch_member",
        item_index: batchPosition,
        category: batchFailure.category,
      }
      : {
        kind: "validation",
        category: "invalid_value",
        path: ["items", batchPosition, ...(batchFailure.field ? [batchFailure.field] : [])],
      };
    fail(code, message, {
      details: workflowDiagnostics([
        issue,
        {
          kind: "review_lifecycle",
          review_ref: String(run.id),
          mode: run.followup ? "followup" : "full",
          reason,
          next_action: nextAction,
        },
      ], nextAction),
    });
  }
  fail(code, message, reviewLifecycleDiagnostics({
    reviewRef: String(run.id),
    mode: run.followup ? "followup" : "full",
    reason,
    nextAction,
  }));
}

function validateVerdict(
  context: Context,
  ledger: Data,
  reviewSnapshot: Awaited<ReturnType<typeof snapshot>>,
  run: Data,
  input: VerdictArguments,
  batchPosition?: number,
): Data {
  const item = inventory(reviewSnapshot)[input.item_index];
  if (!item) reviewFailure("INVALID_INPUT", "The review item index is outside its inventory.", run, "item_unknown", "correct_verdict_input", batchPosition, { kind: "batch_member", category: "unknown" });
  if (run.completed) reviewFailure("INVALID_STATE", "A recorded verdict cannot be overwritten; finish the review or start another if needed.", run, "review_completed", "inspect_review_status", batchPosition, { kind: "validation", field: "item_index" });
  if ((run.followup || run.consistency_required === true) && item.kind === "context") reviewFailure("INVALID_STATE", "Use specification_review_consistency_record for the whole-specification context verdict.", run, "consistency_pending", "record_consistency", batchPosition, { kind: "validation", field: "item_index" });
  if (rows(run.results).some((record) => record.item_index === input.item_index)) reviewFailure("INVALID_STATE", "A recorded verdict cannot be overwritten; finish the review or start another if needed.", run, "verdict_already_recorded", "inspect_review_status", batchPosition, { kind: "batch_member", category: "duplicate" });
  if (input.read_receipt !== receipt(context, run, item, reviewBody(item, reviewSnapshot, run))) reviewFailure("INCOMPLETE_READ", "Complete the item's exact read before recording its verdict.", run, "item_read_incomplete", "finish_item_read", batchPosition, { kind: "batch_member", category: "foreign" });
  if (["gap", "conflict"].includes(input.verdict) && !input.counterexample) reviewFailure("INVALID_INPUT", "A finding needs concrete omitted or contradictory behavior.", run, "finding_incomplete", "correct_verdict_input", batchPosition, { kind: "validation", field: "counterexample" });
  if (input.evidence_requirement_ids.some((requirementId) => !reviewSnapshot.source.requirements.some((requirement) => requirement.id === requirementId))) {
    reviewFailure("BROKEN_REFERENCE", "Review evidence must point to existing requirement definitions and source revisions.", run, "evidence_invalid", "correct_verdict_input", batchPosition, { kind: "batch_member", category: "unknown_requirement" });
  }
  if (input.evidence_source_refs.some((target) => !rows(ledger.decisions).some((decision) => decision.id === target.id && decision.revision === target.revision))) {
    reviewFailure("BROKEN_REFERENCE", "Review evidence must point to existing requirement definitions and source revisions.", run, "evidence_invalid", "correct_verdict_input", batchPosition, { kind: "batch_member", category: "foreign" });
  }
  if (input.verdict === "covered" && item.kind === "source" && item.value.id !== "scope.manifest" && !item.value.context_reason && !input.evidence_requirement_ids.length) reviewFailure("EVIDENCE_REQUIRED", "A covered behavioral source needs explicit supporting requirement references.", run, "evidence_incomplete", "correct_verdict_input", batchPosition, { kind: "validation", field: "evidence_requirement_ids" });
  if (input.verdict === "covered" && item.kind === "requirement" && !input.evidence_source_refs.length) reviewFailure("EVIDENCE_REQUIRED", "A justified requirement needs explicit original source references.", run, "evidence_incomplete", "correct_verdict_input", batchPosition, { kind: "validation", field: "evidence_source_refs" });
  if (input.verdict === "not_applicable" && !(item.kind === "source" && item.value.context_reason)) reviewFailure("INVALID_INPUT", "Only an explicitly classified context source can receive an exclusion.", run, "verdict_not_applicable", "correct_verdict_input", batchPosition, { kind: "validation", field: "verdict" });
  return {
    item_index: input.item_index,
    item_key: item.key,
    verdict: input.verdict,
    explanation: input.explanation,
    ...(input.counterexample ? { counterexample: input.counterexample } : {}),
    requirement_ids: [...input.evidence_requirement_ids],
    source_refs: [...input.evidence_source_refs],
  };
}

export const reviewTools = [
  tool("specification_review_start", "Start or resume a fixed completeness-review inventory; require_consistency enables an enhanced full review, while unchanged same-mode work resumes without writing and explicit mode full replaces a followup without inherited verdicts. Conflict errors expose fixed conflict_cause and next_action; do not retry writes without explicit operation-effect evidence.", z.object({ ...contextInput, mode: z.literal("full").optional(), require_consistency: z.literal(true).optional().describe("Request enhanced full-review final whole-specification consistency evidence; omission preserves legacy full-review behavior.") }).strict(), true, async (a) => mutate(a.context, "decisions", "specification_review_start", a, async (ledger, context) => {
    const s = await snapshot(context, ledger);
    if (!s.source.requirements.length || !s.source.status) fail("INVALID_SPECIFICATION", "Write Draft or Approved status and explicit requirement definitions first.");
    if (s.decisions.some((d) => ["needs_user", "blocked"].includes(String(d.state)))) fail("ANSWER_REQUIRED", "Resolve material questions before review.");
    const issues = mechanicalCoverage(s.source, ledger);
    const runs = reviewRuns(ledger), previous = runs.at(-1);
    const requestedConsistency = a.require_consistency === true;
    const current = previous && !previous.completed && previous.source_version === s.version && !statusRegressed(previous, s.source)
      ? previous
      : undefined;
    let run: Data | undefined;
    let resumed = false;
    const currentConsistency = current?.consistency_required === true;
    const explicitFreshFull = current && a.mode === "full"
      && (Boolean(current.followup) || currentConsistency !== requestedConsistency);
    if (current && !explicitFreshFull) {
      if ((current.followup && requestedConsistency) || (!current.followup && currentConsistency !== requestedConsistency)) {
        reviewFailure(
          "INVALID_STATE",
          "An unfinished review exists in a different review mode; preserve it or explicitly start a fresh full review.",
          current,
          "review_mode_mismatch",
          "start_fresh_review",
        );
      }
      run = current;
      resumed = true;
    }
    if (!run) {
      const input_snapshot = await saveReviewInputs(context, s);
      run = { id: randomUUID(), source_version: s.version, specification_version: s.source.version, status_at_start: s.source.status, created_at: new Date().toISOString(), completed: false, outcome: "pending", results: [], ...(requestedConsistency ? { consistency_required: true } : {}) };
      run.input_snapshot = input_snapshot;
      ledger.specification_reviews = { version: 1, runs: [...runs, run] };
    }
    const output = { review_ref: run.id, source_version: s.version, total_items: inventory(s).length, recorded_items: rows(run.results).length, consistency_required: Boolean(run.followup) || run.consistency_required === true, mechanical_status: issues.length ? "fail" : "pass", mechanical_issues: issues.slice(0, 20), total_mechanical_issues: issues.length, next: issues.length ? "Repair mechanical coverage and start a fresh review before delegating." : "Use a separate context to read every item completely and record an evidence-based verdict." };
    return resumed ? unchanged(output) : output;
  })),
  tool("specification_review_status", "Read current progress, freshness and followup consistency state for one review without creating, completing, checkpointing or changing it. Read races fail with fixed conflict_cause and next_action instead of returning inconsistent success.", z.object(reviewInput).strict(), false, async (a) => readConsistent(a.context, async (context) => {
    const s = await snapshot(context);
    const run = reviewRuns(s.ledger).find((candidate) => candidate.id === a.review_ref);
    if (!run) fail("NOT_FOUND", "The review does not belong to this specification.");
    const items = inventory(s), records = rows(run.results);
    const stale = run.source_version !== s.version || statusRegressed(run, s.source);
    const coverageStatus = stale ? "stale" : run.completed ? String(run.outcome) : "pending";
    const nextIndex = !stale && !run.completed
      ? items.findIndex((item, index) => !records.some((record) => record.item_index === index && record.item_key === item.key))
      : -1;
    return {
      review_ref: run.id,
      review_source_version: run.source_version,
      current_source_version: s.version,
      review_specification_version: run.specification_version,
      current_specification_version: s.source.version,
      coverage_status: coverageStatus,
      total_items: items.length,
      recorded_items: records.length,
      next_item_index: nextIndex < 0 ? null : nextIndex,
      consistency_required: Boolean(run.followup) || run.consistency_required === true,
      ...(run.followup || run.consistency_required === true ? { consistency_status: (run.consistency as Data | undefined)?.verdict ?? "pending", consistency_item_index: stale || run.completed ? null : items.length - 1,
        ...(run.followup ? { carried_items: records.filter((record) => record.carried_from).length } : {}) } : {}),
    };
  })),
  tool("specification_review_get", "Read one item from the server-enumerated inventory, including exact original sources; follow every continuation before recording its verdict.", z.object({ ...reviewInput, item_index: z.number().int().nonnegative(), cursor: text.optional() }).strict(), false, async (a) => {
    const context = decode(a.context), s = await snapshot(context), run = getRun(s, a.review_ref), { item, total } = itemAt(s, a.item_index);
    const recorded = rows(run.results).find((r) => r.item_index === a.item_index);
    const body = reviewBody(item, s, run, recorded ?? null), identity = hash(JSON.stringify([context.project, context.specification, run.id, s.version, item.key, body]));
    const part = portion(body, identity, a.cursor);
    return result(context, { review_ref: run.id, source_version: s.version, item_index: a.item_index, item_key: item.key, kind: item.kind, total_items: total, next_item_index: a.item_index + 1 < total ? a.item_index + 1 : null, ...part, recorded_result: recorded ? { verdict: recorded.verdict, ...(recorded.carried_from ? { carried_from: recorded.carried_from } : {}) } : null, read_receipt: part.complete ? receipt(context, run, item, reviewBody(item, s, run)) : null,
      ...((run.followup || run.consistency_required === true) && item.kind === "context" ? { consistency_read_receipt: part.complete ? consistencyReceipt(context, run, item, s) : null } : {}) });
  }),
  tool("specification_review_record", "Record one evidence-based verdict for a completely read item; lifecycle diagnostics direct invalid review states or incomplete reads, without authenticating reviewer independence or correctness. Conflict errors preserve operation-effect evidence and expose fixed conflict_cause and next_action; never replay blindly.", z.object({ ...reviewInput, item_index: z.number().int().nonnegative(), read_receipt: text, verdict: z.enum(["covered", "gap", "conflict", "not_applicable"]), explanation: text, evidence_requirement_ids: z.array(id).max(100).default([]), evidence_source_refs: z.array(reference).max(100).default([]), counterexample: text.optional() }).strict(), true, async (a) => mutate(a.context, "decisions", "specification_review_record", a, async (ledger, context) => {
    const s = await snapshot(context, ledger), run = getRun(s, a.review_ref);
    const record = validateVerdict(context, ledger, s, run, {
      item_index: a.item_index,
      read_receipt: a.read_receipt,
      verdict: a.verdict,
      explanation: a.explanation,
      evidence_requirement_ids: a.evidence_requirement_ids,
      evidence_source_refs: a.evidence_source_refs,
      ...(a.counterexample === undefined ? {} : { counterexample: a.counterexample }),
    });
    run.results = [...rows(run.results), record];
    return { review_ref: run.id, item_index: a.item_index, verdict: a.verdict, recorded_items: rows(run.results).length };
  })),
  tool("specification_review_record_batch", "Atomically record 1-20 ordered evidence-based verdicts after every item has been read completely; arguments are limited to 131072 compact UTF-8 JSON bytes, and the batch neither completes a review nor records followup consistency. Conflict errors preserve operation-effect evidence and expose fixed conflict_cause and next_action; never replay blindly.", reviewBatchInput, true, async (a) => mutate(a.context, "decisions", "specification_review_record_batch", a, async (ledger, context) => {
    const s = await snapshot(context, ledger), run = getRun(s, a.review_ref);
    const records = a.items.map((item, batchPosition) => validateVerdict(context, ledger, s, run, {
      item_index: item.item_index,
      read_receipt: item.read_receipt,
      verdict: item.verdict,
      explanation: item.explanation,
      evidence_requirement_ids: item.evidence_requirement_ids ?? [],
      evidence_source_refs: item.evidence_source_refs ?? [],
      ...(item.counterexample === undefined ? {} : { counterexample: item.counterexample }),
    }, batchPosition));
    run.results = [...rows(run.results), ...records];
    return {
      review_ref: run.id,
      items: records.map((record) => ({
        item_index: record.item_index,
        item_key: record.item_key,
        verdict: record.verdict,
      })),
      batch_size: records.length,
      recorded_items: rows(run.results).length,
    };
  })),
  tool("specification_review_complete", "Close a fully recorded fresh review; return gaps or the recorded agent pass, never specification approval.", z.object(reviewInput).strict(), true, async (a) => mutate(a.context, "decisions", "specification_review_complete", a, async (ledger, context) => {
    const s = await snapshot(context, ledger), run = getRun(s, a.review_ref), items = inventory(s), records = rows(run.results);
    if (run.completed) reviewFailure("INVALID_STATE", "A completed review is inspected through specification_review_status.", run, "review_completed", "inspect_review_status");
    if (mechanicalCoverage(s.source, ledger).length) reviewFailure("COVERAGE_REQUIRED", "Resolve mechanical coverage and start a fresh review.", run, "coverage_changed", "start_fresh_review");
    if ((run.followup || run.consistency_required === true) && !run.consistency && items.filter((item) => item.kind !== "context").every((item) => records.some((r) => r.item_key === item.key))) reviewFailure("CONSISTENCY_REQUIRED", "Complete the whole-specification consistency check.", run, "consistency_pending", "record_consistency");
    if (records.length !== items.length || items.some((item, i) => !records.some((r) => r.item_index === i && r.item_key === item.key))) reviewFailure("INCOMPLETE_REVIEW", "Every source, requirement, active profile and context item needs a verdict.", run, "detailed_checks_pending", "read_and_record_next_item");
    await validateFollowup(context, run, s);
    run.completed = true;
    run.outcome = records.some((r) => ["gap", "conflict"].includes(String(r.verdict))) || (run.consistency && (run.consistency as Data).verdict !== "consistent") ? "gaps" : "reviewed";
    return { review_ref: run.id, coverage_status: run.outcome, source_version: s.version, semantic_correctness_proven: false, reviewer_independence_authenticated: false, approved_by_tool: false };
  })),
];
