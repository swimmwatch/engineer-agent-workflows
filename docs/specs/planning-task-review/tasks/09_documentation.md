# PTR-09: Qualified Workflow Documentation

Status: Planned; technical agreement recorded. Execution requires a separate explicit invocation.

## Technical proposal

Proposal ID: `PTR-09-docs-v1`. Packet ID: `PTR-09`. Depends on PTR-01 through
PTR-08 completing their required checks. Requirements: IPR-001, IPR-002,
IPR-011 through IPR-015, IPR-018 through IPR-025. Apply `tasks/plan.md`,
`Shared state commitments`.

Extend existing authoritative discovery/runtime documentation in `README.md`,
`docs/deepseek-harness.md` and the MCP package's `README.md`; add one focused
`docs/task-packet-review.md` guide and link it from `docs/index.md`. Durable
documentation is warranted: the behavior crosses skill/native-agent/MCP/producer
boundaries, has non-obvious source/evidence/timeout semantics, introduces review
units and normalized propositions, and can be misconfigured silently.

Describe the implemented flow from explicit packet/target selection through
independent fact collection, main review, verification and derived reporting.
Explain phase-local checks, proportional fixture/workspace/database reuse,
owned-only cleanup, actual bounded execution prerequisites and cancellation
limits. Include one small process diagram only where it clarifies interactions;
do not depict execution as a late phase or a resource-slot broker.

Document source/index/untracked distinctions, bounded units and group integration,
normal versus diagnostic outcomes, partial-finding normalization, producer-owned
attempt records/handoff links, current proof versus historical RED, interruption/
fresh-session resume and repeated full review. Explain optional review ownership
and the separation of packet completion, commit and publication authority.
Published examples use repository-relative/safe references and actual logical MCP
scenario names, never private machine paths, namespace guesses or credentials.

Use qualification evidence to label Codex/Harness native results and Claude's
structural-only result accurately. Show actual effective defaults and limitations
rather than invent performance savings or claim all client surfaces work.
Retain the existing pinned global lifecycle policy without executing installation
or publication. Reference stable entry-point symbols rather than transient source
line numbers or copied schemas/protocol transcripts.

Verify commands/examples against the implemented artifacts and use a bounded
reader who did not author the feature to check that target selection, allowed
effects, result meaning, evidence retrieval and recovery are understandable
without this conversation. This is documentation acceptance, not a new general
independent-review gate for consuming projects.

## Outcome, prerequisites and pinned inputs

Implement only PTR-09 after its separate explicit invocation. PTR-01 through PTR-08 complete with required local/native checks passed. Required unavailable qualification is not downgraded so this packet can finish.

- Behavioral source: `3da917243e9367c9eec28ebe6662c2787afdde9cc59cd174b45128825e4a62de`.
- Specification version: `7fbb89419df3a1b920b425b161e6cd628f5035fb26ff37437450d521c4d32413`.
- Completeness review: `845484cd-a527-4841-acd1-7e92dc7f4d9b` (Approved, reviewed, consistent).
- Linked requirements: `IPR-001`, `IPR-002`, `IPR-011`, `IPR-012`, `IPR-013`, `IPR-014`, `IPR-015`, `IPR-018`, `IPR-019`, `IPR-020`, `IPR-021`, `IPR-022`, `IPR-023`, `IPR-024`, `IPR-025`.
- Technical agreement/digest: use the exact values in `Technical agreement` below;
  `planning_packet_check` must be current at entry and completion.
- Read only linked exact requirement definitions via MCP and the bounded contract
  sections/selectors below; follow every required continuation. Do not reload the
  journal, inactive profiles or unrelated packets. Re-verify cited source evidence.

Implemented artifact/protocol entry points and actual PTR-07/PTR-08 evidence, plus MCP contract/Data schema and qualified limitations. Read IPR-024 plus the exact linked requirements for each documented promise.

Before bulk implementation reads, verify a usable Git worktree and the actual
runner authority/capabilities. A clean tree or existing commit is not required.
Inspect tracked/staged/untracked state and preserve unrelated content/meaningful
attributes. Unknown loss or overlap requires disposition, not a new baseline or
reset. Do not initialize the real project or inspect/copy auth/private files.

## Allowed writes and boundaries

- `README.md`, `docs/index.md`, `docs/deepseek-harness.md`, MCP package `README.md`, and one new `docs/task-packet-review.md`.
- Documentation/example validation and bounded independent reader evidence only; no production behavior, install, config change, commit or publication.
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

| Criterion | Observable acceptance                                                                                                                                | Owning check and evidence                                                                                                                               |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PTR-09-A1 | A reader can identify selection, allowed effects, phase flow, mode/verdict, proof ownership, retrieval and recovery without this conversation.       | A bounded reader who did not author the feature answers those concrete questions from docs; retain unresolved misunderstandings as failures to correct. |
| PTR-09-A2 | Examples and paths match actual generated/source/runtime contracts, with no private root, credentials or guessed MCP namespace.                      | Execute harmless parser/discovery/examples in isolated fixtures; inspect exact safe output and relative references.                                     |
| PTR-09-A3 | Documentation correctly distinguishes current proof/history, partial propositions, bounded units/timeouts and reused versus owned cleanup.           | Scenario walkthroughs tied to actual qualified outcomes, including diagnostic/unavailable/unknown cases.                                                |
| PTR-09-A4 | Codex/Harness native evidence and Claude structural-only scope are accurately labelled; review never grants completion/commit/publication authority. | Compare text with retained acceptance results and explicit invocation/lifecycle policy; no future promise represented as current success.               |

**PROVE:** For an absence/wiring claim newly enforced by a documentation check, plant one wrong host name/private marker or stale command in an owned copy and observe the intended check fail. Restore before final validation.

Copy-ready local commands (the new test file must be created first):

```sh
rtk proxy node node_modules/prettier/bin/prettier.cjs --check README.md docs/index.md docs/deepseek-harness.md docs/task-packet-review.md packages/engineer-agent-workflow-mcp/README.md
```

Run harmless documented examples against the implemented fixture interfaces,
then the bounded reader acceptance. Validate Markdown formatting and referenced
actual paths/operations; check supported generated commands with existing
`generate:check`/`validate`. Do not run installation/publication commands merely to
validate their prose.

## Completion, rollout and recovery

After focused checks and required PROVE restoration, run proportionate final
validation. Record actual PASS/FAIL/NOT TESTED, commands, input identities and
limitations; planned commands or another host's result are not passes. Required
failed/unavailable checks keep this packet incomplete. Recheck the pinned
`specification_check_state` and exact `planning_packet_check`, compare the scoped
diff with the agreed technical commitments, then update only this checklist item
and replace current handoff. Stop after this packet; optional code/security review
and a commit are separate invocations, not completion or next-packet gates.

Correct documentation against implemented qualified behavior; do not change product contracts or weaken an acceptance oracle to make prose true. Missing required qualification remains an owned prerequisite.

## Technical agreement

Accepted through the native question tool.

- Proposal: `PTR-09-docs-v1`.
- Agreement: `3ab963e7-c2c7-4d98-a696-dc7c782f8e96`, revision `2`.
- Proposal digest: `44ce5b6a19e06a6896b24d021e75b595b0398400b6c2522ca566bc882d1cba65`.
- Sources: this packet's `Technical proposal`, the plan's `Shared state commitments`.

Remaining execution details belong outside these hashed sources.
