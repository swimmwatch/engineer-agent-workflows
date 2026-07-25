import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  validateCatalog,
  validateReleaseMetadata,
} from "./catalog.mjs";
import { isValidationError, ValidationError } from "./errors.mjs";
import { validateRelativePath, walkFiles } from "./files.mjs";
import {
  PLUGIN_NAME,
  renderClaudeMarketplace,
  renderClaudePluginManifest,
  renderCodexMarketplace,
  renderCodexPluginManifest,
  renderCodexSkillMetadata,
  renderPluginCatalog,
} from "./manifests.mjs";
import {
  renderRequiredFrontmatter,
  validateSkillDocument,
} from "./skill-document.mjs";

export const CODEX_MARKETPLACE_PATH = ".agents/plugins/marketplace.json";
export const CLAUDE_MARKETPLACE_PATH = ".claude-plugin/marketplace.json";
export const PLUGIN_ROOT = `plugins/${PLUGIN_NAME}`;

const MANUAL_PATH =
  "planning-and-task-breakdown/references/engineering-principles.md";
const MANUAL_MARKER = "engineering-manual.sha256";
const MANUAL_SKILLS = Object.freeze([
  "planning-and-task-breakdown",
  "incremental-implementation",
  "spec-driven-development",
]);

function absolutePath(root, relativePath) {
  validateRelativePath(relativePath);
  return path.join(path.resolve(root), ...relativePath.split("/"));
}

async function lstatOptional(filePath, relativePath) {
  try {
    return await fs.lstat(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return undefined;
    }
    throw new ValidationError("E_IO", "filesystem entry is unavailable", {
      relativePath,
      cause: error,
    });
  }
}

async function readRegularFile(root, relativePath) {
  const filePath = absolutePath(root, relativePath);
  const stat = await lstatOptional(filePath, relativePath);
  if (stat === undefined) {
    throw new ValidationError("E_IO", "required file is unavailable", {
      relativePath,
    });
  }
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new ValidationError("E_UNSAFE_PATH", "file must be regular", {
      relativePath,
    });
  }
  try {
    return await fs.readFile(filePath);
  } catch (error) {
    throw new ValidationError("E_IO", "file cannot be read", {
      relativePath,
      cause: error,
    });
  }
}

async function requireRealDirectory(root, relativePath) {
  const directoryPath = absolutePath(root, relativePath);
  const stat = await lstatOptional(directoryPath, relativePath);
  if (stat === undefined || stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new ValidationError(
      "E_UNSAFE_PATH",
      "directory must exist without symbolic links",
      { relativePath },
    );
  }
  return directoryPath;
}

function copyMap(input) {
  const output = new Map();
  for (const [relativePath, bytes] of input) {
    output.set(relativePath, Buffer.from(bytes));
  }
  return output;
}

export async function collectReleaseSource(root, catalogValue, releaseValue) {
  const catalog = validateCatalog(catalogValue);
  const release = validateReleaseMetadata(releaseValue);
  const skills = [];

  for (const entry of catalog.skills) {
    const relativeDirectory = `skills/${entry.name}`;
    const skillDirectory = await requireRealDirectory(root, relativeDirectory);
    const files = await walkFiles(skillDirectory);
    if (!files.includes("SKILL.md")) {
      throw new ValidationError("E_INVALID_SKILL", "skill is missing SKILL.md", {
        relativePath: `${relativeDirectory}/SKILL.md`,
      });
    }
    const documentPath = `${relativeDirectory}/SKILL.md`;
    const document = await readRegularFile(root, documentPath);
    let validated;
    try {
      validated = validateSkillDocument(entry, document);
    } catch (error) {
      if (isValidationError(error)) {
        throw new ValidationError(error.code, error.rule, {
          relativePath: documentPath,
          cause: error,
        });
      }
      throw error;
    }
    const canonicalDocument = Buffer.from(
      `${renderRequiredFrontmatter(entry)}${validated.body}`,
      "utf8",
    );
    validateSkillDocument(entry, canonicalDocument);

    const assets = new Map();
    for (const relativeAsset of files) {
      if (relativeAsset === "SKILL.md") {
        continue;
      }
      if (relativeAsset === "agents/openai.yaml") {
        continue;
      }
      if (relativeAsset.startsWith("agents/")) {
        throw new ValidationError(
          "E_INVALID_SKILL",
          "skill contains unexpected generated host metadata",
          { relativePath: `${relativeDirectory}/${relativeAsset}` },
        );
      }
      assets.set(
        relativeAsset,
        await readRegularFile(root, `${relativeDirectory}/${relativeAsset}`),
      );
    }
    skills.push({
      entry: structuredClone(entry),
      document: canonicalDocument,
      assets,
    });
  }

  const planning = skills.find(
    ({ entry }) => entry.name === "planning-and-task-breakdown",
  );
  const manual = planning?.assets.get(
    "references/engineering-principles.md",
  );
  if (manual === undefined || manual.length === 0 || manual.at(-1) !== 0x0a) {
    throw new ValidationError(
      "E_INVALID_MANIFEST",
      "engineering manual is unavailable or invalid",
      { relativePath: `skills/${MANUAL_PATH}` },
    );
  }
  const manualDigest = crypto.createHash("sha256").update(manual).digest("hex");
  for (const name of MANUAL_SKILLS) {
    const skill = skills.find(({ entry }) => entry.name === name);
    const marker = skill?.assets.get(MANUAL_MARKER);
    if (
      marker === undefined ||
      !marker.equals(Buffer.from(`${manualDigest}\n`, "ascii"))
    ) {
      throw new ValidationError(
        "E_INVALID_MANIFEST",
        "engineering manual marker does not match the bundle",
        { relativePath: `skills/${name}/${MANUAL_MARKER}` },
      );
    }
  }

  return {
    catalog: structuredClone(catalog),
    release: structuredClone(release),
    skills: skills.map((skill) => ({
      entry: structuredClone(skill.entry),
      document: Buffer.from(skill.document),
      assets: copyMap(skill.assets),
    })),
    manualDigest,
  };
}

