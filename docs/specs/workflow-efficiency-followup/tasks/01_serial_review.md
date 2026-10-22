# P01: Serial Review Progression

## Technical proposal

Requirements: WFE-001, WFE-004, WFE-006, WFE-007, WFE-008. The shared technical boundary in `plan.md` is binding.

Change the existing `finish` loop in `scripts/benchmark-roadmap-retirement.mjs` and `completeReview` in `packages/engineer-agent-workflow-mcp/test-support/product-review-fixture.mjs`. Reuse `product_review_get_batch` / `readProductReviewBatch` with `pending_only: true` / `pendingOnly: true`, exact start review identity and a local scan index initialized from start. Exhaust every returned item's continuation with its own item index/cursor, form the verdict only from its final complete receipt, and wait for successful recording before advancing to the batch's returned scan index. A retained index may refer to the just-completed item; the next pending-only read skips its acknowledged verdict. Never substitute a continuation portion's coverage index for the batch scan index. An empty pending page with null next index terminates traversal without recording an empty batch. Preserve fresh consistency consumption/recording and authoritative completion after traversal. Do not add a replacement polling call or change public response/default semantics.

Keep recovery/observer status operations. Lost acknowledgements, conflicts, changed scope or resume invalidate local progression; follow the existing supported status/recovery path and documented exact-replay rules, otherwise stop affected writes. In particular, the refresh and post-submit observations in `scripts/qualify-roadmap-retirement.mjs` serve separate process handoffs and remain intact. The already non-polling `scripts/benchmark-product-review.mjs` needs regression observation, not a speculative rewrite. No change to `src/product/review.ts` or storage is planned.

Use existing `benchmarkRetirement`, `fixture` and `createSharedStdioHarness` for discriminating checks in the existing product review/retirement efficiency tests. Observe actual public MCP call names, complete response bytes and final outcomes. Cover full/recheck/followup traversal, multiple batches, incomplete items, retained indices, already recorded/inherited items, terminal pending scans and preserved recovery/consistency. Preserve controlled baseline runs before consumer changes. Candidate advancement-status calls must be zero and total public calls lower than the equivalent baseline; disclose any terminal scan. Prove the absence assertion by reintroducing one advancement-status call, and prove skipped-continuation/premature-completion rejection at the affected boundary. No general client library or benchmark framework is needed.

## Technical agreement

Status: Agreed; current exact `planning_packet_check` returned `ready` with no issues.

- Selected `proposal_id`: `serial-existing-protocol`.
- `packet_id`: `P01`.
- `proposal_digest`: `1785a792d3ac81e43b872124307bb8b7d97eb6e1da7ae8f4236fadb4caae7aa8`.
- `agreement_ref`: `{"id":"85c06a5f-eb9c-4edf-9693-3a00b727b345","revision":2}`.
- Managed answer: revision 2 of `85c06a5f-eb9c-4edf-9693-3a00b727b345`. Reused the actual original answer from decision 2f4127eb-0121-457e-bf2f-1625a0cd88f6 revision 5 after MCP confirmed identical proposal digests. This is historical-answer reconciliation, not a new human response.
- Bound sources: `plan.md` / `Shared technical boundary`; this packet / `Technical proposal`.
- Agreement does not authorize execution, commit or publication. Original packet dependencies remain mandatory.

## Execution inputs

- Specification: `../spec.md`, Approved; Standard/core; no extra profile/design artifact.
- `source_version`: `76293b6d3f506fb927801c3b5f2bbd926b2ed0e03b82208d650ac98ff73af853`.
- `specification_version`: `b6b5db5ac1c359ed36ddcbce59d398ec3e4f49e993e1e14e4d9bd554fc764ff1`.
- `review_ref`: `63aeeff2-66e1-4eb9-bdc8-e624ec02fe52`.
- Working directory for commands: repository root. Recheck repository-relative evidence before execution.
- Require a usable Git worktree with readable tracked, staged and untracked state, the complete matching workflow bundle, local Node/npm and separately authorized execution of this exact packet. A clean tree or an existing commit is not required.
- Check required local runners before bulk reading. The planning host reports Node.js 24.20.0 and codex-cli 0.163.0; this is discovery evidence, not qualification of the pinned Linux runtimes or model capability.
- Before edits and before completion, use `specification_check_state` with the pinned source version and `planning_packet_check` with the actual accepted agreement reference and proposal digest. Use the accepted agreement reference and exact proposal digest recorded above.

## Outcome, prerequisites and scope

