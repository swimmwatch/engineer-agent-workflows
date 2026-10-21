# Packet 02 — summarize through shared validation

Status: complete under the explicit SIMULATION packet-02 invocation.
Execution evidence is recorded below and in the current handoff.

## Inputs and readiness

- source_version: `c188354bc3b00fc9f3b0e7cb13bfffc33ec20355331d1c09b850166a689d90e1`
- specification_version: `4b77db1d93030b893e8c9f60f5f9304257569ae2d2c04b515b188e1bccab6007`
- review_ref: `10c81a91-08ae-402c-8eea-4e8ac1e8df81`

Exact authoritative requirements: `docs/specs/b1/spec.md` B1-002 (11–14),
B1-003 (15–18), B1-004 (19–22); B1-001 (7–10) for compatibility checks.
Read these IDs through requirement_get at the pinned specification_version.
Before work and completion, call specification_check_state with the pinned
aggregate expected_source_version. Failed/stale/pending or changed scope blocks
affected work rather than authorizing a contract change.

Require 01 recorded GREEN, atomicity PROVE, full npm test and preservation checks
in current handoff/checklist. Inspect its actual parser before proceeding; do not
assume planned symbols exist. Reverify current `records.mjs:parseRecords`,
`cli.mjs` validate dispatch and `test.mjs` tests; lines will be established by
01. Baseline references: `cli.mjs:3–4` help/unknown behavior,
`test.mjs:4` help regression, `test-process.mjs:6–25` real subprocess capture,
`package.json:5` unchanged runner. Require readable Git worktree including staged,
unstaged and untracked status and existing Node/npm. Preserve fixture additions;
no clean tree, commit, installation or Git initialization required or authorized.
Working directory:
`/tmp/eaw-tip-p03-df48iZ/runs/b1-baseline-s2-1/app`.

## Outcome, boundaries and scope

Allowed production edits: `cli.mjs` summarize dispatch/aggregation. Extend
`test.mjs` and use cleaned temporary fixtures under `.tmp/`. Update packet
evidence, `todo.md` and current-only `handoff.md`. Consume `records.mjs`
unchanged; if it contradicts the approved contract, return to packet 01 for
correction and verification rather than fork its parser.

Summarize reads complete bytes through the same file-loading/parseRecords path
as validate, then computes count and total only after validation. Count is the
number of returned records; total is their sum. Empty input outputs exactly
`{"count":0,"total":0}\n`. Ordinary success outputs compact JSON {count,total}
plus LF, status 0, signal null, stderr empty. Maintain the same B1-002 grammar,
safe row amounts and invalid tuple as 01: status 2, signal null, stdout empty,
stderr exactly `INVALID_INPUT\n`, with no partial summary. Missing operand
or unreadable input follows that same bounded diagnostic path.

Do not constrain the aggregate to a safe integer: accepted individual amounts
can sum beyond it. Accumulate an exact integer internally with BigInt and emit
the total as an unquoted decimal JSON number; no BigInt escapes the records
interface and no string total or new rejection is introduced. Test raw output
for large totals rather than relying on lossy JSON.parse numeric comparisons.

Dependency direction remains CLI → shared parser → built-ins. Aggregation state
is local to one command invocation, with no I/O in the parser and one final
stdout write after all validation/aggregation. No second validator, new schema,
dependencies, configuration, persistent data, migration or new CLI options.
Preserve exact help/unknown behavior, validate behavior, test-process.mjs,
package.json, unrelated.txt, workflow documents and all unrelated/staged work.

Local rollout after green checks only. Correct the input and retry for recovery.
Rollback only packet 02 changes against its inspected pre-execution state, leaving
01 and pre-existing work intact. No external MANUAL GATE step is scheduled;
external actions and commits remain forbidden. No documentation packet follows.

## Test-first execution and acceptance map

Create new tests in `test.mjs` with prefix `summarize:` before implementation,
retaining and running 01's tests. Use real runCli(args, { env }) and exact
actual status/signal/stdout/stderr assertions; no CLI imports, mocks or default
child-process pipes. Reuse the byte fixtures/invalid corpus from 01 to keep one
test contract for both consumers.

| Criterion / IDs | Input/check to create | Expected observation |
| --- | --- | --- |
| Aggregate / B1-003 | `a,2\nb,7\nc,0\n`, and without final LF | `{"count":3,"total":9}\n`, success tuple |
| Empty / B1-003 | empty bytes | `{"count":0,"total":0}\n`, success tuple |
| Shared acceptance / B1-002,004 | leading zeroes, valid punctuation/case-sensitive IDs, zero, max safe row amount | correct count/total; validate still emits expected ordered records |
| Full invalid corpus / B1-002 | all 01 grammar, duplicates, bounds, line endings, malformed UTF-8 and BOM cases through both commands | identical status 2, signal null, empty stdout, `INVALID_INPUT\n` |
| Atomic summary / B1-002,003 | valid first row then malformed/duplicate/unsafe final row | exact invalid tuple, no aggregate prefix |
| Total range / B1-003 | three distinct IDs each with amount 9007199254740991 | raw stdout `{"count":3,"total":27021597764222973}\n`; no string total or overflow rejection |
| I/O and compatibility / B1-001,004 | missing operand and nonexistent path; help, unknown/no command; all validate fixtures | same bounded input errors and unchanged existing command behavior |

