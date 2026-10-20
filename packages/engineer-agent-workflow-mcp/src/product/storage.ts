import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, mkdir, readFile } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { dirname } from "node:path";

import Ajv from "ajv";
import { isAlias, isMap, isNode, isSeq, parseAllDocuments } from "yaml";
import type { Node } from "yaml";

import { fail, WorkflowError } from "../state.js";
import { validateProductPath } from "./config.js";
import { validateProductRecord } from "./schemas.js";

const MAX_SOURCE_BYTES = 16 * 1024 * 1024;
const READ_CHUNK_BYTES = 64 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/u;
const ARTIFACTS = new Set(["idea", "prd", "technical-design", "roadmap"]);

type Artifact = "idea" | "prd" | "technical-design" | "roadmap";
type ObjectKind = "markdown" | "record" | "decision";

export interface ObjectWrite {
  readonly productId: string;
  readonly kind: ObjectKind;
  readonly bytes: Uint8Array;
  readonly artifact?: Artifact;
  readonly decisionId?: string;
  readonly revision?: number;
}

export interface ObjectReference {
  readonly productId: string;
  readonly kind: ObjectKind;
  readonly sha256: string;
  readonly artifact?: Artifact;
  readonly decisionId?: string;
  readonly revision?: number;
}

export interface StoredObject extends ObjectReference {
  readonly relativePath: string;
  readonly reused: boolean;
}

interface RecordObject {
  readonly id: string;
  readonly object_sha256: string;
}

interface DecisionReference {
  readonly product_id: string;
  readonly artifact: Artifact;
  readonly id: string;
  readonly revision: number;
}

export interface SourcePin {
  readonly product_id: string;
  readonly artifact: Artifact;
  readonly source_kind: ObjectKind;
  readonly source_id: string;
  readonly generation: string;
  readonly object_sha256: string;
  readonly element_ids: readonly string[];
  readonly decision_ref: DecisionReference | null;
}

interface Generation {
  readonly schema_version: 1;
  readonly kind: "generation";
  readonly product_id: string;
  readonly parent: string | null;
  readonly registry: RecordObject;
  readonly ready_artifacts: readonly {
    readonly artifact: Artifact;
    readonly source_version: string;
    readonly review_id: string;
    readonly upstream_pins: readonly SourcePin[];
  }[];
  readonly decision_heads: readonly {
    readonly decision_ref: DecisionReference;
    readonly object_sha256: string;
  }[];
  readonly relations: readonly unknown[];
}

interface RegistryDocument {
  readonly id: string;
  readonly artifact: Artifact;
  readonly object_sha256: string;
}

interface Registry {
  readonly schema_version: 1;
  readonly kind: "registry";
  readonly product_id: string;
  readonly documents: readonly RegistryDocument[];
  readonly element_metadata: readonly unknown[];
}

export interface LoadedDocument {
  readonly id: string;
  readonly sha256: string;
  readonly bytes: Uint8Array;
}

export interface LoadedDecision {
  readonly ref: DecisionReference;
  readonly sha256: string;
  readonly bytes: Uint8Array;
}

export interface LoadedSourcePin {
  readonly pin: SourcePin;
  readonly bytes: Uint8Array;
}

export interface StoredGeneration {
  readonly sha256: string;
  readonly relativePath: string;
  readonly reused: boolean;
}

export interface LoadedGeneration {
  readonly sha256: string;
  readonly generation: Generation;
  readonly registry: Uint8Array;
  readonly documents: readonly LoadedDocument[];
  readonly decisions: readonly LoadedDecision[];
  readonly sourcePins: readonly LoadedSourcePin[];
}

interface RegistryValidator {
  readonly validate: Ajv.ValidateFunction;
}

let registryValidator: Promise<RegistryValidator> | undefined;

