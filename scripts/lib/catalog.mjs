import fs from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";

import { ValidationError } from "./errors.mjs";
import { countCodePoints } from "./skill-document.mjs";

export const APPROVED_SKILL_NAMES = Object.freeze([
  "code-review-and-quality",
  "code-simplification",
  "context-engineering",
  "documentation-and-adrs",
  "doubt-driven-development",
  "idea-refine",
  "incremental-implementation",
  "interview-me",
  "performance-optimization",
  "planning-and-task-breakdown",
  "project-docs-maintainer",
  "project-pull-request",
  "project-release",
  "security-and-hardening",
  "spec-driven-development",
]);

const SKILL_KEYS = new Set([
  "name",
  "description",
  "classification",
  "dependencies",
  "policies",
]);

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function assertClosedObject(value, allowed, rule, code = "E_INVALID_CATALOG") {
  if (!isPlainObject(value)) {
    throw new ValidationError(code, rule);
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new ValidationError(code, `${rule} contains an unknown field`);
    }
  }
}

function assertExactKeys(value, keys, rule, code = "E_INVALID_CATALOG") {
  assertClosedObject(value, new Set(keys), rule, code);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) {
      throw new ValidationError(code, `${rule} is missing a required field`);
    }
  }
}

function assertScalarString(value, rule, code = "E_INVALID_CATALOG") {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    throw new ValidationError(code, rule);
  }
  for (let index = 0; index < value.length; index += 1) {
    const current = value.charCodeAt(index);
    if (current >= 0xd800 && current <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new ValidationError(code, rule);
      }
      index += 1;
    } else if (current >= 0xdc00 && current <= 0xdfff) {
      throw new ValidationError(code, rule);
    }
  }
}

function validatePolicies(value) {
  assertExactKeys(value, ["codex", "claude"], "skill policies");
  assertExactKeys(value.codex, ["allowImplicitInvocation"], "Codex policy");
  assertExactKeys(
    value.claude,
    ["disableModelInvocation", "userInvocable"],
    "Claude policy",
  );
  if (value.codex.allowImplicitInvocation !== false) {
    throw new ValidationError(
      "E_INVALID_CATALOG",
      "Codex implicit invocation must be disabled",
    );
  }
  if (
    value.claude.disableModelInvocation !== true ||
    value.claude.userInvocable !== true
  ) {
    throw new ValidationError(
      "E_INVALID_CATALOG",
      "Claude policy must be explicit-only and user-invocable",
    );
  }
}

export function validateSkillEntry(entry) {
  assertExactKeys(entry, SKILL_KEYS, "skill entry");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name)) {
    throw new ValidationError("E_INVALID_CATALOG", "skill name is invalid");
  }
  assertScalarString(entry.description, "skill description must be valid text");
  if (
    entry.description.trim().length === 0 ||
    entry.description.includes("\n") ||
    entry.description.includes("\r")
  ) {
    throw new ValidationError(
      "E_INVALID_CATALOG",
      "skill description must be one nonblank line",
    );
  }
  if (countCodePoints(entry.description) > 240) {
    throw new ValidationError(
      "E_INVALID_CATALOG",
      "skill description exceeds 240 code points",
    );
  }
  if (!["standalone", "bundle-required"].includes(entry.classification)) {
    throw new ValidationError("E_INVALID_CATALOG", "skill classification is invalid");
  }
  if (!Array.isArray(entry.dependencies)) {
    throw new ValidationError("E_INVALID_CATALOG", "skill dependencies must be an array");
  }
  const dependencies = new Set();
  for (const dependency of entry.dependencies) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(dependency)) {
      throw new ValidationError("E_INVALID_CATALOG", "skill dependency is invalid");
    }
    if (dependency === entry.name || dependencies.has(dependency)) {
      throw new ValidationError("E_INVALID_CATALOG", "skill dependencies are not unique");
    }
    dependencies.add(dependency);
  }
  if (entry.classification === "standalone" && entry.dependencies.length !== 0) {
    throw new ValidationError(
      "E_INVALID_CATALOG",
      "standalone skills cannot require sibling skills",
    );
  }
  if (entry.classification === "bundle-required" && entry.dependencies.length === 0) {
    throw new ValidationError(
      "E_INVALID_CATALOG",
      "bundle-required skills must declare a dependency",
    );
  }
  validatePolicies(entry.policies);
  return structuredClone(entry);
}

export function dependencyOrder(entries) {
  if (!Array.isArray(entries)) {
    throw new ValidationError("E_INVALID_CATALOG", "skill list must be an array");
  }
  const validated = entries.map(validateSkillEntry);
  const names = new Set();
  for (const entry of validated) {
    if (names.has(entry.name)) {
      throw new ValidationError("E_INVALID_CATALOG", "skill names must be unique");
    }
    names.add(entry.name);
  }
  for (const entry of validated) {
    for (const dependency of entry.dependencies) {
      if (!names.has(dependency)) {
        throw new ValidationError(
          "E_INVALID_CATALOG",
          "skill dependency must reference the catalog",
        );
      }
    }
  }
  const remaining = new Set(validated.map((entry) => entry.name));
  const completed = new Set();
  const ordered = [];
  while (remaining.size > 0) {
    const next = validated.find(
      (entry) =>
        remaining.has(entry.name) &&
        entry.dependencies.every((dependency) => completed.has(dependency)),
    );
    if (next === undefined) {
      throw new ValidationError("E_INVALID_CATALOG", "skill dependencies contain a cycle");
    }
    remaining.delete(next.name);
    completed.add(next.name);
    ordered.push(next.name);
  }
  return ordered;
}

