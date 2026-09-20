import { z } from "zod";
import { tool } from "./api.js";
import { catalogChange, designCatalog, designExperiences, entity, newId, penpotIdentity, verifyTokens } from "./design.js";
import { inspectExport } from "./penpot.js";
import { requireDesign, requireDesignRead } from "./scope.js";
import { contextInput, decode, fail, hash, id, mutate, obj, page, readDependency, result, rows, strings, text, texts } from "./state.js";
import type { Data } from "./state.js";
const componentInput = { ...contextInput, component_id: id };
const variantInput = { ...componentInput, variant_id: id };
const axes = z.record(z.string().min(1).max(100), z.string().min(1).max(256)).refine((a) => Object.keys(a).length <= 16);
export const exportEvidence = { export_evidence: text, import_evidence: text, inspection_evidence: text };
const dependencies = ["manifest", "decisions", "experience"] as const;
export const catalogTools = [
  tool("design_system_connect", "Connect a Penpot shared library to the declared local catalog; never edits Penpot.", z.object({ ...contextInput, ...penpotIdentity.shape }).strict(), true, async (a) => mutate(a.context, "catalog", "design_system_connect", a, async (value, context) => {
    await requireDesign(context, "catalog");
    if (value.schema_version) fail("ALREADY_EXISTS", "The shared library is already connected; changing its identity requires migration.");
    const { context: _context, ...penpot } = a; void _context;
    Object.assign(value, { schema_version: 1, penpot, snapshot: { path: "design/system/library.penpot", status: "pending", sha256: null }, components: [] });
    return { connected: true, file_id: a.file_id };
  }, [...dependencies])),
  tool("component_register", "Register supplied Penpot component and first-variant identifiers in local catalog; does not create or verify remote Penpot objects.", z.object({ ...contextInput, name: text, purpose: text, accessibility: text, variant_name: text, main_component_id: id }).strict(), true, async (a) => mutate(a.context, "catalog", "component_register", a, async (value, context) => {
    const components = rows(value.components), componentId = newId(a.name, components), variantId = newId(a.variant_name, []);
    value.components = [...components, { id: componentId, purpose: a.purpose, accessibility: a.accessibility, allowed_overrides: [], variants: [{ id: variantId, main_component_id: a.main_component_id }] }];
    await catalogChange(context, value);
    return { component_id: componentId, variant_id: variantId };
  }, [...dependencies])),
 tool("component_describe", "Replace a local component's purpose, accessibility guidance and complete content-constraint list; never edits Penpot.", z.object({ ...componentInput, purpose: text, accessibility: text, content_constraints: texts.default([]) }).strict(), true, async (a) => mutate(a.context, "catalog", "component_describe", a, async (value, context) => {
    const component = entity(rows(value.components), a.component_id, "components");
    Object.assign(component, { purpose: a.purpose, accessibility: a.accessibility, content_constraints: a.content_constraints });
    await catalogChange(context, value); return { component_id: a.component_id };
  }, [...dependencies])),
  tool("component_add_variant", "Register supplied Penpot variant identifier in local component; does not create or verify remote Penpot objects.", z.object({ ...componentInput, name: text, main_component_id: id, axes: axes.default({}) }).strict(), true, async (a) => mutate(a.context, "catalog", "component_add_variant", a, async (value, context) => {
    const component = entity(rows(value.components), a.component_id, "components"), variants = rows(component.variants), variantId = newId(a.name, variants);
    component.variants = [...variants, { id: variantId, main_component_id: a.main_component_id, axes: a.axes }];
    await catalogChange(context, value); return { component_id: a.component_id, variant_id: variantId };
  }, [...dependencies])),
  tool("component_update_variant", "Replace local variant's supplied Penpot identity and axes; does not edit or verify remote Penpot objects.", z.object({ ...variantInput, main_component_id: id, axes: axes.default({}) }).strict(), true, async (a) => mutate(a.context, "catalog", "component_update_variant", a, async (value, context) => {
    const variant = entity(rows(entity(rows(value.components), a.component_id, "components").variants), a.variant_id, "variants");
    Object.assign(variant, { main_component_id: a.main_component_id, axes: a.axes });
    await catalogChange(context, value); return { component_id: a.component_id, variant_id: a.variant_id };
  }, [...dependencies])),
  tool("component_set_allowed_overrides", "Set the exact instance overrides permitted by a component; reject existing incompatible instances.", z.object({ ...componentInput, allowed_overrides: texts }).strict(), true, async (a) => mutate(a.context, "catalog", "component_set_allowed_overrides", a, async (value, context) => {
    entity(rows(value.components), a.component_id, "components").allowed_overrides = a.allowed_overrides;
    await catalogChange(context, value); return { component_id: a.component_id, allowed_overrides: a.allowed_overrides };
  }, [...dependencies])),
 tool("design_system_register_tokens", "Register or replace the local DTCG token source path and computed digest without copying token values or editing Penpot.", z.object({ ...contextInput, filename: z.string().regex(/^[a-zA-Z0-9_.-]+\.json$/).max(200).default("tokens.json") }).strict(), true, async (a) => mutate(a.context, "catalog", "design_system_register_tokens", a, async (value, context) => {
    const path = `design/system/${a.filename}`, bytes = await readDependency(context, path);
    if (!bytes) fail("PREREQUISITE_REQUIRED", "Save the token JSON source first.");
    try { obj(JSON.parse(bytes.toString("utf8")) as unknown); } catch { fail("INVALID_STATE", "Token source must be a JSON mapping."); }
    value.tokens = { path, sha256: hash(bytes) };
    for (const component of rows(value.components)) { await verifyTokens(context, value, strings(component.token_refs ?? [])); for (const variant of rows(component.variants)) await verifyTokens(context, value, strings(variant.token_refs ?? [])); }
    await catalogChange(context, value); return { registered: true, sha256: hash(bytes) };
  }, [...dependencies])),
 tool("component_set_tokens", "Replace a local component or variant's token-reference list with deduplicated existing DTCG references; never edits Penpot.", z.object({ ...componentInput, variant_id: id.optional(), token_refs: texts }).strict(), true, async (a) => mutate(a.context, "catalog", "component_set_tokens", a, async (value, context) => {
    const component = entity(rows(value.components), a.component_id, "components"), target = a.variant_id ? entity(rows(component.variants), a.variant_id, "variants") : component;
    await verifyTokens(context, value, a.token_refs); target.token_refs = [...new Set(a.token_refs)];
    await catalogChange(context, value); return { component_id: a.component_id, token_refs: target.token_refs };
  }, [...dependencies])),
  tool("component_find", "Find bounded component descriptions by name or purpose.", z.object({ ...contextInput, query: text.optional(), limit: z.number().int().min(1).max(50).default(20), cursor: text.optional() }).strict(), false, async (a) => {
    const context = decode(a.context); await requireDesignRead(context);
    const catalog = await designCatalog(context), components = rows(catalog.components).filter((c) => !a.query || JSON.stringify([c.id, c.purpose]).toLowerCase().includes(a.query.toLowerCase())).map((c) => ({ id: c.id, purpose: String(c.purpose).slice(0, 256) }));
    return result(context, page(components, a.cursor, a.limit, hash(JSON.stringify([context.project, catalog, a.query, a.limit]))));
  }),
  tool("component_get", "Read one component; choose description, variants, tokens or content to bound large components.", z.object({ ...componentInput, section: z.enum(["summary", "description", "variants", "tokens", "content"]).default("summary"), limit: z.number().int().min(1).max(20).default(10), cursor: text.optional() }).strict(), false, async (a) => {
    const context = decode(a.context); await requireDesignRead(context);
    const catalog = await designCatalog(context), component = entity(rows(catalog.components), a.component_id, "components");
    const collection = a.section === "content" ? strings(component.content_constraints ?? []) : a.section === "tokens" ? strings(component.token_refs ?? []) : rows(component.variants);
    const portion = page(collection, a.cursor, a.limit, hash(JSON.stringify([context.project, catalog, a.component_id, a.section, a.limit])));
    const summary: Data = { id: component.id, ...(a.section === "summary" || a.section === "description" ? { purpose: component.purpose, accessibility: component.accessibility, allowed_overrides: component.allowed_overrides } : {}), ...(a.section === "summary" || a.section === "variants" ? { variants: portion.items } : {}), ...(a.section === "tokens" ? { token_refs: portion.items } : {}), ...(a.section === "content" ? { content_constraints: portion.items } : {}) };
    return result(context, { component: summary, next_cursor: portion.next_cursor, total: portion.total });
  }),
  tool("component_remove", "Remove an unused component; never cascade into screens.", z.object(componentInput).strict(), true, async (a) => mutate(a.context, "catalog", "component_remove", a, async (value, context) => {
    entity(rows(value.components), a.component_id, "components");
    await assertUnused(context, a.component_id);
    value.components = rows(value.components).filter((c) => c.id !== a.component_id);
    await catalogChange(context, value); return { removed: a.component_id };
  }, [...dependencies]), true),
  tool("component_variant_remove", "Remove an unused variant; preserve at least one variant per component.", z.object(variantInput).strict(), true, async (a) => mutate(a.context, "catalog", "component_variant_remove", a, async (value, context) => {
    const component = entity(rows(value.components), a.component_id, "components"), variants = rows(component.variants);
    entity(variants, a.variant_id, "variants");
    if (variants.length === 1) fail("DEPENDENCY_EXISTS", "A component must retain one variant.");
    await assertUnused(context, a.component_id, a.variant_id);
    component.variants = variants.filter((v) => v.id !== a.variant_id);
    await catalogChange(context, value); return { removed: a.variant_id };
  }, [...dependencies]), true),
  tool("design_system_register_export", "Check saved native library export identities, compute its digest and record external import/inspection evidence.", z.object({ ...contextInput, ...exportEvidence }).strict(), true, async (a) => mutate(a.context, "catalog", "design_system_register_export", a, async (value, context) => {
    await requireDesign(context, "catalog");
    const digest = await inspectExport(context, value);
    value.snapshot = { ...obj(value.snapshot), status: "verified", sha256: digest };
    value.extensions = { ...obj(value.extensions ?? {}), export_evidence: a.export_evidence, import_evidence: a.import_evidence, inspection_evidence: a.inspection_evidence };
    return { registered: true, sha256: digest, local_checks: ["native_container", "file_identity", "component_presence"], external_evidence: "Recorded, not independently reproduced by MCP." };
  }, [...dependencies])),
];
async function assertUnused(context: Parameters<typeof designExperiences>[0], component: string, variant?: string): Promise<void> {
  for await (const design of designExperiences(context)) for (const screen of rows(design.value.screens)) for (const instance of rows(screen.instances)) {
    if (instance.component === component && (!variant || instance.variant === variant)) fail("DEPENDENCY_EXISTS", "Component is still used by a screen.", { specification: design.specification, screen_id: screen.id, instance_id: instance.id });
  }
}
