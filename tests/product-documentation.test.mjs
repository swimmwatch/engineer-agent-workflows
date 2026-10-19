import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import Ajv from "ajv";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { workflowTools } from "../packages/engineer-agent-workflow-mcp/dist/server.js";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const guidePath = path.join(projectRoot, "docs", "product-workflows.md");
const schemaPath = path.join(
  projectRoot,
  "packages",
  "engineer-agent-workflow-mcp",
  "dist",
  "schemas",
  "product.schema.json",
);
const serverPath = path.join(
  projectRoot,
  "packages",
  "engineer-agent-workflow-mcp",
  "dist",
  "main.js",
);
const expectedExampleTools = [
  "product_candidate_record_get",
  "product_capabilities",
  "product_context_prepare",
  "product_document_list",
  "product_open",
  "product_review_consistency_get",
  "product_review_start",
  "product_review_start",
  "product_review_status",
  "product_session_call",
  "product_session_next",
  "product_session_open",
  "product_session_resume",
  "product_session_status",
  "task_inputs_check",
  "workflow_runtime_info",
];

async function repositoryFile(relativePath) {
  return readFile(path.join(projectRoot, relativePath), "utf8");
}

function toolExamples(markdown) {
  const pattern =
    /<!-- product-tool-example: ([a-z_]+) -->\s*```json\s*([\s\S]*?)\s*```/gu;
  return [...markdown.matchAll(pattern)].map((match) => ({
    tool: match[1],
    input: JSON.parse(match[2]),
  }));
}

test("Q39: product workflow guide is linked and distinguishes lifecycle boundaries", async () => {
  const [guide, rootReadme, mcpReadme, localDevelopment] = await Promise.all([
    readFile(guidePath, "utf8"),
    repositoryFile("README.md"),
    repositoryFile("packages/engineer-agent-workflow-mcp/README.md"),
    repositoryFile("docs/local-development.md"),
  ]);

  assert.match(rootReadme, /\]\(docs\/product-workflows\.md\)/u);
  assert.match(mcpReadme, /\]\(\.\.\/\.\.\/docs\/product-workflows\.md\)/u);
  assert.match(localDevelopment, /\]\(product-workflows\.md\)/u);

  for (const heading of [
    "## Choose the workflow",
    "## Storage and configuration",
    "## Artifact and version lifecycle",
    "## Review lifecycle",
    "## Task handoff and pins",
    "## Recovery and safety",
    "## Proof limits and compatibility",
    "## Operator checklist",
  ]) {
    assert.ok(guide.includes(heading), `missing guide heading: ${heading}`);
  }

  assert.match(guide, /EAW_PRODUCT_DATA_DIR/u);
  assert.match(guide, /Legacy specifications are not enrolled/u);
  assert.match(guide, /enhanced\s+full review/u);
  assert.match(guide, /protocol delivery[^.]*not semantic correctness/iu);
  const proofLimits = guide.split("## Proof limits and compatibility")[1];
  assert.ok(proofLimits, "missing qualification proof limits");
  assert.match(
    proofLimits,
    /https:\/\/github\.com\/swimmwatch\/engineer-agent-workflows\/actions\/runs\/38942838354/u,
  );
  assert.match(
    proofLimits,
    /four required native jobs failed actual acceptance/iu,
  );
  assert.match(
    proofLimits,
    /downstream native qualification was skipped, not passed/iu,
  );
  assert.match(proofLimits, /Full I11\/Q16 remains incomplete/u);
  assert.match(guide, /never delete a lock or retry a write blindly/iu);
  assert.match(
    guide,
    /does not publish\s+a general operation list, status,\s+resume or abandon tool/iu,
  );
});


