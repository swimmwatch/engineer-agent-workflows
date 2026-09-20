# P13: Product amendments, affected tasks and safety exceptions

Status: Complete. Implemented by the explicit P13 incremental invocation on 2026-09-18.
Requirements: PWF-023, PWF-024, PWF-025, PWF-026, PWF-032.

## Outcome and boundaries

Ordinary compatible changes permit started tasks to finish their pinned scope; new/not-started tasks must reconcile current input.

Dependencies: [P12](./12_local_task_binding_and_pins.md).
Require their actual passing evidence in [todo.md](./todo.md) and
[handoff.md](./handoff.md), not their existence or a commit. No clean worktree
or existing commit is required, but Git status and scoped staged/unstaged/untracked
evidence must be available. Preserve all unrelated changes.

Allowed ownership:
- `packages/engineer-agent-workflow-mcp/src/product/review.ts`
- `packages/engineer-agent-workflow-mcp/src/product/tasks.ts`
- `packages/engineer-agent-workflow-mcp/src/product/tools.ts`
- New focused test: `packages/engineer-agent-workflow-mcp/test/product-amendments.test.mjs`; related isolated helpers/fixtures under its test directory.
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
- Fetch exactly `PWF-023`, `PWF-024`, `PWF-025`, `PWF-026`, `PWF-032` with requirement_get using
  the pinned specification_version; consume every continuation.
- Contract: [mcp.md](../contracts/mcp.md), sections `Review and amendment scenarios`, `Task binding and execution`.
- Schema: [data.schema.json](../contracts/schemas/data.schema.json), `#/definitions/Candidate`, `#/definitions/TaskBinding`, `#/definitions/SafetyBlock`, `#/definitions/Decision`.
- Quality input: [scenarios.yaml](../quality/scenarios.yaml), Q29, Q30.
- Recheck bounded baseline entrypoints:
  `src/state.ts:79,295`, `src/server.ts:15,47,80`,
  `src/requirements.ts:22` under the MCP package and
  `scripts/lib/distribution.mjs:37,61,68` for any generated assets.
  Existing functions are evidence to inspect, not claims that proposed product
  symbols already exist. Do not reread the full decision journal or all profiles.

## Ownership and lifecycle

Boundary: `review.ts, tasks.ts`. Proposed entrypoints: `prepareAmendment, inspectAmendmentImpact, rebaseAmendment, recordSafetyBlock, resolveSafetyBlock`.
Typed inputs and exact result fields are owned by the named MCP/schema sections;
this packet must not invent a competing schema or generic edit endpoint.
Dependencies point from the tool adapter into domain functions and then guarded
storage, never from storage into host skills. Only this boundary's state is mutable.
Close owned descriptors/processes and release active-operation resources on success
or failure; preserve recoverable crash state rather than erase it.
Invalid/foreign/stale inputs fail before new effects; partial effects are disclosed
through the operation checkpoint. No caller error is proof that nothing was written.





## Acceptance, RED and PROVE

1. Ordinary compatible changes permit started tasks to finish their pinned scope; new/not-started tasks must reconcile current input.
2. A revoked access rule, breaking interface or unresolved material impact blocks affected next checkpoints and completion.
3. Only explicit user disposition through the owning interview resolves the blocker; hashes, default flags and implementation convenience do not establish safety.

| Case | Discriminating observation | Explicit excluded outcome |
| --- | --- | --- |
| Q29: Ordinary amendment and unstarted tasks | Started task may finish its exact old scope; planned task reconciles current rules. | No forced ordinary upgrade, invented start marker or old pins for new scope. |
| Q30: Safety exception and finding classification | Affected work pauses until valid resolution; unrelated work continues; defects do not rewrite product meaning. | No boolean safety waiver, environment failure as pass or softened correct check. |

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
3. **PROVE:** apply each relevant single-behavior mutation from Q29, Q30
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
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/product-amendments.test.mjs
rtk proxy npm run lint
rtk proxy npm test
```

Expected final result: exit 0 and every focused assertion passes; no
failed/unavailable required test. Full npm test is deterministic only.
Native three-OS qualification is aggregated in P17; a local focused pass does not claim other-platform evidence. Do not add a new platform exclusion to obtain a pass.

## Implementation evidence

- RED: the focused suite first failed because the P13 amendment exports were absent.
- GREEN: `product-amendments.test.mjs` passes 4/4, including a compatible head change across two separately invoked packets, current-input reconciliation for an unstarted task, bounded prepare/impact/rebase, and safety blocking/resolution.
- PROVE Q29: restoring unconditional head equality made the started-task scenario fail with `CONFLICT`; the mutation was restored and the suite returned to 4/4.
- PROVE Q30: bypassing the unresolved-block check changed the expected task status from `fail` to `pass`; the mutation was restored and the suite returned to 4/4.
- `npm run build`, `npm run lint`, the complete MCP package test command, and root `npm test` all exited 0 after the final production change.
- `npm run validate:foundation` passed 13/13 skills; `npm run generate:check` passed 13 generated skills; `git diff --check` exited 0.
- The pinned specification was reopened through MCP after implementation and remained `pass` / `reviewed` at the exact source, specification and review references above.
- Native three-OS qualification remains owned by P17. Independent code/security review, commits, installation and publication were not run by this packet.

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
