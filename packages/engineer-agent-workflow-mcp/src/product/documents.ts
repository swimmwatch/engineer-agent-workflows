import { constants } from "node:fs";
import { lstat, mkdir, open, readdir, rename, unlink } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { basename, dirname } from "node:path";

import { fromMarkdown } from "mdast-util-from-markdown";

import { fail, WorkflowError } from "../state.js";
import { validateProductPath } from "./config.js";
import { replayProductMutationResult, runProductMutation } from "./operations.js";
import { validateProductRecord } from "./schemas.js";
import { loadGeneration, readObject, saveObject } from "./storage.js";

const MAX_SOURCE_BYTES = 16 * 1024 * 1024;
const MAX_INVENTORY_DEPTH = 32;
const MAX_INVENTORY_ENTRIES = 4096;
const ELEMENT_ID_PATTERN = /^[A-Z][A-Z0-9_-]*-[0-9]{4,}$/u;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/u;
const ARTIFACTS = new Set(["idea", "prd", "technical-design", "roadmap"]);

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

interface CandidateRef {
  readonly product_id: string;
  readonly candidate_id: string;
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
  readonly applicability: unknown;
  readonly provenance: readonly DecisionRef[];
  readonly state: "active" | "retired";
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
  readonly upstream_pins: readonly unknown[];
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

interface ParsedElement {
  readonly id: string;
  readonly title: string;
  readonly start: number;
  readonly end: number;
}

export interface ParsedProductDocument {
  readonly source: string;
  readonly newline: "\n" | "\r\n";
  readonly elements: readonly ParsedElement[];
}

interface CandidateState {
  readonly root: string;
  readonly context: ProductContext;
  readonly candidate: CandidateRecord;
  readonly candidateBytes: Buffer;
  readonly registry: RegistryRecord;
  readonly documents: ReadonlyMap<string, Buffer>;
  readonly parsed: ReadonlyMap<string, ParsedProductDocument>;
  readonly paths: ReadonlyMap<string, string>;
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

export interface DocumentOutcome<T> {
  readonly context: string;
  readonly result: T;
  readonly replayed: boolean;
  readonly operationRef: string | null;
}

interface FileChange {
  readonly relativePath: string;
  readonly before: Buffer | null;
  readonly after: Buffer | null;
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

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0)!;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}

function canonicalPlainText(value: string, maximum: number, field: string): string {
  const normalized = value.normalize("NFC").trim();
  if (
    normalized.length === 0
    || Array.from(normalized).length > maximum
    || hasControlCharacter(normalized)
  ) return fail("INVALID_INPUT", `${field} must be one bounded line of plain text.`);
  return normalized;
}

function isCanonicalPlainText(value: string, maximum: number): boolean {
  return value === value.normalize("NFC").trim()
    && value.length > 0
    && Array.from(value).length <= maximum
    && !hasControlCharacter(value);
}

function markdownLinkLabel(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("[", "\\[").replaceAll("]", "\\]");
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
    return fail("INVALID_STATE", "Product document file could not be closed safely.");
  }
}

async function readSafe(root: string, relativePath: string, workspace: string): Promise<Buffer | null> {
  const path = await validateProductPath(root, relativePath, { workspaceRoots: [workspace] });
  let pathStat;
  try {
    pathStat = await lstat(path);
  } catch (error) {
    if (nodeErrorCode(error) === "ENOENT") return null;
    return fail("INVALID_STATE", "Product document source cannot be inspected safely.");
  }
  if (pathStat.isSymbolicLink() || !pathStat.isFile() || pathStat.nlink !== 1) {
    return fail("UNSAFE_PATH", "Product document source must be a regular single-link file.");
  }
  if (pathStat.size > MAX_SOURCE_BYTES) return fail("SOURCE_LIMIT", "Product document source exceeds the 16 MiB limit.");
  let handle: FileHandle | undefined;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = await handle.stat();
    if (before.dev !== pathStat.dev || before.ino !== pathStat.ino || before.size !== pathStat.size) {
      return fail("SOURCE_CHANGED", "Product document source changed before it could be read.");
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
    ) return fail("SOURCE_CHANGED", "Product document source changed while it was read.");
    return bytes;
  } catch (error) {
    if (error instanceof WorkflowError) throw error;
    if (["ENOENT", "ELOOP"].includes(nodeErrorCode(error) ?? "")) {
      return fail("SOURCE_CHANGED", "Product document source changed while it was read.");
    }
    return fail("INVALID_STATE", "Product document source cannot be read safely.");
  } finally {
    await closeHandle(handle);
  }
}

async function atomicWrite(root: string, relativePath: string, bytes: Buffer, workspace: string): Promise<void> {
  let path = await validateProductPath(root, relativePath, { workspaceRoots: [workspace] });
  await mkdir(dirname(path), { recursive: true, mode: 0o700 }).catch(() => fail("INVALID_STATE", "Product document directory cannot be created safely."));
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
    return fail("INVALID_STATE", "Product document source cannot be replaced safely.");
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
  return value as ProductContext;
}

function validatedContext(context: string): ProductContext {
  const value = decodeContext(context);
  const record = value as unknown as Record<string, unknown>;
  const candidate = record.candidate_ref as Record<string, unknown> | null;
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
    || record.contract !== "product-1"
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
  return value;
}

