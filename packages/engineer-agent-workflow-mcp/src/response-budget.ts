import type { CallToolResult } from "@modelcontextprotocol/server";

/** Construct the exact success envelope used on the MCP wire, or reject it whole. */
export function boundedSuccessResult(payload: Record<string, unknown>): CallToolResult | null {
  const text = JSON.stringify(payload);
  if (Buffer.byteLength(text) > 24 * 1024) return null;
  const result: CallToolResult = { content: [{ type: "text", text }], structuredContent: payload };
  return Buffer.byteLength(JSON.stringify(result)) <= 64 * 1024 ? result : null;
}
