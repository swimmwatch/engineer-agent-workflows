# Workflow YAML Contracts

Use the callable scenario tools of `engineer-agent-workflow-mcp` for all reads,
creation, updates and validation of these four workflow documents. Do not hand-edit
them, generate YAML payloads, reconstruct entire documents, or use a local reader
or parser as a fallback. Missing required MCP capability blocks affected work;
report it without installing or configuring a server automatically.

Exclude these four documents from shell content searches and Git diffs, including
while locating workflow state. Filename-only discovery is allowed; query their
contents and revisions through scenario tools.

| File | Authoritative JSON Schema Draft 7 | Content owner |
| --- | --- | --- |
| `docs/specs/<slug>/manifest.yaml` | `manifest.schema.json` | Specification |
| `docs/specs/<slug>/decisions.yaml` | `decisions.schema.json` | Specification decisions |
| `design/system/catalog.yaml` | `catalog.schema.json` | Explicit design planning |
| `design/specs/<slug>/experience.yaml` | `experience.schema.json` | Explicit design planning |

Schemas remain under the matching bundle's `shared/schemas/` and are packaged in
the MCP artifact. They are local contract identifiers, not network fetch targets.
Agents need not load their contents for ordinary scenario calls. Read a schema
only when explicitly investigating a contract/version conflict. Product API,
event and data contracts retain their own profile formats and authoring process;
they are not arbitrary YAML-editing targets for this MCP.

## Context And Changes

1. Use `specification_list` when the specification is unknown, then
   `specification_open` with the absolute project path from current task context
   and its exact slug. Pass the returned opaque `context` to subsequent calls.
   Multiple projects/specifications remain separate; no directory allowlist or
   implicit global current project is required.
2. Use the tool appropriate to the owning workflow. Specification routes scope
   and interviewing; design planning routes catalog/screens only after manifest
   eligibility. Planning and implementation query existing state and do not
   acquire authority to revise scope or design merely by accessing these tools.
3. Use returned IDs/references with the latest returned context. Every successful
   context-bearing call supplies the context for the next sequential write.
   Independent read-only calls may run in parallel. Use
   `decision_link_requirements_batch` when adding links to multiple decisions;
   the single and batch tools are additive and never remove existing links. Do
   not construct paths, revisions, digests, confirmation flags or field-level
   patches. After a lost reply, repeat the exact call; do not invent a second
   question or entity. On `CONFLICT`, stop writes, reopen, compare the returned
   current decision references with the intended addition, and retry only after
   confirming `operation_applied: false`; never repeat a write blindly.
4. MCP preserves existing comments and extension metadata, appends decision
   revisions, validates a single UTF-8 YAML mapping, and rejects duplicate keys,
   aliases, merge keys, custom tags, unknown contract fields and unsafe paths.
   Its reserved retry receipts use `extensions.workflow_mcp_receipts`. Before
   install, it applies pinned Prettier `3.9.6` only for a supported declarative
   project configuration or declared Prettier dependency. Invalid declarative
   configuration fails without a write; executable configuration and plugins are
   not loaded. Do not manually format MCP-owned workflow YAML.
5. A single-file write is atomic for cooperating MCP writers. Related-file
   changes are not one transaction. The MCP rechecks dependencies before saving;
   do not concurrently edit the same files outside MCP during a write.
   A crash lock remains a blocker for explicit recovery, not automatic deletion.

`manifest.yaml` is the current confirmed scope. The `scope.manifest` decision
preserves the immutable proposal shown before confirmation, so its nested
`scope.confirmed: false` is not a competing current-state flag. Do not pass this
service record to generic decision-link tools. Completeness review checks the
scope source and each active profile as dedicated inventory items.

## Specification Completeness Versions

Planning and incremental call `specification_check_state` before consuming the
specification. It also checkpoints an observed author-made Draft-to-Approved
transition; it never assigns approval. New-review consumers require `status:
pass`, `coverage_status: reviewed`, and Approved Markdown. Save the returned
`source_version`, `specification_version` and `review_ref` in plan/packet inputs.
These are references, not a second source/requirement map or an execution ledger.

Read linked exact definitions with `requirement_get` and its
`specification_version` as the tool's `source_version`; follow continuations for
both text and decision refs. Planning uses `requirement_list` to cover the full
approved scope, without rereading a large journal. Incremental uses only its
packet's linked requirements and contracts, then calls `specification_check_state`
with the pinned aggregate `expected_source_version` before work and completion.
Pending, gaps, stale or a mismatched version blocks affected work: return it to
the separately invoked specification/planning owner, never edit its product
contract from implementation. MCP registration is not semantic proof.

For `legacy_unverified`, retain previous scope/link/approval checks, use exact
Markdown sections when structured definitions are absent, and explicitly record
that new completeness assurance is absent. Do not auto-migrate or block solely
for this label. Creation or modification by specification enrolls the new cycle.

## Evidence And Ownership

- A recorded answer is not independently authenticated user consent. Preserve
  the actual host-question outcome and source; silence, errors and default
  options never become answers. `scope_confirm` requires explicit confirmation
  of the exact saved proposal, not an agent-supplied `confirmed: true`.
- Direct user edits remain authoritative. Reconcile them through the owning
  workflow and new decision revisions. Unsupported legacy shapes require agreed
  migration; never silently rewrite them to fit a template.
- An active UI profile alone does not authorize design writes. The confirmed
  manifest must declare the exact corresponding project artifact. Read-only
  shared inputs do not authorize library changes or remote Penpot operations.
- Before stage completion, use its scenario-specific state/design check. Record
  the actual result and unresolved evidence. Native exports are checked against
  real saved bytes, identities and shared-library links; a hash or valid schema
  is not proof of visual quality, restoration or accessibility.
- Design checks distinguish `local_status` from `external_status`. A local pass
  with external checks not reproduced is not complete design evidence. Combine
  it with actual separately obtained Penpot inspection/restoration results.
- No MCP tool assigns specification approval, authorizes planning/implementation,
  launches a skill, performs a review, commits, installs or publishes anything.

## Review input archives

New completeness reviews may reference MCP-owned immutable historical inputs at
`docs/specs/<slug>/.workflow/review-inputs/<sha256>.json`. They are not another
editable specification or an agent-authored YAML document. Use review scenario
tools for bounded comparisons and source reads; do not inspect or modify archive
JSON as a workflow fallback. Keep referenced snapshots with the specification;
missing/corrupt inputs block result inheritance, not a new full review of intact
current sources. Followups retain attributed prior results and require a fresh
whole-specification consistency assessment before completion.
