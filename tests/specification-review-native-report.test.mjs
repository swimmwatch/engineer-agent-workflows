import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { assessConflictEvidence, assessOmissionEvidence, omissionEvidence, reviewOutcome, summarizeUsage, validateNativeReport } from "../scripts/lib/specification-review-native-report.mjs";
import { createNativeCaseFixture } from "../scripts/lib/specification-review-native-fixtures.mjs";

const options = { provider: "openai-codex", model: "gpt-test", reasoningEffort: "xhigh",
  expectedWorkflowSha256: "a".repeat(64), cases: ["native-paraphrase"] };

function validReport() {
  return { schema_version: 1, packet_id: "P04", status: "pass", evidence_level: "native_models", packet_complete: false,
    provider: options.provider, model: options.model, reasoning_effort: options.reasoningEffort,
    child_tool_presentation: "native", workflow_sha256: options.expectedWorkflowSha256, mcp_build_id: "test-build",
    cases: [{ name: "native-paraphrase", status: "pass", expected: "reviewed", observed: "reviewed", consistency: "consistent",
      spec_sha256: "b".repeat(64), source_sha256: "c".repeat(64), metrics: { elapsed_ms: 1,
        total_items: 6, recorded_items: 6, forbidden_filesystem_successes: 0, filesystem_audit_pass: 1,
      judges_missing_scope: 0, scope_order_rejections: 0, parent_program_rejections: 0, semantic_witness_verified: null,
      native_runs_started: 1, native_runs_ended: 1, parent_model_steps_while_pending: 0 },
      actors: [{ index: 0, role: "parent", metrics: { model_responses: 2 } }], usage: summarizeUsage([]), errors: [] }],
    metrics: { elapsed_ms: 1 }, next_action: "qualification_evidence_ready" };
}

function nativePassRequiresACompletedForegroundWorkflow() {
  for (const changed of [{ native_runs_started: undefined }, { native_runs_started: 0, native_runs_ended: 0 },
    { native_runs_ended: 0 }, { parent_model_steps_while_pending: 1 }, { parent_model_steps_while_pending: undefined }]) {
    const report = validReport();
    Object.assign(report.cases[0].metrics, changed);
    assert.throws(() => validateNativeReport(report, options));
  }
  validateNativeReport(validReport(), options);
}
test("native PASS requires an observed completed foreground workflow and zero parent steps while waiting", nativePassRequiresACompletedForegroundWorkflow);

function outcomesRequireSavedResults() {
  const complete = { coverage_status: "reviewed", total_items: 6, recorded_items: 6, consistency_status: "consistent" };
  assert.equal(reviewOutcome(complete, "reviewed"), "pass");
  assert.equal(reviewOutcome({ ...complete, recorded_items: 5 }, "reviewed"), "incomplete");
  assert.equal(reviewOutcome({ ...complete, consistency_status: "pending" }, "reviewed"), "incomplete");
  assert.equal(reviewOutcome({ ...complete, coverage_status: "pending" }, "reviewed"), "incomplete");
  assert.equal(reviewOutcome({ ...complete, coverage_status: "gaps" }, "reviewed"), "fail");
  assert.equal(reviewOutcome(complete, "reviewed", true), "incomplete");
  assert.equal(reviewOutcome({ ...complete, consistency_status: "gap" }, "reviewed"), "incomplete");
  assert.equal(reviewOutcome({ ...complete, coverage_status: "gaps", consistency_status: "gap" }, "gaps", false, "conflict"), "fail");
}
test("a model outcome cannot certify missing saves or an unfinished consistency gate", outcomesRequireSavedResults);

function missingUsageIsNotZero() {
  assert.equal(summarizeUsage([]).totals.input.total, null);
  const missing = summarizeUsage([{ usage: { input: 10, cachedInput: 4, output: 2 } }, { usage: { input: null, output: 3 } }]);
  assert.equal(missing.totals.input.total, null);
  assert.equal(missing.totals.input.observed_subtotal, 10);
  assert.equal(missing.totals.input.missing, 1);
  assert.equal(missing.totals.output.total, 5);
  assert.equal(missing.totals.cachedInput.observed_subtotal, 4);
  assert.equal(missing.totals.reasoningOutput.total, null);
  const zeros = summarizeUsage([{ usage: { input: 0, output: 0 } }]);
  assert.equal(zeros.totals.input.total, 0);
}
test("provider usage distinguishes absent observations from genuine zero values", missingUsageIsNotZero);

