import { z } from "zod";
import { tool } from "./api.js";
import { batchMemberDiagnostics } from "./diagnostics.js";
import { executeTool } from "./service.js";
import { requirementSource } from "./requirements.js";
import { append, currentRecords, ref, reference, selected } from "./scope.js";
import { contextInput, decode, fail, id, load, mutate, readDependency, result, text, texts, unchanged, WorkflowError } from "./state.js";
import type { Context } from "./state.js";

export async function verifyRequirements(context: Context, requirementIds: string[], legacy = false): Promise<void> {
  const source = await requirementSource(context, !legacy);
  if (!legacy && (source.requirements.length || (await load(context, "decisions")).value.specification_reviews !== undefined)) {
    for (const requirement of requirementIds) if (!source.requirements.some((r) => r.id === requirement)) fail("BROKEN_REFERENCE", "No requirement definition has this identifier.", { requirement_id: requirement });
    return;
  }
  const bytes = await readDependency(context, `docs/specs/${context.specification}/spec.md`);
  if (!bytes) fail("PREREQUISITE_REQUIRED", "The requirement source is missing.");
  const content = bytes.toString("utf8");
  for (const requirement of requirementIds) {
    const escaped = requirement.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!new RegExp(`(?:^|[^A-Za-z0-9_-])${escaped}(?:$|[^A-Za-z0-9_-])`, "u").test(content)) fail("BROKEN_REFERENCE", "Requirement is not present in the specification.", { requirement_id: requirement });
  }
}
const category = { category: id };
export const decisionTools = [
  tool("decision_record_instruction", "Preserve an actual non-sensitive user instruction and its provenance without another question; amendments do not erase their predecessors.", z.object({ ...contextInput, ...category, text: z.string().min(1).max(65536), source: text, kind: z.enum(["initial_request", "follow_up", "user_edit"]), related_decisions: z.array(reference).max(100).default([]), requirement_ids: z.array(id).max(100).default([]) }).strict(), true, async (a) => mutate(a.context, "decisions", "decision_record_instruction", a, async (value, context) => {
    for (const related of a.related_decisions) selected(value, related);
    if (a.kind === "user_edit" && (!a.related_decisions.length || !a.requirement_ids.length)) fail("INVALID_INPUT", "A known user edit needs predecessor references and affected requirements.");
    if (a.requirement_ids.length) await verifyRequirements(context, a.requirement_ids);
    const record = append(value, context, { category: a.category, state: "instructed", provenance: "user", instruction: { text: a.text, source: a.source, kind: a.kind }, related_decisions: a.related_decisions, requirement_ids: [...new Set(a.requirement_ids)], question: null, answer: null });
    return { decision_ref: ref(record), state: record.state };
  })),
  tool("decision_mark_context", "Classify a resolved non-behavioral decision with a reason; an independent review must check this exclusion.", z.object({ ...contextInput, decision_ref: reference, reason: text }).strict(), true, async (a) => mutate(a.context, "decisions", "decision_mark_context", a, (value, context) => {
    const prior = selected(value, a.decision_ref);
    if (prior.id === "scope.manifest" || ["needs_user", "blocked"].includes(String(prior.state))) fail("INVALID_STATE", "Resolve this decision or use the scope tools first.");
    const record = append(value, context, { ...prior, requirement_ids: [], context_reason: a.reason }, prior);
    return { decision_ref: ref(record), classification: "context" };
  })),
  tool("question_prepare", "Save one focused question before using the host-native question tool; optionally reopen an existing decision.", z.object({ ...contextInput, ...category, text, options: z.array(z.object({ id, label: text }).strict()).max(20).default([]), kind: z.enum(["single_choice", "multiple_choice", "free_text"]).default("single_choice"), revises: reference.optional() }).strict(), true, async (a) => mutate(a.context, "decisions", "question_prepare", a, (value, context) => {
    if (new Set(a.options.map((o) => o.id)).size !== a.options.length || (a.kind === "free_text" && a.options.length)) fail("INVALID_INPUT", "Question options must be unique and match the question kind.");
    const prior = a.revises ? selected(value, a.revises) : undefined;
    if (prior?.id === "scope.manifest") fail("INVALID_INPUT", "Use scope_propose to change scope.");
    const question = { text: a.text, kind: a.options.length ? a.kind : "free_text", options: a.options };
    const record = append(value, context, { category: a.category, state: "needs_user", provenance: "user", question, answer: null, status: "prepared", context_reason: null, requirement_ids: prior?.requirement_ids ?? [] }, prior);
    record.question_origin = ref(record);
    return { question_ref: ref(record), question, next: "Ask the saved question with the callable host-native question tool." };
  })),
  tool("question_record_no_answer", "Checkpoint a dismissed, cancelled, unavailable or failed question without inventing an answer.", z.object({ ...contextInput, question_ref: reference, outcome: z.enum(["dismissed", "cancelled", "timed_out", "unavailable", "invalid_response", "failed"]) }).strict(), true, async (a) => mutate(a.context, "decisions", "question_record_no_answer", a, (value, context) => {
    const question = selected(value, a.question_ref);
    if (question.state !== "needs_user" && question.state !== "blocked") fail("INVALID_STATE", "An answered decision cannot be changed into a non-answer.");
    const record = append(value, context, { ...question, state: "needs_user", status: a.outcome, answer: null }, question);
    return { question_ref: ref(record), state: "needs_user", next: "Wait for an explicit answer; do not infer one or advance blocked work." };
  })),
  tool("decision_record_fact", "Record an observed fact with repository-relative evidence, optionally revising a previous fact.", z.object({ ...contextInput, ...category, fact: text, evidence: texts.min(1), revises: reference.optional() }).strict(), true, async (a) => mutate(a.context, "decisions", "decision_record_fact", a, (value, context) => {
    if (a.evidence.some((e) => e.startsWith("/") || /^[A-Za-z]:/.test(e) || e.split("/").includes(".."))) fail("INVALID_INPUT", "Fact evidence must be repository-relative and non-sensitive.");
    const prior = a.revises ? selected(value, a.revises) : undefined;
    if (prior && prior.state !== "observed") fail("INVALID_STATE", "This tool revises only observed facts.");
    const record = append(value, context, { category: a.category, state: "observed", provenance: "repository", fact: a.fact, evidence: a.evidence, question: null, answer: null }, prior);
    return { decision_ref: ref(record), state: "observed" };
  })),
  tool("decision_record_assumption", "Record a reversible assumption with its rationale and explicit reconsideration condition.", z.object({ ...contextInput, ...category, assumption: text, rationale: text, reconsider_when: text, revises: reference.optional() }).strict(), true, async (a) => mutate(a.context, "decisions", "decision_record_assumption", a, (value, context) => {
    const prior = a.revises ? selected(value, a.revises) : undefined;
    if (prior && prior.state !== "assumed") fail("INVALID_STATE", "This tool revises only assumptions.");
    const record = append(value, context, { category: a.category, state: "assumed", provenance: "agent", assumption: a.assumption, rationale: a.rationale, reconsider_when: a.reconsider_when, question: null, answer: null }, prior);
    return { decision_ref: ref(record), state: "assumed" };
  })),
  tool("decision_link_requirements", "Add existing requirement identifiers to a current resolved decision without removing links; an already satisfied request is a no-op.", z.object({ ...contextInput, decision_ref: reference, requirement_ids: z.array(id).min(1).max(100) }).strict(), true, async (a) => mutate(a.context, "decisions", "decision_link_requirements", a, async (value, context) => {
    const prior = selected(value, a.decision_ref);
    if (["needs_user", "blocked"].includes(String(prior.state))) fail("INVALID_STATE", "Resolve the decision before linking requirements.");
    if (prior.id === "scope.manifest") fail("INVALID_INPUT", "Scope traceability is managed by the scope tools.");
    await verifyRequirements(context, a.requirement_ids);
    const previous = [...new Set(Array.isArray(prior.requirement_ids) ? prior.requirement_ids.map(String) : [])];
    const added = [...new Set(a.requirement_ids)].filter((requirementId) => !previous.includes(requirementId));
    const requirementIds = [...previous, ...added];
    if (!added.length) return unchanged({ decision_ref: ref(prior), previous_requirement_ids: previous, added, removed: [], requirement_ids: requirementIds, operation_applied: false });
    const record = append(value, context, { ...prior, context_reason: null, requirement_ids: requirementIds }, prior);
    return { decision_ref: ref(record), previous_requirement_ids: previous, added, removed: [], requirement_ids: requirementIds, operation_applied: true };
  })),
  tool("decision_link_requirements_batch", "Atomically add requirement links to 1-20 current resolved decisions; validate every item before one write and return bounded zero-based member diagnostics on rejection.", z.object({
    ...contextInput,
    items: z.array(z.object({
      decision_ref: reference.describe("Exact current decision reference returned by decision_find or decision_get; do not reconstruct it."),
      requirement_ids: z.array(id).min(1).max(100),
    }).strict()).min(1).max(20),
  }).strict(), true, async (a) => mutate(a.context, "decisions", "decision_link_requirements_batch", a, async (value, context) => {
    const current = currentRecords(value);
    const seen = new Set<string>();
    const prepared = a.items.map((item, itemIndex) => {
      const prior = current.find((record) => record.id === item.decision_ref.id);
      if (!prior) {
        fail(
          "CONFLICT",
          "Decision reference is not current; query the decision again.",
          batchMemberDiagnostics({ itemIndex, category: "unknown" }),
        );
      }
      const currentRef = ref(prior);
      const exactSaved = Array.isArray(value.decisions) && value.decisions.some((record) => (
        record !== null
        && typeof record === "object"
        && !Array.isArray(record)
        && (record as Record<string, unknown>).id === item.decision_ref.id
        && (record as Record<string, unknown>).revision === item.decision_ref.revision
      ));
      if (prior.revision !== item.decision_ref.revision) {
        fail(
          "CONFLICT",
          "Decision reference is not current; query the decision again.",
          batchMemberDiagnostics({
            itemIndex,
            category: "stale",
            ...(exactSaved ? { requestedRef: item.decision_ref } : {}),
            currentRef,
          }),
        );
      }
      if (seen.has(String(prior.id))) {
        fail(
          "INVALID_INPUT",
          "Batch items must identify distinct decisions.",
          batchMemberDiagnostics({
            itemIndex,
            category: "duplicate",
            requestedRef: item.decision_ref,
            currentRef,
          }),
        );
      }
      seen.add(String(prior.id));
      if (["needs_user", "blocked"].includes(String(prior.state))) fail("INVALID_STATE", "Resolve every decision before linking requirements.");
      if (prior.id === "scope.manifest") fail("INVALID_INPUT", "Scope traceability is managed by the scope tools.");
      const previous = [...new Set(Array.isArray(prior.requirement_ids) ? prior.requirement_ids.map(String) : [])];
      const added = [...new Set(item.requirement_ids)].filter((requirementId) => !previous.includes(requirementId));
      return { itemIndex, item, prior, previous, added, requirementIds: [...previous, ...added] };
    });
    for (const entry of prepared) {
      try {
        await verifyRequirements(context, entry.item.requirement_ids);
      } catch (error) {
        if (!(error instanceof WorkflowError) || error.code !== "BROKEN_REFERENCE") throw error;
        fail(
          error.code,
          error.message,
          batchMemberDiagnostics({
            itemIndex: entry.itemIndex,
            category: "unknown_requirement",
            requestedRef: entry.item.decision_ref,
            currentRef: ref(entry.prior),
          }),
        );
      }
    }
    let operationApplied = false;
    const items = prepared.map(({ prior, previous, added, requirementIds }) => {
      if (!added.length) return { decision_ref: ref(prior), previous_requirement_ids: previous, added, removed: [], requirement_ids: requirementIds, operation_applied: false };
      operationApplied = true;
      const record = append(value, context, { ...prior, context_reason: null, requirement_ids: requirementIds }, prior);
      return { decision_ref: ref(record), previous_requirement_ids: previous, added, removed: [], requirement_ids: requirementIds, operation_applied: true };
    });
    const output = { items, operation_applied: operationApplied };
    return operationApplied ? output : unchanged(output);
  })),
  tool("decision_find", "Search bounded decision previews by text, state, category or requirement without loading the journal.", z.object({ ...contextInput, text: text.optional(), states: z.array(id).max(100).optional(), categories: z.array(id).max(100).optional(), requirement_ids: z.array(id).max(100).optional(), history: z.boolean().default(false), limit: z.number().int().min(1).max(50).default(20), cursor: text.optional() }).strict(), false, async (a) => {
    const { context: token, ...filters } = a, context = decode(token);
    const output = await executeTool("decisions_search", { project: context.project, specification: context.specification, ...filters });
    return result(context, output);
  }),
 tool("decision_get", "Read one exact decision revision inside the managed specification context; continue with its next_cursor until complete.", z.object({ ...contextInput, decision_ref: reference, cursor: text.optional() }).strict(), false, async (a) => {
    const context = decode(a.context);
    const output = await executeTool("decisions_get", { project: context.project, specification: context.specification, ...a.decision_ref, ...(a.cursor ? { cursor: a.cursor } : {}) });
    return result(context, output);
  }),
];
