# AGENTS.md

Operating manual for AI coding agents working in this repository.

## Project Index

Read the referenced map once when starting project work if its content is not
already in context. Existing CodeGraph and context-delegation rules apply.

@docs/index.md

## About The Project

`engineer-agent-workflows` is the source of truth for reusable engineering
skills for Codex, Claude Code and DeepSeek Harness. The project
keeps one portable, template-based Agent Skills core and generates isolated
host-specific packaging, metadata, and skill artifacts.

The project is specification-first. Until the initial specification is
approved, do not implement skills, plugins, release automation, or global
configuration changes.

## Golden Rules

1. Repository code, documentation, identifiers, skill content, and commit
   messages are written in English.
2. Preserve one authoritative template source for each workflow. Do not
   maintain separate hand-edited host versions.
3. Generate separate Codex, Claude Code and DeepSeek Harness artifacts. An installed artifact
   must contain only the target host's project-guidance names, question tools,
   manifests, and host-only metadata.
4. Verify Codex behavior against current OpenAI documentation and Claude Code
   behavior against current Anthropic documentation. Verify Harness against its
   pinned official source and filesystem provider.
5. Never store credentials, tokens, private keys, personal machine paths, or
   other secrets in skills, fixtures, manifests, logs, or release artifacts.
6. Do not create a project-specific lifecycle CLI or installer. Use the pinned
   upstream `skills` CLI through `npx` for supported global lifecycle
   actions.
7. Never install, update, remove, audit, migrate, or otherwise modify skills
   inside consuming projects. This project owns only global personal skills and
   its published native plugin artifacts.
8. Treat global installation, replacement, removal, plugin enablement, and MCP
   configuration as user-visible mutations that require explicit scope.
9. Do not publish packages, tags, releases, marketplaces, or plugins without
   explicit user authorization.
10. Keep every collection workflow explicit-only. Generated Codex metadata
    must disable implicit invocation, and generated Claude metadata must
    disable model invocation while preserving user invocation. Harness uses
    `disable-model-invocation: true` and `user-invocable: true` frontmatter.

## Specifications And Decisions

- Substantial work begins with a specification bundle under
  `docs/specs/<slug>/`.
- Use `decisions.yaml` as the append-only, non-sensitive decision history and
  `manifest.yaml` as the deterministic current view of confirmed scope.
- Before detailed interviewing, infer what the request and repository already
  establish. Propose the highest applicable `Lite`, `Standard`, or `Deep`
  depth plus composable `core`, `ui`, `backend`, `events`, `data`,
  `operations`, `security`, and `cross-surface` profiles, explain the choice in
  plain language, and obtain explicit confirmation.
- Load no profile-specific reference before that confirmation. Afterwards, map
  each active profile to its one dedicated reference and load exactly that set;
  grouped references must not import inactive profile guidance into context.
- Ask material decisions through the active host's callable standard tool:
  `request_user_input` in Codex, `AskUserQuestion` in Claude Code or
  `ask_user_question` in DeepSeek Harness. Follow
  the exposed schema, checkpoint each explicit answer, and do not enter plan
  mode solely to ask. No collection workflow requires Prompt MCP.
- After material decisions are resolved and the gap review passes, write
  `spec.md` with `Status: Approved` without a separate approval question.
  Treat direct user edits as authoritative and reconcile them on later runs.
- The specification owns behavior and acceptance requirements. Planning and
  implementation require separate invocations and authorization.
- Specification declares warranted profile contracts in `manifest.yaml` but
  does not create them. Planning requires both an Approved specification and a
  confirmed manifest, creates only the declared reviewable planning artifacts,
  and returns material scope changes to specification.
- Even at `Lite` depth, planning creates `plan.md`, `todo.md`, current-only
  `handoff.md`, and one compact independently verifiable task packet rather
  than implementing the workstream.
- Main planning records manifest-declared design dependencies, then stops. A
  separate explicit `design-planning` invocation owns design outputs after the
  plan, using separately installed Penpot skills. Without declared design outputs,
  skip that stage. Dependent implementation packets stay pending design evidence.
