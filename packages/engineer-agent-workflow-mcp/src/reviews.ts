import { randomUUID } from "node:crypto";
import { z } from "zod";
import { tool } from "./api.js";
import { reviewLifecycleDiagnostics, workflowDiagnostics } from "./diagnostics.js";
import { mechanicalCoverage, portion } from "./requirements.js";
import type { RequirementSource } from "./requirements.js";
import { reference } from "./scope.js";
import { contextInput, decode, fail, hash, id, mutate, mutateReviewSubmission, obj, openContext, readConsistent, result, rows, slug, strings, text, unchanged, WorkflowError } from "./state.js";
import { getRun, inventory, itemAt, receipt, reviewRuns, snapshot, statusRegressed, supersedingReview } from "./review-model.js";
import { consistencyReceipt, reviewBody, validateFollowup, validateReviewProvenance } from "./review-followup.js";
import type { Context, Data } from "./state.js";
import { canonical, saveReviewInputs } from "./review-snapshots.js";
import { boundedSuccessResult } from "./response-budget.js";

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

const workflowDigest = z.string().regex(/^[a-f0-9]{64}$/);
const workflowPreparationInput = z.object({
  project: z.string().min(1).describe("Absolute project path owning the already enrolled specification review."),
  specification: slug.describe("Specification slug returned by specification_open for this project."),
  review_ref: id.describe("Exact enrolled review identity returned by specification_review_start or specification_review_followup_start; preparation never enrolls a review."),
  source_version: workflowDigest.describe("Exact source_version returned when this review was enrolled or observed through specification_review_status; changed sources block preparation."),
  host_concurrency: z.number().int().nonnegative().describe("Caller-observed number of available concurrent judging agents; this budget does not certify host or model availability."),
  stage: z.enum(["launch", "final"]).default("launch"),
  cursor: text.optional().describe("Exact server-issued continuation returned by this preparation scenario for the same review, source and host budget; omit for fresh preparation."),
}).strict();

function distinctSubmissionItems(items: readonly { item_index: number }[]): boolean {
  const indexes = new Set(items.map((item) => item.item_index));
  return indexes.size === items.length;
}

function submissionFits(input: Data): boolean {
  const serialized = JSON.stringify(input);
  return Buffer.byteLength(serialized, "utf8") <= MAX_REVIEW_BATCH_ARGUMENT_BYTES;
}

const workflowSubmissionInput = z.object({
  ...reviewInput,
  source_version: workflowDigest.describe("Exact source_version supplied by specification_review_prepare_workflow for this assignment; never substitute the opaque physical context version."),
  group_ref: text.describe("Exact group_ref returned in this judge's lane by specification_review_prepare_workflow; do not use a continuation cursor or another group's reference."),
  items: z.array(batchVerdict).min(1).max(MAX_REVIEW_BATCH_ITEMS)
    .refine(distinctSubmissionItems, "Submission items must have distinct indexes."),
}).strict().refine(submissionFits, "Compact review batch arguments must not exceed 131072 UTF-8 bytes.");

const workflowCursor = z.object({
  version: z.literal(1),
  kind: z.enum(["group", "lane", "required"]),
  review_ref: id,
  source_version: workflowDigest,
  required_hash: workflowDigest,
  prefix_count: z.number().int().nonnegative(),
  prefix_hash: workflowDigest,
  host_concurrency: z.number().int().nonnegative(),
  lane_index: z.number().int().min(0).max(3),
  group_index: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  token: workflowDigest,
}).strict();

type WorkflowCursor = z.output<typeof workflowCursor>;
type WorkflowIdentity = Pick<WorkflowCursor, "version" | "review_ref" | "source_version" |
  "required_hash" | "prefix_count" | "prefix_hash" | "host_concurrency">;
