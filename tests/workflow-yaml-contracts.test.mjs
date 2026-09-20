import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import Ajv from "ajv";
import { parseDocument } from "yaml";
import { projectRoot } from "./lib/fixtures.mjs";

async function validator(name) {
  const schema = JSON.parse(await fs.readFile(path.join(projectRoot, "shared/schemas", `${name}.schema.json`), "utf8"));
  return new Ajv({ allErrors: true }).compile(schema);
}

async function example(name) {
  const document = parseDocument(await fs.readFile(path.join(projectRoot, "skills/design-planning/assets/penpot", `${name}.example.yaml`), "utf8"), { uniqueKeys: true });
  assert.deepEqual(document.errors, []);
  return document.toJS();
}

test("manifest schema accepts existing scope and rejects invalid design authorization", async () => {
  const valid = await validator("manifest");
  const base = { schema_version: 1, depth: "lite", confirmed: true, rationale: ["A local configuration change."], profiles: [{ id: "core", state: "active", reason: "Configuration behavior." }], planning_artifacts: [] };
  assert.equal(valid(base), true, JSON.stringify(valid.errors));
  for (const change of [
    copy => { copy.confirmed = "true"; },
    copy => { copy.depth = "unknown"; },
    copy => { copy.profiles[0].id = "visual"; },
    copy => { copy.project_artifacts = ["design/specs/example/experience.yaml"]; },
    copy => { copy.planning_artifacts = ["../outside.yaml"]; },
    copy => { copy.project_artifact = []; },
  ]) {
    const copy = structuredClone(base); change(copy);
    assert.equal(valid(copy), false, "A malformed scope must not authorize design work.");
  }
  const ui = await example("manifest");
  assert.equal(valid(ui), true, JSON.stringify(valid.errors));
  for (const artifact of ["/design/system/a.yaml", "design/system/../a.yaml", "design/system/*.yaml", "src/app.yaml", "design/system/"]) {
    const copy = structuredClone(ui); copy.project_artifacts = [artifact];
    assert.equal(valid(copy), false, artifact);
  }
});

test("decision schema fixes question and answer shapes without rewriting legacy metadata", async () => {
  const valid = await validator("decisions");
  const decision = { id: "ui.direction", revision: 1, category: "behavior", state: "needs_user", provenance: "agent", question: { text: "Which direction?", kind: "free_text", options: [] }, answer: null, requirement_ids: [] };
  const root = { schema_version: 1, spec_slug: "example", decisions: [decision] };
  assert.equal(valid(root), true, JSON.stringify(valid.errors));
  for (const change of [
    copy => { copy.decisions[0].provenance = { kind: "agent" }; },
    copy => { copy.decisions[0].revision = 0; },
    copy => { copy.decisions[0].answer = "yes"; },
    copy => { copy.decisions[0].answer = { text: "yes" }; },
    copy => { copy.decisions[0].question.options = ["yes"]; },
  ]) { const copy = structuredClone(root); change(copy); assert.equal(valid(copy), false); }
  const legacy = structuredClone(root); legacy.decisions[0].legacy_context = { note: "Preserve existing metadata." };
  assert.equal(valid(legacy), true);
});

test("design schemas reject fake verification and incomplete component or behavior records", async () => {
  for (const name of ["catalog", "experience"]) {
    const valid = await validator(name);
    const base = await example(name);
    assert.equal(valid(base), true, JSON.stringify(valid.errors));
    const verified = structuredClone(base); verified.snapshot.status = "verified";
    assert.equal(valid(verified), false, "A verified snapshot requires a digest.");
    const unknown = structuredClone(base); unknown.snapshot.hash = "a".repeat(64);
    assert.equal(valid(unknown), false, "Misspelled fields must not be ignored.");
    const incomplete = structuredClone(base);
    if (name === "catalog") delete incomplete.components[0].variants[0].main_component_id;
    else delete incomplete.screens[0].actions[0].to;
    assert.equal(valid(incomplete), false);
  }
});

test("all connected workflows ship byte-identical local schemas in both host bundles", async () => {
  for (const name of ["manifest", "decisions", "catalog", "experience"]) {
    const relative = `shared/schemas/${name}.schema.json`;
    const canonical = await fs.readFile(path.join(projectRoot, relative), "utf8");
    for (const host of ["codex", "claude-code"]) {
      for (const skill of ["spec-driven-development", "planning-and-task-breakdown", "design-planning", "incremental-implementation"]) {
        assert.equal(await fs.readFile(path.join(projectRoot, "plugins", host, "engineer-agent-workflows/skills", skill, relative), "utf8"), canonical);
      }
    }
  }
});

test("current repository manifests conform without automatic migration", async () => {
  const valid = await validator("manifest");
  for (const slug of ["cross-client-skill-distribution", "decision-ledger-mcp"]) {
    const source = await fs.readFile(path.join(projectRoot, "docs/specs", slug, "manifest.yaml"), "utf8");
    const doc = parseDocument(source, { uniqueKeys: true });
    assert.deepEqual(doc.errors, []);
    assert.equal(valid(doc.toJS()), true, JSON.stringify(valid.errors));
  }
});
