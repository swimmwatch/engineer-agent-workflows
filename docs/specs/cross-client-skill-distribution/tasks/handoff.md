# Cross-Client Skill Distribution Handoff

## State

- Specification: approved, Prompt MCP revision 4.
- Packets 01–06: committed.
- Packet 07: complete and uncommitted.
- Branch: `main`; origin:
  `https://github.com/swimmwatch/engineer-agent-workflows.git`.
- Published, installed, or generated plugin artifacts: none.

## Transition Commits

- `2711a14 feat(skills): add documentation workflows`
- `fbbe5b4 test(tooling): isolate malformed catalog fixture`
- `aea7757 docs(spec): complete documentation workflows packet`

Each staged file list and complete cached diff was inspected before commit.
Nothing was pushed.

## Packet 07 Changes

Standalone workflow documents:

- `skills/project-pull-request/SKILL.md`
- `skills/project-release/SKILL.md`

Tests and declarative fixtures:

- `tests/delivery-skills.test.mjs`
- `tests/fixtures/delivery/repositories.json`
- `tests/fixtures/delivery/automation.json`
- `tests/fixtures/delivery/progressive-disclosure.json`
- `tests/fixtures/delivery/source-equivalence.json`
- scenario fixtures under
  `tests/fixtures/delivery/<skill-name>/scenarios.json`

Completion records:

- `docs/specs/cross-client-skill-distribution/tasks/todo.md`
- `docs/specs/cross-client-skill-distribution/tasks/handoff.md`

The catalog descriptions, standalone classifications, dependencies, and host
policies remain unchanged. No reference, template, script, dependency, lockfile,
generated artifact, or provider integration was added.

## Delivery Contracts

- Both workflows are standalone and explicit-only. Codex discovers the nearest
  applicable `AGENTS.md`; Claude Code discovers applicable `CLAUDE.md`.
- Repository and live provider evidence determine remotes, default/base/head
  branches, templates, checks, protection, contribution rules, commit
  conventions, version sources, release policy, and supported commands.
  Missing or conflicting evidence remains unknown and blocks unsafe action.
- Pull-request review, local edits, commits, pushes, creation, updates, and
  review comments have independent authority. Authentication does not grant
  mutation authority, and one authorized operation does not authorize another.
- Exact intended paths are staged and the complete cached diff is inspected
  before an authorized commit. Unrelated work remains untouched. Existing
  matching change requests are updated rather than duplicated.
- Release preparation, commit, push, tag operations, publication,
  verification, and destructive recovery are separate authority boundaries.
  A confirmed exact SemVer and stable/prerelease classification are required,
  and every authoritative version source must agree.
- Stable publication requires the repository-formatted SemVer tag to be
  human-created, signed, signature-verified, immutable, and bound to a fixed
  source revision. Automation may verify but cannot invent or advance the
  version or substitute an unsigned tag.
- Declared artifact bytes receive verified SHA-256 checksums. Registry
  integrity, source revision identity, checksums, provenance, and tag signature
  remain separate trust statements.
- Provider automation is evaluated only after repository evidence selects it.
  Third-party actions require immutable full-revision pins; permissions remain
  read-only by default, with release write access limited to the release job.
- Recovery preserves published evidence. Deletion, overwrite, or retargeting
  requires explicit destructive authority and current provider evidence;
  repository-supported follow-up releases are preferred.
- Both workflows use bounded, redacted reporting and stop without invoking
  another workflow, creating credentials, broadening authority, or fabricating
  provider commands.

No skill-local reference or template was necessary: both unconditional
provider-neutral contracts fit within their bounded `SKILL.md` files.

Exact sizes:

| Artifact | UTF-8 bytes | Description code points |
| --- | ---: | ---: |
| `project-pull-request/SKILL.md` | 2,931 | 234 |
| `project-release/SKILL.md` | 3,475 | 230 |

## Provider And Acceptance Evidence

- Repository fixtures cover a hosted GitHub repository with `trunk`, a
  self-hosted non-GitHub forge with `stable`, and a local repository without a
  remote or provider.
- The hosted fixtures use distinct remotes, templates, required checks, commit
  conventions, version sources, and tag formats. Tests copy those values from
  selected repository evidence and reject fabricated defaults or commands.
- Pull-request fixtures cover review-only behavior, independent operation
  authority, exact staging, unrelated-path preservation, existing-request
  updates, missing provider capabilities, and zero executed mutations.
- Release fixtures cover stable and prerelease SemVer, unconfirmed and invalid
  versions, version disagreement, human-signed and unsigned tags, fixed and
  floating source identity, verified and missing checksums, distinct trust
  evidence, separate publication authority, missing provider evidence,
  immutable recovery, and privacy.
- Conditional automation fixtures use read-only top-level permissions, confine
  write permissions to the release job, and pin every third-party action to a
  full 40-character commit SHA.
- Progressive-disclosure fixtures load only the selected skill body.
  Source-project terminology and synthetic private values remain fixture-only;
  callers receive copied fixture state and production skill snapshots remain
  unchanged.

## Verification

Environment:

- Node.js: `v24.14.0`
- npm: `11.9.0`

Results:

- `npm test -- --test-name-pattern='pull request|release|SemVer|signed tag'`
  — passed, 24 selected tests.
- `npm test` — passed, 106 tests.
- `node --test` — passed, 106 tests.
- `npm run validate:foundation` — passed,
  `complete validation passed: 15/15 skills present`.
- `npm run validate` — passed,
  `complete validation passed: 15/15 skills present`.
- Both `npm run generate:check -- --allow-incomplete` and
  `npm run generate:check` produced the expected Packet 08 gate:
  `E_INCOMPLETE: release generation is reserved for the native packaging
  packet`.
- Static searches found no fixed provider, branch, provider command,
  ecosystem command, source-project assumption, personal filesystem path,
  credential pattern, or production sentinel in the delivery skills.
- UTF-8, LF, final-newline, and trailing-whitespace checks passed for all nine
  Packet 07 implementation and test files.
- Catalog/frontmatter alignment, size limits, exact repository-policy
  selection, caller isolation, zero-mutation snapshots, no-symlink inspection,
  and `git diff --check` passed.

The original Packet 07 verification wording expected strict validation to
remain incomplete. Repository evidence superseded that expectation: Packet 07
adds the final two catalog skill directories, so both validation modes now
correctly pass at 15/15. Generation remains fail-closed until Packet 08.

## Compatibility And Limitations

- Skills and tests use the dependency-free Node.js maintenance project and
  preserve the Node.js 22.20.0 floor.
- No real provider API, remote, pull request, review comment, commit, push, tag,
  signature, package, release, Codex or Claude state, installation, generated
  distribution, network service, or publication was accessed.
- Provider and ecosystem names in declarative fixtures are intentional
  conditional evidence and do not appear as assumptions in production skill
  content.
- The complete source skill catalog is not yet packaged or available for
  installation.
- Packet 07 remains uncommitted for review.

## Next Packet

[Packet 08 — Native plugin packaging](08_native_plugin_packaging.md) is the
first unchecked packet and owns deterministic generation. Before starting it,
verify Packet 07 against this handoff and obtain explicit authorization for
the exact transition commits. Do not commit, push, install, publish, generate
plugins, connect a remote, tag, or begin Packet 08 in the current turn.
