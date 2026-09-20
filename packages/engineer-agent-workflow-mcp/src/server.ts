import { Server, type CallToolResult, type Tool } from "@modelcontextprotocol/server";
import { z } from "zod";
import { LedgerError } from "./ledger.js";
import { executeTool, TOOL_DEFINITIONS } from "./service.js";
import { scopeTools } from "./scope.js";
import { decisionTools } from "./decisions.js";
import { catalogTools } from "./catalog.js";
import { experienceTools } from "./experience.js";
import { checkTools } from "./checks.js";
import { requirementTools } from "./requirements.js";
import { reviewTools } from "./reviews.js";
import { followupTools } from "./review-followup.js";
import { productTools } from "./product/tools.js";
import { describeInputSchema } from "./metadata.js";
import { WorkflowError } from "./state.js";

export const workflowTools = [...scopeTools, ...decisionTools, ...catalogTools, ...experienceTools, ...checkTools, ...requirementTools, ...reviewTools, ...followupTools, ...productTools];

const ERROR_MESSAGES: Readonly<Record<string, string>> = {
  INVALID_INPUT: "The request does not match the decision-reader contract.",
  NOT_FOUND: "The requested project, specification or decision was not found.",
  UNSAFE_PATH: "The selected source is not an allowed regular journal path.",
  SOURCE_CHANGED: "The source changed while being read; retry from its current state.",
  SOURCE_LIMIT: "The journal exceeds the supported input limits.",
  INVALID_YAML: "The selected journal is not valid supported YAML.",
  INVALID_LEDGER: "The journal has invalid identity, fields or revision structure.",
  INVALID_CURSOR: "The continuation does not match this request.",
  STALE_CURSOR: "The source changed; restart the query and reconcile its new version.",
  RESULT_LIMIT: "The result exceeds the response budget; request a smaller portion.",
  INTERNAL_ERROR: "The decision reader could not complete the request.",
};

export function errorResult(error: unknown): CallToolResult {
  if (error instanceof WorkflowError) {
    const { details: diagnosticDetails, ...legacyDetails } = error.details;
    const boundedLegacy = Buffer.byteLength(JSON.stringify(legacyDetails)) <= 8192
      ? legacyDetails : {};
    const boundedDiagnostics = diagnosticDetails !== undefined
      && Buffer.byteLength(JSON.stringify(diagnosticDetails)) <= 8192
      ? { details: diagnosticDetails }
      : {};
    const payload = {
      protocol_version: 2,
      error: {
        code: error.code,
        message: error.message.slice(0, 512),
        ...boundedLegacy,
        ...boundedDiagnostics,
      },
    };
    return { isError: true, content: [{ type: "text", text: JSON.stringify(payload) }], structuredContent: payload };
  }
  const code = error instanceof LedgerError && Object.hasOwn(ERROR_MESSAGES, error.code)
    ? error.code : "INTERNAL_ERROR";
  const payload = { protocol_version: 1, error: { code, message: ERROR_MESSAGES[code] } };
  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify(payload) }],
    structuredContent: payload,
  };
}

export function successResult(payload: Record<string, unknown>): CallToolResult {
  const text = JSON.stringify(payload);
  if (Buffer.byteLength(text) > 24 * 1024) {
    return errorResult(new LedgerError("RESULT_LIMIT", "Structured response limit exceeded."));
  }
  const result: CallToolResult = {
    content: [{ type: "text", text }], structuredContent: payload,
  };
  return Buffer.byteLength(JSON.stringify(result)) <= 64 * 1024
    ? result : errorResult(new LedgerError("RESULT_LIMIT", "Wire response limit exceeded."));
}

const common = {
  protocol_version: z.literal(1), version: z.string().regex(/^[a-f0-9]{64}$/),
  complete: z.boolean(), next_cursor: z.string().nullable(),
};
const count = z.number().int().nonnegative();
const outputs = new Map<string, z.ZodType>([
  ["decisions_catalog", z.object({ ...common, items: z.array(z.string()), total: count }).passthrough()],
  ["decisions_overview", z.object({
    ...common, revisions: count, current: count, retired: count,
    states: z.record(z.string(), count), warning_counts: z.record(z.string(), count),
  }).passthrough()],
  ["decisions_search", z.object({
    ...common, total: count,
    items: z.array(z.object({ id: z.string(), revision: z.number().int().positive() }).passthrough()),
  }).passthrough()],
  ["decisions_get", z.object({
    ...common, id: z.string(), revision: z.number().int().positive(), text: z.string(),
    offset: count, total_characters: count,
  }).passthrough()],
]);

export function createServer(): Server {
  const server = new Server(
    { name: "engineer-agent-workflow-mcp", version: "0.0.0-development" },
    { capabilities: { tools: {} } },
  );
  const definitions: Tool[] = TOOL_DEFINITIONS.map((definition) => {
    const outputSchema = outputs.get(definition.name);
    if (!outputSchema) throw new Error("Missing decision-reader output schema.");
    return {
      name: definition.name,
      description: definition.description,
      inputSchema: describeInputSchema(
        definition.name,
        z.toJSONSchema(definition.inputSchema, { io: "input" }),
      ) as Tool["inputSchema"],
      outputSchema: z.toJSONSchema(outputSchema),
      annotations: {
        readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false,
      },
    };
  });
  definitions.push(...workflowTools.map((definition): Tool => ({
    name: definition.name, description: definition.description,
    inputSchema: describeInputSchema(
      definition.name,
      (definition.schemaKind === "json"
        ? definition.inputSchema
        : z.toJSONSchema(definition.inputSchema as z.ZodType, { io: "input" })) as Record<string, unknown>,
    ) as Tool["inputSchema"],
    outputSchema: definition.outputSchema ?? { type: "object", properties: { protocol_version: { const: 2 }, result: { type: "object" } }, required: ["protocol_version", "result"] },
    annotations: { readOnlyHint: !definition.write, destructiveHint: definition.destructive, idempotentHint: true, openWorldHint: false },
  })));
  server.setRequestHandler("tools/list", () => Promise.resolve({ tools: definitions }));
  // Validate inside the bounded error boundary; SDK tool validation reflects all issues.
  server.setRequestHandler("tools/call", async (request) => {
    try {
      const workflow = workflowTools.find((tool) => tool.name === request.params.name);
      if (workflow) {
        const definition = definitions.find((tool) => tool.name === workflow.name);
        return server.projectCallToolResult(successResult(await workflow.run(request.params.arguments)), definition?.outputSchema);
      }
      const payload = await executeTool(request.params.name, request.params.arguments);
      const outputSchema = outputs.get(request.params.name);
      if (!outputSchema?.safeParse(payload).success) {
        throw new LedgerError("INTERNAL_ERROR", "Tool output does not match its schema.");
      }
      const definition = definitions.find((tool) => tool.name === request.params.name);
      return server.projectCallToolResult(successResult(payload), definition?.outputSchema);
    } catch (error) {
      return server.projectCallToolResult(errorResult(error), undefined);
    }
  });
  return server;
}
