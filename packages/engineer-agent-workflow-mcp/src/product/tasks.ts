import { createHash, randomUUID } from "node:crypto";
import { lstat, open, readdir, rename, unlink } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";

import { mechanicalCoverage, requirementSource } from "../requirements.js";
import { reviewRuns, snapshot, statusRegressed } from "../review-model.js";
import { confirmedScope, currentRecords } from "../scope.js";
import {
  fail,
  load,
  openContext,
  readBytes,
  safePath,
  WorkflowError,
} from "../state.js";
import { resolveWorkspace } from "./bindings.js";
import { prepareProductContext, readContextPage } from "./context.js";
import {
  inspectExactOperationForResume,
  pendingOperationsForTarget,
  replayProductMutationResult,
  resumeOperation,
  runProductMutation,
} from "./operations.js";
import type { ExactOperationResumeEvidence, ProductMutationPlan } from "./operations.js";
import { validateProductRecord } from "./schemas.js";
import { loadGeneration, verifySourcePin } from "./storage.js";
import type { SourcePin } from "./storage.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/u;
const TASK_PATTERN = /^TASK-[0-9]{4,}$/u;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const MAX_TASK_BINDINGS = 10_000;
const MAX_PLAN_PINS = 100;
const SENSITIVE_PATTERN = /\b(?:authorization\s*:\s*bearer|api[_-]?key\s*[:=]|access[_-]?token\s*[:=]|refresh[_-]?token\s*[:=]|client[_-]?secret\s*[:=]|private[_-]?key\s*[:=]|secret[_-]?access[_-]?key\s*[:=]|password\s*[:=]|secret\s*[:=])|-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----|\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b|\bgh[pousr]_[A-Za-z0-9]{20,}\b|\bxox[baprs]-[A-Za-z0-9-]{10,}\b/iu;
const CREDENTIAL_URI_PATTERN = /\b[a-z][a-z0-9+.-]*:\/\/[^\s/@]+@/iu;

interface ProductContext {
  readonly contract: "product-1";
  readonly store_id: string | null;
  readonly product_id: string;
  readonly workspace_id: string;
  readonly candidate_ref: null;
  readonly selected_sources_sha256: string;
  readonly target_revision: string;
  readonly canonical_workspace: string;
}

type TaskState = "reserved" | "specified" | "planned" | "started" | "blocked" | "completed";

interface PlanPin {
  readonly relative_path: string;
  readonly sha256: string;
}

interface CompletedPacket {
  readonly packet_id: string;
  readonly evidence_refs: readonly string[];
  readonly operation_id: string;
}

type Artifact = "idea" | "prd" | "technical-design" | "roadmap";

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
  readonly ref: DecisionRef;
  readonly state: "needs_user" | "answered" | "observed" | "assumed" | "superseded" | "no_answer";
  readonly predecessors: readonly DecisionRef[];
  readonly affected_refs: readonly Ref[];
}

interface SafetyBlock {
  readonly schema_version: 1;
  readonly kind: "safety_block";
  readonly id: string;
  readonly product_id: string;
  readonly affected_refs: readonly Ref[];
  readonly affected_task_ids: readonly string[];
  readonly reason: "security" | "incompatibility" | "uncertain_impact";
  readonly explanation: string;
  readonly source: DecisionRef;
  readonly resolution: DecisionRef | null;
}

interface TaskBinding {
  readonly schema_version: 1;
  readonly kind: "task_binding";
  readonly product_id: string;
  readonly task_id: string;
  readonly specification_id: string;
  readonly specification_slug: string;
  readonly workspace_id: string;
  readonly reservation_operation: string;
  readonly state: TaskState;
  readonly owner_session: string | null;
  readonly current_packet: string | null;
  readonly product_pins: readonly SourcePin[];
  readonly product_source_version?: string | null;
  readonly specification_source_version: string | null;
  readonly specification_version: string | null;
  readonly specification_review_ref: string | null;
  readonly plan_pins: readonly PlanPin[];
  readonly safety_blocks: readonly string[];
  readonly completed_packets: readonly CompletedPacket[];
}

interface StoredBinding {
  readonly value: TaskBinding;
  readonly bytes: Buffer;
  readonly sha256: string;
}

interface StoredSafetyBlock {
  readonly value: SafetyBlock;
  readonly bytes: Buffer;
  readonly sha256: string;
}

interface TaskIssue {
  readonly code: string;
  readonly message: string;
  readonly ref: null;
}

interface TaskCheckResult {
  readonly status: "pass" | "fail";
  readonly source_version: string;
  readonly issues: readonly TaskIssue[];
  readonly semantic_correctness_proven: false;
  readonly user_consent_authenticated: false;
  readonly coverage_status: "pending" | "reviewed" | "gaps" | "stale" | null;
  readonly review_ref: string | null;
  readonly task_id: string;
  readonly task_state: TaskState;
  readonly product_pins: readonly SourcePin[];
  readonly specification_source_version: string | null;
  readonly specification_version: string | null;
  readonly specification_review_ref: string | null;
  readonly plan_pins: readonly PlanPin[];
}

interface TaskMutationResult extends Record<string, unknown> {
  readonly operation_ref: string;
  readonly applied: true;
  readonly candidate_ref: null;
  readonly changed_refs: readonly Ref[];
  readonly decision_ref: DecisionRef | null;
  readonly question_ref: null;
  readonly product_id: string;
  readonly workspace_id: string;
  readonly task_id: string | null;
  readonly specification_id: string | null;
  readonly review_ref: null;
  readonly next: string;
  readonly document_id: null;
}

export interface TaskOutcome<T> {
  readonly context: string;
  readonly result: T;
  readonly replayed: boolean;
  readonly operationRef: string | null;
}

function digest(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function deterministicUuid(seed: string): string {
  const value = Buffer.from(digest(seed).slice(0, 32), "hex");
  value[6] = (value[6]! & 0x0f) | 0x40;
  value[8] = (value[8]! & 0x3f) | 0x80;
  const encoded = value.toString("hex");
  return `${encoded.slice(0, 8)}-${encoded.slice(8, 12)}-${encoded.slice(12, 16)}-${encoded.slice(16, 20)}-${encoded.slice(20)}`;
}

function canonicalBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
}

function canonicalOperationValue(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalOperationValue).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${canonicalOperationValue((value as Record<string, unknown>)[key])}`
    )).join(",")}}`;
  }
  return fail("INVALID_INPUT", "Task mutation input is not canonical JSON data.");
}

function assertNonSensitive(values: readonly string[]): void {
  if (values.some((value) => SENSITIVE_PATTERN.test(value) || CREDENTIAL_URI_PATTERN.test(value))) {
    return fail("INVALID_INPUT", "Sensitive values cannot be stored in task workflow evidence.");
  }
}

function packetIdentity(value: string): { readonly id: string; readonly prefix: string } {
  const match = /^P([0-9]{2,})$/u.exec(value);
  if (match?.[1] === undefined) return fail("INVALID_INPUT", "Packet identity must use canonical P followed by at least two digits.");
  const numeric = BigInt(match[1]);
  if (numeric < 1n) return fail("INVALID_INPUT", "Packet identity must be positive.");
  const prefix = numeric.toString().padStart(2, "0");
  const id = `P${prefix}`;
  if (id !== value) return fail("INVALID_INPUT", "Packet identity must use its canonical numeric form.");
  return { id, prefix };
}

