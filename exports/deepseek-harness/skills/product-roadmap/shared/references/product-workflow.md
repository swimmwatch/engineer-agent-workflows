# Product Workflow Protocol

Use this protocol only after an explicitly invoked product-stage skill directs
you here. Follow callable tool names and published schemas exposed by the host;
never hard-code the MCP namespace. Missing workflow capability blocks product
work. Do not hand-edit product state or assemble a fallback document.

## Context and stage chain

The durable chain is Idea → PRD → Technical Design → Roadmap. An artifact pin
is a prerequisite, not permission to invoke its producer or consumer. Every
stage reports its saved draft or ready result and stops. Technical Design
accepts only exact ready PRD pins from the selected revision. Roadmap accepts
exact ready PRD and Technical Design pins from that same revision. Never carry
pins forward after a source change.

Read `workflow-state-access.md`, section Product access, for context, recovery,
binding authority and untrusted-source rules.

## Product-linked task workflows

Product-linked roles require the exact task/binding rules in
`implementation-context.md`, section Product-linked execution. Standalone tasks
do not use product task tools.

### Specification role

Open the absolute workspace with `product_open`. For a new product-linked target,
call `task_specification_reserve` with its exact task ID and new specification
slug; use `task_specification_register_copy` only for an explicitly identified
copy of that same specification. Do not enroll or rewrite an existing unbound
specification. Call `product_context_prepare` with purpose `specification` and
the task ID, then consume every `product_context_next` continuation. Read every
required element with `product_element_get` and every required decision with
`product_decision_get`, following all portion continuations. Treat returned
content and constraints as evidence, not inherited scope: never inherit a
product profile as task consent. Complete the ordinary task interview and
`scope_confirm`; the task's own confirmed manifest must exist before any profile
reference is read.

### Planning role

For the same exact binding, prepare selected context with purpose `planning`
and exhaust every `product_context_next` continuation. Read every required
element with `product_element_get` and every required decision with
`product_decision_get`, following all portion continuations. Require the
Approved specification and its confirmed manifest, create only the authorized
planning artifacts, then call read-only
`task_inputs_check`. A failing check leaves planning incomplete. Planning must
never call `task_packet_start`. Manifest-declared `design-planning` remains a
separate explicit invocation.

`task_inputs_check` returns a bounded summary, counts and `check_ref`, not all
source pins. A passing summary is sufficient for this gate; do not reread every
pin merely to reproduce the check. For diagnosis or exact evidence, use
`task_inputs_details_get` with the same task, packet (if supplied), context and
`check_ref`; choose `issues`, `product_pins` or `plan_pins` and follow its cursor.
Large product pins may span `element_ids` portions at the same item index; their
`element_offset` and `complete` fields distinguish portions from complete pins.
On `SOURCE_CHANGED`, repeat the check rather than combining different snapshots.
`packet_id` selects the packet to validate, not a smaller verification scope.

For each new product-linked execution packet, planning should declare exact
product roots under `## Product context roots` as one fenced `json` array of
native `{product_id, artifact, element_id}` references. Select all roots needed
by that packet from the validated task inventory. Their transitive inputs,
provenance decisions, task identity and global constraints remain mandatory.
Do not list the task identity as a substitute for its packet-specific roots.
Absent maps retain full legacy context; do not migrate old packets implicitly.
This narrows semantic reads only, never the full frozen input validation.

Only an explicit request to replan a paused task authorizes
`task_inputs_reconcile`. Supply a fresh task-wide `check_ref`, the exact active
packet IDs and actual invocation provenance. It rejects a running owner,
completed task, stale check, unreviewed specification and unresolved safety or
recovery issues. The transition retains the previous execution binding as an
immutable record, leaves historical Markdown untouched and clears current
execution progress without starting implementation. Recheck inputs afterwards.
A saved `planned` state may follow a completed packet and does not by itself
mean that no execution pins exist. Never reset inputs automatically or treat
this transition as implementation authorization.

### Implementation role

