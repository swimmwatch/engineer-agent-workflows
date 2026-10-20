import { execFile } from "node:child_process";
import { constants } from "node:fs";
import {
  lstat,
  mkdir,
  open,
  realpath,
  rename,
  unlink,
} from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { dirname, isAbsolute, resolve } from "node:path";
import { promisify } from "node:util";

import { isAlias, isMap, isNode, isSeq, parseAllDocuments } from "yaml";
import type { Node } from "yaml";

import { fail, WorkflowError } from "../state.js";
import { validateProductPath } from "./config.js";
import {
  inspectOperation,
  replayProductMutationResult,
  resumeOperation,
  runProductMutation,
} from "./operations.js";
import type { ProductMutationPlan } from "./operations.js";
import { validateProductRecord } from "./schemas.js";
import { loadGeneration, saveGeneration, saveObject } from "./storage.js";

const executeFile = promisify(execFile);
const MAX_RECORD_BYTES = 16 * 1024 * 1024;
const STORE_PATH = "store.yaml";
const STORE_LOCK_PATH = "store.lock";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

const PRODUCT_TOOL_NAMES = [
  "idea_choose_direction",
  "idea_compare_direction",
  "idea_define_problem",
  "prd_define_actor",
  "prd_define_capability",
  "prd_define_constraint",
  "prd_define_goal",
  "prd_define_rule",
  "prd_define_term",
  "prd_define_use_case",
  "product_amendment_activate",
  "product_amendment_impact",
  "product_amendment_prepare",
  "product_amendment_rebase",
  "product_artifact_draft",
  "product_bind_workspace",
  "product_candidate_check",
  "product_capabilities",
  "product_context_next",
  "product_context_prepare",
  "product_decision_find",
  "product_decision_get",
  "product_document_accept_edits",
  "product_document_begin_edit",
  "product_document_create_subject",
  "product_document_inspect_edits",
  "product_document_list",
  "product_document_move_elements",
  "product_document_rename",
  "product_element_find",
  "product_element_get",
  "product_initialize",
  "product_interview_resume",
  "product_list",
  "product_open",
  "product_question_answer",
  "product_question_no_answer",
  "product_question_prepare",
  "product_record_assumption",
  "product_record_instruction",
  "product_record_observation",
  "product_record_research",
  "product_review_complete",
  "product_review_consistency_get",
  "product_review_consistency_record",
  "product_review_get",
  "product_review_record",
  "product_review_start",
  "product_review_status",
  "product_safety_block",
  "product_safety_resolve",
  "product_scope_confirm",
  "product_scope_propose",
  "task_inputs_check",
  "task_packet_complete",
  "task_packet_start",
  "task_specification_register_copy",
  "task_specification_reserve",
] as const;

interface StoreProduct {
  readonly product_id: string;
  readonly name: string;
}

interface StoreWorkspace {
  readonly workspace_id: string;
  readonly product_id: string;
  readonly binding_sha256: string;
}

interface StoreRecord {
  readonly schema_version: 1;
  readonly kind: "store";
  readonly store_id: string;
  readonly products: readonly StoreProduct[];
  readonly workspaces: readonly StoreWorkspace[];
}

interface WorkspaceBindingRecord {
  readonly schema_version: 1;
  readonly kind: "workspace_binding";
  readonly workspace_id: string;
  readonly product_id: string;
  readonly canonical_workspace: string;
  readonly canonical_git_common_dir: string | null;
  readonly location_fingerprint: string;
  readonly confirmed_by: {
    readonly text: string;
    readonly source: string;
  };
}

interface HeadRecord {
  readonly schema_version: 1;
  readonly kind: "head";
  readonly product_id: string;
  readonly generation: string;
  readonly operation_id: string;
}

interface WorkspaceIdentity {
  readonly canonicalWorkspace: string;
  readonly canonicalGitCommonDir: string | null;
  readonly locationFingerprint: string;
}

interface ProductStoreLockRecord {
  readonly schema_version: 1;
  readonly kind: "catalog_lock";
  readonly operation_id: string;
  readonly session_id: string;
  readonly pid: number;
}

interface ProductStoreLockRequest {
  readonly operationId: string;
  readonly sessionId: string;
  readonly recovery: boolean;
}

interface StoredRecord<T> {
  readonly value: T;
  readonly bytes: Buffer;
  readonly sha256: string;
}

interface Match {
  readonly storeWorkspace: StoreWorkspace;
  readonly binding: StoredRecord<WorkspaceBindingRecord>;
  readonly exact: boolean;
}

export interface ProductOpenResult {
  readonly state: "bound" | "unbound" | "missing_store" | "invalid_store";
  readonly product_id: string | null;
  readonly workspace_id: string | null;
  readonly ready_artifacts: readonly ("idea" | "prd" | "technical-design" | "roadmap")[];
  readonly blockers: readonly string[];
}

export interface ProductPageResult {
  readonly source_version: string;
  readonly items: readonly {
    readonly ref: null;
    readonly decision_ref: null;
    readonly document: null;
    readonly product_id: string;
    readonly title: string;
    readonly state: string;
    readonly reason: null;
    readonly operation_ref: null;
  }[];
  readonly total: number;
  readonly complete: boolean;
  readonly next_cursor: string | null;
}

