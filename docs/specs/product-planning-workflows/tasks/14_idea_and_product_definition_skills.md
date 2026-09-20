# P14: Durable Idea Refine and Product Definition skills

Status: Complete. Authorization: implemented by explicit incremental invocation.
Requirements: PWF-001, PWF-003, PWF-004, PWF-006, PWF-007, PWF-010, PWF-019.

## Outcome and boundaries

Explicit-only host-isolated skills save through concrete tools, load no profiles before confirmation and only the selected profiles afterwards.

Dependencies: [P13](./13_amendments_and_safety_blocks.md).
Require their actual passing evidence in [todo.md](./todo.md) and
[handoff.md](./handoff.md), not their existence or a commit. No clean worktree
or existing commit is required, but Git status and scoped staged/unstaged/untracked
evidence must be available. Preserve all unrelated changes.

Allowed ownership:
- `skills/idea-refine/`
- `skills/product-definition/`
- `shared/references/product-workflow.md`
- `scripts/lib/distribution.mjs`
- `scripts/lib/catalog.mjs`
- `catalog/skills.json`
- `tests/catalog.test.mjs`
- New focused test: `tests/product-authoring-skills.test.mjs`; related isolated helpers/fixtures under its test directory.
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
- Fetch exactly `PWF-001`, `PWF-003`, `PWF-004`, `PWF-006`, `PWF-007`, `PWF-010`, `PWF-019` with requirement_get using
  the pinned specification_version; consume every continuation.
- Contract: [mcp.md](../contracts/mcp.md), sections `Skill routing and generation`.
- Schema: [data.schema.json](../contracts/schemas/data.schema.json), No complete schema read; use only scenario input/output definitions needed by the fixture..
- Quality input: [scenarios.yaml](../quality/scenarios.yaml), Q31, Q32.
- Recheck bounded baseline entrypoints:
  `src/state.ts:79,295`, `src/server.ts:15,47,80`,
  `src/requirements.ts:22` under the MCP package and
  `scripts/lib/distribution.mjs:37,61,68` for any generated assets.
  Existing functions are evidence to inspect, not claims that proposed product
  symbols already exist. Do not reread the full decision journal or all profiles.

## Ownership and lifecycle

Boundary: `shared templates and generation`. Proposed entrypoints: `idea-refine, product-definition, HOST_TEMPLATE_VALUES, MANUAL_SKILLS`.
Typed inputs and exact result fields are owned by the named MCP/schema sections;
this packet must not invent a competing schema or generic edit endpoint.
Dependencies point from the tool adapter into domain functions and then guarded
storage, never from storage into host skills. Only this boundary's state is mutable.
Close owned descriptors/processes and release active-operation resources on success
or failure; preserve recoverable crash state rather than erase it.
Invalid/foreign/stale inputs fail before new effects; partial effects are disclosed
through the operation checkpoint. No caller error is proof that nothing was written.





## Acceptance, RED and PROVE

1. Explicit-only host-isolated skills save through concrete tools, load no profiles before confirmation and only the selected profiles afterwards.
2. Standalone idea analysis still stops without an unauthorized saved product; product mode follows the durable ready chain.
3. Actual native answers/no-answers and concise known-idea examples route correctly; no preliminary research execution or unrequested downstream invocation.

| Case | Discriminating observation | Explicit excluded outcome |
| --- | --- | --- |
| Q31: Product skill explicit ownership | Saved draft/ready handoff only; source chain and host-native question routing observed. | No implementation/install/publication or next skill invocation. |
| Q32: Lazy profile reads and no-answer resume | No inactive or pre-confirmation profile reads; original explicit response reused. | No full reference import or guessed missing response. |

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
3. **PROVE:** apply each relevant single-behavior mutation from Q31, Q32
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
rtk proxy node --test tests/product-authoring-skills.test.mjs
rtk proxy npm run lint
rtk proxy npm test
rtk proxy npm run generate:check
rtk proxy npm run validate:foundation
rtk proxy git diff --check
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
