import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, URL } from "node:url";
import test from "node:test";

import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { parse, stringify } from "yaml";

const server = fileURLToPath(new URL("../dist/main.js", import.meta.url));

async function actor(t, name) {
  let client;
  let context;

  async function start() {
    if (client) return client;
    client = new Client({ name, version: "1" });
    await client.connect(new StdioClientTransport({
      command: process.execPath,
      args: [server],
      stderr: "pipe",
    }));
    return client;
  }

  async function close() {
    const active = client;
    client = undefined;
    if (active) await active.close();
  }

  t.after(close);
  return {
    context: () => context,
    setContext: (value) => { context = value; },
    listTools: async () => (await start()).listTools(),
    restart: async () => { await close(); await start(); },
    raw: async (tool, arguments_) => (await start()).callTool({ name: tool, arguments: arguments_ }),
    call: async (tool, arguments_ = {}, expectedError) => {
      const response = await (await start()).callTool({
        name: tool,
        arguments: {
          ...(context && tool !== "specification_open" ? { context } : {}),
          ...arguments_,
        },
      });
      if (expectedError) {
        assert.equal(response.isError, true, JSON.stringify(response.structuredContent));
        assert.equal(response.structuredContent.error.code, expectedError);
        return response.structuredContent;
      }
      assert.notEqual(response.isError, true, JSON.stringify(response.structuredContent));
      context = response.structuredContent.context ?? context;
      return response.structuredContent.result;
    },
  };
}

async function readItem(reviewer, reviewRef, itemIndex) {
  let cursor;
  let item;
  let exactText = "";
  do {
    item = await reviewer.call("specification_review_get", {
      review_ref: reviewRef,
      item_index: itemIndex,
      ...(cursor ? { cursor } : {}),
    });
    exactText += item.text;
    cursor = item.next_cursor;
  } while (cursor);
  return { item, body: JSON.parse(exactText) };
}

async function readChanges(author, reviewRef) {
  let cursor;
  let result;
  let exactText = "";
  do {
    result = await author.call("specification_review_changes", {
      review_ref: reviewRef,
      ...(cursor ? { cursor } : {}),
    });
    exactText += result.text;
    cursor = result.next_cursor;
  } while (cursor);
  return { result, body: JSON.parse(exactText) };
}

function coveredVerdict(reviewRef, itemIndex, read, explanation = "Simulation-only evidence check.") {
  const result = {
    item_index: itemIndex,
    read_receipt: read.item.read_receipt,
    verdict: "covered",
    explanation,
    evidence_requirement_ids: [],
    evidence_source_refs: [],
  };
  if (read.body.kind === "source") {
    if (read.body.source.context_reason) {
      result.verdict = "not_applicable";
    } else if (read.body.source.id !== "scope.manifest") {
      result.evidence_requirement_ids = read.body.source.requirement_ids;
    }
  } else if (read.body.kind === "requirement") {
    result.evidence_source_refs = read.body.source_refs;
  }
  assert.equal(typeof reviewRef, "string");
  return result;
}

function mixedVerdict(reviewRef, itemIndex, read) {
  const result = coveredVerdict(reviewRef, itemIndex, read);
  if (read.body.kind === "requirement") {
    result.verdict = "gap";
    result.counterexample = "The synthetic requirement omits an explicit failure response.";
  } else if (read.body.kind === "source"
    && read.body.source.id !== "scope.manifest"
    && !read.body.source.context_reason) {
    result.verdict = "conflict";
    result.counterexample = "The synthetic source conflicts with the omitted failure response.";
  }
  return result;
}

function semanticResults(journalBytes) {
  const journal = parse(journalBytes.toString("utf8"));
  const run = journal.specification_reviews.runs.at(-1);
  return run.results.map((record) => ({
    item_index: record.item_index,
    item_kind: String(record.item_key).split(":", 1)[0],
    verdict: record.verdict,
    explanation: record.explanation,
    counterexample: record.counterexample ?? null,
    requirement_ids: [...record.requirement_ids].sort(),
    source_ref_count: record.source_refs.length,
  }));
}

