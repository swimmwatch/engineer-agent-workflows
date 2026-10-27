import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { createReviewAccessAudit, createReviewAccessPolicy, installReviewAccessGuard } from "../scripts/lib/specification-review-native-access.mjs";

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "eaw-review-access-"));
  async function cleanup() { await rm(root, { recursive: true, force: true }); }
  t.after(cleanup);
  const project = join(root, "project");
  const references = join(root, "skill");
  const directory = join(project, "docs/specs/fixture");
  for (const path of [directory, references, join(directory, ".workflow/review-inputs"), join(project, "design/system"), join(project, "design/specs/fixture")]) {
    await mkdir(path, { recursive: true });
  }
  for (const path of [join(directory, "manifest.yaml"), join(directory, "decisions.yaml"), join(directory, ".workflow/review-inputs/snapshot.json"),
    join(project, "design/system/catalog.yaml"), join(project, "design/specs/fixture/experience.yaml"), join(project, "source.ts"), join(references, "reference.md")]) {
    await writeFile(path, "Fixture-only input.\n");
  }
  const policy = createReviewAccessPolicy({ project, specification: "fixture", referenceRoots: [references] });
  return { root, project, references, directory, policy };
}

async function managedFilesAndArchivesAreDenied(t) {
  const f = await fixture(t);
  const protectedPaths = ["docs/specs/fixture/manifest.yaml", "docs/specs/fixture/decisions.yaml", "docs/specs/fixture/.workflow/review-inputs/snapshot.json",
    "design/system/catalog.yaml", "design/specs/fixture/experience.yaml", "docs/specs/fixture/../fixture/manifest.yaml"];
  for (const path of protectedPaths) assert.equal(f.policy.inspect("read", { file_path: path }).allowed, false, path);
  assert.equal(f.policy.inspect("read", { file_path: join(f.project, "source.ts") }).allowed, true);
  assert.equal(f.policy.inspect("read", { file_path: join(f.references, "reference.md") }).allowed, true);
}
test("managed documents and archives are denied while exact bundle references and source remain readable", managedFilesAndArchivesAreDenied);

async function aliasesAndPhysicalTraversalCannotHideManagedFiles(t) {
  const f = await fixture(t);
  await symlink(join(f.directory, "manifest.yaml"), join(f.project, "innocent.md"));
  await symlink(f.directory, join(f.project, "alias"), "dir");
  await symlink(join(f.directory, ".workflow/review-inputs"), join(f.project, "archives"), "dir");
  await mkdir(join(f.directory, "nested"));
  await writeFile(join(f.project, "manifest.yaml"), "Unmanaged same-name input.");
  await symlink(join(f.directory, "nested"), join(f.project, "physical-parent"), "dir");
  for (const path of ["innocent.md", "alias/manifest.yaml", "alias/../fixture/decisions.yaml", "archives/snapshot.json"]) {
    assert.equal(f.policy.inspect("read", { file_path: path }).allowed, false, path);
  }
  const traversal = f.policy.inspect("read", { file_path: "physical-parent/../manifest.yaml" });
  assert.deepEqual(traversal, { allowed: false, reason: "MCP_MANAGED_FILE_ACCESS_DENIED" });
  const outside = join(f.root, "outside.md");
  await writeFile(outside, "Not a review input.");
  await symlink(outside, join(f.project, "outside-link.md"));
  assert.equal(f.policy.inspect("read", { file_path: "outside-link.md" }).allowed, false);
}
test("realpath checks retain physical symlink traversal and reject managed or outside aliases", aliasesAndPhysicalTraversalCannotHideManagedFiles);

async function malformedReadAndUnexpectedMutationFailClosed(t) {
  const f = await fixture(t);
  for (const args of [{}, { file_path: "" }, { file_path: 1 }, { file_path: "\0" }, { file_path: "file:///private/input" }, { file_path: "missing.md" }]) {
    assert.equal(f.policy.inspect("read", args).allowed, false);
  }
  for (const tool of ["write", "edit", "read_image"]) assert.equal(f.policy.inspect(tool, { file_path: "source.ts" }).allowed, false);
  assert.equal(f.policy.inspect("mcp__eaw__scope_get", { context: "opaque" }), null);
}
test("invalid reads and unexpected filesystem capabilities fail closed without blocking MCP scenarios", malformedReadAndUnexpectedMutationFailClosed);

function event(type, data) { return { type, data }; }
function call(callId, filePath) { return event("tool/call", { callId, name: "read", arguments: { file_path: filePath } }); }
function result(callId, isError) { return event("tool/result", { message: { toolCallId: callId, isError } }); }

