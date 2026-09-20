# Security Planning Artifacts

Read only when the confirmed manifest marks `security` active. Create only
manifest-listed files as repository-local planning artifacts.

Expose assets, actors, trust boundaries, least privilege, sensitive-data flows,
redaction, retention, failure behavior, and verification ownership. Map each
material safeguard to requirement IDs and a discriminating positive and
negative check. Create an ADR only for a consequential security choice with real
alternatives; never place secrets, live credentials, or sensitive diagnostics
in planning artifacts.

## Platform Applicability

Use agreed platform support to plan permission, isolation, and secret storage
checks where material. Trace positive and negative checks to the shared safeguards;
return unsupported security guarantees to specification.
