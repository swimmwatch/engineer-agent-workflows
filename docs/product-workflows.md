# Product workflows

This guide describes the implemented local product workflow and its safety
boundaries. The executable tool schemas and `tools/list` output remain the
authority for exact inputs. Every stage and every task workflow is invoked
explicitly; completing one stage never authorizes the next stage, a commit, an
installation, a publication, or a remote action.

## Choose the workflow

Use the narrowest scenario tool or skill that owns the intended state change:

| Intent                                                               | Owner                                                                                |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Refine a durable product idea                                        | `idea-refine`                                                                        |
| Define actors, goals, capabilities, use cases, rules and constraints | `product-definition`                                                                 |
| Choose system boundaries, technologies and policies                  | `technical-design`                                                                   |
| Create stages, epics, stories, tasks and dependencies                | `product-roadmap`                                                                    |
| Create one task specification from selected product inputs           | `spec-driven-development`                                                            |
| Plan or execute that specification                                   | `planning-and-task-breakdown`, then one explicit `incremental-implementation` packet |
| Inspect the shared product store                                     | `product_open`; the published runtime has no general operation-recovery tool         |

The product lineage is Idea → Product Definition (PRD) → Technical Design →
Roadmap. A downstream stage requires the exact ready upstream versions. A task
specification is separate and remains in its workspace; it references selected
product versions rather than copying the global product documents.

Start by opening the caller's absolute workspace. Forward the opaque `context`
from the response unchanged; after any successful mutation, use the newly
returned context.

<!-- product-tool-example: product_open -->

```json
{
  "workspace": "/absolute/path/to/workspace"
}
```

## Storage and configuration

The product store is local to one computer and shared by all registered
workspaces of the same logical project. It lives outside Git and contains Idea,
multi-file PRD and Technical Design documents, Roadmap data, decisions, reviews,
immutable generations and recovery checkpoints. Task specifications, task
decisions, plans, checklists, handoffs and design artifacts remain in their
workspaces.

The server selects the root lazily:

1. A nonempty `EAW_PRODUCT_DATA_DIR` is an explicit absolute-path override.
   Invalid, relative or unsafe values fail product operations with
   `INVALID_CONFIG`; the server never falls back to another store.
2. Linux uses an absolute `XDG_DATA_HOME`, or the standard
   `~/.local/share/engineer-agent-workflows` fallback.
3. macOS uses `Library/Application Support/engineer-agent-workflows` below the
   OS-resolved home directory.
4. Windows uses absolute `LOCALAPPDATA`; if it is unavailable, configuration
   fails instead of guessing another home path.

Changing environment configuration takes effect only after restarting the MCP
process. Root selection does not migrate data or bind an unknown project.
Read-only discovery does not create a missing root. Explicit initialization or
binding may create owned paths, but permission errors never select a replacement
root.

<!-- product-tool-example: product_capabilities -->

```json
{}
```

There is no MCP backup or restore API and no whole-store transaction. A copy of
one document, head, lock or operation file is not a backup. If an operator needs
an external filesystem backup, stop product-store writers and copy the entire
selected root as one operational action; restoration and validation remain the
operator's responsibility. Git history is not product backup storage.

## Artifact and version lifecycle

Authoring occurs in a candidate. A review checks the candidate's fixed inventory
and exact sources. Activation publishes one coherent immutable generation only
after required independent review passes; unchanged objects are reused. Ready
generations, decision revisions and source pins survive MCP restarts and remain
readable by tasks that reference them.

For a bounded task or stage read, ask the server to select the relevant sources.
Finish every `product_context_next` continuation before treating the selection as
complete. An opaque context or digest is not the source text.

Implementation may add `packet_id` to this request. The server validates the
task and reads the packet's pinned `## Product context roots` JSON array. Exact
planning roots narrow semantic reads while retaining task identity, transitive
inputs and global constraints. Absent maps return `packet_scoped: false` and the
legacy task closure; malformed or foreign roots fail. Full task integrity and
frozen plan checks are unchanged. Retain the returned `check_ref` and pass it to
`task_packet_start` so a changed plan cannot silently replace consumed inputs.
Frozen execution continues from its retained product generation after a newer
ready generation appears; it never silently substitutes new source content.

