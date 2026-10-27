# PTR-04: Review Lifecycle And Final Judgment

Status: Planned; technical agreement recorded. Execution requires a separate explicit invocation.

## Technical proposal

Proposal ID: `PTR-04-lifecycle-v1`. Packet ID: `PTR-04`. Depends on PTR-01,
PTR-02 and PTR-03. Requirements: IPR-006 through IPR-010, IPR-013 through
IPR-018, IPR-020 and IPR-021. Apply `tasks/plan.md`, `Shared state commitments`.

Implement `packet-review.ts` as the domain owner of stage assignments,
acknowledged unit judgments and complete-run coverage, and
`packet-review-policy.ts` as the pure owner of transition/finalization rules.
`derivePacketReviewVerdict(run)` is the significant deterministic finalization
boundary; equivalent private helper organization remains flexible. Add
`task_packet_review_assign`, `task_packet_review_record`,
`task_packet_review_status`, `task_packet_review_resume`,
`task_packet_review_finalize` and `task_packet_review_report` to the tool
collection introduced by PTR-02. These operations store/inspect review state;
they do not perform semantic review or launch native agents.

Assignments identify their selected source, bounded units, actual actor reference,
role/phase, input/result budgets and expected coverage. All three independent
fact directions (requirements/acceptance evidence, security/trust boundaries,
project rules/architecture/quality) precede a separate main review, which precedes
independent adversarial verification. Empty completed judgments remain different
from missing/null/failed assignments. Main-review units cover all five axes and
feed an integrated cross-unit assessment. A context boundary can continue
unfinished units without repeating valid acknowledged ones. Freshness is checked
at dependent boundaries and finalization; a changed required source cannot
inherit a prior semantic pass.

Store immutable original claims and append their dispositions and normalized
material propositions. Stable run-local IDs link a partly confirmed parent to
confirmed/refuted/unverifiable portions, severity, packet/criterion impact and
evidence. Deduplication preserves affected coverage. Verifiers always assess
positive conclusions and perform a bounded omission check, even for a non-empty
main report. A newly discovered claim needs independent assessment by an already
participating non-originator when material to approval; unavailable continuation
or capacity leaves it unresolved. Do not allocate an omission-only agent, add a
stage, certify an originator's own claim or repeat the full main review.

Keep execution state, assessed coverage, confidence, input mode/freshness and
judgment separate. Deterministic judgment is incomplete for diagnostic/stale
inputs, unfinished stages/effects, unknown material proof or unassessed scope.
For a complete normal fresh assessment, confirmed critical/required propositions
or observed acceptance failures produce request-changes; only optional surviving
comments produce approve-with-comments; otherwise approve. A failed assertion
demonstrating a defect differs from unavailable execution or unfinished cleanup.
Never derive judgment only from the parent finding enum or an earlier reviewer
verdict. Receipts/actor IDs cannot authenticate semantic truth or independence.

Report operations derive bounded per-packet/group conclusions, every criterion's
evidence, finding history, current versus historical proof, limits and known or
unknown next-action owners from the same saved state, with exact continuations.
They do not create a second editable report truth, edit the implementation,
complete a task, modify checklist/handoff or post externally. A new review runs
the complete process; resume preserves same-source acknowledged work and timing
history, without a corrections-only review mode.

Reuse `state.ts` and `requirements.ts` mechanics, not specification-review verdict
semantics from `reviews.ts`. Keep scenario aggregation separate from policy and
source preparation so the later execution-record module can share policy without
an import cycle. Existing specification review and product transitions retain
their current behavior. Evidence: `src/server.ts:31` owns scenario registration;
`src/api.ts:6-25` owns typed scenario boundaries; `src/reviews.ts:67-102` concerns
specification completeness, not implementation correctness (MCP-package paths).

## Outcome, prerequisites and pinned inputs

Implement only PTR-04 after its separate explicit invocation. PTR-01, PTR-02 and PTR-03 complete; their source/readiness/retention boundaries pass.

- Behavioral source: `3da917243e9367c9eec28ebe6662c2787afdde9cc59cd174b45128825e4a62de`.
- Specification version: `7fbb89419df3a1b920b425b161e6cd628f5035fb26ff37437450d521c4d32413`.
- Completeness review: `845484cd-a527-4841-acd1-7e92dc7f4d9b` (Approved, reviewed, consistent).
- Linked requirements: `IPR-006`, `IPR-007`, `IPR-008`, `IPR-009`, `IPR-010`, `IPR-013`, `IPR-014`, `IPR-015`, `IPR-016`, `IPR-017`, `IPR-018`, `IPR-020`, `IPR-021`.
- Technical agreement/digest: use the exact values in `Technical agreement` below;
  `planning_packet_check` must be current at entry and completion.
