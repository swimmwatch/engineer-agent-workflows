import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import Ajv from "ajv";

const bodyUrl = new URL(
  "../skills/spec-driven-development/workflows/specification-review.body.js",
  import.meta.url,
);
const metaUrl = new URL(
  "../skills/spec-driven-development/workflows/specification-review.meta.json",
  import.meta.url,
);

function compactGroupMetadata(group) {
  function compactItem(item) {
    return {
      item_index: item.item_index,
      weight: item.weight,
      characters: item.characters,
      recorded: item.recorded,
    };
  }
  return { ...group, items: group.items.map(compactItem) };
}

function compactSavedAcknowledgment(acknowledgment, target, group) {
  assert.equal(acknowledgment.review_ref, target.review_ref);
  assert.equal(acknowledgment.source_version, target.source_version);
  assert.equal(acknowledgment.saved, true);
  function compactItem(item) {
    const assigned = group.items.find((candidate) => candidate.item_index === item.item_index);
    assert.equal(assigned?.item_key, item.item_key);
    return { item_index: item.item_index, verdict: item.verdict };
  }
  return {
    saved: acknowledgment.saved,
    recorded_items: acknowledgment.recorded_items,
    batch_size: acknowledgment.batch_size,
    lock_wait_ms: acknowledgment.lock_wait_ms,
    items: acknowledgment.items.map(compactItem),
  };
}

function assertCompletionVerification(result, outcome = "reviewed") {
  assert.equal(result?.status, "incomplete", JSON.stringify(result));
  assert.equal(result.next_action, "verify_review_completion");
  assert.equal(result.reported_outcome, outcome);
  assert.equal(result.final_effect, "unverified");
}

