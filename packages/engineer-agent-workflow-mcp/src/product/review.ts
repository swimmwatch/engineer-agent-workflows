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
import { buildSemanticBlocks, semanticBlockText, validateSemanticBlocks } from "./review-blocks.js";
import type { SemanticBlock } from "./review-blocks.js";
import {
  loadGeneration,
  readObject,
  readGenerationMetadata,
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
type ReviewMode = "full" | "followup" | "recheck";

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

interface VerdictIndexEntry extends RecordObject {
  readonly item_key: string;
  readonly verdict: Verdict["verdict"];
  readonly bytes: number;
}

interface ReviewRecord {
  readonly schema_version: 1 | 2;
  readonly kind: "review";
  readonly id: string;
  readonly candidate_ref: CandidateRef;
  readonly source_version: string;
  readonly mode: ReviewMode;
  readonly parent: string | null;
  readonly coverage: Exclude<Coverage, "stale">;
  readonly inventory_sha256: string;
  readonly verdict_objects?: readonly RecordObject[];
  readonly verdict_index?: readonly VerdictIndexEntry[];
  readonly consistency_receipt: string | null;
  readonly scope_expansions?: readonly { readonly item_keys: readonly string[]; readonly reason: string }[];
}

interface InventoryItem {
  readonly item_key: string;
  readonly text: string;
  readonly text_sha256: string;
  readonly refs: readonly Ref[];
  readonly sources?: readonly Parameters<typeof readObject>[1][];
}

interface ReviewInventory {
  readonly schema_version: 1;
  readonly kind: "review_inventory";
  readonly candidate_ref: CandidateRef;
  readonly source_version: string;
  readonly items: readonly InventoryItem[];
  readonly consistency_text: string;
  readonly blocks?: readonly SemanticBlock[];
  readonly recheck_basis?: CandidateRecord;
  readonly recheck_impact?: RecheckImpact;
}

interface RecheckImpact {
  readonly parent_review_ref: string;
  readonly pending_keys: readonly string[];
  readonly changes: readonly { readonly atom_key: string; readonly change: "added" | "changed" | "removed" }[];
}

interface ReviewStatus {
  readonly review_ref: string;
  readonly source_version: string;
  readonly current_source_version: string;
  readonly coverage_status: Coverage;
  readonly total_items: number;
  readonly recorded_items: number;
  readonly next_item_index: number | null;
  readonly inventory_contract: "atomic-v1" | "semantic-v2";
  readonly source_atoms: number;
  readonly recheck?: {
    readonly parent_review_ref: string;
    readonly pending_items: number;
    readonly inherited_items: number;
    readonly changed_atoms: number;
    readonly removed_atoms: number;
  };
}

type ReviewRepresentation = "explicit-v1";

interface ReviewPortion {
  readonly review_ref: string;
  readonly source_version: string;
  readonly item_key: string;
  readonly text: string;
  readonly complete: boolean;
  readonly next_cursor: string | null;
  readonly read_receipt: string | null;
  readonly recorded_result: Verdict | null;
  readonly representation?: ReviewRepresentation;
  readonly verdict_object_sha256?: string | null;
  readonly object_sha256?: string | null;
  readonly verdict_digest_domain?: "canonical-verdict-json-utf8-newline";
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
  readonly generation: Pick<LoadedGeneration, "generation">;
  readonly sourceChecks?: Map<string, () => Promise<unknown>>;
}

interface SavedVerdict {
  readonly verdict?: Verdict;
  readonly object: RecordObject;
  readonly kind: Verdict["verdict"];
  readonly bytes: number;
}

interface ReviewState extends CandidateState {
  readonly review: ReviewRecord;
  readonly reviewBytes: Buffer;
  readonly inventory: ReviewInventory;
  readonly retainedSources: ReadonlyMap<string, InventoryItem["sources"]>;
  readonly verdicts: Map<string, SavedVerdict>;
  readonly sourceChecks?: Map<string, () => Promise<unknown>>;
}

// Process-local audit evidence is bounded and never survives a server restart.
const auditedReviews = new Set<string>();
const auditedSourceIndexes = new Map<string, ReadonlyMap<string, InventoryItem["sources"]>>();
const MAX_AUDITED_REVIEWS = 128;
const inventoryViews = new WeakMap<ReviewInventory, readonly InventoryItem[]>();

function reviewItems(inventory: ReviewInventory): readonly InventoryItem[] {
  if (inventory.blocks === undefined) return inventory.items;
  const cached = inventoryViews.get(inventory);
  if (cached !== undefined) return cached;
  const atoms = new Map(inventory.items.map((entry) => [entry.item_key, entry]));
  // Materialize only a requested block, not every expanded shared context.
  const items = inventory.blocks.map((block) => ({
    item_key: block.item_key,
    get text() { return semanticBlockText(inventory.items, block, atoms); },
    get text_sha256() { return digest(semanticBlockText(inventory.items, block, atoms)); },
    get refs() { return [...block.primary_atoms, ...block.related_atoms].flatMap((key) => atoms.get(key)!.refs); },
    get sources() { return [...block.primary_atoms, ...block.related_atoms].flatMap((key) => atoms.get(key)!.sources ?? []); },
  }));
  inventoryViews.set(inventory, items);
  return items;
}

function requireSavedVerdict(saved: SavedVerdict): Verdict {
  return saved.verdict ?? fail("INVALID_STATE", "This operation requires an audited verdict body.");
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
  staged = false,
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
  const generation = staged
    ? { generation: await readGenerationMetadata(root, candidate.product_id, candidate.base_generation) }
    : await loadGeneration(root, candidate.product_id, candidate.base_generation);
  const registryBytes = await readObject(root, {
    productId: candidate.product_id, kind: "record", sha256: candidate.registry.object_sha256,
  });
  const registry = await validateProductRecord("Registry", parseJson(registryBytes, "Product registry")) as RegistryRecord;
  if (registry.product_id !== candidate.product_id || candidate.registry.id.length === 0) {
    return fail("SOURCE_CHANGED", "Product registry identity does not match candidate.");
  }
  return { root, context, candidate, candidateBytes, registry, generation };
}

function item(reference: string, text: string, refs: readonly Ref[] = [], sources?: InventoryItem["sources"]): InventoryItem {
  return { item_key: reference, text, text_sha256: digest(text), refs: [...refs].sort((a, b) => refKey(a).localeCompare(refKey(b))),
    ...(sources === undefined ? {} : { sources }) };
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
  const assertKnownRef = (reference: Ref): void => {
    if (reference.product_id !== state.candidate.product_id || !metadataByRef.has(refKey(reference))) {
      fail("BROKEN_REFERENCE", "Review evidence references an unknown product element.");
    }
  };
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
          [{ productId: state.candidate.product_id, kind: "markdown", sha256: document.object_sha256 }],
        ));
      }
    }
    if (document.artifact === state.candidate.artifact) {
      const prose = proseOutsideElements(parsed.source, parsed.elements);
      if (prose.length > 0) append(item(`document:${document.id}:prose`, prose, [],
        [{ productId: state.candidate.product_id, kind: "markdown", sha256: document.object_sha256 }]));
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
    const decision = await validateProductRecord("Decision", parseJson(decisionBytes, "Product decision")) as DecisionRecord;
    const affected = decision.affected_refs;
    affected.forEach(assertKnownRef);
    append(item(
      `decision:${head.decision_ref.artifact}:${head.decision_ref.id}:${head.decision_ref.revision}`,
      new TextDecoder().decode(decisionBytes),
      affected,
      [{ productId: state.candidate.product_id, kind: "decision", sha256: head.object_sha256,
        artifact: head.decision_ref.artifact, decisionId: head.decision_ref.id, revision: head.decision_ref.revision }],
    ));
  }
  for (const relation of state.candidate.relations) {
    assertKnownRef(relation.from);
    assertKnownRef(relation.to);
    if (relation.from.artifact === state.candidate.artifact || relation.to.artifact === state.candidate.artifact) {
      append(item(
        `relation:${digest(canonicalValue(relation))}`,
        canonicalValue(relation),
        [relation.from, relation.to],
      ));
    }
  }
  for (const [index, pin] of state.candidate.upstream_pins.entries()) {
    await verifySourcePin(state.root, pin);
    const refs = pin.element_ids.map((elementId) => ({
      product_id: pin.product_id, artifact: pin.artifact, element_id: elementId,
    }));
    append(item(`upstream:${String(index).padStart(4, "0")}:${pin.artifact}`, canonicalValue(pin), refs));
  }
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
  if (inventory.blocks !== undefined) {
    if (!Array.isArray(inventory.blocks)) return fail("INVALID_STATE", "Semantic inventory blocks are invalid.");
    validateSemanticBlocks(rawItems as InventoryItem[], inventory.blocks as SemanticBlock[]);
  }
  return value as ReviewInventory;
}

