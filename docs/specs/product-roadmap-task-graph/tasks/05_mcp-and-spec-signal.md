# P05 — MCP operations and current specification evidence

## Technical proposal

Extend existing `productTools` registration in `packages/engineer-agent-workflow-mcp/src/product/tools.ts` and runtime capability metadata. Reuse its schema-derived input/output validation and protocol-v2 envelope. Binding operation names are `roadmap_graph_get`, `roadmap_graph_configure`, `roadmap_graph_bind_task`, `roadmap_graph_set_sprint`, `roadmap_graph_sync`, `roadmap_graph_sync_status`, `roadmap_graph_cancel_sync`, `roadmap_graph_restore`, `roadmap_graph_open_viewer` and `roadmap_graph_stop_viewer`. The last two delegate to P06; do not advertise them as usable before that capability exists.

Implement application read/configuration handlers in a new `product/graph-service.ts`: `getRoadmapGraphPage`, `configureRoadmapGraph`, `bindRoadmapGraphTask` and `setRoadmapSprintSupplement`. Configuration/binding writes verify the exact supplied external identities through P03 read evidence before one guarded P02 commit; they never infer by title or import unrelated items. Local Sprint order/start validation writes only the supplement. Synchronization/cancellation/status delegate to P04; restoration delegates to P02. All operations use the selected existing product context and explicit relevant source/graph revision.

For a candidate or pre-feature unbound Roadmap, build a read-only source preview from its existing tasks and semantic relations; make its source kind explicit. A ready graph head, once present, is read as its own current observation set and is never repopulated from retained source tasks after deletion. Only an explicit binding can recreate a graph record for a surviving EAW task identity. A source preview does not fabricate provider state or approved specification evidence and cannot synchronize until a current ready source and valid configuration exist. Read operations perform no provider call, file mutation, migration or approval checkpoint.

Factor the existing specification-only evidence calculation out of `product/tasks.ts` into the binding read helper `readTaskSpecificationStatus`, reused by existing task checks and graph reads. It uses current task/specification binding, confirmed scope, Approved status, resolved decisions and fresh completed completeness-review evidence. Keep plan/packet availability and execution readiness out of Needs Spec. Missing, draft, stale, invalid or unreadable evidence remains unverified; Done suppresses the signal. Preserve existing task execution checks and unrelated in-progress changes.

Graph inventories return typed task/edge/group/configuration items with deterministic source-bound cursors and explicit total/complete/next-cursor fields. Preserve the existing `successResult` limits: at most 24 KiB for the serialized structured payload and 64 KiB for its complete MCP wire representation. Pack pages by measured UTF-8 bytes, including context and worst-case escaping. Large collections and individual oversized records use explicit continuation portions; never silently truncate, raise the shared limits or mix revisions. Cursor scope includes product, selected source, graph snapshot, specification-evidence fingerprint and query/portion identity. A changed dependency source rejects continuation rather than combining pages. Full browser reads reconstruct all pages before replacing displayed state.

These MCP pages contain structured graph data for the agent, never HTML pages or browser assets. The browser talks directly to P06's HTTP server; that server does not proxy `tools/call` and does not inherit MCP payload limits. Both transports reuse domain graph/read/synchronization services, with their own wire envelopes and byte budgets.

Define the public operations and future canonical schema selectors in `../contracts/mcp.md`; implementation adds the selectors to the existing shared product schema. Wire adapters do not duplicate graph policy. No external workflow or provider mutation is invoked by graph inspection.

Requirement IDs: REQ-001, REQ-002, REQ-003, REQ-005, REQ-006, REQ-014, REQ-020, REQ-021, REQ-023, REQ-024, REQ-029, REQ-035, REQ-036, REQ-038, REQ-040.

Repository evidence: `packages/engineer-agent-workflow-mcp/src/product/tools.ts:147` validates schema-derived tool envelopes; `src/product/tasks.ts:583` currently combines specification evidence with plan pins, so reusing the complete task readiness result would misclassify Approved tasks without plans; `src/server.ts:30` aggregates tools. Reverify these boundaries and preserve existing task-pin work before execution.

## Delivery details

### Inputs and eligibility

Packet: **P05**. source_version: `6087eb0c0dfca148e9afc43780651ece85bd5d9660313a049d34071925e8eaa5`; specification_version: `e257fb7b0011d3d9e5e9b0754391b65133e83054bc7327fd2110163f0dab5af8`; review_ref: `fd840f43-b70d-463d-991c-204f891f1b2e`.

Read exactly `REQ-001`, `REQ-002`, `REQ-003`, `REQ-005`, `REQ-006`, `REQ-014`, `REQ-020`, `REQ-021`, `REQ-023`, `REQ-024`, `REQ-029`, `REQ-035`, `REQ-036`, `REQ-038`, `REQ-040` through MCP `requirement_get`, using the pinned specification_version as that tool's source_version, following every text/reference continuation. Do not reload the full specification or decisions history. Recheck the aggregate source_version through `specification_check_state`.