function unrelatedGapsCannotSatisfyTheOmissionControl() {
  assert.equal(omissionEvidence([{ verdict: "gap", evidence_requirement_ids: ["CLI-002"], explanation: "The public interface is undefined." }]), false);
  assert.equal(omissionEvidence([{ verdict: "covered", evidence_requirement_ids: ["CLI-001"], explanation: "EMPTY_VALUE is preserved." }]), false);
  assert.equal(omissionEvidence([{ verdict: "gap", evidence_requirement_ids: ["CLI-001"], explanation: "The empty input rejection is missing." }]), false);
  assert.equal(omissionEvidence([{ verdict: "gap", explanation: "CLI-001 returns success instead of EMPTY_VALUE." }]), false);
}
test("a generic unrelated gap cannot masquerade as detection of the retained-ID omission", unrelatedGapsCannotSatisfyTheOmissionControl);

function omissionOracle() {
  return { kind: "empty-input-rejection-v2", requirement_id: "CLI-001", detailed_items: 4,
    required_finding_item_indices: [1, 2], permitted_finding_item_indices: [1, 2, 3],
    spec_sha256: "b".repeat(64), source_sha256: "c".repeat(64) };
}

function omissionWitness() {
  return { operation: "CLI-001", input: { value: "" },
    permitted_by_spec: { status: "ok", value: "" },
    required_by_source: { status: "error", code: "EMPTY_VALUE" } };
}

function witnessedResults(explanation = "A zero-character input incorrectly follows the success path instead of the mandated domain-error path.") {
  const results = [{ item_index: 0, verdict: "covered", explanation: "The dispatch contract corresponds to the retained source." }];
  for (const item_index of [1, 2]) {
    results.push({ item_index, verdict: "gap", explanation, evidence_requirement_ids: ["CLI-001"],
      counterexample: JSON.stringify(omissionWitness()) });
  }
  results.push({ item_index: 3, verdict: "covered", explanation: "No additional independent profile gap." });
  return results;
}

function emptyDocumentationIsNotTheSeededBehavioralOmission() {
  const items = witnessedResults("CLI-001 leaves an empty deployment documentation section.");
  for (const item of items) {
    if (item.verdict === "gap") item.counterexample = "An empty deployment section remains undocumented.";
  }
  assert.equal(omissionEvidence(items, omissionOracle()), false);
}
test("an unrelated empty documentation gap cannot satisfy the behavioral omission oracle", emptyDocumentationIsNotTheSeededBehavioralOmission);

function semanticParaphraseWithConcreteWitnessDoesNotNeedKeywords() {
  assert.equal(omissionEvidence(witnessedResults(), omissionOracle()), true);
}
test("a concrete zero-character witness is accepted without keyword-dependent explanation", semanticParaphraseWithConcreteWitnessDoesNotNeedKeywords);

function savedWitnessesRequireTheExactSourceAndRequirementItems() {
  const complete = witnessedResults();
  assert.equal(assessOmissionEvidence(complete, omissionOracle()).status, "verified");
  assert.deepEqual(assessOmissionEvidence(complete, omissionOracle()).matched_item_indices, [1, 2]);
  const variants = [
    complete.slice(1),
    [complete[0], complete[1], complete[1], complete[3]],
    [{ ...complete[0], item_index: 4 }, ...complete.slice(1)],
    complete.map(function withoutRequired(item) { return item.item_index === 2 ? { ...item, verdict: "covered" } : item; }),
    complete.map(function unrelatedProfile(item) { return item.item_index === 3 ? { ...item, verdict: "gap", evidence_requirement_ids: ["CLI-001"], counterexample: "An empty documentation section." } : item; }),
    complete.map(function wrongRequirement(item) { return item.item_index === 1 ? { ...item, evidence_requirement_ids: ["CLI-002"] } : item; }),
  ];
  for (const items of variants) assert.notEqual(assessOmissionEvidence(items, omissionOracle()).status, "verified");
  assert.equal(assessOmissionEvidence(complete).status, "unverified");
  assert.equal(assessOmissionEvidence(complete, { ...omissionOracle(), spec_sha256: "not-a-pinned-spec" }).status, "unverified");
}
test("omission certification requires all actual saved results and both exact affected items", savedWitnessesRequireTheExactSourceAndRequirementItems);

