# Specification Completeness Qualification

## Review Context Conflict Regression (2026-09-08)

NMA-185 session evidence isolated an orchestration defect: an observer repeated
`specification_review_start` for an unchanged unfinished review, and the
generic mutation path rewrote `decisions.yaml` with a receipt. That changed the
document version and invalidated the reviewer's otherwise current context.

The regression fixture uses independent author, reviewer and observer MCP
clients over one synthetic specification. Before the fix it failed because the
observer's returned context had a different decisions version. The implemented
path validates inputs under the existing lock and returns unchanged review
state without a write or receipt. Read-only
`specification_review_status` reports progress from a consistent snapshot.
Focused tests prove no-op byte/version stability, observer isolation,
pending/reviewed/gaps/stale/NOT_FOUND status, and preservation of a genuine
concurrent-write `CONFLICT`. The MCP suite, full `npm test` (zero failures,
132004 ms), lint, foundation validation (13/13), both-host generation/check,
generated skill validation and `git diff --check` passed.

A fresh `gpt-5.6-sol` author created the isolated Lite/core specification
`canonical-json-cli` and review
`904d2756-51cf-4029-b0a7-3f2a9a92889e`, source version
`fb905c930e13ac2847cdb13e5e11e1c30e76128fde7698747041ec8736b0b83a`.
The first separate Sol reviewer opened it but recorded no verdict before its
bounded diagnostic ended. A second fresh Sol reviewer then resumed the same
unchanged review and completed all 9/9 items with the durable `gaps` outcome.
Its one finding belongs to `profile:core` and references CLI-001/CLI-005; the
finding is preserved rather than rewritten into success. Independent
`specification_review_status` observations before and during review kept the
same saved/current source and specification versions. The reviewer completed
without a context conflict, proving the orchestration path while making no
claim that the synthetic specification itself had complete profile coverage.

Status: Complete for the agreed implementation and focused qualification,
including the explicitly authorized normative-specification reconciliation.
This does not qualify the former full application matrix, Sol/Terra, or live
Claude/Penpot. No global setup, installation, commit or publication is included.

## Scope And Evidence Method

The approved four-checkpoint work separates deterministic coverage, independent
semantic preservation and active-profile completeness. Source authority is the
user's preserved implementation request in the specification-completeness
decision ledger. A subsequent explicit answer permits check-state to remember an
observed Approved transition without itself assigning approval.

Before changes, the full npm suite passed and a private persistent baseline
archive was retained outside the repository. Existing unrelated dirty-tree
changes were not reverted. A historical compound-clause report with 46 IDs
motivated semantic testing. Its claimed omissions were independently audited
below rather than assumed to be a valid oracle. Structural links alone still
cannot establish semantic equivalence; negative fixtures must actually differ
in behavior, not merely lack particular examples or wording.

## Deterministic Checkpoints

The final independent audit reproduced a legacy-fallback boundary: after review
enrollment and removal of all requirement definitions, both
`decision_link_requirements` and `decision_record_instruction` still accepted
a prose-only ID. Check-state rejected the resulting invalid specification, so
there was no false final approval, but the link-writing operation was wrong.
Two new stdio tests first failed because the calls succeeded. The shared
requirement verifier now uses definition-only validation for enrolled journals
even when no definitions remain. Both calls reject the ID without changing the
journal; an unenrolled legacy positive control still passes. The focused result
is 3/3 GREEN. Campaign 04 was stopped and retained as candidate-superseded, not
as a model failure or an accepted qualification pass.

`packages/engineer-agent-workflow-mcp/test/completeness.test.mjs` and
`completeness-protocol.test.mjs` exercise the actual SDK/stdio server, not text
matching against a prompt. Established RED-to-GREEN cases include:

- A prose/quote/code-only ID previously passed as a definition. Structural
  Markdown definitions now distinguish it, including nested text and Unicode.
- An unlinked source and unsupported requirement were not surfaced. Enrolling
  the new review now makes both blocking, with legacy explicitly exempt.
- Independent protocol checking found that a partial `revises` answer hid its
  original broad answer. Source materialization now follows revision ancestry
  and related instructions; the version includes that source history.