Remove unconditional advancement-status calls while preserving exact coverage, findings and consistency. Requires the retained baseline described in the shared boundary before editing either consumer. No preceding packet is required.

Allowed areas: the two consumer loops named in the proposal, their imports, existing product review/retirement efficiency and recovery test files, and narrowly necessary test-support instrumentation. Runtime source/storage/schema changes are outside this proposal. Preserve the intentional observer/recovery status operations. No shared client abstraction is necessary.

## Repository evidence and ownership

| Existing unit | Responsibility and evidence | Dependency direction |
| --- | --- | --- |
| `finish` | `scripts/benchmark-roadmap-retirement.mjs:96`; records a batch then calls status at line 119 | Benchmark -> public MCP tool -> review runtime |
| `completeReview` | `packages/engineer-agent-workflow-mcp/test-support/product-review-fixture.mjs:271`; status after each recorded item at line 300 | Test helper -> existing review functions |
| `readProductReviewBatchSources` | `src/product/review.ts:2501` within the MCP package; skips saved verdicts at line 2527 and retains incomplete item indices | Existing server contract; preserve it |
| `benchmarkRetirement.call` | `scripts/benchmark-roadmap-retirement.mjs:81`; actual names, durations and complete response bytes; bounds at lines 91–92 | Measurement wraps the actual public call |
| Qualification handoffs | `scripts/qualify-roadmap-retirement.mjs:104` and `:144`; refresh/post-submit status | Separate observer/recovery purpose; preserve |

All runtime inputs/outputs stay unchanged. Local scan state belongs to one serial reviewer and is discarded on recovery; the latest successful MCP context replaces its predecessor. Final consistency and completion remain server-authoritative.

## Acceptance and test-first sequence

| Criterion | Owning check and discriminating evidence |
| --- | --- |
| Zero advancement-status calls; fewer total calls | Extend existing efficiency tests to invoke the real public path; run against retained current loop for RED; reinsert one status for PROVE |
| Same required items/findings/consistency | Compare exact normalized coverage identities and verdict outcomes on equivalent full/recheck/followup fixtures; receipt/version identity is checked within each fixture |
| Incomplete item and retained scan index | Force a multi-portion Unicode item; assert full delivery before record, then pending-only skip of the acknowledged item; mutate away continuation for PROVE |
| Terminal pending page | Assert empty page produces no empty record and still proceeds to mandatory consistency/completion; premature completion must fail |
| Recovery and existing safeguards | Preserve lost-response/conflict/observer assertions and bounded-retirement/source-audit regressions; no blanket removal of status |
| Budgets and observation surface | Measure actual serialized MCP envelope and structured result; existing 24/64 KiB, Unicode and source-integrity checks remain passing |

1. Retain identical pre-change source, fixtures and public baseline captures; identify source digests, not just HEAD.
2. Add the behavioral assertions and observe the relevant failures before loop edits. Synthetic verdicts must stay labeled synthetic.
3. Change only the two consumers, run the focused checks, then one mutation at a time for required PROVE. Restore and rerun affected checks.
4. Record exact calls/outcomes, including any extra terminal scan. Broader actual-agent and Linux qualification belongs to P03.

Existing commands, each run separately from the root:

```bash
rtk proxy npm run build
rtk proxy node scripts/run-tests.mjs packages/engineer-agent-workflow-mcp/test/product-review-efficiency.test.mjs packages/engineer-agent-workflow-mcp/test/product-retirement-efficiency.test.mjs packages/engineer-agent-workflow-mcp/test/product-review-recheck.test.mjs packages/engineer-agent-workflow-mcp/test/product-review-recovery.test.mjs
rtk proxy npm run lint
rtk proxy git diff --check
```

The first focused test edits are planned work; no new test is represented as already present or passing. Reuse an unchanged build within a check sequence. Public-stdio benchmark commands and the final native matrix are defined in P03.

## Completion and recovery

Preserve unrelated staged/tracked/untracked work and the pre-existing response-budget correction. Inspect expected task writes, native transitions and independent external changes; never accept overlap or unknown content loss as a new baseline. Retain failed evidence and exact recovery notes. A changed source, conflict, lost acknowledgement or resume requires the applicable current check rather than reuse of stale progress.

Run the packet's required checks, compare the scoped diff with the agreed proposal, update only this packet's item in `todo.md` and replace the current `handoff.md`. Stop after the packet. Failed or unavailable required checks leave it incomplete. Revert only this packet's identified changes when rolling back; do not rewrite stored workflow history, restore another writer's files, install, commit or publish. Independent code/security review is optional and separately invoked.
