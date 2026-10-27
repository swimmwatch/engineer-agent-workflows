---
name: context-engineering
description: "Improve agent instructions, skill routing, task context, or handoffs when the user explicitly requests context optimization, stale-guidance repair, or session recovery. Keep durable guidance aligned with current repository evidence."
disable-model-invocation: true
user-invocable: true
---

# Context Engineering

Use this workflow only for an explicit request to audit or repair agent
guidance, routing, task context, stale facts, or handoff continuity. Establish
whether the user authorized assessment or mutation and which durable surface
may change.

1. Use project instructions already supplied by the host; do not reread their
   source files solely to recover context. Read an additional task-scoped
   `AGENTS.md` only when it is not already in the active
   context or the file itself is in scope. Do not fabricate
   another host's file. Inspect only
   task-relevant code, tests, interfaces, configuration, stable documentation,
   and existing handoffs. Treat current repository evidence and approved rules
   as authoritative over generic defaults or stale notes.
2. Map the context layers separately: transient prompt/session context,
   durable repository guidance, host configuration, skills and plugins, live
   callable-tool data, and handoffs or task packets. Mark unobserved languages,
   commands, directories, policies, tools, and client features `unknown`;
   never invent them.
3. Identify duplicated, conflicting, stale, missing, overly broad, or
   misplaced guidance with repository-relative evidence. Load only the nearest
   material sources; do not preload all documentation, other skill bodies, or
   unrelated references.
4. Put durable repository rules in the narrowest applicable guidance, public
   behavior in stable documentation, workflow instructions in their owning
   skill, and temporary recovery state in its existing handoff. Change only the
   user-authorized surface. Host or global configuration needs separate
   explicit authority; project code remains unchanged unless expressly in
   scope.
5. Verify precedence, routing, context reduction, links, and consistency
   against current evidence. Report the context map, exact repairs, preserved
   surfaces, remaining unknowns, and the next agent's evidence-backed starting
   point. Keep output bounded and redact private paths, credentials, personal
   data, prompts, answers, and environment values.

Stop after the requested audit or repair. A recommendation for another
workflow is informational; never invoke or load it, install anything, or
publish.