- A requirement with 600 decision refs exceeded the response limit with no
  usable continuation. Text and refs now share a bounded complete cursor walk.
- New mechanical checks accidentally blocked old heading-based specifications.
  Legacy checks retain their previous semantics until enrollment, including old
  repeated/empty Markdown headings; new readers/reviews require valid definitions.
- A seen Draft-to-Approved-to-Draft cycle reused the old pass. Check-state now
  persists the observation and the downgrade remains stale after restart.
- A 13,200-character source request exceeded the first instruction tool bound.
  The explicit 65,536-character limit preserves it exactly through bounded reads.

Additional checks cover missing verdicts, counterexamples, real evidence refs,
context exclusions, missing answers, duplicate definitions, changed inputs,
cross-project cursors, exact retries after lost replies, service-record exclusion
from product search and no copies of specification text in review metadata.
The earlier 28-test protocol/compatibility run passed 27; its one remaining
fixture incorrectly attempted an overwrite before following the new continuation.
The corrected targeted suite passed. A premature pre-build run against old dist
is excluded from evidence.

## Skills And Artifacts

The canonical specification entrypoint routes to an independent completeness
reference; it does not import a new skill or inactive profiles. The interview
owns instruction capture, Draft, links, full review and automatic approval.
Shared state instructions and planning/packet references pin review and source
versions. Incremental keeps one explicit packet, test-first, and no review or
commit gate. Host-specific guidance is generated, not maintained separately.
The skill-creator guidance influenced this split: reviewer-only instructions
are a targeted reference; MCP schemas are not copied into the main skill.

The machine-readable MCP contract is generated from executable Zod definitions.
The packed inventory explicitly includes requirements/reviews runtime modules.
No universal YAML editor or execution registry was added.

## Current Validation

After the final enrolled-link fix, the complete `npm test` run passed 245/245
with zero failures and zero skipped tests (135,159 ms). The independent reviewer
rechecked the fix and found no remaining confirmed findings in the inspected
scope. Build, lint, foundation (13/13), generation check, affected Codex validators,
skill-size limits, and `git diff --check` also passed. The earlier 242-test result
below belongs to the preceding runtime candidate.

- Build and lint: passed after implementation fixes.
- Foundation validation: complete validation passed, current catalog 13/13 skills.
- Generation and generate:check: passed for both clients.
- Affected Codex specification/planning/incremental quick validation: passed.
- Specification entrypoint size: Codex 3,996 bytes; Claude 4,013 bytes.
- Git diff --check: passed at this checkpoint.
- Full `npm test`: passed, 245/245, zero failures and zero skipped tests, after
  the enrolled-link regressions and the conditional-profile reviewer correction
  (`npm-test-materiality-candidate.log`, 175,169 ms). The earlier 245-test run
  (`npm-test-qualified-candidate.log`, 130,780 ms) preceded that last reference
  correction. The 242-test run
  preceded those final regressions; 253-test/16-skill results describe an older
  catalog. An
  earlier completion-step assertion was adapted to its new heading without
  weakening required-check assertions.

## Model Qualification

Explicit isolated Astra/high trials are in progress against frozen generated
skills and MCP runtime. Each case gets raw sources and current target artifacts,
not the evaluator's expected findings. Cases cover the original three omissions,
preserved IDs with lost conditions, equivalent paraphrases, Lite/UI-API, correct
context exclusions, partial edits and fresh-context resume. Two consecutive
passing rounds with no intervening skill changes are still required. Earlier
Sol/high diagnostics and the escalation rationale are retained below; Astra
results do not qualify Sol.

The real bundle was independently checked through its 20-item MCP inventory.
Review `953fb4ae-ffe1-47ef-bade-41615d36b664` recorded 11 covered, 8 gap and one
valid context exclusion. Missing explicit contract details in the initial compact
specification were restored from the original source. A new independent run
`035bab1c-180d-48a6-9dce-3646398aac45` identified two remaining conditions:
source capture must precede transformation into requirements, and two failed
repairs require agreement on the next approach, not discussion alone. These
were restored. The fresh independent review
`6a3a6b61-4e1b-4091-8865-cf376c40209d` read all 20 items and continuations,
recorded 19 covered verdicts and one valid context exclusion, and completed as
`reviewed`. Check-state passed both before and after the author's Approved
transition. This is a recorded independent agent judgment, not proof of semantic
correctness or successful qualification of the implementation.

