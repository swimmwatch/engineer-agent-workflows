# Packet 08: Native Plugin Packaging

Requirements: HOST-001, HOST-002, ARCH-001, ARCH-002, INV-001, INV-002,
TOK-001, TOK-002, DIST-001, DIST-006, DIST-007, ACC-001.

## Outcome

Generate and validate the complete 15-skill release form, explicit-only Codex
and Claude metadata, one coexistable native plugin payload, and repository
marketplace manifests from the canonical `skills/` tree and catalog.

## Prerequisites

- Packets 02–07 are complete; all 15 canonical skills and routed assets pass.
- Repository identity is the public
  `https://github.com/swimmwatch/engineer-agent-workflows`.
- **MANUAL GATE:** the user has confirmed publisher display name and
  maintainer contact values needed by valid manifests. Do not infer them from
  filesystem paths or Git configuration.
- Re-read current official OpenAI and Anthropic plugin/marketplace
  documentation immediately before implementation. If required paths or
  explicit-invocation controls differ, stop and revise this packet/spec rather
  than silently adapting.
- The development release version remains explicitly non-releasable unless the
  user has separately confirmed a stable SemVer.

## Scope

- Generate exact portable/host frontmatter in root release skill directories.
- Generate Codex `agents/openai.yaml` for every skill.
- Generate one complete plugin directory containing both host manifests and
  all 15 release skills.
- Generate one Codex and one Claude repository marketplace, each exposing the
  complete bundle only.
- Validate manifest schemas, paths, versions, catalog completeness, generated
  diffs, explicit-only controls, and context-size static limits.

## Non-Goals

- Do not edit workflow bodies in generated plugin copies.
- Do not create per-skill plugins, vendor-directory submissions, hooks, apps,
  MCP servers, lifecycle wrappers, binaries, or project-local installers.
- Do not install/enable a marketplace or plugin in a real host profile.
- Do not publish, tag, create a remote, or claim hosted/organization acceptance.
- Do not weaken explicit-only policy for a host that cannot enforce it.

## File And Symbol Boundaries

| File/unit | State | Contract |
| --- | --- | --- |
| `scripts/lib/manifests.mjs` | Proposed | Restricted deterministic render/validate functions for Codex and Claude skill/plugin/marketplace metadata; no general YAML execution. |
| `scripts/generate.mjs` | Existing | Generate release frontmatter, Codex sidecars, plugin tree, catalogs, and marketplaces; `--check` is read-only and diff-sensitive. |
| `scripts/validate.mjs` | Existing | Require complete tree; validate every generated artifact, reference, digest, manifest, and version/policy agreement. |
| `skills/<name>/SKILL.md` | Existing/derived header | Canonical body remains hand-edited; required frontmatter is deterministically rendered from catalog with Claude explicit-only fields. |
| `skills/<name>/agents/openai.yaml` | Proposed/generated | Codex policy with `allow_implicit_invocation: false`; no body/reference preload. |
| `plugins/engineer-agent-workflows/.codex-plugin/plugin.json` | Proposed/generated | Required Codex plugin identity/version/publisher/interface/license and `./skills/`; omit hooks/apps/MCP fields because none exist. |
| `plugins/engineer-agent-workflows/.claude-plugin/plugin.json` | Proposed/generated | Required Claude plugin identity/version/publisher/repository/license metadata. |
| `plugins/engineer-agent-workflows/skills/` | Proposed/generated | Byte-deterministic release copy of all 15 canonical skill directories and needed assets; never authored directly. |
| `plugins/engineer-agent-workflows/catalog.json` | Proposed/generated | Public names, descriptions, classification, dependencies, version, and manual digest. |
| `.agents/plugins/marketplace.json` | Proposed/generated | Codex repository marketplace with one `engineer-agent-workflows` local source `./plugins/engineer-agent-workflows`, explicit policy, and category. |
| `.claude-plugin/marketplace.json` | Proposed/generated | Claude repository marketplace with one complete-bundle plugin source `./plugins/engineer-agent-workflows`. |
| `tests/packaging.test.mjs` | Proposed | Golden manifests, closed schemas, version/policy/path agreement, tampering, unknown fields, and generated-diff cases. |
| `tests/fixtures/manifests/` | Proposed | Official-shape valid/invalid fixtures without credentials or personal paths. |

## Release Skill Contract

