# Packet 02: summarize using shared validation

Packet ID: b1-02-summarize. Requirements: B1-002, B1-003, B1-004, B1-005; B1-001 compatibility.

## Technical proposal

Adopt `docs/specs/b1/tasks/plan.md` section `Shared validation contract` exactly. After packet b1-01-validate is complete and verified, add `summarize <file>` to `cli.mjs`, invoking the same exported `parseRecords(bytes)` from `records.mjs`. Do not fork, relax or reimplement validation. Proposed binding internal function `summarizeRecords(records)` accepts that validated array and returns `{count: number, total: bigint}`; it performs no I/O and keeps accumulator state local. Sum BigInt(record.amount) from 0n, never sum Numbers or convert total back to Number. Safe individual Numbers convert exactly to BigInt.

CLI serializes count and total as numeric JSON tokens, inserting total.toString() unquoted into a fixed object representation, with one LF. Do not JSON.stringify a BigInt or quote its decimal digits. Empty input emits `{"count":0,"total":0}\n`. Input validation completes before aggregation/output; all shared failure/compatibility rules apply. No other public exports are required; minor private organization remains flexible. BigInt avoids a custom decimal arithmetic implementation while guaranteeing B1-005. Exact authoritative references: `docs/specs/b1/spec.md` sections B1-002 through B1-005 and B1-001 for preserved help.

Extend real CLI subprocess tests in `test.mjs` using unchanged runCli helper and npm test command. Compare raw stdout for large totals: 9007199254740991 plus 2 must produce numeric token 9007199254740993; JSON.parse Number equality alone cannot verify exactness. Repeat shared valid/invalid cases for both commands to detect divergent contracts. Preserve exact stream/status/signal assertions.

## Technical agreement

Selected proposal_id: b1-02-bigint-summary; packet_id: b1-02-summarize.
agreement_ref: {"id":"f0ad9771-dd7f-42c3-8cb8-db65ce88517d","revision":2}.
proposal_digest: 5d56aef401bd4d277f4e32ea8e007ed7c8b5d3f91e9351f65cc542bde113e349.
Sources: this file, heading `Technical proposal`; tasks/plan.md, heading `Shared validation contract`.
Provenance: managed question/answer f0ad9771-dd7f-42c3-8cb8-db65ce88517d, revisions 1/2; native frozen simulated respondent selected both proposals. planning_packet_check: ready, issues []. This is technical planning agreement only. Execution is not authorized; packet 02 also awaits completed packet 01.

## Execution details

### Inputs and execution gates

Frozen SIMULATION; Approved spec and confirmed Standard/core scope. Completeness check: pass, reviewed. Pinned inputs:

```text
source_version: da99f1c8f59662d354c8b3dacb99195154570a1cec88906e26ce23c178e88496
specification_version: c1bdb1c7c8031493f0b3874497844574d7df65fda7f4306307163b5f7b6f2877
review_ref: 49ae2b90-6cb1-4f0d-87fd-31003edd8fe5
```

Working directory: application root $TRIAL_ROOT/runs/b1-candidate-precision-v3-2/app. Installed dependency-free Node and npm are the runners; do not install anything. Exact existing command: `rtk proxy npm test` (package.json:4-5 uses `node --test --test-isolation=none test.mjs`). Do not change this command. Before execution, obtain explicit authorization for this specific packet; this plan and the simulated answer do not supply it. Open b1 through MCP, run specification_check_state with the pinned source_version and planning_packet_check with this packet's exact agreement/digest before bulk implementation reads and again before completion. Changed inputs or commitments return affected work to its owner.

Planning-baseline evidence: cli.mjs:2-4 has only help and unknown-command routing, no validator; packet 02 must instead find verified packet 01 additions when rechecking; test.mjs:3-4 uses runCli and asserts existing exact help; test-process.mjs:6-25 owns real subprocess execution, file-descriptor stream capture and cleanup. Preserve that helper byte-for-byte, including actual status/signal and file-based stream capture. Preserve existing exact assertions, never replace CLI tests with imports/mocks. Git status is readable and initial fixture files are staged additions; a clean tree or commit is not required. Read status and scoped staged/unstaged/untracked changes before work; preserve existing staged content and unrelated.txt exactly. Exclude workflow YAML contents from shell searches/diffs and use scenario MCP for their state.

