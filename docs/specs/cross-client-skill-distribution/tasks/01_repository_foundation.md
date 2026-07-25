# Packet 01: Repository Foundation

Requirements: OUT-001, SCOPE-001, SKILL-001, SKILL-003, SKILL-004,
SKILL-005, ARCH-001, ARCH-002, ARCH-003, TOOL-001, TOOL-003, SEC-003,
REL-003.

## Outcome

Create the public project governance baseline, maintenance-only Node.js
project, complete 15-skill catalog, dependency-free validation and generation
primitives, deterministic test harness, MIT license, and
contribution/security scaffolding. This packet does not author workflow bodies
or host plugins.

## Prerequisites

- The specification is approved.
- Local Git uses default branch `main`, has no commits, and points at the
  public `swimmwatch/engineer-agent-workflows` GitHub repository.
- The target contains `AGENTS.md`, the approved specification bundle, and no
  implementation.
- No release version or publisher contact identity is needed.

## Scope

- Establish Node.js 22.20.0-or-newer maintenance scripts using built-in modules.
- Represent all 15 public skill identities, classifications, dependencies, and
  bounded discovery descriptions in a canonical catalog.
- Represent the reviewed `skills@1.5.20` version and npm integrity in release
  metadata.
- Parse, validate, render, hash, and snapshot skill artifacts deterministically.
- Provide fixture-driven tests that later packets can extend.
- Add a factual pre-release README, MIT license, security/support/contribution
  policies, code of conduct, issue/PR templates, and text/repository defaults.

## Non-Goals

- Do not create a commit, tag, release, branch protection rule, repository
  secret, GitHub App, or published package.
- Do not install global skills or invoke Codex, Claude Code, Prompt MCP, or
  `npx`.
- Do not create a lifecycle executable, wrapper, installer, lock, rollback, or
  user-state format.
- Do not create skill bodies, plugin manifests, marketplace manifests,
  workflows, changelog entries, or release archives.
- Do not add runtime or development dependencies.

## File And Symbol Boundaries

| File/unit | State | Contract |
| --- | --- | --- |
| `package.json` | Proposed | Private package; `engines.node >=22.20.0`; maintenance/test scripts only; no `bin`, dependencies, `postinstall`, or publish configuration. |
| `catalog/skills.json` | Proposed | Ordered canonical records for exactly the 15 approved names. Fields: `name`, `description`, `classification`, `dependencies`, and explicit host-policy inputs. |
| `catalog/release.json` | Proposed | Development version state, reviewed upstream package/version/integrity, Node floor, stable-only channel, license, and release-readiness flag. |
| `scripts/lib/catalog.mjs` | Proposed | `readCatalog(root)`, `validateCatalog(catalog)`, `validateSkillEntry(entry)`, `dependencyOrder(entries)`. |
| `scripts/lib/skill-document.mjs` | Proposed | `splitSkillDocument(text)`, `renderRequiredFrontmatter(entry)`, `validateSkillDocument(entry, text)`, `countCodePoints(text)`, `utf8Bytes(text)`. |
| `scripts/lib/files.mjs` | Proposed | `walkFiles(root)`, `sha256File(path)`, `snapshotTree(root)` with normalized relative paths and deterministic ordering. |
| `scripts/lib/errors.mjs` | Proposed | Fixed-code `ValidationError` and bounded diagnostic formatting that excludes file content and environment data. |
| `scripts/generate.mjs` | Proposed | `main(argv)`, `renderCodexMetadata(entry)`, `generateRepository(root, {check, requireComplete})`; foundation mode refuses release artifacts. |
| `scripts/validate.mjs` | Proposed | `main(argv)`, `validateRepository(root, {requireComplete})`; foundation mode validates catalog and available artifacts without accepting a releasable incomplete tree. |
| `tests/lib/fixtures.mjs` | Proposed | Declarative fixture loader and temporary-tree builder used by later packets. |
| `tests/catalog.test.mjs` | Proposed | Catalog identity, grammar, dependency, ordering, size, and immutability tests. |
| `tests/skill-document.test.mjs` | Proposed | Frontmatter, code-point, UTF-8 byte, unknown-field, and deterministic-render tests. |
| `tests/files.test.mjs` | Proposed | Tree ordering, path normalization, symlink rejection, and snapshot isolation tests. |
| `tests/fixtures/foundation/` | Proposed | Valid and invalid bounded inputs; no copied private/project content. |
| `README.md` | Proposed | Factual pre-release overview, project status, 15 planned workflows, explicit-only/global-only boundaries, specification link, development prerequisites, and no unverified install commands. Packet 11 expands it after behavior is verified. |
| `LICENSE` | Proposed | Standard MIT text for 2026 `engineer-agent-workflows contributors`; no inferred personal legal name. |
| `SECURITY.md` | Proposed | Supported-version policy before/after v1, private vulnerability reporting through GitHub Security Advisories, best-effort response expectations, secret-handling rules, and public-issue exclusions. |
| `CONTRIBUTING.md` | Proposed | Specification/packet workflow, local validation, generated-file ownership, explicit authorization boundaries, and commit/PR expectations. |
| `CODE_OF_CONDUCT.md`, `SUPPORT.md` | Proposed | Contributor Covenant-based conduct and bounded community support versus private security reporting. |
| `.github/ISSUE_TEMPLATE/config.yml`, `.github/ISSUE_TEMPLATE/bug.yml`, `.github/ISSUE_TEMPLATE/feature.yml`, `.github/PULL_REQUEST_TEMPLATE.md` | Proposed | Structured public intake with security redirection, evidence fields, checklist links, and no credentials/private content. |
| `.gitignore`, `.gitattributes`, `.editorconfig` | Proposed | Ignore generated caches/local host state, normalize text/LF, and define portable whitespace without ignoring committed generated distributions. |

