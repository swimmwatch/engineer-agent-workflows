# Scenario-Specific Workflow MCP

Status: Approved

## Scope and authority

The user approved the scenario-specific tool proposal and sequential checkpoint
implementation with end-to-end verification after each checkpoint. This extends
the existing Standard-depth decision reader to four workflow YAML contracts.
Active profiles remain core, backend, data, operations, security and cross-surface;
UI is not active: design metadata is managed locally, not a user interface.

## Requirements

- MCP-001: Publish the local artifact as `engineer-agent-workflow-mcp`; preserve
  bounded protocol-1 decision reads for compatibility. No global configuration,
  installation, commit, publication, or live Penpot mutation is authorized.
- MCP-002: Provide scenario-specific specification discovery, scope proposals and
  confirmation. A proposal is not a confirmed manifest. Bind confirmation to the
  exact saved proposal and actual recorded answer; silence is never approval.
- MCP-003: Prepare questions, capture answers and non-answers, record facts and
  reversible assumptions, link requirements and query decisions without loading
  full journals into model context. Append revisions; preserve history.
- MCP-004: Manage the shared design catalog through concrete component, variant,
  override, token and export operations. Require declared design scope.
- MCP-005: Manage screens, states, transitions, component instances, responsive
  and content rules through concrete tools. Use real supplied Penpot identities;
  no placeholder components or states. Local metadata never edits remote Penpot.
- MCP-006: Validate actual YAML, the four authoritative schemas and semantic
  references. Reject unsafe paths, unsupported YAML, unknown fields, duplicates,
  broken references and removal of referenced entities. Evidence that cannot be
  independently checked remains unverified; hashes do not prove visual quality.
- MCP-007: Bounded readbacks, version-bound write tokens, idempotent retries,
  comment-preserving single-file writes and explicit stale-state failures protect
  user edits. No arbitrary YAML, field-path patch or generic operation dispatcher
  is exposed. Multi-file operations do not claim cross-file atomicity.
- MCP-008: Integrate only relevant scenario tools into the matching skill
  references and generate isolated Codex/Claude bundles. Keep profile loading,
  native question tools, explicit skill invocation and authorization boundaries.

## Acceptance

Each checkpoint must have a discriminating RED before implementation, passing
behavior tests and actual stdio MCP client/server E2E tests afterward. Exercise
multiple projects/specifications, restart recovery, duplicate retries, user edits,
missing answers, malformed sources, unsafe paths and dependent removals. Finish
with package packing, lint, complete npm tests, foundation, generation and diff
checks. Native model and live Penpot trials remain outside this execution.
