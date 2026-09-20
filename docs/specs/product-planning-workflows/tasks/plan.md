# Product Planning Workflows — Implementation Plan

Status: P01–P16 and P19–P24 complete. P17 is ready for a final explicit
execution under the refreshed qualification boundary; P18 has not started.
The current Approved specification pins are below.

## CDP review-efficiency amendment (2026-09-20)

[Validated report and dispositions](../../../reports/cdp-review-efficiency-validation.md)
separate missing behavior from existing P19–P21/P17 coverage. PWF-042–PWF-045
add enhanced full-review consistency, conservative context-only followup,
structured change navigation and conflict classification. No new platform/model
matrix, compression decoder, semantic regex lint, read batching, installation or
consuming-project changes are included.

**G02: complete.** The later qualification-scope amendment is also Approved
after an enhanced full independent review: 89/89 items, 86 covered, 2
non-behavioral not_applicable, consistent, with no gaps or conflicts. MCP
confirmed pass/reviewed after the author restored Approved. Current inputs:

- source_version: `19372d90970cee2f81912887f11aeb804d0ea1d850402b279708d93985206a6e`
- specification_version: `6e9aed5d083df98323ba346e28ebfc2f679086dc2399f0ef961520a7409dfa8d`
- review_ref: `ef63de3e-c965-44b0-b4ed-8eaf961d7c8a`

P17/P18 use these pins. Historical sections and completed packets retain their
original evidence; completion is not reset. Historical references to a required
three-OS matrix describe the earlier contract and do not override the current
PWF-003 acceptance boundary or the refreshed P17 packet.

Remaining order: finish P17, then P18. Every implementation packet still needs
its own explicit invocation. P17 no longer depends on unavailable macOS,
Windows or additional Node-version rows; its existing Linux and fresh-model
evidence must be revalidated against the current pins during that invocation.

## Tool-discovery amendment

[Validation and disposition](../../../reports/mcp-tool-description-audit-validation.md)
supports PWF-034 and [P19](19_mcp_tool_discoverability.md). Runtime behavior,
compatibility, active profiles and storage decisions remain unchanged.
P19 runs after P16 and before P17/P18; completed packet IDs are not renumbered.

The amended specification passed a new full independent completeness review:
70/70 items, 68 covered and 2 non-behavioral not_applicable, no gaps or conflicts.
The author restored Approved and MCP checkpointed that transition. Existing
P09–P19 retain the pins below. Completed P01–P08 retain their historical execution
evidence; completion was not reset. That amendment left P09 as the first
dependency-ready packet at the time; P09–P16 and P19 are now complete. The
proposed runtime additions below are not covered by the metadata-only PWF-034
amendment.

## Session-report amendment (2026-09-15, historical G01)

The user requested investigation of another session's failures and additions to
this plan, not runtime implementation. The
[validated disposition](../../../reports/workflow-session-bug-report-validation.md)
maps all eleven findings BR-01–BR-11 to evidence, owners and exclusions.

- Extend P19 for exact opaque-context forwarding, bounded-question lookup, actual
  batch limits, full/followup tool selection, source-change costs, lossless reading
  and accurate approval/status explanations. This fits existing PWF-034.
- Add [P20](20_workflow_diagnostics.md): bounded error details, indexed batch
  failures, correct revision warnings and transparent lifecycle/status results.
- Add [P21](21_review_verdict_batches.md): bounded atomic verdict recording with
  unchanged per-item reading/review guarantees, recovery tests and measured
  journal/write costs. Do not relax followup eligibility or migrate storage.
- Extend P17 qualification and P18 documentation to consume this evidence.

**G01 — specification/contract amendment gate (complete).** PWF-035–PWF-041
authorize the bounded diagnostics, corrected warning observation and atomic verdict
batch behavior. The amendment is Approved and passed a fresh independent 82/82
review with no gaps or conflicts. Planning refreshed the MCP contract, Q40–Q47,
P20/P21 packets and current pins. G01 itself had no production effects; completed
packets retain their historical evidence.

P01–P16 and P19 are complete. Remaining order is P20 -> P21 -> P17 -> P18;
dependencies and separate explicit invocations still apply. P20/P21 must maintain
their published metadata immediately, and P17 verifies the final registered
surface together with portable behavior and fresh-context evidence.

