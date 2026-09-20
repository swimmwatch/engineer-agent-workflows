# Specification Completeness

Status: Approved

## Authority and scope

The user explicitly authorized the four-checkpoint implementation plan in the current conversation. The scope was separately confirmed through the native question `confirm_plain_scope` and the scenario MCP. Standard depth covers core workflow behavior, stdio MCP interfaces, and persistent journal data. Existing Node.js >=22.20.0 and Codex/Claude bundle contracts remain unchanged. No global installation, client configuration, publication, commit, live Claude or live Penpot run is authorized. A usable workflow MCP is required for the real bundle; its absence must not be bypassed by direct protected-YAML reads or edits.

## Requirements

### SRC-001: Preserve complete source instructions

Capture non-sensitive initial requests, follow-up instructions, answers, and known user edits without re-asking already supplied instructions or relabeling them as repository facts. Preserve exact text and provenance before transforming the source instructions into requirements. Reject unsupported or oversized input explicitly, never silently truncate it. MCP does not authenticate human consent.

Expose `decision_record_instruction` for initial_request, follow_up and known user_edit source capture. A known edit records affected requirement IDs and predecessor refs. Use actual source text, not an author summary or a repeated customer question.

### SRC-002: Preserve decision history and partial amendments

Keep stable decision IDs and append-only revisions. An amendment references its predecessor and affected requirements without replacing unrelated obligations in a broader answer. Unknown edit authorship is not automatically attributed to the user. Material uncertainty requires clarification. A resolved non-behavioral decision may be classified as context with a reason; exclusions and constraints are not automatically context.

Keep `decision_link_requirements` authoritative for links. Do not require nested decision IDs: one decision may support multiple independently checkable requirements. `decision_mark_context` requires a reason and a resolved non-behavioral source; functional exclusions, limits and prohibitions are not automatically context.

### REQ-001: Recognize real requirement definitions

New or revised specifications define requirements with `### <ID>: <title>`. A block includes nested subsections and ends at the next heading of equal or higher level. Parse Markdown structurally. Reject duplicate IDs, empty definitions, and references to missing definitions. Mentions in prose, quotes, examples, or code are not definitions. Preserve existing identifiers.

Use exactly pinned `mdast-util-from-markdown@2.0.3`; a full-document regular-expression ID search is not definition parsing.

### REQ-002: Read requirements completely and selectively

Provide bounded listing and exact reading with source positions, source version, and derived decision references. Continue oversized blocks without summaries or silent omissions. Reject stale continuations and cross-context references. Decision-to-requirement links remain authoritative in the journal; do not maintain a second manual link table.

Expose `requirement_list` and `requirement_get`, returning bounded IDs/previews or exact block portions, source positions, decision refs and source versions. Follow every continuation without summaries or hidden truncation; derive reverse links from the existing ledger.

### COV-001: Enumerate mechanical coverage

The MCP derives the complete inventory of current sources, requirement definitions, and active profiles. Detect unlinked behavioral sources, unsupported requirements, invalid references, unresolved questions, and unreviewed context classifications. The author cannot make coverage complete by selecting only a subset of sources.

### REV-001: Persist version-bound review history

Store typed versioned review metadata in the existing decisions document, separate from product decision search. Store references and findings in the journal, not another specification copy there. New reviews also retain immutable historical inputs under `.workflow/review-inputs/<sha256>.json`; `spec.md` remains the sole editable specification source. Reviews bind specification content, confirmed scope, current sources and the historical source revisions supplied to the checker. Report writes do not stale their own review; only the designated Draft-to-Approved status change may preserve the specification version. Other input changes require a new review. Check-state checkpoints an observed author-made Approved status so a later return to Draft invalidates the run across restarts; it does not assign approval. Edits made and reverted entirely between calls are not observable.

### REV-002: Require complete recorded review evidence

An unchanged unfinished `specification_review_start` resumes without changing
the journal or returned context. Expose read-only
`specification_review_status` for pending, reviewed, gaps and stale progress,
including saved/current source versions, counts and the first unfinished item.
Unknown review references fail without writing. Authors enroll before
delegation and observe through status; reviewers use every successful returned
context. After `CONFLICT`, stop writes, reopen and inspect persisted verdicts.
Changed inputs require a new independent review. Only the bounded corrections-only
flow in REV-003 may provisionally inherit positive verdicts.

Start, read, record, and complete review through dedicated scenario tools. Complete source text includes its question context and amendments. Unfinished portions, missing results, gaps, conflicts, and stale inputs prevent successful completion. Review records include supporting references or a concrete omission. Preserve bounded responses, atomic writes, retry recovery, and path protections. The MCP records an agent verdict, does not prove semantic correctness or reviewer independence, and never writes Approved.

Expose `specification_review_start` (enroll the new protocol and freeze inputs), `specification_review_get` (bounded original-source/context portions), `specification_review_record` (structured evidence and findings), and `specification_review_complete` (completeness/freshness gate). Extend `specification_check_state` with legacy_unverified, pending, gaps, stale and reviewed states. Define inputs in existing Zod schemas and generate published contracts. No YAML payload, arbitrary field path or universal editor is permitted. MCP must not launch models. Resume partial unchanged runs and exact lost-response retries; a new input version requires a new independent review. A corrections-only followup may provisionally reuse unchanged positive evidence under REV-003; all other changes require a full review.

### SKL-001: Run an independent semantic review

After drafting, a separate context checks source preservation and only active profile requirements at every depth. Lite uses a short review. The reviewer receives original evidence, not the author's expected answer or suspected defects, and cannot rewrite the specification. Findings identify a concrete incorrect behavior allowed or a correct behavior excluded. The author fixes source-supported omissions and asks only genuinely new material questions. Missing reviewer capability leaves the review incomplete.

