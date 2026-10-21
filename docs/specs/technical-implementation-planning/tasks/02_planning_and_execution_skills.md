# P02: Planning And Execution Skill Contracts

Status: Complete and verified on 2026-10-21 through the separate P02 invocation.

## Outcome and inputs

Make the generated Codex and Claude workflows obtain and follow a concrete
technical agreement for every packet. Requirements: TIP-001–008 and the workflow
parts of TIP-009–010. Consume exact requirements and the verified P01 public
scenarios; retain the shared runtime proposal in `plan.md` as the contract.

- `source_version`: `a46e18b6e78751f8a41ecc662ee507f7b7475e994c9111051d5b1eff3e3b000b`.
- `specification_version`: `a1a2739ae5c8d4ea86cac096da0e84cb5b86ded0f6b09081ca4d01873ae23967`.
- `review_ref`: `a1421d0b-f37b-4b76-a7ca-2a84de7066f3`.

Prerequisites: separate P02 authorization, current agreement, P01 complete with
its exact checks and tool contract, usable Git and current spec version. Read
the prior handoff rather than assuming an uncommitted P01 is absent. Do not
install or switch the active MCP/skill bundle implicitly.

## Technical proposal

Keep the planning entrypoint short. Add the unconditional sequence: inspect
evidence, propose concrete alternatives/recommendation, obtain agreement for
every task, record bindings, check readiness, produce staged packets. Put the
detailed interview and persistence procedure in one new conditional reference,
`skills/planning-and-task-breakdown/references/technical-agreement.md`.

That reference owns proposal-source headings, shared decision reuse, exact task
coverage, grouped/partial answers, actual native answer provenance, corrections,
pending questions and resumed discussion. Invoke the P01 technical scenarios,
not the behavioral specification question path. Keep behavioral changes routed
to specification. No question quota or invented alternative is added.

Extend the existing packet contract with a clear technical proposal, bounded
shared-source references, selected proposal digest and exact agreement ref.
Require every significant unit's responsibilities, contracts and interactions;
keep ordinary private helpers flexible. All binding technical commitments must
be in the hashed source sections. Packets expose implementation stages, test-first
steps and readiness without becoming full source-code listings.

Incremental execution checks agreement and specification prerequisites before
expensive reads or production edits, then rechecks after implementation. It
compares the scoped diff with agreed commitments and records the result in the
current handoff. A changed shared signature/ownership/pattern returns to planning;
a changed product requirement returns to specification. A harmless helper within
the agreed boundary remains permitted. Legacy tasks lacking qualifying evidence
return only the affected task to planning; no bulk migration or completed-task
rewrite occurs. Missing runtime capabilities produce a concrete prerequisite.

Use existing `{{HOST_*}}` variables and one authoritative template. Generated
outputs remain isolated per host. Update root shared guidance where it owns the
state-access contract; generate dependent copies. Do not edit installed skills.

## Allowed changes and evidence

- Planning and incremental canonical `SKILL.md` files and their affected
  references, including adaptive planning, task packets and packet recovery.
- Root `shared/references/yaml-contracts.md` and a minimal engineering-manual
  clarification only where needed to eliminate a contradictory older rule.
- Existing planning/incremental/workflow integration tests and focused fixtures.
- Both generated plugin bundles and skill-local shared resources through the
  existing generator; no unrelated hand-edited distribution files.
- P02 checklist/handoff state.

Evidence: planning `SKILL.md:38-63`, task packets `:41-116`, adaptive planning
`:98-105`, incremental `SKILL.md:21-62`, packet recovery `:17-38,92-101`.
The current root sources include newer bounded-context safeguards than the
installed skill; preserve current root behavior when changing the templates.

## Test-first sequence and acceptance

1. Define discriminating checks and scenario fixtures before template edits.
   Update `tests/planning-skill.test.mjs` and affected incremental/MCP integration
   checks to observe generated routing, packet bindings, readiness and recovery.
   Do not treat phrase matching as behavioral evidence; P03 supplies actual
   workflow behavior. New fixture cases must be identified as simulation.
2. Run the affected checks against current templates and record relevant RED.
   Existing files include `tests/planning-skill.test.mjs`,
   `tests/planning-mcp-preflight.test.mjs`, `tests/workflow-mcp-integration.test.mjs`
   and `tests/workflow-yaml-contracts.test.mjs`:
   `rtk proxy node --test tests/planning-skill.test.mjs tests/planning-mcp-preflight.test.mjs tests/workflow-mcp-integration.test.mjs tests/workflow-yaml-contracts.test.mjs`.
3. Implement the canonical changes; generate with `rtk npm run generate`.
   Verify the actual output for both hosts: native tool names, no foreign-host
   metadata, explicit invocation, description <=240 Unicode points and complete
   entrypoint <=4,096 UTF-8 bytes. Preserve mandatory verification and one-packet
   execution boundaries.
