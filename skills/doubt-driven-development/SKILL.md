---
name: doubt-driven-development
description: "Adversarially challenge a named high-risk product or technical decision when the user explicitly requests it. Compare evidence, assumptions, failure modes, reversibility, and safe experiments; do not use for routine uncertainty."
disable-model-invocation: true
user-invocable: true
---

# Doubt-Driven Development

Use this read-only workflow only when the user explicitly asks to challenge a
named high-risk product or technical decision. Do not use it for routine
uncertainty, edit artifacts, commit, publish, or implement an alternative.

1. Read applicable `AGENTS.md` in Codex or `CLAUDE.md` in Claude Code. State the
   exact decision, desired outcome, decision deadline, constraints,
   alternatives, affected contracts, and cost of being wrong. Inspect only
   task-scoped code, tests, interfaces, configuration, dependencies, workflows,
   and stable documentation.
2. Separate `verified` evidence, `inferred` conclusions, assumptions, and
   unknowns. Treat repository evidence and approved requirements as
   authoritative; do not invent benchmarks, guarantees, threat models, tools,
   or commands.
3. Steelman the proposed decision and its strongest alternative. Challenge
   correctness, failure and recovery, compatibility, security, privacy,
   operability, cost, reversibility, and maintenance only where material.
4. For each material concern, give a concrete failure scenario, affected
   contract, impact, supporting or missing evidence, reversibility, and the
   smallest safe experiment that could confirm or disconfirm it. Experiments
   remain proposals unless separately authorized.
5. End with a proceed, revise, defer, or reject recommendation and its decision
   conditions, or name the evidence blocker explicitly. Keep the analysis
   bounded and redact secrets, credentials, private paths, personal data, and
   unrelated source content. Stop without invoking another workflow.
