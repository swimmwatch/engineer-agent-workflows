# Incremental execution efficiency handoff

Status: Scoped implementation, review and user-authorized P03 restoration
complete. The combined pre-push repository-wide run passed all 989 tests.

## Changes

- Follow-up review corrected ambiguous packet maps, invalid UTF-8 diagnostics
  and JSON field-order sensitivity in batch/source continuations. See
  [review evidence](../review.md) for regression results and platform limits.
- Context/task-pin regressions are configured in the existing six-way Linux/
  macOS/Windows and Node qualification matrix. Native Windows/macOS results
  are not available from this local review.
- The missing P03 probe and required JSONL transport were recovered from their
  archived source patches under the user's explicit restoration instruction.
- Combined pre-push review corrected literal inline-code examples in the new
  Roadmap table validator while retaining detached-row and retired-task checks.
- Exact planning roots in pinned packet Markdown select implementation context;
  absent maps retain the legacy task closure. Full task integrity is unchanged.
- `product_sources_get_batch` reads 1-20 exact sources with bounded responses,
  separate batch/item continuations and request-local integrity reuse.
- Packet selection returns `check_ref`; start rejects changed consumed inputs.
  Frozen execution retains its product generation after a newer ready revision.
- Session acknowledgement validates the same packet context as the direct tool.
- Planning/execution guidance checks local prerequisites early, preserves native
  workflow transitions and external edits, and keeps evidence handoffs compact.
- Both host distributions are generated from the canonical templates/references.

## Verification

- `npm run build`: PASS.
- Focused regression set: 81 tests passed, including context, task pins,
  ownership, storage corruption, published schemas/metadata, instruction reuse,
  completion gates and both generated host bundles.
- Six deliberate defects were detected: changed batch query, lost packet scope,
  ignored start check, excessive result bytes, cross-request cache and incorrect
  packet acknowledgement. Every mutation was reverted; restored builds passed.
- `npm run lint`, `npm run generate:check`, `npm run validate` and
  `git diff --check`: PASS. Generated validation covers all 17 skills.
- Synthetic server measurement: 20 individual reads took 1920 ms; two bounded
  batch pages took 130 ms in the focused run. Later concurrent verification gave
  1986 ms and 210 ms. These samples exclude model comprehension and end-to-end
  workflow time; no total P13 speedup is claimed.
- Follow-up review checks: 33 targeted tests passed; the context/task-pin set
  also passed 25 tests each on Linux Node 22.22.0 and 24.14.0. An isolated
  insertion-order mutation was detected by the Unicode continuation regression.
- Before P03 restoration, the review's full-suite run had 954 passed and one
  missing-module failure out of 955 tests. That blocker is now resolved.
- Full-suite command after restoration:
  `npm test -- --test-concurrency=8`: **980 passed, zero failed**, 980 total,
  zero cancelled/skipped. Evidence: `/tmp/eaw-p03-restored-full.log`.
- Combined pre-push full-suite command after the parallel Roadmap changes and
  literal-code correction: `npm test -- --test-concurrency=8`: **989 passed,
  zero failed/cancelled/skipped**. Evidence: `/tmp/eaw-main-final-tests.log`.

## Limits and checked boundaries

The earlier efficiency implementation left the unrelated untracked P03 test
and missing historical sources unchanged. That missing import caused its
repository-wide test failure; restoration was outside the earlier scope.

No consuming project, real product store, installed plugin or global
configuration was changed. No commit, installation or publication was performed.
The real WellHelm P13 invocation was not repeated.

The user subsequently authorized P03 restoration. Its probe and required
transport were recovered from archived source patches, syntax checks passed,
and all 26 existing P03 tests passed without test changes. The complete
repository-wide rerun also passed. No follow-up remains within this scope.
