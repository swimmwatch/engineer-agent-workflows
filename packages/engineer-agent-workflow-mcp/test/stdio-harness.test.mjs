import assert from "node:assert/strict";
import test from "node:test";

import { createSharedStdioHarness } from "../test-support/stdio-harness.mjs";

test("shared stdio harness reuses one client until an explicit restart", async () => {
  const events = [];
  const harness = createSharedStdioHarness({
    entrypoint: "/fixture/server.mjs",
    name: "fixture-client",
    createClient: async ({ entrypoint, name }) => {
      events.push(["start", entrypoint, name]);
      return {
        callTool: async (request) => ({ request }),
        listTools: async () => ({ tools: [name] }),
        close: async () => events.push(["close"]),
      };
    },
  });

  assert.deepEqual(await harness.callTool({ name: "first" }), { request: { name: "first" } });
  assert.deepEqual(await harness.callTool({ name: "second" }), { request: { name: "second" } });
  assert.deepEqual(await harness.listTools(), { tools: ["fixture-client"] });
  assert.equal(harness.startCount, 1);

  await harness.restart();
  assert.deepEqual(await harness.callTool({ name: "third" }), { request: { name: "third" } });
  assert.equal(harness.startCount, 2);

  await harness.close();
  await harness.close();
  assert.deepEqual(events, [
    ["start", "/fixture/server.mjs", "fixture-client"],
    ["close"],
    ["start", "/fixture/server.mjs", "fixture-client"],
    ["close"],
  ]);
});
