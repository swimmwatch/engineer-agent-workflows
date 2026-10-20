import { createHash, randomUUID } from "node:crypto";
import { constants, readFileSync } from "node:fs";
import { lstat, mkdir, open, rename, unlink } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { dirname } from "node:path";

import Ajv from "ajv";

import { fail, WorkflowError } from "../state.js";
import { validateProductPath } from "./config.js";
import { listProductDocuments, parseProductDocument } from "./documents.js";
import { replayProductMutationResult, runProductMutation } from "./operations.js";
import { loadGeneration, readObject, saveObject, verifySourcePin } from "./storage.js";
import type { LoadedGeneration, SourcePin } from "./storage.js";
import { validateProductRecord } from "./schemas.js";

const MAX_SOURCE_BYTES = 16 * 1024 * 1024;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/u;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const ELEMENT_ID_PATTERN = /^[A-Z][A-Z0-9_-]*-[0-9]{4,}$/u;
const SENSITIVE_PATTERN = /\b(?:authorization\s*:\s*bearer|api[_-]?key\s*[:=]|access[_-]?token\s*[:=]|refresh[_-]?token\s*[:=]|client[_-]?secret\s*[:=]|private[_-]?key\s*[:=]|secret[_-]?access[_-]?key\s*[:=]|password\s*[:=]|secret\s*[:=])|-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----|\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b|\bgh[pousr]_[A-Za-z0-9]{20,}\b|\bxox[baprs]-[A-Za-z0-9-]{10,}\b/iu;
const CREDENTIAL_URI_PATTERN = /\b[a-z][a-z0-9+.-]*:\/\/[^\s/@]+@/iu;

type Artifact = "idea" | "prd" | "technical-design" | "roadmap";
type SemanticType = "TechnicalBoundary" | "TechnologyChoice" | "TechnicalPolicy";

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

interface SemanticValue extends Record<string, unknown> {
  readonly title: string;
  readonly provenance: readonly DecisionRef[];
  readonly applicability: Applicability;
  readonly prd_refs: readonly Ref[];
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
}

interface DecisionRecord {
  readonly ref: DecisionRef;
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
  readonly decision_ref: null;
  readonly question_ref: null;
  readonly product_id: string;
  readonly workspace_id: string;
  readonly task_id: null;
  readonly specification_id: null;
  readonly review_ref: null;
  readonly next: string;
  readonly document_id: string | null;
}

export interface TechnicalOutcome<T> {
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
  TechnicalBoundary: ["purpose", "inputs", "outputs", "ownership", "data_flows", "errors"],
  TechnologyChoice: ["choice", "alternatives", "rationale", "revisit_when"],
  TechnicalPolicy: ["kind", "rule", "verification", "exceptions", "authoritative_contract"],
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
    return fail("INVALID_STATE", "Technical Design file could not be closed safely.");
  }
}

async function readSafe(root: string, relativePath: string, workspace: string): Promise<Buffer | null> {
  const path = await validateProductPath(root, relativePath, { workspaceRoots: [workspace] });
  let pathStat;
  try {
    pathStat = await lstat(path);
  } catch (error) {
    if (nodeErrorCode(error) === "ENOENT") return null;
    return fail("INVALID_STATE", "Technical Design source cannot be inspected safely.");
  }
  if (pathStat.isSymbolicLink() || !pathStat.isFile() || pathStat.nlink !== 1) {
    return fail("UNSAFE_PATH", "Technical Design source must be a regular single-link file.");
  }
  if (pathStat.size > MAX_SOURCE_BYTES) return fail("SOURCE_LIMIT", "Technical Design source exceeds the 16 MiB limit.");
  let handle: FileHandle | undefined;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = await handle.stat();
    if (before.dev !== pathStat.dev || before.ino !== pathStat.ino || before.size !== pathStat.size) {
      return fail("SOURCE_CHANGED", "Technical Design source changed before it could be read.");
    }
    const value = await handle.readFile();
    const after = await handle.stat();
    const finalPath = await lstat(path);
    if (
      value.byteLength !== before.size || before.dev !== after.dev || before.ino !== after.ino
      || before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs
      || finalPath.isSymbolicLink() || !finalPath.isFile() || finalPath.nlink !== 1
      || finalPath.dev !== after.dev || finalPath.ino !== after.ino
    ) return fail("SOURCE_CHANGED", "Technical Design source changed while it was read.");
    return value;
  } catch (error) {
    if (error instanceof WorkflowError) throw error;
    if (["ENOENT", "ELOOP"].includes(nodeErrorCode(error) ?? "")) {
      return fail("SOURCE_CHANGED", "Technical Design source changed while it was read.");
    }
    return fail("INVALID_STATE", "Technical Design source cannot be read safely.");
  } finally {
    await closeHandle(handle);
  }
}

