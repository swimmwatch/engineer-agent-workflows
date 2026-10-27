import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const harnessScript = new URL("../../exports/deepseek-harness/skills/spec-driven-development/workflows/specification-review.js", import.meta.url);
const claudeScript = new URL("../../plugins/claude-code/engineer-agent-workflows/skills/spec-driven-development/workflows/specification-review.js", import.meta.url);

function compactGroup(group) {
  function member(item) {
    return { item_index: item.item_index, weight: item.weight,
      characters: item.characters, recorded: item.recorded };
  }
  return { ...group, items_cursor: null, items: group.items.map(member) };
}

function compactAcknowledgment(acknowledgment, target, group, items) {
  assert.equal(acknowledgment.saved, true);
  assert.equal(acknowledgment.review_ref, target.review_ref);
  assert.equal(acknowledgment.source_version, target.source_version);
  function member(item) {
    const assigned = group.items.find((candidate) => candidate.item_index === item.item_index);
    const submitted = items.find((candidate) => candidate.item_index === item.item_index);
    assert.equal(item.item_key, assigned?.item_key);
    assert.equal(item.verdict, submitted?.verdict);
    return { item_index: item.item_index, verdict: item.verdict };
  }
  return { saved: acknowledgment.saved, recorded_items: acknowledgment.recorded_items,
    batch_size: acknowledgment.batch_size, lock_wait_ms: acknowledgment.lock_wait_ms,
    items: acknowledgment.items.map(member) };
}

