/** Runs only in owned synthetic MCP subprocesses, before server initialization. */
async function installTelemetry(settings) {
  const { appendFile } = await import("node:fs/promises");
  const { Server } = await import(settings.serverModule);
  const setHandler = Server.prototype.setRequestHandler;
  Server.prototype.setRequestHandler = function measuredRegistration(method, handler, ...rest) {
    if (method !== "tools/call" || typeof handler !== "function") return setHandler.call(this, method, handler, ...rest);
    async function measuredHandler(request, context) {
      const started = performance.now();
      try { return await handler(request, context); }
      finally {
        const row = { actor: settings.actor, name: request.params.name, handler_ms: performance.now() - started };
        await appendFile(settings.output, JSON.stringify(row) + "\n", { mode: 0o600 });
      }
    }
    return setHandler.call(this, method, measuredHandler, ...rest);
  };
}

export function nativeTelemetrySource(settings) {
  return "await (" + installTelemetry.toString() + ")(" + JSON.stringify(settings) + ");\n";
}
