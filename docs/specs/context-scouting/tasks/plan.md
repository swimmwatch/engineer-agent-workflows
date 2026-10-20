# Context Scouting Implementation Plan

Status: Planned; no implementation packet has been executed.

## Authoritative inputs

- [Specification](../spec.md): Approved; Standard; `core` only.
- MCP `source_version`: `24915e1971002d58ec790420af4034f89ae1f355fcdc987227aac2f19e0c9732`.
- MCP `specification_version`: `992dfdc963c5307a6e1333a1057c133f91f766fb2adb9626d0c28d10e23b1942`.
- MCP `review_ref`: `590cd413-dba5-4a88-b1c4-e790755556ac`.
- Scope confirmed, review complete, approval checkpoint recorded. All 11 exact
  requirements were read through MCP, including every continuation.
- No additional profile contracts or project design artifacts are declared.
  Architecture stays here; no design-planning stage is needed.

Before each packet, open this specification through MCP and call
`specification_check_state` with the pinned aggregate `expected_source_version`.
Retrieve only the packet's requirement IDs with `requirement_get`, using the pinned
specification version as its `source_version`. Do not read workflow YAML directly.
Changed behavior or scope returns to specification; do not silently rebase the plan.

## Delivery sequence

| Packet                                        | Independently verifiable outcome                                                              | Dependency      |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------- |
| [CS-P01](01_skill_and_distribution.md)        | Canonical skill, named model rendering, generated artifacts, and discriminating static checks | Approved inputs |
| [CS-P02](02_behavior_and_global_migration.md) | Native behavior evidence and safe removal of the global rule after replacement checks pass    | CS-P01          |
| [CS-P03](03_developer_documentation.md)       | Durable usage and maintenance guidance describing verified behavior                           | CS-P02          |

The [todo](todo.md) is the only completion checklist. Each explicit implementation
invocation executes one packet, updates the checklist and [handoff](handoff.md),
and stops. Optional code/security reviews and commits are not packet gates.
Planning authorizes no execution, installation, commit, or publication.

## Existing evidence and constraints

Re-verify these locations before edits; line numbers describe the inspected tree.

- `scripts/lib/catalog.mjs:8-25,202-226`: `APPROVED_SKILL_NAMES` owns the ordered
  inventory; `validateCatalog` rejects mismatched names, order, and count.
- `catalog/skills.json:6`: standalone policies use no dependencies, disable implicit
  Codex invocation, and preserve explicit Claude user invocation.
- `scripts/lib/distribution.mjs:42-59,183-218`: `HOST_TEMPLATE_VALUES` and
  `renderHostTemplate` already handle host-specific values and strict rejection.
- `scripts/lib/distribution.mjs:306-322,466-620`: source collection and generated
  file mapping own canonical skills, host copies, references, and Codex sidecars.
- `scripts/generate.mjs:39-78`: `generateRepository` validates before generating;
  check mode compares expected outputs without writing.
- `tests/host-model-roles.test.mjs:1-24`: direct renderer regression tests.
- `tests/context-discovery-skills.test.mjs:53-106`: analogous metadata, source-size,
  and portability checks. Later fixture assertions are not live-model proof.
- `tests/lib/fixtures.mjs:20-66`: `makeTempTree` and `copyReleaseSource` provide
  isolated files and cleanup; reuse these rather than adding another fixture layer.
- `tests/catalog.test.mjs:19-32` and `tests/product-planning-skills.test.mjs:49-53`
  currently assert 16 skills. The new approved inventory contains 17.
- `README.md:19-36,75-79,126-134`: current inventory, advisory model roles, and the
  distinction between opt-in behavioral trials and ordinary tests.
- The current global Codex `Context Gathering And Delegation` section was inspected
  read-only. It contains the source policy and old model defaults. Its actual path
  is deliberately omitted from repository artifacts and must be resolved at execution.
- `.prettierrc.json` already enables matching MCP/Prettier formatting. This workstream
  must not redo that completed maintenance or edit MCP-owned YAML with file tools.

The working tree contains substantial pre-existing changes, including renderer and
product tests. Preserve their exact hunks. A clean tree or existing commit is not
required; readable tracked, staged, and untracked evidence is required. Do not reset,
stash, mass-format, or regenerate over unrelated work without reconciling the diff.

## Architecture and ownership

| Unit                                                                                               | Inputs, outputs, and dependency direction                                                                               | Lifecycle, errors, and invariants                                                                                                               | Requirements / verification                                              |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Catalog: existing `APPROVED_SKILL_NAMES`, `validateCatalog`, `catalog/skills.json`                 | Approved skill identity and policies → validated ordered metadata → generator                                           | Add standalone `context-scouting` after `context-engineering`; exact inventory; no new dependencies                                             | CS-001, CS-009; catalog and generated-policy checks                      |
| Canonical instructions: proposed `skills/context-scouting/SKILL.md` and `references/delegation.md` | Explicit task, host schema, applicable guidance → direct lookup or bounded scout assignment → evidence summary/fallback | Main agent owns task state; fresh scout preferred; reference read only when delegation is selected; no hidden standing activation or mutation   | CS-001–CS-008, CS-011; body/reference contract checks plus native traces |
| Renderer: existing `HOST_TEMPLATE_VALUES`, `renderHostTemplate`                                    | Canonical `{{HOST_SCOUT_MODEL}}` → `gpt-6-luna` in Codex, `haiku` in Claude Code                                        | Extend the existing allowlist only; keep author/implementation/review values unchanged; unknown variables still fail                            | CS-003, CS-009; renderer and leakage mutations                           |
| Distribution: existing `collectReleaseSource`, `buildGeneratedFiles`, `generateRepository`         | Catalog + canonical files → matching host skill/reference/sidecar files                                                 | Generated copies are never hand-edited; no production process or new lifecycle CLI                                                              | CS-009; deterministic generation and validation                          |
| Qualification: proposed `tests/context-scouting.test.mjs` and `tests/fixtures/context-scouting/`   | Generated instructions, controlled source inputs, native traces → static assertions and bounded acceptance observations | Reuse Node test infrastructure; assertions on fixtures alone do not prove model behavior; evidence distinguishes simulation from live execution | CS-001–CS-009, CS-011; packet-specific checks                            |
| Global migration: bounded operator procedure, not a shipped module                                 | Verified replacement + freshly resolved global guidance → removal of one exact section + read-back                      | Preserve unrelated bytes, permissions and concurrent edits; missing section is no-op; guarded recovery outside repository                       | CS-010; isolated trials and real scoped verification                     |
| Documentation: README and proposed `docs/context-scouting.md`                                      | Verified implementation/evidence → usage, boundaries, troubleshooting                                                   | Host model selection for scouts is distinct from advisory workflow models; no new implementation or installation authority                      | CS-001, CS-003, CS-008–CS-011; independent reader acceptance             |

