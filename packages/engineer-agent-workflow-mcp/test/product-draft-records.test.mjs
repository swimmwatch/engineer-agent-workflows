import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import test from "node:test";
import Ajv from "ajv";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { saveGeneration, saveObject } from "../dist/product/storage.js";

const digest = (value) => createHash("sha256").update(value).digest("hex");
const canonicalBytes = (value) => Buffer.from(`${JSON.stringify(value)}\n`);

async function temporaryDirectory(t, prefix) {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

async function snapshot(root, relative = "") {
  const entries = await readdir(join(root, relative), { withFileTypes: true }).catch((error) => {
    if (error?.code === "ENOENT") return [];
    throw error;
  });
  const rootStat = await lstat(join(root, relative));
  const result = [[relative, "directory", rootStat.mode, rootStat.ino, rootStat.mtimeMs, rootStat.ctimeMs]];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...await snapshot(root, child));
    else {
      const info = await lstat(join(root, child));
      result.push([child, "file", digest(await readFile(join(root, child))), info.mode, info.ino, info.mtimeMs, info.ctimeMs]);
    }
  }
  return result;
}

function candidateVersion(candidate) {
  return digest(canonicalBytes(Object.fromEntries(
    Object.entries(candidate).filter(([key]) => key !== "source_version"),
  )));
}

async function fixture(t) {
  const directory = await temporaryDirectory(t, "eaw-draft-records-");
  const root = join(directory, "product-data");
  const workspace = join(directory, "workspace");
  await mkdir(workspace);
  const productId = randomUUID();
  const workspaceId = randomUUID();
  const candidateId = randomUUID();
  const registryId = randomUUID();
  const document = Buffer.from("# Idea\n\nKnown problem.\n");
  const markdown = await saveObject(root, { productId, kind: "markdown", bytes: document });
  const registry = await saveObject(root, { productId, kind: "record", bytes: canonicalBytes({
    schema_version: 1, kind: "registry", product_id: productId,
    documents: [{ id: randomUUID(), artifact: "idea", role: "semantic", subject: "Initial idea",
      relative_path: "idea/overview.md", object_sha256: markdown.sha256 }], element_metadata: [],
  }) });
  const generation = await saveGeneration(root, {
    schema_version: 1, kind: "generation", product_id: productId, parent: null,
    registry: { id: registryId, object_sha256: registry.sha256 },
    ready_artifacts: [], decision_heads: [], relations: [],
  });
  await writeFile(join(root, "products", productId, "head.yaml"), canonicalBytes({
    schema_version: 1, kind: "head", product_id: productId,
    generation: generation.sha256, operation_id: randomUUID(),
  }));
  const candidate = {
    schema_version: 1, kind: "candidate", product_id: productId, candidate_id: candidateId,
    artifact: "idea", base_generation: generation.sha256, workspace_id: workspaceId, state: "draft",
    scope: { depth: "lite", profiles: [], rationale: [], confirmed_answer: null },
    registry: { id: registryId, object_sha256: registry.sha256 },
    upstream_pins: [], decision_heads: [], relations: [],
  };
  const complete = { ...candidate, source_version: candidateVersion(candidate) };
  const draft = join(root, "products", productId, "drafts", candidateId);
  await mkdir(join(draft, "documents", "idea"), { recursive: true });
  await writeFile(join(draft, "documents", "idea", "overview.md"), document);
  await writeFile(join(draft, "candidate.yaml"), canonicalBytes(complete));
  const candidateRef = { product_id: productId, candidate_id: candidateId };
  const context = Buffer.from(JSON.stringify({
    contract: "product-1", store_id: randomUUID(), product_id: productId,
    workspace_id: workspaceId, candidate_ref: candidateRef,
    selected_sources_sha256: complete.source_version, target_revision: generation.sha256,
    canonical_workspace: workspace,
  })).toString("base64url");
  return { root, workspace, productId, workspaceId, candidateId, candidateRef, context,
    candidatePath: (id = candidateId) => join(root, "products", productId, "drafts", id, "candidate.yaml"),
    decisionPath: (ref) => join(root, "products", productId, "decisions", ref.artifact, ref.id, `${ref.revision}.yaml`),
  };
}

async function readCandidate(f, id = f.candidateId) {
  return JSON.parse(await readFile(f.candidatePath(id), "utf8"));
}

async function readDecision(f, ref) {
  return JSON.parse(await readFile(f.decisionPath(ref), "utf8"));
}

async function connect(t, f) {
  const client = new Client({ name: "draft-record-test", version: "1" });
  await client.connect(new StdioClientTransport({ command: process.execPath,
    args: [fileURLToPath(new URL("../dist/main.js", import.meta.url))],
    env: { ...process.env, EAW_PRODUCT_DATA_DIR: f.root }, stderr: "pipe" }));
  t.after(() => client.close());
  return client;
}

