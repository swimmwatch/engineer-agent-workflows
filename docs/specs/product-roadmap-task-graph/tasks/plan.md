# Product Roadmap Task Graph Implementation Plan

Status: Planning complete. Ready for separately authorized P01; no implementation authority.

## Shared architecture

This plan implements the existing Approved `../spec.md`, not another product workflow invocation. The pinned behavioral source version is `6087eb0c0dfca148e9afc43780651ece85bd5d9660313a049d34071925e8eaa5`; the specification version is `e257fb7b0011d3d9e5e9b0754391b65133e83054bc7327fd2110163f0dab5af8`, reviewed by `fd840f43-b70d-463d-991c-204f891f1b2e`.

- Existing product IDs, task IDs, candidate previews, ready Roadmap sources, source pins and task workflow ownership remain authoritative. Board observations cannot approve, review, retire or execute workflow artifacts.
- All new durable graph records use the existing separate product-data root, its safe-path validation and immutable object store. There is no consuming-project graph database or skill installation.
- The graph policy kernel is independent of providers, storage, HTTP and browser code. The provider returns normalized observations; one synchronization service reconciles them and owns publication. MCP and HTTP call that same service.
- Public persisted and wire definitions are added during implementation to the existing authoritative `shared/schemas/product.schema.json`. Planning describes the intended extensions and references them; it creates no second schema source or production schema changes.
- The only profile outputs are `../contracts/mcp.md`, `../contracts/openapi.yaml`, `../quality/scenarios.yaml` and `../architecture/model.dsl`. No design artifact or Penpot stage is required.
- Runtime targets remain Linux, macOS and Windows and current desktop Chrome/Edge, Firefox and Safari. Executable acceptance in this work remains Linux-only; Linux WebKit is not native Safari evidence.
- New identifiers below are proposed binding ownership boundaries. Private helper names and equivalent statement organization remain flexible.

## Delivery plan

The technical plan is agreed for ten bounded implementation packets. The HTTP server dynamically derives and renders SVG/HTML from normalized current observations. Generated graph markup/layout is not saved; the existing store retains only the source metadata required for identity, recovery and stale-data inspection. The browser uses direct HTTP; MCP is the separate agent command/data interface. gh is invoked directly, without an additional runtime runner.

## Stages and dependencies

| Stage                                            | Packets         | Completion boundary                                                                                              |
| ------------------------------------------------ | --------------- | ---------------------------------------------------------------------------------------------------------------- |
| S1 — model, safe observations and provider reads | P01 → P02 → P03 | Deterministic policy, atomic store and complete read-only provider evidence.                                     |
| S2 — manual reconciliation and agent interface   | P04 → P05       | Partial/deletion/concurrency policy and current specification signal are public and bounded.                     |
| S3 — dynamic HTTP viewer and delivery            | P06 → P07 → P08 | Owned secure listener, server-generated UI, packaged local assets and both host bundles.                         |
| S4 — measured acceptance and final documentation | P09 → P10       | Actual Linux public journeys, private GitHub integration, local capacity and implemented-behavior documentation. |

| Packet                               | Outcome                             | Prerequisites                          |
| ------------------------------------ | ----------------------------------- | -------------------------------------- |
| [P01](01_graph-kernel.md)            | graph kernel                        | none                                   |
| [P02](02_graph-store.md)             | graph store                         | P01                                    |
| [P03](03_github-reader.md)           | github reader                       | P01, P02                               |
| [P04](04_sync-coordinator.md)        | sync coordinator                    | P01, P02, P03                          |
| [P05](05_mcp-and-spec-signal.md)     | mcp and spec signal                 | P02, P03, P04                          |
| [P06](06_http-viewer.md)             | http viewer                         | P01, P02, P04, P05                     |
| [P07](07_browser-viewer.md)          | browser viewer                      | P01, P05, P06                          |
| [P08](08_workflow-packaging.md)      | workflow packaging                  | P05, P06, P07                          |
| [P09](09_linux-acceptance.md)        | Linux and private GitHub acceptance | P01, P02, P03, P04, P05, P06, P07, P08 |
| [P10](10_developer-documentation.md) | developer documentation             | P09                                    |

Only P01 is initially eligible. Every subsequent packet still requires actual dependency completion and its current technical/specification checks. Technical agreement is not a claim that its implementation prerequisites have already passed. Commit/review are not dependency gates. Run exactly one explicitly authorized packet and stop.

## Existing and proposed ownership

