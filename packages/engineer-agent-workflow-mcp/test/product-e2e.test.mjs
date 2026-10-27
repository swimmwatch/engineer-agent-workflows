import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, realpath, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, URL } from "node:url";
import test from "node:test";
import { promisify } from "node:util";

import { runProductWorkflowQualification } from "./support/product-e2e-harness.mjs";
import { createQualificationDiagnostics, reportQualificationChildFailure } from "./support/qualification-diagnostics.mjs";

test("I11-N4: qualification labels are finite and preserve packed default diagnostics", async () => {
  for (const [selected, expected] of [[undefined, "packed"], ["public", "public"], ["SENTINEL_PRIVATE_LABEL", "redacted"]]) {
    const controller = new globalThis.AbortController(), lines = [], hooks = [];
    const diagnostics = createQualificationDiagnostics({ signal: controller.signal,
      diagnostic(line) { lines.push(JSON.parse(line)); }, after(hook) { hooks.push(hook); } }, selected);
    await diagnostics.phase("reliability", async () => {
      diagnostics.observe({ event: "start", actor: "SENTINEL_PRIVATE_ACTOR", tool: "SENTINEL_PRIVATE_TOOL",
        scenario: "SENTINEL_PRIVATE_SCENARIO", arguments: { context: "SENTINEL_CONTEXT" } });
      controller.abort();
    });
    assert.equal(lines.find(line => line.event === "aborted").qualification, expected);
    assert.doesNotMatch(JSON.stringify(lines), /SENTINEL/);
    for (const hook of hooks) hook();
  }
});

const executeFile = promisify(execFile);
const qualificationScript = fileURLToPath(
  new URL("../../../scripts/qualify-product-workflows.mjs", import.meta.url),
);

