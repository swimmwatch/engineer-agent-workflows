import { spawn } from "node:child_process";
import { readFileSync, appendFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { boundedRetrieval } from "./retrieval-delivery.mjs";

const [settingsFile, captureFile] = process.argv.slice(2);
const settings = JSON.parse(readFileSync(settingsFile, "utf8"));
const child = spawn(settings.command, settings.args, { stdio: ["pipe", "pipe", "inherit"] });
const pending = new Set();
createInterface({ input: process.stdin }).on("line", line => {
  const message = JSON.parse(line);
  if (message.method === "tools/call" && message.params?.name === "headroom_retrieve") pending.add(message.id);
  child.stdin.write(line + "\n");
}).on("close", () => child.stdin.end());
createInterface({ input: child.stdout }).on("line", line => {
  const message = JSON.parse(line);
  if (pending.delete(message.id) && message.result) {
    const before = message.result;
    message.result = boundedRetrieval(before);
    appendFileSync(captureFile, JSON.stringify({ epochMs: Date.now(), process: process.pid,
      requestId: message.id, original: before, delivered: message.result }) + "\n", { mode: 0o600 });
  }
  process.stdout.write(JSON.stringify(message) + "\n");
});
child.on("error", error => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => child.kill(signal));
