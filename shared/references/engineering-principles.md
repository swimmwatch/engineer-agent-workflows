# Engineering Principles

This manual defines a context-sensitive quality bar for specifications, plans,
and implementation. Approved product requirements and applicable repository
instructions outrank this guidance. Apply a principle only when it materially
improves the work; record meaningful deviations and trade-offs instead of
adding ceremonial patterns.

## Correctness And Boundaries

- Define observable contracts, invariants, valid states, limits, and failure
  behavior. Validate data at trust boundaries and keep invalid state
  unrepresentable where practical.
- Prefer the simplest design that satisfies the approved contract (KISS).
  Avoid speculative generalization and features without an established need
  (YAGNI).
- Remove duplicated knowledge, not merely similar syntax. Use DRY when one
  fact would otherwise require coordinated edits; do not introduce an
  abstraction before its stable responsibility is understood.
- Separate concerns, use information hiding, and encapsulate state behind
  cohesive boundaries. Favor low coupling, high cohesion, and low cognitive
  complexity.
- Use meaningful names, small cohesive units, and bounded control flow. Choose
  composition over inheritance when it makes ownership and behavior clearer.
- Apply SOLID only when object-oriented responsibilities or dependency
  boundaries make it useful. Do not force classes or interfaces onto
  functional, procedural, declarative, documentation, or configuration work.
- Keep dependencies directed toward stable policy. Invert a dependency at a
  real external or volatile boundary when doing so improves testing,
  substitution, or ownership; avoid speculative interfaces.

## Ownership And Operation

- Make ownership, lifecycle, initialization, cancellation, concurrency, and
  cleanup explicit. Release resources on every terminal path and define who
  may mutate shared state.
- Fail safely and, at security boundaries, fail closed. Use least privilege,
  protect privacy, minimize sensitive-data exposure, and keep diagnostics
  bounded and redacted.
- Preserve externally observable compatibility. Define idempotency, retries,
  partial failure, recovery, and migration safety when callers can observe
  them.
- Design for testability. Prefer deterministic, behavior-focused tests at
  changed boundaries, including invalid inputs, failures, recovery, and
  concurrency where material.
- Add observability only for actionable signals. Bound its cost and output,
  redact secrets and personal data, and never make logs part of correctness.
- Optimize from measurements and a stated performance target, not intuition.
  Preserve correctness while evaluating latency, throughput, memory, size, or
  cost.
- For user-facing interfaces, follow platform conventions and make
  accessibility part of the contract: semantics, focus, labels, input
  alternatives, and clear failure feedback.
- Keep changes scoped, preserve unrelated work, review the final diff, and
  report exact verification evidence and limitations.

## Artifact Contracts

### Specification

A specification defines observable outcomes, interfaces, data and state
contracts, limits, failure and recovery behavior, security and privacy
boundaries, compatibility, non-goals, and objective acceptance criteria. It
does not invent implementation structure without evidence or implementation
authorization.

### Plan

A plan maps an approved task to repository evidence and
language-appropriate architectural units. It identifies ownership, symbols,
inputs and outputs, state and lifecycle, errors and invariants, dependency
direction, requirement coverage, verification, migration, rollout, rollback,
and manual gates where relevant. It distinguishes facts from uncertainty and
is revised when evidence disproves a proposed boundary.

### Implementation

An implementation preserves the approved contract and chooses the simplest
adequate scoped design. It makes ownership and error behavior explicit, tests
the changed boundaries, handles cleanup and recovery, maintains compatibility,
and avoids unrelated changes. Completion requires review of the final diff and
honest reporting of every executed or unavailable check.
