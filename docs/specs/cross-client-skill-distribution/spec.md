# Cross-Client Engineering Skill Distribution

Status: Approved

Date: 2026-07-25

## Summary

`engineer-agent-workflows` will be the public, authoritative repository for a
SemVer collection of reusable engineering Agent Skills. The same portable
workflow sources will support Codex and Claude Code as global personal skills
and as complete native plugin bundles.

The project will not create a lifecycle executable, installer, wrapper, or
local state format. Global installation, listing, explicit update, and removal
will use the established open-source `skills` CLI through an exact pinned
`npx` package version. Every normative operation will use global scope and
explicit Codex or Claude targets. The project will never inspect, create,
modify, migrate, remove, or restore skills inside consuming projects.

The initial release will generalize all 15 workflows currently stored in the
`prompt-mcp` repository. After extraction, this repository becomes their
source of truth. Every workflow will require explicit user invocation. The
collection will use progressive disclosure so discovery metadata remains
small and only the selected workflow's bounded instructions are loaded.

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
4. `documentation-and-adrs`
5. `doubt-driven-development`
6. `idea-refine`
7. `incremental-implementation`
8. `interview-me`
9. `performance-optimization`
10. `planning-and-task-breakdown`
11. `project-docs-maintainer`
12. `project-pull-request`
13. `project-release`
14. `security-and-hardening`
15. `spec-driven-development`

Every skill shall retain a focused user goal, explicit invocation contract,
workflow boundary, non-goals, safety constraints, stopping condition, and
verification expectations. Prompt-MCP-specific source-project details shall be
removed unless a workflow intentionally integrates with Prompt MCP.

### SKILL-002: Repository adaptation

Global workflows shall obtain project facts at invocation time rather than
embedding one source repository's language, framework, commands, directories,
or release process.

- In Codex, read applicable `AGENTS.md` instructions.
- In Claude Code, read applicable `CLAUDE.md` instructions.
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

The initial classification is:

- `planning-and-task-breakdown` is standalone and owns the shared engineering
  manual described by MAN-001;
- `incremental-implementation` and `spec-driven-development` are
  bundle-required because they consume that sibling manual;
- the other 12 initial workflows are standalone and shall contain all their
  required references, assets, and scripts.

### SKILL-005: Refinement contract

The initial extraction is a semantic refinement, not a textual copy. Each of
the 15 source skills shall be reviewed independently and shall:

- remove `prompt-mcp` language, Go/GTK assumptions, fixed directories, and
  source-project commands except where the workflow intentionally integrates
  with Prompt MCP;
- preserve the workflow's user outcome, safety boundary, explicit
  authorization gates, stopping condition, and verification obligations;
- discover applicable project instructions, interfaces, tooling, and tests at
  invocation time;
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

## Engineering Manual And Planning Detail

### MAN-001: Canonical engineering manual

The collection shall maintain one authoritative engineering manual at:

`skills/planning-and-task-breakdown/references/engineering-principles.md`

The manual is a required, versioned bundle reference for implementation,
planning, and specification-writing workflows. It shall not be copied into
another skill or embedded in generated host metadata. The release layout shall
preserve a stable sibling-relative path so:

- `planning-and-task-breakdown` reads its contained reference;
- `incremental-implementation` and `spec-driven-development` read the same
  installed sibling reference;
- symlink and copy installation, updates, native plugins, and every supported
  operating system resolve the identical checksummed file.

The two dependent workflows shall detect a missing or mismatched manual before
producing their artifact and stop with a fixed instruction to install the
complete matching bundle. They shall not fetch the manual from the network,
fall back to embedded rules, invoke the planning workflow, or continue with a
partial quality contract.

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

### PLAN-001: Symbol-level architecture in planning mode

`planning-and-task-breakdown`, and `incremental-implementation` whenever the
active host is in planning mode, shall transform the current authorized task
description into a reviewable architecture before implementation.

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

## Portable Architecture

### ARCH-001: One portable source

Each workflow shall have one authoritative source directory. Common
instructions, references, templates, examples, assets, and deterministic
scripts shall not be copied into independently edited host trees.

The selected `skills` CLI links or copies the same release skill directory to
each selected agent and performs no project-owned host transformation.
Accordingly, each generated release directory shall combine one common
instruction body with coexistable host metadata: Claude-only frontmatter in
`SKILL.md` and Codex-only `agents/openai.yaml` sidecars where necessary.
Acceptance shall prove each host honors its own controls and safely ignores
the other host's metadata.

