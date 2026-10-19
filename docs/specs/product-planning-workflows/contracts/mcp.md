# Product Workflow MCP Contract

Status: Planning contract; implementation status is tracked by task packets.
Requirements: PWF-001–PWF-045. Exact structural and wire input definitions live in
[the data schema](schemas/data.schema.json). This contract is distinct from the
runtime's generated tool-contracts.json until the corresponding packets promote it.

## Discovery metadata contract

PWF-034 applies to existing tool descriptors and new product tools as they become
registered. P19 changes descriptions and schema description annotations only;
validation constraints, defaults, API names, output/error shapes and runtime
effects stay unchanged. Statements below that existing Zod tools stay unchanged
refer to their structural/behavioral contract, not a ban on clearer metadata.

Describe scenario effect first, then material prerequisites or the nearest
confusable alternative. Parameter descriptions explain where opaque context,
reference, version, receipt and cursor values come from and their ownership.
Use the newest returned context after writes. Reopen and inspect after conflict;
do not promise automatic retry/rebase. Requirement and review source_version
fields retain their different semantics. Receipt producers and completion
conditions must match executable code, not a generic shared wording.

Retain the four supported direct decision readers alongside context-bearing
workflow tools. Local component/screen operations register/update/remove local
contract entries, not remote Penpot objects. A setter's documented behavior must
distinguish replacement, deduplication, defaulted omissions and preserved optional
fields. Preserve the scope_propose -> native question -> question_record_answer
-> scope_confirm sequence, and full/followup review prerequisites and consistency
gate. Unchanged unfinished review_start can be a no-write resume; the operation
remains write-capable, as does conditional Approved checkpointing in check_state.

Application result pagination uses next_cursor; complete is present only where
the actual result defines it. Exact reads finish every continuation; section
reads finish the selected section only. Search exhaustion depends on the task.
Do not confuse application pagination with MCP tools/list's nextCursor.

Keep generated metadata authoritative from its executable descriptor/schema
owners. Current tool-contracts.json covers workflow tools, not v1 direct readers;
validate parity over that documented subset and check the remaining discovery
metadata directly. Product input schemas remain JSON-schema-owned. No server
split, eager/deferred loading guarantee or model benchmark claim follows from
the tool count. See P19's M01–M06 checks for concrete metadata and protocol tests;
they are planned checks, not results or changes to stored YAML schemas.

## Configuration

No startup arguments are added. Resolve new product storage lazily:

1. Nonempty `EAW_PRODUCT_DATA_DIR`: require an absolute directory path; invalid
   overrides fail only product operations with INVALID_CONFIG, never fall back.
2. Linux: absolute `XDG_DATA_HOME` plus `engineer-agent-workflows`; unset/empty or
   relative XDG value follows the standard fallback under the user's
   `.local/share/engineer-agent-workflows`.
3. macOS: `Library/Application Support/engineer-agent-workflows` below the
   OS-resolved home directory.
4. Windows: absolute `LOCALAPPDATA` plus `engineer-agent-workflows`; if unavailable,
   report INVALID_CONFIG with the explicit override remedy rather than guess a
   possibly redirected home path.

Use Node's home-directory API, platform path handling and actual canonicalized
existing ancestors. The dedicated root must be outside the selected and already
bound workspace trees, never the user's home itself or a filesystem root. Reject
unsafe links, ambiguous/colliding names and unsupported safety capabilities.
Existing directory permissions are preserved; newly owned POSIX directories/files
use 0700/0600, while Windows relies on the user-profile ACL and actual access
checks, not a claimed chmod equivalence. No elevation or ACL rewrite is implicit.
Read-only calls do not initialize a missing root. Explicit initialize/bind can
create required owned paths; permission errors never create a replacement root.

