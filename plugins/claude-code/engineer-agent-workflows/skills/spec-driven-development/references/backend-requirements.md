# Backend Requirements Profile

Read only when `manifest.yaml` marks `backend` active. Specify observable
service behavior; leave internal modules and technology choices to planning.

## Service Boundary

- Define each HTTP, RPC, or external service operation through actors, inputs,
  validation, outputs, state effects, and side effects.
- State authentication and authorization behavior at protected boundaries.
- Define stable success and error contracts, including retry disclosure,
  idempotency and retry behavior, timeouts, rate limits, pagination, ordering,
  cancellation, and concurrency where applicable.
- State compatibility, versioning, deprecation, and mixed-version behavior for
  independently deployed consumers and providers.

Lite covers a bounded change to an established service. Standard resolves a
material operation contract and its failures. Deep covers public evolution,
multiple deployables, external parties, or difficult compatibility. Depth never
permits omission of correctness or mandatory safety behavior.

## Planning Handoff

Keep normative rules and acceptance in `spec.md`. Declare OpenAPI, the
repository's protocol IDL, problem types, or contract scenarios in the manifest
only when they improve deterministic review. Planning creates those artifacts.
Every operation needs observable success, invalid-input, repeated-call,
partial-failure, timeout, and recovery acceptance when those paths are material.

## Platform Applicability

Apply agreed platform support to server OS/runtime boundaries and material
system-capability differences. Keep client and server support separate; state
observable service behavior without selecting new implementation technology.
