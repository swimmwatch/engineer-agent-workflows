// One deterministic transport loss; server operations remain real and unchanged.
export function lostReply(line, tool, target, state) {
  if (state.dropped || tool !== target) return line;
  const response = JSON.parse(line);
  if (!response.result || response.result.isError || response.error) return line;
  if (!(typeof response.id === "string" || Number.isSafeInteger(response.id))) throw new Error("Unsupported request identity");
  state.dropped = true;
  return JSON.stringify({ jsonrpc: "2.0", id: response.id,
    error: { code: -32000, message: "SIMULATION: connection lost before the reply was delivered; operation outcome is unknown." } });
}
