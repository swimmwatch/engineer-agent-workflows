import { createHash, randomUUID } from "node:crypto";
import { constants, readFileSync } from "node:fs";
import { lstat, mkdir, open, rename, unlink } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { dirname } from "node:path";

import Ajv from "ajv";

import { fail, WorkflowError } from "../state.js";
import { validateProductPath } from "./config.js";
import { listProductDocuments, parseProductDocument } from "./documents.js";
import { inspectExactOperationForResume, replayProductMutationResult, resumeOperation, runProductMutation } from "./operations.js";
import type { ExactOperationResumeEvidence, ProductMutationPlan } from "./operations.js";
import { loadGeneration, readObject, saveObject, verifySourcePin } from "./storage.js";
import type { LoadedGeneration, SourcePin } from "./storage.js";
import { validateProductRecord } from "./schemas.js";
import { assertRoadmapTaskBindingsCompatible } from "./tasks.js";

const MAX_SOURCE_BYTES = 16 * 1024 * 1024;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/u;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const ELEMENT_ID_PATTERN = /^[A-Z][A-Z0-9_-]*-[0-9]{4,}$/u;
const SENSITIVE_PATTERN = /\b(?:authorization\s*:\s*bearer|api[_-]?key\s*[:=]|access[_-]?token\s*[:=]|refresh[_-]?token\s*[:=]|client[_-]?secret\s*[:=]|private[_-]?key\s*[:=]|secret[_-]?access[_-]?key\s*[:=]|password\s*[:=]|secret\s*[:=])|-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----|\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b|\bgh[pousr]_[A-Za-z0-9]{20,}\b|\bxox[baprs]-[A-Za-z0-9-]{10,}\b/iu;
const CREDENTIAL_URI_PATTERN = /\b[a-z][a-z0-9+.-]*:\/\/[^\s/@]+@/iu;

type Artifact = "idea" | "prd" | "technical-design" | "roadmap";
type SemanticType = "Stage" | "Epic" | "Story" | "Task";

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

interface Applicability {
  readonly state: "current" | "accepted_target" | "hypothesis";
  readonly stage_refs: readonly Ref[];
  readonly global: boolean;
  readonly reason: string;
}

interface RoadmapValue extends Record<string, unknown> {
  readonly title: string;
  readonly provenance: readonly DecisionRef[];
  readonly applicability: Applicability;
}

interface TaskValue extends RoadmapValue {
  readonly kind: "feature" | "technical" | "research";
  readonly stage_ref: Ref;
  readonly epic_ref: Ref | null;
  readonly story_ref: Ref | null;
  readonly upstream_refs: readonly Ref[];
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
  readonly applicability: Applicability;
  readonly provenance: readonly DecisionRef[];
  readonly state: "active" | "retired";
}

interface Relation {
  readonly from: Ref;
  readonly kind: "derived_from" | "constrains" | "depends_on" | "belongs_to" | "scheduled_in" | "implements" | "affects";
  readonly to: Ref;
}

interface RegistryRecord {
  readonly schema_version: 1;
  readonly kind: "registry";
  readonly product_id: string;
  readonly documents: readonly DocumentRecord[];
  readonly element_metadata: readonly ElementMetadata[];
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
  readonly registry: { readonly id: string; readonly object_sha256: string };
  readonly upstream_pins: readonly SourcePin[];
  readonly decision_heads: readonly { readonly decision_ref: DecisionRef; readonly object_sha256: string }[];
  readonly relations: readonly Relation[];
  readonly source_version: string;
  readonly change_scope?: { readonly kind: "task_retirement"; readonly task_ref: Ref; readonly redistributed_to: readonly Ref[] };
}

interface DecisionRecord extends Record<string, unknown> {
  readonly schema_version: 1;
  readonly kind: "decision";
  readonly ref: DecisionRef;
  readonly state: "needs_user" | "answered" | "observed" | "assumed" | "superseded" | "no_answer";
  readonly category: string;
  readonly question: null;
  readonly text: string;
  readonly source: string;
  readonly selected_ids: readonly string[];
  readonly predecessors: readonly DecisionRef[];
  readonly affected_refs: readonly Ref[];
  readonly reconsider_when: string | null;
  readonly candidate_id: string;
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

interface CandidateState {
  readonly root: string;
  readonly context: ProductContext;
  readonly candidate: CandidateRecord;
  readonly candidateBytes: Buffer;
  readonly registry: RegistryRecord;
  readonly documents: ReadonlyMap<string, Buffer>;
  readonly generation: LoadedGeneration;
}

interface MutationResult extends Record<string, unknown> {
  readonly operation_ref: string;
  readonly applied: true;
  readonly candidate_ref: CandidateRef;
  readonly changed_refs: readonly Ref[];
  readonly decision_ref: DecisionRef | null;
  readonly question_ref: null;
  readonly product_id: string;
  readonly workspace_id: string;
  readonly task_id: string | null;
  readonly specification_id: null;
  readonly review_ref: null;
  readonly next: string;
  readonly document_id: string | null;
}

export interface RoadmapOutcome<T> {
  readonly context: string;
  readonly result: T;
  readonly replayed: boolean;
  readonly operationRef: string | null;
}

interface ProductSchema {
  readonly $id: string;
  readonly definitions: Record<string, Record<string, unknown>>;
}

const productSchema = JSON.parse(
  readFileSync(new URL("../schemas/product.schema.json", import.meta.url), "utf8"),
) as ProductSchema;
const ajv = new Ajv({ allErrors: true, jsonPointers: true, strictKeywords: true });
if (!ajv.validateSchema(productSchema)) throw new Error("Published product schema is invalid.");
ajv.addSchema(productSchema);

const SEMANTIC_FIELDS: Readonly<Record<SemanticType, readonly string[]>> = {
  Stage: ["outcome", "verification", "scope", "exclusions", "entry", "exit", "risks", "position"],
  Epic: ["outcome", "acceptance"],
  Story: ["intent", "value", "acceptance"],
  Task: ["outcome", "kind", "scope", "non_goals", "acceptance"],
};

const PREFIX: Readonly<Record<SemanticType, string>> = {
  Stage: "STAGE",
  Epic: "EPIC",
  Story: "STORY",
  Task: "TASK",
};

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

function candidateWithoutVersion(candidate: CandidateRecord): Omit<CandidateRecord, "source_version"> {
  return Object.fromEntries(Object.entries(candidate).filter(([key]) => key !== "source_version")) as unknown as Omit<CandidateRecord, "source_version">;
}

function candidateVersion(candidate: Omit<CandidateRecord, "source_version">): string {
  return digest(canonicalBytes(candidate));
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
    return fail("INVALID_STATE", "Roadmap file could not be closed safely.");
  }
}

async function readSafe(root: string, relativePath: string, workspace: string): Promise<Buffer | null> {
  const path = await validateProductPath(root, relativePath, { workspaceRoots: [workspace] });
  let pathStat;
  try {
    pathStat = await lstat(path);
  } catch (error) {
    if (nodeErrorCode(error) === "ENOENT") return null;
    return fail("INVALID_STATE", "Roadmap source cannot be inspected safely.");
  }
  if (pathStat.isSymbolicLink() || !pathStat.isFile() || pathStat.nlink !== 1) {
    return fail("UNSAFE_PATH", "Roadmap source must be a regular single-link file.");
  }
  if (pathStat.size > MAX_SOURCE_BYTES) return fail("SOURCE_LIMIT", "Roadmap source exceeds the 16 MiB limit.");
  let handle: FileHandle | undefined;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = await handle.stat();
    if (before.dev !== pathStat.dev || before.ino !== pathStat.ino || before.size !== pathStat.size) {
      return fail("SOURCE_CHANGED", "Roadmap source changed before it could be read.");
    }
    const value = await handle.readFile();
    const after = await handle.stat();
    const finalPath = await lstat(path);
    if (
      value.byteLength !== before.size || before.dev !== after.dev || before.ino !== after.ino
      || before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs
      || finalPath.isSymbolicLink() || !finalPath.isFile() || finalPath.nlink !== 1
      || finalPath.dev !== after.dev || finalPath.ino !== after.ino
    ) return fail("SOURCE_CHANGED", "Roadmap source changed while it was read.");
    return value;
  } catch (error) {
    if (error instanceof WorkflowError) throw error;
    if (["ENOENT", "ELOOP"].includes(nodeErrorCode(error) ?? "")) {
      return fail("SOURCE_CHANGED", "Roadmap source changed while it was read.");
    }
    return fail("INVALID_STATE", "Roadmap source cannot be read safely.");
  } finally {
    await closeHandle(handle);
  }
}

