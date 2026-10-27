import { realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

const filesystemTools = new Set(["read", "read_image", "write", "edit"]);

function contained(root, target) {
  const path = relative(root, target);
  return path === "" || (!isAbsolute(path) && path !== ".." && !path.startsWith(".." + sep));
}

function managedPath(path) {
  const portable = path.split(sep).join("/");
  return /(?:^|\/)docs\/specs\/[^/]+\/(?:manifest|decisions)\.yaml(?:$|\.)/u.test(portable)
    || /(?:^|\/)docs\/specs\/[^/]+\/\.workflow(?:\/|$)/u.test(portable)
    || /(?:^|\/)design\/system\/catalog\.yaml(?:$|\.)/u.test(portable)
    || /(?:^|\/)design\/specs\/[^/]+\/experience\.yaml(?:$|\.)/u.test(portable);
}

function denied(reason) { return { allowed: false, reason }; }

function directory(path) {
  if (typeof path !== "string" || !isAbsolute(path)) throw new Error("INVALID_REVIEW_ACCESS_POLICY");
  const actual = realpathSync(path);
  if (!statSync(actual).isDirectory()) throw new Error("INVALID_REVIEW_ACCESS_POLICY");
  return actual;
}

function readArguments(value) {
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return null; }
  }
  return value;
}

/** Per-runtime native-read boundary, not an operating-system or arbitrary-code sandbox. */
export function createReviewAccessPolicy({ project, specification, referenceRoots = [] }) {
  if (typeof specification !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/u.test(specification)
    || !Array.isArray(referenceRoots) || referenceRoots.length > 8) throw new Error("INVALID_REVIEW_ACCESS_POLICY");
  const cwd = directory(project);
  const roots = [cwd, ...referenceRoots.map(directory)];

  function inspect(name, value) {
    if (!filesystemTools.has(name)) return null;
    if (name !== "read") return denied("REVIEW_FILESYSTEM_CAPABILITY_DENIED");
    const args = readArguments(value);
    const requested = args?.file_path;
    if (typeof requested !== "string" || !requested || requested.includes("\0") || /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//u.test(requested)) {
      return denied("INVALID_REVIEW_FILE_INPUT");
    }
    // The Host preserves physical symlink/.. semantics. Never normalize away
    // parent components before resolving the real target through the filesystem.
    const physical = isAbsolute(requested) ? requested : cwd + sep + requested;
    const lexical = resolve(cwd, requested);
    if (managedPath(lexical)) return denied("MCP_MANAGED_FILE_ACCESS_DENIED");
    let target;
    try {
      target = realpathSync.native(physical);
      if (!statSync(target).isFile()) return denied("INVALID_REVIEW_FILE_INPUT");
    } catch { return denied("INVALID_REVIEW_FILE_INPUT"); }
    if (managedPath(target)) return denied("MCP_MANAGED_FILE_ACCESS_DENIED");
    function owns(root) { return contained(root, target); }
    if (!roots.some(owns)) return denied("REVIEW_FILE_OUTSIDE_ALLOWED_ROOTS");
    return { allowed: true, reason: null };
  }
  return Object.freeze({ inspect });
}

/** Use the pinned Host's scoped monotonic guard, after extensible pre-execute policy. */
export function installReviewAccessGuard(agent, policy, onDecision = () => {}) {
  function guard(execution) {
    const decision = policy.inspect(execution.name, execution.arguments);
    if (!decision) return undefined;
    onDecision({ actor: agent.id, callId: execution.callId, tool: execution.name, ...decision });
    return decision.allowed ? undefined : decision.reason;
  }
  return agent.ctx.tools.guard(guard);
}

/** Observe original Host events independently of whether an enforcement guard ran. */
export function createReviewAccessAudit(policy, { requireGuards = false } = {}) {
  const pending = new Map();
  const observed = new Set();
  const decisions = new Set();
  let calls = 0;
  let settled = 0;
  let forbiddenSuccesses = 0;
  let deniedProtectedAttempts = 0;
  let malformed = 0;

  function key(actor, callId) { return JSON.stringify([actor, callId]); }

  function recordDecision(decision) {
    const identity = key(decision.actor, decision.callId);
    if (decisions.has(identity)) malformed += 1;
    decisions.add(identity);
  }

  function observe(session, event) {
    if (event.type === "tool/call") {
      const data = event.data;
      const decision = policy.inspect(data.name, data.arguments);
      if (!decision) return;
      const identity = key(session.id, data.callId);
      if (observed.has(identity) || typeof session.id !== "string" || typeof data.callId !== "string") malformed += 1;
      calls += 1;
      observed.add(identity);
      pending.set(identity, decision);
    } else if (event.type === "tool/result") {
      const message = event.data.message;
      const identity = key(session.id, message.toolCallId);
      const decision = pending.get(identity);
      if (!decision) return;
      if (message.isError !== true && message.isError !== false) { malformed += 1; return; }
      pending.delete(identity);
      settled += 1;
      if (!decision.allowed && message.isError === false) forbiddenSuccesses += 1;
      if (!decision.allowed && message.isError === true) deniedProtectedAttempts += 1;
    }
  }

  function summary() {
    function guarded(identity) { return decisions.has(identity); }
    const guardsMatch = decisions.size === observed.size && [...observed].every(guarded);
    const complete = pending.size === 0 && !malformed && (!requireGuards || guardsMatch);
    return { status: forbiddenSuccesses ? "fail" : complete ? "pass" : "incomplete",
      filesystem_calls: calls, settled_filesystem_calls: settled, pending_filesystem_calls: pending.size,
      forbidden_successes: forbiddenSuccesses, denied_protected_attempts: deniedProtectedAttempts,
      guard_checks: decisions.size, malformed_events: malformed };
  }
  return Object.freeze({ observe, recordDecision, summary });
}
