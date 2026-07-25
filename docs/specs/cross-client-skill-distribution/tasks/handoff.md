# Cross-Client Skill Distribution Handoff

## State

- Specification: approved, Prompt MCP revision 4.
- Packets 01–03: committed.
- Packet 04: complete and uncommitted.
- Branch: `main`; origin:
  `https://github.com/swimmwatch/engineer-agent-workflows.git`.
- Published, installed, or generated plugin artifacts: none.

## Transition Commits

- `8153a5c feat(skills): add specification and incremental workflows`
- `6636652 docs(spec): complete specification and incremental packet`

Each staged diff was inspected for exact scope and whitespace before commit.
Nothing was pushed.

## Packet 04 Changes

Standalone workflow documents:

- `skills/code-review-and-quality/SKILL.md`
- `skills/code-simplification/SKILL.md`
- `skills/doubt-driven-development/SKILL.md`
- `skills/performance-optimization/SKILL.md`
- `skills/security-and-hardening/SKILL.md`

Tests and fixtures:

- `tests/code-quality-skills.test.mjs`
- one six-case `scenarios.json` fixture under each matching
  `tests/fixtures/code-quality/<skill-name>/` directory

Completion records:

- `docs/specs/cross-client-skill-distribution/tasks/todo.md`
- `docs/specs/cross-client-skill-distribution/tasks/handoff.md`

No catalog entry changed. No skill-local reference, script, dependency, or
shared generic quality workflow was added.

## Contracts Delivered

- All five workflows are standalone and explicit-only for both Codex and Claude
  Code. Each discovers applicable `AGENTS.md` or `CLAUDE.md`, uses task-scoped
  repository evidence, distinguishes assessment from mutation authority,
  reports bounded redacted evidence, and stops without another workflow or
  publication.
- `code-review-and-quality` is read-only, reports actionable findings before
  summaries by severity, identifies introduced defects, and states residual
  risk and checks when no finding exists.
- `code-simplification` establishes the preserved contract and a reproducible
  behavior snapshot before mutation, makes the narrowest clarity refactor, and
  compares equivalent before-and-after evidence.
- `doubt-driven-development` is read-only, requires a named high-risk decision
  and deadline, steelmans alternatives, separates evidence from assumptions,
  proposes safe experiments, and ends with a recommendation or blocker.
- `performance-optimization` requires a reproducible baseline and correctness
  oracle, locates a measured bottleneck, compares the same workload, and
  rejects correctness, security, compatibility, or tail regressions.
- `security-and-hardening` names assets, actors, capabilities, trust boundaries,
  security properties, and abuse cases; preserves positive controls and never
  weakens a failing control.

Exact skill sizes:

| Skill | UTF-8 bytes | Description code points |
| --- | ---: | ---: |
| `code-review-and-quality` | 2,002 | 220 |
| `code-simplification` | 2,135 | 237 |
| `doubt-driven-development` | 1,958 | 228 |
| `performance-optimization` | 2,172 | 231 |
| `security-and-hardening` | 2,153 | 229 |

## Fixture Evidence

- Every workflow has the same six declarative scenario identities:
  explicit invocation, incomplete input, out of scope, positive, safety, and
  outcome equivalence.
- Every incomplete-input case also models an empty tool set, blocks without
  mutation, and records that no command was invented.
- Fixtures cover Node services, Python packages, Rust command-line programs,
  and documentation/configuration repositories using both host guidance names.
- Review and doubt preserve identical tree digests and never authorize
  mutation.
- Simplification changes a source digest while preserving behavior and focused
  before-and-after checks.
- Performance refuses an absent baseline and proves equivalent workload,
  improved percentile measurements, unchanged correctness, and no tail
  regression.
- Security covers invalid input, diagnostic exposure, filesystem escape,
  process privilege, and dependency provenance; normal behavior and existing
  controls remain identical while the modeled abuse path becomes rejected.
- Five synthetic private-value markers exist only in safety fixtures. Tests
  prove modeled outputs exclude them, fixture reads are copy-isolated, and a
  workflow fixture never contains another workflow's sentinel.

## Verification

Environment:

- Node.js: `v24.14.0`
- npm: `11.9.0`

Results:

- `npm test -- --test-name-pattern='code quality|review|simplification|doubt|performance|security'`
  — passed, 17 selected tests.
- `npm test` — passed, 73 tests.
- `node --test` — passed, 73 tests.
- `npm run validate:foundation` — passed, `8/15 skills present`.
- `npm run generate:check -- --allow-incomplete` — passed,
  `7 skills pending`.
- `npm run validate` — expected fail-closed result:
  `E_INCOMPLETE: complete validation requires all 15 skill directories`.
- Source-specific and embedded ecosystem-command searches across the five
  skills returned no matches.
- Personal-path, credential-pattern, and skill-body sentinel searches returned
  no matches. The five reviewed `PRIVATE_*` matches are synthetic safety
  fixture inputs only.
- UTF-8/LF/final-newline/trailing-whitespace validation passed for all 11 new
  files.
- Catalog/frontmatter validation, caller isolation, unchanged production
  snapshots, no-symlink inspection, and `git diff --check` passed.

## Compatibility And Limitations

- The skills and tests use existing Node.js built-ins only and preserve the
  declared Node.js 22.20.0 floor.
- No real repository mutation is performed by review or doubt fixtures. All
  other modeled mutations remain bounded by explicit authority.
- No global Codex or Claude state, dependency, lockfile, host plugin,
  marketplace, installation, generated distribution, network service, or
  source project was accessed.
- The collection remains incomplete and intentionally unavailable for
  installation or generation.
- Packet 04 remains uncommitted for review.

## Available Next Packets

Packets 05–07 remain independently available:

- [Packet 05 — Context and discovery workflows](05_context_and_discovery_workflows.md)
- [Packet 06 — Documentation workflows](06_documentation_workflows.md)
- [Packet 07 — Delivery workflows](07_delivery_workflows.md)

Packet 05 is the first unchecked packet. Before any next packet, verify Packet
04 against this handoff and obtain explicit authorization to commit its exact
changes. Do not commit, push, install, publish, generate plugins, or begin
another packet in the current turn.
