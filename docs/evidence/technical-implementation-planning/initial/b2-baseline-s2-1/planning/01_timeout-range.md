# 01 — Expand timeout range

Status: complete under the explicit implementation invocation. One compact packet; B2-001–B2-004.

## Inputs and readiness

Approved source: `docs/specs/b2/spec.md`, exact B2-001 (lines 7–10), B2-002 (11–14), B2-003 (15–18), B2-004 (19–22). No separate profile contract or design dependency exists.

- `source_version`: `390b67d79741e06e54b88c2f8468cd511ecd5791b915b167352f2ac0bc1d404e`
- `specification_version`: `4f85f3b995a54ce1e1fdbf8de5895c3b8c9cea70c58f9119a7ea8325efe35862`
- `review_ref`: `f59678c8-4355-4c78-8ea9-785699613205`
- Decision: `d7012935-8d3c-4062-afbb-1091bec3bbe8@1`; confirmed scope: `scope.manifest@2`. These are frozen SIMULATION inputs, not authority for external work.

No predecessor packets. Before execution, obtain explicit invocation for this packet, open b2 with scenario MCP, and call specification_check_state with the pinned aggregate expected_source_version above. Require pass/reviewed/Approved and matching versions; drift returns to the specification/planning owner without modifying frozen scope. Use requirement_get with specification_version as source_version for the four linked definitions; follow continuations. Reverify listed source lines and Git status, staged/untracked changes and ownership before editing. Existing staged files are allowed; no Git initialization, installation or global changes. Existing installed Node, npm and rtk are required; unavailable runners keep the packet incomplete.

## Scope and boundaries

Allowed implementation edits: `configuration.mjs` and `test.mjs`; completion edits: this packet's evidence notes, `tasks/todo.md`, and current-only `tasks/handoff.md` in this specification. Preserve all other content, including `cli.mjs`, `test-process.mjs`, `package.json` and `unrelated.txt`. Do not add dependencies, features, profile files, classes or CLI options. No commit, install, publishing or external action.

`configuration.mjs:1–5` owns pure synchronous `parseTimeout(raw)`: undefined gives 5000; ASCII decimal integer strings representing 1..60 inclusive, including leading zeroes, give seconds times 1000. All specified invalid strings throw Error('INVALID_TIMEOUT'). Keep its named export, lexical guard and stateless lifecycle; only its upper-bound policy needs expansion from 10 (`configuration.mjs:3`). This unit owns B2-001–003 and has no dependencies or resources.

`cli.mjs:2–4` depends on parseTimeout and owns environment input, serialization, streams and process exit. Success writes exactly `JSON.stringify({timeoutMs,format:'json'})+'\n'`, empty stderr, status 0 and signal null. Failure writes empty stdout, exactly `INVALID_TIMEOUT\n` stderr, status 2 and signal null. Verify this existing boundary without an expected edit (B2-001–003).

`test.mjs:1–4` currently checks undefined, '5' and zero. Extend it using Node test/assert and `runCli` from `test-process.mjs:6–27`, which owns real child execution, file-descriptor capture and cleanup. Preserve that helper, exact stream/exit assertions and `package.json:5` command `node --test --test-isolation=none test.mjs` (B2-004). Tests depend on production units and helper, never the reverse. No mocks or imported CLI substitute for subprocess assertions.

## Test-first acceptance and execution

Working directory for all commands: `/tmp/eaw-tip-p03-df48iZ/runs/b2-baseline-s2-1/app`. Prefix shell commands with `rtk proxy`. Tests below are to be created in test.mjs; `npm test` already exists.

1. Record scoped invocation baseline with `rtk proxy git status --short`, scoped diffs for non-YAML files, and `rtk proxy sha256sum unrelated.txt cli.mjs test-process.mjs package.json`. Never shell-read or diff workflow YAML. Planning's unrelated.txt SHA-256 is `66d58c226b7ae1af545c81f3d91e17b0d75f0e91fd9e77b3d4416cd9822ded19`; preserve it exactly.
2. Before production edits, add the following behavior checks, retaining the baseline checks. Use named subtests or independent tests so invalid cases still execute when a valid case fails.

| Requirements | Owning layer and checks to create | Discriminating result |
| --- | --- | --- |
| B2-001 | Function undefined -> 5000 and '5' -> 5000. Real CLI with env `{TIMEOUT_SECONDS: undefined}` and '5'. Pass env explicitly through `runCli([], {env})` to avoid ambient input. | Exact successful result `{status:0,signal:null,stdout:'{"timeoutMs":5000,"format":"json"}\n',stderr:''}`; named export remains usable. |
| B2-002 | Function every integer string 1..60 -> n*1000; leading-zero samples '01', '0011', '060' -> 1000, 11000, 60000. Real CLI '1', '10', '11', '60', '060'. | Exact success object/streams/status/signal as above with corresponding milliseconds; '11' and '60' must fail on the old cap and pass after expansion. |
| B2-003 | Function and real CLI each of '0', '00', '61', '061', '999999999999999999999999', '1.5', '+1', '-1', ' 1', '1 ', '1\n', '', 'abc', '1e1', and non-ASCII digit '１'. | Function throws with exact message INVALID_TIMEOUT; each child returns exactly `{status:2,signal:null,stdout:'',stderr:'INVALID_TIMEOUT\n'}`. Guards catch off-by-one, numeric coercion and lexical regressions. |
| B2-004 | Scoped before/after status/diff and preservation hashes; existing npm command and real helper retained. | Only bounded production/test and planning evidence edits; unrelated bytes and infrastructure unchanged; no dependency or external changes. |

