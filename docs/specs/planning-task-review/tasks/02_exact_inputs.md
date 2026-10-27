# PTR-02: Exact Inputs And Bounded Review Units

Status: Planned; technical agreement recorded. Execution requires a separate explicit invocation.

## Technical proposal

Proposal ID: `PTR-02-inputs-v1`. Packet ID: `PTR-02`. Depends on PTR-01.
Requirements: IPR-003, IPR-004, IPR-005, IPR-006, IPR-015, IPR-017,
IPR-020 and IPR-021. Apply `tasks/plan.md`, `Shared state commitments`.

Introduce `packet-review-inputs.ts` in the existing MCP package as the owner of
selected Git evidence and inventory preparation. Significant entry points are
`preparePacketReviewInputs(context, selection)` and
`readPacketReviewSource(context, sourceRef, cursor?)`. Reuse the existing
`requirementSource`, `checkPlanningPacket` and specification review-state checks
for ecosystem inputs, preserving their freshness rules. Reuse the existing
Markdown parser dependencies for packet sections and criterion candidates;
retain arbitrary existing criterion IDs and source-local identities for unlabelled
criteria. The acceptance-evidence specialist reconciles independently checkable
obligations before inventory completion; parsing or tags alone never certify
semantic completeness. Reuse product task-input reads only for an already exact
valid binding; never create a product link.

Invoke Git through fixed argument arrays, not an interpolated shell. Resolve an
explicit committed range, effective working tree, staged-only target or selected
additions against an explicitly empty baseline. Capture exact effective bytes,
file modes, renames/deletions and index differences; include selected untracked
files and non-code outputs. Treat symlink contents as link evidence without
following them into private/out-of-root files. Source references bind the selected
state, content/attribute digest and observation, not today's checkout or a branch
name alone. Recheck relevant identities at dependent reads and submissions.

Expose `task_packet_review_prepare`, `task_packet_review_units` and
`task_packet_review_source_get` through a separate `packet-review-tools.ts` tool
collection registered in the current server. The first operation resolves the
selection, prepares inventory and creates source-bound run/unit identities in
the PTR-01 state. It does not dispatch agents or execute checks. Read operations
are bounded, ordered and source-bound; complete text and reference portions are
retrievable with exact continuations. A missing original, changed selector or
partial read remains an evidence limitation. Normal/diagnostic mode records the
actual specification/agreement/input checks, not an author's guessed status.

Default review-owned payload policy: at most 20 selected packets, 128 units,
32 KiB original text per unit, 64 KiB cumulative review-owned original/common text
per actor assignment, and 16 KiB result payload per assignment. Relevant shared
constraints count in the actor budget. Smaller actual host limits win. These are
conservative input/result guards, not token estimates or latency guarantees;
host/tool overhead needs actual capability headroom. Partition on packet,
criterion and affected-contract boundaries, retain cross-unit dependencies and
retrieve further exact originals within the same budget. An indivisible oversized
obligation or unavailable headroom returns an explicit limit/prerequisite and
next action, never truncation or silent omission. Do not introduce work admission
slots or an execution queue.

Keep source helpers inside this domain until another demonstrated consumer needs
an extracted shared helper. The module depends on existing Git/Markdown/MCP state
boundaries, not native agent implementations. Later isolation reproduces this
exact selection; PTR-02 does not create workspaces or databases.

Evidence: `src/state.ts:80-104` provides canonical-path/safe-path handling;
`src/requirements.ts:46-80` owns exact requirement loading/parsing;
`src/planning.ts:126` owns technical packet readiness;
`src/review-model.ts:11-17` owns behavioral source binding. These paths are
relative to `packages/engineer-agent-workflow-mcp/`. Re-verify before execution.

## Outcome, prerequisites and pinned inputs

Implement only PTR-02 after its separate explicit invocation. PTR-01 complete: validated namespace/helper, preservation and logical-source append tests passed.

