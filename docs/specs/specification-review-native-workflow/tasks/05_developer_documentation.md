# P05: Durable Native Review Documentation

Status: Technical agreement ready; parent waiting included; implementation not started

## Approved inputs

Reviewed specification: `source_version` = `73f93f290e0ee7f969abc43af3121ea341dbe82a1db897896c27c678d09e7f43`;
`specification_version` = `969d6857c4f6decb623d7b60d841223057289f9dc0fb94f85fa4291f573ade2f`;
`review_ref` = `442a54a2-2c8a-4cf0-b3eb-44e9e77edb05`.
S0 is complete with these reviewed identities. Read exact NWF-001/002/006/007/
008/009/010/011/012/013/014/015 and P04's actual qualification evidence/limitations.

## Technical proposal

Candidate `P05-parent-await-guide-v5`, packet `P05`, includes the
exact `Shared technical commitments` heading of `tasks/plan.md`.

Create `docs/specification-review-workflow.md` after implementation and all P04
required qualification evidence. Durable documentation is warranted because
native scheduling, independent judging actors and multi-process MCP persistence
have distinct responsibilities. Exact reading, saved acknowledgments, bounded
contention/retry, final JOIN and host restart limits would be easy to misconfigure.
Existing Harness/provider and local-development/install documents retain ownership
of their procedures; link them rather than duplicating commands or policies.

Describe supported explicit entry and ordinary fallback, actual capability/model
preconditions, one read-only MCP preparation call, separate main-agent session
workflow/model checks and bounded prepared argument handoff,
absence of an inspection child, independent lanes, each judge's own exact reads and
saved submissions, server-side serialization and its possible waiting cost,
K=20 workload formula, weighted group/lane cursors, actual host/batch limits,
absence of a total-item cap, atomic versus partial-group progress, lost-response
and unknown-effect recovery, and fresh invocation behavior. State that there is
no writer agent or agent-side write-turn queue and no group barrier; all required
saves precede the independent whole-specification/detailed-result assessment.
Explain ready-to-run, blocked and completed preparation outcomes. Preparation
creates no review/reservation/approval; server readiness cannot certify session
workflow/model availability. Repeat preparation and host checks for every new/
recovery invocation; MCP still checks freshness at operation time. The author
separately verifies freshness before
Approved. Model choices remain actual user-owned routes with measured semantic
qualification; do not claim a cheaper model or fewer child calls alone proves
lower total cost.

Document the actual implemented retry identity/retention and contention errors
without reproducing entire schemas. Acknowledgment means saved, not accepted for
later processing. Cancellation is not rollback; do not promise zero waiting,
automatic crash-lock deletion, universal acceleration or token savings without
P04 evidence. Explain the observed limits of Claude replay and pinned Harness
restart. Refer to stable logical operations/symbols, not session hashes or fragile
line numbers. Use a small interaction diagram only if it clarifies the process.

Add bounded discoverability links in README and `docs/index.md`; a focused
cross-reference in `docs/deepseek-harness.md` is allowed where necessary. Do not
expand into unrelated documentation cleanup, new installation commands or root
AGENTS rules copied into distributed skills. Write English using project Markdown.

Before the guide, define practical reader questions and safe executable examples.
Validate examples against isolated qualified targets. A reader who did not write
the feature must identify invocation/fallback, model choices, direct submission,
saved ACK, retry/unknown effects, final JOIN, approval ownership and remaining
installation authority from the guide alone. Obtain required actual delegation/
model consent in the active host. This is document acceptance, not a mandatory
independent code/security review or commit gate. Do not silently substitute
self-review or treat a syntax check as operator comprehension.

Bind the additional exact `Corrections and repeat-review scenario` heading of
`tasks/plan.md`. The guide includes one clear outer-loop sequence: full pass ->
findings -> authorized author fixes -> exact MCP change report/eligible followup
-> same body over pending work -> whole-specification consistency. Separately
show inherited cross-impact -> quiesce/expand -> fresh preparation of the same
unfinished review. Explain actual full-review reasons, review-only no-edit scope,
provisional inheritance and unsupported/unknown-effect stops.

