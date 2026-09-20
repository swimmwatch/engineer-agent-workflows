---
name: product-definition
description: "Create or revise a PRD from a ready product Idea through workflow MCP. Confirm depth and profiles, capture product meaning and use cases, require review evidence, then stop before Technical Design."
---

# Product Definition

Use only when the user explicitly asks to create or revise Product Definition.
This skill owns the product requirements document (PRD), not technology choice,
roadmap ordering, task specifications, planning, or implementation.

1. Set `skill_dir` to the absolute path of this `product-definition` directory.
   Run `node "$skill_dir/shared/scripts/verify-product-workflow.mjs" "$skill_dir"`.
   Stop before any workflow call if verification fails; return exactly:
   `Install or update the complete matching engineer-agent-workflows bundle for
   Codex using the documented pinned global command, then retry.`
   Read `shared/references/product-workflow.md` fully. Use project instructions already
   supplied by the host; do not reread their source files solely to recover
   context. Read an additional
   `AGENTS.md` only when it is not already in the active context or the file itself is in scope.
   Require the callable workflow MCP.
2. Call `product_open` for the absolute workspace and continue only from its
   returned context. Require an exact ready Idea source pin. If Idea is missing,
   draft, stale or blocked, report the prerequisite and stop; do not invoke
   `idea-refine` automatically.
3. Create or exactly resume one PRD candidate with `product_artifact_draft` and
   `artifact: prd`. Call `product_interview_resume`, inventory current evidence,
   and reuse every applicable explicit answer instead of asking again.
4. Propose Lite, Standard, or Deep scope with `product_scope_propose`. Ask
   material choices through `request_user_input`; persist the actual result
   with `product_question_answer`, or persist a non-answer with
   `product_question_no_answer` without guessing consent.
5. Do not read any profile reference before successful `product_scope_confirm`.
   Afterwards read only the active profile references from the required
   `idea-refine` dependency:
   `core` → `../idea-refine/references/product-profiles/core.md`;
   `backend` → `../idea-refine/references/product-profiles/backend.md`;
   `data` → `../idea-refine/references/product-profiles/data.md`;
   `security` → `../idea-refine/references/product-profiles/security.md`;
   `ui` → `../idea-refine/references/product-profiles/ui.md`;
   `events` → `../idea-refine/references/product-profiles/events.md`;
   `operations` → `../idea-refine/references/product-profiles/operations.md`;
   `cross-surface` → `../idea-refine/references/product-profiles/cross-surface.md`.
6. Use `prd_define_actor`, `prd_define_goal`, `prd_define_capability`,
   `prd_define_use_case`, `prd_define_rule`, `prd_define_constraint`, and
   `prd_define_term` only as warranted. Preserve unknown metrics as unknown and
   keep framework or local implementation choices out of the PRD.
7. Before readiness call `product_candidate_check`, then
   `product_review_start`. An independent reviewer owns verdict and consistency
   calls; the author never supplies them. Complete only current passing review
   evidence. If review cannot finish, report the saved draft and stop.
8. Report the saved result, exact Idea and PRD pins, unresolved issues and the
   available next stage. Stop before Technical Design and never invoke it
   automatically.
