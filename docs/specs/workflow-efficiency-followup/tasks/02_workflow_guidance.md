# P02: Source Reuse and Validation Boundaries

## Technical proposal

Requirements: WFE-001, WFE-002, WFE-003, WFE-004, WFE-005, WFE-006, WFE-007, WFE-008. The shared technical boundary in `plan.md` is binding.

Keep `shared/references/product-workflow.md` authoritative for serial review and product-linked source/validation flow. Add the agreed pending-only progression recipe and distinguish it from observer/recovery status. Clarify existing same-actor exact-source reuse using returned ownership/version/revision/portion identity, receipt completeness and availability of exact text. Preserve every missing continuation, changed-input read and independent reviewer's consumption. Do not introduce durable caching or narrow planned context roots.

Keep `shared/references/test-discipline.md` authoritative for check reuse and `skills/incremental-implementation/references/packet-recovery.md` authoritative for delivery/recovery/preservation details. Consolidate only an extra invocation proven to repeat the same check over identical inputs at the same owning boundary. Preserve pinned specification and technical-agreement checks at start/end, full frozen-task validation, local tests, native start/completion and required post-mutation read-back. Record an owning-check/purpose/input reference when reusing a result. Existing preflight ordering, exact retrieval, native binding transitions, external-edit inspection and compact handoff behavior stay intact; change their instructions only where a controlled failure demonstrates an ambiguity within WFE-002 through WFE-005. Keep unconditional entry instructions in the skill and conditional details in its existing references.

Use the existing generator to refresh matching host bundles and skill-local shared copies; never hand-edit generated outputs. Extend existing instruction/policy tests and add a bounded workflow-efficiency trace evaluator under `tests/` with fixtures under `tests/fixtures/workflow-loop/`. This evaluator consumes captured events plus independently captured outcomes and checks the shared evidence semantics: actual delivery counts, completeness, check ownership, state changes, recovery and preservation. Reuse `verifyCapturedArtifacts` for capture integrity and the existing evidence helpers where their contract fits; do not redesign their registry or weaken old evidence requirements. Its private function names are flexible; it is test infrastructure, not a runtime workflow engine. Synthetic positive/negative fixtures test the evaluator itself. Actual controlled agent runs and the matching raw captures are completed in P03 before claiming improved agent behavior.

First add discriminating source-contract checks and negative trace fixtures. Mutations must include a redundant source delivery, a missing portion, suppressed owning validation, missing recovery synchronization, and acceptance of overlapping/content-loss changes. A textual assertion alone never satisfies the behavioral acceptance requirement.

## Technical agreement

Status: Agreed; current exact `planning_packet_check` returned `ready` with no issues.

- Selected `proposal_id`: `bounded-guidance-startup`.
- `packet_id`: `P02`.
- `proposal_digest`: `c564dc540aef7e6b66d792d5f236ceb0480b047a6d64a4be010c637ed923679e`.
- `agreement_ref`: `{"id":"f114d948-e904-4dff-a75c-086cd1f0b75f","revision":2}`.
- Managed answer: revision 2 of `f114d948-e904-4dff-a75c-086cd1f0b75f`. The user explicitly accepted the P02/P03 startup amendment in the current host question. Original approval remains in history.
- Bound sources: `plan.md` / `Shared technical boundary`; this packet / `Technical proposal`; this packet / `Startup amendment technical proposal`.
- Agreement does not authorize execution, commit or publication. Original packet dependencies remain mandatory.

## Execution inputs

- Specification: `../spec.md`, Approved; Standard/core; no extra profile/design artifact.
- `source_version`: `76293b6d3f506fb927801c3b5f2bbd926b2ed0e03b82208d650ac98ff73af853`.
- `specification_version`: `b6b5db5ac1c359ed36ddcbce59d398ec3e4f49e993e1e14e4d9bd554fc764ff1`.
- `review_ref`: `63aeeff2-66e1-4eb9-bdc8-e624ec02fe52`.
- Working directory for commands: repository root. Recheck repository-relative evidence before execution.
- Require a usable Git worktree with readable tracked, staged and untracked state, the complete matching workflow bundle, local Node/npm and separately authorized execution of this exact packet. A clean tree or an existing commit is not required.
- Check required local runners before bulk reading. The planning host reports Node.js 24.20.0 and codex-cli 0.163.0; this is discovery evidence, not qualification of the pinned Linux runtimes or model capability.
- Before edits and before completion, use `specification_check_state` with the pinned source version and `planning_packet_check` with the actual accepted agreement reference and proposal digest. Use the accepted agreement reference and exact proposal digest recorded above.

