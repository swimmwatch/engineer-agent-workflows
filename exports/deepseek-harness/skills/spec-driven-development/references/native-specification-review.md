# Native Specification Review

Read only for an explicitly requested native review or a native assignment from
that review. This conditional route replaces ordinary scheduling, persistence
and recovery, including the ordinary `specification_review_record_batch` path;
those ordinary instructions do not apply to native assignments. Keep the semantic
criteria in `references/completeness-review.md` and exactly the confirmed active
profile references from this matching installed bundle. Do not load inactive
profiles or the author's whole interviewing workflow.

The author enrolls the appropriate enhanced review before launch. A review-only
request returns findings without specification edits. Never enroll a competing
review, ask the customer from a judge, edit requirements, approve the input,
launch a later stage or run application tests inside this review.

## Main Actor: Preparation And Capability

Resolve logical tools from the current callable list and published schemas,
including `specification_review_prepare_workflow` and
`specification_review_submit_batch`. Never construct MCP prefixes or aliases.
Missing preparation or submission support blocks the requested native path;
do not substitute legacy recording, raw archives, installation or server refresh.

With the supplied exact target (project, specification, expected review_ref and
source_version) and observed host_concurrency, make one initial read-only workflow
preparation call. No preceding open/status chain is needed solely for preparation.
Retain the original target and budget for post-return verification and recovery.
The MCP response certifies server prerequisites only:

- `completed`: report its actual saved outcome with no workflow dispatch.
- `blocked`: report concrete reasons and recovery with no workflow dispatch.
- `ready_to_run`: use the returned mode, next stage, context and bounded arguments.
  If `completion_only` is selected, no new detailed or final judge is needed.
  The existing main actor calls `specification_review_complete` with that fresh
  strict context; preparation itself never completes or approves a review.

For a dispatch, separately verify actual session native hooks/schema, permissions,
independent agents, structured outputs and permitted model routes. Check supported
`agent`, `parallel`, `phase`, `log` and `args` behavior and actual host limits;
MCP readiness cannot establish these. Repeat preparation and host checks on every
new or recovery invocation. With absent native support, report the limitation
and use the ordinary independent checker through its documented path. Missing
independence or enhanced-review support leaves the review incomplete; never
substitute self-review. A requested native route missing required MCP capability
is blocked, even if legacy review tools exist.

Read the installed `workflows/specification-review.js` body and `workflows/specification-review.meta.json` as separate exact resources. Discover the callable `workflow` tool, or `run_code.workflow` only if actually exposed, and inspect its schema. Pass the exact body as `script`, parsed plain JSON metadata as `meta`, and prepared input as `args` only where those fields are supported. The body contains no `export const meta`. Use foreground execution; omit `run_in_background` or set it false where supported. No saved-workflow registry or nested workflow is required. Before dispatch, discover actual routes with `list_subagent_models` and use `ask_user_question` to obtain explicit advertised `provider` and `model` pairs for judging and final roles. Reuse a confirmed pair only for the same task/role while available; a pending answer, rejected route or missing selection blocks dispatch, never silently inherit or substitute. Pass the exact pairs in `roles.judge` and `roles.final`; no inspection role or main-model switch. The native foreground call waits for the terminal result; do not end the parent turn to await a detached wakeup.

Pass one object through the actual native argument field: `target` is the exact
initial preparation input, `prepared` is its full returned envelope including
context, `reviewer_reference` is this bundle's absolute completeness-review path,
`host` contains verified availability/concurrency and optional pagination flags,
and `roles.judge`/`roles.final` contain the permitted actual model routes.
Final-only work needs only the final route. Set pagination flags `same_actor`,
`tools`, `context`, `results` only after verifying each capability. Do not pass
copied originals, expected verdicts or an author's selected review subset. Use
the installed body unchanged; never rewrite a script for an individual review.

## Workflow Ownership And Return

Launch one foreground native call. The main actor hands control to the workflow
and waits for its terminal result with no parent status polling, extra model turns,
sleep loops or polling agent. Do not end or dispose the owning session while the
call is pending, invent a background wakeup or coordinate child turns manually.
Use native observer events for progress. Preserve host cancellation and child
cleanup; already committed submissions may survive interruption or a lost reply.
Never promise rollback or delete crash locks.

After the terminal result, `verify_review_completion` requires one direct,
read-only preparation call with the original target and observed host budget.
Only that direct owning-MCP observation may establish saved completed/reviewed
or completed/gaps. A child's `reported_outcome` is never a substitute for MCP
state, even if it resembles a valid completion envelope. Pending, blocked or
stale observations are not success: report and reconcile the actual state.
This integrity call after return is distinct from polling while the run is pending.
For completion-only recovery, use fresh saved consistency and strict completion
without another judge. Lost completion replies require fresh owning state before
an exact retry. No child output or cached native replay is a freshness check.

