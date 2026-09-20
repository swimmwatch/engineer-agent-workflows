# P21: Bounded atomic review-verdict batches

Status: Complete. Implemented and corrected after independent code and security
review; no commit, installation, or publication was performed.

## Outcome and authority

Implement PWF-039–PWF-041 while preserving PWF-021, PWF-033, PWF-035 and
PWF-038. Add exactly one public scenario,
`specification_review_record_batch`; keep `specification_review_record` and the
whole-specification followup consistency operation unchanged.

Pinned specification evidence:

- `source_version`: `757943679c62c7967e931fb88981736a6e4471ed4ba87078882ae981212d58dd`
- `specification_version`: `26b85020e08d19a98161c15d3207d99ee9cf2868aa413e9a4f6484770e3874f6`
- `review_ref`: `1f1f7b2d-34c4-4d7e-bbf7-31fbb0f756c3`
- Contract selector: `contracts/mcp.md#atomic-review-verdict-batches` and
  quality scenarios Q44–Q47.

P20 must first pass its focused and full checks so indexed errors and lifecycle
diagnostics are available. No commit or independent review is a dependency.

## Repository evidence and boundaries

Reverify before editing:

- `packages/engineer-agent-workflow-mcp/src/reviews.ts:75` issues item-bound
  complete-read receipts; `reviews.ts:85` validates and records one verdict inline.
- `packages/engineer-agent-workflow-mcp/src/review-model.ts:58` validates the
  current review/source; `review-model.ts:69` resolves inventory indexes; its
  receipt binds project, specification, review, source and item.
- `packages/engineer-agent-workflow-mcp/src/state.ts:299` already supplies one
  lock, coherent read guards, one journal commit, success-response preflight,
  exact-operation replay and the latest-64 receipt window across restarts.
- `packages/engineer-agent-workflow-mcp/test-support/stdio-harness.mjs:14`
  supports independent clients and restart tests.

Production changes belong first in `src/reviews.ts`. Touch `review-model.ts`,
`state.ts`, `api.ts`, `server.ts`, or generated metadata only if a failing
contract test proves the existing owner cannot satisfy the requirement. Add
`packages/engineer-agent-workflow-mcp/test/review-batch.test.mjs`; reuse existing
concurrency, followup and transport fixtures. Do not introduce a generic operation
batch DSL, new storage schema, journal compaction, migration, context format, CCr
decoder, or product-review batch.

## Architectural units and public contract

1. **Shared verdict validator/applicator (`reviews.ts`)** — extract the current
   single-item checks into a side-effect-free validation result plus one append
   step. Inputs are item index, item-bound receipt, verdict, explanation, optional
   counterexample and evidence refs. Both single and batch operations call the
   same rules; neither infers evidence or authenticates reading.
2. **Batch input (`reviews.ts`)** — current `context`, one `review_ref`, and 1–20
   distinct ordered `items`. Check the complete raw arguments as compact UTF-8
   JSON before schema defaults; the maximum is exactly 131,072 bytes and excludes
   JSON-RPC framing. A local Zod raw-input pipeline is sufficient; do not widen all
   workflow tools merely for this one limit.
3. **Atomic mutation (`state.ts::mutate`)** — one call validates every item against
   one snapshot under the existing lock before assigning `run.results`. Any invalid,
   duplicate, already-recorded, stale, foreign, incomplete or unsupported item
   rejects the entire request. A mixed existing/new request is never partially
   applied or treated as a no-op.
4. **Success/replay** — return ordered per-item outcomes, total newly recorded
   items and the updated protocol-2 context. Existing response preflight occurs
   before commit. Exact original request replay, including context and item order,
   returns the stored result without another verdict/receipt/write; reordered or
   edited requests are new and fail under current state. Expired original-context
   replay fails stale rather than duplicating effects.
5. **Lifecycle compatibility** — full and eligible followup detailed items may be
   batched. Inherited results are not input items. The final followup consistency
   judgment stays separate; batches neither complete a review nor mark a
   specification Approved. Source-changing/new-scope eligibility remains unchanged.

## RED, GREEN, and PROVE

Create the focused test before the tool. After a missing-tool RED, obtain a
behavioral RED/PROVE for atomicity or shared validation before completion.

- **B01 — parity:** equal fully read full/followup inventories recorded through
  singles and batches produce equivalent ordered semantic results and coverage,
  including mixed verdicts, evidence requirements and non-behavioral exclusions.
- **B02 — bounds:** exercise 1, 20 and 21 items; duplicate indexes; compact argument
  sizes exactly below/at/above 131,072 bytes with multibyte text; preserve the 2-MiB
  transport ceiling and output budgets.
- **B03 — atomicity:** make the final member invalid/stale/foreign/incomplete and
  assert unchanged journal bytes, versions, verdicts and receipt counts. PROVE by
  temporarily appending a validated prefix and observing the assertion fail.
- **B04 — overlap/retry:** reject all-new plus one recorded item, identical overlap,
  reordered and contradictory retries with the failing zero-based batch position.
  Submit only remaining items after status inspection.
- **B05 — replay/concurrency:** lost response, exact repeat and server restart save
  one batch; another batch using returned context succeeds. Two clients show
  harmless observer reads and genuine stale-write conflicts.
- **B06 — measured reduction and delivery:** on equal 60-item inventories compare
  sixty single commits with three 20-item commits, while separately reporting
  start/read/complete operations, actual bytes, final size, receipt growth and
  elapsed time. Exercise exact reconstruction, no-op linking and replay on synthetic
  1,000/10,000-row histories. A compressed display marker is not reading evidence;
  unavailable exact text leaves only affected verdicts unrecorded.

Run from the repository root:

```sh
rtk proxy npm run build
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/review-batch.test.mjs packages/engineer-agent-workflow-mcp/test/review-concurrency.test.mjs packages/engineer-agent-workflow-mcp/test/review-followup.test.mjs packages/engineer-agent-workflow-mcp/test/transport.test.mjs packages/engineer-agent-workflow-mcp/test/tool-metadata.test.mjs
rtk proxy npm run lint
rtk proxy npm test
rtk proxy npm run generate:check
rtk proxy npm run validate:foundation
rtk proxy git diff --check
```

Record actual measurements rather than claiming a machine-independent speedup.
Native-platform and fresh-model qualification remain P17. Recheck MCP pins, update
only `todo.md` and current `handoff.md`, then stop. Any unavailable required check
keeps P21 incomplete with its concrete next action.
