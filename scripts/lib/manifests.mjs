import { TextDecoder } from "node:util";

import {
  validateCatalog,
  validateReleaseMetadata,
  validateSkillEntry,
} from "./catalog.mjs";
import { ValidationError } from "./errors.mjs";

export const PLUGIN_NAME = "engineer-agent-workflows";
export const CODEX_PLUGIN_SOURCE = `./plugins/codex/${PLUGIN_NAME}`;
export const CLAUDE_PLUGIN_SOURCE = `./plugins/claude-code/${PLUGIN_NAME}`;
export const PLUGIN_DISPLAY_NAME = "Engineer Agent Workflows";
export const CODEX_PLUGIN_DESCRIPTION =
  "Reusable, explicit-only engineering workflows for Codex.";
export const CLAUDE_PLUGIN_DESCRIPTION =
  "Reusable, explicit-only engineering workflows for Claude Code.";
export const REPOSITORY_URL =
  "https://github.com/swimmwatch/engineer-agent-workflows";

const MANUAL_DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const DISPLAY_WORDS = Object.freeze({
  adrs: "ADRs",
});

function decodeManifestText(input) {
  if (typeof input === "string") {
    if (input.includes("\0") || input.includes("\r")) {
      throw new ValidationError(
        "E_INVALID_MANIFEST",
        "generated metadata must be LF-terminated text",
      );
    }
    return input;
  }
  if (!(input instanceof Uint8Array)) {
    throw new ValidationError(
      "E_INVALID_MANIFEST",
      "generated metadata must be UTF-8 text",
    );
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(input);
  } catch (error) {
    throw new ValidationError(
      "E_INVALID_MANIFEST",
      "generated metadata must be valid UTF-8",
      { cause: error },
    );
  }
  if (text.includes("\0") || text.includes("\r")) {
    throw new ValidationError(
      "E_INVALID_MANIFEST",
      "generated metadata must be LF-terminated text",
    );
  }
  return text;
}

function clone(value) {
  return structuredClone(value);
}

function approvedRelease(release) {
  return validateReleaseMetadata(release);
}

function approvedCatalog(catalog) {
  return validateCatalog(catalog);
}

function approvedSkill(entry) {
  return validateSkillEntry(entry);
}

function approvedDigest(digest) {
  if (typeof digest !== "string" || !MANUAL_DIGEST_PATTERN.test(digest)) {
    throw new ValidationError(
      "E_INVALID_MANIFEST",
      "engineering manual digest is invalid",
    );
  }
  return digest;
}

export function skillDisplayName(name) {
  if (typeof name !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
    throw new ValidationError(
      "E_INVALID_MANIFEST",
      "skill display name source is invalid",
    );
  }
  return name
    .split("-")
    .map(
      (word) =>
        DISPLAY_WORDS[word] ??
        `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`,
    )
    .join(" ");
}

export function renderCanonicalJSON(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function validateCanonicalJSON(input, expected, relativePath) {
  const text = decodeManifestText(input);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new ValidationError(
      "E_INVALID_MANIFEST",
      "generated JSON metadata is malformed",
      { relativePath, cause: error },
    );
  }
  if (text !== renderCanonicalJSON(expected)) {
    throw new ValidationError(
      "E_INVALID_MANIFEST",
      "generated JSON metadata does not match the release contract",
      { relativePath },
    );
  }
  return clone(parsed);
}

export function buildCodexSkillMetadata(entry) {
  const skill = approvedSkill(entry);
  return {
    displayName: skillDisplayName(skill.name),
    shortDescription: skill.description,
    allowImplicitInvocation: false,
  };
}

export function renderCodexSkillMetadata(entry) {
  const metadata = buildCodexSkillMetadata(entry);
  return [
    "interface:",
    `  display_name: ${JSON.stringify(metadata.displayName)}`,
    `  short_description: ${JSON.stringify(metadata.shortDescription)}`,
    "policy:",
    "  allow_implicit_invocation: false",
    "",
  ].join("\n");
}

export function validateCodexSkillMetadata(entry, input, relativePath) {
  const text = decodeManifestText(input);
  if (text !== renderCodexSkillMetadata(entry)) {
    throw new ValidationError(
      "E_INVALID_MANIFEST",
      "Codex skill metadata does not match the catalog policy",
      { relativePath },
    );
  }
  return buildCodexSkillMetadata(entry);
}

function author(release) {
  return {
    name: release.publisher.name,
    email: release.publisher.email,
    url: release.publisher.url,
  };
}