async function readVerdicts(fixture, factory = coveredVerdict) {
  const items = [];
  for (let index = 0; index < fixture.review.total_items; index += 1) {
    const read = await readItem(fixture.reviewer, fixture.review.review_ref, index);
    items.push(factory(fixture.review.review_ref, index, read));
  }
  return items;
}

async function reviewFixture(t, totalItems = 5, {
  includeContextSource = false,
  instructionText = "Return JSON.",
} = {}) {
  const project = await mkdtemp(join(tmpdir(), "workflow-review-batch-"));
  t.after(() => rm(project, { recursive: true, force: true }));
  const specification = "batch";
  const directory = join(project, "docs/specs", specification);
  const author = await actor(t, "review-batch-author");
  const reviewer = await actor(t, "review-batch-reviewer");

  await author.call("specification_open", { project, specification });
  const proposal = await author.call("scope_propose", {
    depth: "standard",
    rationale: ["Synthetic review batch contract."],
    profiles: [{ id: "core", reason: "CLI contract." }],
  });
  const answer = await author.call("question_record_answer", {
    question_ref: proposal.question_ref,
    selected_ids: ["confirm"],
    text: "Confirmed synthetic scope.",
    source: "fixture-customer:scope",
  });
  await author.call("scope_confirm", {
    proposal_ref: proposal.question_ref,
    answer_ref: answer.decision_ref,
  });
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, "spec.md"),
    "# Batch fixture\n\nStatus: Draft\n\n### BAT-001: JSON output\nReturn JSON.\n",
  );
  await author.call("decision_record_instruction", {
    category: "format",
    kind: "initial_request",
    text: instructionText,
    source: "fixture-customer:initial",
    requirement_ids: ["BAT-001"],
  });

  if (includeContextSource) {
    const contextual = await author.call("decision_record_instruction", {
      category: "test_context",
      kind: "follow_up",
      text: "The fixture uses simulation-only customer answers.",
      source: "fixture-customer:context",
    });
    await author.call("decision_mark_context", {
      decision_ref: contextual.decision_ref,
      reason: "Test provenance only; it does not define product behavior.",
    });
  }

  const additionalSources = totalItems - (includeContextSource ? 6 : 5);
  assert.ok(additionalSources >= 0);
  if (additionalSources) {
    const journalPath = join(directory, "decisions.yaml");
    const journal = parse(await readFile(journalPath, "utf8"));
    const template = journal.decisions.find((decision) => decision.id !== "scope.manifest");
    for (let index = 0; index < additionalSources; index += 1) {
      journal.decisions.push({
        ...JSON.parse(JSON.stringify(template)),
        id: `fixture.batch.${String(index + 1).padStart(2, "0")}`,
        source: `fixture-customer:bulk-${index + 1}`,
      });
    }
    await writeFile(journalPath, stringify(journal, { lineWidth: 0 }));
    await author.call("specification_open", { project, specification });
  }

  const review = await author.call("specification_review_start");
  assert.equal(review.total_items, totalItems);
  await reviewer.call("specification_open", { project, specification });
  return { project, directory, author, reviewer, review };
}

async function prepareEligibleFollowup(fixture) {
  let requirementIndex = -1;
  for (let index = 0; index < fixture.review.total_items; index += 1) {
    const read = await readItem(fixture.reviewer, fixture.review.review_ref, index);
    const input = coveredVerdict(fixture.review.review_ref, index, read);
    if (read.body.kind === "requirement" && read.body.source.id === "BAT-001") {
      requirementIndex = index;
      input.verdict = "gap";
      input.counterexample = "The empty-request behavior is unspecified.";
    }
    await fixture.reviewer.call("specification_review_record", {
      review_ref: fixture.review.review_ref,
      ...input,
    });
  }
  assert.notEqual(requirementIndex, -1);
  assert.equal((await fixture.reviewer.call("specification_review_complete", {
    review_ref: fixture.review.review_ref,
  })).coverage_status, "gaps");

  const specPath = join(fixture.directory, "spec.md");
  const source = await readFile(specPath, "utf8");
  await writeFile(specPath, source.replace("Return JSON.", "Return JSON and reject an empty request."));
  await fixture.author.call("specification_open", {
    project: fixture.project,
    specification: "batch",
  });
  const changes = await readChanges(fixture.author, fixture.review.review_ref);
  assert.equal(changes.body.eligible, true);
  const followup = await fixture.author.call("specification_review_followup_start", {
    review_ref: fixture.review.review_ref,
    changes_receipt: changes.result.changes_receipt,
    fixes: [{
      finding_key: "requirement:BAT-001",
      changed_item_keys: ["requirement:BAT-001"],
      explanation: "Define the omitted empty-request behavior.",
    }],
  });
  await fixture.reviewer.call("specification_open", {
    project: fixture.project,
    specification: "batch",
  });
  return followup;
}