function counterexamplesMustDemonstrateTheCorrectBehavioralDirection() {
  const valid = omissionWitness();
  const variants = [
    { ...valid, operation: "CLI-002" },
    { ...valid, input: { value: "not-zero-length" } },
    { ...valid, input: "" },
    { ...valid, input: { value: "", extra: true } },
    { ...valid, permitted_by_spec: valid.required_by_source, required_by_source: valid.permitted_by_spec },
    { ...valid, required_by_source: { status: "error", code: "INVALID_INPUT" } },
    { ...valid, permitted_by_spec: { status: "ok", value: false } },
    { ...valid, required_by_source: { status: "error", code: "EMPTY_VALUE", extra: true } },
  ];
  for (const witness of variants) {
    const items = witnessedResults();
    items[1].counterexample = JSON.stringify(witness);
    assert.equal(assessOmissionEvidence(items, omissionOracle()).status, "rejected");
  }
  const opaque = witnessedResults();
  opaque[1].counterexample = "A zero-character input follows the successful path instead of the required error path.";
  assert.deepEqual(assessOmissionEvidence(opaque, omissionOracle()), {
    status: "unverified", reason: "MACHINE_WITNESS_REQUIRED", matched_item_indices: [],
  });
}
test("the omission oracle validates concrete input and source/spec results without coercion or word matching", counterexamplesMustDemonstrateTheCorrectBehavioralDirection);

async function everyLargeFixtureContractAndSourceIsFullyDefined(t) {
  function cleanup(callback) { t.after(callback); }
  const { fixture } = await createNativeCaseFixture("native-omission", cleanup);
  const spec = await readFile(join(fixture.directory, "spec.md"), "utf8");
  assert.doesNotMatch(spec, /Return the requested fixture value/u);
  assert.match(spec, /INVALID_INPUT/u);
  assert.match(spec, /CLI-026:/u);
  for (let index = 0; index < fixture.review.total_items - 1; index += 1) {
    const read = await fixture.readItem(fixture.author, index);
    assert.doesNotMatch(read.body, /Preserve every linked fixture behavior/u);
  }
}
test("large semantic fixtures contain complete decoy contracts rather than unspecified placeholders", everyLargeFixtureContractAndSourceIsFullyDefined);

async function cleanAndOmissionTwinsDifferByOnlyTheSpecifiedClause(t) {
  function cleanup(callback) { t.after(callback); }
  const clean = await createNativeCaseFixture("native-clean", cleanup);
  const omitted = await createNativeCaseFixture("native-omission", cleanup);
  assert.equal(clean.selected.expected, "reviewed");
  assert.equal(clean.oracle, null);
  assert.equal(omitted.selected.expected, "gaps");
  assert.equal(clean.sourceSha256, omitted.sourceSha256);
  assert.deepEqual(clean.fixture.ids, omitted.fixture.ids);
  const cleanSpec = await readFile(join(clean.fixture.directory, "spec.md"), "utf8");
  const omittedSpec = await readFile(join(omitted.fixture.directory, "spec.md"), "utf8");
  const missingClause = / Before the ordinary success result,.*?it must not return a successful value\./u;
  assert.match(cleanSpec, missingClause);
  assert.equal(cleanSpec.replace(missingClause, ""), omittedSpec);
  assert.match(cleanSpec, /"code":"EMPTY_VALUE"/u);
  assert.doesNotMatch(omittedSpec, /"code":"EMPTY_VALUE"/u);
  assert.equal(omitted.oracle.spec_sha256, omitted.specSha256);
  assert.equal(omitted.oracle.source_sha256, omitted.sourceSha256);
  assert.equal(omitted.oracle.required_finding_item_indices.length, 2);
  assert.equal(omitted.oracle.detailed_items, omitted.fixture.review.total_items - 1);
}
test("the large clean twin and retained-ID omission twin have identical sources and only one specification difference", cleanAndOmissionTwinsDifferByOnlyTheSpecifiedClause);

function conflictOracle() {
  return { ...omissionOracle(), kind: "inconsistent-response-v1", required_finding_item_indices: [] };
}

function conflictWitness() {
  return { operation: "CLI-001", input: { value: "ready" },
    permitted_by_spec: { status: "ok", value: "other" },
    required_by_source: { status: "ok", value: "ready" } };
}

