#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PRODUCT_WORKFLOW_SKILL_CHAIN = Object.freeze([
  "idea-refine",
  "product-definition",
  "technical-design",
  "product-roadmap",
]);
const MARKER_PARTS = Object.freeze(["shared", "product-workflow.sha256"]);
export const PRODUCT_WORKFLOW_SKILL_REFERENCES = Object.freeze({
  "technical-design": Object.freeze(["references/technology-decisions.md"]),
});
const PROTOCOL_PARTS = Object.freeze([
  "shared",
  "references",
  "product-workflow.md",
]);
export const PRODUCT_WORKFLOW_PROFILE_PATHS = Object.freeze([
  "references/product-profiles/backend.md",
  "references/product-profiles/core.md",
  "references/product-profiles/cross-surface.md",
  "references/product-profiles/data.md",
  "references/product-profiles/events.md",
  "references/product-profiles/operations.md",
  "references/product-profiles/security.md",
  "references/product-profiles/ui.md",
]);
const DIGEST_PATTERN = /^[a-f0-9]{64}\n$/u;

export class ProductWorkflowVerificationError extends Error {
  constructor(code, message, options = {}) {
    super(message, options.cause === undefined ? undefined : {
      cause: options.cause,
    });
    this.name = "ProductWorkflowVerificationError";
    this.code = /^E_[A-Z0-9_]+$/u.test(code)
      ? code
      : "E_PRODUCT_BUNDLE";
  }
}

function failure(code, message, cause) {
  return new ProductWorkflowVerificationError(code, message, { cause });
}

function assertLayoutPath(value, pathAPI) {
  const callerSkill = typeof value === "string" ? pathAPI.basename(value) : "";
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.includes("\0") ||
    value.startsWith("//") ||
    value.startsWith("\\\\") ||
    !pathAPI.isAbsolute(value) ||
    pathAPI.normalize(value) !== value ||
    !PRODUCT_WORKFLOW_SKILL_CHAIN.includes(callerSkill)
  ) {
    throw failure(
      "E_PRODUCT_BUNDLE_LAYOUT",
      "product workflow bundle is unavailable",
    );
  }
  return callerSkill;
}

export function layoutPaths(fromSkillDir, pathAPI = path) {
  const callerName = assertLayoutPath(fromSkillDir, pathAPI);
  const skillsRoot = pathAPI.dirname(fromSkillDir);
  const callerIndex = PRODUCT_WORKFLOW_SKILL_CHAIN.indexOf(callerName);
  const requiredNames = PRODUCT_WORKFLOW_SKILL_CHAIN.slice(0, callerIndex + 1);
  const dependencyNames = requiredNames.slice(0, -1);
  const dependencySkill = dependencyNames.at(-1) === undefined
    ? null
    : pathAPI.join(skillsRoot, dependencyNames.at(-1));
  const skillAssets = requiredNames.map(name => ({
    name,
    directory: pathAPI.join(skillsRoot, name),
    document: pathAPI.join(skillsRoot, name, "SKILL.md"),
    marker: pathAPI.join(skillsRoot, name, ...MARKER_PARTS),
    protocol: pathAPI.join(skillsRoot, name, ...PROTOCOL_PARTS),
    references: (PRODUCT_WORKFLOW_SKILL_REFERENCES[name] ?? []).map(relativePath => ({
      relativePath,
      path: pathAPI.join(skillsRoot, name, ...relativePath.split("/")),
    })),
  }));
  return {
    callerSkill: fromSkillDir,
    dependencySkill,
    dependencySkills: dependencyNames.map(name => pathAPI.join(skillsRoot, name)),
    skillAssets,
    callerMarker: pathAPI.join(fromSkillDir, ...MARKER_PARTS),
    dependencyMarker: dependencySkill === null
      ? null
      : pathAPI.join(dependencySkill, ...MARKER_PARTS),
    callerProtocol: pathAPI.join(fromSkillDir, ...PROTOCOL_PARTS),
    dependencyProtocol: dependencySkill === null
      ? null
      : pathAPI.join(dependencySkill, ...PROTOCOL_PARTS),
    dependencyProfiles: PRODUCT_WORKFLOW_PROFILE_PATHS.map(relativePath => ({
      relativePath,
      path: pathAPI.join(
        skillsRoot,
        "idea-refine",
        ...relativePath.split("/"),
      ),
    })),
  };
}

async function realDirectory(directory) {
  try {
    const resolved = await fs.realpath(directory);
    const information = await fs.stat(resolved);
    if (!information.isDirectory()) {
      throw failure(
        "E_PRODUCT_BUNDLE_LAYOUT",
        "product workflow bundle is unavailable",
      );
    }
    return resolved;
  } catch (error) {
    if (error instanceof ProductWorkflowVerificationError) throw error;
    throw failure(
      "E_PRODUCT_BUNDLE_LAYOUT",
      "product workflow bundle is unavailable",
      error,
    );
  }
}

