import { randomUUID } from "node:crypto";
import { z } from "zod";
import { tool } from "./api.js";
import { reviewLifecycleDiagnostics } from "./diagnostics.js";
import { mechanicalCoverage, portion } from "./requirements.js";
import { getRun, inventory, materialize, receipt, reviewRuns, snapshot } from "./review-model.js";
import type { Item, Snapshot } from "./review-model.js";
import { canonical, loadReviewInputs, saveReviewInputs } from "./review-snapshots.js";
import { contextInput, fail, hash, id, mutate, obj, page, readConsistent, rows, strings, text, unchanged } from "./state.js";
import type { Context, Data } from "./state.js";

const reviewInput = { ...contextInput, review_ref: id };
const itemKeys = z.array(id).min(1).max(100);
const fixesInput = z.array(z.object({ finding_key: id, changed_item_keys: itemKeys, explanation: text }).strict()).min(1).max(100);
function lifecycleFailure(
  code: string,
  message: string,
  run: Data,
  reason: string,
  nextAction: string,
): never {
  fail(code, message, reviewLifecycleDiagnostics({
    reviewRef: String(run.id),
    mode: run.followup ? "followup" : "full",
    reason,
    nextAction,
  }));
}
interface Impact {
  parent: Data; current: Snapshot; before: Snapshot; changes: Data[];
  required: string[]; candidates: string[]; reasons: string[]; reasonCodes: string[]; findings: Data[];
}
function semantic(item: Item): Data {
  const value = { ...item.value };
  if (item.kind === "requirement") for (const key of ["start_line", "end_line", "start_offset", "end_offset"]) delete value[key];
  if (item.kind === "context" && typeof value.text === "string") value.text = value.text.replace(/^Status: (Draft|Approved)$/m, "Status: <review-status>");
  return { kind: item.kind, value, requirement_ids: [...item.requirement_ids].sort(), source_refs: [...item.source_refs].sort((a, b) => canonical(a).localeCompare(canonical(b))) };
}
async function impact(context: Context, parentRef: string, ledger?: Data): Promise<Impact> {
  const current = await snapshot(context, ledger), runs = reviewRuns(current.ledger);
  const parent = runs.find((run) => run.id === parentRef);
  if (!parent) fail("NOT_FOUND", "The review does not belong to this specification.");
  const before = await loadReviewInputs(context, parent, current.ledger);
  const previous = inventory(before), items = inventory(current), previousByKey = new Map(previous.map((i) => [i.key, i]));
  const currentByKey = new Map(items.map((i) => [i.key, i])), changes: Data[] = [], reasons: string[] = [], reasonCodes: string[] = [];
  const addReason = (code: string, message: string): void => { reasonCodes.push(code); reasons.push(message); };
  for (const key of new Set([...previousByKey.keys(), ...currentByKey.keys()])) {
    const old = previousByKey.get(key), next = currentByKey.get(key);
    if (canonical(old ? semantic(old) : null) !== canonical(next ? semantic(next) : null)) changes.push({ item_key: key, before: old ? semantic(old) : null, after: next ? semantic(next) : null });
  }
  const records = rows(parent.results), findings = records.filter((r) => ["gap", "conflict"].includes(String(r.verdict)));
  if (parent.consistency && obj(parent.consistency).verdict !== "consistent") findings.push({ ...obj(parent.consistency), item_key: "context:specification", requirement_ids: [], source_refs: [] });
  if (!parent.completed || parent.outcome !== "gaps" || runs.filter((run) => run.completed).at(-1)?.id !== parentRef) addReason("parent_not_latest_completed_gaps", "Use the latest completed review with findings.");
  if (parent.status_at_start === "Approved" || parent.approval_observed === true || current.source.status !== "Draft") addReason("approved_specification", "Changes to an Approved specification require a full review.");
  if (canonical(before.manifest) !== canonical(current.manifest)) addReason("manifest_changed", "The confirmed manifest changed.");
  if (changes.some((change) => String(change.item_key).startsWith("profile:"))) addReason("profile_changed", "An active profile changed.");
  if (changes.some((change) => change.item_key === "context:specification") && !findings.some((finding) => finding.item_key === "context:specification")) addReason("context_change_without_finding", "The shared specification context changed without a matching finding.");
  if (changes.some((change) => change.after === null)) addReason("item_removed", "A source or requirement was removed; its obligations need a full review.");
  const sourceMeaning = (value: Data): string => canonical(Object.fromEntries(Object.entries(value).filter(([key]) => !["revision", "supersedes_revision", "requirement_ids"].includes(key))));
  if (current.decisions.some((decision) => {
    const old = before.decisions.find((d) => d.id === decision.id);
    return !old || sourceMeaning(old) !== sourceMeaning(decision);
  })) addReason("source_meaning_changed", "An original source instruction, answer or classification changed; only traceability repairs may reuse results.");
  if (mechanicalCoverage(current.source, current.ledger).length || current.decisions.some((d) => ["needs_user", "blocked"].includes(String(d.state)))) addReason("coverage_or_question_pending", "Resolve mechanical coverage and material questions before review.");
  if (!changes.length) addReason("no_changes", "No correction changed the reviewed input.");
  const required = new Set(changes.map((change) => String(change.item_key)));
  for (const finding of findings) required.add(String(finding.item_key));
  // Traverse both old and new explicit links. These are mandatory candidates,
  // not proof that implicit semantic dependencies do not exist.
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const entry of [...previous, ...items]) {
      const record = records.find((r) => r.item_key === entry.key);
      const linked = new Set([
        ...entry.requirement_ids.map((key) => `requirement:${key}`),
        ...entry.source_refs.map((r) => `source:${String(r.id)}`),
        ...rows(entry.value.related_decisions ?? []).map((r) => `source:${String(r.id)}`),
        ...strings(record?.requirement_ids ?? []).map((key) => `requirement:${key}`),
        ...rows(record?.source_refs ?? []).map((r) => `source:${String(r.id)}`),
      ]);
      if (required.has(entry.key) || [...linked].some((key) => required.has(key))) {
        for (const key of [entry.key, ...linked]) if (!required.has(key)) { required.add(key); expanded = true; }
      }
    }
  }
  for (const item of items) {
    if (item.kind === "profile" || item.kind === "context") required.add(item.key);
    if (!records.some((r) => r.item_key === item.key && ["covered", "not_applicable"].includes(String(r.verdict)))) required.add(item.key);
  }
  return { parent, before, current, changes, reasons, reasonCodes, findings, required: items.filter((i) => required.has(i.key)).map((i) => i.key), candidates: items.filter((i) => !required.has(i.key)).map((i) => i.key) };
}
function impactBody(value: Impact): Data {
  return { eligible: !value.reasons.length, full_review_reasons: value.reasons, changes: value.changes, findings: value.findings,
    required_item_keys: value.required, candidate_item_keys: value.candidates, whole_specification_consistency_required: true };
}
function changeReceipt(context: Context, value: Impact): string {
  return hash(canonical([context.project, context.specification, value.parent.id, value.parent.input_snapshot, value.current.version, impactBody(value)]));
}

