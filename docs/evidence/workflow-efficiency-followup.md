# Workflow Efficiency Follow-up Qualification

Status: Complete for P03. P04 has not started.

Post-review adapter corrections and reassessment are recorded in
[review-fixes](workflow-efficiency-followup/review-fixes/README.md). Original
captures and source hashes below are retained as historical evidence. The
reassessment supersedes their startup-order verdicts: `product-baseline-3`
fails the stricter completion-order check; the selected final candidates pass.

The controlled trials confirm fewer public operations and a smaller mandatory startup context without removing readiness, recovery or completion checks. Native wall time remains variable; these measurements do not establish a general live speedup.

## Public stdio measurements

Thirty tasks, representative findings, identical full/recheck/followup fixtures and complete response envelopes. Order: baseline, candidate, candidate, baseline. Both variants retain the pre-existing response-budget correction. Scripted verdicts establish protocol coverage, not independent semantic review.

| Run | Calls | Response bytes | Advancement status | Wall seconds |
| --- | ---: | ---: | ---: | ---: |
| full-baseline-1 | 761 | 5823367 | 155 | 146.684 |
| full-candidate-2 | 606 | 5440937 | 0 | 128.792 |
| full-candidate-3 | 606 | 5440937 | 0 | 125.301 |
| full-baseline-4 | 761 | 5823367 | 155 | 129.726 |
| recheck-baseline-1 | 195 | 1382921 | 36 | 84.371 |
| recheck-candidate-2 | 159 | 1283081 | 0 | 71.581 |
| recheck-candidate-3 | 159 | 1283081 | 0 | 66.612 |
| recheck-baseline-4 | 195 | 1382921 | 36 | 72.031 |

| Scenario/variant | Median seconds | Range seconds |
| --- | ---: | --- |
| full/baseline | 138.205 | 129.726–146.684 |
| full/candidate | 127.046 | 125.301–128.792 |
| recheck/baseline | 78.201 | 72.031–84.371 |
| recheck/candidate | 69.097 | 66.612–71.581 |

Full review: 761 → 606 calls (−20.37%) and 5,823,367 → 5,440,937 response bytes (−6.57%). Recheck: 195 → 159 calls (−18.46%) and 1,382,921 → 1,283,081 bytes (−7.22%). Advancement-only status calls fall from 155/36 to zero; they are not replaced by another progress poll.

All variants retain 212 blocks. Full delivery covers 212; bounded recheck delivers 36 and inherits 176. Each correction followup delivers one changed block and inherits 211, with eight consistency portions. The corresponding full/recheck consistency counts remain 31/11. Detailed results and raw-capture digests: [benchmark-results.json](workflow-efficiency-followup/benchmark-results.json).

These are descriptive samples (n=2 per public cell). Some overlapped local workloads. Wall time includes fixture/server work and is not model-stage time.

## Native startup and remaining latency

All compared native runs use Codex CLI 0.163.0, actual model `gpt-6-astra`, effort `ultra`, and real isolated stdio MCP. No model substitution was made. A separate loopback Headroom 0.41.0 process used supported no-optimize, no-cache, stateless settings; the installed global service was unchanged. These are controlled passthrough results, not qualification of ordinary external compression.

| Mandatory exact instructions | Baseline bytes | Final candidate bytes | Reduction |
| --- | ---: | ---: | ---: |
| Standalone | 37127 | 31378 | 15.48% |
| Product-linked | 54391 | 31378 | 42.31% |

The candidate reads the common state-access and implementation-context references instead of loading planning authoring and the complete product-stage manual. Required integrity/manual checks and both exact readiness checks still run at entry and completion. The final ordinary trials have zero evaluator findings, no approval questions and no redundant instruction delivery. Retained-context trials reuse exact references; fresh contexts consume their own text.

Elapsed seconds below are measured from the explicit implementation invocation. “Ready” is the later completed entry gate, never its request timestamp. “Explore” includes line-numbered source reads before native start; “Edit” is the first source/test edit, which can be the RED test. One selected observation per native cell is not a latency distribution.

