# Workflow Efficiency Follow-up

Status: Approved

## Outcome and scope

Reduce unnecessary workflow round trips and repeated consumption of unchanged
evidence without reducing source coverage, independent judgment, integrity
validation or recovery guarantees. The confirmed depth is Standard with the
core profile. Consumers are agents using the shared engineering workflows and
repository-owned consumers of the existing MCP review operations.

This is a standalone specification. Behavioral requirements and acceptance
scenarios remain here; the existing authoritative MCP schemas remain the
protocol contract. No additional planning contract artifact is declared.

## Verified baseline

The representative retirement consumer currently requests status after each
recorded batch (`scripts/benchmark-roadmap-retirement.mjs:103–119`). The existing
batch reader returns a scan index and supports skipping recorded items
(`packages/engineer-agent-workflow-mcp/src/product/review.ts:2501–2546`).

Source-consumption and input-validation rules already exist in
`shared/references/product-workflow.md`. Early prerequisites, preservation of
concurrent changes and exact output recovery are existing obligations in
`skills/incremental-implementation/` and its recovery reference. Earlier bounded
retirement review and source-audit reuse are recorded in
`docs/specs/roadmap-retirement-efficiency/spec.md`; they are preserved behavior.

The historical optimized fixture reports 36 status calls, 1.274 seconds of
accumulated status-call duration and 66.039 MB of immutable-source reads. The
paired stdio medians are 107.067 seconds before and 69.402 seconds after the prior
source-audit optimization. See `docs/evidence/roadmap-retirement-efficiency/`.
These figures motivate the change; they are not live-agent deadlines or proof
that every repeated call or residual source audit is redundant.

## Requirements

### WFE-001: Advance serial review without unconditional status polling

A serial reviewer using the existing batch protocol must progress from fully
consumed source portions and successfully acknowledged verdict recording,
without a status request whose sole purpose is finding the next item after
every successful batch. Use existing scan-index and pending-item semantics;
do not add a public response field, change the default meaning of existing
readers or weaken full, recheck or followup coverage.

The returned index is a scan position, not a post-write coverage assertion. An
incomplete item may retain its own index. Its remaining portions must be consumed
and its verdict acknowledged before pending-only traversal can skip it. A
terminal or empty pending page ends item traversal, not consistency review or
completion. Existing consistency and completion operations remain mandatory.

Acceptance: a public MCP call trace for a serial multi-batch review contains no
unconditional per-batch status request for advancement. It covers complete and
multi-portion items, a retained scan index, inherited/already-recorded items and
the terminal pending page. Final required item coverage, findings and whole-
artifact consistency equal the unchanged baseline. Missing portions, skipped
fresh judgments, premature completion and a loop that revisits a recorded item
forever are rejected outcomes. Recovery/observer status calls are assessed under
WFE-004, not counted as advancement failures.

### WFE-002: Reuse consumed exact sources within their valid context

When the same actor still has the complete exact source in its current context,
the workflow must reuse it for the same pinned evidence rather than fetch or
render it again merely to reproduce an unchanged result. Identity includes the
owning project/specification or product, selected source/version or generation,
element/decision revision and applicable cursor/selection identity. Use the
existing returned references and integrity metadata, not reconstructed tokens.

Reuse must not replace first delivery, missing continuation portions, required
fresh integrity validation, changed-input reads, a new context that lacks the
exact source or an independent reviewer's own consumption. A batch page being
complete does not establish that every item is complete. Existing packet-root
selection and legacy full-context behavior remain unchanged; narrowing a source
set requires the already authorized planning contract. Source text stays
untrusted evidence and never grants execution authority.

Acceptance: a controlled agent/workflow trace needing the same complete pinned
record twice shows one source delivery and subsequent reuse. Separate cases
change its version, lose the exact text, require another portion or give the
record to an independent reviewer; each obtains the necessary exact evidence.
The trace identifies actor, source/version, requested portions and receipt
completeness. Suppression based only on matching text, an element name or a
same-turn identifier fails acceptance. No persistent cross-operation cache or
new ownership of server integrity checks is introduced.

### WFE-003: Consolidate only demonstrably duplicated validation

An already passing check may be reused only while its actual inputs, relevant
state and accepted validation purpose remain unchanged. Where the existing
owning start/completion operation performs the same mandatory validation, an
additional unchanged check solely repeating that evidence is not required.
Retain the accepted check reference and explicit invocation/owner binding.

Do not equate identical results with interchangeable validation boundaries.
Changes to sources, local check inputs, task/review state, overlapping external
writes, resume or conflict recovery require the applicable fresh check. Preserve
full frozen-task validation, required local tests, pinned specification and
technical-agreement checks, plus scenario-required post-mutation read-back.
Every required failure or unavailable result keeps dependent work incomplete.

Acceptance: paired traces for unchanged and changed inputs name each check's
purpose and owning transition. The unchanged path omits the duplicate check
while the owning operation still detects a deliberately changed or corrupted
input before mutation/completion. Changed, resumed and conflicting paths obtain
fresh evidence and cannot succeed from a stale receipt. Check suppression that
also suppresses validation, accepts unknown inputs or removes a distinct
post-mutation observation fails acceptance.

