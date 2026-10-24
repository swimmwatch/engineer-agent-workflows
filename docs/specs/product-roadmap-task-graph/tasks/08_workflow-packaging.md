# P08 — Workflow guidance and host-specific delivery

## Technical proposal

Extend the existing authoritative `shared/references/product-workflow.md` with the bounded graph workflow: candidate preview, explicit provider-created IDs, ready-only manual synchronization, direct HTTP viewer opening, and the distinct board-state/dependency/specification signals. Retain existing stage ownership, review/retirement rules and explicit-only invocation. Do not make graph inspection or synchronization a new approval/review/implementation gate. Keep optional graph detail in the shared reference rather than expanding SKILL.md beyond its size budget or adding another skill.

Reuse the current strict generation and packaging path. Regenerate both Codex and Claude Code bundles from authoritative templates/shared sources, including matching self-contained shared-reference copies and verifiers. Preserve host-only manifests, question/instruction names, Codex sidecars, discovery/size limits and disabled implicit invocation. Package P07's fixed browser assets in the existing MCP npm artifact and include the new operations in the generated tool contract/runtime capability inventory. No user configuration, installed cache, consuming project or loaded MCP process is changed by this packet.

Implement discriminating collection/packaging checks before modifying guidance or generation. Existing generation scripts remain the lifecycle mechanism; no custom installer or CLI is added. An old bundle/runtime lacking graph capability reports the required matching capability without an automatic update. Validate packaged-asset completeness using an isolated pack/build result and prove that removing a required asset is detected. Keep generated files generated; never patch one host's copy independently.

Requirement IDs: REQ-001, REQ-002, REQ-003, REQ-005, REQ-020, REQ-029, REQ-030, REQ-032, REQ-035, REQ-039, REQ-040.

Evidence: `scripts/lib/distribution.mjs:120` selects shared assets; `:247` collects/validates authoritative source; `shared/references/product-workflow.md:8` defines stage/source ownership. Existing checks are `tests/product-authoring-skills.test.mjs`, `tests/product-task-integration.test.mjs` and `tests/packaging.test.mjs`; root `package.json` exposes `generate`, `generate:check` and `validate`. Reverify before execution.

## Delivery details

### Inputs and eligibility

Packet: **P08**. source_version: `6087eb0c0dfca148e9afc43780651ece85bd5d9660313a049d34071925e8eaa5`; specification_version: `e257fb7b0011d3d9e5e9b0754391b65133e83054bc7327fd2110163f0dab5af8`; review_ref: `fd840f43-b70d-463d-991c-204f891f1b2e`.

Read exactly `REQ-001`, `REQ-002`, `REQ-003`, `REQ-005`, `REQ-020`, `REQ-029`, `REQ-030`, `REQ-032`, `REQ-035`, `REQ-039`, `REQ-040` through MCP `requirement_get`, using the pinned specification_version as that tool's source_version, following every text/reference continuation. Do not reload the full specification or decisions history. Recheck the aggregate source_version through `specification_check_state`.

Dependencies: [P05](05_mcp-and-spec-signal.md), [P06](06_http-viewer.md), [P07](07_browser-viewer.md) completed with their required checks and current agreement. Required local tools: usable Git worktree/status including staged/untracked evidence, the existing Node >=22.20.0/npm environment and the matching workflow MCP. No clean tree or existing commit is required. Missing installation/browser authority is not supplied by this plan.

Exact contracts/scenarios to read:

- contracts/mcp.md — public operations/capability and authority boundaries
- architecture/model.dsl — process/store/provider/browser boundaries
- quality/scenarios.yaml — Q-PACKAGING

### Scoped work and acceptance

Allowed ownership areas, plus this specification's linked `tasks/todo.md` and current-only `tasks/handoff.md`:

