import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import test, { before, after } from "node:test";
import { createSharedStdioHarness } from "../test-support/stdio-harness.mjs";

const server = createSharedStdioHarness({
  entrypoint: process.env.DESIGN_TOKEN_SCOPE_ENTRYPOINT ?? fileURLToPath(new URL("../dist/main.js", import.meta.url)),
  name: "design-token-scope",
});
before(() => server.start());
after(() => server.close());

async function call(name, args) {
  const response = await server.callTool({ name, arguments: args });
  assert.notEqual(response.isError, true, JSON.stringify(response));
  return response.structuredContent;
}

async function fixture(t) {
  const project = await mkdtemp(join(tmpdir(), "design-token-scope-"));
  t.after(() => rm(project, { recursive: true, force: true }));
  return { ...await call("specification_open", { project, specification: "settings" }), project };
}

function proposal(context, artifacts) {
  return { context, depth: "standard", rationale: ["Explicit shared design outputs."],
    profiles: [{ id: "ui", reason: "Settings interface." }], artifacts };
}

test("explicit design tokens survive scope confirmation and read-back", async (t) => {
  let state = await fixture(t);
  const project = state.project;
  state = await call("scope_propose", proposal(state.context,
    ["shared_design", "design_tokens", "screen_design"]));
  const expected = ["design/system/catalog.yaml", "design/system/library.penpot",
    "design/system/tokens.tokens.json", "design/specs/settings/experience.yaml",
    "design/specs/settings/screens.penpot"];
  assert.deepEqual(state.result.proposal.project_artifacts, expected);
  const proposalRef = state.result.question_ref;
  state = await call("question_record_answer", { context: state.context,
    question_ref: proposalRef, selected_ids: ["confirm"],
    text: "Confirm these exact design paths.", source: "fixture-customer:design-tokens" });
  state = await call("scope_confirm", { context: state.context,
    proposal_ref: proposalRef, answer_ref: state.result.decision_ref });
  state = await call("scope_get", { context: state.context });
  assert.deepEqual(state.result.manifest.project_artifacts, expected);
  assert.equal(state.result.pending, null);
  await writeFile(join(project, "docs/specs/settings/spec.md"), "# Settings\n\nStatus: Approved\n");
  state = await call("specification_open", { project, specification: "settings" });
  state = await call("design_system_connect", { context: state.context,
    instance: "https://design.example.invalid", team_id: "team-1",
    project_id: "project-1", file_id: "library-1" });
  await writeFile(join(project, "design/system/tokens.tokens.json"), JSON.stringify({
    color: { primary: { $type: "color", $value: "#123456" } },
  }));
  state = await call("design_system_register_tokens", { context: state.context,
    filename: "tokens.tokens.json" });
  assert.equal(state.result.registered, true);
  assert.match(await readFile(join(project, "design/system/catalog.yaml"), "utf8"),
    /path: design\/system\/tokens\.tokens\.json/);
});

test("shared design does not implicitly authorize a token export", async (t) => {
  const opened = await fixture(t);
  const state = await call("scope_propose", proposal(opened.context, ["shared_design"]));
  assert.deepEqual(state.result.proposal.project_artifacts,
    ["design/system/catalog.yaml", "design/system/library.penpot"]);
});

test("token export requires the shared library declaration", async (t) => {
  const opened = await fixture(t);
  const response = await server.callTool({ name: "scope_propose",
    arguments: proposal(opened.context, ["design_tokens"]) });
  assert.equal(response.isError, true);
  assert.equal(response.structuredContent.error.code, "INVALID_INPUT");
  const state = await call("scope_get", { context: opened.context });
  assert.equal(state.result.pending, null);
  for (const filename of ["decisions.yaml", "manifest.yaml"]) {
    await assert.rejects(readFile(join(opened.project, "docs/specs/settings", filename)), { code: "ENOENT" });
  }
});

test("token export without active UI rejects atomically after an existing proposal", async (t) => {
  const opened = await fixture(t);
  const existing = await call("scope_propose", proposal(opened.context, ["shared_design", "screen_design"]));
  assert.deepEqual(existing.result.proposal.project_artifacts, [
    "design/system/catalog.yaml", "design/system/library.penpot",
    "design/specs/settings/experience.yaml", "design/specs/settings/screens.penpot",
  ]);
  const journal = join(opened.project, "docs/specs/settings/decisions.yaml");
  const before = await readFile(journal);
  const response = await server.callTool({ name: "scope_propose", arguments: {
    ...proposal(existing.context, ["shared_design", "design_tokens"]),
    profiles: [{ id: "core", reason: "No UI in scope." }],
  } });
  assert.equal(response.isError, true);
  assert.equal(response.structuredContent.error.code, "INVALID_INPUT");
  assert.deepEqual(await readFile(journal), before);
  const state = await call("scope_get", { context: existing.context });
  assert.equal(state.context, existing.context);
  assert.deepEqual(state.result.pending, existing.result.question_ref);
});

test("discovery exposes the explicit token artifact", async () => {
  const tools = await server.listTools();
  const scope = tools.tools.find((tool) => tool.name === "scope_propose");
  assert.ok(scope.inputSchema.properties.artifacts.items.enum.includes("design_tokens"));
});
