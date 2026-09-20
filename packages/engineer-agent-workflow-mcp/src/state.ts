import { constants } from "node:fs";
import { lstat, mkdir, open, readFile, realpath, rename, unlink } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { dirname, isAbsolute, join } from "node:path";
import Ajv from "ajv";
import { format } from "prettier";
import type { Options } from "prettier";
import { Document, isAlias, isMap, isNode, isScalar, isSeq, parseAllDocuments, visit } from "yaml";
import type { Node } from "yaml";
import { z } from "zod";
import { workflowConflictDiagnostics } from "./diagnostics.js";
import type { WorkflowConflictCause } from "./diagnostics.js";
import { parseLedger } from "./ledger.js";

export type Data = Record<string, unknown>;
export type Kind = "manifest" | "decisions" | "catalog" | "experience";
const unchangedMutation = Symbol("unchangedMutation");
interface UnchangedMutation { [unchangedMutation]: true; value: Data; }
const MAX_BYTES = 16 * 1024 * 1024;
export const slug = z.string().max(128).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const text = z.string().min(1).max(4096);
export const id = z.string().min(1).max(512);
export const texts = z.array(text).max(100);
export const contextInput = {
  context: z.string().min(1).max(8192).describe(
    "Opaque specification-workflow context returned by specification_open or the latest successful mutation; always use the newest returned value.",
  ),
};
const version = z.string().regex(/^[a-f0-9]{64}$/).nullable();
const contextSchema = z.object({ project: text, specification: slug, versions: z.object({ manifest: version, decisions: version, catalog: version, experience: version }).strict() }).strict();
const prettierOptions = z.object({
  printWidth: z.number().int().min(40).max(1000).optional(),
  tabWidth: z.number().int().min(1).max(16).optional(),
  useTabs: z.boolean().optional(),
  singleQuote: z.boolean().optional(),
  bracketSpacing: z.boolean().optional(),
  proseWrap: z.enum(["always", "never", "preserve"]).optional(),
  endOfLine: z.enum(["lf", "crlf", "cr", "auto"]).optional(),
}).strip();
export type Context = z.infer<typeof contextSchema>;
export class WorkflowError extends Error {
  constructor(readonly code: string, message: string, readonly details: Data = {}) { super(message); }
}
export function fail(code: string, message: string, details: Data = {}): never { throw new WorkflowError(code, message, details); }
export function obj(value: unknown): Data {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail("INVALID_STATE", "Expected a mapping.");
  return value as Data;
}
export function rows(value: unknown): Data[] {
  if (!Array.isArray(value)) fail("INVALID_STATE", "Expected a record list.");
  return value.map(obj);
}
export function strings(value: unknown): string[] { return z.array(z.string()).parse(value); }
export function hash(value: string | Uint8Array): string { return createHash("sha256").update(value).digest("hex"); }
export function page(items: unknown[], cursor: string | undefined, limit: number, identity: string): Data {
  let offset = 0;
  if (cursor) {
    let saved;
    try { saved = z.object({ identity: z.string(), offset: z.number().int().nonnegative() }).strict().parse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))); }
    catch { return fail("INVALID_CURSOR", "Cursor is not valid for this query."); }
    if (saved.identity !== identity) fail("STALE_CURSOR", "Query or source changed; restart this query.");
    offset = saved.offset;
    if (offset > items.length) fail("INVALID_CURSOR", "Cursor offset exceeds this query.");
  }
  const selected = items.slice(offset, offset + limit), next = offset + selected.length;
  return { items: selected, total: items.length, next_cursor: next < items.length ? Buffer.from(JSON.stringify({ identity, offset: next })).toString("base64url") : null };
}
export function decode(context: string): Context {
  try { return contextSchema.parse(JSON.parse(Buffer.from(context, "base64url").toString("utf8"))); }
  catch { return fail("INVALID_INPUT", "Open the specification to obtain a valid context."); }
}
function encode(context: Context): string { return Buffer.from(JSON.stringify(context)).toString("base64url"); }
export function artifactPath(kind: Kind, specification: string): string {
  if (kind === "catalog") return "design/system/catalog.yaml";
  if (kind === "experience") return `design/specs/${specification}/experience.yaml`;
  return `docs/specs/${specification}/${kind}.yaml`;
}
function missing(error: unknown): boolean { return error !== null && typeof error === "object" && "code" in error && error.code === "ENOENT"; }
export async function canonicalProject(project: string): Promise<string> {
  if (!isAbsolute(project)) fail("UNSAFE_PATH", "Project must be an absolute directory path.");
  const canonical = await realpath(project).catch(() => fail("NOT_FOUND", "Project directory is unavailable."));
  if (!(await lstat(canonical)).isDirectory()) fail("UNSAFE_PATH", "Project must be a directory.");
  return canonical;
}
export async function safePath(project: string, relative: string, create = false, directory = false): Promise<string> {
  const parts = relative.split("/");
  if (parts.some((p) => !p || p === "." || p === ".." || /[\\:]/u.test(p) || p.includes(String.fromCharCode(0))) || isAbsolute(relative)) fail("UNSAFE_PATH", "Artifact path is not permitted.");
  let current = project;
  for (const [index, part] of parts.entries()) {
    current = join(current, part);
    let stat;
    try { stat = await lstat(current); }
    catch (error) {
      if (!missing(error)) fail("UNSAFE_PATH", "Artifact path cannot be inspected.");
      if (create && (index < parts.length - 1 || directory)) {
        await mkdir(current).catch((e: unknown) => { if (!(e && typeof e === "object" && "code" in e && e.code === "EEXIST")) throw e; });
        stat = await lstat(current);
      } else continue;
    }
    if (stat.isSymbolicLink() || (index < parts.length - 1 || directory ? !stat.isDirectory() : !stat.isFile() || stat.nlink !== 1)) fail("UNSAFE_PATH", "Artifact path must contain only regular directories and a single-link file.");
  }
  return current;
}
export async function readBytes(project: string, relative: string): Promise<Buffer | null> {
  const path = await safePath(project, relative);
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = await handle.stat();
    if (!before.isFile() || before.nlink !== 1) fail("UNSAFE_PATH", "Artifact must be a regular single-link file.");
    if (before.size > MAX_BYTES) fail("SOURCE_LIMIT", "Artifact exceeds the 16 MiB limit.");
    const bytes = Buffer.alloc(before.size);
    let offset = 0;
    while (offset < bytes.length) { const read = await handle.read(bytes, offset, bytes.length - offset, offset); if (!read.bytesRead) fail("CONFLICT", "Artifact changed while being read.", { conflict_cause: "dependency_changed_during_read" }); offset += read.bytesRead; }
    const after = await handle.stat();
    if (before.size !== after.size || before.mtimeMs !== after.mtimeMs) fail("CONFLICT", "Artifact changed while being read.", { conflict_cause: "dependency_changed_during_read" });
    return bytes;
  } catch (error) { if (missing(error)) return null; throw error; }
  finally { await handle?.close(); }
}
const validators = new Map<Kind, Ajv.ValidateFunction>();
const readGuards = new WeakMap<Context, Map<string, string | null>>();
export async function readDependency(context: Context, relative: string): Promise<Buffer | null> {
  const bytes = await readBytes(context.project, relative), version = bytes ? hash(bytes) : null;
  const guards = readGuards.get(context);
  if (guards?.has(relative) && guards.get(relative) !== version) fail("CONFLICT", "A required source changed during this operation.", { conflict_cause: "dependency_changed_during_read" });
  guards?.set(relative, version);
  return bytes;
}
async function validate(kind: Kind, value: Data, specification: string): Promise<void> {
  let validator = validators.get(kind);
  if (!validator) {
    const schema: unknown = JSON.parse(await readFile(new URL(`./schemas/${kind}.schema.json`, import.meta.url), "utf8"));
    validator = new Ajv({ allErrors: true, jsonPointers: true }).compile(schema as object);
    validators.set(kind, validator);
  }
  if (!validator(value)) fail("INVALID_STATE", "Artifact does not match its supported schema.", { fields: validator.errors?.slice(0, 10).map((e) => ({ path: e.dataPath, rule: e.keyword })) });
  if (kind === "decisions") parseLedger(Buffer.from(String(new Document(value, { aliasDuplicateObjects: false }))), specification);
  if (kind === "manifest") {
    const profiles = rows(value.profiles);
    unique(profiles, "profiles");
    for (const output of strings(value.project_artifacts ?? [])) {
      if (!output.startsWith("design/system/") && !output.startsWith(`design/specs/${specification}/`)) fail("INVALID_STATE", "Design output must belong to the selected specification.");
      if (!profiles.some((p) => p.id === "ui" && p.state === "active")) fail("INVALID_STATE", "Design outputs require active UI scope.");
    }
  }
}
export function unique(records: Data[], collection: string): void {
  if (new Set(records.map((r) => r.id)).size !== records.length) fail("INVALID_STATE", "Duplicate entity identifiers.", { collection });
}
export function parseYaml(bytes: Buffer): Document {
  let source: string;
  try { source = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { return fail("INVALID_YAML", "Artifact is not valid UTF-8."); }
  const documents = parseAllDocuments(source, { merge: false, uniqueKeys: true, stringKeys: true, schema: "core", resolveKnownTags: false, prettyErrors: false });
  const document = documents[0];
  if (documents.length !== 1 || !document || document.errors.length) fail("INVALID_YAML", "Expected one valid YAML mapping document.");
  visit(document, (key, node) => { if (isAlias(node) || (isNode(node) && node.tag) || (key === "key" && isScalar(node) && node.value === "<<")) fail("INVALID_YAML", "Aliases, merge keys and explicit tags are not supported."); });
  return document;
}
export interface Snapshot { bytes: Buffer | null; version: string | null; document: Document; value: Data; }
export async function load(context: Context, kind: Kind): Promise<Snapshot> {
  const bytes = await readDependency(context, artifactPath(kind, context.specification));
  if (!bytes) return { bytes: null, version: null, document: new Document({}), value: {} };
  const document = parseYaml(bytes);
  const value = obj(document.toJS({ maxAliasCount: 0 }) as unknown);
  await validate(kind, value, context.specification);
  return { bytes, version: hash(bytes), document, value };
}
export async function refresh(context: Context, proposedManifest?: Data): Promise<Context> {
  const versions: Context["versions"] = { manifest: null, decisions: null, catalog: null, experience: null };
  const manifest = await load({ ...context }, "manifest");
  versions.manifest = manifest.version;
  const kinds: Kind[] = ["decisions"];
  const scope = proposedManifest ?? manifest.value;
  if (scope.confirmed === true && rows(scope.profiles).some((p) => p.id === "ui" && p.state === "active") && strings(scope.project_artifacts ?? []).length) kinds.push("catalog", "experience");
  for (const kind of kinds) { const bytes = await readDependency(context, artifactPath(kind, context.specification)); versions[kind] = bytes ? hash(bytes) : null; }
  return { ...context, versions };
}
export async function result(context: Context, value: Data, replayed = false): Promise<Data> {
  return { protocol_version: 2, context: encode(await refresh(context)), result: value, replayed };
}
export function unchanged(value: Data): UnchangedMutation { return { [unchangedMutation]: true, value }; }
function isUnchanged(value: Data | UnchangedMutation): value is UnchangedMutation { return unchangedMutation in value; }
async function verifyReadGuards(context: Context): Promise<void> {
  for (const [relative, expected] of readGuards.get(context) ?? []) {
    const current = await readBytes(context.project, relative);
    if ((current ? hash(current) : null) !== expected) {
      fail("CONFLICT", "A required source changed; no result was returned.", {
        conflict_cause: "dependency_changed_during_read",
      });
    }
  }
}
async function yamlFormattingOptions(context: Context): Promise<z.output<typeof prettierOptions> | null> {
  for (const candidate of [".prettierrc.json", ".prettierrc", ".prettierrc.yaml", ".prettierrc.yml"]) {
    const bytes = await readDependency(context, candidate);
    if (!bytes) continue;
    let parsed: unknown;
    try {
      parsed = candidate.endsWith(".json")
        ? JSON.parse(bytes.toString("utf8"))
        : parseYaml(bytes).toJS({ maxAliasCount: 0 });
    } catch {
      fail("INVALID_FORMATTER_CONFIG", "The declarative Prettier configuration is invalid; no workflow YAML was written.", { config: candidate });
    }
    const options = prettierOptions.safeParse(parsed);
    if (!options.success) fail("INVALID_FORMATTER_CONFIG", "The declarative Prettier configuration has unsupported YAML option values; no workflow YAML was written.", { config: candidate });
    return options.data;
  }
  const packageJson = await readDependency(context, "package.json");
  if (packageJson) {
    let configured: unknown;
    let packageRecord: Data | undefined;
    try {
      const parsed: unknown = JSON.parse(packageJson.toString("utf8"));
      packageRecord = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Data : undefined;
      configured = packageRecord?.prettier;
    }
    catch { configured = undefined; }
    if (configured !== undefined) {
      const options = prettierOptions.safeParse(configured);
      if (!options.success) fail("INVALID_FORMATTER_CONFIG", "The package Prettier configuration has unsupported YAML option values; no workflow YAML was written.", { config: "package.json" });
      return options.data;
    }
    const dependencies = packageRecord && packageRecord.dependencies && typeof packageRecord.dependencies === "object" && !Array.isArray(packageRecord.dependencies)
      ? packageRecord.dependencies as Data : {};
    const devDependencies = packageRecord && packageRecord.devDependencies && typeof packageRecord.devDependencies === "object" && !Array.isArray(packageRecord.devDependencies)
      ? packageRecord.devDependencies as Data : {};
    if (typeof dependencies.prettier === "string" || typeof devDependencies.prettier === "string") return {};
  }
  return null;
}
async function formatWorkflowYaml(context: Context, source: Buffer): Promise<Buffer> {
  try {
    const configured = await yamlFormattingOptions(context);
    if (configured === null) return source;
    const options = { ...Object.fromEntries(Object.entries(configured).filter((entry) => entry[1] !== undefined)), parser: "yaml" } as Options;
    return Buffer.from(await format(source.toString("utf8"), options));
  } catch (error) {
    if (error instanceof WorkflowError) throw error;
    return fail("INVALID_STATE", "Generated workflow YAML could not be formatted or validated.");
  }
}
function currentDecisionReference(value: Data, target: unknown): Data | undefined {
  if (!target || typeof target !== "object" || Array.isArray(target) || typeof (target as Data).id !== "string") return undefined;
  const candidates = Array.isArray(value.decisions)
    ? value.decisions.filter((record): record is Data => record !== null && typeof record === "object" && !Array.isArray(record) && (record as Data).id === (target as Data).id)
    : [];
  const current = candidates.sort((left, right) => Number(right.revision) - Number(left.revision))[0];
  return current ? { id: current.id, revision: current.revision } : undefined;
}
function conflictCause(error: WorkflowError): WorkflowConflictCause {
  return [
    "stale_context",
    "dependency_changed_during_read",
    "review_source_changed",
    "unknown",
  ].includes(String(error.details.conflict_cause))
    ? error.details.conflict_cause as WorkflowConflictCause
    : "unknown";
}

function conflictNextAction(cause: WorkflowConflictCause): "reopen_and_inspect_review" | "start_fresh_review" {
  return cause === "review_source_changed" ? "start_fresh_review" : "reopen_and_inspect_review";
}

async function enrichConflict(error: unknown, context: Context, kind: Kind, input: Data): Promise<unknown> {
  if (!(error instanceof WorkflowError) || error.code !== "CONFLICT" || Object.hasOwn(error.details, "current_context")) return error;
  const cause = conflictCause(error);
  const nextAction = conflictNextAction(cause);
  const existingEnvelope = error.details.details;
  const existingIssues = existingEnvelope && typeof existingEnvelope === "object" && !Array.isArray(existingEnvelope)
    && Array.isArray((existingEnvelope as Data).issues)
    ? rows((existingEnvelope as Data).issues)
    : [];
  try {
    const base = { ...context };
    const current = await refresh(base);
    const value = kind === "decisions" ? (await load(current, "decisions")).value : {};
    const requested = input.decision_ref;
    const currentReference = currentDecisionReference(value, requested);
    const batchReferences = Array.isArray(input.items)
      ? input.items.map((item) => currentDecisionReference(value, item && typeof item === "object" && !Array.isArray(item) ? (item as Data).decision_ref : undefined)).filter((item): item is Data => item !== undefined)
      : [];
    const reviewRef = typeof input.review_ref === "string" ? input.review_ref : undefined;
    const reviewState = value.specification_reviews;
    const reviewRuns = reviewState && typeof reviewState === "object" && !Array.isArray(reviewState)
      && Array.isArray((reviewState as Data).runs)
      ? (reviewState as Data).runs as unknown[]
      : [];
    const reviewRun = reviewRef
      ? reviewRuns.find((candidate) => (
        candidate !== null
        && typeof candidate === "object"
        && !Array.isArray(candidate)
        && (candidate as Data).id === reviewRef
      )) as Data | undefined
      : undefined;
    const diagnostics = workflowConflictDiagnostics({
      cause,
      nextAction,
      existingIssues,
      ...(reviewRun ? {
        review: {
          reviewRef: String(reviewRun.id),
          mode: reviewRun.followup ? "followup" : "full",
        },
      } : {}),
    });
    return new WorkflowError(error.code, error.message, {
      ...error.details,
      ...diagnostics,
      operation_applied: false,
      current_context: encode(current),
      ...(currentReference ? { current_decision_ref: currentReference } : {}),
      ...(batchReferences.length ? { current_decision_refs: batchReferences } : {}),
    });
  } catch {
    return new WorkflowError(error.code, error.message, {
      ...error.details,
      ...workflowConflictDiagnostics({
        cause: "unknown",
        nextAction: "reopen_and_inspect_review",
        existingIssues,
      }),
      operation_applied: false,
    });
  }
}
export async function readConsistent(contextText: string, read: (context: Context) => Promise<Data>): Promise<Data> {
  const context = decode(contextText);
  context.project = await canonicalProject(context.project);
  readGuards.set(context, new Map());
  let value: Data;
  try {
    value = await read(context);
    await verifyReadGuards(context);
  } catch (error) {
    if (!(error instanceof WorkflowError) || error.code !== "CONFLICT") throw error;
    const cause = conflictCause(error);
    throw new WorkflowError(error.code, error.message, {
      ...error.details,
      ...workflowConflictDiagnostics({
        cause,
        nextAction: conflictNextAction(cause),
      }),
    });
  }
  return result(context, value);
}
export async function openContext(project: string, specification: string): Promise<Context> {
  return refresh({ project: await canonicalProject(project), specification: slug.parse(specification), versions: { manifest: null, decisions: null, catalog: null, experience: null } });
}
function synchronize(document: Document, node: unknown, before: unknown, after: unknown): Node {
  if (JSON.stringify(before) === JSON.stringify(after) && isNode(node)) return node;
  if (isMap(node) && before && after && typeof before === "object" && typeof after === "object" && !Array.isArray(before) && !Array.isArray(after)) {
    const old = obj(before), next = obj(after);
    for (const key of Object.keys(old)) if (!Object.hasOwn(next, key)) node.delete(key);
    for (const [key, value] of Object.entries(next)) node.set(key, synchronize(document, node.get(key, true), old[key], value));
    return node;
  }
  if (isSeq(node) && Array.isArray(before) && Array.isArray(after)) {
    const key = (v: unknown): string => { if (v && typeof v === "object" && !Array.isArray(v) && "id" in v) { const r = obj(v); return JSON.stringify([r.id, r.revision ?? null]); } return JSON.stringify(v); };
    const old = new Map(before.map((v, i) => [key(v), { value: v as unknown, node: node.items[i] }]));
    node.items = after.map((v: unknown) => { const entry = old.get(key(v)); return synchronize(document, entry?.node, entry?.value, v); });
    return node;
  }
  const replacement = document.createNode(after, { aliasDuplicateObjects: false });
  if (isNode(node)) {
    if (node.comment !== undefined) replacement.comment = node.comment;
    if (node.commentBefore !== undefined) replacement.commentBefore = node.commentBefore;
    if (node.spaceBefore !== undefined) replacement.spaceBefore = node.spaceBefore;
  }
  return replacement;
}
export async function mutate(contextText: string, kind: Kind, operation: string, input: Data, change: (value: Data, context: Context) => Promise<Data | UnchangedMutation> | Data | UnchangedMutation, dependencies: Kind[] = []): Promise<Data> {
  const context = decode(contextText);
  context.project = await canonicalProject(context.project);
  readGuards.set(context, new Map());
  const relative = artifactPath(kind, context.specification);
  const path = await safePath(context.project, relative, true);
  const lockPath = kind === "catalog" || kind === "experience" ? join(context.project, "design", ".workflow-lock") : `${path}.workflow-lock`;
  let lock;
  try { lock = await open(lockPath, "wx", 0o600); } catch { return fail("BUSY", "Artifact is locked; reopen after the active write finishes. A crash lock requires explicit inspection."); }
  let temporary: string | undefined;
  try {
    const snapshot = await load(context, kind);
    const receiptId = hash(JSON.stringify({ operation, input }));
    const extension = obj(snapshot.value.extensions ?? {});
    const receipts = rows(extension.workflow_mcp_receipts ?? []);
    const previous = receipts.find((r) => r.id === receiptId);
    if (previous) return result(context, obj(previous.result), true);
    for (const checked of new Set([kind, ...dependencies])) {
      const current = checked === kind ? snapshot : await load(context, checked);
      if (current.version !== context.versions[checked]) {
        fail("CONFLICT", "Artifact changed; reopen the specification and reconcile before retrying.", {
          artifact: checked,
          conflict_cause: "stale_context",
        });
      }
    }
    const value = structuredClone(snapshot.value);
    const outcome = await change(value, context);
    if (isUnchanged(outcome)) {
      await verifyReadGuards(context);
      return result(context, outcome.value);
    }
    // Budget both the structured result and its escaped MCP text mirror before
    // installing bytes. A failed readback must never conceal a committed write.
    const preview = { protocol_version: 2, context: contextText, result: outcome, replayed: false };
    const previewText = JSON.stringify(preview);
    if (Buffer.byteLength(previewText) > 20 * 1024 || Buffer.byteLength(JSON.stringify({ content: [{ type: "text", text: previewText }], structuredContent: preview })) > 60 * 1024) fail("RESULT_LIMIT", "Scenario result would exceed the response budget; shorten this proposal or question.");
    const nextExtension = obj(value.extensions ?? {});
    value.extensions = { ...nextExtension, workflow_mcp_receipts: [...receipts, { id: receiptId, result: outcome }].slice(-64) };
    await validate(kind, value, context.specification);
    snapshot.document.contents = synchronize(snapshot.document, snapshot.document.contents, snapshot.value, value);
    const output = await formatWorkflowYaml(context, Buffer.from(snapshot.document.toString({ lineWidth: 0 })));
    if (output.length > MAX_BYTES) fail("SOURCE_LIMIT", "Updated artifact exceeds its size limit.");
    await validate(kind, obj(parseYaml(output).toJS({ maxAliasCount: 0 }) as unknown), context.specification);
    // Compute the complete next context while errors can still prevent commit.
    // Activating UI may expose unsafe design paths that were correctly inactive.
    const nextContext = await refresh(context, kind === "manifest" ? value : undefined);
    nextContext.versions[kind] = hash(output);
    temporary = join(dirname(path), `.workflow-${randomUUID()}.tmp`);
    const file = await open(temporary, "wx", snapshot.bytes ? (await lstat(path)).mode & 0o777 : 0o600);
    try { await file.writeFile(output); await file.sync(); } finally { await file.close(); }
    for (const checked of new Set([kind, ...dependencies])) {
      const current = await readBytes(context.project, artifactPath(checked, context.specification));
      if ((current ? hash(current) : null) !== context.versions[checked]) {
        fail("CONFLICT", "Artifact changed during the operation; no update was installed.", {
          artifact: checked,
          conflict_cause: "stale_context",
        });
      }
    }
    await verifyReadGuards(context);
    await safePath(context.project, relative);
    await rename(temporary, path);
    temporary = undefined;
    return { protocol_version: 2, context: encode(nextContext), result: outcome, replayed: false };
  } catch (error) {
    throw await enrichConflict(error, context, kind, input);
  } finally { if (temporary) await unlink(temporary).catch(() => undefined); await lock.close(); await unlink(lockPath); }
}
