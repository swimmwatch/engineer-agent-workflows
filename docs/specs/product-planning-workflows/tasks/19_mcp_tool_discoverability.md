# P19: Accurate MCP tool and parameter descriptions

Status: Complete. Specification review passed; P16 dependency complete.
Authorization: separate explicit packet invocation.
Requirements: PWF-018, PWF-019, PWF-021, PWF-033, PWF-034.
Dependencies: [P16](./16_existing_workflow_integration.md).
Consumers: [P17](./17_crossplatform_end_to_end_qualification.md), then P18.

## Additional session-report cases

Use the [BR-01–BR-11 disposition](../../../reports/workflow-session-bug-report-validation.md).
The following refinements stay within metadata/reference scope under PWF-034:

- Explain that context/cursor/receipt display markers are not actual values.
  Forward original structured fields where the host supports orchestration;
  retrieve exact originals where available. Never reconstruct opaque tokens or
  bypass context checks using project/slug on mutation tools.
- Pending question refs are intentionally bounded; use `decision_get` and its
  continuations for exact saved text and option IDs. State actual link-batch
  limits and use each successful mutation's new context and returned revisions.
- `specification_open.artifacts` lists managed YAML slots, not every file.
  Keep its existing name/values. Explain check-state document-status fields
  only if P20 has implemented its separately approved additive contract.
- Full review records every item and then completes. Final consistency is only
  for an unfinished followup after detailed checks. Before source-changing
  correction, explain why a full review may be necessary; do not suppress a
  needed question, answer or fact to retain old verdicts.
- A receipt proves protocol pagination, not that externally compressed text was
  seen. Require lossless retrieval before judgment; if unavailable, leave the
  affected item unfinished. Do not claim that MCP can authenticate comprehension.
- Explain status-only semantic-version normalization and the author-made
  approval checkpoint. Preserve false proof/authentication flags. Read-only
  observation remains allowed; check-state may conditionally write a checkpoint.

Extend M02/M03/M05/M06 with these cases and full/followup wrong-tool examples.
P20/P21 own runtime changes and publish correct metadata with them. If already
implemented, include their tools in final discovery/parity tests; compare this
packet's metadata-only diff against that execution baseline, not the older API.
Do not introduce their proposed fields or batch tool through descriptions alone.

## Outcome and scope

Make tool choice, reference provenance, state effects and continuation clear from
published metadata. Cover all actually registered tools at execution time,
including product tools added by P04–P16, without assuming the baseline count 64
is permanent. This packet changes descriptions/field annotations, supporting
references and tests, not the tool API or business logic.

Do not remove, hide, rename, deprecate or split tools; change validation/defaults,
annotations, result/error shapes or concurrency/retry behavior; introduce a
generic endpoint, new server/dependency or host loading strategy; edit Penpot;
install/configure/publish artifacts or commit. If a test reveals a real runtime
defect rather than incorrect prose, stop that part and request separate scope.

## Minimal inputs and authority

- MCP source_version: `757943679c62c7967e931fb88981736a6e4471ed4ba87078882ae981212d58dd`
- MCP specification_version: `26b85020e08d19a98161c15d3207d99ee9cf2868aa413e9a4f6484770e3874f6`
- MCP review_ref: `42f23a01-96c0-438a-af5f-9bd0ca39a1b6`

- Open `product-planning-workflows` through MCP; require Approved/pass/reviewed.
  Resolve fresh execution pins from [handoff.md](handoff.md), never from the
  superseded review recorded in completed P01–P03. Consume exact requirement_get
  continuations for the five IDs above.