type ReviewSnapshot = Awaited<ReturnType<typeof snapshot>>;
interface WeightedItem { index: number; key: string; weight: number; characters: number; }
interface WorkflowGroup { items: WeightedItem[]; weight: number; lane: number; }
interface WorkflowPlan {
  identity: WorkflowIdentity;
  required: { index: number; key: string }[];
  groups: WorkflowGroup[];
  pending: number;
  weight: number;
  lanes: number;
}

function encodeWorkflowCursor(context: Context, identity: WorkflowIdentity, kind: WorkflowCursor["kind"], lane: number, group: number, offset = 0): string {
  const value = { ...identity, kind, lane_index: lane, group_index: group, offset };
  const token = hash(canonical([context.project, context.specification, value]));
  return Buffer.from(JSON.stringify({ ...value, token })).toString("base64url");
}

function decodeWorkflowCursor(value: string, context: Context, run: Data): WorkflowCursor {
  let decoded: unknown;
  try { decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")); }
  catch { fail("INVALID_CURSOR", "Use the server-issued workflow continuation unchanged."); }
  const parsed = workflowCursor.safeParse(decoded);
  if (!parsed.success) fail("INVALID_CURSOR", "Use the server-issued workflow continuation unchanged.");
  const { token, ...payload } = parsed.data;
  const expected = hash(canonical([context.project, context.specification, payload]));
  if (token !== expected) fail("INVALID_CURSOR", "Workflow continuation integrity check failed.");
  if (payload.review_ref !== run.id || payload.source_version !== run.source_version) {
    fail("STALE_CURSOR", "The workflow continuation belongs to another review/source.");
  }
  return parsed.data;
}

function requiredWorkflowItems(s: ReviewSnapshot, run: Data): { index: number; key: string }[] {
  const items = inventory(s);
  const required = run.followup ? new Set(strings(obj(run.followup).required_item_keys)) : undefined;
  if (required && [...required].some((key) => !items.some((item) => item.key === key))) {
    fail("INVALID_STATE", "The retained mandatory review set contains an unknown item.");
  }
  const selected = [];
  for (const [index, item] of items.entries()) {
    if (item.kind !== "context" && (!required || required.has(item.key))) {
      selected.push({ index, key: item.key });
    }
  }
  return selected;
}

function createWorkflowPlan(s: ReviewSnapshot, run: Data, hostConcurrency: number, cursor?: WorkflowCursor): WorkflowPlan {
  const records = rows(run.results);
  const required = requiredWorkflowItems(s, run);
  const requiredHash = hash(canonical(required));
  const prefixCount = cursor?.prefix_count ?? records.length;
  if (prefixCount > records.length) fail("STALE_CURSOR", "The saved review prefix is unavailable; prepare again.");
  const prefix = records.slice(0, prefixCount);
  const prefixHash = hash(canonical(prefix));
  if (cursor && (cursor.prefix_hash !== prefixHash || cursor.required_hash !== requiredHash
    || cursor.host_concurrency !== hostConcurrency)) {
    fail("STALE_CURSOR", "Saved progress, mandatory scope or host admission changed; prepare again.");
  }
  const identity: WorkflowIdentity = {
    version: 1, review_ref: String(run.id), source_version: s.version,
    required_hash: requiredHash, prefix_count: prefixCount, prefix_hash: prefixHash,
    host_concurrency: hostConcurrency,
  };
  const saved = new Set(prefix.map((record) => String(record.item_key)));
  const items = inventory(s);
  const pending: WeightedItem[] = [];
  for (const entry of required) {
    if (saved.has(entry.key)) continue;
    const body = reviewBody(items[entry.index]!, s, run);
    let characters = 0;
    for (let offset = 0; offset < body.length;) {
      const codePoint = body.codePointAt(offset)!;
      offset += codePoint > 0xffff ? 2 : 1;
      characters++;
    }
    pending.push({ ...entry, characters, weight: Math.max(1, Math.ceil(characters / 4096)) });
  }
  const weight = pending.reduce((sum, item) => sum + item.weight, 0);
  const lanes = pending.length ? Math.min(4, hostConcurrency, pending.length, Math.ceil(weight / 20)) : 0;
  if (pending.length && !lanes) fail("HOST_UNAVAILABLE", "The supplied host admission budget permits no judging lane.");
  const loads = Array.from({ length: lanes }, () => 0);
  const groups: WorkflowGroup[] = [];
  let offset = 0;
  // Rebuild source-limited metadata from the retained prefix rather than keeping
  // a second durable plan/cache. Qualify this handler cost with large workloads.
  while (offset < pending.length) {
    const selected: WeightedItem[] = [];
    let groupWeight = 0;
    while (offset < pending.length && selected.length < MAX_REVIEW_BATCH_ITEMS) {
      const item = pending[offset]!;
      if (selected.length && groupWeight + item.weight > 20) break;
      selected.push(item);
      groupWeight += item.weight;
      offset++;
    }
    let lane = 0;
    for (let index = 1; index < lanes; index++) if (loads[index]! < loads[lane]!) lane = index;
    loads[lane] = loads[lane]! + groupWeight;
    groups.push({ items: selected, weight: groupWeight, lane });
  }
  return { identity, required, groups, pending: pending.length, weight, lanes };
}

function workflowGroupMetadata(context: Context, plan: WorkflowPlan, run: Data, index: number, offset: number, limit: number): Data {
  const group = plan.groups[index];
  if (!group || offset >= group.items.length) fail("INVALID_CURSOR", "The workflow group continuation is outside its assignment.");
  const saved = new Set(rows(run.results).map((record) => String(record.item_key)));
  const selected = group.items.slice(offset, offset + limit);
  const nextOffset = offset + selected.length;
  const nextGroup = plan.groups.findIndex((candidate, groupIndex) => groupIndex > index && candidate.lane === group.lane);
  return {
    lane_index: group.lane, group_index: index,
    group_ref: encodeWorkflowCursor(context, plan.identity, "group", group.lane, index),
    item_count: group.items.length, weight: group.weight,
    items: selected.map((item) => ({ item_index: item.index, item_key: item.key,
      weight: item.weight, characters: item.characters, recorded: saved.has(item.key) })),
    items_cursor: nextOffset < group.items.length
      ? encodeWorkflowCursor(context, plan.identity, "group", group.lane, index, nextOffset) : null,
    next_cursor: nextGroup >= 0
      ? encodeWorkflowCursor(context, plan.identity, "lane", group.lane, nextGroup) : null,
  };
}

function workflowReadyArguments(context: Context, s: ReviewSnapshot, run: Data, plan: WorkflowPlan, stage: string, cursor: WorkflowCursor | undefined, limit: number): Data {
  const args: Data = {
    project: context.project, specification: context.specification,
    review_ref: run.id, source_version: s.version, specification_version: s.source.version,
    workload: { pending_items: plan.pending, total_weight: plan.weight, coefficient: 20,
      lane_count: plan.lanes, initial_saved_items: plan.identity.prefix_count },
    lanes: [],
  };
  if (cursor?.kind === "group" || cursor?.kind === "lane") {
    const group = plan.groups[cursor.group_index];
    if (!group || group.lane !== cursor.lane_index || (cursor.kind === "lane" && cursor.offset !== 0)) {
      fail("INVALID_CURSOR", "The continuation does not identify an assigned lane/group.");
    }
    args.lanes = [workflowGroupMetadata(context, plan, run, cursor.group_index, cursor.offset, limit)];
  } else if (stage === "detailed" && !cursor) {
    args.lanes = Array.from({ length: plan.lanes }, (_, lane) => {
      const index = plan.groups.findIndex((group) => group.lane === lane);
      return workflowGroupMetadata(context, plan, run, index, 0, limit);
    });
  }
  if (stage === "final_assessment" || cursor?.kind === "required") {
    const offset = cursor?.kind === "required" ? cursor.offset : 0;
    if (offset > plan.required.length) fail("INVALID_CURSOR", "The required-result continuation is outside its set.");
    const saved = new Map(rows(run.results).map((record) => [String(record.item_key), record]));
    const selected = plan.required.slice(offset, offset + limit);
    const next = offset + selected.length;
    args.consistency_item_index = inventory(s).length - 1;
    args.required_results = {
      items: selected.map((item) => {
        const record = saved.get(item.key);
        return { item_index: item.index, item_key: item.key, recorded: Boolean(record),
          ...(record?.carried_from ? { carried_from: record.carried_from } : {}) };
      }),
      next_cursor: next < plan.required.length
        ? encodeWorkflowCursor(context, plan.identity, "required", 0, 0, next) : null,
    };
  }
  return args;
}

async function prepareWorkflow(a: z.output<typeof workflowPreparationInput>): Promise<Data> {
  try {
    const opened = await result(await openContext(a.project, a.specification), {});
    async function prepare(context: Context): Promise<Data> {
      const s = await snapshot(context);
      const run = getRun(s, a.review_ref);
      if (a.source_version !== s.version) fail("STALE_REVIEW", "The supplied source identity is no longer current.");
      if (run.completed) return { status: "completed", review_ref: run.id, source_version: s.version, outcome: run.outcome };
      if (!run.followup && run.consistency_required !== true) {
        fail("ENHANCED_REVIEW_REQUIRED", "Enroll an enhanced full review before native preparation.");
      }
      if (run.followup) await validateReviewProvenance(context, run, s);
      const mechanical = mechanicalCoverage(s.source, s.ledger);
      if (mechanical.length) fail("COVERAGE_REQUIRED", "Resolve mechanical coverage before native review.", { issues: mechanical.slice(0, 20) });
      const items = inventory(s);
      const records = rows(run.results);
      const seen = new Set<string>();
      for (const record of records) {
        if (items[Number(record.item_index)]?.key !== record.item_key || seen.has(String(record.item_key))) {
          fail("INVALID_STATE", "Saved review results do not match the current inventory.");
        }
        seen.add(String(record.item_key));
      }
      const required = requiredWorkflowItems(s, run);
      const pending = required.filter((item) => !seen.has(item.key));
      if (required.some((item) => records.some((record) => record.item_key === item.key && record.carried_from))) {
        fail("INVALID_STATE", "A mandatory fresh result cannot be inherited.");
      }
      if (a.stage === "final" && pending.length) fail("INCOMPLETE_REVIEW", "Required detailed verdicts are still pending.");
      const allDetailsSaved = items.every((item) => item.kind === "context" || seen.has(item.key));
      if (!pending.length && !allDetailsSaved) fail("INVALID_STATE", "Required inherited review evidence is missing.");
      if (run.consistency && (!allDetailsSaved || !seen.has("context:specification"))) {
        fail("INVALID_STATE", "Saved consistency evidence is incomplete; do not reuse it.");
      }
      const stage = pending.length ? "detailed" : run.consistency ? "completion_only" : "final_assessment";
      if (stage !== "completion_only" && a.host_concurrency === 0) {
        fail("HOST_UNAVAILABLE", "The supplied host admission budget permits no judging actor.");
      }
      if (stage === "completion_only") await validateFollowup(context, run, s);
      const cursor = a.cursor ? decodeWorkflowCursor(a.cursor, context, run) : undefined;
      const plan = createWorkflowPlan(s, run, a.host_concurrency, cursor);
      const envelope = await result(context, {});
      let limit = MAX_REVIEW_BATCH_ITEMS;
      for (;;) {
        const args = workflowReadyArguments(context, s, run, plan, stage, cursor, limit);
        const prepared = { status: "ready_to_run", next_stage: stage, mode: run.followup ? "followup" : "full",
          review_ref: run.id, source_version: s.version, saved_items: records.length,
          remaining_items: pending.length, total_items: items.length, args };
        if (boundedSuccessResult({ ...envelope, result: prepared })) return prepared;
        if (limit === 1) fail("RESULT_LIMIT", "Workflow metadata leaves no room within the response budget.");
        limit = Math.max(1, Math.floor(limit / 2));
      }
    }
    return await readConsistent(String(opened.context), prepare);
  } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
    return { protocol_version: 2, context: null, replayed: false,
      result: { status: "blocked", reasons: [{ code: error.code, message: error.message }],
        next_action: "Inspect the reported prerequisite and prepare the exact target again." } };
  }
}

