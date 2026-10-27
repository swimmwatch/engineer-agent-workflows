# Implementation Packet Review

Status: Approved

## Outcome And Boundaries

Provide a separate, explicitly invoked workflow skill that reviews one or more
implemented planning packets against their authorized requirements, technical
agreements and exact changes. Adapt the useful separation in `kap-app` between
fact collection, independent review and adversarial verification. Do not copy its
project-specific runner assumptions or make review an implementation gate.

The confirmed scope is Deep with core, backend and data profiles. The selected
process is complete on every run. Investigating agents can perform necessary
targeted tests and isolated proof mutations during fact collection, main review
and independent verification when reading and valid existing evidence cannot
settle a material review question. Testing is a tool within these stages, not a
separate mandatory late phase. Committed ranges and uncommitted
work are supported. Legacy or stale inputs permit diagnostic review, never an
unqualified positive verdict.

The source investigation and its evidence limits are recorded in
[research.md](research.md). Actual answers and requirement links belong to the
MCP-managed decision history. This document defines behavior, not production
modules, task order, an implementation plan or execution authorization.

## Supported Environments

The generated skill targets Codex, Claude Code and DeepSeek Harness. It retains
the collection's existing host/environment contract and Node.js floor of
22.20.0 for maintenance and MCP execution; the local verified development
baseline is Linux x64. It introduces no additional operating-system certification
or required architecture/version matrix. See `README.md:129-133`,
`docs/local-development.md:1-6` and the MCP package's declared engines.

Harness compatibility is assessed against the repository's pinned baseline,
`0.2.1-rc.3` at `22ddee3792402c3e70ec5f86a63c3e3e895a2f60`.
Other client versions require compatible callable capabilities, not an invented
minimum version. Codex and Harness require real native qualification under
IPR-023; Claude Code requires generation and structural checks only, with runtime
behavior explicitly unverified. Client and MCP support are distinct.

## Requirements

### IPR-001: Separate explicit review and unchanged workflow ownership

Add a separate implementation-packet review skill, using `task-packet-review` as
the working public name. Preserve `code-review-and-quality` for its existing
general change-review role. New behavior starts only from an explicit invocation
that identifies the selected packet or packet group; it does not automatically
follow planning, implementation, another review or packet completion.

Review may write its own MCP-managed evidence and derived report and perform the
isolated proofs in IPR-011. It does not fix the reviewed checkout, edit approved
requirements or technical agreements, complete a packet, change the checklist or
handoff, start another packet, commit, publish or post external comments. Review
is optional and is not a completion or next-packet gate. Reviewing plans before
implementation remains outside this skill's purpose.

Acceptance: an explicit packet-review invocation produces only the authorized
review artifacts and isolated proof effects. Source/checklist/handoff comparison
and invoked-operation evidence show no automatic fixes, packet-state transitions,
commits, publication or subsequent workflow. Ordinary implementation still ends
successfully without an independent review.

### IPR-002: Portable generated artifacts and capability-aware execution

Keep one canonical workflow source and generate isolated Codex, Claude Code and
Harness artifacts with their established explicit-only metadata, guidance names
and question surfaces. Preserve matching-bundle dependencies and shared
engineering/test guidance without separate hand-maintained host copies. Keep
discovery descriptions and skill bodies within the collection's existing limits.

Resolve callable tool names, models, native orchestration, independent contexts,
completion signals and isolation capabilities from the active host. A compatible
native workflow engine may carry orchestration; independent native subagents may
carry the same complete process. Neither path may omit stages or weaken evidence.
Do not require the source project's ambient JavaScript runner on every host.
Use sequential independent contexts when parallel execution is unavailable. If
independent contexts or mandatory MCP capabilities are unavailable, return an
explicit unmet prerequisite instead of self-review or a fabricated pass.

Retain the environments above and reject unsupported capabilities with a bounded
diagnostic before the dependent operation. No automatic installation, global
configuration change, model switch, lifecycle CLI or new OS support is implied.
Model recommendations are advisory; available routes and actual user preferences
take precedence.

Acceptance: all three generated targets pass their applicable packaging checks;
cross-host metadata leakage is absent in the generated-artifact inspection.
An unavailable workflow engine with available independent agents still completes
the same stages. Missing independence, incompatible MCP or an unsupported runtime
produces a prerequisite/incomplete result, never positive review evidence.

### IPR-003: Bounded packet and change selection

Resolve the owning project, specification, selected packet IDs and requested
comparison before broad review reads. Support one packet and an explicitly
selected group. Reuse unambiguous request, plan, handoff and Git evidence; ask a
focused native question only when the baseline, packet attribution or target is
materially ambiguous. A proposed default or silence does not select a target.

Validate identifiers, paths, Git selectors, available packet contents and group
membership. Preserve packet boundaries and explicitly identify shared or
cross-packet changes. Do not expand into all repository changes, unrelated packets
or another specification. Group review includes interactions among its selected
packets without treating unrelated branches as one integrated target.

Acceptance: a selected group receives per-packet coverage and a group-level
interaction assessment. An unrelated dirty file is excluded and preserved.
Ambiguous overlapping changes leave target selection pending; invalid selectors
fail with an actionable error and no invented comparison.

### IPR-004: Exact committed, index and working-tree evidence

Require a usable Git worktree, but no clean tree or existing commit. Support
committed base/head ranges and an explicitly scoped working-tree target including
tracked, staged and selected untracked changes. A repository without a first
commit can review selected additions against an explicitly identified empty
baseline. If Git is unavailable, report the prerequisite without initializing it
or substituting an unannounced comparison.

