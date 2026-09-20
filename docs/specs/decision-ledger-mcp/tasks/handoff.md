# Decision Reader Integration Handoff

## Current Runtime And Scope

Original reader packets 01/02 retain their historical evidence. The subsequent
six-checkpoint [scenario-tool workstream](../../workflow-mcp-scenario-tools/tasks/handoff.md)
renamed and extended the runtime to `engineer-agent-workflow-mcp`: 46 scenario
tools plus four compatible legacy reader tools. The current package is
`packages/engineer-agent-workflow-mcp/`; the original read-only scope is not the
current runtime contract. No global client migration happened automatically.

Scenario tools own reads, authoring and checks for manifest, decisions, catalog
and experience YAML. The caller opens its absolute project path and specification
and passes returned contexts/references. No maintained allowlist, client-roots
dependency, generic YAML editor, local query CLI or direct-file fallback exists.

## Implemented And Verified

- Code, schemas, packaging and both generated skill integrations are complete
  in scenario-tool checkpoints 01–06. Recorded regression: 227/227 tests,
  including 39 MCP tests and actual stdio/packed-artifact E2E; lint, foundation,
  generation, size, four Codex validators and diff checks passed.
- Earlier reader coverage retains parsing, bounded queries, version/cursor
  recovery, 30,000-line synthetic journals and bounded protocol errors.
- New real-MCP smoke evidence preserves a complete multiline Unicode answer
  across read-back/retry/restart, keeps dismissed scope pending, and isolates
  separate specifications. This proves server behavior with synthetic customer
  data, not native-agent behavior or authenticated user consent.

## Open Native Qualification

Packet 03 remains unchecked until fresh Sol/Terra qualification establishes
MCP-only access, complete answer capture, current-runtime execution and recovery.
The previous Lite direct-read and Deep answer-normalization failures are targets
for new trials, not evidence of the current candidate's outcome. Old Sol
large-journal and changed-source recovery successes are historical observations.

The user resumed Codex qualification and authorized temporary local Docker
Penpot/MCP checks. Native Claude remains deferred. Parent Packet 14 remains
0/2 stable complete passes; actual browser 200% zoom and full UI/API acceptance
are not implied by setup or local checks. Clean external installation and global
client registration remain outside this qualification scope.

Follow [current qualification](../../../evidence/workflow-qualification.md).
New durable run: `2026-09-05-qualification.TmJBAg`; previous evidence remains
under `2026-09-05-codex-finish-NH8Bt4` and
[the budget checkpoint](../../../evidence/codex-budget-checkpoint.md).
No commits, publication or Packet 10 work are implied.
