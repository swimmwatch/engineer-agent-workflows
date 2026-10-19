import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import test, { after, before } from "node:test";
import { parse } from "yaml";
import { zipSync } from "fflate";

import { createSharedStdioHarness } from "../test-support/stdio-harness.mjs";

const entrypoint = fileURLToPath(new URL("../dist/main.js", import.meta.url));
const server = createSharedStdioHarness({ entrypoint, name: "workflow-e2e" });

before(() => server.start());
after(() => server.close());

async function connect(t) {
  const isolated = createSharedStdioHarness({ entrypoint, name: "workflow-e2e-isolated" });
  await isolated.start();
  t.after(() => isolated.close());
  return isolated;
}
async function fixture(t) {
  const project = await mkdtemp(join(tmpdir(), "workflow-scenarios-"));
  t.after(() => rm(project, { recursive: true, force: true }));
  const client = server;
  async function call(name, args = {}, failure) {
    const response = await client.callTool({ name, arguments: args });
    if (failure) {
      assert.equal(response.isError, true, JSON.stringify(response));
      assert.equal(response.structuredContent.error.code, failure, JSON.stringify(response));
      return response.structuredContent;
    }
    assert.notEqual(response.isError, true, JSON.stringify(response));
    assert.ok(Buffer.byteLength(JSON.stringify(response)) <= 65536);
    return response.structuredContent;
  }
  return { project, client, call };
}
async function designFixture(t) {
  const f = await fixture(t);
  let state = await f.call("specification_open", { project: f.project, specification: "settings" });
  state = await f.call("scope_propose", { context: state.context, depth: "standard", rationale: ["Reusable settings UI."], profiles: [{ id: "core", reason: "App behavior." }, { id: "ui", reason: "Settings screen." }], artifacts: ["shared_design", "screen_design"] });
  const proposal = state.result.question_ref;
  state = await f.call("question_record_answer", { context: state.context, question_ref: proposal, selected_ids: ["confirm"], text: "Confirmed.", source: "fixture-customer:design-scope" });
  state = await f.call("scope_confirm", { context: state.context, proposal_ref: proposal, answer_ref: state.result.decision_ref });
  await writeFile(join(f.project, "docs/specs/settings/spec.md"), "Status: Approved\n\n- UI-001: Settings preserve input after failure.\n- UI-002: Save is keyboard accessible.\n");
  return { ...f, state };
}
test("CP1: scope confirmation, retry and restart through stdio", async (t) => {
  const { project, call } = await fixture(t);
  const opened = await call("specification_open", { project, specification: "small-cli" });
  assert.equal(opened.result.scope, "unconfirmed");
  const request = { context: opened.context, depth: "lite", rationale: ["One local CLI behavior."], profiles: [{ id: "core", reason: "Local CLI contract." }], artifacts: [] };
  const proposal = await call("scope_propose", request);
  const journal = join(project, "docs/specs/small-cli/decisions.yaml");
  assert.equal(parse(await readFile(journal, "utf8")).decisions.at(-1).state, "needs_user");
  const manifestPath = join(project, "docs/specs/small-cli/manifest.yaml");
  await assert.rejects(readFile(manifestPath), { code: "ENOENT" });
  await call("scope_confirm", { context: proposal.context, proposal_ref: proposal.result.question_ref }, "INVALID_INPUT");
  const answer = await call("question_record_answer", { context: proposal.context, question_ref: proposal.result.question_ref, selected_ids: ["confirm"], text: "Yes, this exact scope.", source: "fixture-customer:scope-1" });
  const confirmArgs = { context: answer.context, proposal_ref: proposal.result.question_ref, answer_ref: answer.result.decision_ref };
  const confirmed = await call("scope_confirm", confirmArgs);
  assert.equal(confirmed.result.confirmed, true);
  assert.equal(parse(await readFile(manifestPath, "utf8")).confirmed, true);
  assert.equal((await call("scope_confirm", confirmArgs)).replayed, true);
  const restarted = await connect(t);
  assert.equal((await restarted.callTool({ name: "scope_confirm", arguments: confirmArgs })).structuredContent.replayed, true);
  await writeFile(manifestPath, `${await readFile(manifestPath, "utf8")}\n# User note\n`);
  await call("scope_propose", { ...request, context: proposal.context }, "CONFLICT");
  assert.equal((await call("specification_open", { project, specification: "small-cli" })).result.scope, "confirmed");
  assert.deepEqual((await call("specification_list", { project })).result.items, ["small-cli"]);
});
test("CP1: invalid sources, strict inputs and isolated contexts", async (t) => {
  const { project, call } = await fixture(t);
  await call("specification_open", { project, specification: "../outside" }, "INVALID_INPUT");
  await call("specification_open", { project, specification: "safe", yaml: "injected" }, "INVALID_INPUT");
  const a = await call("specification_open", { project, specification: "alpha" });
  const b = await call("specification_open", { project, specification: "beta" });
  assert.notEqual(a.context, b.context);
  await mkdir(join(project, "docs/specs/alpha"), { recursive: true });
  await writeFile(join(project, "docs/specs/alpha/manifest.yaml"), "secret: invalid: source\n");
  const invalid = await call("scope_get", { context: a.context }, "INVALID_YAML");
  assert.ok(!JSON.stringify(invalid).includes("secret"));
});