function receiptCount(journalBytes) {
  return parse(journalBytes.toString("utf8")).extensions.workflow_mcp_receipts.length;
}

function argumentsAtSize(context, reviewRef, items, targetBytes) {
  const normalized = {
    context,
    review_ref: reviewRef,
    items: items.map((item) => ({
      ...item,
      explanation: "x",
      counterexample: "x",
    })),
  };
  const baseBytes = Buffer.byteLength(JSON.stringify(normalized), "utf8");
  let additionalBytes = targetBytes - baseBytes;
  assert.ok(additionalBytes >= 0);
  for (const item of normalized.items) {
    for (const field of ["explanation", "counterexample"]) {
      const bytes = Math.min(additionalBytes, 8_190);
      const oneByteCharacters = bytes % 2;
      const twoByteCharacters = (bytes - oneByteCharacters) / 2;
      item[field] += `${"a".repeat(oneByteCharacters)}${"é".repeat(twoByteCharacters)}`;
      additionalBytes -= bytes;
      if (!additionalBytes) break;
    }
    if (!additionalBytes) break;
  }
  assert.equal(additionalBytes, 0, "the bounded item fields must accommodate the target size");
  assert.equal(Buffer.byteLength(JSON.stringify(normalized), "utf8"), targetBytes);
  assert.ok(normalized.items.every((item) => item.explanation.length <= 4_096));
  assert.ok(normalized.items.every((item) => item.counterexample.length <= 4_096));
  return normalized;
}

test("review verdict batch is exposed as one bounded write scenario", async (t) => {
  const client = new Client({ name: "review-batch-contract", version: "1" });
  await client.connect(new StdioClientTransport({
    command: process.execPath,
    args: [server],
    stderr: "pipe",
  }));
  t.after(() => client.close());

  const descriptor = (await client.listTools()).tools.find(
    (tool) => tool.name === "specification_review_record_batch",
  );

  assert.ok(descriptor, "the public batch scenario must be registered");
  assert.equal(descriptor.annotations.readOnlyHint, false);
  assert.equal(descriptor.inputSchema.properties.items.minItems, 1);
  assert.equal(descriptor.inputSchema.properties.items.maxItems, 20);
});

test("review verdict batch validates every member before one atomic append", async (t) => {
  const fixture = await reviewFixture(t);
  const first = await readItem(fixture.reviewer, fixture.review.review_ref, 0);
  const second = await readItem(fixture.reviewer, fixture.review.review_ref, 1);
  const valid = [
    coveredVerdict(fixture.review.review_ref, 0, first),
    coveredVerdict(fixture.review.review_ref, 1, second),
  ];
  const journalPath = join(fixture.directory, "decisions.yaml");
  const before = await readFile(journalPath);
  const beforeReceipts = receiptCount(before);

  assert.equal(second.body.kind, "source");
  assert.notEqual(second.body.source.id, "scope.manifest");
  await fixture.reviewer.call("specification_review_record_batch", {
    review_ref: fixture.review.review_ref,
    items: [{ ...valid[1], evidence_requirement_ids: [] }],
  }, "EVIDENCE_REQUIRED");
  assert.deepEqual(await readFile(journalPath), before);

  const failure = await fixture.reviewer.call("specification_review_record_batch", {
    review_ref: fixture.review.review_ref,
    items: [valid[0], { ...valid[1], read_receipt: "not-a-current-read-receipt" }],
  }, "INCOMPLETE_READ");
  assert.deepEqual(failure.error.details.issues[0], {
    kind: "batch_member",
    item_index: 1,
    category: "foreign",
  });
  assert.deepEqual(await readFile(journalPath), before);

  const unknown = await fixture.reviewer.call("specification_review_record_batch", {
    review_ref: fixture.review.review_ref,
    items: [valid[0], { ...valid[1], item_index: fixture.review.total_items }],
  }, "INVALID_INPUT");
  assert.deepEqual(unknown.error.details.issues[0], {
    kind: "batch_member",
    item_index: 1,
    category: "unknown",
  });
  assert.deepEqual(await readFile(journalPath), before);

  const recorded = await fixture.reviewer.call("specification_review_record_batch", {
    review_ref: fixture.review.review_ref,
    items: valid,
  });
  assert.equal(recorded.batch_size, 2);
  assert.equal(recorded.recorded_items, 2);
  assert.deepEqual(recorded.items.map((item) => item.item_index), [0, 1]);
  assert.equal(receiptCount(await readFile(journalPath)), beforeReceipts + 1);

  for (let index = 2; index < fixture.review.total_items; index += 1) {
    const read = await readItem(fixture.reviewer, fixture.review.review_ref, index);
    await fixture.reviewer.call("specification_review_record", {
      review_ref: fixture.review.review_ref,
      ...coveredVerdict(fixture.review.review_ref, index, read),
    });
  }
  assert.equal((await fixture.reviewer.call("specification_review_complete", {
    review_ref: fixture.review.review_ref,
  })).coverage_status, "reviewed");
});