export interface ProductMutationResult extends Record<string, unknown> {
  readonly operation_ref: string;
  readonly applied: true;
  readonly candidate_ref: null;
  readonly changed_refs: readonly [];
  readonly decision_ref: null;
  readonly question_ref: null;
  readonly product_id: string;
  readonly workspace_id: string | null;
  readonly task_id: null;
  readonly specification_id: null;
  readonly review_ref: null;
  readonly next: string;
  readonly document_id: string | null;
}

export interface ProductOutcome<T> {
  readonly context: string | null;
  readonly result: T;
  readonly replayed: boolean;
  readonly operationRef: string | null;
}

export interface ProductMutationHooks {
  readonly checkpoint?: ProductMutationPlan["checkpoint"];
  readonly resumeInspectionToken?: string;
}

function digest(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function deterministicUuid(seed: string): string {
  const bytes = Buffer.from(digest(seed).slice(0, 32), "hex");
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const value = bytes.toString("hex");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function canonicalBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
}

function nodeErrorCode(error: unknown): string | undefined {
  if (error === null || typeof error !== "object" || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

async function closeHandle(handle: FileHandle | undefined): Promise<void> {
  if (handle === undefined) return;
  try {
    await handle.close();
  } catch {
    return fail("INVALID_STATE", "Product binding file could not be closed safely.");
  }
}

function validateYamlNodes(node: Node | null | undefined): void {
  if (node === null || node === undefined) return;
  if (isAlias(node) || node.tag !== undefined) {
    return fail("INVALID_STATE", "Product binding record uses unsupported YAML features.");
  }
  if (isMap(node)) {
    for (const pair of node.items) {
      if (isNode(pair.key)) validateYamlNodes(pair.key);
      if (isNode(pair.value)) validateYamlNodes(pair.value);
    }
  } else if (isSeq(node)) {
    for (const item of node.items) if (isNode(item)) validateYamlNodes(item);
  }
}

function parseRecord(bytes: Buffer): unknown {
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return fail("INVALID_STATE", "Product binding record is not valid UTF-8 YAML.");
  }
  let documents;
  try {
    documents = parseAllDocuments(source, {
      merge: false,
      prettyErrors: false,
      resolveKnownTags: false,
      schema: "core",
      stringKeys: true,
      uniqueKeys: true,
    });
  } catch {
    return fail("INVALID_STATE", "Product binding record is malformed YAML.");
  }
  if (documents.length !== 1 || documents[0] === undefined || documents[0].errors.length > 0) {
    return fail("INVALID_STATE", "Product binding record must contain one supported YAML document.");
  }
  validateYamlNodes(documents[0].contents);
  try {
    return documents[0].toJS({ mapAsMap: false, maxAliasCount: 0 });
  } catch {
    return fail("INVALID_STATE", "Product binding record cannot be converted safely.");
  }
}

async function readOptionalBytes(root: string, relativePath: string): Promise<Buffer | null> {
  const path = await validateProductPath(root, relativePath);
  let pathStat;
  try {
    pathStat = await lstat(path);
  } catch (error) {
    if (nodeErrorCode(error) === "ENOENT") return null;
    return fail("INVALID_STATE", "Product binding record cannot be inspected safely.");
  }
  if (pathStat.isSymbolicLink() || !pathStat.isFile() || pathStat.nlink !== 1) {
    return fail("UNSAFE_PATH", "Product binding record must be a regular single-link file.");
  }
  if (pathStat.size > MAX_RECORD_BYTES) return fail("SOURCE_LIMIT", "Product binding record exceeds the 16 MiB limit.");
  let handle: FileHandle | undefined;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = await handle.stat();
    if (before.dev !== pathStat.dev || before.ino !== pathStat.ino || before.size !== pathStat.size) {
      return fail("SOURCE_CHANGED", "Product binding record changed before it could be read.");
    }
    const bytes = await handle.readFile();
    const after = await handle.stat();
    const finalPath = await lstat(path);
    if (
      bytes.byteLength !== before.size
      || before.dev !== after.dev
      || before.ino !== after.ino
      || before.size !== after.size
      || before.mtimeMs !== after.mtimeMs
      || before.ctimeMs !== after.ctimeMs
      || finalPath.isSymbolicLink()
      || !finalPath.isFile()
      || finalPath.nlink !== 1
      || finalPath.dev !== after.dev
      || finalPath.ino !== after.ino
    ) {
      return fail("SOURCE_CHANGED", "Product binding record changed while it was read.");
    }
    return bytes;
  } catch (error) {
    if (error instanceof WorkflowError) throw error;
    if (nodeErrorCode(error) === "ENOENT" || nodeErrorCode(error) === "ELOOP") {
      return fail("SOURCE_CHANGED", "Product binding record changed while it was read.");
    }
    return fail("INVALID_STATE", "Product binding record cannot be read safely.");
  } finally {
    await closeHandle(handle);
  }
}

async function readRecord<T>(root: string, relativePath: string, definition: "Store" | "WorkspaceBinding" | "Head"): Promise<StoredRecord<T> | null> {
  const bytes = await readOptionalBytes(root, relativePath);
  if (bytes === null) return null;
  const value = await validateProductRecord(definition, parseRecord(bytes)) as T;
  return { value, bytes, sha256: digest(bytes) };
}

function bindingPath(workspaceId: string): string {
  return `bindings/${workspaceId}.yaml`;
}

function headPath(productId: string): string {
  return `products/${productId}/head.yaml`;
}

function gitEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" };
  for (const name of [
    "GIT_ALTERNATE_OBJECT_DIRECTORIES",
    "GIT_CEILING_DIRECTORIES",
    "GIT_COMMON_DIR",
    "GIT_DISCOVERY_ACROSS_FILESYSTEM",
    "GIT_DIR",
    "GIT_INDEX_FILE",
    "GIT_NAMESPACE",
    "GIT_OBJECT_DIRECTORY",
    "GIT_WORK_TREE",
  ]) delete environment[name];
  return environment;
}