Do not silently add finding-linked new-source inheritance, short server-side
context handles, unversioned writes, CCr decoding, journal compaction or migration.
Such proposals need separate scope. Missing exact text blocks the affected
verdict, not all unrelated read-only work. Keep actual questions/answers even when
they require a full review. No Claude/Penpot execution or global setup is added.

## Historical G01 authority and pinned inputs

- Specification: [spec.md](../spec.md), Status: Approved, Deep.
- Active profiles: core, backend, data, security. No inactive profile was loaded.
- MCP source_version: `757943679c62c7967e931fb88981736a6e4471ed4ba87078882ae981212d58dd`
- MCP specification_version: `26b85020e08d19a98161c15d3207d99ee9cf2868aa413e9a4f6484770e3874f6`
- MCP review_ref: `1f1f7b2d-34c4-4d7e-bbf7-31fbb0f756c3`
- Preflight: pass / reviewed; all 41 exact requirements consumed through MCP continuations.
- Manifest-declared contracts and packet scope are unchanged by the pin refresh.
- Every numbered file is a packet within this specification, not a new independent product task.
- No implementation, installation, publication or Git commit is authorized by this plan.

## Accepted planning decisions

PLD-001 is an explicit, one-time exception to the installed planning reference's journal rule.
The current completeness fingerprint includes all ledger decision rows
(`packages/engineer-agent-workflow-mcp/src/review-model.ts:10`).
Writing an implementation-local question there would stale the approved specification.
Keep only this invocation's implementation-local Q/A in this section; do not change
review fingerprints, silently ignore a stale review or treat this as a global skill fix.
Behavior/scope changes still return to specification.

### PLD-001

Native source: synchronous request_user_input, current planning invocation.
Original non-sensitive question and selected answer are preserved verbatim:

> Где сохранять уточнения по реализации? В текущем MCP любая новая запись в журнал решений делает завершённое ревью спецификации устаревшим. Рекомендую для этого планирования сохранять вопросы и ответы в plan.md, не меняя утверждённые требования; цена — эти ответы пока нельзя будет искать через MCP. Альтернатива — журнал MCP и отдельное повторное ревью спецификации.

Answer: **В plan.md (Recommended)**

### PLD-002

Native source: synchronous request_user_input, current planning invocation.
Original non-sensitive question and selected answer are preserved verbatim:

> Как выбирать общий каталог продукта: автоматически или требовать путь при настройке MCP? Рекомендую стандартный пользовательский каталог ОС с возможностью один раз переопределить его через переменную окружения: спецификация уже требует общее хранилище вне репозиториев, а текущий MCP запускается без аргументов. Цена — этот каталог нужно отдельно учитывать при резервном копировании.

Answer: **Автоматически (Recommended)**