The canonical source model shall remain the only hand-edited workflow. Any
release-form frontmatter or sidecar derived from it is generated, committed
for review, and never maintained as an independent Codex or Claude workflow.

### ARCH-002: Generated host metadata

The repository shall generate and validate, from one canonical release model:

- Codex plugin metadata;
- Codex marketplace metadata;
- Claude plugin metadata;
- Claude marketplace metadata;
- release skill directories containing the common workflow and coexistable
  explicit-invocation metadata for both hosts;
- the complete skill catalog and standalone/bundle-required classification;
- host adapters that cannot be represented portably.

Generated artifacts shall be committed for review. CI shall regenerate them
and fail on any diff.

### ARCH-003: Source ownership

`prompt-mcp` is an initial content source only.
`engineer-agent-workflows` becomes authoritative after extraction.

Consuming projects use globally installed released skills or native plugins.
There is no bidirectional synchronization with `prompt-mcp` and no project
copying workflow.

## Invocation And Context Efficiency

### INV-001: Explicit-only activation

All 15 workflows shall be user-invocable and shall reject model-initiated
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

The supported lifecycle operations are the stable upstream operations:

- `add` for global installation;
- `list`/`ls` for global inspection;
- `update` for explicit global updates;
- `remove` for global removal.

Normative installation shall always include:

- `-g`/`--global`;
- explicit `codex` and/or `claude-code` agent targets;
- an explicit individual skill selection or `'*'` for the complete bundle;
- the exact reviewed `skills@<version>` package.

Normative update and removal shall always use global scope. Documentation shall
not present project-scope examples, `skills init` in consuming projects, or an
unqualified update whose scope depends on the current working directory.

Representative POSIX complete-bundle installation:

```bash
DISABLE_TELEMETRY=1 npx --yes skills@1.5.20 add \
  <owner>/engineer-agent-workflows \
  --global \
  --agent codex \
  --agent claude-code \
  --skill '*' \
  --yes
```

Representative POSIX standalone-skill installation:

```bash
DISABLE_TELEMETRY=1 npx --yes skills@1.5.20 add \
  <owner>/engineer-agent-workflows \
  --global \
  --agent codex \
  --agent claude-code \
  --skill code-review-and-quality \
  --yes
```

PowerShell documentation shall provide equivalent environment-variable and
argument syntax.

The project promises no managed rollback in v1 because the selected stable
upstream CLI exposes no stable rollback operation. Experimental lock restore is
not part of the public contract.

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

1. global personal installation through the pinned `npx skills` workflow; and
2. native complete-bundle Codex and Claude plugins for marketplace, hosted,
   and managed distribution.

Both modes shall contain workflow content from the same signed release.

### DIST-002: Global-only lifecycle scope

Global personal installation paths and canonical symlink/copy storage are
owned by the selected upstream tool. This project shall not introduce a second
state store or mutate those paths directly.

All documented add, list, update, and remove commands shall select global
scope. Automated acceptance shall prove the current project directory remains
byte-for-byte unchanged.

### DIST-003: Duplicate activation

Documentation shall warn against activating the same release both as global
personal skills and as a native plugin in the same host.

Global skills are the recommended local personal mode. Native plugins are the
recommended hosted, marketplace, and managed mode. The repository cannot
enforce host activation state without custom lifecycle code, so duplicate
detection is a documented host inspection and acceptance concern rather than
a project-owned mutation.

### DIST-004: Global selection

Standalone skills may be selected individually through the upstream
`--skill` option. The complete collection uses `--skill '*'` with explicit
Codex and Claude targets.

An unknown skill name is handled by the upstream tool. The repository shall
test and document the resulting behavior for the pinned version rather than
claiming a custom error contract.

### DIST-005: Dependency presentation

The canonical catalog shall expose standalone versus bundle-required status.
README examples shall not present unsupported individual installation for a
bundle-required workflow.

The project shall not add a custom dependency resolver. The complete-bundle
command is the supported installation path for bundle-required workflows.

### DIST-006: Native plugin bundle

Codex and Claude marketplace definitions shall each expose one
`engineer-agent-workflows` plugin containing all 15 skills. Native
marketplaces do not offer per-skill plugin installation in v1.

