# Packet 10: Host And Context Acceptance

Requirements: HOST-001, HOST-002, HOST-003, HOST-004, INV-001, INV-002,
TOK-001, TOK-002, DIST-006, DIST-007, TEST-001, PLAN-002, INT-001, QUAL-001,
ACC-004, ACC-006, ACC-007, ACC-008, ACC-009, ACC-010.

## Outcome

Prove that supported Codex and Claude Code versions discover the same released
collection, enforce explicit-only invocation, fit the unmodified default
discovery budget, load only routed content, validate the native bundle, and
stop bundle-required workflows when the manual is missing or mismatched.

## Prerequisites

- Packets 08 and 09 are complete.
- Current official Codex and Claude Code documentation has been re-read for
  skills, plugin namespaces, explicit-invocation controls, discovery/context
  diagnostics, and plugin validation.
- Candidate oldest-supported and current stable client versions are identified
  by evidence; do not infer them.
- Automated runs use isolated profiles. Account/hosted/organization mutations
  remain manual gates.

## Scope

- Add instrumented skill-body/reference sentinels and host-session acceptance
  harnesses.
- Verify global and complete native-plugin discovery for both clients.
- Verify explicit invocation and non-activation by matching unqualified
  prompts.
- Measure complete default discovery context without changing host budgets.
- Verify selected-body and conditional-reference loading.
- Verify plugin validation, namespaces, enable/disable behavior, and
  bundle-required manual failure.
- Verify specification, planning, idea-refinement, and requirements-interview
  questions use `request_user_input` in Codex and `AskUserQuestion` in Claude
  Code without entering plan mode solely to ask.
- Verify the test-first/PROVE sequence, conditional developer-documentation
  decision, and fresh-context doubt reviewer through instrumented fixtures.
- Record exact client versions and evidence.

## Non-Goals

- Do not change host budgets, system prompts, invocation policy, or account
  configuration to force acceptance.
- Do not use real projects, real home directories, private conversations, or
  credentials in automated fixtures.
- Do not submit to vendor public directories.
- Do not install, configure, or invoke Prompt MCP; no collection workflow
  depends on it.
- Do not weaken a policy when an older host ignores it; raise the supported
  version floor instead.

## File And Symbol Boundaries

| File/unit | State | Contract |
| --- | --- | --- |
| `tests/host/instrumented-bundle.mjs` | Proposed | Builds temporary skill variants with unique discovery/body/reference sentinels while preserving valid metadata and size limits. |
| `tests/host/codex-session.mjs` | Proposed | Bounded isolated Codex invocation/discovery adapter using the documented noninteractive/test surface; records sanitized structured evidence. |
| `tests/host/claude-session.mjs` | Proposed | Equivalent Claude Code adapter and native context/doctor evidence. |
| `tests/host/explicit-invocation.test.mjs` | Proposed | Qualified invocation, unqualified matching prompt, plugin namespace, enable/disable, and missing-bundle cases. |
| `tests/host/context-budget.test.mjs` | Proposed | Complete discovery list/cost, truncation/warning detection, selected-body loading, and conditional reference routing. |
| `tests/host/plugin-validation.test.mjs` | Proposed | Current Codex and `claude plugin validate` complete-bundle checks. |
| `docs/evidence/host-compatibility.json` | Proposed/generated evidence | Exact OS/arch, client versions, surface, install mode, discovery count/cost, policy result, validator result, and sanitized timestamp; no personal paths/tokens. |
| `docs/evidence/host-compatibility.md` | Proposed | Human-readable verified floors/current versions, unavailable surfaces, and bounded limitations. |
| `catalog/release.json` | Existing | Fill only verified oldest/current client versions; unknown manual surfaces remain unset. |

## Host Acceptance Contract

- Codex global invocation uses the current verified `$<skill-name>` form;
  Claude global invocation uses `/<skill-name>` where current. Record, do not
  guess, plugin-qualified forms.
- Global and plugin modes each list exactly 15 names and descriptions without
  omission, truncation, collision, or warning.
- An explicit invocation loads the selected `SKILL.md`. An unqualified prompt
  matching its description must not activate it.
- Codex must honor `policy.allow_implicit_invocation: false`.
- Claude must honor `disable-model-invocation: true` and
  `user-invocable: true`.
- If a tested version/surface cannot enforce the policy, it is unsupported and
  the recorded version floor advances; generation remains fail-closed.
- Global skills and native plugin must not be simultaneously active in one
  acceptance case.

## Context-Efficiency Contract

- Use native default discovery settings. Do not increase any token/context
  budget or suppress warnings.
- Record host-reported listing and context cost for the exact version.
- All 15 descriptions remain unchanged from the catalog.
- Before explicit invocation, no body/reference sentinel may appear.
- After invoking one skill, its body sentinel appears, no other body sentinel
  appears, and a conditional reference sentinel appears only after its
  documented condition.
- The complete `SKILL.md` and description static limits are rechecked before
  every host run.

## Bundle And Shared-Resource Contract

- Planning, specification, and incremental resolve identical generated local
  copies of both authoritative root `shared/` references in global symlink/copy
  and plugin layouts.
- Each workflow runs its local generated verifier; bundle authentication still
  requires the matching planning companion.
- A deliberately isolated individual dependent skill stops before artifact
  production with the fixed complete-bundle install instruction.
- Missing/mismatched/mixed-version bundle fixtures do not access the network,
  invoke planning, or continue with embedded defaults.

## Acceptance Criteria

- Exact current stable Codex and Claude Code accept global discovery, explicit
  invocation, non-implicit prompts, and complete plugin validation.
- The oldest claimed supported version for each host passes the same policy on
  every claimed surface; unsupported versions are excluded.
- Complete discovery fits both native default budgets with 15 unchanged
  descriptions and no warning.
- Body/reference sentinel assertions pass exactly.
- Global/plugin namespaces and enable/disable behavior match recorded docs.
- Bundle-required failure occurs before artifact creation.
- Both hosts exercise all four question-driven workflows with their standard
  question tools in the current mode; missing/failed outcomes are not answers.
- Planning and implementation fixtures prove test-first/PROVE ordering and the
  documentation threshold; doubt fixtures prove fresh-context isolation and
  evidence reconciliation.
- Evidence files contain only normalized versions/results, no credentials,
  prompts, answers, personal paths, or unrelated environment.

## Verification

Automated isolated-profile checks:

```bash
npm run test:hosts
npm test -- --test-name-pattern='explicit invocation|context budget|plugin validation'
npm run validate
npm run generate:check
```

**MANUAL GATE:** with separate authorization, repeat discovery/invocation in:

- local Codex CLI and IDE;
- local Claude Code;
- one supported hosted/account installation per host;
- one organization-managed marketplace configuration per host.

Record no-project-mutation snapshots for each. Do not automate credentials or
modify a real profile without authorization.

## References

- [Approved specification](../spec.md): host/surface/version, invocation,
  discovery/runtime context, plugin, cross-host, manual-gate, and
  context-efficiency contracts.
- Current official Codex and Claude Code skill/plugin/context documentation,
  fetched and dated during implementation rather than assumed from this plan.

## Completion And Handoff

- Mark packet 10 complete only when automated evidence passes and every surface
  claimed as supported has its required manual evidence. Otherwise leave it
  unchecked and list exact unavailable gates.
- Record exact versions, budgets/costs, namespaces, policy results, sentinels,
  validators, unsupported versions/surfaces, and packet 11 next.
- Stop. Do not publish, commit, or begin documentation without authorization.
