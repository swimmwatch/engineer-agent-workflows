import assert from "node:assert/strict";

const caseNames = new Set(["sequential-omission", "native-omission", "native-clean", "native-paraphrase", "native-conflict"]);
const outcomes = new Set(["pending", "reviewed", "gaps", "stale"]);

function numeric(value) { return value === null || (Number.isFinite(value) && value >= 0); }

export function reviewOutcome(status, expected, failure = false, requiredConsistency) {
  if (failure || !["reviewed", "gaps"].includes(status.coverage_status)) return "incomplete";
  if (status.recorded_items !== status.total_items || status.consistency_status === "pending") return "incomplete";
  if (expected === "reviewed" && status.consistency_status !== "consistent") return "incomplete";
  if (requiredConsistency && status.consistency_status !== requiredConsistency) return "fail";
  return status.coverage_status === expected ? "pass" : "fail";
}

function validOracle(oracle, kind) {
  if (!oracle || oracle.kind !== kind || oracle.requirement_id !== "CLI-001"
    || !Number.isSafeInteger(oracle.detailed_items) || oracle.detailed_items < 2
    || !/^[a-f0-9]{64}$/u.test(oracle.spec_sha256 ?? "") || !/^[a-f0-9]{64}$/u.test(oracle.source_sha256 ?? "")) return false;
  for (const field of ["required_finding_item_indices", "permitted_finding_item_indices"]) {
    const indices = oracle[field];
    if (!Array.isArray(indices) || new Set(indices).size !== indices.length
      || indices.some(function invalid(index) { return !Number.isSafeInteger(index) || index < 0 || index >= oracle.detailed_items; })) return false;
  }
  return oracle.required_finding_item_indices.length === (kind === "empty-input-rejection-v2" ? 2 : 0)
    && oracle.required_finding_item_indices.every(function permitted(index) { return oracle.permitted_finding_item_indices.includes(index); });
}

function finding(item) { return ["gap", "conflict"].includes(item.verdict); }

function witnessStatus(item, requirement, expected, requireLink = true) {
  if (requireLink && (!Array.isArray(item.evidence_requirement_ids) || !item.evidence_requirement_ids.includes(requirement))) return "rejected";
  if (typeof item.counterexample !== "string" || Buffer.byteLength(item.counterexample, "utf8") > 4096) return "unverified";
  let witness;
  try { witness = JSON.parse(item.counterexample); } catch { return "unverified"; }
  // This executable witness belongs only to the fixed synthetic contract. Free
  // prose, keywords and matching IDs do not establish natural-language truth.
  try { assert.deepEqual(witness, expected); return "verified"; }
  catch { return "rejected"; }
}

function outcome(status, reason, matched = []) { return { status, reason, matched_item_indices: matched }; }

function detailedResultsFailure(items, oracle) {
  if (!Array.isArray(items)) return outcome("unverified", "DETAILED_RESULTS_INCOMPLETE");
  const byIndex = new Map();
  for (const item of items) {
    if (!item || !Number.isSafeInteger(item.item_index) || item.item_index < 0 || item.item_index >= oracle.detailed_items
      || byIndex.has(item.item_index) || !["covered", "gap", "conflict", "not_applicable"].includes(item.verdict)) {
      return outcome("rejected", "FOREIGN_OR_DUPLICATE_RESULT");
    }
    byIndex.set(item.item_index, item);
  }
  if (byIndex.size !== oracle.detailed_items) return outcome("unverified", "DETAILED_RESULTS_INCOMPLETE");
  return null;
}

/** Assess all actual saved detailed results against an observer-private fixture oracle. */
export function assessOmissionEvidence(items, oracle) {
  if (!validOracle(oracle, "empty-input-rejection-v2")) return outcome("unverified", "ORACLE_UNAVAILABLE");
  const failure = detailedResultsFailure(items, oracle);
  if (failure) return failure;
  const expected = { operation: oracle.requirement_id, input: { value: "" },
    permitted_by_spec: { status: "ok", value: "" }, required_by_source: { status: "error", code: "EMPTY_VALUE" } };
  const matched = [];
  for (const item of items) {
    if (!finding(item)) continue;
    if (!oracle.permitted_finding_item_indices.includes(item.item_index)) return outcome("rejected", "UNEXPECTED_FINDING_ITEM");
    const status = witnessStatus(item, oracle.requirement_id, expected);
    if (status !== "verified") return outcome(status, status === "unverified" ? "MACHINE_WITNESS_REQUIRED" : "COUNTEREXAMPLE_DOES_NOT_WITNESS_OMISSION");
    matched.push(item.item_index);
  }
  if (!oracle.required_finding_item_indices.every(function required(index) { return matched.includes(index); })) {
    return outcome("rejected", "EXPECTED_FINDING_MISSING");
  }
  return outcome("verified", "CONCRETE_OMISSION_WITNESS", matched.sort(function ascending(left, right) { return left - right; }));
}

