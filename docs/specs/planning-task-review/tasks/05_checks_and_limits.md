# PTR-05: Phase-Local Checks, Resources And Elapsed Limits

Status: Planned; technical agreement recorded. Execution requires a separate explicit invocation.

## Technical proposal

Proposal ID: `PTR-05-execution-v1`. Packet ID: `PTR-05`. Depends on PTR-01,
PTR-02 and PTR-04. Requirements: IPR-010 through IPR-020, IPR-022 and IPR-023.
Apply `tasks/plan.md`, `Shared state commitments`.

Introduce `packet-review-execution.ts` for execution evidence, conditional owned-
resource lifecycle and invocation-budget validation. Expose
`task_packet_review_execution_record` and
`task_packet_review_resource_record` through the shared tool collection.
These validate/persist observations; they never run a command, create/delete a
database/workspace, allocate an execution slot or grant permission. The native
investigator owns its check and uses existing project runners and actual host
controls. A check may address a question/criterion before any finding exists and
may run during fact collection, main review or verification.

Reuse valid prior exact execution evidence after the consumer's own semantic
assessment; a phase change alone does not require replay. For harmless checks,
reuse an authorized environment or adequate fixture. For mutating/interfering
checks, reproduce the selected target in an adequate existing fixture or an owned
temporary workspace/database. Record creation ownership and recovery references
when resources are created; harmless checks require no dummy resource/cleanup
record. Remove only owned resources. One mutation at a time per investigator's
baseline requires assertion observation and restoration before the next mutation.
Independent safe investigators may execute concurrently under host limits.

Record actual command/source/phase/purpose, result/assertion, evidence reuse,
mutation/restoration and conditional cleanup. Distinguish assertion failure,
missing runner, timeout, cancelled/unknown effects and unfinished cleanup. Reused
pre-existing resources keep their owner; unavailable isolation makes the proof
unavailable. Do not copy private environment files, weaken assertions, run a full
suite or change the original checkout as an implicit review effect. Owned-resource
interruption state stays retrievable for bounded recovery.

Default policy: a 30-minute overall invocation ceiling, a 2-minute targeted-check
ceiling and a 30-second cleanup allowance. Each actor is bounded by the remaining
enforced invocation deadline; use a narrower actual actor deadline when the
host/project supplies one. Smaller applicable host/project limits win. The
30-minute ceiling bounds an interactive multi-stage invocation, the 2-minute
default prevents an accidental unbounded targeted command, and cleanup has its
own finite grace. These are conservative policy ceilings, not measured latency
estimates or promises that every selection finishes within them. Resolve and
record effective limits and the actual enforcing control before dispatch.

An actual supported enclosing caller/runner deadline is mandatory. A timeout of
waiting/polling, token cap, turn count or guest-script timer alone is insufficient.
Use existing supported cancellation/termination, preserve acknowledged evidence
and distinguish requested cancellation from confirmed stop/disposal. If the
required path is unavailable, return the prerequisite before dependent dispatch.
Do not build a collection scheduler, daemon, new lifecycle CLI or implicit global
configuration change. MCP also refuses dependent transitions/approval after the
recorded invocation expires; that guard does not substitute for host enforcement.

Retries share the remaining invocation budget. Explicit fresh resume creates a
new bounded invocation linked to prior timing/evidence, not a hidden timer reset.
Expiry stops new dispatch and allows only bounded cancellation/restoration/cleanup;
unknown activity or cleanup remains incomplete with known/unknown owner. Native
qualification must prove actual expiry/cancellation and fresh-session checkpoint
resume, not just a fake timer.

Evidence: `src/state.ts:380-410` already exposes bounded signal-aware review
submission; `src/api.ts:9-24` propagates AbortSignal. Harness's pinned PTC contract
explicitly has no overall engine timer and requires the caller's abort/deadline;
its foreground tool bridges that abort to cancellation/disposal. Codex's exposed
subagent wait/interrupt controls do not establish a universal elapsed deadline.
The final plan will retain the exact official-source references and distinguish
verified documentation from unexecuted native qualification.

## Outcome, prerequisites and pinned inputs

Implement only PTR-05 after its separate explicit invocation. PTR-01, PTR-02 and PTR-04 complete. Native actual enforcement remains a separately qualified PTR-07/PTR-08 boundary.

- Behavioral source: `3da917243e9367c9eec28ebe6662c2787afdde9cc59cd174b45128825e4a62de`.
- Specification version: `7fbb89419df3a1b920b425b161e6cd628f5035fb26ff37437450d521c4d32413`.
- Completeness review: `845484cd-a527-4841-acd1-7e92dc7f4d9b` (Approved, reviewed, consistent).
- Linked requirements: `IPR-010`, `IPR-011`, `IPR-012`, `IPR-013`, `IPR-014`, `IPR-015`, `IPR-016`, `IPR-017`, `IPR-018`, `IPR-019`, `IPR-020`, `IPR-022`, `IPR-023`.
- Technical agreement/digest: use the exact values in `Technical agreement` below;
  `planning_packet_check` must be current at entry and completion.