Dependencies: [P02](02_graph-store.md), [P03](03_github-reader.md), [P04](04_sync-coordinator.md) completed with their required checks and current agreement. Required local tools: usable Git worktree/status including staged/untracked evidence, the existing Node >=22.20.0/npm environment and the matching workflow MCP. No clean tree or existing commit is required. Missing installation/browser authority is not supplied by this plan.

Exact contracts/scenarios to read:

- contracts/mcp.md — exact operation and canonical-selector tables, inventory limits and failures
- quality/scenarios.yaml — Q-MCP, Q-SPEC

### Scoped work and acceptance

Allowed ownership areas, plus this specification's linked `tasks/todo.md` and current-only `tasks/handoff.md`:

- packages/engineer-agent-workflow-mcp/src/product/graph-service.ts
- packages/engineer-agent-workflow-mcp/src/product/tools.ts — graph registrations only
- packages/engineer-agent-workflow-mcp/src/product/tasks.ts — shared read-only specification evidence factoring
- packages/engineer-agent-workflow-mcp/src/metadata.ts — graph tool schema/capability metadata
- shared/schemas/product.schema.json — graph Input/Success/page/problem definitions
- focused MCP tests; preserve existing task-pin test changes

Preserve unrelated modified files and all source/specification/history evidence. The known planning-entry worktree includes unrelated MCP README/metadata/task/tool/schema/test edits and `.local/`; re-inspect their current content and overlap before editing. An unexplained deletion/loss or unknown overlapping change requires disposition, not baseline replacement.

Acceptance observations:

- tools/list exposes the implemented graph operations and actual schema validation; deferred viewer operations are usable only after P06 exists.
- Measure <=24576 structured bytes and <=65536 wire bytes including context/escaping; reconstruct full mixed-record and oversized-record portions losslessly from one pinned source.
- Read operations invoke no provider/file mutation. Approved-without-plan suppresses Needs Spec, while missing/draft/stale/unreadable evidence does not.
- Config/bind/supplement writes are atomic and identity-verified; source preview never silently recreates an absent observed task; old records/capability failures remain safe.

### Test-first execution and verification

Working directory: repository root. Create/extend the following checks before implementing this packet: `packages/engineer-agent-workflow-mcp/test/product-graph-mcp.test.mjs`. These are planned files, not claims that scripts/tests already exist.

Use the exact synthetic workloads, observations and mutations in `Q-MCP`, `Q-SPEC` from `../quality/scenarios.yaml`. Run RED first; if it only reports a missing import/symbol or invalid harness, repair the harness and require PROVE after GREEN. Implement until every correct check passes; never weaken a correct assertion to obtain green. Perform the named one-behavior PROVE mutations for absence/wiring/late-written assertions, observe each expected failure and restore the implementation before final verification.

Copy-ready local commands (existing build/lint infrastructure; named feature tests are created by this packet):

```bash
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/product-graph-mcp.test.mjs
rtk proxy npm run lint --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
```

Review scoped tracked, staged and untracked changes; keep workflow YAML out of direct content diffs/parsers. Run whitespace checks on this packet's actual changed textual artifacts, including untracked files. Tests and evidence must show the real owning operation, not merely mirror declarations.

### Recovery and completion

Keep existing task/specification/execution checks unchanged. Revert only this packet's uncompleted adapters/schema registrations; do not repair scope, source history or other writers' task-pin changes.

After all required local checks pass and every PROVE mutation is restored, run `specification_check_state` with the pinned aggregate source_version and `planning_packet_check` with the exact agreement_ref/proposal_digest below. Inspect the scoped diff against the agreed units/contracts. A failed/unavailable required check leaves this packet incomplete; report its actual result and concrete next action/owner. Do not run the completion gate while tests remain pending.

Update only this packet's entry in `todo.md` and replace `handoff.md` with current changes, actual RED/GREEN/PROVE evidence, versions, blockers and the next eligible packet. Then stop. Do not execute another packet, invoke code/security review, commit, install, refresh clients or publish automatically. Review and commits are separately authorized optional actions, not next-packet gates.

## Technical agreement

```json
{
  "packet_id": "P05",
  "proposal_id": "P05-mcp-signal-v3",
  "agreement_ref": {
    "id": "54e2e01d-2f76-42f3-ba38-dc0c4b4212f3",
    "revision": 12
  },
  "proposal_digest": "d2e5d37d0b4b74710453980d2ba60d7cbd449a62ead6728c3ce11bf19c0d8974",
  "sources": [
    {
      "path": "docs/specs/product-roadmap-task-graph/tasks/plan.md",
      "heading": "Shared architecture"
    },
    {
      "path": "docs/specs/product-roadmap-task-graph/tasks/05_mcp-and-spec-signal.md",
      "heading": "Technical proposal"
    }
  ],
  "planning_packet_check": "ready"
}
```
