# Fresh technical implementation planning qualification: exact integer revision

Status: Complete. The user explicitly accepted the new measured tradeoff with the documented limits.

## Result

Both variants meet the same product requirements, including the exact JSON integer token `9007199254740993` for `9007199254740991 + 2`. Eight complete timing observations and one separately retained controller-incomplete attempt were collected. All nine mini-benchmark attempts and all four Q3–Q6 cases received fresh independent `passed` quality verdicts. The [evidence consistency check](technical-implementation-planning-precision-v3/verification.json) has no findings; this checks captured evidence consistency and does not certify general model behavior.

The [43-context audit](technical-implementation-planning-precision-v3/context-separation.json) verifies distinct ephemeral sessions, actual reported `gpt-6.1-sol`, medium requested on every turn, separate planning and packet contexts, and 13 fresh read-only reviewers. Reviews and focused cases ran only after the serial measured trials and their corrective run.

## Frozen inputs and sources

The [original input freeze](technical-implementation-planning-precision-v3/frozen-inputs.json) precedes the eight alternating trials. The [corrective input freeze](technical-implementation-planning-precision-v3/recovery-inputs.json) precedes the separately named repeat. [Source-bound comparison mapping](technical-implementation-planning-precision-v3/sources/comparison-recovery.json) binds both frozen workflow manifests; the [capture audit](technical-implementation-planning-precision-v3/capture-integrity.json) confirms unchanged source and final application bytes.

- Baseline workflow revision: `c1f55dcffccf1aa3bb325745114e40bf80a8053d`; source identity `8012e813b1ee865b2eecddd9154fcd686db637fcbc7fe3f5ebe4971314c6d772`.
- Candidate: current agreed canonical/generated workflows; source identity `52a4ab34d306cf153642e33f2fee46cf996803fa478c7f58ee7abf13c9dea978`.
- Runtime: Codex CLI 0.163.0, Node v24.20.0; original workspace sandbox and file-descriptor subprocess fixture retained.

Original order: B1 baseline/candidate r1, B2 candidate/baseline r1, B1 candidate/baseline r2, B2 baseline/candidate r2. The corrective B2 baseline r1 follows that original sequence. Its later position is a timing limitation, not silently treated as the original ordered observation.

## Timing and efficiency

Complete-cycle medians and ranges in seconds cover planning, fresh packet contexts, orchestration gaps and external verification; initial setup is reported separately in [metrics](technical-implementation-planning-precision-v3/metrics.json). Source/fixture preparation and reviewer time are outside this timing scope. Responses are frozen SIMULATION answers, not human deliberation time.

| Fixture | Baseline median [min, max], s | Candidate median [min, max], s | Candidate delta |
|---|---:|---:|---:|
| B1 | 493.8 [486.6, 501.1] | 498.8 [491.0, 506.6] | +1.0% |
| B2 | 255.5 [238.0, 272.9] | 306.6 [302.8, 310.5] | +20.0% |

The original eight ordered captures also support a separate model-phase comparison, including the controller-incomplete B2 baseline. It sums actual planning/implementation turn durations and excludes verification and orchestration:

| Fixture | Ordered baseline model phases, median s | Ordered candidate model phases, median s | Candidate delta |
|---|---:|---:|---:|
| B1 | 488.9 | 494.4 | +1.1% |
| B2 | 274.1 | 304.4 | +11.1% |

The complete-cycle B2 +20.0% uses the later corrective baseline; original-order model phases show +11.1%. These observations do not isolate the causal cost of technical agreement. Two repetitions are descriptive and do not establish a stable performance estimate.

| Fixture / variant | Planning median s | Implementation median s | Counted tool items median | Reported total tokens median | Corrective cycles r1, r2 |
|---|---:|---:|---:|---:|---|
| B1 baseline | 203.5 | 285.5 | 107 | 1,807,130.5 | unknown, 0 |
| B1 candidate | 209.8 | 284.6 | 118.5 | 2,145,345.5 | 0, 0 |
| B2 baseline | 127.3 | 126.0 | 59 | 948,676.5 | 0, 0 |
| B2 candidate | 166.6 | 137.8 | 79.5 | 1,395,843.5 | 0, 0 |

All eight selected attempts have observed first-attempt success. One B1 baseline corrective-cycle count is unknown and remains unknown. Expected RED and mutation failures are not corrective rework. Tool counts include command/MCP/dynamic completed items; native question rounds are separate. Reported token totals include repeated cached input across tool iterations and are not unique-input or billing estimates.

## Attempts and corrections

