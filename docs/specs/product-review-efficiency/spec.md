# Product Review Efficiency

Status: Implementation authorized by the user's accepted plan. Workflow scope
confirmation and independent specification review are not claimed by this document.

## Authority and scope

Implement the accepted five-checkpoint plan. The user selected semantic review
blocks, staged integrity checks for results and immutable sources, and atomic
legacy storage migration on the first authorized write. Existing product data,
global installation, publication and commits are out of scope.

## Requirements

- PRE-001: Preserve a complete canonical source-atom ledger. Assign each atom
  exactly one primary semantic block without model-selected omissions. Elements
  own their associated decisions and relations; unowned content stays explicit.
  Keep related shared context addressable without duplicating stored payloads.
- PRE-002: Deterministically validate structure, identities, references, versions
  and coverage. A structural pass never certifies semantic correctness. Reviewers
  judge each block and a final cross-block consistency result. Full semantic
  review does not require a second full delivery of already consumed text.
- PRE-003: Preserve corrections-only followup eligibility. Changed shared
  evidence invalidates affected blocks; unclear impact requires full review.
- PRE-004: Add indexed Review v2 storage with immutable verdict objects. Verify
  used objects and current state per call; fully audit on open/resume, first
  process access, completion, activation and parent-review use. Untouched-object
  corruption may be detected later, but cannot pass an acceptance audit.
- PRE-005: Preserve legacy inventory semantics, identities, receipts and results.
  Atomically migrate storage on the first actual write; reads and no-op retries
  do not migrate. Followup retains its parent's inventory contract. Never infer
  semantic-block verdicts from legacy atomic verdicts or delete retained objects.
- PRE-006: Add bounded product review get/record batch scenarios with 1–20 items,
  complete-read receipts, all-or-nothing writes, exact retries and current context.
  Bound raw record arguments at 131072 UTF-8 bytes, result payload at 24 KiB and
  full MCP response at 64 KiB. Preserve single-item APIs and recovery safeguards.
- PRE-007: Settle material technology questions before TD review. Final downstream
  review requires stable ready upstream pins. Work in bounded read/judge/save
  groups and retain compact recovery checkpoints. Observation remains read-only.
- PRE-008: Demonstrate coverage, corruption detection, concurrency, legacy
  compatibility and recovery. Measure 100/500/1000-record fixtures before/after;
  distinguish server performance from model comprehension and end-to-end latency.

## Acceptance

Each checkpoint requires its focused regressions before proceeding. Final checks
include MCP tests, full npm test, lint, generation, foundation and skill validation,
diff hygiene, measured performance and isolated author/reviewer qualification.
Unexecuted platform/model checks remain explicitly unverified. Maximum eight test
workers. See the task checklist for current evidence rather than assuming completion.
