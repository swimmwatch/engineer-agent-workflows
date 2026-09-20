# Penpot UI Workflow Evidence

Historical evidence for the first Penpot refinement. The later
[separate design stage and formal contracts](design-planning-contracts.md)
supersede its ownership of design creation by main planning.

## Decision And Scope

The user selected Penpot as the editing workspace and verified snapshots in Git.
Decision `ui.penpot-project-design`, revision 1, maps to UI-001 in the parent
specification. The answer was read back through the actual Decision Ledger MCP.
No global installation, client configuration, remote design mutation, publication
or commit was performed.

One project-wide component library lives under `design/system/`; each specification
has its own linked screen set under `design/specs/<slug>/`. Specification records
requirements and declares outputs. Planning owns component/variant design,
instance composition, export and evidence. Production UI code remains a separate
authorized implementation packet.

The entrypoint `SKILL.md` files remain unchanged by this refinement. Following
progressive disclosure, Penpot procedures are reachable only through active UI
planning. Shared references add the narrow optional `project_artifacts` field,
defaulting to an empty list for existing manifests; other profiles retain their
specification-local artifacts. Legacy design locations are not migrated silently.

## Research Applied

Reviewed against official sources on 2026-09-05:

- [Components](https://help.penpot.app/user-guide/design-systems/components/) and
  [variants](https://help.penpot.app/user-guide/design-systems/variants/): reusable
  mains, linked instances and explicit overrides. Visual similarity is not linkage.
- [Libraries](https://help.penpot.app/user-guide/design-systems/libraries/): shared
  assets across linked files in a team. Inspect affected consumers before changing
  the shared source; do not update other specifications without scope.
- [Design tokens](https://help.penpot.app/user-guide/design-systems/design-tokens/):
  token import replaces existing sets/themes. A component link alone does not
  establish token synchronization; preserve existing values before replacement.
- [Export/import](https://help.penpot.app/user-guide/export-import/export-import-files/)
  and [native format](https://help.penpot.app/user-guide/export-import/penpot-file-format/):
  preserve shared-library links in actual native exports, not flattened layers or
  merged editable copies. Hash saved bytes without promising identical repeat
  exports. Restoration requires a separately authorized isolated target.
- [Penpot MCP](https://help.penpot.app/mcp/): discover exposed capabilities and
  verify the actual connected target before writes. Documentation does not prove
  a callable integration or a successful live design/export operation.

## Local Checks

The first focused run failed three checks because project-root artifact routing
and Penpot example assets were missing. The implementation then added authoritative
UI guidance, shared routing, examples and generated both host bundles.

The examples are parsed as YAML and checked for shared library/component/variant
references, state transitions, specification paths and snapshot pins. Two
simulated specification consumers reference one catalog. Mutation checks reject
eight broken relationships, including detached library IDs and stale snapshot
pins. Examples remain unconfirmed or pending with null digests; no fabricated
native archive is shipped. These tests validate example invariants, not a general
consumer-project validator or model behavior.

- `npm test`: **204 passed, 0 failed, 0 skipped**, including the package build.
- `npm run lint`: passed.
- `npm run validate:foundation`: passed, 15/15 skills.
- `npm run generate:check`: passed, both host bundles.
- Codex skill quick validation: specification, planning and incremental passed.
- `git diff --check`: passed.
- Decision Ledger MCP read-back: passed for the confirmed Penpot decision.

Baseline, RED/GREEN logs and MCP evidence are preserved in the private durable run
`2026-09-05-penpot-profiles.oxxRpT`. Published evidence contains no machine paths.

## Explicit Gaps

Penpot MCP is not callable in this session. No live library creation, linked-screen
composition, token replacement, native export or restoration has been verified.
No new native Codex/Claude model trial or independent model review was run; these
remain deferred under the user's usage-budget decision. Existing runtime browser
accessibility gaps, including 200% zoom, are unchanged.

Parent Packet 14 and Decision Ledger MCP Packet 03 remain incomplete. Stable full
matrix passes remain **0 of 2**; these local checks do not close that campaign.
Next, when the user resumes live qualification, use an authorized Penpot target
to test one existing-library UI change and one new screen set, preserving other
specifications and verifying the exported dependencies.