test("CP2: unanswered interview recovery, revision history and bounded decision reads", async (t) => {
  const { project, call } = await fixture(t);
  let state = await call("specification_open", { project, specification: "interview" });
  state = await call("question_prepare", { context: state.context, category: "behavior", text: "What happens on failure?", options: [{ id: "retry", label: "Preserve input and retry" }] });
  const prepared = state.result.question_ref;
  state = await call("question_record_no_answer", { context: state.context, question_ref: prepared, outcome: "dismissed" });
  assert.equal(state.result.state, "needs_user");
  const recovered = await call("specification_open", { project, specification: "interview" });
  assert.equal(recovered.result.pending_count, 1);
  state = await call("question_record_answer", { context: recovered.context, question_ref: state.result.question_ref, selected_ids: ["retry"], text: "Keep input.", source: "fixture-customer:answer-2" });
  await mkdir(join(project, "docs/specs/interview"), { recursive: true });
  await writeFile(join(project, "docs/specs/interview/spec.md"), "Status: Approved\n\n- UI-001: Preserve input after errors.\n");
  state = await call("decision_link_requirements", { context: state.context, decision_ref: state.result.decision_ref, requirement_ids: ["UI-001"] });
  const linked = state.result.decision_ref;
  const found = await call("decision_find", { context: state.context, requirement_ids: ["UI-001"] });
  assert.equal(found.result.items.length, 1);
  const exact = await call("decision_get", { context: found.context, decision_ref: linked });
  assert.equal(JSON.parse(exact.result.text).answer.text, "Keep input.");
  state = await call("decision_record_fact", { context: found.context, fact: "Existing operation preserves input.", evidence: ["docs/specs/interview/spec.md"], category: "baseline" });
  await call("decision_record_assumption", { context: state.context, assumption: "No offline mode needed.", rationale: "No offline requirement.", reconsider_when: "An offline use case is requested.", category: "scope" });
  const file = join(project, "docs/specs/interview/decisions.yaml");
  const before = parse(await readFile(file, "utf8"));
  assert.deepEqual(before.decisions.slice(0, 4).map((d) => d.revision), [1, 2, 3, 4]);
  assert.equal(before.decisions.at(-1).state, "assumed");
  await writeFile(file, `${await readFile(file, "utf8")}\n# Keep this user comment\n`);
  state = await call("specification_open", { project, specification: "interview" });
  await call("question_prepare", { context: state.context, category: "behavior", text: "Replace the retry rule?", revises: linked });
  assert.ok((await readFile(file, "utf8")).includes("# Keep this user comment"));
  assert.deepEqual(parse(await readFile(file, "utf8")).decisions.slice(0, before.decisions.length), before.decisions);
});

