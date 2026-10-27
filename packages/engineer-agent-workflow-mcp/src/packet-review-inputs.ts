import { constants } from "node:fs";
import { lstat, readlink, realpath } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { posix, relative, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmTable } from "micromark-extension-gfm-table";
import { gfmTableFromMarkdown } from "mdast-util-gfm-table";
import { z } from "zod";
import { snapshot } from "./review-model.js";
import { requirementSource } from "./requirements.js";
import { specificationState } from "./checks.js";
import { checkPlanningPacket, currentPlanningDecisions } from "./planning.js";
import { productTools } from "./product/tools.js";
import { boundedSuccessResult } from "./response-budget.js";
import { mutatePacketReviewState, readPacketReviewState } from "./packet-review-state.js";
import { canonicalProject, decode, fail, hash, load, obj, readConsistent, readDependency, result as stateResult, rows, safePath, strings, WorkflowError } from "./state.js";
import type { Context, Data } from "./state.js";

const execute = promisify(execFile);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const identifier = z.string().min(1).max(128);
const pathInput = z.string().min(1).max(4096).refine(path => !path.startsWith("/") && !path.includes("\\")
  && !path.split("/").some(part => !part || part === "." || part === "..") && !/[\0\r\n:]/u.test(path));
const gitRef = z.string().min(1).max(512).refine(ref => !ref.startsWith("-") && !/[\0\r\n]/u.test(ref));
const reference = z.object({ id: z.string().min(1).max(512), revision: z.number().int().positive() }).strict();
const productBinding = z.object({ task_id: z.string().regex(/^TASK-[0-9]{4,}$/), packet_id: z.string().regex(/^P[0-9]{2,}$/) }).strict();
export const packetReviewSelection = z.object({
  operation_id: identifier.describe("Client-generated identity for an exact safe preparation retry; omit only for a fresh run.").optional(),
  mode: z.enum(["committed", "working_tree", "staged", "empty_baseline"]), baseline_ref: gitRef,
  target_ref: gitRef.optional(), paths: z.array(pathInput).min(1).max(512), shared_paths: z.array(pathInput).max(512).default([]),
  packets: z.array(z.object({ packet_id: identifier, path: pathInput, paths: z.array(pathInput).max(512).optional(),
    agreement_ref: reference.optional(), proposal_digest: digest.optional(), product: productBinding.optional() }).strict()).min(1).max(20),
  intent: z.enum(["auto", "normal", "diagnostic"]).default("auto"),
  host_limits: z.object({ max_packets: z.number().int().positive().max(20).optional(), max_units: z.number().int().positive().max(128).optional(),
    unit_input_bytes: z.number().int().min(128).max(32768).optional(), actor_input_bytes: z.number().int().min(128).max(65536).optional(),
    actor_result_bytes: z.number().int().min(128).max(16384).optional(), response_bytes: z.number().int().min(128).max(16384).optional(),
    overhead_bytes: z.number().int().nonnegative().max(8192).optional() }).strict().optional(),
}).strict();
type Selection = z.output<typeof packetReviewSelection>;
type Packet = Selection["packets"][number];
type Node = { type: string; value?: string; children?: Node[]; depth?: number; position?: { start: { line: number; offset?: number }; end: { line: number; offset?: number } } };
interface Limits { max_packets: number; max_units: number; unit_input_bytes: number; actor_input_bytes: number; actor_result_bytes: number; response_bytes: number; overhead_bytes: number; }
interface Original { key: string; path: string; side: string; bytes: Buffer; encoding: string; text: string; file_mode: string; start_line: number; end_line: number; packet_ids: string[]; }
interface Collected { binding: { source_version: string; behavioral_source_version: string; specification_version: string }; selection: Data; originals: Original[];
  units: Data[]; criteria: Data[]; packetInputs: Data[]; issues: string[]; mode: string; limits: Limits; changes: Map<string, Data>; }
