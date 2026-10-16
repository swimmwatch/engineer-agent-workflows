import { createHash } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";

import { fail } from "../state.js";
import { parseProductDocument } from "./documents.js";
import { validateProductRecord } from "./schemas.js";
import { loadGeneration, verifySourcePin } from "./storage.js";
import type { LoadedGeneration, SourcePin } from "./storage.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/u;
const PURPOSES = new Set([
  "idea", "product-definition", "technical-design", "product-roadmap",
  "specification", "planning", "implementation", "review",
]);
const ARTIFACTS = new Set(["idea", "prd", "technical-design", "roadmap"]);
const GLOBAL_CONSTRAINT_TYPES = new Set(["PrdConstraint", "PrdRule", "TechnicalPolicy"]);
const MAX_CONTEXT_SOURCES = 10_000;
const MAX_GENERATIONS = 100_000;
export const PORTION_CODE_POINTS = 4096;

type Artifact = "idea" | "prd" | "technical-design" | "roadmap";
type Purpose = "idea" | "product-definition" | "technical-design" | "product-roadmap"
  | "specification" | "planning" | "implementation" | "review";

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

interface ProductContext {
  readonly contract: "product-1";
  readonly store_id: string | null;
  readonly product_id: string;
  readonly workspace_id: string | null;
  readonly candidate_ref: null;
  readonly selected_sources_sha256: string;
  readonly target_revision: string;
  readonly canonical_workspace: string;
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
  readonly applicability: { readonly global: boolean; readonly stage_refs: readonly Ref[] };
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

interface Relation {
  readonly from: Ref;
  readonly kind: "derived_from" | "constrains" | "depends_on" | "belongs_to" | "scheduled_in" | "implements" | "affects";
  readonly to: Ref;
}

interface DecisionRecord {
  readonly ref: DecisionRef;
  readonly state: string;
  readonly category: string;
  readonly text: string;
}

interface LoadedState {
  readonly context: ProductContext;
  readonly generation: LoadedGeneration;
  readonly registry: RegistryRecord;
  readonly relations: readonly Relation[];
  readonly documents: ReadonlyMap<string, LoadedGeneration["documents"][number]>;
  readonly elements: ReadonlyMap<string, {
    readonly metadata: ElementMetadata;
    readonly document: DocumentRecord;
    readonly title: string;
    readonly text: string;
  }>;
}

interface ContextSelection {
  readonly schema_version: 1;
  readonly kind: "context_selection";
  readonly product_id: string;
  readonly purpose: Purpose;
  readonly source_version: string;
  readonly required: readonly SourcePin[];
  readonly optional: readonly SourcePin[];
  readonly blockers: readonly string[];
  readonly complete: boolean;
  readonly next_cursor: string | null;
  readonly required_total: number;
  readonly optional_total: number;
}

interface PageItem {
  readonly ref: Ref | null;
  readonly decision_ref: DecisionRef | null;
  readonly document: DocumentRecord | null;
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

interface Portion {
  readonly pin: SourcePin;
  readonly text: string;
  readonly offset: number;
  readonly total_characters: number;
  readonly complete: boolean;
  readonly next_cursor: string | null;
}

export interface ProductContextOutcome<T> {
  readonly context: string;
  readonly result: T;
  readonly replayed: false;
  readonly operationRef: null;
}

interface ContextQuery {
  readonly purpose: Purpose;
  readonly task_id?: string;
  readonly artifact?: Artifact;
  readonly required_refs: readonly Ref[];
  readonly budget_bytes: number;
}

interface CursorPayload extends Record<string, unknown> {
  readonly kind: string;
  readonly context_digest: string;
  readonly source_version: string;
  readonly offset: number;
}

function digest(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function refKey(reference: Ref): string {
  return `${reference.product_id}:${reference.artifact}:${reference.element_id}`;
}

function pinKey(pin: SourcePin): string {
  const decision = pin.decision_ref === null ? "" : `${pin.decision_ref.id}:${pin.decision_ref.revision}`;
  return `${pin.product_id}:${pin.artifact}:${pin.source_kind}:${pin.source_id}:${pin.generation}:${pin.object_sha256}:${decision}`;
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
  if (record.contract !== "product-1"
    || typeof record.product_id !== "string" || !UUID_PATTERN.test(record.product_id)
    || !(record.store_id === null || (typeof record.store_id === "string" && UUID_PATTERN.test(record.store_id)))
    || !(record.workspace_id === null || (typeof record.workspace_id === "string" && UUID_PATTERN.test(record.workspace_id)))
    || record.candidate_ref !== null
    || typeof record.selected_sources_sha256 !== "string" || !DIGEST_PATTERN.test(record.selected_sources_sha256)
    || typeof record.target_revision !== "string" || !DIGEST_PATTERN.test(record.target_revision)
    || typeof record.canonical_workspace !== "string" || record.canonical_workspace.length === 0
    || record.canonical_workspace.length > 4096
    || Object.keys(record).some((key) => !allowed.has(key))) {
    return fail("INVALID_INPUT", "Product context must select one retained ready product revision.");
  }
  return parsed as ProductContext;
}

async function loadState(root: string, contextText: string): Promise<LoadedState> {
  const context = decodeContext(contextText);
  const generation = await loadGeneration(root, context.product_id, context.target_revision);
  const registry = parseJson(generation.registry, "Product registry") as RegistryRecord;
  if (registry.product_id !== context.product_id) return fail("SOURCE_CHANGED", "Product registry belongs to another product.");
  const relations = generation.generation.relations as readonly Relation[];
  const documents = new Map(generation.documents.map((document) => [document.id, document]));
  const elements = new Map<string, LoadedState["elements"] extends ReadonlyMap<string, infer V> ? V : never>();
  for (const document of registry.documents) {
    const loaded = documents.get(document.id);
    if (loaded === undefined || loaded.sha256 !== document.object_sha256) {
      return fail("SOURCE_CHANGED", "Product document inventory changed after selection.");
    }
    if (document.role !== "semantic") continue;
    const parsed = parseProductDocument(loaded.bytes);
    for (const element of parsed.elements) {
      const metadata = registry.element_metadata.find((entry) => entry.ref.product_id === registry.product_id
        && entry.ref.artifact === document.artifact && entry.ref.element_id === element.id);
      if (metadata === undefined) return fail("BROKEN_REFERENCE", "Product element is missing from registry metadata.");
      elements.set(refKey(metadata.ref), {
        metadata, document, title: element.title, text: parsed.source.slice(element.start, element.end),
      });
    }
  }
  return { context, generation, registry, relations, documents, elements };
}

export function encodeCursor(payload: CursorPayload): string {
  const query = payload.query as ContextQuery | undefined;
  const compact = {
    k: payload.kind,
    c: payload.context_digest,
    s: payload.source_version,
    o: payload.offset,
    ...(query === undefined ? {} : {
      q: {
        p: query.purpose,
        ...(query.task_id === undefined ? {} : { t: query.task_id }),
        ...(query.artifact === undefined ? {} : { a: query.artifact }),
        r: query.required_refs,
        b: query.budget_bytes,
      },
    }),
    ...(payload.identity === undefined ? {} : { i: payload.identity }),
    ...(payload.artifact === undefined ? {} : { a: payload.artifact }),
    ...(payload.text === undefined ? {} : { x: payload.text }),
    ...(payload.limit === undefined ? {} : { l: payload.limit }),
  };
  const serialized = Buffer.from(JSON.stringify(compact));
  const cursor = Buffer.concat([Buffer.from(digest(serialized).slice(0, 16), "hex"), deflateRawSync(serialized)]).toString("base64url");
  if (cursor.length > 8192) return fail("RESULT_LIMIT", "Product continuation cannot fit the published cursor limit.");
  return cursor;
}

export function decodeCursor(value: string, kind: string, context: string): CursorPayload {
  let payload: CursorPayload;
  try {
    const encoded = Buffer.from(value, "base64url");
    if (encoded.length <= 8) throw new Error();
    const checksum = encoded.subarray(0, 8).toString("hex");
    const serialized = inflateRawSync(encoded.subarray(8), { maxOutputLength: 64 * 1024 });
    if (digest(serialized).slice(0, 16) !== checksum) throw new Error();
    const compact = JSON.parse(serialized.toString("utf8")) as Record<string, unknown>;
    const query = compact.q as Record<string, unknown> | undefined;
    payload = {
      kind: compact.k,
      context_digest: compact.c,
      source_version: compact.s,
      offset: compact.o,
      ...(query === undefined ? {} : {
        query: {
          purpose: query.p,
          ...(query.t === undefined ? {} : { task_id: query.t }),
          ...(query.a === undefined ? {} : { artifact: query.a }),
          required_refs: query.r,
          budget_bytes: query.b,
        },
      }),
      ...(compact.i === undefined ? {} : { identity: compact.i }),
      ...(compact.a === undefined ? {} : { artifact: compact.a }),
      ...(compact.x === undefined ? {} : { text: compact.x }),
      ...(compact.l === undefined ? {} : { limit: compact.l }),
    } as CursorPayload;
  } catch {
    return fail("STALE_CURSOR", "Product continuation is invalid or stale.");
  }
  if (payload === null || typeof payload !== "object" || payload.kind !== kind
    || payload.context_digest !== digest(context) || !DIGEST_PATTERN.test(payload.source_version)
    || !Number.isSafeInteger(payload.offset) || payload.offset < 0) {
    return fail("STALE_CURSOR", "Product continuation is invalid or stale.");
  }
  return payload;
}

function assertSourceVersion(payload: CursorPayload, state: LoadedState): void {
  if (payload.source_version !== state.generation.sha256) {
    return fail("STALE_CURSOR", "Product continuation belongs to another source revision.");
  }
}

function documentPin(state: LoadedState, document: DocumentRecord, elementIds: readonly string[]): SourcePin {
  return {
    product_id: state.context.product_id,
    artifact: document.artifact,
    source_kind: "markdown",
    source_id: document.id,
    generation: state.generation.sha256,
    object_sha256: document.object_sha256,
    element_ids: [...elementIds],
    decision_ref: null,
  };
}

function sortedPins(pins: Iterable<SourcePin>): SourcePin[] {
  return [...pins].sort((left, right) => pinKey(left).localeCompare(pinKey(right))
    || JSON.stringify(left.element_ids).localeCompare(JSON.stringify(right.element_ids)));
}

function addPin(target: Map<string, SourcePin>, pin: SourcePin): void {
  const key = pinKey(pin);
  const existing = target.get(key);
  if (existing === undefined || pin.source_kind === "decision") {
    target.set(key, { ...pin, element_ids: [...pin.element_ids].sort() });
    return;
  }
  const elementIds = [...new Set([...existing.element_ids, ...pin.element_ids])].sort();
  if (elementIds.length > 1000) return fail("SOURCE_LIMIT", "One product source addresses too many selected elements.");
  target.set(key, { ...existing, element_ids: elementIds });
}

async function findDecisionPin(root: string, state: LoadedState, reference: DecisionRef): Promise<SourcePin> {
  if (reference.product_id !== state.context.product_id) return fail("BROKEN_REFERENCE", "Decision belongs to another product.");
  let generation: LoadedGeneration | null = state.generation;
  const visited = new Set<string>();
  while (generation !== null) {
    if (visited.size >= MAX_GENERATIONS || visited.has(generation.sha256)) {
      return fail("SOURCE_LIMIT", "Product generation lineage exceeds the supported bound.");
    }
    visited.add(generation.sha256);
    const head = generation.generation.decision_heads.find((candidate) => candidate.decision_ref.product_id === reference.product_id
      && candidate.decision_ref.artifact === reference.artifact && candidate.decision_ref.id === reference.id
      && candidate.decision_ref.revision === reference.revision);
    if (head !== undefined) {
      return {
        product_id: reference.product_id,
        artifact: reference.artifact,
        source_kind: "decision",
        source_id: reference.id,
        generation: generation.sha256,
        object_sha256: head.object_sha256,
        element_ids: [],
        decision_ref: reference,
      };
    }
    const parent: string | null = generation.generation.parent;
    generation = parent === null ? null : await loadGeneration(root, reference.product_id, parent);
  }
  return fail("NOT_FOUND", "Decision revision is not retained in the selected product lineage.");
}

function activeElement(state: LoadedState, reference: Ref): LoadedState["elements"] extends ReadonlyMap<string, infer V> ? V : never {
  const element = state.elements.get(refKey(reference));
  if (element === undefined || element.metadata.state !== "active") {
    return fail("BROKEN_REFERENCE", "Product element is missing, retired or foreign to the selected revision.");
  }
  return element;
}

async function collectContext(root: string, state: LoadedState, query: ContextQuery): Promise<{
  readonly required: readonly SourcePin[];
  readonly optional: readonly SourcePin[];
  readonly blockers: readonly string[];
}> {
  const selected = new Map<string, Ref>();
  const inheritedPins = new Map<string, SourcePin>();
  const blockers: string[] = [];
  const selectedArtifacts = new Set<Artifact>();

  if (query.task_id !== undefined) {
    const task = state.registry.element_metadata.find((metadata) => metadata.state === "active"
      && metadata.semantic_type === "Task" && metadata.ref.artifact === "roadmap"
      && metadata.ref.element_id === query.task_id);
    if (task === undefined) return fail("NOT_FOUND", "Selected product task is unavailable.");
    const pending = [task.ref, ...query.required_refs];
    while (pending.length > 0) {
      if (selected.size >= MAX_CONTEXT_SOURCES) return fail("SOURCE_LIMIT", "Product context closure exceeds the supported bound.");
      const reference = pending.shift()!;
      if (reference.product_id !== state.context.product_id) return fail("BROKEN_REFERENCE", "Context reference belongs to another product.");
      const key = refKey(reference);
      if (selected.has(key)) continue;
      activeElement(state, reference);
      selected.set(key, reference);
      selectedArtifacts.add(reference.artifact);
      for (const relation of state.relations) {
        if (refKey(relation.from) === key) pending.push(relation.to);
      }
    }
    for (const metadata of state.registry.element_metadata) {
      if (metadata.state === "active" && metadata.applicability.global
        && GLOBAL_CONSTRAINT_TYPES.has(metadata.semantic_type)) {
        selected.set(refKey(metadata.ref), metadata.ref);
        selectedArtifacts.add(metadata.ref.artifact);
      }
    }
  } else {
    const artifact = query.artifact!;
    const ready = state.generation.generation.ready_artifacts.find((candidate) => candidate.artifact === artifact);
    if (ready === undefined) blockers.push(`The selected ${artifact} artifact is not ready in this product revision.`);
    for (const metadata of state.registry.element_metadata) {
      if (metadata.state === "active" && metadata.ref.artifact === artifact) selected.set(refKey(metadata.ref), metadata.ref);
    }
    selectedArtifacts.add(artifact);
    for (const reference of query.required_refs) {
      activeElement(state, reference);
      selected.set(refKey(reference), reference);
      selectedArtifacts.add(reference.artifact);
    }
    const pendingPins = [...(ready?.upstream_pins ?? [])];
    const expanded = new Set<string>();
    while (pendingPins.length > 0) {
      if (inheritedPins.size >= MAX_CONTEXT_SOURCES) return fail("SOURCE_LIMIT", "Product context source closure exceeds the supported bound.");
      const pin = pendingPins.shift()!;
      const key = pinKey(pin);
      if (expanded.has(key)) continue;
      await verifySourcePin(root, pin);
      expanded.add(key);
      addPin(inheritedPins, pin);
      selectedArtifacts.add(pin.artifact);
      const generation = await loadGeneration(root, pin.product_id, pin.generation);
      const upstream = generation.generation.ready_artifacts.find((candidate) => candidate.artifact === pin.artifact)?.upstream_pins ?? [];
      pendingPins.push(...upstream);
    }
  }

  const grouped = new Map<string, { readonly document: DocumentRecord; readonly ids: string[] }>();
  const decisionRefs = new Map<string, DecisionRef>();
  for (const reference of selected.values()) {
    const element = activeElement(state, reference);
    const current = grouped.get(element.document.id) ?? { document: element.document, ids: [] };
    current.ids.push(reference.element_id);
    grouped.set(element.document.id, current);
    for (const decision of element.metadata.provenance) {
      decisionRefs.set(`${decision.product_id}:${decision.artifact}:${decision.id}:${decision.revision}`, decision);
    }
  }

  const required = new Map<string, SourcePin>(inheritedPins);
  for (const { document, ids } of grouped.values()) {
    const ordered = [...new Set(ids)].sort();
    for (let offset = 0; offset < ordered.length; offset += 1000) {
      addPin(required, documentPin(state, document, ordered.slice(offset, offset + 1000)));
    }
  }
  for (const reference of decisionRefs.values()) addPin(required, await findDecisionPin(root, state, reference));

  const optional = new Map<string, SourcePin>();
  for (const document of state.registry.documents) {
    if (document.role === "navigation" && selectedArtifacts.has(document.artifact)) {
      addPin(optional, documentPin(state, document, []));
    }
  }
  for (const key of required.keys()) optional.delete(key);
  return { required: sortedPins(required.values()), optional: sortedPins(optional.values()), blockers };
}

function contextQuery(input: {
  readonly purpose: Purpose;
  readonly taskId?: string;
  readonly artifact?: Artifact;
  readonly requiredRefs?: readonly Ref[];
  readonly budgetBytes?: number;
}): ContextQuery {
  if (!PURPOSES.has(input.purpose)) return fail("INVALID_INPUT", "Product context purpose is invalid.");
  const hasTask = input.taskId !== undefined;
  const hasArtifact = input.artifact !== undefined;
  if (hasTask === hasArtifact) return fail("INVALID_INPUT", "Product context requires exactly one task or artifact selector.");
  if (hasTask && !/^TASK-[0-9]{4,}$/u.test(input.taskId)) return fail("INVALID_INPUT", "Product task identity is invalid.");
  if (hasArtifact && !ARTIFACTS.has(input.artifact)) return fail("INVALID_INPUT", "Product artifact selector is invalid.");
  const budget = input.budgetBytes ?? 8192;
  if (!Number.isSafeInteger(budget) || budget < 1024 || budget > 16_384) return fail("INVALID_INPUT", "Product context budget is invalid.");
  return {
    purpose: input.purpose,
    ...(input.taskId === undefined ? {} : { task_id: input.taskId }),
    ...(input.artifact === undefined ? {} : { artifact: input.artifact }),
    required_refs: [...(input.requiredRefs ?? [])],
    budget_bytes: budget,
  };
}

function queryFromCursor(payload: CursorPayload): ContextQuery {
  const value = payload.query;
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return fail("STALE_CURSOR", "Product context continuation is invalid or stale.");
  }
  const record = value as Record<string, unknown>;
  return contextQuery({
    purpose: record.purpose as Purpose,
    ...(typeof record.task_id === "string" ? { taskId: record.task_id } : {}),
    ...(typeof record.artifact === "string" ? { artifact: record.artifact as Artifact } : {}),
    requiredRefs: Array.isArray(record.required_refs) ? record.required_refs as Ref[] : [],
    budgetBytes: Number(record.budget_bytes),
  });
}

function splitPinsForBudget(pins: readonly SourcePin[], budgetBytes: number): SourcePin[] {
  const result: SourcePin[] = [];
  for (const pin of pins) {
    if (pin.element_ids.length === 0) {
      if (Buffer.byteLength(JSON.stringify(pin)) > budgetBytes) {
        return fail("RESULT_LIMIT", "One product source pin exceeds the requested context budget.");
      }
      result.push(pin);
      continue;
    }
    let elementIds: string[] = [];
    for (const elementId of pin.element_ids) {
      const candidate = { ...pin, element_ids: [...elementIds, elementId] };
      if (Buffer.byteLength(JSON.stringify(candidate)) > budgetBytes) {
        if (elementIds.length === 0) return fail("RESULT_LIMIT", "One product source pin exceeds the requested context budget.");
        result.push({ ...pin, element_ids: elementIds });
        elementIds = [elementId];
      } else elementIds.push(elementId);
    }
    if (elementIds.length > 0) result.push({ ...pin, element_ids: elementIds });
  }
  return result;
}

function contextPage(
  state: LoadedState,
  contextText: string,
  query: ContextQuery,
  sources: { readonly required: readonly SourcePin[]; readonly optional: readonly SourcePin[]; readonly blockers: readonly string[] },
  offset: number,
): ContextSelection {
  const requiredSources = splitPinsForBudget(sources.required, query.budget_bytes);
  const optionalSources = splitPinsForBudget(sources.optional, query.budget_bytes);
  const all = [...requiredSources.map((pin) => ({ kind: "required" as const, pin })),
    ...optionalSources.map((pin) => ({ kind: "optional" as const, pin }))];
  if (offset > all.length) return fail("STALE_CURSOR", "Product context continuation is outside the selected source inventory.");
  const required: SourcePin[] = [];
  const optional: SourcePin[] = [];
  let next = offset;
  while (next < all.length) {
    const item = all[next]!;
    const nextOffset = next + 1;
    const hasMore = nextOffset < all.length;
    const cursor = hasMore ? encodeCursor({
      kind: "context", context_digest: digest(contextText), source_version: state.generation.sha256,
      offset: nextOffset, query,
    }) : null;
    const candidate = {
      schema_version: 1 as const,
      kind: "context_selection" as const,
      product_id: state.context.product_id,
      purpose: query.purpose,
      source_version: state.generation.sha256,
      required: item.kind === "required" ? [...required, item.pin] : required,
      optional: item.kind === "optional" ? [...optional, item.pin] : optional,
      blockers: sources.blockers,
      complete: !hasMore && sources.blockers.length === 0,
      next_cursor: cursor,
      required_total: requiredSources.length,
      optional_total: optionalSources.length,
    };
    if (Buffer.byteLength(JSON.stringify({ required: candidate.required, optional: candidate.optional })) > query.budget_bytes) break;
    if (item.kind === "required") required.push(item.pin);
    else optional.push(item.pin);
    next = nextOffset;
  }
  if (next === offset && next < all.length) return fail("RESULT_LIMIT", "Product context page cannot fit one selected source within its byte budget.");
  const hasMore = next < all.length;
  return {
    schema_version: 1,
    kind: "context_selection",
    product_id: state.context.product_id,
    purpose: query.purpose,
    source_version: state.generation.sha256,
    required,
    optional,
    blockers: sources.blockers,
    complete: !hasMore && sources.blockers.length === 0,
    next_cursor: hasMore ? encodeCursor({
      kind: "context", context_digest: digest(contextText), source_version: state.generation.sha256,
      offset: next, query,
    }) : null,
    required_total: requiredSources.length,
    optional_total: optionalSources.length,
  };
}

export async function prepareProductContext(input: {
  readonly root: string;
  readonly context: string;
  readonly purpose: Purpose;
  readonly taskId?: string;
  readonly artifact?: Artifact;
  readonly requiredRefs?: readonly Ref[];
  readonly budgetBytes?: number;
}): Promise<ProductContextOutcome<ContextSelection>> {
  const query = contextQuery(input);
  const state = await loadState(input.root, input.context);
  const sources = await collectContext(input.root, state, query);
  return { context: input.context, result: contextPage(state, input.context, query, sources, 0), replayed: false, operationRef: null };
}

export async function readContextPage(input: {
  readonly root: string;
  readonly context: string;
  readonly cursor: string;
}): Promise<ProductContextOutcome<ContextSelection>> {
  const payload = decodeCursor(input.cursor, "context", input.context);
  const state = await loadState(input.root, input.context);
  assertSourceVersion(payload, state);
  const query = queryFromCursor(payload);
  const sources = await collectContext(input.root, state, query);
  return {
    context: input.context,
    result: contextPage(state, input.context, query, sources, payload.offset),
    replayed: false,
    operationRef: null,
  };
}

function findQuery(payload: CursorPayload, artifact: Artifact | undefined, text: string | undefined, limit: number | undefined): {
  readonly artifact?: Artifact;
  readonly text?: string;
  readonly limit: number;
} {
  const storedArtifact = typeof payload.artifact === "string" ? payload.artifact as Artifact : undefined;
  const storedText = typeof payload.text === "string" ? payload.text : undefined;
  const storedLimit = Number(payload.limit);
  if ((artifact !== undefined && artifact !== storedArtifact) || (text !== undefined && text !== storedText)
    || (limit !== undefined && limit !== storedLimit) || !Number.isSafeInteger(storedLimit) || storedLimit < 1 || storedLimit > 50) {
    return fail("STALE_CURSOR", "Product search continuation belongs to another query.");
  }
  return { ...(storedArtifact === undefined ? {} : { artifact: storedArtifact }), ...(storedText === undefined ? {} : { text: storedText }), limit: storedLimit };
}

function pageResult(state: LoadedState, contextText: string, kind: string, items: readonly PageItem[], offset: number, limit: number, query: Record<string, unknown>): Page {
  if (offset > items.length) return fail("STALE_CURSOR", "Product search continuation is outside the current result.");
  const selected = items.slice(offset, offset + limit);
  const next = offset + selected.length;
  return {
    source_version: state.generation.sha256,
    items: selected,
    total: items.length,
    complete: next >= items.length,
    next_cursor: next >= items.length ? null : encodeCursor({
      kind, context_digest: digest(contextText), source_version: state.generation.sha256, offset: next, ...query,
    }),
  };
}

export async function findProductElements(input: {
  readonly root: string;
  readonly context: string;
  readonly artifact?: Artifact;
  readonly text?: string;
  readonly cursor?: string;
  readonly limit?: number;
}): Promise<ProductContextOutcome<Page>> {
  const payload = input.cursor === undefined ? null : decodeCursor(input.cursor, "element-find", input.context);
  const state = await loadState(input.root, input.context);
  if (payload !== null) assertSourceVersion(payload, state);
  const query = payload === null
    ? { ...(input.artifact === undefined ? {} : { artifact: input.artifact }), ...(input.text === undefined ? {} : { text: input.text }), limit: input.limit ?? 20 }
    : findQuery(payload, input.artifact, input.text, input.limit);
  if (query.limit < 1 || query.limit > 50 || !Number.isSafeInteger(query.limit)
    || (query.artifact !== undefined && !ARTIFACTS.has(query.artifact))
    || (query.text !== undefined && (query.text.length === 0 || query.text.length > 256))) {
    return fail("INVALID_INPUT", "Product element search parameters are invalid.");
  }
  const needle = query.text?.normalize("NFC").toLocaleLowerCase("en");
  const items = [...state.elements.values()]
    .filter((element) => element.metadata.state === "active"
      && (query.artifact === undefined || element.metadata.ref.artifact === query.artifact)
      && (needle === undefined || `${element.title}\n${element.text}`.normalize("NFC").toLocaleLowerCase("en").includes(needle)))
    .sort((left, right) => refKey(left.metadata.ref).localeCompare(refKey(right.metadata.ref)))
    .map((element): PageItem => ({
      ref: element.metadata.ref, decision_ref: null, document: element.document,
      product_id: state.context.product_id, title: element.title,
      state: element.metadata.state, reason: element.metadata.semantic_type, operation_ref: null,
    }));
  return {
    context: input.context,
    result: pageResult(state, input.context, "element-find", items, payload?.offset ?? 0, query.limit, query),
    replayed: false,
    operationRef: null,
  };
}

async function decisionRecord(bytes: Uint8Array, reference: DecisionRef): Promise<DecisionRecord> {
  const decision = await validateProductRecord("Decision", parseJson(bytes, "Product decision")) as DecisionRecord;
  if (decision.ref.product_id !== reference.product_id || decision.ref.artifact !== reference.artifact
    || decision.ref.id !== reference.id || decision.ref.revision !== reference.revision) {
    return fail("SOURCE_CHANGED", "Product decision bytes do not match their selected identity.");
  }
  return decision;
}

export async function findProductDecisions(input: {
  readonly root: string;
  readonly context: string;
  readonly artifact?: Artifact;
  readonly text?: string;
  readonly cursor?: string;
  readonly limit?: number;
}): Promise<ProductContextOutcome<Page>> {
  const payload = input.cursor === undefined ? null : decodeCursor(input.cursor, "decision-find", input.context);
  const state = await loadState(input.root, input.context);
  if (payload !== null) assertSourceVersion(payload, state);
  const query = payload === null
    ? { ...(input.artifact === undefined ? {} : { artifact: input.artifact }), ...(input.text === undefined ? {} : { text: input.text }), limit: input.limit ?? 20 }
    : findQuery(payload, input.artifact, input.text, input.limit);
  if (query.limit < 1 || query.limit > 50 || !Number.isSafeInteger(query.limit)
    || (query.artifact !== undefined && !ARTIFACTS.has(query.artifact))
    || (query.text !== undefined && (query.text.length === 0 || query.text.length > 256))) {
    return fail("INVALID_INPUT", "Product decision search parameters are invalid.");
  }
  const needle = query.text?.normalize("NFC").toLocaleLowerCase("en");
  const items: PageItem[] = [];
  for (const loaded of state.generation.decisions) {
    const decision = await decisionRecord(loaded.bytes, loaded.ref);
    const searchable = `${decision.category}\n${decision.text}`.normalize("NFC").toLocaleLowerCase("en");
    if ((query.artifact === undefined || decision.ref.artifact === query.artifact)
      && (needle === undefined || searchable.includes(needle))) {
      const title = decision.text.split(/\r?\n/u)[0]?.slice(0, 256).trim() || decision.category;
      items.push({
        ref: null, decision_ref: decision.ref, document: null, product_id: state.context.product_id,
        title, state: decision.state, reason: decision.category, operation_ref: null,
      });
    }
  }
  items.sort((left, right) => {
    const leftRef = left.decision_ref!;
    const rightRef = right.decision_ref!;
    return `${leftRef.artifact}:${leftRef.id}:${leftRef.revision}`.localeCompare(`${rightRef.artifact}:${rightRef.id}:${rightRef.revision}`);
  });
  return {
    context: input.context,
    result: pageResult(state, input.context, "decision-find", items, payload?.offset ?? 0, query.limit, query),
    replayed: false,
    operationRef: null,
  };
}

function portionCursor(contextText: string, state: LoadedState, identity: string, offset: number): string {
  return encodeCursor({
    kind: "portion", context_digest: digest(contextText), source_version: state.generation.sha256,
    offset, identity,
  });
}

function portion(state: LoadedState, contextText: string, pin: SourcePin, identity: string, source: string, cursor?: string): Portion {
  let offset = 0;
  if (cursor !== undefined) {
    const payload = decodeCursor(cursor, "portion", contextText);
    assertSourceVersion(payload, state);
    if (payload.identity !== identity) return fail("STALE_CURSOR", "Product source continuation belongs to another exact source.");
    offset = payload.offset;
  }
  const points = Array.from(source);
  if (offset > points.length) return fail("STALE_CURSOR", "Product source continuation is outside the selected source.");
  const text = points.slice(offset, offset + PORTION_CODE_POINTS).join("");
  const next = offset + Array.from(text).length;
  return {
    pin,
    text,
    offset,
    total_characters: points.length,
    complete: next >= points.length,
    next_cursor: next >= points.length ? null : portionCursor(contextText, state, identity, next),
  };
}

export async function readProductElement(input: {
  readonly root: string;
  readonly context: string;
  readonly elementRef: Ref;
  readonly pin: SourcePin;
  readonly cursor?: string;
}): Promise<ProductContextOutcome<Portion>> {
  const state = await loadState(input.root, input.context);
  if (input.elementRef.product_id !== state.context.product_id || input.pin.product_id !== input.elementRef.product_id
    || input.pin.artifact !== input.elementRef.artifact || input.pin.source_kind !== "markdown"
    || !input.pin.element_ids.includes(input.elementRef.element_id)) {
    return fail("BROKEN_REFERENCE", "Element source pin does not address the selected product element.");
  }
  await verifySourcePin(input.root, input.pin);
  const generation = input.pin.generation === state.generation.sha256
    ? state.generation
    : await loadGeneration(input.root, input.pin.product_id, input.pin.generation);
  const document = generation.documents.find((candidate) => candidate.id === input.pin.source_id
    && candidate.sha256 === input.pin.object_sha256);
  if (document === undefined) return fail("SOURCE_CHANGED", "Element source pin is missing from its retained generation.");
  const parsed = parseProductDocument(document.bytes);
  const element = parsed.elements.find((candidate) => candidate.id === input.elementRef.element_id);
  if (element === undefined) return fail("BROKEN_REFERENCE", "Pinned product element is unavailable.");
  const identity = digest(JSON.stringify({ ref: input.elementRef, pin: input.pin }));
  return {
    context: input.context,
    result: portion(state, input.context, input.pin, identity, parsed.source.slice(element.start, element.end), input.cursor),
    replayed: false,
    operationRef: null,
  };
}

export async function readProductDecision(input: {
  readonly root: string;
  readonly context: string;
  readonly decisionRef: DecisionRef;
  readonly cursor?: string;
}): Promise<ProductContextOutcome<Portion>> {
  const state = await loadState(input.root, input.context);
  const pin = await findDecisionPin(input.root, state, input.decisionRef);
  await verifySourcePin(input.root, pin);
  const generation = pin.generation === state.generation.sha256
    ? state.generation
    : await loadGeneration(input.root, pin.product_id, pin.generation);
  const decision = generation.decisions.find((candidate) => candidate.sha256 === pin.object_sha256
    && candidate.ref.product_id === input.decisionRef.product_id && candidate.ref.artifact === input.decisionRef.artifact
    && candidate.ref.id === input.decisionRef.id && candidate.ref.revision === input.decisionRef.revision);
  if (decision === undefined) return fail("SOURCE_CHANGED", "Decision source pin is missing from its retained generation.");
  await decisionRecord(decision.bytes, input.decisionRef);
  const source = new TextDecoder("utf-8", { fatal: true }).decode(decision.bytes);
  const identity = digest(JSON.stringify(input.decisionRef));
  return {
    context: input.context,
    result: portion(state, input.context, pin, identity, source, input.cursor),
    replayed: false,
    operationRef: null,
  };
}