Identify the exact effective bytes reviewed, the baseline and meaningful file
attributes. Preserve the distinction between index and on-disk content. A
working-tree review observes the selected effective on-disk target and discloses
index differences; an explicitly requested staged-only review observes the index.
Neither may claim to cover the other state. Include relevant deletions, renames,
non-code changes and generated outputs, not only added lines in one language.

Read code, callers, tests and configuration from the same selected target.
Historical changes cannot borrow tests from today's checkout. Proof isolation
must reproduce the selected uncommitted/untracked target rather than silently
checking only HEAD. Undeliverable exact inputs leave affected coverage incomplete.

Acceptance: fixtures with a staged defect fixed only on disk, a historical target
with different current tests, and an untracked implementation file distinguish
the selected state correctly. Evidence records the target identity; none of those
fixtures receives a verdict about an uninspected state.

### IPR-005: Current ecosystem inputs and diagnostic review

For a normal review, resolve the approved specification and its current review
evidence, confirmed manifest, packet requirements, acceptance criteria, declared
contracts, dependencies and exact technical agreement. Consume state through its
owning MCP scenarios, including current specification and planning checks. A
handoff is supporting evidence, not independent authorization for a deviation.

Missing, legacy or stale requirement/agreement inputs allow diagnostic review of
the identifiable code and available obligations. Inventory every unavailable or
untrusted input, identify affected coverage and report how to restore it. Continue
the full process against the available scope without inventing missing promises,
silently accepting a stale agreement or migrating workflow state. Diagnostic
review cannot receive a full positive verdict. An unidentifiable code target or
unavailable mandatory MCP still blocks its dependent work.

Acceptance: a stale agreement allows recorded diagnostic findings and an explicit
coverage limitation, with no `approve` or `approve with comments` result. Missing
MCP produces a capability prerequisite, not direct YAML access or a claimed saved
run. Restoring inputs requires a fresh normal review, not relabeling old evidence.

### IPR-006: Authoritative inventory and reusable mechanical facts

Establish a version-bound inventory of selected changes, separately checkable
packet criteria, linked requirements, technical commitments, applicable guidance,
required checks and available execution prerequisites. Resolve references without
assuming one criterion-ID prefix, language, test decorator or backend layout.
Every selected criterion must have an explicit assessment slot, including criteria
whose code or test is missing.

Gather deterministic facts once per matching input identity and share them as
leads. Reuse authoritative repository checks and existing evidence before adding
special-purpose scanning. A declaration, criterion tag, test name, green command
or syntactic pattern does not prove behavioral coverage. Recompute only when the
owning inputs changed or the evidence cannot support the required observation.

Partition selected evidence into stable, source-bound review units before actor
dispatch. Each unit identifies its packet/criteria, exact source references,
relevant shared constraints and cross-unit dependencies. Establish finite
per-actor input/result and per-run unit limits from advertised host capabilities
or a conservative documented policy. A bounded MCP response alone does not
establish that a reviewer can hold the entire selected group in one context.

Hand actors only the exact units and common constraints needed for their assigned
judgment. A completed unit has an acknowledged semantic assessment and coverage
record, not merely a read receipt. Stage handoffs carry bounded outcome/coverage
records, source references, material findings and unresolved questions; exact
originals remain retrievable on demand. Do not duplicate full project transcripts
or require every actor to reload every packet and contract.

Acceptance: criteria with non-AC/REQ identifiers, deleted behavior and non-Python
tests all enter the inventory. A tagged test that asserts the wrong behavior is
not marked sufficient. Reused mechanical evidence identifies unchanged inputs
and purpose; missing inventory entries prevent complete coverage.
A group exceeding one actor's input budget is partitioned without lost criteria
or silent scope reduction. Its unit handoffs stay bounded and preserve the
original evidence references; unsupported input size produces an explicit limit
and next action rather than truncation or an apparently complete assessment.

### IPR-007: Complete independent fact collection on every run

After preflight, always perform separate fact collection for: requirements and
acceptance/test evidence; security and trust boundaries; and project rules,
architecture and quality concerns. Give each direction its own independent
investigation context and bounded assignment. All directions return
evidence-backed observations, uncertainties and applicability reasons rather than
a final approval. A direction with no material concern still records its completed
assessment and rationale.

Each specialist may initiate and execute necessary targeted checks during that
investigation under IPR-011 and IPR-019, without waiting for main review or final
verification. A required proof that is pending or unavailable leaves its dependent
claim explicitly unresolved; it cannot be presented as a verified observation.
Do not require a test run from every specialist when reading and valid existing
evidence already settle that direction's questions.

These directions feed the main five-axis review; they do not replace it. Their
number of concurrent workers may be bounded by host capacity, but a small packet
or a quiet direction does not permit dropping a direction or stage. Missing,
failed, null, cancelled or incomplete reader output remains visibly unfinished.

Acceptance: both a small clean packet and a multi-packet change have acknowledged
results for all three directions. A security specialist can run a necessary
targeted check before main review, while a direction settled by reading completes
without an artificial test run. A pending check is not reported as a verified
result. Injecting a null reader result prevents a completed positive review
instead of reducing the inventory or producing an empty successful fact list.

### IPR-008: Independent main review against actual contracts

A main reviewer in a fresh context, separate from implementation and fact
collection, reads the exact selected evidence and evaluates correctness,
readability/simplicity, architecture, security and performance. Include tests,
compatibility, error behavior, lifecycle, operational consequences and integration
where the change makes them material. Apply established engineering guidance
contextually rather than imposing speculative abstractions or personal style.

Inspect assertions and relevant callers instead of relying only on assistants'
summaries. Verify handoff deviations against actual current authorization. Do not
reopen settled choices merely as preferences, but do report concrete defects or
violations of authorized constraints. Distinguish introduced defects from
unrelated pre-existing observations. Every selected criterion gets an assessment
of implementation, test/check sufficiency and required RED/GREEN/PROVE evidence.

