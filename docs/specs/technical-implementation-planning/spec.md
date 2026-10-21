# Task-Level Technical Agreement During Planning

Status: Approved

## Outcome

Planning turns approved requirements into implementation stages and task packets
whose significant technical decisions have been explicitly discussed and agreed
with the user. Incremental implementation executes those decisions without having
to choose the architecture again.

## Scope And Support

The confirmed depth is Standard with the core profile. The consumers are
`planning-and-task-breakdown` and `incremental-implementation` in the existing
Codex and Claude Code distributions. Both hosts retain their native question
tools, explicit invocation, shared template source and isolated generated output.
This change adds no operating-system or runtime support commitment. Existing
supported environments and mandatory workflow MCP access remain in force.

The existing plan, checklist, handoff and numbered packets remain the planning
bundle. No additional standalone architecture document, decision document,
profile contract or planning stage is required by this specification. Narrow MCP
changes needed to separate technical decision freshness from behavioral
specification freshness are included. The representation is a planning decision.

## Requirements

### TIP-001: Preserve workflow ownership and host parity

Specification owns observable product behavior, scope and acceptance. Planning
owns implementation choices and their agreement. Implementation owns execution
of one separately authorized packet. A technical proposal must satisfy approved
product behavior; changing that behavior returns to specification.

The technical agreement workflow applies to both supported hosts and at every
planning depth. Depth changes useful detail, not the need for agreement. Use the
host's callable native question tool and published schema; preserve the existing
saved conversational fallback when that tool is unavailable. Missing required
MCP capability blocks dependent work without a handwritten-state fallback.

Acceptance: equivalent Codex and Claude scenarios obtain the same agreement and
readiness outcomes through their own question tools. Planning creates only
authorized planning artifacts. Inspection of changed paths and invoked actions
shows no production implementation, installation, commit or publication caused
by planning or by agreement alone.

### TIP-002: Investigate and recommend before asking

Before requesting a technical choice, the planning agent inspects the relevant
existing code, tests, contracts and repository guidance, considers viable
solutions, and presents a concrete recommendation with concise reasons. It must
not ask the user to invent the solution from a blank question. Distinguish
verified existing units from proposed units and unresolved assumptions.

When several reasonable approaches exist, present the meaningful alternatives
and their consequences for the current task, including complexity, compatibility
and verification where relevant. Prefer reuse and the simplest sufficient
design. If one approach is adequate, explain it and request agreement without
inventing alternatives to fill a quota. Discuss a pattern only when it solves an
identified problem; plain functions, existing components or configuration are
valid solutions. Do not force classes, interfaces, patterns or new dependencies.

Acceptance: a task with a real architectural choice receives a supported
recommendation and understandable alternatives before the answer. A small task
with one adequate approach receives a concise concrete proposal. The discussion
and packet show neither an unexplained pattern nor an artificial second option.

### TIP-003: Agree significant units and contracts

Each task's proposal identifies its implementation approach, affected existing
units and proposed significant classes, functions, modules or other
language-appropriate units. Describe responsibilities, meaningful symbols,
inputs and outputs, interactions and dependency direction. Include state,
lifecycle, errors, invariants and important algorithmic choices where they affect
the solution. Explain how this structure delivers the linked product outcome.

Distinguish commitments from illustrative names or examples. Public or shared
signatures must be precise where callers depend on them. Minor private helpers,
local variable names and equivalent internal statement organization need not be
enumerated in advance unless they are themselves an explicit agreed constraint.
Use small examples or pseudocode only to remove a concrete ambiguity; a complete
code listing is not a planning deliverable.

Acceptance: a reader can identify the agreed significant units, their contracts,
how they interact and what remains locally flexible without consulting chat
history. A vague instruction such as "implement the service" is insufficient;
enumerating every private helper is not required for readiness.

### TIP-004: Obtain explicit agreement for every task

Every implementation task requires an explicit user answer to its concrete
technical proposal before that task can be marked ready. A recommendation,
preselected option, generic earlier approval, silence, dismissal, cancellation,
tool failure or incomplete answer is not agreement.

