# Product Roadmap: Task Graph and Board Synchronization

Date: 2026-10-23

Status: Direction confirmed through Idea Refine. Idea document only; no specification, planning, implementation, or publication is authorized by this document. The user selected this file as the final output of the session.

## Problem Statement

How might we let an agent draft a task plan and a person refine its composition, stages, and dependencies through dialogue, while making parallel work visible and keeping the plan aligned with an external board?

## Recommended Direction

Extend Product Roadmap and the existing EAW product store rather than introduce a parallel task database. Keep stable internal task identities, the complete dependency graph, and explicit external ID bindings. The agent drafts and revises the plan through dialogue; the web interface provides visualization, filtering, issue links, and a synchronization button, without a task editor.

Reuse the graph algorithms and presentation principles of KAP Task Management. Adapt its state calculation and provider boundary to EAW. For bound entities, the board is authoritative for every synchronized field: title, status, tags, sprint, Stage membership, and dependencies. Changes requested through dialogue are applied through provider tools and read back into EAW. Creating or changing external entities is outside the EAW runtime: the agent uses the provider's MCP tools, GitHub CLI, or integration.

The synchronization contract is provider-neutral. The first adapter reads GitHub through an installed `gh`; Jira and YouTrack adapters are future work. Both the EAW MCP synchronization tool and the viewer button use the same read and reconciliation path. This retrieves fresh board data rather than exporting links or redrawing an old snapshot.

## MVP Scope

### Graph and visualization

- Retain every source dependency. Reject invalid references, self-dependencies, and cycles.
- Calculate layers from prerequisites: roots occupy layer 1; other tasks follow their latest prerequisite. Use transitive reduction only for displayed arrows.
- Preserve the original downward graph, muted layer palette, cards, per-layer task list, search, filters, pan, zoom, and selected-task dependency/dependent views.
- Distinguish layer colors from state accents. Reuse state borders, dashed specification borders, footer bands, labels, and corresponding list/filter accents.
- Provide filters for exact board status, computed state, specification readiness, Stage, Sprint, and tags. Filtering does not delete source relationships.

### States, groups, and tags

- Keep exact board status separate from Done, Working, Testing, Backlog, dependency readiness/blocking, and Needs Spec. Show blocking reasons explicitly and use explicit board-state mappings.
- A predecessor stops blocking only after completion; an unknown status does not unblock work. Needs Spec independently identifies unfinished tasks without a current Approved specification. Board observations do not grant specification approval or complete EAW implementation packets.
- Backlog is an explicit exception: retain its source dependencies but exclude its tasks and incident edges from the active calculation. Reactivate them on leaving Backlog. Isolation alone does not imply Backlog.
- Sprint is a named group with a goal, order, and optional dates; a task has at most one Sprint. Sprint, product Stage, and computed dependency layer remain distinct.
- Use one `package:<name>` tag per affected package. Shared tasks have `scope:shared` and no package tags. Allow additional thematic tags; replace package title prefixes with tags.

### GitHub and synchronization

- Support one GitHub Project and one Issues repository per product. Bind tasks to Issues and Sprints to Milestones; synchronize Stage membership and the full dependency set as well as titles, statuses, and tags.
- Require explicit ID bindings to existing external entities. EAW does not create Issues, Milestones, or other provider entities, and does not match them by title.
- Synchronize only through an explicit MCP call or viewer button, with no background board polling. Allow draft graph previews; require a ready Roadmap for synchronization.
- Let board values win discrepancies in synchronized fields. Preserve existing Roadmap validation and readiness rules when incorporating structural changes.
- Continue independent work after partial failures. Preserve the last verified data for affected tasks, mark it stale, report failures, and support repeatable reconciliation. Never accept a partially invalid graph as a successful update.
- Use the existing product store outside consuming workspaces. Start a local HTTP viewer on explicit request, return its URL, and tie its lifetime to the MCP process.

## Key Assumptions to Validate

- [ ] GitHub can represent and expose every agreed field, especially Stage membership and complete dependencies, through `gh`. Verify field mappings, permissions, and complete reads before implementation claims.
- [ ] Existing EAW identity, storage, revision, and readiness mechanisms can accommodate board observations without bypassing review or creating a second authoritative local model. Specify how structural changes affect readiness.
- [ ] Partial updates can preserve graph validity and recover reliably. Verify stale observations, concurrent board changes, unknown statuses, and interrupted/repeated synchronization.

## Not Doing

- Gantt, resource allocation, workload/capacity planning, task-description authoring, or a knowledge base from Task Management.
- A graph editor, autonomous execution, background synchronization, or provider entity creation, modification, and deletion inside EAW.
- Jira/YouTrack adapters, multiple GitHub repositories per product, or separate external Epic/Story publication in this version.
- Replacing existing EAW specifications, reviews, plans, or task execution mechanisms.
- Treating the saved Chigiri visualization as a canonical task database; it remains a presentation reference.

## Open Questions for a Later Specification

- Define exact provider field mappings, binding records, and observation/reconciliation contracts, including missing or removed external entities.
- Define the interaction between authoritative board changes and ready Roadmap revisions, including the route back to readiness after structural changes.
- Define failure boundaries, freshness indicators, read completeness, and the shared MCP/viewer synchronization contract.

## Source Basis

- EAW: `skills/product-roadmap/SKILL.md`, `packages/engineer-agent-workflow-mcp/src/product/{roadmap,tasks,config}.ts`, and `shared/schemas/product.schema.json`.
- KAP Task Management: `mcp/task-management/src/task_management_mcp/build_task_graph.py`, `task_graph/{domain,state,web,service}.py`, and `task_graph/static/` under that source package.
- Saved Chigiri example: 40 tasks, 3 stages, 8 dependency layers, 63 source dependencies, and 59 displayed arrows. Its build script omits full state presentation; state behavior was inspected in the original implementation.
- [GitHub Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects), [Iterations](https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-iteration-fields), and [Milestones](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/about-milestones): reviewed to distinguish provider mechanisms from the shared Sprint abstraction. No live board synchronization was performed.
