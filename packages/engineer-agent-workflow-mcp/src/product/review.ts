import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, readdir, rename, unlink } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { dirname } from "node:path";

import { fail, WorkflowError } from "../state.js";
import { validateProductPath } from "./config.js";
import { parseProductDocument } from "./documents.js";
import { replayProductMutationResult, runProductMutation } from "./operations.js";
import { validateProductRecord } from "./schemas.js";
import {
  loadGeneration,
  readObject,
  saveGeneration,
  saveObject,
  verifySourcePin,
} from "./storage.js";
import type { LoadedGeneration, SourcePin } from "./storage.js";

const MAX_SOURCE_BYTES = 16 * 1024 * 1024;
const REVIEW_AGGREGATE_RESERVE_BYTES = 64 * 1024;
const MAX_REVIEWS = 10_000;
const PORTION_CODE_POINTS = 4096;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/u;
const TASK_PATTERN = /^TASK-[0-9]{4,}$/u;
const SENSITIVE_PATTERN = /\b(?:authorization\s*:\s*bearer|api[_-]?key\s*[:=]|access[_-]?token\s*[:=]|refresh[_-]?token\s*[:=]|client[_-]?secret\s*[:=]|private[_-]?key\s*[:=]|secret[_-]?access[_-]?key\s*[:=]|password\s*[:=]|secret\s*[:=])|-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----|\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b|\bgh[pousr]_[A-Za-z0-9]{20,}\b|\bxox[baprs]-[A-Za-z0-9-]{10,}\b/iu;
const ARTIFACTS = ["idea", "prd", "technical-design", "roadmap"] as const;

type Artifact = typeof ARTIFACTS[number];
type Coverage = "pending" | "reviewed" | "gaps" | "stale";
type ReviewMode = "full" | "followup";

interface CandidateRef {
  readonly product_id: string;
  readonly candidate_id: string;
}

interface Ref {
  readonly product_id: string;
  readonly artifact: Artifact;
  readonly element_id: string;
}

interface DecisionRef {
  readonly product_id: string;
  readonly artifact: Artifact;
  readonly id: string;
  readonly revision: number;
}

interface DecisionRecord {
  readonly schema_version: 1;
  readonly kind: "decision";
  readonly ref: DecisionRef;
  readonly state: "needs_user" | "answered" | "observed" | "assumed" | "superseded" | "no_answer";
  readonly category: string;
  readonly question: string | null;
  readonly text: string;
  readonly source: string;
  readonly selected_ids: readonly string[];
  readonly predecessors: readonly DecisionRef[];
  readonly affected_refs: readonly Ref[];
  readonly reconsider_when: string | null;
  readonly candidate_id: string;
}

interface ImpactTaskBinding {
  readonly product_id: string;
  readonly task_id: string;
  readonly state: "reserved" | "specified" | "planned" | "started" | "blocked" | "completed";
  readonly product_pins: readonly SourcePin[];
  readonly product_source_version?: string | null;
}

interface LoadedImpactTaskBinding {
  readonly binding: ImpactTaskBinding;
  readonly sha256: string;
}

interface PageItem {
  readonly ref: Ref | null;
  readonly decision_ref: DecisionRef | null;
  readonly document: null;
  readonly product_id: string | null;
  readonly title: string;
  readonly state: string;
  readonly reason: string | null;
  readonly operation_ref: string | null;
}

interface Page {
  readonly source_version: string;
  readonly items: readonly PageItem[];
  readonly total: number;
  readonly complete: boolean;
  readonly next_cursor: string | null;
}

interface RecordObject {
  readonly id: string;
  readonly object_sha256: string;
}

interface ProductContext {
  readonly contract: "product-1";
  readonly store_id: string | null;
  readonly product_id: string;
  readonly workspace_id: string | null;
  readonly candidate_ref: CandidateRef | null;
  readonly selected_sources_sha256: string;
  readonly target_revision: string;
  readonly canonical_workspace: string;
}

interface CandidateRecord {
  readonly schema_version: 1;
  readonly kind: "candidate";
  readonly product_id: string;
  readonly candidate_id: string;
  readonly artifact: Artifact;
  readonly base_generation: string | null;
  readonly workspace_id: string;
  readonly state: "draft" | "review_pending" | "reviewed" | "blocked" | "activated" | "abandoned";
  readonly scope: unknown;
  readonly registry: RecordObject;
  readonly upstream_pins: readonly SourcePin[];
  readonly decision_heads: readonly { readonly decision_ref: DecisionRef; readonly object_sha256: string }[];
  readonly relations: readonly Relation[];
  readonly source_version: string;
}

interface DocumentRecord {
  readonly id: string;
  readonly artifact: Artifact;
  readonly role: "semantic" | "navigation";
  readonly subject: string;
  readonly relative_path: string;
  readonly object_sha256: string;
}

interface ElementMetadata {
  readonly ref: Ref;
  readonly semantic_type: string;
  readonly applicability: {
    readonly state: string;
    readonly stage_refs: readonly Ref[];
    readonly global: boolean;
    readonly reason: string;
  };
  readonly provenance: readonly DecisionRef[];
  readonly state: "active" | "retired";
}

interface Relation {
  readonly from: Ref;
  readonly kind: string;
  readonly to: Ref;
}

interface RegistryRecord {
  readonly schema_version: 1;
  readonly kind: "registry";
  readonly product_id: string;
  readonly documents: readonly DocumentRecord[];
  readonly element_metadata: readonly ElementMetadata[];
}

interface Verdict {
  readonly item_key: string;
  readonly verdict: "covered" | "gap" | "conflict" | "not_applicable";
  readonly explanation: string;
  readonly counterexample: string | null;
  readonly evidence_refs: readonly Ref[];
  readonly evidence_sources: readonly SourcePin[];
  readonly read_receipt: string;
  readonly inherited_from: string | null;
}

interface ReviewRecord {
  readonly schema_version: 1;
  readonly kind: "review";
  readonly id: string;
  readonly candidate_ref: CandidateRef;
  readonly source_version: string;
  readonly mode: ReviewMode;
  readonly parent: string | null;
  readonly coverage: Exclude<Coverage, "stale">;
  readonly inventory_sha256: string;
  readonly verdict_objects: readonly RecordObject[];
  readonly consistency_receipt: string | null;
}

interface InventoryItem {
  readonly item_key: string;
  readonly text: string;
  readonly text_sha256: string;
  readonly refs: readonly Ref[];
}

interface ReviewInventory {
  readonly schema_version: 1;
  readonly kind: "review_inventory";
  readonly candidate_ref: CandidateRef;
  readonly source_version: string;
  readonly items: readonly InventoryItem[];
  readonly consistency_text: string;
}

interface ReviewStatus {
  readonly review_ref: string;
  readonly source_version: string;
  readonly current_source_version: string;
  readonly coverage_status: Coverage;
  readonly total_items: number;
  readonly recorded_items: number;
  readonly next_item_index: number | null;
}

interface ReviewPortion {
  readonly review_ref: string;
  readonly source_version: string;
  readonly item_key: string;
  readonly text: string;
  readonly complete: boolean;
  readonly next_cursor: string | null;
  readonly read_receipt: string | null;
  readonly recorded_result: Verdict | null;
  readonly next_item_index: number | null;
}

interface CheckResult {
  readonly status: "pass" | "fail";
  readonly source_version: string;
  readonly issues: readonly { readonly code: string; readonly message: string; readonly ref: Ref | null }[];
  readonly semantic_correctness_proven: false;
  readonly user_consent_authenticated: false;
  readonly coverage_status: Coverage | null;
  readonly review_ref: string | null;
}

interface MutationResult extends Record<string, unknown> {
  readonly operation_ref: string;
  readonly applied: true;
  readonly candidate_ref: CandidateRef | null;
  readonly changed_refs: readonly Ref[];
  readonly decision_ref: DecisionRef | null;
  readonly question_ref: null;
  readonly product_id: string;
  readonly workspace_id: string | null;
  readonly task_id: null;
  readonly specification_id: null;
  readonly review_ref: string | null;
  readonly next: string;
  readonly document_id: null;
}

export interface ProductReviewOutcome<T> {
  readonly context: string;
  readonly result: T;
  readonly replayed: boolean;
  readonly operationRef: string | null;
}

interface CandidateState {
  readonly root: string;
  readonly context: ProductContext;
  readonly candidate: CandidateRecord;
  readonly candidateBytes: Buffer;
  readonly registry: RegistryRecord;
  readonly generation: LoadedGeneration;
}

interface ReviewState extends CandidateState {
  readonly review: ReviewRecord;
  readonly reviewBytes: Buffer;
  readonly inventory: ReviewInventory;
  readonly verdicts: ReadonlyMap<string, { readonly verdict: Verdict; readonly object: RecordObject }>;
}

interface Fix {
  readonly finding_key: string;
  readonly changed_refs: readonly Ref[];
  readonly explanation: string;
}

function digest(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalValue(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) return fail("INVALID_INPUT", "Product review input is not canonical JSON data.");
    return encoded;
  }
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalValue(entry)).join(",")}]`;
  if (typeof value !== "object") return fail("INVALID_INPUT", "Product review input is not canonical JSON data.");
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalValue(record[key])}`).join(",")}}`;
}

function canonicalBytes(value: unknown): Buffer {
  return Buffer.from(`${canonicalValue(value)}\n`, "utf8");
}

function deterministicUuid(seed: string): string {
  const value = digest(seed).slice(0, 32);
  const variant = ((Number.parseInt(value[16]!, 16) & 0x3) | 0x8).toString(16);
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-5${value.slice(13, 16)}-${variant}${value.slice(17, 20)}-${value.slice(20)}`;
}

function refKey(reference: Ref): string {
  return `${reference.product_id}:${reference.artifact}:${reference.element_id}`;
}

function nodeErrorCode(error: unknown): string | undefined {
  if (error === null || typeof error !== "object" || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

async function closeHandle(handle: FileHandle | undefined): Promise<void> {
  if (handle === undefined) return;
  await handle.close().catch(() => undefined);
}

function parseJson(value: Uint8Array, label: string): unknown {
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(value));
  } catch {
    return fail("INVALID_STATE", `${label} is not canonical UTF-8 product data.`);
  }
}

