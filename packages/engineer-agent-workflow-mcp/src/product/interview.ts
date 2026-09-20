import { constants } from "node:fs";
import { lstat, mkdir, open, rename, unlink } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { dirname } from "node:path";

import { fail, WorkflowError } from "../state.js";
import { validateProductPath } from "./config.js";
import { replayProductMutationResult, runProductMutation } from "./operations.js";
import { validateProductRecord } from "./schemas.js";
import { loadGeneration, saveObject, verifySourcePin } from "./storage.js";
import type { SourcePin } from "./storage.js";

const MAX_SOURCE_BYTES = 16 * 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/u;
const SENSITIVE_PATTERN = /\b(?:authorization\s*:\s*bearer|api[_-]?key\s*[:=]|access[_-]?token\s*[:=]|refresh[_-]?token\s*[:=]|client[_-]?secret\s*[:=]|private[_-]?key\s*[:=]|secret[_-]?access[_-]?key\s*[:=]|password\s*[:=]|secret\s*[:=])|-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----|\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b|\bgh[pousr]_[A-Za-z0-9]{20,}\b|\bxox[baprs]-[A-Za-z0-9-]{10,}\b/iu;
const CREDENTIAL_URI_PATTERN = /\b[a-z][a-z0-9+.-]*:\/\/[^\s/@]+@/iu;

type Artifact = "idea" | "prd" | "technical-design" | "roadmap";

interface CandidateRef {
  readonly product_id: string;
  readonly candidate_id: string;
}

interface DecisionRef {
  readonly product_id: string;
  readonly artifact: Artifact;
  readonly id: string;
  readonly revision: number;
}

interface Ref {
  readonly product_id: string;
  readonly artifact: Artifact;
  readonly element_id: string;
}

interface Scope {
  readonly depth: "lite" | "standard" | "deep";
  readonly profiles: readonly { readonly id: string; readonly reason: string }[];
  readonly rationale: readonly string[];
  readonly confirmed_answer: DecisionRef | null;
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

interface CandidateRecord {
  readonly schema_version: 1;
  readonly kind: "candidate";
  readonly product_id: string;
  readonly candidate_id: string;
  readonly artifact: Artifact;
  readonly base_generation: string | null;
  readonly workspace_id: string;
  readonly state: "draft" | "review_pending" | "reviewed" | "blocked" | "activated" | "abandoned";
  readonly scope: Scope;
  readonly registry: { readonly id: string; readonly object_sha256: string };
  readonly upstream_pins: readonly SourcePin[];
  readonly decision_heads: readonly { readonly decision_ref: DecisionRef; readonly object_sha256: string }[];
  readonly relations: readonly unknown[];
  readonly source_version: string;
}

interface ProductContext {
  readonly contract: "product-1";
  readonly store_id: string | null;
  readonly product_id: string | null;
  readonly workspace_id: string | null;
  readonly candidate_ref: CandidateRef | null;
  readonly selected_sources_sha256: string;
  readonly target_revision: string | null;
  readonly canonical_workspace: string;
}

interface RegistryRecord {
  readonly schema_version: 1;
  readonly kind: "registry";
  readonly product_id: string;
  readonly documents: readonly {
    readonly id: string;
    readonly artifact: Artifact;
    readonly role: "semantic" | "navigation";
    readonly subject: string;
    readonly relative_path: string;
    readonly object_sha256: string;
  }[];
  readonly element_metadata: readonly unknown[];
}

interface MutationResult extends Record<string, unknown> {
  readonly operation_ref: string;
  readonly applied: true;
  readonly candidate_ref: CandidateRef;
  readonly changed_refs: readonly Ref[];
  readonly decision_ref: DecisionRef | null;
  readonly question_ref: DecisionRef | null;
  readonly product_id: string;
  readonly workspace_id: string;
  readonly task_id: null;
  readonly specification_id: null;
  readonly review_ref: null;
  readonly next: string;
  readonly document_id: string | null;
}

export interface InterviewOutcome<T> {
  readonly context: string;
  readonly result: T;
  readonly replayed: boolean;
  readonly operationRef: string | null;
}

interface InterviewResumeResult extends Record<string, unknown> {
  readonly source_version: string;
  readonly candidate_ref: CandidateRef;
  readonly state: "needs_user" | "no_answer" | "complete";
  readonly question_ref: DecisionRef | null;
  readonly category: string | null;
  readonly question: string | null;
  readonly options: readonly { readonly id: string; readonly label: string }[];
  readonly last_outcome: "dismissed" | "cancelled" | "timed_out" | "unavailable" | "invalid_response" | "failed" | null;
}

interface CandidateState {
  readonly root: string;
  readonly context: ProductContext;
  readonly candidate: CandidateRecord;
  readonly candidateBytes: Buffer;
}

interface CandidateMutation {
  readonly candidate: Omit<CandidateRecord, "source_version">;
  readonly decision?: DecisionRecord;
  readonly changedRefs?: readonly Ref[];
  readonly decisionRef?: DecisionRef | null;
  readonly questionRef?: DecisionRef | null;
  readonly next: string;
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

function candidateVersion(candidate: object): string {
  return digest(canonicalBytes(Object.fromEntries(Object.entries(candidate).filter(([key]) => key !== "source_version"))));
}

function candidateWithoutVersion(candidate: CandidateRecord): Omit<CandidateRecord, "source_version"> {
  return Object.fromEntries(
    Object.entries(candidate).filter(([key]) => key !== "source_version"),
  ) as unknown as Omit<CandidateRecord, "source_version">;
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
    return fail("INVALID_STATE", "Product workflow file could not be closed safely.");
  }
}

async function readSafe(root: string, relativePath: string, workspace: string): Promise<Buffer | null> {
  const path = await validateProductPath(root, relativePath, { workspaceRoots: [workspace] });
  let pathStat;
  try {
    pathStat = await lstat(path);
  } catch (error) {
    if (nodeErrorCode(error) === "ENOENT") return null;
    return fail("INVALID_STATE", "Product workflow source cannot be inspected safely.");
  }
  if (pathStat.isSymbolicLink() || !pathStat.isFile() || pathStat.nlink !== 1) {
    return fail("UNSAFE_PATH", "Product workflow source must be a regular single-link file.");
  }
  if (pathStat.size > MAX_SOURCE_BYTES) return fail("SOURCE_LIMIT", "Product workflow source exceeds the 16 MiB limit.");
  let handle: FileHandle | undefined;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = await handle.stat();
    if (before.dev !== pathStat.dev || before.ino !== pathStat.ino || before.size !== pathStat.size) {
      return fail("SOURCE_CHANGED", "Product workflow source changed before it could be read.");
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
    ) return fail("SOURCE_CHANGED", "Product workflow source changed while it was read.");
    return bytes;
  } catch (error) {
    if (error instanceof WorkflowError) throw error;
    if (["ENOENT", "ELOOP"].includes(nodeErrorCode(error) ?? "")) {
      return fail("SOURCE_CHANGED", "Product workflow source changed while it was read.");
    }
    return fail("INVALID_STATE", "Product workflow source cannot be read safely.");
  } finally {
    await closeHandle(handle);
  }
}

