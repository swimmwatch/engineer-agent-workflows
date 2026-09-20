# Cross-Client Engineering Skill Distribution

Status: Approved

Date: 2026-07-25

## Summary

`engineer-agent-workflows` is the public, authoritative repository for a
SemVer collection of reusable engineering Agent Skills. One portable
template-based source tree supports Codex and Claude Code by generating a
separate global/native artifact for each host. Each artifact contains only its
own project-guidance filename, standard question tool, plugin manifest, and
host-only metadata.

The project will not create a lifecycle executable, installer, wrapper, or
local state format. Global installation and replacement use separate
host-specific `add --copy` commands through an exact pinned version of the
open-source `skills` CLI. Listing and removal use explicit global agent
selection. `skills update` is not used because the pinned parser cannot select
an agent. The project will never inspect, create, modify, migrate, remove, or
restore skills inside consuming projects.

The specification and planning workflows form an adaptive pair. Specification
confirms a `Lite`, `Standard`, or `Deep` depth and composable profiles, stores
decision history separately from current scope, and finishes with an Approved
behavioral contract. Planning requires that contract, creates only warranted
reviewable profile artifacts, and emits verification-first task packets without
implementing them.

## Goals

### OUT-001: Canonical project

The canonical project is the separate public GitHub repository
`engineer-agent-workflows`. It owns portable skill sources, shared references,
host metadata, plugin and marketplace manifests, release metadata,
documentation, and acceptance evidence.

The project shall:

- eliminate hand-maintained copies of reusable skills across projects;
- make selected workflows available globally to local Codex and Claude Code;
- offer a complete native plugin bundle for supported marketplace, hosted, and
  organization-managed surfaces;
- use established Agent Skills distribution tooling instead of maintaining
  custom lifecycle code;
- make every workflow explicit-only and keep the complete discovery catalog
  within the native default context budgets of both supported hosts;
- publish signed, checksummed SemVer releases under the MIT License;
- verify global installation without changing any consuming project.

## Non-Goals

### SCOPE-001: Explicit exclusions

v1 does not include:

- a custom project lifecycle CLI, installer, package manager, wrapper, or
  state directory;
- project-scope installation through the selected `skills` CLI;
- discovery, audit, migration, removal, restoration, or modification of skills
  inside consuming projects;
- managed rollback, version retention, or a project-owned installation lock;
- automatic background updates;
- implicit or model-initiated invocation of collection workflows;
- a rolling-main or preview release channel;
- independently edited Codex and Claude versions of a workflow;
- per-skill native marketplace plugins;
- submission to OpenAI's or Anthropic's vendor-operated public directories;
- implementation or distribution of a cross-platform Prompt MCP backend;
- installation, removal, or reconfiguration of Prompt MCP;
- publication without a separately authorized release action.

Existing project-local skills remain owned by their projects. This repository
does not offer a cleanup or migration command for them.

## Initial Workflow Inventory

### SKILL-001: Initial skills

The initial collection shall contain generalized versions of:

1. `code-review-and-quality`
2. `code-simplification`
3. `context-engineering`
4. `design-planning`
5. `documentation-and-adrs`
6. `doubt-driven-development`
7. `idea-refine`
8. `incremental-implementation`
9. `interview-me`
10. `performance-optimization`
11. `planning-and-task-breakdown`
12. `project-docs-maintainer`
13. `project-pull-request`
14. `project-release`
15. `security-and-hardening`
16. `spec-driven-development`

Every skill shall retain a focused user goal, explicit invocation contract,
workflow boundary, non-goals, safety constraints, stopping condition, and
verification expectations. Prompt-MCP-specific source-project details shall be
removed from every collection workflow.

### SKILL-002: Repository adaptation

Global workflows shall obtain project facts at invocation time rather than
embedding one source repository's language, framework, commands, directories,
or release process.

- In both hosts, follow project instructions already supplied in active
  context without rereading their source files solely to recover context.
- Read an additional task-scoped instruction file only when it is absent from
  active context or the file itself is in scope: `AGENTS.md` in Codex and
  `CLAUDE.md` in Claude Code.
- In both hosts, current code, tests, interfaces, configuration, and stable
  documentation outrank generic workflow defaults.
- Do not claim a tool, CI job, package manager, runtime, directory, or release
  system exists without repository evidence.
- Do not write project-level skill files as an adaptation mechanism.

### SKILL-003: Identity and discovery

Skill names are stable public identifiers. Removing or renaming a skill is a
breaking change.

Descriptions are concise selector and discovery summaries, not permission for
implicit activation. Each description shall front-load the recognizable user
goal, distinguish the workflow from similarly named skills, and contain no
project-specific inventory. A change that alters the public workflow identity
or explicit invocation contract is user-visible and requires at least a MINOR
release.

### SKILL-004: Standalone and bundle-required skills

Each skill shall be classified in a canonical catalog as either:

- `standalone`: every required reference, asset, and deterministic script is
  contained within the skill, and no other installed workflow is required; or
- `bundle-required`: correct execution requires one or more companion
  workflows from the same release.

Standalone skills may be installed individually. Normative instructions for a
bundle-required skill shall install the complete collection. If a
bundle-required skill is invoked without its companions, it shall stop with a
fixed, non-destructive installation instruction rather than silently degrading
or inventing the missing workflow.

Related but optional workflows are recommendations, not dependencies.

The current classification is:

- `spec-driven-development` is standalone and contains every resource needed
  to produce and maintain a specification bundle;
- `planning-and-task-breakdown` is bundle-required and depends on the matching
  `spec-driven-development` workflow because planning accepts only its Approved
  specification and confirmed scope manifest;
- `incremental-implementation` is bundle-required and depends on the matching
  `planning-and-task-breakdown` workflow;
- `design-planning` is bundle-required and depends on the matching
  `planning-and-task-breakdown` workflow; its Penpot skills are external;
- the other 12 initial workflows are standalone and shall contain all their
  required references, assets, and scripts.

`standalone` classifies sibling workflow dependencies, not external tool
prerequisites. Specification, planning and incremental journal operations
additionally require the separate decision-reader MCP described by MCP-002.

### SKILL-005: Refinement contract

The initial extraction is a semantic refinement, not a textual copy. Each of
the 15 source skills shall be reviewed independently and shall:

- remove `prompt-mcp` language, Go/GTK assumptions, fixed directories, and
  source-project commands;
- preserve the workflow's user outcome, safety boundary, explicit
  authorization gates, stopping condition, and verification obligations;
- reuse host-supplied project instructions and discover only additional scoped
  instructions, interfaces, tooling, and tests at invocation time;
- state only unconditional workflow instructions in `SKILL.md`;
- route optional domain detail to named references and state the exact
  condition under which each reference is read;