| Unit                                                         | Responsibility, input/output and lifecycle                                                                                                       | Dependency/verification                                                                                       |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Existing `product/roadmap.ts:1154`                           | Candidate task/dependency authoring with existing self/duplicate/cycle checks; preserved, not called to retire/delete board-observation records. | Existing product-roadmap regression plus Q-E2E negative invocation trace.                                     |
| Existing `product/storage.ts:396,425` and `config.ts:94,211` | Immutable objects and safe separate root/path policy; input validated product/ref, output verified bytes.                                        | P02 reuses them; Q-STORE actual files, faults and restoration.                                                |
| Existing `product/operations.ts:318,479,1040`                | Atomic replacement/cooperative lock primitives; ready-head publication remains workflow-owned.                                                   | P02 extracts only the needed safety helpers; it must not call ready-head publication for graph sync.          |
| Proposed `graph.ts`                                          | Pure validated observations + explicit state/spec evidence → complete/active/display projection, layers/signals and deterministic identities.    | P01 has no I/O/provider/UI dependency; Q-GRAPH.                                                               |
| Proposed `graph-store.ts`                                    | Canonical graph snapshot/head/binding/supplement definitions; guarded immutable save + atomic current pointer + explicit supported restore.      | P02 → existing storage/config/lock policy; Q-STORE.                                                           |
| Proposed `GitHubRoadmapReader`                               | Validated explicit scope, signal/deadline → complete membership/per-task observations and bounded causes. Owns direct gh subprocess lifetime.    | P03 → installed gh, not HTTP/MCP transport; Q-PROVIDER.                                                       |
| Proposed `graph-sync.ts`                                     | Explicit start/context → one operation; reconciliation validates components then atomically publishes. Status/cancel own that operation only.    | P04 → P01/P02/P03; no transport/UI policy; Q-PARTIAL/Q-CONCURRENCY.                                           |
| Proposed `graph-service.ts` and existing `productTools`      | Context/source/cursor or verified binding/supplement command → schema-validated protocol-v2 response.                                            | P05 → domain services, preserving existing transport budgets; Q-MCP.                                          |
| Factored `readTaskSpecificationStatus`                       | Existing current task/spec binding + Approved/resolved/fresh review → specification signal. No planning/execution gate or write.                 | P05 retains existing `tasks.ts:583` check ownership and regression; Q-SPEC.                                   |
| Proposed `graph-http.ts`                                     | Explicit open → owned loopback/session/direct HTTP; GET derives local view, POST requests the same sync service; stop disposes owned resources.  | P06 → read/sync services; exact installed SDK disposal hook is reverified during execution; Q-HTTP/Q-CLEANUP. |
| Proposed `viewer/render.ts`                                  | Current projection → escaped complete SVG/equivalent HTML list + inert metadata, generated at request time.                                      | P07 → policy only; no saved generated graph; Q-RENDER.                                                        |
| Proposed `viewer.mjs` / `view-state.mjs` / CSS               | Server DOM/model → local filters/relationships/selection/viewport and explicit HTTP actions. Pure state logic is separate from DOM/HTTP.         | P07 → HTTP wire contract; no readiness/layout reimplementation; Q-INTERACTION.                                |
| Existing generation/shared-reference path                    | One authoritative protocol → isolated self-contained Codex/Claude bundles and packaged MCP assets/capabilities.                                  | P08 uses existing generate/check/validate; Q-PACKAGING.                                                       |

In this table, `product/` and `src/` code paths are relative to `packages/engineer-agent-workflow-mcp/src/` unless a complete path is given. The referenced line numbers are planning evidence, not immutable runtime API. Reverify exact scoped code and existing uncommitted changes before implementation.

## Contract authority and promotion

| Manifest output                                     | Authority / planned consumer                                                                                                                                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [contracts/mcp.md](../contracts/mcp.md)             | Public agent operation names, scope, core selectors, continuation, reconciliation and safe causes; P02/P04/P05 extend the existing authoritative product schema.                                       |
| [contracts/openapi.yaml](../contracts/openapi.yaml) | OpenAPI 3.1 direct browser HTTP, dynamic view routes, unique viewer-path cookies, JSON envelopes and origin/host/session guards. It references canonical graph selectors, not copies of graph schemas. |
| [quality/scenarios.yaml](../quality/scenarios.yaml) | Measurable fixtures/observations/thresholds, owning packets, test-first evidence and Linux proof limits.                                                                                               |
| [architecture/model.dsl](../architecture/model.dsl) | Authoritative text context/container/component/manual-sync views and trust/dependency boundaries; rendered diagrams are derived and optional.                                                          |