async function atomicWrite(root: string, relativePath: string, value: Buffer, workspace: string): Promise<void> {
  let path = await validateProductPath(root, relativePath, { workspaceRoots: [workspace] });
  await mkdir(dirname(path), { recursive: true, mode: 0o700 })
    .catch(() => fail("INVALID_STATE", "Technical Design directory cannot be created safely."));
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
    return fail("INVALID_STATE", "Technical Design source cannot be replaced safely.");
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

async function loadState(
  root: string,
  contextText: string,
  candidateRef: CandidateRef,
  requireCurrent = true,
): Promise<CandidateState> {
  const context = decodeContext(contextText);
  if (
    context.product_id !== candidateRef.product_id || context.workspace_id === null
    || context.candidate_ref?.product_id !== candidateRef.product_id
    || context.candidate_ref.candidate_id !== candidateRef.candidate_id
  ) return fail("INVALID_INPUT", "Technical Design authoring requires the selected candidate context.");
  if (requireCurrent) await listProductDocuments({ root, context: contextText, artifact: "technical-design", limit: 1 });
  const relativeCandidate = candidatePath(candidateRef.product_id, candidateRef.candidate_id);
  const candidateBytes = await readSafe(root, relativeCandidate, context.canonical_workspace);
  if (candidateBytes === null) return fail("NOT_FOUND", "Selected product candidate is unavailable.");
  const candidate = await validateProductRecord("Candidate", parseJson(candidateBytes, "Selected product candidate")) as CandidateRecord;
  if (
    candidate.product_id !== candidateRef.product_id || candidate.candidate_id !== candidateRef.candidate_id
    || candidate.workspace_id !== context.workspace_id || candidate.base_generation !== context.target_revision
    || candidate.artifact !== "technical-design"
  ) return fail("CONFLICT", "Selected product candidate does not match its context or Technical Design artifact.");
  if (requireCurrent && candidate.source_version !== context.selected_sources_sha256) {
    return fail("CONFLICT", "Product candidate changed since this context was issued.");
  }
  const generation = await loadGeneration(
    root,
    candidate.product_id,
    candidate.base_generation ?? fail("PREREQUISITE_REQUIRED", "Technical Design requires a base generation."),
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
    const value = await readSafe(root, relative, context.canonical_workspace);
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
      return fail("INVALID_MARKDOWN", "Product document contains an unregistered semantic element.");
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
        return fail("INVALID_INPUT", "Sensitive values cannot be stored in Technical Design artifacts.");
      }
    } else if (Array.isArray(current)) pending.push(...(current as unknown[]));
    else if (current !== null && typeof current === "object") pending.push(...Object.values(current as Record<string, unknown>));
  }
}