- use scripts only for deterministic work whose output is bounded and more
  reliable than instructions;
- avoid repeating host setup, generic safety prose, or project discovery
  guidance that belongs in generated host metadata or a shared reference.

Each discovery `description` shall be at most 240 Unicode code points. Each
complete `SKILL.md`, including frontmatter, shall be at most 4,096 UTF-8 bytes.
References and assets do not count toward the `SKILL.md` limit, but must remain
selectively routed rather than loaded wholesale.

### SPEC-001: Adaptive specification scope

Specification owns recovery state in `spec.md`, `manifest.yaml`, and
`decisions.yaml`, as applicable to the current stage. It shall not create
`handoff.md`; that artifact begins with the separate planning invocation.

`spec-driven-development` shall inspect the request and task-scoped repository
evidence before asking questions. It shall not ask for facts already
established. Before detailed requirements interviewing, it shall:

- choose the highest applicable `Lite`, `Standard`, or `Deep` depth rather than
  averaging away one material complexity or risk signal;
- evaluate the composable `core`, `ui`, `backend`, `events`, `data`,
  `operations`, `security`, and `cross-surface` profiles, recording every
  considered profile as `active`, `not_applicable`, or `needs_user` with an
  evidence-backed reason;
- choose exact planning-artifact paths from compact routing metadata without
  loading detailed profile guidance;
- present one plain-language proposal containing depth, active profiles,
  important exclusions, rationale, and warranted planning artifacts, then
  obtain explicit user confirmation through INT-001 before detailed questions;
- keep versioned proposals and answers in `decisions.yaml`, while replacing
  `manifest.yaml` only with the latest explicitly confirmed current scope.
- before that manifest is confirmed, load no profile-specific reference; after
  confirmation, derive one dedicated reference path per active profile and load
  exactly that set, skipping inactive or merely possible profile guidance and
  forbidding grouped references that import unrelated profile context.

The deterministic manifest under `docs/specs/<slug>/manifest.yaml` shall have a
schema version, lowercase depth, `confirmed` state, rationale, stably ordered
profile records, and stably ordered specification-relative `planning_artifacts`.
Optional `project_artifacts` lists exact project-relative UI design output files;
absence means `[]`. It requires active `ui` and is limited to `design/system/`
and `design/specs/<this-slug>/`, without traversal, absolute paths, wildcards,
directory-wide authority or escaping symlinks. Existing read-only shared sources
are not output authority. Legacy manifests require no automatic migration.
The manifest shall contain no
timestamps, secrets, host diagnostics, or speculative tools. Material changes
to depth, profiles, or artifacts require a new decision revision and renewed
confirmation before the current manifest is replaced.

Depth scales question breadth and planning evidence, never baseline
correctness, security, privacy, accessibility, or explicit acceptance:

- `Lite` covers one bounded familiar behavior with one ownership boundary and
  no material public contract, migration, distributed coordination, or
  high-risk control.
- `Standard` covers interacting states or components, a material UI/API/core
  contract, persistent state, or moderate compatibility and recovery concerns.
- `Deep` covers multiple deployables or external parties, public contract
  evolution, distributed coordination, difficult migration or rollback,
  complex UI state, strict quality objectives, or security/privacy/compliance
  critical behavior.

The specification shall define observable behavior and acceptance and declare
warranted profile artifacts in the manifest, but shall not create UI designs,
API schemas, architecture models, task packets, or other planning artifacts.

The artifact registry names candidates, not mandatory output for every active
profile. A Lite change to an established interface keeps its contract in the
specification and task packet unless machine validation, multiple consumers,
or an explicit requirement warrants a separate source. An active `core` profile
alone does not require `core/contracts.yaml`.

## Engineering Manual And Planning Detail

### MAN-001: Canonical engineering manual

The collection shall maintain one authoritative engineering manual and one
deterministic verifier at:

- `shared/references/engineering-principles.md`
- `shared/references/test-discipline.md`
- `shared/scripts/verify-engineering-manual.mjs`

The manual is a required, versioned bundle reference for implementation,
planning, and specification-writing workflows. The authoritative resources
shall not be copied by hand or embedded in generated host metadata. Generation
shall create authenticated byte-identical skill-local runtime copies so:

- all three workflows use the same local `shared/scripts/` and
  `shared/references/` paths without traversing another skill;
- symlink and copy installation, updates, native plugins, and every supported
operating system resolve the identical checksummed files.

Each workflow shall authenticate its own local copies before producing an
artifact. A bundle-required workflow shall also authenticate its declared
dependency chain from the same release. `spec-driven-development` shall not
require or invoke planning. No workflow shall fetch the shared resources from
the network, fall back to embedded rules, hand-copy or approximate them, or
continue with a partial quality contract.

### MAN-002: Senior-engineering quality standard

The manual shall define a context-sensitive senior-engineering quality bar.
Applicable repository instructions and approved product requirements outrank
generic principles. A workflow shall apply relevant principles and state a
material deviation or trade-off; it shall not add patterns or abstractions
merely to demonstrate compliance.

The manual shall explicitly cover:

- correctness, explicit contracts, invariants, and validated boundaries;
- simplicity and KISS;
- YAGNI and avoidance of speculative generalization;
- DRY for duplicated knowledge, without premature abstraction;
- SOLID where object-oriented responsibilities and dependencies make it
  applicable;
- separation of concerns, information hiding, and encapsulation;
- low coupling, high cohesion, and low cognitive complexity;
- composition over inheritance where it produces a clearer design;
- stable dependency direction and dependency inversion at real boundaries;
- meaningful names, small cohesive units, and bounded control flow;
- explicit ownership, lifecycle, cancellation, concurrency, and cleanup;
- safe failure, least privilege, privacy, and fail-closed security boundaries;
- compatibility, idempotency, retry behavior, and migration safety where
  externally observable;
- testability, behavior-focused verification, and deterministic tests;
- observability with bounded output and sensitive-data redaction;
- evidence-driven performance work rather than premature optimization;
- accessibility and platform conventions for user-facing interfaces;
- minimal scoped changes and review of the final diff.

The manual shall have distinct artifact contracts:

- a specification defines observable outcomes, interfaces, limits, failure and
  recovery behavior, security, compatibility, non-goals, and objective
  acceptance without inventing implementation structure;
- a plan maps an approved task to repository evidence, architectural units,
  dependency direction, verification, migration, and rollout or rollback
  concerns;
- an implementation preserves the approved contract, chooses the simplest
  adequate design, makes ownership and error behavior explicit, tests the
  changed boundary, and avoids unrelated work.

### TEST-001: Test-first verification discipline

