# I07 — Provide MCP-first sessions and exact read delivery

Status: Complete; revision 2 packet checks and both independent final reviews passed
Dependencies: I03, I04
Requirements: WR-007, WR-008, WR-013, WR-014
Quality scenarios: Q09, Q10

## Exact inputs and preflight

- Project: this repository; specification slug `workflow-reliability-remediation`.
- source_version: `345c12557dec017f7dba829464bd36932d866eea21f42c37a1f18b40e8e988b1`
- specification_version: `c1b8042c6009a8a5522f9d5e79a5f25cd10f3104aa980f6aa02886eef49f1efa`
- review_ref: `b4668494-2caa-41fe-ae73-d756aa6082e0`

Working directory for every command: repository root. Node.js >=22.20.0 and the
repository's existing pinned dependencies are prerequisites. Before work and
completion call specification_check_state with the pinned source_version; fetch
only WR-007, WR-008, WR-013, WR-014 through requirement_get using the pinned specification_version,
following every text/reference continuation. Read [C07](../contracts/mcp.md#c07--mcp-first-logical-sessions-and-reads) and only the named entries in [quality/scenarios.yaml](../quality/scenarios.yaml).
These versioned contracts, not chat history, are the acceptance inputs.

Require a usable Git worktree with readable status and scoped tracked, staged and
untracked evidence. No clean tree or existing commit is required. Capture the
pre-edit state, preserve unrelated changes and reverify the source passages below.
Dependency readiness means recorded passing acceptance evidence for I03, I04, not merely a checked label or a commit.
Also update only this packet's execution evidence, todo.md and current handoff.md.

## Outcome, boundary and scope

Owner: Logical product session context and bounded delivery lifecycle.
Allowed production ownership: Proposed `src/product/sessions.ts`, `src/product/tools.ts`, existing storage/path primitives, root product schema, package session/stdio tests. No standalone client package or new CLI.
Paths beginning src/, test/ or test-support/ in this packet are relative to
packages/engineer-agent-workflow-mcp/; all other paths are repository-relative.

Evidence to reverify: `packages/engineer-agent-workflow-mcp/test/support/product-e2e-harness.mjs:93` updates an actor context after successful calls. `scripts/qualify-product-review.mjs:31` shows a temporary stateful caller. Production product tools remain stateless per input context.

Implementation boundary: Introduce product_session_open, product_session_call, product_session_next and read-only product_session_status. A session_ref owns one candidate's latest opaque context, one pending operation/read checkpoint and one bounded last result under the existing product store. It is separate from OS operation-lock session_id and grants no authorization. Dispatch only caller-named supported product scenarios through their existing validation/handlers; prohibit nested session dispatch and arbitrary commands. Persist caller-provided request identity before dispatch, atomically checkpoint successful context/result, and keep last valid state on errors. Register finite read continuation metadata for supported scenarios; stream exact portions within current response limits and block dependent completion until delivered portions are complete. Do not aggregate an unbounded document into one response. Recovery from unknown outcomes is deliberately blocked until I08, not guessed.

Non-goals: unrelated worktree changes; changing approved behavior or scope;
global configuration, installation, commits, releases; hand-editing generated
bundles or MCP-owned workflow YAML; executing any next packet. New behavior is
not authorized until this packet is explicitly invoked.

## Test-first acceptance and proof

1. Create two isolated logical sessions and execute dependent reads/writes without user context copying; assert each handler receives the correct latest token and cannot cross product/candidate identity.
2. Test absent-context errors, stale writer context, process restart with acknowledged result and review changing author state. Do not silently rebase an unacknowledged mutation.
3. Stream records exceeding response size through product_session_next; detect wrong/non-advancing cursor and version drift. Compare exact reconstructed content and bytes; incomplete delivery cannot issue a usable dependent completion.
4. Before implementation observe public-tool RED; PROVE no automatic answer/verdict fabrication, no cross-session writes and last-page completeness with injected faults.

Tests to create in this packet: `packages/engineer-agent-workflow-mcp/test/product-sessions.test.mjs`.
Run the focused command after creating its discriminating checks and before
implementation; new filenames below are planned, not currently existing scripts.
Then implement, correct code until the valid assertions pass, and run required
PROVE. For an absence/structural claim use the stated actual snapshot/counter/trace,
not a copied implementation constant. A harness/import failure is not RED proof.

```sh
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node scripts/run-tests.mjs packages/engineer-agent-workflow-mcp/test/product-context.test.mjs packages/engineer-agent-workflow-mcp/test/product-interview.test.mjs packages/engineer-agent-workflow-mcp/test/transport.test.mjs packages/engineer-agent-workflow-mcp/test/product-sessions.test.mjs
```




Focused pass is necessary, not permission to skip a material shared-boundary test.
Broaden only for changed shared boundaries, new failures or unresolved evidence.
Record actual environment, commands, RED/GREEN/PROVE results and observed side
effects. A missing or failing required check keeps this packet incomplete.

## Compatibility, recovery and manual gates

Existing tools remain directly callable. Checkpoints store only the bounded exact pending request/result and cursor identity, not conversations or secrets; schema/version errors are explicit. Rollback stops session use but preserves product evidence and checkpoints for a supported runtime; no automatic cleanup.

MANUAL GATE: Do not implement lifecycle commands, skill orchestration, remote state or automatic user/reviewer decisions. Public availability of safe interrupted-write resume depends on I08.

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

The authorized execution-workflow makes both independent final reviews gates for
this run. Implementation checks pass; the coordinator owns review disposition
and the final checklist mark. I08 remains unreleased.

- Installed incremental-implementation engineering-manual verifier passed before
  writes; Git reported a usable worktree. Baseline tracked, staged and untracked
  evidence and exact pre-I07 bytes are under `/tmp/eaw-i07-evidence/baseline/`.
  The existing dirty tree was preserved; staged changes were absent.
- Before/after specification checks reported Approved/pass/reviewed, unchanged
  exact pinned versions and review reference. WR-007/008/013/014 and their exact
  decision references were read through MCP with all continuations.
- Public stdio RED: four new tests completed initialization/drafting and failed
  at missing product_session_open registration, without import/harness failure.
  This is registration RED; semantic guarantees receive isolated PROVE below.
- A subsequent privacy RED demonstrated an actual handler-rejected credential
  reaching a pending checkpoint. Predispatch privacy validation now rejects it
  before persistence; byte and filesystem metadata snapshots remain unchanged.
- Logical session handlers retain one exact request and bounded acknowledgement,
  serialize expected revisions with a distinct exclusive session claim, inject
  their latest acknowledged opaque context, and preserve unknown outcomes for
  I08. No resume, CLI, lifecycle, consent or reviewer-decision engine was added.
- Finite scenario descriptors invoke existing tool input/output validators and
  handlers; unsupported/nested dispatch and caller context/cursor injection fail.
  Ready reads select the retained ready snapshot, without refreshing product head.
- Exact JSON acknowledgements are delivered in at most 2048 code points per
  portion. Source continuations use registered selector/version/progress rules;
  no unbounded reconstruction is stored. Dependent writes wait for delivery and
  review verdicts require this session's completely delivered matching receipt.
- Reviewer-ledger freshness supplements candidate context freshness. Reads reject
  unrelated review changes; writer acknowledgement accepts changed review files
  only when their before/after digests match its exact completed operation targets.
  This prevents silently adopting an independent reviewer write during dispatch.

Verification on Linux / Node v24.20.0:

- Required related context/interview/transport/session/metadata/bindings command
  passed **42/42**. Its initial **39/40** run found the new capability array order
  mismatch; canonical order was corrected without weakening equality.
- Afterwards, the only production change added an earlier request-byte check
  before reference traversal; the existing later byte check remains. Final
  session checks passed **14/14**, including a structurally valid oversized
  public request and missing context. Answer/verdict tests were also strengthened
  after the 42-test run. Unaffected successful boundary checks were not repeated.
- Final build and package lint passed. Generation/check passed for 17 skills;
  complete skill validation passed **17/17**. Scoped whitespace checks passed.
- Public tests cover acknowledged restart; two actual product/candidate sessions;
  stale author and independent reviewer effects; real verdict read-back; Unicode
  exact reconstruction; wrong/repeated/non-advancing/malformed/version continuations;
  partial-read write blocking; concurrent revision claims; and a lost response
  after one actually saved decision. Unknown requests cannot dispatch again.
- Isolated copied-package PROVE reintroduces stale context, shared actor context,
  dropped last source page, status rewrite, fabricated answer, fabricated verdict
  and absent request budgets. Each produced the intended assertion failure and
  restored targeted GREEN. Additional privacy, unrelated-review and source-version
  guards are similarly proved. Live source/dist and real global state were not
  mutated during proof. Logs and mutation commands are under the evidence `prove/`.

The frozen source/test digests, cumulative pre-I07-to-final diff and check records
are in `/tmp/eaw-i07-evidence/`. Build success is not installation evidence. No
commit, publication, global configuration, external Headroom mutation, native
macOS/Windows run or I08 recovery was performed. Independent final code/security
reviews remain pending; the coordinator owns their launch and any correction loop.



## Independent-review corrections — revision 2, 2026-10-11

Both initial independent reviews stopped before this single writer was released.
The coordinator confirmed three P2 corrections: premature terminal source flags,
valid blocked-context delivery, and overbroad credential-signature rejection.
I07 remains unchecked until both final independent rereviews close this run.

The correction changes only sessions.ts, its owning product-sessions tests, an
export of the existing interview privacy validator, and a narrow read-only helper
in review.ts. The coordinator explicitly authorized these two additional owners.
No public tool/schema/checkpoint shape or legacy/explicit review output changed.

- Source coverage validates contiguous Unicode offsets, stable totals, item counts,
  exact cursor progress and terminal coverage. Context source ordering and blockers
  are checked independently: exhausted delivery can preserve semantic complete=false.
  A blocked result cannot grant completed_read credit, even with an injected receipt.
- Review outputs lack public range metadata. Rather than changing that contract or
  retaining an unbounded source, verifyProductReviewDelivery reuses the existing
  owning item/consistency reader with identical context, item, representation and
  cursor. It compares the exact bounded text, source identity, continuation and
  receipt against the immutable owning range. This costs one additional bounded
  read per review portion. Original .run validation remains in force. Source changes
  between primary read and verification block delivery, without rebasing output.
- Sessions use interview.assertNonSensitive before checkpoint persistence. This
  preserves the original word-boundary and credential-URI policy, accepts public
  nonsecret=public prose, and still rejects actual nested credentials before writes.

Evidence is under /tmp/eaw-i07-revision2/:

- Original reviewer probes reproduced intended RED: dropped source 1/1 failed,
  blocked context 1/1 failed, security 2/5 failed. Their unchanged final probes now
  pass 1/1, 1/1 and 5/5 respectively; complete red/green stdout is retained.
- Four new discriminating regressions initially failed 4/4; a genuine complete
  review receipt paired with incomplete text failed the intended fifth assertion.
  The first GREEN attempt passed 16/19 and exposed three incorrect new fixture
  assumptions: resume state, top-level decision text, and missing actual verdicts
  before consistency. The tests were corrected to observed owner contracts; no
  completion or privacy assertion was weakened. Later table subtests expose every
  fault independently, including discontinuous and skipped ranges.
- The final required session/context/interview/transport/metadata/bindings command,
  broadened for changed review ownership to product-review, product-review-hashes
  and product-review-blocks, passes 77/77. Exact arguments, exit and full output are
  related-final2-command.json and related-final2.log. An earlier 75/75 run preceded
  the final readiness-credit assertion and table reporting; it is not final evidence.
- Final build and lint pass. Generation check passes for 17 skills; skill validation
  passes 17/17. Unchanged generation sources did not require regenerated artifacts.
  Scoped whitespace checking and exact before/after specification pins pass.
- Eight isolated copied-package mutations produce intended AssertionError RED and
  restored targeted GREEN: text coverage (all five faults), inventory coverage
  (both inventories), blocked compatibility, blocked receipt credit, privacy before
  checkpoint, safe-prose compatibility, review range with genuine receipts, and
  intervening review-source drift. Full logs, mutation diffs and commands are in
  prove/. Neither live source/dist nor global state was mutated during PROVE.
- Original I07 source/test baseline remains /tmp/eaw-i07-evidence/baseline/.
  Additional owning before-bytes independently match captured I06 review.ts
  aae8f649baaa780aaeb752d2b98c1ebb303c2a59ac945ae183ae9de90d15de4e and
  I03 interview.ts 82c3753ed06a0ce35b5c5d2c65a92480d379750e14a2ae995cdd424857aa7407.
  They were recovered by reversing the isolated narrow edits, then verified against
  those prior captured bytes; they are not claimed as newly captured before edits.
  extra-owner-baseline-provenance.json records their independent origin.
- correction.diff covers exact pre-revision2 to final source/test/doc changes;
  i07.diff covers all ten cumulative I07 source/test owners against pre-I07 bytes.
  Final document snapshots/hashes and their revision2 baseline are separate from
  that cumulative production diff. final-sha256.json hashes all ten source/test
  owners, three execution documents and both diffs.

Executed environment remains Linux / Node v24.20.0. No full repository suite,
native macOS/Windows, external Headroom qualification, installation/server restart,
global mutation, commit, publication or I08 recovery is claimed. Source and execution
documents freeze after these records. The coordinator owns both final independent
rereviews, any substantiated correction release, the I07 mark and I08 release.

## Coordinator closure — 2026-10-11

Both final independent reviews passed on frozen revision 2. Code review ran
57/57 related tests, the unchanged original probes 2/2 and the additional
explicit-v1 continuation probe 4/4. Security review ran 43/43 related tests and
8/8 independent probes, including its five unchanged original probes. All three
confirmed P2 findings are closed; no new substantive finding was reported.

All 15 frozen hashes matched before and after both reviews and again at coordinator
closure. A fresh pinned MCP check remained Approved/pass/reviewed. Reports:
`/tmp/eaw-i07-code-probe/review-revision2.md` and
`/tmp/eaw-i07-security-r2-review.md`. The coordinator disposition record is
`/tmp/eaw-i07-revision2/review-disposition.md`. Execution status documents are
updated after that frozen review snapshot; production/test bytes are unchanged.
I07 is complete and I08 is released to its implementation subagent.
