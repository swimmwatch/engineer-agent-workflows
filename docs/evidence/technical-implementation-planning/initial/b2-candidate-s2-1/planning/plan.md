# B2 implementation plan

Frozen simulation; planning only. Confirmed standalone Lite depth, active core profile; no additional profile/design artifacts. Approved requirements B2-001..B2-004 are owned by one packet, [b2-timeout-range](01_timeout-range.md). Its inline technical proposal retains the existing pure parser and CLI adapter; its verification map covers all four requirements.

MCP inputs: source_version `a8768504a041a80f0be679675cfc18e982726ce5e8cc8b818cf431531bafbb20`; specification_version `4f85f3b995a54ce1e1fdbf8de5895c3b8c9cea70c58f9119a7ea8325efe35862`; review_ref `a9e5ac8f-4f46-4c3d-94a7-14470b8863df`. Completeness returned pass/reviewed, Approved Markdown; approval checkpoint absent. These are frozen simulation inputs, not independently authenticated approval.

One stage, no dependencies: separately invoke the packet, recheck inputs, add/run discriminating tests first, implement the bound change, prove affected checks, verify preservation and update handoff. Technical agreement is ready; implementation has not been authorized or executed. Greatest risks are permissive parsing, an off-by-one limit and CLI tests observing mocked/incomplete output; the packet preserves strict validation, exercises boundaries and uses the existing real subprocess helper.

No persistent state, migration, remote rollout or external manual steps. Recovery is limited to packet-owned changes and preserves the existing staged work. Durable developer documentation is unwarranted for this localized configuration bound change. Architecture, platform coverage, recovery and exact checks stay inline in the packet. [todo.md](todo.md) is the sole completion checklist; [handoff.md](handoff.md) records current state.