test("single and batched full reviews preserve equivalent mixed verdict semantics", async (t) => {
  const singles = await reviewFixture(t, 6, { includeContextSource: true });
  const batched = await reviewFixture(t, 6, { includeContextSource: true });
  const singleItems = await readVerdicts(singles, mixedVerdict);
  const batchItems = await readVerdicts(batched, mixedVerdict);

  assert.deepEqual(
    singleItems.map((item) => item.verdict),
    batchItems.map((item) => item.verdict),
  );
  assert.ok(singleItems.some((item) => item.verdict === "gap"));
  assert.ok(singleItems.some((item) => item.verdict === "conflict"));
  assert.ok(singleItems.some((item) => item.verdict === "not_applicable"));

  for (const item of singleItems) {
    await singles.reviewer.call("specification_review_record", {
      review_ref: singles.review.review_ref,
      ...item,
    });
  }
  await batched.reviewer.call("specification_review_record_batch", {
    review_ref: batched.review.review_ref,
    items: batchItems.slice(0, 1),
  });
  await batched.reviewer.call("specification_review_record_batch", {
    review_ref: batched.review.review_ref,
    items: batchItems.slice(1),
  });

  const singleComplete = await singles.reviewer.call("specification_review_complete", {
    review_ref: singles.review.review_ref,
  });
  const batchComplete = await batched.reviewer.call("specification_review_complete", {
    review_ref: batched.review.review_ref,
  });
  assert.equal(singleComplete.coverage_status, "gaps");
  assert.equal(batchComplete.coverage_status, singleComplete.coverage_status);
  assert.deepEqual(
    semanticResults(await readFile(join(batched.directory, "decisions.yaml"))),
    semanticResults(await readFile(join(singles.directory, "decisions.yaml"))),
  );
});

