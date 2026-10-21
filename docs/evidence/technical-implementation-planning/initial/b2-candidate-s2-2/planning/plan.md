# B2 implementation plan

Planning only for the frozen Approved SIMULATION specification. Confirmed scope: Lite, core active, planning_artifacts empty. Standalone workflow; no product task or design stage applies.

Pinned aggregate source_version: `e18112d1956654b6f757b53ccee2b8724b595a3e3e73f98d0abad7f4da9d0276`.
Pinned specification_version: `4f85f3b995a54ce1e1fdbf8de5895c3b8c9cea70c58f9119a7ea8325efe35862`.
Pinned review_ref: `e9ad44c0-8368-4a1a-9538-f4891da0c80c`.
Initial completeness check: pass, reviewed, Approved; approval checkpoint absent, no approval assigned by MCP.

Exactly one packet: [b2-01: timeout range](01_timeout-range.md), covering B2-001..B2-004. No dependencies or separate profile artifacts. Architecture is inline in its Technical proposal: CLI reads environment -> pure parseTimeout(raw) -> milliseconds or INVALID_TIMEOUT -> existing stream/exit handling. Reuse is the sole adequate scoped approach; new abstractions or dependencies add no required capability. Significant units, lifecycle, requirement/check map, preservation and recovery are defined in that packet with source evidence.

Stages within a later explicit invocation: freshness and agreement checks -> test-first RED -> minimal parser GREEN -> targeted PROVE and restoration -> final checks -> checklist/handoff updates -> stop. No execution is authorized by this plan or the simulated technical answer.

Primary risks are widening lexical acceptance accidentally, missing the inclusive maximum, and losing real CLI stream/exit coverage. Strict invalid-input tables, exhaustive accepted-second tests, exact subprocess assertions, and preservation of the existing helper and test driver address them. No migration, remote rollout, design, service, data, privacy or operational work is needed for this local bound change. Durable developer documentation is not warranted: the localized rule is explicit in the existing spec and no threshold of two documentation signals is met.

Final planning state and actual scenario-check results are recorded in [handoff.md](handoff.md). The sole execution checklist is [todo.md](todo.md).
