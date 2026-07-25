# Packet 09: Global Lifecycle Isolation

Requirements: HOST-003, HOST-004, TOOL-001, TOOL-002, TOOL-003, DIST-001,
DIST-002, DIST-003, DIST-004, DIST-005, SEC-001, SEC-003, ACC-002, ACC-003.

## Outcome

Build an automated, test-only harness that proves the pinned upstream
`skills@1.5.20` global `add`, `list`, `update`, and `remove` lifecycle on Linux,
macOS, and Windows without changing a consuming project or any real Codex,
Claude, npm, Git, or user-home state.

## Prerequisites

- Packet 08 is complete and the repository is a valid Agent Skills source with
  generated explicit-only host metadata.
- The selected public repository identity is known. For pre-publish tests, use
  an isolated local Git fixture or immutable archive supported by the pinned
  CLI; do not invent a remote.
- Node.js 22.20.0 or newer and network/package-cache access to exactly
  `skills@1.5.20` are available in the test environment.
- Read the pinned CLI's stable `--help` for `add`, `list`/`ls`, `update`, and
  `remove`; capture sanitized fixtures before encoding command assumptions.

## Scope

- Add a cross-platform test harness that spawns pinned `npx` commands directly.
- Isolate home, config, cache, npm, Codex, Claude, MCP, and consuming-project
  paths.
- Test one standalone skill, the complete bundle, and an upstream-allowed
  individual bundle-required skill.
- Prove listing, explicit update, removal, shared canonical release content,
  and no project writes.
- Record the pinned package integrity and actual unknown-skill behavior.

## Non-Goals

- Do not ship the harness as a CLI, installer, wrapper, package binary, or
  lifecycle API.
- Do not touch the operator's actual global skills, profiles, MCP config,
  project `.agents/skills`, or project `.claude/skills`.
- Do not use project scope, `skills init`, experimental lock restore, managed
  rollback, background update, or custom dependency resolution.
- Do not claim host discovery/invocation; packet 10 owns host behavior.
- Do not publish or create a remote.

## File And Symbol Boundaries

| File/unit | State | Contract |
| --- | --- | --- |
| `tests/lifecycle/isolated-profile.mjs` | Proposed | `createIsolatedProfile(t, platform)`, `environmentFor(profile)`, `assertProfileContained(profile)`; models POSIX/Windows homes and caches under one temp root. |
| `tests/lifecycle/project-snapshot.mjs` | Proposed | `snapshotProject(root)`, `assertProjectUnchanged(before, after)` using packet-01 deterministic file hashing. |
| `tests/lifecycle/skills-command.mjs` | Proposed | Test-only `runSkills(args, {cwd, env, timeout})`; always expands to `npx --yes skills@1.5.20`, disables telemetry, bounds output/time, and redacts temp roots. |
| `tests/lifecycle/source-fixture.mjs` | Proposed | Creates an isolated local source/release identity without editing canonical or consuming projects. |
| `tests/lifecycle/global-lifecycle.test.mjs` | Proposed | Shared add/list/update/remove and classification scenarios. |
| `tests/lifecycle/platform-paths.test.mjs` | Proposed | Linux/macOS/Windows environment/path behavior independent of runner OS. |
| `tests/fixtures/skills-cli-1.5.20/` | Proposed | Sanitized package identity/help/observed unknown-skill behavior; no npm token, cache, or personal path. |
| `docs/evidence/skills-cli-1.5.20.md` | Proposed | Reviewed version, Node engine, integrity, stable commands, observed link/copy layout, and limitations. |
| `package.json` | Existing | Add test scripts only; no binary, installer, dependency, lifecycle state, or floating package version. |

## Command Contract

Every spawned lifecycle command:

- uses `DISABLE_TELEMETRY=1`;
- invokes exactly `npx --yes skills@1.5.20`;
- passes `--global`;
- names `--agent codex` and/or `--agent claude-code`;
- selects one explicit standalone name, the observed individual
  bundle-required name, or `--skill '*'`;
