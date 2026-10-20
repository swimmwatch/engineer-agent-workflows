import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL, URL } from "node:url";
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";

import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { createTemporaryDirectory } from "./temporary-directory.mjs";
import { reportCleanupFailure } from "./qualification-diagnostics.mjs";

const executeFile = promisify(execFile);
const server = fileURLToPath(new URL("../../dist/main.js", import.meta.url));
const fixture = JSON.parse(await readFile(new URL(
  "../../../../tests/fixtures/product-workflows/qualification.json",
  import.meta.url,
), "utf8"));
const WITHOUT_CONTEXT = new Set([
  "product_bind_workspace",
  "product_capabilities",
  "product_initialize",
  "product_list",
  "product_open",
  "specification_open",
]);

const hash = (value) => createHash("sha256").update(value).digest("hex");
const applicability = (stageRefs = []) => ({
  state: "accepted_target",
  stage_refs: stageRefs,
  global: stageRefs.length === 0,
  reason: "Synthetic cross-platform qualification fixture.",
});

function processEnvironment(root) {
  return Object.fromEntries(Object.entries({
    ...process.env,
    EAW_PRODUCT_DATA_DIR: root,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_TERMINAL_PROMPT: "0",
  }).filter((entry) => typeof entry[1] === "string"));
}

async function initializeRepository(workspace) {
  await mkdir(workspace, { recursive: true });
  await executeFile("git", ["init", "--quiet", "--initial-branch=main"], {
    cwd: workspace,
    env: processEnvironment(join(dirname(workspace), "unused-product-root")),
  });
  await writeFile(join(workspace, "README.md"), "# Qualification workspace\n");
  await executeFile("git", ["add", "README.md"], { cwd: workspace, env: process.env });
  await executeFile("git", [
    "-c", "user.name=Qualification Fixture",
    "-c", "user.email=fixture@example.invalid",
    "commit", "--quiet", "-m", "fixture: initialize workspace",
  ], { cwd: workspace, env: process.env });
}

async function directoryBytes(path) {
  const entries = await readdir(path, { withFileTypes: true });
  let total = 0;
  for (const entry of entries) {
    const target = join(path, entry.name);
    if (entry.isDirectory()) total += await directoryBytes(target);
    else if (entry.isFile()) total += (await stat(target)).size;
  }
  return total;
}

function reportProgress(onProgress, event) {
  try { onProgress?.(event); } catch { /* Observers cannot change MCP outcomes. */ }
}

export function actor(t, { name, root, calls, entrypoint = server, onProgress }) {
  t.checkActive?.();
  const progress = (event, tool, scenario) => {
    reportProgress(onProgress, { event, actor: name, tool, scenario });
  };
  let client;
  let transport;
  let connecting;
  let closing;
  let context;
  const launches = [];
  const checkCancelled = () => { t.checkActive?.(); t.signal?.throwIfAborted(); };

  async function start() {
    checkCancelled();
    if (closing) await closing;
    checkCancelled();
    if (client) {
      await connecting;
      checkCancelled();
      return;
    }
    closing = undefined;
    client = new Client({ name, version: "1" });
    transport = new StdioClientTransport({
      command: process.execPath,
      args: [entrypoint],
      env: processEnvironment(root),
      stderr: "pipe",
    });
    // Own the transport before connect; the client may not yet own a pending handshake.
    const startTransport = transport.start.bind(transport);
    const ownedTransport = transport;
    ownedTransport.start = async () => {
      checkCancelled();
      const started = startTransport();
      const pid = ownedTransport.pid;
      // Existing argument observation is test-only; lifecycle uses the public PID.
      const actualArguments = ownedTransport._process?.spawnargs;
      if (pid) launches.push({ pid, spawnargs: [...(actualArguments ?? [])] });
      await started;
      assert.ok(Number.isSafeInteger(pid) && pid > 0, "a launched actor must have an observable owned PID");
      assert.ok(Array.isArray(actualArguments), "the actual stdio child arguments must be observable");
      assert.deepEqual(actualArguments.slice(1), [entrypoint], "stdio actor must actually launch the selected executable entrypoint");
    };
    progress("start", "connect");
    connecting = client.connect(transport, { signal: t.signal });
    try {
      await connecting;
      checkCancelled();
    } catch (error) {
      try { await close(); }
      catch (cleanupError) { throw new AggregateError([error, cleanupError], "qualification connection and cleanup failed", { cause: cleanupError }); }
      throw error;
    } finally { progress("end", "connect"); }
  }

  function close() {
    if (closing) return closing;
    const active = client;
    const ownedTransport = transport;
    if (!active && !ownedTransport) return Promise.resolve();
    closing = (async () => {
      progress("start", "close");
      try {
        // Explicit transport close also cancels SDK negotiation before client ownership.
        const results = await Promise.allSettled([ownedTransport?.close(), active?.close()]);
        const errors = results.filter((result) => result.status === "rejected").map((result) => result.reason);
        for (const [index, result] of results.entries()) {
          if (result.status === "rejected") reportCleanupFailure(t, { resource: "actor", actor: name,
            boundary: index === 0 ? "transport-close" : "client-close" }, result.reason);
        }
        const isAlive = (pid) => {
          try { process.kill(pid, 0); return true; }
          catch (error) {
            if (error.code === "ESRCH") return false;
            reportCleanupFailure(t, { resource: "actor", actor: name, boundary: "pid-observation" }, error);
            throw error;
          }
        };
        // SDK close may return just after signalling; wait for actual owned process exit.
        for (let attempt = 0; attempt < 200 && launches.some(({ pid }) => isAlive(pid)); attempt += 1) await delay(10);
        if (launches.some(({ pid }) => isAlive(pid))) {
          const error = new Error("qualification actor child did not exit");
          errors.push(error);
          reportCleanupFailure(t, { resource: "actor", actor: name, boundary: "child-exit-check" }, error);
        }
        if (errors.length) throw new AggregateError(errors, "qualification actor cleanup failed");
      } finally {
        client = undefined;
        transport = undefined;
        progress("end", "close");
      }
    })();
    return closing;
  }
  const onAbort = () => { close().catch(() => { /* The retained promise is surfaced by owned teardown. */ }); };
  t.signal?.addEventListener("abort", onAbort, { once: true });

  async function request(tool, arguments_, updateContext, expectedError = false) {
    const scenario = typeof arguments_.scenario === "string" ? arguments_.scenario : undefined;
    progress("start", tool, scenario);
    let response;
    let started;
    try {
      await start();
      started = performance.now();
      checkCancelled();
      response = await client.callTool({ name: tool, arguments: arguments_ }, { signal: t.signal });
    } finally { progress("end", tool, scenario); }
    const elapsedMs = performance.now() - started;
    const responseBytes = Buffer.byteLength(JSON.stringify(response));
    calls.push({ actor: name, tool, elapsedMs, responseBytes, isError: response.isError === true,
      ...(typeof arguments_.scenario === "string" ? { scenario: arguments_.scenario } : {}) });
    if (expectedError) assert.equal(response.isError, true, "the selected fault must block the public request");
    else assert.notEqual(response.isError, true, JSON.stringify(response.structuredContent));
    if (updateContext && typeof response.structuredContent.context === "string") {
      context = response.structuredContent.context;
    }
    return response.structuredContent;
  }

  t.after(async () => {
    try { await close(); }
    finally { t.signal?.removeEventListener("abort", onAbort); }
  }, { resource: "actor", actor: name, boundary: "scope-disposer" });
  return {
    context: () => context,
    launches: () => launches.map(({ pid, spawnargs }) => ({ pid, spawnargs: [...spawnargs] })),
    setContext(value) {
      context = value;
    },
    async restart() {
      await close();
      await start();
    },
    async raw(tool, arguments_) {
      return request(tool, arguments_, false);
    },
    async expectedError(tool, arguments_) {
      return request(tool, arguments_, false, true);
    },
    async openSession(candidateRef) {
      const response = await request("product_session_open", { context, candidate_ref: candidateRef }, false);
      return { session_ref: response.result.session_ref, expected_revision: response.result.session_revision };
    },
    async sessionStart(session, scenario, arguments_) {
      const response = await request("product_session_call", { ...session, request_id: randomUUID(), scenario, arguments: arguments_ }, false);
      session.expected_revision = response.result.session_revision;
      return response.result;
    },
    async sessionCollect(session, first) {
      let page = first, text = "", outputs = [];
      for (let portions = 0; portions < 10000; portions += 1) {
        assert.equal(page.read_ref, first.read_ref);
        text += page.delivery.text;
        if (page.delivery.complete) {
          const output = JSON.parse(text);
          outputs.push(output);
          if (typeof output.context === "string") context = output.context;
          text = "";
        }
        if (page.complete) { assert.equal(text, ""); return outputs; }
        const next = await request("product_session_next", { ...session, read_ref: first.read_ref }, false);
        session.expected_revision = next.result.session_revision;
        page = next.result;
      }
      assert.fail("bounded session delivery must terminate");
    },
    async sessionCall(session, scenario, arguments_) {
      return this.sessionCollect(session, await this.sessionStart(session, scenario, arguments_));
    },
    async call(tool, arguments_ = {}) {
      const input = context && !WITHOUT_CONTEXT.has(tool)
        ? { context, ...arguments_ }
        : arguments_;
      const response = await request(tool, input, true);
      return response.result;
    },
  };
}

