# Packet 07: Delivery Workflows

Requirements: SKILL-001, SKILL-002, SKILL-005, SEC-002, SEC-003, REL-001,
REL-002, ACC-001.

## Outcome

Generalize `project-pull-request` and `project-release` as standalone delivery
workflows. They must discover repository policy rather than assume a branch or
tool, separate local preparation from external mutation, and require a
human-created signed SemVer tag plus separate publishing authorization.

## Prerequisites

- Packet 01 is complete.
- Read the two corresponding source skills and their directly routed
  references.
- Fixture repositories cover GitHub and a non-GitHub/no-remote case, different
  default branches, templates, checks, version sources, and release policies.

## Scope

- Author both bounded, portable skill directories.
- Preserve explicit authorization for commits, pushes, PR writes, tags,
  releases, and recovery actions.
- Add repository-discovery, Conventional Commit only-if-established,
  SemVer/classification, signed-tag, checksum, and least-privilege fixtures.
- Update only these catalog descriptions if needed.

## Non-Goals

- Do not assume GitHub, `main`, a PR template, Conventional Commits, GitHub
  Actions, npm, Go, a changelog, or a release artifact exists.
- Do not create a remote, commit, push, PR, tag, release, or package while
  authoring/tests run.
- Do not publish from a floating branch or let CI invent a release version.
- Do not store signing keys, tokens, or credentials.

## File Boundaries

| File/unit | State | Contract |
| --- | --- | --- |
| `skills/project-pull-request/SKILL.md` | Proposed | Explicit PR create/update/review workflow that discovers host, remote, base/head, template, checks, permissions, and user-authorized mutations. |
| `skills/project-release/SKILL.md` | Proposed | Explicit release prepare/publish/verify/recover workflow requiring confirmed SemVer and repository-specific release evidence. |
| Skill-local references | Conditional | Host-specific command detail only after repository evidence selects that host; no unconditional GitHub assumptions. |
| `tests/delivery-skills.test.mjs` | Proposed | Branch/template/check discovery, no-remote, auth boundary, SemVer, signed tag, checksums, workflow permission, and recovery fixtures. |
| `tests/fixtures/delivery/` | Proposed | Multiple repository policies and simulated provider responses with redacted sentinels. |
| `catalog/skills.json` | Existing | Only final descriptions may change; both remain standalone. |

## Pull-Request Contract

- Reuse project guidance already supplied by the host and read only additional
  scoped guidance absent from active context or itself in scope. Inspect current
  status/diff/history, remote metadata, provider template, default branch,
  branch protection/checks, and contribution policy before proposing operations.
- Distinguish review-only, local edit, commit, push, PR create, PR update, and
  review-comment actions. Each external mutation needs matching user authority.
- Stage exact intended paths, preserve unrelated changes, show the staged diff,
  and use the repository's commit convention.
- Base/head/title/body/check evidence must come from the repository/provider;
  unknown values remain blockers or explicit questions.
- Never leak credentials, private repository content, or sentinel data into
  logs/PR text.

## Release Contract

- Require a user-confirmed exact SemVer. Classify compatibility using the
  project's policy and verify every version-bearing artifact agrees.
- Discover changelog, build, test, artifact, signing, provenance, and provider
  conventions; do not invent absent machinery.
- Preparation may update authorized local files and verify artifacts.
  Publishing is a separate external action.
- Stable release requires a human-created signed SemVer tag. Automation may
  verify but not invent/advance the version or create an unsigned replacement.
- Generate and verify SHA-256 checksums for declared artifacts; keep npm
  package integrity, Git source identity, and project tag signature as separate
  trust statements.
- Recovery never deletes or overwrites a published tag/release without
  explicit destructive authorization and provider evidence.

## Acceptance Criteria

- Both skills are explicit-only, standalone, portable, and within size limits.
- Fixtures discover non-`main` default branches, repository templates, and
  check names instead of hard-coding them.
- A non-GitHub/no-remote repository produces bounded missing-capability
  guidance without fabricated commands.
- No fixture commits, pushes, opens a PR, signs a tag, or publishes.
- Release fixtures reject absent/unconfirmed/invalid versions, version
  disagreement, unsigned tag, missing checksums, and insufficient evidence.
- GitHub Actions examples, when repository evidence selects GitHub, use
  least-privilege permissions, full-SHA third-party action pins, and release
  write only in the release job.
- Secrets and private sentinels do not appear in artifacts or diagnostics.
- Source workflow outcomes and safety gates remain equivalent without source
  project assumptions.

## Verification

```bash
npm test -- --test-name-pattern='pull request|release|SemVer|signed tag'
npm run validate:foundation
npm run generate:check -- --allow-incomplete
grep -RInE '\\bmain\\b|go test|prompt-mcp|GTK|Zenity|gh pr|gh release' \
  skills/project-pull-request skills/project-release
```

Every static-search match must be conditional evidence or a fixture, never an
unconditional workflow assumption.

## References

- [Approved specification](../spec.md): refinement, release integrity,
  supply-chain, SemVer, release gate, and skill-validation contracts.
- Initial refinement sources: `project-pull-request` and `project-release`
  skill directories in the approved `prompt-mcp` source repository.

## Completion And Handoff

- Mark only packet 07 complete.
- Record final sizes, provider/layout fixtures, mutation gates, checks, and
  packet 08 readiness.
- Stop. Do not commit, connect a remote, tag, or publish.
