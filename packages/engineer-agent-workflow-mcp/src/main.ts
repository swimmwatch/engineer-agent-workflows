#!/usr/bin/env node
import { serveStdio, StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { createServer } from "./server.js";

if (process.argv.length !== 2) {
  process.stderr.write("engineer-agent-workflow-mcp accepts no startup arguments; project paths belong in MCP calls.\n");
  process.exitCode = 2;
} else {
  const handle = serveStdio(createServer, {
    // Includes all bounded filters after worst-case JSON escaping and the envelope.
    transport: new StdioServerTransport(undefined, undefined, { maxBufferSize: 2 * 1024 * 1024 }),
    onerror: () => { process.stderr.write("Decision-reader transport error.\n"); },
  });
  const close = (): void => {
    void handle.close().catch(() => { process.exitCode = 1; });
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}
