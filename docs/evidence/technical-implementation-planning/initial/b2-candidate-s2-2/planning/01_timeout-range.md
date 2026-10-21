# b2-01: Expand the timeout range

## Technical proposal

Proposal `b2-timeout-existing-boundary` covers packet `b2-01` and B2-001 through B2-004 in `docs/specs/b2/spec.md`, exact requirement headings B2-001 through B2-004. Retain the dependency-free ES module function/configuration boundary. The binding export is `parseTimeout(raw)` in `configuration.mjs`: undefined returns 5000; ASCII decimal integer strings representing 1..60 inclusive, including leading zeroes, return seconds multiplied by 1000; invalid input throws Error with message INVALID_TIMEOUT. Retain digit validation and numeric bounds, raising the existing upper bound to 60. No classes, new modules, dependencies, trimming, permissive numeric parsing, or new configuration policy are needed; equivalent private expression organization remains flexible.

The existing `cli.mjs` consumes TIMEOUT_SECONDS once per process and calls the pure, synchronous parser. Preserve its JSON line containing timeoutMs and format:'json', success status 0, and empty stderr; errors produce status 2, empty stdout, and exactly INVALID_TIMEOUT followed by a newline on stderr. Dependency direction stays CLI -> configuration; configuration has no process or I/O dependency. No persistent state, asynchronous lifecycle, migration, or cleanup is introduced.

Extend `test.mjs` before implementation with parser boundaries, all accepted seconds 1..60 and leading-zero forms, invalid lexical categories, default compatibility, and real subprocess CLI success/failure assertions. CLI tests must use existing `test-process.mjs` runCli(args, { env }), asserting exact stdout, stderr, status and signal. Preserve that helper and package.json's existing npm test driver. Use RED, GREEN, and targeted PROVE for the empty-stdout failure guarantee; never weaken correct assertions to obtain green.

Implementation writes are limited to `configuration.mjs` and `test.mjs`, plus packet progress, todo and handoff updates. Preserve cli.mjs, package.json, test-process.mjs and unrelated fixture content, including unrelated.txt exactly. Workflow YAML remains scenario-MCP-owned. This agreement is technical planning only, with implementation requiring a separate explicit packet invocation; no installation, commit, publishing, external action or subsequent workflow is authorized.

## Technical agreement

Selected proposal: `b2-timeout-existing-boundary`; packet: `b2-01`.
Source: this file, exact heading `Technical proposal`.
Agreement ref: `{"id":"d6e1671e-08bd-4578-aaac-0ad93bf324d4","revision":2}`.
Proposal digest: `78464558aae6f2397bcbcdcd52e9424afb89f1aff70e4bef9763279e631000fd`.
Managed question revision 1 and answer revision 2 preserve native reply provenance from the frozen simulated respondent. This grants no implementation authority. Final planning_packet_check returned `ready`, issues empty, against the exact binding above; final specification_check_state returned `pass`, `reviewed`, `approved` with unchanged pinned versions. Execution remains unstarted and requires separate explicit authorization.

## Inputs and prerequisites

- Aggregate source_version: `e18112d1956654b6f757b53ccee2b8724b595a3e3e73f98d0abad7f4da9d0276`.
- specification_version (also requirement_get source_version): `4f85f3b995a54ce1e1fdbf8de5895c3b8c9cea70c58f9119a7ea8325efe35862`.
- review_ref: `e9ad44c0-8368-4a1a-9538-f4891da0c80c`; observed Approved, pass, reviewed. Frozen SIMULATION input; MCP does not independently prove semantic correctness or consent.
- Confirmed Lite, core active, no profile artifacts or design outputs. Standalone task, no product linkage. Read only spec.md headings B2-001..B2-004 and current scope through MCP; reverify exact linked requirements and versions before execution.
- Separate explicit implementation invocation for b2-01 is required. No packet dependencies. Existing installed Node/npm and readable Git worktree required; do not install or initialize anything. Git status was readable with fixture files already staged; preserve that state and all unrelated changes. Inspect staged, unstaged and untracked overlap without reading workflow YAML or review archives directly.

