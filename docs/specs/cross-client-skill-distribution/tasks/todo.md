# Cross-Client Skill Distribution Checklist

Specification: [../spec.md](../spec.md)

Confirmed scope: [../manifest.yaml](../manifest.yaml)

- [x] Specification is `Status: Approved`; adaptive scope is confirmed in
  `manifest.yaml` and decision history is retained in `decisions.yaml`.
- [x] Independently verifiable task packets created; separate review is optional.
- [x] Local Git repository initialized on `main` with the intended HTTPS
      `origin`.
- [x] Public GitHub repository `swimmwatch/engineer-agent-workflows` created.
- [x] [Packet 01 — Repository foundation](01_repository_foundation.md)
- [x] [Packet 02 — Engineering manual and planning](02_engineering_manual_and_planning.md)
- [x] [Packet 03 — Specification and incremental workflows](03_specification_and_incremental.md)
- [x] [Packet 04 — Code-quality workflows](04_code_quality_workflows.md)
- [x] [Packet 05 — Context and discovery workflows](05_context_and_discovery_workflows.md)
- [x] [Packet 06 — Documentation workflows](06_documentation_workflows.md)
- [x] [Packet 07 — Delivery workflows](07_delivery_workflows.md)
- [x] [Packet 08 — Native plugin packaging](08_native_plugin_packaging.md)
- [ ] [Packet 09 — Global lifecycle isolation](09_global_lifecycle_isolation.md)
- [x] [Packet 13 — Adaptive specification and planning correction](13_adaptive_specification_and_planning.md)
- [ ] [Packet 14 — Workflow forward testing and bounded execution](14_workflow_forward_testing.md)
- [ ] [Packet 10 — Host and context acceptance](10_host_context_acceptance.md)
- [ ] [Packet 11 — Documentation and operations](11_documentation_and_operations.md)
- [ ] [Packet 12 — CI and release readiness](12_ci_release_readiness.md)
- [ ] **MANUAL GATE:** exact stable SemVer confirmed before release validation.
- [ ] **MANUAL GATE:** local, hosted/account, and organization-managed host
      acceptance authorized and completed.
- [ ] **MANUAL GATE:** human signed tag and GitHub Release publication
      separately authorized.

Only the packet being implemented may be checked during an implementation
turn. Complete its verification and update `handoff.md`, then stop.

Current qualification is tracked in [workflow qualification](../../../evidence/workflow-qualification.md).
The separate six-checkpoint scenario-MCP implementation is complete; it does not
close Packet 14 or the platform, client-acceptance, documentation and release
packets above. The user resumed Codex qualification and authorized an isolated
local Docker Penpot/MCP trial; native Claude remains deferred. No global client
configuration or release action is implied.
