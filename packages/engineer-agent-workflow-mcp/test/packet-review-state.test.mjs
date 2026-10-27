import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, readdir, open, unlink, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, URL } from "node:url";
import { createRequire, syncBuiltinESMExports } from "node:module";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test, { before, after } from "node:test";
import Ajv from "ajv";
import { parse, stringify } from "yaml";
import { createSharedStdioHarness } from "../test-support/stdio-harness.mjs";
import { planningFixture } from "../test-support/planning-fixture.mjs";
import { snapshot } from "../dist/review-model.js";
import { checkPlanningPacket } from "../dist/planning.js";
import { decode, readDependency, hash } from "../dist/state.js";

const server = createSharedStdioHarness({
  entrypoint: fileURLToPath(new URL("../dist/main.js", import.meta.url)), name: "packet-state-fixture",
});
before(() => server.start());
after(() => server.close());

async function fixture(t) {
  const f = await planningFixture(t, server);
  const question = await f.prepare();
  const accepted = await f.record(question.question_ref, ["p1"]);
  const agreement = accepted.agreements[0];
  const module = await import("../dist/packet-review-state.js");
  const path = join(f.project, f.directory, "decisions.yaml");
  await writeFile(join(f.project, "input.txt"), "Selected input.\n");
  async function source(context) {
    const s = await snapshot(context);
    const readiness = await checkPlanningPacket(context, "p1", agreement.agreement_ref, agreement.proposal_digest);
    assert.equal(readiness.status, "ready");
    const code = await readDependency(context, "input.txt");
    return {
      source_version: hash(JSON.stringify([s.version, code.toString(), agreement.proposal_digest])),
      behavioral_source_version: s.version, specification_version: s.source.version,
    };
  }
  const binding = await source(decode(f.context));
  const attempt = {
    attempt_id: "attempt-one", packet_id: "p1",
    behavioral_source_version: binding.behavioral_source_version,
    specification_version: binding.specification_version,
    agreement_ref: agreement.agreement_ref, proposal_digest: agreement.proposal_digest,
    required_kinds: ["red", "green"], observations: [], completion_state: "running",
    required_check_status: "missing", restoration_status: "not_required",
  };
  function input(operation_id, entity_ref = attempt.attempt_id, expected_revision = 0, payload = {}) {
    return { operation_id, entity_type: "packet_attempt", entity_ref, expected_revision,
      ...binding, payload };
  }
  function mutate(input, apply, signal) {
    return module.mutatePacketReviewState(f.context, "fixture-observation", input, { source, apply }, signal);
  }
  async function selected(entity_ref = attempt.attempt_id) {
    let cursor;
    let body = "";
    do {
      const response = await module.readPacketReviewState(f.context, {
        entity_type: "packet_attempt", entity_ref, ...(cursor ? { cursor } : {}),
      });
      body += response.result.text;
      cursor = response.result.next_cursor;
    } while (cursor);
    return JSON.parse(body);
  }
  return { ...f, module, path, binding, source, attempt, input, mutate, selected, agreement,
    get currentContext() { return f.context; }, bytes: f.bytes };
}

function observation(id, kind = "red") {
  return { observation_id: id, operation_id: id, sequence: 1, kind,
    observed_at: "2026-10-27T09:00:00Z", source_identity: "a".repeat(64),
    source_refs: [{ path: "input.txt", source_digest: "a".repeat(64) }],
    command_ref: "node --test fixture.test.mjs", working_directory_ref: ".",
    expected: "The discriminating assertion is observed.", observed: "Assertion observed in an owned fixture.",
    outcome: kind === "red" ? "expected_failure" : "passed", assertion_observed: true,
    restoration_status: "not_required" };
}

function reviewRun(f, overrides = {}) {
  return {
    run_id: "run-one", specification: "planning", packet_ids: ["p1"], mode: "normal", input_issues: [],
    ...f.binding, selection: { mode: "working_tree", baseline_ref: "HEAD", target_ref: "working-tree",
      paths: ["input.txt"], effective_digest: "a".repeat(64), attributes_digest: "b".repeat(64) },
    units: [], criteria: [], assignments: [], findings: [], executions: [], resources: [], invocations: [], events: [],
    finalization: { execution_status: "pending", coverage_status: "pending", freshness: "fresh",
      consistency_status: "pending", cleanup_status: "not_required", unresolved_material_refs: [], judgment: "incomplete", reason: "Not reviewed yet." },
    packet_inputs: [{ packet_id: "p1", path: f.paths.p1, packet_digest: "a".repeat(64), requirement_ids: ["PLAN-001"],
      contract_refs: [], agreement_ref: f.agreement.agreement_ref, proposal_digest: f.agreement.proposal_digest, input_status: "current", issues: [] }],
    assessments: [], ...overrides,
  };
}

