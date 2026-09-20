# Events Requirements Profile

Read only when `manifest.yaml` marks `events` active. Specify observable event
obligations without choosing brokers, libraries, or internal consumers.

- Identify producers, consumers, message purpose, identity, correlation, and
  externally meaningful payload rules.
- Define delivery expectation, ordering, deduplication, replay, retry,
  dead-letter handling, poison-message behavior, and backpressure when material.
- State schema evolution, compatibility, version coexistence, and retirement.
- Define observable publication, consumption, failure, recovery, and audit
  outcomes, including what must not happen after duplicates or replays.

Keep rules and acceptance in `spec.md`. Declare AsyncAPI or the repository's
native event schema in the manifest only when a separate deterministic contract
is warranted; planning creates it and maps future provider/consumer checks.

## Platform Applicability

Apply agreed platform support to material producer/consumer interoperability
across environments and protocol versions, including existing broker constraints.
Do not select a new broker or require every version combination during specification.