async function validatedRegistry(value: unknown): Promise<RegistryRecord> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return fail("INVALID_STATE", "Selected product registry is invalid.");
  }
  const record = value as Record<string, unknown>;
  if (
    record.schema_version !== 1
    || record.kind !== "registry"
    || typeof record.product_id !== "string"
    || !UUID_PATTERN.test(record.product_id)
    || !Array.isArray(record.documents)
    || record.documents.length > 1024
    || !Array.isArray(record.element_metadata)
    || record.element_metadata.length > 10_000
    || Object.keys(record).some((key) => !["schema_version", "kind", "product_id", "documents", "element_metadata"].includes(key))
  ) return fail("INVALID_STATE", "Selected product registry is invalid.");
  const documentIds = new Set<string>();
  const documentPaths = new Set<string>();
  for (const item of record.documents) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) return fail("INVALID_STATE", "Selected product registry document is invalid.");
    const document = item as Record<string, unknown>;
    if (
      typeof document.id !== "string" || !UUID_PATTERN.test(document.id)
      || typeof document.artifact !== "string" || !ARTIFACTS.has(document.artifact)
      || !["semantic", "navigation"].includes(String(document.role))
      || typeof document.subject !== "string" || !isCanonicalPlainText(document.subject, 128)
      || typeof document.relative_path !== "string" || document.relative_path.length === 0 || document.relative_path.length > 1024
      || typeof document.object_sha256 !== "string" || !DIGEST_PATTERN.test(document.object_sha256)
      || Object.keys(document).some((key) => !["id", "artifact", "role", "subject", "relative_path", "object_sha256"].includes(key))
    ) return fail("INVALID_STATE", "Selected product registry document is invalid.");
    const portablePath = document.relative_path.normalize("NFC").toLocaleLowerCase("en");
    if (documentIds.has(document.id) || documentPaths.has(portablePath)) {
      return fail("INVALID_STATE", "Selected product registry contains duplicate document identities or paths.");
    }
    documentIds.add(document.id);
    documentPaths.add(portablePath);
  }
  for (const metadata of record.element_metadata) await validateProductRecord("ElementMetadata", metadata);
  return value as RegistryRecord;
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

function headingText(node: unknown): string {
  if (node === null || typeof node !== "object") return "";
  const record = node as { value?: unknown; children?: unknown[] };
  if (typeof record.value === "string") return record.value;
  return Array.isArray(record.children) ? record.children.map(headingText).join("") : "";
}

function precedingSeparator(source: string, offset: number, newline: "\n" | "\r\n"): number {
  const doubled = `${newline}${newline}`;
  return offset >= doubled.length && source.slice(offset - doubled.length, offset) === doubled
    ? offset - newline.length
    : offset;
}

export function parseProductDocument(bytes: Uint8Array): ParsedProductDocument {
  if (bytes.byteLength > MAX_SOURCE_BYTES) return fail("SOURCE_LIMIT", "Product document source exceeds the 16 MiB limit.");
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return fail("INVALID_MARKDOWN", "Product document source is not valid UTF-8 Markdown.");
  }
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  let tree;
  try {
    tree = fromMarkdown(source);
  } catch {
    return fail("INVALID_MARKDOWN", "Product document source is malformed Markdown.");
  }
  const candidates = tree.children.flatMap((node) => {
    if (node.type !== "heading" || node.depth !== 3 || node.position?.start.offset === undefined) return [];
    const match = /^([A-Z][A-Z0-9_-]*-[0-9]{4,}):\s+(.+)$/u.exec(headingText(node));
    if (match === null || match[1] === undefined || match[2] === undefined || !ELEMENT_ID_PATTERN.test(match[1])) {
      return fail("INVALID_MARKDOWN", "Level-three product headings must use a valid semantic element identity and title.");
    }
    return [{ id: match[1], title: match[2], headingStart: node.position.start.offset }];
  });
  const elements = candidates.map((candidate, index) => {
    const next = candidates[index + 1];
    return {
      id: candidate.id,
      title: candidate.title,
      start: precedingSeparator(source, candidate.headingStart, newline),
      end: next?.headingStart ?? source.length,
    };
  });
  if (new Set(elements.map((element) => element.id)).size !== elements.length) {
    return fail("INVALID_MARKDOWN", "Product document contains duplicate semantic element identities.");
  }
  return { source, newline, elements };
}

interface InventoryBudget {
  entries: number;
}

async function inventory(
  root: string,
  baseRelative: string,
  workspace: string,
  prefix = "",
  depth = 0,
  budget: InventoryBudget = { entries: 0 },
): Promise<string[]> {
  if (depth > MAX_INVENTORY_DEPTH) {
    return fail("SOURCE_LIMIT", "Product draft inventory exceeds the maximum directory depth.");
  }
  const directoryRelative = prefix.length === 0 ? baseRelative : `${baseRelative}/${prefix}`;
  const directory = await validateProductPath(root, directoryRelative, { workspaceRoots: [workspace] });
  let directoryStat;
  try {
    directoryStat = await lstat(directory);
  } catch (error) {
    if (nodeErrorCode(error) === "ENOENT" && depth === 0) return [];
    if (nodeErrorCode(error) === "ENOENT") return fail("SOURCE_CHANGED", "Product draft inventory changed while it was inspected.");
    return fail("INVALID_STATE", "Product draft inventory cannot be inspected safely.");
  }
  if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) {
    return fail("UNSAFE_PATH", "Product draft inventory directories must be real directories.");
  }
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (nodeErrorCode(error) === "ENOENT") return [];
    return fail("INVALID_STATE", "Product draft inventory cannot be inspected safely.");
  }
  const result: string[] = [];
  for (const entry of entries) {
    budget.entries += 1;
    if (budget.entries > MAX_INVENTORY_ENTRIES) {
      return fail("SOURCE_LIMIT", "Product draft inventory exceeds the maximum entry count.");
    }
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const childRelative = `${baseRelative}/${relative}`;
    const child = await validateProductPath(root, childRelative, { workspaceRoots: [workspace] });
    let childStat;
    try {
      childStat = await lstat(child);
    } catch (error) {
      if (nodeErrorCode(error) === "ENOENT") return fail("SOURCE_CHANGED", "Product draft inventory changed while it was inspected.");
      return fail("INVALID_STATE", "Product draft inventory entry cannot be inspected safely.");
    }
    if (childStat.isSymbolicLink()) return fail("UNSAFE_PATH", "Product draft inventory cannot contain symbolic links.");
    if (childStat.isDirectory()) {
      result.push(...await inventory(root, baseRelative, workspace, relative, depth + 1, budget));
    } else if (childStat.isFile()) result.push(relative);
    else return fail("UNSAFE_PATH", "Product draft inventory contains an unsupported entry.");
  }
  return result.sort();
}

