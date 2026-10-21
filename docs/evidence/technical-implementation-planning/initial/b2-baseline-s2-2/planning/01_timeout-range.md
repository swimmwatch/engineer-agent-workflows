# 01 — Expand TIMEOUT_SECONDS to 60

Status: pending; planned only. Outcome: implement B2-001–004 as one compact dependency-free change using the existing function boundary. No dependent packet or design output.

## Pinned inputs and prerequisites

Approved sections: `docs/specs/b2/spec.md` B2-001 (lines 7–10), B2-002 (11–14), B2-003 (15–18), B2-004 (19–22).

- `source_version`: `7fcd011665d866b7e912710e6b44df093846b32adf3e6239fc076bf06ae2ba2b`
- `specification_version`: `4f85f3b995a54ce1e1fdbf8de5895c3b8c9cea70c58f9119a7ea8325efe35862`
- `review_ref`: `2ed89011-812c-4af6-a05d-da8a10be1f0d`

MCP state was pass/reviewed/approved; Lite/core scope confirmed, no profile contracts listed. Decision `d7012935-8d3c-4062-afbb-1091bec3bbe8` revision 1 links all four requirements; scope decision is `scope.manifest` revision 2. Read exact linked requirements via scenario MCP using the pinned specification version; follow any continuation. Before work and completion, call `specification_check_state` with the pinned aggregate expected source version. Drift or failed freshness returns affected work to specification/planning; do not revise frozen scope here.

Requires separate explicit implementation authorization for this packet and the existing local Node/npm runner; installation remains forbidden. Working directory: `/tmp/eaw-tip-p03-df48iZ/runs/b2-baseline-s2-2/app`. Prefix every shell command with `rtk`. Verify readable Git status including staged/untracked changes (`rtk proxy git status --short`); initial fixture files are already staged additions, so a clean tree or commit is unnecessary. Never initialize Git or reset the fixture. Record pre-execution content/attributes for touched paths and `unrelated.txt` privately for final comparison.

Reverify repository evidence: parser/default/ceiling at `configuration.mjs:1`–5; CLI import and stream/error mapping at `cli.mjs:2`–4; existing regression at `test.mjs:4`; real subprocess helper at `test-process.mjs:6`–27; existing test script at `package.json:5`. These are planning observations, not test passes.

## Scope and ownership

Allowed behavior edit: `configuration.mjs`. Allowed test edit: `test.mjs`. Update `tasks/todo.md` and `tasks/handoff.md` under this specification with execution evidence. Preserve `cli.mjs`, `test-process.mjs`, `package.json`, `unrelated.txt` and all other fixture files exactly. No new abstractions, dependencies, CLI options or workflow YAML edits.

`parseTimeout(raw)` remains a pure synchronous named export: undefined returns 5000; ASCII decimal integer strings representing 1..60 inclusive, including leading zeroes, return seconds * 1000; invalid strings throw `Error` with message exactly `INVALID_TIMEOUT`. No persistent state or cleanup. CLI depends on this policy and owns one-process environment input, JSON output, stderr and exit status. Tests depend on the parser and existing `runCli`; the helper owns child process and temporary descriptor cleanup. Keep dependency direction and symbols unchanged. No migration or new privacy/telemetry behavior.

## Test-first execution and acceptance

1. Reverify prerequisites and capture the scoped baseline. Extend tests before production edits. Keep the existing default/value regression and exact assertions; use `node:test` and strict assertions already imported.
2. Add the following behavior checks, then run `rtk proxy npm test`. Expect a relevant RED for newly accepted values, such as `'11'`, `'60'` or `'00060'`, currently rejected by the ceiling of 10. Confirm both unit and real CLI assertions actually execute; a harness/import failure is not valid RED.

| Requirement | Tests to create/retain and exact acceptance |
| --- | --- |
| B2-001 | `parseTimeout(undefined) === 5000`, retain `'5' === 5000`; CLI with TIMEOUT_SECONDS absent returns `{status:0, signal:null, stdout:'{"timeoutMs":5000,"format":"json"}\n', stderr:''}`. Use `runCli([], { env: { TIMEOUT_SECONDS: undefined } })` so inherited input cannot select a value. |
| B2-002 | Unit table for every decimal integer 1..60, expected independently as seconds * 1000; include `'01'`, `'00011'`, `'00060'`. CLI via `runCli([], { env: { TIMEOUT_SECONDS: raw } })` for `'1'`, `'10'`, `'11'`, `'60'`, `'00060'`: exact compact JSON in timeoutMs/format order with newline, status 0, null signal, empty stderr. |
| B2-003 | Unit invalid table: `'0'`, `'000'`, `'61'`, `'00061'`, `'999999999999999999999'`, `'1.5'`, `'60.0'`, `'+1'`, `'-1'`, `' 1'`, `'1 '`, `'\t1'`, `'1\n'`, `''`, `'abc'`, `'1e1'`, `'0x10'`, `'１２'`. Assert an Error with message exactly `INVALID_TIMEOUT`. For each invalid string, real CLI result must equal `{status:2, signal:null, stdout:'', stderr:'INVALID_TIMEOUT\n'}`. |
| B2-004 | Use only existing Node built-ins, preserve `runCli` and package test command, keep one packet, inspect all staged/untracked scope and compare unrelated content/attributes to pre-execution baseline. No installs, commits or external calls. |

3. Make the smallest parser change expanding the upper bound to 60 and enforcing full-input ASCII digit validation. The existing `$` anchor can match before a final newline (`configuration.mjs:3`); the `'1\n'` test guards the approved whitespace rejection and should also produce RED. Preserve the lower bound, default, conversion, error and export. Correct implementation until all correct tests pass; never loosen a correct assertion for green.
4. PROVE only where required: ordinary unchanged default/error/empty-stream regression checks need no added mutation. If a changed test never reached its intended assertion in RED, temporarily restore the ceiling to 10, observe the range assertions fail, then restore 60. If an affected absence guarantee requires proof, temporarily introduce output on the real CLI failure path, observe the empty-stdout assertion fail, then restore that file exactly. Mutate one behavior at a time; record actual evidence and leave no mutation behind. Do not replace CLI checks with imports or mocks.
5. Focused and final verification both use the existing `rtk proxy npm test` (one test file; no added script). Require exit 0 and all assertions passing; the initial RED must be recorded separately. Inspect `rtk proxy git status --short` and scoped diff with YAML excluded: `rtk proxy git diff -- configuration.mjs test.mjs docs/specs/b2/tasks`. Review staged content only for those exact paths if needed. Confirm only authorized edits and byte/attribute preservation of unrelated content; never include workflow YAML in diff/content searches.
6. Recheck pinned MCP state, record RED/GREEN/any PROVE and final commands/results in handoff, mark the linked todo complete only after every required check passes, and stop after this packet. Failed/unavailable runner or freshness check leaves it incomplete.

Rollout: local parser update only. Recovery: restore only packet-owned edits from the pre-execution working state, preserving existing staged additions and unrelated work; retain failure evidence. No persistent migration. MANUAL GATE: a separate explicit invocation is required to execute this packet; no external or irreversible steps are included or authorized. Optional review is separately invoked and is not a completion prerequisite.