### Test-first method and completion

Create behavior tests in test.mjs before implementation and run `rtk proxy npm test`; record which intended assertions fail, then implement and rerun until correct assertions pass. Do not weaken correct checks. All CLI assertions must use existing runCli with real temporary input files beneath app/.tmp; write raw bytes for decoding tests, clean up fixtures in finally. For every result assert status, signal === null, exact stdout and exact stderr. Success means status 0 and stderr ''; failure means status 2, stdout '' and stderr 'INVALID_INPUT\n'. Unknown command retains status 2, stdout '', stderr 'UNKNOWN_COMMAND\n'; help retains its exact stdout and status 0 with stderr ''. Do not merely assert parsed payload shape or nonzero status.

PROVE the affected no-partial-output guarantee by temporarily writing a prefix before late validation, observing that the late-error subprocess test fails on stdout, then restore. For any RED that stops before its intended assertion, apply an equivalent focused mutation after GREEN and restore. Direct output assertions that failed meaningfully during RED need no extra mutation. Record every required mutation result. Run the full existing `rtk proxy npm test` after restoring. A required failed/unavailable check leaves this packet incomplete.

Review only the scoped diff (including staged and untracked paths, excluding workflow YAML contents), confirm agreement and pinned spec again, record actual RED/GREEN/PROVE and final results in handoff.md, check only this packet's completed items in todo.md, and stop. No automatic next packet, review workflow, commit, install, publication or external action. If checks fail, correct scoped implementation; if scope/behavior is ambiguous, stop affected work and return to specification. Recovery removes only this packet's own changes after inspecting overlap; never reset the staged fixture wholesale.

### Dependency and scope

Requires completed b1-01-validate, its recorded passing subprocess suite and unchanged shared proposal/parseRecords signature. Verify that evidence on the new explicit invocation. Technical agreement ready is distinct from this unmet execution dependency. Allowed production change: cli.mjs; tests: test.mjs; execution metadata: tasks/todo.md and tasks/handoff.md. Read records.mjs as the shared contract provider; do not change its validation contract. A necessary shared-boundary change reopens both technical proposals through planning. No extra packet or documentation artifact is authorized.

### Acceptance and test map

| Requirement | Tests to create before implementation | Expected discriminating result |
| --- | --- | --- |
| B1-003 | summarize empty input; `a,1\nb,2\n`; single zero; leading-zero amount | Exact `{"count":0,"total":0}\n`, `{"count":2,"total":3}\n`, and corresponding exact count/total JSON |
| B1-005 | `a,9007199254740991\nb,2\n` | Raw stdout exactly `{"count":2,"total":9007199254740993}\n`; numeric, unquoted total token |
| B1-005 | Two max-safe rows plus zero, and a small total | Raw exact total 18014398509481982 and correct count; normal small sums remain numeric |
| B1-002, B1-003, B1-004 | Run the packet 01 valid/invalid input table for both commands, including malformed UTF-8, unsafe individual amount, late duplicate/malformed row, LF/CR/BOM edge cases | Same acceptance/rejection contract; summarize never accepts unsafe individual amounts even though total supports BigInt |
| B1-001, B1-004 | All packet 01 validate/help/unknown regression tests | Existing exact output/status/stream checks continue to pass |

Reuse the existing fixtures/case table rather than copy grammar logic into tests or production. Compare expected raw strings for exact totals; JSON.parse may round and is insufficient evidence. All success results require status 0, null signal and empty stderr. Every invalid case requires status 2, null signal, empty stdout and exact INVALID_INPUT diagnostic. Baseline packet 01 has no summarize branch, so expected success assertions fail meaningfully before implementation. In addition to shared absence PROVE, temporarily switch the accumulator to Number, confirm the 9007199254740993 raw-token check fails, and restore BigInt before the final suite. This verifies the precision-sensitive boundary.

### Rollout and boundary

Local CLI addition, no stored data or migrations. Recovery restores only packet 02 changes, leaving verified packet 01 usable; preserve any overlapping user changes. No credentials, external processes beyond authorized local runner, network, telemetry or persistent accumulator state. Runtime coverage is installed Node in this isolated fixture; no additional platform matrix is promised. Finish only after exact-token, contract parity, regression and MCP freshness checks pass; update only packet 02 checklist items and current handoff, then stop.