function decodeContext(value: string): ProductContext {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    return fail("INVALID_INPUT", "Product context is invalid.");
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return fail("INVALID_INPUT", "Product context is invalid.");
  }
  const record = parsed as Record<string, unknown>;
  const allowed = new Set([
    "contract", "store_id", "product_id", "workspace_id", "candidate_ref",
    "selected_sources_sha256", "target_revision", "canonical_workspace",
  ]);
  const candidate = record.candidate_ref as Record<string, unknown> | null;
  if (
    record.contract !== "product-1"
    || typeof record.product_id !== "string" || !UUID_PATTERN.test(record.product_id)
    || !(record.store_id === null || (typeof record.store_id === "string" && UUID_PATTERN.test(record.store_id)))
    || !(record.workspace_id === null || (typeof record.workspace_id === "string" && UUID_PATTERN.test(record.workspace_id)))
    || !(candidate === null || (
      typeof candidate === "object" && !Array.isArray(candidate)
      && candidate.product_id === record.product_id
      && typeof candidate.candidate_id === "string" && UUID_PATTERN.test(candidate.candidate_id)
      && !Object.keys(candidate).some((key) => !["product_id", "candidate_id"].includes(key))
    ))
    || typeof record.selected_sources_sha256 !== "string" || !DIGEST_PATTERN.test(record.selected_sources_sha256)
    || typeof record.target_revision !== "string" || !DIGEST_PATTERN.test(record.target_revision)
    || typeof record.canonical_workspace !== "string" || record.canonical_workspace.length === 0
    || record.canonical_workspace.length > 4096
    || Object.keys(record).some((key) => !allowed.has(key))
  ) {
    return fail("INVALID_INPUT", "Product review requires selected candidate context.");
  }
  return record as unknown as ProductContext;
}

function encodeContext(context: ProductContext, candidate: CandidateRecord, targetRevision = candidate.base_generation): string {
  if (targetRevision === null) return fail("PREREQUISITE_REQUIRED", "Product candidate requires a base generation.");
  return Buffer.from(JSON.stringify({
    ...context,
    product_id: candidate.product_id,
    workspace_id: candidate.workspace_id,
    candidate_ref: { product_id: candidate.product_id, candidate_id: candidate.candidate_id },
    selected_sources_sha256: candidate.source_version,
    target_revision: targetRevision,
  })).toString("base64url");
}

function encodeHeadContext(context: ProductContext, targetRevision: string): string {
  return Buffer.from(JSON.stringify({
    ...context,
    candidate_ref: null,
    selected_sources_sha256: digest(canonicalValue({
      product_id: context.product_id,
      workspace_id: context.workspace_id,
      target_revision: targetRevision,
    })),
    target_revision: targetRevision,
  })).toString("base64url");
}

function candidatePath(reference: CandidateRef): string {
  return `products/${reference.product_id}/drafts/${reference.candidate_id}/candidate.yaml`;
}

function candidateDocumentPath(reference: CandidateRef, relativePath: string): string {
  return `products/${reference.product_id}/drafts/${reference.candidate_id}/documents/${relativePath}`;
}

function taskBindingDirectory(productId: string): string {
  return `products/${productId}/tasks`;
}

function reviewPath(reference: CandidateRef, reviewId: string): string {
  return `products/${reference.product_id}/drafts/${reference.candidate_id}/reviews/${reviewId}.yaml`;
}

async function readSafe(root: string, relativePath: string, workspace: string): Promise<Buffer | null> {
  const path = await validateProductPath(root, relativePath, { workspaceRoots: [workspace] });
  let pathStat;
  try {
    pathStat = await lstat(path);
  } catch (error) {
    if (nodeErrorCode(error) === "ENOENT") return null;
    return fail("INVALID_STATE", "Product review state cannot be inspected safely.");
  }
  if (pathStat.isSymbolicLink() || !pathStat.isFile() || pathStat.nlink !== 1) {
    return fail("UNSAFE_PATH", "Product review state must be a single-link file.");
  }
  if (pathStat.size > MAX_SOURCE_BYTES) return fail("SOURCE_LIMIT", "Product review state exceeds 16 MiB limit.");
  let handle: FileHandle | undefined;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = await handle.stat();
    if (before.dev !== pathStat.dev || before.ino !== pathStat.ino || before.size !== pathStat.size) {
      return fail("SOURCE_CHANGED", "Product review state changed before it could be read.");
    }
    const value = await handle.readFile();
    const after = await handle.stat();
    const finalPath = await lstat(path);
    if (
      value.byteLength !== before.size || before.dev !== after.dev || before.ino !== after.ino
      || before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs
      || finalPath.isSymbolicLink() || !finalPath.isFile() || finalPath.nlink !== 1
      || finalPath.dev !== after.dev || finalPath.ino !== after.ino
    ) {
      return fail("SOURCE_CHANGED", "Product review state changed while it was read.");
    }
    return value;
  } catch (error) {
    if (error instanceof WorkflowError) throw error;
    if (["ENOENT", "ELOOP"].includes(nodeErrorCode(error) ?? "")) {
      return fail("SOURCE_CHANGED", "Product review state changed while it was read.");
    }
    return fail("INVALID_STATE", "Product review state cannot be read safely.");
  } finally {
    await closeHandle(handle);
  }
}

async function atomicWrite(root: string, relativePath: string, value: Buffer, workspace: string): Promise<void> {
  let path = await validateProductPath(root, relativePath, { workspaceRoots: [workspace] });
  try {
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  } catch {
    return fail("INVALID_STATE", "Product review directory cannot be created safely.");
  }
  path = await validateProductPath(root, relativePath, { workspaceRoots: [workspace] });
  const temporaryRelative = `${relativePath}.${randomUUID()}.tmp`;
  const temporaryPath = await validateProductPath(root, temporaryRelative, { workspaceRoots: [workspace] });
  let handle: FileHandle | undefined;
  let installed = false;
  try {
    handle = await open(temporaryPath, "wx", 0o600);
    await handle.writeFile(value);
    await handle.sync();
    await closeHandle(handle);
    handle = undefined;
    await rename(temporaryPath, path);
    installed = true;
  } catch (error) {
    if (error instanceof WorkflowError) throw error;
    return fail("INVALID_STATE", "Product review state cannot be replaced safely.");
  } finally {
    await closeHandle(handle);
    if (!installed) await unlink(temporaryPath).catch(() => undefined);
  }
}

async function applyChange(
  root: string,
  relativePath: string,
  before: Buffer | null,
  after: Buffer,
  workspace: string,
): Promise<void> {
  const current = await readSafe(root, relativePath, workspace);
  if (current?.equals(after)) return;
  if ((current === null) !== (before === null) || (current !== null && before !== null && !current.equals(before))) {
    return fail("CONFLICT", "Product review state changed during mutation recovery.");
  }
  await atomicWrite(root, relativePath, after, workspace);
}

async function verifyChange(root: string, relativePath: string, after: Buffer, workspace: string): Promise<void> {
  const current = await readSafe(root, relativePath, workspace);
  if (!current?.equals(after)) return fail("CONFLICT", "Product review state changed during mutation recovery.");
}

async function loadCandidate(
  root: string,
  context: ProductContext,
  reference: CandidateRef,
  requireSelected = true,
): Promise<CandidateState> {
  if (reference.product_id !== context.product_id) return fail("NOT_FOUND", "Product candidate belongs to another product.");
  if (requireSelected && context.candidate_ref?.candidate_id !== reference.candidate_id) {
    return fail("INVALID_INPUT", "Product review requires the selected candidate.");
  }
  const candidateBytes = await readSafe(root, candidatePath(reference), context.canonical_workspace);
  if (candidateBytes === null) return fail("NOT_FOUND", "Product candidate does not exist.");
  const candidate = await validateProductRecord("Candidate", parseJson(candidateBytes, "Product candidate")) as CandidateRecord;
  if (
    candidate.product_id !== reference.product_id || candidate.candidate_id !== reference.candidate_id
    || candidate.base_generation === null || candidate.base_generation !== context.target_revision
  ) {
    return fail("CONFLICT", "Product candidate no longer matches selected base generation.");
  }
  if (requireSelected && (
    candidate.workspace_id !== context.workspace_id || candidate.source_version !== context.selected_sources_sha256
  )) {
    return fail("CONFLICT", "Product candidate changed after the context was opened.");
  }
  const generation = await loadGeneration(root, candidate.product_id, candidate.base_generation);
  const registryBytes = await readObject(root, {
    productId: candidate.product_id, kind: "record", sha256: candidate.registry.object_sha256,
  });
  const registry = await validateProductRecord("Registry", parseJson(registryBytes, "Product registry")) as RegistryRecord;
  if (registry.product_id !== candidate.product_id || candidate.registry.id.length === 0) {
    return fail("SOURCE_CHANGED", "Product registry identity does not match candidate.");
  }
  return { root, context, candidate, candidateBytes, registry, generation };
}

function item(reference: string, text: string, refs: readonly Ref[] = []): InventoryItem {
  return { item_key: reference, text, text_sha256: digest(text), refs: [...refs].sort((a, b) => refKey(a).localeCompare(refKey(b))) };
}

function proseOutsideElements(source: string, elements: readonly { readonly start: number; readonly end: number }[]): string {
  let cursor = 0;
  const fragments: string[] = [];
  for (const element of elements) {
    fragments.push(source.slice(cursor, element.start));
    cursor = element.end;
  }
  fragments.push(source.slice(cursor));
  return fragments.join("").trim();
}