function validateMembership(registry: RegistryRecord, parsed: ReadonlyMap<string, ParsedProductDocument>): void {
  const owners = new Map<string, Artifact>();
  for (const document of registry.documents) {
    const value = parsed.get(document.id);
    if (value === undefined) return fail("INVALID_STATE", "Registered product document is missing from the draft.");
    if (document.role === "navigation" && value.elements.length > 0) {
      return fail("INVALID_MARKDOWN", "Navigation documents cannot own semantic elements.");
    }
    if (document.role === "semantic") {
      for (const element of value.elements) {
        if (owners.has(element.id)) return fail("INVALID_MARKDOWN", "Semantic element identity is duplicated across product documents.");
        owners.set(element.id, document.artifact);
      }
    }
  }
  const active = registry.element_metadata.filter((metadata) => metadata.state === "active");
  if (new Set(active.map((metadata) => metadata.ref.element_id)).size !== active.length) {
    return fail("INVALID_STATE", "Product registry contains duplicate active semantic identities.");
  }
  for (const metadata of active) {
    if (metadata.ref.product_id !== registry.product_id || owners.get(metadata.ref.element_id) !== metadata.ref.artifact) {
      return fail("INVALID_MARKDOWN", "Product document elements do not match registered semantic metadata.");
    }
  }
  for (const [elementId, artifact] of owners) {
    if (!active.some((metadata) => metadata.ref.element_id === elementId && metadata.ref.artifact === artifact)) {
      return fail("INVALID_MARKDOWN", "Product document contains an unregistered semantic element.");
    }
  }
}

async function loadCandidateState(
  root: string,
  contextText: string,
  candidateRef: CandidateRef | null,
  requireCurrent = true,
): Promise<CandidateState> {
  const context = validatedContext(contextText);
  const selected = candidateRef ?? context.candidate_ref;
  if (
    selected === null
    || context.product_id === null
    || context.workspace_id === null
    || context.candidate_ref === null
    || selected.product_id !== context.product_id
    || selected.product_id !== context.candidate_ref.product_id
    || selected.candidate_id !== context.candidate_ref.candidate_id
  ) return fail("INVALID_INPUT", "Product document operation requires the selected candidate context.");
  const relativeCandidate = candidatePath(selected.product_id, selected.candidate_id);
  const candidateBytes = await readSafe(root, relativeCandidate, context.canonical_workspace);
  if (candidateBytes === null) return fail("NOT_FOUND", "Selected product candidate is unavailable.");
  let candidateValue: unknown;
  try {
    candidateValue = JSON.parse(candidateBytes.toString("utf8"));
  } catch {
    return fail("INVALID_STATE", "Selected product candidate is malformed.");
  }
  const candidate = await validateProductRecord("Candidate", candidateValue) as CandidateRecord;
  if (
    candidate.product_id !== selected.product_id
    || candidate.candidate_id !== selected.candidate_id
    || candidate.workspace_id !== context.workspace_id
    || candidate.base_generation !== context.target_revision
  ) return fail("CONFLICT", "Selected product candidate does not match its context.");
  if (requireCurrent && candidate.source_version !== context.selected_sources_sha256) {
    return fail("CONFLICT", "Product candidate changed since this context was issued.");
  }
  if (candidate.base_generation !== null) await loadGeneration(root, candidate.product_id, candidate.base_generation);
  const registryBytes = await readObject(root, {
    productId: candidate.product_id,
    kind: "record",
    sha256: candidate.registry.object_sha256,
  });
  let registryValue: unknown;
  try {
    registryValue = JSON.parse(Buffer.from(registryBytes).toString("utf8"));
  } catch {
    return fail("INVALID_STATE", "Selected product registry is malformed.");
  }
  const registry = await validatedRegistry(registryValue);
  if (registry.product_id !== candidate.product_id) return fail("SOURCE_CHANGED", "Selected product registry belongs to another product.");

  const documents = new Map<string, Buffer>();
  const parsed = new Map<string, ParsedProductDocument>();
  const paths = new Map<string, string>();
  for (const document of registry.documents) {
    const relativePath = documentPath(candidate.product_id, candidate.candidate_id, document.relative_path);
    const bytes = await readSafe(root, relativePath, context.canonical_workspace);
    if (bytes === null) return fail("INVALID_STATE", "Registered product document is missing from the draft.");
    documents.set(document.id, bytes);
    parsed.set(document.id, parseProductDocument(bytes));
    paths.set(document.id, relativePath);
  }
  const draftRelative = `products/${candidate.product_id}/drafts/${candidate.candidate_id}/documents`;
  const actual = await inventory(root, draftRelative, context.canonical_workspace);
  const expected = registry.documents.map((document) => document.relative_path).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    return fail("INVALID_STATE", "Product draft contains unregistered or missing Markdown members.");
  }
  validateMembership(registry, parsed);
  return { root, context, candidate, candidateBytes, registry, documents, parsed, paths };
}