async function loadVerdicts(
  root: string,
  productId: string,
  review: ReviewRecord,
  full = true,
): Promise<Map<string, SavedVerdict>> {
  const result = new Map<string, SavedVerdict>();
  let aggregateBytes = 0;
  if (review.schema_version === 2) {
    for (const entry of review.verdict_index ?? []) {
      if (result.has(entry.item_key)) return fail("INVALID_STATE", "Review index contains duplicate item keys.");
      aggregateBytes += entry.bytes;
      if (aggregateBytes > MAX_SOURCE_BYTES) return fail("SOURCE_LIMIT", "Product review verdicts exceed supported aggregate size.");
      result.set(entry.item_key, { object: { id: entry.id, object_sha256: entry.object_sha256 }, kind: entry.verdict, bytes: entry.bytes });
    }
    if (!full) return result;
    for (const [key, saved] of result) result.set(key, await readIndexedVerdict(root, productId, key, saved));
    return result;
  }
  for (const object of review.verdict_objects ?? []) {
    const value = await readObject(root, { productId, kind: "record", sha256: object.object_sha256 });
    if (value.byteLength > MAX_SOURCE_BYTES - aggregateBytes) {
      return fail("SOURCE_LIMIT", "Product review verdicts exceed supported aggregate size.");
    }
    aggregateBytes += value.byteLength;
    const verdict = await validateProductRecord("Verdict", parseJson(value, "Product review verdict")) as Verdict;
    if (result.has(verdict.item_key)) return fail("INVALID_STATE", "Product review contains duplicate verdicts.");
    result.set(verdict.item_key, { verdict, object, kind: verdict.verdict, bytes: value.byteLength });
  }
  return result;
}

async function readIndexedVerdict(root: string, productId: string, key: string, saved: SavedVerdict): Promise<SavedVerdict> {
  const value = await readObject(root, { productId, kind: "record", sha256: saved.object.object_sha256 });
  const verdict = await validateProductRecord("Verdict", parseJson(value, "Product review verdict")) as Verdict;
  if (verdict.item_key !== key || verdict.verdict !== saved.kind || value.byteLength !== saved.bytes) {
    return fail("SOURCE_CHANGED", "Review index does not match retained verdict evidence.");
  }
  return { ...saved, verdict };
}

async function loadUsedVerdict(state: ReviewState, key: string): Promise<SavedVerdict | undefined> {
  const saved = state.verdicts.get(key);
  if (saved === undefined) return undefined;
  const loaded = await readIndexedVerdict(state.root, state.candidate.product_id, key, saved);
  state.verdicts.set(key, loaded);
  return loaded;
}

function indexedReview(state: ReviewState, additions: readonly Verdict[] = []): ReviewRecord {
  const entries = new Map([...state.verdicts].map(([key, saved]) => [key, {
    item_key: key, ...saved.object, verdict: saved.kind, bytes: saved.bytes,
  }]));
  for (const verdict of additions) {
    const value = canonicalBytes(verdict);
    const sha256 = digest(value);
    entries.set(verdict.item_key, { item_key: verdict.item_key,
      id: deterministicUuid(`${state.candidate.product_id}:${verdict.item_key}:${sha256}`),
      object_sha256: sha256, verdict: verdict.verdict, bytes: value.byteLength });
  }
  if ([...entries.values()].reduce((sum, entry) => sum + entry.bytes, 0) > MAX_SOURCE_BYTES) {
    return fail("SOURCE_LIMIT", "Product review verdicts exceed supported aggregate size.");
  }
  const next = { ...state.review, schema_version: 2 as const, verdict_index: [...entries.values()].sort((a, b) => a.item_key.localeCompare(b.item_key)) };
  delete next.verdict_objects;
  return next;
}

async function loadReviewState(
  root: string,
  context: ProductContext,
  reference: CandidateRef,
  reviewId: string,
  requireSelected = true,
  full = false,
  ancestors: readonly string[] = [],
): Promise<ReviewState> {
  if (ancestors.includes(reviewId) || ancestors.length >= 128) return fail("INVALID_STATE", "Review inheritance history is cyclic or exceeds its supported depth.");
  let candidate = await loadCandidate(root, context, reference, requireSelected, true);
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
  let inventory = validateInventory(parseJson(inventoryBytes, "Product review inventory"), review);
  const retainedSources = new Map(inventory.items.map((entry) => [entry.item_key, entry.sources]));
  const auditKey = `${root}:${reference.product_id}:${review.id}:${candidate.candidate.source_version}:${review.inventory_sha256}`;
  const audit = full || review.mode === "recheck" || review.schema_version === 1 || !auditedReviews.has(auditKey);
  let sourceIndex: ReadonlyMap<string, InventoryItem["sources"]> | undefined;
  if (audit) {
    candidate = await loadCandidate(root, context, reference, requireSelected);
    if (review.source_version === candidate.candidate.source_version) {
      const actualInventory = await buildInventory(candidate);
      const withoutSources = (entries: readonly InventoryItem[]) => entries.map((entry) => ({
        item_key: entry.item_key, text: entry.text, text_sha256: entry.text_sha256, refs: entry.refs,
      }));
      if (canonicalValue(withoutSources(actualInventory.items)) !== canonicalValue(withoutSources(inventory.items))
        || actualInventory.consistency_text !== inventory.consistency_text) {
        return fail("SOURCE_CHANGED", "Frozen review inventory does not match retained candidate sources.");
      }
      if (inventory.blocks !== undefined && canonicalValue(actualInventory.items) !== canonicalValue(inventory.items)) {
        return fail("SOURCE_CHANGED", "Semantic source provenance does not match retained candidate sources.");
      }
      sourceIndex = new Map(actualInventory.items.map((entry) => [entry.item_key, entry.sources]));
    }
  }
  if (inventory.blocks === undefined) {
    const sources = sourceIndex ?? auditedSourceIndexes.get(auditKey);
    if (sources !== undefined) inventory = { ...inventory, items: inventory.items.map((entry) => {
      const origins = sources.get(entry.item_key);
      return origins === undefined ? entry : { ...entry, sources: origins };
    }) };
  }
  const verdicts = await loadVerdicts(root, reference.product_id, review, audit);
  const keys = new Set(reviewItems(inventory).map((entry) => entry.item_key));
  for (const key of verdicts.keys()) {
    if (key !== "__consistency__" && !keys.has(key)) return fail("INVALID_STATE", "Review contains a verdict outside its inventory.");
  }
  if (audit) {
    const entries = new Map(reviewItems(inventory).map((entry) => [entry.item_key, entry]));
    const auditState = { ...candidate, review, reviewBytes, inventory, retainedSources, verdicts };
    let recheckParent: ReviewState | undefined;
    if (review.mode === "recheck") {
      if (review.parent === null || inventory.recheck_impact === undefined) return fail("SOURCE_CHANGED", "Recheck parent or impact evidence is missing.");
      recheckParent = await loadReviewState(root, context, reference, review.parent, requireSelected, true, [...ancestors, reviewId]);
      assertSuccessfulParent(recheckParent);
      const prior = await recheckBasis(recheckParent);
      await verifyParentEvidence(recheckParent, prior);
      const historical = await recheckBasis(auditState);
      const impact = await deriveRecheckImpact(recheckParent, prior, historical, inventory);
      if (canonicalValue(impact) !== canonicalValue(inventory.recheck_impact)) return fail("SOURCE_CHANGED", "Recheck impact differs from retained source evidence.");
      const keys = new Set(reviewItems(inventory).map((entry) => entry.item_key));
      if ((review.scope_expansions ?? []).some((entry) => entry.item_keys.some((key) => !keys.has(key)))) {
        return fail("SOURCE_CHANGED", "Recheck expansion references an obsolete block.");
      }
    }
    for (const [key, saved] of verdicts) {
      const verdict = requireSavedVerdict(saved);
      if (verdict.inherited_from !== null) {
        if (!(["followup", "recheck"] as ReviewMode[]).includes(review.mode) || verdict.inherited_from !== review.parent || key === "__consistency__") {
          return fail("SOURCE_CHANGED", "Retained verdict has invalid inherited provenance.");
        }
        if (recheckParent !== undefined) {
          const original = recheckParent.verdicts.get(key);
          if (requiredRecheckKeys(auditState).has(key) || original === undefined
            || canonicalValue(inheritedVerdict(requireSavedVerdict(original), review.parent)) !== canonicalValue(verdict)) {
            return fail("SOURCE_CHANGED", "Recheck inherited verdict is ineligible or differs from parent attribution.");
          }
        }
      } else {
        if (!validReviewReceipt(auditState, key, verdict.read_receipt, key === "__consistency__" ? undefined : entries.get(key)!)) {
          return fail("SOURCE_CHANGED", "Retained verdict does not match its source read receipt.");
        }
      }
    }
    if ((review.consistency_receipt !== null || verdicts.has("__consistency__"))
      && review.consistency_receipt !== verdicts.get("__consistency__")?.verdict?.read_receipt) {
      return fail("SOURCE_CHANGED", "Review consistency receipt does not match retained evidence.");
    }
  }
  const after = await readSafe(root, reviewPath(reference, reviewId), context.canonical_workspace);
  if (after === null || !after.equals(reviewBytes)) return fail("CONFLICT", "Product review changed during inspection.");
  const candidateAfter = await readSafe(root, candidatePath(reference), context.canonical_workspace);
  if (candidateAfter === null || !candidateAfter.equals(candidate.candidateBytes)) {
    return fail("CONFLICT", "Product candidate changed during review inspection.");
  }
  if (audit) {
    if (auditedReviews.size >= MAX_AUDITED_REVIEWS) {
      auditedReviews.clear();
      auditedSourceIndexes.clear();
    }
    if (sourceIndex !== undefined) auditedSourceIndexes.set(auditKey, sourceIndex);
    auditedReviews.add(auditKey);
  }
  const sourceChecks = new Map<string, () => Promise<unknown>>();
  if (review.mode === "recheck") sourceChecks.set("recheck-history", async () => {
    await loadReviewState(root, context, reference, reviewId, requireSelected, true);
  });
  return { ...candidate, review, reviewBytes, inventory, retainedSources, verdicts, sourceChecks };
}