function finalize(run, eventId, reason) {
  const finalization = { ...run.finalization, execution_status: "completed", coverage_status: "complete",
    consistency_status: "consistent", judgment: "request_changes", reason };
  const event = { event_id: eventId, operation_id: eventId, kind: "finalized", source_version: run.source_version,
    entity_ref: run.run_id, payload_digest: hash(JSON.stringify(finalization)), sequence: run.events.length + 1,
    observed_at: "2026-10-27T09:00:00Z" };
  return { ...run, events: [...run.events, event], finalization };
}

async function stateRecord(f, selection) {
  let text = "";
  let cursor;
  do {
    const response = await f.module.readPacketReviewState(f.currentContext, { ...selection, ...(cursor ? { cursor } : {}) });
    text += response.result.text;
    cursor = response.result.next_cursor;
  } while (cursor);
  return JSON.parse(text);
}

test("addressed reads survive disjoint appends while selected and namespace changes still invalidate cursors", async t => {
  const f = await fixture(t);
  const observations = Array.from({ length: 24 }, (_, index) => ({ ...observation(`check-${index}`, "check"), sequence: index + 1 }));
  const attempt = { ...f.attempt, observations };
  await f.mutate(f.input("create"), () => ({ entity: attempt, result: {} }));
  const selector = { entity_type: "packet_attempt", entity_ref: attempt.attempt_id };
  const first = await f.module.readPacketReviewState(f.currentContext, selector);
  const namespace = await f.module.readPacketReviewState(f.currentContext);
  assert.equal(first.result.complete, false);
  await f.mutate(f.input("create-other", "attempt-two"), () => ({ entity: { ...f.attempt, attempt_id: "attempt-two" }, result: {} }));
  let text = first.result.text;
  let cursor = first.result.next_cursor;
  while (cursor) {
    const part = await f.module.readPacketReviewState(f.currentContext, { ...selector, cursor });
    assert.equal(part.result.source_version, first.result.source_version);
    text += part.result.text;
    cursor = part.result.next_cursor;
  }
  assert.deepEqual(JSON.parse(text), attempt);
  await assert.rejects(f.module.readPacketReviewState(f.currentContext, { cursor: namespace.result.next_cursor }), e => e.code === "STALE_CURSOR");
  await f.mutate(f.input("append", undefined, 1), current => ({ entity: { ...current,
    observations: [...current.observations, { ...observation("last"), sequence: 25 }] }, result: {} }));
  await assert.rejects(f.module.readPacketReviewState(f.currentContext, { ...selector, cursor: first.result.next_cursor }), e => e.code === "STALE_CURSOR");
});

test("resource provenance is immutable while cleanup evidence can advance", async t => {
  const f = await fixture(t);
  const resource = { resource_id: "owned-db", resource_kind: "database", ownership: "created",
    safe_reference: "fixture-db", creator_actor_ref: "reviewer-one", creation_evidence_ref: "creation-one", cleanup_status: "pending" };
  const run = reviewRun(f, { resources: [resource] });
  const input = { ...f.input("create-run", run.run_id), entity_type: "run" };
  await f.mutate(input, () => ({ entity: run, result: {} }));
  const before = await f.bytes();
  const replacements = [
    { resource_id: resource.resource_id, resource_kind: resource.resource_kind, ownership: "reused", safe_reference: resource.safe_reference, cleanup_status: "not_required" },
    { ...resource, safe_reference: "another-db" },
    { ...resource, resource_kind: "workspace" },
    { ...resource, creator_actor_ref: "another-reviewer" },
    { ...resource, creation_evidence_ref: "another-creation" },
  ];
  for (const [index, replacement] of replacements.entries()) {
    await assert.rejects(f.mutate({ ...input, operation_id: `rewrite-${index}`, expected_revision: 1, payload: replacement }, current => ({
      entity: { ...current, resources: [replacement] }, result: {},
    })), e => e.code === "CONFLICT");
    assert.equal(await f.bytes(), before);
  }
  const completed = { ...resource, cleanup_status: "completed", cleanup_evidence_ref: "cleanup-one" };
  await f.mutate({ ...input, operation_id: "cleanup", expected_revision: 1, payload: completed }, current => ({
    entity: { ...current, resources: [completed] }, result: {},
  }));
  assert.deepEqual((await stateRecord(f, { entity_type: "run", entity_ref: run.run_id })).resources, [completed]);
});

