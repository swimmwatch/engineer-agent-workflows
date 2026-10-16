import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, readdir, rename, unlink } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { dirname } from "node:path";

import { fail, WorkflowError } from "../state.js";
import { validateProductPath } from "./config.js";
import { loadGeneration, readGenerationMetadata, readObject, saveObject } from "./storage.js";
import { validateProductRecord } from "./schemas.js";

const MAX_SOURCE_BYTES = 16 * 1024 * 1024;
const MAX_STRUCTURED_RESULT_BYTES = 24 * 1024;
const MAX_COMPLETE_RESULT_BYTES = 64 * 1024;
const MAX_OPERATION_RECORDS = 10_000;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/u;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

const SCENARIOS = new Set([
  "product_initialize",
  "product_bind_workspace",
  "product_artifact_draft",
  "product_scope_propose",
  "product_scope_confirm",
  "product_question_prepare",
  "product_question_answer",
  "product_question_no_answer",
  "product_record_instruction",
  "product_record_observation",
  "product_record_assumption",
  "product_record_research",
  "product_document_create_subject",
  "product_document_move_elements",
  "product_document_rename",
  "product_document_begin_edit",
  "product_document_inspect_edits",
  "idea_define_problem",
  "idea_compare_direction",
  "idea_choose_direction",
  "prd_define_actor",
  "prd_define_goal",
  "prd_define_capability",
  "prd_define_use_case",
  "prd_define_rule",
  "prd_define_constraint",
  "prd_define_term",
  "technical_define_boundary",
  "technical_define_technology",
  "technical_define_policy",
  "roadmap_define_stage",
  "roadmap_define_epic",
  "roadmap_define_story",
  "roadmap_define_task",
  "roadmap_link_dependency",
  "roadmap_split_task",
  "roadmap_record_stage_outcome",
  "product_document_accept_edits",
  "product_review_start",
  "product_review_record",
  "product_review_record_batch",
  "product_review_consistency_record",
  "product_review_complete",
  "product_review_scope_expand",
  "product_amendment_activate",
  "product_amendment_prepare",
  "product_amendment_rebase",
  "task_specification_reserve",
  "task_specification_register_copy",
  "task_packet_start",
  "task_packet_complete",
  "product_safety_block",
  "product_safety_resolve",
  "product_operation_resume",
  "product_operation_abandon",
]);

type OperationPhase = "prepared" | "objects_saved" | "local_binding_saved" | "published" | "complete" | "blocked" | "abandoned";
type CheckpointPhase = OperationPhase | "head_written";

interface OperationOwner {
  readonly session_id: string;
  readonly pid: number;
}

export interface OperationTarget {
  readonly root: "store" | "workspace";
  readonly binding_id: string | null;
  readonly relative_path: string;
  readonly before: string | null;
  readonly after: string;
}

interface OperationRecord {
  readonly schema_version: 1;
  readonly kind: "operation";
  readonly id: string;
  readonly product_id: string;
  readonly request_digest: string;
  readonly base_revision: string | null;
  readonly phase: OperationPhase;
  readonly owner: OperationOwner;
  readonly targets: readonly OperationTarget[];
  readonly result_sha256: string | null;
  readonly blocker: string | null;
  readonly scenario: string;
  readonly intent_sha256: string;
}

interface LockRecord {
  readonly schema_version: 1;
  readonly kind: "lock";
  readonly operation_id: string;
  readonly session_id: string;
  readonly pid: number;
  readonly expected_revision: string | null;
}

interface HeadRecord {
  readonly schema_version: 1;
  readonly kind: "head";
  readonly product_id: string;
  readonly generation: string;
  readonly operation_id: string;
}

export interface ProductMutationPlan {
  readonly root: string;
  readonly productId: string;
  readonly operationId: string;
  readonly sessionId: string;
  readonly scenario: string;
  readonly expectedRevision: string | null;
  readonly nextRevision: string;
  readonly intent: unknown;
  readonly result: Record<string, unknown>;
  readonly resultDefinition?: "Success_MutationResult" | "Success_EditResult" | "Success_ReviewStatus";
  readonly targets?: readonly OperationTarget[];
  readonly saveObjects?: (mode: "start" | "resume") => Promise<void>;
  readonly saveLocalBinding?: () => Promise<void>;
  readonly verifyTargets?: () => Promise<void>;
  readonly verifyReviewSources?: () => Promise<void>;
  checkpoint?: (phase: CheckpointPhase) => Promise<void>;
}

export interface PersistedMutationReplay {
  readonly operationRef: string;
  readonly replayed: true;
  readonly revision: string;
  readonly result: Record<string, unknown>;
}

async function verifyPlannedGeneration(plan: ProductMutationPlan): Promise<void> {
  if (plan.verifyReviewSources === undefined) {
    await loadGeneration(plan.root, plan.productId, plan.nextRevision);
    return;
  }
  if (plan.expectedRevision !== plan.nextRevision || ![
    "product_review_record", "product_review_record_batch", "product_review_consistency_record",
  ].includes(plan.scenario)) return fail("INVALID_INPUT", "Staged verification is limited to same-generation review writes.");
  await readGenerationMetadata(plan.root, plan.productId, plan.nextRevision);
  await plan.verifyReviewSources();
}

export interface ProductMutationOutcome {
  readonly operationRef: string;
  readonly replayed: boolean;
  readonly revision: string;
  readonly result: Record<string, unknown>;
}

export interface OperationInspection {
  readonly operationRef: string;
  readonly state: "applied" | "not_applied" | "incomplete" | "blocked";
  readonly phase: OperationPhase;
  readonly inspectionToken: string | null;
  readonly issues: readonly string[];
}

export interface ExactOperationResumeEvidence {
  readonly inspectionToken: string;
  readonly targets: readonly OperationTarget[] | null;
}

