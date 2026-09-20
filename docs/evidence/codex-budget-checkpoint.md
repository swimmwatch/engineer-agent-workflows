# Codex Budget Checkpoint — 2026-09-05

## Scope and Evidence Boundary

The user shortened the campaign with 18% account usage remaining and requested
an approximately 10% reserve. No new model invocations were started after that
instruction. Native Claude, new Terra/UI trials, full-matrix reruns and holdouts
are deferred. Both generated bundles still receive deterministic validation.

Packet 14 and Decision Reader Packet 03 remain incomplete. Stable complete
matrix passes: **0 of 2**. No commit, publication, global installation, client
configuration mutation or Packet 10 work occurred.

Private durable run: `2026-09-05-codex-finish-NH8Bt4` in the existing local
workflow-run archive. It contains original baselines, private evaluators,
prompts, native traces, MCP exchanges, source hashes and final local-check logs.
Private machine paths are intentionally not part of published artifacts.

## Native Observations Before the Guidance Correction

| Trial | Observed result | Qualification limit |
| --- | --- | --- |
| Lite specification | The first Sol turn saved a required question and stopped after the native tool reported unavailable. A later explicit simulation reply produced an Approved specification. | The continuation also executed `tail` on the journal and a full local YAML parse for final tracing. Workflow **FAIL**, despite correct product text and exit 0. |
| Changed-source planning recovery | Real native `STALE_CURSOR`; Sol restarted the search, completed every page and fetched all four current records at the new source version. | The first saved page came from a real SDK simulation checkpoint, not a prior model. The run was intentionally interrupted after recovery; no plan or full-loop pass is claimed. |
| Deep answer capture | All seven logging guarantees remained in the generated specification. | The normalized answered decision retained only the metrics contract. The narrower durable-ledger capture defect remains open; specification stayed Needs input with a further unanswered recovery question. |
| Backend and browser preparation | Original backend baseline and private HTTP evaluator preserved. Real Cloakbrowser MCP initialize/tools-list succeeded. | No new backend/UI actor execution. Browser-process egress isolation and complete UI acceptance are unverified. |

Native sessions:

- Lite: `01a0725c-838c-7d13-aa5c-50076ca09abb`, followed by the fresh
  continuation recorded in `lite-current/specification-02/ACTOR-result.json`.
- Changed source: `01a07269-7d67-7b90-bf36-577d1e03faf9`.
- Deep: `01a07266-17cf-76a1-961d-5fe88d1a6f28`.

The changed-source launcher received SIGTERM under the budget instruction,
recorded no surviving process group and preserved all project/source/runtime
hashes. The Deep actor exited normally. No native actors remain running.

## Narrow Correction and Test Evidence

The shared test-discipline reference now makes MCP-only inspection explicit
even when the reader is available. This includes patch-context lookup, syntax
validation and requirement tracing; ordinary authorized editing remains
separate. A reproducible model case is recorded in
`tests/fixtures/workflow-loop/decision-reader.json`.

The same reference now supplies a compact unanswered protocol-1 YAML example:
root metadata, scalar provenance, question fields and answer mapping semantics.
The Lite actor previously inspected reader source files to discover these
fields. This example supplies that missing authoring contract inside the bundle.

`tests/decision-authoring-contract.test.mjs` first failed because the sample
was absent. It now sends the canonical and both generated examples to the real
stdio MCP, resolves a simulated answer revision, retrieves the historical
revision and verifies rejection of missing root metadata and malformed
provenance/question fields. An intermediate failure came from shared object
references causing the test serializer to emit unsupported YAML aliases;
cloning the simulated revision corrected the test fixture without weakening
reader validation.

Both bundles were regenerated from the authoritative source. These are
**deterministic checks, not proof that the revised instruction changes model
behavior**. No new native forward test or independent review of this guidance
correction was run under the reduced budget.

## Local Checks

`final-checks-01/CHECKS.json` and its individual logs record:

- `npm test`: **200/200 PASS**, including the build pretest.
- `npm run lint`: PASS.
- `npm run validate:foundation`: PASS.
- `npm run generate:check`: PASS for 15 skills.
- All three affected generated Codex skill quick validators: PASS via Python 3.
- `git diff --check`: PASS.

The root journal was updated through ordinary authorized edits and read back
through real MCP: 104 revisions, 81 current decisions, zero multiple-current
warnings. Its verified source version is
`0f35a6d4e7542b1217632a26dcd441af1d5cdd746a0b8d5a6770d78f5b8e4b6c`.

## Next Authorized Work After Budget Renewal

1. Repeat the new available-reader regression in a fresh context using the
   corrected generated bundle; confirm there is no direct journal inspection.
2. Repair and forward-test the narrower Deep answer-capture defect. Preserve
   the original supplied reply and do not coach actors with the expected fix.
3. Qualify current-runtime Terra incremental execution and one-packet stopping.
4. Freeze a complete candidate, then run the agreed Codex matrix twice without
   source changes, followed by two genuinely unseen holdouts and safeguards.
5. Keep Claude and actual browser 200% zoom explicitly unverified unless the
   user authorizes their deferred work.

Old trial fixtures retain their old generated hashes. Do not overwrite them or
credit them to the corrected candidate; prepare new derived fixtures on resume.
