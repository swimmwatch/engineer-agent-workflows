# P06 — MCP-owned local HTTP viewer

## Technical proposal

Implement `openRoadmapViewer`, `stopRoadmapViewer` and `disposeRoadmapViewers` in a new `packages/engineer-agent-workflow-mcp/src/product/graph-http.ts`, using Node's built-in HTTP server. A process-owned registry keys viewers by the validated product-data root, product ID and selected ready/candidate source identity. Reopening the same live context returns the same viewer identity and usable URL. Startup is explicit and never reads GitHub. Bind the literal IPv4 loopback address `127.0.0.1` on an OS-assigned port; no caller-supplied address, arbitrary route, filesystem path or command is accepted.

The browser talks directly to this server. `GET /` dynamically derives the current projection and returns server-rendered SVG, the equivalent HTML task list and packaged local controls. `GET /view` dynamically renders a complete replacement graph/list fragment from one pinned current revision after synchronization; metadata and safe non-executable view data identify that same product/source/graph/evidence revision. No generated HTML/SVG/layout is saved to disk. Only validated source observations, bindings, local supplements and synchronization state are durable; any derived cache is optional, request/process-local and invalidated by its input fingerprint.

Serve only packaged allowlisted CSS/ES-module assets and dynamically rendered local content; do not invoke MCP tools or pass browser responses through MCP envelopes or its 24/64 KiB limits. `GET /api/graph` additionally exposes source-bound domain inventory portions, up to 1 MiB of JSON per HTTP response, with revision/count/completeness/cursor fields. `POST /api/sync` calls P04 and returns the operation identity immediately; `GET /api/sync` reads status; `POST /api/sync/cancel` cancels the selected owned operation. HTTP has no task editing, provider configuration or workflow-approval route. Shared graph and synchronization services provide identical semantics to MCP with separate transport envelopes. HTML responses stream a complete bounded view derived from the schema-bounded source; never substitute a pre-exported graph file.

On ordinary first-party viewer navigation, issue an unpredictable in-memory session cookie scoped to this listener/product (`HttpOnly`, `SameSite=Strict`, session lifetime, no Domain). Keep secrets out of URLs, durable files, logs and third-party requests. Graph/status reads require that session and an exact Host match; reject a foreign Origin when present and cross-site browser fetch metadata. Privileged POST requires the valid session, exact Origin/Host, `application/json` and a fixed custom same-origin request header. Reject absent/foreign origins on POST, unsupported methods and extra product/path fields before domain invocation. GET cannot start sync or mutate product data. The root navigation only bootstraps an ephemeral session, not product state.

Use fixed MIME types, no-store API responses, nosniff, no-referrer and a restrictive self-only Content Security Policy with no framing, external assets, inline script or provider markup. Treat board text and error text as data. Validate and construct safe GitHub HTTPS issue links from verified identities; protect new-tab openers. Bound request bytes, headers, active connections and timeouts; report safe machine-readable causes without raw provider payloads.

Wire disposal into the existing MCP close/transport-close and SIGINT/SIGTERM lifecycle in `src/server.ts` and `src/main.ts`. Stop accepting connections, close owned sockets, invalidate sessions and cancel viewer-initiated syncs, within five seconds. MCP shutdown also cancels its owned P04 operations/direct gh children; viewer stop does not terminate MCP or cancel an unrelated MCP-initiated operation. No extra runner process or server framework is added. A later explicit open creates a fresh owned listener/session; an unrelated occupied listener is never treated as this viewer.

Implement `../contracts/openapi.yaml` operation IDs `viewerGet`, `viewGet`, `graphGet`, `syncStart`, `syncStatus` and `syncCancel`. All application errors disclose cause, retryability, retained-data state and affected IDs; transport errors use the same safe error vocabulary. P06 depends on P01/P02/P04 and the P05 application-read boundary. Its initial tests inject a renderer fixture; P07 supplies and wires the production dynamic renderer.

Requirement IDs: REQ-002, REQ-018, REQ-019, REQ-020, REQ-023, REQ-026, REQ-027, REQ-028, REQ-030, REQ-031, REQ-032, REQ-033, REQ-036, REQ-038, REQ-040.