async function gitIdentity(workspace: string): Promise<{ top: string; common: string } | null> {
  async function run(arguments_: readonly string[]): Promise<string[]> {
    const { stdout } = await executeFile("git", [...arguments_], {
      cwd: workspace,
      env: gitEnvironment(),
      maxBuffer: 16 * 1024,
      timeout: 5000,
      windowsHide: true,
    });
    return stdout.trim().split(/\r?\n/u);
  }
  let lines: string[];
  try {
    lines = await run(["rev-parse", "--path-format=absolute", "--show-toplevel", "--git-common-dir"]);
  } catch {
    try {
      lines = await run(["rev-parse", "--show-toplevel", "--git-common-dir"]);
    } catch {
      return null;
    }
  }
  if (lines.length !== 2 || !lines[0] || !lines[1]) return fail("INVALID_STATE", "Git workspace identity is unavailable.");
  const topCandidate = isAbsolute(lines[0]) ? lines[0] : resolve(workspace, lines[0]);
  const commonCandidate = isAbsolute(lines[1]) ? lines[1] : resolve(workspace, lines[1]);
  try {
    const top = await realpath(topCandidate);
    const common = await realpath(commonCandidate);
    const worktreeLines = await run(["worktree", "list", "--porcelain", "-z"]);
    const registered = worktreeLines
      .flatMap((line) => line.split(String.fromCharCode(0)))
      .filter((line) => line.startsWith("worktree "))
      .map((line) => line.slice("worktree ".length));
    const registeredCanonical = await Promise.all(registered.map(async (candidate) => {
      try {
        return await realpath(candidate);
      } catch {
        return null;
      }
    }));
    if (!registeredCanonical.includes(top)) return null;
    return { top, common };
  } catch {
    return fail("INVALID_STATE", "Git workspace identity cannot be canonicalized.");
  }
}

async function workspaceIdentity(workspace: string): Promise<WorkspaceIdentity> {
  if (!isAbsolute(workspace) || workspace.includes(String.fromCharCode(0))) {
    return fail("INVALID_INPUT", "Workspace must be an absolute directory path.");
  }
  let canonicalInput: string;
  try {
    canonicalInput = await realpath(workspace);
    if (!(await lstat(canonicalInput)).isDirectory()) return fail("INVALID_INPUT", "Workspace must be an existing directory.");
  } catch (error) {
    if (error instanceof WorkflowError) throw error;
    return fail("INVALID_INPUT", "Workspace must be an existing directory.");
  }
  const git = await gitIdentity(canonicalInput);
  const canonicalWorkspace = git?.top ?? canonicalInput;
  const canonicalGitCommonDir = git?.common ?? null;
  return {
    canonicalWorkspace,
    canonicalGitCommonDir,
    locationFingerprint: digest(JSON.stringify({ canonicalWorkspace, canonicalGitCommonDir })),
  };
}

async function readStore(root: string): Promise<StoredRecord<StoreRecord> | null> {
  const store = await readRecord<StoreRecord>(root, STORE_PATH, "Store");
  if (store === null) return null;
  const productIds = new Set(store.value.products.map((product) => product.product_id));
  const workspaceIds = new Set(store.value.workspaces.map((workspace) => workspace.workspace_id));
  if (productIds.size !== store.value.products.length || workspaceIds.size !== store.value.workspaces.length) {
    return fail("INVALID_STATE", "Product store contains duplicate identities.");
  }
  if (store.value.workspaces.some((workspace) => !productIds.has(workspace.product_id))) {
    return fail("INVALID_STATE", "Product store contains a foreign workspace binding.");
  }
  return store;
}

async function readBinding(root: string, workspace: StoreWorkspace): Promise<StoredRecord<WorkspaceBindingRecord>> {
  const binding = await readRecord<WorkspaceBindingRecord>(root, bindingPath(workspace.workspace_id), "WorkspaceBinding");
  if (binding === null) return fail("MISSING_EVIDENCE", "Registered workspace binding is missing.");
  if (binding.sha256 !== workspace.binding_sha256) return fail("SOURCE_CHANGED", "Registered workspace binding changed.");
  if (binding.value.workspace_id !== workspace.workspace_id || binding.value.product_id !== workspace.product_id) {
    return fail("SOURCE_CHANGED", "Registered workspace binding identity does not match the store.");
  }
  return binding;
}

async function findMatches(root: string, store: StoreRecord, identity: WorkspaceIdentity): Promise<Match[]> {
  const matches: Match[] = [];
  for (const workspace of store.workspaces) {
    const binding = await readBinding(root, workspace);
    const exact = binding.value.canonical_workspace === identity.canonicalWorkspace;
    const sharedGit = identity.canonicalGitCommonDir !== null
      && binding.value.canonical_git_common_dir === identity.canonicalGitCommonDir;
    if (exact || sharedGit) matches.push({ storeWorkspace: workspace, binding, exact });
  }
  return matches;
}

