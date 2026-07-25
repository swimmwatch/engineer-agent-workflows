# Cross-Client Skill Distribution Handoff

## State

- Specification: approved through Prompt MCP.
- Packets 01–08: complete and committed.
- Packet 09: implemented and verified on Linux, committed locally and
  unchecked.
- Branch: `main`.
- Origin: `https://github.com/swimmwatch/engineer-agent-workflows.git`.
- Release version: `0.0.0-development`; `releaseReady: false`.
- Installed, enabled, published, tagged, pushed, or real-profile plugin state:
  none.

Packet 09 remains incomplete until its committed manual GitHub Actions matrix
is separately authorized for push and dispatch and passes on Linux, macOS, and
Windows.

## Packet 08 Transition Commits

- `07955e2 feat(packaging): add native plugin distribution`
- `b430c92 docs(spec): complete native plugin packaging packet`

Packet 08 was reverified before staging. Each exact staged file list and
cached diff was inspected before commit. Nothing was pushed.

## Packet 09 Local Commits

- `f862244 test(lifecycle): add isolated global lifecycle coverage`
- `1eee7d4 ci(lifecycle): add cross-platform isolation matrix`

Both exact staged file lists, complete cached diffs, and whitespace checks were
inspected before commit. The commits exist only on local `main`; neither was
pushed.

## Packet 09 Implementation

Test-only lifecycle boundaries:

- `tests/lifecycle/isolated-profile.mjs` creates Linux, macOS, and Windows-style
  homes, XDG/AppData, npm, Git, temporary, Codex, Claude Code, and consumer
  state under one test-owned root. Its child environment is reconstructed from
  a minimal system allowlist.
- `tests/lifecycle/project-snapshot.mjs` delegates to the repository's
  deterministic SHA-256 tree snapshot and compares copied values.
- `tests/lifecycle/skills-command.mjs` permits only bounded, shell-free,
  explicit global `add`, `list`, `update`, and `remove` operations expanded to
  exactly `npx --yes skills@1.5.20`.
- `tests/lifecycle/source-fixture.mjs` copies the generated plugin into an
  isolated two-commit Git source and serves its bare remote through a
  loopback-only smart-Git endpoint. No external repository is created.
- `tests/lifecycle/global-lifecycle.test.mjs` performs source discovery,
  standalone and complete installation, per-agent listing, tracked update,
  removal, bundle-required single installation, and unknown-skill behavior.
- `tests/lifecycle/platform-paths.test.mjs` covers modeled host paths,
  caller isolation, restricted commands, bounded/redacted output, contained
  links, cancellation, graceful termination, force-kill escalation, and reap.
- `tests/lifecycle/workflow-policy.test.mjs` authenticates the reviewed CLI
  fixtures and the manual workflow's runners, action pins, permissions, and
  sole command.

Supporting artifacts:

- `tests/fixtures/skills-cli-1.5.20/` contains sanitized reviewed metadata,
  help, and unknown-skill evidence.
- `docs/evidence/skills-cli-1.5.20.md` records exact identity, commands,
  update behavior, isolation, current Linux observations, and pending hosts.
- `package.json` adds only `test:lifecycle`; no dependency, lockfile, binary,
  installer, or post-install hook was added.

## Pinned CLI Evidence

- Package: `skills`
- Version: `1.5.20`
- Node.js engine: `>=22.20.0`
- Integrity:
  `sha512-lPl5KzMfTW+qwHFwc8t6R+wAqmdmSHw1+HWbGdJ/FZYbWLdB34bAZNFWiencM5DVoRaKAgXArmfTWMlNAbl9Gg==`
- Telemetry: `DISABLE_TELEMETRY=1`

The pinned parser supports agent selection for add, list, and remove but not
for update. The accepted update form is:

```text
npx --yes skills@1.5.20 update code-review-and-quality --global --yes
```

Tests verify afterward that only the already installed Codex and Claude Code
views of that named skill receive the second-commit marker.

A direct path or `file://` source installs but is not entered in the pinned
CLI's global update lock. The test therefore exposes the same isolated local
Git source through loopback smart Git. This exercises the CLI's real tracked
update path without external source or profile mutation.

Unknown skill `definitely-not-a-skill` exits 1 and reports the 15 available
identities. The behavior is recorded as upstream behavior rather than a
project-owned diagnostic.

## Isolation and Linux Evidence

- Every lifecycle child receives test-owned `HOME`, `USERPROFILE`,
  `APPDATA`, `LOCALAPPDATA`, XDG, npm, Git, and temporary paths.
- Tokens, API keys, proxy settings, signing state, MCP variables,
  `NODE_OPTIONS`, and unrelated parent environment values are not inherited.
- Output is capped at 256 KiB per stream, ANSI-normalized, and temporary roots
  are replaced with `<TEMP>`.
- Commands run without a shell. Timeout and cancellation terminate the process
  tree, escalate when needed, and wait for reap.
- Symbolic links and junctions are accepted only when their real targets stay
  under the temporary root; copies are compared byte-for-byte.
- The consumer project contains one 26-byte sentinel with SHA-256
  `a927a7f89101239638029af8efff0cb1ee96d6e906f63d8c8c7bdef1e2991b58`.
  Its complete snapshot is unchanged before and after every operation.
- Linux observed canonical Codex files under `.agents/skills/<name>` and
  contained Claude Code links under `.claude/skills/<name>`.
- All temporary lifecycle directories were removed after the tests. No real
  Codex, Claude Code, npm, Git, MCP, or user-home state was accessed.

## Manual Cross-Platform Workflow

`.github/workflows/lifecycle.yml` is manual-only through
`workflow_dispatch`. It has top-level `contents: read`, no secrets or write
permission, a 20-minute job bound, `fail-fast: false`, and runs only
`npm run test:lifecycle`.

Matrix:

- `ubuntu-24.04`
- `macos-15`
- `windows-2025`
- Node.js `24.14.0`

Pinned actions:

- `actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd`
  (`v6.0.2`), with persisted credentials disabled.
- `actions/setup-node@53b83947a5a98c8d113130e565377fae1a50d02f`
  (`v6.3.0`), without package caching.

The workflow is committed locally in `1eee7d4` and has not been pushed or
dispatched.

## Verified Environment

- Date: 2026-07-26
- OS: Linux `7.0.0-28-generic`
- Architecture: `x86_64` / Node `x64`
- Node.js: `v24.14.0`
- npm: `11.9.0`
- Git: `2.43.0`

## Verification Results

- `npm test -- --test-name-pattern='global lifecycle|isolated profile'` —
  passed.
- `npm run test:lifecycle` — passed, 8 tests.
- `npm test` — passed, 125 tests.
- `node --test` — passed, 125 tests.
- `npm run validate` — passed, 15/15 skills.
- `npm run generate:check` — passed, 15 skills and no generated diff.
- `git diff --check` — passed.
- Repository symlink inspection — no symlinks.
- Floating `skills` version, initializer, installer, binary, post-install, and
  unexpected project-scope searches — no unsafe findings.
- Credential and personal-path searches — findings are limited to negative
  sentinel assertions and pre-existing synthetic path fixtures.
- Temporary lifecycle-root search after verification — no remaining roots.

## Remaining Gate

Obtain separate authorization to push Packet 09, then manually dispatch
`Global lifecycle isolation`. Record exact runner images and link-or-copy
behavior for all three operating systems. Mark Packet 09 complete only after
every matrix job passes.

Packet 10 is next after that gate. Do not start it while Packet 09 remains
unchecked.
