# Core Requirements Profile

Read only when `manifest.yaml` marks `core` active. Core covers a reusable
library, CLI commands, configuration, build or developer tooling, and internal
automation. It may stand alone or combine with UI and backend profiles.

## Boundary Coverage

- Identify consumers, invocation paths, trust boundaries, and ownership.
- Specify each public interface through observable inputs, outputs, validation,
  defaults, errors, side effects, and invariants without choosing internal units.
- For CLI behavior, cover commands, options, stdin, stdout, stderr, exit status,
  interactivity, cancellation, and script-safe behavior.
- For configuration, cover schema, precedence, defaults, invalid or unknown
  values, reload behavior, redaction, and migration.
- Define deterministic ordering, serialization, generated output, and repeat-run
  behavior where consumers or tests depend on them.
- Define compatibility, versioning, deprecation, mixed-version use, and rollback
  for existing consumers.

Lite covers a bounded change to an established contract. Standard resolves a
material consumer-facing interface and failure behavior. Deep covers ecosystems,
plugins, migrations, security-sensitive tooling, or several independently
versioned consumers. Keep security, privacy, portability, accessibility of
interactive CLI flows, and required quality behavior correct at every depth.

## Planning Handoff

Keep normative behavior and acceptance in `spec.md`. A Lite change to an existing
interface normally needs no separate artifact. When machine validation or
multiple consumers need a deterministic source, declare `core/contracts.yaml`
or an existing repository-native schema in `planning_artifacts`; planning creates
it. An explicit user requirement can also warrant that source. Acceptance
must distinguish valid, invalid, repeated, interrupted, incompatible, and recovery
paths where applicable.

## Platform Applicability

Apply agreed platform support to OS/runtime boundaries and material differences
in paths, permissions, shell behavior, signals, and encodings. Specify observable
outcomes for repeated or interrupted use on supported targets.
