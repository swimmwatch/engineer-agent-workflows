# B1 implementation plan

Planning only; neither packet is authorized for execution by this document.

## Authoritative inputs

Frozen SIMULATION specification: `docs/specs/b1/spec.md`, Status: Approved.
MCP scope: confirmed Standard, core active, planning_artifacts empty, no root
design outputs or product linkage. Standalone planning; no additional contract
file or design stage applies. Observable behavior remains authoritative in the
four exact spec sections, not in a new schema.

- source_version: `c188354bc3b00fc9f3b0e7cb13bfffc33ec20355331d1c09b850166a689d90e1`
- specification_version: `4b77db1d93030b893e8c9f60f5f9304257569ae2d2c04b515b188e1bccab6007`
- review_ref: `10c81a91-08ae-402c-8eea-4e8ac1e8df81`

Initial specification_check_state: pass, coverage_status reviewed, no issues.
Approval checkpoint absent; the tool did not assign approval. Its mechanical
check does not independently prove semantic correctness or respondent identity.
The Approved Markdown and MCP-confirmed scope are frozen fixture inputs.
All four requirement definitions and both current decisions were read completely:
behavior `b3a22eec-4869-4b3f-93eb-0e9c3ff6f678@1` maps B1-001–004;
`scope.manifest@2` records the scope confirmation. Its nested proposal's
confirmed:false does not override the current confirmed manifest.

## Repository evidence and prerequisites

Reverify these locations before execution:

- `cli.mjs:2` reads only the command; `cli.mjs:3` owns exact help output,
  and `cli.mjs:4` reports UNKNOWN_COMMAND with exit 2.
- `test.mjs:4` checks the current help status and exact stdout.
- `test-process.mjs:6` exports runCli(args, { env }); lines 15–21 launch the
  real Node CLI using temporary stream file descriptors and return actual
  status, signal, stdout and stderr. Lines 22–25 clean up the capture files.
- `package.json:3` selects ES modules; `package.json:5` owns the installed
  single-file test command, node --test --test-isolation=none test.mjs.
- Planning observed Node v24.20.0 and a readable Git worktree with staged
  fixture files. Existing staged work belongs to the fixture; do not reset,
  restage, initialize Git, or require a clean tree. Inspect staged, unstaged
  and untracked paths before each packet.

Local Node and npm are existing runners; installation is forbidden. The user
authorizes planning only now. Each packet needs its own later explicit execution
instruction. All shell commands use rtk proxy and run from
`/tmp/eaw-tip-p03-df48iZ/runs/b1-baseline-s2-1/app`.

## Exactly two packets

| Packet | Outcome | Dependency | Requirements |
| --- | --- | --- | --- |
| [01](01_validation_and_validate.md) | Shared complete-input validator and validate CLI | Explicit execution authorization | B1-001, B1-002, B1-003 empty validate case, B1-004 |
| [02](02_summarize.md) | summarize consumes that validator | 01 complete with recorded passing evidence, plus explicit execution authorization | B1-002, B1-003, B1-004; B1-001 regression |

01 is independently verifiable without implementing summarize. 02 is independently
verifiable against the completed shared boundary; it must not duplicate validation.
Optional review and commits are not dependencies. The linked checklist in
[todo.md](todo.md) is the sole completion ledger.

## Proposed ownership and dependency direction

These are implementation-local choices, not changes to the frozen requirements.