test("boundary selection survives a non-answer and restart without creating sibling specifications", async (t) => {
  const { project, call } = await fixture(t);
  const target = { project, specification: "subscriptions" };
  const original = "Add subscriptions and payment, promotion codes, accounting exports, and colleague invitations with roles.";
  const question = "Specify subscriptions and payment now; retain promotion codes, accounting exports and invitations for later specifications?";
  let state = await call("specification_open", target);
  state = await call("decision_record_instruction", {
    context: state.context, category: "request", text: original,
    source: "fixture-customer:initial", kind: "initial_request",
  });
  const originalRef = state.result.decision_ref;
  state = await call("question_prepare", {
    context: state.context, category: "scope-boundary", text: question,
    options: [{ id: "subscriptions-first", label: "Subscriptions and payment first" }, { id: "change", label: "Change the boundary" }],
  });
  state = await call("question_record_no_answer", { context: state.context, question_ref: state.result.question_ref, outcome: "dismissed" });
  const pendingRef = state.result.question_ref;
  const directory = join(project, "docs/specs/subscriptions");
  const beforeResume = await readFile(join(directory, "decisions.yaml"));
  await assert.rejects(readFile(join(directory, "manifest.yaml")), { code: "ENOENT" });
  await assert.rejects(readFile(join(directory, "spec.md")), { code: "ENOENT" });

  const resumed = await connect(t);
  const response = await resumed.callTool({ name: "specification_open", arguments: target });
  assert.notEqual(response.isError, true);
  state = response.structuredContent;
  assert.equal(state.result.pending_count, 1);
  assert.deepEqual(state.result.pending_questions, [pendingRef]);
  const read = await call("decision_get", { context: state.context, decision_ref: pendingRef });
  const pending = JSON.parse(read.result.text);
  assert.equal(pending.question.text, question);
  assert.equal(pending.status, "dismissed");
  assert.equal(pending.answer, null);
  assert.deepEqual(await readFile(join(directory, "decisions.yaml")), beforeResume);

  const reply = "Subscriptions and payment now; keep the other three for later. Failed and duplicate callbacks must be safe.";
  state = await call("question_record_answer", {
    context: state.context, question_ref: pendingRef, selected_ids: ["subscriptions-first"],
    text: reply, source: "fixture-customer:boundary",
  });
  const boundaryRef = state.result.decision_ref;
  await call("scope_confirm", { context: state.context, proposal_ref: pendingRef, answer_ref: boundaryRef }, "ANSWER_REQUIRED");
  state = await call("scope_propose", {
    context: state.context, depth: "standard",
    rationale: ["Subscriptions and payment only; promotion codes, accounting exports and invitations are deferred by the saved boundary answer."],
    profiles: [{ id: "backend", reason: "Payment API and safe callbacks." }], artifacts: [],
  });
  const proposalRef = state.result.question_ref;
  state = await call("question_record_answer", {
    context: state.context, question_ref: proposalRef, selected_ids: ["confirm"],
    text: "Confirm this scope.", source: "fixture-customer:scope",
  });
  state = await call("scope_confirm", { context: state.context, proposal_ref: proposalRef, answer_ref: state.result.decision_ref });
  await writeFile(join(directory, "spec.md"), [
    "Status: Draft", "", "### PAY-001: Subscription payment",
    "Activate a paid subscription only after successful payment. Failed callbacks do not grant access; duplicate callbacks do not repeat activation.",
    "Acceptance: failed and repeated callbacks leave access consistent with one successful payment.",
    "", "### BOUNDARY-001: Deferred outcomes",
    "This specification adds no promotion codes, accounting exports or colleague invitations. These requests remain deferred for later specifications, not cancelled or forbidden in future work.",
    "Acceptance: the delivery introduces only the payment outcome; existing unrelated functionality is preserved.", "",
  ].join("\n"));
  state = await call("decision_link_requirements_batch", {
    context: state.context,
    items: [originalRef, boundaryRef].map((decision_ref) => ({ decision_ref, requirement_ids: ["PAY-001", "BOUNDARY-001"] })),
  });
  const linked = state.result.items.map((item) => item.decision_ref);
  const rawOriginal = await call("decision_get", { context: state.context, decision_ref: originalRef });
  assert.equal(JSON.parse(rawOriginal.result.text).instruction.text, original);
  const savedBoundary = await call("decision_get", { context: state.context, decision_ref: linked[1] });
  assert.equal(JSON.parse(savedBoundary.result.text).answer.text, reply);
  const boundarySources = await call("decision_find", { context: state.context, requirement_ids: ["BOUNDARY-001"] });
  assert.equal(boundarySources.result.items.length, 2);
  const review = await call("specification_review_start", { context: state.context, require_consistency: true });
  assert.equal(review.result.mechanical_status, "pass");
  let index = 0;
  const sources = [];
  do {
    let cursor, item, text = "";
    do {
      item = await call("specification_review_get", { context: review.context, review_ref: review.result.review_ref, item_index: index, ...(cursor ? { cursor } : {}) });
      text += item.result.text;
      cursor = item.result.next_cursor;
    } while (cursor);
    const payload = JSON.parse(text);
    if (payload.kind === "source") sources.push(payload.source);
    index = item.result.next_item_index;
  } while (index !== null);
  for (const reference of linked) {
    const source = sources.find((entry) => entry.id === reference.id);
    assert.ok(source, "Every boundary source must remain in independent review evidence");
    assert.ok(!source.context_reason);
    assert.deepEqual(source.requirement_ids, ["PAY-001", "BOUNDARY-001"]);
  }
  assert.deepEqual((await call("specification_list", { project })).result.items, ["subscriptions"]);
});