function nodeErrorCode(error: unknown): string | undefined {
  if (error === null || typeof error !== "object" || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
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
  if (
    record.contract !== "product-1"
    || !(record.store_id === null || (typeof record.store_id === "string" && UUID_PATTERN.test(record.store_id)))
    || typeof record.product_id !== "string" || !UUID_PATTERN.test(record.product_id)
    || typeof record.workspace_id !== "string" || !UUID_PATTERN.test(record.workspace_id)
    || record.candidate_ref !== null
    || typeof record.selected_sources_sha256 !== "string" || !DIGEST_PATTERN.test(record.selected_sources_sha256)
    || typeof record.target_revision !== "string" || !DIGEST_PATTERN.test(record.target_revision)
    || typeof record.canonical_workspace !== "string" || record.canonical_workspace.length === 0
    || record.canonical_workspace.length > 4096
    || Object.keys(record).some((key) => !allowed.has(key))
  ) return fail("INVALID_INPUT", "Task execution requires one exact registered workspace context.");
  return parsed as ProductContext;
}

async function currentContext(root: string, contextText: string, allowRevisionDrift = false): Promise<ProductContext> {
  const selected = decodeContext(contextText);
  const opened = await resolveWorkspace({ root, workspace: selected.canonical_workspace });
  if (opened.result.state !== "bound" || opened.context === null) {
    return fail("CONFLICT", "Workspace product binding changed; reopen the product before continuing.");
  }
  const current = decodeContext(opened.context);
  if (
    current.product_id !== selected.product_id
    || current.workspace_id !== selected.workspace_id
    || (!allowRevisionDrift && current.target_revision !== selected.target_revision)
    || (!allowRevisionDrift && current.selected_sources_sha256 !== selected.selected_sources_sha256)
  ) return fail("CONFLICT", "Product context changed; reopen the product before continuing.");
  return allowRevisionDrift ? current : selected;
}

function sharedBindingPath(productId: string, taskId: string): string {
  return `products/${productId}/tasks/${taskId}.yaml`;
}

function safetyBlockPath(productId: string, blockId: string): string {
  return `products/${productId}/safety-blocks/${blockId}.yaml`;
}

function localBindingPath(slug: string): string {
  return `docs/specs/${slug}/.workflow/product-binding.yaml`;
}

function specificationDirectory(slug: string): string {
  return `docs/specs/${slug}`;
}

function specificationReservationPath(productId: string, specificationId: string): string {
  return `products/${productId}/task-specifications/${specificationId}.yaml`;
}

function parseRecord(bytesValue: Buffer): unknown {
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytesValue));
  } catch {
    return fail("INVALID_STATE", "Task binding is not canonical JSON-compatible YAML.");
  }
}

async function readBinding(root: string, relativePath: string): Promise<StoredBinding | null> {
  const value = await readBytes(root, relativePath);
  if (value === null) return null;
  const binding = await validateProductRecord("TaskBinding", parseRecord(value)) as TaskBinding;
  return { value: binding, bytes: value, sha256: digest(value) };
}

async function readSafetyBlock(root: string, productId: string, blockId: string): Promise<StoredSafetyBlock | null> {
  const bytesValue = await readBytes(root, safetyBlockPath(productId, blockId));
  if (bytesValue === null) return null;
  const value = await validateProductRecord("SafetyBlock", parseRecord(bytesValue)) as SafetyBlock;
  if (value.product_id !== productId || value.id !== blockId) {
    return fail("SOURCE_CHANGED", "Safety block identity does not match its retained path.");
  }
  return { value, bytes: bytesValue, sha256: digest(bytesValue) };
}

async function closeHandle(handle: FileHandle | undefined): Promise<void> {
  if (handle === undefined) return;
  try {
    await handle.close();
  } catch {
    return fail("INVALID_STATE", "Task binding file could not be closed safely.");
  }
}

async function writeExpected(
  root: string,
  relativePath: string,
  before: string | null,
  value: Buffer,
): Promise<void> {
  const after = digest(value);
  const current = await readBytes(root, relativePath);
  const currentDigest = current === null ? null : digest(current);
  if (currentDigest === after) return;
  if (currentDigest !== before) return fail("CONFLICT", "Task binding changed before it could be saved.");
  const path = await safePath(root, relativePath, true);
  if (before === null) {
    let handle: FileHandle | undefined;
    try {
      handle = await open(path, "wx", 0o600);
      await handle.writeFile(value);
      await handle.sync();
      return;
    } catch (error) {
      if (nodeErrorCode(error) === "EEXIST") return fail("CONFLICT", "Task binding target appeared during reservation.");
      if (error instanceof WorkflowError) throw error;
      return fail("INVALID_STATE", "Task binding could not be created safely.");
    } finally {
      await closeHandle(handle);
    }
  }

  const temporaryRelative = `${relativePath}.${randomUUID()}.tmp`;
  const temporary = await safePath(root, temporaryRelative, true);
  let handle: FileHandle | undefined;
  let installed = false;
  try {
    handle = await open(temporary, "wx", 0o600);
    await handle.writeFile(value);
    await handle.sync();
    await closeHandle(handle);
    handle = undefined;
    const latest = await readBytes(root, relativePath);
    if (latest === null || digest(latest) !== before) return fail("CONFLICT", "Task binding changed before replacement.");
    await rename(temporary, path);
    installed = true;
  } catch (error) {
    if (error instanceof WorkflowError) throw error;
    return fail("INVALID_STATE", "Task binding could not be replaced safely.");
  } finally {
    await closeHandle(handle);
    if (!installed) await unlink(temporary).catch(() => undefined);
  }
}

async function verifyBytes(root: string, relativePath: string, expected: Buffer): Promise<void> {
  const actual = await readBytes(root, relativePath);
  if (actual === null || !actual.equals(expected)) return fail("CONFLICT", "Task binding no longer matches the saved operation.");
}

async function listSharedBindings(root: string, productId: string): Promise<StoredBinding[]> {
  const relativeDirectory = `products/${productId}/tasks`;
  const directory = await safePath(root, relativeDirectory, false, true);
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (nodeErrorCode(error) === "ENOENT") return [];
    return fail("INVALID_STATE", "Task binding inventory cannot be inspected safely.");
  }
  if (entries.length > MAX_TASK_BINDINGS) return fail("SOURCE_LIMIT", "Task binding inventory exceeds its supported limit.");
  const records: StoredBinding[] = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isFile() || !TASK_PATTERN.test(entry.name.replace(/\.yaml$/u, "")) || !entry.name.endsWith(".yaml")) {
      return fail("INVALID_STATE", "Task binding inventory contains an unsupported entry.");
    }
    const record = await readBinding(root, `${relativeDirectory}/${entry.name}`);
    if (record === null) return fail("SOURCE_CHANGED", "Task binding disappeared while inventory was read.");
    records.push(record);
  }
  return records;
}

function sameDecisionRef(left: DecisionRef, right: DecisionRef): boolean {
  return left.product_id === right.product_id
    && left.artifact === right.artifact
    && left.id === right.id
    && left.revision === right.revision;
}

function normalizedDecisionRef(reference: DecisionRef): DecisionRef {
  return {
    product_id: reference.product_id,
    artifact: reference.artifact,
    id: reference.id,
    revision: reference.revision,
  };
}

function normalizedRef(reference: Ref): Ref {
  return {
    product_id: reference.product_id,
    artifact: reference.artifact,
    element_id: reference.element_id,
  };
}

async function currentDecision(root: string, context: ProductContext, reference: DecisionRef): Promise<DecisionRecord> {
  if (reference.product_id !== context.product_id) return fail("NOT_FOUND", "Decision belongs to another product.");
  const generation = await loadGeneration(root, context.product_id, context.target_revision);
  const loaded = generation.decisions.find((entry) => sameDecisionRef(entry.ref, reference));
  if (loaded === undefined) return fail("NOT_FOUND", "Decision is not current in the selected product generation.");
  const decision = await validateProductRecord("Decision", parseRecord(Buffer.from(loaded.bytes))) as DecisionRecord;
  if (!sameDecisionRef(decision.ref, reference)) return fail("SOURCE_CHANGED", "Decision identity does not match its retained reference.");
  return decision;
}

async function requireTaskBinding(root: string, context: ProductContext, taskId: string): Promise<{
  readonly shared: StoredBinding;
  readonly local: StoredBinding;
}> {
  const shared = await readBinding(root, sharedBindingPath(context.product_id, taskId));
  if (shared === null) return fail("NOT_FOUND", "Selected product task has no reserved specification.");
  const local = await readBinding(context.canonical_workspace, localBindingPath(shared.value.specification_slug));
  if (local === null) return fail("MISSING_EVIDENCE", "Current workspace has no registered task specification sidecar.");
  if (
    shared.value.product_id !== context.product_id
    || shared.value.task_id !== taskId
    || local.value.product_id !== shared.value.product_id
    || local.value.task_id !== shared.value.task_id
    || local.value.specification_id !== shared.value.specification_id
    || local.value.specification_slug !== shared.value.specification_slug
    || local.value.reservation_operation !== shared.value.reservation_operation
    || local.value.workspace_id !== context.workspace_id
  ) return fail("CONFLICT", "Task specification binding identity does not match the current workspace.");
  return { shared, local };
}

