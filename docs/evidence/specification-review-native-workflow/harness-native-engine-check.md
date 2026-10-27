# Harness Native Engine Check

Status: PASS for controlled native-engine execution; P04 remains incomplete.

The user explicitly requested a Harness execution check after the schema repair.
The retained private Harness copy supplied `dsh-workflow-ptc` and
`dsh-ptc-runtime-node` at `0.2.1-rc.2`. This is the installed-copy version,
not the specification's pinned `0.2.1-rc.3` qualification baseline.

## Executed boundary

The generated Harness workflow ran through the actual `PtcWorkflowEngine`,
host bindings and Node PTC child process. It was not executed through the
protocol suite's original `AsyncFunction` hook. The workflow bytes were
unchanged; SHA-256 is
`da2dd786eb06c8d4716d847893e35302f51630ebf90314458fed1c513e334ae4`.

A private adapter reused the upstream built-runtime setup: Cordis session,
agent, filesystem, working-directory, subprocess, sandbox, PTC and subagent
services. Its controlled provider delegated to the existing protocol actors.
Each actor used its own real MCP process and real persistence; semantic verdicts
were explicitly simulated. No Codex or other model was called, and no provider
authorization was read or used. The web profile and its imported external MCP
servers were not booted.

The existing 14 protocol scenarios retained every assertion. Only the test
module's import locations and the protocol runner's execution hook changed in
private copies. Generated workflow bodies and repository code remained intact.
The suite also checks portable Claude body semantics on the Harness engine;
this does not qualify the Claude runtime.

## Results

The [structured result](harness-native-engine-result.json) records fingerprints,
scenario names and native lifecycle observations.

- Full final run: 14 PASS, zero failures, zero skips; exit 0, 112.31 seconds.
- Native executions: 31 runs, 30 completed and one deliberately cancelled;
  zero unexpected engine errors.
- Child ownership: 83 starts, 83 disposals, no active child handles after cleanup.
  Every native run emitted paired start/end events; peak concurrency was four.
- Covered completion, preparation/capability gates, more than 160 items with
  held saved acknowledgments, independent lane progress, final JOIN and no
  parent polling, source drift, unknown saved effects, interrupted final stages,
  independent targets, exact Unicode pagination, correction/followup,
  inherited cross-impact expansion, consistency invalidation, native cancellation,
  a second correction cycle and rejection of a fabricated completion claim.

The first full attempt passed 13 scenarios and failed the cancellation bridge:
the old simulated assertion expected `AbortError`, while the native child-failure
boundary produced an infrastructure error that the adapter wrapped in an
assertion. The private adapter was corrected to call actual `run.cancel()` on the
controlled fatal interruption, await child disposal and preserve the interruption
after native settlement. The targeted cancellation retry and the subsequent full
14-scenario run passed. Neither the workflow nor the assertions were weakened.
Node emitted its expected experimental TypeScript-stripping warning.

## Reproduction and limits

The executed command used an owned private home and the prepared runtime:

```bash
rtk proxy env HOME="$EAW_NATIVE_HOME" DSH_HOME="$EAW_NATIVE_HOME" EAW_NATIVE_OBSERVATIONS="$EAW_NATIVE_OBSERVATIONS" node --test "$EAW_NATIVE_TEST"
```

The private test is a copy of `tests/specification-review-protocol.test.mjs`;
its execution hook calls the installed native engine instead of the original
in-process interpreter. The adapter follows the pinned upstream
[built-runtime test](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/packages/workflow/workflow-ptc/tests/built-runtime.e2e.ts).
Raw logs remain private; executable probes and their owned resources are removed
after verification. This evidence is not a durable replacement for the planned
opt-in P04 runner.

These checks establish controlled execution of the native engine and real MCP
protocol, including the observed cancellation and cleanup paths. They do not
establish semantic model quality, a model-driven foreground tool call, the full
installed profile, model/token savings, every native limit, or rc.3 runtime
compatibility. Unknown model/token metrics remain null. The synchronous model
selection question returned no answer, so no route was inferred.

P04 stays open. The implementation agent owns host reconciliation and completion
of the durable native/model runner; actual provider/model choice remains with
the user before the four agreed billable model reviews. No installation, global
configuration change, generation, commit or publication was performed.
