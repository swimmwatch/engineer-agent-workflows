# B2 timeout range plan

Planning complete; implementation is pending explicit authorization for packet 01. This is an isolated SIMULATION. Standalone Lite scope, core active, no profile or design artifacts declared. One packet covers B2-001 through B2-004.

## Frozen inputs

- Authoritative behavior: `../spec.md`, Status: Approved, B2-001–B2-004 (lines 7–22); exact definitions read through MCP.
- MCP source_version: `1fbe7d2e673d91649b1a45d259908ff545982ad1eab6d861068b2067360c9354`
- MCP specification_version: `4f85f3b995a54ce1e1fdbf8de5895c3b8c9cea70c58f9119a7ea8325efe35862`
- MCP review_ref: `8f13a2c1-c5ff-4a67-ab32-5c76dd3addb6`
- Exact decisions: `e9908c4f-0a6d-4ef5-abcb-1b1e256962d7` revision 1; `scope.manifest` revision 2. Scope confirmed by MCP; no pending questions. The historical proposal's false flag is not current scope.
- Initial state check: pass, reviewed, approved; checkpoint absent. MCP does not prove semantic correctness or authenticate respondent/reviewer independence. Inputs are frozen fixture evidence.

## Architecture and coverage

| Unit and evidence | Boundary, lifecycle, dependency | Requirements and verification |
| --- | --- | --- |
| `configuration.mjs:1–5`, `parseTimeout(raw)` | Synchronous stateless function; receives undefined or configuration string, returns milliseconds or throws Error with message INVALID_TIMEOUT. Undefined defaults to 5000; ASCII digits representing 1..60 inclusive, with leading zeroes, map to seconds × 1000. Keep validation and conversion here; no dependencies. | B2-001–003: default, full accepted range, padded forms, malformed and out-of-range unit cases. |
| `cli.mjs:2–4`, module entry point | Reads TIMEOUT_SECONDS once per process, calls parser, writes JSON plus newline or catches errors and writes diagnostic plus newline with exit 2. CLI depends on configuration; parser never depends on CLI. No persistent state or resources. | B2-001–003: real child process assertions for stdout, stderr, status and signal. |
| `test.mjs:1–4`; `test-process.mjs:6–27`, runCli | Tests own assertions; helper owns temporary descriptors/files and cleanup in finally, returns actual child streams/status/signal and throws spawn errors. Preserve helper and subprocess observation. Existing runner is `package.json:5`. | B2-001–004: extend tests before parser change; preserve runner and harness; review scoped changes. |

## Delivery and applicability

[01_timeout-range.md](01_timeout-range.md) is the only implementation packet; it has no packet dependencies. [todo.md](todo.md) owns completion; [handoff.md](handoff.md) owns current execution state. No unresolved implementation choices require questions.

Use the existing dependency-free Node.js ES-module runtime and installed single-file test driver in this fixture. No additional OS/runtime support matrix is specified; checks target the supplied local fixture, not unverified platforms. No dependencies, classes, persistent storage, migration, UI, distributed boundaries, design stage, security/privacy change or added observability are warranted. Existing validation and bounded diagnostics remain the trust boundary. Rollout is the scoped local parser change after checks; recovery restores only packet edits while preserving pre-existing staged work. No deployment or external steps are authorized.

Durable developer documentation is not warranted: this is a localized range change with an existing function boundary and no new terminology or operational model. No separate documentation packet.

Before final handoff, repeat MCP specification_check_state with the pinned source_version; drift or incomplete review returns affected work to specification. No implementation or tests are executed during planning.
