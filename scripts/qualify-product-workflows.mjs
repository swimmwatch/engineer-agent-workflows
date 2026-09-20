import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { platform } from "node:os";
import { fileURLToPath, pathToFileURL, URL } from "node:url";
import { performance } from "node:perf_hooks";

import { runProductWorkflowQualification } from "../packages/engineer-agent-workflow-mcp/test/support/product-e2e-harness.mjs";

const fixture = JSON.parse(
  await readFile(
    new URL(
      "../tests/fixtures/product-workflows/qualification.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const workflowMcpMain = fileURLToPath(
  new URL(
    "../packages/engineer-agent-workflow-mcp/dist/main.js",
    import.meta.url,
  ),
);
const modelTrialTools = [
  "product_open",
  "product_context_prepare",
  "product_context_next",
  "product_document_list",
  "product_element_get",
  "task_inputs_check",
];

function collectMcpCalls(value, result = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectMcpCalls(item, result);
  } else if (value && typeof value === "object") {
    if (value.type === "mcp_tool_call") {
      const tool = value.tool ?? value.name;
      if (typeof tool === "string") result.push(tool);
    }
    for (const nested of Object.values(value)) collectMcpCalls(nested, result);
  }
  return result;
}

export function modelTrialCodexArgs({ model, effort, workspace, prompt }) {
  return [
    "exec",
    "--ignore-user-config",
    "--ephemeral",
    "--json",
    "--model",
    model,
    "--config",
    `model_reasoning_effort=${JSON.stringify(effort)}`,
    "--config",
    `mcp_servers.engineer-agent-workflow-mcp.command=${JSON.stringify(process.execPath)}`,
    "--config",
    `mcp_servers.engineer-agent-workflow-mcp.args=${JSON.stringify([workflowMcpMain])}`,
    "--config",
    `mcp_servers.engineer-agent-workflow-mcp.enabled_tools=${JSON.stringify(modelTrialTools)}`,
    "--sandbox",
    "read-only",
    "--cd",
    workspace,
    prompt,
  ];
}

function processError(message, stdout, stderr, code) {
  return Object.assign(new Error(message), { stdout, stderr, code });
}

export function executeModelTrialProcess(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const stdoutChunks = [];
    const stderrChunks = [];
    let outputBytes = 0;
    let settled = false;
    let timedOut = false;
    let overflow = false;

    const append = (chunks, chunk) => {
      outputBytes += chunk.length;
      if (outputBytes > options.maxBuffer) {
        overflow = true;
        child.kill();
        return;
      }
      chunks.push(Buffer.from(chunk));
    };
    child.stdout.on("data", (chunk) => append(stdoutChunks, chunk));
    child.stderr.on("data", (chunk) => append(stderrChunks, chunk));

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, options.timeout);
    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const stdout = Buffer.concat(stdoutChunks).toString("utf8");
      const stderr = Buffer.concat(stderrChunks).toString("utf8");
      if (timedOut) {
        reject(
          processError(
            `Process timed out after ${options.timeout} ms.`,
            stdout,
            stderr,
            "ETIMEDOUT",
          ),
        );
      } else if (overflow) {
        reject(
          processError(
            "Process output exceeded maxBuffer.",
            stdout,
            stderr,
            "ERR_CHILD_PROCESS_STDIO_MAXBUFFER",
          ),
        );
      } else if (code !== 0) {
        reject(
          processError(
            `Process exited with code ${code ?? signal}.`,
            stdout,
            stderr,
            code,
          ),
        );
      } else {
        resolve({ stdout, stderr });
      }
    });
    child.stdin.on("error", () => {});
    child.stdin.end();
  });
}