function normalizedWorkflowVerdict(item: z.output<typeof batchVerdict>): VerdictArguments {
  return { item_index: item.item_index, read_receipt: item.read_receipt, verdict: item.verdict,
    explanation: item.explanation, evidence_requirement_ids: item.evidence_requirement_ids ?? [],
    evidence_source_refs: item.evidence_source_refs ?? [],
    ...(item.counterexample === undefined ? {} : { counterexample: item.counterexample }) };
}

function submissionAcknowledgment(run: Data, records: Data[]): Data {
  return { review_ref: run.id, source_version: run.source_version, saved: true,
    recorded_items: rows(run.results).length, batch_size: records.length,
    items: records.map((record) => ({ item_index: record.item_index, item_key: record.item_key, verdict: record.verdict })) };
}

async function submitWorkflowBatch(a: z.output<typeof workflowSubmissionInput>, signal?: AbortSignal): Promise<Data> {
  signal?.throwIfAborted();
  const verdicts = a.items.map(normalizedWorkflowVerdict);
  const input = { review_ref: a.review_ref, source_version: a.source_version, group_ref: a.group_ref, items: verdicts };
  const submissionId = hash(canonical(input));
  async function save(ledger: Data, context: Context): Promise<Data | ReturnType<typeof unchanged>> {
    const s = await snapshot(context, ledger);
    const run = getRun(s, a.review_ref);
    if (s.version !== a.source_version) fail("STALE_REVIEW", "The submission source is no longer current.");
    if (!run.followup && run.consistency_required !== true) fail("ENHANCED_REVIEW_REQUIRED", "Native submission requires an enhanced review.");
    if (run.followup) await validateReviewProvenance(context, run, s);
    const records = rows(run.results);
    const submissions = rows(run.submissions ?? []);
    const previous = submissions.find((submission) => submission.id === submissionId);
    if (previous) {
      const saved: Data[] = [];
      for (const index of previous.item_indices as number[]) {
        const record = records.find((candidate) => candidate.item_index === index);
        if (!record) fail("INVALID_STATE", "Retained submission evidence is missing; inspect the review.");
        saved.push(record);
      }
      if (canonical(previous.item_indices) !== canonical(verdicts.map((item) => item.item_index))
        || previous.results_digest !== hash(canonical(saved))) {
        fail("INVALID_STATE", "Retained submission evidence is inconsistent; inspect the review.");
      }
      return unchanged(submissionAcknowledgment(run, saved));
    }
    // Retained exact saves survive assignment invalidation and completion.
    // Only a new write needs a current allocation; source/provenance were checked above.
    const cursor = decodeWorkflowCursor(a.group_ref, context, run);
    if (cursor.kind !== "group" || cursor.offset !== 0) fail("INVALID_CURSOR", "Submit the exact group reference, not its continuation.");
    const plan = createWorkflowPlan(s, run, cursor.host_concurrency, cursor);
    const group = plan.groups[cursor.group_index];
    if (!group || group.lane !== cursor.lane_index
      || verdicts.some((item) => !group.items.some((assigned) => assigned.index === item.item_index))) {
      fail("INVALID_INPUT", "Every submitted item must belong to the assigned group.");
    }
    if (verdicts.some((item) => records.some((record) => record.item_index === item.item_index))) {
      fail("CONFLICT", "Existing verdicts have no matching exact submission; inspect saved effects instead of overwriting.", {
        operation_applied: false, review_ref: run.id,
      });
    }
    const validated = verdicts.map((item, index) => validateVerdict(context, ledger, s, run, item, index));
    run.results = [...records, ...validated];
    run.submissions = [...submissions, { id: submissionId,
      item_indices: verdicts.map((item) => item.item_index), results_digest: hash(canonical(validated)) }];
    return submissionAcknowledgment(run, validated);
  }
  return mutateReviewSubmission(a.context, "specification_review_submit_batch", input, save, signal);
}

