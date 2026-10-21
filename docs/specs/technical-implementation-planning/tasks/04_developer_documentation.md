# P04: Developer Documentation And Handoff

Status: Complete — implemented and verified under the separate P04 invocation.

## Outcome and inputs

Document the verified runtime and workflow behavior so a new maintainer can
operate and diagnose it. Requirements: TIP-001, TIP-004–010. P03 must be complete
with actual evidence before this final documentation packet is completed.

- `source_version`: `a46e18b6e78751f8a41ecc662ee507f7b7475e994c9111051d5b1eff3e3b000b`.
- `specification_version`: `a1a2739ae5c8d4ea86cac096da0e84cb5b86ded0f6b09081ca4d01873ae23967`.
- `review_ref`: `a1421d0b-f37b-4b76-a7ca-2a84de7066f3`.

Prerequisites: separate P04 authorization, agreement, verified P01–P03 results,
usable Git and current specification. Inspect the already-dirty MCP README and
preserve unrelated changes; overlap needs explicit disposition.

## Technical proposal

Extend the existing `packages/engineer-agent-workflow-mcp/README.md` for public
scenario examples, supported runtime capability checks, safe resumption,
legacy behavior and the distinction between physical context freshness and
behavioral specification freshness. Keep `shared/references/yaml-contracts.md`
as the authoritative workflow state-access rule; refine it against completed
implementation rather than duplicating its instructions into another guide.

Explain one concrete planning-to-implementation flow, group/partial agreement,
source drift and return-to-owner cases. State that recorded answers do not
authenticate human consent and that technical labels cannot validate semantic
conformance. Name stable entry points and exact real tool fields. Describe
missing runtime capabilities and separately authorized refresh without adding
an installer or silently enabling a plugin.

Use English repository documentation and concise examples. No new standalone
architecture document or source/requirement mapping is needed. Generate any
shared copies through the existing generator. Preserve the earlier scoped
decision that this bootstrap plan's recording method is exceptional, if granted;
do not advertise that exception as a general fallback.

## Verification

Before editing, define this executable/reader checklist:

- A fresh reader can explain why a technical answer changes an opaque context
  but not the reviewed specification version.
- The reader can trace one accepted packet, one partial answer and one stale
  shared proposal to the correct public calls and owning workflow.
- The reader can distinguish legacy/missing-capability blocking from missing
  implementation authorization, and identify the permitted recovery.
- Example calls validate against the actual built runtime metadata and execute
  against an isolated fixture where execution is appropriate.

Read the existing documentation first and record which observations are missing
(documentary RED). Write the smallest coherent update. Use a separate fresh
reader for the stated reader check, as required by the planning documentation
reference; provide the actual document and fixture behavior, not expected
answers. Fix concrete gaps and preserve their evidence.

Run `rtk proxy node_modules/.bin/prettier --check packages/engineer-agent-workflow-mcp/README.md shared/references/yaml-contracts.md`,
then `rtk npm run generate`, `rtk npm run generate:check` and focused documentation/
workflow contract checks affected by the edit. Do not rerun the whole model matrix
for prose-only changes unless an example or contract change warrants it.

## Completion

Required check failures leave P04 incomplete. Review the scoped diff, recheck
the specification and agreement, update only P04 in the checklist and replace
handoff with final verified state, exact commands and limitations. Stop without
commit, installation, publication or another workflow invocation.

## Agreement evidence

The earlier `qualification_docs` answer corrected P03 without independently
approving P04. The subsequent joint P03/P04 question explicitly covered the
existing documentation update and fresh-reader check. It received this answer
through `functions.request_user_input_async` on 2026-10-21, item
`["request_user_input_async","call_d5321b9c1c384b3c9cdfc113751a2155",0]`:

> Учти, что в нашем бенчмарке проверки мы также должны делать исправления, чтобы как раз увидеть и улучшить работу. То есть если качество будет неприемлемое, то есть слишком долго или некачественно будет, то надо будет исправлять.

Coverage: the presented P03/P04 proposal with a repair-loop amendment in P03;
this packet's documentation approach remains as presented. The exact joint
question is retained in `plan.md` / `Technical agreement`. No documentation
implementation is authorized by this planning agreement alone.

