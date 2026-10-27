# P04: Harness Qualification And Measurements

Status: Technical agreement ready; parent waiting included; implementation not started

## Approved inputs

Reviewed specification: `source_version` = `73f93f290e0ee7f969abc43af3121ea341dbe82a1db897896c27c678d09e7f43`;
`specification_version` = `969d6857c4f6decb623d7b60d841223057289f9dc0fb94f85fa4291f573ade2f`;
`review_ref` = `442a54a2-2c8a-4cf0-b3eb-44e9e77edb05`.
S0 is complete with these reviewed identities. Read exact NWF-002 through NWF-006,
NWF-008 through NWF-015, and NWF-007's direct-submission contract. P03 completion
is prerequisite evidence, not native/model qualification.

## Technical proposal

Candidate `P04-harness-parent-await-metrics-v5`, packet `P04`, includes
the exact `Shared technical commitments` heading of `tasks/plan.md`.

Add narrow opt-in `scripts/qualify-specification-review.mjs` and
`tests/specification-review-qualification.test.mjs`. Follow
`scripts/qualify-product-workflows.mjs`: importing has no execution effect,
`--run` is mandatory, clients/workspaces/outputs are explicit and owned subprocesses
are cleaned up after success, failure and cancellation. Reuse exported
`executeModelTrialProcess` only where its generic lifecycle contract fits; do not
reuse product enrollment, product state or hard-coded Codex route arguments.
The runner targets Harness only; no Claude launch/provider/provisioning branch.
No generic dispatcher, installer or provider manager.

Keep three evidence levels separate:

1. P03 controlled actors with real MCP processes; semantic answers are simulation.
2. Actual native parser/engine/hooks in Harness only: 0.2.1-rc.3 workflow/PTC
   at upstream commit
   `22ddee3792402c3e70ec5f86a63c3e3e895a2f60`. Inspect real callable schemas,
   permitted hook composition, independent worker loops, bounded concurrency,
   fresh child contexts and cleanup. Alternative versions require explicit
   compatibility reconciliation. A Node wrapper is not native qualification.
3. Real independent judging models in Harness with exact source consumption,
   direct saved submissions, final whole-context judgment and usage traces.
   Missing required Harness native/model evidence keeps the packet incomplete.
   Claude structure remains P02/P03 evidence; no Claude runtime/model trial is
   required or claimed qualified in P04.

Before live runs require explicit trial authority, isolated host/client state,
permitted actual model routes and a local test MCP endpoint. Harness parent
performs actual route discovery and synchronous user choice before dispatch.
Do not infer model/provider consent from plan approval. Do not install clients,
copy credentials, alter global settings, refresh/register shared MCP or target a
real existing review to satisfy qualification. `dsh` was absent from PATH;
Claude client/model/provider availability is not a P04 prerequisite. Provisioning is a
manual gate with an owner still to be established.

Proposed workload: in Harness, one large paired comparison of ordinary sequential
independent review and the native flow on the same frozen synthetic inputs with a
retained-ID clause omission, plus two compact native controls (equivalent paraphrase;
cross-section conflict). This is four complete model reviews, with no Claude live
trial. Use the same permitted model/effort and MCP reader build for compared roles.
Disclose route differences/confounds and do not attribute them only to orchestration.
No repeated billable trials, provider changes or additional model matrix without
explicit scope. Lower-cost candidates still require actual user route choices
and the same semantic controls; price is not suitability.

Verify the main agent's single preparation call, separate actual session-native/
model checks and prepared argument handoff without an inspection child. Include
blocked/completed preparation, server-ready but host-unavailable behavior, source
drift after preparation and fresh preparation on recovery. Controlled engine
checks cover adaptive 1–4 admission, varying weights and continuation beyond 160
items without adding live model trials to the proposed four-review Harness workload.
Observe every judging actor's own exact reads/continuations and submissions,
retained source-linked gaps, saved-ACK timing, another lane's progress during a
slow submission, and final whole-context judgment only after all required saves.
Verify actual engine cancellation/new invocation, source drift and native limits.
A deliberate intervening MCP change must be observed on a fresh run; do not use
cached child output as fresh MCP state or promise Harness journal resume.
Claude replay remains an unqualified runtime note, not a P04 live-trial gate.
If supported native hooks cannot implement independent loops, report the failure
and return architecture to planning rather than quietly restoring barriers.

Measure read calls, complete serialized response bytes, repeated source delivery,
scenario-handler time separately from transport/inference, server lock waiting,
submission/save/ACK latency, lane idle time and actual overlap. Count author/parent,
judging and final actors' turns and exposed input/output/cache tokens, including
the preparation call, main-agent host checks and preparation response bytes,
plus end-to-end time. No inspection or writer
actor is launched. Mark unavailable metrics unknown;
child delegation alone is not token savings. One paired workload cannot establish
universal or statistically reliable acceleration. Keep explicit opt-in entry even
if measured faster; default promotion is outside this packet.