function nodeErrorCode(error: unknown): string | undefined {
  if (error === null || typeof error !== "object" || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

function assertUuid(value: string, label: string): void {
  if (!UUID_PATTERN.test(value)) return fail("INVALID_INPUT", `${label} is invalid.`);
}

function assertDigest(value: string | null, label: string): void {
  if (value !== null && !DIGEST_PATTERN.test(value)) return fail("INVALID_INPUT", `${label} is invalid.`);
}

function digest(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function visitCanonicalJson(value: unknown, emit: (fragment: string) => void, active: Set<object>): void {
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) return fail("INVALID_INPUT", "Mutation input cannot be serialized deterministically.");
    emit(encoded);
    return;
  }
  if (typeof value !== "object") return fail("INVALID_INPUT", "Mutation input cannot be serialized deterministically.");
  if (active.has(value)) return fail("INVALID_INPUT", "Mutation input cannot contain recursive data.");
  active.add(value);
  if (Array.isArray(value)) {
    emit("[");
    value.forEach((nested, index) => {
      if (index > 0) emit(",");
      visitCanonicalJson(nested, emit, active);
    });
    emit("]");
  } else {
    emit("{");
    Object.keys(value).sort().forEach((key, index) => {
      if (index > 0) emit(",");
      emit(JSON.stringify(key));
      emit(":");
      visitCanonicalJson((value as Record<string, unknown>)[key], emit, active);
    });
    emit("}");
  }
  active.delete(value);
}

function canonicalBytes(value: unknown, limit = MAX_SOURCE_BYTES, code = "SOURCE_LIMIT"): Buffer {
  let size = 0;
  const measure = (fragment: string): void => {
    const fragmentSize = Buffer.byteLength(fragment, "utf8");
    if (fragmentSize > limit - size) return fail(code, "Mutation data exceeds its supported size limit.");
    size += fragmentSize;
  };
  visitCanonicalJson(value, measure, new Set());
  measure("\n");
  const result = Buffer.allocUnsafe(size);
  let offset = 0;
  visitCanonicalJson(value, (fragment) => {
    offset += result.write(fragment, offset, "utf8");
  }, new Set());
  offset += result.write("\n", offset, "utf8");
  if (offset !== size) return fail("INVALID_STATE", "Mutation data could not be serialized deterministically.");
  return result;
}

async function closeHandle(handle: FileHandle | undefined, message: string): Promise<void> {
  if (handle === undefined) return;
  try {
    await handle.close();
  } catch {
    return fail("INVALID_STATE", message);
  }
}

async function readMutable(root: string, relativePath: string): Promise<Buffer | null> {
  const path = await validateProductPath(root, relativePath);
  let pathStat;
  try {
    pathStat = await lstat(path);
  } catch (error) {
    if (nodeErrorCode(error) === "ENOENT") return null;
    return fail("INVALID_STATE", "Product checkpoint cannot be inspected safely.");
  }
  if (pathStat.isSymbolicLink() || !pathStat.isFile() || pathStat.nlink !== 1) {
    return fail("UNSAFE_PATH", "Product checkpoint must be a regular single-link file.");
  }
  if (pathStat.size > MAX_SOURCE_BYTES) return fail("SOURCE_LIMIT", "Product checkpoint exceeds the 16 MiB limit.");

  let handle: FileHandle | undefined;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = await handle.stat();
    if (before.dev !== pathStat.dev || before.ino !== pathStat.ino || before.size !== pathStat.size) {
      return fail("SOURCE_CHANGED", "Product checkpoint changed before it could be read.");
    }
    const value = Buffer.alloc(before.size);
    let offset = 0;
    while (offset < value.length) {
      const { bytesRead } = await handle.read(value, offset, value.length - offset, offset);
      if (bytesRead === 0) return fail("SOURCE_CHANGED", "Product checkpoint changed while it was read.");
      offset += bytesRead;
    }
    const after = await handle.stat();
    const finalPath = await lstat(path);
    if (
      finalPath.isSymbolicLink()
      || finalPath.nlink !== 1
      || before.dev !== after.dev
      || before.ino !== after.ino
      || before.size !== after.size
      || before.mtimeMs !== after.mtimeMs
      || before.ctimeMs !== after.ctimeMs
      || after.dev !== finalPath.dev
      || after.ino !== finalPath.ino
      || after.size !== finalPath.size
    ) {
      return fail("SOURCE_CHANGED", "Product checkpoint changed while it was read.");
    }
    return value;
  } catch (error) {
    if (error instanceof WorkflowError) throw error;
    if (nodeErrorCode(error) === "ENOENT" || nodeErrorCode(error) === "ELOOP") {
      return fail("SOURCE_CHANGED", "Product checkpoint changed while it was read.");
    }
    return fail("INVALID_STATE", "Product checkpoint cannot be read safely.");
  } finally {
    await closeHandle(handle, "Product checkpoint cannot be closed safely.");
  }
}

async function atomicWrite(root: string, relativePath: string, value: Buffer): Promise<void> {
  let path = await validateProductPath(root, relativePath);
  try {
    await mkdir(dirname(path), { recursive: true });
  } catch {
    return fail("INVALID_STATE", "Product checkpoint directory cannot be created safely.");
  }
  path = await validateProductPath(root, relativePath);
  const temporaryRelative = `${relativePath}.${randomUUID()}.tmp`;
  const temporaryPath = await validateProductPath(root, temporaryRelative);
  let handle: FileHandle | undefined;
  let installed = false;
  try {
    handle = await open(temporaryPath, "wx", 0o600);
    await handle.writeFile(value);
    await handle.sync();
    await closeHandle(handle, "Product checkpoint temporary file cannot be closed safely.");
    handle = undefined;
    await rename(temporaryPath, path);
    installed = true;
  } catch (error) {
    if (error instanceof WorkflowError) throw error;
    return fail("INVALID_STATE", "Product checkpoint cannot be replaced safely.");
  } finally {
    await closeHandle(handle, "Product checkpoint temporary file cannot be closed safely.");
    if (!installed) await unlink(temporaryPath).catch((error: unknown) => {
      if (nodeErrorCode(error) !== "ENOENT") return fail("INVALID_STATE", "Product checkpoint temporary file cannot be removed safely.");
    });
  }
}

