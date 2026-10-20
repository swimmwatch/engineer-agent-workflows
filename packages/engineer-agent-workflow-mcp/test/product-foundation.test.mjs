import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, link, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { URL } from "node:url";
import Ajv from "ajv";

import { resolveProductRoot, validateProductPath } from "../dist/product/config.js";
import {
  PRODUCT_RECORD_DEFINITIONS,
  validateProductRecord,
} from "../dist/product/schemas.js";
import { openContext } from "../dist/state.js";

const UUID = "11111111-1111-4111-8111-111111111111";
const UUID_2 = "22222222-2222-4222-8222-222222222222";
const DIGEST = "a".repeat(64);
const DIGEST_2 = "b".repeat(64);
const ELEMENT_ID = "GOAL-0001";
const TASK_ID = "TASK-0001";

function expectCode(code) {
  return (error) => {
    assert.equal(error?.code, code);
    return true;
  };
}

async function temporaryDirectory(t, prefix) {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test("Q01: product root resolution is deterministic and rejects invalid configuration", () => {
  assert.equal(
    resolveProductRoot({
      platform: "linux",
      env: { EAW_PRODUCT_DATA_DIR: "/srv/eaw products" },
      home: "/home/alice",
    }),
    "/srv/eaw products",
  );
  assert.equal(
    resolveProductRoot({ platform: "linux", env: { XDG_DATA_HOME: "/data/alice" }, home: "/home/alice" }),
    "/data/alice/engineer-agent-workflows",
  );
  assert.equal(
    resolveProductRoot({ platform: "linux", env: { XDG_DATA_HOME: "relative" }, home: "/home/alice" }),
    "/home/alice/.local/share/engineer-agent-workflows",
  );
  assert.equal(
    resolveProductRoot({ platform: "darwin", env: {}, home: "/Users/Alice" }),
    "/Users/Alice/Library/Application Support/engineer-agent-workflows",
  );
  assert.equal(
    resolveProductRoot({ platform: "win32", env: { LOCALAPPDATA: "C:\\Users\\Alice\\AppData\\Local" }, home: "C:\\Users\\Alice" }),
    "C:\\Users\\Alice\\AppData\\Local\\engineer-agent-workflows",
  );

  assert.throws(
    () => resolveProductRoot({ platform: "linux", env: { EAW_PRODUCT_DATA_DIR: "relative" }, home: "/home/alice" }),
    expectCode("INVALID_CONFIG"),
  );
  assert.throws(
    () => resolveProductRoot({ platform: "linux", env: { EAW_PRODUCT_DATA_DIR: "/" }, home: "/home/alice" }),
    expectCode("INVALID_CONFIG"),
  );
  assert.throws(
    () => resolveProductRoot({ platform: "linux", env: { EAW_PRODUCT_DATA_DIR: "/home/alice" }, home: "/home/alice" }),
    expectCode("INVALID_CONFIG"),
  );
  assert.throws(
    () => resolveProductRoot({ platform: "win32", env: {}, home: "C:\\Users\\Alice" }),
    expectCode("INVALID_CONFIG"),
  );
});

test("Q01: resolving a product root and using legacy specification state creates no product storage", async (t) => {
  const fixture = await temporaryDirectory(t, "eaw-product-lazy-");
  const home = join(fixture, "home");
  const project = join(fixture, "project");
  const productRoot = join(fixture, "shared product");
  await mkdir(home);
  await mkdir(project);

  assert.equal(
    resolveProductRoot({ platform: process.platform, env: { EAW_PRODUCT_DATA_DIR: productRoot }, home }),
    productRoot,
  );
  await assert.rejects(readFile(productRoot), { code: "ENOENT" });

  const previous = process.env.EAW_PRODUCT_DATA_DIR;
  process.env.EAW_PRODUCT_DATA_DIR = productRoot;
  try {
    await openContext(project, "legacy-specification");
  } finally {
    if (previous === undefined) delete process.env.EAW_PRODUCT_DATA_DIR;
    else process.env.EAW_PRODUCT_DATA_DIR = previous;
  }
  await assert.rejects(readFile(productRoot), { code: "ENOENT" });
});

test("Q02: guarded product paths reject traversal, links, collisions and workspace overlap", async (t) => {
  const fixture = await temporaryDirectory(t, "eaw-product-path-");
  const root = join(fixture, "product data");
  const outside = join(fixture, "outside");
  const workspace = join(fixture, "workspace");
  await mkdir(root);
  await mkdir(outside);
  await mkdir(workspace);

  assert.equal(await validateProductPath(root, "products/item.json"), join(root, "products/item.json"));
  await assert.rejects(validateProductPath(root, "../outside/secret"), expectCode("UNSAFE_PATH"));
  await assert.rejects(validateProductPath(root, "/absolute"), expectCode("UNSAFE_PATH"));
  await assert.rejects(validateProductPath(root, "C:\\absolute"), expectCode("UNSAFE_PATH"));
  await assert.rejects(
    validateProductPath(workspace, "objects/item.json", { workspaceRoots: [workspace] }),
    expectCode("INVALID_CONFIG"),
  );

  await writeFile(join(outside, "protected.txt"), "protected");
  await symlink(outside, join(root, "linked"), "dir");
  await assert.rejects(validateProductPath(root, "linked/protected.txt"), expectCode("UNSAFE_PATH"));

  const aliasedParent = join(fixture, "aliased-parent");
  await symlink(outside, aliasedParent, "dir");
  await assert.rejects(
    validateProductPath(join(aliasedParent, "new-root"), "objects/item.json"),
    expectCode("UNSAFE_PATH"),
  );

  await link(join(outside, "protected.txt"), join(root, "hardlink.txt"));
  await assert.rejects(validateProductPath(root, "hardlink.txt"), expectCode("UNSAFE_PATH"));

  await mkdir(join(root, "Products"));
  await assert.rejects(validateProductPath(root, "products/item.json"), expectCode("UNSAFE_PATH"));

  await mkdir(join(root, "caf\u00e9"));
  await assert.rejects(validateProductPath(root, "cafe\u0301/item.json"), expectCode("UNSAFE_PATH"));
  const foreignPlatform = process.platform === "win32" ? "linux" : "win32";
  await assert.rejects(
    validateProductPath(root, "objects/item.json", { platform: foreignPlatform }),
    expectCode("UNAVAILABLE_EVIDENCE"),
  );
  assert.equal(await readFile(join(outside, "protected.txt"), "utf8"), "protected");
});

test("Q02: canonical workspace aliases cannot hide product-root overlap", async (t) => {
  const fixture = await temporaryDirectory(t, "eaw-product-workspace-alias-");
  const workspace = join(fixture, "workspace");
  const workspaceAlias = join(fixture, "workspace-alias");
  await mkdir(workspace);
  await symlink(workspace, workspaceAlias, "dir");

  await assert.rejects(
    validateProductPath(join(workspace, "product-data"), "objects/item.yaml", {
      workspaceRoots: [workspaceAlias],
    }),
    expectCode("INVALID_CONFIG"),
  );
  assert.equal(
    await validateProductPath(join(fixture, "product-data"), "objects/item.yaml", {
      workspaceRoots: [workspaceAlias],
    }),
    join(fixture, "product-data", "objects/item.yaml"),
  );
});

test("Q02: path syntax rejects invalid Unicode scalar values", async (t) => {
  const fixture = await temporaryDirectory(t, "eaw-product-path-syntax-");
  const root = join(fixture, "product-data");
  await mkdir(root);

  await assert.rejects(validateProductPath(root, "bad\ud800.yaml"), expectCode("UNSAFE_PATH"));
});

test("Q02: path syntax rejects Win32-ambiguous names on every supported platform", async (t) => {
  const fixture = await temporaryDirectory(t, "eaw-product-portable-name-");
  const root = join(fixture, "product-data");
  await mkdir(root);

  for (const relative of ["CON", "NUL.yaml", "name.", "name "]) {
    await assert.rejects(validateProductPath(root, relative), expectCode("UNSAFE_PATH"), relative);
  }
});

function schemaExample(node, definitions, definitionName) {
  const examples = {
    Uuid: UUID,
    Digest: DIGEST,
    Artifact: "prd",
    ElementId: ELEMENT_ID,
    RelativePath: "documents/item.json",
    TaskId: TASK_ID,
  };
  if (definitionName && Object.hasOwn(examples, definitionName)) return examples[definitionName];
  if (node.$ref) {
    const name = node.$ref.split("/").at(-1);
    return schemaExample(definitions[name], definitions, name);
  }
  if (Object.hasOwn(node, "const")) return node.const;
  if (node.enum) return node.enum[0];
  if (node.anyOf) {
    const nullable = node.anyOf.find((choice) => choice.type === "null");
    return nullable ? null : schemaExample(node.anyOf[0], definitions);
  }
  if (node.oneOf) return schemaExample(node.oneOf[0], definitions);
  if (node.type === "object" || node.properties) {
    return Object.fromEntries((node.required ?? []).map((name) => [
      name,
      schemaExample(node.properties[name], definitions),
    ]));
  }
  if (node.type === "array") {
    return Array.from({ length: node.minItems ?? 0 }, () => schemaExample(node.items, definitions));
  }
  if (node.type === "integer" || node.type === "number") return node.minimum ?? 0;
  if (node.type === "boolean") return false;
  if (node.type === "null") return null;
  if (node.type === "string") return "x";
  assert.fail(`No fixture rule for ${JSON.stringify(node)}`);
}

function records() {
  const ref = { product_id: UUID, artifact: "prd", element_id: ELEMENT_ID };
  const decisionRef = { product_id: UUID, artifact: "prd", id: UUID_2, revision: 1 };
  const recordObject = { id: UUID, object_sha256: DIGEST };
  const sourcePin = {
    product_id: UUID,
    artifact: "prd",
    source_kind: "markdown",
    source_id: UUID_2,
    generation: DIGEST,
    object_sha256: DIGEST_2,
    element_ids: [ELEMENT_ID],
    decision_ref: null,
  };
  const scope = { depth: "standard", profiles: [], rationale: ["Product foundation."], confirmed_answer: null };
  return {
    Store: { schema_version: 1, kind: "store", store_id: UUID, products: [], workspaces: [] },
    Ref: ref,
    SourcePin: sourcePin,
    Generation: {
      schema_version: 1,
      kind: "generation",
      product_id: UUID,
      parent: null,
      registry: recordObject,
      ready_artifacts: [],
      decision_heads: [],
      relations: [],
    },
    Candidate: {
      schema_version: 1,
      kind: "candidate",
      product_id: UUID,
      candidate_id: UUID_2,
      artifact: "prd",
      base_generation: null,
      workspace_id: UUID,
      state: "draft",
      scope,
      registry: recordObject,
      upstream_pins: [],
      decision_heads: [],
      relations: [],
      source_version: DIGEST,
    },
    Operation: {
      schema_version: 1,
      kind: "operation",
      id: UUID,
      product_id: UUID_2,
      request_digest: DIGEST,
      base_revision: null,
      phase: "prepared",
      owner: { session_id: UUID, pid: 1 },
      targets: [],
      result_sha256: null,
      blocker: null,
      scenario: "product_initialize",
      intent_sha256: DIGEST_2,
    },
    WorkspaceBinding: {
      schema_version: 1,
      kind: "workspace_binding",
      workspace_id: UUID,
      product_id: UUID_2,
      canonical_workspace: "/workspace",
      canonical_git_common_dir: null,
      location_fingerprint: DIGEST,
      confirmed_by: { text: "Bind this workspace.", source: "fixture" },
    },
    TaskBinding: {
      schema_version: 1,
      kind: "task_binding",
      product_id: UUID,
      task_id: TASK_ID,
      specification_id: UUID_2,
      specification_slug: "product-foundation",
      workspace_id: UUID,
      reservation_operation: UUID_2,
      state: "reserved",
      owner_session: null,
      current_packet: null,
      product_pins: [],
      product_source_version: null,
      specification_source_version: null,
      specification_version: null,
      specification_review_ref: null,
      plan_pins: [],
      safety_blocks: [],
      completed_packets: [],
    },
    Decision: {
      schema_version: 1,
      kind: "decision",
      ref: decisionRef,
      state: "observed",
      category: "foundation",
      question: null,
      text: "Observed product constraint.",
      source: "fixture",
      selected_ids: [],
      predecessors: [],
      affected_refs: [ref],
      reconsider_when: null,
      candidate_id: UUID,
    },
    Review: {
      schema_version: 1,
      kind: "review",
      id: UUID,
      candidate_ref: { product_id: UUID, candidate_id: UUID_2 },
      source_version: DIGEST,
      mode: "full",
      parent: null,
      coverage: "pending",
      inventory_sha256: DIGEST_2,
      verdict_objects: [],
      consistency_receipt: null,
    },
    ContextSelection: {
      schema_version: 1,
      kind: "context_selection",
      product_id: UUID,
      purpose: "implementation",
      source_version: DIGEST,
      required: [sourcePin],
      optional: [],
      blockers: [],
      complete: true,
      next_cursor: null,
      required_total: 1,
      optional_total: 0,
    },
    Head: { schema_version: 1, kind: "head", product_id: UUID, generation: DIGEST, operation_id: UUID_2 },
    Lock: { schema_version: 1, kind: "lock", operation_id: UUID, session_id: UUID_2, pid: 1, expected_revision: null },
    ElementMetadata: {
      ref,
      semantic_type: "PrdGoal",
      applicability: { state: "current", stage_refs: [], global: true, reason: "Applies to the product." },
      provenance: [decisionRef],
      state: "active",
    },
    TaskId: TASK_ID,
  };
}

test("Q03: the published product schema compiles and validates strict state records", async () => {
  const source = await readFile(new URL("../../../shared/schemas/product.schema.json", import.meta.url), "utf8");
  const packed = await readFile(new URL("../dist/schemas/product.schema.json", import.meta.url), "utf8");
  assert.equal(packed, source);

  const schema = JSON.parse(source);
  assert.equal(schema.title, "Product workflow contract");
  assert.match(schema.description, /authoritative runtime schema/i);
  const ajv = new Ajv({ allErrors: true, jsonPointers: true });
  assert.doesNotThrow(() => ajv.compile(schema));

  const requiredDefinitions = [
    "Store", "Ref", "SourcePin", "Generation", "Candidate", "Operation",
    "WorkspaceBinding", "TaskBinding", "SafetyBlock", "Decision", "Registry", "Review", "Verdict", "ContextSelection",
    "Head", "Lock", "ElementMetadata", "TaskId",
  ];
  const successDefinitions = Object.keys(schema.definitions).filter((name) => name.startsWith("Success_"));
  assert.ok(successDefinitions.length > 0);
  assert.deepEqual(new Set(PRODUCT_RECORD_DEFINITIONS), new Set([...requiredDefinitions, ...successDefinitions]));
  for (const name of [...requiredDefinitions, ...successDefinitions]) {
    assert.doesNotThrow(() => ajv.compile({ definitions: schema.definitions, $ref: `#/definitions/${name}` }), name);
  }

  for (const [name, value] of Object.entries(records())) {
    try {
      assert.deepEqual(await validateProductRecord(name, value), value, name);
    } catch (error) {
      assert.fail(`${name}: ${error instanceof Error ? error.message : String(error)} ${JSON.stringify(error?.details ?? {})}`);
    }
  }
  for (const name of successDefinitions) {
    const value = schemaExample(schema.definitions[name], schema.definitions, name);
    try {
      assert.deepEqual(await validateProductRecord(name, value), value, name);
    } catch (error) {
      assert.fail(`${name}: ${error instanceof Error ? error.message : String(error)} ${JSON.stringify(error?.details ?? {})}`);
    }
  }
});

test("Q03: strict validation rejects unknown fields, missing versions and invalid references", async () => {
  const valid = records();
  await assert.rejects(
    validateProductRecord("Store", { ...valid.Store, unexpected: true }),
    expectCode("INVALID_STATE"),
  );
  const missingVersion = { ...valid.Operation };
  delete missingVersion.schema_version;
  await assert.rejects(validateProductRecord("Operation", missingVersion), expectCode("INVALID_STATE"));
  await assert.rejects(
    validateProductRecord("SourcePin", { ...valid.SourcePin, product_id: "foreign" }),
    expectCode("INVALID_STATE"),
  );
  await assert.rejects(
    validateProductRecord("SourcePin", {
      ...valid.SourcePin,
      source_kind: "decision",
      decision_ref: null,
    }),
    expectCode("INVALID_STATE"),
  );
  await assert.rejects(validateProductRecord("NotAContract", {}), expectCode("UNSUPPORTED_VERSION"));
});

test("Q03: strict validation rejects invalid Unicode scalar values", async () => {
  const valid = records();
  await assert.rejects(
    validateProductRecord("Decision", { ...valid.Decision, text: "bad\ud800text" }),
    expectCode("INVALID_STATE"),
  );
});
