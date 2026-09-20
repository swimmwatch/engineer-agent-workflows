# Packet 03: Mandatory Bounded Journal Access

Requirements: FLOW-001, COMPAT-001. Depends on verified packets 01 and 02 and
../contracts/mcp.md. Update one shared authoritative dependency reference and the
three callers; generate both hosts rather than editing their copies.

Before source changes, add a reproducible model scenario for unavailable MCP and
large-journal recovery. Match callable tools by exposed schema/capabilities, not
fixed host namespaces. Get the absolute project path from task context. Never
replace journal queries with shell/full-file reads when the MCP is unavailable.
The scenario-tool workstream supersedes the original reader-only authoring
contract. Use `engineer-agent-workflow-mcp` for reads, creation, updates and
validation of manifest, decisions, catalog and experience YAML. Agents pass
scenario parameters, not YAML or generic patches. A missing new journal is
distinct from an unavailable MCP. Markdown requirements retain their own scope
rules. See the current [runtime contract](../../workflow-mcp-scenario-tools/contracts/mcp.md).

Update dependency documentation, root specification cross-reference and generated
outputs. Preserve standalone-versus-sibling classification while stating the
external tool prerequisite explicitly. Check runtime/package compatibility and
bounded batched coverage; do not infer approval from syntax or a preview.

Commands: npm run generate; npm test; npm run lint; npm run
validate:foundation; npm run generate:check -- --allow-incomplete; generated Codex
skill quick validation; git diff --check. Fresh native Sol/Terra scenarios are
separate opt-in evidence, not part of npm test or CI. Stop with evidence; older
V7 results and unfinished Packet 14 matrix do not acquire new-version credit.

## Current Implementation And Qualification

Scenario-tool checkpoints 01–06 completed the code, schema, packaging and
generated-skill integration. The package exposes 46 scenario tools plus four
compatible reader tools; the old package path is no longer the runtime target.
This packet stays open for fresh native Sol/Terra behavioral qualification,
including MCP-only access and complete answer capture. Automated transport
checks alone do not establish those agent behaviors. Follow the current
[qualification evidence](../../../evidence/workflow-qualification.md).
