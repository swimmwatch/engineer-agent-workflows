# PTR-06: Canonical Skill And Native Host Routes

Status: Planned; technical agreement recorded. Execution requires a separate explicit invocation.

## Technical proposal

Proposal ID: `PTR-06-skill-v1`. Packet ID: `PTR-06`. Depends on PTR-01 through
PTR-05. Requirements: IPR-001 through IPR-024, consuming PTR-03 for IPR-025.
Apply `tasks/plan.md`, `Shared state commitments`.

Add one canonical `skills/task-packet-review/SKILL.md` and condition-routed
references, plus a native workflow body and plain JSON metadata under its
`workflows/`. The skill remains explicit-only and matching-bundle dependent on
the existing packet/specification workflows; reuse authoritative engineering,
test and state-access guidance. Keep the body within 4096 UTF-8 bytes and the
description within 240 Unicode code points. Put optional host/execution/recovery
detail in references rather than an oversized entry point.

The coordinator resolves selection and capabilities through MCP, then carries
preflight, three independent fact directions, main review, independent verification
and derived reporting. Native `agent()` calls or ordinary native subagents perform
semantic work in separate contexts, including sequential execution on a width-one
host. Actors retrieve bounded exact evidence and submit directly to MCP; the
coordinator carries bounded acknowledged outcomes, not copied project transcripts.
Main review covers its five axes plus integrated cross-unit interactions.
Verifiers challenge claims and omissions within the existing participants; if a
new material concern cannot receive independent assessment without another agent,
keep it unresolved. Finalization/reporting consumes recorded outcomes, not an
extra model that repeats review. Tests remain tools inside each investigation
phase; no separate execution phase, resource queue or mandatory test per agent.

For DeepSeek Harness, package the common JavaScript body and separate meta JSON,
resolve the actual native workflow tool/schema, and use foreground collection
with the host's verified enclosing deadline/cancellation path. Phases shown by
the workflow are Preflight, Independent facts, Main review, Verification and
Report. Resolve advertised provider/model routes and retain actual user role
preferences; where the host contract requires selection, ask through its native
question tool before dispatch. Never hard-code provider aliases or switch models
silently. Resume starts a new native invocation over acknowledged MCP unit state;
it does not claim native engine journaling.

For Codex use ordinary independent native subagents and the same MCP process;
require a verified bounded caller for the chosen route. Claude Code gets isolated
host generation and a native route only when callable capabilities support it,
otherwise the same ordinary independent process. Missing engine alone may select
ordinary agents; missing independence, required MCP or bounded execution prevents
dependent dispatch. No native parity or Claude runtime pass is inferred.

Extend the existing catalog, host renderer/shared-asset lists and matching-bundle
verification at their source ownership points, using only genuinely host-specific
new template variables for route instructions. Do not overload the existing
specification-review route or reuse its outcome as packet-review evidence. Reuse
the established body/meta packaging pattern; Codex receives only its required
ordinary-route assets, and other targets contain only their own metadata/guidance.
Generate Codex, Claude Code and Harness artifacts with existing commands. Preserve
sibling exports and unrelated dirty work; no installed-copy edits, global
installation, provider setup or release publication.

Evidence: `scripts/lib/distribution.mjs:45-108` owns host substitutions,
`:138-177` owns shared assets, `:943-956` bounds generated targets;
`scripts/lib/catalog.mjs:83-108` enforces explicit-only policies;
`skills/spec-driven-development/workflows/specification-review.meta.json` and its
body establish the current native artifact pattern. Re-verify before execution.

## Outcome, prerequisites and pinned inputs

Implement only PTR-06 after its separate explicit invocation. PTR-01 through PTR-05 complete. Their actual built scenario schemas and fixture contracts are the input; no native capability is inferred from source presence.

- Behavioral source: `3da917243e9367c9eec28ebe6662c2787afdde9cc59cd174b45128825e4a62de`.
- Specification version: `7fbb89419df3a1b920b425b161e6cd628f5035fb26ff37437450d521c4d32413`.
- Completeness review: `845484cd-a527-4841-acd1-7e92dc7f4d9b` (Approved, reviewed, consistent).
- Linked requirements: `IPR-001`, `IPR-002`, `IPR-003`, `IPR-004`, `IPR-005`, `IPR-006`, `IPR-007`, `IPR-008`, `IPR-009`, `IPR-010`, `IPR-011`, `IPR-012`, `IPR-013`, `IPR-014`, `IPR-015`, `IPR-016`, `IPR-017`, `IPR-018`, `IPR-019`, `IPR-020`, `IPR-021`, `IPR-022`, `IPR-023`, `IPR-024`, `IPR-025`.
- Technical agreement/digest: use the exact values in `Technical agreement` below;
  `planning_packet_check` must be current at entry and completion.
- Read only linked exact requirement definitions via MCP and the bounded contract
  sections/selectors below; follow every required continuation. Do not reload the
  journal, inactive profiles or unrelated packets. Re-verify cited source evidence.

