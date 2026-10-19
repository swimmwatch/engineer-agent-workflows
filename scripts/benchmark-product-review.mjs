import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { performance } from "node:perf_hooks";
import fs from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";

import { fixture, recordItem, recordConsistency } from "../packages/engineer-agent-workflow-mcp/test-support/product-review-fixture.mjs";
import { startProductReview, completeProductReview, readProductReviewBatch, readProductReviewItem,
  recordProductVerdictBatch } from "../packages/engineer-agent-workflow-mcp/dist/product/review.js";

const output = process.argv[2];
if (!output) throw new Error("An explicit local output path is required.");
const results = [];
const batches = process.argv.includes("--batches");
let io = { read_calls: 0, read_bytes: 0 };
const originalOpen = fs.open;
fs.open = async (...args) => {
  const handle = await originalOpen(...args);
  const read = handle.read.bind(handle);
  handle.read = async (...args) => {
    const result = await read(...args);
    io.read_calls++;
    io.read_bytes += result.bytesRead;
    return result;
  };
  return handle;
};
syncBuiltinESMExports();
for (const elements of [100, 500, 1000]) {
  const cleanup = [];
  try {
    const f = await fixture({ after: (fn) => cleanup.push(fn) }, "prd", { elements });
    io = { read_calls: 0, read_bytes: 0 };
    const begun = performance.now();
    const start = await startProductReview({ root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "full" });
    const samples = [];
    let context = start.context;
    for (let index = 0; index < start.result.total_items;) {
      const before = performance.now();
      if (batches) {
        const page = await readProductReviewBatch({ root: f.root, context, reviewRef: start.result.review_ref, startIndex: index });
        const items = [];
        for (const entry of page.result.items) {
          let part = entry.portion;
          while (!part.complete) part = (await readProductReviewItem({ root: f.root, context,
            reviewRef: start.result.review_ref, itemIndex: entry.item_index, cursor: part.next_cursor })).result;
          items.push({ item_key: part.item_key, verdict: "covered", explanation: "Synthetic block evidence.", counterexample: null,
            evidence_refs: [], evidence_sources: [], read_receipt: part.read_receipt, inherited_from: null });
        }
        context = (await recordProductVerdictBatch({ root: f.root, context, reviewRef: start.result.review_ref, items })).context;
        index = page.result.items.at(-1).item_index + 1;
      } else {
        context = (await recordItem(f, start.result.review_ref, index, context)).context;
        index++;
      }
      samples.push(performance.now() - before);
    }
    if (start.result.inventory_contract === "semantic-v2") await recordConsistency(f, start.result.review_ref, context);
    const result = await completeProductReview({ root: f.root, context, reviewRef: start.result.review_ref });
    results.push({ elements, items: start.result.total_items, status: result.result.coverage_status,
      source_atoms: start.result.source_atoms, ...io, batches, writes: samples.length,
      elapsed_ms: performance.now() - begun, first_ms: samples.slice(0, 10), last_ms: samples.slice(-10) });
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(results, null, 2)}\n`);
    console.log(JSON.stringify(results.at(-1)));
  } finally { for (const fn of cleanup.reverse()) await fn(); }
}