## Catalog Contract

- Preserve the 15 names and order listed in the approved specification.
- `planning-and-task-breakdown` is `standalone`.
- `incremental-implementation` and `spec-driven-development` are
  `bundle-required` with the sole dependency
  `planning-and-task-breakdown`.
- The other 12 entries are `standalone` with no required sibling skill.
- Names use lowercase ASCII hyphen-case, are unique, and are public stable
  identifiers.
- Descriptions are valid UTF-8, nonblank, normalized only for line endings,
  contain at most 240 Unicode code points, and describe explicit user intent.
- Dependencies refer to catalog names, contain no cycles, and are emitted in
  deterministic topological order with catalog order as the stable tie-breaker.
- Host policy inputs require Codex
  `policy.allow_implicit_invocation: false` and Claude
  `disable-model-invocation: true`, `user-invocable: true`; they are data for
  later generation, not active host configuration.
- Readers and validators do not mutate caller objects and return copied,
  deeply frozen or boundary-cloned data.

## Release Metadata Contract

- Use a non-release SemVer placeholder such as `0.0.0-development` and
  `releaseReady: false`; release validation must reject it.
- Record `skills@1.5.20`, minimum Node.js `22.20.0`, stable channel only, MIT,
  and npm integrity:
  `sha512-lPl5KzMfTW+qwHFwc8t6R+wAqmdmSHw1+HWbGdJ/FZYbWLdB34bAZNFWiencM5DVoRaKAgXArmfTWMlNAbl9Gg==`.
- Record repository identity as `swimmwatch/engineer-agent-workflows`; do not
  record a client floor/current version, tag, commit, or checksum until
  verified.

## Validation And Generation Invariants

- Accept only UTF-8 JSON with closed known object shapes and deterministic
  key/order rendering.
- Reject absolute paths, `..`, backslash aliases, NUL, symlinks, duplicate
  normalized paths, and paths outside the repository root.
- `SKILL.md` parsing recognizes one YAML frontmatter block and a Markdown body,
  rejects duplicate/unknown required identity fields, and never evaluates YAML
  tags or executable content.
- Count descriptions by Unicode code point and complete skill documents by
  encoded UTF-8 bytes.
- Foundation validation may report missing future skill files as an explicit
  incomplete state; the command used for release/CI must never accept it.
- `--check` performs no writes. Generation writes only declared repository
  outputs, uses stable LF endings, and is idempotent.
- Diagnostics contain a fixed code, normalized repository-relative path when
  safe, and fixed rule; never echo skill bodies, environment values, or
  absolute personal paths.

## Acceptance Criteria

- All 15 entries are present exactly once with the approved classification.
- Catalog validation rejects duplicate names, unknown dependencies, cycles,
  invalid classifications, descriptions at 241 code points, and incorrect
  host policy.
- Document validation accepts exactly 240 code points and 4,096 UTF-8 bytes
  and rejects the next boundary.
- Tree snapshots are byte-for-byte deterministic across traversal order and
  do not follow symlinks.
- Repeated generation/check calls produce identical bytes and no undeclared
  files.
- `package.json` is private and contains no dependency, binary, install hook,
  or publication surface.
- README and governance documents agree that implementation and releases do
  not exist yet; issue/PR templates route vulnerabilities to private reporting.
- Git status contains only intended uncommitted source/planning files and
  `origin` matches the selected public repository.
- Repository guidance contains no project-local lifecycle command or claim
  that skills are already complete.

## Verification

Run from the new project root:

```bash
node --version
npm test
npm run validate:foundation
npm run generate:check -- --allow-incomplete
node --test
git status --short
git remote get-url origin
```

Also:

```bash
find . -type l -print
grep -RInE 'skills (init|add)|--project|postinstall|\"bin\"' \
  package.json catalog scripts tests README.md CONTRIBUTING.md SECURITY.md
```

The symlink search must be empty. Review every dependency and script field in
`package.json`. Confirm every governance link resolves and the GitHub templates
contain no credentials or personal paths. Do not run `npm install`; there are
no dependencies.

## References

- [Approved specification](../spec.md): goals, exclusions, inventory,
  architecture, tool, security, and license contracts listed above.
- [Decision ledger](../decisions.yaml): approved catalog, tooling, platform,
  release, and explicit-invocation decisions.

## Completion And Handoff

- Mark only packet 01 complete in `todo.md`.
- Replace `handoff.md` with exact files, catalog classifications, Node/release
  metadata, commands, results, and packet 02 as the next dependency.
- Record any unrelated pre-existing files without modifying them.
- Stop for review. Do not commit unless the user separately authorizes it.
