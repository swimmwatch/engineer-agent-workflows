import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import {
  bindWorkspace,
  initializeProduct,
  listProducts,
  productCapabilities,
  resolveWorkspace,
} from "../dist/product/bindings.js";
import { inspectOperation } from "../dist/product/operations.js";
import { workflowTools } from "../dist/server.js";

const executeFile = promisify(execFile);
const digest = (value) => createHash("sha256").update(value).digest("hex");

function expectCode(code) {
  return (error) => {
    assert.equal(error?.code, code);
    assert.doesNotMatch(error?.message ?? "", /\/tmp\/|\\Users\\|EAW_PRODUCT_DATA_DIR/u);
    return true;
  };
}

async function temporaryDirectory(t, prefix) {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

async function git(cwd, ...args) {
  return (await executeFile("git", args, {
    cwd,
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_TERMINAL_PROMPT: "0" },
  })).stdout.trim();
}

async function initializeRepository(path) {
  await mkdir(path, { recursive: true });
  await git(path, "init", "--initial-branch=main");
  await writeFile(join(path, "README.md"), "fixture\n");
  await git(path, "add", "README.md");
  await git(path, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-m", "fixture");
}

async function gitEvidence(workspace) {
  const indexPath = await git(workspace, "rev-parse", "--path-format=absolute", "--git-path", "index");
  const index = await readFile(indexPath);
  return {
    head: await git(workspace, "rev-parse", "HEAD"),
    index: digest(index),
    status: await git(workspace, "status", "--porcelain=v2", "--untracked-files=all"),
  };
}

async function treeSnapshot(root, relative = "") {
  const entries = await readdir(join(root, relative), { withFileTypes: true }).catch((error) => {
    if (error?.code === "ENOENT") return [];
    throw error;
  });
  const result = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...await treeSnapshot(root, child));
    else result.push([child, digest(await readFile(join(root, child)))]);
  }
  return result;
}

test("product capabilities publish all implemented product scenario contracts", async (t) => {
  const root = join(await temporaryDirectory(t, "eaw-product-tools-"), "shared");
  const names = workflowTools.filter((tool) => /^(?:idea|prd|product|task)_/u.test(tool.name)).map((tool) => tool.name).sort();
  assert.deepEqual(names, [
    "idea_choose_direction",
    "idea_compare_direction",
    "idea_define_problem",
    "prd_define_actor",
    "prd_define_capability",
    "prd_define_constraint",
    "prd_define_goal",
    "prd_define_rule",
    "prd_define_term",
    "prd_define_use_case",
    "product_amendment_activate",
    "product_amendment_impact",
    "product_amendment_prepare",
    "product_amendment_rebase",
    "product_artifact_draft",
    "product_bind_workspace",
    "product_candidate_check",
    "product_capabilities",
    "product_context_next",
    "product_context_prepare",
    "product_decision_find",
    "product_decision_get",
    "product_document_accept_edits",
    "product_document_begin_edit",
    "product_document_create_subject",
    "product_document_inspect_edits",
    "product_document_list",
    "product_document_move_elements",
    "product_document_rename",
    "product_element_find",
    "product_element_get",
    "product_initialize",
    "product_interview_resume",
    "product_list",
    "product_open",
    "product_question_answer",
    "product_question_no_answer",
    "product_question_prepare",
    "product_record_assumption",
    "product_record_instruction",
    "product_record_observation",
    "product_record_research",
    "product_review_complete",
    "product_review_consistency_get",
    "product_review_consistency_record",
    "product_review_get",
    "product_review_record",
    "product_review_start",
    "product_review_status",
    "product_safety_block",
    "product_safety_resolve",
    "product_scope_confirm",
    "product_scope_propose",
    "task_inputs_check",
    "task_packet_complete",
    "task_packet_start",
    "task_specification_register_copy",
    "task_specification_reserve",
  ]);
  for (const tool of workflowTools.filter((candidate) => names.includes(candidate.name))) {
    assert.equal(tool.schemaKind, "json");
    assert.ok(tool.inputSchema.type === "object");
    assert.ok(tool.outputSchema.type === "object");
    assert.ok(tool.outputSchema.definitions);
  }

  const capabilities = await productCapabilities({ root });
  assert.equal(capabilities.context, null);
  assert.equal(capabilities.operationRef, null);
  assert.deepEqual(capabilities.result.tools, names);
  assert.equal(capabilities.result.root_state, "missing");
  await assert.rejects(stat(root), { code: "ENOENT" });

});