MCP contract and data selectors consumed through actual scenarios. Read IPR-001/002, 007–013, 018/019, 023/024 exactly; use the declared contract sections and dependency evidence for other mapped protocol obligations. No inactive-profile or whole-journal reload.

Before bulk implementation reads, verify a usable Git worktree and the actual
runner authority/capabilities. A clean tree or existing commit is not required.
Inspect tracked/staged/untracked state and preserve unrelated content/meaningful
attributes. Unknown loss or overlap requires disposition, not a new baseline or
reset. Do not initialize the real project or inspect/copy auth/private files.

## Allowed writes and boundaries

- New canonical `skills/task-packet-review/` entry, condition-routed references and workflow body/meta.
- Catalog entry and existing generator/catalog/shared-bundle verification source ownership points; dependency on matching incremental implementation supplies planning/specification transitively.
- Generated Codex/Claude/Harness artifacts and required discovery metadata only; preserve sibling exports and unrelated dirty changes.
- New `tests/task-packet-review-distribution.test.mjs`; extend existing relevant catalog/packaging/native-pattern tests where behavior changes.
- Update only this packet's item in `tasks/todo.md` and current `tasks/handoff.md`
  after all its required checks pass. Required scenario-managed journal writes
  remain MCP-owned; exclude workflow YAML from shell content searches/Git diffs.
- No approved requirement/technical-source edits, other packet execution, consuming-
  project skill mutation, global lifecycle changes or implied external authority.

## Acceptance and discriminating verification

The listed test files are **new to create** unless explicitly marked existing.
Work from repository root. Create each check before the owning production change,
run it, and retain the relevant RED; a missing import/harness alone is not semantic
proof. Implement minimal correct behavior, correct implementation while a correct
check fails, and apply the PROVE rule below. Fixtures must be non-sensitive and
owned; never mutate the original review target to prove a test.

| Criterion | Observable acceptance                                                                                                                                                                                   | Owning check and evidence                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| PTR-06-A1 | The new skill is explicit-only, matching-bundle checked, within size limits and preserves the existing general-review skill and implementation ownership.                                               | Generated metadata/manifest/body/reference tests across three targets; no automatic next workflow or packet effect. |
| PTR-06-A2 | DSH receives exact body plus separate meta and native foreground route; Codex ordinary agents perform the same complete stages; unavailable native engine can use actual ordinary independent contexts. | Source/generation/native-protocol contract tests; no host namespace or fabricated hook/timeout field.               |
| PTR-06-A3 | Phase-local investigator checks, evidence reuse, proportional isolation, existing-participant omission checks and bounded exact delivery survive rendered guidance.                                     | Discriminating entry/reference/fixture checks against the actual generated artifacts and scripted phase structure.  |
| PTR-06-A4 | No result filtering/empty fallback hides null actors, lost proof, incomplete coverage or timeout; report comes from acknowledged MCP finalization.                                                      | Structured-result and orchestration fault fixtures; all affected error paths remain explicit.                       |
| PTR-06-A5 | Each target contains only its own guidance/question/metadata/assets, and regeneration preserves sibling exports.                                                                                        | Existing generate/validate plus target-leakage, unknown-variable, bundle-layout and sibling-preservation tests.     |
| PTR-06-A6 | Actual model/provider preferences and capabilities are resolved per host; no fixed alias, silent substitution, implicit installation or claimed Claude native pass.                                     | Rendered host routes and unavailable-route contract fixtures; real host behavior remains qualification work.        |

**PROVE:** Individually filter out a null child, drop one fact direction, inject a cross-host guidance name, or allow a timeout to approve. The owning generated/runtime-boundary check must fail; restore.

Copy-ready local commands (the new test file must be created first):

```sh
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node --test tests/task-packet-review-distribution.test.mjs
rtk proxy node --test tests/catalog.test.mjs tests/deepseek-export.test.mjs tests/specification-review-workflow.test.mjs
rtk proxy npm run generate
rtk proxy npm run generate:check
rtk proxy npm run validate
```

## Completion, rollout and recovery

After focused checks and required PROVE restoration, run proportionate final
validation. Record actual PASS/FAIL/NOT TESTED, commands, input identities and
limitations; planned commands or another host's result are not passes. Required
failed/unavailable checks keep this packet incomplete. Recheck the pinned
`specification_check_state` and exact `planning_packet_check`, compare the scoped
diff with the agreed technical commitments, then update only this checklist item
and replace current handoff. Stop after this packet; optional code/security review
and a commit are separate invocations, not completion or next-packet gates.

Regenerate from canonical sources only. Native calls require a supported bounded caller; absent capabilities remain prerequisites. Global activation/reconnect and installation require separately scoped authority.

## Technical agreement

Accepted through the native question tool.

- Proposal: `PTR-06-skill-v1`.
- Agreement: `4001dbff-0012-415f-8d92-c334982810a8`, revision `2`.
- Proposal digest: `33558e18e25a1abda5c56851018148106e30070afac620e9a1ed6f0737869e2b`.
- Sources: this packet's `Technical proposal` and the plan's `Shared state commitments`.

Remaining execution details belong outside these hashed sources.