export function omissionEvidence(items, oracle) {
  return assessOmissionEvidence(items, oracle).status === "verified";
}

/** A conflict label alone does not identify the seeded incompatible response clauses. */
export function assessConflictEvidence(items, savedConsistency, oracle) {
  if (!validOracle(oracle, "inconsistent-response-v1")) return outcome("unverified", "ORACLE_UNAVAILABLE");
  const failure = detailedResultsFailure(items, oracle);
  if (failure) return failure;
  if (!savedConsistency) return outcome("unverified", "FINAL_RESULT_NOT_SAVED");
  if (savedConsistency.verdict !== "conflict") return outcome("rejected", "FINAL_CONFLICT_MISSING");
  const expected = { operation: oracle.requirement_id, input: { value: "ready" },
    permitted_by_spec: { status: "ok", value: "other" }, required_by_source: { status: "ok", value: "ready" } };
  const finalStatus = witnessStatus(savedConsistency, oracle.requirement_id, expected, false);
  if (finalStatus !== "verified") return outcome(finalStatus, "FINAL_CONTRADICTION_WITNESS_REQUIRED");
  const matched = [oracle.detailed_items];
  for (const item of items) {
    if (!finding(item)) continue;
    if (!oracle.permitted_finding_item_indices.includes(item.item_index)) return outcome("rejected", "UNEXPECTED_FINDING_ITEM");
    const status = witnessStatus(item, oracle.requirement_id, expected);
    if (status !== "verified") return outcome(status, "COUNTEREXAMPLE_DOES_NOT_WITNESS_CONTRADICTION");
    matched.push(item.item_index);
  }
  return outcome("verified", "CONCRETE_CONTRADICTION_WITNESS", matched.sort(function ascending(left, right) { return left - right; }));
}

export function summarizeUsage(observations) {
  const keys = ["input", "cachedInput", "cacheWrite", "output", "reasoningOutput"];
  const totals = {};
  for (const key of keys) {
    let observed = 0;
    let missing = 0;
    for (const observation of observations) {
      const value = observation.usage?.[key];
      if (Number.isFinite(value) && value >= 0) observed += value;
      else missing += 1;
    }
    totals[key] = { total: observations.length && !missing ? observed : null, observed_subtotal: observed, missing };
  }
  return { requests: observations.length, totals };
}

function validateMetrics(value) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value));
  for (const [key, number] of Object.entries(value)) {
    assert.match(key, /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/u);
    assert.ok(numeric(number));
  }
}

