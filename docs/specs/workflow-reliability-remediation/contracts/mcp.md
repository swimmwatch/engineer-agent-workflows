# MCP reliability contract

Status: Planned (not implemented)
Requirements: WR-001 through WR-014

This document refines the Approved specification for implementation. Existing
machine schemas remain authoritative under `shared/schemas/product.schema.json`;
packets extend that source and regenerate packaged copies. Names described as
**new** are proposed callable scenario names, not available tools. Consumers use
the names actually advertised by their host; no generated MCP namespace is stored.

## C01 — Preserved Technical Design contracts

WR-002, WR-003, WR-013. Keep current TechnicalBoundary/TechnologyChoice and
SourcePin definitions. Decision sources can have empty element_ids; Markdown
sources cannot. Global applicability and named-stage applicability are exclusive.
The runtime still verifies ready PRD lineage, exact identities and provenance.
Invalid input has no effects. I01 proves these existing fixes; it does not create
another validator or new output representation.

## C02 — Structured diagnostics

WR-006, WR-013, WR-014. Retain the protocol-version-2 error envelope and stable
codes. Add bounded `details.issues` with published `path`, category, expected
type/constraint, numeric `minimum`/`maximum` as applicable, and `next_action`.
Preserve existing `limit` compatibility. A subject error includes safe registered
values and a completeness flag; overflow names `product_document_list` with
the selected candidate and its ordinary bounded continuation contract.

The shared diagnostic budget remains 20 issues / 8192 detail bytes; success
structured/wire budgets remain 24 KiB / 64 KiB. Allowed values are derived from
the current candidate registry, numeric bounds from the published schema. Neither
input echoes nor undocumented replacement subjects are acceptable. Error and
discovery output is tested together; an error's suggested action is never executed
automatically. Schema examples carry valid fixture references, not fabricated
real-product identities.

## C03 — Draft record reader

WR-005, WR-008, WR-013, WR-014. **New** `product_candidate_record_get`:

| Input | Meaning |
| --- | --- |
| context | Current opaque product/candidate context |
| candidate_ref | Exact selected product/candidate pair |
| record_ref | Record kind (`decision` or `research`), id, exact positive revision |
| cursor (optional) | Unchanged cursor returned for this exact selected snapshot |

Return a read-only envelope containing record identity/kind/revision, candidate,
`source_object_sha256`, `encoding: canonical-json-utf8`, text portion, Unicode
code-point offset/total, `complete` and `next_cursor`. Text reconstructs the
complete stored record, including nested provenance and associated persisted
fields; no lossy preview is accepted. Hash canonical UTF-8 bytes, not JavaScript
character counts. Keep portions at the existing 4096-code-point maximum and trim
further if the envelope budget requires it. The final cursor is null exactly on
completion. Every cursor binds candidate/version, record identity and digest.

Validate membership in the selected candidate's retained evidence history, not
only product identity. A research record stored using Decision storage retains
its real format and research payload; kind selection cannot reinterpret another
record. Read-only success/error has no operation effects, activation or migration.
Use existing missing/foreign/source/cursor error categories consistently.

## C04 — Serving runtime identity

WR-009, WR-013, WR-014. **New** `workflow_runtime_info` has empty input and a
read-only result: package_version, build_id, contract_id/digest, capabilities and
identity_status (`verified` or `unavailable` with a safe reason). Optional
mutable-disk drift diagnostics must remain distinct from the loaded build_id.
A development version is not a build identity. Capture embedded identity with
the process and freeze it; changing files later does not relabel loaded code.

Build_id covers a deterministic executable/schema payload with an explicitly
documented exclusion for the identity payload itself. A coherent package carries
the matching stamp. Missing or mixed startup metadata yields unavailable, never
a guessed checkout SHA. Consumers inspect capabilities before using new session,
reader, explicit-hash or recheck contracts. Unsupported functionality returns a
concrete refresh/restart requirement, without causing installation or restart.

## C05 — Explicit digest domain

WR-010, WR-013, WR-014. Existing default outputs stay compatible, including strict
old consumers. Add opt-in `representation: explicit-v1` to relevant review
readers/consistency reads; advertise its capability. The legacy default retains
its shape. Explicit output identifies each source by its actual identity and
`source_object_sha256` or source-version digest, with a declared domain, and
uses `verdict_object_sha256` for canonical saved-verdict bytes. Where a legacy
`object_sha256` alias is exposed, it equals the verdict digest and is documented
as such. One source's digest must never be populated from another digest domain.

No storage rewrite, historical hash change or migration on read is authorized.
A new client must gate explicit representation on capabilities; an old client
continues using legacy output. New capability absence is explicit. Removing
legacy meaning is a separately scoped breaking change.