## Outcome, prerequisites and scope

Make existing source/check reuse rules precise enough to avoid repeated work without suppressing required reads or validation. P01 must be complete, including the preserved pre-change workflow baseline and public traversal evidence. Its result supplies the verified review recipe; this packet does not alter the runtime.

Allowed authoritative areas: `shared/references/product-workflow.md`, `shared/references/test-discipline.md`, `skills/incremental-implementation/SKILL.md` and its `references/packet-recovery.md` only where demonstrated ambiguity requires a change. Generated shared copies and both host bundles change only through the existing generator. Tests are limited to relevant policy/skill tests, a proposed `tests/workflow-efficiency.test.mjs`, its bounded trace helper if necessary, and scenario fixtures under `tests/fixtures/workflow-loop/`. These proposed names identify a test boundary, not a new runtime API.

## Repository evidence and ownership

- `shared/references/product-workflow.md:97` already owns context preparation, full task validation and source consumption; lines 114–139 already forbid redundant reads/checks and preserve native binding transitions.
- `shared/references/product-workflow.md:238` owns independent review and batch/receipt/recovery rules.
- `skills/incremental-implementation/SKILL.md:10` already places bundle/Git/tool prerequisites before bulk reads; preserve them.
- `skills/incremental-implementation/references/packet-recovery.md:1` owns conditional recovery; its preservation and handoff sections already distinguish native/external/content changes.
- `tests/incremental-git-preflight.test.mjs:9` exercises both generated hosts and real Git behavior.
- `scripts/lib/captured-evidence.mjs:44` exports `verifyCapturedArtifacts`; `tests/lib/workflow-evidence.mjs:858` exports `verifyWorkflowEvidence`. Reuse applicable integrity/provenance rules, without copying an unrelated registry or claiming synthetic traces are actual-agent evidence.

Dependency direction: authoritative shared/skill text -> generator -> host artifacts; captured actual events -> bounded test evaluator -> assertions/report. Tests do not become a workflow state machine and never write managed YAML.

## Acceptance and test-first sequence

| Trace scenario | Required observation / rejected outcome |
| --- | --- |
| Complete immutable record used twice | Same actor/context and exact source identity: one complete delivery, then referenced reuse; a second delivery fails the efficiency assertion |
| Changed version, lost exact text, incomplete portion, independent actor | Necessary fresh delivery/continuation occurs; identity-name/text-only reuse fails |
| Repeated unchanged validation | Name purpose, accepted input identity and owning transition; omit only the extra duplicate; start/end pins and required read-back remain |
| Changed input/resume/conflict | Applicable fresh owning validation happens before dependent work; stale pass fails |
| Exact delivery unavailable | Supported retrieval or continuation, then blocked dependent action if unavailable; no encoding loop |
| Early missing prerequisite | Required initial identification/instructions occur, then blocker before bulk reads/production edits |
| Preservation | Accept exact expected native transition and directory-metadata-only change; inspect independent external edits; reject overlap, unexplained bytes or protected evidence loss |
| Current handoff | One concise current record links evidence; no transcript/inventory replication |

Add source-contract checks and evaluator positive/negative fixtures first. Mutate each of redundant delivery, incomplete receipt, suppressed owning validation, missing synchronization and accepted content loss independently; relevant assertions must fail. Correct the instructions at the single owning source, generate once, and validate both hosts. Keep already-correct rules unchanged. Actual-agent traces in P03 are mandatory before asserting agent behavior improved.

Existing commands and the explicitly proposed test:

```bash
rtk proxy node scripts/run-tests.mjs tests/incremental-skill.test.mjs tests/incremental-git-preflight.test.mjs tests/product-task-integration.test.mjs tests/host-project-instructions.test.mjs tests/workflow-efficiency.test.mjs tests/captured-evidence.test.mjs
rtk proxy npm run generate
rtk proxy npm run generate:check
rtk proxy npm run validate
rtk proxy git diff --check
```

The initial test command requires creation of `tests/workflow-efficiency.test.mjs`; absence of that file is not behavioral RED. Execute the same focused checks after generation, then affected PROVE cases. Keep entrypoint size, explicit-only invocation and cross-host metadata rules.

