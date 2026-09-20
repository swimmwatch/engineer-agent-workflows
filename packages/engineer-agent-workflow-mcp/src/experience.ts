import { z } from "zod";
import { tool } from "./api.js";
import { exportEvidence } from "./catalog.js";
import { verifyRequirements } from "./decisions.js";
import { designCatalog, entity, invalidate, newId, validateExperience } from "./design.js";
import { inspectExport } from "./penpot.js";
import { requireDesign } from "./scope.js";
import { contextInput, decode, fail, hash, id, load, mutate, obj, page, parseYaml, readDependency, result, rows, strings, text, texts } from "./state.js";
import type { Context, Data } from "./state.js";
const screenInput = { ...contextInput, screen_id: id };
const requirements = z.array(id).min(1).max(100);
const stateDescription = { visible: text, entry_conditions: texts.default([]), exit_conditions: texts.default([]), focus: text.optional() };
const transitionDescription = { from: id, to: id, trigger: text, requirement_ids: requirements, conditions: texts.default([]), operation_refs: texts.default([]) };
const instanceDescription = { component_id: id, variant_id: id, overrides: z.record(z.string().min(1).max(100), z.union([z.string().max(4096), z.number().finite(), z.boolean(), z.null()])).refine((v) => Object.keys(v).length <= 20).default({}) };
const dependencies = ["manifest", "decisions", "catalog"] as const;
function screen(value: Data, id: string): Data { return entity(rows(value.screens), id, "screens"); }
async function changed(value: Data, context: Context): Promise<void> {
  await requireDesign(context, "experience");
  const catalog = await designCatalog(context);
  validateExperience(value, catalog, context.specification);
  for (const item of rows(value.screens)) {
    await verifyRequirements(context, strings(item.requirement_ids));
    for (const action of rows(item.actions)) {
      await verifyRequirements(context, strings(action.requirement_ids));
      if (strings(action.operation_refs ?? []).length) await verifyOperations(context, strings(action.operation_refs));
    }
  }
  invalidate(value);
}
export async function verifyOperations(context: Context, refs: string[]): Promise<void> {
  const manifest = (await load(context, "manifest")).value;
  // Operation contracts retain their own formats. Require an addressable declared
  // source and an exact anchor; do not guess an operation from nearby prose.
  for (const ref of refs) {
    const [path, anchor, extra] = ref.split("#");
    if (!path || !anchor || extra !== undefined || !strings(manifest.planning_artifacts).includes(path)) fail("BROKEN_REFERENCE", "Operation reference must identify a declared contract and exact anchor.", { operation_ref: ref });
    const bytes = await readDependency(context, `docs/specs/${context.specification}/${path}`);
    if (!bytes || !["contracts/openapi.yaml", "contracts/asyncapi.yaml"].includes(path)) fail("BROKEN_REFERENCE", "Operation reference requires a supported declared OpenAPI or AsyncAPI source.", { operation_ref: ref });
    const data = obj(parseYaml(bytes).toJS({ maxAliasCount: 0 }) as unknown);
    let found = false;
    if (path.endsWith("openapi.yaml")) {
      if (typeof data.openapi !== "string" || !data.openapi.startsWith("3.")) fail("INVALID_STATE", "Only OpenAPI 3 operation references are supported.");
      for (const endpoint of Object.values(obj(data.paths))) for (const method of ["get", "put", "post", "delete", "options", "head", "patch", "trace"]) {
        const operation = obj(endpoint)[method];
        if (operation && obj(operation).operationId === anchor) found = true;
      }
    } else {
      if (typeof data.asyncapi !== "string" || !data.asyncapi.startsWith("3.")) fail("INVALID_STATE", "Only AsyncAPI 3 operation references are supported.");
      found = Object.hasOwn(obj(data.operations), anchor);
    }
    if (!found) fail("BROKEN_REFERENCE", "Operation identifier was not found in its declared contract.", { operation_ref: ref });
  }
}
function instance(catalog: Data, existing: Data, a: z.infer<z.ZodObject<typeof instanceDescription>>): Data {
  const component = entity(rows(catalog.components), a.component_id, "components");
  entity(rows(component.variants), a.variant_id, "variants");
  return { ...existing, component: a.component_id, variant: a.variant_id, library_file_id: obj(catalog.penpot).file_id, overrides: a.overrides };
}
export const experienceTools = [
  tool("screen_create", "Register supplied Penpot file, page, and board identifiers with initial state in local experience contract; does not create or verify remote Penpot objects.", z.object({ ...contextInput, name: text, file_id: id, page_id: id, board_id: id, requirement_ids: requirements, initial_state: text, visible: text }).strict(), true, async (a) => mutate(a.context, "experience", "screen_create", a, async (value, context) => {
    await requireDesign(context, "experience");
    const catalog = await designCatalog(context);
    if (!value.schema_version) Object.assign(value, { schema_version: 1, specification: context.specification, requirements_source: `docs/specs/${context.specification}/spec.md`, system: { catalog: "design/system/catalog.yaml", library_file_id: obj(catalog.penpot).file_id, snapshot_sha256: obj(catalog.snapshot).sha256 }, penpot: { file_id: a.file_id }, snapshot: { path: `design/specs/${context.specification}/screens.penpot`, status: "pending", sha256: null }, screens: [] });
    if (obj(value.penpot).file_id !== a.file_id) fail("INVALID_INPUT", "All screens in this specification use its registered Penpot file.");
    const screens = rows(value.screens), screenId = newId(a.name, screens), stateId = newId(a.initial_state, []);
    value.screens = [...screens, { id: screenId, page_id: a.page_id, board_id: a.board_id, requirement_ids: [...new Set(a.requirement_ids)], instances: [], states: [{ id: stateId, visible: a.visible }], actions: [] }];
    await changed(value, context); return { screen_id: screenId, state_id: stateId };
  }, [...dependencies])),
  tool("screen_set_requirements", "Link one screen to existing specification requirements.", z.object({ ...screenInput, requirement_ids: requirements }).strict(), true, async (a) => mutate(a.context, "experience", "screen_set_requirements", a, async (value, context) => {
    screen(value, a.screen_id).requirement_ids = [...new Set(a.requirement_ids)];
    await changed(value, context); return { screen_id: a.screen_id, requirement_ids: a.requirement_ids };
  }, [...dependencies])),
  tool("screen_add_state", "Add one observable screen state, including conditions and focus behavior.", z.object({ ...screenInput, name: text, ...stateDescription }).strict(), true, async (a) => mutate(a.context, "experience", "screen_add_state", a, async (value, context) => {
    const target = screen(value, a.screen_id), states = rows(target.states), stateId = newId(a.name, states);
    target.states = [...states, { id: stateId, visible: a.visible, entry_conditions: a.entry_conditions, exit_conditions: a.exit_conditions, ...(a.focus ? { focus: a.focus } : {}) }];
    await changed(value, context); return { screen_id: a.screen_id, state_id: stateId };
  }, [...dependencies])),
  tool("screen_update_state", "Replace an existing local state's observable behavior and conditions while preserving omitted focus; never edits the Penpot canvas.", z.object({ ...screenInput, state_id: id, ...stateDescription }).strict(), true, async (a) => mutate(a.context, "experience", "screen_update_state", a, async (value, context) => {
    const state = entity(rows(screen(value, a.screen_id).states), a.state_id, "states");
    Object.assign(state, { visible: a.visible, entry_conditions: a.entry_conditions, exit_conditions: a.exit_conditions });
    if (a.focus !== undefined) state.focus = a.focus;
    await changed(value, context); return { screen_id: a.screen_id, state_id: a.state_id };
  }, [...dependencies])),
  tool("screen_add_transition", "Add one transition between existing states, with its triggering event and requirements.", z.object({ ...screenInput, name: text, ...transitionDescription }).strict(), true, async (a) => mutate(a.context, "experience", "screen_add_transition", a, async (value, context) => {
    const target = screen(value, a.screen_id), actions = rows(target.actions), actionId = newId(a.name, actions);
    target.actions = [...actions, { id: actionId, from: a.from, to: a.to, trigger: a.trigger, requirement_ids: a.requirement_ids, conditions: a.conditions, operation_refs: a.operation_refs }];
    await changed(value, context); return { screen_id: a.screen_id, transition_id: actionId };
  }, [...dependencies])),
  tool("screen_update_transition", "Replace one local transition's endpoints, trigger, defaulted conditions and operation references; never edits the Penpot canvas.", z.object({ ...screenInput, transition_id: id, ...transitionDescription }).strict(), true, async (a) => mutate(a.context, "experience", "screen_update_transition", a, async (value, context) => {
    const action = entity(rows(screen(value, a.screen_id).actions), a.transition_id, "actions");
    Object.assign(action, { from: a.from, to: a.to, trigger: a.trigger, requirement_ids: a.requirement_ids, conditions: a.conditions, operation_refs: a.operation_refs });
    await changed(value, context); return { screen_id: a.screen_id, transition_id: a.transition_id };
  }, [...dependencies])),
  tool("screen_place_component", "Register a linked Penpot instance in the local experience catalog; validates identifiers but never edits the remote Penpot canvas.", z.object({ ...screenInput, name: text, element_id: id, ...instanceDescription }).strict(), true, async (a) => mutate(a.context, "experience", "screen_place_component", a, async (value, context) => {
    const target = screen(value, a.screen_id), instances = rows(target.instances), instanceId = newId(a.name, instances);
    target.instances = [...instances, instance(await designCatalog(context), { id: instanceId, element_id: a.element_id }, a)];
    await changed(value, context); return { screen_id: a.screen_id, instance_id: instanceId };
  }, [...dependencies])),
  tool("screen_change_component", "Change a registered instance's component, variant or allowed overrides.", z.object({ ...screenInput, instance_id: id, ...instanceDescription }).strict(), true, async (a) => mutate(a.context, "experience", "screen_change_component", a, async (value, context) => {
    const target = entity(rows(screen(value, a.screen_id).instances), a.instance_id, "instances");
    Object.assign(target, instance(await designCatalog(context), target, a));
    await changed(value, context); return { screen_id: a.screen_id, instance_id: a.instance_id };
  }, [...dependencies])),
  tool("screen_set_responsive_rule", "Set the expected behavior at a named viewport size; replace only that named rule.", z.object({ ...screenInput, name: text, width: z.number().int().min(1).max(16384), height: z.number().int().min(1).max(16384), behavior: text }).strict(), true, async (a) => mutate(a.context, "experience", "screen_set_responsive_rule", a, async (value, context) => {
    const target = screen(value, a.screen_id), rules = rows(target.responsive ?? []), ruleId = newId(a.name, []);
    const prior = rules.find((r) => r.id === ruleId);
    const rule = { ...prior, id: ruleId, width: a.width, height: a.height, behavior: a.behavior };
    target.responsive = [...rules.filter((r) => r.id !== ruleId), rule];
    await changed(value, context); return { screen_id: a.screen_id, rule_id: ruleId };
  }, [...dependencies])),
  tool("screen_set_content_rules", "Replace the local screen's complete content-rule list, including wrapping, empty values and localization constraints; never edits Penpot.", z.object({ ...screenInput, content_rules: texts }).strict(), true, async (a) => mutate(a.context, "experience", "screen_set_content_rules", a, async (value, context) => {
    screen(value, a.screen_id).content_rules = a.content_rules;
    await changed(value, context); return { screen_id: a.screen_id };
  }, [...dependencies])),
  tool("screen_find", "Find bounded screen summaries by ID or requirement.", z.object({ ...contextInput, query: text.optional(), limit: z.number().int().min(1).max(50).default(20), cursor: text.optional() }).strict(), false, async (a) => {
    const context = decode(a.context); await requireDesign(context, "experience");
    const value = (await load(context, "experience")).value;
    const screens = rows(value.screens ?? []).filter((s) => !a.query || JSON.stringify([s.id, s.requirement_ids]).toLowerCase().includes(a.query.toLowerCase())).map((s) => ({ id: s.id, requirement_ids: s.requirement_ids }));
    return result(context, page(screens, a.cursor, a.limit, hash(JSON.stringify([context.project, context.specification, value, a.query, a.limit]))));
  }),
  tool("screen_get", "Read one bounded section of a screen: states, actions, instances, responsive rules or content rules.", z.object({ ...screenInput, section: z.enum(["states", "actions", "instances", "responsive", "content_rules"]).default("states"), limit: z.number().int().min(1).max(20).default(10), cursor: text.optional() }).strict(), false, async (a) => {
    const context = decode(a.context); await requireDesign(context, "experience");
    const value = (await load(context, "experience")).value, target = screen(value, a.screen_id), items = target[a.section] as unknown[] | undefined;
    return result(context, { screen_id: target.id, page_id: target.page_id, board_id: target.board_id, requirement_ids: target.requirement_ids, ...page(items ?? [], a.cursor, a.limit, hash(JSON.stringify([context.project, context.specification, value, a.screen_id, a.section, a.limit]))) });
  }),
  tool("screen_remove", "Remove one screen, preserving at least one screen in the design contract.", z.object(screenInput).strict(), true, async (a) => mutate(a.context, "experience", "screen_remove", a, async (value, context) => {
    screen(value, a.screen_id);
    if (rows(value.screens).length === 1) fail("DEPENDENCY_EXISTS", "The design contract must retain one screen; retiring the design output requires a scope change.");
    value.screens = rows(value.screens).filter((s) => s.id !== a.screen_id);
    await changed(value, context); return { removed: a.screen_id };
  }, [...dependencies]), true),
  tool("screen_state_remove", "Remove an unused state, never a transition endpoint or the last state.", z.object({ ...screenInput, state_id: id }).strict(), true, async (a) => mutate(a.context, "experience", "screen_state_remove", a, async (value, context) => {
    const target = screen(value, a.screen_id), states = rows(target.states);
    entity(states, a.state_id, "states");
    const used = rows(target.actions).filter((r) => r.from === a.state_id || r.to === a.state_id);
    if (states.length === 1 || used.length) fail("DEPENDENCY_EXISTS", "State is required by the screen or its transitions.", { transition_ids: used.slice(0, 20).map((r) => r.id) });
    target.states = states.filter((s) => s.id !== a.state_id);
    await changed(value, context); return { removed: a.state_id };
  }, [...dependencies]), true),
  tool("screen_transition_remove", "Remove one explicitly selected transition.", z.object({ ...screenInput, transition_id: id }).strict(), true, async (a) => mutate(a.context, "experience", "screen_transition_remove", a, async (value, context) => {
    const target = screen(value, a.screen_id); entity(rows(target.actions), a.transition_id, "actions");
    target.actions = rows(target.actions).filter((r) => r.id !== a.transition_id);
    await changed(value, context); return { removed: a.transition_id };
  }, [...dependencies]), true),
  tool("screen_component_remove", "Remove one registered screen instance without deleting the catalog component.", z.object({ ...screenInput, instance_id: id }).strict(), true, async (a) => mutate(a.context, "experience", "screen_component_remove", a, async (value, context) => {
    const target = screen(value, a.screen_id); entity(rows(target.instances), a.instance_id, "instances");
    target.instances = rows(target.instances).filter((r) => r.id !== a.instance_id);
    await changed(value, context); return { removed: a.instance_id };
  }, [...dependencies]), true),
  tool("screen_design_register_export", "Verify the native screen export and linked instances against the current verified library snapshot; record external evidence.", z.object({ ...contextInput, ...exportEvidence }).strict(), true, async (a) => mutate(a.context, "experience", "screen_design_register_export", a, async (value, context) => {
    await requireDesign(context, "experience");
    const catalog = await designCatalog(context), snapshot = obj(catalog.snapshot);
    if (snapshot.status !== "verified" || snapshot.sha256 !== await inspectExport(context, catalog)) fail("PREREQUISITE_REQUIRED", "Register a current verified shared-library export first.");
    validateExperience(value, catalog, context.specification);
    const digest = await inspectExport(context, value, catalog);
    value.system = { ...obj(value.system), snapshot_sha256: snapshot.sha256 };
    value.snapshot = { ...obj(value.snapshot), status: "verified", sha256: digest };
    value.extensions = { ...obj(value.extensions ?? {}), export_evidence: a.export_evidence, import_evidence: a.import_evidence, inspection_evidence: a.inspection_evidence };
    return { registered: true, sha256: digest, library_sha256: snapshot.sha256, external_evidence: "Recorded, not independently reproduced by MCP." };
  }, [...dependencies])),
];
