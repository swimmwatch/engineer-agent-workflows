# P04 — One manual synchronization coordinator

## Technical proposal

Implement `startRoadmapSync`, `getRoadmapSyncStatus` and `cancelRoadmapSync` in a new `packages/engineer-agent-workflow-mcp/src/product/graph-sync.ts`. An explicit MCP or HTTP invocation starts one bounded request-owned operation and immediately returns its stable operation identity; subsequent status reads do not read GitHub or launch work. An active per-product lease returns a stable busy result for overlapping callers before another provider read. Different products have independent leases. There is no scheduler, webhook, autonomous retry service or durable work queue.

Acquire a product-scoped graph-run lease before provider reads, using safe exclusive-file ownership and a process-local registry. A dead-owner lease is inspected and explicitly recovered rather than blindly removed. Capture current ready Roadmap identity, graph head and binding/configuration digest. Reject draft/not-ready or mismatched inputs before gh. Provider reads run outside the short product publication lock; P02 publication rechecks all captured identities under that lock. An independent source/binding change prevents a stale commit. One operation owns its AbortController, deadline and child set; MCP termination cancels all owned operations, and viewer stop cancels only operations that viewer initiated.

Reconcile complete task observations against the current snapshot. Apply each task's required fields together; failed observations retain its previous verified values with a stale cause. Build weakly connected components over the union of prior and proposed internal dependency edges, including failed/read-retained vertices; reject a conflicting component's update, retain its last valid data and accept independent valid components. Then derive and validate the whole proposed graph through P01 before one atomic P02 publication. Complete successful membership alone removes absent bound task records and bindings automatically. Dependencies that then point outside current membership become external blocking references, never ghost cards. A failed membership read can still permit independently complete task observations but cannot delete tasks.

Keep logical graph revision separate from operation/attempt timestamps. Publish complete valid state only; unchanged semantic data retain logical revision while actual attempt/read times remain observable. Persist bounded current/last operation summaries, not raw responses or an unbounded progress log. Cancellation/interruption preserves the last committed graph and records whether a publication occurred; a later explicit run rereads current state rather than blindly replaying an uncertain write. No divergence approval, Roadmap review, archival prompt or provider write is added.

Requirement IDs: REQ-003, REQ-007, REQ-018, REQ-023, REQ-024, REQ-025, REQ-026, REQ-027, REQ-028, REQ-029, REQ-034, REQ-036, REQ-038.

Inputs are normalized P03 observations and the exact P02 snapshot/binding revision. Outputs are a bounded operation status and, on publication, the same graph revision read by both surfaces. Errors are safe typed causes with retryability, affected task IDs and retained-data status. P04 depends on P01/P02/P03 and imports neither MCP transport nor browser code.

## Delivery details

### Inputs and eligibility

Packet: **P04**. source_version: `6087eb0c0dfca148e9afc43780651ece85bd5d9660313a049d34071925e8eaa5`; specification_version: `e257fb7b0011d3d9e5e9b0754391b65133e83054bc7327fd2110163f0dab5af8`; review_ref: `fd840f43-b70d-463d-991c-204f891f1b2e`.

Read exactly `REQ-003`, `REQ-007`, `REQ-018`, `REQ-023`, `REQ-024`, `REQ-025`, `REQ-026`, `REQ-027`, `REQ-028`, `REQ-029`, `REQ-034`, `REQ-036`, `REQ-038` through MCP `requirement_get`, using the pinned specification_version as that tool's source_version, following every text/reference continuation. Do not reload the full specification or decisions history. Recheck the aggregate source_version through `specification_check_state`.

Dependencies: [P01](01_graph-kernel.md), [P02](02_graph-store.md), [P03](03_github-reader.md) completed with their required checks and current agreement. Required local tools: usable Git worktree/status including staged/untracked evidence, the existing Node >=22.20.0/npm environment and the matching workflow MCP. No clean tree or existing commit is required. Missing installation/browser authority is not supplied by this plan.

Exact contracts/scenarios to read:

