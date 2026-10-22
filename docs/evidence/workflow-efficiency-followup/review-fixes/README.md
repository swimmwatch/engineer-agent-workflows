# P03 Review Corrections

Status: Complete. This is a new assessment revision of retained native captures,
not a new model trial. Production MCP code and generated skill bundles are unchanged.

## Corrections

- `withTrialHome` owns profile copying, execution, client shutdown and authentication
  cleanup. Preparation and shutdown errors cannot bypass deletion of the temporary
  `auth.json`; an unreaped client fails the trial. The original profile and non-secret
  evidence remain intact. Controller setup runs inside this lifetime and records
  preparation failures without requiring model settings to have loaded.
- Startup acceptance requires valid capture intervals for the selected invocation.
  Capture issues now invalidate the evidence instead of being informational metrics.
  Complete retained deliveries are checked against their original invocation bounds.
- Completion-order validation compares readiness request timestamps with the latest
  source/test edit and local test, runner or restoration command. A check that overlaps
  unfinished work is premature. Later valid checks cannot erase a premature attempt.
  This is a bounded fixture adapter, not an arbitrary shell-program analyzer.
  Checklist/handoff bookkeeping and read-back do not reopen implementation readiness.
  One inspected read-only Node snapshot from `retained-candidate-10` is exempted by
  its exact command SHA-256, not by a permissive keyword or script-name match. Any
  alteration loses that exemption; the test includes the complete reviewed command.

## Verification

The initial discriminating run failed eight assertions: interval acceptance,
completion ordering, cleanup after shutdown failure and unreaped-process handling.
The final affected adapter/evaluator set passed **76/76 tests on each of Node.js
22.20.0 and 24.14.0**. Repository validation passed (17/17 skills); whitespace
validation and controller syntax checks passed. Commands and outputs are retained
in [checks.json](checks.json). The full production matrix was not rerun because no
production code, workflow instructions or generated bundle changed.

Four isolated mutations disabled interval validation, completion-order validation,
authentication removal or unreaped-process rejection. Every mutation failed the
relevant assertions, without modifying canonical files; see
[mutations.json](mutations.json). Cleanup tests use dummy authentication only.

## Retained capture reassessment

[agent-results.json](agent-results.json) and its independently hashed trace/outcome
files contain nine selected evaluations. Seven pass: normal baseline/final candidate,
product final candidate, both retained-context variants, lost-text final candidate,
and resume final candidate. Original raw-capture hashes remain identical.

- `product-baseline-3` now fails completion order: its final `node --test` began
  after a readiness request. It remains a descriptive historical timing/input
  comparison, not evidence that the baseline met the corrected ordering rule.
  Functional outcomes and measured input bytes are unchanged.
- `product-candidate-17` remains failing evidence for duplicate checks and now also
  fails completion order. `product-candidate-18` passes the corrected assessment.

No model trial, credentialed execution, installation, commit or publication was
performed for these corrections. The original Linux/runtime qualification applies
to its recorded production snapshot; [source-inputs.json](source-inputs.json) binds
the corrected adapters used for this reassessment. Historical source manifests and
failed runs were not overwritten. P04 remains outside this work.