function requireUniqueMatch(matches: readonly Match[]): Match | null {
  const exact = matches.filter((match) => match.exact);
  const candidates = exact.length > 0 ? exact : matches;
  if (candidates.length > 1 && new Set(candidates.map((match) => match.storeWorkspace.product_id)).size > 1) {
    return fail("AMBIGUOUS_BINDING", "Multiple product bindings match this workspace identity.");
  }
  return [...candidates].sort((left, right) => left.storeWorkspace.workspace_id.localeCompare(right.storeWorkspace.workspace_id))[0] ?? null;
}

async function assertSeparatedRoot(root: string, identity: WorkspaceIdentity): Promise<void> {
  await validateProductPath(root, STORE_PATH, {
    workspaceRoots: [
      identity.canonicalWorkspace,
      ...(identity.canonicalGitCommonDir === null ? [] : [identity.canonicalGitCommonDir]),
    ],
  });
}

async function atomicWrite(root: string, relativePath: string, bytes: Buffer): Promise<void> {
  let path = await validateProductPath(root, relativePath);
  await mkdir(dirname(path), { recursive: true, mode: 0o700 }).catch(() => fail("INVALID_STATE", "Product binding directory cannot be created safely."));
  path = await validateProductPath(root, relativePath);
  const temporaryRelative = `${relativePath}.${randomUUID()}.tmp`;
  const temporaryPath = await validateProductPath(root, temporaryRelative);
  let handle: FileHandle | undefined;
  let installed = false;
  try {
    handle = await open(temporaryPath, "wx", 0o600);
    await handle.writeFile(bytes);
    await handle.sync();
    await closeHandle(handle);
    handle = undefined;
    await rename(temporaryPath, path);
    installed = true;
  } catch (error) {
    if (error instanceof WorkflowError) throw error;
    return fail("INVALID_STATE", "Product binding record cannot be replaced safely.");
  } finally {
    await closeHandle(handle);
    if (!installed) await unlink(temporaryPath).catch(() => undefined);
  }
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return nodeErrorCode(error) !== "ESRCH";
  }
}

function storeLockBytes(request: Omit<ProductStoreLockRequest, "recovery">): Buffer {
  return canonicalBytes({
    schema_version: 1,
    kind: "catalog_lock",
    operation_id: request.operationId,
    session_id: request.sessionId,
    pid: process.pid,
  });
}

async function readProductStoreLock(root: string): Promise<{ record: ProductStoreLockRecord; bytes: Buffer } | null> {
  const bytes = await readOptionalBytes(root, STORE_LOCK_PATH);
  if (bytes === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    return fail("RECOVERY_REQUIRED", "Product store lock ownership cannot be verified safely.");
  }
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
    || (value as Record<string, unknown>).schema_version !== 1
    || (value as Record<string, unknown>).kind !== "catalog_lock"
    || typeof (value as Record<string, unknown>).operation_id !== "string"
    || typeof (value as Record<string, unknown>).session_id !== "string"
    || !UUID_PATTERN.test((value as Record<string, unknown>).operation_id as string)
    || !UUID_PATTERN.test((value as Record<string, unknown>).session_id as string)
    || !Number.isSafeInteger((value as Record<string, unknown>).pid)
    || ((value as Record<string, unknown>).pid as number) <= 0
    || Object.keys(value).some((key) => !["schema_version", "kind", "operation_id", "session_id", "pid"].includes(key))
  ) {
    return fail("RECOVERY_REQUIRED", "Product store lock ownership cannot be verified safely.");
  }
  return { record: value as ProductStoreLockRecord, bytes };
}

async function recoverProductStoreLock(root: string, request: ProductStoreLockRequest): Promise<void> {
  const observed = await readProductStoreLock(root);
  if (observed === null) return;
  if (processAlive(observed.record.pid)) return fail("BUSY", "Another product catalog operation is active.");
  if (!request.recovery || observed.record.operation_id !== request.operationId) {
    return fail("RECOVERY_REQUIRED", "A stopped product catalog operation requires explicit matching recovery.");
  }

  const claimRelative = `${STORE_LOCK_PATH}.recovery`;
  const claimPath = await validateProductPath(root, claimRelative);
  let claimHandle: FileHandle | undefined;
  let claimOwned = false;
  try {
    claimHandle = await open(claimPath, "wx", 0o600);
    claimOwned = true;
    await claimHandle.writeFile(canonicalBytes({
      operation_id: request.operationId,
      observed_lock: digest(observed.bytes),
      pid: process.pid,
    }));
    await claimHandle.sync();
    await closeHandle(claimHandle);
    claimHandle = undefined;
    const current = await readProductStoreLock(root);
    if (current === null || digest(current.bytes) !== digest(observed.bytes)) {
      return fail("RECOVERY_REQUIRED", "Product store lock changed during recovery inspection.");
    }
    await atomicWrite(root, STORE_LOCK_PATH, storeLockBytes(request));
  } catch (error) {
    if (nodeErrorCode(error) === "EEXIST") return fail("BUSY", "Another catalog recovery inspection is active.");
    if (error instanceof WorkflowError) throw error;
    return fail("INVALID_STATE", "Product store recovery claim cannot be established safely.");
  } finally {
    await closeHandle(claimHandle);
    if (claimOwned) await unlink(claimPath).catch((error: unknown) => {
      if (nodeErrorCode(error) !== "ENOENT") return fail("INVALID_STATE", "Product store recovery claim cannot be removed safely.");
    });
  }
}