// Controlled protocol actors only: no language model or native engine is invoked.
// Actual MCP processes own every source, receipt, validation and persisted effect.
export async function createReviewProtocolRunner(fixture, options = {}) {
  const trace = [];
  const actors = [];
  const reads = [];
  const assessments = [];
  const pendingWaiters = new Set();
  const activeAgents = new Set();
  let fatalError;
  let nextActorId = 0;
  const validator = new Ajv({ allErrors: true });
  const scriptUrl = options.host === "claude" ? claudeScript : harnessScript;
  const reviewerUrl = new URL("../references/completeness-review.md", scriptUrl);
  const reviewerReference = fileURLToPath(reviewerUrl);
  const reviewerText = await readFile(reviewerUrl, "utf8");
  assert.doesNotMatch(reviewerText, /\{\{HOST_/);
  const script = await readFile(scriptUrl, "utf8");
  let body = script;
  if (options.host === "claude") {
    const prefix = "export const meta = ";
    assert.ok(script.startsWith(prefix));
    const boundary = script.indexOf(";\n");
    const declaration = script.slice(prefix.length, boundary);
    const metadata = JSON.parse(declaration);
    assert.equal(metadata.name, "specification-review");
    body = script.slice(boundary + 2);
  }
  const execute = new AsyncFunction("args", "agent", "parallel", "phase", "log", body);

  function event(kind, data = {}) {
    const value = { seq: trace.length, kind, ...data };
    trace.push(value);
    for (const waiter of pendingWaiters) waiter.inspect(value);
    return value;
  }

  function waitFor(predicate, timeout = 15_000) {
    const found = trace.find(predicate);
    if (found) return Promise.resolve(found);
    function register(resolve, reject) {
      const timer = setTimeout(expire, timeout);
      const waiter = { inspect };
      function expire() {
        pendingWaiters.delete(waiter);
        reject(new assert.AssertionError({ message: "Protocol trace did not reach its expected boundary.",
          actual: false, expected: true, operator: "==" }));
      }
      function inspect(value) {
        if (!predicate(value)) return;
        clearTimeout(timer);
        pendingWaiters.delete(waiter);
        resolve(value);
      }
      pendingWaiters.add(waiter);
    }
    return new Promise(register);
  }

  async function actor(role, job) {
    const identity = `${role}-${nextActorId}`;
    nextActorId += 1;
    const client = await fixture.actor(`p03-${identity}-simulation`);
    let context;
    async function rpc(name, input = {}) {
      const projectBased = name === "specification_review_prepare_workflow" || name === "specification_open";
      const arguments_ = { ...(!projectBased && context ? { context } : {}), ...input };
      event("call", { actor: identity, role, name, review_ref: arguments_.review_ref,
        item_index: arguments_.item_index, stage: arguments_.stage,
        indices: arguments_.items?.map((item) => item.item_index) });
      const response = await client.raw(name, arguments_);
      const payload = response.structuredContent;
      assert.ok(Buffer.byteLength(JSON.stringify(response)) <= 64 * 1024);
      assert.ok(Buffer.byteLength(JSON.stringify(payload)) <= 24 * 1024);
      event("response", { actor: identity, role, name, error: response.isError === true,
        code: payload.error?.code, bytes: Buffer.byteLength(JSON.stringify(response)) });
      if (response.isError) {
        throw Object.assign(new Error(`MCP ${name}: ${payload.error.code}`), { code: payload.error.code });
      }
      context = payload.context ?? context;
      return payload;
    }
    const state = { identity, role, client, rpc, context: () => context, job, acknowledgments: [] };
    actors.push(state);
    return state;
  }

  async function readItem(state, target, itemIndex, kind = state.role) {
    const portions = [];
    let cursor;
    let last;
    let offset = 0;
    do {
      const payload = await state.rpc("specification_review_get", {
        review_ref: target.review_ref, item_index: itemIndex, ...(cursor ? { cursor } : {}),
      });
      last = payload.result;
      assert.equal(last.offset, offset);
      offset += Array.from(last.text).length;
      assert.ok(Array.from(last.text).length <= 4096);
      if (!last.complete) {
        assert.equal(last.read_receipt, null);
        assert.ok(last.next_cursor);
      }
      portions.push(last.text);
      cursor = last.next_cursor;
    } while (cursor);
    assert.equal(last.complete, true);
    assert.ok(last.read_receipt || last.consistency_read_receipt);
    const text = portions.join("");
    const payload = JSON.parse(text);
    const read = { actor: state.identity, kind, item_index: itemIndex,
      target: { ...target }, text, payload, last, portions: portions.length };
    reads.push(read);
    event("read-complete", { actor: state.identity, role: state.role, kind_read: kind,
      item_index: itemIndex, portions: portions.length });
    return read;
  }

  async function detailed(state, job) {
    const prepared = await state.rpc("specification_review_prepare_workflow", {
      ...job.target, cursor: job.metadata_cursor,
    });
    if (prepared.result.status === "blocked") {
      const codes = prepared.result.reasons.map((reason) => reason.code);
      event("preparation-blocked", { actor: state.identity, role: state.role, codes });
      return { status: codes.includes("STALE_REVIEW") ? "stale" : "incomplete",
        review_ref: job.target.review_ref, source_version: job.target.source_version,
        cursor: job.cursor, group: null, acknowledgments: [], unknown_effects: false, expansion: null };
    }
    assert.equal(prepared.result.status, "ready_to_run");
    const group = structuredClone(prepared.result.args.lanes[0]);
    for (let cursor = group.items_cursor; cursor;) {
      const next = await state.rpc("specification_review_prepare_workflow", { ...job.target, cursor });
      const portion = next.result.args.lanes[0];
      group.items.push(...portion.items);
      cursor = portion.items_cursor;
    }
    assert.equal(group.items.length, group.item_count);
    event("group", { actor: state.identity, lane: job.lane, group_index: group.group_index,
      indices: group.items.map((item) => item.item_index), weight: group.weight });
    const acknowledgments = [];
    let batch = [];
    async function submit() {
      const items = batch;
      batch = [];
      if (options.beforeSubmit) await options.beforeSubmit({ state, job, group, items });
      const saved = await state.rpc("specification_review_submit_batch", {
        review_ref: job.target.review_ref, source_version: job.target.source_version,
        group_ref: group.group_ref, items,
      });
      state.acknowledgments.push(saved);
      event("saved", { actor: state.identity, lane: job.lane, indices: items.map((item) => item.item_index) });
      if (options.afterSave) await options.afterSave({ state, job, group, items, saved });
      const acknowledgment = compactAcknowledgment(saved.result, job.target, group, items);
      acknowledgments.push(acknowledgment);
      event("ack", { actor: state.identity, lane: job.lane, indices: items.map((item) => item.item_index) });
    }
    for (const item of group.items) {
      if (item.recorded) continue;
      const read = await readItem(state, job.target, item.item_index);
      const result = fixture.verdict(item.item_index, read);
      if (options.judge) {
        const judgment = await options.judge(read, state);
        Object.assign(result, judgment);
      }
      batch.push(result);
      if (batch.length === (options.batchSize ?? 20)) await submit();
    }
    if (batch.length) await submit();
    const expansion = options.requestExpansion ? await options.requestExpansion({ state, job, group }) : null;
    return { status: expansion ? "expand" : "saved", review_ref: job.target.review_ref, source_version: job.target.source_version,
      cursor: job.cursor, group: compactGroup(group), acknowledgments, unknown_effects: false, expansion };
  }

  async function final(state, job) {
    const prepared = await state.rpc("specification_review_prepare_workflow", { ...job.target, stage: "final" });
    assert.equal(prepared.result.status, "ready_to_run");
    if (prepared.result.next_stage === "final_assessment") {
      let references = prepared.result.args.required_results;
      for (;;) {
        if (options.onRequiredPage) await options.onRequiredPage({ state, job, references });
        if (job.mode === "followup") {
          for (const reference of references.items) await readItem(state, job.target, reference.item_index, "required-result");
        }
        if (!references.next_cursor) break;
        const next = await state.rpc("specification_review_prepare_workflow", {
          ...job.target, stage: "final", cursor: references.next_cursor,
        });
        references = next.result.args.required_results;
      }
      const read = await readItem(state, job.target, prepared.result.args.consistency_item_index, "consistency");
      if (options.beforeConsistency) await options.beforeConsistency({ state, job, prepared, read });
      const verdict = options.finalVerdict ?? "consistent";
      const assessment = { review_ref: job.target.review_ref, read_receipt: read.last.consistency_read_receipt,
        verdict, explanation: "Simulation-only complete-context protocol assessment.",
        ...(verdict === "consistent" ? {} : { counterexample: "Simulation-only cross-section conflict." }) };
      await state.rpc("specification_review_consistency_record", assessment);
      assessments.push({ actor: state.identity, input: assessment, target: job.target });
      event("consistency-saved", { actor: state.identity });
      if (options.afterConsistency) await options.afterConsistency({ state, job, prepared, read });
    }
    const completion = await state.rpc("specification_review_complete", { review_ref: job.target.review_ref });
    if (options.afterCompletion) await options.afterCompletion({ state, job, completion });
    return { status: "completed", pagination: job.pagination,
      review_ref: job.target.review_ref, source_version: job.target.source_version,
      completion, expansion: null, scope_expansion: null };
  }

  async function performAgent(prompt, nativeOptions) {
    const marker = "Assignment:\n";
    const offset = prompt.lastIndexOf(marker);
    assert.ok(offset >= 0);
    const serialized = prompt.slice(offset + marker.length);
    const job = JSON.parse(serialized);
    const state = await actor(job.kind, job);
    event("actor-start", { actor: state.identity, role: job.kind, lane: job.lane });
    try {
      let result;
      if (job.kind === "final" && options.finalReply) result = await options.finalReply({ state, job });
      else result = job.kind === "detailed" ? await detailed(state, job) : await final(state, job);
      const validateResult = validator.compile(nativeOptions.schema);
      const valid = validateResult(result);
      assert.equal(valid, true, "Controlled actor must match the actual body output schema.");
      return result;
    } catch (error) {
      event("actor-error", { actor: state.identity, role: job.kind, code: error.code, message: error.message });
      if (error.fatal === true) {
        fatalError = error;
        throw error;
      }
      return null;
    } finally {
      await state.client.harness.close();
      event("actor-end", { actor: state.identity, role: job.kind });
    }
  }

  function agent(prompt, nativeOptions) {
    if (fatalError) throw fatalError;
    const pending = performAgent(prompt, nativeOptions);
    activeAgents.add(pending);
    function forget() { activeAgents.delete(pending); }
    pending.then(forget, forget);
    return pending;
  }

  async function parallel(thunks) {
    async function invoke(thunk) {
      try { return await thunk(); } catch (error) {
        if (error.fatal === true) throw error;
        return null;
      }
    }
    return Promise.all(thunks.map(invoke));
  }
  function phase(title) { event("phase", { title }); }
  function log(message) { event("log", { message }); }

  async function run(settings = {}) {
    fatalError = undefined;
    const target = { ...fixture.target, ...(settings.target ?? {}) };
    const parent = await actor("parent", { target });
    const prepared = await parent.rpc("specification_review_prepare_workflow", target);
    if (prepared.result.status === "completed") return { status: "completed", outcome: prepared.result.outcome, prepared };
    if (prepared.result.status === "blocked") return { status: "incomplete", next_action: "resolve_preparation_blocker", prepared };
    if (prepared.result.next_stage === "completion_only") {
      const completed = await parent.rpc("specification_review_complete", { review_ref: target.review_ref });
      return { status: "completed", outcome: completed.result.coverage_status, prepared };
    }
    event("host-check", { available: settings.available !== false, routes: settings.routes !== false });
    if (settings.available === false || settings.routes === false) return { status: "incomplete", next_action: "resolve_host_capability", prepared };
    const args = { target, prepared, reviewer_reference: reviewerReference,
      host: { available: true, concurrency: target.host_concurrency,
        pagination: { same_actor: settings.programmatic === true, tools: settings.programmatic === true,
          context: settings.programmatic === true, results: settings.programmatic === true } },
      roles: { judge: { model: "simulation-only-judge" }, final: { model: "simulation-only-final" } } };
    if (options.beforeLaunch) await options.beforeLaunch({ parent, target, prepared });
    event("native-start", { actor: parent.identity, target });
    let workflow;
    let failure;
    try {
      workflow = await execute(args, agent, parallel, phase, log);
    } catch (error) {
      failure = error;
    } finally {
      while (activeAgents.size) await Promise.allSettled([...activeAgents]);
    }
    if (failure) {
      event("native-error", { actor: parent.identity, name: failure.name });
      throw failure;
    }
    event("native-end", { actor: parent.identity, status: workflow.status });
    if (workflow.next_action === "verify_review_completion") {
      const verified = await parent.rpc("specification_review_prepare_workflow", target);
      if (verified.result.status === "completed") return { status: "completed", outcome: verified.result.outcome, workflow, prepared, verified };
      return { status: "incomplete", workflow, prepared, verified };
    }
    return { ...workflow, workflow, prepared };
  }

  return { run, trace, actors, reads, assessments, waitFor };
}

export async function readCorrectionEvidence(fixture, reviewRef) {
  await fixture.author.call("specification_open", { project: fixture.project, specification: fixture.specification });
  const entries = [];
  let cursor;
  let navigation;
  do {
    navigation = await fixture.author.call("specification_review_changes_summary", {
      review_ref: reviewRef, ...(cursor ? { cursor } : {}),
    });
    assert.equal(navigation.changes_receipt, undefined);
    entries.push(...navigation.entries);
    cursor = navigation.next_cursor;
  } while (cursor);
  const fields = new Map();
  let last;
  do {
    last = await fixture.author.call("specification_review_changes_read", {
      review_ref: reviewRef, report_version: navigation.report_version, ...(cursor ? { cursor } : {}),
    });
    const fragment = last.fragment;
    if (fragment) {
      const key = `${fragment.evidence_selector}\0${fragment.field}`;
      const field = fields.get(key) ?? { ...fragment, text: "" };
      assert.equal(fragment.offset, Array.from(field.text).length);
      field.text += fragment.text;
      fields.set(key, field);
    }
    if (!last.complete) assert.equal(last.changes_receipt, null);
    cursor = last.next_cursor;
  } while (cursor);
  assert.ok(last.changes_receipt);
  const records = new Map();
  for (const field of fields.values()) {
    const record = records.get(field.evidence_selector) ?? {};
    const value = field.value_type === "string" ? field.text : JSON.parse(field.text);
    record[field.field] = value;
    records.set(field.evidence_selector, record);
  }
  return { navigation: { ...navigation, entries }, records, changes_receipt: last.changes_receipt };
}
