# I11 — Qualify the integrated public and packaged workflow

Status: COMPLETE — I11/Q16 passed for commit ba1e3afdc019e9ee2251387d1bac884024985cb3, tree e6bd69a668605d393771cceee1313a4d391c4647, run39231775734; Q14 cancelled, never passed
Dependencies: I01, I02, I03, I04, I05, I06, I07, I08, I09, I10
Requirements: WR-001, WR-002, WR-003, WR-004, WR-005, WR-006, WR-007, WR-008, WR-009, WR-010, WR-011, WR-012, WR-013, WR-014
Quality scenarios: Q15, Q16

## Exact inputs and preflight

- Project: this repository; specification slug `workflow-reliability-remediation`.
- source_version: `d6499cf2486dbf002516f0977d1f9f951a9bce97eadc44e553f99d035561aae4`
- specification_version: `b070eb5dd558d766ddfa61945c90e53d9b586a07d90a4ee8795d21b68b61fa28`
- review_ref: `e5bb7cd9-cd51-42a3-bb29-0ff4acc5b383`

Current acceptance inputs were rebound on 2026-10-19 after the explicit user
decision to exclude Headroom. Q14 is CANCELLED / NO LONGER REQUIRED, never passed.
No service ownership, registered external-connection identity, automatic-path capture
or external test remains a delivery obligation. Generic MCP integrity (WR-012/Q13),
safe recovery, response limits and all four actual native combinations remain required.
Historical execution/review evidence retains its original source, specification and
review pins; rebinding does not relabel old tests as newly executed. The prior current
pins were source `80aaa57b348e0c17731b6f9f23f9d92cd0826a3d1fe0ada37a9806e1edd30767`,
specification `113ef10ec396f650c5d6f66d93e7dedc131faf1c1512717f54ec5da756a63dfd` and
review `8090f5b2-5a46-4511-9774-32295157cf1f`.

