import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";
import test from "node:test";
import { z } from "zod";

import { createSharedStdioHarness } from "../test-support/stdio-harness.mjs";
import { workflowTools } from "../dist/server.js";
import { TOOL_DEFINITIONS } from "../dist/service.js";

const entrypoint = fileURLToPath(new URL("../dist/main.js", import.meta.url));
const contractsUrl = new URL("../dist/tool-contracts.json", import.meta.url);

function described(property) {
  return property !== null
    && typeof property === "object"
    && typeof property.description === "string"
    && property.description.trim().length > 0;
}

function metadataBearingField(name) {
  return name === "context"
    || name === "project"
    || name === "specification"
    || name.includes("cursor")
    || name.includes("version")
    || name.includes("receipt")
    || name.endsWith("_ref")
    || name.endsWith("_refs");
}

function* metadataBearingProperties(schema, path = "") {
  if (schema === null || typeof schema !== "object") return;
  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    const propertyPath = path ? `${path}.${name}` : name;
    if (metadataBearingField(name)) yield { path: propertyPath, property };
    yield* metadataBearingProperties(property, propertyPath);
  }
  if (schema.items !== undefined) {
    const items = Array.isArray(schema.items) ? schema.items : [schema.items];
    for (const [index, item] of items.entries()) {
      yield* metadataBearingProperties(item, `${path}[]${items.length > 1 ? `[${index}]` : ""}`);
    }
  }
  for (const keyword of ["allOf", "anyOf", "oneOf"]) {
    for (const [index, branch] of (schema[keyword] ?? []).entries()) {
      yield* metadataBearingProperties(branch, `${path}.${keyword}[${index}]`);
    }
  }
}

function withoutDescriptions(value) {
  if (Array.isArray(value)) return value.map(withoutDescriptions);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([name]) => name !== "description")
    .map(([name, nested]) => [name, withoutDescriptions(nested)]));
}

async function listedTools(t) {
  const harness = createSharedStdioHarness({ entrypoint, name: "tool-metadata-test" });
  t.after(() => harness.close());
  return (await (await harness.start()).listTools()).tools;
}

test("published tools explain provenance-bearing input fields", async (t) => {
  const tools = await listedTools(t);
  assert.equal(new Set(tools.map((tool) => tool.name)).size, tools.length);
  for (const tool of tools) {
    assert.ok(tool.description?.trim(), `${tool.name} needs a tool description`);
    for (const { path, property } of metadataBearingProperties(tool.inputSchema)) {
      assert.ok(described(property), `${tool.name}.${path} needs an actionable description`);
    }
  }
});

test("published descriptions distinguish confusable workflow scenarios", async (t) => {
  const tools = new Map((await listedTools(t)).map((tool) => [tool.name, tool]));
  const description = (name) => tools.get(name)?.description ?? "";

  assert.match(description("decisions_get"), /direct|project.*specification/iu);
  assert.match(description("decision_get"), /context|managed workflow/iu);
  assert.match(description("screen_place_component"), /local|catalog/iu);
  assert.match(description("screen_place_component"), /does not edit|never edits.*Penpot/iu);
  assert.match(description("specification_check_state"), /checkpoint|write/iu);
  assert.match(description("specification_review_start"), /unchanged.*resume|resume.*unchanged/iu);
  assert.match(description("specification_review_start"), /enhanced.*full|full.*consistency/iu);
  assert.equal(tools.get("specification_review_start")?.inputSchema?.properties?.require_consistency?.const, true);
  assert.match(description("specification_review_followup_start"), /completed parent/iu);
  assert.match(description("specification_review_consistency_record"), /whole-specification|whole specification/iu);
  assert.match(description("scope_propose"), /question/iu);
  assert.match(description("scope_confirm"), /answer/iu);
});

test("published field descriptions name the scenario-specific provenance", async (t) => {
  const tools = new Map((await listedTools(t)).map((tool) => [tool.name, tool]));
  const fieldDescription = (tool, field) => tools.get(tool)?.inputSchema?.properties?.[field]?.description ?? "";

  const packetEvidence = fieldDescription("task_packet_complete", "evidence_refs");
  assert.match(packetEvidence, /verification|check/iu);
  assert.match(packetEvidence, /caller|recorded|string/iu);
  assert.doesNotMatch(packetEvidence, /server-issued|registered by the preceding/iu);

  const roadmapEvidence = fieldDescription("roadmap_record_stage_outcome", "evidence_refs");
  assert.match(roadmapEvidence, /product|element|semantic/iu);

  const requirementVersion = fieldDescription("requirement_get", "source_version");
  assert.match(requirementVersion, /requirement_list/iu);
  assert.doesNotMatch(requirementVersion, /review inventory/iu);
});

test("local Penpot contract mutations do not claim remote effects", async (t) => {
  const tools = new Map((await listedTools(t)).map((tool) => [tool.name, tool]));
  for (const name of ["component_register", "component_add_variant", "component_update_variant", "screen_create"]) {
    const description = tools.get(name)?.description ?? "";
    assert.match(description, /local/iu, name);
    assert.match(description, /does not (?:create|edit|verify).*remote Penpot/iu, name);
  }
});

test("generated workflow contracts preserve live descriptions and field metadata", async (t) => {
  const live = new Map((await listedTools(t)).map((tool) => [tool.name, tool]));
  const contracts = JSON.parse(await readFile(contractsUrl, "utf8"));
  assert.ok(contracts.length > 0);
  for (const contract of contracts) {
    const tool = live.get(contract.name);
    assert.ok(tool, `missing live tool ${contract.name}`);
    assert.equal(contract.description, tool.description, contract.name);
    assert.deepEqual(contract.inputSchema, tool.inputSchema, contract.name);
    assert.equal(contract.readOnly, tool.annotations.readOnlyHint, contract.name);
    assert.equal(contract.destructive, tool.annotations.destructiveHint, contract.name);
  }
});

test("metadata publication preserves executable input contracts and annotations", async (t) => {
  const live = new Map((await listedTools(t)).map((tool) => [tool.name, tool]));
  const definitions = [
    ...TOOL_DEFINITIONS.map((tool) => ({ ...tool, schemaKind: "zod", write: false, destructive: false })),
    ...workflowTools,
  ];
  assert.deepEqual([...live.keys()], definitions.map((tool) => tool.name));
  for (const definition of definitions) {
    const tool = live.get(definition.name);
    const rawSchema = definition.schemaKind === "json"
      ? definition.inputSchema
      : z.toJSONSchema(definition.inputSchema, { io: "input" });
    assert.deepEqual(withoutDescriptions(tool.inputSchema), withoutDescriptions(rawSchema), definition.name);
    assert.equal(tool.annotations.readOnlyHint, !definition.write, definition.name);
    assert.equal(tool.annotations.destructiveHint, definition.destructive, definition.name);
  }
});

test("cursor metadata names the server continuation and preserves bounded reads", async (t) => {
  const tools = await listedTools(t);
  const cursorFields = tools.flatMap((tool) => Object.entries(tool.inputSchema?.properties ?? {})
    .filter(([name]) => name.includes("cursor"))
    .map(([, property]) => ({ tool: tool.name, property })));
  assert.ok(cursorFields.length > 0);
  for (const { tool, property } of cursorFields) {
    assert.match(property.description ?? "", /next_cursor|continuation/iu, tool);
    assert.match(property.description ?? "", /same|matching/iu, tool);
  }
});
