# P01 — Deterministic graph policy kernel

## Technical proposal

Implement provider-neutral pure TypeScript functions in a new `packages/engineer-agent-workflow-mcp/src/product/graph.ts`, with no I/O or new dependency. Binding entry points are `validateRoadmapGraph(input)` and `deriveRoadmapGraph(input)`. Inputs contain stable task/Stage/Sprint IDs, complete prerequisite references, explicit status mappings, local Sprint supplements and independently supplied specification evidence. Outputs are validation issues or a deterministic projection containing complete and active edges, reduced display edges, layers, primary state, dependency readiness, Needs Spec and blocking reasons.

Validate the full internal graph before projection, including Backlog relationships. Diagnose self-links, duplicates, missing internal endpoints and cyclic weakly connected components; preserve external prerequisites as explicit boundary references. Kahn topological ordering uses stable internal-ID tie breaking. Remove Backlog vertices and incident edges only for the active projection; compute longest-predecessor layers in topological order. Compute reachability using bounded typed-array bitsets in reverse topological order, then omit only redundant display edges. Preserve every source edge and full direct prerequisite list. State/tag/Sprint validation follows REQ-009 through REQ-014 without title heuristics or invented dependencies.

Use canonical ID-based ordering independent of provider page order, locale and renamed display text. Derive the logical graph digest from semantic graph/configuration/local-supplement fields, excluding attempt timestamps and transient operation progress; expose freshness separately. Enforce the initial supported maximum of 1000 tasks and 10000 source prerequisite references, including external references, and the existing 16 MiB serialized-state limit. Never truncate a successful projection. Browser consumers receive the same projection rather than reimplementing readiness or reduction.

The kernel reports component issues; P04 reconciliation decides which component updates can be accepted. It never writes data, contacts a provider or evaluates execution permission. A caller supplies current specification evidence through the existing workflow-check ownership addressed in P05.

Requirement IDs: REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011, REQ-012, REQ-013, REQ-014, REQ-036, REQ-037.

Repository evidence: `src/product/roadmap.ts:1154` already rejects duplicate/self/cyclic task links; `src/product/storage.ts:18` establishes the 16 MiB source limit. Paths in evidence are relative to `packages/engineer-agent-workflow-mcp/`; reverify them before execution.

## Delivery details

### Inputs and eligibility

Packet: **P01**. source_version: `6087eb0c0dfca148e9afc43780651ece85bd5d9660313a049d34071925e8eaa5`; specification_version: `e257fb7b0011d3d9e5e9b0754391b65133e83054bc7327fd2110163f0dab5af8`; review_ref: `fd840f43-b70d-463d-991c-204f891f1b2e`.

Read exactly `REQ-006`, `REQ-007`, `REQ-008`, `REQ-009`, `REQ-010`, `REQ-011`, `REQ-012`, `REQ-013`, `REQ-014`, `REQ-036`, `REQ-037` through MCP `requirement_get`, using the pinned specification_version as that tool's source_version, following every text/reference continuation. Do not reload the full specification or decisions history. Recheck the aggregate source_version through `specification_check_state`.

Dependencies: none; this is the first eligible packet after explicit implementation authorization. Required local tools: usable Git worktree/status including staged/untracked evidence, the existing Node >=22.20.0/npm environment and the matching workflow MCP. No clean tree or existing commit is required. Missing installation/browser authority is not supplied by this plan.

Exact contracts/scenarios to read:

- contracts/mcp.md — Authority and identity; Inventory and wire limits (core semantics only)
- quality/scenarios.yaml — Q-GRAPH

### Scoped work and acceptance

Allowed ownership areas, plus this specification's linked `tasks/todo.md` and current-only `tasks/handoff.md`:

- packages/engineer-agent-workflow-mcp/src/product/graph.ts
- packages/engineer-agent-workflow-mcp/test/product-graph.test.mjs
- bounded synthetic graph fixtures under packages/engineer-agent-workflow-mcp/test-support/

Preserve unrelated modified files and all source/specification/history evidence. The known planning-entry worktree includes unrelated MCP README/metadata/task/tool/schema/test edits and `.local/`; re-inspect their current content and overlap before editing. An unexplained deletion/loss or unknown overlapping change requires disposition, not baseline replacement.

Acceptance observations:

- Diamond plus redundant edge: three source edges/two display edges and equal reachability; longest-path branch produces the exact expected layer.
- Backlog round trip preserves source edges; unknown external prerequisite blocks; explicit statuses/tags/Sprints never create implicit dependencies.
- Input permutations and renamed text retain stable ordering; opaque oversized numeric-looking IDs round-trip as strings; over-limit input fails without truncation.

### Test-first execution and verification

Working directory: repository root. Create/extend the following checks before implementing this packet: `packages/engineer-agent-workflow-mcp/test/product-graph.test.mjs`. These are planned files, not claims that scripts/tests already exist.

Use the exact synthetic workloads, observations and mutations in `Q-GRAPH` from `../quality/scenarios.yaml`. Run RED first; if it only reports a missing import/symbol or invalid harness, repair the harness and require PROVE after GREEN. Implement until every correct check passes; never weaken a correct assertion to obtain green. Perform the named one-behavior PROVE mutations for absence/wiring/late-written assertions, observe each expected failure and restore the implementation before final verification.

Copy-ready local commands (existing build/lint infrastructure; named feature tests are created by this packet):

```bash
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/product-graph.test.mjs
rtk proxy npm run lint --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
```

Review scoped tracked, staged and untracked changes; keep workflow YAML out of direct content diffs/parsers. Run whitespace checks on this packet's actual changed textual artifacts, including untracked files. Tests and evidence must show the real owning operation, not merely mirror declarations.

### Recovery and completion

Restore only this packet's changed kernel/tests if its checks fail; no store or workflow state has been migrated.

After all required local checks pass and every PROVE mutation is restored, run `specification_check_state` with the pinned aggregate source_version and `planning_packet_check` with the exact agreement_ref/proposal_digest below. Inspect the scoped diff against the agreed units/contracts. A failed/unavailable required check leaves this packet incomplete; report its actual result and concrete next action/owner. Do not run the completion gate while tests remain pending.

Update only this packet's entry in `todo.md` and replace `handoff.md` with current changes, actual RED/GREEN/PROVE evidence, versions, blockers and the next eligible packet. Then stop. Do not execute another packet, invoke code/security review, commit, install, refresh clients or publish automatically. Review and commits are separately authorized optional actions, not next-packet gates.

## Technical agreement

```json
{
  "packet_id": "P01",
  "proposal_id": "P01-graph-kernel-v1",
  "agreement_ref": {
    "id": "3eaf2a1f-7c59-4529-bd95-e18337d72844",
    "revision": 2
  },
  "proposal_digest": "3df5069a89813cae1eaa37db40dd97d8517e5b3e76ba02ce0871f803f6b7a09f",
  "sources": [
    {
      "path": "docs/specs/product-roadmap-task-graph/tasks/plan.md",
      "heading": "Shared architecture"
    },
    {
      "path": "docs/specs/product-roadmap-task-graph/tasks/01_graph-kernel.md",
      "heading": "Technical proposal"
    }
  ],
  "planning_packet_check": "ready"
}
```
