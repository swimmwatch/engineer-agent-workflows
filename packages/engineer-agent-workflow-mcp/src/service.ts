import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";

import { z } from "zod";

import { findDecision, LedgerError, parseLedger, searchDecisions } from "./ledger.js";
import type { SearchFilters } from "./ledger.js";
import { catalogSources, readSource } from "./source.js";

const PROTOCOL_VERSION = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_CURSOR_LENGTH = 8192;
const MAX_RESULT_BYTES = 24 * 1024;
const MAX_TEXT_PORTION_CODE_POINTS = 4096;
const MAX_PREVIEW_CODE_POINTS = 256;

const projectSchema = z.string().min(1).max(4096);
const specificationSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u).max(128);
const cursorSchema = z.string().min(1).max(MAX_CURSOR_LENGTH);
const limitSchema = z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT);
const filterArraySchema = z.array(z.string().min(1).max(512)).max(100).optional();

const catalogInput = z.object({
  project: projectSchema,
  limit: limitSchema,
  cursor: cursorSchema.optional(),
}).strict();

const overviewInput = z.object({
  project: projectSchema,
  specification: specificationSchema,
}).strict();

const searchInput = z.object({
  project: projectSchema,
  specification: specificationSchema,
  ids: filterArraySchema,
  states: filterArraySchema,
  categories: filterArraySchema,
  requirement_ids: filterArraySchema,
  text: z.string().max(4096).optional(),
  history: z.boolean().default(false),
  limit: limitSchema,
  cursor: cursorSchema.optional(),
}).strict();

const getInput = z.object({
  project: projectSchema,
  specification: specificationSchema,
  id: z.string().min(1).max(512),
  revision: z.number().int().positive().safe().optional(),
  cursor: cursorSchema.optional(),
}).strict();

export const TOOL_DEFINITIONS = [
  { name: "decisions_catalog", description: "Directly list specifications with readable decision journals under one project; use specification_open for a managed workflow context.", inputSchema: catalogInput },
  { name: "decisions_overview", description: "Directly summarize revisions and current decisions for one project specification; use context-bearing decision tools inside a managed workflow.", inputSchema: overviewInput },
  { name: "decisions_search", description: "Directly search bounded decision metadata previews for one project specification; continue with its next_cursor when exhaustive results are required.", inputSchema: searchInput },
  { name: "decisions_get", description: "Directly read one project specification decision as exact JSON text portions; continue with its next_cursor until complete.", inputSchema: getInput },
] as const;

type Cursor = {
  readonly protocol_version: number;
  readonly operation: string;
  readonly project: string;
  readonly specification: string | null;
  readonly version: string;
  readonly query: string;
  readonly offset: number;
};

function invalidInput(): LedgerError {
  return new LedgerError("INVALID_INPUT", "Tool input does not match the required schema.");
}

function parseInput<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw invalidInput();
  }
  return parsed.data;
}

function stableValues(values: readonly string[] | undefined): readonly string[] | undefined {
  if (values === undefined) {
    return undefined;
  }
  return [...new Set(values)].sort();
}

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function queryDigest(query: string): string {
  return createHash("sha256").update(query, "utf8").digest("hex");
}

function projectCursorIdentity(project: string): string {
  return createHash("sha256").update(project, "utf8").digest("hex");
}

function decodeCursor(value: string): Cursor {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) {
    throw new LedgerError("INVALID_CURSOR", "Cursor is malformed.");
  }
  try {
    const decoded = Buffer.from(value, "base64url");
    if (decoded.toString("base64url") !== value || decoded.length > MAX_CURSOR_LENGTH) {
      throw new Error("invalid cursor encoding");
    }
    const parsed: unknown = JSON.parse(decoded.toString("utf8"));
    if (
      typeof parsed !== "object" || parsed === null || Array.isArray(parsed)
      || (parsed as Partial<Cursor>).protocol_version !== PROTOCOL_VERSION
      || typeof (parsed as Partial<Cursor>).operation !== "string"
      || typeof (parsed as Partial<Cursor>).project !== "string"
      || !((parsed as Partial<Cursor>).specification === null || typeof (parsed as Partial<Cursor>).specification === "string")
      || typeof (parsed as Partial<Cursor>).version !== "string"
      || typeof (parsed as Partial<Cursor>).query !== "string"
      || !Number.isSafeInteger((parsed as Partial<Cursor>).offset)
      || ((parsed as Partial<Cursor>).offset ?? -1) < 0
    ) {
      throw new Error("invalid cursor data");
    }
    return parsed as Cursor;
  } catch {
    throw new LedgerError("INVALID_CURSOR", "Cursor is malformed.");
  }
}

