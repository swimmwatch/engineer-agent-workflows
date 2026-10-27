# PTR-08: Real DeepSeek Harness Qualification

Status: Planned; technical agreement recorded. Execution requires a separate explicit invocation.

## Technical proposal

Proposal ID: `PTR-08-harness-v1`. Packet ID: `PTR-08`. Depends on PTR-01 through
PTR-06 and PTR-07's shared fixture/oracle artifacts. Codex's native pass is not a
dependency; reuse applicable host-neutral checks, but do not inherit its native
verdict. Requirements: IPR-001
through IPR-025. Apply `tasks/plan.md`, `Shared state commitments` and
`Native qualification matrix`.

Use the actual already available Harness runtime/session with matching workflow,
subagent, MCP and filesystem-provider capabilities. Retain the reviewed baseline
0.2.1-rc.3 at commit 22ddee3792402c3e70ec5f86a63c3e3e895a2f60; different versions
need actual compatible schemas and reported identities, not an invented minimum.
Run the existing `verify-deepseek-export.mjs` against a real compatible provider
module as structural evidence, then invoke the generated skill through the real
native surface. Parser success alone is not native qualification.

Execute the same N01-N08 obligations using the actual foreground workflow tool,
the exact exported body plus separate meta JSON, permitted advertised provider/
model routes and real child contexts. Follow the callable schema for input and
structured results. Use only an existing supported enclosing tool/caller deadline
that really aborts/cancels the run; do not add a fictional workflow timeout field,
background polling contract, saved workflow registry or guest-only timer.
Record the actual enforcing policy/control and smaller effective limits before
dispatch. Missing native capability or authorized route remains a prerequisite.

Use isolated fixture/session configuration and the same temporary Git/SQLite
scenarios. Do not install a runtime/provider, modify global Harness configuration,
copy private credentials or use a consuming project's skills as a test surface.
For N08, actually end the first native session/process and start another against
the saved source-bound MCP state. A new foreground script continues unfinished
units; do not claim the native engine restored its own process memory.

Observe real child/run stop and disposal separately, including unknown/failed
cleanup. Fixture oracles require all independent stages, complete unit/criterion
coverage and the correct normalized judgment. A null child, missing role, dropped
result, unsupported deadline or a mock-only result cannot pass. Retain redacted
runtime/model/source/phase/operation evidence under
`docs/evidence/task-packet-review/deepseek-harness/`; structural, native, unavailable
and unverified results remain separate. Claude native execution stays unverified.

Reuse test fixture/oracle code at its existing ownership point; host execution
adapters remain separate because the native protocols differ. No new production
orchestration service or SDK dependency is introduced by qualification.

Evidence: `docs/deepseek-harness.md:98-120` defines the pinned provider check and
its structural-only boundary; `scripts/lib/distribution.mjs:104-106` owns current
Harness tool resolution and body/meta packaging conventions. Pinned upstream
workflow/PTC/tool references will be retained in the final plan.

## Outcome, prerequisites and pinned inputs

Implement only PTR-08 after its separate explicit invocation. PTR-01 through PTR-06 complete and PTR-07's common fixture/oracle artifacts available with local checks passed. Codex's native verdict is not required to exercise DSH independently.

- Behavioral source: `3da917243e9367c9eec28ebe6662c2787afdde9cc59cd174b45128825e4a62de`.
- Specification version: `7fbb89419df3a1b920b425b161e6cd628f5035fb26ff37437450d521c4d32413`.
- Completeness review: `845484cd-a527-4841-acd1-7e92dc7f4d9b` (Approved, reviewed, consistent).
- Linked requirements: `IPR-001`, `IPR-002`, `IPR-003`, `IPR-004`, `IPR-005`, `IPR-006`, `IPR-007`, `IPR-008`, `IPR-009`, `IPR-010`, `IPR-011`, `IPR-012`, `IPR-013`, `IPR-014`, `IPR-015`, `IPR-016`, `IPR-017`, `IPR-018`, `IPR-019`, `IPR-020`, `IPR-021`, `IPR-022`, `IPR-023`, `IPR-024`, `IPR-025`.
- Technical agreement/digest: use the exact values in `Technical agreement` below;
  `planning_packet_check` must be current at entry and completion.
- Read only linked exact requirement definitions via MCP and the bounded contract
  sections/selectors below; follow every required continuation. Do not reload the
  journal, inactive profiles or unrelated packets. Re-verify cited source evidence.

N01–N08, exported workflow body and separate meta, actual native schema/provider/model route, effective enclosing deadline, compatible real filesystem provider and newly built MCP capabilities. Baseline remains pinned 0.2.1-rc.3 commit 22ddee3792402c3e70ec5f86a63c3e3e895a2f60.

Before bulk implementation reads, verify a usable Git worktree and the actual
runner authority/capabilities. A clean tree or existing commit is not required.
Inspect tracked/staged/untracked state and preserve unrelated content/meaningful
attributes. Unknown loss or overlap requires disposition, not a new baseline or
reset. Do not initialize the real project or inspect/copy auth/private files.