Specification, planning, and incremental implementation shall use the one
authoritative `shared/references/test-discipline.md` reference. Generation shall
create byte-identical skill-local copies and the local verifier shall reject a
missing, invalid, or release-mismatched test-discipline copy before artifact
production.

The discipline shall require:

- acceptance criteria from which a test or discriminating executable check can
  be written before implementation;
- RED evidence that exercises the intended assertion rather than failing only
  because a symbol, import, or harness is unavailable;
- the smallest correct implementation to make the check pass;
- correction of the implementation while a correct check fails, without
  weakening an assertion or deleting a scenario to obtain green;
- a recorded PROVE mutation for new or changed absence/structure guarantees,
  post-hoc tests of changed behavior, and cases where RED did not establish
  that the intended assertion can fail; unchanged baseline constraints retain
  ordinary regression checks without mandatory extra mutations unless the
  affected boundary, approved requirements or repository rules require proof;
- focused checks during the slice and repository-proportional final
  verification;
- separation of durable behavior tests from temporary probes, with probe
  findings recorded and probe artifacts deleted.

### PLAN-001: Symbol-level architecture in planning mode

`planning-and-task-breakdown` shall transform the authorized specification into
a reviewable architecture before implementation. In host planning mode,
`incremental-implementation` validates that existing plan and reports material
changes rather than repeating full architectural design; production stays unchanged.

For every affected or proposed architectural unit, the plan shall identify:

- the file and package, module, or equivalent ownership boundary;
- whether the unit already exists or is proposed;
- each material class, struct, interface, function, method, command, schema,
  document section, configuration target, or language-equivalent unit;
- the unit's purpose and single responsibility;
- inputs, outputs, state, errors, invariants, and lifecycle where applicable;
- dependencies and the reason for their direction;
- the tests or other evidence that verify the unit's behavior.

The plan shall map those units back to the current task requirements and make
uncertainty explicit. It shall not invent object-oriented classes for a
functional, procedural, declarative, documentation, or configuration task.
When repository inspection disproves a proposed symbol or boundary, the plan
shall be revised before implementation. Planning mode shall not mutate
production artifacts.

### PLAN-002: Test-first packets and developer documentation

Every behavior packet shall order work as: define the test or executable check,
observe a relevant failure, implement against that check, correct the
implementation until correct checks pass, apply PROVE when required, then run
focused and repository-proportional verification. A packet with no derivable
test or discriminating check is incomplete.

Each packet shall name its prerequisite packet IDs and readiness evidence,
bounded allowed paths, exact requirement/contract selectors, and verification
working directories, prerequisites, inputs, commands or browser actions, and
expected results. It shall distinguish new checks from existing commands and
be executable without chat history or the whole specification. Product or
architectural choices left for the executor make the packet unready.

Every substantial plan shall record whether durable developer documentation is
warranted. It shall create a separate final documentation packet when at least
two of these apply: the behavior crosses three layers or processes, a rule is
expensive to rediscover, a constraint looks defective without explanation, an
operator can misconfigure it silently, or the work introduces new vocabulary.
The packet follows the consuming repository's documentation location, language,
and style, runs after implementation and end-to-end verification, and has an
objective reader-based acceptance check. When it is not warranted, the plan
shall state that decision and its evidence.

### PLAN-003: Adaptive profile planning

`planning-and-task-breakdown` shall run only on explicit request and shall
require both `spec.md` with `Status: Approved` and `manifest.yaml` with
`confirmed: true`. Missing, unresolved, or materially inconsistent inputs stop
planning without production mutation and direct the user to run or resume
`spec-driven-development`. Planning shall never infer confirmation or silently
downgrade scope.

Only after scope confirmation shall planning load profile-specific instructions.
Each active profile maps to one dedicated planning reference; load exactly that
set. Grouped references shall not import inactive-profile instructions into the
planning context.

Planning owns the reviewable planning artifacts declared by the specification
manifest. It shall create only warranted repository-local contracts and keep
each fact in one authoritative deterministic source:

- the `core` profile covers library, CLI, configuration, and other non-UI
  public interfaces, compatibility and versioning, deterministic behavior, and
  failure contracts; `core/contracts.yaml` is used when a separate contract is
  warranted;
- the `ui` profile follows UI-001: project-wide Penpot components and linked
  per-specification screens, with verified native snapshots and deterministic
  text contracts under root `design/`; tokens and derived previews are optional;
- backend, event, data, operations, and security profiles may use OpenAPI,
  AsyncAPI, the repository's protocol IDL, independent JSON Schema, stable
  problem types, data/state models, quality scenarios, the smallest useful C4
  views, and ADRs for consequential choices;
- cross-surface planning traces an initiating action through an operation or
  event and state change to its observable outcome and verification.

Rendered diagrams and screenshots are derived evidence, not the sole design
contract. Penpot is the editable visual source for UI-001; verified Git snapshots
and text contracts bind the implementation handoff. Confirmed project-root design
outputs are planning artifacts, not production UI code. Other product-owned
contract locations require an authorized implementation packet to promote or
synchronize the approved planning source.

Output scales with confirmed depth:

- `Lite` always creates `plan.md`, `todo.md`, current-only `handoff.md`, and one
  compact numbered implementation packet. It creates no separate profile
  artifact unless the confirmed manifest explicitly requires one.
- `Standard` adds only the listed profile contracts and enough architecture to
  explain affected ownership and runtime boundaries, splitting packets only
  where tests, dependencies, review, recovery, or documentation justify it.
- `Deep` adds only warranted contract schemas, quality scenarios,
  context/runtime/deployment views, ADRs, migration and rollback stages,
  security and observability work, and cross-surface verification.

If repository evidence exposes a new profile, higher depth, public contract,
migration, distributed boundary, irreversible effect, or critical
security/quality need, planning shall return that change to specification for
confirmation before continuing. Every behavior packet follows TEST-001 and
PLAN-002; planning never implements or executes a packet.

### UI-001: Shared Penpot design and specification screen sets

An active UI profile alone does not require design outputs. Specification
declares warranted design outputs in the confirmed manifest; without those
outputs, UI behavior and acceptance remain in `spec.md` and design planning is
skipped. A material design need discovered later requires resolving and
reconfirming artifact scope, not silently adding outputs or omitting necessary
visual requirements. The following design-artifact rules apply to declared work.

For declared UI design work, Penpot is the editing workspace and the project
keeps verified snapshots under root `design/`. One shared library is recorded in
`design/system/catalog.yaml` and exported as `design/system/library.penpot`.
Warranted tokens use `design/system/tokens.tokens.json`. Each specification owns
`design/specs/<slug>/experience.yaml` and `screens.penpot`; optional previews
are derived. Read only relevant components and the current screen set, expanding
to affected consumers when a shared change requires it.

