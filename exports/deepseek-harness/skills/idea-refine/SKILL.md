---
name: idea-refine
description: "Refine an idea explicitly in standalone mode or save a durable product Idea through workflow MCP. Compare evidence, alternatives, risks, and unresolved decisions; stop before Product Definition."
disable-model-invocation: true
user-invocable: true
---

# Idea Refine

Use only when the user explicitly asks to explore an idea or create/revise a
durable product Idea. Refinement does not authorize another workflow, Git
mutation, installation, publication, tracker synchronization, or remote design.

1. Set `skill_dir` to this skill directory. Use project instructions already
   supplied by the host; do not reread their source files solely to recover
   context. Read an additional
   `AGENTS.md` only when it is not already in the active context or the file itself is in scope.
   Do not fabricate another host's file.
   Current repository evidence outranks generic guidance; keep unsupported
   capabilities `unknown`, output bounded, and choose one mode from the request.
2. **Standalone mode:** inspect only relevant evidence, separate facts,
   hypotheses and user choices, compare two to four material directions, and
   return a recommendation plus unresolved questions. Do not create or mutate a
   product. Stop before Product Definition.
3. **Durable product mode:** read
   `shared/references/product-workflow.md` fully. Require the callable workflow
   MCP. Call `product_open` for the absolute workspace. Call
   `product_initialize` only when the user explicitly requested a new product;
   never guess a binding or overwrite an existing product. Always continue with
   the returned context from every successful call.
4. Resume the candidate with `product_interview_resume`; reuse every applicable
   explicit answer and do not ask it again. Inventory known evidence before
   proposing Lite, Standard, or Deep scope with `product_scope_propose`.
   Ask material choices through `ask_user_question` in the current mode;
   do not enter plan mode solely to ask. Persist the actual result with
   `product_question_answer`, or persist a non-answer with
   `product_question_no_answer` without treating it as consent.
5. Do not read any profile reference before successful `product_scope_confirm`.
   Afterwards read only the active profile references:
   `core` → `references/product-profiles/core.md`;
   `backend` → `references/product-profiles/backend.md`;
   `data` → `references/product-profiles/data.md`;
   `security` → `references/product-profiles/security.md`;
   `ui` → `references/product-profiles/ui.md`;
   `events` → `references/product-profiles/events.md`;
   `operations` → `references/product-profiles/operations.md`;
   `cross-surface` → `references/product-profiles/cross-surface.md`.
6. Persist only supported Idea content through concrete product tools. Keep
   observations, assumptions, research and instructions distinct. A missing
   material problem, direction or scope choice leaves the candidate draft.
7. Before readiness call `product_candidate_check`, then
   `product_review_start`. An independent reviewer owns verdict and consistency
   calls; the author never supplies them. Complete only current passing review
   evidence. If review cannot finish, report the saved draft and stop.
8. Report the saved result, pins, unresolved issues and available next stage.
   Stop before Product Definition; never invoke it automatically.