The main reviewer may also initiate and execute necessary targeted checks for
questions discovered while integrating the directions, including interactions no
specialist identified. It may reuse earlier exact execution evidence only under
IPR-011; it still owns its judgment rather than accepting an assistant's summary
as proof. Testing is not exclusive to fact collection or final verification.

The main-review role may assess bounded units in separate fresh contexts when
the selected evidence exceeds one actor's capacity. This does not remove the main
review phase or its five-axis responsibilities. Preserve acknowledged per-unit
judgments and perform an integrated assessment of shared constraints and
cross-unit/packet interactions. Consume bounded unit outcomes plus exact
cross-cutting evidence as needed, rather than require all raw evidence in one
ever-growing context. A summary alone is not proof of a material conclusion.

Acceptance: a valid authorized alternative is not rejected for personal taste;
a handoff-only unauthorized scope change is not treated as consent. A plausible
but ineffective test or unrecorded required proof receives an explicit evidence
gap rather than coverage inferred from its name.
A newly discovered cross-packet interaction can receive a targeted check during
main review instead of being automatically deferred to the verifier.
A large-group fixture covers all selected units and detects a planted interaction
across unit boundaries. A limit that prevents integrated judgment leaves the
affected scope incomplete instead of being hidden by successful local counts.

### IPR-009: Actionable findings and bounded complete disclosure

Give findings stable run-local identities, packet/criterion associations where
applicable, an exact version-bound location, failure scenario, impact, evidence,
proposed correction and evidence confidence. Distinguish critical/required
corrections from optional advice and information. Do not inflate severity from
unmeasured scale assumptions or report a preference as a defect.

Preserve confirmed, partially confirmed, refuted and unverifiable dispositions
and their evidence. A missing verifier result is not a confirmation. Deduplicate
the same cause without losing affected packets or obligations. Bound each
response, but keep the full material finding inventory available through exact
continuations; a display cap cannot discard blockers or imply unreviewed scope
passed.

Before finalization, resolve a partially confirmed claim into its independently
checkable confirmed, refuted or still-unverifiable portions, with the severity
and packet/criterion impact of each surviving material proposition explicit.
Retain the original claim, its partial disposition and links to the resolved
portions; append verification evidence rather than overwrite acknowledged
history. Do not split incidental prose when it has no different disposition or
impact.

A confirmed critical/required portion is an active blocker even if its parent
finding remains labeled partially confirmed. An unresolved portion that could
materially change approval remains an unresolved material proof. A refuted
portion is not a blocker, and a fully resolved remaining optional portion may
produce approval with comments under IPR-013. Never use the parent enum label to
discard confirmed material facts.

Acceptance: multiple observations of one cause retain their affected coverage;
a refuted hypothesis remains traceable without remaining an active blocker.
More findings than fit one response remain retrievable, and a missing portion
or unsupported finding cannot yield an apparently complete report.
For a compound claim that a secret leaks through two sinks, confirmation of one
required-severity leak and refutation of the other preserves a required blocker.
If only an optional portion survives and all material uncertainty is resolved,
the parent partial label alone does not prevent the appropriate normal verdict.

### IPR-010: Independent adversarial verification

After main review, independent verifier context(s), separate from the main
reviewer and implementer, challenge each finding against the cited source,
callers, requirements, test bodies and complete earlier execution evidence. Read
before requesting execution. Record the disposition and reasons, including
changed severity. Potentially blocking claims that depend on unresolved runtime
behavior require a targeted executable proof or remain unverifiable; absence of
a proof is neither refutation nor pass.

Earlier test runs do not remove the verifier's right to initiate and execute
additional targeted checks or counterexamples under IPR-011. Reusing a valid
execution result requires the verifier's own assessment of its applicability and
meaning; another reviewer having run a green command is not independent
confirmation. Do not require replaying an identical valid check solely because
the phase changed, or forbid a later check because specialists already ran tests.

Always run the verification stage. If there are no findings, an independent
verifier still assesses coverage, required-check status and the proposed positive
conclusion. Before completion it also checks whole-report consistency after all
finding dispositions, so removing a finding cannot leave a contradictory final
verdict. Do not let one reviewer certify their own result by changing a role name.

The already assigned independent verifiers also look for material omissions in
the selected changes, whether the main reviewer reported zero findings or many.
Use the changed-source inventory, affected entry points/contracts, criterion
observation points and cross-unit interactions for a bounded omission check.
Do not add an agent, role or phase for this check or repeat the full main review.
Record the assessed coverage and any new concerns; report unreviewed scope rather
than imply an exhaustive guarantee.

New findings discovered here enter the same evidence, severity and disposition
rules as other findings. Their originator cannot certify their own claim as an
independent confirmation; obtain that assessment within the existing verification
stage from another non-originating reviewer already participating in the run.
That reviewer must assess the relevant originals and evidence independently.
Do not add another agent, role or phase to assess omission-check findings.
Preserve finite budgets and mark material claims incomplete when the existing
reviewers cannot independently settle them.

Acceptance: a deliberately false finding is refuted, a valid defect is retained,
and an untestable material claim remains visibly unresolved. The verifier can run
a discriminating counterexample after an earlier specialist's test, and can reuse
sufficient exact evidence without an otherwise unnecessary duplicate execution.
A zero-finding review with an omitted criterion or known failed required check is
rejected as a positive conclusion by the independent verification stage.
A fixture whose main report contains a valid minor issue but omits a planted
authorization defect exercises the omission check; merely validating the listed
minor issue cannot count as completed verification. Newly found material claims
remain traceable and receive independent assessment before a positive result.
The execution trace attributes the omission check and assessment of its findings
to already assigned reviewers. A dedicated omission-only agent or a repeated full
review fails this acceptance check.