test("CP3: shared components, variants, bounded lookup and real export prerequisite", async (t) => {
  const f = await designFixture(t);
  let state = await f.call("design_system_connect", { context: f.state.context, instance: "https://design.example.invalid", team_id: "team-1", project_id: "project-1", file_id: "library-1" });
  state = await f.call("component_register", { context: state.context, name: "Primary button", purpose: "Submit the form.", accessibility: "Accessible name and visible focus.", variant_name: "Default", main_component_id: "main-1" });
  const component = state.result.component_id;
  state = await f.call("component_add_variant", { context: state.context, component_id: component, name: "Disabled", main_component_id: "main-2", axes: { state: "disabled" } });
  state = await f.call("component_set_allowed_overrides", { context: state.context, component_id: component, allowed_overrides: ["label"] });
  const found = await f.call("component_find", { context: state.context, query: "Submit" });
  assert.equal(found.result.items.length, 1);
  const exact = await f.call("component_get", { context: found.context, component_id: component });
  assert.equal(exact.result.component.variants.length, 2);
  await f.call("design_system_register_export", { context: exact.context, export_evidence: "fixture:export", import_evidence: "fixture:import", inspection_evidence: "fixture:visual" }, "PREREQUISITE_REQUIRED");
  const catalog = parse(await readFile(join(f.project, "design/system/catalog.yaml"), "utf8"));
  assert.equal(catalog.snapshot.status, "pending");
  assert.equal(catalog.snapshot.sha256, null);
  state = await f.call("component_variant_remove", { context: exact.context, component_id: component, variant_id: state.result.variant_id ?? "disabled" });
  assert.equal(state.result.removed, "disabled");
  await f.call("component_variant_remove", { context: state.context, component_id: component, variant_id: "default" }, "DEPENDENCY_EXISTS");
});