async function withProductStoreLock<T>(
  root: string,
  request: ProductStoreLockRequest,
  action: () => Promise<T>,
): Promise<T> {
  if (!UUID_PATTERN.test(request.operationId) || !UUID_PATTERN.test(request.sessionId)) {
    return fail("INVALID_INPUT", "Product store lock ownership is invalid.");
  }
  const lockPath = await validateProductPath(root, STORE_LOCK_PATH);
  await mkdir(dirname(lockPath), { recursive: true, mode: 0o700 }).catch(() => fail("INVALID_STATE", "Product store root cannot be created safely."));
  let handle: FileHandle | undefined;
  let identity: { dev: number; ino: number } | undefined;
  try {
    handle = await open(await validateProductPath(root, STORE_LOCK_PATH), "wx", 0o600);
    const created = await handle.stat();
    identity = { dev: created.dev, ino: created.ino };
    await handle.writeFile(storeLockBytes(request));
    await handle.sync();
  } catch (error) {
    await closeHandle(handle);
    handle = undefined;
    if (identity !== undefined) {
      const partial = await lstat(lockPath).catch(() => null);
      if (partial !== null && partial.dev === identity.dev && partial.ino === identity.ino && partial.isFile()) {
        await unlink(lockPath).catch(() => fail("INVALID_STATE", "Partial product store lock cannot be removed safely."));
      }
    }
    if (nodeErrorCode(error) === "EEXIST") {
      await recoverProductStoreLock(root, request);
      const recovered = await lstat(lockPath).catch(() => null);
      if (recovered === null || !recovered.isFile()) {
        return fail("RECOVERY_REQUIRED", "Recovered product store lock is unavailable.");
      }
      identity = { dev: recovered.dev, ino: recovered.ino };
    } else if (error instanceof WorkflowError) {
      throw error;
    } else {
      return fail("INVALID_STATE", "Product store lock cannot be created safely.");
    }
  }
  try {
    return await action();
  } finally {
    await closeHandle(handle);
    if (identity !== undefined) {
      const current = await lstat(lockPath).catch(() => null);
      if (current !== null && current.dev === identity.dev && current.ino === identity.ino && current.isFile()) {
        await unlink(lockPath).catch(() => fail("INVALID_STATE", "Product store lock cannot be released safely."));
      }
    }
  }
}

async function writeCatalogChange(
  root: string,
  expectedStore: StoredRecord<StoreRecord> | null,
  nextStore: StoreRecord,
  binding: WorkspaceBindingRecord,
  lock: ProductStoreLockRequest,
): Promise<void> {
  await validateProductRecord("Store", nextStore);
  await validateProductRecord("WorkspaceBinding", binding);
  const storeBytes = canonicalBytes(nextStore);
  const bindingBytes = canonicalBytes(binding);
  await withProductStoreLock(root, lock, async () => {
    const current = await readStore(root);
    if ((current?.sha256 ?? null) !== (expectedStore?.sha256 ?? null)) {
      return fail("CONFLICT", "Product store changed since this operation was prepared.");
    }
    const existingBinding = await readOptionalBytes(root, bindingPath(binding.workspace_id));
    if (existingBinding !== null && !existingBinding.equals(bindingBytes)) {
      return fail("CONFLICT", "Workspace binding identity is already used by another record.");
    }
    if (existingBinding === null) await atomicWrite(root, bindingPath(binding.workspace_id), bindingBytes);
    await atomicWrite(root, STORE_PATH, storeBytes);
  });
}

async function verifyCatalogChange(root: string, store: StoreRecord, binding: WorkspaceBindingRecord): Promise<void> {
  const expectedStore = canonicalBytes(store);
  const expectedBinding = canonicalBytes(binding);
  const actualStore = await readOptionalBytes(root, STORE_PATH);
  const actualBinding = await readOptionalBytes(root, bindingPath(binding.workspace_id));
  if (!actualStore?.equals(expectedStore) || !actualBinding?.equals(expectedBinding)) {
    return fail("CONFLICT", "Product binding targets changed during operation recovery.");
  }
}

function contextToken(
  identity: WorkspaceIdentity,
  store: StoredRecord<StoreRecord> | null,
  match: Match | null,
  targetRevision: string | null,
): Promise<string> {
  const context = {
    contract: "product-1",
    store_id: store?.value.store_id ?? null,
    product_id: match?.storeWorkspace.product_id ?? null,
    workspace_id: match?.exact === true ? match.storeWorkspace.workspace_id : null,
    candidate_ref: null,
    selected_sources_sha256: digest(JSON.stringify({
      workspace: identity.locationFingerprint,
      store: store?.sha256 ?? null,
      binding: match?.binding.sha256 ?? null,
      targetRevision,
    })),
    target_revision: targetRevision,
    canonical_workspace: identity.canonicalWorkspace,
  };
  return Promise.resolve(Buffer.from(JSON.stringify(context)).toString("base64url"));
}

function mutationResult(
  operationRef: string,
  productId: string,
  workspaceId: string | null,
  documentId: string | null,
  next: string,
): ProductMutationResult {
  return {
    operation_ref: operationRef,
    applied: true,
    candidate_ref: null,
    changed_refs: [],
    decision_ref: null,
    question_ref: null,
    product_id: productId,
    workspace_id: workspaceId,
    task_id: null,
    specification_id: null,
    review_ref: null,
    next,
    document_id: documentId,
  };
}

function sortedStore(store: StoreRecord): StoreRecord {
  return {
    ...store,
    products: [...store.products].sort((left, right) => left.product_id.localeCompare(right.product_id)),
    workspaces: [...store.workspaces].sort((left, right) => left.workspace_id.localeCompare(right.workspace_id)),
  };
}