function assertNoDirectEdits(state: CandidateState): void {
  for (const document of state.registry.documents) {
    const bytes = state.documents.get(document.id);
    if (bytes === undefined || digest(bytes) !== document.object_sha256) {
      return fail("SOURCE_CHANGED", "Product draft contains direct edits that require reconciliation.");
    }
  }
}

function changedRefs(state: CandidateState, documentIds: ReadonlySet<string>): Ref[] {
  return state.registry.element_metadata
    .filter((metadata) => metadata.state === "active")
    .filter((metadata) => {
      for (const documentId of documentIds) {
        if (state.parsed.get(documentId)?.elements.some((element) => element.id === metadata.ref.element_id)) return true;
      }
      return false;
    })
    .map((metadata) => metadata.ref);
}

function changedElementIds(
  before: ParsedProductDocument,
  after: ParsedProductDocument,
): ReadonlySet<string> {
  const beforeBlocks = new Map(before.elements.map((element) => [
    element.id,
    before.source.slice(element.start, element.end),
  ]));
  const afterBlocks = new Map(after.elements.map((element) => [
    element.id,
    after.source.slice(element.start, element.end),
  ]));
  const identifiers = new Set([...beforeBlocks.keys(), ...afterBlocks.keys()]);
  return new Set([...identifiers].filter((identifier) => beforeBlocks.get(identifier) !== afterBlocks.get(identifier)));
}

function refsForElementIds(state: CandidateState, elementIds: ReadonlySet<string>): Ref[] {
  return state.registry.element_metadata
    .filter((metadata) => metadata.state === "active" && elementIds.has(metadata.ref.element_id))
    .map((metadata) => metadata.ref);
}

function slug(subject: string): string {
  const value = subject.normalize("NFC").trim().toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
  if (value.length === 0 || value.length > 96) return fail("INVALID_INPUT", "Document subject cannot form a safe portable path.");
  return value;
}

function navigationBytes(registry: RegistryRecord, artifact: Artifact, newline: "\n" | "\r\n"): Buffer {
  const title = artifact === "technical-design" ? "Technical Design" : artifact === "prd" ? "PRD" : artifact[0]!.toUpperCase() + artifact.slice(1);
  const members = registry.documents.filter((document) => document.artifact === artifact && document.role === "semantic");
  const links = members.map((document) => `- [${markdownLinkLabel(document.subject)}](${basename(document.relative_path)})`).join(newline);
  return Buffer.from(`# ${title}${newline}${links.length === 0 ? "" : `${newline}${links}${newline}`}`, "utf8");
}

function candidateVersion(candidate: object): string {
  return digest(canonicalBytes(Object.fromEntries(Object.entries(candidate).filter(([key]) => key !== "source_version"))));
}

async function applyChange(root: string, change: FileChange, workspace: string): Promise<void> {
  const current = await readSafe(root, change.relativePath, workspace);
  if (change.after === null) {
    if (current === null) return;
    if (change.before === null || !current.equals(change.before)) return fail("CONFLICT", "Product document target changed during recovery.");
    await unlink(await validateProductPath(root, change.relativePath, { workspaceRoots: [workspace] }));
    return;
  }
  if (current?.equals(change.after)) return;
  if ((current === null) !== (change.before === null) || (current !== null && change.before !== null && !current.equals(change.before))) {
    return fail("CONFLICT", "Product document target changed during recovery.");
  }
  await atomicWrite(root, change.relativePath, change.after, workspace);
}

async function verifyChanges(root: string, changes: readonly FileChange[], workspace: string): Promise<void> {
  for (const change of changes) {
    const current = await readSafe(root, change.relativePath, workspace);
    if (change.after === null ? current !== null : !current?.equals(change.after)) {
      return fail("CONFLICT", "Product document targets changed during recovery.");
    }
  }
}

function mutationResult(
  operationId: string,
  candidate: CandidateRecord,
  refs: readonly Ref[],
  documentId: string | null,
  next: string,
): MutationResult {
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
    next,
    document_id: documentId,
  };
}

function documentOperationId(
  scenario: string,
  productId: string,
  candidateId: string,
  sourceVersion: string,
  scenarioInput: Record<string, unknown>,
): string {
  return deterministicUuid(`${scenario}:${productId}:${candidateId}:${sourceVersion}:${JSON.stringify(scenarioInput)}`);
}

