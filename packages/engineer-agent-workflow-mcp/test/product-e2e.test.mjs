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