function sha256(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function nodeErrorCode(error: unknown): string | undefined {
  if (error === null || typeof error !== "object" || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

function rethrowKnown(error: unknown, message: string): never {
  if (error instanceof WorkflowError) throw error;
  return fail("INVALID_STATE", message);
}

async function closeHandle(handle: FileHandle | undefined, message: string): Promise<void> {
  if (handle === undefined) return;
  try {
    await handle.close();
  } catch {
    return fail("INVALID_STATE", message);
  }
}

function assertUuid(value: string, label: string): void {
  if (!UUID_PATTERN.test(value)) return fail("INVALID_STATE", `${label} is invalid.`);
}

function assertDigest(value: string): void {
  if (!DIGEST_PATTERN.test(value)) return fail("INVALID_STATE", "Product object digest is invalid.");
}

function assertArtifact(value: string | undefined): asserts value is Artifact {
  if (value === undefined || !ARTIFACTS.has(value)) {
    return fail("INVALID_STATE", "Product artifact identity is invalid.");
  }
}

function decisionFields(reference: {
  readonly artifact?: Artifact;
  readonly decisionId?: string;
  readonly revision?: number;
}): { artifact: Artifact; decisionId: string; revision: number } {
  assertArtifact(reference.artifact);
  if (reference.decisionId === undefined) return fail("INVALID_STATE", "Decision identity is missing.");
  assertUuid(reference.decisionId, "Decision identity");
  if (!Number.isSafeInteger(reference.revision) || (reference.revision ?? 0) < 1) {
    return fail("INVALID_STATE", "Decision revision is invalid.");
  }
  return {
    artifact: reference.artifact,
    decisionId: reference.decisionId,
    revision: reference.revision as number,
  };
}

function objectRelativePath(reference: ObjectReference): string {
  assertUuid(reference.productId, "Product identity");
  assertDigest(reference.sha256);
  if (reference.kind === "markdown") {
    return `products/${reference.productId}/objects/${reference.sha256}.md`;
  }
  if (reference.kind === "record") {
    return `products/${reference.productId}/objects/${reference.sha256}.yaml`;
  }
  const decision = decisionFields(reference);
  return `products/${reference.productId}/decisions/${decision.artifact}/${decision.decisionId}/${decision.revision}.yaml`;
}

function generationRelativePath(productId: string, digest: string): string {
  assertUuid(productId, "Product identity");
  assertDigest(digest);
  return `products/${productId}/generations/${digest}.yaml`;
}

async function readBoundedFile(path: string, expectedDigest: string): Promise<Uint8Array> {
  let beforePath;
  try {
    beforePath = await lstat(path);
  } catch (error) {
    if (nodeErrorCode(error) === "ENOENT") return fail("MISSING_EVIDENCE", "Required product evidence is missing.");
    return fail("INVALID_STATE", "Required product evidence cannot be inspected safely.");
  }
  if (beforePath.isSymbolicLink() || !beforePath.isFile() || beforePath.nlink !== 1) {
    return fail("SOURCE_CHANGED", "Required product evidence is no longer an immutable regular file.");
  }
  if (beforePath.size > MAX_SOURCE_BYTES) {
    return fail("SOURCE_LIMIT", "Product source exceeds the 16 MiB limit.");
  }

  let handle: FileHandle | undefined;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch (error) {
    if (nodeErrorCode(error) === "ENOENT") return fail("MISSING_EVIDENCE", "Required product evidence is missing.");
    if (nodeErrorCode(error) === "ELOOP") {
      return fail("SOURCE_CHANGED", "Required product evidence is no longer an immutable regular file.");
    }
    return fail("INVALID_STATE", "Required product evidence cannot be opened safely.");
  }

  try {
    const beforeHandle = await handle.stat();
    if (
      !beforeHandle.isFile()
      || beforeHandle.nlink !== 1
      || beforeHandle.dev !== beforePath.dev
      || beforeHandle.ino !== beforePath.ino
      || beforeHandle.size !== beforePath.size
      || beforeHandle.mtimeMs !== beforePath.mtimeMs
      || beforeHandle.ctimeMs !== beforePath.ctimeMs
    ) {
      return fail("SOURCE_CHANGED", "Required product evidence is no longer an immutable regular file.");
    }
    if (beforeHandle.size > MAX_SOURCE_BYTES) {
      return fail("SOURCE_LIMIT", "Product source exceeds the 16 MiB limit.");
    }

    const chunks: Buffer[] = [];
    let total = 0;
    while (true) {
      const remaining = MAX_SOURCE_BYTES - total;
      const chunk = Buffer.allocUnsafe(Math.min(READ_CHUNK_BYTES, remaining + 1));
      const { bytesRead } = await handle.read(chunk, 0, chunk.byteLength, null);
      if (bytesRead === 0) break;
      total += bytesRead;
      if (total > MAX_SOURCE_BYTES) {
        return fail("SOURCE_LIMIT", "Product source exceeds the 16 MiB limit.");
      }
      chunks.push(chunk.subarray(0, bytesRead));
    }
    const afterHandle = await handle.stat();
    let afterPath;
    try {
      afterPath = await lstat(path);
    } catch (error) {
      if (nodeErrorCode(error) === "ENOENT") {
        return fail("SOURCE_CHANGED", "Required product evidence changed while being read.");
      }
      return fail("INVALID_STATE", "Required product evidence cannot be inspected safely.");
    }
    if (
      afterPath.isSymbolicLink()
      || !afterPath.isFile()
      || afterPath.nlink !== 1
      || afterHandle.dev !== beforeHandle.dev
      || afterHandle.ino !== beforeHandle.ino
      || afterHandle.size !== beforeHandle.size
      || afterHandle.mtimeMs !== beforeHandle.mtimeMs
      || afterHandle.ctimeMs !== beforeHandle.ctimeMs
      || afterPath.dev !== afterHandle.dev
      || afterPath.ino !== afterHandle.ino
      || afterPath.size !== afterHandle.size
      || afterPath.mtimeMs !== afterHandle.mtimeMs
      || afterPath.ctimeMs !== afterHandle.ctimeMs
    ) {
      return fail("SOURCE_CHANGED", "Required product evidence changed while being read.");
    }
    const value = Buffer.concat(chunks, total);
    if (sha256(value) !== expectedDigest) {
      return fail("SOURCE_CHANGED", "Required product evidence no longer matches its retained digest.");
    }
    return value;
  } catch (error) {
    return rethrowKnown(error, "Required product evidence cannot be read safely.");
  } finally {
    await closeHandle(handle, "Required product evidence cannot be closed safely.");
  }
}

async function readRelative(root: string, relativePath: string, expectedDigest: string): Promise<Uint8Array> {
  const path = await validateProductPath(root, relativePath);
  return readBoundedFile(path, expectedDigest);
}

async function saveImmutable(
  root: string,
  relativePath: string,
  value: Uint8Array,
  expectedDigest: string,
): Promise<boolean> {
  if (value.byteLength > MAX_SOURCE_BYTES) {
    return fail("SOURCE_LIMIT", "Product source exceeds the 16 MiB limit.");
  }
  let path = await validateProductPath(root, relativePath);
  try {
    await mkdir(dirname(path), { recursive: true });
  } catch (error) {
    return rethrowKnown(error, "Product evidence directory cannot be created safely.");
  }
  path = await validateProductPath(root, relativePath);

  let handle;
  try {
    handle = await open(path, "wx", 0o600);
  } catch (error) {
    if (nodeErrorCode(error) !== "EEXIST") {
      return fail("INVALID_STATE", "Immutable product evidence cannot be created safely.");
    }
    const existing = await readBoundedFile(path, expectedDigest);
    if (!Buffer.from(existing).equals(Buffer.from(value))) {
      return fail("SOURCE_CHANGED", "Immutable product evidence conflicts with retained bytes.");
    }
    return true;
  }

  try {
    await handle.writeFile(value);
    await handle.sync();
  } catch (error) {
    return rethrowKnown(error, "Immutable product evidence cannot be written safely.");
  } finally {
    await closeHandle(handle, "Immutable product evidence cannot be closed safely.");
  }
  return false;
}

export async function saveObject(root: string, input: ObjectWrite): Promise<StoredObject> {
  if (input.bytes.byteLength > MAX_SOURCE_BYTES) {
    return fail("SOURCE_LIMIT", "Product source exceeds the 16 MiB limit.");
  }
  const value = Buffer.from(input.bytes);
  const digest = sha256(value);
  let reference: ObjectReference;
  if (input.kind === "decision") {
    const decision = decisionFields(input);
    reference = {
      productId: input.productId,
      kind: input.kind,
      sha256: digest,
      artifact: decision.artifact,
      decisionId: decision.decisionId,
      revision: decision.revision,
    };
  } else {
    reference = { productId: input.productId, kind: input.kind, sha256: digest };
  }
  const relativePath = objectRelativePath(reference);
  const reused = await saveImmutable(root, relativePath, value, digest);
  return { ...reference, relativePath, reused };
}

export async function readObject(root: string, reference: ObjectReference): Promise<Uint8Array> {
  const relativePath = objectRelativePath(reference);
  return readRelative(root, relativePath, reference.sha256);
}

function validateYamlNodes(node: Node | null): void {
  if (node === null) return;
  if (isAlias(node) || node.tag !== undefined) {
    return fail("INVALID_STATE", "Stored product record uses unsupported YAML features.");
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

function parseStructured(value: Uint8Array): unknown {
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(value);
  } catch {
    return fail("INVALID_STATE", "Stored product record is not valid UTF-8 YAML.");
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
    return fail("INVALID_STATE", "Stored product record is malformed YAML.");
  }
  if (documents.length !== 1 || documents[0] === undefined || documents[0].errors.length > 0) {
    return fail("INVALID_STATE", "Stored product record must contain one valid YAML document.");
  }
  validateYamlNodes(documents[0].contents);
  try {
    return documents[0].toJS({ mapAsMap: false, maxAliasCount: 0 });
  } catch {
    return fail("INVALID_STATE", "Stored product record cannot be converted safely.");
  }
}

function containsInvalidUnicode(value: unknown): boolean {
  const pending: unknown[] = [value];
  const visited = new WeakSet<object>();
  while (pending.length > 0) {
    const current = pending.pop();
    if (typeof current === "string") {
      for (let index = 0; index < current.length; index += 1) {
        const unit = current.charCodeAt(index);
        if (unit >= 0xD800 && unit <= 0xDBFF) {
          const next = current.charCodeAt(index + 1);
          if (next < 0xDC00 || next > 0xDFFF) return true;
          index += 1;
        } else if (unit >= 0xDC00 && unit <= 0xDFFF) {
          return true;
        }
      }
    } else if (current !== null && typeof current === "object" && !visited.has(current)) {
      visited.add(current);
      pending.push(...Object.values(current as Record<string, unknown>));
    }
  }
  return false;
}

async function compileRegistryValidator(): Promise<RegistryValidator> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(new URL("../schemas/product.schema.json", import.meta.url), "utf8")) as unknown;
  } catch {
    return fail("INVALID_STATE", "Published product schema cannot be loaded safely.");
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return fail("INVALID_STATE", "Published product schema has an invalid root contract.");
  }
  const schema = parsed as { $id?: unknown; definitions?: unknown };
  if (typeof schema.$id !== "string" || schema.definitions === null || typeof schema.definitions !== "object") {
    return fail("INVALID_STATE", "Published product schema has an invalid root contract.");
  }
  try {
    const ajv = new Ajv({ allErrors: true, jsonPointers: true, strictKeywords: true });
    ajv.addSchema(schema);
    const validate = ajv.getSchema(`${schema.$id}#/definitions/Registry`);
    if (validate === undefined) return fail("INVALID_STATE", "Published product schema is missing Registry.");
    return { validate };
  } catch {
    return fail("INVALID_STATE", "Published product schema cannot validate Registry records.");
  }
}

async function validateRegistry(value: unknown): Promise<Registry> {
  registryValidator ??= compileRegistryValidator();
  const { validate } = await registryValidator;
  if (containsInvalidUnicode(value) || !validate(value)) {
    return fail("INVALID_STATE", "Stored product registry does not match the supported schema.");
  }
  return value as Registry;
}

function visitCanonicalJson(value: unknown, emit: (fragment: string) => void): void {
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) return fail("INVALID_STATE", "Product generation cannot be serialized deterministically.");
    emit(encoded);
    return;
  }
  if (Array.isArray(value)) {
    emit("[");
    value.forEach((nested, index) => {
      if (index > 0) emit(",");
      visitCanonicalJson(nested, emit);
    });
    emit("]");
    return;
  }
  if (typeof value === "object") {
    emit("{");
    Object.keys(value).sort().forEach((key, index) => {
      if (index > 0) emit(",");
      emit(JSON.stringify(key));
      emit(":");
      visitCanonicalJson((value as Record<string, unknown>)[key], emit);
    });
    emit("}");
    return;
  }
  return fail("INVALID_STATE", "Product generation cannot be serialized deterministically.");
}