async function buildInventory(state: CandidateState): Promise<ReviewInventory> {
  const items: InventoryItem[] = [];
  let aggregateBytes = 0;
  const append = (entry: InventoryItem): void => {
    const consistencyEntry = `## ${entry.item_key}\n${entry.text}`;
    const contribution = Buffer.byteLength(canonicalValue(entry), "utf8")
      + Buffer.byteLength(JSON.stringify(consistencyEntry), "utf8");
    if (contribution > MAX_SOURCE_BYTES - REVIEW_AGGREGATE_RESERVE_BYTES - aggregateBytes) {
      return fail("SOURCE_LIMIT", "Product review inventory exceeds supported aggregate size.");
    }
    aggregateBytes += contribution;
    items.push(entry);
  };
  append(item("scope", canonicalValue(state.candidate.scope)));
  const metadataByRef = new Map(state.registry.element_metadata.map((entry) => [refKey(entry.ref), entry]));
  for (const document of state.registry.documents) {
    if (document.role !== "semantic") continue;
    const value = await readObject(state.root, {
      productId: state.candidate.product_id, kind: "markdown", sha256: document.object_sha256,
    });
    const parsed = parseProductDocument(value);
    for (const element of parsed.elements) {
      const metadata = metadataByRef.get(`${state.candidate.product_id}:${document.artifact}:${element.id}`);
      if (metadata === undefined || metadata.state !== "active") {
        return fail("BROKEN_REFERENCE", "Product review element is missing active registry metadata.");
      }
      if (document.artifact === state.candidate.artifact || metadata.applicability.global) {
        append(item(
          `element:${document.artifact}:${element.id}`,
          parsed.source.slice(element.start, element.end),
          [metadata.ref],
        ));
      }
    }
    if (document.artifact === state.candidate.artifact) {
      const prose = proseOutsideElements(parsed.source, parsed.elements);
      if (prose.length > 0) append(item(`document:${document.id}:prose`, prose));
    }
  }
  for (const head of state.candidate.decision_heads) {
    const decisionBytes = await readObject(state.root, {
      productId: state.candidate.product_id,
      kind: "decision",
      sha256: head.object_sha256,
      artifact: head.decision_ref.artifact,
      decisionId: head.decision_ref.id,
      revision: head.decision_ref.revision,
    });
    const decision = parseJson(decisionBytes, "Product decision") as Record<string, unknown>;
    const affected = Array.isArray(decision.affected_refs)
      ? decision.affected_refs.filter((entry): entry is Ref => entry !== null && typeof entry === "object")
      : [];
    append(item(
      `decision:${head.decision_ref.artifact}:${head.decision_ref.id}:${head.decision_ref.revision}`,
      new TextDecoder().decode(decisionBytes),
      affected,
    ));
  }
  for (const relation of state.candidate.relations) {
    if (relation.from.artifact === state.candidate.artifact || relation.to.artifact === state.candidate.artifact) {
      append(item(
        `relation:${digest(canonicalValue(relation))}`,
        canonicalValue(relation),
        [relation.from, relation.to],
      ));
    }
  }
  state.candidate.upstream_pins.forEach((pin, index) => {
    const refs = pin.element_ids.map((elementId) => ({
      product_id: pin.product_id, artifact: pin.artifact, element_id: elementId,
    }));
    append(item(`upstream:${String(index).padStart(4, "0")}:${pin.artifact}`, canonicalValue(pin), refs));
  });
  items.sort((left, right) => left.item_key.localeCompare(right.item_key));
  if (items.length > 10_000) return fail("SOURCE_LIMIT", "Product review inventory exceeds supported item count.");
  const keys = new Set<string>();
  for (const entry of items) {
    if (keys.has(entry.item_key)) return fail("INVALID_STATE", "Product review inventory contains duplicate item keys.");
    keys.add(entry.item_key);
  }
  const inventory: ReviewInventory = {
    schema_version: 1,
    kind: "review_inventory",
    candidate_ref: { product_id: state.candidate.product_id, candidate_id: state.candidate.candidate_id },
    source_version: state.candidate.source_version,
    items,
    consistency_text: items.map((entry) => `## ${entry.item_key}\n${entry.text}`).join("\n\n"),
  };
  if (canonicalBytes(inventory).byteLength > MAX_SOURCE_BYTES) {
    return fail("SOURCE_LIMIT", "Product review inventory exceeds supported aggregate size.");
  }
  return inventory;
}

function validateInventory(value: unknown, review: ReviewRecord): ReviewInventory {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return fail("INVALID_STATE", "Product review inventory is invalid.");
  }
  const inventory = value as Record<string, unknown>;
  const candidateRef = inventory.candidate_ref;
  const rawItems = inventory.items;
  if (
    inventory.schema_version !== 1 || inventory.kind !== "review_inventory"
    || candidateRef === null || typeof candidateRef !== "object" || Array.isArray(candidateRef)
    || (candidateRef as Record<string, unknown>).product_id !== review.candidate_ref.product_id
    || (candidateRef as Record<string, unknown>).candidate_id !== review.candidate_ref.candidate_id
    || inventory.source_version !== review.source_version || !Array.isArray(rawItems)
    || rawItems.length > 10_000 || typeof inventory.consistency_text !== "string"
  ) {
    return fail("SOURCE_CHANGED", "Product review inventory does not match review source.");
  }
  const keys = new Set<string>();
  const items: readonly unknown[] = rawItems;
  for (const entry of items) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      return fail("INVALID_STATE", "Product review inventory item is invalid.");
    }
    const itemValue = entry as Record<string, unknown>;
    const refs = itemValue.refs;
    if (
      typeof itemValue.item_key !== "string" || typeof itemValue.text !== "string"
      || typeof itemValue.text_sha256 !== "string" || digest(itemValue.text) !== itemValue.text_sha256
      || !Array.isArray(refs) || refs.some((reference) => (
        reference === null || typeof reference !== "object" || Array.isArray(reference)
        || typeof (reference as Record<string, unknown>).product_id !== "string"
        || !ARTIFACTS.includes((reference as Record<string, unknown>).artifact as Artifact)
        || typeof (reference as Record<string, unknown>).element_id !== "string"
      ))
      || keys.has(itemValue.item_key)
    ) return fail("INVALID_STATE", "Product review inventory item is invalid.");
    keys.add(itemValue.item_key);
  }
  return value as ReviewInventory;
}

async function loadVerdicts(
  root: string,
  productId: string,
  review: ReviewRecord,
): Promise<ReadonlyMap<string, { readonly verdict: Verdict; readonly object: RecordObject }>> {
  const result = new Map<string, { verdict: Verdict; object: RecordObject }>();
  let aggregateBytes = 0;
  for (const object of review.verdict_objects) {
    const value = await readObject(root, { productId, kind: "record", sha256: object.object_sha256 });
    if (value.byteLength > MAX_SOURCE_BYTES - aggregateBytes) {
      return fail("SOURCE_LIMIT", "Product review verdicts exceed supported aggregate size.");
    }
    aggregateBytes += value.byteLength;
    const verdict = await validateProductRecord("Verdict", parseJson(value, "Product review verdict")) as Verdict;
    if (result.has(verdict.item_key)) return fail("INVALID_STATE", "Product review contains duplicate verdicts.");
    result.set(verdict.item_key, { verdict, object });
  }
  return result;
}

async function loadReviewState(
  root: string,
  context: ProductContext,
  reference: CandidateRef,
  reviewId: string,
  requireSelected = true,
): Promise<ReviewState> {
  const candidate = await loadCandidate(root, context, reference, requireSelected);
  const reviewBytes = await readSafe(root, reviewPath(reference, reviewId), context.canonical_workspace);
  if (reviewBytes === null) return fail("NOT_FOUND", "Product review does not exist.");
  const review = await validateProductRecord("Review", parseJson(reviewBytes, "Product review")) as ReviewRecord;
  if (review.id !== reviewId || review.candidate_ref.product_id !== reference.product_id
    || review.candidate_ref.candidate_id !== reference.candidate_id) {
    return fail("SOURCE_CHANGED", "Product review identity does not match retained path.");
  }
  const inventoryBytes = await readObject(root, {
    productId: reference.product_id, kind: "record", sha256: review.inventory_sha256,
  });
  const inventory = validateInventory(parseJson(inventoryBytes, "Product review inventory"), review);
  const verdicts = await loadVerdicts(root, reference.product_id, review);
  return { ...candidate, review, reviewBytes, inventory, verdicts };
}

function statusFor(state: ReviewState): ReviewStatus {
  const stale = state.review.source_version !== state.candidate.source_version;
  const recorded = state.inventory.items.filter((entry) => state.verdicts.has(entry.item_key)).length;
  const nextIndex = stale || state.review.coverage !== "pending"
    ? null
    : state.inventory.items.findIndex((entry) => !state.verdicts.has(entry.item_key));
  return {
    review_ref: state.review.id,
    source_version: state.review.source_version,
    current_source_version: state.candidate.source_version,
    coverage_status: stale ? "stale" : state.review.coverage,
    total_items: state.inventory.items.length,
    recorded_items: recorded,
    next_item_index: nextIndex === null || nextIndex < 0 ? null : nextIndex,
  };
}

function operationId(scenario: string, sourceVersion: string, input: unknown): string {
  return deterministicUuid(`${scenario}:${sourceVersion}:${canonicalValue(input)}`);
}

function mutationResult(
  id: string,
  candidate: CandidateRecord,
  reviewRef: string | null,
  next: string,
): MutationResult {
  return {
    operation_ref: id,
    applied: true,
    candidate_ref: { product_id: candidate.product_id, candidate_id: candidate.candidate_id },
    changed_refs: [],
    decision_ref: null,
    question_ref: null,
    product_id: candidate.product_id,
    workspace_id: candidate.workspace_id,
    task_id: null,
    specification_id: null,
    review_ref: reviewRef,
    next,
    document_id: null,
  };
}

function assertNonSensitive(values: readonly string[]): void {
  if (values.some((value) => SENSITIVE_PATTERN.test(value))) {
    return fail("INVALID_INPUT", "Product amendment input must not contain credential-shaped data.");
  }
}

function sameDecisionRef(left: DecisionRef, right: DecisionRef): boolean {
  return left.product_id === right.product_id
    && left.artifact === right.artifact
    && left.id === right.id
    && left.revision === right.revision;
}

async function decisionFromGeneration(generation: LoadedGeneration, reference: DecisionRef): Promise<DecisionRecord> {
  const loaded = generation.decisions.find((entry) => sameDecisionRef(entry.ref, reference));
  if (loaded === undefined) return fail("NOT_FOUND", "Decision reference is not current in the selected product generation.");
  const decision = await validateProductRecord("Decision", parseJson(loaded.bytes, "Product decision")) as DecisionRecord;
  if (!sameDecisionRef(decision.ref, reference)) return fail("SOURCE_CHANGED", "Product decision identity does not match its retained reference.");
  return decision;
}