async function atomicWrite(root: string, relativePath: string, value: Buffer, workspace: string): Promise<void> {
  let path = await validateProductPath(root, relativePath, { workspaceRoots: [workspace] });
  await mkdir(dirname(path), { recursive: true, mode: 0o700 })
    .catch(() => fail("INVALID_STATE", "Roadmap directory cannot be created safely."));
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
    return fail("INVALID_STATE", "Roadmap source cannot be replaced safely.");
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
    || !(candidate !== null && typeof candidate === "object" && !Array.isArray(candidate)
      && typeof candidate.product_id === "string" && UUID_PATTERN.test(candidate.product_id)
      && typeof candidate.candidate_id === "string" && UUID_PATTERN.test(candidate.candidate_id)
      && Object.keys(candidate).every((key) => ["product_id", "candidate_id"].includes(key)))
    || typeof record.selected_sources_sha256 !== "string" || !DIGEST_PATTERN.test(record.selected_sources_sha256)
    || typeof record.target_revision !== "string" || !DIGEST_PATTERN.test(record.target_revision)
    || typeof record.canonical_workspace !== "string" || record.canonical_workspace.length === 0 || record.canonical_workspace.length > 4096
    || Object.keys(record).some((key) => ![
      "contract", "store_id", "product_id", "workspace_id", "candidate_ref",
      "selected_sources_sha256", "target_revision", "canonical_workspace",
    ].includes(key))
  ) return fail("INVALID_INPUT", "Product context is invalid.");
  return value as ProductContext;
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

function candidatePath(productId: string, candidateId: string): string {
  return `products/${productId}/drafts/${candidateId}/candidate.yaml`;
}

function documentPath(productId: string, candidateId: string, relativePath: string): string {
  return `products/${productId}/drafts/${candidateId}/documents/${relativePath}`;
}

function parseJson(value: Uint8Array, label: string): unknown {
  try {
    return JSON.parse(Buffer.from(value).toString("utf8"));
  } catch {
    return fail("INVALID_STATE", `${label} is malformed.`);
  }
}

async function validateRegistry(value: unknown, productId: string): Promise<RegistryRecord> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return fail("INVALID_STATE", "Selected product registry is invalid.");
  const record = value as Record<string, unknown>;
  if (
    record.schema_version !== 1 || record.kind !== "registry" || record.product_id !== productId
    || !Array.isArray(record.documents) || record.documents.length > 1024
    || !Array.isArray(record.element_metadata) || record.element_metadata.length > 10_000
    || Object.keys(record).some((key) => !["schema_version", "kind", "product_id", "documents", "element_metadata"].includes(key))
  ) return fail("INVALID_STATE", "Selected product registry is invalid.");
  const ids = new Set<string>();
  const paths = new Set<string>();
  for (const rawDocument of record.documents as unknown[]) {
    if (rawDocument === null || typeof rawDocument !== "object" || Array.isArray(rawDocument)) {
      return fail("INVALID_STATE", "Selected product registry document is invalid.");
    }
    const document = rawDocument as Record<string, unknown>;
    if (
      typeof document.id !== "string" || !UUID_PATTERN.test(document.id)
      || typeof document.artifact !== "string" || !["idea", "prd", "technical-design", "roadmap"].includes(document.artifact)
      || typeof document.role !== "string" || !["semantic", "navigation"].includes(document.role)
      || typeof document.subject !== "string" || document.subject !== document.subject.normalize("NFC").trim()
      || typeof document.relative_path !== "string" || document.relative_path.length === 0 || document.relative_path.length > 1024
      || typeof document.object_sha256 !== "string" || !DIGEST_PATTERN.test(document.object_sha256)
      || Object.keys(document).some((key) => !["id", "artifact", "role", "subject", "relative_path", "object_sha256"].includes(key))
    ) return fail("INVALID_STATE", "Selected product registry document is invalid.");
    const portablePath = document.relative_path.normalize("NFC").toLocaleLowerCase("en");
    if (ids.has(document.id) || paths.has(portablePath)) {
      return fail("INVALID_STATE", "Selected product registry contains duplicate document identities or paths.");
    }
    ids.add(document.id);
    paths.add(portablePath);
  }
  for (const metadata of record.element_metadata as unknown[]) await validateProductRecord("ElementMetadata", metadata);
  return value as RegistryRecord;
}

async function loadState(root: string, contextText: string, candidateRef: CandidateRef, requireCurrent = true,
  originals: ReadonlyMap<string, Buffer> = new Map()): Promise<CandidateState> {
  const context = decodeContext(contextText);
  if (
    context.product_id !== candidateRef.product_id || context.workspace_id === null
    || context.candidate_ref?.product_id !== candidateRef.product_id
    || context.candidate_ref.candidate_id !== candidateRef.candidate_id
  ) return fail("INVALID_INPUT", "Roadmap authoring requires the selected candidate context.");
  if (requireCurrent) await listProductDocuments({ root, context: contextText, artifact: "roadmap", limit: 1 });
  const relativeCandidate = candidatePath(candidateRef.product_id, candidateRef.candidate_id);
  const candidateBytes = originals.get(relativeCandidate) ?? await readSafe(root, relativeCandidate, context.canonical_workspace);
  if (candidateBytes === null) return fail("NOT_FOUND", "Selected product candidate is unavailable.");
  const candidate = await validateProductRecord("Candidate", parseJson(candidateBytes, "Selected product candidate")) as CandidateRecord;
  if (
    candidate.product_id !== candidateRef.product_id || candidate.candidate_id !== candidateRef.candidate_id
    || candidate.workspace_id !== context.workspace_id || candidate.base_generation !== context.target_revision
    || candidate.artifact !== "roadmap"
  ) return fail("CONFLICT", "Selected product candidate does not match its context or Roadmap artifact.");
  if (requireCurrent && candidate.source_version !== context.selected_sources_sha256) {
    return fail("CONFLICT", "Product candidate changed since this context was issued.");
  }
  const generation = await loadGeneration(
    root,
    candidate.product_id,
    candidate.base_generation ?? fail("PREREQUISITE_REQUIRED", "Roadmap requires a base generation."),
  );
  const registryBytes = await readObject(root, {
    productId: candidate.product_id,
    kind: "record",
    sha256: candidate.registry.object_sha256,
  });
  const registry = await validateRegistry(parseJson(registryBytes, "Selected product registry"), candidate.product_id);
  const documents = new Map<string, Buffer>();
  const owners = new Map<string, Artifact>();
  for (const document of registry.documents) {
    const relative = documentPath(candidate.product_id, candidate.candidate_id, document.relative_path);
    const value = originals.get(relative) ?? await readSafe(root, relative, context.canonical_workspace);
    if (value === null || digest(value) !== document.object_sha256) {
      return fail("SOURCE_CHANGED", "Product draft contains direct or missing document edits.");
    }
    const parsed = parseProductDocument(value);
    if (document.role === "navigation" && parsed.elements.length > 0) {
      return fail("INVALID_MARKDOWN", "Navigation documents cannot own semantic elements.");
    }
    if (document.role === "semantic") {
      for (const element of parsed.elements) {
        if (owners.has(element.id)) return fail("INVALID_MARKDOWN", "Semantic element identity is duplicated across product documents.");
        owners.set(element.id, document.artifact);
      }
    }
    documents.set(document.id, value);
  }
  const active = registry.element_metadata.filter((metadata) => metadata.state === "active");
  if (new Set(active.map((metadata) => `${metadata.ref.artifact}:${metadata.ref.element_id}`)).size !== active.length) {
    return fail("INVALID_STATE", "Product registry contains duplicate active semantic identities.");
  }
  for (const metadata of active) {
    if (metadata.ref.product_id !== candidate.product_id || owners.get(metadata.ref.element_id) !== metadata.ref.artifact) {
      return fail("INVALID_MARKDOWN", "Product document elements do not match registered semantic metadata.");
    }
  }
  for (const [elementId, owner] of owners) {
    if (!active.some((metadata) => metadata.ref.artifact === owner && metadata.ref.element_id === elementId)) {
      const retired = registry.element_metadata.some((metadata) => metadata.state === "retired"
        && metadata.ref.artifact === owner && metadata.ref.element_id === elementId);
      if (!retired) return fail("INVALID_MARKDOWN", "Product document contains an unregistered semantic element.");
    }
  }
  return { root, context, candidate, candidateBytes, registry, documents, generation };
}

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0)!;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}

function assertNonSensitive(value: unknown): void {
  const pending: unknown[] = [value];
  while (pending.length > 0) {
    const current = pending.pop();
    if (typeof current === "string") {
      if (SENSITIVE_PATTERN.test(current) || CREDENTIAL_URI_PATTERN.test(current)) {
        return fail("INVALID_INPUT", "Sensitive values cannot be stored in Roadmap artifacts.");
      }
    } else if (Array.isArray(current)) pending.push(...(current as unknown[]));
    else if (current !== null && typeof current === "object") pending.push(...Object.values(current as Record<string, unknown>));
  }
}

