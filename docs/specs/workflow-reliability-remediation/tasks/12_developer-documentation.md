# I12 — Document verified contracts and operator recovery

Status: Original I12/Q17 acceptance retained; I12-R1 local checks complete, final combined reviews pending; Q14 cancelled
Dependencies: Accepted local I11 integration (preflight below); full I11 completion is not a prerequisite
Requirements: WR-001, WR-004, WR-005, WR-006, WR-007, WR-008, WR-009, WR-010, WR-011, WR-012, WR-013, WR-014
Quality scenarios: Q17

## Exact inputs and preflight

- Project: this repository; specification slug `workflow-reliability-remediation`.
- source_version: `d6499cf2486dbf002516f0977d1f9f951a9bce97eadc44e553f99d035561aae4`
- specification_version: `b070eb5dd558d766ddfa61945c90e53d9b586a07d90a4ee8795d21b68b61fa28`
- review_ref: `e5bb7cd9-cd51-42a3-bb29-0ff4acc5b383`

Current acceptance inputs were rebound on 2026-10-19 after the explicit user
decision to exclude Headroom. Q14 is CANCELLED / NO LONGER REQUIRED, never passed.
No service ownership, registered external-connection identity, automatic-path capture
or external test remains a delivery obligation. Generic MCP integrity (WR-012/Q13),
safe recovery, response limits and all four actual native combinations remain required.
Historical execution/review evidence retains its original source, specification and
review pins; rebinding does not relabel old tests as newly executed. The prior current
pins were source `80aaa57b348e0c17731b6f9f23f9d92cd0826a3d1fe0ada37a9806e1edd30767`,
specification `113ef10ec396f650c5d6f66d93e7dedc131faf1c1512717f54ec5da756a63dfd` and
review `8090f5b2-5a46-4511-9774-32295157cf1f`.

