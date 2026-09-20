# Backend Planning Artifacts

Read only when the confirmed manifest marks `backend` active. Create only
manifest-listed files under the specification bundle as repository-local
planning artifacts before production implementation.

- Use OpenAPI for an HTTP contract or the repository's protocol IDL when that
  format already owns the boundary.
- Map operations to requirement IDs, authentication and authorization, inputs,
  outputs, validation, state effects, compatibility, and observability.
- Use a stable problem type registry for machine-readable failures, including
  retry disclosure and safe diagnostics.
- Name the provider and consumer contract test boundaries when independently
  deployed parties make them useful.

Keep implementation-local symbols and module boundaries in `plan.md`. Reference
schemas rather than copying them, and create only the artifacts listed in the
confirmed manifest.

## Platform Applicability

Use agreed platform support to plan server OS/runtime checks and material
system-capability differences. Keep client and server coverage separate and
trace supported targets to service requirement IDs.