Use read-only `product_sources_get_batch` with `context` and 1-20 ordered
`requests`. Each request contains either `element_ref` and its exact `pin`, or
`decision_ref`, with an optional source `cursor`. Results contain indexed
`portion` items, `complete` and a batch `next_cursor`. Follow the batch cursor
with identical requests and separately finish every incomplete item portion.
Batch completion does not imply source completion. Results are limited to
24 KiB and complete MCP responses to 64 KiB; verified objects are reused only
within the operation. Single-record readers remain compatible.

<!-- product-tool-example: product_context_prepare -->

```json
{
  "context": "opaque-context-from-product-open",
  "purpose": "implementation",
  "task_id": "TASK-0001",
  "budget_bytes": 8192
}
```

The server keeps one current ready generation per product while retaining
referenced historical evidence. Missing or corrupt pinned content fails closed;
it is never replaced with the latest text. A parent change can make a downstream
artifact non-current for new work without deleting the accepted historical
version.

## Read saved draft evidence

Ready-source readers (`product_element_get`, `product_decision_get`) select pinned
ready evidence. Use the read-only `product_candidate_record_get` to inspect a
saved candidate decision or research record by exact kind, ID and revision.
Replace placeholders with the returned candidate and record references:

<!-- product-tool-example: product_candidate_record_get -->

```json
{
  "context": "latest-opaque-product-context",
  "candidate_ref": {
    "product_id": "11111111-1111-1111-1111-111111111111",
    "candidate_id": "22222222-2222-2222-2222-222222222222"
  },
  "record_ref": {
    "kind": "decision",
    "id": "33333333-3333-3333-3333-333333333333",
    "revision": 1
  }
}
```

For research use `kind: "research"`. Append every `result.text` in order, checking
`offset`, `total_characters` and the same `source_object_sha256`. Keep selectors
unchanged and pass `next_cursor` as `cursor` until `complete: true` and
`next_cursor: null`. Offsets count Unicode code points. Parse the assembled
`canonical-json-utf8` record only after complete delivery. This does not activate
the draft or substitute a newer revision. Changed sources require a fresh read.

List documents before choosing a `subject`. Use an exact registered subject,
such as `Overview` when present; an invented `Architecture` subject is not
automatically created. This request accepts `limit` from 1 to 50 (default 20):

<!-- product-tool-example: product_document_list -->

```json
{
  "context": "latest-opaque-product-context",
  "artifact": "technical-design",
  "limit": 50
}
```

Complete the inventory continuation. Other tools have their own bounds. Invalid
calls can return structured field paths, expected constraints and recovery
guidance; subject errors can expose bounded registered-document choices.
Diagnostics neither apply corrections nor authorize new documents. Check the
current advertised schema before retrying the corrected call.

## Review lifecycle

Product artifact review and specification completeness review are different
protocols.

For a product candidate, `product_review_start` starts a full semantic-block
review or an eligible finding-linked followup. The canonical atom ledger still
covers every selected element, decision, relation, scope and prose fragment.
Each atom has one primary block; shared evidence remains related context in every
affected block. Structural checks never replace independent semantic judgment.

Read bounded pages with `product_review_get_batch` (1–20 portions, at most 24 KiB).
Finish partial blocks through `product_review_get` cursors. Judge complete blocks
and checkpoint with `product_review_record_batch` (1–20 verdicts, at most 131072
UTF-8 argument bytes). An invalid member rejects the entire batch. Exact retry
recovers the same operation, but reordered or overlapping input is not a retry.
Legacy single-item APIs and existing atomic inventories remain supported.

After the blocks, record final cross-block consistency and complete the review.
Full semantic reviews return the membership/result ledger for this judgment,
without requiring a second delivery of all source text. A corrections-only
followup still checks the whole current artifact and inherits only unchanged
evidence with bounded impact. New instructions, changed scope, uncertain influence
or missing historical evidence require a new full review.