3. RED: run `rtk proxy npm test` before production edits. Record actual assertion failures for newly valid '11'/'60'/leading zeroes and child CLI success expectations, caused by the current cap of 10, not a harness or import failure. Other compatibility tests may already pass. Repair harness errors rather than count them as meaningful RED.
4. GREEN: minimally expand the parser's upper limit to 60. Keep lexical validation, default, conversion, export and CLI untouched. Run `rtk proxy npm test`; correct implementation until all correct checks pass, never weaken checks to obtain green.
5. PROVE: direct value assertions that failed meaningfully during RED already discriminate. If RED missed an intended assertion, checks were added after behavior, or changed wiring/absence guarantees need proof, mutate one relevant behavior at a time, run the suite and record the specific assertion failure, then restore. For the required empty-stdout error assertion, temporarily inject stdout on CLI failure, verify the real subprocess assertion fails, restore cli.mjs exactly and rerun. Do not retain mutation edits. Baseline constraints do not otherwise require redundant mutations.
6. Final verification: run `rtk proxy npm test` after all restoration; recheck preservation hashes and scoped diffs/status including staged/untracked content. Inspect only exact non-YAML paths in content diffs. The single-file suite is both focused and full repository verification; no separate test script is needed. Record actual command, exit and results; unavailable/failed checks keep completion pending.
7. Recheck specification_check_state with pinned expected_source_version before completion. On matching pass and all required checks green, update sole checklist and current handoff with RED/GREEN/PROVE, preservation evidence and exact changes, then stop after packet 01. No automatic review, workflow invocation or commit.

## Delivery and recovery

Local isolated Node fixture is the planned execution environment for all criteria; no broader platform support is asserted. No migration, network, persistent state, design gate or deployment is involved. Strict validation and fixed error text preserve security/privacy behavior; no new logging. Durable developer documentation is unwarranted for this localized configuration change, so no documentation packet is added.

If verification exposes a defect, repair only authorized packet edits. Recovery restores only this packet's own changes after inspecting pre-existing work, never resets the staged fixture wholesale. Reverting the upper-bound edit restores 1..10 behavior and removes expanded acceptance. External or irreversible actions have no authorized manual gate in this packet.

## Execution evidence

Implemented only packet 01 for B2-001–004 in the declared application directory. Manual verification exited 0; Git returned true. Scenario MCP reads of current scope, both exact decisions and all four requirements were complete without continuations. Before-work and final pinned state checks matched the recorded source/specification/review: pass, reviewed, Approved, no issues or checkpoint write. No additional profile contracts or product linkage exist.

Inspected staged non-YAML diffs and all untracked task documents; no prior implementation or overlapping changes existed. Source boundaries matched configuration.mjs:1–5, cli.mjs:1–4, test-process.mjs:6–27 and package.json:5. Existing staged fixture and untracked planning files were preserved.

All commands below ran with rtk proxy in the declared application directory:

- RED: npm test exited 1; 101 tests, 46 passed, 55 failed. Old cap rejected function values 11..60, 0011 and 060. Real CLI success assertions for 11, 60 and 060 observed status 2/INVALID_TIMEOUT instead of expected JSON/status 0. Invalid-input and baseline tests executed and passed. No harness failure or test weakening.
- GREEN: changed only configuration.mjs:3 upper bound from 10 to 60. npm test exited 0, 101 passed. test.mjs retains baseline checks and adds every accepted integer, leading zeroes, defaults and exact real-process success/error results using the preserved runCli helper.
- PROVE: temporarily injected a stdout write of probe plus newline into the CLI catch. npm test exited 1, 86 passed and all 15 CLI rejection assertions failed because stdout was nonempty. Restored cli.mjs exactly.
- Final: npm test exited 0; 101 passed, 0 failed/skipped/cancelled. This is both focused and full repository verification. Scoped diff/status confirms only parser/tests plus this evidence/checklist/handoff changed during execution.

Before/after sha256sum unrelated.txt cli.mjs test-process.mjs package.json matched exactly:

- unrelated.txt: 66d58c226b7ae1af545c81f3d91e17b0d75f0e91fd9e77b3d4416cd9822ded19
- cli.mjs: 22c6387aeb77eed11452a5858f4e756e4b6838df386f700c5bb5da412e9e9a97
- test-process.mjs: 13575770b94cf15658477d715862b18536156e158d9c4fcfffba624e46b4e665
- package.json: 6ea04556db3f66809279c9107d53991ef71c636ffc42cfc30f94b240909c5279

No dependencies, commits, installs, global changes or external actions. Verification covers only the supplied isolated Node fixture. No blockers, unresolved choices or next packet; stop here.
