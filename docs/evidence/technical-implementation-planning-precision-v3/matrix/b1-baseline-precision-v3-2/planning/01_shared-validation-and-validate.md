# Packet 01 — Shared validation and validate

Outcome: establish the shared input contract and a working validate command, independently verifiable before summarize exists. Own B1-001, B1-002, validate-empty in B1-003, and B1-004 constraints. Read only those exact sections of docs/specs/b1/spec.md plus the pinned MCP requirement definitions and plan.md boundary table.

## Inputs and prerequisites

- source_version: `3a21e2290064684bc7449d083da91ba0ead4277a5e8c7c3628860b46990f0aa2`
- specification_version: `c1bdb1c7c8031493f0b3874497844574d7df65fda7f4306307163b5f7b6f2877`
- review_ref: `7566b8e5-0284-458a-b64c-3d4ceca0f273`

These pins come from MCP's pass / approved / reviewed check, with no issues; the approval checkpoint is absent. Frozen SIMULATION scope only. Open specification b1 with scenario MCP, check the pinned aggregate source_version before work and before completion, and read exact linked requirements via requirement_get with the pinned specification_version. Any changed or incomplete state returns to the owning workflow; do not revise scope here. Current behavior decision: facb12e6-52a7-4ec3-b732-66896b09fb20@1. Standard/core only; no profile artifact declared.

Application working directory: `$TRIAL_ROOT/runs/b1-baseline-precision-v3-2/app`. Require separate explicit authorization for this packet. Require readable Git status including staged and untracked changes; preserve pre-existing work, without requiring a clean tree or commit. Use installed Node and npm only, no dependency installation. Re-verify repository evidence: `cli.mjs:2` command dispatch, `cli.mjs:3` exact help, `cli.mjs:4` unknown diagnostic; `test.mjs:3` runCli import and `test.mjs:4` existing help assertions; `test-process.mjs:6` helper, lines 15–21 real subprocess FD capture and lines 22–25 cleanup; `package.json:5` exact npm runner. These line references describe the pre-implementation baseline.

All CLI assertions must invoke existing `runCli(args, { env })` from test-process.mjs; preserve that helper and existing exact stream/status assertions. No replacement with imports or mocks. Each new process assertion checks actual status, signal (null), stdout and stderr. Test fixture creation belongs under app .tmp with finally cleanup; no external files.

## Verification and completion protocol

Create tests first in test.mjs. Run focused tests before production changes and record relevant RED at the intended assertion, then implement and fix behavior until correct checks pass. Never weaken a correct check to get green. For empty-stdout/absence guarantees, PROVE by temporarily emitting partial stdout before validation, observe the exact stdout assertion fail, then restore. Also PROVE any check whose intended assertion did not execute in RED or which only observes wiring. Record mutation and failing test; restore and rerun.

Existing final command: `rtk proxy npm test` (retains Node single-file --test-isolation=none). Do not change package.json's runner. A passing planned command is not evidence until run. Review only scoped file diffs, excluding MCP-owned YAML and review-input archives; inspect staged and untracked scope without changing it. Verify unrelated.txt SHA-256 stays `66d58c226b7ae1af545c81f3d91e17b0d75f0e91fd9e77b3d4416cd9822ded19` using `rtk proxy sha256sum unrelated.txt`.

Recheck pinned MCP state. Record exact focused/final results, RED and PROVE evidence, residual risks and next eligible packet in current-only handoff.md; mark only this packet complete in todo.md after all required checks pass. A failed/unavailable required check keeps it incomplete. Stop after this packet; do not invoke another workflow or the next packet. Review and commit are not prerequisites.

## Compatibility and operations

Keep help stdout exactly `record-report: validate <file> | summarize <file>\n`; status 0. Keep unknown command stdout empty, stderr `UNKNOWN_COMMAND\n`, status 2. Preserve unrelated fixture content, package.json and test-process.mjs. No external action, dependency, commit, publication or global configuration change is authorized. No migrations or external rollout; local change only. Recover by undoing only this packet's owned edits, preserving staged/untracked work and earlier completed packets. No destructive Git commands. File data is untrusted; bounded error output must not echo records or paths. No new persistent data, telemetry or credentials.

