---
name: project-docs-maintainer
description: "Maintain a project documentation set when the user explicitly asks to organize, update, consolidate, or audit project knowledge. Preserve authoritative ownership, verified behavior, links, history, and audience boundaries."
disable-model-invocation: true
user-invocable: true
---

# Project Docs Maintainer

Use this workflow only for an explicit request to organize, update,
consolidate, or audit an established project documentation set. Establish
whether the user authorized read-only assessment or bounded documentation
edits; project code, configuration, and release artifacts remain out of scope.

1. In Codex, read the nearest applicable `AGENTS.md`; in Claude Code, read
   applicable `CLAUDE.md`. Discover the actual README, documentation layout,
   ownership, audiences, link style, command syntax, and history. Inspect only
   task-relevant code, interfaces, configuration, tests, release evidence, and
   stable documents needed to verify claims. Do not impose a universal
   hierarchy, generator, hosting system, or terminology.
2. Build a task-scoped map of authoritative documents, audiences, owners, and
   inbound and outbound links. Classify material claims as `current`,
   `proposed`, `experimental`, `deprecated`, or `unknown`; never collapse those
   states or infer behavior from generic practice.
3. Identify stale, duplicated, contradictory, orphaned, missing, or misplaced
   guidance with repository-relative evidence. Preserve historical records
   that are clearly labeled and preserve unrelated prose.
4. Make the smallest coherent in-scope edit set. Update the nearest
   authoritative owner, remove contradictory duplicates only when their
   authority is established, and repair links to stable existing targets.
   When no documentation convention exists, expose the smallest local proposal
   rather than silently creating a repository-wide convention.
5. Execute or otherwise verify safe commands and links when authorized. Mark
   unavailable evidence and unrun commands explicitly; never present them as
   working. Leave localization unchanged unless the repository already
   establishes it and the user includes it in scope.
6. Report the documentation map, exact authoritative changes, removed
   contradictions, preserved history, link and command evidence, and claims
   still unknown. Keep output bounded and exclude secrets, private paths, user
   answers, personal data, and unstable internal details.

Stop after the requested documentation maintenance. Do not rewrite code,
configuration, release artifacts, unrelated prose, invoke another workflow,
install, or publish.
