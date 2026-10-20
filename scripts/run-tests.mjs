import { spawn } from "node:child_process";
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
    if (argument === "--serial") {
      serial = true;
    } else if (argument === "--test-concurrency") {
      if (requestedConcurrency !== undefined) throw new Error("Test concurrency can be specified only once.");
      const value = argumentsList[index + 1];
      if (value === undefined) throw new Error("Test concurrency requires a value between 1 and 8.");
      requestedConcurrency = parseConcurrency(value);
      index += 1;
    } else if (argument?.startsWith("--test-concurrency=")) {
      if (requestedConcurrency !== undefined) throw new Error("Test concurrency can be specified only once.");
      requestedConcurrency = parseConcurrency(argument.slice("--test-concurrency=".length));
    } else if (argument?.startsWith("--test-isolation") || argument?.startsWith("--experimental-test-isolation")) {
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

export async function runTests(argumentsList = process.argv.slice(2)) {
  let configuration;
  try {
    configuration = parseTestRunnerArguments(argumentsList);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 2;
  }

  return await new Promise((resolve) => {
    const child = spawn(process.execPath, [
      "--test",
      "--test-isolation=process",
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
