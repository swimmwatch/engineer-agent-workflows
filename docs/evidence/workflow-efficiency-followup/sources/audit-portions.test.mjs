import assert from "node:assert/strict";
import test from "node:test";
import { auditPortions } from "./audit-portions.mjs";
const part = (offset, text, complete, cursor, next) => ({ id: String(offset), completedAtMs: offset + 1,
  arguments: { cursor }, result: { result: { offset, text, complete, next_cursor: next, total_characters: 4, source_version: "v" } } });
test("a terminal portion cannot hide a missing prefix, stale version or wrong continuation", () => {
  const first = part(0, "ab", false, undefined, "next"), last = part(2, "cd", true, "next", null);
  assert.equal(auditPortions([first, last], "v").complete, true);
  assert.equal(auditPortions([last], "v").complete, false);
  assert.equal(auditPortions([first, last], "stale").complete, false);
  assert.equal(auditPortions([first, { ...last, arguments: { cursor: "wrong" } }], "v").complete, false);
});
