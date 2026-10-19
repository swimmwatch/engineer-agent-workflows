import { appendFile, cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { fixture, context, replaceArtifactDocument } from "../packages/engineer-agent-workflow-mcp/test-support/product-review-fixture.mjs";

// Isolated qualification utility, never an installation or product lifecycle CLI.
const [command, directory, name, encodedArguments] = process.argv.slice(2);
if (!directory) throw new Error("An explicit isolated qualification directory is required.");
const target = resolve(directory);
const statePath = join(target, "session.json");
if (command === "init") {
  const cleanup = [];
  const f = await fixture({ after: (fn) => cleanup.push(fn) }, "prd", { elements: 3 });
  try {
    await replaceArtifactDocument(f, "prd", "# Service status product\n\nThe product communicates service availability to customers.\n\n"
      + "### PRD-0001: Published status\n\nReaders view published status pages without authentication. Incident edit history is not public.\n\n"
      + "### PRD-0002: Incident editing\n\nOnly authenticated owners can create and update incidents. Published pages show the current incident message.\n\n"
      + "### PRD-0003: Access policy\n\nEvery page, including published status pages, requires sign-in before any information is shown.\n");
    await mkdir(target, { recursive: true });
    await cp(dirname(f.root), join(target, "fixture"), { recursive: true, errorOnExist: true, force: false });
    f.root = join(target, "fixture", "product-data");
    f.workspace = join(target, "fixture", "workspace");
    await writeFile(statePath, `${JSON.stringify({ root: f.root, context: context(f, f.candidate), candidate_ref: f.candidateRef }, null, 2)}\n`, { flag: "wx" });
    console.log(statePath);
  } finally { for (const close of cleanup.reverse()) await close(); }
} else if (command === "call" || command === "describe") {
  const state = JSON.parse(await readFile(statePath, "utf8"));
  const input = JSON.parse(encodedArguments ?? "{}");
  const args = { context: state.context, ...input };
  if (name === "product_review_start") args.candidate_ref ??= state.candidate_ref;
  else if (name?.startsWith("product_review_")) args.review_ref ??= state.review_ref;
  const client = new Client({ name: "isolated-product-review-qualification", version: "1" });
  try {
    await client.connect(new StdioClientTransport({ command: process.execPath,
      args: [fileURLToPath(new URL("../packages/engineer-agent-workflow-mcp/dist/main.js", import.meta.url))], stderr: "pipe",
      env: Object.fromEntries(Object.entries({ ...process.env, EAW_PRODUCT_DATA_DIR: state.root }).filter(([, value]) => typeof value === "string")) }));
    if (command === "describe") {
      const catalogue = await client.listTools();
      console.log(JSON.stringify(catalogue.tools.filter((tool) => name ? tool.name === name : tool.name.startsWith("product_review_"))));
    } else {
      const response = await client.callTool({ name, arguments: args });
      const result = response.structuredContent ?? JSON.parse(response.content.find((entry) => entry.type === "text").text);
      await appendFile(join(target, "calls.jsonl"), `${JSON.stringify({ name, arguments: args, response: result })}\n`);
      if (result.context) state.context = result.context;
      if (result.result?.review_ref) state.review_ref = result.result.review_ref;
      await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
      console.log(JSON.stringify(result));
    }
  } finally { await client.close(); }
} else throw new Error("Use init, describe or call.");