Review storage v2 indexes immutable verdict objects. Used evidence is verified
on each call; full audits run on open/resume, first process access, completion,
activation and use as a followup parent. Corruption of untouched objects may be
detected later, never accepted at the final gate. Legacy storage migrates
atomically on the first actual write, retaining inventory semantics and object
identities. Read-only status and exact no-op retries do not migrate anything.

<!-- product-tool-example: product_review_start -->

```json
{
  "context": "opaque-context-from-product-open",
  "candidate_ref": {
    "product_id": "11111111-1111-1111-1111-111111111111",
    "candidate_id": "22222222-2222-2222-2222-222222222222"
  },
  "mode": "full"
}
```

After a successful product review, `product_review_start` accepts
`mode: "recheck"` with `parent_review_ref` and no `fixes`. This differs from
`followup`, which requires an earlier completed review with gaps and
finding-linked fixes. Recheck verifies retained parent evidence, unchanged sources
and bounded change impact, inherits eligible unchanged verdicts and leaves
affected blocks pending. An independent reviewer and a new final consistency
verdict are still required. Scope changes, uncertain impact or unavailable history
require a new full review; a small edit is not automatically harmless.

<!-- product-tool-example: product_review_start -->

```json
{
  "context": "latest-opaque-product-context",
  "candidate_ref": {
    "product_id": "11111111-1111-1111-1111-111111111111",
    "candidate_id": "22222222-2222-2222-2222-222222222222"
  },
  "mode": "recheck",
  "parent_review_ref": "44444444-4444-4444-4444-444444444444"
}
```

Product-wide accepted architecture may use `global: true, stage_refs: []` before
a Roadmap exists; do not relabel an accepted target as a hypothesis to bypass
validation. Decision source pins may have empty `element_ids`.

### Source and verdict digests

Opt into `representation: "explicit-v1"` on supported review readers and keep it
unchanged through continuations:

<!-- product-tool-example: product_review_consistency_get -->

```json
{
  "context": "latest-opaque-product-context",
  "review_ref": "44444444-4444-4444-4444-444444444444",
  "representation": "explicit-v1"
}
```

`source_version_sha256` identifies the candidate snapshot.
`source_content_sha256` hashes exact review-item UTF-8 text without an added
newline; `source_object_sha256` hashes retained immutable object bytes. Their
identity and canonicalization fields define each comparison domain.
`verdict_object_sha256` hashes the saved verdict. The legacy `object_sha256` in
the consistency result remains an alias for that verdict hash, not a document
hash. A new verdict can change it while its source is unchanged. Omit the
representation for the legacy wire shape; never infer a source hash from a
missing explicit field.

For task specifications, legacy full review remains supported. An enhanced full review
explicitly requests the final whole-specification consistency gate; a
legacy run is never silently upgraded. Detailed verdict batches are atomic and
bounded to 20 items, but they do not replace exact reading or the final
consistency assessment. Corrections-only review is allowed only for changes
linked to findings with unchanged scope and source meaning.

Use structured change summaries only for navigation. Complete
`specification_review_changes_read` to obtain exact before/after fragments and
the terminal receipt; summaries, eligibility flags and externally compressed
display markers are not evidence of reading. If exact text cannot be recovered,
leave the affected verdict unrecorded.

`specification_check_state` reports document status separately from mechanical
coverage and review state. Observing `Approved` does not authenticate consent,
prove semantic correctness or establish reviewer independence.

Use the read-only product status call to observe saved progress without changing
the candidate or review.

<!-- product-tool-example: product_review_status -->

```json
{
  "context": "opaque-context-from-product-open",
  "review_ref": "44444444-4444-4444-4444-444444444444"
}
```

## Task handoff and pins

### Retire a task and resolve dependencies

`roadmap_unlink_dependency` removes exactly one existing `task_ref` →
`requires_task_ref` dependency in the selected Roadmap candidate. It requires
`candidate_ref`, the newest `context`, an `answer_ref` covering both tasks and a
nonblank `reason`. A missing edge fails with `NOT_FOUND`; this is not a silent
no-op. To reassign a prerequisite, link the correct existing task first using
`roadmap_link_dependency`, then unlink the obsolete edge. Inspect existing
relations before linking: duplicates and cycles remain errors.