The canonical graph selectors are intentionally future additions to `shared/schemas/product.schema.json`. Current planning validates YAML/OpenAPI structure and every declared reference/owner; it cannot claim full resolution against not-yet-implemented selectors. P02/P04/P05 must add the exact selectors, and P06 must resolve/validate the full saved HTTP contract against the resulting canonical schema before completing. Neither runtime needs this specification directory or the personal presentation-reference checkout. Do not add a second graph schema, production file, Penpot artifact or design stage during planning.

The typed source observation is durable; projection identity also includes current specification evidence. This avoids treating a newly Approved/stale specification as unchanged merely because the board did not change. HTTP and MCP may use different wire limits while reading the same domain revision. The HTTP viewer base is `/v/<viewer_id>/`, with a unique cookie Path so simultaneous loopback viewers do not overwrite each other's sessions.

## Requirement-to-unit and check map

Each row has a primary ownership boundary and a discriminating observation. Individual packet/scenario details supply input, expected RED and required PROVE rather than repeating the full specification.

| Requirement | Owning packet(s) | Check/scenario                         | Required observation                                                                                        |
| ----------- | ---------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| REQ-001     | P05/P08          | Q-MCP, Q-E2E                           | Explicit-only ownership and no automatic next workflow                                                      |
| REQ-002     | P09              | Q-INTERACTION, Q-CAPACITY, Q-PACKAGING | Linux execution versus intended portability                                                                 |
| REQ-003     | P02/P04          | Q-STORE, Q-PARTIAL                     | Ready-source/specification/history preservation                                                             |
| REQ-004     | P03/P09          | Q-PROVIDER, Q-GITHUB-LIVE              | One supported host/Project/repository scope, including real private fixtures                                |
| REQ-005     | P03/P05/P09      | Q-PROVIDER, Q-MCP, Q-GITHUB-LIVE       | Read-only provider trace and explicit identities; separate fixture-write actor                              |
| REQ-006     | P01/P02          | Q-GRAPH, Q-STORE                       | Stable lossless IDs and complete dependencies                                                               |
| REQ-007     | P01/P04          | Q-GRAPH, Q-PARTIAL                     | Valid DAG/components and external blockers                                                                  |
| REQ-008     | P01              | Q-GRAPH, Q-CAPACITY                    | Longest-path layers and display-only reduction                                                              |
| REQ-009     | P01/P07          | Q-GRAPH, Q-RENDER                      | Backlog source preservation and separate zone                                                               |
| REQ-010     | P02/P03          | Q-GRAPH, Q-PROVIDER                    | Stage/Sprint separation and local supplements                                                               |
| REQ-011     | P01/P07          | Q-GRAPH, Q-INTERACTION                 | Package/shared tags and multi-package matching                                                              |
| REQ-012     | P01/P03          | Q-GRAPH, Q-PROVIDER                    | Stable option mappings and literal board status                                                             |
| REQ-013     | P01              | Q-GRAPH, Q-E2E                         | Only eligible planned tasks become Ready                                                                    |
| REQ-014     | P05              | Q-SPEC                                 | Current Approved evidence without a plan dependency                                                         |
| REQ-015     | P07              | Q-RENDER, Q-INTERACTION                | Original palette, all cards/arrows and readable combined signals                                            |
| REQ-016     | P07              | Q-INTERACTION                          | Search/facet logic and distinct controls                                                                    |
| REQ-017     | P07              | Q-INTERACTION, Q-RENDER                | Semantic chains, preserved state and removed selection                                                      |
| REQ-018     | P04/P07          | Q-PARTIAL, Q-INTERACTION               | Distinct operational/view outcomes, no divergence UI                                                        |
| REQ-019     | P07/P09          | Q-INTERACTION                          | Keyboard, contrast and resize/zoom                                                                          |
| REQ-020     | P05/P06          | Q-MCP, Q-HTTP                          | Discoverable source-bound operation contracts                                                               |
| REQ-021     | P02/P05          | Q-PROVIDER, Q-STORE, Q-MCP             | Verified atomic one-to-one bindings                                                                         |
| REQ-022     | P03/P09          | Q-PROVIDER, Q-GITHUB-LIVE              | Every required GitHub connection and field, including live observations                                     |
| REQ-023     | P04/P09          | Q-CONCURRENCY, Q-E2E, Q-GITHUB-LIVE    | Manual sync through one service from MCP and the viewer                                                     |
| REQ-024     | P04/P07/P09      | Q-PARTIAL, Q-RENDER, Q-GITHUB-LIVE     | Authoritative absence removes record/binding/card and clears selection                                      |
| REQ-025     | P04              | Q-PARTIAL                              | Atomic task observations and valid independent updates                                                      |
| REQ-026     | P02/P04          | Q-STORE, Q-PARTIAL                     | Atomic revisions and safe interruption/retry                                                                |
| REQ-027     | P04              | Q-CONCURRENCY, Q-HTTP                  | Lease, source freshness and product isolation                                                               |
| REQ-028     | P03/P04          | Q-PROVIDER, Q-CLEANUP                  | 30/120-second deadlines and bounded cleanup                                                                 |
| REQ-029     | P05/P08          | Q-MCP, Q-PACKAGING                     | Capability failures without installation fallback                                                           |
| REQ-030     | P06              | Q-CLEANUP, Q-HTTP                      | Owned loopback lifecycle and usable URL                                                                     |
| REQ-031     | P06              | Q-HTTP                                 | Session/origin/host/method/path guards                                                                      |
| REQ-032     | P06/P07          | Q-RENDER, Q-HTTP                       | Inert content and fixed assets/safe links                                                                   |
| REQ-033     | P03              | Q-PROVIDER, Q-HTTP                     | Fixed read operations, minimum fields and secret handling                                                   |
| REQ-034     | P02              | Q-STORE                                | Safe root, restoration and isolated deletion                                                                |
| REQ-035     | P02/P08          | Q-STORE, Q-PACKAGING                   | Legacy preview, mixed-version rejection and both bundles                                                    |
| REQ-036     | P01/P05          | Q-GRAPH, Q-MCP                         | Deterministic semantics, limits and complete portions                                                       |
| REQ-037     | P09              | Q-CAPACITY                             | 1000/10000, five-second load and p95<=250ms                                                                 |
| REQ-038     | P09              | Q-E2E, Q-GITHUB-LIVE                   | Public normal/failure/retry/recovery journeys plus required private GitHub synchronization/display evidence |
| REQ-039     | Planning/P08     | Planning artifact checks, Q-PACKAGING  | Exactly four declared profile outputs; no runtime during planning                                           |
| REQ-040     | P08/P09          | Q-MCP, Q-PACKAGING, Q-E2E              | Excluded capabilities absent; no personal reference dependency                                              |

