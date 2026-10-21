# Adaptive Planning

Planning consumes, but does not own, specification scope.

## Preconditions

Follow the completeness-version protocol in `shared/references/yaml-contracts.md`.
Call `specification_check_state` before planning and again before final handoff
with the pinned `expected_source_version`. Use exact MCP requirement definitions
and record the reviewed version in planning artifacts. A changed or incomplete
new review returns affected work to specification; legacy remains explicitly
unverified without automatic migration or a new blocking gate.

Require a confirmed `manifest.yaml` (`confirmed: true`) and an Approved `spec.md`.
Validate that the depth is Lite, Standard, or Deep; every profile has a
supported state and
reason; requested planning artifacts match active profiles; and approved
requirements are traceable. If either file is missing, confirmation is absent,
or artifacts conflict, stop without production mutation and direct the user to
run or resume `spec-driven-development`. Do not silently downgrade or repair
scope in planning.

## Profile Reference Routing

Only after validating the confirmed manifest, derive one path per active
profile as `references/<profile>-planning.md` and load exactly that set. Do not
load a file for an inactive, not-applicable, unresolved, or merely possible
profile. Never substitute a grouped reference: this one-to-one mapping keeps
unrelated profile guidance out of context.

Reassess evidence only as a safety check. Use the highest applicable depth. If
repository evidence exposes a new profile, public contract, migration,
distributed boundary, irreversible effect, or critical security/quality need,
return it to specification for confirmation.

## Platform Verification

Inherit agreed platform support per component from `spec.md` and its linked
decisions; do not repeat settled questions. Map each supported environment and
material cross-platform combination to requirement IDs, an executable check,
and its planned execution environment. Distinguish development, build, and
runtime coverage where relevant. Reuse existing checks and keep small coverage
tables inline in the plan or packets; no extra artifact is mandatory.

Record unavailable or unverified environments and how evidence will be obtained.
A check planned or run on another platform is not a pass for the target platform.
Do not expand or reduce support to fit available runners. Return material gaps,
contradictions, or support changes to specification; continue independent work
only where it does not rely on the unresolved decision.

## Output By Depth

- **Lite:** produce one compact implementation packet plus `plan.md`, `todo.md`,
  current-only `handoff.md`. Keep architecture inline and create no
  separate profile artifact unless the confirmed manifest explicitly requires
  one; such a requirement usually means Standard is more accurate.
- **Standard:** add only the listed core profile, UI, service, data, or contract
  enough architecture/runtime views to explain affected boundaries. Split work
  where tests, dependencies, review, or recovery make packets independently
  useful.
- **Deep:** add quality and risk evidence through warranted contract schemas,
  scenarios, context/runtime/
  deployment views, ADRs, migration and rollback stages, security and
  observability work, and explicit cross-surface verification. Depth does not
  require every possible document.

Profile outputs in `planning_artifacts` are relative to `docs/specs/<slug>/`.
The only project-root exception is optional `project_artifacts` (missing means
`[]`): exact design files under `design/system/` or
`design/specs/<this-slug>/`, with active `ui`. Reject absolute paths,
traversal, wildcards, directory-wide write scope and escaping symlinks before
writing. Read-only shared inputs are not output authority. A different slug or
material output change returns to specification; do not migrate legacy locations
silently. UI remote writes have their own bounded target confirmation.

Main planning creates specification-local non-design contracts. Declared root
UI outputs belong to the separate explicit `design-planning` stage after the
plan; mark affected packets pending design, without blocking independent work.
These are reviewable design artifacts, not production code. For other
product-owned contract locations, an authorized task packet must promote or
synchronize the approved design during implementation and verify no divergence.

## Coherence Review

Before handoff, verify:

- every approved requirement has an owning unit and discriminating check;
- every task and profile artifact maps to requirement IDs;
- UI actions, operations/events, state changes, failures, and UI outcomes agree;
- contract schemas are referenced, not copied into prose;
- dependency direction, lifecycle, recovery, compatibility, rollout, rollback,
  security, privacy, accessibility, observability, and documentation are either
  covered or evidence-backed `not_applicable`;
- no task implements behavior before its test or executable check.
- every task has explicit current technical agreement and passes
  `planning_packet_check`; drafts with unresolved decisions remain pending.

## Scenario MCP Access

Read `shared/references/yaml-contracts.md`. Use `specification_open`,
`scope_get`, `decision_find` and `decision_get`; do not read or edit the four
workflow YAML files directly. For technical proposals, answers, exact task
bindings and readiness, follow `references/technical-agreement.md` and its
`planning_*` scenarios. Technical history is separate from behavioral freshness.
Material scope/behavior changes return to the specification owner. Main planning
does not call design-writing tools or load their instructions; it records the
separately authorized design stage.
