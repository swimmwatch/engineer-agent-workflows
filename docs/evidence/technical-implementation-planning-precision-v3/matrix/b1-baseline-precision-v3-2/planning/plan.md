# B1 implementation plan

Planning only. Exactly two packets; neither is executed or authorized for implementation by this document.

## Frozen inputs

Approved behavior: `docs/specs/b1/spec.md`, B1-001 through B1-005. Exact definitions and both current decisions were read completely through scenario MCP.
- source_version: `3a21e2290064684bc7449d083da91ba0ead4277a5e8c7c3628860b46990f0aa2`
- specification_version: `c1bdb1c7c8031493f0b3874497844574d7df65fda7f4306307163b5f7b6f2877`
- review_ref: `7566b8e5-0284-458a-b64c-3d4ceca0f273`

MCP check: pass, document approved, coverage reviewed, no issues. Approval checkpoint absent; no checkpoint written. The MCP does not establish semantic correctness, respondent authenticity or reviewer independence. This fixture's Approved spec and confirmed scope are frozen SIMULATION inputs, with no authority outside the fixture.

Scope: Standard; only core active (dependency-free Node.js command/function contracts). Manifest confirmed; no pending question, no planning profile artifacts, no project artifacts or product linkage. Keep architecture inline; create no separate contract, design output or product task. Behavior decision `facb12e6-52a7-4ec3-b732-66896b09fb20@1` links all five requirements; `scope.manifest@2` records fixture confirmation. Spec owns behavior; the manifest owns profile scope.

## Evidence and execution prerequisites

- `cli.mjs:2` reads the command; `cli.mjs:3` owns exact help output; `cli.mjs:4` returns UNKNOWN_COMMAND plus LF and exit 2 otherwise.
- `test.mjs:3` imports the real subprocess helper; `test.mjs:4` asserts existing help status and bytes. Preserve these assertions.
- `test-process.mjs:6` exports runCli(args, { env }); lines 15–21 run the actual CLI and capture status, signal and streams using file descriptors; lines 22–25 clean up. Preserve this helper.
- `package.json:3` selects ESM; `package.json:5` runs `node --test --test-isolation=none test.mjs`. Preserve this exact test command.
- Git status was readable and shows staged fixture files, including unrelated.txt. This is usable without a clean tree or an existing commit. Preserve staged/untracked work; never reset or initialize Git.

Re-verify evidence, pinned MCP state, readable Git status including staged and untracked paths, and installed runner before each separately authorized packet. No installation is allowed. All shell commands use rtk; use `rtk proxy` when exact output is needed. Work directory: application root. Baseline preservation SHA-256 for unrelated.txt: `66d58c226b7ae1af545c81f3d91e17b0d75f0e91fd9e77b3d4416cd9822ded19`.

## Boundaries and dependency direction

| Unit / symbol | Purpose, input and output | Lifecycle, errors and invariant | Requirements / verification |
| --- | --- | --- | --- |
| Proposed `records.mjs:parseRecords(bytes)` | Pure shared boundary: file bytes to ordered array of {id:string, amount:number} | Per-call records and ID Set; fatal UTF-8 decoding, complete grammar/uniqueness/safe-integer validation before returning. Throws an input error; no I/O or partial return. Both commands use this one boundary. | B1-001/002/003/004; CLI input corpus and source inspection |
| Existing `cli.mjs` dispatch | argv to help/unknown behavior or one file read and shared parsing, then stdout/stderr/exit status | Process-local; read entire file, close via built-in whole-file read, validate before output. Data errors emit INVALID_INPUT plus LF, empty stdout, status 2. Help stays byte-identical. No persistent state. | B1-001/002/004; real subprocess status, signal and stream assertions |
| Proposed `cli.mjs:formatSummary(records)` | Validated records to JSON text with count and exact numeric total | Pure synchronous function, BigInt sum of individually safe numeric amounts; serialize decimal BigInt digits as an unquoted numeric token, never convert aggregate to Number or JSON.stringify a BigInt. No validation duplication. | B1-003/005; ordinary/empty/large raw-token assertions |
| Existing `test.mjs` | Fixture bytes and CLI arguments to durable assertions | Per-test temporary files in app .tmp, cleanup in finally; invokes existing runCli. No mocks or import substitution for CLI assertions. | All requirements; RED/GREEN/PROVE below |
| Existing `test-process.mjs:runCli` and npm runner | Actual child invocation to captured evidence | Infrastructure is unchanged; preserve FD capture, timeout, cleanup, options.env and exact assertions. | B1-004 plus host instructions; regression and scoped diff |

Dependency direction: CLI -> Node file reading -> shared parser; after parsing CLI -> validate serialization or summary formatting. Parser and formatter depend on no CLI or test machinery. Tests -> runCli -> real CLI. No classes, third-party packages, configuration keys, service boundaries or schema generators.

Implementation choices (not new approved behavior): use Number only for each already validated safe amount; use BigInt only for the total. Success JSON uses compact serialization plus LF, exit 0 and empty stderr. Data-path read/decode errors use the same bounded INVALID_INPUT diagnostic. Decode without silently removing BOM or replacing invalid bytes; do not trim rows or accept CRLF. These are local choices under the grammar, not expanded product scope. Unspecified invocation shapes do not justify new command options.

## Delivery and verification map

| Packet | Owns | Required evidence |
| --- | --- | --- |
| [01 shared validation and validate](01_shared-validation-and-validate.md) | B1-001, B1-002 and validate-empty part of B1-003; B1-004 constraints | Valid/empty/max-safe arrays; rejection corpus; late invalid row with no stdout; help and unknown compatibility |
| [02 summarize](02_summarize.md) | B1-003, B1-005; B1-002 shared validation; B1-004 constraints | Packet 01 green; summary corpus through same parser; exact 9007199254740993 numeric token; validate/help regression |

Packet 02 depends on completed, passing packet 01 evidence, not a review or commit. Each packet creates and runs discriminating checks before behavior changes, observes relevant RED, implements until correct checks pass and applies required PROVE. No test run or implementation is part of planning. Planned checks execute in installed fixture Node on the current host. No OS or Node-version support matrix is promised by the frozen inputs; other environments remain unverified.

## Risk, rollout and recovery

Main risks: partial stdout before late failure, grammar coercion, divergent validation, and rounded aggregate output. Countermeasures: full-buffer parsing, strict lexical checks before conversion, a shared parser, and raw integer-token assertions above the safe boundary.

Rollout is local CLI behavior in two bounded steps, no deployment or migration. After packet 01, validate works and summarize remains the existing unknown command until separately authorized packet 02. Roll back only the failing packet's owned changes, preserving staged fixture content and the preceding packet. Failed/unavailable checks leave the packet incomplete. Do not use Git reset/clean or revert others' changes.

File content is untrusted; never echo it or a path in diagnostics. No persistent writes except test scratch; no external services, telemetry or credentials. Remote operation, cancellation orchestration, accessibility/UI design, migration and distributed recovery are not applicable to this synchronous local CLI. No external or irreversible step is planned. MANUAL GATE: each packet needs its own explicit implementation invocation; no commit, installation, publication or external action is authorized.

Durable developer documentation is not warranted: this is a small local CLI with one subtle numeric rule already owned by B1-005 and these packets. It does not meet two documentation signals; create no documentation packet. Exactly two behavior packets remain the full delivery.

## Handoff check

All five requirements have owners and discriminating checks. No profile contract is authorized beyond this bundle. Before final handoff, repeat MCP specification_check_state with the pinned source_version; record the actual result in handoff.md. Stop after planning.