Working directory for every command: repository root. Node.js >=22.20.0 and the
repository's existing pinned dependencies are prerequisites. Before work and
completion call specification_check_state with the pinned source_version; fetch
only WR-001, WR-004, WR-005, WR-006, WR-007, WR-008, WR-009, WR-010, WR-011, WR-012, WR-013, WR-014 through requirement_get using the pinned specification_version,
following every text/reference continuation. Read [C12](../contracts/mcp.md#c12--developeroperator-documentation) and only the named entries in [quality/scenarios.yaml](../quality/scenarios.yaml).
These versioned contracts, not chat history, are the acceptance inputs.

Require a usable Git worktree with readable status and scoped tracked, staged and
untracked evidence. No clean tree or existing commit is required. Capture the
pre-edit state, preserve unrelated changes and reverify the source passages below.
Dependency readiness requires the following preflight on accepted local I11
integration, not a checked whole-I11 label or a commit:

1. Read the accepted original-worktree [I11 freeze](../../../../artifacts/workflow-reliability-remediation/i11-delimiter-correction/freeze.json),
   its `source_fingerprint_manifest`, eight final local command results and retained
   public stdio/packed/recovery/generation/validation evidence. The retained Ubuntu
   Node24.14.0 full887/887 and Node22.20.0 focused109/109 results are historical
   evidence for those exact inputs, not a platform-wide or current whole-tree claim.
   Read the [current actual-tree revalidation report](../../../../artifacts/workflow-reliability-remediation/i11-current-local-revalidation/report.md)
   and [freeze](../../../../artifacts/workflow-reliability-remediation/i11-current-local-revalidation/freeze.json),
   SHA-256 `217b479391f67fb00a37f7f278360f815a9386e3a9d20e06adb233c14f66c99f`.
   Its fresh Node24.14.0 build matches all86 canonical retained package members
   (83 runtime members plus three package inputs), and the two current baseline
   test suites pass20/20. It resolves local provenance; it is not a full887 rerun.
2. Verify both final independent reviews against the [local I11 disposition](../../../../artifacts/workflow-reliability-remediation/coordinator/i11-final-review-disposition.json)
   and unchanged review-report/freeze bytes. Verify generated Codex/Claude evidence
   against [I09's accepted source/review bindings](../../../../artifacts/workflow-reliability-remediation/coordinator/i09-final-review-disposition.json).
   Actual-host execution remains distinct from simulated fixture answers.
3. Check current inputs against their accepted original-worktree provenance before
   editing; resolve any unexpected runtime/code/schema/test/generation drift before
   starting. Preserve scoped tracked/staged/untracked evidence and the preimage of
   `docs/product-workflows.md` and package `README.md`. Their planned I12 changes
   are outputs, not unexplained runtime drift. The README is one of the three
   package inputs in the86-member proof. Do not require all 86 package members to stay equal after I12.
   Recheck the unchanged83 runtime members and source/code/schema/test/generation inputs after editing;
   validate new docs/examples with Q17 and both independent final reviews instead
   of claiming every old full-freeze documentation hash still matches.
4. Keep the isolated CI candidate's [86-input reuse binding](../../../../artifacts/workflow-reliability-remediation/resume16-ci-correction/acceptance-reuse-binding.json)
   within its projection domain. Its historical61/61 result is not the actual-tree
   887/109 result. Three current-tree differences in that list were an evidence-domain
   mismatch, resolved by the actual compiled-package proof and current focused tests
   above; they are not proven new runtime drift. The completed local provenance
   preflight permits scheduling, while every invocation still checks for new drift.

This preflight controls documentation scheduling only. Q14 is cancelled and no
longer required, never passed. Original I12 acceptance remains historical; the
current I12-R1 follow-up below owns the amended wording. Full Q16 remains required
on Linux and all four native macOS15/Windows2025 × Node22.20.0/24.14.0 combinations.
Only actual exact-snapshot results qualify a published input tree. No new external
service test, configuration change, public delivery or native run is authorized here.
Also update only this packet's execution evidence, todo.md and current handoff.md.

## Outcome, boundary and scope

Owner: Nearest authoritative developer/operator documentation.
Allowed production ownership: `docs/product-workflows.md`, `packages/engineer-agent-workflow-mcp/README.md`, `docs/local-development.md` only for actual runtime identity checks, existing documentation tests. No new architecture-document tree.
Paths beginning src/, test/ or test-support/ in this packet are relative to
packages/engineer-agent-workflow-mcp/; all other paths are repository-relative.

Evidence to reverify: `docs/product-workflows.md:109` owns review lifecycle; `:232` owns recovery; `:255` owns proof limits. Existing `tests/product-documentation.test.mjs` verifies published product examples.

Implementation boundary: Extend these documents after behavior and end-to-end checks exist. Explain draft versus ready reads, recheck versus full/gaps-followup, source versus verdict digests, MCP sessions, opaque context ownership, one-replay recovery limit, runtime build identity and compression failure handling. Include a small runtime-flow diagram only where it resolves ambiguity. Distinguish implemented callable tools from schema-only shapes and external unverified components. Durable docs are warranted: non-obvious invariants, operator misconfiguration risk and new digest/session vocabulary.

Non-goals: unrelated worktree changes; changing approved behavior or scope;
global configuration, installation, commits, releases; hand-editing generated
bundles or MCP-owned workflow YAML; executing any next packet. New behavior is
not authorized until this packet is explicitly invoked.

## Test-first acceptance and proof

1. Before documentation edits, add executable example assertions for the new current tools and recovery outcomes; run RED with absent/stale examples.
2. Validate examples against current advertised schemas and isolated fixture state. Run the existing product documentation and package metadata checks.
3. Have a fresh-context reader identify the correct reader for a draft, both digest domains, safe response to unknown effects, loaded-versus-built version and why an external compressor is not a repository dependency or acceptance gate; record concrete answers and correct any misleading docs.
4. Ensure docs describe implemented outcomes, not this planning history. Distinguish retained local evidence, actual native results and cancelled external Q14; preserve generic exact-data failure handling. No unexecuted check may be written as passed. Q17 completion certifies documentation and its examples only; it does not qualify a changed native input snapshot, complete full I11 or certify the workstream. Linux evidence stays within its retained domain; actual native failures and skipped qualification are not passes.

Tests to create in this packet: extend the named existing suites/fixtures; create no mirror-of-implementation test.
Run the focused command after creating its discriminating checks and before
implementation; new filenames below are planned, not currently existing scripts.
Then implement, correct code until the valid assertions pass, and run required
PROVE. For an absence/structural claim use the stated actual snapshot/counter/trace,
not a copied implementation constant. A harness/import failure is not RED proof.

```sh
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node scripts/run-tests.mjs packages/engineer-agent-workflow-mcp/test/tool-metadata.test.mjs tests/product-documentation.test.mjs
```

Focused pass is necessary, not permission to skip a material shared-boundary test.
Broaden only for changed shared boundaries, new failures or unresolved evidence.
Record actual environment, commands, RED/GREEN/PROVE results and observed side
effects. A missing or failing required check keeps this packet incomplete.

## Compatibility, recovery and manual gates

Documentation follows tested existing behavior. Revert only incorrect wording/examples, never alter runtime behavior to make an example pass.

MANUAL GATE: No publishing, release notes submission, global installation or plugin configuration. Stop after documentation/checklist/handoff updates.

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

## Current documentation follow-up — I12-R1 (2026-10-19)

Status: LOCAL_COMPLETE; N6 independently accepted; final combined reviews remain separately invoked.
This current section supersedes the original-main preflight and stale baseline
instructions above for I12-R1 only. Original I12 acceptance remains historical.
Approved source/specification/review pins at the top remain unchanged. Require
fresh owning MCP pass/reviewed/Approved checks before work and completion; read
only exact WR-001/WR-008/WR-009/WR-012/WR-013/WR-014 continuations and C10/C12/Q17.

Outcome: truthfully document the already-approved external Headroom exclusion
while restoring the previously accepted reliability examples to the isolated
published candidate. Preserve generic exact-response integrity, supported examples,
native proof limits and runtime behavior. This repairs the input contract of the
existing documentation follow-up; it adds no feature. Durable docs are warranted
by non-obvious recovery/digest rules and the risk of mistaking an external tool
for a repository dependency or acceptance gate.

### Exact prepared inputs and compatibility

Use a NEW isolated Git checkout at published commit
`7aa9c0b886522c23ace4728d702138d3dfa43f9f`, tree
`3a72313e5619d9700dec3beb95c6d9ce8b5f8fdd`. The existing delivery checkout is
read-only. After N6 final acceptance, apply only its exact independently verified
content patch as an uncommitted prior-packet input. Verify its freeze, patch digest,
base commit, exact affected paths and unchanged guards. Preserve that prior patch;
do not rewrite N6 evidence or infer equivalence from a packet label. Main stays the
owning specification MCP project; preserve main HEAD/index and unrelated work.

The accepted [input audit](../../../../artifacts/workflow-reliability-remediation/i12-overlay-provenance-recovery/report.md)
has report SHA256 `abe9c4f9b9b2efc17badb41ed8164aefa0d50d3af9c20df07c42b55cf4772778`
and freeze SHA256 `e57d273ac7bdc2bee02f85cc8ecc6f9dde94d1616e324297ae96701b54323cdc`.
Its `source-hash-map.json` binds these immutable historical prepared inputs under
`artifacts/workflow-reliability-remediation/i12-overlay-provenance-recovery/accepted-overlay/`:

| Candidate target | Prepared accepted SHA256 | UTF-8 bytes |
| --- | --- | --- |
| `docs/product-workflows.md` | `fe3a75247dc7ac0c182d84c92c95ccb638bd16143246505eed604a00c0189cb6` | 25016 |
| `packages/engineer-agent-workflow-mcp/README.md` | `78501a29feb9a440638c3b4acb9796ed3d1a8ca28d26675d6d07535691051945` | 16929 |
| `tests/product-documentation.test.mjs` | `99568ecce147bc675f553aa583403c06137ee9c43a4994035aa40a34e9e85436` | 11528 |

These three are explicit authored inputs, not the published baseline or freshly
passed tests. Published 7aa has only 251/238/137 lines and no Headroom/Q14 text in
those targets. Accepted overlay has 543/274/364 lines. Thus a RED must not claim
that published docs contain a stale external gate. Audit source maps and acceptance
references explain provenance; historical Q17 passes do not prove execution against
7aa or the new candidate. The stopped author's earlier baseline report remains
unchanged and has no RED/GREEN/source implementation result.

Reverify prepared guide:481–495, package README:64–69 and test:109 for the obsolete
combined external-gate assertion and retained integrity paragraph. These are
OVERLAY locations, not published source locations. Across all three prepared inputs,
only README:81–82 advertises unsupported `design_tokens`/`shared_design` behavior:

```text
  Select `design_tokens` together with `shared_design` to explicitly declare
  `design/system/tokens.tokens.json`; `shared_design` alone does not add tokens.
```

Remove exactly those two lines (158 UTF-8 bytes) from the future README candidate.
The audit's `readme-compatibility-filter.diff` records this authorized compatibility
correction. `compatible-prepared/` is a planning preview, never an applied candidate
or RED/GREEN evidence; do not copy it before test-first work. No production
`design_tokens` implementation or broader design/documentation change is allowed.
Preserve immutable accepted copies and current main documents verbatim.

All 38 N5 source members equal published 7aa; all 83 runtime inputs must match the
audited frozen N5 runtime under
`artifacts/workflow-reliability-remediation/windows-cleanup-diagnostics-correction/checkout`.
Use audit `overlay-provenance.json` runtime rows and the N5 source/runtime freeze
bindings to materialize and verify this exact compiled set in the new checkout
before importing the prepared test. Do not use current main dist: four members
(`scope.js`, `tool-contracts.json`, `runtime-info.js`, `runtime-stamp.json`) differ
because of unrelated design-token work. Do not build current main or change source,
runtime, dependencies or workflow to satisfy a documentation example. Missing or
conflicting exact runtime input blocks this packet and returns to root.

### Outputs, ownership and lifecycle

Exactly four candidate output paths are allowed:

- `docs/product-workflows.md`;
- `packages/engineer-agent-workflow-mcp/README.md`;
- `tests/product-documentation.test.mjs`;
- `.github/qualification/workflow-reliability-inputs.json` (one final combined inventory).

Capture published and prior-N6 tracked/staged/untracked state, these four preimages,
prepared input hashes and runtime/source guards before writing. The guide owns
workflow policy and exact-response limits; README summarizes and links it; the
existing documentation test owns schema/tools-list and actual public-stdio example
checks. Inventory owns hashes only. This test-only/doc flow introduces no new
module, API, schema, dependency, CLI, generated skill or runtime state. Preserve
all valid published and accepted examples/assertions, Unicode continuations, exact
digests, safe sessions, runtime identity, source/verdict distinctions and actual
historical run facts. Only obsolete Q14 expectations and unsupported claims change.

No migration or runtime rollout is needed. Rollback restores this packet's four
preimages while preserving the exact prior N6 content and all independent evidence.
Keep production/runtime, dependencies, workflow, native workload/deadlines and
cleanup/error/PID guards unchanged. Do not add new tracked paths or a docs exemption.

### RED, GREEN, PROVE and focused verification

Working directory: the NEW isolated candidate root. Use available exact Linux
Node 22.20.0 and 24.14.0 executables with existing dependencies; no installation.
Set new isolated homes/config/cache/temp roots before subprocesses using the N5
runner environment. Save commands, executable versions, owned PIDs, logs, terminal
exits and source hashes. These checks do not trigger native jobs.

1. TEST FIRST: install ONLY the exact prepared documentation TEST into its allowed
   target and extend it before changing guide/README. Amend the obsolete combined
   I10/Q14 assertion while preserving valid historical-run/schema/public-stdio
   assertions. Add a focused behavioral test named
   `Q39: external dependency boundary preserves exact-response integrity` that
   requires explicit external non-dependency/out-of-acceptance and cancelled,
   never-passed Q14 wording in BOTH docs, retained critical fields and fail-closed
   recovery, and rejects the unsupported two-line token promise. Read repository
   dependency metadata and confirm that no repository dependency on Headroom is
   implied. Keep both docs at their PUBLISHED bytes during this RED, with the exact
   N5 runtime already available. Run on both pins:
   `rtk proxy node --test --test-name-pattern="^Q39: external dependency boundary preserves exact-response integrity$" tests/product-documentation.test.mjs`.
   Observe the intended missing explicit policy/integrity assertion against the
   published docs, not an import/collection error or a fabricated obsolete-gate
   failure. Then run the complete focused documentation test and record its actual
   additional missing accepted examples as separate observations. A formatter-only
   check or an assertion against an unapplied preview is not the required RED.
2. GREEN: after recording relevant RED, materialize the exact accepted guide and
   README as authored inputs; remove only the two unsupported README lines and
   amend the obsolete external-gate paragraphs. State that Headroom is external and
   outside repository dependencies/acceptance; Q14 is cancelled, not passed. Keep
   generic schemas/contexts/cursors/references/hashes/receipts, complete continuation,
   owning original retrieval/verification and stop-on-unavailable/corrupt behavior.
   Historical bounded observations may remain explicitly historical/outside scope;
   do not describe the external compressor as fixed. Preserve truthful run38942838354
   failures/skipped qualification as history, without dynamic latest-CI claims.
   The same valid tests must now pass against exact N5 runtime. Correct wording or
   harness problems without weakening correct assertions or changing runtime.
3. PROVE in disposable exact-candidate copies: separately restore a mandatory
   Headroom dependency/acceptance claim in each document; mark cancelled Q14 passed;
   remove required generic integrity/stop guidance; reinsert exactly the two
   unsupported token lines. Each intended assertion must fail with fixed valid
   tests. Retain the existing stale-example `limit: 100` rejection where its
   authoritative schema assertion is still affected/reused. Restore all bytes.
4. Run fresh focused documentation and existing metadata checks on BOTH pins:
   `rtk proxy node scripts/run-tests.mjs packages/engineer-agent-workflow-mcp/test/tool-metadata.test.mjs tests/product-documentation.test.mjs`.
   This includes actual isolated public-stdio Q17 execution, complete Unicode
   continuations/digest equality, session delivery/resume, tools/list/schema examples
   and verified loaded N5 identity. Validate 16 marked accepted examples against
   actual callable schemas, not merely name membership. Run `rtk proxy npm run lint`,
   scoped `rtk proxy git diff --check` and local Markdown link checks. No blanket
   full suite/build/packed/native run is warranted by this documentation slice.
5. Compose ONE final inventory from saved combined N6 plus I12 content bytes under
   unchanged 751-entry/tracked-set policy. Preserve all unrelated hashes, include
   exact current N6 hashes, update the three I12 target hashes and do not blindly
   merge intermediate manifests. Run the unchanged
   `rtk proxy node .github/qualification/verify-workflow-reliability-inputs.mjs`
   plus existing-policy isolated changed/omitted/unapproved-input negative controls.
   Final changed-boundary cross-checks cover documentation, diagnostics, lint/input
   integrity and unchanged 38-source/83-runtime/dependency/workflow guards. Record
   exact reused evidence domains; do not relabel old Q17/native results as new.
6. Fresh reader/code review answers must identify external non-dependency, cancelled
   Q14, safe stop on missing/corrupt exact data, loaded versus built runtime identity,
   both digest domains and native proof limited to the exact cited snapshot. Root
   separately invokes independent code/security review of the final combined frozen
   candidate, resolves material findings and repeats affected checks only. Recheck
   the approved pins, freeze source/diff/preimages/evidence/combined inventory and
   unchanged guards. Missing terminal receipts or required failed checks remain
   incomplete. Update only packet evidence, sole checklist and current handoff;
   preserve concurrent/prior N6 status and stop.

MANUAL GATE: no service/Headroom call, global change, commit/push/CI or publication
is authorized here. Root requests fresh exact combined snapshot authority only
after local checks and independent reviews. All four actual macOS 15/Windows 2025
× Node 22.20.0/24.14.0 results and native CLI remain required for that new tree.
N5's three passes cannot qualify it; local I12/Q17 does not complete Q16/full I11.

Next action and owner: root independently reviews the exact final combined N6/I12-R1
freeze and resolves material findings. Root obtains fresh exact-snapshot authority
before any commit/push/four native jobs; Q16 stays incomplete.

## Historical I12 execution and amendments

The entries below retain their original evidence and then-current scope/authority.
Their old pending/external requirements do not override the current cancellation,
I12-R1 packet or handoff. Frozen archives and review reports remain unchanged.

## Execution checkpoint — 2026-10-16

Historical implementation checkpoint: READY_FOR_READER before independent acceptance. Final acceptance below supersedes that status. The authorized documentation-only slice
updates the three nearest existing guides and `tests/product-documentation.test.mjs`.
At that historical checkpoint, source requirements were approved/pass/reviewed
with the historical pins recorded in the rebinding note above.

- Preflight: 220 comparisons (134 retained source guards and 86 package members),
  no drift; scoped preimages, tracked/staged/untracked evidence and index digest
  retained under [I12 evidence](../../../../artifacts/workflow-reliability-remediation/i12/).
- RED: the example-schema and new public-stdio Q17 checks failed on missing current
  draft/session/runtime examples. Imports and collection succeeded.
- GREEN: package build passed; the required metadata/documentation runner passed
  10/10 tests. The new example reconstructs Unicode draft evidence, verifies its
  byte digest, exercises both session delivery levels and reads status/resume and
  loaded runtime identity over an isolated public stdio connection.
- Check corrections: synthetic text was reduced to the published input bound.
  Ajv 6 validates product Draft 7 inputs; the runtime diagnostic uses the same
  Zod validator as the server and actual stdio execution, without downgrading its
  advertised JSON Schema dialect or adding a dependency.
- PROVE: restoring a stale document-list example (`limit: 100`) failed the
  authoritative maximum-50 schema assertion; original bytes were restored and
  the final required runner passed 10/10.
- Postflight: all 83 runtime members and all non-output source guards unchanged;
  only the planned package README differs in the prior package inventory. Index
  unchanged, local document links resolved, formatting and scoped diff checks pass.

## Final documentation acceptance — 2026-10-16

This retained acceptance entry records the then-current I12 evidence. The current
platform restoration at the end of this packet supersedes its older qualification
status and execution-permission statements without changing the old archives.

I12/Q17 documentation acceptance is complete. The independent
[fresh reader](../../../../artifacts/workflow-reliability-remediation/i12-fresh-reader/report.md),
[code review](../../../../artifacts/workflow-reliability-remediation/i12-final-code-review/report.md)
and [security review](../../../../artifacts/workflow-reliability-remediation/i12-final-security-review/report.md)
all returned `PASS_SCOPE`; root accepted the exact bindings in the
[final disposition](../../../../artifacts/workflow-reliability-remediation/coordinator/i12-final-review-disposition.json).

- Fresh-reader report SHA-256: `a797c5fc2bf0e3ede407996baf98641cdefde863fb129a6d919a7fb607d55caa`.
- Code-review report SHA-256: `2df5ee5a3e6c017275822194e81b46b207af3154c98d6a23dcf2e31c66373324`.
- Security-review report SHA-256: `889230c0e67ae313852dfa290b1690bdbfa0dfbe3f03420333581ef1ccd67a1d`.

The reader supplied grounded draft/hash/recovery/runtime/compression answers and
independently executed 37 public stdio exchanges on Linux/Node.js 24.20.0. Its
report identifies unexecuted cases explicitly; none becomes an external pass.
Author build, 10/10 focused tests and RED/GREEN/PROVE are retained, not rerun for
status bookkeeping. The original reviewed guide/test preimages remain preserved. This amendment
changes only acceptance wording in two guides under separate review;
runtime/test/schema/generation inputs remain unchanged. Exact reviewed preimages of this packet, todo and
handoff are preserved in
[completion evidence](../../../../artifacts/workflow-reliability-remediation/i12-completion/).
The historical I12 freeze and both review reports remain immutable; their three
status-document hashes identify those preserved preimages, not these new bytes.

No local implementation packet remains pending. Linux-only Q16 retains accepted
Node22.20.0/24.14.0 evidence. Four macOS/Windows combinations are cancelled and
not required, not passed. Full I10/Q14 and I11 remain incomplete: current
registered MCP identity and the automatic compression path remain unverified,
and Headroom retains 29 exact pairs plus nine uncertain outcomes. Extra nine pairs have no authorization. CI delivery, qualification
commit and push are cancelled. No external action is authorized here.

Next required outcome: current registered-MCP/automatic-path qualification;
its external operational owner remains unknown. No macOS/Windows run is required.
No new local packet, cancelled delivery route or permission request is proposed.

## Historical Linux-only acceptance amendment — 2026-10-16 (superseded)

The direct user instruction cancels macOS/Windows qualification without changing
published runtime support. Two guide paragraphs now distinguish cancelled checks,
accepted Linux evidence and the still-incomplete external Q14 boundary. Existing
examples and runtime/test/schema/generation inputs are unchanged. The existing
metadata/documentation runner passed10/10 on each exact Linux Node22.20.0 and
Node24.14.0 runtime, exit0, with no skipped/cancelled tests; no build or full suite
was repeated. The first wording change omitted the existing explicit not-executed
fact and correctly failed Q39; that fact was restored without changing the test.
Historical guide/test preimages, failed attempts and final checks are preserved in
[amendment evidence](../../../../artifacts/workflow-reliability-remediation/linux-only-amendment/).

## Historical platform qualification restoration — 2026-10-16 (superseded)

The later actual instruction restores all four macOS/Windows by pinned-Node checks.
The exact reviewed97 snapshot was committed/pushed under one bounded grant;
run38942838354 failed every native acceptance job8/53, and downstream native
qualification was skipped. I11-N1 local correction is pending; full Q16 and I11
are incomplete. Linux887/109 and the prior focused10/10-per-runtime snapshots
remain historical exact-input evidence, not native results or fresh guide checks.
Nine new explicit Headroom pairs passed, completing38 selected-body observations
across two envelopes with29 older confirmations. The nine old unknown outcomes
remain unknown. The47-pair/140081-byte ceiling and the additional batch are spent;
no retry is authorized. Full Q14 serving identity/automatic path remains incomplete.

The current correction changes factual acceptance/permission wording in two
guides; JSON examples are unchanged. Root separately authorized updating the
existing documentation test's stale not-executed assertion. Actual RED rejected
that assertion against the truthful failed-run guide; the corrected block binds
run38942838354, four actual failures, skipped downstream qualification and the
remaining incomplete result. All other Q39/schema/public-stdio test bytes are
unchanged. The existing focused runner passed10/10 on each exact Linux22.20.0
and24.14.0 runtime, exit0, with no skips/cancels. Four isolated mutations of the
actual new assertion block were rejected. Historical I12/Linux-only guide/test
bytes and reviews remain preserved; no old review hash is attributed to new bytes.
Next action and owner: `qualification_ci_delivery` implements local I11-N1; root
coordinates reviews and concrete new native-delivery authority. The remaining Q14
identity/automatic-path operational owner remains unknown.

## I12-R1 local execution — 2026-10-19

N6 is independently accepted in the root disposition. This local packet consumed
only its three-source patch on a NEW published7aa checkout. All38 source/83 frozen
N5 runtime inputs remain unchanged; current main dist was not used and no build ran.
The three accepted-overlay inputs retain their exact historical provenance; only
the test was installed first while guide/README remained published for genuine
missing-policy RED on both Linux pins. Complete RED also observed absent accepted
schema/draft/session examples, not an import failure or fictional stale gate.

GREEN restores the accepted examples, explicitly excludes external Headroom from
repository dependencies/acceptance, records Q14 cancelled/never passed, retains
all exact machine fields/continuations/fail-closed handling and removes exactly
the unsupported158-byte README promise. Initial GREEN rejected two whitespace-
sensitive regexes on valid Markdown wrapping; the check correction accepts line
breaks without weakening the dependency, cancellation or integrity assertions.
All prior run failures/skipped native facts remain historical exact-snapshot facts.

The final metadata/documentation runner passed11/11 on Node22.20.0 and24.14.0
Linux, including actual isolated public-stdio Q17 and16 marked schema examples.
Diagnostic/lifecycle27/27 passed on each pin. Sixteen isolated mutation controls
detected mandatory external claims in each doc, cancelled-as-passed in each doc,
lost stop guidance in each doc, unsupported README promise and stale limit100.
All source bytes were restored. Lint, scoped diff, local links, one combined751-
entry inventory, both pinned verifier runs, two positive/four negative inventory
controls and unchanged main HEAD/index/source/runtime/dependency/workflow guards pass.
Fresh owning MCP checks before work/completion are pass/reviewed/Approved at the
packet pins. Evidence: [I12-R1 report](../../../../artifacts/workflow-reliability-remediation/headroom-exclusion-final-documentation/report-v2.md).

No full/packed/native suite, fresh CLI entrypoint, build, external service call,
installation, configuration, commit or push ran. Historical N6 actual Q36/CLI
evidence retains its exact input domain, never relabelled as a fresh combined run.
Fresh three-file preimages preserve prior N6 and repaired-planning bindings.
This completes local I12-R1 checks only; final combined code/security reader
answers and exact new-tree native qualification remain root-owned and pending.

Next action and owner: root independently reviews the sealed combined candidate,
resolves material findings and requests fresh exact-snapshot delivery authority.
Q14 is cancelled, never passed; Q16/full I11 remain incomplete until the required
actual four native combinations and CLI qualify the new snapshot.

### I12-R1 narrow review correction

The combined code reviewer found that historical run389 proof text described a
then-pending correction in present tense. Only that guide passage is now explicitly
anchored to the historical snapshot; README already uses historical attribution.
V1 freeze/report/receipts remain immutable and superseded, with exact preimages
resolving changed bindings. Fresh final-v2 metadata/docs11/11 and input verification
pass on each Linux pin. Unchanged N6 diagnostics/lint/PROVE/input-control evidence
is reused in its exact owning-source domain, not relabelled as fresh V2 execution.
The existing inventory preserves all751 entries and updates the one affected guide
hash. Root owns final-v2 independent combined review and concrete delivery authority;
Q16 remains incomplete.
