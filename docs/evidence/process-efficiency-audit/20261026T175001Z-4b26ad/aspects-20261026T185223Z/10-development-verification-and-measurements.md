# Development Checks: Remove Proven Duplicate Runs, Not Distinct Guarantees

## Scope and ownership

Findings: **P12-F1, P12-F2, P12-F4**, independently accepted/narrowed source-confirmed opportunities. These are maintenance/build/test changes, not new instructions for the distributed [performance-optimization skill](<../../../../../skills/performance-optimization/SKILL.md>) or another skill. There was no new defect established in that skill's guidance.

Primary evidence: [P12](<../P12.json>); independent constraints: [V03](<../V03.json>); exact findings: [build duplication](<../audit.md#L639-L662>), [qualification duplication](<../audit.md#L663-L687>) and [benchmark attribution](<../audit.md#L711-L733>). Timing/token savings have not been measured. The original audit's four parser passes are not execution of the scenarios proposed here.

## 1. P12-F1: the local snapshot cache-miss path compares distributions twice

### Current sequence

A new development snapshot goes through:

`source digest → build → generate:check → strict validate → render snapshot → pack with lifecycle scripts suppressed → final source fingerprint → publish staging`.

An existing matching snapshot returns before this sequence. The duplicate cost concerns cache misses, not every development command. See [snapshot builder:212–237](<../../../../../scripts/build-dev.mjs#L212-L237>) and [root command definitions:24–28](<../../../../../package.json#L24-L28>).

Both consecutive distribution gates validate/collect canonical input and compare expected generated output using the common machinery: [generation check:39–79](<../../../../../scripts/generate.mjs#L39-L79>), [strict validation:134–223](<../../../../../scripts/validate.mjs#L134-L223>) and [comparison:810–864](<../../../../../scripts/lib/distribution.mjs#L810-L864>).

**Concrete waste:** on a stable complete input, the second gate repeats source/render/generated-tree work immediately after the first. Later rendering still has a different purpose: constructing snapshot bytes.

**Proposed change:** retain strict validation and remove only the immediately preceding generation-check call inside this builder, **after** paired rejection/acceptance tests establish coverage. Keep the standalone check command, construction rendering, source fingerprint guards, cleanup and atomic publication. Error ordering on incomplete input already differs; do not assert identical diagnostics without investigation.

### Small discriminating test set

Extend [injected builder tests:28–135](<../../../../../tests/dev-build.test.mjs#L28-L135>) with exact runner-call assertions and paired valid/tampered/missing-skill/unexpected-file/unsafe-path inputs. Reuse controls from [packaging tests:387–400](<../../../../../tests/packaging.test.mjs#L387-L400>) and [negative packaging cases:497–632](<../../../../../tests/packaging.test.mjs#L497-L632>). Preserve source-drift rejection, failed staging cleanup and concurrent winner behavior.

Only after equivalence, measure cache misses and cache hits separately. This is a small local command-path change, not permission to remove CI or test freshness hooks.

## 2. P12-F2: Q36 and Q38 rebuild the same restart baseline for different assertions

### Current sequence

- Q36 invokes a wrapper, which runs the baseline with `restartReviewer:true`, shapes the report and owns cleanup.
- Q38 independently creates the baseline with the same option/default server entrypoint, then asserts exact source/recovery properties.
- The first result already exposes the fields needed by the second set of assertions.

See [both test callbacks:148–195](<../../../../../packages/engineer-agent-workflow-mcp/test/product-e2e.test.mjs#L148-L195>), [wrapper selection:211–223](<../../../../../scripts/qualify-product-workflows.mjs#L211-L223>), [wrapper result/cleanup:273–307](<../../../../../scripts/qualify-product-workflows.mjs#L273-L307>) and [harness result:1116–1140](<../../../../../packages/engineer-agent-workflow-mcp/test/support/product-e2e-harness.mjs#L1116-L1140>).

**Concrete waste:** two independent repositories/product fixtures/author-reviewer process lifecycles for the same baseline options in one test file. This does not make standalone CLI, packed-package, reliability or platform tests duplicates.

**Important non-equivalence:** Q38 currently supplies native test cancellation/diagnostics, while the wrapper context exposes only its cleanup hook. Simply deleting Q38 would remove a lifecycle assurance. See [scope/context handling:78–130](<../../../../../packages/engineer-agent-workflow-mcp/test/support/product-e2e-harness.mjs#L78-L130>) and [final teardown:1144–1182](<../../../../../packages/engineer-agent-workflow-mcp/test/support/product-e2e-harness.mjs#L1144-L1182>).

**Proposed change:** one baseline invocation in one test callback, all former assertions against its returned result, native signal/diagnostics carried through the existing owner boundary, and wrapper cleanup retained. Until that lifecycle forwarding is verified, keep both tests. Do not share live mutable fixtures across tests.

### Small discriminating test set

Require complete exact source hashes, a real reviewer restart, exact replay and zero duplicate verdicts. Inject wrong hashes, a dropped continuation, broken replay and a duplicate verdict; each former assertion must still fail independently. Cancel during connection and assert reverse-order teardown and useful diagnostics. Existing restart behavior is in [harness:300–353](<../../../../../packages/engineer-agent-workflow-mcp/test/support/product-e2e-harness.mjs#L300-L353>).

Retain [packed acceptance boundaries:239–286](<../../../../../packages/engineer-agent-workflow-mcp/test/packed-artifact.test.mjs#L239-L286>), [lifecycle CLI gate:64–75](<../../../../../.github/workflows/lifecycle.yml#L64-L75>) and [snapshot qualification gates:38–51](<../../../../../.github/workflows/workflow-reliability-qualification.yml#L38-L51>). Count actual baseline/actor launches before comparing selected-test wall time. Complexity: small consolidation plus lifecycle forwarding, not deletion of assertions.

## 3. P12-F4: benchmark files cannot identify which executable was measured

### Current sequence and scenario

The review benchmark imports prebuilt modules; retirement uses direct tool invocation or a prebuilt stdio server and deliberate reconnect. Their JSON results contain useful workload/timing metrics but no coherent loaded build/contract identity: [review benchmark:7–66](<../../../../../scripts/benchmark-product-review.mjs#L7-L66>), [retirement startup:54–94](<../../../../../scripts/benchmark-roadmap-retirement.mjs#L54-L94>) and [retirement results:178–219](<../../../../../scripts/benchmark-roadmap-retirement.mjs#L178-L219>).

A developer can switch source branches without rebuilding, or replace a same-version development executable. Two saved results then cannot distinguish that circumstance from a real performance change without outside evidence. This is an attribution gap, not proof that historical measurements were wrong.

**Proposed change:** add compatible provenance for the actually loaded build/contract, Node/platform, fixture and measurement boundaries. Reuse [runtime identity:25–92](<../../../../../packages/engineer-agent-workflow-mcp/src/runtime-info.ts#L25-L92>). Direct imports need a coherent loaded-module identity, not a stamp read after timing. Stdio needs observed process identity across deliberate reconnects. Mark unknown/mismatched evidence explicitly; do not auto-build or refresh to hide it.

### Small discriminating test set

Use [copied-runtime identity cases:62–159](<../../../../../packages/engineer-agent-workflow-mcp/test/runtime-identity.test.mjs#L62-L159>) for same-version A/B builds, retained old runtime versus new source, missing/mixed identity and reconnect. Add output-shape compatibility checks. Keep identity collection out of timing and workload counters: [profile-count consumer:174–199](<../../../../../packages/engineer-agent-workflow-mcp/test/product-retirement-efficiency.test.mjs#L174-L199>) specifically binds responses to calls.

Store only non-sensitive versions/digests, never environments, personal paths or context tokens. Complexity: small-to-medium evidence-format integration. This is a prerequisite for trustworthy comparisons, not itself a runtime speedup.

## Sequence and excluded work

Establish provenance before performance comparisons. Prove each duplicate check's equivalence independently. Only then evaluate [nested subprocess contention](<11-benchmark-first-research.md>). Do not introduce a scheduler, global test fixture, warm real user home or broad CI deletion. No build, qualification, benchmark or proposed regression was executed for this documentation follow-up.
