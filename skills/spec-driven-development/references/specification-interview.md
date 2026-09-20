# Specification Interview

Read after the engineering manual and adaptive-scope reference. This reference
defines durable decisions, host-native questions, recovery, contract coverage,
traceability, and automatic approval. It does not authorize planning or
implementation.

## Evidence And Scope

Use host and project guidance already available in active context. Read
additional task-scoped `{{HOST_PROJECT_INSTRUCTIONS}}` only when absent from the
active context or itself in scope. Inspect only task-scoped code, tests, public
interfaces, configuration, and stable documentation before asking questions.
Record repository facts as `observed` with repository-relative evidence.
Separate requested changes from behavior to preserve. Verify material baseline
claims with scoped source evidence or an executable probe before making them
compatibility requirements; keep unresolved runtime assumptions explicit.

First confirm depth and profiles through `references/adaptive-scope.md`. Then ask
only unresolved decisions that materially change behavior, interfaces, data,
state, security, compatibility, external effects, quality, or acceptance. Apply
the confirmed depth to interview breadth and use active profile references for
coverage. Leave implementation-local files, symbols, frameworks, and task order
to planning.

## Decision Ledger

Read `shared/references/yaml-contracts.md`. Use `specification_open` and
`scope_get` for current state; use `decision_find` and `decision_get` for
bounded exact decisions. The workflow MCP is mandatory for both reads and writes.
It owns `decisions.yaml`; agents do not assemble its record structure.

Before each material question, call `question_prepare` with its category, text
and supported options. It creates the journal if needed and returns the saved
question reference. Ask that exact question through the native host tool, then
immediately call `question_record_answer` with the actual answer and source, or
`question_record_no_answer` with the observed non-answer outcome. Never infer an
answer from a default option, missing response or diagnostic.

Before interpreting a non-sensitive user request or follow-up, save its exact text
and provenance with `decision_record_instruction`. Do not re-ask merely to save
it or substitute a repository fact. Record known user edits as `user_edit` with
affected requirement IDs and predecessor refs. Unknown edit provenance is not
user consent: clarify material discrepancies before rewriting.

Use `decision_record_fact` for observed repository evidence and
`decision_record_assumption` only for reversible low-risk defaults with an
explicit reconsideration condition. Use `decision_link_requirements` after the
behavior specification contains the relevant requirement definitions. Linking is
strictly additive: existing IDs stay in their current order, new IDs append, and
an already satisfied request is a no-op. For several decisions, use the atomic
`decision_link_requirements_batch` instead of parallel single-decision writes.
Validate all intended links from its returned per-item previous, added, removed
and final sets. Classify
only resolved non-behavioral sources with `decision_mark_context` and a reason;
functional exclusions, prohibitions and constraints still need coverage.
An additive follow-up is a new source, not replacement of the broader answer.
Use `revises` only for intentional replacements; record the actual reply unchanged.
A partial amendment changes only the named conditions. Preserve the original
answer and question as evidence for its remaining obligations. The MCP retains
both revision ancestry and related instruction refs for independent review.
The MCP appends a revision without rewriting history.
Do not repeat settled questions merely to add detail.
IDs, revisions, state/provenance fields and supersession links are server-owned.
Do not synthesize YAML or rewrite old records. Scope proposals and confirmation
use the dedicated scope sequence in `references/adaptive-scope.md`, not a
generic question or a manually assigned confirmation flag.

Pass the newest returned context to every sequential write. Independent read-only
lookups may run in parallel. On `CONFLICT`, stop writes and follow the fixed
`conflict_cause`: reopen and inspect the review for `stale_context`,
`dependency_changed_during_read`, or `unknown`; start a fresh independent review
only for positively established `review_source_changed`. Reopen the specification,
query the current references, and compare the saved result with the intended
addition. Absence of `operation_applied` does not prove that retry is safe. Retry
an exact lost-response request only when operation-effect evidence explicitly
confirms that it was not applied; never repeat a write blindly.

