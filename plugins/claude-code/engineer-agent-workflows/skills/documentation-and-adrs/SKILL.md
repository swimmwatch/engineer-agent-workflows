---
name: documentation-and-adrs
description: "Write or revise technical documentation or an architecture decision record when the user explicitly requests it. Ground claims in repository evidence, distinguish current from proposed behavior, and record settled trade-offs."
disable-model-invocation: true
user-invocable: true
---

# Documentation And ADRs

Use this workflow only for an explicit request to create or revise technical
documentation or an architecture decision record. Establish the requested
audience, artifact, authority, and boundaries before editing; do not turn
routine implementation notes into durable documentation.

1. Use project instructions already supplied by the host; do not reread their
   source files solely to recover context. Read an additional task-scoped
   `CLAUDE.md` only when it is not already in the active
   context or the file itself is in scope. Inspect the
   target, established documentation
   structure, task-relevant code, public interfaces, configuration, tests,
   release evidence, and settled decisions. Reuse repository terminology,
   ownership, links, and command syntax; do not invent project facts or tools.
2. Classify every material claim as `current`, `proposed`, `experimental`,
   `deprecated`, or `unknown`. Current claims require repository evidence.
   Never present planned, unverified, or experimental behavior as shipped, and
   preserve historical statements that are clearly labeled.
3. Update the nearest authoritative document and remove contradictory duplicate
   claims only within scope. Document relevant inputs, outputs, defaults,
   limits, failure and recovery, compatibility, security, operations,
   migration, and support boundaries without exposing unstable internal detail.
4. For an ADR, first confirm the repository supports ADRs or the user accepts a
   local ADR choice. Follow its established convention. If none exists, propose
   the smallest visible local structure and obtain an explicit choice before
   creating a repository-wide convention. An ADR records only a settled
   decision and includes status, decision date, context and forces, decision
   and scope, alternatives and material trade-offs, positive and negative
   consequences, relevant compatibility/security/operations/migration effects,
   revisit or reversal conditions, and unresolved follow-up.
5. If a material decision remains unresolved, stop with the missing decisions
   instead of fabricating consensus. Otherwise verify links and safe commands
   when authorized; label checks `not run` or `unverified` when evidence is
   unavailable.
6. Report the authoritative artifact, claim classifications, evidence, exact
   changes, checks, and remaining unknowns. Keep content and diagnostics bounded
   and exclude secrets, private paths, user answers, personal data, and
   unrelated source content.

Stop after the requested documentation artifact. Do not rewrite code,
configuration, release artifacts, unrelated prose, invoke planning or
implementation, install, or publish.