| Trial | Ready | Explore | First test | Native start | Edit | Complete |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| normal-baseline-8 | 46.199 | 68.201 | 116.212 | — | 132.224 | 236.520 |
| normal-candidate-18 | 32.680 | 77.653 | 110.224 | — | 110.034 | 184.655 |
| product-baseline-3 | 33.004 | 78.154 | 155.534 | 97.371 | 152.626 | 297.348 |
| product-candidate-18 | 32.666 | 82.582 | 93.052 | 101.177 | 155.860 | 351.172 |
| retained-baseline-11 | 40.860 | 110.299 | 103.815 | — | 100.882 | 210.512 |
| retained-candidate-10 | 27.056 | 75.856 | 94.380 | — | 91.015 | 210.656 |
| lost-text-candidate-15 | 41.808 | 71.261 | 114.413 | — | 111.486 | 232.897 |
| resume-candidate-14 | 31.456 | 148.601 | 103.747 | — | 99.910 | 199.604 |

| Trial | Tool sum s | Tool union s | Overlap s | Unassigned wall s |
| --- | ---: | ---: | ---: | ---: |
| normal-baseline-8 | 0.864 | 0.646 | 0.218 | 235.874 |
| normal-candidate-18 | 0.749 | 0.617 | 0.132 | 184.038 |
| product-baseline-3 | 1.847 | 1.730 | 0.117 | 295.617 |
| product-candidate-18 | 2.275 | 2.057 | 0.218 | 349.115 |
| retained-baseline-11 | 0.641 | 0.555 | 0.086 | 209.957 |
| retained-candidate-10 | 0.432 | 0.431 | 0.001 | 210.225 |
| lost-text-candidate-15 | 0.841 | 0.713 | 0.129 | 232.184 |
| resume-candidate-14 | 0.729 | 0.611 | 0.119 | 198.994 |

Tool intervals cover the native root calls; overlaps are not added twice. Child actors remain separate. The unassigned interval includes model generation, scheduling and transport; it must not be called measured reasoning time. Model-stage duration, reliable stage-token attribution and human-wait duration are unavailable. Fixture preparation is outside the invocation boundary and retained in private controller timestamps. Fixture answers and dismissed native questions are simulations, not human authority.

Residual delay is visible before the first useful code read and between short tool operations. Smaller input and fewer operations do not guarantee a faster individual run. Preserved costs include exact source continuations, current Git inspection, the two readiness owners, discriminating RED/GREEN tests, and completion read-back. These must not be removed merely to improve elapsed time.

## Safety, context and recovery observations

| Required case | Evidence | Observed outcome |
| --- | --- | --- |
| Missing agreement/tool; changed/revoked inputs | missing-agreement-2, missing-tool-2, changed-source-3, revoked-agreement-4 | Stop before implementation; no fabricated agreement or installation |
| Retained exact context | retained-baseline-11 / retained-candidate-10 | Same actor reuses its complete text; current entry/completion checks remain |
| Lost text / cold context | lost-text-candidate-15 | Two distinct actors each consume the requirement; fresh implementation completes |
| Changed source after preparation | retained-changed-source-candidate-10 | Stale pins stop implementation |
| Incomplete source | partial-source-candidate-14 | All 27 ordered portions, 27,623 characters, correct continuation chain, terminal complete |
| Independent reviewer | independent-reviewer-candidate-14 | Separate fresh actor reads the exact requirement itself; consumption is proven, semantic correctness is not inferred |
| Interrupted invocation / resume | resume-candidate-14 | Actual turn interruption, current synchronization and final completion; root boundaries preserved |
| Lost write acknowledgement | product-lost-ack-candidate-11 | One reply lost after server effect; retry returns the same operation reference with replay=true |
| Interrupted read | product-read-interruption-candidate-11 | One reply lost; fresh exact read completes before dependent work |
| Concurrent observer / changed scope | product-conflict-candidate-11 | Independent observer sees SOURCE_CHANGED; packet remains incomplete |
| Native transition | product-candidate-18 | Exact start/completion binding transitions and independent product observation retained |
| External edit / directory metadata | external-edit-candidate-9 / directory-metadata-candidate-11 | External bytes preserved; directory timestamp is not mistaken for content loss |
| Overlap / protected loss | overlap-candidate-9 / content-loss-candidate-13 | Dependent work stops; another writer’s files are not restored |
| Legacy evidence | legacy-candidate-9 | Legacy assurance is disclosed; separately valid technical agreement remains required |
| Unavailable required completion check | incomplete-check-candidate-9 | Functional oracle passes, required check exits 1, checklist stays incomplete |
| Compact handoff | selected safety captures | Each current handoff is at most 200 words |