function statusFor(state: ReviewState): ReviewStatus {
  const stale = state.review.source_version !== state.candidate.source_version;
  const items = reviewItems(state.inventory);
  const recorded = items.filter((entry) => state.verdicts.has(entry.item_key)).length;
  const nextIndex = stale || state.review.coverage !== "pending"
    ? null
    : items.findIndex((entry) => !state.verdicts.has(entry.item_key));
  return {
    review_ref: state.review.id,
    source_version: state.review.source_version,
    current_source_version: state.candidate.source_version,
    coverage_status: stale ? "stale" : state.review.coverage,
    total_items: items.length,
    recorded_items: recorded,
    next_item_index: nextIndex === null || nextIndex < 0 ? null : nextIndex,
    inventory_contract: state.inventory.blocks === undefined ? "atomic-v1" : "semantic-v2",
    source_atoms: state.inventory.items.length,
    ...(state.review.mode !== "recheck" ? {} : { recheck: {
      parent_review_ref: state.review.parent!,
      pending_items: items.filter((entry) => !state.verdicts.has(entry.item_key)).length,
      inherited_items: [...state.verdicts.values()].filter((entry) => entry.verdict?.inherited_from !== null
        && entry.verdict?.inherited_from !== undefined).length,
      changed_atoms: state.inventory.recheck_impact!.changes.filter((entry) => entry.change !== "removed").length,
      removed_atoms: state.inventory.recheck_impact!.changes.filter((entry) => entry.change === "removed").length,
    } }),
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
  const verifyCandidate = async (): Promise<void> => {
    const current = await readSafe(input.state.root, candidatePath({
      product_id: input.state.candidate.product_id, candidate_id: input.state.candidate.candidate_id,
    }), input.state.context.canonical_workspace);
    if (current === null || !current.equals(input.state.candidateBytes)) {
      fail("CONFLICT", "Product candidate changed before review mutation.");
    }
    if ("sourceChecks" in input.state) {
      for (const check of (input.state as ReviewState).sourceChecks?.values() ?? []) await check();
    }
  };
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
    ...(["product_review_record", "product_review_record_batch", "product_review_consistency_record"].includes(input.scenario)
      ? { verifyReviewSources: verifyCandidate } : {}),
    targets: [{
      root: "store",
      binding_id: null,
      relative_path: input.relativePath,
      before: input.before === null ? null : digest(input.before),
      after: digest(input.after),
    }],
    ...(input.saveObjects === undefined ? {} : { saveObjects: async () => input.saveObjects!() }),
    saveLocalBinding: async () => {
      await verifyCandidate();
      await applyChange(input.state.root, input.relativePath, input.before, input.after, input.state.context.canonical_workspace);
    },
    verifyTargets: async () => {
      await verifyCandidate();
      await verifyChange(input.state.root, input.relativePath, input.after, input.state.context.canonical_workspace);
    },
  });
  return {
    context: encodeContext(input.state.context, input.state.candidate),
    result: outcome.result as T,
    replayed: outcome.replayed,
    operationRef: outcome.operationRef,
  };
}

function inventoryDiff(parent: ReviewInventory, current: ReviewInventory): readonly InventoryItem[] {
  const parentItems = new Map(reviewItems(parent).map((entry) => [entry.item_key, entry]));
  const currentItems = new Map(reviewItems(current).map((entry) => [entry.item_key, entry]));
  const keys = new Set([...parentItems.keys(), ...currentItems.keys()]);
  const changed: InventoryItem[] = [];
  for (const key of keys) {
    const before = parentItems.get(key);
    const after = currentItems.get(key);
    if (before?.text_sha256 !== after?.text_sha256) changed.push(after ?? before!);
  }
  return changed;
}

function fullReviewRequired(reason: string): never {
  return fail("PREREQUISITE_REQUIRED", `${reason} Start a full independent review of intact current inputs.`);
}

/** Reconstruct historical membership from retained inputs, never from current hydration. */
async function recheckBasis(state: ReviewState): Promise<CandidateState> {
  if (state.inventory.recheck_basis === undefined || state.inventory.blocks === undefined) {
    return fullReviewRequired("Parent review lacks compatible retained inheritance inputs.");
  }
  const candidate = await validateProductRecord("Candidate", state.inventory.recheck_basis);
  if (candidate.product_id !== state.review.candidate_ref.product_id
    || candidate.candidate_id !== state.review.candidate_ref.candidate_id
    || candidate.source_version !== state.review.source_version || candidate.base_generation === null) {
    return fail("SOURCE_CHANGED", "Retained inheritance candidate does not match its review.");
  }
  const registry = await validateProductRecord("Registry", parseJson(await readObject(state.root, {
    productId: candidate.product_id, kind: "record", sha256: candidate.registry.object_sha256,
  }), "Retained review registry")) as RegistryRecord;
  if (registry.product_id !== candidate.product_id) return fail("SOURCE_CHANGED", "Retained review registry identity changed.");
  const historical: CandidateState = { ...state, candidate, registry,
    candidateBytes: canonicalBytes(candidate), generation: await loadGeneration(state.root, candidate.product_id, candidate.base_generation) };
  const actual = await buildInventory(historical);
  if (canonicalValue(actual.items) !== canonicalValue(state.inventory.items)
    || actual.consistency_text !== state.inventory.consistency_text) {
    return fail("SOURCE_CHANGED", "Retained inheritance inventory does not match historical inputs.");
  }
  return historical;
}

function atomMetadata(state: CandidateState, atom: InventoryItem): string {
  const documents = state.registry.documents.filter((document) => (atom.sources ?? []).some((source) =>
    source.kind === "markdown" && source.sha256 === document.object_sha256))
    .map(({ object_sha256: ignoredDigest, ...document }) => { void ignoredDigest; return document; });
  const metadata = atom.refs.map((reference) => state.registry.element_metadata.find((entry) => refKey(entry.ref) === refKey(reference))
    ?? fail("BROKEN_REFERENCE", "Inheritance metadata is missing a referenced element."));
  return canonicalValue({ documents, metadata });
}

function originalInputs(inventory: ReviewInventory): string {
  return canonicalValue(inventory.items.filter((atom) => {
    if (atom.item_key === "scope") return true;
    if (!atom.item_key.startsWith("decision:")) return false;
    const decision = parseJson(Buffer.from(atom.text), "Retained review decision") as DecisionRecord;
    return decision.category === "instruction" || decision.category === "scope"
      || ["answered", "needs_user", "no_answer"].includes(decision.state);
  }));
}