An additional stdio regression reordered a related decision reference from
`{ id, revision }` to `{ revision, id }` without changing its meaning. Before the
fix it failed with `BROKEN_REFERENCE`; after normalizing the lookup through the
existing reference constructor, the same full predecessor evidence is returned.
The repository regression, independent fixture, complete protocol suite and lint
passed. The candidate runtime was re-frozen before new model trials.

A further independent audit reproduced an observed status downgrade while a
review was still pending: after restart the same run could incorrectly finish
as reviewed. A new stdio test first failed with `pending` instead of `stale`.
Approval observation now applies to unfinished as well as completed runs; it
still never changes the author's status or converts pending work into approval.

The first historical compound-clause trial is excluded from acceptance because
its planning-artifact scope and historical manual traceability table did not
match its actual MCP sources. Its original inputs and full report are retained.
The replacement fixture has automated exact-source, 46-requirement,
scope/artifact, reference and permitted-diff preflight checks. Only stale manual
links were removed; product requirements and the review guide are unchanged.

The replacement historical trial completed 54 review items and reported one
profile-level concern about completed replay-job retention. The expected three
counterexamples were absent. An independent oracle audit then established that
the historical requirement text already disallows identity override and
completion-only replay accounting, and that JSON media type is not exact
Content-Type string equality. Absence of these findings is therefore not a
demonstrated skill failure. Missing adversarial acceptance examples must not be
misclassified as absent behavioral obligations.

The user explicitly approved controlled clause deletions for negative fixtures,
preserving the original source answers and IDs and withholding mutation hints
from the reviewer. This answer is persisted as decision
`2f77d5a9-05bd-4394-9500-2d17ba7671d2@3`, linked to `VAL-001`. The real bundle
completed fresh review `47aff8ca-cbc6-44dd-af27-90a40ff8c104` after that source
change: all 21 items and continuations read, 20 covered and one valid context
exclusion. Check-state passed before and after the author-made Approved status.
No reviewer-guide change is justified solely by the invalid historical oracle.

The controlled case01 negative and the separate optional-charset negative/positive
pair passed independent entailment audit. The pair preserves HTTP normalization
and differs only by its charset allowance, avoiding a false literal-header oracle.
Campaign 03 passed all 16 MCP fixture preflights and 9/9 harness selftests with
the frozen candidate. Its first three model runs were then stopped when the
user asked to continue later. Partial traces and ledgers are preserved; no full
qualifying pass has completed and interrupted runs are not model failures.

## Resumed Model Diagnostics

Campaign 05 completed four diagnostic cases on the corrected runtime. The large
controlled negative found the role-permission and response-media omissions but
missed the deleted `replayedEvents` definition and intermediate-work obligation.
The positive charset control produced a false profile finding that invented an
unquoted-UTF-8-only restriction. Independent source/specification adjudication
rejected that finding. Native transport checks confirmed full reference reads
and complete source continuations, so local output truncation did not explain
these results. This campaign is not an accepted qualification pass.

The Lite positive also raised a legitimate missing invocation-contract question:
its sources described an existing validator without identifying or explicitly
preserving its command. That fixture was insufficient for a definitive no-gap
oracle. The simulation source and requirement now preserve the same explicit
command, with no options or prompts; the core profile was not weakened.

The reviewer reference received two narrow corrections: compare every material
independent obligation in compound sources against actual requirement clauses,
and reject a proposed counterexample if it already violates an applicable
permission, prohibition or preserved contract. Negative mutations and the
charset negative/positive pair were not changed. Both client bundles were
regenerated; the new campaign must complete two fresh stable passes.

## Remaining Qualification Limits