- Read [MCP contract: discovery metadata](../contracts/mcp.md#discovery-metadata-contract),
  the [validated finding matrix](../../../reports/mcp-tool-description-audit-validation.md),
  and published tools/list plus generated tool-contracts.json.
- Read CodeGraph-selected owners for each affected family, not the whole package
  or journal. Review profile or Penpot instructions are not needed merely to
  describe already verified local operations. No new UI/design scope is implied.

## Ownership and implementation order

1. Record scoped staged/unstaged/untracked baseline and actual registered names,
   validation schemas/defaults, annotations and generated-file membership.
2. Add focused metadata tests at
   `packages/engineer-agent-workflow-mcp/test/tool-metadata.test.mjs`. Reuse the
   existing stdio harness and synthetic fixtures. Keep helpers outside discovery.
3. Edit descriptions at their source: `src/service.ts` for direct readers;
   `src/api.ts`, `state.ts`, `scope.ts`, `decisions.ts`, `requirements.ts`,
   `catalog.ts`, `experience.ts`, `checks.ts`, `reviews.ts`, `review-followup.ts`
   where the affected definitions live. Shared descriptions may be reused at
   the narrow shared owner, but distinct version/ref meanings must stay distinct.
   For registered product tools use their authoritative JSON-schema descriptions
   and product descriptor owners from P04–P16; do not duplicate validators in Zod.
4. Update relevant canonical references under `shared/` and `skills/` only where
   guidance disagrees with the verified contract. Do not copy full manuals into
   descriptions. Preserve explicit-only metadata and selective profile loading.
5. Rebuild packaged contracts and generate both host bundles. Extend
   `tests/workflow-mcp-integration.test.mjs` to compare descriptions/field metadata
   as well as schemas for the existing generated subset. Test legacy metadata
   directly through tools/list without expanding that subset's public contract.
6. Update this packet's evidence, todo and current handoff; do not run P17 next
   without its separate invocation.

## Acceptance and discriminating verification

| Check | Required observation |
| --- | --- |
| M01: discovery parity | Live tools/list and generated descriptions/input field metadata agree for their documented intersection; v1 tools remain present. Strip only description annotations in a compatibility comparison against the pre-change baseline: names, constraints/defaults, output shapes and behavior annotations remain unchanged. |
| M02: reference lifecycle | On a synthetic spec, record two sequential writes with the returned context; an observer read does not change bytes; a real stale writer still conflicts. Review receipts are obtained only after complete reads. Metadata names the actual producer/continuation, not a fabricated token format. |
| M03: scope/review selection | Exercise scope_propose -> native-answer fixture -> question_record_answer -> scope_confirm, no duplicate question. Reuse full/followup protocol cases for unchanged resume, completed-parent change receipt, ineligible changes and the whole-spec consistency gate. Assert stored effects, not just chosen words. |
| M04: local design effects | Synthetic local catalog/experience examples prove registration/removal and exact setter effects, including omitted focus preservation versus defaulted list clearing, component token ref deduplication and token source path/digest replacement. No Penpot service is needed or contacted. Tests observe changed and preserved local fields. |
| M05: bounded reads | Multi-page exact reads, section-scoped component/screen reads and both direct/context search families expose the documented cursor fields. Reconstruct expected exact content from continuations; reject mismatched/stale cursors where the existing contract requires it. Do not treat one completed section as an entire entity. |
| M06: safe guidance | A source-grounded matrix covers the actual ambiguous pairs and contextual fields. Keep descriptions concise, grammatical and accurate. No deprecation, canvas effects, semantic-review authentication or universal deferred-loading claim is invented. |

RED: before editing descriptors, add assertions for missing meaningful field
descriptions and parity/contrast cases and observe the relevant failure. Existing
behavior cases may already pass: that is a compatibility baseline, not new RED.
GREEN: update only authorized metadata/references; fix incorrect prose against
actual behavior, never weaken correct runtime checks. PROVE: remove one new
context-provenance description and alter one generated-only description in an
isolated build; each relevant test must fail. Restore and rerun. Do not mutate
unchanged production behavior merely to manufacture RED for this metadata change.

Required commands from repository root (new focused file is created by P19):

```sh
rtk proxy npm run build
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/tool-metadata.test.mjs packages/engineer-agent-workflow-mcp/test/workflow.test.mjs packages/engineer-agent-workflow-mcp/test/review-concurrency.test.mjs packages/engineer-agent-workflow-mcp/test/review-followup.test.mjs packages/engineer-agent-workflow-mcp/test/transport.test.mjs tests/workflow-mcp-integration.test.mjs
rtk proxy npm run lint
rtk proxy npm test --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy npm test
rtk proxy npm run generate:check
rtk proxy npm run validate:foundation
rtk proxy git diff --check
```

Use platform-neutral Node paths/temporary roots. Native OS and fresh-context
model qualification remain owned by P17, which consumes P19's evidence. An
optional old/new model routing benchmark needs separate explicit authorization;
metadata tests alone cannot establish better first-tool accuracy or lower latency.

All required commands must exit 0 and all actual assertions pass. A blocked child
process or missing platform is not a pass; record the limitation and next owner.
Final required checks and scoped diff must show no accidental runtime/API change.
Complete only P19 in todo, record actual evidence in handoff and stop. Review,
commit, global installation and publication are separate authorizations, not gates.

## Completion evidence

- Live `tools/list`: 132 registered tools and 271 provenance-sensitive top-level
  input fields; every such field has a non-empty actionable description.
- RED failed on missing direct-reader project provenance, cursor provenance and
  the local-versus-remote Penpot boundary. GREEN passed after metadata-only
  publication and targeted scenario wording changes.
- PROVE removed product-context provenance and separately changed only a
  generated description; the corresponding focused tests failed, then passed
  after restoration and regeneration.
- The required focused tests, MCP workspace tests, full `npm test`, lint, build,
  generation check, foundation validation and `git diff --check` passed.
- No validation constraint, default, tool name, output shape, behavior annotation
  or runtime mutation behavior changed. No commit, installation or publication
  was performed.

## Post-review remediation

The independent code and security review found three metadata defects:

- field-name-only descriptions conflated structurally different `evidence_refs`
  contracts and gave `requirement_get.source_version` an ambiguous producer;
- `decision_link_requirements_batch.items[].decision_ref` and
  `product_review_start.fixes[].changed_refs` lacked nested provenance
  descriptions;
- four local catalog/experience mutations implied that they created or verified
  real Penpot objects although they only record supplied identifiers locally.

The remediation added tool-and-field-specific descriptions, removed ambiguous
suffix fallbacks, put nested descriptions in their Zod or JSON Schema owners,
and made the local-versus-remote Penpot boundary explicit. Executable validation
shapes, defaults, tool annotations and runtime effects remain unchanged.

- RED: the expanded focused suite failed three cases on the nested reference,
  scenario-specific provenance and remote-Penpot claims.
- GREEN: `tool-metadata.test.mjs` passed 7/7 after corrections and schema
  regeneration.
- The MCP workspace suite, full `npm test`, build, lint, generation check,
  foundation validation and `git diff --check` all passed after remediation.
- Security review found no separate trust-boundary bypass: published metadata
  remains static and runtime validators remain authoritative.