async function atomicWrite(root: string, relativePath: string, bytes: Buffer, workspace: string): Promise<void> {
  let path = await validateProductPath(root, relativePath, { workspaceRoots: [workspace] });
  await mkdir(dirname(path), { recursive: true, mode: 0o700 }).catch(() => fail("INVALID_STATE", "Product workflow directory cannot be created safely."));
  path = await validateProductPath(root, relativePath, { workspaceRoots: [workspace] });
  const temporaryRelative = `${relativePath}.${randomUUID()}.tmp`;
  const temporaryPath = await validateProductPath(root, temporaryRelative, { workspaceRoots: [workspace] });
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
    return fail("INVALID_STATE", "Product workflow source cannot be replaced safely.");
  } finally {
    await closeHandle(handle);
    if (!installed) await unlink(temporaryPath).catch(() => undefined);
  }
}

function decodeContext(context: string): ProductContext {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(context, "base64url").toString("utf8"));
  } catch {
    return fail("INVALID_INPUT", "Product context is invalid.");
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) return fail("INVALID_INPUT", "Product context is invalid.");
  const record = value as Record<string, unknown>;
  const candidate = record.candidate_ref as Record<string, unknown> | null;
  if (
    record.contract !== "product-1"
    || !(record.store_id === null || (typeof record.store_id === "string" && UUID_PATTERN.test(record.store_id)))
    || !(record.product_id === null || (typeof record.product_id === "string" && UUID_PATTERN.test(record.product_id)))
    || !(record.workspace_id === null || (typeof record.workspace_id === "string" && UUID_PATTERN.test(record.workspace_id)))
    || !(candidate === null || (
      typeof candidate === "object"
      && !Array.isArray(candidate)
      && typeof candidate.product_id === "string"
      && UUID_PATTERN.test(candidate.product_id)
      && typeof candidate.candidate_id === "string"
      && UUID_PATTERN.test(candidate.candidate_id)
      && Object.keys(candidate).every((key) => ["product_id", "candidate_id"].includes(key))
    ))
    || typeof record.selected_sources_sha256 !== "string"
    || !DIGEST_PATTERN.test(record.selected_sources_sha256)
    || !(record.target_revision === null || (typeof record.target_revision === "string" && DIGEST_PATTERN.test(record.target_revision)))
    || typeof record.canonical_workspace !== "string"
    || record.canonical_workspace.length === 0
    || record.canonical_workspace.length > 4096
    || Object.keys(record).some((key) => ![
      "contract", "store_id", "product_id", "workspace_id", "candidate_ref",
      "selected_sources_sha256", "target_revision", "canonical_workspace",
    ].includes(key))
  ) return fail("INVALID_INPUT", "Product context is invalid.");
  return value as ProductContext;
}

function candidatePath(productId: string, candidateId: string): string {
  return `products/${productId}/drafts/${candidateId}/candidate.yaml`;
}

function documentPath(productId: string, candidateId: string, relativePath: string): string {
  return `products/${productId}/drafts/${candidateId}/documents/${relativePath}`;
}

function decisionPath(reference: DecisionRef): string {
  return `products/${reference.product_id}/decisions/${reference.artifact}/${reference.id}/${reference.revision}.yaml`;
}

function encodeContext(context: ProductContext, candidate: CandidateRecord): string {
  return Buffer.from(JSON.stringify({
    ...context,
    product_id: candidate.product_id,
    workspace_id: candidate.workspace_id,
    candidate_ref: { product_id: candidate.product_id, candidate_id: candidate.candidate_id },
    selected_sources_sha256: candidate.source_version,
    target_revision: candidate.base_generation,
  })).toString("base64url");
}

function parseJson(bytes: Buffer, label: string): unknown {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    return fail("INVALID_STATE", `${label} is malformed.`);
  }
}

async function loadCandidate(
  root: string,
  contextText: string,
  candidateRef: CandidateRef,
  requireCurrent = true,
): Promise<CandidateState> {
  const context = decodeContext(contextText);
  if (
    context.product_id !== candidateRef.product_id
    || context.workspace_id === null
    || context.target_revision === null
    || context.candidate_ref?.product_id !== candidateRef.product_id
    || context.candidate_ref.candidate_id !== candidateRef.candidate_id
  ) return fail("INVALID_INPUT", "Product interview requires the selected candidate context.");
  const bytes = await readSafe(root, candidatePath(candidateRef.product_id, candidateRef.candidate_id), context.canonical_workspace);
  if (bytes === null) return fail("NOT_FOUND", "Selected product candidate is unavailable.");
  const candidate = await validateProductRecord("Candidate", parseJson(bytes, "Selected product candidate")) as CandidateRecord;
  if (
    candidate.product_id !== candidateRef.product_id
    || candidate.candidate_id !== candidateRef.candidate_id
    || candidate.workspace_id !== context.workspace_id
    || candidate.base_generation !== context.target_revision
  ) return fail("CONFLICT", "Selected product candidate does not match its context.");
  if (requireCurrent && candidate.source_version !== context.selected_sources_sha256) {
    return fail("CONFLICT", "Product candidate changed since this context was issued.");
  }
  await loadGeneration(root, candidate.product_id, candidate.base_generation);
  const state = { root, context, candidate, candidateBytes: bytes };
  await verifyDecisionHistory(state);
  return state;
}