## Judging Actors: Exact Reading And Direct Saves

The workflow uses authoritative weighted groups and stable lane cursors. There is
no total-item or global outstanding-item cap; group size is bounded by weight
and the supported submission limit. Do not stop at item 160 or create a writer,
inspection child, agent-side write-turn queue or per-group global barrier.
Each lane advances after its own saved work; final assessment joins all saves.

The same judging actor obtains its own fresh preparation context using its exact
group/lane metadata cursor in the published `cursor` field; `metadata_cursor`
is an assignment label, not an additional tool argument. It consumes every
metadata portion and assigned exact
original, question/answer, amendment, predecessor and linked requirement, then
submits its own semantic verdicts with its complete-read receipts through
`specification_review_submit_batch`. There is no separate writer or foreign
receipt/context handoff. Metadata is not exact-source consumption. Preserve
recorded markers and never overwrite saved verdicts. Semantic gaps/conflicts
are valid saved results; collect the remaining valid findings in the same pass.

Retain bounds of 1–20 items, 131,072 UTF-8 submission bytes, 24 KiB structured
results, 64 KiB complete tool results and exact portions of at most 4,096 Unicode
code points. Split only the actor's own submission when necessary. A saved
acknowledgment means persisted, never queued. Validate its target and every item
index/key against the group and submitted batch before compacting it. Keep every
original acknowledgment in the actor's context. Return compact group metadata
and item-index/verdict acknowledgment summaries using the body's actual schema;
do not repeat long keys, raw envelopes, original sources or unsaved verdicts.
Unknown write effects remain unknown until the owning exact replay/status
contract establishes them; never fabricate rollback or saved counts.

Same-actor programmatic cursor reading is conditional on callable tool composition
and real execution/context/result budgets. Retain complete exact text, ordering,
source identities and terminal receipts in that same judging context. If support
is absent, use ordinary cursor reads as the fallback and report actual pagination.
The workflow VM has no assumed direct MCP API. Summaries, previews, missing portions
or foreign receipts cannot establish source consumption or a positive verdict.

After all required saves, one independent final actor prepares stage `final` once.
For a fresh assessment, consume every required-result continuation; in followup,
read the current mandatory saved outcomes with `specification_review_get`. Read
every portion of the latest whole specification/context, scope and previous
findings; do not reread every unaffected inherited source. Record semantic
cross-section/lifecycle consistency with its own terminal receipt, then request
strict completion. A current saved assessment selects completion-only recovery
without rejudging; missing/stale evidence cannot use that branch. Report actual
pagination and completion claims for the main actor's direct verification.

## Corrections And Repeat Review

Only when authoring/correction is already authorized, read the existing
`references/followup-review.md`; it owns eligibility, exact change evidence and
inheritance. Review-only execution returns findings without editing. The author
aggregates source-supported fixes, asks only unresolved material decisions and
keeps the authorized Draft cycle Draft. Use `specification_review_changes_summary`,
all navigation continuations, then `specification_review_changes_read` with the
exact report version through terminal `changes_receipt`. Link changes to findings
and use `specification_review_followup_start` only when eligible.

Run the same installed body again with fresh preparation for the enrolled
followup. Derive pending-only N/W/R from MCP, not an author's chosen subset.
Preserve `carried_from` provenance; carried results are not fresh checks.
Interrupted unchanged work resumes without reenrollment, preserving valid saves
and reconciling unknown effects. Never blindly repeat unchanged gaps.

For inherited cross-impact, stop dispatch and quiesce/account for launched work.
Forward the checker's exact bounded request through `specification_review_scope_expand`
with fresh strict context; an already-quiescent final actor may apply it directly.
Prepare the same unfinished review afresh, invalidate old allocation/reference
cursors and consistency receipts, and schedule remaining mandatory work. Keep
valid fresh saves; never erase them to expand scope. A new assessment reads the
whole latest context and required current results again for consistency.

Use full review only when the owning eligibility rules reject inheritance, with
the concrete reason: new decisions, changed scope/profiles/meaning, removed items,
Approved input, unavailable snapshots or impact that cannot be bounded. Do not
force a full restart merely for an expired cursor or expanded dependency set.
There is no raw managed-file/archive fallback. Missing authority, evidence,
decision or capability leaves an explicit incomplete state, next action and owner.
The review never grants approval; the separate author checks freshness before
the ordinary Approved transition.
