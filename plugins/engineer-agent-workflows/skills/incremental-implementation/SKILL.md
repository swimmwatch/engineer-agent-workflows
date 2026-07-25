---
name: incremental-implementation
description: "Implement exactly one authorized, self-contained task packet per explicit invocation, verify it, update its checklist and handoff, then stop for review. Commit the completed previous packet only with explicit commit authorization."
disable-model-invocation: true
user-invocable: true
---

# Incremental Implementation

Implement exactly one explicitly authorized packet.

1. Locate the sibling `planning-and-task-breakdown` skill. Run its
   `scripts/verify-engineering-manual.mjs` through Node with this skill
   directory as the only argument before writing a plan, code, documentation,
   checklist, handoff, or commit. If verification fails, return exactly:
   `Install or update the complete matching engineer-agent-workflows bundle
   for Codex and Claude Code using the documented pinned global command, then
   retry.` Stop without fetching, copying, approximating, or ignoring the
   manual.
2. Read the verified sibling `references/engineering-principles.md` and
   `references/task-packets.md`. Read applicable `AGENTS.md` in Codex or
   `CLAUDE.md` in Claude Code, the current checklist and packet, and only
   task-scoped code, tests, interfaces, configuration, and references. Read the
   current handoff when continuing.
3. Confirm that prerequisites and authorization are complete. If the previous
   packet remains uncommitted, verify it against the handoff and commit only
   its exact paths when the user explicitly authorized commits. Inspect every
   staged diff. Never infer commit, push, publication, or external-action
   authority.
4. In host planning mode, expose the complete language-appropriate architecture
   before implementation: ownership boundaries, existing/proposed symbols,
   responsibilities, inputs and outputs, state and lifecycle, errors and
   invariants, dependency direction, requirement mapping, and verification.
   Revise disproved boundaries and keep production unchanged.
5. In implementation mode, implement only the current packet. Preserve
   unrelated changes, public contracts, and repository-specific rules. Choose
   the simplest adequate design; make ownership, cleanup, errors, concurrency,
   compatibility, and security behavior explicit where material.
6. Run the packet's focused checks and repository-proportional verification.
   Do not weaken checks. A failed or unavailable required check leaves the
   packet incomplete with exact evidence.
7. After all applicable checks pass, mark only the current checklist item and
   replace the current handoff with changes, evidence, limitations, and the
   next packet. Stop for review and leave the completed packet uncommitted
   unless earlier commit authority explicitly covers it.