async function headState(root: string, productId: string): Promise<{ head: StoredRecord<HeadRecord>; ready: ProductOpenResult["ready_artifacts"] } | null> {
  const head = await readRecord<HeadRecord>(root, headPath(productId), "Head");
  if (head === null) return null;
  if (head.value.product_id !== productId) return fail("SOURCE_CHANGED", "Product head belongs to another product.");
  const generation = await loadGeneration(root, productId, head.value.generation);
  return {
    head,
    ready: generation.generation.ready_artifacts.map((artifact) => artifact.artifact),
  };
}

function initializationOperationId(productId: string): string {
  return deterministicUuid(`product_initialize:${productId}`);
}

export async function resolveWorkspace(input: { readonly root: string; readonly workspace: string }): Promise<ProductOutcome<ProductOpenResult>> {
  const identity = await workspaceIdentity(input.workspace);
  await assertSeparatedRoot(input.root, identity);
  let store: StoredRecord<StoreRecord> | null;
  try {
    store = await readStore(input.root);
  } catch (error) {
    if (error instanceof WorkflowError && ["INVALID_STATE", "SOURCE_CHANGED", "UNSUPPORTED_VERSION"].includes(error.code)) {
      return {
        context: await contextToken(identity, null, null, null),
        result: { state: "invalid_store", product_id: null, workspace_id: null, ready_artifacts: [], blockers: ["The product store is invalid or inconsistent."] },
        replayed: false,
        operationRef: null,
      };
    }
    throw error;
  }
  if (store === null) {
    return {
      context: await contextToken(identity, null, null, null),
      result: { state: "missing_store", product_id: null, workspace_id: null, ready_artifacts: [], blockers: [] },
      replayed: false,
      operationRef: null,
    };
  }
  const match = requireUniqueMatch(await findMatches(input.root, store.value, identity));
  if (match === null) {
    return {
      context: await contextToken(identity, store, null, null),
      result: {
        state: "unbound",
        product_id: null,
        workspace_id: null,
        ready_artifacts: [],
        blockers: store.value.workspaces.length === 0 ? [] : ["No binding matches the current workspace location."],
      },
      replayed: false,
      operationRef: null,
    };
  }
  if (!store.value.products.some((product) => product.product_id === match.storeWorkspace.product_id)) {
    return fail("SOURCE_CHANGED", "Workspace binding references an unknown product.");
  }
  const product = await headState(input.root, match.storeWorkspace.product_id);
  let operationRef: string | null = null;
  if (product === null) {
    const candidate = initializationOperationId(match.storeWorkspace.product_id);
    const status = await inspectOperation(input.root, match.storeWorkspace.product_id, candidate);
    if (status.state !== "not_applied") operationRef = candidate;
  }
  const currentStore = await readStore(input.root);
  if (currentStore?.sha256 !== store.sha256) return fail("CONFLICT", "Product store changed while workspace was resolved.");
  return {
    context: await contextToken(identity, store, match, product?.head.value.generation ?? null),
    result: {
      state: "bound",
      product_id: match.storeWorkspace.product_id,
      workspace_id: match.exact ? match.storeWorkspace.workspace_id : null,
      ready_artifacts: product?.ready ?? [],
      blockers: product === null ? ["The product initialization has not published a ready revision."] : [],
    },
    replayed: false,
    operationRef,
  };
}

export async function productCapabilities(input: { readonly root: string }): Promise<ProductOutcome<{
  readonly contract: "product-1";
  readonly schema_version: 1;
  readonly tools: readonly string[];
  readonly root_state: "available" | "missing" | "invalid";
  readonly runtime_supported: boolean;
}>> {
  let rootState: "available" | "missing" | "invalid";
  try {
    rootState = await readStore(input.root) === null ? "missing" : "available";
  } catch {
    rootState = "invalid";
  }
  return {
    context: null,
    result: {
      contract: "product-1",
      schema_version: 1,
      tools: PRODUCT_TOOL_NAMES,
      root_state: rootState,
      runtime_supported: true,
    },
    replayed: false,
    operationRef: null,
  };
}

function pageCursor(sourceVersion: string, offset: number): string {
  return Buffer.from(JSON.stringify({ sourceVersion, offset })).toString("base64url");
}

function readPageCursor(cursor: string | undefined, sourceVersion: string): number {
  if (cursor === undefined) return 0;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as { sourceVersion?: unknown; offset?: unknown };
    if (parsed.sourceVersion !== sourceVersion || !Number.isSafeInteger(parsed.offset) || Number(parsed.offset) < 0) throw new Error();
    return Number(parsed.offset);
  } catch {
    return fail("INVALID_CURSOR", "Use the returned product continuation unchanged.");
  }
}

export async function listProducts(input: { readonly root: string; readonly cursor?: string; readonly limit?: number }): Promise<ProductOutcome<ProductPageResult>> {
  const store = await readStore(input.root);
  const sourceVersion = store?.sha256 ?? digest("missing-product-store");
  const products = [...(store?.value.products ?? [])].sort((left, right) => left.product_id.localeCompare(right.product_id));
  const offset = readPageCursor(input.cursor, sourceVersion);
  if (offset > products.length) return fail("INVALID_CURSOR", "Product continuation is outside the current result.");
  const limit = input.limit ?? 20;
  const selected = products.slice(offset, offset + limit);
  const next = offset + selected.length;
  return {
    context: null,
    result: {
      source_version: sourceVersion,
      items: selected.map((product) => ({
        ref: null,
        decision_ref: null,
        document: null,
        product_id: product.product_id,
        title: product.name,
        state: "registered",
        reason: null,
        operation_ref: null,
      })),
      total: products.length,
      complete: next === products.length,
      next_cursor: next === products.length ? null : pageCursor(sourceVersion, next),
    },
    replayed: false,
    operationRef: null,
  };
}

