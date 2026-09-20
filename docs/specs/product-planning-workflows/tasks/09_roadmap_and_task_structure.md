# P09: Stages, epics, stories and independent task identities

Status: Complete. Authorization: implemented by the explicit incremental invocation on 2026-09-15.
Requirements: PWF-009, PWF-015, PWF-016, PWF-017.

## Outcome and boundaries

Stage renaming/reordering preserves identity; an epic spans stages and a stage covers several epics.

Dependencies: [P08](./08_technical_design_scenarios.md).
Require their actual passing evidence in [todo.md](./todo.md) and
[handoff.md](./handoff.md), not their existence or a commit. No clean worktree
or existing commit is required, but Git status and scoped staged/unstaged/untracked
evidence must be available. Preserve all unrelated changes.

Allowed ownership:
- `packages/engineer-agent-workflow-mcp/src/product/roadmap.ts`
- `packages/engineer-agent-workflow-mcp/src/product/tools.ts`
- `packages/engineer-agent-workflow-mcp/src/product/operations.ts` only to register the seven
  contract-defined roadmap mutations in the shared recoverable-operation allowlist.
- New focused test: `packages/engineer-agent-workflow-mcp/test/product-roadmap.test.mjs`; related isolated helpers/fixtures under its test directory.
- `packages/engineer-agent-workflow-mcp/test/packed-artifact.test.mjs` only to add the emitted
  `roadmap.js` and `roadmap.d.ts` files to the exact package inventory.
- This packet's notes, todo.md and current-only handoff.md.

These production/test files are **planned**, not created by this planning invocation.
Do not implement another packet, modify Approved requirements, edit legacy workflow
YAML by hand, enroll existing specs, install/configure clients, commit or publish.

The shared `product/tools.ts` and `product/operations.ts` adapters are in scope only to register this
packet's contract-defined scenarios. The latter is required because recoverable mutations reject
any scenario absent from the shared allowlist before its handler can run. Reuse the P04
schema/transport plumbing; do not implement other packets or broaden shared validators.

## Pinned inputs and minimal read set

- MCP source_version: `f1d2fda79601d9775a4351ea4db7deeb5a9e28f27c24e608aec28eb8ad38cc40`
- MCP specification_version: `acd494dbae06e68a4e87767ef8f71ca65075b49a99b467d98ae3f50b98a2a021`
- MCP review_ref: `501c5408-3180-4edd-82c0-f6eb0fb3ff3a`
- Open this repository's `product-planning-workflows` spec through callable MCP.
  Require Approved, `status: pass`, `coverage_status: reviewed`, matching source_version.
- Fetch exactly `PWF-009`, `PWF-015`, `PWF-016`, `PWF-017` with requirement_get using
  the pinned specification_version; consume every continuation.
- Contract: [mcp.md](../contracts/mcp.md), sections `Roadmap scenarios`, `Workspace and specification ownership`.
- Schema: [data.schema.json](../contracts/schemas/data.schema.json), `#/definitions/Stage`, `#/definitions/Epic`, `#/definitions/Story`, `#/definitions/Task`, `#/definitions/Relation`.
- Quality input: [scenarios.yaml](../quality/scenarios.yaml), Q20, Q21.
- Recheck bounded baseline entrypoints:
  `src/state.ts:79,295`, `src/server.ts:15,47,80`,
  `src/requirements.ts:22` under the MCP package and
  `scripts/lib/distribution.mjs:37,61,68` for any generated assets.
  Existing functions are evidence to inspect, not claims that proposed product
  symbols already exist. Do not reread the full decision journal or all profiles.

## Ownership and lifecycle

Boundary: `roadmap.ts`. Proposed entrypoints: `defineStage, defineEpic, defineStory, defineTask, linkTaskDependency, splitTask`.
Typed inputs and exact result fields are owned by the named MCP/schema sections;
this packet must not invent a competing schema or generic edit endpoint.
Dependencies point from the tool adapter into domain functions and then guarded
storage, never from storage into host skills. Only this boundary's state is mutable.
Close owned descriptors/processes and release active-operation resources on success
or failure; preserve recoverable crash state rather than erase it.
Invalid/foreign/stale inputs fail before new effects; partial effects are disclosed
through the operation checkpoint. No caller error is proof that nothing was written.





## Acceptance, RED and PROVE

1. Stage renaming/reordering preserves identity; an epic spans stages and a stage covers several epics.
2. A technical task needs an outcome and product/technical refs but no fake end-user story.
3. Dependency cycles and duplicate logical task/spec assignment reject readiness; future tasks remain spec-pending, and task splitting creates fresh identities.

| Case | Discriminating observation | Explicit excluded outcome |
| --- | --- | --- |
| Q20: Roadmap evolution | IDs persist, near work is detailed, future work remains coarse/spec-pending. | No mandatory fixed stage enum, fake story, dates or eager specs. |
| Q21: Cardinality, cycles and splitting | Invalid cardinality/cycles rejected; new task IDs on split; stage outcome needs integrated evidence. | No repurposed approved spec or task-count-only stage success. |

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
3. **PROVE:** apply each relevant single-behavior mutation from Q20, Q21
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
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/product-roadmap.test.mjs
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
