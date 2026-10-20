# Product Planning Workflows

Status: Approved

## Purpose

Extend the existing specification-first workflow with product discovery,
product definition, shared technical design and staged product planning.
Multiple local workspaces use one product definition outside their Git branches,
while every independent delivery task retains its own branch-local specification.

This specification defines observable behavior, not implementation units or
execution packets. Its confirmed scope and original questions/answers are owned
by the adjacent workflow manifest and decision ledger through MCP.

The [research proposal](../../research/product-definition-technical-design-workflow.md)
is background, not an additional requirements authority. Later interview answers
replace its repository-local product storage, pre-design executable research
bootstrap and unconditional pause of started tasks on every upstream change.

## Confirmed scope

Depth: Deep. Active profiles: core, backend, data, security.

The product layer is local to one computer, shared across its workspaces, and
separate from working repositories and Git history. Task specifications and
plans remain in their workspaces. No network service, UI, Penpot implementation,
legacy enrollment, installation or publication is authorized by this specification.

The supported runtime contract remains MCP on Linux, macOS and Windows with
Node.js >=22.20.0, with separately generated Codex and Claude skill bundles.
Completion qualification requires one Linux environment with a supported
Node.js version. Other operating systems and Node.js combinations are not a
mandatory qualification matrix, and missing results from them do not block
completion. Platform portability remains normative under PWF-003 rather than
being inferred from the qualification host.

## Requirements

### PWF-001: Explicit workflow boundaries

Provide three separately invoked product skills: `product-definition`,
`technical-design` and `product-roadmap`. Extend `idea-refine` with a durable
product result. Preserve existing task specification, planning, design planning,
incremental implementation, documentation and independent review ownership.
An artifact dependency is not permission to invoke the next skill, execute a
task, commit, install, publish, synchronize a tracker or modify remote design.

Acceptance: completing each stage reports its saved result and next available
stage, then stops. Invocation traces contain no unrequested downstream skill,
implementation, Git mutation, installation, tracker or remote-design action.

### PWF-002: Required product lineage

Product Definition derives from a ready Idea Refine result. Technical Design
derives from a ready PRD. A delivery roadmap derives from the PRD and Technical
Design. Save exact upstream identities and versions for each result. Existing
facts and answers may provide a concise idea result; never demand a redundant
interview or bypass the saved upstream result. Changed parent evidence requires
an explicit relevance/consistency assessment before a new dependent result is
considered current. No independent pre-design research-task exception exists.

Acceptance: missing or unresolved required upstream evidence prevents readiness
and identifies the missing prerequisite. A fully established idea produces a
short saved result without repeating settled questions. A downstream artifact
cannot claim current lineage from a title, link or stale summary alone.

### PWF-003: Host and platform support

Support the MCP on Linux, macOS and Windows with the existing Node.js >=22.20.0
runtime floor. Preserve one authoritative skill-template source, separate Codex
and Claude artifacts, host-native question-tool selection, explicit-only
invocation metadata, verified bundled engineering references and the existing
description/SKILL.md size constraints. Do not switch or gate on model choice.
Platform-sensitive paths, case collisions, Unicode, supported newline styles,
permissions, locks, interruptions and error output must preserve the same
observable data-integrity contract. An unavailable required filesystem
capability produces an explicit failure, not a weakened successful operation.

Acceptance: equivalent successful and rejected scenarios pass in one Linux
qualification environment using a supported Node.js version. Other operating
systems and supported Node.js combinations are outside the mandatory
qualification matrix; missing results do not block completion and are not
reported as executed. Cross-platform behavior remains covered by deterministic
path, case, Unicode, newline, permission, lock and interruption checks plus
portable implementation review. Generated bundles pass host-isolation, manual
integrity and size checks. No opposite-host question tool or host-only metadata
leaks into a generated bundle.

### PWF-004: Adaptive and resumable interviews

For each product stage, inventory available evidence before questioning.
Propose and explicitly confirm depth, active profiles and relevant artifact
scope. Before confirmation load no profile instructions; afterwards load only
the active profiles. Depth affects useful detail, never required correctness or
safety. Ask focused material questions using plain alternatives, evidence-based
recommendations, consequences and concrete examples through the active host's
callable standard question tool. This specification interview uses synchronous
`request_user_input`, not its asynchronous counterpart and not Prompt MCP.
Prepare the exact question in MCP, preserve the actual answer/provenance and
checkpoint each outcome. Silence, tool failures, defaults and unclear replies
do not become agreement. Reuse known answers; reopen only changed conditions.

Acceptance: read/tool traces demonstrate confirmation before profile loading,
absence of inactive references and persistence of the actual native response.
After interruption the interview resumes at the first unresolved issue without
reading the entire journal or inventing a missing answer. A partial amendment
preserves unaffected obligations and their predecessor evidence.

### PWF-005: Proportionate independent artifact readiness

Idea, PRD, Technical Design and Roadmap each require independent completeness
and consistency review before their first ready result. Draft saves do not
trigger independent review. Readiness requires resolved material questions,
confirmed scope, valid structure and references, complete current evidence and
a fresh recorded independent pass. The author marks readiness after that pass;
MCP validates the conditions but does not impersonate a reviewer or user.
There is no extra ceremonial approval question. Review is short for Lite, not
omitted. Implemented behavior, accepted target and hypothetical future remain
separate meanings; ready does not mean implemented.

Acceptance: a self-review, incomplete read, stale result, structural-only pass
or default confirmation cannot produce readiness. Read-only observation does
not restart or invalidate a review. Corrections at unchanged scope recheck the
affected evidence and whole-artifact consistency; new scope or uncertain impact
requires a full independent review. Every changed published result needs current
review evidence, not inherited approval based only on unchanged identifiers.

### PWF-006: Durable Idea Refine result

Save the problem, affected actors, current alternatives/workarounds, desired
value, evidence, meaningful candidate directions, chosen direction, assumptions,
risks, non-goals and unresolved questions. Distinguish user decisions, observed
facts, proposals and hypotheses. A missing material direction or scope choice
blocks readiness. Explicit distant hypotheses may remain without blocking the
confirmed present scope. Standalone ideation remains possible, but an unsaved
conversation is not a product handoff.

Acceptance: Product Definition can retrieve the exact chosen problem and its
evidence without the original chat. A known compact idea does not generate a
framework choice, delivery backlog or large empty template.