async function regularFile(filePath) {
  try {
    const information = await fs.lstat(filePath);
    if (information.isSymbolicLink() || !information.isFile()) {
      throw failure(
        "E_PRODUCT_BUNDLE_LAYOUT",
        "product workflow bundle is unavailable",
      );
    }
    return await fs.readFile(filePath);
  } catch (error) {
    if (error instanceof ProductWorkflowVerificationError) throw error;
    throw failure(
      "E_PRODUCT_BUNDLE_LAYOUT",
      "product workflow bundle is unavailable",
      error,
    );
  }
}

function markerDigest(marker) {
  const text = marker.toString("ascii");
  if (!DIGEST_PATTERN.test(text)) {
    throw failure(
      "E_PRODUCT_BUNDLE_MARKER",
      "product workflow bundle marker is invalid",
    );
  }
  return text.slice(0, 64);
}

export function productWorkflowDigest(protocol, profiles, skillDocuments) {
  const hash = crypto.createHash("sha256");
  const entries = [
    ["shared/references/product-workflow.md", protocol],
    ...profiles.map(profile => [profile.relativePath, profile.bytes]),
    ...skillDocuments.map(document => [
      `skills/${document.name}/SKILL.md`,
      document.bytes,
    ]),
    ...skillDocuments.flatMap(document => (document.references ?? []).map(reference => [
      `skills/${document.name}/${reference.relativePath}`, reference.bytes,
    ])),
  ];
  for (const [relativePath, bytes] of entries) {
    hash.update(relativePath, "utf8");
    hash.update("\0", "utf8");
    hash.update(bytes);
    hash.update("\0", "utf8");
  }
  return hash.digest("hex");
}

export async function verifyProductWorkflowBundle(fromSkillDir) {
  const callerName = assertLayoutPath(fromSkillDir, path);
  const callerSkill = await realDirectory(fromSkillDir);
  const locations = layoutPaths(callerSkill);
  const directories = await Promise.all(
    locations.skillAssets.map(asset => realDirectory(asset.directory)),
  );
  if (
    directories.some((directory, index) =>
      path.basename(directory) !== locations.skillAssets[index].name)
  ) {
    throw failure(
      "E_PRODUCT_BUNDLE_LAYOUT",
      "product workflow bundle is unavailable",
    );
  }
  const assets = await Promise.all(
    locations.skillAssets.map(async asset => ({
      name: asset.name,
      document: await regularFile(asset.document),
      marker: await regularFile(asset.marker),
      protocol: await regularFile(asset.protocol),
      references: await Promise.all(asset.references.map(async reference => ({
        relativePath: reference.relativePath,
        bytes: await regularFile(reference.path),
      }))),
    })),
  );
  const profiles = await Promise.all(
    locations.dependencyProfiles.map(async profile => ({
      relativePath: profile.relativePath,
      bytes: await regularFile(profile.path),
    })),
  );
  const callerAssets = assets.find(asset => asset.name === callerName);
  if (callerAssets === undefined) {
    throw failure(
      "E_PRODUCT_BUNDLE_LAYOUT",
      "product workflow bundle is unavailable",
    );
  }
  const expected = markerDigest(callerAssets.marker);
  if (assets.some((asset, index) => {
    const skillDocuments = assets.slice(0, index + 1).map(current => ({
      name: current.name,
      bytes: current.document,
      references: current.references,
    }));
    return markerDigest(asset.marker) !== productWorkflowDigest(
      asset.protocol,
      profiles,
      skillDocuments,
    );
  })) {
    throw failure(
      "E_PRODUCT_BUNDLE_MISMATCH",
      "product workflow bundle does not match the installed dependency",
    );
  }
  const dependencySkills = PRODUCT_WORKFLOW_SKILL_CHAIN.slice(
    0,
    PRODUCT_WORKFLOW_SKILL_CHAIN.indexOf(callerName),
  );
  return {
    callerSkill: callerName,
    dependencySkill: dependencySkills.at(-1) ?? null,
    dependencySkills,
    digest: expected,
  };
}

function diagnostic(error) {
  if (error instanceof ProductWorkflowVerificationError) {
    return `${error.code}: ${error.message}`;
  }
  return "E_INTERNAL: product workflow verification failed";
}

export async function main(argv, io = {}) {
  const stderr = io.stderr ?? process.stderr;
  if (!Array.isArray(argv) || argv.length !== 1) {
    stderr.write("E_USAGE: verify-product-workflow.mjs <skill-directory>\n");
    return 2;
  }
  try {
    await verifyProductWorkflowBundle(argv[0]);
    return 0;
  } catch (error) {
    stderr.write(`${diagnostic(error)}\n`);
    return error instanceof ProductWorkflowVerificationError ? 1 : 2;
  }
}

async function invokedAsMain() {
  if (process.argv[1] === undefined) return false;
  return (
    (await fs.realpath(process.argv[1])) ===
    (await fs.realpath(fileURLToPath(import.meta.url)))
  );
}

if (await invokedAsMain()) {
  process.exitCode = await main(process.argv.slice(2));
}