test("CP4: screen behavior, linked instances and dependency-safe removal through stdio", async (t) => {
  const f = await designFixture(t);
  let state = await f.call("design_system_connect", { context: f.state.context, instance: "https://design.example.invalid", team_id: "team-1", project_id: "project-1", file_id: "library-1" });
  state = await f.call("component_register", { context: state.context, name: "Button", purpose: "Save settings.", accessibility: "Visible keyboard focus.", variant_name: "Default", main_component_id: "main-1" });
  state = await f.call("component_set_allowed_overrides", { context: state.context, component_id: "button", allowed_overrides: ["label"] });
  state = await f.call("screen_create", { context: state.context, name: "Settings", file_id: "screens-1", page_id: "page-1", board_id: "board-1", requirement_ids: ["UI-001"], initial_state: "Editing", visible: "Editable fields." });
  state = await f.call("screen_add_state", { context: state.context, screen_id: "settings", name: "Failed", visible: "Error and preserved input.", focus: "Error summary." });
  state = await f.call("screen_add_transition", { context: state.context, screen_id: "settings", name: "Failure", from: "editing", to: "failed", trigger: "Save fails.", requirement_ids: ["UI-001"] });
  await f.call("screen_state_remove", { context: state.context, screen_id: "settings", state_id: "failed" }, "DEPENDENCY_EXISTS");
  const place = { context: state.context, screen_id: "settings", name: "Save", element_id: "element-1", component_id: "button", variant_id: "default", overrides: { label: "Save" } };
  await f.call("screen_place_component", { ...place, overrides: { color: "red" } }, "BROKEN_REFERENCE");
  state = await f.call("screen_place_component", place);
  await f.call("component_remove", { context: state.context, component_id: "button" }, "DEPENDENCY_EXISTS");
  await f.call("component_set_allowed_overrides", { context: state.context, component_id: "button", allowed_overrides: [] }, "BROKEN_REFERENCE");
  state = await f.call("screen_set_responsive_rule", { context: state.context, screen_id: "settings", name: "Narrow", width: 320, height: 640, behavior: "Stack fields without horizontal scrolling." });
  state = await f.call("screen_set_content_rules", { context: state.context, screen_id: "settings", content_rules: ["Long labels wrap."] });
  const found = await f.call("screen_find", { context: state.context, query: "settings" });
  assert.equal(found.result.items.length, 1);
  const screen = await f.call("screen_get", { context: found.context, screen_id: "settings", section: "states" });
  assert.equal(screen.result.items.length, 2);
  state = await f.call("screen_transition_remove", { context: state.context, screen_id: "settings", transition_id: "failure" });
  state = await f.call("screen_state_remove", { context: state.context, screen_id: "settings", state_id: "failed" });
  state = await f.call("screen_component_remove", { context: state.context, screen_id: "settings", instance_id: "save" });
  state = await f.call("component_remove", { context: state.context, component_id: "button" });
  assert.equal(state.result.removed, "button");
  const experience = parse(await readFile(join(f.project, "design/specs/settings/experience.yaml"), "utf8"));
  assert.equal(experience.screens[0].states.length, 1);
  assert.equal(experience.screens[0].instances.length, 0);
});