export function buildGeneratedFiles(source) {
  if (
    source === null ||
    typeof source !== "object" ||
    !Array.isArray(source.skills) ||
    source.skills.length !== source.catalog?.skills?.length
  ) {
    throw new ValidationError(
      "E_INVALID_MANIFEST",
      "release source is invalid",
    );
  }
  const catalog = validateCatalog(source.catalog);
  const release = validateReleaseMetadata(source.release);
  const files = new Map();
  for (const [index, skill] of source.skills.entries()) {
    const entry = catalog.skills[index];
    if (
      skill === null ||
      typeof skill !== "object" ||
      JSON.stringify(skill.entry) !== JSON.stringify(entry) ||
      !(skill.document instanceof Uint8Array) ||
      !(skill.assets instanceof Map)
    ) {
      throw new ValidationError(
        "E_INVALID_MANIFEST",
        "release skill source does not match the catalog",
      );
    }
    validateSkillDocument(entry, skill.document);
    for (const [relativeAsset, bytes] of skill.assets) {
      validateRelativePath(relativeAsset);
      if (
        relativeAsset === "SKILL.md" ||
        relativeAsset.startsWith("agents/") ||
        !(bytes instanceof Uint8Array)
      ) {
        throw new ValidationError(
          "E_INVALID_MANIFEST",
          "release skill asset path is reserved",
        );
      }
    }
    const name = entry.name;
    const rootDirectory = `skills/${name}`;
    const pluginDirectory = `${PLUGIN_ROOT}/skills/${name}`;
    const sidecar = Buffer.from(
      renderCodexSkillMetadata(entry),
      "utf8",
    );
    files.set(`${rootDirectory}/SKILL.md`, Buffer.from(skill.document));
    files.set(`${rootDirectory}/agents/openai.yaml`, sidecar);
    files.set(`${pluginDirectory}/SKILL.md`, Buffer.from(skill.document));
    files.set(
      `${pluginDirectory}/agents/openai.yaml`,
      Buffer.from(sidecar),
    );
    for (const [relativeAsset, bytes] of skill.assets) {
      files.set(`${pluginDirectory}/${relativeAsset}`, Buffer.from(bytes));
    }
  }

  files.set(
    `${PLUGIN_ROOT}/.codex-plugin/plugin.json`,
    Buffer.from(renderCodexPluginManifest(release), "utf8"),
  );
  files.set(
    `${PLUGIN_ROOT}/.claude-plugin/plugin.json`,
    Buffer.from(renderClaudePluginManifest(release), "utf8"),
  );
  files.set(
    `${PLUGIN_ROOT}/catalog.json`,
    Buffer.from(
      renderPluginCatalog(
        catalog,
        release,
        source.manualDigest,
      ),
      "utf8",
    ),
  );
  files.set(
    CODEX_MARKETPLACE_PATH,
    Buffer.from(renderCodexMarketplace(release), "utf8"),
  );
  files.set(
    CLAUDE_MARKETPLACE_PATH,
    Buffer.from(renderClaudeMarketplace(release), "utf8"),
  );
  return copyMap(files);
}

