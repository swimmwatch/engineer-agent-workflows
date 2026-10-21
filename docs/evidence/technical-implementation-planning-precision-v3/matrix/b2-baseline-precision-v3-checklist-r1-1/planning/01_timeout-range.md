# 01 — Expand the timeout range

Status: pending explicit implementation authorization. One dependency-free Node.js packet for B2-001–B2-004. Stop after this packet; planning approval does not authorize execution.

## Inputs and prerequisites

- Authoritative contract: `docs/specs/b2/spec.md`, B2-001 (lines 7–10), B2-002 (11–14), B2-003 (15–18), B2-004 (19–22). Query exact definitions through MCP; do not read workflow YAML directly.
- source_version: `1fbe7d2e673d91649b1a45d259908ff545982ad1eab6d861068b2067360c9354`
- specification_version: `4f85f3b995a54ce1e1fdbf8de5895c3b8c9cea70c58f9119a7ea8325efe35862`
- review_ref: `8f13a2c1-c5ff-4a67-ab32-5c76dd3addb6`
- MCP-confirmed Lite/core; no profile contracts, product linkage or design dependency. Frozen behavior decision `e9908c4f-0a6d-4ef5-abcb-1b1e256962d7` revision 1; scope decision `scope.manifest` revision 2.
- Before execution and completion, call specification_check_state with pinned expected_source_version. Require pass/reviewed/Approved and matching versions; return drift to specification/planning rather than adapting scope.
- Reverify `configuration.mjs:1–5`, `cli.mjs:2–4`, `test.mjs:1–4`, `test-process.mjs:6–27`, `package.json:5` and readable Git status (including staged/untracked changes). Existing staged additions are user state. No dependent packets. Use installed Node/npm only; never install or initialize Git.

## Scope and ownership

Allowed behavior edit: `configuration.mjs`; test edit: `test.mjs`; execution bookkeeping: tasks/todo.md and tasks/handoff.md. Preserve all other content, especially unrelated.txt, cli.mjs, test-process.mjs, package.json and existing staged changes. No abstractions, dependencies, new public APIs, commits, publication or external actions.

Keep `parseTimeout(raw)` as the synchronous stateless validation/conversion owner: undefined → 5000; ASCII decimal integer strings representing 1..60 inclusive, including leading zeroes → seconds × 1000; invalid strings → Error('INVALID_TIMEOUT'). No trimming, signs or fractional syntax. CLI remains a one-shot consumer: success writes exactly JSON `{timeoutMs,format:'json'}` plus newline; failure writes empty stdout, `INVALID_TIMEOUT\n` to stderr, exits 2. Dependency remains CLI → configuration. The existing runCli helper owns child execution and descriptor cleanup; preserve it and use its actual status/signal/streams. No migration or persistent-state lifecycle is involved.

## Test-first sequence and acceptance

Working directory: application root supplied with this task. All shell commands use rtk. Tests below are to create in test.mjs; the runner already exists.

1. Before production edits, retain the existing test and add unit checks: undefined → 5000 (B2-001); each string 1..60 and padded equivalents such as `01`, `0011`, `060` → numeric seconds × 1000 (B2-002). Assert exact Error message INVALID_TIMEOUT for `0`, `00`, `61`, `061`, `999`, a very long digit string, `1.5`, `+1`, `-1`, ` 1`, `1 `, empty string, `abc`, `1e1`, `0x10` and non-ASCII digits (B2-003). These are observable input/output tests, not assertions mirroring implementation structure.
2. Add real CLI tests using imported `runCli([], {env: {TIMEOUT_SECONDS: raw}})` from test-process.mjs. Success cases include unset (override undefined so inherited environment cannot leak), `1`, `10`, `11`, `60`, `060`; assert exact stdout `{"timeoutMs":<expected>,"format":"json"}\n`, stderr empty, status 0 and signal null. Exercise every invalid category above with exact stdout empty, stderr `INVALID_TIMEOUT\n`, status 2 and signal null (B2-001–003). Do not replace subprocess checks with imports/mocks or relax stream/exit assertions.
3. RED: run `rtk proxy npm test` before implementation. Record relevant assertion failures: `11`/`60` and padded expanded-range values currently throw or make CLI exit 2. A harness/import failure is not valid RED; repair the test setup. Existing default and rejection checks should remain green.
4. GREEN: make the smallest parser range change consistent with the contract; keep lexical validation, default, conversion and export intact. Run `rtk proxy npm test`; fix implementation until correct assertions pass. Never weaken a correct test to obtain green.
5. PROVE: direct value assertions that failed in RED need no extra mutation. Existing CLI error/empty-stream behavior is an unchanged baseline and requires regression checks, not mandatory mutation. If any changed-behavior assertion did not execute in RED, was added after implementation, or observes structure/absence at an affected boundary, temporarily break that single behavior, run `rtk proxy npm test` to demonstrate the relevant assertion fails, restore it and rerun green. Record any mutation and detection.
6. Final verification: `rtk proxy npm test`; `rtk proxy git diff --check -- configuration.mjs test.mjs docs/specs/b2/tasks`; `rtk proxy git diff -- configuration.mjs test.mjs docs/specs/b2/tasks`; `rtk proxy git status --short`. Inspect staged and unstaged scoped changes without content-diffing workflow YAML. Confirm only authorized packet files changed and unrelated.txt remains byte-for-byte and attribute-for-attribute unchanged against the pre-execution state. Preserve existing helper, package test command, and pre-existing staged content (B2-004). Recheck pinned MCP state.

Checks target the installed Node fixture runtime; no broader platform claim. No rollout/deployment gate or external step is needed. Local recovery restores only this packet's edits, never resets staged fixture files. If a required check is unavailable or fails, keep the checklist incomplete and record the blocker. On success, mark the single todo item complete, replace handoff with exact changes and RED/GREEN/PROVE/final evidence, and stop. Review and any later workflow require a separate invocation.