function reportVersion(context: Context, value: Impact): string {
  return hash(canonical(["structured-change-report-v1", changeReceipt(context, value)]));
}

interface FindingNavigation { kind: "finding"; finding_key: string; item_key: string; evidence_selector: string; }
interface ChangeNavigation { kind: "change"; item_key: string; before_present: boolean; after_present: boolean; before_evidence_selector: string | null; after_evidence_selector: string | null; }
interface EvidenceField { evidence_selector: string; entry_kind: "finding" | "change"; side: "finding" | "before" | "after"; field: string; value_type: string; text: string; }

function orderedFindings(value: Impact): Data[] {
  const order = new Map(inventory(value.current).map((item, index) => [item.key, index]));
  return [...value.findings].sort((left, right) => (order.get(String(left.item_key)) ?? Number.MAX_SAFE_INTEGER) - (order.get(String(right.item_key)) ?? Number.MAX_SAFE_INTEGER));
}

function findingNavigation(value: Impact): FindingNavigation[] {
  return orderedFindings(value).map((finding, index) => {
    const findingKey = `finding:${hash(canonical([value.parent.id, index, finding])).slice(0, 32)}`;
    return { kind: "finding", finding_key: findingKey, item_key: String(finding.item_key), evidence_selector: findingKey };
  });
}

function changeNavigation(value: Impact): ChangeNavigation[] {
  return value.changes.map((change, index) => {
    const key = `change:${hash(canonical([value.parent.id, value.current.version, index, change.item_key])).slice(0, 32)}`;
    return { kind: "change", item_key: String(change.item_key), before_present: change.before !== null, after_present: change.after !== null,
      before_evidence_selector: change.before === null ? null : `${key}:before`, after_evidence_selector: change.after === null ? null : `${key}:after` };
  });
}