async function walkOptional(root, relativePath) {
  const directoryPath = absolutePath(root, relativePath);
  const stat = await lstatOptional(directoryPath, relativePath);
  if (stat === undefined) {
    return [];
  }
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new ValidationError(
      "E_UNSAFE_PATH",
      "generated root must be a real directory",
      { relativePath },
    );
  }
  return (await walkFiles(directoryPath)).map(
    (file) => `${relativePath}/${file}`,
  );
}

async function collectManagedActualPaths(root, catalog) {
  const paths = [];
  for (const skill of catalog.skills) {
    const document = `skills/${skill.name}/SKILL.md`;
    if (
      (await lstatOptional(absolutePath(root, document), document)) !==
      undefined
    ) {
      paths.push(document);
    }
    paths.push(...(await walkOptional(root, `skills/${skill.name}/agents`)));
  }
  paths.push(...(await walkOptional(root, "plugins")));
  paths.push(...(await walkOptional(root, ".agents/plugins")));
  paths.push(...(await walkOptional(root, ".claude-plugin")));
  return paths.sort((left, right) => left.localeCompare(right, "en"));
}

export async function hasGeneratedArtifacts(root, catalogValue) {
  const catalog = validateCatalog(catalogValue);
  for (const skill of catalog.skills) {
    const sidecar = `skills/${skill.name}/agents`;
    if (
      (await lstatOptional(absolutePath(root, sidecar), sidecar)) !== undefined
    ) {
      return true;
    }
  }
  for (const relativePath of [
    "plugins",
    ".agents/plugins",
    ".claude-plugin",
  ]) {
    if (
      (await lstatOptional(
        absolutePath(root, relativePath),
        relativePath,
      )) !== undefined
    ) {
      return true;
    }
  }
  return false;
}

export async function compareGeneratedOutputs(
  root,
  catalogValue,
  expectedValue,
) {
  const catalog = validateCatalog(catalogValue);
  const expected = copyMap(expectedValue);
  const expectedPaths = [...expected.keys()].sort((left, right) =>
    left.localeCompare(right, "en"),
  );
  for (const relativePath of expectedPaths) {
    const filePath = absolutePath(root, relativePath);
    const stat = await lstatOptional(filePath, relativePath);
    if (stat === undefined || stat.isSymbolicLink() || !stat.isFile()) {
      throw new ValidationError(
        "E_GENERATED_DIFF",
        "generated distribution is missing or unsafe",
        { relativePath },
      );
    }
    let actual;
    try {
      actual = await fs.readFile(filePath);
    } catch (error) {
      throw new ValidationError(
        "E_IO",
        "generated file cannot be read",
        { relativePath, cause: error },
      );
    }
    if (!actual.equals(expected.get(relativePath))) {
      throw new ValidationError(
        "E_GENERATED_DIFF",
        "generated distribution differs from canonical output",
        { relativePath },
      );
    }
  }
  const actualPaths = await collectManagedActualPaths(root, catalog);
  if (
    actualPaths.length !== expectedPaths.length ||
    actualPaths.some((value, index) => value !== expectedPaths[index])
  ) {
    throw new ValidationError(
      "E_GENERATED_DIFF",
      "generated distribution contains an unexpected path",
    );
  }
  return {
    fileCount: expectedPaths.length,
    sidecarCount: catalog.skills.length,
    pluginSkillCount: catalog.skills.length,
  };
}

async function writeExpectedFiles(stagingRoot, expected) {
  for (const [relativePath, bytes] of [...expected.entries()].sort(
    ([left], [right]) => left.localeCompare(right, "en"),
  )) {
    const filePath = absolutePath(stagingRoot, relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, bytes, { mode: 0o644 });
  }
}

function managedTargets(catalog) {
  return [
    ...catalog.skills.flatMap((skill) => [
      `skills/${skill.name}/SKILL.md`,
      `skills/${skill.name}/agents`,
    ]),
    PLUGIN_ROOT,
    ".agents/plugins",
    ".claude-plugin",
  ];
}

async function ensureSafeParents(root, relativePath, createdDirectories) {
  const segments = relativePath.split("/");
  let current = path.resolve(root);
  for (const segment of segments.slice(0, -1)) {
    current = path.join(current, segment);
    const relative = path
      .relative(path.resolve(root), current)
      .split(path.sep)
      .join("/");
    const stat = await lstatOptional(current, relative);
    if (stat === undefined) {
      await fs.mkdir(current);
      createdDirectories.push(current);
      continue;
    }
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new ValidationError(
        "E_UNSAFE_PATH",
        "generated target parent must be a real directory",
        { relativePath: relative },
      );
    }
  }
}