- Design planning uses Penpot for editing and verified snapshots under root `design/`:
  one shared system and separate linked screen sets per specification. Optional
  `project_artifacts` lists exact UI design outputs; other profiles retain
  specification-local paths. Missing fields do not migrate legacy manifests.
- An active profile does not mandate an extra artifact. Lite keeps established
  contracts inline unless machine validation, multiple consumers, or an explicit
  requirement warrants a separate deterministic source.
- Incremental implementation executes one authorized packet, verifies it,
  requires a usable Git worktree with tracked, staged and untracked change
  evidence, but requires neither a clean tree nor an existing commit,
  updates the current checklist and handoff, and stops. Independent code and
  security reviews are separate optional invocations, not completion or
  next-packet gates. Commits also require separate authority and are not gates.
- Model recommendations are generated per host and advisory. Empirical trials
  use the chosen actual models in isolated fresh contexts; fixture customer
  answers are simulation-only, and missing evidence never counts as a pass.

## Portability And Generation

- Shared skills use the common Agent Skills format and the smallest portable
  frontmatter needed by both supported hosts.
- Canonical skill text may use only declared `{{HOST_*}}` variables for
  values that genuinely differ by host.
- The strict renderer must reject unknown variables, unsupported hosts,
  unresolved substitutions, unsafe paths, and cross-host leakage.
- Codex output lives under
  `plugins/codex/engineer-agent-workflows/`; Claude Code output lives under
  `plugins/claude-code/engineer-agent-workflows/`.
- Harness filesystem output lives under `exports/deepseek-harness/skills/`.
  Generate it with the same commands; preserve sibling exports. It has no
  native plugin or marketplace metadata and no automatic installation.
- Codex-only `agents/openai.yaml` sidecars must not appear in the Claude Code
  bundle. Each plugin manifest and marketplace must point only to its matching
  host artifact.
- Keep discovery descriptions within 240 Unicode code points and complete
  `SKILL.md` files within 4,096 UTF-8 bytes, including frontmatter.
- Put only unconditional workflow instructions in `SKILL.md`; route optional
  detail to specific references that are read only when their documented
  condition applies.
- Keep the engineering-principles manual, test discipline, and verifier
  authoritative only under root `shared/`. Generated skill-local copies keep
  global installations self-contained; dependent workflows require the
  matching complete bundle and must not hand-edit, fetch, or approximate those
  resources.
- `spec-driven-development` is standalone.
  `planning-and-task-breakdown` depends on the matching specification workflow,
  and `incremental-implementation` depends on the matching planning workflow.
  `design-planning` also depends on matching planning; Penpot skills remain
  separately installed external capabilities.
- Skills use repository guidance already supplied by the host without
  rereading its source solely to recover context. They discover only additional
  task-scoped `AGENTS.md` for Codex/Harness or `CLAUDE.md` for Claude Code when absent
  from active context or when the instruction file itself is in scope, plus
  current code, tests, and stable project documentation.
- Do not hard-code generated MCP tool namespaces. Follow callable tool names
  and published schemas exposed by the active host.
- Common YAML shapes remain authoritative under root `shared/schemas/` and are
  generated into dependent skills and packaged into the MCP runtime.
- Workflow access to manifest, decisions, catalog and experience YAML requires
  the separate `engineer-agent-workflow-mcp` artifact. Use scenario tools for
  reads, authoring and checks; do not hand-edit or parse these files as a workflow
  fallback. Load schemas only to investigate an explicit contract conflict.
- Open a specification using its absolute project path and slug, then pass the
  returned context and references. No maintained allowlist or client roots
  dependency. The server is limited by process permissions, not a project
  authorization sandbox. Missing MCP capability blocks affected work.
  Registration and global installation need separate scope.
- Native question tools collect actual answers; MCP persists them but cannot
  independently authenticate consent. Design evidence checks distinguish local
  structural passes from external visual/restoration/accessibility checks.

## Global Lifecycle

- Normative commands pin `skills@1.5.20`, set `DISABLE_TELEMETRY=1`, select
  global scope, and never select project scope.
- Install Codex and Claude Code from their matching generated sources with
  separate commands. Every add names exactly one agent and includes `--copy`.
