---
name: code-review-and-quality
description: "Review a proposed or completed change when the user explicitly requests code review. Evaluate correctness, maintainability, tests, security, compatibility, and evidence; do not edit unless fixes are separately requested."
disable-model-invocation: true
user-invocable: true
---

# Code Review And Quality

Model suggestion: the current session model. Never switch or gate on model.

Use this workflow only for an explicit request to review an identified change,
diff, branch, or completed implementation. Review is read-only: do not edit,
commit, publish, or turn findings into fixes without a separate request.

1. Use project instructions already supplied by the host; do not reread their
   source files solely to recover context. Read an additional task-scoped
   `AGENTS.md` only when it is not already in the active
   context or the file itself is in scope. Establish
   the requested comparison range and inspect only its diff, affected
   interfaces, tests, configuration, stable documentation, and one relevant
   repository precedent. Treat repository evidence and approved requirements as
   authoritative; do not invent tools or commands.
2. Trace changed inputs, state, outputs, errors, side effects, lifecycle, and
   dependency direction. Check correctness, regressions, security,
   compatibility, maintainability, tests, and operational behavior where the
   change makes them material. Distinguish defects introduced by the change
   from unrelated observations.
3. Require concrete evidence for every finding. Mark claims as `verified`,
   `inferred`, or `unknown`; report checks as run, failed, unavailable, or not
   run. Never present missing evidence as success.
4. Rank actionable findings by severity. For each, give a repository-relative
   location, impact, evidence or reproducible condition, and the smallest
   correction. Do not expose secrets, credentials, private paths, personal
   data, or unrelated source content.
5. Lead with blocking and important findings, then optional suggestions and
   verification gaps. If there are no findings, say so and state residual risks
   and checks run. Keep the report bounded and stop without invoking another
   workflow or publishing.