async function confirmScope(author, candidateRef) {
  const proposal = await author.call("product_scope_propose", {
    candidate_ref: candidateRef,
    depth: "standard",
    profiles: [
      { id: "core", reason: "Exercise the portable product workflow contract." },
      { id: "security", reason: "Exercise a concrete safety-blocking amendment." },
    ],
    rationale: ["The qualification crosses product stages, workspaces and process boundaries."],
  });
  const answer = await author.call("product_question_answer", {
    candidate_ref: candidateRef,
    question_ref: proposal.question_ref,
    text: "Confirm the synthetic Standard core and security scope.",
    source: "fixture-customer:scope",
    selected_ids: ["confirm"],
  });
  await author.call("product_scope_confirm", {
    candidate_ref: candidateRef,
    proposal_ref: proposal.question_ref,
    answer_ref: answer.decision_ref,
  });
}

async function readProductReviewItem(reviewer, reviewRef, itemIndex) {
  let cursor;
  let last;
  let text = "";
  do {
    last = await reviewer.call("product_review_get", {
      review_ref: reviewRef,
      item_index: itemIndex,
      ...(cursor ? { cursor } : {}),
    });
    text += last.text;
    cursor = last.next_cursor;
  } while (cursor);
  return { ...last, text };
}

async function reviewAndActivate({ author, reviewer, candidateRef, recovery }) {
  const started = await author.call("product_review_start", {
    candidate_ref: candidateRef,
    mode: "full",
  });
  reviewer.setContext(author.context());
  let duplicateVerdicts = 0;

  for (let index = 0; index < started.total_items; index += 1) {
    const item = await readProductReviewItem(reviewer, started.review_ref, index);
    const value = {
      item_key: item.item_key,
      verdict: "covered",
      explanation: "The synthetic artifact and its pinned evidence cover this item.",
      counterexample: null,
      evidence_refs: [],
      evidence_sources: [],
      read_receipt: item.read_receipt,
      inherited_from: null,
    };
    if (recovery && index === 0) {
      const staleContext = reviewer.context();
      const input = { context: staleContext, review_ref: started.review_ref, value };
      const first = await reviewer.raw("product_review_record", input);
      await reviewer.restart();
      const replayed = await reviewer.raw("product_review_record", input);
      assert.equal(replayed.replayed, true);
      assert.equal(replayed.context, first.context);
      reviewer.setContext(replayed.context);
      const status = await reviewer.call("product_review_status", { review_ref: started.review_ref });
      duplicateVerdicts = status.recorded_items - 1;
    } else {
      await reviewer.call("product_review_record", { review_ref: started.review_ref, value });
    }
  }
  if (started.inventory_contract === "semantic-v2") {
    let consistency = await reviewer.call("product_review_consistency_get", { review_ref: started.review_ref });
    while (consistency.next_cursor !== null) consistency = await reviewer.call("product_review_consistency_get", {
      review_ref: started.review_ref, cursor: consistency.next_cursor,
    });
    await reviewer.call("product_review_consistency_record", { review_ref: started.review_ref,
      read_receipt: consistency.read_receipt, verdict: "covered",
      explanation: "The synthetic blocks are consistent with the selected artifact scope.", counterexample: null });
  }
  const completed = await reviewer.call("product_review_complete", { review_ref: started.review_ref });
  assert.equal(completed.coverage_status, "reviewed");
  author.setContext(reviewer.context());
  const checked = await author.call("product_candidate_check", { candidate_ref: candidateRef });
  assert.equal(checked.status, "pass");
  const activated = await author.call("product_amendment_activate", {
    candidates: [candidateRef],
    review_refs: [started.review_ref],
  });
  return { activated, duplicateVerdicts, replayed: recovery };
}

async function collectPins(author, purpose, artifact, includeDecisions = false) {
  const first = await author.call("product_context_prepare", {
    purpose,
    artifact,
    budget_bytes: 1024,
  });
  const pages = [first];
  let cursor = first.next_cursor;
  while (cursor) {
    const page = await author.call("product_context_next", { cursor });
    pages.push(page);
    cursor = page.next_cursor;
  }
  assert.equal(pages.at(-1).complete, true);
  assert.equal(pages.every((page) => page.blockers.length === 0), true);
  return pages
    .flatMap((page) => [...page.required, ...page.optional])
    .filter((pin) => pin.artifact === artifact && (pin.element_ids.length > 0 || (includeDecisions && pin.source_kind === "decision")));
}

async function semanticSubject(author, artifact, candidateRef) {
  const listed = await author.call("product_document_list", { artifact, limit: 20 });
  const existing = listed.items.find((entry) => entry.document.role === "semantic");
  if (existing) return existing.document.subject;
  const created = await author.call("product_document_create_subject", {
    candidate_ref: candidateRef,
    subject: "Qualification",
    title: "Qualification",
  });
  assert.equal(typeof created.document_id, "string");
  return "Qualification";
}

