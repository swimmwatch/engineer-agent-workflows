import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import console from "node:console";
import { performance } from "node:perf_hooks";
import test from "node:test";
import { TextEncoder } from "node:util";

import {
  LedgerError,
  findDecision,
  parseLedger,
  searchDecisions,
} from "../dist/ledger.js";

const specification = "example-spec";
const LARGE_DECISION_COUNT = 3_100;

function ledgerYaml(decisions) {
  return [
    "schema_version: 1",
    `spec_slug: ${specification}`,
    "decisions:",
    decisions,
    "",
  ].join("\n");
}

const validDecisions = `
  - id: rollout.policy
    revision: 1
    category: workflow
    state: superseded
    provenance: user
    evidence: []
    question: null
    answer: null
    supersedes_revision: null
    requirement_ids: [READ-001]
  - id: rollout.policy
    revision: 2
    category: workflow
    state: answered
    provenance: user
    evidence: [contract.md]
    question: null
    answer:
      text: |-
        First line:
        second line
      selected_ids: [mcp-only]
    supersedes_revision: 1
    requirement_ids: [READ-001, FLOW-001]
    legacy_payload:
      nested: [true, 3, null]
  - id: retired.choice
    revision: 1
    category: legacy
    state: retired
    provenance: migration
    evidence: []
    question: null
    answer: null
    supersedes_revision: null
    rationale: Kept for history.
    requirement_ids: [DATA-001]
  - id: history.only
    revision: 1
    category: legacy
    state: superseded
    provenance: migration
    evidence: []
    question: null
    answer: null
    supersedes_revision: null
    requirement_ids: [DATA-001]
  - id: ambiguous.choice
    revision: 1
    category: data
    state: answered
    provenance: user
    evidence: []
    question: null
    answer: null
    supersedes_revision: null
    requirement_ids: [DATA-001]
  - id: ambiguous.choice
    revision: 2
    category: data
    state: answered
    provenance: user
    evidence: []
    question: null
    answer: null
    supersedes_revision: null
    requirement_ids: [DATA-001]
`;

function parseValidLedger() {
  return parseLedger(
    new TextEncoder().encode(ledgerYaml(validDecisions)),
    specification,
  );
}

function assertLedgerError(expectedCode, operation) {
  assert.throws(operation, (error) => {
    assert.ok(error instanceof LedgerError);
    assert.equal(error.code, expectedCode);
    assert.ok(error.message.length <= 512);
    return true;
  });
}

function largeDecisionJournal() {
  const decisions = [];
  for (let index = 0; index < LARGE_DECISION_COUNT; index += 1) {
    const paddedIndex = String(index).padStart(5, "0");
    decisions.push(`  - id: bulk.decision-${paddedIndex}
    revision: 1
    category: bulk
    state: answered
    provenance: synthetic
    evidence: [large-fixture]
    question: null
    answer:
      text: Bulk needle ${paddedIndex}
      selected_ids: [bulk]
    supersedes_revision: null
    requirement_ids: [LARGE-001]`);
  }
  decisions.push(`  - id: bulk.revised
    revision: 1
    category: bulk
    state: superseded
    provenance: synthetic
    evidence: [large-fixture]
    question: null
    answer:
      text: Historical bulk decision
      selected_ids: [old]
    supersedes_revision: null
    requirement_ids: [LARGE-001]
  - id: bulk.revised
    revision: 2
    category: bulk
    state: answered
    provenance: synthetic
    evidence: [large-fixture]
    question: null
    answer:
      text: Current bulk decision
      selected_ids: [new]
    supersedes_revision: 1
    requirement_ids: [LARGE-001]`);
  return ledgerYaml(decisions.join("\n"));
}

test("parses versioned decisions, preserves JSON-compatible legacy fields, and selects current revisions", () => {
  const ledger = parseValidLedger();

  assert.equal(ledger.specification, specification);
  assert.match(ledger.version, /^[a-f0-9]{64}$/);
  assert.equal(ledger.decisions.length, 6);
  assert.deepEqual(
    ledger.current.map((decision) => [decision.id, decision.revision]),
    [
      ["ambiguous.choice", 2],
      ["retired.choice", 1],
      ["rollout.policy", 2],
    ],
  );
  assert.equal(ledger.warningCounts.multiple_current_revisions, 1);
  assert.deepEqual(searchDecisions(ledger, { ids: ["history.only"] }), []);

  const policy = findDecision(ledger, "rollout.policy", 2);
  assert.equal(policy.answer.text, "First line:\nsecond line");
  assert.deepEqual(policy.legacy_payload, { nested: [true, 3, null] });
  assert.equal(findDecision(ledger, "retired.choice").state, "retired");
});

test("searches current records by ANDed filters and literal case-insensitive JSON content", () => {
  const ledger = parseValidLedger();

  assert.deepEqual(
    searchDecisions(ledger, {
      categories: ["workflow"],
      requirement_ids: ["READ-001"],
      text: "FIRST LINE:\nSECOND",
    }).map((decision) => [decision.id, decision.revision]),
    [["rollout.policy", 2]],
  );
  assert.deepEqual(
    searchDecisions(ledger, { ids: ["ambiguous.choice"], history: true }).map(
      (decision) => decision.revision,
    ),
    [1, 2],
  );
  assert.deepEqual(searchDecisions(ledger, { text: ".*" }), []);
  assert.deepEqual(
    searchDecisions(ledger, { states: ["retired"] }).map((decision) => decision.id),
    ["retired.choice"],
  );
});