test("I11-N1: public and recovery fixtures accept a temporary parent alias", { timeout: 120_000 }, async (t) => {
  const directory = await realpath(await mkdtemp(join(tmpdir(), "eaw-temporary-alias-")));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const physical = join(directory, "physical temporary parent");
  const alias = join(directory, "temporary alias & data");
  await mkdir(physical);
  await symlink(physical, alias, process.platform === "win32" ? "junction" : "dir");
  const cases = [
    ["public qualification", "^Q36:", fileURLToPath(import.meta.url)],
    ["session recovery", "^public session resume", fileURLToPath(new URL("./product-session-recovery.test.mjs", import.meta.url))],
  ];
  const env = { ...process.env, TMPDIR: alias, TMP: alias, TEMP: alias };
  delete env.NODE_TEST_CONTEXT;
  for (const [name, pattern, file] of cases) {
    await t.test(name, async (child) => {
      const started = performance.now();
      let result;
      try {
        result = await executeFile(process.execPath, ["--test", "--test-name-pattern", pattern, file], {
          env,
          maxBuffer: 1024 * 1024,
          timeout: 90_000,
        });
      } catch (error) {
        try {
          reportQualificationChildFailure(line => child.diagnostic(line), {
            case: name === "public qualification" ? "public-qualification" : "session-recovery",
            deadlineMs: 90_000, elapsedMs: Math.max(0, Math.round(performance.now() - started)),
          }, error);
        } catch { /* Diagnostics cannot replace the original child failure. */ }
        throw error;
      }
      assert.equal(result.stderr, "");
      assert.match(result.stdout, /(?:#|ℹ) pass 1\b/u);
      assert.match(result.stdout, /(?:#|ℹ) fail 0\b/u);
    });
  }
});

test("Q37: qualification is explicit-only and import has no execution effect", async () => {
  const imported =
    await import("../../../scripts/qualify-product-workflows.mjs");
  assert.equal(typeof imported.qualifyProductWorkflows, "function");
  await assert.rejects(
    executeFile(process.execPath, [qualificationScript]),
    (error) => error.code === 1 && /requires --run/u.test(error.stderr),
  );
});

test("Q38: model trials isolate the local development MCP and read-only tools", async () => {
  const imported =
    await import("../../../scripts/qualify-product-workflows.mjs");
  assert.equal(typeof imported.modelTrialCodexArgs, "function");

  const args = imported.modelTrialCodexArgs({
    model: "gpt-6.1-sol",
    effort: "low",
    workspace: "/synthetic/workspace",
    prompt: "Inspect synthetic product inputs.",
  });
  assert.ok(args.includes("--ignore-user-config"));

  const configs = args.flatMap((value, index) =>
    value === "--config" ? [args[index + 1]] : [],
  );
  const command = configs.find((value) =>
    value.startsWith("mcp_servers.engineer-agent-workflow-mcp.command="),
  );
  const serverArgs = configs.find((value) =>
    value.startsWith("mcp_servers.engineer-agent-workflow-mcp.args="),
  );
  const enabledTools = configs.find((value) =>
    value.startsWith("mcp_servers.engineer-agent-workflow-mcp.enabled_tools="),
  );

  assert.equal(JSON.parse(command.split("=")[1]), process.execPath);
  assert.match(
    JSON.parse(serverArgs.split("=")[1])[0],
    /packages[/\\]engineer-agent-workflow-mcp[/\\]dist[/\\]main\.js$/u,
  );
  assert.deepEqual(JSON.parse(enabledTools.split("=")[1]), [
    "product_open",
    "product_context_prepare",
    "product_context_next",
    "product_document_list",
    "product_element_get",
    "task_inputs_check",
  ]);
});

test("Q38: model trial process closes piped stdin before awaiting output", async () => {
  const imported =
    await import("../../../scripts/qualify-product-workflows.mjs");
  assert.equal(typeof imported.executeModelTrialProcess, "function");

  const result = await imported.executeModelTrialProcess(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      "process.stdin.resume(); process.stdin.once('end', () => process.stdout.write('stdin-closed'));",
    ],
    {
      cwd: process.cwd(),
      env: process.env,
      maxBuffer: 1024,
      timeout: 1_000,
    },
  );
  assert.equal(result.stdout, "stdin-closed");
  assert.equal(result.stderr, "");
});

test("Q36: two workspaces and two stdio processes complete the product lifecycle", async () => {
  const imported =
    await import("../../../scripts/qualify-product-workflows.mjs");
  const qualification = await imported.qualifyProductWorkflows({
    modelTrials: false,
  });
  const result = qualification.localSmoke;

  assert.equal(result.processes, 2);
  assert.equal(result.workspaces, 2);
  assert.deepEqual(
    [...new Set(result.sourceReads.map((entry) => entry.artifact))].sort(),
    ["idea", "prd", "roadmap", "technical-design"],
  );
  assert.deepEqual(
    result.taskSpecifications.map((entry) => entry.slug),
    ["product-workflow-a", "product-workflow-b"],
  );
  assert.equal(result.compatibleAmendment.status, "pass");
  assert.equal(result.safetyBlock.status, "blocked");
  assert.ok(result.calls.every((entry) => entry.responseBytes > 0));
  assert.ok(result.calls.every((entry) => entry.elapsedMs >= 0));
  assert.deepEqual(qualification.nativeMatrix, [
    {
      os: process.platform,
      node: process.versions.node,
      status: "pass",
      reason: "Executed by explicit local qualification run.",
    },
  ]);
});

test("Q38: exact source pages and restart recovery remain lossless", async (t) => {
  const result = await runProductWorkflowQualification(t, {
    restartReviewer: true,
  });

  assert.equal(
    result.sourceReads.every((entry) => entry.complete),
    true,
  );
  assert.equal(
    result.sourceReads.every((entry) => entry.sha256 === entry.expectedSha256),
    true,
  );
  assert.equal(result.recovery.replayed, true);
  assert.equal(result.recovery.duplicateVerdicts, 0);
});


test("synthetic WellHelm retirement completes through public MCP and preserves ready history", async (t) => {
  const result = await runProductWorkflowQualification(t, { retirement: true });
  assert.equal(result.retirement.status, "pass");
  assert.equal(result.retirement.taskId, "TASK-0029");
  assert.notEqual(result.retirement.generation, result.retirement.previousGeneration);
  assert.equal(result.calls.filter((call) => call.tool === "roadmap_unlink_dependency" && !call.isError).length, 2);
  assert.equal(result.calls.filter((call) => call.tool === "roadmap_retire_task" && !call.isError).length, 1);
});

test("I11: public actor sessions reconstruct draft evidence and recheck exactly 119 blocks", { timeout: process.platform === "win32" ? 1_200_000 : 600_000 }, async (t) => {
  const diagnostics = createQualificationDiagnostics(t, "public");
  let observedRequests = 0, observedLastReviewItem = false;
  const onProgress = (event) => {
    diagnostics.observe(event);
    if (event.event === "start") observedRequests += 1;
    if (event.event === "review-item" && event.itemIndex === 118 && event.totalItems === 119) observedLastReviewItem = true;
  };
  const result = await diagnostics.phase("reliability", () => runProductWorkflowQualification(t, { reliability: true, onProgress }));
  assert.ok(observedRequests > 0, "the public observer must receive actual requests");
  assert.equal(observedLastReviewItem, true, "the public observer must receive the final actual review item");
  assert.equal(result.reliability?.sessionActors, 2, "both independent actors must use public sessions");
  assert.deepEqual(result.reliability.draftKinds, ["decision", "research"]);
  assert.equal(result.reliability.exactDraftReads, 2);
  assert.equal(result.reliability.restartDeliveryExact, true);
  assert.equal(result.reliability.unknownResultRecovered, true);
  assert.equal(result.reliability.recoveryEffects, 1);
  assert.equal(result.reliability.parentItems, 119);
  assert.equal(result.reliability.inheritedItems, 118);
  assert.equal(result.reliability.freshItems, 1);
  assert.equal(result.reliability.freshConsistency, true);
  assert.equal(result.reliability.parentUnchanged, true);
  assert.equal(result.reliability.authorReopened, true);
  assert.ok(result.calls.some((entry) => entry.actor === "product-reviewer-qualification" && entry.tool === "product_session_call" && entry.scenario === "product_review_record"));
  assert.ok(result.calls.some((entry) => entry.actor === "product-author-qualification" && entry.tool === "product_session_call" && entry.scenario === "product_record_research"));
  t.diagnostic(JSON.stringify({ os: process.platform, node: process.versions.node, reliability: result.reliability }));
});

test("I11: public Technical Design accepts global architecture and empty decision source elements before Roadmap", { timeout: 120_000 }, async (t) => {
  const result = await runProductWorkflowQualification(t, { remediation: true });
  assert.equal(result.remediation?.acceptedTargetBeforeRoadmap, true);
  assert.equal(result.remediation.emptyDecisionPins > 0, true);
  assert.equal(result.remediation.acceptedTargetReadBack, true);
});
