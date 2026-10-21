# B2 timeout-range plan

Planning complete; implementation has not started or been authorized. This is an isolated SIMULATION fixture. Approved behavior remains authoritative in `../spec.md`, B2-001 through B2-004.

## Pinned inputs

- MCP source_version: `c54047200bb8ec742980630c950ab6968aa2a54e6e54fa5f1028c8d1fcfa6395`
- MCP specification_version: `4f85f3b995a54ce1e1fdbf8de5895c3b8c9cea70c58f9119a7ea8325efe35862`
- MCP review_ref: `15060e48-c8d5-41eb-9c5e-aea70753c920`
- Completeness: pass, reviewed, Approved; approval checkpoint absent, no checkpoint written. MCP does not prove semantic correctness or authenticate respondent consent. These inputs are frozen simulation data, not additional execution authority.
- Confirmed manifest: Lite, core active, planning_artifacts empty; no product linkage or declared design outputs. Exact behavior decision: `e9908c4f-0a6d-4ef5-abcb-1b1e256962d7` revision 1; scope decision: `scope.manifest` revision 2. Both current decisions and all four exact requirements were read completely through MCP. The historical proposal's confirmed:false does not override the current confirmed manifest.

## Architecture and coverage

| Unit and repository evidence | Contract, lifecycle and dependency | Requirements and verification |
| --- | --- | --- |
| `configuration.mjs:1`, exported `parseTimeout(raw)` | Pure synchronous policy function; input undefined or environment string, output milliseconds; undefined defaults to 5000. ASCII digits with numeric value 1..60, including leading zeroes, yield seconds × 1000. Invalid strings throw Error with exact message INVALID_TIMEOUT. No state, resources or dependencies. Existing maximum is 10 at line 3; change only this bound. | B2-001/002/003: default, all 1..60, leading-zero and invalid-input unit assertions. |
| `cli.mjs:2`, top-level entry | Depends on configuration, reads TIMEOUT_SECONDS once per process. Success writes one JSON line with timeoutMs and format:'json'; failure writes INVALID_TIMEOUT newline to stderr, empty stdout, exit 2. Process owns its lifetime; no reload, async work or new cancellation behavior. | B2-001/002/003: real child-process stream, status and signal assertions. Preserve existing entry point. |
| `test.mjs:1`, Node test suite; `test-process.mjs:6`, runCli | Tests import parser and existing child helper. Helper spawns the real CLI using temporary file descriptors, reports status/signal/streams, closes descriptors and removes its child folder in finally (`test-process.mjs:15`, `test-process.mjs:22`). Keep helper intact. | B2-001..004: test-first extension of test.mjs. Keep existing regression assertions. |
| `package.json:5`, npm test | Existing dependency-free single-file Node driver; preserve exact command and package configuration. | B2-004: scoped diff and existing runner. |

## Delivery

Exactly one packet: [01_timeout-range.md](01_timeout-range.md). No packet dependencies, generators, installations or design stage. It becomes executable only after an explicit invocation authorizing that packet. [todo.md](todo.md) is the sole completion checklist; [handoff.md](handoff.md) records current evidence.

The packet writes tests first, records a relevant failure at the old upper bound, changes the parser bound, then runs the same checks until correct assertions pass. No separate profile artifact is authorized. No implementation choice requires a respondent question.

The material risk is accidentally relaxing lexical validation or changing CLI diagnostics while expanding the bound. Boundary and malformed-input tests address it. The only platform scope is the existing isolated dependency-free Node fixture; checks run in its installed sandbox using the supplied runner and helper. No broader OS/runtime matrix is claimed. No checks have been run during planning.

No data migration, deployment, external integration, security/privacy mechanism, UI/accessibility work, telemetry or performance work is implicated by this numeric validation change. Existing CLI compatibility is explicitly checked. Rollout is local verification only; recovery restores just packet-owned edits while preserving pre-existing staged/untracked work. No external or irreversible steps are authorized.

Durable developer documentation is not warranted: this is a localized range adjustment across one function and its thin CLI consumer, with no new vocabulary or operational mechanism. Fewer than two documentation-threshold signals apply; no documentation packet is created.
