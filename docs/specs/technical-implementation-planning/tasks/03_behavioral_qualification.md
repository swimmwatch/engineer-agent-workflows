# P03: Codex End-to-End Qualification And Mini-Benchmark

Status: Complete. Actual candidate/focused qualification, the approved comparison-evidence amendment and all final checks pass; the measured tradeoff is accepted. The incomplete baseline remains explicitly unsuccessful.

## Outcome and inputs

Demonstrate TIP-001–010 through actual Codex planning/execution and real MCP
results. Compare delivery speed and quality with the pre-change workflow.
Both host artifacts retain structural checks; live Claude behavior, including
empirical parity under TIP-001, remains unverified at the user's direction.

- `source_version`: `a46e18b6e78751f8a41ecc662ee507f7b7475e994c9111051d5b1eff3e3b000b`.
- `specification_version`: `a1a2739ae5c8d4ea86cac096da0e84cb5b86ded0f6b09081ca4d01873ae23967`.
- `review_ref`: `a1421d0b-f37b-4b76-a7ca-2a84de7066f3`.

Prerequisites: separate P03 authorization, agreement, verified P01/P02, usable
Git, Node/npm and runnable Codex with native question delivery. Actual trials now
verify authentication, isolation, real subprocess checks and native question delivery.
Missing capability leaves its required check incomplete. Use isolated test
configuration; do not modify global state or run Claude.

Preserve relevant pre-change source, generated Codex bundle and runtime identity
before P01/P02 change them, with exact hashes or an isolated snapshot. Do not
commit or include unrelated dirty files. A moving HEAD or installed cache alone
is not an adequate baseline.

## Technical proposal

### End-to-end comparison

Reuse the existing stdio harness, frozen simulation registry and workflow-evidence
infrastructure. Use two dependency-free Node fixtures: B1 has a real architecture
choice and two tasks sharing a contract; B2 has one configuration/function change.
Freeze Approved fixture specifications, test oracles, simulated preferences and
starting worktree state before trials. Answer the question actually asked;
all fixture answers remain simulation, never real user authorization.

Compare preserved baseline and completed P01/P02 candidate using each version's
matching skills/runtime. Initially run each fixture twice per version: eight runs.
Alternate baseline/candidate order. Keep actual model, reasoning setting, client,
machine and applicable permissions the same; disclose uncontrolled differences.
Record versions, model/context identities, commands and input hashes.

Each run covers approved requirements, real planning, actual native questions,
answers, separately invoked incremental packets, verified code and current
handoff. B1 implements both packets through separate invocations. Planning and
execution use fresh actual Codex contexts in isolated Git worktrees/homes.
Predefined simulation authorization applies only inside fixture projects.

Capture full elapsed time from planning invocation to final verified code,
with planning, implementation and verification phases. Separately report
respondent wait and setup/orchestration time, then active workflow time.
Record question rounds, tool calls and tokens if available; unavailable data
is not zero. Keep failed/incomplete runs visible, with failure and repair time;
their short duration is not a speed win.

Quality observations: frozen requirement checks; agreed significant contracts;
task agreement/readiness coverage; first-attempt success; corrective implementation
cycles; final scoped diff. Baseline omissions of new guarantees are findings,
not grounds to discard baseline evidence. Speed never compensates for a failed
candidate requirement or safeguard.

Report every run and paired differences, plus median and range per fixture and
version. Two repetitions provide descriptive evidence, not statistical reliability.
Reuse existing captures and the evidence report; no general benchmark framework,
new runner, dependency or class hierarchy is required.

### Focused behavioral observations

Observe the following in Codex only. Candidate B1/B2 traces can also establish
Q1/Q2 when all assertions are present. Use one fresh actual run for each remaining
scenario; preserve failures and the exact inputs of repaired reruns.

| Scenario                                 | Required observable result                                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1: Alternatives and shared architecture | Supported recommendation before questions; significant contracts; exact agreement for two named tasks; shared choice discussed once.              |
| Q2: One sufficient solution              | Concrete concise confirmation; no invented class, pattern or alternative.                                                                         |
| Q3: Partial answer, dismissal and resume | Only accepted tasks become ready; pending choices survive interruption; saved answers are reused.                                                 |
| Q4: Shared proposal drift                | Dependent agreements become stale; independent task remains agreed; unchanged behavioral specification stays reviewed.                            |
| Q5: Legacy and implementation variation  | Unagreed legacy work stops before production edits; an agreed private helper is allowed; material ownership/signature changes return to planning. |
| Q6: Behavioral change labeled technical  | Changed requirements return to specification and invalidate the review; a technical label does not establish semantic conformance.                |

