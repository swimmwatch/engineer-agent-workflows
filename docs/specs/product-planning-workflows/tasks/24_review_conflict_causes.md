# P24: Compatible review conflict-cause diagnostics

Status: Complete; G02 and prerequisite P20/P21 are complete.
Dependencies: completed P20/P21.
Requirements: PWF-045; preserve PWF-018, PWF-021, PWF-035, PWF-038, PWF-040.
No implementation is authorized here.

## Inputs and boundaries

Use G02 pins from
[plan.md](plan.md#cdp-review-efficiency-amendment-2026-09-20), requiring current
Approved/pass/reviewed state. Fetch exact linked requirements through MCP.
Read [the review-efficiency contract](../contracts/mcp.md#specification-review-efficiency)
and Q53–Q54 in quality/scenarios.yaml.

Reverify MCP src/state.ts:123 (dependency read guards), :183 (read recheck),
:247 (mutation enrichment), :290 (consistent-read boundary) and :342 (write
version validation); diagnostics.ts owns the bounded public projection.
reviews.ts:204 status owns semantic review/current version comparison.
A changed journal-byte hash is not necessarily changed review source meaning.

Allowed ownership: these shared guard/diagnostic boundaries, directly affected
scenario adapters, strict metadata and generated contract copies, canonical
recovery references, focused tests. Do not change storage identity, concurrency
policy, unrelated product diagnostics, client settings or the CDP project.

## Architectural contract

Preserve top-level CONFLICT and STALE_REVIEW codes at their existing boundaries.
Add a fixed conflict_cause and fixed next_action from the contract; never infer
semantic drift from a guard's byte mismatch alone. Use the known guard cause;
only add semantic review_source_changed when coherent current/retained comparison
positively establishes it. If safe enrichment cannot establish cause, report
unknown rather than weaken or suppress the original rejection.

Readonly and mutation errors share the safe projection but retain distinct
operation-effect semantics. No result after an inconsistent read, no mutation
after failed preconditions, no automatic reopen-and-replay and no unbounded
refresh loop. Preserve original successful-write replay and its returned result.
Do not expose contexts, paths, source contents or caller payloads in new fields.

## Acceptance and test-first execution

Create test/review-conflict-causes.test.mjs in the MCP package. Reuse independent
stdio clients and existing diagnostics/concurrency fixtures.

1. RED: orchestrate a verdict-only journal update during a guarded read and assert
   the missing specific diagnostic, while observing failure and unchanged semantic
   source version. Use a deterministic test barrier, not arbitrary sleeps.
2. GREEN: classify known causes at their owner and project bounded recovery.
3. PROVE: relabel byte drift as semantic drift or bypass a guard temporarily;
   the corresponding Q53/Q54 assertion must fail. Restore and rerun.
4. VERIFY: stale writer, true requirement/source edit, racing read, inaccessible
   comparison and exact lost-response replay. Assert saved verdicts survive,
   observers never write, false coherent successes never occur, and fixed causes
   cannot leak malicious inputs or exceed P20 budgets.

From repository root:

```sh
rtk proxy npm run build
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/review-conflict-causes.test.mjs packages/engineer-agent-workflow-mcp/test/review-concurrency.test.mjs packages/engineer-agent-workflow-mcp/test/workflow-diagnostics.test.mjs packages/engineer-agent-workflow-mcp/test/review-batch.test.mjs packages/engineer-agent-workflow-mcp/test/transport.test.mjs
rtk proxy npm run generate
rtk proxy npm run generate:check
rtk proxy npm run validate:foundation
rtk proxy npm run lint
rtk proxy npm test
rtk proxy git diff --check
```

The first named test is to create. All final checks must exit 0; native qualification
remains P17. Preserve existing recovery/legacy behavior in both generated hosts.
Recheck G02 pins, inspect scoped tracked/staged/untracked changes, update only
this packet's evidence, todo/handoff, and stop. No next-packet execution,
installation, commit or publication. Failed required checks keep P24 incomplete.
