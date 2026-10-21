# P02 — summarize using shared validation

Status: complete under the explicit P02 SIMULATION invocation. No commit authorized or made.

## Inputs and prerequisites

- source_version: `d3703b86a5e02b21b0d6cfc0b4e6dc0dd232ca99973730a5c37f6ff54ba7faad`
- specification_version: `4b77db1d93030b893e8c9f60f5f9304257569ae2d2c04b515b188e1bccab6007`
- review_ref: `cea9bcb8-8e31-4b70-aedb-6755e425d546`

Read exact B1-002, B1-003 and B1-004, plus B1-001 for compatibility, via requirement_get at pinned specification_version. Behavior authority: ../spec.md sections with those IDs; linked behavior decision b3a22eec-4869-4b3f-93eb-0e9c3ff6f678 revision 1. No manifest-listed profile artifacts. Use plan.md Architecture and P01's completed evidence for the shared boundary.

Call specification_check_state with pinned expected_source_version before writes, require current matching approved/reviewed pass. P01 must have all required passing checks, preservation evidence and checklist completion. Reverify its actual readRecords/parseRecords definitions and CLI call site; do not assume proposed symbols exist unchanged. Also reverify baseline test-process.mjs:6-27, package.json:5, test.mjs:4 and original cli.mjs:3-4 compatibility against current paths/lines. Require readable Git staged/unstaged/untracked status and installed Node/npm, with no installation or Git initialization. Scope/contract drift returns to its owner.

## Outcome and bounded writes

Modify cli.mjs summarize dispatch and extend test.mjs; update this packet's evidence, todo.md and current-only handoff.md. records.mjs is a read-only dependency in P02: if its contract is wrong, leave P02 incomplete and return the correction to P01/planning. No duplicate decoder/parser, dependencies, helper changes, test-driver changes or unrelated writes.

Summarize must call the same readRecords(file) entry point used by validate, consuming its complete validated array. Compute count and exact integer total only after validation; accumulate via BigInt(amount), serialize total as an unquoted decimal JSON integer token, returning compact {"count":N,"total":T} plus LF. Do not reject rows because their aggregate exceeds the individual safe-integer limit. On empty input return {"count":0,"total":0} plus LF. Exit 0 with empty stderr on success. On read/decode/validation failure, use the same CLI error boundary: exit 2, empty stdout, exactly INVALID_INPUT\n on stderr. No output or aggregation side effects before validation completes. State is per invocation, no file modification.

Dependency direction: CLI -> shared records module -> Node built-ins. Summary owns aggregation/serialization only; shared module owns row validity. Preserve P01 validate output, help text and unknown/no-command behavior.

## Test-first checks and acceptance

Working directory: application root. Create real temporary files under .tmp and remove own fixtures in finally. Extend test.mjs first, tests named P02. Use existing runCli(args,{env}) helper as needed, actual subprocesses, exact stdout/stderr/status/signal assertions, never mocks/imports instead of CLI execution.

| Check | Inputs | Expected result |
| --- | --- | --- |
| S01 ordinary summary | a,2 LF b,0003 with/without final LF; a,0 | Exact {"count":2,"total":5} plus LF; one zero row gives count 1,total 0; exit 0, empty stderr, null signal |
| S02 empty | zero bytes | Exact {"count":0,"total":0} plus LF; successful exit and empty stderr |
| S03 same validation | P01 V03-V06 malformed/decode/duplicate/file fixtures, including valid prefix then bad suffix | Both commands independently exit 2, empty stdout, exactly INVALID_INPUT plus LF, null signal; retain all P01 assertions |
| S04 boundary total | a,9007199254740991 LF b,2 | Exact {"count":2,"total":9007199254740993} plus LF; assert text, avoiding Number-rounded JSON parsing |
| S05 single contract | Inspect both actual dispatch branches calling same readRecords | No parallel parser; prove integration by bypassing summarize's shared validation temporarily and observing S03 fail |
| S06 compatibility | Entire existing P01/help/unknown suite | All exact assertions continue passing |

Focused command after tests are written: rtk proxy node --test --test-isolation=none --test-name-pattern=P02 test.mjs. Record assertion-level RED before implementation; missing imports or runner errors are not sufficient behavioral RED.

