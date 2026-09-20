# Packet 01: Parsed Decision Reader

Requirements: READ-001, DATA-001, LIMIT-001. Source: ../contracts/mcp.md, Reader
Unit Boundary and Operations. No filesystem traversal, transport, package or
skill changes belong to this packet.

Implement only src/ledger.ts and its test suite under the MCP package. Use the
actual pinned YAML parser. Write discriminating tests first; observe RED for
revision selection, malformed input, exact text preservation and query behavior.
Correct implementation until GREEN. If initial RED is only a missing module,
prove meaningful assertions afterward with one-at-a-time controlled mutations.

Check valid optional/unknown fields, retired IDs, historical answers containing
colon-space/newlines, duplicate YAML keys/pairs, invalid supersedes links, unknown
categories, literal filters and a journal exceeding 30,000 lines. Preserve
correct tests. No source modification or semantic repair of a real ledger.

Commands: npm run build -w @engineer-agent-workflows/decision-ledger-mcp;
node --test packages/decision-ledger-mcp/test/ledger.test.mjs;
npm run lint -w @engineer-agent-workflows/decision-ledger-mcp.
Expected: exit 0, all assertions pass, recorded large-fixture size/latency.
Escalate contract contradictions; do not redesign the interface. Stop after this
packet and report actual RED/GREEN/PROVE evidence. Do not review or commit.