Campaign 06 is also not accepted. Its large-case actor attempted 54 records but
reused the initial write context: only one result persisted, the next 53 writes
returned CONFLICT, and completion failed. Native evidence distinguishes those
failed attempts from the actor's incorrect final claim. The positive controls
also produced unsupported restrictions: canonical Unicode JSON bytes and a
handler-only interpretation of the already broad response-check contract.
Independent adjudication found no supporting consumer or architecture evidence
for those counterexamples.

The reference now states the rotating-context recovery protocol explicitly and
distinguishes compliant alternatives from missing requirements. For this
repeatedly failed stage the qualification model is escalated to Astra/high, as
allowed by the agreed trial roles. This is an explicit trial selection, not an
automatic model switch in the skills or a client-configuration change. Sol's
diagnostic failures remain failures; an Astra pass must not be presented as Sol
qualification or proof that the wording alone improved Sol.

Campaign 07 supplied three successful Astra diagnostic probes, not a full pass:
the 54-item controlled negative found all three omitted conditions, and both the
Lite paraphrase and positive optional-charset control completed without gaps.
Native transport evidence contained complete source continuations and no local
truncation markers. An independent raw-input audit of the remaining fixtures
confirmed the UI accessibility omission and the partial-amendment control, but
identified an underspecified stale GET/POST response race in the shared UI
fixture. Its source and requirement now both preserve the confirmed new item and
newer creation feedback against an older list response. This changes simulation
inputs only; it does not weaken profile guidance or change negative mutations.

Campaign 08 starts the full qualification from zero with that corrected frozen
fixture set. Preparation checked unchanged generated-skill and MCP digests,
all 16 fixture preflights, 9/9 harness selftests, and byte-exact machinery
snapshots. Earlier diagnostic probes cannot substitute for either complete pass.

Campaign 08 executed all eight cases in nine fresh Astra contexts. It is not
accepted: the positive UI/API control produced two profile findings about the
same indefinitely pending-request recovery policy. Independent comparison with
the full source, specification and frozen UI/backend references did not establish
that this conditional policy was a material requirement of the bounded local app.
The counterexample showed a possible extra failure policy, not its mandatory
applicability. The accessibility negative, three controlled source omissions,
Lite paraphrase, partial amendment, fresh-context resume and charset pair retained
their diagnostic evidence without relabeling this false positive as a pass.

After explicit user agreement to continue, one reviewer-reference paragraph now
requires a concrete scope, architecture or known-risk basis for findings under
conditional profile guidance, separate from the counterexample. Unsupported
ideas remain optional considerations; unconditional profile obligations and
source preservation are unchanged. No fixture condition was changed for this
repair. Both bundles were regenerated; two new full stable passes are required.
Independent review found no confirmed issue with this narrow correction. Full
`npm test` passed 245/245 again, with no failures or skipped tests; lint,
foundation, generation/check, all three affected Codex validators and sizes passed.

