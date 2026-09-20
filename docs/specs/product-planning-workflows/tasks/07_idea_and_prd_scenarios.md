# P07: Idea and PRD semantic authoring scenarios

Status: Complete. Authorized and implemented in the P07 incremental invocation.
Requirements: PWF-002, PWF-006, PWF-007, PWF-010, PWF-013, PWF-017.

## Outcome and boundaries

A known concise idea preserves actors, alternatives, value, evidence and unresolved choices without a new fabricated interview.

Dependencies: [P06](./06_product_interview_and_provenance.md).
Require their actual passing evidence in [todo.md](./todo.md) and
[handoff.md](./handoff.md), not their existence or a commit. No clean worktree
or existing commit is required, but Git status and scoped staged/unstaged/untracked
evidence must be available. Preserve all unrelated changes.

Allowed ownership:
- `packages/engineer-agent-workflow-mcp/src/product/definition.ts`
- `packages/engineer-agent-workflow-mcp/src/product/tools.ts`
- New focused test: `packages/engineer-agent-workflow-mcp/test/product-definition.test.mjs`; related isolated helpers/fixtures under its test directory.
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
- Fetch exactly `PWF-002`, `PWF-006`, `PWF-007`, `PWF-010`, `PWF-013`, `PWF-017` with requirement_get using
  the pinned specification_version; consume every continuation.
- Contract: [mcp.md](../contracts/mcp.md), sections `Idea and PRD scenarios`, `Markdown and semantic authoring`.
- Schema: [data.schema.json](../contracts/schemas/data.schema.json), `#/definitions/IdeaProblem`, `#/definitions/IdeaDirection`, `#/definitions/PrdActor`, `#/definitions/PrdGoal`, `#/definitions/PrdCapability`, `#/definitions/PrdUseCase`, `#/definitions/PrdRule`, `#/definitions/PrdConstraint`, `#/definitions/ResearchEvidence`.
- Quality input: [scenarios.yaml](../quality/scenarios.yaml), Q17, Q18.
- Recheck bounded baseline entrypoints:
  `src/state.ts:79,295`, `src/server.ts:15,47,80`,
  `src/requirements.ts:22` under the MCP package and
  `scripts/lib/distribution.mjs:37,61,68` for any generated assets.
  Existing functions are evidence to inspect, not claims that proposed product
  symbols already exist. Do not reread the full decision journal or all profiles.

## Ownership and lifecycle

Boundary: `definition.ts`. Proposed entrypoints: `defineIdeaProblem, compareIdeaDirection, chooseIdeaDirection, definePrdElement`.
Typed inputs and exact result fields are owned by the named MCP/schema sections;
this packet must not invent a competing schema or generic edit endpoint.
Dependencies point from the tool adapter into domain functions and then guarded
storage, never from storage into host skills. Only this boundary's state is mutable.
Close owned descriptors/processes and release active-operation resources on success
or failure; preserve recoverable crash state rather than erase it.
Invalid/foreign/stale inputs fail before new effects; partial effects are disclosed
through the operation checkpoint. No caller error is proof that nothing was written.





## Acceptance, RED and PROVE

1. A known concise idea preserves actors, alternatives, value, evidence and unresolved choices without a new fabricated interview.
2. PRD actor, metric, use-case, rule and constraint tools write exact semantic blocks and typed links rather than YAML payloads.
3. Missing ready Idea blocks PRD readiness; unknown baselines stay unknown and research conclusions cannot launch a spike.

| Case | Discriminating observation | Explicit excluded outcome |
| --- | --- | --- |
| Q17: Durable known idea | Exact chosen result is reusable without chat or redundant questioning. | No fabricated stack, backlog, ready PRD or automatic workflow invocation. |
| Q18: PRD meaning and research boundary | Addressed goals, rules and cases survive; unknown values stay null; analytical research has sources. | No invented targets, competing roadmap or pre-readiness executable spike. |

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
3. **PROVE:** apply each relevant single-behavior mutation from Q17, Q18
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
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/product-definition.test.mjs
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

- Added ten strict MCP tools backed by `definition.ts`: three Idea scenarios
  and seven PRD scenarios. Each accepts the published typed record rather than
  YAML, arbitrary Markdown, JSON Patch, or field paths.
- Semantic meaning is rendered into server-addressed Markdown blocks. The
  registry owns element type, provenance, applicability, and typed relations;
  unrelated registered source bytes remain unchanged.
- Direction selection requires a current answered decision and its exact
  prepared-question predecessor. It creates no interview question.
- PRD authoring requires a ready Idea plus exact non-empty Idea source pins
  from the selected generation lineage. Unknown goal baseline and target
  values render as `Unknown.` and are never converted to zero.
- Exact retries use retained operation intent and return the current candidate
  context. Stale, foreign, missing, malformed, direct-edited, sensitive, or
  broken-reference inputs fail before the semantic mutation runs.
- Preliminary RED: the focused test failed with `ERR_MODULE_NOT_FOUND` before
  `definition.ts` existed. Q17 PROVE removed the `workarounds` renderer and the
  exact preservation assertion failed; a fabricated decision write also
  failed the no-new-interview snapshot. Q18 PROVE rendered `null` as `0`,
  bypassed ready-Idea validation, and removed actor relations; the respective
  unknown, prerequisite, and typed-link assertions failed. All mutations were
  restored and the initial implementation digest matched the pre-PROVE digest.
- Verification after review remediation: focused `product-definition.test.mjs`
  7/7; MCP package 149/149; root `npm test` 336/336; build, lint, foundation
  validation 13/13,
  generated distribution check 13 skills, and `git diff --check` all passed.
- Review remediation binds direction answers to the selected Idea element ID,
  rejects unrelated answer categories, canonicalizes replay identities, preserves
  CRLF field rendering, rejects common client/private-secret assignments, and
  marks every create-or-update P07 tool potentially destructive.
- Native macOS and Windows qualification remains owned by P17 and is not
  claimed by this Linux implementation pass.