- contracts/mcp.md — Reconciliation and lifecycle; Stable failure causes
- quality/scenarios.yaml — Q-PARTIAL, Q-CONCURRENCY, Q-CLEANUP

### Scoped work and acceptance

Allowed ownership areas, plus this specification's linked `tasks/todo.md` and current-only `tasks/handoff.md`:

- packages/engineer-agent-workflow-mcp/src/product/graph-sync.ts
- shared/schemas/product.schema.json — sync status/problem/operation selectors
- focused sync tests and isolated product/provider fixtures

Preserve unrelated modified files and all source/specification/history evidence. The known planning-entry worktree includes unrelated MCP README/metadata/task/tool/schema/test edits and `.local/`; re-inspect their current content and overlap before editing. An unexplained deletion/loss or unknown overlapping change requires disposition, not baseline replacement.

Acceptance observations:

- MCP/web overlap yields one provider-read operation or a stable busy identity; two products and source/binding changes cannot cross-publish.
- Complete absence deletes current task and binding without archival/approval; incomplete membership preserves them. Native surviving references become external blockers.
- Per-task atomic observations and union-component rejection preserve valid stale data while independent valid components publish; repeated unchanged sync preserves logical revision.
- Interruption/cancellation status names retained/published evidence; a later explicit retry converges without duplicates or background retries.

### Test-first execution and verification

Working directory: repository root. Create/extend the following checks before implementing this packet: `packages/engineer-agent-workflow-mcp/test/product-graph-sync.test.mjs`. These are planned files, not claims that scripts/tests already exist.

Use the exact synthetic workloads, observations and mutations in `Q-PARTIAL`, `Q-CONCURRENCY` from `../quality/scenarios.yaml`. Run RED first; if it only reports a missing import/symbol or invalid harness, repair the harness and require PROVE after GREEN. Implement until every correct check passes; never weaken a correct assertion to obtain green. Perform the named one-behavior PROVE mutations for absence/wiring/late-written assertions, observe each expected failure and restore the implementation before final verification.

Copy-ready local commands (existing build/lint infrastructure; named feature tests are created by this packet):

```bash
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/product-graph-sync.test.mjs
rtk proxy npm run lint --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
```

Review scoped tracked, staged and untracked changes; keep workflow YAML out of direct content diffs/parsers. Run whitespace checks on this packet's actual changed textual artifacts, including untracked files. Tests and evidence must show the real owning operation, not merely mirror declarations.

### Recovery and completion

Cancel/close owned work. Preserve the valid published head; inspect an uncertain/dead-owner lease and recover explicitly rather than deleting it or replaying blindly.

After all required local checks pass and every PROVE mutation is restored, run `specification_check_state` with the pinned aggregate source_version and `planning_packet_check` with the exact agreement_ref/proposal_digest below. Inspect the scoped diff against the agreed units/contracts. A failed/unavailable required check leaves this packet incomplete; report its actual result and concrete next action/owner. Do not run the completion gate while tests remain pending.

Update only this packet's entry in `todo.md` and replace `handoff.md` with current changes, actual RED/GREEN/PROVE evidence, versions, blockers and the next eligible packet. Then stop. Do not execute another packet, invoke code/security review, commit, install, refresh clients or publish automatically. Review and commits are separately authorized optional actions, not next-packet gates.

## Technical agreement

```json
{
  "packet_id": "P04",
  "proposal_id": "P04-sync-coordinator-v1",
  "agreement_ref": {
    "id": "54e2e01d-2f76-42f3-ba38-dc0c4b4212f3",
    "revision": 10
  },
  "proposal_digest": "3fda4563c6f49f0b1433afe4aff2b7161a0df3ac5c8dfe8974d4fb41b24fe302",
  "sources": [
    {
      "path": "docs/specs/product-roadmap-task-graph/tasks/plan.md",
      "heading": "Shared architecture"
    },
    {
      "path": "docs/specs/product-roadmap-task-graph/tasks/04_sync-coordinator.md",
      "heading": "Technical proposal"
    }
  ],
  "planning_packet_check": "ready"
}
```
