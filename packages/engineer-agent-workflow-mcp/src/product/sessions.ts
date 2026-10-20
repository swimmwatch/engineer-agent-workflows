import { constants } from "node:fs";
import { lstat, mkdir, open, readdir, rename, unlink } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { dirname } from "node:path";
import { isDeepStrictEqual } from "node:util";
import Ajv from "ajv";
import type { WorkflowTool } from "../api.js";
import { fail, WorkflowError } from "../state.js";
import { productValidationDiagnostics } from "../diagnostics.js";
import { validateProductPath } from "./config.js";
import { resolveWorkspace } from "./bindings.js";
import { decodeCursor, findProductDecisions, findProductElements, prepareProductContext, readContextPage, readProductDecision, readProductElement } from "./context.js";
import { listProductDocuments } from "./documents.js";
import { assertNonSensitive, readCandidateRecord, resumeProductInterview, productInterviewReplayIdentity } from "./interview.js";
import { inspectCompletedProductReplay, inspectOperation } from "./operations.js";
import { readProductReviewItem, readProductReviewConsistency } from "./review.js";
import { validateProductRecord } from "./schemas.js";
import { prepareTaskPacketContext } from "./tasks.js";

const MAX_REQUEST_BYTES = 128 * 1024;
const MAX_RESULT_BYTES = 24 * 1024;
const DELIVERY_PORTION_CHARACTERS = 2048;
const MAX_CHECKPOINT_BYTES = MAX_REQUEST_BYTES + MAX_RESULT_BYTES * 2 + 32 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
interface CandidateRef { product_id: string; candidate_id: string }
interface Context { product_id: string; workspace_id: string; candidate_ref: CandidateRef; canonical_workspace: string; selected_sources_sha256: string; target_revision: string }
interface PendingRequest {
  request_id: string; scenario: string; arguments: Record<string, unknown>; context: string;
  write: boolean; phase: "prepared" | "dispatched" | "acknowledged"; operation_ref: string | null;
  recovery?: { contract: "candidate-evidence-v1"; request_sha256: string; attempts: number };
}
interface Delivery {
  read_ref: string; response: string; offset: number; next_cursor: string | null;
  source_version: string | null; progress: number; continuation_scenario: string;
}
interface CompletedRead { scenario: string; arguments: Record<string, unknown>; receipt: string; item_key: string | null; source_version: string | null }
export interface SessionCheckpoint {
  schema_version: 1; kind: "product_session"; id: string; product_id: string; candidate_ref: CandidateRef;
  context: string; revision: number; state: "idle" | "pending" | "acknowledged" | "delivering" | "unknown" | "blocked";
  pending: PendingRequest | null; delivery: Delivery | null; completed_read: CompletedRead | null;
  review_state_sha256: string;
}
interface Descriptor {
  tool: WorkflowTool; validate: Ajv.ValidateFunction; validateOutput: Ajv.ValidateFunction; mode: "candidate" | "ready";
  continuation: "candidate" | "review" | "document" | "context" | "element-find" | "decision-find" | "portion" | null;
}
const CANDIDATE_SCENARIOS = [
  "product_interview_resume", "product_candidate_record_get", "product_scope_propose", "product_scope_confirm",
  "product_question_prepare", "product_question_answer", "product_question_no_answer", "product_record_instruction",
  "product_record_observation", "product_record_assumption", "product_record_research", "product_candidate_check",
  "product_document_list", "product_document_create_subject", "product_document_move_elements", "product_document_rename",
  "product_review_start", "product_review_status", "product_review_get", "product_review_record",
  "product_review_consistency_get", "product_review_consistency_record", "product_review_complete", "product_review_scope_expand",
  "idea_define_problem", "idea_compare_direction", "idea_choose_direction", "prd_define_actor", "prd_define_capability",
  "prd_define_constraint", "prd_define_goal", "prd_define_rule", "prd_define_term", "prd_define_use_case",
  "technical_define_boundary", "technical_define_technology", "technical_define_policy", "technical_define_interface",
  "technical_define_data_entity", "technical_define_integration", "technical_define_risk", "roadmap_define_stage",
  "roadmap_define_epic", "roadmap_define_story", "roadmap_define_task", "roadmap_link_dependency", "roadmap_split_task",
] as const;
const READY_SCENARIOS = ["product_context_prepare", "product_element_find", "product_element_get", "product_decision_find", "product_decision_get"] as const;
const CONTINUATIONS: Readonly<Record<string, Descriptor["continuation"]>> = {
  product_candidate_record_get: "candidate", product_review_get: "review", product_review_consistency_get: "review", product_document_list: "document",
  product_context_prepare: "context", product_element_find: "element-find", product_decision_find: "decision-find",
  product_element_get: "portion", product_decision_get: "portion",
};
function contextValue(context: string): Context {
  try { return JSON.parse(Buffer.from(context, "base64url").toString("utf8")) as Context; }
  catch { return fail("INVALID_INPUT", "Use an exact server-issued candidate context."); }
}
function reference(value: string): { product_id: string; id: string } {
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<string, unknown>;
    if (Object.keys(decoded).sort().join(",") !== "id,product_id" || typeof decoded.id !== "string" || !UUID.test(decoded.id)
      || typeof decoded.product_id !== "string" || !UUID.test(decoded.product_id)) throw new Error();
    return decoded as { product_id: string; id: string };
  } catch { return fail("INVALID_INPUT", "Use the exact logical session_ref returned by product_session_open."); }
}
function sessionRef(session: SessionCheckpoint): string { return Buffer.from(JSON.stringify({ product_id: session.product_id, id: session.id })).toString("base64url"); }
function pathFor(ref: { product_id: string; id: string }): string { return `products/${ref.product_id}/sessions/${ref.id}.json`; }
function missing(error: unknown): boolean { return error !== null && typeof error === "object" && "code" in error && error.code === "ENOENT"; }
interface ReviewSnapshot { digest: string; entries: ReadonlyMap<string, string> }
async function reviewSnapshot(root: string, candidate: CandidateRef): Promise<ReviewSnapshot> {
  const relative = `products/${candidate.product_id}/drafts/${candidate.candidate_id}/reviews`;
  const directory = await validateProductPath(root, relative);
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (missing(error)) return { digest: createHash("sha256").update("[]").digest("hex"), entries: new Map() }; throw error; }
  if (entries.length > 10000) return fail("SOURCE_LIMIT", "Session review inspection exceeds its bounded inventory.");
  const values = new Map<string, string>();
  let total = 0;
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile() || !/^[0-9a-f-]{36}\.yaml$/u.test(entry.name)) return fail("UNSAFE_PATH", "Session review inventory contains unsupported entries.");
    const path = await validateProductPath(root, `${relative}/${entry.name}`);
    const beforePath = await lstat(path);
    if (!beforePath.isFile() || beforePath.isSymbolicLink() || beforePath.nlink !== 1) return fail("UNSAFE_PATH", "Session review source must be a regular single-link file.");
    total += beforePath.size;
    if (total > 16 * 1024 * 1024) return fail("SOURCE_LIMIT", "Session review inspection exceeds its bounded byte budget.");
    const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const before = await handle.stat();
      const bytes = await handle.readFile();
      const after = await handle.stat();
      const final = await lstat(path);
      if (before.dev !== beforePath.dev || before.ino !== beforePath.ino || before.size !== bytes.length || before.size !== after.size
        || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs || final.dev !== before.dev || final.ino !== before.ino
        || final.nlink !== 1 || final.isSymbolicLink()) return fail("SOURCE_CHANGED", "Review state changed during session inspection.");
      values.set(`${relative}/${entry.name}`, createHash("sha256").update(bytes).digest("hex"));
    } finally { await handle.close(); }
  }
  const after = await readdir(directory);
  if (after.sort().join("\0") !== entries.map((entry) => entry.name).join("\0")) return fail("SOURCE_CHANGED", "Review inventory changed during session inspection.");
  return { digest: createHash("sha256").update(JSON.stringify([...values])).digest("hex"), entries: values };
}
async function verifyOwnReviewEffects(root: string, session: SessionCheckpoint, before: ReviewSnapshot, after: ReviewSnapshot): Promise<void> {
  if (before.digest === after.digest) return;
  const operationRef = session.pending?.operation_ref;
  if (operationRef === null || operationRef === undefined || !UUID.test(operationRef)) return fail("CONFLICT", "Independent review state changed during session dispatch; inspect effects before continuation.");
  const path = await validateProductPath(root, `products/${session.product_id}/operations/${operationRef}.yaml`);
  const pathStat = await lstat(path);
  if (!pathStat.isFile() || pathStat.isSymbolicLink() || pathStat.nlink !== 1 || pathStat.size > MAX_CHECKPOINT_BYTES) return fail("UNSAFE_PATH", "Session effect evidence is not a supported regular operation checkpoint.");
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await handle.stat();
    const bytes = await handle.readFile();
    const final = await lstat(path);
    if (stat.dev !== pathStat.dev || stat.ino !== pathStat.ino || stat.size !== bytes.length || final.dev !== stat.dev || final.ino !== stat.ino || final.size !== stat.size || final.mtimeMs !== stat.mtimeMs || final.ctimeMs !== stat.ctimeMs || final.nlink !== 1) return fail("SOURCE_CHANGED", "Session effect evidence changed during inspection.");
    const operation = await validateProductRecord("Operation", JSON.parse(bytes.toString("utf8"))) as { product_id: string; id: string; phase: string; scenario: string; targets: { root: string; relative_path: string; before: string | null; after: string }[] };
    if (operation.id !== operationRef || operation.product_id !== session.product_id || operation.phase !== "complete" || operation.scenario !== session.pending!.scenario) return fail("RECOVERY_REQUIRED", "Session review changes lack exact completed operation evidence.");
    const targets = new Map(operation.targets.filter((target) => target.root === "store").map((target) => [target.relative_path, target]));
    for (const key of new Set([...before.entries.keys(), ...after.entries.keys()])) {
      const prior = before.entries.get(key) ?? null;
      const current = after.entries.get(key) ?? null;
      if (prior === current) continue;
      const target = targets.get(key);
      if (target === undefined || target.before !== prior || target.after !== current) return fail("CONFLICT", "An independent reviewer changed state beyond this acknowledged operation; inspect and explicitly reconcile.");
    }
  } finally { await handle.close(); }
}
async function readCheckpoint(root: string, ref: { product_id: string; id: string }): Promise<SessionCheckpoint> {
  const path = await validateProductPath(root, pathFor(ref));
  let handle;
  try {
    const pathStat = await lstat(path);
    if (!pathStat.isFile() || pathStat.isSymbolicLink() || pathStat.nlink !== 1) return fail("UNSAFE_PATH", "Session checkpoint must be a regular single-link file.");
    if (pathStat.size > MAX_CHECKPOINT_BYTES) return fail("SOURCE_LIMIT", "Session checkpoint exceeds its bounded contract.");
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = await handle.stat();
    const bytes = await handle.readFile();
    const after = await handle.stat();
    const final = await lstat(path);
    if (before.dev !== pathStat.dev || before.ino !== pathStat.ino || before.size !== bytes.length || before.size !== after.size
      || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs || final.dev !== before.dev || final.ino !== before.ino
      || final.isSymbolicLink() || final.nlink !== 1) return fail("SOURCE_CHANGED", "Session checkpoint changed during reading.");
    let value: unknown;
    try { value = JSON.parse(bytes.toString("utf8")); } catch { return fail("INVALID_STATE", "Session checkpoint is not supported JSON."); }
    const session = await validateProductRecord("SessionCheckpoint", value) as SessionCheckpoint;
    if (session.id !== ref.id || session.product_id !== ref.product_id || session.candidate_ref.product_id !== ref.product_id) return fail("SOURCE_CHANGED", "Session checkpoint identity changed.");
    return session;
  } catch (error) {
    if (error instanceof WorkflowError) throw error;
    return fail(missing(error) ? "NOT_FOUND" : "INVALID_STATE", "Logical session checkpoint is unavailable; preserve retained evidence.");
  } finally { await handle?.close(); }
}
async function saveCheckpoint(root: string, session: SessionCheckpoint, create = false): Promise<void> {
  await validateProductRecord("SessionCheckpoint", session);
  const bytes = Buffer.from(`${JSON.stringify(session)}\n`);
  if (bytes.length > MAX_CHECKPOINT_BYTES) return fail("RESULT_LIMIT", "Session checkpoint exceeds its bounded contract.");
  let path = await validateProductPath(root, pathFor(session), { workspaceRoots: [contextValue(session.context).canonical_workspace] });
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  path = await validateProductPath(root, pathFor(session));
  const temporary = await validateProductPath(root, `${pathFor(session)}.${randomUUID()}.tmp`);
  const handle = await open(create ? path : temporary, "wx", 0o600);
  try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
  if (!create) {
    try { await rename(temporary, path); } finally { await unlink(temporary).catch((error: unknown) => { if (!missing(error)) throw error; }); }
  }
}
async function exclusive<T>(root: string, ref: { product_id: string; id: string }, expected: number, work: (session: SessionCheckpoint) => Promise<T>): Promise<T> {
  const claimPath = await validateProductPath(root, `${pathFor(ref)}.claim`);
  let claim;
  try { claim = await open(claimPath, "wx", 0o600); }
  catch { return fail("RECOVERY_REQUIRED", "Logical session is claimed; inspect its checkpoint before explicit recovery. Never delete an active claim."); }
  try {
    const session = await readCheckpoint(root, ref);
    if (session.revision !== expected) return fail("CONFLICT", "Session revision changed; inspect product_session_status before continuing.");
    return await work(session);
  } finally { await claim.close(); await unlink(claimPath); }
}
function assertReferences(value: unknown, candidate: CandidateRef): void {
  if (Array.isArray(value)) { for (const item of value) assertReferences(item, candidate); return; }
  if (value === null || typeof value !== "object") return;
  const object = value as Record<string, unknown>;
  if (typeof object.product_id === "string" && object.product_id !== candidate.product_id) return fail("INVALID_INPUT", "Scenario references must belong to this session product.");
  if (typeof object.candidate_id === "string" && object.candidate_id !== candidate.candidate_id) return fail("INVALID_INPUT", "Scenario references must belong to this session candidate.");
  for (const [key, item] of Object.entries(object)) { assertReferences(key, candidate); assertReferences(item, candidate); }
}
function requestDigest(session: SessionCheckpoint): string {
  const request = session.pending!;
  return createHash("sha256").update(JSON.stringify({ product_id: session.product_id, candidate_ref: session.candidate_ref,
    request_id: request.request_id, scenario: request.scenario, arguments: request.arguments, context: request.context,
    write: request.write, operation_ref: request.operation_ref })).digest("hex");
}
function recoveryFailure(operationRef: string | null, knownEffects: Record<string, unknown> | null = null, message = "Retained request cannot be replayed safely; preserve evidence and explicitly reconcile through its existing operation owner."): never {
  return fail("RECOVERY_REQUIRED", message, { operation_ref: operationRef, outcome: "blocked", known_effects: knownEffects,
    next_action: "Inspect the retained session and exact operation evidence; resolve its existing owner or explicitly open a reconciled new session. Never delete locks or replay changed arguments." });
}
function injectedContext(session: SessionCheckpoint, descriptor: Descriptor): string {
  if (descriptor.mode === "candidate") return session.context;
  // This selects the session's retained ready snapshot, never the current head.
  return Buffer.from(JSON.stringify({ ...contextValue(session.context), candidate_ref: null })).toString("base64url");
}
function assertReceipt(session: SessionCheckpoint, scenario: string, args: Record<string, unknown>): void {
  if (scenario !== "product_review_record" && scenario !== "product_review_consistency_record") return;
  const saved = session.completed_read;
  const verdict = scenario === "product_review_record" ? args.value as Record<string, unknown> | undefined : args;
  const expectedRead = scenario === "product_review_record" ? "product_review_get" : "product_review_consistency_get";
  if (saved === null || saved.scenario !== expectedRead || verdict?.read_receipt !== saved.receipt
    || args.review_ref !== saved.arguments.review_ref || (scenario === "product_review_record" && verdict?.item_key !== saved.item_key)) {
    return fail("PREREQUISITE_REQUIRED", "A verdict requires this session's completely delivered exact matching review read.");
  }
}
function cursorProgress(descriptor: Descriptor, cursor: string, context: string): number {
  if (descriptor.continuation === "review" || descriptor.continuation === "document") {
    try { const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Record<string, unknown>;
      if (!Number.isSafeInteger(parsed.offset) || Number(parsed.offset) <= 0) throw new Error();
      return Number(parsed.offset);
    } catch { return fail("INVALID_CURSOR", "Review continuation has invalid progress."); }
  }
  const kind = descriptor.continuation === "candidate" ? "candidate-record" : descriptor.continuation;
  if (kind === null) return fail("INVALID_STATE", "Scenario has no registered continuation contract.");
  const progress = decodeCursor(cursor, kind, context).offset;
  if (!Number.isSafeInteger(progress) || progress <= 0) return fail("INVALID_CURSOR", "Continuation must advance source delivery.");
  return progress;
}
function sourceProgress(descriptor: Descriptor, result: Record<string, unknown>, cursor: string | null, context: string, previous?: Delivery): number {
  if (descriptor.continuation === null) return Number.MAX_SAFE_INTEGER;
  const prior = previous === undefined ? undefined : (JSON.parse(previous.response) as { result: Record<string, unknown> }).result;
  const offset = previous?.progress ?? 0;
  let progress: number;
  let hasMore: boolean;
  let blockers = false;
  const integer = (value: unknown): number => {
    if (!Number.isSafeInteger(value) || Number(value) < 0) return fail("INVALID_STATE", "Read coverage must use nonnegative safe integer ranges.");
    return Number(value);
  };
  if (descriptor.continuation === "candidate" || descriptor.continuation === "portion") {
    if (typeof result.text !== "string" || integer(result.offset) !== offset) return fail("INVALID_CURSOR", "Read portion is not contiguous with the exact delivered source.");
    const total = integer(result.total_characters);
    if (prior !== undefined && prior.total_characters !== total) return fail("STALE_CURSOR", "Read source coverage changed between portions.");
    progress = offset + Array.from(result.text).length;
    if (!Number.isSafeInteger(progress) || progress > total) return fail("INVALID_STATE", "Read portion exceeds its declared source range.");
    hasMore = progress < total;
  } else if (descriptor.continuation === "review") {
    if (typeof result.text !== "string" || (prior !== undefined && (prior.item_key !== result.item_key || prior.review_ref !== result.review_ref))) return fail("STALE_CURSOR", "Review continuation changed its selected source.");
    progress = offset + Array.from(result.text).length;
    hasMore = cursor !== null;
    if (hasMore ? result.read_receipt !== null : typeof result.read_receipt !== "string") return fail("INVALID_STATE", "Review receipt must match terminal source coverage.");
  } else {
    let count: number;
    let total: number;
    if (descriptor.continuation === "context") {
      if (!Array.isArray(result.required) || !Array.isArray(result.optional) || !Array.isArray(result.blockers)) return fail("INVALID_STATE", "Context read lacks its registered source inventory.");
      const required = integer(result.required_total);
      const optional = integer(result.optional_total);
      if (prior !== undefined && (prior.required_total !== required || prior.optional_total !== optional || JSON.stringify(prior.blockers) !== JSON.stringify(result.blockers))) return fail("STALE_CURSOR", "Context source inventory changed between pages.");
      count = result.required.length + result.optional.length;
      if (result.required.length !== Math.min(count, Math.max(0, required - offset))) return fail("INVALID_STATE", "Context page changed the required/optional source ordering.");
      total = integer(required + optional);
      blockers = result.blockers.length > 0;
    } else {
      if (!Array.isArray(result.items)) return fail("INVALID_STATE", "Paged read lacks its registered item inventory.");
      count = result.items.length;
      total = integer(result.total);
      if (prior !== undefined && prior.total !== total) return fail("STALE_CURSOR", "Read inventory total changed between pages.");
    }
    progress = offset + count;
    if (!Number.isSafeInteger(progress) || progress > total) return fail("INVALID_STATE", "Read page exceeds its declared source inventory.");
    hasMore = progress < total;
  }
  if (result.complete !== (!hasMore && !blockers) || (cursor !== null) !== hasMore) return fail("INVALID_STATE", "Read completeness differs from actual source coverage or readiness.");
  if (hasMore && (progress <= offset || cursorProgress(descriptor, cursor!, context) !== progress)) return fail("INVALID_CURSOR", "Continuation does not advance the exact delivered source range.");
  return progress;
}
function prepareDelivery(session: SessionCheckpoint, descriptor: Descriptor, output: Record<string, unknown>, previous?: Delivery, validateOutput = descriptor.validateOutput): Delivery {
  if (!validateOutput(output)) return fail("INVALID_STATE", "Scenario acknowledgement differs from its published output schema.");
  const response = JSON.stringify(output);
  if (Buffer.byteLength(response) > MAX_RESULT_BYTES) return fail("RESULT_LIMIT", "Scenario acknowledgement exceeds the published result budget.");
  const result = output.result as Record<string, unknown>;
  const cursor = descriptor.continuation === null ? null : result.next_cursor;
  if (!(cursor === null || typeof cursor === "string")) {
    return fail("INVALID_STATE", "Registered read returned inconsistent completeness or continuation.");
  }
  const sourceVersion = typeof result.source_version === "string" ? result.source_version : null;
  const progress = sourceProgress(descriptor, result, cursor, String(output.context), previous);
  if (previous !== undefined && (sourceVersion !== previous.source_version || cursor === previous.next_cursor || progress <= previous.progress)) {
    return fail("STALE_CURSOR", "Source version changed or continuation failed to advance; stop dependent work.");
  }
  return { read_ref: previous?.read_ref ?? randomUUID(), response, offset: 0, next_cursor: cursor, source_version: sourceVersion,
    progress, continuation_scenario: session.pending!.scenario === "product_context_prepare" ? "product_context_next" : session.pending!.scenario };
}
async function verifyAcknowledgement(root: string, session: SessionCheckpoint, descriptor: Descriptor, args: Record<string, unknown>, output: Record<string, unknown>): Promise<void> {
  if (!descriptor.tool.write && output.context !== args.context) return fail("SOURCE_CHANGED", "Read acknowledgement changed its exact selected context.");
  let expected;
  if (descriptor.continuation === "candidate") {
    expected = await readCandidateRecord({ root, context: String(args.context), candidateRef: args.candidate_ref as CandidateRef,
      recordRef: args.record_ref as never, ...(typeof args.cursor === "string" ? { cursor: args.cursor } : {}) });
  } else if (descriptor.continuation === "review") {
    const input: Parameters<typeof readProductReviewConsistency>[0] = { root, context: String(args.context), reviewRef: String(args.review_ref),
      ...(typeof args.cursor === "string" ? { cursor: args.cursor } : {}),
      ...(args.representation === "explicit-v1" || args.representation === "compact-v1" ? { representation: args.representation } : {}) };
    expected = session.pending!.scenario === "product_review_get"
      ? await readProductReviewItem({ ...input, itemIndex: Number(args.item_index) })
      : await readProductReviewConsistency(input);
  } else if (descriptor.continuation === "context") {
    expected = typeof args.cursor === "string"
      ? await readContextPage({ root, context: String(args.context), cursor: args.cursor })
      : typeof args.packet_id === "string"
        ? await prepareTaskPacketContext({ root, context: String(args.context), taskId: String(args.task_id), packetId: args.packet_id,
          ...(Array.isArray(args.required_refs) ? { requiredRefs: args.required_refs as never[] } : {}),
          ...(typeof args.budget_bytes === "number" ? { budgetBytes: args.budget_bytes } : {}) })
      : await prepareProductContext({ root, context: String(args.context), purpose: args.purpose as never,
        ...(typeof args.task_id === "string" ? { taskId: args.task_id } : {}),
        ...(typeof args.artifact === "string" ? { artifact: args.artifact as never } : {}),
        ...(Array.isArray(args.required_refs) ? { requiredRefs: args.required_refs as never[] } : {}),
        ...(typeof args.budget_bytes === "number" ? { budgetBytes: args.budget_bytes } : {}) });
  }
  if (descriptor.continuation === "document") {
    expected = await listProductDocuments({ root, context: String(args.context), artifact: args.artifact as never,
      ...(typeof args.cursor === "string" ? { cursor: args.cursor } : {}),
      ...(typeof args.limit === "number" ? { limit: args.limit } : {}) });
  } else if (descriptor.continuation === "element-find" || descriptor.continuation === "decision-find") {
    const input = { root, context: String(args.context),
      ...(typeof args.artifact === "string" ? { artifact: args.artifact as never } : {}),
      ...(typeof args.text === "string" ? { text: args.text } : {}),
      ...(typeof args.cursor === "string" ? { cursor: args.cursor } : {}),
      ...(typeof args.limit === "number" ? { limit: args.limit } : {}) };
    expected = descriptor.continuation === "element-find" ? await findProductElements(input) : await findProductDecisions(input);
  } else if (descriptor.continuation === "portion") {
    const input = { root, context: String(args.context), ...(typeof args.cursor === "string" ? { cursor: args.cursor } : {}) };
    expected = session.pending!.scenario === "product_element_get"
      ? await readProductElement({ ...input, elementRef: args.element_ref as never, pin: args.pin as never })
      : await readProductDecision({ ...input, decisionRef: args.decision_ref as never });
  }
  if (expected !== undefined && !isDeepStrictEqual(output, { protocol_version: 2, context: expected.context,
    result: expected.result, replayed: expected.replayed, operation_ref: expected.operationRef })) {
    return fail("SOURCE_CHANGED", "Read acknowledgement differs from its exact owning source portion.");
  }
  if (descriptor.tool.write) {
    if (typeof output.context !== "string") return fail("INVALID_STATE", "Candidate acknowledgement requires its current exact context.");
    const before = contextValue(session.pending!.context) as unknown as Record<string, unknown>;
    const after = contextValue(output.context) as unknown as Record<string, unknown>;
    for (const key of ["contract", "store_id", "product_id", "workspace_id", "canonical_workspace", "candidate_ref"]) {
      if (!isDeepStrictEqual(before[key], after[key])) return fail("SOURCE_CHANGED", "Mutation acknowledgement changed its immutable candidate binding.");
    }
    await resumeProductInterview({ root, context: output.context, candidateRef: session.candidate_ref });
  }
}
function delivered(session: SessionCheckpoint): Record<string, unknown> {
  const delivery = session.delivery!;
  const points = Array.from(delivery.response);
  const length = Math.min(DELIVERY_PORTION_CHARACTERS, points.length - delivery.offset);
  const offset = delivery.offset;
  delivery.offset += length;
  const pageComplete = delivery.offset === points.length;
  const complete = pageComplete && delivery.next_cursor === null;
  session.state = complete ? "acknowledged" : "delivering";
  if (complete) {
    const result = (JSON.parse(delivery.response) as { result: Record<string, unknown> }).result;
    if (result.complete !== false && typeof result.read_receipt === "string") session.completed_read = { scenario: session.pending!.scenario,
      arguments: session.pending!.arguments, receipt: result.read_receipt, item_key: typeof result.item_key === "string" ? result.item_key : null,
      source_version: delivery.source_version };
  }
  return { session_ref: sessionRef(session), session_revision: session.revision, state: session.state,
    read_ref: delivery.read_ref, complete, delivery: { encoding: "json-utf8", text: points.slice(offset, delivery.offset).join(""),
      offset, total_characters: points.length, complete: pageComplete }, operation_ref: session.pending!.operation_ref };
}
function retainedDelivery(session: SessionCheckpoint): Record<string, unknown> {
  const delivery = session.delivery;
  if (delivery === null || session.pending === null) return recoveryFailure(session.pending?.operation_ref ?? null);
  const points = Array.from(delivery.response);
  if (delivery.offset <= 0 || delivery.offset > points.length) return recoveryFailure(session.pending.operation_ref);
  try { JSON.parse(delivery.response); } catch { return recoveryFailure(session.pending.operation_ref); }
  const offset = Math.floor((delivery.offset - 1) / DELIVERY_PORTION_CHARACTERS) * DELIVERY_PORTION_CHARACTERS;
  const pageComplete = delivery.offset === points.length;
  return { session_ref: sessionRef(session), session_revision: session.revision, state: session.state,
    read_ref: delivery.read_ref, complete: pageComplete && delivery.next_cursor === null,
    delivery: { encoding: "json-utf8", text: points.slice(offset, delivery.offset).join(""), offset,
      total_characters: points.length, complete: pageComplete }, operation_ref: session.pending.operation_ref };
}

