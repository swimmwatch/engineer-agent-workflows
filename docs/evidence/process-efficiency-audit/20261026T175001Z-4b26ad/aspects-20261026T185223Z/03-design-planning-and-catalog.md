# Scope — design-planning entry and shared catalog MCP paths

- **Finding IDs:** P01-002, P10-F02 and P10-F03; three separate scenarios, not one design audit.
- **Affected skill:** [design-planning](<../../../../../skills/design-planning/SKILL.md#L13-L31>). Main planning is an upstream eligibility dependency, not another affected design author.
- **Direct MCP consumers:** eligible design-planning actors use the collection's scenario tools, including catalog reads/checks. Other clients directly calling those same tools share the MCP behavior; they are not additional skills. The no-output path must stop before external design operations.
- **Evidence status:** source-confirmed and independently verified, not runtime reproduction. The 2026-10-26 18:52:23Z comparison found all 447 source and 459 distribution hashes unchanged; this explanation reuses the saved evidence.
- **Scope boundary:** collection-owned code/instruction integration only. No Penpot canvas, token-governance, visual, restoration or accessibility audit was performed. No Penpot tools or skills were invoked.
- **Basis:** [no-op audit](<../audit.md#L150-L168>), [token audit](<../audit.md#L530-L550>), [pagination audit](<../audit.md#L552-L570>), [V01 eligibility verification](<../V01.json#L81-L98>) and [V02 catalog verification](<../V02.json#L205-L247>).

## P01-002 — eligibility before substantive no-op disclosure

### Current conditional scenario

1. The user separately invokes design planning after an Approved specification and existing plan bundle.
2. The entry runs the matching engineering-bundle verifier, then requires substantive engineering-principles and test-discipline reads plus state-access guidance.
3. Only afterwards does it determine whether the confirmed manifest declares root design outputs.
4. With no declared outputs, it reports not applicable. External design guidance and schemas are **already** deferred; there is no eager Penpot-loading defect.
5. Thus a valid cold-context no-op requires two substantive quality manuals it will not use for design work. Proper main-planning routing normally avoids this invocation altogether.

Exact order: [entry:13–31](<../../../../../skills/design-planning/SKILL.md#L13-L31>). The verifier independently checks actual resource bytes and digests in [verification:267–305](<../../../../../shared/scripts/verify-engineering-manual.mjs#L267-L305>) and [verification:344–345](<../../../../../shared/scripts/verify-engineering-manual.mjs#L344-L345>).

**Before → after recommendation:** verifier → substantive manuals → eligibility becomes verifier + mandatory scenario/state-access guidance + approved-plan prerequisites → MCP-confirmed eligibility → stop if ineligible; otherwise load both substantive manuals unchanged **before** any eligible work.

Example: an existing post-plan invocation with no declared design outputs should return not applicable without substantive design-stage manual disclosure. An active UI profile alone, or an existing screen on disk, must not manufacture declared output authority.

### Guarantees not removable

- Bundle failure still stops first; no fetching, copying or approximation of missing guidance.
- Read eligibility through mandatory scenario access, not direct managed YAML or screen-file inference. No new eligibility API is required by this finding.
- Preserve Approved specification, confirmed manifest and existing plan prerequisites. Missing MCP, uncertain scope and contradictory/legacy declarations remain blockers or specification reconciliation, not silent migration.
- No output creation, external routing, remote write or handoff mutation on the no-op path.
- Eligible work retains all quality, design-evidence and stage-stop obligations in [eligible execution:32–50](<../../../../../skills/design-planning/SKILL.md#L32-L50>).

### Focused proposed tests and limits

Extend [design skill checks:8–20](<../../../../../tests/design-planning-skill.test.mjs#L8-L20>) with modeled no-output, eligible and contradictory declarations. Assert no-output stops before substantive manual delivery, schemas or external routing; eligible work cannot precede both manuals; verifier failure stops even earlier. Include active UI/no-output and inactive UI controls.

Confidence is high on instruction order, low-to-moderate on frequency and benefit. A later authorized fresh-context trial could record actual disclosed bytes, deliveries and wall time, separating retained-context reuse. No timing/token saving is established by this source ordering.

## P10-F02 — one scenario-local token mapping, all references checked

### Current exact flow

1. `design_system_check` or `screen_design_check` enters `checkLibrary`.
2. Each component/variant calls `verifyTokens` for its own token references before native snapshot checks.
3. Each nonempty call goes through `tokenSource`, rereads registered bytes, checks their digest and constructs the JSON mapping again. Empty lists already skip acquisition.
4. `design_system_register_tokens` already reads, parses and hashes the token source, then repeats the helper path across existing component/variant references.
5. Several token-bearing lists therefore reconstruct the same mapping during one scenario. `component_set_tokens` already supports multiple references in one call; another public batch is not missing.

Exact evidence: [check loop:20–30](<../../../../../packages/engineer-agent-workflow-mcp/src/checks.ts#L20-L30>), [check entrypoints:84–106](<../../../../../packages/engineer-agent-workflow-mcp/src/checks.ts#L84-L106>), [token helper:77–91](<../../../../../packages/engineer-agent-workflow-mcp/src/design.ts#L77-L91>) and [registration:46–57](<../../../../../packages/engineer-agent-workflow-mcp/src/catalog.ts#L46-L57>).

**Before → after recommendation:** repeated full acquisition per nonempty list → lazily acquire one mapping inside that scenario and retain the existing ordered loop. An ordered combined reference list is an alternative only if failure precedence stays identical. Registration can pass its already validated bytes/mapping.

Example: a component and two variants reference the same semantic color. Validate all three lists in their existing order; do not reread and parse identical registered JSON solely because the reference owner changed. Empty lists should still avoid token-source access.

### Guarantees not removable

- Check every reference and require an owned Design Tokens Community Group (DTCG) value node, not merely a matching object path.
- Keep component/variant/dependent validation order and the first broken-reference error; duplicate references are not permission to skip meaningful validation.
- Retain safe paths, source limits, registered descriptor digest checks, snapshot invalidation and no-write failures.
- Mutation dependency registration and final source freshness guards remain; a byte change before commit rejects installation.
- No cross-call/global token cache or caller-supplied replacement JSON. Do not advertise new read-only snapshot guarantees.
- Preserve receipts, replay, lock ownership and local-versus-external evidence status. Token validation cannot replace native archive inspection or observed visual/accessibility evidence.

### Focused proposed tests and limits

1. Extend [workflow token controls:276–288](<../../../../../packages/engineer-agent-workflow-mcp/test/workflow.test.mjs#L276-L288>): instrument acquisition/JSON parse counts for one versus multiple lists while comparing identical outputs/errors.
2. Cover all-empty lists, mixed empty/nonempty lists, duplicate refs, malformed JSON, missing source, wrong digest and a broken reference in the **last** variant. Earlier valid lists must not hide that last failure.
3. Inject source change before the registration final guard: no catalog write, unchanged receipt/replay behavior. Preserve local/external statuses.
4. Retain [token-output authority cases:33–105](<../../../../../packages/engineer-agent-workflow-mcp/test/design-token-scope.test.mjs#L33-L105>); invalid output selection still rejects atomically and is unrelated to parsing reuse.

Confidence is high for duplicate acquisition/construction; useful runtime gain is unknown. Future measurement must separate token work from native ZIP inspection, allocation and scenario latency. No external design quality conclusion follows.

## P10-F03 — description must not page invisible variants

### Concrete conditional scenario

1. A component has several variants. A direct consumer requests `component_get(section=description, limit=1)`.
2. The current section selection falls through to the variant collection and pages it.
3. The response includes purpose, accessibility and allowed overrides, but omits variants for this section.
4. It nevertheless returns the variant-derived `total` and `next_cursor`. Following that cursor repeats the same description while advancing invisible variants.

The collection-owned integration explicitly routes existing-entry reads through `component_find` / `component_get` in [the integration sequence:98–106](<../../../../../skills/design-planning/references/penpot-workflow.md#L98-L106>). The mismatch is in [catalog selection/output:64–70](<../../../../../packages/engineer-agent-workflow-mcp/src/catalog.ts#L64-L70>), with collection paging in [page:55–66](<../../../../../packages/engineer-agent-workflow-mcp/src/state.ts#L55-L66>).

**Before → after recommendation:** variant-based continuation without visible variant data → return the complete selected description once, without a collection continuation. Establish the description `total` convention in a focused contract case rather than silently choosing one here.

Example: three variants do not make three description pages. Conversely, `section=variants` and default summary still need their actual bounded variant pages; this finding must not collapse those collections.

### Guarantees, proposed tests and limits

- Keep requested purpose/accessibility/override data, scope eligibility, catalog integrity and response budgets. Do not return the full catalog or unbounded variants as a shortcut.
- Preserve summary/variants/tokens/content pagination and source/section-bound cursor protection. Reject incompatible old collection cursors; never reinterpret them as a different selected section.
- Extend [existing summary/variant checks:215–233](<../../../../../packages/engineer-agent-workflow-mcp/test/workflow.test.mjs#L215-L233>) with description plus variants exceeding `limit`, asserting complete description and no phantom cursor. Add empty-variant, collection-pagination, stale-cursor and cross-section-cursor controls.
- This is an observable read-contract correction, not mutation/recovery redesign. Receipts, locks, migration and snapshot invalidation ownership do not change.
- Confidence is high for the source branch/output mismatch; actual usage and avoided calls remain unmeasured. No runtime reproduction or current test execution is claimed.

## Ownership and dependencies — keep the three changes separate

| Finding | Canonical skill / shared instruction owner | MCP code owner and dependency |
|---|---|---|
| P01-002 | Design-planning entry owner reorders conditional disclosure; shared manuals remain authoritative and unchanged. Distribution owner handles generated bundles under separate authority. | Existing scenario-confirmed manifest access is required; no API addition, Penpot behavior change or weaker evidence contract. |
| P10-F02 | No token-validation workaround belongs in skill prose or copied external design recipes. Integration reference still directs the same tools. | Checks/design/catalog owners reuse existing helpers within one scenario and preserve guarded mutation semantics. No schema, dependency or new public tool. |
| P10-F03 | Existing bounded catalog-read guidance remains valid; do not teach consumers to ignore arbitrary continuations globally. | Catalog/state read-contract owner fixes this section and defines its `total` convention in focused tests; other sections remain unchanged. |

This document explains proposals only. No skill, source, configuration, generated distribution, design asset or test was changed or executed.
