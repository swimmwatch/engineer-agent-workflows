# engineer-agent-workflows

Reusable engineering Agent Skills for Codex and Claude Code.

> [!IMPORTANT]
> This repository is in pre-release development. No public release or compatibility
> promise has been published. A local Codex dev build and installation are supported;
> see [local development](docs/local-development.md).

## Project status

The approved workstream is specification-first and is implemented in
independently verifiable task packets. The current contract is:

- [Cross-Client Engineering Skill Distribution specification](docs/specs/cross-client-skill-distribution/spec.md)
- [Confirmed specification scope](docs/specs/cross-client-skill-distribution/manifest.yaml)
- [Delivery checklist](docs/specs/cross-client-skill-distribution/tasks/todo.md)

The maintained collection contains 17 explicit-only workflows:

1. `code-review-and-quality`
2. `code-simplification`
3. `context-engineering`
4. `context-scouting`
5. `design-planning`
6. `documentation-and-adrs`
7. `doubt-driven-development`
8. `idea-refine`
9. `incremental-implementation`
10. `interview-me`
11. `performance-optimization`
12. `planning-and-task-breakdown`
13. `product-definition`
14. `product-roadmap`
15. `security-and-hardening`
16. `spec-driven-development`
17. `technical-design`

`context-scouting` is standalone and applies only when explicitly invoked for the
current task. The main agent chooses direct lookup or useful bounded discovery,
requests a native inspection-only scout, then verifies decisive findings. Codex
requests `gpt-6-luna`; Claude Code requests the `haiku` alias. Unsupported
delegation uses bounded direct lookup; cancellation stops dependent discovery.
Read-only instructions do not themselves enforce a sandbox, and savings remain
unmeasured. The old global Codex delegation section was removed; generated
artifacts are not proof of installation. See the
[context-scouting guide](docs/context-scouting.md) for invocation, runtime evidence
and operating limits.

`design-planning` runs separately after the main plan when the confirmed manifest
requires design outputs. It delegates Penpot operations to separately installed
upstream skills; this collection owns scope, YAML contracts, snapshots and task
handoff. Main planning does not create those designs or start the design stage.
See [design-stage contracts](docs/evidence/design-planning-contracts.md).

Every workflow will require explicit user invocation. One authoritative
template source generates a Codex-only artifact and a Claude-Code-only
artifact, so an installed agent sees only its own project-guidance and
question-tool names. Global personal installation will use the reviewed,
pinned upstream `skills` CLI with separate host-specific `add --copy`
commands. The project will not install or modify skills inside consuming
repositories.

`spec-driven-development` first proposes a user-confirmed `Lite`, `Standard`,
or `Deep` depth and the applicable composable profiles. It keeps decision
history in `decisions.yaml`, the current scope in `manifest.yaml`, completes a
gap review, and writes the specification directly as `Status: Approved`
without a separate approval question. It declares warranted UI, API, core, and
architecture contracts but does not create them.
Only after scope confirmation does it load one dedicated reference for each
active profile; inactive profile guidance stays out of the working context.

`planning-and-task-breakdown` requires that Approved specification and
confirmed manifest. It creates the declared reviewable contracts, then writes
test-first task packets. Even a Lite plan includes `plan.md`, `todo.md`, a
current-only `handoff.md`, and one compact packet. Direct user edits remain
authoritative; planning and implementation still require separate explicit
invocations.

`incremental-implementation` executes one authorized packet, checks current
requirements and dependencies, follows RED/GREEN/PROVE, updates the checklist
and handoff, and stops. Code and security reviews are separate, optional
workflows; neither review nor commit is required before the next explicit
invocation. Incorrect checks, stale contracts, and environment failures are
handled separately from implementation defects.

Model recommendations are rendered per host and never switch or gate a model:
Codex suggests Sol for authoring/review, Terra for implementation, and Astra for
difficult cases; Claude suggests Opus for authoring/review and Sonnet for
implementation. Lite changes normally keep existing contracts inline instead
of creating an extra contract file solely because a profile is active.

Those author/reviewer/implementation suggestions are advisory. Context-scouting's
named scout selection is an operational request through the supported native
tool, subject to a supported explicit user override and bounded fallback.

For installation metadata, `spec-driven-development` is standalone,
`planning-and-task-breakdown` depends on the matching specification workflow,
and `incremental-implementation` depends on the matching planning workflow.
The product chain is separately explicit: `product-definition` depends on
`idea-refine`, `technical-design` depends on `product-definition`, and
`product-roadmap` requires both ready product definition and technical design.
See the [verified product workflow guide](docs/product-workflows.md) for storage,
version, review, task-pin, recovery and proof boundaries.

## Engineering Workflow MCP

The separate [engineer-agent-workflow-mcp package](packages/engineer-agent-workflow-mcp/README.md)
provides scenario-specific tools for scope, questions, decisions, shared design
components, screens and stage checks. Agents pass meaningful parameters, not
YAML or field-path patches. Four authoritative schemas drive deterministic
persistence; legacy bounded decision-reader calls remain compatible.

Open a specification using the absolute project path from task context and its
slug, then pass returned context and object references. Multiple projects and
specifications need no manual directory allowlist. Reads and writes stay within
fixed workflow artifact layouts and process permissions; this is not a project
authorization sandbox.

The TypeScript/npm MCP package is a third artifact, separate from the generated
Codex and Claude bundles. Missing MCP blocks workflow YAML operations; shell
queries, manual YAML editing and full-file loading are not fallbacks. Building or
packing does not register a server, install global skills or publish anything.
See the [checkpoint evidence](docs/evidence/workflow-mcp-scenario-tools.md).

## Development

Development requires Node.js 22.20.0 or newer. The maintenance scripts use
Node.js built-ins; the separate TypeScript MCP workspace has pinned runtime
and development dependencies in the root lockfile.

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm run lint
npm test
npm run validate:foundation
npm run generate:check -- --allow-incomplete
```

Strict validation intentionally fails until the complete skill collection is
implemented.

Behavioral model trials are opt-in and separate from `npm test` and CI. See the
[workflow-loop evidence and limitations](docs/evidence/workflow-loop.md).
The evidence consistency checker does not itself certify model behavior:

```bash
node scripts/verify-workflow-evidence.mjs path/to/evidence.json
```

## Contributing and support

- Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing changes.
- Use [SUPPORT.md](SUPPORT.md) for support boundaries.
- Report vulnerabilities privately as described in
  [SECURITY.md](SECURITY.md).
- Participation is governed by
  [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

Licensed under the [MIT License](LICENSE).