async function runModelTrial({
  model,
  effort,
  role,
  prompt,
  workspace,
  productRoot,
}) {
  const started = performance.now();
  try {
    const { stdout, stderr } = await executeModelTrialProcess(
      "codex",
      modelTrialCodexArgs({ model, effort, workspace, prompt }),
      {
        cwd: workspace,
        env: { ...process.env, EAW_PRODUCT_DATA_DIR: productRoot },
        maxBuffer: 16 * 1024 * 1024,
        timeout: 180_000,
      },
    );
    const events = stdout
      .split(/\r?\n/u)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const toolCalls = collectMcpCalls(events).filter(
      (tool) => tool.startsWith("product_") || tool.startsWith("task_"),
    );
    return {
      role,
      model,
      effort,
      status: toolCalls.length > 0 ? "pass" : "blocked",
      reason:
        toolCalls.length > 0
          ? "Fresh ephemeral context used product workflow MCP calls."
          : "The model returned without an observable product workflow MCP call.",
      elapsedMs: performance.now() - started,
      toolCalls,
      stdoutBytes: Buffer.byteLength(stdout),
      stderrBytes: Buffer.byteLength(stderr),
      transcriptSha256: createHash("sha256").update(stdout).digest("hex"),
    };
  } catch (error) {
    return {
      role,
      model,
      effort,
      status: "blocked",
      reason: `Fresh model trial failed: ${String(error?.message ?? error).slice(0, 512)}`,
      elapsedMs: performance.now() - started,
      toolCalls: [],
      stdoutBytes: Buffer.byteLength(error?.stdout ?? ""),
      stderrBytes: Buffer.byteLength(error?.stderr ?? ""),
      transcriptSha256: null,
    };
  }
}

export async function qualifyProductWorkflows({ modelTrials = false } = {}) {
  const cleanup = [];
  const testContext = {
    after(callback) {
      cleanup.push(callback);
    },
  };
  const started = performance.now();
  try {
    const result = await runProductWorkflowQualification(testContext, {
      restartReviewer: true,
    });
    const workflowElapsedMs = performance.now() - started;
    const os = platform();
    const node = process.versions.node;
    const callMetrics = [
      ...result.calls
        .reduce((groups, entry) => {
          const key = `${entry.actor}\u0000${entry.tool}`;
          const current = groups.get(key) ?? {
            actor: entry.actor,
            tool: entry.tool,
            count: 0,
            elapsedMs: 0,
            responseBytes: 0,
            errorCount: 0,
          };
          current.count += 1;
          current.elapsedMs += entry.elapsedMs;
          current.responseBytes += entry.responseBytes;
          current.errorCount += entry.isError ? 1 : 0;
          groups.set(key, current);
          return groups;
        }, new Map())
        .values(),
    ].sort(
      (left, right) =>
        left.actor.localeCompare(right.actor) ||
        left.tool.localeCompare(right.tool),
    );
    const trials = modelTrials
      ? await Promise.all([
          runModelTrial({
            model: "gpt-5.6-sol",
            effort: "high",
            role: "independent-reviewer",
            workspace: result.workspaces[0],
            productRoot: result.productRoot,
            prompt:
              "Independently assess the current product definition and delivery task for internal consistency. Use the available product workflow MCP read-only capabilities against this workspace and read the selected source content completely where material. Do not modify files or workflow state. Report the exact source version, artifacts actually inspected, any blockers, and a concise acceptance result.",
          }),
          runModelTrial({
            model: "gpt-5.6-terra",
            effort: "high",
            role: "prospective-implementer",
            workspace: result.workspaces[1],
            productRoot: result.productRoot,
            prompt:
              "Inspect the current inputs for TASK-0002 as a prospective implementer. Use the available product workflow MCP read-only capabilities against this workspace and read selected sources completely where needed. Do not modify files or workflow state and do not implement anything. Report the exact source version, selected artifacts, blockers, and whether the task is ready for one bounded implementation packet.",
          }),
        ])
      : [];
    return {
      schemaVersion: 1,
      localSmoke: {
        status: "pass",
        os,
        node,
        elapsedMs: workflowElapsedMs,
        processes: result.processes,
        workspaces: result.workspaces.length,
        persistedBytes: result.persistedBytes,
        callCount: result.calls.length,
        responseBytes: result.calls.reduce(
          (total, entry) => total + entry.responseBytes,
          0,
        ),
        calls: callMetrics,
        sourceReads: result.sourceReads,
        taskSpecifications: result.taskSpecifications,
        compatibleAmendment: result.compatibleAmendment,
        safetyBlock: result.safetyBlock,
        recovery: result.recovery,
      },
      nativeMatrix: [
        {
          os,
          node,
          status: "pass",
          reason: "Executed by explicit local qualification run.",
        },
      ],
      modelTrials: trials,
    };
  } finally {
    for (const callback of cleanup.reverse()) await callback();
  }
}

async function main() {
  if (!process.argv.includes("--run")) {
    process.stderr.write("Explicit qualification requires --run.\n");
    process.exitCode = 1;
    return;
  }
  const modelTrials = !process.argv.includes("--skip-model-trials");
  process.stdout.write(
    `${JSON.stringify(await qualifyProductWorkflows({ modelTrials }), null, 2)}\n`,
  );
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url)
  await main();