Specification records behavior, component states, permitted overrides, shared
impact and acceptance, then declares exact outputs; it does not edit Penpot.
A separate explicit `design-planning` stage after the main plan uses installed
Penpot skills to build only needed main components and variants, then composes screens
from linked instances. It must verify actual target and component/library IDs,
not infer linkage from visual similarity. Native exports must preserve linked
libraries; YAML/JSON must parse, references resolve and hashes identify saved
bytes. Screens record the shared snapshot used for verification. Pending exports
or unavailable checks must never be described as verified.

Local output scope does not authorize arbitrary remote writes, library
publication, public sharing, installation or MCP configuration. Confirm bounded
remote targets when needed, preserve human edits and discuss shared changes
affecting other specifications. Token import replaces sets/themes and needs
explicitly scoped replacement with existing values preserved. Legacy UI artifacts
must not be relocated silently. Missing Penpot capabilities block dependent
design work, not independent behavioral interviewing; unknown design facts stay
unverified. Runtime interaction and accessibility still require implementation
checks. A native snapshot is not a claim of byte-identical repeat exports.

### PLAN-004: Separate design planning

`design-planning` is an explicit-only workflow after the main plan. It requires
the Approved specification, confirmed schema-valid manifest and existing plan,
checklist and handoff. Active UI with declared project-root design outputs needs
this stage, including a new UI with no existing designs. With no declared design
outputs, report not applicable before loading Penpot instructions or design
schemas. Legacy declarations require reconciliation, not automatic migration.

Main planning records affected requirements, output paths and acceptance checks,
then stops with design-dependent packets pending. It does not call design
planning or create its outputs. Independent packets may remain ready. Design
planning owns those outputs and updates only affected packet references,
checklist and current handoff after validation; it does not execute production
packets, launch independent code/security reviews or begin the next stage.

Keep the official Penpot skills separately installed and discover their actual
capabilities. Reuse an already selected skill or the upstream router, not a
duplicated routing catalog. Pass a bounded brief and preserve upstream
checkpoints. Missing skills, their references or MCP capabilities block dependent
work without auto-installation, remote fetching or a handwritten substitute.
Repository scope and artifact contracts remain ours; external operations do not
authorize new scope, other specification changes, implementation or publication.

### STATE-001: Four common YAML contracts

Root `shared/schemas/` owns Draft-7 structural schemas for `manifest.yaml`,
`decisions.yaml`, `design/system/catalog.yaml` and per-specification
`experience.yaml`. Generate matching skill-local copies; load only the schema
needed by the current stage. Keep API/event/data contracts in their profile
formats. Main specification/planning behavior must not preload inactive UI
schemas merely because the installed bundle contains them.

Validate saved YAML syntax and the matching schema without coercion or silent
field removal; then verify cross-file IDs, paths, transitions and evidence.
Unknown manifest/design fields belong in an explicit `extensions` mapping.
Preserve protocol-1 decision metadata compatibility and use the mandatory MCP
for all journal reads and validation. No local journal parser fallback is added.

A schema-valid digest or ID is not export evidence. Missing validators or
required checks keep affected state unverified. Existing journals and legacy
designs are not migrated automatically. The private maintenance package may
directly pin its already-used YAML and JSON Schema validators as development
dependencies; generated skills do not silently install these packages.

### EXEC-001: Bounded packet execution

`incremental-implementation` shall execute exactly one explicitly authorized
packet using current Approved requirements, confirmed manifest, task-scoped
contracts, and re-verified repository evidence. It shall load additional
recovery guidance only for failures, conflicts, stale inputs, or incomplete work.

Execution requires a usable Git worktree and inspection of tracked, staged and
untracked changes. A directory outside a Git worktree, a bare repository, or
unavailable Git change evidence blocks implementation and is recorded in the
handoff. The workflow shall not initialize Git or replace this prerequisite
with file snapshots. Neither an existing commit nor a clean tree is required.
Planning shall state this prerequisite without creating repository state.

The workflow shall distinguish implementation defects, objectively incorrect
checks, stale specification/planning inputs, and environment failures. It shall
correct implementation against correct checks, record any evidence-backed check
correction, and ask unresolved material choices. Changed product behavior or
architecture returns to its owning workflow without automatic invocation.
Failed or unavailable required checks leave the packet incomplete.

After checks pass, the workflow shall update only the current checklist item
and replace the handoff with exact changes, verification, limitations, and next
eligible packet. It shall stop without launching another packet or review.
Independent code/security review is optional and separately invoked. Review
and commit are not completion or next-invocation prerequisites. Each new packet
requires explicit execution authorization and its actual dependencies to pass;
commits and external actions retain separate authorization.

### EVAL-001: Empirical workflow regression loop

Workflow changes shall be assessed through isolated executable fixtures, fresh
author/planner/executor contexts, actual read and write traces, objective checks,
and separately invoked read-only reviews. Synthetic customer answers are test
data authoritative only within their fixture; they never authorize real-world
actions. Freeze detailed customer answers before trials and keep evaluator
snapshots outside application test discovery. Uncovered material questions
leave the trial incomplete rather than authorizing improvised answers.
A run using unrelated user history or a different skill source is
invalid and shall not be credited or published as behavioral evidence.

For the original workflow-loop qualification campaign, Codex trials use Sol authors/planners, Terra executors, and external Sol reviews
with Astra escalation for difficult or disputed cases. Claude trials use Opus
authors/planners/reviewers and Sonnet executors. Installed recommendations are
host-rendered advice only, not automatic model switches or invocation gates.

Completion of that original qualification target requires two unchanged full passes on the same frozen generated
source, plus two fresh Codex holdouts. Codex covers Lite core, Standard UI,
Standard backend/data/security, Standard UI/API, and Deep event/data/operations/
security fixtures; Claude covers Lite and UI/API. Adversarial cases cover absent
answers, stale contracts, incorrect checks, unavailable environments, incomplete
resumption, and transitions without review/commit. Any skill correction resets
stable-pass credit. These opt-in trials stay outside ordinary tests and CI;
consistency-checking synthetic traces never certifies actual model behavior.

Each separately authorized campaign shall record its agreed scope and completion
gates. A narrower regression corpus does not qualify an unexecuted part of the
original matrix, another model, or another host. The original target above is
not a mandatory matrix for every subsequent change and does not itself authorize
new model launches.

One-off scheduling, runner/platform/provider choices, temporary permissions,
private fixture controls, and historical packet handling are delivery context
in campaign plans, fixtures, evidence, and the preserved original decisions.
They shall not become universal dependencies or requirements of installed
skills. This classification does not revoke original restrictions, the recorded
native Claude deferral, or a campaign's budget-stop instruction, and grants no
new operational authority. Deferred checks remain unverified, not waived or
passed. Generation and validation of both host artifacts remain required even
when native trials for one host are deferred.
### QUAL-001: Fresh-context adversarial review

