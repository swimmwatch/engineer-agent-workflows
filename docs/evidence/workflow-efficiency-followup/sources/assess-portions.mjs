import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { auditPortions } from "./audit-portions.mjs";
import { observeInvocations } from "./capture.mjs";
import { evaluateWorkflowEfficiency } from "../../../../tests/lib/workflow-efficiency.mjs";

const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const [privateRoot, destination, ...ids] = process.argv.slice(2), output = resolve(destination), summaries = [];
for (const id of ids) {
  const root = join(privateRoot, "agents", id);
  const fixture = JSON.parse(await readFile(join(root, "fixture.json"), "utf8"));
  const result = JSON.parse(await readFile(join(root, "result.json"), "utf8"));
  const native = await readFile(join(root, "native.jsonl"));
  const invocations = observeInvocations(native.toString().trim().split("\n").map(JSON.parse));
  const threads = new Map();
  for (const invocation of invocations.filter(item => item.origin !== "native-child")) {
    const items = threads.get(invocation.threadId) ?? [];
    items.push(...invocation.items.filter(item => item.tool === "requirement_get" && typeof item.result?.result?.text === "string"));
    threads.set(invocation.threadId, items);
  }
  const expected = { sources: [], changes: [], triggers: [], actions: [] }, observed = { events: [] }, actors = [];
  let index = 0;
  for (const items of threads.values()) {
    const actor = `actor-${index++}`, source = `requirement-${actor}`;
    const audit = auditPortions(items, fixture.state.specification_version);
    actors.push({ actor, ...audit });
    expected.sources.push({ id: source, owner: sha(fixture.app), version: fixture.state.specification_version,
      revision: 1, selection: items[0]?.arguments?.requirement_id ?? "missing", portions: Math.max(1, items.length) });
    // Each actor uses the same canonical source identity, not an inherited receipt.
    if (index > 1) expected.sources.pop();
    const sharedSource = expected.sources[0].id;
    items.forEach((item, portion) => observed.events.push({ id: `${actor}-${portion}`, kind: "delivery", actor,
      context: actor, source: sharedSource, portion, total: expected.sources[0].portions,
      complete: item.result.result.complete, bytes: Buffer.byteLength(item.result.result.text), atMs: item.completedAtMs }));
    expected.actions.push({ id: actor, actor, context: actor, sources: [sharedSource], checks: [] });
    observed.events.push({ id: `consume-${actor}`, kind: "action", action: actor, actor, context: actor });
  }
  const artifacts = {};
  for (const [key, data] of [["trace", observed], ["outcomes", expected]]) {
    const ref = `${id}-portions-${key}.json`, bytes = JSON.stringify(data, null, 2) + "\n";
    await writeFile(join(output, ref), bytes); artifacts[key] = { ref, digest: sha(bytes) };
  }
  const findings = await evaluateWorkflowEfficiency({ root: output, ...artifacts });
  summaries.push({ id, actors, findings, artifacts, nativeSha256: sha(native),
    independentReviewer: result.reviewerTurnId ? threads.size === 2 : null,
    interrupted: result.interrupted ?? null,
    passed: actors.length > 0 && actors.every(actor => actor.complete) && findings.length === 0 &&
      (result.scenario !== "independent-reviewer" || threads.size === 2) });
}
await writeFile(join(output, "portion-results.json"), JSON.stringify(summaries, null, 2) + "\n");
console.log(JSON.stringify(summaries.map(({ id, passed, actors }) => ({ id, passed, actors }))));
