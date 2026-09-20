# P02: Immutable Source Objects And Coherent Generations

Status: Ready. Authorization: a separate explicit incremental invocation is required.

Requirements: PWF-011, PWF-013, PWF-014, PWF-015, PWF-020, PWF-023,
PWF-026, PWF-030.

## Outcome

Provide the storage boundary for content-addressed product source objects and
immutable generations. Saving identical bytes reuses one object. Saving changed
bytes creates a new object without changing previous objects. Loading a generation
validates its complete referenced inventory and fails closed when required evidence
is missing or corrupt.

P01 is complete. Completion evidence is the checked P01 item in `todo.md` and the
current handoff, not a commit.

## Allowed ownership

Production:

- `packages/engineer-agent-workflow-mcp/src/product/storage.ts`

Tests:

- Create `packages/engineer-agent-workflow-mcp/test/product-storage.test.mjs`.
- A narrowly scoped immutable fixture may be added under
  `packages/engineer-agent-workflow-mcp/test-support/` only if at least two P02
  tests share it. Function-scoped product roots and mutable scenario state must
  remain isolated.

Planning state:

- This packet file.
- `todo.md` and current-only `handoff.md` after implementation verification.

Do not modify other production modules, the Approved specification, workflow YAML,
schemas, generated bundles, manifests, installed clients, or another packet. Do not
commit, publish, install, invoke review, or start P03.

## Pinned inputs

- MCP source_version:
  `e43d887518ac10c20ec4b95120272dcfe102595a9cbf42cde40d898b6c4dece3`
- MCP specification_version:
  `48b53b4e9cf8f6d447f2fd3a2d2ba02f84cbffc24b50056b1b0478ce6d562868`
- MCP review_ref: `db2360f3-2f7a-4b6e-92ea-930ebee0fcad`
- Exact requirements: PWF-011, PWF-013, PWF-014, PWF-015, PWF-020,
  PWF-023, PWF-026, PWF-030 through `requirement_get` using the pinned
  specification version.
- `../contracts/mcp.md`, sections `Identities and source pins`, `Storage layout
  and publication`, `Errors and budgets`.
- `../contracts/schemas/data.schema.json`, definitions `Generation`, `Registry`,
  `Document`, `RecordObject`, `SourcePin`, `Decision`, `DecisionRef`, and `Digest`.
- `../quality/scenarios.yaml`, Q04 and Q05.
- Existing boundary evidence:
  `packages/engineer-agent-workflow-mcp/src/product/config.ts:211-257` and
  `packages/engineer-agent-workflow-mcp/src/product/schemas.ts:102-127`.
- Architecture index: `plan.md:104-108` (U01 and U02).

Before implementation and before completion, open `product-planning-workflows`
through the workflow MCP and require Approved, `status: pass`,
`coverage_status: reviewed`, and the pinned source version above.

## Storage boundary

`storage.ts` owns filesystem persistence and verification for immutable product
objects and generations. It depends on P01 path and schema validation. Domain,
tool, server, operation, and skill layers may depend on storage later; storage must
not depend on those layers.

The implementation should expose small typed functions equivalent to these
responsibilities; names may follow repository conventions if their ownership and
tests remain exact:

- `saveObject`: validate the product-relative target, hash exact bytes, create the
  content-addressed Markdown, structured-record, or decision-revision object, and
  reuse an existing byte-identical object.
- `readObject`: open the exact object without following links, enforce the source
  limit, read complete bytes, and verify the requested digest before returning.
- `saveGeneration`: validate a `Generation`, verify its complete referenced
  registry, documents, decision revisions, and source pins, then persist immutable
  generation metadata by digest.
- `loadGeneration`: read and validate exact generation metadata and all required
  referenced evidence without consulting drafts or a newer generation.

Use the published storage layout under the selected shared product root:

- `products/<product-id>/objects/<sha256>.md` for exact semantic Markdown bytes;
- `products/<product-id>/objects/<sha256>.yaml` for exact structured record bytes;
- `products/<product-id>/decisions/<artifact>/<decision-id>/<revision>.yaml` for
  one exact decision revision;
- `products/<product-id>/generations/<sha256>.yaml` for immutable generation
  metadata.

The object digest is computed from the exact saved bytes. Structured generation
and record serialization must be deterministic and schema-valid. Do not create a
second semantic-text authority, normalize user Markdown, copy whole journals into
a generation, scan the entire store to resolve a reference, or update
`head.yaml` in this packet.

## Invariants and failures

- Existing immutable bytes are never overwritten. If a target digest already
  exists, verify the existing regular file and reuse it only when all bytes match.
