# PTR-03: Durable Packet Verification Producer

Status: Planned; technical agreement recorded. Execution requires a separate explicit invocation.

## Technical proposal

Proposal ID: `PTR-03-producer-v1`. Packet ID: `PTR-03`. Depends on PTR-01 and
PTR-02. Requirements: IPR-001, IPR-005, IPR-008, IPR-014, IPR-015, IPR-016,
IPR-020, IPR-022 and IPR-025. Apply `tasks/plan.md`, `Shared state commitments`.

Add producer/consumer scenarios `packet_verification_start`,
`packet_verification_record`, `packet_verification_get` and
`packet_verification_complete` in `packet-verification.ts`, using PTR-01 state
ownership and PTR-02 relevant source identities. Starting an attempt binds its
packet, governing specification and exact technical agreement. Recording an
observation appends its actual order, RED/GREEN/PROVE/check purpose, exact code/test
inputs at that moment, safe command/working-directory references, expected/actual
outcome, assertion reached, and mutation/restoration outcome where applicable.
Source identities may legitimately differ between RED and GREEN; each event
retains its own inputs rather than rewriting an attempt's past as final code.

Use existing context, validation and logical-source checks. A successful record
response acknowledges the durable bounded observation; raw logs are optional and
cannot be its sole content. Completion verifies required observations and owned
mutation restoration for that attempt. Equivalent retry and conflicting payloads
follow PTR-01. No operation runs a test, fabricates chronology, authenticates
consent or marks an implementation packet complete. Reads work by
project/specification/packet/attempt in a new session and preserve earlier
attempts after later packet execution.

Update the canonical `skills/incremental-implementation/SKILL.md`, the owning
root `shared/references/test-discipline.md` and
`shared/references/implementation-context.md`, and the planning skill's
`references/task-packets.md`. The executor starts/continues its exact attempt,
records required observations when they occur and requires acknowledged retention
before marking completion or replacing the current handoff. The handoff stores
the attempt reference, not another hand-edited proof history. Keep ordinary
current checklist/handoff updates and stop-after-one-packet behavior. Existing
product start/completion transitions remain owned by their existing scenarios;
link the same verification attempt rather than duplicate it in product history.
This does not add an optional-review or commit gate.

Legacy packets keep their actual governing evidence obligations. Missing required
history is explicitly unknown and supports only diagnostic review of available
scope; a check executed now cannot recreate an earlier RED. Do not backfill,
migrate or silently add historical obligations to an old completed packet.
Failed required persistence leaves the producer incomplete. Progress writes must
leave behavioral approval and accepted technical-proposal digests fresh.

The new producer module depends on state/input helpers and existing readiness
policy. Skills consume published scenarios; they never read/edit the journal
directly. Update source guidance and regenerate matching host/shared assets with
the existing generator; do not hand-edit installed or host-generated copies.

Evidence to re-verify: `skills/incremental-implementation/SKILL.md:44-65`
currently records checks then replaces current handoff;
`shared/references/test-discipline.md:RED, GREEN, PROVE` permits evidence in packet
notes or handoff; `src/review-model.ts:11-17` excludes extension progress from
behavioral freshness (`src/` is relative to the MCP package).

## Outcome, prerequisites and pinned inputs

Implement only PTR-03 after its separate explicit invocation. PTR-01 and PTR-02 complete; exact observation-input identity and durable append/read-back work.

- Behavioral source: `3da917243e9367c9eec28ebe6662c2787afdde9cc59cd174b45128825e4a62de`.
- Specification version: `7fbb89419df3a1b920b425b161e6cd628f5035fb26ff37437450d521c4d32413`.
- Completeness review: `845484cd-a527-4841-acd1-7e92dc7f4d9b` (Approved, reviewed, consistent).
- Linked requirements: `IPR-001`, `IPR-005`, `IPR-008`, `IPR-014`, `IPR-015`, `IPR-016`, `IPR-020`, `IPR-022`, `IPR-025`.
- Technical agreement/digest: use the exact values in `Technical agreement` below;
  `planning_packet_check` must be current at entry and completion.
