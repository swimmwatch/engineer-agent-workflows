import { confirmedScope, currentRecords, ref } from "./scope.js";
import { requirementSource } from "./requirements.js";
import type { RequirementSource } from "./requirements.js";
import { workflowConflictDiagnostics } from "./diagnostics.js";
import { fail, hash, load, obj, rows, strings } from "./state.js";
import type { Context, Data } from "./state.js";

export interface Snapshot { source: RequirementSource; ledger: Data; manifest: Data; decisions: Data[]; version: string; decisions_version: string | null; }
export interface Item { key: string; kind: "source" | "requirement" | "profile" | "context"; value: Data; requirement_ids: string[]; source_refs: Data[]; }

export async function snapshot(context: Context, ledger?: Data, source?: RequirementSource): Promise<Snapshot> {
  const manifest = await confirmedScope(context);
  ledger ??= (await load(context, "decisions")).value;
  source ??= await requirementSource(context);
  const decisions = currentRecords(ledger);
  const version = hash(JSON.stringify([context.project, context.specification, source.version, manifest, rows(ledger.decisions)]));
  return { source, ledger, manifest, decisions, version, decisions_version: context.versions.decisions };
}

export function inventory(s: Snapshot): Item[] {
  const items: Item[] = s.decisions.map((d) => ({ key: `source:${String(d.id)}`, kind: "source", value: d, requirement_ids: strings(d.requirement_ids ?? []), source_refs: [ref(d)] }));
  for (const r of s.source.requirements) items.push({ key: `requirement:${r.id}`, kind: "requirement", value: { ...r }, requirement_ids: [r.id], source_refs: s.decisions.filter((d) => strings(d.requirement_ids ?? []).includes(r.id)).map(ref) });
  for (const p of rows(s.manifest.profiles).filter((p) => p.state === "active")) items.push({ key: `profile:${String(p.id)}`, kind: "profile", value: p, requirement_ids: [], source_refs: [] });
  const segments: string[] = [];
  let offset = 0;
  for (const r of s.source.requirements) { segments.push(s.source.content.slice(offset, r.start_offset)); offset = r.end_offset; }
  segments.push(s.source.content.slice(offset));
  items.push({ key: "context:specification", kind: "context", value: { text: segments.join("\n"), manifest: s.manifest }, requirement_ids: [], source_refs: [] });
  return items;
}

export function materialize(item: Item, s: Snapshot, recorded: Data | null = null): string {
  const related: Data[] = [], visited = new Set<string>();
  const records = new Map(rows(s.ledger.decisions).map((d) => [JSON.stringify(ref(d)), d]));
  const pending = item.kind === "source" ? [item.value] : [];
  while (pending.length) {
    const decision = pending.pop()!, key = JSON.stringify(ref(decision));
    if (visited.has(key)) continue;
    visited.add(key);
    if (decision !== item.value) related.push(decision);
    const ancestors = rows(decision.related_decisions ?? []);
    if (decision.supersedes_revision) ancestors.push({ id: decision.id, revision: decision.supersedes_revision });
    for (const target of ancestors) {
      const ancestor = records.get(JSON.stringify(ref(target)));
      if (!ancestor) fail("BROKEN_REFERENCE", "A source predecessor is missing.");
      pending.push(ancestor);
    }
  }
  const requirements = item.kind === "source" ? s.source.requirements.filter((r) => item.requirement_ids.includes(r.id)) : [];
  return JSON.stringify({ kind: item.kind, key: item.key, source: item.value, related_sources: related, requirements, source_refs: item.source_refs, recorded_result: recorded }, null, 2);
}

export function reviewRuns(ledger: Data): Data[] {
  const section = obj(ledger.specification_reviews ?? { version: 1, runs: [] });
  if (section.version !== 1) fail("INVALID_STATE", "Unsupported specification review contract.");
  return rows(section.runs);
}

export function supersedingReview(s: Snapshot, target: string): Data | undefined {
  return reviewRuns(s.ledger).find((candidate) => candidate.audit_restart
    && obj(candidate.audit_restart).previous_review_ref === target);
}

export function getRun(s: Snapshot, target: string): Data {
  const run = reviewRuns(s.ledger).find((r) => r.id === target);
  if (!run) fail("NOT_FOUND", "The review does not belong to this specification.");
  if (run.source_version !== s.version || statusRegressed(run, s.source)) {
    fail("STALE_REVIEW", "Review inputs changed; start a new independent review.", workflowConflictDiagnostics({
      cause: "review_source_changed",
      nextAction: "start_fresh_review",
      review: {
        reviewRef: String(run.id),
        mode: run.followup ? "followup" : "full",
      },
    }));
  }
  const successor = supersedingReview(s, target);
  if (successor) fail("INVALID_STATE", "This review was superseded by an audit restart; inspect its status for the current generation.", {
    review_ref: target, superseded_by: successor.id,
  });
  return run;
}

export function statusRegressed(run: Data, source: RequirementSource): boolean {
  return (run.status_at_start === "Approved" || run.approval_observed === true) && source.status !== "Approved";
}

export function itemAt(s: Snapshot, index: number): { item: Item; total: number } {
  const items = inventory(s), item = items[index];
  if (!item) fail("INVALID_INPUT", "The review item index is outside its inventory.");
  return { item, total: items.length };
}

export function receipt(context: Context, run: Data, item: Item, body: string): string {
  return hash(JSON.stringify([context.project, context.specification, run.id, run.source_version, item.key, body]));
}