async function collectProductPins(root: string, context: string, taskId: string): Promise<{
  readonly sourceVersion: string;
  readonly pins: readonly SourcePin[];
}> {
  let page = (await prepareProductContext({
    root,
    context,
    purpose: "implementation",
    taskId,
    budgetBytes: 16_384,
  })).result;
  const pins: SourcePin[] = [];
  const blockers = new Set<string>();
  const sourceVersion = page.source_version;
  while (true) {
    if (page.source_version !== sourceVersion) return fail("SOURCE_CHANGED", "Product task context changed while its pins were collected.");
    pins.push(...page.required);
    for (const blocker of page.blockers) blockers.add(blocker);
    if (page.next_cursor === null) break;
    page = (await readContextPage({ root, context, cursor: page.next_cursor })).result;
  }
  if (blockers.size > 0) return fail("PREREQUISITE_REQUIRED", "Product task context has unresolved blockers.", { blockers: [...blockers].slice(0, 20) });
  const unique = new Map(pins.map((pin) => [JSON.stringify(pin), pin]));
  if (unique.size > 1000) return fail("SOURCE_LIMIT", "Product task requires too many exact source pins.");
  return { sourceVersion, pins: [...unique.values()] };
}

function issue(code: string, message: string): TaskIssue {
  return { code, message, ref: null };
}

function coverage(value: unknown): TaskCheckResult["coverage_status"] {
  return ["pending", "reviewed", "gaps", "stale"].includes(String(value))
    ? value as TaskCheckResult["coverage_status"]
    : null;
}

async function planPins(workspace: string, slug: string, packetId?: string): Promise<PlanPin[]> {
  const base = `docs/specs/${slug}/tasks`;
  const directory = await safePath(workspace, base, false, true);
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (nodeErrorCode(error) === "ENOENT") return [];
    return fail("INVALID_STATE", "Task plan inventory cannot be inspected safely.");
  }
  const packets = new Map<string, string>();
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isFile()) continue;
    const match = /^([0-9]{2,})_.+\.md$/u.exec(entry.name);
    if (match?.[1] === undefined) continue;
    const identity = packetIdentity(`P${match[1]}`);
    if (identity.prefix !== match[1] || packets.has(identity.id)) {
      return fail("INVALID_STATE", "Task plan contains ambiguous packet identities.");
    }
    packets.set(identity.id, `${base}/${entry.name}`);
  }
  if (packets.size === 0) return fail("PREREQUISITE_REQUIRED", "Task plan must contain at least one packet file.");
  if (packets.size + 1 > MAX_PLAN_PINS) return fail("SOURCE_LIMIT", "Task plan contains too many packet files.");
  if (packetId !== undefined && !packets.has(packetIdentity(packetId).id)) {
    return fail("PREREQUISITE_REQUIRED", "Selected packet must resolve to exactly one task packet file.");
  }
  const relativePaths = [`${base}/plan.md`, ...packets.values()];
  const pins: PlanPin[] = [];
  for (const relativePath of relativePaths.sort()) {
    const value = await readBytes(workspace, relativePath);
    if (value === null) return [];
    pins.push({ relative_path: relativePath, sha256: digest(value) });
  }
  return pins.sort((left, right) => left.relative_path.localeCompare(right.relative_path));
}

function samePlanPins(left: readonly PlanPin[], right: readonly PlanPin[]): boolean {
  return left.length === right.length && left.every((pin, index) => (
    pin.relative_path === right[index]?.relative_path && pin.sha256 === right[index]?.sha256
  ));
}

function plannedPacketIds(pins: readonly PlanPin[]): readonly string[] {
  const result: string[] = [];
  for (const pin of pins) {
    const match = /\/tasks\/([0-9]{2,})_[^/]+\.md$/u.exec(pin.relative_path);
    if (match?.[1] === undefined) continue;
    result.push(packetIdentity(`P${match[1]}`).id);
  }
  if (result.length === 0 || new Set(result).size !== result.length) {
    return fail("INVALID_STATE", "Pinned task plan has no unique packet inventory.");
  }
  return result;
}

function hasFrozenInputs(binding: TaskBinding): boolean {
  const parts = [
    binding.product_pins.length > 0,
    binding.specification_source_version !== null,
    binding.specification_version !== null,
    binding.specification_review_ref !== null,
    binding.plan_pins.length > 1,
  ];
  const complete = parts.every(Boolean);
  if (!complete && parts.some(Boolean)) return fail("INVALID_STATE", "Task binding contains incomplete frozen input evidence.");
  if (complete && binding.product_source_version === null) {
    return fail("INVALID_STATE", "Task binding is missing its frozen product source version.");
  }
  if (!complete && typeof binding.product_source_version === "string") {
    return fail("INVALID_STATE", "Task binding has a product version without complete frozen input evidence.");
  }
  return complete;
}

async function specificationEvidence(
  workspace: string,
  slug: string,
  packetId?: string,
): Promise<{
  readonly issues: TaskIssue[];
  readonly coverageStatus: TaskCheckResult["coverage_status"];
  readonly sourceVersion: string | null;
  readonly specificationVersion: string | null;
  readonly reviewRef: string | null;
  readonly planPins: PlanPin[];
}> {
  const issues: TaskIssue[] = [];
  let sourceVersion: string | null = null;
  let specificationVersion: string | null = null;
  let reviewRef: string | null = null;
  let coverageStatus: TaskCheckResult["coverage_status"] = null;
  let pins: PlanPin[] = [];
  try {
    const context = await openContext(workspace, slug);
    await confirmedScope(context);
    const ledger = (await load(context, "decisions")).value;
    const unresolved = currentRecords(ledger).filter((record) => ["needs_user", "blocked"].includes(String(record.state)));
    if (unresolved.length > 0) issues.push(issue("ANSWER_REQUIRED", "Specification has unresolved material decisions."));
    const source = await requirementSource(context);
    specificationVersion = source.version;
    if (source.status !== "Approved") issues.push(issue("PREREQUISITE_REQUIRED", "Task specification must have Status: Approved."));
    const mechanical = mechanicalCoverage(source, ledger);
    if (mechanical.length > 0) issues.push(issue("INVALID_SPECIFICATION", "Specification requirement coverage is incomplete."));
    const selected = await snapshot(context, ledger, source);
    const run = reviewRuns(ledger).at(-1);
    sourceVersion = selected.version;
    reviewRef = typeof run?.id === "string" ? run.id : null;
    if (run !== undefined) {
      const approvalPending = run.source_version === selected.version
        && run.status_at_start === "Draft"
        && source.status === "Approved"
        && run.approval_observed !== true;
      coverageStatus = run.source_version !== selected.version || statusRegressed(run, source)
        ? "stale"
        : approvalPending
          ? "pending"
          : coverage(run.completed === true ? run.outcome : "pending");
    }
    if (coverageStatus !== "reviewed") issues.push(issue("REVIEW_REQUIRED", "Specification completeness review must be current and reviewed."));
    pins = await planPins(workspace, slug, packetId);
    if (pins.length < 2) issues.push(issue("PREREQUISITE_REQUIRED", "Required plan and packet files are unavailable."));
  } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
    issues.push(issue(error.code.slice(0, 64), error.message.slice(0, 512)));
  }
  return { issues, coverageStatus, sourceVersion, specificationVersion, reviewRef, planPins: pins };
}

function mutationResult(
  operationId: string,
  context: ProductContext,
  binding: TaskBinding,
  next: string,
): TaskMutationResult {
  return {
    operation_ref: operationId,
    applied: true,
    candidate_ref: null,
    changed_refs: [],
    decision_ref: null,
    question_ref: null,
    product_id: context.product_id,
    workspace_id: context.workspace_id,
    task_id: binding.task_id,
    specification_id: binding.specification_id,
    review_ref: null,
    next,
    document_id: null,
  };
}

