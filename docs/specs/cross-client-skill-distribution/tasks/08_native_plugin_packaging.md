# Packet 08: Host-Specific Plugin Packaging

Requirements: HOST-001, HOST-002, ARCH-001, ARCH-002, INV-001, INV-002,
TOK-001, TOK-002, DIST-001, DIST-006, DIST-007, ACC-001.

## Outcome

Generate and validate two complete 15-skill release artifacts from one
authoritative template source: one artifact only for Codex and one only for
Claude Code. Each native marketplace points to its matching artifact.

## Prerequisites

- Packets 02-07 are complete and all 15 canonical skills pass source
  validation.
- Repository identity and reviewed release metadata are available.
- Re-read current official OpenAI and Anthropic plugin documentation before
  changing host manifests or invocation controls.
- A development release remains non-releasable until the user separately
  confirms a stable SemVer version.

## Scope

- Keep `skills/<name>/` as the only hand-edited workflow source.
- Allow only declared `{{HOST_*}}` variables where portable content needs a
  host-specific value.
- Render a complete Codex plugin under
  `plugins/codex/engineer-agent-workflows/`.
- Render a complete Claude Code plugin under
  `plugins/claude-code/engineer-agent-workflows/`.
- Generate one matching repository marketplace entry per host.
- Validate manifests, paths, versions, catalog completeness, explicit-only
  controls, size limits, template resolution, and cross-host isolation.
- Replace the complete generated `plugins/` tree atomically so obsolete
  bundle layouts cannot survive generation.

## Non-Goals

- Do not hand-edit a generated host bundle.
- Do not maintain independent Codex and Claude workflow implementations.
- Do not add per-skill plugins, hooks, commands, applications, MCP
  configuration, an installer, or project-local activation.
- Do not install, enable, publish, tag, push, or validate against a real user
  profile in this packet.

## Architecture And Ownership

| File or unit | State | Responsibility and boundary |
| --- | --- | --- |
| `skills/<name>/SKILL.md` and non-generated assets | Existing/template source | Authoritative portable workflow content. May contain only declared host variables. |
| `catalog/skills.json` and `catalog/release.json` | Existing | Stable identities, policy inputs, dependencies, version, publisher, and release state. |
| `scripts/lib/distribution.mjs` | Generated-distribution owner | Strictly render host variables, assemble both trees, reject unsafe paths, and atomically replace all managed outputs. |
| `scripts/lib/manifests.mjs` | Manifest owner | Render and validate the distinct Codex and Claude plugin and marketplace schemas. |
| `plugins/codex/engineer-agent-workflows/` | Generated | Codex-only manifest, all 15 Codex-rendered skills, Codex sidecars, catalog, and shared bundle resources. |
| `plugins/claude-code/engineer-agent-workflows/` | Generated | Claude-only manifest, all 15 Claude-rendered skills, catalog, and shared bundle resources; no Codex sidecars. |
| `.agents/plugins/marketplace.json` | Generated | One complete Codex bundle pointing at the Codex plugin root. |
| `.claude-plugin/marketplace.json` | Generated | One complete Claude bundle pointing at the Claude plugin root. |
| `tests/packaging.test.mjs` | Test owner | RED/GREEN coverage for rendering, isolation, closed schemas, rollback, and generated-diff behavior. |

The generator depends inward on canonical skills and catalogs. Canonical skills
never depend on generated plugin paths. The two generated bundles are siblings
and never depend on one another.

## Template Contract

The initial supported variables are:

| Variable | Codex value | Claude Code value |
| --- | --- | --- |
| `{{HOST_PROJECT_INSTRUCTIONS}}` | `AGENTS.md` | `CLAUDE.md` |
| `{{HOST_QUESTION_TOOL}}` | `request_user_input` | `AskUserQuestion` |
| `{{HOST_DISPLAY_NAME}}` | `Codex` | `Claude Code` |

Generation shall fail on an unknown variable, an unsupported host, invalid
UTF-8, unresolved variables, unsafe paths, symbolic links, special files, or
case-colliding output. Host values are data supplied by the renderer, not
runtime branches left for an installed agent.

## Host Artifact Contract

- The Codex artifact contains `.codex-plugin/plugin.json` and generated
  `agents/openai.yaml` with `allow_implicit_invocation: false`.
- The Claude artifact contains `.claude-plugin/plugin.json`, Claude
  explicit-only frontmatter, and no `agents/openai.yaml`.
- Neither artifact contains the other host's question tool, project-guidance
  filename, display name, or plugin manifest.
- Both artifacts contain the same 15 skill identities and the same portable
  workflow semantics from one release.
- Marketplace versions, plugin versions, catalog version, and release metadata
  agree.
- Generated shared engineering resources are byte-identical and carry matching
  digests.

## Test-First Verification

1. Add or update packaging tests before renderer behavior.
2. Prove RED for mixed-host leakage, unknown variables, unsupported hosts, stale
   generated paths, and host-inapplicable metadata.
3. Implement the smallest renderer and bundle layout that satisfies the correct
   checks.
4. If a correct check fails, adjust implementation; do not weaken the check.
5. Run focused packaging tests, then complete repository validation.
6. Inspect the generated diff and verify the old
   `plugins/engineer-agent-workflows/` layout is absent.

## Acceptance Criteria

- Generation produces exactly 15 Codex skills and 15 Claude Code skills.
- All declared variables resolve and unknown variables or hosts fail closed.
- Codex output contains no Claude-only values or manifest.
- Claude output contains no Codex-only values, sidecar, or manifest.
- Each marketplace points only to its matching host bundle.
- Re-running generation produces no diff.
- Editing, adding, or retaining any managed generated path makes
  `generate:check` fail.
- A failed replacement restores every prior managed output.
- All source and generated skills meet the 240-code-point description and
  4,096-byte `SKILL.md` limits.
- Available native validators accept their corresponding artifact; an
  unavailable validator is recorded as unverified.

## Verification

```bash
npm run generate
node --test tests/packaging.test.mjs tests/manual-verifier.test.mjs
npm test
npm run validate
npm run generate:check
git diff --check
```

Run `claude plugin validate` against
`plugins/claude-code/engineer-agent-workflows/` when the current Claude CLI is
available. Use the current documented Codex plugin validation surface for
`plugins/codex/engineer-agent-workflows/`. Do not claim host validation when a
client or validator is unavailable.

## Completion And Handoff

Record generated file counts, host-isolation evidence, validator availability,
test results, and the exact next packet. Stop without installation, commit,
publication, tag, push, or activation.
