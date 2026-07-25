# Packet 11: Documentation And Operations

Requirements: DIST-002, DIST-003, DIST-004, DIST-005, DIST-006, DIST-007,
MCP-001, SEC-001, SEC-002, SEC-003, REL-001, REL-003, DOC-001.

## Outcome

Write evidence-bound public documentation for the complete inventory,
explicit-only usage, global pinned lifecycle, native plugins, platform/client
prerequisites, context limits, engineering manual, Prompt MCP limitations,
privacy, release trust, and troubleshooting.

## Prerequisites

- Packets 08–10 provide verified generated structures, lifecycle commands,
  client versions, namespaces, context costs, and known limitations.
- The public GitHub owner/repository identity is confirmed.
- Read actual generated manifests, catalog, evidence, and pinned CLI help; do
  not document planned or unavailable behavior as shipped.

## Scope

- Add README and focused operational/security/reference pages.
- Provide normative POSIX and PowerShell lifecycle commands with exact pin,
  telemetry opt-out, global scope, targets, and selections.
- Document standalone versus bundle-required use and missing-manual recovery.
- Document plugin/marketplace usage, duplicate activation, hosted/organization
  scope, privacy, integrity layers, and troubleshooting.
- Add documentation tests for command safety, links, inventory/version
  agreement, and current/proposed state labels.

## Non-Goals

- Do not publish, install, update, remove, enable, tag, or release.
- Do not add a custom CLI/wrapper/rollback mechanism or project-local examples.
- Do not claim vendor-directory listing, universal Prompt MCP, unsupported
  client versions, or unexecuted manual acceptance.
- Do not embed private account/organization names, personal paths, or secrets.
- Do not create translations without an established localization decision.

## File And Section Boundaries

| File/unit | State | Required sections |
| --- | --- | --- |
| `README.md` | Existing/expand | Replace the packet-01 pre-release overview with verified purpose, 15-skill inventory/classification, explicit-only invocation, prerequisites, global install/list/update/remove, plugin modes, context behavior, quick verification, limitations, security/privacy, contributing/license. |
| `docs/installation.md` | Proposed | Linux/macOS/Windows prerequisites; exact POSIX/PowerShell commands; standalone and complete selection; global-only scope; no project mutation. |
| `docs/plugins.md` | Proposed | Codex/Claude plugin and marketplace layout, immutable release source, namespaces, enable/disable, hosted/account/organization scope, duplicate activation warning. |
| `docs/engineering-principles.md` | Proposed | Short public orientation and link to the one authoritative manual; must not copy the manual. |
| `docs/security-and-privacy.md` | Proposed | Telemetry distinction, project isolation, secrets, supply chain, signed tag/checksums, npm integrity versus Git trust, Prompt MCP data boundary. |
| `docs/troubleshooting.md` | Proposed | Discovery, client floor, permissions, symlink/copy layouts, bundle mismatch, update/remove, plugin namespace, duplicate activation, context warnings, telemetry. |
| `docs/compatibility.md` | Proposed | Exact verified clients/platforms/surfaces and clearly marked unavailable/manual gates. |
| `tests/documentation.test.mjs` | Proposed | Inventory, command AST/text rules, links, versions, classifications, placeholders, state claims, and forbidden project scope. |

## Normative Command Contract

Every lifecycle example:

- begins by setting `DISABLE_TELEMETRY=1` using correct POSIX or PowerShell
  syntax;
- invokes exact `npx --yes skills@1.5.20`;
- uses `--global`;
- names `--agent codex`, `--agent claude-code`, or both as intended;
- selects an explicit standalone skill or `--skill '*'`;
- uses the verified pinned global form for list/update/remove;
- never uses consuming-project scope, `skills init`, floating `latest`, or
  unqualified update.

Do not offer individual install examples for `incremental-implementation` or
`spec-driven-development`. Their supported path is the complete bundle.

## Required Guidance

- List all 15 stable names and classification.
- Explain that every workflow is explicit-only while bounded descriptions are
  still present in initial host discovery context.
- State the 240-code-point description and 4,096-byte `SKILL.md` limits and
  selective reference routing.
- Explain the single engineering manual, contextual senior-engineering
  principles, three artifact contracts, symbol-level planning output, and
  fixed complete-bundle failure.
- State Node.js 22.20.0+, exact pinned CLI/integrity, verified client floors and
  current versions, supported OS/architectures, and no platform binaries.
- Distinguish global personal mode (recommended local) from native plugin mode
  (recommended hosted/marketplace/managed) and warn against simultaneous
  activation.
- Explain stable add/list/update/remove, no managed rollback, no automatic
  updates, unknown-skill upstream behavior, and no custom lifecycle state.
- Document Prompt MCP as an optional globally configured callable dependency
  for interview-driven workflows, current owner Linux/GTK limitation, and no
  installation/configuration by this bundle.
- Separate npm package integrity, immutable Git source, signed project tag,
  artifact checksums, and host/plugin trust.
- Distinguish verified, proposed, unsupported, manual-gate, and future behavior.

## Acceptance Criteria

- Documentation inventory/version/classification exactly matches catalog and
  generated manifests.
- Command tests reject missing telemetry opt-out, missing global scope, missing
  explicit agent/skill, floating versions, project scope, and individual
  bundle-required examples.
- POSIX and PowerShell examples are syntactically valid and use no private
  placeholders except a clearly defined public `<owner>` before the owner is
  confirmed.
- All relative links and named files resolve.
- No manual content is duplicated; the public overview links to the canonical
  manual.
- Hosted/organization claims match packet-10 evidence and label missing gates.
- Privacy/release docs do not claim `npx` verifies Git signatures.
- README contains no source-project assumptions or claim of vendor-directory
  publication.

## Verification

```bash
npm test -- --test-name-pattern='documentation|commands|links'
npm run validate
npm run generate:check
```

Run documented commands only against packet-09 isolated temporary profiles,
never a real user profile. Check links and scan:

```bash
grep -RInE 'skills@(latest|next)|skills init|--project' README.md docs
grep -RInE '/home/|[A-Z]:\\\\Users\\\\|token|secret' README.md docs
```

Review matches in security examples; no actual credential or personal path may
exist.

## References

- [Approved specification](../spec.md): lifecycle/distribution, Prompt MCP,
  security, version/license, and required documentation contracts.
- Packet-09 CLI evidence and packet-10 host compatibility evidence; these
  artifacts outrank unverified upstream assumptions.

## Completion And Handoff

- Mark only packet 11 complete.
- Record pages, exact verified commands, link/check results, limitations, and
  packet 12 next.
- Stop. Do not commit, install globally, tag, publish, or begin release work
  without separate authorization.
