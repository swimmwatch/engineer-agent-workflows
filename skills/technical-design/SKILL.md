---
name: technical-design
description: "Create or revise shared Technical Design from an exact ready PRD pin. Capture boundaries, evidence-grounded technology choices and policies, require review evidence, then stop before Product Roadmap."
disable-model-invocation: true
user-invocable: true
---

# Technical Design

Use only when the user explicitly asks to create or revise shared Technical Design. This skill owns cross-cutting boundaries, technology choices and technical policies. It does not own local implementation algorithms, roadmap ordering, task specifications, planning or implementation.

1. Set `skill_dir` to the absolute `technical-design` directory. Run `node "$skill_dir/shared/scripts/verify-product-workflow.mjs" "$skill_dir"`. Stop before any workflow call if verification fails; return exactly: `Install or update the complete matching engineer-agent-workflows bundle for {{HOST_DISPLAY_NAME}} using the documented pinned global command, then retry.`
2. Read `shared/references/product-workflow.md` fully. Use project instructions already supplied by the host; do not reread them solely to recover context. Read additional `{{HOST_PROJECT_INSTRUCTIONS}}` only if absent from active context or itself in scope. Require callable workflow MCP; follow published schemas.
3. Call `product_open` with the absolute workspace. Continue with the returned context after every successful call. Use `product_context_prepare` with purpose `technical-design`, artifact `prd`, and every `product_context_next` continuation. Require exact ready PRD source pin evidence from the current revision. If it is missing, draft, stale or blocked, report the prerequisite and stop; never invoke Product Definition automatically.
4. Create or exactly resume one candidate with `product_artifact_draft`, artifact `technical-design`, and only the validated PRD upstream pins. Call `product_interview_resume`. Inventory applicable saved evidence before asking; reuse every applicable explicit answer with provenance.
5. Propose proportional Lite, Standard or Deep scope through `product_scope_propose`. Ask material choices through `{{HOST_QUESTION_TOOL}}`; persist an actual answer with `product_question_answer`, or a non-answer with `product_question_no_answer`. Never guess consent.
6. Do not read any profile reference before successful `product_scope_confirm`. Afterwards read only the confirmed active profile references from the installed `idea-refine` dependency: `core` → `../idea-refine/references/product-profiles/core.md`; `backend` → `../idea-refine/references/product-profiles/backend.md`; `data` → `../idea-refine/references/product-profiles/data.md`; `security` → `../idea-refine/references/product-profiles/security.md`; `ui` → `../idea-refine/references/product-profiles/ui.md`; `events` → `../idea-refine/references/product-profiles/events.md`; `operations` → `../idea-refine/references/product-profiles/operations.md`; `cross-surface` → `../idea-refine/references/product-profiles/cross-surface.md`.
7. Use `technical_define_boundary` for shared ownership, inputs, outputs, flows and errors; `technical_define_technology` for evidence, alternatives, rationale and revisit conditions; `technical_define_policy` for cross-cutting rules and exact authoritative-contract references. Link every item to justified PRD references and explicit applicability. Keep Lite compact; do not invent frameworks or expand into local algorithms.
8. Resolve material gaps using prepared native questions and dedicated `product_record_*` evidence tools. Before readiness call `product_candidate_check`, then `product_review_start`. An independent reviewer owns every item verdict, consistency verdict and completion; the author never fabricates review evidence. Changed inputs require a current review.
9. Report the saved result, exact PRD pins, readiness and unresolved issues. Stop before Product Roadmap; never invoke it automatically.