async function call(client, name, arguments_) {
  const response = await client.callTool({ name, arguments: arguments_ });
  assert.notEqual(response.isError, true, JSON.stringify(response));
  return response.structuredContent;
}

function selected(f, saved, kind = "decision") {
  const ref = saved.result.decision_ref ?? saved.result.question_ref;
  return { context: saved.context, candidate_ref: f.candidateRef,
    record_ref: { kind, id: ref.id, revision: ref.revision } };
}

async function reconstruct(client, input, expected) {
  let cursor;
  let offset = 0;
  let text = "";
  let pages = 0;
  do {
    const response = await client.callTool({ name: "product_candidate_record_get",
      arguments: { ...input, ...(cursor ? { cursor } : {}) } });
    assert.notEqual(response.isError, true, JSON.stringify(response));
    const envelope = response.structuredContent;
    const page = envelope.result;
    assert.equal(envelope.context, input.context);
    assert.equal(envelope.operation_ref, null);
    assert.equal(envelope.replayed, false);
    assert.deepEqual(page.candidate_ref, input.candidate_ref);
    assert.deepEqual(page.record_ref, input.record_ref);
    assert.equal(page.encoding, "canonical-json-utf8");
    assert.equal(page.source_object_sha256, digest(expected));
    assert.equal(page.offset, offset);
    assert.equal(page.total_characters, Array.from(expected.toString()).length);
    assert.ok(Array.from(page.text).length > 0 && Array.from(page.text).length <= 4096);
    assert.equal(page.complete, page.next_cursor === null);
    assert.ok(Buffer.byteLength(JSON.stringify(envelope)) <= 24 * 1024);
    assert.ok(Buffer.byteLength(JSON.stringify(response)) <= 64 * 1024);
    text += page.text;
    offset += Array.from(page.text).length;
    cursor = page.next_cursor;
    if (cursor) assert.ok(offset < page.total_characters);
    else assert.equal(offset, page.total_characters, "Every final portion must be delivered.");
    assert.ok(++pages < 100);
  } while (cursor);
  assert.deepEqual(Buffer.from(text), expected, "The complete canonical record must be delivered.");
  return pages;
}

async function instruction(client, f, context, text) {
  return call(client, "product_record_instruction", { context, candidate_ref: f.candidateRef,
    text, source: "synthetic user answer", related_refs: [], affected_refs: [] });
}

test("Q04 draft reader reconstructs exact small and Unicode decision/research records without writes", async (t) => {
  const f = await fixture(t);
  const client = await connect(t, f);
  const tools = new Map((await client.listTools()).tools.map((tool) => [tool.name, tool]));
  const small = await instruction(client, f, f.context, "Retain this explicit decision.");
  const large = await instruction(client, f, small.context, "雪😀é\n".repeat(900));
  const question = await call(client, "product_question_prepare", { context: large.context,
    candidate_ref: f.candidateRef, category: "research", text: "Which nested evidence applies?", options: [] });
  const evidence = { question_ref: question.result.question_ref,
    conclusion: "雪😀".repeat(700), sources: [{ url: "https://example.invalid/evidence",
      checked_date: "2026-10-11", version_applicability: "Synthetic v1",
      finding: "Nested Unicode finding 🧪".repeat(85) }],
    uncertainty: ["Future versions remain unverified."], limitations: ["Synthetic isolated store."] };
  const research = await call(client, "product_record_research", { context: question.context,
    candidate_ref: f.candidateRef, evidence });
  const before = await snapshot(f.root);
  assert.ok(tools.has("product_candidate_record_get"), "The exact draft reader must be discoverable.");
  const capabilities = await call(client, "product_capabilities", {});
  assert.ok(capabilities.result.tools.includes("product_candidate_record_get"));
  const ajv = new Ajv({ allErrors: true });
  for (const [saved, kind] of [[small, "decision"], [large, "decision"], [research, "research"]]) {
    const input = { ...selected(f, saved, kind), context: research.context };
    assert.equal(ajv.validate(tools.get("product_candidate_record_get").inputSchema, input), true);
    const expected = canonicalBytes(await readDecision(f, saved.result.decision_ref));
    const pages = await reconstruct(client, input, expected);
    assert.equal(pages > 1, saved !== small);
    await reconstruct(client, input, expected);
    const response = await client.callTool({ name: "product_candidate_record_get", arguments: input });
    assert.equal(ajv.validate(tools.get("product_candidate_record_get").outputSchema,
      response.structuredContent), true, JSON.stringify(ajv.errors));
    const wrongKind = await client.callTool({ name: "product_candidate_record_get", arguments: {
      ...input, record_ref: { ...input.record_ref, kind: kind === "decision" ? "research" : "decision" },
    } });
    assert.equal(wrongKind.isError, true);
    assert.equal(wrongKind.structuredContent.error.code, "NOT_FOUND");
  }
  const decisionPage = await call(client, "product_candidate_record_get", { ...selected(f, large), context: research.context });
  const crossed = await client.callTool({ name: "product_candidate_record_get", arguments: {
    ...selected(f, research, "research"), cursor: decisionPage.result.next_cursor,
  } });
  assert.equal(crossed.isError, true);
  assert.equal(crossed.structuredContent.error.code, "STALE_CURSOR");
  assert.deepEqual(JSON.parse((await readDecision(f, research.result.decision_ref)).text), evidence);
  assert.equal((await readCandidate(f)).state, "draft");
  assert.deepEqual(await snapshot(f.root), before, "Draft readers must cause no durable writes.");
});