## Implementation and verification evidence

Implemented on 2026-10-21 under the user's separate incremental-implementation
invocation. The agreed Technical proposal and all three pinned specification
references above remain unchanged. This plan retains its explicitly authorized
Markdown-only bootstrap agreement; documentation offers no such general fallback.

The existing MCP README now explains the six scenarios, serving capabilities,
exact group/partial/resume examples, shared-source drift and recovery, and the
separate execution-authorization boundary. The authoritative shared YAML reference
clarifies physical context freshness versus behavioral review freshness and
current-revision reads. All copies were generated normally. The preexisting
README correction-mapping paragraph was preserved byte-for-byte; unrelated dirty
work and managed workflow state were not changed.

Documentary RED: the old README failed the executable reader checklist with
`Missing executable technical-prepare example`; it did not demonstrate partial
answers, continuation or drift. GREEN: four JavaScript fragments extracted from
the formatted README executed through actual built stdio MCP on an isolated
temporary project. Twelve calls matched executable schemas and live `tools/list`
metadata. Observations were p1 `ready`, p2 `needs_agreement`, then p1/p2 `stale`
and independent `ready` after shared-source drift. The prior p1 agreement and
behavioral source/specification/review versions remained unchanged. Answers and
setup are explicitly SIMULATION, not authenticated human consent.

The first probe failed because Ajv 6 cannot validate the serving Schema 2020-12
dialect. The harness was corrected to use built executable Zod schemas with
equality to advertised schemas except descriptions. No runtime validation or
assertion was removed. PROVE replaced the example's pinned source version with
an incorrect digest: execution failed with `SOURCE_CHANGED`, exit 1. The
unmodified example passed again, exit 0. Exact local logs and the one-off probe
remain ignored under `.cache/technical-implementation-planning-p04/`.

A separate fresh-context reader, `/root/p04_fresh_reader`, read the actual
documents and fixture/probe results. It explained version separation, accepted,
partial, resumed and stale cases with exact public references and owners, and
legacy/runtime blocking versus execution authority and permitted recovery. It
found no error or blocking ambiguity. It inspected actual schema/execution
evidence without claiming a second independent execution.

Commands run at the repository root:

- `rtk npm run build`: passed.
- `rtk proxy node .cache/technical-implementation-planning-p04/check-docs.mjs`:
  GREEN/restored passed; `--mutate` intentionally exited 1 with `SOURCE_CHANGED`.
- `rtk proxy node_modules/.bin/prettier --check packages/engineer-agent-workflow-mcp/README.md shared/references/yaml-contracts.md`:
  passed after scoped formatting.
- `rtk npm run generate`, `rtk npm run generate:check`, `rtk npm run validate`:
  passed for all 17 skills.
- `rtk proxy node --test tests/planning-skill.test.mjs tests/planning-mcp-preflight.test.mjs tests/packet-completion-contract.test.mjs tests/host-project-instructions.test.mjs packages/engineer-agent-workflow-mcp/test/planning-decisions.test.mjs packages/engineer-agent-workflow-mcp/test/planning-packet-check.test.mjs packages/engineer-agent-workflow-mcp/test/tool-metadata.test.mjs`:
  50 passed, zero failed/cancelled/skipped.
- `rtk proxy node scripts/verify-workflow-evidence.mjs docs/evidence/technical-implementation-planning-precision-v3/evidence.json tests/fixtures/workflow-loop/technical-agreement-registry.json`:
  passed with no findings or comparison findings; behavior certification is false.
- Scoped `rtk proxy git diff --check`, final diff and exact technical proposal
  comparison: passed, with no material substitution or unrelated overwrite.
- Entry/exit `specification_check_state` with this packet's pinned
  `expected_source_version`: pass/approved/reviewed, unchanged three references;
  approval checkpoint not rewritten.

All required checks passed. The full repository suite and expensive model matrix
were not repeated for prose-only work; P03's immutable qualification, accepted
tradeoff and documented limits remain supporting behavior evidence. Live Claude
behavior remains unverified. No permanent test framework, standalone architecture
document, commit, installation/configuration or publication was added. No next
implementation packet remains.