## Completion and recovery

Preserve unrelated staged/tracked/untracked work and the pre-existing response-budget correction. Inspect expected task writes, native transitions and independent external changes; never accept overlap or unknown content loss as a new baseline. Retain failed evidence and exact recovery notes. A changed source, conflict, lost acknowledgement or resume requires the applicable current check rather than reuse of stale progress.

Run the packet's required checks, compare the scoped diff with the agreed proposal, update only this packet's item in `todo.md` and replace the current `handoff.md`. Stop after the packet. Failed or unavailable required checks leave it incomplete. Revert only this packet's identified changes when rolling back; do not rewrite stored workflow history, restore another writer's files, install, commit or publish. Independent code/security review is optional and separately invoked.

## Startup amendment technical proposal

This WFE-009 extension supplements the existing Technical proposal and replaces
its existing-reference-only limit solely for the stage-specific extraction
described here. All other P02 guarantees remain binding. Preserve both existing
specification and technical-agreement gates at entry and completion; no server
API, checkpoint, legacy, approval, receipt or runtime validation change is part
of this extension.

Separate the ordinary execution reading path from authoring/review details
without maintaining duplicate normative instructions. Use two small
authoritative resources under root shared/references: workflow-state-access.md
for common scenario access, opaque contexts, source pins, exact delivery and
state ownership; implementation-context.md for selected-packet inputs and
conditional product-linked execution obligations. These are proposed units,
not existing files. Keep engineering-principles.md and test-discipline.md as
their existing authorities. Move applicable obligations rather than summarize
them away; retain exact cross-references to the conditional recovery owner.

The existing yaml-contracts.md remains the entry/router for specification,
planning and design state guidance, referring to common access rules instead of
copying them. product-workflow.md retains its other roles and routes execution
to implementation-context.md. The planning task-packets.md retains packet
authoring requirements and references the authoritative execution obligations.
Update the incremental skill's startup routing and affected source consumers
so each stage loads the applicable common/role obligations. Do not require an
implementation actor to read other-stage authoring or semantic-review details
merely to establish current approval. A single adequate extraction is preferred
over host-specific copies, a new framework, a summary cache or extra runtime
tools. Equivalent private section organization is flexible; these ownership
boundaries and existing mandatory rules are binding.

Extend only the existing distribution resource registrations, integrity markers
and manual verifier as necessary to package and validate the new exact assets.
Relevant existing units are sharedAssetsForSkill and collectReleaseSource in
scripts/lib/distribution.mjs, generateRepository in scripts/generate.mjs, and
the shared manual verifier. Retain rejection of missing, corrupt, unsafe and
mismatched resources and the complete matching bundle prerequisite. Do not
weaken an allowlist or integrity comparison to accommodate a missing asset.
Generate isolated host artifacts through the existing generator; never edit
generated copies. Keep the 4096-byte skill-entry limit and explicit invocation.

Before extraction, freeze source bytes and map each moved obligation to its
single owner, each affected reader and its trigger. This is a scoped review/test
artifact, not a new workflow-state journal. Adapt P02's bounded trace evaluator
to observe mandatory instruction deliveries, retained exact text and reasons
for conditional reads. Verify both positive routing and missing-rule/resource
counterexamples. Keep supported retrieval/continuation on incomplete text and
stop dependent work when exact delivery remains unavailable; repeated equivalent
rendering attempts do not qualify as recovery. A valid current pair of gates
must lead to the authorized packet without a new approval question or semantic
review unless an actual existing recovery trigger occurs.

Extend affected generation, bundle/manual-verifier, workflow-policy and
incremental tests, using discriminating RED/GREEN/PROVE as applicable. Run the
existing focused checks plus generation/check/validation and diff hygiene.
Source assertions support but do not replace P03's actual-agent qualification.
The candidate must reduce mandatory startup instruction bytes for the matched
normal scenarios while retaining complete source closure and all quality
outcomes. If the extraction contradicts an established obligation, correct the
extraction rather than drop the obligation or silently expand authority.

## Startup amendment state

Agreed through question `f114d948-e904-4dff-a75c-086cd1f0b75f`, answer revision 2. The accepted proposal digest
is `c564dc540aef7e6b66d792d5f236ceb0480b047a6d64a4be010c637ed923679e`. Both the original Technical proposal and this extension are
binding. Current specification and technical readiness are verified; execution
and packet dependencies remain separate prerequisites.
