import { readdir } from "node:fs/promises";
import { z } from "zod";
import { requireDesign } from "./scope.js";
import { fail, hash, load, obj, readDependency, rows, safePath, slug, strings, unique } from "./state.js";
import type { Context, Data } from "./state.js";
export const penpotIdentity = z.object({ instance: z.url().regex(/^https?:\/\/[^@?#]+$/).describe("HTTP(S) instance URL without credentials, query or fragment."), team_id: z.string().min(1).max(512), project_id: z.string().min(1).max(512), file_id: z.string().min(1).max(512) }).strict();
export function entity(records: Data[], identifier: string, collection: string): Data {
  const found = records.find((r) => r.id === identifier);
  if (!found) fail("NOT_FOUND", "Entity does not exist.", { collection, id: identifier });
  return found;
}
export function newId(name: string, records: Data[]): string {
  const candidate = name.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
  if (!candidate) fail("INVALID_INPUT", "Provide a short Latin entity name for a stable identifier.");
  if (records.some((r) => r.id === candidate)) fail("ALREADY_EXISTS", "Entity name already exists; use its specific update tool.", { id: candidate });
  return candidate;
}
export function invalidate(value: Data): void {
  const snapshot = obj(value.snapshot);
  value.snapshot = { ...snapshot, status: "pending", sha256: null };
}
export function validateCatalog(value: Data): void {
  const components = rows(value.components);
  unique(components, "components");
  for (const component of components) {
    unique(rows(component.variants), "variants");
    const overrides = strings(component.allowed_overrides);
    if (new Set(overrides).size !== overrides.length) fail("INVALID_STATE", "Allowed overrides must be unique.");
  }
}
export function validateExperience(value: Data, catalog: Data, specification: string): void {
  if (value.specification !== specification || value.requirements_source !== `docs/specs/${specification}/spec.md` || obj(value.snapshot).path !== `design/specs/${specification}/screens.penpot`) fail("BROKEN_REFERENCE", "Screen design belongs to a different specification.");
  const library = obj(catalog.penpot).file_id;
  if (obj(value.system).library_file_id !== library) fail("BROKEN_REFERENCE", "Screen design references a different shared library.");
  const screens = rows(value.screens);
  unique(screens, "screens");
  for (const screen of screens) {
    const states = rows(screen.states), actions = rows(screen.actions), instances = rows(screen.instances);
    unique(states, "states"); unique(actions, "actions"); unique(instances, "instances"); unique(rows(screen.responsive ?? []), "responsive");
    for (const action of actions) if (!states.some((s) => s.id === action.from) || !states.some((s) => s.id === action.to)) fail("BROKEN_REFERENCE", "Transition endpoint does not exist.", { screen_id: screen.id, action_id: action.id });
    for (const instance of instances) {
      const component = entity(rows(catalog.components), String(instance.component), "components");
      entity(rows(component.variants), String(instance.variant), "variants");
      if (instance.library_file_id !== library) fail("BROKEN_REFERENCE", "Instance references a different library.", { instance_id: instance.id });
      if (Object.keys(obj(instance.overrides ?? {})).some((key) => !strings(component.allowed_overrides).includes(key))) fail("BROKEN_REFERENCE", "Instance uses an override not allowed by its component.", { instance_id: instance.id });
    }
  }
}
export async function designCatalog(context: Context): Promise<Data> {
  const snapshot = await load(context, "catalog");
  if (!snapshot.bytes) fail("PREREQUISITE_REQUIRED", "Connect the shared design library first.");
  validateCatalog(snapshot.value);
  return snapshot.value;
}
export async function* designExperiences(context: Context): AsyncGenerator<{ specification: string; value: Data }> {
  const root = await safePath(context.project, "design/specs", false, true);
  let entries;
  try { entries = await readdir(root, { withFileTypes: true }); }
  catch (error) { if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return; throw error; }
  if (entries.length > 10000) fail("SOURCE_LIMIT", "Design specification count exceeds the supported limit.");
  for (const entry of entries) {
    if (!slug.safeParse(entry.name).success) continue;
    if (entry.isSymbolicLink()) fail("UNSAFE_PATH", "Dependent design directories must not be symbolic links.");
    if (!entry.isDirectory()) continue;
    const snapshot = await load({ ...context, specification: entry.name }, "experience");
    const checked = await readDependency(context, `design/specs/${entry.name}/experience.yaml`);
    if ((checked ? hash(checked) : null) !== snapshot.version) fail("CONFLICT", "A dependent screen design changed during inspection.");
    if (snapshot.bytes) yield { specification: entry.name, value: snapshot.value };
  }
}
export async function catalogChange(context: Context, value: Data): Promise<void> {
  await requireDesign(context, "catalog");
  validateCatalog(value);
  for await (const dependent of designExperiences(context)) validateExperience(dependent.value, value, dependent.specification);
  invalidate(value);
}
export async function tokenSource(context: Context, catalog: Data): Promise<Data> {
  const descriptor = obj(catalog.tokens ?? {});
  if (typeof descriptor.path !== "string" || !/^design\/system\/[^/]+\.json$/.test(descriptor.path)) fail("PREREQUISITE_REQUIRED", "Register a local token file first.");
  const bytes = await readDependency(context, descriptor.path);
  if (!bytes || hash(bytes) !== descriptor.sha256) fail("PREREQUISITE_REQUIRED", "Registered token source is missing or changed.");
  try { return obj(JSON.parse(bytes.toString("utf8")) as unknown); } catch { return fail("INVALID_STATE", "Token source is not valid JSON data."); }
}
export async function verifyTokens(context: Context, catalog: Data, refs: string[]): Promise<void> {
  if (!refs.length) return;
  const tokens = await tokenSource(context, catalog);
  for (const ref of refs) {
    let current: unknown = tokens;
    for (const part of ref.split(".")) current = current && typeof current === "object" && Object.hasOwn(current, part) ? obj(current)[part] : undefined;
    if (!current || typeof current !== "object" || !Object.hasOwn(current, "$value")) fail("BROKEN_REFERENCE", "Token reference does not resolve to a DTCG value.", { token_ref: ref });
  }
}
