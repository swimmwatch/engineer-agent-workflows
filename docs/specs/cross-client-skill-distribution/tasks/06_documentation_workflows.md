# Packet 06: Documentation Workflows

Requirements: SKILL-001, SKILL-002, SKILL-005, DOC-001, ACC-001, ACC-007.

## Outcome

Generalize `documentation-and-adrs` and `project-docs-maintainer` as standalone
workflows that discover the actual documentation system, distinguish verified
current behavior from proposals, and maintain bounded, linked knowledge without
inventing project facts.

## Prerequisites

- Packet 01 is complete.
- Read the two corresponding source skills and only their directly routed
  references.
- Fixture projects include more than one documentation layout and one project
  with no established ADR convention.

## Scope

- Author both bounded, portable skill directories.
- Preserve technical-document/ADR creation versus project documentation-set
  maintenance as separate user goals.
- Add current/proposed/experimental/unknown classification and ADR evidence
  contracts.
- Add link, duplication, stale-claim, and no-invented-convention fixtures.
- Update only these catalog descriptions if needed.

## Non-Goals

- Do not create a universal documentation hierarchy, ADR template, changelog,
  localization system, docs generator, or hosting service.
- Do not rewrite code, configuration, release artifacts, or unrelated prose.
- Do not describe planned features as shipped or infer commands/interfaces
  from generic practice.
- Do not invoke planning or implementation workflows.

## File Boundaries

| File/unit | State | Contract |
| --- | --- | --- |
| `skills/documentation-and-adrs/SKILL.md` | Proposed | Explicitly requested technical documentation or architecture decision record based on repository evidence and settled trade-offs. |
| `skills/project-docs-maintainer/SKILL.md` | Proposed | Explicitly requested organization, consolidation, update, or audit of the established project knowledge set. |
| Skill-local references/templates | Conditional | Add only if the established workflow cannot fit the body limit; templates must be adaptable, not imposed conventions. |
| `tests/documentation-skills.test.mjs` | Proposed | State classification, ADR completeness, layout discovery, link, duplication, scope, and no-code-mutation cases. |
| `tests/fixtures/documentation/` | Proposed | README/docs-site/ADR/no-ADR/mixed-current-proposed/stale-command projects. |
| `catalog/skills.json` | Existing | Only final descriptions may change; both remain standalone. |

## Shared Documentation Contract

- Reuse host-supplied project instructions. Read `AGENTS.md`/`CLAUDE.md` only
  for additional scoped guidance absent from active context or when the file
  itself is in scope, then inspect the established README/docs structure,
  code/interfaces/config, tests, and release evidence relevant to the claim.
- Label content as current/verified, proposed, experimental, deprecated, or
  unknown. Never collapse those states.
- Reuse the project's terminology, link style, command syntax, and document
  ownership. When no convention exists, propose the smallest local structure
  and make the choice visible.
- Update the nearest authoritative document and remove contradictory duplicate
  claims only within scope.
- Execute or otherwise verify commands and links when safe and authorized;
  label unrun evidence.
- Do not expose secrets, private paths, user answers, or unstable internal
  details.

## ADR Contract

When an ADR is requested and the project supports or accepts ADRs, include:

- status and decision date;
- context and forces;
- the decision and scope;
- alternatives considered with material trade-offs;
- positive and negative consequences;
- compatibility, security, operations, and migration implications where
  relevant;
- reversal/revisit conditions and unresolved follow-up.

An ADR records a settled decision. If material choices remain unresolved, stop
with the missing decisions rather than fabricating consensus.

## Project-Docs Maintenance Contract

- Build a task-scoped map of authoritative documents, audiences, and links.
- Detect stale, duplicated, contradictory, orphaned, and missing guidance.
- Preserve historical records that are clearly labeled; do not rewrite history
  as current behavior.
- Make the smallest coherent set of edits and report claims that could not be
  verified.
- Keep localization unchanged unless the repository establishes it and the
  user includes it.

## Acceptance Criteria

- Both skills are explicit-only, standalone, portable, and within size limits.
- Fixtures preserve current/proposed/experimental/unknown distinctions.
- ADR fixtures include all required decision fields and reject unresolved
  decisions as settled ADRs.
- No-ADR fixtures do not invent a repository-wide convention without an
  explicit choice.
- Stale-command fixtures use repository evidence and report unverified
  commands rather than presenting them as working.
- Link and duplication fixtures update only authoritative in-scope documents.
- No fixture mutates production code or loads unrelated skill/reference
  sentinels.
- Source-project terminology appears only in source-equivalence fixture data,
  not the skills.

## Verification

```bash
npm test -- --test-name-pattern='documentation|ADR|project docs'
npm run validate:foundation
npm run generate:check -- --allow-incomplete
grep -RInE 'prompt-mcp|Go|GTK|Zenity|README\\.md and docs/' \
  skills/documentation-and-adrs skills/project-docs-maintainer
```

Review generated fixture diffs for minimal scope and stable link targets.

## References

- [Approved specification](../spec.md): inventory, adaptation, refinement,
  documentation guidance, validation, and context-efficiency contracts.
- Initial refinement sources: the two matching skill directories in the
  approved `prompt-mcp` source repository.

## Completion And Handoff

- Mark only packet 06 complete.
- Record final sizes, conditional references/templates, fixture layouts,
  verification, and remaining workflow packets.
- Stop; do not commit or begin another packet without separate authorization.
