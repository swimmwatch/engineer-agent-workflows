import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { observeInvocations } from "./capture.mjs";
import { auditSafety } from "./audit-safety.mjs";
import { evaluateWorkflowEfficiency } from "../../../../tests/lib/workflow-efficiency.mjs";

const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const [privateRoot, destination, ...ids] = process.argv.slice(2), output = resolve(destination);
await mkdir(output, { recursive: true });
const summaries = [];
for (const id of ids) {
  const root = join(privateRoot, "agents", id);
  const read = async name => JSON.parse(await readFile(join(root, name), "utf8"));
  const independent = await read("result.json"), fixture = await read("fixture.json");
  try { Object.assign(independent, await read("independent-snapshot.json")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  if (fixture.protectedBefore === undefined) fixture.protectedBefore = independent.protectedExpected;
  const native = await readFile(join(root, "native.jsonl"));
  const invocations = observeInvocations(native.toString().trim().split("\n").map(JSON.parse));
  const active = invocations.find(item => independent.implementationTurnId ? item.turnId === independent.implementationTurnId : item.origin !== "native-child");
  const handoff = await readFile(join(root, "final-handoff.md"), "utf8");
  const assessment = auditSafety({ root: active, independent, fixture, handoff });
  const artifacts = {};
  for (const [key, data] of [["trace", assessment.observed], ["outcomes", assessment.expected]]) {
    const ref = `${id}-safety-${key}.json`, bytes = JSON.stringify(data, null, 2) + "\n";
    await writeFile(join(output, ref), bytes); artifacts[key] = { ref, digest: sha(bytes) };
  }
  const findings = await evaluateWorkflowEfficiency({ root: output, ...artifacts });
  const summary = { id, passed: assessment.passed && findings.length === 0, conditions: assessment.conditions,
    findings, artifacts, nativeSha256: sha(native), handoffSha256: sha(handoff), handoffWords: independent.handoffWords };
  if (independent.scenario.startsWith("product-")) {
    const observer = await read("observer.json");
    summary.observer = { actor: observer.actor, status: observer.result.status, state: observer.result.task_state,
      issueCodes: observer.result.issues.map(item => item.code) };
    if (independent.scenario !== "product-conflict") {
      const wire = await readFile(join(root, "transport.jsonl"));
      const deliveries = wire.toString().trim().split("\n").map(JSON.parse);
      const dropped = deliveries.filter(item => item.dropped);
      summary.transport = { sha256: sha(wire), lostReplies: dropped.length, target: dropped[0]?.tool };
      const payload = line => JSON.parse(line).result?.structuredContent;
      if (independent.scenario === "product-lost-ack") {
        const starts = deliveries.filter(item => item.tool === "task_packet_start").map(item => payload(item.originalWire));
        summary.transport.exactOperationReplayed = starts.length === 2 && starts[0]?.result.operation_ref === starts[1]?.result.operation_ref && starts[1]?.replayed === true;
        summary.passed &&= summary.transport.exactOperationReplayed;
      } else {
        summary.transport.successfulReadAfterLoss = deliveries.some(item => item.tool === "product_sources_get_batch" &&
          !item.dropped && payload(item.originalWire)?.result?.items?.length > 0);
        summary.passed &&= summary.transport.successfulReadAfterLoss;
      }
      summary.passed &&= dropped.length === 1 && observer.result.status === "pass";
    } else summary.passed &&= observer.result.status === "fail" && observer.result.issues.some(item => item.code === "SOURCE_CHANGED");
  }
  summaries.push(summary);
}
await writeFile(join(output, "safety-results.json"), JSON.stringify(summaries, null, 2) + "\n");
console.log(JSON.stringify(summaries.map(({ id, passed, conditions }) => ({ id, passed, conditions }))));
