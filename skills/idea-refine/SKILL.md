---
name: idea-refine
description: "Refine a product, architecture, tooling, or workflow idea when the user explicitly asks to ideate, compare directions, or stress-test it before commitment. Frame goals, alternatives, trade-offs, risks, and unresolved decisions."
disable-model-invocation: true
user-invocable: true
---

# Idea Refine

Use this workflow only when the user explicitly asks to explore, compare, or
stress-test an idea before commitment. Refinement does not authorize a
specification, plan, implementation, repository mutation, installation, or
publication.

1. In Codex, read the nearest applicable `AGENTS.md`; in Claude Code, read
   applicable `CLAUDE.md`. Do not fabricate the other host's file. Inspect only
   task-relevant code, tests, interfaces, configuration, stable documentation,
   and settled decisions. Current repository evidence outranks generic
   guidance and stale handoffs; mark unsupported capabilities `unknown`.
2. Frame the audience, problem, desired outcome, success signals, scope,
   non-goals, constraints, assumptions, and cost of being wrong. Separate
   verified facts, inferences, open questions, and user choices.
3. Produce two to four materially different directions. Include the smallest
   reversible experiment and a credible defer, remove, or retain-current option
   where useful. Compare only material user value, correctness, compatibility,
   security, privacy, operability, maintenance, cost, testing, and
   reversibility.
4. When a material user choice is required, inspect the active callable-tool
   list. Use Prompt MCP only if a suitable interview operation is present, and
   follow its advertised schema and limits exactly with stable question and
   option IDs. Do not construct a namespace. Only an explicitly committed,
   non-sensitive answer may enter a user-authorized refinement record.
   `paused`, `cancelled`, `timed_out`, `unavailable`, `invalid_request`,
   `conflict`, and `failed` remain unresolved; preserve earlier committed
   answers and never substitute a fallback questionnaire.
5. End with a recommendation, evidence, trade-offs, smallest validation step,
   unresolved risks, and decisions still requiring the user. Keep output and
   diagnostics bounded; exclude private paths, prompts, answers, IDs,
   credentials, personal data, and environment values.

Stop before downstream specification, planning, implementation, or another
workflow. Recommendations are informational and do not invoke anything.