async function replayMutation(
  root: string,
  contextText: string,
  candidateRef: CandidateRef,
  scenario: string,
  scenarioInput: Record<string, unknown>,
): Promise<DocumentOutcome<MutationResult> | null> {
  const context = validatedContext(contextText);
  if (
    context.product_id !== candidateRef.product_id
    || context.candidate_ref?.candidate_id !== candidateRef.candidate_id
    || context.candidate_ref.product_id !== candidateRef.product_id
  ) return fail("INVALID_INPUT", "Product document operation requires the selected candidate context.");
  const operationId = documentOperationId(
    scenario,
    candidateRef.product_id,
    candidateRef.candidate_id,
    context.selected_sources_sha256,
    scenarioInput,
  );
  let replay;
  try {
    replay = await replayProductMutationResult({
      root,
      productId: candidateRef.product_id,
      operationId,
      scenario,
      intent: { schema_version: 1, kind: "operation_intent", scenario, input: scenarioInput },
    });
  } catch (error) {
    if (error instanceof WorkflowError && error.code === "NOT_FOUND") return null;
    throw error;
  }
  const state = await loadCandidateState(root, contextText, candidateRef, false);
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
  nextRegistry: RegistryRecord,
  nextDocuments: ReadonlyMap<string, Buffer>,
  extraChanges: readonly FileChange[],
  refs: readonly Ref[],
  documentId: string | null,
  nextMessage: string,
): Promise<DocumentOutcome<MutationResult>> {
  await validatedRegistry(nextRegistry);
  const nextParsed = new Map<string, ParsedProductDocument>();
  for (const document of nextRegistry.documents) {
    const bytes = nextDocuments.get(document.id);
    if (bytes === undefined) return fail("INVALID_STATE", "Next product registry has no matching document bytes.");
    nextParsed.set(document.id, parseProductDocument(bytes));
  }
  validateMembership(nextRegistry, nextParsed);

  const storedDocuments = new Map<string, string>();
  for (const document of nextRegistry.documents) {
    const bytes = nextDocuments.get(document.id);
    if (bytes === undefined) return fail("INVALID_STATE", "Next product registry has no matching document bytes.");
    storedDocuments.set(document.id, digest(bytes));
  }
  const registry: RegistryRecord = {
    ...nextRegistry,
    documents: nextRegistry.documents.map((document) => ({ ...document, object_sha256: storedDocuments.get(document.id)! })),
  };
  await validatedRegistry(registry);
  const registryBytes = canonicalBytes(registry);
  const registrySha256 = digest(registryBytes);
  const candidateWithoutVersion = {
    ...state.candidate,
    registry: { id: state.candidate.registry.id, object_sha256: registrySha256 },
  };
  const candidate: CandidateRecord = { ...candidateWithoutVersion, source_version: candidateVersion(candidateWithoutVersion) };
  await validateProductRecord("Candidate", candidate);
  const candidateBytes = canonicalBytes(candidate);
  const candidateRelative = candidatePath(candidate.product_id, candidate.candidate_id);
  const documentChanges: FileChange[] = registry.documents.map((document) => ({
    relativePath: documentPath(candidate.product_id, candidate.candidate_id, document.relative_path),
    before: state.registry.documents.some((previous) => previous.relative_path === document.relative_path)
      ? state.documents.get(document.id) ?? null
      : null,
    after: nextDocuments.get(document.id) ?? null,
  }));
  const changes = [...documentChanges, ...extraChanges, {
    relativePath: candidateRelative,
    before: state.candidateBytes,
    after: candidateBytes,
  }];
  const operationId = documentOperationId(scenario, candidate.product_id, candidate.candidate_id, state.candidate.source_version, scenarioInput);
  const intent = { schema_version: 1, kind: "operation_intent", scenario, input: scenarioInput };
  const result = mutationResult(operationId, candidate, refs, documentId, nextMessage);
  const outcome = await runProductMutation({
    root: state.root,
    productId: candidate.product_id,
    operationId,
    sessionId: randomUUID(),
    scenario,
    expectedRevision: state.context.target_revision,
    nextRevision: state.context.target_revision ?? fail("PREREQUISITE_REQUIRED", "Product document mutation requires a base generation."),
    intent,
    result,
    targets: changes.map((change) => ({
      root: "store" as const,
      binding_id: null,
      relative_path: change.relativePath,
      before: change.before === null ? null : digest(change.before),
      after: change.after === null ? digest("missing") : digest(change.after),
    })),
    saveObjects: async () => {
      for (const document of registry.documents) {
        const bytes = nextDocuments.get(document.id)!;
        const stored = await saveObject(state.root, {
          productId: state.candidate.product_id,
          kind: "markdown",
          bytes,
        });
        if (stored.sha256 !== document.object_sha256) {
          return fail("INVALID_STATE", "Stored product document does not match its validated digest.");
        }
      }
      const storedRegistry = await saveObject(state.root, {
        productId: state.candidate.product_id,
        kind: "record",
        bytes: registryBytes,
      });
      if (storedRegistry.sha256 !== registrySha256) {
        return fail("INVALID_STATE", "Stored product registry does not match its validated digest.");
      }
      for (const change of changes) await applyChange(state.root, change, state.context.canonical_workspace);
    },
    verifyTargets: () => verifyChanges(state.root, changes, state.context.canonical_workspace),
  });
  return {
    context: encodeContext(state.context, candidate),
    result: outcome.result as MutationResult,
    replayed: outcome.replayed,
    operationRef: outcome.operationRef,
  };
}

function pageCursor(sourceVersion: string, offset: number): string {
  return Buffer.from(JSON.stringify({ source_version: sourceVersion, offset })).toString("base64url");
}

function pageOffset(cursor: string | undefined, sourceVersion: string): number {
  if (cursor === undefined) return 0;
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as { source_version?: unknown; offset?: unknown };
    if (value.source_version !== sourceVersion || !Number.isInteger(value.offset) || Number(value.offset) < 0) throw new Error();
    return Number(value.offset);
  } catch {
    return fail("STALE_CURSOR", "Product document cursor is invalid or stale.");
  }
}