### IPR-011: Targeted isolated checks throughout review

The fact-collection specialists, main reviewer and independent verifiers may
initiate and execute necessary targeted tests and temporary proof mutations
during their own assessment. Use them when reading and valid existing evidence
cannot settle a material review question, hypothesis, criterion or claimed test
effectiveness. There is no mandatory late execution phase and no requirement that
every reviewer run a test.

Choose the simplest adequate execution setting under IPR-012. A harmless check
may use an existing authorized environment, and an already sufficient repository
fixture needs no duplicate isolation. Create a disposable workspace or database
only when the actual check needs it. Any setting must reproduce the exact
selected target, including relevant uncommitted/untracked inputs under IPR-004.
The investigator runs and interprets its own check. A scoped question or
criterion can justify a check before a finding exists; do not require a fabricated
finding or completed main review to permit that investigation. A queued or
not-yet-executed check is not evidence, and its dependent claim remains unresolved.

Use established repository runners, fixtures and already authorized test
infrastructure. Creating and removing the owned temporary workspace and test
database are scoped review effects; this does not authorize installing tools,
starting unrelated services, running a full suite, using production, changing
shared database contents or expanding resource/network/credential access.
No collection-specific execution-slot, reservation or admission mechanism is
required. Existing host permissions and execution limits still apply.

Publish acknowledged execution evidence when obtained. Downstream reviewers may
reuse it only when its exact source, relevant environment/prerequisites, command
or mutation, purpose and required observation still match. A phase transition
alone does not require rerunning it. Changed inputs, a different question or an
insufficient observation require a fresh applicable check. Reuse never
substitutes for independent semantic judgment.

Apply one behavior mutation at a time in the investigator's isolated baseline,
run its discriminating check, capture the result and restore that baseline before
the next mutation. Do not weaken assertions or change the reviewed checkout.
A mutation that does not exercise the intended assertion does not prove the
claim. The same investigator may reuse its temporary environment for a bounded
set of checks if the required reset/restore behavior is preserved.

Record the reviewing role and phase, question, command, selected check, source
and relevant execution identity, actual outcome and observation without secret
output. Distinguish reused environments from newly created resources, with owned
resource references and restoration/cleanup results only where applicable.
Distinguish newly executed checks from valid reuse. A timeout, unavailable runner,
failed prerequisite, unsafe isolation or failed cleanup is explicit; it cannot
be converted to a successful proof or hidden by an unrelated passing check.
Further authority follows the host's existing process.

Acceptance: necessary checks can occur during all three investigation phases
and remain attributable to their reviewer. An early criterion check needs no
finding ID; sufficient evidence can be reused without duplicate execution or
delegated judgment. Ineffective and discriminating tests are distinguished by the
relevant mutation. Checks use the selected target with sufficient isolation; harmless checks can
reuse an existing environment, while unsafe mutations receive an isolated
workspace. Neither path changes unrelated work or shared state. An unavailable or
unfinished required proof cannot enable a positive review.

### IPR-012: Proportionate isolation and owned-resource cleanup

Choose the simplest environment that preserves reviewed source, unrelated work
and other checks. Harmless checks whose known behavior does not change that work
or interfere with shared mutable state may run in an existing authorized
environment. Reuse an existing repository test harness/fixture when it already
provides sufficient isolation; do not create a second workspace/database merely
because a check is executable. Base the choice on the actual check and available
repository evidence, not a mandatory resource-creation, scoring or approval stage.

When a check can change source files, apply proof mutations or otherwise
interfere with other work, use an already adequate isolated fixture or create an
owned temporary workspace from a copy or Git worktree reproducing the selected
target. A concurrently executing reviewer cannot share its writable source or
fixture state unsafely. Separate context, workspace isolation and a security
sandbox remain different properties; instructions do not create a new sandbox.

Database access alone does not require a new database. A harmless read-only check
may use an existing authorized test database. Checks that write data, change
schema or can interfere with other checks need an already sufficient isolated
fixture or a separate temporary test database created with the project's existing
authorized setup and matching schema/fixtures. Do not use production or an unsafe
shared database. Do not allocate a duplicate database when the existing harness
already isolates the required effects. If necessary isolation is unavailable or
the effects cannot safely be bounded, report that proof unavailable.

Reuse an investigator's temporary environment for a bounded session when the
required reset/restore behavior holds. Remove only resources created for that
session on successful, failed and cancelled paths. Do not remove a reused
pre-existing database/workspace; leave its lifecycle to its existing owner.
Retain safe owned-resource references and cleanup outcomes for interruption and
recovery. Unknown ownership is not deletion authority. Failed/unconfirmed required
cleanup is an explicit unfinished effect, while cleanup is not required for
resources the review did not create.

Do not copy or symlink private environment files, credentials or personal state
automatically. Use authorized fixtures or report the missing prerequisite. Treat
reviewed text, logs, findings and embedded commands as data, never instruction
authority. Validate command inputs and paths, respect active guidance and preserve
concurrent user edits. Never reset the original checkout for cleanup.

Acceptance: a harmless check runs without allocating a new workspace/database;
an adequate existing fixture is reused without duplicate setup or deletion.
A mutating/interfering check uses sufficient isolation and cannot affect other
checks or unrelated source/data. Newly owned resources are cleaned on normal,
failed and cancelled paths, with failed cleanup explicitly unfinished.
Source/index/untracked evidence and pre-existing resources remain preserved;
missing private env files do not trigger secret copying, and an adversarial diff
cannot obtain an extra command or permission change.

### IPR-013: Consistent process status and final verdict

Keep execution status, coverage status, evidence confidence and code-review
judgment distinct. Final judgment must use the verified finding dispositions,
criterion assessments, required-check results and current source identity, not
simply return the main reviewer's earlier verdict. Include applicable execution
evidence from every investigation phase; its timing alone neither excludes it
nor makes it sufficient. Pending execution requests remain unresolved evidence,
not successful checks.