test("finalized outcomes cannot change without a new retained finalization", async t => {
  const f = await fixture(t);
  const run = finalize(reviewRun(f), "final-one", "Original confirmed correction.");
  const input = { ...f.input("final-one", run.run_id), entity_type: "run" };
  await f.mutate(input, () => ({ entity: run, result: {} }));
  const before = await f.bytes();
  await assert.rejects(f.mutate({ ...input, operation_id: "replace-final", expected_revision: 1 }, current => ({
    entity: { ...current, finalization: { ...current.finalization, judgment: "incomplete", reason: "Replacement." } }, result: {},
  })), e => e.code === "CONFLICT");
  assert.equal(await f.bytes(), before);
  const duplicateFinals = finalize(finalize(run, "final-two", "Intermediate."), "final-three", "Latest.");
  await assert.rejects(f.mutate({ ...input, operation_id: "two-finalizations", expected_revision: 1 }, () => ({
    entity: duplicateFinals, result: {},
  })), e => e.code === "INVALID_STATE");
  assert.equal(await f.bytes(), before);
});

test("each finalization has an immutable complete snapshot and retry-safe addressed delivery", async t => {
  const f = await fixture(t);
  const firstRun = finalize(reviewRun(f), "final-one", "x".repeat(4096));
  const firstInput = { ...f.input("final-one", firstRun.run_id), entity_type: "run" };
  await f.mutate(firstInput, () => ({ entity: firstRun, result: { saved: true } }));
  const first = await f.module.readPacketReviewState(f.currentContext, { operation_id: "final-one" });
  assert.equal(first.result.complete, false, "A maximum-length outcome must be delivered completely in portions.");
  const secondRun = finalize(firstRun, "final-two", "New assessment with retained previous outcome.");
  const secondInput = { ...firstInput, operation_id: "final-two", expected_revision: 1, payload: secondRun.finalization };
  await f.mutate(secondInput, () => ({ entity: secondRun, result: { saved: true } }));
  let text = first.result.text;
  let cursor = first.result.next_cursor;
  while (cursor) {
    const part = await f.module.readPacketReviewState(f.currentContext, { operation_id: "final-one", cursor });
    assert.equal(part.result.source_version, first.result.source_version);
    text += part.result.text;
    cursor = part.result.next_cursor;
  }
  const historical = JSON.parse(text);
  assert.equal(historical.finalization_event_ref, "final-one");
  assert.deepEqual(historical.finalization_snapshot, firstRun.finalization);
  const latest = await stateRecord(f, { operation_id: "final-two" });
  assert.deepEqual(latest.finalization_snapshot, secondRun.finalization);
  assert.equal(latest.finalization_event_ref, "final-two");
  const before = await f.bytes();
  const replay = await f.mutate(secondInput, () => assert.fail("A retry must not create another outcome."));
  assert.equal(replay.replayed, true);
  assert.equal(await f.bytes(), before);
  assert.deepEqual(await stateRecord(f, { operation_id: "final-one" }), historical);
});

test("missing historical finalization snapshots are not fabricated or overwritten", async t => {
  const f = await fixture(t);
  const run = finalize(reviewRun(f), "legacy-final", "Retained legacy outcome.");
  const input = { ...f.input("legacy-final", run.run_id), entity_type: "run" };
  await f.mutate(input, () => ({ entity: run, result: {} }));
  // Emulate the previous storage writer in this owned fixture only.
  const { mutateReviewSubmission } = await import("../dist/state.js");
  await mutateReviewSubmission(f.currentContext, "fixture-remove-snapshot", {}, ledger => {
    const receipt = ledger.extensions.packet_review.operations[0];
    delete receipt.finalization_event_ref;
    delete receipt.finalization_snapshot;
    return { simulated_legacy: true };
  });
  const before = await f.bytes();
  const changed = finalize(run, "new-final", "New result without a retained predecessor.");
  await assert.rejects(f.mutate({ ...input, operation_id: "new-final", expected_revision: 1 }, () => ({ entity: changed, result: {} })), e => e.code === "CONFLICT");
  assert.equal(await f.bytes(), before);
  const receipt = await stateRecord(f, { operation_id: "legacy-final" });
  assert.equal(receipt.finalization_snapshot, undefined);
  assert.deepEqual((await stateRecord(f, { entity_type: "run", entity_ref: run.run_id })).finalization, run.finalization);
});

