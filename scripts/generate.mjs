#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildGeneratedFiles,
  collectReleaseSource,
  compareGeneratedOutputs,
  hasGeneratedArtifacts,
  replaceGeneratedOutputs,
} from "./lib/distribution.mjs";
import {
  formatDiagnostic,
  isValidationError,
  usageError,
  ValidationError,
} from "./lib/errors.mjs";
import { validateSourceRepository } from "./validate.mjs";

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

export async function generateRepository(root, options = {}) {
  const check = options.check ?? false;
  const requireComplete = options.requireComplete ?? true;
  if (!check && !requireComplete) {
    throw usageError("incomplete generation is read-only and requires check mode");
  }
  const result = await validateSourceRepository(root, { requireComplete });
  if (!result.complete) {
    if (await hasGeneratedArtifacts(root, result.catalog)) {
      throw new ValidationError(
        "E_GENERATED_DIFF",
        "incomplete source cannot contain generated packaging artifacts",
      );
    }
    return {
      complete: false,
      checked: check,
      missingSkills: [...result.missingSkills],
    };
  }

  const source = await collectReleaseSource(
    root,
    result.catalog,
    result.release,
  );
  const expected = buildGeneratedFiles(source);
  const generated = check
    ? await compareGeneratedOutputs(root, result.catalog, expected)
    : await replaceGeneratedOutputs(root, result.catalog, expected, {
        rename: options.rename,
      });
  return {
    complete: true,
    checked: check,
    missingSkills: [],
    manualDigest: source.manualDigest,
    generatedFileCount: generated.fileCount,
    sidecarCount: generated.sidecarCount,
    pluginSkillCount: generated.pluginSkillCount,
  };
}

function successMessage(result) {
  if (!result.complete) {
    return `foundation generation check passed: ${result.missingSkills.length} skills pending`;
  }
  if (result.checked) {
    return `generated distribution check passed: ${result.pluginSkillCount} skills`;
  }
  return `generated distribution written: ${result.pluginSkillCount} skills`;
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
    stdout.write(`${successMessage(result)}\n`);
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
