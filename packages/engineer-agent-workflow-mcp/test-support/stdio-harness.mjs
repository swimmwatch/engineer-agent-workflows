import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

async function connectClient({ entrypoint, name }) {
  const client = new Client({ name, version: "1" });
  await client.connect(new StdioClientTransport({
    command: process.execPath,
    args: [entrypoint],
    stderr: "pipe",
  }));
  return client;
}

export function createSharedStdioHarness({ entrypoint, name, createClient = connectClient }) {
  let client;
  let starting;
  let startCount = 0;

  async function start() {
    if (client) return client;
    starting ??= createClient({ entrypoint, name }).then((created) => {
      client = created;
      startCount += 1;
      return created;
    }).finally(() => {
      starting = undefined;
    });
    return starting;
  }

  async function close() {
    if (starting) await starting;
    const active = client;
    client = undefined;
    if (active) await active.close();
  }

  return {
    get startCount() {
      return startCount;
    },
    start,
    close,
    async restart() {
      await close();
      await start();
    },
    async callTool(request) {
      return (await start()).callTool(request);
    },
    async listTools(request) {
      return (await start()).listTools(request);
    },
  };
}
