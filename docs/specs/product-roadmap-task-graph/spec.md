# Product Roadmap Task Graph and Board Synchronization

Status: Approved

Date: 2026-10-23

## Purpose and evidence

This specification extends Product Roadmap for agent-assisted task planning and decomposition. A person revises the plan through dialogue and uses a graph to inspect dependencies and parallel work.

The confirmed [Idea Refine direction](../../ideas/product-roadmap-task-graph.md) is the starting point. Later user answers in the managed decision journal amend it: verification is Linux-only; Sprint order and start date are local supplements; ordinary synchronization has no divergence interface or extra acceptance step; authoritative task absence causes local deletion.

Verified repository evidence establishes existing Roadmap task/dependency operations, content-addressed product generations, and the separate cross-platform product store: packages/engineer-agent-workflow-mcp/src/product/roadmap.ts:1133-1187, storage.ts:108-126, and config.ts:21-24,62-118. KAP Task Management was inspected read-only, including build_task_graph.py, task_graph/domain.py, state.py, web.py, service.py, and the original templates, CSS and JavaScript. Its algorithms and presentation are reference behavior, not an existing EAW graph runtime.

External evidence: [GitHub issue dependencies](https://docs.github.com/en/rest/issues/issue-dependencies), [Milestones](https://docs.github.com/en/rest/issues/milestones), [Project single-select fields](https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-single-select-fields), and [WCAG 2.2 text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). These establish documented capabilities and constraints. No live board integration, new runtime, or non-Linux execution has been verified.

## Scope and support

### REQ-001: Planning outcome and invocation boundaries

The feature supports an agent drafting a plan and a person changing its composition, tasks, dependencies, product Stages, Sprints and tags through dialogue. The viewer is an inspection interface with a manual synchronization action, not a task editor. Existing Idea, PRD, Technical Design, Roadmap, task specification, planning and implementation responsibilities remain separate. A graph preview or ready Roadmap does not invoke another stage or authorize execution.

**Acceptance.** A draft plan can be inspected and revised through the existing workflow without an implementation run. Captured workflow invocations show only the requested operations; opening a graph does not call a producer/consumer workflow, install capabilities, publish artifacts, or start task execution.

### REQ-002: Supported environments and verification limits

Target runtime support is Linux, macOS and Windows, including their ordinary path, encoding and child-process differences. The viewer targets current stable desktop Chrome/Edge, Firefox and Safari. Mobile browsers are outside this version. The implementation must remain cross-platform, while executable verification for this work is performed only on Linux. Record tested Linux/browser/runtime versions; do not describe static inspection, emulation or Linux WebKit as native macOS, Windows or Safari runtime proof.

**Acceptance.** The support and verification report distinguishes intended compatibility from executed checks. Linux checks cover paths containing spaces and non-ASCII text and platform-policy fixtures; the report contains no claimed non-Linux execution or mandatory non-Linux test result.

### REQ-003: Existing product ownership and ready source preservation

Use the existing EAW product store and stable Roadmap identities. Draft previews use the selected candidate; synchronization requires an existing current ready Roadmap and identifies that source explicitly. Synchronized graph records are current board observations associated with those identities, not replacement approval evidence. Ordinary synchronization updates the graph without a ready-versus-board divergence interface, additional confirmation, or automatic Roadmap review. It must not rewrite retained PRD/Technical Design/specification source pins, review evidence, implementation packet ownership or completion.

**Acceptance.** Changing a valid title or dependency on the board changes the next synchronized graph immediately, without a divergence prompt. Before/after source-pin and workflow-state observations remain unchanged. A draft-only product receives a clear not-ready result before provider reads or graph publication.

### REQ-004: Provider and product scope

The synchronization contract describes provider-neutral task, board, Sprint, tag and dependency observations. The first supported provider is GitHub.com: one Project and one Issues repository per product. GitHub Issues represent tasks and repository Milestones represent Sprints. A provider binding identifies the product, host, Project, repository and externally stable entity identifiers. Other hosts must have an explicitly supported capability contract; otherwise reject them before a read. Jira/YouTrack implementations and multiple repositories or boards per product are outside this version.

**Acceptance.** The same normalized graph contract can describe a provider fixture without GitHub-specific field names. A binding to another repository, product or unsupported host is rejected before publication; existing data and other products remain unchanged.

### REQ-005: External actions remain provider-owned

The agent creates and changes external Issues, Milestones, fields, statuses and relationships through the provider's MCP tools, GitHub CLI or integration. EAW does not implement external entity creation, modification or deletion. Its GitHub adapter invokes installed gh only for reads, including read-only GraphQL queries. EAW binds explicit external identities and retrieves their current data; it does not match tasks by title or automatically import unrelated Project items.

**Acceptance.** In a fixture containing mapped tasks plus unrelated Issues, PRs and draft items, only explicitly bound eligible Issues contribute task records. A captured provider call trace for binding, viewing and synchronization contains no mutation, entity creation/deletion, login, installation or provider configuration action.

## Graph, groups and state

### REQ-006: Stable identities and complete relationships

Each current graph task has one stable internal task identity and at most one external Issue binding in the selected provider scope. Bindings cannot collide or change another task's identity. External identifiers are opaque and lossless, including numeric identifiers larger than the exact integer range of ordinary floating-point numbers. Preserve every observed source prerequisite; do not derive dependencies from title, tag, Sprint, Stage, preferred order or team ownership.

**Acceptance.** Repeated reads and renamed Issues retain internal/external identity pairs without duplication. An oversized numeric identifier round-trips exactly. A diamond with an explicitly redundant source edge retains that edge in source data; a proposed duplicate binding is rejected without changing either task.

### REQ-007: Graph validation and boundary references

Internal dependencies must reference existing in-scope tasks, be unique, exclude self-links and form a directed acyclic graph. Invalid observations are reported and cannot produce a successful invalid graph revision. A native prerequisite outside the selected board/bindings is an unresolved external prerequisite, not an automatically created local task: retain its external reference and safe issue link as a blocking reason. Do not erase such a prerequisite or infer completion from its absence.

**Acceptance.** Self-links, duplicate links and cycles produce bounded task/component errors while independent valid updates remain possible. An out-of-scope prerequisite produces an explicit blocking reference without a phantom task card or false Ready state.

### REQ-008: Layer calculation and display reduction

For the active graph, a root has layer 1; each other task has one plus the maximum layer of its active internal prerequisites. Recalculate after a dependency, membership or Backlog change. Compute display-only transitive reduction while preserving reachability. Keep the complete source prerequisites available on the task; draw reduced arrows downward. A group or Sprint never creates an execution dependency.

**Acceptance.** For A → B → C plus explicit A → C, source data has three edges, the diagram has two, C still lists A and B, and reachability is equal. Splitting or moving prerequisites changes affected layers without inventing serial order between independent tasks.

### REQ-009: Backlog projection

Backlog is determined by explicitly mapped board statuses, not by task isolation. Retain all source dependencies of Backlog tasks, but exclude their tasks and incident edges from the active readiness/layer calculation. Display them in a separate Backlog zone. Returning a task from Backlog reactivates preserved relationships and recalculates the active graph. Backlog is the agreed exception to requiring completed predecessors.

**Acceptance.** Moving a linked task into Backlog removes its incident active arrows but leaves the source edge set intact; moving it back restores those relationships. An isolated non-Backlog task remains an ordinary active task. Graph/list counters and readiness use the same projection.

### REQ-010: Stage and Sprint semantics

Product Stage expresses the existing product outcome boundary. Sprint is a separate named group with a goal, stable identity, order and optional calendar dates; each task has zero or one Sprint. Neither is a dependency layer, and filtering by either does not change dependencies. For GitHub, read Sprint name, goal from Milestone description, deadline and task membership from the board. Store order and optional start date in EAW as explicit local supplements; synchronization neither sends them to the board nor erases them when the provider has no corresponding field.

**Acceptance.** Tasks on different layers can share a Sprint and tasks on one layer can belong to different Sprints or none. A Milestone rename/deadline change updates remote-owned fields while local order/start remain unchanged. Invalid local dates/order are rejected visibly without silently changing remote dates; an absent optional deadline remains absent.

### REQ-011: Tags and package membership

Tasks have a set of tags, including zero or more package:<name> tags and ordinary thematic tags. A cross-package task lists every affected package. A shared task has scope:shared and no package tags. Reject empty or conflicting package/shared declarations without guessing intent. Titles contain the board's actual title rather than generated package prefixes. Do not strip or interpret a legacy prefix automatically; the agent performs any requested external rename/tag change through provider tools.

**Acceptance.** A task tagged package:Listing and package:DAL matches either package filter and appears once. A shared task has scope:shared without a fabricated package. Empty legacy tag sets remain usable; synchronization does not infer package tags from bracketed title text.

### REQ-012: Exact board status and mapped state

Preserve and display the exact board status independently of normalized state and dependency readiness. Explicit per-product mappings identify planned, Done, Working, Testing and Backlog statuses; use stable provider field/option identifiers and never infer categories from names or translations. Primary Done/Working/Testing/Backlog states are mutually exclusive. Unknown, missing or unmapped status is visible, never guessed or promoted to completion. GitHub Project status is the working-state source; Issue open/closed alone does not override it.

**Acceptance.** Renaming a mapped status without changing its identity retains its category and displays the new text. An unmapped status is shown literally with a configuration diagnostic and cannot unblock a dependent. A closed Issue whose Project status is Working remains Working.

### REQ-013: Dependency Ready and Blocked

An eligible planned active task is Ready when every active prerequisite has an explicitly mapped completed state. Otherwise it is Blocked and exposes the unfinished/unknown prerequisite identities and reasons. Working, Testing, Done and Backlog tasks do not simultaneously claim Ready. Unknown external prerequisites block. Readiness only describes dependencies; it never bypasses specification, planning or execution checks.

**Acceptance.** Completing the last unfinished prerequisite changes a planned task from Blocked to Ready; a Testing predecessor still blocks. An independent planned root is Ready. Captured execution state shows that a Ready card alone neither starts a packet nor grants task ownership.

### REQ-014: Independent specification signal

Needs Spec identifies every unfinished task without a current Approved specification under the existing EAW specification/binding checks. Missing, draft, stale or unverifiable specification evidence does not count as current approval. Done suppresses Needs Spec. This is independent of the board state and dependency readiness: an unfinished Working, Testing, Backlog, Ready or Blocked task may still need a specification. Do not reuse KAP's description-length heuristic or author a description subsystem.

**Acceptance.** A Ready task with no current Approved specification shows both signals; the same check and counters apply in the graph, list and filters. A long issue description alone does not satisfy the signal. Done hides it without altering the saved specification or claiming new approval.

## Viewer experience

### REQ-015: Reference layout and visible state encoding

Keep the original top-to-bottom graph, muted eight-layer palette, consistently sized readable cards, full prerequisite labels and per-layer task list. The web viewer contains the complete active graph and reduced arrows at the supported capacity; static-export density splitting rules do not remove web tasks. State accents remain Done #0E8A57, Ready #E8760C, Testing #BE185D, Working #1D4ED8, Needs Spec #7C3AED and Backlog #64748B. Give Blocked a distinct neutral treatment and textual reason, without inventing a critical path. Use heavy primary borders and footer bands; Needs Spec uses a dashed violet treatment and an independent labeled band. Layer fill remains distinct from state accents. Adapt label foregrounds where needed for contrast.

**Acceptance.** The 40-task/8-layer reference shape and a larger fixture show all task cards, layer groups and reduced arrows. Cards, list rows and filter controls use consistent labels/accents; combined signals remain legible. Done and Ready accent bands retain their colors while small text meets contrast, rather than copying failing white foregrounds.

### REQ-016: Search and multi-select filters

Search internal ID, external issue identifier and title using case-insensitive text matching. Filter by exact board status, normalized/computed state, specification signal, Stage, Sprint and tags. Values within one facet use OR and separate facets/search use AND; empty selections impose no restriction. Classify matching, related-context and muted tasks consistently in graph and list. Filtering preserves graph geometry and data. Provide clear-search, reset-all, fit-results and whole-graph controls with distinct effects.

**Acceptance.** A two-package selection matches either package while an added Sprint filter narrows both. Clearing search preserves filters; reset clears search, filters and relationship context. Zero matches is announced explicitly, fit-results cannot jump to an unrelated task, and whole-graph remains usable.

### REQ-017: Relationships, navigation and view preservation

Select tasks from cards or list with keyboard or pointer. Show prerequisite/dependent direction and direct/full-chain scopes using semantic dependencies, including edges omitted by visual reduction. Preserve search, filters, selected task, expanded layers, pan and real zoom through successful and partial refreshes when those values remain applicable. Keep selected filter values visible as unavailable when removed upstream. If a selected task is deleted, clear its selection and announce removal without leaving a ghost card or stale relationship panel.

**Acceptance.** Selecting C in the redundant-edge fixture still lists direct prerequisites A and B. After sync, the previous viewport/filter state remains stable; after C's deletion, neither the SVG, list nor relationship selection contains C. Keyboard focus remains usable rather than resetting unpredictably.

### REQ-018: Loading, empty, stale and failure feedback

Show local loading, empty graph, no filter matches, synchronization in progress, success, partial failure, permission/configuration failure and last-known stale data as distinct states. Display last successful/attempted synchronization times, affected counts and bounded actionable reasons. Do not show ready-versus-board divergence indicators or require a separate acceptance step for valid incoming changes. Mere display or refresh reads local state only; pan, zoom, search and filters work from packaged assets without a CDN or board connection.

**Acceptance.** With the network disabled, the last published graph and interactions remain usable and the failed explicit sync is visible. An empty draft is not reported as a provider error. A normal board rename updates the displayed title without a divergence panel or confirmation dialog.

### REQ-019: Desktop accessibility and content safety

All controls and task inspection are keyboard-accessible, have semantic names, visible focus and textual state alternatives. Announce synchronization/results without moving focus unnecessarily. Provide equivalent list access when SVG inspection is impractical. State meaning cannot rely on color alone. Small text meets 4.5:1 contrast, large text and meaningful non-text controls meet applicable 3:1 contrast, and supported desktop resizing must not hide essential controls or task information. Preserve Unicode board content and use the repository's English UI conventions.

**Acceptance.** Keyboard-only navigation can search, filter, inspect either relationship direction, open an issue link and start synchronization. Contrast measurements pass without rounding a failing value upward. At 1024×768 and 200% browser zoom, essential controls remain reachable through layout/scrolling and full task text is available through the list/details.

## Interfaces and synchronization

### REQ-020: Observable operation contracts

Expose discoverable operations to read a graph, bind explicit external references and configuration, maintain local Sprint supplements, synchronize, inspect synchronization state, and open/stop the viewer. Each operation identifies the selected product and relevant source/graph revision, validates inputs before mutation, and returns a bounded success/error result with retryability and affected identities. MCP graph inventories use source-bound pagination/cursors with explicit completeness; follow-up pages cannot silently combine revisions. Read operations do not perform provider calls.

**Acceptance.** The agent can completely enumerate a large graph across pages and distinguish end-of-data from truncation. A stale cursor or wrong-product binding fails without mixed data. Read-only operation traces contain no provider invocation or state mutation.

### REQ-021: Explicit and verified bindings

The agent supplies stable external IDs for an existing task, Project, Issue, Stage field/options and Sprint/Milestone as applicable. Validate provider scope, existence and one-to-one task mapping through read-only evidence; do not guess by display names, URLs alone or title prefixes. Report unbound eligible items to the agent without creating local tasks or external entities implicitly. Changed external names retain the same identity mapping. Invalid binding changes are atomic.

**Acceptance.** Two similarly named Issues bind only by the supplied identity. A duplicate/wrong-repository binding is rejected with the previous valid binding intact. An unrelated Project item remains unbound; no task is synthesized from a matching title.

### REQ-022: GitHub field and dependency reads

Read Issue title and labels, configured Project status and Stage option values, Milestone association/metadata, and the complete native blocked-by dependency lists. Use configured stable field/option identifiers, support all required pagination, include open and closed Milestones, and verify scope. Stage options map to existing product Stage identities; Sprint bindings map Milestone identities. A missing required field, unknown Stage mapping or incomplete page chain is an explicit data/configuration failure, not an empty value. Use the installed gh authentication context without adding credentials to EAW.

**Acceptance.** A dependency list crossing a page boundary imports every edge; an explicitly empty complete list clears previous dependencies. A failed page or absent required field does not clear relationships or fabricate a Stage. A closed mapped Milestone remains readable.

### REQ-023: Manual synchronization and board priority

Only an explicit MCP synchronization invocation or viewer button starts provider reads and local reconciliation. Require the current ready Roadmap/source and valid binding context before reads. For bound tasks, current verified board title, status, tags, Sprint, Stage and dependencies overwrite their previous synchronized values without a divergence prompt, new acceptance gate or outbound write. Preserve local Sprint supplements. A valid update appears in the same graph through either entry point.

**Acceptance.** A controlled board change is visible after either entry point, and an unchanged repeated run preserves task identities, relationships and logical graph revision. Opening/reloading a page makes zero provider calls. A not-ready or wrong-context request fails before the first gh invocation.

### REQ-024: Authoritative absence deletes local tasks

A successful complete in-scope Project read establishes membership. If a previously bound task is absent, delete its current local graph task record and external binding; remove its card, list row, selection and current counts automatically. Do not retain an inactive/stale task card or ask for a separate deletion/archival decision. Existing immutable workflow history, specifications and implementation evidence are not deleted by graph reconciliation. A later explicit binding can use the surviving EAW task identity. Provider read failures or incomplete membership enumeration do not establish absence.

**Acceptance.** Removing a mapped Issue from the Project and completing synchronization makes current graph and binding queries return no such record, with no archived-card fallback or deletion confirmation. Specifications/history remain byte-identical. A failed membership page preserves prior task records and reports failure rather than falsely deleting them.

### REQ-025: Partial failure and valid publication

Accept independent valid observations when another task fails. A task's required synchronized fields are accepted together; failed reads retain its last verified data with an explicit stale/error reason. Missing/removed tasks follow REQ-024. A new or changed internal relationship must not publish a cycle or dangling internal reference. Reject the conflicting dependency component while accepting independent valid components; explain affected identities. Out-of-scope native prerequisites follow REQ-007 rather than resurrecting a deleted task.

**Acceptance.** In a fixture with two independent components, one read failure leaves that component's prior data marked stale while the other updates. Introducing a cycle cannot produce a successful cyclic snapshot. Confirmed task deletion still removes the task when a surviving Issue references it as an external prerequisite.

### REQ-026: Atomic revisions, interruptions and repeat runs

Each published graph revision is internally valid and read as one complete revision by all clients. A crash, interruption, serialization error or failed local write must not expose half-written tasks, bindings or relationships. Report whether a prior valid revision or independently committed updates remain. Repeating a manual run reconciles from current verified state without duplicate identities, lost local supplements or blind replay of an uncertain write.

**Acceptance.** Interrupt publication at each persistent-write boundary and reopen the viewer/MCP: readers see only complete valid revisions. Retrying converges to the expected graph without duplicate bindings. A damaged/unsupported record produces a recoverable diagnostic instead of being silently replaced.

### REQ-027: Concurrent synchronization and source freshness

For one product, overlapping web/MCP synchronization requests share one active operation or return a stable busy result identifying it; they do not race independent publishers. Different products remain isolated. Recheck local source/binding identity before publication and reject stale-context commits. Provider observations carry their actual read time and available revision evidence; do not promise a globally atomic remote snapshot across paginated external reads. Detected changing/incomplete source observations are retryable failures under the partial-update policy.

**Acceptance.** Double-clicking sync while an MCP sync is active does not duplicate reads/publishers. Changing the selected binding/source mid-run prevents publication against the new context. Two product fixtures cannot observe each other's tasks or operation results.

### REQ-028: Deadlines, cancellation and recovery

A provider read has a 30-second deadline and one manual synchronization run a 120-second total deadline. Missing gh, unavailable authentication, denied permissions, malformed output, rate limiting, timeout and cancellation produce distinct bounded diagnostics with the last verified local data preserved. Respect a provider's retry delay within the run budget; do not create background retry jobs or request interactive login. Cancellation/termination cleans up owned child processes. Closing a viewer tab is not authority to terminate the MCP process.

**Acceptance.** A hanging provider fixture ends with a timeout and no owned child within five seconds of cancellation/deadline cleanup. A rate-limit fixture does not cause an unbounded retry storm. Recovery through a later explicit run succeeds without resetting local identities or opening an authentication/configuration flow.

### REQ-029: Missing or unsupported capabilities

Discover and require the matching host bundle, workflow MCP capabilities, provider read capability and supported saved-data contract for the requested operation. Missing capability blocks the affected operation with actionable guidance; it does not authorize installing/updating global skills, changing MCP/gh configuration, hand-editing workflow YAML or approximating a response. A provider failure does not disable reading the last valid local graph.

**Acceptance.** With gh or a required runtime capability absent, sync fails clearly before publication while local graph inspection still works. A captured process/file trace shows no installer, configuration write or manual workflow-state fallback.

## Lifecycle, safety and compatibility

### REQ-030: MCP-owned local viewer

Open the local HTTP viewer only on explicit request and return its usable URL. Repeated opens for the same active context reuse the owned viewer rather than creating duplicates. Serve current local graph state and manual sync through the same reconciliation contract as MCP. Stop its owned listeners and in-flight provider children when stopped or when the owning MCP terminates. Startup, ordinary stop and cleanup have a five-second local budget at the supported fixture capacity.

**Acceptance.** Two opens return the same live viewer identity; a missing/occupied/unusable binding yields an error without reusing an unrelated server. After stop/MCP termination, endpoint and owned-process probes show no surviving listener or child. Viewer startup itself does not contact GitHub.

### REQ-031: Local HTTP access and mutation safety

Bind only to loopback and keep product/session access scoped to the owning local viewer. Require a valid viewer session and same-origin/host checks for privileged actions; ordinary GET/read navigation cannot start synchronization or write state. Reject untrusted origins, forged product identities, arbitrary paths and command arguments. Do not expose a public listener or broad cross-origin API. Temporary access information must not enter repository artifacts, persistent logs or third-party requests.

**Acceptance.** Requests from an invalid origin/session or with another product identity are denied with zero provider calls/state changes. GET attempts to trigger sync are harmless. A listener probe confirms loopback-only access, and a diagnostic scan finds no persisted session secret.

### REQ-032: Safe external content and links

Treat all board titles, labels, Milestone descriptions and error text as data. They cannot execute HTML, SVG, script, shell commands or resource loads. Escape text in graph/list output and serve browser assets from a fixed packaged allowlist. Construct issue links from verified provider scope/identity using safe HTTPS URLs; new-tab links protect their opener. Never accept script/file URLs, arbitrary file exports or raw provider markup as viewer code.

**Acceptance.** Injection fixtures render inert text, create no executable nodes and cause no unexpected network/process request. Malicious links are rejected. Graph controls and list inspection remain usable with remote asset loading blocked.

### REQ-033: Read-only provider execution and secret handling

Execute only trusted configured gh read operations with validated scope and data arguments; untrusted board content cannot select an executable, shell, subcommand, query mutation or environment override. EAW uses existing provider authentication without copying credentials into graph/configuration artifacts. Keep diagnostics bounded and redact secrets. Persist only required task/group/status/dependency metadata, bindings, local supplements and freshness/error information, not unrelated Issue bodies, comments, personal rosters or raw credential-bearing payloads.

**Acceptance.** Captured invocation fixtures show only authorized reads even when fields contain shell metacharacters or mutation text. Secret scans of stored records, URLs and diagnostic output find no test credentials. Unrelated private response fields are absent from saved normalized records.

### REQ-034: Store safety, privacy and restoration

Use the established separate EAW product-data root and its safe-path rules; no consuming-project skill installation or parallel graph database is introduced. Reads/writes must preserve product isolation, Unicode identities and existing source integrity. Support restoration of the last valid product/graph state using retained supported data; malformed, incompatible or unsafe paths fail without deleting previous data. Local graph deletion removes current task records and bindings, not unrelated documents or existing immutable workflow history.

**Acceptance.** Path traversal/symlink/wrong-root fixtures cannot escape the intended store. Restoring a saved supported graph reproduces identities and relationships. Deleting one missing board task leaves another product and all task specifications untouched.

### REQ-035: Existing data and mixed-version compatibility

Existing unbound Roadmaps remain readable with empty tags, no Sprint and no external binding; graph preview does not require a live board. Feature activation is explicit and any necessary record evolution preserves identity/source history without bulk migration of unrelated products. Keep the existing authoritative shared schemas and host generation mechanisms. Incompatible clients or saved-data versions must reject affected mutations without silently discarding new graph metadata. Do not automatically install or refresh plugins/runtime processes.

**Acceptance.** A pre-feature fixture opens unchanged and can be previewed before configuration. A mixed-version mutation that cannot preserve the new contract is rejected without data loss; a supported retry/restore remains possible. Generated Codex and Claude artifacts stay host-specific and explicitly invoked.

### REQ-036: Deterministic results and bounded interfaces

For equal normalized task relationships, status mappings and local supplements, derive equal layers, display edges, state classification and stable ordering. Preserve ordering during filters and unrelated metadata refreshes. Logical graph identity excludes attempt-only timestamps; actual freshness times remain observable separately. Input strings/counts obey the authoritative schemas, normalized graph state remains within the existing 16 MiB source bound, and API results/diagnostics are bounded and paginated rather than silently truncated.

**Acceptance.** Reordering provider pages or repeating an unchanged read yields equal graph semantics and identities. Invalid/oversized data yields a clear limit result while the previous graph remains intact. Cursor completeness and counts expose any remaining data rather than presenting a partial result as complete.

### REQ-037: Capacity and interaction budgets

Support at least 1000 tasks and 10000 source dependencies in one web graph. At that fixture size, initial local graph presentation completes within five seconds after complete data is available; p95 search/filter update latency is at most 250 ms over 20 representative interactions on a documented Linux test environment. The graph remains inspectable through pan/zoom, relation navigation and list access. Above the supported task/edge or source-size limit, report the limit explicitly without publishing a truncated graph or losing prior data.

**Acceptance.** A recorded Linux browser run at the capacity boundary meets both budgets and verifies complete counts/reachability. An over-limit fixture receives a visible limit diagnostic with the previous graph unchanged. Remote-provider latency is measured separately, not hidden in the local rendering claim.

## Acceptance ownership and exclusions

### REQ-038: Cross-surface end-to-end acceptance

Trace dialogue/provider actions, explicit binding, ready-source selection, synchronization, normalized-state publication and final graph/list outcome using shared identities. The web and MCP entry points must agree on counts, state, failures, deletions and the published revision. Approval/specification/execution facts remain distinct from board observations. Future acceptance must cover valid, invalid, repeated, interrupted, denied, partial, concurrent and recovery journeys on Linux.

**Acceptance.** One end-to-end fixture changes a title/status/tag/Sprint/dependency through the simulated provider, synchronizes through each entry point and observes identical current results. A second fixture combines a deletion, independent read failure and cancellation/retry; no ghost task, false Ready, leaked secret or unauthorized workflow transition remains.

### REQ-039: Declared planning contracts and verification boundary

This invocation creates only specification state and the behavioral specification. Later planning owns the four manifest-declared artifacts: contracts/mcp.md covers REQ-020 through REQ-029 and source-bound graph reads; contracts/openapi.yaml covers REQ-018 through REQ-019 and REQ-023 through REQ-033 at the viewer boundary; quality/scenarios.yaml covers REQ-002, REQ-007 through REQ-019 and REQ-024 through REQ-038; architecture/model.dsl explains the provider/agent/MCP/viewer/store authority and dependency boundaries in REQ-001 through REQ-005, REQ-023 and REQ-030 through REQ-035. Planning must reuse the existing authoritative schemas rather than introduce a competing data source. No Penpot/design-planning artifacts are declared.

**Acceptance.** The confirmed manifest names exactly those four future outputs. Specification completion creates none of them, no task packet/handoff, and no production/runtime implementation. The report separates mechanical/completeness checks from future runtime/Linux acceptance and never treats Approved as implementation authorization.

### REQ-040: Explicit exclusions and preservation

Do not transfer Gantt, resource assignment/allocation, workload/capacity planning, the task-description subsystem or knowledge base from Task Management. Do not add a graph editor, autonomous execution, background synchronization, webhooks, event-broker integration, external writes inside EAW, multiple GitHub repositories/Projects per product, or external Epic/Story publication. Preserve existing EAW specification, review, planning and execution mechanisms. The saved Chigiri page is presentation evidence only, not a canonical task database or runtime dependency. The delivered feature must be self-contained rather than depend on a personal KAP checkout or machine path.

**Acceptance.** Tool/UI inventories and captured invocation traces contain none of the excluded workflows/actions. The package/runtime dependency inventory contains no personal reference path or required KAP checkout. Existing workflow fixture behavior remains valid, and no actual KAP workflow or board mutation is part of validation for this feature.