function navigation(value: Impact): Data[] {
  return [
    ...findingNavigation(value),
    ...changeNavigation(value),
    ...value.required.map((itemKey) => ({ kind: "required_item", item_key: itemKey })),
    ...value.candidates.map((itemKey) => ({ kind: "candidate_item", item_key: itemKey })),
  ];
}

function valueType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value === "object" ? "object" : typeof value;
}

function valueText(value: unknown): string {
  if (value === null) return "";
  if (typeof value === "string") return value;
  return canonical(value);
}

function fields(selector: string, entryKind: "finding" | "change", side: "finding" | "before" | "after", value: Data): EvidenceField[] {
  return Object.keys(value).sort().map((field) => ({ evidence_selector: selector, entry_kind: entryKind, side, field,
    value_type: valueType(value[field]), text: valueText(value[field]) }));
}

function evidenceFields(value: Impact): EvidenceField[] {
  const result: EvidenceField[] = [];
  const findings = orderedFindings(value), findingEntries = findingNavigation(value);
  for (const [index, finding] of findings.entries()) result.push(...fields(findingEntries[index]!.evidence_selector, "finding", "finding", finding));
  const changeEntries = changeNavigation(value);
  for (const [index, change] of value.changes.entries()) {
    const entry = changeEntries[index]!;
    if (change.before !== null) result.push(...fields(entry.before_evidence_selector!, "change", "before", obj(change.before)));
    if (change.after !== null) result.push(...fields(entry.after_evidence_selector!, "change", "after", obj(change.after)));
  }
  return result;
}

const reportDigest = z.string().regex(/^[a-f0-9]{64}$/);
const evidenceCursor = z.object({ report_version: reportDigest, field_index: z.number().int().nonnegative(), text_cursor: text.optional(), token: reportDigest }).strict();

function cursorToken(receipt: string, report: string, fieldIndex: number, textCursor?: string): string {
  return hash(canonical([receipt, report, fieldIndex, textCursor ?? null]));
}

function encodeEvidenceCursor(receipt: string, report: string, fieldIndex: number, textCursor?: string): string {
  return Buffer.from(JSON.stringify({ report_version: report, field_index: fieldIndex, ...(textCursor ? { text_cursor: textCursor } : {}), token: cursorToken(receipt, report, fieldIndex, textCursor) })).toString("base64url");
}

const REVIEW_BODY_CACHE_ENTRIES = 4;
const REVIEW_BODY_CACHE_BYTES = 64 * 1024 * 1024;
const reviewBodies = new Map<string, { value: string; bytes: number }>();
let reviewBodyBytes = 0;

function cachedReviewBody(key: string, create: () => string): string {
  const cached = reviewBodies.get(key);
  if (cached) {
    reviewBodies.delete(key);
    reviewBodies.set(key, cached);
    return cached.value;
  }
  const value = create(), bytes = Buffer.byteLength(value);
  if (bytes <= REVIEW_BODY_CACHE_BYTES) {
    reviewBodies.set(key, { value, bytes });
    reviewBodyBytes += bytes;
    while (reviewBodies.size > REVIEW_BODY_CACHE_ENTRIES || reviewBodyBytes > REVIEW_BODY_CACHE_BYTES) {
      const oldest = reviewBodies.keys().next().value;
      if (oldest === undefined) break;
      reviewBodyBytes -= reviewBodies.get(oldest)!.bytes;
      reviewBodies.delete(oldest);
    }
  }
  return value;
}