- A generation becomes observable only after every object it references has been
  saved and verified.
- The registry is the one document-membership authority. Generation metadata
  references its record object and current decision heads; it does not duplicate
  Markdown bodies or full decision history.
- Loading an old generation never substitutes a current draft or latest object.
- Missing required objects fail with `MISSING_EVIDENCE`. Digest or concurrent-byte
  mismatches fail with `SOURCE_CHANGED`. Invalid schema or unsafe paths retain the
  existing bounded `INVALID_STATE`, `UNSAFE_PATH`, or source-limit behavior.
- Errors contain stable codes and bounded safe metadata, never source bodies,
  absolute private paths, stack traces, environment values, or credentials.
- Enforce the existing 16 MiB per-source limit before unbounded allocation.
- Opened file handles close on success and every failure path.
- Use cross-platform Node path and filesystem APIs. Do not assume POSIX separators,
  rename populated directories, require cross-device atomicity, or add a platform
  exclusion. P17 owns native Linux/macOS/Windows qualification.

## Explicit non-goals and later ownership

- P03 owns locks, mutable head publication, operation checkpoints, exact replay,
  concurrency recovery, and crash reconciliation.
- P04 owns product creation and workspace binding.
- P05 owns semantic Markdown parsing and registry authoring.
- P10 owns bounded task context selection.
- P11 and P13 own review and candidate activation.
- P17 owns native three-platform end-to-end evidence.
- P18 owns durable developer documentation. P02 adds no separate documentation
  packet because the already planned final documentation packet covers the shared
  storage protocol after its complete behavior exists.

## Test-first acceptance

Create `product-storage.test.mjs` before `storage.ts` and use only synthetic data in
dedicated function-scoped temporary product roots outside real projects and homes.

### Q04: shared versions and reused objects

1. Save two distinct document bodies and one structured registry.
2. Save a generation that references both documents and repeated decision
   revisions.
3. Change only one document twice and save successor generations.
4. Assert one immutable object exists per distinct exact body, unchanged bodies
   reuse their digest, old generations still return their original bytes, and no
   task-local journal or whole product copy was created.
5. Reopen through a fresh storage call path and repeat the old-generation read.

### Q05: missing or drifted historical evidence

1. Keep one ready generation and create different draft bytes without changing it.
2. Assert loading the ready generation returns only pinned ready bytes.
3. In isolated subcases, remove one pinned object and corrupt one retained object.
4. Assert `MISSING_EVIDENCE` for the missing object and `SOURCE_CHANGED` for the
   digest mismatch. Assert neither case falls back to draft/latest bytes or reports
   a complete generation.
5. Repeat after re-instantiating the storage call path to prove no process-local
   cache masks the failure.

## RED, GREEN, and PROVE

1. RED: write the Q04 and Q05 tests first and run the focused command. A missing
   module/import is only preliminary RED; retain the intended behavioral assertions.
2. GREEN: implement the smallest `storage.ts` boundary until every correct focused
   assertion passes. Do not weaken the tests.
3. PROVE Q04: temporarily make byte-identical saves create another object or make
   an old generation resolve the latest body; observe the corresponding inventory
   or historical-byte assertion fail, then restore.
4. PROVE Q05: temporarily allow fallback to latest bytes for one missing/corrupt
   pin; observe the exact error assertion fail, then restore.
5. Record the mutated behavior, failing assertion, restoration, and final pass in
   the handoff. Never use a real product root for PROVE.

## Verification commands

Working directory: repository root. Use the supported Node runtime and the existing
installed dependencies.

```sh
rtk proxy npm run build
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/product-storage.test.mjs
rtk proxy npm run lint
rtk proxy npm test
rtk proxy npm run generate:check
rtk proxy npm run validate:foundation
rtk git diff --check
```

Expected result: every command exits 0, Q04 and Q05 assertions pass, and no required
check is unavailable. Inspect all scoped staged, unstaged, and untracked files. A
local pass does not claim native macOS or Windows qualification.

## Completion and rollback

After all required checks pass, recheck the pinned specification through MCP, mark
only P02 in `todo.md`, replace `handoff.md` with actual paths and RED/GREEN/PROVE
evidence, identify P03 as next eligible, and stop.

If a correct check fails or the pinned inputs drift, leave P02 incomplete and record
the exact blocker. Rollback during this packet removes only newly created synthetic
test data or restores the agent's deliberate PROVE mutation. Never delete retained
product versions, reset unrelated worktree changes, rewrite user data, or publish a
mutable head.

MANUAL GATE: commits, installation, publication, external CI, and independent code
or security review require separate explicit authorization and are not completion
gates.