/** Compare immutable evidence for every reached source participant, not just graph edges. */
async function dependencyEvidence(state: CandidateState, seed: {
  readonly refs: readonly Ref[]; readonly artifact: Artifact; readonly wholeRegistry: boolean;
}, requireMembership = false): Promise<string> {
  if (seed.refs.some((reference) => reference.product_id !== state.candidate.product_id)) {
    return fullReviewRequired("Reviewer dependency belongs to an untracked product.");
  }
  const references = new Set(seed.refs.map(refKey));
  const heads = new Map([...state.generation.generation.decision_heads, ...state.candidate.decision_heads]
    .map((head) => [`${head.decision_ref.artifact}:${head.decision_ref.id}`, head]));
  const decisions = await Promise.all([...heads].map(async ([key, head]) => {
    const value = await readObject(state.root, { productId: state.candidate.product_id, kind: "decision", sha256: head.object_sha256,
      artifact: head.decision_ref.artifact, decisionId: head.decision_ref.id, revision: head.decision_ref.revision });
    const decision = await validateProductRecord("Decision", parseJson(value, "Reviewer dependency decision")) as DecisionRecord;
    if (canonicalValue(decision.ref) !== canonicalValue(head.decision_ref)) return fail("SOURCE_CHANGED", "Reviewer dependency decision identity changed.");
    return { key, head, decision };
  }));
  const neededDecisions = new Set(decisions.filter((entry) => seed.wholeRegistry || entry.head.decision_ref.artifact === seed.artifact)
    .map((entry) => entry.key));
  let expanded = true;
  while (expanded) {
    expanded = false;
    const include = (reference: Ref): void => {
      if (reference.product_id !== state.candidate.product_id) return fullReviewRequired("Reviewer dependency belongs to an untracked product.");
      if (!references.has(refKey(reference))) { references.add(refKey(reference)); expanded = true; }
    };
    for (const entry of state.registry.element_metadata) {
      if (!references.has(refKey(entry.ref))) continue;
      entry.applicability.stage_refs.forEach(include);
      for (const provenance of entry.provenance) {
        const key = `${provenance.artifact}:${provenance.id}`;
        if (requireMembership && !decisions.some((value) => canonicalValue(value.decision.ref) === canonicalValue(provenance))) {
          return fullReviewRequired("Reviewer dependency provenance lacks retained decision evidence.");
        }
        if (!neededDecisions.has(key)) { neededDecisions.add(key); expanded = true; }
      }
    }
    for (const relation of state.candidate.relations) {
      if (!references.has(refKey(relation.from)) && !references.has(refKey(relation.to))) continue;
      include(relation.from); include(relation.to);
    }
    for (const entry of decisions) {
      if (!neededDecisions.has(entry.key) && !entry.decision.affected_refs.some((reference) => references.has(refKey(reference)))) continue;
      if (!neededDecisions.has(entry.key)) { neededDecisions.add(entry.key); expanded = true; }
      entry.decision.affected_refs.forEach(include);
    }
    for (const dependency of state.candidate.upstream_pins) {
      if (!state.registry.element_metadata.some((entry) => entry.ref.artifact === dependency.artifact && references.has(refKey(entry.ref)))) continue;
      if (dependency.product_id !== state.candidate.product_id) return fullReviewRequired("Reviewer upstream dependency belongs to an untracked product.");
      dependency.element_ids.forEach((element_id) => include({ product_id: dependency.product_id, artifact: dependency.artifact, element_id }));
    }
  }
  const metadata = state.registry.element_metadata.filter((entry) => references.has(refKey(entry.ref)));
  if (requireMembership && metadata.length !== references.size) return fullReviewRequired("Reviewer dependency lacks retained element metadata.");
  const artifacts = new Set([seed.artifact, ...metadata.map((entry) => entry.ref.artifact)]);
  const documents = state.registry.documents.filter((document) => document.role === "semantic" && artifacts.has(document.artifact));
  const members = await Promise.all(documents.map(async (document) => {
    const source = parseProductDocument(await readObject(state.root, { productId: state.candidate.product_id, kind: "markdown", sha256: document.object_sha256 }));
    return { document, element_ids: source.elements.map((entry) => entry.id) };
  }));
  if (requireMembership && metadata.some((entry) => (entry.state === "active"
    || (!seed.wholeRegistry && seed.refs.some((reference) => refKey(reference) === refKey(entry.ref)))) && !members.some((member) =>
    member.document.artifact === entry.ref.artifact && member.element_ids.includes(entry.ref.element_id)))) {
    return fullReviewRequired("Reviewer dependency lacks retained document membership.");
  }
  return canonicalValue({ participants: [...references].sort(), metadata, members,
    relations: state.candidate.relations.filter((relation) => seed.wholeRegistry
      || references.has(refKey(relation.from)) || references.has(refKey(relation.to))),
    decisions: decisions.filter((entry) => neededDecisions.has(entry.key)),
    candidate_decisions: state.candidate.decision_heads.filter((head) => neededDecisions.has(`${head.decision_ref.artifact}:${head.decision_ref.id}`)),
    upstream: state.candidate.upstream_pins.filter((dependency) => seed.wholeRegistry || artifacts.has(dependency.artifact)),
  });
}

async function referencedEvidence(state: CandidateState, reference: Ref, requireMembership = false): Promise<string> {
  return dependencyEvidence(state, { refs: [reference], artifact: reference.artifact, wholeRegistry: false }, requireMembership);
}

async function sourcePinEvidence(state: CandidateState, pin: SourcePin, requireMembership = false): Promise<string> {
  if (pin.product_id !== state.candidate.product_id) return fullReviewRequired("Reviewer source evidence belongs to an untracked product.");
  const roots = state.registry.element_metadata.filter((entry) => pin.source_kind === "record"
    || (entry.ref.artifact === pin.artifact && (pin.element_ids.length === 0 || pin.element_ids.includes(entry.ref.element_id))));
  const refs = [...roots.map((entry) => entry.ref), ...pin.element_ids.map((element_id) => ({
    product_id: pin.product_id, artifact: pin.artifact, element_id,
  }))];
  const heads = new Map([...state.generation.generation.decision_heads, ...state.candidate.decision_heads]
    .map((head) => [`${head.decision_ref.artifact}:${head.decision_ref.id}`, head]));
  const source = pin.source_kind === "markdown"
    ? state.registry.documents.find((document) => document.id === pin.source_id) ?? null
    : pin.source_kind === "record" ? { identity: state.candidate.registry, registry: state.registry }
      : heads.get(`${pin.artifact}:${pin.source_id}`) ?? null;
  const dependency = await dependencyEvidence(state, { refs, artifact: pin.artifact, wholeRegistry: pin.source_kind === "record" }, requireMembership);
  return canonicalValue({ pin, source, dependency });
}

async function verifyRetainedSourceEvidence(state: CandidateState, pin: SourcePin): Promise<void> {
  await sourcePinEvidence(state, pin, true);
  if (pin.source_kind === "markdown") {
    const document = state.registry.documents.find((entry) => entry.id === pin.source_id);
    if (document === undefined || document.artifact !== pin.artifact || document.object_sha256 !== pin.object_sha256) {
      return fullReviewRequired("Reviewer source evidence lacks matching retained document membership.");
    }
    const source = parseProductDocument(await readObject(state.root, {
      productId: pin.product_id, kind: "markdown", sha256: pin.object_sha256,
    }));
    if (pin.element_ids.some((id) => !source.elements.some((element) => element.id === id)
      || !state.registry.element_metadata.some((entry) => entry.ref.artifact === pin.artifact
        && entry.ref.element_id === id && entry.state === "active"))) {
      return fullReviewRequired("Reviewer source evidence lacks retained active element membership.");
    }
  } else if (pin.source_kind === "record") {
    if (state.candidate.registry.id !== pin.source_id || state.candidate.registry.object_sha256 !== pin.object_sha256) {
      return fullReviewRequired("Reviewer registry evidence lacks a matching retained registry.");
    }
  } else {
    const head = [...state.candidate.decision_heads, ...state.generation.generation.decision_heads]
      .find((entry) => entry.decision_ref.artifact === pin.artifact && entry.decision_ref.id === pin.source_id);
    if (head === undefined || canonicalValue(head.decision_ref) !== canonicalValue(pin.decision_ref)
      || head.object_sha256 !== pin.object_sha256) {
      return fullReviewRequired("Reviewer decision evidence lacks a matching retained decision head.");
    }
  }
}

async function verifyParentEvidence(parent: ReviewState, prior: CandidateState, ancestors: readonly string[] = []): Promise<void> {
  if (ancestors.includes(parent.review.id) || ancestors.length >= 128) return fullReviewRequired("Historical evidence chain is cyclic or exceeds supported depth.");
  if (parent.review.mode === "followup" && [...parent.verdicts.values()].some((entry) => entry.verdict?.inherited_from !== null)) {
    if (parent.review.parent === null) return fullReviewRequired("Finding-linked inheritance has no retained parent.");
    const grand = await loadReviewState(parent.root, parent.context, parent.review.candidate_ref, parent.review.parent, true, true, [...ancestors, parent.review.id]);
    const historical = await recheckBasis(grand);
    await verifyParentEvidence(grand, historical, [...ancestors, parent.review.id]);
    const impact = await deriveRecheckImpact(grand, historical, prior, parent.inventory);
    const pending = new Set(impact.pending_keys);
    for (const [key, saved] of parent.verdicts) {
      const verdict = requireSavedVerdict(saved);
      if (verdict.inherited_from === null) continue;
      const original = grand.verdicts.get(key);
      if (pending.has(key) || original === undefined || (original.kind !== "covered" && original.kind !== "not_applicable")
        || canonicalValue(verdict) !== canonicalValue(inheritedVerdict(requireSavedVerdict(original), grand.review.id))) {
        return fullReviewRequired("Finding-linked inheritance lacks verified successful-parent eligibility.");
      }
    }
  }
  const verified = new Set<string>();
  for (const saved of parent.verdicts.values()) {
    const verdict = requireSavedVerdict(saved);
    for (const pin of verdict.evidence_sources) {
      const key = canonicalValue(pin);
      if (!verified.has(key)) {
        await verifySourcePin(parent.root, pin); await verifyRetainedSourceEvidence(prior, pin); verified.add(key);
      }
    }
    for (const reference of verdict.evidence_refs) {
      if (verified.has(refKey(reference))) continue;
      await referencedEvidence(prior, reference, true);
      verified.add(refKey(reference));
    }
  }
}

