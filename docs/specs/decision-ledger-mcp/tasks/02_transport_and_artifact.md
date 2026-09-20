# Packet 02: Source Access, Transport And Artifact

Requirements: PKG-001, SOURCE-001, SAFE-001, PAGE-001, LIMIT-001, COMPAT-001.
Depends on the reader interface in ../contracts/mcp.md. Main owns the package
manifest/configuration and source/service/transport modules; no reader semantic
changes without coordinating its owner.

Write filesystem, service and real stdio tests before their implementation.
Assert project/spec isolation, fixed-path denial, no writes, source/cursor
binding, long-record reconstruction, explicit errors and output bounds. Exercise
catalog without parsing inactive journals. Build the actual npm artifact and run
its entrypoint through the official client. Keep stdout protocol-only and
diagnostics bounded. Type-check and lint production TypeScript and test JS.

Commands: npm run build; npm run lint; npm test; npm pack --dry-run --json
--workspace @engineer-agent-workflows/decision-ledger-mcp; npm run
validate:foundation; npm run generate:check -- --allow-incomplete; git diff --check.
Expected: all assertions pass, pack includes only documented runtime/docs files,
no global writes. Record unavailable native host checks separately.

No client installation, release automation, commit or publication. Stop after
the packet with exact evidence and remaining integration work.
