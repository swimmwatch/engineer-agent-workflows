import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, open, readFile, readdir, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { URL } from "node:url";
import { promisify } from "node:util";

import {
  inspectOperation,
  resumeOperation,
  runProductMutation,
} from "../dist/product/operations.js";
import { saveGeneration, saveObject } from "../dist/product/storage.js";

const executeFile = promisify(execFile);
const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const REVIEW_ID = "55555555-5555-4555-8555-555555555555";

const digest = (value) => createHash("sha256").update(value).digest("hex");
const bytes = (value) => Buffer.from(value, "utf8");

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

async function snapshot(directory, relative = "") {
  const entries = await readdir(join(directory, relative), { withFileTypes: true }).catch((error) => {
    if (error?.code === "ENOENT") return [];
    throw error;
  });
  const result = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...await snapshot(directory, child));
    else result.push([child, digest(await readFile(join(directory, child)))]);
  }
  return result;
}

async function generation(root, label, parent = null) {
  const registry = await saveObject(root, {
    productId: PRODUCT_ID,
    kind: "record",
    bytes: bytes(`${JSON.stringify({
      schema_version: 1,
      kind: "registry",
      product_id: PRODUCT_ID,
      documents: [],
      element_metadata: [],
    })}\n`),
  });
  return saveGeneration(root, {
    schema_version: 1,
    kind: "generation",
    product_id: PRODUCT_ID,
    parent,
    registry: { id: "22222222-2222-4222-8222-222222222222", object_sha256: registry.sha256 },
    ready_artifacts: [{
      artifact: "prd",
      source_version: digest(label),
      review_id: REVIEW_ID,
      upstream_pins: [],
    }],
    decision_heads: [],
    relations: [],
  });
}

function mutation({
  root,
  operationId = randomUUID(),
  sessionId = randomUUID(),
  expectedRevision,
  nextRevision,
  label,
  workspaceRoot,
  localBytes,
  checkpoint,
}) {
  const result = {
    operation_ref: operationId,
    applied: true,
    candidate_ref: null,
    changed_refs: [],
    decision_ref: null,
    question_ref: null,
    product_id: PRODUCT_ID,
    workspace_id: null,
    task_id: null,
    specification_id: null,
    review_ref: null,
    next: `Published ${label}.`,
    document_id: null,
  };
  const localPath = "binding.yaml";
  const input = {
    root,
    productId: PRODUCT_ID,
    operationId,
    sessionId,
    scenario: "product_artifact_draft",
    expectedRevision,
    nextRevision,
    intent: {
      schema_version: 1,
      kind: "operation_intent",
      scenario: "product_artifact_draft",
      input: { label, local_sha256: localBytes === undefined ? null : digest(localBytes) },
    },
    result,
    checkpoint,
  };
  if (workspaceRoot !== undefined && localBytes !== undefined) {
    input.targets = [{
      root: "workspace",
      binding_id: null,
      relative_path: localPath,
      before: null,
      after: digest(localBytes),
    }];
    input.saveLocalBinding = async () => {
      const target = join(workspaceRoot, localPath);
      const existing = await readFile(target).catch((error) => {
        if (error?.code === "ENOENT") return null;
        throw error;
      });
      if (existing !== null && !existing.equals(localBytes)) {
        const error = new Error("Local binding changed.");
        error.code = "CONFLICT";
        throw error;
      }
      if (existing === null) await writeFile(target, localBytes, { flag: "wx", mode: 0o600 });
    };
    input.verifyTargets = async () => {
      const existing = await readFile(join(workspaceRoot, localPath));
      if (digest(existing) !== digest(localBytes)) {
        const error = new Error("Local binding changed.");
        error.code = "CONFLICT";
        throw error;
      }
    };
  }
  return input;
}

async function initializeHead(root, base) {
  return runProductMutation(mutation({
    root,
    expectedRevision: null,
    nextRevision: base.sha256,
    label: "base",
  }));
}

