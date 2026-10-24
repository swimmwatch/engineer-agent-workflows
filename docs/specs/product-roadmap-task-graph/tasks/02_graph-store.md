# P02 — Graph snapshots and atomic current-state publication

## Technical proposal

Add authoritative `RoadmapGraphSnapshot`, `RoadmapGraphHead`, `RoadmapGraphBinding`, `RoadmapSprintSupplement` and graph operation result definitions to `shared/schemas/product.schema.json` during implementation. Keep opaque external IDs as strings; retain only the normalized metadata required by REQ-033. A snapshot owns graph tasks/relationships, provider/configuration bindings, local Sprint supplements, actual read times and bounded stale/error evidence. Its schema/version and product/ready-source identities are explicit. The head contains the current immutable snapshot digest and previous supported snapshot reference; attempts/progress are separate from logical graph identity.

Implement `readRoadmapGraphState`, `commitRoadmapGraphState` and `restoreRoadmapGraphState` in a new `packages/engineer-agent-workflow-mcp/src/product/graph-store.ts`. Reuse existing `saveObject`/`readObject`, `resolveProductRoot`, `validateProductPath` and schema validation. Store immutable snapshots in the existing product object namespace and one small current pointer at `products/<product-id>/roadmap-graph/head.yaml`. A missing feature head means an unbound legacy product, not a migration request. Never modify ready generations, source pins, task bindings, specifications or historical source objects for ordinary graph reconciliation.

Extract the already existing safe atomic record replacement and product-lock ownership primitives from `product/operations.ts` into callable helpers at that ownership point, retaining current callers and their behavior. `commitRoadmapGraphState` uses a short product write lock, rechecks expected graph digest, ready source and binding identity, saves/validates the complete immutable snapshot, and atomically replaces only the graph head. Keep prior valid state visible until that replacement. Failed/conflicting writes leave the previous head intact; orphan immutable snapshots do not become current. A malformed/incompatible head is diagnosed rather than silently reset. The synchronization coordinator in P04 owns the longer graph-run lease, separately from this short publication lock.

Restoration is an explicit local operation selecting a retained supported snapshot reference for the same product and compatible ready source. Validate all referenced bytes and replace the head atomically under the same guards; never guess a replacement from directory order or delete immutable history. A normal synchronization automatically removes authoritatively absent current graph tasks and their external bindings as REQ-024 requires; this does not call existing Roadmap retirement or archive the task card.

Feature activation is explicit and scoped to the selected product. Existing readers and pre-feature records remain unchanged; new feature records reject unknown/incompatible schema versions. Older feature-incapable clients cannot rewrite this separate namespace through existing generation operations. No global/client configuration or installed copies change.

Requirement IDs: REQ-003, REQ-006, REQ-020, REQ-021, REQ-024, REQ-026, REQ-027, REQ-034, REQ-035, REQ-036.

Repository evidence, relative to `packages/engineer-agent-workflow-mcp/`: `src/product/storage.ts:396` (`saveObject`), `:425` (`readObject`); `src/product/config.ts:94`/`:211` (root/path policy); `src/product/operations.ts:318` (atomic replacement), `:479` (cooperative lock), `:1040` (ready-head publication that graph sync must not invoke). Reverify before execution. Reusing the entire `runProductMutation` would rewrite the ready head; reuse its lower-level safety primitives instead.

## Delivery details

### Inputs and eligibility

Packet: **P02**. source_version: `6087eb0c0dfca148e9afc43780651ece85bd5d9660313a049d34071925e8eaa5`; specification_version: `e257fb7b0011d3d9e5e9b0754391b65133e83054bc7327fd2110163f0dab5af8`; review_ref: `fd840f43-b70d-463d-991c-204f891f1b2e`.

Read exactly `REQ-003`, `REQ-006`, `REQ-020`, `REQ-021`, `REQ-024`, `REQ-026`, `REQ-027`, `REQ-034`, `REQ-035`, `REQ-036` through MCP `requirement_get`, using the pinned specification_version as that tool's source_version, following every text/reference continuation. Do not reload the full specification or decisions history. Recheck the aggregate source_version through `specification_check_state`.

Dependencies: [P01](01_graph-kernel.md) completed with their required checks and current agreement. Required local tools: usable Git worktree/status including staged/untracked evidence, the existing Node >=22.20.0/npm environment and the matching workflow MCP. No clean tree or existing commit is required. Missing installation/browser authority is not supplied by this plan.