function operationPath(productId: string, operationId: string): string {
  return `products/${productId}/operations/${operationId}.yaml`;
}

function lockPath(productId: string): string {
  return `products/${productId}/lock.yaml`;
}

function headPath(productId: string): string {
  return `products/${productId}/head.yaml`;
}

async function parseRecord<T>(definition: "Operation" | "Lock" | "Head", bytes: Buffer): Promise<T> {
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    return fail("INVALID_STATE", "Product checkpoint is not supported deterministic YAML.");
  }
  return await validateProductRecord(definition, value) as T;
}

async function readOperation(root: string, productId: string, operationId: string): Promise<{ record: OperationRecord; bytes: Buffer } | null> {
  const value = await readMutable(root, operationPath(productId, operationId));
  if (value === null) return null;
  const record = await parseRecord<OperationRecord>("Operation", value);
  if (record.id !== operationId || record.product_id !== productId) {
    return fail("SOURCE_CHANGED", "Product operation identity does not match its retained path.");
  }
  return { record, bytes: value };
}

async function readLock(root: string, productId: string): Promise<{ record: LockRecord; bytes: Buffer } | null> {
  const value = await readMutable(root, lockPath(productId));
  if (value === null) return null;
  return { record: await parseRecord<LockRecord>("Lock", value), bytes: value };
}

async function readHead(root: string, productId: string): Promise<{ record: HeadRecord; bytes: Buffer } | null> {
  const value = await readMutable(root, headPath(productId));
  if (value === null) return null;
  const record = await parseRecord<HeadRecord>("Head", value);
  if (record.product_id !== productId) return fail("SOURCE_CHANGED", "Product head belongs to another product.");
  return { record, bytes: value };
}

async function writeOperation(root: string, record: OperationRecord): Promise<Buffer> {
  await validateProductRecord("Operation", record);
  const bytes = canonicalBytes(record);
  await atomicWrite(root, operationPath(record.product_id, record.id), bytes);
  return bytes;
}

async function removeOwnedPartialLock(path: string, identity: { dev: number; ino: number }): Promise<void> {
  let current;
  try {
    current = await lstat(path);
  } catch (error) {
    if (nodeErrorCode(error) === "ENOENT") return;
    return fail("INVALID_STATE", "Partial product lock cannot be inspected safely.");
  }
  if (
    current.isSymbolicLink()
    || !current.isFile()
    || current.nlink !== 1
    || current.dev !== identity.dev
    || current.ino !== identity.ino
  ) {
    return fail("INVALID_STATE", "Partial product lock ownership changed before cleanup.");
  }
  try {
    await unlink(path);
  } catch (error) {
    if (nodeErrorCode(error) !== "ENOENT") {
      return fail("INVALID_STATE", "Partial product lock cannot be removed safely.");
    }
  }
}

async function writeLock(root: string, productId: string, record: LockRecord): Promise<Buffer> {
  await validateProductRecord("Lock", record);
  const bytes = canonicalBytes(record);
  const relativePath = lockPath(productId);
  let path = await validateProductPath(root, relativePath);
  await mkdir(dirname(path), { recursive: true }).catch(() => fail("INVALID_STATE", "Product lock directory cannot be created safely."));
  path = await validateProductPath(root, relativePath);
  let handle: FileHandle | undefined;
  let identity: { dev: number; ino: number } | undefined;
  try {
    handle = await open(path, "wx", 0o600);
    const created = await handle.stat();
    identity = { dev: created.dev, ino: created.ino };
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = undefined;
  } catch (error) {
    if (handle !== undefined) {
      await handle.close().catch(() => undefined);
    }
    if (identity !== undefined) await removeOwnedPartialLock(path, identity);
    if (nodeErrorCode(error) === "EEXIST") return fail("BUSY", "Another product operation owns the cooperative lock.");
    if (error instanceof WorkflowError) throw error;
    return fail("INVALID_STATE", "Product lock cannot be created safely.");
  }
  return bytes;
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return nodeErrorCode(error) !== "ESRCH";
  }
}

async function releaseLock(root: string, productId: string, operationId: string, sessionId: string): Promise<void> {
  const current = await readLock(root, productId);
  if (current === null) return;
  if (current.record.operation_id !== operationId || current.record.session_id !== sessionId) {
    return fail("RECOVERY_REQUIRED", "Product lock ownership changed before release.");
  }
  try {
    await unlink(await validateProductPath(root, lockPath(productId)));
  } catch (error) {
    if (nodeErrorCode(error) !== "ENOENT") return fail("INVALID_STATE", "Product lock cannot be released safely.");
  }
}

async function acquireNewLock(plan: ProductMutationPlan): Promise<void> {
  const existing = await readLock(plan.root, plan.productId);
  if (existing !== null) {
    if (processAlive(existing.record.pid)) return fail("BUSY", "Another product operation owns the cooperative lock.");
    return fail("RECOVERY_REQUIRED", "A stopped product operation requires explicit inspection and recovery.");
  }
  await writeLock(plan.root, plan.productId, {
    schema_version: 1,
    kind: "lock",
    operation_id: plan.operationId,
    session_id: plan.sessionId,
    pid: process.pid,
    expected_revision: plan.expectedRevision,
  });
}

