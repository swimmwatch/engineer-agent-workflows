import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// Reuse the public-stdio fixture; its scripted review is setup, not quality proof.
export async function productFixture(source) {
  const { runProductWorkflowQualification, actor } = await import(pathToFileURL(join(source,
    "packages/engineer-agent-workflow-mcp/test/support/product-e2e-harness.mjs")));
  const disposers = [], scope = { after(dispose) { disposers.push(dispose); } };
  const seeded = await runProductWorkflowQualification(scope, { entrypoint: join(source,
    "packages/engineer-agent-workflow-mcp/dist/main.js") });
  const project = seeded.workspaces[1], directory = `docs/specs/${seeded.taskSpecifications[1].slug}`;
  const calls = [], client = actor(scope, { name: "qualification-packet-author", root: seeded.productRoot,
    calls, entrypoint: join(source, "packages/engineer-agent-workflow-mcp/dist/main.js") });
  await client.call("specification_open", { project, specification: seeded.taskSpecifications[1].slug });
  const tasks = join(project, directory, "tasks"); await mkdir(tasks, { recursive: true });
  await writeFile(join(tasks, "plan.md"), "# Plan\n\n## Shared\nPreserve exact product pins and implement synchronous idempotent recovery in a pure module.\n");
  const proposals = [{ id: "p1", packet_id: "P01", requirement_ids: ["PQB-001"], sources: [
    { path: `${directory}/tasks/plan.md`, heading: "Shared" },
    { path: `${directory}/tasks/01_recovery.md`, heading: "Technical proposal" },
  ] }];
  return {
    project, directory, productRoot: seeded.productRoot, taskId: "TASK-0002", requirementId: "PQB-001", proposals,
    packetId: "P01", packetPath: `${directory}/tasks/01_recovery.md`,
    call: (name, args) => client.call(name, args),
    prepare: extra => client.call("planning_question_prepare", { text: "SIMULATION: accept this recovery packet?", kind: "free_text", proposals, ...extra }),
    record: (question_ref, accepted_proposal_ids, extra) => client.call("planning_question_record_answer", {
      question_ref, accepted_proposal_ids, source: "fixture:simulated-answer", ...extra }),
    check: agreement => client.call("planning_packet_check", { packet_id: agreement.packet_id,
      agreement_ref: agreement.agreement_ref, expected_proposal_digest: agreement.proposal_digest }),
    write: (key, text) => writeFile(join(tasks, key === "p1" ? "01_recovery.md" : `${key}.md`), text),
    async cleanup() {
      for (const dispose of disposers.reverse()) await dispose();
    },
    async observeBinding() {
      await client.call("product_open", { workspace: project });
      return client.call("task_inputs_check", { task_id: "TASK-0002", packet_id: "P01" });
    },
    async verifyBinding() {
      const check = await this.observeBinding();
      assert.equal(check.status, "pass", JSON.stringify(check));
      return check;
    },
  };
}