| Unit / symbol | Purpose, inputs and outputs | Lifecycle, errors and invariants | Requirement / verification |
| --- | --- | --- | --- |
| `records.mjs:parseRecords(bytes)` (new) | Pure boundary: complete file bytes to ordered array of {id, amount}, numeric amounts | Per-call decoder, array and Set; no global state or I/O. Fatal UTF-8 decoding; preserve any BOM for grammar rejection. Validate all rows before returning; reject malformed grammar, duplicate exact IDs and unsafe amounts with one internal invalid-input error. No prefix escapes on failure. | B1-001–003; table-driven parser checks plus CLI integration |
| `cli.mjs` data-command dispatch | Read the path completely with Node built-ins, call parseRecords, then serialize and write once | One invocation owns bytes/result. No output before complete validation; data input failure exits 2, stdout empty, stderr INVALID_INPUT followed by LF. Close file resources through built-in whole-file read. Keep help and unknown-command branches compatible. | B1-001–004; real runCli checks |
| `cli.mjs` validate result branch | Validated ordered records to JSON array | No second parser, no mutation of record values; success exit 0, empty stderr | B1-001–003; valid, empty and late-invalid integration cases |
| `cli.mjs` summarize result branch (02 only) | Same validated records to JSON {count,total} | Compute only after validation; count array length, total sum of amounts, zero identities for empty input; invocation-local accumulation | B1-002–004; expected aggregates and invalid corpus parity |
| `test.mjs` tests/fixture utilities | Temporary byte fixtures to assertions through runCli | Each fixture cleaned in finally; keep real subprocess and exact status/signal/stream assertions; preserve existing help check | B1-001–004; focused and full installed runner |
| `test-process.mjs:runCli` (preserved) | Real process capture for both packets | Existing fd capture/cleanup and env support unchanged; no imports or mocks substituting for CLI assertions | B1-004; preserve bytes and use throughout |

Dependency direction is CLI → shared parser → Node built-ins. Tests depend on the
CLI through runCli, and may additionally test the pure parser. The parser never
imports the CLI. Keep summary formatting local to the summarize branch rather
than introducing a service/class layer.

JSON formatting choice: compact output followed by LF for successes; assert exact
serialization for ordinary examples. Amount acceptance is governed by decimal
syntax and safe integer value, so leading zeroes are accepted and become numeric
values. IDs remain case-sensitive strings in input order, including __proto__.
Do not trim input, normalize CRLF, coerce signs/exponents or skip blank rows.
Empty bytes mean zero records; LF terminates a row rather than creating an empty
record, and blank rows (including a lone LF) are invalid.

No extra safe-integer restriction applies to the total. Use exact internal
integer accumulation (BigInt from validated numeric amounts) and serialize total
as an unquoted JSON decimal number, retaining the required JSON object shape.
This avoids imposing a new rejection on valid rows whose aggregate exceeds the
safe-integer limit. Do not expose BigInt in the records contract.

## Coverage and execution environments

| Requirement | Owning check |
| --- | --- |
| B1-001 | 01 exact help, ordered validate JSON, valid complete file; 02 regression |
| B1-002 | 01 full syntax/UTF-8/duplicate/range corpus and no partial stdout; 02 same corpus through summarize |
| B1-003 | 01 empty validate; 02 empty and multirow count/total |
| B1-004 | Both use one parser, built-ins only, unchanged harness/test command and unrelated bytes; 01 stops before 02 |

Planned checks run on the supplied local Node v24.20.0 fixture using the installed
npm test script. No cross-platform support matrix or additional minimum Node
version is specified; do not claim checks on other platforms. Missing runners or
an unreadable Git worktree block execution rather than permitting installation.

## Risks, operation and documentation

Whole-file validation deliberately buffers the input/result to satisfy atomic
output. No approved file-size limit or streaming/performance target exists; add
none. Fatal decoding and complete lexical checks avoid replacement-character,
whitespace and numeric-coercion acceptance. Error output contains only the fixed
token, never input contents. Read failures and a missing file operand should use
the same bounded data-input error path; no new command options are introduced.

No persistent data, migration, network, background process, retries, concurrency
coordination, logging subsystem or UI exists in this scope. Those concerns and
accessibility/design are not applicable. Local rollout is one packet at a time
after its tests pass. Recovery is a fresh invocation after correcting the file.
For implementation rollback, restore only the affected packet's code/tests from
its inspected pre-execution diff; never use broad Git reset or overwrite staged
fixture work. No external or irreversible step is included or authorized.

Durable developer documentation is not warranted: this is a localized CLI and
parser with one process, no operator configuration, and no new domain vocabulary.
The frozen spec owns the non-obvious grammar; fewer than two documentation
threshold signals apply. Therefore there is no third documentation packet.

## Handoff boundary

Before and after each future packet, reopen MCP context and check the pinned
aggregate source_version. Read only that packet's exact requirement sections
through requirement_get with the pinned specification_version. Drift, pending,
stale or failed evidence blocks the affected packet and returns it to its owner;
do not revise scope here. Before final planning handoff repeat the state check.

No tests or implementation packets are executed during planning. Planned RED,
GREEN and PROVE evidence belongs to future execution. Check [handoff.md](handoff.md)
for current verification and next action.