async function freshOutcome(
  root: string,
  workspace: string,
  result: TaskMutationResult,
  replayed: boolean,
): Promise<TaskOutcome<TaskMutationResult>> {
  const opened = await resolveWorkspace({ root, workspace });
  if (opened.context === null || opened.result.state !== "bound") {
    return fail("RECOVERY_REQUIRED", "Task mutation completed but the workspace product context cannot be reopened.");
  }
  return { context: opened.context, result, replayed, operationRef: result.operation_ref };
}

async function replay(
  root: string,
  context: ProductContext,
  operationId: string,
  scenario: string,
  intent: unknown,
): Promise<TaskOutcome<TaskMutationResult> | null> {
  try {
    const saved = await replayProductMutationResult({
      root,
      productId: context.product_id,
      operationId,
      scenario,
      intent,
    });
    return freshOutcome(root, context.canonical_workspace, saved.result as TaskMutationResult, true);
  } catch (error) {
    if (error instanceof WorkflowError && error.code === "NOT_FOUND") return null;
    throw error;
  }
}

async function replayOrRecoverSafety(
  root: string,
  context: ProductContext,
  operationId: string,
  scenario: "product_safety_block" | "product_safety_resolve",
  intent: unknown,
): Promise<{
  readonly outcome: TaskOutcome<TaskMutationResult> | null;
  readonly recovery?: ExactOperationResumeEvidence;
}> {
  try {
    return { outcome: await replay(root, context, operationId, scenario, intent) };
  } catch (error) {
    if (!(error instanceof WorkflowError && error.code === "RECOVERY_REQUIRED")) throw error;
    return {
      outcome: null,
      recovery: await inspectExactOperationForResume({
        root,
        productId: context.product_id,
        operationId,
        scenario,
        intent,
      }),
    };
  }
}

async function applyBindingMutation(input: {
  readonly root: string;
  readonly context: ProductContext;
  readonly scenario: string;
  readonly operationId: string;
  readonly intent: unknown;
  readonly result: TaskMutationResult;
  readonly sharedPath: string;
  readonly sharedBefore: StoredBinding | null;
  readonly sharedAfter: TaskBinding;
  readonly localPath: string;
  readonly localBefore: StoredBinding | null;
  readonly localAfter: TaskBinding;
  readonly reservationGuard?: {
    readonly path: string;
    readonly before: StoredBinding | null;
    readonly after: TaskBinding;
  };
}): Promise<TaskOutcome<TaskMutationResult>> {
  await validateProductRecord("TaskBinding", input.sharedAfter);
  await validateProductRecord("TaskBinding", input.localAfter);
  if (input.reservationGuard !== undefined) await validateProductRecord("TaskBinding", input.reservationGuard.after);
  const sharedBytes = canonicalBytes(input.sharedAfter);
  const localBytes = canonicalBytes(input.localAfter);
  const guardBytes = input.reservationGuard === undefined ? null : canonicalBytes(input.reservationGuard.after);
  const plan: ProductMutationPlan = {
    root: input.root,
    productId: input.context.product_id,
    operationId: input.operationId,
    sessionId: randomUUID(),
    scenario: input.scenario,
    expectedRevision: input.context.target_revision,
    nextRevision: input.context.target_revision,
    intent: input.intent,
    result: input.result,
    targets: [
      {
        root: "store",
        binding_id: null,
        relative_path: input.sharedPath,
        before: input.sharedBefore?.sha256 ?? null,
        after: digest(sharedBytes),
      },
      {
        root: "workspace",
        binding_id: input.context.workspace_id,
        relative_path: input.localPath,
        before: input.localBefore?.sha256 ?? null,
        after: digest(localBytes),
      },
      ...(input.reservationGuard === undefined || guardBytes === null ? [] : [{
        root: "store" as const,
        binding_id: null,
        relative_path: input.reservationGuard.path,
        before: input.reservationGuard.before?.sha256 ?? null,
        after: digest(guardBytes),
      }]),
    ],
    saveObjects: async () => {
      if (input.reservationGuard !== undefined && guardBytes !== null) {
        await writeExpected(input.root, input.reservationGuard.path, input.reservationGuard.before?.sha256 ?? null, guardBytes);
      }
      await writeExpected(input.root, input.sharedPath, input.sharedBefore?.sha256 ?? null, sharedBytes);
    },
    saveLocalBinding: () => writeExpected(input.context.canonical_workspace, input.localPath, input.localBefore?.sha256 ?? null, localBytes),
    verifyTargets: async () => {
      await verifyBytes(input.root, input.sharedPath, sharedBytes);
      await verifyBytes(input.context.canonical_workspace, input.localPath, localBytes);
      if (input.reservationGuard !== undefined && guardBytes !== null) {
        await verifyBytes(input.root, input.reservationGuard.path, guardBytes);
      }
    },
  };
  const outcome = await runProductMutation(plan);
  return freshOutcome(input.root, input.context.canonical_workspace, outcome.result as TaskMutationResult, outcome.replayed);
}

async function applySafetyMutation(input: {
  readonly root: string;
  readonly context: ProductContext;
  readonly scenario: "product_safety_block" | "product_safety_resolve";
  readonly operationId: string;
  readonly intent: unknown;
  readonly result: TaskMutationResult;
  readonly blockBefore: StoredSafetyBlock | null;
  readonly blockAfter: SafetyBlock;
  readonly bindings: readonly {
    readonly before: StoredBinding;
    readonly after: TaskBinding;
  }[];
  readonly recovery?: ExactOperationResumeEvidence;
  readonly checkpoint?: (checkpoint: string) => Promise<void>;
}): Promise<TaskOutcome<TaskMutationResult>> {
  await validateProductRecord("SafetyBlock", input.blockAfter);
  for (const binding of input.bindings) await validateProductRecord("TaskBinding", binding.after);
  const blockBytes = canonicalBytes(input.blockAfter);
  const bindingBytes = input.bindings.map((binding) => canonicalBytes(binding.after));
  const blockPath = safetyBlockPath(input.context.product_id, input.blockAfter.id);
  const proposedTargets = [
    {
      root: "store" as const,
      binding_id: null,
      relative_path: blockPath,
      before: input.blockBefore?.sha256 ?? null,
      after: digest(blockBytes),
    },
    ...input.bindings.map((binding, index) => ({
      root: "store" as const,
      binding_id: null,
      relative_path: sharedBindingPath(input.context.product_id, binding.after.task_id),
      before: binding.before.sha256,
      after: digest(bindingBytes[index]!),
    })),
  ];
  const targets = input.recovery?.targets ?? proposedTargets;
  if (targets.length !== proposedTargets.length || proposedTargets.some((proposed) => {
    const recovered = targets.find((target) => target.relative_path === proposed.relative_path);
    return recovered === undefined
      || recovered.root !== proposed.root
      || recovered.binding_id !== proposed.binding_id
      || recovered.after !== proposed.after;
  })) {
    return fail("RECOVERY_REQUIRED", "Safety operation targets no longer match exact recovery evidence.");
  }
  const targetByPath = new Map(targets.map((target) => [target.relative_path, target]));
  const plan: ProductMutationPlan = {
    root: input.root,
    productId: input.context.product_id,
    operationId: input.operationId,
    sessionId: randomUUID(),
    scenario: input.scenario,
    expectedRevision: input.context.target_revision,
    nextRevision: input.context.target_revision,
    intent: input.intent,
    result: input.result,
    targets,
    saveObjects: async () => {
      await writeExpected(
        input.root,
        blockPath,
        targetByPath.get(blockPath)?.before ?? input.blockBefore?.sha256 ?? null,
        blockBytes,
      );
      await input.checkpoint?.("block");
      for (const [index, binding] of input.bindings.entries()) {
        const path = sharedBindingPath(input.context.product_id, binding.after.task_id);
        await writeExpected(
          input.root,
          path,
          targetByPath.get(path)?.before ?? binding.before.sha256,
          bindingBytes[index]!,
        );
        await input.checkpoint?.(`binding:${index}`);
      }
    },
    verifyTargets: async () => {
      await verifyBytes(input.root, blockPath, blockBytes);
      for (const [index, binding] of input.bindings.entries()) {
        await verifyBytes(
          input.root,
          sharedBindingPath(input.context.product_id, binding.after.task_id),
          bindingBytes[index]!,
        );
      }
    },
  };
  const outcome = input.recovery === undefined
    ? await runProductMutation(plan)
    : await resumeOperation(plan, input.recovery.inspectionToken);
  return freshOutcome(input.root, input.context.canonical_workspace, outcome.result as TaskMutationResult, outcome.replayed);
}