export async function initializeProduct(
  input: {
    readonly root: string;
    readonly workspace: string;
    readonly name: string;
    readonly knownIdea: string;
  },
  hooks: ProductMutationHooks = {},
): Promise<ProductOutcome<ProductMutationResult>> {
  const identity = await workspaceIdentity(input.workspace);
  await assertSeparatedRoot(input.root, identity);
  const store = await readStore(input.root);
  const storeId = store?.value.store_id ?? deterministicUuid(`store:${input.root}`);
  const productId = deterministicUuid(`product:${storeId}:${identity.locationFingerprint}:${input.name}:${input.knownIdea}`);
  const workspaceId = deterministicUuid(`workspace:${storeId}:${identity.canonicalWorkspace}`);
  const operationId = initializationOperationId(productId);
  const intent = {
    schema_version: 1,
    kind: "operation_intent",
    scenario: "product_initialize",
    input: { workspace: identity.locationFingerprint, name: input.name, known_idea_sha256: digest(input.knownIdea) },
  } as const;
  if (store !== null) {
    const match = requireUniqueMatch(await findMatches(input.root, store.value, identity));
    if (match !== null) {
      if (match.storeWorkspace.product_id !== productId) return fail("CONFLICT", "Workspace is already bound to another product.");
      const replay = await replayProductMutationResult({
        root: input.root,
        productId,
        operationId,
        scenario: "product_initialize",
        intent,
      });
      const head = await headState(input.root, productId);
      if (head === null) return fail("RECOVERY_REQUIRED", "Completed product initialization has no published revision.");
      return {
        context: await contextToken(identity, store, match, head.head.value.generation),
        result: replay.result as ProductMutationResult,
        replayed: true,
        operationRef: replay.operationRef,
      };
    }
    if (store.value.products.some((product) => product.product_id === productId)) {
      return fail("CONFLICT", "Product identity already exists without this workspace binding.");
    }
  }

  const ideaDocumentId = deterministicUuid(`idea-document:${productId}`);
  const registryId = deterministicUuid(`registry:${productId}`);
  const ideaBytes = Buffer.from(`# ${input.name}\n\n${input.knownIdea}\n`, "utf8");
  const ideaObject = await saveObject(input.root, { productId, kind: "markdown", bytes: ideaBytes });
  const registry = {
    schema_version: 1,
    kind: "registry",
    product_id: productId,
    documents: [{
      id: ideaDocumentId,
      artifact: "idea",
      role: "semantic",
      subject: "Initial idea",
      relative_path: "idea/overview.md",
      object_sha256: ideaObject.sha256,
    }],
    element_metadata: [],
  } as const;
  const registryObject = await saveObject(input.root, {
    productId,
    kind: "record",
    bytes: canonicalBytes(registry),
  });
  const generation = await saveGeneration(input.root, {
    schema_version: 1,
    kind: "generation",
    product_id: productId,
    parent: null,
    registry: { id: registryId, object_sha256: registryObject.sha256 },
    ready_artifacts: [],
    decision_heads: [],
    relations: [],
  });
  const binding: WorkspaceBindingRecord = {
    schema_version: 1,
    kind: "workspace_binding",
    workspace_id: workspaceId,
    product_id: productId,
    canonical_workspace: identity.canonicalWorkspace,
    canonical_git_common_dir: identity.canonicalGitCommonDir,
    location_fingerprint: identity.locationFingerprint,
    confirmed_by: { text: input.knownIdea, source: "product_initialize" },
  };
  const bindingSha = digest(canonicalBytes(binding));
  const nextStore = sortedStore({
    schema_version: 1,
    kind: "store",
    store_id: storeId,
    products: [...(store?.value.products ?? []), { product_id: productId, name: input.name }],
    workspaces: [...(store?.value.workspaces ?? []), { workspace_id: workspaceId, product_id: productId, binding_sha256: bindingSha }],
  });
  const result = mutationResult(operationId, productId, workspaceId, ideaDocumentId, "Continue explicit Idea refinement.");
  const sessionId = randomUUID();
  const plan: ProductMutationPlan = {
    root: input.root,
    productId,
    operationId,
    sessionId,
    scenario: "product_initialize",
    expectedRevision: null,
    nextRevision: generation.sha256,
    intent,
    result,
    targets: [
      { root: "store", binding_id: null, relative_path: STORE_PATH, before: store?.sha256 ?? null, after: digest(canonicalBytes(nextStore)) },
      { root: "store", binding_id: workspaceId, relative_path: bindingPath(workspaceId), before: null, after: bindingSha },
    ],
    saveObjects: (mode) => writeCatalogChange(input.root, store, nextStore, binding, {
      operationId,
      sessionId,
      recovery: mode === "resume",
    }),
    verifyTargets: () => verifyCatalogChange(input.root, nextStore, binding),
    ...(hooks.checkpoint === undefined ? {} : { checkpoint: hooks.checkpoint }),
  };
  const outcome = hooks.resumeInspectionToken === undefined
    ? await runProductMutation(plan)
    : await resumeOperation(plan, hooks.resumeInspectionToken);
  const currentStore = await readStore(input.root);
  if (currentStore === null) return fail("RECOVERY_REQUIRED", "Product store is unavailable after initialization.");
  const match = requireUniqueMatch(await findMatches(input.root, currentStore.value, identity));
  if (match === null) return fail("RECOVERY_REQUIRED", "Workspace binding is unavailable after initialization.");
  return {
    context: await contextToken(identity, currentStore, match, outcome.revision),
    result,
    replayed: outcome.replayed,
    operationRef: operationId,
  };
}