function generationBytes(generation: Generation): Uint8Array {
  let byteLength = 0;
  const measure = (fragment: string): void => {
    const fragmentBytes = Buffer.byteLength(fragment, "utf8");
    if (fragmentBytes > MAX_SOURCE_BYTES - byteLength) {
      return fail("SOURCE_LIMIT", "Product source exceeds the 16 MiB limit.");
    }
    byteLength += fragmentBytes;
  };

  try {
    visitCanonicalJson(generation, measure);
    measure("\n");
    const serialized = Buffer.allocUnsafe(byteLength);
    let offset = 0;
    const write = (fragment: string): void => {
      offset += serialized.write(fragment, offset, "utf8");
    };
    visitCanonicalJson(generation, write);
    write("\n");
    if (offset !== byteLength) {
      return fail("INVALID_STATE", "Product generation cannot be serialized deterministically.");
    }
    return serialized;
  } catch (error) {
    return rethrowKnown(error, "Product generation cannot be serialized deterministically.");
  }
}

async function readGenerationMetadata(root: string, productId: string, digest: string): Promise<Generation> {
  const relativePath = generationRelativePath(productId, digest);
  const value = await readRelative(root, relativePath, digest);
  const parsed = parseStructured(value);
  const generation = await validateProductRecord("Generation", parsed) as Generation;
  if (generation.product_id !== productId) {
    return fail("SOURCE_CHANGED", "Retained generation belongs to a different product.");
  }
  return generation;
}