test("the canonical journal schema rejects corrupt packet review state and retains unrelated extensions", async () => {
  const schema = JSON.parse(await readFile(new URL("../../../shared/schemas/decisions.schema.json", import.meta.url), "utf8"));
  const validator = new Ajv({ allErrors: true }).compile(schema);
  const value = { schema_version: 1, spec_slug: "fixture", decisions: [],
    extensions: { unrelated: { retained: true }, packet_review: { schema_version: 1, runs: [], packet_attempts: [] } } };
  assert.equal(validator(value), true);
  value.extensions.packet_review.schema_version = 999;
  assert.equal(validator(value), false, "An unsupported packet namespace must not pass the journal validator.");
});

test("progress preserves behavioral approval, technical agreement, comments and unrelated metadata", async t => {
  const f = await fixture(t);
  const ledger = parse(await f.bytes());
  ledger.extensions.unrelated = { retained: true };
  await writeFile(f.path, "# Retained journal comment.\n" + stringify(ledger));
  const saved = await f.mutate(f.input("create"), () => ({ entity: f.attempt, result: { saved: true } }));
  assert.equal(saved.result.entity_revision, 1);
  assert.equal(saved.result.saved, true);
  assert.deepEqual(await f.selected(), f.attempt);
  const state = await f.call("specification_check_state", { expected_source_version: f.binding.behavioral_source_version });
  assert.equal(state.status, "pass");
  assert.equal(state.source_version, f.binding.behavioral_source_version);
  assert.equal((await f.check(f.agreement)).status, "ready");
  const after = await f.bytes();
  assert.ok(after.startsWith("# Retained journal comment."));
  const current = parse(after);
  assert.deepEqual(current.extensions.unrelated, ledger.extensions.unrelated);
  assert.deepEqual(current.decisions, ledger.decisions);
  assert.deepEqual(current.planning_decisions, ledger.planning_decisions);
  assert.deepEqual(current.specification_reviews, ledger.specification_reviews);
});

test("same operation replays exactly after other appends; conflicting payload cannot overwrite history", async t => {
  const f = await fixture(t);
  const create = f.input("create");
  const first = await f.mutate(create, () => ({ entity: f.attempt, result: { saved: true } }));
  const next = { ...f.attempt, observations: [observation("red")] };
  await f.mutate(f.input("red", undefined, 1, { observation: next.observations[0] }), () => ({ entity: next, result: { saved: true } }));
  const before = await f.bytes();
  const replay = await f.mutate(create, () => assert.fail("A replay must not execute the mutation again."));
  assert.equal((await f.selected()).observations.length, 1, "Duplicate delivery must not append evidence twice.");
  assert.equal(replay.replayed, true);
  assert.equal(replay.result.entity_revision, first.result.entity_revision);
  assert.equal(await f.bytes(), before);
  await assert.rejects(f.mutate({ ...create, payload: { different: true } }, () => assert.fail()), e => e.code === "CONFLICT");
  assert.equal(await f.bytes(), before);
  assert.equal((await f.selected()).observations.length, 1);
});