test("Q06: a stale writer conflicts while observers remain byte-for-byte read only", async (t) => {
  const root = await temporaryDirectory(t, "eaw-product-recovery-q06-");
  const base = await generation(root, "base");
  const nextA = await generation(root, "next-a", base.sha256);
  const nextB = await generation(root, "next-b", base.sha256);
  const nextA2 = await generation(root, "next-a-2", nextA.sha256);
  await initializeHead(root, base);

  const writerA = mutation({ root, expectedRevision: base.sha256, nextRevision: nextA.sha256, label: "a" });
  const writerB = mutation({ root, expectedRevision: base.sha256, nextRevision: nextB.sha256, label: "b" });
  const appliedA = await runProductMutation(writerA);
  assert.equal(appliedA.revision, nextA.sha256);

  const beforeObservation = await snapshot(root);
  const observed = await inspectOperation(root, PRODUCT_ID, writerA.operationId);
  assert.equal(observed.state, "applied");
  assert.deepEqual(await snapshot(root), beforeObservation);

  await assert.rejects(runProductMutation(writerB), expectCode("CONFLICT"));
  assert.equal((await inspectOperation(root, PRODUCT_ID, writerB.operationId)).state, "not_applied");

  const continued = await runProductMutation(mutation({
    root,
    expectedRevision: appliedA.revision,
    nextRevision: nextA2.sha256,
    label: "a-continued",
  }));
  assert.equal(continued.revision, nextA2.sha256);
});

test("Q07: interrupted checkpoints expose exact effects and resume without duplication", async (t) => {
  for (const crashPhase of ["prepared", "objects_saved", "local_binding_saved", "head_written", "published", "complete"]) {
    await t.test(crashPhase, async (subtest) => {
      const root = await temporaryDirectory(subtest, `eaw-product-recovery-${crashPhase}-`);
      const workspaceRoot = await temporaryDirectory(subtest, `eaw-product-workspace-${crashPhase}-`);
      const base = await generation(root, `${crashPhase}-base`);
      const next = await generation(root, `${crashPhase}-next`, base.sha256);
      await initializeHead(root, base);
      const operationId = randomUUID();
      const sessionId = randomUUID();
      const localBytes = bytes(`phase: ${crashPhase}\n`);
      const operationsModule = new URL("../dist/product/operations.js", import.meta.url).href;
      const worker = `
        const { createHash } = await import("node:crypto");
        const { writeFile } = await import("node:fs/promises");
        const { join } = await import("node:path");
        const { runProductMutation } = await import(${JSON.stringify(operationsModule)});
        const input = JSON.parse(process.argv[1]);
        const localBytes = Buffer.from(\`phase: \${input.crashPhase}\\n\`, "utf8");
        const localDigest = createHash("sha256").update(localBytes).digest("hex");
        await runProductMutation({
          root: input.root,
          productId: ${JSON.stringify(PRODUCT_ID)},
          operationId: input.operationId,
          sessionId: input.sessionId,
          scenario: "product_artifact_draft",
          expectedRevision: input.base,
          nextRevision: input.next,
          intent: {
            schema_version: 1,
            kind: "operation_intent",
            scenario: "product_artifact_draft",
            input: { label: input.crashPhase, local_sha256: localDigest },
          },
          result: {
            operation_ref: input.operationId,
            applied: true,
            candidate_ref: null,
            changed_refs: [],
            decision_ref: null,
            question_ref: null,
            product_id: ${JSON.stringify(PRODUCT_ID)},
            workspace_id: null,
            task_id: null,
            specification_id: null,
            review_ref: null,
            next: \`Published \${input.crashPhase}.\`,
            document_id: null,
          },
          targets: [{
            root: "workspace",
            binding_id: null,
            relative_path: "binding.yaml",
            before: null,
            after: localDigest,
          }],
          saveLocalBinding: async () => {
            await writeFile(join(input.workspaceRoot, "binding.yaml"), localBytes, { flag: "wx", mode: 0o600 });
          },
          checkpoint: async (phase) => {
            if (phase === input.crashPhase) process.exit(86);
          },
        });
      `;

      await assert.rejects(executeFile(process.execPath, [
        "--input-type=module",
        "--eval",
        worker,
        JSON.stringify({ root, workspaceRoot, operationId, sessionId, base: base.sha256, next: next.sha256, crashPhase }),
      ]), (error) => error?.code === 86);

      const status = await inspectOperation(root, PRODUCT_ID, operationId);
      assert.equal(status.phase, crashPhase === "head_written" ? "local_binding_saved" : crashPhase);
      const expectedPublished = ["head_written", "published", "complete"].includes(crashPhase);
      assert.equal(await readFile(join(root, "products", PRODUCT_ID, "head.yaml"), "utf8").then((value) => value.includes(next.sha256)), expectedPublished);
      const localExists = await readFile(join(workspaceRoot, "binding.yaml")).then(() => true, () => false);
      assert.equal(localExists, ["local_binding_saved", "head_written", "published", "complete"].includes(crashPhase));

      const plan = mutation({
        root,
        operationId,
        sessionId,
        expectedRevision: base.sha256,
        nextRevision: next.sha256,
        label: crashPhase,
        workspaceRoot,
        localBytes,
      });
      if (crashPhase === "complete") {
        const replay = await runProductMutation(plan);
        assert.equal(replay.replayed, true);
        const following = await generation(root, "complete-following", next.sha256);
        const continued = await runProductMutation(mutation({
          root,
          expectedRevision: next.sha256,
          nextRevision: following.sha256,
          label: "complete-following",
        }));
        assert.equal(continued.revision, following.sha256);
      } else {
        const resumed = await resumeOperation(plan, status.inspectionToken);
        assert.equal(resumed.revision, next.sha256);
        assert.equal(resumed.replayed, false);
      }
      const final = await inspectOperation(root, PRODUCT_ID, operationId);
      assert.equal(final.state, "applied");
      assert.equal(final.phase, "complete");
    });
  }
});

