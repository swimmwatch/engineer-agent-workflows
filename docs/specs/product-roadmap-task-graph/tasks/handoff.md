# Product Roadmap Task Graph Handoff

Status: Planning complete, including the requested private-GitHub acceptance amendment of 2026-10-26. Technical agreements are ready; implementation has not started.

## Current contract

Approved specification source_version: `6087eb0c0dfca148e9afc43780651ece85bd5d9660313a049d34071925e8eaa5`.
specification_version: `e257fb7b0011d3d9e5e9b0754391b65133e83054bc7327fd2110163f0dab5af8`.
review_ref: `fd840f43-b70d-463d-991c-204f891f1b2e`.
Depth: Deep. Active profiles: core, ui, backend, data, operations, security, cross-surface. Events: not applicable.

The HTTP server dynamically derives/renders SVG and the task list. No generated graph HTML/SVG/layout is persisted. Only source observations/bindings/supplements and sync evidence are durable. MCP is the agent command/data channel; the browser uses direct HTTP. gh is invoked directly; no additional runtime runner is planned.

## Saved outputs

Ten agreed implementation packets and [plan.md](plan.md), the sole execution checklist [todo.md](todo.md), [MCP contract](../contracts/mcp.md), [OpenAPI contract](../contracts/openapi.yaml), [quality scenarios](../quality/scenarios.yaml) and [text architecture model](../architecture/model.dsl). All 40 requirements have ownership/check mappings; 16 measurable scenarios cover the actual boundaries. The existing 15 scenarios are unchanged, and Q-GITHUB-LIVE is the required addition owned by P09. No design artifact/stage is required.

This amendment changed only the plan, P09, P10 delivery details, checklist, current handoff, quality scenarios and scenario-managed technical decision history. No production/runtime, installed/global configuration, commit or publication was changed. Preserve unrelated worktree changes and reinspect overlap before implementation; do not require a clean tree or existing commit.

## Private GitHub acceptance amendment

The user's direct instruction of 2026-10-26 adds a required real-provider run to [P09](09_linux-acceptance.md): create one new private repository and one new private Projects v2 board, verify their visibility independently before seeding, then use approximately 12 synthetic Issues, two Milestones, labels, status/Stage options and native dependencies. Exercise field/link changes, stable status-option IDs, Backlog, unknown status, repeated synchronization and selected-task removal from Project membership. Compare actual GitHub read-backs with complete MCP inventories and dynamically generated SVG/HTML-list/browser state through both sync entry points.

Fixture writes belong to the test actor through existing GitHub tools/direct gh; the EAW adapter remains read-only. Keep injected faults and the 1000-task/10000-edge capacity workload local. The opt-in live check is separate from normal offline runs and is mandatory for P09 completion; unavailable/failed/skipped is not a pass. Keep exact resource IDs, privacy proofs and mappings in a private credential-free inventory. Retain the resources privately after acceptance; deletion requires a separate explicit request naming exact IDs.

P09's new binding is `b8d263ab-6516-459a-81df-317828aea304@2`, proposal `P09-github-live-acceptance-v2`, digest `452aa60f5965f04b10a2940b702b21b751c5edd33e46e43be4f240edd1f530d5`. Its recorded answer cites the actual direct user instruction, without claiming a new native-question response or execution authority. All other packet bindings remain unchanged. P10 delivery details consume actual live acceptance results and distinguish them from local evidence.

No GitHub test repository, Project or seed data has been created. No live or runtime feature test has run. Resource creation and execution belong to the later separately invoked P09, after P01-P08 complete.

## Verification on 2026-10-26

- Engineering-manual bundle verifier: passed during this planning amendment.
- MCP specification check: pass; Approved and reviewed, with unchanged pinned source/specification/review identities.
- Final `planning_packet_check`: **10/10 ready**, including P09's replacement binding. Dependency completion is not implied; P01 remains the first implementation-eligible packet.
- All 11 bound source sections, including shared architecture and each packet's technical proposal, are unchanged after the agreement and formatting.
- Quality YAML: actual PyYAML 6.0.2 parser with duplicate-key rejection passed; 16 unique scenarios, 15 existing scenario records unchanged, valid owners and requirement IDs.
- Requirement coverage: 40/40; ten unique packet agreement records; dependency graph acyclic; local Markdown links and scoped whitespace passed.
- Prettier 3.9.6 check: passed for the amended Markdown/quality artifacts and workflow YAML (read-only).

Checks used the saved planning artifacts and existing tooling. Unchanged OpenAPI/architecture contracts were not revalidated against an external compiler/schema in this amendment. Runtime feature tests, actual browser acceptance, GitHub-resource creation/live acceptance and KAP workflow operations were not run because this invocation changes only the plan. No runtime or native-platform pass is claimed.

Three OpenAPI references intentionally target future canonical graph definitions: `RoadmapGraphPage`, `RoadmapGraphProblem` and `RoadmapGraphSyncStatus`. They are declared planning references, not currently resolved implementation schemas. P02/P04/P05 add the exact selectors; P06 must validate complete reference resolution against their saved canonical definitions. This is a future implementation prerequisite, not a claimed runtime pass.

## Next action

A separate explicit incremental-implementation invocation may authorize **[P01 only](01_graph-kernel.md)**. Its agreement is `3eaf2a1f-7c59-4529-bd95-e18337d72844@2`, proposal digest `3df5069a89813cae1eaa37db40dd97d8517e5b3e76ba02ce0871f803f6b7a09f`.

The P01 executor must recheck the exact specification/agreement, current Git evidence and local prerequisites, execute RED/GREEN/PROVE, update the linked checklist/current handoff and stop after P01. No implementation is currently authorized. Later required Linux browser capability is verified before dependent P07/P09 work; its availability is not assumed by this plan.
