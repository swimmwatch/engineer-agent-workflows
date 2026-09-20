import { randomUUID } from "node:crypto";
import { open, rename, unlink } from "node:fs/promises";
import { z } from "zod";
import { parseRequirementContent } from "./requirements.js";
import { currentRecords, ref } from "./scope.js";
import { fail, hash, readBytes, readDependency, rows, safePath } from "./state.js";
import type { Context, Data } from "./state.js";
import type { Snapshot } from "./review-model.js";

export const REVIEW_CONTRACT = "followup-1";
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const archiveSchema = z.object({
  version: z.literal(1), review_contract: z.literal(REVIEW_CONTRACT), specification: z.string(),
  content: z.string(), manifest: z.record(z.string(), z.unknown()),
  decisions: z.array(z.object({ id: z.string(), revision: z.number().int().positive(), fingerprint: digest }).strict()),
}).strict();
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
function archivePath(context: Context, fingerprint: string): string {
  if (!digest.safeParse(fingerprint).success) fail("INVALID_SNAPSHOT", "The review snapshot reference is invalid.");
  return `docs/specs/${context.specification}/.workflow/review-inputs/${fingerprint}.json`;
}
// Called only inside the decisions mutation lock. Publish the immutable input
// before its journal reference; a failed mutation may leave an unused snapshot.
export async function saveReviewInputs(context: Context, s: Snapshot): Promise<string> {
  const value = { version: 1, review_contract: REVIEW_CONTRACT, specification: context.specification, content: s.source.content, manifest: s.manifest,
    decisions: rows(s.ledger.decisions).map((d) => ({ ...ref(d), fingerprint: hash(canonical(d)) })) };
  const bytes = Buffer.from(`${canonical(value)}\n`);
  if (bytes.length > 16 * 1024 * 1024) fail("SOURCE_LIMIT", "Review inputs exceed the 16 MiB snapshot limit.");
  const fingerprint = hash(bytes), relative = archivePath(context, fingerprint);
  const existing = await readBytes(context.project, relative);
  if (existing) {
    if (!existing.equals(bytes)) fail("INVALID_SNAPSHOT", "An immutable snapshot has different contents.");
    await readDependency(context, relative);
    return fingerprint;
  }
  const path = await safePath(context.project, relative, true);
  const temporary = await safePath(context.project, `docs/specs/${context.specification}/.workflow/review-inputs/.workflow-${randomUUID()}.tmp`);
  try {
    const file = await open(temporary, "wx", 0o600);
    try { await file.writeFile(bytes); await file.sync(); } finally { await file.close(); }
    await safePath(context.project, relative);
    const collision = await readBytes(context.project, relative);
    if (collision) {
      if (!collision.equals(bytes)) fail("INVALID_SNAPSHOT", "An immutable snapshot has different contents.");
    } else await rename(temporary, path);
    await readDependency(context, relative);
    return fingerprint;
  } finally { await unlink(temporary).catch((error: unknown) => { if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) throw error; }); }
}
export async function loadReviewInputs(context: Context, run: Data, ledger: Data): Promise<Snapshot> {
  if (typeof run.input_snapshot !== "string") fail("FULL_REVIEW_REQUIRED", "This historical review has no input snapshot; run a full review.");
  const bytes = await readDependency(context, archivePath(context, run.input_snapshot));
  if (!bytes || hash(bytes) !== run.input_snapshot) fail("INVALID_SNAPSHOT", "The review input snapshot is missing or corrupt; do not reuse its verdicts.");
  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { fail("INVALID_SNAPSHOT", "The review snapshot is not valid UTF-8 JSON."); }
  const checked = archiveSchema.safeParse(parsed);
  if (!checked.success || checked.data.specification !== context.specification) fail("FULL_REVIEW_REQUIRED", "The snapshot format or review rules are incompatible.");
  const value = checked.data;
  const available = new Map(rows(ledger.decisions).map((d) => [canonical(ref(d)), d]));
  const decisions = value.decisions.map((entry) => {
    const d = available.get(canonical(ref(entry)));
    if (!d || hash(canonical(d)) !== entry.fingerprint) fail("INVALID_SNAPSHOT", "An archived decision revision is missing or changed.");
    return d;
  });
  const source = parseRequirementContent(value.content), historicalLedger = { decisions };
  return {
    source,
    manifest: value.manifest,
    ledger: historicalLedger,
    decisions: currentRecords(historicalLedger),
    version: String(run.source_version),
    decisions_version: hash(canonical(historicalLedger)),
  };
}
