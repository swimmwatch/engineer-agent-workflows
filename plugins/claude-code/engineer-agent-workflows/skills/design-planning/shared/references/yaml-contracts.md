# Workflow YAML Contracts

Read `workflow-state-access.md` for mandatory scenario access, source identity,
state ownership and evidence limits. This reference routes specification,
planning and design authoring; incremental execution uses
`implementation-context.md` instead.

## Specification Completeness Versions

Follow the version and legacy contract in `implementation-context.md`, section
Specification Completeness Versions. Planning still inventories the full approved
scope; implementation reads only its packet-linked definitions.

## Evidence And Ownership

### Technical Agreement Freshness

Use `planning_question_prepare`, `planning_question_record_answer` and
`planning_question_record_no_answer` for technical proposals and actual outcomes.
They persist separate `planning_decisions` history in the existing journal, not
behavioral specification decisions. Pure technical writes change the physical
context, not the behavioral reviewed `source_version`; use the latest returned
context nevertheless. Physical context freshness and behavioral review freshness
are separate: a purely technical journal revision does not require behavioral
review, and a valid behavioral review is not agreement to changed task sources.
Never route technical answers through behavioral question
tools or relabel behavioral changes to preserve approval. Mixed/ambiguous changes
stay unresolved; scope, behavior and acceptance return to specification.

Planning reads exact bounded `planning_decision_find`/`planning_decision_get`
records and binds each packet to the returned agreement and proposal digest.
Execution readiness is owned by `implementation-context.md`, section Technical
readiness. Planning must bind the exact packet ID, agreement and proposal digest
required there; authoring an agreement does not authorize execution.

A partial answer creates bindings only for explicitly accepted proposals.
Continue from the current returned question revision; retain earlier accepted
bindings and ask only unresolved choices. Read current exact records through
`planning_decision_find` and all `planning_decision_get` continuations on resume.
Changing a shared bound section makes its dependent proposals stale while
independent bindings remain reusable. A material technical revision returns to
planning for a revised question and explicit answer; a behavioral change returns
to specification before technical readiness can be restored.

Follow the planning skill's `references/technical-agreement.md` for source
headings, native questions, partial answers and revisions. Missing runtime
capability blocks affected work; no direct state fallback, fabricated bindings,
automatic migration, installation or second journal is allowed. These checks
cannot authenticate consent or prove semantic compliance with agreed architecture.
Check all six scenarios and schemas on the serving connection's `tools/list`;
building a newer runtime on disk does not refresh a loaded process. Refresh and
reconnect require separate authority. A `ready` check does not authorize execution.
For executable call examples and readiness recovery, use the MCP runtime README's
technical-planning section; it does not replace these state-access rules.

## Review input archives

New completeness reviews may reference MCP-owned immutable historical inputs at
`docs/specs/<slug>/.workflow/review-inputs/<sha256>.json`. They are not another
editable specification or an agent-authored YAML document. Use review scenario
tools for bounded comparisons and source reads; do not inspect or modify archive
JSON as a workflow fallback. Keep referenced snapshots with the specification;
missing/corrupt inputs block result inheritance, not a new full review of intact
current sources. Followups retain attributed prior results and require a fresh
whole-specification consistency assessment before completion.