- Read only linked exact requirement definitions via MCP and the bounded contract
  sections/selectors below; follow every required continuation. Do not reload the
  journal, inactive profiles or unrelated packets. Re-verify cited source evidence.

MCP contract: Phase-local execution and resources; retry/error rules. Data selectors: execution/resource/invocation/limits plus assignment/source refs. Defaults: 30 min invocation, 2 min check, 30 sec cleanup; actor bound is remaining enforced invocation time.

Before bulk implementation reads, verify a usable Git worktree and the actual
runner authority/capabilities. A clean tree or existing commit is not required.
Inspect tracked/staged/untracked state and preserve unrelated content/meaningful
attributes. Unknown loss or overlap requires disposition, not a new baseline or
reset. Do not initialize the real project or inspect/copy auth/private files.

## Allowed writes and boundaries

- New MCP `src/packet-review-execution.ts` and corresponding tool aggregation/policy integration.
- New package `test/packet-review-execution.test.mjs` with owned temporary source/database fixtures and clock/control seams only where needed.
- No production command runner, scheduler, resource allocator, global configuration or source mutation by MCP.
- Update only this packet's item in `tasks/todo.md` and current `tasks/handoff.md`
  after all its required checks pass. Required scenario-managed journal writes
  remain MCP-owned; exclude workflow YAML from shell content searches/Git diffs.
- No approved requirement/technical-source edits, other packet execution, consuming-
  project skill mutation, global lifecycle changes or implied external authority.

## Acceptance and discriminating verification

The listed test files are **new to create** unless explicitly marked existing.
Work from repository root. Create each check before the owning production change,
run it, and retain the relevant RED; a missing import/harness alone is not semantic
proof. Implement minimal correct behavior, correct implementation while a correct
check fails, and apply the PROVE rule below. Fixtures must be non-sensitive and
owned; never mutate the original review target to prove a test.

| Criterion | Observable acceptance                                                                                                                                   | Owning check and evidence                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| PTR-05-A1 | A question/criterion can justify a necessary check in every investigation phase, before a finding/main result; a reading-only direction needs no check. | Record early/main/verifier observations and legitimate no-execution outcomes; no fabricated finding prerequisite.             |
| PTR-05-A2 | Valid exact prior proof can be reused after fresh semantic assessment; changed inputs/question/observation cannot reuse it.                             | Reuse identity/prerequisite cases with actual changed content and missing reference; no phase-only rerun requirement.         |
| PTR-05-A3 | Harmless/reused fixtures have no dummy allocation/cleanup; created resources retain ownership and cleanup/recovery on all terminal paths.               | Record-policy tests and actual owned SQLite/workspace fixture preservation; reused-resource cleanup is rejected.              |
| PTR-05-A4 | One mutation at a time requires the intended assertion and baseline restoration; wrong assertions or failed cleanup remain unfinished.                  | Discriminating mutation/restoration fixtures, baseline hashes and resource ownership read-back.                               |
| PTR-05-A5 | Elapsed policy/enforcement is resolved before dispatch; expiry blocks new work/approval and retry never resets the budget.                              | Unit contract/clock/control tests; actual native hung-agent/check/run cancellation is required later, not claimed from mocks. |
| PTR-05-A6 | Cancellation requested, confirmed stop, unknown effects and cleanup failure stay distinct, without queue/slot grants.                                   | Transition/read-back tests, observable zero command/resource side effects of MCP, unsafe-command/data injection fixtures.     |

**PROVE:** Separately permit post-expiry assignment/finalization, treat requested cancellation as confirmed cleanup, and accept a mutation whose intended assertion never runs. Restore each defect after its targeted assertion fails.

Copy-ready local commands (the new test file must be created first):

```sh
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/packet-review-execution.test.mjs
```

## Completion, rollout and recovery

After focused checks and required PROVE restoration, run proportionate final
validation. Record actual PASS/FAIL/NOT TESTED, commands, input identities and
limitations; planned commands or another host's result are not passes. Required
failed/unavailable checks keep this packet incomplete. Recheck the pinned
`specification_check_state` and exact `planning_packet_check`, compare the scoped
diff with the agreed technical commitments, then update only this checklist item
and replace current handoff. Stop after this packet; optional code/security review
and a commit are separate invocations, not completion or next-packet gates.

Do not delete reused resources or reset original source. Preserve safe recovery refs; unknown owned effects stay incomplete. Unavailable real enforcement blocks dispatch rather than installing/configuring a control.

## Technical agreement

Accepted through the native question tool.

- Proposal: `PTR-05-execution-v1`.
- Agreement: `d2cce5b1-67ea-4774-aff8-468bf0aab0db`, revision `2`.
- Proposal digest: `70e0a7eb04725fd504ab99cb017d8b40089a0a931a02072e41e563666b16bce5`.
- Sources: this packet's `Technical proposal` and the plan's `Shared state commitments`.

Remaining execution details belong outside these hashed sources.