function validateRoadmapValue(type: SemanticType, value: unknown): RoadmapValue {
  const validate = ajv.getSchema(`${productSchema.$id}#/definitions/${type}`);
  if (validate === undefined) return fail("INVALID_STATE", "Published Roadmap schema is unavailable.");
  if (!validate(value)) return fail("INVALID_INPUT", "Roadmap value does not match the published scenario contract.");
  assertNonSensitive(value);
  const semantic = value as RoadmapValue;
  if (semantic.title !== semantic.title.normalize("NFC").trim() || hasControlCharacter(semantic.title)) {
    return fail("INVALID_INPUT", "Roadmap title must be one canonical line.");
  }
  const scoped = semantic.applicability.stage_refs.length > 0;
  if (semantic.applicability.global === scoped) {
    return fail("INVALID_INPUT", "Roadmap applicability must be either global or scoped to named stages.");
  }
  if (semantic.applicability.state === "accepted_target" && !scoped) {
    return fail("INVALID_INPUT", "Accepted Roadmap targets require at least one named stage.");
  }
  return semantic;
}

function assertSubject(subject: string): string {
  const normalized = subject.normalize("NFC").trim();
  if (normalized.length === 0 || normalized !== subject || Array.from(subject).length > 128 || hasControlCharacter(subject)) {
    return fail("INVALID_INPUT", "Roadmap subject must be one bounded line of plain text.");
  }
  return subject;
}

async function validateDecisionReference(state: CandidateState, reference: DecisionRef): Promise<DecisionRecord> {
  if (reference.product_id !== state.candidate.product_id || reference.artifact !== "roadmap") {
    return fail("NOT_FOUND", "Decision reference is outside the selected Roadmap candidate.");
  }
  const head = state.candidate.decision_heads.find((candidateHead) => (
    candidateHead.decision_ref.artifact === reference.artifact && candidateHead.decision_ref.id === reference.id
  ));
  if (head === undefined || head.decision_ref.revision !== reference.revision) {
    return fail("CONFLICT", "Decision reference is not current in the selected candidate.");
  }
  const value = await readObject(state.root, {
    productId: reference.product_id,
    kind: "decision",
    sha256: head.object_sha256,
    artifact: reference.artifact,
    decisionId: reference.id,
    revision: reference.revision,
  });
  if (digest(value) !== head.object_sha256) return fail("SOURCE_CHANGED", "Roadmap decision evidence changed after selection.");
  const parsed = await validateProductRecord("Decision", parseJson(value, "Roadmap decision evidence")) as DecisionRecord;
  if (parsed.ref.product_id !== reference.product_id || parsed.ref.artifact !== reference.artifact
    || parsed.ref.id !== reference.id || parsed.ref.revision !== reference.revision) {
    return fail("SOURCE_CHANGED", "Roadmap decision evidence identity does not match its selected reference.");
  }
  if (parsed.candidate_id !== state.candidate.candidate_id) return fail("SOURCE_CHANGED", "Roadmap decision evidence belongs to another candidate.");
  return parsed;
}

async function requireReadyInputs(state: CandidateState): Promise<void> {
  for (const artifact of ["prd", "technical-design"] as const) {
    if (!state.generation.generation.ready_artifacts.some((ready) => ready.artifact === artifact)) {
      return fail("PREREQUISITE_REQUIRED", `Roadmap authoring requires a ready ${artifact === "prd" ? "PRD" : "Technical Design"} result.`);
    }
    const pins = state.candidate.upstream_pins.filter((pin) => pin.product_id === state.candidate.product_id && pin.artifact === artifact);
    if (pins.length === 0) return fail("PREREQUISITE_REQUIRED", "Roadmap authoring requires exact ready PRD and Technical Design source pins.");
    const lineage = new Set<string>();
    let current: string | null = state.generation.sha256;
    while (current !== null) {
      if (lineage.size >= 10_000 || lineage.has(current)) return fail("SOURCE_LIMIT", "Product generation lineage exceeds the supported bound.");
      lineage.add(current);
      current = (await loadGeneration(state.root, state.candidate.product_id, current)).generation.parent;
    }
    for (const pin of pins) {
      if (!lineage.has(pin.generation) || pin.element_ids.length === 0) {
        return fail("SOURCE_CHANGED", "Ready Roadmap source pin is outside the selected generation lineage or has no addressed elements.");
      }
      await verifySourcePin(state.root, pin);
    }
  }
}

function activeMetadata(state: CandidateState, reference: Ref, expectedType?: string): ElementMetadata {
  if (reference.product_id !== state.candidate.product_id) return fail("BROKEN_REFERENCE", "Roadmap link belongs to another product.");
  const metadata = state.registry.element_metadata.find((entry) => entry.state === "active"
    && entry.ref.artifact === reference.artifact && entry.ref.element_id === reference.element_id);
  if (metadata === undefined || (expectedType !== undefined && metadata.semantic_type !== expectedType)) {
    return fail("BROKEN_REFERENCE", "Roadmap link does not resolve to the required active element.");
  }
  return metadata;
}

function uniqueRefs(references: readonly Ref[], label: string): void {
  const keys = references.map((reference) => `${reference.product_id}:${reference.artifact}:${reference.element_id}`);
  if (new Set(keys).size !== keys.length) return fail("INVALID_INPUT", `${label} contains duplicate references.`);
}

function sameRefs(left: readonly Ref[], right: readonly Ref[]): boolean {
  const keys = (references: readonly Ref[]): string[] => references
    .map((reference) => `${reference.product_id}:${reference.artifact}:${reference.element_id}`)
    .sort();
  return JSON.stringify(keys(left)) === JSON.stringify(keys(right));
}

function requirePinnedUpstream(state: CandidateState, reference: Ref): void {
  if (!state.candidate.upstream_pins.some((pin) => pin.product_id === reference.product_id
    && pin.artifact === reference.artifact && pin.element_ids.includes(reference.element_id))) {
    return fail("SOURCE_CHANGED", "Roadmap upstream link is not covered by the selected ready source pins.");
  }
}

function hasRelation(state: CandidateState, from: Ref, kind: Relation["kind"], to: Ref): boolean {
  return state.candidate.relations.some((relation) => relation.from.product_id === from.product_id
    && relation.from.artifact === from.artifact && relation.from.element_id === from.element_id
    && relation.kind === kind && relation.to.product_id === to.product_id
    && relation.to.artifact === to.artifact && relation.to.element_id === to.element_id);
}

async function validateValueReferences(state: CandidateState, type: SemanticType, value: RoadmapValue): Promise<void> {
  uniqueRefs(value.applicability.stage_refs, "Roadmap applicability");
  for (const reference of value.applicability.stage_refs) activeMetadata(state, reference, "Stage");
  uniqueRefs(value.provenance.map((reference) => ({
    product_id: reference.product_id,
    artifact: reference.artifact,
    element_id: `${reference.id}-${reference.revision}`,
  })), "Roadmap provenance");
  for (const reference of value.provenance) await validateDecisionReference(state, reference);
  if (type === "Stage") {
    if (value.applicability.stage_refs.length > 0) return fail("INVALID_INPUT", "A stage cannot scope itself to another stage.");
    return;
  }
  if (type === "Epic") {
    const goalRefs = value.goal_refs as readonly Ref[];
    const stageRefs = value.stage_refs as readonly Ref[];
    if (goalRefs.length === 0 || stageRefs.length === 0) return fail("INVALID_INPUT", "Roadmap epic requires product goals and at least one stage.");
    uniqueRefs(goalRefs, "Epic goal links");
    uniqueRefs(stageRefs, "Epic stage links");
    if (!sameRefs(value.applicability.stage_refs, stageRefs)) {
      return fail("INVALID_INPUT", "Epic applicability and stage membership must name the same stages.");
    }
    for (const reference of goalRefs) {
      activeMetadata(state, reference);
      requirePinnedUpstream(state, reference);
    }
    for (const reference of stageRefs) activeMetadata(state, reference, "Stage");
    return;
  }
  if (type === "Story") {
    const actorRef = value.actor_ref as Ref;
    const epicRef = value.epic_ref as Ref;
    activeMetadata(state, actorRef, "PrdActor");
    requirePinnedUpstream(state, actorRef);
    activeMetadata(state, epicRef, "Epic");
    const stageRefs = value.stage_refs as readonly Ref[];
    if (stageRefs.length === 0) return fail("INVALID_INPUT", "Roadmap story requires at least one stage.");
    uniqueRefs(stageRefs, "Story stage links");
    if (!sameRefs(value.applicability.stage_refs, stageRefs)) {
      return fail("INVALID_INPUT", "Story applicability and stage membership must name the same stages.");
    }
    for (const reference of stageRefs) {
      activeMetadata(state, reference, "Stage");
      if (!hasRelation(state, epicRef, "scheduled_in", reference)) {
        return fail("INVALID_INPUT", "Story stage membership must stay within its epic stages.");
      }
    }
    return;
  }
  const task = value as TaskValue;
  activeMetadata(state, task.stage_ref, "Stage");
  if (!sameRefs(task.applicability.stage_refs, [task.stage_ref])) {
    return fail("INVALID_INPUT", "Task applicability must name its assigned stage exactly once.");
  }
  if (task.epic_ref !== null) {
    activeMetadata(state, task.epic_ref, "Epic");
    if (!hasRelation(state, task.epic_ref, "scheduled_in", task.stage_ref)) {
      return fail("INVALID_INPUT", "Task stage must belong to its epic.");
    }
  }
  if (task.story_ref !== null) {
    activeMetadata(state, task.story_ref, "Story");
    if (!hasRelation(state, task.story_ref, "scheduled_in", task.stage_ref)) {
      return fail("INVALID_INPUT", "Task stage must belong to its story.");
    }
    if (task.epic_ref !== null && !hasRelation(state, task.story_ref, "belongs_to", task.epic_ref)) {
      return fail("INVALID_INPUT", "Task story must belong to the named epic.");
    }
  }
  if (task.story_ref !== null && task.epic_ref === null) {
    return fail("INVALID_INPUT", "A task linked to a story must also name its epic.");
  }
  if (task.upstream_refs.length === 0) return fail("INVALID_INPUT", "Roadmap task requires at least one justified product or technical outcome.");
  uniqueRefs(task.upstream_refs, "Task upstream links");
  for (const reference of task.upstream_refs) {
    const metadata = activeMetadata(state, reference);
    if (!["prd", "technical-design"].includes(metadata.ref.artifact)) {
      return fail("INVALID_INPUT", "Task upstream links must target PRD or Technical Design elements.");
    }
    requirePinnedUpstream(state, reference);
  }
}

