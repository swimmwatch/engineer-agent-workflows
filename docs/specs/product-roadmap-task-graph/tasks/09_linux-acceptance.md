# P09 — Linux cross-surface acceptance and capacity evidence

## Technical proposal

Extend the existing Node test/test-support infrastructure with synthetic product-store and fake-provider fixtures, and use an already available Linux browser automation capability for actual HTTP/viewer interactions. No live KAP workflow, live board mutation, credentials, global installation or new production runner is needed. Normalized fixtures preserve opaque IDs, both dependency representations and exact source/graph/specification identities. Use the actual built MCP stdio server and actual local HTTP server, not mocks of their public boundary.

Own the end-to-end and capacity scenarios in `../quality/scenarios.yaml`. Exercise normal, invalid, repeated, interrupted-publication, denied-origin/session, partial, overlapping-sync, cancelled and recovery paths. Compare resulting MCP data and server-generated SVG/list counts/revisions/states. Capture provider invocation types/counts, source-pin/history before/after digests, task/binding absence, listener/child cleanup and redacted diagnostics through safe observation surfaces. Use direct-gh test executables, not an additional runtime wrapper. Do not mutate production/provider state to obtain acceptance evidence.

For the documented Linux machine/browser/runtime versions, exercise the synthetic 40-task/8-layer reference and the 1000-task/10000-source-edge boundary. Measure server derivation/rendering separately from remote provider latency; initial local presentation is <=5 seconds after data availability, and p95 of 20 representative search/filter interactions is <=250 ms. Over-limit cases preserve prior valid observations and fail visibly. Keyboard-only, 1024x768, 200% zoom, measured contrast and inert-injection/network-blocked interaction checks remain separate observations, not a screenshot-only claim.

Run required Linux Chromium-family and Firefox checks using existing authorized capabilities. Record which exact browser versions actually ran; other target browsers/platforms retain intended compatibility and static/platform-policy evidence only. Linux WebKit, if used, is supplemental and never native Safari proof. Missing required Linux execution capability leaves this packet incomplete without changing support requirements or installing tools automatically.

Run affected unit/integration checks first and repository-proportional final build/lint/test/generation validation after they pass. Apply RED/GREEN/PROVE at the narrowest owning boundary, including absence assertions and source-preservation checks. An environmental failure is not a pass. Preserve failed evidence and name the actual next action/owner; do not weaken a check to finish. A separate optional code/security review, commit or publication is not an acceptance gate.

Requirement IDs: REQ-001 through REQ-040, with individual ownership/check mappings in the plan and scenario IDs, not one undifferentiated pass.

Evidence: the MCP package already uses Node tests and root `scripts/run-tests.mjs`; root/package manifests expose build/lint/test and generation checks. Current planning host reports Node `v24.20.0` and gh `2.92.0`; these observations are not runtime feature acceptance. Reverify actual tool/browser versions at execution.

## Delivery details

### Inputs and eligibility

Packet: **P09**. source_version: `6087eb0c0dfca148e9afc43780651ece85bd5d9660313a049d34071925e8eaa5`; specification_version: `e257fb7b0011d3d9e5e9b0754391b65133e83054bc7327fd2110163f0dab5af8`; review_ref: `fd840f43-b70d-463d-991c-204f891f1b2e`.

Read exactly `REQ-001`, `REQ-002`, `REQ-003`, `REQ-004`, `REQ-005`, `REQ-006`, `REQ-007`, `REQ-008`, `REQ-009`, `REQ-010`, `REQ-011`, `REQ-012`, `REQ-013`, `REQ-014`, `REQ-015`, `REQ-016`, `REQ-017`, `REQ-018`, `REQ-019`, `REQ-020`, `REQ-021`, `REQ-022`, `REQ-023`, `REQ-024`, `REQ-025`, `REQ-026`, `REQ-027`, `REQ-028`, `REQ-029`, `REQ-030`, `REQ-031`, `REQ-032`, `REQ-033`, `REQ-034`, `REQ-035`, `REQ-036`, `REQ-037`, `REQ-038`, `REQ-039`, `REQ-040` through MCP `requirement_get`, using the pinned specification_version as that tool's source_version, following every text/reference continuation. Do not reload the full specification or decisions history. Recheck the aggregate source_version through `specification_check_state`.

Dependencies: [P01](01_graph-kernel.md), [P02](02_graph-store.md), [P03](03_github-reader.md), [P04](04_sync-coordinator.md), [P05](05_mcp-and-spec-signal.md), [P06](06_http-viewer.md), [P07](07_browser-viewer.md), [P08](08_workflow-packaging.md) completed with their required checks and current agreement. Required local tools: usable Git worktree/status including staged/untracked evidence, the existing Node >=22.20.0/npm environment and the matching workflow MCP. No clean tree or existing commit is required. Missing installation/browser authority is not supplied by this plan.

Exact contracts/scenarios to read:

- quality/scenarios.yaml — all scenarios, especially Q-E2E/Q-CAPACITY
- contracts/mcp.md and contracts/openapi.yaml — public boundary comparison
- architecture/model.dsl — runtime flow and authority