test("Q04 retained historical revisions are delivered exactly while foreign selectors and cursors fail", async (t) => {
  const f = await fixture(t);
  const client = await connect(t, f);
  const question = await call(client, "product_question_prepare", { context: f.context,
    candidate_ref: f.candidateRef, category: "choice", text: "Choose the retained answer.", options: [] });
  const answer = await call(client, "product_question_answer", { context: question.context,
    candidate_ref: f.candidateRef, question_ref: question.result.question_ref,
    text: "雪😀".repeat(2300), source: "synthetic native answer", selected_ids: [] });
  const input = selected(f, answer);
  const before = await snapshot(f.root);
  await reconstruct(client, { ...selected(f, question), context: answer.context },
    canonicalBytes(await readDecision(f, question.result.question_ref)));
  const first = await call(client, "product_candidate_record_get", input);
  assert.ok(first.result.next_cursor);
  for (const args of [
    { ...input, candidate_ref: { ...f.candidateRef, candidate_id: randomUUID() } },
    { ...input, record_ref: { ...input.record_ref, kind: "research" } },
    { ...input, record_ref: { ...input.record_ref, id: randomUUID() } },
    { ...input, record_ref: { ...input.record_ref, revision: 99 } },
    { ...input, record_ref: { ...input.record_ref, revision: 0 } },
    { ...input, record_ref: { ...input.record_ref, id: "../foreign" } },
    { ...input, cursor: "malformed" },
    { ...input, record_ref: { ...input.record_ref, revision: 1 }, cursor: first.result.next_cursor },
  ]) {
    const response = await client.callTool({ name: "product_candidate_record_get", arguments: args });
    assert.equal(response.isError, true);
    assert.ok(["INVALID_INPUT", "NOT_FOUND", "STALE_CURSOR"].includes(response.structuredContent.error.code));
  }
  assert.deepEqual(await snapshot(f.root), before);
  const foreign = { ...await readDecision(f, answer.result.decision_ref),
    ref: { ...answer.result.decision_ref, id: randomUUID() }, candidate_id: randomUUID() };
  await saveObject(f.root, { productId: f.productId, kind: "decision", artifact: "idea",
    decisionId: foreign.ref.id, revision: foreign.ref.revision, bytes: canonicalBytes(foreign) });
  const afterForeign = await snapshot(f.root);
  const rejected = await client.callTool({ name: "product_candidate_record_get", arguments: {
    ...input, record_ref: { ...input.record_ref, id: foreign.ref.id } } });
  assert.equal(rejected.isError, true);
  assert.equal(rejected.structuredContent.error.code, "NOT_FOUND");
  assert.deepEqual(await snapshot(f.root), afterForeign);
  const changed = await instruction(client, f, answer.context, "The candidate snapshot changed.");
  const afterChanged = await snapshot(f.root);
  const stale = await client.callTool({ name: "product_candidate_record_get", arguments: {
    ...input, cursor: first.result.next_cursor } });
  assert.equal(stale.isError, true);
  assert.equal(stale.structuredContent.error.code, "CONFLICT");
  const crossed = await client.callTool({ name: "product_candidate_record_get", arguments: {
    ...input, context: changed.context, cursor: first.result.next_cursor } });
  assert.equal(crossed.isError, true);
  assert.equal(crossed.structuredContent.error.code, "STALE_CURSOR");
  assert.deepEqual(await snapshot(f.root), afterChanged);
});