async function readDecisionEvidence(
  state: CandidateState,
  reference: DecisionRef,
  expectedDigest?: string,
): Promise<DecisionRecord> {
  if (reference.product_id !== state.candidate.product_id) return fail("NOT_FOUND", "Decision belongs to another product.");
  const bytes = await readSafe(state.root, decisionPath(reference), state.context.canonical_workspace);
  if (bytes === null) return fail("MISSING_EVIDENCE", "Required product decision evidence is unavailable.");
  if (expectedDigest !== undefined && digest(bytes) !== expectedDigest) {
    return fail("SOURCE_CHANGED", "Current product decision evidence changed after it was selected.");
  }
  const decision = await validateProductRecord("Decision", parseJson(bytes, "Product decision evidence")) as DecisionRecord;
  if (
    decision.ref.product_id !== reference.product_id
    || decision.ref.artifact !== reference.artifact
    || decision.ref.id !== reference.id
    || decision.ref.revision !== reference.revision
  ) return fail("SOURCE_CHANGED", "Product decision evidence does not match its reference.");
  return decision;
}

async function verifyDecisionHistory(state: CandidateState): Promise<void> {
  const pending: { reference: DecisionRef; expectedDigest?: string }[] = state.candidate.decision_heads.map((head) => ({
    reference: head.decision_ref,
    expectedDigest: head.object_sha256,
  }));
  const seen = new Set<string>();
  while (pending.length > 0) {
    if (seen.size >= 100_000) return fail("SOURCE_LIMIT", "Product decision history exceeds the supported revision count.");
    const current = pending.pop()!;
    const key = `${current.reference.artifact}:${current.reference.id}:${current.reference.revision}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const decision = await readDecisionEvidence(state, current.reference, current.expectedDigest);
    for (const predecessor of decision.predecessors) {
      if (predecessor.product_id !== state.candidate.product_id) {
        return fail("BROKEN_REFERENCE", "Product decision predecessor belongs to another product.");
      }
      pending.push({ reference: predecessor });
    }
  }
}

async function loadDecision(state: CandidateState, reference: DecisionRef): Promise<DecisionRecord> {
  return readDecisionEvidence(state, reference);
}

function assertCandidateRef(candidate: CandidateRecord, reference: DecisionRef): void {
  if (reference.product_id !== candidate.product_id || reference.artifact !== candidate.artifact) {
    return fail("NOT_FOUND", "Decision reference is outside the selected candidate artifact.");
  }
}

function assertAffectedRefs(candidate: CandidateRecord, references: readonly Ref[]): void {
  const keys = new Set<string>();
  for (const reference of references) {
    if (reference.product_id !== candidate.product_id || reference.artifact !== candidate.artifact) {
      return fail("NOT_FOUND", "Affected semantic reference is outside the selected candidate artifact.");
    }
    const key = `${reference.artifact}:${reference.element_id}`;
    if (keys.has(key)) return fail("INVALID_INPUT", "Affected semantic references contain duplicates.");
    keys.add(key);
  }
}

function assertNonSensitive(value: unknown): void {
  const pending: unknown[] = [value];
  while (pending.length > 0) {
    const current = pending.pop();
    if (typeof current === "string") {
      if (SENSITIVE_PATTERN.test(current) || CREDENTIAL_URI_PATTERN.test(current)) {
        return fail("INVALID_INPUT", "Sensitive values cannot be stored in product workflow evidence.");
      }
    } else if (Array.isArray(current)) pending.push(...(current as unknown[]));
    else if (current !== null && typeof current === "object") pending.push(...Object.values(current as Record<string, unknown>));
  }
}

function mutationResult(
  operationId: string,
  candidate: CandidateRecord,
  next: string,
  values: {
    readonly changedRefs?: readonly Ref[];
    readonly decisionRef?: DecisionRef | null;
    readonly questionRef?: DecisionRef | null;
    readonly documentId?: string | null;
  } = {},
): MutationResult {
  return {
    operation_ref: operationId,
    applied: true,
    candidate_ref: { product_id: candidate.product_id, candidate_id: candidate.candidate_id },
    changed_refs: values.changedRefs ?? [],
    decision_ref: values.decisionRef ?? null,
    question_ref: values.questionRef ?? null,
    product_id: candidate.product_id,
    workspace_id: candidate.workspace_id,
    task_id: null,
    specification_id: null,
    review_ref: null,
    next,
    document_id: values.documentId ?? null,
  };
}

function operationId(scenario: string, candidate: CandidateRef, sourceVersion: string, input: unknown): string {
  return deterministicUuid(`${scenario}:${candidate.product_id}:${candidate.candidate_id}:${sourceVersion}:${JSON.stringify(input)}`);
}

async function applyCandidate(
  state: CandidateState,
  expected: Buffer,
  next: Buffer,
): Promise<void> {
  const relative = candidatePath(state.candidate.product_id, state.candidate.candidate_id);
  const current = await readSafe(state.root, relative, state.context.canonical_workspace);
  if (current?.equals(next)) return;
  if (!current?.equals(expected)) return fail("CONFLICT", "Product candidate changed during mutation recovery.");
  await atomicWrite(state.root, relative, next, state.context.canonical_workspace);
}

async function verifyCandidate(state: CandidateState, expected: Buffer): Promise<void> {
  const current = await readSafe(
    state.root,
    candidatePath(state.candidate.product_id, state.candidate.candidate_id),
    state.context.canonical_workspace,
  );
  if (!current?.equals(expected)) return fail("CONFLICT", "Product candidate changed during mutation recovery.");
}

async function replayCandidateMutation(
  root: string,
  contextText: string,
  candidateRef: CandidateRef,
  scenario: string,
  scenarioInput: Record<string, unknown>,
): Promise<InterviewOutcome<MutationResult> | null> {
  const context = decodeContext(contextText);
  if (
    context.product_id !== candidateRef.product_id
    || context.candidate_ref?.product_id !== candidateRef.product_id
    || context.candidate_ref.candidate_id !== candidateRef.candidate_id
  ) return fail("INVALID_INPUT", "Product interview requires the selected candidate context.");
  const id = operationId(scenario, candidateRef, context.selected_sources_sha256, scenarioInput);
  let replay;
  try {
    replay = await replayProductMutationResult({
      root,
      productId: candidateRef.product_id,
      operationId: id,
      scenario,
      intent: { schema_version: 1, kind: "operation_intent", scenario, input: scenarioInput },
    });
  } catch (error) {
    if (error instanceof WorkflowError && error.code === "NOT_FOUND") return null;
    throw error;
  }
  const state = await loadCandidate(root, contextText, candidateRef, false);
  return {
    context: encodeContext(context, state.candidate),
    result: replay.result as MutationResult,
    replayed: true,
    operationRef: replay.operationRef,
  };
}

async function executeCandidateMutation(
  state: CandidateState,
  scenario: string,
  scenarioInput: Record<string, unknown>,
  build: () => Promise<CandidateMutation> | CandidateMutation,
): Promise<InterviewOutcome<MutationResult>> {
  const id = operationId(
    scenario,
    { product_id: state.candidate.product_id, candidate_id: state.candidate.candidate_id },
    state.candidate.source_version,
    scenarioInput,
  );
  const mutation = await build();
  assertNonSensitive(scenarioInput);
  const candidate: CandidateRecord = {
    ...mutation.candidate,
    source_version: candidateVersion(mutation.candidate),
  };
  await validateProductRecord("Candidate", candidate);
  let decisionBytes: Buffer | undefined;
  let decisionDigest: string | undefined;
  if (mutation.decision !== undefined) {
    await validateProductRecord("Decision", mutation.decision);
    decisionBytes = canonicalBytes(mutation.decision);
    decisionDigest = digest(decisionBytes);
    const currentHead = candidate.decision_heads.find((head) => (
      head.decision_ref.id === mutation.decision!.ref.id
      && head.decision_ref.artifact === mutation.decision!.ref.artifact
    ));
    if (currentHead?.object_sha256 !== decisionDigest) {
      return fail("INVALID_STATE", "Product decision head does not match the prepared decision.");
    }
  }
  const candidateBytes = canonicalBytes(candidate);
  const result = mutationResult(id, candidate, mutation.next, {
    ...(mutation.changedRefs === undefined ? {} : { changedRefs: mutation.changedRefs }),
    ...(mutation.decisionRef === undefined ? {} : { decisionRef: mutation.decisionRef }),
    ...(mutation.questionRef === undefined ? {} : { questionRef: mutation.questionRef }),
  });
  const relative = candidatePath(candidate.product_id, candidate.candidate_id);
  const outcome = await runProductMutation({
    root: state.root,
    productId: candidate.product_id,
    operationId: id,
    sessionId: randomUUID(),
    scenario,
    expectedRevision: state.candidate.base_generation,
    nextRevision: state.candidate.base_generation ?? fail("PREREQUISITE_REQUIRED", "Product interview requires a base generation."),
    intent: { schema_version: 1, kind: "operation_intent", scenario, input: scenarioInput },
    result,
    targets: [{
      root: "store",
      binding_id: null,
      relative_path: relative,
      before: digest(state.candidateBytes),
      after: digest(candidateBytes),
    }],
    saveObjects: async () => {
      if (mutation.decision !== undefined && decisionBytes !== undefined && decisionDigest !== undefined) {
        const saved = await saveObject(state.root, {
          productId: candidate.product_id,
          kind: "decision",
          bytes: decisionBytes,
          artifact: mutation.decision.ref.artifact,
          decisionId: mutation.decision.ref.id,
          revision: mutation.decision.ref.revision,
        });
        if (saved.sha256 !== decisionDigest) return fail("INVALID_STATE", "Stored product decision does not match its validated digest.");
      }
      await applyCandidate(state, state.candidateBytes, candidateBytes);
    },
    verifyTargets: () => verifyCandidate(state, candidateBytes),
  });
  return {
    context: encodeContext(state.context, candidate),
    result: outcome.result as MutationResult,
    replayed: outcome.replayed,
    operationRef: outcome.operationRef,
  };
}

function currentHead(candidate: CandidateRecord, reference: DecisionRef): { readonly decision_ref: DecisionRef; readonly object_sha256: string } {
  assertCandidateRef(candidate, reference);
  const head = candidate.decision_heads.find((candidateHead) => (
    candidateHead.decision_ref.artifact === reference.artifact
    && candidateHead.decision_ref.id === reference.id
  ));
  if (head === undefined || head.decision_ref.revision !== reference.revision) {
    return fail("CONFLICT", "Decision reference is not current in the selected candidate.");
  }
  return head;
}

function replaceHead(
  candidate: CandidateRecord,
  decision: DecisionRecord,
): Omit<CandidateRecord, "source_version"> {
  const bytes = canonicalBytes(decision);
  const head = { decision_ref: decision.ref, object_sha256: digest(bytes) };
  const prior = candidate.decision_heads.filter((candidateHead) => !(
    candidateHead.decision_ref.artifact === decision.ref.artifact
    && candidateHead.decision_ref.id === decision.ref.id
  ));
  const withoutVersion = candidateWithoutVersion(candidate);
  return { ...withoutVersion, decision_heads: [...prior, head] };
}

function nextDecision(
  candidate: CandidateRecord,
  values: Omit<DecisionRecord, "schema_version" | "kind" | "candidate_id">,
): DecisionRecord {
  return {
    schema_version: 1,
    kind: "decision",
    ...values,
    candidate_id: candidate.candidate_id,
  };
}

function assertDistinctProfiles(profiles: readonly { readonly id: string }[]): void {
  if (new Set(profiles.map((profile) => profile.id)).size !== profiles.length) {
    return fail("INVALID_INPUT", "Scope profiles contain duplicates.");
  }
}

function preparedQuestionText(text: string, options: readonly { readonly id: string; readonly label: string }[]): string {
  const value = JSON.stringify({ text, options });
  if (value.length > 8192) return fail("SOURCE_LIMIT", "Prepared question evidence exceeds the supported decision size.");
  return value;
}

async function questionDecision(
  state: CandidateState,
  reference: DecisionRef,
): Promise<DecisionRecord> {
  currentHead(state.candidate, reference);
  const decision = await loadDecision(state, reference);
  if (decision.candidate_id !== state.candidate.candidate_id) return fail("NOT_FOUND", "Question belongs to another candidate.");
  return decision;
}

function questionOptions(decision: DecisionRecord): readonly { readonly id: string; readonly label: string }[] {
  try {
    const value = JSON.parse(decision.text) as { text?: unknown; options?: unknown };
    if (value.text !== decision.question || !Array.isArray(value.options)) throw new Error();
    return value.options as { readonly id: string; readonly label: string }[];
  } catch {
    return fail("INVALID_STATE", "Prepared question evidence is malformed.");
  }
}

function noAnswerOutcome(value: string): InterviewResumeResult["last_outcome"] {
  if (["dismissed", "cancelled", "timed_out", "unavailable", "invalid_response", "failed"].includes(value)) {
    return value as Exclude<InterviewResumeResult["last_outcome"], null>;
  }
  return fail("INVALID_STATE", "Saved no-answer outcome is invalid.");
}

export async function resumeProductInterview(input: {
  readonly root: string;
  readonly context: string;
  readonly candidateRef: CandidateRef;
}): Promise<InterviewOutcome<InterviewResumeResult>> {
  const state = await loadCandidate(input.root, input.context, input.candidateRef);
  for (const head of state.candidate.decision_heads) {
    const current = await readDecisionEvidence(state, head.decision_ref, head.object_sha256);
    if (current.state !== "needs_user" && current.state !== "no_answer") continue;
    if (current.question === null) return fail("INVALID_STATE", "Unresolved product decision has no saved question.");
    let prepared = current;
    let lastOutcome: InterviewResumeResult["last_outcome"] = null;
    if (current.state === "no_answer") {
      if (current.predecessors.length !== 1) return fail("INVALID_STATE", "No-answer decision has invalid question ancestry.");
      prepared = await loadDecision(state, current.predecessors[0]!);
      if (
        prepared.state !== "needs_user"
        || prepared.question === null
        || prepared.question !== current.question
        || prepared.candidate_id !== state.candidate.candidate_id
      ) return fail("INVALID_STATE", "No-answer decision does not resolve to its prepared question.");
      lastOutcome = noAnswerOutcome(current.text);
    }
    return {
      context: input.context,
      result: {
        source_version: state.candidate.source_version,
        candidate_ref: input.candidateRef,
        state: current.state,
        question_ref: current.ref,
        category: current.category,
        question: current.question,
        options: questionOptions(prepared),
        last_outcome: lastOutcome,
      },
      replayed: false,
      operationRef: null,
    };
  }
  return {
    context: input.context,
    result: {
      source_version: state.candidate.source_version,
      candidate_ref: input.candidateRef,
      state: "complete",
      question_ref: null,
      category: null,
      question: null,
      options: [],
      last_outcome: null,
    },
    replayed: false,
    operationRef: null,
  };
}

export async function draftProductArtifact(input: {
  readonly root: string;
  readonly context: string;
  readonly artifact: Artifact;
  readonly upstreamPins: readonly SourcePin[];
}): Promise<InterviewOutcome<MutationResult>> {
  const context = decodeContext(input.context);
  if (context.product_id === null || context.workspace_id === null || context.target_revision === null || context.candidate_ref !== null) {
    return fail("INVALID_INPUT", "Artifact drafting requires a bound product context without a selected candidate.");
  }
  assertNonSensitive(input.upstreamPins);
  const scenarioInput = { artifact: input.artifact, upstream_pins: input.upstreamPins };
  const draftOperationId = deterministicUuid(`product_artifact_draft:${context.product_id}:${context.workspace_id}:${context.target_revision}:${JSON.stringify(scenarioInput)}`);
  const candidateId = deterministicUuid(`candidate:${draftOperationId}`);
  const candidateRef = { product_id: context.product_id, candidate_id: candidateId };
  let replay;
  try {
    replay = await replayProductMutationResult({
      root: input.root,
      productId: context.product_id,
      operationId: draftOperationId,
      scenario: "product_artifact_draft",
      intent: { schema_version: 1, kind: "operation_intent", scenario: "product_artifact_draft", input: scenarioInput },
    });
  } catch (error) {
    if (!(error instanceof WorkflowError && error.code === "NOT_FOUND")) throw error;
  }
  if (replay !== undefined) {
    const selectedContext = Buffer.from(JSON.stringify({ ...context, candidate_ref: candidateRef })).toString("base64url");
    const state = await loadCandidate(input.root, selectedContext, candidateRef, false);
    return {
      context: encodeContext(context, state.candidate),
      result: replay.result as MutationResult,
      replayed: true,
      operationRef: replay.operationRef,
    };
  }

  const generation = await loadGeneration(input.root, context.product_id, context.target_revision);
  const registry = parseJson(Buffer.from(generation.registry), "Selected product registry") as RegistryRecord;
  if (registry.product_id !== context.product_id) return fail("SOURCE_CHANGED", "Selected product registry belongs to another product.");
  for (const pin of input.upstreamPins) {
    if (pin.product_id !== context.product_id || pin.generation !== context.target_revision) {
      return fail("SOURCE_CHANGED", "Upstream pin is outside the selected product generation.");
    }
    await verifySourcePin(input.root, pin);
  }

  const loadedById = new Map(generation.documents.map((document) => [document.id, Buffer.from(document.bytes)]));
  const documents = [...registry.documents];
  const draftDocuments = new Map<string, Buffer>();
  for (const document of documents) {
    const bytes = loadedById.get(document.id);
    if (bytes === undefined) return fail("SOURCE_CHANGED", "Selected registry document is unavailable.");
    draftDocuments.set(document.id, bytes);
  }
  if (!documents.some((document) => document.artifact === input.artifact)) {
    const title = input.artifact === "technical-design" ? "Technical Design" : input.artifact === "prd" ? "PRD" : input.artifact[0]!.toUpperCase() + input.artifact.slice(1);
    const semanticId = deterministicUuid(`document:${candidateId}:${input.artifact}:overview`);
    const semanticBytes = Buffer.from(`# ${title} Overview\n`, "utf8");
    documents.push({
      id: semanticId,
      artifact: input.artifact,
      role: "semantic",
      subject: "Overview",
      relative_path: `${input.artifact}/overview.md`,
      object_sha256: digest(semanticBytes),
    });
    draftDocuments.set(semanticId, semanticBytes);
    if (["prd", "technical-design"].includes(input.artifact)) {
      const navigationId = deterministicUuid(`document:${candidateId}:${input.artifact}:index`);
      const navigationBytes = Buffer.from(`# ${title}\n\n- [Overview](overview.md)\n`, "utf8");
      documents.push({
        id: navigationId,
        artifact: input.artifact,
        role: "navigation",
        subject: "Index",
        relative_path: `${input.artifact}/index.md`,
        object_sha256: digest(navigationBytes),
      });
      draftDocuments.set(navigationId, navigationBytes);
    }
  }
  const nextRegistry: RegistryRecord = { ...registry, documents };
  const registryBytes = canonicalBytes(nextRegistry);
  const registryDigest = digest(registryBytes);
  const withoutVersion: Omit<CandidateRecord, "source_version"> = {
    schema_version: 1,
    kind: "candidate",
    product_id: context.product_id,
    candidate_id: candidateId,
    artifact: input.artifact,
    base_generation: context.target_revision,
    workspace_id: context.workspace_id,
    state: "draft",
    scope: { depth: "lite", profiles: [], rationale: [], confirmed_answer: null },
    registry: { id: generation.generation.registry.id, object_sha256: registryDigest },
    upstream_pins: input.upstreamPins,
    decision_heads: generation.generation.decision_heads,
    relations: generation.generation.relations,
  };
  const candidate: CandidateRecord = { ...withoutVersion, source_version: candidateVersion(withoutVersion) };
  await validateProductRecord("Candidate", candidate);
  const candidateBytes = canonicalBytes(candidate);
  const changes = [
    { relativePath: candidatePath(context.product_id, candidateId), bytes: candidateBytes },
    ...documents.map((document) => ({
      relativePath: documentPath(context.product_id!, candidateId, document.relative_path),
      bytes: draftDocuments.get(document.id)!,
    })),
  ];
  const result = mutationResult(draftOperationId, candidate, "Continue the artifact-specific scope interview.");
  const outcome = await runProductMutation({
    root: input.root,
    productId: context.product_id,
    operationId: draftOperationId,
    sessionId: randomUUID(),
    scenario: "product_artifact_draft",
    expectedRevision: context.target_revision,
    nextRevision: context.target_revision,
    intent: { schema_version: 1, kind: "operation_intent", scenario: "product_artifact_draft", input: scenarioInput },
    result,
    targets: changes.map((change) => ({
      root: "store" as const,
      binding_id: null,
      relative_path: change.relativePath,
      before: null,
      after: digest(change.bytes),
    })),
    saveObjects: async () => {
      for (const document of documents) {
        const bytes = draftDocuments.get(document.id)!;
        const saved = await saveObject(input.root, { productId: context.product_id!, kind: "markdown", bytes });
        if (saved.sha256 !== document.object_sha256) return fail("INVALID_STATE", "Stored draft document does not match its validated digest.");
      }
      const savedRegistry = await saveObject(input.root, { productId: context.product_id!, kind: "record", bytes: registryBytes });
      if (savedRegistry.sha256 !== registryDigest) return fail("INVALID_STATE", "Stored draft registry does not match its validated digest.");
      for (const change of changes) {
        const existing = await readSafe(input.root, change.relativePath, context.canonical_workspace);
        if (existing?.equals(change.bytes)) continue;
        if (existing !== null) return fail("CONFLICT", "Product draft target already exists with different content.");
        await atomicWrite(input.root, change.relativePath, change.bytes, context.canonical_workspace);
      }
    },
    verifyTargets: async () => {
      for (const change of changes) {
        const current = await readSafe(input.root, change.relativePath, context.canonical_workspace);
        if (!current?.equals(change.bytes)) return fail("CONFLICT", "Product draft target changed during recovery.");
      }
    },
  });
  return {
    context: encodeContext(context, candidate),
    result: outcome.result as MutationResult,
    replayed: outcome.replayed,
    operationRef: outcome.operationRef,
  };
}