PLD-002 selects automatic OS-local application data with `EAW_PRODUCT_DATA_DIR`
as one explicit absolute-path override. Its exact precedence and failure behavior
are owned by [Configuration](../contracts/mcp.md#configuration).
No further implementation choice requires a user answer for this plan.

## Planning-maintenance authorization (2026-09-14)

Native source: synchronous request_user_input in this review/pin-refresh invocation.
This authorizes correction of existing planning placeholders, not a new product
behavior or a new implementation decision. It does not extend PLD-001 to future
product or architecture choices; those still follow their owning workflow.

> В P04–P18 вместо разрешённых путей остались заглушки `${s}`. Исправить их сейчас по уже принятой архитектуре? Рекомендую это, чтобы исполнитель не угадывал границы; потребуется дополнительная сверка пакетов, без изменения требований и реализации.

Answer: **Исправить границы (Recommended)**

P04–P18 now name their actual or explicitly proposed owners. Domain packets expose
only their own scenarios through the shared U11 adapter. Skill packets separate
canonical sources from renderer outputs. Qualification and documentation cannot
silently modify runtime behavior. No placeholder removal adds requirements.

## Design choices and trade-offs

1. Stay in the existing TypeScript MCP package, using its pinned Node >=22.20.0,
   YAML 2.9.0, Ajv 6.15.0, Zod 4.5.4 and mdast-util-from-markdown 2.0.3.
   No new database, HTTP daemon, dependency or lifecycle CLI is planned.
2. Keep canonical semantic text in registered multi-file Markdown. Store structured
   records in strict YAML; retain immutable content-addressed objects and bounded
   generation metadata. Store each product decision revision once, not one full
   journal per task/review. This adds checkpoint metadata but avoids a second text authority.
3. Retain existing spec-only contexts/receipts unchanged. New product contexts and
   product-scoped operations have their own namespace and schemas. Do not force
   the old four-kind state writer to pretend it handles multi-file transactions.
4. Product-level reads are selective and immutable-version-bound. Readiness of an
   entire candidate still checks all required members. Selection is not semantic
   proof; independent reviewers and agents assess applicability and risk.
5. New product authoring tools are explicit scenarios, not a generic update-YAML
   or edit-any-element endpoint. Low-level helpers are internal and cohesive.
6. Do not reuse existing full specification archive serialization for the new
   shared product store. Reuse verified primitives and review semantics, with
   product-scoped provenance and selective snapshots.
7. Keep local task bindings in a new MCP-owned sidecar, not in existing manifests
   or legacy decisions. Reservation precedes creation of a new product-linked spec.
   This specification itself is not retroactively enrolled.

## Repository baseline to recheck before execution

| Evidence                                                                   | Verified ownership / implication                                                                                             |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `packages/engineer-agent-workflow-mcp/package.json:1`                      | Existing package, pinned dependencies, build/lint/test scripts and Node floor.                                               |
| `packages/engineer-agent-workflow-mcp/src/state.ts:14`, `:79`, `:295`      | Four workflow kinds; safe-path checks; single-file guarded writes and bounded receipts. Reuse only applicable primitives.    |
| `packages/engineer-agent-workflow-mcp/src/server.ts:15`, `:47`, `:80`      | Tool composition, response budgets and protocol adapters; legacy tools must retain behavior.                                 |
| `packages/engineer-agent-workflow-mcp/src/main.ts:5`                       | Startup takes no arguments; preserve this interface; new configuration is lazy environment-based.                            |
| `packages/engineer-agent-workflow-mcp/src/requirements.ts:22`              | Existing mdast parsing and source offsets, not a regex-only Markdown parser.                                                 |
| `packages/engineer-agent-workflow-mcp/src/review-model.ts:10`              | Fingerprint currently covers the whole specification decision history.                                                       |
| `packages/engineer-agent-workflow-mcp/src/review-snapshots.ts:28`          | Existing spec archive owner; do not relocate or reinterpret old archives.                                                    |
| `packages/engineer-agent-workflow-mcp/test/review-concurrency.test.mjs:12` | Actual independent stdio clients; new helpers must use fileURLToPath rather than URL.pathname for portable executable paths. |
| `packages/engineer-agent-workflow-mcp/scripts/build-schemas.mjs:5`         | Current packaging copies four schemas and derives executable tool contracts.                                                 |
| `scripts/lib/distribution.mjs:37`, `:61`, `:68`                            | Host-specific template values, shared assets and manual-bearing skill selection.                                             |
| `scripts/lib/catalog.mjs:8` and `catalog/skills.json:1`                    | Explicit existing 13-skill catalog; final target is 16, not hand-edited generated packages.                                  |
| `skills/idea-refine/SKILL.md:1`                                            | Current standalone analysis workflow; durable product mode is new, not a current capability.                                 |
| `.github/workflows/lifecycle.yml:1`                                        | Manual-only three-OS lifecycle matrix uses Node 24.14.0; it does not yet run product checks.                                 |

The worktree contains extensive pre-existing changes. Record the scoped starting
diff including staged and untracked files for each execution packet; never reset
or claim those changes as this packet's work. Git is available; no clean-tree or
pre-existing-commit requirement is added.

## Architecture and dependency direction

`product/*.ts` paths below are under `packages/engineer-agent-workflow-mcp/src/`.
P01–P16 and P19–P24 have implemented their assigned units. Public behavior
stays in the linked contracts; P17 adds qualification only.

| Unit | Boundary                                                                                 | Principal symbols                                              | Inputs, outputs, lifetime, failures and invariants                                                                                                               | Dependencies and packet                                                    |
| ---- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| U01  | product/config.ts + schemas.ts                                                           | ResolveProductRoot / validateProductRecord                     | Environment + typed record → validated root/record; lazy per new call; INVALID_CONFIG/UNSUPPORTED_VERSION; never initialize on read.                             | None beyond Node/Ajv/YAML; P01                                             |
| U02  | product/storage.ts                                                                       | readObject / saveObject / loadGeneration                       | Exact bytes and registry → immutable source refs/coherent state; handles always closed; SOURCE_CHANGED/MISSING_EVIDENCE; no full-journal copies.                 | U01 only; P02                                                              |
| U03  | product/operations.ts                                                                    | runProductMutation / resumeOperation                           | Version-bound intent → durable receipt and updated context; product-scoped lock/checkpoint lifetime; BUSY/CONFLICT/RECOVERY_REQUIRED; no silent rollback/replay. | U01–U02; P03                                                               |
| U04  | product/bindings.ts                                                                      | resolveWorkspace / bindWorkspace                               | Absolute workspace and explicit product selection → typed binding; catalog mutation only by explicit create/bind; no name/remote guessing.                       | U01–U03; P04/P12                                                           |
| U05  | product/documents.ts                                                                     | parseProductDocument / resolveElement / moveElements           | Registered Markdown + semantic location → exact parsed block; preserved unrelated spans; duplicates/drift/unsafe members block writes.                           | U01–U03, existing mdast parser; P05                                        |
| U06  | product/interview.ts                                                                     | prepareProductQuestion / recordProductAnswer                   | Scoped question/native outcome → immutable decision revision; product-stage scope lifetime; unresolved answers cannot become consent.                            | U03/U05; P06                                                               |
| U07  | product/definition.ts + technical.ts + roadmap.ts                                        | Domain-specific authoring functions                            | Typed domain fields and refs → addressed Markdown plus structured relations; owning artifact only; readiness not assigned by ordinary writes.                    | U03/U05/U06; P07–P09                                                       |
| U08  | product/context.ts                                                                       | prepareProductContext / readContextPage                        | Task/purpose/pins → bounded exact selections; source-bound cursor lifetime; missing required source never silently excluded.                                     | U02/U04/U05/U07; P10                                                       |
| U09  | product/review.ts                                                                        | startProductReview / checkProductCandidate / activateAmendment | Frozen artifact inventory + verdicts → review evidence or checked activation; semantic snapshots exclude their own receipts; stale/gaps block ready.             | U03/U06/U08; P11/P13                                                       |
| U10  | product/tasks.ts                                                                         | checkTaskInputs / startTaskPacket / finishTaskPacket           | Local spec+plan and product pins → guarded task checkpoint; single explicit owner; safety blocks override old pins; no Git mutations.                            | U03/U04/U08/U09 + existing specification check; P12/P13                    |
| U11  | product/tools.ts + api.ts/server.ts/build-schemas.mjs                                    | productTools / product JSON-schema descriptor                  | Compile authoritative JSON schemas with Ajv and publish self-contained wire schemas; preserve the existing Zod tool branch and legacy output/registration.       | Adapters depend on U01–U10, never reverse; P04 onward                      |
| U12  | canonical skills + shared product references + renderer                                  | Explicit skill entrypoints / buildExpectedOutputs              | User invocation and exact MCP capabilities → stage handoff; scoped references copied by existing renderer; no tool installation or model switching.              | Runtime APIs, not internal source paths; P14–P16                           |
| U13  | Existing MCP descriptor owners + product/tools.ts + generated contract/reference outputs | Scenario descriptions and parameter provenance                 | Registered tool metadata -> accurate selection, effects and exact continuations; no validation/runtime change; M01–M06 verify parity and compatibility.          | U11/U12 outputs; P19 after P16, before P17                                 |
| U14  | Existing api/state/server plus scope/decision/ledger/check/review owners                 | Safe workflow diagnostics and revision warnings                | Closed bounded validation/reference/lifecycle details; separate document/checkpoint observation; supersession-aware warnings; no guessed answer or write retry.  | Existing specification workflow and product diagnostics stay separate; P20 |
| U15  | reviews.ts shared verdict validator plus state.ts mutation boundary                      | `specification_review_record_batch`                            | 1–20 exact-read verdicts, 131,072-byte raw argument limit, one atomic journal mutation and exact replay; no eligibility or storage-layout change.                | Existing review primitives and U14; P21                                    |

G02 adds these narrowly scoped units:

| Unit | Boundary                                                                          | Responsibility                                   | Contract                                                                                                            | Dependencies                             |
| ---- | --------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| U16  | review-model.ts, reviews.ts, review-followup.ts and canonical reviewer references | Enhanced full consistency                        | Explicit mode, final exact whole-spec/verdict read and receipt-bound final judgment; legacy runs unchanged          | Existing review/receipt owners; P22      |
| U17  | review-followup.ts and existing portion/cursor helpers                            | Structured changes and context correction impact | One shared impact model, bounded typed navigation, exact evidence and conservative inheritance; no storage redesign | U16 and existing snapshots; P23          |
| U18  | state.ts and diagnostics.ts                                                       | Conflict cause projection                        | Safe fixed reasons from guarded comparisons; read race is failure, uncertain cause is not semantic drift            | Existing guards and P20 diagnostics; P24 |

## Contracts

- [MCP contract](../contracts/mcp.md): operation schemas, configuration, state
  transitions, exact error/retry semantics and storage layout.
- [Data schema](../contracts/schemas/data.schema.json): Draft-7 structures and
  typed semantic payloads; read only the packet's named definitions.
- [Quality scenarios](../quality/scenarios.yaml): discriminating inputs,
  observation surfaces and expected outcomes. These are planned tests, not results.

## Packet order and dependencies

P01–P16 and P19–P24 are complete. P17 is the next eligible packet; P18 depends
on its completion. A dependency is never permission to execute another packet.

| Packet                                                | Result                                                              | Dependencies           | Planned focused test        |
| ----------------------------------------------------- | ------------------------------------------------------------------- | ---------------------- | --------------------------- |
| [P01](./01_schema_config_and_paths.md)                | Strict product schemas and safe root resolution                     | None                   | `product-foundation`        |
| [P02](./02_immutable_sources_and_generations.md)      | Immutable source objects and coherent generations                   | P01                    | `product-storage`           |
| [P03](./03_operations_concurrency_and_recovery.md)    | Recoverable writes, locking and exact replay                        | P02                    | `product-recovery`          |
| [P04](./04_project_and_workspace_binding.md)          | Explicit product creation and shared workspace identity             | P03                    | `product-bindings`          |
| [P05](./05_multifile_markdown_registry.md)            | Addressed multi-file Markdown authoring                             | P03, P04               | `product-documents`         |
| [P06](./06_product_interview_and_provenance.md)       | Scoped product questions, answers and evidence                      | P05                    | `product-interview`         |
| [P07](./07_idea_and_prd_scenarios.md)                 | Idea and PRD semantic authoring scenarios                           | P06                    | `product-definition`        |
| [P08](./08_technical_design_scenarios.md)             | Shared Technical Design authoring                                   | P07                    | `product-technical`         |
| [P09](./09_roadmap_and_task_structure.md)             | Stages, epics, stories and independent task identities              | P08                    | `product-roadmap`           |
| [P10](./10_bounded_context_and_exact_reads.md)        | Version-pinned context selection and source queries                 | P09                    | `product-context`           |
| [P11](./11_independent_review_and_activation.md)      | Independent product reviews and atomic-visible activation           | P10                    | `product-review`            |
| [P12](./12_local_task_binding_and_pins.md)            | Branch-local task bindings and implementation checkpoints           | P11                    | `product-task-pins`         |
| [P13](./13_amendments_and_safety_blocks.md)           | Product amendments, affected tasks and safety exceptions            | P12                    | `product-amendments`        |
| [P14](./14_idea_and_product_definition_skills.md)     | Durable Idea Refine and Product Definition skills                   | P13                    | `product-authoring-skills`  |
| [P15](./15_technical_and_roadmap_skills.md)           | Technical Design and Product Roadmap skills                         | P14                    | `product-planning-skills`   |
| [P16](./16_existing_workflow_integration.md)          | Selected product context in task workflows                          | P15                    | `product-task-integration`  |
| [P20](./20_workflow_diagnostics.md)                   | Actionable workflow diagnostics and revision warnings               | G01 complete, P16, P19 | `workflow-diagnostics`      |
| [P21](./21_review_verdict_batches.md)                 | Bounded atomic review verdict batches and measured write cost       | P20                    | `review-batch`              |
| [P19](./19_mcp_tool_discoverability.md)               | Accurate tool discovery and parameter metadata, without API changes | P16                    | `tool-metadata`             |
| [P22](./22_full_review_consistency.md)                | Enhanced full-review consistency and bounded progress               | G02, P20, P21          | `review-full-consistency`   |
| [P23](./23_structured_correction_review.md)           | Structured changes and safe shared-context correction reuse         | P22                    | `review-structured-changes` |
| [P24](./24_review_conflict_causes.md)                 | Compatible conflict-cause diagnostics                               | G02, P20, P21          | `review-conflict-causes`    |
| [P17](./17_crossplatform_end_to_end_qualification.md) | Cross-workspace, portable-behavior and fresh-context qualification  | P16, P19–P24           | `product-e2e`               |
| [P18](./18_developer_documentation.md)                | Document the verified product workflow                              | P17                    | `product-documentation`     |

The declared dependencies define eligibility; other ordering changes are allowed
only when they preserve ownership and verification. Updating shared adapter
registration within a packet is not permission to implement later domain tools.

## Requirement coverage

The table maps existing scope plus the G02 Approved amendment. P19 owns the PWF-034 metadata-only
guidance. P20 owns BR-02/03/04/05/08/09 through PWF-035–PWF-038; P21 owns
BR-06/07/11 through PWF-039–PWF-041. The refreshed pins authorize planning only;
each packet still requires a separate explicit implementation invocation.

| Requirement | Owning packets                    |
| ----------- | --------------------------------- |
| PWF-001     | P14, P15, P16, P18                |
| PWF-002     | P07, P08, P10, P11, P15, P16, P18 |
| PWF-003     | P01, P14, P15, P17                |
| PWF-004     | P06, P14, P15, P16                |
| PWF-005     | P11, P17                          |
| PWF-006     | P06, P07, P14                     |
| PWF-007     | P07, P14                          |
| PWF-008     | P08, P15                          |
| PWF-009     | P09, P15                          |
| PWF-010     | P06, P07, P14                     |
| PWF-011     | P01, P02, P04, P18                |
| PWF-012     | P04, P12, P17, P18                |
| PWF-013     | P02, P05, P07, P08                |
| PWF-014     | P02, P05                          |
| PWF-015     | P01, P02, P04, P05, P09, P10      |
| PWF-016     | P04, P09, P12                     |
| PWF-017     | P05, P06, P07, P08, P09           |
| PWF-018     | P01, P03, P19                     |
| PWF-019     | P10, P14, P15, P16, P17, P19      |
| PWF-020     | P02, P03, P10, P11, P12, P18      |
| PWF-021     | P03, P06, P10, P11, P17, P19      |
| PWF-022     | P03, P11, P17, P18                |
| PWF-023     | P02, P03, P11, P13                |
| PWF-024     | P12, P13, P16, P17, P18           |
| PWF-025     | P11, P13, P16, P17, P18           |
| PWF-026     | P02, P05, P13                     |
| PWF-027     | P04, P12, P16, P18                |
| PWF-028     | P01, P03, P04, P05, P17           |
| PWF-029     | P06, P08, P17                     |
| PWF-030     | P01, P02, P03, P06, P10, P17      |
| PWF-031     | P12, P16, P18                     |
| PWF-032     | P13, P16                          |
| PWF-033     | P17, P18, P19                     |
| PWF-034     | P19, P20, P21, P17, P18           |
| PWF-035     | P20, P21, P17, P18                |
| PWF-036     | P20, P17, P18                     |
| PWF-037     | P20, P17, P18                     |
| PWF-038     | P20, P21, P17, P18                |
| PWF-039     | P21, P17, P18                     |
| PWF-040     | P21, P17, P18                     |
| PWF-041     | P21, P17, P18                     |
| PWF-042     | P22, P17, P18                     |
| PWF-043     | P23, P17, P18                     |
| PWF-044     | P23, P17, P18                     |
| PWF-045     | P24, P17, P18                     |

## Common execution contract

Working directory: repository root, obtained from the active host; paths below
are repository-relative, never stored personal machine paths.

1. Invoke one packet explicitly. Open this spec through MCP, run
   `specification_check_state(expected_source_version)` using the pinned source
   above, require Approved/pass/reviewed and a usable Git worktree.
   P20/P21 additionally require completed G01 and their amended requirements,
   contracts and fresh pins; this plan alone cannot satisfy that gate.
2. Read only that packet's exact requirements via `requirement_get`, named schema
   selectors, contract sections and bounded source files; follow continuations.
3. Write its tests before implementation and record actual RED. Import/collection
   failure is insufficient: after GREEN use a one-behavior mutation to prove the
   intended assertion. Correct implementation rather than weaken correct tests.
4. Apply PROVE for new absence, wiring or post-hoc checks. Observe actual filesystem
   inventories/digests, Git index and child/network actions in isolated fixtures;
   a canned counter or matched phrase is not behavioral evidence.
5. Run the focused command in the packet, then `rtk proxy npm run lint` and
   `rtk proxy npm test` at each production-code checkpoint. Run generation,
   foundation and artifact checks when skill/schema packaging is affected.
6. Before completing, recheck the pinned spec through MCP, inspect the scoped
   final staged/unstaged/untracked diff, update only the linked todo and current
   handoff and stop. Every required unavailable/failed check leaves that packet
   incomplete. Review and commit are separate optional invocations, never gates.

Focused test filenames in packets are **to create**, not existing npm scripts.
Use existing `npm run build` then explicit Node test paths. No new script is
assumed until its owning packet creates and verifies it.

## Qualification boundary

| Surface                                                             | Required evidence                                                                                                            | Planned environment                                                                                                  |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| MCP runtime, storage, locking, path safety, restart, local bindings | Q01–Q30, Q36–Q38; actual stdio and fixture filesystem/Git evidence                                                           | One Linux environment with a supported Node.js version                                                               |
| Generated Codex and Claude bundles                                  | Catalog/dependency/manual/size/isolation and schema-to-tool contract checks                                                  | Local build and deterministic host-isolation checks                                                                  |
| Fresh-context model behavior                                        | Lite CLI product and multi-profile UI/API product documentation; independent stage reviewers; task pins and safety amendment | Explicit local Codex trial; Sol authors/reviews, Terra bounded task implementation; advice, not runtime model gating |
| Claude empirical behavior                                           | Deferred per prior user direction; generated Claude validation remains required                                              | Not claimed tested; no Claude model run authorized by this plan                                                      |
| UI/Penpot operation                                                 | Not applicable: only product documents, no design creation or remote access                                                  | None                                                                                                                 |

P17 runs the explicit local qualification harness without adding or dispatching
a remote workflow job. The product remains portable across Linux, macOS and
Windows, but only one Linux environment with a supported Node.js version is a
mandatory completion row. Other operating systems and Node.js combinations are
not claimed as executed and their absence does not block P17.
A fixture UI/API example tests selected requirements/contracts, not actual Penpot
design or a browser application; no browser/network permission change is needed.

Model trials run outside npm test and CI, after explicit execution authorization
for P17. Fixture customer answers are simulation only. A fresh document reader in
P18 must not be its author. Planning itself performs a coherence check, not an
independent code/security review or a fresh model trial.

## Rollout, recovery and manual gates

- Additive package capability first; preserve old tools, schemas and standalone
  workflows. Product root configuration does not affect old tools when unused.
- Version the new schema/capability explicitly. Unknown versions fail; no automatic
  product conversion or legacy task enrollment is provided.
- Existing clients can keep using standalone scenarios. Reverting runtime/skills
  means those old clients ignore the new store; do not delete its data or present
  product-linked tasks as standalone to bypass their pins.
- Back up the shared root and branch-local task bindings together while writers
  are stopped. No automatic retention cleanup, cross-computer sync or power-loss
  guarantee is introduced.
- MANUAL GATE: global installation, MCP environment setup, publishing, commits,
  external CI dispatch and any optional code/security review require separate
  explicit authorization. They are not presumed implementation completion evidence.
- If a production packet finds a changed behavior/scope requirement, stop the
  affected part and return it to specification; do not mutate Approved text.
- Active task safety blocks require the owning user's disposition; no automatic
  old-version exception resolves a security/incompatibility finding.

## Durable documentation decision

Required: this work crosses skill/MCP/filesystem/workspace boundaries, introduces
new identities/version meanings, has non-obvious old-pin/safety behavior and can
be misconfigured by pointing clients at different roots. P18 follows implemented
and end-to-end-verified behavior and extends existing authoritative documentation.

## Planning verification

Results are recorded in [handoff.md](./handoff.md), not inferred from planned tests.
Check JSON Schema compilation, positive/negative contract examples, scenario/packet
coverage, links, dependency DAG, source pins, whitespace and final MCP freshness.
Production and final Linux qualification remain planned, not passed. Other
operating systems and Node.js combinations are outside the mandatory matrix and
are not claimed as tested.
