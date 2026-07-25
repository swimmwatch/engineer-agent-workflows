#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PLANNING_SKILL = "planning-and-task-breakdown";
const MARKER_FILE = "engineering-manual.sha256";
const MANUAL_PARTS = Object.freeze([
  "references",
  "engineering-principles.md",
]);
const DIGEST_PATTERN = /^[a-f0-9]{64}\n$/;
const SKILL_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class ManualVerificationError extends Error {
  constructor(code, message, options = {}) {
    super(message, options.cause === undefined ? undefined : {
      cause: options.cause,
    });
    this.name = "ManualVerificationError";
    this.code = /^E_[A-Z0-9_]+$/.test(code) ? code : "E_MANUAL";
  }
}

function failure(code, message, cause) {
  return new ManualVerificationError(code, message, { cause });
}

function assertStartingPath(fromSkillDir) {
  if (
    typeof fromSkillDir !== "string" ||
    fromSkillDir.length === 0 ||
    fromSkillDir.includes("\0") ||
    fromSkillDir.startsWith("//") ||
    fromSkillDir.startsWith("\\\\") ||
    path.normalize(fromSkillDir) !== fromSkillDir ||
    !path.isAbsolute(path.resolve(fromSkillDir))
  ) {
    throw failure("E_MANUAL_LAYOUT", "engineering manual bundle is unavailable");
  }
}

async function resolveSkillDirectory(fromSkillDir) {
  assertStartingPath(fromSkillDir);
  let resolved;
  try {
    resolved = await fs.realpath(fromSkillDir);
    const stat = await fs.stat(resolved);
    if (!stat.isDirectory()) {
      throw failure(
        "E_MANUAL_LAYOUT",
        "engineering manual bundle is unavailable",
      );
    }
  } catch (error) {
    if (error instanceof ManualVerificationError) {
      throw error;
    }
    throw failure(
      "E_MANUAL_LAYOUT",
      "engineering manual bundle is unavailable",
      error,
    );
  }
  if (!SKILL_NAME_PATTERN.test(path.basename(resolved))) {
    throw failure("E_MANUAL_LAYOUT", "engineering manual bundle is unavailable");
  }
  return resolved;
}

export function layoutPaths(fromSkillDir, pathAPI = path) {
  if (
    typeof fromSkillDir !== "string" ||
    fromSkillDir.length === 0 ||
    fromSkillDir.includes("\0") ||
    !pathAPI.isAbsolute(fromSkillDir) ||
    fromSkillDir.startsWith("//") ||
    fromSkillDir.startsWith("\\\\") ||
    pathAPI.normalize(fromSkillDir) !== fromSkillDir
  ) {
    throw failure("E_MANUAL_LAYOUT", "engineering manual bundle is unavailable");
  }
  const skillName = pathAPI.basename(fromSkillDir);
  if (!SKILL_NAME_PATTERN.test(skillName)) {
    throw failure("E_MANUAL_LAYOUT", "engineering manual bundle is unavailable");
  }
  const skillsRoot = pathAPI.dirname(fromSkillDir);
  return {
    callerSkill: fromSkillDir,
    skillsRoot,
    planningSkill: pathAPI.join(skillsRoot, PLANNING_SKILL),
    marker: pathAPI.join(fromSkillDir, MARKER_FILE),
    manual: pathAPI.join(skillsRoot, PLANNING_SKILL, ...MANUAL_PARTS),
  };
}

export async function locateBundleRoot(fromSkillDir) {
  const callerSkill = await resolveSkillDirectory(fromSkillDir);
  const locations = layoutPaths(callerSkill);
  let planningSkill;
  try {
    planningSkill = await fs.realpath(locations.planningSkill);
    const stat = await fs.stat(planningSkill);
    if (!stat.isDirectory()) {
      throw failure(
        "E_MANUAL_LAYOUT",
        "engineering manual bundle is unavailable",
      );
    }
  } catch (error) {
    if (error instanceof ManualVerificationError) {
      throw error;
    }
    throw failure(
      "E_MANUAL_LAYOUT",
      "engineering manual bundle is unavailable",
      error,
    );
  }
  return {
    callerSkill,
    skillsRoot: locations.skillsRoot,
    planningSkill,
  };
}

async function readRegularFile(filePath, code, message) {
  try {
    const stat = await fs.lstat(filePath);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      throw failure(code, message);
    }
    return await fs.readFile(filePath);
  } catch (error) {
    if (error instanceof ManualVerificationError) {
      throw error;
    }
    throw failure(code, message, error);
  }
}

export async function readExpectedDigest(fromSkillDir) {
  const callerSkill = await resolveSkillDirectory(fromSkillDir);
  const marker = await readRegularFile(
    path.join(callerSkill, MARKER_FILE),
    "E_MANUAL_MARKER",
    "engineering manual marker is unavailable",
  );
  const text = marker.toString("ascii");
  if (!DIGEST_PATTERN.test(text)) {
    throw failure(
      "E_MANUAL_MARKER",
      "engineering manual marker is invalid",
    );
  }
  return text.slice(0, 64);
}

export async function verifyEngineeringManual(fromSkillDir) {
  const [{ callerSkill, planningSkill }, expected] = await Promise.all([
    locateBundleRoot(fromSkillDir),
    readExpectedDigest(fromSkillDir),
  ]);
  const planningExpected =
    callerSkill === planningSkill
      ? expected
      : await readExpectedDigest(planningSkill);
  const manual = await readRegularFile(
    path.join(planningSkill, ...MANUAL_PARTS),
    "E_MANUAL_FILE",
    "engineering manual is unavailable",
  );
  if (manual.length === 0 || manual.at(-1) !== 0x0a) {
    throw failure("E_MANUAL_FILE", "engineering manual is invalid");
  }
  const actual = crypto.createHash("sha256").update(manual).digest("hex");
  if (actual !== expected || actual !== planningExpected) {
    throw failure(
      "E_MANUAL_MISMATCH",
      "engineering manual does not match the installed bundle",
    );
  }
  return {
    callerSkill: path.basename(callerSkill),
    digest: actual,
  };
}

function diagnostic(error) {
  if (error instanceof ManualVerificationError) {
    return `${error.code}: ${error.message}`;
  }
  return "E_INTERNAL: engineering manual verification failed";
}

export async function main(argv, io = {}) {
  const stderr = io.stderr ?? process.stderr;
  if (!Array.isArray(argv) || argv.length !== 1) {
    stderr.write(
      "E_USAGE: verify-engineering-manual.mjs <skill-directory>\n",
    );
    return 2;
  }
  try {
    await verifyEngineeringManual(argv[0]);
    return 0;
  } catch (error) {
    stderr.write(`${diagnostic(error)}\n`);
    return error instanceof ManualVerificationError ? 1 : 2;
  }
}

async function invokedAsMain() {
  if (process.argv[1] === undefined) {
    return false;
  }
  try {
    return (
      (await fs.realpath(process.argv[1])) ===
      (await fs.realpath(fileURLToPath(import.meta.url)))
    );
  } catch {
    return false;
  }
}

if (await invokedAsMain()) {
  process.exitCode = await main(process.argv.slice(2));
}
