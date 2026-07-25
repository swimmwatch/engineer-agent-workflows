---
name: planning-and-task-breakdown
description: "Create an implementation plan or review-gated task breakdown when the user explicitly requests planning, decomposition, milestones, or execution packets. Ground architecture and verification in repository evidence; do not implement."
disable-model-invocation: true
user-invocable: true
---

# Planning And Task Breakdown

Use this workflow only for an explicit request to plan, decompose, or create
review-gated execution packets. Produce a reviewable architecture; do not
implement it.

1. Read the applicable project instructions: `AGENTS.md` in Codex or
   `CLAUDE.md` in Claude Code. Inspect only task-scoped code, tests, interfaces,
   configuration, approved requirements, and stable documentation. Treat
   repository evidence and approved product requirements as authoritative.
2. Run the contained `scripts/verify-engineering-manual.mjs` through Node,
   passing this skill directory as its only argument. Then read
   `references/engineering-principles.md` once. Stop without a plan if
   verification fails. Apply only principles material to the task and record
   meaningful deviations or trade-offs.
3. State the goal, success criteria, audience, current state, constraints,
   non-goals, decisions, risks, compatibility needs, and manual gates. Mark
   unresolved claims as uncertainty instead of inventing facts.
4. Describe every affected or proposed architectural unit. For each, give its
   file and ownership boundary, existing or proposed state, language-appropriate
   symbols, responsibility, inputs and outputs, relevant state or lifecycle,
   errors or invariants, dependencies and why they point that way, requirement
   mapping, and verification evidence. Do not invent classes for functional,
   procedural, declarative, documentation, or configuration work.
5. Revise any proposed symbol or boundary contradicted by repository evidence
   before presenting the plan. Prefer the smallest adequate design and scoped
   verification over speculative structure.
6. For substantial multi-step work, read
   `references/task-packets.md`. Create a compact `plan.md`, linked `todo.md`,
   current-only `handoff.md`, and self-contained numbered packets only when the
   user authorized planning artifacts. Keep each packet independently
   verifiable and review-gated.
7. Present the complete plan and stop for review. Never mutate production
   artifacts, execute a packet, invoke another workflow, install anything, or
   treat plan approval as implementation authorization.
