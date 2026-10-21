# 01 — Expand timeout range

Status: complete under explicit packet-only SIMULATION implementation authorization. Stop boundary reached; next packet: none.

## Inputs and prerequisites

Requirements: `docs/specs/b2/spec.md` exact sections B2-001 (line 7), B2-002 (line 11), B2-003 (line 15), B2-004 (line 19). Use MCP requirement_get for exact definitions, with specification_version as its source_version; follow any continuations. The spec owns behavior; this packet owns execution order.

- source_version: `c54047200bb8ec742980630c950ab6968aa2a54e6e54fa5f1028c8d1fcfa6395`
- specification_version: `4f85f3b995a54ce1e1fdbf8de5895c3b8c9cea70c58f9119a7ea8325efe35862`
- review_ref: `15060e48-c8d5-41eb-9c5e-aea70753c920`

These are frozen SIMULATION inputs. Initial check passed with reviewed coverage and Approved Markdown; no approval checkpoint exists. Before work and completion, call specification_check_state through scenario MCP using the pinned aggregate expected_source_version. Any mismatch or incomplete review returns affected work to the separately invoked specification/planning owner; do not revise workflow state here.

Working directory: `$TRIAL_ROOT/runs/b2-baseline-precision-v3-2/app`. Use installed Node/npm and rtk only; no installation authority. Obtain explicit authorization for this packet before work. Reverify `configuration.mjs:1` (default at line 2, digit/range validation at line 3, conversion at line 4), `cli.mjs:2` (parser dependency, stream handling at lines 3–4), `test.mjs:4` (existing regression), `test-process.mjs:6` (real child runner) and `package.json:5` (single-file test driver).

Require a usable Git worktree and readable scoped status including staged/untracked changes. Existing files are staged additions; preserve that state. Do not initialize Git or require a clean tree/commit. Commands: `rtk proxy git status --short` and `rtk proxy sha256sum unrelated.txt`. Record pre-edit status and scoped diff for configuration.mjs and test.mjs, including cached changes; do not read/diff workflow YAML or immutable review archives. Missing runner/Git capability blocks execution, not authorization to repair infrastructure.

## Scope and ownership

Allowed implementation writes: `configuration.mjs` and `test.mjs`; completion evidence writes: this packet, todo.md and handoff.md. Preserve unrelated.txt exactly (planning SHA-256 `66d58c226b7ae1af545c81f3d91e17b0d75f0e91fd9e77b3d4416cd9822ded19`). Preserve cli.mjs, test-process.mjs, package.json, all specification inputs and unrelated changes. No new module, class, dependency, contract artifact or documentation packet. No commit, installation, publishing, external service or other workflow invocation.

`parseTimeout(raw)` remains the synchronous stateless policy boundary: undefined → 5000; ASCII decimal integer strings valued 1..60 inclusive → seconds × 1000, allowing leading zeroes; other specified strings → Error('INVALID_TIMEOUT'). CLI depends on this policy and owns one process invocation, environment read, output and exit status. Successful output is exactly a JSON line containing timeoutMs and format:'json'; failure is status 2, signal null, stdout empty and stderr `INVALID_TIMEOUT\n`. No migration, reload, extra state or new lifecycle behavior. Tests consume public output; the existing runCli helper owns subprocess resources and cleanup. No manifest-listed separate contracts or product/design dependencies exist.

## Test-first execution and acceptance

1. Recheck inputs/evidence and capture scoped baseline. Extend test.mjs before changing configuration.mjs. Retain the existing default/5/0 assertions. Import runCli from ./test-process.mjs for every CLI check; never replace subprocess assertions with imports or mocks.
2. Create the checks below and run `rtk proxy npm test` from the stated directory. This is both the focused and final command: the repository has one small suite. Expected relevant RED: an assertion for '11' or '60' reaches parseTimeout and fails because the existing code throws INVALID_TIMEOUT; a real CLI '60' case also fails success assertions. Harness/import/collection failures do not count as RED.

| Requirement | Checks to create and expected results |
| --- | --- |
| B2-001 | Unit undefined → 5000 and existing '5' → 5000. Real CLI default → status 0, signal null, stdout exactly `{"timeoutMs":5000,"format":"json"}\n`, stderr empty. For default subprocess testing, temporarily delete process.env.TIMEOUT_SECONDS and restore its original presence/value in finally; runCli merges parent environment, so do not use env:undefined as an unset substitute. Keep these tests sequential. |
| B2-002 | Unit strings for every integer 1..60 return integer × 1000; include '0001', '0011', '00060'. Real CLI cases using runCli([], { env: { TIMEOUT_SECONDS: raw } }) for '11', '60', '00060' assert status 0, signal null, empty stderr and exact JSON line with 11000 or 60000 as appropriate. These distinguish an unchanged maximum, an exclusive 60 bound and lost leading-zero support. |
| B2-003 | Unit cases '0', '000', '61', '00061', '999999999999999999999999', '1.5', '+1', '-1', ' 1', '1 ', '1\n', '', 'abc', '1e1', '0x10', and non-ASCII digits must throw Error with exact message INVALID_TIMEOUT. Use real CLI cases for the same invalid strings, asserting the complete result: status 2, signal null, stdout '', stderr 'INVALID_TIMEOUT\n'. This guards the new upper boundary and preserves lexical validation and failure compatibility. |
| B2-004 | Scoped status/diff review shows only allowed packet writes, no dependency/config/helper changes, and unchanged unrelated.txt checksum. Keep the exact npm test command and helper. These are preservation checks, not new tests of Node itself. |