test("review verdict batch enforces item and compact UTF-8 argument bounds", async (t) => {
  const fixture = await reviewFixture(t, 20);
  const reads = [];
  for (let index = 0; index < fixture.review.total_items; index += 1) {
    reads.push(await readItem(fixture.reviewer, fixture.review.review_ref, index));
  }
  const verdicts = reads.map((read, index) => coveredVerdict(
    fixture.review.review_ref,
    index,
    read,
  ));
  const journalPath = join(fixture.directory, "decisions.yaml");
  const before = await readFile(journalPath);

  await fixture.reviewer.call("specification_review_record_batch", {
    review_ref: fixture.review.review_ref,
    items: [...verdicts, verdicts[0]],
  }, "INVALID_INPUT");
  await fixture.reviewer.call("specification_review_record_batch", {
    review_ref: fixture.review.review_ref,
    items: [verdicts[0], verdicts[0]],
  }, "INVALID_INPUT");
  assert.deepEqual(await readFile(journalPath), before);

  const oversized = argumentsAtSize(
    fixture.reviewer.context(),
    fixture.review.review_ref,
    verdicts,
    131_073,
  );
  const oversizedResponse = await fixture.reviewer.raw(
    "specification_review_record_batch",
    oversized,
  );
  assert.equal(oversizedResponse.isError, true);
  assert.equal(oversizedResponse.structuredContent.error.code, "INVALID_INPUT");
  assert.deepEqual(await readFile(journalPath), before);

  const atLimit = argumentsAtSize(
    fixture.reviewer.context(),
    fixture.review.review_ref,
    verdicts,
    131_072,
  );
  const atLimitResponse = await fixture.reviewer.raw(
    "specification_review_record_batch",
    atLimit,
  );
  assert.notEqual(atLimitResponse.isError, true, JSON.stringify(atLimitResponse.structuredContent));
  fixture.reviewer.setContext(atLimitResponse.structuredContent.context);
  assert.equal(atLimitResponse.structuredContent.result.batch_size, 20);

  const belowFixture = await reviewFixture(t, 20);
  const belowVerdicts = [];
  for (let index = 0; index < belowFixture.review.total_items; index += 1) {
    const read = await readItem(belowFixture.reviewer, belowFixture.review.review_ref, index);
    belowVerdicts.push(coveredVerdict(belowFixture.review.review_ref, index, read));
  }
  const belowLimit = argumentsAtSize(
    belowFixture.reviewer.context(),
    belowFixture.review.review_ref,
    belowVerdicts,
    131_071,
  );
  const belowLimitResponse = await belowFixture.reviewer.raw(
    "specification_review_record_batch",
    belowLimit,
  );
  assert.notEqual(belowLimitResponse.isError, true, JSON.stringify(belowLimitResponse.structuredContent));
  assert.equal(belowLimitResponse.structuredContent.result.batch_size, 20);
});

test("a compressed display marker cannot replace exact paginated evidence", async (t) => {
  const marker = "exact-source-marker";
  const fixture = await reviewFixture(t, 5, {
    instructionText: `${marker}:${"x".repeat(50_000)}`,
  });
  let firstPage;
  let itemIndex = -1;
  for (let index = 0; index < fixture.review.total_items; index += 1) {
    const page = await fixture.reviewer.call("specification_review_get", {
      review_ref: fixture.review.review_ref,
      item_index: index,
    });
    if (page.text.includes(marker)) {
      firstPage = page;
      itemIndex = index;
      break;
    }
  }
  assert.notEqual(itemIndex, -1);
  assert.equal(firstPage.read_receipt, null);
  assert.equal(typeof firstPage.next_cursor, "string");

  const journalPath = join(fixture.directory, "decisions.yaml");
  const before = await readFile(journalPath);
  const unavailable = await fixture.reviewer.call("specification_review_record_batch", {
    review_ref: fixture.review.review_ref,
    items: [{
      item_index: itemIndex,
      read_receipt: "display-compression-marker",
      verdict: "covered",
      explanation: "A display marker is not exact evidence.",
      evidence_requirement_ids: ["BAT-001"],
      evidence_source_refs: [],
    }],
  }, "INCOMPLETE_READ");
  assert.deepEqual(unavailable.error.details.issues[0], {
    kind: "batch_member",
    item_index: 0,
    category: "foreign",
  });
  assert.deepEqual(await readFile(journalPath), before);

  let exactText = firstPage.text;
  let page = firstPage;
  while (page.next_cursor) {
    page = await fixture.reviewer.call("specification_review_get", {
      review_ref: fixture.review.review_ref,
      item_index: itemIndex,
      cursor: page.next_cursor,
    });
    exactText += page.text;
  }
  const body = JSON.parse(exactText);
  assert.match(body.source.instruction.text, /^exact-source-marker:/u);
  const recorded = await fixture.reviewer.call("specification_review_record_batch", {
    review_ref: fixture.review.review_ref,
    items: [coveredVerdict(fixture.review.review_ref, itemIndex, { item: page, body })],
  });
  assert.equal(recorded.recorded_items, 1);
});