`doubt-driven-development` shall obtain its independent challenge from a fresh
host-native subagent. The reviewer receives only the smallest reviewable
artifact and its evaluation contract, not the parent agent's desired verdict,
prior conclusions, or suspected defects. The parent workflow shall reconcile
every returned finding against the artifact and remain read-only.

An external cross-model CLI is optional and shall not be required or invoked
without a separate explicit request. When the active host cannot provide a
fresh reviewer, the workflow shall report that limitation and stop rather than
present same-context self-review as independent evidence.

## Host And Platform Compatibility

### HOST-001: Agent hosts

The supported agent hosts are Codex and Claude Code. Shared workflow content
shall follow the common directory-based Agent Skills format with `SKILL.md` as
the entry point.

Host-only frontmatter or behavior shall not be added to the common source
unless both supported hosts accept it with the intended semantics.

### HOST-002: Supported surfaces

v1 shall support:

- local Codex CLI sessions;
- local Codex IDE sessions that load global personal skills;
- local Claude Code sessions;
- Codex and Claude native plugin marketplaces;
- hosted sessions that can install or enable the native plugin at user,
  account, or workspace scope without committing project skill files;
- organization-managed marketplace distribution.

A hosted workflow that requires a project-committed skill or project-local
plugin declaration is outside v1. Documentation shall distinguish local,
account, workspace, and organization scope.

### HOST-003: Desktop systems

Global installation documentation and acceptance shall cover Linux, macOS, and
Windows on the architectures supported by the selected Node.js and host-client
releases.

The project does not publish platform binaries. Platform support means that the
pinned upstream `skills` CLI can install the released collection globally for
current supported Codex and Claude Code without writing into the current
project.

### HOST-004: Version policy

Documentation shall record:

- the exact reviewed `skills` npm package version;
- its minimum Node.js version;
- the oldest verified Codex and Claude Code versions;
- the current stable client versions exercised in acceptance.

At specification time, the reviewed upstream baseline is:

- npm package: `skills@1.5.20`;
- Node.js: `22.20.0` or newer.

The implementation may advance the exact dependency only through a reviewed
change that re-runs the complete installation, privacy, and compatibility
suite. Normative commands and CI shall never float to an unreviewed `latest`.

Beyond one-time acceptance, maintenance shall continue compatibility testing as
new stable Codex and Claude Code versions become available. Each verification
shall use explicitly reviewed, pinned client versions and update the recorded
tested versions and results; a previous acceptance run shall not stand in for
ongoing current-stable qualification. This requirement prescribes no particular
schedule and does not permit normative commands or CI to float to an unreviewed
latest version.

## Portable Architecture

### ARCH-001: One portable template source

Each workflow shall have one authoritative source directory under `skills/`.
Shared instructions, references, templates, examples, assets, and deterministic
scripts shall not be copied into independently edited host trees. Portable text
may use only the declared `{{HOST_*}}` template variables required for a
host-specific value.

The repository renderer shall produce a separate Codex skill directory and a
separate Claude Code skill directory from that source. The Codex artifact shall
contain only Codex project-guidance names, question-tool names, and metadata;
the Claude Code artifact shall contain only the corresponding Claude Code
values. Unknown template variables and unsupported hosts shall fail closed.

The canonical source and renderer configuration shall remain the only
hand-edited workflow model. Every release-form skill directory, frontmatter,
sidecar, and host-specific substitution shall be generated, committed for
review, and never maintained as an independent Codex or Claude workflow.

### ARCH-002: Generated host artifacts

The repository shall generate and validate, from one canonical release model:

- a complete Codex plugin bundle with Codex-only rendered skill content;
- Codex marketplace metadata;
- a complete Claude Code plugin bundle with Claude-only rendered skill content;
- Claude marketplace metadata;
- the complete skill catalog and standalone/bundle-required classification;
- host adapters that cannot be represented portably.

Generated artifacts shall be committed for review. CI shall regenerate them
and fail on any diff, unknown template variable, cross-host tool name,
cross-host project-guidance name, or host-inapplicable metadata.

### ARCH-003: Source ownership

`prompt-mcp` is an initial content source only.
`engineer-agent-workflows` becomes authoritative after extraction.

Consuming projects use globally installed released skills or native plugins.
There is no bidirectional synchronization with `prompt-mcp` and no project
copying workflow.

## Invocation And Context Efficiency

### INV-001: Explicit-only activation

All workflows listed in SKILL-001 shall be user-invocable and shall reject model-initiated
activation through the supported host controls:

- generated Codex metadata shall set `policy.allow_implicit_invocation` to
  `false`;
- the generated release `SKILL.md` shall set Claude Code
  `disable-model-invocation: true` and keep `user-invocable: true`.

The policy shall apply equally to global personal installations and native
plugin bundles. Documentation shall show the verified explicit syntax for
global and namespaced plugin skills, including `$<skill-name>` for Codex and
`/<skill-name>` for Claude Code where those are the current host forms.

A workflow may recommend a related workflow but shall not load or invoke it on
the user's behalf. The user must explicitly invoke each workflow that runs.

### INV-002: Host capability floor

The oldest supported Codex and Claude Code versions shall be versions that
honor the explicit-only controls in INV-001 on every supported surface. If a
surface cannot enforce the control, that surface is unsupported until the
host provides an equivalent verified mechanism; generation shall not silently
omit or weaken the policy.

### TOK-001: Discovery budget

Explicit-only activation does not remove discovery metadata from initial host
context. The complete installed collection shall fit the unmodified native
default skill-list budget of both supported clients without omitting a skill,
shortening a description, or producing a budget warning.

Acceptance shall record the complete discovery listing and host-reported
context cost for exact client versions. Tests and documentation shall not
raise a user's discovery budget to make the collection pass.

### TOK-002: Runtime progressive disclosure

Before explicit invocation, hosts may expose only their standard bounded
discovery metadata for this collection. Explicit invocation may load the
selected `SKILL.md`; an optional reference, asset, or script may be loaded only
when the selected workflow reaches its documented routing condition.

Unselected skill bodies and unrelated references shall not be preloaded by
generated metadata, plugin hooks, `AGENTS.md`, `CLAUDE.md`, or another
workflow. Once loaded, instructions shall avoid duplicated background,
unbounded command output, and repeated reads of unchanged references.

## Established Distribution Tool

### TOOL-001: Normative tool

The normative global lifecycle tool is the MIT-licensed Vercel `skills` CLI,
invoked through an exact pinned `npx` package version.

The project shall not:

- publish an `engineer-agent-workflows` executable;
- wrap the upstream CLI in a second installer;
- redefine upstream flags or state layout;
- depend on experimental upstream commands for stable behavior;
- patch user installations outside the upstream tool's documented global
  operation.

The pinned tool version and npm integrity identity shall be recorded in
release metadata and dependency-review evidence.

### TOOL-002: Global lifecycle contract

The supported stable upstream operations shall be used as follows:

- `add` installs or replaces one host-specific global artifact;
- `list`/`ls` inspects one agent's global installation;
- `remove` removes selected global installations;
- `update` shall not be used for this collection because the pinned parser has
  no `--agent` option and cannot preserve two different artifacts with the
  same skill identity.

Every normative add or replacement command shall include:

- `-g`/`--global`;
- exactly one explicit `codex` or `claude-code` agent target;
- the matching host-specific bundle source;
- `--copy`, so one host cannot resolve through the other host's canonical
  global instance;
- an explicit individual standalone skill or `'*'` complete bundle selection;
- the exact reviewed `skills@<version>` package.

Documentation shall not present project-scope examples, `skills init` in
consuming projects, one add command targeting both agents, or an unqualified
`skills update`. Updating means repeating the matching host-specific
`add --copy` command for Codex and Claude Code independently.

Representative POSIX complete-bundle installation or replacement:

```bash
DISABLE_TELEMETRY=1 npx --yes skills@1.5.20 add \
  <codex-bundle-source> \
  --global --agent codex --skill '*' --copy --yes

DISABLE_TELEMETRY=1 npx --yes skills@1.5.20 add \
  <claude-code-bundle-source> \
  --global --agent claude-code --skill '*' --copy --yes
```

Representative POSIX standalone-skill installation or replacement uses the
same two commands with `--skill code-review-and-quality`.

PowerShell documentation shall provide equivalent environment-variable and
argument syntax. The project promises no managed rollback in v1 because the
selected stable upstream CLI exposes no stable rollback operation.
Experimental lock restore is not part of the public contract.

### TOOL-003: Upstream telemetry

The upstream tool documents install telemetry and a
`DISABLE_TELEMETRY` opt-out. This project shall:

- set `DISABLE_TELEMETRY=1` in every normative command and CI invocation;
- disclose upstream telemetry behavior and the opt-out;
- avoid passing custom telemetry metadata;
- collect no installation or usage telemetry of its own.

Because the project does not control third-party invocation, it cannot prevent
a user from deliberately running the upstream tool without the opt-out.

## Global And Plugin Distribution

### DIST-001: Hybrid distribution

The repository shall support:

1. global personal installation of separate rendered Codex and Claude Code
   artifacts through the pinned `npx skills` workflow;
2. separate native complete-bundle Codex and Claude Code plugins for
   marketplace, hosted, and managed distribution.

Both host artifacts shall derive from the same canonical workflow sources and
signed release, while containing only values applicable to their target host.

### DIST-002: Global-only lifecycle scope

Global personal installation paths and copied storage are owned by the selected
upstream tool. The project shall not introduce a second state store or mutate
those paths directly. All documented add, repeat-add, list, and remove commands
shall select global scope. Automated acceptance shall prove the current project
directory remains byte-for-byte unchanged.

### DIST-003: Duplicate activation

Documentation shall warn against activating the same workflow through both global
personal skills and a native plugin in the same host. Global skills are the
recommended local personal mode. Native plugins are the recommended hosted,
marketplace, and managed mode. The repository cannot enforce host activation
state without custom lifecycle code, so duplicate detection is a documented
host-inspection and acceptance concern rather than a project-owned mutation.


Before enabling a distribution mode, the documented procedure shall inspect the
active host for an already enabled copy of the same workflow in the other mode,
including copies from different release versions.
If duplicate activation would result, the procedure shall refuse the new
activation unless the user explicitly authorizes an override. Missing or
unavailable host-state evidence shall not be treated as proof that no duplicate
exists. This is a documented operator/agent gate, not a claim that the upstream
installer enforces it or a requirement for a project-specific lifecycle CLI.
### DIST-004: Global selection

Standalone skills may be selected individually through upstream `--skill`.
The complete collection uses `--skill '*'` in one command per host-specific
source and agent. An unknown skill name is handled by the upstream tool. The
repository shall test and document the pinned version's resulting behavior
rather than claiming a custom error contract.

### DIST-005: Dependency presentation

The canonical catalog shall expose standalone versus bundle-required status.
README examples shall not present unsupported individual installation of a
bundle-required workflow. The project shall not add a custom dependency
resolver. The two host-specific complete-bundle commands are the supported
installation path for bundle-required workflows.

### DIST-006: Native plugin bundles

The Codex marketplace shall expose one Codex-rendered
`engineer-agent-workflows` plugin containing all skills listed in SKILL-001. The Claude
marketplace shall expose a separate Claude-rendered plugin with the same skill
identities. Neither bundle shall contain the other host's manifest, question
tool, project-guidance filename, or Codex-only sidecar. Native marketplaces do
not offer per-skill plugin installation in v1. Plugin marketplace versions
shall match the signed repository release.

### DIST-007: Marketplace scope

The public GitHub repository shall be installable through Git-backed Codex and
Claude marketplace mechanisms without copying skills into a consuming project.
Marketplace sources shall resolve immutable released host-specific content.
Vendor-operated public directory submission is deferred and requires a separate
decision.

## Host-Native User Questions

### INT-001: Host-native user questions

Specification, planning, idea refinement, and requirements interview workflows
shall use the active host's callable standard user-question tool:
`request_user_input` in Codex and `AskUserQuestion` in Claude Code. They shall
follow the exposed schema and limits and shall not enter plan mode solely to
make the question tool available. Explicit non-sensitive answers shall be
checkpointed immediately in the workflow's authorized durable artifact.

`interview-me` shall ask one material question at a time with the agent's
current guess, because each answer shapes the next question. A missing,
dismissed, cancelled, timed-out, invalid, or failed interaction is not an
answer. If the standard tool is unavailable, the workflow may ask the exact
saved question directly in the conversation and must stop if the missing answer
blocks a sound artifact.

The specification workflow shall use the question tool only for unresolved
material decisions, including the single adaptive-scope confirmation required
by SPEC-001. After those decisions are resolved, the manifest is confirmed, and
its final gap review passes, it shall write `spec.md` with `Status: Approved`
without a separate approval question or `approval.spec` decision. The current
`spec.md` is user-editable authoritative state: later invocations shall
preserve direct user edits and reconcile material differences into versioned
decisions and, when scope changes, a reconfirmed manifest. `Approved` does not
authorize planning or implementation.

### MCP-001: Retired Prompt MCP integration

