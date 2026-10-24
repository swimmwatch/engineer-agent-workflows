# Roadmap Graph MCP Contract

Status: Planning contract v1; no runtime implementation or tool installation is performed by this plan.

## Authority and identity

Requirements: REQ-001 through REQ-014, REQ-020 through REQ-029, REQ-034 through REQ-040. Behavioral source: `6087eb0c0dfca148e9afc43780651ece85bd5d9660313a049d34071925e8eaa5`; specification: `e257fb7b0011d3d9e5e9b0754391b65133e83054bc7327fd2110163f0dab5af8`; review: `fd840f43-b70d-463d-991c-204f891f1b2e`.

The existing product schema `shared/schemas/product.schema.json` (`urn:engineer-agent-workflows:product-planning:1`) remains the only machine contract source. Existing `#/definitions/Ref` owns native references. P02/P04/P05 add the planned selectors below during implementation; this planning document does not create another JSON Schema or pretend missing selectors already exist.

| Planned selector           | Purpose and owner                                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| RoadmapGraphSnapshot       | Normalized source observations, explicit bindings/supplements, stale causes and retained source identity; P02. No SVG, HTML or layout. |
| RoadmapGraphHead           | Atomic current/previous supported snapshot references; P02.                                                                            |
| RoadmapGraphBinding        | GitHub.com Project/repository/Issue/field/option/Stage/Milestone identity mapping; P02.                                                |
| RoadmapSprintSupplement    | Stable local Sprint identity, order and optional start date; P02.                                                                      |
| RoadmapGraphProjection     | Derived complete/active/display graph, layers and independent signals; P01 policy, P02 schema.                                         |
| RoadmapGraphPage           | Source-bound typed inventory items and explicit portions/completeness; P05.                                                            |
| RoadmapGraphSyncStatus     | Current/last manual operation, publication result, counts and bounded diagnostics; P04.                                                |
| RoadmapGraphMutationResult | Validated binding/supplement/restore result and revision identity; P05.                                                                |
| RoadmapGraphViewerResult   | Owned viewer ID, usable loopback URL and source identity; P06.                                                                         |
| RoadmapGraphProblem        | Stable cause, retryability, affected identities and retained-state information; P03–P06.                                               |

Input selectors use `Input_RoadmapGraphGet`, `Input_RoadmapGraphConfigure`, `Input_RoadmapGraphBindTask`, `Input_RoadmapGraphSetSprint`, `Input_RoadmapGraphSync`, `Input_RoadmapGraphSyncStatus`, `Input_RoadmapGraphCancelSync`, `Input_RoadmapGraphRestore`, `Input_RoadmapGraphOpenViewer` and `Input_RoadmapGraphStopViewer`. Success selectors are `Success_RoadmapGraphPage`, `Success_RoadmapGraphMutationResult`, `Success_RoadmapGraphSyncStatus` and `Success_RoadmapGraphViewerResult`, retaining the existing protocol-v2 envelope.

Every call takes the existing opaque product `context`; the server resolves and validates the owning product-data root. A caller cannot select another product by embedding an ID/path in a graph record. Writes require the current `expected_state_revision` (immutable snapshot digest, or null only at explicit initial configuration) and selected ready-source identity. `graph_revision` is a semantic digest excluding attempt-only timestamps. Derived responses also identify current `evidence_revision` and `projection_revision`, so a changed Approved-specification signal invalidates a view/cursor even when board observations did not change.

## Operations

| Operation                 | Additional input and outcome                                                                                                                       | Effects / prerequisites                                                                                                                                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| roadmap_graph_get         | Explicit ready/candidate source selector, optional opaque cursor and limit 1–100; returns typed task/edge/group/mapping/binding/diagnostic items.  | Local read only. Candidate/pre-feature preview is explicit. Current observed heads never repopulate deleted records from retained source tasks.                                                                  |
| roadmap_graph_configure   | Exact Project/repository IDs, status/Stage field IDs, option-category/Stage mappings, explicit Sprint/Milestone bindings, expected state revision. | Verify supplied identities through read-only provider evidence; atomically activate/update only this product's graph configuration. No name guessing or implicit import.                                         |
| roadmap_graph_bind_task   | Existing native task Ref, explicit Issue node ID and expected state revision.                                                                      | Verify existence/scope/one-to-one identity. A binding is not a successful task observation; only verified synchronized fields become observed task data. A surviving EAW identity can be rebound after deletion. |
| roadmap_graph_set_sprint  | Stable Sprint ID, explicit Milestone ID when binding, integer local order >=0, optional real calendar start date and expected state revision.      | Verify an explicitly supplied remote identity; update local supplements atomically. Never write a remote deadline/name/goal or erase an unsupported local field on sync.                                         |
| roadmap_graph_sync        | Current ready source, expected state revision.                                                                                                     | Explicit start returns a stable operation ID. One active per-product lease; overlap reports busy with that operation ID before duplicate reads.                                                                  |
| roadmap_graph_sync_status | Operation ID; optional diagnostic continuation cursor.                                                                                             | Local read only; reports running/success/partial/failed/cancelled, actual attempt/success times, publication revisions, counts and safe causes. No restart or background polling of GitHub.                      |
| roadmap_graph_cancel_sync | Owned operation ID.                                                                                                                                | Idempotent cancellation/cleanup of that operation; never another product or MCP itself.                                                                                                                          |
| roadmap_graph_restore     | Retained supported same-product snapshot reference, expected state revision/current compatible source.                                             | Explicit guarded local restoration; no provider call, source/history deletion or directory-order guessing.                                                                                                       |
| roadmap_graph_open_viewer | Ready/candidate source selector and expected source identity.                                                                                      | Explicitly start/reuse an owned loopback viewer. Return URL/ID; startup reads local data only.                                                                                                                   |
| roadmap_graph_stop_viewer | Owned viewer ID.                                                                                                                                   | Stop that listener/session and viewer-initiated work within five seconds; leave MCP and unrelated MCP-initiated work alive.                                                                                      |