Repository evidence to reverify: `configuration.mjs:1` exports the pure parser, `:2` owns the default, `:3` owns digit/range validation and the old maximum 10, `:4` converts to milliseconds. `cli.mjs:2` imports it, `:3` writes a JSON line and `:4` maps exceptions to stderr/status 2. `test.mjs:4` covers only the existing default, 5 and zero. `test-process.mjs:6` exports runCli, `:15` spawns the real CLI, `:17` redirects streams to file descriptors, `:20` returns status/signal/streams and `:22` cleans up descriptors and temporary files. `package.json:5` defines the installed single-file test driver. No production changes occurred during planning.

## Verification and execution order

Working directory for all commands: `/tmp/eaw-tip-p03-df48iZ/runs/b2-candidate-s2-2/app`. Prefix every shell command with `rtk`; use `rtk proxy` for exact output. The following checks are planned, not executed during planning.

1. Reopen b2 via scenario MCP. Call specification_check_state with pinned aggregate expected_source_version and planning_packet_check with the exact agreement_ref, packet_id and expected_proposal_digest above. Require pass/reviewed/Approved and ready. Recheck scoped Git status and current code evidence. Stop on conflicting changes or missing prerequisites.
2. RED: extend test.mjs using node:test and strict assertions. Preserve existing coverage and import runCli from test-process.mjs. Run `rtk proxy npm test` before changing configuration.mjs. Expect actual assertion failures for 11 and 60, including CLI success for 60, because the old maximum is 10. Harness/import/collection failures are not adequate RED; repair the checks and obtain relevant failures.
3. GREEN: change only the parser maximum to implement the agreed contract; run `rtk proxy npm test`, correcting implementation until all correct checks pass. No script, helper or CLI edits are needed.
4. PROVE: temporarily cause the CLI error path to write a marker to stdout; run `rtk proxy npm test` and require the invalid-input CLI empty-stdout assertion to fail. Restore cli.mjs exactly, then rerun `rtk proxy npm test`. This temporary mutation is permitted solely as verification and must leave no lasting CLI change. If any new check was written after behavior or RED never reached its intended assertion, apply an additional single-behavior mutation and record its failure/restoration. Direct input/output checks with relevant RED need no redundant mutation; unchanged baseline regressions need ordinary checks.
5. Final verification: `rtk proxy npm test`; `rtk proxy sha256sum unrelated.txt` must remain `66d58c226b7ae1af545c81f3d91e17b0d75f0e91fd9e77b3d4416cd9822ded19`. Review `rtk proxy git diff -- configuration.mjs test.mjs cli.mjs package.json test-process.mjs unrelated.txt` and the matching `rtk proxy git diff --cached -- configuration.mjs test.mjs cli.mjs package.json test-process.mjs unrelated.txt`, plus `rtk proxy git status --short`, preserving preexisting staged additions. No unrelated lasting changes are allowed. Repeat both MCP version/agreement checks before completion. Update todo.md, this packet's execution evidence and handoff.md only after every required check passes, then stop.

| Requirement | Owning layer and discriminating assertions |
| --- | --- |
| B2-001 | Parser: undefined -> 5000, '5' -> 5000. Real CLI default: runCli([], {env:{TIMEOUT_SECONDS:undefined}}), status 0, signal null, stdout exactly `{"timeoutMs":5000,"format":"json"}\n`, stderr exactly empty. This overrides inherited environment without changing the helper. |
| B2-002 | Parser: loop seconds 1..60, assert String(seconds) and zero-prefixed forms return seconds*1000; explicitly cover 10, 11, 59, 60 and '00060'. Real CLI '60' and '00060': status 0, signal null, stdout exactly `{"timeoutMs":60000,"format":"json"}\n`, stderr empty. The old maximum fails these assertions. |
| B2-003 | Parser invalid cases: '0', '000', '61', '00061', a very large decimal, '1.5', '+1', '-1', ' 1', '1 ', '1\n', '', 'abc', '1e1', '0x10', and non-ASCII digits; assert thrown Error message exactly INVALID_TIMEOUT. For each category use runCli([], {env:{TIMEOUT_SECONDS:raw}}); assert status 2, signal null, stdout exactly empty, stderr exactly `INVALID_TIMEOUT\n`. Do not replace real child checks with imports/mocks. |
| B2-004 | Scoped final diff, unchanged helper/test script/CLI, unchanged unrelated.txt checksum; no added dependencies or modules. Retain one packet and existing function boundary. |

