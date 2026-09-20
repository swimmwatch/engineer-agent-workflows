import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import test, { after, before } from "node:test";
import { format } from "prettier";
import { parse } from "yaml";

import { createSharedStdioHarness } from "../test-support/stdio-harness.mjs";

const entrypoint = fileURLToPath(new URL("../dist/main.js", import.meta.url));
const server = createSharedStdioHarness({ entrypoint, name: "decision-linking-test" });
const requirementIds = Array.from({ length: 9 }, (_, index) => `DHM-${String(index + 1).padStart(3, "0")}`);

before(() => server.start());
after(() => server.close());

async function isolatedActor(t, name) {
  const client = createSharedStdioHarness({ entrypoint, name });
  await client.start();
  t.after(() => client.close());
  return client;
}

async function fixture(t, { prettier = true } = {}) {
  const project = await mkdtemp(join(tmpdir(), "workflow-linking-"));
  t.after(() => rm(project, { recursive: true, force: true }));
  if (prettier) {
    await writeFile(join(project, ".prettierrc.json"), `${JSON.stringify({ printWidth: 110, singleQuote: true, endOfLine: "lf" })}\n`);
  }
  const client = server;
  let context;
  async function raw(name, arguments_) {
    const scoped = name === "specification_open" || name === "specification_list"
      ? arguments_
      : { ...(context ? { context } : {}), ...arguments_ };
    return client.callTool({ name, arguments: scoped });
  }
  async function call(name, arguments_ = {}, failure) {
    const response = await raw(name, arguments_);
    if (failure) {
      assert.equal(response.isError, true, JSON.stringify(response));
      assert.equal(response.structuredContent.error.code, failure, JSON.stringify(response));
      return response.structuredContent;
    }
    assert.notEqual(response.isError, true, JSON.stringify(response));
    context = response.structuredContent.context ?? context;
    return response.structuredContent.result;
  }
  const opened = await call("specification_open", { project, specification: "docker-headed-mode" });
  assert.equal(opened.scope, "unconfirmed");
  const proposal = await call("scope_propose", {
    depth: "standard",
    rationale: ["Container browser behavior."],
    profiles: [{ id: "core", reason: "Runtime behavior." }],
  });
  const answer = await call("question_record_answer", {
    question_ref: proposal.question_ref,
    selected_ids: ["confirm"],
    text: "Confirmed.",
    source: "fixture-customer:scope",
  });
  await call("scope_confirm", { proposal_ref: proposal.question_ref, answer_ref: answer.decision_ref });
  const directory = join(project, "docs/specs/docker-headed-mode");
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "spec.md"), `Status: Draft\n\n${requirementIds.map((id) => `### ${id}: Behavior\nPreserve ${id}.`).join("\n\n")}\n`);
  const first = await call("decision_record_fact", {
    category: "runtime",
    fact: "The container owns its display lifecycle.",
    evidence: ["src/runtime.ts"],
  });
  const second = await call("decision_record_fact", {
    category: "runtime",
    fact: "The browser reports startup failures.",
    evidence: ["src/browser.ts"],
  });
  return {
    project,
    client,
    call,
    raw,
    first: first.decision_ref,
    second: second.decision_ref,
    context: () => context,
    ledger: join(directory, "decisions.yaml"),
    manifest: join(directory, "manifest.yaml"),
  };
}

function currentDecision(ledger, id) {
  return ledger.decisions.filter((decision) => decision.id === id).sort((left, right) => right.revision - left.revision)[0];
}

