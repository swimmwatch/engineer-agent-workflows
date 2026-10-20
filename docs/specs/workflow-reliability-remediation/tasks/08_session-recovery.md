# I08 — Recover session operations without duplicate effects

Status: Complete; implementation checks and final independent code/security reviews passed
Dependencies: I07
Requirements: WR-007, WR-008, WR-013, WR-014
Quality scenarios: Q11

## Exact inputs and preflight

- Project: this repository; specification slug `workflow-reliability-remediation`.
- source_version: `345c12557dec017f7dba829464bd36932d866eea21f42c37a1f18b40e8e988b1`
- specification_version: `c1b8042c6009a8a5522f9d5e79a5f25cd10f3104aa980f6aa02886eef49f1efa`
- review_ref: `b4668494-2caa-41fe-ae73-d756aa6082e0`

Working directory for every command: repository root. Node.js >=22.20.0 and the
repository's existing pinned dependencies are prerequisites. Before work and
completion call specification_check_state with the pinned source_version; fetch
only WR-007, WR-008, WR-013, WR-014 through requirement_get using the pinned specification_version,
following every text/reference continuation. Read [C08](../contracts/mcp.md#c08--safe-recovery) and only the named entries in [quality/scenarios.yaml](../quality/scenarios.yaml).
These versioned contracts, not chat history, are the acceptance inputs.

Require a usable Git worktree with readable status and scoped tracked, staged and
untracked evidence. No clean tree or existing commit is required. Capture the
pre-edit state, preserve unrelated changes and reverify the source passages below.
Dependency readiness means recorded passing acceptance evidence for I07, not merely a checked label or a commit.
Also update only this packet's execution evidence, todo.md and current handoff.md.

## Outcome, boundary and scope

Owner: Session request checkpoint reconciled with product operation evidence.
Allowed production ownership: `src/product/sessions.ts`, narrow `src/product/operations.ts` read/replay integration, `src/product/tools.ts`, root product schema, recovery/stdio tests. The coordinator additionally authorized `src/product/interview.ts` for a single shared owning evidence projection and replay identity; `src/product/bindings.ts` registers the new tool in the existing binding contract.
Paths beginning src/, test/ or test-support/ in this packet are relative to
packages/engineer-agent-workflow-mcp/; all other paths are repository-relative.

Evidence to reverify: `packages/engineer-agent-workflow-mcp/src/product/operations.ts:1042` replays complete operations and blocks incomplete ones. `:1062` inspects effects; `:1102` matches exact resume evidence; `:1193` enforces inspected recovery. Public general recovery tools are not currently implemented.

Implementation boundary: Add product_session_resume for a specific retained session checkpoint. Reuse inspectOperation and exact operation/result matching; expose only safe, bounded effect disclosure. Allow at most one automatic exact replay where the registered scenario contract and saved request establish safety. A missing capability, uncertain effect, changed request/context, active lock or incomplete unsupported operation remains blocked with operation_ref and next_action. Reopening/reconciling is a separate explicit action, never implicit re-execution on a new context. Do not expose generic abandon/delete-lock or resurrect unsupported schema-only endpoints. Session checkpoint persistence failure is an unknown outcome until reconciled against actual product effects.

Non-goals: unrelated worktree changes; changing approved behavior or scope;
global configuration, installation, commits, releases; hand-editing generated
bundles or MCP-owned workflow YAML; executing any next packet. New behavior is
not authorized until this packet is explicitly invoked.

## Test-first acceptance and proof

1. Inject interruption before dispatch, after operation persistence, after applied mutation before response, after response before checkpoint and during checkpoint save; assert exactly one effect or explicit unknown/blocked, never false success.
2. Exercise completed replay, expired/corrupt evidence, old server without capability, reordered batch, changed context, active/uncertain lock ownership and cancelled process. Count actual handler effects and ensure replay budget is one.
3. Restart two isolated actors concurrently and prove no shared checkpoint overwrite or blind replay; known safe explicit resume returns the retained result/context.
4. Use existing recovery fault hooks and stdio transport. RED before integration; PROVE no-duplicate/unknown-outcome assertions one mutation at a time.

Tests to create in this packet: `packages/engineer-agent-workflow-mcp/test/product-session-recovery.test.mjs`.
Run the focused command after creating its discriminating checks and before
implementation; new filenames below are planned, not currently existing scripts.
Then implement, correct code until the valid assertions pass, and run required
PROVE. For an absence/structural claim use the stated actual snapshot/counter/trace,
not a copied implementation constant. A harness/import failure is not RED proof.

```sh
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node scripts/run-tests.mjs packages/engineer-agent-workflow-mcp/test/product-recovery.test.mjs packages/engineer-agent-workflow-mcp/test/product-review-recovery.test.mjs packages/engineer-agent-workflow-mcp/test/product-sessions.test.mjs packages/engineer-agent-workflow-mcp/test/product-session-recovery.test.mjs
```




Focused pass is necessary, not permission to skip a material shared-boundary test.
Broaden only for changed shared boundaries, new failures or unresolved evidence.
Record actual environment, commands, RED/GREEN/PROVE results and observed side
effects. A missing or failing required check keeps this packet incomplete.

## Compatibility, recovery and manual gates

Reuse operation receipts; no new product transaction engine or migration. Unknown operation stays incomplete with exact evidence for its existing owner. Version-incompatible checkpoint remains retained; no global recovery command or lock deletion.

MANUAL GATE: Unresolved product recovery remains operator/owning-implementation work; this packet must not expand into a general recovery console.

No automatic user answer, reviewer verdict, installation or publication is allowed.
If a check fails, report the concrete next action and its established owner; when
the external owner is unknown, say so. Never assign a new duty to the user or
downgrade the required check merely to mark the packet complete.

## Completion and stop

Read back the changed state through owning public tools. Recheck the exact pinned
specification and review the scoped final diff, including staged/untracked files.
Mark this packet complete in [todo.md](todo.md) only after its required evidence
passes; replace [handoff.md](handoff.md) with the current result and next eligible
packet. Stop. Separate code/security review and commits are optional explicit
invocations, not completion or next-packet gates.

## Execution evidence — 2026-10-11

The authorized execution workflow requires independent code/security reviews
before coordinator closure. Implementation verification passed; I08 remains
unchecked until those reviews and their dispositions pass. I09 is not released.

- Added `product_session_resume` with expected revision, exact retained request,
  original opaque context and immutable completed operation/result evidence.
  Supported automatic replay is limited to the existing instruction, observation,
  assumption and research handlers. Their owner projection is shared, preserving
  every field, whitespace and array order. No generic recovery API was added.
- Replay budget is durably consumed before the original handler is invoked.
  Unsupported/incomplete/corrupt evidence, changed effects/context, independent
  review changes, active product locks and uncertain session claims stay blocked.
  Bounded `known_effects` reports checkpoint state/phase without claiming safety.
- Acknowledged/delivering responses resend the exact last retained JSON portion,
  including short terminal fragments, source cursor, result context and receipt.
  Cached retransmission performs no dispatch, checkpoint write, counter reset,
  source refresh or additional completed-read credit. An independent later source
  or verdict remains stale; resume does not silently reconcile it.
- Real isolated subprocess exits cover prepared session, persisted operation,
  applied candidate write and original handler response; SIGTERM is also covered.
  Hard exits retain uncertain claims and never resume automatically. Recoverable
  lost responses with released claims and exact completed evidence reconcile once.
  Actual candidate decision heads and all non-session product file hashes verify
  durable effects. Incomplete retained operations disclose bounded known state.
- Final related recovery/session/interview/draft-reader/metadata/binding checks
  passed **133/133** on final source/test bytes; build and lint passed. Generation
  check passed for 17 skills and validation passed 17/17. Installed manual verifier
  and usable Git preflight passed. Before/after pinned specification checks remain
  Approved/pass/reviewed; these mechanical results are not semantic review proof.
- Discriminating RED preceded implementation; separate later RED exposed dropped
  known-effect diagnostics and lost outbound acknowledgement delivery. Invalid
  fixture fields/paths and one `item_count` assumption were corrected against the
  actual owner and are not counted as RED. The narrowing build error is fixed.
- Final isolated PROVE runs restore the original compiled bytes after each
  mutation. Full commands, intended assertion failures and restoration results
  are retained with exact baseline/final snapshots and the incremental packet diff.

Evidence directory: `/tmp/eaw-i08-evidence/`; final suite `focused-final8.log`,
build `build-final7.log`, lint `lint-final8.log`, checks `checks.json`, final source
manifest `final-sha256.json`, incremental `i08.diff` and `prove/` results.
The I07 dependency baseline is recorded; generated runtime/schema bytes derive
from their authority, with no fabricated prior generated-file hashes.

Linux / Node.js v24.20.0 only. No full repository suite, native macOS/Windows,
external Headroom qualification, installed server restart, global mutation,
commit, installation, publication or subsequent packet was performed or claimed.
The implementer stopped after freeze. Coordinator closure verified all 13 frozen
paths again and the exact pinned specification remained Approved/pass/reviewed.
Independent code review passed 91/91 related checks and 4/4 additional recovery
and race probes; report `/tmp/eaw-i08-code-review/report.md`. Independent security
review passed 77/77 related checks and 9/9 additional security probes; report
`/tmp/eaw-i08-security/review.md`. Both verified the same 13 source and 23 evidence
hashes and found no actionable defect. Their runs are separate from author checks.
The original independent code-race fixture error was corrected against the actual
reviewer effect and is not an implementation failure or RED proof.
Coordinator disposition: `/tmp/eaw-i08-evidence/review-disposition.md`.
Only execution bookkeeping changed after this reviewed snapshot. I08 is complete;
I09 is released under the existing authorized execution workflow.
