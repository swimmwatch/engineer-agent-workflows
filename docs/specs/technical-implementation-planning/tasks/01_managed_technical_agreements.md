# P01: Managed Technical Agreements

Status: Complete — initial implementation and review fixes verified on 2026-10-21.

## Outcome and inputs

Implement the runtime contract in `plan.md` / `Shared technical proposal` so
technical choices have durable provenance and task freshness without invalidating
unchanged requirements. Requirements: TIP-004, TIP-007–009; runtime portions of
TIP-001, TIP-005–006 and TIP-010. Read these exact requirement sections through
MCP, not the entire journal.

Pinned specification inputs:

- `source_version`: `a46e18b6e78751f8a41ecc662ee507f7b7475e994c9111051d5b1eff3e3b000b`.
- `specification_version`: `a1a2739ae5c8d4ea86cac096da0e84cb5b86ded0f6b09081ca4d01873ae23967`.
- `review_ref`: `a1421d0b-f37b-4b76-a7ca-2a84de7066f3`.

Prerequisites: an explicit invocation authorizing P01, agreement to this packet
and the shared runtime proposal, the resolved bootstrap method, usable Git,
Node/npm and installed repository dependencies. Check status/staged/untracked
changes and the current spec version before editing. No clean tree or commit
is required. No server installation or active-client configuration change is
authorized; test the repository runtime through isolated subprocesses.

## Technical proposal

Adopt the isolated `planning_decisions` section and the six scenario interfaces
defined in `plan.md` / `Shared technical proposal`. Implement ordinary functions
in the proposed `src/planning.ts`, reusing existing transaction, source-reader,
error and bounded-response owners. Add the strict optional section to the root
`shared/schemas/decisions.schema.json`; generate copies, do not hand-edit them.

Keep the old `decisions` array and its existing review hash/inventory unchanged.
No category-name inference, bulk relabeling or generic purpose-filtering change
is permitted. Technical writes still refresh the physical opaque context.
Question preparation freezes exact source sections and approved specification
pins. Answer recording preserves the real answer and accepted proposal mapping.
Readiness compares the exact accepted proposal with current sections and task
membership. A shared-source change invalidates every affected consumer while
an independent task remains eligible. No-answer/partial-answer handling retains
the unresolved tasks. Changed technical choices require a new answer.

Keep immutable proposal snapshots in the managed history; do not maintain a
second editable technical document. Semantic conformance remains a skill
responsibility, explicitly distinguished from structural checks.

## Allowed changes and evidence

- New `packages/engineer-agent-workflow-mcp/src/planning.ts` and focused tests
  `test/planning-decisions.test.mjs`, `test/planning-packet-check.test.mjs`.
- Existing `src/server.ts`, `src/metadata.ts`, and minimal shared read-only
  eligibility extraction in review modules only if needed to avoid duplication.
- Root `shared/schemas/decisions.schema.json`; exact generated copies under
  skill-local `shared/` and both host plugin outputs via the existing generator.
- Minimal test-support reuse/extraction if the existing stdio fixture is needed
  by multiple real tests; do not introduce a new harness framework.
- This packet's checklist/handoff and necessary runtime-capability fixtures.

Evidence: `src/state.ts:376-443` owns atomic/replay-safe mutation;
`src/review-model.ts:11-28` establishes the preserved behavioral version;
`src/scope.ts:12-29,107-126` establishes revision and actual-answer semantics;
`src/requirements.ts:80-139` provides exact delivery and requirement checks;
`test/completeness.test.mjs:1-70` shows the existing real stdio harness.
Re-verify before editing. No `src/product/` changes or unrelated dirty files.

## Test-first sequence and acceptance

1. Create focused scenario tests first. Build the current runtime and run them:
   `rtk npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp`;
   `rtk proxy node --test packages/engineer-agent-workflow-mcp/test/planning-decisions.test.mjs packages/engineer-agent-workflow-mcp/test/planning-packet-check.test.mjs`.
   These test files are to be created, not existing commands with existing tests.
   Record the actual RED; a missing tool requires later PROVE.
2. Use temporary fixture projects and real stdio calls. Establish an actual
   simulated reviewed specification using the current fixture protocol. Prepare
   one shared proposal, two dependent tasks and one independent task. Exercise
   positive, partial, rejected, dismissed, custom, repeated and resumed answers.
   Check exact question/answer read-back and task-specific readiness.
3. Test source-section edits, unrelated handoff edits, unknown/foreign/stale
   references, duplicate or missing headings, unsafe/symlink paths, source changes
   during writes, invalid selections and response limits. No failed call may
   produce a new accepted revision or silently change protected files.
