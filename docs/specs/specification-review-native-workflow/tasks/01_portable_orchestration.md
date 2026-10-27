# P01: Portable Direct-Submission Review Orchestration

Status: Technical agreement ready; parent waiting included; implementation not started

## Approved inputs

Reviewed specification: `source_version` = `73f93f290e0ee7f969abc43af3121ea341dbe82a1db897896c27c678d09e7f43`;
`specification_version` = `969d6857c4f6decb623d7b60d841223057289f9dc0fb94f85fa4291f573ade2f`;
`review_ref` = `442a54a2-2c8a-4cf0-b3eb-44e9e77edb05`.
S0 completed revised NWF-006/007/009. Read
exact revised NWF-001 and NWF-003 through NWF-011, plus NWF-014/NWF-015 through MCP.

## Technical proposal

Candidate `P01-parent-await-v6`, packet `P01`, includes the exact
`Shared technical commitments` heading of `tasks/plan.md`. Inputs are P00's
published preparation/continuation and review-lifetime-safe submission contracts.

Create the canonical body at
`skills/spec-driven-development/workflows/specification-review.body.js` and
literal `specification-review.meta.json` beside it. The body uses native hooks
only; P02 owns assembly and main-agent entry. Metadata has stable feature/phase
names without routes, secrets or private paths.

1. The main agent checks actual native/model routes and makes one preparation
   call. Blocked/completed results launch no judging work. Validate ready arguments,
   source/review, K/R, initial groups and server-issued lane cursors before dispatch;
   no inspection child or assumed direct-MCP API. Server readiness cannot replace
   host checks. Use actual lower host admission limits.
2. Use the confirmed workload formula and stable weighted groups under the shared
   commitments. At most four nonempty lanes run concurrently. The script holds
   only active cursors/summaries, not all assignments or originals. No 160-item,
   17-child or 20-outstanding-item overall cap. Real native limits still terminate
   with acknowledged progress and explicit incomplete recovery.
3. Start one independent judging child for the lane's current group. It obtains
   bounded current group metadata through P00 continuation when needed, consumes
   all exact originals/continuations and reviewer/profile references, judges meaning
   and submits its own supported batches. It returns actual saved summaries and
   the next server cursor. A metadata cursor is not an exact-read receipt. A group
   needing split submissions retains every acknowledgment and any unknown effect.
4. A lane starts a fresh child for its next group only after its own saves. Parallel
   loops do not introduce a shared barrier after each group. Already saved markers
   are preserved; a foreign/null/partial/duplicate/malformed result stops new
   dispatch and accounts for in-flight effects. Findings alone allow remaining
   valid checks. No writer role or worker-to-worker physical-context relay.
5. After all lanes finish, JOIN and use one read-only final preparation within
   the final actor instead of an open/status/readiness chain. If an assessment is
   needed, that independent actor consumes the full required specification/outcomes,
   records consistency and requests strict completion. Missing saves block dispatch.
   On recovery, a current saved verdict takes the main actor's completion-only
   branch without another judge. Preserve saved results; the author separately
   checks freshness before Approved.

Each next-group child has a fresh exact context, so the reviewer does not accumulate
an unbounded backlog. A heavy single item remains with one actor; if exact delivery
cannot fit actual budgets, report incomplete rather than split semantic ownership.
Recovery repeats preparation against current saved progress; prior uncertain writes
must be reconciled, not rolled back by assertion. Respect Claude replay and pinned
Harness restart constraints. Private helpers for argument validation, lane loops,
saved-summary validation and final dispatch stay flexible; no global mutable cache,
MCP SDK, file access, general framework or model launcher is added.

Add `tests/specification-review-workflow.test.mjs` with existing Node tools and
controlled native-like hooks. Establish relevant RED before implementing the body.
Assert observable allocation/concurrency/continuation/save/final events, not helper
layout. Exercise K=20 formula results for equal/unequal text, single heavy item,
lower host limits, empty lanes, delayed acknowledgments, >160 items and host-limit
interruption. PROVE must detect an arbitrary run cap, wrong coefficient, ignored
weights, group barrier, separate inspector/writer, skipped item or early final gate.
Restore mutations. Hook tests prove scheduling, not native/model comprehension.

Bind the additional exact `Corrections and repeat-review scenario` heading of
`tasks/plan.md`. One body accepts server-enrolled full or followup reviews and
uses pending groups only. Return actual completed gaps to the main author; never
edit spec, invent fixes or enroll another run inside the body. The authorized
parent owns changes/evidence/fix links, eligibility and repeated invocations.

A native checker that identifies inherited cross-impact returns exact keys/reason
as a bounded workflow-local expansion request. Stop new dispatch, quiesce/account
for launched operations and return incomplete for the parent's strict-context
expansion and fresh preparation. A quiescent final checker can expand directly.
No old cursor/consistency receipt survives that transition. Preserve all valid
saves; the next invocation uses the same unfinished review when source/scope
remain valid. Final followup reads current mandatory recorded outcomes using
bounded reference metadata and existing exact get, then whole context under
REV-003. Never schedule every inherited source as a new detailed check or treat
carried_from as fresh consumption. Add controlled tests for the complete outer
cycle, review-only no-edit scope, expansion/reprepare and no automatic rerun of
unchanged gaps; apply the scenario's absence/freshness PROVE controls.