test("decision_link_requirements appends links, preserves all nine identifiers, and avoids no-op revisions", async (t) => {
  const f = await fixture(t);
  const initial = requirementIds.filter((id) => id !== "DHM-008");
  const first = await f.call("decision_link_requirements", { decision_ref: f.first, requirement_ids: initial });
  assert.deepEqual(first.previous_requirement_ids, []);
  assert.deepEqual(first.added, initial);
  assert.deepEqual(first.removed, []);
  assert.deepEqual(first.requirement_ids, initial);
  assert.equal(first.operation_applied, true);

  const second = await f.call("decision_link_requirements", {
    decision_ref: first.decision_ref,
    requirement_ids: ["DHM-008"],
  });
  const finalRequirementIds = [...initial, "DHM-008"];
  assert.deepEqual(second.previous_requirement_ids, initial);
  assert.deepEqual(second.added, ["DHM-008"]);
  assert.deepEqual(second.removed, []);
  assert.deepEqual(second.requirement_ids, finalRequirementIds);
  assert.equal(second.operation_applied, true);
  const ledger = parse(await readFile(f.ledger, "utf8"));
  assert.deepEqual(currentDecision(ledger, f.first.id).requirement_ids, finalRequirementIds);

  const before = await readFile(f.ledger, "utf8");
  const noOp = await f.call("decision_link_requirements", {
    decision_ref: second.decision_ref,
    requirement_ids: ["DHM-008"],
  });
  assert.equal(noOp.operation_applied, false);
  assert.deepEqual(noOp.added, []);
  assert.deepEqual(noOp.requirement_ids, finalRequirementIds);
  assert.equal(await readFile(f.ledger, "utf8"), before);
});

test("decision_link_requirements_batch validates all links before one atomic journal update", async (t) => {
  const f = await fixture(t);
  const before = await readFile(f.ledger, "utf8");
  await f.call("decision_link_requirements_batch", {
    items: [
      { decision_ref: f.first, requirement_ids: ["DHM-001"] },
      { decision_ref: f.second, requirement_ids: ["MISSING-001"] },
    ],
  }, "BROKEN_REFERENCE");
  assert.equal(await readFile(f.ledger, "utf8"), before);

  const linked = await f.call("decision_link_requirements_batch", {
    items: [
      { decision_ref: f.first, requirement_ids: requirementIds },
      { decision_ref: f.second, requirement_ids: ["DHM-009"] },
    ],
  });
  assert.equal(linked.operation_applied, true);
  assert.equal(linked.items.length, 2);
  assert.deepEqual(linked.items[0].requirement_ids, requirementIds);
  assert.deepEqual(linked.items[1].requirement_ids, ["DHM-009"]);
  const ledger = parse(await readFile(f.ledger, "utf8"));
  assert.deepEqual(currentDecision(ledger, f.first.id).requirement_ids, requirementIds);
  assert.deepEqual(currentDecision(ledger, f.second.id).requirement_ids, ["DHM-009"]);
});

test("a stale write reports the current context and current decision reference without hiding committed work", async (t) => {
  const f = await fixture(t);
  const staleContext = f.context();
  await f.call("decision_link_requirements", { decision_ref: f.first, requirement_ids: ["DHM-001"] });
  const response = await f.raw("decision_link_requirements", {
    context: staleContext,
    decision_ref: f.second,
    requirement_ids: ["DHM-002"],
  });
  assert.equal(response.isError, true, JSON.stringify(response));
  assert.equal(response.structuredContent.error.code, "CONFLICT");
  assert.equal(response.structuredContent.error.operation_applied, false);
  assert.equal(typeof response.structuredContent.error.current_context, "string");
  assert.deepEqual(response.structuredContent.error.current_decision_ref, f.second);
  const reopened = await f.call("specification_open", { project: f.project, specification: "docker-headed-mode" });
  assert.equal(reopened.scope, "confirmed");
  const ledger = parse(await readFile(f.ledger, "utf8"));
  assert.deepEqual(currentDecision(ledger, f.first.id).requirement_ids, ["DHM-001"]);
  assert.deepEqual(currentDecision(ledger, f.second.id).requirement_ids ?? [], []);
});

