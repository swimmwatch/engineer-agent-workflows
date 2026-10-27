---
name: design-planning
description: "Prepare manifest-scoped UI design after an implementation plan, on explicit request. Use separately installed Penpot skills, save validated design contracts and snapshots, and update affected handoffs; do not implement."
disable-model-invocation: true
user-invocable: true
---

# Design Planning

Run only on explicit request after the main plan. Model suggestion:
the current session model. Never switch or gate on a model.

1. Set `skill_dir` to the absolute directory of this `design-planning` skill.
   Run `node "$skill_dir/shared/scripts/verify-engineering-manual.mjs" "$skill_dir"`.
   On failure, return exactly: `Install or update the complete matching
   engineer-agent-workflows bundle for DeepSeek Harness using the documented
   pinned global command, then retry.` Stop without fetching or approximating it.
2. Read verified `shared/references/engineering-principles.md`,
   `shared/references/test-discipline.md` and
   `shared/references/yaml-contracts.md`. Use project instructions already
   supplied by the host; do not reread their source files solely to recover context.
   Read task-scoped `AGENTS.md` only when it is not
   already in the active context or the file itself is in scope.
   Require Approved `spec.md`, confirmed schema-valid
   `manifest.yaml`, and existing `tasks/plan.md`, `todo.md`, `handoff.md`.
3. Determine eligibility from the manifest, not the presence of existing screens.
   Active `ui` plus declared `project_artifacts` under `design/` requires this
   stage, including new interfaces with no existing design. With no declared
   design outputs, report not applicable and stop before loading Penpot guidance,
   design schemas or external skills. Legacy or contradictory UI declarations
   require specification reconciliation, not silent migration or assumed scope.
4. Read `references/penpot-workflow.md`. Load only affected requirements,
   packets, catalog entries and the current specification's screens. Query needed
   decisions through the mandatory workflow MCP; never read workflow YAML directly. Resolve missing material design choices with callable
   `ask_user_question` in the current mode. If unavailable, ask directly.
   Stop dependent work while a required answer is missing; no answer is not consent.
5. Use available separately installed Penpot skills for the bounded design
   operation. Follow their own required references and checkpoints; do not copy
   their instructions, auto-install them, or improvise a replacement. Loading an
   external skill does not authorize broader work, other specifications or code.
6. Use scenario MCP tools for design contracts and Penpot for snapshots.
   Let MCP enforce schemas; check cross-file links,
   actual native exports and required visual evidence. Keep missing evidence
   pending. Design self-checks are not independent code or security reviews.
7. Update only affected packets, checklist and current handoff with exact design
   sources, IDs, digests, checks and remaining blockers. Do not mark dependent
   implementation ready until required design evidence passes. New behavior or
   scope returns to specification; broader task changes return to main planning.
8. Summarize design results and stop. Do not execute an implementation packet,
   launch independent reviews, commit, publish or start another project stage.