function assertCursor(cursor: Cursor | undefined, expected: Omit<Cursor, "offset">): number {
  if (cursor === undefined) {
    return 0;
  }
  if (cursor.version !== expected.version) {
    throw new LedgerError("STALE_CURSOR", "Cursor source version is stale.");
  }
  if (
    cursor.operation !== expected.operation
    || cursor.project !== expected.project
    || cursor.specification !== expected.specification
    || cursor.query !== expected.query
  ) {
    throw new LedgerError("INVALID_CURSOR", "Cursor does not match this request.");
  }
  return cursor.offset;
}

function jsonSize(value: Record<string, unknown>): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function boundedResult(result: Record<string, unknown>): Record<string, unknown> {
  if (jsonSize(result) > MAX_RESULT_BYTES) {
    throw new LedgerError("RESULT_LIMIT", "Tool result exceeds the structured result limit.");
  }
  return result;
}

function portion(value: string, offset: number, length: number): { text: string; complete: boolean; nextOffset: number } {
  const characters = Array.from(value);
  if (offset > characters.length) {
    throw new LedgerError("INVALID_CURSOR", "Cursor offset is invalid.");
  }
  const nextOffset = Math.min(offset + length, characters.length);
  return { text: characters.slice(offset, nextOffset).join(""), complete: nextOffset === characters.length, nextOffset };
}

function preview(value: unknown): { value: string | null; truncated: boolean } {
  if (value === null) {
    return { value: null, truncated: false };
  }
  if (typeof value !== "string") {
    return { value: null, truncated: false };
  }
  const text = portion(value, 0, MAX_PREVIEW_CODE_POINTS);
  return { value: text.text, truncated: !text.complete };
}

function answerPreview(value: unknown): { value: string | null; truncated: boolean } {
  if (value === null) {
    return preview(null);
  }
  if (typeof value !== "object" || value === null || Array.isArray(value) || !("text" in value)) {
    return preview(undefined);
  }
  return preview(value.text);
}

function recordSummary(decision: Record<string, unknown>): Record<string, unknown> {
  const answer = answerPreview(decision.answer);
  const metadata = { ...decision };
  delete metadata.answer;
  delete metadata.question;
  const metadataText = portion(JSON.stringify(metadata), 0, MAX_PREVIEW_CODE_POINTS);
  return {
    id: decision.id,
    revision: decision.revision,
    category: decision.category,
    state: decision.state,
    provenance: decision.provenance,
    answer_preview: answer.value,
    answer_truncated: answer.truncated,
    metadata_preview: metadataText.text,
    metadata_truncated: !metadataText.complete,
  };
}

async function catalog(raw: unknown): Promise<Record<string, unknown>> {
  const input = parseInput(catalogInput, raw);
  const source = await catalogSources(input.project);
  const query = queryDigest(JSON.stringify({ limit: input.limit }));
  const offset = assertCursor(input.cursor === undefined ? undefined : decodeCursor(input.cursor), {
    protocol_version: PROTOCOL_VERSION,
    operation: "decisions_catalog",
    project: projectCursorIdentity(source.project),
    specification: null,
    version: source.version,
    query,
  });
  if (offset > source.items.length) {
    throw new LedgerError("INVALID_CURSOR", "Cursor offset is invalid.");
  }
  const items = source.items.slice(offset, offset + input.limit);
  const complete = offset + items.length === source.items.length;
  return boundedResult({
    protocol_version: PROTOCOL_VERSION,
    version: source.version,
    items,
    total: source.items.length,
    complete,
    next_cursor: complete ? null : encodeCursor({ protocol_version: PROTOCOL_VERSION, operation: "decisions_catalog", project: projectCursorIdentity(source.project), specification: null, version: source.version, query, offset: offset + items.length }),
  });
}