Use one targeted reviewer reference rather than copying the main skill. Check conditions, exceptions, restrictions, priorities and permitted alternatives, including requirements without sources and disputed context exclusions. Reuse existing active-profile rules without duplicating large questionnaires. Each finding needs a concrete wrongly allowed or prohibited behavior. Restore unambiguous source-supported omissions; ask the user only about new material decisions.

### SKL-002: Preserve approval and invocation boundaries

After all required checks and corrections pass, set Approved automatically without another approval question. Specification, planning, design planning, and implementation remain separate explicit invocations. No new skill is introduced. Keep short entrypoints and selectively loaded references; generate isolated host artifacts from the canonical sources. Model recommendations remain advisory.

Do not add a new skill or an approval interview. Preserve the existing separately invoked workflows and host templates. Do not load inactive profile guidance.

### USE-001: Check consumer freshness without an execution registry

Planning checks the recorded review, reads addressed requirements, and records its source reference. Incremental checks the version before execution and completion and reads only linked requirements/contracts. Changed or incomplete validated specifications return affected work to specification ownership. Preserve test-first, one authorized packet, current checklist/handoff, and no mandatory review or commit. Do not add packet/test execution bookkeeping to the MCP.

### LEG-001: Preserve legacy behavior explicitly

Existing specifications without the new review are legacy-unverified, not silently migrated or automatically blocked. Creating or changing a specification with the new workflow requires the new review. Never label legacy or unavailable checks as newly verified. Existing public tools retain compatible behavior for legacy inputs where the new policy is not active.

### VAL-001: Qualify observable behavior

Use test-first unit and stdio E2E tests at each checkpoint. Cover false ID matches, multiline/nested/Unicode definitions, source amendments, missing answers, bounded large records, retries, restart, stale/cross-context references, source edits, status transition, and legacy consumers. Run independent model scenarios outside ordinary tests/CI, including the three known clause omissions, an all-IDs-preserved deletion, an equivalent paraphrase, and new Lite/UI-API controls. Require two consecutive successful focused passes without intervening skill changes. After two failed repairs of the same cause, analyze the cause and obtain the user's agreement on the further approach before another repair attempt. Do not claim the previous full application matrix was qualified.

The focused model suite must explicitly test participant identification, replay-work/per-process counters, optional charset, condition deletion with unchanged IDs, equivalent paraphrase, new Lite and UI/API controls, a profile gap and a valid not_applicable exclusion, partial user edits retaining other obligations, and resume without repeat interviewing. Run each in fresh isolated contexts, separately from npm test and CI. Record unit/stdio RED then GREEN at every checkpoint; after two failed repairs of one cause, analyze the cause and agree the further approach with the user before another attempt. Final gates are full `npm test`, lint, foundation validation, generation of both client bundles, `generate:check`, size constraints, affected Codex artifact validation, and `git diff --check`. Update MCP documentation, canonical skill rules and the evidence journal; unavailable checks remain explicitly unverified.

### REV-003: Recheck corrections with attributed evidence

Allow a followup only for corrections to findings from the latest completed
review while the specification is Draft and confirmed scope remains unchanged.
Require explicit finding-to-change links and complete change accounting. Recheck
changed items, linked old/new sources and evidence dependencies in detail. Carry
unchanged positive results only with their original review/item provenance;
matching hashes establish unchanged content, not absence of semantic impact.
Require a fresh whole-specification consistency assessment before completion.
The independent checker may expand the detailed set; expansion withdraws inherited
results and any earlier consistency/context verdict. New instructions or answers,
scope/profile/shared-context changes, removed IDs, Approved changes, uncertain
impact and legacy reviews without snapshots require a full review. Preserve
findings from the global assessment in subsequent correction cycles.

### REV-004: Store immutable review inputs beside the specification

Store canonical, versioned, content-addressed JSON at
`docs/specs/<slug>/.workflow/review-inputs/<sha256>.json`. Include exact specification
text, manifest, decision revision references/hashes and review-contract version;
do not duplicate decision bodies. Save the snapshot under the existing lock before
publishing its journal reference, deduplicate exact contents and validate hashes,
format, revision ancestry and safe paths on reuse. Keep these files in Git with
the specification; no automatic cleanup, global cache, database or manual repair.
Missing or invalid archives must never permit inherited evidence. Preserve old
journal compatibility, optimistic concurrency, no-write resume/status and exact
retry recovery. Expose bounded scenario tools, not archive editing or raw YAML.

### VAL-003: Qualify the corrections-only extension

Use focused test-first unit/stdio regressions for impact selection, provenance,
global consistency, expansion, legacy fallback, archive integrity and interrupted
writes, two-client conflicts, lost responses and restart. Run two isolated fresh
reviewer contexts: a valid local correction and a correction with a cross-impact
contradiction. Inspect actual calls and recorded outcomes. Compare full and
followup review of identical current inputs on one deterministic fixture; report
call/response-size measurements without promising general latency gains. The
historical model matrix in VAL-001 is not repeated or newly qualified by this
bounded extension. Run the repository validation gates and document limitations.

## Bootstrap and evidence

This bundle is authored using the currently available protocol-2 MCP. The new instruction-capture and review tools are the deliverable, not a pre-existing prerequisite. Record their adoption after they exist. Confirm the bundle's current state before approval. Store checkpoint results in tasks/handoff.md and the repository evidence document; keep private baseline archives outside the repository.
