import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv from "ajv";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

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
  "product_capabilities",
  "product_context_prepare",
  "product_open",
  "product_review_start",
  "product_review_status",
  "task_inputs_check",
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
  assert.match(guide, /macOS and Windows[^.]*not\s+executed/iu);
  assert.match(guide, /never delete a lock or retry a write blindly/iu);
  assert.match(
    guide,
    /does not publish\s+a general operation list, status,\s+resume or abandon tool/iu,
  );
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
  for (const example of examples) {
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

  const published = new Set(
    (await client.listTools()).tools.map((tool) => tool.name),
  );
  for (const tool of expectedExampleTools)
    assert.ok(published.has(tool), `missing tool: ${tool}`);
  await assert.rejects(access(dataRoot), { code: "ENOENT" });
});