No collection workflow shall require or invoke Prompt MCP. The name may remain
only in historical source provenance, migration notes, and the explicit
non-goal that this project does not install or configure it. This requirement
supersedes the earlier dedicated-interview integration contract.

### MCP-002: Mandatory bounded decision-journal access

The approved [Decision Ledger MCP specification](../decision-ledger-mcp/spec.md)
owns the separate local read-only TypeScript/npm artifact and its contract.
It supports many projects and many specifications per project. Every call
receives the absolute project path from active task context; journal calls
also identify a specification. No maintained project allowlist, client roots
dependency or disk-wide project discovery is required. Fixed journal-path
validation does not make the service a project authorization sandbox: process
permissions bound access.

Specification, planning and incremental implementation shall use its callable
MCP interface for journal discovery, validation, bounded search and exact
record retrieval. Missing, unreachable or incompatible MCP stops journal work;
shell queries, local-command readers and full-file reads are not fallbacks.
Ordinary authorized YAML edits remain possible, followed by MCP read-back
before consuming or handing off journal state. Other YAML retains its real
parser requirement. No Prompt MCP, automatic installation, client registration
or publication is introduced. This package is separate from both generated
host bundles and does not add a sixteenth workflow.

## Security And Privacy

### SEC-001: No project mutation

Normative commands shall never use the upstream tool's default project scope.
Tests shall fail if installation, update, removal, validation, or plugin
packaging creates or changes:

- `.agents/skills` in a consuming repository;
- `.claude/skills` in a consuming repository;
- a project skill lock or project installation manifest;
- any unrelated project file.

No script in this repository shall recursively search development roots for
skill copies.

### SEC-002: Release integrity

Stable releases require:

- a human-created signed SemVer Git tag;
- a documented maintainer trust anchor;
- an immutable source commit;
- SHA-256 checksums for published source archives and generated distribution
  artifacts;
- matching versions across tag, changelog, catalog, plugin manifests, and
  marketplaces.

The project does not claim that upstream `npx` itself verifies the project's
Git tag signature. Documentation shall separate npm package integrity, Git
source identity, and project release-signature verification.


Before using downloaded CLI binaries, skill archives, or other release artifacts,
the documented installation/update procedure shall successfully authenticate the
release tag against the documented maintainer trust anchor and verify the
published artifact checksums. Failed or unavailable verification shall stop use
of the downloaded artifacts; upstream npm integrity alone does not satisfy this
gate.
### SEC-003: Supply chain and secrets

- Pin the normative `skills` npm package to an exact reviewed version.
- Record its npm integrity identity in dependency-review evidence.
- Disable upstream telemetry in normative commands and CI.
- Keep GitHub Actions permissions least-privilege.
- Pin third-party actions to immutable full commit identities.
- Grant release write permission only to the release job.
- Do not store or emit credentials, private keys, personal paths, skill answer
  data, environment dumps, or unrelated project content.
- Do not execute downloaded lifecycle scripts or enable plugin hooks merely
  because a marketplace was discovered.

## Versioning And Publication

### REL-001: Semantic Versioning

The entire collection uses one SemVer:

- MAJOR: removed or renamed skill, incompatible workflow contract, weaker
  safety guarantee, or incompatible plugin/catalog schema;
- MINOR: new skill, backward-compatible workflow capability, additive adapter,
  or intentional explicit-invocation or availability-policy change;
- PATCH: compatible defect, validation, documentation, or wording correction.

v1 has one stable channel. Every release updates `CHANGELOG.md` and generated
host metadata to the same version.

### REL-002: Release gate

A maintainer explicitly creates the signed release tag. Before publication,
GitHub Actions shall cryptographically verify that tag against the documented
maintainer trust anchor in SEC-002. Missing, invalid, or unverifiable signatures
shall block publication. GitHub Actions also verifies
the repository state, validates all skills and host metadata, tests the pinned
global lifecycle commands, creates source/distribution archives and checksums,
and publishes the GitHub Release.

CI shall never invent or silently advance the version. Publishing remains a
separately authorized external action.

### REL-003: Repository and license

The canonical source and release host is a public GitHub repository. The
project is licensed under the MIT License, covering skill content, references,
scripts, generated metadata, tests, and documentation.

No separate clean-room or provenance workflow is required for adapting the
initial source skills.

## Documentation

### DOC-001: Required guidance

README and reference documentation shall cover:

- the complete skill inventory and standalone/bundle-required classification;
- explicit-only invocation syntax, the absence of automatic activation, and
  the unavoidable bounded discovery-metadata cost;
- the 240-code-point description and 4,096-byte `SKILL.md` limits plus the
  progressive-disclosure reference policy;
- the engineering manual, its principles and artifact-specific contracts, the
  exact bundle-required skills, and missing-manual behavior;
- symbol-level planning-mode output with language-appropriate architectural
  units and their purposes;
- global Codex and Claude installation with exact pinned `npx` commands;
- Node.js and client-version prerequisites;
- POSIX shell and PowerShell telemetry opt-out syntax;
- global list, host-specific repeat-add replacement, and global remove examples;
- the absence of managed rollback;
- the prohibition on project-scope installation and project mutation;
- native plugin and marketplace installation;
- global-versus-plugin duplicate activation;
- hosted and organization scope limitations;
- host-native questions for specification, planning, idea refinement, and
  requirements interviews, including conversational fallback behavior;
- automatic `Status: Approved` specification finalization, authoritative direct
  user edits, and the separate planning/implementation authorization boundary;
- adaptive `Lite`/`Standard`/`Deep` scope, composable profiles, versioned
  decision history, deterministic current manifest, and reconfirmation rules;
- the Approved-specification and confirmed-manifest planning preconditions,
  profile-artifact ownership, and depth-scaled output;
- test-first packet sequencing, PROVE conditions, and conditional developer
  documentation decisions;
- signed release and checksum verification;
- troubleshooting for discovery, client compatibility, permissions, symlinks,
  updates, removal, plugin namespaces, and telemetry.

Documentation shall distinguish verified behavior from upstream assumptions
and future work.

## Acceptance Criteria

### ACC-001: Skill validation

- All skills listed in SKILL-001 have unique stable names and valid portable template sources.
- Every required reference, asset, or script is included in the skill or the
  skill is marked bundle-required.
- Generation produces isolated Codex and Claude Code artifacts without diff.
- Every declared host variable resolves; unknown variables and hosts fail.
- No generated host artifact contains the other host's question-tool name,
  project-guidance filename, manifest, or host-only metadata.
- Source-project-specific wording appears only where intentionally documented.
- Explicit-invocation, incomplete-input, out-of-scope, and safety fixtures pass
  for every skill.
- Specification fixtures prove evidence-first depth/profile proposal,
  confirmation, deterministic `manifest.yaml`, durable decision history,
  automatic approval, and no planning-artifact creation.