test("Q39: external dependency boundary preserves exact-response integrity", async () => {
  const docs = await Promise.all([
    repositoryFile("docs/product-workflows.md"),
    repositoryFile("packages/engineer-agent-workflow-mcp/README.md"),
  ]);
  for (const [index, markdown] of docs.entries()) {
    const label = index === 0 ? "workflow guide" : "package README";
    assert.match(markdown, /Headroom is an external tool, not a repository dependency/iu, `${label}: missing external dependency policy`);
    assert.match(markdown, /Headroom qualification\s+is outside repository acceptance/iu, `${label}: missing acceptance boundary`);
    assert.match(markdown, /Q14 is cancelled and no longer required, never passed/iu, `${label}: cancelled qualification must not become a pass`);
    assert.doesNotMatch(markdown, /Headroom (?:is|remains) (?:a |an )?(?:mandatory|required) (?:repository )?(?:dependency|acceptance|qualification)/iu, `${label}: external qualification must not be mandatory`);
    assert.doesNotMatch(markdown, /Q14 (?:is|was|has) (?:now |been )?(?:passed|completed successfully)/iu, `${label}: cancelled Q14 is not passed`);
    assert.match(markdown, /schemas,\s+(?:opaque )?contexts,\s+cursors,\s+(?:source )?references,\s+hashes and\s+receipts/iu, `${label}: preserve all critical machine fields`);
    assert.match(markdown, /complete continuations/iu, `${label}: require complete delivery`);
    assert.match(markdown, /owning (?:original-content )?retrieval path/iu, `${label}: restore from the owner`);
    assert.match(markdown, /(?:unavailable or inconsistent|missing or corrupt)[\s\S]{0,90}stop the\s+affected (?:read|workflow)/iu, `${label}: exact-data failure must stop dependent work`);
    assert.doesNotMatch(markdown, /Select `design_tokens` together with `shared_design`/u, `${label}: unsupported design-token scope promise`);
  }
  const metadata = await Promise.all([
    repositoryFile("package.json"),
    repositoryFile("packages/engineer-agent-workflow-mcp/package.json"),
    repositoryFile("package-lock.json"),
  ]);
  for (const serialized of metadata) {
    const document = JSON.parse(serialized);
    const entries = [document, ...Object.values(document.packages ?? {})];
    for (const entry of entries) {
      for (const field of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
        for (const name of Object.keys(entry[field] ?? {})) {
          assert.doesNotMatch(name, /(?:^|[/@-])headroom(?:$|[/@-])/iu, "Headroom must not be a repository dependency");
        }
      }
    }
  }
});

test("Q39: documented product tool inputs match published schemas and tools/list", async (t) => {
  const [guide, schemaText] = await Promise.all([
    readFile(guidePath, "utf8"),
    readFile(schemaPath, "utf8"),
  ]);
  const schema = JSON.parse(schemaText);
  const examples = toolExamples(guide);
  assert.deepEqual(
    examples.map((example) => example.tool).sort(),
    expectedExampleTools,
  );

  const ajv = new Ajv({ allErrors: true, strict: false });
  for (const example of examples.filter(
    ({ tool }) => tool !== "workflow_runtime_info",
  )) {
    const validate = ajv.compile({
      $schema: schema.$schema,
      definitions: schema.definitions,
      $ref: `#/definitions/${example.tool}_input`,
    });
    assert.equal(
      validate(example.input),
      true,
      `${example.tool}: ${ajv.errorsText(validate.errors)}`,
    );
  }

  const isolated = await mkdtemp(path.join(tmpdir(), "product-documentation-"));
  const dataRoot = path.join(isolated, "product-data");
  t.after(() => rm(isolated, { recursive: true, force: true }));
  const client = new Client({
    name: "product-documentation-reader",
    version: "1",
  });
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [serverPath],
      env: { ...process.env, EAW_PRODUCT_DATA_DIR: dataRoot },
      stderr: "pipe",
    }),
  );
  t.after(() => client.close());

  const tools = (await client.listTools()).tools;
  const published = new Set(tools.map((tool) => tool.name));
  for (const tool of expectedExampleTools)
    assert.ok(published.has(tool), `missing tool: ${tool}`);
  for (const example of examples) {
    if (example.tool === "workflow_runtime_info") {
      // Use the serving implementation's Zod validator, rather than treating
      // its advertised 2020-12 schema as Draft 7 for the pinned Ajv 6.
      const runtime = workflowTools.find(({ name }) => name === example.tool);
      assert.equal(runtime.schemaKind, "zod");
      assert.equal(runtime.inputSchema.safeParse(example.input).success, true);
    } else {
      assert.equal(
        ajv.validate(
          tools.find(({ name }) => name === example.tool).inputSchema,
          example.input,
        ),
        true,
        `${example.tool}: ${ajv.errorsText(ajv.errors)}`,
      );
    }
  }
  await assert.rejects(access(dataRoot), { code: "ENOENT" });
});