- uses only stable add/list/update/remove syntax confirmed by pinned `--help`;
- runs from an isolated sentinel consuming project;
- receives bounded stdin/stdout/stderr and timeout/cancellation;
- never inherits credentials, npm auth, real home/config/cache variables, MCP
  variables, or unrelated environment.

Normative complete install:

```text
DISABLE_TELEMETRY=1 npx --yes skills@1.5.20 add <source> --global \
  --agent codex --agent claude-code --skill '*' --yes
```

Normative standalone install substitutes the exact standalone skill after
`--skill`. Update/list/remove commands must use the pinned stable global syntax
observed from `skills@1.5.20`; never rely on current-directory default scope.

## Isolation Contract

- Create all test homes, XDG/AppData directories, npm cache/config, Git config,
  host state, source fixture, and consuming project under one test-owned
  temporary directory.
- Set `HOME`, `USERPROFILE`, `APPDATA`, `LOCALAPPDATA`, XDG variables, npm
  cache/config, and Git config to those paths as appropriate.
- Clear proxy/auth/token/signing/MCP/client state unless the test explicitly
  provides a safe fixture.
- Snapshot the consuming project before and after source discovery, add, list,
  update, remove, failure, and cancellation.
- Fail if `.agents/skills`, `.claude/skills`, a project skill lock/manifest, or
  any unrelated project byte appears or changes.
- Fail if any resolved write escapes the temporary root or if output contains
  a private sentinel.
- Never recursively search development roots for copies.

## Lifecycle Scenarios

1. List the repository source without installation and observe all 15 skills.
2. Install one standalone skill globally for both agents and verify only that
   selection plus its contained assets.
3. Remove it globally and verify absence.
4. Install `'*'` for both agents and verify all 15 identities.
5. Prove both agent targets reference byte-identical canonical release content;
   record whether the pinned CLI uses links or copies without asserting an
   undocumented storage path.
6. List global installations and match the complete identity set.
7. Change only the isolated source fixture compatibly, run explicit global
   update, and verify new bytes with no project writes.
8. Remove the complete global installation and verify only isolated global
   state changed.
9. Individually install a bundle-required skill as upstream permits; leave its
   invocation failure to packet 10 and document that the project provides no
   custom dependency resolver.
10. Run an unknown skill name, record exact pinned upstream behavior, and avoid
    inventing a project-owned error.
11. Cancel/timeout a command and verify cleanup and project invariance.

## Acceptance Criteria

- Shared lifecycle scenarios pass on Linux, macOS, and Windows CI runners.
- The source lists exactly the 15 stable identities.
- Standalone and complete selections install globally for both explicit agent
  targets.
- List/update/remove work only in isolated global state.
- Consuming project snapshots are byte-for-byte identical after every case.
- No real profile path, credential, telemetry, or MCP state is read or written.
- The integrity fixture exactly matches the approved npm integrity identity.
- `package.json` still exposes no binary or lifecycle dependency and normative
  commands never float the package version.
- Failures are bounded, redacted, and clean temporary processes/files.

## Verification

On the current platform:

```bash
npm test -- --test-name-pattern='global lifecycle|isolated profile'
npm run test:lifecycle
npm run validate
npm run generate:check
```

In clean Linux, macOS, and Windows CI or separately authorized local runners,
run `npm run test:lifecycle` with network/cache access limited to the pinned npm
package. Verify temp directories are removed. Review:

```bash
grep -RInE 'skills@(latest|next)|skills init|--project' \
  docs package.json scripts tests
```

## References

- [Approved specification](../spec.md): platform/version, upstream tool,
  global/plugin distribution, isolation, supply-chain, and lifecycle
  acceptance contracts.
- Pinned upstream package: `skills@1.5.20`; use its captured stable help and
  reviewed npm integrity, never a floating version.

## Completion And Handoff

- Mark only packet 09 complete after current-platform tests and the configured
  cross-platform jobs pass; otherwise record the missing platform gate.
- Record exact upstream help/version/integrity, commands, link/copy behavior,
  project hashes, platform results, and packet 10 next.
- Stop. Do not install into a real profile, commit, publish, or start packet 10.