- Replace an installed artifact by repeating the matching host-specific
  `add --copy` command. Do not use `skills update` for this collection
  because the pinned update parser has no `--agent` option.
- Global list commands name one agent. Removal names explicit agents and skill
  selections or uses an explicitly confirmed global `--all`.
- Tests that change global configuration use isolated temporary homes and
  never touch real Codex, Claude, npm, Git, MCP, or user-profile state.

## Safety And Quality

- Pin tested dependencies and client versions in documentation and CI rather
  than floating to an unreviewed release.
- Disable upstream installation telemetry in normative commands and CI.
- Do not weaken validation or security checks merely to obtain a passing test.
- For behavior changes, write a discriminating test or executable check first,
  observe the relevant RED, implement against it, and correct implementation
  until all correct checks pass.
- Apply the engineering manual contextually: prefer correctness and simple
  cohesive designs, avoid speculative abstractions, and let
  repository-specific requirements override generic principles.
- In planning mode, expose existing and proposed architectural units, their
  purposes, ownership boundaries, contracts, dependency direction, and
  verification before changing production artifacts.

## JavaScript And TypeScript Readability

Apply these rules to new and modified JavaScript/TypeScript code, including
`.mjs`, `.js` and `.ts` files, tests, generators, validators, utility scripts
and MCP packages. A broad
refactoring of existing code requires a separate task. These rules govern
repository development, not distributed skill content; they do not authorize
copying them into skill templates or generated instructions.

- Extract an expression into a meaningfully named variable when its result is
  reused, the name explains its purpose, it combines processing stages, or the
  binding clarifies evaluation order, side effects or resource ownership. Use
  `const` unless reassignment is required.
- Keep short, clear expressions inline in function arguments: property access,
  indexing, optional chaining, simple calculations and conversions, and small
  object or array literals. Do not add intermediate variables without meaning.
- Split multistage processing into named steps for fetching, parsing, validating,
  normalizing, rendering and persisting. A line break alone does not clarify a
  nested expression. Short `map`, `filter` and other collection-method chains
  are acceptable when their purpose and intermediate transformations are clear.
- An inexpensive value object for a one-time transformation may be created and
  used inline. Give configuration instances, clients, validators, servers and
  objects with substantial initialization, state or resources an explicit
  creation and ownership point. Reuse one logical instance within its lifecycle;
  preserve independent instances when needed. Do not introduce a global
  instance, cache or longer lifecycle merely to reuse an object.
- Keep conventional project and library declarations clear: validation schemas,
  MCP tool definitions, handler tables, configuration and declarative generation
  descriptions are allowed inline. Complex computations inside them follow the
  same expression rules; do not fragment clear declarations into variables that
  add no meaning.
- Allow Builder API chains. Give the completed result a meaningful name before
  passing it to another function, while preserving the allowance for declarative
  definitions above.
- Simple arrow functions may remain inline arguments. Give multistage callback
  logic a separate function with a meaningful name. Preserve deferred execution,
  closure captures and `this`; do not replace an arrow with a regular function
  without checking these differences.
- When extracting variables, preserve evaluation order, conditional and lazy
  execution, side effects and object lifecycles. Account for short-circuiting
  in `&&`, `||`, `??` and optional chaining. Keep computations in the appropriate
  branch, loop, handler or callback; do not move file reads, parsing, validation
  or writes earlier than the original code executes them.
- In asynchronous code, preserve operation start times, `await` order,
  parallelism, cancellation and error handling. Do not serialize parallel work
  or start deferred work early merely to extract a variable. Preserve resource
  release order and cleanup guarantees.
- Respect execution and state-isolation boundaries: process, MCP server
  instance, request, generation operation or test. Do not move mutable objects
  or resources to module/process scope merely for reuse, or share state that
  must remain independent across requests, target hosts or tests. Do not add
  memoization, caching or a dependency container merely to satisfy these rules.

## Commit Hygiene

- Preserve unrelated worktree changes.
- Use one logical change per commit and Conventional Commits messages.
- Create commits only after explicit user authorization.
- Never commit generated caches, installed copies, credentials, temporary
  homes, or local client state.