These placement choices follow [XDG 0.8](https://specifications.freedesktop.org/basedir/0.8/),
[Apple Application Support](https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/FileSystemProgrammingGuide/MacOSXDirectories/MacOSXDirectories.html)
and [Windows LocalAppData](https://learn.microsoft.com/en-us/windows/win32/shell/knownfolderid).
They are planning decisions confirmed by PLD-002, not claims that the current MCP
already supports this configuration.

## Types and wire rules

Capability name: `product-1`; state schema_version: 1. Existing tools retain
their protocol, input fields, receipts and outputs unchanged.
New success envelopes contain `protocol_version: 2`, opaque `context`,
`result`, `replayed` and nullable `operation_ref`; result is validated against
the named definition. Errors use the existing protocol-2 error boundary.
`Success_<Result>` defines each complete success envelope. Capabilities/list
without a workspace may return null context; open always returns a workspace
context, even while unbound. Status results use coverage_status. A failed
mutation never returns a success envelope with a guessed applied result.
New APIs publish strict input **and output** schemas; no unknown fields are accepted.
Every tool named below is a separate callable scenario, not a public generic union.
The JSON schema is the single structural authority for new product inputs and
outputs. The adapter compiles these definitions with existing Ajv and emits
self-contained schemas with their reachable local definitions, rather than
maintaining a second handwritten Zod copy. Existing Zod-based tools stay unchanged.
Capabilities advertise actual registered tools; an incomplete development build
cannot imply that every product scenario is available.

Read `definitions/<tool>_input` and its named payload/result, not the whole schema.
Optional fields are exactly those absent from the input definition's required list.
Default page size is 20, maximum 50. Optional arrays default to empty unless a
scenario requires them. Strings reject NUL/invalid Unicode scalars. Schema-valid
IDs are still checked for existence, ownership, type and revision by runtime rules.
A missing or foreign reference never resolves by title.

`Uuid` identifies products, documents, workspaces, candidates, reviews, operations
and logical specifications. `ElementId` is a server-assigned readable heading ID;
`TaskId` is the task's TASK-0001-style element identity qualified by its product.
`Ref` qualifies an element by product and artifact. `SourcePin` additionally
binds exact generation, immutable object digest and document/record provenance.
Paths and titles never replace those identities. Input context is not authentication.
The server returns named created references; agents never synthesize them.

## Storage layout and publication

All paths in this section are proposed, relative to the selected shared root:

```text
store.yaml                         # bounded product/workspace registry
bindings/<workspace-id>.yaml       # machine-local identity and explicit binding
operations/<operation-id>.yaml     # initialization/binding checkpoints
products/<product-id>/
  head.yaml                        # small pointer to one coherent generation
  generations/<sha256>.yaml         # immutable metadata, not copied semantic text
  objects/<sha256>.md               # retained semantic Markdown bytes
  objects/<sha256>.yaml             # retained structured scope/registry/operation records
  decisions/<artifact>/<decision-id>/<revision>.yaml # one immutable record per exact DecisionRef
  drafts/<candidate-id>/
    candidate.yaml                 # owning artifact, base, scope, current sources
    documents/<artifact>/<subject>.md
  operations/<operation-id>.yaml
  reviews/<review-id>/              # fixed inventory, verdict records, consistency evidence
```

A generation references one Registry, current decision heads, relations and ready
artifact source versions. A DecisionRef resolves its exact validated relative path
directly; no full object/journal scan is needed. The record digest is checked against
the pin/head when available. SourcePin with source_kind=decision carries the exact
decision_ref; other source kinds use their object digest and a null decision_ref.
Predecessor decision revisions are retained once, not copied into every generation.
Unchanged Markdown objects are reused. Same-candidate question revisions retain
their ID; revising an upstream immutable question from another candidate creates a
new ID with the original predecessor ref. Thus two isolated drafts cannot both
overwrite revision N+1 of one ready source. Current selection comes from the chosen
candidate/generation heads, never the highest revision across unrelated drafts.
A mutable draft is not a second ready authority; index.md is only navigation.
Registry element metadata owns typed applicability/provenance, not a duplicate
body or offset index. The parsed Markdown element set must match that metadata.
This bijection applies to active metadata; retired entries are retained tombstones
and cannot be reused even if their old body is absent from the current generation.
Decision affected_refs preserve historical mentions; they are not a second
maintained reverse lineage map. Derive coverage from dependent element provenance.
Build replaceable lookup data in memory or on explicit writes, never by modifying
files on reads. Do not archive every keystroke or store full journals in task pins.
The versioned metadata itself obeys source-size and collection limits.

Head-pointer and supporting checkpoint files have strict shapes owned by the
same schema (Head and Lock definitions). The source document registry is the
single membership authority; AST lookup is derived from registered Markdown.
No additional hand-maintained reverse index becomes authoritative.

An owning scenario materializes a draft before a supported direct Markdown edit.
The prior generation/object remains intact. A modified immutable archive is
corruption: historical reads fail closed, never reconstruct it from current text.
Promotion makes every source object available before switching one same-directory
head pointer. Readers use the pinned generation, not whichever draft looks newest.

## Checkpoint publication protocol

1. Strictly validate semantic inputs, capabilities, response budget and safe roots.
   Bind an exact request digest to the original context, tool and arguments.
2. Acquire a cooperative catalog/product lock with exclusive creation. Acquire
   multiple locks in deterministic root-then-product-then-workspace order.
   Never wait indefinitely, silently steal a crash lock or widen access.
3. Check target and selected-source versions under the lock; replay a matching
   saved operation before creating a second effect. Preserve existing legacy
   receipt keys; new operation records are retained without automatic expiry.
4. Persist named intent/expected-before-and-after hashes, owner/session and
   recoverable progress. Write and verify new immutable objects and prospective
   complete response before publishing any mutable pointer.
   Operation.scenario and intent_sha256 identify an immutable Intent_<tool> record
   containing the exact validated original arguments; a request hash alone is not
   sufficient recovery evidence. Saved result_sha256 resolves the corresponding
   Success_<Result> envelope. Both records are validated against that scenario,
   not an arbitrary internal object. Completion retains packet evidence references
   and its operation identity in the task sidecar.
5. For a task-binding operation, persist its reserved local sidecar as pending,
   then publish the shared reservation and mark both complete. A missing or
   conflicting side cannot count as a valid binding. Do not claim a cross-volume
   transaction or overwrite pre-existing user files.
6. Recheck source guards. Atomically replace the small head file from a closed,
   synced temporary file in the same directory; then checkpoint completion.
   No rename of a populated directory or cross-device rename is required.
7. Return the actual updated context and receipt; close descriptors on all paths.
   After an ambiguous interruption use operation-list/status and explicit resume.
   A crash after head publication but before its final receipt must reconcile
   from the operation's expected after digest, never apply the semantic edit twice.

Supported guarantee is process interruption, not power loss or disk destruction.
Local filesystems must support the required guarded reads/exclusive creation and
single-file replacement; network/distributed storage is not qualified by these tests.
Node's promise filesystem calls do not serialize themselves, and platform flags
differ: see [Node 22.20 filesystem documentation](https://nodejs.org/download/release/v22.20.0/docs/api/fs.html).
Qualification tests, not this citation, establish this implementation's behavior.

Recovery inspection verifies exact lock/checkpoint identity. Explicit resume may
replace only the verified operation's stale lock after the recorded process is
proven absent and a separate exclusive recovery claim succeeds. PID reuse,
permission-denied liveness checks, active owners or changed lock bytes remain
blocked. Age alone is not proof. Preserve user edits and published evidence;
abandon only marks pending work as abandoned, with no recursive cleanup.

New receipts remain retrievable until an explicit future retention design; reaching
the configured collection bound fails before a new write. Unknown/lost/corrupt
receipts with potentially applied effects report RECOVERY_REQUIRED, not a new mutation.

## Markdown and semantic authoring

Substantive files have a document identity and type-specific semantic sections
with server-owned `### <ElementId>: <Title>` headings. Parse with the existing
mdast dependency; derive source spans only from a fresh validated digest.
MCP renders the named semantic fields with stable subheadings and preserves
unrelated byte spans/newline style. These fields remain in Markdown, not mirrored
as full semantic YAML payloads. Structured refs/applicability/membership live in
the versioned registry/relations metadata with unambiguous element ownership.

Navigation files contain only derived titles/links. Each PRD/Technical Design
begins with one semantic member plus its index; create additional subjects only
when used. Reject an empty subject as readiness evidence. Cross-member duplicate
IDs, retired IDs, malformed required fields, unregistered Markdown and case/Unicode
collisions block the affected check/write. Runtime validates semantic field types
after parsing; successful Markdown parsing alone is insufficient.

Define tools accept one typed semantic record, never a whole document, arbitrary
field selector or path. The optional element_ref means update that existing type;
otherwise the server assigns an identity. A public subject must resolve exactly;
ambiguous subjects require a user choice. Same-ID moves within an artifact preserve
refs; moving meaning to another artifact requires an explicit new relation and
retirement rather than silently changing its owner.

## Workspace and specification ownership

Resolve Git worktree identity with a bounded, read-only `git rev-parse
--path-format=absolute --git-common-dir` call and canonical filesystem evidence.
Ignore inherited repository-redirecting Git environment values; do not invoke
hooks, shells, checkout or remote commands. If that option is unsupported, the
documented `--git-common-dir` result can be resolved relative to the explicit cwd
and verified. Do not assume a minimum Git version from a developer installation.
See [git-rev-parse](https://git-scm.com/docs/git-rev-parse).

A known common Git directory lets a genuine linked worktree resolve an existing
binding on read without persisting a new workspace registration. The first explicit
bound write registers that concrete workspace. Separate clones and non-Git
directories require explicit binding. Symlink/case aliases must not create duplicate
logical owners; conflicting identities return AMBIGUOUS_BINDING.

A new task-spec reservation creates
`docs/specs/<slug>/.workflow/product-binding.yaml` in the selected workspace.
That sidecar is a new product-1 artifact, not an extension silently inserted into
the four existing workflow schemas. A directory containing an existing spec or
legacy decisions without the matching reservation is not eligible. Register-copy
validates the same product/task/spec identity from an already reserved branch copy.
Never enroll this implementation specification retroactively.

Only one logical task may own one logical specification and conversely.
Multiple working copies share identity but not independent completion or simultaneous
execution authority. Live owner handoff is explicit and does not require a commit.

## Fingerprints and readiness

The artifact source fingerprint includes its actual semantic members, scope,
applicable source revisions and predecessor evidence, relations and upstream pins.
It excludes its own review verdicts, observation reads and transport receipts.
Whole-spec legacy fingerprints remain unchanged.
A selective task/context pin does not include unrelated journal revisions, but
always checks currently applicable global safety/incompatibility blockers.

Only the author activates a candidate after a current pass; MCP checks conditions
without claiming semantic correctness, authenticated consent or reviewer independence.
Draft saves do not trigger a review. Store review inventory/read receipts and results
durably; do not count a partial read or an attempted record as a saved verdict.

For corrections-only followup, inherit only proven unchanged, previously successful
items with provenance after deterministic impact validation. New scope, missing
inputs or uncertain impact requires full review. Detailed correction checks do not
replace one whole-current-artifact consistency read. Changing reviewed input makes
the result stale; old verdicts are not manually copied into a new pass.

A change to a parent artifact may leave downstream accepted historical versions
retained but non-current for new work. Block new readiness/start until relevance and
consistency are assessed. For jointly dependent updates, activate all checked
candidate refs in one generation or leave the prior head unchanged. Each candidate
still needs its owning workflow and independent pass; the activation tool does not
invoke those workflows.

## Errors and budgets

| Code                                                     | Meaning and caller action                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| INVALID_INPUT / INVALID_CONFIG                           | Invalid semantic input or root setting; no write; correct the exact input.                        |
| UNSUPPORTED_VERSION / CAPABILITY_REQUIRED                | Unsupported product contract; old tools remain usable; no automatic install/migration.            |
| NOT_FOUND / BROKEN_REFERENCE / AMBIGUOUS_BINDING         | Missing, foreign, retired or ambiguous identity; never fuzzy-match.                               |
| INVALID_STATE / INVALID_YAML / INVALID_MARKDOWN          | Invalid actual bytes/schema/semantic structure; preserve them for owning reconciliation.          |
| UNSAFE_PATH / ACCESS_DENIED                              | Rejected path, link, collision or rights; do not elevate or select a different root.              |
| SOURCE_LIMIT / RESULT_LIMIT                              | Bounded source, graph or response capacity exceeded; no truncation-as-success or cleanup.         |
| BUSY / RECOVERY_REQUIRED                                 | Active or unresolved operation; inspect, do not delete a lock or blindly retry.                   |
| CONFLICT / SOURCE_CHANGED / STALE_CURSOR                 | Target/selected source changed; reopen, inspect saved effects and reconcile.                      |
| PREREQUISITE_REQUIRED / REVIEW_REQUIRED / SAFETY_BLOCKED | Missing ready input, independent evidence or safety disposition; owning workflow must resolve it. |

All errors use bounded non-reflecting messages, optional code/ref-only details and
explicit `operation_applied: false|true|null` for mutations; null means unknown,
not permission to replay. Return operation_ref where already durably known.
Do not embed raw user sources, absolute private paths, stack traces or environment values.

Limits: 16 MiB per saved/read source; 100,000 decision revisions per logical
artifact journal; 24 KiB structured/64 KiB wire reply; 2 MiB stdio input.
New metadata: 10,000 products/workspaces per registry; 1,024 members per artifact;
10,000 current semantic elements/relations per artifact and 100,000 retained
operations per product/root scope. JSON-schema array maxima apply in addition.
Context exact text portions are at most 4,096 Unicode code points within their
byte budget; a portion may shrink to fit. Default context budget 8,192 bytes,
allowed 1,024–16,384. Bound traversal and input reads before materializing large
collections; over-limit closure blocks, never omits required sources.
Cursor validation binds query, selection, order and all selected source versions.

## Specification workflow diagnostics

PWF-035–PWF-038 extend only the existing protocol-2 specification workflow.
Existing error codes, rejection semantics, message limit, response limits and
product JSON-schema diagnostics remain compatible.

Workflow `error.details` is a closed bounded object:

- `issues` contains at most 20 ordered entries;
- `truncated` states whether safe entries or an allowed-ID list were omitted;
- `next_action`, when present, is one of the published fixed recovery actions,
  never caller text.

Each issue has exactly one of these shapes:

1. `validation`: a fixed category, a path made only from published field names
   and numeric indexes, and an optional published numeric limit. An unknown input
   key yields `unknown_field` at its known parent path; the key is not echoed.
2. `question_options`: the saved `question_ref`, a bounded list of saved
   `allowed_option_ids`, `allowed_option_ids_complete`, and, when incomplete,
   the exact saved decision reference to continue through `decision_get`.
3. `batch_member`: zero-based `item_index`, a fixed category
   (`duplicate`, `unknown`, `foreign`, `stale`, or
   `unknown_requirement`), and requested/current saved references only when a
   coherent snapshot established them.
4. `review_lifecycle`: saved `review_ref`, `mode` (`full` or `followup`),
   a fixed lifecycle reason, and one applicable fixed next action. Unknown or
   inaccessible reviews do not receive invented lifecycle fields.

Compact JSON `details` is at most 8,192 UTF-8 bytes. Deterministic truncation
retains the issue kind, known batch index, truncation flag and safe recovery
action. It never contains submitted answers/explanations, context or read tokens,
filesystem paths, stacks, arbitrary keys or payload values. Saved domain
identifiers are not permission to reflect rejected input.

`specification_check_state` returns these independent observations:

- `document_status`: `missing`, `draft`, or `approved`;
- mechanical `status` and issues;
- `coverage_status`;
- `approval_checkpoint_status`: `not_applicable`, `absent`, or `recorded`;
- `approval_checkpoint_written`: whether this call durably recorded the one
  eligible author-made Draft-to-Approved observation.

Invalid Markdown retains the existing error. Approved-at-review-start is not a
transition. A stale historical checkpoint is not current evidence.
`specification_review_status` remains read-only. MCP does not edit Markdown,
approve a specification, prove semantics, or authenticate reviewer independence.

Revision warnings count ambiguous decision IDs after removing rows explicitly
marked `superseded` and revisions consumed by valid same-ID
`supersedes_revision` edges. Current-record selection remains the legacy newest
non-explicitly-superseded record. A valid linear chain warns zero; branches warn
once per ambiguous ID.

## Atomic review-verdict batches

PWF-039–PWF-041 add one specification workflow scenario:

| Tool                                | Input                                                                          | Result                                                                                    | Effect                                |
| ----------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------- |
| `specification_review_record_batch` | current `context`, one `review_ref`, and 1–20 ordered distinct verdict `items` | ordered per-item recorded outcomes, `batch_size`, total `recorded_items`, updated context | one atomic decisions-journal mutation |

Each item has the existing single-verdict fields: `item_index`,
`read_receipt`, `verdict`, `explanation`, optional `counterexample`,
`evidence_requirement_ids`, and `evidence_source_refs`. Every item independently
satisfies the same current-review, complete-read, evidence, counterexample and
full/followup detailed-item rules as `specification_review_record`.

The complete arguments object, including context and review reference, is limited
to 131,072 UTF-8 bytes of compact JSON before defaults. JSON-RPC framing is
excluded; the existing 2-MiB transport and response limits remain. Item-count,
argument-size and duplicate-index failures occur before a durable write.

All members are validated against one coherent snapshot under the existing lock.
Only after every member passes are their results appended in request order. Any
invalid or already-recorded member, including an identical overlap or a mixed
existing/new request, rejects the whole batch and identifies its zero-based batch
position through the diagnostics above. No member is skipped or overwritten.

The existing mutation identity makes an exact replay of a committed request —
including original context and item order — return its stored result with
`replayed: true` and no new verdict, receipt or write, including after restart
while the latest-64 receipt remains retained. A changed context, order or verdict
is a new request. An expired original-context replay fails stale. The success
reply is budgeted before commit.

Batches are valid for full and eligible followup detailed items. Inherited results
are not resubmitted; whole-specification followup consistency stays a separate
operation. A batch does not complete a review or mark a specification Approved.
The single-item operation remains available. Receipts prove protocol delivery, not
that a model received or understood externally compressed text.

No workflow YAML schema, review inventory, context encoding, retention policy,
compaction or migration changes are introduced.

## Specification review efficiency

G02 / PWF-042–PWF-045 extend only standalone specification-review scenarios.
These are planned contracts, not claims about installed MCP capability. Preserve
protocol 2, existing default calls, source/response budgets and product schemas.

### Enhanced full mode (P22)

- `specification_review_start`: add optional `require_consistency: true`.
  Omission retains legacy full behavior. Save `consistency_required: true` on
  enhanced runs; start/status disclose it. An unchanged same-mode pending run
  resumes without writing. A mode mismatch never edits a retained run in place:
  return `INVALID_STATE` with fixed `review_mode_mismatch` and
  `start_fresh_review` guidance; an explicit `mode: full` plus the requested
  capability starts a distinct full run while retaining prior results.
- `specification_review_get`: for enhanced full runs, the final context item
  contains complete current spec text (including requirement blocks), all saved
  detailed verdicts and findings. Use existing bounded portions/continuations.
  Issue `consistency_read_receipt` only for the final fully delivered body; bind
  it to run, source, item, exact body and current detailed verdict set.
- `specification_review_consistency_record`: allow enhanced full runs as well
  as existing followups. Require all detailed results and fresh final receipt;
  keep `consistent | gap | conflict`, explanation and counterexample rules.
  Reject overwrite, early/stale assessment and detailed-batch substitution.
- `specification_review_complete`: enhanced completion additionally requires
  final consistency. Status identifies detailed-pending, consistency-pending,
  recorded and completed states. Existing legacy full runs keep old rules and
  are never retrospectively labelled enhanced. Existing stale/replay guards stay.
- Canonical skills use the advertised enhanced option; absence is a capability
  blocker for upgraded readiness, not permission to hand-edit or install.
  Read a whole item or supported group, record acknowledged results, then read
  the next group. The group limit remains 20 and 131,072 argument bytes; use
  smaller groups or singles when necessary.

### Structured change navigation (P23)

Preserve `specification_review_changes` text mode unchanged. Add two read-only,
strict protocol-2 scenarios; they project the same existing impact calculation:

| Tool                                   | Input                                                               | Result                                                                                            |
| -------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `specification_review_changes_summary` | `context`, parent `review_ref`, optional `cursor`                   | `report_version`, `eligible`, fixed `full_review_reasons`, counts, and bounded navigation entries |
| `specification_review_changes_read`    | `context`, parent `review_ref`, `report_version`, optional `cursor` | ordered exact evidence fragments, completion state and terminal `changes_receipt`                 |

`report_version` binds project/specification, parent snapshot and current
source. Summary entries are discriminated records for `finding`, `change`,
`required_item` and `candidate_item`, with the server-issued item/finding key.
Finding records explicitly name `finding_key` rather than requiring callers to
guess that it matches an item key. Changes identify before/after presence and
the exact evidence selector. Page at most 20 entries and respect reply budgets;
publish exact counts and one continuation over the deterministic combined order
(findings, changes, required items, candidates; stable inventory order within).
Fixed reasons reflect existing eligibility checks plus unknown-impact refusal;
no arbitrary source text belongs in reason codes. `eligible` is mechanical
eligibility, never authenticated semantic approval.

The evidence reader delivers ordered fragments of individual finding or
before/after field values, not split serialized JSON. Each fragment identifies
entry key, side/field, Unicode-code-point offset, exact text and field completion.
A page may contain one fragment, bounded by 1,024 code points and actual wire
budgets. Traverse all changed bodies and original finding records in fixed
order; include field identity/type metadata so the exact semantic records are
reconstructable. A single version-bound cursor covers that sequence. Only its
terminal page issues the existing equivalent complete-change receipt. Summary
pages never issue it. Legacy text and structured readers share semantic report
identity; reject stale/foreign/tampered cursors and incomplete receipts without
writes. Do not interpret a protocol receipt as actual model reading evidence.

Eligibility may accept finding-linked context-only changes only under PWF-043.
Retain strict existing exclusions for changed original source meaning, manifest,
profiles, removed items, Approved parent and missing/corrupt evidence. Preserve
the explicit old/new link closure for required items. Context/profiles are
always fresh; inherited detailed results retain parent attribution. Reviewer
assesses semantic influence, uses scope expansion when bounded, and falls back
to full review when influence is uncertain. Fix links cannot manufacture consent.
No new local spec or source is rewritten by these tools.

### Conflict causes (P24)

Keep existing top-level errors, including `CONFLICT` and `STALE_REVIEW`.
Use the existing closed diagnostic envelope for an additive fixed cause:

- `stale_context`: a supplied workflow artifact version is outdated;
- `dependency_changed_during_read`: a guarded dependency changed during a read;
- `review_source_changed`: a coherent comparison positively established semantic
  review-input drift;
- `unknown`: safe coherent classification was unavailable.

Do not classify semantic source drift solely from a journal-byte mismatch.
Precedence: positively established semantic drift, otherwise the known local
guard cause, otherwise unknown. Fixed recovery is `reopen_and_inspect_review`
for context/read/unknown conflicts and `start_fresh_review` only for proven
review-input drift after inspection. Reopening is never an automatic write retry.
A read-race response is not a successful coherent snapshot. Existing applicable
operation-effect fields retain their meanings; no invented applied/not-applied
claim is allowed when effects are uncertain.

New details follow P20 limits and exclude source contents, context/receipt tokens,
paths and arbitrary caller values. Existing proof flags stay unchanged and are
documented as proof limits rather than failed checks under PWF-037/P18.

## Scenario inventory

All signatures and inline object fields are closed by the linked input definition.
Output columns reference strict schema definitions, not arbitrary object payloads.
A write annotation does not give an agent permission to invoke the operation.
Read annotations are readOnly=true/destructive=false/idempotent=true; mutation
annotations are readOnly=false/idempotent=true, destructive=true for replacement,
move, retire, rebase, activation, binding or abandonment; append/create defaults false.

## Product discovery

Open/list/capabilities do not create directories or repair indexes. Initialization explicitly creates and binds a product plus its first Idea draft. Binding a separate clone requires an actual selection, not a remote URL/name match. Unbound open still returns a workspace-scoped context for pending-operation discovery.

| Tool                     | Input definition                             | Typed payload          | Result           | Effect    |
| ------------------------ | -------------------------------------------- | ---------------------- | ---------------- | --------- |
| `product_capabilities`   | `#/definitions/product_capabilities_input`   | Named fields in schema | `Capabilities`   | Read only |
| `product_open`           | `#/definitions/product_open_input`           | Named fields in schema | `OpenResult`     | Read only |
| `product_list`           | `#/definitions/product_list_input`           | Named fields in schema | `Page`           | Read only |
| `product_initialize`     | `#/definitions/product_initialize_input`     | Named fields in schema | `MutationResult` | Mutation  |
| `product_bind_workspace` | `#/definitions/product_bind_workspace_input` | Named fields in schema | `MutationResult` | Mutation  |

## Interview and evidence

Questions belong to one candidate/artifact. Proposal returns question_ref; only a real recorded answer can confirm that exact proposal. Optional revisions preserve ancestry. No-answer states remain unresolved. Observations and assumptions cannot impersonate user instructions. Research stores conclusions and applicability, never executes tasks.

| Tool                         | Input definition                                 | Typed payload          | Result            | Effect    |
| ---------------------------- | ------------------------------------------------ | ---------------------- | ----------------- | --------- |
| `product_artifact_draft`     | `#/definitions/product_artifact_draft_input`     | Named fields in schema | `MutationResult`  | Mutation  |
| `product_interview_resume`   | `#/definitions/product_interview_resume_input`   | Named fields in schema | `InterviewResume` | Read-only |
| `product_scope_propose`      | `#/definitions/product_scope_propose_input`      | Named fields in schema | `MutationResult`  | Mutation  |
| `product_scope_confirm`      | `#/definitions/product_scope_confirm_input`      | Named fields in schema | `MutationResult`  | Mutation  |
| `product_question_prepare`   | `#/definitions/product_question_prepare_input`   | Named fields in schema | `MutationResult`  | Mutation  |
| `product_question_answer`    | `#/definitions/product_question_answer_input`    | Named fields in schema | `MutationResult`  | Mutation  |
| `product_question_no_answer` | `#/definitions/product_question_no_answer_input` | Named fields in schema | `MutationResult`  | Mutation  |
| `product_record_instruction` | `#/definitions/product_record_instruction_input` | Named fields in schema | `MutationResult`  | Mutation  |
| `product_record_observation` | `#/definitions/product_record_observation_input` | Named fields in schema | `MutationResult`  | Mutation  |
| `product_record_assumption`  | `#/definitions/product_record_assumption_input`  | Named fields in schema | `MutationResult`  | Mutation  |
| `product_record_research`    | `#/definitions/product_record_research_input`    | Named fields in schema | `MutationResult`  | Mutation  |

## Idea and PRD scenarios

Each define call creates one server-identified element or replaces the addressed element of the same semantic type; omitted element_ref means create. Exact subject must be registered and unambiguous. Semantically related content is linked, not duplicated into other artifacts. Choosing an idea direction requires an explicit answered source. A null baseline/target remains unknown.

| Tool                     | Input definition                             | Typed payload          | Result           | Effect   |
| ------------------------ | -------------------------------------------- | ---------------------- | ---------------- | -------- |
| `idea_define_problem`    | `#/definitions/idea_define_problem_input`    | `IdeaProblem`          | `MutationResult` | Mutation |
| `idea_compare_direction` | `#/definitions/idea_compare_direction_input` | `IdeaDirection`        | `MutationResult` | Mutation |
| `idea_choose_direction`  | `#/definitions/idea_choose_direction_input`  | Named fields in schema | `MutationResult` | Mutation |
| `prd_define_actor`       | `#/definitions/prd_define_actor_input`       | `PrdActor`             | `MutationResult` | Mutation |
| `prd_define_goal`        | `#/definitions/prd_define_goal_input`        | `PrdGoal`              | `MutationResult` | Mutation |
| `prd_define_capability`  | `#/definitions/prd_define_capability_input`  | `PrdCapability`        | `MutationResult` | Mutation |
| `prd_define_use_case`    | `#/definitions/prd_define_use_case_input`    | `PrdUseCase`           | `MutationResult` | Mutation |
| `prd_define_rule`        | `#/definitions/prd_define_rule_input`        | `PrdRule`              | `MutationResult` | Mutation |
| `prd_define_constraint`  | `#/definitions/prd_define_constraint_input`  | `PrdConstraint`        | `MutationResult` | Mutation |
| `prd_define_term`        | `#/definitions/prd_define_term_input`        | `VocabularyTerm`       | `MutationResult` | Mutation |

## Technical Design scenarios

Technical elements refer to exact PRD elements and record applicability. A hypothesis is not implemented behavior. Existing authoritative API/data contracts remain addressed links. Policies cover quality/security/compatibility without inventing a second technical requirements document.

| Tool                          | Input definition                                  | Typed payload       | Result           | Effect   |
| ----------------------------- | ------------------------------------------------- | ------------------- | ---------------- | -------- |
| `technical_define_boundary`   | `#/definitions/technical_define_boundary_input`   | `TechnicalBoundary` | `MutationResult` | Mutation |
| `technical_define_technology` | `#/definitions/technical_define_technology_input` | `TechnologyChoice`  | `MutationResult` | Mutation |
| `technical_define_policy`     | `#/definitions/technical_define_policy_input`     | `TechnicalPolicy`   | `MutationResult` | Mutation |

## Roadmap scenarios

Stage labels/order are mutable but identities are not. Store membership/dependencies at their dependent entity; derive reverse views. Every task obtains a TASK-0001-style server identity. No task spec is created by roadmap authoring. Splitting preserves the old retired task, creates fresh task/spec reservations when later requested, and rejects ambiguous dependent reassignment until explicitly resolved.

| Tool                           | Input definition                                   | Typed payload          | Result           | Effect   |
| ------------------------------ | -------------------------------------------------- | ---------------------- | ---------------- | -------- |
| `roadmap_define_stage`         | `#/definitions/roadmap_define_stage_input`         | `Stage`                | `MutationResult` | Mutation |
| `roadmap_define_epic`          | `#/definitions/roadmap_define_epic_input`          | `Epic`                 | `MutationResult` | Mutation |
| `roadmap_define_story`         | `#/definitions/roadmap_define_story_input`         | `Story`                | `MutationResult` | Mutation |
| `roadmap_define_task`          | `#/definitions/roadmap_define_task_input`          | `Task`                 | `MutationResult` | Mutation |
| `roadmap_link_dependency`      | `#/definitions/roadmap_link_dependency_input`      | Named fields in schema | `MutationResult` | Mutation |
| `roadmap_split_task`           | `#/definitions/roadmap_split_task_input`           | Named fields in schema | `MutationResult` | Mutation |
| `roadmap_record_stage_outcome` | `#/definitions/roadmap_record_stage_outcome_input` | Named fields in schema | `MutationResult` | Mutation |

## Document organization

Subject creation never takes an arbitrary path. MCP assigns a validated path and document identity. Navigation is derived. For splitting: create a subject then move selected elements as a recoverable checkpoint. Begin-edit materializes a draft from retained ready evidence and returns an editable path, never an archive object. Accept-edits requires the observed digest and a saved explicit instruction; unknown provenance cannot silently become consent. Retirement blocks while unresolved live dependencies remain.

| Tool                              | Input definition                                      | Typed payload          | Result           | Effect    |
| --------------------------------- | ----------------------------------------------------- | ---------------------- | ---------------- | --------- |
| `product_document_list`           | `#/definitions/product_document_list_input`           | Named fields in schema | `Page`           | Read only |
| `product_document_create_subject` | `#/definitions/product_document_create_subject_input` | Named fields in schema | `MutationResult` | Mutation  |
| `product_document_move_elements`  | `#/definitions/product_document_move_elements_input`  | Named fields in schema | `MutationResult` | Mutation  |
| `product_document_rename`         | `#/definitions/product_document_rename_input`         | Named fields in schema | `MutationResult` | Mutation  |
| `product_document_begin_edit`     | `#/definitions/product_document_begin_edit_input`     | Named fields in schema | `EditResult`     | Mutation  |
| `product_document_inspect_edits`  | `#/definitions/product_document_inspect_edits_input`  | Named fields in schema | `Page`           | Read only |
| `product_document_accept_edits`   | `#/definitions/product_document_accept_edits_input`   | Named fields in schema | `MutationResult` | Mutation  |
| `product_element_retire`          | `#/definitions/product_element_retire_input`          | Named fields in schema | `MutationResult` | Mutation  |

## Context selection and exact reads

Context preparation requires exactly one task_id or artifact. It resolves current inputs for unstarted work and exact historical pins for started work, plus current safety blocks. required_refs may only add justified references, never remove server-required ones. All pages include exact immutable pins and completeness; next consumes an opaque query-bound cursor. Element/decision getters follow all text/source continuations.

| Tool                      | Input definition                              | Typed payload          | Result             | Effect    |
| ------------------------- | --------------------------------------------- | ---------------------- | ------------------ | --------- |
| `product_element_find`    | `#/definitions/product_element_find_input`    | Named fields in schema | `Page`             | Read only |
| `product_element_get`     | `#/definitions/product_element_get_input`     | Named fields in schema | `Portion`          | Read only |
| `product_decision_find`   | `#/definitions/product_decision_find_input`   | Named fields in schema | `Page`             | Read only |
| `product_decision_get`    | `#/definitions/product_decision_get_input`    | Named fields in schema | `Portion`          | Read only |
| `product_context_prepare` | `#/definitions/product_context_prepare_input` | Named fields in schema | `ContextSelection` | Read only |
| `product_context_next`    | `#/definitions/product_context_next_input`    | Named fields in schema | `ContextSelection` | Read only |

## Review and amendment scenarios

The first artifact draft may be created without a ready version of that artifact.
Further revisions use amendment-prepare, which records the supplied actual intent
text/source in the new candidate rather than requiring a decision inside a
not-yet-created candidate. Missing ready upstream artifacts remain explicit
readiness prerequisites. Task inputs-check returns a bounded `TaskCheckSummary`:
status, specification versions, source counts, issue previews, and a `check_ref`.
Retrieve full issues or product/plan pins only when needed through read-only
`task_inputs_details_get`, using the same context, task, optional packet, and
check reference. Pages are byte-bounded; oversized product pins expose successive
`element_ids` fragments with the same index and explicit `element_offset` and
`complete` fields. Changed check inputs invalidate continuations with
`SOURCE_CHANGED`. Packet selection validates that packet but does not narrow the
complete task evidence. Internal `TaskCheckResult` and packet transitions retain
all product and plan pins.

Review freezes all applicable scope, source history, semantic members, relations, non-requirement prose and profile items. Start is no-write for an unchanged pending run. A followup needs a completed parent, unchanged scope, complete correction links and known impact; otherwise it explicitly requires full review. Only full reads issue read receipts. Followup completion additionally needs a fresh entire-current-artifact consistency receipt. No tool performs semantic review or authenticates reviewer identity. Candidate check is read-only and cannot assign readiness. Activation is explicitly author-invoked after a fresh pass, not after a mere draft save.

Successful activation and its exact replay return a head-level context for the
published generation with no candidate selected; reopen or explicitly select a new
candidate before candidate-scoped work.

| Tool                                | Input definition                                        | Typed payload          | Result           | Effect    |
| ----------------------------------- | ------------------------------------------------------- | ---------------------- | ---------------- | --------- |
| `product_review_start`              | `#/definitions/product_review_start_input`              | Named fields in schema | `ReviewStatus`   | Mutation  |
| `product_review_status`             | `#/definitions/product_review_status_input`             | Named fields in schema | `ReviewStatus`   | Read only |
| `product_review_complete`           | `#/definitions/product_review_complete_input`           | Named fields in schema | `ReviewStatus`   | Mutation  |
| `product_review_get`                | `#/definitions/product_review_get_input`                | Named fields in schema | `ReviewPortion`  | Read only |
| `product_review_record`             | `#/definitions/product_review_record_input`             | Named fields in schema | `MutationResult` | Mutation  |
| `product_review_consistency_get`    | `#/definitions/product_review_consistency_get_input`    | Named fields in schema | `ReviewPortion`  | Read only |
| `product_review_consistency_record` | `#/definitions/product_review_consistency_record_input` | Named fields in schema | `MutationResult` | Mutation  |
| `product_candidate_check`           | `#/definitions/product_candidate_check_input`           | Named fields in schema | `CheckResult`    | Read only |
| `product_amendment_prepare`         | `#/definitions/product_amendment_prepare_input`         | Named fields in schema | `MutationResult` | Mutation  |
| `product_amendment_impact`          | `#/definitions/product_amendment_impact_input`          | Named fields in schema | `Page`           | Read only |
| `product_amendment_rebase`          | `#/definitions/product_amendment_rebase_input`          | Named fields in schema | `MutationResult` | Mutation  |
| `product_amendment_activate`        | `#/definitions/product_amendment_activate_input`        | Named fields in schema | `MutationResult` | Mutation  |

## Task binding and execution

The shared reservation also owns an immutable specification-identity guard.
Another working copy may register only an absent target or a target with the
matching sidecar; existing unbound specification content is legacy and is
rejected. The first packet start freezes the complete packet inventory and the
exact product, specification and plan inputs. Later packets verify those saved
pins instead of adopting a newer product revision. Start returns its
`operation_ref` as the `owner_ref` required by completion. Completion rejects
repeated packets, rechecks frozen evidence and may set `task_finished` only when
every frozen plan packet has evidence. Invocation and evidence strings reject
credential-shaped values before durable writes.

Reserve a new, absent spec slug before its spec workflow creates the bundle. Record a new sidecar and shared reservation recoverably; registration of another working copy requires an existing matching reservation/spec identity, never legacy enrollment. Inputs-check reads actual spec/plan evidence, current safety blocks and source pins. Start requires an explicit invocation and single workspace/session owner. Complete rechecks evidence and only marks task completed when task_finished is true and every planned packet is verified. Safety resolution records actual disposition; changing requirements goes through a reviewed amendment, not a cleared boolean.

| Tool                               | Input definition                                       | Typed payload          | Result            | Effect    |
| ---------------------------------- | ------------------------------------------------------ | ---------------------- | ----------------- | --------- |
| `task_specification_reserve`       | `#/definitions/task_specification_reserve_input`       | Named fields in schema | `MutationResult`  | Mutation  |
| `task_specification_register_copy` | `#/definitions/task_specification_register_copy_input` | Named fields in schema | `MutationResult`  | Mutation  |
| `task_inputs_check`                | `#/definitions/task_inputs_check_input`                | Named fields in schema | `TaskCheckSummary` | Read only |
| `task_inputs_details_get`          | `#/definitions/task_inputs_details_get_input`          | Named fields in schema | `TaskInputDetails` | Read only |
| `task_packet_start`                | `#/definitions/task_packet_start_input`                | Named fields in schema | `MutationResult`  | Mutation  |
| `task_packet_complete`             | `#/definitions/task_packet_complete_input`             | Named fields in schema | `MutationResult`  | Mutation  |
| `task_owner_handoff`               | `#/definitions/task_owner_handoff_input`               | Named fields in schema | `MutationResult`  | Mutation  |
| `product_safety_block`             | `#/definitions/product_safety_block_input`             | Named fields in schema | `MutationResult`  | Mutation  |
| `product_safety_resolve`           | `#/definitions/product_safety_resolve_input`           | Named fields in schema | `MutationResult`  | Mutation  |

## Mutation and recovery protocol

Operation-list reads only pending/recent operations belonging to the exact workspace context, including initialization before a binding became visible. Status returns an inspection token tied to the observed checkpoint. Resume/abandon reject changed tokens and unknown effects; abandon never removes published or user-edited files. No generic unlock or force flag exists.

| Tool                        | Input definition                                | Typed payload          | Result            | Effect    |
| --------------------------- | ----------------------------------------------- | ---------------------- | ----------------- | --------- |
| `product_operation_status`  | `#/definitions/product_operation_status_input`  | Named fields in schema | `OperationStatus` | Read only |
| `product_operation_resume`  | `#/definitions/product_operation_resume_input`  | Named fields in schema | `MutationResult`  | Mutation  |
| `product_operation_abandon` | `#/definitions/product_operation_abandon_input` | Named fields in schema | `MutationResult`  | Mutation  |
| `product_operation_list`    | `#/definitions/product_operation_list_input`    | Named fields in schema | `Page`            | Read only |

## Skill routing and generation

- Expand idea-refine with an explicit durable product mode while retaining standalone
  non-mutating exploration. Product Definition requires its ready Idea; Technical
  Design requires PRD; Roadmap requires PRD and Technical Design. Every invocation stops.
- Product Definition, Technical Design and Roadmap are three new catalog entries.
  Bundle dependencies are cumulative along their ready-source chain; no skill
  auto-invokes the preceding/next stage merely because it is installed.
- Share unconditional product protocol text under root shared references; keep
  optional profile prompts separately addressable. Copy required assets through
  the existing renderer, never hand-edit host bundles.
- Product context is selected before task interviews, but profiles are loaded only
  after the task's own confirmation. No global product-profile inheritance grants consent.
- Existing task spec/planning/incremental paths use product tools only when a valid
  product binding exists. Preserve old standalone behavior and its limitations.
- Each incremental invocation checks pins and safety, executes exactly one packet
  test-first, records actual evidence and stops. Independent code/security review,
  commits, installation and design work remain separate explicit invocations.
- Any capability missing from an installed matching bundle blocks affected product
  work. No shell/YAML or hand-assembled-document fallback is permitted.

## Acceptance and qualification

The [quality scenarios](../quality/scenarios.yaml) define observations, failure
cases and packet ownership. P17 requires real process/restart/workspace evidence
in one Linux environment with a supported Node.js version. Model trials are
explicit and separate from deterministic tests. Record the environment that
actually ran; other operating systems and Node.js combinations are not mandatory
and must not be reported as executed. Portable behavior remains covered by the
deterministic path, case, Unicode, newline, permission, lock and interruption
checks plus implementation review. P18 validates documentation with a fresh
reader and typed examples.

Planning creates schemas and test cases, not implementation passes.
