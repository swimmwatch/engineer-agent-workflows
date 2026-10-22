# P03: Controlled Workflow and Native Qualification

## Technical proposal

Requirements: WFE-001 through WFE-008. The shared technical boundary in `plan.md` is binding. P01 and P02 supply candidate behavior and local checks; their completion is a prerequisite.

Reuse `benchmarkRetirement` for isolated paired public-stdio measurements and direct mode only as a separately labeled source-read diagnostic. Compare the retained baseline and candidate on identical full/recheck/followup fixtures, with identical response-budget behavior, source size, verdict policy and required outcomes. Use two repetitions in alternating baseline/candidate order and report each result, median and range descriptively. Counts and complete-byte metrics are acceptance evidence; wall-time samples are not a promised live speedup. Keep failed trials and corrective reruns as distinct identities. Count actual public operations, distinguish advancement/status-recovery/observer purpose, and do not replace removed status with another progress poll.

Run fresh-context controlled Codex agent traces against frozen isolated fixtures and actual MCP. Use the current actual model/settings consistently for compared agent runs and record the exact identity and client version, without inventing a model baseline. Cover same complete source used twice; version change; exact-text loss; incomplete source portion; independent reviewer; unchanged versus changed check inputs; uncertain record acknowledgement; scope change/concurrent observation; missing prerequisite before bulk reads; native/external/directory-metadata preservation; overlap/content-loss rejection; and compact handoff. Reuse captures only when they observe every required assertion. Fixture answers are explicitly simulated, not human authority. Deterministic fault injection may control the local delivery conditions but must not script the agent's choices or claim external compression-service qualification. Q14 remains cancelled. No semantic review success is inferred from scripted verdicts.

Adapt existing trace/capture mechanisms locally for these scenarios and evaluate them through P02's bounded assertions and `verifyCapturedArtifacts`. Preserve raw events, input hashes, actor identities, exact continuation receipts, output state and failure provenance privately; publish only redacted derived evidence and integrity references. Measure fixture/server wall time, tool duration sums and interval overlap separately from model-stage time and observed human waiting. Unknown time or token values are unavailable, not zero. No time threshold or global latency claim is introduced.

Run the two Linux runtime cells (Node.js 22.20.0 and 24.14.0) on the exact changed implementation snapshot using existing public/packed/transport/recovery tests and qualification entry points, plus P01's affected regression tests. A prior snapshot's platform pass does not transfer. Do not run macOS/Windows qualification or update the old cross-platform snapshot workflow for this workstream. Do not push, install or trigger remote work under planning authority. Verify generated host isolation, retained evidence compatibility, unchanged wire budgets, Unicode/continuations, failures and cancellation. Missing required Linux results keep P03 incomplete; native macOS/Windows checks are excluded, not passed.

Write `docs/evidence/workflow-efficiency-followup.md` with scoped redacted captures below the corresponding evidence directory. Evidence must separate new optimization, preserved safeguards and the pre-existing budget correction. Any correction discovered here stays within the agreed P01/P02 boundaries and receives a new capture identity; a material technical or behavioral change returns to its owning workflow. No new benchmarking platform, public API or live-store replay is authorized.

## Technical agreement

Status: Agreed; current exact `planning_packet_check` returned `ready` with no issues.

- Selected `proposal_id`: `startup-qualification`.
- `packet_id`: `P03`.
- `proposal_digest`: `bf8c2ccd7978c1e7b1876c10ff0831f66bfaac6ab835cb74ec17afda66bcbfbc`.
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

Prove operation reduction with equal accepted outcomes and verify the scoped candidate on Linux. P01 and P02 must be complete with restored PROVE mutations and retained baseline/candidate identities. Require actual Codex execution and capture capability, isolated fixture/store/home roots, both pinned Linux Node executables and any prerequisite installation authority before bulk trial reads. The discovered Node.js 24.20.0 and CLI version do not establish those capabilities. No macOS/Windows run is required or authorized for this workstream.

Allowed changes: scoped qualification/capture sources and redacted reports under `docs/evidence/workflow-efficiency-followup/`, its top-level Markdown report, and bounded fixes to the agreed P01/P02 areas if a required trace exposes a defect. Do not modify an old qualification result, old WR-014 workflow, production storage or global configuration. Private raw captures remain outside the repository; published sources/metrics are scrubbed of machine paths, credentials and unrelated transcript data.

## Existing entry points