Campaign 08's transport audit verified nine distinct actual Astra/high contexts,
114 persisted results, 285 native get calls and 115 complete item reads (the
resume fixture's first item was read in both contexts). No tool errors, truncation
markers or lost records were found. Its frozen actor inputs, runtime and machinery
remained unchanged; the original live skill directory correctly differs after
the authorized next-candidate edit. The failure report remains preserved.

Campaign 09 kept the same fixture inputs and the final conditional-profile
reference. Its first mechanical eight-case gate and transport audit passed.
During the second pass, the accessibility-negative reviewer additionally found
an undefined entry/navigation boundary for the new Label page. Independent
source/profile comparison confirmed this narrow omission: Standard UI requires
screen/navigation boundaries, and the new page's entry is in scope; no available
baseline settles it. The same missing condition exists in the positive UI
control, where both reviewer passes had incorrectly accepted it as covered.
This differs from the unsupported timeout demand: navigation is grounded in the
actual new-page scope and direct profile obligation.

Consequently the positive no-gap oracle is invalid, and neither campaign-09
round is accepted for qualification, regardless of a mechanical gate's result.
The positive reviewers' missed condition remains recorded; it is not erased or
reclassified as successful semantic coverage. The user explicitly approved
refining the simulation's entry boundary and repeating the frozen full set:
direct URL entry at `/labels`, with no required new menu entry. The source and
FLOW-001 now state this same boundary in both UI controls. No skill or runtime
change is part of that fixture correction.

A full bounded preflight of the corrected positive UI control identified one
remaining definite issue before new model execution: loading/success and field
validation were accessible, but the mandatory load/save failure messages could
still be visual-only. UI-001 now also requires announcing those existing failures
through its polite status region. This clarifies an already applicable profile
obligation, without adding a new failure scenario or changing customer sources.
The negative UI control still omits accessibility and remains a profile negative.
Independent recheck confirmed that the original hidden-error counterexample now
violates UI-001 and that the remaining previously reviewed inputs were unchanged.
No other material finding remained in the bounded core/UI/backend preflight.

Campaign 10 was rejected at preflight with zero model contexts; it is neither a
model failure nor a qualification pass. Campaign 11 preparation verified all
16 fixture preflights, nine harness selftests and ten machinery snapshots, with
the same skill/runtime digests as campaign 09. Its two complete model rounds
must establish qualification independently of every earlier campaign.

Campaign 11's first mechanical/semantic eight-case gate passed. Its strict
zero-tool-error diagnostic did not: the resume fixture's first context supplied
an out-of-range `limit: 100` to the read-only `requirement_list` (maximum 50).
The parameter itself is supported; its value was invalid. MCP rejected it with
`INVALID_INPUT`; the actor independently retried with the published arguments,
read all 2,609 source characters and persisted exactly one result. The second
context preserved that result and completed the other eight. Chronological
native evidence confirms no added user input, intervention, lost source content,
overwritten result or changed protected input.

The user explicitly removed a perfectly error-free trace as a completion gate,
allowing only demonstrated independent recovery with complete evidence and no
false success claims. The original strict diagnostic remains failed, not passed;
`pass1-qualification-audit.json` accepts the first round with that single warning.
All other nine-context invariants passed. Unrecovered errors, incomplete reads,
lost results and false completion claims remain failures. This policy clarification
does not change MCP validation, frozen model inputs, skills or runtime.

Campaign 11's second round completed all eight cases, but its positive UI/API
case04 ended with `gaps` because the reviewer required Penpot design outputs.
Independent audit confirmed a real instruction conflict: the UI requirements
profile and normative UI-001 demand Penpot unconditionally, while adaptive scope,
UI planning and PLAN-004 make the design stage depend on warranted, confirmed
manifest outputs. The fixture does not declare design outputs. This is not a
successful second pass and is not repaired by relabeling its oracle or silently
adding a design dependency. Alignment of the profile and normative source has
been proposed to the user and remains awaiting explicit agreement.

Across both rounds, native transport evidence records 18 distinct Astra/high
contexts and 228 persisted verdicts without source truncation, missing results
or changed frozen inputs. Pass 2 case01 also recovered independently from a
rejected write whose copied context omitted `versions.experience`: it reopened
the specification, read all 68,189 characters, and persisted the same finding
with the returned context, completing 54 unique results. The rejected attempt
and recovery trace remain preserved under the agreed recovery policy. The
remaining case07 adjudication confirms the optional-charset omission against
the actual source and full header-pattern requirement. Semantic case04 failure
still prevents qualification, regardless of transport and recovery success.
After recording case07 adjudication, the unchanged full evaluator still exits 1
at case04 (`gaps !== reviewed`). Running the same existing `evaluateRecords`
against each completed case confirms seven passing cases and exactly one
failure, case04's `profile:ui` finding. No new models were run and no source,
fixture or recorded verdict was changed for this diagnostic recheck.

After an explicit clarification and the user's `ок`, the UI-policy alignment
was authorized. The actual reply and preceding question/proposal were persisted
through `decision_record_instruction`, related to both prior UI decisions. The
normative UI-001 now conditions design artifacts on warranted outputs in the
confirmed manifest, retains behavioral UI coverage without them, and requires
scope reconciliation when a material design need emerges. Its bundle remains
Draft during the new persisted review. Three legacy orphan definitions received
links to existing substantive decisions, without rewriting those answers or
discarding existing requirement links; mechanical coverage then passed.

The UI profile received the same narrow gate and keeps UI/service behavior in
its own section. Independent change review identified one concrete regression
before the next model freeze: `skip Penpot` could prohibit necessary read-only
inspection of an existing component without new outputs. The wording now skips
Penpot authoring, not warranted baseline reads; the reviewer confirmed the fix
and byte-identical Codex/Claude reference copies. The original campaign-11 RED
and this read-only counterexample remain the discriminating before-fix evidence.
No model fixture source, expected product behavior or oracle was changed.
The new candidate resets the stable accepted pass count to zero. The initial
UI-policy npm run passed 245/245 with zero skipped tests, but the final wording
changed during it, so a new full run is required for the frozen candidate.
That final-candidate run subsequently completed with exit 0: 245 tests passed,
zero failed or skipped, in 139447.784255 ms (`npm-test-ui-policy-final.log` in
persistent private evidence). Build, lint, foundation (13/13), both-host
generation/check, all three affected Codex quick validators and size checks
passed. The first quick-validator invocation used an unavailable `python` alias;
all three were rerun successfully with the installed `python3`, without changing
global interpreter configuration.

Campaign 12 froze generated skills at
`b65801f81de344c38ddfaf58fcfa7fba66adc125fb2441ef156be1a5c6beacdd`
and the unchanged MCP runtime at
`2abfb5f91422ad95a57dac8e53b74e547f2da1b6628c24e082d961873a329119`.
Its 9/9 harness selftests and 16/16 fixture preflights passed. Preparation
comparison confirmed identical product/specification bytes, customer sources
after normalization of generated decision IDs, and manifests after normalization
of generated receipt IDs. All ten machinery snapshots and the semantic oracle
remain unchanged. The only actor-instruction change is the authorized UI
reference in UI cases. No previous campaign contributes an accepted round to
this candidate's two-pass criterion.

Campaign 12 pass 1 is accepted: the unchanged full evaluator exited 0 after
independent adjudication of the three negative cases. The native audit verified
nine separate Astra/high contexts, 114 persisted results, all full reads and
unchanged frozen inputs, with zero tool errors. The positive UI/API control no
longer receives the erroneous mandatory-design finding. The second round is
running on the same freeze; one accepted round is not yet qualification.

The old normative bundle's independent review completed all 151 items with 134
covered, 10 gap and 7 conflict judgments, and a persisted `gaps` outcome. Several
items share a cause. Besides the UI alignment, its older text has inconsistent
15/16 counts and reported omissions concerning duplicate-activation refusal,
pre-use integrity verification and planning-profile granularity. Historical
fixture and packet instructions also require distinguishing campaign context
from reusable product behavior. A separate user decision was requested before
expanding the document reconciliation beyond the approved UI correction. The
old bundle remains Draft; the findings are not changed into a successful review.

## Final Frozen Qualification: Campaign 12

Both full evaluators passed on the same frozen candidate: eight scenarios in
each pass, 18 distinct fresh Astra/high contexts, and 228 persisted judgments.
All six negative-case semantic adjudications were completed independently.
The accepted corpus covers controlled source-condition removals, valid
paraphrases, UI/API profile coverage, a legitimate context exclusion, partial
amendments, fresh-context resume, and the optional-charset positive/negative pair.
It does not qualify Sol/Terra, product implementation, the former full
application matrix, live Claude/Penpot, or provider-internal behavior.

Pass 1's native audit found no tool error. Pass 2 case08 supplied an incorrect
project context, received SCOPE_REQUIRED, and reopened the correct project
without intervention. The exact trace proves five complete item reads, five
persisted covered results, and a correct reviewed outcome, with no premature
write, lost data, or false success claim. This is accepted under the user's
explicit demonstrated-recovery rule. The original strict zero-error diagnostic
remains failed and preserved; that diagnostic is no longer an acceptance gate,
not a check relabeled as passed.

Reproducible private evidence under campaign-12/evaluator includes
final-qualification-audit.json, pass1-qualification-audit.json,
pass2-qualification-audit.json, pass2-case08-recovery-trace.json,
pass2-case08-final-claims.json, and pass2-native-recovery-diagnostic-v2.json.
The final audit records two consecutive successful passes and the exact frozen
skill/runtime digests above. Source fixtures, evaluator/oracle, and runtime
remained unchanged between accepted passes. Prior campaigns remain diagnostic
history and contribute no stable-pass credit.

After both rounds, the user explicitly authorized correcting the remaining old
normative-specification inconsistencies from preserved decisions, without
changing installation code, skills, or fixtures. Document changes refer to
SKILL-001 instead of duplicating conflicting counts, restore duplicate-activation
refusal and pre-use release verification, require one dedicated planning
reference per active profile, and distinguish reusable obligations from
one-off campaign/packet context. Context classifications preserve original
answers and historical restrictions rather than waiving them. PLAN-003 was
added to the existing profile-loading decision's links without removing earlier
links. The old gaps review remains evidence, not a successful review.

The fresh normative review 5221d9e0-82a7-4f26-bb06-1aa68506c37c began with
152 server-enumerated items and passing mechanical checks. Its first independent
reader exceeded the provider's 100 MB request-body ceiling after accumulating
large rendered text images. No verdict was recorded and this attempt is not a
successful semantic check. The unchanged inventory was reassigned to two fresh
independent contexts with disjoint ownership; short word-array readbacks and,
where necessary, compact monochrome images preserve exact text without the
large image payload. No source, skill, runtime, fixture, or acceptance gate was
changed to recover from the transport failure.

The recovered review completed all 152 items: 139 covered, ten justified
context exclusions, and three source gaps. All stored judgments were read back
exactly. The gaps concern DIST-003 limiting duplicate activation to the same
release, HOST-004 omitting continuing current-stable client testing, and REL-002
omitting CI's cryptographic tag verification before publication. Each gap has a
concrete source-grounded counterexample; consumer-side verification did not
satisfy the independent CI obligation. The completed gaps outcome is preserved.

The author corrected only those three requirement blocks, preserving their IDs
and sources. Workflow identity now spans different release versions; current
stable compatibility verification continues beyond one-time acceptance without
inventing a schedule or floating dependencies; CI verifies the signature before
publication and rejects an unverifiable tag. No installation code, skill, or
fixture changed. Fresh review 4375aeb6-9410-4802-9c67-b743ade60406 now checks
all 152 items against source_version
68e5d0b9e6d1deebadea206d12cdc98871f459c0a6923c79dafd3d42558feaa2,
without inherited verdicts. The fresh reviewer read all 152 items and 673 MCP
portions, including 86 sources with history, 61 exact requirements, four active
profiles and the overall context. It recorded and read back all 152 judgments:
142 covered and ten justified context exclusions, with no demonstrated material
gap. specification_review_complete returned reviewed. Evidence is retained in
normative-review-4375aeb6/records.json, verified.json, and complete.json.

Check-state passed before the author changed only Status: Draft to Approved,
and passed again afterwards with the same aggregate source_version above and
specification_version
4baea13625b5c26f0d2afb7807db19a89e3b9e6a0a6bb4e7d6627faac31cbc38.
Both state responses are preserved in approval-state-checks.json. The tool
observed the author's transition; it did not assign approval or prove semantic
truth. The normative specification is now Approved.

Foundation validation (13/13), both-host generation checks, and all nine YAML/UI
contract tests passed again after the final document corrections. The final live
candidate digest check matches the frozen campaign-12 generated skills and MCP
runtime exactly; final-live-candidate-check.json retains this result. No new
code or skill change invalidates the two accepted model passes. Final diff
validation also passed. All four checkpoints and the authorized documentation
addition are complete within the stated qualification limits.

MCP records judgments and continuation receipts; it cannot authenticate who
reviewed them, prove understanding or guarantee semantic correctness. Edits made
and reverted entirely between calls are not observable. Missing checks remain
unverified. Existing dependency audit evidence identifies the unrelated
pre-existing fflate 0.8.2 advisory GHSA-px8p-9vwx-vf98; no automatic dependency
repair or Penpot scope expansion was performed.
