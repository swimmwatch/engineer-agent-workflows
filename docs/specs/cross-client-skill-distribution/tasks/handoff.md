# Cross-Client Skill Distribution Handoff

## State

- Specification: approved, Prompt MCP revision 4.
- Packets 01–05: committed.
- Packet 06: complete and uncommitted.
- Branch: `main`; origin:
  `https://github.com/swimmwatch/engineer-agent-workflows.git`.
- Published, installed, or generated plugin artifacts: none.

## Transition Commits

- `1d1705d feat(skills): add context and discovery workflows`
- `f035781 docs(spec): complete context and discovery workflows packet`

Each staged diff was inspected for exact scope before commit. Nothing was
pushed.

## Packet 06 Changes

Standalone workflow documents:

- `skills/documentation-and-adrs/SKILL.md`
- `skills/project-docs-maintainer/SKILL.md`

Tests and declarative fixtures:

- `tests/documentation-skills.test.mjs`
- `tests/fixtures/documentation/layouts.json`
- `tests/fixtures/documentation/state-classification.json`
- `tests/fixtures/documentation/source-equivalence.json`
- `tests/fixtures/documentation/progressive-disclosure.json`
- scenario fixtures under
  `tests/fixtures/documentation/<skill-name>/scenarios.json`

Validation isolation correction:

- `tests/cli.test.mjs` now starts its malformed-catalog case from valid release
  metadata and corrupts only `catalog/skills.json`. The prior fixture made both
  inputs invalid while concurrent validation allowed either error to win.

Completion records:

- `docs/specs/cross-client-skill-distribution/tasks/todo.md`
- `docs/specs/cross-client-skill-distribution/tasks/handoff.md`

The catalog descriptions, standalone classifications, dependencies, and host
policies remain unchanged. No reference, template, script, dependency, or
generated artifact was added.

## Workflow Contracts

- Both workflows are standalone and explicit-only. Codex discovers the nearest
  applicable `AGENTS.md`; Claude Code discovers applicable `CLAUDE.md`.
- Both inspect only task-scoped repository evidence and preserve established
  terminology, layouts, link styles, ownership, audiences, and command syntax.
- Material claims remain distinctly `current`, `proposed`, `experimental`,
  `deprecated`, or `unknown`. Only current claims are presented as shipped,
  and they require repository evidence.
- `documentation-and-adrs` updates a requested technical document or settled
  ADR. A complete ADR records status and date, context and forces, decision and
  scope, alternatives and trade-offs, positive and negative consequences,
  applicable compatibility/security/operations/migration implications,
  reversal conditions, and unresolved follow-up.
- Materially unresolved decisions block ADR creation rather than becoming
  fabricated consensus. A repository without an ADR convention receives a
  visible local proposal and requires an explicit choice.
- `project-docs-maintainer` maps authoritative documents, audiences, owners,
  and links before making the smallest coherent in-scope correction. It
  preserves labeled history, unrelated prose, project code, configuration,
  release artifacts, and out-of-scope localization.
- Safe commands and links are verified when authorized. Unrun or unsupported
  commands remain explicitly `not run`, `unverified`, or `unknown`.
- Both workflows stop after their selected documentation outcome without
  invoking another workflow, installing, publishing, or changing non-document
  project artifacts.

No skill-local reference or template was necessary: each complete workflow
fits directly within its bounded `SKILL.md`, and the collection imposes no
universal documentation hierarchy, ADR format, changelog, localization,
generator, or hosting convention.

Exact sizes:

| Artifact | UTF-8 bytes | Description code points |
| --- | ---: | ---: |
| `documentation-and-adrs/SKILL.md` | 2,894 | 225 |
| `project-docs-maintainer/SKILL.md` | 2,668 | 222 |

## Fixture And Acceptance Evidence

- Layout fixtures cover README-centric repositories, documentation sites,
  established numbered ADR directories, and repositories without an ADR
  convention.
- ADR fixtures cover a complete settled decision, unresolved choices,
  alternatives, consequences, compatibility, security, operations, migration,
  reversal conditions, and follow-up.
- State fixtures prove that all five claim states remain distinct and that
  proposed, experimental, deprecated, and unknown content is not presented as
  current behavior.
- Documentation maintenance fixtures select authoritative documents, remove
  only in-scope contradictory duplicates, preserve labeled history and
  localization, and require every modeled link target to exist.
- Before/after digest fixtures change only the expected Markdown paths while
  preserving code, configuration, release data, authoritative content, and
  unrelated prose.
- Progressive-disclosure fixtures load only the selected skill body.
  Source-project terminology and synthetic private values remain fixture-only;
  copied fixture state and unchanged production skill snapshots are verified.

## Verification

Environment:

- Node.js: `v24.14.0`
- npm: `11.9.0`

Results:

- `npm test -- --test-name-pattern='documentation|ADR|project docs'` — passed,
  24 selected tests.
- The corrected malformed-input CLI test passed 40 consecutive focused runs.
- `npm test` — passed, 96 tests.
- `node --test` — passed, 96 tests.
- `npm run validate:foundation` — passed, `13/15 skills present`.
- `npm run generate:check -- --allow-incomplete` — passed,
  `2 skills pending`.
- `npm run validate` — expected fail-closed result:
  `E_INCOMPLETE: complete validation requires all 15 skill directories`.
- Static searches found no source-project assumption in production skills,
  personal filesystem path, credential pattern, or production sentinel.
- UTF-8, LF, final-newline, and trailing-whitespace checks passed for all ten
  Packet 06 implementation and test files.
- Catalog/frontmatter alignment, size limits, caller isolation, stable fixture
  links, minimal changed-path sets, no-symlink inspection, and
  `git diff --check` passed.

## Compatibility And Limitations

- Skills and tests use the existing dependency-free Node.js maintenance
  project and preserve the Node.js 22.20.0 floor.
- No real Codex, Claude Code, Prompt MCP, global user state, project production
  code, dependency, lockfile, host plugin, marketplace, installation,
  generated distribution, network service, or publication was accessed.
- Source-project terminology in `source-equivalence.json` is intentional test
  data and does not appear in production workflow content.
- The collection remains incomplete and intentionally unavailable for
  installation or generation.
- Packet 06 remains uncommitted for review.

## Next Packet

[Packet 07 — Delivery workflows](07_delivery_workflows.md) is the remaining
workflow packet and the first unchecked packet. Before starting it, verify
Packet 06 against this handoff and obtain explicit authorization for the exact
transition commits. Do not commit, push, install, publish, generate plugins,
invoke another workflow, or begin Packet 07 in the current turn.