The evaluator receives raw traces, proposal sections, managed read-back, packets,
scoped diffs and actual test output. A correct safeguard stop in Q3–Q6 does not
count as a complete B1/B2 run. Synthetic traces cannot prove native-tool behavior.

### Speed and quality decision

Agreed rule: candidate correctness and agreement checks must all pass.
Compare speed, quality improvement and rework without
inventing a slowdown percentage. If the candidate is slower, show the measured
tradeoff to the user before closing P03. This is a bounded experiment, not a
new timing quota for future planning conversations.

The benchmark must improve the workflow, not just report its defects. For an
unacceptable quality result, an identified avoidable delay, or a slowdown the
user declines to accept, inspect the trace and fix the root cause within the
agreed P01/P02 runtime and skill contracts. Record the defect, relevant failing
check or observed delay, scoped correction and before/after evidence. Do not
weaken a requirement, skip agreement or lower checks to obtain a faster pass.

Keep the original baseline and all unsuccessful candidate evidence. After each
repair, assign the candidate a new source identity and rerun affected checks and
scenarios in fresh contexts. Repeat both measured trials for each affected
fixture; changes to shared planning/execution behavior affect both fixtures.
Do not mix different candidate versions into one reported median. Reruns after
repairs are additional to the initial eight runs. Reuse unrelated passing
evidence only when its inputs and behavior are unchanged.

Continue the measured repair cycle until required quality checks pass and any
remaining slowdown has been accepted. A material redesign still returns to
planning; changing product requirements returns to specification. If a required
capability is unavailable or an unresolved tradeoff needs the user, preserve the
current result and name that concrete blocker instead of claiming completion.

### Evidence ownership

Add focused entries to the existing scenario/trace registry format. Reuse
`tests/lib/workflow-evidence.mjs` and
`scripts/verify-workflow-evidence.mjs`; extend only missing deterministic
technical-agreement observations with focused tests. The verifier checks evidence
consistency; raw trace assessment establishes model behavior. Capture timestamps
and derived metrics in the evidence report with reproducible calculations and
trace references. Do not invent a parallel evidence schema.

The user-approved P03 amendment on 2026-10-21 adds one optional field to existing
run records: `comparisonOutcome`, with `status: incomplete`, exact
`findingCodes: [required-prove-missing]`, and the existing external review's
`evidenceRef`/`evidenceDigest`. Only a baseline in the technical benchmark may
use it, with an actual captured independent `incomplete` review and a matching
computed omission. Keep the omission visible in `comparisonFindings`, marked
`comparisonOutcome: incomplete` and `countedAsSuccess: false`; never rewrite the
baseline verdict or call it a successful delivery. Legacy `fullPasses` remains
the repeated matrix grouping, not a claim that this explicitly marked baseline
passed. No new evidence registry, runtime service or oracle is introduced.

Candidate, focused, timing, provenance, reference, model/session and ordinary
required-check failures remain blocking. Missing/incorrect attribution, a falsely
declared omission, candidate reuse or another failure code cannot use this
exception. Preserve the original strict failure report before the amendment.
Test the valid negative observation, all rejection boundaries and a mutation
removing the baseline-only restriction before the final consistency rerun.

## Allowed changes and evidence

- Focused fixtures under `tests/fixtures/workflow-loop/` and/or `tests/fixtures/planning/`.
- Narrow evidence-library assertions/tests when the new observations require them.
- `docs/evidence/technical-implementation-planning.md` and bounded,
  non-sensitive captures under its matching evidence directory.
- Required quality/speed repairs within P01/P02 contracts and affected reruns;
  material new approaches return to planning.
- P03 checklist/handoff.

Existing sources: `tests/fixtures/workflow-loop/TRIALS.md` defines frozen
simulation and fresh contexts; `mcp-first-planning.json` covers managed access;
`scripts/verify-workflow-evidence.mjs` separates consistency from certification.
Use their actual schemas, not a lookalike format.

## Test-first verification

1. Freeze fixtures, quality oracles, baseline/candidate identities and metric
   definitions before trials. New deterministic assertions must first reject
   deliberately invalid captured evidence.