export async function proposeProductScope(input: {
  readonly root: string;
  readonly context: string;
  readonly candidateRef: CandidateRef;
  readonly depth: Scope["depth"];
  readonly profiles: Scope["profiles"];
  readonly rationale: readonly string[];
}): Promise<InterviewOutcome<MutationResult>> {
  assertDistinctProfiles(input.profiles);
  const scenarioInput = { candidate_ref: input.candidateRef, depth: input.depth, profiles: input.profiles, rationale: input.rationale };
  const replay = await replayCandidateMutation(input.root, input.context, input.candidateRef, "product_scope_propose", scenarioInput);
  if (replay !== null) return replay;
  const state = await loadCandidate(input.root, input.context, input.candidateRef);
  const id = operationId("product_scope_propose", input.candidateRef, state.candidate.source_version, scenarioInput);
  const reference: DecisionRef = { product_id: state.candidate.product_id, artifact: state.candidate.artifact, id: deterministicUuid(`decision:${id}`), revision: 1 };
  const question = "Confirm the proposed interview depth, active profiles, and artifact scope.";
  const decision = nextDecision(state.candidate, {
    ref: reference,
    state: "needs_user",
    category: "scope",
    question,
    text: preparedQuestionText(question, [{ id: "confirm", label: "Confirm" }, { id: "change", label: "Change" }]),
    source: "product_scope_propose",
    selected_ids: [],
    predecessors: [],
    affected_refs: [],
    reconsider_when: null,
  });
  const candidate = replaceHead(state.candidate, decision);
  return executeCandidateMutation(state, "product_scope_propose", scenarioInput, () => ({
    candidate: { ...candidate, scope: { depth: input.depth, profiles: input.profiles, rationale: input.rationale, confirmed_answer: null } },
    decision,
    questionRef: reference,
    next: "Ask the saved scope question with the host-native question tool and record the actual outcome.",
  }));
}

