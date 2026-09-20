# Packet 13: Adaptive Specification And Planning

Requirements: SKILL-004, SKILL-005, SPEC-001, MAN-001, TEST-001, PLAN-001,
PLAN-002, PLAN-003, INT-001, TOK-002, DOC-001, ACC-001, ACC-008, ACC-009.

## Outcome

Revise the existing `spec-driven-development` and
`planning-and-task-breakdown` workflows as one adaptive pair. Specification
confirms depth and composable profiles, persists durable scope, and stops with
an Approved behavioral contract. Planning consumes that contract, creates only
warranted reviewable profile artifacts and test-first task packets, and stops
before implementation.

## Prerequisites

- Historical Packets 02, 03, and 08 are complete; do not rewrite or renumber
  them.
- The current specification remains `Status: Approved`.
- The decisions in `../decisions.yaml` and current scope in
  `../manifest.yaml` are authoritative for this correction.
- Inspect current canonical skills, tests, catalog metadata, shared-resource
  verifier, and generated-artifact rules before editing.

## Scope

- Update only the two existing workflows; add no workflow identity.
- Make `spec-driven-development` standalone.
- Make `planning-and-task-breakdown` bundle-required on the matching
  specification workflow. Preserve incremental implementation's dependency on
  planning.
- Add adaptive `Lite`, `Standard`, and `Deep` depth with composable `core`,
  `ui`, `backend`, `events`, `data`, `operations`, `security`, and
  `cross-surface` profiles.
- Keep versioned decision history in `decisions.yaml` and only current confirmed
  scope in deterministic `manifest.yaml`.
- Add conditionally loaded core, UI, backend, and adaptive-planning references.
- Keep a compact profile-to-artifact path registry in adaptive scope so the
  manifest can be confirmed before any detailed profile reference is loaded.
- Create host-isolated generated artifacts only through the existing generator.
- Synchronize the specification, catalog, repository guidance, README, packet
  contract, checklist, plan, and current handoff.

## Non-Goals

- Do not add a third specification/planning workflow, support skill, custom
  lifecycle command, or installer.
- Do not create UI, API, architecture, or quality artifacts during
  specification.
- Do not retroactively add new profile contracts to this workstream's legacy
  planning bundle. Its manifest indexes only the existing task documents; the
  new artifact rules apply to subsequent specifications.
- Do not implement a consuming application's feature, execute a generated task
  packet, mutate real host profiles, install plugins, commit, push, tag, or
  publish.
- Do not hand-edit generated plugin artifacts or generated shared-resource
  copies.

## File And Ownership Boundaries