async function acquireRecoveryLock(plan: ProductMutationPlan, observed: { record: LockRecord; bytes: Buffer } | null): Promise<void> {
  if (observed === null) {
    await acquireNewLock(plan);
    return;
  }
  if (observed.record.operation_id !== plan.operationId) {
    return fail("BUSY", "Another product operation owns the cooperative lock.");
  }
  if (processAlive(observed.record.pid)) return fail("BUSY", "The recorded product operation owner is still active.");

  const claimRelative = `${lockPath(plan.productId)}.recovery`;
  let claimPath = await validateProductPath(plan.root, claimRelative);
  const claim = canonicalBytes({ operation_id: plan.operationId, observed_lock: digest(observed.bytes), pid: process.pid });
  let claimHandle: FileHandle | undefined;
  let claimOwned = false;
  try {
    claimHandle = await open(claimPath, "wx", 0o600);
    claimOwned = true;
    await claimHandle.writeFile(claim);
    await claimHandle.sync();
    await closeHandle(claimHandle, "Product recovery claim cannot be closed safely.");
    claimHandle = undefined;
    const current = await readLock(plan.root, plan.productId);
    if (current === null || digest(current.bytes) !== digest(observed.bytes)) {
      return fail("RECOVERY_REQUIRED", "Product lock changed during recovery inspection.");
    }
    const replacement: LockRecord = {
      schema_version: 1,
      kind: "lock",
      operation_id: plan.operationId,
      session_id: plan.sessionId,
      pid: process.pid,
      expected_revision: plan.expectedRevision,
    };
    await validateProductRecord("Lock", replacement);
    await atomicWrite(plan.root, lockPath(plan.productId), canonicalBytes(replacement));
  } catch (error) {
    if (nodeErrorCode(error) === "EEXIST") return fail("BUSY", "Another recovery inspection owns the product lock.");
    if (error instanceof WorkflowError) throw error;
    return fail("INVALID_STATE", "Product recovery claim cannot be established safely.");
  } finally {
    await closeHandle(claimHandle, "Product recovery claim cannot be closed safely.");
    if (claimOwned) {
      claimPath = await validateProductPath(plan.root, claimRelative);
      await unlink(claimPath).catch((error: unknown) => {
        if (nodeErrorCode(error) !== "ENOENT") return fail("INVALID_STATE", "Product recovery claim cannot be removed safely.");
      });
    }
  }
}

function validateIntent(plan: ProductMutationPlan): void {
  if (!SCENARIOS.has(plan.scenario)) return fail("INVALID_INPUT", "Product mutation scenario is unsupported.");
  if (plan.intent === null || typeof plan.intent !== "object" || Array.isArray(plan.intent)) {
    return fail("INVALID_INPUT", "Product mutation intent must be a structured record.");
  }
  const intent = plan.intent as Record<string, unknown>;
  if (
    intent.schema_version !== 1
    || intent.kind !== "operation_intent"
    || intent.scenario !== plan.scenario
    || intent.input === null
    || typeof intent.input !== "object"
    || Array.isArray(intent.input)
    || Object.keys(intent).some((key) => !["schema_version", "kind", "scenario", "input"].includes(key))
  ) {
    return fail("INVALID_INPUT", "Product mutation intent does not match its scenario.");
  }
}

async function validateTargets(plan: ProductMutationPlan): Promise<void> {
  const probe: OperationRecord = {
    schema_version: 1,
    kind: "operation",
    id: plan.operationId,
    product_id: plan.productId,
    request_digest: "0".repeat(64),
    base_revision: plan.expectedRevision,
    phase: "prepared",
    owner: { session_id: plan.sessionId, pid: process.pid },
    targets: plan.targets ?? [],
    result_sha256: null,
    blocker: null,
    scenario: plan.scenario,
    intent_sha256: "0".repeat(64),
  };
  try {
    await validateProductRecord("Operation", probe);
  } catch (error) {
    if (
      error instanceof WorkflowError
      && error.code === "INVALID_STATE"
      && [
        "Product record does not match its supported schema.",
        "Product record contains invalid Unicode scalar values.",
      ].includes(error.message)
    ) {
      return fail("INVALID_INPUT", "Product mutation targets are invalid.");
    }
    throw error;
  }
}

async function preflight(plan: ProductMutationPlan): Promise<{ intentBytes: Buffer; resultBytes: Buffer; requestDigest: string }> {
  assertUuid(plan.productId, "Product identity");
  assertUuid(plan.operationId, "Operation identity");
  assertUuid(plan.sessionId, "Session identity");
  assertDigest(plan.expectedRevision, "Expected revision");
  assertDigest(plan.nextRevision, "Next revision");
  validateIntent(plan);
  await validateTargets(plan);
  const intentBytes = canonicalBytes(plan.intent);
  const resultBytes = canonicalBytes(plan.result, MAX_STRUCTURED_RESULT_BYTES, "RESULT_LIMIT");
  const resultDefinition = plan.resultDefinition ?? "Success_MutationResult";
  if (resultDefinition !== "Success_ReviewStatus" && plan.result.operation_ref !== plan.operationId) {
    return fail("INVALID_INPUT", "Mutation result identity does not match its operation.");
  }
  if (resultDefinition === "Success_MutationResult" && (plan.result.product_id !== plan.productId || plan.result.applied !== true)) {
    return fail("INVALID_INPUT", "Mutation result identity does not match its product.");
  }
  await validateProductRecord(resultDefinition, {
    protocol_version: 2,
    context: null,
    result: plan.result,
    replayed: false,
    operation_ref: plan.operationId,
  });
  canonicalBytes({
    protocol_version: 2,
    context: null,
    result: plan.result,
    replayed: false,
    operation_ref: plan.operationId,
  }, MAX_COMPLETE_RESULT_BYTES, "RESULT_LIMIT");
  const requestBytes = canonicalBytes({
    product_id: plan.productId,
    operation_id: plan.operationId,
    scenario: plan.scenario,
    expected_revision: plan.expectedRevision,
    next_revision: plan.nextRevision,
    intent: plan.intent,
    result: plan.result,
    targets: plan.targets ?? [],
  });
  return { intentBytes, resultBytes, requestDigest: digest(requestBytes) };
}

