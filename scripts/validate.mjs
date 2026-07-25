#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  APPROVED_SKILL_NAMES,
  readCatalog,
  readReleaseMetadata,
} from "./lib/catalog.mjs";
import {
  formatDiagnostic,
  isValidationError,
  usageError,
  ValidationError,
} from "./lib/errors.mjs";
import { walkFiles } from "./lib/files.mjs";
import { validateSkillDocument } from "./lib/skill-document.mjs";

function parseArguments(argv) {
  let allowIncomplete = false;
  for (const argument of argv) {
    if (argument === "--allow-incomplete" && !allowIncomplete) {
      allowIncomplete = true;
    } else {
      throw usageError("usage: validate.mjs [--allow-incomplete]");
    }
  }
  return { allowIncomplete };
}

async function optionalDirectory(directoryPath, relativePath) {
  try {
    const stat = await fs.lstat(directoryPath);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new ValidationError("E_UNSAFE_PATH", "skill root must be a real directory", {
        relativePath,
      });
    }
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }
    if (isValidationError(error)) {
      throw error;
    }
    throw new ValidationError("E_IO", "skill root is unavailable", {
      relativePath,
      cause: error,
    });
  }
}

async function validateSkills(root, catalog) {
  const skillsRoot = path.resolve(root, "skills");
  const exists = await optionalDirectory(skillsRoot, "skills");
  if (!exists) {
    return {
      present: [],
      missing: [...APPROVED_SKILL_NAMES],
    };
  }

  await walkFiles(skillsRoot);
  const entries = await fs.readdir(skillsRoot, { withFileTypes: true });
  const approved = new Set(APPROVED_SKILL_NAMES);
  for (const entry of entries) {
    if (!approved.has(entry.name)) {
      throw new ValidationError(
        "E_INVALID_SKILL",
        "skills directory contains an unknown entry",
        { relativePath: `skills/${entry.name}` },
      );
    }
    if (entry.isSymbolicLink() || !entry.isDirectory()) {
      throw new ValidationError(
        "E_UNSAFE_PATH",
        "skill entry must be a real directory",
        { relativePath: `skills/${entry.name}` },
      );
    }
  }

  const present = [];
  const missing = [];
  for (const skill of catalog.skills) {
    const skillDirectory = path.join(skillsRoot, skill.name);
    const skillExists = await optionalDirectory(
      skillDirectory,
      `skills/${skill.name}`,
    );
    if (!skillExists) {
      missing.push(skill.name);
      continue;
    }
    const documentPath = path.join(skillDirectory, "SKILL.md");
    let document;
    try {
      document = await fs.readFile(documentPath);
    } catch (error) {
      throw new ValidationError("E_INVALID_SKILL", "skill is missing SKILL.md", {
        relativePath: `skills/${skill.name}/SKILL.md`,
        cause: error,
      });
    }
    try {
      validateSkillDocument(skill, document);
    } catch (error) {
      if (isValidationError(error)) {
        throw new ValidationError(error.code, error.rule, {
          relativePath: `skills/${skill.name}/SKILL.md`,
          cause: error,
        });
      }
      throw error;
    }
    present.push(skill.name);
  }
  return { present, missing };
}

export async function validateRepository(root, options = {}) {
  const requireComplete = options.requireComplete ?? true;
  const catalogRoot = path.resolve(root, "catalog");
  await walkFiles(catalogRoot);
  const [catalog, release] = await Promise.all([
    readCatalog(root),
    readReleaseMetadata(root),
  ]);
  const skills = await validateSkills(root, catalog);
  if (requireComplete && skills.missing.length > 0) {
    throw new ValidationError(
      "E_INCOMPLETE",
      "complete validation requires all 15 skill directories",
    );
  }
  return {
    complete: skills.missing.length === 0,
    catalogSize: catalog.skills.length,
    presentSkills: [...skills.present],
    missingSkills: [...skills.missing],
    release: structuredClone(release),
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
    const result = await validateRepository(root, {
      requireComplete: !options.allowIncomplete,
    });
    const state = result.complete ? "complete" : "foundation";
    stdout.write(
      `${state} validation passed: ${result.presentSkills.length}/${result.catalogSize} skills present\n`,
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