export async function prepareProductQuestion(input: {
  readonly root: string;
  readonly context: string;
  readonly candidateRef: CandidateRef;
  readonly category: string;
  readonly text: string;
  readonly options: readonly { readonly id: string; readonly label: string }[];
  readonly revises?: DecisionRef;
}): Promise<InterviewOutcome<MutationResult>> {
  if (new Set(input.options.map((option) => option.id)).size !== input.options.length) return fail("INVALID_INPUT", "Question options contain duplicate identities.");
  const scenarioInput = {
    candidate_ref: input.candidateRef,
    category: input.category,
    text: input.text,
    options: input.options,
    ...(input.revises === undefined ? {} : { revises: input.revises }),
  };
  const replay = await replayCandidateMutation(input.root, input.context, input.candidateRef, "product_question_prepare", scenarioInput);
  if (replay !== null) return replay;
  const state = await loadCandidate(input.root, input.context, input.candidateRef);
  let reference: DecisionRef;
  let predecessors: DecisionRef[];
  if (input.revises === undefined) {
    const id = operationId("product_question_prepare", input.candidateRef, state.candidate.source_version, scenarioInput);
    reference = { product_id: state.candidate.product_id, artifact: state.candidate.artifact, id: deterministicUuid(`decision:${id}`), revision: 1 };
    predecessors = [];
  } else {
    currentHead(state.candidate, input.revises);
    const previous = await loadDecision(state, input.revises);
    if (previous.candidate_id !== state.candidate.candidate_id) return fail("NOT_FOUND", "Revised question belongs to another candidate.");
    reference = { ...input.revises, revision: input.revises.revision + 1 };
    predecessors = [input.revises];
  }
  const decision = nextDecision(state.candidate, {
    ref: reference,
    state: "needs_user",
    category: input.category,
    question: input.text,
    text: preparedQuestionText(input.text, input.options),
    source: "product_question_prepare",
    selected_ids: [],
    predecessors,
    affected_refs: [],
    reconsider_when: null,
  });
  return executeCandidateMutation(state, "product_question_prepare", scenarioInput, () => ({
    candidate: replaceHead(state.candidate, decision),
    decision,
    questionRef: reference,
    next: "Ask the saved question with the host-native question tool and record the actual outcome.",
  }));
}

