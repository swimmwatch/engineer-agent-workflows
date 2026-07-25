# AGENTS.md

Operating manual for AI coding agents working in this repository.

## About The Project

`engineer-agent-workflows` is the source of truth for reusable engineering
skills that can be installed globally for both Codex and Claude Code. The
project keeps one portable Agent Skills core while isolating host-specific
packaging and metadata.

The project is specification-first. Until the initial specification is
approved, do not implement skills, plugins, release automation, or global
configuration changes.

## Golden Rules

1. Repository code, documentation, identifiers, skill content, and commit
   messages are written in English.
2. Preserve one authoritative copy of each workflow. Do not maintain separate
   hand-edited Codex and Claude versions of the same instructions.
3. Keep portable Agent Skills content separate from host-specific manifests,
   marketplaces, invocation metadata, and installation behavior.
4. Verify Codex behavior against current OpenAI documentation and Claude Code
   behavior against current Anthropic documentation.
5. Never store credentials, tokens, private keys, personal machine paths, or
   other secrets in skills, fixtures, manifests, logs, or release artifacts.
6. Do not create a project-specific lifecycle CLI or installer. Use the pinned
   upstream `skills` CLI through `npx` for supported global lifecycle actions.
7. Never install, update, remove, audit, migrate, or otherwise modify skills
   inside consuming projects. This project owns only global personal skills
   and its published native plugin artifacts.
8. Treat global installation, update, removal, plugin enablement, and MCP
   configuration as user-visible mutations that require explicit scope.
9. Do not publish packages, tags, releases, marketplaces, or plugins without
   explicit user authorization.
10. Keep every collection workflow explicit-only. Generated Codex metadata
    must disable implicit invocation, and generated Claude metadata must
    disable model invocation while preserving user invocation.

## Specifications And Decisions

- Substantial work begins with a specification bundle under
  `docs/specs/<slug>/`.
- Use `decisions.yaml` as the durable, non-sensitive decision ledger.
- Ask material product and technical decisions through the globally configured
  Prompt MCP and checkpoint each answer immediately.
- Keep `spec.md` in `Status: Draft` until the user explicitly approves it
  through Prompt MCP.
- The specification owns behavior and acceptance requirements. Planning and
  implementation require separate invocations and authorization.
- After approval, create independently verifiable task packets rather than
  implementing the entire workstream in one step.

## Portability

- Shared skills should use the common Agent Skills format and the smallest
  portable frontmatter needed by both supported hosts.
- Host-only capabilities must live in explicit adapters or generated metadata.
- Keep discovery descriptions within 240 Unicode code points and complete
  `SKILL.md` files within 4,096 UTF-8 bytes, including frontmatter.
- Put only unconditional workflow instructions in `SKILL.md`; route optional
  detail to specific references that are read only when their documented
  condition applies.
- Keep the engineering-principles manual authoritative only under
  `planning-and-task-breakdown`; dependent implementation and specification
  workflows require the matching complete bundle and must not copy or fetch
  that manual.
- Skills must discover applicable repository guidance at runtime: `AGENTS.md`
  for Codex, `CLAUDE.md` for Claude Code, plus current code, tests, and stable
  project documentation.
- Do not hard-code generated MCP tool namespaces. Follow the callable tool
  names and published schemas exposed by the active host.

## Safety And Quality

- Normative `skills` CLI examples must use global scope and explicit Codex or
  Claude targets; project scope is forbidden.
- Pin the tested `skills` package version in documentation and CI rather than
  floating to an unreviewed release.
- Disable upstream installation telemetry in normative commands and CI.
- Tests that change global user configuration must use isolated temporary
  homes and must not touch real Codex, Claude, or MCP state.
- Do not weaken validation or security checks merely to obtain a passing test.
- Apply the engineering manual contextually: prefer correctness and simple
  cohesive designs, avoid speculative abstractions, and let repository-specific
  requirements override generic principles.
- In planning mode, expose existing and proposed architectural units, their
  purposes, ownership boundaries, contracts, dependency direction, and
  verification before changing production artifacts.

## Commit Hygiene

- Preserve unrelated worktree changes.
- Use one logical change per commit and Conventional Commits messages.
- Create commits only after explicit user authorization.
- Never commit generated caches, installed copies, credentials, temporary
  homes, or local client state.