export async function reserveTaskSpecification(input: {
  readonly root: string;
  readonly context: string;
  readonly taskId: string;
  readonly specificationSlug: string;
}): Promise<TaskOutcome<TaskMutationResult>> {
  if (!TASK_PATTERN.test(input.taskId) || !SLUG_PATTERN.test(input.specificationSlug)) {
    return fail("INVALID_INPUT", "Task identity or specification slug is invalid.");
  }
  const context = decodeContext(input.context);
  const specificationId = deterministicUuid(`specification:${context.product_id}:${input.specificationSlug}`);
  const operationId = deterministicUuid(`task_specification_reserve:${context.product_id}:${input.taskId}:${input.specificationSlug}`);
  const intent = {
    schema_version: 1,
    kind: "operation_intent",
    scenario: "task_specification_reserve",
    input: { context: input.context, task_id: input.taskId, specification_slug: input.specificationSlug },
  } as const;
  const replayed = await replay(input.root, context, operationId, "task_specification_reserve", intent);
  if (replayed !== null) return replayed;
  await currentContext(input.root, input.context);
  await collectProductPins(input.root, input.context, input.taskId);
  const sharedPath = sharedBindingPath(context.product_id, input.taskId);
  const localPath = localBindingPath(input.specificationSlug);
  const guardPath = specificationReservationPath(context.product_id, specificationId);
  const sharedBefore = await readBinding(input.root, sharedPath);
  if (sharedBefore !== null) return fail("CONFLICT", "Product task already owns a specification reservation.");
  const guardBefore = await readBinding(input.root, guardPath);
  if (guardBefore !== null) return fail("CONFLICT", "Specification identity is already reserved by another product task.");
  const collisions = await listSharedBindings(input.root, context.product_id);
  if (collisions.some((record) => record.value.specification_id === specificationId || record.value.specification_slug === input.specificationSlug)) {
    return fail("CONFLICT", "Specification identity is already reserved by another product task.");
  }
  const localBefore = await readBinding(context.canonical_workspace, localPath);
  if (localBefore !== null) return fail("ALREADY_EXISTS", "Specification target already contains a workflow sidecar.");
  const directory = await safePath(context.canonical_workspace, specificationDirectory(input.specificationSlug), false, true);
  try {
    await lstat(directory);
    return fail("ALREADY_EXISTS", "Only a new absent specification target can be reserved.");
  } catch (error) {
    if (error instanceof WorkflowError) throw error;
    if (nodeErrorCode(error) !== "ENOENT") return fail("UNSAFE_PATH", "Specification target cannot be inspected safely.");
  }
  const binding: TaskBinding = {
    schema_version: 1,
    kind: "task_binding",
    product_id: context.product_id,
    task_id: input.taskId,
    specification_id: specificationId,
    specification_slug: input.specificationSlug,
    workspace_id: context.workspace_id,
    reservation_operation: operationId,
    state: "reserved",
    owner_session: null,
    current_packet: null,
    product_pins: [],
    product_source_version: null,
    specification_source_version: null,
    specification_version: null,
    specification_review_ref: null,
    plan_pins: [],
    safety_blocks: [],
    completed_packets: [],
  };
  const result = mutationResult(operationId, context, binding, "Create and approve this reserved task specification before planning.");
  return applyBindingMutation({
    root: input.root,
    context,
    scenario: "task_specification_reserve",
    operationId,
    intent,
    result,
    sharedPath,
    sharedBefore,
    sharedAfter: binding,
    localPath,
    localBefore,
    localAfter: binding,
    reservationGuard: { path: guardPath, before: guardBefore, after: binding },
  });
}

export async function registerTaskSpecificationCopy(input: {
  readonly root: string;
  readonly context: string;
  readonly taskId: string;
  readonly specificationId: string;
  readonly specificationSlug: string;
}): Promise<TaskOutcome<TaskMutationResult>> {
  if (!TASK_PATTERN.test(input.taskId) || !UUID_PATTERN.test(input.specificationId) || !SLUG_PATTERN.test(input.specificationSlug)) {
    return fail("INVALID_INPUT", "Task specification copy identity is invalid.");
  }
  const context = decodeContext(input.context);
  const operationId = deterministicUuid(`task_specification_register_copy:${context.product_id}:${context.workspace_id}:${input.taskId}:${input.specificationId}`);
  const intent = {
    schema_version: 1,
    kind: "operation_intent",
    scenario: "task_specification_register_copy",
    input: {
      context: input.context,
      task_id: input.taskId,
      specification_id: input.specificationId,
      specification_slug: input.specificationSlug,
    },
  } as const;
  const replayed = await replay(input.root, context, operationId, "task_specification_register_copy", intent);
  if (replayed !== null) return replayed;
  await currentContext(input.root, input.context);
  const sharedPath = sharedBindingPath(context.product_id, input.taskId);
  const shared = await readBinding(input.root, sharedPath);
  if (shared === null) return fail("NOT_FOUND", "A new reservation must exist before another working copy can register it.");
  if (shared.value.specification_id !== input.specificationId || shared.value.specification_slug !== input.specificationSlug) {
    return fail("CONFLICT", "Task specification copy does not match the shared reservation.");
  }
  const localPath = localBindingPath(input.specificationSlug);
  const localBefore = await readBinding(context.canonical_workspace, localPath);
  if (localBefore !== null && (
    localBefore.value.product_id !== context.product_id
    || localBefore.value.task_id !== input.taskId
    || localBefore.value.specification_id !== input.specificationId
    || localBefore.value.specification_slug !== input.specificationSlug
  )) return fail("CONFLICT", "Existing local specification sidecar belongs to another identity.");
  if (localBefore === null) {
    const directory = await safePath(context.canonical_workspace, specificationDirectory(input.specificationSlug), false, true);
    try {
      await lstat(directory);
      return fail("ALREADY_EXISTS", "Existing specification content cannot be enrolled as another working copy.");
    } catch (error) {
      if (error instanceof WorkflowError) throw error;
      if (nodeErrorCode(error) !== "ENOENT") return fail("UNSAFE_PATH", "Specification copy target cannot be inspected safely.");
    }
  }
  const localAfter: TaskBinding = {
    ...shared.value,
    workspace_id: context.workspace_id,
    owner_session: null,
    current_packet: null,
  };
  const result = mutationResult(operationId, context, shared.value, "This registered working copy can use the existing logical task specification.");
  return applyBindingMutation({
    root: input.root,
    context,
    scenario: "task_specification_register_copy",
    operationId,
    intent,
    result,
    sharedPath,
    sharedBefore: shared,
    sharedAfter: shared.value,
    localPath,
    localBefore,
    localAfter,
  });
}

