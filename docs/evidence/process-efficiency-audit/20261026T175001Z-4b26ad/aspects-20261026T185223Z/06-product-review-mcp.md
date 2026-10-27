# Product review: batch traversal, object-read scope and wire budgets

## Actual consumers and existing protocol

- Findings: **P07-F01/F02/F03** and **P14-01**. Saved basis:
  [P07](<../P07.json>), [P14](<../P14.json>), [V01](<../V01.json#L275-L339>),
  [V02](<../V02.json>) and the [review](<../audit.md#L334-L396>)/[wire-budget audit](<../audit.md#L592-L613>).
  These are source-confirmed opportunities, not executed performance results.
- Reuse the supplied 18:52:23Z unchanged-source/distribution verification.
  No audit, public reproduction, test or benchmark was repeated for this explanation.
- **idea-refine** uses this review only in [durable product mode](<../../../../../skills/idea-refine/SKILL.md#L21-L54>),
  not standalone exploration. **product-definition** requires an exact ready Idea
  and [independent PRD review](<../../../../../skills/product-definition/SKILL.md#L24-L55>).
- **technical-design** requires exact ready PRD pins and its own visible architecture/
  recorded-answer gate before [readiness and independent review](<../../../../../skills/technical-design/SKILL.md#L12-L22>).
  **product-roadmap** requires same-revision ready PRD/design pins and
  [independent roadmap review](<../../../../../skills/product-roadmap/SKILL.md#L14-L21>).
  A prerequisite pin does not invoke its producer or authorize the next stage.

### Numbered consumer flow, already present

1. The authorized author stabilizes sources, calls `product_candidate_check`,
   starts review and passes exact candidate/source/review identities to a separate
   reviewer. The author observes status; it does not fabricate verdicts.
2. The reviewer uses `inventory_contract`: semantic-v2 blocks include primary
   atoms and relevant shared context. Legacy atomic contracts remain distinct.
3. Read `product_review_get_batch` with `pending_only: true`; complete partial
   blocks through `product_review_get`, then record 1–20 complete verdicts atomically.
   At most 20 items/24 KiB are delivered per page; verdict arguments have their
   separate bound. Single-item reads remain valid for continuation/targeted rereads.
4. Advance using the returned batch scan index after acknowledgement. A partial
   item can retain its own index; an empty/null page ends scanning, not review.
   Status is for observers/recovery, not every successful serial advance.
5. Judge final cross-block consistency and call authoritative completion. Exact
   delivery, inherited attribution and completion counts do not prove meaning.
   See the [canonical review flow](<../../../../../shared/references/product-workflow.md#L180-L235>).
   This explanation does not assume the model always chooses a single-item reader.

## P07-F01 — Acknowledged suffix causes repeated whole-inventory searches

### Trigger and current work

1. Resume a pending-only batch where the remaining suffix is already acknowledged.
2. Forward iteration encounters an acknowledged entry and calls `nextIndex(index + 1)`.
3. That helper uses `inventory.findIndex` from zero; `from` filters results, but
   does not move the scan's starting position. Each skipped entry repeats it.
4. For an all-acknowledged N-item inventory starting at zero, each of N skip
   branches scans all N predicates and returns -1: **N × N predicate work**,
   no delivered items. A shorter acknowledged suffix repeats the same waste.
   See [exact loop/helper](<../../../../../packages/engineer-agent-workflow-mcp/src/product/review.ts#L2515-L2546>).

- **Before:** skip one acknowledged entry, rescan the whole inventory, repeat.
- **After proposed minimum:** skip acknowledged runs in the existing forward
  iteration; compute exhaustion/successor once as needed, starting lookahead at
  its actual position. No persistent pending index or new resumption protocol.
- Keep exact keys/order/indexes, partial-block retention, source verification,
  byte limits and supported empty/null terminal page. A lost response is not an
  acknowledged verdict and must not make an unseen pending item disappear.

**Separate focused check:** extend the [Unicode/partial-item suffix regression](<../../../../../packages/engineer-agent-workflow-mcp/test/product-review-efficiency.test.mjs#L18-L92>)
with all-acknowledged N and 2N inventories; count membership predicates before
considering time. Negative controls: sparse pending entries, nonzero start,
partial last pending block, byte truncation and lost acknowledgement. Assert
identical keys/cursors and the existing [serial termination contract](<../../../../../shared/references/product-workflow.md#L207-L217>).
**Owner:** product-review reader internals; no skill-text change. High confidence
in quadratic edge-case work; material wall-time benefit remains unmeasured.

## P07-F02 — Recheck membership and status are recomputed within one state

### Trigger and current work

1. A recheck state has many saved verdicts plus required pending/expanded keys.
2. `statusFor` filters inherited results, calling `requiredRecheckKeys(state)`
   separately for every non-consistency verdict. Each call allocates the same Set
   from pending keys and expansions. See [status derivation](<../../../../../packages/engineer-agent-workflow-mcp/src/product/review.ts#L1053-L1077>)
   and [required-key construction](<../../../../../packages/engineer-agent-workflow-mcp/src/product/review.ts#L1653-L1656>).
3. Batch packing calls the whole status derivation for each candidate portion and
   each size-halving retry, merely to obtain `next_item_index`; see
   [packing calls](<../../../../../packages/engineer-agent-workflow-mcp/src/product/review.ts#L2525-L2536>).
4. [Loading a used verdict](<../../../../../packages/engineer-agent-workflow-mcp/src/product/review.ts#L861-L866>)
   replaces an existing key's body, not verdict membership. These particular
   membership/progress values are unchanged within that loaded read state.

- **Before:** repeatedly allocate equal Sets and recompute full status per retry.
- **After proposed minimum:** one required-key Set in that status branch and one
  batch progress scalar per unchanged loaded state; recompute after mutations or
  scope expansion. No process-wide or cross-request status cache.
- Preserve status JSON/counts, consistency-key exclusion, inherited provenance,
  removed coverage after expansion and all receipt/source/eligibility checks.

**Separate focused check:** use [inherited attribution](<../../../../../packages/engineer-agent-workflow-mcp/test/product-review-recheck.test.mjs#L45-L90>)
and [scope-expansion invalidation](<../../../../../packages/engineer-agent-workflow-mcp/test/product-review-recheck.test.mjs#L252-L268>)
fixtures; assert exact status equality and Set/status invocation counts. Include
first-item halving, zero/all inherited, mixed pending and consistency exclusion.
The fixture's 118 inherited results are existing assertions, not measured load.
**Owner:** status/batch internals; no skill-text change. High confidence in local
reuse safety and repeated allocations; net effect unmeasured. Independent of F01.

## P07-F03 — Cold single-item reads end immutable reuse too early

### Trigger and current work

1. In a fresh server, request a recorded, source-backed item through
   `product_review_get`. The [public handler](<../../../../../packages/engineer-agent-workflow-mcp/src/product/tools.ts#L878-L891>)
   calls `readProductReviewItem`; [server dispatch](<../../../../../packages/engineer-agent-workflow-mcp/src/server.ts#L137-L153>)
   does not add an outer product-object scope.
2. `loadReviewState` runs its own `withProductObjectReads`; the cold full audit
   reads/verifies retained generation documents and verdict bodies.
3. That inner scope ends before single-item `verifyUsedSources` and
   `loadUsedVerdict`. Requested immutable sources/verdict can be opened, hashed
   and parsed again in the same logical operation. See [single-item path](<../../../../../packages/engineer-agent-workflow-mcp/src/product/review.ts#L2431-L2471>)
   and [cold audit/verdict loading](<../../../../../packages/engineer-agent-workflow-mcp/src/product/review.ts#L820-L866>).
4. Batch already has [an encompassing scope](<../../../../../packages/engineer-agent-workflow-mcp/src/product/review.ts#L2497-L2499>);
   warm single-item reads have a different cost profile, not universal cold duplication.

- **Before:** inner audit scope, then separate requested-object acquisition.
- **After proposed minimum:** the same existing scope covers the whole single-item
  read, as for batch. Reuse immutable bytes by store/path/hash only within one
  operation; do not cache across calls, writes, locks or process lifetime.
- Retain all logical checks, mutable before/after comparisons, exact hashes,
  safe paths, source/receipt validation and fresh under-lock checks. This does
  not promise elimination of every parse or repeated logical validation.
  See [storage lifetime and transaction invalidation](<../../../../../packages/engineer-agent-workflow-mcp/src/product/storage.ts#L25-L53>)
  and [object acquisition](<../../../../../packages/engineer-agent-workflow-mcp/src/product/storage.ts#L425-L438>).

**Separate focused check:** compare cold single-item with one-item batch for exact
payload/receipt equality using existing audit channels; include a warm control.
Corrupt a retained source or verdict between requests and require rejection.
Keep [audit/store/transaction isolation cases](<../../../../../packages/engineer-agent-workflow-mcp/test/product-source-audit.test.mjs#L59-L122>)
and [warm status versus used-source corruption controls](<../../../../../packages/engineer-agent-workflow-mcp/test/product-review-efficiency.test.mjs#L215-L239>).
**Owner:** review reader with P08 storage-lifetime confirmation; no skill change.
High confidence in scope gap; cold-path I/O/time benefit remains unmeasured.

## P14-01 — Structured fit can still lose the entire batch at the wire guard

### Trigger and current work

1. Exact source blocks contain many quotation/escape characters. Local batch
   `fits` accepts a candidate under its 24 KiB structured budget, after source audit.
2. Input/output schema handling completes; server success serialization then adds
   the text copy and JSON escaping. The [shared predicate](<../../../../../packages/engineer-agent-workflow-mcp/src/response-budget.ts#L3-L8>)
   checks both 24 KiB structured and 64 KiB full-wire limits.
3. A locally accepted candidate can exceed that wire cap, so the
   [final server guard](<../../../../../packages/engineer-agent-workflow-mcp/src/server.ts#L77-L79>)
   returns bounded `RESULT_LIMIT` and discards every useful packed item.
4. The actor must try a smaller limit and repeat reads/source verification.
   See [local fit/shrinking/prefix packing](<../../../../../packages/engineer-agent-workflow-mcp/src/product/review.ts#L2501-L2546>).
   The guard already prevents oversized success: this is not an uncapped-response flaw.

- **Before:** structured-only fit, then possibly whole-response rejection.
- **After proposed minimum:** apply the existing whole-result predicate to the real
  context-bearing candidate while packing; keep first-item shrinking and fitted
  prefixes. Keep explicit `RESULT_LIMIT` when no minimal portion fits.
- No cap increase, evidence truncation, schema change or final-guard removal.
  Preserve order, pending filtering, page-size-independent identities and
  complete-only receipts; record-batch atomicity is a separate unchanged guarantee.

**Separate focused check:** construct a deterministic public stdio input fitting
structured bytes but exceeding escaped-wire bytes, then reconstruct all exact text
and compare final receipts. The [existing escaping distinction](<../../../../../packages/engineer-agent-workflow-mcp/test/review-read-efficiency.test.mjs#L119-L129>)
is reusable, but the [direct Unicode batch regression](<../../../../../packages/engineer-agent-workflow-mcp/test/product-review-efficiency.test.mjs#L172-L212>)
does **not** establish this public failure. Controls: ordinary Unicode, pending-only
pages and a minimal item that cannot fit. No exact public reproduction was run.
**Owner:** product packer plus shared budget/server boundary; no skill change.
High confidence in predicate mismatch; threshold, retry frequency and savings unknown.

## Common boundary

All four changes concern MCP internals, not removal of independent reviewer work.
The [existing optimizations](<../audit.md#L82-L101>) retain semantic blocks,
provisional inheritance, scope expansion, source freshness and final consistency.
Safe request-local reuse is not semantic approval, a new read receipt, or permission
to skip recovery status. Separate discriminating checks are needed for all four;
a combined benchmark must not count the same hypothetical gain more than once.