Implement summarize only, rerun focused checks, fix implementation until correct checks pass. PROVE empty stdout by temporarily emitting summary output before shared validation, observe S03 fail, restore. PROVE shared wiring by temporarily bypassing readRecords with a permissive result, observe S03 failure, restore. Mutate one behavior at a time; record failed assertions and final restoration. Apply PROVE to any other check whose RED missed its assertion.

Final command: rtk proxy npm test. Check rtk proxy sha256sum unrelated.txt against plan.md, inspect scoped staged/unstaged/untracked changes excluding workflow YAML and archives, and verify records.mjs/helper/driver preservation and dependency-free implementation.

## Completion and recovery

## Execution evidence

Executed from application root on 2026-10-21, Node v24.20.0 / npm 11.19.0. Manual verifier exited 0; separate Git check printed true. Read current packet/checklist/handoff and verified P01 evidence against records.mjs:3 parseRecords, :22 readRecords, cli.mjs:7 shared call, test-process.mjs:6-27, package.json:5 and original test.mjs:4. Existing staged fixture additions and uncommitted P01 work preserved. Confirmed standalone core scope, exact B1-001..004 and complete linked behavior decision through scenario MCP; no profile contracts.

- RED: added 33 real-process P02 checks first. `rtk proxy node --test --test-isolation=none --test-name-pattern=P02 test.mjs` exited 1, 33 behavioral failures. Success cases failed status 2 versus 0; invalid cases failed UNKNOWN_COMMAND versus INVALID_INPUT stderr. No harness/import failure.
- GREEN: both commands execute the same readRecords call and error boundary. Summary aggregates the fully validated array using BigInt and emits an exact decimal JSON integer token. Same focused command exited 0, 33/33 passed.
- PROVE early output: temporarily emitted `{}` plus LF before validation for summarize. `rtk proxy node --test --test-isolation=none --test-name-pattern="P02 rejects (atomic|duplicate)" test.mjs` exited 1; 3/3 failed empty stdout at test.mjs:23. Removed mutation.
- PROVE shared wiring: temporarily substituted an empty permissive array for summarize's readRecords result. Same atomic/duplicate command exited 1; 3/3 failed status 0 versus 2. Restored shared call.
- PROVE success assertions after RED's earlier status failure: temporarily increased emitted count by one. `rtk proxy node --test --test-isolation=none --test-name-pattern="P02 summary" test.mjs` exited 1; 5/5 failed exact stdout. Restored count. Separately replaced BigInt aggregation with Number addition; `rtk proxy node --test --test-isolation=none --test-name-pattern="P02 summary exact large total" test.mjs` exited 1, exact stdout failed with 9007199254740992 versus 9007199254740993. Restored BigInt. No tests weakened.
- Restored final `rtk proxy npm test`: exit 0, 70/70 passed, including all P01/help/unknown assertions. Actual subprocess helper and exact status/signal/streams retained; fixtures removed in finally. No dependencies added.
- Scoped staged/unstaged/untracked changes reviewed, excluding workflow YAML and archives. `rtk proxy git diff --check` with these exclusions exited 0. records.mjs, test-process.mjs and package.json SHA-256 values match pre-P02 values; unrelated.txt matches plan baseline 66d58c226b7ae1af545c81f3d91e17b0d75f0e91fd9e77b3d4416cd9822ded19.
- Initial and completion pinned MCP checks: pass/approved/reviewed, no issues, matching source_version, specification_version and review_ref above. Approval checkpoint remains absent; no additional consent inferred.

No unresolved decisions or unavailable checks. Runtime coverage is limited to the installed environment. Both planned packets are complete; no next packet or review launched. No commit, install, publication, external or global mutation.

## Recovery contract

No migrations or external/manual gates. Input remains read-only, errors fixed/redacted; whole-file validation/aggregation is synchronous. Recover by reverting only P02-owned edits, leaving P01 operational and unrelated work intact. No global reset.

Recheck pinned specification_check_state before completion. Record actual RED/GREEN/PROVE, runner environment and final results. Only then mark P02 complete in todo.md and replace handoff.md with current completed state and any limitations. Stop after P02; no commit, installation, publication or automatic workflow.

