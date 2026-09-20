# P06: Scoped product questions, answers and evidence

Status: Complete. Implemented and verified in the explicitly authorized P06 invocation.
Requirements: PWF-004, PWF-006, PWF-010, PWF-017, PWF-021, PWF-029, PWF-030.

## Outcome and boundaries

Missing, dismissed, conditional and ambiguous answers remain unresolved; exact returned native text and source are preserved.

Dependencies: [P05](./05_multifile_markdown_registry.md).
Require their actual passing evidence in [todo.md](./todo.md) and
[handoff.md](./handoff.md), not their existence or a commit. No clean worktree
or existing commit is required, but Git status and scoped staged/unstaged/untracked
evidence must be available. Preserve all unrelated changes.

Allowed ownership:
- `packages/engineer-agent-workflow-mcp/src/product/interview.ts`
- `packages/engineer-agent-workflow-mcp/src/product/tools.ts`
- `packages/engineer-agent-workflow-mcp/src/product/bindings.ts` and
  `packages/engineer-agent-workflow-mcp/src/product/operations.ts`, limited to
  the explicitly approved capability and operation scenario allowlists.
- New focused test: `packages/engineer-agent-workflow-mcp/test/product-interview.test.mjs`; related isolated helpers/fixtures under its test directory.
- Existing `product-bindings.test.mjs` and `packed-artifact.test.mjs`, limited to
  the explicitly approved capability and package inventory updates.
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
- Fetch exactly `PWF-004`, `PWF-006`, `PWF-010`, `PWF-017`, `PWF-021`, `PWF-029`, `PWF-030` with requirement_get using
  the pinned specification_version; consume every continuation.
- Contract: [mcp.md](../contracts/mcp.md), sections `Interview and evidence`, `Fingerprints and readiness`.
- Schema: [data.schema.json](../contracts/schemas/data.schema.json), `#/definitions/Scope`, `#/definitions/Decision`, `#/definitions/SourcePin`.
- Quality input: [scenarios.yaml](../quality/scenarios.yaml), Q14, Q15, Q16.
- Recheck bounded baseline entrypoints:
  `src/state.ts:79,295`, `src/server.ts:15,47,80`,
  `src/requirements.ts:22` under the MCP package and
  `scripts/lib/distribution.mjs:37,61,68` for any generated assets.
  Existing functions are evidence to inspect, not claims that proposed product
  symbols already exist. Do not reread the full decision journal or all profiles.

## Ownership and lifecycle

Boundary: `interview.ts`. Proposed entrypoints: `proposeProductScope, prepareProductQuestion, recordProductAnswer, recordProductEvidence`.
Typed inputs and exact result fields are owned by the named MCP/schema sections;
this packet must not invent a competing schema or generic edit endpoint.
Dependencies point from the tool adapter into domain functions and then guarded
storage, never from storage into host skills. Only this boundary's state is mutable.
Close owned descriptors/processes and release active-operation resources on success
or failure; preserve recoverable crash state rather than erase it.
Invalid/foreign/stale inputs fail before new effects; partial effects are disclosed
through the operation checkpoint. No caller error is proof that nothing was written.





## Acceptance, RED and PROVE

1. Missing, dismissed, conditional and ambiguous answers remain unresolved; exact returned native text and source are preserved.
2. A partial amendment retains all unchanged predecessor obligations and references.
3. Artifact-local decisions and read-only observation do not invalidate unrelated selected inputs; user answer authenticity is never claimed.

| Case | Discriminating observation | Explicit excluded outcome |
| --- | --- | --- |
| Q14: Scope and unanswered interviews | Only exact explicit answers confirm; resume targets unresolved question; current history remains intact. | No inactive profile fetch before/after confirmation or treating a default as answer. |
| Q15: Partial source amendments | Unchanged obligations remain; unrelated stage history does not stale selected consumer pins. | No all-history fingerprint for every consumer or loss of predecessor conditions. |
| Q16: Non-sensitive provenance and injection | Protected data is rejected/redacted at documented boundaries; text remains non-executable data. | No command/network action, raw stack/environment leakage or authenticated-consent claim. |

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
3. **PROVE:** apply each relevant single-behavior mutation from Q14, Q15, Q16
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
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/product-interview.test.mjs
rtk proxy npm run lint
rtk proxy npm test
```

Expected final result: exit 0 and every focused assertion passes; no
failed/unavailable required test. Full npm test is deterministic only.
Native three-OS qualification is aggregated in P17; a local focused pass does not claim other-platform evidence. Do not add a new platform exclusion to obtain a pass.

## Implementation evidence

- Added eleven strict scenario tools for artifact draft creation, read-only interview resumption, scope proposal
  and confirmation, question preparation and outcomes, and instruction,
  observation, assumption, and research evidence.
- Candidate mutations use version-bound contexts, retained operation intents,
  exact replay, cooperative product locking, immutable decision revisions, and
  atomic candidate updates. No-answer outcomes remain unresolved and cannot
  confirm scope.
- Question amendments retain same-ID revision ancestry. Candidate loading
  validates current decision digests and the complete bounded predecessor chain;
  missing historical evidence blocks later writes.
- Sensitive credential-shaped inputs, including credential-bearing URIs, are rejected with bounded non-reflecting
  errors. Stored document and research text remains data and cannot initiate a
  command, network request, privilege change, or authenticated-consent claim.
- Focused RED first failed because the module and tool registrations were
  absent. A strengthened Q15 assertion then produced the discriminating
  `Missing expected rejection` when predecessor evidence was removed.
- Review remediation added strict shared `SourcePin` validation, research question-owner validation,
  and explicit `SOURCE_LIMIT` outcomes instead of truncating reconsideration evidence.
- Focused GREEN passed 8/8 after discriminating review-remediation RED failures for missing recovery,
  inconsistent pins, invalid research ownership, silent truncation, and credential-bearing URIs.
- MCP package lint passed and its suite passed 142/142. Repository lint passed;
  root tests passed 329/329; generation check passed for 13 skills; foundation
  validation passed 13/13; `git diff --check` passed.
- Native macOS and Windows qualification remains assigned to P17. No P07,
  independent review, commit, installation, publication, remote CI, or global
  configuration work was performed.

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