- `scripts/benchmark-roadmap-retirement.mjs:15`: `benchmarkRetirement`; public stdio and separately labeled direct diagnostics, with complete-envelope counters at lines 81–94 and totals at lines 199–205.
- `packages/engineer-agent-workflow-mcp/test/product-retirement-efficiency.test.mjs:175`: existing public-stdio fixture/profile evidence, inherited coverage and preserved activation observations.
- `scripts/qualify-product-workflows.mjs:211`: `qualifyProductWorkflows`; its `--run --skip-model-trials` mode supports deterministic public/native checks. This mode does not prove agent behavior.
- `scripts/qualify-product-workflows.mjs:47` and `:75`: existing isolated Codex argument/process helpers; reuse their relevant timeout/output/cleanup contracts, with the scenario's actual required tools.
- Existing captured controller patterns: `docs/evidence/technical-implementation-planning-precision-v3/sources/`. Reuse verified capture/provenance mechanisms, not their historical results, fixture consent or hard-coded model selection.
- P02's scoped evaluator and `verifyCapturedArtifacts` own trace assertions/integrity. A local scenario capture adapter is proposed evidence code; it is not an existing command or a new benchmark platform.

## Scenario matrix and evidence

| Group | Cases | Acceptance |
| --- | --- | --- |
| Serial protocol | Full, bounded recheck and corrections-only followup; multi-batch/portion, inherited verdict and terminal pending page | Candidate advancement-status count 0, lower total public calls than its equivalent baseline, equal accepted coverage/findings/consistency |
| Source delivery | Same source twice; changed version; lost exact text; incomplete portion; independent reviewer | Fewer redundant deliveries only on eligible reuse; all other required reads occur |
| Validation | Same inputs; changed source/local inputs; resume/conflict | Only demonstrable duplicate omitted, owning validation and post-mutation observation retained |
| Recovery | Interrupted read; lost write acknowledgement; changed scope; concurrent observer; exact retrieval unavailable | Exact synchronization/evidence or explicit blocked action; no invented progress, duplicate effect or encoding loop |
| Execution hygiene | Missing prerequisite; native transition; external edit; directory metadata; overlap/content loss; compact handoff | Early prerequisite stop, correct classification, protected content preserved and concise current state |
| Compatibility | Retained records/old consumers, budgets, Unicode, corrupt sources, failures/cancellation, generated hosts | Existing public contracts and all affected regressions pass on both required Linux runtimes |

Use two alternating baseline/candidate repetitions for each public performance fixture. For controlled agent behavior, use a fresh context per scenario/variant; pair the eligible reuse/duplicate-check cases on identical fixtures and record all required safety cases on the candidate. An independent-reviewer scenario uses a separate actor with its own exact consumption. Record actual model/settings, client/runtime, source digests and actual commands. Reuse one capture for multiple assertions only when every observation is present. Unsupported or missing observations are incomplete, not successful.

The local capture adapter must preserve raw timestamps/call boundaries, input/output identity and real source deliveries. It passes captured events and independent final-state observations to P02's evaluator. Test its observation surface with known calls/bytes/intervals and the specified negative fixtures before accepting a trial. Deterministic fault injection controls environment/delivery only; actual agent choices remain unscripted. Keep actor/model stages, fixture/server wall time, tool-duration sum, overlap, setup and observed human waiting distinct. Unknown metrics remain unavailable. A simulated respondent is not observed human waiting.

## Commands and execution order

1. Preflight both Linux runtimes, actual model/capture capability and isolated roots. Establish the private output root as `WFE_CAPTURE_ROOT` and benchmark output root as `WFE_EVIDENCE_DIR`; these are local execution inputs, not global configuration.
2. Validate the scoped capture adapter and oracles before comparison. Proposed adapter invocation, only after writing and verifying that evidence artifact: `rtk proxy node "$WFE_CAPTURE_ROOT/run.mjs" --scenario source-reuse --variant candidate`. It must enumerate and execute the cases above with the pinned inputs; preserve the exact invocation/result for each case. The name is private/flexible, but required observations are binding.
3. Run matched baseline/candidate benchmark copies in their own frozen source roots. Existing invocation shape:

```bash
rtk proxy node scripts/benchmark-roadmap-retirement.mjs "$WFE_EVIDENCE_DIR/full-1.json" full stdio 30 --representative --findings --profile
rtk proxy node scripts/benchmark-roadmap-retirement.mjs "$WFE_EVIDENCE_DIR/recheck-1.json" recheck stdio 30 --representative --findings --profile
```

Use distinct names per source variant/repetition; findings exercise followup. Never overwrite a failed result. Direct-mode diagnostics use their own output names and do not replace stdio acceptance.

4. Under each of Linux Node.js 22.20.0 and 24.14.0, select the already authorized exact executable environment and verify `rtk proxy node --version` before these existing commands:

