---
name: spec-driven-development
description: "Define or revise an implementation-ready specification when the user explicitly requests substantial specification work. Use recoverable Prompt MCP decisions, persist non-sensitive answers, require draft approval, and stop before planning."
disable-model-invocation: true
user-invocable: true
---

# Spec-Driven Development

Keep this workflow specification-only.

1. Locate the sibling `planning-and-task-breakdown` skill. Run its
   `scripts/verify-engineering-manual.mjs` through Node with this skill
   directory as the only argument before writing any artifact. If verification
   fails, return exactly: `Install or update the complete matching
   engineer-agent-workflows bundle for Codex and Claude Code using the
   documented pinned global command, then retry.` Stop without fetching,
   copying, approximating, or ignoring the manual.
2. Read the verified sibling `references/engineering-principles.md`. Read
   applicable `AGENTS.md` in Codex or `CLAUDE.md` in Claude Code, then inspect
   task-scoped code, tests, interfaces, configuration, and stable
   documentation. Repository evidence and approved requirements outrank
   generic guidance.
3. Read `references/specification-interview.md`. Create or reload the
   repository-owned `decisions.yaml`; treat it, not chat history, as recovery
   state. Record stated choices and observed facts without asking again.
4. Use only callable Prompt MCP tools and their advertised schemas for material
   user decisions. Do not construct a tool namespace. Checkpoint each
   non-sensitive committed answer immediately; treat every non-answer status as
   unresolved and stop when it blocks the contract.
5. Resolve outcomes, interfaces, data and state contracts, validation, limits,
   failure and recovery, security and privacy, compatibility, non-goals, and
   objective acceptance. Keep implementation-local structure out of the
   specification.
6. Map active decisions to numbered requirements and write `spec.md` with
   `Status: Draft`. Run the reference's gap review, then request a separate
   Prompt MCP approval. Mark `Approved` only for a committed positive approval;
   otherwise revise or leave the draft open.
7. Update the decision ledger and specification handoff, then stop. Never
   create an implementation plan, execute work, invoke another workflow,
   install tools, or treat interview completion as draft approval.