export function validateCatalog(catalog) {
  assertExactKeys(catalog, ["schemaVersion", "skills"], "skill catalog");
  if (catalog.schemaVersion !== 1) {
    throw new ValidationError("E_INVALID_CATALOG", "skill catalog schema is unsupported");
  }
  if (!Array.isArray(catalog.skills) || catalog.skills.length !== 15) {
    throw new ValidationError(
      "E_INVALID_CATALOG",
      "skill catalog must contain exactly 15 entries",
    );
  }
  const validated = catalog.skills.map(validateSkillEntry);
  const names = validated.map((entry) => entry.name);
  if (new Set(names).size !== names.length) {
    throw new ValidationError("E_INVALID_CATALOG", "skill names must be unique");
  }
  if (!names.every((name, index) => name === APPROVED_SKILL_NAMES[index])) {
    throw new ValidationError(
      "E_INVALID_CATALOG",
      "skill catalog identity or order does not match the approved inventory",
    );
  }
  dependencyOrder(validated);
  return {
    schemaVersion: 1,
    skills: structuredClone(validated),
  };
}

export function validateReleaseMetadata(release) {
  assertExactKeys(
    release,
    [
      "schemaVersion",
      "repository",
      "version",
      "releaseReady",
      "channels",
      "license",
      "publisher",
      "node",
      "lifecycleTool",
    ],
    "release metadata",
    "E_INVALID_RELEASE",
  );
  if (
    release.schemaVersion !== 1 ||
    release.repository !== "swimmwatch/engineer-agent-workflows" ||
    release.version !== "0.0.0-development" ||
    release.releaseReady !== false ||
    release.license !== "MIT"
  ) {
    throw new ValidationError(
      "E_INVALID_RELEASE",
      "release metadata does not match the development baseline",
    );
  }
  if (
    !Array.isArray(release.channels) ||
    release.channels.length !== 1 ||
    release.channels[0] !== "stable"
  ) {
    throw new ValidationError("E_INVALID_RELEASE", "release channels are invalid");
  }
  assertExactKeys(
    release.publisher,
    ["name", "email", "url"],
    "publisher metadata",
    "E_INVALID_RELEASE",
  );
  if (
    release.publisher.name !== "Dmitry Vasiliev" ||
    release.publisher.email !== "contact.vasiliev.dmitry@gmail.com" ||
    release.publisher.url !== "https://github.com/swimmwatch"
  ) {
    throw new ValidationError(
      "E_INVALID_RELEASE",
      "publisher metadata does not match the approved identity",
    );
  }
  assertExactKeys(release.node, ["minimum"], "Node metadata", "E_INVALID_RELEASE");
  if (release.node.minimum !== "22.20.0") {
    throw new ValidationError("E_INVALID_RELEASE", "Node minimum is invalid");
  }
  assertExactKeys(
    release.lifecycleTool,
    ["package", "version", "integrity", "telemetry"],
    "lifecycle tool metadata",
    "E_INVALID_RELEASE",
  );
  assertExactKeys(
    release.lifecycleTool.telemetry,
    ["environment", "value"],
    "telemetry metadata",
    "E_INVALID_RELEASE",
  );
  if (
    release.lifecycleTool.package !== "skills" ||
    release.lifecycleTool.version !== "1.5.20" ||
    release.lifecycleTool.integrity !==
      "sha512-lPl5KzMfTW+qwHFwc8t6R+wAqmdmSHw1+HWbGdJ/FZYbWLdB34bAZNFWiencM5DVoRaKAgXArmfTWMlNAbl9Gg==" ||
    release.lifecycleTool.telemetry.environment !== "DISABLE_TELEMETRY" ||
    release.lifecycleTool.telemetry.value !== "1"
  ) {
    throw new ValidationError(
      "E_INVALID_RELEASE",
      "lifecycle tool metadata does not match the reviewed baseline",
    );
  }
  return structuredClone(release);
}

export function assertReleaseReady(release) {
  const validated = validateReleaseMetadata(release);
  if (
    validated.releaseReady !== true ||
    !/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(
      validated.version,
    )
  ) {
    throw new ValidationError(
      "E_RELEASE_NOT_READY",
      "release metadata is not eligible for stable publication",
    );
  }
  return structuredClone(validated);
}

async function readJSON(filePath, relativePath) {
  let bytes;
  try {
    bytes = await fs.readFile(filePath);
  } catch (error) {
    throw new ValidationError("E_IO", "required JSON file is unavailable", {
      relativePath,
      cause: error,
    });
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new ValidationError("E_INVALID_JSON", "JSON file must be valid UTF-8", {
      relativePath,
      cause: error,
    });
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new ValidationError("E_INVALID_JSON", "JSON file is malformed", {
      relativePath,
      cause: error,
    });
  }
}

export async function readCatalog(root) {
  const relativePath = "catalog/skills.json";
  const value = await readJSON(path.resolve(root, relativePath), relativePath);
  return validateCatalog(value);
}

export async function readReleaseMetadata(root) {
  const relativePath = "catalog/release.json";
  const value = await readJSON(path.resolve(root, relativePath), relativePath);
  return validateReleaseMetadata(value);
}