Never persist credentials, secrets, unrelated personal data, raw reasoning or
diagnostic payloads. Request a non-sensitive restatement when necessary.

## Host-Native Question Interaction

Inspect the callable tool list and schemas at runtime. Use
`{{HOST_QUESTION_TOOL}}`; follow its current question, option, response, and
batch limits without inventing fields or namespaces.

- Never enter plan mode solely to ask a question.
- Ask one focused decision at a time unless independent questions fit the
  advertised batch limit.
- Use single-choice, multiple-choice, or free-text semantics only when supported.
- Use concise stable option IDs, a plain-language recommendation, and a simple
  concrete example. Do not require the user to understand repository internals.
- Treat only the explicit selection or custom text for the exact saved question
  as an answer. Checkpoint answers returned before any later failure.
- In `question_record_answer`, preserve the actual text and response source.
  Map a selected host label or an unambiguous custom choice to the saved option
  IDs in `selected_ids`; a free-text choice is not a button click. For example,
  explicit confirmation of the exact scope maps to its saved `confirm` option.
  Conditional approval, corrections, ambiguity and non-answers never map to
  `confirm`. Keep unmatched custom text without a selection and resolve any
  material ambiguity. Do not ask again solely to force a button selection.
- If the standard tool is unavailable, ask the exact saved question directly in
  conversation and end the turn. A later explicit reply can answer it; silence
  or dismissal cannot.

## Recovery And Status Handling

Treat `dismissed`, `cancelled`, `timed_out`, `unavailable`, `invalid_response`,
and `failed` as non-answers. Never copy proposed option values, diagnostics, or
sentinel data into an answered record. Correct an invalid call against the
exposed schema without inferring an answer. Retry only after user direction or
evidence that a transient condition changed.

After compaction, handoff, or user edit:

1. Use `specification_open`, `scope_get` and bounded decision queries; read
   the current behavioral `spec.md`, not workflow YAML.
2. Select the highest non-superseded revision for each decision ID.
3. Treat user edits in `spec.md` as authoritative. Reconcile material differences
   into new decision revisions instead of overwriting them from old ledger state.
4. Reconfirm any material depth, profile, or planning-artifact change before
   replacing the current manifest.
5. Continue from the first unresolved decision without repeating answered ones.

Do not draft while material decisions, scope confirmation, supersession chains,
safety choices, or acceptance prerequisites remain unresolved.

## Specification Contract

Write observable outcomes, domain rules and invariants, interfaces, schemas and
state semantics, validation, defaults and limits, alternate flows, failure and
recovery, security and privacy, compatibility and migration behavior, quality
scenarios, non-goals, and objective acceptance applicable to confirmed profiles.

Use one `### <ID>: <title>` heading per separately checkable requirement; preserve
existing IDs. Its nonempty behavior and acceptance block includes nested headings
and ends at the next heading of the same or higher level. An ID in prose, a quote
or code is not a definition; never duplicate definitions. Map every active decision to requirement IDs and
every planned profile artifact to the requirements it must realize. A criterion
states an observation and excluded outcome; an absence criterion also states how
absence is observed. For multiple active surfaces, trace user action through
operation/event and state change to final observable outcome.

Record agreed platform support in a compact `spec.md` section with requirement
IDs: affected components, supported environments, material version constraints,
platform differences, exclusions, and expected unsupported-environment behavior
where applicable. Reuse the existing decision ledger and link the answer to
these requirements; no new manifest fields or separate platform file are needed.
When creating a specification, write platform requirements with `Status: Draft`.
If saved platform references are unknown after resuming, first call
`decision_find` with only the latest context; use its cursor for further pages
and `decision_get` for relevant returned references. Do not guess category names
or replace saved answers with new facts. A failed or incomplete lookup keeps
linking unresolved.
Before approval, link each saved platform decision to its requirement IDs with
`decision_link_requirements`, or use `decision_link_requirements_batch` when more
than one decision needs an update. Then run `specification_check_state`.
Only then, after linking and the state check both succeed and the behavioral
review passes, change the status to `Approved`.
Never write `Approved` in the initial draft or repair its links afterwards.
Pass the latest returned MCP context and references unchanged. If a read or link
fails, reopen and resolve it while keeping `Draft`; a general state-check pass
does not establish that the link was created.
Active profiles reference these IDs rather than repeating the support question.
Resolve material support gaps before approval; single-platform scope is valid.