test("Q04 missing or corrupt exact evidence fails without partial success or writes", async (t) => {
  const f = await fixture(t);
  const client = await connect(t, f);
  const saved = await instruction(client, f, f.context, "Exact evidence.");
  const path = f.decisionPath(saved.result.decision_ref);
  const original = await readFile(path);
  for (const corruption of [null, Buffer.from([0xff]), canonicalBytes({
    ...JSON.parse(original), text: "Different valid record bytes." })]) {
    if (corruption === null) await unlink(path);
    else await writeFile(path, corruption);
    const before = await snapshot(f.root);
    const response = await client.callTool({ name: "product_candidate_record_get", arguments: selected(f, saved) });
    assert.equal(response.isError, true);
    assert.ok(["MISSING_EVIDENCE", "SOURCE_CHANGED", "INVALID_STATE"].includes(response.structuredContent.error.code));
    assert.deepEqual(await snapshot(f.root), before);
    await writeFile(path, original);
  }
});

test("Q04 draft portions trim to the real envelope budget and bind the exact historical bytes", async (t) => {
  const f = await fixture(t);
  const client = await connect(t, f);
  const saved = await instruction(client, f, f.context, "😀".repeat(4090));
  const decoded = Buffer.from(saved.context, "base64url");
  const paddedContext = Buffer.concat([decoded, Buffer.from(" ".repeat(6144 - decoded.length))]).toString("base64url");
  assert.equal(paddedContext.length, 8192);
  const input = { ...selected(f, saved), context: paddedContext };
  const before = await snapshot(f.root);
  const first = await call(client, "product_candidate_record_get", input);
  assert.ok(Array.from(first.result.text).length < 4096, "Oversized envelopes must reduce the text portion.");
  await reconstruct(client, input, canonicalBytes(await readDecision(f, saved.result.decision_ref)));
  assert.deepEqual(await snapshot(f.root), before);

  const question = await call(client, "product_question_prepare", { context: saved.context,
    candidate_ref: f.candidateRef, category: "history", text: "雪😀".repeat(2100), options: [] });
  const answer = await call(client, "product_question_answer", { context: question.context,
    candidate_ref: f.candidateRef, question_ref: question.result.question_ref,
    text: "Retain the predecessor.", source: "synthetic native answer", selected_ids: [] });
  const historical = { ...selected(f, question), context: answer.context };
  const portion = await call(client, "product_candidate_record_get", historical);
  assert.ok(portion.result.next_cursor);
  const path = f.decisionPath(question.result.question_ref);
  const original = await readFile(path);
  await writeFile(path, canonicalBytes({ ...JSON.parse(original), text: "An altered valid historical body." }));
  const afterChange = await snapshot(f.root);
  const response = await client.callTool({ name: "product_candidate_record_get", arguments: {
    ...historical, cursor: portion.result.next_cursor } });
  assert.equal(response.isError, true);
  assert.equal(response.structuredContent.error.code, "STALE_CURSOR");
  assert.deepEqual(await snapshot(f.root), afterChange);
  await writeFile(path, original);
});

test("Q04 a candidate changed without updating its claimed version fails without writes", async (t) => {
  const f = await fixture(t);
  const client = await connect(t, f);
  const saved = await instruction(client, f, f.context, "Retained evidence.");
  const candidate = await readCandidate(f);
  await writeFile(f.candidatePath(), canonicalBytes({ ...candidate, state: "abandoned" }));
  const before = await snapshot(f.root);
  const response = await client.callTool({ name: "product_candidate_record_get", arguments: selected(f, saved) });
  assert.equal(response.isError, true);
  assert.equal(response.structuredContent.error.code, "SOURCE_CHANGED");
  assert.deepEqual(await snapshot(f.root), before);
});

test("Q04 equivalent selector key orders preserve exact continuation identity", async (t) => {
  const f = await fixture(t);
  const client = await connect(t, f);
  const saved = await instruction(client, f, f.context, "雪😀".repeat(2300));
  const input = selected(f, saved);
  const first = await call(client, "product_candidate_record_get", input);
  assert.ok(first.result.next_cursor);
  const arguments_ = { ...input, cursor: first.result.next_cursor };
  const before = await snapshot(f.root);
  const expected = await call(client, "product_candidate_record_get", arguments_);
  const candidateRef = { candidate_id: input.candidate_ref.candidate_id, product_id: input.candidate_ref.product_id };
  const recordRef = { revision: input.record_ref.revision, id: input.record_ref.id, kind: input.record_ref.kind };
  for (const [name, reordered] of [
    ["candidate fields", { ...arguments_, candidate_ref: candidateRef }],
    ["record fields", { ...arguments_, record_ref: recordRef }],
    ["both selectors", { ...arguments_, candidate_ref: candidateRef, record_ref: recordRef }],
  ]) {
    await t.test(name, async () => {
      const actual = await call(client, "product_candidate_record_get", reordered);
      assert.deepEqual(actual, expected, "Equivalent selectors must deliver the same exact continuation.");
      assert.equal(actual.result.offset, Array.from(first.result.text).length);
    });
  }
  assert.deepEqual(await snapshot(f.root), before);
});