async function draftStage(author, artifact, pins) {
  const drafted = await author.call("product_artifact_draft", {
    artifact,
    upstream_pins: pins,
  });
  await confirmScope(author, drafted.candidate_ref);
  const subject = await semanticSubject(author, artifact, drafted.candidate_ref);
  return { candidateRef: drafted.candidate_ref, subject };
}

async function readPinExactly(author, pin) {
  if (pin.element_ids.length === 0) return null;
  const elementRef = {
    product_id: pin.product_id,
    artifact: pin.artifact,
    element_id: pin.element_ids[0],
  };
  async function collect() {
    let cursor;
    let text = "";
    let page;
    do {
      page = await author.call("product_element_get", {
        element_ref: elementRef,
        pin,
        ...(cursor ? { cursor } : {}),
      });
      text += page.text;
      cursor = page.next_cursor;
    } while (cursor);
    return { text, complete: page.complete };
  }
  const first = await collect();
  const second = await collect();
  return {
    artifact: pin.artifact,
    complete: first.complete && second.complete,
    sha256: hash(first.text),
    expectedSha256: hash(second.text),
  };
}

async function readSpecificationItem(reviewer, reviewRef, itemIndex) {
  let cursor;
  let last;
  let text = "";
  do {
    last = await reviewer.call("specification_review_get", {
      review_ref: reviewRef,
      item_index: itemIndex,
      ...(cursor ? { cursor } : {}),
    });
    text += last.text;
    cursor = last.next_cursor;
  } while (cursor);
  return { page: last, body: JSON.parse(text) };
}

async function createTaskSpecification({ author, reviewer, workspace, slug, requirementId }) {
  const authorProductContext = author.context();
  const reviewerProductContext = reviewer.context();
  await author.call("specification_open", { project: workspace, specification: slug });
  const proposal = await author.call("scope_propose", {
    depth: "lite",
    rationale: ["One synthetic independently verifiable delivery task."],
    profiles: [{ id: "core", reason: "The task changes one bounded workflow behavior." }],
    exclusions: [],
    artifacts: [],
  });
  const answer = await author.call("question_record_answer", {
    question_ref: proposal.question_ref,
    selected_ids: ["confirm"],
    text: "Confirm the synthetic task scope.",
    source: "fixture-customer:scope",
  });
  await author.call("scope_confirm", {
    proposal_ref: proposal.question_ref,
    answer_ref: answer.decision_ref,
  });
  const directory = join(workspace, "docs", "specs", slug);
  await mkdir(directory, { recursive: true });
  const specificationPath = join(directory, "spec.md");
  await writeFile(specificationPath, [
    `# ${slug}`,
    "",
    "Status: Draft",
    "",
    `### ${requirementId}: Preserve workflow evidence`,
    "The task preserves exact product pins and independently verifiable evidence.",
    "",
  ].join("\n"));
  const source = await author.call("decision_record_instruction", {
    category: "qualification",
    kind: "initial_request",
    text: "Preserve exact product pins and independently verifiable evidence.",
    source: "fixture-customer:initial",
    requirement_ids: [requirementId],
  });
  const review = await author.call("specification_review_start", { mode: "full" });
  await reviewer.call("specification_open", { project: workspace, specification: slug });
  for (let index = 0; index < review.total_items; index += 1) {
    const item = await readSpecificationItem(reviewer, review.review_ref, index);
    await reviewer.call("specification_review_record", {
      review_ref: review.review_ref,
      item_index: index,
      read_receipt: item.page.read_receipt,
      verdict: "covered",
      explanation: "The synthetic requirement and source agree.",
      evidence_requirement_ids: item.body.kind === "source" ? [requirementId] : [],
      evidence_source_refs: item.body.kind === "requirement" ? [source.decision_ref] : [],
    });
  }
  await reviewer.call("specification_review_complete", { review_ref: review.review_ref });
  await writeFile(specificationPath, (await readFile(specificationPath, "utf8")).replace("Status: Draft", "Status: Approved"));
  author.setContext(reviewer.context());
  const checked = await author.call("specification_check_state");
  assert.equal(checked.status, "pass");
  assert.equal(checked.coverage_status, "reviewed");
  author.setContext(authorProductContext);
  reviewer.setContext(reviewerProductContext);
}

function uniquePins(pins) {
  return [...new Map(pins.map((pin) => [JSON.stringify(pin), pin])).values()];
}

async function effectSnapshot(root, relative = "") {
  const result = [];
  for (const entry of (await readdir(join(root, relative), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === "sessions") continue;
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...await effectSnapshot(root, child));
    else result.push([child, hash(await readFile(join(root, child)))]);
  }
  return result;
}

const canonical = (value) => value === null || typeof value !== "object"
  ? JSON.stringify(value)
  : Array.isArray(value) ? `[${value.map(canonical).join(",")}]`
    : `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;

function exactPortions(outputs) {
  let text = "", offset = 0;
  for (const output of outputs) {
    const page = output.result;
    if (Object.hasOwn(page, "offset")) assert.equal(page.offset, offset);
    text += page.text;
    offset += Array.from(page.text).length;
    assert.equal(page.complete, page.next_cursor === null);
  }
  assert.equal(outputs.at(-1).result.complete, true);
  if (Object.hasOwn(outputs.at(-1).result, "total_characters")) assert.equal(offset, outputs.at(-1).result.total_characters);
  return { ...outputs.at(-1).result, text };
}

async function reliabilityQualification(t, { author, reviewer, root, workspaces, directory, entrypoint, onProgress }) {
  // Fixture answers/verdicts exercise protocol mechanics, not authenticated consent or semantic independence.
  const runtime = (await author.raw("workflow_runtime_info", {})).result;
  const stamp = JSON.parse(await readFile(join(dirname(entrypoint), "runtime-stamp.json"), "utf8"));
  assert.equal(runtime.identity_status, "verified");
  assert.equal(runtime.build_id, stamp.build_id);
  assert.equal(runtime.contract_digest, stamp.contract_digest);
  const draftWorkspace = join(directory, "draft-evidence-雪😀");
  await initializeRepository(draftWorkspace);
  await author.call("product_initialize", { workspace: draftWorkspace, name: "Draft evidence fixture", known_idea: "Reconstruct exact saved evidence." });
  const draft = await author.call("product_artifact_draft", { artifact: "idea", upstream_pins: [] });
  let authorSession = await author.openSession(draft.candidate_ref);
  const instructionText = "Retain exact Unicode evidence 雪😀é.\n".repeat(160);
  const [saved] = await author.sessionCall(authorSession, "product_record_instruction", {
    candidate_ref: draft.candidate_ref, text: instructionText, source: "fixture:instruction", related_refs: [], affected_refs: [],
  });
  const [question] = await author.sessionCall(authorSession, "product_question_prepare", {
    candidate_ref: draft.candidate_ref, category: "research", text: "Which nested source applies?", options: [],
  });
  const evidence = { question_ref: question.result.question_ref, conclusion: "Nested evidence 雪😀".repeat(130),
    sources: [{ url: "https://example.invalid/qualification", checked_date: "2026-10-12", version_applicability: "Synthetic v1",
      finding: "Independent nested observation 🧪".repeat(65) }], uncertainty: ["Future applicability is unknown."], limitations: ["Simulated isolated evidence."] };
  const [research] = await author.sessionCall(authorSession, "product_record_research", { candidate_ref: draft.candidate_ref, evidence });
  // Only the test adapter drops an actual applied result; all authoring and recovery still cross stdio.
  const adapterPath = join(directory, "lost-response.mjs");
  const serverURL = pathToFileURL(join(dirname(entrypoint), "server.js")).href;
  const stateURL = pathToFileURL(join(dirname(entrypoint), "state.js")).href;
  await writeFile(adapterPath, `import { workflowTools } from ${JSON.stringify(serverURL)};
