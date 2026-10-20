# I01 — Prove the two existing Technical Design fixes

Status: Complete; packet checks and independent code/security reviews passed
Dependencies: None
Requirements: WR-002, WR-003, WR-013
Quality scenarios: Q01, Q02

## Exact inputs and preflight

- Project: this repository; specification slug `workflow-reliability-remediation`.
- source_version: `345c12557dec017f7dba829464bd36932d866eea21f42c37a1f18b40e8e988b1`
- specification_version: `c1b8042c6009a8a5522f9d5e79a5f25cd10f3104aa980f6aa02886eef49f1efa`
- review_ref: `b4668494-2caa-41fe-ae73-d756aa6082e0`

Working directory for every command: repository root. Node.js >=22.20.0 and the
repository's existing pinned dependencies are prerequisites. Before work and
completion call specification_check_state with the pinned source_version; fetch
only WR-002, WR-003, WR-013 through requirement_get using the pinned specification_version,
following every text/reference continuation. Read [C01](../contracts/mcp.md#c01--preserved-technical-design-contracts) and only the named entries in [quality/scenarios.yaml](../quality/scenarios.yaml).
These versioned contracts, not chat history, are the acceptance inputs.

Require a usable Git worktree with readable status and scoped tracked, staged and
untracked evidence. No clean tree or existing commit is required. Capture the
pre-edit state, preserve unrelated changes and reverify the source passages below.
The two fixes already exist; preserve their current state and validate it.
Also update only this packet's execution evidence, todo.md and current handoff.md.

## Outcome, boundary and scope

Owner: Technical Design validation and its existing regression tests.
Allowed production ownership: `packages/engineer-agent-workflow-mcp/src/product/technical.ts` (only a demonstrated missing guarantee), `packages/engineer-agent-workflow-mcp/test/product-technical.test.mjs`.
Paths beginning src/, test/ or test-support/ in this packet are relative to
packages/engineer-agent-workflow-mcp/; all other paths are repository-relative.

Evidence to reverify: `packages/engineer-agent-workflow-mcp/src/product/technical.ts:465` selects global versus stage-scoped applicability; `packages/engineer-agent-workflow-mcp/src/product/technical.ts:516` validates PRD pins by kind. Existing tests begin at `packages/engineer-agent-workflow-mcp/test/product-technical.test.mjs:316` and `:487`.

Implementation boundary: Reuse the existing validators and fixtures. This is a regression-proof packet, not a rewrite. Add only missing foreign-identity/empty-non-global/no-effect observations. Preserve accepted_target, exact PRD provenance and absence of Roadmap creation. Do not modify the original fixes merely to create a larger diff.

Non-goals: unrelated worktree changes; changing approved behavior or scope;
global configuration, installation, commits, releases; hand-editing generated
bundles or MCP-owned workflow YAML; executing any next packet. New behavior is
not authorized until this packet is explicitly invoked.

## Test-first acceptance and proof

1. Extend the existing tests first for every WR-002/003 counterexample not already asserted; run the current file and record which assertions are already GREEN.
2. In an isolated copy of the complete relevant dirty source snapshot, restore the old unconditional element_ids rejection. Run the decision-pin regression and observe its acceptance assertion fail. Restore that one mutation and verify GREEN.
3. Separately restore the old accepted_target-requires-stage rule. Observe the global-without-Roadmap assertion fail; restore it and verify GREEN. For no-write/no-Roadmap observations, introduce one controlled forbidden effect and show the snapshot/registry assertion catches it.
4. Retain a concise mutation description, failing assertion and final restored digests in the packet evidence. Never mutate the user's live dirty sources for PROVE.

Tests to create in this packet: extend the named existing suites/fixtures; create no mirror-of-implementation test.
Run the focused command after creating its discriminating checks and before
implementation; new filenames below are planned, not currently existing scripts.
Then implement, correct code until the valid assertions pass, and run required
PROVE. For an absence/structural claim use the stated actual snapshot/counter/trace,
not a copied implementation constant. A harness/import failure is not RED proof.

```sh
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node scripts/run-tests.mjs packages/engineer-agent-workflow-mcp/test/product-technical.test.mjs
```




Focused pass is necessary, not permission to skip a material shared-boundary test.
Broaden only for changed shared boundaries, new failures or unresolved evidence.
Record actual environment, commands, RED/GREEN/PROVE results and observed side
effects. A missing or failing required check keeps this packet incomplete.

## Compatibility, recovery and manual gates

Discard only temporary mutation copies after checking final digests. Preserve user changes and both working fixes. No storage/schema migration or runtime rollout.

MANUAL GATE: None for isolated checks. A real installation or commit is outside this packet.

No automatic user answer, reviewer verdict, installation or publication is allowed.
If a check fails, report the concrete next action and its established owner; when
the external owner is unknown, say so. Never assign a new duty to the user or
downgrade the required check merely to mark the packet complete.

## Completion and stop

Read back the changed state through owning public tools. Recheck the exact pinned
specification and review the scoped final diff, including staged/untracked files.
Mark this packet complete in [todo.md](todo.md) only after its required evidence
passes; replace [handoff.md](handoff.md) with the current result and next eligible
packet. Stop. Separate code/security review and commits are optional explicit
invocations, not completion or next-packet gates.

## Execution evidence — 2026-10-11

The authorized run follows [execution-workflow.md](execution-workflow.md):
independent code/security reviews are progression gates for this run. I01's own
implementation checks pass; the coordinator must record both reviews before
advancing. No next packet was executed by this implementer.

Environment: Linux, Node v24.20.0. The matching installed engineering-manual
verifier passed; Git reported a usable worktree with no staged files and existing
tracked/untracked changes. MCP confirmed Approved, reviewed coverage and exact
version pins before work and completion. WR-002/WR-003/WR-013 were read through
all continuations.

Added only three missing counterexamples to product-technical.test.mjs: foreign
PRD decision identity, empty non-global applicability, and foreign product
identity for an existing Roadmap stage. Each rejection compares all durable
store members and their byte digests before/after. Existing valid-input,
digest/lineage, accepted-state, provenance, registry and Roadmap-absence checks
were retained. technical.ts remained byte-identical to its pre-execution state.

Checks:

- Package build: exit 0.
- Focused product-technical.test.mjs after the final test edit: 5 passed,
  0 failed; exit 0.
- ESLint for the changed test file: exit 0.
- Isolated dirty-source snapshot build and complete focused file: exit 0.
  After each controlled mutation, rebuild succeeded, the named test failed
  for its intended behavior (exit 1), the source was restored, rebuilt, and
  the same test passed (exit 0). Final isolated file: 5 passed, 0 failed.

| Controlled mutation | Relevant RED/PROVE observation | Restored GREEN |
| --- | --- | --- |
| Reinstate unconditional nonempty element_ids check | Valid decision-pin authoring rejected with SOURCE_CHANGED in requireReadyPrd | Decision/Markdown regression passes |
| Reinstate accepted_target requires stage | Global target rejected with INVALID_INPUT and the original stage-required diagnostic | Global-target regression passes |
| Write a store member before rejecting empty Markdown pin | Full durable snapshot equality fails for empty semantic Markdown pin | Snapshot equality passes |
| Write a Roadmap document during accepted global-target authoring | Stored Roadmap-member absence assertion fails, true versus false | Registry/member absence assertions pass |

Each mutation was applied separately only in a temporary complete relevant
package source/test/schema snapshot. All builds and tests reached the expected
acceptance boundary; no import, syntax or collection error counted as proof.
Initial GREEN was already present because the two fixes predate I01; the explicit
isolated defect reintroductions supply their required RED/PROVE evidence.

Final live and restored isolated technical.ts SHA-256:
`048107dbff1dd0a5bb6a42c2a1225187c507d691c0d3cac9e19ff05917a5cd2f`.
Final live/isolated test SHA-256:
`ad69981eab7e4b386f4705860c73ae71e3684c7868f8d88914ec5f3014be9e83`.
The external execution report supplies exact baseline copies, incremental diff,
build/test logs, proof-results.json and final digests for independent reviewers.
Temporary mutation sources were discarded after restored digest verification.

No production behavior, public contract, schema, generated artifact, installation,
commit or publication changed. The full repository suite and external host/platform
qualifications were not required for this test-only slice and were not run.
Independent code review (`code_i01`) found no actionable defects and independently
reran the focused file: 5 passed, 0 failed. Independent security review
(`security_i01`) found no confirmed defects in provenance, applicability or
validate-before-effects boundaries. Both reviewers verified current files against
the saved final digests and inspected the four RED/restored-GREEN proof logs.
Neither claimed the later full-suite, host/platform or external checks passed.
The coordinator released I02 after both reviews completed.
