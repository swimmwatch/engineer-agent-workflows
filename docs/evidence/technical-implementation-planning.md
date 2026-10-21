# Technical Implementation Planning Qualification

Current follow-up: the user reopened qualification after review. The stdio-v2
results below are preserved historical observations. Packet/source evidence
bindings have been strengthened. The user confirmed exact integer B1 totals
without rounding; the corresponding fixture/oracle correction and fresh benchmark
are tracked in the current task handoff. Do not count these historical runs as the updated qualification.

Historical stdio-v2 status: P03 complete for the then-agreed Codex-only qualification. All eight final runs pass application/oracle checks; all four
candidate runs and Q3–Q6 pass fresh independent actual-model evaluations. One
baseline run has missing required PROVE evidence and remains incomplete. The
user approved explicit negative-comparison accounting and accepted the measured
slowdown. The amended evidence-consistency check passes without counting that
baseline as successful. Fixture inputs/answers remain SIMULATION; live Claude
behavior remains unverified.

## Frozen experiment

The agreed experiment is B1/B2 × baseline/candidate × two repetitions in the
order recorded in `technical-implementation-planning/frozen-inputs.json`, followed
by Q3–Q6 focused observations. Only Codex is used. Actual client: `codex-cli
0.163.0`; selected/reported model: `gpt-6.1-sol`; reasoning: `medium`; Node:
`v24.20.0`; platform: Linux x64. The role selection is a model alias, not a pinned
underlying model release.

Source byte manifests are in
`technical-implementation-planning/sources/input-manifests.json`. The baseline is
preserved from revision `c1f55dcffccf1aa3bb325745114e40bf80a8053d`; candidate
contains the completed P01/P02 contracts. Fixture/oracle hashes were frozen before
runs. Customer answers and authorizations are explicitly SIMULATION and apply
only inside isolated fixture applications. Real user or global configuration was
not changed. Authentication was copied into temporary private homes for actual
model access, omitted from captures, and removed after each completed stage.

Each stage uses a fresh actual Codex context with the matching frozen host bundle
and MCP runtime, isolated Git application and temporary home. The local controller
reuses `docs/research/workflow-probe-plans/p03/rpc.mjs`. Its private run state and
commands are under `.cache/technical-implementation-planning-qualification/`.
No preserved baseline source was changed.

## Preparation failures and corrections

`technical-implementation-planning/preflight/attempts.json` retains setup
attempts separately from completed runs:

1. A copied fixture review was stale. Reviews were prepared through MCP in each
   final application; all eight returned `pass`/`approved`/`reviewed` before model
   runs. Review/checkpoint metadata is not proof of semantic completeness or
   independently authenticated consent.
2. The workspace-root guard initially interpreted separate additional writable
   roots as the whole effective root set. The corrected native-client guard and
   inside-write/outside-denial result are retained under `preflight/`. These are
   filesystem-boundary observations, not full subprocess-capability evidence.