4. Establish structural PROVE: remove the readiness gate or route a technical
   answer to the behavioral journal in a temporary mutation and show the focused
   check fails. Restore before final checks.
5. Re-run the affected tests and `rtk npm run generate:check`,
   `rtk npm run validate`, `rtk npm run lint`. Inspect generated diffs for unrelated
   dirty-source effects; do not fix unrelated work merely to obtain green.

Acceptance includes represented alternatives and a recommendation, one-solution
confirmation, exact task coverage, grouped/partial/non-answers, shared decisions,
legacy blocking, material-change routing and local flexibility. The required
actual-host evidence is scheduled in P03; do not misreport it as already run.

## Completion and recovery

Use the shared RED/GREEN/PROVE and preservation rules in `plan.md`. A required
failed/unavailable check keeps P02 incomplete. Recheck the pinned spec, compare
the final change with the agreed proposal, update only P02 and handoff, stop.

## Agreement evidence

Agreed on 2026-10-21 through the repeated `functions.request_user_input` question
`skill_structure`. Exact question: «Для P02 согласовать предложенную структуру:
короткие правила в SKILL.md, подробный протокол в одном reference, технический
раздел и ссылки на согласование в карточках, проверки до и после incremental
implementation?» Exact answer: «Принять структуру (Recommended)».

Coverage: this packet's `Technical proposal`, including the focused reference,
packet bindings and incremental entry/final checks. The first call returned no
answers; the repeat was explicitly user-requested. See `plan.md` / `Technical
agreement` and `Bootstrap recording limitation` for the exact provenance and
one-time Markdown-only recording authorization. Agreement does not authorize
implementation or waive the P01 dependency.

## Implementation and verification

Implemented the agreed canonical entrypoint/reference split. The new
`references/technical-agreement.md` owns concrete recommendations, exact task
coverage, native answer provenance, partial/non-answers, shared sources, revisions
and legacy recovery. Task packets bind significant technical commitments to exact
source headings, agreement refs and proposal digests. Progress and selection
metadata remain outside hashed sections. Alternative contracts use distinct
headings, avoiding accidental agreement to incompatible solutions together.

Incremental checks agreement/specification before bulk implementation reads and
again before completion, compares the scoped diff with agreed commitments, allows
unconstrained private helpers and returns material changes to the owning workflow.
Preserved manual verification, Git preflight, bounded inputs, host planning mode,
test-first execution, required checks and the one-packet stop. Root YAML guidance
now routes technical history separately; its copies and both host distributions
were generated. Installed artifacts and real workflow YAML were not changed.

Validation from the repository root:

- RED: the four planned test files failed against the original templates on the
  missing readiness gate/protocol; missing-reference failures alone were not
  treated as proof.
- GREEN: `rtk proxy node --test --test-reporter=spec tests/planning-skill.test.mjs tests/incremental-skill.test.mjs tests/planning-mcp-preflight.test.mjs tests/workflow-mcp-integration.test.mjs tests/workflow-yaml-contracts.test.mjs tests/incremental-git-preflight.test.mjs tests/context-scouting.test.mjs tests/manual-verifier.test.mjs`
  passed 47 tests. After the final entrypoint wording adjustment, its four owning
  suites passed again (14 tests); unchanged results were reused.
- Existing isolated runtime simulation: `rtk proxy node --test --test-reporter=spec packages/engineer-agent-workflow-mcp/test/planning-decisions.test.mjs packages/engineer-agent-workflow-mcp/test/planning-packet-check.test.mjs`
  passed 23 tests. There are 70 distinct passing checks across these scoped runs.
- PROVE: independently removed the entry gate, removed the completion gate, and
  routed a technical question to the behavioral journal. Each owning structural
  assertion failed with exit 1; all originals were restored. Normalized local
  evidence: `.cache/technical-implementation-planning-p02-prove.json` (ignored).
- `rtk npm run generate`, `rtk npm run generate:check`, `rtk npm run validate`
  (17/17 skills), `rtk npm run lint` and scoped `git diff --check` passed. Initial
  oversized entrypoints were rejected, then shortened without dropping safeguards.
  Canonical planning/incremental sizes are 4088/4085 UTF-8 bytes; generated Codex
  sizes are 4017/3969, Claude sizes 4034/4025. Description, explicit-invocation and
  host-isolation checks passed.
- Final managed specification check remained `pass`, `approved`, `reviewed`, no
  issues or checkpoint write; all three pinned references above are unchanged.

Scoped diff comparison matches the agreed solution: one new protocol reference,
existing canonical entrypoints/contracts, generated copies and focused checks.
No runtime redesign, dependency, extra journal, independent-review gate or global
mutation was introduced. Unrelated roadmap-retirement work was preserved.
Structural checks and simulated MCP regression do not prove real host behavior;
P03 owns the Codex trials, repair loop and measured speed/quality comparison.
No required P02 check remains incomplete. Stop after P02.