const defaults: Limits = { max_packets: 20, max_units: 128, unit_input_bytes: 32768, actor_input_bytes: 65536, actor_result_bytes: 16384, response_bytes: 8192, overhead_bytes: 1024 };
function canonical(value: unknown): string { return JSON.stringify(value); }
function token(value: Data): string { return Buffer.from(canonical(value)).toString("base64url"); }
function owner(context: Context): string { return hash(canonical([context.project, context.specification])); }
function fitsResponse(envelope: Data, result: Data, limits: Limits): boolean {
  const wire = boundedSuccessResult({ ...envelope, result });
  return wire !== null && Buffer.byteLength(JSON.stringify(wire)) <= limits.response_bytes - limits.overhead_bytes;
}
function parseToken(value: string): Data {
  try { return obj(JSON.parse(Buffer.from(value, "base64url").toString("utf8"))); }
  catch { return fail("INVALID_INPUT", "Use an exact returned review reference."); }
}
function limitsFor(selection: Selection): Limits {
  const limits: Limits = { ...defaults };
  for (const [key, value] of Object.entries(selection.host_limits ?? {})) if (value !== undefined) limits[key as keyof Limits] = value;
  if (limits.response_bytes <= limits.overhead_bytes + 64 || limits.actor_input_bytes < limits.unit_input_bytes) {
    fail("PREREQUISITE_MISSING", "Advertise usable response and actor headroom before preparing this review.");
  }
  return limits;
}
function protectPath(path: string): void {
  pathInput.parse(path);
  if (path.split("/").some(part => part === ".git" || part === ".ssh") || /(?:^|\/)(?:\.env(?:\..*)?|\.npmrc|id_rsa|id_ed25519|credentials[^/]*|manifest\.yaml|decisions\.yaml|catalog\.yaml|experience\.yaml)$/iu.test(path)) {
    fail("UNSAFE_PATH", "This path is not an allowed review original; use its owning scenario or a safe reference.");
  }
}
async function git(project: string, args: string[], binary = false): Promise<Buffer> {
  try {
    const result = await execute("git", ["--no-optional-locks", "-c", "core.fsmonitor=false", "-c", "core.hooksPath=/dev/null", "--literal-pathspecs", "-C", project, ...args], {
      encoding: "buffer", maxBuffer: 16 * 1024 * 1024, timeout: 15000,
      env: { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_"))), GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_TERMINAL_PROMPT: "0" },
    });
    return result.stdout;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") fail("PREREQUISITE_MISSING", "Git is unavailable; restore the required runner without initializing the project.");
    if (code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") fail("SOURCE_LIMIT", "Git input exceeds the bounded observation budget; narrow the selection.");
    return fail(binary ? "SOURCE_CHANGED" : "INVALID_INPUT", "Git input is unavailable or invalid; inspect the explicit selection before retrying.");
  }
}
async function resolveCommit(project: string, ref: string): Promise<string> {
  gitRef.parse(ref);
  const oid = (await git(project, ["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`])).toString().trim();
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(oid)) fail("INVALID_INPUT", "Git did not resolve a commit identity.");
  return oid;
}
async function treeEntry(root: string, ref: string, path: string, index = false): Promise<{ bytes: Buffer; mode: string } | undefined> {
  const output = (await git(root, index ? ["ls-files", "--stage", "-z", "--", path] : ["ls-tree", "-z", ref, "--", path])).toString();
  const entries = output.split("\0").filter(Boolean);
  if (entries.length > 1) fail("INVALID_INPUT", "Select exact files and resolve unmerged index entries first.");
  if (!entries.length) return undefined;
  const entry = entries[0]!;
  const metadata = entry.slice(0, entry.indexOf("\t")).split(" ");
  if (index && metadata[2] !== "0") fail("INVALID_INPUT", "Resolve the selected unmerged index entry first.");
  const mode = metadata[0]!;
  const oid = metadata[index ? 1 : 2]!;
  if (!["100644", "100755", "120000"].includes(mode) || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(oid)) {
    fail("PREREQUISITE_MISSING", "Selected trees, submodules and unsupported file kinds need an explicit inspectable file selection.");
  }
  return { bytes: await git(root, ["cat-file", "blob", oid], true), mode };
}
async function diskEntry(context: Context, path: string): Promise<{ bytes: Buffer; mode: string } | undefined> {
  // Validate parents separately so a final symlink is read as link evidence only.
  const parent = posix.dirname(path);
  if (parent !== ".") await safePath(context.project, parent, false, true);
  const absolute = `${context.project}/${path}`;
  let stat;
  try { stat = await lstat(absolute); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw error; }
  if (stat.isSymbolicLink()) return { bytes: Buffer.from(await readlink(absolute)), mode: "120000" };
  if (!stat.isFile() || stat.nlink !== 1) fail("UNSAFE_PATH", "Selected evidence must be a regular single-link file or a final symlink.");
  const bytes = await readDependency(context, path);
  if (!bytes) fail("SOURCE_CHANGED", "Selected file disappeared during observation.");
  return { bytes, mode: stat.mode & constants.S_IXUSR ? "100755" : "100644" };
}
function textOf(node: Node): string { return node.value ?? (node.children ?? []).map(textOf).join(" "); }
function markdown(text: string): Node { return fromMarkdown(text, { extensions: [gfmTable()], mdastExtensions: [gfmTableFromMarkdown()] }) as Node; }
function location(original: Original): Data {
  return { path: original.path, source_digest: hash(original.bytes), start_line: original.start_line, end_line: original.end_line, file_mode: original.file_mode };
}
function original(path: string, side: string, bytes: Buffer, mode: string, packetIds: string[], start = 1): Original {
  let text: string;
  let encoding = "utf8";
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { text = bytes.toString("base64"); encoding = "base64"; }
  const end = start + Math.max(0, text.split("\n").length - (text.endsWith("\n") ? 2 : 1));
  const key = hash(canonical([path, side, hash(bytes), mode, start, end]));
  return { key, path, side, bytes, file_mode: mode, packet_ids: packetIds, text, encoding, start_line: start, end_line: end };
}
function partition(source: Original, budget: number): Original[] {
  if (Buffer.byteLength(source.text) <= budget) return [source];
  if (source.encoding !== "utf8") fail("SOURCE_LIMIT", "An indivisible binary original exceeds the unit budget; select a reviewable representation.");
  const lines = source.text.match(/[^\n]*\n|[^\n]+$/gu) ?? [];
  const parts: Original[] = [];
  let text = "", start = source.start_line, line = start;
  for (const value of lines) {
    if (Buffer.byteLength(value) > budget) fail("SOURCE_LIMIT", "An indivisible source line or obligation exceeds the unit budget; split its governing input explicitly.");
    if (text && Buffer.byteLength(text + value) > budget) {
      parts.push(original(source.path, source.side, Buffer.from(text), source.file_mode, source.packet_ids, start));
      text = ""; start = line;
    }
    text += value; line++;
  }
  if (text) parts.push(original(source.path, source.side, Buffer.from(text), source.file_mode, source.packet_ids, start));
  return parts;
}
function mergeOriginals(sources: Original[]): Original[] {
  const byKey = new Map<string, Original>();
  for (const source of sources) {
    const prior = byKey.get(source.key);
    if (prior) prior.packet_ids = [...new Set([...prior.packet_ids, ...source.packet_ids])];
    else byKey.set(source.key, { ...source, packet_ids: [...source.packet_ids] });
  }
  return [...byKey.values()];
}
function criterionSources(packet: Packet, text: string, issues: string[]): { id: string; source: Original }[] {
  const nodes = markdown(text).children ?? [];
  const candidates: { id: string; source: Original }[] = [];
  let active = false;
  for (const node of nodes) {
    if (node.type === "heading") { active = /acceptance|criteria|verification|критери|при[её]мк/iu.test(textOf(node)); continue; }
    if (!active) continue;
    const entries = node.type === "table" ? (node.children ?? []).slice(1) : node.type === "list" ? node.children ?? [] : node.type === "paragraph" ? [node] : [];
    for (const entry of entries) {
      const start = entry.position?.start.offset, end = entry.position?.end.offset;
      if (start === undefined || end === undefined) continue;
      const explicit = node.type === "table" ? textOf(entry.children?.[0] ?? entry).trim() : "";
      const id = explicit || `${packet.packet_id}:line:${entry.position!.start.line}`;
      if (id.length > 512) { issues.push(`Criterion identifier too long in packet ${packet.packet_id}.`); continue; }
      candidates.push({ id, source: original(packet.path, "criterion", Buffer.from(text.slice(start, end)), "100644", [packet.packet_id], entry.position!.start.line) });
    }
  }
  return candidates;
}
async function productRead(name: string, input: Data): Promise<Data> {
  const scenario = productTools.find(tool => tool.name === name);
  if (!scenario || scenario.write) fail("CAPABILITY_MISSING", "The required read-only product scenario is unavailable.");
  return scenario.run(input);
}
async function productOriginals(project: string, packet: Packet, issues: string[]): Promise<Original[]> {
  if (!packet.product) return [];
  const opened = await productRead("product_open", { workspace: project });
  if (obj(opened.result).state !== "bound" || typeof opened.context !== "string") { issues.push(`Product binding unavailable for ${packet.packet_id}.`); return []; }
  const context = opened.context;
  let response = await productRead("product_context_prepare", { context, purpose: "implementation", task_id: packet.product.task_id, packet_id: packet.product.packet_id });
  const pins: Data[] = [];
  let nextCursor: unknown;
  do {
    const result = obj(response.result);
    pins.push(...rows(result.required));
    if (result.complete !== (result.next_cursor === null) || (result.complete && pins.length !== result.required_total)) {
      fail("EVIDENCE_INCOMPLETE", "Product context delivery is incomplete; consume its exact continuation before review.");
    }
    issues.push(...strings(result.blockers).map(reason => `Product input ${packet.packet_id}: ${reason}`));
    nextCursor = result.next_cursor;
    if (typeof nextCursor === "string") response = await productRead("product_context_next", { context, cursor: nextCursor });
  } while (typeof nextCursor === "string");
  const originals: Original[] = [];
  for (const pin of pins) {
    const requests = pin.source_kind === "decision" ? [{ decision_ref: pin.decision_ref }] : strings(pin.element_ids).map(element_id => ({ element_ref: { product_id: pin.product_id, artifact: pin.artifact, element_id }, pin }));
    for (const request of requests) {
      let cursor;
      let text = "";
      do {
        const response = await productRead("product_sources_get_batch", { context, requests: [{ ...request, ...(cursor ? { cursor } : {}) }] });
        const result = obj(response.result);
        if (result.next_cursor || rows(result.items).length !== 1) fail("EVIDENCE_INCOMPLETE", "Product source delivery is incomplete.");
        const portion = obj(rows(result.items)[0]!.portion);
        text += String(portion.text);
        cursor = portion.next_cursor;
        if (Boolean(portion.complete) === Boolean(cursor)) fail("EVIDENCE_INCOMPLETE", "Product portion completion is inconsistent.");
      } while (cursor);
      const identity = hash(canonical([pin, request]));
      originals.push(original(`product/${identity}.txt`, "product", Buffer.from(text), "100644", [packet.packet_id]));
    }
  }
  return originals;
}
async function collect(context: Context, input: Selection, pinned?: Data, signal?: AbortSignal): Promise<Collected> {
  signal?.throwIfAborted();
  const limits = limitsFor(input);
  if (input.packets.length > limits.max_packets) fail("SOURCE_LIMIT", "Selected packet count exceeds effective host policy; split the group.");
  if (new Set(input.paths).size !== input.paths.length || new Set(input.packets.map(packet => packet.packet_id)).size !== input.packets.length
    || new Set(input.packets.map(packet => packet.path)).size !== input.packets.length) fail("INVALID_INPUT", "Selected paths and packet identities must be unique.");
  for (const path of [...input.paths, ...input.shared_paths]) protectPath(path);
  if (input.shared_paths.some(path => !input.paths.includes(path)) || input.packets.some(packet => packet.paths?.some(path => !input.paths.includes(path)))) {
    fail("INVALID_INPUT", "Packet and shared attribution must use only the explicitly selected paths.");
  }
  const root = await realpath((await git(context.project, ["rev-parse", "--show-toplevel"])).toString().trim());
  const prefix = relative(root, context.project).split(sep).join("/");
  if (prefix.startsWith("..")) fail("UNSAFE_PATH", "Project is outside the selected Git worktree.");
  const rootPath = (path: string) => prefix ? `${prefix}/${path}` : path;
  if (input.mode === "committed" && !input.target_ref) fail("INVALID_INPUT", "Committed selection requires an explicit target ref.");
  if (input.mode !== "committed" && input.target_ref !== undefined && input.target_ref !== (input.mode === "staged" ? "INDEX" : "WORKTREE")) fail("INVALID_INPUT", "Target ref does not match the explicitly selected comparison mode.");
  if (input.mode === "empty_baseline" && input.baseline_ref !== "EMPTY") fail("INVALID_INPUT", "An empty baseline must be selected explicitly as EMPTY.");
  const baseOid = input.mode === "empty_baseline" ? undefined : typeof pinned?.baseline_oid === "string" ? pinned.baseline_oid : await resolveCommit(root, input.baseline_ref);
  const targetOid = input.mode === "committed" ? typeof pinned?.target_oid === "string" ? pinned.target_oid : await resolveCommit(root, input.target_ref!) : undefined;
  const originals: Original[] = [];
  const changes = new Map<string, Data>();
  const indexEntries: unknown[] = [];
  const targetEntries: unknown[] = [];
  const attributes: unknown[] = [];
  for (const path of input.paths) {
    signal?.throwIfAborted();
    const owners = input.shared_paths.includes(path) ? input.packets.map(packet => packet.packet_id) : input.packets.filter(packet => packet.paths ? packet.paths.includes(path) : input.packets.length === 1).map(packet => packet.packet_id);
    if (!owners.length || (owners.length > 1 && !input.shared_paths.includes(path))) fail("INVALID_INPUT", "Attribute overlapping group changes explicitly with packet paths or shared_paths.");
    const baseline = baseOid ? await treeEntry(root, baseOid, rootPath(path)) : undefined;
    const index = input.mode === "committed" ? undefined : await treeEntry(root, "", rootPath(path), true);
    const target = targetOid ? await treeEntry(root, targetOid, rootPath(path)) : input.mode === "staged" ? index : await diskEntry(context, path);
    if (!baseline && !target) fail("NOT_FOUND", "A selected path has no baseline or target evidence.");
    if (baseline) originals.push(original(path, "baseline", baseline.bytes, baseline.mode, owners));
    if (target) originals.push(original(path, "target", target.bytes, target.mode, owners));
    changes.set(path, { status: !baseline ? "A" : !target ? "D" : hash(baseline.bytes) !== hash(target.bytes) || baseline.mode !== target.mode ? "M" : "unchanged" });
    indexEntries.push([path, index ? hash(index.bytes) : null, index?.mode ?? null]);
    targetEntries.push([path, target ? hash(target.bytes) : null, target?.mode ?? null]);
    const dirs = path.split("/").slice(0, -1);
    for (let depth = 0; depth <= dirs.length; depth++) {
      signal?.throwIfAborted();
      const attr = [...dirs.slice(0, depth), ".gitattributes"].join("/");
      const before = baseOid ? await treeEntry(root, baseOid, rootPath(attr)) : undefined;
      const after = targetOid ? await treeEntry(root, targetOid, rootPath(attr)) : input.mode === "staged" ? await treeEntry(root, "", rootPath(attr), true) : await diskEntry(context, attr);
      attributes.push([attr, before ? hash(before.bytes) : null, before?.mode ?? null, after ? hash(after.bytes) : null, after?.mode ?? null]);
      if (before) originals.push(original(attr, "attribute:baseline", before.bytes, before.mode, owners));
      if (after) originals.push(original(attr, "attribute:target", after.bytes, after.mode, owners));
    }
  }
  if (baseOid) {
    const comparison = targetOid ? [baseOid, targetOid] : input.mode === "staged" ? ["--cached", baseOid] : [baseOid];
    const fields = (await git(root, ["diff", "--no-ext-diff", "--no-textconv", "--find-renames", "--name-status", "-z", ...comparison, "--", ...input.paths.map(rootPath)])).toString().split("\0");
    for (let index = 0; fields[index];) {
      const status = fields[index++]!;
      const oldPath = fields[index++]!;
      const newPath = /^[RC]/u.test(status) ? fields[index++]! : oldPath;
      const local = (path: string) => prefix ? path.slice(prefix.length + 1) : path;
      const value = { status, ...(newPath !== oldPath ? { old_path: local(oldPath) } : {}) };
      changes.set(local(oldPath), value); changes.set(local(newPath), value);
    }
  }
  const issues: string[] = [];
  let behavioral = hash("unavailable behavioral source");
  let specVersion: string;
  let requirement: Awaited<ReturnType<typeof requirementSource>> | undefined;
  let manifest: Data = {};
  let ledger: Data;
  try {
    const state = await specificationState(context, undefined, false);
    if (state.status !== "pass" || state.document_status !== "approved" || state.coverage_status !== "reviewed") issues.push("Current Approved and reviewed specification evidence is unavailable.");
    const s = await snapshot(context);
    behavioral = s.version; specVersion = s.source.version; requirement = s.source; manifest = s.manifest; ledger = s.ledger;
  } catch (error) {
    if (!(error instanceof WorkflowError) || ["INVALID_STATE", "INVALID_YAML", "UNSAFE_PATH", "SOURCE_LIMIT"].includes(error.code)) throw error;
    issues.push("Specification inputs are missing or unverified.");
    ledger = (await load(context, "decisions")).value;
    const specBytes = await readDependency(context, `docs/specs/${context.specification}/spec.md`);
    specVersion = hash(specBytes ?? Buffer.from("unavailable specification"));
    try { requirement = await requirementSource(context); } catch { /* Missing or undecodable originals remain diagnostic and byte-bound. */ }
  }
  const packetInputs: Data[] = [];
  const candidateRows: { id: string; source: Original; packet: string }[] = [];
  for (const packet of input.packets) {
    signal?.throwIfAborted();
    if (!packet.path.startsWith(`docs/specs/${context.specification}/tasks/`) || !packet.path.endsWith(".md")) fail("UNSAFE_PATH", "Packet must belong to the selected specification's tasks directory.");
    protectPath(packet.path);
    const bytes = await readDependency(context, packet.path);
    const packetIssues: string[] = [];
    if (!bytes) packetIssues.push(`Packet ${packet.packet_id} is unavailable.`);
    let ready: Data = {};
    try { ready = await checkPlanningPacket(context, packet.packet_id, packet.agreement_ref, packet.proposal_digest); }
    catch (error) { if (!(error instanceof WorkflowError) || error.code === "INVALID_STATE") throw error; packetIssues.push(`Agreement for ${packet.packet_id} is unavailable.`); }
    if (ready.status !== "ready") packetIssues.push(`Agreement for ${packet.packet_id} is not current.`);
    const question = currentPlanningDecisions(ledger).find(record => record.id === packet.agreement_ref?.id);
    const proposal = rows(question?.proposals ?? []).find(record => record.id === ready.proposal_id && record.packet_id === packet.packet_id);
    if (ready.status === "ready" && (!proposal || !rows(proposal.sources).some(source => source.path === packet.path))) packetIssues.push(`Packet ${packet.packet_id} is not an accepted proposal source.`);
    const requirementIds = proposal ? strings(proposal.requirement_ids) : [];
    if (bytes) {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      originals.push(original(packet.path, "packet", bytes, "100644", [packet.packet_id]));
      for (const row of criterionSources(packet, text, packetIssues)) candidateRows.push({ ...row, packet: packet.packet_id });
    }
    for (const requirementId of requirementIds) {
      const selected = requirement?.requirements.find(row => row.id === requirementId);
      if (!selected || !requirement) { packetIssues.push(`Requirement ${requirementId} is unavailable.`); continue; }
      const text = requirement.content.slice(selected.start_offset, selected.end_offset);
      originals.push(original(`docs/specs/${context.specification}/spec.md`, `requirement:${requirementId}`, Buffer.from(text), "100644", [packet.packet_id], selected.start_line));
    }
    try { originals.push(...await productOriginals(context.project, packet, packetIssues)); }
    catch (error) { if (!(error instanceof WorkflowError) || error.code === "CAPABILITY_MISSING") throw error; packetIssues.push(`Product inputs for ${packet.packet_id} are unavailable or stale.`); }
    packetInputs.push({ packet_id: packet.packet_id, path: packet.path, packet_digest: hash(bytes ?? Buffer.from("unavailable")), requirement_ids: requirementIds,
      contract_refs: [], ...(packet.agreement_ref ? { agreement_ref: packet.agreement_ref } : {}), ...(packet.proposal_digest ? { proposal_digest: packet.proposal_digest } : {}),
      input_status: !bytes ? "missing" : packetIssues.length ? "unverifiable" : "current", issues: packetIssues });
    issues.push(...packetIssues);
  }
  for (const path of [...strings(manifest.planning_artifacts ?? []).map(path => `docs/specs/${context.specification}/${path}`), "AGENTS.md", `docs/specs/${context.specification}/tasks/plan.md`]) {
    protectPath(path);
    const bytes = await readDependency(context, path);
    if (bytes) {
      const source = original(path, "constraint", bytes, "100644", input.packets.map(packet => packet.packet_id));
      originals.push(source);
      for (const packet of packetInputs) (packet.contract_refs as Data[]).push(location(source));
    } else if (path.includes("/contracts/")) issues.push(`Declared contract ${path} is unavailable.`);
  }
  const counts = new Map<string, number>();
  for (const row of candidateRows) counts.set(row.id, (counts.get(row.id) ?? 0) + 1);
  const criteria: Data[] = candidateRows.map(row => ({ criterion_id: counts.get(row.id)! > 1 ? `${row.packet}:${row.id}:${row.source.start_line}` : row.id,
    packet_id: row.packet, location: location(row.source), implementation: "unverifiable", test_sufficiency: "unverifiable", required_history: "unverifiable", required_check: "not_run",
    explanation: `Draft obligation: ${row.source.text}`, evidence_refs: [], assessment_refs: [] }));
  const sourceBudget = Math.min(limits.unit_input_bytes, limits.actor_input_bytes);
  for (const row of candidateRows) {
    if (Buffer.byteLength(row.source.text) > sourceBudget || row.source.text.length > 4000) fail("SOURCE_LIMIT", "An indivisible criterion exceeds the supported obligation budget; split it explicitly.");
    originals.push(row.source);
  }
  const isCommon = (source: Original) => !["baseline", "target", "criterion"].includes(source.side) && !source.path.includes("/contracts/");
  const commonSources = mergeOriginals(originals.filter(isCommon));
  const parts = originals.flatMap(source => {
    if (!["baseline", "target", "criterion"].includes(source.side)) return partition(source, sourceBudget);
    const commonBytes = commonSources.filter(common => common.packet_ids.some(id => source.packet_ids.includes(id))).reduce((sum, common) => sum + Buffer.byteLength(common.text), 0);
    const available = Math.min(sourceBudget, limits.actor_input_bytes - commonBytes);
    if (available < 1 || (source.side === "criterion" && Buffer.byteLength(source.text) > available)) fail("ACTOR_INPUT_LIMIT", "An obligation and its common constraints exceed actor headroom; narrow the explicit input.");
    return partition(source, available);
  });
  const packetOrder = input.packets.map(packet => packet.packet_id);
  const uniqueParts = mergeOriginals(parts).sort((left, right) => packetOrder.indexOf(left.packet_ids[0]!) - packetOrder.indexOf(right.packet_ids[0]!) || (left.key < right.key ? -1 : left.key > right.key ? 1 : 0));
  if (uniqueParts.length > limits.max_units) fail("SOURCE_LIMIT", "Selected originals exceed the effective unit count; split the explicit selection.");
  const selection: Data = { mode: input.mode, baseline_ref: input.baseline_ref, target_ref: input.target_ref ?? (input.mode === "staged" ? "INDEX" : "WORKTREE"), paths: input.paths,
    ...(baseOid ? { baseline_oid: baseOid } : {}), ...(targetOid ? { target_oid: targetOid } : {}), effective_digest: hash(canonical(targetEntries)), attributes_digest: hash(canonical(attributes)),
    ...(input.mode === "committed" ? {} : { index_digest: hash(canonical(indexEntries)), index_differs: canonical(indexEntries) !== canonical(targetEntries) }) };
  const common = uniqueParts.filter(isCommon);
  const layouts = uniqueParts.map(source => ({ unit_id: `unit-${source.key}`, packet_ids: source.packet_ids,
    criterion_ids: source.side === "criterion" ? criteria.filter(row => source.packet_ids.includes(String(row.packet_id)) && canonical(row.location) === canonical(location(source))).map(row => row.criterion_id) : [],
    source_refs: [location(source)], shared_constraint_refs: ["baseline", "target", "criterion"].includes(source.side)
      ? common.filter(constraint => constraint.packet_ids.some(id => source.packet_ids.includes(id))).map(source => `unit-${source.key}`) : [],
    depends_on_units: ["baseline", "target", "criterion"].includes(source.side)
      ? uniqueParts.filter(part => part.path.includes("/contracts/") && part.packet_ids.some(id => source.packet_ids.includes(id))).map(part => `unit-${part.key}`) : [],
    original_bytes: Buffer.byteLength(source.text) }));
  const sourceVersion = hash(canonical([owner(context), selection, behavioral, specVersion, packetInputs, criteria, layouts, uniqueParts.map(source => [source.key, source.packet_ids]), [...changes.entries()]]));
  const units = layouts.map(unit => ({ ...unit, source_version: sourceVersion }));
  if (input.intent === "diagnostic") issues.push("Diagnostic review explicitly requested.");
  if (input.intent === "normal" && issues.length) fail("PREREQUISITE_MISSING", "Normal review inputs are not current; restore them or explicitly choose diagnostic/auto intent.");
  return { binding: { source_version: sourceVersion, behavioral_source_version: behavioral, specification_version: specVersion }, selection, originals: uniqueParts,
    units, criteria, packetInputs, issues, mode: issues.length ? "diagnostic" : "normal", limits, changes };
}
function runReference(context: Context, runId: string, version: string): string { return token({ owner: owner(context), run_id: runId, source_version: version }); }
export async function preparePacketReviewInputs(contextText: string, selection: Selection, signal?: AbortSignal): Promise<Data> {
  signal?.throwIfAborted();
  const input = packetReviewSelection.parse(selection);
  const context = decode(contextText); context.project = await canonicalProject(context.project);
  const prepared = await collect(context, input, undefined, signal);
  signal?.throwIfAborted();
  const runId = input.operation_id ? hash(canonical([owner(context), input.operation_id])) : randomUUID();
  const runRef = runReference(context, runId, prepared.binding.source_version);
  const products = input.packets.filter(packet => packet.product).map(packet => ({ packet_id: packet.packet_id, product: packet.product }));
  const run: Data = { run_id: runId, specification: context.specification, packet_ids: input.packets.map(packet => packet.packet_id), mode: prepared.mode, input_issues: prepared.issues,
    ...prepared.binding, selection: prepared.selection, units: prepared.units, criteria: prepared.criteria, packet_inputs: prepared.packetInputs,
    assignments: [], assessments: [], findings: [], executions: [], resources: [], invocations: [], events: [],
    finalization: { execution_status: "pending", coverage_status: "pending", freshness: "fresh", consistency_status: "pending", cleanup_status: "not_required",
      unresolved_material_refs: [], judgment: "incomplete", reason: "Draft inventory requires independent obligation reconciliation and review." } };
  return mutatePacketReviewState(contextText, "task_packet_review_prepare", { operation_id: runId, entity_type: "run", entity_ref: runId, expected_revision: 0,
    ...prepared.binding, payload: { selection: input } }, {
    source: async current => (await collect(current, input, prepared.selection, signal)).binding,
    apply: async (_existing, current) => {
      const result = { run_ref: runRef, source_version: prepared.binding.source_version, mode: prepared.mode,
      selection: prepared.selection, unit_count: prepared.units.length, criterion_count: prepared.criteria.length,
      inventory_status: "draft", semantic_reconciliation_required: true, limits: prepared.limits, intent: input.intent, products };
      const preview = { ...result, entity_ref: runId, entity_revision: 1, lock_wait_ms: Number.MAX_VALUE };
      const effectiveLimits = { ...prepared.limits, overhead_bytes: prepared.limits.overhead_bytes + (current.versions.decisions === null ? 256 : 0) };
      if (!fitsResponse(await stateResult(current, {}), preview, effectiveLimits)) fail("RESULT_LIMIT", "Preparation acknowledgment exceeds actual response headroom; narrow the group or advertise sufficient capacity.");
      return { entity: run, result };
    },
  }, signal);
}
async function ownedRecord(context: string, selection: { entity_type?: "run"; entity_ref?: string; operation_id?: string }): Promise<Data> {
  let cursor;
  let text = "";
  do {
    const response = await readPacketReviewState(context, { ...selection, ...(cursor ? { cursor } : {}) });
    const part = obj(response.result);
    text += String(part.text); cursor = part.next_cursor;
  } while (typeof cursor === "string");
  return obj(JSON.parse(text));
}
async function currentRun(context: Context, ref: string, contextText: string): Promise<{ run: Data; collected: Collected; runRef: string }> {
  const reference = parseToken(ref);
  if (reference.owner !== owner(context)) fail("BROKEN_REFERENCE", "Review reference belongs to another project or specification.");
  await load(context, "decisions");
  const run = await ownedRecord(contextText, { entity_type: "run", entity_ref: String(reference.run_id) });
  if (run.source_version !== reference.source_version) fail("BROKEN_REFERENCE", "Review reference does not identify an acknowledged run.");
  const receipt = await ownedRecord(contextText, { operation_id: String(reference.run_id) });
  if (receipt.entity_ref !== run.run_id || receipt.entity_revision !== 1) fail("INVALID_STATE", "Run preparation receipt is missing.");
  const result = obj(receipt.result);
  const products = rows(result.products ?? []);
  const selection = obj(run.selection);
  const paths = strings(selection.paths);
  const packetInputs = rows(run.packet_inputs);
  const packets = packetInputs.map(packet => ({ packet_id: packet.packet_id, path: packet.path, agreement_ref: packet.agreement_ref, proposal_digest: packet.proposal_digest,
    paths: [...new Set(rows(run.units).filter(unit => strings(unit.packet_ids).includes(String(packet.packet_id))).flatMap(unit => rows(unit.source_refs).map(source => String(source.path))).filter(path => paths.includes(path)))],
    ...(products.find(item => item.packet_id === packet.packet_id) ? { product: products.find(item => item.packet_id === packet.packet_id)!.product } : {}) }));
  const shared = [...new Set(rows(run.units).filter(unit => strings(unit.packet_ids).length > 1).flatMap(unit => rows(unit.source_refs).map(source => String(source.path))).filter(path => paths.includes(path)))];
  const input = packetReviewSelection.parse({ mode: selection.mode, baseline_ref: selection.baseline_ref, ...(selection.mode === "committed" ? { target_ref: selection.target_ref } : {}), paths, packets,
    shared_paths: shared, intent: result.intent, host_limits: result.limits });
  const collected = await collect(context, input, selection);
  if (collected.binding.source_version !== run.source_version) fail("STALE_SOURCE", "Selected code, packet, agreement or shared input changed; prepare a new run.");
  return { run, collected, runRef: ref };
}
function sourceReference(context: Context, run: Data, source: Original): string {
  return token({ owner: owner(context), run_id: run.run_id, source_version: run.source_version, key: source.key });
}
function portion(text: string, identity: string, cursor: string | undefined, budget: number): Data {
  let offset = 0;
  if (cursor) { const saved = parseToken(cursor); if (saved.identity !== identity) fail("STALE_CURSOR", "Review selection or original changed; restart the exact read."); offset = Number(saved.offset); }
  if (!Number.isSafeInteger(offset) || offset < 0 || offset >= Math.max(1, text.length)) fail("INVALID_CURSOR", "Original cursor offset is invalid.");
  let end = offset;
  let bytes = 0;
  while (end < text.length) { const point = String.fromCodePoint(text.codePointAt(end)!); const length = Buffer.byteLength(JSON.stringify(point)) - 2; if (bytes + length > budget) break; bytes += length; end += point.length; }
  if (end === offset && end < text.length) fail("RESULT_LIMIT", "Response headroom is too small for an exact source portion.");
  const complete = end === text.length;
  return { text: text.slice(offset, end), offset, total_characters: text.length, total_bytes: Buffer.byteLength(text), complete,
    next_cursor: complete ? null : token({ identity, offset: end }), read_receipt: complete ? hash(canonical([identity, text])) : null };
}
export async function listPacketReviewUnits(contextText: string, runRef: string, cursor?: string): Promise<Data> {
  return readConsistent(contextText, async context => {
    const { run, collected } = await currentRun(context, runRef, contextText);
    let offset = 0;
    const identity = hash(canonical([owner(context), runRef, "units"]));
    if (cursor) { const parsed = parseToken(cursor); if (parsed.identity !== identity) fail("STALE_CURSOR", "Unit cursor belongs to another selection."); offset = Number(parsed.offset); }
    if (!Number.isSafeInteger(offset) || offset < 0 || offset >= collected.units.length) fail("INVALID_CURSOR", "Unit cursor offset is invalid.");
    const items: Data[] = [];
    const envelope = await stateResult(context, {});
    const response = (values: Data[], next: number): Data => ({ items: values, total: collected.units.length, criterion_total: collected.criteria.length,
      inventory_status: "draft", semantic_reconciliation_required: true, source_version: run.source_version, complete: next === collected.units.length,
      next_cursor: next < collected.units.length ? token({ identity, offset: next }) : null });
    let next = offset;
    while (next < collected.units.length) {
      const unit = collected.units[next]!;
      const source = collected.originals[next]!;
      const item = { ...unit, criteria: collected.criteria.filter(criterion => strings(unit.criterion_ids).includes(String(criterion.criterion_id))),
        sources: [{ ...location(source), side: source.side, source_ref: sourceReference(context, run, source), encoding: source.encoding,
          ...(["baseline", "target"].includes(source.side) ? { change: collected.changes.get(source.path) } : {}) }] };
      if (!fitsResponse(envelope, response([...items, item], next + 1), collected.limits)) { if (!items.length) fail("RESULT_LIMIT", "A unit summary exceeds actual response headroom; reduce its obligations or select more headroom."); break; }
      items.push(item); next++;
    }
    return response(items, next);
  });
}
export async function readPacketReviewSource(contextText: string, sourceRef: string, cursor?: string, options: { run_ref?: string | undefined; assignment_ref?: string | undefined } = {}): Promise<Data> {
  return readConsistent(contextText, async context => {
    const selected = parseToken(sourceRef);
    if (selected.owner !== owner(context)) fail("BROKEN_REFERENCE", "Original reference belongs to another project or specification.");
    const runRef = runReference(context, String(selected.run_id), String(selected.source_version));
    if (options.run_ref && options.run_ref !== runRef) fail("BROKEN_REFERENCE", "Original and run references do not match.");
    const { run, collected } = await currentRun(context, runRef, contextText);
    const source = collected.originals.find(source => source.key === selected.key);
    if (!source) fail("BROKEN_REFERENCE", "Original is not part of this selected inventory.");
    if (options.assignment_ref) {
      const assignment = rows(run.assignments).find(assignment => assignment.assignment_id === options.assignment_ref);
      if (!assignment || assignment.source_version !== run.source_version) fail("BROKEN_REFERENCE", "Assignment does not belong to this current source.");
      const assigned = collected.units.filter(unit => strings(assignment.unit_ids).includes(String(unit.unit_id)));
      const common = new Set(assigned.flatMap(unit => strings(unit.shared_constraint_refs)));
      const units = collected.units.filter(unit => assigned.includes(unit) || common.has(String(unit.unit_id)));
      const allowed = new Set(units.flatMap(unit => rows(unit.source_refs).map(ref => canonical(ref))));
      const bytes = units.reduce((sum, unit) => sum + Number(unit.original_bytes), 0);
      if (!allowed.has(canonical(location(source))) || bytes > collected.limits.actor_input_bytes || Number(assignment.input_bytes) < bytes) fail("ACTOR_INPUT_LIMIT", "Original is outside the assignment or its cumulative review-owned input budget.");
    }
    const identity = hash(canonical([owner(context), runRef, sourceRef]));
    const envelope = await stateResult(context, {});
    let budget = collected.limits.response_bytes - collected.limits.overhead_bytes;
    for (;;) {
      const response = { ...portion(source.text, identity, cursor, budget), encoding: source.encoding, source_version: run.source_version, source_ref: sourceRef };
      if (fitsResponse(envelope, response, collected.limits)) return response;
      if (budget <= 1) fail("PREREQUISITE_MISSING", "Actual MCP overhead leaves no source headroom; advertise sufficient capacity.");
      budget = Math.max(1, Math.floor(budget / 2));
    }
  });
}
