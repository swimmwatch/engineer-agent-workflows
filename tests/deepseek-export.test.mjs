import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import test from "node:test";
import { readCatalog, readReleaseMetadata, validateCatalog } from "../scripts/lib/catalog.mjs";
import { buildGeneratedFiles, collectReleaseSource, compareGeneratedOutputs, hasGeneratedArtifacts, renderHostTemplate } from "../scripts/lib/distribution.mjs";
import { generateRepository } from "../scripts/generate.mjs";
import { copyFoundationCatalog, copyReleaseSource, makeTempTree, projectRoot } from "./lib/fixtures.mjs";

const exportRoot = "exports/deepseek-harness";
async function source(root = projectRoot) {
  return collectReleaseSource(root, await readCatalog(root), await readReleaseMetadata(root));
}

test("DeepSeek templates resolve native tools and reject unknown targets and variables", () => {
  assert.equal(renderHostTemplate("{{HOST_DISPLAY_NAME}} {{HOST_PROJECT_INSTRUCTIONS}} {{HOST_QUESTION_TOOL}}", "deepseek-harness", "test.md").toString(), "DeepSeek Harness AGENTS.md ask_user_question");
  assert.throws(() => renderHostTemplate("{{HOST_UNKNOWN}}", "deepseek-harness", "test.md"), /unknown host template variable/);
  assert.throws(() => renderHostTemplate("{{HOST_QUESTION_TOOL", "deepseek-harness", "test.md"), /unresolved host template variable/);
  assert.throws(() => renderHostTemplate("plain", "unknown", "test.md"), /unsupported/);
  for (const host of ["constructor", "toString", "__proto__"]) {
    assert.throws(() => renderHostTemplate("plain", host, "test.md"), /unsupported/);
  }
});