### Scoped work and acceptance

Allowed ownership areas, plus this specification's linked `tasks/todo.md` and current-only `tasks/handoff.md`:

- packages/engineer-agent-workflow-mcp/test/product-graph-acceptance.test.mjs
- bounded synthetic acceptance fixtures and existing test-support extensions
- docs/evidence/product-roadmap-task-graph/ — future redacted Linux acceptance records/screenshots only

Preserve unrelated modified files and all source/specification/history evidence. The known planning-entry worktree includes unrelated MCP README/metadata/task/tool/schema/test edits and `.local/`; re-inspect their current content and overlap before editing. An unexplained deletion/loss or unknown overlapping change requires disposition, not baseline replacement.

Acceptance observations:

- Actual MCP/HTTP/browser journeys agree on identities, revisions, counts/states and deletion/error recovery, without hidden workflow or outbound provider writes.
- The 1000-task/10000-edge fixture displays completely within five seconds after data is available; p95 of 20 representative search/filter updates is <=250 ms.
- Cancellation/ordinary shutdown cleanup <=5 seconds; per-read/run deadlines <=30/120 seconds; retained source data and negative privacy/access assertions pass.
- Required actual Linux Chromium-family and Firefox checks pass with exact versions recorded; static review/WebKit is not claimed as native Safari/macOS/Windows proof.
- All required affected and repository-proportional checks pass and all PROVE mutations are restored; missing required browser capability leaves P09 incomplete.

### Test-first execution and verification

Working directory: repository root. Create/extend the following checks before implementing this packet: `packages/engineer-agent-workflow-mcp/test/product-graph-acceptance.test.mjs`. These are planned files, not claims that scripts/tests already exist.

Use the exact synthetic workloads, observations and mutations in `Q-E2E`, `Q-CAPACITY`, `Q-INTERACTION`, `Q-PACKAGING` from `../quality/scenarios.yaml`. Run RED first; if it only reports a missing import/symbol or invalid harness, repair the harness and require PROVE after GREEN. Implement until every correct check passes; never weaken a correct assertion to obtain green. Perform the named one-behavior PROVE mutations for absence/wiring/late-written assertions, observe each expected failure and restore the implementation before final verification.

Copy-ready local commands (existing build/lint infrastructure; named feature tests are created by this packet):

```bash
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/product-graph-acceptance.test.mjs
rtk proxy npm run lint --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
```

After focused tests pass, run `rtk proxy npm run build`, `rtk proxy npm run lint`, `rtk proxy npm test`, `rtk proxy npm run generate:check` and `rtk proxy npm run validate`. For each required Linux browser, start the isolated HTTP/MCP fixture through the test harness, open its returned URL with an available authorized browser tool, and execute Q-INTERACTION/Q-CAPACITY/Q-E2E actions. Record actual versions, source/evidence revisions, complete counts, timing samples, contrast calculations and screenshots. No new package/script is assumed to be installed.

**MANUAL GATE — capability only:** if required Linux Firefox/Chromium execution is unavailable, preserve evidence and leave P09 incomplete until an authorized capability is supplied. No macOS/Windows/native Safari run is required by this plan.

Review scoped tracked, staged and untracked changes; keep workflow YAML out of direct content diffs/parsers. Run whitespace checks on this packet's actual changed textual artifacts, including untracked files. Tests and evidence must show the real owning operation, not merely mirror declarations.

### Recovery and completion

Stop isolated fixture processes and retain redacted failed evidence. Fix the owning implementation packet under renewed applicable agreement if needed; never weaken assertions, alter support or touch a real board to obtain green.

After all required local checks pass and every PROVE mutation is restored, run `specification_check_state` with the pinned aggregate source_version and `planning_packet_check` with the exact agreement_ref/proposal_digest below. Inspect the scoped diff against the agreed units/contracts. A failed/unavailable required check leaves this packet incomplete; report its actual result and concrete next action/owner. Do not run the completion gate while tests remain pending.

Update only this packet's entry in `todo.md` and replace `handoff.md` with current changes, actual RED/GREEN/PROVE evidence, versions, blockers and the next eligible packet. Then stop. Do not execute another packet, invoke code/security review, commit, install, refresh clients or publish automatically. Review and commits are separately authorized optional actions, not next-packet gates.

## Technical agreement

```json
{
  "packet_id": "P09",
  "proposal_id": "P09-linux-acceptance-v1",
  "agreement_ref": {
    "id": "a0537887-401d-4835-9a5e-bc1d03217fcd",
    "revision": 2
  },
  "proposal_digest": "4f45d87303dbb287ae656355f0020c0a58afe2700e75709e4c02265954e4596f",
  "sources": [
    {
      "path": "docs/specs/product-roadmap-task-graph/tasks/plan.md",
      "heading": "Shared architecture"
    },
    {
      "path": "docs/specs/product-roadmap-task-graph/tasks/09_linux-acceptance.md",
      "heading": "Technical proposal"
    }
  ],
  "planning_packet_check": "ready"
}
```
