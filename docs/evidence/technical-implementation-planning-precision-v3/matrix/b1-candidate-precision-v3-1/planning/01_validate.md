# Packet b1-01: shared validation and validate

## Technical proposal

Binding proposal `b1-validation-v1`, packet `b1-01`, requirements B1-001, B1-002, B1-003 (empty validate result), B1-004. Include the exact `Shared technical contract` section of `docs/specs/b1/tasks/plan.md` as a binding source. Create `records.mjs` with the proposed shared `parseRecords(text)` signature there. Extend `cli.mjs` to dispatch `validate <file>` through whole-file decoding and that parser, then JSON serialization of numeric amounts in input order. Validation must complete before the first stdout write. Do not implement summarize in this packet. Preserve exact help and unknown-command streams and exit behavior. Tests extend `test.mjs` and invoke the real CLI using existing `runCli(args, {env})` from `test-process.mjs`; preserve that helper, exact stream/status/signal assertions and the installed `npm test` driver. No dependencies. A pure validator plus thin CLI is sufficient; a class or streaming pipeline would add lifecycle complexity without an approved scale requirement.

## Technical agreement

proposal_id: `b1-validation-v1`; packet_id: `b1-01`; proposal_digest: `b4805c6abd37a4542411abfc0223266d413ef0f6d3c0bea1f587ab37164ab460`; agreement_ref: `d8b8e60f-bf26-4f22-83ed-abbc4e8a0636@2`. Actual native reply is preserved in managed planning decision revision 2. Bound sources: this file's `Technical proposal` and `docs/specs/b1/tasks/plan.md#Shared technical contract`. Planning readiness check is recorded in handoff; execution additionally requires explicit invocation.

## Inputs and prerequisites

Pinned reviewed inputs: source_version `82c6780d2fede08dec901ecc268c62312dfcdad1aee22a70639b10d836096df7`; specification_version `c1bdb1c7c8031493f0b3874497844574d7df65fda7f4306307163b5f7b6f2877`; review_ref `da3da754-4dab-46e9-9375-0c9789800ca7`. MCP state passed with reviewed coverage and Approved Markdown; approval checkpoint is absent, and the tool did not assign approval. Frozen simulation inputs remain authoritative. Read only this packet's linked requirement headings from `docs/specs/b1/spec.md`; recheck versions through MCP before execution and completion.

Reverify repository evidence: `cli.mjs:2-4` contains only help/unknown dispatch; `test.mjs:1-4` contains the help subprocess regression; `test-process.mjs:6-27` owns real child capture, status/signal and cleanup; `package.json:5` defines the installed single-file test driver. Git status is readable and initial files are already staged; preserve those staged changes. Obtain explicit authorization for this packet in a later invocation before implementation. No installation authority is granted. Use the installed Node runtime and existing runner; if unavailable, remain incomplete. No OS/runtime support matrix is promised by the spec: planned execution is this local fixture, with no portability pass claimed.

## Scope and preservation

Allowed implementation paths: `cli.mjs`, `records.mjs`, `test.mjs`. Keep `test-process.mjs`, `package.json`, frozen spec/scope, unrelated files and existing staged work intact. Tests may create and clean invocation-local input files under `.tmp/` in try/finally; do not retain generated inputs. Update only this packet's execution notes, `todo.md`, and current `handoff.md`. Workflow journal transitions, start/completion records and checks use scenario MCP only under a separately invoked implementation workflow. No direct workflow YAML access.

Preserve `unrelated.txt` byte-for-byte: baseline SHA-256 `66d58c226b7ae1af545c81f3d91e17b0d75f0e91fd9e77b3d4416cd9822ded19`. No commits, installs, publishing or external actions. No data migration or external rollout: the local CLI is the only runtime boundary. Recovery is to correct the scoped implementation and rerun checks; if abandoned, revert only edits owned by this invocation, preserving pre-existing staged changes. Never reset the worktree wholesale.

## Acceptance and test-first map

Create discriminating cases in `test.mjs` before implementation:
- B1-001/B1-003: validate empty bytes -> exact JSON array `[]`; mixed valid rows `a,0\nZ_9-,007\nx,9007199254740991\n` -> ordered records with numeric amounts 0, 7 and 9007199254740991. Cover both presence and absence of one final LF. Assert status 0 and empty stderr. Successful JSON may have one terminal LF; assert the selected complete output exactly and use the same convention consistently.
- B1-002: table cases for invalid ID/empty ID, missing amount, negative/plus/fraction/exponent, non-ASCII digit, unsafe 9007199254740992, extra comma, whitespace, CRLF, interior blank row, second terminal LF, lone LF, duplicate ID (including non-adjacent), BOM and malformed UTF-8 bytes. Each must assert status 2, empty stdout, exact `INVALID_INPUT\n`, null signal. Include a valid prefix followed by an invalid row so partial-result failures are visible.
- B1-004: run repeated inputs and repeated parser calls to detect retained duplicate state; verify exact help and unknown-command regression. Node built-ins only and unchanged helper/runner are checked by scoped diff.
- Add pure parser checks for return shape, input order, complete-input rejection and independent calls; these supplement real CLI tests. If initial RED is only missing module/import, perform PROVE after GREEN on a row-check defect.

