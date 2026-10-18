import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function createTemporaryDirectory(t, prefix) {
  t.checkActive?.();
  const creating = mkdtemp(join(tmpdir(), prefix));
  t.after(async () => {
    const directory = await creating;
    await rm(directory, { recursive: true, force: true });
  });
  const directory = await creating;
  t.checkActive?.();
  return realpath(directory);
}
