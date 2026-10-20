# I10 — Guard exact MCP payloads

Status: Repository Q13 acceptance complete from retained final reviewed evidence; Q14 cancelled, not passed
Dependencies: I03, I07, I08
Requirements: WR-012, WR-008, WR-013, WR-014
Quality scenarios: Q13; Q14 cancelled by the 2026-10-19 scope amendment

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
only WR-012, WR-008, WR-013, WR-014 through requirement_get using the pinned specification_version,
following every text/reference continuation. Read [C10](../contracts/mcp.md#c10--lossless-external-boundary) and only the named entries in [quality/scenarios.yaml](../quality/scenarios.yaml).
These versioned contracts, not chat history, are the acceptance inputs.

Require a usable Git worktree with readable status and scoped tracked, staged and
untracked evidence. No clean tree or existing commit is required. Capture the
pre-edit state, preserve unrelated changes and reverify the source passages below.
Dependency readiness means recorded passing acceptance evidence for I03, I07, I08, not merely a checked label or a commit.
Also update only this packet's execution evidence, todo.md and current handoff.md.

## Outcome, boundary and scope

Owner: Repository session input integrity. External service ownership is outside this task.
Allowed production ownership: Repository scope: `src/product/sessions.ts`, `test/transport.test.mjs`, `test-support/stdio-harness.mjs` only when a reusable fault hook is needed, proposed compression-contract test. External source/configuration scope is not established.
Paths beginning src/, test/ or test-support/ in this packet are relative to
packages/engineer-agent-workflow-mcp/; all other paths are repository-relative.

Evidence to reverify: `packages/engineer-agent-workflow-mcp/src/server.ts:61` bounds structured success output and wire size. `docs/product-workflows.md:255` distinguishes receipts from semantic reading. The reported external original-retrieval failure is historical context, not a required repository dependency.

Implementation boundary: Validate schema/critical fields and complete-read identity at the consumer boundary; use a test adapter that truncates JSON, replaces opaque fields, alters a digest or returns recursive compression markers. Reject markers only where the expected schema demands exact machine data, not legitimate quoted prose. Use structured transport or verified bounded original retrieval; never raise MCP response limits to mask loss. Keep repository integrity results separate from historical external observations. Do not vendor, fork, reconfigure or qualify Headroom under this repository scope.

Non-goals: unrelated worktree changes; changing approved behavior or scope;
global configuration, installation, commits, releases; hand-editing generated
bundles or MCP-owned workflow YAML; executing any next packet. New behavior is
not authorized until this packet is explicitly invoked.

## Test-first acceptance and proof

1. Create a fixture corpus with nested schemas, all critical opaque fields, Unicode, large records and literal marker text in ordinary prose. Round-trip losslessly through the exact consumer and assert semantic/byte identity as appropriate.
2. Inject each lossy transformation separately and demonstrate a failed integrity/completeness observation before dependent writes/verdicts; PROVE by disabling one guard in isolation.
3. Through the supported MCP response/continuation contract reconstruct the exact selected original with complete identity and portions. Reject truncated JSON, substituted critical fields/digests and unresolved markers without dependent completion.
4. Retain the accepted Q13 final review/source bindings. Q14 is cancelled and no longer required, not a passed external qualification; no new external experiment is planned.

Tests to create in this packet: `packages/engineer-agent-workflow-mcp/test/product-compression-contract.test.mjs`.
Run the focused command after creating its discriminating checks and before
implementation; new filenames below are planned, not currently existing scripts.
Then implement, correct code until the valid assertions pass, and run required
PROVE. For an absence/structural claim use the stated actual snapshot/counter/trace,
not a copied implementation constant. A harness/import failure is not RED proof.

```sh
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node scripts/run-tests.mjs packages/engineer-agent-workflow-mcp/test/transport.test.mjs packages/engineer-agent-workflow-mcp/test/product-sessions.test.mjs packages/engineer-agent-workflow-mcp/test/product-session-recovery.test.mjs packages/engineer-agent-workflow-mcp/test/product-compression-contract.test.mjs
```


The focused command checks the repository contract. Accepted unchanged Q13 evidence is reused only for its frozen inputs; the scope cancellation does not require repeating passing tests or executing an external path.

Focused pass is necessary, not permission to skip a material shared-boundary test.
Broaden only for changed shared boundaries, new failures or unresolved evidence.
Record actual environment, commands, RED/GREEN/PROVE results and observed side
effects. A missing or failing required check keeps this packet incomplete.

## Compatibility, recovery and manual gates

Repository guards fail closed without altering existing stored content. Response bounds,
exact owning-source equality, continuation/read-credit checks, cached retransmission,
one-recovery allowance and no-write-before-verification remain unchanged.

Q14 external remediation and its former owner/version/configuration/manual gate are
cancelled by the explicit user decision. This is not an external pass and does not
authorize any external request, global change, installation or publication.

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



## Current retained acceptance — 2026-10-19

The final accepted Q13 source/test bytes, independent code/security verdicts and
historical evidence remain unchanged. The [closure audit](../../../../artifacts/workflow-reliability-remediation/post-headroom-closure-scout/report.md)
verified the three final source/test members against main and published N5 (6/6),
339 immutable evidence/archive references and the accepted 270/270 focused result,
112/112 owning-reader matrix and 100 intended guard-disabling failures. Those are
retained historical executions, not new tests. Final reviewed freeze SHA256:
`136ab084cf9cb6984d0f955968ae5fff518cdccc528fcdfb29e9a51bb1133da5`.
Q14 is cancelled / no longer required, never passed. I11 remains governed by its
own integrated/native checks; Q16 is not cancelled. Older entries below preserve
then-current external obligations and authority only and cannot restore Q14.

## Historical bounded qualification state — 2026-10-16 (superseded)

The separately authorized additional nine compress/retrieve pairs executed once
and passed exact selected-body verification; the independent review is PASS_SCOPE
for that bounded evidence only. The [report](../../../../artifacts/workflow-reliability-remediation/headroom-additional-nine/report.md)
and [review](../../../../artifacts/workflow-reliability-remediation/headroom-additional-nine-review/report.md)
retain actual receipts and budget: nine new pairs/27164 bytes,38 effective selectors
with29 older confirmed selections across two envelopes, and at most47 cumulative
pairs/140081 bytes including all uncertain old dispatches. The nine older outcomes
remain uncertain. The additional grant is consumed; no external retry remains
authorized. Serving-MCP identity/configuration/causal binding and the automatic
compression path remain unverified; their external operational owner is unknown.

The four native combinations are required again and actually failed acceptance;
I11-N1 owns the separately authorized local correction. Full I10/Q14 and I11/Q16
remain incomplete. Earlier cancellation/no-additional-budget statements below are
historical point-in-time records, not the current execution grant or acceptance.

## Historical Linux-only qualification amendment — superseded

Required platform qualification is Linux only. Linux Q16 retains accepted
Node22.20.0/24.14.0 evidence; the four macOS/Windows checks are cancelled and not
required, never passed. I12/Q17 is complete. Full I10/Q14 and I11 remain incomplete
for the unchanged external compression gate, with its operational owner unknown.
Historical entries below preserve their original pins and point-in-time delivery
statements; they do not restore cancelled requirements or supersede this status.

## Execution evidence — 2026-10-12

Local consumer guards are implemented in sessions.ts without a new API, dependency,
persistent format or response-limit increase. Published output schema validation,
complete owning candidate/review/context equality, and current mutation-context
binding validation precede acceptance/adoption. Cached exact retransmission is
unchanged; corruption retains prior read checkpoints or unknown actual write effects.

Required focused command: 136/136 pass on Ubuntu24.04.5/Node24.20.0. Workspace build,
lint, generation check17 and complete validation17/17 pass. Corrected-harness
isolated baseline RED:53 tests/48 assertion failures; three isolated schema/owner/
context PROVE mutations fail their intended observations. Original harness failures
and subsequent corrections are retained separately.

Exact evidence: artifacts/workflow-reliability-remediation/i10/report.md,
focused-frozen.log, prove-frozen-results.json, and freeze.json. Source deltas use
captured/recovered preimages because the inherited source/test files are untracked.
Owning specification preflight/completion checks pass with all linked requirement
and exact decision continuations consumed; versions remain unchanged.

Q13 frozen public/owning originals include nested schemas, exact opaque fields,
Unicode decision/research records, required1/optional12 pins and complete ordered
continuations. Q14 exposed the same38 bounded units through actual automatic
Headroom:13 critical replacements/7 distinct hashes; advertised originals matched,
65 readable bounded original segments were exposed, and all3 corpus files rebuilt
byte/SHA identical. This positive observation does not close Q14: loaded integration
identity/complete configuration/owner and separately scoped controlled live fault
evidence remain absent. The earlier actual Content-not-found receipt is retained.

I10 remains unchecked. Coordinator owns both independent final local reviews and
any subsequent correction dispatch. External operational ownership is unknown;
no external mutation or duty for the user is assumed. Independent I11 local work
may proceed only after both local reviews under execution-workflow.md; full I11
still requires the schema-inventory correction/full suite/native matrix, and I12
retains its verified-I11 dependency.


## Independent-review correction F1 — 2026-10-12

Both original final reviews returned CHANGES_REQUIRED for known operation identity
loss. sessions.ts now rejects a foreign/null acknowledgement for an already computed
candidate-evidence-v1 operation and preserves that identity against foreign exception
metadata. Operations without a computed identity retain their existing behavior;
no global null/replayed-flag requirement or new retry eligibility was added.

Test-first RED:11 observations/6 pass/5 fail counting parent tests; targeted GREEN11/11.
Final required four-file suite147/147, workspace build/lint, generation17 and
validation17/17 pass. Isolated ack/exception identity PROVE mutations each fail their
intended assertion, with exactly1 durable effect and the one-recovery/cached-delivery
controls preserved. Owning pre/post specification checks and all requirement/decision
continuations pass unchanged. Evidence: artifacts/workflow-reliability-remediation/
i10-correction/report.md, focused-final.log, prove-results.json and freeze.json.

Original i10/ reviewed evidence123 files and initial review anchors remain byte-identical;
new freeze binds reused immutable inventory and complete corrected source/docs/evidence.
Live Headroom/corpus was not rerun because the bounded correction does not change those
owning outputs. Q14/full I10 remains incomplete. Coordinator owns both new independent
reviews; external qualification operational owner remains unknown.


## Independent-review correction F2 — 2026-10-12

Corrected reviewers verified initial acknowledgements could alter nested result
operation/decision ID/revision while keeping the outer operation and context exact.
For known candidate-evidence-v1 dispatch, sessions.ts now uses existing read-only
inspectCompletedProductReplay with exact computed identity/scenario/intent and compares
the complete immutable owning result before adoption. No verification redispatch;
F1 identity/error preservation, unknown effects, one recovery allowance, cached exact
redelivery and unknown-before-dispatch scenario behavior remain unchanged.

Test-first RED11 observations/2 pass/9 fail counting parent tests; eight schema-valid
body mismatch assertions fail. applied:false is already schema-invalid baseline.
Targeted GREEN11/11; mandatory four-file suite158/158; workspace build/lint,
generation17/validation17 pass. Isolated current-test owner-equality PROVE restores
the eight intended failures; exactly1 real effect survives safe recovery, cached
resume dispatches0. MCP pre/post owning checks and all continuations pass unchanged.
Evidence: artifacts/workflow-reliability-remediation/i10-owning-result-correction/
report.md, focused-final.log, prove-results.json and freeze.json.

Original123 and correction1 42 evidence entries, inherited reports/inventories and
archived reviewed inputs remain byte-identical and are bound in the new freeze.
Headroom/corpus was not repeated: owning bodies/schemas/honest results did not change.
Full I10/Q14 remains unchecked with external loaded identity/configuration/owner/live
fault gate unknown. Coordinator owns both fresh final reviews and any further sole-
writer corrections. I11 has not been released; no external duty is assigned to user.

## Independent-review correction F3 — 2026-10-12

Both F2 final reviews found remaining schema-valid substitutions in registered
ready-source/document readers. sessions.ts now composes the existing owning
document-list, element/decision-find and element/decision-get readers with exact
injected context/selectors/filters/limit/cursor and compares their full public
envelopes before accepting initial or continued pages. Each new source page has
one additional owning-reader invocation, whose I/O follows the existing owner;
cached delivery invokes none. No API/schema/limit change. F1/F2 identity,
complete mutation result, one-effect recovery and cached no-read guards remain.

Three fixture precondition failures are preserved separately, not claimed as RED.
Corrected test-first RED112: 11 pass/101 fail, including100 intended Missing
expected rejection assertions. Explicit decision sibling controls execute initial,
middle and terminal pages. Targeted GREEN112/112; isolated exact-current-test
F3 owner-dispatch PROVE reproduces100 intended failures and removes its sandbox.
Required four-file suite270/270, build/lint, generation17 and validation17/17 pass.
Initial refusal restores the exact prior checkpoint/inventory; continued refusal
preserves accepted incomplete state/no credit; honest outputs equal direct owners
and cached resume adds0 dispatch/change. Expanded fixtures are storage-seeded,
not Q15 public-authoring qualification; original corpus/defaults remain unchanged.
Owning MCP pre/post and all requirement/decision continuations pass unchanged.

Evidence: artifacts/workflow-reliability-remediation/i10-ready-source-correction/
report.md, focused-final.log, red-green-prove-results.json and freeze.json.
Original123/F1 42/F2 41 evidence inventories, prior reviews/freezes and all18
archived source/doc inputs plus manifests remain byte-identical and bound.
Live Headroom was not rerun because schemas/honest outputs are unchanged.
Full I10/Q14 remains unchecked: loaded integration identity/configuration,
external operational owner and controlled live fault evidence remain unknown.
Coordinator owns both fresh final reviews and sole-writer correction dispatch.
I11 remains unreleased; external owner unknown; no new duty assigned to user.

## Coordinator final local review disposition — 2026-10-12

Code review PASS_SCOPE and security review PASS cover the complete frozen local
I10 after F1/F2/F3 corrections. Reports: artifacts/workflow-reliability-remediation/
i10-ready-final-code-review/report.md and i10-ready-final-security-review/report.md.
Coordinator independently verified 394 hash/size comparisons over 372 distinct
paths, with zero mismatch, and the unchanged approved/pass/reviewed specification.
Disposition: coordinator/i10-final-review-disposition.json under that artifact root.

Final reviewed freeze: i10-ready-source-correction/freeze.json, SHA256
136ab084cf9cb6984d0f955968ae5fff518cdccc528fcdfb29e9a51bb1133da5.
All six reviewed source/document bytes are archived in coordinator/i10-final-reviewed-inputs/
with its JSON manifest. Subsequent status-only bookkeeping does not replace the
reviewed originals or change production/test bytes.

Local I11 is released according to its explicit dependency allowance. Full I10/Q14
remains unchecked: loaded external identity/configuration/owner and controlled live
fault evidence are missing. External owner remains unknown; no user duty or external
mutation authorization is inferred. I12 still requires fully verified I11.
