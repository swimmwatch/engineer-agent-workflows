# Selecting One Specification Boundary

Read when initial triage finds multiple outcomes, unclear separation, or an
interview follow-up materially expands the selected work. This is specification
scope selection, not task planning or permission to create multiple specs.

## Recognize And Propose

An outcome is a candidate for a separate specification when it can be accepted
with its own observable result while another outcome is postponed. Distinct
business rules and repeated shifts between weakly related scenarios are signals.
Do not impose a feature count, token threshold, or estimated context percentage.
Use only enough investigation to explain the boundary; defer broad code research
and detailed questions about unselected outcomes.

Keep a coherent cross-surface operation together. Do not split by UI/API/database
layers or postpone necessary authorization, validation, failure handling,
accessibility, consistency or recovery. A technical or research outcome may also
stand alone. If the outcomes cannot be separated safely, explain the dependency
and retain the coherent scope; a small high-risk outcome can still be Deep.

Present a compact candidate list: each outcome, its main inclusions/exclusions,
and material prerequisites. Recommend a first outcome and explain why. For
example, paid subscriptions/payment, promotion codes, accounting exports and
colleague invitations may be separate outcomes; payment still includes failed
and duplicate callbacks. This is a boundary proposal, not implementation order,
effort estimates, or detailed future specifications.

Ask which boundary to describe now through the saved native-question sequence.
Offer meaningful choices, including correcting the proposal or explicitly
retaining the broad scope. An explicit request to keep it together is valid:
record it and continue proportional depth/profile confirmation without repeating
the warning. Silence or dismissal selects nothing. Work on exactly one selected
specification; do not create sibling directories or invoke another workflow.

## Persist Without Losing Requests

Use the existing decision tools; do not add YAML fields or invent intake tools.
Preserve the original non-sensitive request verbatim with
`decision_record_instruction` before interpreting it. Keep one current target
for intake, without creating sibling specifications. For a boundary choice use
`question_prepare`, category `scope-boundary`, with the candidate outcomes,
proposed deferrals and material shared constraints in the saved question. Record
the exact actual answer with `question_record_answer`, or the observed non-answer
with `question_record_no_answer`. Agent proposals are questions, not user facts.
If the user already specified the exact boundary, save that instruction without
asking it again; use the same category for later recovery.

The journal retains the original instruction, saved question and exact answer
under server-issued references. Deferral means later work, not
cancellation, prohibition of future work, or removal of existing functionality.
Unchanged shared constraints still apply. Keep summaries short; do not replace
the original with a paraphrase or copy it into multiple speculative specs.

After the boundary is resolved, use `scope_propose` with the selected outcome,
deferrals and rationale, then its separate answer/`scope_confirm` sequence.
Its `exclusions` field accepts profile IDs, not feature names; put behavioral
boundaries in the rationale and later in `spec.md`. A boundary answer is not a
confirmation of an as-yet-unseen depth/profile/artifact proposal.

In the Draft, give the selected behavior and agreed non-goals stable requirement
headings. Link the original compound source and the boundary answer to those
definitions with `decision_link_requirements_batch`. Keep the journal as the
sole link map. Do not use `decision_mark_context` to hide deferred functional
requests, supersede the whole original to remove them, or treat links alone as
proof that the selected behavior is complete. Review needs both original intent
and explicit evidence of the narrower boundary.

## Growth, Resume And Handoff

For new material outcomes during interviewing, preserve the follow-up first,
explain its relation to the selected boundary, and resolve whether to defer or
expand before affected work continues. Do not repeat triage for ordinary details
within the accepted outcome. Re-propose materially changed scope even if depth
and profile names happen to stay the same. Return an affected Approved spec to
Draft and use a full independent review after a boundary change; old verdicts
and corrections-only followup do not approve the new scope.

On resume use `specification_open`, `scope_get`, and bounded
`decision_find` with `categories: ["scope-boundary"]`, then `decision_get` and all its
continuations. Recover the latest actual answer or pending question, selected
outcome, deferred requests and applicable shared constraints before continuing.
Fetch original sources when needed; navigation summaries never replace exact
evidence or the review's complete-read requirements.

At the end, report the selected spec and saved deferred decisions with project,
slug and current decision references, so a later explicit invocation can read
them, including from a fresh conversation. Do not promise automatic cross-spec
import or declare the whole original request delivered. Product-linked tasks
retain their exact task binding: a conflicting task boundary needs explicit
roadmap reconciliation, not silent task splitting. Standalone work never gains
a mandatory PRD or roadmap stage.
