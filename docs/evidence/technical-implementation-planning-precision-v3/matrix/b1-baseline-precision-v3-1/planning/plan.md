# B1 implementation plan

Planning only; no packet is executed or authorized by this document. Exactly two behavior packets, in order:

1. [01_shared-validation-and-validate.md](01_shared-validation-and-validate.md): shared complete-input validation and validate.
2. [02_summarize.md](02_summarize.md): summarize consuming that same validator, with exact integer totals.

## Authoritative inputs

`docs/specs/b1/spec.md` is Approved frozen SIMULATION input. MCP scope is confirmed, Standard, core active, `planning_artifacts: []`; no product linkage or design outputs are declared. No additional profile contract is created. Behavior remains authoritative in B1-001 through B1-005, not in a new schema.

Pinned completeness inputs (also pinned in each packet):

- source_version: `c493210d8ae97bc8778c8e27ec1bc68d1bc90d7d25fc46fd4e168560ae825dd8`
- specification_version: `c1bdb1c7c8031493f0b3874497844574d7df65fda7f4306307163b5f7b6f2877`
- review_ref: `259869dd-8417-4bcb-aff9-ac78d891a5b8`
- Exact linked source decision: `facb12e6-52a7-4ec3-b732-66896b09fb20`, revision 1, read completely.

MCP initial check: pass, approved, reviewed, no issues; approval checkpoint absent, no checkpoint written. This is mechanical freshness evidence, not independent authentication of the simulated approval or semantic proof. All five exact requirement definitions were read completely with no continuations.

## Repository evidence and chosen boundaries

Reverify these facts before implementation. `cli.mjs:2` reads only the command; `cli.mjs:3` owns exact help output; `cli.mjs:4` owns unknown-command stderr and exit 2. `test.mjs:3` imports the existing real subprocess helper; `test.mjs:4` asserts help status and exact text. `test-process.mjs:6` exports runCli; lines 15–21 launch Node with file-backed streams and return actual status/signal; lines 22–25 clean up. `package.json:2` is dependency-free/private and `package.json:5` owns the single-file test command. Git status is readable; the initial fixture is staged as added files, so a clean tree or an existing commit is not a prerequisite. Preserve that staged state.

| Unit / proposed symbol | Responsibility, inputs and outputs | Lifecycle, errors and invariants | Dependencies / requirements / verification |
| --- | --- | --- | --- |
| `records.mjs:parseRecords(bytes)` (new) | Buffer/Uint8Array to ordered array of `{id: string, amount: number}` | Fatal UTF-8 decoding; preserve BOM as input so grammar rejects it; split only on LF, remove at most one terminal LF, special-case zero-byte input. Validate every row, exact ASCII id and digit grammar, uniqueness and safe integer bounds. Leading zero digits accepted. No trim, normalization, partial return or output. Local Set/array per call, throw on any invalid input. | Node built-ins only; no CLI dependency. B1-001/002/003/004. CLI corpus plus focused parser tests if useful. |
| `cli.mjs` data-command dispatch | Read full file bytes, call parseRecords once, select command and write completed result | One invocation, synchronous read closes its descriptor through Node's readFileSync. Serialize fully before a single stdout write. Data failures yield status 2, empty stdout, `INVALID_INPUT\n` stderr, no stack/path dump. File read/missing-path failures use the same bounded diagnostic as an implementation-local choice. Preserve help and unknown-command behavior. | CLI -> Node fs and records. B1-001/002/003/004. Real runCli assertions. |
| `cli.mjs` validate branch | Validated records -> JSON array with numeric amounts, input order retained | JSON.stringify safe individual amounts, then LF. Empty input -> `[]\n`. No aggregate logic in packet 01. | Uses shared parser; B1-001/002/003. Exact output/status/stream checks. |
| `summary.mjs:summarizeRecords(records)` (new in packet 02) | Validated records -> `{count: number, total: bigint}` | Pure, per-call total initialized to 0n; add BigInt(record.amount), never sum through Number. No revalidation, I/O, global state or retry. | Summary consumes parser output contract; B1-003/005. Empty, normal and large-total CLI checks. |
| `summary.mjs:serializeSummary(summary)` | Count and bigint total -> JSON object text | Emit decimal total as an unquoted JSON integer token; never Number(total), JSON.stringify(bigint), or quote total. Count comes from array length; no user strings interpolated. CLI appends LF once. | B1-003/005. Exact lexical output comparison. |
| `test.mjs` | Own data fixtures, corpus and child-process assertions | Tests create fixtures under application `.tmp`, clean in finally; preserve helper and existing assertions. Assert actual status, signal, stdout, stderr. | Uses unchanged test-process.mjs; B1-001–005. Existing npm test script. |

These are implementation choices, not changes to approved scope. All successful data output is buffered until validation finishes. No persistent state, concurrent workers, streaming output, new classes, dependencies, global settings, or external boundary is needed.

## Coverage and packet dependency

| Requirement | Owning packet/unit | Discriminating evidence planned |
| --- | --- | --- |
| B1-001 | 01: CLI + parser | Exact help regression, numeric record array on valid file |
| B1-002 | 01: parser/CLI; 02: shared-command wiring | Invalid grammar/duplicate/unsafe/invalid UTF-8 corpus, valid-prefix-invalid-suffix cases, exact empty stdout + diagnostic + status 2 for both commands |
| B1-003 | 01: validate empty; 02: summary | Empty outputs, count/total, same input acceptance across both commands |
| B1-004 | Both | Exactly two packets; built-ins only; existing streams/test command/helper and unrelated bytes preserved |
| B1-005 | 02: summary serialization | Exact raw output for 9007199254740991 + 2 -> numeric token 9007199254740993; reject individually unsafe amounts |

Packet 02 depends on packet 01's passing corpus and recorded evidence; independent verification means each packet has its own acceptance and command, not that packet 02 may bypass this dependency. Optional review and commits are not gates. Both remain unexecuted pending separate explicit authorization.

## Verification, recovery and applicability

Each packet writes and runs checks first, records relevant RED, implements, then runs GREEN and required PROVE. Never weaken a correct check. Commands run at the application root and start with `rtk proxy`. Existing final command is `rtk proxy npm test`; no installation is allowed. This plan does not run tests or create test fixtures.

Runtime coverage is the installed dependency-free Node.js in this isolated fixture; no multi-OS/version support matrix is asserted by the frozen spec. Execution must record actual Node version and environment. No build/generation step, deployment, migration, UI/accessibility, network security, operator configuration, or observability system applies. The material privacy/error boundary is bounded diagnostics without file content or paths. No arbitrary input size cap is added.

Rollout is local file changes only. On failed checks leave the packet incomplete, preserve evidence, and correct implementation. To recover, restore only that packet's edits after inspecting scoped staged/unstaged/untracked changes; never reset the fixture wholesale. Packet 02 recovery retains validated packet 01. No external or irreversible step is included; committing, installing, publishing and external services remain unauthorized.

Durable developer documentation: not warranted. Only the non-obvious exact-total rule applies among the documentation signals; this is a local CLI with no operator configuration or new domain vocabulary and no three-layer/process flow. Keep its rationale near the arithmetic implementation/tests in packet 02. No third documentation packet is created.

Preservation baseline: `unrelated.txt` SHA-256 `66d58c226b7ae1af545c81f3d91e17b0d75f0e91fd9e77b3d4416cd9822ded19`. The helper and package script are immutable infrastructure. Before every packet and completion, use MCP specification_check_state with the pinned aggregate source_version. Changed/incomplete scope returns to the separate specification/planning owner; never repair frozen inputs here.
