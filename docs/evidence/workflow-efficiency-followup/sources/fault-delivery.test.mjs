import assert from "node:assert/strict";
import test from "node:test";
import { lostReply } from "./fault-delivery.mjs";

test("only the selected successful reply is lost once; other wire bytes are unchanged", () => {
  const line = '{"jsonrpc":"2.0","id":7,"result":{"structuredContent":{"revision":9007199254740993}}}';
  const state = { dropped: false };
  assert.equal(lostReply(line, "read", "start", state), line);
  assert.equal(JSON.parse(lostReply(line, "start", "start", state)).error.code, -32000);
  assert.equal(lostReply(line, "start", "start", state), line);
});

test("failed server operations are never relabelled as uncertain success", () => {
  const line = '{"jsonrpc":"2.0","id":7,"result":{"isError":true}}';
  const state = { dropped: false };
  assert.equal(lostReply(line, "start", "start", state), line);
  assert.equal(state.dropped, false);
});
