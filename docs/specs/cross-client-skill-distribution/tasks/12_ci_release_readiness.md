# Packet 12: CI And Release Readiness

Requirements: OUT-001, HOST-003, HOST-004, SEC-002, SEC-003, REL-001,
REL-002, REL-003, ACC-005, ACC-006.

## Outcome

Add least-privilege cross-platform CI, deterministic archive/checksum/version
validation, changelog and maintainer trust guidance, and a separately
authorized signed-tag GitHub Release gate. Produce release-readiness evidence
without publishing.

## Prerequisites

- Packets 09–11 are complete, including every supported platform/client claim.
- Repository identity is
  `https://github.com/swimmwatch/engineer-agent-workflows`.
- **MANUAL GATE:** the user confirms the exact stable SemVer.
- **MANUAL GATE:** required local, hosted/account, and organization-managed
  acceptance is complete or explicitly excluded from the release.
- Local Git initialization and public remote creation were separately
  authorized before packet 01; this packet still does not infer commit, push,
  tag, or publication authority.
- Current third-party GitHub Action commits and checksums are verified from
  official upstream sources before use.

## Scope

- Add validation CI for Linux, macOS, and Windows.
- Add release-state/version/tag/signature/archive/checksum verification.
- Add a manual release workflow whose publish job is separately authorized and
  least-privilege.
- Add changelog, trust-anchor, dependency-review, and release evidence.
- Prove no custom lifecycle executable or unexpected generated diff enters
  artifacts.

## Non-Goals

- Do not create/push a tag, publish a GitHub Release, submit vendor directories,
  publish npm, or change real host profiles.
- Do not let CI choose or increment a version.
- Do not store signing private keys or broad repository tokens.
- Do not grant write permission to validation jobs.
- Do not support preview/rolling-main channels or managed rollback.

## File And Symbol Boundaries

| File/unit | State | Contract |
| --- | --- | --- |
| `.github/workflows/ci.yml` | Proposed | Pull/push validation with top-level `contents: read`, Linux/macOS/Windows matrix, Node 22.20+, unit/generated/lifecycle tests, isolated profiles, and artifact-free default. |
| `.github/workflows/release.yml` | Proposed | Manual dispatch for an existing human-created signed tag; validate version/signature/state, rebuild archives/checksums, use protected release environment, and grant `contents: write` only to publish job. |
| `scripts/release/validate-release.mjs` | Proposed | `readReleaseState(root)`, `validateVersionAgreement(state, tag)`, `validateReleaseReadiness(state)`; rejects development placeholder and mismatches. |
| `scripts/release/build-archives.mjs` | Proposed | Deterministic source and complete-plugin archives with normalized paths/modes/timestamps and no external executable. |
| `scripts/release/checksums.mjs` | Proposed | Generate/verify sorted lowercase SHA-256 records for declared artifacts. |
| `scripts/release/verify-tag.mjs` | Proposed | Verify exact SemVer tag points to current immutable commit and Git reports a valid signature rooted in documented maintainer trust. |
| `tests/release.test.mjs` | Proposed | Version/tag/signature/archive/checksum, permission, action-pin, generated-diff, and negative release-state fixtures. |
| `CHANGELOG.md` | Proposed | Keep a Changelog format with the confirmed initial version and verified changes only. |
| `docs/release-process.md` | Proposed | Human signed tag, trust anchor, manual workflow authorization, checksum verification, recovery limits, and no npm publication. |
| `docs/evidence/dependency-review.md` | Proposed | Exact Node/client/`skills` identities, npm integrity, action pins, licenses, and review date. |
| `docs/evidence/release-readiness.md` | Proposed | ACC-001–ACC-009 evidence matrix, commands/results, manual gates, limitations, and no publication claim. |
| `catalog/release.json`, generated manifests/marketplaces | Existing | Replace development placeholder only with confirmed SemVer and regenerate all agreeing artifacts. |

## CI Contract