import { WorkflowError } from ${JSON.stringify(stateURL)};
const tool = workflowTools.find(tool => tool.name === "product_record_instruction");
const run = tool.run;
tool.run = async input => { const result = await run(input); if (!result.replayed) throw new WorkflowError("RECOVERY_REQUIRED", "Synthetic lost result after actual durable effect."); return result; };
await import(${JSON.stringify(pathToFileURL(entrypoint).href)});
`);
  const recoveryActor = actor(t, { name: "product-author-recovery", root, calls: [], entrypoint: adapterPath, onProgress });
  recoveryActor.setContext(author.context());
  const recoverySession = await recoveryActor.openSession(draft.candidate_ref);
  const recoveryArgs = { candidate_ref: draft.candidate_ref, text: "Recover one actual durable effect.", source: "fixture:recovery", related_refs: [], affected_refs: [] };
  const unknown = await recoveryActor.expectedError("product_session_call", { ...recoverySession, request_id: randomUUID(),
    scenario: "product_record_instruction", arguments: recoveryArgs });
  assert.equal(unknown.error.code, "RECOVERY_REQUIRED");
  const uncertain = await recoveryActor.raw("product_session_status", { session_ref: recoverySession.session_ref });
  assert.equal(uncertain.result.state, "unknown");
  recoverySession.expected_revision = uncertain.result.session_revision;
  const effectsBeforeRecovery = await effectSnapshot(root);
  await recoveryActor.restart();
  const resumed = await recoveryActor.raw("product_session_resume", recoverySession);
  recoverySession.expected_revision = resumed.result.session_revision;
  const [recovered] = await recoveryActor.sessionCollect(recoverySession, resumed.result);
  assert.equal(recovered.replayed, true);
  assert.equal(recovered.result.decision_ref.revision, 1);
  assert.deepEqual(await effectSnapshot(root), effectsBeforeRecovery, "unknown-result recovery must never duplicate business effects");
  const candidatePath = join(root, "products", draft.candidate_ref.product_id, "drafts", draft.candidate_ref.candidate_id, "candidate.yaml");
  const afterRecovery = JSON.parse(await readFile(candidatePath, "utf8"));
  const recoveryEffects = afterRecovery.decision_heads.filter((head) => head.decision_ref.id === recovered.result.decision_ref.id).length;
  assert.equal(recoveryEffects, 1);
  author.setContext(recovered.context);
  authorSession = await author.openSession(draft.candidate_ref);
  const beforeReads = await effectSnapshot(root);
  const draftKinds = [];
  let restartDeliveryExact = false;
  for (const [kind, record, text, source, state, category, predecessors, reconsiderWhen] of [
    ["decision", saved, instructionText, "fixture:instruction", "answered", "instruction", [], null],
    ["research", research, JSON.stringify(evidence), "product_record_research", "observed", "research", [evidence.question_ref], evidence.uncertainty.join("; ")],
  ]) {
    const reference = record.result.decision_ref;
    assert.equal(reference.revision, 1);
    const expected = { schema_version: 1, kind: "decision", ref: reference, state, category, question: null,
      text, source, selected_ids: [], predecessors, affected_refs: [], reconsider_when: reconsiderWhen, candidate_id: draft.candidate_ref.candidate_id };
    const expectedText = `${JSON.stringify(expected)}\n`;
    const input = { candidate_ref: draft.candidate_ref, record_ref: { kind, id: reference.id, revision: reference.revision } };
    const first = await author.sessionStart(authorSession, "product_candidate_record_get", input);
    assert.equal(first.complete, false, "large draft evidence must require continued delivery");
    if (kind === "decision") {
      await author.restart();
      const resumed = await author.raw("product_session_resume", authorSession);
      authorSession.expected_revision = resumed.result.session_revision;
      assert.equal(resumed.result.read_ref, first.read_ref);
      assert.equal(resumed.result.delivery.text, first.delivery.text);
      restartDeliveryExact = true;
    }
    const outputs = await author.sessionCollect(authorSession, first);
    const body = exactPortions(outputs);
    assert.equal(body.text, expectedText, "saved draft body must equal the independently specified record");
    assert.equal(body.source_object_sha256, hash(expectedText));
    assert.deepEqual(body.candidate_ref, draft.candidate_ref);
    assert.deepEqual(body.record_ref, input.record_ref);
    assert.deepEqual(JSON.parse(body.text), expected);
    draftKinds.push(kind);
  }
  assert.deepEqual(await effectSnapshot(root), beforeReads, "draft reads and process restart must not mutate product evidence");

  const product = await author.call("product_initialize", { workspace: workspaces[0], name: "119-block public fixture", known_idea: "Keep independent current coverage." });
  await reviewer.call("product_bind_workspace", { workspace: workspaces[1], product_id: product.product_id,
    binding_answer: "Bind the independent simulated reviewer.", source: "fixture:binding" });
  const selected = await author.call("product_artifact_draft", { artifact: "idea", upstream_pins: [] });
  const candidateRef = selected.candidate_ref;
  await confirmScope(author, candidateRef);
  const subject = await semanticSubject(author, "idea", candidateRef);
  authorSession = await author.openSession(candidateRef);
  let firstElement;
  for (let index = 0; index < 116; index += 1) {
    const [written] = await author.sessionCall(authorSession, "idea_define_problem", { candidate_ref: candidateRef, subject,
      value: { title: `Independent problem ${index + 1}`, provenance: [], applicability: { state: "current", stage_refs: [], global: false, reason: "Synthetic isolated block; no product-wide influence." },
        problem: `Isolated problem ${index + 1}.`, actors: ["Fixture author"], workarounds: [], value: "Keep exact product evidence.",
        success_signals: ["Public evidence remains exact."], constraints: [], non_goals: [], assumptions: [], risks: [], open_questions: [] } });
    firstElement ??= written.result.changed_refs[0];
  }
  const [instruction] = await author.sessionCall(authorSession, "product_record_instruction", { candidate_ref: candidateRef,
    text: "Correct only the diagram arrow spelling when necessary.", source: "fixture:diagram", related_refs: [], affected_refs: [firstElement] });
  await author.sessionCall(authorSession, "idea_define_problem", { candidate_ref: candidateRef, subject,
    value: { title: "Independent problem 1", provenance: [instruction.result.decision_ref],
      applicability: { state: "current", stage_refs: [], global: false, reason: "Synthetic isolated block; no product-wide influence." },
      problem: "Isolated problem 1.", actors: ["Fixture author"], workarounds: [], value: "Keep exact product evidence.",
      success_signals: ["Public evidence remains exact."], constraints: [], non_goals: [], assumptions: [], risks: [], open_questions: [] },
    element_ref: firstElement });
  const documents = await author.call("product_document_list", { artifact: "idea", limit: 50 });
  const document = documents.items.find((entry) => entry.document.subject === subject).document;
  const edit = await author.call("product_document_begin_edit", { artifact: "idea", document_id: document.id });
  const original = await readFile(edit.editable_path, "utf8");
  const elementHeading = `### ${firstElement.element_id}:`;
  assert.ok(original.includes(elementHeading));
  const withDiagram = original.replace(new RegExp(`(${elementHeading}[^\\n]*\\n)`, "u"), "$1\n```mermaid\nflowchart LR\nA-->B\n```\n");
  await writeFile(edit.editable_path, withDiagram);
  const inspected = await author.call("product_document_inspect_edits", { candidate_ref: candidateRef, document_id: document.id });
  await author.call("product_document_accept_edits", { candidate_ref: candidateRef, document_id: document.id,
    observed_digest: inspected.source_version, instruction_ref: instruction.result.decision_ref });
  authorSession = await author.openSession(candidateRef);
  const [parent] = await author.sessionCall(authorSession, "product_review_start", { candidate_ref: candidateRef, mode: "full" });
  assert.equal(parent.result.total_items, 119, "public seed must contain exactly 119 review blocks");
  reviewer.setContext(author.context());
  let reviewerSession = await reviewer.openSession(candidateRef);
  async function finishReview(started, parentEvidence = null) {
    let status = started;
    const verdicts = new Map(), sourceDigests = new Map();
    while (status.next_item_index !== null) {
      reportProgress(onProgress, { event: "review-item", itemIndex: status.next_item_index, totalItems: started.total_items });
      const item = exactPortions(await reviewer.sessionCall(reviewerSession, "product_review_get", {
        review_ref: status.review_ref, item_index: status.next_item_index, representation: "explicit-v1" }));
      const explicit = JSON.parse(item.text);
      assert.equal(explicit.source_content.source_content_sha256, hash(explicit.source_content.text));
      sourceDigests.set(item.item_key, explicit.source_content.source_content_sha256);
      const value = { item_key: item.item_key, verdict: "covered", explanation: "Simulated independent current block judgment.",
        counterexample: null, evidence_refs: [], evidence_sources: [], read_receipt: item.read_receipt, inherited_from: null };
      await reviewer.sessionCall(reviewerSession, "product_review_record", { review_ref: status.review_ref, value });
      verdicts.set(value.item_key, value);
      const [next] = await reviewer.sessionCall(reviewerSession, "product_review_status", { review_ref: status.review_ref });
      status = next.result;
    }
    if (parentEvidence !== null) {
      for (let index = 0; index < 119; index += 1) {
        reportProgress(onProgress, { event: "review-item", itemIndex: index, totalItems: 119 });
        const item = exactPortions(await reviewer.sessionCall(reviewerSession, "product_review_get", {
          review_ref: status.review_ref, item_index: index, representation: "explicit-v1" }));
        const value = item.recorded_result;
        assert.equal(item.object_sha256, item.verdict_object_sha256);
        assert.equal(item.verdict_object_sha256, hash(`${canonical(value)}\n`));
        if (value.inherited_from === parent.result.review_ref) {
          assert.deepEqual(value, { ...parentEvidence.verdicts.get(item.item_key), inherited_from: parent.result.review_ref });
          assert.equal(JSON.parse(item.text).source_content.source_content_sha256, parentEvidence.sourceDigests.get(item.item_key));
        } else assert.deepEqual(value, verdicts.get(item.item_key));
        verdicts.set(item.item_key, value);
      }
    }
    const consistency = exactPortions(await reviewer.sessionCall(reviewerSession, "product_review_consistency_get", {
      review_ref: status.review_ref, representation: "explicit-v1" }));
    const body = JSON.parse(consistency.text);
    assert.equal(body.results.length, 119);
    for (const result of body.results) {
      assert.equal(result.object_sha256, result.verdict_object_sha256);
      assert.equal(result.verdict_object_sha256, hash(`${canonical(verdicts.get(result.item_key))}\n`));
      if (result.source_evidence) assert.equal(result.source_evidence.source_content.source_content_sha256, sourceDigests.get(result.item_key));
    }
    const incomplete = await reviewer.expectedError("product_review_complete", { context: reviewer.context(), review_ref: status.review_ref });
    assert.equal(incomplete.error.code, "PREREQUISITE_REQUIRED", "fresh consistency remains mandatory");
    const [consistent] = await reviewer.sessionCall(reviewerSession, "product_review_consistency_record", { review_ref: status.review_ref,
      read_receipt: consistency.read_receipt, verdict: "covered", explanation: "Simulated fresh whole-artifact consistency.", counterexample: null });
    const [complete] = await reviewer.sessionCall(reviewerSession, "product_review_complete", { review_ref: status.review_ref });
    assert.equal(complete.result.coverage_status, "reviewed");
    return { consistency, body, context: consistent.context, verdicts, sourceDigests };
  }
  const parentEvidence = await finishReview(parent.result);
  const parentPath = join(root, "products", candidateRef.product_id, "drafts", candidateRef.candidate_id, "reviews", `${parent.result.review_ref}.yaml`);
  const parentBytes = await readFile(parentPath);
  // An independent reviewer changed candidate evidence; explicitly reopen the author's selected snapshot.
  const reopened = await author.call("product_open", { workspace: workspaces[0] });
  const refreshed = await author.call("product_artifact_draft", { artifact: "idea", upstream_pins: [] });
  assert.deepEqual(refreshed.candidate_ref, candidateRef);
  const nextEdit = await author.call("product_document_begin_edit", { artifact: "idea", document_id: document.id });
  await writeFile(nextEdit.editable_path, withDiagram.replace("A-->B", "A-->>B"));
  const changed = await author.call("product_document_inspect_edits", { candidate_ref: candidateRef, document_id: document.id });
  await author.call("product_document_accept_edits", { candidate_ref: candidateRef, document_id: document.id,
    observed_digest: changed.source_version, instruction_ref: instruction.result.decision_ref });
  authorSession = await author.openSession(candidateRef);
  const [recheck] = await author.sessionCall(authorSession, "product_review_start", { candidate_ref: candidateRef, mode: "recheck", parent_review_ref: parent.result.review_ref });
  assert.equal(recheck.result.total_items, 119);
  assert.equal(recheck.result.recheck?.inherited_items, 118, "localized recheck must inherit exactly 118 parent verdicts");
  assert.equal(recheck.result.recheck?.pending_items, 1);
  reviewer.setContext(author.context());
  reviewerSession = await reviewer.openSession(candidateRef);
  const current = await finishReview(recheck.result, parentEvidence);
  assert.notEqual(current.consistency.read_receipt, parentEvidence.consistency.read_receipt);
  assert.deepEqual(await readFile(parentPath), parentBytes);
  assert.equal(current.body.results.filter((result) => result.inherited_from === parent.result.review_ref).length, 118);
  assert.equal(current.body.results.filter((result) => result.inherited_from === null).length, 1);
  await author.call("product_open", { workspace: workspaces[0] });
  const finalSelected = await author.call("product_artifact_draft", { artifact: "idea", upstream_pins: [] });
  assert.deepEqual(finalSelected.candidate_ref, candidateRef);
  authorSession = await author.openSession(candidateRef);
  const [checked] = await author.sessionCall(authorSession, "product_candidate_check", { candidate_ref: candidateRef });
  assert.equal(checked.result.status, "pass");
  return { sessionActors: 2, draftKinds, exactDraftReads: 2, restartDeliveryExact, unknownResultRecovered: recovered.replayed, recoveryEffects, parentItems: parent.result.total_items,
    inheritedItems: recheck.result.recheck.inherited_items, freshItems: recheck.result.recheck.pending_items,
    freshConsistency: current.consistency.read_receipt !== parentEvidence.consistency.read_receipt, parentUnchanged: true,
    authorReopened: reopened.product_id === candidateRef.product_id, effectSnapshotSha256: hash(JSON.stringify(await effectSnapshot(root))),
    runtimeBuildId: runtime.build_id, runtimeContractDigest: runtime.contract_digest,
    executedEntrypoint: author.launches()[0].spawnargs[1], launches: [...author.launches(), ...reviewer.launches()] };
}

