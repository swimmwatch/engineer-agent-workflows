import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { tool } from "./api.js";
import { questionOptionsDiagnostics } from "./diagnostics.js";
import { catalogSources } from "./source.js";
import { artifactPath, contextInput, decode, fail, hash, id, load, mutate, obj, openContext, page, readDependency, result, rows, slug, strings, text, texts, unique } from "./state.js";
import type { Context, Data } from "./state.js";

export const reference = z.object({ id, revision: z.number().int().positive() }).strict();
export function ref(record: Data): Data { return { id: record.id, revision: record.revision }; }
export function currentRecords(value: Data): Data[] {
  const current = new Map<unknown, Data>();
  for (const record of rows(value.decisions ?? [])) {
    const previous = current.get(record.id);
    if (!previous || Number(previous.revision) < Number(record.revision)) current.set(record.id, record);
  }
  return [...current.values()].filter((r) => r.state !== "superseded");
}
export function selected(value: Data, target: z.infer<typeof reference>): Data {
  const record = currentRecords(value).find((r) => r.id === target.id);
  if (!record || record.revision !== target.revision) fail("CONFLICT", "Decision reference is not current; query the decision again.");
  return record;
}
export function append(value: Data, context: Context, fields: Data, prior?: Data): Data {
  value.schema_version ??= 1; value.spec_slug ??= context.specification; value.decisions ??= [];
  const record = { ...fields, id: prior?.id ?? fields.id ?? randomUUID(), revision: Number(prior?.revision ?? 0) + 1, supersedes_revision: prior?.revision ?? null };
  value.decisions = [...rows(value.decisions), record];
  return record;
}
export async function confirmedScope(context: Context): Promise<Data> {
  const manifest = (await load(context, "manifest")).value;
  const decisions = (await load(context, "decisions")).value;
  if (manifest.confirmed !== true || rows(manifest.profiles).some((p) => p.state === "needs_user")) fail("SCOPE_REQUIRED", "Confirm the specification scope before this operation.");
  if (pendingScope(manifest, decisions)) fail("SCOPE_REQUIRED", "Confirm the latest scope proposal and reconcile any manifest edits.");
  return manifest;
}
function pendingScope(manifest: Data, decisions: Data): Data | undefined {
  const scope = currentRecords(decisions).find((r) => r.id === "scope.manifest");
  if (!scope) return undefined;
  if (scope.state !== "answered") return scope;
  if (scope.scope && (strings(obj(scope.answer ?? {}).selected_ids ?? []).join() !== "confirm" || !isDeepStrictEqual({ ...obj(scope.scope), confirmed: true }, Object.fromEntries(Object.entries(manifest).filter(([k]) => k !== "extensions"))))) return scope;
  return undefined;
}
export async function requireDesignRead(context: Context): Promise<void> {
  const manifest = await confirmedScope(context);
  if (!rows(manifest.profiles).some((p) => p.id === "ui" && p.state === "active") || !strings(manifest.project_artifacts ?? []).length) fail("SCOPE_REQUIRED", "Design tools require confirmed UI scope and declared design outputs.");
}
export async function requireDesign(context: Context, kind: "catalog" | "experience"): Promise<Data> {
  const manifest = await confirmedScope(context);
  if (!rows(manifest.profiles).some((p) => p.id === "ui" && p.state === "active") || !strings(manifest.project_artifacts ?? []).includes(artifactPath(kind, context.specification))) fail("SCOPE_REQUIRED", "The confirmed manifest does not declare this design output.");
  const specification = await readDependency(context, `docs/specs/${context.specification}/spec.md`);
  if (!specification || !/^Status: Approved\s*$/m.test(specification.toString("utf8"))) fail("PREREQUISITE_REQUIRED", "Design authoring requires an Approved behavior specification.");
  return manifest;
}
const profile = z.enum(["core", "ui", "backend", "events", "data", "operations", "security", "cross-surface"]);
const artifact = z.enum(["core_contract", "api_contract", "mcp_contract", "event_contract", "data_schemas", "quality_scenarios", "architecture_model", "shared_design", "screen_design", "design_tokens"]);
const artifacts: Record<z.infer<typeof artifact>, { profile: string; path: string }> = {
  core_contract: { profile: "core", path: "core/contracts.yaml" }, api_contract: { profile: "backend", path: "contracts/openapi.yaml" },
  mcp_contract: { profile: "backend", path: "contracts/mcp.md" },
  event_contract: { profile: "events", path: "contracts/asyncapi.yaml" }, data_schemas: { profile: "data", path: "contracts/schemas/data.schema.json" },
  quality_scenarios: { profile: "operations", path: "quality/scenarios.yaml" }, architecture_model: { profile: "cross-surface", path: "architecture/model.dsl" },
  shared_design: { profile: "ui", path: "design/system/catalog.yaml" }, screen_design: { profile: "ui", path: "" },
  design_tokens: { profile: "ui", path: "design/system/tokens.tokens.json" },
};
export const scopeTools = [
  tool("specification_list", "List specification names in one project, with bounded paging.", z.object({ project: text, query: text.optional(), cursor: text.optional(), limit: z.number().int().min(1).max(50).default(20) }).strict(), false, async (a) => {
    const source = await catalogSources(a.project);
    const items = source.items.filter((name) => !a.query || name.includes(a.query));
    return { protocol_version: 2, result: page(items, a.cursor, a.limit, hash(JSON.stringify([source.project, source.version, a.query, a.limit]))) };
  }),
  tool("specification_open", "Open an existing or new specification target without creating files; return version-bound context.", z.object({ project: text, specification: slug }).strict(), false, async (a) => {
    const context = await openContext(a.project, a.specification);
    const manifest = (await load(context, "manifest")).value;
    const ledger = (await load(context, "decisions")).value;
    const decisions = currentRecords(ledger);
    const unresolved = decisions.filter((d) => ["needs_user", "blocked"].includes(String(d.state)));
    return result(context, { scope: pendingScope(manifest, ledger) ? "needs_confirmation" : manifest.confirmed === true ? "confirmed" : "unconfirmed", pending_questions: unresolved.slice(0, 10).map(ref), pending_count: unresolved.length, artifacts: Object.keys(context.versions).filter((k) => context.versions[k as keyof Context["versions"]] !== null) });
  }),
  tool("scope_get", "Read the confirmed scope and pending scope decision without reading journal history.", z.object(contextInput).strict(), false, async (a) => {
    const context = decode(a.context);
    const manifest = (await load(context, "manifest")).value;
    const pending = pendingScope(manifest, (await load(context, "decisions")).value);
    const { extensions: _extensions, ...scope } = manifest; void _extensions;
    return result(context, { manifest: scope, pending: pending ? ref(pending) : null });
  }),
  tool("scope_propose", "Save a scope proposal and its confirmation question, not an approved manifest. Select design_tokens with shared_design for an explicit shared token export.", z.object({ ...contextInput, depth: z.enum(["lite", "standard", "deep"]), rationale: texts.min(1), profiles: z.array(z.object({ id: profile, reason: text }).strict()).min(1).max(8), exclusions: z.array(z.object({ id: profile, reason: text }).strict()).max(8).default([]), artifacts: z.array(artifact).max(artifact.options.length).default([]) }).strict(), true, async (a) => mutate(a.context, "decisions", "scope_propose", a, (value, context) => {
    unique([...a.profiles, ...a.exclusions], "profiles");
    if (new Set(a.artifacts).size !== a.artifacts.length) fail("INVALID_INPUT", "Artifact selections must be unique.");
    if (a.artifacts.includes("design_tokens") && !a.artifacts.includes("shared_design")) fail("INVALID_INPUT", "Design tokens require the shared design library declaration.");
    const planning: string[] = [], project: string[] = [];
    for (const requested of a.artifacts) {
      const contract = artifacts[requested];
      if (!a.profiles.some((p) => p.id === contract.profile || (requested === "quality_scenarios" && p.id === "security"))) fail("INVALID_INPUT", "Selected artifact requires its matching active profile.", { artifact: requested });
      if (requested === "shared_design") project.push(contract.path, "design/system/library.penpot");
      else if (requested === "design_tokens") project.push(contract.path);
      else if (requested === "screen_design") project.push(`design/specs/${context.specification}/experience.yaml`, `design/specs/${context.specification}/screens.penpot`);
      else planning.push(contract.path);
    }
    const scope = { schema_version: 1, depth: a.depth, confirmed: false, rationale: a.rationale, profiles: [...a.profiles.map((p) => ({ ...p, state: "active" })), ...a.exclusions.map((p) => ({ ...p, state: "not_applicable" }))], planning_artifacts: planning, ...(project.length ? { project_artifacts: project } : {}) };
    const prior = currentRecords(value).find((r) => r.id === "scope.manifest");
    const question = { text: "Confirm this exact scope proposal, or request a correction.", kind: "single_choice", options: [{ id: "confirm", label: "Confirm this proposal" }, { id: "change", label: "Change the proposal" }] };
    const record = append(value, context, { id: "scope.manifest", category: "scope", state: "needs_user", provenance: "user", question, answer: null, status: "prepared", scope }, prior);
    record.question_origin = ref(record);
    return { question_ref: ref(record), question, proposal: scope, next: "Ask this saved question with the host-native question tool; then record the actual answer." };
  }, ["manifest"])),
  tool("question_record_answer", "Record an actual answer to the exact current saved question; invalid selections return bounded saved-question and allowed-option diagnostics, and this tool never asks or chooses for the user.", z.object({ ...contextInput, question_ref: reference, selected_ids: z.array(id).max(20).default([]), text: z.string().max(4096), source: text }).strict(), true, async (a) => mutate(a.context, "decisions", "question_record_answer", a, (value, context) => {
    const question = selected(value, a.question_ref);
    if (question.state !== "needs_user" && question.state !== "blocked") fail("INVALID_STATE", "Only an unresolved saved question can receive an answer.");
    const saved = obj(question.question), options = rows(saved.options);
    if ((!a.text.trim() && !a.selected_ids.length) || new Set(a.selected_ids).size !== a.selected_ids.length || a.selected_ids.some((v) => !options.some((o) => o.id === v)) || (saved.kind === "single_choice" && a.selected_ids.length > 1)) {
      fail(
        "INVALID_INPUT",
        "Answer must contain actual text or valid selections for this question.",
        questionOptionsDiagnostics(ref(question), options.map((option) => String(option.id))),
      );
    }
    const record = append(value, context, { ...question, state: "answered", status: "answered", answer: { text: a.text, selected_ids: a.selected_ids }, answer_source: a.source, answered_question: question.question_origin ?? ref(question) }, question);
    return { decision_ref: ref(record), state: "answered" };
  })),
  tool("scope_confirm", "Build the manifest from an exact saved scope proposal and its explicit confirmation answer.", z.object({ ...contextInput, proposal_ref: reference, answer_ref: reference }).strict(), true, async (a) => mutate(a.context, "manifest", "scope_confirm", a, async (value, context) => {
    const ledger = (await load(context, "decisions")).value;
    const answer = selected(ledger, a.answer_ref);
    if (answer.id !== "scope.manifest" || answer.state !== "answered" || JSON.stringify(answer.answered_question) !== JSON.stringify(a.proposal_ref) || strings(obj(answer.answer).selected_ids).join() !== "confirm") fail("ANSWER_REQUIRED", "Record explicit confirmation of this exact saved proposal first.");
    const scope = obj(answer.scope);
    for (const key of Object.keys(value)) if (key !== "extensions") delete value[key];
    Object.assign(value, scope, { confirmed: true });
    return { confirmed: true, depth: value.depth, next: "Load only the confirmed active profile references." };
  }, ["decisions"])),
];
