# Specification completeness and correction evidence through MCP

## What this explanation covers

- Findings: **P06-F01** and **P06-F02**, both accepted, source-confirmed opportunities.
- Basis: the [completed audit](<../audit.md#L287-L332>), [P06](<../P06.json>) and
  [independent V01 verification](<../V01.json#L227-L272>).
- The 18:52:23Z source/distribution hash verification supplied for this regrouping
  is reused; no audit, scenario, benchmark or test was rerun here.
- This is an explanation of existing behavior and narrow follow-up opportunities,
  not an implementation plan or a replacement specification.

## Actual skill and actor flow

1. An explicitly invoked **spec-driven-development** author confirms task scope,
   drafts requirements and enters the persisted mechanical-check/review cycle.
   Only a fresh recorded pass permits the author's Approved transition; no extra
   final approval question is required. See the [skill entry](<../../../../../skills/spec-driven-development/SKILL.md#L32-L65>).
2. A separate checker follows the [completeness reference](<../../../../../skills/spec-driven-development/references/completeness-review.md#L18-L32>):
   read each exact item through every portion, retain its complete-read receipt,
   and checkpoint individual verdicts or groups of at most 20.
3. A large review may use bounded reader assignments, but the coordinator owns
   writes, uses its latest successful context, and reads/judges the final whole
   specification itself. Readers consume their own originals; another actor's
   receipt is not a substitute. See [coordinator ownership](<../../../../../skills/spec-driven-development/references/completeness-review.md#L34-L72>).
4. After completed findings, the author uses changes-summary navigation and then
   changes-read exact evidence; only the terminal evidence response supplies the
   receipt needed to request a mechanically eligible follow-up. See the
   [correction consumer contract](<../../../../../skills/spec-driven-development/references/followup-review.md#L10-L38>).
5. The independent follow-up checker reads pending details, expands uncertain
   impact, then judges the whole current specification. Detailed writes or scope
   expansion invalidate earlier final consistency evidence. See the
   [follow-up sequence](<../../../../../skills/spec-driven-development/references/followup-review.md#L49-L77>).

## P06-F01 — Two correction readers still use default-sized portions

### Numbered trigger and current operations

1. A completed review contains a long finding explanation or a changed
   before/after field exceeding 1024 Unicode code points.
2. The author exhausts summary navigation, then calls
   `specification_review_changes_read` with its exact `report_version`.
3. Each fragment runs `readConsistent`, reconstructs current and historical
   inputs, recomputes impact/required items and selects the exact evidence field.
4. That caller uses `portion` without a size argument. The compatible legacy
   `specification_review_changes` report reader does the same.
5. Both therefore continue in default 1024-point pieces even when the actual
   context-bearing response could safely hold more. Repeated calls repeat impact
   reconstruction and transport/context envelopes, not new semantic evidence.

**Direct evidence:** [impact reconstruction](<../../../../../packages/engineer-agent-workflow-mcp/src/review-followup.ts#L39-L91>),
[both correction callers](<../../../../../packages/engineer-agent-workflow-mcp/src/review-followup.ts#L269-L300>),
[portion default/maximum and identity](<../../../../../packages/engineer-agent-workflow-mcp/src/requirements.ts#L80-L104>).
The global default is 1024; the supported maximum is 4096. Crucially,
[review-get already adapts from 4096](<../../../../../packages/engineer-agent-workflow-mcp/src/reviews.ts#L249-L267>).
This is not another recommendation to optimize that already-adaptive caller.

### Minimal before / after, with unchanged meaning

- **Before:** a long exact correction field requires more fragments, each with
  the same reconstruction/envelope work, because these two callers omit size.
- **After proposed local reuse:** those callers try the existing adaptive approach
  against the real refreshed-context success envelope and shrink when needed.
  The [shared budget helper](<../../../../../packages/engineer-agent-workflow-mcp/src/response-budget.ts#L3-L8>)
  counts structured UTF-8 and the duplicated/escaped wire result.
- A collection of short fields still needs separate structured fragments.
  No field batching API, report cache, global-default change or summary shortcut
  follows from this finding. Delivered originals and semantic workload stay equal.

### Discriminating follow-up checks, not run here

1. Extend the [long Unicode/reconstruction cases](<../../../../../packages/engineer-agent-workflow-mcp/test/review-structured-changes.test.mjs#L45-L58>)
   and [structured/legacy guards](<../../../../../packages/engineer-agent-workflow-mcp/test/review-structured-changes.test.mjs#L157-L231>)
   with a long escaped field that can safely exceed 1024 points in one response.
2. Compare exact reconstructed field/report bytes and terminal receipt equality;
   switch between old and new page sizes in both directions mid-field.
3. Use the [variable-size and envelope cases](<../../../../../packages/engineer-agent-workflow-mcp/test/review-read-efficiency.test.mjs#L100-L129>)
   as controls for escaping-heavy Unicode, stale/foreign/tampered cursors and
   explicit failure when no portion fits. An incomplete read must issue no receipt.
4. Keep short fields as a negative control: no general continuation reduction is
   promised. Later measurements should separate calls, handler time and wire bytes
   from model turns, tokens or comprehension.

**Ownership and confidence:** specification-review MCP owns the two call sites;
response-budget ownership supplies the existing predicate. No skill instruction
change is needed: the author already must consume every continuation. Confidence
is high in repeated default-sized work, but workload frequency and savings remain
unmeasured. See the [accepted scope and dependencies](<../audit.md#L291-L308>).

## P06-F02 — A retained old read context can select an old warm final body

### Numbered trigger and current operations

1. A read-only observer primes the enhanced final body using context C0, before
   all detailed verdicts have been added; the bounded cache retains that body.
2. Another client records a detailed verdict. Physical ledger bytes and
   `run.results` change, but the behavioral `source_version` does not.
3. Before eviction, the observer reads final context again using retained C0.
   [Snapshot construction](<../../../../../packages/engineer-agent-workflow-mcp/src/review-model.ts#L11-L18>)
   loads current results but exposes the input context's decisions version.
4. The [body cache and receipt construction](<../../../../../packages/engineer-agent-workflow-mcp/src/review-followup.ts#L179-L236>)
   can select the earlier body by that retained key. Enhanced final text includes
   `detailed_results`, so old text and freshly observed result dependencies diverge.
5. [Get constructs the body before output-context refresh](<../../../../../packages/engineer-agent-workflow-mcp/src/reviews.ts#L249-L267>).
   With a short body, recording its receipt using refreshed write context can
   fail `INCOMPLETE_READ`; with a paginated body, a refreshed continuation can
   change body identity and fail `STALE_CURSOR`. Recovery requires a final reread.

### Minimal before / after and strict boundary

- **Before:** caller-retained physical version can choose a warm body that omits
  current results, despite a fresh underlying read.
- **After proposed correction:** use actually observed decisions-byte identity
  and all supplied-ledger in-memory result dependencies when selecting enhanced
  final bodies. Keep the four-entry/64 MiB cache and exact body/receipt format.
- This is an observer/resume **retained-context plus warm-cache** edge case.
  It is not a claimed failure of the normal latest-context coordinator and not
  an approval bypass. [Writes retain version checks](<../../../../../packages/engineer-agent-workflow-mcp/src/state.ts#L162-L181>),
  [results refresh output context](<../../../../../packages/engineer-agent-workflow-mcp/src/state.ts#L388-L404>) and
  [consistency recording rejects mismatched receipts](<../../../../../packages/engineer-agent-workflow-mcp/src/review-followup.ts#L339-L350>).
  Accepting stale receipts would remove a safeguard, not fix cache selection.

### Discriminating follow-up checks, not run here

1. Add retained-C0/two-client/warm-cache coverage beside the
   [existing updated-context early-read case](<../../../../../packages/engineer-agent-workflow-mcp/test/review-full-consistency.test.mjs#L170-L195>).
   Compare exact final `detailed_results` and recording with refreshed write context.
2. Separate short terminal and paginated bodies; require valid unchanged-body
   continuations, but allow proper cursor invalidation when the body truly changes.
3. Use current-context, cold-cache, eviction and restarted-process reads as
   negative controls; include supplied-ledger callers with changed in-memory results.
4. Preserve the [observer concurrency contract](<../../../../../packages/engineer-agent-workflow-mcp/test/review-concurrency.test.mjs#L159-L177>):
   reads expose current progress without becoming another writer.

**Ownership and confidence:** snapshot/body-cache owners must align observed
versions with result dependencies before pagination tuning. No new coordinator
instruction is needed; existing latest-context guidance stays. Source reasoning
is high-confidence under the stated conditions; no runtime incident, frequency,
reproduction or elapsed saving was established. See [V01's qualification](<../V01.json#L250-L272>).

## Concurrent test additions discovered during delivery

Three new untracked files appeared after this follow-up began: a [review workflow fixture](<../../../../../packages/engineer-agent-workflow-mcp/test-support/review-workflow-fixture.mjs#L108-L175>), [submission tests](<../../../../../packages/engineer-agent-workflow-mcp/test/review-submission.test.mjs#L7-L83>) and [workflow preparation tests](<../../../../../packages/engineer-agent-workflow-mcp/test/review-workflow-preparation.test.mjs#L7-L74>). They were read only and preserved. Their source targets preparation/submission, concurrency/replay, bounded lanes and completion selection; their presence alone does not prove that a serving runtime implements those new scenarios or that the tests pass. No tests were run.

All originally baselined source bytes, including the correction readers and final-body cache dependencies above, remained unchanged. The new tests do not establish a reproduction or fix of P06-F01/P06-F02. Before adding later regressions, coordinate with the owner of these concurrent additions and reuse suitable fixtures rather than writing a competing review harness. This note does not assign authorship to a particular session.

## Mechanical checks are not semantic final review

Receipts establish complete delivery and source/result binding; hashes establish
identity; counts establish mechanical coverage. None proves comprehension,
independence, absence of implicit impact, or whole-specification consistency.
The [final semantic obligations](<../../../../../skills/spec-driven-development/references/completeness-review.md#L153-L184>)
and [preserved review optimizations](<../audit.md#L80-L91>) remain: fresh profiles,
provisional inheritance, expansion, exact originals, one write owner and the final
coordinator judgment. These findings reuse safe mechanics; they remove no judgment,
approval boundary, freshness guard or mandatory final read.
