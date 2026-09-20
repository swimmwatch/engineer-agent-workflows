# Core Planning Artifacts

Read only when a confirmed manifest marks `core` active.
Create only listed files under the specification bundle as repository-local
planning artifacts, not production artifacts.

Use `core/contracts.yaml` when machine validation or multiple consumers need a
deterministic source for a
library, CLI, configuration, build tool, or internal automation boundary. Use a
repository-native IDL or schema instead when it already owns the contract.

A Lite change normally keeps its existing contract inline in `spec.md` and the
packet. Do not create a file absent from the confirmed manifest or treat an
active core profile as permission for an additional contract artifact.

Describe, as applicable:

- public interface names, types, inputs, outputs, errors, side effects, and
  compatibility guarantees;
- CLI commands, options, streams, exit statuses, cancellation, and non-interactive
  behavior;
- configuration keys, types, defaults, precedence, validation, reload, redaction,
  migration, and unknown-key policy;
- deterministic ordering, serialization, generated files, and repeat-run rules;
- consumers, dependency direction, lifecycle ownership, versioning, deprecation,
  rollback, and planned discriminating checks.

Map every entry to requirement IDs. Keep implementation-local modules and symbols
in `plan.md`, not the portable contract. If separate schemas are warranted,
reference them from `core/contracts.yaml` instead of duplicating definitions.

## Platform Applicability

Use agreed platform support to plan checks for material differences in paths,
permissions, shell behavior, signals, and encodings on the supported OS/runtime
targets. Link coverage to the shared requirement IDs.
