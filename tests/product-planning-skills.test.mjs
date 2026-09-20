import assert from "node:assert/strict";
import { access, cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { workflowTools } from "../packages/engineer-agent-workflow-mcp/dist/server.js";
import { readCatalog } from "../scripts/lib/catalog.mjs";
import {
  layoutPaths as productWorkflowLayoutPaths,
  verifyProductWorkflowBundle,
} from "../shared/scripts/verify-product-workflow.mjs";
import { projectRoot } from "./lib/fixtures.mjs";

const PRODUCT_SKILLS = Object.freeze([
  "idea-refine",
  "product-definition",
  "technical-design",
  "product-roadmap",
]);
const PROFILE_IDS = Object.freeze([
  "core",
  "backend",
  "data",
  "security",
  "ui",
  "events",
  "operations",
  "cross-surface",
]);
const read = relativePath => readFile(path.join(projectRoot, relativePath), "utf8");

async function productBundle(t, sourceRoot = path.join(projectRoot, "skills")) {
  const root = await mkdtemp(path.join(tmpdir(), "product-planning-bundle-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const skillsRoot = path.join(root, "skills");
  await Promise.all(
    PRODUCT_SKILLS.map(skill =>
      cp(path.join(sourceRoot, skill), path.join(skillsRoot, skill), {
        recursive: true,
      }),
    ),
  );
  return Object.fromEntries(
    PRODUCT_SKILLS.map(skill => [skill, path.join(skillsRoot, skill)]),
  );
}

test("P15 registers the four-stage product authoring chain", async () => {
  const catalog = await readCatalog(projectRoot);
  assert.equal(catalog.skills.length, 16);
  const technical = catalog.skills.find(skill => skill.name === "technical-design");
  const roadmap = catalog.skills.find(skill => skill.name === "product-roadmap");

  assert.ok(technical);
  assert.equal(technical.classification, "bundle-required");
  assert.deepEqual(technical.dependencies, ["product-definition"]);
  assert.equal(technical.policies.codex.allowImplicitInvocation, false);
  assert.equal(technical.policies.claude.disableModelInvocation, true);

  assert.ok(roadmap);
  assert.equal(roadmap.classification, "bundle-required");
  assert.deepEqual(roadmap.dependencies, ["product-definition", "technical-design"]);
  assert.equal(roadmap.policies.codex.allowImplicitInvocation, false);
  assert.equal(roadmap.policies.claude.disableModelInvocation, true);
});

test("P15 skills require exact ready inputs and stop before downstream work", async () => {
  const [technical, roadmap, protocol] = await Promise.all([
    read("skills/technical-design/SKILL.md"),
    read("skills/product-roadmap/SKILL.md"),
    read("shared/references/product-workflow.md"),
  ]);

  assert.match(technical, /exact ready PRD[^\n]*source pin/iu);
  assert.match(technical, /product_artifact_draft[^\n]*technical-design/iu);
  assert.match(technical, /product_context_prepare[^\n]*technical-design/iu);
  assert.match(technical, /technical_define_boundary/u);
  assert.match(technical, /technical_define_technology/u);
  assert.match(technical, /technical_define_policy/u);
  assert.match(technical, /shared boundar|cross-cutting/iu);
  assert.match(technical, /not[^\n]*local algorithm/iu);
  assert.match(technical, /stop before Product Roadmap/iu);
  assert.match(technical, /never invoke it\s+automatically/iu);

  assert.match(roadmap, /exact ready PRD[^\n]*Technical Design[^\n]*source pins/iu);
  assert.match(roadmap, /product_artifact_draft[^\n]*roadmap/iu);
  assert.match(roadmap, /product_context_prepare[^\n]*product-roadmap/iu);
  for (const tool of [
    "roadmap_define_stage",
    "roadmap_define_epic",
    "roadmap_define_story",
    "roadmap_define_task",
  ]) {
    assert.match(roadmap, new RegExp(tool, "u"));
  }
  assert.match(roadmap, /Lite[^\n]*(compact|bounded)/iu);
  assert.match(roadmap, /far[^\n]*stage[^\n]*coarse/iu);
  assert.match(roadmap, /technical task[^\n]*(not|without)[^\n]*(fake|user stor)/iu);
  assert.match(roadmap, /stop before[^\n]*(specification|task execution)/iu);
  assert.match(roadmap, /never invoke[^\n]*automatically/iu);

  for (const document of [technical, roadmap, protocol]) {
    assert.doesNotMatch(document, /mcp__engineer_agent_workflow/u);
    assert.match(document, /returned context/iu);
    assert.match(document, /product_candidate_check/u);
    assert.match(document, /product_review_start/u);
    assert.match(document, /independent reviewer/iu);
  }
});

test("P15 routes only confirmed active profiles through the shared source", async () => {
  const documents = await Promise.all([
    read("skills/technical-design/SKILL.md"),
    read("skills/product-roadmap/SKILL.md"),
  ]);

  for (const document of documents) {
    assert.match(
      document,
      /Do not read any profile reference before[\s\S]+product_scope_confirm/iu,
    );
    assert.match(document, /read only[\s\S]+active profile/iu);
    for (const profile of PROFILE_IDS) {
      assert.match(
        document,
        new RegExp(`idea-refine/references/product-profiles/${profile}\\.md`, "u"),
      );
    }
  }
});

test("P15 Q33 exposes typed technical and roadmap scenario tools", () => {
  const expected = [
    "technical_define_boundary",
    "technical_define_policy",
    "technical_define_technology",
    "roadmap_define_stage",
    "roadmap_define_epic",
    "roadmap_define_story",
    "roadmap_define_task",
  ];
  const selected = workflowTools.filter(tool => expected.includes(tool.name));
  assert.deepEqual(selected.map(tool => tool.name).sort(), expected.toSorted());
  for (const tool of selected) {
    assert.equal(tool.schemaKind, "json");
    assert.equal(tool.write, true);
    assert.equal(tool.destructive, true);
    assert.deepEqual(tool.inputSchema.required, [
      "context",
      "candidate_ref",
      "subject",
      "value",
    ]);
    assert.equal(tool.outputSchema.type, "object");
  }

  const draft = workflowTools.find(tool => tool.name === "product_artifact_draft");
  assert.ok(draft);
  assert.deepEqual(draft.inputSchema.required, ["context", "artifact", "upstream_pins"]);
  assert.deepEqual(draft.inputSchema.definitions.Artifact.enum, [
    "idea",
    "prd",
    "technical-design",
    "roadmap",
  ]);
  assert.equal(draft.inputSchema.properties.upstream_pins.type, "array");

  const task = workflowTools.find(tool => tool.name === "roadmap_define_task");
  assert.ok(task);
  const taskSchema = task.inputSchema.definitions.Task;
  assert.deepEqual(taskSchema.properties.kind.enum, ["feature", "technical", "research"]);
  assert.ok(taskSchema.required.includes("story_ref"));
  assert.ok(taskSchema.properties.story_ref.anyOf.some(entry => entry.type === "null"));
});

test("P15 product bundle verifier covers every required upstream skill", async t => {
  const bundle = await productBundle(t);
  const technical = await verifyProductWorkflowBundle(bundle["technical-design"]);
  assert.equal(technical.callerSkill, "technical-design");
  assert.deepEqual(technical.dependencySkills, ["idea-refine", "product-definition"]);

  const roadmap = await verifyProductWorkflowBundle(bundle["product-roadmap"]);
  assert.equal(roadmap.callerSkill, "product-roadmap");
  assert.deepEqual(roadmap.dependencySkills, [
    "idea-refine",
    "product-definition",
    "technical-design",
  ]);

  const productDefinitionDocument = path.join(
    bundle["product-definition"],
    "SKILL.md",
  );
  const originalDocument = await readFile(productDefinitionDocument, "utf8");
  await writeFile(
    productDefinitionDocument,
    `${originalDocument}\n<!-- changed installed skill -->\n`,
    "utf8",
  );
  await assert.rejects(
    verifyProductWorkflowBundle(bundle["product-roadmap"]),
    error => error?.code === "E_PRODUCT_BUNDLE_MISMATCH",
  );
  await writeFile(productDefinitionDocument, originalDocument, "utf8");

  await rm(bundle["product-definition"], { recursive: true, force: true });
  await assert.rejects(
    verifyProductWorkflowBundle(bundle["product-roadmap"]),
    error => error?.code === "E_PRODUCT_BUNDLE_LAYOUT",
  );
});

test("P15 product bundle layout remains portable", () => {
  const posix = productWorkflowLayoutPaths(
    "/opt/agents/skills/product-roadmap",
    path.posix,
  );
  assert.deepEqual(posix.dependencySkills, [
    "/opt/agents/skills/idea-refine",
    "/opt/agents/skills/product-definition",
    "/opt/agents/skills/technical-design",
  ]);

  const windows = productWorkflowLayoutPaths(
    "C:\\Users\\user\\.agents\\skills\\technical-design",
    path.win32,
  );
  assert.deepEqual(windows.dependencySkills, [
    "C:\\Users\\user\\.agents\\skills\\idea-refine",
    "C:\\Users\\user\\.agents\\skills\\product-definition",
  ]);
});

test("P15 generated bundles are host-isolated, complete, and size-bounded", async () => {
  const roots = {
    codex: "plugins/codex/engineer-agent-workflows",
    claude: "plugins/claude-code/engineer-agent-workflows",
  };

  for (const [host, root] of Object.entries(roots)) {
    for (const skill of ["technical-design", "product-roadmap"]) {
      const relative = `${root}/skills/${skill}/SKILL.md`;
      const bytes = await readFile(path.join(projectRoot, relative));
      const document = bytes.toString("utf8");
      assert.ok(bytes.byteLength <= 4096, `${relative} exceeds 4096 UTF-8 bytes`);
      assert.doesNotMatch(document, /\{\{HOST_/u);
      assert.match(document, host === "codex" ? /request_user_input/u : /AskUserQuestion/u);
      assert.doesNotMatch(document, host === "codex" ? /AskUserQuestion/u : /request_user_input/u);
      await access(
        path.join(projectRoot, root, "skills", skill, "shared", "references", "product-workflow.md"),
      );
    }
    await verifyProductWorkflowBundle(
      path.join(projectRoot, root, "skills", "product-roadmap"),
    );
  }

  await access(
    path.join(
      projectRoot,
      roots.codex,
      "skills",
      "product-roadmap",
      "agents",
      "openai.yaml",
    ),
  );
  await assert.rejects(
    access(
      path.join(
        projectRoot,
        roots.claude,
        "skills",
        "product-roadmap",
        "agents",
        "openai.yaml",
      ),
    ),
    error => error?.code === "ENOENT",
  );
});

test("P15 generated bundle markers bind rendered skill documents", async t => {
  for (const root of [
    "plugins/codex/engineer-agent-workflows",
    "plugins/claude-code/engineer-agent-workflows",
  ]) {
    const bundle = await productBundle(
      t,
      path.join(projectRoot, root, "skills"),
    );
    await verifyProductWorkflowBundle(bundle["product-roadmap"]);
    const productDefinitionDocument = path.join(
      bundle["product-definition"],
      "SKILL.md",
    );
    const document = await readFile(productDefinitionDocument, "utf8");
    await writeFile(
      productDefinitionDocument,
      `${document}\n<!-- changed rendered skill -->\n`,
      "utf8",
    );
    await assert.rejects(
      verifyProductWorkflowBundle(bundle["product-roadmap"]),
      error => error?.code === "E_PRODUCT_BUNDLE_MISMATCH",
    );
  }
});