function validateSemanticValue(type: SemanticType, value: unknown): SemanticValue {
  const validate = ajv.getSchema(`${productSchema.$id}#/definitions/${type}`);
  if (validate === undefined) return fail("INVALID_STATE", "Published Technical Design schema is unavailable.");
  if (!validate(value)) return fail("INVALID_INPUT", "Technical Design value does not match the published scenario contract.");
  assertNonSensitive(value);
  const semantic = value as SemanticValue;
  if (semantic.title !== semantic.title.normalize("NFC").trim() || hasControlCharacter(semantic.title)) {
    return fail("INVALID_INPUT", "Technical Design title must be one canonical line.");
  }
  const scoped = semantic.applicability.stage_refs.length > 0;
  if (semantic.applicability.global === scoped) {
    return fail("INVALID_INPUT", "Technical Design applicability must be either global or scoped to named stages.");
  }
  if (semantic.applicability.state === "accepted_target" && !scoped) {
    return fail("INVALID_INPUT", "Accepted Technical Design targets require at least one named stage.");
  }
  return semantic;
}

function assertSubject(subject: string): string {
  const normalized = subject.normalize("NFC").trim();
  if (normalized.length === 0 || normalized !== subject || Array.from(subject).length > 128 || hasControlCharacter(subject)) {
    return fail("INVALID_INPUT", "Technical Design subject must be one bounded line of plain text.");
  }
  return subject;
}