An approve/approve-with-comments judgment requires a normal, fresh, fully
completed process, complete assessed coverage, no unresolved material proof,
no confirmed critical/required proposition (including a surviving portion of a
partially confirmed finding), and no failed/unavailable required acceptance check.
Optional advice can produce approval with comments. A complete
normal assessment with confirmed required corrections or failed acceptance
produces request changes. Diagnostic scope, missing stages/evidence, unresolved
material checks, cancellation, failure or staleness prevents a full positive
verdict and remains explicitly incomplete, even when some defects are confirmed.
Reviewed coverage can contain a failing criterion; it is not implementation
success. A successful review is not merge, release or packet-completion authority.

Apply finalization to the normalized material propositions from IPR-009, not
only whole-finding status labels. For a complete normal run, any confirmed
critical/required proposition yields request changes. If material uncertainty
remains, the overall result is incomplete with established blockers still shown.
Only fully resolved optional surviving propositions permit approval with
comments when all other positive-verdict prerequisites hold.

Keep code/check assertion failure, unavailable execution prerequisites and
unfinished resource cleanup distinguishable. A completed check that demonstrates
an implementation defect supports request changes; an unavailable required
observation or unfinished workflow effect supports an incomplete process. Do not
mislabel either as a successful acceptance check or erase an established defect.

Acceptance: refuting the only claimed blocker updates the final result only if
all other positive-verdict prerequisites hold. Missing agent output, a failed
required check or stale input cannot become approval by returning no findings.
Negative findings already established remain visible in incomplete runs.
The same normalized finding portions and process/coverage/check states produce
the same finalization outcome across supported hosts. A partially confirmed
required leak cannot become approval through enum matching, while a wholly
resolved optional remainder is not treated as an unresolved required defect.

### IPR-014: Review report and complete criterion evidence

Produce a bounded human-readable report derived from saved review results. Lead
with final per-packet and group conclusions and material findings. Include exact
target/baseline identity, normal/diagnostic mode, criteria-to-implementation and
test/check assessments, technical-agreement conformance, proof results, refuted
hypotheses, limitations and unfinished actions with the established owner or an
explicitly unknown owner. Separate evidence observed now from prior evidence,
inference and unverified assumptions. Attribute each execution to its actual
reviewing role and phase, and distinguish a newly executed check from reuse of
matching earlier evidence. Do not render all executions as a separate final phase
or silently attribute an earlier run to a later verifier.

Every criterion has a justified assessment, including not applicable, missing or
unverifiable outcomes; a tag-only mapping cannot stand for assertion analysis.
Report run, failed, unavailable and not-run checks accurately. Do not claim
absence of all defects beyond the reviewed scope. Saved and displayed results
must agree; a truncated view identifies its continuation rather than appearing
complete. The report does not edit the authoritative checklist or handoff.

Distinguish current behavioral/test evidence from historical evidence that
RED preceded implementation; an execution performed during review cannot
retroactively prove that sequence. Reference the retained packet-scoped records
in IPR-025 and mark missing required history explicitly. Include actual elapsed
limits/outcomes and bounded-unit coverage so exhausted budgets or unassessed
units are visible in the final result.

Acceptance: the report accounts for the complete inventory, preserved finding
dispositions and all required-check outcomes. An incomplete proof names its next
action and known/unknown owner without inventing a new assignment or omitting
the limitation from the final summary.

### IPR-015: MCP-owned interfaces and source-bound delivery

The separate workflow MCP owns persisted run identity, inventory, observations,
reviewer/verifier outcomes, proof evidence and finalization. Expose scenario
capabilities sufficient to prepare/inspect a run, read exact selected portions,
record each stage and proof, finalize, query status and resume. Proof evidence must be supported within fact collection, main review and
independent verification, including a scoped question/criterion before a finding
exists. MCP stores the evidence and applicable resource/cleanup state; it does not introduce
an execution-slot broker or a separate resource scheduler.
Validate the recorded reviewing role, phase, source and execution state rather than requiring
all proofs to follow completed main review. The planned MCP
contract defines observable inputs/outputs and stable errors, not a generic
arbitrary-file mutation interface. Existing YAML remains accessible only through
its owning scenarios; this workflow adds no direct parsing fallback.

Bind calls to the selected project, specification, run, current context and source
versions. Validate selectors, inputs, references, schemas and compatible runtime
capabilities. Bound responses and disclose ordering, continuation and complete
delivery; all consumers follow every required portion before judging it.
Distinguish invalid input, missing prerequisites/capabilities, stale/conflicting
state, missing evidence, unsupported versions and failed operations with useful
diagnostics. These checks do not authenticate user consent or establish a new
project-authorization sandbox beyond the serving process's permissions.

Support source-bound review-unit discovery, bounded original/outcome delivery,
unit assessment/checkpointing and complete coverage inspection. Logical limits
apply to actor payloads and the whole selection as well as single responses.
Expose unsupported sizes and exhausted budgets without inventing hidden
continuations or treating truncated content as complete.

The same authoritative interfaces must support the IPR-025 producer/consumer
contract for durable packet verification evidence, reusing adequate existing
execution records instead of creating a second owner. Evidence writes are
execution/progress state and cannot change approved behavioral specification
versions or technical-proposal commitments.

Acceptance: wrong-project/run references, corrupt data, partial delivery and
unsupported versions cannot be accepted as current complete evidence. Published
schemas and actual runtime capabilities agree; missing capability is reported
before the affected mutation or claim.

### IPR-016: Durable acknowledgment, retries and state transitions

