import { chmod, cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

export async function withTrialHome(profile, home, run) {
  const resources = { client: null };
  try {
    await mkdir(home, { mode: 0o700, recursive: true });
    await chmod(home, 0o700);
    await cp(profile, home, { recursive: true });
    return await run(resources);
  } finally {
    try {
      if (resources.client && (await resources.client.close())?.reaped !== true) {
        throw new Error("Trial client was not reaped");
      }
    } finally {
      await rm(join(home, "auth.json"), { force: true });
    }
  }
}
