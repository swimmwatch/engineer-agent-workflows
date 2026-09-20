# P16: Selected product context in task workflows

Status: Complete. Authorized and executed by one explicit incremental invocation.
Requirements: PWF-001, PWF-002, PWF-004, PWF-019, PWF-024, PWF-025, PWF-027, PWF-031, PWF-032.

## Outcome and boundaries

Fresh task specification selects exact product context but confirms its own manifest before loading profiles.

Dependencies: [P15](./15_technical_and_roadmap_skills.md).
Require their actual passing evidence in [todo.md](./todo.md) and
[handoff.md](./handoff.md), not their existence or a commit. No clean worktree
or existing commit is required, but Git status and scoped staged/unstaged/untracked
evidence must be available. Preserve all unrelated changes.

Allowed ownership:
- `skills/spec-driven-development/`
- `skills/planning-and-task-breakdown/`
- `skills/incremental-implementation/`
- `shared/references/product-workflow.md`
- `scripts/lib/distribution.mjs`
- New focused test: `tests/product-task-integration.test.mjs`; related isolated helpers/fixtures under its test directory.
- This packet's notes, todo.md and current-only handoff.md.

These production/test files are **planned**, not created by this planning invocation.
Do not implement another packet, modify Approved requirements, edit legacy workflow
YAML by hand, enroll existing specs, install/configure clients, commit or publish.

For template/catalog changes, edit only canonical sources, run `rtk proxy npm run generate`
inside this authorized packet, then verify both generated hosts. Do not install them.

Skill directories include their SKILL.md and conditional references only. shared/references/product-workflow.md is the proposed shared protocol reference, not a second schema source. Host bundle changes under plugins/codex/engineer-agent-workflows/ and plugins/claude-code/engineer-agent-workflows/, plus their generated marketplace metadata, are renderer outputs only. No hand-edited generated copies or installation is allowed.

## Pinned inputs and minimal read set

- MCP source_version: `f1d2fda79601d9775a4351ea4db7deeb5a9e28f27c24e608aec28eb8ad38cc40`
- MCP specification_version: `acd494dbae06e68a4e87767ef8f71ca65075b49a99b467d98ae3f50b98a2a021`
- MCP review_ref: `501c5408-3180-4edd-82c0-f6eb0fb3ff3a`
- Open this repository's `product-planning-workflows` spec through callable MCP.
  Require Approved, `status: pass`, `coverage_status: reviewed`, matching source_version.
- Fetch exactly `PWF-001`, `PWF-002`, `PWF-004`, `PWF-019`, `PWF-024`, `PWF-025`, `PWF-027`, `PWF-031`, `PWF-032` with requirement_get using
  the pinned specification_version; consume every continuation.
- Contract: [mcp.md](../contracts/mcp.md), sections `Skill routing and generation`, `Task binding and execution`.
- Schema: [data.schema.json](../contracts/schemas/data.schema.json), `#/definitions/TaskBinding`, `#/definitions/ContextSelection`.
- Quality input: [scenarios.yaml](../quality/scenarios.yaml), Q34, Q35.
- Recheck bounded baseline entrypoints:
  `src/state.ts:79,295`, `src/server.ts:15,47,80`,
  `src/requirements.ts:22` under the MCP package and
  `scripts/lib/distribution.mjs:37,61,68` for any generated assets.
  Existing functions are evidence to inspect, not claims that proposed product
  symbols already exist. Do not reread the full decision journal or all profiles.

## Ownership and lifecycle

Boundary: `existing specification/planning/incremental references`. Proposed entrypoints: `spec-driven-development, planning-and-task-breakdown, incremental-implementation`.
Typed inputs and exact result fields are owned by the named MCP/schema sections;
this packet must not invent a competing schema or generic edit endpoint.
Dependencies point from the tool adapter into domain functions and then guarded
storage, never from storage into host skills. Only this boundary's state is mutable.
Close owned descriptors/processes and release active-operation resources on success
or failure; preserve recoverable crash state rather than erase it.
Invalid/foreign/stale inputs fail before new effects; partial effects are disclosed
through the operation checkpoint. No caller error is proof that nothing was written.