async function deriveRecheckImpact(parent: ReviewState, prior: CandidateState, current: CandidateState,
  inventory: ReviewInventory): Promise<RecheckImpact> {
  if (prior.candidate.artifact !== current.candidate.artifact
    || prior.candidate.base_generation !== current.candidate.base_generation
    || prior.candidate.workspace_id !== current.candidate.workspace_id
    || canonicalValue(prior.candidate.scope) !== canonicalValue(current.candidate.scope)
    || originalInputs(parent.inventory) !== originalInputs(inventory)) {
    return fullReviewRequired("Scope, original instructions, answers or review binding changed.");
  }
  const before = new Map(parent.inventory.items.map((atom) => [atom.item_key, atom]));
  const after = new Map(inventory.items.map((atom) => [atom.item_key, atom]));
  const changes: RecheckImpact["changes"][number][] = [];
  const affectedRefs = new Set<string>();
  let globalImpact = false;
  for (const key of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    const old = before.get(key), next = after.get(key);
    if (old !== undefined && next !== undefined && old.text_sha256 === next.text_sha256
      && canonicalValue(old.refs) === canonicalValue(next.refs)
      && atomMetadata(prior, old) === atomMetadata(current, next)) continue;
    changes.push({ atom_key: key, change: old === undefined ? "added" : next === undefined ? "removed" : "changed" });
    for (const reference of [...old?.refs ?? [], ...next?.refs ?? []]) affectedRefs.add(refKey(reference));
    if ([...old?.refs ?? [], ...next?.refs ?? []].some((reference) => [prior.registry, current.registry].some((registry) =>
      registry.element_metadata.some((metadata) => refKey(metadata.ref) === refKey(reference) && metadata.applicability.global)))) globalImpact = true;
    if (key.startsWith("document:") || key.startsWith("upstream:")) globalImpact = true;
    else if (key !== "scope" && !key.startsWith("element:") && !key.startsWith("relation:") && !key.startsWith("decision:")) {
      return fullReviewRequired("Changed evidence has uncertain semantic influence.");
    }
    if (key.startsWith("decision:") && (old?.refs.length ?? next?.refs.length ?? 0) === 0) {
      return fullReviewRequired("Changed decision evidence has no bounded impact references.");
    }
  }
  // Relationship participants and decision dependencies widen impact transitively.
  let expanded = true;
  const allAtoms = [...parent.inventory.items, ...inventory.items];
  while (expanded) {
    expanded = false;
    for (const atom of allAtoms) {
      if (!atom.item_key.startsWith("relation:") && !atom.item_key.startsWith("decision:")) continue;
      if (!atom.refs.some((reference) => affectedRefs.has(refKey(reference)))) continue;
      for (const reference of atom.refs) if (!affectedRefs.has(refKey(reference))) {
        affectedRefs.add(refKey(reference)); expanded = true;
      }
    }
  }
  const evidenceChanges = new Map<string, boolean>();
  for (const saved of parent.verdicts.values()) {
    const verdict = requireSavedVerdict(saved);
    for (const reference of verdict.evidence_refs) {
      const key = `ref:${refKey(reference)}`;
      if (!evidenceChanges.has(key)) evidenceChanges.set(key,
        await referencedEvidence(prior, reference) !== await referencedEvidence(current, reference));
    }
    for (const pin of verdict.evidence_sources) {
      const key = `pin:${canonicalValue(pin)}`;
      if (!evidenceChanges.has(key)) evidenceChanges.set(key,
        await sourcePinEvidence(prior, pin) !== await sourcePinEvidence(current, pin));
    }
  }
  const previous = new Map(reviewItems(parent.inventory).map((entry) => [entry.item_key, entry]));
  const changedKeys = new Set(changes.map((entry) => entry.atom_key));
  const pending = reviewItems(inventory).filter((entry) => {
    const old = previous.get(entry.item_key);
    const block = inventory.blocks!.find((entryBlock) => entryBlock.item_key === entry.item_key)!;
    const atoms = [...block.primary_atoms, ...block.related_atoms];
    const oldBlock = parent.inventory.blocks!.find((entryBlock) => entryBlock.item_key === entry.item_key);
    const verdict = parent.verdicts.get(entry.item_key)?.verdict;
    const extraEvidenceChanged = verdict?.evidence_refs.some((reference) => affectedRefs.has(refKey(reference))
      || evidenceChanges.get(`ref:${refKey(reference)}`))
      || verdict?.evidence_sources.some((pin) => evidenceChanges.get(`pin:${canonicalValue(pin)}`)
        || pin.element_ids.some((element_id) => affectedRefs.has(refKey({ product_id: pin.product_id, artifact: pin.artifact, element_id }))));
    return globalImpact || old === undefined || old.text_sha256 !== entry.text_sha256
      || canonicalValue(oldBlock) !== canonicalValue(block)
      || extraEvidenceChanged || atoms.some((key) => changedKeys.has(key)) || entry.refs.some((reference) => affectedRefs.has(refKey(reference)));
  }).map((entry) => entry.item_key);
  return { parent_review_ref: parent.review.id, pending_keys: pending, changes };
}

function requiredRecheckKeys(state: ReviewState): Set<string> {
  return new Set([...state.inventory.recheck_impact?.pending_keys ?? [],
    ...(state.review.scope_expansions ?? []).flatMap((entry) => entry.item_keys)]);
}

