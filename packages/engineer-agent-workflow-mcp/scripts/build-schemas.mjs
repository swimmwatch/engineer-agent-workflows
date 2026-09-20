import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { z } from "zod";
const destination = new URL("../dist/schemas/", import.meta.url);
await mkdir(destination, { recursive: true });
for (const name of ["manifest", "decisions", "catalog", "experience", "product"]) {
  await copyFile(new URL(`../../../shared/schemas/${name}.schema.json`, import.meta.url), new URL(`${name}.schema.json`, destination));
}
const { workflowTools } = await import("../dist/server.js");
const { describeInputSchema } = await import("../dist/metadata.js");
await writeFile(new URL("../dist/tool-contracts.json", import.meta.url), `${JSON.stringify(workflowTools.map((tool) => ({
  name: tool.name,
  description: tool.description,
  readOnly: !tool.write,
  destructive: tool.destructive,
  inputSchema: describeInputSchema(
    tool.name,
    tool.schemaKind === "json" ? tool.inputSchema : z.toJSONSchema(tool.inputSchema, { io: "input" }),
  ),
  outputSchema: tool.outputSchema ?? { type: "object", properties: { protocol_version: { const: 2 }, result: { type: "object" } }, required: ["protocol_version", "result"] },
})), null, 2)}\n`);
