# Cross-Client Skill Distribution Handoff

## State

- Specification: approved, Prompt MCP revision 4.
- Packet 01: complete and uncommitted.
- Git: no commits on `main`.
- Origin: `https://github.com/swimmwatch/engineer-agent-workflows.git`.
- Published, installed, or generated plugin artifacts: none.

## Packet 01 Changes

Repository governance:

- `README.md`, `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`, `SUPPORT.md`
- `.gitignore`, `.gitattributes`, `.editorconfig`
- `.github/ISSUE_TEMPLATE/config.yml`
- `.github/ISSUE_TEMPLATE/bug.yml`
- `.github/ISSUE_TEMPLATE/feature.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`

Maintenance contracts:

- `package.json`
- `catalog/skills.json`
- `catalog/release.json`
- `scripts/lib/catalog.mjs`
- `scripts/lib/skill-document.mjs`
- `scripts/lib/files.mjs`
- `scripts/lib/errors.mjs`
- `scripts/validate.mjs`
- `scripts/generate.mjs`

Tests and fixtures:

- `tests/catalog.test.mjs`
- `tests/skill-document.test.mjs`
- `tests/files.test.mjs`
- `tests/cli.test.mjs`
- `tests/governance.test.mjs`
- `tests/lib/fixtures.mjs`
- `tests/fixtures/foundation/`

The approved specification, decisions, task packets, `AGENTS.md`, Git branch,
and origin were preserved.

## Contracts Delivered

- The ordered catalog contains exactly 15 stable skill identities.
- `incremental-implementation` and `spec-driven-development` are
  `bundle-required` on `planning-and-task-breakdown`; the other 13 entries,
  including planning, are standalone.
- Every catalog description is at most 240 Unicode code points.
- Codex implicit invocation is false; Claude model invocation is disabled and
  user invocation is enabled for every entry.
- Release metadata is schema version 1, `0.0.0-development`,
  `releaseReady: false`, stable-only, MIT, Node.js 22.20.0+, and pins
  `skills@1.5.20` with the approved npm integrity and telemetry opt-out.
- Validation uses closed JSON shapes, restricted scalar frontmatter, 4,096-byte
  skill-document bounds, deterministic dependency order, copied results,
  no-follow traversal, case/path protections, and content-free diagnostics.
- Strict validation fails closed until all 15 skills exist. Foundation
  validation and incomplete generation check are read-only and create no
  plugin or marketplace output.
- Governance routes security and conduct reports privately to the verified
  public maintainer contact. No repository security setting was changed.

## Verification

Environment:

- Node.js: `v24.14.0` (satisfies `>=22.20.0`)
- npm: `11.9.0`

Results:

- `npm test` — passed, 5 test files.
- `npm run validate:foundation` — passed, `0/15 skills present`.
- `npm run generate:check -- --allow-incomplete` — passed,
  `15 skills pending`; tree unchanged.
- `node --test` — passed.
- `npm run validate` — expected fail-closed result:
  `E_INCOMPLETE: complete validation requires all 15 skill directories`.
- JavaScript syntax checks — passed for all production `.mjs` files.
- UTF-8, LF, final-newline, and trailing-whitespace checks — passed.
- Symlink search — empty.
- Forbidden project-scope, install, secret, personal-path, `bin`, and
  `postinstall` searches — no matches.
- Staging/target comparison — all 33 Packet-01 files byte-identical.
- `package-lock.json` — absent.
- Git — no commits on `main`; origin unchanged.

## Compatibility And Limitations

- The collection is intentionally incomplete and not installable.
- No `skills/`, plugin, marketplace, workflow, release archive, or package
  dependency was created.
- No real Codex, Claude Code, Prompt MCP, npm lifecycle, or user profile was
  accessed.
- Private GitHub vulnerability reporting remains disabled; `SECURITY.md` uses
  the public maintainer email as the private reporting channel.

## Next Packet

[Packet 02 — Engineering manual and planning](02_engineering_manual_and_planning.md)

Before Packet 02 edits:

1. Verify Packet 01 still matches this handoff.
2. Obtain explicit authorization to commit Packet 01.
3. Commit only Packet-01 implementation/governance changes and the Packet-01
   checklist/handoff update in atomic Conventional Commits.
4. Then implement Packet 02 only.

Do not commit, push, install, publish, or begin Packet 02 in the current turn.