Keep the artifact behavioral. Do not invent classes, functions, internal file
layout, dependency injection, task order, estimates, or implementation packets.
Run a final gap review from user, operator, implementer, tester, security
reviewer, and maintainer perspectives. Identify any remaining invention,
unverifiable promise, orphan requirement, orphan planned contract, or conflict.

## Automatic Approval

New or changed specifications use this persisted completeness cycle. Legacy
specifications remain explicitly unverified until changed; do not bulk-migrate.

1. Preserve original instructions, complete the interview and write Draft.
   Link sources with `decision_link_requirements`, using its batch form when
   several decisions need updates; use `requirement_list/get` for exact
   definitions. Keep the ledger as the sole maintained link map.
2. Call `specification_review_start` with `require_consistency: true` before
   delegation to enroll the specification, freeze its inputs and require the
   final whole-specification assessment. If the published tool does not
   advertise this field, report the missing enhanced capability and leave
   readiness incomplete; do not substitute legacy review evidence. Inspect
   mechanical issues and `specification_check_state`. Repair
   missing links/definitions and start again after changes. An ID link does not
   establish that every condition in the original answer survived. Observe
   progress with read-only `specification_review_status`; do not repeat start.
3. Delegate to a separate fresh context with
   `references/completeness-review.md`, returned context/review reference, the
   current specification and only confirmed active profile references. Provide
   raw sources through MCP, not an author-selected subset, suspected bugs,
   expected verdicts or a ready-made conclusion. Lite is short, never skipped.
4. The reviewer reads every portion, records findings and completes the run.
   It does not edit the specification. Parallel read-only status and evidence
   calls are safe. If a separate context is unavailable,
   leave the run incomplete and request an independently invoked reviewer; do
   not substitute self-review. Check current state after it returns.
5. Restore unambiguous omitted obligations from sources. New material choices
   or conflicts need the user's answer through the saved question flow. Partial
   amendments preserve unaffected obligations. After any input change, start a
   new independent review; never overwrite a gap into success. For corrections
   to completed findings at unchanged scope, read `references/followup-review.md`
   and use its MCP eligibility check. Otherwise start a full review.
6. Require `status: pass` and `coverage_status: reviewed`, then change only the
   standalone `Status: Draft` line to `Status: Approved` immediately, without another
   approval question or an `approval.spec` decision. Check state again with the
   returned `source_version` so MCP checkpoints the observed transition.

Do not create an `approval.spec` decision or ask a separate approval question.

The snapshot binds spec text, confirmed scope and source history, not the review
report itself. Every other observed input change requires a new run. MCP cannot
observe edits made and reverted between calls and cannot prove semantic truth or
reviewer independence. No second manual source/requirement table belongs in spec.md.

Treat coherent known user edits as authoritative, preserve them and reconcile
sources. Return edited specifications to Draft for this cycle rather than
retaining a stale Approved assertion. Unknown or contradictory changes require
only the unresolved material clarification. Resume from persisted sources and
review results without repeating answered questions.

After MCP writes, run the repository's applicable read-only format/check command.
Never format `manifest.yaml` or `decisions.yaml` with file tools. If the check
still rejects only MCP-owned YAML, keep the specification's workflow approval
state but report the project check as failed and leave formatter/config
integration to the MCP owner; do not claim repository verification passed.

Approved means complete under this workflow, not authorization for planning or
implementation. Persist specification state and summarize the next step. Do not
create `handoff.md`; planning owns that artifact.