### PWF-007: Product Definition and PRD ownership

The PRD owns product meaning: problem, audience/actors, vocabulary, value,
goals, metrics and measurement methods, known baselines/targets, capabilities,
use cases, business rules, product constraints, exclusions and acceptance intent.
Use cases state relevant triggers, preconditions, main/alternative outcomes and
failure behavior. Unknown measures stay unknown. Product ambition can span
several horizons; concrete membership and delivery order belong to the roadmap.
Framework selection and local implementation detail do not become invented
product requirements; an actual user-imposed technical constraint retains its
provenance.

Acceptance: an agent can derive task behavior and evaluate product outcomes
from addressed PRD elements. It cannot infer fabricated targets, unsupported
user demand or a second competing backlog from the PRD.

### PWF-008: Shared Technical Design ownership

Technical Design owns shared system boundaries, architectural responsibilities,
dependency direction, data ownership/important flows, interface conventions,
technology choices, relevant quality/security/privacy/operation constraints,
compatibility and migration intent, risks, alternatives, rationale and revisit
conditions. Ground current implementation claims in repository evidence.
Choose technologies using applicable current evidence and actual constraints.
Separate current implementation, accepted target for a named stage and a
hypothetical future option. Exact existing contracts remain at their single
authoritative location; local modules, algorithms and execution order belong
to the task's planning stage.

Acceptance: two task implementers can retrieve the same relevant shared rule,
its PRD justification and current applicability. The result does not require
speculative infrastructure or treat an unimplemented target as existing code.
Local planning can make unspecified local choices without redefining the PRD.

### PWF-009: Stages, epics, stories and independent tasks

Roadmap represents goals/outcomes, epics, user stories and independent tasks
with explicit dependencies and product/technical references. A stage has an
immutable ID, user-defined label, outcome/verification method, scope/exclusions,
entry/exit conditions and risks. Stages are not a fixed MVP/Production enum and
are orthogonal to epic hierarchy: an epic can span stages and a stage can serve
several epics. Detail the near stage, keep later stages progressively coarser,
and do not create every future specification eagerly. Technical tasks need a
justified outcome and references, not a fabricated end-user story.

Acceptance: MVP-1, MVP-2 and a differently named later stage retain their IDs
through label/order changes; cross-stage epic membership is representable.
No invented dates or budgets appear. Stage completion requires integrated
outcome evidence rather than only completed task counters. Real user/data risks
require their protections even when the stage is named MVP.

### PWF-010: Research inside the interview

Before product readiness, research remains within the owning interview:
decision-focused analysis, source lookup, comparison of viable alternatives
and synthesis of supplied evidence. Persist useful conclusions, sources,
checked dates, version applicability, uncertainty and the supported question.
Public research does not substitute for actual user evidence or consent.
Refresh relevant outdated claims instead of repeating an entire investigation.
There is no independently executable research task, implementation plan or
technical spike before the required product documents are ready. Do not evade
this boundary by renaming execution as interview research. If evidence is
insufficient, retain the unresolved question rather than inventing a result.

Acceptance: a stack uncertainty can receive a cited analytical comparison;
it cannot start an experimental implementation task through an exception to
the readiness chain. Any later independent research task uses the normal
task/specification and explicit execution boundaries.

### PWF-011: Shared local product store outside Git

The whole product layer lives in one shared local data root outside working
repositories: Idea, multi-file PRD and Technical Design, Roadmap, product
decisions, required research evidence and product version/checkpoint state.
Multiple products have separate identities and data within that root; one
logical project binds to one product in this version. Multiple local workspaces
of that project use the same product. Task specifications, task decisions,
plans/checklists/handoffs and existing design artifacts remain workspace-local.
Do not create branch-local authoritative PRD/Technical Design copies, use Git
as product-version storage or synchronize those documents through branches.
No network service or cross-computer collaboration guarantee is introduced.

