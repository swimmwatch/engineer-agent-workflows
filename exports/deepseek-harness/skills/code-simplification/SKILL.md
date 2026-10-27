---
name: code-simplification
description: "Simplify existing code when the user explicitly requests a behavior-preserving clarity refactor. Reduce unnecessary complexity and duplication while preserving public contracts, errors, side effects, compatibility, and verified behavior."
disable-model-invocation: true
user-invocable: true
---

# Code Simplification

Use this workflow only for an explicit request to make existing code clearer
without changing behavior. The request authorizes only the bounded refactor it
names, not new features, migrations, dependencies, or public contract changes.

1. Use project instructions already supplied by the host; do not reread their
   source files solely to recover context. Read an additional task-scoped
   `AGENTS.md` only when it is not already in the active
   context or the file itself is in scope. Inspect
   the target, callers, tests, interfaces, configuration, and stable
   documentation needed to establish current behavior. Treat repository
   evidence and approved requirements as authoritative; do not invent tools or
   commands.
2. State the preserved contract before editing: inputs, outputs, defaults,
   errors, side effects, state and resource lifecycle, concurrency,
   compatibility, and performance-sensitive behavior where applicable. Capture
   a reproducible test or behavior snapshot. Stop if the contract cannot be
   established safely.
3. Make the smallest cohesive refactor. Prefer deleting proven dead code,
   clarifying names, flattening control flow, isolating pure transformations,
   and removing demonstrated duplication. Do not add speculative abstractions,
   options, layers, or dependencies.
4. Run the same behavior evidence before and after, plus focused repository
   checks. Compare equivalent inputs and observable outcomes. Revert or stop if
   public behavior, errors, side effects, compatibility, security, or relevant
   performance changes without explicit authorization.
5. Report the simplification, preserved contract, before-and-after evidence,
   uncertainty, and checks run. Keep diagnostics bounded; redact secrets,
   credentials, private paths, personal data, and unrelated source content.
   Stop without widening scope, invoking another workflow, committing, or
   publishing unless separately authorized.