export async function runProductWorkflowQualification(t, options = {}) {
  t.signal?.throwIfAborted();
  t = createQualificationScope(t);
  const directory = await createTemporaryDirectory(t, "eaw-product-e2e-");
  const root = join(directory, "product-data");
  const workspaces = [join(directory, "workspace-a-雪😀"), join(directory, "workspace-b-é")];
  await Promise.all(workspaces.map(initializeRepository));
  const calls = [];
  const author = actor(t, { name: "product-author-qualification", root, calls, entrypoint: options.entrypoint, onProgress: options.onProgress });
  const reviewer = actor(t, { name: "product-reviewer-qualification", root, calls, entrypoint: options.entrypoint, onProgress: options.onProgress });
  if (options.reliability === true) {
    const reliability = await reliabilityQualification(t, { author, reviewer, root, workspaces, directory, entrypoint: options.entrypoint ?? server, onProgress: options.onProgress });
    reliability.sessionActors = new Set(calls.filter((call) => call.tool === "product_session_open").map((call) => call.actor)).size;
    return { reliability, calls };
  }

  const initialized = await author.call("product_initialize", {
    workspace: workspaces[0],
    name: fixture.product.name,
    known_idea: fixture.product.knownIdea,
  });
  await reviewer.call("product_bind_workspace", {
    workspace: workspaces[1],
    product_id: initialized.product_id,
    binding_answer: "Bind the second synthetic workspace to the selected product.",
    source: "fixture-customer:binding",
  });

  const ideaDraft = await author.call("product_artifact_draft", {
    artifact: "idea",
    upstream_pins: [],
  });
  const ideaRef = ideaDraft.candidate_ref;
  await confirmScope(author, ideaRef);
  const ideaSubject = await semanticSubject(author, "idea", ideaRef);
  await author.call("idea_define_problem", {
    candidate_ref: ideaRef,
    subject: ideaSubject,
    value: {
      title: "Lost product intent",
      provenance: [],
      applicability: {
        state: "current",
        stage_refs: [],
        global: true,
        reason: "This qualification technology is already selected.",
      },
      problem: "Independent delivery workspaces can lose settled product intent.",
      actors: ["Product author", "Implementing engineer"],
      workarounds: ["Repeat interviews"],
      value: "Retrieve exact versioned product intent in every workspace.",
      success_signals: ["Two workspaces select the same product revision."],
      constraints: ["Do not scan or enroll unrelated workspaces."],
      non_goals: ["Dispatch remote CI."],
      assumptions: ["The local Git workspaces remain available."],
      risks: ["Stale pins could select outdated intent."],
      open_questions: [],
    },
  });
  let recovery = await reviewAndActivate({
    author,
    reviewer,
    candidateRef: ideaRef,
    recovery: options.restartReviewer === true,
  });

  const ideaPins = await collectPins(author, "product-definition", "idea");
  const sourceReads = (await Promise.all(ideaPins.map((pin) => readPinExactly(author, pin)))).filter(Boolean);
  const prdDraft = await draftStage(author, "prd", ideaPins);
  const prdRef = prdDraft.candidateRef;
  const actorElement = await author.call("prd_define_actor", {
    candidate_ref: prdRef,
    subject: prdDraft.subject,
    value: {
      title: "Product author",
      provenance: [],
      applicability: applicability(),
      role: "Maintains durable product intent.",
      needs: ["Retrieve exact accepted product context."],
      constraints: ["Never infer user consent."],
    },
  });
  const goalElement = await author.call("prd_define_goal", {
    candidate_ref: prdRef,
    subject: prdDraft.subject,
    value: {
      title: "Portable product context",
      provenance: [],
      applicability: applicability(),
      outcome: "Every bound workspace retrieves the same accepted product meaning.",
      measurement: "Compare selected source versions and exact content digests.",
      baseline: null,
      target: "Two independent workspaces agree.",
    },
  });
  if (options.remediation === true) {
    const decision = await author.call("product_record_instruction", { candidate_ref: prdRef,
      text: "Accept portable product context as the product-wide architecture justification.", source: "fixture:prd-decision",
      related_refs: [], affected_refs: [goalElement.changed_refs[0]] });
    await author.call("prd_define_goal", { candidate_ref: prdRef, subject: prdDraft.subject, element_ref: goalElement.changed_refs[0],
      value: { title: "Portable product context", provenance: [decision.decision_ref], applicability: applicability(),
        outcome: "Every bound workspace retrieves the same accepted product meaning.", measurement: "Compare selected source versions and exact content digests.",
        baseline: null, target: "Two independent workspaces agree." } });
  }
  await reviewAndActivate({ author, reviewer, candidateRef: prdRef, recovery: false });

  const prdPins = await collectPins(author, "technical-design", "prd", options.remediation === true);
  const selectedPrdGeneration = JSON.parse(Buffer.from(author.context(), "base64url").toString("utf8")).target_revision;
  assert.equal(
    prdPins.every((pin) => pin.generation === selectedPrdGeneration),
    true,
    `PRD pins must use the selected generation: ${JSON.stringify(prdPins.map((pin) => pin.generation))}`,
  );
  assert.equal(
    prdPins.some((pin) => pin.element_ids.includes(goalElement.changed_refs[0].element_id)),
    true,
    "Technical Design selection must address the PRD goal used as justification.",
  );
  sourceReads.push(...(await Promise.all(prdPins.map((pin) => readPinExactly(author, pin)))).filter(Boolean));
  const technicalDraft = await draftStage(author, "technical-design", prdPins);
  const technicalRef = technicalDraft.candidateRef;
  const beforeRoadmap = options.remediation === true ? await author.call("product_document_list", { artifact: "roadmap", limit: 50 }) : null;
  if (beforeRoadmap !== null) assert.equal(beforeRoadmap.items.length, 0, "accepted architecture must not require a Roadmap member");
  const technicalElement = await author.call("technical_define_technology", {
    candidate_ref: technicalRef,
    subject: technicalDraft.subject,
    value: {
      title: "Local stdio MCP",
      provenance: [],
      applicability: options.remediation === true ? applicability() : {
        state: "current",
        stage_refs: [],
        global: true,
        reason: "The local stdio MCP is the current implementation boundary.",
      },
      choice: "A local TypeScript MCP server over stdio.",
      alternatives: ["Project-specific scripts"],
      rationale: "The shared server provides deterministic versioned operations.",
      evidence_refs: [],
      prd_refs: [goalElement.changed_refs[0]],
      revisit_when: "The host no longer supports local stdio MCP servers.",
    },
  });
  let acceptedTargetReadBack = false;
  if (options.remediation === true) {
    // Observe the isolated public writer's persisted metadata; no test shortcut authors or migrates it.
    const candidate = JSON.parse(await readFile(join(root, "products", technicalRef.product_id, "drafts", technicalRef.candidate_id, "candidate.yaml"), "utf8"));
    const registry = JSON.parse(await readFile(join(root, "products", technicalRef.product_id, "objects", `${candidate.registry.object_sha256}.yaml`), "utf8"));
    const saved = registry.element_metadata.find((metadata) => metadata.ref.element_id === technicalElement.changed_refs[0].element_id);
    assert.deepEqual(saved.applicability, applicability());
    acceptedTargetReadBack = saved.applicability.state === "accepted_target" && saved.applicability.global && saved.applicability.stage_refs.length === 0;
  }
  await reviewAndActivate({ author, reviewer, candidateRef: technicalRef, recovery: false });

  const roadmapPins = uniquePins([
    ...await collectPins(author, "product-roadmap", "prd"),
    ...await collectPins(author, "product-roadmap", "technical-design"),
  ]);
  sourceReads.push(...(await Promise.all(roadmapPins.map((pin) => readPinExactly(author, pin)))).filter(Boolean));
  const remediation = options.remediation === true ? {
    acceptedTargetBeforeRoadmap: beforeRoadmap.items.length === 0 && technicalElement.changed_refs.length === 1,
    emptyDecisionPins: prdPins.filter((pin) => pin.source_kind === "decision" && pin.element_ids.length === 0).length,
    acceptedTargetReadBack,
  } : undefined;
  const roadmapDraft = await draftStage(author, "roadmap", roadmapPins);
  const roadmapRef = roadmapDraft.candidateRef;
  const stage = await author.call("roadmap_define_stage", {
    candidate_ref: roadmapRef,
    subject: roadmapDraft.subject,
    value: {
      title: "MVP",
      provenance: [],
      applicability: {
        state: "current",
        stage_refs: [],
        global: true,
        reason: "The MVP stage is the current qualification horizon.",
      },
      outcome: "Two independent tasks preserve exact product context.",
      verification: "Run the local cross-workspace qualification.",
      scope: ["Two task specifications"],
      exclusions: ["Remote CI dispatch"],
      entry: ["PRD and Technical Design are ready."],
      exit: ["Both task identities are reserved independently."],
      risks: ["A stale task pin could select the wrong generation."],
      position: 0,
    },
  });
  const stageRef = stage.changed_refs[0];
  const taskValues = [
    ["Implement portable selection", "Preserve exact product source pins."],
    ["Verify independent recovery", "Recover one lost response without duplicate effects."],
  ];
  if (options.retirement) {
    for (let index = 3; index <= 29; index += 1) taskValues.push([`Existing task ${index}`, `Own bounded delivery outcome ${index}.`]);
  }
  const taskDefinition = (title, outcome) => ({
        title,
        provenance: [],
        applicability: applicability([stageRef]),
        outcome,
        kind: "technical",
        stage_ref: stageRef,
        epic_ref: null,
        story_ref: null,
        upstream_refs: [
          actorElement.changed_refs[0],
          goalElement.changed_refs[0],
          technicalElement.changed_refs[0],
        ],
        scope: [outcome],
        non_goals: ["Change global client configuration."],
        acceptance: ["Focused qualification passes with exact evidence."],
      });
  const taskRefs = [];
  for (const [title, outcome] of taskValues) {
    const task = await author.call("roadmap_define_task", {
      candidate_ref: roadmapRef, subject: roadmapDraft.subject, value: taskDefinition(title, outcome),
    });
    taskRefs.push(task.changed_refs[0]);
  }
  if (options.retirement) {
    for (const [consumer, prerequisite] of [[29, 1], [2, 29], [5, 29], [2, 1], [5, 1]]) {
      await author.call("roadmap_link_dependency", { candidate_ref: roadmapRef,
        task_ref: taskRefs[consumer - 1], requires_task_ref: taskRefs[prerequisite - 1] });
    }
  }
  await reviewAndActivate({ author, reviewer, candidateRef: roadmapRef, recovery: false });
  const readyRoadmapPins = await collectPins(author, "review", "roadmap");
  sourceReads.push(...(await Promise.all(readyRoadmapPins.map((pin) => readPinExactly(author, pin)))).filter(Boolean));


  if (options.retirement) {
    const originalContext = author.context();
    const base = JSON.parse(Buffer.from(originalContext, "base64url").toString("utf8")).target_revision;
    const historical = JSON.parse(await readFile(join(root, "products", initialized.product_id, "generations", `${base}.yaml`), "utf8"));
    const headPath = join(root, "products", initialized.product_id, "head.yaml");
    const candidate = (await author.call("product_amendment_prepare", { artifact: "roadmap", base_generation: base,
      intent_text: "Retire duplicate TASK-0029 and distribute its responsibilities to existing tasks.",
      source: "fixture-customer:exclude-and-distribute" })).candidate_ref;
    const answer = await author.call("product_record_instruction", { candidate_ref: candidate,
      text: "Exclude and distribute TASK-0029: TASK-0001 audits inherited template mechanisms; TASK-0003 owns shared HTTP/MCP/jobs integration rules; domain requirements remain with their tasks.",
      source: "fixture-customer:explicit-exclude-and-distribute", related_refs: [],
      affected_refs: [taskRefs[0], taskRefs[1], taskRefs[2], taskRefs[4], taskRefs[28]],
    });
    const args = { candidate_ref: candidate, task_ref: taskRefs[28], redistributed_to: [taskRefs[0], taskRefs[2]],
      answer_ref: answer.decision_ref, reason: "Duplicate responsibilities are now owned by existing template-audit and shared-integration tasks." };
    await assert.rejects(author.call("roadmap_retire_task", args), /CONFLICT/u);
    for (const [index, title, outcome] of [
      [0, "Audit inherited template mechanisms", "Verify the existing forms, services, errors and transactions before extending them."],
      [2, "Define shared integration rules", "Define HTTP/MCP/jobs integration through existing forms/services/errors/transactions."],
    ]) {
      await author.call("roadmap_define_task", { candidate_ref: candidate, subject: roadmapDraft.subject,
        element_ref: taskRefs[index], value: { ...taskDefinition(title, outcome), provenance: [answer.decision_ref] } });
    }
    for (const index of [1, 4]) {
      await author.call("roadmap_unlink_dependency", { candidate_ref: candidate, task_ref: taskRefs[index],
        requires_task_ref: taskRefs[28], answer_ref: answer.decision_ref,
        reason: "The existing template prerequisite remains; duplicate TASK-0029 no longer blocks this domain task." });
      await author.call("roadmap_link_dependency", { candidate_ref: candidate, task_ref: taskRefs[index], requires_task_ref: taskRefs[2] });
    }
    const retired = await author.call("roadmap_retire_task", args);
    const draftCheck = await author.call("product_candidate_check", { candidate_ref: candidate });
    assert.equal(draftCheck.status, "fail");
    assert.ok(draftCheck.issues.some((issue) => issue.code === "REVIEW_REQUIRED"));
    assert.equal(JSON.parse(await readFile(headPath, "utf8")).generation, base);
    const oldPath = join(root, "products", initialized.product_id, "generations", `${base}.yaml`);
    const oldBytes = await readFile(oldPath);
    await reviewAndActivate({ author, reviewer, candidateRef: candidate, recovery: false });
    const generation = JSON.parse(await readFile(headPath, "utf8")).generation;
    assert.notEqual(generation, base);
    assert.deepEqual(await readFile(oldPath), oldBytes);
    const published = JSON.parse(await readFile(join(root, "products", initialized.product_id, "generations", `${generation}.yaml`), "utf8"));
    assert.equal(published.relations.some((edge) => edge.from.element_id === "TASK-0029" || edge.to.element_id === "TASK-0029"), false);
    for (const task of ["TASK-0002", "TASK-0005"]) {
      for (const prerequisite of ["TASK-0001", "TASK-0003"]) {
        assert.equal(published.relations.filter((edge) => edge.kind === "depends_on" && edge.from.element_id === task && edge.to.element_id === prerequisite).length, 1);
      }
    }
    assert.equal(historical.relations.filter((edge) => edge.kind === "depends_on" && edge.to.element_id === "TASK-0029").length, 2);
    await author.call("product_open", { workspace: workspaces[0] });
    await assert.rejects(author.call("task_specification_reserve", { task_id: "TASK-0029", specification_slug: "retired-task" }), /NOT_FOUND/u);
    const retirement = { taskId: retired.task_id, generation, previousGeneration: base, status: "pass", review: "synthetic protocol evidence only" };
    return { processes: 2, workspaces, productRoot: root, retirement, calls, sourceReads, persistedBytes: await directoryBytes(root) };
  }

  const compatibleBase = JSON.parse(Buffer.from(author.context(), "base64url").toString("utf8")).target_revision;
  const compatible = await author.call("product_amendment_prepare", {
    artifact: "roadmap",
    base_generation: compatibleBase,
    intent_text: "Clarify qualification wording without changing task identity or interfaces.",
    source: "fixture-customer:compatible-amendment",
  });
  const compatibleImpact = await author.call("product_amendment_impact", {
    candidate_ref: compatible.candidate_ref,
    limit: 20,
  });
  await reviewAndActivate({ author, reviewer, candidateRef: compatible.candidate_ref, recovery: false });

  await author.call("product_open", { workspace: workspaces[0] });
  const firstReservation = await author.call("task_specification_reserve", {
    task_id: fixture.taskSpecifications[0].taskId,
    specification_slug: fixture.taskSpecifications[0].slug,
  });
  await reviewer.call("product_open", { workspace: workspaces[1] });
  const secondReservation = await reviewer.call("task_specification_reserve", {
    task_id: fixture.taskSpecifications[1].taskId,
    specification_slug: fixture.taskSpecifications[1].slug,
  });
  await createTaskSpecification({
    author,
    reviewer,
    workspace: workspaces[0],
    slug: fixture.taskSpecifications[0].slug,
    requirementId: fixture.taskSpecifications[0].requirementId,
  });
  await createTaskSpecification({
    author: reviewer,
    reviewer: author,
    workspace: workspaces[1],
    slug: fixture.taskSpecifications[1].slug,
    requirementId: fixture.taskSpecifications[1].requirementId,
  });

  await author.call("product_open", { workspace: workspaces[0] });
  const unsafeBase = JSON.parse(Buffer.from(author.context(), "base64url").toString("utf8")).target_revision;
  const unsafe = await author.call("product_amendment_prepare", {
    artifact: "roadmap",
    base_generation: unsafeBase,
    intent_text: "Record a revoked authorization rule before changing affected delivery work.",
    source: "fixture-customer:safety-amendment",
  });
  const observation = await author.call("product_record_observation", {
    candidate_ref: unsafe.candidate_ref,
    finding: "A revoked authorization rule makes the first task unsafe to continue.",
    source: "fixture-security-review:safety-amendment",
    affected_refs: [taskRefs[0]],
  });
  await reviewAndActivate({ author, reviewer, candidateRef: unsafe.candidate_ref, recovery: false });
  await author.call("product_open", { workspace: workspaces[0] });
  const blocked = await author.call("product_safety_block", {
    affected_refs: [taskRefs[0]],
    affected_task_ids: [taskRefs[0].element_id],
    reason: "security",
    explanation: "The saved authorization finding requires explicit disposition.",
    source_ref: observation.decision_ref,
  });
  const blockedCheck = await author.call("task_inputs_check", {
    task_id: taskRefs[0].element_id,
    packet_id: "P01",
  });

  const readyArtifacts = [...new Set(sourceReads.map((entry) => entry.artifact))].sort();
  return {
    processes: 2,
    workspaces,
    productRoot: root,
    readyArtifacts,
    taskSpecifications: [
      { slug: fixture.taskSpecifications[0].slug, specificationId: firstReservation.specification_id },
      { slug: fixture.taskSpecifications[1].slug, specificationId: secondReservation.specification_id },
    ],
    compatibleAmendment: {
      status: compatibleImpact.complete ? "pass" : "incomplete",
      items: compatibleImpact.items,
    },
    safetyBlock: {
      status: blockedCheck.status === "blocked" || blockedCheck.issues?.some((issue) => issue.code === "SAFETY_BLOCK")
        ? "blocked"
        : blockedCheck.status,
      operationRef: blocked.operation_ref,
    },
    calls,
    sourceReads,
    recovery,
    ...(remediation ? { remediation } : {}),
    persistedBytes: await directoryBytes(root),
  };
}