export async function listProductDocuments(input: {
  readonly root: string;
  readonly context: string;
  readonly artifact: Artifact;
  readonly cursor?: string;
  readonly limit?: number;
}): Promise<DocumentOutcome<Record<string, unknown>>> {
  const state = await loadCandidateState(input.root, input.context, null);
  const items = state.registry.documents.filter((document) => document.artifact === input.artifact);
  const offset = pageOffset(input.cursor, state.candidate.source_version);
  const limit = input.limit ?? 20;
  const selected = items.slice(offset, offset + limit);
  const nextOffset = offset + selected.length;
  return {
    context: input.context,
    result: {
      source_version: state.candidate.source_version,
      items: selected.map((document) => ({
        ref: null,
        decision_ref: null,
        document,
        product_id: state.candidate.product_id,
        title: document.subject,
        state: state.candidate.state,
        reason: null,
        operation_ref: null,
      })),
      total: items.length,
      complete: nextOffset >= items.length,
      next_cursor: nextOffset >= items.length ? null : pageCursor(state.candidate.source_version, nextOffset),
    },
    replayed: false,
    operationRef: null,
  };
}

export async function createDocumentSubject(input: {
  readonly root: string;
  readonly context: string;
  readonly candidateRef: CandidateRef;
  readonly subject: string;
  readonly title: string;
}): Promise<DocumentOutcome<MutationResult>> {
  const subject = canonicalPlainText(input.subject, 128, "Document subject");
  const title = canonicalPlainText(input.title, 256, "Document title");
  const scenarioInput = { candidate_ref: input.candidateRef, subject, title };
  const replay = await replayMutation(input.root, input.context, input.candidateRef, "product_document_create_subject", scenarioInput);
  if (replay !== null) return replay;
  const state = await loadCandidateState(input.root, input.context, input.candidateRef);
  assertNoDirectEdits(state);
  if (state.candidate.state !== "draft") return fail("CONFLICT", "Only a draft candidate can add a document subject.");
  const relativePath = `${state.candidate.artifact}/${slug(subject)}.md`;
  if (state.registry.documents.some((document) => document.relative_path.normalize("NFC").toLowerCase() === relativePath.toLowerCase())) {
    return fail("ALREADY_EXISTS", "Document subject already exists in this product artifact.");
  }
  const document: DocumentRecord = {
    id: deterministicUuid(`document:${documentOperationId(
      "product_document_create_subject",
      state.candidate.product_id,
      state.candidate.candidate_id,
      state.candidate.source_version,
      scenarioInput,
    )}`),
    artifact: state.candidate.artifact,
    role: "semantic",
    subject,
    relative_path: relativePath,
    object_sha256: "0".repeat(64),
  };
  const documents = [...state.registry.documents, document];
  const registry: RegistryRecord = { ...state.registry, documents };
  const nextDocuments = new Map(state.documents);
  nextDocuments.set(document.id, Buffer.from(`# ${title}\n`, "utf8"));
  const navigation = documents.find((candidate) => candidate.artifact === document.artifact && candidate.role === "navigation");
  if (navigation === undefined) return fail("INVALID_STATE", "Product artifact has no registered navigation document.");
  nextDocuments.set(navigation.id, navigationBytes(registry, document.artifact, state.parsed.get(navigation.id)?.newline ?? "\n"));
  return executeMutation(
    state,
    "product_document_create_subject",
    scenarioInput,
    registry,
    nextDocuments,
    [],
    [],
    document.id,
    "Document subject created; add or move substantive elements before readiness review.",
  );
}

export function resolveElement(state: CandidateState, reference: Ref): { document: DocumentRecord; element: ParsedElement } {
  if (reference.product_id !== state.candidate.product_id) return fail("NOT_FOUND", "Semantic element belongs to another product.");
  const matches: { document: DocumentRecord; element: ParsedElement }[] = [];
  for (const document of state.registry.documents.filter((candidate) => candidate.artifact === reference.artifact && candidate.role === "semantic")) {
    const element = state.parsed.get(document.id)?.elements.find((candidate) => candidate.id === reference.element_id);
    if (element !== undefined) matches.push({ document, element });
  }
  if (matches.length !== 1) return fail(matches.length === 0 ? "NOT_FOUND" : "INVALID_MARKDOWN", "Semantic element placement is missing or ambiguous.");
  return matches[0]!;
}