async function replayCompleted(
  plan: ProductMutationPlan,
  operation: OperationRecord,
  requestDigest: string,
  intentBytes: Buffer,
): Promise<ProductMutationOutcome | null> {
  if (operation.request_digest !== requestDigest) return fail("CONFLICT", "Operation identity was already used for another mutation.");
  if (operation.phase !== "complete") return null;
  if (operation.result_sha256 === null) return fail("RECOVERY_REQUIRED", "Completed operation result evidence is unavailable.");
  let savedIntent: Uint8Array;
  try {
    savedIntent = await readObject(plan.root, {
      productId: plan.productId,
      kind: "record",
      sha256: operation.intent_sha256,
    });
  } catch {
    return fail("RECOVERY_REQUIRED", "Completed operation intent evidence is unavailable.");
  }
  if (!Buffer.from(savedIntent).equals(intentBytes)) {
    return fail("RECOVERY_REQUIRED", "Completed operation intent evidence is invalid.");
  }
  try {
    await loadGeneration(plan.root, plan.productId, plan.nextRevision);
  } catch {
    return fail("RECOVERY_REQUIRED", "Completed operation generation evidence is unavailable.");
  }
  let resultBytes: Uint8Array;
  try {
    resultBytes = await readObject(plan.root, {
      productId: plan.productId,
      kind: "record",
      sha256: operation.result_sha256,
    });
  } catch {
    return fail("RECOVERY_REQUIRED", "Completed operation result evidence is unavailable.");
  }
  let result: unknown;
  try {
    result = JSON.parse(Buffer.from(resultBytes).toString("utf8"));
  } catch {
    return fail("RECOVERY_REQUIRED", "Completed operation result evidence is invalid.");
  }
  if (result === null || typeof result !== "object" || Array.isArray(result)) {
    return fail("RECOVERY_REQUIRED", "Completed operation result evidence is invalid.");
  }
  const typed = result as Record<string, unknown>;
  await validateProductRecord(plan.resultDefinition ?? "Success_MutationResult", {
    protocol_version: 2,
    context: null,
    result: typed,
    replayed: true,
    operation_ref: plan.operationId,
  });
  return {
    operationRef: plan.operationId,
    replayed: true,
    revision: plan.nextRevision,
    result: typed,
  };
}

async function recoverCompletedLock(plan: ProductMutationPlan, operation: OperationRecord): Promise<void> {
  const observed = await readLock(plan.root, plan.productId);
  if (observed === null || observed.record.operation_id !== plan.operationId) return;
  if (processAlive(observed.record.pid)) return;
  if (
    operation.phase !== "complete"
    || observed.record.session_id !== operation.owner.session_id
    || observed.record.expected_revision !== operation.base_revision
  ) {
    return fail("RECOVERY_REQUIRED", "Stopped product lock does not match completed operation evidence.");
  }
  await acquireRecoveryLock(plan, observed);
  try {
    const current = await readOperation(plan.root, plan.productId, plan.operationId);
    if (
      current === null
      || current.record.phase !== "complete"
      || current.record.request_digest !== operation.request_digest
      || current.record.intent_sha256 !== operation.intent_sha256
      || current.record.result_sha256 !== operation.result_sha256
    ) {
      return fail("RECOVERY_REQUIRED", "Completed operation changed during lock recovery.");
    }
  } finally {
    await releaseLock(plan.root, plan.productId, plan.operationId, plan.sessionId);
  }
}

async function checkpoint(plan: ProductMutationPlan, phase: CheckpointPhase): Promise<void> {
  await plan.checkpoint?.(phase);
}

async function blockOperation(plan: ProductMutationPlan, operation: OperationRecord, error: unknown): Promise<never> {
  const conflict = nodeErrorCode(error) === "CONFLICT" || (error instanceof WorkflowError && error.code === "CONFLICT");
  const blocked: OperationRecord = {
    ...operation,
    blocker: conflict ? "A required target changed during operation recovery." : "The operation stopped before its next durable checkpoint.",
  };
  await writeOperation(plan.root, blocked);
  if (conflict) return fail("CONFLICT", "A required target changed during operation recovery.");
  return fail("RECOVERY_REQUIRED", "The product operation stopped and requires explicit inspection.");
}

async function continueOperation(
  plan: ProductMutationPlan,
  prepared: Awaited<ReturnType<typeof preflight>>,
  initial: OperationRecord,
  mode: "start" | "resume",
): Promise<ProductMutationOutcome> {
  let operation = initial;
  try {
    if (mode === "resume") await loadGeneration(plan.root, plan.productId, plan.nextRevision);
    if (operation.phase === "prepared") {
      await plan.saveObjects?.(mode);
      operation = { ...operation, phase: "objects_saved", blocker: null };
      await writeOperation(plan.root, operation);
      await checkpoint(plan, "objects_saved");
    }
    if (operation.phase === "objects_saved") {
      await plan.saveLocalBinding?.();
      operation = { ...operation, phase: "local_binding_saved", blocker: null };
      await writeOperation(plan.root, operation);
      await checkpoint(plan, "local_binding_saved");
    }
    if (operation.phase === "local_binding_saved") {
      await plan.verifyTargets?.();
      await publishHead(
        plan.root,
        plan.productId,
        plan.expectedRevision,
        plan.nextRevision,
        plan.operationId,
        plan.sessionId,
        () => verifyPlannedGeneration(plan),
      );
      await checkpoint(plan, "head_written");
      operation = { ...operation, phase: "published", blocker: null };
      await writeOperation(plan.root, operation);
      await checkpoint(plan, "published");
    }
    if (operation.phase === "published") {
      await plan.verifyTargets?.();
      const head = await readHead(plan.root, plan.productId);
      if (
        head === null
        || head.record.generation !== plan.nextRevision
        || head.record.operation_id !== plan.operationId
      ) {
        return fail("CONFLICT", "Published product head changed during operation recovery.");
      }
      const headTarget = operation.targets.find((target) => (
        target.root === "store"
        && target.binding_id === null
        && target.relative_path === headPath(plan.productId)
      ));
      if (headTarget === undefined || headTarget.after !== digest(head.bytes)) {
        return fail("CONFLICT", "Published product head no longer matches operation evidence.");
      }
      await verifyPlannedGeneration(plan);
      const savedResult = await saveObject(plan.root, {
        productId: plan.productId,
        kind: "record",
        bytes: prepared.resultBytes,
      });
      operation = { ...operation, phase: "complete", result_sha256: savedResult.sha256, blocker: null };
      await writeOperation(plan.root, operation);
      await checkpoint(plan, "complete");
    }
  } catch (error) {
    return blockOperation(plan, operation, error);
  }
  if (operation.phase !== "complete") return fail("RECOVERY_REQUIRED", "Product operation did not reach a complete checkpoint.");
  return {
    operationRef: plan.operationId,
    replayed: false,
    revision: plan.nextRevision,
    result: plan.result,
  };
}