Root selection follows the existing normative
[MCP Configuration contract](contracts/mcp.md#configuration), selected by the
recorded PLD-002 answer in the plan: automatic OS-local application data with
the explicit absolute-path `EAW_PRODUCT_DATA_DIR` override. That contract owns
the exact platform defaults, precedence, empty/invalid-value behavior and path
safeguards. An invalid explicit override fails product operations without
falling back; existing standalone specification operations remain independent
of product-root configuration.

Resolve configuration lazily from the server process environment and OS home
information. No configuration-file, MCP-argument or startup-argument override
layer is added; unrelated environment variables are not product settings.
Client environment changes take effect by restarting the server, not by a
workflow-triggered reload or silent data move. Selecting another root neither
migrates old state nor automatically binds an unknown project there. Preserve
the documented inputs and failure behavior across compatible clients; an
unsupported configuration cannot silently select a replacement store.

Acceptance: changing branches or opening a second bound workspace returns the
same shared ready product revision; product authoring does not alter either
workspace's Git index, create a Git commit or add product-document copies there.
Workspace-local task changes remain separate and reference shared versions.
Equivalent process environments select the same root under the platform
contract. Test override precedence, OS defaults, invalid overrides, missing
Windows configuration and restart with changed configuration; observe no
fallback store, automatic migration or unexpected initialization on rejected
or read-only operations.

### PWF-012: Project and workspace binding

Resolve a caller's absolute workspace path to a durable logical product binding
through MCP; a caller does not maintain a per-call file allowlist or pick a
product by fuzzy title. Established Git worktrees of one bound project reuse
its binding without reconfiguration for each branch. For separate clones or
unknown projects, require an explicit selection/create operation instead of
guessing identity from repository name or URL. Discovery/open is read-only;
missing state is not initialized by a read. Registered workspaces identify the
local task source independently from product identity and semantic spec IDs.
No disk-wide discovery, Git checkout or remote Git lookup is required.

Acceptance: two registered workspaces resolve one product; an unrelated project
with the same name cannot read or update that binding accidentally. A rename,
unknown binding or mismatched product reference is disclosed, not silently
rebound. A missing/unwritable store blocks affected work without installing,
reconfiguring clients or creating a new product as a fallback.

### PWF-013: Multi-file product documents and one authority

PRD and Technical Design are distinct logical document sets from the beginning.
Each has short derived navigation and substantive thematic Markdown sources.
Lite may use an index and one concise substantive document per set; additional
subjects appear when needed, not as empty template files. Canonical semantic
text lives only in those Markdown sources. YAML owns structured scope,
membership, relations, state and decision records, not a second full text copy.
The navigation index contains links/titles, not original requirements, technical
rules or a separate readiness decision. Existing task/design authority is not
moved merely because the product layer is shared.

Acceptance: the same machinery supports two-member Lite and larger thematic
sets. The user can inspect/edit a substantive Markdown document; no full PRD/TD
concatenation or generated index is treated as the semantic source of truth.

### PWF-014: Document registry and deterministic placement

Use one authoritative product registry for document identity, logical artifact,
validated relative location, subject/role and membership. Derive exact element
lookup from actual registered Markdown; indexes/caches are replaceable and
source-version-bound, not second manually maintained authorities. Scenario
writes resolve a semantic element or explicit subject to the exact owning
document and parsed block. Ambiguous placement requires an explicit subject
choice, never a filename guessed from prose. A missing member, unregistered
Markdown source, duplicate element ID across members, malformed structure,
unsafe location or stale registry prevents a successful affected write/check.
Creating, splitting, moving or renaming documents updates related membership
and navigation through recoverable state; read-only calls do not regenerate them.

Acceptance: changing one scenario preserves unrelated blocks. A duplicate ID
in another member or a stale offset cannot redirect the edit. Interrupted
organization changes cannot be reported as a complete ready document set.

### PWF-015: Stable identities and source pins

MCP owns immutable product, document, stage, epic, story, task, specification,
element, decision and revision identities. Preserve existing local requirement
IDs and decision revision conventions. Qualify an element by its product or
specification owner, logical artifact kind and element ID; do not use a title,
branch, absolute path, line number or tracker ID as semantic identity. Source
pins separately identify the exact ready/candidate version, content digest,
document provenance and durable source needed for reconstruction. Moving an
element between documents in the same artifact preserves its canonical ref;
splitting documents may create member identities but not replacement IDs for
unchanged elements. Retired IDs are not reused or silently reassigned.

Acceptance: identical local requirement labels in two specs remain distinct.
Renames and in-artifact moves preserve consumers' references and historical
evidence; missing, retired or foreign references produce an explicit outcome
instead of matching a similarly named element.

### PWF-016: Traceability and task/specification cardinality

Represent explicit idea-to-PRD, PRD-to-technical, outcome-to-roadmap,
task-dependency, task-to-specification, requirement-to-upstream and
decision-to-affected-element relationships. Keep each relation at its dependent
owner and derive reverse lookup rather than maintaining conflicting directions.
Every independent task, including a technical task, has exactly one logical
specification before planning/execution; no logical spec implements two
independent tasks. Future tasks may await their spec but are not executable.
Test-writing/RED/GREEN steps and authorized packets within a task are not new
independent tasks. A second working copy of the same spec identity is not a new
specification; concurrent execution of that task needs an explicit owner/handoff
and cannot claim two independent completions.

Acceptance: missing/duplicate/mismatched bindings and dependency cycles that
prevent delivery are surfaced before readiness. Splitting a task creates new
task/spec identities rather than repurposing an approved spec. A task's plan
can contain several explicit checkpoints without circumventing the 1:1 rule.

### PWF-017: Scenario-specific authoring and query coverage

Expose scenario tools for the following operations; exact published tool names
and strict schemas belong to the planning contract. Every operation has typed
semantic inputs, explicit effects, bounded results and rejected-input behavior.
Do not expose generic YAML editing, arbitrary JSON Patch, byte offsets,
unrestricted file-writing or agent-constructed complete workflow documents as
the way to implement missing scenarios.

| Scenario | Semantic input | Observable result/effect |
| --- | --- | --- |
| Discover/open/bind product | Workspace/product selection, cursor when needed | Read-only identity/readiness/context, or explicit binding mutation |
| Initialize product discovery | Selected project, name, known idea | Draft product identity/result, not a ready PRD |
| Confirm scope and interview | Exact proposal/question, actual native outcome | Saved scope/answer/no-answer refs with unresolved state preserved |
| Define/refine idea | Problem, actors, alternatives, evidence, chosen direction | Addressed idea elements and source refs |
| Define/refine PRD meaning | Actors, goals/metrics, capabilities, use cases, rules and applicability | Exact product elements and typed links |
| Define/refine shared design | Boundaries, technical choice, alternatives, evidence, quality/risk and PRD refs | Exact technical elements, rationale and applicability |
| Record research conclusion | Owning question, findings, sources, limitations | Evidence reference; no executable task or user consent |
| Define/refine roadmap | Stage outcome, epic/story/task intent, dependencies and acceptance | Durable independent work identities and validated relations |
| Bind local specification | Task/spec identity, current workspace source | Recoverable 1:1 binding; no automatic approval or legacy enrollment |
| Inspect/organize documents | Artifact, element/subject refs and intended organization | Bounded member inventory or recoverable semantic move/split |
| Find/get exact evidence | Typed owner/element/revision and continuation | Source-bound exact portions, provenance and complete/next indicators |
| Prepare/continue context | Purpose, task/artifact, scope and page budget | Required source selection, exact pages, blockers and pins |
| Prepare/check/activate amendment | Base version, affected refs, approved intent and review evidence | Isolated draft, impact report and atomic-visible ready checkpoint |
| Review/check/observe readiness | Candidate and exact input versions, independent findings | Durable evidence and status; observation does not write |
| Start/resume/finish task checkpoint | Explicit task invocation, owner and evidence | Pinned input version, coherent progress and handoff state |
| Inspect/resume interruption | Operation/checkpoint ref and actual saved state | Applied/not-applied/blocked outcome, never a guessed replay |

Acceptance: each row has a complete usable scenario without requiring the
agent to generate YAML or reason about serialization/offsets. Unavailable
capability is reported as such and does not enable shell parsing or hand edits
of protected workflow state as a fallback.

### PWF-018: MCP protocol, effects and compatibility

Preserve existing independently used MCP tool behavior and protocol-2 workflow
envelopes; advertise new capabilities/schema support explicitly. Tools expose
strict input/output contracts and correct read-only/destructive annotations.
Return the updated context from every successful context-bearing mutation.
Disclose validation, not-found, ambiguous binding, unsupported version,
source/output limit, lock/busy, stale/conflict and unavailable-evidence outcomes
without leaking secrets or pretending failure is success. Do not silently
reinterpret old schemas or require old clients to understand new product state.
Preflight the response budget before a write that would otherwise succeed but
have an unreturnable result. No background network or Git effects are implicit.

Acceptance: compatible old spec-only clients continue their existing workflow;
an incompatible product client gets a precise capability error. Invalid inputs
do not modify product/task sources. A successful write followed by the next
write using its returned context does not conflict with its own prior mutation.

### PWF-019: Bounded purpose-based context

Context assembly starts from an explicit task/artifact and purpose, resolves its
lineage and declared dependencies, and includes applicable global constraints.
Return a small source/member inventory, required versus optional items,
unresolved questions, exact source pins, completeness and continuations. Fetch
only selected substantive blocks into the agent's context, across member files
as needed; history is loaded only for relevant rationale or reconciliation.
Product overview/navigation never substitutes for exact required evidence.
Confirmed product profiles are hints for a new task, not consent to activate
them. Task specification must confirm its own scope before profile reads.

Acceptance: a backend task receives no unrelated UI profile or full roadmap;
a multi-profile task receives its actual cross-contract dependencies. A small
page budget produces continuation/blocking, not silent omission of mandatory
constraints or a false complete result. All required portions are consumed
before a source is treated as exact; delivery receipts do not prove understanding.

### PWF-020: Product versions and retained evidence

Ready product revisions and review/task input pins are durable outside Git and
survive MCP restart. Preserve exact required content and provenance, not merely
links, titles or hashes of navigation files. Capture evidence proportionately:
do not copy an entire growing decision journal into each task context or
archive every keystroke as a full product. Product decisions preserve actual
answers and predecessor history. As a conservative first-version default,
perform no automatic history cleanup and retain every revision referenced by
an active task, accepted artifact or review. Surface capacity limits rather
than deleting required evidence. Missing/corrupt evidence fails closed for
operations that need it and is not replaced with current text.

Acceptance: after product changes and server restart, an active task can
retrieve its exact previous accepted rules. This requires no Git commit or
automatic Git operation. A missing pinned source cannot be reported as a
successful historical read or inherited review pass.

### PWF-021: Read-only observation, concurrency and retries

Read-only open/list/find/get/context/status calls leave authoritative files,
versions, receipts and readiness unchanged. Concurrent MCP instances address
the same shared product state and validate relevant source/target versions
under cooperative protection. Exact lost-response retries recover an existing
result within the supported receipt lifetime; expired or unresolvable retries
fail without duplicating the mutation. Do not refresh context and replay an
arbitrary write automatically. On conflict, stop writing, reopen and inspect
saved effects before choosing an explicit reconciliation. Source-bound pages
cannot mix current content from different observed versions.

Acceptance: observer B does not invalidate writer A; a true stale mutation
fails. Repeated commands and restart do not create duplicate decisions,
bindings or activations. Two candidates based on one old ready version cannot
both silently become its successor. Unrelated history does not automatically
invalidate every consumer's selected requirements.

### PWF-022: Recovery from interrupted multi-file operations

An operation affecting several product members, registry/navigation or a local
task binding is recoverable as a named checkpoint, not claimed to be one
filesystem transaction. Persist accepted intent, expected inputs, affected
objects and applied-step evidence before exposing changed current state.
Readers either obtain a coherent prior ready version or an explicit incomplete
state, never a mixture reported ready. After process interruption, explicit
inspection/resumption identifies applied effects and completes only compatible
remaining steps; conflicting external edits block resumption without loss.
Do not blindly remove crash locks, restart work from guessed progress or report
success because one file was installed. Cancellation/timeout retains a
reconcilable operation state and discloses possibly applied effects.

Acceptance: kill/restart scenarios at each material checkpoint preserve the
last coherent ready result and permit safe resume or an explicit blocked
result. The guarantee covers MCP process interruption, not preservation of the
last completed write after sudden power loss, disk failure or arbitrary hostile
concurrent filesystem modification; no such stronger guarantee is advertised.

### PWF-023: Isolated drafts and shared activation

Product amendments are separate drafts tied to their base versions and owning
work, even though stored in the shared local product store. Editing a draft
does not replace the current ready source seen by other workspaces. The
owning workflow resolves material choices, checks impact and obtains fresh
independent review before activation. Activation compares current base and
required dependencies, publishes only a coherent checked candidate and records
affected consumers. A stale base needs explicit reconciliation and review of
changed inputs, not blind overwrite or automatic semantic merge. A jointly
dependent change cannot expose individually updated files as a coherent whole.

Acceptance: workspace A edits a candidate while B continues reading its ready
inputs; B never receives A's unfinished text as current approved meaning.
Failed review, unresolved scope or stale base prevents activation. After a
successful activation, observers can identify both the new version and its
retained predecessor without a Git branch merge.

### PWF-024: Started tasks may finish against their pinned version

At the first explicitly authorized implementation start, pin the task's exact
ready product inputs, approved local specification and required plan/contract
evidence. Planned or merely specified tasks are not yet started. An ordinary
later product change does not force a started task to adopt new requirements:
it may finish that same independent task against the saved version. Each next
incremental packet still requires its own explicit invocation. Never extend
this permission to new tasks or additional scope. Not-yet-started tasks must
reconcile against the applicable current product state before starting. Local
spec/plan changes and real storage conflicts are not exempted by old product pins.

Acceptance: a started task preserves its exact earlier acceptance behavior
after an unrelated or compatible product change, including after restart.
A new task cannot opt into obsolete rules by inventing a start marker. Task
completion identifies the version actually implemented, not the current
product version if it differs. Commits and code review remain separate actions,
not automatic completion/next-packet gates.

### PWF-025: Safety and incompatibility override

The earlier-version permission has an explicit exception. If new information
indicates a security problem, unsafe behavior or incompatible shared contract
that makes continued use of earlier rules materially unsafe/incoherent, record
the concrete issue, pause affected work and ask the user for the disposition.
Do not continue under old pins, silently substitute new requirements or claim
that an explicit dependency graph proves semantic safety. Compare all applicable
global constraints and assess uncertain impact. Affected consumers receive a
visible safety/incompatibility blocker at their next relevant checkpoint;
unaffected work can continue. MCP need not interrupt an already executing
external command or claim to infer domain risk automatically.

Acceptance: a revoked access rule or breaking shared interface triggers a
question/pause before affected work resumes or completes. A cosmetic compatible
change alone does not invoke this exception. Uncertainty stays visible until
resolved; counters/hashes alone cannot prove absence of semantic influence.

### PWF-026: Direct edits and semantic reconciliation

Direct edits to substantive Markdown remain possible. Preserve known user
intent and distinguish it from an edit of unknown provenance. A ready revision
is immutable evidence: a direct change to active/source bytes is detected as
drift or a candidate needing reconciliation, not silently granted ready status.
Do not overwrite ambiguous user text, automatically adopt an unregistered file,
rewrite a conflicting block from old cached state or treat an arbitrary file
change as authenticated consent. Preserve unchanged content and supported
formatting when applying an addressed scenario update. Changes to requirements
require appropriate renewed review, not only index regeneration.

Acceptance: moving/editing a block or altering a heading ID gives a precise
reconciliation outcome with original text retained. Validated scenario edits
preserve unrelated content. Directly adding an unsafe rule cannot bypass
readiness or silently change another workspace's pinned accepted evidence.

### PWF-027: Legacy behavior and initial adoption

Product documents may be created for an existing codebase, but existing task
specifications are not enrolled, migrated, rebound or rewritten in this version.
The new product relationship is required for new product-linked tasks. Existing
standalone specification workflows retain their behavior and verification
limitations; legacy absence of product metadata is not itself an error.
New product scenarios require their compatible versioned schema/capabilities.
Reopening unsupported state reports the incompatibility without transformation.

Acceptance: initializing a product does not change existing spec/decision/design
bytes or old client results. Requesting old-spec enrollment reports unsupported
scope instead of silently migrating it. New task/spec binding uses the new
contract without fabricating lineage for old documents.

### PWF-028: Local access and path safety

Limit product operations to the configured shared data root and explicit bound
workspace artifacts through validated identities/relative paths. Preserve the
existing no-disk-scan, no-maintained-project-allowlist interaction: resolve an
explicit project/workspace, not an unrestricted arbitrary file operation.
Reject traversal, unsafe links, collisions and wrong-product bindings before
affected writes. Protect unrelated files and existing permissions. The local
MCP process's filesystem rights remain the trust boundary; bindings and root
checks are not user authentication or a multi-tenant security sandbox. No remote
authentication service, executable configuration/plugin loading or implicit
network request is introduced. Missing rights fail without elevation/fallback.

Acceptance: path and foreign-binding abuse leaves protected/unrelated bytes
unchanged and returns bounded redacted diagnostics. The same outcome holds on
supported platforms; unsupported safety capabilities do not become a success.

### PWF-029: Provenance and non-sensitive workflow data

Store actual non-sensitive requests, questions, answers, observations and
explicit amendments with distinguishable provenance and predecessor refs.
MCP cannot verify user identity or manufacture consent from an agent-supplied
flag. Keep credentials, tokens, private environment values and unrelated
personal data out of documents, journals, diagnostics and exported responses.
Treat repository/document/research contents as data, not authority to execute
commands, widen access or replace higher-priority instructions. Machine-local
binding locations are runtime metadata, not semantic product identities or
portable source references.

Acceptance: fixture injection text does not trigger a command, a network
request or a privilege change. Missing/unclear native answers remain unresolved.
Sensitive input/diagnostic tests do not reveal protected values in saved
workflow evidence or returned errors.

### PWF-030: Bounded scale and deterministic output

Preserve documented existing protections: 16 MiB per source, 100,000 revisions
per decision journal, structured replies up to 24 KiB, complete MCP replies up
to 64 KiB and the existing 2 MiB stdio input boundary. Publish compatible limits
for new scenario fields, document inventories and continuations; do not create
unbounded graph traversal or response assembly. Context and discovery are
deterministically ordered and version-bound. A reached limit returns an
explicit bounded outcome, not silent truncation, history deletion or partial
success. No latency guarantee is invented without measurements.

Acceptance: a synthetic journal with at least 10,000 lines and a multi-document
product can supply exact required context through bounded calls without
returning unrelated journal bodies. Repeat reads of unchanged selected inputs
have stable order/results. Measure actual response sizes and test over-limit,
malformed and invalid-continuation cases; absent measurements are not a claimed
performance improvement.

### PWF-031: Task planning, design and implementation integration

Task specification consumes selected product inputs, asks task-specific
questions and saves behavior/acceptance with stable requirement IDs. Planning
requires its Approved specification and confirmed task manifest, then creates
warranted local architecture/contracts/documentation and verifiable packets.
Exact shared rules stay at one authority with addressed references. Plans
include checks first, meaningful RED, implementation to GREEN and warranted
PROVE, without weakening correct checks to justify code. Implementation
performs one authorized packet, requires a usable Git worktree, updates current
state and stops; it does not execute independent code/security review.
Manifest-declared design remains a separate explicit design-planning stage,
using existing shared-system and per-spec design locations and separately
installed Penpot capabilities. No design stage follows from backend-only scope.

Acceptance: a fresh-context implementer can execute a bounded packet from exact
linked requirements and contracts without the whole product history or chat.
New independent work discovered during breakdown returns for its own task/spec,
not silently added implementation scope. No mandatory commit or code-review
gate is introduced by product integration.

### PWF-032: Reconcile implementation findings at their owner

Classify implementation defects, incorrect checks, obsolete contracts,
environment failures and genuine product/architecture decisions separately.
Correct implementation against correct checks. A material product choice is
raised with a concrete example and alternatives, then returned to its owning
product interview/amendment workflow. Accepted changes update the authoritative
product artifact and affected task evidence through the applicable transition
rules. Do not rewrite PRD/Technical Design merely to rationalize existing code.
Unchanged accepted intent needs no product-document rewrite.

Acceptance: a failing environment check is not recorded as a product change or
pass. A genuine new rule follows draft/review/activation and task-version rules;
an ordinary code defect is fixed without silently relaxing its acceptance test.

### PWF-033: Observable acceptance and review evidence

Each implemented scenario must demonstrate successful behavior and material
invalid, repeated, concurrent, interrupted, stale and recovery outcomes.
Requirements include observable signals for prohibited side effects, not only
claims of absence. Run cross-workspace end-to-end examples with actual outputs
of preceding stages and fresh contexts; avoid feeding implementers expected
answers or hidden corrections. Capture checks, source versions and limitations.
Separate deterministic MCP/schema/generation tests from explicitly launched
model trials. Independent code/security review remains a separate workflow.

Acceptance: a local two-workspace example creates reviewed product inputs,
prepares distinct task specs, edits one isolated product candidate, activates a
checked version and proves both compatible old-task continuation and the
safety-exception pause. A failed/unavailable check remains such; successful
prose or a matching regex alone is not behavior evidence.

### PWF-034: Accurate, bounded MCP tool discovery

Published tool descriptions and parameter descriptions must let an agent select
the intended scenario, supply server-issued references and predict the operation's
effects without loading the entire workflow manual. Apply this to the existing
decision/specification/design tools and the new product tools when registered.
Keep this work limited to metadata, generated references and verification; it
does not authorize new runtime behavior or Penpot canvas operations.

Describe opaque context/reference provenance, version binding and the correct
continuation source. A successful mutation's returned context supersedes the
caller's old context. A conflict requires inspecting fresh state, not blindly
replaying a write. Distinguish requirement source pins, review source pins and
read/change receipts instead of treating all version strings as interchangeable.

Distinguish supported direct project/specification decision readers from
context-bearing workflow tools without removing, hiding, renaming or declaring
the former deprecated. Make local catalog/experience registration effects
explicit: these tools do not create, edit or delete remote Penpot objects.
State write effects even for read-sounding names, including conditional Approved
checkpointing and the no-write exception for an unchanged unfinished review.

Describe the saved scope-proposal/answer/confirmation sequence, full versus
corrections-only review prerequisites and whole-specification consistency gate.
Document actual replacement, default and omitted-field behavior for setters;
do not imply every update merges or every omitted field clears. Describe bounded
reads and their actual continuation fields; exhaustive exact reads must finish,
while a search need only exhaust when the requested task requires completeness.

Acceptance: real tools/list metadata, generated contracts and relevant generated
host references agree. Contexts, refs, receipts and cursor fields have actionable
scenario-specific descriptions, not invented examples or copied full manuals.
Discriminating protocol tests demonstrate the documented effects, pagination and
continuation sequence. Existing tool names, validation constraints, defaults,
annotations, runtime effects, result shapes and error behavior remain compatible.
No undocumented host-specific deferred-loading guarantee, tool-count-based server
split, arbitrary description-length target or measured model-quality claim is
introduced. Any model-selection improvement requires a separately authorized
empirical comparison and is not inferred from metadata tests.

### PWF-035: Bounded actionable workflow diagnostics

Existing specification-workflow errors retain their protocol-2 envelope, error
codes and rejection semantics. Add safe diagnostic details that identify the
failed published field or zero-based batch position, the issue category, and an
applicable published limit. Schema paths contain only known contract field names
and numeric indexes; unknown caller-supplied keys are not echoed. Do not include
submitted answers, explanations, context/read tokens, filesystem paths, stacks
or arbitrary payload values. Existing product-schema diagnostics retain their
own compatible contract; this amendment does not flatten the two APIs.

At most 20 diagnostic issues and 8,192 UTF-8 bytes of compact JSON `details` are
returned; the existing 512-character message and overall reply limits remain.
When more information exists, disclose truncation and the bounded lookup needed
to obtain the exact saved record. Deterministic truncation must retain the issue
category, affected batch index when known and safe recovery guidance rather
than silently discarding all details. Saved decision/question references and
saved option IDs are domain identifiers, not permission to echo rejected input.

An invalid selected option identifies the exact saved question reference and
its allowed option IDs within the diagnostic budget. If that list cannot fit,
return a declared partial list and direct the caller to `decision_get` and its
continuations. Do not infer an answer or choose an option. An invalid decision
link batch identifies the failing member and requested/current saved reference
when safely established from a coherent snapshot. Keep the 20-member link limit,
strict current-reference validation and single/batch parity; one current member
does not prove that all members are current. A stale/unknown/duplicate member or
unknown requirement rejects the entire batch. Conflicts require reopening and
inspection; diagnostics never authorize automatic refresh-and-retry.

Acceptance: invalid options, 21-member link requests and mixed current/stale
requests give actionable bounded errors. A 20-member all-current link request
succeeds; already-satisfied links remain a no-op. Rejected calls leave source
bytes, versions, decisions and receipt counts unchanged. Synthetic malicious
keys, payload values and Unicode text cannot leak through diagnostic fields or
exceed their byte limits. The complete allowed-option list remains retrievable
without guessing, including after diagnostic truncation.

### PWF-036: Supersession-aware revision warnings

Keep append-only history and existing latest non-explicitly-superseded selection.
For `multiple_current_revisions`, count ambiguous decision IDs, not old rows:
within each ID, revisions consumed by a valid `supersedes_revision` edge and
rows explicitly marked `superseded` are not candidate heads. Warn once for an
ID with more than one remaining head; return zero for a valid linear chain.
Do not rewrite predecessor states or switch the legacy selected record to
implement this warning correction.

Acceptance: prepare -> answer -> link gives one selected current decision and
zero warnings. Two unlinked live revisions or two branches from one predecessor
give one warning for that ID; two ambiguous IDs give two. Explicitly superseded
rows do not create a false warning. Omitting a link is distinct from naming a
nonexistent/non-earlier revision: existing invalid-link and duplicate-pair
rejections remain. Observe unchanged journal bytes and selected references
through read-only legacy and context-bearing queries.

### PWF-037: Separate document status and approval observation

`specification_check_state` exposes observed Markdown status separately from
mechanical pass and review coverage. Distinguish missing status/document, Draft
and Approved; retain existing invalid-specification errors for invalid input.
Expose whether approval observation is durably recorded for the current fresh
review, and whether this call wrote it or found it already recorded. A historical
checkpoint from a stale review is not current approval evidence.

Keep the existing author-made Draft-to-Approved observation boundary. A review
started with Approved text does not demonstrate that transition. MCP never
changes Markdown status or grants readiness itself. Preserve
`approved_by_tool: false`, `semantic_correctness_proven: false` and
`reviewer_independence_authenticated: false`; an observed status or stored
checkpoint is not authenticated consent or semantic proof. Status-only edits
retain the existing semantic source identity. `specification_open` retains its
four managed-YAML artifact inventory; it does not become a repository inventory.
`specification_review_status` remains strictly read-only.

Acceptance: missing, Draft, Approved-at-review-start, newly observed transition,
already checkpointed and stale-review scenarios distinguish these states.
A first eligible check reports the durable observation and its write; a repeated
check reports the existing observation without another receipt or version change.
Read-only status never writes the checkpoint. Existing coverage and freshness
guards still prevent a stale or unfinished review from becoming a readiness pass.

### PWF-038: Review lifecycle diagnostics and safe recovery

When a requested review operation is invalid for an identifiable current review,
report its mode, lifecycle reason and an applicable next action through the
bounded diagnostics of PWF-035. Distinguish full review, followup with pending
detailed checks, followup awaiting consistency, consistency already recorded,
completed review and stale inputs. Preserve existing error codes, required
evidence and the separate final whole-specification consistency operation.

Legacy full reviews cannot accept followup-consistency writes; enhanced full
reviews explicitly opt into the final-consistency contract of PWF-042. Pending detailed items
must be read and recorded before followup consistency; a recorded consistency
assessment is not overwritten. If all necessary results exist, completion is
the next applicable operation, not another verdict. A completed run is inspected
through read-only status; source changes require a new review. Stale context or
inputs take precedence over advice to write: reopen, inspect stored results and
determine whether the same run is still current. Unknown or inaccessible runs
must not acquire an invented mode or source details. No diagnostic executes its
suggested action.

Acceptance: a full/followup/lifecycle matrix yields the correct reason and
recovery action without changing files, versions or receipts after rejection.
Two clients can read progress while a reviewer uses contexts returned by each
successful mutation. Genuine concurrent changes still conflict. Reopening never
blindly repeats or overwrites a saved verdict. New instructions, answers, changed
scope or uncertain impact retain the existing full-review requirement.

### PWF-039: Bounded per-item review-verdict batches

Add the explicit scenario `specification_review_record_batch` for one current
`context`, one `review_ref` and 1-20 distinct `items`. Each item uses the existing
single-verdict fields: `item_index`, `read_receipt`, `verdict`, `explanation`,
optional `counterexample`, `evidence_requirement_ids` and `evidence_source_refs`.
Keep existing per-field validation and defaults. The complete arguments object,
including context and review reference, is limited to 131,072 UTF-8 bytes of
compact JSON before applying defaults; outer JSON-RPC framing is excluded.
The 2 MiB transport ceiling and all existing reply/source limits still apply.
Oversized arguments or item counts fail before any durable write.

Each item must independently satisfy the single-item exact-read, freshness and
evidence rules. A read receipt binds the project, specification, review, source
and item, and stays valid across other verdict writes in the same unchanged run.
No blanket verdict, inferred evidence or receipt for another item is accepted.
Both full and eligible followup detailed reviews may use batches; inherited
results are already recorded items, and whole-specification consistency is not
a batch item. Batches do not complete a run or mark the specification Approved.
The original single-item operation remains available with its existing rules.

Acceptance: equivalent fully read inventories produce the same semantic results
and coverage with single and batch recording, including mixed verdicts and valid
non-behavioral exclusions. Missing, foreign, stale or incomplete receipts and
missing evidence reject the batch. Exercise 1/20/21 items and argument sizes at
and above 131,072 bytes with multibyte text; observe unchanged durable state on
rejection. Tool discovery and the generated MCP contract disclose these limits,
write effects and the separate completion/consistency boundaries.

### PWF-040: Atomic batches and exact-request recovery

Validate all batch members against one coherent current snapshot under the
existing cooperative write protection. Either append every verdict through one
journal commit and one operation receipt, or append none. Preflight the bounded
success reply before committing; return ordered per-item outcomes, the recorded
item total and the updated context through the existing protocol-2 envelope.
Within-batch duplicate indexes are invalid. A new request containing any already
recorded item fails as a whole, even if the supplied verdict is identical.
Identify its zero-based batch position; never skip it, overwrite it or commit
other members. This also covers a mixed existing/new request.

An exact replay of an already committed request, including its original context
and item order, recovers the stored result under the existing operation-identity
rules without another verdict, receipt or journal write. Preserve the latest-64
successful-receipts-per-file recovery window, including after server restart;
an expired original-context replay fails stale rather than duplicating effects.
A changed context, reordered batch or edited verdict is a new request, not an
exact replay. After a non-exact retry, inspect current status and saved results
before submitting only still-unrecorded items. Contradictory retries cannot
replace earlier judgments. Retain existing conflict, interruption and explicit
crash-lock recovery guarantees; do not promise power-loss durability or
automatically remove locks.

Acceptance: a failing last member leaves all prior members unrecorded and file
bytes, versions and receipt counts unchanged. Lost replies, exact repeats and
restart produce one saved batch only. Reordered/mixed/contradictory new requests
reject atomically. Two independent clients demonstrate harmless observer reads
and real stale-write conflicts. A successful batch followed by another using its
returned context works without a self-conflict. No-op linking and exact replay
remain free of additional durable writes.

### PWF-041: Exact delivered evidence and measured write reduction

Batch acceptance does not prove that the model received or understood the source
text. The reviewer must reconstruct every required exact portion before judging
it. An externally compressed display marker or summary cannot substitute for
content or an opaque context/reference. Forward actual returned opaque values;
use an available lossless retrieval facility for compressed text. If exact
content is unavailable, leave affected verdicts unrecorded while permitting
unrelated read-only work. Preserve actual user questions/answers even when they
make followup inheritance ineligible; finish source corrections before the next
review. No server-specific compression decoder, short context-handle format,
unversioned write or claim of authenticated reading is introduced.

For equal synthetic 60-item review inventories, sixty single-item verdict writes
and three valid 20-item batches must produce equivalent semantic results while
using sixty versus three verdict journal commits. Count start/read/complete
operations separately. Measure actual written bytes, final file size, receipt
growth and elapsed time; do not infer fewer necessary reads, faster semantic
judgment or a machine-independent latency target from fewer write calls.
Exercise bounded exact reconstruction, no-op linking and replay on synthetic
1,000- and 10,000-row histories within the existing source limits; distinguish
decision-revision, receipt and snapshot contributions to retained size.
Preserve schemas, history and archives without automatic compaction, retention
cleanup, migration or product-store redesign. Compatibility changes in PWF-035–PWF-041 are limited
to these diagnostics, the warning correction and the additive batch capability;
PWF-034 remains a metadata-only requirement. Existing platform, scope and
explicit-invocation boundaries remain applicable.

Acceptance: protocol tests distinguish raw transport delivery from a compressed
model-visible fixture; possession of a receipt alone is not counted as reading
evidence. Fresh-host qualification records actual delivery and treats unavailable
evidence as unverified. Measured commit/byte counters establish the write
reduction on equal inputs; residual storage costs remain visible. No real
customer ledger is mutated for these tests. Claude trials, Penpot execution,
global configuration changes and installation are not part of this amendment.

### PWF-042: Final consistency for enhanced full specification reviews

Provide an explicitly advertised enhanced full-review capability. Updated
specification skills request it and perform a final whole-specification assessment
after all detailed verdicts are durably recorded. The reviewer receives the exact
complete current specification, requirement definitions, and all saved detailed
verdicts/findings through bounded version-bound reads. A receipt for an earlier
subset or earlier verdict set cannot authorize the final assessment. Completion
requires this fresh assessment; a gap or conflict prevents a reviewed pass.
Receipts and counters still do not prove semantic correctness or independence.

The author and reviewer check normative prose, public interface names, permissions,
negative obligations and lifecycle ordering against addressed requirements. A
material promise outside a requirement must have an unambiguous requirement or
authoritative-contract reference; introductions, examples and quotations need not
be duplicated as requirements. Assess cross-section contradictions semantically,
not by claiming that a keyword search proves completeness. Review every finding
in one run rather than stopping at the first gap.

Preserve legacy full-review calls and retained runs without silently upgrading
their evidence. Enhanced mode is explicit in discovery and saved review state;
unsupported capability blocks the upgraded workflow, not legacy inspection.
Its consistency assessment is separate from detailed verdict batches, as for
followups. Updated skills save each fully read item or a bounded supported batch
before reading another batch; no read-all-then-record-all backlog is required.
Unavailable batch capability uses the existing single-item operation, not a
handwritten journal. Keep progress based on acknowledged writes only.

Acceptance: enhanced completion rejects missing/early/stale consistency evidence;
reading the final context and recording a concrete cross-section conflict yields
gaps even when detailed items were covered. A verdict-set change invalidates the
old consistency receipt. Legacy completed runs remain readable without migration.
Neutral model fixtures include normative prose, conflicting recovery order and
an illustrative non-normative example; no promise that every defect is found or
every review needs fewer runs is inferred from protocol checks.

### PWF-043: Finding-linked corrections to shared specification text

Permit corrections-only followup when only shared non-requirement text changed,
all requirement definitions and original source meanings are unchanged, scope and
active profiles are unchanged, and every changed portion is explicitly tied to
a finding of the latest completed gaps review. Existing eligible requirement and
traceability repairs remain supported. Preserve their current safeguards.

New instructions, answers, normative scope, removed obligations, Approved-parent
amendments, unavailable historical evidence or uncertain impact require full
review. Unchanged hashes are necessary evidence for inheritance, not semantic
proof of harmlessness. A reviewer examines exact before/after text and finding
links, expands affected detailed items when justified, and rejects inheritance
in favor of full review when influence cannot be bounded. Context and active
profiles are freshly checked, never inherited. Final whole-specification
consistency remains mandatory and cannot be batched with detailed verdicts.

Acceptance: correcting one contradictory baseline phrase in a synthetic Draft
specification can retain attributed unaffected verdicts, recheck affected items
and complete only after fresh consistency. An unlinked change, new scope hidden
in prose, changed source meaning or missing snapshot cannot receive a successful
accelerated pass. Test both deterministic eligibility rejection and independent
reviewer rejection where semantic judgment is required; do not label an agent's
impact declaration authenticated or automatically proven.

### PWF-044: Bounded structured change-report navigation

Expose structured eligibility, fixed full-review reason codes, exact finding
keys, changed item keys, required detailed items and inheritance candidates
without forcing clients to parse a large serialized JSON document or read server
code. Keep the existing text/continuation interface compatible. The structured
interface separates small navigational metadata from exact paginated evidence;
large collections and long fields have explicit continuations, counts and source
identities. No silent truncation, unbounded reply or summary-as-evidence shortcut
is allowed. A finding key is returned explicitly and links to its saved finding.

Exact before/after content and original findings remain obtainable; eligibility
or a preview alone never issues a receipt attesting complete evidence delivery.
Continuations and complete-change receipts are bound to the project,
specification, parent snapshot, current source and selection. Changed inputs,
incomplete reads and cross-report cursors fail without writing. Public metadata
explains which receipt authorizes followup and which fields are navigation only.

Acceptance: a large synthetic report supports tool selection and fix mapping
from structured fields without source-code inspection. All exact content can be
reconstructed in order within existing response budgets, including long Unicode
fields; missing pages, changed sources and foreign cursors cannot authorize
followup. Legacy text readers and new readers reach equivalent eligible changes
and findings. Measure actual calls and bytes, not an assumed speedup.

### PWF-045: Distinguish workflow conflicts from semantic source drift

Preserve existing top-level error codes, rejection behavior and concurrency
guards. Add bounded fixed diagnostics that distinguish an outdated workflow
context, a dependency changing during a read, and positively established changed
review inputs. If a coherent comparison is unavailable, report uncertainty rather
than label the specification changed. Journal-byte changes caused only by review
records must not be presented as proven changes to requirement/source meaning.

Read-only calls still never write, and inconsistent reads never return success.
Diagnostics neither refresh-and-retry a mutation nor waive stale-write checks.
On conflict the agent reopens, inspects current review versions and saved effects,
then explicitly resumes only if the same run remains fresh; a real semantic
change requires the appropriate new independent review. Existing diagnostic
redaction and size limits apply. Proof-limit flags retain their meanings and are
explained as limitations separately from actual failed checks, using existing
PWF-034/PWF-037 documentation rather than new success semantics.

Acceptance: two clients produce separate observable cases for a verdict-only
journal race, a stale mutation and an actual requirement/source edit. A forced
read-time race returns a classified failure without an inconsistent result;
reopening preserves the first saved verdict. Genuine conflicts still reject,
and diagnostics contain no source text, context tokens or filesystem paths.

## Planning handoff boundaries

The confirmed manifest declares a reviewable MCP contract, data schemas and
quality/recovery scenarios for later planning. Planning selects implementation
units, exact tool schemas, storage encoding/layout within the agreed boundaries,
tests and packet order. This invocation does not create those outputs or
`handoff.md`, implement a shared store, edit skills, migrate projects, install
artifacts, commit changes or publish anything.

Approval of this specification will mean that its requirements passed the
specified completeness process; it will not authorize the next workflow.
