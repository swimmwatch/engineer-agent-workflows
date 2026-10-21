# Packet 01 — shared validation and validate

Status: complete under the explicit SIMULATION packet-01 invocation.
Execution evidence is in handoff.md. Stopped after this packet; summarize is packet 02.

## Inputs and readiness

- source_version: `c188354bc3b00fc9f3b0e7cb13bfffc33ec20355331d1c09b850166a689d90e1`
- specification_version: `4b77db1d93030b893e8c9f60f5f9304257569ae2d2c04b515b188e1bccab6007`
- review_ref: `10c81a91-08ae-402c-8eea-4e8ac1e8df81`

Exact authoritative inputs: `docs/specs/b1/spec.md` B1-001 (lines 7–10),
B1-002 (11–14), B1-003 (15–18, empty validate case), B1-004 (19–22).
Use MCP requirement_get for these IDs at the pinned specification_version; scope
is confirmed Standard/core with no extra profile artifact. Before work and at
completion, call specification_check_state with the pinned aggregate
expected_source_version. Drift or failed/stale/pending coverage blocks completion.

Prerequisites: later packet-specific authorization, existing Node/npm, readable
Git status including staged/unstaged/untracked changes. Reverify `cli.mjs:2–4`,
`test.mjs:4`, `test-process.mjs:6–25`, `package.json:3–5`.
Git currently has staged fixture additions; preserve them. Do not initialize Git,
install runners, reset or commit. Working directory for all commands:
`/tmp/eaw-tip-p03-df48iZ/runs/b1-baseline-s2-1/app`.

## Outcome and allowed writes

Create `records.mjs`, change `cli.mjs` for validate, and extend `test.mjs`.
Use temporary fixtures under `.tmp/` with finally cleanup. Update only packet
evidence here, `todo.md` and current-only `handoff.md` as planning bookkeeping.
Preserve `test-process.mjs`, `package.json`, `unrelated.txt`, workflow state,
the Approved spec, and unrelated/staged content. No summarize behavior, dependencies,
new options, streaming, configuration or external actions.

## Boundary and exact criteria

Introduce pure `records.mjs:parseRecords(bytes)`: complete bytes in, ordered
array of {id:string, amount:number} out, or an invalid-input error. All state
(decoder, Set, array) is per call. Fatal UTF-8 decoding must not silently discard
a BOM. No I/O, stdout, CLI imports or shared mutable state.

The authoritative grammar is B1-002: zero rows or LF-separated id,amount rows,
with at most one final LF; nonempty ASCII [A-Za-z0-9_-]+ IDs, exact-string
uniqueness, ASCII decimal digits for nonnegative safe-integer amounts. Accept
leading zeroes; reject whitespace, CRLF, extra separators, signs, fractions,
exponents and unsafe values. Do not trim or skip blank rows. Empty bytes return
[]; a lone LF or an interior blank row is invalid.

In `cli.mjs`, preserve help exactly:
`record-report: validate <file> | summarize <file>\n`.
Preserve unknown command status 2 and `UNKNOWN_COMMAND\n`.
For validate, read the complete file, call parseRecords, then write compact JSON
and LF once. Success: status 0, signal null, stderr empty. All invalid input,
decoding or file-read failures: status 2, signal null, stdout exactly empty,
stderr exactly `INVALID_INPUT\n`. Use a fixed diagnostic, no input/path leakage.
A missing operand follows this same bounded input-error path.
No records or output may escape before the complete file passes.

CLI depends on parser and Node built-ins; parser never depends on CLI.
No persistent state or migration. Recovery is correcting the input and invoking
again; rollback only this packet's inspected edits, preserving existing staged
work. There is no external MANUAL GATE step; external actions remain forbidden.

## Test-first execution and acceptance map

Create tests in `test.mjs` before changing production behavior. All CLI checks
must call existing runCli(args, { env }) from `test-process.mjs`, which captures
real child output through temporary descriptors. Never substitute an imported
CLI function, mocks, default spawn pipes, or a new test runner.

Create tests named with prefix `validate:` and regressions with `compat:`.
For every CLI assertion check actual status, signal and both streams exactly.
For successful JSON examples assert exact compact JSON plus LF.

| Criterion / IDs | Input/check to create | Required observation |
| --- | --- | --- |
| Complete ordered records / B1-001,002 | bytes `A_-,0007\nb2,0\n`, also without last LF | stdout `[{"id":"A_-","amount":7},{"id":"b2","amount":0}]\n`, status 0, signal null, stderr empty |
| Empty / B1-003 | empty bytes | stdout `[]\n` and success tuple |
| Limits and uniqueness / B1-002 | 9007199254740991 accepted; 9007199254740992 rejected; A and a distinct; __proto__ and constructor valid | exact records/success or exact invalid tuple |
| Bad row syntax / B1-002 | missing/extra comma, empty ID/amount, space/tab, non-ASCII ID/digits, -1, +1, 1.0, 1e2, NaN, Infinity | status 2, signal null, empty stdout, `INVALID_INPUT\n` |
| Row boundaries / B1-002 | LF only, CRLF, interior blank row, two trailing LFs | same exact invalid tuple |
| Decode and atomicity / B1-001,002 | invalid UTF-8 bytes; BOM prefix; valid first row followed by malformed, duplicate or unsafe row | same invalid tuple; never a prefix result |
| I/O diagnostic | missing operand, nonexistent local path | same bounded invalid tuple |
| Compatibility / B1-001,004 | help; unknown command; no command | help exact original text and success; unknown/no command exact original error and status 2, stdout empty |

Also create table-driven parser checks for the same acceptance boundary, including
two separate calls with the same ID to establish no leaked uniqueness state.
CLI tests remain mandatory even when parser checks pass.

Commands from the working directory, using installed runners:

1. `rtk proxy node --test --test-isolation=none --test-name-pattern='validate:|compat:' test.mjs`
   after tests are written and before implementation. Record relevant RED:
   expected validate data output or INVALID_INPUT differs from current
   UNKNOWN_COMMAND. If an import failure prevents an assertion from executing,
   it is harness evidence only; repair and require PROVE after GREEN.
2. Implement the shared parser and validate branch. Repeat that focused command
   until all correct checks pass; correct implementation, never weaken a correct
   check.
3. PROVE empty stdout: temporarily emit one valid prefix before rejecting a
   late-invalid input, observe the exact stdout assertion fail, restore. Also
   PROVE any check whose RED was only missing-module/collection failure by
   introducing one accepted malformed value and observing its assertion fail.
   One mutation at a time; restore and rerun.
4. `rtk proxy npm test` for final full verification with the preserved
   single-file --test-isolation=none script.
5. `rtk proxy sha256sum unrelated.txt test-process.mjs package.json`:
   compare to hashes below. Inspect scoped staged/unstaged/untracked diffs,
   excluding contents of all four workflow YAML documents. Confirm no production
   summarize branch was implemented.

Preserved SHA-256:
- unrelated.txt: `66d58c226b7ae1af545c81f3d91e17b0d75f0e91fd9e77b3d4416cd9822ded19`
- test-process.mjs: `13575770b94cf15658477d715862b18536156e158d9c4fcfffba624e46b4e665`
- package.json: `6ea04556db3f66809279c9107d53991ef71c636ffc42cfc30f94b240909c5279`

Record command/results, RED assertion, mutation failure/restoration and final
checks in handoff. Recheck pinned MCP state. Mark only packet 01 complete in
todo after all required checks pass; a failed/unavailable check keeps it pending.
Publish no artifacts externally. Stop; packet 02 requires a separate invocation.

