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
  CLAUDE_PLUGIN_SOURCE,
  CODEX_PLUGIN_SOURCE,
  PLUGIN_NAME,
  renderClaudeMarketplace,
  renderClaudePluginManifest,
  renderCodexMarketplace,
  renderCodexPluginManifest,
  renderCodexSkillMetadata,
  renderPluginCatalog,
} from "./manifests.mjs";
import {
  decodeUTF8,
  renderRequiredFrontmatter,
  splitSkillDocument,
  validateSkillDocument,
} from "./skill-document.mjs";
import {
  PRODUCT_WORKFLOW_PROFILE_PATHS,
  PRODUCT_WORKFLOW_SKILL_CHAIN,
  PRODUCT_WORKFLOW_SKILL_REFERENCES,
  productWorkflowDigest,
} from "../../shared/scripts/verify-product-workflow.mjs";

export const CODEX_MARKETPLACE_PATH = ".agents/plugins/marketplace.json";
export const CLAUDE_MARKETPLACE_PATH = ".claude-plugin/marketplace.json";
export const CODEX_PLUGIN_ROOT = CODEX_PLUGIN_SOURCE.slice(2);
export const CLAUDE_PLUGIN_ROOT = CLAUDE_PLUGIN_SOURCE.slice(2);
export const PLUGIN_ROOT = CODEX_PLUGIN_ROOT;
export const SHARED_ROOT = "shared";

const HOST_TEMPLATE_PATTERN = /\{\{HOST_[A-Z0-9_]+\}\}/g;
const HOST_TEMPLATE_VALUES = Object.freeze({
  codex: Object.freeze({
    "{{HOST_DISPLAY_NAME}}": "Codex",
    "{{HOST_PROJECT_INSTRUCTIONS}}": "AGENTS.md",
    "{{HOST_QUESTION_TOOL}}": "request_user_input",
    "{{HOST_AUTHOR_MODEL}}": "Sol; Astra for difficult or disputed cases",
    "{{HOST_IMPLEMENTATION_MODEL}}": "Terra",
    "{{HOST_REVIEW_MODEL}}": "Sol; Astra for difficult or disputed cases",
    "{{HOST_SCOUT_MODEL}}": "gpt-6-luna",
  }),
  "claude-code": Object.freeze({
    "{{HOST_DISPLAY_NAME}}": "Claude Code",
    "{{HOST_PROJECT_INSTRUCTIONS}}": "CLAUDE.md",
    "{{HOST_QUESTION_TOOL}}": "AskUserQuestion",
    "{{HOST_AUTHOR_MODEL}}": "Opus",
    "{{HOST_IMPLEMENTATION_MODEL}}": "Sonnet",
    "{{HOST_REVIEW_MODEL}}": "Opus",
    "{{HOST_SCOUT_MODEL}}": "haiku",
  }),
});