async function validateProvenance(state: CandidateState, reference: DecisionRef): Promise<void> {
  if (reference.product_id !== state.candidate.product_id || reference.artifact !== "technical-design") {
    return fail("NOT_FOUND", "Decision reference is outside the selected Technical Design candidate.");
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
  if (digest(value) !== head.object_sha256) return fail("SOURCE_CHANGED", "Technical Design decision evidence changed after selection.");
  const parsed = await validateProductRecord("Decision", parseJson(value, "Technical Design decision evidence")) as DecisionRecord;
  if (
    parsed.ref.product_id !== reference.product_id || parsed.ref.artifact !== reference.artifact
    || parsed.ref.id !== reference.id || parsed.ref.revision !== reference.revision
    || parsed.candidate_id !== state.candidate.candidate_id
  ) return fail("SOURCE_CHANGED", "Technical Design decision evidence does not match its reference.");
}

async function requireReadyPrd(state: CandidateState): Promise<readonly SourcePin[]> {
  if (!state.generation.generation.ready_artifacts.some((ready) => ready.artifact === "prd")) {
    return fail("PREREQUISITE_REQUIRED", "Technical Design authoring requires a ready PRD result.");
  }
  const pins = state.candidate.upstream_pins.filter((pin) => pin.product_id === state.candidate.product_id && pin.artifact === "prd");
  if (pins.length === 0) return fail("PREREQUISITE_REQUIRED", "Technical Design authoring requires exact ready PRD source pins.");
  const lineage = new Set<string>();
  let current: string | null = state.generation.sha256;
  while (current !== null) {
    if (lineage.size >= 10_000 || lineage.has(current)) return fail("SOURCE_LIMIT", "Product generation lineage exceeds the supported bound.");
    lineage.add(current);
    current = (await loadGeneration(state.root, state.candidate.product_id, current)).generation.parent;
  }
  for (const pin of pins) {
    if (!lineage.has(pin.generation) || pin.element_ids.length === 0) {
      return fail("SOURCE_CHANGED", "Ready PRD source pin is outside the selected generation lineage or has no addressed elements.");
    }
    await verifySourcePin(state.root, pin);
  }
  return pins;
}

async function validateValueReferences(state: CandidateState, type: SemanticType, value: SemanticValue): Promise<void> {
  const provenance = new Set<string>();
  for (const reference of value.provenance) {
    const key = `${reference.artifact}:${reference.id}:${reference.revision}`;
    if (provenance.has(key)) return fail("INVALID_INPUT", "Technical Design provenance contains duplicate decision references.");
    provenance.add(key);
    await validateProvenance(state, reference);
  }
  const active = state.registry.element_metadata.filter((metadata) => metadata.state === "active");
  const validateRefs = (references: readonly Ref[], expectedArtifact?: Artifact): void => {
    const keys = new Set<string>();
    for (const reference of references) {
      const key = `${reference.artifact}:${reference.element_id}`;
      if (keys.has(key)) return fail("INVALID_INPUT", "Technical Design links contain duplicate references.");
      keys.add(key);
      const target = active.find((metadata) => metadata.ref.product_id === reference.product_id
        && metadata.ref.artifact === reference.artifact && metadata.ref.element_id === reference.element_id);
      if (target === undefined || (expectedArtifact !== undefined && target.ref.artifact !== expectedArtifact)) {
        return fail("BROKEN_REFERENCE", "Technical Design link does not resolve to the required active element.");
      }
    }
  };
  validateRefs(value.applicability.stage_refs, "roadmap");
  validateRefs(value.prd_refs, "prd");
  if (value.prd_refs.length === 0) return fail("INVALID_INPUT", "Technical Design element requires at least one PRD justification reference.");
  const pins = await requireReadyPrd(state);
  for (const reference of value.prd_refs) {
    if (!pins.some((pin) => pin.element_ids.includes(reference.element_id))) {
      return fail("SOURCE_CHANGED", "Technical Design PRD reference is not covered by the selected ready PRD pins.");
    }
  }
  if (type === "TechnicalBoundary") validateRefs(value.dependencies as readonly Ref[]);
  if (type === "TechnologyChoice") validateRefs(value.evidence_refs as readonly Ref[]);
}

function nextElementId(registry: RegistryRecord): string {
  let maximum = 0;
  for (const metadata of registry.element_metadata) {
    const match = /^TD-(\d+)$/u.exec(metadata.ref.element_id);
    if (match?.[1] !== undefined) maximum = Math.max(maximum, Number(match[1]));
  }
  const next = maximum + 1;
  if (!Number.isSafeInteger(next)) return fail("SOURCE_LIMIT", "Technical Design identity range is exhausted.");
  return `TD-${String(next).padStart(4, "0")}`;
}

function safeMarkdown(value: string, newline: "\n" | "\r\n"): string {
  const normalized = value.normalize("NFC").replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  return normalized.split("\n").map((line) => /^( {0,3})#/u.test(line) ? line.replace(/^( {0,3})#/u, "$1\\#") : line).join(newline);
}

function heading(field: string): string {
  return field.split("_").map((part) => `${part[0]!.toUpperCase()}${part.slice(1)}`).join(" ");
}

function renderField(value: unknown, newline: "\n" | "\r\n"): string {
  if (value === null) return "Unknown.";
  if (typeof value === "string") return safeMarkdown(value, newline);
  if (Array.isArray(value)) {
    if (value.length === 0) return "None.";
    if (!value.every((item) => typeof item === "string")) {
      return fail("INVALID_STATE", "Structured Technical Design links must remain in registry metadata.");
    }
    return value.map((item) => {
      const lines = safeMarkdown(item, newline).split(newline);
      return `- ${lines[0]}${lines.slice(1).map((line) => `${newline}  ${line}`).join("")}`;
    }).join(newline);
  }
  return fail("INVALID_STATE", "Technical Design field cannot be rendered safely.");
}

function renderElement(type: SemanticType, id: string, value: SemanticValue, newline: "\n" | "\r\n"): string {
  const lines = [`### ${id}: ${safeMarkdown(value.title, newline)}`];
  for (const field of SEMANTIC_FIELDS[type]) lines.push("", `#### ${heading(field)}`, "", renderField(value[field], newline));
  return lines.join(newline);
}

function replaceOrAppendElement(document: Buffer, id: string, type: SemanticType, value: SemanticValue, updating: boolean): Buffer {
  const parsed = parseProductDocument(document);
  const rendered = renderElement(type, id, value, parsed.newline);
  if (!updating) {
    const separator = parsed.source.length === 0 ? "" : parsed.source.endsWith(parsed.newline) ? parsed.newline : `${parsed.newline}${parsed.newline}`;
    return Buffer.from(`${parsed.source}${separator}${rendered}${parsed.newline}`, "utf8");
  }
  const element = parsed.elements.find((candidate) => candidate.id === id);
  if (element === undefined) return fail("BROKEN_REFERENCE", "Technical Design element is missing from its registered document.");
  const marker = `### ${id}:`;
  const headingStart = parsed.source.indexOf(marker, element.start);
  if (headingStart < element.start || headingStart >= element.end) {
    return fail("INVALID_MARKDOWN", "Technical Design element heading cannot be resolved safely.");
  }
  const prefix = parsed.source.slice(element.start, headingStart);
  const trailing = element.end < parsed.source.length ? `${parsed.newline}${parsed.newline}` : parsed.newline;
  return Buffer.from(`${parsed.source.slice(0, element.start)}${prefix}${rendered}${trailing}${parsed.source.slice(element.end)}`, "utf8");
}

function relationsFor(type: SemanticType, from: Ref, value: SemanticValue): readonly Relation[] {
  const relations: Relation[] = value.prd_refs.map((to) => ({ from, kind: "derived_from", to }));
  if (type === "TechnicalBoundary") {
    relations.push(...(value.dependencies as readonly Ref[]).map((to) => ({ from, kind: "depends_on" as const, to })));
  }
  if (type === "TechnologyChoice") {
    relations.push(...(value.evidence_refs as readonly Ref[]).map((to) => ({ from, kind: "derived_from" as const, to })));
  }
  return [...new Map(relations.map((relation) => [`${relation.kind}:${relation.to.artifact}:${relation.to.element_id}`, relation])).values()];
}

function relationOwnedBy(relation: Relation, ref: Ref): boolean {
  return relation.from.product_id === ref.product_id && relation.from.artifact === ref.artifact
    && relation.from.element_id === ref.element_id && ["derived_from", "depends_on"].includes(relation.kind);
}

function mutationResult(operationId: string, candidate: CandidateRecord, refs: readonly Ref[], documentId: string | null): MutationResult {
  return {
    operation_ref: operationId,
    applied: true,
    candidate_ref: { product_id: candidate.product_id, candidate_id: candidate.candidate_id },
    changed_refs: refs,
    decision_ref: null,
    question_ref: null,
    product_id: candidate.product_id,
    workspace_id: candidate.workspace_id,
    task_id: null,
    specification_id: null,
    review_ref: null,
    next: "Continue Technical Design authoring or run the explicit readiness review after all shared rules are addressed.",
    document_id: documentId,
  };
}

function canonicalOperationValue(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalOperationValue).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${canonicalOperationValue((value as Record<string, unknown>)[key])}`
    )).join(",")}}`;
  }
  return fail("INVALID_INPUT", "Technical Design mutation input is not canonical JSON data.");
}