Bind the exact `Final-stage efficiency and recovery` heading in `tasks/plan.md`.
Use one final preparation, conditional final-judge dispatch and same-actor
programmatic cursor iteration only with verified tool/context/result budgets.
Retain ordinary exact reading as the supported fallback. Recovery after saved
consistency takes the main actor's completion-only branch without a judging child.
No direct MCP/file API is assumed in the workflow VM. Add hook controls for exact
delivery, both interruption boundaries, stale evidence and negative consistency;
apply shared PROVE controls.

Bind the exact `Workflow ownership and parent waiting` heading in `tasks/plan.md`.
After dispatch, the main actor yields to the single native call; scheduling, joins
and collection stay inside the workflow. Add no parent polling/model coordination
loop. Controlled entry/runner traces must detect extra parent status calls while
the workflow is pending and preserve terminal/cancellation/cleanup handling.

## Technical agreement

Selected `proposal_id`: `P01-parent-await-v6`; `packet_id`: `P01`.
`proposal_digest`: `16a93ecf9a7031eae430209f508ae9f3b75daa25e07bd673e8443d71d4b55cdf`.
Exact `agreement_ref`: `c1c31185-44a6-471e-b12e-3bb9e93ca1ba`, revision 12.
Current managed question: `c1c31185-44a6-471e-b12e-3bb9e93ca1ba`, revision 12.
MCP `planning_packet_check`: `ready` against the Approved inputs above.
Exact source headings: `Technical proposal` (01_portable_orchestration.md),
`Shared technical commitments` (plan.md),
`Corrections and repeat-review scenario` (plan.md),
`Final-stage efficiency and recovery` (plan.md),
`Workflow ownership and parent waiting` (plan.md).

The current direct user instruction explicitly requires parent handoff, no
status-polling model turns and foreground waiting for the verified Harness call.
Each managed revision preserves the actual instruction and its provenance;
no new native-question response is claimed. Earlier accepted choices remain in
their immutable history. The four Harness reviews are unchanged. Recheck exact
bindings before/after execution. Technical readiness grants no implementation,
live-trial, installation, shared-runtime refresh, commit or publication authority.

## Delivery details

### Prerequisites and allowed writes

Require S0, completed P00, a new current agreement and separate P01 authority.
Inspect Git tracked/staged/untracked changes and overlap; no clean-tree/commit
requirement. Reverify inventory/status/get/completion at
`packages/engineer-agent-workflow-mcp/src/review-model.ts:20` and
`src/reviews.ts:224`, `:249`, `:306`; exact final context at
`src/review-followup.ts:205`. Resolve P00's actual scenario schema from callable
tools. Existing reviewer ownership is at
`skills/spec-driven-development/references/completeness-review.md:34`; do not
assume its earlier no-reader-write wording already supports this revision.

Allowed future writes: the canonical body/metadata pair, new focused workflow
test, a minimal test-only wrapper under `tests/lib/` only if needed, and this
bundle's checklist/handoff. P02 owns distributed reviewer-entry guidance; P00
owns MCP code. No source-specification, managed YAML, global or installed writes.

### Test-first acceptance

Repository root; Node >=22.20.0 and existing dependencies. Create the test and
observe relevant RED before implementing; an import failure alone is insufficient.

- Inputs: 0/1/15/40/100 and >160 items, Unicode code-point boundaries and
  unequal weights. Assert N/W/K/R, maximal weighted groups, heavy-item ownership,
  host caps, stable lane allocation and bounded metadata. No total-item stop is
  introduced by the test harness or body.
- Hold one lane's saved response while another advances through later cursors.
  Final assessment must still wait. Current saved markers cannot reshuffle a plan.
- Every judge makes its own exact reads and submissions. Blocked/completed or
  bad inputs launch no judging child; server-ready but unavailable host never runs.
- Inject partial/null/foreign/duplicate results, lost acknowledgment, source drift,
  host-limit interruption and cancellation with in-flight writes. Distinguish
  saved/remaining/unknown and reconcile through fresh preparation/exact replay.
- Apply the proposal's required PROVE mutations and restore them, then run focused
  regressions. Relevant assertion failures, not missing imports, establish RED.

Commands after the new test exists:

```bash
rtk proxy node --test tests/specification-review-workflow.test.mjs
rtk proxy node --test tests/specification-skill.test.mjs tests/workflow-efficiency.test.mjs
rtk proxy git diff --check -- skills/spec-driven-development/workflows tests/specification-review-workflow.test.mjs docs/specs/specification-review-native-workflow/tasks
```

### Completion and recovery

Check scoped changes against the agreed sources, recheck specification and
technical binding, update checklist/current handoff and stop after P01. Required
failed checks keep it incomplete. Roll back only known packet files; never alter
saved verdict history or imply permission to run P02, install or commit.
