# P20: Actionable workflow diagnostics and revision warnings

Status: Ready for one explicit incremental-implementation invocation.

## Outcome and authority

Implement PWF-035–PWF-038 without changing accepted workflow behavior, storage
schemas, context format, or product-schema diagnostics. This packet also preserves
PWF-018, PWF-021, PWF-033, and PWF-034.

Pinned specification evidence:

- `source_version`: `757943679c62c7967e931fb88981736a6e4471ed4ba87078882ae981212d58dd`
- `specification_version`: `26b85020e08d19a98161c15d3207d99ee9cf2868aa413e9a4f6484770e3874f6`
- `review_ref`: `1f1f7b2d-34c4-4d7e-bbf7-31fbb0f756c3`
- MCP preflight: `pass`, coverage `reviewed`, 82/82 items, no gaps or conflicts.
- Contract selectors: `contracts/mcp.md#specification-workflow-diagnostics` and
  quality scenarios Q40–Q43.

Dependencies P16 and P19 are complete. G01 is Approved and reviewed. Execution,
commit, installation, publication, code review, and P21 remain separately
authorized work.

## Repository evidence and boundaries

Reverify these facts before editing:

- `packages/engineer-agent-workflow-mcp/src/api.ts:10` discards Zod issues and
  returns one generic `INVALID_INPUT` error.
- `packages/engineer-agent-workflow-mcp/src/state.ts:39` owns workflow errors;
  `state.ts:128` already exposes schema paths/rules for saved-artifact failures;
  `state.ts:299` owns locking, conflict detection, no-op handling, response
  preflight, one commit, and latest-64 receipt replay.
- `packages/engineer-agent-workflow-mcp/src/server.ts:29` owns protocol error
  envelopes and the existing 512-character message, 8,192-byte details,
  24-KiB structured, and 64-KiB wire budgets.
- `packages/engineer-agent-workflow-mcp/src/ledger.ts:302` currently counts every
  non-`superseded` historical row as a candidate revision.
- `packages/engineer-agent-workflow-mcp/src/checks.ts:33` combines document,
  mechanical, review, and approval-observation state.
- `packages/engineer-agent-workflow-mcp/src/reviews.ts:35` and
  `src/review-followup.ts:130` own full/followup lifecycle validation.

Allowed production ownership is limited to the MCP workflow error/validation,
scope/decision-link, ledger, specification-check, and review lifecycle owners;
their generated tool metadata/contract output may change as required. Add the
focused test file `packages/engineer-agent-workflow-mcp/test/workflow-diagnostics.test.mjs`
and adjust existing directly affected tests. Do not change product storage, add a
generic editor, migrate journals, decode host display markers, or auto-retry writes.

## Architectural units

1. **Workflow diagnostic projection** — the existing `api.ts`/`state.ts` error
   boundary converts validation and scenario facts into the closed diagnostic
   shapes in the MCP contract. It accepts only known field names, numeric indexes,
   saved references/option IDs, fixed categories and fixed recovery actions. It
   deterministically enforces 20 issues and 8,192 compact-JSON bytes while
   retaining category, safe item index, truncation state and recovery guidance.
   `server.ts` keeps the outer protocol/budgets and does not normalize product API
   errors into this workflow-specific contract.
2. **Question and link diagnostics** — `scope.ts` returns the exact saved question
   reference and allowed saved option IDs; `decisions.ts` validates every link
   member against one snapshot and reports the failing zero-based member plus safe
   requested/current references. Rejection performs no mutation. No-op all-current
   links remain no-write.
3. **Revision selection warnings** — `ledger.ts::selectCurrent` preserves the
   existing selected latest record but removes valid supersession predecessors and
   explicitly `superseded` rows from candidate-head warning counts. Invalid links
   and duplicate revision pairs retain current rejection behavior.
4. **Specification state observation** — `checks.ts` returns document status,
   mechanical result, review coverage, approval checkpoint status, and whether the
   current call wrote that checkpoint as separate fields. Only the existing
   author-made Draft-to-Approved path may write it; read-only review status stays
   read-only and the semantic source version remains status-normalized.
5. **Review lifecycle recovery** — `reviews.ts` and `review-followup.ts` attach the
   current review mode, fixed lifecycle reason and applicable next action to
   rejected identifiable-current operations. Stale context/input takes precedence:
   reopen and inspect saved results; never repeat a write blindly.

Dependencies point from scenario owners to the shared bounded diagnostic builder
and from `server.ts` to the resulting `WorkflowError`; the product tool/schema path
does not depend on the new projection.

## RED, GREEN, and PROVE

Create the focused test first and record the intended assertion failure, not only
a missing symbol/import.

- **D01 — validation safety:** invalid fields, unknown malicious keys, Unicode,
  21-member arrays and over-budget details produce closed bounded diagnostics.
  Assert no token, answer, explanation, absolute path, arbitrary key/value, or
  stack appears. PROVE by temporarily reflecting one sentinel value and observing
  the leak assertion fail.
- **D02 — saved options and links:** an invalid option exposes the saved question
  reference and retrievable allowed IDs; a valid answer then succeeds on the
  untouched state. Exercise 20 all-current links, 21 links, duplicate/unknown/stale
  members and unknown requirements. A failing final member leaves bytes, versions,
  decisions and receipt counts unchanged. PROVE the atomicity observation by
  temporarily applying one prefix member.
- **D03 — warnings:** prepare -> answer -> link yields zero warnings; two live
  heads or branches yield one warning per ambiguous ID; explicit supersession does
  not. Assert selected current records and journal bytes stay compatible.
- **D04 — document/checkpoint state:** cover missing document/status, Draft,
  Approved at review start, newly observed transition, repeated observation and
  stale review. The first eligible check records once; repeated and read-only
  status calls add no receipt/version.
- **D05 — lifecycle matrix:** full, followup-pending, followup-awaiting-consistency,
  consistency-recorded, completed and stale cases return the contracted reason and
  next action. Rejected calls are byte/version/receipt no-ops; two clients retain
  real stale-write conflicts.
- **D06 — compatibility:** existing direct readers, product-schema diagnostics,
  error codes, single-item review and result budgets pass unchanged. Generated and
  live metadata disclose the new fields/effects.

Run from the repository root:

```sh
rtk proxy npm run build
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/workflow-diagnostics.test.mjs packages/engineer-agent-workflow-mcp/test/ledger.test.mjs packages/engineer-agent-workflow-mcp/test/review-concurrency.test.mjs packages/engineer-agent-workflow-mcp/test/review-followup.test.mjs packages/engineer-agent-workflow-mcp/test/transport.test.mjs
rtk proxy npm run lint
rtk proxy npm test
rtk proxy npm run generate:check
rtk proxy npm run validate:foundation
rtk proxy git diff --check
```

All required commands must exit 0 with discriminating assertions. Portable temp
paths are required; native Linux/macOS/Windows qualification remains P17. Recheck
the pinned specification through MCP, update only `todo.md` and current
`handoff.md`, then stop. A failed or unavailable required check leaves P20
incomplete with its concrete next action.