- The canonical engineering manual exists exactly once in authored source and
  its checksum is represented consistently in catalog and release metadata.

### ACC-002: Upstream tool validation

Using the exact pinned `skills` package with `DISABLE_TELEMETRY=1`, isolated
tests shall prove:

- each host-specific repository is discovered as an Agent Skills source;
- all skills can be listed without installation for each host;
- one standalone skill installs globally into Codex and Claude Code from the
  corresponding source through separate `add --copy` commands;
- the complete collection installs globally through the two corresponding
  host-specific `add --copy` commands;
- each target receives its rendered artifact and never resolves through the
  other target's canonical skill instance;
- documentation offers individual installation only for standalone workflows;
- an upstream-allowed individual installation of a bundle-required workflow
  stops on invocation and directs the user to the matching complete-bundle
  command;
- global list reports installed workflows per agent;
- repeating each host-specific `add --copy` command replaces the selected
  artifact without project writes;
- global removal removes selected installations;
- project scope is never selected by normative commands;
- no custom executable or project-owned lifecycle state is required.

### ACC-003: Filesystem isolation

Tests run with isolated temporary user profiles on Linux, macOS, and Windows.
They record the consuming project before and after every lifecycle operation
and prove it is unchanged.

Real Codex, Claude, Prompt MCP, npm, Git, and user-home state shall not be
modified by automated tests.

### ACC-004: Cross-host validation

- Current stable Codex discovers the installed Codex-rendered global skill.
- Current stable Claude Code discovers the installed Claude-rendered global
  skill.
- Explicit invocation works and matching unqualified prompts do not activate
  any collection workflow.
- The complete Codex native plugin validates with current Codex tooling.
- The complete Claude native plugin validates with `claude plugin validate`.
- Plugin namespaces and enable/disable behavior match documentation.
- Codex `request_user_input` and Claude Code `AskUserQuestion` can collect
  specification, planning, idea-refinement, and requirements-interview
  decisions in the current interaction mode without entering plan mode solely
  to ask a question.

### ACC-005: Release validation

Before a stable release:

- all static, unit, fixture, and isolated global-install tests pass;
- versions agree across the signed tag, changelog, catalog, plugins, and
  marketplaces;
- source and generated artifact checksums verify;
- the pinned npm dependency and integrity identity match the reviewed lock;
- both Git marketplaces install the complete bundle from immutable release
  content;
- the release contains no custom lifecycle executable.

### ACC-006: Manual gates

Before v1.0.0, separately authorized manual acceptance shall verify:

- local Codex CLI and IDE discovery;
- local Claude Code discovery;
- global installation on Linux, macOS, and Windows;
- Codex and Claude native marketplace installation;
- one supported hosted/account installation per host;
- one organization-managed marketplace configuration per host;
- no consuming project receives a new or changed skill file.

Public vendor-directory submission and managed rollback are not part of this
gate.

### ACC-007: Context-efficiency validation

- Every discovery description is at most 240 Unicode code points.
- Every complete `SKILL.md`, including frontmatter, is at most 4,096 UTF-8
  bytes.
- The complete collection fits the unmodified default discovery budget of the
  exact supported Codex and Claude Code versions without skill omission,
  description truncation, or a budget warning.
- Host diagnostics record the discovery-context cost; Claude Code acceptance
  includes its native context/doctor reporting, and Codex acceptance records
  its native skill discovery result.
- Temporary instrumented fixtures prove that explicit invocation loads the
  selected body and that unrelated skill-body and reference sentinels are not
  loaded before their routing conditions.
- Each refined skill passes outcome-equivalence and safety fixtures derived
  from its source workflow while containing no unintended source-project
  assumptions.

### ACC-008: Engineering-manual validation

- The released manual contains every principle and all three artifact
  contracts from MAN-002.
- Planning, implementation, and specification resolve byte-identical generated
  local copies from the one authored `shared/` source under symlink, copy,
  plugin, update, Linux, macOS, and Windows fixtures.
- Each local verifier authenticates its caller copy. Bundle-required workflows
  also authenticate their declared dependency chain without requiring the
  agent to read another skill's shared resources.
- Missing, mismatched, or mixed-version manuals stop dependent workflows before
  artifact production with the documented complete-bundle instruction.
- Repository-specific rules override generic defaults in conflict fixtures,
  and the workflow records material trade-offs without mechanically applying
  inapplicable SOLID patterns or speculative abstractions.
- Specification fixtures remain behavioral, planning fixtures expose design
  units and dependency direction, and implementation fixtures demonstrate
  scoped, maintainable, tested changes against the approved contract.
- The same generated local test-discipline reference and its digest pass direct,
  copy, symlink, native-plugin, path-form, tamper, and mixed-release cases.

### ACC-009: Planning-detail validation

- Object-oriented, functional or procedural, and documentation or
  configuration fixtures each produce language-appropriate architectural
  units rather than forcing classes.
- Every material unit is marked existing or proposed and includes its file or
  ownership boundary, purpose, inputs and outputs, state or lifecycle when
  applicable, errors or invariants, dependency direction, and verification.
- The plan covers the complete current authorized task, maps units to its
  requirements, distinguishes uncertainty from fact, and is revised when
  repository evidence invalidates a proposed boundary.
- Planning-mode fixtures prove no production artifact is mutated before the
  architecture is available for user review.
- Planning fixtures reject a missing or unconfirmed manifest, cover all three
  depths and composable core/UI/backend profiles, and create only manifest-listed
  repository-local contracts. Lite produces exactly one compact packet plus
  `plan.md`, `todo.md`, and current-only `handoff.md`.
- Every behavior packet maps criteria to tests or discriminating checks before
  implementation, requires correction of implementation rather than weakening
  correct checks, and records required PROVE evidence.
- Documentation fixtures exercise both sides of the conditional decision,
  preserve repository-selected language, and place warranted documentation
  after implementation and end-to-end verification.

### ACC-010: Fresh-reviewer validation

- Doubt-driven fixtures invoke a fresh-context host-native subagent with only
  the artifact and contract, reconcile its findings, remain read-only, and do
  not require an external CLI.
- Unavailable-reviewer fixtures stop with an explicit limitation and never
  label same-context analysis as independent review.

## Draft Review Notes

This revision intentionally replaces the earlier custom-Go-CLI and
project-migration model. It assumes:

- `skills@1.5.20` remains the reviewed baseline until implementation verifies
  or explicitly updates it;
- normative commands disable upstream telemetry;
- every collection workflow is explicit-only while its bounded discovery
  metadata remains visible to the hosts;
- lifecycle semantics not provided by the stable upstream tool, especially
  managed rollback and dependency resolution, are not recreated locally.