`roadmap_retire_task` requires the same candidate/context, `task_ref`,
`answer_ref`, `reason`, and `redistributed_to`: an explicit array of existing
active task refs, or `[]` for outright cancellation. The answer must cover the
retired task and every recipient. First update recipient outcomes, scope and
acceptance with `roadmap_define_task`, retaining the answer provenance. The
retirement operation records the disposition; it does not rewrite recipients.
Unresolved incoming relations from active elements fail with `CONFLICT`. Only
after consumers are explicitly resolved does it retire the stable ID, remove its
active semantic section and outgoing relations, and record the reason and
recipient IDs in a new immutable decision linked to the user answer. It creates
no new task or specification identities and does not mean the task was completed.

Both tools require a current answered decision from the same candidate; an
observation, assumption or unrelated answer cannot authorize them. Dependencies
are stored as relations, not duplicated Markdown fields. The task's containing
subject and its document navigation remain registered; retirement removes only
the selected task section. Old document objects, decision revisions, generations
and tombstone metadata preserve history. New IDs continue above the historical
maximum, including retired IDs.

Unfinished shared bindings (`reserved`, `specified`, `planned`, `started` or
`blocked`) prevent retirement or unlinking the consumer's dependency. This
contract deliberately requires separate disposition of that existing work; it
never releases owners, resets progress, deletes specifications or rewrites pins.
Completed bindings with no running owner/packet are retained byte-for-byte.
Candidate checks and activation recheck binding compatibility, including a
binding created after candidate authoring. This check applies to newly retired
tasks; unchanged historical tombstones do not block unrelated amendments or
rewrite their frozen bindings. A retired ready task cannot reserve
a new specification. Previously frozen work continues to follow the existing
pin rules; retirement cannot be used to cancel a running owner.

Authoring changes only the isolated candidate and invalidates old review by
source version. Check, independent review and activation remain required before
the ready generation changes. Tests use synthetic reviewer protocol evidence;
they do not certify independent human or model review.

The two tools add strict input and operation-intent definitions without changing
the `schema_version: 1` store lifecycle or protocol 2 envelopes. Older records
need no migration. Older runtimes cannot execute the new scenarios. Rebuild the
MCP package and restart the connected process. If the client runs an installed
copy rather than this checkout, separately authorize replacing that copy and
the matching generated skill bundle; building alone does not update it.

A new product-linked task reserves a new workspace specification identity. An
existing standalone specification is not retroactively enrolled. Legacy specifications are not enrolled,
migrated, rebound or rewritten; their absence
of product metadata is not an error.

Before planning or implementation, select the task's product inputs and call
`task_inputs_check`. At the first explicitly authorized implementation start,
the server pins the exact ready inputs. A compatible later product amendment does
not force an already-started task to adopt it. New or not-yet-started work must
reconcile against current applicable product state.

<!-- product-tool-example: task_inputs_check -->

```json
{
  "context": "opaque-context-from-product-open",
  "task_id": "TASK-0001",
  "packet_id": "P01"
}
```

`task_inputs_check` returns a compact check summary, exact source versions,
`check_ref`, pin counts and at most five issue previews. Its verdict still covers
all task inputs. In particular, `packet_id: "P01"` validates that packet's presence
without narrowing the pinned plan. It does not expose the formerly unbounded
`product_pins` and `plan_pins` arrays in the check response.

Read exact evidence only when needed using `task_inputs_details_get`: pass the
same `context`, `task_id`, optional `packet_id`, returned `check_ref`, and a
`section` of `issues`, `product_pins` or `plan_pins`. `limit` accepts 1–100 (default
20); byte limits may shorten a page. Each entry retains its original `index`.
For a large product pin, concatenate `value.element_ids` in `element_offset`
order until its entry reports `complete: true`. The response's `complete` applies
to the entire section. Follow `next_cursor` without changing the selected check.
Changed source, plan, task or safety state rejects old details with `SOURCE_CHANGED`;
repeat the check instead of mixing versions. Both tools are read-only. Packet
start/completion still use the full internal evidence, not the public summary.