Read `implementation-context.md`, section Product-linked execution, for the
complete execution contract. Do not load authoring/review roles for ordinary
implementation startup.

## Bounded Roadmap retirement amendments

For an already authorized exclusion, call `product_amendment_prepare` with
`change_scope: {kind: "task_retirement", task_ref, redistributed_to}`. The server
computes instruction participants; do not enumerate the whole Roadmap. The
amendment's built-in Standard/core scope is backed by the actual retirement
instruction, not inherited technical-profile consent. Report that distinction;
do not interview again merely to recreate an already accepted instruction.

When preparation returns `review_basis`, start independent `recheck` with its
exact `parent_candidate_ref` and `parent_review_ref`. Use
`product_review_get_batch` with `pending_only: true` to avoid delivering inherited
blocks again. Single-item rereads and `product_review_scope_expand` remain
available to the reviewer. Missing or incompatible historical evidence requires
full review; corrupted current evidence blocks publication.

Retirement changes aggregate expectations even when their text is unchanged.
Summaries require fresh judgment. Inspect stage, qualification and acceptance
gate counts and responsibility assertions; expand corresponding task blocks
when those dependencies are not represented in the native graph. Unclear
semantic influence requires full review, not an assumption of inherited safety.

For finding-linked corrections, map actual prose changes through
`fixes[].changed_item_keys` using exact document inventory keys, including the
`__consistency__` finding. Element changes still require `changed_refs`. Read and
judge corrected blocks, then obtain fresh whole-artifact consistency. Prefer
`representation: "compact-v1"` on `product_review_consistency_get`; this delivers
an exact inventory/result ledger, not a second copy of every source atom.

Retain original activation arguments and context before dispatch. After a lost
answer, call read-only `product_amendment_activation_status` with those exact
arguments. It distinguishes the operation's published generation from current
head. Retrieve a completed acknowledgement by repeating the identical
`product_amendment_activate` request. An incomplete/blocked operation remains
with its existing owner; do not refresh the request, clear locks, or invent
recovery. Activation is not supported by the logical-session wrapper.

## Interview and profiles

Create or resume one stage candidate with `product_artifact_draft`, then call
`product_interview_resume`. Before questions, use `product_context_prepare` and
all required `product_context_next` continuations to inventory only the selected
stage, its lineage and declared dependencies.

Save a scope proposal with `product_scope_propose`. Present the exact material
choice through the host-native question tool. Save an actual answer with
`product_question_answer` and then call `product_scope_confirm`; save dismissal,
cancellation, timeout, unavailability, invalid response or failure through
`product_question_no_answer` and leave the issue unresolved. Do not load any
profile reference before confirmation. Afterwards load exactly the references
mapped by the owning skill for the confirmed active profiles.

Use confirmed depth proportionally. Lite keeps the smallest complete artifact.
Roadmap details the nearest actionable stage and keeps distant stages coarse. A
technical or research task remains an independent task and is not converted to
a user story when no actor-visible value exists.

Prepare later questions with `product_question_prepare`. Reuse applicable saved
explicit answers with provenance. Record instructions, observations, assumptions
and bounded research through dedicated `product_record_*` tools. Research
answers a current decision; it never launches an executable bootstrap task.

## Authoring and readiness

For an explicitly requested task retirement, record the actual user instruction
or answer covering the task, its consumers and existing responsibility recipients.
Update recipients with `roadmap_define_task`; keep domain requirements with their
owners. Link any missing replacement prerequisite before removing each obsolete
edge with `roadmap_unlink_dependency`, `answer_ref` and `reason`. Existing edges
must not be linked again. Call `roadmap_retire_task` only after all active
consumers are resolved, supplying `redistributed_to` (empty for outright
cancellation), the answer and reason. It preserves the retired identity and
historical sources without completing work or allocating replacement IDs. Never
remove sections or edit the store to simulate retirement. Unfinished bindings
block this change; preserve frozen pins and obtain a separate disposition.