Evidence: `packages/engineer-agent-workflow-mcp/src/main.ts:9`/`:14` owns stdio shutdown; `src/server.ts:109` constructs the MCP server; `src/server.ts:76` has the separate MCP response limits, which HTTP does not inherit. Node 22.20 [HTTP lifecycle](https://github.com/nodejs/node/blob/v22.20.0/doc/api/http.md) documents listener and connection shutdown. Reverify the installed pinned SDK close hooks before wiring them; do not infer them from a different SDK version.

## Delivery details

### Inputs and eligibility

Packet: **P06**. source_version: `6087eb0c0dfca148e9afc43780651ece85bd5d9660313a049d34071925e8eaa5`; specification_version: `e257fb7b0011d3d9e5e9b0754391b65133e83054bc7327fd2110163f0dab5af8`; review_ref: `fd840f43-b70d-463d-991c-204f891f1b2e`.

Read exactly `REQ-002`, `REQ-018`, `REQ-019`, `REQ-020`, `REQ-023`, `REQ-026`, `REQ-027`, `REQ-028`, `REQ-030`, `REQ-031`, `REQ-032`, `REQ-033`, `REQ-036`, `REQ-038`, `REQ-040` through MCP `requirement_get`, using the pinned specification_version as that tool's source_version, following every text/reference continuation. Do not reload the full specification or decisions history. Recheck the aggregate source_version through `specification_check_state`.

Dependencies: [P01](01_graph-kernel.md), [P02](02_graph-store.md), [P04](04_sync-coordinator.md), [P05](05_mcp-and-spec-signal.md) completed with their required checks and current agreement. Required local tools: usable Git worktree/status including staged/untracked evidence, the existing Node >=22.20.0/npm environment and the matching workflow MCP. No clean tree or existing commit is required. Missing installation/browser authority is not supplied by this plan.

Exact contracts/scenarios to read:

- contracts/openapi.yaml — all operations, cookie security, direct HTTP rules and planned canonical refs
- contracts/mcp.md — viewer/sync operations
- quality/scenarios.yaml — Q-HTTP, Q-CLEANUP

### Scoped work and acceptance

Allowed ownership areas, plus this specification's linked `tasks/todo.md` and current-only `tasks/handoff.md`:

- packages/engineer-agent-workflow-mcp/src/product/graph-http.ts
- packages/engineer-agent-workflow-mcp/src/server.ts and main.ts — owned close/transport/signal disposal
- product/tools.ts — wire the already declared viewer operations
- focused HTTP/lifecycle tests and renderer/provider fixtures

Preserve unrelated modified files and all source/specification/history evidence. The known planning-entry worktree includes unrelated MCP README/metadata/task/tool/schema/test edits and `.local/`; re-inspect their current content and overlap before editing. An unexplained deletion/loss or unknown overlapping change requires disposition, not baseline replacement.

Acceptance observations:

- Explicit open/reopen returns the same owned live viewer; source startup makes zero provider calls. Bind only 127.0.0.1.
- Use unique /v/<viewer_id>/ base and cookie Path to avoid cross-port/product cookie collisions. The public viewer ID is not an access secret; the cookie is ephemeral/HttpOnly/SameSite=Strict.
- Foreign/missing privileged Origin, wrong Host/session/product/path/method/content type and asset traversal are denied before provider/state effects.
- GET is local and non-mutating to product data. MCP stop and ordinary protocol/transport/signal shutdown close owned listeners/children within five seconds; tab close never terminates MCP.
- P06 injects a renderer fixture for HTTP tests; P07 wires the dynamic production renderer. HTTP is not a tools/call proxy and does not inherit MCP byte bounds.

### Test-first execution and verification

Working directory: repository root. Create/extend the following checks before implementing this packet: `packages/engineer-agent-workflow-mcp/test/product-graph-http.test.mjs`. These are planned files, not claims that scripts/tests already exist.

Use the exact synthetic workloads, observations and mutations in `Q-HTTP`, `Q-CLEANUP` from `../quality/scenarios.yaml`. Run RED first; if it only reports a missing import/symbol or invalid harness, repair the harness and require PROVE after GREEN. Implement until every correct check passes; never weaken a correct assertion to obtain green. Perform the named one-behavior PROVE mutations for absence/wiring/late-written assertions, observe each expected failure and restore the implementation before final verification.

Copy-ready local commands (existing build/lint infrastructure; named feature tests are created by this packet):

```bash
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/product-graph-http.test.mjs
rtk proxy npm run lint --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
```

HTTP fixture tests observe real socket address/closure and actual child lifetime. Connect disposal through the installed pinned SDK's actual close/transport lifecycle and reverify its type/API evidence; no extra runtime process is introduced. Run both the direct HTTP contract and reused MCP graph entry points.

Review scoped tracked, staged and untracked changes; keep workflow YAML out of direct content diffs/parsers. Run whitespace checks on this packet's actual changed textual artifacts, including untracked files. Tests and evidence must show the real owning operation, not merely mirror declarations.

### Recovery and completion

Stop/invalidate only owned listener/session/work and preserve normalized source records. Remove no product data or unrelated listeners. Fix lifecycle/guards before retrying the packet.

After all required local checks pass and every PROVE mutation is restored, run `specification_check_state` with the pinned aggregate source_version and `planning_packet_check` with the exact agreement_ref/proposal_digest below. Inspect the scoped diff against the agreed units/contracts. A failed/unavailable required check leaves this packet incomplete; report its actual result and concrete next action/owner. Do not run the completion gate while tests remain pending.

Update only this packet's entry in `todo.md` and replace `handoff.md` with current changes, actual RED/GREEN/PROVE evidence, versions, blockers and the next eligible packet. Then stop. Do not execute another packet, invoke code/security review, commit, install, refresh clients or publish automatically. Review and commits are separately authorized optional actions, not next-packet gates.

## Technical agreement

```json
{
  "packet_id": "P06",
  "proposal_id": "P06-http-viewer-v2",
  "agreement_ref": {
    "id": "2730e079-30df-4b77-9342-a3eacf6dd50a",
    "revision": 4
  },
  "proposal_digest": "994334b513dd457a96ce3ee94ddd1aa35e957e93e4c5121c04d2b4a12454dbe8",
  "sources": [
    {
      "path": "docs/specs/product-roadmap-task-graph/tasks/plan.md",
      "heading": "Shared architecture"
    },
    {
      "path": "docs/specs/product-roadmap-task-graph/tasks/06_http-viewer.md",
      "heading": "Technical proposal"
    }
  ],
  "planning_packet_check": "ready"
}
```
