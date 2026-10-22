import assert from "node:assert/strict";
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { readCatalog } from "../scripts/lib/catalog.mjs";
import {
  layoutPaths as productWorkflowLayoutPaths,
  verifyProductWorkflowBundle,
} from "../shared/scripts/verify-product-workflow.mjs";
import { initializeProduct } from "../packages/engineer-agent-workflow-mcp/dist/product/bindings.js";
import {
  answerProductQuestion,
  confirmProductScope,
  draftProductArtifact,
  prepareProductQuestion,
  proposeProductScope,
  recordProductNoAnswer,
  resumeProductInterview,
} from "../packages/engineer-agent-workflow-mcp/dist/product/interview.js";
import { projectRoot } from "./lib/fixtures.mjs";

const PROFILE_IDS = Object.freeze([
  "core",
  "backend",
  "data",
  "security",
  "ui",
  "events",
  "operations",
  "cross-surface",
]);

const read = relativePath => readFile(path.join(projectRoot, relativePath), "utf8");

const BUNDLE_FAILURE =
  "Install or update the complete matching engineer-agent-workflows bundle " +
  "for {{HOST_DISPLAY_NAME}} using the documented pinned global command, " +
  "then retry.";

async function productBundle(t) {
  const root = await mkdtemp(path.join(tmpdir(), "product-authoring-bundle-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const skillsRoot = path.join(root, "skills");
  await Promise.all(
    ["idea-refine", "product-definition"].map(skill =>
      cp(path.join(projectRoot, "skills", skill), path.join(skillsRoot, skill), {
        recursive: true,
      }),
    ),
  );
  return {
    idea: path.join(skillsRoot, "idea-refine"),
    definition: path.join(skillsRoot, "product-definition"),
  };
}

test("P14 registers explicit Idea and Product Definition ownership", async () => {
  const catalog = await readCatalog(projectRoot);
  const idea = catalog.skills.find(skill => skill.name === "idea-refine");
  const definition = catalog.skills.find(skill => skill.name === "product-definition");

  assert.ok(idea);
  assert.equal(idea.classification, "standalone");
  assert.deepEqual(idea.dependencies, []);
  assert.equal(idea.policies.codex.allowImplicitInvocation, false);
  assert.equal(idea.policies.claude.disableModelInvocation, true);

  assert.ok(definition);
  assert.equal(definition.classification, "bundle-required");
  assert.deepEqual(definition.dependencies, ["idea-refine"]);
  assert.equal(definition.policies.codex.allowImplicitInvocation, false);
  assert.equal(definition.policies.claude.disableModelInvocation, true);
});

test("P14 skills preserve the ready chain and concrete MCP workflow", async () => {
  const [idea, definition, protocol, access] = await Promise.all([
    read("skills/idea-refine/SKILL.md"),
    read("skills/product-definition/SKILL.md"),
    read("shared/references/product-workflow.md"),
    read("shared/references/workflow-state-access.md"),
  ]);

  assert.match(idea, /Standalone mode/u);
  assert.match(idea, /Durable product mode/u);
  assert.match(idea, /product_initialize/u);
  assert.match(idea, /product_interview_resume/u);
  assert.match(idea, /stop before Product Definition/iu);
  assert.match(idea, /never invoke it\s+automatically/iu);

  assert.match(definition, /ready Idea/iu);
  assert.match(definition, /product_artifact_draft/u);
  assert.match(definition, /artifact[^\n]+prd/iu);
  assert.match(definition, /stop before Technical Design/iu);
  assert.match(definition, /never invoke it\s+automatically/iu);

  for (const document of [idea, definition, protocol]) {
    assert.doesNotMatch(document, /mcp__engineer_agent_workflow/u);
    if (document === protocol) {
      assert.match(protocol, /workflow-state-access\.md/iu);
      assert.match(access, /returned context/iu);
    } else assert.match(document, /returned context/iu);
    assert.match(document, /product_candidate_check/u);
    assert.match(document, /product_review_start/u);
    assert.match(document, /independent reviewer/iu);
  }
});

test("P14 routes only confirmed product profiles", async () => {
  const [idea, definition] = await Promise.all([
    read("skills/idea-refine/SKILL.md"),
    read("skills/product-definition/SKILL.md"),
  ]);

  for (const document of [idea, definition]) {
    assert.match(document, /Do not read any profile reference before[\s\S]+product_scope_confirm/iu);
    assert.match(document, /read only[\s\S]+active profile/iu);
  }

  for (const profile of PROFILE_IDS) {
    const relativePath = `skills/idea-refine/references/product-profiles/${profile}.md`;
    const content = await read(relativePath);
    assert.match(content, new RegExp(`^# ${profile.replace("-", "[- ]")}`, "iu"));
    assert.match(idea, new RegExp(`references/product-profiles/${profile}\\.md`, "u"));
    assert.match(definition, new RegExp(`idea-refine/references/product-profiles/${profile}\\.md`, "u"));
  }

  assert.match(idea, /product_question_no_answer/u);
  assert.match(definition, /product_question_no_answer/u);
  assert.match(idea, /reuse[\s\S]{0,80}explicit answer/iu);
  assert.match(definition, /reuse[\s\S]{0,80}explicit answer/iu);
});

test("P14 generated bundles remain host-isolated and self-contained", async () => {
  const roots = {
    codex: "plugins/codex/engineer-agent-workflows",
    claude: "plugins/claude-code/engineer-agent-workflows",
  };

  for (const [host, root] of Object.entries(roots)) {
    for (const skill of ["idea-refine", "product-definition"]) {
      const document = await read(`${root}/skills/${skill}/SKILL.md`);
      assert.doesNotMatch(document, /\{\{HOST_/u);
      assert.match(document, host === "codex" ? /request_user_input/u : /AskUserQuestion/u);
      assert.doesNotMatch(document, host === "codex" ? /AskUserQuestion/u : /request_user_input/u);
      await access(path.join(projectRoot, root, "skills", skill, "shared", "references", "product-workflow.md"));
    }
    await verifyProductWorkflowBundle(
      path.join(projectRoot, root, "skills", "product-definition"),
    );
  }

  await access(path.join(projectRoot, roots.codex, "skills", "product-definition", "agents", "openai.yaml"));
  await assert.rejects(
    access(path.join(projectRoot, roots.claude, "skills", "product-definition", "agents", "openai.yaml")),
    error => error?.code === "ENOENT",
  );
});

test("P14 product definition fails closed for missing or mismatched Idea bundle", async t => {
  const complete = await productBundle(t);
  const verified = await verifyProductWorkflowBundle(complete.definition);
  assert.equal(verified.callerSkill, "product-definition");
  assert.equal(verified.dependencySkill, "idea-refine");

  const missing = await productBundle(t);
  await rm(missing.idea, { recursive: true, force: true });
  await assert.rejects(
    verifyProductWorkflowBundle(missing.definition),
    error => error?.code === "E_PRODUCT_BUNDLE_LAYOUT",
  );

  const mismatched = await productBundle(t);
  await writeFile(
    path.join(mismatched.idea, "references", "product-profiles", "core.md"),
    "# Incompatible profile\n",
  );
  await assert.rejects(
    verifyProductWorkflowBundle(mismatched.definition),
    error => error?.code === "E_PRODUCT_BUNDLE_MISMATCH",
  );

  const document = await read("skills/product-definition/SKILL.md");
  const normalized = document.replace(/\s+/gu, " ");
  assert.equal(normalized.split(BUNDLE_FAILURE).length - 1, 1);
  assert.match(document, /verify-product-workflow\.mjs[\s\S]+product_open/iu);
});

test("P14 product bundle layout remains portable", () => {
  const posix = productWorkflowLayoutPaths(
    "/opt/agents/skills/product-definition",
    path.posix,
  );
  assert.equal(posix.dependencySkill, "/opt/agents/skills/idea-refine");

  const windows = productWorkflowLayoutPaths(
    "C:\\Users\\user\\.agents\\skills\\product-definition",
    path.win32,
  );
  assert.equal(
    windows.dependencySkill,
    "C:\\Users\\user\\.agents\\skills\\idea-refine",
  );
});

test("P14 Q31/Q32 execute durable native-answer and no-answer resume flow", async t => {
  const directory = await mkdtemp(path.join(tmpdir(), "product-authoring-flow-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const root = path.join(directory, "product-data");
  const workspace = path.join(directory, "workspace");
  await mkdir(workspace);

  const trace = [];
  let sequence = 0;
  const event = (type, details = {}) => {
    trace.push({ sequence: ++sequence, type, ...details });
  };
  const invoke = async (name, operation) => {
    event("mcp_call", { name });
    const outcome = await operation();
    event("mcp_result", {
      name,
      replayed: outcome.replayed,
      operation_ref: outcome.operationRef,
    });
    return outcome;
  };

  const initialized = await invoke("product_initialize", () =>
    initializeProduct({
      root,
      workspace,
      name: "Fixture product",
      knownIdea: "Operators need a deterministic workflow.",
    }),
  );
  const drafted = await invoke("product_artifact_draft", () =>
    draftProductArtifact({
      root,
      context: initialized.context,
      artifact: "idea",
      upstreamPins: [],
    }),
  );
  const candidateRef = drafted.result.candidate_ref;
  const proposed = await invoke("product_scope_propose", () =>
    proposeProductScope({
      root,
      context: drafted.context,
      candidateRef,
      depth: "lite",
      profiles: [{ id: "core", reason: "Only product essentials." }],
      rationale: ["Known bounded problem."],
    }),
  );

  event("host_question", {
    tool: "request_user_input",
    question_ref: proposed.result.question_ref,
    outcome: "answered",
  });
  const answered = await invoke("product_question_answer", () =>
    answerProductQuestion({
      root,
      context: proposed.context,
      candidateRef,
      questionRef: proposed.result.question_ref,
      selectedIds: ["confirm"],
      text: "Confirm Lite core scope.",
      source: "fixture-customer:scope",
    }),
  );
  const confirmed = await invoke("product_scope_confirm", () =>
    confirmProductScope({
      root,
      context: answered.context,
      candidateRef,
      proposalRef: proposed.result.question_ref,
      answerRef: answered.result.decision_ref,
    }),
  );

  const profileRead = async profile => {
    assert.ok(
      trace.some(item => item.type === "mcp_result" && item.name === "product_scope_confirm"),
    );
    const bytes = await readFile(
      path.join(
        projectRoot,
        "skills",
        "idea-refine",
        "references",
        "product-profiles",
        `${profile}.md`,
      ),
    );
    event("profile_reference_read", { profile });
    return bytes;
  };
  assert.ok((await profileRead("core")).byteLength > 0);

  const prepared = await invoke("product_question_prepare", () =>
    prepareProductQuestion({
      root,
      context: confirmed.context,
      candidateRef,
      category: "actor",
      text: "Which operator group is primary?",
      options: [{ id: "operators", label: "Operators" }],
    }),
  );
  event("host_question", {
    tool: "request_user_input",
    question_ref: prepared.result.question_ref,
    outcome: "dismissed",
  });
  const unanswered = await invoke("product_question_no_answer", () =>
    recordProductNoAnswer({
      root,
      context: prepared.context,
      candidateRef,
      questionRef: prepared.result.question_ref,
      outcome: "dismissed",
    }),
  );

  const reopened = await invoke("product_initialize", () =>
    initializeProduct({
      root,
      workspace,
      name: "Fixture product",
      knownIdea: "Operators need a deterministic workflow.",
    }),
  );
  assert.equal(reopened.replayed, true);
  const selected = await invoke("product_artifact_draft", () =>
    draftProductArtifact({
      root,
      context: reopened.context,
      artifact: "idea",
      upstreamPins: [],
    }),
  );
  assert.equal(selected.replayed, true);
  const resumed = await invoke("product_interview_resume", () =>
    resumeProductInterview({
      root,
      context: selected.context,
      candidateRef,
    }),
  );

  assert.equal(resumed.result.state, "no_answer");
  assert.equal(resumed.result.last_outcome, "dismissed");
  assert.equal(resumed.result.question, "Which operator group is primary?");
  assert.deepEqual(
    trace.filter(item => item.type === "profile_reference_read").map(item => item.profile),
    ["core"],
  );
  assert.deepEqual(
    trace.filter(item => item.type === "host_question").map(item => item.outcome),
    ["answered", "dismissed"],
  );
  assert.equal(
    trace.some(
      item =>
        item.type === "mcp_call" &&
        ["product_artifact_draft:prd", "technical_design", "product_roadmap"].includes(item.name),
    ),
    false,
  );

  const candidate = JSON.parse(
    await readFile(
      path.join(
        root,
        "products",
        candidateRef.product_id,
        "drafts",
        candidateRef.candidate_id,
        "candidate.yaml",
      ),
      "utf8",
    ),
  );
  assert.equal(candidate.state, "draft");
  assert.deepEqual(candidate.scope.confirmed_answer, answered.result.decision_ref);
  assert.deepEqual(unanswered.result.decision_ref, resumed.result.question_ref);
});

const ARCHITECTURE_LENSES = {
  "missing-choice": /material technology choices[\s\S]*actual recorded answers/iu,
  "missing-diagram": /present[\s\S]*component diagram[\s\S]*responsibilities[\s\S]*boundaries[\s\S]*dependencies/iu,
  "missing-flow": /data flows/iu,
  "missing-state-owner": /databases[\s\S]*durable state owners[\s\S]*readers[\s\S]*writers/iu,
  "unverified-integration": /unverified integrations[\s\S]*assumptions[\s\S]*required validation/iu,
  "compact-na": /reasons for N\/A[\s\S]*do not invent infrastructure/iu,
};

// These checks qualify mandatory instructions, not actual model execution.
// The same requests are used by separate fresh-context host trials.
const architectureFixtures = JSON.parse(await read(
  "tests/fixtures/product-workflows/architecture-readiness.json",
));
for (const [host, skillPath] of Object.entries({
  canonical: "skills/technical-design/SKILL.md",
  codex: "plugins/codex/engineer-agent-workflows/skills/technical-design/SKILL.md",
  claude: "plugins/claude-code/engineer-agent-workflows/skills/technical-design/SKILL.md",
})) {
  test(`I09 ${host} owns readiness before creating or resuming a candidate`, async () => {
    const document = await read(skillPath);
    const draft = document.indexOf("`product_artifact_draft`");
    const upfront = document.slice(0, draft);
    assert.ok(draft > 0);
    assert.match(upfront, /new and resumed candidates/iu);
    assert.match(upfront, /never call `product_candidate_check` or `product_review_start`/iu);
    assert.match(upfront, /directly or through sessions/iu);
    assert.match(upfront, /diagnostic shortcut/iu);
    assert.match(upfront, /current architecture is visible[\s\S]*applicable material answers are actually recorded/iu);
    assert.match(upfront, /overrides[\s\S]*generic authoring check/iu);
    assert.match(upfront, /inspect saved evidence through readers first/iu);
    assert.match(upfront, /Present its component diagram and flows in an assistant message; source\/tool reads do not count/iu);
  });
  for (const scenario of architectureFixtures.cases) {
    test(`I09 ${host} mandatory checkpoint covers ${scenario.id} simulation`, async () => {
      assert.equal(architectureFixtures.classification, "SIMULATION_ONLY");
      assert.ok(scenario.request.length > 0);
      if (scenario.fixtureAnswer) assert.match(scenario.fixtureAnswer, /^SIMULATION ONLY:/u);
      const document = await read(skillPath);
      const step = document.match(/^8\. [^\n]+/mu)?.[0];
      assert.ok(step);
      const readiness = step.indexOf("`product_candidate_check`");
      const checkpoint = step.slice(0, readiness);
      assert.ok(readiness > 0);
      assert.match(checkpoint, /Before readiness checking or review/iu);
      assert.match(checkpoint, ARCHITECTURE_LENSES[scenario.id]);
      assert.match(checkpoint, /Hold readiness while[\s\S]*material choice[\s\S]*diagram\/flow[\s\S]*state owner[\s\S]*missing/iu);
      assert.match(checkpoint, /only then call/iu);
      assert.ok(step.indexOf("`product_review_start`") > readiness);
      assert.match(document, /independent reviewer[\s\S]*verdicts[\s\S]*completion/iu);
      if (host !== "canonical") {
        assert.match(document, host === "codex" ? /request_user_input/u : /AskUserQuestion/u);
        assert.doesNotMatch(document, host === "codex" ? /AskUserQuestion/u : /request_user_input/u);
      }
    });
  }
}

test("I09 technology detail retains evidence and proportionate architecture lenses", async () => {
  const detail = await read("skills/technical-design/references/technology-decisions.md");
  assert.match(detail, /Inventory existing constraints, accepted choices/iu);
  assert.match(detail, /alternatives, evidence, rationale, constraints and conditions for revisiting/iu);
  assert.match(detail, /component diagram/iu);
  assert.match(detail, /who reads[\s\S]*mutates/iu);
  assert.match(detail, /unverified integrations[\s\S]*validation/iu);
  assert.match(detail, /N\/A[\s\S]*reason/iu);
  assert.match(detail, /before[\s\S]*product_candidate_check[\s\S]*product_review_start/iu);
});
