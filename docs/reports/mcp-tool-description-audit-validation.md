# MCP tool description audit: validation and disposition

Date: 2026-09-14. Status: validated planning input; runtime changes not implemented.

Input: `engineer-agent-workflows-mcp-tool-description-audit.md`, supplied from
another worktree. SHA-256:
`557de517a08c2710f635b140e13ca5cf322a9744affb265502c77aee61556e98`.
The original is unchanged. Its high/medium risk ratings are static judgments,
not observed model failure rates or evidence of slower execution.

## Verification boundary

Reviewed the current tool registrations, validators, mutation bodies, pagination,
review state transitions and generator. Rebuilt the local package and queried
tools/list over a fresh stdio client: 64 tools, 14 cursor-bearing inputs, one
described top-level field (`design_system_connect.instance`). The sandbox closed
the child connection; the same read-only query passed in the approved local
execution outside that sandbox. No workflow mutation was part of that query.

No model benchmark, Penpot operation, global installation or API fix was performed.
This is not evidence that all descriptions are poor or that increasing their
length improves agent performance.

The [MCP tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
defines description, inputSchema and behavior annotations, and tools/list
discovery. It does not promise how a host selects or defers loading tools.
Annotations are hints, not an authorization boundary. Its tools/list `nextCursor`
is distinct from this application's result field `next_cursor`.

## Finding dispositions

| Finding | Decision and verified correction | Local evidence |
| --- | --- | --- |
| TD-01: context/reference descriptions | Accept. `contextInput` is an unexplained bounded string. Describe server provenance, exact owner/version binding, newest successful response and conflict inspection. Do not tell callers to keep the initial open token or reopen after every successful write. Distinguish review/requirement version meanings and receipts. | `src/state.ts:22`, `src/requirements.ts:94`, `src/reviews.ts:78`, `src/review-followup.ts:117` |
| TD-02: v1/v2 overlap | Accept selection guidance, reject removal/hiding/renaming. The four direct project/specification readers remain supported. These numbers describe application response protocols, not different MCP transports. Prefer context-bearing tools inside the managed workflow, not universally. | `src/service.ts`, `src/server.ts:85`, PWF-018 |
| TD-03: Penpot/local boundary | Accept, with qualification: existing descriptions already say register in several places. Make the missing negative boundary explicit for relevant design mutations, especially `screen_place_component`. They update local catalog/experience and validate local evidence; they do not edit the remote canvas. Keep API names. | `src/catalog.ts:21`, `src/experience.ts:60`, `:94`, `:126` |
| TD-04: unclear write effects | Accept clearer effect-first wording, reject API splitting. `component_describe` writes/replaces descriptive fields; `specification_check_state` already mentions conditional checkpointing. `review_start` is correctly annotated as a writer although unchanged unfinished resume returns `unchanged(output)`. Do not classify either operation as always read-only. | `src/catalog.ts:27`, `src/checks.ts:33`, `src/reviews.ts:36–52`, `src/server.ts:98` |
| TD-05: review lifecycle | Accept concise prerequisites and nearest-alternative guidance. Followup requires a completed parent, complete current change receipt and explicit fix links; ineligible changes require full review. Detailed checks do not replace the whole-spec consistency assessment. The server records agent evidence; it cannot establish semantic correctness or reviewer independence itself. | `src/review-followup.ts:117–174`, `src/reviews.ts:36`, `:86` |
| TD-06: scope versus questions | Accept clarification, not a new sequence. `scope_propose` saves its own confirmation question. Use the host question tool, then `question_record_answer`, then `scope_confirm` with exact proposal and answer refs. Ordinary questions use `question_prepare`. No duplicated scope question or invented separate consent endpoint is needed. | `src/scope.ts:85–122`, `src/decisions.ts:38` |
| TD-07: replacement semantics | Accept per-field documentation, reject blanket replace/merge guidance. Component token refs and screen requirement refs are deduplicated replacements; token registration replaces the source path/digest, not token values. Content rules replace the list. State update clears omitted defaulted condition lists but preserves omitted focus. Transition update resets defaulted conditions/operation refs. | `src/catalog.ts:46–57`, `src/experience.ts:12–13`, `:69–92`, `:111` |
| TD-08: pagination | Accept. All 14 cursor-bearing application tools expose `next_cursor`, but not every page has a `complete` field. Exact reads consume continuations; screen/component reads are section-scoped, so one section's completion is not the whole entity. Keep selectors and source identity consistent with the cursor. Search exhaustion is task-dependent. | `src/state.ts:50–60`, `src/service.ts:234–325`, `src/catalog.ts:64`, `src/experience.ts:121`, `src/requirements.ts:113` |
| TD-09: compressed grammar | Accept selective grammatical clarification and concise effect/prerequisite/alternative language. Clear tools do not need a full lifecycle paragraph. Reject arbitrary character targets, systematic boilerplate and claims of measured agent gains. | Current registrations in `src/scope.ts`, `decisions.ts`, `catalog.ts`, `experience.ts`, `reviews.ts`, `review-followup.ts` |

Source paths above are relative to `packages/engineer-agent-workflow-mcp/`.

## Additional generator boundary

The current generator (`scripts/build-schemas.mjs` in the MCP package) emits
`tool-contracts.json` for workflow tools only; live tools/list also includes the
four v1 readers. Do not silently change the generated file's membership to make
an all-tools comparison pass. Validate its current intersection for parity and
validate v1 metadata from live discovery. Existing integration tests compare
schemas/read-only flags but not descriptions; extend them in the implementation
packet. New product descriptors must follow their authoritative JSON schemas,
not introduce a second handwritten validator.

## Accepted delivery

- [PWF-034](../specs/product-planning-workflows/spec.md#pwf-034-accurate-bounded-mcp-tool-discovery)
  owns the behavioral requirement for accurate discovery, with metadata-only scope.
- [P19](../specs/product-planning-workflows/tasks/19_mcp_tool_discoverability.md)
  owns tests, targeted descriptions/field annotations, generated parity and evidence.
- Preserve P01–P03 completion. Keep packet IDs stable; schedule P19 after P16 and
  before P17/P18 so all newly registered product tools are included once.
- This is a new user requirement, not corrections-only review of old findings.
  The amendment initially remained Draft; a subsequent full independent review
  completed 70/70 items without findings. The author restored Approved and
  refreshed every unstarted packet's pins. See the current handoff for the
  recorded review reference and verification, not the superseded review pins.

## Validation evidence for this amendment

Build and fresh stdio inventory passed. Planning-link/packet-DAG, MCP requirement
linkage/freshness, generated-bundle and whitespace results are recorded in the
current handoff. Runtime regressions and description improvements belong to P19;
they have not been claimed complete here.