- Read only linked exact requirement definitions via MCP and the bounded contract
  sections/selectors below; follow every required continuation. Do not reload the
  journal, inactive profiles or unrelated packets. Re-verify cited source evidence.

MCP contract: scenario inventory; Lifecycle and judgment; Structural and semantic validation. Data selectors: run/input/unit/assignment/assessment/criterion/finding/proposition/finalization/event.

Before bulk implementation reads, verify a usable Git worktree and the actual
runner authority/capabilities. A clean tree or existing commit is not required.
Inspect tracked/staged/untracked state and preserve unrelated content/meaningful
attributes. Unknown loss or overlap requires disposition, not a new baseline or
reset. Do not initialize the real project or inspect/copy auth/private files.

## Allowed writes and boundaries

- New MCP `src/packet-review.ts` and `src/packet-review-policy.ts`; extend the packet-review tool collection.
- New package tests `packet-review-lifecycle.test.mjs` and `packet-review-finalization.test.mjs`.
- Only logical review state/report changes. No source fixes, packet/product transitions, handoff/checklist edits or native agent launch by MCP.
- Update only this packet's item in `tasks/todo.md` and current `tasks/handoff.md`
  after all its required checks pass. Required scenario-managed journal writes
  remain MCP-owned; exclude workflow YAML from shell content searches/Git diffs.
- No approved requirement/technical-source edits, other packet execution, consuming-
  project skill mutation, global lifecycle changes or implied external authority.

## Acceptance and discriminating verification

The listed test files are **new to create** unless explicitly marked existing.
Work from repository root. Create each check before the owning production change,
run it, and retain the relevant RED; a missing import/harness alone is not semantic
proof. Implement minimal correct behavior, correct implementation while a correct
check fails, and apply the PROVE rule below. Fixtures must be non-sensitive and
owned; never mutate the original review target to prove a test.

| Criterion | Observable acceptance                                                                                                                                                       | Owning check and evidence                                                                                                                          |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| PTR-04-A1 | Every run requires all three independent fact directions, separate main five-axis/integration review and independent verification/whole-report consistency.                 | Scenario tests including width-one sequential records, clean zero-findings, missing/null/malformed roles and incomplete unit sets.                 |
| PTR-04-A2 | Partial findings retain original history and surviving material portions; a confirmed required part blocks approval while a resolved optional remainder can yield comments. | Truth-table tests for parent/portion severity/disposition and unresolved material proof; independent assessor reference validation.                |
| PTR-04-A3 | Verification challenges findings and omissions even for non-empty reports, without a new omission role or self-confirmation.                                                | Fixture main report has a valid minor issue and missing material defect; existing participant assessment or explicit unresolved state is required. |
| PTR-04-A4 | All input/process/coverage/check/cleanup/freshness combinations derive the specified per-packet/group verdict and complete criterion report.                                | Pure policy table plus transport finalization/report tests; observed assertion failure differs from unavailable runner.                            |
| PTR-04-A5 | Lost/duplicate/conflicting writes and same-source fresh-session resume retain acknowledged units; new review/changed source never skips required phases.                    | Concurrent append, process restart, changed agreement/source and repeated full-run cases.                                                          |
| PTR-04-A6 | Long findings and criterion reports expose complete continuations; established defects remain visible in incomplete results.                                                | Retrieve all material items beyond one page, compare saved/displayed IDs/statuses and action ownership.                                            |

**PROVE:** One at a time, restore the main reviewer's old verdict directly, ignore a confirmed required portion, skip verification when findings are empty, or drop a report page. Intended policy/coverage assertions must fail.

Copy-ready local commands (the new test file must be created first):

```sh
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/packet-review-lifecycle.test.mjs packages/engineer-agent-workflow-mcp/test/packet-review-finalization.test.mjs
```

## Completion, rollout and recovery

After focused checks and required PROVE restoration, run proportionate final
validation. Record actual PASS/FAIL/NOT TESTED, commands, input identities and
limitations; planned commands or another host's result are not passes. Required
failed/unavailable checks keep this packet incomplete. Recheck the pinned
`specification_check_state` and exact `planning_packet_check`, compare the scoped
diff with the agreed technical commitments, then update only this checklist item
and replace current handoff. Stop after this packet; optional code/security review
and a commit are separate invocations, not completion or next-packet gates.

Retain old run/finding events and unfinished state. New required source means new run. No corrections-only review mode or silent history overwrite.

## Technical agreement

Accepted through the native question tool.

- Proposal: `PTR-04-lifecycle-v1`.
- Agreement: `f96d95be-fc9c-46a8-b6b6-d692e3e59935`, revision `2`.
- Proposal digest: `4c986f75d8c60c11ab7d1c9ddc6472d4171217b260b1ad4d45ea83c7447d1db6`.
- Sources: this packet's `Technical proposal` and the plan's `Shared state commitments`.

Remaining execution details belong outside these hashed sources.