test("workflow-owned YAML remains stable under the project's declarative Prettier configuration", async (t) => {
  const f = await fixture(t);
  await f.call("decision_link_requirements_batch", {
    items: [
      { decision_ref: f.first, requirement_ids: requirementIds },
      { decision_ref: f.second, requirement_ids: ["DHM-008", "DHM-009"] },
    ],
  });
  const options = { parser: "yaml", printWidth: 110, singleQuote: true, endOfLine: "lf" };
  for (const path of [f.ledger, f.manifest]) {
    const source = await readFile(path, "utf8");
    assert.equal(await format(source, options), source, `${path} must already match Prettier`);
  }
});

test("an extensionless declarative Prettier configuration accepts YAML syntax", async (t) => {
  const f = await fixture(t, { prettier: false });
  await writeFile(join(f.project, ".prettierrc"), "printWidth: 110\nsingleQuote: true\nendOfLine: lf\n");
  await f.call("decision_link_requirements", {
    decision_ref: f.first,
    requirement_ids: requirementIds,
  });
  const source = await readFile(f.ledger, "utf8");
  assert.equal(await format(source, { parser: "yaml", printWidth: 110, singleQuote: true, endOfLine: "lf" }), source);
});

test("a bare project preserves the YAML serializer output without applying default Prettier formatting", async (t) => {
  const f = await fixture(t, { prettier: false });
  const original = await readFile(f.ledger, "utf8");
  await writeFile(f.ledger, original.replace("schema_version: 1\n", "schema_version: 1\nbare_style: [one,two]\n"));
  await f.call("specification_open", { project: f.project, specification: "docker-headed-mode" });
  await f.call("decision_link_requirements", {
    decision_ref: f.first,
    requirement_ids: requirementIds,
  });
  const source = await readFile(f.ledger, "utf8");
  assert.match(source, /^bare_style: \[ one, two \]$/m);
  assert.notEqual(await format(source, { parser: "yaml" }), source);
});

test("an invalid declarative Prettier configuration prevents the workflow write", async (t) => {
  const f = await fixture(t);
  await writeFile(join(f.project, ".prettierrc.json"), "{ invalid json\n");
  const before = await readFile(f.ledger, "utf8");
  await f.call("decision_link_requirements", {
    decision_ref: f.first,
    requirement_ids: ["DHM-001"],
  }, "INVALID_FORMATTER_CONFIG");
  assert.equal(await readFile(f.ledger, "utf8"), before);
});

test("an independent stale writer receives recovery context without overwriting committed links", async (t) => {
  const f = await fixture(t);
  const other = await isolatedActor(t, "decision-linking-concurrent-writer");
  const opened = await other.callTool({
    name: "specification_open",
    arguments: { project: f.project, specification: "docker-headed-mode" },
  });
  assert.notEqual(opened.isError, true, JSON.stringify(opened));
  const staleContext = opened.structuredContent.context;

  const committed = await f.call("decision_link_requirements", {
    decision_ref: f.first,
    requirement_ids: ["DHM-001"],
  });
  const response = await other.callTool({
    name: "decision_link_requirements_batch",
    arguments: {
      context: staleContext,
      items: [
        { decision_ref: f.first, requirement_ids: ["DHM-002"] },
        { decision_ref: f.second, requirement_ids: ["DHM-003"] },
      ],
    },
  });
  assert.equal(response.isError, true, JSON.stringify(response));
  assert.equal(response.structuredContent.error.code, "CONFLICT");
  assert.equal(response.structuredContent.error.operation_applied, false);
  assert.equal(typeof response.structuredContent.error.current_context, "string");
  assert.deepEqual(response.structuredContent.error.current_decision_refs, [committed.decision_ref, f.second]);

  const ledger = parse(await readFile(f.ledger, "utf8"));
  assert.deepEqual(currentDecision(ledger, f.first.id).requirement_ids, ["DHM-001"]);
  assert.deepEqual(currentDecision(ledger, f.second.id).requirement_ids ?? [], []);
});
