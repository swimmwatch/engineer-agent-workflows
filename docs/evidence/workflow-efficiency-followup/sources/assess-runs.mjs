import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { observeInvocations } from "./capture.mjs";
import { auditStartup } from "./audit-startup.mjs";
import { evaluateWorkflowEfficiency } from "../../../../tests/lib/workflow-efficiency.mjs";

const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const [privateRoot, destination] = process.argv.slice(2);
const output = resolve(destination); await mkdir(output, { recursive: true });
const profileSha = sha(await readFile(join(privateRoot, "passthrough-codex-home/config.toml")));
const proxy = JSON.parse(await readFile(join(privateRoot, "proxy-passthrough-profile.json"), "utf8"));
if (proxy.optimize !== false || proxy.memory !== false || proxy.learn !== false) throw new Error("Unverified delivery profile");
const attachment = JSON.parse(await readFile(join(privateRoot, "attachment-delivery-evidence.json"), "utf8"));
if (!attachment.deliveries.some(item => item.fullText === true)) throw new Error("Unverified native skill injection");
const summaries = [];
for (const id of (await readdir(join(privateRoot, "agents"))).sort()) {
  const root = join(privateRoot, "agents", id);
  let result;
  try { result = JSON.parse(await readFile(join(root, "result.json"), "utf8")); }
  catch (error) { if (error.code === "ENOENT") { summaries.push({ id, status: "no-final-result" }); continue; } throw error; }
  const attempt = JSON.parse(await readFile(join(root, "attempt.json"), "utf8"));
  let snapshot = {};
  try { snapshot = JSON.parse(await readFile(join(root, "independent-snapshot.json"), "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const independent = { ...result, ...snapshot };
  const fixture = JSON.parse(await readFile(join(root, "fixture.json"), "utf8"));
  const native = await readFile(join(root, "native.jsonl"));
  const records = native.toString("utf8").trim().split("\n").map(line => JSON.parse(line));
  const invocations = observeInvocations(records);
  const active = invocations.find(item => result.implementationTurnId ? item.turnId === result.implementationTurnId : item.origin !== "native-child");
  const summary = { id, scenario: result.scenario, variant: result.variant, status: result.status,
    errorPresent: result.error !== null, nativeSha256: sha(native), model: result.model, effort: result.effort,
    profileSha256: attempt.profileSha256 ?? null, sourceName: attempt.sourceName ?? null,
    localExit: result.localExit, oracleExit: result.oracleExit, questions: result.questions,
    codeUnchanged: result.beforeCode === result.afterCode,
    elapsedMs: active?.completedAtMs === null ? null : active?.completedAtMs - active?.invokedAtMs,
    captureIssues: invocations.flatMap(item => item.issues),
    handoffWords: result.handoffWords ?? null, packetCompleted: result.packetCompleted ?? null,
  };
  if (attempt.profileSha256 === profileSha && ["normal", "product", "retained", "lost-text", "resume"].includes(result.scenario)) {
    const source = join(privateRoot, "sources", attempt.sourceName);
    const skill = "plugins/codex/engineer-agent-workflows/skills/incremental-implementation";
    const paths = {
      entry: `${skill}/SKILL.md`,
      access: `${skill}/shared/references/${result.variant === "candidate" ? "workflow-state-access" : "yaml-contracts"}.md`,
      principles: `${skill}/shared/references/engineering-principles.md`,
      discipline: `${skill}/shared/references/test-discipline.md`,
      execution: result.variant === "candidate" ? `${skill}/shared/references/implementation-context.md`
        : "plugins/codex/engineer-agent-workflows/skills/planning-and-task-breakdown/references/task-packets.md",
      ...(result.scenario === "product" && result.variant === "baseline" ? { product: `${skill}/shared/references/product-workflow.md` } : {}),
    };
    const sources = [], texts = {};
    for (const [name, path] of Object.entries(paths)) {
      const bytes = await readFile(join(source, path)); texts[name] = bytes.toString("utf8");
      sources.push({ id: name, owner: path, version: sha(bytes), revision: 1, selection: "whole", portions: 1 });
    }
    const retained = ["retained", "resume"].includes(result.scenario);
    const relevant = retained ? invocations.filter(item => item.threadId === active.threadId && item.origin !== "native-child") : [active];
    const attached = relevant.some(invocation => {
      const request = records.find(record => record.direction === "send" && record.message.id === invocation.requestId);
      return request?.message.params.input.some(input => input.type === "skill" && input.path === join(source, paths.entry));
    });
    const assessed = auditStartup({ invocations, fixture, sources, independent,
      delivery: { passthroughVerified: true, texts, skillAttachment: attached ? "entry" : null,
        attachmentVerified: true, retained } });
    const trace = `${id}-observed.json`, outcomes = `${id}-outcomes.json`;
    const observedBytes = JSON.stringify(assessed.observed, null, 2) + "\n", expectedBytes = JSON.stringify(assessed.expected, null, 2) + "\n";
    await writeFile(join(output, trace), observedBytes); await writeFile(join(output, outcomes), expectedBytes);
    const refs = { trace: { ref: trace, digest: sha(observedBytes) }, outcomes: { ref: outcomes, digest: sha(expectedBytes) } };
    summary.evaluatorFindings = await evaluateWorkflowEfficiency({ root: output, ...refs });
    summary.artifacts = refs; summary.metrics = assessed.metrics;
  }
  summaries.push(summary);
}
await writeFile(join(output, "agent-results.json"), JSON.stringify(summaries, null, 2) + "\n");
console.log(JSON.stringify(summaries.map(({ id, status, oracleExit, evaluatorFindings }) => ({ id, status, oracleExit,
  findings: evaluatorFindings?.map(item => item.code) }))));
