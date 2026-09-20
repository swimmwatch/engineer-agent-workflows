import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { performance } from "node:perf_hooks";
import { promisify } from "node:util";

import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

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

function actor(t, { name, root, calls }) {
  let client;
  let context;

  async function start() {
    if (client) return;
    client = new Client({ name, version: "1" });
    await client.connect(new StdioClientTransport({
      command: process.execPath,
      args: [server],
      env: processEnvironment(root),
      stderr: "pipe",
    }));
  }

  async function close() {
    const active = client;
    client = undefined;
    if (active) await active.close();
  }

  async function request(tool, arguments_, updateContext) {
    await start();
    const started = performance.now();
    const response = await client.callTool({ name: tool, arguments: arguments_ });
    const elapsedMs = performance.now() - started;
    const responseBytes = Buffer.byteLength(JSON.stringify(response));
    calls.push({ actor: name, tool, elapsedMs, responseBytes, isError: response.isError === true });
    assert.notEqual(response.isError, true, JSON.stringify(response.structuredContent));
    if (updateContext && typeof response.structuredContent.context === "string") {
      context = response.structuredContent.context;
    }
    return response.structuredContent;
  }

  t.after(close);
  return {
    context: () => context,
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

async function collectPins(author, purpose, artifact) {
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
    .filter((pin) => pin.artifact === artifact && pin.element_ids.length > 0);
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

export async function runProductWorkflowQualification(t, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), "eaw-product-e2e-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const root = join(directory, "product-data");
  const workspaces = [join(directory, "workspace-a"), join(directory, "workspace-b")];
  await Promise.all(workspaces.map(initializeRepository));
  const calls = [];
  const author = actor(t, { name: "product-author-qualification", root, calls });
  const reviewer = actor(t, { name: "product-reviewer-qualification", root, calls });

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
  await reviewAndActivate({ author, reviewer, candidateRef: prdRef, recovery: false });

  const prdPins = await collectPins(author, "technical-design", "prd");
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
  const technicalElement = await author.call("technical_define_technology", {
    candidate_ref: technicalRef,
    subject: technicalDraft.subject,
    value: {
      title: "Local stdio MCP",
      provenance: [],
      applicability: {
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
  await reviewAndActivate({ author, reviewer, candidateRef: technicalRef, recovery: false });

  const roadmapPins = uniquePins([
    ...await collectPins(author, "product-roadmap", "prd"),
    ...await collectPins(author, "product-roadmap", "technical-design"),
  ]);
  sourceReads.push(...(await Promise.all(roadmapPins.map((pin) => readPinExactly(author, pin)))).filter(Boolean));
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
  const taskRefs = [];
  for (const [title, outcome] of taskValues) {
    const task = await author.call("roadmap_define_task", {
      candidate_ref: roadmapRef,
      subject: roadmapDraft.subject,
      value: {
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
      },
    });
    taskRefs.push(task.changed_refs[0]);
  }
  await reviewAndActivate({ author, reviewer, candidateRef: roadmapRef, recovery: false });
  const readyRoadmapPins = await collectPins(author, "review", "roadmap");
  sourceReads.push(...(await Promise.all(readyRoadmapPins.map((pin) => readPinExactly(author, pin)))).filter(Boolean));

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
    persistedBytes: await directoryBytes(root),
  };
}
