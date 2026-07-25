#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  formatDiagnostic,
  isValidationError,
  usageError,
  ValidationError,
} from "./lib/errors.mjs";
import { validateRepository } from "./validate.mjs";

const FUTURE_GENERATED_PATHS = Object.freeze([
  "plugins/engineer-agent-workflows",
  ".agents/plugins/marketplace.json",
  ".claude-plugin/marketplace.json",
]);

function parseArguments(argv) {
  let check = false;
  let allowIncomplete = false;
  for (const argument of argv) {
    if (argument === "--check" && !check) {
      check = true;
    } else if (argument === "--allow-incomplete" && !allowIncomplete) {
      allowIncomplete = true;
    } else {
      throw usageError("usage: generate.mjs [--check] [--allow-incomplete]");
    }
  }
  if (allowIncomplete && !check) {
    throw usageError("--allow-incomplete requires --check");
  }
  return { check, allowIncomplete };
}

async function assertNoPrematureGeneratedArtifacts(root) {
  for (const relativePath of FUTURE_GENERATED_PATHS) {
    try {
      await fs.lstat(path.resolve(root, relativePath));
      throw new ValidationError(
        "E_GENERATED_DIFF",
        "generated packaging artifacts exist before the packaging packet",
        { relativePath },
      );
    } catch (error) {
      if (error?.code === "ENOENT") {
        continue;
      }
      if (isValidationError(error)) {
        throw error;
      }
      throw new ValidationError("E_IO", "generated path cannot be inspected", {
        relativePath,
        cause: error,
      });
    }
  }
}

export async function generateRepository(root, options = {}) {
  const check = options.check ?? false;
  const requireComplete = options.requireComplete ?? true;
  if (!check && !requireComplete) {
    throw usageError("incomplete generation is read-only and requires check mode");
  }
  const result = await validateRepository(root, { requireComplete });
  await assertNoPrematureGeneratedArtifacts(root);
  if (result.complete) {
    throw new ValidationError(
      "E_INCOMPLETE",
      "release generation is reserved for the native packaging packet",
    );
  }
  return {
    complete: false,
    checked: check,
    missingSkills: [...result.missingSkills],
  };
}

export async function main(argv, io = {}) {
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const root = io.root ?? process.cwd();
  let options;
  try {
    options = parseArguments(argv);
  } catch (error) {
    stderr.write(`${formatDiagnostic(error)}\n`);
    return 2;
  }
  try {
    const result = await generateRepository(root, {
      check: options.check,
      requireComplete: !options.allowIncomplete,
    });
    stdout.write(
      `foundation generation check passed: ${result.missingSkills.length} skills pending\n`,
    );
    return 0;
  } catch (error) {
    stderr.write(`${formatDiagnostic(error)}\n`);
    return isValidationError(error) ? 1 : 2;
  }
}

const isMain =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  process.exitCode = await main(process.argv.slice(2));
}
