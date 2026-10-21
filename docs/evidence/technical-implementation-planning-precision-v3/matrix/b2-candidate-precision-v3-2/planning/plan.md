# B2 timeout-range plan

Planning only. One Lite packet: [b2-01](01_timeout-range.md), with no dependencies. The confirmed core-only manifest declares no separate contracts or design outputs. Architecture stays inline: cli.mjs owns environment/streams and calls the stateless configuration.mjs parseTimeout export; test.mjs checks both the function and real subprocess boundary using the preserved test-process.mjs helper. No new units or dependencies.

Pinned reviewed inputs:

- source_version: 8fd22d8e1bc4855333c95f4a2db4879f0f51f6e0c6e751146948bb603e79cc65
- specification_version: 4f85f3b995a54ce1e1fdbf8de5895c3b8c9cea70c58f9119a7ea8325efe35862
- review_ref: bb488a12-129f-4315-8d22-bd0319d0cad4

| Requirement | Owning unit | Planned check |
| --- | --- | --- |
| B2-001 | parseTimeout; CLI adapter | Undefined default and exact JSON/streams/status |
| B2-002 | parseTimeout | Full accepted range and zero prefixes; real CLI 11/60 |
| B2-003 | parseTimeout; CLI error adapter | Invalid class matrix; exact Error, streams and exit 2 |
| B2-004 | Scoped packet | Dependency/harness preservation and scoped diff/hash |

Stages within the single packet: tests and relevant RED, smallest implementation, GREEN, required absence PROVE and restoration, final checks and current handoff. No packet execution is authorized by this plan. Separate explicit invocation is required; commits/installations/external actions remain prohibited.

Primary risks are off-by-one range errors, accepting non-decimal syntax, changing CLI failure streams, and masking subprocess failures with the sandbox's default pipes. The packet's boundary matrix and preserved file-descriptor helper address these. Preserve staged fixture additions and unrelated.txt; do not assume a clean Git tree. Rollout/recovery and applicability are inline in the packet. No durable developer documentation is warranted for this localized range adjustment; no design stage or profile artifact is declared.

Specification initially passed as approved/reviewed; tool approval checkpoint is absent and tool checks do not authenticate consent or prove semantic completeness. Technical agreement is recorded under 8c6f969d-fc26-4ca4-afd1-30f2b0c8f798 revision 2. Final readiness/freshness results are recorded in handoff.md.