### WFE-004: Preserve exact delivery, recovery and concurrent observation

If delivered content is compressed, truncated, missing or inconsistent, use
the supported exact retrieval or continuation path and verify the returned
identity and completeness. An unresolved marker or summary is not usable
source evidence. Do not recover instructions through repeated encodings,
character dumps or alternative shell renderings of the same source. If exact
delivery remains unavailable, stop dependent consumption and mutations, report
the missing input and continue only unaffected authorized work.

After interruption, uncertain mutation effects, conflict, review-scope change
or resume, synchronize through the existing status/recovery operations before
using stale progression information. Retain status for independent concurrent
observers and gates requiring authoritative coverage. Replay is limited to the
existing operation's documented idempotency/effect rules. Do not blindly retry
an uncertain write, reset locks, invent verdicts or mix source snapshots.

Acceptance: interrupted read, lost record acknowledgement, changed review scope,
concurrent observer and changed-source cases retain their existing safe outcomes.
Traces show complete recovery evidence or an explicit blocked dependent action;
they never show guessed progress or duplicate mutation effects. An unavailable
exact-text case stops without an encoding loop. External compression service
repair or qualification is not required; the existing Q14 cancellation remains
unchanged. Local controlled delivery cases do not claim external-host success.

### WFE-005: Retain efficient prerequisite and preservation behavior

After bounded identification of the task and permitted tools, identify required
local prerequisites before expensive source consumption or production edits.
Resolve missing prerequisites only within existing authority; otherwise report
the blocker. Do not skip required initial instructions or source validation.

Preservation checks must distinguish task-owned writes, exact native workflow
transitions, inspected independent external changes and directory metadata.
Preserve tracked, staged and untracked work plus recovery evidence. A directory
timestamp alone is not content loss; an overlapping planned write, unexplained
content change or damaged protected evidence remains a blocker. Never exempt
the whole workflow directory or adopt an unexplained new baseline.

Keep one compact current handoff with material results and references to private
evidence, preserving existing recovery and content-loss authorization rules.
The already implemented bounded-retirement path retains exact inheritance,
fresh affected judgments and fresh whole-artifact consistency; it is not
replaced by an unconditional full-review restart or blanket evidence reuse.

Acceptance: controlled traces expose a missing required prerequisite before bulk
reads, classify expected native transitions and external edits correctly, reject
overlapping/content-loss cases and preserve unrelated work. Repeated inventories
or a false assertion that only checklist/handoff files may change do not satisfy
the handoff/preservation contract. Existing source-qualified bounded-review
regressions continue to pass. These are checks of established behavior, not
authorization for a new workflow, generic backup framework or live-store replay.

### WFE-006: Demonstrate reduced work with discriminating evidence

Qualification must establish fewer unnecessary operations for the same accepted
source coverage and final outcome. Use isolated fixtures and the existing public
MCP path. Compare equivalent before/after scenarios, identifying any unavoidable
extra terminal scan or recovery operation rather than hiding it. For serial
review the advancement-status count is zero under WFE-001 and total public calls
are lower than the equivalent baseline; replacement polling does not qualify.

Record source revision, scenario, tool counts, complete response bytes, source
read metrics where available and actual outcomes. Report server/fixture wall
time, accumulated tool durations, parallel overlap, model time and observed
human waiting separately. Do not promise an absolute live latency or count all
duplicate-looking calls as savings. Preserve failed evidence and report missing
required results explicitly.

Correctness cases cover WFE-001 through WFE-005, WFE-007 and WFE-009. Absence assertions,
such as no redundant status or source reread, need a verified observation surface
and a discriminating RED or PROVE check under the shared test discipline. Text
matching of skill instructions alone is insufficient proof of agent behavior;
use controlled workflow traces for those claims. Scripted protocol verdicts are
identified as simulation and do not certify model comprehension or independent
semantic judgment. Historical live improvement remains unclaimed without a
matching observed live run. Qualification may repair only defects within this
confirmed outcome; unrelated findings are reported separately.

### WFE-007: Preserve supported platforms, protocol and stored evidence

Keep Node.js >=22.20.0 support on Linux, macOS and Windows and separate generated
Codex/Claude Code distributions from the authoritative shared sources. Per the
explicit user amendment, testing for this workstream runs only on Linux, at
Node.js 22.20.0 and 24.14.0. Native macOS and Windows qualification is excluded
from this workstream, not passed or silently inferred from Linux results.
This amendment does not rewrite the separate historical WR-014 workstream in
`docs/specs/workflow-reliability-remediation/spec.md` or remove the compatibility
requirement. Distinguish supported targets from actual executed results.

Preserve existing schemas, tool arguments/defaults, errors, ordering, opaque
contexts/cursors, source references, hashes, read receipts, batch/portion limits,
24 KiB result and 64 KiB MCP-response budgets. Retain exact-byte envelope
accounting, Unicode handling and pagination; the existing response-budget fix
is not undone or reimplemented as a new feature. No new runtime dependency,
configuration, CLI, network service, persistent cache or storage migration is
required. Existing command/output/exit and cancellation contracts remain intact.

