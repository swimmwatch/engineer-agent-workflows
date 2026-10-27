import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  assertReleaseReady,
  readCatalog,
  readReleaseMetadata,
} from "../scripts/lib/catalog.mjs";
import {
  buildGeneratedFiles,
  CLAUDE_PLUGIN_ROOT,
  CLAUDE_MARKETPLACE_PATH,
  CODEX_PLUGIN_ROOT,
  CODEX_MARKETPLACE_PATH,
  collectReleaseSource,
  compareGeneratedOutputs,
  PLUGIN_ROOT,
  renderHostTemplate,
  SHARED_ROOT,
} from "../scripts/lib/distribution.mjs";
import { snapshotTree, walkFiles } from "../scripts/lib/files.mjs";
import {
  buildClaudeMarketplace,
  buildClaudePluginManifest,
  buildCodexMarketplace,
  buildCodexPluginManifest,
  buildPluginCatalog,
  renderCanonicalJSON,
  renderClaudeMarketplace,
  renderClaudePluginManifest,
  renderCodexMarketplace,
  renderCodexPluginManifest,
  renderCodexSkillMetadata,
  renderPluginCatalog,
  validateClaudeMarketplace,
  validateClaudePluginManifest,
  validateCodexMarketplace,
  validateCodexPluginManifest,
  validateCodexSkillMetadata,
  validatePluginCatalog,
} from "../scripts/lib/manifests.mjs";
import {
  utf8Bytes,
  validateSkillDocument,
} from "../scripts/lib/skill-document.mjs";
import {
  generateRepository,
  main as generateMain,
} from "../scripts/generate.mjs";
import {
  main as validateMain,
  validateRepository,
} from "../scripts/validate.mjs";
import {
  copyFoundationCatalog,
  copyReleaseSource,
  projectRoot,
  readFixture,
} from "./lib/fixtures.mjs";

async function releaseInputs(root = projectRoot) {
  const [catalog, release] = await Promise.all([
    readCatalog(root),
    readReleaseMetadata(root),
  ]);
  const source = await collectReleaseSource(root, catalog, release);
  return { catalog, release, source };
}