async function overview(raw: unknown): Promise<Record<string, unknown>> {
  const input = parseInput(overviewInput, raw);
  const source = await readSource(input.project, input.specification);
  const ledger = parseLedger(source.bytes, input.specification);
  const states: Record<string, number> = Object.create(null) as Record<string, number>;
  for (const decision of ledger.current) {
    states[decision.state] = (states[decision.state] ?? 0) + 1;
  }
  return boundedResult({
    protocol_version: PROTOCOL_VERSION,
    version: ledger.version,
    revisions: ledger.decisions.length,
    current: ledger.current.length,
    retired: ledger.decisions.length - ledger.current.length,
    states,
    warning_counts: ledger.warningCounts,
    complete: true,
    next_cursor: null,
  });
}

async function search(raw: unknown): Promise<Record<string, unknown>> {
  const input = parseInput(searchInput, raw);
  const source = await readSource(input.project, input.specification);
  const ledger = parseLedger(source.bytes, input.specification);
  const ids = stableValues(input.ids);
  const states = stableValues(input.states);
  const categories = stableValues(input.categories);
  const requirementIds = stableValues(input.requirement_ids);
  const filters = {
    ...(ids === undefined ? {} : { ids }),
    ...(states === undefined ? {} : { states }),
    ...(categories === undefined ? {} : { categories }),
    ...(requirementIds === undefined ? {} : { requirement_ids: requirementIds }),
    ...(input.text === undefined ? {} : { text: input.text }),
    history: input.history,
  } satisfies SearchFilters;
  const query = queryDigest(JSON.stringify(filters));
  const offset = assertCursor(input.cursor === undefined ? undefined : decodeCursor(input.cursor), {
    protocol_version: PROTOCOL_VERSION,
    operation: "decisions_search",
    project: projectCursorIdentity(source.project),
    specification: input.specification,
    version: ledger.version,
    query,
  });
  const matches = searchDecisions(ledger, filters).map((decision) => decision as Record<string, unknown>);
  if (offset > matches.length) {
    throw new LedgerError("INVALID_CURSOR", "Cursor offset is invalid.");
  }
  const items = matches.slice(offset, offset + input.limit).map(recordSummary);
  const complete = offset + items.length === matches.length;
  return boundedResult({
    protocol_version: PROTOCOL_VERSION,
    version: ledger.version,
    items,
    total: matches.length,
    complete,
    next_cursor: complete ? null : encodeCursor({ protocol_version: PROTOCOL_VERSION, operation: "decisions_search", project: projectCursorIdentity(source.project), specification: input.specification, version: ledger.version, query, offset: offset + items.length }),
  });
}

async function get(raw: unknown): Promise<Record<string, unknown>> {
  const input = parseInput(getInput, raw);
  const source = await readSource(input.project, input.specification);
  const ledger = parseLedger(source.bytes, input.specification);
  const query = queryDigest(JSON.stringify({ id: input.id, revision: input.revision ?? null }));
  const offset = assertCursor(input.cursor === undefined ? undefined : decodeCursor(input.cursor), {
    protocol_version: PROTOCOL_VERSION,
    operation: "decisions_get",
    project: projectCursorIdentity(source.project),
    specification: input.specification,
    version: ledger.version,
    query,
  });
  const decision = findDecision(ledger, input.id, input.revision) as Record<string, unknown>;
  const text = JSON.stringify(decision);
  const part = portion(text, offset, MAX_TEXT_PORTION_CODE_POINTS);
  return boundedResult({
    protocol_version: PROTOCOL_VERSION,
    version: ledger.version,
    id: decision.id,
    revision: decision.revision,
    text: part.text,
    offset,
    total_characters: Array.from(text).length,
    complete: part.complete,
    next_cursor: part.complete ? null : encodeCursor({ protocol_version: PROTOCOL_VERSION, operation: "decisions_get", project: projectCursorIdentity(source.project), specification: input.specification, version: ledger.version, query, offset: part.nextOffset }),
  });
}

export async function executeTool(name: string, args: unknown): Promise<Record<string, unknown>> {
  try {
    switch (name) {
      case "decisions_catalog": return await catalog(args);
      case "decisions_overview": return await overview(args);
      case "decisions_search": return await search(args);
      case "decisions_get": return await get(args);
      default: throw invalidInput();
    }
  } catch (error) {
    if (error instanceof LedgerError) {
      throw error;
    }
    throw new LedgerError("INTERNAL_ERROR", "Decision service failed unexpectedly.");
  }
}