async function readSourcePin(root: string, pin: SourcePin): Promise<Uint8Array> {
  const pinnedGeneration = await readGenerationMetadata(root, pin.product_id, pin.generation);
  if (pin.source_kind === "markdown") {
    const registryBytes = await readObject(root, {
      productId: pin.product_id,
      kind: "record",
      sha256: pinnedGeneration.registry.object_sha256,
    });
    const registry = await validateRegistry(parseStructured(registryBytes));
    const document = registry.documents.find((candidate) => candidate.id === pin.source_id);
    if (
      registry.product_id !== pin.product_id
      || document === undefined
      || document.artifact !== pin.artifact
      || document.object_sha256 !== pin.object_sha256
    ) {
      return fail("SOURCE_CHANGED", "Source pin does not match its retained generation inventory.");
    }
    return readObject(root, {
      productId: pin.product_id,
      kind: "markdown",
      sha256: pin.object_sha256,
    });
  }

  if (pin.source_kind === "record") {
    if (
      pinnedGeneration.registry.id !== pin.source_id
      || pinnedGeneration.registry.object_sha256 !== pin.object_sha256
    ) {
      return fail("SOURCE_CHANGED", "Source pin does not match its retained generation inventory.");
    }
    return readObject(root, {
      productId: pin.product_id,
      kind: "record",
      sha256: pin.object_sha256,
    });
  }

  const reference = pin.decision_ref;
  if (
    reference === null
    || reference.product_id !== pin.product_id
    || reference.artifact !== pin.artifact
    || reference.id !== pin.source_id
  ) {
    return fail("SOURCE_CHANGED", "Decision source pin identity is inconsistent.");
  }
  const head = pinnedGeneration.decision_heads.find((candidate) => (
    candidate.decision_ref.product_id === reference.product_id
    && candidate.decision_ref.artifact === reference.artifact
    && candidate.decision_ref.id === reference.id
    && candidate.decision_ref.revision === reference.revision
  ));
  if (head === undefined || head.object_sha256 !== pin.object_sha256) {
    return fail("SOURCE_CHANGED", "Source pin does not match its retained generation inventory.");
  }
  const value = await readObject(root, {
    productId: pin.product_id,
    kind: "decision",
    sha256: pin.object_sha256,
    artifact: reference.artifact,
    decisionId: reference.id,
    revision: reference.revision,
  });
  const decision = await validateProductRecord("Decision", parseStructured(value)) as {
    readonly ref: DecisionReference;
  };
  if (
    decision.ref.product_id !== reference.product_id
    || decision.ref.artifact !== reference.artifact
    || decision.ref.id !== reference.id
    || decision.ref.revision !== reference.revision
  ) {
    return fail("SOURCE_CHANGED", "Retained decision bytes do not match the source pin.");
  }
  return value;
}

