# I09 — Make architecture readiness explicit in generated skills

Status: Complete; corrected actual Q12 and both independent final code/security reviews pass
Dependencies: I01
Requirements: WR-011, WR-013, WR-014
Quality scenarios: Q12

## Exact inputs and preflight

- Project: this repository; specification slug `workflow-reliability-remediation`.
- source_version: `345c12557dec017f7dba829464bd36932d866eea21f42c37a1f18b40e8e988b1`
- specification_version: `c1b8042c6009a8a5522f9d5e79a5f25cd10f3104aa980f6aa02886eef49f1efa`
- review_ref: `b4668494-2caa-41fe-ae73-d756aa6082e0`

Working directory for every command: repository root. Node.js >=22.20.0 and the
repository's existing pinned dependencies are prerequisites. Before work and
completion call specification_check_state with the pinned source_version; fetch
only WR-011, WR-013, WR-014 through requirement_get using the pinned specification_version,
following every text/reference continuation. Read [C09](../contracts/mcp.md#c09--architecture-readiness) and only the named entries in [quality/scenarios.yaml](../quality/scenarios.yaml).
These versioned contracts, not chat history, are the acceptance inputs.

Require a usable Git worktree with readable status and scoped tracked, staged and
untracked evidence. No clean tree or existing commit is required. Capture the
pre-edit state, preserve unrelated changes and reverify the source passages below.
Dependency readiness means recorded passing acceptance evidence for I01, not merely a checked label or a commit.
Also update only this packet's execution evidence, todo.md and current handoff.md.

## Outcome, boundary and scope

Owner: Canonical Technical Design skill and evidence-based authoring checks.
Allowed production ownership: `skills/technical-design/SKILL.md`, `skills/technical-design/references/technology-decisions.md`, relevant authoritative `shared/references/product-workflow.md` only if common behavior changes; tests/fixtures and generated bundles via generator only.
Paths beginning src/, test/ or test-support/ in this packet are relative to
packages/engineer-agent-workflow-mcp/; all other paths are repository-relative.

Evidence to reverify: `skills/technical-design/SKILL.md:18` routes technology decisions and readiness review; `references/technology-decisions.md:1` already requires material choices before review. `tests/product-authoring-skills.test.mjs` owns host workflow checks.

Implementation boundary: Put the unconditional pre-review checkpoint in the canonical SKILL entrypoint; keep proportional examples and detailed lenses in its scoped reference. Require visible component diagram/flows/state ownership and resolved user-owned technology tradeoffs; explicitly label unverified integrations and justified N/A. Reuse existing records and independent product review, not a new truth-detection validator. Generate both host bundles from one source and retain size/explicit-invocation limits.

Non-goals: unrelated worktree changes; changing approved behavior or scope;
global configuration, installation, commits, releases; hand-editing generated
bundles or MCP-owned workflow YAML; executing any next packet. New behavior is
not authorized until this packet is explicitly invoked.

## Test-first acceptance and proof

1. Before text changes add fixtures for missing technology consent, hidden DB owner, omitted data flow and asserted unverified integration; a successful trace must show presentation and resolution before review starts.
2. Add the compact no-extra-infrastructure case. Assert that removing the mandatory checkpoint or moving all obligation into an optional unread reference fails the appropriate executable skill check.
3. Generate then run skill/packaging checks. Keep simulation labels. Run a fresh-context actual-host trial for each changed host behavior with actual model/tool evidence; a source-text assertion alone cannot pass live execution.
4. PROVE semantic-order/absence fixture assertions with one deliberate missing checkpoint each, then restore authoritative templates and regenerate.

Tests to create in this packet: extend the named existing suites/fixtures; create no mirror-of-implementation test.
Run the focused command after creating its discriminating checks and before
implementation; new filenames below are planned, not currently existing scripts.
Then implement, correct code until the valid assertions pass, and run required
PROVE. For an absence/structural claim use the stated actual snapshot/counter/trace,
not a copied implementation constant. A harness/import failure is not RED proof.

```sh
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node scripts/run-tests.mjs tests/product-authoring-skills.test.mjs tests/packaging.test.mjs tests/skill-document.test.mjs
rtk proxy npm run generate
rtk proxy npm run generate:check
rtk proxy npm run validate
```

For actual-host checks, prepare the fixture cases from Q12 in isolated stores/homes; open a fresh Codex or Claude Code context using its generated skill, invoke technical-design, supply only the fixture's explicitly labeled simulated answers, and retain the ordering/tool trace. The existing scripts/qualify-product-workflows.mjs --run entry point supplies Codex trials only and is not a Claude result. Record actual host/model and all missing capabilities; do not invent a passing Claude trial.



Focused pass is necessary, not permission to skip a material shared-boundary test.
Broaden only for changed shared boundaries, new failures or unresolved evidence.
Record actual environment, commands, RED/GREEN/PROVE results and observed side
effects. A missing or failing required check keeps this packet incomplete.

## Compatibility, recovery and manual gates

Only canonical sources are edited; generated copies are disposable outputs. Preserve host-specific tool names and the <=4096-byte SKILL limit. No installed-copy edits or automatic plugin update.

MANUAL GATE: Actual Codex/Claude trial access must be available before claiming their live checks passed. User answers in fixtures are simulation only.

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

## Current execution evidence — 2026-10-12

Initial Q12 owner ordering failed and both initial independent reviews completed.
Coordinator accepted F01/F02/F03; immutable initial evidence remains under
artifacts/workflow-reliability-remediation/i09/ and coordinator review artifacts.
The correction makes the owning gate explicit before new/resumed draft checks,
including direct/session diagnostic calls, and requires a current component/flow
schema in an assistant message. Source/tool reads do not count as presentation.
One canonical source generates both hosts; final entrypoints are 4061/3969/4024
UTF-8 bytes. No production MCP role/semantic enforcement was added.

Final related authoring/packaging/document checks pass 49/49; I01 regression 5/5;
generation/check, build, lint and 17-skill validation pass. Relevant RED and
canonical/Codex/Claude upfront/diagram-obligation PROVE mutations fail their
intended checks and restore GREEN. Fixture gateway controls 41/41 and native
once-approval controls 34/34 pass; reviewer direct/nested dispatch counters0.
Actual boundary controls pass: Codex runtime11/snapshot14/contract18; Claude
builtin closure14/snapshot17/contract21. Controls include usable positive
references/verifier and denied foreign/symlink/interpreter/trusted writes,
child environment leakage and immutable source/contract writes.

Required corrected Q12 passes on both actual configured hosts/default models.
Final Codex assistant diagram949 precedes first native gate attempt950, completed
check951 and full review955 (15 pending/0 verdicts,2 exact saved answer records).
Final Claude diagram309 precedes first check333 and full review381 (16 pending/0,
4 exact saved answer records). All attempts, including refused nested/direct calls,
are inspected; no forbidden author reviewer/activation attempt or incomplete
session delivery occurs. Readiness checks retain only REVIEW_REQUIRED. Native
answers are SIMULATION ONLY, not real consent or independent review verdicts.

The same candidates/stores preserve actual saved answer provenance through fresh
continuations. Exact public owned draft Markdown and current published review
contracts use approved immutable per-file routes inside already granted workspace
permissions. Claude full native Read and Codex54 contiguous bounded native reads
reconstruct the same18776-byte contract SHA256 exactly. Invalid guessed arguments,
blocked readers, declined approvals, startup/capacity and timeouts remain retained
failures/limits. Two actual Codex once-approvals match unique active MCP items,
strict schemas/audited dispatch and successful native results; they never persist
permission or replace product consent.

Six original workloads and nine historical actual dispositions remain explicit
in the correction acceptance matrix. Missing-choice invalid-response evidence is
not a genuine empty answer; flow fixture contamination and unsupported integration
recovery stay disclosed. No pristine12-case Cartesian rerun or natural final
prose is added as a gate. Linux / Node24.20.0 evidence only; broader integrated,
platform and external compression qualification remains for later packets.

Durable correction evidence: artifacts/workflow-reliability-remediation/i09-correction/
report.md, acceptance-matrix.json, final-freeze.json, final-evidence-inventory.json,
i09-correction.diff, native traces/readbacks and qualification certificates.
Captured initial11 preimages and6 explicitly DERIVED generated marker preimages
are distinguished. The pinned specification remains Approved/pass/reviewed with
no scope/source drift. No commit/install/publication/global change/I10 was done.

Both independent final reviews pass on freeze
ccf1942c29b3eba1dfc087bf10368ed5016eb99ddc583b1f861188c478d5ba4e.
Final code/security reports are under i09-final-code-review/ and
i09-final-security-review/ in the same local evidence root. The coordinator
independently verified hashes and preserved all reviewed execution documents
before administrative status updates; coordinator/i09-final-review-disposition.json
records the disposition. The sole checklist now marks I09 complete.
Next action: coordinator releases I10; the I10 writer owns its scoped implementation
and evidence, followed by both independent reviews. No I09 correction remains.