export async function checkTaskInputs(input: {
  readonly root: string;
  readonly context: string;
  readonly taskId: string;
  readonly packetId?: string;
}): Promise<TaskOutcome<TaskCheckResult>> {
  if (!TASK_PATTERN.test(input.taskId)) return fail("INVALID_INPUT", "Task identity is invalid.");
  const requested = decodeContext(input.context);
  const requestedBinding = await requireTaskBinding(input.root, requested, input.taskId);
  const frozen = hasFrozenInputs(requestedBinding.shared.value);
  const context = await currentContext(input.root, input.context, frozen);
  const { shared } = await requireTaskBinding(input.root, context, input.taskId);
  const issues: TaskIssue[] = [];
  const pendingOperations = await pendingOperationsForTarget({
    root: input.root,
    productId: context.product_id,
    relativePath: sharedBindingPath(context.product_id, input.taskId),
  });
  if (pendingOperations.length > 0) {
    issues.push(issue(
      "RECOVERY_REQUIRED",
      "Task input transition is incomplete and requires exact operation recovery.",
    ));
  }
  let productPins: readonly SourcePin[] = frozen ? shared.value.product_pins : [];
  let sourceVersion = frozen
    ? shared.value.product_source_version ?? shared.value.product_pins[0]!.generation
    : context.target_revision;
  if (frozen) {
    for (const pin of productPins) {
      try {
        await verifySourcePin(input.root, pin);
      } catch (error) {
        if (!(error instanceof WorkflowError)) throw error;
        issues.push(issue(error.code.slice(0, 64), error.message.slice(0, 512)));
        break;
      }
    }
  } else {
    try {
      const product = await collectProductPins(input.root, input.context, input.taskId);
      productPins = product.pins;
      sourceVersion = product.sourceVersion;
    } catch (error) {
      if (!(error instanceof WorkflowError)) throw error;
      issues.push(issue(error.code.slice(0, 64), error.message.slice(0, 512)));
    }
  }
  if (shared.value.safety_blocks.length > 0) issues.push(issue("SAFETY_BLOCK", "Task has unresolved product safety blocks."));
  const specification = await specificationEvidence(
    context.canonical_workspace,
    shared.value.specification_slug,
    input.packetId,
  );
  issues.push(...specification.issues);
  if (frozen && (
    specification.sourceVersion !== shared.value.specification_source_version
    || specification.specificationVersion !== shared.value.specification_version
    || specification.reviewRef !== shared.value.specification_review_ref
    || !samePlanPins(specification.planPins, shared.value.plan_pins)
  )) issues.push(issue("SOURCE_CHANGED", "Frozen task specification or plan evidence changed after implementation started."));
  const passed = issues.length === 0;
  const result: TaskCheckResult = {
    status: passed ? "pass" : "fail",
    source_version: sourceVersion,
    issues: issues.slice(0, 100),
    semantic_correctness_proven: false,
    user_consent_authenticated: false,
    coverage_status: specification.coverageStatus,
    review_ref: specification.reviewRef,
    task_id: input.taskId,
    task_state: passed && shared.value.state !== "started" && shared.value.state !== "completed" ? "planned" : shared.value.state,
    product_pins: productPins,
    specification_source_version: specification.sourceVersion,
    specification_version: specification.specificationVersion,
    specification_review_ref: specification.reviewRef,
    plan_pins: specification.planPins,
  };
  await validateProductRecord("Success_TaskCheckResult", {
    protocol_version: 2,
    context: input.context,
    result,
    replayed: false,
    operation_ref: null,
  });
  return { context: input.context, result, replayed: false, operationRef: null };
}

type TaskCheckInput = Parameters<typeof checkTaskInputs>[0];
type TaskDetailsSection = "issues" | "product_pins" | "plan_pins";

function taskCheckRef(input: TaskCheckInput, checked: TaskOutcome<TaskCheckResult>): string {
  return digest(canonicalOperationValue({ root: input.root, context: input.context,
    task: input.taskId, packet: input.packetId ?? null, result: checked.result }));
}

function taskResponseFits(context: string | null, result: object): boolean {
  const envelope = { protocol_version: 2, context, result, replayed: false, operation_ref: null };
  const text = JSON.stringify(envelope);
  return Buffer.byteLength(text) <= 24 * 1024
    && Buffer.byteLength(JSON.stringify({ content: [{ type: "text", text }], structuredContent: envelope })) <= 64 * 1024;
}

/** Keep full evidence internal to packet transitions; transport only a bounded summary. */
export async function checkTaskInputsSummary(input: TaskCheckInput) {
  const checked = await checkTaskInputs(input);
  const { product_pins, plan_pins, issues, ...summary } = checked.result;
  const result = { ...summary, check_ref: taskCheckRef(input, checked),
    product_pin_count: product_pins.length, plan_pin_count: plan_pins.length,
    issue_count: issues.length, issues: issues.slice(0, 5), issues_truncated: issues.length > 5 };
  while (!taskResponseFits(checked.context, result) && result.issues.length > 0) {
    result.issues.pop();
    result.issues_truncated = true;
  }
  if (!taskResponseFits(checked.context, result)) return fail("RESULT_LIMIT", "Task check summary exceeds the supported context size.");
  return { ...checked, result };
}

export async function readTaskInputDetails(input: TaskCheckInput & {
  readonly checkRef: string;
  readonly section: TaskDetailsSection;
  readonly cursor?: string;
  readonly limit?: number;
}) {
  const limit = input.limit ?? 20;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100
    || !["issues", "product_pins", "plan_pins"].includes(input.section) || !DIGEST_PATTERN.test(input.checkRef)) {
    return fail("INVALID_INPUT", "Use a task check reference, supported detail section and limit 1–100.");
  }
  const checked = await checkTaskInputs(input);
  const checkRef = taskCheckRef(input, checked);
  if (checkRef !== input.checkRef) return fail("SOURCE_CHANGED", "Task inputs or check state changed; repeat task_inputs_check.");
  const values = checked.result[input.section];
  let index = 0;
  let offset = 0;
  if (input.cursor !== undefined) {
    let cursor: Record<string, unknown>;
    try { cursor = JSON.parse(Buffer.from(input.cursor, "base64url").toString("utf8")) as Record<string, unknown>; }
    catch { return fail("INVALID_CURSOR", "Task detail continuation is invalid."); }
    if (cursor === null || typeof cursor !== "object" || cursor.check_ref !== checkRef || cursor.section !== input.section
      || !Number.isSafeInteger(cursor.index) || !Number.isSafeInteger(cursor.offset)) {
      return fail("INVALID_CURSOR", "Task detail continuation does not match this check and section.");
    }
    index = cursor.index as number;
    offset = cursor.offset as number;
    if (index < 0 || index >= values.length || offset < 0) return fail("INVALID_CURSOR", "Task detail continuation is out of range.");
  }
  const items: { index: number; element_offset: number; complete: boolean; value: TaskIssue | SourcePin | PlanPin }[] = [];
  const continuation = (index: number, offset: number) => index >= values.length ? null
    : Buffer.from(JSON.stringify({ check_ref: checkRef, section: input.section, index, offset })).toString("base64url");
  const resultFor = (nextIndex: number, nextOffset: number) => ({ check_ref: checkRef, section: input.section,
    items, total_items: values.length, next_cursor: continuation(nextIndex, nextOffset), complete: nextIndex >= values.length });
  while (index < values.length && items.length < limit) {
    const value = values[index]!;
    const pin = "element_ids" in value ? value : undefined;
    if ((pin === undefined && offset !== 0) || (pin !== undefined && offset > 0 && offset >= pin.element_ids.length)) {
      return fail("INVALID_CURSOR", "Task detail element offset is out of range.");
    }
    let end = pin === undefined ? 0 : pin.element_ids.length;
    while (true) {
      const complete = pin === undefined || end === pin.element_ids.length;
      const entry = { index, element_offset: offset, complete,
        value: pin === undefined ? value : { ...pin, element_ids: pin.element_ids.slice(offset, end) } };
      const nextIndex = complete ? index + 1 : index;
      const nextOffset = complete ? 0 : end;
      items.push(entry);
      if (taskResponseFits(checked.context, resultFor(nextIndex, nextOffset))) {
        index = nextIndex;
        offset = nextOffset;
        break;
      }
      items.pop();
      if (items.length > 0) return { ...checked, result: resultFor(index, offset) };
      if (pin === undefined || end - offset <= 1) return fail("RESULT_LIMIT", "One task detail cannot fit within the response budget.");
      end = offset + Math.ceil((end - offset) / 2);
    }
  }
  return { ...checked, result: resultFor(index, offset) };
}