export async function verifySourcePin(root: string, pin: SourcePin): Promise<void> {
  await validateProductRecord("SourcePin", pin);
  await readSourcePin(root, pin);
}

async function verifyGenerationReferences(
  root: string,
  generation: Generation,
): Promise<Omit<LoadedGeneration, "sha256" | "generation">> {
  if (generation.parent !== null) {
    await readGenerationMetadata(root, generation.product_id, generation.parent);
  }

  const registryBytes = await readObject(root, {
    productId: generation.product_id,
    kind: "record",
    sha256: generation.registry.object_sha256,
  });
  const registry = await validateRegistry(parseStructured(registryBytes));
  if (registry.product_id !== generation.product_id) {
    return fail("SOURCE_CHANGED", "Retained registry belongs to a different product.");
  }

  const documentIds = new Set<string>();
  const documents: LoadedDocument[] = [];
  for (const document of registry.documents) {
    if (documentIds.has(document.id)) {
      return fail("INVALID_STATE", "Stored product registry contains duplicate document identities.");
    }
    documentIds.add(document.id);
    const value = await readObject(root, {
      productId: generation.product_id,
      kind: "markdown",
      sha256: document.object_sha256,
    });
    documents.push({ id: document.id, sha256: document.object_sha256, bytes: value });
  }

  const decisions: LoadedDecision[] = [];
  for (const head of generation.decision_heads) {
    const reference = head.decision_ref;
    const value = await readObject(root, {
      productId: reference.product_id,
      kind: "decision",
      sha256: head.object_sha256,
      artifact: reference.artifact,
      decisionId: reference.id,
      revision: reference.revision,
    });
    const decision = await validateProductRecord("Decision", parseStructured(value)) as {
      readonly ref: DecisionReference;
    };
    if (
      decision.ref.product_id !== reference.product_id
      || decision.ref.artifact !== reference.artifact
      || decision.ref.id !== reference.id
      || decision.ref.revision !== reference.revision
    ) {
      return fail("SOURCE_CHANGED", "Retained decision bytes do not match the referenced revision.");
    }
    decisions.push({ ref: reference, sha256: head.object_sha256, bytes: value });
  }

  const sourcePins: LoadedSourcePin[] = [];
  for (const ready of generation.ready_artifacts) {
    for (const pin of ready.upstream_pins) {
      const value = await readSourcePin(root, pin);
      sourcePins.push({ pin, bytes: value });
    }
  }

  return { registry: registryBytes, documents, decisions, sourcePins };
}

export async function saveGeneration(root: string, value: unknown): Promise<StoredGeneration> {
  const generation = await validateProductRecord("Generation", value) as Generation;
  const serialized = generationBytes(generation);
  await verifyGenerationReferences(root, generation);
  const digest = sha256(serialized);
  const relativePath = generationRelativePath(generation.product_id, digest);
  const reused = await saveImmutable(root, relativePath, serialized, digest);
  return { sha256: digest, relativePath, reused };
}

export async function loadGeneration(
  root: string,
  productId: string,
  digest: string,
): Promise<LoadedGeneration> {
  const generation = await readGenerationMetadata(root, productId, digest);
  const references = await verifyGenerationReferences(root, generation);
  return { sha256: digest, generation, ...references };
}
