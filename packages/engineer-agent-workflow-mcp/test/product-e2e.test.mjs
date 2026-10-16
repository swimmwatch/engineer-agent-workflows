import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { fileURLToPath, URL } from "node:url";
import test from "node:test";
import { promisify } from "node:util";

import { runProductWorkflowQualification } from "./support/product-e2e-harness.mjs";

const executeFile = promisify(execFile);
const qualificationScript = fileURLToPath(
  new URL("../../../scripts/qualify-product-workflows.mjs", import.meta.url),
);

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
    model: "gpt-5.6-sol",
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

test("I11: public actor sessions reconstruct draft evidence and recheck exactly 119 blocks", { timeout: 600_000 }, async (t) => {
  const result = await runProductWorkflowQualification(t, { reliability: true });
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
