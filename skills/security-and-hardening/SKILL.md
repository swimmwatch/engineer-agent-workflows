---
name: security-and-hardening
description: "Audit or harden a concrete trust boundary when the user explicitly requests security work or identifies a defect. Cover inputs, privileges, secrets, dependencies, filesystem/process boundaries, failure behavior, and verification."
disable-model-invocation: true
user-invocable: true
---

# Security And Hardening

Audit model suggestion: {{HOST_REVIEW_MODEL}}. Never switch or gate on model.

Use this workflow only for an explicit audit or hardening request concerning a
concrete trust boundary. Determine whether the user authorized read-only
assessment or a bounded mutation; do not widen that authority or run harmful
proof-of-concept actions.

1. Use project instructions already supplied by the host; do not reread their
   source files solely to recover context. Read an additional task-scoped
   `{{HOST_PROJECT_INSTRUCTIONS}}` only when it is not already in the active
   context or the file itself is in scope. Inspect
   only task-scoped code, tests, interfaces, configuration, dependencies,
   workflows, and stable documentation. Treat repository evidence and approved
   security requirements as authoritative; do not invent tools or commands.
2. Name the protected assets, trust boundary, actors and capabilities, input
   and output paths, privileges, security properties, abuse cases, and expected
   impact. Mark evidence as `verified`, `inferred`, or `unknown`.
3. Trace validation, authorization, state changes, error handling, cleanup,
   filesystem and process boundaries, environment exposure, logging, secrets,
   dependencies, and supply-chain controls where relevant. Check allowlists,
   containment, least privilege, minimization, redaction, provenance, and
   fail-closed behavior.
4. For an audit, report evidence, impact, smallest effective mitigation,
   verification, positive controls, and residual risk without editing. For
   authorized hardening, preserve public contracts unless change is explicit,
   add the narrowest mitigation, and verify normal behavior plus safe abuse
   cases. Never make a failing control pass by weakening or bypassing it.
5. Keep findings and diagnostics bounded. Never expose secrets, credentials,
   private paths, personal data, exploit payloads, or unrelated source content.
   Stop after the requested artifact and checks without committing, publishing,
   or invoking another workflow unless separately authorized.