export const reviewTools = [
  tool("specification_review_prepare_workflow", "Prepare bounded native review launch, lane/reference continuation or final recovery in one read-only call; never enroll, reserve, complete or approve a review. Server readiness does not certify host/model availability.", workflowPreparationInput, false, prepareWorkflow),
  tool("specification_review_submit_batch", "Atomically save a judging actor's own assigned 1-20 exact-read verdicts, with bounded cross-process waiting and review-lifetime replay; retain strict source checks and never overwrite saved verdicts.", workflowSubmissionInput, true, submitWorkflowBatch),
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
    const successor = supersedingReview(s, String(run.id));
    const stale = Boolean(successor) || run.source_version !== s.version || statusRegressed(run, s.source);
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
      ...(successor ? { audit_status: "superseded", superseded_by: successor.id } : {}),
      ...(run.audit_restart ? { audit_restart: run.audit_restart } : {}),
      total_items: items.length,
      recorded_items: records.length,
      next_item_index: nextIndex < 0 ? null : nextIndex,
      consistency_required: Boolean(run.followup) || run.consistency_required === true,
      ...(run.followup || run.consistency_required === true ? { consistency_status: successor ? "pending" : (run.consistency as Data | undefined)?.verdict ?? "pending", consistency_item_index: stale || run.completed ? null : items.length - 1,
        ...(run.followup ? { carried_items: records.filter((record) => record.carried_from).length } : {}) } : {}),
    };
  })),
  tool("specification_review_get", "Read one item from the server-enumerated inventory, including exact original sources; follow every continuation before recording its verdict.", z.object({ ...reviewInput, item_index: z.number().int().nonnegative(), cursor: text.optional() }).strict(), false, async (a) => {
    const context = decode(a.context), s = await snapshot(context), run = getRun(s, a.review_ref), { item, total } = itemAt(s, a.item_index);
    const recorded = rows(run.results).find((r) => r.item_index === a.item_index);
    const body = reviewBody(item, s, run, recorded ?? null), identity = hash(JSON.stringify([context.project, context.specification, run.id, s.version, item.key, body]));
    const envelope = await result(context, {});
    const response = (maxCharacters: number): Data => {
      const part = portion(body, identity, a.cursor, maxCharacters);
      return { ...envelope, result: { review_ref: run.id, source_version: s.version, item_index: a.item_index, item_key: item.key, kind: item.kind, total_items: total, next_item_index: a.item_index + 1 < total ? a.item_index + 1 : null, ...part, recorded_result: recorded ? { verdict: recorded.verdict, ...(recorded.carried_from ? { carried_from: recorded.carried_from } : {}) } : null, read_receipt: part.complete ? receipt(context, run, item, reviewBody(item, s, run)) : null,
        ...((run.followup || run.consistency_required === true) && item.kind === "context" ? { consistency_read_receipt: part.complete ? consistencyReceipt(context, run, item, s) : null } : {}) } };
    };
    // Page size is not part of the identity: retained 1024-point continuations and
    // complete-read receipts remain valid. Keep the exact materialized body intact.
    let maxCharacters = 4096;
    while (true) {
      const candidate = response(maxCharacters);
      if (boundedSuccessResult(candidate)) return candidate;
      if (maxCharacters === 1) fail("RESULT_LIMIT", "Review metadata leaves no room for an exact text portion.");
      maxCharacters = Math.max(1, Math.floor(maxCharacters / 2));
    }
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
