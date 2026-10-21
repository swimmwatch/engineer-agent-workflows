# B1 implementation plan

Planning only. Exactly two packets; neither is authorized for execution.

## Shared technical contract

Binding proposed module `records.mjs` exports `parseRecords(text)`, a pure synchronous function from a fully decoded string to an ordered array of `{id: string, amount: number}`. Each call owns its array and duplicate-ID Set, retains no cross-call state, performs no I/O, and throws on any invalid row. Both commands must consume this one validator; no command-specific duplicate validation. Empty text returns an empty array. Remove at most one terminal LF, split on LF, then validate every complete row with ASCII-only ID and digit syntax and a nonnegative safe-integer amount check. Do not trim input or accept CRLF, blank rows, signs, fractions, exponents, Unicode digits or extra columns. Leading zero amounts are valid decimal digits. A lone LF contains an invalid empty row. No records escape until all rows pass.

`cli.mjs` owns dispatch, whole-file reading, fatal UTF-8 decoding that retains any BOM as input rather than silently discarding it, and stdout/stderr/exit handling. Read bytes once, decode completely, call `parseRecords`, and only then serialize and write one complete result. Expected validation errors become exit 2, empty stdout and `INVALID_INPUT\n` on stderr. Keep error handling bounded without echoing input. File/argument I/O behavior beyond the approved record contract is not a new public promise. Keep existing help bytes and unknown-command behavior. Dependency direction: CLI -> records; records has no CLI dependency. Resources are invocation-local; use whole-file synchronous reads with automatic descriptor closure. No concurrency, service, schema, migration or external integration is introduced. Minor private helper names and statement organization remain flexible.

Requirements: B1-001 through B1-004; authoritative behavior is `docs/specs/b1/spec.md` under the exact corresponding requirement headings. No manifest-listed profile artifact exists; this inline planning contract is implementation-local.

## Delivery plan

Scope: confirmed Standard, active core only, no planning profile artifacts or root design outputs. Standalone specification with no product task binding supplied; no product task tools or design stage apply.

Pinned inputs: source_version `82c6780d2fede08dec901ecc268c62312dfcdad1aee22a70639b10d836096df7`; specification_version `c1bdb1c7c8031493f0b3874497844574d7df65fda7f4306307163b5f7b6f2877`; review_ref `da3da754-4dab-46e9-9375-0c9789800ca7`. Read all five exact requirements through MCP; completeness check passed with reviewed coverage and Approved Markdown. Final check found the same versions. Verification of the matching engineering manual succeeded.

| Order / packet | Outcome | Dependency | Owning units / checks |
| --- | --- | --- | --- |
| 1 / [b1-01](01_validate.md) | Shared validation and validate | Explicit future invocation | parseRecords, CLI validate; valid/empty/order/safe-limit and invalid-input subprocess corpus |
| 2 / [b1-02](02_summarize.md) | Summarize using the same validator | b1-01 complete and explicit future invocation | summarizeRecords, CLI exact formatter; ordinary/empty/large totals and paired validation corpus |

| Requirement | Coverage |
| --- | --- |
| B1-001 | b1-01 validate and exact help regression; b1-02 preserves both |
| B1-002 | b1-01 owns parser and atomic output; b1-02 checks same rejection corpus |
| B1-003 | b1-01 empty validate; b1-02 summarize and empty summary |
| B1-004 | Both packets: dependency-free Node, shared contract, preservation, two explicit boundaries |
| B1-005 | b1-02 BigInt accumulation and raw JSON numeric token tests above safe range |

Existing evidence: `cli.mjs:2-4` has only help/unknown command handling; `test.mjs:4` has the existing help subprocess assertion; `test-process.mjs:6-27` owns real child capture and cleanup; `package.json:5` owns the installed test command. Reverify before implementation. The Git worktree is usable with initial files staged; no clean-tree or commit requirement applies.

Both managed technical checks returned `ready` with no issues after the actual simulated native acceptance. Each packet stores its exact agreement and digest. This is planning readiness only: no execution authorization follows from the answer, and b1-02 remains dependent on b1-01 completion.

Risks addressed: invalid late rows leaking output, permissive decoding/whitespace normalization, duplicate state persisting across calls, unsafe individual amounts, and rounding aggregate totals. Whole-file input is chosen because no streaming or size target exists; no performance claim is made. Input data stays local; no logs or external telemetry are introduced. UI/accessibility, service availability, deployment, migration and distributed recovery are not applicable to this local CLI change. Tests target the installed fixture runtime only; no unprovided support matrix is inferred.

Durable developer documentation: no separate document or third packet is warranted. Exact aggregation is the single non-obvious rule, already owned by B1-005 and explained in the technical proposal; no second documentation threshold signal applies. No new domain vocabulary, operator configuration or multi-process product behavior is introduced.

Rollout and recovery remain within each authorized local packet: test first, correct implementation until checks pass, preserve initial staged/unrelated work, update checklist/handoff, stop. No external or irreversible step is planned. Any later request to commit/publish/install would require separate explicit authorization.

