import assert from "node:assert/strict";

import { snapshotTree } from "../../scripts/lib/files.mjs";

export async function snapshotProject(root) {
  return structuredClone(await snapshotTree(root));
}

export function assertProjectUnchanged(before, after) {
  assert.deepEqual(
    structuredClone(after),
    structuredClone(before),
    "consumer project changed during global lifecycle operation",
  );
}