function assertSuccessfulParent(parent: ReviewState): void {
  if (parent.review.coverage !== "reviewed" || parent.review.consistency_receipt === null
    || parent.verdicts.get("__consistency__")?.kind !== "covered" || reviewItems(parent.inventory).some((entry) => !parent.verdicts.has(entry.item_key))
    || [...parent.verdicts.values()].some((entry) => entry.kind !== "covered" && entry.kind !== "not_applicable")) {
    return fullReviewRequired("Recheck requires a completed successful parent with fresh consistency and full coverage.");
  }
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

function explicitSourceEvidence(state: ReviewState, entry: InventoryItem, includeText = true): Record<string, unknown> {
  const block = state.inventory.blocks?.find((value) => value.item_key === entry.item_key);
  const keys = new Set(block === undefined ? [entry.item_key] : [...block.primary_atoms, ...block.related_atoms]);
  // Current-candidate hydration is useful for verification, but is not frozen provenance.
  const sources = [...keys].flatMap((key) => state.retainedSources.get(key) ?? []);
  const unique = new Map(sources.map((source) => [canonicalValue(source), source]));
  const pins = state.inventory.items.filter((atom) => keys.has(atom.item_key) && atom.item_key.startsWith("upstream:"))
    .map((atom) => parseJson(Buffer.from(atom.text), "Review source pin") as SourcePin);
  return {
    source_version: {
      domain: "candidate-version",
      identity: state.review.candidate_ref,
      source_version_sha256: state.review.source_version,
    },
    source_content: {
      domain: "review-item-text-utf8",
      identity: { item_key: entry.item_key },
      source_content_sha256: digest(entry.text),
      canonicalization: "Exact review-item UTF-8 text, without an added newline.",
      ...(includeText ? { text: entry.text } : {}),
    },
    source_pins: pins.map((pin) => ({
      domain: "immutable-object-bytes",
      identity: { product_id: pin.product_id, artifact: pin.artifact, source_kind: pin.source_kind,
        source_id: pin.source_id, generation: pin.generation, decision_ref: pin.decision_ref },
      source_object_sha256: pin.object_sha256,
      canonicalization: "Exact bytes identified by the retained upstream pin; no verdict substitution.",
    })),
    source_objects_status: [...keys].some((key) => state.retainedSources.get(key) !== undefined)
      ? "retained-inventory" : state.inventory.blocks === undefined ? "unavailable-in-legacy-inventory" : "no-source-objects",
    source_objects: [...unique.values()].map((source) => ({
      domain: "immutable-object-bytes",
      identity: {
        product_id: source.productId,
        kind: source.kind,
        ...(source.artifact === undefined ? {} : { artifact: source.artifact }),
        ...(source.decisionId === undefined ? {} : { decision_id: source.decisionId }),
        ...(source.revision === undefined ? {} : { revision: source.revision }),
      },
      source_object_sha256: source.sha256,
      canonicalization: "Exact immutable stored bytes; no reserialization.",
    })),
  };
}

function reviewText(state: ReviewState, entry: InventoryItem, representation?: ReviewRepresentation): string {
  if (representation !== undefined && representation !== "explicit-v1") {
    return fail("INVALID_INPUT", "Unsupported review representation; omit it for legacy or use explicit-v1.");
  }
  return representation === undefined ? entry.text : canonicalValue(explicitSourceEvidence(state, entry));
}

function validReviewReceipt(state: ReviewState, itemKey: string, value: string, entry?: InventoryItem): boolean {
  const legacy = entry === undefined ? consistencyText(state) : entry.text;
  if (value === receipt(state.review.id, state.review.source_version, itemKey, legacy)) return true;
  const explicit = entry === undefined ? consistencyText(state, "explicit-v1") : reviewText(state, entry, "explicit-v1");
  return value === receipt(state.review.id, state.review.source_version, itemKey, explicit);
}

function portion(
  state: ReviewState,
  itemKey: string,
  text: string,
  nextItemIndex: number | null,
  cursorValue?: string,
  maxPoints = PORTION_CODE_POINTS,
  representation?: ReviewRepresentation,
): ReviewPortion {
  const cursorKey = representation === undefined ? itemKey : `${itemKey}:representation:${representation}`;
  const codePoints = Array.from(text);
  const offset = cursorValue === undefined ? 0 : decodeCursor(cursorValue, state.review, cursorKey, codePoints);
  if (offset > codePoints.length) return fail("STALE_CURSOR", "Product review continuation is outside current source.");
  const part = codePoints.slice(offset, offset + maxPoints).join("");
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
      item: cursorKey,
      offset: nextOffset,
      prefix_sha256: digest(codePoints.slice(0, nextOffset).join("")),
    }),
    read_receipt: complete ? receipt(state.review.id, state.review.source_version, itemKey, text) : null,
    recorded_result: state.verdicts.get(itemKey)?.verdict ?? null,
    ...(representation === undefined ? {} : {
      representation,
      verdict_digest_domain: "canonical-verdict-json-utf8-newline" as const,
      verdict_object_sha256: state.verdicts.get(itemKey)?.object.object_sha256 ?? null,
      object_sha256: state.verdicts.get(itemKey)?.object.object_sha256 ?? null,
    }),
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
  if (!(["full", "followup", "recheck"] as ReviewMode[]).includes(input.mode)
    || (input.mode === "full" && (input.parentReviewRef !== undefined || input.fixes !== undefined))
    || (input.mode === "followup" && (input.parentReviewRef === undefined || fixes.length === 0))
    || (input.mode === "recheck" && (input.parentReviewRef === undefined || input.fixes !== undefined))) {
    return fail("INVALID_INPUT", "Full review has no parent or fixes; followup requires parent and fixes; recheck requires a successful parent without fixes.");
  }
  const parent = input.parentReviewRef ?? null;
  const id = exactReviewId(state.candidate, input.mode, parent, fixes);
  const path = reviewPath(input.candidateRef, id);
  const existing = await readSafe(input.root, path, context.canonical_workspace);
  if (existing !== null) {
    const loaded = await loadReviewState(input.root, context, input.candidateRef, id, true, true);
    return { context: input.context, result: statusFor(loaded), replayed: true, operationRef: null };
  }
  let inventory: ReviewInventory = { ...await buildInventory(state), recheck_basis: state.candidate };
  if (input.mode === "full" || input.mode === "recheck") inventory = { ...inventory, blocks: buildSemanticBlocks(inventory.items) };
  const inherited: Verdict[] = [];
  const sourceChecks = new Map<string, () => Promise<unknown>>();
  if (input.mode === "recheck") {
    let parentState: ReviewState;
    let prior: CandidateState;
    try {
      parentState = await loadReviewState(input.root, context, input.candidateRef, parent!, true, true);
      assertSuccessfulParent(parentState);
      prior = await recheckBasis(parentState);
      await verifyParentEvidence(parentState, prior);
    } catch (error) {
      if (!(error instanceof WorkflowError) || error.code === "PREREQUISITE_REQUIRED") throw error;
      return fullReviewRequired("Parent history is unavailable or corrupt; inheritance is blocked.");
    }
    const impact = await deriveRecheckImpact(parentState, prior, state, inventory);
    inventory = { ...inventory, recheck_impact: impact };
    const pending = new Set(impact.pending_keys);
    for (const entry of reviewItems(inventory)) {
      if (!pending.has(entry.item_key)) inherited.push(inheritedVerdict(requireSavedVerdict(parentState.verdicts.get(entry.item_key)!), parent!));
    }
    sourceChecks.set("recheck-parent", async () => {
      const bytes = await readSafe(input.root, reviewPath(input.candidateRef, parent!), context.canonical_workspace);
      if (bytes === null || !bytes.equals(parentState.reviewBytes)) return fail("CONFLICT", "Recheck parent changed before mutation.");
      await recheckBasis(parentState);
      await verifyParentEvidence(parentState, prior);
      await loadVerdicts(input.root, state.candidate.product_id, parentState.review, true);
    });
  }
  if (input.mode === "followup") {
    const parentState = await loadReviewState(input.root, context, input.candidateRef, parent!, true, true);
    if (parentState.inventory.blocks !== undefined) inventory = { ...inventory, blocks: buildSemanticBlocks(inventory.items) };
    if (parentState.review.coverage !== "gaps" || parentState.review.source_version === state.candidate.source_version) {
      return fail("PREREQUISITE_REQUIRED", "Followup review requires a completed gaps review over an earlier source.");
    }
    const findings = new Set([...parentState.verdicts.values()].map(requireSavedVerdict)
      .filter((verdict) => verdict.verdict === "gap" || verdict.verdict === "conflict")
      .map((verdict) => verdict.item_key));
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
    const currentItems = new Map(reviewItems(inventory).map((entry) => [entry.item_key, entry]));
    for (const saved of parentState.verdicts.values()) {
      const verdict = requireSavedVerdict(saved);
      const previous = reviewItems(parentState.inventory).find((entry) => entry.item_key === verdict.item_key);
      const current = currentItems.get(verdict.item_key);
      if (
        current !== undefined && previous?.text_sha256 === current.text_sha256
        && (verdict.verdict === "covered" || verdict.verdict === "not_applicable")
      ) inherited.push(inheritedVerdict(verdict, parent!));
    }
  }
  const inventoryBytes = canonicalBytes(inventory);
  if (inventoryBytes.byteLength > MAX_SOURCE_BYTES) return fail("SOURCE_LIMIT", "Retained review inputs exceed supported aggregate size.");
  const inventorySha256 = digest(inventoryBytes);
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
  const verdictMap = new Map(inherited.map((verdict, index) => [verdict.item_key, {
    verdict, object: inheritedObjects[index]!, kind: verdict.verdict, bytes: canonicalBytes(verdict).byteLength,
  }]));
  const retainedSources = new Map(inventory.items.map((entry) => [entry.item_key, entry.sources]));
  const nextReview = indexedReview({ ...state, review, reviewBytes: canonicalBytes(review), inventory, retainedSources, verdicts: verdictMap });
  await validateProductRecord("Review", nextReview);
  const nextBytes = canonicalBytes(nextReview);
  const nextState: ReviewState = {
    ...state, review: nextReview, reviewBytes: nextBytes, inventory, retainedSources, verdicts: verdictMap, sourceChecks,
  };
  const result = statusFor(nextState);
  return mutateReview({
    state: { ...state, sourceChecks },
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

export async function expandProductReviewScope(input: {
  readonly root: string;
  readonly context: string;
  readonly reviewRef: string;
  readonly itemKeys: readonly string[];
  readonly reason: string;
}): Promise<ProductReviewOutcome<ReviewStatus>> {
  const context = decodeContext(input.context);
  const reference = context.candidate_ref ?? fail("INVALID_INPUT", "Scope expansion requires selected candidate context.");
  const state = await loadReviewState(input.root, context, reference, input.reviewRef, true, true);
  if (state.review.mode !== "recheck" || state.review.coverage !== "pending"
    || state.review.source_version !== state.candidate.source_version) return fail("INVALID_STATE", "Only a current pending recheck can expand scope.");
  if (input.itemKeys.length < 1 || input.itemKeys.length > 100 || new Set(input.itemKeys).size !== input.itemKeys.length
    || input.reason.length < 1 || input.reason.length > 4096) return fail("INVALID_INPUT", "Expand 1–100 unique current block keys with a reason of 1–4096 characters.");
  assertNonSensitive([input.reason]);
  const known = new Set(reviewItems(state.inventory).map((entry) => entry.item_key));
  if (input.itemKeys.some((key) => !known.has(key))) return fail("NOT_FOUND", "Scope expansion references a foreign or obsolete current block.");
  const expansion = { item_keys: [...input.itemKeys].sort(), reason: input.reason };
  if ((state.review.scope_expansions ?? []).some((entry) => canonicalValue(entry) === canonicalValue(expansion))) {
    return { context: input.context, result: statusFor(state), replayed: true, operationRef: null };
  }
  const verdicts = new Map(state.verdicts);
  for (const key of input.itemKeys) {
    const saved = verdicts.get(key);
    if (saved !== undefined && requireSavedVerdict(saved).inherited_from !== null) verdicts.delete(key);
  }
  verdicts.delete("__consistency__");
  const review = indexedReview({ ...state, verdicts, review: { ...state.review, consistency_receipt: null,
    scope_expansions: [...state.review.scope_expansions ?? [], expansion] } });
  await validateProductRecord("Review", review);
  const next: ReviewState = { ...state, verdicts, review, reviewBytes: canonicalBytes(review) };
  if (next.reviewBytes.byteLength > MAX_SOURCE_BYTES) return fail("SOURCE_LIMIT", "Scope expansion exceeds supported review size.");
  return mutateReview({ state, scenario: "product_review_scope_expand",
    scenarioInput: { review_ref: input.reviewRef, item_keys: expansion.item_keys, reason: input.reason },
    relativePath: reviewPath(reference, input.reviewRef), before: state.reviewBytes, after: next.reviewBytes,
    result: statusFor(next), resultDefinition: "Success_ReviewStatus" });
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
  readonly representation?: ReviewRepresentation;
}): Promise<ProductReviewOutcome<ReviewPortion>> {
  const context = decodeContext(input.context);
  const reference = context.candidate_ref ?? fail("INVALID_INPUT", "Product review requires selected candidate context.");
  const state = await loadReviewState(input.root, context, reference, input.reviewRef);
  const items = reviewItems(state.inventory);
  if (!Number.isSafeInteger(input.itemIndex) || input.itemIndex < 0 || input.itemIndex >= items.length) {
    return fail("NOT_FOUND", "Product review item does not exist.");
  }
  const entry = items[input.itemIndex]!;
  await verifyUsedSources(state, entry);
  await loadUsedVerdict(state, entry.item_key);
  const result = portion(state, entry.item_key, reviewText(state, entry, input.representation), statusFor(state).next_item_index, input.cursor, PORTION_CODE_POINTS, input.representation);
  return { context: input.context, result, replayed: false, operationRef: null };
}

async function verifyUsedSources(state: ReviewState, entry: InventoryItem): Promise<void> {
  for (const source of entry.sources ?? []) {
    const key = canonicalValue(source);
    if (state.sourceChecks?.has(key)) continue;
    const check = () => readObject(state.root, source);
    await check();
    state.sourceChecks?.set(key, check);
  }
  const atomKeys = state.inventory.blocks?.find((block) => block.item_key === entry.item_key);
  const included = new Set(atomKeys === undefined ? [entry.item_key] : [...atomKeys.primary_atoms, ...atomKeys.related_atoms]);
  for (const atom of state.inventory.items) {
    if (!included.has(atom.item_key) || !atom.item_key.startsWith("upstream:")) continue;
    const key = `pin:${atom.text_sha256}`;
    if (state.sourceChecks?.has(key)) continue;
    const pin = parseJson(Buffer.from(atom.text), "Review source pin") as SourcePin;
    const check = () => verifySourcePin(state.root, pin);
    await check();
    state.sourceChecks?.set(key, check);
  }
}

async function validateFreshVerdict(state: ReviewState, value: Verdict): Promise<Verdict> {
  const verdict = await validateProductRecord("Verdict", value);
  if (verdict.inherited_from !== null) return fail("INVALID_INPUT", "Fresh review verdict cannot claim inherited provenance.");
  const entry = reviewItems(state.inventory).find((item) => item.item_key === verdict.item_key);
  if (entry === undefined) return fail("NOT_FOUND", "Product review item does not exist.");
  await verifyUsedSources(state, entry);
  if (!validReviewReceipt(state, entry.item_key, verdict.read_receipt, entry)) {
    return fail("INVALID_INPUT", "Product review verdict requires a complete current read receipt.");
  }
  if ((verdict.verdict === "gap" || verdict.verdict === "conflict") && verdict.counterexample === null) {
    return fail("INVALID_INPUT", "Gap or conflict verdict requires a concrete counterexample.");
  }
  for (const reference of verdict.evidence_refs) {
    if (reference.product_id !== state.candidate.product_id) return fail("NOT_FOUND", "Review evidence belongs to another product.");
  }
  for (const pin of verdict.evidence_sources) {
    const check = () => verifySourcePin(state.root, pin);
    await check();
    state.sourceChecks?.set(`evidence:${canonicalValue(pin)}`, check);
  }
  return verdict;
}

export async function readProductReviewBatch(input: {
  readonly root: string; readonly context: string; readonly reviewRef: string;
  readonly startIndex: number; readonly limit?: number; readonly representation?: ReviewRepresentation;
}): Promise<ProductReviewOutcome<{ readonly items: readonly { item_index: number; portion: ReviewPortion }[]; readonly next_item_index: number | null }>> {
  const context = decodeContext(input.context);
  const reference = context.candidate_ref ?? fail("INVALID_INPUT", "Product review requires selected candidate context.");
  const state = await loadReviewState(input.root, context, reference, input.reviewRef);
  const inventory = reviewItems(state.inventory);
  const limit = input.limit ?? 20;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 20) return fail("INVALID_INPUT", "Review batch limit must be 1–20.");
  if (!Number.isSafeInteger(input.startIndex) || input.startIndex < 0 || input.startIndex >= inventory.length) {
    return fail("NOT_FOUND", "Product review batch start does not exist.");
  }
  const items: { item_index: number; portion: ReviewPortion }[] = [];
  let next: number | null = input.startIndex;
  const fits = (entries: typeof items, nextIndex: number | null): boolean => Buffer.byteLength(JSON.stringify({
    protocol_version: 2, context: input.context, result: { items: entries, next_item_index: nextIndex },
    replayed: false, operation_ref: null,
  }), "utf8") <= 24 * 1024;
  for (let index = input.startIndex; index < inventory.length && items.length < limit; index++) {
    const entry = inventory[index]!;
    await verifyUsedSources(state, entry);
    await loadUsedVerdict(state, entry.item_key);
    let points = PORTION_CODE_POINTS;
    let part = portion(state, entry.item_key, reviewText(state, entry, input.representation), statusFor(state).next_item_index, undefined, points, input.representation);
    let after = part.complete ? (index + 1 < inventory.length ? index + 1 : null) : index;
    while (!fits([...items, { item_index: index, portion: part }], after) && items.length === 0 && points > 1) {
      points = Math.floor(points / 2);
      part = portion(state, entry.item_key, reviewText(state, entry, input.representation), statusFor(state).next_item_index, undefined, points, input.representation);
      after = part.complete ? (index + 1 < inventory.length ? index + 1 : null) : index;
    }
    if (!fits([...items, { item_index: index, portion: part }], after)) {
      if (items.length === 0) return fail("RESULT_LIMIT", "One review item exceeds the bounded batch response.");
      break;
    }
    items.push({ item_index: index, portion: part });
    next = after;
    if (!part.complete) break;
  }
  return { context: input.context, result: { items, next_item_index: next }, replayed: false, operationRef: null };
}