function deferred() {
  let resolve;
  const promise = new Promise((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}

// Simulation-only semantic judgments. This models the native hook boundary, not
// a provider, receipt authentication, model comprehension, or real MCP persistence.
function fixture(lengths = Array(40).fill(1), options = {}) {
  const source = "a".repeat(64);
  const target = {
    project: "/fixture",
    specification: "sample",
    review_ref: "review-1",
    source_version: source,
    host_concurrency: options.concurrency ?? 4,
  };
  const items = lengths.map((characters, item_index) => ({
    item_index,
    item_key: `requirement:R${item_index}`,
    characters,
    weight: Math.max(1, Math.ceil(characters / 4096)),
    recorded: false,
  }));
  const weight = items.reduce((sum, item) => sum + item.weight, 0);
  const lanes = items.length
    ? Math.min(4, target.host_concurrency, items.length, Math.ceil(weight / 20))
    : 0;
  const groups = [];
  const loads = Array(lanes).fill(0);
  for (let index = 0; index < items.length;) {
    const members = [];
    let groupWeight = 0;
    while (index < items.length && members.length < 20) {
      const item = items[index];
      if (members.length && groupWeight + item.weight > 20) break;
      members.push(item);
      groupWeight += item.weight;
      index++;
    }
    const lane = loads.indexOf(Math.min(...loads));
    loads[lane] += groupWeight;
    groups.push({
      lane_index: lane,
      group_index: groups.length,
      group_ref: `group-${groups.length}`,
      item_count: members.length,
      weight: groupWeight,
      items: members,
      items_cursor: null,
      next_cursor: null,
    });
  }
  for (const group of groups) {
    const next = groups.find(
      (candidate) =>
        candidate.group_index > group.group_index && candidate.lane_index === group.lane_index,
    );
    group.next_cursor = next ? `cursor-${next.group_index}` : null;
  }
  const prepared = {
    protocol_version: 2,
    context: "opaque-physical-context",
    replayed: false,
    result: {
      status: "ready_to_run",
      next_stage: items.length ? "detailed" : "final_assessment",
      mode: options.mode ?? "full",
      review_ref: target.review_ref,
      source_version: source,
      saved_items: options.carried ?? 0,
      remaining_items: items.length,
      total_items: items.length + (options.carried ?? 0) + 1,
      args: {
        ...target,
        specification_version: "b".repeat(64),
        workload: {
          pending_items: items.length,
          total_weight: weight,
          coefficient: 20,
          lane_count: lanes,
          initial_saved_items: options.carried ?? 0,
        },
        lanes: groups.filter(
          (group) =>
            groups.find((candidate) => candidate.lane_index === group.lane_index) === group,
        ),
      },
    },
  };
  delete prepared.result.args.host_concurrency;
  const args = {
    reviewer_reference: "/fixture-skill/references/completeness-review.md",
    target,
    prepared,
    host: { available: true, concurrency: target.host_concurrency },
    roles: {
      judge: { provider: "fixture", model: "judge" },
      final: { provider: "fixture", model: "final" },
    },
  };
  const events = [];
  const saved = new Set();
  const schemaValidator = options.validateSchemas ? new Ajv({ allErrors: true }) : null;
  let active = 0;
  let peak = 0;
  let consistencySaved = false;
  let completed = false;

  function acknowledgment(group, members) {
    return {
      review_ref: target.review_ref,
      source_version: source,
      saved: true,
      recorded_items: saved.size,
      batch_size: members.length,
      lock_wait_ms: 0,
      items: members.map((item) => ({
        item_index: item.item_index,
        item_key: item.item_key,
        verdict: "covered",
      })),
    };
  }

  async function judge(job) {
    let assigned = job.group;
    if (!assigned) {
      const groupIndex = Number(job.cursor.slice("cursor-".length));
      assigned = groups[groupIndex];
    }
    const group = structuredClone(assigned);
    events.push({ kind: "metadata", group: group.group_index });
    const pendingMembers = group.items.filter((item) => !item.recorded);
    for (const item of pendingMembers) {
      const original = "😀".repeat(item.characters);
      const points = [...original];
      const pages = Math.max(1, Math.ceil(points.length / 4096));
      const consumed = job.reading?.all_portions === true ? pages : 1;
      const complete = consumed === pages && job.reading?.terminal_receipts === true;
      events.push({
        kind: "exact-read",
        index: item.item_index,
        actor: group.group_index,
        complete,
        pages: consumed,
      });
      if (!complete)
        return {
          status: "incomplete",
          ...target,
          cursor: job.cursor,
          group: compactGroupMetadata(group),
          acknowledgments: [],
          unknown_effects: false,
          expansion: null,
        };
    }
    if (job.reading?.pending_only !== true && options.carried) {
      events.push({ kind: "inherited-read", count: options.carried });
    }
    if (job.reading?.review_only !== true) events.push({ kind: "specification-edit" });
    const acknowledgments = [];
    const batchSize = options.batchSize ?? 20;
    for (let offset = 0; offset < pendingMembers.length; offset += batchSize) {
      const members = pendingMembers.slice(offset, offset + batchSize);
      for (const item of members) saved.add(item.item_index);
      events.push({
        kind: "saved",
        group: group.group_index,
        indexes: members.map((item) => item.item_index),
      });
      const savedAcknowledgment = acknowledgment(group, members);
      acknowledgments.push(compactSavedAcknowledgment(savedAcknowledgment, target, group));
    }
    return {
      status: "saved",
      review_ref: target.review_ref,
      source_version: source,
      cursor: job.cursor,
      group: compactGroupMetadata(group),
      acknowledgments,
      unknown_effects: false,
      expansion: null,
    };
  }

  async function final(job) {
    events.push({ kind: "final-prepare", actor: "final" });
    if (saved.size !== items.length)
      return { status: "incomplete", completion: null, expansion: null };
    const pagination = job.pagination;
    if (
      job.reading?.whole_context !== true ||
      job.reading?.mandatory_outcomes !== true ||
      job.reading?.all_portions !== true ||
      job.reading?.terminal_receipts !== true
    ) {
      return { status: "incomplete", ...target, completion: null, expansion: null };
    }
    for (let page = 0; page < 3; page++)
      events.push({ kind: "final-read", page, pagination, actor: "final" });
    events.push({ kind: "consistency", actor: "final" });
    consistencySaved = true;
    const outcome = options.gaps ? "gaps" : "reviewed";
    completed = true;
    events.push({ kind: "complete", actor: "final", outcome });
    return {
      status: "completed",
      pagination: job.pagination,
      review_ref: target.review_ref,
      source_version: source,
      completion: {
        protocol_version: 2,
        context: "opaque-final-context",
        replayed: false,
        result: {
          review_ref: target.review_ref,
          source_version: source,
          coverage_status: outcome,
          semantic_correctness_proven: false,
          reviewer_independence_authenticated: false,
          approved_by_tool: false,
        },
      },
      expansion: null,
      scope_expansion: null,
    };
  }

  async function agent(prompt, hookOptions) {
    const job = JSON.parse(prompt.split("\nAssignment:\n").at(-1));
    const start = {
      kind: "start",
      role: job.kind,
      group: job.group?.group_index ?? job.cursor,
      model: hookOptions.model,
    };
    events.push(start);
    active++;
    peak = Math.max(peak, active);
    try {
      if (options.assertSchema) {
        const schemaText = JSON.stringify(hookOptions.schema);
        const schema = JSON.parse(schemaText);
        options.assertSchema(schema, job.kind);
      }
      const work = () => (job.kind === "detailed" ? judge(job) : final(job));
      const result = options.agent
        ? await options.agent({ job, hookOptions, work, events, saved })
        : await work();
      if (schemaValidator) {
        const validator = schemaValidator.compile(hookOptions.schema);
        assert.equal(validator(result), true, JSON.stringify(validator.errors));
      }
      return result;
    } finally {
      active--;
      events.push({ kind: "settled", role: job.kind, group: start.group });
    }
  }

  async function run(overrides = {}) {
    const body = await readFile(bodyUrl, "utf8");
    const invocationArgs = overrides.args ?? structuredClone(args);
    const context = vm.createContext({
      args: invocationArgs,
      agent,
      parallel: (work) => Promise.all(work.map((start) => start())),
      phase: (title) => events.push({ kind: "phase", title }),
      log: (message) => events.push({ kind: "log", message }),
    });
    const wrappedBody = `(async () => {\n${overrides.body ?? body}\n})()`;
    const script = new vm.Script(wrappedBody);
    const result = await script.runInContext(context);
    return result === undefined ? null : JSON.parse(JSON.stringify(result));
  }
  return {
    args,
    target,
    items,
    groups,
    events,
    saved,
    run,
    judge,
    peak: () => peak,
    consistencySaved: () => consistencySaved,
    completed: () => completed,
  };
}

async function canonicalWorkflowSavesAllGroupsBeforeOneIndependentFinalActor() {
  const f = fixture();
  const result = await f.run();
  assertCompletionVerification(result);
  assert.equal(result.progress.acknowledged_items, 40);
  assert.equal(f.peak(), 2);
  const starts = f.events.filter((event) => event.kind === "start");
  assert.deepEqual(
    starts.map((event) => event.role),
    ["detailed", "detailed", "final"],
  );
  assert.ok(
    f.events.findIndex((event) => event.kind === "final-prepare") >
      f.events.findLastIndex((event) => event.kind === "saved"),
  );
}

test(
  "canonical workflow saves all groups before one independent final actor",
  canonicalWorkflowSavesAllGroupsBeforeOneIndependentFinalActor,
);

async function formulaAndWeightedServerGroupsRetainWholeUnicodeItemsAndActualHostCaps() {
  for (const [count, concurrency, expected] of [
    [0, 4, 0],
    [1, 4, 1],
    [15, 4, 1],
    [40, 4, 2],
    [100, 4, 4],
    [100, 2, 2],
    [201, 4, 4],
  ]) {
    const f = fixture(Array(count).fill(4096), { concurrency });
    const result = await f.run();
    assertCompletionVerification(result);
    assert.equal(f.saved.size, count);
    assert.ok(f.peak() <= Math.max(1, expected));
    assert.equal(f.args.prepared.result.args.workload.lane_count, expected);
    assert.equal(
      f.events.filter((event) => event.kind === "start" && event.role === "detailed").length,
      Math.ceil(count / 20),
    );
  }
  const lengths = [4097, 4096 * 21, 4096, 4096 * 18, 1, 1];
  const weighted = fixture(lengths);
  assert.deepEqual(
    weighted.groups.map((group) => group.items.map((item) => item.item_index)),
    [[0], [1], [2, 3, 4], [5]],
  );
  assertCompletionVerification(await weighted.run());
  assert.equal(weighted.saved.size, lengths.length);
}

test(
  "formula and weighted server groups retain whole Unicode items and actual host caps",
  formulaAndWeightedServerGroupsRetainWholeUnicodeItemsAndActualHostCaps,
);

async function lanesAdvanceIndependentlyWhileFinalJOINWaitsForEveryAcknowledgment() {
  const slow = deferred();
  const slowStarted = deferred();
  async function lanesAdvanceIndependentlyWhileFinalJOINWaitsForEveryAcknowledgmentActor({
    job,
    work,
  }) {
    if (job.kind === "detailed" && job.group?.group_index === 0) {
      slowStarted.resolve();
      await slow.promise;
    }
    const result = await work();
    return result;
  }
  const f = fixture(Array(121).fill(1), {
    agent: lanesAdvanceIndependentlyWhileFinalJOINWaitsForEveryAcknowledgmentActor,
  });
  const running = f.run();
  await slowStarted.promise;
  try {
    for (
      let turn = 0;
      turn < 20 && !f.events.some((event) => event.kind === "start" && event.group === "cursor-5");
      turn++
    ) {
      await new Promise((resolve) => setImmediate(resolve));
    }
    assert.equal(
      f.events.some((event) => event.kind === "start" && event.group === "cursor-5"),
      true,
    );
    assert.equal(
      f.events.some((event) => event.kind === "final-prepare"),
      false,
    );
  } finally {
    slow.resolve();
  }
  assertCompletionVerification(await running);
}

test(
  "lanes advance independently while final JOIN waits for every acknowledgment",
  lanesAdvanceIndependentlyWhileFinalJOINWaitsForEveryAcknowledgment,
);

async function badPreparationMissingHostAndMismatchedWeightsLaunchNoChild() {
  const changes = [
    (a) => {
      a.target.originals = "Source text is not a launch argument.";
    },
    (a) => {
      a.prepared.result.remaining_items = "invalid-count";
    },
    (a) => {
      a.host.available = false;
    },
    (a) => {
      a.prepared.result.args.source_version = "c".repeat(64);
    },
    (a) => {
      a.prepared.result.args.workload.coefficient = 19;
    },
    (a) => {
      a.prepared.result.args.workload.lane_count = 1;
    },
    (a) => {
      a.prepared.result.args.lanes[0].items[0].weight = 2;
    },
    (a) => {
      a.prepared.result.args.lanes[0].items[0].characters = 4097;
    },
    (a) => {
      a.prepared.result.args.lanes[0].items = [];
    },
    (a) => {
      a.prepared.result.args.lanes[0].original =
        "Undelivered source text must not enter a handoff.";
    },
  ];
  for (const change of changes) {
    const f = fixture();
    change(f.args);
    const result = await f.run();
    assert.notEqual(result.status, "completed");
    assert.equal(Number.isSafeInteger(result.progress.remaining_items), true);
    assert.equal(
      f.events.some((event) => event.kind === "start"),
      false,
    );
  }
}

test(
  "bad preparation, missing host and mismatched weights launch no child",
  badPreparationMissingHostAndMismatchedWeightsLaunchNoChild,
);

async function completedAndBlockedPreparationsNeedNeitherRoutesNorAJudgingChild() {
  for (const status of ["blocked", "completed"]) {
    const f = fixture();
    f.args.prepared.result = {
      status,
      review_ref: f.target.review_ref,
      source_version: f.target.source_version,
      outcome: "gaps",
    };
    delete f.args.roles;
    const result = await f.run();
    assert.equal(result.status, status === "completed" ? "completed" : "incomplete");
    if (status === "completed") assert.equal(result.outcome, "gaps");
    assert.equal(
      f.events.some((event) => event.kind === "start"),
      false,
    );
  }
}

test(
  "completed and blocked preparations need neither routes nor a judging child",
  completedAndBlockedPreparationsNeedNeitherRoutesNorAJudgingChild,
);

async function partialNullDuplicateForeignAndFabricatedSummariesCannotComplete() {
  const corruptions = [
    () => null,
    (value) => ({ ...value, review_ref: "foreign" }),
    (value) => ({ ...value, acknowledgments: [] }),
    (value) => ({
      ...value,
      acknowledgments: [...value.acknowledgments, value.acknowledgments[0]],
    }),
    (value) => {
      value.acknowledgments[0].saved = false;
      return value;
    },
    (value) => {
      value.acknowledgments[0].items[0].item_key = "foreign";
      return value;
    },
    (value) => {
      value.next_cursor = "forged";
      return value;
    },
  ];
  for (const corrupt of corruptions) {
    async function partialNullDuplicateForeignAndFabricatedSummariesCannotCompleteActor({
      job,
      work,
    }) {
      const result = await work();
      return job.kind === "detailed" ? corrupt(result) : result;
    }
    const f = fixture(Array(81).fill(1), {
      agent: partialNullDuplicateForeignAndFabricatedSummariesCannotCompleteActor,
    });
    const result = await f.run();
    assert.notEqual(result.status, "completed");
    assert.equal(
      f.events.some((event) => event.kind === "final-prepare"),
      false,
    );
    assert.ok(result.progress.unknown_items > 0);
  }
}

test(
  "partial, null, duplicate, foreign and fabricated summaries cannot complete",
  partialNullDuplicateForeignAndFabricatedSummariesCannotComplete,
);

async function splitSubmissionsRetainAllActualAcknowledgmentsAndGapsDoNotStopOtherGroups() {
  const f = fixture(Array(81).fill(1), { batchSize: 3, gaps: true });
  const result = await f.run();
  assertCompletionVerification(result, "gaps");
  assert.equal(result.progress.acknowledged_items, 81);
  assert.ok(f.events.filter((event) => event.kind === "saved").length > f.groups.length);
}

test(
  "split submissions retain all actual acknowledgments and gaps do not stop other groups",
  splitSubmissionsRetainAllActualAcknowledgmentsAndGapsDoNotStopOtherGroups,
);

async function inFlightFailureStopsDispatchWaitsForSettlementAndPreservesSavedVersusUnknown() {
  const failing = deferred();
  const other = deferred();
  async function inFlightFailureStopsDispatchWaitsForSettlementAndPreservesSavedVersusUnknownActor({
    job,
    work,
  }) {
    if (job.kind === "detailed" && job.group?.group_index === 0) {
      await failing.promise;
      return null;
    }
    await other.promise;
    return work();
  }
  const f = fixture(Array(121).fill(1), {
    agent: inFlightFailureStopsDispatchWaitsForSettlementAndPreservesSavedVersusUnknownActor,
  });
  const running = f.run();
  while (f.events.filter((event) => event.kind === "start").length < 4)
    await new Promise((resolve) => setImmediate(resolve));
  failing.resolve();
  await new Promise((resolve) => setImmediate(resolve));
  other.resolve();
  const result = await running;
  assert.equal(result.status, "incomplete");
  assert.equal(f.events.filter((event) => event.kind === "start").length, 4);
  assert.equal(f.events.filter((event) => event.kind === "settled").length, 4);
  assert.equal(result.progress.acknowledged_items, 60);
  assert.equal(result.progress.unknown_items, 20);
}

test(
  "in-flight failure stops dispatch, waits for settlement and preserves saved versus unknown",
  inFlightFailureStopsDispatchWaitsForSettlementAndPreservesSavedVersusUnknown,
);

async function metadataBlockedBeforeAWriteReportsStaleWorkWithoutInventingAGroupOrUnknownSave() {
  const f = fixture([1], {
    validateSchemas: true,
    agent: async ({ job }) => ({
      status: "stale",
      review_ref: job.target.review_ref,
      source_version: job.target.source_version,
      cursor: job.cursor,
      group: null,
      acknowledgments: [],
      unknown_effects: false,
      expansion: null,
    }),
  });
  const result = await f.run();
  assert.equal(result.status, "stale");
  assert.equal(result.progress.unknown_items, 0);
  assert.equal(result.progress.remaining_items, 1);
}

test(
  "metadata blocked before a write reports stale work without inventing a group or unknown save",
  metadataBlockedBeforeAWriteReportsStaleWorkWithoutInventingAGroupOrUnknownSave,
);

async function splitResponseLossRetainsSavedAcknowledgmentsAndReconcilesBeforeAnotherInvocation() {
  async function splitResponseLossRetainsSavedAcknowledgmentsAndReconcilesBeforeAnotherInvocationActor({
    job,
    work,
  }) {
    const result = await work();
    return job.kind === "detailed"
      ? {
          ...result,
          status: "incomplete",
          acknowledgments: result.acknowledgments.slice(0, 1),
          unknown_effects: true,
        }
      : result;
  }
  const first = fixture(Array(20).fill(1), {
    batchSize: 3,
    agent: splitResponseLossRetainsSavedAcknowledgmentsAndReconcilesBeforeAnotherInvocationActor,
  });
  const result = await first.run();
  assert.equal(result.status, "incomplete");
  assert.equal(result.progress.acknowledged_items, 3);
  assert.equal(result.progress.unknown_items, 17);
  assert.equal(result.next_action, "prepare_again_and_reconcile_effects");
  const recovery = fixture([], { carried: 20 });
  assertCompletionVerification(await recovery.run());
  assert.equal(
    recovery.events.some((event) => event.kind === "start" && event.role === "detailed"),
    false,
  );
}

test(
  "split-response loss retains saved acknowledgments and reconciles before another invocation",
  splitResponseLossRetainsSavedAcknowledgmentsAndReconcilesBeforeAnotherInvocation,
);

async function currentRecordedMarkersSurviveLaterMetadataWithoutAnotherReadOrOverwrite() {
  const f = fixture(Array(41).fill(1), { concurrency: 1 });
  f.groups[1].items[0].recorded = true;
  f.saved.add(20);
  const result = await f.run();
  assertCompletionVerification(result);
  assert.equal(result.progress.acknowledged_items, 41);
  assert.equal(
    f.events.some((event) => event.kind === "exact-read" && event.index === 20),
    false,
  );
  assert.equal(
    f.events.some((event) => event.kind === "saved" && event.indexes.includes(20)),
    false,
  );
}

test(
  "current recorded markers survive later metadata without another read or overwrite",
  currentRecordedMarkersSurviveLaterMetadataWithoutAnotherReadOrOverwrite,
);

async function hostInterruptionAndCancellationAreNotCompletionOrRollback() {
  for (const error of [
    { name: "AbortError", code: "ABORT_ERR" },
    { name: "WorkflowError", code: "LIMIT_REACHED" },
  ]) {
    async function hostInterruptionAndCancellationAreNotCompletionOrRollbackActor({ job, work }) {
      if (job.cursor) throw error;
      return work();
    }
    const f = fixture(Array(100).fill(1), {
      concurrency: 1,
      agent: hostInterruptionAndCancellationAreNotCompletionOrRollbackActor,
    });
    const result = await f.run();
    assert.equal(result.status, error.name === "AbortError" ? "cancelled" : "incomplete");
    assert.equal(result.progress.acknowledged_items, 20);
    assert.ok(result.progress.unknown_items > 0);
    assert.equal(
      f.events.some((event) => event.kind === "complete"),
      false,
    );
  }
  async function hostInterruptionAndCancellationAreNotCompletionOrRollbackActor() {
    throw { name: "WorkflowError", fatal: true };
  }
  const f = fixture([1], { agent: hostInterruptionAndCancellationAreNotCompletionOrRollbackActor });
  await assert.rejects(f.run(), (error) => error.fatal === true);
}

test(
  "host interruption and cancellation are not completion or rollback",
  hostInterruptionAndCancellationAreNotCompletionOrRollback,
);

async function followupChecksPendingWorkOnlyAndExpansionReturnsUnchangedBoundedRequests() {
  const expansion = {
    item_keys: ["source:inherited"],
    reason: "Simulation-only inherited cross-impact.",
  };
  async function followupChecksPendingWorkOnlyAndExpansionReturnsUnchangedBoundedRequestsActor({
    job,
    work,
  }) {
    const result = await work();
    return job.kind === "detailed" ? { ...result, status: "expand", expansion } : result;
  }
  const f = fixture([1, 1], {
    mode: "followup",
    carried: 100,
    agent: followupChecksPendingWorkOnlyAndExpansionReturnsUnchangedBoundedRequestsActor,
  });
  const result = await f.run();
  assert.equal(result.status, "incomplete");
  assert.equal(result.next_action, "expand_review_scope");
  assert.deepEqual(result.expansion_requests, [expansion]);
  assert.equal(f.saved.size, 2);
  assert.equal(
    f.events.some(
      (event) => event.kind === "inherited-read" || event.kind === "specification-edit",
    ),
    false,
  );
  assert.equal(
    f.events.some((event) => event.kind === "final-prepare"),
    false,
  );
  const resumed = fixture([1], { mode: "followup", carried: 102 });
  assertCompletionVerification(await resumed.run());
  assert.deepEqual([...resumed.saved], [0]);
}

test(
  "followup checks pending work only and expansion returns unchanged bounded requests",
  followupChecksPendingWorkOnlyAndExpansionReturnsUnchangedBoundedRequests,
);

async function freshSavedConsistencyRequestsMainActorCompletionWithoutRejudging() {
  const f = fixture([], { gaps: true });
  f.args.prepared.result.next_stage = "completion_only";
  const result = await f.run();
  assert.equal(result.status, "incomplete");
  assert.equal(result.next_action, "complete_review");
  assert.equal(
    f.events.some((event) => event.kind === "start"),
    false,
  );
  assert.equal(f.completed(), false);
}

test(
  "fresh saved consistency requests main-actor completion without rejudging",
  freshSavedConsistencyRequestsMainActorCompletionWithoutRejudging,
);

async function aFinalOnlyInvocationNeedsOnlyTheRouteOfItsRemainingActor() {
  const f = fixture([]);
  delete f.args.roles.judge;
  assertCompletionVerification(await f.run());
  assert.deepEqual(
    f.events.filter((event) => event.kind === "start").map((event) => event.role),
    ["final"],
  );
}

test(
  "a final-only invocation needs only the route of its remaining actor",
  aFinalOnlyInvocationNeedsOnlyTheRouteOfItsRemainingActor,
);

async function conditionalSameActorPaginationPreservesOrdinaryExactReadFallback() {
  for (const verified of [false, true]) {
    const f = fixture([]);
    f.args.host.pagination = {
      same_actor: verified,
      tools: verified,
      context: verified,
      results: verified,
    };
    const result = await f.run();
    assertCompletionVerification(result);
    assert.equal(f.events.filter((event) => event.kind === "final-read").length, 3);
    assert.ok(
      f.events
        .filter((event) => event.kind === "final-read")
        .every((event) => event.pagination === (verified ? "programmatic" : "ordinary")),
    );
  }
}

test(
  "conditional same-actor pagination preserves ordinary exact-read fallback",
  conditionalSameActorPaginationPreservesOrdinaryExactReadFallback,
);

async function theFinalActorReportsItsActualFallbackRatherThanTheRequestedOptimization() {
  async function useOrdinaryReads({ job, work }) {
    job.pagination = "ordinary";
    return work();
  }
  const f = fixture([], { agent: useOrdinaryReads });
  f.args.host.pagination = { same_actor: true, tools: true, context: true, results: true };
  const result = await f.run();
  assertCompletionVerification(result);
  assert.equal(result.final_pagination, "ordinary");
}

test(
  "the final actor reports its actual fallback rather than the requested optimization",
  theFinalActorReportsItsActualFallbackRatherThanTheRequestedOptimization,
);

async function exactUnicodePortionsAndTerminalReceiptsStayWithTheirConsumingActor() {
  const f = fixture([4096, 4097, 4096 * 21], { mode: "followup", carried: 50 });
  assertCompletionVerification(await f.run());
  const reads = f.events.filter((event) => event.kind === "exact-read");
  assert.deepEqual(
    reads.map((event) => event.pages),
    [1, 2, 21],
  );
  assert.ok(reads.every((event) => event.complete));
  assert.equal(
    f.events.some(
      (event) => event.kind === "inherited-read" || event.kind === "specification-edit",
    ),
    false,
  );
  assert.equal(f.events.filter((event) => event.kind === "final-read").length, 3);
}

test(
  "exact Unicode portions and terminal receipts stay with their consuming actor",
  exactUnicodePortionsAndTerminalReceiptsStayWithTheirConsumingActor,
);

async function finalCompletionMustBeTheActualSameSourceMCPOutcome() {
  for (const completion of [
    null,
    { protocol_version: 2, result: { review_ref: "foreign", coverage_status: "reviewed" } },
  ]) {
    const f = fixture([], {
      agent: async () => ({ status: "completed", completion, expansion: null }),
    });
    const result = await f.run();
    assert.notEqual(result.status, "completed");
    assert.notEqual(result.next_action, "verify_review_completion");
    assert.equal(result.reported_outcome, undefined);
  }
  const f = fixture([], {
    agent: async ({ job }) => ({
      status: "stale",
      pagination: "not_read",
      ...job.target,
      completion: { protocol_version: 2, result: { ...job.target, coverage_status: "reviewed" } },
      expansion: null,
    }),
  });
  assert.equal((await f.run()).status, "stale");
}

test(
  "final completion must be the actual same-source MCP outcome",
  finalCompletionMustBeTheActualSameSourceMCPOutcome,
);

async function aForeignFinalExpansionCannotAuthorizeAChangeToTheCurrentReview() {
  const f = fixture([], {
    mode: "followup",
    agent: async () => ({
      status: "expand",
      review_ref: "foreign",
      source_version: "c".repeat(64),
      completion: null,
      expansion: { item_keys: ["source:foreign"], reason: "Foreign simulation request." },
    }),
  });
  const result = await f.run();
  assert.notEqual(result.next_action, "prepare_again_after_expansion");
  assert.equal(result.expansion_requests, undefined);
}

test(
  "a foreign final expansion cannot authorize a change to the current review",
  aForeignFinalExpansionCannotAuthorizeAChangeToTheCurrentReview,
);

async function aQuiescentFinalExpansionDistinguishesASavedOperationFromAParentRequest() {
  for (const applied of [false, true]) {
    const f = fixture([], {
      mode: "followup",
      validateSchemas: true,
      agent: async ({ job }) => ({
        status: "expand",
        pagination: "not_read",
        review_ref: job.target.review_ref,
        source_version: job.target.source_version,
        completion: null,
        expansion: {
          item_keys: ["source:inherited"],
          reason: "Simulation-only final cross-impact.",
        },
        scope_expansion: applied
          ? {
              protocol_version: 2,
              context: "opaque-fixture-expansion-context",
              replayed: false,
              result: {
                review_ref: job.target.review_ref,
                source_version: job.target.source_version,
                total_items: 2,
                required_items: 1,
                required_item_indices: [0],
                consistency_item_index: 1,
                carried_items: 0,
                consistency_required: true,
                next: "prepare_again",
              },
            }
          : null,
      }),
    });
    const result = await f.run();
    assert.equal(result.status, "incomplete");
    assert.equal(
      result.next_action,
      applied ? "prepare_again_after_expansion" : "expand_review_scope",
    );
  }
}

test(
  "a quiescent final expansion distinguishes a saved operation from a parent request",
  aQuiescentFinalExpansionDistinguishesASavedOperationFromAParentRequest,
);

async function nativeStructuredOutputSchemasAcceptEveryNormalControlledActorResponse() {
  const f = fixture(Array(41).fill(1), { validateSchemas: true });
  assertCompletionVerification(await f.run());
}

test(
  "native structured-output schemas accept every normal controlled actor response",
  nativeStructuredOutputSchemasAcceptEveryNormalControlledActorResponse,
);

async function aGroupWithSeveralMetadataPortionsIsWhollyOwnedByOneFreshJudge() {
  async function aGroupWithSeveralMetadataPortionsIsWhollyOwnedByOneFreshJudgeActor({ job, work }) {
    if (job.kind === "detailed" && job.group?.items_cursor) {
      job.group = structuredClone(f.groups[job.group.group_index]);
    }
    return work();
  }
  const f = fixture(Array(21).fill(1), {
    agent: aGroupWithSeveralMetadataPortionsIsWhollyOwnedByOneFreshJudgeActor,
  });
  f.args.prepared.result.args.lanes = structuredClone(f.args.prepared.result.args.lanes);
  f.args.prepared.result.args.lanes[0].items = f.args.prepared.result.args.lanes[0].items.slice(
    0,
    2,
  );
  f.args.prepared.result.args.lanes[0].items_cursor = "metadata-page-2";
  assertCompletionVerification(await f.run());
  assert.equal(f.saved.size, 21);
  assert.equal(
    new Set(f.events.filter((event) => event.kind === "exact-read").map((event) => event.actor))
      .size,
    2,
  );
}

test(
  "a group with several metadata portions is wholly owned by one fresh judge",
  aGroupWithSeveralMetadataPortionsIsWhollyOwnedByOneFreshJudge,
);

async function interruptionBeforeOrAfterConsistencySavingRecoversThroughFreshPreparation() {
  for (const savedConsistency of [false, true]) {
    const interrupted = fixture([], {
      agent: async ({ job }) => ({
        status: "incomplete",
        ...job.target,
        completion: null,
        expansion: null,
      }),
    });
    assert.equal((await interrupted.run()).status, "incomplete");
    const recovery = fixture([]);
    if (savedConsistency) recovery.args.prepared.result.next_stage = "completion_only";
    const result = await recovery.run();
    assert.equal(
      result.next_action,
      savedConsistency ? "complete_review" : "verify_review_completion",
    );
    assert.equal(
      recovery.events.filter((event) => event.kind === "start").length,
      savedConsistency ? 0 : 1,
    );
  }
}

test(
  "interruption before or after consistency saving recovers through fresh preparation",
  interruptionBeforeOrAfterConsistencySavingRecoversThroughFreshPreparation,
);

async function reviewOnlyFindingsFinishOnePassASeparateAuthorizedCorrectionUsesPendingFollowup() {
  const first = fixture(Array(41).fill(1), { gaps: true });
  assertCompletionVerification(await first.run(), "gaps");
  assert.equal(first.events.filter((event) => event.kind === "complete").length, 1);
  const last = first.events.at(-1);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(first.events.at(-1), last);
  const corrected = fixture([1, 4097], { mode: "followup", carried: 39 });
  assertCompletionVerification(await corrected.run());
  assert.equal(corrected.events.filter((event) => event.kind === "exact-read").length, 2);
  assert.equal(corrected.events.filter((event) => event.kind === "complete").length, 1);
}

test(
  "review-only findings finish one pass; a separate authorized correction uses pending followup",
  reviewOnlyFindingsFinishOnePassASeparateAuthorizedCorrectionUsesPendingFollowup,
);

async function oneWorkflowOwnsPendingSchedulingObserverProgressNeedsNoPollingActor() {
  const hold = deferred();
  async function oneWorkflowOwnsPendingSchedulingObserverProgressNeedsNoPollingActorActor({
    work,
  }) {
    await hold.promise;
    return work();
  }
  const f = fixture([1], {
    agent: oneWorkflowOwnsPendingSchedulingObserverProgressNeedsNoPollingActorActor,
  });
  const running = f.run();
  while (!f.events.some((event) => event.kind === "start"))
    await new Promise((resolve) => setImmediate(resolve));
  let result;
  try {
    assert.deepEqual(
      f.events.filter((event) => event.kind === "start").map((event) => event.role),
      ["detailed"],
    );
    assert.equal(
      f.events.some((event) => /poll|status/i.test(event.message ?? "")),
      false,
    );
  } finally {
    hold.resolve();
    result = await running;
  }
  assertCompletionVerification(result);
  assert.deepEqual(
    f.events.filter((event) => event.kind === "start").map((event) => event.role),
    ["detailed", "final"],
  );
}

test(
  "one workflow owns pending scheduling; observer progress needs no polling actor",
  oneWorkflowOwnsPendingSchedulingObserverProgressNeedsNoPollingActor,
);

async function literalMetadataDeclaresStableNativePhaseNamesWithoutRoutes() {
  const metadata = JSON.parse(await readFile(metaUrl, "utf8"));
  assert.equal(metadata.name, "specification-review");
  assert.deepEqual(
    metadata.phases.map((phase) => phase.title),
    ["Detailed review", "Final consistency"],
  );
  assert.equal(JSON.stringify(metadata).includes("provider"), false);
}

test(
  "literal metadata declares stable native phase names without routes",
  literalMetadataDeclaresStableNativePhaseNamesWithoutRoutes,
);

async function aSchemaValidCompletionClaimCannotCertifyAnUnsavedReview() {
  async function fabricateFinalReply({ job, work }) {
    if (job.kind === "detailed") return work();
    return {
      status: "completed",
      pagination: "not_read",
      review_ref: job.target.review_ref,
      source_version: job.target.source_version,
      completion: {
        protocol_version: 2,
        context: "fabricated-context",
        replayed: false,
        result: {
          review_ref: job.target.review_ref,
          source_version: job.target.source_version,
          coverage_status: "reviewed",
          semantic_correctness_proven: false,
          reviewer_independence_authenticated: false,
          approved_by_tool: false,
        },
      },
      expansion: null,
      scope_expansion: null,
    };
  }
  const f = fixture(Array(40).fill(1), { validateSchemas: true, agent: fabricateFinalReply });
  const result = await f.run();
  assert.equal(f.saved.size, 40);
  assert.equal(f.completed(), false);
  assert.equal(f.consistencySaved(), false);
  assert.notEqual(result.status, "completed");
  assert.equal(result.next_action, "verify_review_completion");
  assert.equal(result.reported_outcome, "reviewed");
}

test(
  "a schema-valid completion claim cannot certify an unsaved review",
  aSchemaValidCompletionClaimCannotCertifyAnUnsavedReview,
);

async function twentyLongKeysAndSplitAcknowledgmentsReturnBoundedSavedProgress() {
  let detailedReport;
  async function observeDetailedReport({ job, work }) {
    const result = await work();
    if (job.kind === "detailed") detailedReport = result;
    return result;
  }
  const f = fixture(Array(20).fill(2000), {
    validateSchemas: true,
    batchSize: 1,
    agent: observeDetailedReport,
  });
  for (const item of f.items) {
    item.item_key = `requirement:CLI${"X".repeat(480)}-${String(item.item_index).padStart(3, "0")}`;
  }
  assert.ok(Buffer.byteLength(JSON.stringify(f.args.prepared)) < 24 * 1024);
  const result = await f.run();
  assert.equal(f.saved.size, 20);
  assert.equal(f.events.filter((event) => event.kind === "saved").length, 20);
  assert.equal(result.progress.acknowledged_items, 20);
  assert.equal(result.progress.unknown_items, 0);
  assert.ok(Buffer.byteLength(JSON.stringify(detailedReport)) < 24 * 1024);
  assert.equal(Object.hasOwn(detailedReport.group.items[0], "item_key"), false);
  assert.equal(Object.hasOwn(detailedReport.acknowledgments[0].items[0], "item_key"), false);
  assert.equal(result.next_action, "verify_review_completion");
}

test(
  "twenty long keys and split acknowledgments return bounded saved progress",
  twentyLongKeysAndSplitAcknowledgmentsReturnBoundedSavedProgress,
);

async function paginatedUnicodeKeysAreKeptByTheJudgeAndNeverCopiedIntoItsReport() {
  let report;
  async function consumeMetadataAndReport({ job, work }) {
    if (job.kind === "detailed" && job.group?.items_cursor) {
      job.group = structuredClone(f.groups[job.group.group_index]);
    }
    const value = await work();
    if (job.kind === "detailed") report = value;
    return value;
  }
  const f = fixture(Array(20).fill(2000), {
    validateSchemas: true,
    batchSize: 1,
    agent: consumeMetadataAndReport,
  });
  for (const item of f.items) item.item_key = `source:${"界".repeat(480)}${item.item_index}`;
  const originalBytes = Buffer.byteLength(JSON.stringify(f.args.prepared));
  assert.ok(originalBytes > 24 * 1024);
  f.args.prepared.result.args.lanes = structuredClone(f.args.prepared.result.args.lanes);
  f.args.prepared.result.args.lanes[0].items = f.args.prepared.result.args.lanes[0].items.slice(
    0,
    5,
  );
  f.args.prepared.result.args.lanes[0].items_cursor = "metadata-page-2";
  assert.ok(Buffer.byteLength(JSON.stringify(f.args.prepared)) < 24 * 1024);
  const result = await f.run();
  assertCompletionVerification(result);
  assert.equal(result.progress.acknowledged_items, 20);
  assert.equal(result.progress.unknown_items, 0);
  assert.ok(Buffer.byteLength(JSON.stringify(report)) < 24 * 1024);
  assert.equal(JSON.stringify(report).includes("界"), false);
  assert.equal(report.acknowledgments.length, 20);
  assert.equal(report.group.items.length, 20);
}

test(
  "paginated Unicode keys are kept by the judge and never copied into its report",
  paginatedUnicodeKeysAreKeptByTheJudgeAndNeverCopiedIntoItsReport,
);

// The pinned Harness subset is defined by dsh-tools/json-schema.ts at
// 22ddee3792402c3e70ec5f86a63c3e3e895a2f60. This guards generated declarations;
// it is not a replacement value validator or native-engine qualification.
function assertHarnessSchemaDeclarations(schema) {
  const keywords = new Set(["type", "oneOf", "properties", "required", "additionalProperties", "items", "enum", "const", "description", "title", "default", "examples"]);
  const types = new Set(["object", "array", "string", "number", "integer", "boolean", "null"]);
  function inspect(node) {
    assert.ok(node && typeof node === "object" && !Array.isArray(node));
    assert.ok(Object.keys(node).every((key) => keywords.has(key)), "Workflow schemas must use only the pinned host's supported keywords.");
    if (Object.hasOwn(node, "type")) assert.ok(typeof node.type === "string" && types.has(node.type), "The native host rejects type arrays.");
    if (node.oneOf) {
      assert.ok(Array.isArray(node.oneOf) && node.oneOf.length > 0);
      for (const key of ["properties", "required", "additionalProperties", "items", "enum", "const"]) {
        assert.equal(Object.hasOwn(node, key), false, "Object/array constraints belong inside the oneOf branch.");
      }
      for (const branch of node.oneOf) inspect(branch);
    }
    if (node.properties) for (const property of Object.values(node.properties)) inspect(property);
    if (node.items) inspect(node.items);
  }
  assert.equal(schema.type, "object");
  inspect(schema);
}

async function supportedSchemasPreserveRequiredFieldsAndNullableValues() {
  const schemas = new Map();
  const responses = new Map();
  function inspectSchema(schema, kind) {
    assertHarnessSchemaDeclarations(schema);
    schemas.set(kind, schema);
  }
  async function captureResponse({ job, work }) {
    const result = await work();
    responses.set(job.kind, structuredClone(result));
    return result;
  }
  const f = fixture([1], { validateSchemas: true, assertSchema: inspectSchema, agent: captureResponse });
  assertCompletionVerification(await f.run());
  assert.deepEqual([...schemas.keys()], ["detailed", "final"]);
  const ajv = new Ajv({ allErrors: true });
  for (const kind of ["detailed", "final"]) {
    const validate = ajv.compile(schemas.get(kind));
    const response = responses.get(kind);
    assert.equal(validate(response), true);
    const missing = structuredClone(response);
    delete missing[kind === "detailed" ? "unknown_effects" : "pagination"];
    assert.equal(validate(missing), false, "Required fields survive the schema translation.");
    const extra = { ...response, unexpected_field: true };
    assert.equal(validate(extra), false, "Closed response objects remain closed.");
    const invalid = structuredClone(response);
    invalid[kind === "detailed" ? "cursor" : "completion"] = false;
    assert.equal(validate(invalid), false, "Nullable alternatives do not accept unrelated scalar types.");
    assert.equal(validate({ ...response, status: "unrecognized" }), false);
    const incomplete = { ...response, status: "incomplete" };
    if (kind === "detailed") { incomplete.group = null; incomplete.cursor = null; }
    else incomplete.completion = null;
    assert.equal(validate(incomplete), true, "Known incomplete responses retain their null fields.");
  }
}
test("native-compatible declarations preserve response types, required fields and null branches", supportedSchemasPreserveRequiredFieldsAndNullableValues);

async function expansionRequestsRetainTwentyKeyLimitWithoutSchemaMaxItems() {
  for (const role of ["detailed", "final"]) {
    for (const count of [20, 21]) {
      const expansion = { item_keys: Array.from({ length: count }, (_, index) => `requirement:CLI-${index}`), reason: "Fixture inherited cross-impact." };
      async function requestExpansion({ job, work }) {
        if (job.kind !== role) return work();
        if (job.kind === "detailed") {
          const response = await work();
          return { ...response, status: "expand", expansion };
        }
        return { status: "expand", pagination: "not_read", review_ref: job.target.review_ref,
          source_version: job.target.source_version, completion: null, expansion, scope_expansion: null };
      }
      const f = fixture([1], { mode: "followup", agent: requestExpansion, validateSchemas: true });
      const result = await f.run();
      assert.equal(result.next_action, count === 20 ? "expand_review_scope" : "prepare_again_and_reconcile_effects");
    }
  }
}
test("both judging stages retain the twenty-key expansion limit without unsupported schema keywords", expansionRequestsRetainTwentyKeyLimitWithoutSchemaMaxItems);

async function savedExpansionRetainsItsExistingHundredIndexWireLimit() {
  // This is the existing compact-envelope limit, not a total review-item cap.
  for (const count of [0, 100, 101]) {
    async function savedExpansion({ job, work }) {
      if (job.kind !== "final") return work();
      return { status: "expand", pagination: "not_read", review_ref: job.target.review_ref,
        source_version: job.target.source_version, completion: null,
        expansion: { item_keys: ["requirement:CLI-001"], reason: "Fixture inherited cross-impact." },
        scope_expansion: { protocol_version: 2, context: "opaque-fixture-context", replayed: false,
          result: { review_ref: job.target.review_ref, source_version: job.target.source_version,
            total_items: count + 1, required_items: count,
            required_item_indices: Array.from({ length: count }, (_, index) => index),
            consistency_item_index: count, carried_items: 0, consistency_required: true, next: "prepare_again" } } };
    }
    const f = fixture([], { mode: "followup", agent: savedExpansion });
    const result = await f.run();
    assert.equal(result.next_action, count <= 100 ? "prepare_again_after_expansion" : "prepare_again_and_reconcile_effects");
    if (count > 100) assert.equal(result.status, "failed");
  }
}
test("saved scope expansion retains the existing hundred-index wire bound in workflow validation", savedExpansionRetainsItsExistingHundredIndexWireLimit);

async function actualHarnessValidatorAcceptsBothRootsInEveryArtifact() {
  const modulePath = process.env.EAW_HARNESS_TOOLS_MODULE;
  assert.ok(isAbsolute(modulePath));
  const { assertObjectJsonSchema } = await import(pathToFileURL(modulePath));
  for (const source of [bodyUrl,
    new URL("../exports/deepseek-harness/skills/spec-driven-development/workflows/specification-review.js", import.meta.url),
    new URL("../plugins/claude-code/engineer-agent-workflows/skills/spec-driven-development/workflows/specification-review.js", import.meta.url)]) {
    let body = await readFile(source, "utf8");
    if (body.startsWith("export const meta = ")) {
      const boundary = body.indexOf(";\n");
      assert.ok(boundary > 0);
      body = body.slice(boundary + 2);
    }
    const seen = [];
    function nativeSchemaCheck(schema, kind) {
      assertObjectJsonSchema(schema);
      seen.push(kind);
    }
    const f = fixture([1], { assertSchema: nativeSchemaCheck, validateSchemas: true });
    assertCompletionVerification(await f.run({ body }));
    assert.deepEqual(seen, ["detailed", "final"]);
  }
}
test("the actual prepared Harness validator accepts canonical and both generated response schemas", {
  skip: !process.env.EAW_HARNESS_TOOLS_MODULE && "An explicit prepared native-validator module was not supplied.",
}, actualHarnessValidatorAcceptsBothRootsInEveryArtifact);