export async function answerProductQuestion(input: {
  readonly root: string;
  readonly context: string;
  readonly candidateRef: CandidateRef;
  readonly questionRef: DecisionRef;
  readonly text: string;
  readonly source: string;
  readonly selectedIds: readonly string[];
}): Promise<InterviewOutcome<MutationResult>> {
  const scenarioInput = { candidate_ref: input.candidateRef, question_ref: input.questionRef, text: input.text, source: input.source, selected_ids: input.selectedIds };
  const replay = await replayCandidateMutation(input.root, input.context, input.candidateRef, "product_question_answer", scenarioInput);
  if (replay !== null) return replay;
  const state = await loadCandidate(input.root, input.context, input.candidateRef);
  const question = await questionDecision(state, input.questionRef);
  if (question.state !== "needs_user" || question.question === null) return fail("ANSWER_REQUIRED", "Selected decision is not an unresolved question.");
  const options = questionOptions(question);
  if (
    new Set(input.selectedIds).size !== input.selectedIds.length
    || input.selectedIds.some((id) => !options.some((option) => option.id === id))
    || (options.length === 0 && input.selectedIds.length > 0)
  ) return fail("INVALID_INPUT", "Recorded answer does not match the saved question options.");
  const reference = { ...input.questionRef, revision: input.questionRef.revision + 1 };
  const decision = nextDecision(state.candidate, {
    ref: reference,
    state: "answered",
    category: question.category,
    question: question.question,
    text: input.text,
    source: input.source,
    selected_ids: input.selectedIds,
    predecessors: [input.questionRef],
    affected_refs: question.affected_refs,
    reconsider_when: null,
  });
  return executeCandidateMutation(state, "product_question_answer", scenarioInput, () => ({
    candidate: replaceHead(state.candidate, decision),
    decision,
    decisionRef: reference,
    next: "Continue from the next unresolved material question.",
  }));
}