function coveredDetailedResults(count = conflictOracle().detailed_items) {
  return Array.from({ length: count }, function covered(_, item_index) {
    return { item_index, verdict: "covered", explanation: "The local contract preserves the source mapping." };
  });
}

function savedConflictResult() {
  return { verdict: "conflict", explanation: "The same input requires incompatible output values in two normative clauses.",
    counterexample: JSON.stringify(conflictWitness()) };
}

function conflictCertificationNeedsCompleteSavedResultsAndTheFinalWitness() {
  const items = coveredDetailedResults();
  const saved = savedConflictResult();
  const oracle = conflictOracle();
  assert.deepEqual(assessConflictEvidence(items, saved, oracle), {
    status: "verified", reason: "CONCRETE_CONTRADICTION_WITNESS", matched_item_indices: [4],
  });
  assert.deepEqual(assessConflictEvidence(items, undefined, oracle), {
    status: "unverified", reason: "FINAL_RESULT_NOT_SAVED", matched_item_indices: [],
  });
  assert.equal(assessConflictEvidence(items, { ...saved, verdict: "gap" }, oracle).status, "rejected");
  assert.equal(assessConflictEvidence(items, { ...saved, verdict: "consistent" }, oracle).status, "rejected");
  assert.equal(assessConflictEvidence(items, saved).status, "unverified");
  assert.equal(assessConflictEvidence(items, saved, { ...oracle, source_sha256: "not-pinned" }).status, "unverified");
  assert.equal(assessConflictEvidence(items.slice(1), saved, oracle).status, "unverified");
  for (const invalid of [[items[0], items[1], items[1], items[3]], [{ ...items[0], item_index: 4 }, ...items.slice(1)]]) {
    assert.equal(assessConflictEvidence(invalid, saved, oracle).status, "rejected");
  }
  const opaque = { ...saved, counterexample: "CLI-001 conflicts with empty deployment documentation." };
  assert.equal(assessConflictEvidence(items, opaque, oracle).status, "unverified");
}
test("conflict certification requires all saved detailed results and a saved concrete final witness", conflictCertificationNeedsCompleteSavedResultsAndTheFinalWitness);

function conflictWitnessesRequireTheExactInputAndIncompatibleResponseDirection() {
  const witness = conflictWitness();
  const variants = [
    { ...witness, operation: "CLI-002" },
    { ...witness, input: { value: "different" } },
    { ...witness, input: { value: "ready", extra: true } },
    { ...witness, permitted_by_spec: witness.required_by_source, required_by_source: witness.permitted_by_spec },
    { ...witness, permitted_by_spec: { status: "ok", value: "ready" } },
    { ...witness, required_by_source: { status: "ok", value: false } },
    { ...witness, required_by_source: { status: "ok", value: "ready", extra: true } },
    omissionWitness(),
  ];
  for (const invalid of variants) {
    const saved = { ...savedConflictResult(), counterexample: JSON.stringify(invalid) };
    assert.equal(assessConflictEvidence(coveredDetailedResults(), saved, conflictOracle()).status, "rejected");
  }
}
test("conflict witness validates operation, input, types and incompatible normative response direction", conflictWitnessesRequireTheExactInputAndIncompatibleResponseDirection);

function detailedConflictsCannotMaskUnrelatedFindings() {
  for (const item_index of conflictOracle().permitted_finding_item_indices) {
    const items = coveredDetailedResults();
    items[item_index] = { ...items[item_index], verdict: "conflict", evidence_requirement_ids: ["CLI-001"],
      counterexample: JSON.stringify(conflictWitness()) };
    assert.equal(assessConflictEvidence(items, savedConflictResult(), conflictOracle()).status, "verified");
    items[item_index].counterexample = JSON.stringify(omissionWitness());
    assert.equal(assessConflictEvidence(items, savedConflictResult(), conflictOracle()).status, "rejected");
    items[item_index].counterexample = JSON.stringify(conflictWitness());
    items[item_index].evidence_requirement_ids = ["CLI-002"];
    assert.equal(assessConflictEvidence(items, savedConflictResult(), conflictOracle()).status, "rejected");
  }
  const unrelated = coveredDetailedResults();
  unrelated[0] = { ...unrelated[0], verdict: "gap", evidence_requirement_ids: ["CLI-001"],
    counterexample: JSON.stringify(conflictWitness()) };
  assert.deepEqual(assessConflictEvidence(unrelated, savedConflictResult(), conflictOracle()), {
    status: "rejected", reason: "UNEXPECTED_FINDING_ITEM", matched_item_indices: [],
  });
}
test("conflict evidence permits linked findings but rejects unrelated detailed gaps", detailedConflictsCannotMaskUnrelatedFindings);

