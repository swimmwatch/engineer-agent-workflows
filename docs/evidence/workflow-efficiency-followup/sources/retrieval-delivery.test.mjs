import assert from "node:assert/strict";
import test from "node:test";
import { boundedRetrieval } from "./retrieval-delivery.mjs";

test("bounded retrieval preserves every Unicode byte and source order", () => {
  const original = "α🧪 Exact source.\n".repeat(1000);
  const result = boundedRetrieval({ content: [{ type: "text", text: JSON.stringify({ hash: "original", original_content: original }) }] });
  assert.equal(result.content.slice(1).map(part => part.text).join(""), original);
  assert.ok(result.content.slice(1).every(part => Buffer.byteLength(part.text) <= 512));
  assert.equal(JSON.parse(result.content[0].text).sourceBytes, Buffer.byteLength(original));
});

test("missing, malformed and non-exact retrieval results pass through without inventing content", () => {
  for (const result of [{ isError: true, content: [] }, { content: [{ type: "text", text: "not JSON" }] },
    { content: [{ type: "text", text: JSON.stringify({ error: "unavailable" }) }] }]) {
    assert.equal(boundedRetrieval(result), result);
  }
});