export function productSessionHandlers(tools: readonly WorkflowTool[]): {
  open(root: string, context: string, candidate: CandidateRef): Promise<Record<string, unknown>>;
  call(root: string, input: { session_ref: string; expected_revision: number; request_id: string; scenario: string; arguments: Record<string, unknown> }): Promise<Record<string, unknown>>;
  resume(root: string, input: { session_ref: string; expected_revision: number }): Promise<Record<string, unknown>>;
  next(root: string, input: { session_ref: string; expected_revision: number; read_ref: string }): Promise<Record<string, unknown>>;
  status(root: string, sessionReference: string): Promise<Record<string, unknown>>;
} {
  const ajv = new Ajv({ allErrors: true, jsonPointers: true, strictKeywords: true });
  const registry = new Map<string, Descriptor>();
  for (const name of [...CANDIDATE_SCENARIOS, ...READY_SCENARIOS]) {
    const selected = tools.find((item) => item.name === name);
    if (selected === undefined) continue;
    if (selected.outputSchema === undefined) return fail("INVALID_STATE", "Session scenario requires its published output schema.");
    registry.set(name, { tool: selected, validate: ajv.compile(selected.inputSchema), validateOutput: ajv.compile(selected.outputSchema),
      mode: (READY_SCENARIOS as readonly string[]).includes(name) ? "ready" : "candidate", continuation: CONTINUATIONS[name] ?? null });
  }
  const contextNext = tools.find((item) => item.name === "product_context_next")!;
  const validateContextNext = contextNext === undefined ? undefined : ajv.compile(contextNext.outputSchema!);
  return {
    async open(root, context, candidate) {
      await resumeProductInterview({ root, context, candidateRef: candidate });
      const identity = contextValue(context);
      const workspace = await resolveWorkspace({ root, workspace: identity.canonical_workspace });
      if (workspace.result.state !== "bound" || workspace.result.product_id !== candidate.product_id || workspace.result.workspace_id !== identity.workspace_id) {
        return fail("CONFLICT", "Session requires the candidate's exact current workspace binding.");
      }
      const session: SessionCheckpoint = { schema_version: 1, kind: "product_session", id: randomUUID(), product_id: candidate.product_id,
        candidate_ref: candidate, context, revision: 0, state: "idle", pending: null, delivery: null, completed_read: null,
        review_state_sha256: (await reviewSnapshot(root, candidate)).digest };
      await saveCheckpoint(root, session, true);
      return { session_ref: sessionRef(session), session_revision: 0, state: "idle", candidate_ref: candidate,
        supported_scenarios: [...registry.keys()].sort(), pending: null, complete: true, read_ref: null, delivery: null, operation_ref: null };
    },
    async call(root, input) {
      const ref = reference(input.session_ref);
      const initial = await readCheckpoint(root, ref);
      if (initial.revision !== input.expected_revision) return fail("CONFLICT", "Session revision changed; inspect product_session_status before continuing.");
      if (initial.state === "unknown" || initial.state === "pending" || initial.state === "blocked") return fail("RECOVERY_REQUIRED", "Retained request has an unknown outcome; explicit safe recovery is required.", { operation_ref: initial.pending?.operation_ref ?? null });
      if (initial.state === "delivering") return fail("PREREQUISITE_REQUIRED", "Finish product_session_next delivery before a dependent call.");
      if (initial.pending?.request_id === input.request_id) return fail("RECOVERY_REQUIRED", "Request identity is retained; inspect its acknowledgement rather than dispatching it again.");
      const descriptor = registry.get(input.scenario);
      if (descriptor === undefined) return fail("INVALID_INPUT", "Select a supported_scenarios entry returned by product_session_open; nested sessions and lifecycle scenarios are forbidden.");
      if (Object.hasOwn(input.arguments, "context") || Object.hasOwn(input.arguments, "cursor")) return fail("INVALID_INPUT", "Session injects context and owns continuations; omit both fields.");
      if (Buffer.byteLength(JSON.stringify(input.arguments)) + Buffer.byteLength(initial.context) > MAX_REQUEST_BYTES) return fail("INVALID_INPUT", "Session request exceeds the 128 KiB budget; dispatch was not started.");
      assertNonSensitive(input.arguments);
      assertReferences(input.arguments, initial.candidate_ref);
      const args = { ...input.arguments, context: injectedContext(initial, descriptor) };
      if (!descriptor.validate(args)) return fail("INVALID_INPUT", "Use the selected scenario's published parameters.", productValidationDiagnostics(descriptor.validate.errors ?? [], descriptor.tool.inputSchema));
      if (Buffer.byteLength(JSON.stringify(args)) > MAX_REQUEST_BYTES) return fail("INVALID_INPUT", "Session request exceeds the 128 KiB budget; dispatch was not started.");
      assertReceipt(initial, input.scenario, input.arguments);
      await resumeProductInterview({ root, context: initial.context, candidateRef: initial.candidate_ref });
      if ((await reviewSnapshot(root, initial.candidate_ref)).digest !== initial.review_state_sha256) return fail("CONFLICT", "Independent review state changed; inspect its effects and explicitly reopen a reconciled session before continuing.");
      return exclusive(root, ref, input.expected_revision, async (session) => {
        const inspectedReviews = await reviewSnapshot(root, session.candidate_ref);
        if (inspectedReviews.digest !== session.review_state_sha256) return fail("CONFLICT", "Review state changed before session dispatch; inspect and explicitly reopen.");
        const before = structuredClone(session);
        session.revision += 1;
        session.pending = { request_id: input.request_id, scenario: input.scenario, arguments: input.arguments,
          context: args.context, write: descriptor.tool.write, phase: "prepared", operation_ref: null };
        const identity = descriptor.tool.write ? productInterviewReplayIdentity(args.context, input.scenario, input.arguments) : null;
        if (identity !== null) {
          session.pending.operation_ref = identity.operationId;
          session.pending.recovery = { contract: "candidate-evidence-v1", request_sha256: requestDigest(session), attempts: 0 };
        }
        session.state = "pending";
        session.delivery = null;
        await saveCheckpoint(root, session);
        session.pending.phase = "dispatched";
        await saveCheckpoint(root, session);
        try {
          const output = await descriptor.tool.run(args);
          const delivery = prepareDelivery(session, descriptor, output);
          if (identity !== null && output.operation_ref !== identity.operationId) return fail("SOURCE_CHANGED", "Mutation acknowledgement changed its known exact operation identity.");
          if (identity !== null) {
            const owned = await inspectCompletedProductReplay({ root, productId: session.product_id,
              operationId: identity.operationId, scenario: input.scenario, intent: identity.intent });
            if (!isDeepStrictEqual(output.result, owned.result)) return fail("SOURCE_CHANGED", "Mutation acknowledgement differs from its exact persisted owning result.");
          }
          await verifyAcknowledgement(root, session, descriptor, args, output);
          session.pending.phase = "acknowledged";
          session.pending.operation_ref = typeof output.operation_ref === "string" ? output.operation_ref : null;
          session.delivery = delivery;
          if (descriptor.mode === "candidate" && typeof output.context === "string") session.context = output.context;
          const acknowledgedReviews = await reviewSnapshot(root, session.candidate_ref);
          await verifyOwnReviewEffects(root, session, inspectedReviews, acknowledgedReviews);
          session.review_state_sha256 = acknowledgedReviews.digest;
          const result = delivered(session);
          await saveCheckpoint(root, session);
          return result;
        } catch (error) {
          if (descriptor.tool.write) {
            session.context = before.context; session.state = "unknown"; session.delivery = null; session.pending.phase = "dispatched";
            if (identity === null && error instanceof WorkflowError && typeof error.details.operation_ref === "string" && UUID.test(error.details.operation_ref)) session.pending.operation_ref = error.details.operation_ref;
            await saveCheckpoint(root, session);
            return fail("RECOVERY_REQUIRED", "Dispatched mutation was not safely acknowledged; preserve its exact checkpoint and inspect effects before explicit recovery.", { operation_ref: session.pending.operation_ref, session_revision: session.revision, outcome: "unknown" });
          }
          else await saveCheckpoint(root, before);
          throw error;
        }
      });
    },
    async resume(root, input) {
      const ref = reference(input.session_ref);
      let initial: SessionCheckpoint;
      try { initial = await readCheckpoint(root, ref); }
      catch (error) { if (!(error instanceof WorkflowError)) throw error; return recoveryFailure(null); }
      if (initial.revision !== input.expected_revision) return fail("CONFLICT", "Session revision changed; inspect product_session_status before resuming.");
      if (initial.state === "acknowledged" || initial.state === "delivering") return retainedDelivery(initial);
      if (initial.state === "idle") {
        return { session_ref: sessionRef(initial), session_revision: initial.revision, state: initial.state,
          candidate_ref: initial.candidate_ref, complete: true, read_ref: null,
          delivery: null, operation_ref: initial.pending?.operation_ref ?? null };
      }
      try {
        return await exclusive(root, ref, input.expected_revision, async (session) => {
          const pending = session.pending;
          const blocked = async (): Promise<never> => {
            session.state = "blocked"; session.delivery = null; session.revision += 1;
            await saveCheckpoint(root, session);
            let knownEffects = null;
            if (pending?.operation_ref !== null && pending?.operation_ref !== undefined) {
              try {
                const observed = await inspectOperation(root, session.product_id, pending.operation_ref);
                knownEffects = { checkpoint_state: observed.state, checkpoint_phase: observed.phase, replay_safe: false };
              } catch { /* Invalid retained evidence is disclosed only as unverified. */ }
            }
            return recoveryFailure(pending?.operation_ref ?? null, knownEffects);
          };
          const descriptor = pending === null ? undefined : registry.get(pending.scenario);
          if (pending === null || descriptor === undefined || !descriptor.tool.write || !pending.write
            || pending.context !== session.context || pending.recovery?.contract !== "candidate-evidence-v1"
            || pending.recovery.request_sha256 !== requestDigest(session) || pending.recovery.attempts !== 0) return blocked();
          const args = { ...pending.arguments, context: pending.context };
          if (!descriptor.validate(args)) return blocked();
          assertNonSensitive(pending.arguments);
          assertReferences(pending.arguments, session.candidate_ref);
          const identity = productInterviewReplayIdentity(pending.context, pending.scenario, pending.arguments);
          if (identity === null || identity.operationId !== pending.operation_ref) return blocked();
          let evidence;
          try {
            evidence = await inspectCompletedProductReplay({ root, productId: session.product_id,
              operationId: identity.operationId, scenario: pending.scenario, intent: identity.intent });
            if ((await reviewSnapshot(root, session.candidate_ref)).digest !== session.review_state_sha256) return blocked();
          } catch (error) { if (!(error instanceof WorkflowError)) throw error; return blocked(); }
          // Persist the only replay allowance before invoking the original exact handler.
          pending.recovery.attempts = 1; session.state = "unknown"; session.revision += 1;
          await saveCheckpoint(root, session);
          try {
            const output = await descriptor.tool.run(args);
            if (output.replayed !== true || output.operation_ref !== identity.operationId
              || JSON.stringify(output.result) !== JSON.stringify(evidence.result) || typeof output.context !== "string") return blocked();
            await inspectCompletedProductReplay({ root, productId: session.product_id,
              operationId: identity.operationId, scenario: pending.scenario, intent: identity.intent });
            if ((await reviewSnapshot(root, session.candidate_ref)).digest !== session.review_state_sha256) return blocked();
            const delivery = prepareDelivery(session, descriptor, output);
            await verifyAcknowledgement(root, session, descriptor, args, output);
            session.delivery = delivery;
            session.context = output.context; pending.phase = "acknowledged";
            const result = delivered(session);
            await saveCheckpoint(root, session);
            return result;
          } catch (error) {
            if (!(error instanceof WorkflowError)) throw error;
            return blocked();
          }
        });
      } catch (error) {
        if (error instanceof WorkflowError && (error.code === "CONFLICT" || error.details.outcome === "blocked")) throw error;
        return recoveryFailure(initial.pending?.operation_ref ?? null);
      }
    },
    async next(root, input) {
      return exclusive(root, reference(input.session_ref), input.expected_revision, async (session) => {
        if (session.state !== "delivering" || session.delivery?.read_ref !== input.read_ref) return fail("INVALID_CURSOR", "Use the pending read_ref from this session's matching delivery.");
        const previous = session.delivery;
        if (previous.offset === Array.from(previous.response).length) {
          if (previous.next_cursor === null) return fail("INVALID_CURSOR", "The selected read has no further portion.");
          const descriptor = registry.get(session.pending!.scenario)!;
          const args = { ...(previous.continuation_scenario === "product_context_next" ? {} : session.pending!.arguments), context: session.pending!.context, cursor: previous.next_cursor };
          const output = await (previous.continuation_scenario === "product_context_next" ? contextNext : descriptor.tool).run(args);
          const delivery = prepareDelivery(session, descriptor, output, previous,
            previous.continuation_scenario === "product_context_next" ? validateContextNext : descriptor.validateOutput);
          await verifyAcknowledgement(root, session, descriptor, args, output);
          session.delivery = delivery;
        }
        session.revision += 1;
        const result = delivered(session);
        await saveCheckpoint(root, session);
        return result;
      });
    },
    async status(root, sessionReference) {
      const session = await readCheckpoint(root, reference(sessionReference));
      let freshness = "current";
      try { await resumeProductInterview({ root, context: session.context, candidateRef: session.candidate_ref }); }
      catch (error) { if (!(error instanceof WorkflowError)) throw error; freshness = error.code; }
      if (freshness === "current" && (await reviewSnapshot(root, session.candidate_ref)).digest !== session.review_state_sha256) freshness = "review_changed";
      return { session_ref: sessionRef(session), session_revision: session.revision, state: session.state, candidate_ref: session.candidate_ref,
        freshness, pending: session.pending === null ? null : { request_id: session.pending.request_id, scenario: session.pending.scenario,
          phase: session.pending.phase, write: session.pending.write }, complete: session.state === "idle" || session.state === "acknowledged",
        read_ref: session.state === "delivering" ? session.delivery?.read_ref ?? null : null, delivery: null,
        operation_ref: session.pending?.operation_ref ?? null,
        recovery_step: session.state === "unknown" || session.state === "pending" || session.state === "blocked" ? "Preserve checkpoint; safe session recovery is required before dependent writes." : freshness === "current" ? null : "Inspect current candidate/review effects and explicitly open a reconciled session; never silently replay the old intention." };
    },
  };
}