- Root `skills/<name>/SKILL.md` is the global-install source. Its frontmatter
  contains canonical name/description plus Claude
  `disable-model-invocation: true` and `user-invocable: true`.
- Each root skill contains `agents/openai.yaml` with
  `policy.allow_implicit_invocation: false`.
- Both hosts must safely accept the coexisting metadata; no per-host hand-edited
  skill tree is permitted.
- Every description is at most 240 Unicode code points and every complete
  generated `SKILL.md` is at most 4,096 UTF-8 bytes.
- References/scripts/assets remain inside their canonical skill, except the
  two declared bundle-required workflows that resolve the matching sibling
  planning manual.
- The complete catalog is present with no omitted, renamed, duplicated, or
  reordered skill.

## Plugin And Marketplace Contract

- The plugin name is exactly `engineer-agent-workflows`; directory and both
  manifests agree.
- Both manifests, catalog, and marketplaces use the same SemVer from release
  metadata. Development placeholders are visibly non-release and fail the
  release-ready gate.
- Codex manifest location is
  `.codex-plugin/plugin.json`; the repository Codex marketplace is
  `.agents/plugins/marketplace.json`.
- Claude manifest and marketplace locations are
  `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`.
- Each marketplace has exactly one complete-bundle entry pointing to
  `./plugins/engineer-agent-workflows`. No per-skill entries exist.
- Codex entry includes `policy.installation`, `policy.authentication`, and
  category; do not add product gating unless separately decided.
- Marketplace installation from the Git repository resolves content from an
  immutable release tag/commit. The manifests do not claim that `npx` verifies
  the project tag signature.
- No generated metadata preloads skill bodies, references, hooks, commands, or
  Prompt MCP.

## Generation And Safety Contract

- Generation starts from catalog plus root skill directories, rewrites only
  declared generated headers/sidecars/trees, and rejects manual edits in
  generated outputs.
- Use temporary sibling output and atomic replacement so failure leaves the
  last complete generated tree.
- Reject symlinks, special files, traversal, absolute paths, case-colliding
  names, unexpected files, and artifacts outside the repository root.
- `--check` regenerates in temporary storage and fails on byte diff without
  mutating the worktree.
- Catalog/manual digest/plugin copy/version/policies must agree before success.

## Acceptance Criteria

- Complete generation produces exactly 15 root sidecars and 15 plugin skills.
- Both plugin validators accept their manifests; negative fixtures reject
  unknown/unsupported fields and path escapes.
- All root/plugin skill copies meet size limits and have exact explicit-only
  controls.
- Root and plugin manual bytes/digests agree; only the root copy is authored.
- Re-running generation produces no diff. Editing any generated byte makes
  `--check` fail.
- No per-skill plugin, hook, MCP config, app manifest, installer, executable,
  credential, or personal path is present.
- Static catalog size calculations are available for packet 10; packet 08 does
  not claim real host discovery-budget acceptance.

## Verification

```bash
npm test -- --test-name-pattern='packaging|manifest|marketplace|generated'
npm run generate
npm run validate
npm run generate:check
node scripts/validate.mjs --require-complete
```

Run current official validators where installed, using only repository files:

```bash
claude plugin validate plugins/engineer-agent-workflows
```

Use the current documented Codex plugin validator or validation surface. If
either client/validator is unavailable, record it as unverified and do not
claim host acceptance. Search for forbidden generated surfaces:

```bash
find plugins/engineer-agent-workflows -type l -o -type f -name '.mcp.json'
grep -RInE 'allow_implicit_invocation: true|disable-model-invocation: false'
```

## References

- [Approved specification](../spec.md): host, portable architecture,
  invocation, context, hybrid distribution, marketplace, and validation
  contracts.
- OpenAI, [Package your plugin](https://developers.openai.com/plugins/build/plugins):
  current Codex manifest and plugin validation source; re-fetch before work.
- Current Anthropic Claude Code plugin/marketplace documentation; record the
  exact official URL and version/date in the handoff before generation.

## Completion And Handoff

- Mark only packet 08 complete after generation and all available validators
  pass.
- Record official documentation versions/URLs, manifest fields, public
  repository identity, development/stable version state, artifact counts,
  sizes, digests, unavailable validators, and packet 09 next.
- Stop. Do not install, enable, commit, tag, or publish.