export function buildCodexPluginManifest(releaseValue) {
  const release = approvedRelease(releaseValue);
  return {
    name: PLUGIN_NAME,
    version: release.version,
    description: CODEX_PLUGIN_DESCRIPTION,
    author: author(release),
    homepage: REPOSITORY_URL,
    repository: REPOSITORY_URL,
    license: release.license,
    skills: "./skills/",
    interface: {
      displayName: PLUGIN_DISPLAY_NAME,
    shortDescription: "Explicit engineering workflows for Codex.",
    longDescription:
      "Reusable workflows for specification, planning, implementation, quality, documentation, discovery, pull requests, and releases. Every workflow requires explicit user invocation.",
      developerName: release.publisher.name,
      category: "Productivity",
      capabilities: [],
      defaultPrompt: [
        "Use an Engineer Agent Workflows skill I explicitly name.",
      ],
    },
  };
}

export function renderCodexPluginManifest(release) {
  return renderCanonicalJSON(buildCodexPluginManifest(release));
}

export function validateCodexPluginManifest(release, input, relativePath) {
  return validateCanonicalJSON(
    input,
    buildCodexPluginManifest(release),
    relativePath,
  );
}

export function buildClaudePluginManifest(releaseValue) {
  const release = approvedRelease(releaseValue);
  return {
    name: PLUGIN_NAME,
    version: release.version,
    description: CLAUDE_PLUGIN_DESCRIPTION,
    author: author(release),
    homepage: REPOSITORY_URL,
    repository: REPOSITORY_URL,
    license: release.license,
  };
}

export function renderClaudePluginManifest(release) {
  return renderCanonicalJSON(buildClaudePluginManifest(release));
}

export function validateClaudePluginManifest(release, input, relativePath) {
  return validateCanonicalJSON(
    input,
    buildClaudePluginManifest(release),
    relativePath,
  );
}

export function buildCodexMarketplace(releaseValue) {
  approvedRelease(releaseValue);
  return {
    name: PLUGIN_NAME,
    interface: {
      displayName: PLUGIN_DISPLAY_NAME,
    },
    plugins: [
      {
        name: PLUGIN_NAME,
        source: {
          source: "local",
          path: CODEX_PLUGIN_SOURCE,
        },
        policy: {
          installation: "AVAILABLE",
          authentication: "ON_INSTALL",
        },
        category: "Productivity",
      },
    ],
  };
}

export function renderCodexMarketplace(release) {
  return renderCanonicalJSON(buildCodexMarketplace(release));
}

export function validateCodexMarketplace(release, input, relativePath) {
  return validateCanonicalJSON(
    input,
    buildCodexMarketplace(release),
    relativePath,
  );
}

export function buildClaudeMarketplace(releaseValue) {
  const release = approvedRelease(releaseValue);
  return {
    name: PLUGIN_NAME,
    owner: author(release),
    metadata: {
      description: CLAUDE_PLUGIN_DESCRIPTION,
      version: release.version,
    },
    plugins: [
      {
        name: PLUGIN_NAME,
        source: CLAUDE_PLUGIN_SOURCE,
        version: release.version,
        description: CLAUDE_PLUGIN_DESCRIPTION,
        author: author(release),
      },
    ],
  };
}

export function renderClaudeMarketplace(release) {
  return renderCanonicalJSON(buildClaudeMarketplace(release));
}

export function validateClaudeMarketplace(release, input, relativePath) {
  return validateCanonicalJSON(
    input,
    buildClaudeMarketplace(release),
    relativePath,
  );
}

export function buildPluginCatalog(catalogValue, releaseValue, digestValue) {
  const catalog = approvedCatalog(catalogValue);
  const release = approvedRelease(releaseValue);
  const digest = approvedDigest(digestValue);
  return {
    schemaVersion: 1,
    name: PLUGIN_NAME,
    repository: release.repository,
    version: release.version,
    releaseReady: release.releaseReady,
    license: release.license,
    engineeringManualSha256: digest,
    skills: catalog.skills.map((skill) => ({
      name: skill.name,
      description: skill.description,
      classification: skill.classification,
      dependencies: [...skill.dependencies],
    })),
  };
}

export function renderPluginCatalog(catalog, release, digest) {
  return renderCanonicalJSON(buildPluginCatalog(catalog, release, digest));
}

export function validatePluginCatalog(
  catalog,
  release,
  digest,
  input,
  relativePath,
) {
  return validateCanonicalJSON(
    input,
    buildPluginCatalog(catalog, release, digest),
    relativePath,
  );
}
