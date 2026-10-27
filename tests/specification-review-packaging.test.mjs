import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { readCatalog, readReleaseMetadata } from "../scripts/lib/catalog.mjs";
import {
  buildGeneratedFiles,
  collectReleaseSource,
  renderHostTemplate,
} from "../scripts/lib/distribution.mjs";
import { copyReleaseSource, projectRoot } from "./lib/fixtures.mjs";

const skillDirectory = "skills/spec-driven-development";
const bodyPath = "workflows/specification-review.body.js";
const metadataPath = "workflows/specification-review.meta.json";
const scriptPath = "workflows/specification-review.js";
const referencePath = "references/native-specification-review.md";
const nativeHosts = [
  ["claude-code", "plugins/claude-code/engineer-agent-workflows"],
  ["deepseek-harness", "exports/deepseek-harness"],
];

async function releaseSource(root = projectRoot) {
  const [catalog, release] = await Promise.all([
    readCatalog(root),
    readReleaseMetadata(root),
  ]);
  return collectReleaseSource(root, catalog, release);
}

function specificationSkill(source) {
  return source.skills.find((skill) => skill.entry.name === "spec-driven-development");
}

function generatedText(files, root, asset) {
  const target = `${root}/${skillDirectory}/${asset}`;
  assert.ok(files.has(target), `Missing generated resource: ${target}`);
  return files.get(target).toString("utf8");
}

async function nativeFormatsPreserveTheExactCanonicalBody() {
  const source = await releaseSource();
  const skill = specificationSkill(source);
  const files = buildGeneratedFiles(source);
  for (const [host, root] of nativeHosts) {
    const script = generatedText(files, root, scriptPath);
    const body = renderHostTemplate(skill.assets.get(bodyPath), host, bodyPath).toString();
    const metadata = renderHostTemplate(skill.assets.get(metadataPath), host, metadataPath);
    if (host === "claude-code") {
      const prefix = "export const meta = ";
      assert.ok(script.startsWith(prefix));
      const boundary = script.indexOf(";\n");
      assert.ok(boundary > prefix.length);
      const declaration = script.slice(prefix.length, boundary);
      const declaredMetadata = JSON.parse(declaration);
      const expectedMetadata = JSON.parse(metadata);
      assert.deepEqual(declaredMetadata, expectedMetadata);
      assert.equal(script.slice(boundary + 2), body);
      assert.equal(files.has(`${root}/${skillDirectory}/${metadataPath}`), false);
    } else {
      assert.equal(script, body);
      assert.deepEqual(files.get(`${root}/${skillDirectory}/${metadataPath}`), metadata);
      assert.doesNotMatch(script, /export const meta/);
    }
    assert.equal(files.has(`${root}/${skillDirectory}/${bodyPath}`), false);
  }
}
test("native formats preserve the exact canonical body with host-owned metadata", nativeFormatsPreserveTheExactCanonicalBody);

async function codexRetainsOrdinaryReviewWithoutNativeAssetsOrRoutes() {
  const source = await releaseSource();
  const files = buildGeneratedFiles(source);
  const root = "plugins/codex/engineer-agent-workflows";
  for (const name of files.keys()) {
    if (name.startsWith(`${root}/${skillDirectory}/`)) {
      assert.doesNotMatch(name, /\/workflows\/|native-specification-review/);
    }
  }
  for (const asset of ["references/specification-interview.md", "references/completeness-review.md"]) {
    const text = generatedText(files, root, asset);
    assert.match(text, /ordinary independent checker/i);
    assert.doesNotMatch(text, /native-specification-review|scriptPath|run_code|list_subagent_models|ask_user_question|AskUserQuestion/);
  }
  assert.match(generatedText(files, root, "references/completeness-review.md"), /specification_review_record_batch/);
}
test("Codex retains the ordinary independent path without native assets or routes", codexRetainsOrdinaryReviewWithoutNativeAssetsOrRoutes);

