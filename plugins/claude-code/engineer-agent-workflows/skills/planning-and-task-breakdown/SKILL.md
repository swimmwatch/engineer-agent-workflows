---
name: planning-and-task-breakdown
description: "Create adaptive-depth implementation plans from Approved specifications and confirmed scope when explicitly requested. Produce profile contracts, architecture, test-first tasks, and documentation; do not implement."
disable-model-invocation: true
user-invocable: true
---

# Planning And Task Breakdown

On explicit request, create planning artifacts, not production behavior.
Model suggestion: Opus. Never switch or gate on model.

1. Set `skill_dir` to the absolute `planning-and-task-breakdown` directory.
   Run `node "$skill_dir/shared/scripts/verify-engineering-manual.mjs" "$skill_dir"`
   with that sole argument. Stop without a plan if verification fails; return exactly:
   `Install or update the complete matching engineer-agent-workflows bundle for
   Claude Code using the documented pinned global command, then retry.`
2. Read `shared/references/yaml-contracts.md` before any workflow-state access.
   Use scenario MCP tools for manifest and decisions, never direct YAML reads.
   Require `spec.md` with `Status: Approved` and MCP-confirmed
   `manifest.yaml` from `spec-driven-development`. If missing or inconsistent,
   stop and resume specification. Never infer confirmation or reduce scope.
   For a valid product-linked task, read `shared/references/product-workflow.md`
   and follow its Planning role; otherwise keep the standalone path and do not
   call product task tools.
3. Read verified `shared/references/engineering-principles.md`,
   `shared/references/test-discipline.md`, and `references/adaptive-planning.md`.
   Use host-supplied project instructions; do not reread them solely to recover
   context. Read `CLAUDE.md` only if absent from
   active context or itself in scope.
   Inspect code, tests, interfaces and configuration.
4. Respect confirmed Lite, Standard, or Deep depth. Load only active profile
   references selected by the manifest: map each active profile to exactly
   `references/<profile>-planning.md`. Never load a reference for an inactive,
   not-applicable, or unresolved
   profile. Return new scope evidence to specification instead of changing the
   manifest here.
5. Resolve only implementation choices not settled by approved behavior or
   repository evidence. Use callable `AskUserQuestion` in the current
   mode and do not enter plan mode solely to ask. Ask plainly with an example;
   If the tool is unavailable, ask the question directly and stop when required.
6. Describe each affected existing or proposed architectural unit: its
   language-appropriate boundary or symbol, purpose, inputs, outputs, lifecycle,
   errors and invariants, dependency direction, requirement IDs, and verification.
   Do not invent classes for non-object-oriented work. Revise boundaries
   contradicted by repository evidence.
7. Create only non-design manifest-listed planning contracts, not production
   artifacts. Keep facts authoritative with stable IDs and exact references.
   For declared root design outputs, record a separate `design-planning`
   invocation after this plan; keep affected packets pending its evidence.
8. Read `references/task-packets.md`. For substantial multi-step work,
   expose dependencies, manual gates, rollout, and recovery. Lite creates
   `plan.md`, `todo.md`, current-only `handoff.md`, and one compact
   implementation packet. Standard and Deep add only profile artifacts and
   verifiable packets justified by risk. Every behavior
   packet creates and runs discriminating tests or checks before implementation,
   then corrects implementation until correct checks pass; never weaken a
   correct check to obtain green.
9. Read `references/developer-documentation.md`; record whether durable
   documentation is warranted and add its packet only when that reference's
   threshold is met. Present the plan and stop. Never mutate production
   artifacts, execute a packet, install, commit, publish, invoke another workflow,
   or treat plan approval as implementation authorization.