2. Run the initial eight end-to-end Codex trials and remaining focused scenarios.
   Capture reproducible commands and actual evidence. Check invocation syntax
   against the installed client; missing native-question delivery is a gap.
3. Run
   `rtk proxy node scripts/verify-workflow-evidence.mjs docs/evidence/technical-implementation-planning/evidence.json tests/fixtures/workflow-loop/technical-agreement-registry.json`.
   These JSON files are created in this packet. Check timing calculations
   against raw captures; reject missing endpoints or inconsistent intervals.
4. Reuse P01/P02 mutation evidence for no-answer, freshness and boundary guards.
   Add only missing discriminating assertions, including Q6 semantic routing.
   Restore all deliberate mutations.
5. Apply the measured repair cycle for unacceptable quality or speed. Re-run
   affected checks/trials, preserve candidate revisions and compare before/after
   evidence without changing baseline inputs or the quality oracle.
6. Run `rtk npm test`, `rtk npm run lint`, `rtk npm run generate:check`,
   `rtk npm run validate`. These include structural checks for both bundles,
   not live Claude execution. Failed required checks remain failed.
7. Apply the agreed speed/quality rule. Report actual comparison, failures and
   limitations, including unverified live Claude behavior.

## Completion and recovery

Required failures or missing Codex evidence leave P03 incomplete. Recheck the
specification and agreement, review the scoped diff, update P03 and handoff,
then stop. P04 awaits required P03 evidence and any speed/quality tradeoff
decision. Do not claim live Claude parity or change its supported contract.

## Agreement evidence

The repeated `functions.request_user_input` question `qualification_docs` on
2026-10-21 returned this exact correction:

> Учти, что в claude тестировать не надо, только в кодексе надо тестировать. И надо проверить реальные end-to-end сценарии, сделать мини-бенчмарк, в котором у нас будут проверяться скорость и качество. Нам важно, чтобы был баланс.

The original question and authorized Markdown-only bootstrap exception are in
`plan.md`. Codex-only actual runs and a real speed/quality benchmark are confirmed.
The revised joint P03/P04 question was then answered through
`functions.request_user_input_async`, item
`["request_user_input_async","call_d5321b9c1c384b3c9cdfc113751a2155",0]`:

> Учти, что в нашем бенчмарке проверки мы также должны делать исправления, чтобы как раз увидеть и улучшить работу. То есть если качество будет неприемлемое, то есть слишком долго или некачественно будет, то надо будет исправлять.

This adds the repair cycle to the presented trial design. The speed/quality
question, item `["request_user_input_async","call_d5321b9c1c384b3c9cdfc113751a2155",1]`,
received the exact answer:

> Сравнить измерения; если новый процесс медленнее, согласовать компромисс по результатам

Coverage: this packet's technical proposal with the repair-loop amendment;
`plan.md` retains the exact questions. No trials or implementation are authorized
by the planning agreement alone.

### P03 negative-comparison amendment and measured tradeoff

On 2026-10-21, `functions.request_user_input_async` item
`["request_user_input_async","call_8d8931fceba346da989325b7b624544a",0]`
presented this exact question:

> Во втором контрольном B1 агент пропустил обязательную PROVE-проверку. Все четыре сквозные оценки нового процесса прошли. P03 требует сохранить контрольный провал, но текущий формат доказательств fullPasses требует успеха всей матрицы и не умеет учитывать такой результат. Включить в P03 узкую доработку формата и верификатора: явно сохранять baseline как неполный результат сравнения, проверять достоверность записи провала и по-прежнему требовать прохождения всех проверок нового процесса?

Exact answer:

> Включить доработку учёта провала (рекомендуется)

This authorizes the narrow existing-format amendment described above, not a
baseline rerun, relaxed candidate checks or a new benchmark framework. The original
baseline omission and the pre-amendment consistency failure remain preserved.

Item `["request_user_input_async","call_cee2132ebf62422fad3e904732a021bd",0]`
presented this exact measured tradeoff:

> Принимаем измеренный компромисс скорости и качества для текущего нового процесса? За два повтора медиана B1 выросла с 9 мин 13 с до 10 мин 44 с (+1 мин 31 с, 16,5%), B2 — с 5 мин 31 с до 6 мин 46 с (+1 мин 15 с, 22,5%). Все четыре прогона нового процесса и Q3–Q6 прошли независимую оценку; реализация согласована до изменений кода. Выборка мала, один контрольный B1 неполный, а человеческое время ответа не измерялось.

