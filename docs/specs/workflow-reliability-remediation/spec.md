# Workflow reliability remediation

Status: Approved

## Outcome and boundaries

One Deep specification covers the nine reported workflow problems. The active
profiles are core, backend, data and operations. Requirements distinguish MCP
correctness, workflow usability, skill execution and exact MCP response handling.
The two Technical Design fixes already exist in the worktree; their regression
protection remains part of this delivery. Historical statements in the initial
report are user evidence, not proof of the currently installed runtime.

### WR-001: One bounded remediation with explicit ownership

Cover all nine reported issues in one specification with independently observable
acceptance. Product review, draft evidence reading, diagnostics, context handling,
runtime identity and digest semantics belong to the workflow MCP and its supported
consumer contract. Architecture presentation belongs to the Technical Design
skill. Exact machine-data handling belongs to the MCP and its supported consumer
contract; external Headroom qualification is excluded by the user's explicit
2026-10-19 scope amendment.

Planning must cover these requirements and the declared `contracts/mcp.md` and
`quality/scenarios.yaml` artifacts. Existing canonical schemas remain authoritative;
the new contract must not create competing data ownership. This specification
does not implement, install, reconfigure global clients, commit or publish.
There is no new UI, HTTP service, event broker, authentication system or supported
platform. No general lifecycle CLI or installer is authorized. Existing workflow
stage boundaries and independently invoked reviews remain intact.

Acceptance: every retained issue has an owned requirement and observable check.
Q14 is cancelled and no longer required by the explicit user decision, not a
passed external qualification. External Headroom tests, service ownership,
identity of the registered Headroom/host connection and causal automatic-compression
capture are outside this delivery. Preserve historical external evidence with
its actual limitations; repository-only checks do not prove or claim a Headroom
fix. The retained MCP integrity checks and all required native platform checks
remain mandatory. The confirmed depth, profiles and planning artifacts are
unchanged; the original scope rationale records the earlier proposal and does
not reinstate the cancelled external acceptance requirement.

### WR-002: Validate PRD source kinds without weakening provenance

A valid ready PRD decision source may have an empty `element_ids` collection.
A semantic Markdown source must address elements. Both retain exact identity,
digest, lineage and ready-PRD prerequisites. Distinguishing the source kind must
not bypass verification or replace a pinned revision with the latest content.

Acceptance: a valid decision pin with no elements supports Technical Design.
An empty Markdown pin, changed decision digest, foreign identity, or generation
outside the selected lineage fails. Compare durable state before and after each
rejection to prove that no write occurred. Returning `SOURCE_CHANGED` for the
valid decision case is excluded.

### WR-003: Accept product-wide architecture before Roadmap

An `accepted_target` may describe the product as a whole with `global: true` and
`stage_refs: []`, before any Roadmap exists. Preserve its accepted state, reason,
PRD references and decision provenance. Stage-scoped targets still require valid
Roadmap stage references. Exactly one applicability form is selected: global
without stages, or non-global with resolved stages.

Acceptance: the accepted product-wide target is saved and read back without
creating Roadmap artifacts or changing it to `hypothesis`. Check the artifact
registry and stored members for the absence of Roadmap writes. Global-plus-stages,
empty non-global applicability, unresolved or foreign stages, stale provenance
and missing ready PRD are rejected without durable effects.

### WR-004: Independently recheck a change after successful product review

Expose an explicit product-review mode for changes after a completed successful
review, separate from finding-linked followup after `gaps`. Bind it to the exact
parent review, candidate, current source version and verified historical inputs.
It is not permission to alter standalone specification-review semantics.

The server derives the complete change set and preserves traceability for every
current inventory member. Fresh independent judgment covers changed or new
blocks and affected relationships or shared evidence. Deleted or moved members
must be reconciled, not accidentally retained as current coverage. The reviewer
can expand impact and require full review when influence is uncertain. Only
unchanged, still-applicable positive results with verified source identity,
membership and relevant dependencies may be provisionally inherited. Inheritance
retains the parent attribution; hashes alone do not prove semantic independence.

Every such run requires a fresh whole-artifact consistency verdict and current
source checks at completion. New scope, new original instructions or answers,
uncertain impact, incompatible review semantics or unavailable historical evidence
prevents inheritance. Report why full review is needed; a full review may proceed
against intact current inputs. Corrupt current inputs remain blocked. Never edit
historical verdicts or invent a reviewer decision. Existing full and gaps-followup
behavior remains usable.