## C06 — Recheck after a successful product review

WR-004, WR-010, WR-013, WR-014. Extend product review with **new**
`mode: recheck`, exact candidate/context and successful `parent_review_ref`.
It does not require invented gap fixes. Server-derived changes/impact and
eligibility are part of the response; caller labels cannot certify harmlessness.
Parent success means completed reviewed coverage with required consistency and
exact compatible retained evidence. Full/gaps-followup retain their semantics.

The resulting inventory partitions current blocks into pending or provisional
inherited results, with complete current atom membership and parent attribution.
Recheck verifies source text, identities, membership, relations and shared evidence,
not text hash alone. Removal/move reconciliation cannot carry obsolete coverage.
New scope/original answers, uncertain influence or missing history rejects
inheritance with a full-review next action. Current corruption remains blocked.

**New** `product_review_scope_expand` takes current context/review and exact
current block keys with a reason. It changes eligibility of inherited results to
pending for fresh independent judgment; it does not invent or replace verdicts.
It rejects foreign/stale keys and is exact-retry safe. Completion requires all
pending judgments, fresh whole-artifact consistency, and current source validation.
The independent reviewer may choose full review; the author cannot mark its own
unread changes harmless. Every response stays bounded and continues as necessary.

## C07 — MCP-first logical sessions and reads

WR-007, WR-008, WR-013, WR-014. Use new logical sessions within the existing product
store, not a new shared application store, conversation database or lifecycle CLI.

| New scenario | Inputs | Outcome/effects |
| --- | --- | --- |
| product_session_open | current context, exact candidate_ref | Validate binding; create a logical session_ref with versioned checkpoint; no product semantic mutation |
| product_session_call | session_ref, expected session revision, request_id, advertised supported scenario, its arguments excluding context | Validate against that scenario, inject current context, execute one caller-selected operation, checkpoint acknowledged result/context |
| product_session_next | session_ref, expected session revision, read_ref | Deliver next bounded exact portion/page and advance only its delivery checkpoint |
| product_session_status | session_ref | Read-only current checkpoint state, version, pending identity and safe effect disclosure |
| product_session_resume | session_ref, expected session revision | C08 recovery of its one retained request; no invented replacement request |

Session refs are opaque identities, not authorization. Restrict dispatch to
registered supported product scenarios, with explicit finite continuation metadata;
prohibit nested session calls, arbitrary commands and hidden skill invocation.
All ordinary tools remain directly available. Do not hard-code host namespaces.
Arguments/outputs pass their original validators. The caller supplies actual
answers and verdict values; session handling never chooses them.

One session is bound to one candidate and has one in-flight request/read delivery.
Its checkpoint stores only exact pending request identity, last valid context,
bounded last acknowledgement and source/cursor progress, with a schema version.
Atomic version checks prevent concurrent overwrite; logical session ownership is
not the operation lock's process session_id. Errors lacking a valid replacement
context preserve the last valid checkpoint. After another writer, status/reopen
inspection precedes an explicitly reconciled call. A refresh does not replay an
old intention against a new snapshot.

All writes use existing safe paths/atomic primitives; no arbitrary path input.
Checkpoint size is bounded by the underlying published request/result budgets
plus fixed identity/progress fields; oversized state fails before dispatch.
No transcript or unlimited response aggregation is retained. Multi-page results
return read_ref and bounded portions; `complete` means all selected source
portions were actually delivered through this session. No summary/receipt alone
can set it true. Dependent exact-read verdicts cannot proceed while their selected
read remains incomplete. Independent reads may use separate session snapshots.

## C08 — Safe recovery

WR-007, WR-008, WR-013, WR-014. State is `acknowledged`,
`delivering`, `pending`, `unknown` or `blocked`; persisted version and
request identity distinguish replay from a new request. Publish read-only current
state and operation_ref where known. Retain exact saved arguments, including
original context and batch order, through an uncertain write.

Allow at most one automatic exact recovery replay per retained request, and only
with declared scenario replay support plus validated retained effect evidence.
Use existing operation inspection/result replay; an input or context change is
a new caller-authorized request, never a retry. Interrupted/incompatible/expired
or uncertain operation evidence, active locks and RECOVERY_REQUIRED stop dependent
writes and return the safe recovery action. No general operation-abandon, lock
deletion or guessed resume API is added. A repeated explicit resume can inspect
again, not reset the automatic replay counter. Checkpoint failure after a real
write is unknown until its actual operation result is reconciled.

Cancellation stops dispatch of new work, retains a checkpoint and discloses
uncertain in-flight effects. It cannot undo an acknowledged product mutation.
Commands, if later demonstrated necessary, use existing runtime startup where
possible; any new command needs the WR-007 streams/status contract and bounded
scope, not a new installer.

