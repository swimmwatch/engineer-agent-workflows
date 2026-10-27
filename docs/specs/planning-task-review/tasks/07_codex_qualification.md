# PTR-07: Real Codex Qualification

Status: Planned; technical agreement recorded. Execution requires a separate explicit invocation.

## Technical proposal

Proposal ID: `PTR-07-codex-v1`. Packet ID: `PTR-07`. Depends on PTR-01 through
PTR-06. Requirements: IPR-001 through IPR-025. Apply `tasks/plan.md`,
`Shared state commitments` and `Native qualification matrix`.

Create a focused test-only qualification driver and non-sensitive Git/database
fixtures for N01-N08. Reuse `createSharedStdioHarness` for real MCP transport and
the existing `JsonlClient` in `docs/research/workflow-probe-plans/p03/rpc.mjs`
for a private real Codex App Server process. Reuse its transport and owned-group
cleanup, not P03's source IDs, model policy, four-request budget or acceptance
claims. Keep qualification code under the repository's test/support ownership;
it is not a distributed workflow runtime, scheduler, installer or lifecycle CLI.

Use an already available native runtime and permitted actual model route. Pin its
binary/version/schema and generated skill/MCP identities for the trial. Invoke
the generated Codex skill explicitly through the native skill input and a
text invocation, in a temporary fixture and isolated session/home configuration.
Use actual native independent subagents and scenario MCP, not simulated final
responses. No real auth/private files are inspected/copied and no global config,
installed skill, account or provider setup is changed. Missing usable native auth
or required capabilities leaves qualification pending.

The test caller enforces the actual invocation deadline, sends `turn/interrupt`
on expiry and observes terminal events, then uses bounded owned-process cleanup.
Do not mistake the JSONL request timeout for agent termination. An unconfirmed
stop or unfinished cleanup cannot pass. Verify the native published protocol;
the current inspected CLI is 0.163.0, not a newly imposed universal minimum.
The qualified native path is this bounded caller plus ordinary native agents;
do not claim every Codex client has an equivalent elapsed-deadline control.

Fixture oracles inspect exact source/state/actor traces, criterion coverage,
normalized findings, native timing and cleanup, not merely prose or zero findings.
Use negative controls and required PROVE mutations of the owning behavior in
isolation. Preserve seeds/expected outcomes outside reviewer prompts. Label
fixture consent and deliberately seeded stage/fault records as simulation.
Store bounded redacted evidence under `docs/evidence/task-packet-review/codex/`
with actual commands, models, input/output identities and limitations. Structural
and native results stay separate. Performance observation may report actual
producer MCP operation counts/elapsed time; it creates no unmeasured latency SLA.

Qualification is required acceptance of the implemented feature, not an
automatic review/next-packet gate for consuming projects. Do not install tools,
switch models, use production databases or publish evidence externally.

Evidence: `docs/research/workflow-probe-plans/p03/rpc.mjs:5-100` already supplies
private stdio RPC and owned process cleanup; `probe.mjs:398-448` demonstrates
isolated fixture/protocol identity recording but has different acceptance.
`codex app-server --help` and `codex exec --help` were inspected without model
execution. The final plan retains official App Server and subagent citations.

## Outcome, prerequisites and pinned inputs

Implement only PTR-07 after its separate explicit invocation. PTR-01 through PTR-06 complete. Available permitted native Codex binary/protocol, model/auth route, bounded caller and built MCP are mandatory before inference.

- Behavioral source: `3da917243e9367c9eec28ebe6662c2787afdde9cc59cd174b45128825e4a62de`.
- Specification version: `7fbb89419df3a1b920b425b161e6cd628f5035fb26ff37437450d521c4d32413`.
- Completeness review: `845484cd-a527-4841-acd1-7e92dc7f4d9b` (Approved, reviewed, consistent).
- Linked requirements: `IPR-001`, `IPR-002`, `IPR-003`, `IPR-004`, `IPR-005`, `IPR-006`, `IPR-007`, `IPR-008`, `IPR-009`, `IPR-010`, `IPR-011`, `IPR-012`, `IPR-013`, `IPR-014`, `IPR-015`, `IPR-016`, `IPR-017`, `IPR-018`, `IPR-019`, `IPR-020`, `IPR-021`, `IPR-022`, `IPR-023`, `IPR-024`, `IPR-025`.
- Technical agreement/digest: use the exact values in `Technical agreement` below;
  `planning_packet_check` must be current at entry and completion.
- Read only linked exact requirement definitions via MCP and the bounded contract
  sections/selectors below; follow every required continuation. Do not reload the
  journal, inactive profiles or unrelated packets. Re-verify cited source evidence.

