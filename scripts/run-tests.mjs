import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { availableParallelism } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MAX_TEST_CONCURRENCY = 8;

function parseConcurrency(value) {
  const concurrency = Number(value);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > MAX_TEST_CONCURRENCY) {
    throw new Error(`Test concurrency must be an integer between 1 and ${MAX_TEST_CONCURRENCY}.`);
  }
  return concurrency;
}

export function parseTestRunnerArguments(argumentsList, available = availableParallelism()) {
  const nodeArguments = [];
  let requestedConcurrency;
  let serial = false;

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--") {
      nodeArguments.push(...argumentsList.slice(index));
      break;
    }
    const normalizedArgument = argument?.replaceAll("_", "-");
    if (normalizedArgument === "--serial") {
      serial = true;
    } else if (normalizedArgument === "--test-concurrency") {
      if (requestedConcurrency !== undefined) throw new Error("Test concurrency can be specified only once.");
      const value = argumentsList[index + 1];
      if (value === undefined) throw new Error("Test concurrency requires a value between 1 and 8.");
      requestedConcurrency = parseConcurrency(value);
      index += 1;
    } else if (normalizedArgument?.startsWith("--test-concurrency=")) {
      if (requestedConcurrency !== undefined) throw new Error("Test concurrency can be specified only once.");
      requestedConcurrency = parseConcurrency(normalizedArgument.slice("--test-concurrency=".length));
    } else if (normalizedArgument?.startsWith("--test-isolation") || normalizedArgument?.startsWith("--experimental-test-isolation")) {
      throw new Error("Test isolation is managed by the project test runner.");
    } else if (argument !== undefined) {
      nodeArguments.push(argument);
    }
  }

  if (serial && requestedConcurrency !== undefined) {
    throw new Error("Serial mode cannot be combined with an explicit test concurrency.");
  }
  const detectedCapacity = Number.isInteger(available) && available > 0 ? available : 1;
  const concurrency = serial
    ? 1
    : Math.min(requestedConcurrency ?? MAX_TEST_CONCURRENCY, detectedCapacity, MAX_TEST_CONCURRENCY);
  return { concurrency, nodeArguments };
}

// Detached values recognized by the pinned Node 22.20.0 / 24.14.0 CLI.
// V8 options use inline values; optional inspector switches do not consume a value.
const VALUE_OPTIONS = new Set([
  "--allow-fs-read",
  "--allow-fs-write",
  "--build-snapshot-config",
  "--conditions",
  "--cpu-prof-dir",
  "--cpu-prof-interval",
  "--cpu-prof-name",
  "--debug-port",
  "--diagnostic-dir",
  "--disable-proto",
  "--disable-warning",
  "--dns-result-order",
  "--env-file",
  "--env-file-if-exists",
  "--eval",
  "--experimental-config-file",
  "--experimental-default-type",
  "--experimental-loader",
  "--experimental-sea-config",
  "--heap-prof-dir",
  "--heap-prof-interval",
  "--heap-prof-name",
  "--heapsnapshot-near-heap-limit",
  "--heapsnapshot-signal",
  "--icu-data-dir",
  "--import",
  "--input-type",
  "--inspect-port",
  "--inspect-publish-uid",
  "--loader",
  "--localstorage-file",
  "--max-http-header-size",
  "--max-old-space-size-percentage",
  "--network-family-autoselection-attempt-timeout",
  "--openssl-config",
  "--print",
  "--redirect-warnings",
  "--report-dir",
  "--report-directory",
  "--report-filename",
  "--report-signal",
  "--require",
  "--run",
  "--secure-heap",
  "--secure-heap-min",
  "--security-revert",
  "--security-reverts",
  "--snapshot-blob",
  "--stack-trace-limit",
  "--test-coverage-branches",
  "--test-coverage-exclude",
  "--test-coverage-functions",
  "--test-coverage-include",
  "--test-coverage-lines",
  "--test-global-setup",
  "--test-name-pattern",
  "--test-reporter",
  "--test-reporter-destination",
  "--test-rerun-failures",
  "--test-shard",
  "--test-skip-pattern",
  "--test-timeout",
  "--title",
  "--tls-cipher-list",
  "--tls-keylog",
  "--trace-event-categories",
  "--trace-event-file-pattern",
  "--trace-require-module",
  "--unhandled-rejections",
  "--use-largepages",
  "--v8-pool-size",
  "--watch-kill-signal",
  "--watch-path",
  "-C",
  "-e",
  "-p",
  "-pe",
  "-r",
]);

function hasExplicitSelector(argumentsList) {
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--") return index + 1 < argumentsList.length;
    if (VALUE_OPTIONS.has(argument.replaceAll("_", "-"))) {
      if (argumentsList[index + 1] === undefined) return true; // Preserve Node's missing-value error.
      index += 1;
    } else if (!argument.startsWith("-")) return true;
  }
  return false;
}

async function canonicalTestFiles(root) {
  const files = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true }).catch((error) => {
      if (error.code === "ENOENT") return [];
      throw error;
    });
    for (const entry of entries) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(target);
      else if (entry.isFile() && /(?:^test|[._-]test)(?:[._-].*)?\.(?:mjs|cjs|js)$/u.test(entry.name)) files.push(path.relative(root, target));
    }
  }
  await visit(path.join(root, "tests"));
  const packages = await readdir(path.join(root, "packages"), { withFileTypes: true }).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  for (const entry of packages) if (entry.isDirectory()) await visit(path.join(root, "packages", entry.name, "test"));
  return files.sort();
}

export async function runTests(argumentsList = process.argv.slice(2)) {
  let configuration;
  try {
    configuration = parseTestRunnerArguments(argumentsList);
    if (!hasExplicitSelector(configuration.nodeArguments)) {
      const files = await canonicalTestFiles(process.cwd());
      if (files.length === 0) throw new Error("No canonical test files found under tests/ or packages/*/test/; pass an explicit selector.");
      configuration.nodeArguments.push(...files);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 2;
  }

  return await new Promise((resolve) => {
    const child = spawn(process.execPath, [
      "--test",
      ...(process.allowedNodeEnvironmentFlags.has("--test-isolation") ? ["--test-isolation=process"] : []),
      `--test-concurrency=${configuration.concurrency}`,
      ...configuration.nodeArguments,
    ], {
      env: process.env,
      stdio: "inherit",
    });
    child.once("error", (error) => {
      console.error(`Unable to start the Node.js test runner: ${error.message}`);
      resolve(1);
    });
    child.once("exit", (code, signal) => {
      if (signal !== null) console.error(`Node.js test runner stopped by signal ${signal}.`);
      resolve(code ?? 1);
    });
  });
}

const invokedPath = process.argv[1] === undefined ? undefined : path.resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  process.exitCode = await runTests();
}
