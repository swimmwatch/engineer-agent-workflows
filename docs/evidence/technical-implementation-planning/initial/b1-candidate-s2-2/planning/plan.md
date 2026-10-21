# B1 implementation plan

## Shared technical contract

Requirements B1-001 through B1-004 remain authoritative at spec.md:7-22, with exact definitions obtainable through requirement_get. Only two packets are proposed: B1-P1 shared validation plus validate, then B1-P2 summarize using that same validation. Use dependency-free Node ESM. No classes, dependencies, streaming output, configuration, or parallel parsing are warranted.

Binding proposed unit: records.mjs exports parseRecords(text: string): Array<{id: string, amount: number}>. It is pure, synchronous and returns records in input order only after complete validation, or throws on an invalid record. It owns LF row grammar, ASCII ID/digit checks, per-call uniqueness with a Set, and Number.isSafeInteger after decimal conversion. No trimming, CRLF normalization, permissive numeric parsing, or filtering empty interior rows. One optional final LF is permitted. Empty input returns an empty array. State is local to each invocation; no retained IDs or caller-visible partial results. Private helper names and equivalent statement organization remain flexible.

cli.mjs owns command dispatch, file reads, strict UTF-8 decoding using Node's fatal TextDecoder (preserving any BOM for row validation), JSON serialization and streams. Data commands read/decode the whole file, call parseRecords, then compute their output before the single success write. Validation failures yield status 2, empty stdout and exactly INVALID_INPUT followed by LF on stderr. Success yields status 0, empty stderr and compact JSON followed by LF. Help retains exactly record-report: validate <file> | summarize <file> followed by LF. Existing unknown-command behavior remains compatible. Node filesystem resources are closed by the synchronous read API; no persistent state or external effects. Filesystem/argument error policy beyond the approved record contract is not expanded by this technical agreement.

Dependency direction: CLI -> shared parser; parser has no CLI/stream/filesystem dependencies. Both commands must use the same exported parser, rather than duplicating or relaxing validation. B1-P2 consumes its records and forms count from array length and total from their numeric amounts, starting at zero. Do not add an aggregate safety rejection absent from the frozen spec. B1-002's safe-integer constraint applies to each record.

## Planning status

Planning only. Approved frozen SIMULATION requirements and MCP-confirmed Standard/core scope were consumed without changing them. planning_artifacts is empty; architecture stays inline and no separate contract/profile/design artifact is authorized. No product linkage is present.

## Reviewed inputs

- source_version: `b2bcc8e86d513972ae604f813b43e61e7b11ee37a0ff41285d5a246d391d884a`
- specification_version: `4b77db1d93030b893e8c9f60f5f9304257569ae2d2c04b515b188e1bccab6007`
- review_ref: `f61a4513-aa51-4915-be31-f3f9675b0b14`

specification_check_state returned pass, reviewed, document_status approved, no issues; approval_checkpoint_status absent. The tool did not approve the spec. Exact B1-001 through B1-004 definitions and their complete linked frozen behavioral decision b3a22eec-4869-4b3f-93eb-0e9c3ff6f678 revision 1 were read through MCP. There are no previous technical records. Actual simulated native acceptance is preserved in the managed technical history; it supplies no additional workflow authorization.

## Packet order and coverage

| Packet | Outcome and owning units | Requirements | Independent verification |
| --- | --- | --- | --- |
| [B1-P1](01_validation.md) | records.mjs parseRecords; cli.mjs validate, file decoding and streams | B1-001, B1-002, B1-003 empty validate, B1-004 | Real subprocess valid/invalid corpus; help/unknown regressions; no summarize implementation needed |
| [B1-P2](02_summarize.md) | cli.mjs summarize consuming parseRecords | B1-002, B1-003, B1-004; B1-001 regression | Summary expectations, same invalid corpus and whole prior suite, after completed B1-P1 |

Exactly two implementation packets. Order: explicit B1-P1 invocation -> test-first implementation and completion evidence -> stop -> later explicit B1-P2 invocation -> test-first implementation and completion evidence -> stop. Technical agreement checks can be ready for both while B1-P2 remains pending B1-P1 completion.

## Evidence and constraints

cli.mjs:2-4 contains only help/unknown handling; test.mjs:1-4 uses the real runCli helper for help. test-process.mjs:6-27 owns file-descriptor-backed child capture and cleanup; package.json:5 owns the single-file --test-isolation=none driver. Preserve both infrastructure contracts. Git status is readable with existing staged fixture additions; no clean tree or commit is necessary. Reverify evidence before each execution; staged baseline and untracked work are not disposable.

The installed Node fixture is the only stated runtime environment (B1-004). All planned tests run locally from this application using rtk-prefixed commands and the existing npm script, with no installs. Other OS/runtime coverage is neither approved nor claimed.

## Risks, rollout and recovery

Complete validation before any stdout write prevents misleading partial output. Fatal UTF-8 decoding and strict grammar prevent permissive conversions; a per-call Set enforces uniqueness. JSON serialization happens after computation. Full-file memory is proportional to input; no streaming/performance target or concurrency requirement exists. Shared-parser drift requires reopening both affected technical proposals.

No persistence, schema migration, distributed boundary, UI, accessibility surface, deployment, network, credentials, or irreversible operation is introduced. Security/privacy scope is strict input checking and bounded diagnostics. Compatibility checks cover help and unknown commands. Rollout is local packet completion, with correction or rollback limited to that packet's changes and preservation of all baseline work. No manual external gates are needed because external actions are unauthorized.

The frozen spec constrains individual amounts to safe integers without defining an additional aggregate limit or general filesystem/argument-error policy. Do not invent acceptance requirements for those areas through planning; any requested behavior expansion belongs to specification.

## Developer documentation decision

No separate durable documentation packet is warranted. This is a single CLI plus a pure module, with no operator configuration or cross-team boundary; fewer than two documentation threshold signals apply. The approved spec owns record grammar and these two packets own execution detail. A third packet would exceed the approved delivery scope.

## Final planning verification

Final specification_check_state passed against the pinned aggregate source_version, with reviewed Approved inputs unchanged and no issues. planning_packet_check returned ready for B1-P1 and B1-P2 with their exact recorded agreements/digests and no issues. B1-P2 execution still requires B1-P1 completion. All four requirements have owning units and discriminating checks; no additional profile artifacts or documentation packet is required. No production edits, implementation packet execution, test execution, installation, commit or external action occurred.
