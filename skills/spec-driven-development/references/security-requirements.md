# Security Requirements Profile

Read only when `manifest.yaml` marks `security` active. Specify security and
privacy outcomes without selecting implementation controls prematurely.

- Identify protected assets, actors, trust boundaries, permissions, and least
  privilege expectations.
- Define authentication, authorization, validation, secret and sensitive-data
  handling, redaction, retention, deletion, and audit behavior.
- Cover abuse cases, privilege changes, replay, enumeration, unsafe defaults,
  partial failure, and fail-closed behavior where applicable.
- Give every material control an observable success, denial, logging, and
  recovery outcome without exposing secrets in evidence.

Keep normative safeguards and acceptance in `spec.md`. Declare measurable
security scenarios or an ADR in the manifest only when planning needs a
separately reviewable contract or consequential design decision.

## Platform Applicability

Apply agreed platform support to material permission, isolation, and secret
storage differences. Preserve required security outcomes on each supported target;
missing platform capabilities require a decision rather than weaker guarantees.