Exact contracts/scenarios to read:

- contracts/mcp.md — Authority and identity; Reconciliation and lifecycle
- quality/scenarios.yaml — Q-STORE

### Scoped work and acceptance

Allowed ownership areas, plus this specification's linked `tasks/todo.md` and current-only `tasks/handoff.md`:

- shared/schemas/product.schema.json — graph snapshot/head/binding/supplement/projection selectors only
- packages/engineer-agent-workflow-mcp/src/product/graph-store.ts
- packages/engineer-agent-workflow-mcp/src/product/operations.ts — reuse atomic/lock safety primitives without changing existing semantics
- packages/engineer-agent-workflow-mcp/src/product/storage.ts and config.ts — only required shared safety exports
- focused store tests and isolated fixtures

Preserve unrelated modified files and all source/specification/history evidence. The known planning-entry worktree includes unrelated MCP README/metadata/task/tool/schema/test edits and `.local/`; re-inspect their current content and overlap before editing. An unexplained deletion/loss or unknown overlapping change requires disposition, not baseline replacement.

Acceptance observations:

- A fault at every write boundary exposes only a complete old/new snapshot; stale expected graph/source/binding identity cannot publish.
- Traversal, symlink/hardlink/Unicode collision and wrong-product cases fail at the real safe-path boundary.
- Explicit supported restoration reproduces task identities/relationships; retained workflow sources/specifications and another product are byte-identical.
- Persist only normalized observations/bindings/supplements and sync evidence. Do not persist derived layers/reduction/layout/SVG/HTML; graph reads derive them.

### Test-first execution and verification

Working directory: repository root. Create/extend the following checks before implementing this packet: `packages/engineer-agent-workflow-mcp/test/product-graph-store.test.mjs`. These are planned files, not claims that scripts/tests already exist.

Use the exact synthetic workloads, observations and mutations in `Q-STORE` from `../quality/scenarios.yaml`. Run RED first; if it only reports a missing import/symbol or invalid harness, repair the harness and require PROVE after GREEN. Implement until every correct check passes; never weaken a correct assertion to obtain green. Perform the named one-behavior PROVE mutations for absence/wiring/late-written assertions, observe each expected failure and restore the implementation before final verification.

Copy-ready local commands (existing build/lint infrastructure; named feature tests are created by this packet):

```bash
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/product-graph-store.test.mjs
rtk proxy npm run lint --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
```

Review scoped tracked, staged and untracked changes; keep workflow YAML out of direct content diffs/parsers. Run whitespace checks on this packet's actual changed textual artifacts, including untracked files. Tests and evidence must show the real owning operation, not merely mirror declarations.

### Recovery and completion

Retain current valid head and immutable source/history. Use explicit validated previous-snapshot restoration for published graph data; never erase objects or guess a damaged head replacement.

After all required local checks pass and every PROVE mutation is restored, run `specification_check_state` with the pinned aggregate source_version and `planning_packet_check` with the exact agreement_ref/proposal_digest below. Inspect the scoped diff against the agreed units/contracts. A failed/unavailable required check leaves this packet incomplete; report its actual result and concrete next action/owner. Do not run the completion gate while tests remain pending.

Update only this packet's entry in `todo.md` and replace `handoff.md` with current changes, actual RED/GREEN/PROVE evidence, versions, blockers and the next eligible packet. Then stop. Do not execute another packet, invoke code/security review, commit, install, refresh clients or publish automatically. Review and commits are separately authorized optional actions, not next-packet gates.

## Technical agreement

```json
{
  "packet_id": "P02",
  "proposal_id": "P02-graph-store-v1",
  "agreement_ref": {
    "id": "3eaf2a1f-7c59-4529-bd95-e18337d72844",
    "revision": 2
  },
  "proposal_digest": "b54536641fbc6c6b519e7b77b2bfd34054183b78e7097a0acdd3842bdf529f65",
  "sources": [
    {
      "path": "docs/specs/product-roadmap-task-graph/tasks/plan.md",
      "heading": "Shared architecture"
    },
    {
      "path": "docs/specs/product-roadmap-task-graph/tasks/02_graph-store.md",
      "heading": "Technical proposal"
    }
  ],
  "planning_packet_check": "ready"
}
```
