# P03: Recoverable writes, locking and exact replay

Status: Complete. Authorization: implemented by an explicit invocation of this packet.
Requirements: PWF-018, PWF-020, PWF-021, PWF-022, PWF-023, PWF-028, PWF-030.

## Outcome and boundaries

A and B writing from one base cannot both overwrite the same target; read-only observers do not change bytes or contexts.

Dependencies: [P02](./02_immutable_sources_and_generations.md).
Require their actual passing evidence in [todo.md](./todo.md) and
[handoff.md](./handoff.md), not their existence or a commit. No clean worktree
or existing commit is required, but Git status and scoped staged/unstaged/untracked
evidence must be available. Preserve all unrelated changes.

Allowed ownership:
- `packages/engineer-agent-workflow-mcp/src/product/operations.ts`.
- New focused test: `packages/engineer-agent-workflow-mcp/test/product-recovery.test.mjs`; related isolated helpers/fixtures under its test directory.
- This packet's notes, todo.md and current-only handoff.md.

These production/test files are **planned**, not created by this planning invocation.
Do not implement another packet, modify Approved requirements, edit legacy workflow
YAML by hand, enroll existing specs, install/configure clients, commit or publish.

## Pinned inputs and minimal read set

- MCP source_version: `e43d887518ac10c20ec4b95120272dcfe102595a9cbf42cde40d898b6c4dece3`
- MCP specification_version: `48b53b4e9cf8f6d447f2fd3a2d2ba02f84cbffc24b50056b1b0478ce6d562868`
- MCP review_ref: `db2360f3-2f7a-4b6e-92ea-930ebee0fcad`
- Open this repository's `product-planning-workflows` spec through callable MCP.
  Require Approved, `status: pass`, `coverage_status: reviewed`, matching source_version.
- Fetch exactly `PWF-018`, `PWF-020`, `PWF-021`, `PWF-022`, `PWF-023`, `PWF-028`, `PWF-030` with requirement_get using
  the pinned specification_version; consume every continuation.
- Contract: [mcp.md](../contracts/mcp.md), sections `Checkpoint publication protocol`, `Mutation and recovery protocol`, `Errors and budgets`.
- Schema: [data.schema.json](../contracts/schemas/data.schema.json), `#/definitions/Operation`, `#/definitions/Context`, `#/definitions/MutationResult`.
- Quality input: [scenarios.yaml](../quality/scenarios.yaml), Q06, Q07, Q08.
- Recheck bounded baseline entrypoints:
  `src/state.ts:79,295`, `src/server.ts:15,47,80`,
  `src/requirements.ts:22` under the MCP package and
  `scripts/lib/distribution.mjs:37,61,68` for any generated assets.
  Existing functions are evidence to inspect, not claims that proposed product
  symbols already exist. Do not reread the full decision journal or all profiles.

## Ownership and lifecycle

Boundary: `operations.ts`. Proposed entrypoints: `runProductMutation, inspectOperation, resumeOperation, publishHead`.
Typed inputs and exact result fields are owned by the named MCP/schema sections;
this packet must not invent a competing schema or generic edit endpoint.
Dependencies point from the tool adapter into domain functions and then guarded
storage, never from storage into host skills. Only this boundary's state is mutable.
Close owned descriptors/processes and release active-operation resources on success
or failure; preserve recoverable crash state rather than erase it.
Invalid/foreign/stale inputs fail before new effects; partial effects are disclosed
through the operation checkpoint. No caller error is proof that nothing was written.





## Acceptance, RED and PROVE

1. A and B writing from one base cannot both overwrite the same target; read-only observers do not change bytes or contexts.
2. Kill the child process before and after each durable checkpoint; reopen reports applied, not-applied or blocked accurately.
3. Exact lost-response retries preserve operation identity and result across restart; oversized replies are rejected before effects.

| Case | Discriminating observation | Explicit excluded outcome |
| --- | --- | --- |
| Q06: Two-writer concurrency | A continues; B conflicts; observer changes no bytes/versions/receipts. | No automatic refresh-and-write or false stale conflict after own success. |
| Q07: Crash checkpoint matrix | Each boundary reports actual effects; prior ready stays coherent; ambiguous owner/edit blocks. | No multi-file atomicity claim, blind lock deletion, guessed resume or duplicate effect. |
| Q08: Replay and response budgets | One effect and recoverable result; limit error precedes any new authoritative effect. | No arbitrary retry with new key/context, truncation-as-success or leaking error payload. |

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
3. **PROVE:** apply each relevant single-behavior mutation from Q06, Q07, Q08
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
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/product-recovery.test.mjs
rtk proxy npm run lint
rtk proxy npm test
```

Expected final result: exit 0 and every focused assertion passes; no
failed/unavailable required test. Full npm test is deterministic only.
Native three-OS qualification is aggregated in P17; a local focused pass does not claim other-platform evidence. Do not add a new platform exclusion to obtain a pass.

## Review remediation evidence

The independent P03 code and security review identified six recovery gaps. The
follow-up implementation preserves the original concurrency controls and adds:

- fail-before-effects runtime validation for operation targets;
- retained intent, generation, and result verification for exact replay;
- safe recovery of a completed operation's matching dead-owner lock;
- explicit `head_written` checkpoint coverage and published head, generation,
  and workspace-target revalidation before completion;
- identity-checked cleanup of a partial lock created by a failed write or sync.

The discriminating RED run reported 8 passes and 7 failures. A subsequent
generation-replay check produced a separate 15-pass/1-failure RED. After the
implementation, the focused recovery suite passed 16/16 and the complete MCP
package suite passed 120/120. Exact commands and broader checks are recorded in
[handoff.md](./handoff.md).

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