## Allowed writes and boundaries

- Harness adapter/actions in the qualification test support and any required host-neutral fixture/oracle corrections within their original ownership.
- Actual already configured native Harness foreground sessions plus evidence under `docs/evidence/task-packet-review/deepseek-harness/`.
- Existing real filesystem-provider verifier; temporary fixture/session config only. No provider/runtime installation or global configuration.
- Update only this packet's item in `tasks/todo.md` and current `tasks/handoff.md`
  after all its required checks pass. Required scenario-managed journal writes
  remain MCP-owned; exclude workflow YAML from shell content searches/Git diffs.
- No approved requirement/technical-source edits, other packet execution, consuming-
  project skill mutation, global lifecycle changes or implied external authority.

## Acceptance and discriminating verification

The listed test files are **new to create** unless explicitly marked existing.
The qualification test/helper file is existing from PTR-07's shared-artifact prerequisite; add the Harness-specific assertions before its adapter changes.
Work from repository root. Create each check before the owning production change,
run it, and retain the relevant RED; a missing import/harness alone is not semantic
proof. Implement minimal correct behavior, correct implementation while a correct
check fails, and apply the PROVE rule below. Fixtures must be non-sensitive and
owned; never mutate the original review target to prove a test.

| Criterion | Observable acceptance                                                                                                                              | Owning check and evidence                                                                                                                              |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PTR-08-A1 | Real provider discovers/loads the new export with correct policies/resources; this result is reported as structural only.                          | Existing provider verifier against a real compatible module; no mock provider or implicit installation.                                                |
| PTR-08-A2 | Each N01–N08 obligation runs through the real foreground workflow and actual child contexts with the same independent-stage and evidence contract. | Actual native calls using published schema, exact exported body/meta and current permitted advertised model routes; inspect source-bound MCP outcomes. |
| PTR-08-A3 | Actual enclosing deadline aborts the run and real child cleanup is observed; guest-only timers/background tool return cannot pass.                 | Configured small hung-check/child/run cases; record requested versus confirmed cancellation/disposal and cleanup allowance.                            |
| PTR-08-A4 | A genuinely new native session and MCP process continues unfinished acknowledged units without claiming engine-memory restoration.                 | End/restart native fixture environment and inspect phase/unit/attempt history, timing and source freshness.                                            |
| PTR-08-A5 | Missing/null/failed children, diagnostic scope, incomplete proof, secret markers and wrong source fail their respective oracles.                   | Redacted evidence and cross-host shared negative controls; never inherit Codex or unverified Claude runtime results.                                   |

**PROVE:** Individually remove a required native phase, accept null as a completed result, ignore an expired caller, or restart from empty state while claiming resume. The correct native/fixture oracle must fail; restore.

Copy-ready local commands (the new test file must be created first):

```sh
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node --test tests/task-packet-review-qualification.test.mjs
```

Structural command: first set `PACKET_REVIEW_PROVIDER_MODULE` to the actual already available provider module path as an entry prerequisite; no installation is implied:

```sh
rtk proxy node scripts/verify-deepseek-export.mjs "$PACKET_REVIEW_PROVIDER_MODULE"
```

Native action sequence: discover actual workflow/model/MCP capabilities and
verified enclosing control; invoke the exported skill/body plus separate meta via
its published native schema in an owned session; run N01–N08, including effective
small expiry cases; actually end and restart session/MCP for N08; retrieve exact
acknowledged results/cleanup; retain redacted per-case evidence. No guessed native
namespace, timeout argument, background polling or implicit provisioning.

## Completion, rollout and recovery

After focused checks and required PROVE restoration, run proportionate final
validation. Record actual PASS/FAIL/NOT TESTED, commands, input identities and
limitations; planned commands or another host's result are not passes. Required
failed/unavailable checks keep this packet incomplete. Recheck the pinned
`specification_check_state` and exact `planning_packet_check`, compare the scoped
diff with the agreed technical commitments, then update only this checklist item
and replace current handoff. Stop after this packet; optional code/security review
and a commit are separate invocations, not completion or next-packet gates.

Required unavailable native capability/auth/route/provider keeps qualification incomplete. Preserve actual known/unknown cleanup and retained MCP state. Global refresh/setup needs separate scope; do not silently substitute runtimes.

## Technical agreement

Accepted through the native question tool.

- Proposal: `PTR-08-harness-v1`.
- Agreement: `8cd9ecc6-52cf-471f-818b-b52d8944156d`, revision `3`.
- Proposal digest: `97552eb8f2116810aecb6256d184d48d8bbd72252ea693907f09c19e92bbde90`.
- Sources: this packet's `Technical proposal`, the plan's `Shared state commitments` and `Native qualification matrix`.

Remaining execution details belong outside these hashed sources.