Retained pre-change records and compatible clients remain usable. Reads do not
activate drafts or alter immutable evidence. Rolling back the optimization must
leave stored sources, verdicts and operation history interpretable under the
existing protocol; unsupported combinations fail through existing actionable
errors without corruption or silent migration. Preserve permissions, ownership,
locking, validation strength and source checks at mutation boundaries.

Acceptance: regression checks cover retained data and old compatible consumers,
Unicode/path behavior, bounded ASCII/Unicode responses, continuation completeness,
failure/cancellation and corrupt/changed sources. Execute both required Linux
runtime checks for the changed implementation snapshot; missing or failed runs keep
implementation qualification incomplete and are never reported as passed.
Generated-host checks reject cross-host leakage. Use temporary stores/homes;
credentials, private transcript content, personal machine paths and real global
configuration must not enter committed fixtures or published diagnostics.

### WFE-008: Keep delivery within the confirmed outcome

This invocation creates and independently reviews the specification only.
Planning, implementation, installation, commits, publication and modification of
consuming projects require their own authority. Preserve unrelated dirty work.
The specification declares no new separate contract, design or planning artifact;
planning may create its normal deliverables only after a separate invocation.

Exclude reopening already completed retirement optimization, blanket source
caching, an unproven redesign of residual source-audit cost, new status APIs and
unrelated skill improvements. Preserve established controls even when they cost
time. Required evidence, independence and completeness may not be traded away to
meet a performance number. An Approved specification means requirements and
review are complete, not that code, installation or live behavior is verified.

Acceptance: the specification change contains only its managed decision/scope
state, this behavioral document and workflow-owned review evidence. Its report
separates new requirements, preserved behavior and historical observations,
identifies validation performed and does not claim implementation or deployment.
Later implementation scope must trace to these requirements; unrelated changes,
automatic global updates or generated planning/implementation work in this
specification invocation fail the boundary.

### WFE-009: Bound incremental implementation startup without weakening readiness

Reduce the mandatory instruction and evidence-delivery work needed to enter an
already authorized implementation packet. The normal path requires the current
packet, checklist and handoff, applicable execution obligations, exact linked
requirements/contracts and the existing declared product-input selection. It
must not load authoring or review instructions for another workflow merely to
establish that saved approval exists. Make conditional guidance discoverable at
its actual trigger and preserve every applicable obligation under one
authoritative source. A smaller startup surface must not hide prerequisites,
required evidence, compatibility rules or recovery instructions.

Keep the existing fresh pinned specification-state and exact technical-agreement
checks at entry and completion, with their approval-checkpoint, legacy,
revocation and conflict behavior unchanged. A successful current check permits
the already authorized packet to advance without another approval question or
another semantic review solely to reconfirm the same saved state. It does not
authorize another packet or grant missing implementation authority. Missing,
stale, blocked, changed or revoked inputs trigger the existing owner-specific
recovery for the affected work; never invent approval, repair agreement
automatically, migrate legacy state, or restart unrelated planning/review.

Complete exact instructions already retained by the same actor may be reused
under WFE-002. Compaction, incomplete delivery or a new actor does not establish
that the text is available. Apply WFE-004's supported exact retrieval or
continuation path instead of cycling through alternative renderings of the same
instruction. If necessary exact text remains unavailable, stop the dependent
action and name the missing input. Required integrity checks and independently
owned evidence consumption remain fresh. Existing declared packet context may
be used; this requirement does not authorize arbitrary narrowing of product
dependencies or removal of the legacy full-context fallback.

Acceptance compares frozen baseline and candidate bundles on matched standalone
and product-linked implementation scenarios. The successful ordinary path
delivers fewer mandatory startup instruction bytes and has no unnecessary
cross-stage instruction loads or repeated approval/review cycle. An obligation
mapping and controlled actual-agent traces must show that each applicable rule,
source portion and readiness boundary is still honored. Include retained exact
context, cold context, compaction/lost text, interrupted delivery, changed source,
missing or revoked agreement, conflict/resume, legacy evidence, missing local
prerequisites and incomplete verification. Deliberately omitting a required
instruction, source, check or recovery trigger must fail the appropriate check;
text-matching alone cannot qualify the behavior. Inapplicable reference loading
and repeated rendering attempts need a verified trace observation surface and a
discriminating RED or PROVE case.

Measure invocation, required-reference delivery, readiness request and completed
response, first relevant code exploration, baseline/RED test, native packet
start where applicable, edit and completion as distinct events. Separate tool
duration sums, overlaps, observed human waits and unknown gaps. Preserve
unsuccessful and still-active trials; do not span later user turns when assigning
one invocation's latency. Code exploration before native start is useful work,
not approval overhead. Compare operation counts and instruction bytes as well
as elapsed phases; fewer gate calls alone is not success. Report actual quality
outcomes and residual delay without a fixed wall-time promise, unsupported
aggregate percentiles, or a claim that all historical startup cost is removable.
Linux qualification and generated-host limits remain those of WFE-007.