export async function moveDocumentElements(input: {
  readonly root: string;
  readonly context: string;
  readonly candidateRef: CandidateRef;
  readonly elementRefs: readonly Ref[];
  readonly targetDocumentId: string;
}): Promise<DocumentOutcome<MutationResult>> {
  const scenarioInput = {
    candidate_ref: input.candidateRef,
    element_refs: input.elementRefs,
    target_document_id: input.targetDocumentId,
  };
  const replay = await replayMutation(input.root, input.context, input.candidateRef, "product_document_move_elements", scenarioInput);
  if (replay !== null) return replay;
  const state = await loadCandidateState(input.root, input.context, input.candidateRef);
  assertNoDirectEdits(state);
  if (input.elementRefs.length === 0) return fail("INVALID_INPUT", "At least one semantic element must be selected.");
  const target = state.registry.documents.find((document) => document.id === input.targetDocumentId);
  if (target === undefined || target.role !== "semantic" || target.artifact !== state.candidate.artifact) {
    return fail("NOT_FOUND", "Target semantic document is unavailable in this candidate artifact.");
  }
  const resolutions = input.elementRefs.map((reference) => resolveElement(state, reference));
  if (new Set(input.elementRefs.map((reference) => reference.element_id)).size !== input.elementRefs.length) {
    return fail("INVALID_INPUT", "Semantic element selection contains duplicates.");
  }
  const nextDocuments = new Map(state.documents);
  const movedBlocks: string[] = [];
  const grouped = new Map<string, typeof resolutions>();
  for (const resolution of resolutions) grouped.set(resolution.document.id, [...(grouped.get(resolution.document.id) ?? []), resolution]);
  for (const [documentId, selected] of grouped) {
    const parsed = state.parsed.get(documentId)!;
    let source = parsed.source;
    for (const resolution of [...selected].sort((left, right) => right.element.start - left.element.start)) {
      movedBlocks.unshift(parsed.source.slice(resolution.element.start, resolution.element.end));
      source = `${source.slice(0, resolution.element.start)}${source.slice(resolution.element.end)}`;
    }
    nextDocuments.set(documentId, Buffer.from(source, "utf8"));
  }
  const targetParsed = parseProductDocument(nextDocuments.get(target.id)!);
  let targetSource = targetParsed.source;
  for (const block of movedBlocks) {
    const normalized = block.startsWith(targetParsed.newline) ? block : `${targetParsed.newline}${block}`;
    targetSource = `${targetSource.replace(/[\r\n]*$/u, targetParsed.newline)}${normalized}`;
  }
  nextDocuments.set(target.id, Buffer.from(targetSource, "utf8"));
  const navigation = state.registry.documents.find((document) => document.artifact === target.artifact && document.role === "navigation");
  if (navigation !== undefined) nextDocuments.set(navigation.id, navigationBytes(state.registry, target.artifact, state.parsed.get(navigation.id)?.newline ?? "\n"));
  return executeMutation(
    state,
    "product_document_move_elements",
    scenarioInput,
    state.registry,
    nextDocuments,
    [],
    input.elementRefs,
    target.id,
    "Semantic elements moved without changing their identities.",
  );
}