async function startUnderLock(
  plan: ProductMutationPlan,
  prepared: Awaited<ReturnType<typeof preflight>>,
  existing: OperationRecord | null,
): Promise<ProductMutationOutcome> {
  if (existing !== null) {
    const replay = await replayCompleted(plan, existing, prepared.requestDigest, prepared.intentBytes);
    if (replay !== null) return replay;
    if (existing.request_digest !== prepared.requestDigest) {
      return fail("CONFLICT", "Operation identity was already used for another mutation.");
    }
    const resumedOwner = { ...existing, owner: { session_id: plan.sessionId, pid: process.pid }, blocker: null };
    await writeOperation(plan.root, resumedOwner);
    return continueOperation(plan, prepared, resumedOwner, "resume");
  }

  const head = await readHead(plan.root, plan.productId);
  const currentRevision = head?.record.generation ?? null;
  if (currentRevision !== plan.expectedRevision) return fail("CONFLICT", "Product head changed since the mutation was prepared.");
  await verifyPlannedGeneration(plan);
  const intentObject = await saveObject(plan.root, {
    productId: plan.productId,
    kind: "record",
    bytes: prepared.intentBytes,
  });
  const nextHead: HeadRecord = {
    schema_version: 1,
    kind: "head",
    product_id: plan.productId,
    generation: plan.nextRevision,
    operation_id: plan.operationId,
  };
  const defaultTarget: OperationTarget = {
    root: "store",
    binding_id: null,
    relative_path: headPath(plan.productId),
    before: head === null ? null : digest(head.bytes),
    after: digest(canonicalBytes(nextHead)),
  };
  const operation: OperationRecord = {
    schema_version: 1,
    kind: "operation",
    id: plan.operationId,
    product_id: plan.productId,
    request_digest: prepared.requestDigest,
    base_revision: plan.expectedRevision,
    phase: "prepared",
    owner: { session_id: plan.sessionId, pid: process.pid },
    targets: [defaultTarget, ...(plan.targets ?? [])],
    result_sha256: null,
    blocker: null,
    scenario: plan.scenario,
    intent_sha256: intentObject.sha256,
  };
  await writeOperation(plan.root, operation);
  await checkpoint(plan, "prepared");
  return continueOperation(plan, prepared, operation, "start");
}

export async function replayProductMutationResult(input: {
  readonly root: string;
  readonly productId: string;
  readonly operationId: string;
  readonly scenario: string;
  readonly intent: unknown;
}): Promise<PersistedMutationReplay> {
  assertUuid(input.productId, "Product identity");
  assertUuid(input.operationId, "Operation identity");
  const operation = await readOperation(input.root, input.productId, input.operationId);
  if (operation === null) return fail("NOT_FOUND", "Matching product operation evidence is unavailable.");
  if (operation.record.scenario !== input.scenario) {
    return fail("CONFLICT", "Operation identity was already used for another mutation.");
  }
  if (operation.record.phase !== "complete" || operation.record.result_sha256 === null) {
    return fail("RECOVERY_REQUIRED", "Product operation requires explicit inspection and recovery.");
  }

  const probe: ProductMutationPlan = {
    root: input.root,
    productId: input.productId,
    operationId: input.operationId,
    sessionId: randomUUID(),
    scenario: input.scenario,
    expectedRevision: operation.record.base_revision,
    nextRevision: "0".repeat(64),
    intent: input.intent,
    result: {
      operation_ref: input.operationId,
      applied: true,
      product_id: input.productId,
    },
  };
  validateIntent(probe);
  const requestedIntent = canonicalBytes(input.intent);
  let storedIntent: Uint8Array;
  try {
    storedIntent = await readObject(input.root, {
      productId: input.productId,
      kind: "record",
      sha256: operation.record.intent_sha256,
    });
  } catch {
    return fail("RECOVERY_REQUIRED", "Completed operation intent evidence is unavailable.");
  }
  if (!Buffer.from(storedIntent).equals(requestedIntent)) {
    return fail("CONFLICT", "Operation identity was already used for another mutation request.");
  }

  let resultBytes: Uint8Array;
  try {
    resultBytes = await readObject(input.root, {
      productId: input.productId,
      kind: "record",
      sha256: operation.record.result_sha256,
    });
  } catch {
    return fail("RECOVERY_REQUIRED", "Completed operation result evidence is unavailable.");
  }
  let result: unknown;
  try {
    result = JSON.parse(Buffer.from(resultBytes).toString("utf8"));
  } catch {
    return fail("RECOVERY_REQUIRED", "Completed operation result evidence is invalid.");
  }
  if (result === null || typeof result !== "object" || Array.isArray(result)) {
    return fail("RECOVERY_REQUIRED", "Completed operation result evidence is invalid.");
  }
  const typed = result as Record<string, unknown>;
  await validateProductRecord("Success_MutationResult", {
    protocol_version: 2,
    context: null,
    result: typed,
    replayed: true,
    operation_ref: input.operationId,
  });

  const headTargetIndex = operation.record.targets.findIndex((target) => (
    target.root === "store"
    && target.binding_id === null
    && target.relative_path === headPath(input.productId)
  ));
  if (headTargetIndex < 0) return fail("RECOVERY_REQUIRED", "Completed operation head evidence is unavailable.");
  const headTarget = operation.record.targets[headTargetIndex];
  if (headTarget === undefined) return fail("RECOVERY_REQUIRED", "Completed operation head evidence is unavailable.");
  const generationsPath = await validateProductPath(input.root, `products/${input.productId}/generations`);
  let generationEntries: string[];
  try {
    generationEntries = await readdir(generationsPath);
  } catch {
    return fail("RECOVERY_REQUIRED", "Completed operation generation evidence is unavailable.");
  }
  const nextRevision = generationEntries
    .filter((entry) => entry.endsWith(".yaml") && DIGEST_PATTERN.test(entry.slice(0, -5)))
    .map((entry) => entry.slice(0, -5))
    .find((candidate) => digest(canonicalBytes({
      schema_version: 1,
      kind: "head",
      product_id: input.productId,
      generation: candidate,
      operation_id: input.operationId,
    })) === headTarget.after);
  if (nextRevision === undefined) {
    return fail("RECOVERY_REQUIRED", "Completed operation generation cannot be matched to its request evidence.");
  }
  await loadGeneration(input.root, input.productId, nextRevision);
  const requestDigest = digest(canonicalBytes({
    product_id: input.productId,
    operation_id: input.operationId,
    scenario: input.scenario,
    expected_revision: operation.record.base_revision,
    next_revision: nextRevision,
    intent: input.intent,
    result: typed,
    targets: operation.record.targets.filter((_, index) => index !== headTargetIndex),
  }));
  if (requestDigest !== operation.record.request_digest) {
    return fail("RECOVERY_REQUIRED", "Completed operation request evidence is invalid.");
  }
  return { operationRef: input.operationId, replayed: true, revision: nextRevision, result: typed };
}