function exportArchive(fileId, entries, relations = []) {
  const files = { "manifest.json": { type: "penpot/export-files", version: 1, files: [{ id: fileId, name: "Fixture", features: [] }], relations }, [`files/${fileId}.json`]: { id: fileId }, ...entries };
  return zipSync(Object.fromEntries(Object.entries(files).map(([path, data]) => [path, Buffer.from(JSON.stringify(data))])));
}
test("CP5: native export checks, stage results, stale snapshots and update tools", async (t) => {
  const f = await designFixture(t);
  assert.equal((await f.call("specification_check_state", { context: f.state.context })).result.status, "pass");
  let state = await f.call("design_system_connect", { context: f.state.context, instance: "https://design.example.invalid", team_id: "team-1", project_id: "project-1", file_id: "library-1" });
  state = await f.call("component_register", { context: state.context, name: "Button", purpose: "Save.", accessibility: "Focus.", variant_name: "Default", main_component_id: "main-1" });
  state = await f.call("component_describe", { context: state.context, component_id: "button", purpose: "Save settings.", accessibility: "Visible focus.", content_constraints: ["Wrap long labels."] });
  state = await f.call("component_update_variant", { context: state.context, component_id: "button", variant_id: "default", main_component_id: "main-1", axes: { size: "regular" } });
  await writeFile(join(f.project, "design/system/tokens.json"), JSON.stringify({ color: { action: { $type: "color", $value: "#336699" } } }));
  state = await f.call("design_system_register_tokens", { context: state.context });
  await f.call("component_set_tokens", { context: state.context, component_id: "button", token_refs: ["color.missing"] }, "BROKEN_REFERENCE");
  state = await f.call("component_set_tokens", { context: state.context, component_id: "button", token_refs: ["color.action"] });
  const evidence = { export_evidence: "fixture:export", import_evidence: "fixture:import", inspection_evidence: "fixture:inspection" };
  const libraryPath = join(f.project, "design/system/library.penpot");
  await writeFile(libraryPath, "not a native export");
  await f.call("design_system_register_export", { context: state.context, ...evidence }, "INVALID_EXPORT");
  await writeFile(libraryPath, exportArchive("library-1", { "files/library-1/components/main-1.json": { id: "main-1" } }));
  state = await f.call("design_system_register_export", { context: state.context, ...evidence });
  let check = await f.call("design_system_check", { context: state.context });
  assert.equal(check.result.local_status, "pass");
  assert.equal(check.result.external_status, "not_reproduced");
  state = await f.call("screen_create", { context: state.context, name: "Settings", file_id: "screens-1", page_id: "page-1", board_id: "board-1", requirement_ids: ["UI-001"], initial_state: "Editing", visible: "Fields." });
  state = await f.call("screen_set_requirements", { context: state.context, screen_id: "settings", requirement_ids: ["UI-001", "UI-002"] });
  state = await f.call("screen_update_state", { context: state.context, screen_id: "settings", state_id: "editing", visible: "Editable settings.", focus: "First field." });
  state = await f.call("screen_add_transition", { context: state.context, screen_id: "settings", name: "Save", from: "editing", to: "editing", trigger: "Save succeeds.", requirement_ids: ["UI-001"] });
  state = await f.call("screen_update_transition", { context: state.context, screen_id: "settings", transition_id: "save", from: "editing", to: "editing", trigger: "Activate Save.", requirement_ids: ["UI-002"] });
  state = await f.call("screen_place_component", { context: state.context, screen_id: "settings", name: "Save", element_id: "element-1", component_id: "button", variant_id: "default" });
  state = await f.call("screen_change_component", { context: state.context, screen_id: "settings", instance_id: "save", component_id: "button", variant_id: "default" });
  const screenPath = join(f.project, "design/specs/settings/screens.penpot");
  const screenArchive = exportArchive("screens-1", { "files/screens-1/pages/page-1.json": { id: "page-1" }, "files/screens-1/pages/page-1/board-1.json": { id: "board-1" }, "files/screens-1/pages/page-1/element-1.json": { id: "element-1", componentFile: "library-1", componentId: "main-1" } }, [["screens-1", "library-1"]]);
  await writeFile(screenPath, screenArchive);
  state = await f.call("screen_design_register_export", { context: state.context, ...evidence });
  check = await f.call("screen_design_check", { context: state.context });
  assert.equal(check.result.local_status, "pass");
  await writeFile(libraryPath, exportArchive("wrong-library", {}));
  check = await f.call("screen_design_check", { context: state.context });
  assert.equal(check.result.local_status, "fail");
  assert.ok(check.result.issues.length);
});

test("CP5: writes reject symlinks and oversized readbacks before committing", async (t) => {
  const f = await fixture(t);
  const opened = await f.call("specification_open", { project: f.project, specification: "safe" });
  await mkdir(join(f.project, "outside"));
  await symlink(join(f.project, "outside"), join(f.project, "docs"));
  await f.call("question_prepare", { context: opened.context, category: "scope", text: "Question?" }, "UNSAFE_PATH");
  assert.deepEqual(await (await import("node:fs/promises")).readdir(join(f.project, "outside")), []);
  const g = await fixture(t);
  const target = await g.call("specification_open", { project: g.project, specification: "large" });
  await g.call("scope_propose", { context: target.context, depth: "lite", profiles: [{ id: "core", reason: "Local." }], rationale: Array.from({ length: 100 }, () => "x".repeat(4096)) }, "RESULT_LIMIT");
  await assert.rejects(readFile(join(g.project, "docs/specs/large/decisions.yaml")), { code: "ENOENT" });
});

