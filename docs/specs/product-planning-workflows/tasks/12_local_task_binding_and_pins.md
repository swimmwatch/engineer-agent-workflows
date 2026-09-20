# P12: Branch-local task bindings and implementation checkpoints

Status: Complete. Authorization: a separate explicit invocation of this packet.
Requirements: PWF-012, PWF-016, PWF-020, PWF-024, PWF-027, PWF-031.

## Outcome and boundaries

Only a new reserved task/spec target can be bound; existing standalone specs remain byte-identical and cannot be enrolled.

Dependencies: [P11](./11_independent_review_and_activation.md).
Require their actual passing evidence in [todo.md](./todo.md) and
[handoff.md](./handoff.md), not their existence or a commit. No clean worktree
or existing commit is required, but Git status and scoped staged/unstaged/untracked
evidence must be available. Preserve all unrelated changes.

Allowed ownership:
- `packages/engineer-agent-workflow-mcp/src/product/tasks.ts`
- `packages/engineer-agent-workflow-mcp/src/product/bindings.ts`
- `packages/engineer-agent-workflow-mcp/src/product/tools.ts`
- New focused test: `packages/engineer-agent-workflow-mcp/test/product-task-pins.test.mjs`; related isolated helpers/fixtures under its test directory.
- This packet's notes, todo.md and current-only handoff.md.

These production/test files are **planned**, not created by this planning invocation.
Do not implement another packet, modify Approved requirements, edit legacy workflow
YAML by hand, enroll existing specs, install/configure clients, commit or publish.

The shared product/tools.ts adapter is in scope only to register this packet's contract-defined scenarios. Reuse the P04 schema/transport plumbing; do not implement other packets or broaden shared validators.

## Pinned inputs and minimal read set

- MCP source_version: `f1d2fda79601d9775a4351ea4db7deeb5a9e28f27c24e608aec28eb8ad38cc40`
- MCP specification_version: `acd494dbae06e68a4e87767ef8f71ca65075b49a99b467d98ae3f50b98a2a021`
- MCP review_ref: `501c5408-3180-4edd-82c0-f6eb0fb3ff3a`
- Open this repository's `product-planning-workflows` spec through callable MCP.
  Require Approved, `status: pass`, `coverage_status: reviewed`, matching source_version.
- Fetch exactly `PWF-012`, `PWF-016`, `PWF-020`, `PWF-024`, `PWF-027`, `PWF-031` with requirement_get using
  the pinned specification_version; consume every continuation.
- Contract: [mcp.md](../contracts/mcp.md), sections `Task binding and execution`, `Workspace and specification ownership`.
- Schema: [data.schema.json](../contracts/schemas/data.schema.json), `#/definitions/TaskBinding`, `#/definitions/SourcePin`, `#/definitions/Task`.
- Quality input: [scenarios.yaml](../quality/scenarios.yaml), Q27, Q28.
- Recheck bounded baseline entrypoints:
  `src/state.ts:79,295`, `src/server.ts:15,47,80`,
  `src/requirements.ts:22` under the MCP package and
  `scripts/lib/distribution.mjs:37,61,68` for any generated assets.
  Existing functions are evidence to inspect, not claims that proposed product
  symbols already exist. Do not reread the full decision journal or all profiles.

## Ownership and lifecycle

Boundary: `tasks.ts, bindings.ts`. Proposed entrypoints: `reserveTaskSpecification, checkTaskInputs, startTaskPacket, finishTaskPacket, handoffTaskOwner`.
Typed inputs and exact result fields are owned by the named MCP/schema sections;
this packet must not invent a competing schema or generic edit endpoint.
Dependencies point from the tool adapter into domain functions and then guarded
storage, never from storage into host skills. Only this boundary's state is mutable.
Close owned descriptors/processes and release active-operation resources on success
or failure; preserve recoverable crash state rather than erase it.
Invalid/foreign/stale inputs fail before new effects; partial effects are disclosed
through the operation checkpoint. No caller error is proof that nothing was written.





## Acceptance, RED and PROVE

1. Only a new reserved task/spec target can be bound; existing standalone specs remain byte-identical and cannot be enrolled.
2. First implementation start freezes exact ready product sources plus Approved local spec/plan digests; merely planning does not mark started.
3. Another workspace cannot concurrently own the same task; completion uses the actual pinned version and does not require code review or commit.

| Case | Discriminating observation | Explicit excluded outcome |
| --- | --- | --- |
| Q27: New branch-local task reservation | Exactly one logical task/spec binding; sidecar remains branch-local and recoverable. | No old spec enrollment or automatic spec creation/approval from roadmap. |
| Q28: Start pins and single ownership | Pin at first actual start; reject second owner; explicit next invocation remains required. | No task start from planning marker, commit/review gate or two completions. |

