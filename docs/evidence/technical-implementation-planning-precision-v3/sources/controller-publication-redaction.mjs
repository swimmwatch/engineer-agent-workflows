import assert from "node:assert/strict";
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { dirname, join, resolve, relative, basename } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
const control = dirname(fileURLToPath(import.meta.url)), repo = resolve(control, "../..");
const root = join(repo, "docs/evidence/technical-implementation-planning-precision-v3");
const state = JSON.parse(await readFile(join(control, "control.json"), "utf8"));
const sha = value => createHash("sha256").update(value).digest("hex");
const normalize = text => text.replaceAll(state.root, "$TRIAL_ROOT").replaceAll(repo, "$SOURCE_ROOT").replaceAll(homedir(), "$USER_HOME").replaceAll(basename(homedir()), "$FIXTURE_USER");
export async function redactPublication() {
  const registryPath = join(root, "publication-redaction.json");
  let registry;
  try { registry = JSON.parse(await readFile(registryPath, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
  registry ??= { classification: "ACTUAL", recordedAt: new Date().toISOString(), purpose: "Normalize only machine paths and personal owner/group labels in published exports. Pre-publication bytes remain in a private ignored cache. Model IDs, timestamps, numeric results, reviewer verdict objects and metric bytes are preserved.", privateOriginalsRoot: ".cache/technical-implementation-planning-precision-v3/ownership-redaction-originals", placeholders: ["$TRIAL_ROOT", "$SOURCE_ROOT", "$USER_HOME", "$FIXTURE_USER"], files: [] };
  const beforeRegistry = JSON.stringify(registry), changed = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) { await visit(path); continue; }
      if (path === registryPath) continue;
      const before = await readFile(path, "utf8"), after = normalize(before);
      if (before === after) continue;
      if (entry.name === "evaluation.json") assert.deepEqual(JSON.parse(after).verdict, JSON.parse(before).verdict, "Reviewer verdict objects must remain exact");
      const ref = relative(root, path), beforeDigest = sha(before), afterDigest = sha(after);
      const backup = join(control, "ownership-redaction-originals", beforeDigest, ref);
      await mkdir(dirname(backup), { recursive: true, mode: 0o700 });
      try { assert.equal(sha(await readFile(backup)), beforeDigest); } catch (error) { if (error.code !== "ENOENT") throw error; await writeFile(backup, before, { mode: 0o600 }); }
      await writeFile(path, after);
      if (!registry.files.some(item => item.ref === ref && item.beforeDigest === beforeDigest && item.afterDigest === afterDigest)) registry.files.push({ ref, beforeDigest, afterDigest, privateOriginal: relative(repo, backup), reviewerVerdictPreserved: entry.name === "evaluation.json" ? true : undefined });
      changed.push(ref);
    }
  }
  await visit(root);
  for (const name of ["precision-correction.json", "controller-guard-repair.json", "derivation-repair.json"]) {
    const path = join(root, name), before = await readFile(path, "utf8"), receipt = JSON.parse(before);
    for (const entry of [...(receipt.artifacts ?? []), ...(receipt.proof ?? [])]) {
      const digest = sha(await readFile(join(root, entry.ref)));
      if (entry.digest !== digest) { entry.originalDigest ??= entry.digest; entry.digest = digest; entry.publicationNormalization = "publication-redaction.json"; }
    }
    const after = JSON.stringify(receipt, null, 2) + "\n";
    if (before !== after) await writeFile(path, after);
  }
  const nestedPath = join(root, "nested-proof-exits.json"), nestedBefore = await readFile(nestedPath, "utf8"), nested = JSON.parse(nestedBefore);
  for (const binding of [nested.capturedStage, nested.independentEvaluation]) {
    const digest = sha(await readFile(join(root, binding.ref)));
    if (binding.digest !== digest) { binding.originalDigest ??= binding.digest; binding.digest = digest; binding.publicationNormalization = "publication-redaction.json"; }
  }
  const nestedAfter = JSON.stringify(nested, null, 2) + "\n";
  if (nestedBefore !== nestedAfter) await writeFile(nestedPath, nestedAfter);
  if (JSON.stringify(registry) !== beforeRegistry || !registry.files.length) await writeFile(registryPath, JSON.stringify(registry, null, 2) + "\n");
  return { changed, originalVersions: registry.files.length };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) console.log(JSON.stringify(await redactPublication()));
