# Cross-Client Skill Distribution Handoff

## State

- Specification: approved, Prompt MCP revision 4.
- Packets 01 and 02: committed.
- Packet 03: complete and uncommitted.
- Branch: `main`; origin:
  `https://github.com/swimmwatch/engineer-agent-workflows.git`.
- Published, installed, or generated plugin artifacts: none.

## Transition Commits

- `fc1c4b9 feat(skills): add planning workflow and engineering manual`
- `3827e8d docs(spec): complete planning workflow packet`

Each cached diff was checked for exact scope and whitespace before commit.
Nothing was pushed.

## Packet 03 Changes

Workflow bundles:

- `skills/spec-driven-development/SKILL.md`
- `skills/spec-driven-development/engineering-manual.sha256`
- `skills/spec-driven-development/references/specification-interview.md`
- `skills/incremental-implementation/SKILL.md`
- `skills/incremental-implementation/engineering-manual.sha256`

Shared verification:

- `skills/planning-and-task-breakdown/scripts/verify-engineering-manual.mjs`
  now requires both the caller marker and planning-owner marker to match the
  exact manual, rejecting partially updated bundles.

Tests and fixtures:

- `tests/specification-skill.test.mjs`
- `tests/incremental-skill.test.mjs`
- `tests/bundle-required.test.mjs`
- three declarative specification fixtures
- four declarative incremental fixtures

Completion records:

- `docs/specs/cross-client-skill-distribution/tasks/todo.md`
- `docs/specs/cross-client-skill-distribution/tasks/handoff.md`

The catalog was not changed. Both workflows retain their approved
bundle-required dependency on `planning-and-task-breakdown`.

## Contracts Delivered

- Both workflows are explicit-only, verify the matching sibling engineering
  manual before any artifact or commit, and never copy or fetch the manual.
- `spec-driven-development/SKILL.md` is 2,443 UTF-8 bytes with a 239-code-point
  description. It writes behavioral specifications, persists recoverable
  non-sensitive Prompt MCP decisions, requires separate committed approval,
  and stops before planning or implementation.
- `incremental-implementation/SKILL.md` is 2,747 UTF-8 bytes with a
  230-code-point description. It implements one authorized packet, provides
  symbol-level architecture in planning mode, requires explicit exact-scoped
  transition commits, verifies the packet, updates one checklist item and the
  handoff, and stops.
- The specification interview reference is 7,049 bytes. It discovers callable
  Prompt MCP tools and schemas without a namespace, supports bounded
  batch/single-question and recovery paths, checkpoints committed answers,
  preserves decision revisions, rejects non-answer statuses, and separates
  draft approval.
- Planning, specification, and incremental markers all contain:
  `c5b85c4e25c1de77a9f22bdce417fde2861b3310e7f3cc96b13e070d2c3b0637`.
- Missing, unsafe, stale, or mixed bundles create no modeled artifact and
  return only:
  `Install or update the complete matching engineer-agent-workflows bundle for Codex and Claude Code using the documented pinned global command, then retry.`
- Direct, copied, symlinked-global, native-plugin, partial-update, Linux,
  macOS, and Windows-form layouts are covered.
- `cancelled`, `timed_out`, `unavailable`, `conflict`, `invalid_request`, and
  `failed` are tested as non-answers. Only committed modeled answers enter
  answered decisions, with durability required when metadata is present;
  committed partial results remain recoverable.

## Verification

Environment:

- Node.js: `v24.14.0`
- npm: `11.9.0`

Results:

- `npm test -- --test-name-pattern='specification|incremental|bundle-required'`
  — passed, 26 focused tests.
- `npm test` — passed, 65 tests.
- `node --test` — passed, 65 tests.
- Both direct dependent manual-verifier commands — passed silently.
- `npm run validate:foundation` — passed, `3/15 skills present`.
- `npm run generate:check -- --allow-incomplete` — passed,
  `12 skills pending`.
- `npm run validate` — expected fail-closed result:
  `E_INCOMPLETE: complete validation requires all 15 skill directories`.
- Syntax, UTF-8/LF/final-newline, trailing-whitespace, no-symlink,
  path/privacy/sentinel, shared-digest, and `git diff --check` checks — passed.

## Compatibility And Limitations

- The workflows and verifier use Node.js built-ins only and preserve the
  declared Node.js 22.20.0 floor.
- No real Prompt MCP, global Codex/Claude state, project production artifact,
  dependency, lockfile, host plugin, marketplace, installation, or generated
  distribution was accessed or created.
- The collection remains incomplete and intentionally unavailable for
  installation or generation.
- Packet 03 remains uncommitted for review.

## Available Next Packets

Packets 04–07 are independently available:

- [Packet 04 — Code-quality workflows](04_code_quality_workflows.md)
- [Packet 05 — Context and discovery workflows](05_context_and_discovery_workflows.md)
- [Packet 06 — Documentation workflows](06_documentation_workflows.md)
- [Packet 07 — Delivery workflows](07_delivery_workflows.md)

Packet 04 is the first unchecked packet. Before any next packet, verify Packet
03 against this handoff and obtain explicit authorization to commit its exact
changes. Do not commit, push, install, publish, generate plugins, or begin
another packet in the current turn.