Acceptance: in an isolated 119-block artifact, one localized Mermaid correction
with no other affected blocks requires one fresh block judgment plus a new
consistency judgment; the remaining 118 results have verified parent attribution.
A semantic change with wider influence expands the reviewed set. Changed scope,
tampered history, deletion, moved membership, stale receipts and concurrent source
change cannot produce false current coverage. An unchanged request resumes or
returns its saved result without duplicate review effects. Completion still
fails if consistency or a required independent verdict is missing.

### WR-005: Read complete draft research and decision evidence

Provide explicit read-only MCP access to a saved research or decision record by
candidate, record identity and exact revision, without requiring publication or
activation of a ready generation. Return all persisted record content and its
provenance, including associated question, references, evidence, limitations and
supersession data where present. Distinguish the record kind, identity, revision,
candidate and exact source digest from navigation summaries.

Bound large results using the established response budget and continuation
contract. Completion, offsets, total length and cursors must support exact
reconstruction, including Unicode and large nested content. A cursor is bound to
the same candidate, record, revision and source snapshot; never combine versions
or substitute the current head. Missing, foreign, changed or corrupt evidence has
an explicit failure. Existing generation-based readers keep their contracts.

Acceptance: save and reconstruct both kinds of draft record, including content
larger than one response, and compare the complete persisted semantic content and
digest. Repeat reads and compare store snapshots to prove there are no writes,
publication or readiness changes. Cross-candidate/cross-record cursors, wrong
revisions and missing/corrupt bytes fail instead of returning partial success.

### WR-006: Diagnose invalid calls using the actual contract

Input failures retain stable error codes and add bounded structured details:
the published field path, error category, expected type or constraint, numeric
minimum/maximum when relevant, and an actionable next step. For a document subject,
identify allowed registered subjects for the selected candidate, or provide a
bounded discovery continuation when the list cannot fit. Do not create a subject
or guess a replacement to make an invalid call succeed.

Tool descriptions and examples must agree with the advertised schema and current
scenario behavior. Reuse the established diagnostic model where applicable.
Diagnostics never echo credentials, arbitrary private input, personal machine
paths or complete sensitive records. Truncation is explicit and preserves a way
to obtain the permitted missing diagnostic information.

Acceptance: `subject: Architecture` against an `Overview`-only registry identifies
the subject error and allowed value; `limit: 100` where the maximum is 50 identifies
`limit` and the allowed range. The corrected calls succeed. Cover wrong types,
nested fields, bounds, unsupported fields and oversized/redacted diagnostics.
Validate published examples against their schemas and representative registered
state. Invalid calls have no durable effects.

### WR-007: Provide MCP-first workflow session handling

Use callable MCP scenarios wherever they can satisfy the workflow. A command is
allowed when needed, but a separate client library or CLI is not a prerequisite
for completing this requirement. Provide supported session handling for the
product scenarios in this report: sequential contexts, exact reads, checkpoints
and recovery. Preserve other workflow consumers; do not broaden this delivery
into an application that runs every skill or chooses semantic decisions.

Keep product/candidate/session identities separate. Treat contexts and references
as opaque server-issued values. After a successful context-bearing operation,
the next dependent call uses its returned context. An error without a valid new
context must not erase the last usable session state. Serialize dependent writes;
independent read-only calls may run concurrently within their snapshot contract.
After an independent reviewer or another writer changes state, reopen and inspect
the current review/effects before the author continues. A context refresh alone
must not silently rebase an intended mutation onto changed requirements.

Acceptance: a sequence of mutations and reads succeeds without manual token
copying. Two sessions cannot exchange candidate state; stale author context after
review is reconciled explicitly. Interrupt between response receipt and the next
call, resume, and demonstrate the correct selected snapshot. Neither session
handling nor a command records user answers, approval or reviewer verdicts on
behalf of the actor. If a command is necessary, structured stdout remains valid
machine-readable output, diagnostics use stderr, and incomplete/failed operations
return nonzero status; cancellation preserves a recoverable checkpoint.

### WR-008: Make continuation, retry and recovery completeness observable

Session handling consumes every required page/portion before exposing a complete
record or allowing a dependent verdict. Detect missing, repeated, mismatched or
non-advancing continuations and changed source versions. Preserve ordering and
exact returned references. A summary, receipt, token or successful transport
response is not evidence that the full source was read.

Retain the exact request identity and acknowledged result/effect information
needed for safe restart. Checkpoints must distinguish complete acknowledgement,
partial delivery and unknown outcome; retain only task-relevant non-sensitive
data and avoid raw secret-bearing transcripts. No new shared product store,
automatic record deletion or retention migration is required.

