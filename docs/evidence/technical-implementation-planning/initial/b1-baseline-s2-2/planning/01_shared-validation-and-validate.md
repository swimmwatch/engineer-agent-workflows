# P01 — shared validation and validate

Status: complete under the explicit P01 SIMULATION invocation. No commit authorized or made.

## Inputs and prerequisites

- source_version: `d3703b86a5e02b21b0d6cfc0b4e6dc0dd232ca99973730a5c37f6ff54ba7faad`
- specification_version: `4b77db1d93030b893e8c9f60f5f9304257569ae2d2c04b515b188e1bccab6007`
- review_ref: `cea9bcb8-8e31-4b70-aedb-6755e425d546`

Read exact B1-001, B1-002, B1-003 (empty validate only), B1-004 using requirement_get at the pinned specification_version; all definitions currently have decision b3a22eec-4869-4b3f-93eb-0e9c3ff6f678 revision 1. Behavior authority: ../spec.md sections with those IDs. No manifest-listed contracts. Read plan.md Architecture for proposed local symbols.

Before writes, call specification_check_state with pinned expected_source_version; require current approved/reviewed pass and matching versions. Reverify cli.mjs:2-4, test.mjs:1-4, test-process.mjs:6-27 and package.json:2-5. Readable Git status including staged/untracked changes and available installed Node/npm runner are prerequisites; never initialize Git or install. User must explicitly authorize this packet. No predecessor.

## Outcome and bounded writes

Create records.mjs with parseRecords(bytes) and readRecords(file); add validate dispatch in cli.mjs; extend test.mjs. Update only this packet's evidence, todo.md and current-only handoff.md. Production ownership is exactly records.mjs, cli.mjs and test.mjs. Preserve test-process.mjs, package.json test command, existing exact assertions, unrelated.txt and all unrelated fixture work. Summarize implementation is P02.

Shared boundary: read entire file using Node fs, fatal-decode UTF-8 without stripping BOM, parse zero rows for zero bytes, otherwise remove at most one final LF then require every row to have exactly one comma, ID [A-Za-z0-9_-]+, ASCII digits amount, Number.isSafeInteger conversion and unique case-sensitive ID. Return ordered {id,amount} objects only after complete success. IDs and state are invocation-local; no trimming or partial output. No dependencies beyond Node built-ins.

CLI owns argv, output and exit status; it imports readRecords. On success write compact JSON array plus LF once, exit 0, empty stderr. On read/decode/validation failure (including missing path) write exactly INVALID_INPUT\n to stderr, exit 2, empty stdout. Shared functions throw without output. Help stays exactly record-report: validate <file> | summarize <file>\n; preserve unknown/no-command behavior UNKNOWN_COMMAND\n, empty stdout, exit 2.

## Test-first checks and acceptance

Working directory: application root. Every CLI assertion must use preserved runCli from test-process.mjs, with real child process and exact stdout, stderr, status and signal (null on normal exit); no import/mock replacement. Build fixture files under .tmp with built-in fs, remove own files in finally. Extend test.mjs before implementation.

| Check | Inputs | Expected observable result |
| --- | --- | --- |
| V01 valid rows/order | a,0 LF Z_9-,0007 with and without one final LF; a,9007199254740991 | Exact ordered numeric array JSON plus LF, exit 0, empty stderr |
| V02 empty | zero bytes | [] plus LF, exit 0, empty stderr |
| V03 malformed rows | LF alone; interior blank row; two final LFs; CRLF; missing/extra comma; empty ID/amount; spaces; punctuation/non-ASCII ID; BOM prefix | For each, exit 2, stdout empty, stderr INVALID_INPUT plus LF |
| V04 invalid amounts | -1, +1, 1.0, 1e2, whitespace, Unicode digit, 9007199254740992; very long unsafe digit string | Same exact error triple; test amount zero and safe max successes separately |
| V05 duplicates and atomicity | a,1 LF a,2; valid first row then invalid final row; raw invalid UTF-8 after valid prefix | Same exact error triple; never emit valid prefix |
| V06 file boundary | missing path argument and nonexistent file | Same exact error triple |
| V07 compatibility | help; unknown command; no command | Existing exact help line and status retained; help stderr empty; unknown/no-command exact existing error |