| File or unit | State | Contract |
| --- | --- | --- |
| `skills/spec-driven-development/SKILL.md` | Existing/revised | Evidence-first scope proposal, durable decisions and manifest, profile-routed behavioral interview, automatic Approved finalization, and specification-only stop. |
| `skills/spec-driven-development/references/adaptive-scope.md` | Proposed | Depth/profile triage, confirmation, deterministic manifest contract, and reconfirmation rules. |
| `skills/spec-driven-development/references/core-requirements.md` | Proposed | Observable library, CLI, configuration, public-interface, compatibility, determinism, and failure requirements. |
| `skills/spec-driven-development/references/ui-requirements.md` | Proposed | Observable experience states, responsive/accessibility behavior, and deterministic design handoff. |
| `skills/spec-driven-development/references/backend-requirements.md` | Proposed | HTTP, RPC, external-service, error, idempotency, and compatibility requirements. |
| `skills/spec-driven-development/references/events-requirements.md` | Proposed | Delivery, ordering, replay, recovery, and event-schema evolution requirements. |
| `skills/spec-driven-development/references/data-requirements.md` | Proposed | Data ownership, invariants, retention, migration, rollback, and recovery requirements. |
| `skills/spec-driven-development/references/operations-requirements.md` | Proposed | Runtime quality, observability, rollout, and operator-recovery requirements. |
| `skills/spec-driven-development/references/security-requirements.md` | Proposed | Trust-boundary, least-privilege, privacy, abuse, and fail-closed requirements. |
| `skills/spec-driven-development/references/cross-surface-requirements.md` | Proposed | End-to-end action, operation/event, state, failure, and UI-outcome traceability. |
| `skills/planning-and-task-breakdown/SKILL.md` | Existing/revised | Approved-specification and confirmed-manifest gate, adaptive reference routing, profile-artifact creation, test-first packets, and planning-only stop. |
| `skills/planning-and-task-breakdown/references/adaptive-planning.md` | Proposed | Depth-scaled output, scope-return rule, coherence review, and Lite packet contract. |
| `skills/planning-and-task-breakdown/references/core-planning.md` | Proposed | Deterministic `core/contracts.yaml` ownership for warranted public core contracts. |
| `skills/planning-and-task-breakdown/references/ui-planning.md` | Proposed | Repository-local experience, token, wireframe, state, accessibility, and service-mapping contracts. |
| `skills/planning-and-task-breakdown/references/backend-planning.md` | Proposed | Repository-local service protocol, problem type, compatibility, and contract-test artifacts. |
| `skills/planning-and-task-breakdown/references/events-planning.md` | Proposed | Repository-local event schemas and producer/consumer verification contracts. |
| `skills/planning-and-task-breakdown/references/data-planning.md` | Proposed | Repository-local schemas, migration, rollback, validation, and cleanup contracts. |
| `skills/planning-and-task-breakdown/references/operations-planning.md` | Proposed | Repository-local quality scenarios, observability, rollout, and recovery artifacts. |
| `skills/planning-and-task-breakdown/references/security-planning.md` | Proposed | Repository-local trust-boundary, control, and negative-verification artifacts. |
| `skills/planning-and-task-breakdown/references/cross-surface-planning.md` | Proposed | Repository-local architecture and end-to-end dynamic scenario artifacts. |
| `catalog/skills.json` | Existing/revised | Descriptions, standalone/bundle-required classification, and direct dependency direction. |
| `shared/scripts/verify-engineering-manual.mjs` | Existing/revised | Caller-local verification plus matching declared-dependency authentication without making specification depend on planning. |
| `tests/specification-skill.test.mjs` | Existing/revised | Discriminating adaptive-scope, profile, automatic approval, recovery, and no-planning tests. |
| `tests/planning-skill.test.mjs` | Existing/revised | Preconditions, all depths, composable profiles, artifact routing, and no-production-mutation tests. |
| `tests/bundle-required.test.mjs`, `tests/manual-verifier.test.mjs` | Existing/revised | Reversed dependency, standalone specification, transitive bundle, missing, mismatch, and mixed-release cases. |
| `docs/specs/cross-client-skill-distribution/` | Existing/revised | Approved requirements, decision history, current manifest, corrective packet, and handoff. |

## Specification Contract

1. Infer high-level scope from the request and repository evidence. Ask only
   missing questions that can change depth, profiles, or required coverage.
2. Propose the highest applicable depth, active profiles, material exclusions,
   rationale, and planned artifacts in plain language. Obtain explicit
   confirmation with the active host's standard question tool.
3. Checkpoint the proposal and answer as a versioned non-sensitive decision.
   Write only the current confirmed result to `manifest.yaml`.
4. Only after `manifest.yaml` is confirmed, route active profiles to their
   requirement references; never preload inactive profile guidance. Scale the
   interview breadth to confirmed depth without omitting baseline correctness,
   security, privacy, accessibility, or acceptance.
5. Give requirements stable IDs and trace decisions and planned artifacts to
   them. Keep the specification behavioral and do not create planning
   artifacts.
6. After the gap review passes, write `spec.md` immediately as
   `Status: Approved`. A separate approval decision is forbidden. Direct user
   edits remain authoritative and material scope edits require a new decision
   revision and reconfirmed manifest.

## Planning Contract

1. Require an Approved `spec.md` and `manifest.yaml` with `confirmed: true`.
   Missing, unresolved, or conflicting state stops without production mutation
   and returns scope ownership to specification.
2. Respect confirmed depth and profiles. New evidence that materially raises
   depth or adds a profile, contract, migration, irreversible effect, or
   critical risk returns to specification for confirmation.
3. Create only manifest-listed repository-local profile artifacts. Use stable
   IDs and deterministic text formats; reference rather than duplicate facts.
   Derived renders and external design links are not sole sources of truth.
4. Lite creates `plan.md`, `todo.md`, current-only `handoff.md`, and one compact
   numbered implementation packet. Standard and Deep add only profile
   contracts, architecture, packets, risks, rollout, and manual gates justified
   by confirmed scope.
5. Every behavior packet defines and runs a discriminating test or executable
   check first, records relevant RED, implements the smallest change, corrects
   implementation while correct checks fail, applies PROVE when needed, and
   runs focused plus repository-proportional verification. It never weakens a
   correct check to obtain green.
6. Planning records whether durable developer documentation is warranted and
   adds a final documentation packet only when the existing threshold is met.