// Read-only eligibility for a retained session request. It never acquires, deletes or recovers a lock.
export async function inspectCompletedProductReplay(input: {
  readonly root: string; readonly productId: string; readonly operationId: string;
  readonly scenario: string; readonly intent: unknown;
}): Promise<PersistedMutationReplay> {
  assertUuid(input.productId, "Product identity");
  assertUuid(input.operationId, "Operation identity");
  const original = await readOperation(input.root, input.productId, input.operationId);
  const inspected = await inspectOperation(input.root, input.productId, input.operationId);
  if (original === null || inspected.state !== "applied" || inspected.phase !== "complete") return fail("RECOVERY_REQUIRED", "Exact completed operation evidence is required for session replay.");
  if (await readLock(input.root, input.productId) !== null) return fail("RECOVERY_REQUIRED", "Product lock ownership must be resolved by its existing owner before session replay.");
  const replay = await replayProductMutationResult(input);
  const operation = await readOperation(input.root, input.productId, input.operationId);
  if (operation === null || operation.record.phase !== "complete" || !operation.bytes.equals(original.bytes)) return fail("RECOVERY_REQUIRED", "Completed operation evidence changed during session inspection.");
  for (const target of operation.record.targets) {
    if (target.root !== "store" || target.binding_id !== null) return fail("RECOVERY_REQUIRED", "This session replay contract does not support external operation targets.");
    const current = await readMutable(input.root, target.relative_path);
    if (current === null || digest(current) !== target.after) return fail("RECOVERY_REQUIRED", "Actual product effects changed since the retained operation; explicitly reconcile the current state.");
  }
  const final = await readOperation(input.root, input.productId, input.operationId);
  if (final === null || !final.bytes.equals(original.bytes)) return fail("RECOVERY_REQUIRED", "Completed operation evidence changed during session effect inspection.");
  if (await readLock(input.root, input.productId) !== null) return fail("RECOVERY_REQUIRED", "Product lock changed during session effect inspection.");
  return replay;
}

export async function publishHead(
  root: string,
  productId: string,
  expectedRevision: string | null,
  nextRevision: string,
  operationId: string,
  sessionId: string,
  verifyGeneration?: () => Promise<void>,
): Promise<HeadRecord> {
  const lock = await readLock(root, productId);
  if (
    lock === null
    || lock.record.operation_id !== operationId
    || lock.record.session_id !== sessionId
    || lock.record.pid !== process.pid
  ) {
    return fail("RECOVERY_REQUIRED", "Product head publication requires the current cooperative lock.");
  }
  const current = await readHead(root, productId);
  if (current?.record.generation === nextRevision && current.record.operation_id === operationId) {
    if (verifyGeneration === undefined) await loadGeneration(root, productId, nextRevision);
    else await verifyGeneration();
    return current.record;
  }
  if ((current?.record.generation ?? null) !== expectedRevision) {
    return fail("CONFLICT", "Product head changed before publication.");
  }
  if (verifyGeneration === undefined) await loadGeneration(root, productId, nextRevision);
  else await verifyGeneration();
  const next: HeadRecord = {
    schema_version: 1,
    kind: "head",
    product_id: productId,
    generation: nextRevision,
    operation_id: operationId,
  };
  await validateProductRecord("Head", next);
  await atomicWrite(root, headPath(productId), canonicalBytes(next));
  return next;
}

export async function runProductMutation(plan: ProductMutationPlan): Promise<ProductMutationOutcome> {
  const prepared = await preflight(plan);
  const existing = await readOperation(plan.root, plan.productId, plan.operationId);
  if (existing !== null) {
    const replay = await replayCompleted(plan, existing.record, prepared.requestDigest, prepared.intentBytes);
    if (replay !== null) {
      await recoverCompletedLock(plan, existing.record);
      return replay;
    }
    return fail("RECOVERY_REQUIRED", "An incomplete product operation requires explicit inspection.");
  }
  await acquireNewLock(plan);
  try {
    const underLock = await readOperation(plan.root, plan.productId, plan.operationId);
    return await startUnderLock(plan, prepared, underLock?.record ?? null);
  } finally {
    await releaseLock(plan.root, plan.productId, plan.operationId, plan.sessionId);
  }
}