async function nativeAssetsRejectIncompleteOrShadowingSources() {
  for (const missing of [bodyPath, metadataPath, referencePath]) {
    const source = await releaseSource();
    specificationSkill(source).assets.delete(missing);
    assert.throws(() => buildGeneratedFiles(source), /workflow.*(?:missing|incomplete)/i);
  }
  const source = await releaseSource();
  specificationSkill(source).assets.set(scriptPath, Buffer.from("return null;\n"));
  assert.throws(() => buildGeneratedFiles(source), /workflow.*(?:reserved|generated)/i);
  const alias = await releaseSource();
  specificationSkill(alias).assets.set("workflows/Specification-Review.js", Buffer.from("return null;\n"));
  assert.throws(() => buildGeneratedFiles(alias), /workflow.*(?:reserved|generated)/i);
}
test("native assets reject incomplete canonical pairs and generated-script shadowing", nativeAssetsRejectIncompleteOrShadowingSources);

async function sourceCollectionRejectsAStoredAssembledScript(t) {
  const root = await copyReleaseSource(t);
  await fs.writeFile(path.join(root, skillDirectory, scriptPath), "return null;\n");
  await assert.rejects(releaseSource(root), /workflow.*(?:reserved|generated)/i);
}
test("source collection rejects hand-maintained assembled workflow copies", sourceCollectionRejectsAStoredAssembledScript);

async function workflowRenderingRetainsStrictTokenAndMetadataValidation() {
  for (const asset of [bodyPath, metadataPath]) {
    const source = await releaseSource();
    const skill = specificationSkill(source);
    const original = skill.assets.get(asset).toString();
    skill.assets.set(asset, Buffer.from(original.replace(/specification-review|const coefficient/, "{{HOST_UNKNOWN_REVIEW}}")));
    assert.throws(() => buildGeneratedFiles(source), /unknown host template variable/);
  }
  for (const invalid of ["{", "null", "[]", '{"name":"specification-review"}']) {
    const source = await releaseSource();
    specificationSkill(source).assets.set(metadataPath, Buffer.from(invalid));
    assert.throws(() => buildGeneratedFiles(source), /workflow metadata/i);
  }
  const source = await releaseSource();
  specificationSkill(source).assets.set("../escaped.js", Buffer.from("return null;\n"));
  assert.throws(() => buildGeneratedFiles(source), /unsafe/);
}
test("workflow assembly preserves strict tokens, metadata validation and path safety", workflowRenderingRetainsStrictTokenAndMetadataValidation);

async function generatedEntryDiscoversCapabilitiesAndHandsPreparedInputsToTheBody() {
  const files = buildGeneratedFiles(await releaseSource());
  for (const [, root] of nativeHosts) {
    const text = generatedText(files, root, referencePath);
    for (const tool of ["specification_review_prepare_workflow", "specification_review_submit_batch", "specification_review_complete"]) {
      assert.ok(text.includes(tool), tool);
    }
    assert.match(text, /callable.*schemas/s);
    assert.match(text, /published `cursor` field; `metadata_cursor`\s+is an assignment label, not an additional tool argument/);
    assert.match(text, /exact target.*review_ref.*source_version.*host_concurrency/s);
    assert.match(text, /one initial read-only.*preparation call/s);
    assert.match(text, /completed.*saved outcome.*no.*dispatch/s);
    assert.match(text, /blocked.*reasons.*no.*dispatch/s);
    assert.match(text, /server prerequisites only/);
    assert.match(text, /native.*permissions.*independent.*structured.*model routes/s);
    assert.match(text, /target.*prepared.*reviewer_reference.*host.*roles\.judge.*roles\.final/s);
    assert.match(text, /missing.*preparation.*submission.*blocks/is);
    assert.match(text, /absent native.*ordinary independent checker/is);
    assert.match(text, /missing\s+independence.*incomplete/is);
    assert.doesNotMatch(text, /mcp__[a-z_]+__|inspection-model choice|spawn an inspector/);
  }
}
test("generated entry discovers actual capabilities and hands prepared bounded inputs to the body", generatedEntryDiscoversCapabilitiesAndHandsPreparedInputsToTheBody);