export async function recordProductNoAnswer(input: {
  readonly root: string;
  readonly context: string;
  readonly candidateRef: CandidateRef;
  readonly questionRef: DecisionRef;
  readonly outcome: "dismissed" | "cancelled" | "timed_out" | "unavailable" | "invalid_response" | "failed";
}): Promise<InterviewOutcome<MutationResult>> {
  const scenarioInput = { candidate_ref: input.candidateRef, question_ref: input.questionRef, outcome: input.outcome };
  const replay = await replayCandidateMutation(input.root, input.context, input.candidateRef, "product_question_no_answer", scenarioInput);
  if (replay !== null) return replay;
  const state = await loadCandidate(input.root, input.context, input.candidateRef);
  const question = await questionDecision(state, input.questionRef);
  if (question.state !== "needs_user" || question.question === null) return fail("ANSWER_REQUIRED", "Selected decision is not an unresolved question.");
  const reference = { ...input.questionRef, revision: input.questionRef.revision + 1 };
  const decision = nextDecision(state.candidate, {
    ref: reference,
    state: "no_answer",
    category: question.category,
    question: question.question,
    text: input.outcome,
    source: "product_question_no_answer",
    selected_ids: [],
    predecessors: [input.questionRef],
    affected_refs: question.affected_refs,
    reconsider_when: null,
  });
  return executeCandidateMutation(state, "product_question_no_answer", scenarioInput, () => ({
    candidate: replaceHead(state.candidate, decision),
    decision,
    decisionRef: reference,
    next: "Question remains unresolved; retry it when an explicit answer is available.",
  }));
}

export async function confirmProductScope(input: {
  readonly root: string;
  readonly context: string;
  readonly candidateRef: CandidateRef;
  readonly proposalRef: DecisionRef;
  readonly answerRef: DecisionRef;
}): Promise<InterviewOutcome<MutationResult>> {
  const scenarioInput = { candidate_ref: input.candidateRef, proposal_ref: input.proposalRef, answer_ref: input.answerRef };
  const replay = await replayCandidateMutation(input.root, input.context, input.candidateRef, "product_scope_confirm", scenarioInput);
  if (replay !== null) return replay;
  const state = await loadCandidate(input.root, input.context, input.candidateRef);
  if (state.candidate.scope.confirmed_answer !== null) return fail("CONFLICT", "Candidate scope is already confirmed.");
  const answer = await questionDecision(state, input.answerRef);
  const proposal = await loadDecision(state, input.proposalRef);
  if (
    proposal.state !== "needs_user"
    || proposal.category !== "scope"
    || answer.state !== "answered"
    || answer.category !== "scope"
    || answer.predecessors.length !== 1
    || JSON.stringify(answer.predecessors[0]) !== JSON.stringify(input.proposalRef)
    || answer.selected_ids.length !== 1
    || answer.selected_ids[0] !== "confirm"
  ) return fail("ANSWER_REQUIRED", "Scope confirmation requires the exact affirmative answer to the saved proposal.");
  const candidate = candidateWithoutVersion(state.candidate);
  return executeCandidateMutation(state, "product_scope_confirm", scenarioInput, () => ({
    candidate: { ...candidate, scope: { ...state.candidate.scope, confirmed_answer: input.answerRef } },
    next: "Load only the confirmed active profile guidance and continue the interview.",
  }));
}

