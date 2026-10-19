import { performance } from "node:perf_hooks";

// Test-only identifiers; never accept request bodies, contexts, paths, or error text.
const operations = new Set(["decisions_catalog", "decisions_overview", "decisions_search", "decisions_get", "connect", "close", "idea_define_problem", "list_tools", "prd_define_actor", "prd_define_goal", "product_amendment_activate", "product_amendment_impact", "product_amendment_prepare", "product_artifact_draft", "product_bind_workspace", "product_candidate_check", "product_candidate_record_get", "product_capabilities", "product_context_next", "product_context_prepare", "product_document_accept_edits", "product_document_begin_edit", "product_document_create_subject", "product_document_inspect_edits", "product_document_list", "product_element_get", "product_initialize", "product_list", "product_open", "product_question_answer", "product_question_prepare", "product_record_instruction", "product_record_observation", "product_record_research", "product_review_complete", "product_review_consistency_get", "product_review_consistency_record", "product_review_get", "product_review_record", "product_review_start", "product_review_status", "product_safety_block", "product_scope_confirm", "product_scope_propose", "product_session_call", "product_session_next", "product_session_open", "product_session_resume", "product_session_status", "roadmap_define_stage", "roadmap_define_task", "specification_check_state", "specification_open", "specification_review_complete", "specification_review_get", "specification_review_record", "specification_review_start", "task_inputs_check", "task_specification_reserve", "technical_define_technology", "workflow_runtime_info"]);
const actors = new Set(["packed-smoke", "product-author-qualification", "product-reviewer-qualification", "product-author-recovery"]);
const phases = new Set(["npm-pack", "inventory", "smoke-connect", "smoke-calls", "reliability", "remediation", "smoke-teardown"]);
const qualifications = new Set(["packed", "public"]);
const safe = (value, allowed) => allowed.has(value) ? value : "redacted";

export function createQualificationDiagnostics(t, qualification = "packed") {
  const started = performance.now();
  const pending = new Map();
  let phase = null, completed = 0, review = null, phaseStartedCompleted = 0;
  const elapsed = (since) => Math.max(0, Math.round(performance.now() - since));
  function publish(event) {
    const value = { qualification: safe(qualification, qualifications), event, phase, completed, pendingCount: pending.size, phaseCompleted: completed - phaseStartedCompleted, review, elapsedMs: elapsed(started),
      pending: [...pending.values()].slice(0, 4).map(({ started: since, ...operation }) => ({ ...operation, elapsedMs: elapsed(since) })) };
    // Diagnostic delivery must never change the request result or teardown outcome.
    try { t.diagnostic(JSON.stringify(value)); } catch { /* The test may already be closed. */ }
  }
  const aborted = () => publish("aborted");
  t.signal.addEventListener("abort", aborted, { once: true });
  t.after(() => { t.signal.removeEventListener("abort", aborted); publish("test-teardown"); }, { resource: "diagnostics", boundary: "scope-disposer" });
  return {
    async phase(name, run) {
      phase = safe(name, phases);
      phaseStartedCompleted = completed;
      review = null;
      publish("phase-start");
      try {
        const result = await run();
        publish("phase-end");
        return result;
      } catch (error) {
        publish("phase-failed");
        throw error;
      } finally { phase = null; }
    },
    observe({ event, actor, tool, scenario, itemIndex, totalItems }) {
      if (event === "review-item") {
        if (Number.isSafeInteger(itemIndex) && Number.isSafeInteger(totalItems) &&
            itemIndex >= 0 && itemIndex < totalItems && totalItems <= 10_000) {
          review = { itemIndex, totalItems };
          if (itemIndex % 20 === 0 || itemIndex + 1 === totalItems) publish("review-checkpoint");
        }
        return;
      }
      const operation = { actor: safe(actor, actors), tool: safe(tool, operations),
        scenario: scenario === undefined ? null : safe(scenario, operations) };
      const key = JSON.stringify(operation);
      if (event === "start") {
        pending.set(key, { ...operation, started: performance.now() });
        if (tool === "close") publish("cleanup-start");
      }
      else if (event === "end" && pending.delete(key)) {
        completed += 1;
        if (tool === "close") publish("cleanup-end");
        if (completed % 100 === 0) publish("checkpoint");
      }
    },
  };
}

const resources = new Set(["product-workflow", "actor", "temporary-root", "packed-root", "packed-smoke", "diagnostics"]);
const boundaries = new Set(["scope-disposer", "transport-close", "client-close", "pid-observation", "child-exit-check", "filesystem-remove"]);
const nativeCodes = new Set(["EACCES", "EPERM", "EBUSY", "ENOTEMPTY", "ENOENT", "ESRCH"]);
const countLimit = 10_000;

function ownValue(value, key) {
  try { return Object.getOwnPropertyDescriptor(value, key)?.value; }
  catch { return undefined; }
}

function cleanupError(error, depth, seen, budget) {
  const result = { kind: "non-error", code: "other", truncated: false };
  if (budget.remaining-- <= 0) return { ...result, truncated: true };
  try {
    result.kind = error instanceof AggregateError ? "aggregate" : error instanceof Error ? "error" : "non-error";
    const code = ownValue(error, "code");
    result.code = nativeCodes.has(code) ? code : "other";
    if (result.kind !== "aggregate") return result;
    const children = ownValue(error, "errors");
    const length = Array.isArray(children) ? ownValue(children, "length") : undefined;
    if (!Number.isSafeInteger(length) || length < 0) return { ...result, truncated: true };
    result.count = Math.min(length, countLimit);
    result.children = [];
    if (seen.has(error) || depth >= 4) return { ...result, truncated: true };
    seen.add(error);
    for (let index = 0; index < Math.min(length, 8) && budget.remaining > 0; index += 1) {
      result.children.push(cleanupError(ownValue(children, String(index)), depth + 1, seen, budget));
    }
    result.truncated = result.children.length < length || result.children.some(child => child.truncated);
    seen.delete(error);
  } catch { result.truncated = true; }
  return result;
}

// Only owner-supplied finite metadata and safe native codes cross the TAP boundary.
export function reportCleanupFailure(t, identity, error, index = 0, truncated = false) {
  try {
    const event = { event: "cleanup-failed", resource: safe(ownValue(identity, "resource"), resources),
      actor: safe(ownValue(identity, "actor"), actors), boundary: safe(ownValue(identity, "boundary"), boundaries),
      index: Number.isSafeInteger(index) && index >= 0 ? Math.min(index, countLimit) : 0,
      error: cleanupError(error, 0, new Set(), { remaining: 64 }), truncated: truncated === true };
    t.diagnostic?.(JSON.stringify(event));
  } catch { /* Diagnostics never change cleanup results or later disposal. */ }
}
