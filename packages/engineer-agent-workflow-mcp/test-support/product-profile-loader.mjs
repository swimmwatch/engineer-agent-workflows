// Optional isolated-benchmark preload. It never emits source contents or paths.
import { channel } from "node:diagnostics_channel";
import { performance } from "node:perf_hooks";

const stringify = JSON.stringify;
let reads = 0, bytes = 0, sourceMs = 0, envelopeMs = 0;
channel("engineer-agent-workflows.product.source-validation").subscribe((event) => {
  reads++; bytes += event.bytes; sourceMs += event.duration_ms;
});
JSON.stringify = function (value, replacer, space) {
  const envelope = value !== null && typeof value === "object" && value.protocol_version === 2;
  const response = value !== null && typeof value === "object" && value.jsonrpc === "2.0" && Array.isArray(value.result?.content);
  const started = performance.now(), result = stringify.call(JSON, value, replacer, space);
  const duration = performance.now() - started;
  if (envelope) envelopeMs += duration;
  if (response) {
    process.stderr.write(`EAW_BENCHMARK ${stringify({ reads, bytes, source_ms: sourceMs, envelope_ms: envelopeMs, wire_ms: duration,
      wire_bytes: Buffer.byteLength(result) })}\n`);
    reads = 0; bytes = 0; sourceMs = 0; envelopeMs = 0;
  }
  return result;
};