## Verification environments and limits

| Surface                         | Intended support                            | Planned executable evidence                                                                                                                                                                                    |
| ------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node/MCP/store/provider process | Linux, macOS, Windows; Node >=22.20.0       | Linux unit/integration/process tests, Unicode/spaced paths and cross-platform path/launcher policy fixtures. No non-Linux runtime claim.                                                                       |
| HTTP/browser                    | Stable desktop Chrome/Edge, Firefox, Safari | Required Linux Chromium-family and Firefox interactions, keyboard/contrast/resize and capacity evidence. Linux WebKit is supplemental only.                                                                    |
| Agent host bundles              | Codex and Claude Code                       | Generated metadata/content isolation and self-contained packaging. A structural pass is not a live Claude/Codex behavioral trial.                                                                              |
| Provider                        | GitHub.com, one Project/repository          | Isolated fake-gh read/page/error fixtures plus required Q-GITHUB-LIVE on one new private repository and one new private Projects v2 board. Test-actor writes remain separate from EAW read-only adapter calls. |

Planning observed Node `v24.20.0`, gh `2.92.0`, serving MCP identity `workflow-2/product-1` and build `772847cc4ca53d707cb9350cc2f18cb7ce6a0a60f20fa80dbc50076c2780cafb`. These are dated baseline facts, not graph-runtime test results. Recheck at execution. Required browser availability has not been established; P07/P09 must verify their actual execution capability before dependent edits/checks.

## Data evolution, activation and recovery

1. A missing graph head is a supported legacy/unbound state and permits read-only candidate/ready-source preview. Do not create feature records during a read.
2. Explicit configuration/binding activates only the selected product namespace after validating supplied stable identities. A binding alone is not fabricated successful board data.
3. Immutable observation snapshots and one atomic head preserve current records/bindings/supplements together. Ordinary sync never rewrites ready generations, source pins, review/specification/implementation ownership.
4. Complete membership proves absence; remove current task/binding automatically. Incomplete reads retain data. Source references to removed/out-of-scope Issues become explicit external blockers.
5. Current snapshot/schema/capability conflicts fail safely. Keep new metadata out of old-client mutation paths; do not bulk-migrate products or refresh installed clients.
6. Restore only a validated retained supported snapshot for the same product/current compatible source, under the ordinary guards. Preserve immutable history and unrelated documents.
7. Rollout starts with isolated local implementation/acceptance. The later explicitly invoked P09 includes creation, binding and synthetic changes only in one new private GitHub test repository and one new private Project; verify both visibility values before seeding and retain exact resource IDs. Existing working resources remain outside that fixture scope. Retain test resources privately after the run; deletion requires a separate explicit request naming them. Client refresh, installation and publication remain separately scoped actions.

