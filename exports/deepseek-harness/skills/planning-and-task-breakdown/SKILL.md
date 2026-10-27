---
name: planning-and-task-breakdown
description: "Create adaptive-depth implementation plans from Approved specifications and confirmed scope when explicitly requested. Produce profile contracts, architecture, test-first tasks, and documentation; do not implement."
disable-model-invocation: true
user-invocable: true
---

# Planning And Task Breakdown

On explicit request, create planning artifacts, not production behavior.
Model suggestion: the current session model. Never switch or gate on model.

1. Set `skill_dir` to the absolute `planning-and-task-breakdown` directory.
   Run `node "$skill_dir/shared/scripts/verify-engineering-manual.mjs" "$skill_dir"`
   with that sole argument. Stop without a plan if verification fails; return exactly:
   `Install or update the complete matching engineer-agent-workflows bundle for
   DeepSeek Harness using the documented pinned global command, then retry.`
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
   Use host-supplied guidance; read additional `AGENTS.md`
   only if absent from active context or itself in scope.
   Inspect code, tests, interfaces and configuration.
4. Respect confirmed Lite, Standard, or Deep depth. Load only active profile
   references selected by the manifest: map each active profile to exactly
   `references/<profile>-planning.md`. Never load a reference for an inactive,
   not-applicable, or unresolved profile. Return new scope evidence to specification.
5. For every task, read `references/technical-agreement.md`: inspect evidence,
   present concrete alternatives and a recommendation, obtain explicit agreement,
   record exact bindings, then require `planning_packet_check` readiness.
   One adequate solution needs confirmation, not invented alternatives.
   Use callable `ask_user_question` in the current mode; do not enter plan mode solely to ask.
   If the tool is unavailable, ask the question directly; await answers.
6. Describe significant existing/proposed language-appropriate units: symbols,
   purpose, inputs, outputs, lifecycle, errors, invariants, dependency direction,
   requirement IDs and verification. Do not invent classes. Revise boundaries
   contradicted by repository evidence. Keep private helpers flexible.
7. Create only non-design manifest-listed contracts, not production artifacts.
   Use stable IDs and exact references.
   For declared root design outputs, record a separate `design-planning`
   invocation after this plan; keep affected packets pending its evidence.
8. Read `references/task-packets.md`. For substantial multi-step work,
   expose stages, dependencies, manual gates, rollout, and recovery. Lite creates
   `plan.md`, `todo.md`, current-only `handoff.md`, and one compact
   implementation packet. Standard and Deep add only risk-justified profile
   artifacts and verifiable packets. Every behavior
   packet creates and runs discriminating tests or checks before implementation,
   then corrects implementation until correct checks pass; never weaken a
   correct check to obtain green.
9. Read `references/developer-documentation.md`; record whether durable
   documentation is warranted and add its packet only when that reference's
   threshold is met. Present the plan and stop. Never mutate production
   artifacts, execute a packet, install, commit, publish, invoke another workflow,
   or treat plan approval as implementation authorization.