Plan's exact Native qualification matrix N01–N08; MCP/data contract; generated Codex artifact and newly built isolated MCP; actual native schemas/model route. Reuse existing JsonlClient methods rather than its request timeout as an execution deadline.

Before bulk implementation reads, verify a usable Git worktree and the actual
runner authority/capabilities. A clean tree or existing commit is not required.
Inspect tracked/staged/untracked state and preserve unrelated content/meaningful
attributes. Unknown loss or overlap requires disposition, not a new baseline or
reset. Do not initialize the real project or inspect/copy auth/private files.

## Allowed writes and boundaries

- Test-only qualification fixtures/driver/oracles under `tests/` and MCP test-support; reuse existing JsonlClient without changing its unrelated P03 policy.
- Actual bounded Codex App Server fixture sessions and source-bound evidence under `docs/evidence/task-packet-review/codex/`.
- Temporary Git/SQLite/home/session configuration only; no global config, installed-copy changes, account setup or credential copying.
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

| Criterion | Observable acceptance                                                                                                                       | Owning check and evidence                                                                                                                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PTR-07-A1 | Every N01–N08 obligation has actual native observation and a discriminating oracle, with genuine fresh subagents and current inputs.        | Create `tests/task-packet-review-qualification.test.mjs` and host-neutral fixture helpers first; then execute the Codex native driver on all cases.                                                                 |
| PTR-07-A2 | Hung check/child/run cases stop dispatch and exercise real interruption/owned process cleanup within configured limits and allowance.       | Observe turn/interrupt plus terminal native events and owned-group reap; unexpected unaccounted activity/disposal fails qualification; injected unknown cleanup must yield its expected incomplete workflow result. |
| PTR-07-A3 | Fresh native session/MCP restart resumes retained same-source units; retention, normalization and omission regressions are caught.          | Exact journal/source/phase/operation read-back and retained first-packet attempt after handoff replacement.                                                                                                         |
| PTR-07-A4 | Reports pin actual binary/schema/artifact/MCP/model/source identities and distinguish native, structural, unavailable and untested results. | Redacted bounded evidence and negative controls; a successful P03 probe or deterministic fixture cannot substitute.                                                                                                 |
| PTR-07-A5 | Producer operation counts/elapsed can be measured on the actual qualified fixture without an unsupported universal overhead claim.          | Retain measured scope, all RPCs/retries and input identities; report performance observations as observations.                                                                                                      |

**PROVE:** Mutate the oracle or owning implementation one behavior at a time so a dropped stage/required proposition, wrong source, lost history or fake cancellation would otherwise pass; the appropriate assertion must fail. Keep mutations in owned fixtures and restore.

Copy-ready local commands (the new test file must be created first):

```sh
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node --test tests/task-packet-review-qualification.test.mjs
```

Native action sequence after local driver checks: discover/pin actual Codex
protocol and permitted model; stage owned fixture/home/session configuration and
built MCP; explicitly invoke the generated skill using native text+skill input;
execute N01–N08 through the bounded caller; follow real phase/results and MCP
read-back; exercise interruption and a new process/session; verify cleanup and
save redacted case evidence. Use the existing JsonlClient transport, not its
request timeout as a stop guarantee. Required native results are not satisfied by
running the deterministic Node tests alone.

## Completion, rollout and recovery

After focused checks and required PROVE restoration, run proportionate final
validation. Record actual PASS/FAIL/NOT TESTED, commands, input identities and
limitations; planned commands or another host's result are not passes. Required
failed/unavailable checks keep this packet incomplete. Recheck the pinned
`specification_check_state` and exact `planning_packet_check`, compare the scoped
diff with the agreed technical commitments, then update only this checklist item
and replace current handoff. Stop after this packet; optional code/security review
and a commit are separate invocations, not completion or next-packet gates.

Required unavailable native/auth/control leaves this packet incomplete. Do not provision it automatically or count another host's pass. Preserve redacted acknowledged evidence and actual cleanup limitations.

## Technical agreement

Accepted through the native question tool.

- Proposal: `PTR-07-codex-v1`.
- Agreement: `02b2d298-99ee-4c6a-bc5e-670016e192f5`, revision `2`.
- Proposal digest: `334fba9bc48ba081125eaf1aa5f097323bc5e3014a24a63999dc31693dab4125`.
- Sources: this packet's `Technical proposal`, the plan's `Shared state commitments` and `Native qualification matrix`.

Remaining execution details belong outside these hashed sources.
