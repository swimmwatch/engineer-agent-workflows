# Packet 02 — Summarize with shared validation

Outcome: add summarize using packet 01's exact validator and emit mathematically exact aggregate numeric tokens. Own B1-003/B1-005; preserve B1-001/B1-002 and B1-004. Read docs/specs/b1/spec.md exact B1-001 through B1-005 sections, pinned MCP definitions, plan.md boundary table and completed packet 01 evidence.

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

Depends on packet 01 completion: shared records.mjs:parseRecords exists, CLI validate uses it, its acceptance corpus and final npm test passed, and recorded evidence is current. Re-run that regression before adding summary behavior. Pending packet 01 means this packet is blocked, never skip the dependency.

Allowed production writes: cli.mjs only. records.mjs is a read-only shared contract input; if evidence shows it is defective, stop affected work and reconcile packet 01 rather than duplicating or silently changing validation. Test writes: test.mjs and temporary .tmp fixtures. Planning updates: this packet evidence notes, todo.md and current-only handoff.md. No new parser, dependency, specification edit or third packet.

## Boundaries and concrete contract

CLI summarize dispatch reads full file and invokes the existing parseRecords(bytes), exactly as validate does. Input grammar, uniqueness, numeric safe bound, fatal UTF-8 validation and error mapping are shared; do not implement another validation path. CLI outputs only after successful parsing. No extra read or persistent state.

Add pure `cli.mjs:formatSummary(records)`: receives the complete validated array, returns compact JSON text containing count and total. Count is the array length; initialize sum as BigInt zero and add BigInt(record.amount) for each already validated safe Number. Serialize total via its decimal digits directly into an unquoted JSON integer token. Never sum as Number, convert the sum back to Number, quote total, use scientific notation, or pass BigInt to JSON.stringify. The record order/values are not mutated. Dependency direction: CLI -> shared parser -> validated records -> formatter; parser knows no summary behavior.

`summarize <file>` success emits count and exact total plus LF, status 0, empty stderr. Empty input emits `{"count":0,"total":0}\n`. Malformed/duplicate/invalid input and decode/read failure emit status 2, stdout exactly '', stderr exactly `INVALID_INPUT\n`. Every individual amount must remain safe even though the total may exceed that bound. No partial result.

## Acceptance checks to create before implementation

Name summary tests `packet02`; focused command:
`rtk proxy node --test --test-isolation=none --test-name-pattern=packet02 test.mjs`.

| Check | Input / expected assertion | RED discrimination |
| --- | --- | --- |
| P02-empty | Zero bytes -> exact `{"count":0,"total":0}\n`, success streams/status/signal | Packet 01 CLI still returns UNKNOWN_COMMAND |
| P02-ordinary | `a,0\nb,0002\nc,3` with and without final LF -> count 3, total 5 numeric, exact compact stdout plus LF | Detects missing dispatch or wrong aggregation |
| P02-exact | `a,9007199254740991\nb,2\n` -> exact `{"count":2,"total":9007199254740993}\n` | Number accumulation rounds to 9007199254740992; quoted BigInt also fails |
| P02-repeat-large | `a,9007199254740991\nb,9007199254740991\nc,1` -> count 3 and numeric token 18014398509481983 | Guards multi-addition accuracy |
| P02-shared | Run packet 01 valid/invalid byte corpus through both commands, preserving validate outputs and expecting corresponding summaries or exact invalid result | Detects divergent grammar; includes duplicate, unsafe individual amount, CRLF, extra blank rows, signs, invalid IDs, BOM and malformed UTF-8 |
| P02-atomic | Good prefix followed by duplicate or invalid amount -> empty stdout, exact error, status 2 / null signal | Required partial-output PROVE per protocol |
| P02-compat | Retain packet 01 checks for help, unknown and validate unchanged; remove/replace only its temporary expectation that summarize is unknown | Protects prior packet behavior |

Reuse test fixture data for the corpus rather than duplicating grammar knowledge. Each summary process assertion uses real runCli and checks all four returned surfaces. Critically, do not validate B1-005 solely with JSON.parse or a JavaScript numeric literal comparison: both can round to the same wrong value. Assert raw stdout's full integer token as the decimal text above, with no quotes around it. Ordinary JSON validity may be checked additionally.

Inspect both data dispatch paths to confirm one parseRecords boundary. Any structural wiring check needs PROVE by temporarily bypassing the parser for summarize and observing failure, followed by restoration. Exact-number output assertions written first with relevant RED need no extra arithmetic mutation; if their assertion never executed during RED, temporarily replace BigInt accumulation with Number accumulation, confirm P02-exact fails, and restore.

After focused GREEN/PROVE, run final npm test including all packet 01 regressions, preservation checks and pinned MCP check. Update this packet completion only on full pass. Delivery then ends; no follow-on action is authorized.