test("Q07: head-written recovery fails closed when the published generation is missing", async (t) => {
  const root = await temporaryDirectory(t, "eaw-product-recovery-head-evidence-");
  const base = await generation(root, "head-evidence-base");
  const next = await generation(root, "head-evidence-next", base.sha256);
  await initializeHead(root, base);
  const plan = mutation({
    root,
    expectedRevision: base.sha256,
    nextRevision: next.sha256,
    label: "head-evidence",
    checkpoint: async (phase) => {
      if (phase === "head_written") {
        const error = new Error("stop after head write");
        error.code = "SIMULATED_STOP";
        throw error;
      }
    },
  });
  await assert.rejects(runProductMutation(plan), expectCode("RECOVERY_REQUIRED"));
  const status = await inspectOperation(root, PRODUCT_ID, plan.operationId);
  assert.equal(status.phase, "local_binding_saved");
  plan.checkpoint = undefined;
  await unlink(join(root, next.relativePath));
  await assert.rejects(resumeOperation(plan, status.inspectionToken), expectCode("RECOVERY_REQUIRED"));
});

test("Q07: published recovery revalidates changed local targets", async (t) => {
  const root = await temporaryDirectory(t, "eaw-product-recovery-published-target-");
  const workspaceRoot = await temporaryDirectory(t, "eaw-product-workspace-published-target-");
  const base = await generation(root, "published-target-base");
  const next = await generation(root, "published-target-next", base.sha256);
  await initializeHead(root, base);
  const localBytes = bytes("binding: expected\n");
  const plan = mutation({
    root,
    expectedRevision: base.sha256,
    nextRevision: next.sha256,
    label: "published-target",
    workspaceRoot,
    localBytes,
    checkpoint: async (phase) => {
      if (phase === "published") {
        const error = new Error("stop after publication");
        error.code = "SIMULATED_STOP";
        throw error;
      }
    },
  });
  await assert.rejects(runProductMutation(plan), expectCode("RECOVERY_REQUIRED"));
  const status = await inspectOperation(root, PRODUCT_ID, plan.operationId);
  assert.equal(status.phase, "published");
  await writeFile(join(workspaceRoot, "binding.yaml"), "binding: foreign\n");
  plan.checkpoint = undefined;
  await assert.rejects(resumeOperation(plan, status.inspectionToken), expectCode("CONFLICT"));
});