Expected RED: current CLI returns UNKNOWN_COMMAND for valid validate cases, so successful output/status assertions fail. Do not introduce summarize checks here: this packet must pass independently before packet 2 exists.

## Execution and completion

All commands run from the application root and use the required rtk prefix. Preserve `npm test` as `node --test --test-isolation=none test.mjs`. After writing checks and before production edits, run `rtk npm test` and record the relevant RED assertion. Then implement, correct production behavior until correct checks pass, and rerun `rtk npm test` as final verification. Do not loosen correct assertions to get green.

CLI cases must call existing `runCli(args, {env})`, with actual exit status, `signal === null`, exact stdout and exact stderr asserted. Do not replace subprocess checks with imports or mocks; pure-function tests may supplement them. Keep original help assertion and add exact empty stderr/null signal checks. Expected help is `record-report: validate <file> | summarize <file>\n`, status 0; unknown command remains status 2, stdout empty, stderr `UNKNOWN_COMMAND\n`.

Use PROVE when an absence/wiring criterion is affected or RED never reaches the intended assertion: temporarily introduce one defect, observe the discriminating assertion fail, then restore and rerun. In particular force premature stdout before an invalid final row to prove the empty-stdout assertion. Record mutation and failing check; no mutation remains in delivery. Direct output assertions reached in RED need no extra mutation.

Before completion, recheck pinned specification with `specification_check_state(expected_source_version)` and exact technical binding with `planning_packet_check`. Inspect working, staged and untracked scoped changes with `rtk git status --short` and `rtk git diff -- cli.mjs records.mjs test.mjs docs/specs/b1/tasks` plus `rtk git diff --cached -- cli.mjs records.mjs test.mjs docs/specs/b1/tasks`; inspect any untracked allowed file explicitly. Exclude workflow YAML from content diffs. Check `rtk proxy sha256sum unrelated.txt` against the baseline and preserve helper/runner bytes. Failed/unavailable checks keep the packet incomplete. Update the sole checklist and handoff with actual results, then stop at this packet boundary; do not execute the next packet. Optional review is separately invoked and is not a completion prerequisite.

## Execution notes

Completed in the explicitly authorized simulation implementation invocation on 2026-10-21. Only b1-01 executed.

- RED: checks were written before production edits. `rtk proxy npm test` exited 1: 2 passed, 27 failed. Valid validate cases reached the status assertion (actual 2, expected 0); invalid cases reached exact stderr assertions (UNKNOWN_COMMAND rather than INVALID_INPUT). The pure parser check failed on the absent module, so row validation additionally received PROVE.
- GREEN: added `records.mjs:1` exporting pure synchronous `parseRecords(text)` and extended `cli.mjs:7` with whole-file reading, fatal UTF-8 decoding retaining BOM, shared parsing and one complete JSON write. Successful output consistently ends with one LF. Tests in `test.mjs` retain real `runCli` subprocesses, exact streams/status/null signal, plus pure parser coverage. All 29 checks passed.
- PROVE: temporarily removed the safe-integer guard. `rtk proxy npm test` exited 1 with 27 passing and 2 failing: unsafe CLI input and pure parser missing-exception assertion. Restored the guard. Separately inserted a stdout write before parsing; the run exited 1 with 4 passing and 25 failing, including late-invalid-row stdout actual `premature` versus empty. Restored the write boundary. Final `rtk proxy npm test` exited 0: 29 passed, 0 failed. No mutation remains.
- Final scoped diff and untracked `records.mjs` inspected against the agreed technical commitments: shared signature, ownership, dependency direction and whole-input behavior match; no technical or behavioral deviation. Working/staged/untracked state inspected; original staged work preserved without staging new edits. Test inputs were cleaned in try/finally.
- Preservation: unrelated.txt SHA-256 remains `66d58c226b7ae1af545c81f3d91e17b0d75f0e91fd9e77b3d4416cd9822ded19`; test-process.mjs remains `13575770b94cf15658477d715862b18536156e158d9c4fcfffba624e46b4e665`; package.json remains `6ea04556db3f66809279c9107d53991ef71c636ffc42cfc30f94b240909c5279`. Helper and npm driver bytes are unchanged.
- Final MCP specification check: pass, Approved, reviewed, unchanged pinned source/specification/review. Approval checkpoint absent, no approval assigned. Exact b1-01 planning check: ready, no issues, unchanged agreement and proposal digest above.

No blockers. Evidence covers the installed local fixture runtime only; no portability or performance claim. No dependencies, commits, installs, external actions or global changes. Summarize and packet b1-02 were not implemented or executed. Stop here; next packet requires its own explicit invocation.

