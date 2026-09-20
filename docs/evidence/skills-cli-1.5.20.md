# `skills@1.5.20` Lifecycle Evidence

Reviewed: 2026-09-04

## Identity

- Package: `skills`
- Version: `1.5.20`
- Required Node.js: `>=22.20.0`
- npm integrity:
  `sha512-lPl5KzMfTW+qwHFwc8t6R+wAqmdmSHw1+HWbGdJ/FZYbWLdB34bAZNFWiencM5DVoRaKAgXArmfTWMlNAbl9Gg==`
- Telemetry opt-out: `DISABLE_TELEMETRY=1`

The repository has no runtime dependency on this package. Tests execute the
reviewed package only through `npx --yes skills@1.5.20`, with an isolated npm
cache, Git configuration, user profile, and consumer project.

## Relevant Upstream Constraint

By default, the pinned CLI tracks one canonical global skill instance per skill
name and may link that instance into multiple clients. That layout cannot
represent two different generated artifacts with the same 15 skill names.

The `update` parser also has no `--agent` option. Passing
`--agent codex` to `update` does not select Codex; it is parsed as
positional input. Consequently, this collection does not use `skills update`
as a normative operation.

The verified compatible model is:

1. generate a Codex-only source and a Claude-Code-only source;
2. add each source to exactly one matching agent with `--copy`;
3. replace an installed artifact by repeating that same host-specific add.

## Reviewed Commands

Codex complete installation or replacement:

```text
DISABLE_TELEMETRY=1 npx --yes skills@1.5.20 add <codex-source> \
  --global --agent codex --skill '*' --copy --yes
```

Claude Code complete installation or replacement:

```text
DISABLE_TELEMETRY=1 npx --yes skills@1.5.20 add <claude-source> \
  --global --agent claude-code --skill '*' --copy --yes
```

A standalone installation uses the same command shapes with, for example,
`--skill code-review-and-quality`.

Agent-specific global listing:

```text
npx --yes skills@1.5.20 list --global --agent <agent> --json
```

Confirmed global removal:

```text
npx --yes skills@1.5.20 remove --global \
  --agent codex --agent claude-code --all --yes
```

All normative add commands use exactly one agent. Every add uses `--copy`.
Project scope and floating package versions are rejected by the test harness.

## Pre-Publication Source

The acceptance harness creates two repositories entirely inside one temporary
root:

- a Codex source copied from
  `plugins/codex/engineer-agent-workflows/`;
- a Claude Code source copied from
  `plugins/claude-code/engineer-agent-workflows/`.

Each repository has a contained bare remote exposed through a loopback-only
smart-Git endpoint. This provides genuine upstream add and repeat-add
provenance without creating or mutating an external repository.

The consumer project, homes, XDG/AppData directories, npm cache and config, Git
configuration, sources, remotes, and temporary files all remain inside the
test-owned root. Child commands inherit no credentials, proxy configuration,
MCP state, signing configuration, or user runtime options.

## Observed Linux Behavior

Local verification on 2026-09-04 observed:

- each source lists the same 15 stable skill identities;
- Codex receives bytes from only the Codex source;
- Claude Code receives bytes from only the Claude Code source;
- `--copy` creates directory entries for both agents rather than a shared
  cross-agent symlink;
- standalone and complete-bundle installation succeeds through separate
  host-specific add commands;
- repeating both matching add commands replaces the selected skill while
  unrelated installed skills remain byte-identical;
- global per-agent listing and confirmed removal succeed;
- an upstream-allowed bundle-required single-skill installation succeeds, with
  its invocation-time bundle check remaining the project's responsibility;
- unknown skill `definitely-not-a-skill` exits with status 1 and lists the 15
  available identities;
- every consumer-project snapshot remains byte-identical.

## Pending Platform Evidence

The manual `Global lifecycle isolation` workflow is configured for
`ubuntu-24.04`, `macos-15`, and `windows-2025` with Node.js 24.14.0. Those
jobs have not been dispatched as part of this local change. Linux local
evidence does not claim macOS or Windows execution.
