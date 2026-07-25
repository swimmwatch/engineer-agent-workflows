import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export function fixturePath(...segments) {
  return path.join(projectRoot, "tests", "fixtures", ...segments);
}

export async function readFixture(...segments) {
  return await fs.readFile(fixturePath(...segments), "utf8");
}

export async function makeTempTree(t, entries = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "engineer-agent-workflows-"));
  t.after(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });
  for (const [relativePath, value] of Object.entries(entries)) {
    const absolutePath = path.join(root, ...relativePath.split("/"));
    if (value === null) {
      await fs.mkdir(absolutePath, { recursive: true });
      continue;
    }
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, value);
  }
  return root;
}

export async function copyFoundationCatalog(t) {
  const root = await makeTempTree(t);
  await fs.cp(path.join(projectRoot, "catalog"), path.join(root, "catalog"), {
    recursive: true,
  });
  return root;
}
