# Packet 14: Workflow Forward Testing And Bounded Execution

Requirements: SPEC-001, PLAN-001, PLAN-002, PLAN-003, EXEC-001, EVAL-001,
TEST-001, INT-001, TOK-002, HOST-001, HOST-002, DOC-001, ACC-008, ACC-009.

## Outcome

Make adaptive specifications and plans sufficient for an independent executor,
then verify their behavior through an iterative isolated agent loop. Incremental
implementation executes one authorized packet without a mandatory review or
commit transition gate. This corrective packet does not start Packet 10.

## Prerequisites And Scope

- The user explicitly authorized the complete loop and selected host/model roles.
- Preserve the dirty baseline and historical Packets 02, 03, and 13.
- Approved specification and confirmed scope remain authoritative; append new
  decisions without replacing history.
- Change only the three workflow contracts and references, model recommendations
  in the existing renderer and review entrypoints, related tests and evidence,
  and their documentation/generated outputs. Add no workflow identity.
- Do not install globally, change real host settings, commit, publish, or claim
  complete host compatibility. Native discovery and platform floors remain
  Packet 10 work.

## Ownership And Inputs

- Specification owns complexity triage, confirmed profiles, behavior and
  acceptance. Its registry is candidate routing, not a mandatory file list.
- Planning owns contracts, architecture and the task packet interface in
  `skills/planning-and-task-breakdown/references/task-packets.md`.
- Incremental consumes the current packet and selected source sections; its
  conditional recovery reference separates failures and escalation paths.
- `scripts/lib/distribution.mjs` owns host-specific model recommendations.
  Authoritative workflow text stays in `skills/`; generation owns installed text.
- `tests/fixtures/workflow-loop/` owns non-sensitive simulation cases;
  `tests/lib/workflow-evidence.mjs` checks trace consistency, not truth by itself.
  Real behavior requires inspectable runs and independent acceptance/review.

## Implementation And Verification Order

1. Snapshot current relevant source including uncommitted changes; run the
   focused specification/planning/incremental baseline before modifications.
2. Run realistic baseline scenarios in temporary workspaces and record actual
   questions, reads, outputs, checks and failures. Discard contaminated runs.
3. Establish failing regression checks or a reproducible behavioral case before
   each narrow correction. Do not convert failed expectations to passed evidence.
4. Update owning instructions, regenerate both hosts, rerun the failing case
   in a fresh context, then check regressions and external review findings.
5. Repeat until two full passes use the same frozen source without a correction
   between them, and new Lite and UI/API Codex holdouts also pass.
6. Record limitations honestly. After two ineffective corrections to one cause,
   discuss the approach with the user rather than accumulate speculative rules.

Each native stage names its exact generated skill source and allowed fixture
roots, including on resume. Synthetic customer replies are authoritative within
the fixture only and follow actual questions. No global history or unrelated
project is a permitted source. Implementation uses Terra in Codex and Sonnet in
Claude; source authoring and separate reviews use the agreed stronger models.

## Acceptance

- Lite does not add a separate core contract without a concrete need.
- Confirmed profiles alone select references, in both specification and planning.
- Task packets identify sources, boundaries, dependencies, exact verification
  actions and outcomes without leaving product/architecture choices to execution.
- Incremental distinguishes wrong implementation, wrong checks, stale contracts
  and environment failures; correct checks are never weakened.
- One packet completes from passed checks; another requires a new explicit
  invocation and real prerequisites, not optional review or commit.
- Full/holdout and adversarial trial requirements in EVAL-001 are evidenced,
  including actual models, fresh contexts and independent executable acceptance.
- Generated host recommendations contain no opposite-host names or unresolved
  variables, remain advisory and meet existing size/discovery constraints.

## Commands

Run from the repository root:

```bash
node --test tests/specification-skill.test.mjs tests/planning-skill.test.mjs tests/incremental-skill.test.mjs tests/host-model-roles.test.mjs tests/workflow-evidence.test.mjs tests/captured-evidence.test.mjs
npm run generate
npm test
npm run validate:foundation
npm run generate:check -- --allow-incomplete
git diff --check
```

Use `skill-creator` quick validation on the changed generated Codex skills.
Canonical templates retain intentionally cross-host frontmatter. Model trials
are opt-in; the ordinary test command must not start remote model sessions.

## Current State

Implementation and empirical validation resumed by explicit user request on
2026-09-05. The pause checkpoint is preserved outside the repository. See
[current qualification evidence](../../../evidence/workflow-qualification.md),
[historical evidence](../../../evidence/workflow-loop.md), and the
[preserved checkpoint pointer](handoff.md). Do not mark this packet complete
before its behavioral matrix and final
deterministic checks pass.

After completion, update the current handoff and stop. Packet 10, commits,
installation and publication remain separately authorized actions.