/** Reject unknown report fields instead of publishing arbitrary worker text. */
export function validateNativeReport(report, options) {
  try {
    const keys = ["schema_version", "packet_id", "status", "evidence_level", "packet_complete", "provider", "model", "reasoning_effort", "child_tool_presentation", "workflow_sha256", "mcp_build_id", "cases", "metrics", "next_action"];
    assert.ok(report && Object.keys(report).every(knownRoot));
    function knownRoot(key) { return keys.includes(key); }
    assert.equal(report.schema_version, 1);
    assert.equal(report.packet_id, "P04");
    assert.equal(report.packet_complete, false);
    assert.ok(["pass", "fail", "incomplete"].includes(report.status));
    assert.equal(report.evidence_level, "native_models");
    assert.equal(report.provider, options.provider);
    assert.equal(report.model, options.model);
    assert.equal(report.reasoning_effort, options.reasoningEffort);
    assert.equal(report.child_tool_presentation, "native");
    assert.equal(report.workflow_sha256, options.expectedWorkflowSha256);
    assert.ok(report.mcp_build_id === null || /^[a-zA-Z0-9_.:-]{1,256}$/u.test(report.mcp_build_id));
    assert.ok(["qualification_evidence_ready", "resolve_native_failure"].includes(report.next_action));
    assert.ok(Array.isArray(report.cases) && report.cases.length > 0 && report.cases.length <= options.cases.length);
    const names = new Set();
    const caseKeys = ["name", "status", "expected", "observed", "consistency", "spec_sha256", "source_sha256", "metrics", "usage", "actors", "errors"];
    for (const item of report.cases) {
      assert.ok(item && Object.keys(item).every(knownCaseField));
      function knownCaseField(key) { return caseKeys.includes(key); }
      assert.ok(caseNames.has(item.name) && options.cases.includes(item.name) && !names.has(item.name));
      names.add(item.name);
      assert.ok(["pass", "fail", "incomplete"].includes(item.status));
      assert.ok(["reviewed", "gaps"].includes(item.expected) && outcomes.has(item.observed));
      assert.ok(["pending", "consistent", "gap", "conflict"].includes(item.consistency));
      assert.match(item.spec_sha256, /^[a-f0-9]{64}$/u);
      assert.match(item.source_sha256, /^[a-f0-9]{64}$/u);
      validateMetrics(item.metrics);
      if (item.status === "pass") {
        assert.equal(item.observed, item.expected);
        assert.notEqual(item.consistency, "pending");
        if (item.expected === "reviewed") assert.equal(item.consistency, "consistent");
        if (item.name === "native-conflict") assert.equal(item.consistency, "conflict");
        assert.ok(Number.isSafeInteger(item.metrics.total_items) && item.metrics.total_items > 0);
        assert.equal(item.metrics.recorded_items, item.metrics.total_items);
        assert.equal(item.metrics.forbidden_filesystem_successes, 0);
        assert.equal(item.metrics.filesystem_audit_pass, 1);
        assert.equal(item.metrics.judges_missing_scope, 0);
        assert.equal(item.metrics.scope_order_rejections, 0);
        assert.equal(item.metrics.parent_program_rejections, 0);
        assert.equal(item.metrics.parent_model_steps_while_pending, 0);
        if (item.name !== "sequential-omission") {
          assert.ok(Number.isSafeInteger(item.metrics.native_runs_started) && item.metrics.native_runs_started > 0);
          assert.equal(item.metrics.native_runs_ended, item.metrics.native_runs_started);
        }
        const requiresWitness = ["sequential-omission", "native-omission", "native-conflict"].includes(item.name);
        assert.equal(item.metrics.semantic_witness_verified, requiresWitness ? 1 : null);
      }
      assert.ok(Array.isArray(item.actors) && item.actors.length > 0 && item.actors.length <= 1000);
      for (const actor of item.actors) {
        assert.deepEqual(Object.keys(actor).sort(), ["index", "metrics", "role"]);
        assert.ok(Number.isSafeInteger(actor.index) && actor.index >= 0);
        assert.ok(["parent", "detailed", "final", "unknown"].includes(actor.role));
        validateMetrics(actor.metrics);
      }
      assert.ok(Array.isArray(item.errors) && item.errors.length <= 100);
      for (const code of item.errors) assert.match(code, /^[A-Z][A-Z0-9_]{0,63}$/u);
      assert.deepEqual(Object.keys(item.usage).sort(), ["requests", "totals"]);
      assert.ok(Number.isSafeInteger(item.usage.requests) && item.usage.requests >= 0);
      assert.deepEqual(Object.keys(item.usage.totals).sort(), ["cacheWrite", "cachedInput", "input", "output", "reasoningOutput"]);
      for (const usage of Object.values(item.usage.totals)) {
        assert.deepEqual(Object.keys(usage).sort(), ["missing", "observed_subtotal", "total"]);
        validateMetrics(usage);
      }
    }
    validateMetrics(report.metrics);
    if (report.status === "pass") {
      assert.equal(report.cases.length, options.cases.length);
      assert.ok(report.cases.every(passed));
      function passed(item) { return item.status === "pass"; }
    }
  } catch {
    throw Object.assign(new Error("Native qualification returned an invalid public report."), { code: "INVALID_NATIVE_REPORT" });
  }
}
