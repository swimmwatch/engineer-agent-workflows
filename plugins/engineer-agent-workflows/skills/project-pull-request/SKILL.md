---
name: project-pull-request
description: "Create, update, or review a pull request when the user explicitly requests PR work. Discover repository policy, base/head, templates, checks, and provider state; preserve unrelated changes and require authority for external mutations."
disable-model-invocation: true
user-invocable: true
---

# Project Pull Request

Use this workflow only for an explicit request to create, update, or review a
pull request. Establish the requested outcome and authority before acting:
review-only, local edit, commit, push, create, update, and review-comment
operations are distinct. Authentication or tool access never grants mutation
authority.

1. In Codex, read the nearest applicable `AGENTS.md`; in Claude Code, read
   applicable `CLAUDE.md`. Inspect task-scoped repository guidance, status,
   worktree and staged diffs, history, current branch and upstream, remotes,
   contribution policy, and available provider metadata. Do not assume a
   provider, default branch, template, check, protection rule, or commit style.
2. Derive the provider, existing change request, default/base/head branches,
   template, title/body conventions, required checks, branch protection, and
   permissions from current repository or provider evidence. Use provider
   tools or commands only after that evidence selects them. Keep unsupported or
   conflicting values `unknown`; ask for material choices or stop when safe
   execution depends on them.
3. For review-only work, do not mutate local or external state. For an
   authorized local edit, preserve unrelated changes and remain within the
   requested paths. Before any commit, stage exact intended paths, inspect the
   complete staged diff, and use the repository's established commit convention
   only when evidence shows one.
4. Before a push, create, update, or review-comment action, confirm matching
   user authority and recheck the selected remote, base/head, current branch,
   existing request, and provider state. A commit does not authorize a push; a
   push does not authorize provider writes. Update an existing matching request
   instead of creating a duplicate.
5. Build the title and body from the verified diff, repository template, and
   contribution policy. Report relevant change summary, test and check
   evidence, skipped checks with reasons, compatibility or migration impact,
   and task-scoped security review. Never invent successful checks.
6. Before and after an authorized external mutation, verify the provider
   response and report the bounded public identifier or link, base/head, state,
   checks, and remaining blockers. Redact credentials, tokens, private
   repository content, personal paths, environment values, and unrelated
   diagnostics.

Stop after the requested pull-request outcome. Do not invoke another workflow,
publish a release, broaden authority, or fabricate commands for a missing
provider.