Use one new model placeholder. Keep the effort rule portable text: request `medium`
only when the host exposes and supports it, omit nonexistent fields, and use the
approved fallback when a requested supported setting cannot be applied. No new
configuration schema, custom subagent registry, MCP tool, or execution wrapper is needed.
The delegation reference owns assignment/result details, source-order rules, reuse,
and source verification; it does not hide unconditional activation/safety/model rules.

## Requirement coverage and observations

| Requirement | Owning packets | Discriminating observation                                                                                                               |
| ----------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| CS-001      | P01, P02       | Explicit-only metadata; selected body read only on invocation; repeated/current/new task trace                                           |
| CS-002      | P01, P02       | Known-file case avoids skill-requested spawn; multi-file case produces bounded assignment; added scout has independent work              |
| CS-003      | P01, P02       | Rendered named model and actual supported spawn arguments; no model-shopping calls or silent inherited model                             |
| CS-004      | P01, P02       | Inspection-only assignment, exposed restrictions, native tool trace and file-state comparison; no scout writes/children/substitute tasks |
| CS-005      | P01, P02       | Complete bounded assignment; applicable guidance order; no fabricated project/index or unrelated context                                 |
| CS-006      | P01, P02       | Evidence locations resolve; incomplete/no-match result retains scope limits and caveats                                                  |
| CS-007      | P01, P02       | Main-agent decisive-source verification and targeted reuse; stale result is not accepted as current                                      |
| CS-008      | P01, P02       | One limitation disclosure, bounded fallback, no blind retry; cancellation stops further dependent work                                   |
| CS-009      | P01, P02, P03  | Catalog, byte/code-point limits, isolated host outputs, generation parity, separately labeled native evidence                            |
| CS-010      | P02, P03       | Isolated exact-section deletion/no-op/recovery checks, then real guarded read-back with unrelated bytes preserved                        |
| CS-011      | P01, P02, P03  | Reports without usage evidence say unmeasured; no invented savings or inferred price guarantees                                          |

## Environment coverage

Development and generation use the existing Node.js >=22.20.0 contract. No new
OS-specific runtime is introduced. Local version commands reported Codex CLI
`0.159.2` and Claude Code `2.1.278` on 2026-10-07. These are candidate execution
environments, not certified support floors. Account access, effective subagent model,
native trace visibility, and isolated-session behavior have not been qualified.

| Environment                               | Planned evidence                                                                             | Current status                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Existing Node test/generation environment | P01 copy-ready commands and temporary source trees                                           | Available; implementation checks not run in planning |
| Codex native client                       | P02 scenario prompts against generated Codex skill; inspect callable schema and native trace | CLI found; target skill/model behavior unverified    |
| Claude Code native client                 | Same P02 scenarios with generated Claude skill and `haiku` selection                         | CLI found; target skill/model behavior unverified    |
| Unsupported/missing native capabilities   | P02 controlled capability simulations plus actual fallback when observable                   | Planned; simulation must remain labeled              |
| Actual global guidance                    | P02 manual migration after replacement checks                                                | Read-only inspection only; removal not performed     |

Re-read official host documentation when selecting an invocation/trace mechanism at
execution, and record exact client/schema evidence. Prefer the current callable native
interface; never invent flags or create a nested CLI from the skill. A missing required
native observation keeps P02 incomplete. Do not silently narrow host support, claim a
simulated pass as live proof, install software, or change account configuration.

## Verification, rollout, and recovery

P01 owns static RED/GREEN/PROVE and generation parity. P02 owns native scenario traces
and migration trials before the real global change. P03 owns documentation acceptance.
Each packet names its checks before implementation and corrects implementation until
correct checks pass. Mutation checks cover new absence/structure assertions; keep
mutations in temporary copies and restore them before final verification.

Generated output is prepared and verified before global-rule removal. Installation
status is reported separately: prepared artifacts do not imply global installation.
Installation, account changes, commits, and publication remain outside these packets.
Revert only packet-owned source hunks and regenerate their corresponding outputs when
rolling back skill changes. Recover global guidance only from the verified exact
removed section without overwriting intervening edits. Keep private backups and raw
traces outside tracked/published artifacts.

## Documentation decision

A separate final documentation packet is warranted: explicit task-scoped invocation
after removing a standing rule is non-obvious, silent inheritance can change model
cost, and operators can confuse prepared artifacts with installed skills. Extend the
README's existing inventory/model discussion and add one focused usage page after
native behavior and migration are verified. Do not rewrite historical evidence reports
or create a broad new architecture guide.
