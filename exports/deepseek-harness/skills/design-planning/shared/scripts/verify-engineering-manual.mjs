#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PLANNING_SKILL = "planning-and-task-breakdown";
const SPECIFICATION_SKILL = "spec-driven-development";
const INCREMENTAL_SKILL = "incremental-implementation";
const DESIGN_SKILL = "design-planning";
const DIRECT_DEPENDENCIES = Object.freeze({
  [SPECIFICATION_SKILL]: Object.freeze([]),
  [PLANNING_SKILL]: Object.freeze([SPECIFICATION_SKILL]),
  [INCREMENTAL_SKILL]: Object.freeze([PLANNING_SKILL]),
  [DESIGN_SKILL]: Object.freeze([PLANNING_SKILL]),
});
const SHARED_DIRECTORY = "shared";
const MARKER_PARTS = Object.freeze([
  SHARED_DIRECTORY,
  "engineering-manual.sha256",
]);
const MANUAL_PARTS = Object.freeze([
  SHARED_DIRECTORY,
  "references",
  "engineering-principles.md",
]);
const TEST_DISCIPLINE_MARKER_PARTS = Object.freeze([
  SHARED_DIRECTORY,
  "test-discipline.sha256",
]);
const TEST_DISCIPLINE_PARTS = Object.freeze([
  SHARED_DIRECTORY,
  "references",
  "test-discipline.md",
]);
const PRODUCT_PROTOCOL_SKILLS = new Set([
  SPECIFICATION_SKILL,
  PLANNING_SKILL,
  INCREMENTAL_SKILL,
]);
const PRODUCT_PROTOCOL_MARKER_PARTS = Object.freeze([
  SHARED_DIRECTORY,
  "product-protocol.sha256",
]);
const PRODUCT_PROTOCOL_PARTS = Object.freeze([
  SHARED_DIRECTORY,
  "references",
  "product-workflow.md",
]);
const WORKFLOW_CONTEXT_REFERENCES = Object.freeze([
  "references/workflow-state-access.md",
  "references/implementation-context.md",
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

function dependencyNamesFor(skillName) {
  if (DIRECT_DEPENDENCIES[skillName] === undefined) {
    throw failure("E_MANUAL_LAYOUT", "engineering manual bundle is unavailable");
  }
  const names = [];
  const seen = new Set();
  function visit(name) {
    for (const dependency of DIRECT_DEPENDENCIES[name]) {
      if (seen.has(dependency)) {
        continue;
      }
      seen.add(dependency);
      names.push(dependency);
      visit(dependency);
    }
  }
  visit(skillName);
  return names;
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
    specificationSkill: pathAPI.join(skillsRoot, SPECIFICATION_SKILL),
    marker: pathAPI.join(fromSkillDir, ...MARKER_PARTS),
    manual: pathAPI.join(fromSkillDir, ...MANUAL_PARTS),
    testDisciplineMarker: pathAPI.join(
      fromSkillDir,
      ...TEST_DISCIPLINE_MARKER_PARTS,
    ),
    testDiscipline: pathAPI.join(fromSkillDir, ...TEST_DISCIPLINE_PARTS),
    planningManual: pathAPI.join(
      skillsRoot,
      PLANNING_SKILL,
      ...MANUAL_PARTS,
    ),
    planningTestDiscipline: pathAPI.join(
      skillsRoot,
      PLANNING_SKILL,
      ...TEST_DISCIPLINE_PARTS,
    ),
  };
}

export async function locateBundleRoot(fromSkillDir) {
  const callerSkill = await resolveSkillDirectory(fromSkillDir);
  const locations = layoutPaths(callerSkill);
  const callerName = path.basename(callerSkill);
  const dependencyNames = dependencyNamesFor(callerName);
  const dependencySkills = await Promise.all(
    dependencyNames.map((name) =>
      resolveSkillDirectory(path.join(locations.skillsRoot, name)),
    ),
  );
  const resolved = new Map(
    dependencyNames.map((name, index) => [name, dependencySkills[index]]),
  );
  return {
    callerSkill,
    skillsRoot: locations.skillsRoot,
    planningSkill: resolved.get(PLANNING_SKILL) ?? locations.planningSkill,
    specificationSkill:
      resolved.get(SPECIFICATION_SKILL) ?? locations.specificationSkill,
    dependencySkills,
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
    path.join(callerSkill, ...MARKER_PARTS),
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

async function readExpectedTestDisciplineDigest(fromSkillDir) {
  const callerSkill = await resolveSkillDirectory(fromSkillDir);
  const marker = await readRegularFile(
    path.join(callerSkill, ...TEST_DISCIPLINE_MARKER_PARTS),
    "E_TEST_DISCIPLINE_MARKER",
    "test discipline marker is unavailable",
  );
  const text = marker.toString("ascii");
  if (!DIGEST_PATTERN.test(text)) {
    throw failure(
      "E_TEST_DISCIPLINE_MARKER",
      "test discipline marker is invalid",
    );
  }
  return text.slice(0, 64);
}

async function verifyWorkflowContext(skillDirectory) {
  const hash = crypto.createHash("sha256");
  for (const relativePath of WORKFLOW_CONTEXT_REFERENCES) {
    const bytes = await readRegularFile(path.join(skillDirectory, "shared", ...relativePath.split("/")),
      "E_WORKFLOW_CONTEXT_FILE", "workflow context resource is unavailable");
    if (bytes.length === 0 || bytes.at(-1) !== 0x0a) {
      throw failure("E_WORKFLOW_CONTEXT_FILE", "workflow context resource is invalid");
    }
    hash.update(relativePath).update("\0").update(bytes).update("\0");
  }
  const marker = await readRegularFile(path.join(skillDirectory, "shared", "workflow-context.sha256"),
    "E_WORKFLOW_CONTEXT_MARKER", "workflow context marker is unavailable");
  const expected = marker.toString("utf8");
  if (!DIGEST_PATTERN.test(expected)) throw failure("E_WORKFLOW_CONTEXT_MARKER", "workflow context marker is invalid");
  const digest = hash.digest("hex");
  if (digest !== expected.slice(0, 64)) throw failure("E_WORKFLOW_CONTEXT_MISMATCH", "workflow context does not match the installed bundle");
  return digest;
}

async function verifyOwnedResources(skillDirectory) {
  const [expected, testDisciplineExpected, manual, testDiscipline] =
    await Promise.all([
      readExpectedDigest(skillDirectory),
      readExpectedTestDisciplineDigest(skillDirectory),
      readRegularFile(
        path.join(skillDirectory, ...MANUAL_PARTS),
        "E_MANUAL_FILE",
        "engineering manual is unavailable",
      ),
      readRegularFile(
        path.join(skillDirectory, ...TEST_DISCIPLINE_PARTS),
        "E_TEST_DISCIPLINE_FILE",
        "test discipline is unavailable",
      ),
    ]);
  if (manual.length === 0 || manual.at(-1) !== 0x0a) {
    throw failure("E_MANUAL_FILE", "engineering manual is invalid");
  }
  if (testDiscipline.length === 0 || testDiscipline.at(-1) !== 0x0a) {
    throw failure("E_TEST_DISCIPLINE_FILE", "test discipline is invalid");
  }
  const digest = crypto.createHash("sha256").update(manual).digest("hex");
  if (digest !== expected) {
    throw failure(
      "E_MANUAL_MISMATCH",
      "engineering manual does not match the installed bundle",
    );
  }
  const testDisciplineDigest = crypto
    .createHash("sha256")
    .update(testDiscipline)
    .digest("hex");
  if (testDisciplineDigest !== testDisciplineExpected) {
    throw failure(
      "E_TEST_DISCIPLINE_MISMATCH",
      "test discipline does not match the installed bundle",
    );
  }
  let productProtocolDigest = null;
  if (PRODUCT_PROTOCOL_SKILLS.has(path.basename(skillDirectory))) {
    const [productProtocolMarker, productProtocol] = await Promise.all([
      readRegularFile(
        path.join(skillDirectory, ...PRODUCT_PROTOCOL_MARKER_PARTS),
        "E_PRODUCT_PROTOCOL_MARKER",
        "product protocol marker is unavailable",
      ),
      readRegularFile(
        path.join(skillDirectory, ...PRODUCT_PROTOCOL_PARTS),
        "E_PRODUCT_PROTOCOL_FILE",
        "product protocol is unavailable",
      ),
    ]);
    const markerText = productProtocolMarker.toString("ascii");
    if (!DIGEST_PATTERN.test(markerText)) {
      throw failure(
        "E_PRODUCT_PROTOCOL_MARKER",
        "product protocol marker is invalid",
      );
    }
    if (productProtocol.length === 0 || productProtocol.at(-1) !== 0x0a) {
      throw failure(
        "E_PRODUCT_PROTOCOL_FILE",
        "product protocol is invalid",
      );
    }
    productProtocolDigest = crypto
      .createHash("sha256")
      .update(productProtocol)
      .digest("hex");
    if (productProtocolDigest !== markerText.slice(0, 64)) {
      throw failure(
        "E_PRODUCT_PROTOCOL_MISMATCH",
        "product protocol does not match the installed bundle",
      );
    }
  }
  const workflowContextDigest = await verifyWorkflowContext(skillDirectory);
  return { digest, testDisciplineDigest, productProtocolDigest, workflowContextDigest };
}

export async function verifyEngineeringManual(fromSkillDir) {
  const { callerSkill, dependencySkills } = await locateBundleRoot(fromSkillDir);
  const [owned, ...dependencies] = await Promise.all(
    [callerSkill, ...dependencySkills].map(verifyOwnedResources),
  );
  for (const dependency of dependencies) {
    if (dependency.workflowContextDigest !== owned.workflowContextDigest) {
      throw failure("E_WORKFLOW_CONTEXT_MISMATCH", "workflow context does not match the installed bundle");
    }
    if (dependency.digest !== owned.digest) {
      throw failure(
        "E_MANUAL_MISMATCH",
        "engineering manual does not match the installed bundle",
      );
    }
    if (dependency.testDisciplineDigest !== owned.testDisciplineDigest) {
      throw failure(
        "E_TEST_DISCIPLINE_MISMATCH",
        "test discipline does not match the installed bundle",
      );
    }
    if (
      owned.productProtocolDigest !== null &&
      dependency.productProtocolDigest !== null &&
      dependency.productProtocolDigest !== owned.productProtocolDigest
    ) {
      throw failure(
        "E_PRODUCT_PROTOCOL_MISMATCH",
        "product protocol does not match the installed bundle",
      );
    }
  }
  return {
    callerSkill: path.basename(callerSkill),
    digest: owned.digest,
    testDisciplineDigest: owned.testDisciplineDigest,
    productProtocolDigest: owned.productProtocolDigest,
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