function operationId(scenario: string, candidate: CandidateRef, sourceVersion: string, input: unknown): string {
  return deterministicUuid(`${scenario}:${candidate.product_id}:${candidate.candidate_id}:${sourceVersion}:${canonicalOperationValue(input)}`);
}

async function applyChange(root: string, relativePath: string, before: Buffer, after: Buffer, workspace: string): Promise<void> {
  const current = await readSafe(root, relativePath, workspace);
  if (current?.equals(after)) return;
  if (!current?.equals(before)) return fail("CONFLICT", "Technical Design target changed during mutation recovery.");
  await atomicWrite(root, relativePath, after, workspace);
}

async function replayMutation(
  root: string,
  contextText: string,
  candidateRef: CandidateRef,
  scenario: string,
  scenarioInput: Record<string, unknown>,
): Promise<TechnicalOutcome<MutationResult> | null> {
  const context = decodeContext(contextText);
  if (context.product_id !== candidateRef.product_id || context.candidate_ref?.candidate_id !== candidateRef.candidate_id) {
    return fail("INVALID_INPUT", "Technical Design authoring requires the selected candidate context.");
  }
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
  const state = await loadState(root, contextText, candidateRef, false);
  return {
    context: encodeContext(context, state.candidate),
    result: replay.result as MutationResult,
    replayed: true,
    operationRef: replay.operationRef,
  };
}