async function selectedCandidate(root: string, context: ProductContext, reference: CandidateRef): Promise<{
  readonly candidate: CandidateRecord;
  readonly bytes: Buffer;
}> {
  if (context.candidate_ref?.candidate_id !== reference.candidate_id || reference.product_id !== context.product_id) {
    return fail("INVALID_INPUT", "Product amendment requires its selected candidate context.");
  }
  const value = await readSafe(root, candidatePath(reference), context.canonical_workspace);
  if (value === null) return fail("NOT_FOUND", "Product amendment candidate does not exist.");
  const candidate = await validateProductRecord("Candidate", parseJson(value, "Product candidate")) as CandidateRecord;
  if (candidate.product_id !== reference.product_id || candidate.candidate_id !== reference.candidate_id
    || candidate.workspace_id !== context.workspace_id || candidate.base_generation !== context.target_revision
    || candidate.source_version !== context.selected_sources_sha256) {
    return fail("CONFLICT", "Product amendment candidate changed after its context was opened.");
  }
  return { candidate, bytes: value };
}

function impactCursor(candidate: CandidateRecord, inventorySha256: string, offset: number): string {
  const body = {
    kind: "amendment-impact",
    candidate_id: candidate.candidate_id,
    source_version: candidate.source_version,
    inventory_sha256: inventorySha256,
    offset,
  };
  return Buffer.from(JSON.stringify({ ...body, checksum: digest(canonicalValue(body)).slice(0, 16) })).toString("base64url");
}

function impactOffset(cursor: string | undefined, candidate: CandidateRecord, inventorySha256: string): number {
  if (cursor === undefined) return 0;
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    return fail("STALE_CURSOR", "Amendment impact cursor is invalid.");
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return fail("STALE_CURSOR", "Amendment impact cursor is invalid.");
  }
  const value = parsed as Record<string, unknown>;
  const body = {
    kind: value.kind,
    candidate_id: value.candidate_id,
    source_version: value.source_version,
    inventory_sha256: value.inventory_sha256,
    offset: value.offset,
  };
  if (value.kind !== "amendment-impact" || value.candidate_id !== candidate.candidate_id
    || value.source_version !== candidate.source_version || !Number.isInteger(value.offset)
    || value.inventory_sha256 !== inventorySha256
    || Number(value.offset) < 0 || value.checksum !== digest(canonicalValue(body)).slice(0, 16)
    || Object.keys(value).some((key) => !["kind", "candidate_id", "source_version", "inventory_sha256", "offset", "checksum"].includes(key))) {
    return fail("STALE_CURSOR", "Amendment impact cursor no longer matches the selected candidate.");
  }
  return Number(value.offset);
}

async function amendmentTaskBindings(root: string, candidate: CandidateRecord, workspace: string): Promise<LoadedImpactTaskBinding[]> {
  const relativeDirectory = taskBindingDirectory(candidate.product_id);
  const directory = await validateProductPath(root, relativeDirectory, { workspaceRoots: [workspace] });
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (nodeErrorCode(error) === "ENOENT") return [];
    return fail("INVALID_STATE", "Product task impact cannot be inspected safely.");
  }
  if (entries.length > 10_000) return fail("SOURCE_LIMIT", "Product task impact exceeds its supported limit.");
  const result: LoadedImpactTaskBinding[] = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const taskId = entry.name.replace(/\.yaml$/u, "");
    if (!entry.isFile() || !entry.name.endsWith(".yaml") || !TASK_PATTERN.test(taskId)) {
      return fail("INVALID_STATE", "Product task impact contains an unsupported entry.");
    }
    const value = await readSafe(root, `${relativeDirectory}/${entry.name}`, workspace);
    if (value === null) return fail("SOURCE_CHANGED", "Product task binding disappeared during impact inspection.");
    const binding = await validateProductRecord("TaskBinding", parseJson(value, "Product task binding")) as ImpactTaskBinding;
    if (binding.product_id !== candidate.product_id || binding.task_id !== taskId) {
      return fail("SOURCE_CHANGED", "Product task binding identity changed during impact inspection.");
    }
    result.push({ binding, sha256: digest(value) });
  }
  return result;
}

async function mutateReview<T extends object>(input: {
  readonly state: CandidateState;
  readonly scenario: string;
  readonly scenarioInput: unknown;
  readonly relativePath: string;
  readonly before: Buffer | null;
  readonly after: Buffer;
  readonly result: T;
  readonly resultDefinition: "Success_ReviewStatus" | "Success_MutationResult";
  readonly saveObjects?: () => Promise<void>;
}): Promise<ProductReviewOutcome<T>> {
  const id = operationId(input.scenario, input.state.candidate.source_version, input.scenarioInput);
  const outcome = await runProductMutation({
    root: input.state.root,
    productId: input.state.candidate.product_id,
    operationId: id,
    sessionId: randomUUID(),
    scenario: input.scenario,
    expectedRevision: input.state.candidate.base_generation,
    nextRevision: input.state.candidate.base_generation ?? fail("PREREQUISITE_REQUIRED", "Product review requires a base generation."),
    intent: { schema_version: 1, kind: "operation_intent", scenario: input.scenario, input: input.scenarioInput },
    result: input.result as Record<string, unknown>,
    resultDefinition: input.resultDefinition,
    targets: [{
      root: "store",
      binding_id: null,
      relative_path: input.relativePath,
      before: input.before === null ? null : digest(input.before),
      after: digest(input.after),
    }],
    ...(input.saveObjects === undefined ? {} : { saveObjects: async () => input.saveObjects!() }),
    saveLocalBinding: async () => applyChange(
      input.state.root, input.relativePath, input.before, input.after, input.state.context.canonical_workspace,
    ),
    verifyTargets: async () => verifyChange(
      input.state.root, input.relativePath, input.after, input.state.context.canonical_workspace,
    ),
  });
  return {
    context: encodeContext(input.state.context, input.state.candidate),
    result: outcome.result as T,
    replayed: outcome.replayed,
    operationRef: outcome.operationRef,
  };
}

function inventoryDiff(parent: ReviewInventory, current: ReviewInventory): readonly InventoryItem[] {
  const parentItems = new Map(parent.items.map((entry) => [entry.item_key, entry]));
  const currentItems = new Map(current.items.map((entry) => [entry.item_key, entry]));
  const keys = new Set([...parentItems.keys(), ...currentItems.keys()]);
  const changed: InventoryItem[] = [];
  for (const key of keys) {
    const before = parentItems.get(key);
    const after = currentItems.get(key);
    if (before?.text_sha256 !== after?.text_sha256) changed.push(after ?? before!);
  }
  return changed;
}

function receipt(reviewId: string, sourceVersion: string, itemKey: string, text: string): string {
  return digest(`${reviewId}:${sourceVersion}:${itemKey}:${digest(text)}`);
}

function cursor(input: {
  readonly review: string;
  readonly source: string;
  readonly item: string;
  readonly offset: number;
  readonly prefix_sha256: string;
}): string {
  const body = canonicalValue(input);
  return Buffer.from(JSON.stringify({ ...input, checksum: digest(body).slice(0, 16) })).toString("base64url");
}

function decodeCursor(value: string, review: ReviewRecord, itemKey: string, codePoints: readonly string[]): number {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    return fail("STALE_CURSOR", "Product review continuation is invalid or stale.");
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return fail("STALE_CURSOR", "Product review continuation is invalid or stale.");
  }
  const record = parsed as Record<string, unknown>;
  const body = canonicalValue({
    review: record.review,
    source: record.source,
    item: record.item,
    offset: record.offset,
    prefix_sha256: record.prefix_sha256,
  });
  const offset = Number(record.offset);
  if (
    record.review !== review.id || record.source !== review.source_version || record.item !== itemKey
    || !Number.isSafeInteger(record.offset) || offset < 0
    || typeof record.prefix_sha256 !== "string" || !DIGEST_PATTERN.test(record.prefix_sha256)
    || offset > codePoints.length
    || record.prefix_sha256 !== digest(codePoints.slice(0, offset).join(""))
    || record.checksum !== digest(body).slice(0, 16)
    || Object.keys(record).some((key) => ![
      "review", "source", "item", "offset", "prefix_sha256", "checksum",
    ].includes(key))
  ) return fail("STALE_CURSOR", "Product review continuation is invalid or stale.");
  return offset;
}

function portion(
  state: ReviewState,
  itemKey: string,
  text: string,
  nextItemIndex: number | null,
  cursorValue?: string,
): ReviewPortion {
  const codePoints = Array.from(text);
  const offset = cursorValue === undefined ? 0 : decodeCursor(cursorValue, state.review, itemKey, codePoints);
  if (offset > codePoints.length) return fail("STALE_CURSOR", "Product review continuation is outside current source.");
  const part = codePoints.slice(offset, offset + PORTION_CODE_POINTS).join("");
  const nextOffset = offset + Array.from(part).length;
  const complete = nextOffset >= codePoints.length;
  return {
    review_ref: state.review.id,
    source_version: state.review.source_version,
    item_key: itemKey,
    text: part,
    complete,
    next_cursor: complete ? null : cursor({
      review: state.review.id,
      source: state.review.source_version,
      item: itemKey,
      offset: nextOffset,
      prefix_sha256: digest(codePoints.slice(0, nextOffset).join("")),
    }),
    read_receipt: complete ? receipt(state.review.id, state.review.source_version, itemKey, text) : null,
    recorded_result: state.verdicts.get(itemKey)?.verdict ?? null,
    next_item_index: nextItemIndex,
  };
}

function exactReviewId(candidate: CandidateRecord, mode: ReviewMode, parent: string | null, fixes: readonly Fix[]): string {
  return deterministicUuid(canonicalValue({
    candidate_ref: { product_id: candidate.product_id, candidate_id: candidate.candidate_id },
    source_version: candidate.source_version,
    mode,
    parent,
    fixes,
  }));
}

function inheritedVerdict(verdict: Verdict, parent: string): Verdict {
  return { ...verdict, inherited_from: parent };
}

async function saveVerdictObject(root: string, productId: string, verdict: Verdict): Promise<RecordObject> {
  await validateProductRecord("Verdict", verdict);
  const saved = await saveObject(root, { productId, kind: "record", bytes: canonicalBytes(verdict) });
  return { id: deterministicUuid(`${productId}:${verdict.item_key}:${saved.sha256}`), object_sha256: saved.sha256 };
}