test("Q17: current draft and session examples execute over isolated public stdio", async (t) => {
  const examples = new Map(
    toolExamples(await readFile(guidePath, "utf8")).map(({ tool, input }) => [
      tool,
      input,
    ]),
  );
  for (const tool of [
    "product_candidate_record_get",
    "product_session_open",
    "product_session_call",
    "product_session_next",
    "product_session_status",
    "product_session_resume",
    "workflow_runtime_info",
  ])
    assert.ok(
      examples.has(tool),
      `missing executable recovery example: ${tool}`,
    );
  const isolated = await mkdtemp(path.join(tmpdir(), "product-docs-q17-"));
  t.after(() => rm(isolated, { recursive: true, force: true }));
  const workspace = path.join(isolated, "workspace");
  await mkdir(workspace);
  await promisify(execFile)(
    "git",
    ["init", "--quiet", "--initial-branch=main"],
    { cwd: workspace },
  );
  const client = new Client({
    name: "q17-documentation-example",
    version: "1",
  });
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [serverPath],
      env: {
        ...process.env,
        EAW_PRODUCT_DATA_DIR: path.join(isolated, "store"),
      },
      stderr: "pipe",
    }),
  );
  t.after(() => client.close());
  async function call(name, input) {
    const response = await client.callTool({ name, arguments: input });
    assert.notEqual(
      response.isError,
      true,
      JSON.stringify(response.structuredContent),
    );
    return response.structuredContent;
  }
  const runtime = await call(
    "workflow_runtime_info",
    examples.get("workflow_runtime_info"),
  );
  assert.equal(runtime.result.identity_status, "verified");
  assert.match(runtime.result.build_id, /^[a-f0-9]{64}$/u);
  const initialized = await call("product_initialize", {
    workspace,
    name: "Documentation fixture",
    known_idea: "Retain exact evidence.",
  });
  const draft = await call("product_artifact_draft", {
    context: initialized.context,
    artifact: "idea",
    upstream_pins: [],
  });
  const candidate = draft.result.candidate_ref;
  const body = "Synthetic Unicode evidence 雪😀\n".repeat(200);
  const saved = await call("product_record_instruction", {
    context: draft.context,
    candidate_ref: candidate,
    text: body,
    source: "synthetic documentation fixture",
    related_refs: [],
    affected_refs: [],
  });
  const record = {
    kind: "decision",
    id: saved.result.decision_ref.id,
    revision: saved.result.decision_ref.revision,
  };
  const readInput = {
    ...examples.get("product_candidate_record_get"),
    context: saved.context,
    candidate_ref: candidate,
    record_ref: record,
  };
  let cursor,
    text = "",
    offset = 0,
    digest,
    pages = 0;
  do {
    const page = (
      await call("product_candidate_record_get", {
        ...readInput,
        ...(cursor ? { cursor } : {}),
      })
    ).result;
    assert.equal(page.offset, offset);
    digest ??= page.source_object_sha256;
    assert.equal(page.source_object_sha256, digest);
    text += page.text;
    offset += Array.from(page.text).length;
    cursor = page.next_cursor;
    assert.equal(page.complete, cursor === null);
    pages += 1;
  } while (cursor);
  assert.ok(
    pages > 1,
    "the documented continuation must actually be exercised",
  );
  assert.equal(JSON.parse(text).text, body);
  assert.equal(createHash("sha256").update(text).digest("hex"), digest);
  const directText = text;
  const opened = (
    await call("product_session_open", {
      ...examples.get("product_session_open"),
      context: saved.context,
      candidate_ref: candidate,
    })
  ).result;
  let revision = opened.session_revision;
  const session = opened.session_ref;
  let page = (
    await call("product_session_call", {
      ...examples.get("product_session_call"),
      session_ref: session,
      expected_revision: revision,
      request_id: randomUUID(),
      arguments: { candidate_ref: candidate, record_ref: record },
    })
  ).result;
  const readRef = page.read_ref;
  const outputs = [];
  text = "";
  for (let count = 0; ; count += 1) {
    assert.ok(count < 100, "the bounded example must terminate");
    revision = page.session_revision;
    text += page.delivery.text;
    if (page.delivery.complete) {
      outputs.push(JSON.parse(text));
      text = "";
    }
    if (page.complete) break;
    page = (
      await call("product_session_next", {
        ...examples.get("product_session_next"),
        session_ref: session,
        expected_revision: revision,
        read_ref: readRef,
      })
    ).result;
  }
  assert.equal(text, "");
  assert.equal(
    outputs.map((output) => output.result.text).join(""),
    directText,
  );
  assert.equal(
    JSON.parse(outputs.map((output) => output.result.text).join("")).text,
    body,
  );
  const status = await call("product_session_status", {
    ...examples.get("product_session_status"),
    session_ref: session,
  });
  assert.equal(status.result.session_revision, revision);
  const resumed = await call("product_session_resume", {
    ...examples.get("product_session_resume"),
    session_ref: session,
    expected_revision: revision,
  });
  assert.equal(resumed.result.session_revision, revision);
});