export async function startTaskPacket(input: {
  readonly root: string;
  readonly context: string;
  readonly taskId: string;
  readonly packetId: string;
  readonly invocationSource: string;
}): Promise<TaskOutcome<TaskMutationResult>> {
  if (!TASK_PATTERN.test(input.taskId) || input.packetId.length === 0 || input.packetId.length > 128
    || input.invocationSource.length === 0 || input.invocationSource.length > 512) {
    return fail("INVALID_INPUT", "Task packet start input is invalid.");
  }
  const packet = packetIdentity(input.packetId);
  assertNonSensitive([input.invocationSource]);
  const context = decodeContext(input.context);
  const operationId = deterministicUuid(`task_packet_start:${context.product_id}:${input.taskId}:${packet.id}:${digest(input.invocationSource)}:${digest(input.context)}`);
  const intent = {
    schema_version: 1,
    kind: "operation_intent",
    scenario: "task_packet_start",
    input: {
      context: input.context,
      task_id: input.taskId,
      packet_id: packet.id,
      invocation_source: input.invocationSource,
    },
  } as const;
  const replayed = await replay(input.root, context, operationId, "task_packet_start", intent);
  if (replayed !== null) return replayed;
  const requested = decodeContext(input.context);
  const requestedBindings = await requireTaskBinding(input.root, requested, input.taskId);
  const selected = await currentContext(
    input.root,
    input.context,
    hasFrozenInputs(requestedBindings.shared.value),
  );
  const bindings = await requireTaskBinding(input.root, selected, input.taskId);
  if (bindings.shared.value.state === "started") {
    return fail("CONFLICT", "Another implementation owner already holds this task.");
  }
  if (bindings.shared.value.state === "completed") return fail("INVALID_STATE", "Completed task cannot start another packet.");
  if (bindings.shared.value.completed_packets.some((completed) => completed.packet_id === packet.id)) {
    return fail("INVALID_STATE", "Completed implementation packet cannot be started again.");
  }
  const checked = await checkTaskInputs({
    root: input.root,
    context: input.context,
    taskId: input.taskId,
    packetId: packet.id,
  });
  if (checked.result.status !== "pass") return fail("PREREQUISITE_REQUIRED", "Task inputs are not ready for implementation.", { issues: checked.result.issues });
  const next: TaskBinding = {
    ...bindings.shared.value,
    workspace_id: selected.workspace_id,
    state: "started",
    owner_session: operationId,
    current_packet: packet.id,
    product_pins: checked.result.product_pins,
    product_source_version: checked.result.source_version,
    specification_source_version: checked.result.specification_source_version,
    specification_version: checked.result.specification_version,
    specification_review_ref: checked.result.specification_review_ref,
    plan_pins: checked.result.plan_pins,
  };
  const result = mutationResult(operationId, selected, next, "Implement only this packet against the saved exact pins, then record evidence.");
  return applyBindingMutation({
    root: input.root,
    context: selected,
    scenario: "task_packet_start",
    operationId,
    intent,
    result,
    sharedPath: sharedBindingPath(selected.product_id, input.taskId),
    sharedBefore: bindings.shared,
    sharedAfter: next,
    localPath: localBindingPath(next.specification_slug),
    localBefore: bindings.local,
    localAfter: next,
  });
}

export async function completeTaskPacket(input: {
  readonly root: string;
  readonly context: string;
  readonly taskId: string;
  readonly packetId: string;
  readonly ownerRef: string;
  readonly evidenceRefs: readonly string[];
  readonly taskFinished: boolean;
}): Promise<TaskOutcome<TaskMutationResult>> {
  if (!TASK_PATTERN.test(input.taskId) || input.packetId.length === 0 || input.packetId.length > 128
    || !UUID_PATTERN.test(input.ownerRef)
    || input.evidenceRefs.length === 0 || input.evidenceRefs.length > 100
    || input.evidenceRefs.some((reference) => reference.length === 0 || reference.length > 1024)
    || new Set(input.evidenceRefs).size !== input.evidenceRefs.length) {
    return fail("INVALID_INPUT", "Task packet completion requires unique bounded evidence references.");
  }
  const packet = packetIdentity(input.packetId);
  assertNonSensitive(input.evidenceRefs);
  const context = decodeContext(input.context);
  const operationId = deterministicUuid(`task_packet_complete:${context.product_id}:${input.taskId}:${packet.id}:${input.ownerRef}:${digest(JSON.stringify(input.evidenceRefs))}:${input.taskFinished}:${digest(input.context)}`);
  const intent = {
    schema_version: 1,
    kind: "operation_intent",
    scenario: "task_packet_complete",
    input: {
      context: input.context,
      task_id: input.taskId,
      packet_id: packet.id,
      owner_ref: input.ownerRef,
      evidence_refs: input.evidenceRefs,
      task_finished: input.taskFinished,
    },
  } as const;
  const replayed = await replay(input.root, context, operationId, "task_packet_complete", intent);
  if (replayed !== null) return replayed;
  const requested = decodeContext(input.context);
  const requestedBindings = await requireTaskBinding(input.root, requested, input.taskId);
  const selected = await currentContext(
    input.root,
    input.context,
    requestedBindings.shared.value.state === "started" && hasFrozenInputs(requestedBindings.shared.value),
  );
  const bindings = await requireTaskBinding(input.root, selected, input.taskId);
  if (
    bindings.shared.value.state !== "started"
    || bindings.shared.value.current_packet !== packet.id
    || bindings.shared.value.owner_session !== input.ownerRef
    || bindings.local.value.owner_session !== bindings.shared.value.owner_session
    || bindings.local.value.current_packet !== packet.id
  ) return fail("CONFLICT", "Only the current packet owner can complete this implementation packet.");
  if (bindings.shared.value.completed_packets.some((completed) => completed.packet_id === packet.id)) {
    return fail("INVALID_STATE", "Implementation packet is already complete.");
  }
  const checked = await checkTaskInputs({
    root: input.root,
    context: input.context,
    taskId: input.taskId,
    packetId: packet.id,
  });
  if (checked.result.status !== "pass") {
    return fail("PREREQUISITE_REQUIRED", "Frozen task inputs changed before packet completion.", { issues: checked.result.issues });
  }
  const planned = plannedPacketIds(bindings.shared.value.plan_pins);
  if (!planned.includes(packet.id)) return fail("INVALID_STATE", "Current packet is absent from the frozen task plan.");
  const completedIds = new Set([
    ...bindings.shared.value.completed_packets.map((completed) => completed.packet_id),
    packet.id,
  ]);
  const allPlannedPacketsComplete = planned.every((plannedId) => completedIds.has(plannedId));
  if (input.taskFinished && !allPlannedPacketsComplete) {
    return fail("PREREQUISITE_REQUIRED", "Task cannot complete before every frozen plan packet has verification evidence.");
  }
  if (!input.taskFinished && allPlannedPacketsComplete) {
    return fail("INVALID_INPUT", "The final frozen plan packet must complete the task explicitly.");
  }
  const completed: CompletedPacket = {
    packet_id: packet.id,
    evidence_refs: [...input.evidenceRefs],
    operation_id: operationId,
  };
  const next: TaskBinding = {
    ...bindings.shared.value,
    workspace_id: selected.workspace_id,
    state: input.taskFinished ? "completed" : "planned",
    owner_session: null,
    current_packet: null,
    completed_packets: [...bindings.shared.value.completed_packets, completed],
  };
  const nextInstruction = input.taskFinished
    ? "The task is complete; independent review remains a separate optional invocation."
    : "Start another packet only through a new explicit incremental implementation invocation.";
  const result = mutationResult(operationId, selected, next, nextInstruction);
  return applyBindingMutation({
    root: input.root,
    context: selected,
    scenario: "task_packet_complete",
    operationId,
    intent,
    result,
    sharedPath: sharedBindingPath(selected.product_id, input.taskId),
    sharedBefore: bindings.shared,
    sharedAfter: next,
    localPath: localBindingPath(next.specification_slug),
    localBefore: bindings.local,
    localAfter: next,
  });
}

