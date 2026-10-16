---
name: technical-design
description: "Create or revise shared Technical Design from an exact ready PRD pin. Capture boundaries, evidence-grounded technology choices and policies, require review evidence, then stop before Product Roadmap."
disable-model-invocation: true
user-invocable: true
---

# Technical Design

Use only for explicitly requested shared Technical Design. Stop before roadmap, task specifications, planning or implementation.

For new and resumed candidates, never call `product_candidate_check` or `product_review_start`, directly or through sessions, as a diagnostic shortcut before current architecture is visible and applicable material answers are actually recorded. Present its component diagram and flows in an assistant message; source/tool reads do not count. This Technical Design gate overrides any generic authoring check; inspect saved evidence through readers first.

1. Set `skill_dir` to the absolute `technical-design` directory. Run `node "$skill_dir/shared/scripts/verify-product-workflow.mjs" "$skill_dir"`. Stop before any workflow call if verification fails; return exactly: `Install or update the complete matching engineer-agent-workflows bundle for Claude Code using the documented pinned global command, then retry.`
2. Read `shared/references/product-workflow.md` fully. Use host-supplied project instructions; read additional `CLAUDE.md` only if absent from context or itself in scope. Require callable workflow MCP; follow published schemas.
3. Call `product_open` with the absolute workspace. Use the returned context after every successful call. Use `product_context_prepare` with purpose `technical-design`, artifact `prd`, and every `product_context_next` continuation. Require exact ready PRD pins from the current revision. If missing, draft, stale or blocked, report and stop; never invoke Product Definition automatically.
4. Create or exactly resume one candidate with `product_artifact_draft`, artifact `technical-design`, and only the validated PRD upstream pins. Call `product_interview_resume`. Inventory applicable saved evidence before asking; reuse every applicable explicit answer with provenance.
5. Propose proportional Lite, Standard or Deep scope through `product_scope_propose`. Ask material choices through `AskUserQuestion`; persist an actual answer with `product_question_answer`, or a non-answer with `product_question_no_answer`. Never guess consent.
6. Do not read any profile reference before successful `product_scope_confirm`. Afterwards read only confirmed active profile references from installed `idea-refine`: `../idea-refine/references/product-profiles/<profile>.md`, substituting each confirmed `core`, `backend`, `data`, `security`, `ui`, `events`, `operations` or `cross-surface` profile.
7. Read `references/technology-decisions.md`. Use `technical_define_boundary`, `technical_define_technology` and `technical_define_policy` for shared boundaries, justified technology choices and policies. Link each to PRD references and applicability; keep Lite compact and do not expand into local algorithms.
8. Before readiness checking or review, present a proportionate component diagram with responsibilities, boundaries, dependencies and data flows; identify databases and durable state owners, readers and writers. Present material technology choices and resolve user-owned tradeoffs through actual recorded answers. Label unverified integrations as assumptions with required validation. Give reasons for N/A; do not invent infrastructure. Hold readiness while any material choice, relevant diagram/flow or state owner is missing. Resolve gaps with prepared native questions and `product_record_*`; only then call `product_candidate_check` and `product_review_start`. An independent reviewer owns item/consistency verdicts and completion; never fabricate them. Changed inputs require current review.
9. Report the saved result, exact PRD pins, readiness and unresolved issues. Stop before Product Roadmap; never invoke it automatically.