export async function prepareAmendment(input: {
  readonly root: string;
  readonly context: string;
  readonly artifact: Artifact;
  readonly baseGeneration: string;
  readonly intentText: string;
  readonly source: string;
}): Promise<ProductReviewOutcome<MutationResult>> {
  const context = decodeContext(input.context);
  if (context.candidate_ref !== null || context.workspace_id === null
    || !ARTIFACTS.includes(input.artifact) || input.baseGeneration !== context.target_revision
    || input.intentText.length === 0 || input.intentText.length > 8192
    || input.source.length === 0 || input.source.length > 512) {
    return fail("INVALID_INPUT", "Amendment preparation requires current bound head context and valid intent.");
  }
  assertNonSensitive([input.intentText, input.source]);
  const scenarioInput = {
    artifact: input.artifact,
    base_generation: input.baseGeneration,
    intent_text: input.intentText,
    source: input.source,
  };
  const id = operationId("product_amendment_prepare", input.baseGeneration, {
    ...scenarioInput,
    workspace_id: context.workspace_id,
  });
  const candidateId = deterministicUuid(`candidate:${id}`);
  const candidateRef = { product_id: context.product_id, candidate_id: candidateId };
  const intent = { schema_version: 1 as const, kind: "operation_intent" as const, scenario: "product_amendment_prepare", input: scenarioInput };
  try {
    const replay = await replayProductMutationResult({
      root: input.root,
      productId: context.product_id,
      operationId: id,
      scenario: "product_amendment_prepare",
      intent,
    });
    const value = await readSafe(input.root, candidatePath(candidateRef), context.canonical_workspace);
    if (value === null) return fail("RECOVERY_REQUIRED", "Prepared amendment candidate is unavailable.");
    const candidate = await validateProductRecord("Candidate", parseJson(value, "Product candidate")) as CandidateRecord;
    return {
      context: encodeContext(context, candidate),
      result: replay.result as MutationResult,
      replayed: true,
      operationRef: replay.operationRef,
    };
  } catch (error) {
    if (!(error instanceof WorkflowError && error.code === "NOT_FOUND")) throw error;
  }

  const generation = await loadGeneration(input.root, context.product_id, input.baseGeneration);
  const ready = generation.generation.ready_artifacts.find((entry) => entry.artifact === input.artifact);
  if (ready === undefined) return fail("PREREQUISITE_REQUIRED", "An amendment requires an existing ready artifact version.");
  const registry = await validateProductRecord("Registry", parseJson(generation.registry, "Product registry")) as RegistryRecord;
  const affectedRefs = registry.element_metadata
    .filter((entry) => entry.state === "active" && entry.ref.artifact === input.artifact)
    .map((entry) => entry.ref);
  if (affectedRefs.length > 100) {
    return fail("SOURCE_LIMIT", "Amendment intent affects more references than one deterministic decision can represent.");
  }
  const decisionRef: DecisionRef = {
    product_id: context.product_id,
    artifact: input.artifact,
    id: deterministicUuid(`amendment-intent:${id}`),
    revision: 1,
  };
  const decision: DecisionRecord = {
    schema_version: 1,
    kind: "decision",
    ref: decisionRef,
    state: "answered",
    category: "product-amendment-intent",
    question: "What product amendment should be prepared?",
    text: input.intentText,
    source: input.source,
    selected_ids: [],
    predecessors: [],
    affected_refs: affectedRefs,
    reconsider_when: "Reconcile again if the ready base generation changes before activation.",
    candidate_id: candidateId,
  };
  await validateProductRecord("Decision", decision);
  const decisionBytes = canonicalBytes(decision);
  const decisionDigest = digest(decisionBytes);
  const decisionHeads = [
    ...generation.generation.decision_heads.filter((entry) => entry.decision_ref.id !== decisionRef.id),
    { decision_ref: decisionRef, object_sha256: decisionDigest },
  ];
  const withoutVersion: Omit<CandidateRecord, "source_version"> = {
    schema_version: 1,
    kind: "candidate",
    product_id: context.product_id,
    candidate_id: candidateId,
    artifact: input.artifact,
    base_generation: input.baseGeneration,
    workspace_id: context.workspace_id,
    state: "draft",
    scope: {
      depth: "standard",
      profiles: [{ id: "core", reason: "Existing ready product artifact amendment." }],
      rationale: [input.intentText],
      confirmed_answer: decisionRef,
    },
    registry: generation.generation.registry,
    upstream_pins: ready.upstream_pins,
    decision_heads: decisionHeads,
    relations: generation.generation.relations as readonly Relation[],
  };
  const candidate: CandidateRecord = { ...withoutVersion, source_version: candidateVersion(withoutVersion) };
  await validateProductRecord("Candidate", candidate);
  const candidateBytes = canonicalBytes(candidate);
  const documents = registry.documents.map((document) => {
    const loaded = generation.documents.find((entry) => entry.id === document.id);
    if (loaded === undefined) return fail("SOURCE_CHANGED", "Ready amendment document disappeared during preparation.");
    return { relativePath: candidateDocumentPath(candidateRef, document.relative_path), bytes: Buffer.from(loaded.bytes) };
  });
  const changes = [{ relativePath: candidatePath(candidateRef), bytes: candidateBytes }, ...documents];
  const result: MutationResult = {
    operation_ref: id,
    applied: true,
    candidate_ref: candidateRef,
    changed_refs: affectedRefs,
    decision_ref: decisionRef,
    question_ref: null,
    product_id: context.product_id,
    workspace_id: context.workspace_id,
    task_id: null,
    specification_id: null,
    review_ref: null,
    next: "Edit the isolated amendment candidate, inspect impact, then obtain fresh independent review before activation.",
    document_id: null,
  };
  const outcome = await runProductMutation({
    root: input.root,
    productId: context.product_id,
    operationId: id,
    sessionId: randomUUID(),
    scenario: "product_amendment_prepare",
    expectedRevision: input.baseGeneration,
    nextRevision: input.baseGeneration,
    intent,
    result,
    targets: changes.map((change) => ({
      root: "store" as const,
      binding_id: null,
      relative_path: change.relativePath,
      before: null,
      after: digest(change.bytes),
    })),
    saveObjects: async () => {
      const savedDecision = await saveObject(input.root, {
        productId: context.product_id,
        kind: "decision",
        artifact: input.artifact,
        decisionId: decisionRef.id,
        revision: decisionRef.revision,
        bytes: decisionBytes,
      });
      if (savedDecision.sha256 !== decisionDigest) return fail("INVALID_STATE", "Stored amendment intent does not match its validated digest.");
      for (const change of changes) await applyChange(input.root, change.relativePath, null, change.bytes, context.canonical_workspace);
    },
    verifyTargets: async () => {
      for (const change of changes) await verifyChange(input.root, change.relativePath, change.bytes, context.canonical_workspace);
    },
  });
  return {
    context: encodeContext(context, candidate),
    result: outcome.result as MutationResult,
    replayed: outcome.replayed,
    operationRef: outcome.operationRef,
  };
}

export async function inspectAmendmentImpact(input: {
  readonly root: string;
  readonly context: string;
  readonly candidateRef: CandidateRef;
  readonly cursor?: string;
  readonly limit?: number;
}): Promise<ProductReviewOutcome<Page>> {
  const context = decodeContext(input.context);
  const state = await loadCandidate(input.root, context, input.candidateRef);
  const limit = input.limit ?? 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) return fail("INVALID_INPUT", "Amendment impact limit must be between 1 and 50.");
  const bindings = await amendmentTaskBindings(input.root, state.candidate, context.canonical_workspace);
  const inventorySha256 = digest(canonicalValue(bindings.map(({ binding, sha256 }) => ({
    task_id: binding.task_id,
    sha256,
  }))));
  const offset = impactOffset(input.cursor, state.candidate, inventorySha256);
  if (offset > bindings.length) return fail("STALE_CURSOR", "Amendment impact cursor exceeds current results.");
  const items: PageItem[] = bindings.slice(offset, offset + limit).map(({ binding }) => {
    const frozen = binding.product_pins.length > 0 && typeof binding.product_source_version === "string";
    const stateValue = binding.state === "completed" ? "completed" : frozen ? "pinned" : "reconcile";
    const reason = binding.state === "completed"
      ? "Completed task retains its recorded implementation evidence."
      : frozen
        ? "Started task may finish its exact pinned scope unless a safety or incompatibility block applies."
        : "Task has not started and must reconcile current ready product inputs before implementation.";
    return {
      ref: null,
      decision_ref: null,
      document: null,
      product_id: state.candidate.product_id,
      title: binding.task_id,
      state: stateValue,
      reason,
      operation_ref: null,
    };
  });
  const next = offset + items.length;
  return {
    context: input.context,
    result: {
      source_version: state.candidate.source_version,
      items,
      total: bindings.length,
      complete: next >= bindings.length,
      next_cursor: next < bindings.length ? impactCursor(state.candidate, inventorySha256, next) : null,
    },
    replayed: false,
    operationRef: null,
  };
}