An explicit request to replan a paused task can replace frozen inputs with
`task_inputs_reconcile`. Pass a fresh task-wide `check_ref` without a packet
selector, the exact existing active `packet_ids`, and actual `invocation_source`.
The operation requires a current product context, an Approved reviewed
specification, no active packet owner and no unresolved safety or recovery
issues. It archives the complete prior execution binding as an immutable record,
selects the replacement packets and clears current execution progress. Historical
Markdown remains untouched. Repeat `task_inputs_check` after reconciliation.
Reconciliation neither approves planning documents nor starts implementation;
ordinary input checks still reject changed frozen evidence.

Each packet still needs its own explicit invocation. Review, commit and push are
separate actions and are not packet-completion gates. Completion records the
product version actually implemented, which may differ from the current product
head.

## Logical sessions and complete delivery

Prefer MCP scenario tools. `product_session_open` creates a candidate-bound
logical session with the current context and returns `supported_scenarios`.
It tracks context for those scenarios; it does not choose answers, verdicts or
the next workflow. Arbitrary commands, nested sessions and lifecycle operations
are excluded. No product-session CLI is provided. Use the normal stdio executable
when connecting an MCP client requires a command; build/test commands remain
ordinary shell commands.

<!-- product-tool-example: product_session_open -->

```json
{
  "context": "latest-opaque-product-context",
  "candidate_ref": {
    "product_id": "11111111-1111-1111-1111-111111111111",
    "candidate_id": "22222222-2222-2222-2222-222222222222"
  }
}
```

Pass the returned `session_ref` and `session_revision` as `expected_revision`.
Use a new request UUID only for a new intent. The session supplies its context;
omit `context` inside `arguments`. Replace the references in this supported read:

<!-- product-tool-example: product_session_call -->

```json
{
  "session_ref": "opaque-session-from-open",
  "expected_revision": 0,
  "request_id": "55555555-5555-5555-5555-555555555555",
  "scenario": "product_candidate_record_get",
  "arguments": {
    "candidate_ref": {
      "product_id": "11111111-1111-1111-1111-111111111111",
      "candidate_id": "22222222-2222-2222-2222-222222222222"
    },
    "record_ref": {
      "kind": "decision",
      "id": "33333333-3333-3333-3333-333333333333",
      "revision": 1
    }
  }
}
```

Append `delivery.text` until `delivery.complete`, then parse that one JSON
scenario response. Reset the accumulator between complete JSON responses: a
source reader can require several responses for its own continuations. Follow
`product_session_next` until outer `complete` is true, always using the latest
`session_revision` and the same `read_ref`. Do not begin another scenario before
complete delivery. Large records remain bounded rather than silently truncated.

<!-- product-tool-example: product_session_next -->

```json
{
  "session_ref": "opaque-session-from-open",
  "expected_revision": 1,
  "read_ref": "opaque-read-ref-from-call"
}
```

Observe acknowledgement and freshness without writing:

<!-- product-tool-example: product_session_status -->

```json
{
  "session_ref": "opaque-session-from-open"
}
```

After an interrupted response, inspect status and use its exact revision for
explicit recovery:

<!-- product-tool-example: product_session_resume -->

```json
{
  "session_ref": "opaque-session-from-open",
  "expected_revision": 1
}
```

Resume may recover retained delivery. A supported uncertain candidate write is
replayed at most once only when exact completed operation evidence establishes
safe replay. Unknown effects, active or unknown claims, missing evidence and
changed review state remain blocked with `RECOVERY_REQUIRED`. Preserve references
and inspect the owning operation; a new request ID is not recovery. This is not
a general operation-repair API.

After an independent reviewer writes, the author's old context/session can be
stale. Reopen the workspace, inspect candidate and review effects, obtain the
current candidate context and explicitly open a reconciled session. Status and
diagnostics do not silently refresh author state or erase uncertainty.

## Recovery and safety

Multi-file changes use named operation checkpoints; they are not advertised as
one filesystem transaction. On interruption, reopen the workspace and inspect
the returned state before deciding whether the original intent can resume.