Use descriptive test names beginning P01. Focused command after creating tests: rtk proxy node --test --test-isolation=none --test-name-pattern=P01 test.mjs. Record relevant RED assertion failures before adding production behavior. Missing symbol/harness errors do not prove behavior; repair and apply PROVE after GREEN where needed.

Implement smallest shared module and validate branch, rerun focused tests until correct assertions pass; never weaken assertions for green. For atomicity's absence claim, temporarily write a prefix to stdout before complete validation, verify V05 fails at exact empty-stdout assertion, then restore and rerun. Also apply PROVE to any criterion whose RED failed only before its intended assertion.

Final command: rtk proxy npm test. Preserve package.json's node --test --test-isolation=none test.mjs command. Check rtk proxy sha256sum unrelated.txt against plan baseline; inspect scoped staged/unstaged/untracked changes without reading workflow YAML or archive content. Verify no new dependencies and helper/driver preservation with scoped diff.

## Completion and recovery

No external/manual action is required or authorized. No migration or persistent data writes; errors are fixed/redacted and input files remain untouched. Revert only P01-owned edits if recovery is needed, preserving pre-existing changes; do not reset Git.

Recheck pinned specification_check_state before completion. Record actual RED/GREEN/PROVE, commands, environment, final test results and preservation evidence. Mark P01 complete in todo.md only when every required check passes. Leave P02 pending, identify it as next in handoff.md, and stop. A failed/unavailable check leaves P01 incomplete; no commit, install, review workflow, or automatic next packet.

## Execution evidence

Executed from application root on 2026-10-21, Node v24.20.0 / npm 11.19.0. Manual verifier exited 0; separate Git check printed true. Prior staged additions and untracked planning files preserved. Repository evidence matched prerequisites. Confirmed standalone core scope, exact linked requirements and decision read through scenario MCP with no continuations or linked profile contracts.

- RED: tests added before implementation. `rtk proxy node --test --test-isolation=none --test-name-pattern=P01 test.mjs` exited 1: 33 behavioral failures, 3 compatibility passes. Valid cases observed exit 2 instead of 0; invalid cases observed UNKNOWN_COMMAND instead of INVALID_INPUT. No harness/import failures.
- GREEN: records.mjs implements parseRecords and readRecords; cli.mjs dispatches validate through readRecords, emitting only after complete success. Same focused command exited 0, 36/36 passed.
- PROVE: temporarily wrote a valid-record prefix before readRecords. `rtk proxy node --test --test-isolation=none --test-name-pattern="P01 rejects (atomic|duplicate)" test.mjs` exited 1; all 3 tests failed specifically at test.mjs:23 empty-stdout assertion. Restored code; focused rerun exited 0, 36/36 passed.
- Final `rtk proxy npm test`: exit 0, 37/37 passed. Exact existing assertions, real-process helper and package driver preserved; no weakened tests. Fixtures removed in finally.
- `rtk proxy sha256sum unrelated.txt` matched baseline 66d58c226b7ae1af545c81f3d91e17b0d75f0e91fd9e77b3d4416cd9822ded19. Scoped diff and new-module review confirmed only authorized production/test changes, no dependencies beyond built-ins, unchanged helper/driver and unrelated content.
- Initial and final pinned MCP checks returned pass/approved/reviewed, no issues, unchanged source_version, specification_version and review_ref above. Approval checkpoint remains absent; no additional authority inferred.

No unresolved decisions or unavailable required checks. Runtime verification is limited to the installed environment. P02 remains pending and unimplemented; stop after P01.