Automatic mutation replay is limited to one exact recovery attempt when the
server's declared replay contract and retained operation evidence establish its
safety. A changed payload, reordered batch, changed context or missing replay
evidence is not that retry. Unknown effects, active locks, `RECOVERY_REQUIRED`,
incompatible capabilities or unresolved source drift stop dependent writes and
return the operation reference, known effects and required recovery step. Never
delete a lock, manufacture a receipt or loop indefinitely. Repeated explicit
resume may inspect current state but must not bypass this rule.

Acceptance: fault injection before a write, after an applied write with a lost
response, during pagination and at checkpoint persistence demonstrates no duplicate
effect and no false completion. Test a server without replay support, expired
evidence, a malformed page, repeated cursor, cancellation and concurrent change.
Count actual writes and compare durable state. No successful business result is
reported when outcome remains unknown, even if the transport reconnects.

### WR-009: Identify the MCP process actually serving requests

Expose read-only runtime diagnostics for the serving process: package version,
build identity, advertised protocol/contract identity and implemented capabilities.
The build identity must identify loaded executable artifacts, not merely a mutable
checkout, a generic development version or the version expected by the caller.
Unavailable identity is explicit. Missing/incompatible capability blocks the
dependent operation and provides a concrete refresh/restart diagnostic; diagnostics
do not install, restart or reconfigure a real client automatically.

Acceptance: two different development builds sharing a package version are
distinguishable. Rebuilding files without restarting an existing process must not
claim that it loaded the new build. After an explicitly controlled isolated restart,
diagnostics match the artifacts actually loaded. Compare an old serving process
and a freshly built one without claiming that local build success updates the
user's registered MCP. Reads leave the store and global configuration unchanged.

### WR-010: Distinguish source digests from verdict-object digests

Public review results, consistency evidence, descriptions and examples explicitly
name and define source-content/version digests separately from saved verdict-object
digests. Each field defines the object it hashes, canonicalization scope and
identity relationship. In consistency results, the existing `object_sha256` denotes
the persisted verdict object, not the original document. New explicit names must
not silently change that existing meaning.

Preserve existing consumers and historical records with an additive compatible
representation and documented legacy aliases where required. Do not rewrite all
stored objects just to rename a public field. Read-only access causes no migration.
Unsupported versions fail explicitly rather than interpreting a verdict digest as
a source pin. Compatibility removal requires a separately approved breaking change.

Acceptance: with unchanged source and a newly saved verdict, source digests remain
unchanged even when verdict-object digests differ. With changed source, its digest
changes and old coverage cannot remain current. Verify actual hash inputs, alias
equivalence, historical reads and old-client/new-server behavior. Schema checks
and examples must reject confusing one digest domain for the other.

### WR-011: Present architecture and resolve material choices before review

Strengthen the Technical Design pre-review checkpoint. Inventory and reuse existing
accepted choices and verified constraints first. Present material technologies
with alternatives, rationale, evidence, applicability and revisit conditions;
resolve user-owned tradeoffs with actual recorded answers. Recommendations and
fixture answers do not constitute consent.

Show a proportionate component diagram and explain component responsibilities,
ownership boundaries, dependencies and data flows. Identify owners of databases
and other durable state, including who reads and mutates it. Mark unverified
integrations as assumptions with their required validation, not working facts.
Items that do not apply receive a reason; do not manufacture an exhaustive stack
catalogue, new infrastructure or implementation algorithms to fill a checklist.

Acceptance: representative architecture tasks cannot reach readiness review while
a material technology tradeoff, relevant component/data flow or state owner is
missing. A compact task with justified non-applicability stays compact. The user
can inspect the architecture presentation before review starts. Generated Codex
and Claude Code skills retain the same obligations with host-correct question
tools and instructions; an independent reviewer still supplies semantic verdicts.
Document checks alone are not evidence of correct live skill execution.

### WR-012: Preserve exact machine data in MCP responses

Treat tool schemas, contexts, cursors, references, hashes and receipts as exact
machine data. Explanatory prose may be compressed; structural fields and payloads
needed to execute or verify a scenario must remain available without loss through
the supported exact response channel or reliable bounded original-content
retrieval. Do not bypass
the MCP's response limits by returning an unbounded object.

Recovery must deliver the original selected content with verifiable identity,
complete continuations and intact serialization, not a summary, truncated JSON,
another unresolved compression marker or a different revision. If the received
response cannot provide exact content, stop the dependent read or
mutation and report the failed boundary. Restoring model-visible text does not
prove semantic reading or reviewer independence.