- Behavioral source: `3da917243e9367c9eec28ebe6662c2787afdde9cc59cd174b45128825e4a62de`.
- Specification version: `7fbb89419df3a1b920b425b161e6cd628f5035fb26ff37437450d521c4d32413`.
- Completeness review: `845484cd-a527-4841-acd1-7e92dc7f4d9b` (Approved, reviewed, consistent).
- Linked requirements: `IPR-003`, `IPR-004`, `IPR-005`, `IPR-006`, `IPR-015`, `IPR-017`, `IPR-020`, `IPR-021`.
- Technical agreement/digest: use the exact values in `Technical agreement` below;
  `planning_packet_check` must be current at entry and completion.
- Read only linked exact requirement definitions via MCP and the bounded contract
  sections/selectors below; follow every required continuation. Do not reload the
  journal, inactive profiles or unrelated packets. Re-verify cited source evidence.

MCP contract: Public scenarios (prepare/units/source_get), Selection, delivery and limits. Data selectors: `packetReviewSelection`, `packetReviewInput`, `packetReviewLocation`, `packetReviewUnit`, `packetReviewLimits`.

Before bulk implementation reads, verify a usable Git worktree and the actual
runner authority/capabilities. A clean tree or existing commit is not required.
Inspect tracked/staged/untracked state and preserve unrelated content/meaningful
attributes. Unknown loss or overlap requires disposition, not a new baseline or
reset. Do not initialize the real project or inspect/copy auth/private files.

## Allowed writes and boundaries

- New `src/packet-review-inputs.ts` and `src/packet-review-tools.ts` in the MCP package; minimal registration in `src/server.ts`.
- Reuse `requirementSource`, `checkPlanningPacket`, existing spec-state policy and Markdown dependencies; extract only a demonstrated needed helper.
- New package tests `packet-review-inputs.test.mjs` and `packet-review-delivery.test.mjs`; only their isolated fixtures may initialize Git.
- No proof execution, new resource setup, product rebinding or source-checkout writes.
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

| Criterion | Observable acceptance                                                                                                                                                               | Owning check and evidence                                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PTR-02-A1 | Staged, working-tree, committed historical and explicitly empty-baseline selections identify the correct bytes/attributes, including selected untracked files, deletion and rename. | Temporary Git cases: stage a defect then fix only disk; historical tests differ from current; no initial commit; selected untracked implementation.             |
| PTR-02-A2 | Ambiguous/invalid/wrong-project selection is rejected or left pending without inventing attribution or including unrelated dirty work.                                              | Fixed-argv selector/path tests with malicious option/path/link fixtures; preservation hashes and mode checks.                                                   |
| PTR-02-A3 | Nonstandard/unlabelled criteria, missing code/tests and cross-packet constraints enter a source-bound draft inventory; tags alone prove nothing.                                    | Markdown/criterion candidate and contract-link tests; acknowledge that semantic reconciliation remains PTR-04's specialist outcome.                             |
| PTR-02-A4 | Oversized selections partition under accepted policy; all portions/refs remain retrievable and current, without losing an obligation.                                               | Force tiny fixture budgets, follow every cursor, compare unit/criterion set equality and UTF-8 bytes; changed-source/cursor and indivisible-oversize negatives. |
| PTR-02-A5 | Current inputs support normal mode; identifiable legacy/stale inputs retain diagnostic reasons; valid product bindings are read without transitions.                                | Real readiness/spec-policy fixtures and instrumented product-read boundary; absent mandatory MCP never triggers YAML fallback.                                  |

**PROVE:** Separately substitute disk bytes for staged evidence, omit an untracked criterion source, and accept an incomplete final page. Each intended assertion must fail; restore between mutations.

Copy-ready local commands (the new test file must be created first):

```sh
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/packet-review-inputs.test.mjs packages/engineer-agent-workflow-mcp/test/packet-review-delivery.test.mjs
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

Preserve unfinished run/source refs on failure; changed required input needs re-preparation/new run. Never repair the original worktree or manufacture a normal verdict.

## Technical agreement

Accepted after clarification through the native question tool.

- Proposal: `PTR-02-inputs-v1`.
- Agreement: `e691a61d-b9b7-40f3-b230-7b7f31b8d5b1`, revision `3`.
- Proposal digest: `640c3bb501721f3333cd5ff38b840de6ff5ab4fa8efec86ec85ec367d4d003c8`.
- Sources: this packet's `Technical proposal` and the plan's `Shared state commitments`.

Execution details and acceptance mapping are recorded above, outside the hashed sources.
