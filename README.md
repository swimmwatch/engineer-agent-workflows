# engineer-agent-workflows

Reusable engineering Agent Skills for Codex and Claude Code.

> [!IMPORTANT]
> This repository is in pre-release development. The skills are not yet installable,
> and no release or compatibility promise has been published.

## Project status

The approved workstream is specification-first and is implemented in
independently reviewed task packets. The current contract is:

- [Cross-Client Engineering Skill Distribution specification](docs/specs/cross-client-skill-distribution/spec.md)
- [Delivery checklist](docs/specs/cross-client-skill-distribution/tasks/todo.md)

The planned collection contains 15 explicit-only workflows:

1. `code-review-and-quality`
2. `code-simplification`
3. `context-engineering`
4. `documentation-and-adrs`
5. `doubt-driven-development`
6. `idea-refine`
7. `incremental-implementation`
8. `interview-me`
9. `performance-optimization`
10. `planning-and-task-breakdown`
11. `project-docs-maintainer`
12. `project-pull-request`
13. `project-release`
14. `security-and-hardening`
15. `spec-driven-development`

Every workflow will require explicit user invocation. Global personal
installation will be supported only through the reviewed, pinned upstream
`skills` CLI, and native Codex and Claude Code plugins will contain the same
portable workflow sources. This project will not install or modify skills
inside consuming repositories.

## Development

Maintenance scripts require Node.js 22.20.0 or newer and use Node.js built-ins
only. Packet 01 introduces no npm dependencies and does not require
`npm install`.

```bash
npm test
npm run validate:foundation
npm run generate:check -- --allow-incomplete
```

Strict validation intentionally fails until the complete skill collection is
implemented.

## Contributing and support

- Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing changes.
- Use [SUPPORT.md](SUPPORT.md) for support boundaries.
- Report vulnerabilities privately as described in
  [SECURITY.md](SECURITY.md).
- Participation is governed by
  [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

Licensed under the [MIT License](LICENSE).
