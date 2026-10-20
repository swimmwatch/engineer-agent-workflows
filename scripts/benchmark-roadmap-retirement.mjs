import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { fixture, bytes, candidateVersion, context, writeCandidate, replaceArtifactDocument } from "../packages/engineer-agent-workflow-mcp/test-support/product-review-fixture.mjs";
import { workflowTools } from "../packages/engineer-agent-workflow-mcp/dist/server.js";
import { saveObject } from "../packages/engineer-agent-workflow-mcp/dist/product/storage.js";
import { randomUUID } from "node:crypto";
import { channel } from "node:diagnostics_channel";

// Synthetic judgments measure protocol cost, not product semantics or model comprehension.
export async function benchmarkRetirement({ mode = "full", transport = "stdio", elements = 30, representative = false, progress = false, findings = false, profile = false } = {}) {
  const sourceMetrics = { reads: 0, bytes: 0, duration_ms: 0 };
  const metrics = channel("engineer-agent-workflows.product.source-validation");
  const collect = (event) => { sourceMetrics.reads++; sourceMetrics.bytes += event.bytes; sourceMetrics.duration_ms += event.duration_ms; };
  if (transport === "direct") metrics.subscribe(collect);
  const cleanup = [], calls = [], f = await fixture({ after: (fn) => cleanup.push(fn) }, "roadmap", {
    elements, ...(representative ? { upstreamElements: { prd: 120, "technical-design": 60 } } : {}),
  });
  const ref = (id) => ({ product_id: f.productId, artifact: "roadmap", element_id: id });
  if (representative) {
    const heads = [];
    for (let index = 0; index < 594; index++) {
      const decisionRef = { product_id: f.productId, artifact: "roadmap", id: randomUUID(), revision: 1 };
      const value = { schema_version: 1, kind: "decision", ref: decisionRef, state: "observed", category: "shared-constraint",
        question: null, text: `Shared security/data-integrity constraint ${index + 1}: preserve ownership, identifiers and source evidence.`,
        source: "Synthetic representative requirement", selected_ids: [], predecessors: [],
        affected_refs: [ref(`TASK-${String(index % elements + 1).padStart(4, "0")}`), { ...f.refs.prd, element_id: `PRD-${String(index % 120 + 1).padStart(4, "0")}` }],
        reconsider_when: null, candidate_id: f.candidateId };
      const saved = await saveObject(f.root, { productId: f.productId, kind: "decision", sha256: undefined,
        artifact: "roadmap", decisionId: decisionRef.id, revision: 1, bytes: bytes(value) });
      heads.push({ decision_ref: decisionRef, object_sha256: saved.sha256 });
    }
    f.candidate = { ...f.candidate, decision_heads: heads };
  }
  f.candidate = { ...f.candidate, relations: [2, 5].flatMap((id) => [1, 29].map((dependency) => ({
    from: ref(`TASK-${String(id).padStart(4, "0")}`), kind: "depends_on", to: ref(`TASK-${String(dependency).padStart(4, "0")}`),
  }))) };
  f.candidate.source_version = candidateVersion(f.candidate); await writeCandidate(f, f.candidate); f.context = context(f, f.candidate);
  if (findings) await replaceArtifactDocument(f, "roadmap", f.documentBytes.get("roadmap").toString()
    .replace("Introductory prose for roadmap.", `There are ${elements} active tasks in the current Roadmap.`));
  let client;
  const serverProfile = { responses: 0, reads: 0, bytes: 0, source_ms: 0, envelope_ms: 0, wire_ms: 0, wire_bytes: 0 };
  async function connectClient(name) {
    const wire = new StdioClientTransport({ command: process.execPath, args: [
      ...(profile ? ["--import", fileURLToPath(new URL("../packages/engineer-agent-workflow-mcp/test-support/product-profile-loader.mjs", import.meta.url))] : []),
      fileURLToPath(new URL("../packages/engineer-agent-workflow-mcp/dist/main.js", import.meta.url)),
    ], env: { ...process.env, EAW_PRODUCT_DATA_DIR: f.root }, stderr: "pipe" });
    let pending = "";
    wire.stderr?.on("data", (value) => {
      pending += value.toString(); const lines = pending.split("\n"); pending = lines.pop();
      for (const line of lines) if (line.startsWith("EAW_BENCHMARK ")) {
        const event = JSON.parse(line.slice("EAW_BENCHMARK ".length)); serverProfile.responses++;
        for (const key of Object.keys(event)) serverProfile[key] += event[key];
      }
    });
    const connected = new Client({ name, version: "1" }); await connected.connect(wire); return connected;
  }
  const oldRoot = process.env.EAW_PRODUCT_DATA_DIR;
  if (transport === "stdio") {
    client = await connectClient("retirement-benchmark");
  } else process.env.EAW_PRODUCT_DATA_DIR = f.root;
  let current = f.context;
  async function call(name, input) {
    const start = performance.now();
    const raw = client ? await client.callTool({ name, arguments: input }) : await workflowTools.find((tool) => tool.name === name).run(input);
    if (profile && client) await new Promise((resolve) => setImmediate(resolve));
    const result = client ? raw.structuredContent ?? JSON.parse(raw.content.find((entry) => entry.type === "text").text) : raw;
    const elapsed = performance.now() - start, encodingStarted = performance.now();
    const responseBytes = Buffer.byteLength(JSON.stringify(raw)), resultBytes = Buffer.byteLength(JSON.stringify(result));
    calls.push({ name, elapsed_ms: elapsed, measurement_serialization_ms: performance.now() - encodingStarted, response_bytes: responseBytes, result_bytes: resultBytes });
    assert.ok(resultBytes <= 24 * 1024, "Structured result stays within its published budget.");
    if (client) assert.ok(responseBytes <= 64 * 1024, "Full MCP response stays within its published wire budget.");
    if (progress) console.error(JSON.stringify({ name, elapsed_ms: calls.at(-1).elapsed_ms }));
    assert.equal(result.error, undefined, JSON.stringify(result.error)); if (result.context) current = result.context; return result;
  }
  async function finish(candidate, mode, parent, parentCandidate, fixes) {
    const start = await call("product_review_start", { context: current, candidate_ref: candidate, mode,
      ...(parent ? { parent_review_ref: parent, ...(parentCandidate ? { parent_candidate_ref: parentCandidate } : {}) } : {}),
      ...(fixes ? { fixes } : {}) });
    let status = start.result, portions = 0, delivered = 0;
    const atoms = new Set(); let atomOccurrences = 0;
    let proseKey;
    while (status.next_item_index !== null) {
      const page = await call("product_review_get_batch", { context: current, review_ref: status.review_ref, start_index: status.next_item_index, limit: 20,
        ...(mode !== "full" ? { pending_only: true } : {}) });
      const verdicts = [];
      for (const item of page.result.items) {
        let portion = item.portion; portions++; let text = portion.text;
        while (!portion.complete) {
          portion = (await call("product_review_get", { context: current, review_ref: status.review_ref, item_index: item.item_index, cursor: portion.next_cursor })).result; portions++; text += portion.text;
        }
        for (const match of text.matchAll(/^## (?:Primary|Related context): (.+)$/gmu)) { atoms.add(match[1]); atomOccurrences++; }
        const gap = findings && candidate.candidate_id !== f.candidateId && mode !== "followup" && portion.item_key.startsWith("document:");
        if (gap) proseKey = portion.item_key;
        verdicts.push({ item_key: portion.item_key, verdict: gap ? "gap" : "covered", explanation: "Synthetic current-source protocol measurement.",
          counterexample: gap ? "Summary still states 30 active tasks after task retirement." : null, evidence_refs: [], evidence_sources: [], read_receipt: portion.read_receipt, inherited_from: null }); delivered++;
      }
      await call("product_review_record_batch", { context: current, review_ref: status.review_ref, items: verdicts });
      status = (await call("product_review_status", { context: current, review_ref: status.review_ref })).result;
    }
    const representation = mode !== "full" ? { representation: "compact-v1" } : {};
    let portion = (await call("product_review_consistency_get", { context: current, review_ref: status.review_ref, ...representation })).result;
    let consistencyPortions = 1;
    while (!portion.complete) {
      portion = (await call("product_review_consistency_get", { context: current, review_ref: status.review_ref, cursor: portion.next_cursor, ...representation })).result; consistencyPortions++;
    }
    await call("product_review_consistency_record", { context: current, review_ref: status.review_ref, read_receipt: portion.read_receipt,
      verdict: proseKey ? "gap" : "covered", explanation: "Synthetic whole-artifact protocol measurement.", counterexample: proseKey ? "The task count in the summary is stale." : null });
    await call("product_review_complete", { context: current, review_ref: status.review_ref });
    return { review: status.review_ref, blocks: status.total_items, atoms: status.source_atoms, source_atoms_delivered: atoms.size, source_atom_occurrences: atomOccurrences,
      delivered, portions, consistencyPortions, proseKey: proseKey ?? null, inherited: start.result.recheck?.inherited_items ?? start.result.recorded_items };
  }
  try {
    const initial = await finish(f.candidateRef, "full");
    await call("product_amendment_activate", { context: current, candidates: [f.candidateRef], review_refs: [initial.review] });
    calls.length = 0; sourceMetrics.reads = 0; sourceMetrics.bytes = 0; sourceMetrics.duration_ms = 0;
    for (const key of Object.keys(serverProfile)) serverProfile[key] = 0;
    const start = performance.now();
    const amendment = await call("product_amendment_prepare", { context: current, artifact: "roadmap", base_generation: JSON.parse(Buffer.from(current, "base64url")).target_revision,
      intent_text: "Exclude task 29; retain template checks in task 1 and integration agreement in task 3.", source: "Synthetic explicit owner instruction",
      ...(mode === "recheck" ? { change_scope: { kind: "task_retirement", task_ref: ref("TASK-0029"), redistributed_to: [ref("TASK-0001"), ref("TASK-0003")] } } : {}) });
    const candidate = amendment.result.candidate_ref, answer = amendment.result.decision_ref;
    const document = f.registry.documents.find((entry) => entry.artifact === "roadmap");
    const editable = await call("product_document_begin_edit", { context: current, artifact: "roadmap", document_id: document.id });
    let source = await readFile(editable.result.editable_path, "utf8");
    source = source.replace("Current roadmap behavior", "Current roadmap behavior; verify inherited template checks")
      .replace("Current roadmap behavior 3", "Current roadmap behavior 3; own common integration agreement");
    await writeFile(editable.result.editable_path, source);
    const edits = await call("product_document_inspect_edits", { context: current, candidate_ref: candidate, document_id: document.id, limit: 50 });
    await call("product_document_accept_edits", { context: current, candidate_ref: candidate, document_id: document.id, instruction_ref: answer, observed_digest: edits.result.source_version });
    for (const id of ["TASK-0002", "TASK-0005"]) await call("roadmap_unlink_dependency", { context: current, candidate_ref: candidate, task_ref: ref(id), requires_task_ref: ref("TASK-0029"), answer_ref: answer, reason: "Keep the existing task 1 prerequisite; remove the obsolete task 29 edge." });
    await call("roadmap_retire_task", { context: current, candidate_ref: candidate, task_ref: ref("TASK-0029"), redistributed_to: [ref("TASK-0001"), ref("TASK-0003")], answer_ref: answer, reason: "Responsibilities remain in existing tasks 1 and 3." });
    const basis = amendment.result.review_basis;
    if (mode === "recheck") {
      assert.deepEqual(basis, { candidate_ref: f.candidateRef, review_ref: initial.review }, "Public preparation must deliver the verified predecessor.");
    }
    const retirementReviewed = await finish(candidate, mode, mode === "recheck" ? basis.review_ref : undefined, mode === "recheck" ? basis.candidate_ref : undefined);
    let reviewed = retirementReviewed, correction = null;
    if (retirementReviewed.proseKey) {
      let source = await readFile(editable.result.editable_path, "utf8");
      source = source.replace(`There are ${elements} active tasks in the current Roadmap.`, `There are ${elements - 1} active tasks in the current Roadmap.`);
      await writeFile(editable.result.editable_path, source);
      const edits = await call("product_document_inspect_edits", { context: current, candidate_ref: candidate, document_id: document.id, limit: 50 });
      await call("product_document_accept_edits", { context: current, candidate_ref: candidate, document_id: document.id, instruction_ref: answer, observed_digest: edits.result.source_version });
      const fixes = [retirementReviewed.proseKey, "__consistency__"].map((finding_key) => ({ finding_key, changed_refs: [],
        changed_item_keys: [retirementReviewed.proseKey], explanation: "Correct only the retired-task count and responsibility summary." }));
      reviewed = await finish(candidate, "followup", retirementReviewed.review, undefined, fixes); correction = reviewed;
    }
    const activation = { context: current, candidates: [candidate], review_refs: [reviewed.review] };
    const published = await call("product_amendment_activate", activation);
    if (client) {
      // The first acknowledgement is an oracle only; recovery uses original arguments.
      await client.close(); client = await connectClient("retirement-lost-response-replay");
    }
    if (mode === "recheck") {
      const status = await call("product_amendment_activation_status", activation); assert.equal(status.result.state, "applied");
    }
    const replay = await call("product_amendment_activate", activation);
    assert.equal(replay.replayed, true); assert.equal(replay.operation_ref, published.operation_ref);
    if (profile && client) assert.equal(serverProfile.responses, calls.length);
    return { transport, mode, elements, representative, ...retirementReviewed, correction, elapsed_ms: performance.now() - start,
      source_validation: transport === "direct" ? sourceMetrics : null,
      server_profile: profile && client ? serverProfile : null,
      measurement_serialization_ms: calls.reduce((sum, value) => sum + value.measurement_serialization_ms, 0),
      calls: calls.length, response_bytes: calls.reduce((sum, value) => sum + value.response_bytes, 0), result_bytes: calls.reduce((sum, value) => sum + value.result_bytes, 0), timings: calls };
  } finally {
    if (client) await client.close();
    if (transport === "direct") metrics.unsubscribe(collect);
    if (oldRoot === undefined) delete process.env.EAW_PRODUCT_DATA_DIR; else process.env.EAW_PRODUCT_DATA_DIR = oldRoot;
    for (const fn of cleanup.reverse()) await fn();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [output, mode = "full", transport = "stdio", count = "30"] = process.argv.slice(2);
  assert.ok(output, "An explicit output path is required.");
  const result = await benchmarkRetirement({ mode, transport, elements: Number(count), representative: process.argv.includes("--representative"), progress: process.argv.includes("--progress"), findings: process.argv.includes("--findings"), profile: process.argv.includes("--profile") });
  await writeFile(output, bytes(result)); console.log(JSON.stringify({ ...result, timings: undefined }));
}
