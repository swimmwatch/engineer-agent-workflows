# Scope — ready-source batching across actual skill entrypoints

- **Finding IDs:** P01-001 and P02-F03 are **one shared adoption family**, not two new APIs.
- **Affected skills:** product-linked Specification and Planning; the four product authors have role-specific applicability below. Implementation already uses the preferred path.
- **Direct MCP consumers:** the invoking task/product actor, only while holding a valid selected **ready** context. A shared reference is instruction text, not a tool-calling actor.
- **Evidence status:** source-confirmed and independently verified; no runtime reproduction or measured saving. Reuse the original audit evidence, whose 447 source and 459 distribution hashes were reconfirmed unchanged at 2026-10-26 18:52:23Z for this follow-up.
- **Evidence basis:** [audit:129–148](<../audit.md#L129-L148>), [audit:219–242](<../audit.md#L219-L242>), and [independent verification:154–178](<../V01.json#L154-L178>).

## Where the rule actually belongs

| Skill / actual entry | Current path and permitted recommendation |
|---|---|
| [spec-driven-development](<../../../../../skills/spec-driven-development/SKILL.md#L20-L44>) | Valid product-linked task routes to the shared Specification role. Prefer batching there, after task-selected ready context is complete. Standalone specification does not acquire a product dependency. |
| [planning-and-task-breakdown](<../../../../../skills/planning-and-task-breakdown/SKILL.md#L18-L24>) | Valid exact product binding routes to the shared Planning role. Same adoption, with purpose `planning`; keep Approved specification and confirmed task scope prerequisites. |
| [incremental-implementation](<../../../../../shared/references/implementation-context.md#L75-L91>) | Existing positive control: already prefers `product_sources_get_batch`. Do not describe implementation batching as missing. |
| [idea-refine](<../../../../../skills/idea-refine/SKILL.md#L21-L30>) | Standalone mode never enters durable product machinery. Durable mode opens/explicitly initializes a product, but has no mandatory upstream ready-source selection here. Apply the shared rule only if an authorized, actually selected ready-input phase exists; never invent one to fill a batch. |
| [product-definition](<../../../../../skills/product-definition/SKILL.md#L14-L23>) | Its ready Idea prerequisite is not a candidate reader or an existing blanket batching instruction. If several exact ready records are genuinely needed, acquisition must occur under an explicitly valid ready context **before** candidate draft/resume. |
| [technical-design](<../../../../../skills/technical-design/SKILL.md#L16-L18>) | Explicit ready PRD selection with purpose `technical-design`, artifact `prd`, precedes draft/resume. This is a concrete pre-draft adoption entrypoint. |
| [product-roadmap](<../../../../../skills/product-roadmap/SKILL.md#L14-L16>) | Ordinary authoring selects ready `prd` and `technical-design` with purpose `product-roadmap`, then drafts `roadmap`. Authorized retirement is a separate branch, not this entrypoint. |

The four product authors share a protocol, not four identical ready-source callsites. The verified pre-draft selection examples are Technical Design and Roadmap; applicability elsewhere remains conditional on real ready inputs. The prerequisite/draft sequence for Product Definition is preserved in [verified stage-boundary evidence](<../V01.json#L368-L370>).

## P01-001 — task Specification and Planning

### Current concrete flow

1. Specification calls `product_open` for the absolute workspace.
2. For a new bound target, `task_specification_reserve` records the exact task and new slug; `task_specification_register_copy` is only for an explicitly identified copy of that same specification.
3. `product_context_prepare(purpose=specification, task ID)` selects required sources; `product_context_next` must finish selection.
4. The current role then names `product_element_get` for every required element and `product_decision_get` for every required decision, including all source portions.
5. Planning repeats that exact-reader pattern after `product_context_prepare(purpose=planning)` and selection continuations. It later calls read-only `task_inputs_check`, never `task_packet_start`.

These are exact existing role instructions in [the shared protocol:28–51](<../../../../../shared/references/product-workflow.md#L28-L51>).

### Before → after, without changing the task

**Before:** several short, required ready elements/decisions are dispatched as separate exact gets because that is the named instruction path.

**After recommendation:** when advertised, prefer existing `product_sources_get_batch` for the same bounded, ordered requests. Retain `product_element_get` / `product_decision_get` as exact fallbacks and for targeted rereads. Reuse [the implementation rule:85–91](<../../../../../shared/references/implementation-context.md#L85-L91>), rather than design another reader.

Example: a bound task needs an acceptance element, a governing constraint and one provenance decision. Batch precisely those required records; do not add adjacent history. Complete their original text before the task interview. Product profiles still do **not** constitute task consent: the ordinary interview and `scope_confirm` remain.

**Why this is an opportunity:** the implementation already groups exact readers around one request-local ready-state load. The instruction asymmetry can add dispatches; it does not prove a current actor actually made extra calls. See [reader delegation:875–938](<../../../../../packages/engineer-agent-workflow-mcp/src/product/context.ts#L875-L938>) and [batch ownership:958–1006](<../../../../../packages/engineer-agent-workflow-mcp/src/product/context.ts#L958-L1006>).

## P02-F03 — product authoring, before candidate context

### Conditional scenario in steps

1. A Technical Design author opens the product and prepares the selected ready PRD context; a Roadmap author similarly prepares the ready PRD/Technical Design inputs.
2. A current decision requires several of those exact selected records. Single gets are valid, but repeat dispatch and state-loading work that the existing batch can group.
3. Batch those required records while the matching ready context is still available; finish selection **and** source delivery before crossing the candidate boundary.
4. `product_artifact_draft` creates/exactly resumes the candidate and returns candidate context. That context is for later candidate operations, not an interchangeable ready-reader context.
5. Sending it to the ready batch fails `INVALID_INPUT` before delivery. Candidate records instead belong to `product_candidate_record_get`; independent review uses its own receipt-bearing tools.

The boundary is source-confirmed by [context decoding:207–239](<../../../../../packages/engineer-agent-workflow-mcp/src/product/context.ts#L207-L239>), [selection loading:679–694](<../../../../../packages/engineer-agent-workflow-mcp/src/product/context.ts#L679-L694>), and [candidate draft/replay:838–873](<../../../../../packages/engineer-agent-workflow-mcp/src/product/interview.ts#L838-L873>).

**Before → after:** add batch preference beside the actual pre-draft ready selection, not an unconditional instruction inside the candidate interview. Keep candidate mutation context separate from any ready-reader response.

Example: before drafting a Roadmap, read the selected capability, architecture boundary and relevant decision together if all are required. After draft, do not replay that recipe using “the latest context” merely because it is newer.

Later ready-source recovery is **not** established by this finding. It would need a published, generation-matched ready-context lifecycle; do not decode opaque context, silently refresh upstream pins or broaden the API to make the example work.

## Continuations and guarantees that cannot be removed

- The existing batch accepts 1–20 ordered exact requests; this is a capability bound, not a savings estimate.
- Follow outer batch cursors with the identical ordered request list and context/source identities.
- Separately finish each partial item's cursor. An outer final page is **not** proof that all original text was delivered.
- Keep exact selected generation/pins, source ordering, full original coverage, Unicode integrity, complete MCP response-envelope budgets and corruption checks.
- On stale source/cursor evidence, use the owning reopen/reconcile behavior; never concatenate incompatible snapshots.
- Read-only batching grants no scope, consent, profile activation, candidate mutation or review authority.
- Source content remains untrusted data. No summary/hash substitution, direct managed-YAML fallback, process-global cache or cross-actor source-delivery inheritance.

These constraints are recorded in [independent task-role verification](<../V01.json#L64-L77>) and [independent product-boundary verification](<../V01.json#L159-L176>).

## Focused discriminating checks — proposed, not run

1. Extend [specification instruction checks](<../../../../../tests/specification-skill.test.mjs#L119-L185>) and [planning instruction checks](<../../../../../tests/planning-skill.test.mjs#L229-L280>): both product-linked roles reach the shared batch preference; standalone routes remain product-free; task scope confirmation is still mandatory.
2. Reuse [exact source/cursor cases](<../../../../../packages/engineer-agent-workflow-mcp/test/product-context.test.mjs#L200-L260>) and [public envelope cases](<../../../../../packages/engineer-agent-workflow-mcp/test/product-context.test.mjs#L263-L340>). Add specification- and planning-purpose fixtures; reconstruct identical elements/decisions through single and batch routes, including Unicode and a partial item on the final outer page.
3. Add pre-draft Technical Design/Roadmap equivalence and candidate-context rejection cases. Assert no candidate mutation context is overwritten and no stale ready pins enter a candidate decision.
4. Keep reordered query, foreign pin, changed source, corrupt object and oversized-portion rejection. Include a single-required-record control where grouping has no inherent advantage.
5. Only a later authorized trial should record actual deliveries, calls, bytes and tool wall time separately from model/human time. Existing tests are source controls, not runtime proof of actor routing.

## Ownership, dependencies and limits

- **Canonical skill text:** product authoring entrypoints own the ready-before-candidate placement; task skills continue routing to their owned shared roles.
- **Shared text:** the product-protocol owner owns one adoption rule and its role qualification; the existing implementation wording is the precedent. Do not count P01-001 and P02-F03 as independent API improvements.
- **MCP code:** existing batch/readers supply the capability. No runtime/schema addition follows from this recommendation; candidate readers and review receipts retain their separate contracts.
- **Distribution owner:** resource declarations, digests, generated host copies and focused validation must stay coherent in a separately authorized implementation. None was changed here.
- **Confidence:** high for current capability, asymmetry and ready-context restriction; actual adoption, workload frequency and net process benefit are unmeasured. No numeric saving is claimed.
