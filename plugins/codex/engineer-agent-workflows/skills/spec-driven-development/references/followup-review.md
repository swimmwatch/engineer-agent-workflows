# Corrections-Only Specification Review

Read only when repairing findings from a completed specification review, or
when `specification_review_status` identifies a followup consistency checkpoint.
This is not permission to change scope, skip independent review or approve a
specification with unresolved findings.

## Author: Prepare One Correction Set

Restore source-supported omissions together. Keep the specification Draft.
Use `specification_review_changes_summary` with the latest completed review
reference and follow every summary continuation. It returns fixed reason codes,
exact counts, server-issued finding keys, changed-item selectors, mandatory
items and provisional candidates without granting complete-read evidence. Then
call `specification_review_changes_read` with its `report_version`; follow every
continuation and reconstruct every exact finding and before/after field. Only
the terminal evidence response supplies `changes_receipt`. The legacy
`specification_review_changes` text stream remains compatible but is not a
summary shortcut. No YAML, archive JSON or manual fingerprint construction is
required.

If mechanically eligible, call `specification_review_followup_start` with the
terminal receipt and `fixes`: each entry names the returned `finding_key`, the
`changed_item_keys` it explains and a short explanation. Every changed item
must be explained. This records the author's claim, not proof of semantic
impact or customer consent.
Give the separate checker the returned context and review reference, the current
specification and this reference alongside `completeness-review.md`. Prior
findings are legitimate inputs; do not supply expected verdicts or hints about
undisclosed test defects. Observe through read-only `specification_review_status`.

Use `specification_review_start` with `mode: "full"` for new user instructions
or answers, changed scope/profiles, removed IDs, uncertain impact, an Approved
specification or legacy reviews without archives. A finding-linked correction
to shared non-requirement text may use followup only while requirement and
original-source meanings and the manifest remain unchanged. Read its exact
before/after evidence and choose full review whenever semantic influence cannot
be bounded; mechanical eligibility and matching hashes do not establish safety.
Requirement-link repairs alone
may qualify; changing an original source's meaning does not. An unusable archive
never authorizes inherited evidence: report the error and use a full review when
the current sources are intact. A corrupted object at the exact target content
hash can also block full review: stop and report that storage fault for explicit
investigation. Explicit full mode replaces an unfinished followup with a new run
and no inherited verdicts; it resumes an unchanged unfinished full run. Omit mode
for ordinary no-write resume, including followups. Keep the exact request for
lost-response retries. Do not edit or repair archives manually.

## Independent Checker: Detail Plus Whole-Specification Consistency

1. Call `specification_review_status`. Continue its `next_item_index`, not all
   indices from zero. Inherited `carried_from` results are provisional historical
   evidence, not newly performed checks or proof that dependencies are absent.
2. Read each pending item completely through `specification_review_get` and
   record its evidence-based verdict. Use the three questions and materiality
   rules from `completeness-review.md`. Prior findings are included in the
   relevant item and final context; test the correction against original sources.
3. If another item may be affected, use `specification_review_scope_expand`
   with its exact `item_keys` and the reason. This withdraws inherited evidence
   for those items. Include related sources/requirements that need detailed
   checks. You cannot remove mandatory items. If the impact cannot be bounded,
   stop and return the need for a full review to the author.
4. After the detailed items, read `consistency_item_index` completely. For a
   followup it contains the WHOLE current specification, confirmed scope and
   previous findings. Check cross-requirement contradictions, shared terms,
   exceptions, permissions, negative obligations and effects on unchanged items.
   Matching hashes do not establish semantic independence.
5. Use the final `consistency_read_receipt` as `read_receipt` for
   `specification_review_consistency_record`. Choose `consistent`, `gap` or
   `conflict`, with an explanation and a concrete counterexample for a finding.
   This tool also records the context item: do not first record it through
   `specification_review_record` or read the whole document twice unnecessarily.
   A subsequent expansion or detailed verdict invalidates the old consistency
   receipt; finish the new checks and refresh the final read.
6. Call `specification_review_complete`. Every pending item, old finding and
   final consistency assessment must be accounted for. Report remaining gaps;
   only the author may apply the ordinary checked Draft-to-Approved transition.

Keep each successful response's context. On `CONFLICT`, stop writes and follow
the fixed `conflict_cause`: reopen and inspect status and persisted results for
`stale_context`, `dependency_changed_during_read`, or `unknown`; start a fresh
independent review only for positively established `review_source_changed`.
Absence of `operation_applied` does not prove that retry is safe. An exact
lost-response retry must reuse the original request and requires explicit
operation-effect evidence that it was not applied; never replay a guessed
replacement write. Parallel read-only observation does not require stopping the
reviewer.

## Archive Ownership

MCP owns `docs/specs/<slug>/.workflow/review-inputs/<sha256>.json`. These immutable
historical inputs are intended to accompany the specification in Git, not to
replace `spec.md` or grant commit authority. The journal holds references and
results, not duplicate specification text. Exact inputs deduplicate; changed
inputs create another complete snapshot. No automatic cleanup is provided.
Missing/corrupt snapshots or historical source revisions prevent evidence reuse.
Read only requested changes/items through MCP, never the entire archive/journal.