async function nativeReviewOwnsReadsAndWritesWithoutChangingOrdinaryOwnership() {
  const files = buildGeneratedFiles(await releaseSource());
  for (const [, root] of nativeHosts) {
    const native = generatedText(files, root, referencePath);
    const checker = generatedText(files, root, "references/completeness-review.md");
    const interview = generatedText(files, root, "references/specification-interview.md");
    assert.match(checker, /references\/native-specification-review\.md/);
    assert.match(interview, /references\/native-specification-review\.md/);
    assert.match(checker, /ordinary scheduling, persistence and recovery.*only outside.*native/s);
    assert.match(checker, /Ordinary Detailed Review/);
    assert.match(checker, /Ordinary Persistence And Completion/);
    assert.match(checker, /Readers never write review/);
    assert.match(native, /same judging actor.*exact.*submit.*own/s);
    assert.match(native, /no separate writer/i);
    assert.match(native, /ordinary.*record_batch.*do not apply/is);
    assert.match(native, /saved\s+acknowledgment.*persisted.*queued/s);
    assert.match(native, /20.*131,072.*24 KiB.*64 KiB.*4,096/s);
    assert.match(native, /no total-item.*cap/s);
  }
}
test("native judges own exact reads and direct writes while ordinary ownership remains scoped", nativeReviewOwnsReadsAndWritesWithoutChangingOrdinaryOwnership);

async function generatedEntryWaitsAndVerifiesCompletionThroughTheOwningMcp() {
  const files = buildGeneratedFiles(await releaseSource());
  for (const [, root] of nativeHosts) {
    const text = generatedText(files, root, referencePath);
    assert.match(text, /one foreground native call/);
    assert.match(text, /hands control.*workflow.*waits/s);
    assert.match(text, /no parent status polling/);
    assert.match(text, /do not end.*owning session/is);
    assert.match(text, /verify_review_completion/);
    assert.match(text, /after.*terminal.*one direct.*read-only.*original target/is);
    assert.match(text, /`reported_outcome` is never a substitute for MCP\s+state/);
    assert.match(text, /pending.*blocked.*stale.*not success/s);
    assert.match(text, /completion_only.*no new.*judge/s);
    assert.match(text, /same-actor.*programmatic.*budgets/is);
    assert.match(text, /ordinary cursor.*fallback/s);
  }
}
test("native entry awaits one foreground run and verifies the saved completion independently", generatedEntryWaitsAndVerifiesCompletionThroughTheOwningMcp);

async function correctionEntryReusesConditionalFollowupWithoutEditingInReviewOnlyMode() {
  const files = buildGeneratedFiles(await releaseSource());
  for (const [, root] of nativeHosts) {
    const text = generatedText(files, root, referencePath);
    assert.match(text, /references\/followup-review\.md/);
    assert.match(text, /review-only.*returns findings.*without.*edit/s);
    assert.match(text, /changes_summary.*changes_read.*changes_receipt.*followup_start/s);
    assert.match(text, /Run the same installed body again with fresh preparation for the enrolled\s+followup\./);
    assert.match(text, /pending-only.*N\/W\/R/s);
    assert.match(text, /carried_from[^.]*;\s*carried results are not fresh checks\./);
    assert.match(text, /quiesce.*scope_expand.*same unfinished review/s);
    assert.match(text, /whole.*context.*consistency/s);
    assert.match(text, /full review.*eligibility.*reason/s);
    assert.match(text, /no raw.*archive/i);
    assert.match(text, /never.*approve/is);
  }
}
test("correction entry reuses the conditional followup and same native body without broad restarts", correctionEntryReusesConditionalFollowupWithoutEditingInReviewOnlyMode);