Plugin and marketplace versions shall match the signed repository release.
Invocation namespaces and host enable/disable behavior shall be documented
with current verified examples.

### DIST-007: Marketplace scope

The public GitHub repository shall be installable through Git-backed Codex and
Claude marketplace mechanisms without copying skills into a consuming
project.

Marketplace sources shall resolve immutable released content. Vendor-operated
public directory submission is deferred and requires a separate decision.

## Prompt MCP

### MCP-001: Interview workflows

Interview-driven skills shall use the globally configured Prompt MCP when its
required tools are callable. They shall follow the exposed schemas and shall
not hard-code generated tool namespaces.

Committed answers shall be checkpointed in the repository-owned specification
ledger. Cancellation, timeout, unavailability, conflict, invalid input, and
failure are not answers.

The current Prompt MCP Linux/GTK limitation is accepted for the owner's v1
usage. Cross-platform Prompt MCP delivery and fallback UI are outside this
project. The skills bundle does not install or configure Prompt MCP.

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

A maintainer explicitly creates the signed release tag. GitHub Actions verifies
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
- global list, explicit update, and global remove examples;
- the absence of managed rollback;
- the prohibition on project-scope installation and project mutation;
- native plugin and marketplace installation;
- global-versus-plugin duplicate activation;
- hosted and organization scope limitations;
- Prompt MCP's v1 limitation;
- signed release and checksum verification;
- troubleshooting for discovery, client compatibility, permissions, symlinks,
  updates, removal, plugin namespaces, and telemetry.

Documentation shall distinguish verified behavior from upstream assumptions
and future work.

## Acceptance Criteria

### ACC-001: Skill validation

- All 15 skills have unique stable names and valid portable frontmatter.
- Every required reference, asset, and script is included in the skill or the
  skill is marked bundle-required.
- Generated Codex and Claude metadata reproduces without a diff.
- Source-project-specific wording appears only where intentionally documented.
- Explicit-invocation, incomplete-input, out-of-scope, and safety fixtures pass
  for every skill.
- The canonical engineering manual exists exactly once in authored source and
  its checksum is represented consistently in catalog and release metadata.

### ACC-002: Upstream tool validation

Using the exact pinned `skills` package and `DISABLE_TELEMETRY=1`, isolated
tests shall prove:

- the repository is discovered as an Agent Skills source;
- all skills can be listed without installation;
- one standalone skill installs globally for Codex and Claude;
- the complete collection installs globally for Codex and Claude;
- both targets receive the same canonical release directory without a
  project-owned per-agent transformation;
- documentation offers individual installation only for standalone workflows;
- an upstream-allowed individual installation of a bundle-required workflow
  stops on invocation and directs the user to the complete-bundle command;
- global list reports the installed workflows;
- explicit global update succeeds without project writes;
- global removal removes the selected installation;
- project scope is never selected by normative commands;
- no custom executable or project-owned lifecycle state is required.

### ACC-003: Filesystem isolation

Tests run with isolated temporary user profiles on Linux, macOS, and Windows.
They record the consuming project before and after every lifecycle operation
and prove it is unchanged.

Real Codex, Claude, Prompt MCP, npm, Git, and user-home state shall not be
modified by automated tests.

### ACC-004: Cross-host validation

- Current stable Codex discovers an installed global skill.
- Current stable Claude Code discovers the same released global skill.
- Explicit invocation works and matching unqualified prompts do not activate
  any collection workflow.
- The complete native plugin validates with current Codex tooling.
- The complete native plugin validates with `claude plugin validate`.
- Plugin namespaces and enable/disable behavior match documentation.

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
- The planning workflow resolves its contained manual, while the implementation
  and specification workflows resolve the byte-identical sibling file under
  symlink, copy, plugin, update, Linux, macOS, and Windows fixtures.
- Missing, mismatched, or mixed-version manuals stop dependent workflows before
  artifact production with the documented complete-bundle instruction.
- Repository-specific rules override generic defaults in conflict fixtures,
  and the workflow records material trade-offs without mechanically applying
  inapplicable SOLID patterns or speculative abstractions.
- Specification fixtures remain behavioral, planning fixtures expose design
  units and dependency direction, and implementation fixtures demonstrate
  scoped, maintainable, tested changes against the approved contract.

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