async function recordDecision(
  input: {
    readonly root: string;
    readonly context: string;
    readonly candidateRef: CandidateRef;
    readonly scenario: "product_record_instruction" | "product_record_observation" | "product_record_assumption" | "product_record_research";
    readonly scenarioInput: Record<string, unknown>;
    readonly state: DecisionRecord["state"];
    readonly category: string;
    readonly text: string;
    readonly source: string;
    readonly predecessors: readonly DecisionRef[];
    readonly predecessorsMustBeQuestions?: boolean;
    readonly affectedRefs: readonly Ref[];
    readonly reconsiderWhen: string | null;
  },
): Promise<InterviewOutcome<MutationResult>> {
  const replay = await replayCandidateMutation(input.root, input.context, input.candidateRef, input.scenario, input.scenarioInput);
  if (replay !== null) return replay;
  const state = await loadCandidate(input.root, input.context, input.candidateRef);
  assertAffectedRefs(state.candidate, input.affectedRefs);
  for (const predecessor of input.predecessors) {
    assertCandidateRef(state.candidate, predecessor);
    const decision = await loadDecision(state, predecessor);
    if (decision.candidate_id !== state.candidate.candidate_id) return fail("NOT_FOUND", "Predecessor evidence belongs to another candidate.");
    if (input.predecessorsMustBeQuestions === true && decision.question === null) {
      return fail("INVALID_INPUT", "Research evidence owner must be a saved product question.");
    }
  }
  assertNonSensitive(input.scenarioInput);
  if (input.text.length > 8192) return fail("SOURCE_LIMIT", "Product decision evidence exceeds the supported size.");
  const id = operationId(input.scenario, input.candidateRef, state.candidate.source_version, input.scenarioInput);
  const reference: DecisionRef = { product_id: state.candidate.product_id, artifact: state.candidate.artifact, id: deterministicUuid(`decision:${id}`), revision: 1 };
  const decision = nextDecision(state.candidate, {
    ref: reference,
    state: input.state,
    category: input.category,
    question: null,
    text: input.text,
    source: input.source,
    selected_ids: [],
    predecessors: input.predecessors,
    affected_refs: input.affectedRefs,
    reconsider_when: input.reconsiderWhen,
  });
  return executeCandidateMutation(state, input.scenario, input.scenarioInput, () => ({
    candidate: replaceHead(state.candidate, decision),
    decision,
    decisionRef: reference,
    changedRefs: input.affectedRefs,
    next: "Evidence recorded without changing readiness or claiming authenticated consent.",
  }));
}

export async function recordProductInstruction(input: {
  readonly root: string;
  readonly context: string;
  readonly candidateRef: CandidateRef;
  readonly text: string;
  readonly source: string;
  readonly relatedRefs: readonly DecisionRef[];
  readonly affectedRefs: readonly Ref[];
}): Promise<InterviewOutcome<MutationResult>> {
  return recordDecision({
    ...input,
    scenario: "product_record_instruction",
    scenarioInput: { candidate_ref: input.candidateRef, text: input.text, source: input.source, related_refs: input.relatedRefs, affected_refs: input.affectedRefs },
    state: "answered",
    category: "instruction",
    predecessors: input.relatedRefs,
    affectedRefs: input.affectedRefs,
    reconsiderWhen: null,
  });
}

export async function recordProductObservation(input: {
  readonly root: string;
  readonly context: string;
  readonly candidateRef: CandidateRef;
  readonly finding: string;
  readonly source: string;
  readonly affectedRefs: readonly Ref[];
}): Promise<InterviewOutcome<MutationResult>> {
  return recordDecision({
    root: input.root,
    context: input.context,
    candidateRef: input.candidateRef,
    scenario: "product_record_observation",
    scenarioInput: { candidate_ref: input.candidateRef, finding: input.finding, source: input.source, affected_refs: input.affectedRefs },
    state: "observed",
    category: "observation",
    text: input.finding,
    source: input.source,
    predecessors: [],
    affectedRefs: input.affectedRefs,
    reconsiderWhen: null,
  });
}

export async function recordProductAssumption(input: {
  readonly root: string;
  readonly context: string;
  readonly candidateRef: CandidateRef;
  readonly assumption: string;
  readonly reconsiderWhen: string;
  readonly affectedRefs: readonly Ref[];
}): Promise<InterviewOutcome<MutationResult>> {
  return recordDecision({
    root: input.root,
    context: input.context,
    candidateRef: input.candidateRef,
    scenario: "product_record_assumption",
    scenarioInput: { candidate_ref: input.candidateRef, assumption: input.assumption, reconsider_when: input.reconsiderWhen, affected_refs: input.affectedRefs },
    state: "assumed",
    category: "assumption",
    text: input.assumption,
    source: "product_record_assumption",
    predecessors: [],
    affectedRefs: input.affectedRefs,
    reconsiderWhen: input.reconsiderWhen,
  });
}

export async function recordProductResearch(input: {
  readonly root: string;
  readonly context: string;
  readonly candidateRef: CandidateRef;
  readonly evidence: {
    readonly question_ref: DecisionRef;
    readonly conclusion: string;
    readonly sources: readonly unknown[];
    readonly uncertainty: readonly string[];
    readonly limitations: readonly string[];
  };
}): Promise<InterviewOutcome<MutationResult>> {
  const text = JSON.stringify(input.evidence);
  const reconsiderWhen = input.evidence.uncertainty.length > 0 ? input.evidence.uncertainty.join("; ") : null;
  if (reconsiderWhen !== null && reconsiderWhen.length > 4096) {
    return fail("SOURCE_LIMIT", "Research reconsideration evidence exceeds the supported decision size.");
  }
  return recordDecision({
    root: input.root,
    context: input.context,
    candidateRef: input.candidateRef,
    scenario: "product_record_research",
    scenarioInput: { candidate_ref: input.candidateRef, evidence: input.evidence },
    state: "observed",
    category: "research",
    text,
    source: "product_record_research",
    predecessors: [input.evidence.question_ref],
    predecessorsMustBeQuestions: true,
    affectedRefs: [],
    reconsiderWhen,
  });
}
