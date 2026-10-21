import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { fixture, context, bytes, candidateVersion, writeCandidate, replaceArtifactDocument } from "../packages/engineer-agent-workflow-mcp/test-support/product-review-fixture.mjs";
import { loadGeneration, saveGeneration, saveObject } from "../packages/engineer-agent-workflow-mcp/dist/product/storage.js";
import { parseProductDocument } from "../packages/engineer-agent-workflow-mcp/dist/product/documents.js";

// Isolated model qualification. Every verdict must be supplied by a reviewer.
const [command, directory, phase, argument] = process.argv.slice(2);
assert.ok(directory, "An explicit temporary qualification directory is required.");
const target = resolve(directory), statePath = join(target, "session.json");
const ref = (productId, id) => ({ product_id: productId, artifact: "roadmap", element_id: id });
const titles = ["Template validation", "Codex packaging", "Integration agreement", "Claude packaging", "Release integration", "Schema validation", "Strict renderer", "Host isolation", "Metadata checks", "Explicit invocation", "Pinned dependencies", "Telemetry policy", "Temporary homes", "Path safety", "Identifier allocation", "Document discovery", "Evidence hashing", "Generation lineage", "Decision history", "Review inventory", "Review receipts", "Independent review", "Correction review", "Atomic activation", "Activation inspection", "Exact replay", "Concurrency checks", "Collection validation", "Shared release checks", "Operator documentation"];
const outcomes = [
  "Validate every template's required headings and byte limits before packaging. Shared release policy checks are supplied by TASK-0029.",
  "Build the Codex bundle after TASK-0001 template validation and TASK-0029 shared release checks pass.",
  "Maintain the integration agreement describing both hosts' observable release behavior. Shared release policy checks are supplied by TASK-0029.",
  "Build the Claude Code bundle from the authoritative templates with only Claude metadata.",
  "Integrate the two generated bundles after TASK-0001 template validation and TASK-0029 shared release checks pass.",
  "Reject manifests that do not match the declared schemas.", "Reject unknown placeholders and unresolved substitutions.",
  "Reject references to the other host's instruction and metadata files.", "Validate discovery descriptions and skill byte budgets.",
  "Generate explicit-only invocation metadata for each host.", "Use the tested pinned dependency versions in normative commands.",
  "Disable upstream installation telemetry in normative lifecycle commands.", "Exercise lifecycle checks only in isolated temporary homes.",
  "Reject unsafe paths and symlink escapes before reading or publishing artifacts.", "Keep semantic identifiers stable across retirement; never renumber surviving tasks.",
  "Detect missing registered documents and unregistered draft files.", "Verify immutable source bytes with SHA-256 before using evidence.",
  "Audit generation ancestry with cycle detection and bounded depth.", "Retain append-only decision provenance and explicit instruction references.",
  "Build review blocks from exact source atoms and applicable shared evidence.", "Bind completed source delivery to exact read receipts.",
  "Require independent semantic judgments before readiness.", "Review corrected blocks and fresh whole-artifact consistency.",
  "Publish ready artifacts atomically under a product lock after fresh validation.", "Report the exact operation's published generation separately from current head.",
  "Replay identical activation arguments after restart without a second publication.", "Reject mutable candidate or predecessor changes at mutation checkpoints.",
  "Validate both generated collections before release.",
  "Own shared release policy checks: ensure generated skill metadata enforces explicit invocation, and ensure neither host bundle contains credentials. Record the two-host integration agreement for these checks.",
  "Document the supported review, correction, activation and replay sequence for operators.",
];