| Attempt | Original controller outcome | Independent quality | Complete paired timings |
|---|---|---|---|
| [b1-baseline-precision-v3-1](technical-implementation-planning-precision-v3/matrix/b1-baseline-precision-v3-1/result.json) | product-checks-passed | passed | yes |
| [b1-candidate-precision-v3-1](technical-implementation-planning-precision-v3/matrix/b1-candidate-precision-v3-1/result.json) | product-checks-passed | passed | yes |
| [b2-candidate-precision-v3-1](technical-implementation-planning-precision-v3/matrix/b2-candidate-precision-v3-1/result.json) | product-checks-passed | passed | yes |
| [b2-baseline-precision-v3-1](technical-implementation-planning-precision-v3/matrix/b2-baseline-precision-v3-1/result.json) | incomplete | passed | no; missing original verification phase |
| [b1-candidate-precision-v3-2](technical-implementation-planning-precision-v3/matrix/b1-candidate-precision-v3-2/result.json) | product-checks-passed | passed | yes |
| [b1-baseline-precision-v3-2](technical-implementation-planning-precision-v3/matrix/b1-baseline-precision-v3-2/result.json) | product-checks-passed | passed | yes |
| [b2-baseline-precision-v3-2](technical-implementation-planning-precision-v3/matrix/b2-baseline-precision-v3-2/result.json) | product-checks-passed | passed | yes |
| [b2-candidate-precision-v3-2](technical-implementation-planning-precision-v3/matrix/b2-candidate-precision-v3-2/result.json) | product-checks-passed | passed | yes |
| [b2-baseline-precision-v3-checklist-r1-1](technical-implementation-planning-precision-v3/matrix/b2-baseline-precision-v3-checklist-r1-1/result.json) | product-checks-passed | passed | yes |

[All attempt records](technical-implementation-planning-precision-v3/attempts.json) retain the original controller failure, partial model-phase timings, later diagnostic checks, independent verdict and separately identified repeat. A corrective success does not relabel the original attempt.

The precision correction updates both starter requirement sets and both B1 registry scenarios. The oracle compares the raw numeric token without passing the expected sum through Number. [RED/GREEN/PROVE and repository receipt](technical-implementation-planning-precision-v3/precision-correction.json): two discriminating tests and 1,053 full tests pass, plus lint, generation and validation.

The first B2 baseline was a controller false negative: an explicit packet link appears above a fully checked step checklist. The old predicate required the filename on a checked row. The narrow [guard correction](technical-implementation-planning-precision-v3/controller-guard-repair.json) passes five checks and RED/GREEN/PROVE, including rejection of unfinished and unrelated-packet checklists. Diagnostic product checks use unchanged original code and are not backfilled as original timing. The corrective trial uses a fresh ID/application/contexts.

The initial aggregate evidence check rejected four PROVE observations because the report used successful Python wrapper exits. Captured subprocess calls actually print `MUTATION_EXIT 1` after named Node test failures and restore source in `finally`. The [source-bound derivation correction](technical-implementation-planning-precision-v3/derivation-repair.json) uses exact item IDs and command/output hashes; six checks and RED/GREEN/PROVE reject forged marker reuse. The verifier is unchanged. [Initial failed derivation](technical-implementation-planning-precision-v3/derivation-attempts/initial/verification.json), raw captures and reviewer verdicts remain preserved; original metric bytes are unchanged.

The initial controller copy re-encoded inactive Cyrillic respondent alternatives. The [policy audit](technical-implementation-planning-precision-v3/controller-policy-check.json) confirms all four actual matrix answers match the exact original policy; the original matrix controller and restored future helper are separately preserved. A preparation-only assembler syntax error and its correction are retained in [controller provenance](technical-implementation-planning-precision-v3/sources/capture-source-manifest.json).

## Publication normalization

[Publication normalization](technical-implementation-planning-precision-v3/publication-redaction.json) records exact pre/post SHA-256 for machine-path and owner-label replacements. Pre-publication originals are retained in the private ignored cache. Reviewer verdict objects, IDs, timestamps, numeric outcomes and original metric bytes remain exact. Published copies use documented placeholders.

## Q3–Q6 and limitations

- [Q3](technical-implementation-planning-precision-v3/focused/q3-partial-resume/evaluation.json): partial answer accepts one proposal; a separate unanswered continuation keeps one accepted binding; final fresh continuation reuses it and reaches two.
- [Q4](technical-implementation-planning-precision-v3/focused/q4-shared-drift/evaluation.json): shared-source drift invalidates both dependent agreements, retains the independent one and leaves behavioral version unchanged.
- [Q5](technical-implementation-planning-precision-v3/focused/q5-execution-boundaries/evaluation.json): legacy execution stops before production writes; private helper rework passes; material unit/signature change returns to planning.
- [Q6](technical-implementation-planning-precision-v3/focused/q6-behavior-routing/evaluation.json): behavioral exit-code change returns to specification before production writes; the labeled subsequent fixture amendment invalidates behavioral review.

The original collector wrapper returned 143 after all eight durable captures; its cause is unverified and it is not labeled a successful process exit. [Capture integrity](technical-implementation-planning-precision-v3/capture-integrity.json) independently verifies every completed actual turn and final file; the corrective collector and all focus/reviewer commands exit 0. This wrapper outcome remains a limitation. Findings are limited to these toy fixtures, one reported model, simulated respondent answers and two repetitions.

Historical stdio-v2 captures, frozen workflows, verdicts, metrics and six original fixture copies remain unchanged; [historical preservation](technical-implementation-planning-precision-v3/historical-preservation.json) checks them using the saved old registry. Its incomplete baseline remains incomplete. The prior +16.5%/+22.5% acceptance is not applied to these new measurements.

The user explicitly selected "Принять (Recommended)" through the native question tool after reviewing these results and limits. [Evidence-bound decision](technical-implementation-planning-precision-v3/tradeoff-decision.json) closes P03 for this revision only. P04 requires a separate invocation.