Maintain observable pending, running and terminal stage outcomes and explicit
normal/diagnostic, incomplete, cancelled, failed and stale run information. Only
validated acknowledged results count as recorded. Enforce stage prerequisites
and distinguish an empty legitimate result from a missing or malformed result.
Completed evidence is attributable to its role and exact source; receipts show
protocol delivery, not semantic correctness or proven reviewer independence.
A check can be not yet executed, running or terminal within an active
investigation stage. Preserve its question, reviewing role and phase, and owned
temporary resource references/cleanup results when any resources were created. Later assessments can reference an
acknowledged execution without duplicating it. Do not add slot/admission tokens
or require main review to finish before an investigator can run a check. Preserve
the independent investigation-stage order.

Repeated reads have no mutation effect. Equivalent duplicate submissions must
not duplicate findings or reverse a completed result. Conflicting submissions
fail without silently replacing acknowledged evidence. After an interrupted or
lost response, inspect actual operation effects/status before retrying; unknown
effects do not authorize blind replay. Read back the current state before using
it at the next dependent boundary.

Checkpoint bounded review-unit judgments with their source identity and coverage.
A resumed phase continues unacknowledged units after freshness checks; it does not
redo finished valid units merely because another context is needed. Preserve
original findings and earlier dispositions while appending normalization of
partially confirmed claims. Recording a packet's verification evidence must
retain historical attempts and source bindings rather than rewrite them for a
new candidate.

Acceptance: duplicate delivery and lost-response fixtures preserve one
acknowledged result. A conflicting replacement is rejected, a partial write does
not masquerade as a completed stage, and status/read-back reveals the safe next
action after recovery.

### IPR-017: Freshness and concurrent writers

Bind source inventory and all stage evidence to the exact code, packet,
requirements, confirmed scope, technical agreement and relevant execution inputs
used for judgment. Observe changes before dependent evidence is consumed and at
finalization. Changed required inputs make affected results stale; never mix
different snapshots or silently rebase a positive result onto new code.

Concurrent disjoint stage submissions may be accepted under the same unchanged
run identity; overlapping/conflicting writes have explicit conflict behavior and
preserve prior evidence. Do not claim atomic protection against arbitrary
external filesystem writers that the platform does not provide. A changed source
requires a new review of the selected target, not a rewritten historical pass.

Acceptance: changing one selected source, agreement or packet between read and
submission/finalization is detected and prevents a current positive verdict.
Concurrent valid independent results remain attributable; conflicting evidence
does not overwrite either the source work or the acknowledged result.

### IPR-018: Resume and repeat review without weakening the full process

Resume an interrupted run from acknowledged current evidence only after verifying
source identity, capabilities and relevant execution conditions. Retain finished
stages and continue unfinished work; do not repeat successful proofs merely
because the conversation restarted. Changed or incompatible inputs make the run
stale and require a new run. Unknown write effects use IPR-016 recovery first.

A new review invocation starts a new complete cycle with fresh independent
judgment. Historical evidence may be referenced only when its exact purpose and
unchanged inputs remain valid; it cannot skip a required direction, main review
or verification stage. Do not add a corrections-only review mode in this delivery.
Link related runs for traceability without modifying historical outcomes or
turning refuted old findings into new confirmed defects.

For large phases, use the acknowledged unit checkpoints in IPR-006 and IPR-016
rather than restarting the entire phase after a context boundary. A fresh
explicit resume invocation establishes and reports its finite elapsed budget,
preserving prior evidence and timing history; retries inside one invocation
cannot silently reset its remaining budget. This does not create a
corrections-only review mode or reuse an old semantic pass for a new invocation.

Acceptance: a same-source restart continues the first unfinished stage without
duplicating successful evidence. A changed-source restart cannot inherit approval.
Repeating a completed review still executes the complete independent process.

### IPR-019: Native execution limits without a custom scheduler

Respect existing host and repository limits for active agents, outstanding
evidence and targeted executions. Investigators choose proportionate execution
settings under IPR-011 and IPR-012: harmless checks can use existing environments,
while checks needing isolation use adequate existing fixtures or owned temporary
resources. Native concurrency limits can bound the work; do not introduce a
collection-owned proof queue, execution slots, resource reservations or an extra
global one-proof-at-a-time rule. The coordinator sequences review stages and
collects outcomes rather than granting per-check resource slots.

Do not invent resource measurements or require a Linux-only probe as a universal
execution contract.

Independent checks may execute concurrently when the host permits and their
actual effects do not interfere. A file copy alone is insufficient when a check
still uses unsafe shared mutable data. If the needed isolation cannot be obtained,
report the proof unavailable instead of adding an implicit reservation system or
affecting other work. Reuse documented project test setup rather than adding an
environment-management service or lifecycle CLI.

Native engine/provider failures, null children, malformed outputs and exhausted
limits remain explicit outcomes. Script completion does not prove every child
succeeded. Cancellation stops dependent dispatch, asks the host to stop active
work, saves acknowledged evidence and attempts cleanup of resources actually
created by the review. Report unconfirmed interruption/cleanup as pending or
unknown, not success. No infinite retries or hidden full-suite execution is
permitted.

Before dispatch, establish and disclose finite elapsed limits for targeted
checks, agent work and the overall review invocation, plus a bounded cleanup
allowance. Resolve them from actual project/host policy or documented finite
workflow defaults; the applicable configuration and effective limits must be
observable. Existing unlimited defaults, a token/agent-count cap or an in-script
loop limit are not an elapsed deadline. Exact default values must be justified
and documented during planning; this specification makes no unmeasured latency
or cost guarantee.

Use actual supported caller, runner and cancellation controls for the selected
foreground/background path. Do not invent a native timeout argument or assume
that a background tool-step abort cancels its owned job. If the required bounded
execution/cancellation path is unavailable, report the prerequisite before its
dependent dispatch instead of silently starting unbounded work. An advisory
in-script timer alone cannot establish an enforced host deadline.

