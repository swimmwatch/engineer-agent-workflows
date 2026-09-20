import { createHash, type Hash } from "node:crypto";
import { fromMarkdown } from "mdast-util-from-markdown";
import { z } from "zod";
import { tool } from "./api.js";
import { currentRecords, ref } from "./scope.js";
import { contextInput, decode, fail, hash, id, load, page, readDependency, result, text } from "./state.js";
import type { Context, Data } from "./state.js";

export interface Requirement {
  id: string; title: string; text: string; start_line: number; end_line: number; start_offset: number; end_offset: number;
}
export interface RequirementSource {
  content: string; version: string; status: string | null; requirements: Requirement[];
}

const PORTION_CODE_POINTS = 1024;
const PORTION_CACHE_ENTRIES = 16;
interface PortionProgress {
  unit_length: number;
  total_characters: number;
  offset: number;
  unit_offset: number;
  prefix_hash: string;
  hash_state: Hash;
}
const portionProgress = new Map<string, PortionProgress>();

function countCodePoints(value: string): number {
  let count = 0;
  for (let unit = 0; unit < value.length; count += 1) unit += value.codePointAt(unit)! > 0xffff ? 2 : 1;
  return count;
}

function unitOffsetAt(value: string, target: number, start = 0): number {
  let unit = start;
  for (let count = 0; count < target && unit < value.length; count += 1) unit += value.codePointAt(unit)! > 0xffff ? 2 : 1;
  return unit;
}

function cacheProgress(identity: string, progress: PortionProgress): void {
  portionProgress.delete(identity);
  portionProgress.set(identity, progress);
  while (portionProgress.size > PORTION_CACHE_ENTRIES) portionProgress.delete(portionProgress.keys().next().value!);
}

export async function requirementSource(context: Context, strict = true): Promise<RequirementSource> {
  const bytes = await readDependency(context, `docs/specs/${context.specification}/spec.md`);
  if (!bytes) fail("PREREQUISITE_REQUIRED", "The requirement source is missing.");
  const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  return parseRequirementContent(content, strict);
}
export function parseRequirementContent(content: string, strict = true): RequirementSource {
  const nodes = fromMarkdown(content).children;
  const requirements: Requirement[] = [];
  const seen = new Set<string>();
  let status: string | null = null, versionContent = content;
  for (const [index, node] of nodes.entries()) {
    const start = node.position?.start.offset, end = node.position?.end.offset;
    if (start === undefined || end === undefined) continue;
    const literal = content.slice(start, end);
    if (node.type === "paragraph" && /^Status: (Draft|Approved)$/.test(literal)) {
      if (strict && status !== null) fail("INVALID_SPECIFICATION", "Use one standalone specification status line.");
      status = literal.slice(8);
      versionContent = content.slice(0, start) + "Status: <review-status>" + content.slice(end);
    }
    if (node.type !== "heading" || node.depth !== 3) continue;
    const match = /^ {0,3}###[ \t]+([A-Za-z][A-Za-z0-9_-]*):[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/.exec(literal);
    if (!match) continue;
    const identifier = match[1]!, title = match[2]!;
    if (strict && seen.has(identifier)) fail("INVALID_SPECIFICATION", "Requirement definitions must have unique identifiers.", { requirement_id: identifier });
    seen.add(identifier);
    const next = nodes.slice(index + 1).find((n) => n.type === "heading" && n.depth <= 3);
    const blockEnd = next?.position?.start.offset ?? content.length;
    if (strict && !content.slice(end, blockEnd).trim()) fail("INVALID_SPECIFICATION", "A requirement needs a nonempty behavior contract.", { requirement_id: identifier });
    requirements.push({ id: identifier, title, text: content.slice(start, blockEnd), start_line: node.position!.start.line, end_line: next ? next.position!.start.line - 1 : content.split("\n").length, start_offset: start, end_offset: blockEnd });
  }
  return { content, version: hash(versionContent), status, requirements };
}