## Acceptance, RED and PROVE

1. Fresh task specification selects exact product context but confirms its own manifest before loading profiles.
2. Planning produces test-first packets with stable references; incremental starts/checks/finishes one authorized packet, updates state and stops.
3. Standalone legacy specs, separate design invocation, correct-test discipline and optional external code/security reviews retain their existing behavior.

| Case | Discriminating observation | Explicit excluded outcome |
| --- | --- | --- |
| Q34: Task workflow selected input integration | Product task receives exact pins; own manifest controls profile reads; legacy unchanged. | No entire product history, automatic design invocation or product rewrite for local defect. |
| Q35: Test discipline and completion gates | Correct tests stay intact; failed/unavailable required checks leave packet incomplete. | No review/commit prerequisite, green-by-weakening or unrestricted replanning. |

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
3. **PROVE:** apply each relevant single-behavior mutation from Q34, Q35
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
rtk proxy node --test tests/product-task-integration.test.mjs
rtk proxy npm run lint
rtk proxy npm test
rtk proxy npm run generate:check
rtk proxy npm run validate:foundation
rtk proxy git diff --check
```

Expected final result: exit 0 and every focused assertion passes; no
failed/unavailable required test. Full npm test is deterministic only.
Native three-OS qualification is aggregated in P17; a local focused pass does not claim other-platform evidence. Do not add a new platform exclusion to obtain a pass.

## Implementation evidence

- **RED:** the new focused suite initially passed 1/6 and failed the five P16
  integration assertions because task workflows did not yet route through the
  shared product protocol and the protocol was absent from generated bundles.
- **GREEN:** after adding conditional protocol routing and generated asset
  mapping, `tests/product-task-integration.test.mjs` passed 6/6. The related
  specification/planning/incremental regression set passed 46/46.
- **PROVE Q34:** reversing the rule that a task must not inherit a product
  profile made only the specification context/profile assertion fail (5/6);
  restoring the rule returned the focused suite to 6/6.
- **PROVE Q35:** allowing `task_packet_complete` after a failed required check
  made only the implementation lifecycle assertion fail (5/6); restoring the
  completion gate returned the focused suite to 6/6.
- Final verification: build, lint, generated-distribution check, foundation
  validation, and `git diff --check` passed. Full `npm test` passed 384/384.
- Completion MCP recheck passed with reviewed coverage and no issues: source
  `f1d2fda79601d9775a4351ea4db7deeb5a9e28f27c24e608aec28eb8ad38cc40`,
  specification `acd494dbae06e68a4e87767ef8f71ca65075b49a99b467d98ae3f50b98a2a021`,
  review `501c5408-3180-4edd-82c0-f6eb0fb3ff3a`.
- Cross-platform runtime qualification remains P17 scope. Independent review,
  commit, installation, publication, and P17 execution were not performed.

### Review remediation

- Product-linked specification, planning, and implementation now exhaust the
  bounded context inventory and read every required element or decision portion
  before acting. Implementation selects purpose `implementation` before the
  read-only input check and packet start.
- Product content is explicitly untrusted data: it cannot authorize commands,
  network access, privilege changes, scope expansion, or instruction override.
- Every task-skill bundle carries `product-protocol.sha256`; the existing
  engineering verifier rejects missing, malformed, divergent, or tampered
  protocol copies without exposing their content.
- The executable qualification uses the real context and task APIs for all
  three roles, checks bounded continuations and exact reads, preserves product
  state, and proves injection-like text remains data. Focused remediation tests
  passed 23/23. Build, lint, generation check, foundation validation, full
  `npm test`, and `git diff --check` passed.

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
