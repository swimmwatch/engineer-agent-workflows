# Operations Planning Artifacts

Read only when the confirmed manifest marks `operations` active. Create only
manifest-listed files as repository-local planning artifacts.

Use `quality/scenarios.yaml` for measurable runtime scenarios. Map each SLI and
SLO to requirement IDs, workload, environment, observation, threshold, and
planned check. Plan bounded and redacted telemetry, failure detection, rollout,
mixed-version operation, rollback triggers, startup and shutdown, backup,
restore, and operator recovery. Add a deployment view only when topology or
ownership materially affects verification.

## Platform Applicability

Use agreed platform support to plan build, deployment, and runtime coverage
separately where material. Identify available execution environments, rollout
and recovery checks, and gaps against the shared requirement IDs.