export async function rebaseAmendment(input: {
  readonly root: string;
  readonly context: string;
  readonly candidateRef: CandidateRef;
  readonly newBaseGeneration: string;
  readonly resolutionRef: DecisionRef;
}): Promise<ProductReviewOutcome<MutationResult>> {
  const context = decodeContext(input.context);
  if (!DIGEST_PATTERN.test(input.newBaseGeneration)) return fail("INVALID_INPUT", "New amendment base generation is invalid.");
  const selected = await selectedCandidate(input.root, context, input.candidateRef);
  if (selected.candidate.base_generation === null) return fail("INVALID_STATE", "Product amendment has no retained base generation.");
  const scenarioInput = {
    candidate_ref: input.candidateRef,
    new_base_generation: input.newBaseGeneration,
    resolution_ref: input.resolutionRef,
  };
  const id = operationId("product_amendment_rebase", selected.candidate.source_version, scenarioInput);
  const intent = { schema_version: 1 as const, kind: "operation_intent" as const, scenario: "product_amendment_rebase", input: scenarioInput };
  try {
    const replay = await replayProductMutationResult({
      root: input.root,
      productId: context.product_id,
      operationId: id,
      scenario: "product_amendment_rebase",
      intent,
    });
    const current = await readSafe(input.root, candidatePath(input.candidateRef), context.canonical_workspace);
    if (current === null) return fail("RECOVERY_REQUIRED", "Rebased amendment candidate is unavailable.");
    const candidate = await validateProductRecord("Candidate", parseJson(current, "Product candidate")) as CandidateRecord;
    return {
      context: encodeContext(context, candidate, input.newBaseGeneration),
      result: replay.result as MutationResult,
      replayed: true,
      operationRef: replay.operationRef,
    };
  } catch (error) {
    if (!(error instanceof WorkflowError && error.code === "NOT_FOUND")) throw error;
  }
  const oldBase = await loadGeneration(input.root, context.product_id, selected.candidate.base_generation);
  const newBase = await loadGeneration(input.root, context.product_id, input.newBaseGeneration);
  const resolution = await decisionFromGeneration(newBase, input.resolutionRef);
  if (resolution.state !== "answered") return fail("PREREQUISITE_REQUIRED", "Amendment rebase requires an explicit answered reconciliation decision.");
  if (oldBase.generation.registry.object_sha256 !== newBase.generation.registry.object_sha256
    || canonicalValue(oldBase.generation.relations) !== canonicalValue(newBase.generation.relations)) {
    return fail("PREREQUISITE_REQUIRED", "Concurrent product structure changed; prepare a new amendment after explicit reconciliation.");
  }
  const ready = newBase.generation.ready_artifacts.find((entry) => entry.artifact === selected.candidate.artifact);
  if (ready === undefined) return fail("PREREQUISITE_REQUIRED", "Rebase target no longer has the amended ready artifact.");
  const mergedHeads = new Map(newBase.generation.decision_heads.map((entry) => [entry.decision_ref.id, entry]));
  for (const entry of selected.candidate.decision_heads) {
    const current = mergedHeads.get(entry.decision_ref.id);
    if (current !== undefined && current.object_sha256 !== entry.object_sha256) {
      return fail("PREREQUISITE_REQUIRED", "Concurrent decision changed; prepare a new amendment after explicit reconciliation.");
    }
    mergedHeads.set(entry.decision_ref.id, entry);
  }
  const withoutVersion: Omit<CandidateRecord, "source_version"> = {
    ...candidateWithoutVersion(selected.candidate),
    base_generation: input.newBaseGeneration,
    state: "draft",
    upstream_pins: ready.upstream_pins,
    decision_heads: [...mergedHeads.values()],
  };
  const candidate: CandidateRecord = { ...withoutVersion, source_version: candidateVersion(withoutVersion) };
  await validateProductRecord("Candidate", candidate);
  const after = canonicalBytes(candidate);
  const result: MutationResult = {
    operation_ref: id,
    applied: true,
    candidate_ref: input.candidateRef,
    changed_refs: resolution.affected_refs,
    decision_ref: input.resolutionRef,
    question_ref: null,
    product_id: candidate.product_id,
    workspace_id: candidate.workspace_id,
    task_id: null,
    specification_id: null,
    review_ref: null,
    next: "Repeat impact inspection and independent review against the reconciled base before activation.",
    document_id: null,
  };
  const outcome = await runProductMutation({
    root: input.root,
    productId: candidate.product_id,
    operationId: id,
    sessionId: randomUUID(),
    scenario: "product_amendment_rebase",
    expectedRevision: input.newBaseGeneration,
    nextRevision: input.newBaseGeneration,
    intent,
    result,
    targets: [{
      root: "store" as const,
      binding_id: null,
      relative_path: candidatePath(input.candidateRef),
      before: digest(selected.bytes),
      after: digest(after),
    }],
    saveObjects: () => applyChange(input.root, candidatePath(input.candidateRef), selected.bytes, after, context.canonical_workspace),
    verifyTargets: () => verifyChange(input.root, candidatePath(input.candidateRef), after, context.canonical_workspace),
  });
  return {
    context: encodeContext(context, candidate, input.newBaseGeneration),
    result: outcome.result as MutationResult,
    replayed: outcome.replayed,
    operationRef: outcome.operationRef,
  };
}

export async function startProductReview(input: {
  readonly root: string;
  readonly context: string;
  readonly candidateRef: CandidateRef;
  readonly mode: ReviewMode;
  readonly parentReviewRef?: string;
  readonly fixes?: readonly Fix[];
}): Promise<ProductReviewOutcome<ReviewStatus>> {
  const context = decodeContext(input.context);
  const state = await loadCandidate(input.root, context, input.candidateRef);
  const fixes = input.fixes ?? [];
  if ((input.mode === "followup") !== (input.parentReviewRef !== undefined && fixes.length > 0)) {
    return fail("INVALID_INPUT", "Followup review requires a parent and at least one correction.");
  }
  const parent = input.parentReviewRef ?? null;
  const id = exactReviewId(state.candidate, input.mode, parent, fixes);
  const path = reviewPath(input.candidateRef, id);
  const existing = await readSafe(input.root, path, context.canonical_workspace);
  if (existing !== null) {
    const loaded = await loadReviewState(input.root, context, input.candidateRef, id);
    return { context: input.context, result: statusFor(loaded), replayed: true, operationRef: null };
  }
  const inventory = await buildInventory(state);
  const inventoryBytes = canonicalBytes(inventory);
  const inventorySha256 = digest(inventoryBytes);
  const inherited: Verdict[] = [];
  if (input.mode === "followup") {
    const parentState = await loadReviewState(input.root, context, input.candidateRef, parent!);
    if (parentState.review.coverage !== "gaps" || parentState.review.source_version === state.candidate.source_version) {
      return fail("PREREQUISITE_REQUIRED", "Followup review requires a completed gaps review over an earlier source.");
    }
    const findings = new Set([...parentState.verdicts.values()]
      .filter(({ verdict }) => verdict.verdict === "gap" || verdict.verdict === "conflict")
      .map(({ verdict }) => verdict.item_key));
    const fixesByFinding = new Map(fixes.map((fix) => [fix.finding_key, fix]));
    if (findings.size !== fixesByFinding.size || [...findings].some((finding) => !fixesByFinding.has(finding))) {
      return fail("PREREQUISITE_REQUIRED", "Followup corrections must address every recorded finding.");
    }
    const changedRefs = new Set(fixes.flatMap((fix) => fix.changed_refs.map((reference) => refKey(reference))));
    for (const changed of inventoryDiff(parentState.inventory, inventory)) {
      if (changed.refs.length === 0 || changed.refs.some((reference) => !changedRefs.has(refKey(reference)))) {
        return fail("PREREQUISITE_REQUIRED", "Correction impact is incomplete; start a full independent review.");
      }
    }
    const currentItems = new Map(inventory.items.map((entry) => [entry.item_key, entry]));
    for (const { verdict } of parentState.verdicts.values()) {
      const previous = parentState.inventory.items.find((entry) => entry.item_key === verdict.item_key);
      const current = currentItems.get(verdict.item_key);
      if (
        current !== undefined && previous?.text_sha256 === current.text_sha256
        && (verdict.verdict === "covered" || verdict.verdict === "not_applicable")
      ) inherited.push(inheritedVerdict(verdict, parent!));
    }
  }
  const review: ReviewRecord = {
    schema_version: 1,
    kind: "review",
    id,
    candidate_ref: input.candidateRef,
    source_version: state.candidate.source_version,
    mode: input.mode,
    parent,
    coverage: "pending",
    inventory_sha256: inventorySha256,
    verdict_objects: [],
    consistency_receipt: null,
  };
  const inheritedObjects: RecordObject[] = [];
  for (const verdict of inherited) {
    const objectBytes = canonicalBytes(verdict);
    inheritedObjects.push({
      id: deterministicUuid(`${state.candidate.product_id}:${verdict.item_key}:${digest(objectBytes)}`),
      object_sha256: digest(objectBytes),
    });
  }
  const nextReview = { ...review, verdict_objects: inheritedObjects };
  await validateProductRecord("Review", nextReview);
  const nextBytes = canonicalBytes(nextReview);
  const verdictMap = new Map(inherited.map((verdict, index) => [verdict.item_key, { verdict, object: inheritedObjects[index]! }]));
  const nextState: ReviewState = {
    ...state, review: nextReview, reviewBytes: nextBytes, inventory, verdicts: verdictMap,
  };
  const result = statusFor(nextState);
  return mutateReview({
    state,
    scenario: "product_review_start",
    scenarioInput: { candidate_ref: input.candidateRef, mode: input.mode, parent_review_ref: parent, fixes },
    relativePath: path,
    before: null,
    after: nextBytes,
    result,
    resultDefinition: "Success_ReviewStatus",
    saveObjects: async () => {
      const savedInventory = await saveObject(input.root, {
        productId: state.candidate.product_id, kind: "record", bytes: inventoryBytes,
      });
      if (savedInventory.sha256 !== inventorySha256) return fail("INVALID_STATE", "Product review inventory digest changed.");
      for (const verdict of inherited) await saveVerdictObject(input.root, state.candidate.product_id, verdict);
    },
  });
}

export async function getProductReviewStatus(input: {
  readonly root: string;
  readonly context: string;
  readonly reviewRef: string;
}): Promise<ProductReviewOutcome<ReviewStatus>> {
  const context = decodeContext(input.context);
  const reference = context.candidate_ref ?? fail("INVALID_INPUT", "Product review requires selected candidate context.");
  const state = await loadReviewState(input.root, context, reference, input.reviewRef);
  return { context: input.context, result: statusFor(state), replayed: false, operationRef: null };
}

export async function readProductReviewItem(input: {
  readonly root: string;
  readonly context: string;
  readonly reviewRef: string;
  readonly itemIndex: number;
  readonly cursor?: string;
}): Promise<ProductReviewOutcome<ReviewPortion>> {
  const context = decodeContext(input.context);
  const reference = context.candidate_ref ?? fail("INVALID_INPUT", "Product review requires selected candidate context.");
  const state = await loadReviewState(input.root, context, reference, input.reviewRef);
  if (!Number.isSafeInteger(input.itemIndex) || input.itemIndex < 0 || input.itemIndex >= state.inventory.items.length) {
    return fail("NOT_FOUND", "Product review item does not exist.");
  }
  const entry = state.inventory.items[input.itemIndex]!;
  const result = portion(state, entry.item_key, entry.text, statusFor(state).next_item_index, input.cursor);
  return { context: input.context, result, replayed: false, operationRef: null };
}

