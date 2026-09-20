---
name: product-roadmap
description: "Create or revise a staged product roadmap from exact ready PRD and Technical Design pins. Keep distant stages coarse, define independent tasks without creating specifications, review, then stop."
disable-model-invocation: true
user-invocable: true
---

# Product Roadmap

Use only for an explicit request to create or revise a product roadmap. It owns stages, epics, stories and independent tasks, not specifications, plans or code.

1. Set `skill_dir` to the absolute `product-roadmap` directory. Run `node "$skill_dir/shared/scripts/verify-product-workflow.mjs" "$skill_dir"`. Stop before any workflow call if verification fails; return exactly: `Install or update the complete matching engineer-agent-workflows bundle for {{HOST_DISPLAY_NAME}} using the documented pinned global command, then retry.`
2. Read `shared/references/product-workflow.md` fully. Use project instructions already supplied by the host; do not reread them solely to recover context. Read `{{HOST_PROJECT_INSTRUCTIONS}}` only if absent from active context or itself in scope. Require callable workflow MCP.
3. Call `product_open` for the absolute workspace and always continue with the returned context. Call `product_context_prepare`, purpose `product-roadmap`, for `prd` and `technical-design`; exhaust `product_context_next`. Require exact ready PRD and Technical Design source pins from one current revision. If either is missing, draft, stale or blocked, stop; never invoke its producer automatically.
4. Create or resume one candidate using `product_artifact_draft`, artifact `roadmap`, with only those pins. Call `product_interview_resume`; reuse applicable explicit answers with provenance.
5. Propose proportional Lite, Standard or Deep scope using `product_scope_propose`. Ask via `{{HOST_QUESTION_TOOL}}`; save the result with `product_question_answer` or `product_question_no_answer`.
6. Do not read any profile reference before successful `product_scope_confirm`. Afterwards read only the confirmed active profile references from the installed `idea-refine` dependency: `core` → `../idea-refine/references/product-profiles/core.md`; `backend` → `../idea-refine/references/product-profiles/backend.md`; `data` → `../idea-refine/references/product-profiles/data.md`; `security` → `../idea-refine/references/product-profiles/security.md`; `ui` → `../idea-refine/references/product-profiles/ui.md`; `events` → `../idea-refine/references/product-profiles/events.md`; `operations` → `../idea-refine/references/product-profiles/operations.md`; `cross-surface` → `../idea-refine/references/product-profiles/cross-surface.md`.
7. Use `roadmap_define_stage` for outcomes and verification, `roadmap_define_epic` for goal-linked stage work, `roadmap_define_story` only for actor-visible value, and `roadmap_define_task` for independent feature, technical or research outcomes. A technical task is not a fake user story: keep `story_ref` null without a real actor story. Link only actual dependencies with `roadmap_link_dependency`.
8. Keep Lite compact. Detail the nearest actionable stage and keep far stages coarse. Tasks have identity, outcome, scope, non-goals and acceptance, but no specification. Never trigger specification, planning or task execution automatically.
9. Resolve material gaps with native questions and `product_record_*`. Call `product_candidate_check`, then `product_review_start`. An independent reviewer owns verdicts, consistency and completion; the author never fabricates review evidence.
10. Report the saved roadmap, upstream pins, readiness and issues. Stop before task specification or task execution; never invoke either automatically.