async function independentAuditRejectsBypassedOrUnknownAccess(t) {
  const f = await fixture(t);
  const audit = createReviewAccessAudit(f.policy);
  audit.observe({ id: "judge" }, call("protected", join(f.directory, "manifest.yaml")));
  audit.observe({ id: "judge" }, result("protected", false));
  assert.equal(audit.summary().status, "fail");
  assert.equal(audit.summary().forbidden_successes, 1);
  const denied = createReviewAccessAudit(f.policy);
  denied.observe({ id: "judge" }, call("protected", join(f.directory, "manifest.yaml")));
  denied.observe({ id: "judge" }, result("protected", true));
  assert.equal(denied.summary().status, "pass");
  assert.equal(denied.summary().denied_protected_attempts, 1);
  const unknown = createReviewAccessAudit(f.policy);
  unknown.observe({ id: "judge" }, call("pending", join(f.project, "source.ts")));
  assert.equal(unknown.summary().status, "incomplete");
}
test("independent trace acceptance rejects successful bypass and unfinished reads but records safe denials", independentAuditRejectsBypassedOrUnknownAccess);

async function auditRequiresMatchingGuardEvidenceAndSeparatesSessions(t) {
  const f = await fixture(t);
  const audit = createReviewAccessAudit(f.policy, { requireGuards: true });
  for (const actor of ["first", "second"]) {
    audit.observe({ id: actor }, call("same-call", join(f.project, "source.ts")));
    audit.observe({ id: actor }, result("same-call", false));
  }
  assert.equal(audit.summary().status, "incomplete");
  audit.recordDecision({ actor: "first", callId: "same-call" });
  assert.equal(audit.summary().status, "incomplete");
  audit.recordDecision({ actor: "second", callId: "same-call" });
  assert.equal(audit.summary().status, "pass");
  assert.equal(audit.summary().filesystem_calls, 2);
  const unrelated = createReviewAccessAudit(f.policy, { requireGuards: true });
  unrelated.observe({ id: "actual" }, call("call", join(f.project, "source.ts")));
  unrelated.observe({ id: "actual" }, result("call", false));
  unrelated.recordDecision({ actor: "different", callId: "call" });
  assert.equal(unrelated.summary().status, "incomplete");
}
test("trace acceptance requires the matching guard for each actual session without cross-actor aliasing", auditRequiresMatchingGuardEvidenceAndSeparatesSessions);

async function aGuardIsScopedAndCannotBeAllowedByLaterPolicy(t) {
  const f = await fixture(t);
  const require = createRequire(join(process.env.EAW_HARNESS_CLIENT_ROOT, "package.json"));
  async function load(name) { return import(pathToFileURL(require.resolve("@deepseek-ai/" + name)).href); }
  const { Context } = await load("cordis");
  const { createScope } = await load("dsh-scope");
  const tools = await load("dsh-tools");
  const ctx = new Context();
  let scope;
  try {
    await ctx.plugin((await load("dsh-system-prompt")).default);
    await ctx.plugin(tools.default, { mode: "native" });
    let bodyCalls = 0;
    async function execute() { bodyCalls += 1; return { read: true }; }
    function render() { return [{ type: "text", text: "Fixture read." }]; }
    const definition = tools.defineTool({ name: "read", description: "Controlled no-model body spy.", parameters: { file_path: { type: "string", required: true } },
      output: { schema: { type: "object", additionalProperties: true }, render }, execute });
    ctx.tools.register(definition);
    const agent = { id: "guarded-judge" };
    const decisions = [];
    async function install(injected) {
      scope = createScope(injected, agent);
      agent.ctx = scope.ctx;
      function observe(value) { decisions.push(value); }
      installReviewAccessGuard(agent, f.policy, observe);
    }
    install.inject = ["tools"];
    await ctx.plugin(install);
    ctx.on("tools/pre-execute", async function allow() { return { kind: "allow" }; });
    const signal = new AbortController().signal;
    const blocked = await ctx.tools.execute({ callId: "protected", name: "read", arguments: { file_path: join(f.directory, "manifest.yaml") }, agent, signal });
    assert.equal(blocked.isError, true);
    assert.equal(bodyCalls, 0);
    const allowed = await ctx.tools.execute({ callId: "reference", name: "read", arguments: { file_path: join(f.references, "reference.md") }, agent, signal });
    assert.equal(allowed.isError, false);
    assert.equal(bodyCalls, 1);
    const other = await ctx.tools.execute({ callId: "unscoped", name: "read", arguments: { file_path: join(f.directory, "manifest.yaml") }, signal });
    assert.equal(other.isError, false);
    assert.equal(bodyCalls, 2);
    assert.deepEqual(decisions.map(function outcome(value) { return value.allowed; }), [false, true]);
    assert.equal(await readFile(join(f.directory, "manifest.yaml"), "utf8"), "Fixture-only input.\n");
  } finally {
    if (scope) await scope.dispose();
    await ctx.fiber.dispose();
  }
}
test("actual Harness scope guard denies before a body and remains monotonic without model requests", {
  skip: !process.env.EAW_HARNESS_CLIENT_ROOT && "Prepared native Host is opt-in; no structural substitution.",
}, aGuardIsScopedAndCannotBeAllowedByLaterPolicy);
