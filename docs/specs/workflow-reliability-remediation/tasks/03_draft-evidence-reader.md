# I03 — Read exact draft evidence through MCP

Status: Complete; revision 2 checks and both independent reviews passed
Dependencies: I02
Requirements: WR-005, WR-008, WR-013, WR-014
Quality scenarios: Q04

## Exact inputs and preflight

- Project: this repository; specification slug `workflow-reliability-remediation`.
- source_version: `345c12557dec017f7dba829464bd36932d866eea21f42c37a1f18b40e8e988b1`
- specification_version: `c1b8042c6009a8a5522f9d5e79a5f25cd10f3104aa980f6aa02886eef49f1efa`
- review_ref: `b4668494-2caa-41fe-ae73-d756aa6082e0`

Working directory for every command: repository root. Node.js >=22.20.0 and the
repository's existing pinned dependencies are prerequisites. Before work and
completion call specification_check_state with the pinned source_version; fetch
only WR-005, WR-008, WR-013, WR-014 through requirement_get using the pinned specification_version,
following every text/reference continuation. Read [C03](../contracts/mcp.md#c03--draft-record-reader) and only the named entries in [quality/scenarios.yaml](../quality/scenarios.yaml).
These versioned contracts, not chat history, are the acceptance inputs.

Require a usable Git worktree with readable status and scoped tracked, staged and
untracked evidence. No clean tree or existing commit is required. Capture the
pre-edit state, preserve unrelated changes and reverify the source passages below.
Dependency readiness means recorded passing acceptance evidence for I02, not merely a checked label or a commit.
Also update only this packet's execution evidence, todo.md and current handoff.md.

## Outcome, boundary and scope

Owner: Draft interview evidence and bounded exact-reader contract.
Allowed production ownership: `src/product/interview.ts`, `src/product/context.ts` only for reusable portion mechanics, `src/product/tools.ts`, root product schema and package reader/interview tests.
Paths beginning src/, test/ or test-support/ in this packet are relative to
packages/engineer-agent-workflow-mcp/; all other paths are repository-relative.

Evidence to reverify: `packages/engineer-agent-workflow-mcp/src/product/interview.ts:338` owns draft loading; `:1230` records research. `packages/engineer-agent-workflow-mcp/src/product/context.ts:719` and `:825` read generation-based decisions. Those readers are not a draft-candidate fallback.

Implementation boundary: Add product_candidate_record_get in the draft evidence owner. Select candidate_ref + record_ref {kind,id,revision}; verify candidate membership and exact immutable object before delivery. Reuse bounded Unicode slicing and cursor validation without relaxing generation readers. Return canonical complete-record JSON in text portions with encoding, identity, digest, offsets and completion. Associated persisted provenance is included; use references instead of inventing absent bodies.

Non-goals: unrelated worktree changes; changing approved behavior or scope;
global configuration, installation, commits, releases; hand-editing generated
bundles or MCP-owned workflow YAML; executing any next packet. New behavior is
not authorized until this packet is explicitly invoked.

## Test-first acceptance and proof

1. Save draft decision and research records without activation; reconstruct small and >4096-code-point nested Unicode records over every continuation; compare canonical record bytes and digest.
2. Wrong candidate/kind/id/revision, corrupt object, foreign cursor and changed candidate snapshot must fail without publication or writes. Verify the complete store snapshot before/after successful and unsuccessful reads.
3. Read retained historical revisions belonging to the candidate; never replace with head. Enforce existing 24 KiB structured/64 KiB wire budgets.
4. Write RED public stdio tests first; PROVE the snapshot and dropped-last-page assertions by one controlled mutation each.

Tests to create in this packet: `packages/engineer-agent-workflow-mcp/test/product-draft-records.test.mjs`.
Run the focused command after creating its discriminating checks and before
implementation; new filenames below are planned, not currently existing scripts.
Then implement, correct code until the valid assertions pass, and run required
PROVE. For an absence/structural claim use the stated actual snapshot/counter/trace,
not a copied implementation constant. A harness/import failure is not RED proof.

```sh
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node scripts/run-tests.mjs packages/engineer-agent-workflow-mcp/test/product-context.test.mjs packages/engineer-agent-workflow-mcp/test/product-interview.test.mjs packages/engineer-agent-workflow-mcp/test/transport.test.mjs packages/engineer-agent-workflow-mcp/test/product-draft-records.test.mjs
```




Focused pass is necessary, not permission to skip a material shared-boundary test.
Broaden only for changed shared boundaries, new failures or unresolved evidence.
Record actual environment, commands, RED/GREEN/PROVE results and observed side
effects. A missing or failing required check keeps this packet incomplete.

## Compatibility, recovery and manual gates

New opt-in read endpoint; no data migration. Existing ready-generation readers and source pins remain byte/semantics compatible.

MANUAL GATE: None. Reads must not activate candidates or initialize global configuration.

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

Executed I03 only under the authorized orchestration workflow. Installed manual
verification and Git worktree preflight passed. MCP confirmed Approved/reviewed
inputs and exact pinned versions before work and completion; all portions of
WR-005, WR-008, WR-013 and WR-014 were consumed. I02 readiness was verified from
its recorded final tests/reviews and unchanged source baseline.

The additive public reader follows candidate decision heads and retained exact
predecessors, checks record kind and canonical bytes, binds cursors to context,
candidate snapshot, exact record identity and digest, and returns all stored
fields using Unicode code-point portions. Research remains its persisted Decision
format with the complete nested JSON evidence in text. Existing generation
readers retain their original behavior. The existing portion maximum and cursor
codec are reused. Envelope-aware trimming preserves structured and wire budgets.
A reader-local candidate digest check detects bytes changed without updating the
claimed source version. No record migration or activation was introduced.

Two necessary narrow ownership adjustments extend the packet path list:
product/schemas.ts registers the additive success definition; product/bindings.ts
adds one name to its existing static capability inventory. They introduce no
new capability machinery. Root product.schema.json is authoritative; the existing
build copied it to the runtime, and the existing generation/check scripts passed.
Pre-edit disposable generated copies were not captured and are not presented as
known baseline bytes. The current sole generated runtime product schema matches
the canonical root digest exactly.

Verification on Linux / Node v24.20.0, from repository root:

- Public stdio RED: draft writes succeeded and the missing reader failed the
  explicit tools/list discoverability assertion. A separate historical test
  initially used decision_ref for a prepared question; the harness was corrected
  to use question_ref, and that error was not counted as behavioral proof.
- Additional public RED: mutating a candidate state while retaining its claimed
  version returned success; the required error assertion failed. The reader
  digest check corrected that behavior.
- Package build: exit 0. The required context/interview/transport/draft-reader
  test slice passed 21 tests, 0 failures, exit 0. Five draft-reader scenarios
  exercise canonical reconstruction, small/large nested Unicode, retained
  revisions, foreign selectors/cursors, stale contexts, missing/corrupt records,
  budget trimming and historical digest drift. Published input/output schemas
  are validated with AJV against actual stdio responses.
- Successful and failing reads preserve complete isolated store snapshots:
  directories, file contents/digests, modes, inode, mtime and ctime; read atime is
  intentionally excluded. No publication or readiness change was observed.
- Isolated PROVE independently omitted the complete final page, introduced a
  durable reader-side write, disabled envelope trimming, and removed historical
  digest/identity binding. Every affected assertion failed with exit 1 after a
  successful isolated build; each restored targeted check passed with exit 0.
  An additional omitted-final-character mutation was also detected. Final
  restored isolated draft tests passed 5/5. Production files were never mutated
  for these proofs.
- Collection validate passed 17/17; generate and generate --check passed. Scoped
  ESLint passed. The untracked-test whitespace check initially found an extra
  EOF blank line; it was removed and the check passed. Tracked scoped whitespace
  check passed.

Scoped pre-edit source/test/schema copies, incremental diff, final file hashes,
generated-schema inventory and RED/GREEN/PROVE logs are retained in the external
implementation evidence directory supplied to the coordinator. They distinguish
this packet from the substantial pre-existing dirty worktree. No staged files
were present. No full repository suite, new OS/host trials, commit, installation,
publication or external mutation ran.

Next action: the coordinator owns independent code and security review of the
frozen I03 source/test/schema state. I04 is the next eligible implementation
packet only after this run's review cycle closes.

## Revision 2 — cursor selector identity correction

Code review found P2: equivalent candidate_ref or record_ref objects with a
different JSON key order produced a different cursor identity. Public stdio RED
reproduced candidate-only, record-only and combined permutations; all three
subtests failed their expected successful-continuation assertion. Identity now
uses explicitly ordered product, candidate, artifact, kind, id, revision and
source digest scalar fields. Equivalent objects return the exact same page;
actual foreign selectors, different revisions, changed snapshots and historical
digest drift still fail. No storage/schema/cursor codec change was needed.

Revision 2 verification on the same Linux / Node v24.20.0 environment: installed
manual verification passed; package build, affected ESLint and whitespace checks
passed. Required four-file suite passed 25 tests, 0 failures, exit 0. The affected
historical identity/digest guard was removed in isolation: its public assertion
failed with exit 1 after a successful build, then passed after restoration. The
final restored draft-reader suite passed 9 tests, including three permutation
subtests. Unchanged write/last-page/budget proofs were retained without repetition.
MCP preflight/completion passed against the original exact approved pins.

Historical integrity retains the existing trusted-filesystem boundary:
predecessor DecisionRef links have no persisted expected historical digest.
Supported wx object writers cannot replace history, and cursor identity detects
subsequent selected-record byte drift. Initial semantically valid privileged
filesystem rewriting of predecessor bytes is not cryptographically authenticated
by this reader. No historical storage schema or migration was introduced.

The original security review reported no new defect and passed its draft-reader
tests plus isolated symlink/hardlink probes. Both independent re-reviews
(`code_i03`, `security_i03`) covered frozen revision 2 and verified all seven final
hashes. Code review independently passed the new key-order regression (4/4).
They confirmed P2 is closed without relaxing membership, history, snapshot or
digest checks, with no new actionable finding. Exact correction/cumulative diffs
and logs are retained in the revision-2 evidence report. The coordinator released
I04 after both final reviews.