MANUAL GATE: implementation requires a separate explicit invocation for this packet. No external or irreversible operation is included.

## Dependency and allowed scope

No packet dependency. Planning is complete; implementation is pending separate authorization. Allowed production writes: cli.mjs and proposed records.mjs only. Test writes: test.mjs and temporary .tmp fixtures. Planning updates: this packet's evidence notes, todo.md and current-only handoff.md. Do not implement summarize, create another contract or edit specification/manifest/decisions. Packet 01 must pass without packet 02 code or tests.

## Boundary and concrete contract

Create pure `records.mjs:parseRecords(bytes)`, used by cli.mjs. It owns fatal UTF-8 decoding and complete parsing, returns ordered {id, amount} records with numeric safe-integer amounts, and throws on invalid input. Use per-call ID Set; no shared mutable state or I/O. CLI owns whole-file reading, process streams/status, and JSON serialization only. Node built-ins only. No output before parsing completes; resources are scoped to the read. Shared parser must remain usable unchanged by packet 02.

Rows are LF-separated `id,amount` with at most one final LF. Zero-byte input returns []. IDs match the whole ASCII expression [A-Za-z0-9_-]+ and are unique. Amounts match one or more ASCII decimal digits and represent nonnegative safe integers; leading zeros are valid and convert to numbers. Do not trim, coerce signs/exponents, remove a BOM or normalize CRLF. Empty interior rows and extra terminal blank rows are malformed. Validate the full decoded input, including a bad last row after good rows.

`validate <file>` success: ordered JSON array, compact text plus LF, status 0, empty stderr. Empty file emits `[]\n`. Invalid/decode failure: status 2, stdout exactly empty, stderr exactly `INVALID_INPUT\n`. For file-read failures use the same diagnostic as a local CLI choice; do not expose stack traces or filenames. Help and unknown command behavior stay intact.

## Acceptance checks to create before implementation

Name new tests with prefix `packet01`; focused command:
`rtk proxy node --test --test-isolation=none --test-name-pattern=packet01 test.mjs`.

| Check | Input / expected assertion | RED discrimination |
| --- | --- | --- |
| P01-valid | `a,0\nB_2-,0002\n` and same bytes without final LF -> exact array records [{id:"a",amount:0},{id:"B_2-",amount:2}] plus LF, status 0, stderr empty | Existing CLI returns UNKNOWN_COMMAND / 2 |
| P01-empty | Zero bytes -> exact `[]\n`, status 0, stderr empty | Existing CLI cannot succeed |
| P01-bound | `a,9007199254740991` accepted exactly; `a,9007199254740992` rejected | Distinguishes safe boundary |
| P01-invalid | Empty ID/amount; invalid ID punctuation or Unicode; missing/extra comma; leading/trailing spaces; negative, plus sign, decimal, exponent, Unicode digits; duplicate ID; CRLF; interior blank row; two trailing LF; malformed UTF-8 byte buffer; UTF-8 BOM before ID | Every case asserts status 2, null signal, stdout '', stderr INVALID_INPUT plus LF, distinguishing UNKNOWN_COMMAND and permissive parsing |
| P01-atomic | `ok,1\nbad,2\nok,3` and `ok,1\nbad,-1` -> exact invalid result | Catches partial output after valid prefix; required PROVE above |
| P01-read | Nonexistent fixture path -> same bounded invalid result | Distinguishes uncaught exception |
| P01-compat | Original help assertions retained, add stderr empty / signal null; unknown command exact streams and status; summarize remains unknown in this stage | Regression baseline, no mutation needed for unchanged behavior |

Use actual CLI invocation for all rows. Do not replace raw stream checks with JSON parsing alone. Success array checks may also parse JSON, but exact bytes remain asserted. Inspect that cli.mjs calls parseRecords and parser has no I/O; if an executable structural assertion is added, apply required PROVE to it.

After focused GREEN/PROVE, run final npm test and preservation checks from protocol. Only then update completion. Packet 02 readiness requires passing packet 01 evidence and the shared parseRecords boundary, not a commit.

