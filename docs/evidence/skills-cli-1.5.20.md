# `skills@1.5.20` Lifecycle Evidence

Reviewed: 2026-07-26

## Identity

- Package: `skills`
- Version: `1.5.20`
- Required Node.js: `>=22.20.0`
- npm integrity: `sha512-lPl5KzMfTW+qwHFwc8t6R+wAqmdmSHw1+HWbGdJ/FZYbWLdB34bAZNFWiencM5DVoRaKAgXArmfTWMlNAbl9Gg==`
- Telemetry opt-out: `DISABLE_TELEMETRY=1`

The repository has no runtime dependency on this package. Tests execute the
reviewed package only as `npx --yes skills@1.5.20` with an isolated npm cache
and user profile.

## Reviewed Commands

Complete global installation:

```text
npx --yes skills@1.5.20 add <source> --global \
  --agent codex --agent claude-code --skill '*' --yes
```

Agent-specific global listing:

```text
npx --yes skills@1.5.20 list --global --agent <agent> --json
```

Explicit global update:

```text
npx --yes skills@1.5.20 update <skill> --global --yes
```

Confirmed global removal:

```text
npx --yes skills@1.5.20 remove --global \
  --agent codex --agent claude-code --all --yes
```

The pinned update parser has no agent option. Passing `--agent codex` makes
`codex` a positional skill filter instead of selecting a target. Tests
therefore update one named, globally tracked skill and verify afterward that
only its existing Codex and Claude Code installations changed.

## Pre-Publication Source

The CLI treats a direct local or `file://` source as untracked and cannot
update it. The acceptance harness creates a two-commit Git repository entirely
inside its temporary root and exposes its bare remote through a loopback-only
smart-Git endpoint. This provides genuine upstream add/update provenance
without creating or mutating an external remote.

The consumer project, homes, XDG/AppData directories, npm cache/config, Git
configuration, source, remote, temporary files, and host state all remain
inside the test-owned root. Child commands inherit no credentials, MCP state,
proxy configuration, signing configuration, or user runtime options.

## Observed Linux Behavior

Local verification on 2026-07-26 observed:

- Codex uses the canonical global `.agents/skills/<name>` directory.
- Claude Code points to the same canonical content through
  `.claude/skills/<name>` symbolic links.
- Source listing reports all 15 skills without installation.
- Standalone, complete-bundle, update, removal, and upstream-allowed
  bundle-required single-skill operations succeed.
- Unknown skill `definitely-not-a-skill` exits with status 1 and lists the 15
  available identities.
- Every consumer-project snapshot remains byte-identical.

The tests accept either contained symbolic links or byte-identical copies
because the upstream layout may differ by operating system.

## Local Commit State

- `f862244 test(lifecycle): add isolated global lifecycle coverage`
- `1eee7d4 ci(lifecycle): add cross-platform isolation matrix`

Both commits exist only in the local `main` branch. Neither commit has been
pushed, and the workflow has not been dispatched.

## Pending Platform Evidence

The manual `Global lifecycle isolation` workflow is configured for
`ubuntu-24.04`, `macos-15`, and `windows-2025` with Node.js `24.14.0`. It is
committed locally but has not been pushed or dispatched. Hosted Linux, macOS,
and Windows results and the macOS/Windows lifecycle link-or-copy observations
therefore remain pending.