At expiry, stop dependent dispatch, invoke the supported cancellation/termination
path, preserve acknowledged evidence and attempt restoration/owned-resource
cleanup within the cleanup allowance. Report remaining activity, cleanup or
unknown effects as incomplete, with the established owner or an unknown owner.
Do not claim guaranteed disposal where the provider cannot confirm it. Retry
attempts consume the current invocation's remaining budget; continuing after its
expiry requires a fresh explicit invocation.

Acceptance: harmless native checks need no new resources or slot exchange.
Checks needing independent workspaces/databases can use them concurrently without
a collection-specific scheduler; unsafe shared effects remain prohibited.
A width-one host still performs all independent stages. A failed child, exhausted
limit, cancellation or failed required cleanup cannot yield a completed positive
report. Reused environments are preserved and newly created resources have
accounted-for terminal or explicit unfinished states.
A hung check/agent and an overall deadline are exercised with configured small
finite budgets. The observed stop/cancellation outcome respects those budgets
and the documented cleanup allowance, or explicitly reports unconfirmed effects;
the workflow cannot continue dispatching or approve after expiry. A runtime path
with no effective finite deadline is rejected before dependent work. Qualification
distinguishes requesting cancellation from confirmed termination/cleanup.

### IPR-020: Data integrity, retention and bounded disclosure

Keep review state local to the selected project/specification under MCP ownership.
Persist only necessary source identities, bounded evidence, findings, execution
outcomes and recovery information; do not create an unrelated global service,
credential store or second editable source of review truth. Derive reports from
the same acknowledged records. Validate restored/imported records before use and
reject incompatible/corrupt state without deleting user work or silently migrating
it. This delivery adds no automatic legacy migration or backfill.

Preserve acknowledged historical results until explicitly authorized removal;
automatic cleanup concerns owned temporary resources, not retained review history.
No promise of permanent source availability, cryptographic proof of semantic
truth or stronger filesystem durability than the existing runtime is introduced.
If historical source evidence is unavailable, disclose that limitation rather
than presenting a replay as verified current evidence.

Keep secrets, private machine paths and unrelated source/personal data out of
reports, logs, distributable fixtures and generated artifacts. Identify sensitive
inputs by safe references, not copied values. Exported/shared views retain outcome
and limitations without disclosing protected source content. No external sharing
is automatic.

Retain required packet-scoped verification records independently of replacement
of the current handoff as specified by IPR-025. Required observations cannot
survive only as links to transient logs that are later removed. Raw diagnostic
logs may remain optional/private, but expiration of such logs must not silently
remove the required bounded record. Explicit authorized deletion and corrupted
or missing history remain observable limitations, never fabricated provenance.

Acceptance: corruption and unsupported schema fixtures preserve prior state and
return a bounded failure. Temporary cleanup leaves saved results retrievable.
Secret-marker fixtures are absent from emitted reports/logs/distributions while
the affected evidence limitation remains observable.

### IPR-021: Standalone and product-linked integration

Support the ordinary standalone specification/packet path without requiring a
product definition or roadmap. For an already valid product-linked packet, honor
its exact existing binding and task-input contract and consume only task-relevant
product evidence through advertised scenarios. Stale linked inputs follow the
diagnostic rules; they do not authorize rebinding, roadmap edits or broad product
reads. Do not create a product link merely to run review.

Acceptance: a standalone packet receives the same complete review without a
product-task prerequisite. A linked packet uses its exact selected binding,
preserves product/task state and cannot pass a stale-input diagnostic as a normal
positive review.

### IPR-022: Reviewable profile contracts for later planning

Planning must create the manifest-declared `contracts/mcp.md` and
`contracts/schemas/data.schema.json` under this specification. The MCP contract
covers IPR-003 through IPR-019 and IPR-021's relevant interfaces, including source
identity, normal/diagnostic behavior, complete delivery, errors, retries,
concurrency and cancellation. The data schema covers IPR-006, IPR-009, IPR-011, IPR-012 and IPR-013 through
IPR-020's inventories, identities, outcomes, provenance, compatibility and valid
transitions, including phase-local execution evidence, reviewing roles,
question/criterion associations, conditional owned-resource references, applicable
cleanup outcomes and valid environment/evidence reuse. Harmless checks need no
dummy temporary resource or cleanup record. It does not require an execution-slot/queue schema. Preserve established authoritative schemas
instead of inventing a parallel workflow YAML format.

The same declared MCP/data contracts also cover bounded review units and
handoffs, normalized finding portions and finalization cases, effective elapsed
budgets and expiry/cleanup outcomes, and IPR-025's producer/consumer lifecycle.
Planning must include the necessary matching changes to packet execution and
handoff conventions in its scope; a review-only consumer cannot satisfy evidence
retention that its producer never performs. No additional contract artifact,
global service or lifecycle CLI is introduced by these fixes.

Acceptance: the planning artifacts trace their covered requirements and contain
reviewable valid, invalid, duplicate, conflicting, interrupted, stale and recovery
examples where applicable. They are not created by specification authoring;
missing later contracts cannot be represented as implemented behavior.

### IPR-023: Discriminating structural and native qualification

Future implementation acceptance requires generation, portability, package and
contract/state checks for all three hosts and real native model-driven trials on
Codex and DeepSeek Harness. Claude Code's native runtime/model trial is not a
required acceptance check in this scope and must remain explicitly unverified.
Unavailable required Codex/Harness capability leaves its check incomplete, not
passed through a fixture or another host. No OS certification expansion, global
installation or provider/account setup is implicitly authorized by this contract.