test("DeepSeek exports every catalog skill with explicit invocation and complete resources", async t => {
  const release = await source();
  const files = buildGeneratedFiles(release);
  const root = await makeTempTree(t);
  for (const [relative, bytes] of files) {
    if (!relative.startsWith(`${exportRoot}/`)) continue;
    assert.doesNotMatch(relative, /agents\/|\.codex-plugin|\.claude-plugin/);
    const target = path.join(root, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes);
    if (relative.endsWith(".md")) assert.doesNotMatch(bytes.toString(), /\{\{HOST_|request_user_input|AskUserQuestion|CLAUDE\.md|\bCodex\b|Claude Code/, relative);
  }
  for (const skill of release.skills) {
    const base = `${exportRoot}/skills/${skill.entry.name}`;
    const document = files.get(`${base}/SKILL.md`);
    assert.ok(document, skill.entry.name);
    assert.ok(document.length <= 4096, `${skill.entry.name}: ${document.length} bytes`);
    assert.match(document.toString(), /disable-model-invocation: true\nuser-invocable: true/);
    for (const resource of skill.assets.keys()) {
      const target = resource === "workflows/specification-review.body.js"
        ? "workflows/specification-review.js" : resource;
      assert.ok(files.has(`${base}/${target}`), `${base}/${target}`);
    }
    for (const verifier of ["verify-engineering-manual.mjs", "verify-product-workflow.mjs"]) {
      const script = `${base}/shared/scripts/${verifier}`;
      if (files.has(script)) execFileSync(process.execPath, [path.join(root, script), path.join(root, base)], { stdio: "pipe" });
    }
  }
  const scout = files.get(`${exportRoot}/skills/context-scouting/SKILL.md`).toString();
  const delegation = files.get(`${exportRoot}/skills/context-scouting/references/delegation.md`).toString();
  assert.match(scout, /list_subagent_models.*ask_user_question/s);
  assert.match(delegation, /list_subagent_models/);
  assert.match(delegation, /provider.*model/s);
  assert.match(delegation, /reasoning_effort.*low/s);
  assert.doesNotMatch(scout + delegation, /supported `medium`/);
  const base = `${exportRoot}/skills/spec-driven-development`;
  const resource = path.join(root, base, "shared/references/workflow-state-access.md");
  const marker = files.get(`${base}/shared/workflow-context.sha256`);
  assert.notDeepEqual(marker, files.get("skills/spec-driven-development/shared/workflow-context.sha256"));
  await fs.appendFile(resource, "Corrupted rendered guidance.\n");
  assert.throws(() => execFileSync(process.execPath, [path.join(root, base, "shared/scripts/verify-engineering-manual.mjs"), path.join(root, base)], { stdio: "pipe" }));
});

test("Harness scouts require discovered routes and an explicit user model choice", async () => {
  const files = buildGeneratedFiles(await source());
  const base = `${exportRoot}/skills/context-scouting`;
  const scout = files.get(`${base}/SKILL.md`).toString();
  const delegation = files.get(`${base}/references/delegation.md`).toString();
  assert.match(scout, /list_subagent_models.*ask_user_question/s);
  assert.match(scout, /pending.*do not.*(?:spawn|delegate)/is);
  assert.doesNotMatch(scout, /Request `deepseek-flash`|Do not compare models/);
  assert.match(delegation, /list_subagent_models.*ask_user_question.*subagent/s);
  assert.match(delegation, /exact.*provider.*model/s);
  assert.match(delegation, /recommended.*first/is);
  for (const family of [/gpt-6-luna/, /Anthropic.*Haiku/s, /Gemini.*Flash-Lite.*Flash/s, /DeepSeek.*Flash/s]) {
    assert.match(delegation, family);
  }
  assert.match(delegation, /only.*advertised/is);
  assert.match(delegation, /one.*route.*ask/is);
  assert.match(delegation, /silence.*(?:not|never).*consent/is);
  assert.match(delegation, /same task.*reuse/is);
  assert.match(delegation, /(?:unavailable|rejected).*ask.*again/is);
  assert.doesNotMatch(delegation, /requesting `deepseek-flash` unless/);
});

test("Harness main-agent recommendations keep the current model without a model-choice workflow", async () => {
  const files = buildGeneratedFiles(await source());
  const roleSkills = [
    "spec-driven-development", "planning-and-task-breakdown", "design-planning",
    "incremental-implementation", "code-review-and-quality", "security-and-hardening",
  ];
  for (const name of roleSkills) {
    const base = `${exportRoot}/skills/${name}`;
    const document = files.get(`${base}/SKILL.md`).toString();
    assert.doesNotMatch(document, /DeepSeek-V\d|deepseek-(?:flash|pro|chat|reasoner)/i, name);
    assert.match(document, /suggestion:\s*the current session model/, name);
    assert.doesNotMatch(document, /model-selection\.md|user choice; subagents:/, name);
    assert.match(document, /Never switch or gate on (?:a )?model/, name);
    for (const prefix of [`${exportRoot}/skills`, "skills", "plugins/codex/engineer-agent-workflows/skills", "plugins/claude-code/engineer-agent-workflows/skills"]) {
      assert.equal(files.has(`${prefix}/${name}/references/model-selection.md`), false);
    }
  }
  const completeness = files.get(`${exportRoot}/skills/spec-driven-development/references/completeness-review.md`).toString();
  assert.doesNotMatch(completeness, /DeepSeek-V\d/i);
  assert.match(completeness, /suggestion: the current session model/);
  assert.doesNotMatch(completeness, /model-selection\.md|user choice; subagents:/);
});

test("DeepSeek invocation policy cannot permit implicit invocation", async () => {
  const catalog = await readCatalog(projectRoot);
  assert.deepEqual(catalog.skills[0].policies["deepseek-harness"], { disableModelInvocation: true, userInvocable: true });
  catalog.skills[0].policies["deepseek-harness"].disableModelInvocation = false;
  assert.throws(() => validateCatalog(catalog), /DeepSeek/);
  catalog.skills[0].policies["deepseek-harness"].disableModelInvocation = true;
  catalog.skills[0].policies["deepseek-harness"].userInvocable = false;
  assert.throws(() => validateCatalog(catalog), /DeepSeek/);
});

test("shared resource templating rejects unknown and malformed host variables", async t => {
  const root = await copyReleaseSource(t);
  const target = path.join(root, "shared/references/workflow-state-access.md");
  const original = await fs.readFile(target, "utf8");
  for (const [token, error] of [["{{HOST_UNSUPPORTED}}", /unknown host template variable/], ["{{HOST_UNCLOSED", /unresolved host template variable/]]) {
    await fs.writeFile(target, `${original}\n${token}\n`);
    const release = await source(root);
    assert.throws(() => buildGeneratedFiles(release), error);
  }
});

test("templated shared product protocols pass every host bundle verifier", async t => {
  const root = await copyReleaseSource(t);
  await fs.appendFile(path.join(root, "shared/references/product-workflow.md"), "\nHost: {{HOST_DISPLAY_NAME}}. Questions: {{HOST_QUESTION_TOOL}}.\n");
  await generateRepository(root);
  for (const prefix of ["", "plugins/codex/engineer-agent-workflows", "plugins/claude-code/engineer-agent-workflows", exportRoot]) {
    for (const name of ["idea-refine", "product-definition", "technical-design", "product-roadmap"]) {
      const directory = path.join(root, prefix, "skills", name);
      assert.doesNotThrow(() => execFileSync(process.execPath, [path.join(directory, "shared/scripts/verify-product-workflow.mjs"), directory], { stdio: "pipe" }), `${prefix || "canonical"}/${name}`);
    }
  }
  const directory = path.join(root, exportRoot, "skills/idea-refine");
  await fs.appendFile(path.join(directory, "shared/references/product-workflow.md"), "Modified after generation.\n");
  assert.throws(() => execFileSync(process.execPath, [path.join(directory, "shared/scripts/verify-product-workflow.mjs"), directory], { stdio: "pipe" }), error => error.status === 1 && /E_PRODUCT_BUNDLE_MISMATCH/.test(error.stderr.toString()));
});

test("plugin catalogs and skill markers hash each host's rendered engineering manual", async t => {
  const root = await copyReleaseSource(t);
  await fs.appendFile(path.join(root, "shared/references/engineering-principles.md"), "\nHost: {{HOST_DISPLAY_NAME}}.\n");
  await generateRepository(root);
  const hash = bytes => createHash("sha256").update(bytes).digest("hex");
  const canonicalDigest = hash(await fs.readFile(path.join(root, "shared/references/engineering-principles.md")));
  for (const prefix of ["plugins/codex/engineer-agent-workflows", "plugins/claude-code/engineer-agent-workflows"]) {
    const catalog = JSON.parse(await fs.readFile(path.join(root, prefix, "catalog.json"), "utf8"));
    const renderedDigest = hash(await fs.readFile(path.join(root, prefix, "shared/references/engineering-principles.md")));
    assert.notEqual(renderedDigest, canonicalDigest, prefix);
    assert.equal(catalog.engineeringManualSha256, renderedDigest, prefix);
  }
  for (const prefix of ["", "plugins/codex/engineer-agent-workflows", "plugins/claude-code/engineer-agent-workflows", exportRoot]) {
    for (const name of ["spec-driven-development", "planning-and-task-breakdown", "incremental-implementation", "design-planning"]) {
      const directory = path.join(root, prefix, "skills", name);
      const digest = hash(await fs.readFile(path.join(directory, "shared/references/engineering-principles.md")));
      assert.equal(await fs.readFile(path.join(directory, "shared/engineering-manual.sha256"), "utf8"), `${digest}\n`);
      if (prefix === "") assert.equal(digest, canonicalDigest);
      assert.doesNotThrow(() => execFileSync(process.execPath, [path.join(directory, "shared/scripts/verify-engineering-manual.mjs"), directory], { stdio: "pipe" }), `${prefix || "canonical"}/${name}`);
    }
  }
});

test("DeepSeek generation preserves siblings, checks tampering, and rolls back export publication", async t => {
  const root = await copyReleaseSource(t);
  await fs.mkdir(path.join(root, "exports/other"), { recursive: true });
  await fs.writeFile(path.join(root, "exports/other/keep.txt"), "keep\n");
  await generateRepository(root);
  const target = path.join(root, exportRoot, "skills/spec-driven-development/SKILL.md");
  const before = await fs.readFile(target);
  await generateRepository(root, { check: true });
  assert.deepEqual(await fs.readFile(target), before);
  await assert.rejects(generateRepository(root, { rename: async (from, to) => {
    if (from.includes(`${path.sep}staged${path.sep}`) && to === path.join(root, exportRoot)) throw new Error("injected export publication failure");
    return fs.rename(from, to);
  } }), /could not be replaced/);
  assert.deepEqual(await fs.readFile(target), before);
  assert.equal(await fs.readFile(path.join(root, "exports/other/keep.txt"), "utf8"), "keep\n");
  await fs.appendFile(target, "tampered\n");
  await assert.rejects(generateRepository(root, { check: true }), /differs/);
});

test("DeepSeek export rejects symlink ancestors in check and publication", async t => {
  for (const relative of ["exports", exportRoot]) {
    const root = await copyReleaseSource(t);
    const outside = await makeTempTree(t);
    const expected = buildGeneratedFiles(await source(root));
    await fs.mkdir(path.dirname(path.join(root, relative)), { recursive: true });
    await fs.symlink(outside, path.join(root, relative), "dir");
    await assert.rejects(compareGeneratedOutputs(root, await readCatalog(root), expected), /unsafe|real directory/);
    await assert.rejects(generateRepository(root), { code: "E_UNSAFE_PATH" });
    assert.deepEqual(await fs.readdir(outside), []);
  }
});

test("DeepSeek artifacts are detected with incomplete source", async t => {
  const root = await copyFoundationCatalog(t);
  await fs.mkdir(path.join(root, exportRoot), { recursive: true });
  assert.equal(await hasGeneratedArtifacts(root, await readCatalog(root)), true);
  await assert.rejects(generateRepository(root, { check: true, requireComplete: false }), /incomplete source cannot contain/);
});
