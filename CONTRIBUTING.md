# Contributing

Thank you for helping improve `engineer-agent-workflows`.

## Before making a change

1. Read the applicable `AGENTS.md`.
2. Check the approved specification and linked task checklist.
3. For substantial work, use the current self-contained task packet.
4. Keep the change within the authorized packet and preserve unrelated work.

Repository evidence and approved requirements outrank generic workflow
defaults. Do not invent client behavior, commands, paths, or release policy.

## Source ownership

- `skills/<name>/` will be the only hand-edited workflow source.
- Host sidecars, plugin payloads, marketplaces, and release catalogs will be
  generated from canonical sources and committed for review.
- Never hand-edit generated copies or maintain separate Codex and Claude
  workflow bodies.
- Never add credentials, personal machine paths, local profiles, installed
  skill copies, caches, or private answer data.

## Local checks

Use Node.js 22.20.0 or newer. Maintenance scripts use Node.js built-ins; the
separate MCP workspace has pinned dependencies recorded in the root lockfile.
Use the lockfile for reproducible local setup; do not float versions or run
global installation commands as part of development.

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm run lint
npm test
npm run validate:foundation
npm run generate:check -- --allow-incomplete
```

Run only checks applicable to the current packet and report anything that was
not available or not run.

## Commits and pull requests

- Create commits only with explicit authorization.
- Keep one logical change per commit.
- Use Conventional Commits.
- Stage exact paths and inspect the staged diff.
- Complete the pull request template, including tests, security/privacy
  impact, and generated-diff evidence.

Security vulnerabilities must be reported privately through
[SECURITY.md](SECURITY.md), not through a public issue or pull request.
