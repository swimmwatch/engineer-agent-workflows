# DeepSeek Harness Export Evidence

Date: 2026-10-25. Environment: Linux, Node.js 24.20.0.
Scope: the user-approved filesystem export plan; no installation into Harness,
global configuration mutation, model call, commit, push or publication.

## Test-first evidence

The initial `tests/deepseek-export.test.mjs` run failed all six tests before
implementation: unsupported target, absent output and invocation policy, missing
managed export behavior. During implementation two test fixture assumptions were
corrected: incomplete source means a missing skill directory, and publication
failure injection targets the generator's actual `staged` directory.

The initial targeted suite then passed 18/18. Later checks added prototype-name
target rejection, unknown/malformed shared placeholders and rendered-resource
tamper detection. Prototype-name rejection was independently observed RED before
the renderer changed to an own-property target lookup. The affected final suite
passed 49/49.

The first full repository run failed the old workflow-efficiency assertion that
shared resources were byte-identical across hosts. That assertion now compares
against host-rendered bytes for Codex, Claude Code and Harness, while retaining
the original obligation hashes and instruction-byte budget check. The subsequent
root suite passed 361/361 before the additional shared-placeholder test was added.

## Exact upstream provider

Source: DeepSeek Harness 0.2.1-rc.3, commit
`22ddee3792402c3e70ec5f86a63c3e3e895a2f60`,
`packages/skill/skill-filesystem/src/index.ts`.
Source SHA-256:
`4be3a8f4142b27e07093cff1757876a80a344dd6f664a38775069244b89f4ec4`.
The exact source was transpiled with the repository's TypeScript 6.0.3 compiler,
retaining its real filesystem provider and YAML parser; it was not replaced by
a fixture parser.

Runtime packages were provisioned with `--ignore-scripts --no-audit --no-fund`
in a task-owned temporary npm prefix. Direct packages:
`@deepseek-ai/dsh-skill-filesystem@0.2.1-rc.3` and
`@deepseek-ai/cordis@4.0.5`. Resolved peer runtime included
`@deepseek-ai/dsh-skill@0.2.1-rc.3`,
`@deepseek-ai/dsh-home-paths@0.2.1-rc.3` and
`@deepseek-ai/schemastery@3.18.5`, with `chokidar@5.0.0` and `yaml@2.9.1`.

`node scripts/verify-deepseek-export.mjs <absolute-built-provider-module>` passed:
17 discovered, 17 loaded, no warnings, every policy exactly
`{modelInvocable: false, userInvocable: true}`. Each loaded body matched the
generated file and had a directory resource base. Default roots and watching
were disabled; temporary home paths prevented use of real personal skill roots.
The minimal host context supplied optional-service lookup and warning collection;
discovery, parsing and loading were performed by the real upstream provider.

## Verification boundary

This proves filesystem discovery/loading and invocation metadata. It does not
prove native UI invocation, model-facing loader integration, callable question or
delegation behavior, or model execution. Those were not run. Runtime tool schemas
and supported model routes must still be checked by the skills in each session.
macOS and Windows native provider execution were not exercised.

## Final checks

- `npm test -- --test-concurrency=4`: **1116 passed, 0 failed**, 206.36 seconds.
  Its pretest built the MCP successfully.
- `npm run lint`: passed.
- `npm run validate`: passed, 17/17 skills present.
- `npm run generate:check`: passed, 17 skills.
- `git diff --check`: passed.
- The actual upstream filesystem provider check passed for all 17 skills.

The generated filesystem export contains 136 files, 749331 bytes. Its largest
SKILL.md is 4052 bytes; the largest canonical SKILL.md is 4091 bytes. Descriptions
retain the catalog's enforced 240-code-point budget. No required follow-up remains.

## Review corrections

The user subsequently authorized both P2 review corrections and regression tests.
Two new tests first reproduced the defects: a valid host placeholder in the shared
product protocol caused `E_PRODUCT_BUNDLE_MISMATCH`, and a templated engineering
manual left plugin catalog metadata with the canonical digest.

Product bundle hashing now renders the protocol before hashing. Each plugin
catalog reuses its generated host-specific engineering-manual marker. Canonical
markers continue to cover unrendered source bytes. Regression checks run the real
bundle verifiers across canonical, Codex, Claude Code and Harness layouts, and
also reject a product protocol modified after generation.

After the fixes, both new tests passed and the affected five-file test set passed
73/73. `npm run validate`, `npm run generate:check` and `git diff --check` passed.
The current templates produce unchanged generated files. The earlier full
1116-test run and upstream provider probe were not repeated for these corrections;
no MCP runtime, provider integration or dependency changes were made.