function validateUpdatedParentConsistency(
  state: CandidateState,
  type: SemanticType,
  parentRef: Ref,
  value: RoadmapValue,
): void {
  if (type !== "Epic" && type !== "Story") return;
  const allowedStageIds = new Set((value.stage_refs as readonly Ref[]).map((reference) => reference.element_id));
  const activeChildren = new Set(state.registry.element_metadata
    .filter((metadata) => metadata.state === "active"
      && (metadata.semantic_type === "Story" || metadata.semantic_type === "Task"))
    .map((metadata) => metadata.ref.element_id));
  const ownedChildren = new Set(state.candidate.relations
    .filter((relation) => relation.kind === "belongs_to"
      && relation.to.product_id === parentRef.product_id
      && relation.to.artifact === parentRef.artifact
      && relation.to.element_id === parentRef.element_id
      && activeChildren.has(relation.from.element_id))
    .map((relation) => relation.from.element_id));
  for (const childId of ownedChildren) {
    const childStages = state.candidate.relations.filter((relation) => relation.kind === "scheduled_in"
      && relation.from.artifact === "roadmap" && relation.from.element_id === childId);
    if (childStages.some((relation) => !allowedStageIds.has(relation.to.element_id))) {
      return fail("CONFLICT", `${type} update would leave an existing child outside its stage membership.`);
    }
    if (type === "Story") {
      const expectedEpic = value.epic_ref as Ref;
      const childEpics = state.candidate.relations.filter((relation) => relation.kind === "belongs_to"
        && relation.from.artifact === "roadmap" && relation.from.element_id === childId
        && relation.to.artifact === "roadmap" && relation.to.element_id.startsWith("EPIC-"));
      if (childEpics.some((relation) => relation.to.product_id !== expectedEpic.product_id
        || relation.to.element_id !== expectedEpic.element_id)) {
        return fail("CONFLICT", "Story update would leave an existing task assigned to another epic.");
      }
    }
  }
}

function nextElementId(registry: RegistryRecord, type: SemanticType, reserved: ReadonlySet<string> = new Set()): string {
  const prefix = PREFIX[type];
  let maximum = 0;
  for (const metadata of registry.element_metadata) {
    const match = new RegExp(`^${prefix}-(\\d+)$`, "u").exec(metadata.ref.element_id);
    if (match?.[1] !== undefined) maximum = Math.max(maximum, Number(match[1]));
  }
  for (const id of reserved) {
    const match = new RegExp(`^${prefix}-(\\d+)$`, "u").exec(id);
    if (match?.[1] !== undefined) maximum = Math.max(maximum, Number(match[1]));
  }
  const next = maximum + 1;
  if (!Number.isSafeInteger(next)) return fail("SOURCE_LIMIT", "Roadmap identity range is exhausted.");
  return `${prefix}-${String(next).padStart(4, "0")}`;
}