Use fresh independent contexts, isolated non-sensitive fixtures and actual
available routes. Include a known defect, a misleading test, a false finding,
a clean case, multiple packets, staged/untracked source distinctions, a stale or
legacy input, lost/duplicate/conflicting evidence, an interrupted run and failed
or unavailable proof. Also distinguish an early specialist's necessary check, a
new check during main review, an independent verifier's later counterexample,
valid cross-phase evidence reuse, a direction requiring no execution, and
harmless execution without new resources, reuse of sufficient existing fixtures,
necessary workspace/database isolation for mutating checks, preservation of
pre-existing resources, and owned-resource cleanup on success, failure,
cancellation and interruption without an execution-slot protocol. Executable
checks must discriminate the claimed failure;
follow shared RED/GREEN/PROVE discipline for changed behavior. Fixture customer
answers are simulation-only and cannot establish real authorization.

Add discriminating fixtures for: a partially confirmed required finding whose
material portion remains a blocker; a resolved optional remainder; a main report
that omits a planted material defect despite containing another valid finding,
detected and assessed by existing reviewers without an additional agent or a
repeated full review;
two successive packet executions whose first evidence remains retrievable after
handoff replacement without a commit; missing legacy chronology that cannot be
recreated by a current test; hung checks/agents and overall deadline expiry;
and a group exceeding one actor's context budget with a cross-unit defect.

Native qualification must exercise the actual supported deadline/cancellation
path and a fresh-session resume from saved MCP/unit state, not only a same-process
pause or mocked timer. Keep Codex/Harness native acceptance and the existing
Claude structural-only distinction unchanged.

Acceptance: retained evidence identifies artifact/source versions, host/runtime,
actual models, scopes, observed stage outcomes and exact checks. A defect-free
fixture does not prove defect detection; known failures are observed and cannot
be hidden behind empty findings. Structural passes, native runtime passes,
unavailable checks and unverified Claude behavior are reported separately.

### IPR-024: Documentation and delivery limits

Document how to select packet changes, interpret normal versus diagnostic results,
request the separate skill, resume an interrupted run and address required
prerequisites. Explain full-stage cost/limits, optional review ownership,
read-only-source versus isolated mutation behavior, phase-local execution by
investigating agents, proportionate reuse versus temporary workspace/database
creation, cleanup only for owned resources, cross-phase evidence reuse, MCP
dependency, evidence limitations and the host qualification distinction. Explain the existing host limits without inventing a
collection-specific execution queue or slot mechanism.
Do not describe testing as exclusive to a terminal phase or as mandatory for
every specialist. Preserve the collection's
pinned global lifecycle policy without performing installation or publication.

Use the `kap-app` source as a researched behavioral precedent with its recorded
source identity. Do not distribute its personal root, private environment values,
project-only rules, fixed models or unverified claims of successful execution.

Document partial-finding normalization and verdict outcomes, the independent
omission check, bounded-unit/large-input behavior, effective timeout and cleanup
limits, and the separate meanings of current test proof and historical TDD
provenance. Explain the producer-owned evidence record and handoff linkage without
requiring conversation history or a Git commit to retrieve a completed packet's
required verification observations.

Acceptance: an implementer/reviewer can identify inputs, allowed effects, output
meaning and recovery from the documentation without conversation history. The
delivery report names changed artifacts and actual checks, with no claim that an
Approved specification authorizes planning, implementation, commit or publication.

### IPR-025: Packet-scoped verification evidence survives handoff replacement

The future implementation of this delivery must make incremental implementation
the producer of durable packet-scoped verification evidence consumed by review.
Reuse an adequate authoritative execution record when one exists; otherwise
provide the necessary matching producer/consumer contract through the workflow
MCP. Do not maintain separate hand-edited copies of the same verification truth.

Record each packet execution attempt against its packet identity, reviewed
specification/technical agreement and exact relevant code/test inputs. Preserve
observed RED, GREEN and required PROVE outcomes, commands/working-directory
references, expected versus actual observations, mutation/restoration results,
source identities and their execution order. Capture these observations when
they occur and retain the required record before completion or replacing the
current handoff. The handoff references that record; it is not its sole owner.

Later packets, handoff replacement and lack of a Git commit cannot discard a
completed packet's required observations. Retrieval must work in a fresh session
by selected project/specification/packet and attempt identity. Retain earlier
attempts rather than rewriting their history for later code. Keep evidence
bounded and non-sensitive; optional raw logs do not substitute for the required
durable observations. Existing explicit-removal and integrity limitations in
IPR-020 still apply.

These are execution/progress records, not new behavioral decisions or technical
agreement. Writing them must not change approved specification source versions
or hashed technical-proposal commitments. Persistence does not authenticate user
consent or prove that an agent's reported observation is semantically true.

Do not fabricate historical RED/TDD order for legacy or missing evidence. Review
may execute current discriminating checks, but reports them as current evidence.
Missing required historical input permits diagnostic review with its coverage
limitation, not a retroactive historical pass or an unqualified normal approval.
Do not impose a new historical obligation where the packet's actual governing
contract did not require it. This authoring stage declares the dependency; it
does not itself modify or execute the implementation workflow.

Acceptance: execute two packets without committing, replace the current handoff
after the second and retrieve the first packet's required verification record in
a fresh session. Original observations and source bindings remain unchanged.
An ephemeral log's removal does not erase the required record; unavailable legacy
history remains explicitly unknown even after a green test now. A failed required
evidence write leaves producer completion unfulfilled, without adding an optional
review gate. Execution-record writes do not stale the behavioral approval or
alter technical-agreement digests.

## Next Stage

After the persisted completeness cycle passes, this specification may become
Approved. Planning and implementation remain separate explicit invocations. This
bundle does not create task packets, a handoff, profile contracts, installed
skills, configuration changes, commits or published artifacts.
