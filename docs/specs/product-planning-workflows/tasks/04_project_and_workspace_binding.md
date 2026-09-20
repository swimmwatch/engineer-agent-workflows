# P04: Explicit product creation and shared workspace identity

Status: Complete. Authorization: implemented by explicit invocation of this packet.
Requirements: PWF-011, PWF-012, PWF-015, PWF-016, PWF-027, PWF-028.

## Outcome and boundaries

Two genuine Git worktrees resolve one established product; a separate clone needs explicit binding even with the same remote/title.

Dependencies: [P03](./03_operations_concurrency_and_recovery.md).
Require their actual passing evidence in [todo.md](./todo.md) and
[handoff.md](./handoff.md), not their existence or a commit. No clean worktree
or existing commit is required, but Git status and scoped staged/unstaged/untracked
evidence must be available. Preserve all unrelated changes.

Allowed ownership:
- `packages/engineer-agent-workflow-mcp/src/product/bindings.ts`
- `packages/engineer-agent-workflow-mcp/src/product/tools.ts`
- `packages/engineer-agent-workflow-mcp/src/api.ts`
- `packages/engineer-agent-workflow-mcp/src/server.ts`
- `packages/engineer-agent-workflow-mcp/scripts/build-schemas.mjs`
- New focused test: `packages/engineer-agent-workflow-mcp/test/product-bindings.test.mjs`; related isolated helpers/fixtures under its test directory.
- This packet's notes, todo.md and current-only handoff.md.

These production/test files are **planned**, not created by this planning invocation.
Do not implement another packet, modify Approved requirements, edit legacy workflow
YAML by hand, enroll existing specs, install/configure clients, commit or publish.

Only register this packet's product discovery/open/initialize/workspace-binding scenarios and shared descriptor plumbing (U04/U11). Preserve legacy registrations and advertise only implemented product capabilities. The JSON input/output schema is read-only P01 authority.

## Pinned inputs and minimal read set

- MCP source_version: `f1d2fda79601d9775a4351ea4db7deeb5a9e28f27c24e608aec28eb8ad38cc40`
- MCP specification_version: `acd494dbae06e68a4e87767ef8f71ca65075b49a99b467d98ae3f50b98a2a021`
- MCP review_ref: `501c5408-3180-4edd-82c0-f6eb0fb3ff3a`
- Open this repository's `product-planning-workflows` spec through callable MCP.
  Require Approved, `status: pass`, `coverage_status: reviewed`, matching source_version.
- Fetch exactly `PWF-011`, `PWF-012`, `PWF-015`, `PWF-016`, `PWF-027`, `PWF-028` with requirement_get using
  the pinned specification_version; consume every continuation.
- Contract: [mcp.md](../contracts/mcp.md), sections `Workspace and specification ownership`, `Product discovery`.
- Schema: [data.schema.json](../contracts/schemas/data.schema.json), `#/definitions/Store`, `#/definitions/WorkspaceBinding`, `#/definitions/Context`.
- Quality input: [scenarios.yaml](../quality/scenarios.yaml), Q09, Q10.
- Recheck bounded baseline entrypoints:
  `src/state.ts:79,295`, `src/server.ts:15,47,80`,
  `src/requirements.ts:22` under the MCP package and
  `scripts/lib/distribution.mjs:37,61,68` for any generated assets.
  Existing functions are evidence to inspect, not claims that proposed product
  symbols already exist. Do not reread the full decision journal or all profiles.

## Ownership and lifecycle

Boundary: `bindings.ts, tools.ts`. Proposed entrypoints: `resolveWorkspace, initializeProduct, bindWorkspace`.
Typed inputs and exact result fields are owned by the named MCP/schema sections;
this packet must not invent a competing schema or generic edit endpoint.
Dependencies point from the tool adapter into domain functions and then guarded
storage, never from storage into host skills. Only this boundary's state is mutable.
Close owned descriptors/processes and release active-operation resources on success
or failure; preserve recoverable crash state rather than erase it.
Invalid/foreign/stale inputs fail before new effects; partial effects are disclosed
through the operation checkpoint. No caller error is proof that nothing was written.





## Acceptance, RED and PROVE

1. Two genuine Git worktrees resolve one established product; a separate clone needs explicit binding even with the same remote/title.
2. An unknown project opens as unbound without filesystem writes; explicit initialization alone creates its data.
3. Cross-product IDs, renamed locations and unsafe local paths cannot silently rebind or touch legacy artifacts.

| Case | Discriminating observation | Explicit excluded outcome |
| --- | --- | --- |
| Q09: Known worktrees and unknown clones | Known common-dir resolves shared product; clone/unknown remain unbound until selected. | No remote URL/name heuristic, Git index/checkout/commit mutation or disk-wide scan. |
| Q10: Initial adoption and root/binding recovery | Existing workflow bytes remain identical; pending init can be found without lost response IDs. | No implicit enrollment, silently overwritten binding or requiring inaccessible context. |

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
3. **PROVE:** apply each relevant single-behavior mutation from Q09, Q10
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
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/product-bindings.test.mjs
rtk proxy npm run lint
rtk proxy npm test
```

Expected final result: exit 0 and every focused assertion passes; no
failed/unavailable required test. Full npm test is deterministic only.
Native three-OS qualification is aggregated in P17; a local focused pass does not claim other-platform evidence. Do not add a new platform exclusion to obtain a pass.

## Implementation evidence

- Added explicit `product_capabilities`, `product_open`, `product_list`,
  `product_initialize`, and `product_bind_workspace` scenarios over guarded
  product bindings and the P01 JSON Schema contract.
- Focused product-binding tests passed after a preliminary missing-module RED.
  Q09 PROVE showed that relaxing canonical Git common-directory comparison
  incorrectly binds a separate clone; Q10 PROVE showed that writing the legacy
  workspace binding changes protected bytes. Both mutations were restored and
  the focused suite passed.
- The root workflow-contract integration test produced a RED because it treated
  every input schema as Zod. It now branches on `schemaKind` and also verifies
  published JSON output schemas. A temporary output-schema version mismatch was
  detected, restored, and the test passed 2/2.
- MCP package tests passed 124/124 outside the sandbox. Root build, lint, full
  `npm test`, generation check, foundation validation, packed-artifact check,
  and `git diff --check` all passed. The final MCP preflight remained
  `pass` / `reviewed` at the pinned source, specification, and review versions.
- Post-review remediation now accepts shared Git identity only when the
  canonical workspace appears in `git worktree list --porcelain -z`, rejects
  product roots overlapping the Git common directory, and replays only a
  persisted operation whose intent, result, generation, and recomputed request
  digest agree. An existing initialization binding has no fabricated bind
  receipt. Catalog locks now persist operation/session ownership and a stopped
  lock can be replaced only by an explicit resume of the same operation.
- The expanded seven-case product-binding suite, MCP package suite, root
  `npm test`, lint, generation check, foundation validation, and
  `git diff --check` passed after remediation. Final MCP preflight remained
  `pass` / `reviewed` at the same pinned versions.
- Native macOS/Windows qualification remains owned by P17. No independent
  review, commit, installation, publication, or P05 implementation was run.

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