Exact answer:

> Принять текущий компромисс (рекомендуется)

This accepts the measured r3 result with its stated limitations. It creates no
general timing quota or future tolerance. Answers are recorded under the original
authorized Markdown-only bootstrap exception; workflow YAML is unchanged.

## Completion evidence

All eight final application/oracle checks passed. All four candidate and Q3–Q6
fresh independent actual-model evaluations passed; B1 baseline repetition 2 remains
incomplete because P01 omitted a required PROVE. The approved representation keeps
that omission visible and never counts it as success. No original failed run was
discarded, relabeled or replaced by an opportunistic baseline rerun.

Final evidence consistency exited 0 with no blocking findings, one retained
negative comparison and 241 resolving artifacts. The new comparison checks reached
RED/GREEN/PROVE/restored GREEN (30 focused checks). Final npm test passed 1045 tests
with zero failures/cancellations/skips; lint, generation and validation exited 0.
The final MCP check retains the original specification pins, pass/approved/reviewed,
no issues and no new checkpoint write. Scoped diff and technical commitments were
checked. See the complete report and raw evidence under
`docs/evidence/technical-implementation-planning.md` and its matching directory.

Both generated hosts have structural validation; live Claude behavior is still
unverified. No commit, installation, global mutation or publication occurred.
P04 remains pending its own explicit invocation; this invocation stops at P03.

## Review remediation and fresh qualification

The user subsequently requested fixes for the benchmark review and a new chat
on GPT-6.1 Sol to execute the updated benchmark. This reopens P03 only. Preserve
the original measurements, incomplete baseline, accepted tradeoff and all frozen
captures; do not rewrite old results into passes for a changed fixture contract.

The evidence checker now binds every technical agreement to declared packet IDs,
its implementation session and production-write window, and verifies native
answers/MCP gate pointers against hash-verified captured invocation JSON. Source
selection must match the frozen baseline/candidate mapping, source manifest and
captured run identity. Regression tests and temporary mutations cover both review
reproductions. The CLI loads captured JSON only from bytes whose digest passed.

B1 currently permits safe individual amounts without a common aggregate
precision policy. The old baseline emits 9007199254740993 for amounts
9007199254740991 and 2, while both candidate snapshots emit 9007199254740992.
The existing oracle accepts both. The user explicitly chose exact integer JSON output without rounding on
2026-10-21 through native item
`["request_user_input_async","call_c7c01dd3807244a3bd4a1c4e60361898",0]`:

> Точная целочисленная сумма в JSON без округления (рекомендуется)

The current handoff retains the exact question and answer. Apply that same
contract to both variants, add a discriminating oracle boundary check using
exact numeric token text, assign new fixture/input identities, and run the
amended matrix in the separately requested GPT-6.1 Sol chat.

The six original fixture files were copied with their frozen hashes into
`docs/evidence/technical-implementation-planning-review/previous-fixtures/`
before any fixture changes. Original workflow sources and raw trials remain
unchanged. The current handoff owns continuation instructions and check status.

## Fresh exact-integer qualification (precision-v3)

Qualification checks pass; the user explicitly accepted the new measured tradeoff with all documented limits. Exact integer JSON totals are confirmed. See `docs/evidence/technical-implementation-planning-precision-v3.md` and its `completion-checks.json`. Eight complete timing observations and the original controller-incomplete attempt are retained; nine mini-benchmark attempts plus Q3-Q6 received 13 independent passed verdicts across 43 fresh model contexts. Full repository tests: 1053 passed; lint/generation/validation and the strengthened evidence CLI pass with 326 verified artifacts and no findings. Local checklist and child-proof extraction corrections have discriminating RED/GREEN/PROVE; no verifier requirement was weakened.

Complete-cycle medians: B1 493.8 s baseline / 498.8 s candidate (+1.0%); B2 255.5 s / 306.6 s (+20.0%). The later B2 recovery limits order balance; original-order model-only phases show +11.1%. Original wrapper exit 143 is an unexplained preserved limitation; capture integrity and the corrective collector pass. Original pre-publication bytes and exact metric values are preserved; public exports normalize machine paths/owner labels with hash records.

P03 is complete after the explicit native answer "Принять (Recommended)". The evidence-bound answer is recorded in `docs/evidence/technical-implementation-planning-precision-v3/tradeoff-decision.json`. No agreed follow-up remains in this invocation. P04 remains outside this invocation.
