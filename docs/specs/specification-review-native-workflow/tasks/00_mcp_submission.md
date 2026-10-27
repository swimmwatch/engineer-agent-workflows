# P00: MCP Launch Preparation And Concurrent Verdict Submission

Status: Technical agreement ready; final-stage optimizations included; implementation not started

## Approved inputs

Reviewed specification: `source_version` = `73f93f290e0ee7f969abc43af3121ea341dbe82a1db897896c27c678d09e7f43`;
`specification_version` = `969d6857c4f6decb623d7b60d841223057289f9dc0fb94f85fa4291f573ade2f`;
`review_ref` = `442a54a2-2c8a-4cf0-b3eb-44e9e77edb05`.
The revised Approved specification owns the preparation/submission contract. Read revised NWF-001/002/003/004/005/006/007/008/009/010/011/013/014/015 through scenario reads
after S0. Replace bindings only with actual reviewed MCP identities.

## Technical proposal

Candidate `P00-final-stage-preparation-v5`, packet `P00`, includes the exact
`Shared technical commitments` heading of `tasks/plan.md`. Do not prepare/freeze
this proposal until S0 resolves acknowledgment, retry identity/retention, resource
bounds, cancellation/effect reporting, preparation and conflict behavior.

Add one read-only scenario, logical name candidate
`specification_review_prepare_workflow`, to the existing MCP package. Initial
inputs are exact project/specification and expected review/source identities,
plus a caller-observed host concurrency budget. This budget does not authenticate
host/model availability. Do not require a preceding external open/status chain
solely to obtain input context. Reuse owning context/source/scope/review readers.

Return `ready_to_run`, `completed` with actual reviewed/gaps outcome, or `blocked`
with reasons and recovery. Only ready-to-run supplies native arguments. Compute
authoritative exact-text lengths, N/W and the confirmed K=20 formula under the
shared commitments; return bounded first groups, per-group weights and lane cursors,
not all originals/results/pending indexes. No total-item or 160-index run cap.
The same preparation scenario accepts server-issued continuation to obtain the
next bounded group metadata without another inspector/parent coordination turn.
No metadata response grants a complete-read receipt.

Use a stateless plan cursor anchored to source/review/inventory, policy, R/K and
the initial saved-result prefix count/digest. Existing recorders append results
(`src/reviews.ts:280`, `:294`), enabling reconstruction of initial pending items
without writing a plan snapshot. Generate stable weighted groups and greedy lane
allocation from that checkpoint; later appends can skip current saved items but
cannot reshuffle ownership. Encode lane/next-group continuation and validate the
retained prefix/source on each read. A wrong/missing prefix or changed source
blocks with recovery. Continue across actual MCP processes/restarts without a
new durable queue/reservation table or process-local cursor cache. No unbounded
client-side assignment list or source handoff enters the native script.

Preparation does not enroll/start review, reserve work, change managed files,
write approval observation, launch a model or complete semantic review. Reuse
`reviewState` only with approval observation disabled or sufficient pure helpers.
It may prepare a valid enrolled Draft review; server launch readiness is not
specification approval, packet readiness or host capability. Detect inconsistent
reads rather than combine source versions, silently rebase or reenroll. Every
new/recovery invocation starts with fresh preparation and actual main-agent host
checks; later reads/submissions/final assessment keep their own freshness checks.
Exact schema names are frozen by this proposal's accepted implementation, while
private helper names stay flexible.

Add a narrow scenario, logical name candidate `specification_review_submit_batch`,
inside the existing MCP package. A judge submits its own batch against a pinned
review/source snapshot. An older physical ledger context caused solely by another
judge's saved append must not require agent-to-agent context transfer. The new
operation still rejects changed source/review identity, foreign receipts, invalid
verdicts, incompatible repeated content and overwrites. Keep existing
`specification_review_record_batch` and generic strict-context mutations unchanged
in their public behavior; do not make stale checking optional globally.

Reuse `validateVerdict`, current review input archives and existing managed journal
persistence. Place cross-process lock acquisition/current-state validation in the
state owner, with a bounded wait/backpressure path specific to this scenario: a 5-second lock-acquisition deadline, observing cancellation before an uncommitted wait/commit.
Re-read and check the current review/source, retry identity and saved item coverage
under that boundary before committing. An in-process queue or mutex alone cannot
protect multiple MCP processes. Do not introduce a durable job inbox, background
consumer or agent-side write-token protocol.

