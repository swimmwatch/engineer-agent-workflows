# P01: Strict product schemas and safe root resolution

Status: Complete. Implemented and verified in the explicitly authorized P01 invocation.
Requirements: PWF-003, PWF-011, PWF-015, PWF-018, PWF-028, PWF-030.

## Outcome and boundaries

Reject relative overrides, unknown fields, aliases, invalid references and path escapes before creating anything.

Dependencies: None.
Require their actual passing evidence in [todo.md](./todo.md) and
[handoff.md](./handoff.md), not their existence or a commit. No clean worktree
or existing commit is required, but Git status and scoped staged/unstaged/untracked
evidence must be available. Preserve all unrelated changes.

Allowed ownership:
- `packages/engineer-agent-workflow-mcp/src/product/config.ts`
- `packages/engineer-agent-workflow-mcp/src/product/schemas.ts`
- `shared/schemas/product.schema.json`
- `packages/engineer-agent-workflow-mcp/scripts/build-schemas.mjs`
- New focused test: `packages/engineer-agent-workflow-mcp/test/product-foundation.test.mjs`; related isolated helpers/fixtures under its test directory.
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
- Fetch exactly `PWF-003`, `PWF-011`, `PWF-015`, `PWF-018`, `PWF-028`, `PWF-030` with requirement_get using
  the pinned specification_version; consume every continuation.
- Contract: [mcp.md](../contracts/mcp.md), sections `Configuration`, `Types and wire rules`.
- Schema: [data.schema.json](../contracts/schemas/data.schema.json), `#/definitions/Store`, `#/definitions/Ref`, `#/definitions/SourcePin`, `#/definitions/Generation`, `#/definitions/Candidate`, `#/definitions/Operation`, `#/definitions/WorkspaceBinding`, `#/definitions/TaskBinding`, `#/definitions/Decision`, `#/definitions/Review`, `#/definitions/ContextSelection`.
- Quality input: [scenarios.yaml](../quality/scenarios.yaml), Q01, Q02, Q03.
- Recheck bounded baseline entrypoints:
  `src/state.ts:79,295`, `src/server.ts:15,47,80`,
  `src/requirements.ts:22` under the MCP package and
  `scripts/lib/distribution.mjs:37,61,68` for any generated assets.
  Existing functions are evidence to inspect, not claims that proposed product
  symbols already exist. Do not reread the full decision journal or all profiles.

## Ownership and lifecycle

Boundary: `config.ts, schemas.ts`. Proposed entrypoints: `resolveProductRoot, validateProductRecord, validateProductPath`.
Typed inputs and exact result fields are owned by the named MCP/schema sections;
this packet must not invent a competing schema or generic edit endpoint.
Dependencies point from the tool adapter into domain functions and then guarded
storage, never from storage into host skills. Only this boundary's state is mutable.
Close owned descriptors/processes and release active-operation resources on success
or failure; preserve recoverable crash state rather than erase it.
Invalid/foreign/stale inputs fail before new effects; partial effects are disclosed
through the operation checkpoint. No caller error is proof that nothing was written.

Promote the planned schema to root shared/schemas/product.schema.json as the runtime source; the planning file remains a frozen reviewed baseline, not a separately maintained runtime authority. Package it through the existing schema builder. Reuse pinned dependencies; add none. Include Head, Lock, ElementMetadata, TaskId and Success_* definitions in validation; do not create a second handwritten Zod authority for new product inputs/outputs.




## Acceptance, RED and PROVE

1. Reject relative overrides, unknown fields, aliases, invalid references and path escapes before creating anything.
2. Resolve the agreed OS defaults lazily; old specification tools do not access or create product storage.
3. Validate every positive state fixture and reject its discriminating invalid variants.

| Case | Discriminating observation | Explicit excluded outcome |
| --- | --- | --- |
| Q01: Root defaults and legacy isolation | Default/override resolves correctly; only initialize creates the dedicated store. | No startup argument support, implicit root creation, fallback after invalid override or legacy file change. |
| Q02: Cross-platform guarded paths | Safe ordinary paths work; rejected calls preserve fixture and unrelated-file digests. | No POSIX-only flag equivalence or elevated fallback. |
| Q03: Strict contract records | Valid records parse; structural/semantic invalid records fail before writes. | No generic YAML, JSON Patch, arbitrary path or unreturnable mutation. |

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
3. **PROVE:** apply each relevant single-behavior mutation from Q01, Q02, Q03
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
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/product-foundation.test.mjs
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

## Completion evidence

- RED: the initial focused run failed because the product modules were absent;
  discriminating runs then failed on unsafe configuration paths, strict record
  validation, a symlinked root ancestor, and incorrect runtime-schema packaging.
- GREEN: `product-foundation.test.mjs` passes all five focused tests covering Q01-Q03.
- PROVE: temporary mutations independently demonstrated that Q01 detects eager
  root creation, Q02 detects traversal acceptance, and Q03 detects weakened
  unknown-field validation; every mutation was restored before the final run.
- Required verification passed: build, focused tests, lint, packed-artifact test,
  completeness-protocol test, full `npm test`, generation check, foundation
  validation, and `git diff --check`.
- The full suite could not spawn stdio child processes inside the process sandbox;
  the same required suite passed outside that process restriction. Native execution
  on all three operating systems remains intentionally assigned to P17.

## Post-review remediation

The explicitly requested code-review fixes remain within P01 ownership:

- RED: three new regressions failed against the reviewed implementation: a
  symlink alias hid a product-root/workspace overlap, invalid Unicode scalar
  values passed path and record validation, and Win32-ambiguous names lacked a
  discriminating assertion.
- GREEN: canonical home and workspace boundaries are resolved before the final
  overlap check; invalid Unicode is rejected before path normalization and Ajv;
  portable path syntax rejects control characters, Win32 device names, and
  trailing spaces or periods. A safe root outside a symlinked workspace remains
  accepted.
- PROVE: disabling only the Win32 device-name guard made the dedicated `CON`
  assertion fail; the guard was restored and the focused suite passed 9/9.
- Verification passed after restoration: build, focused tests, lint, full
  `npm test` outside the process sandbox, generation check, foundation
  validation, and final whitespace checks. Native three-OS execution remains P17.
