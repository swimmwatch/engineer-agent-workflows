# B1 implementation plan

## Shared validation contract

Binding for B1-P1 and B1-P2; requirements B1-001 through B1-004. Exact behavioral authority is `docs/specs/b1/spec.md`, sections B1-001, B1-002, B1-003 and B1-004 at the pinned specification version recorded below. No separate profile contract is authorized by the confirmed manifest.

Use dependency-free Node.js ES modules. Proposed binding module `records.mjs` exports `parseRecords(text)`, a synchronous pure function returning a fresh ordered array of `{id: string, amount: number}` or throwing on invalid input. It has no filesystem, process or output dependency. Each call owns its array and duplicate-ID Set; there is no retained mutable state. Private helper names and equivalent statement organization remain flexible.

The parser accepts empty text as zero records. Otherwise split on LF, remove at most one terminal empty split component, and require every remaining row to match the entire `id,amount` grammar. IDs use only ASCII letters, digits, underscore and hyphen and must be nonempty and unique, case sensitively. Amounts contain one or more ASCII digits; convert only after syntax validation and require a nonnegative safe integer. Leading zeroes are permitted by the digit grammar. Reject blank rows, CRLF, surrounding whitespace, extra commas, signs, decimal points, exponent notation, non-ASCII digits, duplicate IDs and unsafe amounts. Do not trim input or filter empty rows. Validate every row before returning anything.

`cli.mjs` owns argument dispatch, whole-file reading, strict UTF-8 decoding, error translation and serialization. Read complete bytes before parsing; use a fatal UTF-8 decoder and preserve a BOM as input rather than silently stripping it. Data commands call the same `parseRecords` function. Only after successful validation may the command serialize and write its complete JSON result. Invalid input yields status 2, empty stdout and `INVALID_INPUT\n` on stderr. Success yields status 0, empty stderr, null signal and one JSON value followed by LF. Keep the exact existing help output and unknown-command behavior. No streaming output, duplicated validators, classes, packages or global state are needed. File/argument errors must not leak a partial result; they are not a reason to broaden the frozen acceptance contract.

The implementation uses ordinary JavaScript numeric amounts and totals; the spec imposes safe-integer validation on each amount, not an additional aggregate input restriction. Do not reject an otherwise valid file because its total exceeds the safe-integer bound. Any requested new precision or aggregate overflow policy returns to specification rather than being invented during execution.

## Planning inputs


- source_version: `8c6a92f71b56f89de94d3f81a0dad3b0d95b26b1273a65367d8a74d143b77087`
- specification_version: `4b77db1d93030b893e8c9f60f5f9304257569ae2d2c04b515b188e1bccab6007`
- review_ref: `6ae906f6-ab94-4118-8103-0f790d6db1a7`
- Frozen SIMULATION inputs; Approved Markdown and MCP status pass, coverage reviewed. The tool does not authenticate consent or prove semantic correctness.

Confirmed manifest: Standard; core active; planning_artifacts empty; no project artifacts or product linkage. Standalone planning: no product task tools, profile output files or design stage apply. Exact requirements were read via requirement_list/get with all continuations complete; both current behavioral/scope decisions were read via scenario MCP. Verification of the supplied matching manual passed.

## Repository evidence

Reverify these locations before executing either packet:

| Evidence | Implication |
| --- | --- |
| `cli.mjs:2` | Current CLI extracts command only; proposed file argument and parser do not exist yet. |
| `cli.mjs:3` | Exact help is `record-report: validate <file> | summarize <file>\n`. |
| `cli.mjs:4` | Unknown commands emit `UNKNOWN_COMMAND\n` to stderr and exit 2. |
| `test.mjs:1` through `test.mjs:4` | Node test/assert imports and one real-child help regression exist. |
| `test-process.mjs:6`, `test-process.mjs:15`, `test-process.mjs:20`, `test-process.mjs:22` | runCli captures real child status/signal/streams through temporary file descriptors and cleans them up. Preserve it. |
| `package.json:5` | Existing npm test is `node --test --test-isolation=none test.mjs`; preserve it. |
| `AGENTS.md` supplied in active context | Fixture-only authority; rtk shell prefix; no installation, commits or external actions. |

Readable Git status exists with preexisting staged fixture files; do not require a clean tree, unstage them, reset them or initialize Git. Inspect staged, unstaged and untracked changes before and after a packet. Exclude MCP-owned workflow YAML and review-input archives from content reads and diffs. Preserve unrelated content and unknown independent changes; stop overlapping edits for disposition.

## Delivery and coverage

Exactly two implementation packets, each separately invoked and verified:

| Packet | Outcome | Requirement ownership | Dependency |
| --- | --- | --- | --- |
| [B1-P1](01_validate.md) | Shared parser and validate | B1-001; B1-002 parser/validate; B1-003 empty validate; B1-004 dependency-free first stage/preservation | Explicit authorization for B1-P1 |
| [B1-P2](02_summarize.md) | Summarize using the same validation | B1-003 summarize; B1-002 parity; B1-004 reuse/order; B1-001 regression | Completed B1-P1 evidence and explicit authorization for B1-P2 |

Both technical agreements currently pass planning_packet_check as ready, with no issues. This is planning readiness: neither packet is authorized or executed; P2 also awaits P1 completion. Each packet contains its exact agreement and version bindings. The sole completion checklist is [todo.md](todo.md); [handoff.md](handoff.md) holds current state.

## Verification, risks and operation

Runtime scope is dependency-free Node.js in this fixture. No OS/version support matrix is declared by the frozen spec; do not invent one. Plan local verification in the supplied environment using installed Node/npm and rtk. No installation is authorized. The npm runner was inspected, not run during planning; unavailable execution later keeps the packet incomplete.

Whole-file validation requires O(input bytes + records) memory and expected O(records) work using a Set; no performance target or streaming requirement is declared. The main risks are accidental trimming/blank-row acceptance, permissive numeric conversion, duplicate detection, UTF-8 replacement decoding, and writes before a late error. Tests cover those boundaries and both consumer paths. Amount safety is checked per record. The frozen spec has no separate exact-precision policy for very large aggregate totals; requests to change that policy must return to specification.

No persistent state, migrations, background jobs, remote services, UI, secrets, access-control changes, telemetry or distributed rollback are involved. Local files are untrusted input; strict parsing and fixed invalid-input diagnostics avoid echoing record contents. File resources are read completely and not kept open; test fixtures clean up even on assertion failure. No extra operational or security profile artifacts are authorized.

Rollout is local and staged: verify P1, stop, then await a separate P2 invocation. Recovery removes only the incomplete packet's known edits after preserving independent changes, restores any temporary mutation, and reruns existing checks. P2 rollback preserves P1's parser and validate behavior. Never use wholesale reset/checkout against the preexisting staged fixture. External/irreversible actions are outside this plan; no manual release gate is needed.

Durable developer documentation is not warranted: this is one CLI boundary plus a pure parser, with no operator configuration, new domain vocabulary or cross-team contract. Fewer than two documentation thresholds apply. The authoritative spec and this plan explain the localized rules, so no third documentation packet is created.

## Handoff gate

Before and after each later packet, reopen MCP context and run specification_check_state with the pinned expected_source_version and planning_packet_check with that packet's exact agreement_ref/digest. Require pass/reviewed/Approved plus ready; drift returns affected work to its owner without silent rebinding. Read only the packet-linked requirement definitions and shared proposal, then verify scoped code evidence. Run RED, GREEN, required PROVE and final verification, inspect the scoped diff, update todo/handoff, and stop at the packet boundary. Planning approval and simulated technical agreement confer no implementation authorization.
