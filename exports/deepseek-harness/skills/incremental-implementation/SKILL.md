---
name: incremental-implementation
description: "Implement exactly one authorized task packet per explicit invocation using test-first RED/GREEN/PROVE, verify it, update checklist and handoff, then stop."
disable-model-invocation: true
user-invocable: true
---
# Incremental Implementation

Implement exactly one explicitly authorized packet.
Model suggestion: the current session model. Never switch or gate on model.
Do not reread supplied SKILL.md or references; retrieve gaps or stop; never rerender.
1. Set `skill_dir` to its absolute directory.
   Run `node "$skill_dir/shared/scripts/verify-engineering-manual.mjs" "$skill_dir"`
   before any write or commit. If verification fails, return exactly:
   `Install or update the complete matching engineer-agent-workflows bundle
   for DeepSeek Harness using the documented pinned global command, then
   retry.` Stop without fetching, copying, approximating, or ignoring the manual.
   Run `git rev-parse --is-inside-work-tree` separately in the packet directory;
   require visible `true`. Otherwise checkpoint from packet/handoff and stop;
   do not initialize Git or substitute snapshots.
   Check tools and runner authority before bulk reads.
2. Read `shared/references/workflow-state-access.md` fully in its own call.
   Use scenario MCP. Read the current checklist, packet and handoff.
   Before bulk reads or edits, call
   `specification_check_state` with pinned inputs and `planning_packet_check`
   with exact `agreement_ref` and `expected_proposal_digest`. Require valid
   spec and ready agreement. Missing capability: stop.
   Missing, stale or legacy agreement returns only the affected task to planning;
   never synthesize agreement. For conflicts, failed checks or resume, read
   `references/packet-recovery.md`.
3. Read `shared/references/engineering-principles.md`,
   `shared/references/test-discipline.md`, and
   `shared/references/implementation-context.md`. Use supplied guidance; read additional
   `AGENTS.md` only if absent from active context or itself in scope.
   For product-linked tasks, follow its conditional Product-linked execution
   section; otherwise skip product task tools.
   Use scenario MCP for confirmed manifest, decisions, catalog and experience
   YAML; never shell/file readers. Recheck Approved specification, linked requirements,
   contracts, code, tests and evidence; do not reload every profile or entire spec.
4. Inspect tracked, staged and untracked changes; no clean tree or commit is required.
   Verify authority, prerequisites and prior work against handoff.
   Inspect every staged diff. Missing review or commit is not a gate.
   No implied external authority.
   In host planning mode, validate the existing plan and keep production unchanged; stop.
   Preserve unrelated work; do not redesign architecture.
5. Write the test or check before implementation, observe
   RED, implement minimal correct GREEN, and apply PROVE when required.
   Preserve contracts and repository rules. Run focused checks after each material
   change and proportional final checks. When a correct check fails, correct implementation and repeat;
   do not weaken tests to obtain green.
   Failed/unavailable required checks leave the packet incomplete.
   Ask unresolved decisions with `ask_user_question` per schema, in current mode;
   do not enter plan mode solely to ask. If unavailable, ask directly; never invent answers.
6. Compare the scoped diff with agreed technical commitments; record in handoff.
   Private helpers are flexible; shared signature, ownership or
   pattern changes return to planning; behavior changes to specification.
   Recheck `specification_check_state` and
   `planning_packet_check` with pinned inputs.
   After every required check passes, mark only the current checklist item,
   replace handoff with changes, evidence, limitations and next packet; stop.
   Never launch another packet or review. Review is optional,
   not a prerequisite for completion or the next invocation.
   Make only explicitly authorized commits.
