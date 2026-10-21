# B1-P1 — Shared validation and validate

## Technical proposal

Proposal ID: B1-P1-shared-parser. Packet ID: B1-P1. Requirements: B1-001, B1-002, B1-003 (empty validate), B1-004.

Adopt the exact `Shared validation contract` section of `docs/specs/b1/tasks/plan.md`. Add binding export `parseRecords(text)` in proposed `records.mjs`; extend existing `cli.mjs` to read, strictly decode and validate a whole input file and emit the ordered records for `validate <file>`. Dependency direction is CLI to parser; parser does not import the CLI. The parser either returns the complete validated array or throws; CLI maps invalid data to the shared error contract before any stdout write. A local error type or private helper can be chosen during implementation without changing this boundary.

Keep help and unknown commands compatible. Do not implement summarize in this packet. Add behavior tests to existing `test.mjs` using the unchanged `test-process.mjs` real-child `runCli(args, { env })` helper. Fixtures live under `.tmp/` and are removed in finally blocks. Preserve current stream/exit assertions and package test command. Write and run discriminating checks before production changes, fix implementation while correct checks fail, and prove absence/wiring guarantees by isolated mutations with restoration. No dependencies or production paths beyond `cli.mjs` and new `records.mjs` are needed.

## Technical agreement


proposal_id: `B1-P1-shared-parser`; packet_id: `B1-P1`.
agreement_ref: `{"id":"2edf26bc-aac3-40b1-ba22-f5aa6cc5def5","revision":2}`.
proposal_digest: `31887f89fa6b58342dcc169a8d84654d218b31dbce7fe0c96df6d104522286f7`.
Sources: `docs/specs/b1/tasks/plan.md#Shared validation contract` and this file's `Technical proposal`. Managed question revision 1 and answer revision 2 retain native simulated reply provenance. planning_packet_check returned `ready`, issues []; implementation remains unauthorized.

## Inputs and prerequisites

- source_version: `8c6a92f71b56f89de94d3f81a0dad3b0d95b26b1273a65367d8a74d143b77087`
- specification_version: `4b77db1d93030b893e8c9f60f5f9304257569ae2d2c04b515b188e1bccab6007`
- review_ref: `6ae906f6-ab94-4118-8103-0f790d6db1a7`
- Frozen SIMULATION inputs; Approved Markdown and MCP status pass, coverage reviewed. The tool does not authenticate consent or prove semantic correctness.

Working directory: `/tmp/eaw-tip-p03-df48iZ/runs/b1-candidate-s2-1/app`. Use installed Node/npm and rtk only; no dependency installation. Read exact `docs/specs/b1/spec.md` sections B1-001 through B1-004 and resolve their current MCP definitions at the pinned specification_version; do not read workflow YAML directly. No manifest-listed profile contract file exists. Read `tasks/plan.md` heading `Shared validation contract` and this packet's `Technical proposal`.

Before bulk implementation reads/edits require an explicit invocation for this packet, usable Git status including staged/untracked changes, specification_check_state pass/reviewed/Approved with expected_source_version above, and planning_packet_check ready with the exact binding above. Reverify `cli.mjs:2-4`, `test.mjs:1-4`, `test-process.mjs:6-25`, `package.json:5` against plan evidence. Locations refer to the planning baseline, not guaranteed future line numbers.

Preserve `test-process.mjs`, `package.json`, exact existing help and unknown-command compatibility. Preserve `unrelated.txt` exactly (SHA-256 `66d58c226b7ae1af545c81f3d91e17b0d75f0e91fd9e77b3d4416cd9822ded19`), repository instructions and all independent fixture changes. Do not edit manifest/spec/behavioral decisions, install, commit, publish, use external services or execute another packet.

## Test environment and assertions

Tests to create belong in `test.mjs`. Use `runCli(args, { env })` from the unchanged helper for actual child CLI assertions; imports or mocks cannot replace these checks. Use temporary input files under ignored `.tmp/`, including paths containing spaces, with cleanup in finally blocks. Add parser tests only where they test its separate contract rather than duplicate all CLI assertions.

Every successful CLI case asserts actual status 0, signal null, stderr empty, and exact stdout including LF. JSON object field order follows the selected serialization contract: validate records use id then amount; summarize uses count then total. Every invalid-data case asserts actual status 2, signal null, stdout exactly empty, stderr exactly `INVALID_INPUT\n`. Preserve existing exact assertions, and retain help exact text/status with added stderr/signal checks and unknown command status 2, empty stdout, `UNKNOWN_COMMAND\n`, null signal.

