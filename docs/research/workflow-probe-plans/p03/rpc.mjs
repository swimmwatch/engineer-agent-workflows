import { spawn } from "node:child_process";
import { EventEmitter, once } from "node:events";

// A private stdio connection with an explicit child environment and owned process group.
export class JsonlClient extends EventEmitter {
  constructor(binary, { cwd, env, record = () => {}, maxLineBytes = 1024 * 1024 }) {
    super();
    this.record = record;
    this.pending = new Map();
    this.sequence = 0;
    this.buffer = "";
    this.closed = false;
    this.child = spawn("rtk", ["proxy", binary, "app-server", "--listen", "stdio://"], {
      cwd, env, stdio: ["pipe", "pipe", "pipe"], detached: process.platform !== "win32",
    });
    this.child.stdout.setEncoding("utf8");
    this.child.stderr.resume(); // Arbitrary stderr is deliberately not retained.
    this.child.stdout.on("data", chunk => {
      this.buffer += chunk;
      if (Buffer.byteLength(this.buffer) > maxLineBytes && !this.buffer.includes("\n")) return this.fail(new Error("Oversized JSONL message"));
      let end;
      while ((end = this.buffer.indexOf("\n")) !== -1) {
        const line = this.buffer.slice(0, end);
        this.buffer = this.buffer.slice(end + 1);
        if (Buffer.byteLength(line) > maxLineBytes) return this.fail(new Error("Oversized JSONL message"));
        if (!line.trim()) continue;
        try { this.receive(JSON.parse(line)); } catch { this.fail(new Error("Invalid JSONL protocol message")); }
      }
    });
    this.child.once("error", error => this.fail(error));
    this.child.once("exit", (code, signal) => this.fail(new Error(`App-server exited: ${code ?? signal}`)));
    this.child.stdin.on("error", error => this.fail(error));
  }

  receive(message) {
    if (!message || typeof message !== "object" || Array.isArray(message)) throw new Error("Invalid protocol message");
    this.record("receive", message);
    if (message.id !== undefined && message.method) {
      this.emit("serverRequest", message.method);
      this.send({ id: message.id, error: { code: -32601, message: "P03 does not authorize server requests" } });
    } else if (message.id !== undefined) {
      const waiter = this.pending.get(message.id);
      if (!waiter) return;
      this.pending.delete(message.id);
      clearTimeout(waiter.timer);
      if (message.error) waiter.reject(Object.assign(new Error(message.error.message ?? "RPC rejected"), { rpcError: message.error }));
      else waiter.resolve(message.result);
    } else if (typeof message.method === "string") this.emit("notification", message);
    else throw new Error("Invalid protocol message");
  }

  fail(error) {
    if (this.failure) return;
    this.failure = error;
    for (const waiter of this.pending.values()) { clearTimeout(waiter.timer); waiter.reject(error); }
    this.pending.clear();
    this.emit("failure", error);
  }

  send(message) {
    if (this.failure) throw this.failure;
    this.record("send", message);
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  notify(message) { this.send(message); }

  request(method, params = {}, timeoutMs = 15_000) {
    if (this.failure) return Promise.reject(this.failure);
    return new Promise((resolve, reject) => {
      const id = ++this.sequence;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`Request timed out: ${method}`)); }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try { this.send({ id, method, params }); }
      catch (error) { clearTimeout(timer); this.pending.delete(id); reject(error); }
    });
  }

  async close() {
    if (this.closed) return { reaped: this.child.exitCode !== null || this.child.signalCode !== null };
    this.closed = true;
    const child = this.child;
    const exited = child.exitCode !== null || child.signalCode !== null;
    const exit = exited ? Promise.resolve() : once(child, "exit").catch(() => {});
    const kill = signal => {
      if (!child.pid) return;
      try {
        if (process.platform === "win32") child.kill(signal);
        else process.kill(-child.pid, signal);
      } catch (error) { if (error.code !== "ESRCH") throw error; }
    };
    // Kill the group even if its leader exited, so owned fixture descendants are stopped.
    kill("SIGTERM");
    await Promise.race([exit, new Promise(resolve => setTimeout(resolve, 200))]);
    kill("SIGKILL");
    await Promise.race([exit, new Promise(resolve => setTimeout(resolve, 1000))]);
    this.fail(new Error("P03 client closed"));
    this.child.stdout.destroy();
    this.child.stdin.destroy();
    return { reaped: child.exitCode !== null || child.signalCode !== null };
  }
}