test("Q09: linked worktrees resolve one product while clones and names never imply a binding", async (t) => {
  const fixture = await temporaryDirectory(t, "eaw-product-q09-");
  const root = join(fixture, "shared-product-data");
  const repository = join(fixture, "source", "same-name");
  const worktree = join(fixture, "worktree");
  const secondWorktree = join(fixture, "second-worktree");
  const clone = join(fixture, "clone", "same-name");
  const unrelated = join(fixture, "unrelated", "same-name");
  await initializeRepository(repository);
  await mkdir(dirname(worktree), { recursive: true });
  await git(repository, "worktree", "add", "-b", "fixture-worktree", worktree);
  await git(repository, "worktree", "add", "-b", "fixture-second-worktree", secondWorktree);
  await mkdir(dirname(clone), { recursive: true });
  await executeFile("git", ["clone", "--quiet", repository, clone]);
  await initializeRepository(unrelated);

  const before = new Map(await Promise.all([repository, worktree, secondWorktree, clone, unrelated].map(async (path) => [path, await gitEvidence(path)])));
  const initialized = await initializeProduct({
    root,
    workspace: repository,
    name: "Shared product",
    knownIdea: "Keep the same product definition across local worktrees.",
  });
  assert.equal(initialized.result.applied, true);
  assert.equal(initialized.result.workspace_id !== null, true);

  const linked = await resolveWorkspace({ root, workspace: worktree });
  assert.equal(linked.result.state, "bound");
  assert.equal(linked.result.product_id, initialized.result.product_id);
  await bindWorkspace({
    root,
    workspace: worktree,
    productId: initialized.result.product_id,
    bindingAnswer: "Register this concrete linked worktree.",
    source: "fixture user answer",
  });
  const secondLinked = await resolveWorkspace({ root, workspace: secondWorktree });
  assert.equal(secondLinked.result.state, "bound");
  assert.equal(secondLinked.result.product_id, initialized.result.product_id);
  assert.equal(secondLinked.result.workspace_id, null);

  for (const path of [clone, unrelated]) {
    const opened = await resolveWorkspace({ root, workspace: path });
    assert.equal(opened.result.state, "unbound");
    assert.equal(opened.result.product_id, null);
  }

  const boundClone = await bindWorkspace({
    root,
    workspace: clone,
    productId: initialized.result.product_id,
    bindingAnswer: "Bind this clone to the selected shared product.",
    source: "fixture user answer",
  });
  assert.equal(boundClone.result.product_id, initialized.result.product_id);
  assert.equal((await resolveWorkspace({ root, workspace: clone })).result.state, "bound");
  assert.equal((await resolveWorkspace({ root, workspace: unrelated })).result.state, "unbound");

  for (const path of [repository, worktree, secondWorktree, clone, unrelated]) {
    assert.deepEqual(await gitEvidence(path), before.get(path), path);
  }
  const listed = await listProducts({ root, limit: 1 });
  assert.equal(listed.result.total, 1);
  assert.equal(listed.result.items[0].product_id, initialized.result.product_id);
  assert.equal(listed.result.items[0].title, "Shared product");
});

test("P04 rejects a forged Git directory pointer as inherited worktree evidence", async (t) => {
  const fixture = await temporaryDirectory(t, "eaw-product-forged-git-");
  const root = join(fixture, "shared-product-data");
  const repository = join(fixture, "registered");
  const forged = join(fixture, "forged");
  await initializeRepository(repository);
  await mkdir(forged);
  await writeFile(join(forged, ".git"), `gitdir: ${join(repository, ".git")}\n`);

  await initializeProduct({
    root,
    workspace: repository,
    name: "Registered product",
    knownIdea: "Only real linked worktrees inherit this binding.",
  });
  const opened = await resolveWorkspace({ root, workspace: forged });
  assert.equal(opened.result.state, "unbound");
  assert.equal(opened.result.product_id, null);
  assert.equal(opened.result.workspace_id, null);
});

