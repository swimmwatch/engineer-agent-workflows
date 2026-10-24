# P07 — Packaged SVG graph and equivalent task list

## Technical proposal

Build dynamic server rendering and a small framework-free browser client under `packages/engineer-agent-workflow-mcp/src/product/viewer/`. Binding units are `render.ts` with pure `renderRoadmapView` (current projection to escaped SVG, equivalent HTML list and safe view metadata), `viewer.mjs` (HTTP/action/DOM lifecycle), `view-state.mjs` (pure filtering/selection/navigation state) and `viewer.css`. HTTP calls the renderer for each current view; no generated SVG/HTML/layout is persisted. Native ES modules enhance that server-generated view. No React, layout library, CDN, bundler or new runtime dependency is required. Add an allowlisted asset-copy step to the existing MCP build and an explicit browser-module ESLint configuration. Node tests can import the pure view-state module without a DOM.

The server renders the active projection as a complete top-to-bottom SVG and a per-layer semantic HTML task list; place Backlog separately. Render all tasks/reduced arrows through the supported 1000-task/10000-source-edge capacity, without copying static-export density splitting. Server-generated geometry is deterministic from stable layer/task ordering and remains unchanged by browser filtering. Use actual SVG viewBox/transform pan and zoom, bounding-box fit-results and whole-graph controls. The browser does not build the graph layout or recalculate domain readiness, layers, reduction or Needs Spec.

Preserve the eight reference layer hues in order: `#5B8FD1`, `#4FA27A`, `#C99335`, `#9273B8`, `#3D9FA2`, `#C8786A`, `#7289B5`, `#86A45C`, using readable light fills and distinct state accents. Cycle those layer hues for additional layers. Preserve the exact state accents in REQ-015, heavy primary borders/footer bands and the independent dashed violet Needs Spec treatment. Blocked uses a neutral labeled reason; no critical-path claim is added. Contrast-compliant text colors take priority over copying failing foregrounds. Consistently sized cards expose full title/prerequisite text through the list/details, not silent clipping.

The pure view-state module owns case-insensitive ID/Issue/title search, multi-value OR within facets and AND between facets/search, selected task, direct/full-chain prerequisite/dependent inspection, expanded layers and viewport. Relationship traversal uses complete semantic edges, including visually reduced ones, while drawing only active reduced arrows. Classify matching/context/muted tasks identically in SVG and list. Clear-search, reset-all, fit-results and whole-graph retain their distinct REQ-016 effects. No task editing or graph writes are offered.

Fetch the dynamically rendered complete replacement from P06 HTTP after synchronization and only then swap the graph/list revision. Its non-executable view metadata supplies the same complete semantic relationships and facet values for local interactions. Preserve applicable filters, unavailable selected facet values, selection, expansions and viewport across successful/partial sync; clear and announce a removed selected task. An explicit sync click starts P04 through HTTP; status polling observes only that explicitly started operation and stops at a terminal result. It cannot initiate a later board run. Render distinct loading/empty/no-match/in-progress/success/partial/stale/permission/configuration outcomes and actual attempt/success times. Local interactions use the current server-delivered DOM/data and packaged assets without contacting GitHub.

Escape all external strings and attribute values at the server renderer boundary; encode embedded view metadata as inert text, never executable script or provider markup. The client replaces only the expected graph/list roots from the trusted same-origin renderer and uses safe text APIs for client messages. Provide semantic control labels, visible focus, keyboard task/list access, live result announcements and safe issue links. At 1024x768 and 200% browser zoom, controls and complete information remain reachable by layout/scrolling. UI state is tab-local memory, with no persisted session secret or remote asset dependency. Selection/facet/viewport logic stays independent of HTTP and DOM lifecycle.

The non-sensitive reference-shape fixture has 40 tasks, three product Stages, eight layers, 63 complete dependencies and 59 reduced arrows; use synthetic identities/content, not private board data. The acceptance fixture also separates Sprints from layers and exercises every state/signal combination. The palette is recorded above so neither implementation nor runtime needs the original personal reference checkout. No Penpot/design artifact is required.

Requirement IDs: REQ-002, REQ-006, REQ-008, REQ-009, REQ-010, REQ-011, REQ-012, REQ-013, REQ-014, REQ-015, REQ-016, REQ-017, REQ-018, REQ-019, REQ-023, REQ-024, REQ-032, REQ-036, REQ-037, REQ-038, REQ-040.

Evidence: `docs/ideas/product-roadmap-task-graph.md:70` records the reference shape; the reference builder's eight hue constants were checked read-only on 2026-10-24. Existing `packages/engineer-agent-workflow-mcp/tsconfig.json:1` compiles server TS only, and `scripts/build-schemas.mjs:1` owns packaged schema/contract copying; the new asset-copy step must preserve those outputs. No original reference workflow or board operation was run.

## Delivery details

### Inputs and eligibility

Packet: **P07**. source_version: `6087eb0c0dfca148e9afc43780651ece85bd5d9660313a049d34071925e8eaa5`; specification_version: `e257fb7b0011d3d9e5e9b0754391b65133e83054bc7327fd2110163f0dab5af8`; review_ref: `fd840f43-b70d-463d-991c-204f891f1b2e`.

Read exactly `REQ-002`, `REQ-006`, `REQ-008`, `REQ-009`, `REQ-010`, `REQ-011`, `REQ-012`, `REQ-013`, `REQ-014`, `REQ-015`, `REQ-016`, `REQ-017`, `REQ-018`, `REQ-019`, `REQ-023`, `REQ-024`, `REQ-032`, `REQ-036`, `REQ-037`, `REQ-038`, `REQ-040` through MCP `requirement_get`, using the pinned specification_version as that tool's source_version, following every text/reference continuation. Do not reload the full specification or decisions history. Recheck the aggregate source_version through `specification_check_state`.