function safeMarkdown(value: string, newline: "\n" | "\r\n"): string {
  const normalized = value.normalize("NFC").replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  return normalized.split("\n").map((line) => /^( {0,3})#/u.test(line) ? line.replace(/^( {0,3})#/u, "$1\\#") : line).join(newline);
}

function heading(field: string): string {
  return field.split("_").map((part) => `${part[0]!.toUpperCase()}${part.slice(1)}`).join(" ");
}

function renderField(value: unknown, newline: "\n" | "\r\n"): string {
  if (value === null) return "None.";
  if (typeof value === "string" || typeof value === "number") return safeMarkdown(String(value), newline);
  if (Array.isArray(value)) {
    if (value.length === 0) return "None.";
    if (!value.every((item) => typeof item === "string")) return fail("INVALID_STATE", "Structured Roadmap links must remain in registry metadata.");
    return value.map((item) => `- ${safeMarkdown(item, newline)}`).join(newline);
  }
  return fail("INVALID_STATE", "Roadmap field cannot be rendered safely.");
}

function renderElement(type: SemanticType, id: string, value: RoadmapValue, newline: "\n" | "\r\n"): string {
  const lines = [`### ${id}: ${safeMarkdown(value.title, newline)}`];
  for (const field of SEMANTIC_FIELDS[type]) lines.push("", `#### ${heading(field)}`, "", renderField(value[field], newline));
  return lines.join(newline);
}

function replaceOrAppendElement(document: Buffer, id: string, type: SemanticType, value: RoadmapValue, updating: boolean): Buffer {
  const parsed = parseProductDocument(document);
  const rendered = renderElement(type, id, value, parsed.newline);
  if (!updating) {
    const separator = parsed.source.length === 0 ? "" : parsed.source.endsWith(parsed.newline) ? parsed.newline : `${parsed.newline}${parsed.newline}`;
    return Buffer.from(`${parsed.source}${separator}${rendered}${parsed.newline}`, "utf8");
  }
  const element = parsed.elements.find((candidate) => candidate.id === id);
  if (element === undefined) return fail("BROKEN_REFERENCE", "Roadmap element is missing from its registered document.");
  const marker = `### ${id}:`;
  const headingStart = parsed.source.indexOf(marker, element.start);
  if (headingStart < element.start || headingStart >= element.end) return fail("INVALID_MARKDOWN", "Roadmap element heading cannot be resolved safely.");
  const prefix = parsed.source.slice(element.start, headingStart);
  const trailing = element.end < parsed.source.length ? `${parsed.newline}${parsed.newline}` : parsed.newline;
  return Buffer.from(`${parsed.source.slice(0, element.start)}${prefix}${rendered}${trailing}${parsed.source.slice(element.end)}`, "utf8");
}

function removeElement(document: Buffer, id: string): Buffer {
  const parsed = parseProductDocument(document);
  const element = parsed.elements.find((candidate) => candidate.id === id);
  if (element === undefined) return fail("BROKEN_REFERENCE", "Roadmap element is missing from its registered document.");
  let before = parsed.source.slice(0, element.start);
  let after = parsed.source.slice(element.end);
  if (before.endsWith(`${parsed.newline}${parsed.newline}`)) before = before.slice(0, -parsed.newline.length);
  if (after.startsWith(`${parsed.newline}${parsed.newline}`)) after = after.slice(parsed.newline.length);
  return Buffer.from(`${before}${after}`, "utf8");
}

function relationsFor(type: SemanticType, from: Ref, value: RoadmapValue): readonly Relation[] {
  const relations: Relation[] = [];
  if (type === "Epic") {
    relations.push(...(value.goal_refs as readonly Ref[]).map((to) => ({ from, kind: "derived_from" as const, to })));
    relations.push(...(value.stage_refs as readonly Ref[]).map((to) => ({ from, kind: "scheduled_in" as const, to })));
  } else if (type === "Story") {
    relations.push({ from, kind: "derived_from", to: value.actor_ref as Ref });
    relations.push({ from, kind: "belongs_to", to: value.epic_ref as Ref });
    relations.push(...(value.stage_refs as readonly Ref[]).map((to) => ({ from, kind: "scheduled_in" as const, to })));
  } else if (type === "Task") {
    const task = value as TaskValue;
    relations.push({ from, kind: "scheduled_in", to: task.stage_ref });
    if (task.epic_ref !== null) relations.push({ from, kind: "belongs_to", to: task.epic_ref });
    if (task.story_ref !== null) relations.push({ from, kind: "belongs_to", to: task.story_ref });
    relations.push(...task.upstream_refs.map((to) => ({ from, kind: "derived_from" as const, to })));
  }
  return [...new Map(relations.map((relation) => [`${relation.kind}:${relation.to.artifact}:${relation.to.element_id}`, relation])).values()];
}

function relationOwnedBy(relation: Relation, ref: Ref): boolean {
  return relation.from.product_id === ref.product_id && relation.from.artifact === ref.artifact
    && relation.from.element_id === ref.element_id && relation.kind !== "depends_on";
}

function mutationResult(
  operationId: string,
  candidate: CandidateRecord,
  refs: readonly Ref[],
  documentId: string | null,
  decisionRef: DecisionRef | null = null,
  next = "Continue Roadmap authoring or create one task specification through its separate explicit workflow when the task is selected.",
): MutationResult {
  const task = refs.find((ref) => ref.artifact === "roadmap" && ref.element_id.startsWith("TASK-"));
  return {
    operation_ref: operationId,
    applied: true,
    candidate_ref: { product_id: candidate.product_id, candidate_id: candidate.candidate_id },
    changed_refs: refs,
    decision_ref: decisionRef,
    question_ref: null,
    product_id: candidate.product_id,
    workspace_id: candidate.workspace_id,
    task_id: task?.element_id ?? null,
    specification_id: null,
    review_ref: null,
    next,
    document_id: documentId,
  };
}

function canonicalOperationValue(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalOperationValue).join(",")}]`;
  if (typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalOperationValue((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return fail("INVALID_INPUT", "Roadmap mutation input is not canonical JSON data.");
}

function operationId(scenario: string, candidate: CandidateRef, sourceVersion: string, input: unknown): string {
  return deterministicUuid(`${scenario}:${candidate.product_id}:${candidate.candidate_id}:${sourceVersion}:${canonicalOperationValue(input)}`);
}

async function applyChange(root: string, relativePath: string, before: Buffer, after: Buffer, workspace: string): Promise<void> {
  const current = await readSafe(root, relativePath, workspace);
  if (current?.equals(after)) return;
  if (!current?.equals(before)) return fail("CONFLICT", "Roadmap target changed during mutation recovery.");
  await atomicWrite(root, relativePath, after, workspace);
}

async function replayMutation(
  root: string,
  contextText: string,
  candidateRef: CandidateRef,
  scenario: string,
  scenarioInput: Record<string, unknown>,
  resumeOperationRef?: string,
): Promise<RoadmapOutcome<MutationResult> | null> {
  const context = decodeContext(contextText);
  if (context.product_id !== candidateRef.product_id || context.candidate_ref?.candidate_id !== candidateRef.candidate_id) {
    return fail("INVALID_INPUT", "Roadmap authoring requires the selected candidate context.");
  }
  const id = operationId(scenario, candidateRef, context.selected_sources_sha256, scenarioInput);
  if (resumeOperationRef !== undefined && resumeOperationRef !== id) return fail("CONFLICT", "Recovery requires the exact original operation reference.");
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
    if (resumeOperationRef !== undefined && error instanceof WorkflowError && error.code === "RECOVERY_REQUIRED") return null;
    throw error;
  }
  const state = await loadState(root, contextText, candidateRef, false);
  return {
    context: encodeContext(context, state.candidate),
    result: replay.result as MutationResult,
    replayed: true,
    operationRef: replay.operationRef,
  };
}

interface ExecuteInput {
  readonly state: CandidateState;
  readonly scenario: string;
  readonly scenarioInput: Record<string, unknown>;
  readonly registry: RegistryRecord;
  readonly documents: ReadonlyMap<string, Buffer>;
  readonly candidate: CandidateRecord;
  readonly refs: readonly Ref[];
  readonly documentId: string | null;
  readonly decision?: DecisionRecord;
  readonly next?: string;
  readonly guard?: () => Promise<void>;
  readonly recovery?: ExactOperationResumeEvidence;
  readonly afterChange?: (relativePath: string) => Promise<void>;
}

async function executeMutation(input: ExecuteInput): Promise<RoadmapOutcome<MutationResult>> {
  const documents = input.registry.documents.map((document) => {
    const value = input.documents.get(document.id) ?? fail("INVALID_STATE", "Next product registry has no matching document bytes.");
    parseProductDocument(value);
    return { ...document, object_sha256: digest(value) };
  });
  const registry: RegistryRecord = { ...input.registry, documents };
  await validateRegistry(registry, input.state.candidate.product_id);
  const registryBytes = canonicalBytes(registry);
  const registrySha256 = digest(registryBytes);
  let decisionObject: { readonly bytes: Buffer; readonly sha256: string } | undefined;
  let decisionHeads = input.candidate.decision_heads;
  if (input.decision !== undefined) {
    await validateProductRecord("Decision", input.decision);
    const decisionBytes = canonicalBytes(input.decision);
    decisionObject = { bytes: decisionBytes, sha256: digest(decisionBytes) };
    decisionHeads = [
      ...input.candidate.decision_heads.filter((head) => head.decision_ref.id !== input.decision!.ref.id),
      { decision_ref: input.decision.ref, object_sha256: decisionObject.sha256 },
    ];
  }
  const withoutVersion: Omit<CandidateRecord, "source_version"> = {
    ...candidateWithoutVersion(input.candidate),
    registry: { id: input.candidate.registry.id, object_sha256: registrySha256 },
    decision_heads: decisionHeads,
  };
  const candidate: CandidateRecord = { ...withoutVersion, source_version: candidateVersion(withoutVersion) };
  await validateProductRecord("Candidate", candidate);
  const candidateBytes = canonicalBytes(candidate);
  const changes: { relativePath: string; before: Buffer; after: Buffer }[] = [];
  for (const document of registry.documents) {
    const before = input.state.documents.get(document.id)!;
    const after = input.documents.get(document.id)!;
    if (!before.equals(after)) changes.push({
      relativePath: documentPath(candidate.product_id, candidate.candidate_id, document.relative_path),
      before,
      after,
    });
  }
  changes.push({
    relativePath: candidatePath(candidate.product_id, candidate.candidate_id),
    before: input.state.candidateBytes,
    after: candidateBytes,
  });
  const id = operationId(
    input.scenario,
    { product_id: candidate.product_id, candidate_id: candidate.candidate_id },
    input.state.candidate.source_version,
    input.scenarioInput,
  );
  const result = mutationResult(id, candidate, input.refs, input.documentId, input.decision?.ref ?? null, input.next);
  const plan: ProductMutationPlan = {
    root: input.state.root,
    productId: candidate.product_id,
    operationId: id,
    sessionId: randomUUID(),
    scenario: input.scenario,
    expectedRevision: input.state.context.target_revision,
    nextRevision: input.state.context.target_revision ?? fail("PREREQUISITE_REQUIRED", "Roadmap requires a base generation."),
    intent: { schema_version: 1, kind: "operation_intent", scenario: input.scenario, input: input.scenarioInput },
    result,
    targets: changes.map((change) => ({
      root: "store" as const,
      binding_id: null,
      relative_path: change.relativePath,
      before: digest(change.before),
      after: digest(change.after),
    })),
    saveObjects: async () => {
      await input.guard?.();
      for (const change of changes) {
        const current = await readSafe(input.state.root, change.relativePath, input.state.context.canonical_workspace);
        if (!current?.equals(change.before) && !current?.equals(change.after)) {
          return fail("CONFLICT", "Roadmap target changed before the transaction could write its documents.");
        }
      }
      if (["roadmap_retire_task", "roadmap_unlink_dependency"].includes(input.scenario)) {
        await saveObject(input.state.root, { productId: candidate.product_id, kind: "record", bytes: input.state.candidateBytes });
        await saveObject(input.state.root, { productId: candidate.product_id, kind: "record", bytes: candidateBytes });
      }
      for (const document of registry.documents) {
        const value = input.documents.get(document.id)!;
        const saved = await saveObject(input.state.root, { productId: candidate.product_id, kind: "markdown", bytes: value });
        if (saved.sha256 !== document.object_sha256) return fail("INVALID_STATE", "Stored Roadmap document does not match its validated digest.");
      }
      const savedRegistry = await saveObject(input.state.root, { productId: candidate.product_id, kind: "record", bytes: registryBytes });
      if (savedRegistry.sha256 !== registrySha256) return fail("INVALID_STATE", "Stored Roadmap registry does not match its validated digest.");
      if (input.decision !== undefined && decisionObject !== undefined) {
        const saved = await saveObject(input.state.root, {
          productId: candidate.product_id,
          kind: "decision",
          artifact: "roadmap",
          decisionId: input.decision.ref.id,
          revision: input.decision.ref.revision,
          bytes: decisionObject.bytes,
        });
        if (saved.sha256 !== decisionObject.sha256) return fail("INVALID_STATE", "Stored Roadmap outcome evidence does not match its validated digest.");
      }
      for (const change of changes) {
        await applyChange(input.state.root, change.relativePath, change.before, change.after, input.state.context.canonical_workspace);
        await input.afterChange?.(change.relativePath);
      }
    },
    verifyTargets: async () => {
      await input.guard?.();
      for (const change of changes) {
        const current = await readSafe(input.state.root, change.relativePath, input.state.context.canonical_workspace);
        if (!current?.equals(change.after)) return fail("CONFLICT", "Roadmap targets changed during recovery.");
      }
    },
  };
  let outcome;
  try {
    outcome = input.recovery === undefined ? await runProductMutation(plan) : await resumeOperation(plan, input.recovery.inspectionToken);
  } catch (error) {
    if (error instanceof WorkflowError) throw new WorkflowError(error.code, error.message, { ...error.details, operation_ref: id });
    throw error;
  }
  return {
    context: encodeContext(input.state.context, candidate),
    result: outcome.result as MutationResult,
    replayed: outcome.replayed,
    operationRef: outcome.operationRef,
  };
}

export async function defineRoadmapElement(input: {
  readonly root: string;
  readonly context: string;
  readonly candidateRef: CandidateRef;
  readonly subject: string;
  readonly semanticType: SemanticType;
  readonly elementRef?: Ref;
  readonly value: unknown;
}): Promise<RoadmapOutcome<MutationResult>> {
  const value = validateRoadmapValue(input.semanticType, input.value);
  const subject = assertSubject(input.subject);
  const scenario = `roadmap_define_${input.semanticType.toLocaleLowerCase("en")}`;
  const scenarioInput = {
    candidate_ref: input.candidateRef,
    subject,
    ...(input.elementRef === undefined ? {} : { element_ref: input.elementRef }),
    value,
  };
  const replay = await replayMutation(input.root, input.context, input.candidateRef, scenario, scenarioInput);
  if (replay !== null) return replay;
  const state = await loadState(input.root, input.context, input.candidateRef);
  await requireReadyInputs(state);
  await validateValueReferences(state, input.semanticType, value);
  const matchingDocuments = state.registry.documents.filter((document) =>
    document.artifact === "roadmap" && document.role === "semantic" && document.subject === subject);
  if (matchingDocuments.length !== 1) return fail(matchingDocuments.length === 0 ? "NOT_FOUND" : "AMBIGUOUS_BINDING", "Roadmap subject does not resolve to one semantic document.");
  const target = matchingDocuments[0]!;
  const metadata = [...state.registry.element_metadata];
  let ref: Ref;
  let updating = false;
  if (input.elementRef === undefined) {
    ref = { product_id: state.candidate.product_id, artifact: "roadmap", element_id: nextElementId(state.registry, input.semanticType) };
  } else {
    if (input.elementRef.product_id !== state.candidate.product_id || input.elementRef.artifact !== "roadmap" || !ELEMENT_ID_PATTERN.test(input.elementRef.element_id)) {
      return fail("NOT_FOUND", "Roadmap element reference is outside the selected candidate.");
    }
    const current = metadata.find((entry) => entry.state === "active" && entry.ref.artifact === "roadmap"
      && entry.ref.element_id === input.elementRef!.element_id);
    if (current === undefined) return fail("NOT_FOUND", "Roadmap element is not active.");
    if (current.semantic_type !== input.semanticType) return fail("INVALID_INPUT", "Roadmap element type cannot be changed in place.");
    const owner = state.registry.documents.find((document) => document.role === "semantic"
      && parseProductDocument(state.documents.get(document.id)!).elements.some((element) => element.id === current.ref.element_id));
    if (owner?.id !== target.id) return fail("INVALID_INPUT", "Roadmap update must name its current subject.");
    ref = current.ref;
    updating = true;
  }
  if (updating) validateUpdatedParentConsistency(state, input.semanticType, ref, value);
  const targetBytes = state.documents.get(target.id)!;
  const nextTarget = replaceOrAppendElement(targetBytes, ref.element_id, input.semanticType, value, updating);
  parseProductDocument(nextTarget);
  const existingIndex = metadata.findIndex((entry) => entry.state === "active" && entry.ref.artifact === ref.artifact && entry.ref.element_id === ref.element_id);
  const nextMetadata: ElementMetadata = { ref, semantic_type: input.semanticType, applicability: value.applicability, provenance: value.provenance, state: "active" };
  if (existingIndex === -1) metadata.push(nextMetadata);
  else metadata[existingIndex] = nextMetadata;
  const relations = state.candidate.relations.filter((relation) => !relationOwnedBy(relation, ref));
  relations.push(...relationsFor(input.semanticType, ref, value));
  const nextDocuments = new Map(state.documents);
  nextDocuments.set(target.id, nextTarget);
  return executeMutation({
    state,
    scenario,
    scenarioInput,
    registry: { ...state.registry, element_metadata: metadata },
    documents: nextDocuments,
    candidate: { ...state.candidate, relations },
    refs: [ref],
    documentId: target.id,
  });
}

function assertTaskReference(state: CandidateState, reference: Ref): void {
  if (reference.artifact !== "roadmap") return fail("BROKEN_REFERENCE", "Task reference must target the selected Roadmap.");
  activeMetadata(state, reference, "Task");
}

function taskDependencyCycle(relations: readonly Relation[], from: Ref, to: Ref): boolean {
  const pending = [to.element_id];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (current === from.element_id) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const relation of relations) {
      if (relation.kind === "depends_on" && relation.from.artifact === "roadmap"
        && relation.from.element_id === current && relation.to.artifact === "roadmap") pending.push(relation.to.element_id);
    }
  }
  return false;
}

export async function linkRoadmapDependency(input: {
  readonly root: string;
  readonly context: string;
  readonly candidateRef: CandidateRef;
  readonly taskRef: Ref;
  readonly requiresTaskRef: Ref;
}): Promise<RoadmapOutcome<MutationResult>> {
  const scenario = "roadmap_link_dependency";
  const scenarioInput = { candidate_ref: input.candidateRef, task_ref: input.taskRef, requires_task_ref: input.requiresTaskRef };
  const replay = await replayMutation(input.root, input.context, input.candidateRef, scenario, scenarioInput);
  if (replay !== null) return replay;
  const state = await loadState(input.root, input.context, input.candidateRef);
  await requireReadyInputs(state);
  assertTaskReference(state, input.taskRef);
  assertTaskReference(state, input.requiresTaskRef);
  if (input.taskRef.element_id === input.requiresTaskRef.element_id) return fail("INVALID_INPUT", "A task cannot depend on itself.");
  if (state.candidate.relations.some((relation) => relation.kind === "depends_on"
    && relation.from.element_id === input.taskRef.element_id && relation.to.element_id === input.requiresTaskRef.element_id)) {
    return fail("INVALID_INPUT", "Task dependency already exists.");
  }
  if (taskDependencyCycle(state.candidate.relations, input.taskRef, input.requiresTaskRef)) {
    return fail("INVALID_INPUT", "Task dependency would create a cycle.");
  }
  const relations = [...state.candidate.relations, { from: input.taskRef, kind: "depends_on" as const, to: input.requiresTaskRef }];
  return executeMutation({
    state,
    scenario,
    scenarioInput,
    registry: state.registry,
    documents: state.documents,
    candidate: { ...state.candidate, relations },
    refs: [input.taskRef, input.requiresTaskRef],
    documentId: null,
  });
}

function sameRef(left: Ref, right: Ref): boolean {
  return left.product_id === right.product_id && left.artifact === right.artifact && left.element_id === right.element_id;
}

async function taskChangeDecision(state: CandidateState, scenario: string, scenarioInput: Record<string, unknown>,
  answerRef: DecisionRef, reason: string, refs: readonly Ref[], recipients: readonly Ref[] = []): Promise<DecisionRecord> {
  if (["activated", "abandoned"].includes(state.candidate.state)) return fail("CONFLICT", "Closed Roadmap candidates cannot be changed.");
  if (reason.trim().length === 0 || Array.from(reason).length > 4096 || hasControlCharacter(reason)) {
    return fail("INVALID_INPUT", "Task change reason must be bounded nonblank plain text.");
  }
  assertNonSensitive(reason);
  const answer = await validateDecisionReference(state, answerRef);
  if (answer.state !== "answered" || refs.some((ref) => !answer.affected_refs.some((affected) => sameRef(ref, affected)))) {
    return fail("ANSWER_REQUIRED", "Task change requires a current explicit answer covering every affected task.");
  }
  const id = operationId(scenario, { product_id: state.candidate.product_id, candidate_id: state.candidate.candidate_id },
    state.candidate.source_version, scenarioInput);
  return {
    schema_version: 1, kind: "decision",
    ref: { product_id: state.candidate.product_id, artifact: "roadmap", id: deterministicUuid(`${id}:decision`), revision: 1 },
    state: "observed", category: scenario, question: null, text: reason,
    source: `Workflow operation ${id}; user answer ${answerRef.id} revision ${answerRef.revision}.`,
    selected_ids: recipients.map((ref) => ref.element_id), predecessors: [answerRef], affected_refs: refs,
    reconsider_when: null, candidate_id: state.candidate.candidate_id,
  };
}

function withTaskChangeProvenance(metadata: ElementMetadata, answerRef: DecisionRef, decision: DecisionRecord): ElementMetadata {
  return { ...metadata, provenance: [...new Map([...metadata.provenance, answerRef, decision.ref]
    .map((ref) => [`${ref.product_id}:${ref.artifact}:${ref.id}:${ref.revision}`, ref])).values()] };
}

async function loadTaskChangeState(input: { root: string; context: string; candidateRef: CandidateRef; resumeOperationRef?: string },
  scenario: string, scenarioInput: Record<string, unknown>): Promise<{ state: CandidateState; recovery?: ExactOperationResumeEvidence }> {
  if (input.resumeOperationRef === undefined) return { state: await loadState(input.root, input.context, input.candidateRef) };
  const context = decodeContext(input.context);
  const id = operationId(scenario, input.candidateRef, context.selected_sources_sha256, scenarioInput);
  if (id !== input.resumeOperationRef) return fail("CONFLICT", "Recovery requires the exact original task change request and context.");
  const recovery = await inspectExactOperationForResume({ root: input.root, productId: input.candidateRef.product_id, operationId: id,
    scenario, intent: { schema_version: 1, kind: "operation_intent", scenario, input: scenarioInput } });
  const originals = new Map<string, Buffer>();
  for (const target of recovery.targets ?? []) {
    if (target.root !== "store" || target.before === null) return fail("RECOVERY_REQUIRED", "Task change recovery target is unsupported.");
    const current = await readSafe(input.root, target.relative_path, context.canonical_workspace);
    if (current === null || ![target.before, target.after].includes(digest(current))) {
      return fail("CONFLICT", "Task change target changed after interruption.");
    }
    originals.set(target.relative_path, digest(current) === target.before ? current : Buffer.from(await readObject(input.root, {
      productId: input.candidateRef.product_id, kind: target.relative_path.endsWith("candidate.yaml") ? "record" : "markdown", sha256: target.before,
    })));
  }
  const state = await loadState(input.root, input.context, input.candidateRef, false, originals);
  if (state.candidate.source_version !== context.selected_sources_sha256) return fail("CONFLICT", "Recovery snapshot does not match the original context.");
  return { state, recovery };
}

async function guardTaskChange(state: CandidateState, taskId: string): Promise<void> {
  await assertRoadmapTaskBindingsCompatible(state.root, state.candidate.product_id, [taskId]);
  const bytes = await readSafe(state.root, `products/${state.candidate.product_id}/head.yaml`, state.context.canonical_workspace);
  if (bytes === null) return fail("CONFLICT", "Product head is unavailable during task change.");
  const head = await validateProductRecord("Head", parseJson(bytes, "Product head")) as { generation: string };
  if (head.generation !== state.candidate.base_generation) return fail("CONFLICT", "Product head changed during task change.");
}

export async function unlinkRoadmapDependency(input: {
  readonly root: string;
  readonly context: string;
  readonly candidateRef: CandidateRef;
  readonly taskRef: Ref;
  readonly requiresTaskRef: Ref;
  readonly answerRef: DecisionRef;
  readonly reason: string;
  readonly resumeOperationRef?: string;
}, hooks: { afterChange?: (relativePath: string) => Promise<void> } = {}): Promise<RoadmapOutcome<MutationResult>> {
  const scenario = "roadmap_unlink_dependency";
  const scenarioInput = { candidate_ref: input.candidateRef, task_ref: input.taskRef,
    requires_task_ref: input.requiresTaskRef, answer_ref: input.answerRef, reason: input.reason };
  const replay = await replayMutation(input.root, input.context, input.candidateRef, scenario, scenarioInput, input.resumeOperationRef);
  if (replay !== null) return replay;
  const { state, recovery } = await loadTaskChangeState(input, scenario, scenarioInput);
  await requireReadyInputs(state);
  assertTaskReference(state, input.taskRef);
  assertTaskReference(state, input.requiresTaskRef);
  const edge = (relation: Relation): boolean => relation.kind === "depends_on"
    && sameRef(relation.from, input.taskRef) && sameRef(relation.to, input.requiresTaskRef);
  if (!state.candidate.relations.some(edge)) return fail("NOT_FOUND", "The selected task dependency does not exist.");
  const refs = [input.taskRef, input.requiresTaskRef];
  const decision = await taskChangeDecision(state, scenario, scenarioInput, input.answerRef, input.reason, refs);
  const guard = (): Promise<void> => guardTaskChange(state, input.taskRef.element_id);
  await guard();
  return executeMutation({ state, scenario, scenarioInput,
    registry: { ...state.registry, element_metadata: state.registry.element_metadata.map((entry) =>
      sameRef(entry.ref, input.taskRef) ? withTaskChangeProvenance(entry, input.answerRef, decision) : entry) },
    documents: state.documents,
    candidate: { ...state.candidate, relations: state.candidate.relations.filter((relation) => !edge(relation)) },
    refs, documentId: null, decision, guard, ...(recovery === undefined ? {} : { recovery }), ...hooks,
    next: "Dependency removed. Link any required existing prerequisite explicitly; retire the obsolete task only after all consumers are resolved.",
  });
}

export async function retireRoadmapTask(input: {
  readonly root: string;
  readonly context: string;
  readonly candidateRef: CandidateRef;
  readonly taskRef: Ref;
  readonly redistributedTo: readonly Ref[];
  readonly answerRef: DecisionRef;
  readonly reason: string;
  readonly resumeOperationRef?: string;
}, hooks: { afterChange?: (relativePath: string) => Promise<void> } = {}): Promise<RoadmapOutcome<MutationResult>> {
  const scenario = "roadmap_retire_task";
  const scenarioInput = { candidate_ref: input.candidateRef, task_ref: input.taskRef,
    redistributed_to: input.redistributedTo, answer_ref: input.answerRef, reason: input.reason };
  const replay = await replayMutation(input.root, input.context, input.candidateRef, scenario, scenarioInput, input.resumeOperationRef);
  if (replay !== null) return replay;
  const { state, recovery } = await loadTaskChangeState(input, scenario, scenarioInput);
  await requireReadyInputs(state);
  const declared = state.candidate.change_scope;
  if (declared !== undefined && (!sameRef(declared.task_ref, input.taskRef)
    || JSON.stringify(declared.redistributed_to.map((ref) => ref.element_id).sort()) !== JSON.stringify(input.redistributedTo.map((ref) => ref.element_id).sort()))) {
    return fail("INVALID_INPUT", "Retirement must preserve the declared task and responsibility recipients; prepare a separately authorized amendment for changed intent.");
  }
  assertTaskReference(state, input.taskRef);
  uniqueRefs(input.redistributedTo, "Task redistribution recipients");
  for (const ref of input.redistributedTo) {
    assertTaskReference(state, ref);
    if (sameRef(ref, input.taskRef)) return fail("INVALID_INPUT", "A retired task cannot receive its own responsibilities.");
  }
  const active = state.registry.element_metadata.filter((entry) => entry.state === "active");
  const consumers = state.candidate.relations.filter((relation) => sameRef(relation.to, input.taskRef)
    && active.some((entry) => sameRef(entry.ref, relation.from)));
  if (consumers.length > 0) return fail("CONFLICT", "Task has unresolved active consumers; remove or reassign their relations explicitly.", {
    dependent_task_ids: [...new Set(consumers.map((relation) => relation.from.element_id))],
  });
  const refs = [input.taskRef, ...input.redistributedTo];
  const decision = await taskChangeDecision(state, scenario, scenarioInput, input.answerRef, input.reason, refs, input.redistributedTo);
  const guard = (): Promise<void> => guardTaskChange(state, input.taskRef.element_id);
  await guard();
  const owner = state.registry.documents.find((document) => document.artifact === "roadmap" && document.role === "semantic"
    && parseProductDocument(state.documents.get(document.id)!).elements.some((element) => element.id === input.taskRef.element_id));
  if (owner === undefined) return fail("BROKEN_REFERENCE", "Task source document is unavailable.");
  const documents = new Map(state.documents);
  documents.set(owner.id, removeElement(documents.get(owner.id)!, input.taskRef.element_id));
  return executeMutation({ state, scenario, scenarioInput,
    registry: { ...state.registry, element_metadata: state.registry.element_metadata.map((entry) => sameRef(entry.ref, input.taskRef)
      ? { ...withTaskChangeProvenance(entry, input.answerRef, decision), state: "retired" as const } : entry) },
    documents,
    candidate: { ...state.candidate, relations: state.candidate.relations.filter((relation) => !sameRef(relation.from, input.taskRef) && !sameRef(relation.to, input.taskRef)) },
    refs, documentId: owner.id, decision, guard, ...(recovery === undefined ? {} : { recovery }), ...hooks,
    next: "Task retired without completion or new identities. Review and activate the candidate before the ready Roadmap changes; historical bindings and source objects remain unchanged.",
  });
}

export async function splitRoadmapTask(input: {
  readonly root: string;
  readonly context: string;
  readonly candidateRef: CandidateRef;
  readonly taskRef: Ref;
  readonly replacements: readonly unknown[];
  readonly answerRef: DecisionRef;
}): Promise<RoadmapOutcome<MutationResult>> {
  if (input.replacements.length < 2) return fail("INVALID_INPUT", "Splitting a task requires at least two replacement tasks.");
  const values = input.replacements.map((value) => validateRoadmapValue("Task", value) as TaskValue);
  const scenario = "roadmap_split_task";
  const scenarioInput = { candidate_ref: input.candidateRef, task_ref: input.taskRef, replacements: values, answer_ref: input.answerRef };
  const replay = await replayMutation(input.root, input.context, input.candidateRef, scenario, scenarioInput);
  if (replay !== null) return replay;
  const state = await loadState(input.root, input.context, input.candidateRef);
  await requireReadyInputs(state);
  assertTaskReference(state, input.taskRef);
  const answer = await validateDecisionReference(state, input.answerRef);
  if (answer.state !== "answered") {
    return fail("ANSWER_REQUIRED", "Task splitting requires a current explicit answer decision.");
  }
  if (!answer.affected_refs.some((reference) => reference.product_id === input.taskRef.product_id
    && reference.artifact === input.taskRef.artifact && reference.element_id === input.taskRef.element_id)) {
    return fail("ANSWER_REQUIRED", "Task splitting answer does not authorize the selected task.");
  }
  for (const value of values) await validateValueReferences(state, "Task", value);
  const activeTaskIds = new Set(state.registry.element_metadata.filter((metadata) => metadata.state === "active"
    && metadata.semantic_type === "Task").map((metadata) => metadata.ref.element_id));
  const dependents = state.candidate.relations.filter((relation) => relation.kind === "depends_on"
    && relation.to.element_id === input.taskRef.element_id && activeTaskIds.has(relation.from.element_id));
  if (dependents.length > 0) return fail("CONFLICT", "Task has live dependents; replacement ownership must be resolved explicitly before splitting.");
  const targetMetadata = state.registry.element_metadata.find((entry) => entry.state === "active"
    && entry.semantic_type === "Task" && entry.ref.element_id === input.taskRef.element_id)!;
  const owner = state.registry.documents.find((document) => document.artifact === "roadmap" && document.role === "semantic"
    && parseProductDocument(state.documents.get(document.id)!).elements.some((element) => element.id === input.taskRef.element_id));
  if (owner === undefined) return fail("BROKEN_REFERENCE", "Task source document is unavailable.");
  const metadata = state.registry.element_metadata.map((entry) => entry === targetMetadata ? {
    ...entry,
    provenance: [...new Map([...entry.provenance, input.answerRef]
      .map((reference) => [`${reference.id}:${reference.revision}`, reference])).values()],
    state: "retired" as const,
  } : entry);
  const nextDocuments = new Map(state.documents);
  let document = removeElement(nextDocuments.get(owner.id)!, input.taskRef.element_id);
  const reserved = new Set<string>();
  const replacementRefs: Ref[] = [];
  const relations = [...state.candidate.relations];
  const inheritedDependencies = relations.filter((relation) => relation.kind === "depends_on"
    && relation.from.element_id === input.taskRef.element_id);
  for (const value of values) {
    const ref: Ref = {
      product_id: state.candidate.product_id,
      artifact: "roadmap",
      element_id: nextElementId({ ...state.registry, element_metadata: metadata }, "Task", reserved),
    };
    reserved.add(ref.element_id);
    replacementRefs.push(ref);
    document = replaceOrAppendElement(document, ref.element_id, "Task", value, false);
    const provenance = [...new Map([...value.provenance, input.answerRef]
      .map((reference) => [`${reference.id}:${reference.revision}`, reference])).values()];
    metadata.push({ ref, semantic_type: "Task", applicability: value.applicability, provenance, state: "active" });
    relations.push(...relationsFor("Task", ref, value));
    relations.push({ from: ref, kind: "derived_from", to: input.taskRef });
    relations.push(...inheritedDependencies.map((relation) => ({ from: ref, kind: "depends_on" as const, to: relation.to })));
  }
  nextDocuments.set(owner.id, document);
  return executeMutation({
    state,
    scenario,
    scenarioInput,
    registry: { ...state.registry, element_metadata: metadata },
    documents: nextDocuments,
    candidate: { ...state.candidate, relations },
    refs: [input.taskRef, ...replacementRefs],
    documentId: owner.id,
    next: "The original task is retired. Reserve one new specification identity separately for each selected replacement task before planning or execution.",
  });
}

export async function recordRoadmapStageOutcome(input: {
  readonly root: string;
  readonly context: string;
  readonly candidateRef: CandidateRef;
  readonly stageRef: Ref;
  readonly evidenceRefs: readonly Ref[];
  readonly observation: string;
  readonly source: string;
}): Promise<RoadmapOutcome<MutationResult>> {
  assertNonSensitive({ observation: input.observation, source: input.source });
  const scenario = "roadmap_record_stage_outcome";
  const scenarioInput = {
    candidate_ref: input.candidateRef,
    stage_ref: input.stageRef,
    evidence_refs: input.evidenceRefs,
    observation: input.observation,
    source: input.source,
  };
  const replay = await replayMutation(input.root, input.context, input.candidateRef, scenario, scenarioInput);
  if (replay !== null) return replay;
  const state = await loadState(input.root, input.context, input.candidateRef);
  await requireReadyInputs(state);
  activeMetadata(state, input.stageRef, "Stage");
  uniqueRefs(input.evidenceRefs, "Stage outcome evidence");
  const evidence = input.evidenceRefs.map((reference) => activeMetadata(state, reference));
  for (const metadata of evidence) {
    if (metadata.ref.artifact === "prd" || metadata.ref.artifact === "technical-design") {
      requirePinnedUpstream(state, metadata.ref);
    }
  }
  const hasTask = evidence.some((metadata) => metadata.semantic_type === "Task"
    && state.candidate.relations.some((relation) => relation.from.element_id === metadata.ref.element_id
      && relation.kind === "scheduled_in" && relation.to.element_id === input.stageRef.element_id));
  const integratedOutcomeTypes = new Set([
    "PrdGoal", "PrdCapability", "PrdUseCase", "PrdRule", "PrdConstraint",
    "TechnicalBoundary", "TechnologyChoice", "TechnicalPolicy",
  ]);
  const hasIntegratedOutcome = evidence.some((metadata) => integratedOutcomeTypes.has(metadata.semantic_type));
  if (!hasTask || !hasIntegratedOutcome) {
    return fail("INVALID_INPUT", "Stage outcome requires evidence from scheduled work and an integrated non-task product or technical result.");
  }
  const id = operationId(scenario, input.candidateRef, state.candidate.source_version, scenarioInput);
  const decisionRef: DecisionRef = {
    product_id: state.candidate.product_id,
    artifact: "roadmap",
    id: deterministicUuid(`decision:${id}`),
    revision: 1,
  };
  const decision: DecisionRecord = {
    schema_version: 1,
    kind: "decision",
    ref: decisionRef,
    state: "observed",
    category: "stage-outcome",
    question: null,
    text: input.observation,
    source: input.source,
    selected_ids: [],
    predecessors: [],
    affected_refs: [input.stageRef, ...input.evidenceRefs],
    reconsider_when: null,
    candidate_id: state.candidate.candidate_id,
  };
  return executeMutation({
    state,
    scenario,
    scenarioInput,
    registry: state.registry,
    documents: state.documents,
    candidate: state.candidate,
    refs: [input.stageRef],
    documentId: null,
    decision,
    next: "Use the recorded integrated evidence during the explicit Roadmap readiness review; no task specification was created.",
  });
}
