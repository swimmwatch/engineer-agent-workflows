# DeepSeek Harness Export Plan

Authority: explicit user instruction to implement the supplied complete plan.
Requirements: DSH-001 through DSH-004. Existing distribution remains authoritative;
the new host is a filesystem target rather than a native plugin.

1. Record scope through workflow MCP and introduce discriminating export tests.
2. Extend the closed host policy and template values. Reuse the distribution
   builder for canonical, Codex, Claude and Harness resources; compute markers
   from the corresponding canonical or rendered bytes.
3. Add the exact managed export root to inventory, checks, safe publication and
   rollback. Preserve sibling exports and existing host-specific packaging.
4. Generate and validate all outputs. Verify real pinned Harness provider
   discovery/loading in temporary state, and run repository checks.

Ownership and dependency direction: catalog owns inventory and invocation policy;
canonical skills and root shared resources own instructions; distribution renders
and packages those inputs; validators verify outputs; Harness consumes filesystem
bundles. The MCP runtime's public tool schemas and transport are unchanged.

Verification is test-first, including negative host/placeholder/policy/path cases,
resource integrity, deterministic regeneration and replacement recovery. Native
provider evidence does not certify UI or model execution. Installation,
configuration, commits and publication require separate authority.
