# Packet 03: Specification And Incremental Workflows

Requirements: SKILL-004, SKILL-005, MAN-001, MAN-002, TEST-001, PLAN-001,
PLAN-002, INT-001, ACC-008, ACC-009.

## Outcome

Generalize `spec-driven-development` and `incremental-implementation` as the two
bundle-required workflows. Both must verify authenticated local copies of the
authoritative shared references before producing artifacts, preserve
host-native decision/approval semantics, enforce test-first execution, and stop
at their review boundaries.

## Prerequisites

- Packets 01 and 02 are complete.
- The planning bundle's manual, digest, verifier, and packet reference pass in
  direct, copied, and symlinked layouts.
- Read the current source versions of both skills and
  `prompt-mcp/.agents/references/specification-interview.md`.

## Scope

- Author both bounded `SKILL.md` files and the generalized specification
  interview reference.
- Generate matching local shared-resource copies and digest markers from root
  `shared/`.
- Preserve the durable decision ledger, automatic approved-spec finalization,
  authoritative user edits, host-native question interaction, one-packet
  execution, and transition commit rule.
- Add missing/mismatched/mixed-version bundle fixtures, test-first/PROVE
  fixtures, and artifact-specific quality fixtures.
- Update only these two catalog entries if final descriptions change.

## Non-Goals

- Do not hand-edit, fetch, or approximate generated shared-resource copies in
  either skill.
- Do not make one skill invoke planning or another workflow automatically.
- Do not enter plan mode solely to ask questions or hard-code tool namespaces
  and request/response fields.
- Do not prescribe a programming language, framework, project layout, test
  command, or Git branch.
- Do not create a specification, plan, implementation, or commit for this
  project as part of fixtures.

## File And Symbol Boundaries

| File/unit | State | Contract |
| --- | --- | --- |
| `skills/spec-driven-development/SKILL.md` | Proposed | Explicit-only, specification-only workflow; durable decisions through the callable host-native question tool; automatic `Approved` finalization; authoritative user edits; no planning/implementation. |
| `skills/spec-driven-development/references/specification-interview.md` | Proposed | Material-decision, batching, checkpoint, recovery, automatic approval, user-edit reconciliation, and safe-outcome contract using current callable Codex or Claude Code schemas. |
| `skills/spec-driven-development/shared/` and `*.sha256` | Proposed/generated | Authenticated local copies and digest markers for both root shared references and the verifier. |
| `skills/incremental-implementation/SKILL.md` | Proposed | Explicit-only, one-authorized-packet, test-first implementation workflow with scoped verification and review stop. |
| `skills/incremental-implementation/shared/` and `*.sha256` | Proposed/generated | Same authenticated shared-resource copies and markers. |
| `tests/specification-skill.test.mjs` | Proposed | Behavioral spec, decision persistence, automatic approval, user-edit preservation, host-native question outcomes, and no-implementation fixtures. |
| `tests/incremental-skill.test.mjs` | Proposed | Packet scope, planning-mode architecture, verification, handoff, transition commit, and stop fixtures. |
| `tests/bundle-required.test.mjs` | Proposed | Missing, mismatch, mixed-release, copy, symlink, plugin, update, and path-form cases. |
| `tests/fixtures/specification/`, `tests/fixtures/incremental/` | Proposed | Declarative project/task/tool responses with sentinels; no private user answers. |
| `catalog/skills.json` | Existing | Only final descriptions/dependency metadata for these two entries may change; both remain bundle-required on planning. |

## Shared Bundle Contract

- Before writing a spec, plan, code, docs, checklist, handoff, or commit, run
  the calling skill's generated local verifier.
- Both shared references, both markers, the calling skill, and the matching
  `planning-and-task-breakdown` companion must be from the same release.
- Missing sibling, missing marker, missing manual, mismatch, mixed release, or
  unsafe path stops with one fixed instruction to install/update the complete
  matching bundle using the documented global command.
- Do not fetch, hand-copy, embed, approximate, or silently ignore either shared
  reference.
- Do not invoke the planning skill on the user's behalf.

## Specification Workflow Contract

- Activate only when the user asks to define/revise a substantial
  implementation-ready specification.
- Reuse host-supplied project instructions. Discover an additional task-scoped
  `AGENTS.md`/`CLAUDE.md` only when it is not in active context or is itself in
  scope, together with current repository evidence.
