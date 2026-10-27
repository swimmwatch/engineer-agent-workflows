# Operations Requirements Profile

Read only when `manifest.yaml` marks `operations` active. Specify measurable
runtime and operator-visible behavior rather than deployment implementation.

- Define availability, latency, throughput, capacity, and degradation scenarios
  only where they affect acceptance; use an SLI and SLO when warranted.
- State observability signals, failure detection, bounded and redacted
  diagnostics, alert meaning, and evidence needed to distinguish outcomes.
- Cover rollout constraints, mixed-version operation, rollback triggers,
  dependency failure, startup and shutdown, backup, restore, and operator
  recovery.
- Identify irreversible actions and required safeguards or manual gates.

Keep measurable behavior in `spec.md`. Declare `quality/scenarios.yaml` or an
operational architecture view in the manifest only when planning needs a stable
contract for tests, rollout, or recovery.

## Platform Applicability

Apply agreed platform support to material build, deployment, and runtime
environments separately, including startup/shutdown, rollout, and recovery
constraints. Define outcomes without choosing deployment tooling prematurely.
