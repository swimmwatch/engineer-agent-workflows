# B1 implementation plan

Planning only. Frozen SIMULATION inputs; no implementation authority.

## Shared validation contract

Binding proposed symbol: exported `parseRecords(bytes)` in proposed `records.mjs`; input is the complete file Buffer/Uint8Array; output is an ordered array of `{id: string, amount: number}` with unique ids and nonnegative safe-integer amounts. B1-001, B1-002, B1-003, B1-004. Both CLI data commands must call this one function before any stdout write. The module has no CLI, filesystem or stream dependency; CLI depends on it. No persistent state: duplicate tracking and records live only for one call. Do not mutate caller input.

Decode all bytes with fatal UTF-8 decoding, preserving any BOM as content so it fails the row grammar. Empty bytes yield an empty array. Split only on LF, remove at most one terminal LF, and reject empty rows, CR, whitespace, extra/missing commas, invalid ids, duplicate ids and amounts outside ASCII digits or safe-integer range. Leading zeros are permitted by the approved digit grammar. Validate the full lexical amount before Number conversion; reject non-safe values. Throw on invalid input; return no partial records. Private error type/helpers remain flexible. IDs use exact case-sensitive equality. A single LF contains an empty row and fails.

CLI owns file reading and terminal errors: read the complete file before parsing, map input acquisition/decode/validation failures to status 2, empty stdout and `INVALID_INPUT\n` on stderr. Successful data commands use status 0 and empty stderr. Preserve exact help stdout `record-report: validate <file> | summarize <file>\n` and existing unknown-command behavior. JSON output is buffered until fully validated; use one trailing LF. Node built-ins only. No dependency installation or global changes.

Authoritative behavior references: `docs/specs/b1/spec.md`, exact sections `B1-001: Required behavior` through `B1-005: Required behavior`; no separate profile contract is authorized by the empty planning_artifacts list. Shared unit signatures here bind both proposals. B1-005 exact accumulation belongs to packet 02, without changing the safe-integer per-row contract.

## Delivery plan

Confirmed depth: Standard. Only core is active; planning_artifacts is empty, project_artifacts absent. Standalone specification, no product link or design outputs. No extra profile references or contract files. Verified selected skill bundle successfully before workflow access.

Approved, MCP-reviewed frozen inputs:

```text
source_version: da99f1c8f59662d354c8b3dacb99195154570a1cec88906e26ce23c178e88496
specification_version: c1bdb1c7c8031493f0b3874497844574d7df65fda7f4306307163b5f7b6f2877
review_ref: 49ae2b90-6cb1-4f0d-87fd-31003edd8fe5
```

Exactly two implementation packets:

| Order | Packet | Dependency | Owning units and verification |
| --- | --- | --- | --- |
| 1 | [b1-01-validate](01_validate.md) | Explicit packet execution authorization and fresh MCP gates | New records.mjs parseRecords and cli.mjs validate; exact real subprocess tests for B1-001, B1-002, empty validate B1-003, B1-004 |
| 2 | [b1-02-summarize](02_summarize.md) | Completed and verified packet 01, separate execution authorization and fresh MCP gates | cli.mjs summarizeRecords and summarize routing using parseRecords; exact total-token and shared-validation parity tests for B1-002 through B1-005, plus B1-001 compatibility |

Existing evidence: cli.mjs:2-4 is the complete help/unknown dispatcher; test.mjs:3-4 uses runCli for the exact help baseline; test-process.mjs:6-25 captures real child streams via file descriptors and cleans up; package.json:4-5 provides npm test using the single-file no-isolation driver. There are no existing data commands or parser modules. Reverify these claims before implementation. Staged fixture files already exist; preserve staging and unrelated content, including unrelated.txt exactly. Do not initialize Git or reset the worktree.

Every approved requirement has an owner and discriminating check in the table and packet maps. Per-row safe Number amounts do not imply safe aggregate Number totals; BigInt accumulation and raw numeric-token comparison address the precision risk. Late-invalid input and invalid UTF-8 tests address all-or-nothing output. Neither packet streams partial results. No classes, services, caches, package dependencies, data migrations or separate architecture artifacts are justified.

Platform verification: dependency-free installed Node in the current isolated fixture, using real subprocesses through the existing helper. All B1 IDs are covered by local npm test plans; no OS/version support matrix is specified, and no other environment has been verified. Planned tests are not passing implementation evidence.

Execution stages within each packet are RED, GREEN, required PROVE, restored full-suite verification, scoped diff review and MCP freshness rechecks, then checklist/current handoff update and stop. Exact commands and assertions are in each packet. If a correct check fails, correct implementation without weakening it. Packet 02 is technically agreed but not execution-eligible until packet 01 finishes. Optional review is separately invoked and is not a dependency.

Rollout is local CLI invocation after authorized changes; there is no deployment. Recovery removes only the affected packet's own changes after checking overlap. Packet 02 recovery preserves completed packet 01. Security/privacy are bounded by local file input, strict decoding, no input echo in diagnostics and no network/credential use. UI, accessibility, events, distributed operations and remote observability are not applicable to this fixture's CLI scope. MANUAL GATE: any implementation requires a separate explicit packet invocation; no commit, installation, publication or external action is authorized.

Durable developer documentation: no separate packet warranted. This is one local process with two thin commands and a shared function; exact arithmetic is the one non-obvious rule, captured in binding proposal and regression tests. Fewer than two documentation threshold signals apply. This preserves the required exactly-two-packet delivery.

Planning verification: exact requirements B1-001 through B1-005 read completely through MCP with no continuations; both technical agreements ready with no issues; pinned specification freshness check pass/reviewed. No behavior tests or implementation packets were executed in planning. Final planning checks are recorded in handoff.md.

