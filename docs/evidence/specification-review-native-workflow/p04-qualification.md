# P04: Completed Harness Qualification

Status: SUPERSEDED as acceptance evidence. The original isolated rc.2 result
omitted a successful managed-manifest filesystem read and used a keyword-based
omission oracle. Its measurements and structured result remain historical
records under their original gates; they do not pass the corrected access and
semantic controls. See the current task checklist for P04 requalification and
P05 state. The earlier preflight, native-engine and model records also remain
historical evidence. The current replacement is
[P04 requalification](p04-requalification.md), with its own corrected gates,
complete model results and retained failure records.

The user authorized finishing the task, fixing the defects and repeating the
blocked control. The verified actual route remained
`openai-codex / gpt-6.1-sol / xhigh`. No new provider, model matrix, installation,
global configuration, shared MCP refresh, commit or publication was introduced.

## Repair And Durable Runner

The opt-in [runner](../../../scripts/qualify-specification-review.mjs) now supports
`mode: "native-models"`, with separate `run` and `allowModelRequests` gates,
explicit prepared paths, exact host/model/provider identities, provider SHA-256,
bounded case selection and an invocation-specific private workspace. Importing
the runner or worker performs no trial. The ordinary preflight remains separate.
Reports cannot overwrite existing files and cannot contain arbitrary worker
diagnostics, opaque contexts or private paths. Owned subprocess groups are
reaped on success, failure, timeout and cancellation.

The native worker composes the actual Harness agent loop, PTC workflow engine,
Codex provider and independent MCP readers. The parent uses PTC and the ready
generated workflow unchanged; child scopes use supported
`tools.presentAs("native")`. This preserves full MCP input schemas, including
`minLength`, required fields and array bounds, which the Host PTC TypeScript SDK
had projected to `unknown`. No MCP constraint was weakened. Exact programmatic
pagination is disabled for these native children; ordinary exact reads are the
observed fallback. This is an isolated supported composition, not a change to
the user's globally installed profile or a claim that its PTC projector is fixed.

The first native paraphrase retry correctly found an unrelated incomplete
CLI-002 placeholder in the negative fixture. The corrected control contains
only the fully specified CLI-001 pure function. Its complete real-model review
returned `reviewed` / `consistent`; a regression test rejects reintroducing the
vague placeholder. The omission control additionally requires saved evidence
about CLI-001's empty-input clause; an unrelated gap cannot pass that control.

## Runtime Compatibility Reconciliation

The agreed baseline remains Harness `0.2.1-rc.3` at upstream commit
`22ddee3792402c3e70ec5f86a63c3e3e895a2f60`. The user's prepared installed copy
actually contains `0.2.1-rc.2` and Codex Connect `0.2.0-alpha.10`.
The packet permits an alternative version with explicit compatibility
reconciliation. rc.2 is accepted here only for this tested workflow boundary:

| Required contract | Observed evidence |
| --- | --- |
| `agent` prompt, provider/model and structured schema | Pinned rc.3 source and rc.2 declarations expose the same consumed fields; actual rc.2 model children honored the selected route and structured result. |
| Foreground workflow, bounded independent children, JSON results | Actual rc.2 native engine ran the unchanged body; peak three model judges in the large workload and four in the controlled engine suite. |
| Cancellation, result settlement and child disposal | Native controlled suite: 31 runs and 83 paired child starts/disposals; new real-model interruption and fresh invocation also passed. |
| Tool schemas and scoped presentation | Actual rc.2 no-model test inspects the model-facing native schema, bounded submission fields and rollback before publication. Both rc.2 and pinned rc.3 validators accept the repaired workflow schemas. |
| Real persistence, recovery and source freshness | Independent MCP subprocesses, fresh build-verified observers, direct saved submissions and the retained 14-scenario native-engine suite. |

The pinned source contracts are in upstream
[types.ts](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/packages/workflow/workflow-ptc/src/types.ts)
and [host.ts](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/packages/workflow/workflow-ptc/src/host.ts).
Their retained pinned source was inspected locally. The
[native-engine report](harness-native-engine-result.json) records the actual
module fingerprints and execution boundary. No rc.3 model runtime, whole web
profile, external MCP integration or Claude runtime was launched or qualified.

## Real Model Results

The [structured aggregate](p04-qualification-result.json) retains all measured
values, per-actor turns/steps, provider token/cache observations, actual build
identity, call counts and cleanup results.

| Workload | Outcome | Review time |
| --- | --- | --- |
| Sequential control of the new workflow | `gaps`, missing empty-input clause found | 831.16 s / 13:51 |
| Earlier native workflow with PTC children | `gaps`, same clause found | 461.46 s / 7:41 |
| Current durable native workflow with native children | `gaps`, same clause found; 56/56 saved | 457.25 s / 7:37 |
| Corrected equivalent paraphrase | `reviewed`, consistent; 6/6 saved | 271.09 s / 4:31 |
| Current conflict with interruption and recovery | `gaps`, final `conflict`; 8/8 saved | 287.12 s / 4:47 |

All roles used the verified Codex route. Current runtime setup added 1.75 s for
omission and 0.88 s for conflict, separately from review times. The two-case
durable invocation took 747.05 s including setup/cleanup. Synthetic fixture
authoring used no model; setup includes its local persistence operations.

