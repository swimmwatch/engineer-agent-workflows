# PTR-01: MCP-Owned Review And Verification State

Status: Planned; technical agreement recorded. Execution requires a separate explicit invocation.

## Technical proposal

Proposal ID: `PTR-01-journal-v1`. Packet ID: `PTR-01`.

Implement the shared state commitments in `tasks/plan.md`, section
`Shared state commitments`, for IPR-013, IPR-015, IPR-016, IPR-017, IPR-018,
IPR-020, IPR-022 and IPR-025. Reuse the existing journal and mutation machinery;
do not build a separate file store or a generic persistence framework.

Introduce `packages/engineer-agent-workflow-mcp/src/packet-review-state.ts` as
the domain owner of `extensions.packet_review`, with version 1 records for runs,
packet execution attempts, stage/unit outcomes, finding propositions, execution
observations and conditional owned-resource recovery information. Significant
boundary functions are `readPacketReviewState(context)` and
`mutatePacketReviewState(context, operation, input, change, signal?)`; private
helpers and equivalent internal organization remain flexible. The latter wraps
the existing cooperating-write operation and validates the domain's logical
source identity, entity revision and idempotent operation identity while holding
its lock. It does not launch agents, tests, database commands or cleanup.

Preserve existing `WorkflowTool`/context/diagnostic conventions. Add the exact
schema at the canonical shared schema ownership point and package it through the
existing schema build; the planning contract
`contracts/schemas/data.schema.json` defines the reviewable data boundary. Runtime
validation has one authoritative schema source under `shared/schemas/`, not a
second hand-maintained schema in each host bundle. Determine the smallest schema
placement compatible with the existing decisions validator without changing the
agreed namespace or weakening existing validation.

Each acknowledged append identifies the project/specification, run or packet
attempt, selected source, actor role/phase where applicable, operation and actual
result. Equivalent duplicate content is acknowledged without another history
entry. Different content for the same operation is a conflict. Existing unrelated
extension metadata and behavioral/technical records remain intact. Independent
disjoint appends may succeed against the same unchanged logical source; physical
file freshness is not a substitute for validating that source. A source change,
unsupported schema, corrupt record, oversized write or interrupted mutation must
not produce an acknowledged success. Reads are bounded and have no write effect.

Dependency direction: scenario modules depend on this domain owner; it depends on
the existing `state.ts` persistence functions and canonical schemas. It does not
depend on skill text, native execution engines or product definitions. Existing
specification-review state is neither reused as an implementation-review verdict
nor renamed. Packet progress lives outside hashed technical proposal sections.

Repository evidence to re-verify: `src/state.ts:380-497` provides bounded review
submission locking, validation and atomic replacement;
`src/review-model.ts:11-17` binds behavioral freshness to the specification,
confirmed scope and behavioral decisions rather than extension progress. Both
paths are relative to `packages/engineer-agent-workflow-mcp/`.

## Outcome, prerequisites and pinned inputs

Implement only PTR-01 after its separate explicit invocation. None. This is the first implementation packet.

- Behavioral source: `3da917243e9367c9eec28ebe6662c2787afdde9cc59cd174b45128825e4a62de`.
- Specification version: `7fbb89419df3a1b920b425b161e6cd628f5035fb26ff37437450d521c4d32413`.
- Completeness review: `845484cd-a527-4841-acd1-7e92dc7f4d9b` (Approved, reviewed, consistent).
- Linked requirements: `IPR-013`, `IPR-015`, `IPR-016`, `IPR-017`, `IPR-018`, `IPR-020`, `IPR-022`, `IPR-025`.
- Technical agreement/digest: use the exact values in `Technical agreement` below;
  `planning_packet_check` must be current at entry and completion.
- Read only linked exact requirement definitions via MCP and the bounded contract
  sections/selectors below; follow every required continuation. Do not reload the
  journal, inactive profiles or unrelated packets. Re-verify cited source evidence.

MCP contract: Ownership and schemas; Common protocol; Persistence, concurrency and recovery. Data selectors: namespace root, `packetReviewEvent`, `packetReviewRun`, `packetVerificationAttempt`.

Before bulk implementation reads, verify a usable Git worktree and the actual
runner authority/capabilities. A clean tree or existing commit is not required.
Inspect tracked/staged/untracked state and preserve unrelated content/meaningful
attributes. Unknown loss or overlap requires disposition, not a new baseline or
reset. Do not initialize the real project or inspect/copy auth/private files.

## Allowed writes and boundaries

- `packages/engineer-agent-workflow-mcp/src/packet-review-state.ts` (new domain owner).
- `shared/schemas/decisions.schema.json`: namespaced definitions and `extensions.packet_review` validation, preserving unrelated metadata.
- New `packages/engineer-agent-workflow-mcp/test/packet-review-state.test.mjs`; reuse existing fixture/stdio infrastructure.
- Generated mirrors/markers of the changed canonical shared schema only; regenerate, never hand-edit. No native workflow or agent execution.
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

| Criterion | Observable acceptance                                                                                                                            | Owning check and evidence                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| PTR-01-A1 | A valid version-1 namespace is retained through the existing atomic mutation path without changing behavioral source/version or planning digest. | New state tests: append progress to a fixture with an Approved spec/agreement; compare the owning scenario checks before/after. |
| PTR-01-A2 | An exact duplicate produces one acknowledged event; conflicting content for that operation preserves the original and fails.                     | Concurrent/disjoint append, lost-reply read-back and conflicting-payload tests using actual temporary journal bytes.            |
| PTR-01-A3 | Corrupt/unsupported state, invalid references and would-exceed 16 MiB output never install a successful write.                                   | Schema/owner validation, bounded-write and interrupted-write tests; read back prior file identity.                              |
| PTR-01-A4 | Older attempts and unrelated metadata survive; state is local and bounded, with no command/resource execution.                                   | Fresh-session read-back and preservation fixtures; observe filesystem/process boundary, not only a function name.               |

**PROVE:** Mutate duplicate detection to append twice, then separately bypass the progress/source separation; the intended count/freshness assertions must fail. Restore after each mutation. A missing module/import RED alone is insufficient.

Copy-ready local commands (the new test file must be created first):

```sh
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/packet-review-state.test.mjs
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

Roll code back only within this packet's owned diff if needed; retain introduced progress/history. No journal deletion, crash-lock repair, migration or global runtime change.

## Technical agreement

Accepted through native question `ptr01_storage`.

- Proposal: `PTR-01-journal-v1`.
- Agreement: `bd54c7b5-ef05-4203-befc-0cfec0f830c6`, revision `2`.
- Proposal digest: `acf83ff1502c14cec2101d2f5982390a98c55de49f5c9e4b52f4dc1fd1dca1b8`.
- Exact sources: this packet's `Technical proposal` and `tasks/plan.md`'s
  `Shared state commitments`.

Execution details and acceptance mapping are recorded above, outside the hashed
sources. Exact technical readiness is checked through MCP.
