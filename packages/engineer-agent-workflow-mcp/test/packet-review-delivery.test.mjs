import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import test, { before, after } from "node:test";
import { planningFixture } from "../test-support/planning-fixture.mjs";
import { createSharedStdioHarness } from "../test-support/stdio-harness.mjs";
import { readPacketReviewState, mutatePacketReviewState } from "../dist/packet-review-state.js";
import { productTools } from "../dist/product/tools.js";
import { boundedSuccessResult } from "../dist/response-budget.js";

const execute = promisify(execFile);
const server = createSharedStdioHarness({ entrypoint: fileURLToPath(new URL("../dist/main.js", import.meta.url)), name: "packet-delivery" });
before(() => server.start());
after(() => server.close());

async function fixture(t) {
  const f = await planningFixture(t, server);
  await f.write("p1", f.sources.p1 + "\n## Acceptance\n\n- Preserve the exact independently checkable obligation.\n");
  const question = await f.prepare();
  const accepted = await f.record(question.question_ref, ["p1"]);
  const agreement = accepted.agreements[0];
  const git = (...args) => execute("git", ["-C", f.project, ...args], { env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" } });
  await git("init", "--quiet");
  await git("config", "user.name", "Fixture"); await git("config", "user.email", "fixture@example.invalid");
  await writeFile(join(f.project, "source.txt"), "A baseline.\n");
  await git("add", "source.txt"); await git("commit", "--quiet", "-m", "Baseline fixture");
  const packet = { packet_id: "p1", path: f.paths.p1, agreement_ref: agreement.agreement_ref, proposal_digest: agreement.proposal_digest };
  const request = (extra = {}) => ({ mode: "working_tree", baseline_ref: "HEAD", paths: ["source.txt"], packets: [packet], ...extra });
  const module = await import("../dist/packet-review-inputs.js");
  const prepare = extra => module.preparePacketReviewInputs(f.context, request(extra));
  async function units(prepared) {
    let cursor;
    const items = [];
    do {
      const page = await module.listPacketReviewUnits(f.context, prepared.result.run_ref, cursor);
      assert.ok(Buffer.byteLength(JSON.stringify(page)) <= 24 * 1024);
      items.push(...page.result.items); cursor = page.result.next_cursor;
    } while (cursor);
    return items;
  }
  return { ...f, packet, request, module, prepare, units, get currentContext() { return f.context; } };
}

async function record(f, selector) {
  let cursor, text = "";
  do {
    const page = await readPacketReviewState(f.currentContext, { ...selector, ...(cursor ? { cursor } : {}) });
    text += page.result.text; cursor = page.result.next_cursor;
  } while (cursor);
  return JSON.parse(text);
}

test("partitioned originals and every criterion survive byte-bounded complete delivery", async t => {
  const f = await fixture(t);
  const text = ("Unicode Ж🙂 evidence with preserved line endings.\n").repeat(180);
  await writeFile(join(f.project, "source.txt"), text);
  const prepared = await f.prepare({ host_limits: { unit_input_bytes: 4096, response_bytes: 8192, overhead_bytes: 1024 } });
  assert.equal(prepared.result.mode, "normal");
  const units = await f.units(prepared);
  assert.equal(units.length, prepared.result.unit_count);
  assert.ok(units.every(unit => unit.original_bytes <= 4096));
  assert.equal(new Set(units.flatMap(unit => unit.criteria.map(row => row.criterion_id))).size, prepared.result.criterion_count);
  let actual = "", partialPages = 0;
  const refs = units.flatMap(unit => unit.sources).filter(source => source.path === "source.txt" && source.side === "target").sort((left, right) => left.start_line - right.start_line);
  for (const ref of refs) {
    let cursor;
    do {
      const page = await f.module.readPacketReviewSource(f.currentContext, ref.source_ref, cursor);
      assert.ok(Buffer.byteLength(JSON.stringify(boundedSuccessResult(page))) <= prepared.result.limits.response_bytes);
      assert.ok(Buffer.byteLength(page.result.text) <= prepared.result.limits.unit_input_bytes);
      actual += page.result.text; cursor = page.result.next_cursor;
      assert.equal(page.result.complete, cursor === null);
      if (cursor) { partialPages++; assert.equal(page.result.read_receipt, null); }
      else assert.equal(typeof page.result.read_receipt, "string");
    } while (cursor);
  }
  assert.equal(actual, text);
  assert.ok(partialPages > 0);
});

test("escaped original bytes respect wire headroom without dropping content", async t => {
  const f = await fixture(t);
  const expected = "\0".repeat(3000);
  await writeFile(join(f.project, "source.txt"), expected);
  const prepared = await f.prepare();
  const source = (await f.units(prepared)).flatMap(unit => unit.sources).find(source => source.side === "target");
  let cursor, actual = "";
  do {
    const page = await f.module.readPacketReviewSource(f.currentContext, source.source_ref, cursor);
    assert.ok(Buffer.byteLength(JSON.stringify(boundedSuccessResult(page))) <= prepared.result.limits.response_bytes);
    actual += page.result.text; cursor = page.result.next_cursor;
  } while (cursor);
  assert.equal(actual, expected);
});

test("missing Git reports a prerequisite and cannot mutate the journal", async t => {
  const f = await fixture(t);
  const before = await f.bytes();
  const prior = process.env.PATH;
  process.env.PATH = join(f.project, "no-executables");
  try { await assert.rejects(f.prepare(), e => e.code === "PREREQUISITE_MISSING"); }
  finally { if (prior === undefined) delete process.env.PATH; else process.env.PATH = prior; }
  assert.equal(await f.bytes(), before);
});

test("stale originals, mismatched run references and indivisible oversized obligations fail closed", async t => {
  const f = await fixture(t);
  const prepared = await f.prepare();
  const source = (await f.units(prepared)).flatMap(unit => unit.sources).find(source => source.side === "target");
  const other = await f.prepare();
  await assert.rejects(f.module.readPacketReviewSource(f.currentContext, source.source_ref, undefined, { run_ref: other.result.run_ref }), e => e.code === "BROKEN_REFERENCE");
  await writeFile(join(f.project, "source.txt"), "Changed after preparation.\n");
  await assert.rejects(f.module.readPacketReviewSource(f.currentContext, source.source_ref), e => e.code === "STALE_SOURCE");
  await f.write("p1", f.sources.p1 + "\n## Acceptance\n- " + "x".repeat(4097));
  await assert.rejects(f.prepare(), e => e.code === "SOURCE_LIMIT");
  await assert.rejects(f.prepare({ host_limits: { response_bytes: 256, overhead_bytes: 256 } }), e => e.code === "PREREQUISITE_MISSING");
});

test("an explicit preparation operation retries one run and conflicts preserve its original effect", async t => {
  const f = await fixture(t);
  const first = await f.prepare({ operation_id: "fixture-prepare-one" });
  const saved = await f.bytes();
  const retry = await f.prepare({ operation_id: "fixture-prepare-one" });
  assert.equal(retry.replayed, true);
  assert.equal(retry.result.run_ref, first.result.run_ref);
  assert.equal(await f.bytes(), saved);
  await writeFile(join(f.project, "source.txt"), "A changed candidate.\n");
  await assert.rejects(f.prepare({ operation_id: "fixture-prepare-one" }), e => e.code === "CONFLICT");
  assert.equal(await f.bytes(), saved);
  const next = await f.prepare({ operation_id: "fixture-prepare-two" });
  assert.notEqual(next.result.run_ref, first.result.run_ref);
});

test("cancelled preparation does not create an acknowledged or unacknowledged run", async t => {
  const f = await fixture(t);
  const before = await f.bytes();
  const controller = new globalThis.AbortController();
  controller.abort();
  await assert.rejects(f.module.preparePacketReviewInputs(f.currentContext, f.request(), controller.signal), e => e.name === "AbortError");
  assert.equal(await f.bytes(), before);
  const later = new globalThis.AbortController();
  const pending = f.module.preparePacketReviewInputs(f.currentContext, f.request(), later.signal);
  later.abort();
  await assert.rejects(pending, e => e.name === "AbortError");
  assert.equal(await f.bytes(), before);
});

test("diagnostic inputs remain diagnostic without authorizing a normal review", async t => {
  const f = await fixture(t);
  const prepared = await f.prepare({ packets: [{ packet_id: "p1", path: f.paths.p1 }] });
  assert.equal(prepared.result.mode, "diagnostic");
  assert.equal(prepared.result.inventory_status, "draft");
  await assert.rejects(f.prepare({ packets: [{ packet_id: "p1", path: f.paths.p1 }], intent: "normal" }), e => e.code === "PREREQUISITE_MISSING");
});

test("only read-only product scenarios supply exact linked evidence without binding transitions", async t => {
  const f = await fixture(t);
  const names = ["product_open", "product_context_prepare", "product_context_next", "product_sources_get_batch"];
  const originals = new Map(names.map(name => [name, productTools.find(tool => tool.name === name).run]));
  const calls = [];
  let completeProduct = true;
  for (const name of names) {
    const scenario = productTools.find(tool => tool.name === name);
    assert.equal(scenario.write, false);
    scenario.run = async input => {
      calls.push({ name, input });
      if (name === "product_open") return { context: "fixture-product-context", result: { state: "bound" } };
      if (name === "product_context_prepare") return { result: { required: [{ product_id: "fixture-product", artifact: "prd", source_kind: "markdown", source_id: "fixture-doc", generation: "a".repeat(64), object_sha256: "b".repeat(64), element_ids: ["RULE-1"], decision_ref: null }], required_total: 1, blockers: [], complete: completeProduct, next_cursor: null } };
      return { result: { items: [{ portion: { text: "Exact relevant product rule.", complete: true, next_cursor: null } }], complete: true, next_cursor: null } };
    };
  }
  try {
    await f.prepare(); assert.equal(calls.length, 0);
    const prepared = await f.prepare({ packets: [{ ...f.packet, product: { task_id: "TASK-0001", packet_id: "P01" } }] });
    assert.equal(prepared.result.mode, "normal");
    assert.ok((await f.units(prepared)).some(unit => unit.sources.some(source => source.side === "product")));
    assert.ok(calls.some(call => call.name === "product_sources_get_batch"));
    assert.ok(calls.every(call => names.includes(call.name)));
    completeProduct = false;
    const incomplete = await f.prepare({ packets: [{ ...f.packet, product: { task_id: "TASK-0001", packet_id: "P01" } }] });
    assert.equal(incomplete.result.mode, "diagnostic");
  } finally { for (const [name, run] of originals) productTools.find(tool => tool.name === name).run = run; }
});

test("actor delivery counts referenced common constraints and rejects underreported input", async t => {
  const f = await fixture(t);
  const prepared = await f.prepare();
  const units = await f.units(prepared);
  const selected = units.find(unit => unit.sources.some(source => source.side === "target"));
  const runId = JSON.parse(Buffer.from(prepared.result.run_ref, "base64url").toString()).run_id;
  const run = await record(f, { entity_type: "run", entity_ref: runId });
  await mutatePacketReviewState(f.currentContext, "fixture-assignment", { operation_id: "assign", entity_type: "run", entity_ref: runId, expected_revision: 1,
    source_version: run.source_version, behavioral_source_version: run.behavioral_source_version, specification_version: run.specification_version, payload: {} }, {
    source: async () => ({ source_version: run.source_version, behavioral_source_version: run.behavioral_source_version, specification_version: run.specification_version }),
    apply: current => ({ entity: { ...current, assignments: [{ assignment_id: "actor-one", actor_ref: "actor-one", phase: "fact_collection", axis: "requirements",
      unit_ids: [selected.unit_id], source_version: run.source_version, status: "running", input_bytes: selected.original_bytes, result_bytes: 0, assessment_scope: "unit" }] }, result: {} }),
  });
  await assert.rejects(f.module.readPacketReviewSource(f.currentContext, selected.sources[0].source_ref, undefined, { assignment_ref: "actor-one" }), e => e.code === "ACTOR_INPUT_LIMIT");
});
