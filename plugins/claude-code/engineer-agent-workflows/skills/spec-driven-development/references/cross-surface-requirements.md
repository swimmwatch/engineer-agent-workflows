# Cross-Surface Requirements Profile

Read only when `manifest.yaml` marks `cross-surface` active. Specify behavior
that must remain coherent across independently owned user, service, event, or
data surfaces; use the other active profiles for their local detail.

- Trace each material UI action through its operation or event, domain state
  change, and resulting UI outcome.
- Define shared identifiers, correlation, ordering, compatibility, and error
  propagation across boundaries.
- Cover partial success, retries, duplicates, stale reads, offline or delayed
  completion, cancellation, recovery, and mixed-version behavior where material.
- Give every end-to-end criterion one observable result and excluded outcome at
  the owning boundaries.

Keep the behavioral trace in `spec.md`. Declare an architecture model, dynamic
scenario, or consequential ADR in the manifest only when planning needs a
deterministic cross-boundary source.

## Platform Applicability

Use agreed platform support to define material cross-platform end-to-end
scenarios between components. Retain each component's own support boundary and
name required combinations without assuming a full Cartesian product.
