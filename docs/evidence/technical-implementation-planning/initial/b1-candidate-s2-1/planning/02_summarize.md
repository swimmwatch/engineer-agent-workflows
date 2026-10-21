# B1-P2 — Summarize using shared validation

## Technical proposal

Proposal ID: B1-P2-shared-consumer. Packet ID: B1-P2. Requirements: B1-002, B1-003, B1-004; B1-001 compatibility regression.

Adopt the exact `Shared validation contract` section of `docs/specs/b1/tasks/plan.md`. Require completed, passing B1-P1 with binding `records.mjs` export `parseRecords(text)`. Extend `cli.mjs` dispatch for `summarize <file>`, consuming the same fully validated array used by validate; derive `{count,total}` from its length and numeric amounts, with zero initialization for empty input. Serialize only after complete input validation. Keep aggregation a small function or expression inside CLI; its private name is flexible. Do not introduce a second parser, subclass, dependency, streaming partial result or changed validation rule. `records.mjs` is a read-only dependency for this packet; a material parser change returns both affected proposals to planning.

Extend `test.mjs` with summarize success and invalid-input parity cases using the unchanged real-child helper. Verify reuse by a temporary parser rejection mutation affecting both commands, then restore it. Preserve validate, exact help, unknown commands, test infrastructure and unrelated files. Write and run checks before changing production behavior, correct implementation until correct checks pass, and perform required isolated absence/wiring mutations. Allowed production change is `cli.mjs` only.

## Technical agreement


proposal_id: `B1-P2-shared-consumer`; packet_id: `B1-P2`.
agreement_ref: `{"id":"2edf26bc-aac3-40b1-ba22-f5aa6cc5def5","revision":2}`.
proposal_digest: `3aa942bfb37cc094458661c8d12ec976a86b0e9952f62751c0cae2da2929cd54`.
Sources: `docs/specs/b1/tasks/plan.md#Shared validation contract` and this file's `Technical proposal`. Managed question revision 1 and answer revision 2 retain native simulated reply provenance. planning_packet_check returned `ready`, issues []; execution remains pending B1-P1 completion and explicit P2 authorization.

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

## Dependency, outcome and scope

Require B1-P1 completed in todo/handoff with actual RED/GREEN/PROVE evidence, passing npm test, current agreement and parser export confirmed from scoped code. A plan entry or ready technical agreement alone does not complete P1.

Deliver summarize by consuming P1's parser and complete validated records. Allowed delivery writes: `cli.mjs`, `test.mjs`, `docs/specs/b1/tasks/todo.md` and `handoff.md`. `records.mjs` is read-only except the explicitly restored verification mutation. Do not change its contract or any hashed proposal section. No duplicate validation, alternate input mode, additional formatting option, package or third packet. Keep all validate and compatibility assertions active.

## Acceptance and discriminating checks

Name new tests with prefix `P2 `; focused pattern is `P1|P2|existing help`.

| Requirement | Owning check to create | Input and exact expected result |
| --- | --- | --- |
| B1-003 | CLI summarize count/total | `a,1\nB_-2,002\n` -> `{"count":2,"total":3}\n`; repeat without final LF. |
| B1-003 | CLI empty file | Zero bytes -> `{"count":0,"total":0}\n`. |
| B1-002, B1-003 | CLI numeric values | Zero, leading zeroes and safe-integer maximum accepted per record. `a,9007199254740991\nb,1` succeeds with count 2, total 9007199254740992; no new aggregate safety rejection. |
| B1-002, B1-004 | CLI validation parity | Run the P1 invalid fixture matrix through both commands: syntax, unsafe amount, duplicates, blank rows, CRLF, extra terminal LF, malformed UTF-8 and BOM all yield identical invalid-data status/streams. |
| B1-002 | CLI no partial summary | Valid prefix then invalid last row or late duplicate -> empty stdout and fixed error; neither count nor subtotal may appear. |
| B1-001, B1-004 | Compatibility regression | Existing help/unknown commands and every P1 validate/parser test continue passing unchanged. |
| B1-004 | Shared validation wiring | Inspect dependency direction and use the isolated mutation below to demonstrate both commands depend on the same parser at runtime. |

RED should show summarize still dispatches to UNKNOWN_COMMAND while new exact success/error assertions fail; record those failures before changing CLI. After GREEN, PROVE shared wiring by temporarily making `parseRecords` reject the otherwise valid `a,1` input and verify both commands' existing success assertions fail; restore parser bytes exactly and rerun. PROVE no partial summary by temporarily emitting a subtotal before complete validation; the late-invalid empty-stdout assertion must fail, then restore. If a direct output test never reached its assertion in RED, also mutate its relevant aggregation behavior (e.g. count or total), confirm failure and restore, one mutation at a time.

Packet acceptance: exact summarize success and failure streams/status, all parity cases, evidence of shared parser reuse, unchanged P1 behavior, npm test passing, current agreement/spec and preservation checks passing. Recovery restores P2's dispatch/aggregation/tests only, retaining P1 parser and validate. Stop after P2; no commit, release or additional workflow.