Working directory for every command: repository root. Node.js >=22.20.0 and the
repository's existing pinned dependencies are prerequisites. Before work and
completion call specification_check_state with the pinned source_version; fetch
only WR-001, WR-002, WR-003, WR-004, WR-005, WR-006, WR-007, WR-008, WR-009, WR-010, WR-011, WR-012, WR-013, WR-014 through requirement_get using the pinned specification_version,
following every text/reference continuation. Read [C11](../contracts/mcp.md#c11--qualification-and-compatibility) and only the named entries in [quality/scenarios.yaml](../quality/scenarios.yaml).
These versioned contracts, not chat history, are the acceptance inputs.

Require a usable Git worktree with readable status and scoped tracked, staged and
untracked evidence. No clean tree or existing commit is required. Capture the
pre-edit state, preserve unrelated changes and reverify the source passages below.
Local integration readiness means recorded passing local acceptance evidence for
I01-I10; I10 repository Q13 acceptance is retained and external Q14 is cancelled. A checked label
or a commit is not evidence. Full I11 requires every stated qualification result.
Also update only this packet's execution evidence, todo.md and current handoff.md.

## Outcome, boundary and scope

Owner: End-to-end public workflow, package and supported-platform verification.
Allowed production ownership: Existing `test/product-e2e.test.mjs`, `test/support/product-e2e-harness.mjs`, `test/packed-artifact.test.mjs`, transport and root packaging/lifecycle path tests; no production behavior outside a reproduced scoped defect. The bounded one-commit/four-job CI grant was consumed by the exact reviewed snapshot. No new CI delivery or release-automation change is authorized by this local correction.
Paths beginning src/, test/ or test-support/ in this packet are relative to
packages/engineer-agent-workflow-mcp/; all other paths are repository-relative.

Evidence to reverify: `packages/engineer-agent-workflow-mcp/test/support/product-e2e-harness.mjs:385` runs the product flow; `scripts/run-tests.mjs:15` forwards explicit test paths with bounded concurrency; package scripts build before tests. `docs/product-workflows.md:263` documents Linux/macOS/Windows support and qualification limits.

Implementation boundary: Extend the existing isolated product flow to use MCP-first session handling, draft reads and explicit hashes, then perform the 119-block recheck with separate author/reviewer actors. Run packed artifacts, not just source imports. Exercise old consumer/default outputs and old retained evidence. Validate actual-platform execution separately from path simulations. Do not turn this packet into a performance optimization project.

Non-goals: unrelated worktree changes; changing approved behavior or scope;
global configuration, installation, commits, releases; hand-editing generated
bundles or MCP-owned workflow YAML; executing any next packet. New behavior is
not authorized until this packet is explicitly invoked.

## Current local correction — I11-N6 (2026-10-19)

Status: LOCAL_COMPLETE; final independent reviews/root acceptance pending. Native Q16 remains incomplete.
WR-013/WR-014, C11/Q16 and the exact approved source/specification/review pins above
govern this diagnostic-only correction. Fresh owning MCP checks must remain
pass/reviewed/Approved before execution and completion. No specification change.

### Evidence and objective

Published baseline is commit `7aa9c0b886522c23ace4728d702138d3dfa43f9f`, tree
`3a72313e5619d9700dec3beb95c6d9ce8b5f8fdd`. The sealed
[diagnosis](../../../../artifacts/workflow-reliability-remediation/windows-q36-followup-diagnosis/report.md)
has report SHA256 `06528301d112b0bc2631cbfa5dfc8b955797b6c3befeb15b177f512e769ea685`,
freeze `75724e833ef9e4992520d4ae6aa19d66ef0b991c55f70dba04240cf658bea8e2`.
It verifies14 exact inputs and16 evidence members. Win22 run39221641935 is78/80:
one nested alias Q36 public child and its parent failed; native CLI skipped.
Three other native jobs passed. Historical inner cause and timer attribution are
unproven. Tiny owned Linux controls demonstrated that timeout and self-signal
can share the visible ERR_TEST_FAILURE/stack; they are not native qualification.

The proven defect is loss of discriminating execFile fields/captured inner TAP
at the alias-test reporter boundary. Expose a bounded safe failure event, then
rethrow the identical original error. A diagnostic improvement neither fixes an
unknown Win22 cause nor completes Q16. Never infer timedOut from elapsed/killed.

### Workspace and exact output scope

The separately invoked incremental-implementation author uses a NEW isolated
checkout at published7aa9. The existing `windows-cleanup-diagnostics-delivery/checkout`
under this artifact root is a read-only source; main remains the owning MCP
specification project. Preserve main HEAD/index/unrelated changes, frozen N5 source
and evidence, and the prior33-binding planning freeze through saved historical
preimages. Capture tracked/staged/untracked evidence and candidate preimages.
Read only WR-013/WR-014 exact continuations, this N6 section, C11/Q16 and the sealed
diagnosis/source passages. No new docs overlay is assumed or copied from main.

Choose the smallest sufficient subset of exactly these existing candidate paths:

- `packages/engineer-agent-workflow-mcp/test/product-e2e.test.mjs`
- `packages/engineer-agent-workflow-mcp/test/support/qualification-diagnostics.mjs`
- `packages/engineer-agent-workflow-mcp/test/qualification-diagnostics.test.mjs`
- `.github/qualification/workflow-reliability-inputs.json`, exact final changed-input hashes only.

No new helper/module is warranted: the existing diagnostic owner can project the
failure while the actual alias exec boundary observes it. No production38src/
83runtime, dependencies, workflow, scripts, recovery/lifecycle helper, workload,
skip, retry or time-budget change. Keep child90000ms, outer120000ms, maxBuffer1MiB,
the same Node/arguments/patterns/environment (including removed NODE_TEST_CONTEXT),
two sequential case launches, assertions, temporary alias ownership and cleanup.
No extra MCP calls or child runs in the real qualification path. Tests may create
bounded owned synthetic direct children in disposable isolated locations only.
Retain all80 original native-selected cases and their assertions; report any
added N6 diagnostic regression cases separately rather than hiding or replacing
the original workload.

### Boundaries and finite diagnostic contract

| Existing owner | Inputs and output | Invariants / dependency / proof |
| --- | --- | --- |
| Alias exec boundary, `product-e2e.test.mjs:34–59` | Finite case, actual configured timeout, measured elapsed and rejected original execFile result → one safe event then same rejection object | Keep launch arguments/environment/count, 90s/120s/1MiB, success stderr/pass/fail assertions and cleanup unchanged. Tests reach the actual alias owner, not only a projector. |
| Existing `qualification-diagnostics.mjs` | Owner-selected finite metadata and own data fields → bounded JSON diagnostics | No arbitrary property/message/stack/raw stdout/stderr/path/env/PID/context. Do not invoke getters, toJSON or hostile proxy traps. A missing/throwing sink/classifier cannot mask the original error or change later case/cleanup behavior. Test-only owner; no runtime dependency/API. |
| Existing diagnostic regression suite | Real tiny execFile children plus hostile controlled values / actual-owner wiring → assertions and native TAP observations | Preserve identity, availability/null/false distinctions, output bounds, exact counts and success behavior. Synthetic controls are not native product passes. |
| Qualification inventory | Saved final candidate bytes → exact hashes using unchanged verifier | Preserve all other inputs/tracked inventory; no future-tree pass from N5 or unverified overlay. |

Use a finite event `qualification-child-failed` and finite case labels for public
qualification/session recovery. Fields record the configured deadline and finite
nonnegative elapsed; original own code (null, safe numeric integer, or an explicit
finite allowlist including observed maxBuffer/abort/spawn codes), allowlisted
signal, and killed boolean when present. Unknown values are fixed redactions.
Missing, explicit null and false remain distinguishable; never coerce them to a
single falsy value. Stdout/stderr contribute byte counts and a safe bounded inner
TAP summary only, never their text. Summary fields may contain only recognized
terminal numeric counts, no arbitrary test name, assertion, error or quoted line;
absent/incomplete/malformed summaries stay explicitly unavailable, not success.
Parse a bounded tail (at most8KiB) and limit the whole event to2KiB; handle invalid
or oversized inputs with fixed availability/redaction markers. Projection is
observational and cannot replace protocol/test verdicts. Access only known own
data descriptors; reject proxy/accessor/hostile inputs without invoking them.
No timer-fired classification is added. Precise future timer provenance would
require separately justified causal instrumentation, not an elapsed heuristic.

### RED, GREEN, PROVE and proportional verification

Working directory: new isolated checkout root. Use available exact Node22.20.0 and
24.14.0 with existing dependencies; before subprocesses set isolated homes/config/
cache/temp roots as in N5 runner-env, using NEW locations. No install. Record
executable/version/commands, PIDs, logs, terminal exits and source hashes.

1. Write the discriminating actual-owner regression first. A controlled rejected
   execFile at the real alias boundary must emit the finite fields/case and safe
   inner TAP while preserving exact original error identity. Use tiny owned real
   children for numeric exit, bounded timeout, stdout overflow and supported
   self-signal; include abort/cancellation and successful child controls. Exercise
   both actual case labels. Disposable controlled instrumentation may replace
   only the two known alias child bodies with tiny owned scripts while checking
   the original requested Node/args/options/case order; add no permanent runtime
   fault knob. Preserve the untouched baseline and all real-path assertions.
   Observe assertion RED because current actual owner emits no failure event;
   an import/harness error or formatter-only check is not this RED. Both Linux
   pins must execute relevant controls. Tiny control deadlines do not alter the
   real90s/120s qualification limits.
2. Add only the diagnostic projection/connection and rethrow the identical error.
   GREEN must retain original numeric/null/unknown code, signal and killed states,
   stdout/stderr byte sizes and bounded available/unavailable inner counts. For
   throwing sink, missing sink, malformed/accessor/proxy values and private canaries,
   the original rejection and cleanup/case observations remain identical.
3. In disposable exact-candidate copies, PROVE the intended assertions by separately
   disconnecting actual-owner reporting, replacing the original error, masking it
   with a sink failure, collapsing missing/null/false, leaking a private field/raw
   output and substituting timeout attribution from duration/killed. Test code and
   valid assertions remain fixed. Each defect must trigger its intended assertion;
   restore all candidate bytes. Successful controls cannot be omitted to obtain GREEN.
4. Before expensive runs, inspect final diff/static launch invariants and run
   `rtk proxy npm run lint`, syntax checks, focused N6 controls and exact-input
   verifier plus isolated changed/omitted/unapproved-input negative controls. Bind
   only final changed hashes in the existing manifest. No workflow/validator weakening.
5. On both pins run the focused owning diagnostic/lifecycle suites with
   `rtk proxy node scripts/run-tests.mjs packages/engineer-agent-workflow-mcp/test/qualification-diagnostics.test.mjs packages/engineer-agent-workflow-mcp/test/product-actor-lifecycle.test.mjs`.
   Run direct Q36 plus the real alias path, preserving their inner assertions:
   `rtk proxy node --test --test-name-pattern="^(Q36:|I11-N1: public and recovery fixtures accept a temporary parent alias$|I11-N6:)" packages/engineer-agent-workflow-mcp/test/product-e2e.test.mjs`.
   The selector avoids the unchanged119-block reliability and packed workload.
   If shared diagnostic initialization/existing export semantics or after-only
   consumer behavior changed, run the actual
   `rtk proxy node scripts/qualify-product-workflows.mjs --run --skip-model-trials`
   on both pins; otherwise justify reuse with exact unchanged-owner/behavior evidence
   and the actual Q36 after-only execution, without claiming a fresh CLI entrypoint run.
   No blanket full packed119/six-suite/build rerun without a demonstrated shared reason.
6. Recheck specification pins, unchanged source/runtime/dependency/workflow and
   launch/deadline/assertion/cleanup guards, scoped diff/links and final input verifier.
   Freeze final source/patch/tree/evidence, preimages and all reused domains. Missing
   terminal receipt or required failed check remains incomplete. Update only N6
   result/current checklist/handoff and stop. Root separately invokes independent
   code/security reviews of the frozen result, resolves material findings and
   repeats only affected checks before any next packet.

### N6 local execution result — 2026-10-19

The isolated published7aa candidate changes only the four allowed paths. The
[author report](../../../../artifacts/workflow-reliability-remediation/windows-q36-diagnostics-correction/report.md)
and frozen bindings identify the exact source and evidence. Actual alias-owner
RED observed zero failure events instead of two on both pinned Linux runtimes;
the corrected owner preserves the identical rejection and reports finite safe
fields. Real controlled children cover exit7, timeout, overflow, abort, supported
self-signal, success and throwing/missing sinks for both case labels. Initial
fixture errors were repaired and excluded from behavioral RED.

Preliminary code/security review found three observation defects: a success
control could hide a failed native runner, accessor markers acquired fabricated
byte counts, and a tail clipped midline could fabricate a summary line boundary.
All three have discriminating checks and minimal corrections. Final focused
diagnostic/lifecycle checks pass27/27 on each Node22.20.0/24.14.0 Linux runtime;
22 PROVE controls detect11 isolated defects across both pins. Actual direct Q36
plus the real two-case alias path pass4/4 on each pin, with zero failures,
cancellations or skips. Other product tests were excluded by the explicit selector.
Lint, syntax, exact inventory and changed/tampered/omitted/unapproved-input controls
pass. The inventory remains751 entries/752 tracked paths; only three existing
source hashes change. Original80 native-selected cases are preserved; N6 adds12
Linux/macOS diagnostic cases or11 Windows cases (self-signal control unsupported).

The original diagnostics exports, CLI wrapper, qualification harness and after-only
adapter are unchanged; actual Q36 exercises that adapter. Prior CLI entrypoint
results are reused only in their historical domain, never relabeled as a fresh
run. No packed119/full-suite/build/CLI-entrypoint rerun was warranted. All38 source
and83 frozen N5 runtime files, dependencies, workflow, arguments/environment,
90s/120s/1MiB bounds, workload, success assertions and cleanup guards remain intact.
Fresh owning MCP checks are pass/reviewed/Approved at the pinned versions.

The historical Windows22 failure cause remains unknown. Local diagnostic readiness
does not close Q16 or full I11. Root owns final exact-freeze code/security acceptance,
then I12-R1 and final composition; no new public/service/global action is authorized.

### Composition, recovery and publication gate

No store migration/runtime rollout. Rollback restores only N6 candidate preimages.
The user-authorized sequence is N6 implementation → independent final reviews →
I12-R1. I12-R1 is currently BASELINE_RECOVERY_PENDING: published7aa9 lacks the richer
accepted main I12 documents/test. Root's separate read-only overlay audit and exact
planning repair must establish the prepared accepted I12 inputs before execution.
Do not copy unbound main content, invent RED or overwrite any author freeze.

After N6 final acceptance, prepare a NEW composition checkout at published7aa9,
apply the exact independently verified N6 content patch, then the separately audited
prepared I12 input overlay and its authorized follow-up. Preserve each original
freeze/preimage/evidence domain; verify base commit and every consumed patch/input
digest. There must be no overlapping content edits: N6 owns its three test/helper
paths; I12 owns guide/README/documentation test. Merge neither intermediate inventory
blindly: create ONE final inventory from saved combined bytes with the unchanged
751-entry/tracked-set policy and verifier. Missing/conflicting/prepared inputs block
composition and return to the owning planner; do not infer equivalence from labels.
Run changed-boundary cross-checks (documentation, diagnostic and exact-input/lint/
drift checks) on that final immutable snapshot and obtain final combined code/security
review; record which unchanged historical checks are reused, never relabel old runs.

MANUAL GATE: no new commit/push/CI is authorized. Root requests fresh exact combined
snapshot authority only after local checks, independent reviews and final freeze.
All four actual macOS15/Windows2025 × Node22.20.0/24.14.0 jobs and native CLI results
remain required for that changed tree. Old N5 three passes cannot qualify it. If
future Win22 diagnostics prove a timer, assertion or lifecycle cause, plan the
smallest correction from that evidence; no deadline increase/retry is pre-approved.
Q14 remains cancelled, never passed; no Headroom/service/global action is included.

Next action and owner: root accepts this N6 planning freeze and invokes one N6
implementation subagent, then separate final code/security review. Root owns the
I12 baseline audit/repair and later combined snapshot acceptance/authority request.

## Current scope and exact native boundary — 2026-10-19

Q14 is cancelled / no longer required, not passed. Its external owner, loaded
connection identity and automatic-path capture are outside this delivery.
WR-012/Q13 generic integrity remains accepted for its unchanged reviewed inputs.
The published N5 snapshot is commit `7aa9c0b886522c23ace4728d702138d3dfa43f9f`,
tree `3a72313e5619d9700dec3beb95c6d9ce8b5f8fdd`; run
[39221641935](https://github.com/swimmwatch/engineer-agent-workflows/actions/runs/39221641935)
belongs only to that snapshot. N5 run39221641935 passed macOS22/macOS24/Windows24; Windows22 acceptance failed78/80 (one nested Q36 public-qualification child plus its parent), native CLI skipped. Inner cause and timeout are not established. Root/native collector owns final evidence acceptance; n6_windows_q36_diagnosis owns read-only diagnosis. Q16/full I11 remain incomplete. N6 addresses only proven diagnostic loss; I12-R1 is pending audited baseline recovery. No speculative cause repair or public action is authorized. No planned, local, old or partial result closes Q16.

The [I12-R1 documentation follow-up](12_developer-documentation.md#current-documentation-follow-up--i12-r1-2026-10-19)
creates a different input snapshot. Its guide, README and test are qualification
inputs. The existing strict input policy remains unchanged: verify its new exact
inventory, obtain separate precise commit/push/four-job authority and collect all
required actual results before claiming that changed snapshot qualified. N5
passes may remain evidence of N5; they are not relabelled as new-tree passes.
There is no publication, native rerun or service authority in this planning step.

## Historical N5 local correction — accepted and published before this amendment

The following N5 author checkpoint and older corrections retain their original
pins, timing and pending-status statements. They do not supersede the current
scope, published commit or handoff, and cannot reinstate cancelled Q14.

<a id="current-local-correction--i11-n5-2026-10-18"></a>

## Historical local correction — I11-N5 (2026-10-18)

This section supersedes all older current-status and pending-delivery statements below. N4 was independently reviewed, accepted and published as commit `9ef2000639606f31e5c6a89b1064ce7817a4ae65`, tree `de2271456ac7491b19a3e3f103dce75d3a989181`. Actual run [39133271930](https://github.com/swimmwatch/engineer-agent-workflows/actions/runs/39133271930) passed macOS15/Node22.20.0, macOS15/Node24.14.0 and Windows2025/Node24.14.0: integration77/77 and native CLI pass each. Windows2025/Node22.20.0 integration passed76/77 with one packed after-hook failure; its downstream native CLI was skipped. No job was cancelled. The exact five-file commit/push/four-job authority is consumed.

Sealed inputs: `artifacts/workflow-reliability-remediation/windows-public-recovery-delivery/report.md` SHA256 `2d33d33fc09f83701e949d6dcf99682fad7509bc4f98681b2d3476c16f494850`, freeze `89f2258d2d097fd1a980f10786390c9edc41df99d0f9a225263620d021a0a72c`; `windows-cleanup-followup-diagnosis/report.md` SHA256 `65356be0fd64650b8d6f42b637bcfe64c47e519788447d68e260b131e7d73484`, freeze `7f5715f84ac8f8c22cdc0de2cbf9c89b1d27c759455d485e395ad011662af9c6` under the same artifact root. The diagnosis proves diagnostic loss in the owner TAP summary, not a cause of the native cleanup failure. Nested original errors are retained. Actor `cleanup-end` is emitted in `finally`; it is a completion notification, not a success verdict. Do not infer filesystem error, surviving PID, timeout or production defect from it.

Outcome: expose bounded safe cleanup-failure identity/classification at existing test owners while preserving every existing lifecycle and thrown-error behavior. Requirements WR-013/WR-014, C11 and Q16; unchanged source/specification/review pins in Exact inputs apply. A fresh owning MCP check must remain pass/reviewed/Approved before work and completion. No specification or managed YAML edit belongs here.

Owner and workspace: the separately invoked N5 incremental-implementation subagent works only in a new isolated checkout `artifacts/workflow-reliability-remediation/windows-cleanup-diagnostics-correction/checkout` at the exact N4 commit. Do not modify frozen N3/N4 checkouts/evidence, the main HEAD/index or unrelated work. The six N4 planning preimages and their old hashes are archived in `artifacts/workflow-reliability-remediation/windows-cleanup-diagnostics-planning/planning-provenance.json`; old N4 planning bindings are historical and compare with those preimages after this amendment. Main remains the owning MCP project; the isolated copy does not become specification authority.

Allowed candidate source paths (choose the smallest sufficient subset):

- `packages/engineer-agent-workflow-mcp/test/support/product-e2e-harness.mjs`
- `packages/engineer-agent-workflow-mcp/test/support/temporary-directory.mjs`
- `packages/engineer-agent-workflow-mcp/test/support/qualification-diagnostics.mjs`
- `packages/engineer-agent-workflow-mcp/test/packed-artifact.test.mjs`
- `packages/engineer-agent-workflow-mcp/test/qualification-diagnostics.test.mjs`
- `packages/engineer-agent-workflow-mcp/test/product-actor-lifecycle.test.mjs`
- `.github/qualification/workflow-reliability-inputs.json`, only exact changed-input inventory/digest rebinding after source is final.

No production38src/83dist, dependency, workflow, deadline, filesystem retry, skip, assertion removal or qualification workload change. Preserve all119 review items, existing lifecycle cases, cancellation/positive-owned-PID observations, before/after recovery dispatch0/1, effects1 and natural runner exit. SDK.close alone is not exit proof; emergency parent cleanup cannot count as pass. No public action, service test, Headroom call, install, global configuration or next packet is authorized. The implementation owner may update only this packet's result, todo and current handoff, preserving this planning freeze.

### Ownership, error and compatibility boundaries

Reverify these exact N4 passages before implementation; paths are relative to its checkout. Existing `test/support/product-e2e-harness.mjs:1068` owns LIFO disposal, all disposer attempts and the final AggregateError; `:134` owns actor close; `:145` owns PID observation; `:187` registers actor disposal; `:750` creates the nested product scope. `test/support/temporary-directory.mjs:5` registers root disposal before allocation settles. `test/packed-artifact.test.mjs:228` owns smoke disposal and `:346` packed root disposal. `test/support/qualification-diagnostics.mjs:14` owns the existing safe diagnostic channel; its `:29` teardown must remain observational. No new generic error framework or success counter is needed.

| Unit | Input/output, purpose | Lifecycle/error invariants and dependency direction | Verification |
| --- | --- | --- | --- |
| Existing qualification scope/disposer registry | Optional finite fixture-owned identity plus existing callback; safe failure summary through diagnostic sink | Preserve `after(callback)` consumers including native test fixture/qualification CLI; preserve LIFO, every attempt, final AggregateError and exact original error objects/order. No sink error replaces cleanup failure. Scope calls the test-only projector, never runtime code. | Controlled actual owner hooks, native TAP capture, error identity and all-attempt order |
| Existing actor close boundaries | Actual transport/client rejection, PID-observation throw or child-exit-check failure; safe boundary category | Preserve allSettled, current200x10ms observation and error precedence. In particular an observation exception currently escapes before final actor aggregation: instrumentation must not wrap it, delay it or insert earlier SDK errors into its thrown result. Category must come from the actual owner boundary, never guessed from an error code. | Controlled actual actor-boundary failures and exact thrown identity/precedence; original real-process cases |
| Temporary/packed roots and smoke/diagnostic teardown | Existing disposer identity, success/no additional failure output or safe failure summary | Register at current time, dispose in current order; no new filesystem effects/retries. Native fixture consumers remain compatible. | Actual owner root/smoke wiring, failure canaries and unchanged success |
| Existing test-only diagnostics | Owner-supplied finite labels plus thrown values to bounded JSON failure projection | One-way observational dependency; never serialize message, stack, path, PID, context/cursor, env or arbitrary properties. Preserve original errors separately without truncation. Sink/classifier failure cannot alter teardown. | Unknown/malicious labels/codes, non-Error/hostile values, cycles/overflow, throwing sink; meaningful redaction PROVE |

Safe failure projection is local test diagnostics, not a public MCP API/schema change. Use event `cleanup-failed`; resource `product-workflow`, `actor`, `temporary-root`, `packed-root`, `packed-smoke`, `diagnostics`, or `redacted`; actor the existing four fixture actor names or `redacted`; boundary `scope-disposer`, `transport-close`, `client-close`, `pid-observation`, `child-exit-check`, `filesystem-remove`, or `redacted`. Error kind is `aggregate`, `error` or `non-error`; native code is `EACCES`, `EPERM`, `EBUSY`, `ENOTEMPTY`, `ENOENT`, `ESRCH` or `other`. Unknown values become fixed fallbacks; numeric SDK codes are not copied. Emit only these enums, bounded nonnegative indices/counts and explicit truncation. At most16 failed-disposer entries; any necessary nested aggregate projection is limited to depth4/eight children and cycle-safe. Prefer direct owner classification and a small projector over a new category-tree framework. Original AggregateError.errors stays complete and identity-preserving. No diagnostic source getter/serialization exception may prevent later disposers or replace errors.

### Local author result (2026-10-18)

I11-N5 local diagnostic correction is verified on both pinned Linux runtimes:87/87 six-suite cases per runtime, actual after-only CLI exit0, final32 assertion-producing mutation controls restored, and lint/build/generation/validation/input checks pass. Independent final reviews and separately authorized exact-snapshot native qualification remain pending. The historical Windows22 cleanup cause is unknown; Q16, Q14 and full I11 remain incomplete. See [local report](../../../../artifacts/workflow-reliability-remediation/windows-cleanup-diagnostics-correction/report.md) and its final freeze. Source candidate tree is3a72313e5619d9700dec3beb95c6d9ce8b5f8fdd (seven files); public production/runtime and existing119-item workload are unchanged. The77 original native-selected cases remain, with3 new actor-boundary cases; the local six-suite selector adds7 diagnostic cases, totaling87. Preliminary code/security checks passed without actionable findings; final reviews remain distinct. Root owns those reviews and any later concrete publication request.

### RED, GREEN, PROVE and final verification

Run in the new isolated checkout, using the already available exact Node22.20.0 and24.14.0 runtimes and existing dependencies, without installation. Before the first subprocess set isolated HOME, npm user/global config/cache and temporary directories as recorded in the N4 `runner-env.json`; use new N5 locations, not frozen N4 locations. Record actual executable/version/environment, command, PID and durable terminal exit/result. Missing terminal receipts are unknown, not pass. Review the candidate diff/static invariants and run syntax/lint plus focused tests before long integration checks; keep final source immutable throughout long runs.

1. Write discriminating checks before behavior. Capture actual owner TAP diagnostics for controlled actor and filesystem-shaped failures; current N4 must fail the expected safe resource/boundary/code observation on both pins. Separate assertions retain exact two original Error objects/nested AggregateError identity, all LIFO attempts and failing teardown. An import/missing-export/harness failure is not RED; repair or require relevant post-GREEN PROVE.
2. Implement the smallest diagnostic change. GREEN must identify actual failing owners, classify actual boundaries, retain failure/error identity and unchanged success behavior. Exercise multiple failures, unlabeled/native callbacks, non-Error/hostile values, cycles/overflow and throwing diagnostic sink. Safe observations must not expose private canaries or raw diagnostic code strings. Test PID-observation throw precedence through the actual actor owner, without signalling unknown/live user processes.
3. In disposable copies, separately suppress failure publication, remove actor boundary/root identity, expose a private canary, and break all-attempt/error-identity preservation where the new assertion covers it. Each required absence/structural/wiring guarantee must detect its corresponding meaningful defect; restore and prove source hashes restored. Do not change lifecycle or deadlines to pass a diagnostic test.
4. Focused checks on each pinned runtime (planned extensions to existing suites): `rtk proxy node scripts/run-tests.mjs packages/engineer-agent-workflow-mcp/test/qualification-diagnostics.test.mjs packages/engineer-agent-workflow-mcp/test/product-actor-lifecycle.test.mjs`. Preserve every original lifecycle case. Run `rtk proxy npm run lint` and applicable `rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp` before long acceptance.
5. Final immutable integration on each pin: `rtk proxy node scripts/run-tests.mjs packages/engineer-agent-workflow-mcp/test/product-e2e.test.mjs packages/engineer-agent-workflow-mcp/test/packed-artifact.test.mjs packages/engineer-agent-workflow-mcp/test/transport.test.mjs packages/engineer-agent-workflow-mcp/test/product-session-recovery.test.mjs packages/engineer-agent-workflow-mcp/test/qualification-diagnostics.test.mjs packages/engineer-agent-workflow-mcp/test/product-actor-lifecycle.test.mjs`; retain all77 existing native-selection cases plus justified new cases, reporting actual differing selector counts. Run actual `rtk proxy node scripts/qualify-product-workflows.mjs --run --skip-model-trials` on each pin to exercise after-only consumers; runner must exit naturally. Fixture/model-trial skips are not actual model evidence.
6. Run applicable `rtk proxy npm run generate:check`, `rtk proxy npm run validate`, actual saved YAML/parser/link checks, exact-input verifier positive and stale/tampered/unapproved negative controls using its existing CLI contract; no new invented script or blanket full-suite rerun. Preserve unchanged121 production/runtime members, dependencies, workflows, original workload/assertions and main HEAD/index/unrelated files. Archive exact source/evidence/patch/tree and planning preimages with a freeze. Recheck owning MCP pins before handoff.

Acceptance of this local substep means safe diagnostic loss is corrected with exact behavior/provenance checks. It does not mean the unknown Windows22 cleanup cause is fixed. Rollback is the unmodified N4 checkout; do not reset main. No data migration or separate developer-documentation packet is warranted for this localized test-only diagnostic correction; these contracts and focused helper comments own it. Root separately invokes code/quality and security reviewers under the user-requested execution cycle, resolves findings against the final freeze and decides local acceptance.

MANUAL GATE: a new exact reviewed snapshot needs fresh commit/push/four-job authority before any native run. All four actual macOS15/Windows2025 x Node22.20.0/24.14.0 jobs remain required for that new snapshot; older three passes do not certify changed input. Any failure keeps Q16/full I11 incomplete. An instrumented native result may reveal the real error; a pass permits reporting that pass, not inventing the historical cause. Q14 is separately open: loaded serving identity and causal automatic-path capture remain unverified, operational owner/supported capture clarification pending; no additional Headroom request is authorized. Next action and owner: root invokes the N5 implementation agent after accepting this planning freeze; root owns separate reviews and any later concrete publication request. Q14 operational owner remains unknown.

## Historical local correction — I11-N4 (2026-10-18)

This section supersedes N3 current-status statements; its immutable evidence remains historical. N3 commit447848be05673451e5469dd9fc61dc3f5306cc87/run39121206736 passed both macOS combinations71/71. Both Windows jobs failed67pass/3fail/1cancelled: the public reliability test reached its600s bound; two checkpoint recovery subtests missed their Windows fault injection. Packed reliability completed119items within802–870s and every lifecycle regression passed; the runners exited naturally. Public progress at timeout is unknown. The sealed diagnosis is `artifacts/workflow-reliability-remediation/windows-followup-diagnosis/report.md`, SHA25683ca8a3cb9f7814c0e768d5dcdb2a1a1830349f3c0525b5fb5928b69b337f460.

Requirements WR-013/WR-014, C11/Q16 and the unchanged pinned MCP source80aaa57b348e0c17731b6f9f23f9d92cd0826a3d1fe0ada37a9806e1edd30767/spec113ef10ec396f650c5d6f66d93e7dedc131faf1c1512717f54ec5da756a63dfd/review8090f5b2-5a46-4511-9774-32295157cf1f govern this bounded local correction. Fresh owning MCP check is pass/reviewed/Approved. No new product behavior, latency SLO, platform change, dependency, installation, service mutation, Headroom call or publication is authorized.

Owner: N4 local implementation agent. Work only in the new isolated447 checkout `artifacts/workflow-reliability-remediation/windows-public-recovery-correction/checkout`. Allowed candidate paths: product-e2e.test.mjs, product-session-recovery.test.mjs, support/qualification-diagnostics.mjs and, only for actual worker/regression reuse, support/recovery-checkpoint.mjs under packages/engineer-agent-workflow-mcp/test; plus .github/qualification/workflow-reliability-inputs.json. Production38src/83runtime, dependencies, all119items/assertions, N3 lifecycle tests and both workflows remain unchanged. Six pre-edit main planning files are archived in N4 preimages; old freeze planning bindings are historical and compare there, not to updated main files. Preserve main HEAD/index/unrelated files.

Boundary: a narrow test-only checkpoint injector owns a native node:path join and one fs.rename interceptor, the fired flag, selected checkpoint conditions and pass-through. The actual recovery worker and controlled-fs regressions must execute that same owner. Preserve exact before-attempt dispatch0/after-response dispatch1, replay consumption and durable effects1. Explicitly assert injection fired before interpreting failure as protected recovery. Existing redacted diagnostics own public/packed enum-only labels, bounded phase/pending/count/review snapshots; public reliability drives the real observer. Preserve packed default and no request/context/path/error text. Public Windows budget becomes1200s, other hosts600s; workflow Windows30min/macOS20min and lifecycle remain unchanged. No generic fault framework or durable developer document is warranted for this localized test correction.

Test-first commands use the isolated npm HOME/config/cache before any npm subprocess. RED: run evidence red-published-hook.mjs against current actual worker declaration/hook on both Linux22.20.0/24.14.0; require Windows-shaped hook firing, observing the behavioral miss. GREEN: actual shared hook on posix/win32 and before/after phases, no underlying rename at injection, nonmatching pass-through, actual recovery worker assertions. PROVE separately restore mixed separators, bypass injection, public observer disconnection/unsafe label and Windows-only budget defects in a disposable copy; each intended assertion must fail, then restore. Review candidate and focused checks/lint before long runs; keep final source immutable during them. Run actual public+packed+transport+recovery+lifecycle consumers and after-only qualification CLI --run --skip-model-trials on both pinned Linux versions, applicable build/lint/generate:check/validate, exact-input verifier positive and stale/tampered/unapproved negative controls. Freeze exact source/evidence/patch/tree and unchanged production/main guards. Independent code/security reviewers and root assess that exact freeze under the user-requested autonomous cycle.

Full I11/Q16 remains incomplete until separate exact-snapshot publication authority and all four actual native jobs/steps pass; no native rerun is authorized here. Q14 remains separately incomplete with external owner unknown. Root owns reviews and any later request for concrete publication; local author owns implementation/checks and stops at the frozen result.

Local N4 author checks passed on the unchanged five-path candidate:79/79 on each pinned Linux runtime (77 native-CI consumer cases plus2 diagnostic unit cases), both actual after-only CLIs exit0, five PROVE controls detect/restore, build/lint/generate:check/validate and exact-input verifier/negative controls pass. Final independent reviews/root acceptance and separately authorized four native jobs remain pending; I11/Q16 and Q14 stay incomplete. See `artifacts/workflow-reliability-remediation/windows-public-recovery-correction/report.md` and its final freeze. Interrupted original runs have unknown exits and are excluded; recovered runs use durable PID metadata and terminal receipts. No new publication or Headroom action occurred.

## Historical local correction — I11-N3 (2026-10-18)

This section supersedes the N2 technical requirement to preserve both timeout constants; Approved behavior and scope remain unchanged. Published c83f4c400b44d43ac09f2b0fd2d6d4277cab0258/run39114292390 passed both macOS combinations but both Windows combinations reached the 600s packed deadline while progressing (82/119 and 111/119), then the 20min job deadline. Native Windows qualification remains incomplete. The exact surviving Windows process/removal failure is inconclusive; do not claim a proven Windows root cause.

The bounded diagnosis is `artifacts/workflow-reliability-remediation/windows-budget-diagnosis/report.md` (SHA256 c27690708155e03ba83e1ebc7cbbdeab646a21625ea450173e32884a6d02d982). Implement only in a new isolated c83 projection at `artifacts/workflow-reliability-remediation/windows-cleanup-budget-correction/checkout`; the main MCP context/pins above remain authoritative. Preserve old checkouts/freezes, runtime source/compiled members, SDK2.0.0/dependencies, all 119 review items, assertions and native combinations. No publication, CI run, installation, global configuration or Headroom call belongs to this local packet.

Ownership: the test fixture scope owns every child/client before handshake and all directory disposals. Existing actor start/request/restart must reject cancellation and propagate the test signal through the pinned SDK request contract. Cleanup observes every positively identified owned PID gone after SDK close and verifies natural runner exit; it does not require private SDK process internals to observe an exit event. It attempts every disposer despite one error, closes clients before removing their roots, and preserves cleanup errors. The public harness and packed test use the same small test-only ownership boundary; recovery actors share it. No generic lifecycle framework or production wrapper is warranted. Export only the actual actor/ownership helper needed for behavioral regression; no diagnostic payloads or secrets. Existing phase/count diagnostics remain intact.

Test-first: add a regression using actual actor/fixture ownership and real subprocesses. Rendezvous on a real pending request and separately pending handshake; abort, verify launched PIDs gone, no launches/requests/restarts after abort and natural runner exit under an independent short watchdog. Inject an earlier cleanup failure and prove it cannot prevent other clients closing or root removal attempts, while retaining failure. Emergency parent cleanup occurs only after observations and cannot count as success. Observe meaningful RED on both exact Linux22.20.0/24.14.0. Apply smallest lifecycle correction, GREEN, then separately PROVE cancellation and cleanup ordering/error isolation by reintroducing defects in a disposable copy.

Only after lifecycle GREEN/PROVE, set packed timeout to 1200000ms on Windows and retain 600000ms elsewhere; native workflow timeout30min on Windows and20min elsewhere. These finite execution bounds are not a product latency SLO or proof that Windows will pass. Verify selected GitHub expression with official documentation. Keep all workload/assertions, subprocess cancellation and phase diagnostics. Rollback is the previous isolated c83 snapshot; any native failure remains explicit rather than causing automatic further budget growth.

Before final checks, review diff/whitespace and share source with independent reviewers. Use isolated npm HOME/config/cache/env before the first npm command; reuse installed runtimes/dependencies without install. Run actual-helper regressions and relevant public/packed/transport/recovery consumers on both pinned Linux runtimes, build/lint/generate:check/validate, production/history/main-index guards, and exact-input manifest full CLI positive plus stale/tampered/unapproved-path controls in an isolated copy. Refresh only test/workflow input hashes for the exact staged proposed tree. No full887 suite rerun without a new relevant reason. Record every failed attempt honestly.

Acceptance is local verified preparation plus separate exact-snapshot code/security reviews. Full I11/Q16 stays incomplete until a separately authorized actual four-job run passes. Full Q14 remains separately incomplete, owner unknown. No separate durable developer document: this localized test-only lifecycle boundary and execution budget are owned here and in helper comments. Root owns later publication authority, if requested after the concrete result is checked/reviewed. Stop after local N3 freeze.

Local author result: raw final common-source batches passed70/70 on each pinned Linux runtime; the isolated emergency-inventory correction changed only the new lifecycle test during those long runs, after its original worker had loaded. Exact mapping combines unchanged four-suite66 cases with final lifecycle5/5 on each runtime, for71 distinct final cases without claiming a single immutable71-case batch. Six current-source PROVE controls detected their defects; actual after-only CLI `--run --skip-model-trials` passed both pinned runtimes. Build/lint/generate:check/validate,751-path exact-input CLI and stale/tampered/unapproved controls,121 production/runtime comparisons,728 main-file and index guards passed. The six staged publication paths form tree2939aa9903a76d5142514097d8783d3824567480. See `artifacts/workflow-reliability-remediation/windows-cleanup-budget-correction/report.md` and its freeze. Final code/security reviewers and root own acceptance of this local result; no new publication is authorized. Full I11/Q16 and I10/Q14 stay incomplete.

## Historical local correction — I11-N2 (2026-10-18)

This section supersedes older current-status statements below; retained N1 and earlier run evidence remains historical. [N1 delivery](../../../../artifacts/workflow-reliability-remediation/native-correction-delivery/report.md) published commit `2455d0f1f2c45557c00011de7339431100fe8c8a`, tree `a43c62d84b47ad777b29d1b113688dd2ed05f03d`. Run39109900087 passed acceptance65/65 and native qualification on both macOS15/Node22.20.0,24.14.0 combinations. Both Windows2025 combinations hit the packed test600s timeout and then the20min job deadline; downstream qualification was skipped. The bounded delivery authority is consumed.

Owner: `windows_native_context_scout` under root's explicit single-packet local implementation instruction. The [sealed diagnosis](../../../../artifacts/workflow-reliability-remediation/windows-native-diagnosis/report.md) establishes a separate pre-connect cleanup defect; it does not identify the Windows stalled operation. Main MCP pins above remain authoritative. Requirements WR-013/WR-014, C11, Q16 govern this correction; specification scope and public behavior are unchanged.

Code workspace: new isolated `artifacts/workflow-reliability-remediation/windows-native-correction/checkout`, exact245 baseline. Preserve the published N1 checkout,33diagnosis/87delivery bindings, main index and unrelated sources. Allowed code ownership: packed acceptance test, its smallest test-only support/diagnostic module and focused regression tests, shared public harness observation callback, plus exact qualification input-manifest refresh. No src/runtime/dist edit, dependency, shell launcher, skip, timeout increase, global change, Headroom or publication. Main planning ownership is limited to this packet, todo and handoff with preimages.

Boundary map: `connectPackedClient` owns its spawned handshake client through success/failure/timeout; register cleanup before connect and preserve connection errors. `createQualificationDiagnostics` (test support) owns a bounded redacted phase/pending-operation/count/timing snapshot; packed tests drive phase boundaries, public harness only reports safe operation identifiers before/after requests. It must not read/log payloads, opaque contexts, paths or secrets and must not alter MCP protocol correctness. Existing runtime units and source guards remain unchanged. No new durable developer document is warranted for this localized test correction; this packet and helper comments own the diagnostic contract.

Test-first sequence: add a real silent-handshake child regression calling the actual packed helper, observe RED on both existing pinned Linux runtimes, then move cleanup ownership and obtain GREEN. Observe the child before/after helper cleanup and distinguish it from harness-forced emergency cleanup. Add stalled-operation diagnostics checks (safe identifiers/count/timing, no sentinel payload/context values), observe RED before behavior, then GREEN. PROVE must restore late cleanup and separately disable pending-operation/redaction behavior. npm abort is excluded absent a separate actual lifecycle RED. Linux probes never certify Windows.

Commands (working directory is the new checkout; environment/config/cache isolated from the first subprocess): `node scripts/run-tests.mjs --test-name-pattern=I11-N2 packages/engineer-agent-workflow-mcp/test/packed-artifact.test.mjs`; focused diagnostics/consumer tests; full packed test on22.20.0/24.14.0; build/lint/generate:check/validate and exact input-manifest CLI plus negative controls. Add no full887 rerun without new evidence. Preserve test600s/job20min. Recheck current main MCP source80aaa/spec113ef/review8090 before completion.

Acceptance: actual-helper RED/GREEN/PROVE; successful packed/public consumer coverage and redacted phase/call progress; exact input-manifest747→new inventory reconciliation and full CLI verification/tamper rejection; unchanged38src/83runtime members and unrelated paths; exact source/evidence/staged-tree freeze. Local N2 completion does not close Windows/Q16/I11 or Headroom/Q14. Root separately invokes independent code/security reviews. MANUAL GATE: a new concrete reviewed snapshot requires further commit/push/four-native-job authority. Windows cause remains INCONCLUSIVE until actual diagnostic execution.

### I11-N2 local author result

The [sealed local result](../../../../artifacts/workflow-reliability-remediation/windows-native-correction/report.md) records actual-helper RED/GREEN/PROVE and final68/68 consumer checks on both pinned Linux runtimes, source hashes unchanged before/after. New diagnostics expose real timeout pending work, phase-local counts,14numeric review checkpoints and7paired actor-cleanup events per run. Build/lint/generate:check/validate and750-path input CLI/negative controls pass. Five isolated staged paths;38src/83runtime members and unrelated main/source paths remain unchanged. The final whitespace-only correction is linked to those exact successful functional preimages by [token/span equivalence](../../../../artifacts/workflow-reliability-remediation/windows-native-correction/whitespace-equivalence.json); current hashes are recorded separately. Local N2 implementation is verified and ready for root's separately invoked independent reviews. Full I11/Q16 remains incomplete; Windows cause is INCONCLUSIVE, and no new native run/publication/Headroom authority is inferred.

## Historical native correction — I11-N1 (local reversible work only)

The [actual delivery report](../../../../artifacts/workflow-reliability-remediation/qualification-ci-delivery/report.md)
and [raw job results](../../../../artifacts/workflow-reliability-remediation/qualification-ci-delivery/ci-failure-results.json)
bind the exact reviewed commit `97b8513a4ea02b690e92bb0aaf90dfab75971865`,
tree `62c55f63ed9ba0d0fecf151cb16d5776d461a09b`, and
[run38942838354](https://github.com/swimmwatch/engineer-agent-workflows/actions/runs/38942838354).
Each of four required native jobs failed public/packed/transport acceptance:
8 passed / 53 failed / 0 skipped. Build, generation and lint passed; downstream
native product qualification was skipped, never passed.

Owner: implementation subagent `qualification_ci_delivery`, under root's explicit
local-fix authorization. Code workspace: the isolated code projection rooted at
`artifacts/workflow-reliability-remediation/native-acceptance-correction/checkout`,
starting from that exact97 commit. The published delivery checkout remains
preserved separately. The fix clone's old specification copies are not current
authority. The main owning MCP project remains this repository root, with the
current source/specification/review pins above. Read the current main requirements
and this packet through that ownership boundary; do not edit copied workflow YAML
or fabricate pins inside the isolated checkout. Preserve the main dirty tree/index
and all old frozen candidate, archive and native-failure evidence.

Affected test ownership only: `test/support/product-e2e-harness.mjs`,
`test/product-session-recovery.test.mjs`, `test/packed-artifact.test.mjs`, the
smallest shared canonical temporary-fixture creator under `test/support/` used by
both existing fixtures, and meaningful existing-boundary regression checks.
The production config/path guard remains unchanged. No new dependency, generic
lifecycle CLI, unrelated runtime behavior, global state or test skip is permitted.

Two observed boundaries require correction. Both the public harness and independent
session-recovery fixture create noncanonical temporary paths, producing UNSAFE_PATH
on native runners; canonicalize owned temporary fixture roots before configuring
the store, preserving strict runtime rejection of unsafe input. The packed test's
direct npm.cmd/execFile launch produces Windows spawn EINVAL before npm pack;
use a safe Windows npm JavaScript entrypoint with explicit arguments through the
actual supported Node executable, preserving Linux execution and packed-artifact
coverage. Avoid executable shell strings or weakened validation. The precise OS
path alias remains a diagnosis until a discriminating observation proves it.

First record meaningful RED against the exact97 baseline, including both temporary
fixture owners and the packed launch boundary. Then implement the smallest shared
test-support fix, obtain GREEN and required isolated PROVE, and record actual
inputs, effects, runtimes and cleanup. Reuse existing focused test infrastructure.
Local path simulations or launch-contract probes do not count as macOS/Windows
passes; any native step not rerun remains failed/unverified. Run only the bounded
local checks justified by the changed test boundary, then freeze the concrete
correction for separate code/security reviews. Root owns final disposition.

No further commit, push or CI rerun is authorized by the consumed delivery grant.
Prepare a reviewable local correction, stop, and let root seek explicit authority
for that exact new result. No claim of Q16/full I11 completion is permitted before
all required actual native results pass. No Headroom call belongs to this substep.

## Test-first acceptance and proof

1. Create the integrated failing scenario before changing its harness; verify an expected user-visible failure rather than missing imports. Run through public stdio with separate independent actors and assert current contexts/complete sources across restart.
2. Run complete repository tests/lint/validation/generation checks on the final bounded changes, reusing successful checks when no new changes justify repetition. Reconcile pre-existing dirty-tree failures without weakening checks.
3. Retain actual Linux qualification at Node.js 22.20.0 and 24.14.0 and require the four macOS 15 / Windows 2025 combinations at both versions. Reuse Linux evidence only within exact verified input domains. Current N4 run has three complete native passes and one Windows22 packed-cleanup failure; that job's native CLI was skipped. Q16 remains incomplete. The one reviewed commit/push and four-job grant is consumed; another public delivery or CI run requires authority for its concrete reviewed result.
4. Report local repository suite, live host trials and real compression as separate dimensions. Missing Q14 or required platform evidence keeps final qualification incomplete; no successful local result substitutes for it.

Tests to create in this packet: extend the named existing suites/fixtures; create no mirror-of-implementation test.
Run the focused command after creating its discriminating checks and before
implementation; new filenames below are planned, not currently existing scripts.
Then implement, correct code until the valid assertions pass, and run required
PROVE. For an absence/structural claim use the stated actual snapshot/counter/trace,
not a copied implementation constant. A harness/import failure is not RED proof.

```sh
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node scripts/run-tests.mjs packages/engineer-agent-workflow-mcp/test/product-e2e.test.mjs packages/engineer-agent-workflow-mcp/test/packed-artifact.test.mjs packages/engineer-agent-workflow-mcp/test/transport.test.mjs
rtk proxy npm run lint
rtk proxy npm test
rtk proxy npm run generate:check
rtk proxy npm run validate
rtk proxy node scripts/qualify-product-workflows.mjs --run --skip-model-trials
```



Required Q16 combinations are Linux plus macOS 15 and Windows 2025, each at
Node.js 22.20.0 and 24.14.0. N4 passed three native combinations and failed Windows22 cleanup; its native CLI was skipped. Local
Linux checks do not certify those platforms. No missing or skipped native step
is a pass.
Local integration can begin after local dependencies pass; full completion still
requires every required external/host/platform result. I12 may consume the accepted
local integration only after its own exact-input preflight, without closing I11.

Focused pass is necessary, not permission to skip a material shared-boundary test.
Broaden only for changed shared boundaries, new failures or unresolved evidence.
Record actual environment, commands, RED/GREEN/PROVE results and observed side
effects. A missing or failing required check keeps this packet incomplete.

## Compatibility, recovery and manual gates

Use fixture stores and temporary homes; keep old/new package snapshots and data copies for rollback checks. Rollback cannot reinterpret review mode or discard pinned history. Global rollout stays outside the packet.

MANUAL GATE: Native qualification remains required after correcting the observed failures. The previous four-job grant is consumed. Root must present the concrete reviewed correction for any further public delivery/native CI authority; no rerun is authorized here. External Q14 identity/automatic-path access and its owner remain separately unresolved.

No automatic user answer, reviewer verdict, installation or publication is allowed.
If a check fails, report the concrete next action and its established owner; when
the external owner is unknown, say so. Never assign a new duty to the user or
downgrade the required check merely to mark the packet complete.

## Completion and stop

Read back the changed state through owning public tools. Recheck the exact pinned
specification and review the scoped final diff, including staged/untracked files.
Mark this packet complete in [todo.md](todo.md) only after its required evidence
passes; replace [handoff.md](handoff.md) with the current result and next eligible
packet. Stop. Separate code/security review and commits are optional explicit
invocations, not completion or next-packet gates.

## Current execution evidence

Updated: 2026-10-16 (Europe/Moscow). I01-I09 are complete. I10 and I11 retain
accepted local implementation and final reviews; full I10/Q14 and I11 qualification
remain incomplete for the external compression gate. I12/Q17 is complete; its
accepted local-evidence preflight did not require full I11 completion. The separately authorized execution cycle
requires independent code/security reviews before accepting each corrected scope.

The [current local revalidation](../../../../artifacts/workflow-reliability-remediation/i11-current-local-revalidation/report.md)
resolves the actual-worktree provenance question without source edits: fresh
Node24.14.0 build exit0; all86 retained package members byte-identical (83 runtime
members plus three package inputs); two current baseline suites20/20; source/index
guards pass. It does not repeat the887-test run or supply native/Q14 results.
The Linux portion of Q16 retains those accepted exact-input runs and the
83 runtime-member equality check. Full Q16 is incomplete because every required
native job failed. No historical full suite is relabeled as current native proof.
I12/Q17 acceptance remains complete within its historical documentation scope.
The amendment's existing metadata/documentation runner additionally passed10/10
on each exact Linux Node22.20.0 and24.14.0 runtime, with exit0, no skips and no
build. This checks the new downstream documentation inputs without relabeling the
historical887/109 suite snapshots.

The [accepted local I11 report](../../../../artifacts/workflow-reliability-remediation/i11-delimiter-correction/report.md) and [local I11 disposition](../../../../artifacts/workflow-reliability-remediation/coordinator/i11-final-review-disposition.json) retain the F1/F2 corrections,
native-first RED/GREEN/PROVE, current-byte source bindings and all eight successful
Ubuntu checks: Node24.14.0 full887/887 plus lint/generation/validation/qualification;
Node22.20.0 build, focused109/109 and qualification. Those tests were not rerun for
the later status-only bookkeeping or attributed to the mixed CI delivery snapshot.
The historical invalid-argument diagnostic-precedence limitation remains recorded;
universal native-diagnostic parity is not claimed. Old failed attempts remain evidence.

### Historical corrected CI delivery snapshot — subsequent exact delivery recorded above

The following retained snapshot description predates the restored authorization
and actual native run. Its old cancellation/no-delivery statements are historical;
the current outcome and consumed authority are stated in the correction section.
The frozen archive and original review reports are unchanged.

Both the [final code review](../../../../artifacts/workflow-reliability-remediation/resume16-ci-final-code-review/report.md) and [final security review](../../../../artifacts/workflow-reliability-remediation/resume16-ci-final-security-review/report.md) return PASS_SCOPE on the same [corrected freeze](../../../../artifacts/workflow-reliability-remediation/resume16-ci-correction/freeze.json),
SHA-256 `053c6e3723cdc54134cb5fa3093b9b861ddb85acba86df056329899c893994ae`. The archive SHA-256 is `0a8b05c2d1f02659cea84f4407ee2d082e6c73ae08fe8ed936d966f4c6a8db5a`.
See the [corrected CI snapshot report](../../../../artifacts/workflow-reliability-remediation/resume16-ci-correction/report.md), [exact inventory](../../../../artifacts/workflow-reliability-remediation/resume16-ci-correction/snapshot-inventory.json) and [coordinator run state](../../../../artifacts/workflow-reliability-remediation/coordinator/run-state.json) for exact bindings and disposition.

The candidate contains 746 files and 112 HEAD delta paths: the previous 111 scoped
inputs plus one candidate-only exclusion of an unused historical decision ledger.
The 111 inputs comprise 51 packet inputs, 19 inherited full-file prerequisites,
38 generated closure outputs and three delivery-support inputs. Missing I01-I08
author preimages still prevent remediation-only logical commit attribution.
The original ledger, actual source/index and historical frozen evidence remain intact;
personal-path values are not reproduced here.

The candidate-only exclusion has RED/GREEN/PROVE evidence, fresh generation and
collection validation passes, exact-checkout positive/tamper/restored checks, a
cleanly applicable complete HEAD delta, matching 746 content/mode bindings and a
byte-identical second deterministic archive assembly. The bounded prior security
patterns find no matches in the corrected archive; this is not exhaustive secret
absence proof. Historical61/61 and Ubuntu native qualification are reused only
after exact equality of all86 retained runtime/test inputs. All26 final retained
review bindings remain exact. Workflow and verifier bytes are unchanged; lifecycle.yml
remains SHA-256 `2fc7bdc8894edc94727aebed727d82e85ea9f6688f8ec018555ba19e2e6bdcb5`.

The branch-only workflow targets `feature/workflow-reliability-qualification` and
the four macOS15/Windows2025 x Node22.20.0/24.14.0 jobs. No qualification commit,
branch push, dispatch or native matrix execution has been performed. This delivery
route is cancelled, not pending authorization.
Administrative access and prepared workflow structure are not actual native passes.

### Historical Q14 recovery before the additional-nine authorization

The [Q14 recovery report](../../../../artifacts/workflow-reliability-remediation/resume16-q14-report/report.md) proves 29 historical exact compress/retrieve pairs; nine uncertain
dispatch outcomes leave the remaining original count budget unestablished.
Recovery issued zero fresh functional Headroom calls. The proposed additional nine
compress/retrieve pairs have no authorization; no unused original budget or extra
authority is inferred. Retained read-only proxy health from 2026-10-16 reports version0.39.0,
PID1751, start2026-10-16 12:03:30 MSK; historical PID2192 is not current. This does
not bind the current MCP worker identity/configuration or qualify the actual automatic
compression path. Both remain unverified even if the additional explicit pairs pass.

This bookkeeping follows the reviewed freeze. These packet/checklist/handoff files
belong to the optional21-document layer excluded from the CI candidate. Their status
updates do not change the reviewed candidate/archive/reviews. Prior reviewed execution
document hashes must be compared with preserved preimages, not the updated status files.

The separately authorized additional nine Headroom pairs executed exactly once
and passed their selected-body checks, with complete38-selector coverage across
two run envelopes. That batch and the one-commit/four-job CI grant are consumed;
no retry remains authorized. Q14 still lacks serving-MCP identity/automatic-path
proof. Full Q16 and I11 remain incomplete after actual native failures.

Next action and owner: root invokes the bounded diagnostic-only I11-N5 implementation described above, then coordinates its independent reviews and any later concrete delivery/native authority. Q14 owner/capture clarification is pending; its operational execution owner remains unknown.

## Final accepted exact-snapshot qualification — 2026-10-19

I11 and Q16 are complete for commit
`ba1e3afdc019e9ee2251387d1bac884024985cb3`, tree
`e6bd69a668605d393771cceee1313a4d391c4647`. This current result supersedes
historical pending/failure/owner statements above without changing their bytes or
relabelling their results. Q14 is cancelled and no longer required, never passed.

Root accepted the exact combined N6/I12-V2 scope after independent code and
security reviews returned PASS_SCOPE. The fresh explicitly authorized commit and
normal branch push produced [run39231775734](https://github.com/swimmwatch/engineer-agent-workflows/actions/runs/39231775734).
All four actual native jobs completed successfully on that exact commit:

| Platform | Node | Job | Tests | Native CLI |
| --- | --- | --- | --- | --- |
| macOS15 |24.14.0|117991193990|80/80|pass on darwin/24.14.0|
| macOS15 |22.20.0|117991194443|80/80|pass on darwin/22.20.0|
| Windows2025 |24.14.0|117991194387|80/80|pass on win32/24.14.0|
| Windows2025 |22.20.0|117991194753|80/80|pass on win32/22.20.0|

Every selected native test run has zero failures, cancellations and skips. Root
verified raw job/run head SHAs, terminal conclusions, log totals and each native
CLI's localSmoke pass with the correct OS and Node. See the [verified results](../../../../artifacts/workflow-reliability-remediation/combined-v2-delivery/verified-results.json)
and [accepted combined disposition](../../../../artifacts/workflow-reliability-remediation/coordinator/combined-v2-final-disposition.json).
The earlier local Linux source/runtime and integrated checks retain their exact
accepted evidence domains; no historical Linux full suite is relabelled as a new
whole-tree run. Model trials were explicitly skipped by this native run; accepted
independent I09 historical evidence is unchanged, not rerun or newly passed.

Earlier Windows22 failures and unknown inner cause/timer attribution remain
historical facts. The new green result does not establish a historical cause or
prove N6 fixed it; N6 remains a verified safe diagnostic change. No earlier failed
or skipped result is converted into a pass.

This administrative closeout changes only this packet's top status/new final
section, the sole checklist and current handoff. Exact preimages preserve all
earlier frozen planning bindings; accepted source, contracts, generated/runtime
artifacts, reviews and seals are unchanged. No additional test, CI rerun, commit,
push, release, PR/merge, installation or configuration action ran in this closeout.
No further implementation packet or qualification gate remains within the agreed
scope. No next execution duty is introduced.