4. Assert the behavioral `source_version`, review reference and approval remain
   unchanged after technical prepare/answer/no-answer/revision. Assert the physical
   context changes. A real behavioral decision or spec amendment still makes the
   old review stale. Legacy decisions retain their original semantics. An old
   runtime never reports support for the new tools.
5. Implement GREEN. Apply PROVE by making technical records influence the
   behavioral snapshot and by bypassing a proposal-digest/task-membership guard,
   one mutation at a time. The relevant assertions must fail; restore each edit.
6. Run focused tests plus existing regression coverage:
   `rtk proxy node --test packages/engineer-agent-workflow-mcp/test/completeness.test.mjs packages/engineer-agent-workflow-mcp/test/completeness-protocol.test.mjs packages/engineer-agent-workflow-mcp/test/review-concurrency.test.mjs packages/engineer-agent-workflow-mcp/test/review-followup.test.mjs packages/engineer-agent-workflow-mcp/test/tool-metadata.test.mjs packages/engineer-agent-workflow-mcp/test/packed-artifact.test.mjs`.
   Run `rtk npm run generate`, inspect its scoped output, then
   `rtk npm run generate:check` and `rtk npm run lint`.

Acceptance is the observed scenario results, actual retained history, unchanged
behavioral freshness and discriminating mutation failures. A test merely reading
fixture expectations is insufficient. New scenarios must advertise bounded
metadata and appear in `workflow_runtime_info` for the built fixture runtime.

## Completion and recovery

On a stale spec, return to its owner. On a material design conflict, stop for
planning; do not silently change the six interfaces or storage ownership.
Preserve incomplete work and exact failed checks. Review the final diff against
the agreed proposal, recheck pinned specification inputs, update only P01 and
current handoff, and stop. Installed MCP capabilities may remain old; report
that explicitly without updating global configuration.

## Agreement evidence

Agreed on 2026-10-21 through the repeated `functions.request_user_input` question
`runtime_architecture`. Exact question: «Для P01 какой вариант хранения и
проверки технических согласований выбираем?» Exact answer:
«Отдельный раздел (Recommended)».

