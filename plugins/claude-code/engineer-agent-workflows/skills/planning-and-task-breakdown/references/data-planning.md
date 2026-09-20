# Data Planning Artifacts

Read only when the confirmed manifest marks `data` active. Create only
manifest-listed files as repository-local planning artifacts.

Use the repository's native schema or JSON Schema for independently validated
data. Map fields, invariants, ownership, transitions, compatibility, retention,
and deletion to requirement IDs. Plan migration, mixed-version operation,
backfill, validation, cutover, rollback, recovery, and cleanup as separate
reviewable stages when risk warrants them. Reference schemas from plans and
tests instead of copying definitions.

## Platform Applicability

Use agreed platform support to plan checks for material encoding, locale,
file-system, and data-representation differences in migration, import/export, and
recovery. Map coverage to the shared invariants and requirement IDs.
