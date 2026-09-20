# Platform Support Change History

Append-only history for the user-authorized platform-support refinement.
Earlier entries remain unchanged when later evidence corrects them.

## 001 — Shared support decision and profile application

- Added early per-component platform triage before scope confirmation, reuse of
  established requirements, and explicit handling of unanswered questions.
- Kept single-platform scope valid and distinguished development, build, runtime,
  client, and server support. Avoided a mandatory Cartesian product of targets.
- Reused the decision ledger and requirement IDs in `spec.md`; introduced no new
  manifest fields, schemas, profiles, or mandatory platform artifact.
- Added domain-specific applicability to all eight specification/planning
  profiles and preserved support in the separate design-planning handoff.
- Added verification coverage and truthful unavailable-environment reporting.
- Reason: the previous generic portability instruction did not reliably require
  an early support decision or carry it into profile-specific verification.

## 002 — Deterministic verification and native harness preflight

- Four new contract tests failed before the change and passed afterwards. One
  test matcher was corrected to accept a Markdown line break in `requirement IDs`;
  the requirement was retained.
- Full suite: 232 passed, zero failures or skips. Generation consistency,
  complete validation, and workspace lint passed.
- Initial native runs `single-terra-medium-v1`, `multiple-terra-medium-v1`, and
  `web-terra-medium-v1` could not write fixture decisions because the isolated
  client's approval policy rejected MCP writes. They are invalid qualification
  attempts, not prompt passes. The candidate was unchanged during harness repair.

## 003 — Separate platform answers from scope confirmation

- Actual Terra requests in the multiple-OS and web fixtures combined a material
  platform question with scope confirmation before the support answer existed.
- Added explicit sequencing: resolve and checkpoint support before `scope_propose`,
  include it in the rationale, and never batch it with scope confirmation.
- The new sequence assertion failed on v1 and passed on v2. Both host bundles
  were regenerated. Other platform rules were retained.
- The private native harness now handles the current `item/tool/requestUserInput`
  name and MCP elicitation approvals. Captured-request replays verify actual
  answer delivery and exact confirmation-option selection. Harness failures
  remain recorded separately from prompt findings.

## 004 — Require platform decision links before approval

- Native run `persist-terra-medium-v2` wrote correct platform requirements but
  never called `decision_link_requirements`. The general specification check
  passed because it validates existing references, not this missing link.
- Added an explicit platform-decision linking gate before `Approved`, using
  unchanged returned MCP context/references and recovery after read/link errors.
- The new gate assertion failed on v2 before the correction. The persistence
  scenario is repeated on v3; earlier evidence is not relabeled as a pass.
- `plan-split-terra-medium-v2` preserved platform boundaries but read the fixture
  setup journal during inventory despite its README restriction. This remains
  a separate instruction-following finding. Setup evidence is now moved outside
  the actor workspace before the turn, and the scenario will be repeated.

## 005 — Audit approval chronology, not just final consistency

- Chronological review supersedes the earlier positive persistence observation:
  `persist-terra-medium-v3` wrote `Status: Approved` at 147 seconds, linked
  decisions at 157 seconds, and passed the state check at 162 seconds. Its final
  content was consistent, but approval occurred too early.
- v4 explicitly requires `Draft`, successful decision links and state checking,
  then `Approved`. A new static assertion and an event-order evaluator reject
  the earlier behavior. The evaluator also verifies the original platform
  decision ID and its linked IDs in the final specification.
- The original review remains in the private append-only review stream, followed
  by a superseding failure. It is not counted as a successful final-candidate run.

## 006 — Recover the original platform decision on resume

- `persist-terra-medium-v4` used `Draft`, but guessed decision categories and
  invalid `limit: 100` queries missed the saved platform answer. It linked a new
  fact instead. The original-decision evaluator rejected this outcome.
- v5 specifies an initial `decision_find` call with only the latest context,
  returned cursors/references for recovery, and no replacement of saved answers
  by new facts. Failed or incomplete lookup keeps linking unresolved.
- The draft transition is scoped to creating a specification, preserving the
  existing contract for coherent direct edits to already approved documents.
- The new recovery assertion failed on v4 before the change. The final native
  repeat must link the exact original answer and satisfy the chronological gate.

## 007 — Preserve the automatic completion contract in regression checks

- The full suite exposed an older text assertion rejecting `Status: Draft`
  anywhere in the interview reference. That conflated an intermediate write
  needed for link validation with ending the workflow in Draft.
- Narrowed that assertion to the automatic-completion section, required its
  immediate `Approved` outcome, and retained the global prohibitions on a new
  approval interview or a leave-draft workflow. The failing full-suite logs are
  preserved; this is a test-contract correction, not removal of the final gate.

## 008 — Final v5 evidence and completion

- Terra Medium and Sol High both preserved the original platform decision and
  demonstrated Draft -> successful link -> successful state check -> Approved.
- Terra Extra High independently asked about unknown support before proposing
  scope and recorded the supplied targets before confirmation.
- Corrected the event evaluator to allow an additional post-approval readback;
  it still requires a successful pre-approval check. Negative controls and the
  actual v3/v4 traces remain rejected. No prompt change was needed for that correction.
- Final repository suite: 232 passed, zero failures/skips. Both generated hosts,
  complete validation, workspace lint, and whitespace checks passed.
- Thirty native attempts and their failures remain recorded. The final report
  distinguishes 13 accepted observations across versions from the three final
  v5 checks. No real global instructions, installation, or published artifact
  was changed by the trials.
