import assert from "node:assert/strict";
import test from "node:test";
import { LedgerError } from "../dist/ledger.js";
import { errorResult, successResult } from "../dist/server.js";

test("tool results contain matching structured/text data within both byte limits", () => {
  const payload = { protocol_version: 1, value: "Exact: text\nwith quotes \" and Unicode Ж😀" };
  const result = successResult(payload);
  assert.deepEqual(result.structuredContent, payload);
  assert.deepEqual(JSON.parse(result.content[0].text), payload);
  assert.notEqual(result.isError, true);
  assert.ok(Buffer.byteLength(JSON.stringify(result)) <= 65536);
});

test("oversized data is an explicit error, not a truncated successful result", () => {
  const result = successResult({ protocol_version: 1, value: "x".repeat(24577) });
  assert.equal(result.isError, true);
  assert.equal(result.structuredContent.error.code, "RESULT_LIMIT");
  assert.ok(Buffer.byteLength(JSON.stringify(result)) < 1024);
});

test("JSON escaping cannot exceed the full MCP result budget", () => {
  const payload = { protocol_version: 1, value: '"'.repeat(12000) };
  assert.ok(Buffer.byteLength(JSON.stringify(payload)) < 24576);
  const result = successResult(payload);
  assert.equal(result.isError, true);
  assert.equal(result.structuredContent.error.code, "RESULT_LIMIT");
  assert.ok(Buffer.byteLength(JSON.stringify(result)) < 1024);
});
test("transport errors never expose source snippets, paths or stack traces", () => {
  for (const error of [new Error("secret-source-path"), new LedgerError("INVALID_YAML", "private YAML answer")]) {
    const result = errorResult(error);
    assert.equal(result.isError, true);
    const encoded = JSON.stringify(result);
    assert.ok(!encoded.includes("secret-source-path"));
    assert.ok(!encoded.includes("private YAML answer"));
    assert.ok(!encoded.includes("stack"));
    assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
  }
});
