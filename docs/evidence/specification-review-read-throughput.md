# Specification Review Read Throughput

Date: 2026-10-26

## Diagnosis And Selected Change

The review reader used the shared `portion()` default of 1024 Unicode code
points. Source items materialize full linked requirements and predecessor
history as formatted JSON; enhanced final context also includes the complete
specification and detailed results. Repeated small calls therefore repeat
envelope/context metadata, and a host using one model turn per continuation
also repeats coordination work. No evidence isolates the original delay as
machine, network or server saturation.

The existing Approved decision-reader LIMIT-001 permits at most 4096 code
points, 24 KiB of structured result and 64 KiB of serialized tool result.
Specification-completeness REQ-002/REV-002 require exact bounded continuation
and compatible unfinished reviews, not a fixed 1024-point page.

The patch requests up to 4096 points only in `specification_review_get`, then
halves the portion until the exact success envelope fits both byte budgets.
Envelope construction is shared with `server.successResult`, including text
content, structuredContent, escaping, metadata and receipts. If even one point
cannot fit, the call fails with RESULT_LIMIT rather than returning success.
Other callers retain the 1024-point default. No public tool parameter or
response field changes.

`materialize()`, `reviewBody()`, formatted JSON, source identity, cursor format,
prefix validation and receipt calculation remain unchanged. Page size is not
part of the identity. Server-issued pre-change continuations and completed-read
receipts can therefore be consumed across the update in both directions.
The package inventory includes the two generated response-budget runtime files.

## Alternatives And Boundaries

| Option | Finding | Disposition |
| --- | --- | --- |
| Larger, byte-checked portions | Reduces calls and repeated envelope bytes without changing materialized evidence | Implemented |
| Public configurable size | Requires a schema/API extension; not needed for the compatible reader patch | Deferred |
| Bounded multi-item read | Can reduce calls further, but must specify partial members, payload bounds and per-member receipts | No new batch-read API implemented |
| Exact-source deduplication | Requires per-reader complete-delivery/version evidence and new receipt semantics | Deferred; no source omitted |
| Compact materialized JSON | Changes body hashes and retained cursor/receipt identity even with unchanged source version | Deferred; formatting preserved |
| Programmatic cursor chaining | Available in this Codex session through callable composition; reduces model round trips, not MCP calls | Documented conditionally; exact text must reach its judging actor |
| Parallel reviewers | Independent reads are safe; shared writes require serialization | Documented bounded readers and one coordinator |
| Native host workflow | Claude Code and pinned Harness provide script-controlled agent orchestration; direct MCP pagination is not thereby established | Separate specification: `specification-review-native-workflow` |

The canonical reviewer reference allows two or three independent readers only
when useful and supported, at most 20 outstanding items, one writer and a final
whole-specification semantic judgment. Missing/null readers stay pending; reader
results are not an excuse to skip originals, overwrite verdicts or approve the
specification. Generated copies are derived for Codex, Claude Code and Harness.

## Measured Comparison

An isolated fixture contains 26 substantial linked requirements, Unicode and
escaping, a long original instruction and two partial corrections. A pre-change
compiled runtime creates the frozen review. The new runtime resumes it, consumes
old cursors and receipts, retains an old saved verdict, and exposes the same
materialized item and final context. Neither runtime touches a real review.

One matched source item, one controlled run:

| Metric | Before | After |
| --- | ---: | ---: |
| Exact reconstructed body bytes | 93,616 | 93,616 |
| Read calls | 79 | 20 |
| Serialized CallToolResult response bytes | 456,663 | 317,479 |
| Direct scenario-handler elapsed time | 2,143.83 ms | 559.79 ms |
| Test-harness traversal elapsed time | 2,172.58 ms | 568.20 ms |

Handler time measures awaited scenario execution, including its filesystem work;
it excludes wire transport and model inference. Harness time additionally includes
serialization checks and reconstruction. Response bytes count the complete
tool-result envelope, not request bytes or JSON-RPC transport framing. This is
not an end-to-end model trial or a universal timing/percentage guarantee.

Repeated linked requirements/history across different review items are still
delivered in full. The measured byte reduction comes from fewer page envelopes
and their repeated metadata, not semantic-source deduplication. Actual model
tokens, network latency, parent/reader model turns and agent wall time were not
measured. Native workflow orchestration can itself add agents and tokens; token
savings remain an empirical qualification question.

## Verification

The new `test/review-read-efficiency.test.mjs` was first run against the old
runtime: its page-size and larger-reader assertions failed. The page-size RED
executed the intended value assertion, not an import/collection failure.

The focused five-test run then passed with a preserved pre-change runtime and
no skips. It covers page-size changes, cursor retry/resume, exact Unicode/body
reconstruction, linked requirements and retained corrections, stale and foreign
cursors, independent reads, conflicting/stale writes, actual stdio response
budgets, old saved verdicts, old/new receipts and full final-context outcomes.
One test expectation was corrected to the existing BUSY write-lock behavior;
a second stale write uses different arguments because exact lost-response retry
is intentionally idempotent. A reconstruction assertion was corrected to join
already newline-terminated requirement blocks without inserting extra newlines.

PROVE: in a disposable copied runtime, removing only the 64 KiB wire guard caused
the escaping/envelope assertion to fail. The production runtime was untouched
and the disposable mutation was removed. Structured UTF-8 overflow and the case
where structured JSON fits but its duplicated/escaped wire envelope does not
are checked independently.

The existing 51 review tests ran with 50 passes and one optional pre-change-runtime
qualification skip; the dedicated five-test run supplied that runtime and passed
the skipped compatibility scenario. The 51 specification-skill/workflow-efficiency
tests passed. Build and lint passed. Packed-artifact execution passed after its
exact runtime inventory was updated for response-budget.js and its declaration.
The complete MCP-suite final rerun passed: 749 tests, 748 passes, no failures and
one optional pre-change-runtime qualification skip. That skipped case passed in
the dedicated five-test run with its preserved baseline supplied. Final lint,
`generate --check`, repository validation (17/17 skills), and `git diff --check`
passed. The three changed reviewer-reference copies also match their canonical
host rendering independently. Unrelated worktree changes were preserved.

The separately confirmed native-workflow specification received an independent
23/23 review with a consistent whole-specification result. Its review reference
is `c62c6c6d-1f39-4bd9-9c9a-fdb8a1552aee`, source version
`9f71e7ec2c050ad8a96e803bbc40c420f470ec433cc17ab8031ac5c1bca3d6ac`.
The author then changed only its status to Approved; MCP confirmed pass,
reviewed coverage and a recorded approval checkpoint. This completes the
specification stage, not native workflow planning or implementation.

## Unperformed Actions And Qualification Limits

No real model review/performance trial of this reader patch or either future
native workflow was run. No new batch-read API, deduplication protocol, compact
body migration, application test, global install, shared-server restart, commit,
push or publication was performed. Existing batch-verdict and consistency tests
remain part of protocol regression coverage.

The connected MCP still runs its previously loaded code. Deployment requires
separate explicit authorization, coordination with the concurrent review,
package refresh/reconnection and verification of the actual serving runtime and
published schemas. A successful local build does not establish deployment.
