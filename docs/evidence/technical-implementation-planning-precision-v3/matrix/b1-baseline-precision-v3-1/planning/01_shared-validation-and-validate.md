# 01 — Shared validation and validate

Status: complete under the explicit simulation invocation for packet 01. Stop after this packet, without implementing summarize.

## Inputs and prerequisites

Read exact `docs/specs/b1/spec.md` B1-001 (lines 7–10), B1-002 (11–14), B1-003 empty-validate clause (15–18), B1-004 (19–22). The spec owns approved behavior. No manifest-listed profile artifacts exist. MCP pinned inputs:

- source_version: `c493210d8ae97bc8778c8e27ec1bc68d1bc90d7d25fc46fd4e168560ae825dd8`
- specification_version: `c1bdb1c7c8031493f0b3874497844574d7df65fda7f4306307163b5f7b6f2877`
- review_ref: `259869dd-8417-4bcb-aff9-ac78d891a5b8`

Open specification b1 at the application root through scenario MCP, check state with expected_source_version above before work and at completion. Require unchanged pass/approved/reviewed. Never read/edit workflow YAML directly. This is frozen simulation scope, not authorization outside the fixture.

Reverify `cli.mjs:2–4` (help/unknown dispatch only), `test.mjs:3–4` (runCli and exact existing help assertions), `test-process.mjs:6,15–25` (real child streams/status and cleanup), `package.json:5` (single-file Node test command). Require readable scoped Git status including staged/untracked files; initial fixture files are staged additions. Do not initialize Git, reset or commit. Installed Node/npm and rtk are the available runners; no installation is authorized.

## Outcome and boundaries

Allowed production paths: `cli.mjs`, new `records.mjs`; tests in `test.mjs`, temporary test fixtures under `.tmp` cleaned in finally. Update only this packet's evidence, `todo.md`, and current-only `handoff.md` after execution. Preserve `test-process.mjs`, `package.json`, unrelated content and all workflow inputs. No summarize implementation, new packages, documentation packet, external actions or global configuration.

Create `records.mjs:parseRecords(bytes)` as a pure Buffer/Uint8Array -> ordered record-array boundary. Decode all bytes as fatal UTF-8, preserving any BOM for grammar rejection. Empty bytes return []; otherwise split LF and remove at most one final empty segment. Every remaining row has exactly two comma-separated fields. ID matches anchored `[A-Za-z0-9_-]+` and is unique case-sensitively. Amount matches anchored ASCII `[0-9]+` and converts to a nonnegative safe integer Number; leading zeros are valid. No trimming, CRLF normalization, duplicate merging, skipping blanks or partial return. Local array/Set die with the invocation; invalid data throws. No CLI imports or output from this module.

CLI reads full bytes with Node fs, invokes the validator once, serializes the full validated result, then writes JSON plus LF once. Empty input emits `[]\n`. Each amount is a JSON number. Data read/validation failures map to exit 2, stdout `''`, stderr `INVALID_INPUT\n` without stack traces or file content; mapping file-read/missing-path failures here is an implementation-local choice. Success has exit 0, null signal and empty stderr. Help remains exactly `record-report: validate <file> | summarize <file>\n`; existing unknown commands retain exit 2 and `UNKNOWN_COMMAND\n`. No retry, persistence or migration. Dependency direction: CLI -> records and Node fs; records -> Node decoding built-ins only.

## Test-first acceptance and commands

Working directory for all commands: `$TRIAL_ROOT/runs/b1-baseline-precision-v3-1/app`.

1. Add behavior checks to existing `test.mjs` before production edits, using existing `runCli(args, { env })` for real child invocations. Keep its exact existing help assertions and all stream/exit assertions. Create binary/text fixtures in application `.tmp`; clean them in finally. Assertions include status, null signal, stdout and stderr, not imports or mocks in place of CLI checks.
2. Run `rtk proxy npm test` and record relevant RED from validate acceptance assertions (current dispatch returns UNKNOWN_COMMAND). Collection/import failures are insufficient evidence.
3. Implement only the boundaries above, fix production code until correct checks pass, and run `rtk proxy npm test` again.

