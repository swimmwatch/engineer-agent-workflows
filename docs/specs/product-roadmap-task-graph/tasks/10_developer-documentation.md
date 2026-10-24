# P10 — Durable operator and developer documentation

## Technical proposal

After P09's required behavior/end-to-end acceptance passes, extend the nearest authoritative guides: `docs/product-workflows.md` owns the product/operator story and `packages/engineer-agent-workflow-mcp/README.md` owns callable operation/configuration details. Reuse those documents instead of creating another architecture/specification copy. Update `docs/index.md` only if its entry point needs refinement. Preserve unrelated existing README and task-pin work.

Document the supported outcome and runtime flow: agent/provider tools create external entities; EAW binds explicit IDs; an explicit sync reads through installed gh; normalized observations are stored safely; the HTTP server dynamically generates SVG/HTML on request; the browser interacts with that view directly. Distinguish persisted source observations from unsaved generated graph markup/layout, and MCP agent data from browser HTTP responses. Explain board status versus Ready/Blocked versus Needs Spec, source-preserving automatic absence deletion, partial stale data, local Sprint supplements, privacy, bounded errors, cancellation and restoration. Never imply that graph readiness authorizes execution.

Use synthetic identities and validated examples. Describe stable entry-point symbols and actual supported behavior rather than duplicating source listings, task history or unstable line numbers. Document intended platform/browser support separately from executed Linux evidence and explain loaded-runtime capability checks. Installation, runtime refresh, configuration changes and publication stay separate explicitly authorized actions, not steps this packet executes.

Durable documentation is warranted: the feature crosses agent/MCP/provider/store/HTTP/browser boundaries; the three independent status signals and board-priority deletion rule are non-obvious; incorrect field-ID mappings and lifecycle assumptions are costly to rediscover. Before editing, define a reader check whose questions cover these claims. After editing, a reader who did not write the feature must answer them from the guides and verify all commands/examples against isolated fixtures. Record the actual result; unresolved reader/example failures leave the packet incomplete.

Requirement IDs: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-009, REQ-010, REQ-012, REQ-013, REQ-014, REQ-018, REQ-020, REQ-021, REQ-023, REQ-024, REQ-025, REQ-028, REQ-029, REQ-030, REQ-031, REQ-033, REQ-034, REQ-035, REQ-038, REQ-040.

Evidence: `docs/product-workflows.md:40` owns storage/configuration and `:513` owns recovery/safety; `:602` owns loaded runtime identity. This is a final documentation packet, not permission to update production docs during planning.

## Delivery details

### Inputs and eligibility

Packet: **P10**. source_version: `6087eb0c0dfca148e9afc43780651ece85bd5d9660313a049d34071925e8eaa5`; specification_version: `e257fb7b0011d3d9e5e9b0754391b65133e83054bc7327fd2110163f0dab5af8`; review_ref: `fd840f43-b70d-463d-991c-204f891f1b2e`.

Read exactly `REQ-001`, `REQ-002`, `REQ-003`, `REQ-004`, `REQ-005`, `REQ-009`, `REQ-010`, `REQ-012`, `REQ-013`, `REQ-014`, `REQ-018`, `REQ-020`, `REQ-021`, `REQ-023`, `REQ-024`, `REQ-025`, `REQ-028`, `REQ-029`, `REQ-030`, `REQ-031`, `REQ-033`, `REQ-034`, `REQ-035`, `REQ-038`, `REQ-040` through MCP `requirement_get`, using the pinned specification_version as that tool's source_version, following every text/reference continuation. Do not reload the full specification or decisions history. Recheck the aggregate source_version through `specification_check_state`.

Dependencies: [P09](09_linux-acceptance.md) completed with their required checks and current agreement. Required local tools: usable Git worktree/status including staged/untracked evidence, the existing Node >=22.20.0/npm environment and the matching workflow MCP. No clean tree or existing commit is required. Missing installation/browser authority is not supplied by this plan.

Exact contracts/scenarios to read:

- quality/scenarios.yaml — Q-DOCUMENTATION
- contracts/mcp.md, contracts/openapi.yaml and architecture/model.dsl — stable implemented boundary references

### Scoped work and acceptance

Allowed ownership areas, plus this specification's linked `tasks/todo.md` and current-only `tasks/handoff.md`:

- docs/product-workflows.md
- packages/engineer-agent-workflow-mcp/README.md — preserve unrelated existing edits
- docs/index.md only for an actually changed entry point
- existing documentation/example checks only when needed

Preserve unrelated modified files and all source/specification/history evidence. The known planning-entry worktree includes unrelated MCP README/metadata/task/tool/schema/test edits and `.local/`; re-inspect their current content and overlap before editing. An unexplained deletion/loss or unknown overlapping change requires disposition, not baseline replacement.

Acceptance observations:

- An available independent reader can explain direct HTTP dynamic rendering, persisted observations, direct gh ownership and the three status signals from the current guides.
- Documented binding/sync/absence/partial/restore/capability examples use synthetic identities and pass against isolated fixtures.
- Guides accurately separate intended compatibility from executed Linux evidence and never imply execution/install/publication permission.
- Documentation reflects P09-verified behavior and links the existing authorities without a competing spec, schema or workflow history copy.

### Test-first execution and verification

Working directory: repository root. Use and extend the existing focused checks below; define the discriminating check/reader questions before changing an artifact.

Use the exact synthetic workloads, observations and mutations in `Q-DOCUMENTATION` from `../quality/scenarios.yaml`. Run RED first; if it only reports a missing import/symbol or invalid harness, repair the harness and require PROVE after GREEN. Implement until every correct check passes; never weaken a correct assertion to obtain green. Perform the named one-behavior PROVE mutations for absence/wiring/late-written assertions, observe each expected failure and restore the implementation before final verification.

Copy-ready local commands (existing build/lint infrastructure; named feature tests are created by this packet):

```bash
rtk proxy node --test tests/product-documentation.test.mjs
```

Verify local links and execute each changed example against isolated fixtures. Q-DOCUMENTATION additionally requires an available reader who did not implement the feature; record their actual answers/results. A style/link pass alone is insufficient. Do not create a new documentation framework merely to test prose.

Review scoped tracked, staged and untracked changes; keep workflow YAML out of direct content diffs/parsers. Run whitespace checks on this packet's actual changed textual artifacts, including untracked files. Tests and evidence must show the real owning operation, not merely mirror declarations.

### Recovery and completion

Preserve existing documents/unrelated edits and fix only this packet's failed reader/example claims; do not document an unimplemented workaround or skip the required reader check.

After all required local checks pass and every PROVE mutation is restored, run `specification_check_state` with the pinned aggregate source_version and `planning_packet_check` with the exact agreement_ref/proposal_digest below. Inspect the scoped diff against the agreed units/contracts. A failed/unavailable required check leaves this packet incomplete; report its actual result and concrete next action/owner. Do not run the completion gate while tests remain pending.

Update only this packet's entry in `todo.md` and replace `handoff.md` with current changes, actual RED/GREEN/PROVE evidence, versions, blockers and the next eligible packet. Then stop. Do not execute another packet, invoke code/security review, commit, install, refresh clients or publish automatically. Review and commits are separately authorized optional actions, not next-packet gates.

## Technical agreement

```json
{
  "packet_id": "P10",
  "proposal_id": "P10-documentation-v1",
  "agreement_ref": {
    "id": "a0537887-401d-4835-9a5e-bc1d03217fcd",
    "revision": 2
  },
  "proposal_digest": "3e703d871e9ac92b075b9d3294c3c3bf62266d7fe8c84f813fe485add76e7ebb",
  "sources": [
    {
      "path": "docs/specs/product-roadmap-task-graph/tasks/plan.md",
      "heading": "Shared architecture"
    },
    {
      "path": "docs/specs/product-roadmap-task-graph/tasks/10_developer-documentation.md",
      "heading": "Technical proposal"
    }
  ],
  "planning_packet_check": "ready"
}
```