Coverage: this packet's `Technical proposal` and `plan.md` / `Shared technical
proposal`, including the isolated `planning_decisions` section, six scenarios,
ordinary functions and source-section freshness checks. The first call returned
no answers and granted no agreement; the repeat was explicitly user-requested.
See `plan.md` / `Technical agreement` and `Bootstrap recording limitation` for
the exact provenance and one-time Markdown-only recording authorization.
Agreement does not authorize implementation.

## Implementation and verification evidence

This section records the initial slice before the subsequent code/security
review. The current correction evidence is under `Review fixes and verification`.

The later explicit `incremental-implementation` invocation authorized P01.
Implemented the six `planning_*` scenarios in `src/planning.ts`, optional strict
`planning_decisions` v1 in the existing journal schema, native question/answer
provenance, exact immutable proposal snapshots and packet-specific readiness.
Partial answers retain earlier covered tasks. Shared source drift invalidates
dependent agreements; unchanged independent commitments remain reusable.
Unsafe/ambiguous sources, inconsistent snapshots, stale writes and invalid
selections cannot create accepted revisions. The cumulative source snapshot
limit is 128 KiB, with the boundary accepted and the next byte rejected in tests.

Reused `state.ts` transactions, dependency guards, receipts and bounded delivery.
Extracted `specificationState` in `checks.ts` so both consumers use the same
eligibility calculation. `reviewState` retains its default checkpoint behavior;
planning calls its read-only path. The behavioral snapshot formula is unchanged.
Updated public field metadata and the package's expected module list. Generated
all schema copies through the existing generator; canonical skill instructions
remain for P02. No new dependency, installation or global configuration change.

Verification completed:

- Runtime build passed. Final focused/regression command: 70 tests passed,
  zero failed, including 16 new planning tests, completeness, review concurrency,
  review followup, tool metadata and the real packed-artifact check.
- `rtk npm run generate:check`, `rtk npm run validate` (17/17 skills),
  `rtk npm run lint` and `rtk proxy git diff --check` passed.
- Initial RED exposed missing scenarios/module. A separate behavioral RED then
  demonstrated that altered historical snapshot text was wrongly readable;
  snapshot validation fixed that defect. The resume fixture was corrected to
  omit unsupported context from `specification_open`; standard
  `multiple_choice` and selected-only answers are covered without invented text.
- Nine isolated PROVE mutations triggered the intended assertions: behavioral
  freshness, proposal digest, blank-answer consent, source scope, concurrent
  source guard, source freshness, accepted membership, legacy eligibility and
  read-only eligibility. All mutated runtime files were restored. The three
  final affected tests passed again, and runtime identity was verified.
- Built runtime identity: `f2ceed66b640e72c722f9c5c1cad0e284b697dd4335b3b36edf8c211dc9c8d65`;
  all six planning capabilities advertised. The preserved baseline runtime
  identity is verified and advertises none of them.
- Final managed specification check returned `pass`, `approved`, `reviewed`,
  no issues, unchanged pinned versions/review and no new approval checkpoint.

The pre-change source and built runtime are preserved under ignored
`.cache/technical-implementation-planning-baseline/`, based on
`c1f55dcffccf1aa3bb325745114e40bf80a8053d`, with 333 input hashes and runtime metadata.
Unrelated dirty/untracked work was excluded. Local normalized mutation evidence
is `.cache/technical-implementation-planning-prove.json`. These caches are not
release artifacts and must remain available for P03.

The scoped diff matches the agreed function-based module, six scenarios and
single-journal design. Active installed MCP/skills were not refreshed. Actual
Codex workflow trials and the speed/quality benchmark belong to P03 and have
not run. No commit or publication was made. P02 is the next separately invoked
packet; this invocation stops after P01.

## Review fixes and verification

The user's explicit instruction, «Исправь найденные замечания.», authorized
bounded rework of P01 after the read-only review. All three findings are fixed:

- A selected empty-binding option withdraws the question's proposal agreements.
  Optional `rejected_proposal_ids` supports exact custom withdrawals without
  guessing from prose. Rejection keeps immutable history and unrelated bindings;
  a later acceptance receives a new reference. Invalid/mixed selections and
  attempts to replace an active alternative without revision fail atomically.
  The answer schema field is optional for existing histories.
- Packet authority follows its latest prepared question, independently of
  later answers to another task in an older group. Repreparing a shadowed
  question cannot inherit its obsolete agreement; unaffected current agreements
  remain reusable. This uses the existing preparation history, not another store.
- Unique input Markdown files have a cumulative 1 MiB budget. `readDependency`
  passes the remaining budget to the existing `readBytes` owner; it checks file
  size before buffer allocation and parsing. Other callers retain the default
  16 MiB file limit. Repeated sources count once; the existing 128 KiB snapshot
  limit remains separate. Tests cover both exact boundaries and invalid UTF-8
  over the remaining budget.

Readiness also recognizes explicit recorded rejection options in journals
written by the earlier implementation, even when a later answer kept the stale
binding. This check does not edit or migrate history, and a valid newer acceptance
for another task remains eligible. Arbitrary prose is not classified as consent.

Verification:

- Five new cases observed RED before implementation; two additional checks
  exposed active-alternative and shadowed-question reuse defects before their
  fixes. Existing checks were preserved.
- The broad scoped regression command passed 95 tests, including shared reader
  workflow/conflict coverage. An additional old-writer history case was added.
  After the final read-side correction, both planning suites, metadata and the
  real packed-artifact check passed again: **31 tests, zero failures**. There
  are 96 distinct passing tests across these runs; unaffected earlier results
  were reused rather than rerunning their unchanged behavior.
- Additional shared-reader command:
  `rtk proxy node --test packages/engineer-agent-workflow-mcp/test/workflow.test.mjs packages/engineer-agent-workflow-mcp/test/review-conflict-causes.test.mjs`.
  Final affected command:
  `rtk proxy node --test packages/engineer-agent-workflow-mcp/test/planning-decisions.test.mjs packages/engineer-agent-workflow-mcp/test/planning-packet-check.test.mjs packages/engineer-agent-workflow-mcp/test/tool-metadata.test.mjs packages/engineer-agent-workflow-mcp/test/packed-artifact.test.mjs`.
- Eight new isolated PROVE mutations were caught: revocation, packet authority,
  shadowed reuse, cumulative byte budget, active-alternative protection, foreign
  rejection IDs, preallocation limit and old-writer rejection history. All
  originals were restored. The legacy fixture initially emitted YAML aliases;
  its copied test objects were corrected without relaxing the alias prohibition.
  The final history mutation failed specifically on `ready` versus `stale`, and
  the restored test passed.
- Runtime build, lint, generated-resource check, 17/17-skill validation and
  scoped diff checks passed. Current runtime identity is verified:
  `7746f65884c283fb1dba97c68b4755039114c7ffc3f1687c8d9da839308157dc`.
  All six planning capabilities remain available.
- Managed specification remains `pass`, `approved`, `reviewed`, with unchanged
  pinned inputs and no checkpoint write. Local correction-mutation evidence:
  `.cache/technical-implementation-planning-review-fixes-prove.json`.

The original benchmark baseline is retained. P02–P04, actual Codex trials,
installation, commits and publication were not executed by this rework.