- Keep the specification behavioral: outcomes, interfaces, constraints,
  validation, limits, failures/recovery, security/privacy, compatibility,
  non-goals, and objective acceptance.
- Use callable `request_user_input` in Codex or `AskUserQuestion` in Claude
  Code in the current interaction mode; follow the exposed schema and never
  enter plan mode solely to ask a question.
- Checkpoint each non-sensitive explicit answer immediately in a
  repository-owned `decisions.yaml`; do not store secrets or rely on chat
  memory as the durable record.
- Dismissal, cancellation, timeout, unavailability, invalid responses, and
  failures are not answers. Preserve recoverable state and resume explicitly.
- After every material decision is resolved and the gap review passes, write
  `spec.md` immediately with `Status: Approved`; do not ask a separate approval
  question or create an `approval.spec` decision.
- Treat direct user edits to `spec.md` as authoritative. Preserve and reconcile
  material changes into versioned decisions on a later invocation.
- Stop after the specification handoff. `Approved` does not authorize planning
  or implementation.

## Incremental Workflow Contract

- Activate only for a user-authorized self-contained packet.
- In implementation mode, read the current packet, applicable project
  guidance, task-scoped code/tests/references, and verified manual; implement
  exactly one packet.
- In host planning mode, expose the complete symbol-level architecture required
  by PLAN-001 before implementation and keep production unchanged.
- Preserve unrelated work, choose the simplest adequate design, make
  ownership/errors/lifecycle explicit, and run packet-proportional checks.
- For every behavior change, first write the durable test or discriminating
  executable check and observe relevant RED. Implement against that check,
  correct the implementation until correct checks pass, record PROVE when RED
  is insufficient, then run focused and repository-proportional final checks.
- Never weaken a correct assertion or delete a required scenario merely to
  obtain green. If a check is demonstrably incorrect, repair it with evidence
  while preserving the intended acceptance contract.
- Update only that packet's `todo.md` item and `handoff.md`, then stop.
- At the start of the next authorized packet, commit the completed previous
  packet only when the user has explicitly authorized commits; inspect and
  stage exact paths. Never infer commit or publish authority.
- Failure to verify leaves the packet incomplete with exact evidence.

## Acceptance Criteria

- Both skill documents meet identity and size limits and contain no source
  repository assumptions.
- Both resolve byte-identical local copies of both shared references under
  direct, copy, symlink, plugin, update, Linux, macOS, and Windows fixtures.
- Missing/mismatch/mixed-release cases create no artifacts and emit only the
  fixed complete-bundle instruction.
- Specification fixtures distinguish behavioral contracts from implementation
  design, finalize complete output as `Approved`, and preserve direct user
  edits without a separate approval question.
- Dismissed, cancelled, timed-out, unavailable, invalid, or failed question
  interactions never enter `decisions.yaml` as answers.
- Incremental fixtures implement one packet, preserve unrelated files, run
  test-first RED/GREEN/PROVE sequencing and scoped verification, update
  checklist/handoff, and stop.
- Verification-failure fixtures keep the packet incomplete and correct the
  implementation while a correct check fails instead of weakening the check.
- Transition-commit fixtures require explicit authorization and exact staging.
- Planning-mode incremental fixtures expose language-appropriate architecture
  and do not mutate production.

## Verification

```bash
npm test -- --test-name-pattern='specification|incremental|bundle-required'
npm run validate:foundation
npm run generate:check -- --allow-incomplete
node skills/spec-driven-development/shared/scripts/verify-engineering-manual.mjs \
  skills/spec-driven-development
node skills/incremental-implementation/shared/scripts/verify-engineering-manual.mjs \
  skills/incremental-implementation
```

Review fixture snapshots to prove no question-tool sentinel, private answer, or
absolute personal path appears in output or diagnostics.

## References

- [Approved specification](../spec.md): bundle-required, engineering-manual,
  test-discipline, planning-detail, and host-native question contracts listed
  above.
- Initial refinement sources: `spec-driven-development/SKILL.md`,
  `incremental-implementation/SKILL.md`, and `specification-interview.md` from
  the approved `prompt-mcp` source repository.

## Completion And Handoff

- Mark only packet 03 complete.
- Record both shared digests, skill/reference sizes, every supported layout,
  fixed failure message, host-native question and test-first evidence, and
  packets 04–07 as independently available.
- Stop. Do not commit or begin another packet without separate authorization.