For shared-parser wiring, inspect both command branches calling the same function
and run a temporary parser mutation rejecting a known valid fixture: both CLI
commands must fail their corresponding success assertions. Restore it immediately.
This is structural verification and requires PROVE; do not count matching example
output alone as proof of shared wiring.

Execution sequence and copy-ready commands from the working directory:

1. Write tests first; run
   `rtk proxy node --test --test-isolation=none --test-name-pattern='summarize:' test.mjs`.
   Record relevant RED: current unknown-command behavior differs from required
   summary/error tuple. An import or harness failure does not prove behavior.
2. Implement summarize using the existing validation boundary, then repeat the
   focused command until correct assertions pass. Correct implementation rather
   than weakening a correct check.
3. PROVE atomicity: temporarily write a partial summary before a late validation
   error; require its exact-empty stdout assertion to fail, then restore.
   Run the shared-parser mutation above separately. Where RED failed to execute
   assertions, mutate the corresponding implemented behavior and record its
   discriminating failure. Restore each mutation before the next.
4. Run `rtk proxy npm test` for full regression and both commands.
5. Run `rtk proxy sha256sum unrelated.txt test-process.mjs package.json`
   and compare exact hashes below. Inspect scoped diffs and staged/unstaged/
   untracked paths, excluding workflow YAML contents; verify one shared parser,
   no dependencies, and no unrelated edits.

Preserved SHA-256:
- unrelated.txt: `66d58c226b7ae1af545c81f3d91e17b0d75f0e91fd9e77b3d4416cd9822ded19`
- test-process.mjs: `13575770b94cf15658477d715862b18536156e158d9c4fcfffba624e46b4e665`
- package.json: `6ea04556db3f66809279c9107d53991ef71c636ffc42cfc30f94b240909c5279`

Recheck pinned MCP state, record actual RED/GREEN/PROVE/final evidence, update
the sole checklist and replace current handoff. Mark complete only if every
required check passes; unavailable checks keep this packet incomplete. Stop after
02; no commit, publishing, review workflow or external action is authorized.


## Execution evidence

Packet 01 prerequisites and actual boundaries reverified: records.mjs:1 owns
parseRecords; cli.mjs:8 now shares its whole-file call between both commands;
test.mjs:44 owns valid corpus checks; test-process.mjs:6 owns real child capture.
Only cli.mjs, test.mjs, this packet evidence, todo.md and handoff.md changed in 02.

All commands ran from the declared app directory with Node v24.20.0. Manual
verification exited 0; Git worktree returned true. Existing staged additions,
unstaged packet 01 work and untracked files were inspected and preserved.

- RED: `rtk proxy node --test --test-isolation=none --test-name-pattern='summarize:' test.mjs`
  exited 1, all 35 tests failed at actual CLI assertions: UNKNOWN_COMMAND/status 2
  instead of summary success tuples or INVALID_INPUT. No harness/import failures.
- GREEN: the same focused command exited 0, 35/35 passed after implementation.
- PROVE atomicity: temporarily emitted a partial summary in the summarize catch.
  `rtk proxy node --test --test-isolation=none --test-name-pattern='summarize: CLI rejects late malformed' test.mjs`
  exited 1: actual stdout was {"count":1,"total":1}, expected empty. Restored.
- PROVE shared wiring: temporarily threw at parseRecords entry.
  `rtk proxy node --test --test-isolation=none --test-name-pattern='^(validate|summarize): CLI accepts ordered with final LF$' test.mjs`
  exited 1: both success assertions failed with INVALID_INPUT/status 2. Restored.
- Final `rtk proxy npm test` exited 0, 102/102 passed after both restorations.
  Includes raw exact total 27021597764222973, ordinary/empty summaries, shared
  valid and invalid corpus, late invalid rows, I/O and compatibility regressions.
- `rtk proxy sha256sum unrelated.txt test-process.mjs package.json` matched all
  preserved hashes above. records.mjs matched pre-execution SHA-256
  `ef3fd28fa55695552d06bbb84fa7823c2fb8a289125017c0655bed14594524bf`.
- Scoped final diffs inspected; `rtk proxy git diff --check -- cli.mjs test.mjs docs/specs/b1/tasks`
  passed. No parser mutation remains; no dependencies or unrelated changes added.
- Initial and final pinned specification_check_state passed: Approved, reviewed,
  no issues, unchanged source/specification/review pins above. All four linked
  requirements and behavior decision read completely through scenario MCP;
  confirmed Standard/core, no extra contracts or product linkage.

No unresolved decisions or required-check failures. Local Node environment only.
No commit, installation, global change, YAML edit, external action or review.
No next packet is scheduled; stopped at 02.
