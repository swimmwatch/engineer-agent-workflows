# B2 timeout range plan

Planning complete; implementation has not started. Frozen SIMULATION inputs apply only inside this fixture. Depth: Lite; active profile: core; no additional profile or project design outputs are declared. Standalone task; no product linkage.

## Authoritative inputs

- Approved behavior: `docs/specs/b2/spec.md`, B2-001 through B2-004 (lines 7–22); all four exact MCP definitions read completely.
- MCP `source_version`: `7fcd011665d866b7e912710e6b44df093846b32adf3e6239fc076bf06ae2ba2b`.
- MCP `specification_version`: `4f85f3b995a54ce1e1fdbf8de5895c3b8c9cea70c58f9119a7ea8325efe35862`.
- MCP `review_ref`: `2ed89011-812c-4af6-a05d-da8a10be1f0d`.
- `specification_check_state`: pass, reviewed, approved; no issues. Approval checkpoint absent and not written. MCP does not prove semantic completeness or respondent authenticity; these inputs are explicitly frozen by the fixture.
- Current scope confirmed by `scope_get`: Lite/core, `planning_artifacts: []`, no pending scope. Exact decisions read: behavior `d7012935-8d3c-4062-afbb-1091bec3bbe8` revision 1 (B2-001–004), and `scope.manifest` revision 2. Its nested unconfirmed proposal is historical; current manifest is confirmed.

## Delivery and architecture

Exactly one packet: [01 — timeout range](01_timeout-range.md), with no packet dependencies or design gate. [todo.md](todo.md) is the sole completion checklist; [handoff.md](handoff.md) records current evidence.

| Unit and evidence | Responsibility, lifecycle, dependency | Requirements and verification |
| --- | --- | --- |
| `configuration.mjs:1`, `parseTimeout(raw)` | Pure synchronous function, no retained state or resources. Input is undefined or an environment string; returns milliseconds or throws `Error('INVALID_TIMEOUT')`. Owns ASCII integer syntax, default and inclusive range. Depends only on JavaScript primitives. Existing ceiling is 10 at line 3; preserve boundary and expand ceiling to 60. | B2-001–003; unit default, all accepted seconds, leading zeroes, invalid categories. |
| `cli.mjs:2`, module entry | Reads TIMEOUT_SECONDS once per process, calls parser, writes JSON plus newline or error plus newline and sets exit 2. Dependency points from CLI to configuration. No new flags, state, retries or reload. | B2-001–003; real child-process checks for exact stdout, stderr, status and signal. |
| `test.mjs:1`, Node test cases | Owns behavioral assertions; extend existing regression at line 4. Imports parser and existing process helper. Tests run on the installed Node runtime. | B2-001–004; RED before production edit, GREEN and final full suite. |
| `test-process.mjs:6`, `runCli(args, { env })` | Existing real subprocess observer. Owns temporary descriptors/files, reads actual streams/status/signal, closes descriptors and removes child folder in finally (lines 12–25). Preserve helper byte-for-byte. | B2-001,003,004; use for CLI assertions, never mocks or imports replacing subprocess coverage. |
| `package.json:5`, test command | Existing single-file `node --test --test-isolation=none test.mjs` avoids runner IPC. No dependencies or command edits. | B2-004; use `rtk proxy npm test`, inspect scoped diff. |

## Coverage, risks and applicability

The packet maps each B2 requirement to explicit checks. Runtime support in the frozen spec is dependency-free Node.js in this isolated fixture; no OS/version matrix is declared. Plan execution on its installed Node runner only; no claim of other-platform verification. No runtime checks have been run during planning.

Main risk: accepting newly valid values while accidentally admitting 0, 61, signs, whitespace or fractions. Boundary and lexical tests distinguish these failures. The existing regular expression uses `$` (`configuration.mjs:3`), which can match before a final newline; explicitly check `'1\n'` against B2-003 and ensure validation consumes the entire input. This is within the approved whitespace rejection, not additional scope. Preserve default 5000 and exact CLI streams. Preserve existing staged additions and all unrelated content, particularly `unrelated.txt`.

No migration or persistent state; rollout is the local function edit after tests fail. Recovery is restoring only packet-owned edits to the captured pre-execution working state, preserving staged fixture files and unrelated changes. No broad reset. Deployment, external services, UI/accessibility, distributed lifecycle, telemetry and new privacy handling are not applicable: this is a local pure parser and existing one-process adapter with bounded fixed diagnostics. No new logging or dependencies.

Durable developer documentation is not warranted: a localized numeric range expansion crosses no new boundary, creates no vocabulary or silent operator failure, and has no non-obvious rule needing a separate document. No documentation packet.

Implementation requires a separate explicit packet invocation. No commit, installation, publication or external action is authorized. Stop after planning.
