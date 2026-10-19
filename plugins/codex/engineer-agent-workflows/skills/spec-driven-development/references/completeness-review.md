# Independent Specification Completeness Review

Read this reference only as the separate checker of a prepared specification.
Model suggestion: Sol; Astra for difficult or disputed cases; advisory, never an execution gate.
This is a specification check, not code review, planning or implementation.
Do not edit source requirements or ask the customer directly. Return material
questions to the specification author.

## Inputs And Reading

Receive the target project/slug, MCP context and review reference. If missing,
ask the author for them. Read `shared/references/yaml-contracts.md` from this
skill. Use `scope_get` and load exactly `references/<profile>-requirements.md`
for each confirmed active profile; do not load inactive profiles or the entire
author workflow. Unconfirmed scope blocks review. All fixture answers are
simulation data, never real customer authorization.

Use `specification_review_get` for every server-enumerated detailed item,
starting at index 0 and following `next_item_index`. Follow all `next_cursor`
portions to reconstruct its exact text before judging it. Keep returned context
and final `read_receipt`. It is a protocol receipt, not proof of understanding.
Fully read and checkpoint one item, or a supported group of at most 20 items,
before reading the next group. Record a supported group with
`specification_review_record_batch`; if that capability is absent, use the
single-item operation. Never keep an unbounded read-all-then-record-all backlog.
On resume, call `specification_review_status`, preserve `recorded_result`
items without overwriting them, and continue from its first unfinished index;
never invent a verdict for an unfinished portion. `specification_review_start` is the
author's tool. Use `requirement_list/get` for additional exact requirements and
`decision_find/get` for source revisions. Large blocks and reference arrays
must be read through all continuations. Do not replace originals with search
snippets, summaries or the author's chosen condition list.

The opaque context changes after every successful write: replace it with the
returned context, not the initial one. On `CONFLICT`, stop all further writes and
follow the fixed `conflict_cause`. For `stale_context`,
`dependency_changed_during_read`, or `unknown`, reopen with `specification_open`,
call `specification_review_status`, and inspect saved verdicts before deciding
whether the unchanged review can resume. For positively established
`review_source_changed`, start a fresh independent review. Absence of
`operation_applied` does not prove that retry is safe. Never replay a verdict
blindly or interpret an error as a recorded verdict. For a corrections-only followup,
read `references/followup-review.md`: its pending-item and final-consistency
sequence replaces full inventory iteration. Only MCP may select provisional
inherited results; do not transfer verdicts manually. Otherwise use a full review.
Completion and recorded counts must come from successful MCP results, not
attempted calls or final prose.

## Three Questions

For each source, compare the complete instruction or answer together with its
question and predecessor history against the requirements. Does every material
condition survive: actors and identity, scope, exceptions, limits, ordering,
priorities, allowed alternatives, negative obligations and failure behavior?
Treat these as lenses, not mandatory new features. A narrow amendment replaces
only its specified part; unrelated obligations in the broad original remain.
Explicit complete replacement is different from a partial edit.

For a compound request narrowed to one specification, inspect the saved boundary
question and actual answer or explicit user instruction, using `decision_find`
with `categories: ["scope-boundary"]` and exact `decision_get` reads when needed. A
confirmed deferral is satisfied by an explicit, source-linked non-goal for this
delivery; do not demand that later feature now. Deferral neither cancels the
original request nor authorizes removing existing behavior. Require coverage of
all retained conditions, dependencies and shared constraints. An author's split
proposal, silence, or a `context_reason` label cannot authorize narrowing. Report
unsupported exclusions and missing retained safeguards as gaps. Read the full
server inventory normally; narrowing is not permission to skip original sources.

Before aggregating a compound source to `covered`, locate support in the actual
requirement text for every independently testable material obligation within
scope. Do not fill absent rules from the source or infer coverage from a matching
field name. A definition, its triggering transitions and its exceptions remain
separate obligations even when they share one ID. Compare intermediate and final
outcomes when the source distinguishes them.

For each requirement, identify its justified source. Is it faithful, stronger
than authorized, contradictory or unsupported? Equivalent wording is valid;
do not demand literal copying. Inspect `context_reason` exclusions critically:
a feature exclusion or prohibition still constrains behavior. Conversation or
delivery preferences can legitimately be non-product context.

For each active profile, use its existing reference to find material scenarios
not discussed at all. Judge relevance against confirmed scope and repository
evidence. Do not manufacture requirements or demand every possible artifact.
Lite remains compact; correctness does not depend on depth. An active profile
needs a relevance-based explanation, not a generic checklist pass.

Treat conditional profile guidance ("where applicable", "when material") as
conditional, not as an unconditional list of product requirements. For a gap
under such guidance, identify the concrete confirmed-scope, architecture or
known-risk fact that makes the missing behavior material in this application,
in addition to a compliant counterexample. The mere possibility of a failure
does not establish that materiality. Without that support, describe the idea
as an optional consideration in the relevance explanation, not a blocking gap.
This does not waive unconditional profile obligations or lost source conditions.

## Findings And Durable Results

Test each proposed counterexample against the whole applicable contract. An
implementation that already violates a general permission, prohibition or
preserved contract does not prove ambiguity. A permission covering a category
does not require an exhaustive list of its members; a proposed narrower
restriction needs a source. Unchanged interface details may be referenced rather
than repeated, but a required reference must actually be available.
A general rule can cover its stated examples without repeating their list.
Different compliant representations are not a gap unless an established consumer
or relevant profile obligation requires one canonical result. Ground that need
in the actual scope or evidence, not an imagined consumer or architecture.

Call `specification_review_record` once per fully read detailed item, or use
the bounded batch operation above. Do not record the enhanced run's final
`context:specification` item as an ordinary or batched verdict. For `covered`,
explain the actual correspondence and supply `evidence_requirement_ids` and/or
`evidence_source_refs`. A behavioral source needs supporting requirements; a
requirement needs original source refs. References alone do not prove meaning.
For `gap` or `conflict`, state the missing or contradictory condition and a
concrete `counterexample`: behavior the current text wrongly permits or rejects.
Separate a lost agreed condition from a new material question. Do not patch
the specification yourself or accept speculation as a customer answer.

Use `not_applicable` only for a source explicitly classified as non-behavioral
context, with justification. For an active profile with no further material
gap, use `covered` and explain why; inactive profiles are not review items.
After every detailed result is durably acknowledged, read the enhanced run's
final `context:specification` item through all portions. It contains the exact
complete current specification and saved detailed outcomes. Assess normative
prose, public identifiers, permissions, negative obligations and lifecycle
ordering against addressed requirements. Introductions, quotations and clearly
illustrative examples need not become requirements, but every material promise
needs an unambiguous requirement or authoritative-contract reference. Judge
cross-section contradictions semantically; keyword search is not proof of
consistency. Record one `specification_review_consistency_record` verdict with
the final `consistency_read_receipt`. Supply a concrete counterexample for
`gap` or `conflict`. Complete all findings in one run rather than stopping at
the first.

Then call `specification_review_complete`. Report its actual result and concrete
findings. If the enhanced capability is unavailable, inputs changed, or exact
content cannot be delivered, leave the run incomplete and return to the author.
Never substitute legacy evidence, mark Approved, overwrite findings into
success or call self-review independent.