export async function recordProductVerdict(input: {
  readonly root: string;
  readonly context: string;
  readonly reviewRef: string;
  readonly value: Verdict;
}): Promise<ProductReviewOutcome<MutationResult>> {
  const context = decodeContext(input.context);
  const reference = context.candidate_ref ?? fail("INVALID_INPUT", "Product review requires selected candidate context.");
  const state = await loadReviewState(input.root, context, reference, input.reviewRef);
  if (state.review.source_version !== state.candidate.source_version) return fail("CONFLICT", "Product review source changed.");
  if (state.review.coverage !== "pending") return fail("INVALID_STATE", "Completed product review cannot accept verdicts.");
  const verdict = await validateProductRecord("Verdict", input.value);
  if (verdict.inherited_from !== null) return fail("INVALID_INPUT", "Fresh review verdict cannot claim inherited provenance.");
  const index = state.inventory.items.findIndex((entry) => entry.item_key === verdict.item_key);
  if (index < 0) return fail("NOT_FOUND", "Product review item does not exist.");
  const entry = state.inventory.items[index]!;
  if (verdict.read_receipt !== receipt(state.review.id, state.review.source_version, entry.item_key, entry.text)) {
    return fail("INVALID_INPUT", "Product review verdict requires a complete current read receipt.");
  }
  if ((verdict.verdict === "gap" || verdict.verdict === "conflict") && verdict.counterexample === null) {
    return fail("INVALID_INPUT", "Gap or conflict verdict requires a concrete counterexample.");
  }
  for (const referenceValue of verdict.evidence_refs) {
    if (referenceValue.product_id !== state.candidate.product_id) return fail("NOT_FOUND", "Review evidence belongs to another product.");
  }
  for (const pin of verdict.evidence_sources) await verifySourcePin(input.root, pin);
  const existing = state.verdicts.get(verdict.item_key);
  const id = operationId("product_review_record", state.review.source_version, {
    review_ref: state.review.id, value: verdict,
  });
  const result = mutationResult(id, state.candidate, state.review.id, "Continue the independent review.");
  if (existing !== undefined) {
    if (canonicalValue(existing.verdict) !== canonicalValue(verdict)) {
      return fail("CONFLICT", "Product review item already has a different verdict.");
    }
    return { context: input.context, result, replayed: true, operationRef: id };
  }
  const verdictBytes = canonicalBytes(verdict);
  const object: RecordObject = {
    id: deterministicUuid(`${state.candidate.product_id}:${verdict.item_key}:${digest(verdictBytes)}`),
    object_sha256: digest(verdictBytes),
  };
  const review: ReviewRecord = { ...state.review, verdict_objects: [...state.review.verdict_objects, object] };
  await validateProductRecord("Review", review);
  const reviewBytes = canonicalBytes(review);
  return mutateReview({
    state,
    scenario: "product_review_record",
    scenarioInput: { review_ref: state.review.id, value: verdict },
    relativePath: reviewPath(reference, state.review.id),
    before: state.reviewBytes,
    after: reviewBytes,
    result,
    resultDefinition: "Success_MutationResult",
    saveObjects: async () => {
      const saved = await saveVerdictObject(input.root, state.candidate.product_id, verdict);
      if (saved.object_sha256 !== object.object_sha256) return fail("INVALID_STATE", "Product verdict digest changed.");
    },
  });
}

export async function readProductReviewConsistency(input: {
  readonly root: string;
  readonly context: string;
  readonly reviewRef: string;
  readonly cursor?: string;
}): Promise<ProductReviewOutcome<ReviewPortion>> {
  const context = decodeContext(input.context);
  const reference = context.candidate_ref ?? fail("INVALID_INPUT", "Product review requires selected candidate context.");
  const state = await loadReviewState(input.root, context, reference, input.reviewRef);
  if (state.review.mode !== "followup") return fail("INVALID_STATE", "Only followup review has a consistency gate.");
  const result = portion(state, "__consistency__", state.inventory.consistency_text, statusFor(state).next_item_index, input.cursor);
  return { context: input.context, result, replayed: false, operationRef: null };
}

export async function recordProductReviewConsistency(input: {
  readonly root: string;
  readonly context: string;
  readonly reviewRef: string;
  readonly readReceipt: string;
  readonly verdict: "covered" | "gap" | "conflict";
  readonly explanation: string;
  readonly counterexample: string | null;
}): Promise<ProductReviewOutcome<MutationResult>> {
  const context = decodeContext(input.context);
  const reference = context.candidate_ref ?? fail("INVALID_INPUT", "Product review requires selected candidate context.");
  const state = await loadReviewState(input.root, context, reference, input.reviewRef);
  if (state.review.mode !== "followup" || state.review.coverage !== "pending") {
    return fail("INVALID_STATE", "Product review consistency gate is unavailable.");
  }
  const expectedReceipt = receipt(state.review.id, state.review.source_version, "__consistency__", state.inventory.consistency_text);
  if (input.readReceipt !== expectedReceipt) return fail("INVALID_INPUT", "Consistency verdict requires complete current read receipt.");
  if ((input.verdict === "gap" || input.verdict === "conflict") && input.counterexample === null) {
    return fail("INVALID_INPUT", "Consistency gap requires a concrete counterexample.");
  }
  const verdict: Verdict = {
    item_key: "__consistency__",
    verdict: input.verdict,
    explanation: input.explanation,
    counterexample: input.counterexample,
    evidence_refs: [],
    evidence_sources: [],
    read_receipt: input.readReceipt,
    inherited_from: null,
  };
  await validateProductRecord("Verdict", verdict);
  const id = operationId("product_review_consistency_record", state.review.source_version, {
    review_ref: state.review.id, read_receipt: input.readReceipt, verdict: input.verdict,
    explanation: input.explanation, counterexample: input.counterexample,
  });
  const result = mutationResult(id, state.candidate, state.review.id, "Complete the followup review after all item verdicts are recorded.");
  const existing = state.verdicts.get("__consistency__");
  if (existing !== undefined) {
    if (canonicalValue(existing.verdict) !== canonicalValue(verdict)) return fail("CONFLICT", "Consistency verdict already differs.");
    return { context: input.context, result, replayed: true, operationRef: id };
  }
  const verdictBytes = canonicalBytes(verdict);
  const object: RecordObject = {
    id: deterministicUuid(`${state.candidate.product_id}:__consistency__:${digest(verdictBytes)}`),
    object_sha256: digest(verdictBytes),
  };
  const review: ReviewRecord = {
    ...state.review,
    verdict_objects: [...state.review.verdict_objects, object],
    consistency_receipt: input.readReceipt,
  };
  await validateProductRecord("Review", review);
  return mutateReview({
    state,
    scenario: "product_review_consistency_record",
    scenarioInput: {
      review_ref: state.review.id, read_receipt: input.readReceipt, verdict: input.verdict,
      explanation: input.explanation, counterexample: input.counterexample,
    },
    relativePath: reviewPath(reference, state.review.id),
    before: state.reviewBytes,
    after: canonicalBytes(review),
    result,
    resultDefinition: "Success_MutationResult",
    saveObjects: async () => {
      const saved = await saveVerdictObject(input.root, state.candidate.product_id, verdict);
      if (saved.object_sha256 !== object.object_sha256) return fail("INVALID_STATE", "Consistency verdict digest changed.");
    },
  });
}

export async function completeProductReview(input: {
  readonly root: string;
  readonly context: string;
  readonly reviewRef: string;
}): Promise<ProductReviewOutcome<ReviewStatus>> {
  const context = decodeContext(input.context);
  const reference = context.candidate_ref ?? fail("INVALID_INPUT", "Product review requires selected candidate context.");
  const state = await loadReviewState(input.root, context, reference, input.reviewRef);
  if (state.review.source_version !== state.candidate.source_version) return fail("CONFLICT", "Product review source changed.");
  if (state.review.coverage !== "pending") {
    return { context: input.context, result: statusFor(state), replayed: true, operationRef: null };
  }
  const missing = state.inventory.items.find((entry) => !state.verdicts.has(entry.item_key));
  if (missing !== undefined) return fail("PREREQUISITE_REQUIRED", "Product review still has unrecorded inventory items.");
  const consistency = state.verdicts.get("__consistency__")?.verdict;
  if (state.review.mode === "followup" && (state.review.consistency_receipt === null || consistency === undefined)) {
    return fail("PREREQUISITE_REQUIRED", "Followup review requires a fresh whole-artifact consistency verdict.");
  }
  const gap = [...state.verdicts.values()].some(({ verdict }) => verdict.verdict === "gap" || verdict.verdict === "conflict");
  const review: ReviewRecord = { ...state.review, coverage: gap ? "gaps" : "reviewed" };
  await validateProductRecord("Review", review);
  const reviewBytes = canonicalBytes(review);
  const verdicts = state.verdicts;
  const nextState: ReviewState = { ...state, review, reviewBytes, verdicts };
  return mutateReview({
    state,
    scenario: "product_review_complete",
    scenarioInput: { review_ref: state.review.id },
    relativePath: reviewPath(reference, state.review.id),
    before: state.reviewBytes,
    after: reviewBytes,
    result: statusFor(nextState),
    resultDefinition: "Success_ReviewStatus",
  });
}