- shared/references/product-workflow.md — bounded graph protocol only
- shared/scripts/verify-product-workflow.mjs and scripts/lib/distribution.mjs only if matching resource identity/copy metadata requires it
- authoritative product-roadmap template only if its conditional routing actually needs a minimal change within byte limits
- both generated plugins/codex/engineer-agent-workflows and plugins/claude-code/engineer-agent-workflows bundles
- focused existing collection/packaging tests and MCP pack-contents tests

Preserve unrelated modified files and all source/specification/history evidence. The known planning-entry worktree includes unrelated MCP README/metadata/task/tool/schema/test edits and `.local/`; re-inspect their current content and overlap before editing. An unexplained deletion/loss or unknown overlapping change requires disposition, not baseline replacement.

Acceptance observations:

- Both generated host bundles match their authoritative sources and remain explicit-only, size-bounded and host-isolated.
- An isolated MCP pack contains all required browser assets and graph/tool schemas; dropping one required asset makes its check fail.
- Old unbound data remain readable; missing/mixed capabilities reject affected operations without loss or automatic installation.
- No new workflow, installer, global/client configuration mutation or private reference dependency is introduced.

### Test-first execution and verification

Working directory: repository root. Use and extend the existing focused checks below; define the discriminating check/reader questions before changing an artifact.

Use the exact synthetic workloads, observations and mutations in `Q-PACKAGING` from `../quality/scenarios.yaml`. Run RED first; if it only reports a missing import/symbol or invalid harness, repair the harness and require PROVE after GREEN. Implement until every correct check passes; never weaken a correct assertion to obtain green. Perform the named one-behavior PROVE mutations for absence/wiring/late-written assertions, observe each expected failure and restore the implementation before final verification.

Copy-ready local commands (existing build/lint infrastructure; named feature tests are created by this packet):

```bash
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy npm run lint --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
```

Also run `rtk proxy node --test tests/product-authoring-skills.test.mjs tests/product-task-integration.test.mjs tests/packaging.test.mjs`, `rtk proxy npm run generate`, `rtk proxy npm run generate:check` and `rtk proxy npm run validate`. Inspect isolated pack contents without installing it. These are required scoped checks, not authority to update global clients.

Review scoped tracked, staged and untracked changes; keep workflow YAML out of direct content diffs/parsers. Run whitespace checks on this packet's actual changed textual artifacts, including untracked files. Tests and evidence must show the real owning operation, not merely mirror declarations.

### Recovery and completion

Regenerate the affected artifacts from the last supported authoritative source if needed, preserving unrelated work. Nothing is installed, enabled or published by this packet.

After all required local checks pass and every PROVE mutation is restored, run `specification_check_state` with the pinned aggregate source_version and `planning_packet_check` with the exact agreement_ref/proposal_digest below. Inspect the scoped diff against the agreed units/contracts. A failed/unavailable required check leaves this packet incomplete; report its actual result and concrete next action/owner. Do not run the completion gate while tests remain pending.

Update only this packet's entry in `todo.md` and replace `handoff.md` with current changes, actual RED/GREEN/PROVE evidence, versions, blockers and the next eligible packet. Then stop. Do not execute another packet, invoke code/security review, commit, install, refresh clients or publish automatically. Review and commits are separately authorized optional actions, not next-packet gates.

## Technical agreement

```json
{
  "packet_id": "P08",
  "proposal_id": "P08-workflow-packaging-v1",
  "agreement_ref": {
    "id": "a0537887-401d-4835-9a5e-bc1d03217fcd",
    "revision": 2
  },
  "proposal_digest": "f4dad26c564601355ea3c3ab460a4eec3b42a05b9a82a6b6c168ea4e2e3d0d8f",
  "sources": [
    {
      "path": "docs/specs/product-roadmap-task-graph/tasks/plan.md",
      "heading": "Shared architecture"
    },
    {
      "path": "docs/specs/product-roadmap-task-graph/tasks/08_workflow-packaging.md",
      "heading": "Technical proposal"
    }
  ],
  "planning_packet_check": "ready"
}
```