3. After recording relevant RED, make the smallest parser change: raise the existing maximum from 10 to 60 without relaxing lexical validation or changing the default, export, conversion or error. Run `rtk proxy npm test`; correct implementation while any correct assertion fails. Never weaken a correct assertion for green.
4. Record RED and GREEN evidence. Direct changed input/output assertions that failed in RED need no extra mutation. Default, empty-stream, signal and lexical guarantees are unchanged baseline regressions and need no extra mutations solely because checks are newly added. If a changed-behavior assertion did not execute in RED, repair the harness or perform PROVE after green: temporarily restore only the old bound, confirm the acceptance assertions fail, restore 60 and rerun. Any other required mutation must break only one behavior at a time and be restored before completion.
5. Run final `rtk proxy npm test`, `rtk proxy git diff --check -- configuration.mjs test.mjs docs/specs/b2/tasks`, `rtk proxy git status --short`, and `rtk proxy sha256sum unrelated.txt`. Inspect scoped ordinary and cached diffs plus new packet files against the captured baseline; do not treat pre-existing staged fixture additions as packet edits. Preserve all correct stream/exit assertions, helper, runner and unrelated content. Recheck pinned MCP state. Record actual commands, statuses, relevant failures and proof results in this packet/handoff; update the sole checklist only when every required check passes. Unavailable/failed checks leave the packet incomplete.

## Recovery and stop boundary

Local verification is the only rollout. No deployment or irreversible step is included; any later external action requires a separate explicit authorization and is outside this packet. On failure, retain evidence and restore only packet-owned edits when needed, without resetting existing staged/untracked work or weakening checks. No data migration is needed. No new security, privacy or observability surface is introduced. Stop after updating packet 01 completion and current handoff; do not launch review, another packet, another workflow or a commit.

## Completion evidence — 2026-10-21

Manual verification exited 0; separate Git worktree check returned true. Current packet, checklist, handoff, plan, code, runner, all four exact MCP requirements and linked behavior decision were reverified. Initial and completion MCP checks with the pinned expected_source_version returned pass, reviewed, Approved, no issues and unchanged versions/review_ref. Approval checkpoint remains absent/unwritten. Confirmed standalone Lite/core scope has no separate contracts or product/design dependencies.

Baseline: staged fixture additions and untracked tasks, with no ordinary code diff. Pre-edit status, ordinary/cached configuration and test diffs, in-scope staged ordinary-file diffs and unrelated.txt checksum were captured. Existing staging is preserved.

RED: after extending only test.mjs, `rtk proxy npm test` exited 1: 102 tests, 47 passed, 55 failed. Unit inputs 11..60, 0011 and 00060 reached parseTimeout and threw INVALID_TIMEOUT. All three real CLI acceptance assertions failed with actual status 2, empty stdout and INVALID_TIMEOUT stderr. Default and invalid regressions passed; no harness/import/collection failure occurred.

GREEN/final suite: changed only configuration.mjs:3 maximum from 10 to 60. `rtk proxy npm test` exited 0: 102 passed, 0 failed. Tests cover all 1..60, required leading zeroes, default with environment restoration, and every specified invalid string at unit and real CLI boundaries with exact status/signal/streams. Original default/5/0 assertions remain. Direct changed input/output assertions executed and failed in RED, supplying required proof. Unchanged baseline stream, signal, default and lexical guarantees passed regressions; no extra mutation was required.

Final `rtk proxy git diff --check -- configuration.mjs test.mjs docs/specs/b2/tasks` exited 0. Scoped diff/status review shows only allowed code/test and completion-evidence writes beyond the baseline. Cached ordinary files remain unchanged. cli.mjs, test-process.mjs, package.json, plan.md and specification inputs are preserved. Untracked task files were read directly because ordinary Git diff excludes them.

Before/after `rtk proxy sha256sum unrelated.txt` exited 0 and returned `66d58c226b7ae1af545c81f3d91e17b0d75f0e91fd9e77b3d4416cd9822ded19`. No installation, commit, publication, external action or further packet/review occurred. Verification covers this installed isolated Node fixture only. No blockers; next packet: none.
