# Completeness MCP Contract

The executable authority is the Zod input schemas and generated
`packages/engineer-agent-workflow-mcp/dist/tool-contracts.json`, not this summary.
The generated contract enumerates scenario tools and unchanged protocol-1 readers.
All calls use the context returned by `specification_open`; use current callable
names without a client-specific namespace. There is no YAML or generic patch API.

| Scenario | Inputs beyond context | Result and rule |
| --- | --- | --- |
| `decision_record_instruction` | category, exact text, source, kind; optional related_decisions and requirement_ids | New server-owned decision ref. Kinds: initial_request, follow_up, user_edit. Edits require predecessors and affected definitions. Up to 65,536 characters; reject oversize, never truncate. |
| `decision_mark_context` | current decision_ref, reason | Append a resolved non-behavioral classification. Not available for pending questions or scope.manifest. Linking requirements clears the classification. |
| `requirement_list` | optional limit and cursor | Definition previews, positions, specification source version and continuation. |
| `requirement_get` | requirement_id; optional source_version and cursor | Exact block portions plus paged decision refs. Follow next_cursor until complete for both streams. |
| `specification_review_start` | context; optional mode: full | By default resume an unchanged unfinished run without writing. Explicit full mode replaces an unfinished followup with a new full inventory and zero verdicts, but still resumes an unchanged unfinished full run. Existing history remains intact. Return review_ref, aggregate source_version, counts and bounded mechanical issues. |
| `specification_review_status` | review_ref | Read pending, reviewed, gaps or stale state; saved/current source versions, current inventory count, recorded count and first unfinished index. Unknown refs return NOT_FOUND. Never writes, approves or completes. |
| `specification_review_get` | review_ref, item_index; optional cursor | One server-enumerated source, requirement, active profile or non-requirement context item. Exact JSON text portions, next item, final read receipt and recorded verdict. Full prior finding appears in streamed recorded_result. |
| `specification_review_record` | review_ref, item_index, read_receipt, verdict, explanation; evidence_requirement_ids, evidence_source_refs; counterexample for findings | Append one immutable structured verdict. Verify referenced definitions/revisions. Covered behavioral sources need requirements; covered requirements need original sources. |
| `specification_review_complete` | review_ref | Reject incomplete, mechanically invalid or stale evidence. Return gaps or reviewed; never approve. |
| `specification_check_state` | optional expected_source_version | Existing scope/link checks plus legacy_unverified, pending, gaps, stale or reviewed. May checkpoint an observed author-made Approved transition, not assign it. |

## Definitions And Evidence

`### <ID>: <title>` must be an actual top-level Markdown heading of depth three.
Nested subheadings belong to its block; the next heading of depth three or less
ends it. Code, quotes and prose do not define requirements. Definitions must be
unique and nonempty. Parsing uses pinned `mdast-util-from-markdown@2.0.3` and its
[documented syntax-tree API](https://github.com/syntax-tree/mdast-util-from-markdown#api).
Mechanical coverage derives from current decision requirement_ids, not another
hand-maintained table. A context exclusion is still an independent review item.

Sources include complete questions/answers/instructions, revision ancestry and
related instructions. A partial replacement cannot hide the broad predecessor.
Review records live in typed `specification_reviews: { version: 1, runs: [...] }`
in decisions.yaml. They contain refs, findings and status observations, not
copies of spec blocks. Product decision search excludes this service section.

The inventory is server-owned. Reviewers cannot complete only a chosen subset.
`covered` needs correspondence evidence; `gap` and `conflict` need concrete
incorrectly permitted/rejected behavior. `not_applicable` is only a justified
explicit context source. Active profiles still receive a relevance-based verdict.
The server records agent judgment; it neither authenticates separate contexts
nor proves semantic correctness. Read receipts enforce continuation protocol,
not model understanding or protection from a malicious client.

## Versions, Recovery And Consumers

The aggregate version binds the project/slug, specification content, confirmed
manifest and source history. The separate specification_version is passed to
requirement_get as source_version. Reports/retry receipts do not invalidate their
own snapshot. Only the standalone Draft-to-Approved status transition is exempt.
Check-state records having observed Approved so later Draft is stale, including
after restart. Edits made and reverted between calls cannot be observed.

Every other input change requires a new run. Only the corrections-only flow below
may provisionally reuse attributed positive verdicts across input versions.
An unchanged unfinished run resumes with recorded results without
changing the journal or context. Authors start before delegation and observe
progress through read-only `specification_review_status`. Exact
successful mutation retries use the existing last-64-receipts mechanism; missing
replies must not trigger invented duplicate questions or results. Reopen after
stale context and reconcile rather than ignoring conflicts. After a
`CONFLICT`, stop writes, reopen, inspect status and saved verdicts, and resume
only if the review remains current; never retry a write blindly. Parallel
read-only observation is allowed. No report overwrites.

Planning pins the review and both versions; implementation checks aggregate
freshness before and after its one authorized packet. Legacy check-state keeps
prior approval/link checks even for old Markdown shapes, explicitly without new
assurance. Enrollment or specification changes under the new skill require the
new cycle; there is no silent bulk migration or MCP execution registry.

Existing 16 MiB source bounds, bounded replies, path protections, per-file atomic
writes and dependency rechecks apply. Overflow is a visible failure, not a pass
over truncated data. No global configuration, model launching, review of code,
committing or publication belongs to these tools.

## Corrections-only followup

All tools retain the protocol-2 context envelope and bounded output. New inputs
are strict scenario schemas, not JSON/YAML editors.

| Tool | Inputs beyond context | Result |
| --- | --- | --- |
| `specification_review_changes` | completed `review_ref`, optional `cursor` | Exact paged JSON change report, old findings, mandatory/candidate keys, full-review reasons and final `changes_receipt`; read-only. |
| `specification_review_followup_start` | parent `review_ref`, `changes_receipt`, `fixes[]` containing `finding_key`, `changed_item_keys[]`, `explanation` | New or unchanged resumed review; detailed counts/first 100 indices, carried count and consistency index. Use status for continuation, not a truncated index list. |
| `specification_review_scope_expand` | `review_ref`, `item_keys[]`, `reason` | Mandatory added detailed checks and withdrawn provisional results; no narrowing. |
| `specification_review_consistency_record` | `review_ref`, final `consistency_read_receipt` passed as `read_receipt`, verdict consistent/gap/conflict, explanation, counterexample for findings | Immutable global assessment AND context-item verdict, after all detailed checks. |

For followups, `review_status` also returns `consistency_status`,
`consistency_item_index` and `carried_items`. The final context item streams
the entire current specification, not just non-requirement prose. It exposes a
separate `consistency_read_receipt` bound to current results and scope.
Ordinary `review_record` must not duplicate this context verdict. Complete
requires both inventory coverage and a new consistency verdict. Gaps remain
gaps; neither tool approves the specification.

`input_snapshot` is an optional SHA-256 reference on each new full/followup run.
Strict additive journal fields are `followup`, `consistency` and result
`carried_from`; legacy records remain valid without migration. Input snapshots
are version-1 deterministic JSON under `.workflow/review-inputs/`, contain
exact text/manifest plus decision revision hashes, and use a versioned review
contract. Incompatible/missing/corrupt inputs prevent inheritance. Unchanged
followup resume writes neither snapshot nor receipt; true conflicts still stop
writes. Exact retries retain existing idempotency semantics.