async function executeMutation(
  state: CandidateState,
  scenario: string,
  scenarioInput: Record<string, unknown>,
  nextRegistryInput: RegistryRecord,
  nextDocuments: ReadonlyMap<string, Buffer>,
  refs: readonly Ref[],
  documentId: string,
): Promise<TechnicalOutcome<MutationResult>> {
  const documents = nextRegistryInput.documents.map((document) => {
    const value = nextDocuments.get(document.id) ?? fail("INVALID_STATE", "Next product registry has no matching document bytes.");
    parseProductDocument(value);
    return { ...document, object_sha256: digest(value) };
  });
  const registry: RegistryRecord = { ...nextRegistryInput, documents };
  await validateRegistry(registry, state.candidate.product_id);
  const registryBytes = canonicalBytes(registry);
  const registrySha256 = digest(registryBytes);
  const withoutVersion: Omit<CandidateRecord, "source_version"> = {
    ...candidateWithoutVersion(state.candidate),
    registry: { id: state.candidate.registry.id, object_sha256: registrySha256 },
    relations: [...state.candidate.relations],
  };
  const candidate: CandidateRecord = { ...withoutVersion, source_version: candidateVersion(withoutVersion) };
  await validateProductRecord("Candidate", candidate);
  const candidateBytes = canonicalBytes(candidate);
  const changes: { relativePath: string; before: Buffer; after: Buffer }[] = [];
  for (const document of registry.documents) {
    const before = state.documents.get(document.id)!;
    const after = nextDocuments.get(document.id)!;
    if (!before.equals(after)) {
      changes.push({
        relativePath: documentPath(candidate.product_id, candidate.candidate_id, document.relative_path),
        before,
        after,
      });
    }
  }
  changes.push({
    relativePath: candidatePath(candidate.product_id, candidate.candidate_id),
    before: state.candidateBytes,
    after: candidateBytes,
  });
  const id = operationId(
    scenario,
    { product_id: candidate.product_id, candidate_id: candidate.candidate_id },
    state.candidate.source_version,
    scenarioInput,
  );
  const result = mutationResult(id, candidate, refs, documentId);
  const outcome = await runProductMutation({
    root: state.root,
    productId: candidate.product_id,
    operationId: id,
    sessionId: randomUUID(),
    scenario,
    expectedRevision: state.context.target_revision,
    nextRevision: state.context.target_revision ?? fail("PREREQUISITE_REQUIRED", "Technical Design requires a base generation."),
    intent: { schema_version: 1, kind: "operation_intent", scenario, input: scenarioInput },
    result,
    targets: changes.map((change) => ({
      root: "store" as const,
      binding_id: null,
      relative_path: change.relativePath,
      before: digest(change.before),
      after: digest(change.after),
    })),
    saveObjects: async () => {
      for (const document of registry.documents) {
        const value = nextDocuments.get(document.id)!;
        const saved = await saveObject(state.root, { productId: candidate.product_id, kind: "markdown", bytes: value });
        if (saved.sha256 !== document.object_sha256) {
          return fail("INVALID_STATE", "Stored Technical Design document does not match its validated digest.");
        }
      }
      const savedRegistry = await saveObject(state.root, { productId: candidate.product_id, kind: "record", bytes: registryBytes });
      if (savedRegistry.sha256 !== registrySha256) {
        return fail("INVALID_STATE", "Stored Technical Design registry does not match its validated digest.");
      }
      for (const change of changes) {
        await applyChange(state.root, change.relativePath, change.before, change.after, state.context.canonical_workspace);
      }
    },
    verifyTargets: async () => {
      for (const change of changes) {
        const current = await readSafe(state.root, change.relativePath, state.context.canonical_workspace);
        if (!current?.equals(change.after)) return fail("CONFLICT", "Technical Design targets changed during recovery.");
      }
    },
  });
  return {
    context: encodeContext(state.context, candidate),
    result: outcome.result as MutationResult,
    replayed: outcome.replayed,
    operationRef: outcome.operationRef,
  };
}

