# B1 implementation plan

Planning only. Exactly two packets; neither is authorized for execution by this plan.

## Approved inputs

- source_version: `d3703b86a5e02b21b0d6cfc0b4e6dc0dd232ca99973730a5c37f6ff54ba7faad`
- specification_version: `4b77db1d93030b893e8c9f60f5f9304257569ae2d2c04b515b188e1bccab6007`
- review_ref: `cea9bcb8-8e31-4b70-aedb-6755e425d546`

MCP specification_check_state returned pass, approved, reviewed, no issues. Approval checkpoint absent; the tool neither granted approval nor authenticated respondent independence. Approved spec and scope are frozen SIMULATION inputs, authoritative only in this fixture. All four exact requirement definitions and both current decisions were read completely, with no continuations outstanding.

Confirmed manifest: Standard, core active, planning_artifacts empty, no project artifacts or product linkage. Standalone path; no profile contract, product task, or design stage is required. Behavior authority remains [spec.md](../spec.md), B1-001 through B1-004. Decision inputs: b3a22eec-4869-4b3f-93eb-0e9c3ff6f678 revision 1; scope.manifest revision 2. No scope changes.

## Repository evidence

Reverify before execution:

- cli.mjs:2-4 dispatches only help; exact help is on line 3, other commands write UNKNOWN_COMMAND plus LF and exit 2 on line 4.
- test.mjs:1-4 uses node:test, strict assertions, and real runCli; existing help assertion must survive.
- test-process.mjs:6-27 owns actual child execution, descriptor capture, status/signal return, timeout, descriptor closure and directory cleanup.
- package.json:2-5 defines ESM and the exact test driver: node --test --test-isolation=none test.mjs.
- Git status is readable and shows existing staged fixture additions. Preserve these; no clean-tree or existing-commit requirement. Do not initialize Git, stage, or commit.
- unrelated.txt SHA-256: 66d58c226b7ae1af545c81f3d91e17b0d75f0e91fd9e77b3d4416cd9822ded19. Preserve bytes and meaningful attributes.

## Architecture and ownership

| Unit / proposed symbol | Purpose and I/O | Lifecycle, errors and invariant | Dependencies / verification / requirements |
| --- | --- | --- | --- |
| records.mjs: parseRecords(bytes) | Pure byte-buffer to ordered array of {id:string,amount:number}; fatal UTF-8 decode and complete row validation | Local decoder, array and ID Set per invocation; throws on any invalid input; no streams or output; returns only after all rows pass | Node built-ins only; no CLI dependency. Grammar and boundary tests plus CLI integration. B1-001,002,003,004 |
| records.mjs: readRecords(file) | Read complete file bytes, delegate to parseRecords, return validated array | Synchronous bounded invocation, no retained handles/state; propagates read/decode/validation failure | node:fs toward parseRecords. CLI failure tests. B1-001,002,004 |
| cli.mjs: existing top-level dispatch, validate branch | argv to complete JSON array on stdout | Exactly one success write after readRecords succeeds; catch data-command failures, empty stdout, INVALID_INPUT plus LF on stderr, exit 2; preserve help and unknown-command behavior | Depends on records.mjs; no validator duplication. Real runCli assertions. B1-001,002,004 |
| cli.mjs: summarize branch | Validated array to JSON {count,total} | No output until validation and aggregation finish; exact integer sum using BigInt locally, emitted as an unquoted decimal JSON number token; no extra safe-total restriction on valid rows | Same readRecords entry point as validate. Real CLI, parity and reuse checks. B1-002,003,004 |
| test.mjs: node:test cases | Temporary byte fixtures and argv to exact subprocess assertions | Create files under .tmp, remove own fixtures in finally; use existing runCli(args,{env}) when env is needed; preserve helper and all exact assertions | Built-in test/fs/path/assert only. B1-001..004 |

Implementation choices: preserve input order, preserve IDs verbatim, accept leading-zero amounts, reject BOM as outside the row grammar (do not silently strip it), and serialize compact JSON with one terminating LF. Fatal UTF-8 decoding must reject invalid bytes. Treat missing/unreadable file as data-input failure through the same CLI error boundary; retain unknown command compatibility. The spec limits individual amounts, not aggregate total: use exact integer summation and decimal JSON serialization to avoid adding an overflow rejection or rounding. Test large totals as text tokens, since JSON.parse into Number can itself lose precision.

## Delivery and coverage

1. [P01 shared validation and validate](01_shared-validation-and-validate.md): B1-001, B1-002, empty validate from B1-003, constraints/order B1-004.
2. [P02 summarize](02_summarize.md): depends on P01's passing evidence; B1-002, B1-003, shared-contract/order constraints B1-004, B1-001 regression.

P01 is independently verifiable without summarize; P02 independently verifies summary behavior against completed P01. Both require explicit invocation, specification version checks before and after, test-first RED/GREEN/PROVE as applicable, final scoped diff, checklist/handoff update, and stopping after their own boundary.

## Risks and verification

Strict grammar risks: CRLF, blank rows, repeated final LF, whitespace, signed/fractional/exponent amounts, unsafe integers, duplicates, malformed UTF-8, and valid prefix followed by invalid suffix. Cover each through the actual CLI. Preserve empty stdout on all errors; prove its checks by temporarily introducing an early write, observe failure, restore. Shared reuse is a structural guarantee: inspect both branches and temporarily bypass shared validation in summarize to prove a failing parity case.

No supported OS/runtime matrix is declared beyond dependency-free Node.js in this isolated fixture. Planned verification uses the installed Node and existing npm test command here; record its version and actual environment at execution, with no cross-platform pass claim. No dependency installation or runner alteration is authorized. Missing runner/Git/version prerequisites leave a packet incomplete.

No persistence or schema migration; rollout is local CLI code replacement after checks. Recover by fixing scoped implementation or reverting only packet-owned edits while preserving existing staged/untracked work. No global reset or removal of unrelated changes. Full delivery rollback must unwind P02 before removing P01's shared module. No external effects, remote gates, deployment, publication, or commits are scheduled.

Security/privacy: untrusted file content is validated at the shared boundary; fixed error text avoids disclosing rows/paths. Whole-file buffering is intentional for this bounded fixture; no new size limit. UI/accessibility, concurrency, configuration, cancellation protocol, telemetry and distributed operations are not applicable to this synchronous local CLI change.

Durable developer documentation is not warranted: this is a localized two-command CLI with no three-layer flow, configuration, or new vocabulary, and the simple grammar is authoritative in the spec. The threshold of two documentation signals is not met; no third packet.

## Planning verification

Manual bundle verification covers all four requirements, exactly two numbered packets, dependency order, test-first steps, preservation, and allowed writes. No production changes or implementation checks are executed during planning. Final pinned MCP check result is recorded in handoff.md.

