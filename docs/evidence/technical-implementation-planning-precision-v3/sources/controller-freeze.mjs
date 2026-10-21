import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const control = dirname(fileURLToPath(import.meta.url)), repo = resolve(control, "../..");
const state = JSON.parse(await readFile(join(control, "control.json"), "utf8"));
if (state.runs.length || state.status !== "fixtures-frozen") throw Error("Only unstarted fixtures can be frozen");
const sha = value => createHash("sha256").update(value).digest("hex");
const out = join(repo, "docs/evidence/technical-implementation-planning-precision-v3");
const save = async (path, value) => { await mkdir(dirname(path), { recursive: true }); await writeFile(path, JSON.stringify(value, null, 2) + "\n"); };
const reference = async relative => ({ ref: relative, digest: sha(await readFile(join(out, relative))) });
for (const run of state.schedule) run.matrix = "precision-v3";
const names = ["technical-agreement-registry.json", "technical-agreement-answers.json", "technical-agreement-starters.json", "technical-agreement-starters-stdio.json", "technical-agreement-focused.json", "technical-agreement-oracle.mjs", "TRIALS.md"];
state.fixtureDigests = {};
for (const name of names) {
  const source = join(repo, "tests/fixtures/workflow-loop", name);
  state.fixtureDigests[name] = sha(await readFile(source));
  await mkdir(join(out, "fixtures"), { recursive: true });
  await copyFile(source, join(out, "fixtures", name));
}
for (const [variant, source] of Object.entries(state.sources)) {
  for (const [relative, digest] of Object.entries(source.manifest.files)) {
    if (sha(await readFile(join(source.path, relative))) !== digest) throw Error("Source drift: " + variant + "/" + relative);
  }
  await save(join(out, "sources", variant + ".json"), { classification: "ACTUAL", ...source.manifest, sourceDigest: source.digest });
}
await save(join(out, "frozen-inputs.json"), {
  classification: "SIMULATION", revision: "exact-integer-precision-v3", frozenBeforeRuns: new Date().toISOString(),
  parent: "../technical-implementation-planning/frozen-inputs-stdio-v2.json",
  fixtureDigests: state.fixtureDigests, sourceDigests: Object.fromEntries(Object.entries(state.sources).map(([key, source]) => [key, source.digest])),
  model: state.model, effort: state.effort, client: state.client, node: process.version, order: state.schedule.map(({ id, fixture, variant, repetition }) => ({ id, fixture, variant, repetition })),
  change: "Exact JSON integer aggregate totals are a common product requirement; 9007199254740991 + 2 must emit numeric token 9007199254740993. The implementation architecture remains free.",
  decision: { classification: "ACTUAL", source: "Direct human answer in originating chat and confirmation in this chat", choice: "Exact integer JSON sum without rounding" },
  proof: { red: "Previous oracle accepted rounding", green: "Exact accepted and rounded rejected", prove: "Rounded expected-token mutation rejected; restored oracle passes" }
});
await save(join(out, "sources/comparison.json"), {
  classification: "ACTUAL", kind: "immutable-comparison-input-manifest",
  frozenInput: await reference("frozen-inputs.json"),
  sources: { baseline: await reference("sources/baseline.json"), candidate: await reference("sources/candidate.json") },
  sourceIdentities: Object.fromEntries(Object.entries(state.sources).map(([key, source]) => [key, source.digest]))
});
await writeFile(join(control, "control.json"), JSON.stringify(state, null, 2) + "\n", { mode: 0o600 });
console.log(JSON.stringify({ status: "frozen-before-runs", trials: state.schedule.length, fixtureCount: names.length }));
