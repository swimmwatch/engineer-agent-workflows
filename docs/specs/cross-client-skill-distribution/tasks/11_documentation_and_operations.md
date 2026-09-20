# Packet 11: Documentation And Operations

Requirements: DIST-002, DIST-003, DIST-004, DIST-005, DIST-006, DIST-007,
TEST-001, PLAN-002, INT-001, MCP-001, SEC-001, SEC-002, SEC-003, REL-001,
REL-003, DOC-001.

## Outcome

Write evidence-bound public documentation for the complete inventory,
explicit-only usage, global pinned lifecycle, native plugins, platform/client
prerequisites, context limits, engineering manual, host-native question tools,
test-first planning, the retired Prompt MCP non-goal, privacy, release trust,
and troubleshooting.

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
- Document host-native questions for all four interactive workflows,
  test-first/PROVE ordering, and the conditional developer-documentation rule.
- Add documentation tests for command safety, links, inventory/version
  agreement, and current/proposed state labels.

## Non-Goals

- Do not publish, install, update, remove, enable, tag, or release.
- Do not add a custom CLI/wrapper/rollback mechanism or project-local examples.
- Do not claim vendor-directory listing, Prompt MCP integration, unsupported
  client versions, or unexecuted manual acceptance.
- Do not embed private account/organization names, personal paths, or secrets.
- Do not create translations without an established localization decision.

## File And Section Boundaries

| File/unit | State | Required sections |
| --- | --- | --- |
| `README.md` | Existing/expand | Replace the packet-01 pre-release overview with verified purpose, inventory/classification, explicit-only invocation, prerequisites, separate host-specific add/list/repeat-add/remove, plugin modes, context behavior, verification, limitations, security/privacy, contributing, and license. |
| `docs/installation.md` | Proposed | Linux/macOS/Windows prerequisites; exact POSIX/PowerShell commands; standalone and complete selection; global-only scope; no project mutation. |
| `docs/plugins.md` | Proposed | Codex/Claude plugin and marketplace layout, immutable release source, namespaces, enable/disable, hosted/account/organization scope, duplicate activation warning. |
| `docs/engineering-principles.md` | Proposed | Short public orientation and links to the authoritative engineering and test-discipline references; must not copy either reference. |
| `docs/security-and-privacy.md` | Proposed | Telemetry distinction, project isolation, secrets, host-native question and decision persistence, supply chain, signed tag/checksums, npm integrity versus Git trust, and the explicit absence of a Prompt MCP data boundary. |
| `docs/troubleshooting.md` | Proposed | Discovery, client floor, permissions, copy isolation, source mismatch, repeat-add replacement/remove, plugin namespace, duplicate activation, context warnings, and telemetry. |
| `docs/compatibility.md` | Proposed | Exact verified clients/platforms/surfaces and clearly marked unavailable/manual gates. |
| `tests/documentation.test.mjs` | Proposed | Inventory, command AST/text rules, links, versions, classifications, placeholders, state claims, and forbidden project scope. |

## Normative Command Contract

Every host-specific add or replacement example:

- begins by setting `DISABLE_TELEMETRY=1` with correct POSIX or PowerShell
  syntax;
- invokes exactly `npx --yes skills@1.5.20`;
- uses `--global`;
- uses the matching host-specific source;
- names exactly one `--agent codex` or `--agent claude-code`;
- includes `--copy`;
- selects an explicit standalone skill or `--skill '*'`;
- is presented as one of two commands when both hosts are intended.

List examples name one agent and use global JSON output. Removal examples name
explicit agents and selection. Replacement repeats the matching host-specific
`add --copy` command. Documentation shall never use consuming-project scope,
`skills init`, a floating package version, one mixed-source add for both
agents, or `skills update`.

Do not offer individual installation examples for
`incremental-implementation` or `spec-driven-development`; their supported
path is the matching complete bundle.

## Required Guidance

- List all 15 stable names and classification.
- Explain that every workflow is explicit-only while bounded descriptions are
  still present in initial host discovery context.
- State the 240-code-point description and 4,096-byte `SKILL.md` limits and
  selective reference routing.
- Explain the single engineering manual, contextual senior-engineering
  principles, test-first/RED/GREEN/PROVE discipline, three artifact contracts,
  symbol-level planning output, conditional developer documentation, and fixed
  complete-bundle failure.
- State Node.js 22.20.0+, exact pinned CLI/integrity, verified client floors and
  current versions, supported OS/architectures, and no platform binaries.
- Distinguish global personal mode (recommended local) from native plugin mode
  (recommended hosted/marketplace/managed) and warn against simultaneous
  activation.
- Explain separate host-specific add/list/repeat-add/remove, mandatory
  `--copy`, absence of `skills update` and managed rollback, individual versus
  complete selection, and unknown-skill behavior.
- Document `request_user_input` for Codex and `AskUserQuestion` for Claude Code
  as the standard tools for specification, planning, idea refinement, and
  requirements interviews. State that they run in the current interaction mode
  and do not require entering plan mode solely to ask.
- State that Prompt MCP is not required or invoked by any collection workflow
  and is neither installed nor configured by this bundle.
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
- No shared test-discipline content is duplicated, and no documentation claims
  a Prompt MCP dependency for a collection workflow.
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

- [Approved specification](../spec.md): lifecycle/distribution, host-native
  questions, retired Prompt MCP integration, test-first planning, security,
  version/license, and required documentation contracts.
- Packet-09 CLI evidence and packet-10 host compatibility evidence; these
  artifacts outrank unverified upstream assumptions.

## Completion And Handoff

- Mark only packet 11 complete.
- Record pages, exact verified commands, link/check results, limitations, and
  packet 12 next.
- Stop. Do not commit, install globally, tag, publish, or begin release work
  without separate authorization.