Batch persistence is all-or-nothing. Return saved acknowledgment only after the
owning persistence boundary completes; preserve its existing flush/atomic-replace
guarantees without claiming stronger power-loss durability. The submission's
logical retry identity must be review-scoped and bound to exact content rather
than its incidental opaque physical context. Resolve lost responses, repeated
identical submissions and server restart without duplicate/overwritten verdicts.
The existing 64 generic receipts cannot alone guarantee that contract. Exact saved replay is checked before rejecting new writes to a completed review. Keep any
necessary submission retry metadata atomic with verdicts in the existing managed
journal; The confirmed retention is the retained review's whole lifetime; implement the smallest schema-compatible atomic replay representation. Conflicting content,
unknown effect, exhausted waiting and a crash-held lock must have explicit safe
results/recovery. Do not automatically remove a crash lock or promise cancellation
rolls a commit back.

Preserve existing `materialize()`/`reviewBody()` serialization and archived receipt
identities. Do not solve append ordering by sorting/reformatting existing sources.
Reuse authoritative `shared/schemas/decisions.schema.json` only if S0's accepted
retry state actually requires a schema extension; never add a parallel schema.
Publish both callable scenarios through current server registration and output
budgets. Keep state isolated by project/specification/review, not a global mutable
submission cache. Private function names are flexible; public input/output and
error contracts must be fixed by the revised specification and agreement.

Add `packages/engineer-agent-workflow-mcp/test/review-workflow-preparation.test.mjs`
with real scenario fixtures: one preparation call on an already enrolled target
returns the complete bounded arguments; wrong/missing/stale/completed targets,
large unequal-weight inventories, bounded lane continuations and server prerequisites produce the specified results. Prove
no enrollment, approval observation, reservation or managed-byte mutation through
public status/history plus hashes of owned temporary artifacts, without parsing
their YAML or exposing state. Test a Draft-to-Approved author edit whose checkpoint
is still absent: preparation must not record it. Source drift during preparation
must not produce a falsely coherent ready result. The server must not certify
unobservable native hooks or model routes. Advance other lanes while reusing a
plan cursor across two MCP processes/restart: ownership and initial prefix remain
stable. Missing/tampered prefix and changed source block; >160 items continue.

Add `packages/engineer-agent-workflow-mcp/test/review-submission.test.mjs` using
existing stdio fixtures. Test two distinct MCP processes against one temporary
project, forced overlapping submissions, saved ACK order, retries after dropped
response/restart, changed payload/source, invalid batch atomicity, bounded
contention and unchanged strict-tool conflicts. Cover the agreed retry horizon
beyond 64 unrelated mutations. Observe public tools/results and fresh processes;
do not read managed YAML or expose protected mutable state to prove persistence.

Bind the additional exact `Corrections and repeat-review scenario` heading of
`tasks/plan.md`. Derive full/followup mode from the enrolled MCP review, not a
caller-selected subset. Preserve carried provenance and compute N/W/R only from
pending work. Add bounded continuation over the current followup mandatory
item references, including already-saved mandatory results, for the final actor;
keep it separate from pending-only allocation cursors. Return references/flags,
not verdict bodies, originals or read receipts. Bind continuation to source/review
and current mandatory-set identity; expansion invalidates old reference/allocation
cursors while a fresh preparation can reuse the same unfinished followup.

Reuse existing impact/start/expand/consistency semantics without modifying old
body serialization or generic stale checks. P00 does not choose eligibility or
enroll a followup during preparation. Test actual carried-vs-pending selection,
saved mandatory reference discovery after restart/expansion, current result reads
through existing review_get, prefix invalidation and byte budgets with real MCP.
No new ledger, generic read API or additional service is introduced.

Extend the same planned preparation scenario with the final-stage selection and
bounded assessment/completion-only arguments from the exact `Final-stage efficiency
and recovery` heading in `tasks/plan.md`. Reuse authoritative saved consistency and
current detailed-result checks; never trust a client flag or mutate completion
inside preparation. Test real read-only final preparation, missing saves, restart
with current saved positive/negative consistency, and invalidated evidence. Observe
public status/history and isolated artifact hashes; apply shared PROVE controls.

## Technical agreement

Selected `proposal_id`: `P00-final-stage-preparation-v5`; `packet_id`: `P00`.
`proposal_digest`: `ed7a3942510cf7bafa015e136e0e4b7caaacd44b14a5d89a2fd0a80d8cd57fbc`.
Exact `agreement_ref`: `03198f6a-b580-4166-84b0-ebcc0e21b122`, revision 8.
Current managed question: `03198f6a-b580-4166-84b0-ebcc0e21b122`, revision 8.
MCP `planning_packet_check`: `ready` against the Approved inputs above.
Exact source headings: `Technical proposal (this packet)`,
`Shared technical commitments (plan.md)`,
`Final-stage efficiency and recovery (plan.md)`,
`Corrections and repeat-review scenario (plan.md)`.