async function preflightTarget(root, stagingRoot, relativePath) {
  const target = absolutePath(root, relativePath);
  const staged = absolutePath(stagingRoot, relativePath);
  const [targetStat, stagedStat] = await Promise.all([
    lstatOptional(target, relativePath),
    lstatOptional(staged, relativePath),
  ]);
  if (
    stagedStat === undefined ||
    stagedStat.isSymbolicLink() ||
    (!stagedStat.isFile() && !stagedStat.isDirectory())
  ) {
    throw new ValidationError(
      "E_INTERNAL",
      "staged generated target is invalid",
      { relativePath },
    );
  }
  if (
    targetStat !== undefined &&
    (targetStat.isSymbolicLink() ||
      targetStat.isFile() !== stagedStat.isFile() ||
      targetStat.isDirectory() !== stagedStat.isDirectory())
  ) {
    throw new ValidationError(
      "E_UNSAFE_PATH",
      "generated target cannot be replaced safely",
      { relativePath },
    );
  }
}

async function removeCreatedDirectories(createdDirectories) {
  for (const directory of [...createdDirectories].reverse()) {
    try {
      await fs.rmdir(directory);
    } catch (error) {
      if (!["ENOENT", "ENOTEMPTY"].includes(error?.code)) {
        throw error;
      }
    }
  }
}

export async function replaceGeneratedOutputs(
  root,
  catalogValue,
  expectedValue,
  options = {},
) {
  const catalog = validateCatalog(catalogValue);
  const expected = copyMap(expectedValue);
  const rootPath = path.resolve(root);
  const rootStat = await lstatOptional(rootPath);
  if (
    rootStat === undefined ||
    rootStat.isSymbolicLink() ||
    !rootStat.isDirectory()
  ) {
    throw new ValidationError(
      "E_UNSAFE_PATH",
      "repository root must be a real directory",
    );
  }
  const temporaryRoot = await fs.mkdtemp(
    path.join(path.dirname(rootPath), `.${path.basename(rootPath)}.generate-`),
  );
  const stagingRoot = path.join(temporaryRoot, "staged");
  const backupRoot = path.join(temporaryRoot, "backup");
  const rename = options.rename ?? fs.rename;
  const operations = [];
  const createdDirectories = [];

  try {
    await writeExpectedFiles(stagingRoot, expected);
    const targets = managedTargets(catalog);
    for (const relativePath of targets) {
      await preflightTarget(rootPath, stagingRoot, relativePath);
    }
    for (const relativePath of targets) {
      await ensureSafeParents(rootPath, relativePath, createdDirectories);
      const target = absolutePath(rootPath, relativePath);
      const staged = absolutePath(stagingRoot, relativePath);
      const backup = absolutePath(backupRoot, relativePath);
      const targetStat = await lstatOptional(target, relativePath);
      const operation = {
        relativePath,
        target,
        backup,
        hadExisting: targetStat !== undefined,
        published: false,
      };
      if (operation.hadExisting) {
        await fs.mkdir(path.dirname(backup), { recursive: true });
        await rename(target, backup);
      }
      operations.push(operation);
      await rename(staged, target);
      operation.published = true;
    }
    await compareGeneratedOutputs(rootPath, catalog, expected);
  } catch (error) {
    let rollbackError;
    for (const operation of [...operations].reverse()) {
      try {
        if (operation.published) {
          await fs.rm(operation.target, { recursive: true, force: true });
        }
        if (operation.hadExisting) {
          await fs.mkdir(path.dirname(operation.target), { recursive: true });
          await rename(operation.backup, operation.target);
        }
      } catch (currentError) {
        rollbackError ??= currentError;
      }
    }
    try {
      await removeCreatedDirectories(createdDirectories);
    } catch (currentError) {
      rollbackError ??= currentError;
    }
    if (rollbackError !== undefined) {
      throw new ValidationError(
        "E_INTERNAL",
        "generated distribution rollback failed",
        { cause: rollbackError },
      );
    }
    if (isValidationError(error)) {
      throw error;
    }
    throw new ValidationError(
      "E_GENERATED_WRITE",
      "generated distribution could not be replaced",
      { cause: error },
    );
  } finally {
    try {
      await fs.rm(temporaryRoot, { recursive: true, force: true });
    } catch {}
  }

  return await compareGeneratedOutputs(rootPath, catalog, expected);
}
