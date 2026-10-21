# B2 timeout-range plan

Planning complete; implementation not started or authorized by this invocation.
One Lite packet: [01_timeout-range.md](01_timeout-range.md), covering B2-001–B2-004.
Completion lives only in [todo.md](todo.md); current state is in [handoff.md](handoff.md).

## Frozen inputs

- Approved authority: `docs/specs/b2/spec.md`, B2-001–B2-004 (lines 7–22).
- MCP `source_version`: `390b67d79741e06e54b88c2f8468cd511ecd5791b915b167352f2ac0bc1d404e`.
- MCP `specification_version`: `4f85f3b995a54ce1e1fdbf8de5895c3b8c9cea70c58f9119a7ea8325efe35862`.
- MCP `review_ref`: `f59678c8-4355-4c78-8ea9-785699613205`.
- State check: pass, reviewed, Approved; approval checkpoint absent, no checkpoint written. MCP does not prove semantic correctness or authenticate the simulated respondent.
- `scope_get`: confirmed Lite, core active, no profile planning artifacts or root design outputs. Standalone fixture; no product linkage supplied.
- Exact decisions read completely: `d7012935-8d3c-4062-afbb-1091bec3bbe8@1` (B2-001–004, `fixture:frozen-behavior`) and `scope.manifest@2` (`fixture:approved-scope`). Both current decision records enumerated, no continuation. The historical scope proposal's false confirmation flag does not override the confirmed manifest.

## Architecture and coverage

| Unit and evidence | Boundary, lifecycle and dependency | Requirements and verification |
| --- | --- | --- |
| `configuration.mjs:1–5`, `parseTimeout(raw)` | Pure synchronous exported function; optional environment string in, milliseconds out. Undefined returns 5000; ASCII decimal strings representing 1..60, including leading zeroes, multiply by 1000. Invalid input throws Error with message INVALID_TIMEOUT. No owned resources/state or dependencies. Preserve boundary; change upper limit currently 10 at line 3. | B2-001–003: direct function default, complete valid range, leading zeroes and invalid-input checks. |
| `cli.mjs:2–4`, module entry | One process reads TIMEOUT_SECONDS, calls parser, serializes `{timeoutMs,format:'json'}` plus newline. Success status 0, empty stderr; failure status 2, empty stdout, `INVALID_TIMEOUT\n` stderr. CLI depends on configuration policy. No new options, lifecycle or configuration precedence. Existing CLI needs verification rather than an expected edit. | B2-001–003: real process success/default/error stream, status and signal assertions. |
| `test.mjs:1–4`, tests; `test-process.mjs:6–27`, `runCli` | Node test/assert own verification. Tests import parser and existing helper; helper owns spawned process, temporary descriptors and cleanup in finally. Preserve helper and its actual status/signal and file-backed stream observation. | B2-001–004: test-first extension in the sole packet. |
| `package.json:3–5`, test command | Existing ESM Node runner uses single-file `--test-isolation=none`; no dependencies or runner changes. | B2-004: scoped diff and preservation checks. |

## Delivery and applicability

Packet 01 has no packet dependencies or design gate. Its prerequisites are fresh frozen-input checks, readable Git status, existing Node/npm/rtk runners, and a separate explicit implementation invocation. Preserve staged and untracked content; initial Git status shows existing staged fixture files, so compare against the invocation baseline rather than require a clean tree.

Main risk: widening numeric acceptance accidentally loosens lexical validation or changes CLI streams. Test the boundaries and exact child outputs before changing the parser. One localized dependency-free function change is sufficient; no additional abstraction or profile contract is justified.

Environment coverage is the supplied isolated Node fixture using its installed runner (B2-001–004). No additional OS/runtime support matrix is declared by frozen inputs; do not infer broader compatibility. Tests have not run in planning; execution must record actual runner results and keep completion pending if required checks are unavailable.

Rollout is local fixture verification only; no deployment, migration or persistent state. Recovery restores only this packet's own edits after inspection, preserving pre-existing work; reverting the range restores the old cap and withdraws 11..60 support. No automatic Git reset. External actions, installs, commits and publishing remain unauthorized; there are no external manual steps in this packet.

Security/privacy: retain strict validation and fixed error text; no new I/O or sensitive data. Accessibility, UI design, concurrency protocols and operational observability are not applicable to this stateless local range expansion. No durable developer-documentation packet: localized existing configuration behavior introduces no vocabulary, multi-layer complexity or silent misconfiguration; fewer than two documentation signals apply. Approved specification and packet retain the contract.