async function listReviews(state: CandidateState): Promise<readonly ReviewRecord[]> {
  const relative = `products/${state.candidate.product_id}/drafts/${state.candidate.candidate_id}/reviews`;
  const path = await validateProductPath(state.root, relative, { workspaceRoots: [state.context.canonical_workspace] });
  let pathStat;
  try {
    pathStat = await lstat(path);
  } catch (error) {
    if (nodeErrorCode(error) === "ENOENT") return [];
    return fail("INVALID_STATE", "Product reviews cannot be inspected safely.");
  }
  if (pathStat.isSymbolicLink() || !pathStat.isDirectory()) return fail("UNSAFE_PATH", "Product review collection must be a real directory.");
  const entries = await readdir(path, { withFileTypes: true });
  if (entries.length > MAX_REVIEWS) return fail("SOURCE_LIMIT", "Product review collection exceeds supported count.");
  const reviews: ReviewRecord[] = [];
  let aggregateBytes = 0;
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isFile() || !entry.name.endsWith(".yaml")) return fail("UNSAFE_PATH", "Product review collection contains unsupported entries.");
    const id = entry.name.slice(0, -5);
    if (!UUID_PATTERN.test(id)) return fail("INVALID_STATE", "Product review collection contains invalid identity.");
    const bytesValue = await readSafe(state.root, reviewPath({
      product_id: state.candidate.product_id, candidate_id: state.candidate.candidate_id,
    }, id), state.context.canonical_workspace);
    if (bytesValue === null) return fail("SOURCE_CHANGED", "Product review collection changed while inspected.");
    if (bytesValue.byteLength > MAX_SOURCE_BYTES - aggregateBytes) {
      return fail("SOURCE_LIMIT", "Product review collection exceeds supported aggregate size.");
    }
    aggregateBytes += bytesValue.byteLength;
    const review = await validateProductRecord("Review", parseJson(bytesValue, "Product review")) as ReviewRecord;
    if (review.id !== id) return fail("SOURCE_CHANGED", "Product review identity does not match retained path.");
    reviews.push(review);
  }
  return reviews;
}

function lineageArtifacts(artifact: Artifact): readonly Artifact[] {
  if (artifact === "idea") return [];
  if (artifact === "prd") return ["idea"];
  if (artifact === "technical-design") return ["prd"];
  return ["prd", "technical-design"];
}

async function checkCandidateState(state: CandidateState, requiredReview?: string): Promise<CheckResult> {
  const issues: { code: string; message: string; ref: Ref | null }[] = [];
  let selected: ReviewRecord | undefined;
  const reviews = await listReviews(state);
  if (requiredReview !== undefined) selected = reviews.find((review) => review.id === requiredReview);
  else selected = reviews.find((review) => review.source_version === state.candidate.source_version && review.coverage === "reviewed");
  if (selected === undefined || selected.source_version !== state.candidate.source_version || selected.coverage !== "reviewed") {
    issues.push({ code: "REVIEW_REQUIRED", message: "Candidate requires a fresh complete independent review.", ref: null });
  }
  const readyArtifacts = new Map(state.generation.generation.ready_artifacts.map((entry) => [entry.artifact, entry]));
  for (const artifact of lineageArtifacts(state.candidate.artifact)) {
    if (!readyArtifacts.has(artifact)) {
      issues.push({ code: "PREREQUISITE_REQUIRED", message: `Candidate requires ready ${artifact} evidence.`, ref: null });
      continue;
    }
    const pins = state.candidate.upstream_pins.filter((pin) => pin.artifact === artifact);
    if (pins.length === 0) {
      issues.push({ code: "PREREQUISITE_REQUIRED", message: `Candidate requires pinned ${artifact} evidence.`, ref: null });
      continue;
    }
    for (const pin of pins) {
      try {
        await verifySourcePin(state.root, pin);
      } catch (error) {
        if (!(error instanceof WorkflowError)) throw error;
        issues.push({ code: error.code, message: `Candidate ${artifact} evidence is unavailable.`, ref: null });
      }
    }
  }
  return {
    status: issues.length === 0 ? "pass" : "fail",
    source_version: state.candidate.source_version,
    issues,
    semantic_correctness_proven: false,
    user_consent_authenticated: false,
    coverage_status: selected === undefined
      ? null
      : selected.source_version === state.candidate.source_version ? selected.coverage : "stale",
    review_ref: selected?.id ?? null,
  };
}

export async function checkProductCandidate(input: {
  readonly root: string;
  readonly context: string;
  readonly candidateRef: CandidateRef;
}): Promise<ProductReviewOutcome<CheckResult>> {
  const context = decodeContext(input.context);
  const state = await loadCandidate(input.root, context, input.candidateRef);
  return { context: input.context, result: await checkCandidateState(state), replayed: false, operationRef: null };
}

function candidateWithoutVersion(candidate: CandidateRecord): Omit<CandidateRecord, "source_version"> {
  return Object.fromEntries(Object.entries(candidate).filter(([key]) => key !== "source_version")) as unknown as Omit<CandidateRecord, "source_version">;
}

function candidateVersion(candidate: Omit<CandidateRecord, "source_version">): string {
  return digest(canonicalBytes(candidate));
}

export async function activateAmendment(input: {
  readonly root: string;
  readonly context: string;
  readonly candidates: readonly CandidateRef[];
  readonly reviewRefs: readonly string[];
}): Promise<ProductReviewOutcome<MutationResult>> {
  const context = decodeContext(input.context);
  if (input.candidates.length === 0 || input.candidates.length > 4 || input.candidates.length !== input.reviewRefs.length) {
    return fail("INVALID_INPUT", "Activation requires one review for each of one to four candidates.");
  }
  const selectedId = context.candidate_ref?.candidate_id;
  if (selectedId === undefined || !input.candidates.some((reference) => reference.candidate_id === selectedId)) {
    return fail("INVALID_INPUT", "Activation context must select one activated candidate.");
  }
  const scenarioInput = { candidates: input.candidates, review_refs: input.reviewRefs };
  const id = operationId("product_amendment_activate", context.target_revision, scenarioInput);
  const intent = {
    schema_version: 1 as const,
    kind: "operation_intent" as const,
    scenario: "product_amendment_activate",
    input: scenarioInput,
  };
  try {
    const replay = await replayProductMutationResult({
      root: input.root,
      productId: context.product_id,
      operationId: id,
      scenario: "product_amendment_activate",
      intent,
    });
    return {
      context: encodeHeadContext(context, replay.revision),
      result: replay.result as MutationResult,
      replayed: true,
      operationRef: replay.operationRef,
    };
  } catch (error) {
    if (!(error instanceof WorkflowError && error.code === "NOT_FOUND")) throw error;
  }
  const states: CandidateState[] = [];
  for (const reference of input.candidates) {
    states.push(await loadCandidate(input.root, context, reference, reference.candidate_id === selectedId));
  }
  const base = states[0]!.candidate.base_generation;
  if (base === null || base !== context.target_revision || states.some((state) => state.candidate.base_generation !== base)) {
    return fail("CONFLICT", "Activated candidates do not share current base generation.");
  }
  const artifacts = new Set<Artifact>();
  const registrySha = states[0]!.candidate.registry.object_sha256;
  const decisions = canonicalValue(states[0]!.candidate.decision_heads);
  const relations = canonicalValue(states[0]!.candidate.relations);
  for (let index = 0; index < states.length; index += 1) {
    const state = states[index]!;
    if (artifacts.has(state.candidate.artifact)) return fail("INVALID_INPUT", "Activation cannot publish two candidates for one artifact.");
    artifacts.add(state.candidate.artifact);
    if (
      state.candidate.registry.object_sha256 !== registrySha
      || canonicalValue(state.candidate.decision_heads) !== decisions
      || canonicalValue(state.candidate.relations) !== relations
    ) return fail("PREREQUISITE_REQUIRED", "Joint activation requires one coherent candidate snapshot.");
    const check = await checkCandidateState(state, input.reviewRefs[index]);
    if (check.status !== "pass") {
      const code = check.issues.some((issue) => issue.code === "REVIEW_REQUIRED") ? "REVIEW_REQUIRED" : "PREREQUISITE_REQUIRED";
      return fail(code, "Candidate is not ready for activation.");
    }
  }
  const baseGeneration = states[0]!.generation.generation;
  const ready = baseGeneration.ready_artifacts.filter((entry) => !artifacts.has(entry.artifact));
  states.forEach((state, index) => ready.push({
    artifact: state.candidate.artifact,
    source_version: state.candidate.source_version,
    review_id: input.reviewRefs[index]!,
    upstream_pins: state.candidate.upstream_pins,
  }));
  ready.sort((left, right) => ARTIFACTS.indexOf(left.artifact) - ARTIFACTS.indexOf(right.artifact));
  const generation = {
    schema_version: 1 as const,
    kind: "generation" as const,
    product_id: context.product_id,
    parent: base,
    registry: states[0]!.candidate.registry,
    ready_artifacts: ready,
    decision_heads: states[0]!.candidate.decision_heads,
    relations: states[0]!.candidate.relations,
  };
  await validateProductRecord("Generation", generation);
  const nextRevision = digest(canonicalBytes(generation));
  const changes = states.map((state) => {
    const withoutVersion = { ...candidateWithoutVersion(state.candidate), state: "activated" as const };
    const candidate: CandidateRecord = { ...withoutVersion, source_version: candidateVersion(withoutVersion) };
    return { state, candidate, after: canonicalBytes(candidate) };
  });
  const result = mutationResult(
    id,
    changes[0]!.candidate,
    input.reviewRefs.length === 1 ? input.reviewRefs[0]! : null,
    "Activation published one coherent product generation.",
  );
  const savedGeneration = await saveGeneration(input.root, generation);
  if (savedGeneration.sha256 !== nextRevision) {
    return fail("INVALID_STATE", "Activated generation digest changed.");
  }
  const outcome = await runProductMutation({
    root: input.root,
    productId: context.product_id,
    operationId: id,
    sessionId: randomUUID(),
    scenario: "product_amendment_activate",
    expectedRevision: base,
    nextRevision,
    intent,
    result,
    targets: changes.map(({ state, after }) => ({
      root: "store" as const,
      binding_id: null,
      relative_path: candidatePath({ product_id: state.candidate.product_id, candidate_id: state.candidate.candidate_id }),
      before: digest(state.candidateBytes),
      after: digest(after),
    })),
    saveLocalBinding: async () => {
      for (const change of changes) {
        await applyChange(
          input.root,
          candidatePath({ product_id: change.state.candidate.product_id, candidate_id: change.state.candidate.candidate_id }),
          change.state.candidateBytes,
          change.after,
          context.canonical_workspace,
        );
      }
    },
    verifyTargets: async () => {
      for (const change of changes) {
        await verifyChange(
          input.root,
          candidatePath({ product_id: change.state.candidate.product_id, candidate_id: change.state.candidate.candidate_id }),
          change.after,
          context.canonical_workspace,
        );
      }
    },
  });
  return {
    context: encodeHeadContext(context, nextRevision),
    result: outcome.result as MutationResult,
    replayed: outcome.replayed,
    operationRef: outcome.operationRef,
  };
}
