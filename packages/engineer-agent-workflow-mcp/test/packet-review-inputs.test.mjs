import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, readFile, symlink, chmod, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import test, { before, after } from "node:test";
import { createSharedStdioHarness } from "../test-support/stdio-harness.mjs";
import { planningFixture } from "../test-support/planning-fixture.mjs";

const execute = promisify(execFile);
const server = createSharedStdioHarness({ entrypoint: fileURLToPath(new URL("../dist/main.js", import.meta.url)), name: "packet-inputs" });
before(() => server.start());
after(() => server.close());

async function fixture(t) {
  const f = await planningFixture(t, server);
  const q = await f.prepare();
  const accepted = await f.record(q.question_ref, ["p1"]);
  const agreement = accepted.agreements[0];
  const git = (...args) => execute("git", ["-C", f.project, ...args], { env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" } });
  await git("init", "--quiet");
  await git("config", "user.name", "Fixture");
  await git("config", "user.email", "fixture@example.invalid");
  await writeFile(join(f.project, "code.txt"), "Original code.\n");
  await writeFile(join(f.project, "tests.txt"), "Original tests.\n");
  await git("add", "code.txt", "tests.txt");
  await git("commit", "--quiet", "-m", "Fixture baseline");
  const packet = { packet_id: "p1", path: f.paths.p1, agreement_ref: agreement.agreement_ref, proposal_digest: agreement.proposal_digest };
  const request = extra => ({ context: f.context, selection: { mode: "working_tree", baseline_ref: "HEAD", paths: ["code.txt"], packets: [packet], ...extra } });
  async function call(name, input) {
    const r = await server.callTool({ name, arguments: input });
    assert.notEqual(r.isError, true, JSON.stringify(r.structuredContent));
    assert.ok(Buffer.byteLength(JSON.stringify(r)) <= 65536);
    return r.structuredContent;
  }
  async function sources(prepared) {
    let cursor;
    const items = [];
    do {
      const response = await call("task_packet_review_units", { context: f.context, run_ref: prepared.result.run_ref, ...(cursor ? { cursor } : {}) });
      items.push(...response.result.items);
      cursor = response.result.next_cursor;
    } while (cursor);
    return items.flatMap(unit => unit.sources);
  }
  async function original(prepared, path, side = "target") {
    const refs = (await sources(prepared)).filter(source => source.path === path && source.side === side).sort((left, right) => left.start_line - right.start_line);
    assert.ok(refs.length, `Source ${path} (${side}) must be inventoried.`);
    let text = "";
    for (const ref of refs) {
      let cursor;
      do {
        const response = await call("task_packet_review_source_get", { context: f.context, run_ref: prepared.result.run_ref, source_ref: ref.source_ref, ...(cursor ? { cursor } : {}) });
        text += response.result.text;
        cursor = response.result.next_cursor;
        if (!cursor) assert.ok(response.result.read_receipt);
      } while (cursor);
    }
    return text;
  }
  return { ...f, git, packet, request, call, sources, original };
}

test("packet review preparation is an advertised explicit scenario", async () => {
  const response = await server.callTool({ name: "workflow_runtime_info", arguments: {} });
  assert.ok(response.structuredContent.result.capabilities.includes("task_packet_review_prepare"));
});

test("staged evidence never borrows a working-tree fix and historical tests stay historical", async t => {
  const f = await fixture(t);
  await writeFile(join(f.project, "code.txt"), "Staged defect.\n");
  await f.git("add", "code.txt");
  await writeFile(join(f.project, "code.txt"), "Disk fix.\n");
  const staged = await f.call("task_packet_review_prepare", f.request({ mode: "staged" }));
  assert.equal(await f.original(staged, "code.txt"), "Staged defect.\n");
  const working = await f.call("task_packet_review_prepare", f.request({}));
  assert.equal(await f.original(working, "code.txt"), "Disk fix.\n");
  assert.equal(working.result.selection.index_differs, true);
  await writeFile(join(f.project, "tests.txt"), "Today's different tests.\n");
  const historical = await f.call("task_packet_review_prepare", f.request({ mode: "committed", target_ref: "HEAD", paths: ["tests.txt"] }));
  assert.equal(await f.original(historical, "tests.txt"), "Original tests.\n");
});

test("selected untracked files, deletions, rename evidence, modes and symlinks are retained", async t => {
  const f = await fixture(t);
  await writeFile(join(f.project, "added.txt"), "Untracked implementation.\n");
  await f.git("mv", "code.txt", "renamed.txt");
  await f.git("rm", "tests.txt");
  await chmod(join(f.project, "renamed.txt"), 0o755);
  await writeFile(join(f.project, "unrelated.txt"), "Untouched unrelated data.\n");
  await symlink("../outside-private-file", join(f.project, "link"));
  const prepared = await f.call("task_packet_review_prepare", f.request({ paths: ["code.txt", "renamed.txt", "tests.txt", "added.txt", "link"] }));
  assert.equal(await f.original(prepared, "added.txt"), "Untracked implementation.\n");
  assert.equal(await f.original(prepared, "tests.txt", "baseline"), "Original tests.\n");
  assert.equal(await f.original(prepared, "link"), "../outside-private-file");
  const sources = await f.sources(prepared);
  assert.ok(sources.some(source => source.path === "renamed.txt" && source.file_mode === "100755"));
  assert.ok(sources.some(source => source.path === "renamed.txt" && source.change.status.startsWith("R") && source.change.old_path === "code.txt"));
  assert.equal(sources.some(source => source.path === "unrelated.txt"), false);
  assert.equal(await readFile(join(f.project, "unrelated.txt"), "utf8"), "Untouched unrelated data.\n");
});

test("an explicitly empty baseline works without a first commit", async t => {
  const f = await fixture(t);
  await rm(join(f.project, ".git"), { recursive: true, force: true });
  await f.git("init", "--quiet");
  await assert.rejects(f.git("rev-parse", "--verify", "HEAD"));
  const prepared = await f.call("task_packet_review_prepare", f.request({ mode: "empty_baseline", baseline_ref: "EMPTY" }));
  assert.equal(await f.original(prepared, "code.txt"), "Original code.\n");
  assert.equal(prepared.result.selection.baseline_oid, undefined);
});

test("invalid selectors and out-of-project or ambiguous packet attribution never create a run", async t => {
  const f = await fixture(t);
  for (const extra of [{ baseline_ref: "--help" }, { target_ref: "HEAD~1" }, { packets: [{ ...f.packet, paths: ["tests.txt"] }] }, { paths: ["../private"] }, { paths: [".git/config"] },
    { packets: [f.packet, { ...f.packet, packet_id: "p2", path: f.paths.p2 }] }]) {
    const r = await server.callTool({ name: "task_packet_review_prepare", arguments: f.request(extra) });
    assert.equal(r.isError, true);
  }
});

test("selected groups preserve packet boundaries and shared requirement identities", async t => {
  const f = await fixture(t);
  const question = await f.prepare();
  const answer = await f.record(question.question_ref, ["p1", "p2"]);
  const packets = ["p1", "p2"].map((id, index) => {
    const agreement = answer.agreements.find(row => row.packet_id === id);
    return { packet_id: id, path: f.paths[id], agreement_ref: agreement.agreement_ref, proposal_digest: agreement.proposal_digest, paths: [index ? "tests.txt" : "code.txt"] };
  });
  const prepared = await f.call("task_packet_review_prepare", f.request({ paths: ["code.txt", "tests.txt"], packets }));
  const sources = await f.sources(prepared);
  assert.ok(sources.some(source => source.path === "code.txt"));
  assert.ok(sources.some(source => source.path === "tests.txt"));
  const module = await import("../dist/packet-review-inputs.js");
  const units = [];
  let cursor;
  do { const page = await module.listPacketReviewUnits(f.context, prepared.result.run_ref, cursor); units.push(...page.result.items); cursor = page.result.next_cursor; } while (cursor);
  assert.ok(units.some(unit => unit.packet_ids.includes("p1") && unit.packet_ids.includes("p2") && unit.sources.some(source => source.side.startsWith("requirement:"))));
  assert.ok(units.filter(unit => unit.sources.some(source => source.path === "code.txt")).every(unit => unit.packet_ids.length === 1 && unit.packet_ids[0] === "p1"));
});

test("arbitrary criterion IDs and unlabelled obligations remain draft slots with missing implementation", async t => {
  const f = await fixture(t);
  await f.write("p1", f.sources.p1 + "\n## Acceptance\n\n| Criterion | Behavior |\n| --- | --- |\n| custom-gate-z | Reject invalid data. |\n\n- Preserve an unlabelled independent obligation.\n- Preserve an unlabelled independent obligation.\n");
  const prepared = await f.call("task_packet_review_prepare", f.request({}));
  assert.equal(prepared.result.inventory_status, "draft");
  const criteria = [];
  let cursor;
  do {
    const page = await f.call("task_packet_review_units", { context: f.context, run_ref: prepared.result.run_ref, ...(cursor ? { cursor } : {}) });
    criteria.push(...page.result.items.flatMap(unit => unit.criteria));
    assert.ok(page.result.items.filter(unit => unit.sources.some(source => source.side === "criterion")).every(unit => unit.criterion_ids.length === 1));
    cursor = page.result.next_cursor;
  } while (cursor);
  assert.ok(criteria.some(row => row.criterion_id === "custom-gate-z"));
  assert.ok(criteria.some(row => row.explanation.includes("unlabelled")));
  assert.ok(criteria.every(row => row.implementation === "unverifiable" && row.test_sufficiency === "unverifiable"));
});

test("packet readiness uses the exact accepted question when proposal IDs are reused", async t => {
  const f = await fixture(t);
  const path = `${f.directory}/tasks/alternate.md`;
  await writeFile(join(f.project, path), "# Alternate packet\n\n## Technical proposal\nUse the accepted alternate source.\n\n## Acceptance\n- Retain the exact new obligation.\n");
  const question = await f.prepare({ proposals: [{ id: "p1", packet_id: "p1", requirement_ids: ["PLAN-001"], sources: [{ path, heading: "Technical proposal" }] }] });
  const answer = await f.record(question.question_ref, ["p1"]);
  const agreement = answer.agreements[0];
  const prepared = await f.call("task_packet_review_prepare", f.request({ packets: [{ packet_id: "p1", path, agreement_ref: agreement.agreement_ref, proposal_digest: agreement.proposal_digest }] }));
  assert.equal(prepared.result.mode, "normal");
});
