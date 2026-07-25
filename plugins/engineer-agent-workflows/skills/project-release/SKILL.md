---
name: project-release
description: "Prepare, publish, verify, or recover a release when the user explicitly requests release work. Require a confirmed SemVer, discover repository policy, verify artifacts and trust evidence, and separate preparation from publication."
disable-model-invocation: true
user-invocable: true
---

# Project Release

Use this workflow only for an explicit request to prepare, publish, verify, or
recover a release. Treat local preparation, commits, pushes, tag operations,
publication, and destructive recovery as separate authority boundaries.

1. In Codex, read the nearest applicable `AGENTS.md`; in Claude Code, read
   applicable `CLAUDE.md`. Inspect task-scoped repository guidance, release
   policy, history, remotes and provider state, version sources, compatibility
   rules, change records, build and test definitions, artifacts, signing,
   provenance, and recovery conventions. Do not invent absent machinery.
2. Require a user-confirmed exact SemVer and an explicit stable or prerelease
   classification before changing release state. A suggestion is not
   confirmation. Classify compatibility with the repository's policy and
   require every authoritative version-bearing artifact to agree. Invalid,
   absent, conflicting, or floating versions block the release.
3. Preparation may change only authorized local release files and produce
   declared artifacts. It does not authorize a commit, push, tag, or
   publication. Run the repository-defined format, test, security, build, and
   packaging checks for the supported targets; record unrun or unavailable
   evidence rather than claiming success.
4. For each declared artifact, generate and verify a SHA-256 checksum against
   the final bytes. Keep package-registry integrity, source revision identity,
   artifact checksums, provenance, and project tag signature as separate trust
   statements; none substitutes for another.
5. A stable release requires the repository-formatted SemVer tag to be created
   and signed by a human. Verify its signature, target source revision, and
   immutable identity before publication. Automation may verify the confirmed
   version but must not invent or advance it or replace the signed tag with an
   unsigned tag. Never publish from an unbound moving reference.
6. Publication requires separate explicit authority plus current provider
   evidence, successful required checks, and sufficient permissions. Where
   repository automation uses third-party actions, require immutable
   full-revision pins and least privilege: read-only by default and release
   write access only in the selected release job.
7. Verify the published version, source, tag signature, artifacts, checksums,
   provenance, and release notes. Recovery preserves published evidence.
   Never delete, overwrite, or retarget a published tag or release without
   explicit destructive authorization and provider evidence; prefer a
   repository-supported follow-up release.
8. Report mode, confirmed version and classification, repository-derived
   policy, checks, trust statements, authorized mutations, published state, and
   residual blockers. Keep output bounded and redact credentials, signing
   material, private paths, private repository content, environment values, and
   internal diagnostics.

Stop after the requested release outcome. Do not invoke another workflow,
broaden authority, create signing material, or fabricate provider commands.
