# Benchmark-First Candidates: Replay History and Nested Test Processes

## Scope and evidence status

Findings: **P08-02 and P12-F3**. These are the two audit hypotheses, not implementation-ready speedups. Their current algorithm/process topology is source-confirmed; material performance harm and the best intervention are unmeasured. No storage migration, concurrency adjustment or new scheduler is recommended before the experiments below.

A separate accepted local graph-scan opportunity, P09-F03, is explained with its task consumers in [task execution and context](<07-task-execution-and-context.md>); its practical priority also needs measurement.

## 1. P08-02: does evidence-only replay become expensive as retained history grows?

### Exact boundary and current work

Affected component: product operation storage/recovery, indirectly used by the four durable product workflows. This is **not** an instruction defect in one particular skill and **not** the ordinary known-plan replay path.

The evidence-only replay reader:

1. Reads the exact completed operation and checks scenario/retained intent.
2. Reads its retained result and locates the recorded head target.
3. Lists retained generation filenames.
4. Constructs/hashes candidate head encodings until one matches the recorded after-digest.
5. Fully validates the selected generation and recomputes request identity.
6. The session inspection also retains current effect, operation and lock checks.

See [operation reader:893–1012](<../../../../../packages/engineer-agent-workflow-mcp/src/product/operations.ts#L893-L1012>) and [current-state rechecks:1015–1037](<../../../../../packages/engineer-agent-workflow-mcp/src/product/operations.ts#L1015-L1037>). The [full finding](<../audit.md#L418-L439>) and [V02 narrowing](<../V02.json>) distinguish this from existing successful replay that already avoids repeating durable effects.

### The concrete suspected cost

The operation ID can be known while selecting its generation still enumerates unrelated history. Directory materialization grows even if a match appears early; candidate-hash work also depends on match position. It is unknown whether this is material compared with mandatory full source validation.

### Bounded experiment to authorize later

Use one synthetic completed operation, vary unrelated retained generation count and match position, and separately observe:
- directory materialization and candidate-hash counts;
- source-validation work that must remain;
- replay latency and memory;
- exact result/context and unchanged effect/lock checks.

Use the existing [session-recovery fixture:120–218](<../../../../../packages/engineer-agent-workflow-mcp/test/product-session-recovery.test.mjs#L120-L218>) and [concurrent ownership checks:275–291](<../../../../../packages/engineer-agent-workflow-mcp/test/product-session-recovery.test.mjs#L275-L291>). Do not mutate real workflow YAML or run against a personal store.

**Decision gate:** only if unrelated-history selection is material should a versioned authenticated generation selector in the existing operation record be designed. A selector is a hint requiring digest/full-generation/request verification, never authority to choose latest or replay effects.

**Compatibility blocker to resolve:** existing operation records use a closed schema. An optional field accepted by new readers is not automatically accepted by old strict readers. The audit's [contract evidence](<../audit.md#L431-L439>) is a pointer for a future explicit contract investigation, not authorization to parse managed YAML or change schemas now. Legacy fallback, atomic operation evidence, corruption rejection and one-owner recovery remain mandatory. Do not introduce a second mutable index or global history cache.

## 2. P12-F3: do heavy test files oversubscribe the machine through their children?

### Exact boundary and current work

The [test runner:7–54](<../../../../../scripts/run-tests.mjs#L7-L54>) bounds simultaneous test-file processes and already supports lower concurrency/serial execution. A single file can additionally launch a package command, an extracted server and independent author/reviewer actors; see [packed acceptance:246–328](<../../../../../packages/engineer-agent-workflow-mcp/test/packed-artifact.test.mjs#L246-L328>) and [actor fixture:764–773](<../../../../../packages/engineer-agent-workflow-mcp/test/support/product-e2e-harness.mjs#L764-L773>).

Thus a file-count limit is not the observed total process-tree or memory limit. This alone does not establish oversubscription or justify reducing concurrency. A lower limit can simply make the run slower. This is maintenance infrastructure, not a change to the distributed performance skill.

### Bounded experiment to authorize later

After separately considering the duplicate baseline in [development verification](<10-development-verification-and-measurements.md>), compare only the relevant fixed acceptance-file set at existing limits 1, 2, 4 and 8. Keep source/executable identity, toolchain, platform and workload fixed; alternate trial order and separate cold/warm conditions.

Observe actual process-tree peak, memory, I/O, wall-time distributions, failures, cancellation and cleanup. Include one heavy file alone to distinguish intrinsic cost from contention. File concurrency, workflow agent slots and provider request concurrency are three different quantities.

Retain [runner controls:12–79](<../../../../../tests/test-runner.test.mjs#L12-L79>), [cleanup ownership:101–124](<../../../../../packages/engineer-agent-workflow-mcp/test/support/product-e2e-harness.mjs#L101-L124>) and deliberate locking/replay concurrency tests. Do not serialize the very concurrent behavior those tests must verify. The [CI cell selection:18–51](<../../../../../.github/workflows/workflow-reliability-qualification.yml#L18-L51>) is not evidence that distinct hosted matrix jobs share one local CPU pool.

**Decision gate:** change only an appropriate existing acceptance-step option if resource/latency measurements justify it. Preserve isolated roots, pinned tooling, actor teardown and a deliberate concurrency lane. Add no generic scheduler, semaphore or global cache now.

## What this note does not claim

Neither experiment has run in this follow-up, and no percentage/time/token improvement is promised. The original [measurement limits](<../audit.md#L771-L809>) still apply. Benchmark results must identify the loaded runtime, not merely the intended source branch; that prerequisite belongs to [benchmark provenance](<10-development-verification-and-measurements.md>).
