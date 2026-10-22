import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { URL } from "node:url";
import { workflowTools } from "../packages/engineer-agent-workflow-mcp/dist/server.js";
import { describeInputSchema } from "../packages/engineer-agent-workflow-mcp/dist/metadata.js";
import { z } from "zod";

test("published workflow contracts match the executable scenario schemas", async () => {
  const contracts = JSON.parse(await readFile(new URL("../packages/engineer-agent-workflow-mcp/dist/tool-contracts.json", import.meta.url), "utf8"));
  assert.deepEqual(contracts.map((c) => c.name), workflowTools.map((t) => t.name));
  for (const tool of workflowTools) {
    const contract = contracts.find((c) => c.name === tool.name);
    const inputSchema = describeInputSchema(
      tool.name,
      tool.schemaKind === "json"
        ? tool.inputSchema
        : z.toJSONSchema(tool.inputSchema, { io: "input" }),
    );
    assert.equal(contract.description, tool.description);
    assert.deepEqual(contract.inputSchema, inputSchema);
    if (tool.schemaKind === "json") {
      assert.deepEqual(contract.outputSchema, tool.outputSchema);
    }
    assert.equal(contract.readOnly, !tool.write);
    for (const forbidden of ["yaml", "patch", "operations", "field_path"]) assert.equal(contract.inputSchema.properties[forbidden], undefined);
  }
});

test("generated workflow bundles route YAML ownership to scenario tools without loading UI instructions for specification", async () => {
  for (const host of ["codex", "claude-code"]) {
    const root = new URL(`../plugins/${host}/engineer-agent-workflows/skills/`, import.meta.url);
    const interview = await readFile(new URL("spec-driven-development/references/specification-interview.md", root), "utf8");
    const design = await readFile(new URL("design-planning/references/penpot-workflow.md", root), "utf8");
    const common = await readFile(new URL("spec-driven-development/shared/references/workflow-state-access.md", root), "utf8");
    assert.match(interview, /question_prepare/);
    assert.match(interview, /question_record_no_answer/);
    assert.doesNotMatch(interview, /screen_add_transition|component_register/);
    assert.match(design, /screen_add_transition/);
    assert.match(design, /component_register/);
    assert.match(common, /engineer-agent-workflow-mcp/);
    assert.match(common, /Do not hand-edit/);
  }
});

test("generated technical instructions name callable scenarios and preserve host question isolation", async () => {
  for (const host of ["codex", "claude-code"]) {
    const root = new URL(`../plugins/${host}/engineer-agent-workflows/skills/`, import.meta.url);
    const reference = await readFile(new URL("planning-and-task-breakdown/references/technical-agreement.md", root), "utf8");
    const recovery = await readFile(new URL("incremental-implementation/references/packet-recovery.md", root), "utf8");
    const common = await readFile(new URL("incremental-implementation/shared/references/yaml-contracts.md", root), "utf8");
    for (const match of reference.matchAll(/`(planning_[a-z_]+)`/g)) {
      assert.ok(workflowTools.some(tool => tool.name === match[1]), match[1]);
    }
    assert.match(reference, host === "codex" ? /request_user_input/ : /AskUserQuestion/);
    assert.doesNotMatch(reference, host === "codex" ? /AskUserQuestion|CLAUDE\.md/ : /request_user_input|AGENTS\.md/);
    assert.match(common, /planning_decisions/);
    assert.match(common, /technical.*not.*behavioral/is);
    assert.match(recovery, /planning_packet_check/);
    assert.match(recovery, /private helper/is);
    assert.doesNotMatch(recovery, /(?<!planning_)\bquestion_(?:prepare|record_answer|record_no_answer)\b/);
  }
});