export async function renameProductDocument(input: {
  readonly root: string;
  readonly context: string;
  readonly candidateRef: CandidateRef;
  readonly documentId: string;
  readonly subject: string;
  readonly title: string;
}): Promise<DocumentOutcome<MutationResult>> {
  const subject = canonicalPlainText(input.subject, 128, "Document subject");
  const title = canonicalPlainText(input.title, 256, "Document title");
  const scenarioInput = {
    candidate_ref: input.candidateRef,
    document_id: input.documentId,
    subject,
    title,
  };
  const replay = await replayMutation(input.root, input.context, input.candidateRef, "product_document_rename", scenarioInput);
  if (replay !== null) return replay;
  const state = await loadCandidateState(input.root, input.context, input.candidateRef);
  assertNoDirectEdits(state);
  const current = state.registry.documents.find((document) => document.id === input.documentId);
  if (current === undefined || current.role !== "semantic" || current.artifact !== state.candidate.artifact) {
    return fail("NOT_FOUND", "Semantic document is unavailable in this candidate artifact.");
  }
  const relativePath = `${current.artifact}/${slug(subject)}.md`;
  if (state.registry.documents.some((document) => document.id !== current.id && document.relative_path.toLowerCase() === relativePath.toLowerCase())) {
    return fail("ALREADY_EXISTS", "Document subject path is already registered.");
  }
  const source = state.parsed.get(current.id)!.source;
  const newline = state.parsed.get(current.id)!.newline;
  const renamedSource = source.replace(/^#[ \t]+[^\r\n]*(?:\r?\n|$)/u, `# ${title}${newline}`);
  if (renamedSource === source && !source.startsWith(`# ${title}${newline}`)) {
    return fail("INVALID_MARKDOWN", "Semantic document must start with a level-one title.");
  }
  const renamedDocument: DocumentRecord = { ...current, subject, relative_path: relativePath };
  const registry: RegistryRecord = {
    ...state.registry,
    documents: state.registry.documents.map((document) => document.id === current.id ? renamedDocument : document),
  };
  const nextDocuments = new Map(state.documents);
  nextDocuments.set(current.id, Buffer.from(renamedSource, "utf8"));
  const navigation = registry.documents.find((document) => document.artifact === current.artifact && document.role === "navigation");
  if (navigation !== undefined) nextDocuments.set(navigation.id, navigationBytes(registry, current.artifact, state.parsed.get(navigation.id)?.newline ?? "\n"));
  const oldPath = state.paths.get(current.id)!;
  const oldBytes = state.documents.get(current.id)!;
  const extra = oldPath === documentPath(state.candidate.product_id, state.candidate.candidate_id, relativePath)
    ? []
    : [{ relativePath: oldPath, before: oldBytes, after: null }];
  return executeMutation(
    state,
    "product_document_rename",
    scenarioInput,
    registry,
    nextDocuments,
    extra,
    changedRefs(state, new Set([current.id])),
    current.id,
    "Document subject renamed and navigation regenerated.",
  );
}

export async function beginDocumentEdit(input: {
  readonly root: string;
  readonly context: string;
  readonly artifact: Artifact;
  readonly documentId: string;
}): Promise<DocumentOutcome<Record<string, unknown>>> {
  const state = await loadCandidateState(input.root, input.context, null);
  const document = state.registry.documents.find((candidate) => candidate.id === input.documentId && candidate.artifact === input.artifact);
  if (document === undefined || document.role !== "semantic") return fail("NOT_FOUND", "Editable semantic document is unavailable.");
  const bytes = state.documents.get(document.id)!;
  if (digest(bytes) !== document.object_sha256) return fail("SOURCE_CHANGED", "Document already contains uninspected direct edits.");
  if (state.candidate.base_generation === null) {
    return fail("PREREQUISITE_REQUIRED", "Direct editing requires retained base generation evidence.");
  }
  const operationId = deterministicUuid(`product_document_begin_edit:${state.candidate.product_id}:${state.candidate.candidate_id}:${document.id}:${state.candidate.source_version}`);
  const elementIds = state.parsed.get(document.id)!.elements.map((element) => element.id);
  const result = {
    operation_ref: operationId,
    candidate_ref: { product_id: state.candidate.product_id, candidate_id: state.candidate.candidate_id },
    document_id: document.id,
    editable_path: await validateProductPath(state.root, state.paths.get(document.id)!, { workspaceRoots: [state.context.canonical_workspace] }),
    base_pin: {
      product_id: state.candidate.product_id,
      artifact: document.artifact,
      source_kind: "markdown",
      source_id: document.id,
      generation: state.candidate.base_generation,
      object_sha256: document.object_sha256,
      element_ids: elementIds,
      decision_ref: null,
    },
  };
  const outcome = await runProductMutation({
    root: state.root,
    productId: state.candidate.product_id,
    operationId,
    sessionId: randomUUID(),
    scenario: "product_document_begin_edit",
    expectedRevision: state.context.target_revision,
    nextRevision: state.candidate.base_generation,
    intent: {
      schema_version: 1,
      kind: "operation_intent",
      scenario: "product_document_begin_edit",
      input: { artifact: input.artifact, document_id: input.documentId },
    },
    result,
    resultDefinition: "Success_EditResult",
  });
  return {
    context: input.context,
    result: outcome.result,
    replayed: outcome.replayed,
    operationRef: outcome.operationRef,
  };
}

export async function inspectDocumentEdits(input: {
  readonly root: string;
  readonly context: string;
  readonly candidateRef: CandidateRef;
  readonly documentId: string;
  readonly cursor?: string;
  readonly limit?: number;
}): Promise<DocumentOutcome<Record<string, unknown>>> {
  const state = await loadCandidateState(input.root, input.context, input.candidateRef);
  const document = state.registry.documents.find((candidate) => candidate.id === input.documentId);
  if (document === undefined || document.role !== "semantic") return fail("NOT_FOUND", "Editable semantic document is unavailable.");
  const bytes = state.documents.get(document.id)!;
  const observed = digest(bytes);
  pageOffset(input.cursor, observed);
  return {
    context: input.context,
    result: {
      source_version: observed,
      items: [{
        ref: null,
        decision_ref: null,
        document,
        product_id: state.candidate.product_id,
        title: document.subject,
        state: observed === document.object_sha256 ? "unchanged" : "changed",
        reason: observed === document.object_sha256 ? null : "Draft bytes differ from retained candidate evidence.",
        operation_ref: null,
      }],
      total: 1,
      complete: true,
      next_cursor: null,
    },
    replayed: false,
    operationRef: null,
  };
}

function sameDecision(left: DecisionRef, right: DecisionRef): boolean {
  return left.product_id === right.product_id && left.artifact === right.artifact && left.id === right.id && left.revision === right.revision;
}

export async function acceptDocumentEdits(input: {
  readonly root: string;
  readonly context: string;
  readonly candidateRef: CandidateRef;
  readonly documentId: string;
  readonly observedDigest: string;
  readonly instructionRef: DecisionRef;
}): Promise<DocumentOutcome<MutationResult>> {
  const scenarioInput = {
    candidate_ref: input.candidateRef,
    document_id: input.documentId,
    observed_digest: input.observedDigest,
    instruction_ref: input.instructionRef,
  };
  const replay = await replayMutation(input.root, input.context, input.candidateRef, "product_document_accept_edits", scenarioInput);
  if (replay !== null) return replay;
  const state = await loadCandidateState(input.root, input.context, input.candidateRef);
  const document = state.registry.documents.find((candidate) => candidate.id === input.documentId);
  if (document === undefined || document.role !== "semantic" || document.artifact !== state.candidate.artifact) {
    return fail("NOT_FOUND", "Editable semantic document is unavailable in this candidate artifact.");
  }
  if (!state.candidate.decision_heads.some((head) => sameDecision(head.decision_ref, input.instructionRef))) {
    return fail("NOT_FOUND", "Edit instruction provenance is not part of this candidate.");
  }
  const bytes = state.documents.get(document.id)!;
  if (digest(bytes) !== input.observedDigest) return fail("SOURCE_CHANGED", "Product document changed after edit inspection.");
  if (digest(bytes) === document.object_sha256) {
    return fail("INVALID_INPUT", "Product document has no direct edits to accept.");
  }
  for (const other of state.registry.documents) {
    if (other.id !== document.id && digest(state.documents.get(other.id)!) !== other.object_sha256) {
      return fail("SOURCE_CHANGED", "Another product document has unresolved direct edits.");
    }
  }
  const retainedBytes = Buffer.from(await readObject(state.root, {
    productId: state.candidate.product_id,
    kind: "markdown",
    sha256: document.object_sha256,
  }));
  const elementIds = changedElementIds(
    parseProductDocument(retainedBytes),
    state.parsed.get(document.id)!,
  );
  const registry: RegistryRecord = {
    ...state.registry,
    element_metadata: state.registry.element_metadata.map((metadata) => (
      elementIds.has(metadata.ref.element_id) && !metadata.provenance.some((reference) => sameDecision(reference, input.instructionRef))
        ? { ...metadata, provenance: [...metadata.provenance, input.instructionRef] }
        : metadata
    )),
  };
  return executeMutation(
    state,
    "product_document_accept_edits",
    scenarioInput,
    registry,
    state.documents,
    [],
    refsForElementIds(state, elementIds),
    document.id,
    "Direct Markdown edits accepted with explicit provenance; readiness remains unchanged.",
  );
}