Provider-neutral observations use opaque string IDs, complete prerequisite references, exact board text plus explicit stable-option mappings, Stage/Sprint identities and tag sets. Numeric-looking IDs never pass through Number. Initial supported counts are 1000 tasks / 10000 source prerequisite references and the existing 16 MiB normalized source bound. Existing schema limits remain authoritative for other fields; any new limits are centralized in its new definitions, not separately guessed by transports.

A source preview has no fabricated board status or completion. Bound but never successfully observed data are identified as unverified/diagnostic, not silently presented as a verified Issue record. Unrelated Issues, PRs and draft items never create local tasks.

## Inventory and wire limits

These are pages of structured data for the agent, not web pages. HTTP serves the browser directly; it neither calls `tools/call` nor inherits MCP response limits.

Preserve `successResult`'s existing maximum 24 KiB serialized structured payload and 64 KiB complete wire result. Measure final UTF-8 bytes and worst-case escaping with the opaque context included. A page's `complete` is true only after every selected item and every portion is delivered; `total` describes the full selected inventory. A large individual item is delivered as ordered lossless JSON-text portions with item identity, part index and explicit item completeness, never truncated.

Cursors bind product, selected source, snapshot, graph/evidence/projection revisions, query selection and portion position. A changed source or wrong product is a conflict/source-change result; no mixed-revision page is returned. Sorting uses stable IDs, not localized titles or provider page order. Equal unchanged inputs produce repeatable pages.

## Reconciliation and lifecycle

A verified complete Project membership read alone establishes absence. Remove the absent task's current graph record and external binding automatically; retain immutable workflow sources/specifications. Failed/incomplete membership does not delete. Per-task required fields are accepted together; failed observations retain verified values with stale evidence. Reject the conflicting component of the union of prior/proposed dependency edges and accept independent valid components; convert native out-of-scope prerequisites to external blocking references.

Source observations/bindings/supplements are durable. Layers, reduction, state projection, layout, SVG and HTML are derived on read; no generated graph artifact is saved. The HTTP server dynamically renders current SVG/list content. Optional in-memory derived reuse is fingerprint-bound and never an authority.

A provider read has a 30-second deadline and one explicit sync 120 seconds. Direct gh subprocesses use fixed read-only GraphQL operations, bounded/redacted output and ordinary Node cancellation/cleanup. Respect one provider retry delay only within that budget. No extra Node.js runner, shell wrapper, detached work, installation, outbound write, automatic review or execution is introduced.

## Stable failure causes

| Cause                                                  | Retry / observation                                                                                   |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| invalid_input / wrong_scope / duplicate_binding        | Not retryable until corrected; previous valid state is intact.                                        |
| not_ready / source_changed / stale_cursor              | Refresh exact owning context; no stale-context publication.                                           |
| busy                                                   | Observe the named active operation; do not start another publisher.                                   |
| missing_capability / missing_gh / unsupported_contract | Explain the missing prerequisite; local reads remain available; no install/configuration fallback.    |
| authentication / permission                            | Correct through separately authorized provider setup; no interactive login.                           |
| rate_limited / timeout / cancelled                     | Record actual read/attempt state and bounded retry information; preserve committed graph.             |
| incomplete_observation / invalid_dependency_component  | Partial result identifies affected tasks and retained stale state.                                    |
| limit / storage / recovery_required                    | No truncation or silent replacement; inspect the retained supported state and explicit recovery path. |

These causes are domain diagnostics mapped to supported existing WorkflowError codes and the new canonical problem definition. Do not leak arbitrary provider stderr, credentials, personal paths or raw payloads. Status reads expose uncertainty about publication rather than asserting that a lost response means no write.

## Verification ownership

P03 owns provider identity/pagination/allowed-process/error checks. P04 owns busy, partial/deletion/stale-source and retry convergence. P05 owns schema discovery, byte bounds, exact source-bound completeness, current specification evidence and zero provider calls/mutations on reads. P06/P07 own HTTP/dynamic rendering and browser safety. P09 proves cross-surface agreement and Linux capacity; runtime evidence is pending implementation.