export async function recordProductVerdictBatch(input: {
  readonly root: string; readonly context: string; readonly reviewRef: string; readonly items: readonly Verdict[];
}): Promise<ProductReviewOutcome<MutationResult>> {
  if (input.items.length < 1 || input.items.length > 20) {
    return fail("INVALID_INPUT", "Review batch must contain 1–20 verdicts.");
  }
  if (Buffer.byteLength(canonicalValue({ context: input.context, review_ref: input.reviewRef, items: input.items }), "utf8") > 131_072) {
    return fail("SOURCE_LIMIT", "Review batch arguments exceed 131072 UTF-8 bytes.");
  }
  const context = decodeContext(input.context);
  const reference = context.candidate_ref ?? fail("INVALID_INPUT", "Product review requires selected candidate context.");
  const state = await loadReviewState(input.root, context, reference, input.reviewRef);
  if (state.review.source_version !== state.candidate.source_version) return fail("CONFLICT", "Product review source changed.");
  const scenario = "product_review_record_batch";
  const scenarioInput = { review_ref: input.reviewRef, items: input.items };
  const id = operationId(scenario, state.review.source_version, scenarioInput);
  try {
    const replay = await replayProductMutationResult({ root: input.root, productId: state.candidate.product_id,
      operationId: id, scenario, intent: { schema_version: 1, kind: "operation_intent", scenario, input: scenarioInput } });
    for (const verdict of input.items) {
      const saved = await loadUsedVerdict(state, verdict.item_key);
      if (saved === undefined || canonicalValue(saved.verdict) !== canonicalValue(verdict)) {
        return fail("RECOVERY_REQUIRED", "Retained batch evidence no longer matches its recorded result.");
      }
    }
    return { context: input.context, result: replay.result as MutationResult, replayed: true, operationRef: id };
  } catch (error) {
    if (!(error instanceof WorkflowError) || error.code !== "NOT_FOUND") throw error;
  }
  if (state.review.coverage !== "pending") return fail("INVALID_STATE", "Completed review cannot accept a new batch.");
  const keys = new Set<string>();
  const verdicts: Verdict[] = [];
  for (const [index, value] of input.items.entries()) {
    try {
      const verdict = await validateFreshVerdict(state, value);
      if (keys.has(verdict.item_key)) return fail("INVALID_INPUT", "Review batch contains duplicate item keys.", { index });
      if (state.verdicts.has(verdict.item_key)) return fail("CONFLICT", "Review batch overlaps recorded items.", { index });
      keys.add(verdict.item_key);
      verdicts.push(verdict);
    } catch (error) {
      if (error instanceof WorkflowError) return fail(error.code, error.message, { ...error.details, index });
      throw error;
    }
  }
  const next = indexedReview(state, verdicts);
  await validateProductRecord("Review", next);
  return mutateReview({ state, scenario, scenarioInput, relativePath: reviewPath(reference, state.review.id),
    before: state.reviewBytes, after: canonicalBytes(next), resultDefinition: "Success_MutationResult",
    result: mutationResult(id, state.candidate, state.review.id, "Continue with the next unrecorded semantic block."),
    saveObjects: async () => { for (const verdict of verdicts) await saveVerdictObject(input.root, state.candidate.product_id, verdict); },
  });
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
  const verdict = await validateFreshVerdict(state, input.value);
  const existing = await loadUsedVerdict(state, verdict.item_key);
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
  const review = indexedReview(state, [verdict]);
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

function consistencyText(state: ReviewState, representation?: ReviewRepresentation): string {
  if (representation !== undefined && representation !== "explicit-v1") {
    return fail("INVALID_INPUT", "Unsupported review representation; omit it for legacy or use explicit-v1.");
  }
  if (state.review.mode === "followup") return representation === undefined ? state.inventory.consistency_text
    : canonicalValue({ representation, sources: state.inventory.items.map((entry) => explicitSourceEvidence(state, entry)) });
  if (reviewItems(state.inventory).some((entry) => !state.verdicts.has(entry.item_key))) {
    return fail("PREREQUISITE_REQUIRED", "Read and judge every semantic block before cross-block consistency.");
  }
  if (state.review.mode === "recheck") {
    const impact = { ...state.inventory.recheck_impact, scope_expansions: state.review.scope_expansions ?? [] };
    const results = [...state.verdicts].filter(([key]) => key !== "__consistency__").sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({ item_key: key, verdict: value.kind, inherited_from: requireSavedVerdict(value).inherited_from,
        ...(representation === undefined ? { object_sha256: value.object.object_sha256 } : {
          verdict_object_sha256: value.object.object_sha256, object_sha256: value.object.object_sha256,
          verdict_digest_domain: "canonical-verdict-json-utf8-newline",
        }) }));
    return representation === undefined ? `Recheck whole-current-artifact consistency; inherited attribution remains provisional.\n${state.inventory.consistency_text}\n${canonicalValue({ impact, results })}`
      : canonicalValue({ representation, impact, results, sources: state.inventory.items.map((entry) => explicitSourceEvidence(state, entry)) });
  }
  if (representation !== undefined) {
    const entries = new Map(reviewItems(state.inventory).map((entry) => [entry.item_key, entry]));
    return canonicalValue({ representation, source_version: state.review.source_version, blocks: state.inventory.blocks,
      results: [...state.verdicts].filter(([key]) => key !== "__consistency__")
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => ({ item_key: key, verdict: value.kind,
          verdict_digest_domain: "canonical-verdict-json-utf8-newline",
          verdict_object_sha256: value.object.object_sha256,
          object_sha256: value.object.object_sha256,
          source_evidence: explicitSourceEvidence(state, entries.get(key)!, false),
        })),
    });
  }
  return `Review cross-block consistency using the exact blocks already read. Re-read any context no longer available.\nSource: ${state.review.source_version}\n`
    + canonicalValue({ blocks: state.inventory.blocks, results: [...state.verdicts]
      .filter(([key]) => key !== "__consistency__")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => ({ item_key: key, verdict: value.kind, object_sha256: value.object.object_sha256 })) });
}