export async function recordSafetyBlock(input: {
  readonly root: string;
  readonly context: string;
  readonly affectedRefs: readonly Ref[];
  readonly affectedTaskIds: readonly string[];
  readonly reason: "security" | "incompatibility" | "uncertain_impact";
  readonly explanation: string;
  readonly sourceRef: DecisionRef;
}, hooks: {
  readonly checkpoint?: (checkpoint: string) => Promise<void>;
} = {}): Promise<TaskOutcome<TaskMutationResult>> {
  if (input.affectedTaskIds.length === 0 || input.affectedTaskIds.length > 100
    || new Set(input.affectedTaskIds).size !== input.affectedTaskIds.length
    || input.affectedTaskIds.some((taskId) => !TASK_PATTERN.test(taskId))
    || input.affectedRefs.length > 100
    || input.explanation.length === 0 || input.explanation.length > 4096
    || !["security", "incompatibility", "uncertain_impact"].includes(input.reason)) {
    return fail("INVALID_INPUT", "Safety block input is invalid.");
  }
  assertNonSensitive([input.explanation]);
  const decoded = decodeContext(input.context);
  const affectedRefs = input.affectedRefs.map(normalizedRef);
  const sourceRef = normalizedDecisionRef(input.sourceRef);
  const scenarioInput = {
    affected_refs: affectedRefs,
    affected_task_ids: input.affectedTaskIds,
    reason: input.reason,
    explanation: input.explanation,
    source_ref: sourceRef,
  };
  const operationId = deterministicUuid(`product_safety_block:${decoded.product_id}:${decoded.workspace_id}:${decoded.target_revision}:${canonicalOperationValue(scenarioInput)}`);
  const intent = { schema_version: 1 as const, kind: "operation_intent" as const, scenario: "product_safety_block", input: { context: input.context, ...scenarioInput } };
  const replayed = await replayOrRecoverSafety(input.root, decoded, operationId, "product_safety_block", intent);
  if (replayed.outcome !== null) return replayed.outcome;
  const context = await currentContext(input.root, input.context);
  if (affectedRefs.some((reference) => reference.product_id !== context.product_id)
    || sourceRef.product_id !== context.product_id) {
    return fail("NOT_FOUND", "Safety block references another product.");
  }
  const source = await currentDecision(input.root, context, sourceRef);
  if (!["observed", "answered"].includes(source.state)) {
    return fail("PREREQUISITE_REQUIRED", "Safety block requires a concrete current finding decision.");
  }
  const inventory = await listSharedBindings(input.root, context.product_id);
  const selected = input.affectedTaskIds.map((taskId) => {
    const binding = inventory.find((entry) => entry.value.task_id === taskId);
    if (binding === undefined) return fail("NOT_FOUND", "Affected safety task does not have a product binding.");
    return binding;
  });
  const block: SafetyBlock = {
    schema_version: 1,
    kind: "safety_block",
    id: operationId,
    product_id: context.product_id,
    affected_refs: affectedRefs,
    affected_task_ids: [...input.affectedTaskIds],
    reason: input.reason,
    explanation: input.explanation,
    source: sourceRef,
    resolution: null,
  };
  const bindings = selected.map((before) => ({
    before,
    after: (() => {
      if (!before.value.safety_blocks.includes(operationId) && before.value.safety_blocks.length >= 100) {
        return fail("SOURCE_LIMIT", "Task has too many unresolved product safety blocks.");
      }
      return {
        ...before.value,
        safety_blocks: before.value.safety_blocks.includes(operationId)
          ? before.value.safety_blocks
          : [...before.value.safety_blocks, operationId],
      };
    })(),
  }));
  const result: TaskMutationResult = {
    operation_ref: operationId,
    applied: true,
    candidate_ref: null,
    changed_refs: affectedRefs,
    decision_ref: sourceRef,
    question_ref: null,
    product_id: context.product_id,
    workspace_id: context.workspace_id,
    task_id: input.affectedTaskIds.length === 1 ? input.affectedTaskIds[0]! : null,
    specification_id: null,
    review_ref: null,
    next: "Pause affected checkpoints and obtain explicit user disposition through the owning product interview.",
    document_id: null,
  };
  return applySafetyMutation({
    root: input.root,
    context,
    scenario: "product_safety_block",
    operationId,
    intent,
    result,
    blockBefore: null,
    blockAfter: block,
    bindings,
    ...(replayed.recovery === undefined ? {} : { recovery: replayed.recovery }),
    ...(hooks.checkpoint === undefined ? {} : { checkpoint: hooks.checkpoint }),
  });
}

export async function resolveSafetyBlock(input: {
  readonly root: string;
  readonly context: string;
  readonly blockId: string;
  readonly answerRef: DecisionRef;
}, hooks: {
  readonly checkpoint?: (checkpoint: string) => Promise<void>;
} = {}): Promise<TaskOutcome<TaskMutationResult>> {
  if (!UUID_PATTERN.test(input.blockId)) return fail("INVALID_INPUT", "Safety block identity is invalid.");
  const decoded = decodeContext(input.context);
  const answerRef = normalizedDecisionRef(input.answerRef);
  const scenarioInput = { block_id: input.blockId, answer_ref: answerRef };
  const operationId = deterministicUuid(`product_safety_resolve:${decoded.product_id}:${decoded.workspace_id}:${decoded.target_revision}:${canonicalOperationValue(scenarioInput)}`);
  const intent = { schema_version: 1 as const, kind: "operation_intent" as const, scenario: "product_safety_resolve", input: { context: input.context, ...scenarioInput } };
  const replayed = await replayOrRecoverSafety(input.root, decoded, operationId, "product_safety_resolve", intent);
  if (replayed.outcome !== null) return replayed.outcome;
  const context = await currentContext(input.root, input.context);
  const block = await readSafetyBlock(input.root, context.product_id, input.blockId);
  if (block === null) return fail("NOT_FOUND", "Safety block does not exist.");
  if (block.value.resolution !== null
    && (replayed.recovery === undefined || !sameDecisionRef(block.value.resolution, answerRef))) {
    return fail("INVALID_STATE", "Safety block already has an explicit disposition.");
  }
  const answer = await currentDecision(input.root, context, answerRef);
  if (answer.state !== "answered") {
    return fail("PREREQUISITE_REQUIRED", "Safety block resolution requires an explicit answered user disposition.");
  }
  if (!answer.predecessors.some((reference) => sameDecisionRef(reference, block.value.source))) {
    return fail("PREREQUISITE_REQUIRED", "Answered disposition must explicitly continue the finding that created this safety block.");
  }
  const inventory = await listSharedBindings(input.root, context.product_id);
  const selected = block.value.affected_task_ids.map((taskId) => {
    const binding = inventory.find((entry) => entry.value.task_id === taskId);
    if (binding === undefined) return fail("NOT_FOUND", "Affected safety task binding is unavailable.");
    if (!binding.value.safety_blocks.includes(input.blockId) && replayed.recovery === undefined) {
      return fail("SOURCE_CHANGED", "Affected task no longer contains the unresolved safety block.");
    }
    return binding;
  });
  const bindings = selected.map((before) => ({
    before,
    after: { ...before.value, safety_blocks: before.value.safety_blocks.filter((id) => id !== input.blockId) },
  }));
  const resolved: SafetyBlock = { ...block.value, resolution: answerRef };
  const result: TaskMutationResult = {
    operation_ref: operationId,
    applied: true,
    candidate_ref: null,
    changed_refs: [...block.value.affected_refs],
    decision_ref: answerRef,
    question_ref: null,
    product_id: context.product_id,
    workspace_id: context.workspace_id,
    task_id: block.value.affected_task_ids.length === 1 ? block.value.affected_task_ids[0]! : null,
    specification_id: null,
    review_ref: null,
    next: "Recheck affected task inputs; requirement changes still require reviewed amendment activation.",
    document_id: null,
  };
  return applySafetyMutation({
    root: input.root,
    context,
    scenario: "product_safety_resolve",
    operationId,
    intent,
    result,
    blockBefore: block,
    blockAfter: resolved,
    bindings,
    ...(replayed.recovery === undefined ? {} : { recovery: replayed.recovery }),
    ...(hooks.checkpoint === undefined ? {} : { checkpoint: hooks.checkpoint }),
  });
}
