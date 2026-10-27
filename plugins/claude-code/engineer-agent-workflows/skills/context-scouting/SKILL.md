---
name: context-scouting
description: "Delegate useful multi-step context discovery to bounded, read-only native scouts when explicitly invoked for the current task. Verify concise findings and use minimal direct lookup when delegation is unavailable."
disable-model-invocation: true
user-invocable: true
---

# Context Scouting

Only explicit user invocation activates this policy for the current task;
completion or cancellation ends its scope. Repeated invocation reuses findings.
New tasks do not inherit it. This standalone skill grants no additional
editing, installation, publication, or workflow authority and needs no workflow MCP.

Use host-supplied project instructions; do not reread them solely to recover context.
Read `CLAUDE.md` only if absent from active context or itself in scope.

1. Delegate bounded multi-step discovery across unfamiliar files or sources only
   when expected main-context reduction exceeds dispatch and verification overhead
   and runtime rules allow it, including useful independent parallel work where
   required. Known-file reads, short checks, and sufficient evidence use direct lookup.
   Keep repository and external research within the authorized scope.
2. Start with one scout. Add another only for substantial, independent work within
   host limits. Only after choosing delegation, read [delegation.md](references/delegation.md).
   Use the smallest adequate depth; depth is separate from reasoning effort.
3. Request `haiku` through the native tool's supported model field,
   or the user's supported explicit override for this task. Do not compare models,
   research prices, change global settings, or alter main/reviewer/implementer models.
   Use supported `medium` reasoning; otherwise omit it, do not invent
   fields. Prefer fresh context; never silently inherit a larger parent model.
   Distinguish requested from effective selection; the latter is unknown without
   host evidence. Model aliases do not pin an underlying release.
4. Scouts inspect only: no edits, external mutations, installations, commits, or
   child agents. Restrict tools to read-only capabilities where supported; otherwise
   give inspection-only instructions without claiming an enforced sandbox.
   Use native subagents, never substitute user-visible tasks, nested CLI sessions,
   orchestration services, or automatic configuration. The main agent owns all
   decisions, edits, and validation.
5. Use bounded inputs and verifiable summaries as specified in the reference.
   Preserve applicable instructions, source restrictions, privacy, and unknowns.
   Read decisive passages before consequential conclusions or edits; reconcile
   stale or conflicting findings. Reuse valid evidence and targeted follow-ups.
   Scout completion never replaces required checks or independently verifies edits.
6. If native delegation, required model selection/settings, or a usable result is
   unavailable, disclose the specific limitation once and continue the minimum necessary
   authorized discovery directly. Preserve partial evidence and unresolved gaps.
   Do not repeatedly retry unsupported capabilities or silently escalate or substitute
   models. Continue independent authorized work; report remaining blockers and next action.
7. On cancellation or task replacement, stop new dependent work and outstanding
   scouts through supported controls where possible; do no fallback discovery after
   cancellation. Report failed stopping honestly; label late or partial results.
   Resumption reuses valid findings and reassesses changed inputs. Stop scouting when
   the question is answered or a concrete blocker prevents progress.
8. Report savings as unmeasured without comparable usage evidence. Numerical claims
   must count dispatch, scouts, summaries, verification, retries and fallback against
   a comparable baseline, distinguishing main-context reduction, total tokens, cost
   and latency. Never promise universal savings or infer monetary savings from model size.
