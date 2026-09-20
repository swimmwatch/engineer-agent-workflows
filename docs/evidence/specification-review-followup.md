# Specification Review Followup Evidence

Date: 2026-09-13. Scope: the approved corrections-only review extension.

## Ownership and baseline

The user selected local detailed rechecks plus a fresh whole-specification
consistency assessment, only for findings corrections at unchanged confirmed
scope. The implementation retains the existing journal and stores immutable,
content-addressed review inputs beside each specification. No full dependency
graph, database, archive cleanup, global installation or client migration was
added. Historical completeness qualifications remain in
[specification-completeness.md](specification-completeness.md).

Baseline HEAD: `7c41caa5a19922580c426a312fb7691935773b78`.
The worktree already contained unrelated and overlapping uncommitted changes.
Relevant pre-change files were copied to the persistent ignored directory
`artifacts/review-followup/.baseline-GdoFXV`. No baseline files were deleted.
Synthetic model/benchmark artifacts and actual tool logs are retained under
`artifacts/review-followup/.trial/`; they are private local evidence, not packaged
files or repository fixtures. Protected real workflow YAML was not manually
rewritten or migrated by this extension.

## Checkpoints and observed regressions

1. The first stdio regression failed because new full reviews did not save input
   snapshots. Snapshot creation, exact-byte deduplication, integrity checks and
   optional journal references made that behavior pass.
2. The corrections flow initially lacked its scenario tools. Tests then exposed
   loss of global findings in the next cycle, duplicate whole-spec reading and
   eligibility after new original instructions. Dedicated change/start/expand/
   consistency operations now preserve findings, record the context verdict with
   the single consistency assessment and reject source-meaning changes.
3. Additional discriminating regressions exposed completion after archive loss
   and expansion retaining an earlier context verdict. Completion now validates
   the provenance chain; expansion withdraws both global/context evidence.
   Canonical skills route to a selectively loaded followup reference. Both host
   artifacts were regenerated; no separate hand-edited host implementation exists.
4. Regression and independent synthetic reviews qualified the bounded result.
   No missing or inaccessible check was counted as passed.

The new stdio suite covers local corrections and attributed reuse, exact archives
and corruption, line-only movement, unexplained changes, linked impact expansion,
observer reads/no-write resume, genuine conflicts, exact retries after restart,
missing/symlink archives, global findings across cycles, new customer input,
archive loss before completion, expansion after consistency, and a failed journal
write after archiving. The latter leaves no journal reference and safely reuses
the orphaned snapshot after the fixture environment is repaired.

## Automated verification

- Full root `npm test`: **273 passed, 0 failed, 0 skipped**, approximately 150 s.
  This includes MCP, packaging and repository tests.
- Focused completeness/protocol baseline: **26/26** passed.
- Focused concurrency/followup intermediate check: **14/14** passed.
- Latest focused followup/packed-artifact check: **12/12** passed.
- Root lint, foundation validation (**13/13**), both-host generation,
  `generate:check`, size constraints, affected Codex specification-skill validator
  and `git diff --check` passed.

Intermediate failures were not hidden: the packed-artifact exact inventory needed
the three new runtime modules; lint required an explicit URL import. An initial
root run discovered copied tests in the non-hidden baseline directory and failed
on their absent build output. That owned run was interrupted and the same baseline
was moved to a hidden ignored directory. The subsequent complete root run passed.
After final documentation corrections, generation/check, foundation and the
affected skill validator were repeated; the production code was unchanged.

## Independent model trials

Each checker received a fresh context, the generated reviewer guidance, synthetic
current specification and an actual stdio MCP bridge. The checker was not told
the anticipated defect, expected verdict or implementation fix. The author had
already prepared the correction set; this qualifies the followup checker, not a
new end-to-end author-interview campaign. The bridge saves each successful returned
context automatically. Explicit stale contexts and no-write behavior are tested
separately by the automated two-client suite.

| Trial | Observed result | Saved evidence |
| --- | --- | --- |
| case-a | reviewed / consistent, 9/9; five carried, three detailed, one global check | review `7b6bd881-a00c-4605-9740-aee5afd5f0d9` |
| case-b | gaps / conflict, 9/9; expansion reduced carried results from five to three | review `c99b8916-4466-4e52-9c22-a7109692e5ff` |

Case A accepted the correction requiring exit 2 for an empty name while successful
requests retain exit 0. Case B independently found that the unchanged EXIT-001
instead required exit 0 for all requests, expanded the review to the requirement
and its source, and recorded the contradiction without changing the specification.
The deliberately failing acceptance outcome is successful defect detection, not
an outstanding implementation failure. One case-B `decision_get` call used the
wrong input key, returned `INVALID_INPUT`, and succeeded after using the published
`decision_ref` field; this is not a zero-error interaction claim.

Actual calls and final status are in `.trial/case-a/calls.jsonl` and
`.trial/case-b/calls.jsonl`. Final saved/current source versions matched:

- case-a: `3ba816cd5fe664fbbffc9cc238f22371704bceb60d28cdf398135813f67bfd6c`
- case-b: `ab8d6af9362e9ce2946ceb53e3e7700b56a35e42c930635a191767b5466cf67e`

## Bounded efficiency measurement

The deterministic benchmark reviews the same current inputs with the same
status-driven algorithm; followup figures include change preparation and start.
Results are preserved in `.trial/benchmark/benchmark.json`.

| Measurement | Followup | Full review |
| --- | ---: | ---: |
| MCP calls | 19 | 33 |
| Response bytes | 52,712 | 85,019 |
| Tool execution time | 1,063 ms | 1,653 ms |

This is one small fixture. Tool time excludes process startup and model reasoning;
the figures do not establish a general latency improvement or token-cost ratio.
Global consistency remains mandatory even when most detailed results are inherited.

## Limitations and operational boundaries

### Review correction: explicit full-review recovery

The subsequent code review reproduced a missing escape path: ordinary start
resumed an unfinished followup with five inherited results, including when a
missing archive prevented completion. Two new stdio regressions first failed
with INVALID_INPUT for the explicit recovery request.

`specification_review_start` now accepts optional `mode: "full"`. It replaces an
unfinished followup with a new full inventory and no verdicts. It still resumes
an unchanged unfinished full review; omitting mode preserves existing no-write
resume and the original idempotency input shape. History is retained. Recovery
recreates missing current snapshots from intact sources without relying on the
old archive chain; corrupt objects remain protected against overwrite.

The focused followup/concurrency suites passed 18/18. Coverage includes default
no-write resume, zero inherited results, full-mode resume, exact retry after
server restart, missing archives and completing the independent full inventory.
The final root suite additionally checks a stale client's full-mode request
returns CONFLICT without writing. Lint, generation/check, foundation validation,
the affected Codex skill validator and diff whitespace checks passed.
Final full-suite result: `npm test` passed 275/275, zero failures/skips,
approximately 140 seconds. No new model campaign or global installation was run.

Runtime checks ran on Linux; Windows/macOS were not executed. Path, atomic-write
and symlink protections reuse the existing cross-platform mechanisms. No live
Claude, Penpot, former full model matrix, global installation, commit or publication
was performed. Independent model trials are explicit and outside ordinary tests/CI.
The repository's amended normative specification has not itself received a fresh
recorded completeness review; historical review hashes are not presented as current.

Snapshots are immutable evidence, not editable sources. Missing/corrupt historical
archives prevent reuse. A full review can proceed from intact current inputs, but
an invalid object already at the exact target content hash is never overwritten:
it requires explicit storage investigation, not automatic repair. No additional
power-loss guarantee beyond existing filesystem behavior is claimed.