## C09 — Architecture readiness

WR-011, WR-013, WR-014. Canonical Technical Design skill presents the diagram,
component/state ownership and flows; inventories accepted choices; records actual
material technology answers; and labels unverified integrations before readiness
checking/review. Proportionate N/A reasons avoid stack inflation. Existing
technical boundary/technology/policy records carry evidence. Do not add an
automatic semantic-approval tool. Canonical templates generate both host bundles;
host-independent obligation remains in the mandatory entrypoint.

## C10 — Lossless external boundary

WR-012, WR-008, WR-013, WR-014. Preserve the exact machine-data envelope through
structured delivery or bounded original retrieval. Validate the expected schema,
identity, digest and continuation before consumption. Literal compression-marker
text inside explanatory prose is legal; a marker replacing an opaque field or
the required original body is not complete content. Never increase server response
limits to evade external truncation. A failed restore blocks dependent work and
identifies the boundary, without marking saved business effects absent.

Q13 repository contract and fault-injection checks remain required and retain
accepted final evidence for unchanged inputs. External Headroom is not a repository
dependency. Q14 qualification is cancelled / no longer required by the explicit
2026-10-19 scope amendment, never passed. Service ownership, external loaded
connection identity, automatic compression capture and new external tests are
outside this delivery. Historical bounded observations do not claim a Headroom fix.
Generic response limits, exact selected-source reconstruction and complete
continuations, safe recovery and the prohibition on false completion remain intact.

## C11 — Qualification and compatibility

Current N6 diagnostic correction under WR-013/WR-014 is bounded by the
[qualification diagnostics tests](../../../../packages/engineer-agent-workflow-mcp/test/qualification-diagnostics.test.mjs).
The actual alias exec owner reports finite safe child-case/deadline/elapsed,
nullable numeric/allowlisted code/signal/killed presence, byte counts and bounded
inner numeric TAP summary before rethrowing the identical original failure.
Missing/null/false are distinct. No raw output/message/path/env/PID/context,
arbitrary getters/proxy traps or duration-based timer attribution. Diagnostic
failure cannot alter original failure, success assertions, later cases or cleanup.
Child90s/parent120s/1MiB, arguments/environment, workload/call count and all current
lifecycle/security/response guards are unchanged. New helper/API/runtime behavior
is not needed. Actual-owner RED/controls and focused evidence precede separate
reviews. The underlying Win22 cause remains unknown; local diagnostics do not
complete Q16. I12-R1 baseline recovery is pending separate audited input evidence;
N6 reviews precede that packet and the eventual single-manifest composition.

Current scope2026-10-19: Q14 is cancelled, not passed; all four actual Q16 native
combinations remain required. N5 commit7aa9c0b886522c23ace4728d702138d3dfa43f9f/
tree3a72313e5619d9700dec3beb95c6d9ce8b5f8fdd/run39221641935 is one exact evidence
domain. N5 run39221641935 passed macOS22/macOS24/Windows24; Windows22 acceptance failed78/80 (one nested Q36 public-qualification child plus its parent), native CLI skipped. Inner cause and timeout are not established. Root/native collector owns final evidence acceptance; n6_windows_q36_diagnosis owns read-only diagnosis. Q16/full I11 remain incomplete. N6 addresses proven diagnostic loss only; I12-R1 baseline recovery is pending. No speculative cause repair or public action is authorized. I12-R1 changes existing
qualification docs/test hashes, so strict input verification and fresh exact-snapshot
publication authority plus all four actual native results apply to its later tree.
No old/partial/local pass certifies that tree and no docs exemption is introduced.

Historical N5 planning/checkpoint statements below preserve their original timing;
their old Q14 conditions do not override cancellation or current handoff.

Historical I11-N5 is test-only diagnostics under WR-013/WR-014, not a new MCP response contract. N4 commit9ef2000/run39133271930 passed macOS22/macOS24/Windows24 integration77/77 and native CLI; Windows22 failed one packed cleanup hook (76/77), native CLI skipped. Its underlying disposer/cause remains unknown. These are retained point-in-time observations, not current native acceptance.

The existing qualification owner must expose bounded safe failure identity/category through its diagnostic channel without changing `after(callback)`, LIFO/all-attempt cleanup, exact original errors/AggregateError order, PID-observation error precedence, cancellation/positive-owned-PID/natural-exit guards or budgets. Actor/root/smoke categories come from actual owner boundaries; native codes cannot identify an owner. Unknown labels/codes become fixed fallbacks; no message, stack, path, filename, PID, context/cursor, environment or arbitrary property is copied. Sink/classifier failures cannot replace a cleanup error or stop later disposal. The exact test-only finite enums and projection bounds live in the [qualification diagnostics helper](../../../../packages/engineer-agent-workflow-mcp/test/support/qualification-diagnostics.mjs), not public product schemas. Existing cleanup-end remains a finally completion notification, not a success verdict.

