# Native Specification Review Workflow

Status: Approved

## Outcome And Scope

Provide a repeatable native workflow that runs the existing independent
specification completeness review on Claude Code and DeepSeek Harness. Move
mechanical scheduling and aggregation out of the parent model's turn-by-turn
coordination while preserving independent semantic judgment and exact evidence.
This is separate from the completed reader-throughput patch and from the
`testing-and-verification` specification; neither specification's product scope
is expanded by this work.

The confirmed depth is Standard with core, cross-surface and operations active.
No new UI, application testing, database, general scheduler, service, lifecycle
installer, autonomous monitor or model-launching MCP capability is requested.
Planning and implementation remain separately invoked stages. The current user
authorizes specification reconciliation followed by technical planning agreement,
not implementation, installation, publication or live configuration changes.

## Supported Surfaces And Evidence

NWF-002 and NWF-013 apply to native Claude Code Dynamic Workflows and DeepSeek
Harness workflow execution. The existing Codex and sequential reviewer paths
remain supported without requiring either new native capability.

Verified documentation on 2026-10-26:

- [Claude Code Dynamic Workflows](https://code.claude.com/docs/en/workflows):
  script-controlled subagent orchestration and reusable plugin workflows.
- [Harness workflow contract at commit 22ddee3792402c3e70ec5f86a63c3e3e895a2f60](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/packages/workflow/workflow/README.md):
  caller-supplied JavaScript, agent/parallel/pipeline hooks, structured results,
  bounded execution and no workflow journaling or restart continuation.
- Existing review protocol: `docs/specs/specification-completeness/spec.md`
  REV-001, REV-002, REV-003; response limits:
  `docs/specs/decision-ledger-mcp/spec.md` LIMIT-001.

Required live native-engine/model qualification is limited to DeepSeek Harness.
Claude Code retains canonical generation and structural/package checks; its actual
native runtime/model behavior is unverified in this delivery. No Claude client,
provider setup or live model trial is required by acceptance. Adding such trials
requires separate scope rather than blocking Harness qualification.

These sources establish design feasibility, not installed-client capability,
host trial success or measured model-token savings. The actual callable schemas
and configured routes must be checked on each qualifying host. No unverified
minimum Claude Code version, OS expansion or universal performance guarantee is
introduced. The Harness baseline is 0.2.1-rc.3 at the commit above; other versions
require compatible capability evidence before qualification. Build and MCP
runtime support retain the collection's existing platform contract.

## Requirements

### NWF-001: Explicit invocation and stage ownership

Run only for an explicit independent-review request or the review stage of an
explicitly invoked specification workflow. Bind the supplied project,
specification and review/source identities. The author starts or resumes the
appropriate review before delegation. The launching main agent makes the single
preparation call in NWF-015 and separately checks the session's actual native
workflow and permitted model routes. No inspection subagent is launched.

The workflow does not choose another specification, run application tests, edit
requirements, approve a specification, enroll a competing review or launch
planning/implementation. Do not mutate the concurrent `testing-and-verification`
review while developing or qualifying this feature.

Acceptance: traces for an isolated target show one preparation scenario call,
host checks and dispatch only for a ready target. Completed/blocked preparation
launches no judging work. Unknown/mismatched targets produce no writes. No
application tests, unrelated review enrollment, specification edit or later-stage
action appears in the runtime trace.

### NWF-002: Capability-aware native execution

Use each host's published native workflow mechanism and actual callable schemas.
Resolve logical MCP names at runtime; never persist session-specific hashed names
or assume identical invocation envelopes. MCP preparation verifies server-side
prerequisites only. The main agent checks the current session's native hooks,
permissions, independent agents, structured results and permitted model routes.
It passes prepared arguments only when those checks succeed. No inspection-model
role, global model change or fabricated host capability is introduced.

Acceptance: required real native/model qualification runs only in Harness;
Claude artifact structure is checked without claiming its runtime qualification.
Both generated artifacts retain the same review obligations. Missing
native capability uses the existing separate-checker path with an explicit
fallback report. Missing independence, preparation, direct-submission or required
enhanced-review support leaves the dependent native path incomplete; no silent
legacy downgrade, separate-writer fallback or installer replaces it. A server-ready
response cannot launch an unavailable host/model route. Actual host route choices
remain with the user under the applicable host policy.

### NWF-003: Deterministic scheduling and explicit terminal outcomes

After preparation and host checks, the executable workflow validates supplied
arguments, uses the server's pending inventory, assigns stable volume-weighted groups to bounded
independent lanes, validates saved summaries, joins all required detailed work,
and dispatches independent final assessment/completion. Each lane advances after
its own saved acknowledgment without a shared barrier after every group. Only the
final assessment waits for all required detailed saves. The same unchanged input
and execution policy produce the same assignment order; semantic judgments need
not be deterministic.

Acceptance: controlled traces show stable assignment despite different completion
orders, no inspection/writer child and no per-group all-workers barrier. Every
run reports completed, incomplete, stale, cancelled or failed with actual saved
progress, known/unknown effects and recovery action where needed. Parsed JSON or
a finished child/script never substitutes for actual MCP completion.

### NWF-004: Complete inventory and clause-level coverage

Account for all server-enumerated current sources, requirement definitions,
active profiles and the final context; do not let the author select a favorable
subset. Retain acknowledged results without overwriting them and keep missing
or failed assignments pending. Review each material condition against actual
requirement text, including exceptions, restrictions, ordering, alternatives
and negative obligations. Matching IDs, links or hashes do not prove coverage.

Acceptance: deleting a source obligation while preserving every requirement ID
still yields a concrete semantic finding. A missing assigned item, duplicate
assignment result or unsupported exclusion cannot yield complete/pass. Equivalent
wording is accepted when the underlying obligation survives.

### NWF-005: Exact evidence belongs to the submitting judge

Each independent judging agent consumes its assigned originals, complete questions
and answers, partial amendments, predecessor history, linked requirements and
applicable active-profile references. Follow every continuation through complete
before judgment and retain exact server-issued receipts. A narrow amendment
preserves unaffected earlier obligations. Lost exact context or a different actor
requires fresh exact delivery; summaries, previews and foreign receipts do not
replace source consumption.

The same agent forms its semantic verdict, explanation and evidence and submits
its own batch through NWF-007. No other agent copies or reinterprets its verdict
for persistence. A group may require several supported batches; retain every
actual saved acknowledgment and distinguish its remaining/unknown effects.

Acceptance: large Unicode/escaped sources and corrections reconstruct exactly.
Each actor's trace contains its own exact reads and submissions. Missing retained
clauses yield source-linked findings/counterexamples. Partial delivery, unavailable
originals and stale/foreign receipts cannot become positive verdicts or fabricated
saved progress. The native body receives bounded saved summaries, not original
text or a handoff of unsaved verdicts to a writer.

### NWF-006: Adaptive bounded independent parallelism

Let N be the number of pending detailed items and L_i the Unicode code-point
length of the complete exact text needed for item i, including its original,
question/answer and amendment history plus linked requirement text. Estimate
w_i = max(1, ceil(L_i / 4096)) and W = sum(w_i). With K = 20, choose
R = min(4, actual host concurrency limit, N, ceil(W / K)); N = 0 needs no detailed
judge. The server supplies authoritative text-size/workload metadata without
replacing exact delivery to judges. Workload units estimate reading volume,
not semantic difficulty, tokens or guaranteed duration.

Assign whole pending items deterministically. Each group contains the largest
stable next-item prefix whose summed weight is at most K, within the owning
20-item submission/read-group bound. A single item heavier than K is assigned
alone, never split between judging actors or silently summarized; actual delivery/
context limits still apply and an unavailable complete read remains incomplete.
Use deterministic balancing/tie rules fixed in planning so unchanged inputs give
identical assignments. Do not start an empty lane. At most four judges run at once,
further reduced by actual host limits, while group size responds to item weights.

There is no separate limit on total items per invocation and no global cap of
20 outstanding items. Continue supported groups until required work is saved;
respect real native duration/turn/context limits and report incomplete with saved
progress if a host limit interrupts execution. Metadata and in-flight actor state
remain bounded/paginated; no read-all-then-handoff-all backlog is introduced.
Each lane starts its next group after its own saves, without a per-group shared
barrier. Protocol failure/cancellation stops new dispatch and reconciles already
launched effects. Semantic findings alone do not stop valid remaining checks.

Acceptance: equal-weight fixtures with 15/40/100 pending items select 1/2/4
judges where supported. Unequal-size fixtures shrink heavy groups, keep every
item with one judging actor and produce stable disjoint assignments. One slow
lane does not stop another's next group; final assessment still waits for all
required saves. Inventories larger than 160 continue beyond item 160 when the host
permits, without unbounded metadata responses. Null/missing/malformed/foreign/
duplicate results remain explicit failure/pending evidence; filtering them cannot
create completion. No source text, expected verdict or author's suspicion is
passed as a substitute for independent exact consumption.

### NWF-007: Concurrent direct submissions and saved acknowledgments

Provide a bounded MCP submission operation for each judge's own semantic batch.
Accept 1–20 items and at most 131,072 UTF-8 argument bytes under existing validation
and result budgets. Validate exact target, unchanged review/source, assignment
membership, complete-read receipts and verdicts. Accept independent disjoint
submissions from the same unchanged review without agent-side write-turn tokens
or passing one judge's latest physical context to another. Concurrent physical
journal coordination belongs to MCP and must work across distinct MCP processes.
Preserve existing strict-context tools' stale/conflict semantics.

Each batch is atomic. Acknowledge only after its verdicts are saved with the
owning persistence guarantees; do not acknowledge acceptance into an unsaved job
inbox or introduce a background consumer/service. Bound lock waiting/backpressure
and report contention/timeout without claiming a save. No overwritten verdict,
global weakening of stale checks or separate writer agent is permitted.

An exact logical batch replay against the same unchanged retained review is safe
for that review's entire retention lifetime, including after server restart or
loss of its original reply. Identity is bound to exact content and review rather
than incidental opaque context. It cannot depend only on a short generic retry
receipt window. Identical replay has one durable effect and reports saved status;
changed content for an already recorded item conflicts without overwriting it.
Missing/corrupt retained evidence, changed sources or an unestablished effect must
produce explicit recovery/blocking rather than guessed success or a blind changed
retry. Keep any needed replay evidence atomic with results in the existing managed
review/journal, not in another durable queue or client cache.

Acceptance: two real MCP processes submit disjoint batches from one source view
and both saves survive restart. A bad member saves none of its batch. Lost-reply
identical replay, also after more than 64 unrelated mutations, has no duplicate
effect; conflicting payload/source/receipt attempts preserve prior results.
A saved response is visible to a fresh process. Controlled persistence failure
never returns a saved acknowledgment. No agent-side context relay or job-inbox
operation appears in traces; actual waiting/unknown effects remain observable.

### NWF-008: Independent whole-specification consistency gate

After all required detailed verdicts are saved, one independent final judging
agent opens fresh MCP context and reads every portion of enhanced final context:
the complete specification and current detailed outcomes. It evaluates cross-section
and lifecycle consistency, records the final verdict with its matching receipt,
and only then requests completion through existing strict-context operations.
It does not copy workers' verdicts. New detailed results or changed inputs
invalidate dependent final evidence. Preserve valid saved results rather than
overwriting them after interruption.

Acceptance: detailed positives cannot hide a cross-section contradiction. Early
final dispatch/receipt, missing normative prose or omitted outcomes cannot yield
complete/pass. Return the actual MCP outcome. The separate author checks fresh
state before its existing Approved transition; neither detailed judges nor the
workflow approve their own specification.

### NWF-009: Failure, cancellation and restart recovery

Respect host limits and cancellation. Distinguish child failure/null, infrastructure
errors, malformed output, exhausted workload limits, contention, saved effects and
unknown effects. Stop new dispatch and new operations when cancellation/failure
is known; let the host clean up its owned children. Already launched submissions
may have committed before cancellation or a lost reply: do not promise rollback
or claim they were rejected. Account for them with fresh MCP status and the exact
safe replay contract before recovery/finalization. Never automatically delete a
crash-held lock or erase saved history.

Every new native invocation repeats the preparation call and actual host checks.
Use current saved results; reread unacknowledged work in fresh judging contexts.
Pinned Harness does not resume script/intermediate values; do not imply otherwise.
Do not use cached Claude child replay as fresh MCP evidence. Changed input requires
the existing fresh-review process, not silent rebasing or reuse of an old pass.

Acceptance: crash/cancel/timeout/API-failure and bounded-contention fixtures retain
saved progress, explicitly identify unknown work and recover without duplicate
verdicts or skipped pending items. A new invocation observes an intervening MCP
change. No unauthorized continued dispatch, false completion, automatic lock
removal or cancellation-as-rollback claim is observed.

### NWF-010: Bounded delivery and honest pagination behavior

Retain the existing structured-result budget of 24 KiB, full serialized MCP
tool-result budget of 64 KiB and exact-text ceiling of 4096 Unicode code points.
Measure real UTF-8 serialization, both content representations, escaping,
metadata and receipts. Follow explicit continuations without truncation,
summary substitution or early complete. Existing smaller portions remain valid.

A host-native workflow orchestrating agents does not itself establish direct
programmatic MCP access. Use a cursor chain without per-page model turns only
when the actual judging actor's environment supports callable tool composition
and retains the complete exact result within its execution/context budgets.
Otherwise preserve ordinary cursor reading and report that limitation.

Acceptance: control characters, long Unicode, partial items and final receipts
stay within actual wire limits and reconstruct exactly. Old 1024-point cursors,
changed page sizes, retry/resume and retained frozen reviews remain compatible
through the owning MCP contract. No undelivered text receives a usable final
receipt or contributes to pass.

### NWF-011: MCP-owned persistence and bounded disclosure

Use scenario MCP for manifest, decisions, catalogs, experience and review archives.
Do not read/rewrite managed files as a shortcut, add a second durable progress
ledger/job inbox, fabricate references/receipts/consent or install a cross-actor
exact-text cache. Local workflow values remain ephemeral; saved results and any
review-lifetime replay evidence are MCP-owned under the same persistence boundary.
Preparation is read-only and creates no enrollment, reservation or approval
checkpoint, even after an author has changed Draft to Approved.

Acceptance: access traces contain no raw managed-file/archive reads or writes.
Preparation leaves owned artifact bytes and public review/checkpoint state
unchanged. Logs, prepared arguments and final reports contain bounded references,
progress and concrete findings rather than credentials, private paths, raw
reasoning or whole-source dumps. Source content cannot authorize commands or scope.

### NWF-012: Measure coordination, tokens and elapsed time separately

Compare native and ordinary review on identical frozen inputs and semantic
obligations. Record read/preparation calls, complete response bytes, repeated
source delivery, deterministic server time, parent turns including host checks,
all judging/final model turns, exposed input/output/cache tokens and end-to-end
time. Separate native overhead, model comprehension, transport and MCP behavior;
measure lock waiting, submission/save/ACK latency, lane idle time and overlap.
No inspection or writer actor is required, but all actual main-agent work counts.
Label unavailable metrics and simulated answers explicitly.

Acceptance: deterministic fixtures prove protocol completeness; isolated actual
Harness native/model trials establish coordination and total token/time tradeoffs.
Claude live trials are outside this delivery's required evidence. A cheaper
model is only a candidate until the same semantic controls qualify it with actual
permitted user-selected routes. No model matrix or extra billable trials is
implied. Do not claim token/percentage savings from a Node loop or fewer parent
turns. Keep native entry explicit; efficiency-default promotion requires actual
qualifying evidence and a separately accepted change.

### NWF-013: Canonical generation and compatible fallback

Keep one authoritative portable review contract and generate isolated matching
host artifacts, using native packaging where that host supports it. The Harness
baseline accepts caller-supplied scripts rather than a saved-workflow registry;
do not require nonexistent saved/nested workflows. Keep artifacts self-contained
with their matching reviewer references and shared resources. Do not maintain
separately hand-edited host copies or add a universal dispatcher/installer.

Acceptance: generation and host-leakage checks pass; existing Codex/sequential
consumers and completed or unfinished reviews retain their existing semantics.
MCP does not launch models. No server restart, global installation, plugin
enablement, publication or configuration mutation occurs without separate explicit
authorization. A disk build alone never claims to refresh the serving tools/schema.

### NWF-014: Isolated qualification with meaningful failure detection

Use test-first RED/GREEN/PROVE and the existing framework. Cover large sources,
retained partial corrections, Unicode/escaping, full reconstruction, partial/
repeated/resumed reads, foreign/stale receipts/cursors, page-size changes and real
retained pre-upgrade evidence. Include bounded grouping/partial members and wire
budgets, direct judging submissions from distinct MCP processes, loss/restart/
review-lifetime replay, conflicting writes, bounded contention and in-flight
cancellation. Test one-call read-only preparation, ready/completed/blocked results,
large bounded windows, changed inputs during/after preparation and server-ready
but host-unavailable behavior. Include final context with every detailed outcome.

Acceptance: controlled fixtures distinguish protocol failure from semantic
findings and include retained-ID clause omission, equivalent paraphrase and
cross-section conflict. Only real native engines/models qualify host hooks and
semantic understanding. Required live qualification is Harness-only; Claude gets
structural artifact checks and remains runtime-unverified without blocking P04.
Absent required Harness trials stay unverified. Use isolated
projects/processes/routes and preserve measured traces. No trial on, restart of,
or installation/configuration mutation to the concurrent real review/server is
performed. Report actual passes, failures, skipped/unavailable checks, next action
and established owner. Do not weaken checks to obtain a pass.

### NWF-015: One read-only preparation operation

Provide one MCP operation to prepare a launch from supplied project, specification
and expected review/source identities, without first requiring an external
open/status-call chain solely to obtain its input context. Reuse the authoritative
current scope, source, review and inventory checks. From one internally consistent
observation return current identities/context, saved/remaining counts and one of:
ready-to-run with bounded native arguments and NWF-006 workload metadata; already-completed with actual
reviewed/gaps outcome and no launch; blocked with concrete reasons/recovery and
no launch. Only ready-to-run returns launch arguments. Include an ascending
bounded first-group/lane inputs, exact workload counts/weights and server-issued
continuations for later groups, excluding final context. Bind the assignment plan
to the unchanged review/source and its initial saved-progress observation so
other lanes saving results cannot silently reshuffle ownership. Continuations
must survive relevant process changes or explicitly require fresh preparation;
they do not need a second durable plan ledger or an unbounded client list. Retain NWF-010 byte budgets;
return no unbounded inventory, originals or complete saved verdict bodies.

Preparation launches no model, creates no review/assignment reservation, changes
no managed state and writes no approval checkpoint. It can prepare a valid enrolled
Draft review; launch readiness is not specification approval, planning readiness
or semantic proof. Missing/foreign/stale/unsupported targets block without silent
reenrollment or rebasing. Detect changes during preparation rather than returning
mixed source observations. Prepared arguments confer no freshness lease; reads,
submissions and final assessment retain their own freshness checks.

The operation verifies server prerequisites only. Main-agent checks own actual
session-native hooks/schema, permissions and user-selected model routes; the
server cannot certify these without an explicit host capability interface, which
is outside this delivery. Missing host support still prevents dispatch despite
a server-ready response. Every new/recovery invocation prepares again.

Acceptance: one real MCP call returns complete bounded launch inputs for a valid
target without preceding open/status calls. Wrong/stale/completed targets produce
the specified no-dispatch results. Large inventories use bounded group/continuation delivery within wire budgets
without imposing a total-item limit. Assignment continuations remain coherent
while other lanes append results; no already saved item is overwritten. Before/after artifact hashes and public review/checkpoint
observations show no preparation writes, including after an author status change.
Controlled input drift cannot yield mixed ready data; a ready result followed by
source drift is rejected by later owning operations. Host-unavailable controls
never launch work on server readiness alone.

## Contract Ownership And Next Stage

Preparation and direct-submission interfaces extend the existing MCP-owned
review contract; unchanged review fields, receipts, inventory and persistence
retain their authoritative schemas; native invocation envelopes remain owned by the host
contracts. This specification keeps behavior and acceptance inline rather than
creating a duplicate schema, architecture model, quality file or second link
table. No additional profile artifact is declared in the confirmed manifest.
Planning realizes the confirmed execution/selection policy under NWF-006 against
actual host limits and produces the ordinary reviewable planning artifacts,
including bounded contention policy and the review-lifetime replay contract.
A material new interface, changed limit or missing required capability returns
to specification instead of being silently added during implementation.

Approval of this specification certifies its source/requirement review, not
native workflow implementation, installation or model-trial performance.