Acceptance: reconstruct nested schemas, Unicode, large paginated records and all
critical opaque fields through the supported MCP response/continuation contract
and compare the reconstructed payload with the original. Deliberately truncate
JSON, replace a field with a marker, change a digest and make retrieval return a
marker; each must be detected and must prevent dependent completion. Observe
complete continuations and exact selected source identity before accepting the
result. These repository contract and fault-injection checks remain required.
A live Headroom round-trip, loaded external service identity and causal automatic
compression capture are not required for completion; Q14 is cancelled under
WR-001. This cancellation does not remove the MCP response limits, exact-data
checks, safe recovery rules or the prohibition on false completion.

### WR-013: Prove regression protection and implementation correctness

Planning must map every requirement to a discriminating executable check and
identify the observation, expected result and excluded failure. Cover normal,
invalid, stale, interrupted, repeated and compatible-consumer paths where stated.
Each implementation packet records actual commands/checks, environment, exit/result,
changed boundaries, residual limitations and the next action for unfinished work.

For a behavior change, run its check before changing behavior and observe the
relevant RED, then implement to GREEN. Existing fixes WR-002/WR-003 need explicit
PROVE because their tests postdate the implementation: in isolation, reintroduce
each original defect, observe its intended assertion fail, and restore the code.
Also use PROVE for affected absence guarantees, structural assertions and RED runs
that failed before the intended assertion. Change one behavior at a time; an import
failure or broken harness is not proof. Preserve unrelated dirty worktree changes.

Exercise public MCP/stdio boundaries as well as owning-layer behavior, response
budgets, read-back after mutations, compatibility and generated host artifacts.
The exact acceptance suite must catch omitted pages, stale contexts, false
inheritance, wrong hash semantics and incomplete architecture checkpoints. Skill
fixtures are simulated; any model trials identify the actual host/model and fresh
context, and missing execution never becomes a pass. Required failing checks
block the affected completion; correct the implementation, not a correct test.
Review the final scoped diff and report checks honestly. Independent code/security
reviews remain separate optional invocations, not invented completion gates.

Acceptance: all required checks for a completed packet pass against its final
state and the required RED/PROVE evidence exists. Intentionally broken guarantees
produce the corresponding failures. A failed, skipped or unavailable required
check leaves an explicit incomplete result and next action with its established
owner. Build success alone cannot establish live installation, semantic correctness
or an unexecuted platform result. The cancelled external Q14 qualification is not
an unfinished required check; the MCP integrity safeguards and required native
platform checks remain in force.

### WR-014: Preserve platform, storage and host compatibility

Keep the documented Node.js >=22.20.0 runtime contract on Linux, macOS and Windows,
and separate generated Codex and Claude Code distributions. This remediation
requires Linux qualification at Node.js 22.20.0 and 24.14.0. In addition, the
four native combinations of macOS 15 / Windows 2025 with
Node.js 22.20.0 / 24.14.0 are required. The earlier Linux-only qualification
exclusion is superseded by the explicit follow-up instruction; its retained
evidence remains historical, not current acceptance scope. Required native checks
must never be recorded as passed without execution. Published runtime support
is unchanged. Preserve
portable path/Unicode behavior, process cancellation and the local-only store's
existing permission, locking and reference validation boundaries. No new network
service, cross-computer coordination, power-loss durability guarantee or automatic
cleanup is promised.

New readers and diagnostics are non-mutating. Existing immutable records, retained
history and ready source pins remain usable; additive outputs do not silently
activate drafts or migrate records on reads. Any writable compatibility transition
must be explicit, recoverable under the established operation contract and tested
against retained pre-change state. Rollback must not reinterpret or discard
referenced evidence. Keep credentials and personal paths out of published artifacts
and diagnostics; tests use isolated stores/homes, never real global configuration.

Acceptance: test representative portable path/encoding behavior and the declared
runtime boundaries on Linux and each required native macOS/Windows combination,
distinguishing simulated cases from executed OS runs. A missing native result
leaves qualification incomplete; accepted Linux results do not substitute for it.
Exercise old retained data and compatible clients; unsupported combinations return
actionable failure rather than corrupting state. Qualification reports state the
exact executed combinations and all pending or unexecuted required ones, without
claiming they passed. Host generation checks catch
cross-host leakage; isolated cancellation/recovery checks leave no unintended
configuration or store changes.

## Verified baseline

On 2026-10-11, the package build and all five tests in
`packages/engineer-agent-workflow-mcp/test/product-technical.test.mjs` passed in
the current Linux worktree. The two fixes are visible in
`packages/engineer-agent-workflow-mcp/src/product/technical.ts`. No historical
RED/PROVE evidence, full-suite result or installed-server update is inferred.
The remaining requirements describe the intended result, not completed changes.