test("exact batch replay survives restart while edited retries remain new requests", async (t) => {
  const fixture = await reviewFixture(t);
  const first = await readItem(fixture.reviewer, fixture.review.review_ref, 0);
  const second = await readItem(fixture.reviewer, fixture.review.review_ref, 1);
  const items = [
    coveredVerdict(fixture.review.review_ref, 0, first),
    coveredVerdict(fixture.review.review_ref, 1, second),
  ];
  const original = {
    context: fixture.reviewer.context(),
    review_ref: fixture.review.review_ref,
    items,
  };
  const firstResponse = await fixture.reviewer.raw("specification_review_record_batch", original);
  assert.notEqual(firstResponse.isError, true, JSON.stringify(firstResponse.structuredContent));
  const afterCommit = await readFile(join(fixture.directory, "decisions.yaml"));

  await fixture.reviewer.restart();
  const replay = await fixture.reviewer.raw("specification_review_record_batch", original);
  assert.notEqual(replay.isError, true, JSON.stringify(replay.structuredContent));
  assert.equal(replay.structuredContent.replayed, true);
  assert.deepEqual(await readFile(join(fixture.directory, "decisions.yaml")), afterCommit);

  fixture.reviewer.setContext(replay.structuredContent.context);
  const reordered = await fixture.reviewer.call("specification_review_record_batch", {
    review_ref: fixture.review.review_ref,
    items: [...items].reverse(),
  }, "INVALID_STATE");
  assert.match(JSON.stringify(reordered), /"item_index":0/u);
  assert.deepEqual(await readFile(join(fixture.directory, "decisions.yaml")), afterCommit);

  const third = await readItem(fixture.reviewer, fixture.review.review_ref, 2);
  const next = await fixture.reviewer.call("specification_review_record_batch", {
    review_ref: fixture.review.review_ref,
    items: [coveredVerdict(fixture.review.review_ref, 2, third)],
  });
  assert.equal(next.recorded_items, 3);
});

test("observer reads stay harmless while stale writes and mixed overlap fail atomically", async (t) => {
  const fixture = await reviewFixture(t);
  const observer = await actor(t, "review-batch-observer");
  await observer.call("specification_open", {
    project: fixture.project,
    specification: "batch",
  });

  const first = await readItem(fixture.reviewer, fixture.review.review_ref, 0);
  const second = await readItem(observer, fixture.review.review_ref, 1);
  const observed = await observer.call("specification_review_status", {
    review_ref: fixture.review.review_ref,
  });
  assert.equal(observed.recorded_items, 0);

  await fixture.reviewer.call("specification_review_record_batch", {
    review_ref: fixture.review.review_ref,
    items: [coveredVerdict(fixture.review.review_ref, 0, first)],
  });
  const journalPath = join(fixture.directory, "decisions.yaml");
  const afterFirst = await readFile(journalPath);

  const stale = await observer.call("specification_review_record_batch", {
    review_ref: fixture.review.review_ref,
    items: [coveredVerdict(fixture.review.review_ref, 1, second)],
  }, "CONFLICT");
  assert.equal(stale.error.operation_applied, false);
  assert.equal(typeof stale.error.current_context, "string");
  assert.deepEqual(await readFile(journalPath), afterFirst);

  await observer.call("specification_open", {
    project: fixture.project,
    specification: "batch",
  });
  const recordedSecond = await observer.call("specification_review_record_batch", {
    review_ref: fixture.review.review_ref,
    items: [coveredVerdict(fixture.review.review_ref, 1, second)],
  });
  assert.equal(recordedSecond.recorded_items, 2);

  const third = await readItem(observer, fixture.review.review_ref, 2);
  const beforeOverlap = await readFile(journalPath);
  const overlap = await observer.call("specification_review_record_batch", {
    review_ref: fixture.review.review_ref,
    items: [
      coveredVerdict(fixture.review.review_ref, 2, third),
      coveredVerdict(fixture.review.review_ref, 1, second),
    ],
  }, "INVALID_STATE");
  assert.deepEqual(overlap.error.details.issues[0], {
    kind: "batch_member",
    item_index: 1,
    category: "duplicate",
  });
  assert.deepEqual(await readFile(journalPath), beforeOverlap);

  const recordedThird = await observer.call("specification_review_record_batch", {
    review_ref: fixture.review.review_ref,
    items: [coveredVerdict(fixture.review.review_ref, 2, third)],
  });
  assert.equal(recordedThird.recorded_items, 3);
});