test("Q08: exact replay requires the retained immutable intent", async (t) => {
  const root = await temporaryDirectory(t, "eaw-product-recovery-intent-");
  const base = await generation(root, "intent-base");
  const plan = mutation({ root, expectedRevision: null, nextRevision: base.sha256, label: "intent" });
  await runProductMutation(plan);
  const operation = JSON.parse(await readFile(
    join(root, "products", PRODUCT_ID, "operations", `${plan.operationId}.yaml`),
    "utf8",
  ));
  await unlink(join(root, "products", PRODUCT_ID, "objects", `${operation.intent_sha256}.yaml`));
  await assert.rejects(runProductMutation(plan), expectCode("RECOVERY_REQUIRED"));
});

test("Q08: exact replay requires the retained published generation", async (t) => {
  const root = await temporaryDirectory(t, "eaw-product-recovery-generation-");
  const next = await generation(root, "generation-replay");
  const plan = mutation({ root, expectedRevision: null, nextRevision: next.sha256, label: "generation-replay" });
  await runProductMutation(plan);
  await unlink(join(root, next.relativePath));
  await assert.rejects(runProductMutation(plan), expectCode("RECOVERY_REQUIRED"));
});

test("Q06: invalid targets fail preflight without durable effects", async (t) => {
  const root = await temporaryDirectory(t, "eaw-product-recovery-invalid-target-");
  const next = await generation(root, "invalid-target");
  const before = await snapshot(root);
  const plan = mutation({ root, expectedRevision: null, nextRevision: next.sha256, label: "invalid-target" });
  plan.targets = [{ root: "outside", binding_id: null, relative_path: "binding.yaml", before: null, after: digest("x") }];
  await assert.rejects(runProductMutation(plan), expectCode("INVALID_INPUT"));
  assert.deepEqual(await snapshot(root), before);
});

test("Q07: a partial lock write is removed without inventing recovery state", async (t) => {
  const root = await temporaryDirectory(t, "eaw-product-recovery-partial-lock-");
  const next = await generation(root, "partial-lock");
  const prototypeProbePath = join(root, "prototype-probe");
  const prototypeProbe = await open(prototypeProbePath, "w");
  const fileHandlePrototype = Object.getPrototypeOf(prototypeProbe);
  const originalWriteFile = fileHandlePrototype.writeFile;
  await prototypeProbe.close();
  await unlink(prototypeProbePath);
  let intercepted = false;
  fileHandlePrototype.writeFile = async function partialWrite(value, ...arguments_) {
    if (!intercepted) {
      intercepted = true;
      await originalWriteFile.call(this, Buffer.from(value).subarray(0, 12), ...arguments_);
      const error = new Error("simulated short lock write");
      error.code = "ENOSPC";
      throw error;
    }
    return originalWriteFile.call(this, value, ...arguments_);
  };
  const plan = mutation({ root, expectedRevision: null, nextRevision: next.sha256, label: "partial-lock" });
  try {
    await assert.rejects(runProductMutation(plan), expectCode("INVALID_STATE"));
  } finally {
    fileHandlePrototype.writeFile = originalWriteFile;
  }
  await assert.rejects(
    readFile(join(root, "products", PRODUCT_ID, "lock.yaml")),
    (error) => error?.code === "ENOENT",
  );
  const status = await inspectOperation(root, PRODUCT_ID, plan.operationId);
  assert.equal(status.state, "not_applied");
  assert.equal(status.phase, "abandoned");
});

