---
name: doubt-driven-development
description: "Adversarially challenge a named high-risk product or technical decision with a fresh host-native reviewer when explicitly requested. Reconcile evidence, assumptions, failure modes, reversibility, and safe experiments."
disable-model-invocation: true
user-invocable: true
---

# Doubt-Driven Development

Use this read-only workflow only when the user explicitly asks to challenge a
named high-risk product or technical decision. Do not use it for routine
uncertainty, edit artifacts, commit, publish, or implement an alternative.

1. Use project instructions already supplied by the host; do not reread their
   source files solely to recover context. Read an additional task-scoped
   `CLAUDE.md` only when it is not already in the active
   context or the file itself is in scope. State the
   exact decision, desired outcome, decision deadline, constraints,
   alternatives, affected contracts, and cost of being wrong. Inspect only
   task-scoped code, tests, interfaces, configuration, dependencies, workflows,
   and stable documentation.
2. Separate `verified` evidence, `inferred` conclusions, assumptions, and
   unknowns. Treat repository evidence and approved requirements as
   authoritative; do not invent benchmarks, guarantees, threat models, tools,
   or commands.
3. Extract the smallest reviewable artifact and its contract. Do not pass the
   claim, prior reasoning, or desired verdict. Invoke a fresh-context
   host-native subagent with a read-only adversarial instruction to find
   contract violations and missing evidence. If a fresh reviewer is unavailable
   in the current host or nested context, report the limitation and stop rather
   than presenting self-review as independent review. An external CLI review is
   not required and must not be invoked without a separate explicit request.
4. Reconcile every reviewer finding against the artifact: classify contract
   misreads, actionable defects, accepted trade-offs, and noise. Steelman the
   proposed decision and its strongest alternative; reviewer output is evidence,
   not a verdict.
5. For each material concern, give a concrete failure scenario, affected
   contract, impact, supporting or missing evidence, reversibility, and the
   smallest safe experiment that could confirm or disconfirm it. Experiments
   remain proposals unless separately authorized.
6. End with a proceed, revise, defer, or reject recommendation and its decision
   conditions, or name the evidence blocker explicitly. Keep the analysis
   bounded and redact secrets, credentials, private paths, personal data, and
   unrelated source content. Stop without invoking another workflow.