test("P04 replays only exact persisted product binding mutations", async (t) => {
  const fixture = await temporaryDirectory(t, "eaw-product-replay-");
  const root = join(fixture, "shared-product-data");
  const repository = join(fixture, "registered");
  const clone = join(fixture, "clone");
  await initializeRepository(repository);
  await executeFile("git", ["clone", "--quiet", repository, clone]);
  const initializeInput = {
    root,
    workspace: repository,
    name: "Replay product",
    knownIdea: "Persist the exact initialization result.",
  };

  const initialized = await initializeProduct(initializeInput);
  const afterInitialize = await treeSnapshot(root);
  const repeatedInitialization = await initializeProduct(initializeInput);
  assert.equal(repeatedInitialization.replayed, true);
  assert.deepEqual(repeatedInitialization.result, initialized.result);
  assert.deepEqual(await treeSnapshot(root), afterInitialize);

  await assert.rejects(bindWorkspace({
    root,
    workspace: repository,
    productId: initialized.result.product_id,
    bindingAnswer: "This binding came from initialization, not binding.",
    source: "fixture",
  }), expectCode("ALREADY_EXISTS"));

  const bindingInput = {
    root,
    workspace: clone,
    productId: initialized.result.product_id,
    bindingAnswer: "Bind this clone explicitly.",
    source: "fixture answer",
  };
  const bound = await bindWorkspace(bindingInput);
  const afterBinding = await treeSnapshot(root);
  const repeatedBinding = await bindWorkspace(bindingInput);
  assert.equal(repeatedBinding.replayed, true);
  assert.deepEqual(repeatedBinding.result, bound.result);
  assert.deepEqual(await treeSnapshot(root), afterBinding);

  await assert.rejects(bindWorkspace({
    ...bindingInput,
    bindingAnswer: "A different answer must not inherit the old receipt.",
  }), expectCode("CONFLICT"));
  assert.deepEqual(await treeSnapshot(root), afterBinding);
});

test("P04 catalog locks recover only for the same explicitly resumed operation", async (t) => {
  const fixture = await temporaryDirectory(t, "eaw-product-store-lock-");
  const root = join(fixture, "shared-product-data");
  const workspace = join(fixture, "workspace");
  await initializeRepository(workspace);
  const input = {
    root,
    workspace,
    name: "Recoverable product",
    knownIdea: "Recover only the catalog mutation owned by this operation.",
  };
  await assert.rejects(initializeProduct(input, {
    checkpoint: async (phase) => {
      if (phase === "prepared") {
        const error = new Error("simulated stop before catalog mutation");
        error.code = "SIMULATED_STOP";
        throw error;
      }
    },
  }), { code: "SIMULATED_STOP" });

  const [productId] = await readdir(join(root, "products"));
  assert.match(productId, /^[0-9a-f-]{36}$/u);
  const operationEntries = await readdir(join(root, "products", productId, "operations"));
  assert.equal(operationEntries.length, 1);
  const operationId = operationEntries[0].slice(0, -5);
  const inspection = await inspectOperation(root, productId, operationId);
  assert.equal(inspection.state, "incomplete");
  assert.equal(typeof inspection.inspectionToken, "string");
  const stoppedPid = Number((await executeFile(process.execPath, [
    "--input-type=module",
    "--eval",
    "process.stdout.write(String(process.pid))",
  ])).stdout);
  assert.equal(Number.isSafeInteger(stoppedPid), true);

  const lockPath = join(root, "store.lock");
  const stoppedOwner = {
    schema_version: 1,
    kind: "catalog_lock",
    operation_id: operationId,
    session_id: "33333333-3333-4333-8333-333333333333",
    pid: stoppedPid,
  };
  await writeFile(lockPath, `${JSON.stringify(stoppedOwner)}\n`, { mode: 0o600 });
  const before = await readFile(lockPath);

  await assert.rejects(initializeProduct(input), expectCode("RECOVERY_REQUIRED"));
  await assert.rejects(initializeProduct({
    ...input,
    name: "Unrelated operation",
  }), expectCode("RECOVERY_REQUIRED"));
  assert.deepEqual(await readFile(lockPath), before);

  const resumed = await initializeProduct(input, {
    resumeInspectionToken: inspection.inspectionToken,
  });
  assert.equal(resumed.result.product_id, productId);
  assert.equal(resumed.replayed, false);
  await assert.rejects(stat(lockPath), { code: "ENOENT" });
});

