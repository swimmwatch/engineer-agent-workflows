// Qualification-only observation adapter; never executes workflow operations.
export function isRootCompletion(message, threadId) {
  return message.method === "turn/completed" && message.params?.threadId === threadId;
}

export function observeInvocations(records) {
  const requests = new Map(), turns = new Map();
  for (const { atMs, direction, message } of records) {
    if (!Number.isFinite(atMs)) throw new Error("Invalid capture timestamp");
    if (direction === "send" && message.method === "turn/start") {
      if (requests.has(message.id)) throw new Error("Duplicate invocation request");
      requests.set(message.id, { requestId: message.id, threadId: message.params?.threadId, turnId: null, invokedAtMs: atMs,
        acknowledgedAtMs: null, completedAtMs: null, status: null, items: [], issues: [] });
    }
    if (direction === "receive" && message.result?.turn?.id && requests.has(message.id)) {
      const invocation = requests.get(message.id);
      if (turns.has(message.result.turn.id)) throw new Error("Duplicate invocation identity");
      invocation.turnId = message.result.turn.id;
      invocation.acknowledgedAtMs = atMs;
      turns.set(invocation.turnId, invocation);
    }
  }
  for (const { atMs, direction, message } of records) {
    const turn = message.params?.turn;
    if (direction !== "receive" || message.method !== "turn/started" || turns.has(turn?.id)) continue;
    if (!turn?.rootTurnId || !turns.has(turn.rootTurnId)) throw new Error("Uncorrelated native child turn");
    const child = { requestId: null, threadId: message.params?.threadId, turnId: turn.id, rootTurnId: turn.rootTurnId,
      origin: "native-child", invokedAtMs: atMs, acknowledgedAtMs: atMs,
      completedAtMs: null, status: null, items: [], issues: [] };
    turns.set(turn.id, child);
    requests.set(`child:${turn.id}`, child);
  }
  const activeItems = new Map();
  for (const { atMs, direction, message } of records) {
    if (direction !== "receive") continue;
    if (message.method === "turn/completed") {
      const invocation = turns.get(message.params?.turn?.id);
      if (!invocation) throw new Error("Uncorrelated invocation completion");
      if (invocation.completedAtMs !== null) {
        invocation.issues.push("duplicate-invocation-completion");
        continue;
      }
      invocation.completedAtMs = atMs;
      invocation.status = message.params.turn.status;
    }
    if (!["item/started", "item/completed"].includes(message.method)) continue;
    const item = message.params?.item;
    if (!["mcpToolCall", "commandExecution", "fileChange", "collabAgentToolCall"].includes(item?.type)) continue;
    const invocation = turns.get(message.params.turnId);
    if (!invocation) throw new Error("Uncorrelated tool item");
    const key = JSON.stringify([invocation.turnId, item.id]);
    let observed = activeItems.get(key);
    if (!observed) {
      observed = { id: item.id, type: item.type, tool: item.tool ?? null, command: item.command ?? null,
        arguments: item.arguments ?? null, startedAtMs: null, completedAtMs: null, result: null,
        output: null, exitCode: null, changes: null };
      activeItems.set(key, observed);
      invocation.items.push(observed);
    }
    if (message.method === "item/started") {
      if (observed.startedAtMs !== null) invocation.issues.push("duplicate-item-start");
      else observed.startedAtMs = atMs;
      continue;
    }
    if (observed.completedAtMs !== null) { invocation.issues.push("duplicate-item-completion"); continue; }
    observed.completedAtMs = atMs;
    observed.output = item.aggregatedOutput ?? null;
    observed.exitCode = item.exitCode ?? null;
    observed.changes = item.changes ?? null;
    observed.result = item.result?.structuredContent ?? item.result ?? item.error ?? null;
    observed.command ??= item.command ?? null;
    if (observed.startedAtMs === null) invocation.issues.push("missing-item-start");
    else if (atMs < observed.startedAtMs || observed.startedAtMs < invocation.invokedAtMs) {
      invocation.issues.push("invalid-item-interval");
    }
  }
  for (const invocation of requests.values()) {
    if (!invocation.turnId) invocation.issues.push("unacknowledged-invocation");
    if (invocation.completedAtMs === null) invocation.issues.push("incomplete-invocation");
    if ((invocation.acknowledgedAtMs !== null && invocation.acknowledgedAtMs < invocation.invokedAtMs) ||
        (invocation.completedAtMs !== null && invocation.completedAtMs < invocation.acknowledgedAtMs)) {
      invocation.issues.push("invalid-invocation-interval");
    }
    const intervals = [];
    for (const item of invocation.items) {
      if (item.completedAtMs === null) invocation.issues.push("incomplete-item");
      if (invocation.completedAtMs !== null &&
          (item.startedAtMs > invocation.completedAtMs || item.completedAtMs > invocation.completedAtMs)) {
        invocation.issues.push("item-outside-invocation");
      }
      if (item.startedAtMs !== null && item.completedAtMs !== null && item.completedAtMs >= item.startedAtMs) {
        intervals.push([item.startedAtMs, item.completedAtMs]);
      }
    }
    intervals.sort((a, b) => a[0] - b[0]);
    invocation.toolDurationSumMs = intervals.reduce((sum, [start, end]) => sum + end - start, 0);
    let union = 0, lastEnd = -Infinity;
    for (const [start, end] of intervals) {
      union += Math.max(0, end - Math.max(start, lastEnd));
      lastEnd = Math.max(lastEnd, end);
    }
    invocation.toolIntervalUnionMs = union;
    invocation.toolOverlapMs = invocation.toolDurationSumMs - union;
  }
  return [...requests.values()];
}
