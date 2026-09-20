# Packet 09: Host-Specific Global Lifecycle Isolation

Requirements: HOST-003, HOST-004, TOOL-001, TOOL-002, TOOL-003, DIST-001,
DIST-002, DIST-003, DIST-004, DIST-005, SEC-001, SEC-003, ACC-002, ACC-003.

## Outcome

Prove with an automated test-only harness that the pinned
`skills@1.5.20` CLI can install, inspect, replace, and remove the distinct
Codex and Claude Code global artifacts without changing a consuming project or
any real user, client, npm, Git, or MCP state.

## Prerequisites

- Packet 08 generated both host-specific plugin roots.
- Node.js 22.20.0 or newer and the exact reviewed `skills@1.5.20` package are
  available.
- Sanitized `--help`, package integrity, and unknown-skill evidence are
  captured before command assumptions are encoded.
- All lifecycle sources, homes, caches, repositories, remotes, and consumer
  projects used by tests remain under one temporary test-owned root.

## Scope

- Create one isolated Git source from the generated Codex bundle and a second
  source from the generated Claude Code bundle.
- Exercise one standalone skill, the complete bundle, and the upstream-allowed
  individual installation of one bundle-required skill.
- Install with one `add --copy` command per source and agent.
- Inspect with agent-specific global list commands.
- Replace an installed skill by repeating each matching host-specific
  `add --copy` command after a compatible source update.
- Remove selected or complete global installations.
- Prove project and profile containment after every operation.

## Non-Goals

- Do not use `skills update`: the pinned command has no `--agent` option and
  cannot preserve two host-specific artifacts with the same skill name.
- Do not add a project lifecycle wrapper, dependency resolver, rollback store,
  direct writes to `.agents/skills` or `.claude/skills`, or a runtime
  executable.
- Do not test real Codex or Claude discovery in this packet; packet 10 owns host
  acceptance.
- Do not install into a real profile or create an external repository.

## Architecture And Ownership

| File or unit | Responsibility and boundary |
| --- | --- |
| `tests/lifecycle/isolated-profile.mjs` | Creates contained POSIX and Windows-style homes, config, cache, temp, consumer, and Git paths; strips inherited secrets and risky environment state. |
| `tests/lifecycle/project-snapshot.mjs` | Hashes the complete consumer tree and proves byte identity before and after each command. |
| `tests/lifecycle/skills-command.mjs` | Allows only pinned, global, shell-free add/list/remove invocations; requires one agent plus `--copy` for every add; bounds and redacts output. |
| `tests/lifecycle/source-fixture.mjs` | Creates separate Codex and Claude Code Git repositories and loopback-only smart-Git endpoints under the temporary root. |
| `tests/lifecycle/global-lifecycle.test.mjs` | Exercises both sources and verifies each agent receives only its matching bytes. |
| `tests/lifecycle/platform-paths.test.mjs` | Verifies command policy, modeled platform paths, containment, cancellation, timeout, and process reaping. |
| `docs/evidence/skills-cli-1.5.20.md` | Records the reviewed command contract and observed limitations. |

## Command Contract

Every add or replacement is one of these shapes:

```text
DISABLE_TELEMETRY=1 npx --yes skills@1.5.20 add <codex-source> \
  --global --agent codex --skill <name-or-*> --copy --yes

DISABLE_TELEMETRY=1 npx --yes skills@1.5.20 add <claude-source> \
  --global --agent claude-code --skill <name-or-*> --copy --yes
```

Every list command names exactly one agent and uses `--global --json`. Removal
uses explicit global agent and skill selection, or explicit global agents with
`--all`. No normative command selects project scope, targets both agents from
one source, floats the package version, or invokes `update`.

## Lifecycle Scenarios

1. Discover all 15 identities in each source without installation.
2. Install one standalone skill into Codex from the Codex source and into
   Claude Code from the Claude source.
3. Prove both installed entries are copies and byte-identical to their own
   source, while their host-specific substitutions remain different.
4. List each agent's global installation.
5. Remove the standalone skill.
6. Install all 15 skills with two host-specific complete-bundle commands.
7. Prove every installed skill equals its matching source and no selected skill
   resolves through the other host's content.
8. Change only the isolated Codex and Claude source fixtures, repeat the two
   standalone `add --copy` commands, and verify both markers without changing
   any unrelated installed skill.
9. Remove the complete installation.
10. Install one bundle-required skill alone as upstream permits and leave its
    invocation-time complete-bundle failure to packet 10.
11. Record the exact pinned unknown-skill behavior.
12. Cancel and time out representative allowed commands; verify cleanup,
    containment, bounded output, and project invariance.

## Safety Contract

- Each child receives only test-owned `HOME`, `USERPROFILE`, AppData, XDG,
  npm, Git, and temporary locations.
- Credentials, proxy settings, signing configuration, client state, MCP
  variables, and user runtime options are not inherited.
- Commands run without a shell. Output is size-bounded, ANSI-normalized, and
  temporary roots are redacted.
- Timeout or cancellation terminates the process tree, escalates if necessary,
  and waits for reaping.
- Every symbolic link or junction encountered while auditing the test profile
  must resolve inside the temporary root.
- No recursive search may inspect development roots or real profiles.

## Acceptance Criteria

- Both sources list exactly the 15 stable identities.
- Separate `add --copy` commands install the standalone and complete
  selections globally for the matching agents.
- Codex and Claude Code installed trees differ where host values differ and
  otherwise match their corresponding generated sources.
- Repeated host-specific adds replace selected copies; `skills update` is not
  used.
- List and remove operate only on isolated global state.
- The consumer project snapshot remains byte-for-byte identical after every
  command.
- No real profile path, credential, telemetry, MCP state, or unrelated
  environment value is read or written.
- The reviewed package version and integrity match release metadata.
- Shared scenarios pass on Linux, macOS, and Windows runners, or missing runner
  evidence is recorded as an explicit manual gate.

## Verification

```bash
node --test tests/lifecycle/platform-paths.test.mjs
node --test tests/lifecycle/global-lifecycle.test.mjs
npm run test:lifecycle
npm run validate
npm run generate:check
git diff --check
```

The cross-platform GitHub Actions workflow remains manual, least-privilege, and
secret-free. Do not describe unrun macOS or Windows jobs as passing.

## Completion And Handoff

Record the exact package identity, the two source shapes, command vectors,
project snapshot result, platform evidence, and packet 10 as the next owner.
Stop without real-profile installation, commit, publication, tag, push, or
packet-10 execution.