The negative oracle exits in safe-stop fixtures are expected: their stub deliberately remains unimplemented. They are not passing functional tests. [Safety results](workflow-efficiency-followup/captures/safety-results.json), [portion/actor results](workflow-efficiency-followup/captures/portion-results.json), and [native results](workflow-efficiency-followup/captures/agent-results.json) retain separate derived artifacts and private raw-event SHA-256 references. P02’s evaluator checks those artifacts through `verifyCapturedArtifacts`; the adapters additionally check independent final state and exact cursor/offset chains.

## Defects found and corrections

1. `content-loss-candidate-9` incorrectly completed while treating unexplained deletion of protected content as a new baseline. The mandatory implementation reference now states the stop rule before edits, including loss already present at entry. `content-loss-candidate-13` stops without implementing or restoring the file.
2. Earlier candidates reread the injected skill. Native attachment metadata alone was insufficient evidence, so an isolated transparent request capture checked the actual client payload: it contains the complete exact SKILL.md. The entry now explicitly reuses supplied SKILL.md/reference text. Final normal/product runs avoid that reread. The capture checker itself rejects an unverified attachment reference.
3. The observation adapter now recognizes `nl` source reads as useful exploration, distinguishes completed gates from requests, separates child/root turns, and cannot promote a passing parser to completion when a required check or checklist is incomplete.
4. Product trial 17 ran both completion-readiness checks before PROVE finished, then repeated them on the same workflow inputs. Those duplicate checks remain failed evidence. The common implementation reference now orders all local checks and restored PROVE mutations before final readiness; current-input changes still require revalidation. Trial 18 verifies the correction.
5. The old lost-text preparation read one identical requirement first without a pin and again with the same returned version. This duplicate remains a failed observation in lost-text-candidate-10; the corrected entry’s lost-text-candidate-15 consumes it once per actor.

Failed setup, invalid reconstructed bundle, early child-completion capture, unavailable exact delivery and failed/interrupted checks retain distinct identities. Trial 16 also encountered shutdown of the owned temporary proxy: normal-candidate-16 timed out, and product-candidate-16 had reconnection errors. Fresh trial 17 uses the same model, profile and frozen source after restarting only that owned process; trial 16 is excluded from ordinary timing evidence. Ordinary Headroom exact-retrieval attempts could be compressed again downstream; those trials stopped before implementation and do not qualify that delivery profile. A 512-byte retrieval experiment did not fix that service behavior and is not used for acceptance. No alternate encoding loop is accepted.

## Linux verification and integrity

Final source `candidate-entry-v8` passed both required Linux runtime cells: Node.js 22.20.0 and 24.14.0. Build, generation check, lint, required public/packed/transport/recovery checks, qualification without scripted model claims, validation and whitespace checks passed. Node 24 additionally ran the complete repository suite: 1,102 tests passed, zero failed. Separate evidence-adapter tests cover actual observation boundaries and negative cases; both runtimes reran those checks after the final observation-only change. Their exits and log digests are in `workflow-efficiency-followup/evidence-checks.json`. Final specification status is pass and exact P03 technical status is ready, with no issues; see `workflow-efficiency-followup/readiness-results.json`. Exact commands, timestamps, exits and log digests are in [linux-results.json](workflow-efficiency-followup/linux-results.json); source digests are in [runtime-inputs.json](workflow-efficiency-followup/runtime-inputs.json).

Node 22 was downloaded only into a temporary directory under explicit authority. The official archive matched SHA-256 `00bbd05e306ea68b6e13e17360d0e2f680b493ef95f2fea1c4296ff7437530bc`. Earlier matrix failures are retained: stale reference-owner assertions, the temporarily removed one-packet sentence, and a wording-sensitive preflight assertion. Final instructions preserve the explicit one-packet rule and the existing preflight assertion; tests were not relaxed to conceal failures.

RED/GREEN and isolated PROVE mutations cover the new entry/loss rules, missing attachment proof, protected-loss completion, stale/missing portions, actor/timing errors and artifact integrity. Mutated copies fail and canonical sources remain restored. The pre-existing response-envelope fix is preserved and is not credited as this optimization.

Native macOS/Windows qualification is excluded, not passed. No global installation, consumer-project change, remote CI, commit or publication was performed. P04 requires its separate invocation. Private raw captures, fixture stores and authentication material are not published. Owned temporary proxy processes and copied authentication files are cleaned up after all trials.