test("Q07: a changed applied target blocks resume and preserves the prior ready head", async (t) => {
  const root = await temporaryDirectory(t, "eaw-product-recovery-conflict-");
  const workspaceRoot = await temporaryDirectory(t, "eaw-product-workspace-conflict-");
  const base = await generation(root, "conflict-base");
  const next = await generation(root, "conflict-next", base.sha256);
  await initializeHead(root, base);
  const operationId = randomUUID();
  const sessionId = randomUUID();
  const localBytes = bytes("binding: expected\n");
  const plan = mutation({
    root,
    operationId,
    sessionId,
    expectedRevision: base.sha256,
    nextRevision: next.sha256,
    label: "conflict",
    workspaceRoot,
    localBytes,
    checkpoint: async (phase) => {
      if (phase === "local_binding_saved") {
        const error = new Error("stop after local binding");
        error.code = "SIMULATED_STOP";
        throw error;
      }
    },
  });
  await assert.rejects(runProductMutation(plan), expectCode("RECOVERY_REQUIRED"));
  const status = await inspectOperation(root, PRODUCT_ID, operationId);
  await writeFile(join(workspaceRoot, "binding.yaml"), "binding: foreign\n");
  plan.checkpoint = undefined;
  await assert.rejects(resumeOperation(plan, status.inspectionToken), expectCode("CONFLICT"));
  const head = await readFile(join(root, "products", PRODUCT_ID, "head.yaml"), "utf8");
  assert.equal(head.includes(base.sha256), true);
});

test("Q08: exact retries survive restart and oversized replies have no effect", async (t) => {
  const root = await temporaryDirectory(t, "eaw-product-recovery-q08-");
  const base = await generation(root, "replay-base");
  const next = await generation(root, "replay-next", base.sha256);
  await initializeHead(root, base);
  const plan = mutation({ root, expectedRevision: base.sha256, nextRevision: next.sha256, label: "replay" });
  const first = await runProductMutation(plan);
  const afterFirst = await snapshot(root);
  const repeated = await runProductMutation(plan);
  assert.deepEqual(repeated.result, first.result);
  assert.equal(repeated.operationRef, first.operationRef);
  assert.equal(repeated.replayed, true);
  assert.deepEqual(await snapshot(root), afterFirst);

  const script = `
    const { runProductMutation } = await import(${JSON.stringify(new URL("../dist/product/operations.js", import.meta.url).href)});
    const plan = JSON.parse(process.argv[1]);
    const result = await runProductMutation(plan);
    if (!result.replayed || result.operationRef !== plan.operationId) process.exitCode = 1;
  `;
  await executeFile(process.execPath, ["--input-type=module", "--eval", script, JSON.stringify(plan)]);
  assert.deepEqual(await snapshot(root), afterFirst);

  const oversizedNext = await generation(root, "oversized-next", next.sha256);
  const oversized = mutation({
    root,
    expectedRevision: next.sha256,
    nextRevision: oversizedNext.sha256,
    label: "oversized",
  });
  oversized.result.changed_refs = Array.from({ length: 110 }, (_, index) => ({
    product_id: PRODUCT_ID,
    artifact: "technical-design",
    element_id: `LIMIT-${"X".repeat(117)}-${String(index).padStart(4, "0")}`,
  }));
  oversized.result.next = "N".repeat(512);
  assert.ok(Buffer.byteLength(JSON.stringify(oversized.result), "utf8") > 24 * 1024);
  const beforeLimit = await snapshot(root);
  await assert.rejects(runProductMutation(oversized), expectCode("RESULT_LIMIT"));
  assert.deepEqual(await snapshot(root), beforeLimit);
});