// One test-fixture owner: close newer clients before older directories, attempting all disposers.
export function createQualificationScope(t) {
  t.checkActive?.();
  t.signal?.throwIfAborted();
  const disposers = [];
  let cleanup;
  let disposed = false;
  t.after(() => {
    disposed = true;
    cleanup ??= (async () => {
      const errors = [], failures = [];
      for (const [index, { dispose, identity }] of disposers.reverse().entries()) {
        try { await dispose(); }
        catch (error) {
          errors.push(error);
          if (failures.length < 16) failures.push({ identity, error, index });
        }
      }
      for (const { identity, error, index } of failures) {
        reportCleanupFailure(t, identity, error, index, errors.length > failures.length);
      }
      if (errors.length) throw new AggregateError(errors, "qualification cleanup failed");
    })();
    return cleanup;
  }, { resource: "product-workflow", boundary: "scope-disposer" });
  return {
    signal: t.signal,
    checkActive() {
      t.checkActive?.();
      t.signal?.throwIfAborted();
      if (disposed) throw new Error("qualification fixture is already disposed");
    },
    diagnostic: (message) => t.diagnostic?.(message),
    after(dispose, identity) {
      if (disposed) throw new Error("qualification fixture already disposed");
      disposers.push({ dispose, identity });
    },
  };
}