async function compactControlsAlsoDefineEveryOperation(t) {
  function cleanup(callback) { t.after(callback); }
  const conflict = await createNativeCaseFixture("native-conflict", cleanup);
  const spec = await readFile(join(conflict.fixture.directory, "spec.md"), "utf8");
  assert.doesNotMatch(spec, /Return the requested fixture value|successful commit/u);
  assert.match(spec, /"value":"ready"/u);
  assert.match(spec, /"value":"other"/u);
  assert.match(spec, /neither has precedence/u);
  assert.match(spec, /CLI-002:/u);
  assert.equal(conflict.oracle.kind, "inconsistent-response-v1");
  assert.equal(conflict.oracle.spec_sha256, conflict.specSha256);
  assert.equal(conflict.oracle.source_sha256, conflict.sourceSha256);
  assert.deepEqual(conflict.oracle.required_finding_item_indices, []);
  assert.equal(conflict.oracle.detailed_items, conflict.fixture.review.total_items - 1);
  assert.equal(assessConflictEvidence(coveredDetailedResults(conflict.oracle.detailed_items), savedConflictResult(), conflict.oracle).status, "verified");
}
test("the conflict control uses the same completely specified pure operation in both sections", compactControlsAlsoDefineEveryOperation);

function workerReportsCannotPublishUnexpectedText() {
  validateNativeReport(validReport(), options);
  const variants = [
    { ...validReport(), raw_error: "/private/credential-value" },
    { ...validReport(), model: "different-model" },
    { ...validReport(), child_tool_presentation: "ptc" },
    { ...validReport(), packet_complete: true },
    { ...validReport(), cases: [] },
    { ...validReport(), metrics: { elapsed_ms: "private-token" } },
    { ...validReport(), metrics: { elapsed_ms: Number.NaN } },
  ];
  const nested = validReport();
  nested.cases[0].raw_context = "opaque-context";
  variants.push(nested);
  const diagnostic = validReport();
  diagnostic.cases[0].errors = ["Bearer private-token"];
  variants.push(diagnostic);
  for (const report of variants) assert.throws(() => validateNativeReport(report, options), { code: "INVALID_NATIVE_REPORT" });
}
test("only the exact public native report contract may cross the worker boundary", workerReportsCannotPublishUnexpectedText);

function passingPublicCasesRequireFreshAuditAndSemanticEvidence() {
  const invalid = [
    { forbidden_filesystem_successes: 1 }, { filesystem_audit_pass: 0 }, { filesystem_audit_pass: undefined },
    { judges_missing_scope: 1 }, { judges_missing_scope: undefined },
    { scope_order_rejections: 1 }, { scope_order_rejections: undefined },
    { parent_program_rejections: 1 }, { parent_program_rejections: undefined },
    { semantic_witness_verified: undefined }, { recorded_items: 5 }, { total_items: undefined },
  ];
  for (const metrics of invalid) {
    const report = validReport();
    Object.assign(report.cases[0].metrics, metrics);
    assert.throws(() => validateNativeReport(report, options), { code: "INVALID_NATIVE_REPORT" });
  }
  const omissionOptions = { ...options, cases: ["native-omission"] };
  const omission = validReport();
  Object.assign(omission.cases[0], { name: "native-omission", expected: "gaps", observed: "gaps", consistency: "gap" });
  assert.throws(() => validateNativeReport(omission, omissionOptions), { code: "INVALID_NATIVE_REPORT" });
  omission.cases[0].metrics.semantic_witness_verified = 1;
  validateNativeReport(omission, omissionOptions);
  const forged = validReport();
  forged.cases[0].observed = "pending";
  assert.throws(() => validateNativeReport(forged, options), { code: "INVALID_NATIVE_REPORT" });
}
test("a public PASS cannot certify absent or failed filesystem, scope, parent and semantic gates", passingPublicCasesRequireFreshAuditAndSemanticEvidence);