The large workload has 55 detailed items plus one final consistency item.
Its three concurrent judges saved batches reaching 20, 40 and 55 detailed
results. Final judging began afterwards. One rejected detailed read carried an
invalid context; the model reopened the specification and recovered. There
were no unexpected runtime errors or unsaved results. Recoverable model tool
errors are counted rather than hidden.

The interruption control cancelled the actual native workflow after all seven
detailed results were durably saved, before the last acknowledgment reached
the judge. A separate reader checked the same verified MCP build and observed
zero remaining detailed items. A new invocation launched only the final judge:
two native starts/ends, one cancellation, one resumed invocation and **zero
detailed submissions after cancellation**. It did not replay a saved verdict.
This qualifies cancellation during acknowledgment, not every active HTTP
inference-cancellation path or Harness journal replay.

The current parent made zero model steps while either native workflow was
pending. The normal omission run used two parent model responses; the
interrupted/resumed control used three across two parent turns. There was no
inspection or writer actor, background launch or polling loop. Final direct
MCP verification and owned-runtime disposal completed.

## Timing And Token Interpretation

This comparison did not execute the historical implementation. It ran the new
workflow body with sequential child scheduling as a control. The completed [archived implementation comparison](historical-comparison.md)
measured 725.661 s before versus 456.735 s after, a 37.06% reduction at common
parent-turn boundaries. Use that result for the requested before/after claim.

The current omission run was **1.818 times faster**, or **44.99% shorter**, than
the sequential control of the new workflow, on identical specification/source SHA-256
values. The earlier PTC workflow was already 1.801 times faster; the further
0.91% time difference is too small to interpret as an improvement from the repair.
There is only one measurement per variant. Child presentation changed, provider
latency/cache behavior varied, and local regression checks ran concurrently.
The control pair did not retain per-process MCP build IDs, although MCP
source was unchanged. This is measured evidence, not a statistical guarantee or
an attribution of every difference to orchestration.

| Provider metric, omission workload | Sequential baseline | Current native |
| --- | ---: | ---: |
| Requests | 58 | 67 |
| Input tokens including cached input | 1,727,202 | 1,643,682 |
| Cached input, a subset of input | 1,504,000 | 1,443,456 |
| Uncached input | 223,202 | 200,226 |
| Output tokens | 44,348 | 62,386 |

Current input was 4.84% lower and output 40.67% higher. The earlier PTC native
sample increased input tokens. No general token or monetary saving is claimed.
Cached input and reasoning output are subsets and are not added twice. Host
per-actor usage has no cache split; provider observations supply whole-case cache
totals. Missing cache-write and lane-idle measurements remain unknown.

For current omission, actual MCP handlers took an aggregate 5,692.19 ms;
client-side tool calls took 7,110.02 ms, including transport and measurement
overhead. These concurrent sums are not wall-clock critical-path components.
Server lock waiting totaled 0.554 ms over three saves. Submission round trips
totaled 456.04 ms. There were 96 review-read calls, 631,621 serialized response
bytes over all 119 measured tool calls, and 15 repeated identical text chunks
(18,331 UTF-8 bytes). This last metric counts exact repeated chunks only, not
all semantic overlap. `tools/list`, provider inference and synthetic-author
setup are outside these measured MCP tool-call totals. Actual tools/call handler
timing excludes transport/inference; lane idle is unavailable.

## Checks And Reproduction

- 36 focused tests passed without skips, including the actual prepared Harness
  schema/presentation/rollback check with zero model requests.
- 67 orchestration, packaging, real-protocol and MCP preparation tests passed
  without skips in the final complete run.
- Eleven deliberate defects were detected in a disposable copy; the clean
  baseline passed and every mutation was restored. The initial presentation
  test missed its mutation; checking actual model-facing schemas repaired it.
- The first regression run had one Unicode scenario return `incomplete`.
  Three targeted runs and the full repeat passed without changing production
  code or assertions. Its transient cause was not established; the initial
  failure remains recorded in the aggregate.
- Exact specification/technical bindings, preservation, disclosure/link checks
  and `git diff --check` are recorded in the final handoff.

The executed durable entry was:

```bash
rtk proxy node scripts/qualify-specification-review.mjs --run --config "$EAW_NATIVE_CONFIG" --output "$EAW_NATIVE_REPORT"
```

The private JSON configuration supplied existing `privateRoot`, `clientRoot`,
`clientHome`, `workspace`, `workflowScript`, workflow SHA-256, `providerRoot`,
provider SHA-256, the exact rc.2 version, route/effort, explicit model authority,
cases `native-omission` and `native-conflict`, and
`cancellationCase: "native-conflict"`. No credential value belongs in that file.
The runner creates a unique workspace for each invocation. Its CLI returns zero
only when every selected case passes; `packet_complete: false` deliberately
prevents a selected subset from independently certifying the whole packet.

The four agreed semantic outcomes are established by the retained sequential
baseline, current omission, corrected negative and conflict evidence together.
The blocked and flawed-fixture attempts remain historical attempts, not passes.
Raw traces stay private; temporary credential-source and copied-peer links are
removed after completion. The production workflow SHA-256 remains
`da2dd786eb06c8d4716d847893e35302f51630ebf90314458fed1c513e334ae4`.