Reader acceptance must distinguish a new native invocation from reenrollment,
carried results from newly checked items, mandatory-result references from receipts,
and partial detailed rechecks from the whole-context read for each new assessment;
a current saved consistency verdict may instead require completion only. Use
bounded examples without claiming fixed recheck counts, token savings or extra
live qualification. Existing installation/provider docs remain authoritative;
P04 still specifies four Harness live reviews only.

Bind the exact `Final-stage efficiency and recovery` heading in `tasks/plan.md`.
Explain read-only final preparation, fresh-assessment/completion-only/completed-or-
blocked branches, and conditional same-actor cursor composition. Every new
assessment still consumes full exact input; current saved consistency permits
strict completion without another judge. Document invalidation, negative verdicts,
lost completion replies and ordinary-read fallback. Reader acceptance distinguishes
preparation from completion and a saved semantic verdict from cached child output.

Bind the exact `Workflow ownership and parent waiting` heading in `tasks/plan.md`.
Explain launch -> hand control to workflow -> wait for the parent tool result ->
handle the actual outcome. Distinguish pinned Harness foreground waiting from
detached wakeup, and forbid parent polling or ending its owning session mid-run.
Reader acceptance must retain required post-result MCP integrity/recovery checks.

## Technical agreement

Selected `proposal_id`: `P05-parent-await-guide-v5`; `packet_id`: `P05`.
`proposal_digest`: `732ef0e1f842e64998a1d0aeb5b9373f6327ac961cd7b5ceb31112dda8520b86`.
Exact `agreement_ref`: `9376beff-ad99-40a1-b760-bba0b18bd2e9`, revision 12.
Current managed question: `9376beff-ad99-40a1-b760-bba0b18bd2e9`, revision 12.
MCP `planning_packet_check`: `ready` against the Approved inputs above.
Exact source headings: `Technical proposal` (05_developer_documentation.md),
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

Require S0, completed P04 required qualification and dependencies, new agreement,
separate P05 authority and available independent reader. Inspect tracked/staged/
untracked overlap in a usable Git worktree; no clean-tree/commit gate. Reverify
stable entry points from P02 and actual P00/P03/P04 contracts/results; do not
turn planning proposals or earlier baseline limits into implemented facts.
Existing map is `docs/index.md:1`; use current README/Harness/local-development
sections as authoritative link targets.

Allowed future writes: `docs/specification-review-workflow.md`, bounded README/
`docs/index.md` links, necessary focused `docs/deepseek-harness.md` cross-reference
and this bundle's checklist/current handoff. No templates, shared rules, generated
bundles, installed copies, global config or publication.

### Acceptance and verification

Define the reader checklist before writing. Verify all local link targets and
example tool names against the qualified runtime; commands must have actual safe
inputs and must not alter global state. Reuse P04 evidence for factual usage claims
rather than rerunning billable trials for prose edits. Ask the independent reader
the practical questions above and record actual results/corrections. Resolve every
required document acceptance failure before marking completion. No separate unit
tests are required for wording; examples and reader acceptance are the relevant
checks, with no unnecessary test framework.

Repository root; focused whitespace command after writing the guide:

```bash
rtk proxy git diff --check -- docs/specification-review-workflow.md README.md docs/index.md docs/deepseek-harness.md docs/specs/specification-review-native-workflow/tasks
```

**MANUAL GATE — independent reader:** actual available reader and any required
host route/delegation choice. Missing required acceptance keeps P05 incomplete;
its owner must be established rather than fabricated. Check current revised
specification/technical binding and scoped changes, update `todo.md`/`handoff.md`
and stop. No install, generation, shared MCP refresh, commit or publication.