export async function defineTechnicalElement(input: {
  readonly root: string;
  readonly context: string;
  readonly candidateRef: CandidateRef;
  readonly subject: string;
  readonly semanticType: SemanticType;
  readonly elementRef?: Ref;
  readonly value: unknown;
}): Promise<TechnicalOutcome<MutationResult>> {
  const value = validateSemanticValue(input.semanticType, input.value);
  const subject = assertSubject(input.subject);
  const scenario = `technical_define_${input.semanticType === "TechnologyChoice" ? "technology" : input.semanticType === "TechnicalBoundary" ? "boundary" : "policy"}`;
  const scenarioInput = {
    candidate_ref: input.candidateRef,
    subject,
    ...(input.elementRef === undefined ? {} : { element_ref: input.elementRef }),
    value,
  };
  const replay = await replayMutation(input.root, input.context, input.candidateRef, scenario, scenarioInput);
  if (replay !== null) return replay;
  const state = await loadState(input.root, input.context, input.candidateRef);
  await validateValueReferences(state, input.semanticType, value);
  const matchingDocuments = state.registry.documents.filter((document) =>
    document.artifact === "technical-design" && document.role === "semantic" && document.subject === subject);
  if (matchingDocuments.length !== 1) {
    return fail(matchingDocuments.length === 0 ? "NOT_FOUND" : "AMBIGUOUS_BINDING", "Technical Design subject does not resolve to one semantic document.");
  }
  const target = matchingDocuments[0]!;
  const metadata = [...state.registry.element_metadata];
  let ref: Ref;
  let updating = false;
  if (input.elementRef === undefined) {
    ref = { product_id: state.candidate.product_id, artifact: "technical-design", element_id: nextElementId(state.registry) };
  } else {
    if (
      input.elementRef.product_id !== state.candidate.product_id
      || input.elementRef.artifact !== "technical-design"
      || !ELEMENT_ID_PATTERN.test(input.elementRef.element_id)
    ) return fail("NOT_FOUND", "Technical Design element reference is outside the selected candidate.");
    const current = metadata.find((entry) => entry.state === "active" && entry.ref.artifact === "technical-design"
      && entry.ref.element_id === input.elementRef!.element_id);
    if (current === undefined) return fail("NOT_FOUND", "Technical Design element is not active.");
    if (current.semantic_type !== input.semanticType) return fail("INVALID_INPUT", "Technical Design element type cannot be changed in place.");
    const owner = state.registry.documents.find((document) => document.role === "semantic"
      && parseProductDocument(state.documents.get(document.id)!).elements.some((element) => element.id === current.ref.element_id));
    if (owner?.id !== target.id) return fail("INVALID_INPUT", "Technical Design update must name its current subject.");
    ref = current.ref;
    updating = true;
  }
  const targetBytes = state.documents.get(target.id)!;
  const nextTarget = replaceOrAppendElement(targetBytes, ref.element_id, input.semanticType, value, updating);
  parseProductDocument(nextTarget);
  const existingIndex = metadata.findIndex((entry) => entry.state === "active" && entry.ref.artifact === ref.artifact
    && entry.ref.element_id === ref.element_id);
  const nextMetadata: ElementMetadata = {
    ref,
    semantic_type: input.semanticType,
    applicability: value.applicability,
    provenance: value.provenance,
    state: "active",
  };
  if (existingIndex === -1) metadata.push(nextMetadata);
  else metadata[existingIndex] = nextMetadata;
  const relations = state.candidate.relations.filter((relation) => !relationOwnedBy(relation, ref));
  relations.push(...relationsFor(input.semanticType, ref, value));
  const nextDocuments = new Map(state.documents);
  nextDocuments.set(target.id, nextTarget);
  const nextRegistry: RegistryRecord = { ...state.registry, element_metadata: metadata };
  const nextState: CandidateState = { ...state, candidate: { ...state.candidate, relations } };
  return executeMutation(nextState, scenario, scenarioInput, nextRegistry, nextDocuments, [ref], target.id);
}