const MANUAL_REFERENCE = "references/engineering-principles.md";
const TEST_DISCIPLINE_REFERENCE = "references/test-discipline.md";
const PRODUCT_WORKFLOW_REFERENCE = "references/product-workflow.md";
const PRODUCT_WORKFLOW_MARKER = "product-workflow.sha256";
const PRODUCT_PROTOCOL_MARKER = "product-protocol.sha256";
const PRODUCT_WORKFLOW_VERIFIER = "scripts/verify-product-workflow.mjs";
const MANUAL_VERIFIER = "scripts/verify-engineering-manual.mjs";
const MANUAL_MARKER = "engineering-manual.sha256";
const TEST_DISCIPLINE_MARKER = "test-discipline.sha256";
const WORKFLOW_CONTEXT_REFERENCES = Object.freeze([
  "references/workflow-state-access.md",
  "references/implementation-context.md",
]);
const WORKFLOW_CONTEXT_MARKER = "workflow-context.sha256";
const CONTRACT_ASSETS = Object.freeze([
  "references/yaml-contracts.md",
  "schemas/catalog.schema.json",
  "schemas/decisions.schema.json",
  "schemas/experience.schema.json",
  "schemas/manifest.schema.json",
]);
const MCP_ONLY_ASSETS = Object.freeze([
  "schemas/product.schema.json",
]);
const MANUAL_SKILLS = Object.freeze([
  "design-planning",
  "planning-and-task-breakdown",
  "incremental-implementation",
  "spec-driven-development",
]);
const MANUAL_SKILL_ASSETS = Object.freeze([
  `${SHARED_ROOT}/${MANUAL_MARKER}`,
  `${SHARED_ROOT}/${MANUAL_REFERENCE}`,
  `${SHARED_ROOT}/${TEST_DISCIPLINE_MARKER}`,
  `${SHARED_ROOT}/${TEST_DISCIPLINE_REFERENCE}`,
  `${SHARED_ROOT}/${MANUAL_VERIFIER}`,
  `${SHARED_ROOT}/${WORKFLOW_CONTEXT_MARKER}`,
  ...WORKFLOW_CONTEXT_REFERENCES.map(asset => `${SHARED_ROOT}/${asset}`),
  ...CONTRACT_ASSETS.map(asset => `${SHARED_ROOT}/${asset}`),
]);
const PRODUCT_WORKFLOW_SKILL_ASSETS = Object.freeze([
  `${SHARED_ROOT}/${PRODUCT_WORKFLOW_MARKER}`,
  `${SHARED_ROOT}/${PRODUCT_WORKFLOW_REFERENCE}`,
  `${SHARED_ROOT}/${PRODUCT_WORKFLOW_VERIFIER}`,
  ...WORKFLOW_CONTEXT_REFERENCES.map(asset => `${SHARED_ROOT}/${asset}`),
]);
const PRODUCT_TASK_SKILLS = Object.freeze([
  "spec-driven-development",
  "planning-and-task-breakdown",
  "incremental-implementation",
]);
const PRODUCT_TASK_SKILL_ASSETS = Object.freeze([
  `${SHARED_ROOT}/${PRODUCT_PROTOCOL_MARKER}`,
  `${SHARED_ROOT}/${PRODUCT_WORKFLOW_REFERENCE}`,
]);

function sharedAssetsForSkill(name) {
  return [
    ...(MANUAL_SKILLS.includes(name) ? MANUAL_SKILL_ASSETS : []),
    ...(PRODUCT_WORKFLOW_SKILL_CHAIN.includes(name)
      ? PRODUCT_WORKFLOW_SKILL_ASSETS
      : []),
    ...(PRODUCT_TASK_SKILLS.includes(name) ? PRODUCT_TASK_SKILL_ASSETS : []),
  ];
}

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

export function renderHostTemplate(input, host, relativePath) {
  const values = HOST_TEMPLATE_VALUES[host];
  if (values === undefined) {
    throw new ValidationError(
      "E_INVALID_MANIFEST",
      "host template target is unsupported",
      { relativePath },
    );
  }
  const bytes = Buffer.from(input);
  if (!bytes.includes(Buffer.from("{{HOST_", "ascii"))) {
    return bytes;
  }
  const text = decodeUTF8(bytes);
  const tokens = text.match(HOST_TEMPLATE_PATTERN) ?? [];
  for (const token of tokens) {
    if (!Object.hasOwn(values, token)) {
      throw new ValidationError(
        "E_INVALID_SKILL",
        "skill contains an unknown host template variable",
        { relativePath },
      );
    }
  }
  let rendered = text;
  for (const [token, value] of Object.entries(values)) {
    rendered = rendered.replaceAll(token, value);
  }
  if (rendered.includes("{{HOST_")) {
    throw new ValidationError(
      "E_INVALID_SKILL",
      "skill contains an unresolved host template variable",
      { relativePath },
    );
  }
  return Buffer.from(rendered, "utf8");
}

function renderCodexSkillDocument(entry, input, relativePath) {
  const { body } = splitSkillDocument(input);
  const document = [
    "---",
    `name: ${entry.name}`,
    `description: ${JSON.stringify(entry.description)}`,
    "---",
    body,
  ].join("\n");
  return renderHostTemplate(
    Buffer.from(document, "utf8"),
    "codex",
    relativePath,
  );
}