No message broker/webhook/scheduler is applicable: the confirmed events profile is not applicable and sync is explicit. No new design stage is applicable. No independent code/security review or commit is required to complete/continue a packet; those remain separate optional invocations.

## Security and lifecycle ownership

Source observations, stable task/spec bindings and retained history are protected assets. The agent/provider boundary owns external writes; EAW's adapter only reads. Fixed gh operations, validated variables, a non-interactive existing auth context and redacted bounded output prevent board text from becoming commands.

The browser boundary accepts only the owned loopback Host/session, exact privileged Origin and safe typed requests. Path-scoped ephemeral cookies isolate products/viewers. Dynamic rendering escapes external text/attributes and packages local assets with restrictive CSP; it never accepts provider markup. GET cannot sync/write product data. The MCP process owns viewer/operation cleanup; a tab does not own MCP.

Store publication uses safe paths, verified immutable objects, a short product lock and expected graph/source/binding identity. The longer per-product sync lease prevents duplicate reads. Every safeguard has positive and negative Q-STORE/Q-PROVIDER/Q-HTTP/Q-RENDER evidence; evidence from source inspection alone is not runtime proof.

## Durable documentation decision

A final documentation packet is warranted: the flow crosses at least three processes/layers, the three status signals and source-preserving absence deletion are non-obvious, and field-ID/capability configuration is easy to misunderstand. P10 updates the existing product guide/MCP README only after P09 verifies behavior, with reader/example checks. This plan itself is not the final operator guide.

## Agreement and current planning state

All ten original proposals were explicitly agreed through native questions; the rejected extra gh runner is absent. P09's replacement live-GitHub proposal records the user's direct instruction of 2026-10-26, without claiming a new native-question reply or execution authority. Other packet agreements remain unchanged. Managed references below are identifiers only, not another consent journal. Full exact source headings and digests are in each packet.

| Packet | agreement_ref                           | proposal_digest                                                  |
| ------ | --------------------------------------- | ---------------------------------------------------------------- |
| P01    | 3eaf2a1f-7c59-4529-bd95-e18337d72844@2  | 3df5069a89813cae1eaa37db40dd97d8517e5b3e76ba02ce0871f803f6b7a09f |
| P02    | 3eaf2a1f-7c59-4529-bd95-e18337d72844@2  | b54536641fbc6c6b519e7b77b2bfd34054183b78e7097a0acdd3842bdf529f65 |
| P03    | 54e2e01d-2f76-42f3-ba38-dc0c4b4212f3@8  | ba92446840ce5f493806f888bd4d8930ef3e7b76ce0596e40e4ad50c878cd8ae |
| P04    | 54e2e01d-2f76-42f3-ba38-dc0c4b4212f3@10 | 3fda4563c6f49f0b1433afe4aff2b7161a0df3ac5c8dfe8974d4fb41b24fe302 |
| P05    | 54e2e01d-2f76-42f3-ba38-dc0c4b4212f3@12 | d2e5d37d0b4b74710453980d2ba60d7cbd449a62ead6728c3ce11bf19c0d8974 |
| P06    | 2730e079-30df-4b77-9342-a3eacf6dd50a@4  | 994334b513dd457a96ce3ee94ddd1aa35e957e93e4c5121c04d2b4a12454dbe8 |
| P07    | 2730e079-30df-4b77-9342-a3eacf6dd50a@4  | 83948f1c966bb1aafd694fca3a45a51f23acf4d105b16a88a4c1f6ccf971a771 |
| P08    | a0537887-401d-4835-9a5e-bc1d03217fcd@2  | f4dad26c564601355ea3c3ab460a4eec3b42a05b9a82a6b6c168ea4e2e3d0d8f |
| P09    | b8d263ab-6516-459a-81df-317828aea304@2  | 452aa60f5965f04b10a2940b702b21b751c5edd33e46e43be4f240edd1f530d5 |
| P10    | a0537887-401d-4835-9a5e-bc1d03217fcd@2  | 3e703d871e9ac92b075b9d3294c3c3bf62266d7fe8c84f813fe485add76e7ebb |

Final packet checks and artifact checks are recorded in the current-only [handoff](handoff.md). The sole execution completion checklist is [todo.md](todo.md). Planning does not execute tests for unimplemented behavior, run a packet, install, commit or publish.