test("findDecision requires an exact requested revision and never guesses on a miss", () => {
  const ledger = parseValidLedger();

  assert.equal(findDecision(ledger, "rollout.policy").revision, 2);
  assert.equal(findDecision(ledger, "rollout.policy", 1).state, "superseded");
  assertLedgerError("NOT_FOUND", () => findDecision(ledger, "rollout.policy", 99));
  assertLedgerError("NOT_FOUND", () => findDecision(ledger, "missing.choice"));
});

test("accepts a 512-character decision ID through revision supersession and rejects longer IDs", () => {
  const maximumId = "a".repeat(512);
  const validSource = ledgerYaml(`
  - id: ${maximumId}
    revision: 1
    category: data
    state: superseded
    provenance: user
    supersedes_revision: null
  - id: ${maximumId}
    revision: 2
    category: data
    state: answered
    provenance: user
    supersedes_revision: 1
`);
  const validLedger = parseLedger(new TextEncoder().encode(validSource), specification);

  assert.equal(findDecision(validLedger, maximumId).revision, 2);
  assertLedgerError("INVALID_LEDGER", () =>
    parseLedger(
      new TextEncoder().encode(
        ledgerYaml(`
  - id: ${"b".repeat(513)}
    revision: 1
    category: data
    state: answered
    provenance: user
`),
      ),
      specification,
    ),
  );
});

test("rejects malformed documents, duplicate keys, aliases, unsupported tags, and invalid supersedes links", () => {
  assertLedgerError("INVALID_LEDGER", () =>
    parseLedger(
      new TextEncoder().encode("schema_version: 1\nspec_slug: example-spec\ndecisions: {}\n"),
      specification,
    ),
  );
  assertLedgerError("INVALID_YAML", () =>
    parseLedger(
      new TextEncoder().encode(
        "schema_version: 1\nschema_version: 1\nspec_slug: example-spec\ndecisions: []\n",
      ),
      specification,
    ),
  );
  assertLedgerError("INVALID_YAML", () =>
    parseLedger(
      new TextEncoder().encode(
        "schema_version: 1\nspec_slug: example-spec\nbase: &shared hello\ndecisions: [*shared]\n",
      ),
      specification,
    ),
  );
  assertLedgerError("INVALID_YAML", () =>
    parseLedger(
      new TextEncoder().encode(
        "schema_version: 1\nspec_slug: example-spec\ndecisions: !unsupported []\n",
      ),
      specification,
    ),
  );
  assertLedgerError("INVALID_LEDGER", () =>
    parseLedger(
      new TextEncoder().encode(
        ledgerYaml(`
  - id: invalid.question
    revision: 1
    category: data
    state: answered
    provenance: user
    question: "not a question mapping"
`),
      ),
      specification,
    ),
  );
  assertLedgerError("INVALID_LEDGER", () =>
    parseLedger(
      new TextEncoder().encode(
        ledgerYaml(`
  - id: invalid.answer
    revision: 1
    category: data
    state: answered
    provenance: user
    answer: "🙂"
`),
      ),
      specification,
    ),
  );
  assertLedgerError("INVALID_LEDGER", () =>
    parseLedger(
      new TextEncoder().encode(
        ledgerYaml(`
  - id: invalid.link
    revision: 2
    category: data
    state: answered
    provenance: user
    supersedes_revision: 1
`),
      ),
      specification,
    ),
  );
  assertLedgerError("INVALID_LEDGER", () =>
    parseLedger(
      new TextEncoder().encode(
        ledgerYaml(`
  - id: duplicate.pair
    revision: 1
    category: data
    state: answered
    provenance: user
  - id: duplicate.pair
    revision: 1
    category: data
    state: answered
    provenance: user
`),
      ),
      specification,
    ),
  );
});

test("rejects oversized sources before parsing", () => {
  const oversized = new Uint8Array(16 * 1024 * 1024 + 1);
  assertLedgerError("SOURCE_LIMIT", () => parseLedger(oversized, specification));
});

test("parses a synthetic journal exceeding 30,000 lines of decision data and exercises current, history, and search", () => {
  const source = largeDecisionJournal();
  const bytes = new TextEncoder().encode(source);
  const startedAt = performance.now();
  const ledger = parseLedger(bytes, specification);
  const elapsedMs = performance.now() - startedAt;
  const currentResults = searchDecisions(ledger, {
    categories: ["bulk"],
    requirement_ids: ["LARGE-001"],
  });
  const historicalResults = searchDecisions(ledger, {
    ids: ["bulk.revised"],
    history: true,
  });
  const literalSearch = searchDecisions(ledger, { text: "bulk needle 03099" });
  const overviewBytes = Buffer.byteLength(
    JSON.stringify({
      specification: ledger.specification,
      version: ledger.version,
      decisions: ledger.decisions.length,
      current: ledger.current.length,
      warningCounts: ledger.warningCounts,
    }),
  );
  const currentResultBytes = Buffer.byteLength(JSON.stringify(currentResults));
  const historicalResultBytes = Buffer.byteLength(JSON.stringify(historicalResults));

  assert.ok(source.split("\n").length - 1 > 30_000);
  assert.equal(ledger.decisions.length, LARGE_DECISION_COUNT + 2);
  assert.equal(ledger.current.length, LARGE_DECISION_COUNT + 1);
  assert.equal(currentResults.length, LARGE_DECISION_COUNT + 1);
  assert.deepEqual(
    historicalResults.map((decision) => decision.revision),
    [1, 2],
  );
  assert.deepEqual(
    literalSearch.map((decision) => decision.id),
    ["bulk.decision-03099"],
  );
  console.log(
    `large-fixture lines=${source.split("\n").length - 1} bytes=${bytes.byteLength} parse_ms=${elapsedMs.toFixed(2)} overview_bytes=${overviewBytes} current_result_bytes=${currentResultBytes} history_result_bytes=${historicalResultBytes}`,
  );
});
