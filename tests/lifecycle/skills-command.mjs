import { spawn, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const SKILLS_PACKAGE = "skills@1.5.20";
export const DEFAULT_TIMEOUT_MS = 120_000;
export const DEFAULT_OUTPUT_LIMIT = 256 * 1024;

const ALLOWED_COMMANDS = new Set(["add", "list", "remove", "update"]);
// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\u001b(?:\[[0-?]*[ -/]*[@-~]|[@-_])/g;

function hasFlag(args, ...flags) {
  return args.some((argument) => flags.includes(argument));
}

function countFlag(args, ...flags) {
  return args.filter((argument) => flags.includes(argument)).length;
}

function validateArguments(args) {
  if (
    !Array.isArray(args) ||
    args.length === 0 ||
    args.some(
      (argument) =>
        typeof argument !== "string" ||
        argument.length === 0 ||
        argument.includes("\0"),
    )
  ) {
    throw new Error("E_SKILLS_ARGS: invalid argument vector");
  }
  if (!ALLOWED_COMMANDS.has(args[0])) {
    throw new Error("E_SKILLS_ARGS: unsupported lifecycle command");
  }
  if (hasFlag(args, "--project", "-p") || !hasFlag(args, "--global", "-g")) {
    throw new Error("E_SKILLS_SCOPE: lifecycle command must be global");
  }

  const command = args[0];
  if (command === "update") {
    if (hasFlag(args, "--agent", "-a")) {
      throw new Error("E_SKILLS_UPDATE: upstream update has no agent option");
    }
    if (!hasFlag(args, "--yes", "-y")) {
      throw new Error("E_SKILLS_ARGS: update must be non-interactive");
    }
    const names = args
      .slice(1)
      .filter((argument) => !argument.startsWith("-"));
    if (names.length !== 1) {
      throw new Error("E_SKILLS_ARGS: update requires one explicit skill");
    }
    return;
  }

  if (countFlag(args, "--agent", "-a") === 0) {
    throw new Error("E_SKILLS_ARGS: explicit agent selection required");
  }
  if (
    command !== "list" &&
    !hasFlag(args, "--skill", "-s") &&
    !(command === "remove" && hasFlag(args, "--all"))
  ) {
    throw new Error("E_SKILLS_ARGS: explicit skill selection required");
  }
  if (command === "list") {
    if (countFlag(args, "--agent", "-a") !== 1 || !hasFlag(args, "--json")) {
      throw new Error("E_SKILLS_ARGS: list requires one agent and JSON output");
    }
  } else if (!hasFlag(args, "--yes", "-y")) {
    throw new Error("E_SKILLS_ARGS: lifecycle command must be non-interactive");
  }
}

export function buildSkillsInvocation(
  args,
  { platform = process.platform } = {},
) {
  validateArguments(args);
  return {
    executable: platform === "win32" ? "npx.cmd" : "npx",
    args: ["--yes", SKILLS_PACKAGE, ...args],
  };
}

function boundedAppend(state, chunk, limit) {
  const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
  const remaining = Math.max(0, limit - state.bytes);
  if (remaining > 0) {
    state.chunks.push(bytes.subarray(0, remaining));
    state.bytes += Math.min(bytes.length, remaining);
  }
  if (bytes.length > remaining) {
    state.exceeded = true;
  }
}

export function sanitizeLifecycleOutput(value, redactRoot) {
  let output = String(value).replace(ANSI_PATTERN, "");
  if (typeof redactRoot === "string" && redactRoot.length > 0) {
    const variants = new Set([
      redactRoot,
      redactRoot.replaceAll("\\", "/"),
      redactRoot.replaceAll("/", "\\"),
      pathToFileURL(redactRoot).href.replace(/\/$/, ""),
    ]);
    for (const variant of variants) {
      output = output.replaceAll(variant, "<TEMP>");
    }
  }
  return output;
}

function terminateProcessTree(child, platform) {
  if (!child || child.exitCode !== null || typeof child.pid !== "number") {
    return;
  }
  if (platform === "win32") {
    spawnSync(
      "taskkill.exe",
      ["/PID", String(child.pid), "/T", "/F"],
      { shell: false, stdio: "ignore", windowsHide: true },
    );
    child.kill();
    return;
  }
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}

function forceTerminateProcessTree(child, platform) {
  if (!child || child.exitCode !== null || typeof child.pid !== "number") {
    return;
  }
  if (platform === "win32") {
    terminateProcessTree(child, platform);
    return;
  }
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {
    child.kill("SIGKILL");
  }
}

export async function runSkills(
  args,
  {
    cwd,
    env,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxOutputBytes = DEFAULT_OUTPUT_LIMIT,
    signal,
    platform = process.platform,
    redactRoot,
    spawnImpl = spawn,
  } = {},
) {
  const invocation = buildSkillsInvocation(args, { platform });
  if (
    typeof cwd !== "string" ||
    !env ||
    !Number.isInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > 300_000 ||
    !Number.isInteger(maxOutputBytes) ||
    maxOutputBytes < 1 ||
    maxOutputBytes > 1024 * 1024
  ) {
    throw new Error("E_SKILLS_OPTIONS: invalid command options");
  }
  if (signal?.aborted) {
    throw new Error("E_SKILLS_CANCELLED: command not started");
  }

  const stdout = { chunks: [], bytes: 0, exceeded: false };
  const stderr = { chunks: [], bytes: 0, exceeded: false };
  let timedOut = false;
  let cancelled = false;
  let terminating = false;
  let escalationTimer;

  const child = spawnImpl(invocation.executable, invocation.args, {
    cwd,
    env: { ...env },
    shell: false,
    windowsHide: true,
    detached: platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });

  const terminate = (reason) => {
    if (terminating) {
      return;
    }
    terminating = true;
    timedOut = reason === "timeout";
    cancelled = reason === "cancelled";
    terminateProcessTree(child, platform);
    if (platform !== "win32") {
      escalationTimer = setTimeout(
        () => forceTerminateProcessTree(child, platform),
        250,
      );
    }
  };

  child.stdout?.on("data", (chunk) => {
    boundedAppend(stdout, chunk, maxOutputBytes);
    if (stdout.exceeded) {
      terminate("output");
    }
  });
  child.stderr?.on("data", (chunk) => {
    boundedAppend(stderr, chunk, maxOutputBytes);
    if (stderr.exceeded) {
      terminate("output");
    }
  });

  const timer = setTimeout(() => terminate("timeout"), timeoutMs);
  const abort = () => terminate("cancelled");
  signal?.addEventListener("abort", abort, { once: true });

  let result;
  try {
    result = await new Promise((resolve, reject) => {
      child.once("error", () => {
        reject(new Error("E_SKILLS_START: lifecycle command unavailable"));
      });
      child.once("close", (exitCode, exitSignal) => {
        resolve({ exitCode, signal: exitSignal });
      });
    });
  } finally {
    clearTimeout(timer);
    clearTimeout(escalationTimer);
    signal?.removeEventListener("abort", abort);
  }

  return {
    ...result,
    timedOut,
    cancelled,
    outputExceeded: stdout.exceeded || stderr.exceeded,
    stdout: sanitizeLifecycleOutput(
      Buffer.concat(stdout.chunks).toString("utf8"),
      redactRoot,
    ),
    stderr: sanitizeLifecycleOutput(
      Buffer.concat(stderr.chunks).toString("utf8"),
      redactRoot,
    ),
    command: {
      executable: invocation.executable,
      args: [...invocation.args],
    },
  };
}