if (command === "init") {
  await mkdir(target, { recursive: true });
  const f = await fixture({ after() {} }, "roadmap", { elements: 30 });
  await replaceArtifactDocument(f, "idea", "# Portable workflow collection\n\n### IDEA-0001: Safe portable workflows\n\nMaintain one authoritative template collection with separate Codex and Claude Code bundles.\n");
  await replaceArtifactDocument(f, "prd", "# Product requirements\n\n### PRD-0001: Verifiable release\n\nA release uses one authoritative template source, separate host bundles, explicit-only invocation metadata and no embedded credentials. Review evidence, stable semantic identifiers and a two-host integration agreement remain mandatory when work is redistributed. All work runs in temporary stores during qualification.\n");
  await replaceArtifactDocument(f, "technical-design", "# Technical design\n\n### TD-0001: Release integrity\n\nThe strict renderer generates isolated host bundles. Template validation checks required headings, byte limits, explicit-only invocation metadata and absence of credentials in both generated bundles. The integration agreement records the same policy for both hosts. Immutable content is identified by SHA-256. Fresh candidate, predecessor and head checks protect atomic publication and exact replay.\n");
  const source = "# Product Roadmap\n\nThere are 30 active tasks in this Roadmap. Tasks are work outcomes, not completed implementations.\n\n"
    + "## Shared policy\n\nBoth host bundles must enforce explicit invocation and contain no credentials. Every surviving identifier is stable. The integration agreement and template validation jointly cover release policy when responsibilities move.\n\n"
    + titles.map((title, index) => `### TASK-${String(index + 1).padStart(4, "0")}: ${title}\n\n#### Outcome\n\n${outcomes[index]}\n`).join("\n")
    + "\n## Task index\n\n| Task | Outcome |\n| --- | --- |\n" + titles.map((title, index) => `| TASK-${String(index + 1).padStart(4, "0")} | ${title} |`).join("\n") + "\n";
  await replaceArtifactDocument(f, "roadmap", source);
  const generationValue = (parent, ready_artifacts) => ({ schema_version: 1, kind: "generation", product_id: f.productId, parent,
    registry: f.candidate.registry, ready_artifacts, decision_heads: [], relations: [] });
  const base = await saveGeneration(f.root, generationValue(null, []));
  const kinds = ["idea", "prd", "technical-design"];
  const pin = (kind, generation) => { const document = f.registry.documents.find((entry) => entry.artifact === kind);
    return { product_id: f.productId, artifact: kind, source_kind: "markdown", source_id: document.id, generation,
      object_sha256: document.object_sha256, element_ids: [f.refs[kind].element_id], decision_ref: null }; };
  const ready = await saveGeneration(f.root, generationValue(base.sha256, kinds.map((kind, index) => ({ artifact: kind,
    source_version: f.registry.documents.find((entry) => entry.artifact === kind).object_sha256,
    review_id: randomUUID(), upstream_pins: kinds.slice(0, index).map((parent) => pin(parent, base.sha256)) }))));
  const heads = [];
  for (const [index, text] of ["Both generated host bundles must contain no credentials.", "Every surviving semantic identifier must remain stable.", "Both hosts require explicit-only invocation and the integration agreement must describe the release policy."].entries()) {
    const decisionRef = { product_id: f.productId, artifact: "roadmap", id: randomUUID(), revision: 1 };
    const saved = await saveObject(f.root, { productId: f.productId, kind: "decision", artifact: "roadmap", decisionId: decisionRef.id, revision: 1,
      bytes: bytes({ schema_version: 1, kind: "decision", ref: decisionRef, state: "observed", category: "shared-constraint", question: null,
        text, source: "Isolated qualification release requirements", selected_ids: [], predecessors: [],
        affected_refs: [ref(f.productId, ["TASK-0001", "TASK-0003", "TASK-0015"][index])], reconsider_when: null, candidate_id: f.candidateId }) });
    heads.push({ decision_ref: decisionRef, object_sha256: saved.sha256 });
  }
  f.candidate = { ...f.candidate, base_generation: ready.sha256, upstream_pins: kinds.map((kind) => pin(kind, ready.sha256)), decision_heads: heads,
    relations: [2, 5].flatMap((id) => [1, 29].map((dependency) => ({ from: ref(f.productId, `TASK-${String(id).padStart(4, "0")}`), kind: "depends_on", to: ref(f.productId, `TASK-${String(dependency).padStart(4, "0")}`) }))) };
  f.candidate.source_version = candidateVersion(f.candidate); await writeCandidate(f, f.candidate);
  await writeFile(join(f.root, "products", f.productId, "head.yaml"), bytes({ schema_version: 1, kind: "head", product_id: f.productId, generation: ready.sha256, operation_id: randomUUID() }));
  await writeFile(statePath, bytes({ root: f.root, context: context(f, f.candidate), candidate_ref: f.candidateRef,
    original_candidate_ref: f.candidateRef, document_id: f.registry.documents.find((entry) => entry.artifact === "roadmap").id }));
  console.log(statePath);
} else {
  const state = JSON.parse(await readFile(statePath, "utf8"));
  const client = new Client({ name: "live-roadmap-retirement-qualification", version: "1" });
  await client.connect(new StdioClientTransport({ command: process.execPath,
    args: [fileURLToPath(new URL("../packages/engineer-agent-workflow-mcp/dist/main.js", import.meta.url))], stderr: "pipe",
    env: { ...process.env, EAW_PRODUCT_DATA_DIR: state.root } }));
  async function call(name, args = {}, expectedErrors) {
    const input = { context: state.context, ...args }, started = performance.now();
    const raw = await client.callTool({ name, arguments: input });
    const response = raw.structuredContent ?? JSON.parse(raw.content.find((entry) => entry.type === "text").text);
    await appendFile(join(target, "calls.jsonl"), `${JSON.stringify({ name, arguments: input, response, elapsed_ms: performance.now() - started })}\n`);
    if (expectedErrors) assert.ok(expectedErrors.includes(response.error?.code), JSON.stringify(response));
    else assert.equal(response.error, undefined, JSON.stringify(response.error));
    if (response.context) state.context = response.context;
    await writeFile(statePath, bytes(state));
    return response;
  }
  async function fullPortion(name, input, first) {
    let portion = first ?? (await call(name, input)).result, text = portion.text;
    while (!portion.complete) { portion = (await call(name, { ...input, cursor: portion.next_cursor })).result; text += portion.text; }
    return { ...portion, text };
  }
  try {
    const phaseDir = join(target, phase ?? "");
    if (command === "capture" || command === "refresh") {
      await mkdir(phaseDir, { recursive: true });
      const options = JSON.parse(argument?.startsWith("@") ? await readFile(argument.slice(1), "utf8") : argument ?? "{}");
      const started = command === "refresh" ? await call("product_review_status", { review_ref: state.review_ref })
        : await call("product_review_start", { candidate_ref: state.candidate_ref, ...options });
      state.review_ref = started.result.review_ref; state.phase = phase;
      const items = []; let next = started.result.next_item_index;
      while (next !== null) {
        const page = (await call("product_review_get_batch", { review_ref: state.review_ref, start_index: next, limit: 20, pending_only: true })).result;
        if (page.items.length === 0) { assert.equal(page.next_item_index, null); break; }
        for (const item of page.items) items.push({ item_index: item.item_index, ...await fullPortion("product_review_get", { review_ref: state.review_ref, item_index: item.item_index }, item.portion) });
        next = page.items.at(-1).item_index + 1;
        if (next >= started.result.total_items) next = null;
      }
      await writeFile(join(phaseDir, "packet.json"), bytes({ status: started.result, items }));
      await writeFile(join(phaseDir, "sources.md"), items.map((item) => `# Item ${item.item_index}: ${item.item_key}\n\n${item.text}\n`).join("\n"));
      console.log(JSON.stringify({ phase, items: items.length, total: started.result.total_items, status: started.result }));
    } else if (command === "upstream") {
      await mkdir(phaseDir, { recursive: true });
      const packet = JSON.parse(await readFile(join(target, "baseline", "packet.json"), "utf8"));
      const requests = packet.items.filter((item) => item.item_key.startsWith("upstream:"))
        .flatMap((item) => { const pin = JSON.parse(item.text.split("\n").find((line) => line.startsWith("{")));
          return pin.element_ids.map((element_id) => ({ pin, element_ref: { product_id: pin.product_id, artifact: pin.artifact, element_id } })); });
      const history = (await readFile(join(target, "calls.jsonl"), "utf8")).trim().split("\n").map((line) => JSON.parse(line));
      const readyContext = history.find((entry) => entry.name === "product_amendment_activate" && !entry.response.error)?.response.context;
      assert.ok(readyContext, "Publish the baseline before reading its retained ready inputs.");
      const candidateContext = state.context;
      let response;
      try { response = await call("product_sources_get_batch", { requests, context: readyContext }); }
      finally { state.context = candidateContext; await writeFile(statePath, bytes(state)); }
      assert.equal(response.result.complete, true);
      assert.ok(response.result.items.every((item) => item.portion.complete));
      await writeFile(join(phaseDir, "packet.json"), bytes({ requests, response: response.result }));
      await writeFile(join(phaseDir, "sources.md"), response.result.items.map((item) => `# ${requests[item.index].element_ref.artifact}\n\n${item.portion.text}\n`).join("\n"));
      console.log(JSON.stringify({ sources: response.result.items.length }));
    } else if (command === "submit-blocks") {
      const packet = JSON.parse(await readFile(join(phaseDir, "packet.json"), "utf8"));
      const judgments = JSON.parse(await readFile(join(phaseDir, "verdicts.json"), "utf8"));
      assert.equal(judgments.length, packet.items.length);
      assert.deepEqual(new Set(judgments.map((item) => item.item_key)), new Set(packet.items.map((item) => item.item_key)));
      const items = judgments.map((item) => ({ ...item, evidence_refs: item.evidence_refs ?? [], evidence_sources: item.evidence_sources ?? [],
        inherited_from: null, read_receipt: packet.items.find((entry) => entry.item_key === item.item_key).read_receipt }));
      for (let index = 0; index < items.length; index += 20) await call("product_review_record_batch", { review_ref: state.review_ref, items: items.slice(index, index + 20) });
      console.log(JSON.stringify((await call("product_review_status", { review_ref: state.review_ref })).result));
    } else if (command === "consistency") {
      const input = { review_ref: state.review_ref, representation: "compact-v1" };
      const portion = await fullPortion("product_review_consistency_get", input);
      await writeFile(join(phaseDir, "consistency.json"), bytes(portion));
      await writeFile(join(phaseDir, "consistency.txt"), portion.text);
      console.log(JSON.stringify({ phase, bytes: Buffer.byteLength(portion.text) }));
    } else if (command === "complete") {
      const portion = JSON.parse(await readFile(join(phaseDir, "consistency.json"), "utf8"));
      const judgment = JSON.parse(await readFile(join(phaseDir, "consistency-verdict.json"), "utf8"));
      await call("product_review_consistency_record", { review_ref: state.review_ref, read_receipt: portion.read_receipt, ...judgment });
      const result = await call("product_review_complete", { review_ref: state.review_ref });
      await writeFile(join(phaseDir, "completed.json"), bytes(result));
      state[`${phase}_review_ref`] = state.review_ref;
      console.log(JSON.stringify(result));
    } else if (command === "amend") {
      await call("product_amendment_activate", { candidates: [state.candidate_ref], review_refs: [state.review_ref] });
      const productId = state.candidate_ref.product_id;
      const prepared = await call("product_amendment_prepare", { artifact: "roadmap", base_generation: JSON.parse(Buffer.from(state.context, "base64url")).target_revision,
        intent_text: "Retire TASK-0029. Move both host template policy checks to TASK-0001 and integration agreement ownership to TASK-0003. Remove TASK-0002 and TASK-0005 dependencies on TASK-0029, retaining their TASK-0001 prerequisite. Preserve all surviving identifiers.",
        source: "User-authorized isolated qualification; fixture instruction is simulated product-owner intent, not live product consent.",
        change_scope: { kind: "task_retirement", task_ref: ref(productId, "TASK-0029"), redistributed_to: [ref(productId, "TASK-0001"), ref(productId, "TASK-0003")] } });
      state.candidate_ref = prepared.result.candidate_ref; state.answer_ref = prepared.result.decision_ref; state.review_basis = prepared.result.review_basis;
      const editable = await call("product_document_begin_edit", { artifact: "roadmap", document_id: state.document_id });
      state.editable_path = editable.result.editable_path;
      let source = await readFile(state.editable_path, "utf8");
      source = source.replace(outcomes[0], "Validate every template's required headings and byte limits before packaging. Own the shared release policy checks for both host bundles: explicit-only invocation metadata and absence of credentials.")
        .replace(outcomes[2], "Own the integration agreement describing both hosts' observable release behavior, explicit-only invocation policy and credential-free bundle checks; TASK-0001 performs the shared template policy checks.")
        .replace(outcomes[1], "Build the Codex bundle after TASK-0001 template validation and shared release policy checks pass.")
        .replace(outcomes[4], "Integrate the two generated bundles after TASK-0001 template validation and shared release policy checks pass.");
      if (phase === "negative-control") {
        source = source.replace("explicit-only invocation metadata and absence of credentials.", "explicit-only invocation metadata.")
          .replace("explicit-only invocation policy and credential-free bundle checks;", "explicit-only invocation policy;");
      }
      await writeFile(state.editable_path, source);
      const inspected = await call("product_document_inspect_edits", { candidate_ref: state.candidate_ref, document_id: state.document_id, limit: 50 });
      await call("product_document_accept_edits", { candidate_ref: state.candidate_ref, document_id: state.document_id, instruction_ref: state.answer_ref, observed_digest: inspected.result.source_version });
      for (const id of ["TASK-0002", "TASK-0005"]) await call("roadmap_unlink_dependency", { candidate_ref: state.candidate_ref, task_ref: ref(productId, id), requires_task_ref: ref(productId, "TASK-0029"), answer_ref: state.answer_ref, reason: "The existing TASK-0001 prerequisite now owns the release checks." });
      await call("roadmap_retire_task", { candidate_ref: state.candidate_ref, task_ref: ref(productId, "TASK-0029"), redistributed_to: [ref(productId, "TASK-0001"), ref(productId, "TASK-0003")], answer_ref: state.answer_ref, reason: "Both host policy checks and integration agreement ownership are retained in the declared recipients." });
      console.log(JSON.stringify({ candidate_ref: state.candidate_ref, review_basis: state.review_basis }));
    } else if (command === "edit") {
      const replacements = JSON.parse(await readFile(argument, "utf8"));
      let source = await readFile(state.editable_path, "utf8");
      for (const [before, after] of replacements) { assert.ok(source.includes(before)); source = source.replace(before, after); }
      await writeFile(state.editable_path, source);
      const inspected = await call("product_document_inspect_edits", { candidate_ref: state.candidate_ref, document_id: state.document_id, limit: 50 });
      console.log(JSON.stringify(await call("product_document_accept_edits", { candidate_ref: state.candidate_ref, document_id: state.document_id, instruction_ref: state.answer_ref, observed_digest: inspected.result.source_version })));
    } else if (command === "assert-table-rejected") {
      const response = await call("product_review_start", { candidate_ref: state.candidate_ref, mode: "recheck",
        parent_review_ref: state.review_basis.review_ref, parent_candidate_ref: state.review_basis.candidate_ref }, ["BROKEN_REFERENCE"]);
      await writeFile(join(target, "table-rejection.json"), bytes(response)); console.log(JSON.stringify(response.error));
    } else if (command === "assert-blocked") {
      const headPath = join(state.root, "products", state.candidate_ref.product_id, "head.yaml");
      const before = await readFile(headPath);
      const response = await call("product_amendment_activate", { candidates: [state.candidate_ref], review_refs: [state.review_ref] }, ["REVIEW_REQUIRED", "PREREQUISITE_REQUIRED"]);
      assert.deepEqual(await readFile(headPath), before);
      await writeFile(join(target, "blocked-activation.json"), bytes(response)); console.log(JSON.stringify(response.error));
    } else if (command === "activate") {
      const args = { context: state.context, candidates: [state.candidate_ref], review_refs: [state.review_ref] };
      await writeFile(join(target, "activation-arguments.json"), bytes(args));
      const response = await call("product_amendment_activate", args);
      await writeFile(join(target, "activation-oracle.json"), bytes(response));
      console.log(JSON.stringify(response));
    } else if (command === "recover") {
      const args = JSON.parse(await readFile(join(target, "activation-arguments.json"), "utf8"));
      const oracle = JSON.parse(await readFile(join(target, "activation-oracle.json"), "utf8"));
      const headPath = join(state.root, "products", state.candidate_ref.product_id, "head.yaml"), before = await readFile(headPath);
      const status = await call("product_amendment_activation_status", args), replay = await call("product_amendment_activate", args);
      assert.equal(status.result.state, "applied"); assert.equal(replay.replayed, true); assert.equal(replay.operation_ref, oracle.operation_ref);
      assert.deepEqual(replay.result, oracle.result);
      assert.equal(JSON.parse(Buffer.from(replay.context, "base64url")).target_revision, JSON.parse(Buffer.from(oracle.context, "base64url")).target_revision);
      assert.deepEqual(await readFile(headPath), before);
      await writeFile(join(target, "recovery.json"), bytes({ status, replay })); console.log(JSON.stringify({ status, replay }));
    } else if (command === "verify-published") {
      const revision = JSON.parse(Buffer.from(state.context, "base64url")).target_revision;
      const loaded = await loadGeneration(state.root, state.candidate_ref.product_id, revision);
      const ids = loaded.documents.filter((document) => document.id === state.document_id)
        .flatMap((document) => parseProductDocument(document.bytes).elements.map((element) => element.id));
      assert.deepEqual(ids, titles.map((_, index) => `TASK-${String(index + 1).padStart(4, "0")}`).filter((id) => id !== "TASK-0029"));
      assert.deepEqual(loaded.generation.relations.map((relation) => [relation.from.element_id, relation.kind, relation.to.element_id]).sort(),
        [["TASK-0002", "depends_on", "TASK-0001"], ["TASK-0005", "depends_on", "TASK-0001"]]);
      const upstream = JSON.parse(await readFile(join(target, "upstream", "packet.json"), "utf8"));
      for (const request of upstream.requests) assert.ok(loaded.documents.some((document) => document.id === request.pin.source_id && document.sha256 === request.pin.object_sha256));
      const result = { generation: revision, remaining_task_ids: ids, relations: loaded.generation.relations, unchanged_upstream_objects: upstream.requests.map((request) => request.pin.object_sha256) };
      await writeFile(join(target, "verified-published.json"), bytes(result)); console.log(JSON.stringify(result));
    } else throw new Error("Use init, capture, refresh, upstream, submit-blocks, consistency, complete, amend, edit, assert-table-rejected, assert-blocked, activate, recover or verify-published.");
    await writeFile(statePath, bytes(state));
  } finally { await client.close(); }
}