```bash
rtk proxy npm run build
rtk proxy npm run generate:check
rtk proxy npm run lint
rtk proxy node scripts/run-tests.mjs packages/engineer-agent-workflow-mcp/test/product-e2e.test.mjs packages/engineer-agent-workflow-mcp/test/packed-artifact.test.mjs packages/engineer-agent-workflow-mcp/test/transport.test.mjs packages/engineer-agent-workflow-mcp/test/product-session-recovery.test.mjs packages/engineer-agent-workflow-mcp/test/product-actor-lifecycle.test.mjs packages/engineer-agent-workflow-mcp/test/product-review-efficiency.test.mjs packages/engineer-agent-workflow-mcp/test/product-retirement-efficiency.test.mjs packages/engineer-agent-workflow-mcp/test/product-context.test.mjs tests/workflow-efficiency.test.mjs
rtk proxy node scripts/qualify-product-workflows.mjs --run --skip-model-trials
rtk proxy npm run validate
rtk proxy git diff --check
```

5. Verify derived metrics against raw captured children/call events and hashes. A wrapper exit alone is insufficient evidence. Produce the report and identify every required case as pass/fail/unavailable, with excluded macOS/Windows runs clearly separate. Run the full existing suite once for the final candidate when the affected shared test helper/guidance has repository-wide consumers; do not repeat successful unchanged checks without cause.

## Manual gates and rollback

Missing runtime/authentication/capture prerequisites require their established owner/authority; do not install globally or silently substitute another version. Remote CI, commits, publication and consumer-project mutation remain outside this invocation. An unavailable required Linux or actual-agent run leaves P03 incomplete. If measurements expose a defect, retain the failed identity, fix only agreed ownership areas with relevant RED/GREEN/PROVE and rerun affected scenarios. Material architectural or acceptance changes return to planning/specification.

## Completion and recovery

Preserve unrelated staged/tracked/untracked work and the pre-existing response-budget correction. Inspect expected task writes, native transitions and independent external changes; never accept overlap or unknown content loss as a new baseline. Retain failed evidence and exact recovery notes. A changed source, conflict, lost acknowledgement or resume requires the applicable current check rather than reuse of stale progress.

Run the packet's required checks, compare the scoped diff with the agreed proposal, update only this packet's item in `todo.md` and replace the current `handoff.md`. Stop after the packet. Failed or unavailable required checks leave it incomplete. Revert only this packet's identified changes when rolling back; do not rewrite stored workflow history, restore another writer's files, install, commit or publish. Independent code/security review is optional and separately invoked.

## Startup amendment technical proposal

Add WFE-009 qualification to the existing Technical proposal without changing
the agreed Linux-only runtime matrix, isolated captures, public MCP path or
quality boundaries. P02's accepted startup extraction and focused checks are
prerequisites. Existing reference names in the original proposal refer to their
new authoritative owners after that extraction; no missing obligation is
implicitly waived.

Extend the bounded evaluator/capture adaptation already proposed in P02/P03;
do not introduce a benchmark service or a second evidence framework. Capture
baseline and candidate from frozen complete source/generated bundles, preserving
the pre-existing response-budget correction. For matched standalone and
product-linked ordinary entry, compare mandatory instruction bytes, source
delivery/continuation counts, repeated rendering attempts and unnecessary
other-stage reads. Preserve and report all required source and quality outcomes.

Exercise retained exact context, cold context, compaction/lost text, interrupted
delivery, changed source, missing/revoked agreement, conflict/resume, legacy
evidence, missing local tools and incomplete checks. Existing gates and native
start/completion validation stay in place. Known controlled faults may affect
delivery or fixtures, not script the agent's decisions or certify an external
compression service. Keep independent actors and source-completeness obligations.

Record user-invocation boundaries and distinct timestamps for instruction
delivery, readiness request/result, first relevant code exploration, baseline/RED
test, native start, edit and completion. Tool duration sums, overlaps, human
waits and unknown gaps remain separate. The observation checker must reject
a later turn's gate assigned to an earlier invocation and a request timestamp
represented as a completed result. Count useful exploration before native start
as work. Preserve failed/active trials and do not compute latency percentiles
from unvalidated invocation indexes.

Use discriminating negative fixtures for a missing required instruction/gate,
stale evidence reuse, cross-stage reread, repeated rendering and incorrect event
boundaries. A smaller file set or passing wording test alone is insufficient.
Report the actual measured reduction and residual delay in the existing
workflow-efficiency evidence report, without an absolute latency promise.
P04 documents only verified routing and results after P03 completes.

## Startup amendment state

Agreed through question `f114d948-e904-4dff-a75c-086cd1f0b75f`, answer revision 2. The accepted proposal digest
is `bf8c2ccd7978c1e7b1876c10ff0831f66bfaac6ab835cb74ec17afda66bcbfbc`. Both the original Technical proposal and this extension are
binding. Current specification and technical readiness are verified; execution
and packet dependencies remain separate prerequisites.
