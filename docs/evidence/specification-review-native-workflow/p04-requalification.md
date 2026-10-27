# P04 Requalification After Access And Oracle Audit

Status: PASS for the authorized affected-acceptance rework. All four cases ran
through the ready native workflow in isolated Harness rc.2 with actual
`openai-codex / gpt-6.1-sol / xhigh` actors. This replaces the acceptance
claim in [the original report](p04-qualification.md), while retaining its measurements.
P05 document-reader acceptance remains recorded and was not rerun.

## Repairs And Quality Gates

- Every judge receives required scope, requirement and decision MCP reads.
  A scoped monotonic guard prevents detailed/final writes before successful
  scope consumption. Managed YAML and review archives are denied through
  physical-path checks, including symlink and traversal aliases; independent
  session-event auditing must be complete and show zero forbidden successes.
- Expensive MCP initialization is explicit and each invocation freezes one
  private complete server artifact. A fresh owned process verifies its identity;
  fixture authors, judges and observers all use that entrypoint and verify its
  expected build. Concurrent shared builds cannot change an active invocation.
- The parent may execute only the supplied canonical launch program. Native
  PTC visibility rejects model-direct MCP calls before their bodies. PASS also
  requires observed paired workflow starts/ends and zero parent model steps
  while waiting. No inspection or verdict-writer actor is introduced.
- Twenty-six fully defined operation contracts replace vague placeholders.
  Clean/omission twins share the exact source corpus and differ by the retained
  CLI-001 empty-input rejection clause. Private oracles check actual acknowledged
  complete detailed results and concrete JSON behavioral witnesses. Conflict also
  requires the acknowledged final witness for the seeded contradiction. Labels,
  keywords, unrelated findings, missing results or free prose cannot prove it.

## Actual Workflow Acceptance

| Case | Saved outcome / consistency | Items | Review seconds | Model requests |
| --- | --- | ---: | ---: | ---: |
| native-clean | reviewed / consistent | 56/56 | 544.297 | 72 |
| native-omission | gaps / gap | 56/56 | 454.360 | 63 |
| native-paraphrase | reviewed / consistent | 6/6 | 225.568 | 23 |
| native-conflict | gaps / conflict | 8/8 | 258.502 | 26 |

Accepted review timers sum to **1482.728 seconds**.
The runner records setup separately; both completed invocation timers, including
the blocked attempt described below, sum to **1508.354 seconds**.
These are observed timers, not inference-only measurements or a new speedup.

All accepted actors consumed scope before writing. There were zero forbidden
filesystem successes, scope-order rejections, parent-program rejections or
parent polling steps. One attempted managed-file read in the clean case was
denied and the judge continued through MCP. Conflict had one recoverable
`INVALID_INPUT` for an unsupported detailed verdict; MCP rejected it and the
actor corrected it before saving. No validation was relaxed.

The conflict run deliberately interrupted the workflow after seven detailed
saves. Fresh preparation observed zero remaining detailed items. A new native
invocation ran only final judging, saved the concrete contradiction, and finished
8/8 items. Actual trace inspection found **zero detailed submission calls after
the interruption**. Two starts/ends and one cancellation/resumption were observed.

## Retained Failures And Bounded Retry

The first repaired clean attempt aborted safely when a concurrent shared build
changed MCP identity before final judging. It saved 55 detailed items but is
not accepted. Its observed trace span was 319.823 seconds;
40 model requests, 1,217,326 input tokens and 63,354 output tokens are retained.
That span excludes unobserved setup and is not a complete invocation timer.

With snapshot isolation, the large clean and omission cases passed. The next
paraphrase attempt was blocked before workflow launch: the model substituted
paginated `tools.read` reconstruction for the fixed artifact loader. This would
lose the trailing newline, so the exact-program guard correctly rejected it.
The attempt consumed 17.410 seconds and two model requests.
Launch wording was clarified without changing the allowed program, workflow,
guard or oracle. Only paraphrase and conflict were then launched afresh; the two
successful large cases were retained. The failed invocation remains `fail` in
the structured record; case-level acceptance never turns it into a passed run.

The two successful twin cases share build `fa979a48f90f11c50fa6e0aaa99d94917ab76c84e5192a8f60695c6830b5f9de`.
The remaining-case invocation uses `bfa3d4a9a0d6f33bc1f27f35ea319ddbb2e64aeb4b9ad891080cb34b37d75304`.
Each invocation is internally coherent. Between those snapshots only
`packet-review-inputs.js` and `runtime-info.js` executable files changed due to
unrelated concurrent work; specification-review executables were identical.

## Verification And Completion

Seventy focused checks and all 67 regression checks passed. One native-validator
check initially lacked its opt-in module; it then passed separately with that
prepared module. All **39 deliberate-defect controls** were detected and restored:
7 access, 10 omission/report, 5 conflict/scope/entrypoint, 8 worker, 6 snapshot and
3 foreground-report controls. Independent inspection found no remaining confirmed
defect. The engineering-manual verifier and Git-worktree check passed.

Final MCP checks returned `pass` for the Approved/reviewed specification and
`ready` for P04 proposal `P04-harness-parent-await-metrics-v5`, agreement revision
10, without issues. Exact unchanged bindings and source hashes are in the
[structured evidence](p04-requalification-result.json); opaque contexts and raw
sessions remain private.

The owned credential symlink/home and 304 owned peer symlinks were removed;
their dependency targets and real credential file were retained. No fixture
project remains. No template, generated installation, global configuration,
commit or publication was changed by this rework. Unrelated concurrent work was
preserved. No required P04 action remains.

## Interpretation Limits

The old [historical comparison](historical-comparison.md) retains measured
37.06% elapsed-time reduction under its original inputs/gates. The new fully
defined corpus has different hashes; do not combine these times into a new
before/after claim. There is no new historical-baseline trial or cost claim.
Provider input includes cached input; cached and reasoning values are subsets.
Unavailable cache-write and lane-idle values stay null. This qualification covers
fixed synthetic witnesses and the isolated rc.2 composition. It does not prove
general semantic correctness, provide an operating-system sandbox or qualify
rc.3/Claude/global installations.