The current published runtime does not publish a general operation list, status,
resume or abandon tool. If a mutation reports `RECOVERY_REQUIRED`, preserve its
operation reference and effect disclosure, stop the affected workflow and report
the unresolved checkpoint. Do not substitute the similarly named planning-schema
definitions for callable tools. A retained exact request may replay its saved
result, but an unresolved operation still requires owning implementation or
operator recovery rather than a guessed client mutation.

Exception for `roadmap_unlink_dependency` and `roadmap_retire_task`: their
`resume_operation` field explicitly resumes an exact interrupted request. Retain
the error's `operation_ref` and the original request/context, then retry the same
tool with only `resume_operation` added. The server inspects exact journal
evidence before acquiring the recovery lock. Changed intent, context, target
bytes, head or a live owner fail closed. Draft files can span durable checkpoints
after interruption and cannot be consumed as a coherent source until recovery;
the ready generation stays intact. This is bounded task-change recovery, not a
general migration, repair or lock-removal API.

An incomplete candidate operation blocks another mutation of that candidate,
even if its draft files already match the proposed snapshot. Roadmap review,
readiness and activation also require completion of the retained operation.
Recover the original operation before proceeding; a new request is not a
replacement for recovery.

Never delete a lock or retry a write blindly. Active owners, changed lock bytes,
permission-denied liveness checks and uncertain effects remain blocked. A timeout
or lost response can leave applied effects; inspect the operation and current
state. Exact replay can recover a retained result, but an edited or reordered
request is a new mutation.

On `CONFLICT`, `SOURCE_CHANGED` or `STALE_CURSOR`, stop writes, reopen, inspect
saved effects and versions, then continue only if the same operation or review
is still current. Diagnostics distinguish stale workflow context, a dependency
changing during a read, established review-source drift and an unknown cause;
they never execute their suggested recovery action.

Security, incompatibility or uncertain impact creates a visible safety block for
affected tasks. Do not silently keep old pins or substitute new requirements.
Pause the affected work and obtain an explicit disposition; unaffected work may
continue.

## Proof limits and compatibility

Successful receipts prove protocol delivery, not semantic correctness or that a
model actually read externally compressed text. Hashes, counters and eligibility
checks do not prove harmlessness or reviewer independence. Failed or unavailable
checks remain unverified.

