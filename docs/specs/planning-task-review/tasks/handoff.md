# Current Handoff

PTR-02 complete on 2026-10-28. PTR-01 remains complete. Stop after this packet;
PTR-03 through PTR-09 require separate explicit invocations.

## Current inputs

- Approved behavioral source: `3da917243e9367c9eec28ebe6662c2787afdde9cc59cd174b45128825e4a62de`.
- Specification version: `7fbb89419df3a1b920b425b161e6cd628f5035fb26ff37437450d521c4d32413`.
- Completeness review: `845484cd-a527-4841-acd1-7e92dc7f4d9b`.
- PTR-02 agreement: `e691a61d-b9b7-40f3-b230-7b7f31b8d5b1`, revision `3`.
- Proposal/digest: `PTR-02-inputs-v1` / `640c3bb501721f3333cd5ff38b840de6ff5ab4fa8efec86ec85ec367d4d003c8`.
- Entry and completion checks: specification `pass` / Approved / reviewed;
  exact packet agreement `ready`, with unchanged pins and no new approval checkpoint.

## Changes and agreement comparison

- Added `packages/engineer-agent-workflow-mcp/src/packet-review-inputs.ts`
  and `src/packet-review-tools.ts`, registered in the existing server. Public
  scenarios: `task_packet_review_prepare`, `task_packet_review_units`, and
  `task_packet_review_source_get`. Persistence uses PTR-01's owning helper;
  reads exhaust its exact continuations.
- Fixed-argv Git observations distinguish committed history, the index, disk and
  explicitly empty baselines, including a repository without its first commit.
  Selected untracked files, deletion/rename metadata, modes, symlink contents,
  relevant attributes and index differences remain bound to the selected source.
  Git configuration hooks/fsmonitor and inherited Git overrides are disabled.
- Current specification and exact accepted-question checks feed normal/diagnostic
  readiness. Reused proposal IDs cannot select another question's sources.
  Arbitrary criterion IDs and unlabelled Markdown/GFM obligations enter a draft
  inventory. Equal text at different locations retains separate identities;
  criteria and unit layout participate in the source version.
- Source-bound units retain shared constraints and contract dependencies.
  Limits are 20 packets, 128 units, 32 KiB per unit, 64 KiB actor input and
  16 KiB actor result; smaller advertised host limits win. Full mirrored MCP
  wire envelopes, escaping and headroom are counted. Indivisible oversized
  inputs fail explicitly. Exact UTF-8 portions and supported binary originals
  remain retrievable; only terminal portions carry delivery receipts.
- Optional preparation operation IDs support exact safe retries and preserve
  prior state on conflicting reuse. Cancellation prevents an uncommitted
  preparation from being acknowledged. Changed originals invalidate dependent
  reads instead of silently rebasing the run.
- Standalone preparation never accesses product state. Explicit product bindings
  use existing read-only product scenarios; tests instrument that boundary.
  No product transition or link is created.
- Added 17 input/delivery tests and four runtime inventory entries to the packed
  artifact test. Existing server, response-budget, PTR-01 and unrelated dirty
  changes were preserved. No canonical schema, template or technical proposal
  was changed by PTR-02.

## Acceptance evidence

Commands ran from the repository root on Node `v24.20.0`, except the stated lint.

- PASS: matching installed skill manual verifier and usable Git worktree checks.
- RED: the equal-text criterion regression failed its one-ID-per-location
  assertion; reused proposal IDs produced `diagnostic` instead of `normal`.
  Both passed after their corresponding fixes. Earlier retry and cancellation
  regressions also observed behavioral failures before correction.
- PASS: `rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp`.
- PASS: `rtk proxy node --test` on `packet-review-state.test.mjs`,
  `packet-review-inputs.test.mjs`, `packet-review-delivery.test.mjs`,
  `planning-packet-check.test.mjs`, `planning-decisions.test.mjs`, and
  `review-submission.test.mjs` under the MCP test directory: 65/65
  (20 storage, 17 new input/delivery, 28 existing regressions).
- PASS after final PROVE restoration: both new input/delivery test files, 17/17.
- PASS: `rtk proxy node --test packages/engineer-agent-workflow-mcp/test/packed-artifact.test.mjs`,
  1/1: exact extracted inventory, verified runtime identity and integrated local
  public MCP scenarios. Final rebuilt identity matches the tested archive:
  build `77427460541f60ae8cc6a1a8aaa3196a3c17b4ac3e0069c1aeed72a08625ef50`,
  contract `bd818602262cf9190a7734479b75fda553727ed71afcd9a92b488a5c42380d06`.
- PASS: `rtk proxy npm run generate`, `rtk proxy npm run generate:check`,
  and `rtk proxy npm run validate`; 17/17 skills.
- PASS: `rtk proxy npx --no-install eslint src/packet-review-inputs.ts src/packet-review-tools.ts test/packet-review-inputs.test.mjs test/packet-review-delivery.test.mjs`
  from the MCP package directory.
- PASS: `rtk proxy git diff --check` excluding workflow-owned YAML.

Required PROVE mutations were applied separately on the final implementation:

1. Substituting disk bytes for staged bytes failed the intended assertion
   (`Disk fix` versus `Staged defect`).
2. Skipping criteria from an untracked packet lost `custom-gate-z` and failed
   the intended criterion-membership assertion.
3. Marking an incomplete portion as complete failed exact original recovery.

Every mutation built successfully before its behavioral test failed. Each was
restored byte-for-byte; the final implementation SHA-256 is
`8558b7bc4bf53a5b4db19b5a698c6e3dae8cd4e36371180c036806ba23f0b3e9`.
The final build and new tests passed after restoration. Initial fixture budget,
compilation/lint and local command invocation errors were corrected; these are
not counted as behavioral proof and no required failed check remains.

## Limits and next boundary

Inventory remains draft and all semantic assessment fields remain unverifiable;
parsing, delivery and green checks do not certify acceptance coverage. Semantic
reconciliation belongs to PTR-04. No verification producer, stage dispatch,
review judgment, phase-local test runner, isolation resource or execution queue
was implemented in PTR-02. Product-bound tests use an instrumented read-only
boundary, not an actual user product workspace. Native Codex/Harness reviewer
qualification and end-to-end review are NOT TESTED and belong to later packets.

The serving MCP connection was not refreshed or reconfigured. Passing fresh
local stdio/build/archive checks does not establish activation in that connection.
No global installation, commit, publication, external comment, optional independent
review or next-packet execution was performed.

Next eligible packet: PTR-03 (`03_packet_verification.md`), only after its separate
explicit invocation and fresh prerequisite/source/agreement checks. No unresolved
PTR-02 decision or required failed check remains.