test("CP5: parallel MCP writers cannot overwrite one another", async (t) => {
  const f = await fixture(t), client2 = await connect(t);
  const state = await f.call("specification_open", { project: f.project, specification: "parallel" });
  const args = { context: state.context, category: "scope", assumption: "One owner.", rationale: "Local task.", reconsider_when: "Ownership changes." };
  const responses = await Promise.all([f.client.callTool({ name: "decision_record_assumption", arguments: args }), client2.callTool({ name: "decision_record_assumption", arguments: { ...args, assumption: "Another owner." } })]);
  assert.equal(responses.filter((r) => !r.isError).length, 1);
  assert.ok(["BUSY", "CONFLICT"].includes(responses.find((r) => r.isError).structuredContent.error.code));
  assert.equal(parse(await readFile(join(f.project, "docs/specs/parallel/decisions.yaml"), "utf8")).decisions.length, 1);
});

test("CP5: a rejected scope proposal blocks design reads even when its content matches the old manifest", async (t) => {
  const f = await designFixture(t);
  let state = await f.call("design_system_connect", { context: f.state.context, instance: "https://design.example.invalid", team_id: "team-1", project_id: "project-1", file_id: "library-1" });
  state = await f.call("component_register", { context: state.context, name: "Button", purpose: "Save.", accessibility: "Focus.", variant_name: "Default", main_component_id: "main-1" });
  state = await f.call("scope_propose", { context: state.context, depth: "standard", rationale: ["Reusable settings UI."], profiles: [{ id: "core", reason: "App behavior." }, { id: "ui", reason: "Settings screen." }], artifacts: ["shared_design", "screen_design"] });
  state = await f.call("question_record_answer", { context: state.context, question_ref: state.result.question_ref, selected_ids: ["change"], text: "Please change this scope.", source: "fixture-customer:reject" });
  const reopened = await f.call("specification_open", { project: f.project, specification: "settings" });
  assert.equal(reopened.result.scope, "needs_confirmation");
  await f.call("component_get", { context: state.context, component_id: "button" }, "SCOPE_REQUIRED");
});

test("CP5: inactive design files are not read when opening an unconfirmed specification", async (t) => {
  const f = await fixture(t);
  await mkdir(join(f.project, "unrelated"));
  await symlink(join(f.project, "unrelated"), join(f.project, "design"));
  const state = await f.call("specification_open", { project: f.project, specification: "cli" });
  assert.equal(state.result.scope, "unconfirmed");
  assert.deepEqual(state.result.artifacts, []);
});

test("CP5: newly activated unsafe design sources fail before manifest installation", async (t) => {
  const f = await fixture(t);
  let state = await f.call("specification_open", { project: f.project, specification: "new-ui" });
  state = await f.call("scope_propose", { context: state.context, depth: "standard", profiles: [{ id: "ui", reason: "A new UI." }], rationale: ["UI scope."], artifacts: ["shared_design"] });
  const proposal = state.result.question_ref;
  state = await f.call("question_record_answer", { context: state.context, question_ref: proposal, selected_ids: ["confirm"], text: "Confirmed.", source: "fixture-customer:new-ui" });
  await mkdir(join(f.project, "outside"));
  await symlink(join(f.project, "outside"), join(f.project, "design"));
  await f.call("scope_confirm", { context: state.context, proposal_ref: proposal, answer_ref: state.result.decision_ref }, "UNSAFE_PATH");
  await assert.rejects(readFile(join(f.project, "docs/specs/new-ui/manifest.yaml")), { code: "ENOENT" });
});

test("CP5: Penpot connection rejects credential-bearing URLs without persisting them", async (t) => {
  const f = await designFixture(t);
  await f.call("design_system_connect", { context: f.state.context, instance: "https://user:fixture-secret@design.example.invalid", team_id: "team-1", project_id: "project-1", file_id: "library-1" }, "INVALID_INPUT");
  await assert.rejects(readFile(join(f.project, "design/system/catalog.yaml")), { code: "ENOENT" });
});

test("CP5: MCP metadata conservatively marks updates as potentially destructive", async (t) => {
  const { client } = await fixture(t);
  const { tools } = await client.listTools();
  for (const name of ["scope_confirm", "component_describe", "component_update_variant", "screen_update_state"]) {
    const operation = tools.find((tool) => tool.name === name);
    assert.equal(operation.annotations.readOnlyHint, false);
    assert.equal(operation.annotations.destructiveHint, true);
  }
  assert.equal(tools.find((tool) => tool.name === "decision_get").annotations.readOnlyHint, true);
});
