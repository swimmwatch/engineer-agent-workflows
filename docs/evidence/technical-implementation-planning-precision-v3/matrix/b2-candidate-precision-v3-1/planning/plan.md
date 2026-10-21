# B2 implementation plan

Planning complete; execution not started. Frozen SIMULATION scope: Approved specification, MCP-confirmed Lite depth, active core only, no profile or root design outputs. Standalone task; no product workflow.

## Reviewed inputs

- source_version: `881d5c183c7cc641998ce2707666a2a5c04236e3b9e2c88ed39e27065cd0f195`
- specification_version: `4f85f3b995a54ce1e1fdbf8de5895c3b8c9cea70c58f9119a7ea8325efe35862`
- review_ref: `03199ed8-4456-426a-9af3-15c445d586c2`

MCP specification check: pass / approved / reviewed; approval checkpoint absent, not written. Tool checks do not independently authenticate approval. Exact B2-001 through B2-004 definitions were read with the pinned specification version, along with their shared decision revision 1.

## Packet and architecture

Exactly one packet: [b2-01: Expand timeout range](01_timeout-range.md), with no packet dependencies. Order: revalidate inputs and local worktree → add/run discriminating tests → smallest parser change → GREEN and required PROVE → final checks and handoff → stop.

Existing architecture remains CLI → configuration. The synchronous stateless `parseTimeout(raw)` export owns validation/default/conversion (`configuration.mjs:1`); CLI owns environment, JSON, streams and exit (`cli.mjs:2`). Direct parser tests and real subprocess CLI checks use the existing `runCli` helper (`test-process.mjs:6`). Significant contracts, lifecycle, errors and exact bindings are in the packet's immutable Technical proposal.

| Requirement | Owner | Verification |
| --- | --- | --- |
| B2-001 | parseTimeout and CLI | Default/old-range numeric results and exact real-child success output |
| B2-002 | parseTimeout, exercised through CLI | All 1..60 plus leading zeroes; new-range RED then GREEN |
| B2-003 | parser errors and CLI failure boundary | Invalid-input matrix; exact error, status, signal and streams; affected absence PROVE |
| B2-004 | Scoped implementation and fixture preservation | One packet; no dependency/helper/runner changes; scoped diffs and unrelated-file digest |

## Readiness and constraints

Technical proposal `b2-timeout-existing-boundary` was explicitly accepted by the frozen simulated respondent through the native question. Managed agreement `f5be186c-94d8-4ae6-975b-085737b853be` revision 2; digest `51e85182414c0011b5d165abbc86bd6d6590a016e44b1ac68d28e78d5d5f9e70`. MCP planning_packet_check: ready, no issues. Full bindings reside in the packet. This establishes technical readiness only; a separate explicit b2-01 invocation is required.

Risk is a widened validation boundary and accidental stream/status regressions. Test exact 60/61, leading zeroes and invalid syntax with real children. Preserve the descriptor-based helper and existing npm test command. Git status is readable with staged fixture content; never reset it. No new runtime/OS support requirement is declared; execute checks on the installed fixture Node environment and record actual environment/results.

No migration, deployment, persistence, concurrency, accessibility, remote security/privacy change or new observability is involved. Rollout/recovery are local scoped edits/restoration, detailed in the packet; irreversible/external steps are excluded. No separate design invocation is needed. Durable documentation is not warranted for this localized range extension at the existing boundary; no documentation packet.

## Planning verification

Matching manual verification succeeded. Exact Approved requirements and confirmed scope were consumed via authorized mechanisms. Completeness and agreement checks pass. No implementation packet, production check or test suite was executed during planning. The sole execution checklist is [todo.md](todo.md); current state is [handoff.md](handoff.md).