test("generation renders isolated host-specific skill bundles", async () => {
  const { source } = await releaseInputs();
  const generated = buildGeneratedFiles(source);
  const skillName = "spec-driven-development";
  const relativeSkill = `skills/${skillName}/SKILL.md`;
  const codexDocument = generated.get(`${CODEX_PLUGIN_ROOT}/${relativeSkill}`);
  const claudeDocument = generated.get(`${CLAUDE_PLUGIN_ROOT}/${relativeSkill}`);

  assert.ok(codexDocument instanceof Uint8Array);
  assert.ok(claudeDocument instanceof Uint8Array);

  const codexText = Buffer.from(codexDocument).toString("utf8");
  const claudeText = Buffer.from(claudeDocument).toString("utf8");
  assert.match(codexText, /`request_user_input`/);
  assert.doesNotMatch(codexText, /AskUserQuestion|CLAUDE\.md|\{\{HOST_/);
  assert.doesNotMatch(
    codexText,
    /disable-model-invocation|user-invocable/,
  );
  assert.match(claudeText, /`AskUserQuestion`/);
  assert.doesNotMatch(claudeText, /request_user_input|AGENTS\.md|\{\{HOST_/);
  assert.match(claudeText, /disable-model-invocation: true/);
  assert.match(claudeText, /user-invocable: true/);

  assert.ok(
    generated.has(
      `${CODEX_PLUGIN_ROOT}/skills/${skillName}/agents/openai.yaml`,
    ),
  );
  assert.equal(
    generated.has(
      `${CLAUDE_PLUGIN_ROOT}/skills/${skillName}/agents/openai.yaml`,
    ),
    false,
  );
  assert.ok(generated.has(`${CODEX_PLUGIN_ROOT}/.codex-plugin/plugin.json`));
  assert.doesNotMatch(
    Buffer.from(
      generated.get(`${CODEX_PLUGIN_ROOT}/.codex-plugin/plugin.json`),
    ).toString("utf8"),
    /Claude Code/,
  );
  assert.equal(
    generated.has(`${CODEX_PLUGIN_ROOT}/.claude-plugin/plugin.json`),
    false,
  );
  assert.ok(
    generated.has(`${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`),
  );
  assert.doesNotMatch(
    Buffer.from(
      generated.get(`${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`),
    ).toString("utf8"),
    /\bCodex\b/,
  );
  assert.equal(
    generated.has(`${CLAUDE_PLUGIN_ROOT}/.codex-plugin/plugin.json`),
    false,
  );

  const codexMarketplace = JSON.parse(
    Buffer.from(generated.get(CODEX_MARKETPLACE_PATH)).toString("utf8"),
  );
  const claudeMarketplace = JSON.parse(
    Buffer.from(generated.get(CLAUDE_MARKETPLACE_PATH)).toString("utf8"),
  );
  assert.equal(
    codexMarketplace.plugins[0].source.path,
    `./${CODEX_PLUGIN_ROOT}`,
  );
  assert.equal(
    claudeMarketplace.plugins[0].source,
    `./${CLAUDE_PLUGIN_ROOT}`,
  );

  for (const [relativePath, bytes] of generated) {
    if (!relativePath.endsWith(".md")) {
      continue;
    }
    const text = Buffer.from(bytes).toString("utf8");
    if (relativePath.startsWith(`${CODEX_PLUGIN_ROOT}/`)) {
      assert.doesNotMatch(
        text,
        /AskUserQuestion|CLAUDE\.md|Claude Code|\{\{HOST_/,
        relativePath,
      );
    }
    if (relativePath.startsWith(`${CLAUDE_PLUGIN_ROOT}/`)) {
      assert.doesNotMatch(
        text,
        /request_user_input|AGENTS\.md|\bCodex\b|\{\{HOST_/,
        relativePath,
      );
    }
  }
});

test("host template rendering fails closed", () => {
  assert.equal(
    renderHostTemplate(
      Buffer.from("Use {{HOST_QUESTION_TOOL}}.\n"),
      "codex",
      "skills/example/SKILL.md",
    ).toString("utf8"),
    "Use request_user_input.\n",
  );
  assert.throws(
    () =>
      renderHostTemplate(
        Buffer.from("{{HOST_UNKNOWN}}\n"),
        "codex",
        "skills/example/SKILL.md",
      ),
    /unknown host template variable/,
  );
  for (const malformed of [
    "{{HOST_question_tool}}\n",
    "{{HOST_QUESTION_TOOL\n",
    "{{HOST_}}\n",
  ]) {
    assert.throws(
      () =>
        renderHostTemplate(
          Buffer.from(malformed),
          "codex",
          "skills/example/SKILL.md",
        ),
      /unresolved host template variable/,
    );
  }

  assert.throws(
    () =>
      renderHostTemplate(
        Buffer.from("{{HOST_QUESTION_TOOL}}\n"),
        "unsupported-host",
        "skills/example/SKILL.md",
      ),
    /host template target is unsupported/,
  );
});

async function nativeReviewDiskOutputsPreserveHostIsolation(t) {
  const root = await copyReleaseSource(t);
  await generateRepository(root);
  const relative = "skills/spec-driven-development/workflows/specification-review.js";
  const claude = await fs.readFile(path.join(root, CLAUDE_PLUGIN_ROOT, relative), "utf8");
  const harness = await fs.readFile(path.join(root, "exports/deepseek-harness", relative), "utf8");
  assert.match(claude, /^export const meta = \{/);
  assert.doesNotMatch(harness, /export const meta/);
  const metadata = await fs.readFile(path.join(root, "exports/deepseek-harness", "skills/spec-driven-development/workflows/specification-review.meta.json"), "utf8");
  assert.equal(JSON.parse(metadata).name, "specification-review");
  await assert.rejects(fs.access(path.join(root, CODEX_PLUGIN_ROOT, relative)), { code: "ENOENT" });
  const checked = await generateRepository(root, { check: true });
  assert.equal(checked.checked, true);
}
test("generated native review files on disk preserve host isolation and deterministic checks", nativeReviewDiskOutputsPreserveHostIsolation);

function mutateAtPath(value, segments, replacement) {
  const copy = structuredClone(value);
  let target = copy;
  for (const segment of segments.slice(0, -1)) {
    target = target[segment];
  }
  target[segments.at(-1)] = replacement;
  return copy;
}

function capture() {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      stdout: { write: (value) => (stdout += value) },
      stderr: { write: (value) => (stderr += value) },
    },
    output: () => ({ stdout, stderr }),
  };
}

test("packaging manifest renderers match declarative golden files", async () => {
  const { catalog, release, source } = await releaseInputs();
  const firstSkill = catalog.skills[0];
  const cases = [
    [
      renderCodexPluginManifest(release),
      await readFixture("manifests", "codex-plugin.json"),
    ],
    [
      renderClaudePluginManifest(release),
      await readFixture("manifests", "claude-plugin.json"),
    ],
    [
      renderCodexMarketplace(release),
      await readFixture("manifests", "codex-marketplace.json"),
    ],
    [
      renderClaudeMarketplace(release),
      await readFixture("manifests", "claude-marketplace.json"),
    ],
    [
      renderCodexSkillMetadata(firstSkill),
      await readFixture("manifests", "codex-skill.yaml"),
    ],
    [
      renderPluginCatalog(catalog, release, source.manualDigest),
      await readFixture("manifests", "plugin-catalog.json"),
    ],
  ];
  for (const [actual, expected] of cases) {
    assert.equal(actual, expected);
    assert.equal(actual.endsWith("\n"), true);
    assert.equal(actual.includes("\r"), false);
  }
  validateCodexPluginManifest(release, cases[0][1], "codex-plugin.json");
  validateClaudePluginManifest(release, cases[1][1], "claude-plugin.json");
  validateCodexMarketplace(release, cases[2][1], "codex-marketplace.json");
  validateClaudeMarketplace(
    release,
    cases[3][1],
    "claude-marketplace.json",
  );
  validateCodexSkillMetadata(
    firstSkill,
    cases[4][1],
    "agents/openai.yaml",
  );
  validatePluginCatalog(
    catalog,
    release,
    source.manualDigest,
    cases[5][1],
    "catalog.json",
  );

  const isolated = buildCodexPluginManifest(release);
  isolated.author.name = "caller mutation";
  assert.equal(
    buildCodexPluginManifest(release).author.name,
    "Dmitry Vasiliev",
  );
  const publicCatalog = buildPluginCatalog(
    catalog,
    release,
    source.manualDigest,
  );
  publicCatalog.skills[0].dependencies.push("caller-mutation");
  assert.deepEqual(
    buildPluginCatalog(catalog, release, source.manualDigest).skills[0]
      .dependencies,
    [],
  );
});

test("manifest validators reject unknown fields, drift, and unsafe paths", async () => {
  const { catalog, release, source } = await releaseInputs();
  const invalid = JSON.parse(
    await readFixture("manifests", "invalid-cases.json"),
  );
  const artifacts = {
    "codex-plugin": buildCodexPluginManifest(release),
    "codex-marketplace": buildCodexMarketplace(release),
    "claude-plugin": buildClaudePluginManifest(release),
    "claude-marketplace": buildClaudeMarketplace(release),
    "plugin-catalog": buildPluginCatalog(
      catalog,
      release,
      source.manualDigest,
    ),
  };
  const validators = {
    "codex-plugin": (input) =>
      validateCodexPluginManifest(release, input, "codex-plugin.json"),
    "codex-marketplace": (input) =>
      validateCodexMarketplace(release, input, "codex-marketplace.json"),
    "claude-plugin": (input) =>
      validateClaudePluginManifest(release, input, "claude-plugin.json"),
    "claude-marketplace": (input) =>
      validateClaudeMarketplace(release, input, "claude-marketplace.json"),
    "plugin-catalog": (input) =>
      validatePluginCatalog(
        catalog,
        release,
        source.manualDigest,
        input,
        "catalog.json",
      ),
  };
  for (const scenario of invalid.cases) {
    const mutated = mutateAtPath(
      artifacts[scenario.artifact],
      scenario.path,
      scenario.value,
    );
    assert.throws(
      () =>
        validators[scenario.artifact](
          renderCanonicalJSON(mutated),
        ),
      /generated JSON metadata does not match/,
      scenario.id,
    );
  }

  const sidecar = renderCodexSkillMetadata(catalog.skills[0]);
  assert.throws(
    () =>
      validateCodexSkillMetadata(
        catalog.skills[0],
        `${sidecar}unknown: true\n`,
        "agents/openai.yaml",
      ),
    /does not match/,
  );
  assert.throws(
    () =>
      validateCodexSkillMetadata(
        catalog.skills[0],
        Buffer.from([0xc3, 0x28]),
        "agents/openai.yaml",
      ),
    /valid UTF-8/,
  );

  source.skills[0].entry.name = "../outside";
  assert.throws(
    () => buildGeneratedFiles(source),
    /does not match the catalog/,
  );
});

test("generation creates the complete deterministic explicit-only bundle", async (t) => {
  const root = await copyReleaseSource(t);
  const catalog = await readCatalog(root);
  const generated = await generateRepository(root);
  assert.equal(generated.complete, true);
  assert.equal(generated.sidecarCount, catalog.skills.length);
  assert.equal(generated.pluginSkillCount, catalog.skills.length);
  assert.match(generated.manualDigest, /^[a-f0-9]{64}$/);

  const validated = await validateRepository(root);
  assert.equal(validated.complete, true);
  assert.equal(validated.sidecarCount, catalog.skills.length);
  assert.equal(validated.pluginSkillCount, catalog.skills.length);
  assert.equal(validated.manualDigest, generated.manualDigest);

  for (const pluginRoot of [CODEX_PLUGIN_ROOT, CLAUDE_PLUGIN_ROOT]) {
    assert.deepEqual(
      await fs.readdir(path.join(root, pluginRoot, "skills")),
      catalog.skills.map((skill) => skill.name),
    );
  }
  for (const skill of catalog.skills) {
    const rootSkill = path.join(root, "skills", skill.name);
    const codexSkill = path.join(
      root,
      CODEX_PLUGIN_ROOT,
      "skills",
      skill.name,
    );
    const claudeSkill = path.join(
      root,
      CLAUDE_PLUGIN_ROOT,
      "skills",
      skill.name,
    );
    for (const skillDirectory of [rootSkill, claudeSkill]) {
      const document = await fs.readFile(
        path.join(skillDirectory, "SKILL.md"),
      );
      assert.ok(validateSkillDocument(skill, document).bytes <= 4096);
    }
    const codexDocument = await fs.readFile(
      path.join(codexSkill, "SKILL.md"),
    );
    assert.ok(codexDocument.byteLength <= 4096);
    assert.ok(
      codexDocument.toString("utf8").startsWith(
        [
          "---",
          `name: ${skill.name}`,
          `description: ${JSON.stringify(skill.description)}`,
          "---",
          "",
        ].join("\n"),
      ),
    );
    validateCodexSkillMetadata(
      skill,
      await fs.readFile(path.join(codexSkill, "agents", "openai.yaml")),
      `${CODEX_PLUGIN_ROOT}/skills/${skill.name}/agents/openai.yaml`,
    );
    await assert.rejects(fs.lstat(path.join(claudeSkill, "agents")), {
      code: "ENOENT",
    });
  }

  const manual = await fs.readFile(
    path.join(
      root,
      PLUGIN_ROOT,
      SHARED_ROOT,
      "references",
      "engineering-principles.md",
    ),
  );
  const rootManual = await fs.readFile(
    path.join(
      root,
      SHARED_ROOT,
      "references",
      "engineering-principles.md",
    ),
  );
  assert.deepEqual(manual, rootManual);
  for (const skill of [
    "planning-and-task-breakdown",
    "incremental-implementation",
    "spec-driven-development",
  ]) {
    assert.deepEqual(
      await fs.readFile(
        path.join(
          root,
          "skills",
          skill,
          SHARED_ROOT,
          "references",
          "engineering-principles.md",
        ),
      ),
      rootManual,
    );
  }
  assert.equal(
    JSON.parse(
      await fs.readFile(path.join(root, PLUGIN_ROOT, "catalog.json"), "utf8"),
    ).engineeringManualSha256,
    generated.manualDigest,
  );

  const first = await snapshotTree(root);
  await generateRepository(root);
  assert.deepEqual(await snapshotTree(root), first);
  const checked = await generateRepository(root, { check: true });
  assert.equal(checked.checked, true);
  assert.deepEqual(await snapshotTree(root), first);
});

test("generated check mode detects tampering without mutation", async (t) => {
  const root = await copyReleaseSource(t);
  await generateRepository(root);
  const manifest = path.join(root, PLUGIN_ROOT, ".codex-plugin", "plugin.json");
  await fs.appendFile(manifest, "tampered\n");
  const before = await snapshotTree(root);
  await assert.rejects(
    () => generateRepository(root, { check: true }),
    /generated distribution differs/,
  );
  assert.deepEqual(await snapshotTree(root), before);
});

test("strict validation rejects missing and unexpected generated paths", async (t) => {
  const root = await copyReleaseSource(t);
  await generateRepository(root);
  const unexpected = path.join(root, PLUGIN_ROOT, "unexpected.txt");
  await fs.writeFile(unexpected, "unexpected\n");
  await assert.rejects(
    () => validateRepository(root),
    /unexpected path/,
  );
  await fs.rm(unexpected);

  await fs.rm(path.join(root, CODEX_MARKETPLACE_PATH));
  await assert.rejects(
    () => validateRepository(root),
    /missing or unsafe/,
  );
});

test("generation rolls back every managed target after replacement failure", async (t) => {
  const root = await copyReleaseSource(t);
  await generateRepository(root);
  const document = path.join(
    root,
    "skills",
    "code-review-and-quality",
    "SKILL.md",
  );
  await fs.appendFile(document, "\nReview the verified task boundary.\n");
  const before = await snapshotTree(root);
  let calls = 0;
  const rename = async (source, target) => {
    calls += 1;
    if (calls === 6) {
      throw new Error("injected replacement failure");
    }
    await fs.rename(source, target);
  };
  await assert.rejects(
    () => generateRepository(root, { rename }),
    /could not be replaced/,
  );
  assert.ok(calls > 6);
  assert.deepEqual(await snapshotTree(root), before);
});

test("source and generated symlinks or case collisions fail closed", async (t) => {
  const sourceRoot = await copyReleaseSource(t);
  await fs.symlink(
    "SKILL.md",
    path.join(sourceRoot, "skills", "code-review-and-quality", "linked.md"),
  );
  await assert.rejects(
    () => generateRepository(sourceRoot),
    /symbolic links are not allowed/,
  );

  const collisionRoot = await copyReleaseSource(t);
  const skillRoot = path.join(
    collisionRoot,
    "skills",
    "code-review-and-quality",
  );
  await fs.writeFile(path.join(skillRoot, "Case.txt"), "one\n");
  await fs.writeFile(path.join(skillRoot, "case.txt"), "two\n");
  await assert.rejects(
    () => generateRepository(collisionRoot),
    /collide by case/,
  );

  const unexpectedSharedRoot = await copyReleaseSource(t);
  await fs.writeFile(
    path.join(unexpectedSharedRoot, SHARED_ROOT, "unexpected.txt"),
    "unexpected\n",
  );
  await assert.rejects(
    () => generateRepository(unexpectedSharedRoot),
    /shared engineering resources contain an unexpected path/,
  );

  const generatedRoot = await copyReleaseSource(t);
  await generateRepository(generatedRoot);
  await fs.rm(path.join(generatedRoot, PLUGIN_ROOT), {
    recursive: true,
  });
  await fs.symlink(
    path.join(generatedRoot, "skills"),
    path.join(generatedRoot, PLUGIN_ROOT),
    "dir",
  );
  await assert.rejects(
    () => validateRepository(generatedRoot),
    /symbolic links are not allowed|real directory|missing or unsafe/,
  );
});

test("incomplete source rejects partial packaging and remains read-only", async (t) => {
  const root = await copyFoundationCatalog(t);
  await fs.mkdir(path.join(root, PLUGIN_ROOT), { recursive: true });
  await fs.writeFile(
    path.join(root, PLUGIN_ROOT, "catalog.json"),
    "{}\n",
  );
  const before = await snapshotTree(root);
  await assert.rejects(
    () => validateRepository(root, { requireComplete: false }),
    /incomplete source cannot contain/,
  );
  await assert.rejects(
    () =>
      generateRepository(root, {
        check: true,
        requireComplete: false,
      }),
    /incomplete source cannot contain/,
  );
  assert.deepEqual(await snapshotTree(root), before);
});

test("development metadata is visible and fails the release-ready gate", async () => {
  const { catalog, release, source } = await releaseInputs();
  assert.equal(release.version, "0.0.0-development");
  assert.equal(release.releaseReady, false);
  assert.throws(() => assertReleaseReady(release), /not eligible/);
  const generatedCatalog = buildPluginCatalog(
    catalog,
    release,
    source.manualDigest,
  );
  assert.equal(generatedCatalog.version, release.version);
  assert.equal(generatedCatalog.releaseReady, false);
});

test("generated artifacts contain no forbidden plugin surfaces or private paths", async (t) => {
  const root = await copyReleaseSource(t);
  const { catalog, release, source } = await releaseInputs(root);
  const expected = buildGeneratedFiles(source);
  await generateRepository(root);
  await compareGeneratedOutputs(root, catalog, expected);

  const files = await walkFiles(path.join(root, PLUGIN_ROOT));
  assert.ok(files.every((file) => !file.endsWith(".mcp.json")));
  assert.ok(files.every((file) => !/(?:^|\/)(?:hooks|apps)(?:\/|$)/.test(file)));
  assert.ok(files.every((file) => !file.endsWith(".app.json")));
  const codex = buildCodexPluginManifest(release);
  assert.equal(Object.hasOwn(codex, "hooks"), false);
  assert.equal(Object.hasOwn(codex, "mcpServers"), false);
  assert.equal(Object.hasOwn(codex, "apps"), false);
  assert.equal(Object.hasOwn(buildCodexMarketplace(release).plugins[0].policy, "products"), false);

  for (const relativePath of files) {
    const bytes = await fs.readFile(path.join(root, PLUGIN_ROOT, relativePath));
    assert.equal(bytes.includes(Buffer.from("/home/")), false);
    assert.equal(bytes.includes(Buffer.from("PRIVATE_SENTINEL")), false);
  }
  assert.ok(
    utf8Bytes(
      await fs.readFile(
        path.join(root, CLAUDE_MARKETPLACE_PATH),
        "utf8",
      ),
    ) > 0,
  );
});

test("packaging CLI diagnostics are bounded and content-free", async (t) => {
  const root = await copyReleaseSource(t);
  await generateRepository(root);
  const sentinel = "PACKAGING_PRIVATE_SENTINEL";
  await fs.writeFile(
    path.join(root, CLAUDE_MARKETPLACE_PATH),
    `${sentinel}\n`,
  );
  const validation = capture();
  const validationStatus = await validateMain([], {
    root,
    ...validation.io,
  });
  assert.equal(validationStatus, 1);
  assert.equal(validation.output().stdout, "");
  assert.doesNotMatch(validation.output().stderr, new RegExp(sentinel));
  assert.doesNotMatch(
    validation.output().stderr,
    new RegExp(root.replaceAll("\\", "\\\\")),
  );

  const generation = capture();
  const generationStatus = await generateMain(["--check"], {
    root,
    ...generation.io,
  });
  assert.equal(generationStatus, 1);
  assert.equal(generation.output().stdout, "");
  assert.doesNotMatch(generation.output().stderr, new RegExp(sentinel));
});