export function portion(value: string, identity: string, cursor?: string): Data {
  let offset = 0, unitOffset = 0, totalCharacters: number;
  let hashState = createHash("sha256");
  if (cursor) {
    let parsed: unknown;
    try { parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")); }
    catch { fail("INVALID_CURSOR", "Use the returned continuation unchanged."); }
    const check = z.object({ identity: z.string(), offset: z.number().int().nonnegative(), prefix_hash: z.string(), unit_offset: z.number().int().nonnegative().optional(), total_characters: z.number().int().nonnegative().optional() }).strict().safeParse(parsed);
    if (!check.success) fail("INVALID_CURSOR", "Use the returned continuation unchanged.");
    if (check.data.identity !== identity) fail("STALE_CURSOR", "The source or selection changed; restart its read.");
    offset = check.data.offset;
    const prefixHash = check.data.prefix_hash;
    const cached = portionProgress.get(identity);
    if (cached && cached.unit_length === value.length && cached.offset === offset && cached.prefix_hash === prefixHash
      && (check.data.unit_offset === undefined || check.data.unit_offset === cached.unit_offset)
      && (check.data.total_characters === undefined || check.data.total_characters === cached.total_characters)) {
      unitOffset = cached.unit_offset;
      totalCharacters = cached.total_characters;
      hashState = cached.hash_state.copy();
    } else {
      unitOffset = check.data.unit_offset ?? unitOffsetAt(value, offset);
      if (unitOffset > value.length || unitOffsetAt(value, offset) !== unitOffset || hash(value.slice(0, unitOffset)) !== prefixHash) fail("INVALID_CURSOR", "The continuation does not cover the preceding source portion.");
      totalCharacters = countCodePoints(value);
      if (check.data.total_characters !== undefined && check.data.total_characters !== totalCharacters) fail("STALE_CURSOR", "The source or selection changed; restart its read.");
      hashState.update(value.slice(0, unitOffset));
    }
  } else {
    totalCharacters = countCodePoints(value);
  }
  if (offset > totalCharacters) fail("INVALID_CURSOR", "The continuation is outside this source.");
  const remaining = totalCharacters - offset;
  const pageCharacters = Math.min(PORTION_CODE_POINTS, remaining);
  const next = offset + pageCharacters;
  const nextUnitOffset = unitOffsetAt(value, pageCharacters, unitOffset);
  const pageText = value.slice(unitOffset, nextUnitOffset);
  hashState.update(pageText);
  const nextPrefixHash = hashState.copy().digest("hex");
  cacheProgress(identity, { unit_length: value.length, total_characters: totalCharacters, offset: next, unit_offset: nextUnitOffset, prefix_hash: nextPrefixHash, hash_state: hashState.copy() });
  return { text: pageText, offset, total_characters: totalCharacters, complete: next === totalCharacters, next_cursor: next === totalCharacters ? null : Buffer.from(JSON.stringify({ identity, offset: next, unit_offset: nextUnitOffset, total_characters: totalCharacters, prefix_hash: nextPrefixHash })).toString("base64url") };
}

export async function requirementLinks(context: Context, identifier: string): Promise<Data[]> {
  return currentRecords((await load(context, "decisions")).value).filter((d) => Array.isArray(d.requirement_ids) && d.requirement_ids.includes(identifier)).map(ref);
}

export function mechanicalCoverage(source: RequirementSource, ledger: Data): Data[] {
  const decisions = currentRecords(ledger).filter((d) => d.id !== "scope.manifest");
  const defined = new Set(source.requirements.map((r) => r.id));
  const supported = new Set<string>();
  const issues: Data[] = [];
  for (const decision of decisions) {
    const links = Array.isArray(decision.requirement_ids) ? decision.requirement_ids as string[] : [];
    if (!links.length && !decision.context_reason) issues.push({ code: "UNLINKED_SOURCE", decision_ref: ref(decision) });
    for (const identifier of links) {
      if (!defined.has(identifier)) issues.push({ code: "BROKEN_REFERENCE", decision_ref: ref(decision), requirement_id: identifier });
      else supported.add(identifier);
    }
  }
  for (const identifier of defined) if (!supported.has(identifier)) issues.push({ code: "UNSUPPORTED_REQUIREMENT", requirement_id: identifier });
  return issues;
}

export const requirementTools = [
  tool("requirement_list", "List real Markdown requirement definitions in bounded, source-bound pages.", z.object({ ...contextInput, limit: z.number().int().min(1).max(50).default(20), cursor: text.optional() }).strict(), false, async (a) => {
    const context = decode(a.context), source = await requirementSource(context);
    const items = source.requirements.map(({ id, title, start_line, end_line }) => ({ id, title: Array.from(title).slice(0, 128).join(""), start_line, end_line }));
    return result(context, { source_version: source.version, ...page(items, a.cursor, a.limit, hash(JSON.stringify([context.project, context.specification, source.version, a.limit]))) });
  }),
  tool("requirement_get", "Read one exact requirement, its source location and decision references; follow every continuation.", z.object({ ...contextInput, requirement_id: id, source_version: z.string().regex(/^[a-f0-9]{64}$/).optional(), cursor: text.optional() }).strict(), false, async (a) => {
    const context = decode(a.context), source = await requirementSource(context);
    if (a.source_version && a.source_version !== source.version) fail("SOURCE_CHANGED", "The specification changed; refresh its requirement references.");
    const requirement = source.requirements.find((r) => r.id === a.requirement_id);
    if (!requirement) fail("BROKEN_REFERENCE", "No requirement definition has this identifier.", { requirement_id: a.requirement_id });
    const decisionRefs = await requirementLinks(context, requirement.id);
    const identity = hash(JSON.stringify([context.project, context.specification, source.version, requirement.id, decisionRefs]));
    let cursor: { identity: string; text_cursor?: string | undefined; refs_offset: number; text_done: boolean } = { identity, refs_offset: 0, text_done: false };
    if (a.cursor) {
      try { cursor = z.object({ identity: z.string(), text_cursor: z.string().optional(), refs_offset: z.number().int().nonnegative(), text_done: z.boolean() }).strict().parse(JSON.parse(Buffer.from(a.cursor, "base64url").toString("utf8"))); }
      catch { fail("INVALID_CURSOR", "Use the returned requirement continuation unchanged."); }
      if (cursor.identity !== identity) fail("STALE_CURSOR", "The requirement or its decision references changed.");
      if (cursor.refs_offset > decisionRefs.length) fail("INVALID_CURSOR", "The reference continuation is outside this requirement.");
    }
    const part = cursor.text_done ? { text: "", next_cursor: null, complete: true, total_characters: Array.from(requirement.text).length } : portion(requirement.text, identity, cursor.text_cursor);
    let nextRefs = cursor.refs_offset;
    while (nextRefs < decisionRefs.length && nextRefs - cursor.refs_offset < 10 && Buffer.byteLength(JSON.stringify(decisionRefs.slice(cursor.refs_offset, nextRefs + 1))) <= 4096) nextRefs++;
    const complete = part.complete === true && nextRefs === decisionRefs.length;
    const next = { identity, ...(part.next_cursor ? { text_cursor: part.next_cursor } : {}), refs_offset: nextRefs, text_done: part.complete };
    return result(context, { requirement_id: requirement.id, source_version: source.version, start_line: requirement.start_line, end_line: requirement.end_line, ...part, decision_refs: decisionRefs.slice(cursor.refs_offset, nextRefs), total_decision_refs: decisionRefs.length, complete, next_cursor: complete ? null : Buffer.from(JSON.stringify(next)).toString("base64url") });
  }),
];