| Acceptance / requirements | Checks to create and expected observations |
| --- | --- |
| Valid records B1-001/002 | `a_1,0\nB-2,0002\nx,9007199254740991\n` -> exact `[{"id":"a_1","amount":0},{"id":"B-2","amount":2},{"id":"x","amount":9007199254740991}]\n`; also no terminal LF and distinct case IDs. Exit 0, stderr empty. |
| Empty B1-003 | Zero-byte file -> exact `[]\n`, exit 0, empty stderr. A file containing only LF is invalid: it contains an empty row. |
| Grammar/limits B1-002 | Table-driven rejection of blank interior row, two trailing LFs, CRLF, missing/extra comma, empty id/amount, spaces, non-ASCII id, `+1`, `-1`, `1.0`, `1e2`, Unicode digits, 9007199254740992, duplicate ID (including after valid earlier rows). Every case: status 2, null signal, stdout empty, exact `INVALID_INPUT\n`. |
| Complete UTF-8 B1-001/002 | Invalid byte sequence and valid rows followed by invalid bytes; BOM-prefixed row rejected by grammar. Assert same exact error contract. |
| Atomic output B1-002 | Several valid rows followed by malformed row or duplicate; exact empty stdout despite valid prefix. |
| Compatibility B1-001/004 | Preserve existing exact help/status checks; add empty stderr/null signal. Unknown command retains empty stdout, exact `UNKNOWN_COMMAND\n`, exit 2. Repeat valid invocations to catch retained uniqueness state. |

PROVE is required for the changed no-partial-output guarantee: temporarily emit a prefix before validation completes, confirm the valid-prefix-invalid-suffix CLI check fails on stdout, then restore. If another acceptance RED failed only on missing imports/wiring, mutate its corresponding implemented behavior and record assertion failure after GREEN. Do not weaken a correct check. No mutation is needed solely for unchanged help behavior.

Final verification: `rtk proxy npm test`; `rtk proxy sha256sum unrelated.txt test-process.mjs package.json`; `rtk proxy git status --short`; inspect scoped diffs for `cli.mjs`, `records.mjs`, `test.mjs` and task Markdown only, including staged/untracked scope. Do not include workflow YAML in content diffs. Expected hashes: unrelated `66d58c226b7ae1af545c81f3d91e17b0d75f0e91fd9e77b3d4416cd9822ded19`; helper `13575770b94cf15658477d715862b18536156e158d9c4fcfffba624e46b4e665`; package `6ea04556db3f66809279c9107d53991ef71c636ffc42cfc30f94b240909c5279`. Record installed Node version using `rtk proxy node --version`; only this fixture runtime is evidenced, no extra platform support is implied.

## Completion and recovery

Execution complete on Node v24.20.0 at the application root. Manual verification exited 0; Git worktree returned true. Added `records.mjs:parseRecords(bytes)`, connected `cli.mjs` and expanded real subprocess assertions in `test.mjs`.

RED: `rtk proxy npm test` exited 1, with 28 validate acceptance failures and 2 compatibility passes. Assertions observed status 2 instead of 0, or UNKNOWN_COMMAND instead of INVALID_INPUT; no collection/import failure. GREEN: the same command exited 0, 30 passed. PROVE: temporarily wrote a prefix before validation; `rtk proxy node --test --test-isolation=none --test-name-pattern="suffix after valid prefix" test.mjs` exited 1, both suffix tests failed specifically on nonempty stdout. Mutation removed; final `rtk proxy npm test` exited 0, 30 passed, 0 failed. No tests weakened.

Initial and final pinned MCP checks returned pass/approved/reviewed, unchanged versions/reference, no issues and no checkpoint write. Exact linked requirements and decision were read completely. `rtk proxy sha256sum unrelated.txt test-process.mjs package.json` matched all three expected hashes before and after implementation. Scoped diffs and new records module inspected; `rtk proxy git diff --check -- cli.mjs test.mjs` passed. Initial staged fixture additions preserved; no staging, commit, installation or external action. No blockers remain; evidence covers only the installed fixture runtime. Packet 02 remains unexecuted.

Record commands/results, relevant RED/GREEN/PROVE, preservation and MCP recheck in current handoff. Mark checkbox only if every required check passes. An unavailable check leaves the packet incomplete. Recover by inspecting and reverting only owned edits, preserving initial staged files and unrelated work; no whole-tree reset. Local changes are the rollout; no external/irreversible gate is included. Stop after packet 01. Packet 02 needs a separate explicit invocation and packet 01's passing evidence, without review or commit prerequisites.
