# Workflow session report: validation and planning disposition

Date: 2026-09-15. Status: investigation and planning only; runtime fixes not made.

Input: user-supplied report from the `cdp-access` specification session,
`01a099ff-2c14-7b41-ac97-18316f043785`. The source session was inspected read-only.
Its project artifacts, installed clients and global configuration were not changed.
Use synthetic data for every reproduction below, not the original customer ledger.

## Findings and ownership

BR identifiers below identify report findings, not new Approved requirements.
Implementation ownership and the specification prerequisite are in the
[plan amendment](../specs/product-planning-workflows/tasks/plan.md#session-report-amendment-2026-09-15).

| ID | Validation against current code | Disposition and planned owner |
| --- | --- | --- |
| BR-01 | The report passed a displayed `<<ccr:...>>` marker as context; forwarding the actual `structuredContent.context` worked. This investigation also observed compressed display values while programmatic forwarding worked. This is a host/presentation integration issue, not evidence that MCP issued an invalid token. | P19: explain opaque-value forwarding and recovery. P17: exercise actual host delivery as well as raw stdio. Do not accept display markers, remove version checks, add unversioned project/slug writes or promise that the server controls external compression. |
| BR-02 | [scope.ts](../../packages/engineer-agent-workflow-mcp/src/scope.ts#L103) validates saved option IDs but returns one generic error. Open returns only bounded pending references. | P20: safe, bounded error details with the exact question reference and allowed IDs. P19: reuse `decision_get` for the exact saved question, not guessed IDs. Do not inflate every open response with complete questions or create another question API without demonstrated need. |
| BR-03 | [decisions.ts](../../packages/engineer-agent-workflow-mcp/src/decisions.ts#L78) limits linking batches to 20. The source session's first batch had 35 items. [api.ts](../../packages/engineer-agent-workflow-mcp/src/api.ts#L12) discards schema issue detail; [scope.ts](../../packages/engineer-agent-workflow-mcp/src/scope.ts#L18) omits the offending reference. Both single and batch paths use `selected`; the later 10-item conflict does not identify which item failed. Finding one current reference does not establish all ten were current. | Confirmed diagnostics defect; a separate batch-currentness defect remains unconfirmed. P20: indexed errors and an all-current/mixed-stale parity reproduction before changing selection logic. P19: publish limits and context chaining. Preserve all-or-nothing writes. |
| BR-04 | [ledger.ts](../../packages/engineer-agent-workflow-mcp/src/ledger.ts#L302) counts all historical rows whose state is not `superseded`. [append](../../packages/engineer-agent-workflow-mcp/src/scope.ts#L24) correctly appends a successor without rewriting its predecessor. A two-revision synthetic probe returned one current revision and `multiple_current_revisions: 1`. | Confirmed warning false positive for a normal linked history. P20: recognize supersession links while retaining meaningful warnings for ambiguous legacy histories. Do not rewrite history or silently change which record legacy readers select. |
| BR-05 | [specification_open](../../packages/engineer-agent-workflow-mcp/src/scope.ts#L70) enumerates the four managed YAML version slots. It is not a repository-file inventory, so omission of `spec.md` follows the present implementation. | P19: clarify the existing field. P20: expose document status separately in check-state results. Do not rename the existing field or extend the four-kind writer to manage Markdown. |
| BR-06 | [reviews.ts](../../packages/engineer-agent-workflow-mcp/src/reviews.ts) records one verdict per mutation. [review-followup.ts](../../packages/engineer-agent-workflow-mcp/src/review-followup.ts#L35) intentionally rejects changed instructions, answers and classifications, even if they resolve a finding. | P21: bounded atomic verdict batches to reduce write round trips without reducing exact reads or independent judgment. Keep corrections-only eligibility unchanged. Finding-linked new-source inheritance is a separate policy proposal, not an approved fix. |
| BR-07 | The server's receipt binds a complete protocol read; external compression can hide text afterwards. The existing [review reference](../../skills/spec-driven-development/references/completeness-review.md) already says receipts do not prove understanding and requires exact text. | P19: explicitly prohibit judgments from compressed/unexpanded content; use a callable lossless retrieval facility or stop affected review. P17: compare raw delivery with model-visible content. P21 must not equate batch acceptance with actual reading. No MCP-specific CCr decoder or claim of authenticated reading. |
| BR-08 | [review-followup.ts](../../packages/engineer-agent-workflow-mcp/src/review-followup.ts#L158) correctly accepts consistency once, only for unfinished followups after detailed checks. Its description does not make this restriction explicit. | P19: distinguish full-review record/complete from followup consistency/complete. P20: lifecycle-specific recovery details on the existing error. Do not permit consistency writes in a full review merely to accommodate wrong tool selection. |
| BR-09 | [reviews.ts](../../packages/engineer-agent-workflow-mcp/src/reviews.ts#L17) checkpoints observed author status; [requirements.ts](../../packages/engineer-agent-workflow-mcp/src/requirements.ts#L30) normalizes the status line in the semantic version. False authentication/semantic-proof flags are intentional. | P20: separate observed document status and persisted approval observation from checks and authenticity claims. P19: explain version semantics and that check-state can write a checkpoint. Do not flip disclaimers to true or infer approval from pass/reviewed alone. |
| BR-10 | [completeness-review.md](../../skills/spec-driven-development/references/completeness-review.md) and [followup-review.md](../../skills/spec-driven-development/references/followup-review.md) contain recovery/eligibility rules, but the author needs the impact warning before a source-changing correction. | P19: route the author to these rules before correction, preserve actual questions/answers even when they cause a full review, and finish material source corrections before starting the next review. Do not avoid required questions to retain old verdicts. |
| BR-11 | Reported ledger size was 4,359 lines / 228,049 bytes. Linking appends a full decision successor; review mutations serialize the journal. This is a credible scaling cost, not evidence of data corruption or a measured current performance regression. | P21: compare actual file writes, serialization volume, final size and calls on equal synthetic workloads; verify no-op linking and replay add nothing. Keep legacy schemas/history/archives intact. A delta store, compaction or migration requires separate evidence and scope. |

## Evidence obtained in this invocation

- Current `product-planning-workflows` MCP check: `pass` / `reviewed`, with the
  existing pinned source and specification versions unchanged. PWF-034 limits
  its approved change to metadata; it explicitly excludes new runtime behavior.
- Current source inspection establishes option validation, batch limit 20,
  shared current-reference selection, supersession counting, full/followup
  lifecycle and status normalization. This is not an end-to-end test pass.
- An in-memory probe of the locally built `parseLedger` used two synthetic
  `observed` revisions, with revision 2 superseding 1. Result:
  `revisions=2`, `current=[2]`, `multiple_current_revisions=1`, exit 0.
  The corresponding source algorithm was inspected; no persisted YAML was parsed
  or edited as a workflow fallback. P20 must reproduce through fresh build/stdio.
- Source-session calls establish a 35-item request followed by a 10-item request.
  The report's successful single-item request is insufficient to attribute the
  batch conflict to that same item. No real-project write was replayed here.
- The report's 58 + 60 review items and test totals are historical observations,
  not this invocation's benchmark or verification results.

## Scope exclusions and policy

Sandbox `EPERM` on sockets/child processes is a separate environment limitation;
it must not motivate relaxing runtime security or changing global settings.
Claude empirical trials remain deferred; Penpot operations are not involved.

Preserve the accepted policy: local correction checks plus whole-specification
consistency, only for eligible corrections under unchanged scope. New user
instructions, changed source meaning or unknown impact still require full review.
Neither a new answer nor a read receipt authenticates consent or reviewer identity.

No new context token format, transparent write rebase, generic YAML editor,
decision migration, retention cleanup or server split is included. First address
diagnostics, delivery guidance and redundant write calls. Measure remaining
cost before proposing a storage redesign.

## Planning handoff

P19 absorbs guidance/discovery findings already covered by PWF-034.
[P20](../specs/product-planning-workflows/tasks/20_workflow_diagnostics.md) and
[P21](../specs/product-planning-workflows/tasks/21_review_verdict_batches.md)
are proposed runtime packets behind G01, the specification/contract amendment
gate. P17 qualifies their verified behavior and host delivery; P18 documents it.
They cannot execute using the old metadata-only requirement as authority.

All 11 findings have an owner or explicit exclusion. No source-changing followup
relaxation or storage migration is silently scheduled for implementation.