export async function readProductReviewConsistency(input: {
  readonly root: string;
  readonly context: string;
  readonly reviewRef: string;
  readonly cursor?: string;
  readonly representation?: ReviewRepresentation;
}): Promise<ProductReviewOutcome<ReviewPortion>> {
  const context = decodeContext(input.context);
  const reference = context.candidate_ref ?? fail("INVALID_INPUT", "Product review requires selected candidate context.");
  const state = await loadReviewState(input.root, context, reference, input.reviewRef);
  if (state.review.mode !== "followup" && state.inventory.blocks === undefined) return fail("INVALID_STATE", "Legacy full review has no consistency gate.");
  if (state.review.mode === "followup") {
    for (const entry of reviewItems(state.inventory)) await verifyUsedSources(state, entry);
  }
  await loadUsedVerdict(state, "__consistency__");
  const result = portion(state, "__consistency__", consistencyText(state, input.representation), statusFor(state).next_item_index, input.cursor, PORTION_CODE_POINTS, input.representation);
  return { context: input.context, result, replayed: false, operationRef: null };
}

// Keep the public portion shape unchanged. The owning reader recomputes its exact
// bounded range from immutable source text and validates the requested prefix.
export async function verifyProductReviewDelivery(input: {
  readonly root: string;
  readonly context: string;
  readonly reviewRef: string;
  readonly itemIndex?: number;
  readonly cursor?: string;
  readonly representation?: ReviewRepresentation;
}, delivered: Record<string, unknown>): Promise<void> {
  const expected = input.itemIndex === undefined
    ? await readProductReviewConsistency(input)
    : await readProductReviewItem({ ...input, itemIndex: input.itemIndex });
  for (const key of ["review_ref", "source_version", "item_key", "representation", "complete", "next_cursor", "read_receipt"] as const) {
    if (delivered[key] !== expected.result[key]) return fail("SOURCE_CHANGED", "Review delivery differs from the exact owning source range.");
  }
  if (typeof delivered.text !== "string" || delivered.text !== expected.result.text) {
    return fail("SOURCE_CHANGED", "Review delivery text differs from the exact owning source range.");
  }
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
  if ((state.review.mode !== "followup" && state.inventory.blocks === undefined) || state.review.coverage !== "pending") {
    return fail("INVALID_STATE", "Product review consistency gate is unavailable.");
  }
  if (state.review.mode === "followup") {
    for (const entry of reviewItems(state.inventory)) await verifyUsedSources(state, entry);
  }
  if (!validReviewReceipt(state, "__consistency__", input.readReceipt)) return fail("INVALID_INPUT", "Consistency verdict requires complete current read receipt.");
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
  const result = mutationResult(id, state.candidate, state.review.id, "Complete the review after all required verdicts are recorded.");
  const existing = await loadUsedVerdict(state, "__consistency__");
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
    ...indexedReview(state, [verdict]),
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
  const state = await loadReviewState(input.root, context, reference, input.reviewRef, true, true);
  if (state.review.source_version !== state.candidate.source_version) return fail("CONFLICT", "Product review source changed.");
  if (state.review.coverage !== "pending") {
    return { context: input.context, result: statusFor(state), replayed: true, operationRef: null };
  }
  const missing = reviewItems(state.inventory).find((entry) => !state.verdicts.has(entry.item_key));
  if (missing !== undefined) return fail("PREREQUISITE_REQUIRED", "Product review still has unrecorded inventory items.");
  const consistency = state.verdicts.get("__consistency__")?.verdict;
  if ((state.review.mode === "followup" || state.inventory.blocks !== undefined)
    && (state.review.consistency_receipt === null || consistency === undefined)) {
    return fail("PREREQUISITE_REQUIRED", "Followup review requires a fresh whole-artifact consistency verdict.");
  }
  const gap = [...state.verdicts.values()].some(({ kind }) => kind === "gap" || kind === "conflict");
  const review: ReviewRecord = { ...indexedReview(state), coverage: gap ? "gaps" : "reviewed" };
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
  } else {
    const audited = await loadReviewState(state.root, state.context,
      { product_id: state.candidate.product_id, candidate_id: state.candidate.candidate_id }, selected.id, false, true);
    if (reviewItems(audited.inventory).some((entry) => !audited.verdicts.has(entry.item_key))
      || [...audited.verdicts.values()].some((saved) => saved.kind === "gap" || saved.kind === "conflict")
      || ((audited.inventory.blocks !== undefined || selected.mode === "followup")
        && (!audited.verdicts.has("__consistency__") || selected.consistency_receipt === null))) {
      issues.push({ code: "REVIEW_REQUIRED", message: "Retained review coverage is incomplete or inconsistent.", ref: null });
    }
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