export function reviewBody(item: Item, s: Snapshot, run: Data, recorded: Data | null = null): string {
  const consistencyRequired = Boolean(run.followup) || run.consistency_required === true;
  const cacheKey = canonical([
    s.version,
    s.decisions_version,
    run.id,
    item.key,
    recorded?.item_key ?? null,
  ]);
  return cachedReviewBody(cacheKey, () => {
    if (!consistencyRequired) return materialize(item, s, recorded);
    const expanded = item.kind === "context" ? { ...item, value: { ...item.value, text: s.source.content } } : item;
    const body = obj(JSON.parse(materialize(expanded, s, recorded)));
    if (!run.followup) {
      return JSON.stringify({
        ...body,
        ...(item.kind === "context" ? { detailed_results: rows(run.results) } : {}),
      }, null, 2);
    }
    const previous = reviewRuns(s.ledger).find((r) => r.id === obj(run.followup).parent_review_ref);
    const findings = rows(previous?.results ?? []).filter((r) => ["gap", "conflict"].includes(String(r.verdict)) && (item.kind === "context" || r.item_key === item.key));
    if (item.kind === "context" && previous?.consistency && obj(previous.consistency).verdict !== "consistent") findings.push({ ...obj(previous.consistency), item_key: "context:specification" });
    return JSON.stringify({ ...body, previous_findings: findings }, null, 2);
  });
}
export function consistencyReceipt(context: Context, run: Data, item: Item, s: Snapshot): string {
  return hash(canonical([
    receipt(context, run, item, reviewBody(item, s, run)),
    run.results,
    run.followup,
    run.consistency_required === true,
  ]));
}
export async function validateFollowup(context: Context, run: Data, s: Snapshot): Promise<void> {
  if (!run.followup) return;
  if (!run.consistency) fail("CONSISTENCY_REQUIRED", "Complete a new whole-specification consistency read and verdict.");
  await validateReviewProvenance(context, run, s);
}
export async function validateReviewProvenance(context: Context, run: Data, s: Snapshot): Promise<void> {
  const visited = new Set<string>();
  let target: Data | undefined = run;
  while (target) {
    if (visited.has(String(target.id))) fail("INVALID_STATE", "Review provenance contains a cycle.");
    visited.add(String(target.id));
    await loadReviewInputs(context, target, s.ledger);
    if (!target.followup) break;
    const parent: unknown = obj(target.followup).parent_review_ref;
    target = reviewRuns(s.ledger).find((r) => r.id === parent);
    if (!target || !target.completed) fail("INVALID_STATE", "Review provenance requires a completed parent.");
  }
}
function startOutput(run: Data, s: Snapshot): Data {
  const items = inventory(s), required = strings(obj(run.followup).required_item_keys);
  return { review_ref: run.id, source_version: s.version, total_items: items.length, required_items: required.filter((key) => key !== "context:specification").length,
    required_item_indices: items.flatMap((item, index) => required.includes(item.key) && item.kind !== "context" ? [index] : []).slice(0, 100), consistency_item_index: items.length - 1,
    carried_items: rows(run.results).filter((r) => r.carried_from).length, consistency_required: true,
    next: "Use review_status for the next unfinished item; then read the whole context item and record consistency." };
}
export const followupTools = [
  tool("specification_review_changes_summary", "List bounded structured findings, changes, required items and inheritance candidates for one completed review; navigation never supplies complete-evidence receipt.", z.object({ ...reviewInput, cursor: text.optional() }).strict(), false, async (a) => readConsistent(a.context, async (context) => {
    const value = await impact(context, a.review_ref), report = reportVersion(context, value), entries = navigation(value);
    const selected = page(entries, a.cursor, 20, report);
    return { review_ref: a.review_ref, source_version: value.current.version, report_version: report, eligible: !value.reasons.length,
      full_review_reasons: value.reasonCodes, counts: { findings: value.findings.length, changes: value.changes.length, required_items: value.required.length,
        candidate_items: value.candidates.length, total_entries: entries.length }, entries: selected.items, total_entries: selected.total,
      complete: selected.next_cursor === null, next_cursor: selected.next_cursor };
  })),
  tool("specification_review_changes_read", "Read ordered exact finding and before/after evidence fields for one structured change report; only the terminal fragment returns changes_receipt.", z.object({ ...reviewInput, report_version: reportDigest, cursor: text.optional() }).strict(), false, async (a) => readConsistent(a.context, async (context) => {
    const value = await impact(context, a.review_ref), report = reportVersion(context, value), receipt = changeReceipt(context, value);
    if (a.report_version !== report) fail("STALE_CURSOR", "The structured change report changed; restart its summary and evidence read.");
    const evidence = evidenceFields(value);
    if (!evidence.length) return { review_ref: a.review_ref, source_version: value.current.version, report_version: report, fragment: null, complete: true, next_cursor: null, changes_receipt: receipt };
    let fieldIndex = 0, textCursor: string | undefined;
    if (a.cursor) {
      let decoded: unknown;
      try { decoded = JSON.parse(Buffer.from(a.cursor, "base64url").toString("utf8")); }
      catch { fail("INVALID_CURSOR", "Use the returned structured-evidence continuation unchanged."); }
      const checked = evidenceCursor.safeParse(decoded);
      if (!checked.success) fail("INVALID_CURSOR", "Use the returned structured-evidence continuation unchanged.");
      if (checked.data.report_version !== report) fail("STALE_CURSOR", "The structured change report changed; restart its evidence read.");
      if (checked.data.token !== cursorToken(receipt, report, checked.data.field_index, checked.data.text_cursor)) fail("INVALID_CURSOR", "Use the returned structured-evidence continuation unchanged.");
      fieldIndex = checked.data.field_index;
      textCursor = checked.data.text_cursor;
    }
    const field = evidence[fieldIndex];
    if (!field) fail("INVALID_CURSOR", "The structured-evidence continuation is outside this report.");
    const part = portion(field.text, hash(canonical([report, field.evidence_selector, field.field])), textCursor);
    const nextField = part.complete ? fieldIndex + 1 : fieldIndex;
    const nextTextCursor = part.complete ? undefined : String(part.next_cursor);
    const complete = part.complete && nextField === evidence.length;
    return { review_ref: a.review_ref, source_version: value.current.version, report_version: report,
      fragment: { evidence_selector: field.evidence_selector, entry_kind: field.entry_kind, side: field.side, field: field.field,
        value_type: field.value_type, text: part.text, offset: part.offset, total_characters: part.total_characters, field_complete: part.complete },
      complete, next_cursor: complete ? null : encodeEvidenceCursor(receipt, report, nextField, nextTextCursor), changes_receipt: complete ? receipt : null };
  })),
  tool("specification_review_changes", "Read exact changes and mandatory review candidates from a completed review snapshot; follow every continuation.", z.object({ ...reviewInput, cursor: text.optional() }).strict(), false, async (a) => readConsistent(a.context, async (context) => {
    const value = await impact(context, a.review_ref), receipt = changeReceipt(context, value);
    const part = portion(JSON.stringify(impactBody(value), null, 2), receipt, a.cursor);
    return { review_ref: a.review_ref, source_version: value.current.version, ...part, changes_receipt: part.complete ? receipt : null };
  })),
 tool("specification_review_followup_start", "Start or resume a corrections-only review from a completed parent review after a complete change read and explicit fix links; lifecycle diagnostics direct ineligible or incomplete calls to recovery. Conflict errors expose fixed conflict_cause and next_action; only positively established review_source_changed starts a fresh review.", z.object({ ...reviewInput, changes_receipt: text, fixes: fixesInput }).strict(), true, async (a) => mutate(a.context, "decisions", "specification_review_followup_start", a, async (ledger, context) => {
    const value = await impact(context, a.review_ref, ledger), s = value.current;
    if (value.reasons.length) lifecycleFailure("FULL_REVIEW_REQUIRED", "This correction is not eligible for a followup review.", value.parent, "full_review_required", "start_full_review");
    if (a.changes_receipt !== changeReceipt(context, value)) lifecycleFailure("INCOMPLETE_READ", "Read the complete current change report before starting followup.", value.parent, "changes_read_incomplete", "finish_changes_read");
    const changed = value.changes.map((c) => String(c.item_key));
    const findingKeys = new Set([...value.findings.map((finding) => String(finding.item_key)), ...findingNavigation(value).map((finding) => finding.finding_key)]);
    if (a.fixes.some((fix) => !findingKeys.has(fix.finding_key) || fix.changed_item_keys.some((key) => !changed.includes(key))) || changed.some((key) => !a.fixes.some((fix) => fix.changed_item_keys.includes(key)))) lifecycleFailure("FULL_REVIEW_REQUIRED", "Every change must be explained by a finding from the parent review.", value.parent, "fix_mapping_invalid", "inspect_parent_findings");
    const runs = reviewRuns(ledger), latest = runs.at(-1);
    if (latest && !latest.completed) {
      if (latest.source_version === s.version && latest.followup && obj(latest.followup).parent_review_ref === a.review_ref && canonical(obj(latest.followup).fixes) === canonical(a.fixes)) return unchanged(startOutput(latest, s));
      lifecycleFailure("INVALID_STATE", "An unfinished review already exists; resolve it before starting another followup.", latest, "review_in_progress", "inspect_review_status");
    }
    const results = inventory(s).flatMap((item, index) => {
      if (!value.candidates.includes(item.key)) return [];
      const previous = rows(value.parent.results).find((r) => r.item_key === item.key)!;
      return [{ ...previous, item_index: index, carried_from: { review_ref: value.parent.id, item_key: item.key } }];
    });
    const run: Data = { id: randomUUID(), source_version: s.version, specification_version: s.source.version, status_at_start: s.source.status,
      created_at: new Date().toISOString(), completed: false, outcome: "pending", results, input_snapshot: await saveReviewInputs(context, s),
      followup: { parent_review_ref: a.review_ref, required_item_keys: value.required, fixes: a.fixes } };
    ledger.specification_reviews = { version: 1, runs: [...runs, run] };
    return startOutput(run, s);
  })),
 tool("specification_review_scope_expand", "Add existing inventory items to an unfinished followup after cross-impact is found, withdrawing inherited verdicts; lifecycle diagnostics identify wrong review state or unknown items.", z.object({ ...reviewInput, item_keys: itemKeys, reason: text }).strict(), true, async (a) => mutate(a.context, "decisions", "specification_review_scope_expand", a, async (ledger, context) => {
    const s = await snapshot(context, ledger), run = getRun(s, a.review_ref);
    if (run.completed) lifecycleFailure("INVALID_STATE", "Expand only an unfinished followup review.", run, "review_completed", "inspect_review_status");
    if (!run.followup) lifecycleFailure("INVALID_STATE", "Expand only an unfinished followup review.", run, "full_review", "read_and_record_next_item");
    if (a.item_keys.some((key) => !inventory(s).some((i) => i.key === key))) lifecycleFailure("NOT_FOUND", "An additional review item does not exist.", run, "review_item_not_found", "inspect_review_status");
    const followup = obj(run.followup), required = strings(followup.required_item_keys);
    const added = a.item_keys.filter((key) => !required.includes(key));
    if (!added.length) return unchanged(startOutput(run, s));
    followup.required_item_keys = [...new Set([...required, ...added])];
    followup.expansions = [...rows(followup.expansions ?? []), { item_keys: added, reason: a.reason }];
    run.results = rows(run.results).filter((r) => r.item_key !== "context:specification" && !(r.carried_from && added.includes(String(r.item_key))));
    delete run.consistency;
    return startOutput(run, s);
  })),
  tool("specification_review_consistency_record", "Record one fresh whole-specification consistency assessment after all detailed enhanced-full or followup checks; lifecycle diagnostics identify pending, completed or already-recorded states without proving correctness.", z.object({ ...reviewInput, read_receipt: text, verdict: z.enum(["consistent", "gap", "conflict"]), explanation: text, counterexample: text.optional() }).strict(), true, async (a) => mutate(a.context, "decisions", "specification_review_consistency_record", a, async (ledger, context) => {
    const s = await snapshot(context, ledger), run = getRun(s, a.review_ref), items = inventory(s);
    const consistencyRequired = Boolean(run.followup) || run.consistency_required === true;
    if (run.completed) lifecycleFailure("INVALID_STATE", "Record consistency once for an unfinished enhanced full or followup review.", run, "review_completed", "inspect_review_status");
    if (!consistencyRequired) lifecycleFailure("INVALID_STATE", "This legacy full review does not accept a separate consistency assessment.", run, "full_review", "read_and_record_next_item");
    if (run.consistency) lifecycleFailure("INVALID_STATE", "Record consistency once for an unfinished enhanced full or followup review.", run, "consistency_recorded", "complete_review");
    if (items.some((i) => i.kind !== "context" && !rows(run.results).some((r) => r.item_key === i.key))) lifecycleFailure("INCOMPLETE_REVIEW", "Finish detailed checks before the final consistency assessment.", run, "detailed_checks_pending", "read_and_record_next_item");
    if (a.read_receipt !== consistencyReceipt(context, run, items.at(-1)!, s)) lifecycleFailure("INCOMPLETE_READ", "Read the whole context item after the latest detailed verdict or scope expansion.", run, "consistency_read_incomplete", "finish_consistency_read");
    if (a.verdict !== "consistent" && !a.counterexample) lifecycleFailure("INVALID_INPUT", "A consistency finding needs a concrete counterexample.", run, "finding_incomplete", "correct_verdict_input");
    run.consistency = { verdict: a.verdict, explanation: a.explanation, ...(a.counterexample ? { counterexample: a.counterexample } : {}) };
    run.results = [...rows(run.results), { item_index: items.length - 1, item_key: "context:specification", verdict: a.verdict === "consistent" ? "covered" : a.verdict,
      explanation: a.explanation, ...(a.counterexample ? { counterexample: a.counterexample } : {}), requirement_ids: [], source_refs: [] }];
    return { review_ref: run.id, consistency_status: a.verdict };
  })),
];