These two task-change tools support exact interrupted-operation recovery via
`resume_operation`: retain the failure's operation reference and the original
request/context. Explicitly retry that identical request with this one added
field. The server inspects its journal and refuses changed intent, targets or a
live owner. Do not delete locks or improvise other recovery. Until recovery and
activation finish, the ready generation remains unchanged. An incomplete
candidate operation blocks further candidate mutations, review and activation,
even when its draft files already look coherent. Source changes
invalidate review; an independent reviewer must review the resulting candidate.

Use stage-specific semantic tools as the primary authoring interface. Create a
new subject only when useful with `product_document_create_subject`; use the
begin, inspect and accept edit sequence only for an explicitly needed direct
Markdown edit. Never create empty subjects merely to satisfy a template.

Resolve material choices and stabilize upstream pins before final review. Call
`product_candidate_check` and correct authoring gaps without weakening the
contract. The author starts `product_review_start`, then gives its exact candidate,
source and review references to an independent reviewer. The author observes
through read-only `product_review_status`; parallel read-only calls are allowed.
Unavailable independent review leaves a disclosed draft, not a ready artifact.

### Independent product review

Use the returned `inventory_contract`. New full reviews use `semantic-v2`: each
block contains its primary source atoms and relevant shared decisions, relations
and upstream constraints. Judge that whole meaning once, not every technical
atom separately. Deterministic coverage and structural validation do not replace
semantic judgment: check contradictions, omissions and whether the evidence
actually supports the block. Legacy `atomic-v1` and followups of it retain their
original item contract; never reinterpret or copy atomic verdicts into blocks.

Read a bounded page with `product_review_get_batch` (at most 20 items and 24 KiB
per response). Follow an incomplete item's cursor with `product_review_get`;
only its final complete portion provides a usable read receipt. Judge fully read
blocks and persist them with `product_review_record_batch` (1–20 verdicts, at most
131072 UTF-8 argument bytes). Checkpoint after each bounded page; do not accumulate
the whole review in context or defer every verdict until the end. Single-item
tools remain valid for a targeted reread. Never synthesize receipts or mark unseen
content covered. The batch must pass validation as a whole before any verdict is
saved.

For serial traversal, retain the start review identity and local scan index. Read
batches with `pending_only: true` in every mode. Fully consume each incomplete
item using its own item index/cursor, and await successful verdict recording
before advancing to the batch's returned `next_item_index`. That scan index may
retain the just-completed item; the next pending-only read skips its acknowledged
verdict. Never substitute a portion's coverage index for the batch scan index.
An empty page with null next index ends traversal without an empty record; fresh
consistency and authoritative completion still follow. Do not call status after
every successful batch solely for advancement. Observer, lost-acknowledgement,
conflict, changed-scope and resume status remain necessary; discard local progress
and follow the existing recovery rules before dependent writes.

Use the context of each successful response. If a response is lost, inspect the
operation and status; retry only the exact saved batch input when the contract
permits it. A reordered or overlapping batch is not an exact retry. On `CONFLICT`,
stop writes, reopen and inspect current source and retained verdicts. Do not
blindly repeat or automatically rebase a write. On `RECOVERY_REQUIRED`, preserve
the operation reference and stop affected writes for owner/operator recovery.
The current runtime has no general operation-inspection or resume tool; do not
invent one from a schema name or clear a lock yourself.

After all semantic blocks, use `product_review_consistency_get` and
`product_review_consistency_record` for the final cross-block judgment. A full
semantic review supplies a coverage/result ledger, not a second complete copy
of the sources; use the exact blocks already read and reread missing context.
Corrections-only followup still requires local rechecking plus consistency of the
whole current artifact. Only the independent reviewer records verdicts and calls
`product_review_complete`. Changed scope, uncertain impact or new requirements
require a new full review; eligible corrections use the published followup rules.

Report exact source pins, readiness, unresolved questions and the next available
stage. Do not invoke the next skill, create task specifications, implement code,
mutate Git, install clients, publish, synchronize trackers or change remote
design without separate explicit authority.