export async function collectReleaseSource(root, catalogValue, releaseValue) {
  const catalog = validateCatalog(catalogValue);
  const release = validateReleaseMetadata(releaseValue);
  const sharedDirectory = await requireRealDirectory(root, SHARED_ROOT);
  const sharedFiles = await walkFiles(sharedDirectory);
  if (
    JSON.stringify(sharedFiles) !==
JSON.stringify([
        MANUAL_REFERENCE,
        TEST_DISCIPLINE_REFERENCE,
        PRODUCT_WORKFLOW_REFERENCE,
        PRODUCT_WORKFLOW_VERIFIER,
        MANUAL_VERIFIER,
      ...CONTRACT_ASSETS,
      ...MCP_ONLY_ASSETS,
    ...WORKFLOW_CONTEXT_REFERENCES,
    ].sort((left, right) => left.localeCompare(right, "en")))
  ) {
    throw new ValidationError(
      "E_INVALID_MANIFEST",
      "shared engineering resources contain an unexpected path",
      { relativePath: SHARED_ROOT },
    );
  }
  const [manual, testDiscipline, verifier] = await Promise.all([
    readRegularFile(root, `${SHARED_ROOT}/${MANUAL_REFERENCE}`),
    readRegularFile(root, `${SHARED_ROOT}/${TEST_DISCIPLINE_REFERENCE}`),
    readRegularFile(root, `${SHARED_ROOT}/${MANUAL_VERIFIER}`),
  ]);
  if (
    manual.length === 0 ||
    manual.at(-1) !== 0x0a ||
    testDiscipline.length === 0 ||
    testDiscipline.at(-1) !== 0x0a ||
    verifier.length === 0 ||
    verifier.at(-1) !== 0x0a
  ) {
    throw new ValidationError(
      "E_INVALID_MANIFEST",
      "shared engineering resources are unavailable or invalid",
      { relativePath: SHARED_ROOT },
    );
  }
  const manualDigest = crypto.createHash("sha256").update(manual).digest("hex");
  const testDisciplineDigest = crypto
    .createHash("sha256")
    .update(testDiscipline)
    .digest("hex");
  const sharedManual = new Map([
    [MANUAL_MARKER, Buffer.from(`${manualDigest}\n`, "ascii")],
    [MANUAL_REFERENCE, Buffer.from(manual)],
    [
      TEST_DISCIPLINE_MARKER,
      Buffer.from(`${testDisciplineDigest}\n`, "ascii"),
    ],
    [TEST_DISCIPLINE_REFERENCE, Buffer.from(testDiscipline)],
    [MANUAL_VERIFIER, Buffer.from(verifier)],
  ]);
  for (const asset of WORKFLOW_CONTEXT_REFERENCES) {
    const bytes = await readRegularFile(root, `${SHARED_ROOT}/${asset}`);
    if (bytes.length === 0 || bytes.at(-1) !== 0x0a) {
      throw new ValidationError("E_INVALID_MANIFEST", "workflow context is unavailable or invalid", { relativePath: asset });
    }
    sharedManual.set(asset, bytes);
  }
  sharedManual.set(WORKFLOW_CONTEXT_MARKER, workflowContextMarker(sharedManual));
  for (const asset of CONTRACT_ASSETS) {
    sharedManual.set(asset, await readRegularFile(root, `${SHARED_ROOT}/${asset}`));
  }
  for (const asset of [
    PRODUCT_WORKFLOW_REFERENCE,
    PRODUCT_WORKFLOW_VERIFIER,
  ]) {
    sharedManual.set(
      asset,
      await readRegularFile(root, `${SHARED_ROOT}/${asset}`),
    );
  }
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
      if (relativeAsset.startsWith(`${SHARED_ROOT}/`)) {
        if (!sharedAssetsForSkill(entry.name).includes(relativeAsset)) {
          throw new ValidationError(
            "E_INVALID_SKILL",
            "skill contains an unexpected generated shared resource",
            { relativePath: `${relativeDirectory}/${relativeAsset}` },
          );
        }
        continue;
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

  return {
    catalog: structuredClone(catalog),
    release: structuredClone(release),
    skills: skills.map((skill) => ({
      entry: structuredClone(skill.entry),
      document: Buffer.from(skill.document),
      assets: copyMap(skill.assets),
    })),
    sharedManual: copyMap(sharedManual),
    manualDigest,
    testDisciplineDigest,
  };
}

function productWorkflowMarker(source, catalog, sharedManual, callerName, host) {
  const callerIndex = PRODUCT_WORKFLOW_SKILL_CHAIN.indexOf(callerName);
  const protocol = sharedManual.get(PRODUCT_WORKFLOW_REFERENCE);
  const skillByName = name => {
    const index = catalog.skills.findIndex(entry => entry.name === name);
    return index < 0 ? undefined : source.skills[index];
  };
  const idea = skillByName("idea-refine");
  if (callerIndex < 0 || protocol === undefined || idea === undefined) {
    throw new ValidationError(
      "E_INVALID_MANIFEST",
      "product workflow bundle source is incomplete",
    );
  }
  const render = (bytes, relativePath) => {
    if (host === null) return Buffer.from(bytes);
    return renderHostTemplate(bytes, host, relativePath);
  };
  const profiles = PRODUCT_WORKFLOW_PROFILE_PATHS.map(relativePath => {
    const bytes = idea.assets.get(relativePath);
    if (bytes === undefined) {
      throw new ValidationError(
        "E_INVALID_MANIFEST",
        "product workflow profile is unavailable",
        { relativePath: `skills/idea-refine/${relativePath}` },
      );
    }
    return {
      relativePath,
      bytes: render(bytes, `skills/idea-refine/${relativePath}`),
    };
  });
  const skillDocuments = PRODUCT_WORKFLOW_SKILL_CHAIN
    .slice(0, callerIndex + 1)
    .map(name => {
      const skill = skillByName(name);
      const entry = catalog.skills.find(current => current.name === name);
      if (skill === undefined || entry === undefined) {
        throw new ValidationError(
          "E_INVALID_MANIFEST",
          "product workflow dependency is unavailable",
          { relativePath: `skills/${name}` },
        );
      }
      const relativePath = `skills/${name}/SKILL.md`;
      const bytes = host === "codex"
        ? renderCodexSkillDocument(entry, skill.document, relativePath)
        : render(skill.document, relativePath);
      const references = (PRODUCT_WORKFLOW_SKILL_REFERENCES[name] ?? []).map(referencePath => {
        const source = referencePath.startsWith("shared/")
          ? sharedManual.get(referencePath.slice("shared/".length))
          : skill.assets.get(referencePath);
        if (source === undefined) throw new ValidationError(
          "E_INVALID_MANIFEST", "product workflow reference is unavailable",
          { relativePath: `skills/${name}/${referencePath}` },
        );
        return { relativePath: referencePath, bytes: render(source, `skills/${name}/${referencePath}`) };
      });
      return { name, bytes, references };
    });
  const digest = productWorkflowDigest(protocol, profiles, skillDocuments);
  return Buffer.from(`${digest}\n`, "ascii");
}

function workflowContextMarker(sharedManual) {
  const hash = crypto.createHash("sha256");
  for (const relativePath of WORKFLOW_CONTEXT_REFERENCES) {
    hash.update(relativePath).update("\0").update(sharedManual.get(relativePath)).update("\0");
  }
  return Buffer.from(`${hash.digest("hex")}\n`, "ascii");
}

function productProtocolMarker(sharedManual, host, relativePath) {
  const protocol = sharedManual.get(PRODUCT_WORKFLOW_REFERENCE);
  if (protocol === undefined) {
    throw new ValidationError(
      "E_INVALID_MANIFEST",
      "product protocol source unavailable",
      { relativePath },
    );
  }
  const rendered = host === null
    ? Buffer.from(protocol)
    : renderHostTemplate(protocol, host, relativePath);
  const digest = crypto.createHash("sha256").update(rendered).digest("hex");
  return Buffer.from(`${digest}\n`, "ascii");
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
  if (
    !(source.sharedManual instanceof Map) ||
    source.sharedManual.size !== 8 + CONTRACT_ASSETS.length + WORKFLOW_CONTEXT_REFERENCES.length ||
    [...source.sharedManual].some(
      ([relativePath, bytes]) =>
        ![
          MANUAL_MARKER,
          MANUAL_REFERENCE,
          TEST_DISCIPLINE_MARKER,
          TEST_DISCIPLINE_REFERENCE,
        MANUAL_VERIFIER,
          PRODUCT_WORKFLOW_REFERENCE,
          PRODUCT_WORKFLOW_VERIFIER,
          WORKFLOW_CONTEXT_MARKER,
          ...WORKFLOW_CONTEXT_REFERENCES,
        ...CONTRACT_ASSETS,
        ].includes(relativePath) || !(bytes instanceof Uint8Array),
    )
  ) {
    throw new ValidationError(
      "E_INVALID_MANIFEST",
      "release shared resources are invalid",
    );
  }
  const sharedManual = copyMap(source.sharedManual);
  const manual = sharedManual.get(MANUAL_REFERENCE);
  const testDiscipline = sharedManual.get(TEST_DISCIPLINE_REFERENCE);
  const verifier = sharedManual.get(MANUAL_VERIFIER);
  const manualDigest = crypto
    .createHash("sha256")
    .update(manual)
    .digest("hex");
  const testDisciplineDigest = crypto
    .createHash("sha256")
    .update(testDiscipline)
    .digest("hex");
  if (
    manual.length === 0 ||
    manual.at(-1) !== 0x0a ||
    testDiscipline.length === 0 ||
    testDiscipline.at(-1) !== 0x0a ||
    verifier.length === 0 ||
    verifier.at(-1) !== 0x0a ||
    manualDigest !== source.manualDigest ||
    testDisciplineDigest !== source.testDisciplineDigest ||
    !sharedManual.get(MANUAL_MARKER).equals(
      Buffer.from(`${manualDigest}\n`, "ascii"),
    ) ||
    !sharedManual.get(TEST_DISCIPLINE_MARKER).equals(
      Buffer.from(`${testDisciplineDigest}\n`, "ascii"),
    )
  ) {
    throw new ValidationError(
      "E_INVALID_MANIFEST",
      "release shared resources do not match the manual digest",
    );
  }
  for (const resource of WORKFLOW_CONTEXT_REFERENCES) {
    const bytes = sharedManual.get(resource);
    if (bytes.length === 0 || bytes.at(-1) !== 0x0a) {
      throw new ValidationError("E_INVALID_MANIFEST", "workflow context is invalid");
    }
  }
  if (!sharedManual.get(WORKFLOW_CONTEXT_MARKER).equals(workflowContextMarker(sharedManual))) {
    throw new ValidationError("E_INVALID_MANIFEST", "workflow context does not match its digest");
  }
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
    const codexPluginDirectory = `${CODEX_PLUGIN_ROOT}/skills/${name}`;
    const claudePluginDirectory = `${CLAUDE_PLUGIN_ROOT}/skills/${name}`;
    const sidecar = Buffer.from(
      renderCodexSkillMetadata(entry),
      "utf8",
    );
    files.set(`${rootDirectory}/SKILL.md`, Buffer.from(skill.document));
    files.set(`${rootDirectory}/agents/openai.yaml`, sidecar);
    files.set(
      `${codexPluginDirectory}/SKILL.md`,
      renderCodexSkillDocument(
        entry,
        skill.document,
        `${rootDirectory}/SKILL.md`,
      ),
    );
    files.set(
      `${codexPluginDirectory}/agents/openai.yaml`,
      Buffer.from(sidecar),
    );
    files.set(
      `${claudePluginDirectory}/SKILL.md`,
      renderHostTemplate(
        skill.document,
        "claude-code",
        `${rootDirectory}/SKILL.md`,
      ),
    );
    for (const [relativeAsset, bytes] of skill.assets) {
      files.set(
        `${codexPluginDirectory}/${relativeAsset}`,
        renderHostTemplate(
          bytes,
          "codex",
          `${rootDirectory}/${relativeAsset}`,
        ),
      );
      files.set(
        `${claudePluginDirectory}/${relativeAsset}`,
        renderHostTemplate(
          bytes,
          "claude-code",
          `${rootDirectory}/${relativeAsset}`,
        ),
      );
    }
    for (const relativeAsset of sharedAssetsForSkill(name)) {
      const sharedRelativeAsset = relativeAsset.slice(`${SHARED_ROOT}/`.length);
      if (sharedRelativeAsset === PRODUCT_PROTOCOL_MARKER) {
        files.set(
          `${rootDirectory}/${relativeAsset}`,
          productProtocolMarker(
            sharedManual,
            null,
            `${rootDirectory}/${PRODUCT_WORKFLOW_REFERENCE}`,
          ),
        );
        files.set(
          `${codexPluginDirectory}/${relativeAsset}`,
          productProtocolMarker(
            sharedManual,
            "codex",
            `${codexPluginDirectory}/${PRODUCT_WORKFLOW_REFERENCE}`,
          ),
        );
        files.set(
          `${claudePluginDirectory}/${relativeAsset}`,
          productProtocolMarker(
            sharedManual,
            "claude-code",
            `${claudePluginDirectory}/${PRODUCT_WORKFLOW_REFERENCE}`,
          ),
        );
        continue;
      }
      if (sharedRelativeAsset === PRODUCT_WORKFLOW_MARKER) {
        files.set(
          `${rootDirectory}/${relativeAsset}`,
          productWorkflowMarker(source, catalog, sharedManual, name, null),
        );
        files.set(
          `${codexPluginDirectory}/${relativeAsset}`,
          productWorkflowMarker(source, catalog, sharedManual, name, "codex"),
        );
        files.set(
          `${claudePluginDirectory}/${relativeAsset}`,
          productWorkflowMarker(
            source,
            catalog,
            sharedManual,
            name,
            "claude-code",
          ),
        );
        continue;
      }
      const bytes = sharedManual.get(sharedRelativeAsset);
      if (bytes === undefined) {
        throw new ValidationError(
          "E_INVALID_MANIFEST",
          "release shared skill resource unavailable",
          { relativePath: relativeAsset },
        );
      }
        files.set(
          `${rootDirectory}/${relativeAsset}`,
          Buffer.from(bytes),
        );
        files.set(
          `${codexPluginDirectory}/${relativeAsset}`,
          Buffer.from(bytes),
        );
        files.set(
          `${claudePluginDirectory}/${relativeAsset}`,
          Buffer.from(bytes),
        );
    }
  }

  for (const [relativeAsset, bytes] of sharedManual) {
    files.set(
      `${CODEX_PLUGIN_ROOT}/${SHARED_ROOT}/${relativeAsset}`,
      Buffer.from(bytes),
    );
    files.set(
      `${CLAUDE_PLUGIN_ROOT}/${SHARED_ROOT}/${relativeAsset}`,
      Buffer.from(bytes),
    );
  }

  files.set(
    `${CODEX_PLUGIN_ROOT}/.codex-plugin/plugin.json`,
    Buffer.from(renderCodexPluginManifest(release), "utf8"),
  );
  files.set(
    `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`,
    Buffer.from(renderClaudePluginManifest(release), "utf8"),
  );
  files.set(
    `${CODEX_PLUGIN_ROOT}/catalog.json`,
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
    `${CLAUDE_PLUGIN_ROOT}/catalog.json`,
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
    if (sharedAssetsForSkill(skill.name).length > 0) {
      paths.push(
        ...(await walkOptional(
          root,
          `skills/${skill.name}/${SHARED_ROOT}`,
        )),
      );
    }
  }
  paths.push(...(await walkOptional(root, "plugins")));
  paths.push(...(await walkOptional(root, ".agents/plugins")));
  paths.push(...(await walkOptional(root, ".claude-plugin")));
  return paths.sort((left, right) => left.localeCompare(right, "en"));
}

export async function hasGeneratedArtifacts(root, catalogValue) {
  const catalog = validateCatalog(catalogValue);
  for (const skill of catalog.skills) {
    const generatedRoots = [`skills/${skill.name}/agents`];
    if (sharedAssetsForSkill(skill.name).length > 0) {
      generatedRoots.push(`skills/${skill.name}/${SHARED_ROOT}`);
    }
    for (const generatedRoot of generatedRoots) {
      if (
        (await lstatOptional(
          absolutePath(root, generatedRoot),
          generatedRoot,
        )) !== undefined
      ) {
        return true;
      }
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
      ...(sharedAssetsForSkill(skill.name).length > 0
        ? [`skills/${skill.name}/${SHARED_ROOT}`]
        : []),
    ]),
    "plugins",
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