test("disjoint writers use logical source identity while overlapping revisions conflict", async t => {
  const f = await fixture(t);
  const second = { ...f.attempt, attempt_id: "attempt-two" };
  await Promise.all([
    f.mutate(f.input("create-one"), () => ({ entity: f.attempt, result: {} })),
    f.mutate(f.input("create-two", second.attempt_id), () => ({ entity: second, result: {} })),
  ]);
  const append = id => f.mutate(f.input(id, undefined, 1, { id }), current => ({
    entity: { ...current, observations: [observation(id)] }, result: {},
  }));
  const settled = await Promise.allSettled([append("left"), append("right")]);
  assert.equal(settled.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(settled.find(r => r.status === "rejected").reason.code, "CONFLICT");
  assert.equal((await f.selected()).observations.length, 1);
  assert.equal((await f.selected(second.attempt_id)).attempt_id, second.attempt_id);
});

test("logical source changes reject both new writes and old-operation replay", async t => {
  const f = await fixture(t);
  const input = f.input("create");
  await f.mutate(input, () => ({ entity: f.attempt, result: {} }));
  const before = await f.bytes();
  await writeFile(join(f.project, "input.txt"), "Changed selection.\n");
  for (const operation_id of ["create", "append"]) {
    await assert.rejects(f.mutate({ ...input, operation_id }, () => assert.fail()), e => e.code === "STALE_SOURCE");
  }
  assert.equal(await f.bytes(), before);
});

test("corruption, invalid references and unsupported versions preserve prior bytes", async t => {
  const f = await fixture(t);
  const before = await f.bytes();
  const invalid = { ...f.attempt, prior_attempt_ref: "missing" };
  await assert.rejects(f.mutate(f.input("bad-reference"), () => ({ entity: invalid, result: {} })), e => e.code === "BROKEN_REFERENCE");
  assert.equal(await f.bytes(), before);
  for (const state of [
    { schema_version: 99, runs: [], packet_attempts: [] },
    { schema_version: 1, runs: [], packet_attempts: [{ ...f.attempt, observations: [observation("one"), observation("one")] }] },
  ]) {
    const value = parse(before);
    value.extensions.packet_review = state;
    await writeFile(f.path, stringify(value));
    const corrupt = await f.bytes();
    await assert.rejects(f.module.readPacketReviewState(f.currentContext), e => ["INVALID_STATE", "UNSUPPORTED_VERSION"].includes(e.code));
    await assert.rejects(f.mutate(f.input("create"), () => ({ entity: f.attempt, result: {} })), e => ["INVALID_STATE", "UNSUPPORTED_VERSION"].includes(e.code));
    assert.equal(await f.bytes(), corrupt);
  }
});

test("older attempts are retained and evidence cannot be removed or rewritten", async t => {
  const f = await fixture(t);
  await f.mutate(f.input("create"), () => ({ entity: { ...f.attempt, observations: [observation("red")] }, result: {} }));
  const before = await f.bytes();
  await assert.rejects(f.mutate(f.input("rewrite", undefined, 1), () => ({ entity: f.attempt, result: {} })), e => e.code === "CONFLICT");
  assert.equal(await f.bytes(), before);
  const second = { ...f.attempt, attempt_id: "attempt-two", prior_attempt_ref: f.attempt.attempt_id };
  await f.mutate(f.input("second", second.attempt_id), () => ({ entity: second, result: {} }));
  const script = `
    const { readPacketReviewState } = await import(process.argv[2]);
    let cursor;
    let text = "";
    do {
      const response = await readPacketReviewState(process.argv[1], {
        entity_type: "packet_attempt", entity_ref: "attempt-one", ...(cursor ? { cursor } : {}),
      });
      text += response.result.text;
      cursor = response.result.next_cursor;
    } while (cursor);
    process.stdout.write(text);
  `;
  const { stdout } = await promisify(execFile)(process.execPath, [
    "--input-type=module", "-e", script, f.currentContext,
    new URL("../dist/packet-review-state.js", import.meta.url).href,
  ], { timeout: 10_000, maxBuffer: 128 * 1024 });
  assert.equal(JSON.parse(stdout).observations[0].operation_id, "red");
});

test("reads are bounded, side-effect free and cursors reject changed selection or state", async t => {
  const f = await fixture(t);
  const observations = Array.from({ length: 24 }, (_, i) => ({ ...observation(`check-${i}`, "check"), sequence: i + 1 }));
  await f.mutate(f.input("create"), () => ({ entity: { ...f.attempt, observations }, result: {} }));
  const before = await f.bytes();
  const part = await f.module.readPacketReviewState(f.currentContext, { entity_type: "packet_attempt", entity_ref: f.attempt.attempt_id });
  assert.equal(part.result.complete, false);
  assert.ok(Buffer.byteLength(part.result.text) <= 16 * 1024);
  assert.ok(Buffer.byteLength(JSON.stringify(part)) < 24 * 1024);
  assert.deepEqual((await f.selected()).observations, observations);
  assert.equal(await f.bytes(), before);
  await assert.rejects(f.module.readPacketReviewState(f.currentContext, { cursor: part.result.next_cursor }), e => e.code === "STALE_CURSOR");
  await f.mutate(f.input("append", undefined, 1), current => ({ entity: { ...current, observations: [...current.observations, { ...observation("last"), sequence: 25 }] }, result: {} }));
  await assert.rejects(f.module.readPacketReviewState(f.currentContext, { entity_type: "packet_attempt", entity_ref: f.attempt.attempt_id, cursor: part.result.next_cursor }), e => e.code === "STALE_CURSOR");
});

test("cancellation and source change during a mutation never install a partial write", async t => {
  const f = await fixture(t);
  const before = await f.bytes();
  const controller = new globalThis.AbortController();
  await assert.rejects(f.mutate(f.input("cancel"), () => {
    controller.abort();
    return { entity: f.attempt, result: {} };
  }, controller.signal), e => e.name === "AbortError");
  assert.equal(await f.bytes(), before);
  await assert.rejects(f.mutate(f.input("drift"), async () => {
    await writeFile(join(f.project, "input.txt"), "Drift during write.\n");
    return { entity: f.attempt, result: {} };
  }), e => e.code === "CONFLICT");
  assert.equal(await f.bytes(), before);
  assert.equal((await readdir(join(f.project, f.directory))).some(name => name.endsWith(".tmp") || name.endsWith(".workflow-lock")), false);
});

test("journal overflow fails before replacement without pruning history", async t => {
  const f = await fixture(t);
  const value = parse(await f.bytes());
  value.extensions.padding = "x".repeat(16 * 1024 * 1024 - Buffer.byteLength(await f.bytes()) - 400);
  await writeFile(f.path, stringify(value));
  const before = await f.bytes();
  assert.ok(Buffer.byteLength(before) < 16 * 1024 * 1024);
  await assert.rejects(f.mutate(f.input("create"), () => ({ entity: f.attempt, result: {} })), e => e.code === "SOURCE_LIMIT");
  assert.equal(await f.bytes(), before);
});

test("an absent journal is read without writes and initialized only by an explicit mutation", async t => {
  const project = await mkdtemp(join(tmpdir(), "packet-empty-"));
  t.after(() => rm(project, { recursive: true, force: true }));
  const { openContext, result } = await import("../dist/state.js");
  const module = await import("../dist/packet-review-state.js");
  const context = (await result(await openContext(project, "fixture"), {})).context;
  assert.deepEqual(JSON.parse((await module.readPacketReviewState(context)).result.text), { schema_version: 1, runs: [], packet_attempts: [] });
  assert.deepEqual(await readdir(project), []);
  // The owning scenario supplies validated logical inputs; storage never invents approval.
  await mkdir(join(project, "docs/specs/fixture"), { recursive: true });
  const binding = { source_version: "a".repeat(64), behavioral_source_version: "b".repeat(64), specification_version: "c".repeat(64) };
  const attempt = { attempt_id: "a1", packet_id: "p1", behavioral_source_version: binding.behavioral_source_version,
    specification_version: binding.specification_version, agreement_ref: { id: "fixture-agreement", revision: 1 },
    proposal_digest: "d".repeat(64), required_kinds: [], observations: [], completion_state: "running",
    required_check_status: "missing", restoration_status: "not_required" };
  await module.mutatePacketReviewState(context, "fixture-start", {
    operation_id: "start", entity_type: "packet_attempt", entity_ref: "a1", expected_revision: 0, ...binding, payload: {},
  }, { source: async () => binding, apply: () => ({ entity: attempt, result: {} }) });
  const ledger = parse(await readFile(join(project, "docs/specs/fixture/decisions.yaml"), "utf8"));
  assert.deepEqual(ledger.decisions, []);
  assert.equal(ledger.spec_slug, "fixture");
  assert.equal(ledger.extensions.packet_review.packet_attempts.length, 1);
  assert.equal(ledger.specification_reviews, undefined);
});

test("a held crash lock is preserved and an aborted waiter has no effect", async t => {
  const f = await fixture(t);
  const lockPath = `${f.path}.workflow-lock`;
  const lock = await open(lockPath, "wx");
  try {
    const signal = globalThis.AbortSignal.timeout(50);
    const before = await f.bytes();
    await assert.rejects(f.mutate(f.input("waiter"), () => assert.fail(), signal), e => ["AbortError", "TimeoutError"].includes(e.name));
    assert.equal(await f.bytes(), before);
    assert.ok((await readdir(join(f.project, f.directory))).includes("decisions.yaml.workflow-lock"));
  } finally {
    await lock.close();
    await unlink(lockPath);
  }
});

test("a failed atomic replacement leaves no acknowledgment or temporary file", async t => {
  const f = await fixture(t);
  const before = await f.bytes();
  const fs = createRequire(import.meta.url)("node:fs/promises");
  const originalRename = fs.rename;
  let replacementObserved = false;
  fs.rename = async (from, to) => {
    if (to === f.path) {
      replacementObserved = true;
      throw Object.assign(new Error("Fixture replacement failure."), { code: "EIO" });
    }
    return originalRename(from, to);
  };
  syncBuiltinESMExports();
  try {
    await assert.rejects(f.mutate(f.input("fail-save"), () => ({ entity: f.attempt, result: {} })), e => e.code === "EIO");
    assert.equal(replacementObserved, true);
    assert.equal(await f.bytes(), before);
    const names = await readdir(join(f.project, f.directory));
    assert.equal(names.some(name => name.endsWith(".tmp") || name.endsWith(".workflow-lock")), false);
    const state = JSON.parse((await f.module.readPacketReviewState(f.currentContext)).result.text);
    assert.deepEqual(state.packet_attempts, []);
  } finally {
    fs.rename = originalRename;
    syncBuiltinESMExports();
  }
});

test("state reads and appends never launch commands or provision investigation resources", async t => {
  const f = await fixture(t);
  const children = createRequire(import.meta.url)("node:child_process");
  const methods = ["exec", "execFile", "execSync", "execFileSync", "spawn", "spawnSync", "fork"];
  const originals = new Map(methods.map(name => [name, children[name]]));
  const calls = [];
  const beforeProject = await readdir(f.project);
  const beforeSpecification = await readdir(join(f.project, f.directory));
  for (const name of methods) children[name] = () => { calls.push(name); return Buffer.alloc(0); };
  syncBuiltinESMExports();
  try {
    await f.mutate(f.input("create"), () => ({ entity: { ...f.attempt, observations: [observation("red")] }, result: {} }));
    await f.selected();
    assert.equal(calls.length, 0, "Storage must not execute commands recorded as evidence.");
    assert.deepEqual(await readdir(f.project), beforeProject);
    assert.deepEqual(await readdir(join(f.project, f.directory)), beforeSpecification);
  } finally {
    for (const [name, original] of originals) children[name] = original;
    syncBuiltinESMExports();
  }
});

test("run events retain independent evidence and reject foreign entity references", async t => {
  const f = await fixture(t);
  const run = reviewRun(f, {
    executions: [{
      execution_id: "check-one", operation_id: "check-one", actor_ref: "security", phase: "fact_collection",
      question_ref: "safe-input", source_version: f.binding.source_version, environment_ref: "existing-fixture",
      evidence_kind: "new_execution", command_ref: "node --test fixture.test.mjs", working_directory_ref: ".", source_refs: [],
      status: "passed", expected: "Input is rejected.", observed: "Input was rejected.", assertion_observed: true,
      restoration_status: "not_required", effective_limit_ms: 1000,
    }],
  });
  const input = { ...f.input("run-create", "run-one"), entity_type: "run" };
  await f.mutate(input, () => ({ entity: run, result: {} }));
  const event = { event_id: "e1", operation_id: "prepared", kind: "prepared", source_version: f.binding.source_version,
    entity_ref: "run-one", payload_digest: "a".repeat(64), sequence: 1, observed_at: "2026-10-27T09:00:00Z" };
  const next = { ...input, operation_id: "run-event", expected_revision: 1 };
  await f.mutate(next, current => ({ entity: { ...current, events: [event] }, result: {} }));
  const before = await f.bytes();
  await assert.rejects(f.mutate({ ...next, operation_id: "foreign-event", expected_revision: 2 }, current => ({
    entity: { ...current, events: [...current.events, { ...event, event_id: "e2", operation_id: "foreign", entity_ref: "another-run", sequence: 2 }] }, result: {},
  })), e => e.code === "BROKEN_REFERENCE");
  await assert.rejects(f.mutate({ ...next, operation_id: "erase", expected_revision: 2 }, () => ({ entity: run, result: {} })), e => e.code === "CONFLICT");
  await assert.rejects(f.mutate({ ...next, operation_id: "rewrite-execution", expected_revision: 2 }, current => ({
    entity: { ...current, executions: [{ ...current.executions[0], observed: "Invented replacement observation." }] }, result: {},
  })), e => e.code === "CONFLICT", "Terminal execution evidence must remain immutable.");
  assert.equal(await f.bytes(), before);
});