test("Q10: reads stay lazy, legacy files stay exact, and interrupted initialization is discoverable", async (t) => {
  const fixture = await temporaryDirectory(t, "eaw-product-q10-");
  const root = join(fixture, "shared-product-data");
  const workspace = join(fixture, "workspace");
  await initializeRepository(workspace);
  const legacy = join(workspace, "docs", "specs", "legacy");
  await mkdir(legacy, { recursive: true });
  await writeFile(join(legacy, "spec.md"), "# Legacy\n\nStatus: Approved\n");
  await writeFile(join(legacy, "manifest.yaml"), "legacy: manifest\n");
  await writeFile(join(legacy, "decisions.yaml"), "legacy: decisions\n");
  await mkdir(join(legacy, ".workflow"));
  await writeFile(join(legacy, ".workflow", "product-binding.yaml"), "legacy: unsupported\n");
  const legacyBefore = await treeSnapshot(legacy);
  const gitBefore = await gitEvidence(workspace);

  const unopened = await resolveWorkspace({ root, workspace });
  assert.equal(unopened.result.state, "missing_store");
  await assert.rejects(stat(root), { code: "ENOENT" });

  await assert.rejects(initializeProduct({
    root,
    workspace,
    name: "Interrupted product",
    knownIdea: "Preserve the pending operation after a lost response.",
  }, {
    checkpoint: async (phase) => {
      if (phase === "objects_saved") {
        const error = new Error("simulated interruption");
        error.code = "SIMULATED_STOP";
        throw error;
      }
    },
  }), expectCode("RECOVERY_REQUIRED"));

  const pending = await resolveWorkspace({ root, workspace });
  assert.equal(pending.result.state, "bound");
  assert.equal(typeof pending.operationRef, "string");
  assert.match(pending.operationRef, /^[0-9a-f-]{36}$/u);
  assert.deepEqual(await treeSnapshot(legacy), legacyBefore);
  assert.deepEqual(await gitEvidence(workspace), gitBefore);
});

test("P04 rejects foreign products, silent rebinding, stale locations, and unsafe workspace inputs", async (t) => {
  const fixture = await temporaryDirectory(t, "eaw-product-safety-");
  const root = join(fixture, "shared-product-data");
  const first = join(fixture, "first");
  const second = join(fixture, "second");
  const unbound = join(fixture, "unbound");
  await initializeRepository(first);
  await initializeRepository(second);
  await initializeRepository(unbound);
  const overlappingRoot = join(unbound, ".product-data");
  await assert.rejects(initializeProduct({
    root: overlappingRoot,
    workspace: unbound,
    name: "Unsafe",
    knownIdea: "This must not be created inside the workspace.",
  }), expectCode("INVALID_CONFIG"));
  await assert.rejects(stat(overlappingRoot), { code: "ENOENT" });

  const linked = join(fixture, "linked");
  await git(unbound, "worktree", "add", "-b", "unsafe-product-root", linked);
  const commonRoot = join(unbound, ".git", "workflow-data");
  await assert.rejects(initializeProduct({
    root: commonRoot,
    workspace: linked,
    name: "Unsafe common directory",
    knownIdea: "Product data must not be written into Git metadata.",
  }), expectCode("INVALID_CONFIG"));
  await assert.rejects(stat(commonRoot), { code: "ENOENT" });
  const productA = await initializeProduct({ root, workspace: first, name: "A", knownIdea: "A idea" });
  const productB = await initializeProduct({ root, workspace: second, name: "B", knownIdea: "B idea" });
  const before = await treeSnapshot(root);

  await assert.rejects(bindWorkspace({
    root,
    workspace: first,
    productId: productB.result.product_id,
    bindingAnswer: "Wrong product.",
    source: "fixture",
  }), expectCode("CONFLICT"));
  await assert.rejects(bindWorkspace({
    root,
    workspace: unbound,
    productId: "99999999-9999-4999-8999-999999999999",
    bindingAnswer: "Unknown product.",
    source: "fixture",
  }), expectCode("NOT_FOUND"));
  assert.deepEqual(await treeSnapshot(root), before);

  const moved = join(fixture, "moved-first");
  await rename(first, moved);
  const renamed = await resolveWorkspace({ root, workspace: moved });
  assert.equal(renamed.result.state, "unbound");
  assert.ok(renamed.result.blockers.some((value) => value.includes("location")));
  await assert.rejects(resolveWorkspace({ root, workspace: "relative/workspace" }), expectCode("INVALID_INPUT"));
  assert.equal((await resolveWorkspace({ root, workspace: second })).result.product_id, productB.result.product_id);
  assert.notEqual(productA.result.product_id, productB.result.product_id);
});