The runtime declares Node.js >=22.20.0 and Linux, macOS and Windows support.
Retained local qualification passed on Linux with Node.js 24.14.0 (887 tests) and
Node.js 22.20.0 (109 focused tests). A later actual-tree Node.js 24.14.0 rebuild
matched all 83 retained runtime package members and passed 20 focused tests.
These are distinct evidence scopes, not a fresh full-suite result after every
documentation edit. The four macOS 15 / Windows 2025 combinations at Node.js
22.20.0 / 24.14.0 are required again. In
[run 38942838354](https://github.com/swimmwatch/engineer-agent-workflows/actions/runs/38942838354),
the four required native jobs failed actual acceptance; build, generation and
lint passed, while downstream native qualification was skipped, not passed.
Linux checks do not substitute for those failures. At that historical snapshot,
a bounded local fixture/packed-launch correction was being prepared; the consumed
one-commit/four-job grant did not authorize another public delivery/native rerun.
Runtime support is unchanged.

Headroom is an external tool, not a repository dependency. Headroom qualification
is outside repository acceptance. Q14 is cancelled and no longer required, never passed.
This scope decision does not claim that an external compressor was fixed or
qualified. Full I11/Q16 remain incomplete even when documentation examples pass;
each changed input snapshot still requires its own actual native results.

Preserve tool schemas, opaque contexts, cursors, source references, hashes and
receipts losslessly outside compressed display text. A `<<ccr:...>>` marker or
truncated JSON is not an exact response. Obtain the retained original through the
owning retrieval path and verify its schema, selected source identity, revision
and digest with complete continuations before consumption. If unavailable or inconsistent, stop the
affected read/verdict and dependent mutation. Keep the MCP response limits; do not
replace an exact response with a summary or another unresolved marker. The MCP
cannot guarantee that an external compressor retains or restores its bytes.

The store is local-only: there is no network service, cross-computer
collaboration guarantee, automatic migration, automatic cleanup or power-loss
durability guarantee. Missing MCP capability blocks affected workflow state;
manual YAML edits and shell readers are not fallbacks.

## Loaded runtime identity

Call this read-only diagnostic on the same MCP connection that will execute the
workflow:

<!-- product-tool-example: workflow_runtime_info -->

```json
{}
```

`package_version` is not a unique build identity. Compare `build_id`,
`contract_id`, `contract_digest`, `identity_status` and advertised `capabilities`.
Identity is captured when that server process loads. Building files, packing an
archive or changing a path does not replace the loaded process. A same-version
build can have different executable bytes. `identity_status: "unavailable"` and
its `reason`/`refresh_requirement` preserve uncertainty; they do not establish
that the client uses the intended build. Refresh through the host's normal
process/configuration lifecycle only with required authorization, then query the
new connection. A local build pass is not a global installation or verification
of the current registered MCP.

For an architectural task, check material technology choices, component
boundaries, data flows, state/database ownership and unconfirmed integrations
before review. Record alternatives, evidence and unresolved choices; a diagram
or mechanical checklist does not replace independent semantic review.

## Operator checklist

1. Start the local stdio MCP with the intended environment and no startup path
   arguments.
2. Call `product_capabilities`, then `product_open` with the absolute workspace.
3. Use the newest returned context after every successful mutation.
4. Complete all exact-read continuations before writing a verdict or consuming a
   selected context.
5. Keep product stages, task specification, planning and each implementation
   packet as separate explicit invocations.
6. On interruption or conflict, inspect operations/reviews and saved effects
   before any retry.
7. Keep explicit product-root backups, client configuration backups and Git
   history conceptually separate.
8. Report unexecuted platforms, model trials and external checks as unverified,
   never passed.

## Bounded retirement review and activation inspection

For task removal, use `product_amendment_prepare.change_scope` with
`kind: task_retirement`, the exact `task_ref` and existing `redistributed_to`
recipients. This records the actual instruction under a built-in Standard/core
amendment; it does not inherit or authenticate broader profile consent.
Preparation returns `review_basis` when the ready generation identifies its
reviewed candidate. Supply that `parent_candidate_ref` and `parent_review_ref`
to `product_review_start` in `recheck` mode. Legacy inputs without adequate
history use full review. `product_review_get_batch.pending_only` omits already
recorded judgments; explicit rereads and reviewer scope expansion remain valid.

A corrections-only followup can map changed document prose through exact
`fixes[].changed_item_keys` when a recorded `__consistency__` finding owns the
correction. Element changes still use `changed_refs`. Always read corrected
blocks and obtain fresh whole-artifact consistency. The opt-in `compact-v1`
consistency representation retains the inventory hash, impact and exact verdict
object hashes without repeating shared source text. Other read representations
are unchanged.

An incomplete correction map returns `PREREQUISITE_REQUIRED` with
`error.details.next_action: "complete_correction_mapping"`. Add the reported
`issues[].missing_ref` values to the relevant `fixes[].changed_refs` and
`issues[].missing_item_key` values to `fixes[].changed_item_keys`, then retry
followup. References cover the complete changed blocks, including dependency
participants and retained retired-task provenance. If `details.truncated` is
true, another retry can report remaining omissions. Unmappable changes still
require full review; prose mapping still requires a recorded consistency finding.

Before activation, retain its original arguments/context.
`product_amendment_activation_status` accepts those same arguments, is read-only,
and distinguishes the operation's published generation from current head.
Repeat the exact original activation request to retrieve a completed result;
incomplete or blocked operations remain with their existing owner. This does
not extend logical-session support to activation or introduce lock removal.

`node scripts/benchmark-roadmap-retirement.mjs OUTPUT full stdio 30 --representative`
measures the full-review baseline. Replace `full` with `recheck` for bounded
inheritance and `stdio` with `direct` to separate native scenario execution from
transport overhead. Outputs use synthetic judgments, not semantic certification.
