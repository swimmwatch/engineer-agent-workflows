# Product Roadmap Task Graph Handoff

Status: Planning complete. Technical agreements are ready; implementation has not started.

## Current contract

Approved specification source_version: `6087eb0c0dfca148e9afc43780651ece85bd5d9660313a049d34071925e8eaa5`.
specification_version: `e257fb7b0011d3d9e5e9b0754391b65133e83054bc7327fd2110163f0dab5af8`.
review_ref: `fd840f43-b70d-463d-991c-204f891f1b2e`.
Depth: Deep. Active profiles: core, ui, backend, data, operations, security, cross-surface. Events: not applicable.

The HTTP server dynamically derives/renders SVG and the task list. No generated graph HTML/SVG/layout is persisted. Only source observations/bindings/supplements and sync evidence are durable. MCP is the agent command/data channel; the browser uses direct HTTP. gh is invoked directly; no additional runtime runner is planned.

## Saved outputs

Ten agreed implementation packets and [plan.md](plan.md), the sole execution checklist [todo.md](todo.md), [MCP contract](../contracts/mcp.md), [OpenAPI contract](../contracts/openapi.yaml), [quality scenarios](../quality/scenarios.yaml) and [text architecture model](../architecture/model.dsl). All 40 requirements have ownership/check mappings; 15 measurable scenarios cover the actual boundaries. No design artifact/stage is required.

Planning changed only this specification's planning artifacts and scenario-managed technical decision history. No production/runtime, installed/global configuration, commit or publication was changed. Known unrelated worktree modifications remain in the MCP README, metadata, task/tool modules, task-pin tests, shared product schema and `.local/`. Reinspect overlap before implementation; do not require a clean tree or existing commit.

Additional changes appeared during planning in `skills/planning-and-task-breakdown/references/technical-agreement.md` and its two generated host copies. Their owner was not established here; planning did not edit them and they do not overlap this invocation's output writes. Preserve/reinspect them before any later collection regeneration.

## Verification on 2026-10-24

- Engineering-manual bundle verifier: passed.
- Entry and final MCP specification checks: pass; Approved, reviewed and the pinned behavioral/specification/review identities are unchanged.
- Final `planning_packet_check`: **10/10 ready**, using exact returned agreement refs/digests recorded in each packet. The first implementation-eligible packet is still P01; dependency completion for later packets is not implied.
- Exact frozen proposal sections were compared before/after formatting: unchanged.
- Saved profile YAML: real parser with duplicate-key rejection passed.
- OpenAPI 3.1 structural contract validation: passed against the official [2022-10-07 meta-schema](https://spec.openapis.org/oas/3.1/schema/2022-10-07), including a negative control that rejects a missing version.
- Requirement coverage: 40/40; unique scenarios: 15; unique packet agreement metadata: 10; dependency graph acyclic; local Markdown links and scoped whitespace passed.
- Architecture model: declared identifiers, relation endpoints, view scopes and balanced blocks checked. An external Structurizr DSL compiler/render was not run; no rendered-diagram or compiler pass is claimed.
- Prettier 3.9.6 check: passed for the specification/workflow YAML (read-only), task Markdown, MCP/OpenAPI contracts and quality scenarios.

Validation used the actual saved artifacts with the existing system Python YAML/jsonschema and local pinned Prettier; temporary validation/formatting scripts are not production artifacts. Runtime feature tests, actual browser acceptance, live board probes and KAP workflow operations were not run because this invocation is planning-only.

Three OpenAPI references intentionally target future canonical graph definitions: `RoadmapGraphPage`, `RoadmapGraphProblem` and `RoadmapGraphSyncStatus`. They are declared planning references, not currently resolved implementation schemas. P02/P04/P05 add the exact selectors; P06 must validate complete reference resolution against their saved canonical definitions. This is a future implementation prerequisite, not a claimed runtime pass.

## Next action

A separate explicit incremental-implementation invocation may authorize **[P01 only](01_graph-kernel.md)**. Its agreement is `3eaf2a1f-7c59-4529-bd95-e18337d72844@2`, proposal digest `3df5069a89813cae1eaa37db40dd97d8517e5b3e76ba02ce0871f803f6b7a09f`.

The P01 executor must recheck the exact specification/agreement, current Git evidence and local prerequisites, execute RED/GREEN/PROVE, update the linked checklist/current handoff and stop after P01. No implementation is currently authorized. Later required Linux browser capability is verified before dependent P07/P09 work; its availability is not assumed by this plan.