Dependencies: [P01](01_graph-kernel.md), [P05](05_mcp-and-spec-signal.md), [P06](06_http-viewer.md) completed with their required checks and current agreement. Required local tools: usable Git worktree/status including staged/untracked evidence, the existing Node >=22.20.0/npm environment and the matching workflow MCP. No clean tree or existing commit is required. Missing installation/browser authority is not supplied by this plan.

Exact contracts/scenarios to read:

- contracts/openapi.yaml — viewerGet/viewGet and direct HTTP state refresh
- contracts/mcp.md — derived identity and independent signal definitions
- quality/scenarios.yaml — Q-RENDER, Q-INTERACTION, Q-CAPACITY

### Scoped work and acceptance

Allowed ownership areas, plus this specification's linked `tasks/todo.md` and current-only `tasks/handoff.md`:

- packages/engineer-agent-workflow-mcp/src/product/viewer/render.ts, viewer.mjs, view-state.mjs and viewer.css
- graph-http.ts — production renderer wiring only
- packages/engineer-agent-workflow-mcp/scripts/build-viewer.mjs and package.json — fixed local asset-copy build step
- packages/engineer-agent-workflow-mcp/eslint.config.mjs — browser module lint scope
- focused render/view-state/browser fixtures

Preserve unrelated modified files and all source/specification/history evidence. The known planning-entry worktree includes unrelated MCP README/metadata/task/tool/schema/test edits and `.local/`; re-inspect their current content and overlap before editing. An unexplained deletion/loss or unknown overlapping change requires disposition, not baseline replacement.

Acceptance observations:

- HTTP produces current escaped SVG and equivalent semantic list dynamically; all 40/8/63/59 synthetic fixture counts match. No graph markup/layout file is saved.
- The exact eight layer hues and state accents remain distinct; cards, full prerequisites, independent Needs Spec and neutral Blocked are legible and contrast-compliant.
- OR/AND facets, zero results, relationship direction/chain, clear/reset/fit/whole-graph effects and graph/list classifications agree.
- After successful/partial refresh preserve applicable selection/facets/expansions/pan/real zoom/focus; deletion removes both the selected card and relationship state.
- Keyboard-only, 1024x768, 200% zoom and blocked remote-network journeys pass; untrusted strings create no executable/resource nodes.

### Test-first execution and verification

Working directory: repository root. Create/extend the following checks before implementing this packet: `packages/engineer-agent-workflow-mcp/test/product-graph-render.test.mjs`, `packages/engineer-agent-workflow-mcp/test/product-graph-view-state.test.mjs`. These are planned files, not claims that scripts/tests already exist.

Use the exact synthetic workloads, observations and mutations in `Q-RENDER`, `Q-INTERACTION` from `../quality/scenarios.yaml`. Run RED first; if it only reports a missing import/symbol or invalid harness, repair the harness and require PROVE after GREEN. Implement until every correct check passes; never weaken a correct assertion to obtain green. Perform the named one-behavior PROVE mutations for absence/wiring/late-written assertions, observe each expected failure and restore the implementation before final verification.

Copy-ready local commands (existing build/lint infrastructure; named feature tests are created by this packet):

```bash
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/product-graph-render.test.mjs
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/product-graph-view-state.test.mjs
rtk proxy npm run lint --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
```

Use an actual authorized Linux browser for Q-INTERACTION; Node render/view-state tests do not replace keyboard/contrast/layout evidence. At entry verify the required browser capability and preserve P09's broader cross-browser/capacity acceptance ownership. A screenshot alone is not an interaction or accessibility pass.

Review scoped tracked, staged and untracked changes; keep workflow YAML out of direct content diffs/parsers. Run whitespace checks on this packet's actual changed textual artifacts, including untracked files. Tests and evidence must show the real owning operation, not merely mirror declarations.

### Recovery and completion

Keep the last complete displayed revision on a failed local refresh. Restore only this packet's assets/renderer wiring if incomplete; do not fall back to a saved graph export or external CDN.

After all required local checks pass and every PROVE mutation is restored, run `specification_check_state` with the pinned aggregate source_version and `planning_packet_check` with the exact agreement_ref/proposal_digest below. Inspect the scoped diff against the agreed units/contracts. A failed/unavailable required check leaves this packet incomplete; report its actual result and concrete next action/owner. Do not run the completion gate while tests remain pending.

Update only this packet's entry in `todo.md` and replace `handoff.md` with current changes, actual RED/GREEN/PROVE evidence, versions, blockers and the next eligible packet. Then stop. Do not execute another packet, invoke code/security review, commit, install, refresh clients or publish automatically. Review and commits are separately authorized optional actions, not next-packet gates.

## Technical agreement

```json
{
  "packet_id": "P07",
  "proposal_id": "P07-server-rendered-viewer-v2",
  "agreement_ref": {
    "id": "2730e079-30df-4b77-9342-a3eacf6dd50a",
    "revision": 4
  },
  "proposal_digest": "83948f1c966bb1aafd694fca3a45a51f23acf4d105b16a88a4c1f6ccf971a771",
  "sources": [
    {
      "path": "docs/specs/product-roadmap-task-graph/tasks/plan.md",
      "heading": "Shared architecture"
    },
    {
      "path": "docs/specs/product-roadmap-task-graph/tasks/07_browser-viewer.md",
      "heading": "Technical proposal"
    }
  ],
  "planning_packet_check": "ready"
}
```