- Read only linked exact requirement definitions via MCP and the bounded contract
  sections/selectors below; follow every required continuation. Do not reload the
  journal, inactive profiles or unrelated packets. Re-verify cited source evidence.

MCP contract: four packet_verification scenarios; lifecycle/retention rules. Data selector: `packetVerificationAttempt` and `packetVerificationObservation`. Actual governing packet's required kinds, not an invented obligation for legacy work.

Before bulk implementation reads, verify a usable Git worktree and the actual
runner authority/capabilities. A clean tree or existing commit is not required.
Inspect tracked/staged/untracked state and preserve unrelated content/meaningful
attributes. Unknown loss or overlap requires disposition, not a new baseline or
reset. Do not initialize the real project or inspect/copy auth/private files.

## Allowed writes and boundaries

- New MCP `src/packet-verification.ts`, its tool registration and `test/packet-verification.test.mjs`.
- Canonical incremental skill, root shared test discipline/implementation context, and the planning task-packet reference named in the agreed proposal.
- If detail cannot fit the entry body, add a condition-routed incremental reference for required verification retention; keep SKILL.md within 4096 UTF-8 bytes.
- Regenerated counterparts/shared markers only. No retrospective history migration or change to technical/behavioral decisions.
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

| Criterion | Observable acceptance                                                                                                                            | Owning check and evidence                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| PTR-03-A1 | The producer records actual RED/GREEN/PROVE/check observations in order with each event's own code/test identity and assertion/result.           | New scenario tests: RED test input differs from final GREEN code; no final-source relabelling or fabricated chronology.               |
| PTR-03-A2 | Two executions without commits retain the first attempt after handoff replacement and a fresh MCP process.                                       | Real temporary-journal scenario sequence and fresh stdio read-back; remove optional raw log and still retrieve required observations. |
| PTR-03-A3 | Failed required write/observation/restoration prevents evidence/producer completion, but no review/commit gate is added.                         | Injected write/collection/assertion/restoration failure cases; completion/checklist/handoff oracle.                                   |
| PTR-03-A4 | Progress writes preserve Approved spec and exact technical agreement; duplicate/conflicting delivery is safe.                                    | Compare spec/planning checks before/after; exact retry and conflict cases through transport.                                          |
| PTR-03-A5 | Missing required legacy history remains unknown after a current green test; actual old contracts gain no retroactive obligation.                 | Diagnostic/legacy fixtures and generated instruction checks across all hosts.                                                         |
| PTR-03-A6 | Recording is bounded per logical run, not per individual unit test; actual operation count/time can be observed without a promised latency gain. | Isolated producer probe or existing trace metrics; report measured scope/count/elapsed only, including all writes/read-back.          |

**PROVE:** Separately drop the first attempt on second completion, count a newly green test as past RED, and ignore failed retention. Each historical/retrieval/completion assertion must fail; restore.

Copy-ready local commands (the new test file must be created first):

```sh
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/packet-verification.test.mjs
rtk proxy npm run generate
rtk proxy npm run generate:check
rtk proxy npm run validate
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

Mixed old/new runtimes preserve existing state; use the new producer only with matching supported capabilities. Missing history stays diagnostic. No copying credentials, installing the bundle or refreshing the live MCP implicitly.

## Technical agreement

Accepted after clarification through the native question tool.

- Proposal: `PTR-03-producer-v1`.
- Agreement: `1c7a1463-d150-4233-a671-ef38d9151f7e`, revision `3`.
- Proposal digest: `daa934fce34b7c62faa932232378854f4a2327224c0fb80082b7ce8fd7f1210f`.
- Sources: this packet's `Technical proposal` and the plan's `Shared state commitments`.

Execution details and acceptance mapping are recorded above, outside the hashed sources.
