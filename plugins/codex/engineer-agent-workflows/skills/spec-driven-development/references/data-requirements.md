# Data Requirements Profile

Read only when `manifest.yaml` marks `data` active. Specify durable state and
data behavior independently of storage engine or implementation structure.

- Define ownership, identity, invariants, valid transitions, consistency, and
  conflict behavior.
- Cover schema compatibility, migration and rollback, mixed-version operation,
  backfill, validation, failure recovery, and cleanup when state changes.
- State retention and deletion, privacy classification, audit needs, export,
  restore, and irreversible effects where applicable.
- Make normal, invalid, duplicate, concurrent, partially migrated, and recovery
  outcomes objectively observable.

Keep normative rules in `spec.md`. Declare repository-native schemas, JSON
Schema, state models, or migration scenarios in the manifest only when planning
needs a separately reviewable deterministic contract.

## Platform Applicability

Apply agreed platform support to material encoding, locale, file-system, and
data-representation differences that affect invariants, import/export, migration,
or recovery. Specify observable preservation and rejection behavior.