A small group of explicitly identified tasks may share one question and answer
when each proposal has already been shown and the question makes the covered
tasks and choices clear. The group must fit the native tool's limits and remain
easy to compare; split disputed or unrelated choices. A partial answer resolves
only the named tasks and choices. A custom answer may resolve a choice when its
meaning is unambiguous; otherwise the affected choice stays unresolved.

Discuss shared architectural decisions once and reference them from dependent
task proposals. Each task still needs explicit coverage by an answer. Do not
repeat a settled question without a material change. Record the presented
proposal, covered task identities, actual answer and its provenance through the
managed workflow, and expose exact references from the affected packets.

Acceptance: a group answer can make every explicitly covered task agreed;
acceptance of only one member leaves the others pending. Resuming after an
interruption preserves saved answers and continues with unresolved choices.
Inspecting the saved question, answer and packet references distinguishes real
agreement from a default, an answer to another proposal or a missing response.

### TIP-005: Produce an executable staged plan

The plan describes implementation stages, packet dependencies and independently
verifiable outcomes. Each packet records the selected technical solution,
significant contracts, concise rationale, relevant shared decision references
and agreement evidence. Include a rejected alternative only when it explains a
material tradeoff; do not copy a long interview into every packet.

Keep one authoritative location for each shared technical decision and make
task-specific commitments readable from the packet and its exact bounded
references. Retain requirement mappings, repository evidence, allowed scope,
test-first steps, acceptance checks and relevant recovery constraints from the
existing packet contract. Contract details must be settled before readiness;
an untested factual assumption is not disguised as a user-approved fact.

Planning may save drafts and continue independent work while an answer is
pending. An unresolved task remains pending with its missing decision visible;
the complete implementation plan is not represented as ready until all required
task agreements and other existing prerequisites are satisfied.

Acceptance: a fresh executor can follow the staged plan and one packet's exact
inputs to implement and verify its agreed solution without choosing an
architecture or inventing product behavior. Checklist/readiness inspection
shows unresolved agreements rather than a blanket completed-plan assertion.

### TIP-006: Execute agreed decisions with bounded local freedom

Incremental implementation verifies the current packet's agreement evidence,
technical commitments, linked specification and repository assumptions before
dependent edits. It implements the agreed significant units, contracts,
interactions and selected approach. Passing behavioral tests alone does not
justify silently substituting a different agreed architecture or pattern.

The executor may choose minor local details left flexible by TIP-003 when they
preserve agreed behavior, significant technical commitments and repository
rules. This freedom is not permission to rename or restructure a unit explicitly
agreed as a constraint. A moved existing symbol with unchanged meaning can be
refreshed as evidence and recorded without reopening the design.

Verification includes a proportionate comparison of the final change with the
packet's technical commitments, alongside the existing required tests/checks.
The handoff records the result and any unresolved discrepancy. No separate
independent code-review gate or additional implementation authorization is
introduced beyond the existing one-packet authorization boundary.

Acceptance: adding a harmless private helper within the agreed boundary can
complete normally. Replacing an agreed function-based solution with a class
hierarchy, changing a shared signature or shifting ownership cannot complete
silently even if behavioral checks pass. The scoped diff and handoff provide
the observation for this negative guarantee.

### TIP-007: Reconcile material changes through the owning workflow

If evidence disproves an agreed technical choice, or the user changes it,
checkpoint the discrepancy and affected tasks. Stop dependent implementation
and return material technical redesign to separately authorized planning;
changes to product behavior, scope or acceptance return to specification.
Preserve unrelated work and existing answers.

Planning presents the revised proposal and obtains a new explicit answer for
the affected tasks and downstream decisions before restoring readiness. Keep
prior answers as history, but do not reuse them as agreement to changed
commitments. Unaffected agreements remain reusable. Recheck prerequisites and
versions; never silently refresh references to conceal changed input.

Acceptance: changing a shared boundary reopens every dependent commitment that
is affected while an independent task retains its agreement. A stale packet or
unsupported assumption cannot pass the readiness check through an old answer.

### TIP-008: Handle existing plans at the affected task boundary

An existing task without explicit agreement to a technical proposal satisfying
these rules is not eligible for incremental execution. Report the missing
agreement and return that task to planning for focused supplementation and
confirmation. Existing precise proposal and answer evidence can be reused when
it already meets the contract; do not demand a new answer solely due to age.