test("eligible followup detailed items use batches while consistency stays separate", async (t) => {
  const fixture = await reviewFixture(t);
  const followup = await prepareEligibleFollowup(fixture);

  const items = [];
  for (const index of followup.required_item_indices) {
    const read = await readItem(fixture.reviewer, followup.review_ref, index);
    items.push(coveredVerdict(followup.review_ref, index, read));
  }
  const recorded = await fixture.reviewer.call("specification_review_record_batch", {
    review_ref: followup.review_ref,
    items,
  });
  assert.equal(recorded.batch_size, followup.required_item_indices.length);
  const incomplete = await fixture.reviewer.call("specification_review_complete", {
    review_ref: followup.review_ref,
  }, "CONSISTENCY_REQUIRED");
  assert.match(JSON.stringify(incomplete), /consistency_pending/u);
});

test("single and batched eligible followups preserve detailed results", async (t) => {
  const singles = await reviewFixture(t);
  const batched = await reviewFixture(t);
  const singleFollowup = await prepareEligibleFollowup(singles);
  const batchFollowup = await prepareEligibleFollowup(batched);
  assert.deepEqual(batchFollowup.required_item_indices, singleFollowup.required_item_indices);

  for (const index of singleFollowup.required_item_indices) {
    const read = await readItem(singles.reviewer, singleFollowup.review_ref, index);
    await singles.reviewer.call("specification_review_record", {
      review_ref: singleFollowup.review_ref,
      ...coveredVerdict(singleFollowup.review_ref, index, read),
    });
  }
  const batchItems = [];
  for (const index of batchFollowup.required_item_indices) {
    const read = await readItem(batched.reviewer, batchFollowup.review_ref, index);
    batchItems.push(coveredVerdict(batchFollowup.review_ref, index, read));
  }
  await batched.reviewer.call("specification_review_record_batch", {
    review_ref: batchFollowup.review_ref,
    items: batchItems,
  });

  const singleIncomplete = await singles.reviewer.call("specification_review_complete", {
    review_ref: singleFollowup.review_ref,
  }, "CONSISTENCY_REQUIRED");
  const batchIncomplete = await batched.reviewer.call("specification_review_complete", {
    review_ref: batchFollowup.review_ref,
  }, "CONSISTENCY_REQUIRED");
  assert.match(JSON.stringify(singleIncomplete), /consistency_pending/u);
  assert.match(JSON.stringify(batchIncomplete), /consistency_pending/u);
  assert.deepEqual(
    semanticResults(await readFile(join(batched.directory, "decisions.yaml"))),
    semanticResults(await readFile(join(singles.directory, "decisions.yaml"))),
  );
});

