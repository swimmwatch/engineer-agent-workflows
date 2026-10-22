import { spawn } from "node:child_process";
import { appendFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { lostReply } from "./fault-delivery.mjs";

const [entrypoint, scenario, captureFile] = process.argv.slice(2);
const target = scenario === "product-lost-ack" ? "task_packet_start" : "product_sources_get_batch";
const child = spawn(process.execPath, [entrypoint], { stdio: ["pipe", "pipe", "inherit"] });
const pending = new Map(), state = { dropped: false };
createInterface({ input: process.stdin }).on("line", line => {
  const message = JSON.parse(line);
  if (message.method === "tools/call") pending.set(message.id, message.params.name);
  child.stdin.write(line + "\n");
}).on("close", () => child.stdin.end());
createInterface({ input: child.stdout }).on("line", line => {
  const message = JSON.parse(line), tool = pending.get(message.id);
  pending.delete(message.id);
  const delivered = lostReply(line, tool, target, state);
  appendFileSync(captureFile, JSON.stringify({ epochMs: Date.now(), tool, originalWire: line,
    deliveredWire: delivered, dropped: line !== delivered }) + "\n", { mode: 0o600 });
  process.stdout.write(delivered + "\n");
});
child.on("error", error => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => child.kill(signal));