- Pin every third-party action to a full commit SHA and note intended upstream
  version in a comment.
- Default workflow and validation jobs have `contents: read` only. No secrets,
  write tokens, environments, or release API calls.
- Matrix covers current supported Linux, macOS, and Windows runners with the
  exact Node floor/current version selected by evidence.
- Run format/static validation, Node tests, generated-diff checks,
  documentation tests, global lifecycle isolation, archive dry-run, and
  project-snapshot privacy checks.
- Host binaries/account tests run only where safely available; manual gates are
  not converted into fake green CI.
- Every upstream CLI call pins `skills@1.5.20`, disables telemetry, and uses
  isolated temporary profiles.
- Logs are bounded/redacted and artifacts contain no temp homes, credentials,
  caches, or user content.

## Release Gate Contract

- Input is an existing exact `vMAJOR.MINOR.PATCH` tag created and signed by a
  human maintainer. The workflow never creates, moves, or rewrites it.
- Tag, changelog, catalog, plugin manifests, marketplaces, and generated
  catalog versions agree.
- Tag signature verifies against the documented maintainer trust anchor and
  points to the immutable source commit being built.
- Repository generation is clean, all tests/gates pass, and no development
  placeholder remains.
- Deterministic source/plugin archives are rebuilt from the tag and receive
  sorted SHA-256 checksums; a second build matches.
- Validate pinned npm version/integrity independently from Git signature and
  project artifact checksums.
- Publish job requires manual workflow dispatch/protected environment approval,
  depends on every verification job, and alone receives `contents: write`.
- Publication or recovery needs separate user authorization; failed validation
  publishes nothing.

## Acceptance Criteria

- CI definitions validate and all configured Linux/macOS/Windows jobs pass.
- Generated artifacts reproduce without diff on every platform.
- Release dry-run rejects missing/unsigned/wrong/moved tag, version mismatch,
  dirty generation, wrong npm integrity, checksum mismatch, unexpected file,
  symlink, special file, and custom executable.
- Deterministic archives match across two clean builds.
- Workflow permissions and action pins pass static tests.
- `CHANGELOG.md`, catalog, plugin manifests, marketplaces, and chosen tag agree.
- Release-readiness evidence maps ACC-001 through ACC-009 to concrete commands,
  files, and manual results; unknown/manual items are not marked passed.
- No job installs into real user state or mutates a consuming project.

## Verification

Without publishing:

```bash
npm test
npm run validate
npm run generate:check
npm run test:lifecycle
npm run test:hosts
npm run release:dry-run -- --version <confirmed-semver>
npm run release:reproducibility -- --version <confirmed-semver>
```

Run workflow linting if configured, inspect permissions/action SHAs, and run the
same CI matrix in GitHub only after repository/remote authorization.

**MANUAL GATE:** verify:

- local Codex CLI and IDE discovery;
- local Claude Code discovery;
- global install/isolation on Linux, macOS, and Windows;
- Codex and Claude marketplace installation;
- one hosted/account installation per host;
- one organization-managed marketplace per host;
- no consuming project skill file changed.

**MANUAL GATE:** after all evidence passes, a human creates/pushes the signed
tag and the user separately authorizes the protected release workflow. Those
actions are not part of ordinary packet implementation.

## References

- [Approved specification](../spec.md): canonical project, platform/version,
  release integrity, supply chain, SemVer, release gate, license, release
  validation, and manual acceptance contracts.
- Packet-09 lifecycle, packet-10 host, and packet-11 documentation evidence.

## Completion And Handoff

- Mark packet 12 complete only after automated validation and every required
  manual gate passes. Otherwise leave it unchecked with exact remaining gates.
- Replace `handoff.md` with the complete requirement/acceptance evidence,
  environment versions, artifact/checksum identities, limitations, and no next
  packet.
- Remove generated temporary archives from the worktree.
- Stop without committing, tagging, publishing, or opening a PR unless each
  action has separate explicit authorization.
