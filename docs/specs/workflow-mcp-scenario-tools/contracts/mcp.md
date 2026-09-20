# Scenario MCP Contract

Artifact: `@engineer-agent-workflows/engineer-agent-workflow-mcp`.
Executable/server: `engineer-agent-workflow-mcp`. Transport: stdio only.

The exact 56 scenario tool input schemas are generated during build into
`packages/engineer-agent-workflow-mcp/dist/tool-contracts.json` from the executable
definitions. MCP `tools/list` exposes the same schemas. See the package README
for connection, scenario sequences, limits, explicit failure semantics and
read-only protocol-1 compatibility. Four legacy decision query tools remain.

## Common envelope and ownership

New tools return `protocol_version: 2`, a scenario-specific `result`, and an
updated opaque `context` when operating on a specification. Mutation readbacks
also report `replayed`. Discovery uses the explicit project path; opening binds
project/specification identity and observed versions. Inputs never accept YAML,
JSON Patch, arbitrary field paths or generic operation arrays.

Successful context-bearing calls supply the context for the next sequential
write. Read-only observation may run independently. Requirement linking is
strictly additive: the single-decision tool is a no-op when all links exist, and
the batch tool validates all current decision references and requirement IDs
before one journal update. Existing links keep their order; new links are
appended. Neither tool removes links.

Question references identify exact saved revisions. A non-answer never creates
an answer; confirmation requires the exact proposal's confirmation selection.
MCP records answer provenance without authenticating the human interaction.

Writes validate schema, semantic links, version prerequisites and result budgets
before installing bytes. Supported declarative project Prettier settings are
applied with pinned Prettier `3.9.6`; invalid settings fail before installation,
while executable configuration and plugins are not loaded. Existing node/comment
ownership is preserved. Decision updates append revisions. Retry receipts survive
server restarts; stale inputs fail instead of overwriting newer work. A conflict
reports `operation_applied: false`, refreshed context and resolvable current
decision references so the caller can reopen and reconcile rather than retrying
blindly. Design writes share a cooperative lock;
dependent screen contracts are inspected sequentially, not loaded as one large
project-wide object graph. Noncooperating filesystem races remain outside the
transaction boundary and require OS isolation or serialized external editing.

`manifest.yaml` is the current confirmed scope. The `scope.manifest` decision is
the immutable pre-confirmation proposal/answer snapshot and may therefore contain
`scope.confirmed: false`. It is not linked through generic decision traceability;
the completeness inventory reviews the scope source and active profiles directly.

## Results and failures

Tool failures have `isError: true` and a bounded structured `error` with code,
actionable message and bounded entity references. They never echo source text,
credentials or native filesystem exceptions. Missing evidence is not success.
Stage checks return their actual status and issues. Local design passes report
external inspection as `not_reproduced`; they do not complete live design QA.

The MCP does not write behavior specifications, execute implementation packets,
invoke skills, change Penpot, configure clients, install globally, commit or
publish. Its deterministic source of truth consists of the four workflow YAML
contracts; profile API/event/data sources retain their own owners and formats.