export async function inspectOperation(root: string, productId: string, operationId: string): Promise<OperationInspection> {
  assertUuid(productId, "Product identity");
  assertUuid(operationId, "Operation identity");
  const operation = await readOperation(root, productId, operationId);
  const lock = await readLock(root, productId);
  if (operation === null) {
    if (lock?.record.operation_id === operationId) {
      const token = Buffer.from(JSON.stringify({ operation: null, lock: digest(lock.bytes) }), "utf8").toString("base64url");
      return {
        operationRef: operationId,
        state: "not_applied",
        phase: "prepared",
        inspectionToken: token,
        issues: ["The operation intent was not persisted."],
      };
    }
    return {
      operationRef: operationId,
      state: "not_applied",
      phase: "abandoned",
      inspectionToken: null,
      issues: [],
    };
  }
  const state = operation.record.phase === "complete"
    ? "applied"
    : operation.record.blocker === null ? "incomplete" : "blocked";
  const inspectionToken = state === "applied" ? null : Buffer.from(JSON.stringify({
    operation: digest(operation.bytes),
    lock: lock === null ? null : digest(lock.bytes),
  }), "utf8").toString("base64url");
  return {
    operationRef: operationId,
    state,
    phase: operation.record.phase,
    inspectionToken,
    issues: operation.record.blocker === null ? [] : [operation.record.blocker],
  };
}

export async function inspectExactOperationForResume(input: {
  readonly root: string;
  readonly productId: string;
  readonly operationId: string;
  readonly scenario: string;
  readonly intent: unknown;
}): Promise<ExactOperationResumeEvidence> {
  const status = await inspectOperation(input.root, input.productId, input.operationId);
  if (!["not_applied", "incomplete", "blocked"].includes(status.state) || status.inspectionToken === null) {
    return fail("RECOVERY_REQUIRED", "Product operation is not available for exact recovery.");
  }
  const operation = await readOperation(input.root, input.productId, input.operationId);
  if (operation === null) {
    return { inspectionToken: status.inspectionToken, targets: null };
  }
  if (operation.record.scenario !== input.scenario) {
    return fail("CONFLICT", "Product operation scenario changed before recovery.");
  }
  let savedIntent: Uint8Array;
  try {
    savedIntent = await readObject(input.root, {
      productId: input.productId,
      kind: "record",
      sha256: operation.record.intent_sha256,
    });
  } catch {
    return fail("RECOVERY_REQUIRED", "Product operation intent is unavailable for exact recovery.");
  }
  if (!Buffer.from(savedIntent).equals(canonicalBytes(input.intent))) {
    return fail("CONFLICT", "Product operation intent changed before recovery.");
  }
  const head = operation.record.targets.filter((target) => (
    target.root === "store"
    && target.binding_id === null
    && target.relative_path === headPath(input.productId)
  ));
  if (head.length !== 1) return fail("RECOVERY_REQUIRED", "Product operation head evidence is invalid.");
  return {
    inspectionToken: status.inspectionToken,
    targets: operation.record.targets.filter((target) => target !== head[0]),
  };
}

export async function pendingOperationsForTarget(input: {
  readonly root: string;
  readonly productId: string;
  readonly relativePath: string;
}): Promise<readonly string[]> {
  assertUuid(input.productId, "Product identity");
  const directory = await validateProductPath(input.root, `products/${input.productId}/operations`);
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (nodeErrorCode(error) === "ENOENT") return [];
    return fail("INVALID_STATE", "Product operation inventory cannot be inspected safely.");
  }
  if (entries.length > MAX_OPERATION_RECORDS) {
    return fail("SOURCE_LIMIT", "Product operation inventory exceeds its supported limit.");
  }
  const pending: string[] = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const operationId = entry.name.replace(/\.yaml$/u, "");
    if (!entry.isFile() || !entry.name.endsWith(".yaml") || !UUID_PATTERN.test(operationId)) {
      return fail("INVALID_STATE", "Product operation inventory contains an unsupported entry.");
    }
    const operation = await readOperation(input.root, input.productId, operationId);
    if (operation === null) return fail("SOURCE_CHANGED", "Product operation disappeared while its inventory was read.");
    if (
      operation.record.phase !== "complete"
      && operation.record.phase !== "abandoned"
      && operation.record.targets.some((target) => (
        target.root === "store"
        && target.binding_id === null
        && target.relative_path === input.relativePath
      ))
    ) pending.push(operationId);
  }
  return pending;
}

function observedInspectionToken(
  operation: { bytes: Buffer } | null,
  lock: { bytes: Buffer } | null,
): string {
  return Buffer.from(JSON.stringify({
    operation: operation === null ? null : digest(operation.bytes),
    lock: lock === null ? null : digest(lock.bytes),
  }), "utf8").toString("base64url");
}

export async function resumeOperation(
  plan: ProductMutationPlan,
  inspectionToken: string | null,
): Promise<ProductMutationOutcome> {
  const prepared = await preflight(plan);
  const status = await inspectOperation(plan.root, plan.productId, plan.operationId);
  if (status.state === "applied") {
    const existing = await readOperation(plan.root, plan.productId, plan.operationId);
    if (existing === null) return fail("RECOVERY_REQUIRED", "Completed operation evidence is unavailable.");
    const replay = await replayCompleted(plan, existing.record, prepared.requestDigest, prepared.intentBytes);
    if (replay === null) return fail("RECOVERY_REQUIRED", "Completed operation result evidence is unavailable.");
    await recoverCompletedLock(plan, existing.record);
    return replay;
  }
  if (status.inspectionToken === null || status.inspectionToken !== inspectionToken) {
    return fail("CONFLICT", "Product operation changed after it was inspected.");
  }
  const observedLock = await readLock(plan.root, plan.productId);
  const observedOperation = await readOperation(plan.root, plan.productId, plan.operationId);
  if (observedInspectionToken(observedOperation, observedLock) !== inspectionToken) {
    return fail("CONFLICT", "Product operation changed after it was inspected.");
  }
  await acquireRecoveryLock(plan, observedLock);
  try {
    const existing = await readOperation(plan.root, plan.productId, plan.operationId);
    if (existing !== null && existing.record.request_digest !== prepared.requestDigest) {
      return fail("CONFLICT", "Operation identity was already used for another mutation.");
    }
    return await startUnderLock(plan, prepared, existing?.record ?? null);
  } finally {
    await releaseLock(plan.root, plan.productId, plan.operationId, plan.sessionId);
  }
}
