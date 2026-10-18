import assert from "node:assert/strict";
import test from "node:test";
import { createQualificationDiagnostics } from "./support/qualification-diagnostics.mjs";

test("I11-N2: timeout diagnostics identify pending work without payloads or contexts", async () => {
  const controller = new globalThis.AbortController();
  const lines = [], hooks = [];
  const diagnostics = createQualificationDiagnostics({ signal: controller.signal,
    diagnostic(line) { lines.push(JSON.parse(line)); }, after(hook) { hooks.push(hook); } });
  let release;
  const work = diagnostics.phase("reliability", () => new Promise((resolve) => { release = resolve; }));
  diagnostics.observe({ event: "start", actor: "product-reviewer-qualification", tool: "product_session_call",
    scenario: "product_review_record", arguments: { context: "SENTINEL_OPAQUE_CONTEXT", body: "SENTINEL_BODY" } });
  diagnostics.observe({ event: "review-item", itemIndex: 118, totalItems: 119 });
  controller.abort();
  const aborted = lines.find((line) => line.event === "aborted");
  assert.equal(aborted.phase, "reliability");
  assert.equal(aborted.completed, 0);
  assert.deepEqual(aborted.review, { itemIndex: 118, totalItems: 119 });
  assert.equal(aborted.phaseCompleted, 0);
  assert.equal(aborted.pending.length, 1);
  assert.equal(aborted.pending[0].tool, "product_session_call");
  assert.equal(aborted.pending[0].scenario, "product_review_record");
  assert.ok(Number.isFinite(aborted.pending[0].elapsedMs));
  assert.ok(Number.isFinite(aborted.elapsedMs));
  release(); await work;
  diagnostics.observe({ event: "end", actor: "product-reviewer-qualification", tool: "product_session_call", scenario: "product_review_record" });
  diagnostics.observe({ event: "start", actor: "product-reviewer-qualification", tool: "close" });
  assert.equal(lines.at(-1).event, "cleanup-start");
  assert.equal(lines.at(-1).pending[0].tool, "close");
  diagnostics.observe({ event: "end", actor: "product-reviewer-qualification", tool: "close" });
  assert.equal(lines.at(-1).event, "cleanup-end");
  for (const hook of hooks) hook();
  assert.equal(lines.at(-1).completed, 2);
  assert.equal(lines.at(-1).pending.length, 0);
  assert.doesNotMatch(JSON.stringify(lines), /SENTINEL_OPAQUE_CONTEXT|SENTINEL_BODY/);
});

test("I11-N2: progress output is bounded and rejects unknown identifiers", async () => {
  const lines = [], hooks = [];
  const controller = new globalThis.AbortController();
  const diagnostics = createQualificationDiagnostics({ signal: controller.signal,
    diagnostic(line) { lines.push(JSON.parse(line)); }, after(hook) { hooks.push(hook); } });
  await diagnostics.phase("inventory", async () => {
    for (let index = 0; index < 205; index += 1) {
      diagnostics.observe({ event: "start", actor: "product-author-qualification", tool: "product_session_call", scenario: "product_review_get" });
      diagnostics.observe({ event: "end", actor: "product-author-qualification", tool: "product_session_call", scenario: "product_review_get" });
    }
  });
  diagnostics.observe({ event: "start", actor: "SENTINEL_PRIVATE_PATH", tool: "SENTINEL_SECRET_TOOL", scenario: "SENTINEL_SECRET_SCENARIO" });
  controller.abort();
  const aborted = lines.find((line) => line.event === "aborted");
  assert.equal(aborted.completed, 205);
  assert.equal(aborted.pending[0].tool, "redacted");
  assert.equal(aborted.pending[0].scenario, "redacted");
  assert.equal(aborted.pending[0].actor, "redacted");
  assert.deepEqual(lines.filter((line) => line.event === "checkpoint").map((line) => line.completed), [100, 200]);
  assert.ok(lines.length <= 6, "progress must not emit a line for every request");
  assert.ok(lines.every((line) => JSON.stringify(line).length < 2_000));
  assert.doesNotMatch(JSON.stringify(lines), /SENTINEL/);
  for (const hook of hooks) hook();
});
