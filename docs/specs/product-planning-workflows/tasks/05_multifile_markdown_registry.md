# P05: Addressed multi-file Markdown authoring

Status: Complete. Implemented and verified in the explicitly authorized P05 invocation.
Requirements: PWF-013, PWF-014, PWF-015, PWF-017, PWF-026, PWF-028.

## Outcome and boundaries

Lite starts with an index plus one substantive member for PRD and Technical Design; later subjects add no empty templates.

Dependencies: [P03](./03_operations_concurrency_and_recovery.md), [P04](./04_project_and_workspace_binding.md).
Require their actual passing evidence in [todo.md](./todo.md) and
[handoff.md](./handoff.md), not their existence or a commit. No clean worktree
or existing commit is required, but Git status and scoped staged/unstaged/untracked
evidence must be available. Preserve all unrelated changes.

Allowed ownership:
- `packages/engineer-agent-workflow-mcp/src/product/documents.ts`
- `packages/engineer-agent-workflow-mcp/src/product/tools.ts`
- New focused test: `packages/engineer-agent-workflow-mcp/test/product-documents.test.mjs`; related isolated helpers/fixtures under its test directory.
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
- Fetch exactly `PWF-013`, `PWF-014`, `PWF-015`, `PWF-017`, `PWF-026`, `PWF-028` with requirement_get using
  the pinned specification_version; consume every continuation.
- Contract: [mcp.md](../contracts/mcp.md), sections `Markdown and semantic authoring`, `Document organization`.
- Schema: [data.schema.json](../contracts/schemas/data.schema.json), `#/definitions/Registry`, `#/definitions/Document`, `#/definitions/Ref`, `#/definitions/Candidate`.
- Quality input: [scenarios.yaml](../quality/scenarios.yaml), Q11, Q12, Q13.
- Recheck bounded baseline entrypoints:
  `src/state.ts:79,295`, `src/server.ts:15,47,80`,
  `src/requirements.ts:22` under the MCP package and
  `scripts/lib/distribution.mjs:37,61,68` for any generated assets.
  Existing functions are evidence to inspect, not claims that proposed product
  symbols already exist. Do not reread the full decision journal or all profiles.

## Ownership and lifecycle

Boundary: `documents.ts`. Proposed entrypoints: `parseProductDocument, resolveElement, createSubject, moveElements, reconcileDocument`.
Typed inputs and exact result fields are owned by the named MCP/schema sections;
this packet must not invent a competing schema or generic edit endpoint.
Dependencies point from the tool adapter into domain functions and then guarded
storage, never from storage into host skills. Only this boundary's state is mutable.
Close owned descriptors/processes and release active-operation resources on success
or failure; preserve recoverable crash state rather than erase it.
Invalid/foreign/stale inputs fail before new effects; partial effects are disclosed
through the operation checkpoint. No caller error is proof that nothing was written.





## Acceptance, RED and PROVE

1. Lite starts with an index plus one substantive member for PRD and Technical Design; later subjects add no empty templates.
2. Move/split and rename preserve semantic IDs, unrelated byte spans and reverse consumers; duplicate IDs anywhere in the artifact reject writes.
3. Direct draft edits retain their parent evidence; unknown provenance or malformed membership prevents readiness.

| Case | Discriminating observation | Explicit excluded outcome |
| --- | --- | --- |
| Q11: Lite and large document sets | Each set has index plus semantic member; IDs, refs and unrelated spans survive moves. | No empty template explosion, Markdown in YAML mirror or navigation-owned requirements. |
| Q12: Ambiguous members and identifiers | Explicit invalid/ambiguous result; all original bytes retained. | No filename guessing, partial members treated ready or stale offset patch. |
| Q13: Direct edit provenance | Supported edit keeps original pinned text; unknown/changed provenance blocks adoption. | No overwriting user text or upgrading raw filesystem changes to consent. |

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
3. **PROVE:** apply each relevant single-behavior mutation from Q11, Q12, Q13
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
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/product-documents.test.mjs
rtk proxy npm run lint
rtk proxy npm test
```

Expected final result: exit 0 and every focused assertion passes; no
failed/unavailable required test. Full npm test is deterministic only.
Native three-OS qualification is aggregated in P17; a local focused pass does not claim other-platform evidence. Do not add a new platform exclusion to obtain a pass.

## Implementation evidence

- Added strict semantic multi-file Markdown parsing and guarded authoring in
  `packages/engineer-agent-workflow-mcp/src/product/documents.ts`, exposed as
  seven scenario-specific product document tools.
- The implementation rejects duplicate and unregistered identities, preserves
  semantic IDs and unrelated bytes during moves, regenerates navigation after
  moves and renames, and accepts direct edits only for the exact observed
  digest and a candidate-owned decision reference.
- Focused GREEN passed 4/4. Q11 PROVE detected disabled navigation
  regeneration. Q12 PROVE detected removed artifact-wide duplicate-ID
  validation. Q13 PROVE detected relaxed decision provenance with
  `Missing expected rejection`. Every mutation was restored; focused tests
  passed again 4/4.
- P04 focused regression passed 7/7. The full MCP suite first rejected the two
  intentional compiled document files as unexpected package inventory; the
  exact inventory fixture was updated and the suite passed 131/131.
- Package and root lint passed. Root `npm test` passed 318/318.
  `generate:check`, `validate:foundation`, and `git diff --check` passed.
- Final `specification_check_state` returned `pass` / `reviewed`, no issues,
  with all pinned versions unchanged.
- Native macOS and Windows qualification remains assigned to P17. No review,
  commit, installation, publication, global configuration change, or P06 work
  was performed.

## Post-review remediation evidence

The P05 code and security review identified five defects. The remediation:

- derives new document identities from the operation identity and current
  candidate source version, and rejects duplicate document IDs and normalized
  portable paths across the registry;
- accepts direct edits only when semantic content actually changed, reads the
  comparison baseline from the immutable object store, and updates provenance
  and `changed_refs` only for changed semantic elements;
- constrains subjects and titles to bounded single-line plain text and escapes
  Markdown link labels;
- validates the complete prospective registry and Markdown outputs before any
  immutable object is saved, then verifies every saved digest inside the product
  mutation;
- bounds directory inspection to 32 levels and 4,096 entries, and revalidates
  every observed child path and file type while walking the tree.

The focused regression suite now covers rename followed by subject recreation,
safe Markdown labels, rejection of multiline titles without object writes,
bounded traversal, rejection of unchanged direct edits, and exact changed-ref
reporting. Its pre-fix run produced four discriminating failures; after the
remediation it passed 7/7. The complete MCP package suite passed 134/134 and the
package lint passed. Final repository-wide verification and the final MCP
specification-state check are recorded in the current handoff.

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