The actual current response annotation says: "Да, давай укажем это в плане",
accepting the quoted three final-review optimizations. Each revised managed
record preserves that actual answer and its annotation provenance; no new native
question response is invented. Prior exact agreements remain immutable history.
The four-review Harness trial count is unchanged. Recheck these exact bindings
before/after execution. Technical readiness grants no implementation, live-trial,
installation, shared-runtime refresh, commit or publication authority.

## Delivery details

### Prerequisites and allowed writes

S0 and the new current technical agreement are required. Use a usable Git worktree,
inspect tracked/staged/untracked overlap and preserve unrelated changes. No clean
tree/commit gate. Reverify the owning symbols before execution:

- `packages/engineer-agent-workflow-mcp/src/state.ts:377`: `mutate`, exclusive
  `.workflow-lock`, current BUSY/CONFLICT behavior and 64-receipt window.
- `packages/engineer-agent-workflow-mcp/src/reviews.ts:67`, `:151`, `:283`, `:306`:
  `reviewState` (default approval observation can write), validation, batch mutation
  and completion. Reuse its existing read-only mode for preparation.
- `packages/engineer-agent-workflow-mcp/src/review-model.ts:85` and
  `src/review-followup.ts:205`: receipt and materialized input identities.
- `packages/engineer-agent-workflow-mcp/src/server.ts:31`, `:103`: registration.
- `packages/engineer-agent-workflow-mcp/test-support/stdio-harness.mjs:14`:
  isolated real stdio fixtures.

Allowed future writes: bounded MCP state/review/registration owners above,
existing tool-schema/error and pure context/scope/check readers reached from
registration, the new preparation/submission tests and directly related existing
review concurrency/batch tests;
the authoritative decisions schema only if the agreed journal extension needs
it; this bundle's checklist/current handoff. No generic state refactor, reader
throughput rewrite, native assets, global installation or unrelated schema change.
Generated build outputs use existing package build ownership, not hand edits.

### Test-first acceptance

Repository root; Node >=22.20.0 and existing dependencies. Create the new test
before implementation, observe relevant one-call/read-only preparation and
concurrency/saved-ACK RED, then fix implementation. A missing-tool error alone
does not prove preparation correctness or persistence safety.

| Criterion | Discriminating observation |
| --- | --- |
| One-call preparation | One real scenario call returns exact current target/progress and bounded ready arguments; completed/blocked results never launch work |
| Read-only preparation | No enrollment, approval checkpoint, reservation or managed-byte mutation; repeated calls stay read-only, including after author status changes |
| Preparation coherence/bounds | Wrong/stale targets and mid-read drift cannot yield mixed ready data; large inventories continue through weighted lane cursors within published byte limits, without a total-item cap |
| Host boundary | Server readiness does not claim native hook/model/permission availability; actual main-agent checks remain required |
| Concurrent independent appends | Two real processes read the same review, submit disjoint valid batches concurrently and both persist; no model/context relay |
| Saved ACK | An acknowledged batch survives process restart and is visible through public status/get; failure before commit never reports saved |
| Atomicity/idempotency | Invalid member commits nothing; identical replay has one durable effect; changed payload conflicts; lost reply is reconciled after restart and receipt-window pressure |
| Isolation/freshness | Changed source, foreign review/receipts and overlapping incompatible verdicts fail without overwrite; ordinary strict tools still reject stale context |
| Bounded recovery | Controlled held lock reaches specified bound; cancellation/termination reports saved or unknown honestly; no automatic crash-lock deletion |
| Compatibility | Actual previous read continuations/input receipts still reconstruct the same text and old scenario tests pass |

Use controlled process/transport coordination and bounded deadlines, not fragile
sleep races or production delay knobs. Apply PROVE by enabling approval observation
inside preparation, accepting a mixed-source preparation result, acknowledging before save,
bypassing the lock/source check and forgetting retry state in disposable variants;
each relevant assertion must fail. Restore mutations and run focused regressions.
The following commands are for later execution; both preparation and submission
tests are to be created:

```bash
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/review-workflow-preparation.test.mjs packages/engineer-agent-workflow-mcp/test/review-submission.test.mjs packages/engineer-agent-workflow-mcp/test/review-concurrency.test.mjs packages/engineer-agent-workflow-mcp/test/review-batch.test.mjs packages/engineer-agent-workflow-mcp/test/review-read-efficiency.test.mjs
rtk proxy npm run lint --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy git diff --check
```

### Completion and recovery

Recheck revised source and exact agreement, inspect the scoped diff and required
results, then update `todo.md`/`handoff.md` and stop after P00. Failed or unavailable
required checks keep P00 incomplete. Reconcile uncertain writes through public
MCP state/retry scenarios; never delete history, manually patch managed YAML or
refresh the shared running MCP. Roll back only known packet files. Further packet
execution, commits, installation and publication need separate authorization.