The matching quality cases specify concrete setup/action and required mutations.
All tests use synthetic data, dedicated temporary product roots and isolated
workspace/Git state. Fixture customer answers are not real user consent.
Never target the operator's existing product root, installed bundles or real home.
Observe actual digests/file inventory, selected inputs, result data and operation
effects; do not expose mutable private state solely to fake an assertion.

1. **RED:** create the focused tests first and run the command below. Expected
   failure is the violated assertion above. A missing implementation/import can
   be preliminary RED only; the discriminating assertion must later be demonstrated.
2. **GREEN:** implement this bounded behavior and repeat while a correct check fails.
   Classify a wrong test, stale contract or environment problem before changing it.
   Do not loosen correct acceptance checks to make the implementation pass.
3. **PROVE:** apply each relevant single-behavior mutation from Q27, Q28
   in the isolated implementation, observe the intended assertion fail, restore,
   and rerun. New absence/wiring/post-hoc checks require this evidence.
4. **VERIFY:** run focused plus proportional full regression. Record actual commands,
   exit codes, assertions, environment and source versions. Planned checks are not passes.

## Commands and execution environment

Working directory: repository root. Preconditions: pinned project dependencies
available, supported Node runtime, a usable Git worktree and isolated fixture paths.
The focused file below must be created by this packet; it is not an existing script.

```sh
rtk proxy npm run build
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/product-task-pins.test.mjs
rtk proxy npm run lint
rtk proxy npm test
```

Expected final result: exit 0 and every focused assertion passes; no
failed/unavailable required test. Full npm test is deterministic only.
Native three-OS qualification is aggregated in P17; a local focused pass does not claim other-platform evidence. Do not add a new platform exclusion to obtain a pass.

## Rollback, gates and completion

Keep failed candidates isolated; leave prior ready input readable or report
explicit corruption/blocking. Do not delete retained versions, rewrite existing
user data, migrate legacy specs or silently reset operation state.
Restoring a test mutation is scoped to the agent's own change, not a worktree reset.

MANUAL GATE: installation, global environment edits, external CI dispatch,
publication and commits require separate explicit authorization. Independent
code/security review is separately invoked and is not a packet-completion gate.

Recheck the pinned specification through MCP before completion. Inspect the
scoped final diff and all newly created files. Mark only this packet in todo.md
when every required check passes, update handoff.md with actual evidence and
the next eligible packet, then stop. Otherwise record the concrete failed check,
next action and owner; do not auto-execute the next packet.

## Implementation evidence

- Added scenario-specific `task_specification_reserve`, `task_specification_register_copy`, `task_inputs_check`, `task_packet_start`, and `task_packet_complete` tools.
- Shared reservations use the product store; each registered working copy keeps its guarded `docs/specs/<slug>/.workflow/product-binding.yaml`. Existing specification targets are rejected before any write.
- `task_inputs_check` is read only and returns exact product, Approved specification review, and selected plan/packet pins. First explicit start saves those pins and one owner; completion records evidence, releases the owner, and requires neither review nor commit.
- Preliminary RED failed because `dist/product/tasks.js` was absent.
- Q27 PROVE: temporarily accepting an existing specification directory caused `Missing expected rejection`; the mutation was restored.
- Q28 PROVE: temporarily removing the started-owner guard let a competing registered copy start and caused `Missing expected rejection`; the mutation was restored.
- Final focused result: 3/3. Complete MCP result: 170/170. Repository result: 357/357.
- Root lint, foundation validation (13/13), generated distribution check (13 skills), and `git diff --check` passed.
- Native Windows/macOS qualification remains owned by P17; this packet records local Linux execution only.

## Post-review corrections

- Added an immutable per-specification reservation guard so concurrent tasks
  cannot claim the same logical specification through different binding files.
- Registration now rejects existing specification content without the matching
  sidecar, while absent working-copy targets remain supported.
- First start freezes the complete packet inventory plus product,
  specification and plan versions. Later packets verify and reuse those pins.
- Pre-correction reserved bindings without `product_source_version` remain
  readable; the field is populated on their first corrected start.
- Start `operation_ref` is the required completion `owner_ref`; another client
  cannot finish the packet with workspace context alone.
- Completion rejects duplicate packets, changed frozen inputs, incomplete plan
  coverage and credential-shaped invocation/evidence strings.
- Review RED reproduced missing owner schema, legacy enrollment and incomplete
  multi-packet pinning before the runtime/schema fixes. Focused P12 returned
  3/3 after correction; complete regression evidence is recorded in handoff.
