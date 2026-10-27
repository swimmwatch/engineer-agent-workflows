# DeepSeek Harness Skill Export

Status: Approved

This additive specification implements the complete plan explicitly approved by
the user on 2026-10-25. It extends cross-client distribution with a filesystem
export; it does not authorize installation, configuration, commits or publication.
Depth: Standard. Active profiles: core and operations.

### DSH-001: Complete deterministic export

The existing generate, validate and generate:check commands shall generate and
verify all 17 catalog skills under exports/deepseek-harness/skills/<name>/ from
the authoritative templates. Include required resources and matching dependencies;
exclude other hosts' metadata and unresolved template variables. Preserve existing
Codex and Claude behavior. Every skill remains within 4096 UTF-8 bytes and its
description within 240 Unicode code points. Repeated generation is identical.

### DSH-002: Explicit invocation and native tool contracts

The catalog shall declare a distinct deepseek-harness invocation policy with
disableModelInvocation true and userInvocable true, retaining schemaVersion 1.
Exported frontmatter shall enforce both controls. Render DeepSeek Harness,
AGENTS.md, ask_user_question and the native delegation contract. Follow exposed
schemas; pending, missing or cancelled answers never establish consent. Resolve
logical MCP tool names against callable tools at runtime, including hashed aliases;
never construct their namespaces. Native delegation uses discovered authorized
provider/model routes, requesting deepseek-flash with supported low effort for
scouting. Missing required selection capability triggers bounded direct discovery,
without implicit model escalation. Other model recommendations are advisory only.

### DSH-003: Resource integrity and safe replacement

Render host-specific shared text before computing its host-specific digests.
Canonical markers continue to cover canonical bytes. Unknown targets, unknown or
malformed placeholders, resource tampering and unsafe paths shall fail closed.
Manage only exports/deepseek-harness, preserving sibling exports. Reject symlinks
in that target and its ancestors. Failed publication restores prior outputs.
Incomplete source may not retain generated DeepSeek artifacts. Check mode shall
not change files.

### DSH-004: Compatibility evidence and operating guidance

Document the filesystem provider entry point and separate global installation
authority. Verify discovery, explicit loading and model-invocation exclusion with
the actual filesystem provider from DeepSeek Harness 0.2.1-rc.3, upstream commit
22ddee3792402c3e70ec5f86a63c3e3e895a2f60, in temporary isolated state without
model calls. Record actual checks and limitations. Do not claim native UI or
end-to-end model behavior from structural tests. No native Harness plugin,
automatic installation, MCP registration or configuration mutation is included.

## Gap review

The user-approved plan establishes inventory, output format, host baseline,
runtime MCP name resolution, invocation boundaries and verification. No new
product decision is delegated to implementation. Core interfaces and operations
failure/recovery criteria are covered above. Approval authority is the explicit
user-supplied implementation plan; no independent model-review claim is made.
