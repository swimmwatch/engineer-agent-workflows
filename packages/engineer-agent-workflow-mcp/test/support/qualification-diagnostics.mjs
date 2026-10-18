import { performance } from "node:perf_hooks";

// Test-only identifiers; never accept request bodies, contexts, paths, or error text.
const operations = new Set(["decisions_catalog", "decisions_overview", "decisions_search", "decisions_get", "connect", "close", "idea_define_problem", "list_tools", "prd_define_actor", "prd_define_goal", "product_amendment_activate", "product_amendment_impact", "product_amendment_prepare", "product_artifact_draft", "product_bind_workspace", "product_candidate_check", "product_candidate_record_get", "product_capabilities", "product_context_next", "product_context_prepare", "product_document_accept_edits", "product_document_begin_edit", "product_document_create_subject", "product_document_inspect_edits", "product_document_list", "product_element_get", "product_initialize", "product_list", "product_open", "product_question_answer", "product_question_prepare", "product_record_instruction", "product_record_observation", "product_record_research", "product_review_complete", "product_review_consistency_get", "product_review_consistency_record", "product_review_get", "product_review_record", "product_review_start", "product_review_status", "product_safety_block", "product_scope_confirm", "product_scope_propose", "product_session_call", "product_session_next", "product_session_open", "product_session_resume", "product_session_status", "roadmap_define_stage", "roadmap_define_task", "specification_check_state", "specification_open", "specification_review_complete", "specification_review_get", "specification_review_record", "specification_review_start", "task_inputs_check", "task_specification_reserve", "technical_define_technology", "workflow_runtime_info"]);
const actors = new Set(["packed-smoke", "product-author-qualification", "product-reviewer-qualification", "product-author-recovery"]);
const phases = new Set(["npm-pack", "inventory", "smoke-connect", "smoke-calls", "reliability", "remediation", "smoke-teardown"]);
const safe = (value, allowed) => allowed.has(value) ? value : "redacted";

export function createQualificationDiagnostics(t) {
  const started = performance.now();
  const pending = new Map();
  let phase = null, completed = 0, review = null, phaseStartedCompleted = 0;
  const elapsed = (since) => Math.max(0, Math.round(performance.now() - since));
  function publish(event) {
    const value = { qualification: "packed", event, phase, completed, pendingCount: pending.size, phaseCompleted: completed - phaseStartedCompleted, review, elapsedMs: elapsed(started),
      pending: [...pending.values()].slice(0, 4).map(({ started: since, ...operation }) => ({ ...operation, elapsedMs: elapsed(since) })) };
    // Diagnostic delivery must never change the request result or teardown outcome.
    try { t.diagnostic(JSON.stringify(value)); } catch { /* The test may already be closed. */ }
  }
  const aborted = () => publish("aborted");
  t.signal.addEventListener("abort", aborted, { once: true });
  t.after(() => { t.signal.removeEventListener("abort", aborted); publish("test-teardown"); });
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
