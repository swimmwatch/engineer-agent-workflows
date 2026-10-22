import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const root = fileURLToPath(new URL("../", import.meta.url));
const sources = [
  "shared/references/test-discipline.md",
  ...["codex", "claude-code"].flatMap((host) =>
    ["spec-driven-development", "planning-and-task-breakdown", "incremental-implementation", "design-planning"].map(
      (skill) => `plugins/${host}/engineer-agent-workflows/skills/${skill}/shared/references/test-discipline.md`,
    ),
  ),
];

test("mandatory test discipline delegates workflow YAML to the scenario contract", async () => {
  for (const source of sources) {
    const reference = await readFile(path.join(root, source), "utf8");
    assert.doesNotMatch(reference, /Require protocol version 1|MCP is read-only|Journal Authoring Format|```yaml/, source);
    assert.match(reference, /shared\/references\/workflow-state-access\.md/, source);
    assert.match(reference, /scenario tools/, source);
  }
});

test("scenario authoring preserves complete answers and pending state through the published MCP", { timeout: 20000 }, async (t) => {
  const project = await mkdtemp(path.join(os.tmpdir(), "decision-authoring-"));
  t.after(() => rm(project, { recursive: true, force: true }));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(root, "packages/engineer-agent-workflow-mcp/dist/main.js")],
    stderr: "pipe",
  });
  let stderr = "";
  transport.stderr.on("data", (chunk) => { stderr += chunk; });
  const client = new Client({ name: "authoring-contract-test", version: "2.0.0" }, { capabilities: {} });
  t.after(async () => { await client.close(); assert.equal(stderr, ""); });
  await client.connect(transport);
  const call = async (name, args) => {
    const response = await client.callTool({ name, arguments: args });
    assert.notEqual(response.isError, true, JSON.stringify(response));
    assert.equal(response.structuredContent.protocol_version, 2);
    return response.structuredContent;
  };

  let state = await call("specification_open", { project, specification: "example" });
  state = await call("question_prepare", {
    context: state.context, category: "observability", kind: "free_text",
    text: "What data may appear in operational logs?",
  });
  state = await call("question_record_no_answer", {
    context: state.context, question_ref: state.result.question_ref, outcome: "dismissed",
  });
  const pendingRef = state.result.question_ref;
  state = await call("specification_open", { project, specification: "example" });
  assert.equal(state.result.pending_count, 1);
  assert.deepEqual(state.result.pending_questions, [pendingRef]);
  const exactAnswer = "Operation names, outcome codes and numeric counts only.\n" +
    "No tenant, actor, order, event or replay IDs; no raw payloads or notes.\n" +
    "Preserve punctuation: 'quotes', colon: space, Unicode 🔐, and the final guarantee: no cross-tenant disclosure.";
  const args = {
    context: state.context, question_ref: pendingRef, text: exactAnswer,
    source: "fixture-customer:observability-answer",
  };
  state = await call("question_record_answer", args);
  assert.equal((await call("question_record_answer", args)).replayed, true);
  const answeredRef = state.result.decision_ref;
  const exact = await call("decision_get", { context: state.context, decision_ref: answeredRef });
  assert.equal(exact.result.next_cursor, null);
  assert.equal(JSON.parse(exact.result.text).answer.text, exactAnswer);
  const historical = await call("decision_get", { context: exact.context, decision_ref: pendingRef });
  assert.equal(JSON.parse(historical.result.text).answer, null);
  state = await call("specification_open", { project, specification: "example" });
  assert.equal(state.result.pending_count, 0);
});
