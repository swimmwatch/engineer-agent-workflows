import { createHash } from "node:crypto";

const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const owners = ["specification_check_state", "planning_packet_check"];
const validInterval = (item, invocation) => Number.isFinite(item.startedAtMs) && Number.isFinite(item.completedAtMs) &&
  item.startedAtMs >= invocation.invokedAtMs && item.completedAtMs >= item.startedAtMs &&
  item.completedAtMs <= invocation.completedAtMs;
// Bounded qualification fixtures use these runners and restoration commands.
// Read-back (git diff, cat, wc) and checklist/handoff writes are completion bookkeeping.
// Exact reviewed read-only snapshot from retained-candidate-10: file hashes,
// symlink targets and modes printed to stdout. Any changed script is unclassified.
const readbackCommands = new Set(["b92578aeca45cd0374b7710b9a18372c996bc1592ce3a2585b66b4249ab6285c"]);
const localWork = item => item.type === "commandExecution" &&
  !readbackCommands.has(createHash("sha256").update(item.command ?? "").digest("hex")) &&
  /\b(?:node|npm|npx|python3?|perl|ruby|cp|mv|rm|tee|touch|truncate)\b|\bsed\s+-i\b|>\s*["']?(?:\.\/)?(?:src|test)\//.test(item.command ?? "");

// Native tool returns precede provider compression. They are not model receipts.
// Keep the missing delivery visible to evaluateWorkflowEfficiency instead of
// manufacturing a complete source event from stdout or a successful exit code.
export function auditStartup({ invocations, fixture, sources, independent, delivery }) {
  const root = invocations.find(invocation => independent.implementationTurnId
    ? invocation.turnId === independent.implementationTurnId : invocation.origin !== "native-child");
  if (!root) throw new Error("Missing root invocation");
  const actor = "root", context = "fresh", events = [];
  const captureValid = root.issues?.length === 0 && Number.isFinite(root.invokedAtMs) &&
    Number.isFinite(root.completedAtMs) && root.completedAtMs >= root.invokedAtMs &&
    root.items.every(item => validInterval(item, root));
  events.push({ id: "capture-integrity", actor, context, kind: "prerequisite", name: "capture-integrity",
    result: captureValid ? "pass" : "fail", atMs: root.invokedAtMs });
  if (delivery?.passthroughVerified === true) {
    const sourceItems = delivery.retained === true
      ? invocations.filter(invocation => invocation.origin !== "native-child" && invocation.threadId === root.threadId &&
        invocation.invokedAtMs <= root.invokedAtMs &&
        !(invocation.issues ?? []).some(issue => issue !== "incomplete-invocation" && issue !== "incomplete-item"))
        .flatMap(invocation => invocation.items.filter(item => validInterval(item, invocation))) : root.items;
    for (const source of sources) {
      const text = delivery.texts[source.id];
      if (typeof text !== "string" || text.length === 0) continue;
      const attached = source.id === delivery.skillAttachment && delivery.attachmentVerified === true;
      if (attached) events.push({ id: "skill-attachment", actor, context,
        kind: "delivery", source: source.id, portion: 0, total: 1, complete: true,
        bytes: Buffer.byteLength(text), atMs: root.invokedAtMs, evidence: "native-skill-attachment" });
      for (const item of sourceItems) {
        // A new explicit invocation injects its skill again. Prior-turn tool reads
        // are preparation costs, not a redundant read chosen by this invocation.
        if (attached && !root.items.includes(item)) continue;
        if (item.type !== "commandExecution" || item.completedAtMs === null ||
            typeof item.output !== "string" || !item.output.includes(text)) continue;
        events.push({ id: `delivery-${source.id}-${item.id}`, actor, context, kind: "delivery",
          source: source.id, portion: 0, total: 1, complete: true,
          bytes: Buffer.byteLength(text), atMs: item.completedAtMs, evidence: "exact-whole-output-without-provider-transform" });
      }
    }
  }
  const edits = root.items.filter(item => item.type === "fileChange" && item.startedAtMs !== null &&
    item.changes?.some(change => /(?:^|\/)(src|test)\//.test(change.path)));
  const firstEdit = edits.length ? Math.min(...edits.map(item => item.startedAtMs)) : null;
  const work = [...edits, ...root.items.filter(localWork)];
  const completionBoundary = work.length ? Math.max(...work.map(item =>
    Number.isFinite(item.completedAtMs) ? item.completedAtMs : Infinity)) : null;
  const input = digest({ state: fixture.state, agreement: fixture.agreement });
  const checks = phase => owners.map(owner => ({ purpose: `${phase}:readiness`, owner, input }));
  const gates = [];
  for (const item of root.items) {
    if (!owners.includes(item.tool) || item.completedAtMs === null || item.startedAtMs === null) continue;
    const result = item.result?.result, args = item.arguments;
    const pinsMatch = result && ["source_version", "specification_version", "review_ref"].every(key =>
      result[key] === fixture.state[key]);
    const agreement = fixture.agreement;
    const exactAgreement = agreement && args?.agreement_ref?.id === agreement.agreement_ref.id &&
      args?.agreement_ref?.revision === agreement.agreement_ref.revision &&
      args?.expected_proposal_digest === agreement.proposal_digest && args?.packet_id === (fixture.packetId ?? "p1");
    const phase = firstEdit === null || item.completedAtMs <= firstEdit ? "entry" : "completion";
    const pass = captureValid && pinsMatch && (item.tool === "specification_check_state"
      ? result.status === "pass" && args?.expected_source_version === fixture.state.source_version
      : result.status === "ready" && exactAgreement);
    const event = { id: item.id, actor, context, kind: "validation", purpose: `${phase}:readiness`,
      owner: item.tool, input, result: pass ? "pass" : "fail", atMs: item.completedAtMs };
    events.push(event); gates.push({ ...event, requestedAtMs: item.startedAtMs });
  }
  const orderCheck = { purpose: "completion:order", owner: "capture-adapter", input };
  const prematureGates = gates.filter(gate => gate.purpose === "completion:readiness" &&
    (completionBoundary === null || gate.requestedAtMs < completionBoundary));
  if (firstEdit !== null) events.push({ id: "first-edit", kind: "action", action: "edit", actor, context, atMs: firstEdit });
  if (Number.isFinite(root.completedAtMs)) events.push({ id: "completion-order", kind: "validation", actor, context,
    ...orderCheck, result: prematureGates.length === 0 ? "pass" : "fail", atMs: root.completedAtMs });
  if (root.completedAtMs !== null && !independent.error && independent.localExit === 0 && independent.oracleExit === 0 &&
      independent.requiredExit === 0 && independent.packetCompleted === true) {
    events.push({ id: "completed", kind: "action", action: "complete", actor, context, atMs: root.completedAtMs });
  }
  events.sort((a, b) => a.atMs - b.atMs);
  const ready = owners.map(owner => gates.find(gate => gate.owner === owner && gate.purpose === "entry:readiness" && gate.result === "pass"));
  const referenceItems = root.items.filter(item => item.type === "commandExecution" &&
    /(?:references\/[^\s'"`]+\.md|\/SKILL\.md)/.test(item.command ?? ""));
  const references = referenceItems.map(item => ({
    item: item.id, requestedAtMs: item.startedAtMs, returnedAtMs: item.completedAtMs,
    paths: [...new Set((item.command.match(/(?:references\/[^\s'"`]+\.md|\/SKILL\.md)/g) ?? []))],
    nativeOutputBytes: typeof item.output === "string" ? Buffer.byteLength(item.output) : null,
  }));
  const first = predicate => root.items.filter(predicate).map(item => item.startedAtMs)
    .filter(value => value !== null).sort((a, b) => a - b)[0] ?? null;
  return {
    observed: { events },
    expected: { sources, triggers: [], changes: [], prerequisites: ["capture-integrity"], actions: [
      { id: "edit", actor, context, sources: sources.map(source => source.id), checks: checks("entry") },
      { id: "complete", actor, context, sources: sources.map(source => source.id), checks: [...checks("completion"), orderCheck] },
    ] },
    metrics: {
      invokedAtMs: root.invokedAtMs, completedAtMs: root.completedAtMs,
      entryReadyAtMs: ready.every(Boolean) ? Math.max(...ready.map(gate => gate.atMs)) : null,
      firstEditAtMs: firstEdit, completionBoundaryAtMs: Number.isFinite(completionBoundary) ? completionBoundary : null,
      captureValid, prematureCompletionGates: prematureGates.map(gate => gate.id), gates, references,
      firstExplorationAtMs: first(item => item.type === "commandExecution" &&
        /(?:cat|sed|nl|rg|git diff).*\b(?:src|test)\//s.test(item.command ?? "")),
      firstTestAtMs: first(item => item.type === "commandExecution" && /node (?:--test|test\/)/.test(item.command ?? "")),
      nativeStartAtMs: first(item => item.tool === "task_packet_start"),
      toolDurationSumMs: root.toolDurationSumMs ?? null,
      toolIntervalUnionMs: root.toolIntervalUnionMs ?? null,
      toolOverlapMs: root.toolOverlapMs ?? null,
      captureIssues: root.issues,
      modelReceipt: delivery?.passthroughVerified === true
        ? "controlled passthrough: exact outputs and native skill attachment"
        : "unavailable: native returns precede provider compression",
      humanWaitMs: null,
      childActors: invocations.filter(invocation => invocation.origin === "native-child").length,
    },
  };
}