Do not migrate every old plan, rewrite completed tasks or reopen unrelated work.
This gate also applies when an incomplete old packet is resumed; preserve its
existing changes while obtaining the missing planning input.

Acceptance: invoking an old unagreed packet produces a concrete planning
prerequisite without new production edits. The same packet becomes eligible
after focused agreement and other existing checks; unrelated and completed
packets remain untouched, observable in the scoped change inventory.

### TIP-009: Separate technical agreement freshness from requirements freshness

Recording or revising a purely implementation-local proposal, question or answer
must not invalidate the completeness approval or reviewed input version of an
otherwise unchanged behavioral specification. Technical decisions must still
have durable identity, exact answer provenance, task bindings and detectable
revisions so stale agreement cannot be consumed by a packet.

Changing product requirements, their source decisions, confirmed scope or
acceptance must retain the existing specification invalidation and review
behavior. Calling a behavioral change "technical" must not bypass this rule.
Ambiguous or mixed changes remain unresolved until their ownership is clarified.
The managed workflow retains validation, version/conflict checks, history and
exact reads; no direct YAML edits or second independent decision journal are
introduced as a workaround.

Existing records without reliable classification keep their previous
specification-freshness meaning; do not silently relabel them or infer consent.
An incompatible runtime that cannot support the required distinction leaves the
affected operation blocked with an actionable capability requirement. It must
not claim preserved freshness or authorize an automatic installation.

Acceptance: after a reviewed specification, saving a pure technical answer
preserves its approval and aggregate reviewed version while changing an agreed
proposal makes its dependent packet's old agreement stale. A behavioral or
scope amendment still invalidates the specification. A resume, repeated read or
failed write cannot fabricate an answer or mix versions. Check outcomes through
the managed scenario tools and exact packet references.

### TIP-010: Keep verification proportional and observable

Validate the workflow contract through focused scenarios covering meaningful
alternatives, one sufficient approach, language-appropriate units, grouped and
partial agreement, missing answers, resumption, material revisions, local
execution freedom, legacy packets and both freshness outcomes in TIP-009.
Observe presented proposals, actual recorded answers, readiness, version
results and resulting packet/handoff content rather than checking only for
particular words in skill text.

Reuse existing test and qualification infrastructure. Fixture answers remain
simulation evidence, never actual user authorization. Retain existing
test-first and required-check rules; a failed or unavailable required check
leaves the affected work incomplete. Do not add a new mandatory independent
review stage for plans or code, a question quota, a timing quota or a new
framework merely to demonstrate thoroughness.

Acceptance: a scenario in which an executor chooses its own material approach,
or a default is stored as agreement, is observably rejected. Both generated
host artifacts satisfy their existing isolation and size constraints. Results
distinguish behavioral evidence, structural checks and unverified host behavior.

## Non-Goals

This specification does not implement the workflows or choose the internal
representation of their new decision semantics. It does not introduce a general
architecture framework, require UML or a new architecture decision record for
every task, prescribe all source code in advance, or redesign Product Roadmap,
Technical Design or Penpot workflows. Existing product-linked ownership and
scope boundaries remain applicable. Installation, commits, publication and
unrelated worktree changes are outside this invocation.

## Baseline Evidence

- Planning already names technical units but asks only unresolved choices:
  `skills/planning-and-task-breakdown/SKILL.md:38-46`.
- Packet detail and readiness already cover significant contracts:
  `skills/planning-and-task-breakdown/references/task-packets.md:60-62,112-116`.
- Planning currently saves technical questions through specification scenarios:
  `skills/planning-and-task-breakdown/references/adaptive-planning.md:98-104`.
- The local specification snapshot includes every decision revision:
  `packages/engineer-agent-workflow-mcp/src/review-model.ts:11-17`; changed
  aggregate versions are stale in
  `packages/engineer-agent-workflow-mcp/src/reviews.ts:82-84`.
- Existing recovery returns material architecture changes to their owner:
  `skills/incremental-implementation/references/packet-recovery.md:17-22`.

These are inspected source contracts, not a claim of completed implementation
or a live cross-host qualification run. Decision-to-requirement links remain
authoritative in the managed decision ledger.