Write redacted reproducible results and concise interpretation under
`docs/evidence/specification-review-native-workflow/`. Keep raw traces private and
outside published files. No credentials, opaque contexts, personal paths or full
runtime-source dumps. Required failed/unavailable evidence stays incomplete with
a concrete next action and established owner; never weaken acceptance to pass.

Bind the exact `Final-stage efficiency and recovery` heading in `tasks/plan.md`.
Within the existing four-review Harness workload, observe one-call final preparation
and actual final-actor support for exact programmatic pagination. Record ordinary
read fallback when unsupported, and count preparation/delivery/completion calls,
actual turns and exposed tokens. P03 owns deterministic interruption/recovery and
invalidation controls; add no billable reviews and claim no extra live semantic
evidence. Do not rejudge a fresh saved assessment merely for another measurement.

Bind the exact `Workflow ownership and parent waiting` heading in `tasks/plan.md`.
Within the existing four Harness reviews, retain a parent trace showing one
foreground workflow call, no parent polling/coordination turns while it is pending,
and resumption after its terminal result. Observe native cancellation/cleanup and
count all actual turns. Add no billable trial, polling actor or fabricated wakeup.

## Technical agreement

Selected `proposal_id`: `P04-harness-parent-await-metrics-v5`; `packet_id`: `P04`.
`proposal_digest`: `e06d21e9af3745f82c2bf30c007f92eb7dce2e4b1f038656827cb5e1b04469bc`.
Exact `agreement_ref`: `2edffc92-63d8-41fa-a5dd-455a309a2f12`, revision 10.
Current managed question: `2edffc92-63d8-41fa-a5dd-455a309a2f12`, revision 10.
MCP `planning_packet_check`: `ready` against the Approved inputs above.
Exact source headings: `Technical proposal` (04_native_host_trials.md),
`Shared technical commitments` (plan.md),
`Final-stage efficiency and recovery` (plan.md),
`Workflow ownership and parent waiting` (plan.md).

The current direct user instruction explicitly requires parent handoff, no
status-polling model turns and foreground waiting for the verified Harness call.
Each managed revision preserves the actual instruction and its provenance;
no new native-question response is claimed. Earlier accepted choices remain in
their immutable history. The four Harness reviews are unchanged. Recheck exact
bindings before/after execution. Technical readiness grants no implementation,
live-trial, installation, shared-runtime refresh, commit or publication authority.

## Delivery details

### Prerequisites and allowed writes

Require S0, completed P03 and its P00/P01/P02 dependencies, new agreement and
separate P04 execution/trial authority. Reverify
`scripts/qualify-product-workflows.mjs:75` and P03's real transport fixtures.
Inspect tracked/staged/untracked overlap in a usable Git worktree; no clean-tree
or commit requirement. Verify actual local schemas and pinned host evidence at
execution; no new assumption of undocumented SDK/direct-MCP APIs in native code.

Allowed future writes: the narrow runner, its focused tests, redacted evidence
under the feature-specific evidence directory and this bundle's checklist/handoff.
Only isolated temporary client/MCP resources may be mutated during trials.
No production templates/renderer/MCP fixes are silently included; report owning
packet failures and reconcile separately.

### Test-first acceptance and gates

Create discriminating runner checks before implementing it: import/no-`--run`
causes no process, no live client/route effect without explicit inputs, failure
and cancellation release owned resources, redaction excludes contexts/secrets,
metrics distinguish missing from zero. Observe relevant RED and use PROVE for
absence/cleanup assertions, restoring all mutations. Controlled tests do not
replace the actual Harness engine or the four semantic reviews.

Repository root; later deterministic command after creating the test:

```bash
rtk proxy node --test tests/specification-review-qualification.test.mjs
rtk proxy git diff --check -- scripts/qualify-specification-review.mjs tests/specification-review-qualification.test.mjs docs/evidence/specification-review-native-workflow docs/specs/specification-review-native-workflow/tasks
```

**MANUAL GATE — native engines/models:** record actual prepared client commands,
local endpoint, confirmed routes, synthetic fixture identities and permitted
trial scope before running the opt-in utility. Do not fabricate a copy-ready live
command before those inputs exist. All required Harness native/semantic/control and
cleanup results must be recorded; unavailable clients/providers are incomplete,
not successful simulations. No installation authority is implied.

Recheck specification/technical binding, review scoped evidence, update checklist
and current handoff, and stop after P04. Record limits honestly; no shared-server
refresh, global mutation, commit or publication. Rollback removes only known
runner/evidence changes and owned temporary resources; it does not undo billing
or saved external effects.
