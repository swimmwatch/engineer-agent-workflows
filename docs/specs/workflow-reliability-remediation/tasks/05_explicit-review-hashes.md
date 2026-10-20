# I05 — Separate source and verdict digest representations

Status: Complete; revision 2 checks and both independent reviews passed
Dependencies: I01
Requirements: WR-010, WR-013, WR-014
Quality scenarios: Q06

## Exact inputs and preflight

- Project: this repository; specification slug `workflow-reliability-remediation`.
- source_version: `345c12557dec017f7dba829464bd36932d866eea21f42c37a1f18b40e8e988b1`
- specification_version: `c1b8042c6009a8a5522f9d5e79a5f25cd10f3104aa980f6aa02886eef49f1efa`
- review_ref: `b4668494-2caa-41fe-ae73-d756aa6082e0`

Working directory for every command: repository root. Node.js >=22.20.0 and the
repository's existing pinned dependencies are prerequisites. Before work and
completion call specification_check_state with the pinned source_version; fetch
only WR-010, WR-013, WR-014 through requirement_get using the pinned specification_version,
following every text/reference continuation. Read [C05](../contracts/mcp.md#c05--explicit-digest-domain) and only the named entries in [quality/scenarios.yaml](../quality/scenarios.yaml).
These versioned contracts, not chat history, are the acceptance inputs.

Require a usable Git worktree with readable status and scoped tracked, staged and
untracked evidence. No clean tree or existing commit is required. Capture the
pre-edit state, preserve unrelated changes and reverify the source passages below.
Dependency readiness means recorded passing acceptance evidence for I01, not merely a checked label or a commit.
Also update only this packet's execution evidence, todo.md and current handoff.md.

## Outcome, boundary and scope

Owner: Product review evidence projection and compatibility.
Allowed production ownership: `src/product/review.ts`, `src/product/tools.ts`, root product schema, review/context/transport tests.
Paths beginning src/, test/ or test-support/ in this packet are relative to
packages/engineer-agent-workflow-mcp/; all other paths are repository-relative.

Evidence to reverify: `packages/engineer-agent-workflow-mcp/src/product/review.ts:1885` hashes canonical verdict bytes; `:1906` renders those hashes in consistency text as object_sha256. `context.ts` source pins use their own object identities.

Implementation boundary: Keep immutable storage and legacy default output unchanged. Add an explicit-v1 representation selector for review evidence/consistency readers and advertise it in capabilities. In explicit representation use verdict_object_sha256 plus source digests with identity/domain fields; object_sha256 remains a documented legacy alias where exposed. Reuse canonical serialization and exact inventory/source entries. Do not infer a document hash from the saved verdict or rewrite historical objects.

Non-goals: unrelated worktree changes; changing approved behavior or scope;
global configuration, installation, commits, releases; hand-editing generated
bundles or MCP-owned workflow YAML; executing any next packet. New behavior is
not authorized until this packet is explicitly invoked.

## Test-first acceptance and proof

1. For identical source and differing fresh verdict objects assert stable source digest and potentially different verdict digest; verify actual canonical inputs.
2. Assert legacy output and explicit aliases agree on verdict identity, and old retained records can be read with zero migration writes.
3. Change a source and prove old coverage is stale; reject cross-domain pin substitution. Validate current and legacy consumer schemas through stdio.
4. Write discriminating tests before projection changes; PROVE no-migration by a controlled write and verify digest-domain assertions catch a swapped field.

Tests to create in this packet: `packages/engineer-agent-workflow-mcp/test/product-review-hashes.test.mjs`.
Run the focused command after creating its discriminating checks and before
implementation; new filenames below are planned, not currently existing scripts.
Then implement, correct code until the valid assertions pass, and run required
PROVE. For an absence/structural claim use the stated actual snapshot/counter/trace,
not a copied implementation constant. A harness/import failure is not RED proof.

```sh
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node scripts/run-tests.mjs packages/engineer-agent-workflow-mcp/test/product-review.test.mjs packages/engineer-agent-workflow-mcp/test/product-context.test.mjs packages/engineer-agent-workflow-mcp/test/transport.test.mjs packages/engineer-agent-workflow-mcp/test/product-review-hashes.test.mjs
```




Focused pass is necessary, not permission to skip a material shared-boundary test.
Broaden only for changed shared boundaries, new failures or unresolved evidence.
Record actual environment, commands, RED/GREEN/PROVE results and observed side
effects. A missing or failing required check keeps this packet incomplete.

## Compatibility, recovery and manual gates

Opt-in representation preserves strict old consumers. Retain old field meanings and stored object identity; remove no alias and perform no bulk migration.

MANUAL GATE: Breaking field removal or storage rewrite is excluded.

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

The user-authorized run in execution-workflow.md released I05 after I04's
revision-2 implementation and independent reviews passed. This invocation applied
the installed incremental-implementation skill. Its engineering-manual verifier
and a separate usable-Git check passed before writing. Existing dirty tracked,
staged and untracked state was captured and preserved; no clean tree or commit
was required. Baseline source bytes and scoped Git evidence are retained under
/tmp/eaw-i05-evidence/baseline/ and the adjacent status/staged/tracked-scope/
untracked evidence files. The staged diff was empty.

Before and after work, specification_check_state returned pass, Approved,
reviewed and the exact pinned aggregate/specification/review references; it wrote
no approval checkpoint. WR-010/013/014 and all linked exact decision revisions
were read through MCP to completion during the read-only preflight, then the
same snapshot was revalidated on release. C05 and Q06 are the acceptance inputs.
This standalone task has no product task binding, so product task mutation tools
were not invoked.

### Scoped behavior and ownership

- review.ts projects explicit-v1 evidence from the retained inventory and real
  immutable-object/source pins. source_content_sha256 hashes exact UTF-8 item
  text; source_object_sha256 retains the actual immutable byte identity; the
  candidate source_version has its own named domain and identity. These are
  never populated from a saved verdict.
- verdict_object_sha256 hashes canonical saved Verdict JSON with sorted keys and
  a trailing newline. In the explicit projection object_sha256 is an equal,
  documented legacy alias. The default reader text and result shape are unchanged.
- product_review_get, product_review_get_batch and product_review_consistency_get
  expose an optional explicit-v1 selector. Explicit source JSON is delivered in
  existing bounded text portions, avoiding an unbounded provenance array in one
  response. Batch responses still measure their actual envelope against 24 KiB.
- Complete receipts support both representations without rewriting history.
  Cursors bind the representation as well as review/source/item/prefix. Legacy
  receipts/cursors remain valid for the unchanged legacy representation.
- The coordinator authorized minimal existing bindings.ts and metadata.ts wiring
  beyond the original packet path list. product_capabilities has the same opt-in
  selector: its unchanged default keeps strict legacy consumers compatible; an
  explicit call names supported review representations. A client first checks
  the published input schema for support; absent support is not assumed present.
- shared/schemas/product.schema.json remains authoritative. Strict legacy and
  explicit result branches preserve old output contracts; existing generation
  and package schema build scripts were used. No generated source was hand-edited.
- The new product-review-hashes.test.mjs covers factual canonical inputs,
  changed/fresh verdicts, exact source objects, rejected domain substitution,
  stale coverage, strict stdio compatibility, old atomic-v1 records, Unicode
  pagination, cursor binding, explicit consistency and followup.

### Commands and observed results

Working directory: repository root. Environment: Linux, Node v24.20.0; existing
pinned dependencies. This is not a native macOS/Windows or Node matrix pass.

- RED: node scripts/run-tests.mjs with the new product-review-hashes.test.mjs
  exited 1 before production edits. The explicit-representation assertion saw
  undefined; public stdio rejected the new field. Other initial parse failures
  are retained but do not count as canonical-hash assertion proof.
- Package npm run build exited 0 and rebuilt the runtime identity stamp from the
  actual final production/schema inputs.
- The required product-review/product-context/transport/new-hashes tests plus
  tool-metadata/product-bindings boundaries passed 34/34. The final related run
  additionally included existing product-review-recovery and passed 43/43,
  including six then-current hash cases. After adding the explicit followup
  fixture, the complete hash file passed 7/7 on the frozen production state.
- Package npm run lint initially failed on the new test's URL import. The test
  was corrected to import URL/fileURLToPath explicitly; final lint exited 0.
  This was a test harness/lint repair, not a weakened acceptance assertion.
- npm run generate, npm run generate:check and npm run validate exited 0.
  Scoped git diff --check exited 0.
- Public stdio read-back validates actual supported and unsupported selectors,
  exact legacy shapes, explicit aliases and advertised capability discovery.
  Current/retained read snapshots include file/directory bytes, modes, mtime and
  ctime; no migration writes occurred.

### Isolated PROVE and frozen evidence

The isolated .artifacts/i05-proof copy changed compiled fixture code only; live
production source and real global configuration were not mutated by PROVE.
Each mutation was separate and the original clone module was restored.

1. Replacing a source-object digest with the saved verdict digest failed the
   intended immutable-source assertion. The initial attempt failed earlier at a
   receipt check and is excluded; the reordered assertion supplied decisive proof.
2. Replacing the explicit verdict digest with source-text digest failed the
   actual canonical Verdict-byte comparison.
3. A controlled write in the item reader failed current and old-record snapshots,
   including changed metadata and bytes. Removing it restored the absence checks.
4. Removing representation from cursor identity failed the explicit empty-prefix
   cross-representation rejection. The first probe retained the prefix guard and
   still passed; this non-discriminating attempt is not counted as proof.

The restored isolated six-case file passed 6/6; the final live file with the
additional followup fixture passed 7/7. Logs remain losslessly saved under
/tmp/eaw-i05-evidence/: red.log, focused-final.log, hashes-final.log,
lint-final.log, build.log, generate.log, generate-check.log, validate.log,
prove-domain-final.log, prove-verdict-domain.log, prove-read-write.log,
prove-cursor-final.log and prove-restored-final.log.

Source/test freeze: six authoritative files, exact bytes under final/ and SHA-256
values in /tmp/eaw-i05-evidence/final-sha256.json. The incremental implementation
patch is implementation.diff, SHA-256
3c7f2a2f4807517c293d97a542147e06abecb04e1047fee3e6feec0749f693d7.
The implementation writer stops here. Both independent reviewers must cover this
frozen state before the coordinator releases I06. No full repository suite,
installation, restart of the installed server, commit, release or publication
was performed. External qualification gates belong to later packets.


## Revision 2 — Retained atomic provenance and stable historical receipts

The independent code reviewer confirmed P2 in revision 1: atomic-v1 inventory
without retained blocks/sources gained source_objects through current-candidate
hydration. Its explicit complete receipt incorporated those temporary objects.
After a candidate edit, hydration ceased and receipt validation falsely reported
SOURCE_CHANGED instead of allowing historical reads and stale coverage. Security
review found no additional actionable finding. Revision 1 therefore did not close
this packet despite its prior passing checks.

The regression now executes the complete public stdio sequence: create a genuine
retained atomic inventory without blocks/sources; read its element using
explicit-v1; record that complete receipt; change the candidate document; query
old review status and reconstruct the historical explicit item. It also closes
and reconnects the server, checks the same retained receipt in a fresh process,
and compares store byte/mode/mtime/ctime snapshots across historical reads.
The pre-fix RED exited 1 at the public status assertion with the reported
SOURCE_CHANGED diagnostic; this is not a collection/parser failure.

The fix owns the provenance boundary in review.ts. Immediately after immutable
inventory validation, loadReviewState retains the original source metadata map,
before any current-candidate hydration. New review construction supplies the same
map. Explicit projections and their sealed receipts use only that frozen map.
Actually stored source objects remain available; missing legacy provenance is
reported as source_objects_status unavailable-in-legacy-inventory with an empty
source_objects array. The original text/version and retained upstream pins remain
verifiable. No original document digest is fabricated from current metadata or
from a saved verdict, and no read migration or historical rewrite occurs.

Revision-2 baseline captured all six original I05 authoritative files and the
current dirty/staged/untracked state before edits. Only review.ts and the hash
regression file changed; tools/bindings/metadata/schema retained their revision-1
hashes. Exact evidence is under /tmp/eaw-i05-revision2/.

- Engineering-manual verifier, usable Git and exact pinned MCP checks passed.
- Targeted public sequence passed after the correction.
- The first provenance-map build found missing map arguments in two fresh
  ReviewState construction sites. Those sites were corrected; final package
  build and lint both exited 0. The compiler failure is not counted as RED.
- Final related public/review/context/transport/hashes/recovery plus mandatory
  metadata/bindings boundaries passed 45/45, including all eight hash cases.
- Isolated PROVE replaced the retained-map lookup with hydrated inventory
  lookup. The public sequence failed at the same status assertion with
  SOURCE_CHANGED. The mutation was removed; the restored public sequence passed,
  including the fresh-process and zero-write observations.
- The final scoped diff check passed. Pinned specification state remained
  pass/Approved/reviewed; no approval checkpoint was written.
- Production/schema/metadata changes from revision 1 retain their verified
  generation inputs; generation and validation were not broadened again for
  this source-only provenance correction. No full repository or native platform
  matrix pass is claimed.

Logs: red.log, green-targeted.log, build-final.log, lint-final.log,
focused-final.log, prove.log and prove-restored.log. Revision-2 exact source/test
bytes are under final/; all six final hashes are in final-sha256.json.
correction.diff SHA-256:
731aba798ea0afc0e34839d0e5f5a1ec95fca3d088100faf9995f6cdb44d7580.
cumulative.diff SHA-256:
a808c5efc3647d822ba324d0e864b1b5ef462282b965bf770cb8ce83bc4658df.
Both fresh reviewers must now validate this final state and independently close
P2. The implementation writer stops; coordinator owns the next review actions.

## Final independent review disposition

Revision 2 passed both run-specific reviews; retained atomic-v1 receipt P2
is closed. Code review independently passed 22/22 hashes/metadata/bindings tests
and the original stale-history probe. Security review passed 8/8 focused tests,
four prior boundary probes and an upstream-pin preservation probe. All six final
source hashes matched before and after both reviews. No remaining confirmed
findings. Evidence: /tmp/eaw-i05-revision2/. I05 is complete; native platform
qualification and the full integrated suite remain owned by I11.
