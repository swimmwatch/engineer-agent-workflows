# Incremental Execution Efficiency Review

Scope: packet context selection, exact source batches, request-local reuse,
start-time input checks, session acknowledgement and affected workflow guidance.
The pre-existing worktree includes unrelated changes; this review does not
attribute the entire HEAD diff to the efficiency implementation.

## Findings and corrections

1. **P2 — Ambiguous planning maps were accepted.** A second JSON block in
   `Product context roots` was silently ignored. The selector now requires exactly
   one JSON block in that section, ending at the next level-one or level-two
   heading. A regression test first reproduced the missing rejection.
2. **P2 — Invalid packet encoding escaped the workflow error contract.** Invalid
   UTF-8 raised `ERR_ENCODING_INVALID_ENCODED_DATA`. The selector now reports a
   bounded `INVALID_STATE` diagnostic without exposing local paths. A regression
   test first reproduced the incorrect error code.
3. **P2 — Equivalent JSON requests invalidated continuations.** Batch and exact
   source identities depended on object insertion order. Identities now sort
   object keys recursively while preserving array order. Tests cover reordered
   nested request fields, decision continuations and exact Unicode element
   reconstruction. Changing request order still fails with `STALE_CURSOR`.

## Security and portability

- Packet roots still pass full task-input validation and inventory checks.
  Frozen generations, source digests, start-time `check_ref` and session
  acknowledgement retain their existing enforcement.
- Generation/document/pin reuse remains scoped to one request. Existing tests
  exercise corrupt retained sources and prevent reuse across requests.
- Packet reads continue through the shared safe-path reader. Added coverage
  rejects a hard-linked packet and verifies that its source bytes remain intact.
- Portable path construction uses Node path APIs; persisted plan paths use `/`.
  Tests cover CRLF, non-ASCII text, supplementary Unicode characters, and a
  workspace name containing spaces, an apostrophe and brackets.
- The existing Linux/macOS/Windows product-qualification matrix is configured
  to run the context and task-pin tests on both configured Node versions. These matrix jobs
  were not executed from this local Linux review. Native Windows/macOS behavior
  therefore remains unverified here.

## Verification

- RED: ambiguous maps, invalid UTF-8 and reordered batch fields reproduced the
  three defects before implementation (`/tmp/eaw-review-red.log`).
- Targeted follow-up: 33 tests passed, zero failed, including storage integrity
  and platform-path vectors (`/tmp/eaw-review-focused-final.log`).
- Linux context/task-pin regressions also passed on Node 22.22.0 and the
  CI-pinned Node 24.14.0: 25 tests on each version, zero failures
  (`/tmp/eaw-review-node22.log`, `/tmp/eaw-review-node24-ci.log`).
- Build, lint, generation freshness, complete validation of all 17 skills and
  whitespace checks passed.
- The CI YAML parses successfully and includes both regression files on the
  existing six OS/Node combinations.
- PROVE: an isolated compiled copy with insertion-order identities failed the
  Unicode element-continuation regression with `STALE_CURSOR`. The temporary
  copy was removed; production files were not mutated
  (`/tmp/eaw-review-prove.log`).
- First repository-wide rerun: 953 passed, 2 failed, 955 total, zero
  cancelled/skipped (`/tmp/eaw-review-full.log`). Besides the missing P03 probe,
  the run had already loaded the new Unicode test before its expected leading
  separator was corrected. The corrected test passed in the targeted follow-up;
  no production source behavior was weakened.
- Final review run before P03 restoration: **954 passed, 1 failed, 955 total**, zero
  cancelled/skipped, approximately 359 seconds
  (`/tmp/eaw-review-full-final.log`). The Unicode regression passed. The only
  failure is the missing P03 probe below; a full-suite pass is not claimed.

## P03 restoration

The earlier full-suite failure came from an absent
`docs/research/workflow-probe-plans/p03/probe.mjs`. The user subsequently
authorized restoration and another test run. The entire source directory was
missing, so its required `rpc.mjs` transport was restored as well. The existing
test was preserved without removal, skips or weakened assertions.

Both files were reconstructed from the chronological source patches in archived
session `01a136b7-a373-7e23-a282-c92aab39c78d`, including its final removal of the
undocumented depth setting. Historical shell commands were not replayed.
Restored source hashes:

- `probe.mjs`: `69f36591bf908740ae1137ccb226cf7df63155179e77929d9734de8006a68cba`.
- `rpc.mjs`: `04080e0d8515e9bf4c7fcca394f71428c098beab59641d19a8573d789e3e890c`.

Both syntax checks passed. The original missing-module failure was reproduced
before restoration (`/tmp/eaw-p03-red.log`); all 26 P03 tests passed afterwards
(`/tmp/eaw-p03-restored-targeted.log`). These tests validate the local fixture;
they do not establish live model or native-host capability acceptance.

The restoration also passed the build, lint, generation-freshness, complete
17-skill validation and whitespace checks.

The final command `npm test -- --test-concurrency=8` passed: **980 tests,
980 passed, zero failed/cancelled/skipped**, approximately 334 seconds
(`/tmp/eaw-p03-restored-full.log`). The missing-module blocker is resolved.
All authorized restoration and local verification work is complete.

No commit, installation, publication, live model experiment or real
product-store mutation was performed.

## Combined pre-push review

After the parallel Roadmap implementation finished, an executable check found
that its table validator rejected a literal inline-code example as a detached
task row. The new regression first failed on the original implementation
(`/tmp/eaw-main-inline-red.log`). Paragraph checks now ignore pipes originating
inside inline code, including nested emphasis. Real detached rows with formatted
task IDs still fail, and rendered table membership still rejects retired tasks.
Both the existing table checks and the new regression pass
(`/tmp/eaw-main-inline-green.log`).

The Roadmap timing evidence remains the measurements recorded by that
implementation before this narrow literal-example correction. No new timing or
live model/UI speedup is claimed by this follow-up.

The combined full-suite run passed: **989 tests, 989 passed, zero failed,
cancelled or skipped**, approximately 245 seconds
(`/tmp/eaw-main-final-tests.log`). Build, lint, generation freshness, complete
17-skill validation and staged whitespace checks passed. The two focused table
regressions also passed on Node 22.22.0. The complete checked source snapshot is
prepared for the user's explicitly authorized commit and push to main.