test("equal sixty-item reviews measure sixty single writes against three batches", async (t) => {
  const singles = await reviewFixture(t, 60);
  const batched = await reviewFixture(t, 60);
  const singlePath = join(singles.directory, "decisions.yaml");
  const batchPath = join(batched.directory, "decisions.yaml");
  const singleBefore = await readFile(singlePath);
  const batchBefore = await readFile(batchPath);
  const singleBeforeReceipts = receiptCount(singleBefore);
  const batchBeforeReceipts = receiptCount(batchBefore);

  let singleWrittenBytes = 0;
  const singleStartedAt = performance.now();
  for (let index = 0; index < 60; index += 1) {
    const read = await readItem(singles.reviewer, singles.review.review_ref, index);
    const recorded = await singles.reviewer.call("specification_review_record", {
      review_ref: singles.review.review_ref,
      ...coveredVerdict(singles.review.review_ref, index, read),
    });
    assert.equal(recorded.recorded_items, index + 1);
    singleWrittenBytes += (await readFile(singlePath)).byteLength;
  }
  const singleElapsed = performance.now() - singleStartedAt;
  const singleAfterVerdicts = await readFile(singlePath);

  let batchWrittenBytes = 0;
  const batchStartedAt = performance.now();
  for (let offset = 0; offset < 60; offset += 20) {
    const items = [];
    for (let index = offset; index < offset + 20; index += 1) {
      const read = await readItem(batched.reviewer, batched.review.review_ref, index);
      items.push(coveredVerdict(batched.review.review_ref, index, read));
    }
    const recorded = await batched.reviewer.call("specification_review_record_batch", {
      review_ref: batched.review.review_ref,
      items,
    });
    assert.equal(recorded.batch_size, 20);
    assert.equal(recorded.recorded_items, offset + 20);
    batchWrittenBytes += (await readFile(batchPath)).byteLength;
  }
  const batchElapsed = performance.now() - batchStartedAt;
  const batchAfterVerdicts = await readFile(batchPath);

  assert.equal(receiptCount(singleAfterVerdicts), Math.min(64, singleBeforeReceipts + 60));
  assert.equal(receiptCount(batchAfterVerdicts), batchBeforeReceipts + 3);
  assert.deepEqual(semanticResults(batchAfterVerdicts), semanticResults(singleAfterVerdicts));
  assert.equal((await singles.reviewer.call("specification_review_status", {
    review_ref: singles.review.review_ref,
  })).recorded_items, 60);
  assert.equal((await batched.reviewer.call("specification_review_status", {
    review_ref: batched.review.review_ref,
  })).recorded_items, 60);

  const singleComplete = await singles.reviewer.call("specification_review_complete", {
    review_ref: singles.review.review_ref,
  });
  const batchComplete = await batched.reviewer.call("specification_review_complete", {
    review_ref: batched.review.review_ref,
  });
  assert.equal(singleComplete.coverage_status, "reviewed");
  assert.equal(batchComplete.coverage_status, singleComplete.coverage_status);
  const singleFinalBytes = (await readFile(singlePath)).byteLength;
  const batchFinalBytes = (await readFile(batchPath)).byteLength;

  t.diagnostic([
    "equal 60-item inventories: start=1/read=60/complete=1 each",
    `single verdict commits=60, retained receipts=${receiptCount(singleAfterVerdicts) - singleBeforeReceipts}, written=${singleWrittenBytes} bytes, final=${singleFinalBytes} bytes, elapsed=${Math.round(singleElapsed)} ms`,
    `batch verdict commits=3, retained receipts=${receiptCount(batchAfterVerdicts) - batchBeforeReceipts}, written=${batchWrittenBytes} bytes, final=${batchFinalBytes} bytes, elapsed=${Math.round(batchElapsed)} ms`,
  ].join("; "));
});

test("no-op requirement linking stays write-free on large synthetic histories", async (t) => {
  for (const historyRows of [1_000, 10_000]) {
    await t.test(`${historyRows} rows`, async (subtest) => {
      const fixture = await reviewFixture(subtest);
      const journalPath = join(fixture.directory, "decisions.yaml");
      const journal = parse(await readFile(journalPath, "utf8"));
      const template = journal.decisions.find((decision) => (
        decision.id !== "scope.manifest" && decision.requirement_ids.includes("BAT-001")
      ));
      assert.ok(template);
      let target;
      for (let index = 0; index < historyRows; index += 1) {
        target = {
          ...JSON.parse(JSON.stringify(template)),
          id: `fixture.history.${historyRows}.${String(index + 1).padStart(5, "0")}`,
          source: `fixture-customer:history-${historyRows}-${index + 1}`,
        };
        journal.decisions.push(target);
      }
      await writeFile(journalPath, stringify(journal, { lineWidth: 0 }));
      await fixture.author.call("specification_open", {
        project: fixture.project,
        specification: "batch",
      });

      const before = await readFile(journalPath);
      const beforeReceipts = receiptCount(before);
      const input = {
        decision_ref: { id: target.id, revision: target.revision },
        requirement_ids: ["BAT-001"],
      };
      const first = await fixture.author.call("decision_link_requirements", input);
      assert.equal(first.operation_applied, false);
      assert.deepEqual(await readFile(journalPath), before);
      const repeated = await fixture.author.call("decision_link_requirements", input);
      assert.equal(repeated.operation_applied, false);
      assert.deepEqual(await readFile(journalPath), before);
      assert.equal(receiptCount(await readFile(journalPath)), beforeReceipts);
    });
  }
});
