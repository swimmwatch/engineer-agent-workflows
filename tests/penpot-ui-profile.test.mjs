import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { parseDocument } from "yaml";
import { validateRelativePath } from "../scripts/lib/files.mjs";
import { projectRoot } from "./lib/fixtures.mjs";

const roots = [
  "skills/design-planning",
  "plugins/codex/engineer-agent-workflows/skills/design-planning",
  "plugins/claude-code/engineer-agent-workflows/skills/design-planning",
];
async function example(root, name) {
  const text = await fs.readFile(path.join(projectRoot, root, "assets/penpot", name), "utf8");
  const doc = parseDocument(text, { uniqueKeys: true });
  assert.deepEqual(doc.errors, []);
  return doc.toJS();
}
// These assertions validate published example relationships, not a live Penpot file.
function assertScreenSet(system, screenSet) {
  assert.equal(system.schema_version, 1);
  assert.equal(screenSet.schema_version, 1);
  assert.equal(screenSet.requirements_source, `docs/specs/${screenSet.specification}/spec.md`);
  assert.equal(screenSet.snapshot.path, `design/specs/${screenSet.specification}/screens.penpot`);
  assert.equal(screenSet.system.catalog, "design/system/catalog.yaml");
  assert.equal(screenSet.system.library_file_id, system.penpot.file_id);
  assert.equal(screenSet.system.snapshot_sha256, system.snapshot.sha256);
  const components = new Map(system.components.map(item => [item.id, item]));
  assert.equal(components.size, system.components.length);
  for (const screen of screenSet.screens) {
    assert.ok(screen.requirement_ids.length);
    assert.ok(screen.states.length);
    for (const instance of screen.instances) {
      const component = components.get(instance.component);
      assert.ok(component, "A screen must reference the shared component catalog.");
      assert.ok(component.variants.some(variant => variant.id === instance.variant));
      assert.equal(instance.library_file_id, system.penpot.file_id);
    }
    const states = new Set(screen.states.map(item => item.id));
    assert.equal(states.size, screen.states.length);
    for (const action of screen.actions) {
      assert.ok(states.has(action.from));
      assert.ok(states.has(action.to));
      assert.ok(action.requirement_ids.length);
    }
  }
}

test("Penpot templates preserve one shared component source across specification screen sets", async () => {
  for (const root of roots) {
    const system = await example(root, "catalog.example.yaml");
    const screenSet = await example(root, "experience.example.yaml");
    assertScreenSet(system, screenSet);
    for (const specification of ["account-settings", "checkout"]) {
      const copy = structuredClone(screenSet);
      copy.specification = specification;
      copy.requirements_source = `docs/specs/${specification}/spec.md`;
      copy.snapshot.path = `design/specs/${specification}/screens.penpot`;
      assertScreenSet(system, copy);
    }
    assert.equal(system.snapshot.status, "pending");
    assert.equal(system.snapshot.sha256, null);
    assert.equal(screenSet.snapshot.status, "pending");
    assert.equal(screenSet.snapshot.sha256, null, "Examples must not claim real export verification.");
    for (const artifact of [system.snapshot.path, screenSet.snapshot.path, screenSet.system.catalog]) {
      assert.equal(validateRelativePath(artifact), artifact);
      assert.ok(artifact.startsWith("design/"));
    }
  }
});

test("example relationship checks reject broken component links, transitions and snapshot pins", async () => {
  const system = await example(roots[0], "catalog.example.yaml");
  const screenSet = await example(roots[0], "experience.example.yaml");
  const mutations = [
    copy => { copy.system.library_file_id = "another-library"; },
    copy => { copy.screens[0].instances[0].component = "missing-component"; },
    copy => { copy.screens[0].instances[0].variant = "missing-variant"; },
    copy => { copy.screens[0].instances[0].library_file_id = "detached"; },
    copy => { copy.screens[0].actions[0].to = "missing-state"; },
    copy => { copy.system.snapshot_sha256 = "a".repeat(64); },
    copy => { copy.snapshot.path = "design/specs/other/screens.penpot"; },
    copy => { copy.requirements_source = "docs/specs/other/spec.md"; },
  ];
  for (const mutate of mutations) {
    const copy = structuredClone(screenSet);
    mutate(copy);
    assert.throws(() => assertScreenSet(system, copy), assert.AssertionError);
  }
});

test("manifest examples distinguish specification-local outputs from bounded project design outputs", async () => {
  for (const root of roots) {
    const manifest = await example(root, "manifest.example.yaml");
    assert.deepEqual(manifest.planning_artifacts, []);
    assert.equal(manifest.confirmed, false, "A template cannot supply scope approval.");
    const paths = manifest.project_artifacts;
    assert.equal(new Set(paths).size, paths.length);
    assert.ok(paths.includes("design/system/catalog.yaml"));
    assert.ok(paths.includes("design/specs/account-settings/experience.yaml"));
    for (const artifact of paths) {
      assert.equal(validateRelativePath(artifact), artifact);
      assert.ok(artifact.startsWith("design/system/") || artifact.startsWith("design/specs/account-settings/"));
    }
  }
});

test("UI routing declares Penpot without loading its instructions for non-UI work", async () => {
  const scope = await fs.readFile(path.join(projectRoot, "skills/spec-driven-development/references/adaptive-scope.md"), "utf8");
  const planning = await fs.readFile(path.join(projectRoot, "skills/planning-and-task-breakdown/references/adaptive-planning.md"), "utf8");
  assert.match(scope, /project_artifacts/);
  assert.match(planning, /project_artifacts/);
  for (const root of roots) {
    const profile = await fs.readFile(path.join(projectRoot, "skills/planning-and-task-breakdown/references/ui-planning.md"), "utf8");
    const workflow = await fs.readFile(path.join(projectRoot, root, "references/penpot-workflow.md"), "utf8");
    assert.match(profile, /manifest.*ui.*active/is);
    assert.match(profile, /design-planning/);
    assert.match(workflow, /linked.*instances/is);
    assert.match(workflow, /separately.*installed/is);
    assert.match(workflow, /Missing skills.*MCP.*block/is);
    assert.match(workflow, /read.back|read back/is);
  }
});