## Test-First Implementation Order

1. Add or revise fixtures and executable assertions for adaptive scope,
   profile routing, preconditions, dependency direction, and output depth.
2. Run the focused tests and record a relevant RED for each new contract.
3. Implement the smallest coherent skill, catalog, and verifier changes that
   satisfy those checks.
4. Correct implementation while any correct focused check fails. Do not weaken
   assertions, remove scenarios, or silently reduce depth/profile coverage.
5. Regenerate host artifacts through `npm run generate`; never patch them by
   hand.
6. Run focused tests, the complete suite, foundation validation, deterministic
   generation checks, skill quick validation, and isolated forward testing.

## Acceptance Criteria

- The specification workflow proposes and explicitly confirms one of three
  depths and a complete composable profile state before detailed interviewing.
- The manifest schema and ordering are deterministic; decision history is not
  overwritten; a missing tool response is not confirmation.
- The compact registry provides artifact paths before confirmation. After
  confirmation, each active profile maps to one dedicated reference and exactly
  that set enters detailed specification or planning context.
- The `core` profile handles library, CLI, configuration, and other non-UI/non-
  backend work without forcing an unrelated profile.
- Specification writes no UI/API/architecture planning artifact and finalizes a
  complete contract directly as Approved.
- Planning refuses a missing, unapproved, unconfirmed, or conflicting
  specification bundle without production mutation.
- Lite, Standard, and Deep fixtures produce only their warranted outputs; Lite
  always has one compact packet and the three current planning documents.
- Core, UI, backend, event, data, operations, security, and cross-surface
  planning contracts remain deterministic, traceable, and repository-local.
- Catalog and verifier tests prove specification standalone, planning dependent
  on specification, and incremental implementation dependent on planning.
- Every behavior packet is test/check-first and requires implementation
  correction while correct checks fail.
- Canonical skill files meet discovery/size contracts, generated host bundles
  contain only their own values, and unrelated worktree changes remain intact.

## Verification

```bash
node --test \
  tests/catalog.test.mjs \
  tests/specification-skill.test.mjs \
  tests/planning-skill.test.mjs \
  tests/bundle-required.test.mjs \
  tests/manual-verifier.test.mjs
npm test
npm run validate:foundation
npm run generate
npm run generate:check -- --allow-incomplete
```

Validate the generated Codex artifacts with the available
`skill-creator` `quick_validate.py`:

- `plugins/codex/engineer-agent-workflows/skills/spec-driven-development`
- `plugins/codex/engineer-agent-workflows/skills/planning-and-task-breakdown`

The canonical cross-host templates intentionally include Claude frontmatter
that the Codex-oriented quick validator does not accept. Record this limitation;
do not remove required cross-host metadata to satisfy the generic validator.

Run independent forward tests from an isolated temporary directory for one UI
scenario and one core/backend scenario. Do not write generated examples into
the repository.

## Recorded Completion Evidence

- RED-to-GREEN progression: the first focused adaptive run reported 19 passed
  and 8 failed; the main implementation pass reduced that to 23 passed and
  4 failed; after correcting implementation against the remaining checks, the
  targeted specification/planning suite passed 19/19.
- The stricter one-reference-per-active-profile checks then started at 15/19,
  exposed grouped backend guidance, and passed 19/19 after both workflows were
  split into one dedicated reference per profile.
- The final complete suite passed 138/138; foundation validation and
  deterministic generation checks passed after regeneration.
- Both generated Codex skill artifacts passed `quick_validate.py`; canonical
  templates were not treated as invalid for retaining required Claude
  frontmatter.
- The isolated Standard UI specification scenario used one combined scope
  confirmation, loaded only `ui-requirements.md`, produced an Approved
  specification, and created no planning artifacts.
- The isolated core/backend planning scenario created
  `core/contracts.yaml`, an OpenAPI contract, `plan.md`, `todo.md`,
  current-only `handoff.md`, and three test-first packets. It did not load the
  UI reference or mutate production files.

The decision ledger and manifest passed YAML parsing, and `git diff --check`
reported no whitespace errors.

## Completion And Handoff

- Packet 13 is complete; generated artifacts were synchronized at the recorded
  checkpoint.
- Keep exact RED/GREEN, forward-test, quick-validation, and remaining-gate
  evidence in `handoff.md`.
- Packet 10 is next but has not been started. Stop for review.
- Commit, push, installation, activation, publication, and Packet 10 each
  require separate authorization.
