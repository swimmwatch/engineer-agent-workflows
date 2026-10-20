---
name: incremental-implementation
description: "Implement exactly one authorized task packet per explicit invocation using test-first RED/GREEN/PROVE, verify it, update checklist and handoff, then stop."
---

# Incremental Implementation

Implement exactly one explicitly authorized packet.
Model suggestion: Terra. Never switch or gate on model.

1. Set `skill_dir` to this skill's absolute directory.
   Run `node "$skill_dir/shared/scripts/verify-engineering-manual.mjs" "$skill_dir"`
   before any write or commit. If verification fails,
   return exactly:
   `Install or update the complete matching engineer-agent-workflows bundle
   for Codex using the documented pinned global command, then
   retry.` Stop without fetching, copying, approximating, or ignoring the
   manual.
   Run `git rev-parse --is-inside-work-tree` separately in the packet directory;
   require visible `true`. Otherwise read only the packet/handoff needed to
   checkpoint the blocker and stop; do not initialize Git or substitute snapshots.
   Check declared tools and runner authority before bulk reads.
2. Read `shared/references/yaml-contracts.md` fully in a separate call, not a batch.
   Read `shared/references/engineering-principles.md`,
   `shared/references/test-discipline.md`, and the sibling planning skill's
   `references/task-packets.md`. Use host-supplied project instructions; read additional `AGENTS.md` only if absent from active context or itself in scope.
   For a valid product-linked task, read `shared/references/product-workflow.md`
   and follow its Implementation role; otherwise keep the standalone path and
   do not call product task tools.
   Use scenario MCP for the confirmed manifest, decisions, catalog and experience
   YAML; never shell/file readers.
   Read the current checklist, packet and handoff when continuing. Check the
   Approved specification, linked requirements and contracts, code and tests.
   Re-verify packet evidence; do not reload every profile or the entire spec.
   For conflicts, failed checks or resume, read
   `references/packet-recovery.md`.
3. Inspect tracked, staged and untracked changes; no clean tree or commit is required.
   Verify prerequisites, authorization and an uncommitted prior packet
   against its handoff; inspect every staged diff. Missing review or commit is not a gate.
   Never infer commit, push, publication or external-action authority.
4. In host planning mode, validate the existing plan and keep production unchanged.
   Do not redesign architecture. If a material boundary or contract needs revision,
   checkpoint the blocker and stop for separately authorized specification or planning.
5. In implementation mode, write the test or discriminating check before
   implementation, observe relevant RED, implement minimal correct GREEN, and
   apply PROVE when shared discipline requires it. Preserve unrelated changes,
   public contracts and repository rules before broader verification.
6. Run focused checks after each material change and repository-proportional
   verification when the slice is coherent. When a correct check fails, correct
   the implementation and repeat until it passes. Do not weaken tests or checks
   to obtain green. A failed or unavailable required check leaves the packet
   incomplete with exact evidence.
   Ask unresolved material decisions with callable `request_user_input`
   in the current mode, following its schema; do not enter plan mode solely to
   ask. If unavailable, ask directly. Never invent the required answer.
7. Only after every required check passes, mark only the current checklist item and
   replace the compact current handoff with changes, evidence, limitations, and the
   next packet. Stop after this packet; never launch another packet or review.
   Independent review is optional and separately invoked, not a prerequisite
   for completion or the next invocation. Make only explicitly authorized commits.