export async function bindWorkspace(input: {
  readonly root: string;
  readonly workspace: string;
  readonly productId: string;
  readonly bindingAnswer: string;
  readonly source: string;
}): Promise<ProductOutcome<ProductMutationResult>> {
  const identity = await workspaceIdentity(input.workspace);
  await assertSeparatedRoot(input.root, identity);
  const store = await readStore(input.root);
  if (store === null) return fail("NOT_FOUND", "No product store is available for explicit binding.");
  if (!store.value.products.some((product) => product.product_id === input.productId)) {
    return fail("NOT_FOUND", "Selected product identity is not registered.");
  }
  const operationId = deterministicUuid(`product_bind_workspace:${input.productId}:${identity.locationFingerprint}`);
  const intent = {
    schema_version: 1,
    kind: "operation_intent",
    scenario: "product_bind_workspace",
    input: {
      product_id: input.productId,
      workspace: identity.locationFingerprint,
      answer_sha256: digest(input.bindingAnswer),
      source_sha256: digest(input.source),
    },
  } as const;
  const matches = await findMatches(input.root, store.value, identity);
  const exact = matches.find((match) => match.exact) ?? null;
  if (exact !== null) {
    if (exact.storeWorkspace.product_id !== input.productId) return fail("CONFLICT", "Workspace is already bound to another product.");
    const head = await headState(input.root, input.productId);
    if (head === null) return fail("PREREQUISITE_REQUIRED", "Selected product has no published revision.");
    let replay;
    try {
      replay = await replayProductMutationResult({
        root: input.root,
        productId: input.productId,
        operationId,
        scenario: "product_bind_workspace",
        intent,
      });
    } catch (error) {
      if (error instanceof WorkflowError && error.code === "NOT_FOUND") {
        return fail("ALREADY_EXISTS", "Workspace binding exists without a matching bind operation receipt.");
      }
      throw error;
    }
    return {
      context: await contextToken(identity, store, exact, head.head.value.generation),
      result: replay.result as ProductMutationResult,
      replayed: true,
      operationRef: replay.operationRef,
    };
  }
  const inherited = requireUniqueMatch(matches);
  if (inherited !== null && inherited.storeWorkspace.product_id !== input.productId) {
    return fail("CONFLICT", "Git worktree resolves to another product binding.");
  }
  const head = await headState(input.root, input.productId);
  if (head === null) return fail("PREREQUISITE_REQUIRED", "Selected product has no published revision.");
  const workspaceId = deterministicUuid(`workspace:${store.value.store_id}:${identity.canonicalWorkspace}`);
  const binding: WorkspaceBindingRecord = {
    schema_version: 1,
    kind: "workspace_binding",
    workspace_id: workspaceId,
    product_id: input.productId,
    canonical_workspace: identity.canonicalWorkspace,
    canonical_git_common_dir: identity.canonicalGitCommonDir,
    location_fingerprint: identity.locationFingerprint,
    confirmed_by: { text: input.bindingAnswer, source: input.source },
  };
  const bindingSha = digest(canonicalBytes(binding));
  const nextStore = sortedStore({
    ...store.value,
    workspaces: [...store.value.workspaces, { workspace_id: workspaceId, product_id: input.productId, binding_sha256: bindingSha }],
  });
  const result = mutationResult(operationId, input.productId, workspaceId, null, "Workspace is bound to the selected product.");
  const sessionId = randomUUID();
  const outcome = await runProductMutation({
    root: input.root,
    productId: input.productId,
    operationId,
    sessionId,
    scenario: "product_bind_workspace",
    expectedRevision: head.head.value.generation,
    nextRevision: head.head.value.generation,
    intent,
    result,
    targets: [
      { root: "store", binding_id: null, relative_path: STORE_PATH, before: store.sha256, after: digest(canonicalBytes(nextStore)) },
      { root: "store", binding_id: workspaceId, relative_path: bindingPath(workspaceId), before: null, after: bindingSha },
    ],
    saveObjects: (mode) => writeCatalogChange(input.root, store, nextStore, binding, {
      operationId,
      sessionId,
      recovery: mode === "resume",
    }),
    verifyTargets: () => verifyCatalogChange(input.root, nextStore, binding),
  });
  const currentStore = await readStore(input.root);
  if (currentStore === null) return fail("RECOVERY_REQUIRED", "Product store is unavailable after workspace binding.");
  const match = requireUniqueMatch(await findMatches(input.root, currentStore.value, identity));
  if (match === null || match.storeWorkspace.product_id !== input.productId) {
    return fail("RECOVERY_REQUIRED", "Workspace binding is unavailable after publication.");
  }
  return {
    context: await contextToken(identity, currentStore, match, outcome.revision),
    result,
    replayed: outcome.replayed,
    operationRef: operationId,
  };
}
