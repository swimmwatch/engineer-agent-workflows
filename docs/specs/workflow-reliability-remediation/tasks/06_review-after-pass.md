# I06 — Recheck changed product evidence after a successful review

Status: Complete; revision 4 checks and both independent reviews passed
Dependencies: I01, I05
Requirements: WR-004, WR-010, WR-013, WR-014
Quality scenarios: Q07, Q08

## Exact inputs and preflight

- Project: this repository; specification slug `workflow-reliability-remediation`.
- source_version: `345c12557dec017f7dba829464bd36932d866eea21f42c37a1f18b40e8e988b1`
- specification_version: `c1b8042c6009a8a5522f9d5e79a5f25cd10f3104aa980f6aa02886eef49f1efa`
- review_ref: `b4668494-2caa-41fe-ae73-d756aa6082e0`

Working directory for every command: repository root. Node.js >=22.20.0 and the
repository's existing pinned dependencies are prerequisites. Before work and
completion call specification_check_state with the pinned source_version; fetch
only WR-004, WR-010, WR-013, WR-014 through requirement_get using the pinned specification_version,
following every text/reference continuation. Read [C06](../contracts/mcp.md#c06--recheck-after-a-successful-product-review) and only the named entries in [quality/scenarios.yaml](../quality/scenarios.yaml).
These versioned contracts, not chat history, are the acceptance inputs.

Require a usable Git worktree with readable status and scoped tracked, staged and
untracked evidence. No clean tree or existing commit is required. Capture the
pre-edit state, preserve unrelated changes and reverify the source passages below.
Dependency readiness means recorded passing acceptance evidence for I01, I05, not merely a checked label or a commit.
Also update only this packet's execution evidence, todo.md and current handoff.md.

## Outcome, boundary and scope

Owner: Review eligibility, impact inventory and independent completion.
Allowed production ownership: `src/product/review.ts`, `src/product/review-blocks.ts`, `src/product/tools.ts`, root product schema, product review fixtures/tests. Standalone specification review files are excluded.
Paths beginning src/, test/ or test-support/ in this packet are relative to
packages/engineer-agent-workflow-mcp/; all other paths are repository-relative.

Evidence to reverify: `packages/engineer-agent-workflow-mcp/src/product/review.ts:1581` starts review; `:1606` gates existing followup on gaps; `:1906` owns final consistency. `packages/engineer-agent-workflow-mcp/src/product/review-blocks.ts:21` derives semantic blocks. Existing Q24/Q26 and recovery suites cover full/followup.

Implementation boundary: Add mode recheck with exact successful parent_ref, a source/inventory diff and server-derived impact. Reuse immutable inventory/attribution and existing full/followup ownership. New scope/original answers, uncertain impact or missing parent evidence rejects inheritance with a full-review next action. Add explicit product_review_scope_expand for independent reviewer-selected related blocks. This changes required membership, not verdict truth. Preserve every current atom once, reconcile deletions/moves and require fresh consistency/current-source verification. Retain full as explicit fallback; never repurpose gaps-followup.

Non-goals: unrelated worktree changes; changing approved behavior or scope;
global configuration, installation, commits, releases; hand-editing generated
bundles or MCP-owned workflow YAML; executing any next packet. New behavior is
not authorized until this packet is explicitly invoked.

## Test-first acceptance and proof

1. Create an isolated 119-block fixture: complete independent parent, edit one local Mermaid character, start recheck, prove exactly one affected block needs fresh judgment, 118 have valid inherited attribution, and fresh consistency is still required.
2. Test wider semantic impact and explicit expansion; new/deleted/moved/shared-evidence members cannot escape inventory coverage. Missing/corrupt history, changed scope/instructions, stale receipts and concurrent source change cannot complete as current.
3. Run old full/gaps-followup fixtures and replay/recovery/legacy storage tests unchanged. Count fresh versus inherited results from actual stored evidence, not response labels alone.
4. Write RED eligibility/impact/completion tests before code; isolate mutations that over-inherit a changed block or skip consistency and prove each assertion fails.

Tests to create in this packet: `packages/engineer-agent-workflow-mcp/test/product-review-recheck.test.mjs`.
Run the focused command after creating its discriminating checks and before
implementation; new filenames below are planned, not currently existing scripts.
Then implement, correct code until the valid assertions pass, and run required
PROVE. For an absence/structural claim use the stated actual snapshot/counter/trace,
not a copied implementation constant. A harness/import failure is not RED proof.

```sh
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node scripts/run-tests.mjs packages/engineer-agent-workflow-mcp/test/product-review.test.mjs packages/engineer-agent-workflow-mcp/test/product-review-blocks.test.mjs packages/engineer-agent-workflow-mcp/test/product-review-recovery.test.mjs packages/engineer-agent-workflow-mcp/test/product-review-efficiency.test.mjs packages/engineer-agent-workflow-mcp/test/product-review-recheck.test.mjs
```




Focused pass is necessary, not permission to skip a material shared-boundary test.
Broaden only for changed shared boundaries, new failures or unresolved evidence.
Record actual environment, commands, RED/GREEN/PROVE results and observed side
effects. A missing or failing required check keeps this packet incomplete.

## Compatibility, recovery and manual gates

New review mode is capability-gated and opt-in. Retain immutable parent history and old full/followup paths. On unsupported mode, use a fresh full review of intact current sources; never rewrite new records for an old runtime.

MANUAL GATE: Semantic decisions must come from an independent reviewer. Fixture judgments are simulation, not live review evidence; no real product is activated by tests.

No automatic user answer, reviewer verdict, installation or publication is allowed.
If a check fails, report the concrete next action and its established owner; when
the external owner is unknown, say so. Never assign a new duty to the user or
downgrade the required check merely to mark the packet complete.

## Completion and stop

Read back the changed state through owning public tools. Recheck the exact pinned
specification and review the scoped final diff, including staged/untracked files.
Mark this packet complete in [todo.md](todo.md) only after its required evidence
passes; replace [handoff.md](handoff.md) with the current result and next eligible
packet. Stop. Separate code/security review and commits are optional explicit
invocations, not completion or next-packet gates.



## Execution evidence — 2026-10-11

The authorized incremental-implementation run added opt-in `recheck` with an exact
successful parent, retained historical candidate/inventory basis, server-derived
impact, inherited immutable verdict attribution and fresh whole-artifact
consistency. Reads audit retained history and current sources without migration.
Legacy or incompatible history returns the actionable full-review fallback.
Related decision/relation references expand impact transitively; global changes
require the whole inventory. Changed original scope, instructions or answers
cannot inherit prior judgments. Extra reviewer evidence is checked for drift.

`product_review_scope_expand` accepts exact current block keys and a reason,
invalidates old consistency and moves selected inherited evidence back to pending.
Exact repeats do not write. Default legacy hash/read shapes and full/gaps-followup
behavior remain compatible; explicit representations retain source/verdict digest
domains. Capability discovery advertises the mode only in the explicit shape.

Authoritative edits: product review, tools, bindings, metadata, schema and two
tests. The separately confirmed `operations.ts` edit adds only the scope-expansion
scenario to the existing allowlist. `review-blocks.ts` and the existing fixture
helper are unchanged and included in the frozen comparison. No unrelated worktree
changes were overwritten.

### Test-first and correctness evidence

- Initial six-test RED rejected the old schema/mode. This exposed eligibility but
  did not alone prove every semantic assertion; the isolated mutations below do.
- Subsequent semantic RED reproduced external reviewer evidence being wrongly
  inherited and a changed globally applicable source leaving only one block
  pending. Both owning-layer assertions passed after implementation corrections.
- Build caught the optional source-check field; lint caught two unnecessary casts.
  Initial GREEN also caught an own-write guard incorrectly comparing prior review
  bytes and an invalid fixture relation kind. The guard now audits source state
  before/after writes; the fixture uses registered relation kinds. Historical
  corruption targets a parent-only generation; separate checks prove corrupt
  current input blocks both review paths without side effects.
- Focused final set passed 66/66: product-review, product-review-blocks,
  product-review-recovery, product-review-efficiency, product-review-recheck,
  product-review-hashes, tool-metadata and product-bindings tests.
- After that run, the public stdio test was strengthened to complete
  start/expand/read/record/consistency/complete/status/candidate-check and check
  actual 24 KiB structured / 64 KiB whole-reply bounds and no-write read-back.
  That final test passed 1/1; the other unchanged 65 results were reused. The
  full 66-test set was not rerun after the test-only strengthening.
- Build, final lint, generate, generate:check, validate and scoped diff whitespace
  checks passed. Generation/validation reported all 17 skills.
- PROVE used a copied package and its isolated compiled review module. Four
  deliberate mutations each exited 1 at the intended assertion: over-inherit the
  localized change (119 recorded instead of 118), omit fresh consistency, ignore
  external shared evidence drift, and ignore moved-member identity/applicability.
  Restoration exited 0 with 14/14 tests. The restored run precedes the final
  public-test strengthening; production bytes and mutation assertions are the same.

The 119-block fixture verifies 118 actual saved inherited verdict bodies equal
the parent except attribution, one pending localized block, fresh consistency,
unchanged parent bytes and stable exact replay snapshots. It is owning-layer
simulation, not a complete 119-block public stdio budget qualification. The
smaller final public scenario covers the public lifecycle and response bounds.
Independent fixture judgments remain simulated; no real product review or
activation occurred.

Environment: Linux, Node v24.20.0. Evidence directory:
`/tmp/eaw-i06-evidence/`, including RED/GREEN/PROVE/build/lint/generation logs,
pre-edit status, empty staged evidence, baseline/final exact bytes and the ten-file
`final-sha256.json`. All ten live files matched after the final public enhancement.
Incremental `i06.diff` was read completely; SHA-256:
`d5787d2a2ccf65db9cda725aeb699af5a70a16e385c8ac527ddaa00a00a4d349`.
Final recheck test SHA-256:
`58b682aff93c411f990f93e448645d4adb0dbb3e38e7c6eb474c5ef4fa2e676b`.

The usable Git/manual preflight and before/after pinned MCP specification checks
passed: Approved, reviewed, unchanged source/specification/review pins. Mechanical
checks do not authenticate reviewer independence or prove semantic completeness.
No commit, installation, global configuration, publication, installed-server
restart, external Headroom change, native OS/Node matrix or full integrated suite
was performed. Native and complete public integration evidence remains in I11.

Source/test writes are frozen. Under the authorized execution-workflow, the
coordinator owns independent code and security reviews of this exact state and
returns confirmed defects to the implementer. I06 stays unchecked and I07 is not
released until both reviews pass. This implementation subagent stops here.


## Revision 2 — confirmed independent-review defect

Both independent reviews confirmed the same P2: a saved verdict with
`evidence_sources` but no `evidence_refs` checked only a present markdown document's
digest. Deleting an external source, changing its applicability or moving its
subject/path could leave dependent unchanged IDEA evidence inherited and complete
as reviewed. No additional confirmed finding was reported.

The correction changes only `product/review.ts` and the new recheck test. Source
pins now compare retained/current document identity, membership, applicability,
provenance and relevant relation/decision/upstream dependencies independently of
explicit evidence refs. Transitive external relation changes are included even
when the selected atom inventory is unchanged. Markdown, registry and decision
pins have separate evidence domains. Candidate decision membership is compared
separately from base-generation heads, so deleting a candidate head cannot be
hidden by retained history. Retained pin bytes and active selected-element
membership are verified before inheritance; uncertain or untracked history
requires the existing full-review fallback. Current corrupt-input behavior and
legacy recovery policies are unchanged.

Revision-1 frozen bytes were verified and copied before work into
`/tmp/eaw-i06-revision2/baseline/`. The five source-only markdown tests preceded the
correction: removal/applicability/move each failed the intended inheritance
assertion; unchanged/digest-change controls passed. The final twelve added cases
also cover transitive external dependencies, unchanged/changed registry and
decision evidence, and removed typed source membership. Parent bytes remain
immutable and dependent changed evidence receives a fresh verdict.

Initial domain runs caught test-fixture preparation errors: generation metadata
must be loaded rather than taken from the stored-generation descriptor, and the
synthetic head must match the candidate's new base generation. Both were corrected
without changing production recovery or weakening assertions. The first broad
run retains these two fixture failures in `focused-first.log`; the final run
covers the corrected exact state.

Final checks on Linux / Node v24.20.0:

- The same eight-file related/public/recovery/metadata/bindings set passed **78/78**
  in `focused-final.log`, including the complete smaller stdio lifecycle and the
  original 119-block assertion: one fresh verdict and 118 exact inheritances.
- Final build and lint exited 0 (`build-final.log`, `lint-final.log`). Source and
  added-test whitespace checks returned no diagnostics; no-index comparison
  returns 1 for differing files, not a whitespace failure.
- Isolated PROVE restored only the old digest-only impact predicate in a copied
  compiled module. It failed exactly the three removal/applicability/move
  assertions while both controls passed. Restoring the final implementation passed
  5/5 (`prove-digest-only.log`, `prove-restored.log`, `prove.log`). Live source/dist
  was not mutated by PROVE.
- Before/after MCP specification checks passed with unchanged Approved/reviewed
  pins. The eight unchanged registration/schema/fixture files retain revision-1
  hashes. Their previous generation/validation evidence is reused; no generation
  inputs changed in this revision.

Final evidence: `/tmp/eaw-i06-revision2/`. All ten exact final files are frozen in
`final/` with `final-sha256.json`; only two differ from revision 1.
`correction.diff` was read completely (212 lines), SHA-256:
`11f5d8d43723d6f79f5a0e4c7718e521cb606c665a0a35b08e40741f583218c0`.
Cumulative I06 diff SHA-256:
`718a65f3a10d4df8e63539600c510bdd0743cb03b99f4c2af4e0ac6dd4aa1390`.
Final review source SHA-256:
`1819b5dbc9cfea402a11b8bc7bf7e972f7577336543ad6ea228094db68c51378`.
Final recheck test SHA-256:
`f0d5ccf98ef83973225ddf4decabacef8a56cfd588f436f7708bfe2fe49a033a`.

The writer stops with sources/tests frozen. The coordinator owns both fresh
independent reviews of this exact revision and confirmation of P2 closure. I06
remains unchecked and I07 remains unreleased until both pass. Full 119-block
public integration and native matrix qualification remain in I11. No commit,
installation/global configuration, publication, installed-server restart or
external Headroom mutation was performed.


## Revision 3 — complete reached-participant evidence

Both revision-2 reviews confirmed the remaining P2: relation closure found the
Technical Design and Roadmap participants but the fingerprint retained only the
original pin's metadata/content. With unchanged relation bytes, a dependent
participant's text or applicability could change and the IDEA verdict still
inherit. The direct source-only cases passed; this transitive case did not.

The shared owner now snapshots verified immutable evidence for every reached
participant. It expands the existing relations plus stage, provenance, decision
and upstream dependencies, then includes participant metadata, document identity,
content-object digest and actual element membership, relevant decision bodies and
pin domains. It reads the parent's retained candidate/registry/object references
for historical evidence, never current metadata as a substitute. Missing retained
membership, provenance or bytes requires the existing explicit full-review
fallback. Current corrupt inputs still block work. Impact derivation and its
historical/read/mutation audit callers now await these checks; unique source pins
are compared once per impact derivation. No graph subsystem, storage migration,
new schema or legacy recovery policy was introduced.

Before code changes, five chain cases ran: both Technical Design and terminal
Roadmap content/applicability changes failed the inheritance assertion; unchanged
chain passed. After correction the same cases passed 5/5. Added stage-content and
missing historical dependency-byte cases verify the changed closure boundary:
stage influence requires fresh evidence; unavailable parent bytes reject with
zero effects while intact current full review remains available.

Final evidence on Linux / Node v24.20.0:

- The eight-file related/public/recovery/hash/metadata/bindings set passed **85/85**
  (`focused-final.log`), including one fresh / 118 inherited results in the
  original 119-block fixture, direct typed-source controls, smaller full public
  stdio lifecycle and existing current-corruption/legacy checks.
- Build and final lint exited 0; scoped source and added-line/document whitespace
  checks passed. There were no initial build/lint corrections in this revision.
- The original independent review dependency probe also passed 3/3
  (`original-security-probe.log`): changed Technical Design text/applicability
  produce one pending / three inherited verdicts; unchanged chain retains four.
- Two separate isolated PROVE mutations omitted reached-participant metadata or
  content from the final fingerprint. Each failed both intermediate/terminal
  assertions for its domain, with unchanged-chain control passing. Each restored
  implementation passed 3/3. Logs: `omit-participant-metadata.log`,
  `omit-participant-content.log` and their `-restored.log` counterparts; `prove.log`
  records exit codes. Only the copied compiled module was mutated.
- Before/after MCP checks returned Approved/reviewed/pass with all exact pins
  unchanged. Eight registration/schema/fixture files retain revision-2 hashes;
  prior generation/validation evidence is reused because their inputs are unchanged.

Revision-2 ten-file freeze was verified before baseline capture. Final evidence:
`/tmp/eaw-i06-revision3/`, exact baseline/final bytes, logs and ten-file
`final-sha256.json`. Only review.ts and the recheck test changed.
`correction.diff` was read completely (246 lines), SHA-256:
`655146905d506ee1e6203f1e347c4ec724db0f859fea38bd04641f5019404117`.
Cumulative I06 diff SHA-256:
`4184215ab372c5672f06e70ff39c289d560d209e8b3aa1278ac878b7b897762c`.
Final review.ts SHA-256:
`61d1d2c97cb87a89de7fb6a3896ab7df42f7c5a08d7714218fdc6a554f6391a0`.
Final recheck test SHA-256:
`255780fb5452303f8a365e8857728967c1c5a9c515008e971a7b7f1d2946e8fd`.

Source/test writes are frozen and the implementer stops. The coordinator owns
both fresh independent reviews of this exact revision and P2 closure. I06 stays
unchecked and I07 unreleased until both pass. Fixture decisions remain simulation;
full 119-block public integration/native matrix remain owned by I11. No commit,
installation/global configuration, publication, installed-server restart or
external Headroom mutation was performed.


## Revision 4 — one dependency owner for both public evidence selectors

Both revision-3 independent reviews closed the source-pin dependency defect but
confirmed the same P2 through the alternative public selector: a parent verdict
with `evidence_refs: [PRD]` and `evidence_sources: []` could inherit after an
intermediate Technical Design or terminal Roadmap changed. The reference path
still compared only direct metadata/document evidence. The selector trace found
only `evidence_refs` and `evidence_sources` on recorded verdicts; full/batch
validation, covered/not-applicable inheritance and history audits consume them.
Consistency verdicts add no separate evidence selector.

The correction extracts one typed `dependencyEvidence` owner from the sufficient
revision-3 source-pin checks. Reference and source-pin adapters supply their actual
seeds; no source pin is fabricated. Both paths compare verified retained/current
participant metadata, document identity/object digests, actual element membership,
relations, stage/provenance/decision/upstream dependencies and relevant decision
bytes. Source-pin domain identity remains explicit. Historical reference
eligibility requires retained membership through the common owner; tagged
reference/pin cache entries share the same dependency comparison. Missing retained
evidence rejects inheritance with the full-review fallback, while current
corruption remains blocked. No schema, graph subsystem, migration or legacy
recovery change was added. Only review.ts and the recheck test changed.

Final checks on Linux / Node v24.20.0:

- Before correction, reference-only intermediate/terminal text/applicability
  cases failed exactly four intended inheritance assertions; unchanged control
  passed (`red.log`).
- Fifteen dependency-chain variations passed: references/pins/mixed selectors,
  intermediate and terminal text/applicability drift, and unchanged controls
  (`green-selectors.log`). They inspect the actual saved declared arrays,
  inherited/current verdicts, immutable parent bytes and completion state.
- Missing historical dependency bytes are checked with all three selector
  combinations: rejection has zero effects; intact current full review remains
  usable.
- The final eight-file related/public/recovery/hash/metadata/bindings suite passed
  **102/102** on the exact frozen bytes (`focused-final.log`). It includes the
  original 119-block one-fresh / 118-inherited acceptance fixture, smaller complete
  public stdio lifecycle and budgets, typed pins, stage influence, recovery,
  replay, legacy and current-corruption checks.
- Build and final lint exited 0 (`build.log`, `lint-final.log`); scoped source and
  added-line whitespace checks passed (`whitespace.log`).
- The original security reference-dependency reproduction passed **3/3**
  (`original-security-ref-probe.log`): changed cases have one pending / three
  inherited verdicts; unchanged chain has zero pending / four inherited.
- Isolated PROVE restored the old direct-only reference fingerprint in a copied
  compiled package. Four intended assertions failed while unchanged control
  passed; restoration passed **5/5** (`prove-ref-direct-only.log`,
  `prove-restored.log`, `prove.log`). Live source/dist was never mutated. Earlier
  source-only participant metadata/content PROVE evidence is retained from
  revision 3 because those semantics are unchanged; it was not rerun.
- Before/after MCP checks passed with unchanged Approved/reviewed pins. The other
  eight frozen files and generation inputs are unchanged; prior generation and
  validation evidence is reused, not claimed as rerun.

Revision-3 bytes matched before baseline capture. Final exact evidence is under
`/tmp/eaw-i06-revision4/`: baseline/final copies, logs and the ten-file
`final-sha256.json`. The correction diff was read completely (240 lines) and
matched the final review copy. SHA-256:
`507f84527f5870ac63a58a2855d1b346edea23676610a0c27197457fe518bda6`.
Cumulative I06 diff SHA-256:
`afdd98ea40610bacba271c9ed4a47db710d8cabf92882dad998f4acd95a415c1`.
Final review.ts SHA-256:
`aae8f649baaa780aaeb752d2b98c1ebb303c2a59ac945ae183ae9de90d15de4e`.
Final recheck test SHA-256:
`ad44dc4cd53ace3319900369e174ac16999214d96433c9562d4626fa55ccb17b`.

Sources/tests are frozen. The coordinator reported both revision-4 independent
reviews PASS (code 36/36, security 19/19, frozen hashes 10/10), with all confirmed
P2 defects closed. The coordinator owns review evidence read-back, final packet
completion and release of I07; this implementer leaves I06 unchecked and stops.
Fixture judgments remain simulations; full 119-block public integration and the
native matrix remain in I11. No commit, installation/global configuration,
publication, installed-server restart or external Headroom mutation occurred.

Independent reviews were delivered as agent final messages. The coordinator's
record is `/tmp/eaw-i06-revision4/review-disposition.md`, not an independently
authored reviewer report. Security probe logs are
`/tmp/eaw-i06-security-revision4-ref-dependency.log` and
`/tmp/eaw-i06-security-revision4-boundaries.log`.