function conflictPassRequiresACheckedConcreteContradiction() {
  const conflictOptions = { ...options, cases: ["native-conflict"] };
  const report = validReport();
  Object.assign(report.cases[0], { name: "native-conflict", expected: "gaps", observed: "gaps", consistency: "conflict" });
  assert.throws(() => validateNativeReport(report, conflictOptions), { code: "INVALID_NATIVE_REPORT" },
    "A generic final conflict label without checked evidence must not certify the seeded contradiction.");
  report.cases[0].metrics.semantic_witness_verified = 1;
  validateNativeReport(report, conflictOptions);
}
test("conflict PASS requires the concrete seeded contradiction rather than only its verdict label", conflictPassRequiresACheckedConcreteContradiction);

function selectedPassDoesNotCertifyOmittedCases() {
  const selected = { ...options, cases: ["native-paraphrase", "native-conflict"] };
  assert.throws(() => validateNativeReport(validReport(), selected), { code: "INVALID_NATIVE_REPORT" });
  const report = validReport();
  report.status = "incomplete";
  report.next_action = "resolve_native_failure";
  report.cases[0].status = "incomplete";
  report.cases[0].observed = "pending";
  validateNativeReport(report, selected);
}
test("one selected case never certifies an omitted workload", selectedPassDoesNotCertifyOmittedCases);

async function negativeControlContainsNoUnspecifiedPlaceholder(t) {
  function cleanup(callback) { t.after(callback); }
  const { fixture } = await createNativeCaseFixture("native-paraphrase", cleanup);
  const spec = await readFile(join(fixture.directory, "spec.md"), "utf8");
  assert.doesNotMatch(spec, /Return the requested fixture value/u,
    "A negative control cannot also contain the unrelated undefined CLI-002 contract found in the live trial.");
  assert.match(spec, /ready is true/u);
  assert.match(spec, /"status":"pending"/u);
  assert.match(spec, /INVALID_INPUT/u);
  assert.match(spec, /no external I\/O/u);
}
test("the paraphrase negative control has no unrelated unspecified public interface", negativeControlContainsNoUnspecifiedPlaceholder);

async function pairedInputsRemainEquivalent(t) {
  function cleanup(callback) { t.after(callback); }
  const sequential = await createNativeCaseFixture("sequential-omission", cleanup);
  const native = await createNativeCaseFixture("native-omission", cleanup);
  assert.equal(sequential.specSha256, native.specSha256);
  assert.equal(sequential.sourceSha256, native.sourceSha256);
  assert.notEqual(sequential.fixture.project, native.fixture.project);
  assert.notEqual(sequential.fixture.review.review_ref, native.fixture.review.review_ref);
}
test("the paired benchmark uses identical semantic inputs in independent targets", pairedInputsRemainEquivalent);

async function explicitServerEntrypointIsUsedByFixtureAuthorAndReaders(t) {
  const directory = await mkdtemp(join(tmpdir(), "eaw-fixture-entrypoint-"));
  async function removeWrapper() { await rm(directory, { recursive: true, force: true }); }
  t.after(removeWrapper);
  const marker = join(directory, "started.jsonl");
  const entrypoint = join(directory, "main.mjs");
  const server = new URL("../packages/engineer-agent-workflow-mcp/dist/main.js", import.meta.url).href;
  const wrapper = "import {appendFileSync} from 'node:fs'; appendFileSync(" + JSON.stringify(marker)
    + ",JSON.stringify({pid:process.pid})+'\\n'); await import(" + JSON.stringify(server) + ");\n";
  await writeFile(entrypoint, wrapper);
  function cleanup(callback) { t.after(callback); }
  const created = await createNativeCaseFixture("native-paraphrase", cleanup, { entrypoint });
  let starts = "";
  try { starts = await readFile(marker, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
  assert.notEqual(starts, "", "The explicit server entrypoint must execute during fixture author setup.");
  assert.equal(created.fixture.mcpEntrypoint, entrypoint);
  const reader = await created.fixture.openActor("explicit-entrypoint-reader");
  const status = await reader.call("specification_review_status", { review_ref: created.fixture.review.review_ref });
  assert.equal(status.coverage_status, "pending");
  const observed = await readFile(marker, "utf8");
  assert.equal(observed.trim().split("\n").length, 2, "Both independent fixture processes must use the explicit entrypoint.");
}
test("native fixture author and readers execute the explicitly selected frozen MCP entrypoint", explicitServerEntrypointIsUsedByFixtureAuthorAndReaders);