3. An actual baseline planning context was rejected at `specification_check_state`
   with `MCP tool call requires approval, but approval policy is never`. Its raw
   capture is under `preflight/mcp-approval-denial/`. This is an incomplete model
   attempt, not a successful planning or speed result. The temporary client now
   uses per-tool `approval_mode = "approve"` for that check and the three authorized
   technical-question mutations. Top-level `never`, application-only writes and
   disabled network remain. Configuration is supported by the official
   [MCP reference](https://developers.openai.com/codex/mcp) and
   [configuration reference](https://developers.openai.com/codex/config-reference).

## Initial B1 baseline observation

Raw stage JSON, JSONL and the external check result are retained under
`technical-implementation-planning/initial/b1-baseline-1/`.

| Phase | Actual duration | Native question rounds | Result |
| --- | ---: | ---: | --- |
| Planning | 194.869 s | 0 | Two packets and the planning bundle created |
| P01 implementation invocation | 125.457 s | 0 | Incomplete: child-process assertions unavailable |
| P02 implementation invocation | 86.552 s | 0 | Stopped: P01 prerequisite incomplete |
| External verification | 0.874 s | — | Application suite failed; frozen oracle failed |

Elapsed planning submission through external verification: 410.042 s.
Measured phase time: 407.751 s; intervening orchestration: 2.291 s.
Respondent wait: zero because this attempt asked no questions. Initial setup
start was not captured, so setup time is unavailable rather than zero.
These durations describe a failed attempt and cannot count as a speed win.

The baseline planner selected stateless functions and a shared parser without
asking for technical agreement. The old entrypoint only requires questions for
implementation choices not settled by behavior or repository evidence; it does
not require explicit task-by-task agreement. This is an observed baseline
omission of the new guarantee, not a reason to discard the failed attempt.

P01 wrote tests, encountered `EPERM` in actual Node child-process checks, recorded
its blocker and left production unchanged. P02 respected the missing prerequisite.
External application checks reported 3 passes and 28 failures; the independent
frozen oracle exited 1 at the missing validate behavior. No completed product loop
or passing final implementation is claimed.

## Initial candidate planning and repair

The independent B1 candidate planning context is preserved under
`technical-implementation-planning/initial/b1-candidate-1/`. Planning took
234.359 s and made one actual native question call. Its question explicitly
covered `B1-P1-shared-parser` and `B1-P2-shared-consumer`; the simulated respondent
selected acceptance. MCP retained two separate proposal digests/agreement
bindings, and actor-side `planning_packet_check` returned `ready` for each.
Implementation was deliberately not invoked because the required subprocess
capability had already failed. This is a partial observation, not a completed run.

The initial planner's dialogue did not explain the architecture comparison and
recommendation rationale before the question; that detail was mainly in proposal
files. Explicit agreement therefore worked, but the requested technical discussion
was not yet sufficiently demonstrated. Do not mark Q1 passed from the mere presence
of a question or two managed `ready` results. The one observed planning difference
(39.490 s slower than baseline) is descriptive only and does not establish total
workflow speed or an accepted slowdown.

The P03 repair clarifies the canonical `technical-agreement.md`: explain concrete
units/contracts, viable alternatives/tradeoffs (or why one approach is sufficient)
and a reasoned recommendation in the conversation before asking. Draft the binding
proposal sections at that point; complete remaining packet details after agreement.
This prevents a file-only comparison and avoids postponing user input until a full
execution bundle has been written. No architecture, managed schema or requirement
was changed. Both generated host references were regenerated.

The new structural check first failed at the missing conversation rule, then all
19 planning/evidence checks passed. Removing only the conversation rule caused
the intended assertion to fail again; the original was restored and the focused
check passed. Local proof: `.cache/technical-implementation-planning-p03-discussion-prove.json`.
These are prompt-structure checks; a fresh actual trace is still required.

Original baseline and candidate source trees/captures are intact. A separate `r2`
source byte manifest is retained at
`technical-implementation-planning/sources/candidate-r2.json`; its digest is
`f8ca8ba2fd0adde979d39a3b365c4826e5e56f38d54fc0fc53b81c38cf863b72`.
A fresh B1 planning-only recovery context used that source; its result is below.
No median combines original and repaired candidate versions.

The r2 recovery took 401.830 s and made two native question calls. Its raw dialogue
now explains the shared module and the consequences of separate parsing/streaming
before the first question. Both initial agreements were recorded. Completing the
packets then made their technical proposal sources stale, and the actor correctly
obtained a second explicit answer rather than bypassing the guard.

Exact managed revision 2/4 source comparison shows unchanged shared-source text;
both packet proposals differ only by an extra final LF (`trimEnd()`-equal). The
agreement hash checks therefore worked, but drafting at end of file created an
avoidable question/rework cycle. This is an observed r2 regression and is not
accepted as a speed/quality success.

The second repair keeps exact-byte validation unchanged. Before freezing, every
hashed proposal section must already end at its next same-level heading; later
acceptance/progress details are filled outside that fixed boundary without
changing its whitespace. The focused structural test reached RED, GREEN and PROVE;
removing the boundary rule triggered the intended failure. All 20 current scoped
planning/evidence checks passed, with both generated host references regenerated.
The original and r2 sources/captures remain intact. Repaired r3 source manifest is
`technical-implementation-planning/sources/candidate-r3.json`, digest
`1eea219184ff424ff41a3a16078a68e0a329c5ec28c5c958d2aeae6d4b79ac45`.
A fresh r3 B1 planning-only recovery took 305.981 s with one native question and
no stale/reconfirmation cycle. No runtime/schema
change or weakening of stale-agreement checks was made.

The local controller also now passes an exact numbered packet filename to future
implementation invocations rather than synthesizing `P01`/`P02`: actual candidate
packets used `B1-P1`/`B1-P2`. This harness correction prevents an unrelated identity
mismatch; no repaired implementation result is claimed.

## Native pipe limitation and demonstrated resolution

`technical-implementation-planning/preflight/subprocess-capability.json` records
a separate non-model probe through the installed client's `command/exec`, with
the same application-only workspace sandbox, disabled network and excluded
writable temporary roots. `spawnSync(process.execPath, ...)` returns `EPERM` and
empty output; changing stdin handling also did not produce expected child output.
A syscall diagnostic could not run because `ptrace` was denied, so the precise
underlying syscall defect remains unestablished. The exposed deprecated Landlock
alternative exited 101 because filesystem-restricted execution requires Bubblewrap
to isolate app-server sockets. No restriction was relaxed to make a check pass.

The same external oracle can run outside the native-client sandbox; this does
not establish equivalent actor-side process stdout/stderr/exit verification and
cannot replace that required check. The first alternative probes did not establish equivalence, so those attempts
remain failed. Subsequent actual native probes demonstrated real child stdout,
stderr and exit 7 through temporary file descriptors, with the same sandbox and
network policy. A one-file Node test driver with `--test-isolation=none` passed the
positive assertion and exited 1 at an intentionally wrong exit-status assertion.
The actual stdio fixture helper also has a discriminating argument/environment/
stream/exit test and an environment-forwarding PROVE mutation. Both B1/B2 starter
suites now pass inside the original native sandbox. Captures:
`preflight/file-stdio-probe.json`, `preflight/stdio-equivalence.json`, and
`preflight/stdio-fixture-checks.json` under the matching evidence directory.

A separately frozen `technical-agreement-starters-stdio.json` contains this test-only
infrastructure adjustment. Product starter code, Approved requirements, external
oracle and simulated preferences/answers are unchanged. All eight new final
applications were reviewed through their matching MCP runtime and staged as isolated
Git worktrees before measured invocations. The exact alternating order and hashes
are recorded in `frozen-inputs-stdio-v2.json`. Baseline source is unchanged; only r3
candidate source is used in this qualifying matrix. Original failed/incomplete
captures are not overwritten or mixed into its medians.

## Final measured matrix: stdio-v2

Only baseline and candidate r3 are compared below. All times are seconds, rounded
for display; [metrics.json](technical-implementation-planning/metrics.json) retains
the actual monotonic intervals, per-stage token counters, calculations, medians,
ranges and paired differences. Each run directory under `initial/` contains the
raw stage JSON/JSONL, actual local/oracle output, exact task/code snapshots and a
fresh independent evaluation with item IDs. Two repetitions are descriptive;
they do not establish statistical reliability or a general slowdown threshold.

| Run | Planning | Implementation | External verification | Elapsed | Questions | Independent quality |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| b1-baseline-s2-1 | 179.349 | 336.668 | 2.054 | 520.265 | 0 | Passed |
| b1-candidate-s2-1 | 319.599 | 343.554 | 2.634 | 667.997 | 1 | Passed |
| b2-candidate-s2-1 | 194.989 | 145.706 | 3.296 | 345.182 | 1 | Passed |
| b2-baseline-s2-1 | 162.406 | 164.368 | 0.940 | 328.814 | 0 | Passed |
| b1-candidate-s2-2 | 245.567 | 371.075 | 1.861 | 620.754 | 1 | Passed |
| b1-baseline-s2-2 | 143.498 | 437.321 | 2.590 | 585.619 | 0 | **Incomplete: required P01 PROVE absent** |
| b2-baseline-s2-2 | 188.939 | 142.960 | 0.955 | 334.015 | 0 | Passed |
| b2-candidate-s2-2 | 210.761 | 254.309 | 0.890 | 467.072 | 1 | Passed |

Elapsed starts at planning submission and ends at external verification. Setup
is outside that interval. Active time sums the planning, implementation and
verification phases minus protocol-marked blocking respondent intervals;
orchestration is the remaining intervening elapsed time. All native questions
were marked nonblocking by the client; their immediate simulated response time
is reported separately, not as human decision latency.

| Run | Setup | Orchestration | Active | Respondent ms | Tool calls | Total tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| b1-baseline-s2-1 | 1.630 | 2.194 | 518.071 | 0 | 107 | 1,940,996 |
| b1-candidate-s2-1 | 1.520 | 2.210 | 665.787 | 0.701 | 148 | 2,357,691 |
| b2-candidate-s2-1 | 1.650 | 1.190 | 343.992 | 0.174 | 80 | 1,200,054 |
| b2-baseline-s2-1 | 1.605 | 1.101 | 327.714 | 0 | 63 | 1,034,797 |
| b1-candidate-s2-2 | 1.607 | 2.252 | 618.503 | 0.561 | 116 | 1,877,956 |
| b1-baseline-s2-2 | 1.503 | 2.210 | 583.409 | 0 | 104 | 1,706,986 |
| b2-baseline-s2-2 | 1.568 | 1.161 | 332.854 | 0 | 68 | 1,004,480 |
| b2-candidate-s2-2 | 1.653 | 1.112 | 465.960 | 0.541 | 66 | 1,339,431 |

Tool counts include captured command, MCP and dynamic-tool completions; native
question rounds are separate. Tokens are final cumulative client counters per
fresh stage, summed once; totals include cached input. They are not unique context
size, uncached billing or a monetary estimate. Preparation, earlier failures and
independent evaluation are outside these measured delivery totals; no total
experiment cost or savings claim is made.

| Fixture/version | Elapsed median | Elapsed range | Planning median | Implementation median |
| --- | ---: | ---: | ---: | ---: |
| B1 baseline, both observed attempts | 552.942 | 520.265–585.619 | 161.424 | 386.995 |
| B1 candidate r3 | 644.376 | 620.754–667.997 | 282.583 | 357.314 |
| B2 baseline | 331.415 | 328.814–334.015 | 175.672 | 153.664 |
| B2 candidate r3 | 406.127 | 345.182–467.072 | 202.875 | 200.008 |

The B1 baseline median includes the explicitly incomplete second attempt; it is
an observed product-check time, **not a median of two fully qualified deliveries**.
Its missing proof is a quality deficit, never a speed win. All initial attempts,
including environment failures and the original/r2 planning defects above, remain
visible. No rerun was used to replace the unfavorable baseline result.

| Pair | Candidate minus baseline elapsed | Planning difference | Implementation difference |
| --- | ---: | ---: | ---: |
| B1 repetition 1 | +147.733 | +140.250 | +6.886 |
| B1 repetition 2, baseline incomplete | +35.135 | +102.069 | −66.246 |
| B2 repetition 1 | +16.367 | +32.584 | −18.662 |
| B2 repetition 2 | +133.057 | +21.822 | +111.349 |

Descriptively, elapsed medians increased by 91.434 s (16.5%) for B1 and 74.712 s
(22.5%) for B2. The sample is small and B1 quality is asymmetric. Internal test
counts, model generation and implementation choices vary across fresh runs;
ambient machine load, service scheduling and the underlying release behind the
model alias are uncontrolled. These differences do not isolate a causal cost of
agreement. In particular, 13 B1 decision-read calls span only 4.415 s, so the trace
does not support blaming pagination for the overall delay. No runtime optimization
was guessed from that call count.

## Quality and safeguards

Every final application and hidden oracle exited 0. All four candidate independent
evaluations passed: a concrete recommendation and alternatives or one-solution
sufficiency were explained before the actual native question; six packet proposals
were explicitly covered by four answers; matching actor readiness checks bracketed
production writes; significant units, signatures, ownership and dependency direction
were preserved. B1 discussed its shared decision once and explicitly covered both
tasks in one question. B2 retained the existing function/configuration boundary.
No class or pattern was invented to satisfy a question quota.

All first production implementations passed their initial GREEN. Reviewers found
zero corrective product-code cycles in seven runs; baseline repetition 1's count
remains unknown rather than inferred as zero. Expected RED and deliberate PROVE
mutations are not counted as corrective rework. Baseline technical-agreement
omissions remain comparison findings, not failures of a requirement introduced
only in the candidate.

The second B1 baseline did, however, omit an existing required check: P01 V01/V02
successful-output assertions were not reached during RED, and the packet's required
subsequent PROVE was never observed. Its actor marked completion; its independent
review correctly returned `incomplete`. Passing application/oracle output does
not fill that gap. See
[the actual review](technical-implementation-planning/initial/b1-baseline-s2-2/evaluation.json).

| Focused scenario | Observed result | Independent verdict |
| --- | --- | --- |
| Q3 partial/dismissal/resume | Only P1 ready after partial answer; actual dismissal leaves P2 pending; final fresh resume preserves P1's exact binding and resolves P2 | Passed |
| Q4 shared drift | Dependent P01/P02 stale, independent P03 ready, reviewed specification unchanged | Passed |
| Q5 execution boundaries | Legacy stops before production writes; private serialization helper passes local/oracle checks; class/signature/ownership substitution returns to planning before production edits | Passed |
| Q6 behavioral routing | Exit 2→3 request returns to specification with no production edits; subsequent simulated owner amendment causes actual review invalidation | Passed |

Raw focused results/evaluations are under `technical-implementation-planning/focused/`.
Seeded agreements and the post-routing owner amendment are clearly SIMULATION
preconditions, not fresh native answers or real human consent. The original Q3
partial/resume attempt lacked an actual dismissal and is retained under
`focused/attempts/q3-partial-resume-v1/`. A fresh v2 adds an unanswered continuation;
it does not relabel the earlier attempt. The first Q5 evaluator ended without a
verdict while reading combined captures; it is retained under
`focused/attempts/q5-evaluation-v1/`. A fresh read-only evaluator used bounded
structured reads and a finite 8 MiB message limit with the same quality criteria.
Its successful result does not retroactively pass the failed evaluation attempt;
the first transport root cause was not conclusively captured.

Full-run evaluator JSON retains `App-server exited: SIGTERM` after the captured
successful turn. Inspection of the reused `JsonlClient.close` proves that owned
process disposal emits that diagnostic; derivation recognizes it only with a real
completed turn and final structured verdict. Raw errors are preserved. A failed,
missing or interrupted turn cannot use this exception. Exact private controller
sources and hashes are captured under `sources/`; they are evidence snapshots,
not a new supported benchmark runner.

## Repository verification and accepted decisions

Final `rtk npm test`: **1045 passed, 0 failed/cancelled/skipped**. `rtk npm run lint`,
`rtk npm run generate:check` and `rtk npm run validate` exited 0; both generated
bundles pass structural checks. Earlier test failures exposed stale word/step-number
assertions. Test-only repairs now check the same substantive conditional-read,
standalone-tool and required-check gates, with negative mutations that remove or
weaken each rule. Frozen workflow sources did not change during these repairs.
Evidence: [repository-checks.json](technical-implementation-planning/repository-checks.json)
and [product-boundary-repair.json](technical-implementation-planning/product-boundary-repair.json).

The main specification still passes with the original source/specification/review
pins, no issues and no new approval checkpoint write. Baseline's 569 and r3's 575
frozen source files match their original bytes; see `sources/post-run-preservation.json`.
Live Claude behavior remains excluded and unverified. No commit, installation,
global configuration mutation or publication was performed.

Before the amendment, the required evidence-consistency command exited **1**, with exactly two
findings for the incomplete baseline: `required-prove-missing` and
`evaluation-unreviewed`. The latter
finding reflects the absence of a successful verdict, not absence of the actual
independent reviewer. See
[the retained check](technical-implementation-planning/consistency-before-scope-decision.json).

The user then explicitly authorized narrow negative-baseline accounting and
accepted the measured current tradeoff. The exact questions, answers and native
item IDs are in [P03](../specs/technical-implementation-planning/tasks/03_behavioral_qualification.md).
The original requirement that every baseline count as a successful delivery is
no longer required under this approved amendment; the baseline's missing proof
itself is still **incomplete**, not passed or repaired retroactively.

`comparisonOutcome` now explicitly attributes this one baseline omission to its
captured independent incomplete review. The existing verifier recomputes the
omission and retains it in `comparisonFindings` with `countedAsSuccess: false`.
Candidate/focused failures, invalid attribution, missing references, timing,
provenance and other required-check failures remain blocking. The 30 focused
evidence checks passed after RED/GREEN/PROVE; removing only the baseline restriction
caused the intended candidate-reuse rejection test to fail. Malformed/null input
is rejected, not thrown. No oracle, frozen scenario or model criterion changed.

The final consistency command exits **0**, with no blocking findings, one visible
incomplete comparison finding and all **241** artifact references resolved. It
still reports `behaviorCertified: false`; actual behavior is supported by the
separate raw trials and fresh evaluations. See
[consistency.json](technical-implementation-planning/consistency.json) and
[comparison-verifier-proof.json](technical-implementation-planning/comparison-verifier-proof.json).
Personal directory owner/group labels were pseudonymized in seven captured files;
the private originals and before/after digests are retained, with item IDs, answers,
checks and verdicts unchanged. No temporary authentication copies remain.

P03 is complete with its explicitly accepted slowdown and documented comparison
limitation. P04 still requires its own explicit invocation. No further measured
optimization or baseline rerun is implied by these decisions.