The current installed Node fixture is the planned execution environment for all four requirements. The approved spec names no additional OS/runtime support matrix; do not claim unexecuted platform coverage or expand support. Use the existing single-file --test-isolation=none runner as required by AGENTS.md.

## Delivery, recovery and evidence

No schema/data migration or deployment stage: this is a local parser bound change. After a later authorized implementation invocation, delivery is the scoped verified working-tree change. If verification fails, keep the packet incomplete and repair only scoped code; if blocked, record the exact missing evidence. Recover by restoring only this packet's edits after inspecting overlap, never a blanket reset of staged fixture content. Reverting the parser bound would intentionally undo the approved range and requires disposition rather than claiming completion.

Security/privacy: existing environment validation remains the only changed trust boundary; keep strict ASCII digits and finite small accepted range. No secrets, networking, storage, logging, UI, accessibility or new concurrency are involved. Temporary child resources remain owned and cleaned up by the unchanged helper. No separate observability or durable documentation packet is warranted for this localized two-module behavior with no new vocabulary or operational policy. No external/manual release action belongs to this packet.

## Execution evidence

Completed b2-01 under the explicit SIMULATION implementation invocation. Bundle verification succeeded and Git returned visible `true`. Before execution and completion, specification_check_state returned pass/reviewed/approved with the exact pinned source_version, specification_version and review_ref above; planning_packet_check returned ready, issues empty, for the exact agreement and proposal digest. MCP scope and complete B2-001..B2-004 definitions and their linked behavioral decision were reverified. No product or profile contracts apply.

RED: extended test.mjs before changing configuration.mjs. `rtk proxy npm test` exited 1 with 21 passing and 7 failing tests: parser acceptance of 11, 59, 60 and 00060, the exhaustive range loop at 11, and CLI success for 60 and 00060 (actual status 2 instead of 0). These were relevant behavior failures, with collection and the real child harness working.

GREEN: changed only configuration.mjs:3's maximum from 10 to 60. `rtk proxy npm test` exited 0, all 28 tests passing, without changing any assertions. test.mjs:7 covers explicit boundaries; :13 checks every accepted second and leading-zero form; :20 lists invalid inputs checked at both parser and CLI layers; :31 checks exact successful child status/signal/streams; :41 checks exact invalid child status/signal/streams using the unchanged runCli helper.

PROVE: temporarily added `process.stdout.write('PROVE_MARKER')` only to cli.mjs's catch path. `rtk proxy npm test` exited 1 with 11 passes and 17 failures, all invalid CLI tests failing at test.mjs:46 with actual stdout PROVE_MARKER instead of empty. Restored cli.mjs exactly; the restoration run and separate final `rtk proxy npm test` both exited 0 with 28 passes and no failures. Baseline invalid/default regressions passed; the range change had relevant RED and the required absence guarantee had targeted PROVE.

Final scoped working-tree and cached diffs plus status were inspected. The lasting implementation diff is only the parser bound and test coverage, matching the agreed function ownership, signatures and dependency direction. Preexisting staged fixture additions and the preexisting decisions.yaml working-tree change were preserved; no index changes were made. cli.mjs, package.json and test-process.mjs retain their pre-execution SHA-256 values, and unrelated.txt remains `66d58c226b7ae1af545c81f3d91e17b0d75f0e91fd9e77b3d4416cd9822ded19`. No lasting CLI change, dependency, module, workflow YAML edit or unrelated change was introduced.

Verification covers the installed Node fixture only; no additional platform coverage or independent semantic/consent authentication is claimed. No blockers remain. Checklist ownership is todo.md; handoff.md holds current state only. No next packet exists in this bundle. Stopped after b2-01 with no installation, commit, publication, external action or review launch.