Local acceptance corrects diagnostic loss only. Preserve every existing119-item/lifecycle/recovery assertion. Both pinned Linux runs and meaningful redaction/owner/error-identity proof precede separate independent reviews. Fresh exact-snapshot commit/push/four-job authority is required before further native execution; Q16 remains incomplete until actual required results pass. Q14 loaded identity/automatic-path evidence remains separately incomplete with unknown operational owner and pending supported-capture clarification; no further service request is allowed.

Historical I11-N4 preserves N3 lifecycle/source/API contracts. Native recovery fault injection uses standard path joining and must prove it fired; before/after dispatch0/1 and effects1 remain required. Public reliability uses bounded redacted public/packed diagnostics and a Windows-only1200s technical bound (others600s), matching existing packed selection. Workflow30/20min is unchanged. N3 run39121206736 passed macOS71/71; Windows public600s timeout and missed fault hooks leave Q16 incomplete. Controlled path simulation is never native evidence.

Historical I11-N3 qualification retains all119 review items and requires actual owned actor child exit on cancellation, no post-abort launches/requests, cleanup of all owners before directory removal despite one disposer failure, and truthful aggregated failures. Local real-process checks on both pinned Linux runtimes precede any Windows-only technical budget amendment (1200s packed/30min native job; elsewhere600s/20min). Actual Windows qualification remains incomplete after run39114292390; no product latency SLO is introduced. Local N3 evidence preserves all119 items, registers directory disposal before allocation settles, rejects post-disposal registrations, and validates positive decimal safe-integer fixture PIDs before emergency signals. Its71-case local coverage is explicitly66 unchanged integration cases plus final5 lifecycle cases; final actual CLI checks cover the existing after-only adapter on both pinned runtimes. Final independent reviews and required native runs remain separate.

WR-001 through WR-014. Existing local-only storage, security/path/locking rules
and retained evidence remain in force. Reads have no migration effects. Session
checkpoints are new opt-in state; unsupported runtimes do not reinterpret them.
Keep immutable history for rollback. No automatic deletion, global configuration,
release, cross-computer coordination or new durability promise.

Run owning-layer tests, public stdio, packed package, generated-host checks,
actual host trials with separate results; external Q14 is cancelled. Required
qualification is Linux plus macOS 15 and Windows 2025 at Node.js 22.20.0 and
24.14.0. N4 passed three actual native combinations; Windows22 packed cleanup failed and its downstream native CLI was skipped. Retained Linux887/109 snapshots and later focused
documentation checks remain separate exact-input domains, not native passes.
Thus full Q16 and I11 remain incomplete. The one exact reviewed commit/push/four-job
grant is consumed; I11-N1 permits only a bounded reversible local test-support
correction, followed by independent review and concrete authority for any new
public delivery/native rerun. No runtime path-security guard is weakened.
Nine additional explicit Headroom pairs passed bounded selected-body verification,
but full I10/Q14 serving-MCP identity/automatic-path proof remains incomplete.
The additional nine-pair budget is spent; it does not authorize further calls.

## C12 — Developer/operator documentation

WR-001, WR-004 through WR-014. Extend the nearest existing authoritative docs
after integrated behavior is verified. Explain draft/ready selection, review modes,
digest domains, context handoff, safe replay, loaded runtime identity and external
proof limits, including external Headroom non-dependency and cancelled Q14 without
weakening exact-data checks. I12-R1 consumes three audit-pinned accepted historical
guide/README/test inputs on published 7aa plus the independently accepted N6 patch,
using exact frozen N5 runtime, not current main dist. Test-first applies only the
prepared test while docs remain published for meaningful missing-policy RED; GREEN
restores accepted examples, changes obsolete external-gate wording and removes only
the two unsupported README design-token lines (158 bytes). Its current packet owns
exact input hashes and sequencing. Preserve original accepted inputs and N6 status;
this recovered I12 input status supersedes earlier baseline-pending notes in C11
and the unchanged N6 packet without changing N6 scope or execution prerequisites.
Fresh Q17/schema/tools-list/public-stdio and combined exact-inventory evidence plus
independent reviews are required. Historical Q17 results are not new-tree passes.
Validate executable examples and a fresh reader's answers. Do not advertise proposed
tools as implemented or unavailable external checks as passed.