Future focused command from the working directory: `rtk proxy node --test --test-isolation=none --test-name-pattern='<packet pattern>' test.mjs`, substituting the explicit pattern below. Final repository command: `rtk proxy npm test`. These are planned executions, not checks run during planning.

## Execution discipline and completion

Write tests first, run focused command and record each relevant RED failure before changing production behavior. An UNKNOWN_COMMAND failure can discriminate initial CLI behavior, but ensure tests later reach parser and aggregation assertions. A missing import/collection failure is not sufficient; fix harness and use PROVE after GREEN if the intended assertion did not run in RED. Implement the smallest correct behavior, fixing implementation while correct checks fail; never loosen a correct assertion to obtain green.

Run each specified mutation individually, observe its intended assertion fail and restore it immediately; never leave mutations in the delivery. Direct output assertions with meaningful RED need no additional mutation. Run focused verification and `rtk proxy npm test` after restoration. Missing required checks keep this packet incomplete.

Inspect only scoped production/tests and task-document diffs, including staged and untracked files; exclude workflow YAML content and review archives. Recheck pinned specification and technical agreement after work. Verify unrelated.txt hash and infrastructure preservation. Record actual RED/GREEN/PROVE evidence and any unavailable check in handoff; mark only this packet complete in todo when every required check passes. Stop without implementation of the next packet, review invocation, commit or publication.

No data migration or external release exists. Recover by restoring only this packet's known edits and temporary mutations while preserving independent changes; no wholesale Git reset. Security boundary is untrusted local input, fixed diagnostics and no partial stdout; no additional profile or telemetry work is included.

## Outcome and scope

Deliver validate and the reusable parser independently of summarize. Allowed writes: `cli.mjs`, new `records.mjs`, `test.mjs`, and completion/evidence updates in `docs/specs/b1/tasks/todo.md` and `handoff.md`. Leave hashed technical sections unchanged. No summarize implementation or assertions requiring summarize success in P1. Tests may introduce reusable invalid-input fixture data in test.mjs for P2.

## Acceptance and discriminating checks

Name new tests with prefix `P1 `; focused pattern is `P1|existing help`.

| Requirement | Owning check to create | Input and exact expected result |
| --- | --- | --- |
| B1-001, B1-002 | CLI valid records | `a,1\nB_-2,002\n` -> `[{"id":"a","amount":1},{"id":"B_-2","amount":2}]\n`; repeat without final LF. |
| B1-002 | CLI numeric boundaries | `a,0\nb,9007199254740991` succeeds with both numeric amounts; `a,9007199254740992` is invalid. |
| B1-003 | CLI empty file | Zero bytes -> `[]\n`. A file containing only LF is an invalid blank row. |
| B1-002 | CLI grammar matrix | Reject missing/extra comma, empty id/amount, id containing space/dot/non-ASCII, amount with whitespace, sign, decimal, exponent, non-ASCII digit; reject leading/interior blank rows, two terminal LFs and CRLF. Include final amount followed by CR so a permissive end-anchor/trim defect is caught. |
| B1-002 | CLI duplicate detection | `a,1\na,2` invalid; `a,1\nA,2` valid. |
| B1-001, B1-002 | CLI decoding | Malformed UTF-8 bytes and UTF-8 BOM before `a,1` invalid; preserve strict row grammar. |
| B1-002 | CLI complete-input failure | `a,1\nb,2\na,3` and valid prefix followed by malformed row both fail with exactly empty stdout, including no prefix or JSON fragment. |
| B1-002, B1-004 | Parser lifecycle | Calling parseRecords on valid input twice gives independent arrays; a previous duplicate failure cannot contaminate a subsequent valid call. Test mutation of one returned array does not affect the next call. |
| B1-001, B1-004 | Existing regressions | Exact help and unknown-command streams/status; only Node built-ins and no package changes. |

PROVE: temporarily emit a prefix before parsing a late-invalid file; the exact empty-stdout assertion must fail, then restore. For any parser check whose RED was only a missing export, temporarily disable the corresponding validation rule after GREEN, observe the matching invalid-input assertion fail, then restore. For the array ownership check, temporarily retain/reuse the array between calls and confirm the independence assertion fails, then restore. These mutations are confined to packet-owned code and test inputs, with no external effects.

Packet acceptance: all matrix cases pass through real child commands, the reusable function contract is present, no summarize behavior was implemented, npm test passes, agreement/spec remain current, preservation checks pass. Capture evidence for P2 that `parseRecords(text)` is the sole validator and P1 tests are green. Stop after P1.
