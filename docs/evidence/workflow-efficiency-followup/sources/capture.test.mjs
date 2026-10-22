import assert from "node:assert/strict";
import test from "node:test";
import { observeInvocations, isRootCompletion } from "./capture.mjs";

const begin = (id, turn, at) => [
  { atMs: at, direction: "send", message: { id, method: "turn/start", params: { threadId: "thread" } } },
  { atMs: at + 1, direction: "receive", message: { id, result: { turn: { id: turn } } } },
];
const item = (method, turn, id, at, extra = {}) => ({ atMs: at, direction: "receive",
  message: { method: `item/${method}`, params: { turnId: turn, item: {
    id, type: "mcpToolCall", tool: "specification_check_state", ...extra,
  } } } });

test("completed results retain distinct request and response timestamps and exact invocation", () => {
  const result = observeInvocations([
    ...begin(1, "first", 0), item("started", "first", "gate", 10),
    item("completed", "first", "gate", 25, { result: { structuredContent: { result: { status: "pass" } } } }),
    ...begin(2, "second", 30), item("completed", "second", "later", 45),
  ]);
  assert.equal(result.length, 2);
  assert.deepEqual(result[0].items.map(value => value.id), ["gate"]);
  assert.equal(result[0].items[0].startedAtMs, 10);
  assert.equal(result[0].items[0].completedAtMs, 25);
  assert.equal(result[0].items[0].result.result.status, "pass");
  assert.equal(result[1].items[0].startedAtMs, null);
  assert.ok(result[1].issues.includes("missing-item-start"));
});

test("a request without its completed result is incomplete evidence", () => {
  const [result] = observeInvocations([...begin(1, "first", 0), item("started", "first", "gate", 10)]);
  assert.equal(result.items[0].completedAtMs, null);
  assert.equal(result.items[0].result, null);
  assert.ok(result.issues.includes("incomplete-item"));
});

test("invocation boundaries reject late items, reversed acknowledgement and duplicate completion", () => {
  const [result] = observeInvocations([
    ...begin(1, "first", 10).map((event, index) => index ? { ...event, atMs: 9 } : event),
    item("started", "first", "late", 20),
    { atMs: 25, direction: "receive", message: { method: "turn/completed", params: { turn: { id: "first", status: "completed" } } } },
    item("completed", "first", "late", 30),
    { atMs: 35, direction: "receive", message: { method: "turn/completed", params: { turn: { id: "first", status: "completed" } } } },
  ]);
  assert.ok(result.issues.includes("invalid-invocation-interval"));
  assert.ok(result.issues.includes("item-outside-invocation"));
  assert.ok(result.issues.includes("duplicate-invocation-completion"));
  assert.equal(result.completedAtMs, 25);
});

test("overlapping calls measure their union separately from duration sum", () => {
  const [result] = observeInvocations([
    ...begin(1, "first", 0), item("started", "first", "a", 10), item("started", "first", "b", 15),
    item("completed", "first", "a", 30), item("completed", "first", "b", 40),
  ]);
  assert.equal(result.toolDurationSumMs, 45);
  assert.equal(result.toolIntervalUnionMs, 30);
  assert.equal(result.toolOverlapMs, 15);
});

test("out-of-order results and reused item identities cannot silently certify time", () => {
  const [result] = observeInvocations([
    ...begin(1, "first", 0), item("started", "first", "a", 20), item("completed", "first", "a", 15),
    item("completed", "first", "a", 30),
  ]);
  assert.ok(result.issues.includes("invalid-item-interval"));
  assert.ok(result.issues.includes("duplicate-item-completion"));
});

test("native child work is attributed separately and cannot finish the root invocation", () => {
  const childStart = { atMs: 5, direction: "receive", message: { method: "turn/started",
    params: { threadId: "child-thread", turn: { id: "child", rootTurnId: "first" } } } };
  const childEnd = { method: "turn/completed", params: { threadId: "child-thread",
    turn: { id: "child", rootTurnId: "first", status: "completed" } } };
  const results = observeInvocations([...begin(1, "first", 0), childStart,
    item("started", "child", "child-gate", 10), item("completed", "child", "child-gate", 20),
    { atMs: 25, direction: "receive", message: childEnd }]);
  assert.equal(results.length, 2);
  assert.equal(results[0].items.length, 0);
  assert.equal(results[0].status, null);
  assert.equal(results[1].rootTurnId, "first");
  assert.equal(results[1].items[0].id, "child-gate");
  assert.equal(isRootCompletion(childEnd, "thread"), false);
  assert.equal(isRootCompletion({ method: "turn/completed", params: { threadId: "thread", turn: { id: "first" } } }, "thread"), true);
});
