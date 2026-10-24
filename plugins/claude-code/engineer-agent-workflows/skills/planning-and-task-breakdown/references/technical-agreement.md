# Technical Agreement

Read for every new or materially revised task proposal, at every depth; also
when resuming unresolved planning or supplementing an affected legacy packet.
Planning owns technical choices; specification owns behavior, scope and acceptance.
Read `shared/references/yaml-contracts.md` first. Discover callable scenarios and
their published schemas; never construct a host-specific MCP namespace.

## Investigate And Propose

Inspect relevant code, tests, contracts and repository guidance before asking.
Distinguish verified existing symbols from proposed units and assumptions.
Consider viable approaches privately, then explain meaningful alternatives and
a recommendation with concise reasons: reuse, complexity, compatibility and
verification where material. Explain how the structure delivers the product
outcome. If one approach is adequate, ask for agreement without inventing another.
Functions, existing components and configuration are valid; classes, patterns,
interfaces and dependencies need a demonstrated purpose, not a question quota.

Before the native question, explain each named packet's proposed implementation
in the conversation. Give enough context to understand what will be built and how
it will work without opening the packet:

- Start with the packet's purpose and concrete change in product or developer
  behavior. Explain what the current implementation does where relevant.
- Describe the significant existing components to reuse or change and the new
  classes, functions, modules or configuration to introduce. Explain each unit's
  responsibility in plain language; distinguish existing units from proposed ones.
- Walk through how a representative action or input passes between these units
  to produce the result. Explain important contracts, state changes and failure
  handling where they affect the choice. Use a small example when it makes an
  otherwise abstract proposal understandable.
- Explain why you recommend this approach and how viable alternatives would
  change the implementation and its practical consequences. If only one approach
  is adequate, explain why without inventing alternatives.

State exactly which implementation decision the upcoming tool question will
collect and what accepting the proposal commits the packet to. Keep the actual
question and selectable options in the native question tool, preserving the
unavailable-tool fallback below.

Scale the explanation to the packet: a simple change may need one concrete
paragraph; interacting components may need several paragraphs or a short list.
Make longer explanations easy to scan with short blocks and bold lead-ins,
such as **Outcome**, **Implementation**, **Flow**, **Rationale**, **Verification**
and **Decision to confirm**, in the conversation's language. Choose, combine or
omit blocks to fit the packet; this is not a mandatory template. Use numbered
lists for sequential steps and bullets for responsibilities, alternatives or
checks. Put identifiers in backticks and bold short anchors rather than whole
paragraphs.

Explain technical terms when first used. A list of symbols or pattern names is
not an explanation of how the solution works. Agreement must not depend on
choices described only in files or proposal identifiers. Do not duplicate the
complete proposal, enumerate private helpers or turn the explanation into a
separate approval step.

Draft only the binding proposal sections needed for that choice before asking;
complete only the remaining packet details after agreement, outside those sections.
Before freezing, terminate each hashed section with its next same-level heading,
even if the following section is still empty. Preserve its boundary whitespace unchanged:
appending delivery details must not extend a proposal previously at end of file.
Do not delay the question until test maps, checklists and handoff are fully written.
Each named packet's
`## Technical proposal` describes the
proposed approach, significant units, responsibilities, inputs/outputs, shared
signatures, interactions and dependency direction. Include meaningful lifecycle,
errors, invariants and algorithm choices. Mark binding symbols versus illustrative
names. Leave minor private helpers, variables and equivalent statement organization
flexible unless explicitly constrained. Use examples only to remove ambiguity.

Discuss shared decisions once in a unique heading in `tasks/plan.md` or another
authorized task document. Each dependent proposal includes that exact source;
mentioning a shared decision is not agreement for another task. Keep every binding
commitment in hashed sections, including exact bounded contract references. Do
not hide commitments solely in chat, adjacent unbound prose or a changing external
document. A material referenced-contract change requires reconciliation even if
the runtime cannot detect it automatically. Keep progress and agreement metadata
outside those sections so ordinary execution updates do not change the proposal.

## Ask And Persist

1. Use `planning_decision_find` for the affected packet and `planning_decision_get`
   for exact current records; follow all continuations. Reuse valid answers, not
   question defaults. Do not reopen settled choices without a material change.
2. Call `planning_question_prepare` with the pinned `expected_source_version`,
   actual question `text`, `kind`, and `proposals`. Each proposal supplies its
   stable `id`, exact `packet_id`, linked `requirement_ids`, and `sources` of
   `{path, heading}`. Paths are project-relative Markdown documents under
   `docs/specs/<slug>/tasks/`;
   headings are exact unique top-level section titles without Markdown markers.
   Include shared sources in every affected proposal. Use returned digests and
   references; do not calculate replacements. Keep inputs within published limits.
3. For choice questions, provide `options` and explicit `option_bindings` mapping
   each option to proposal IDs. A reject/revise option has an empty binding; do
   not mix it with acceptance. One packet may have concrete alternatives, but
   only its selected proposal becomes binding. Give alternatives distinct exact
   source headings and IDs; bind common commitments plus the selected alternative,
   not mutually exclusive contracts together. Keep those sources unchanged after
   the answer; put selection metadata outside them. Never prepare an unrelated newer
   question for an already agreed packet: latest prepared questions take authority.
4. Show the named proposals and ask through callable `AskUserQuestion`
   using its actual schema in the current mode. Do not enter plan mode solely to
   ask. Group only a small clear set that fits tool limits; split disputed or
   unrelated choices. A group must explicitly identify each covered task and
   proposal. For one adequate approach, request confirmation with a revise choice.
   If unavailable, preserve the conversational fallback: ask directly and await
   an actual answer; record source provenance accurately.
5. Immediately call `planning_question_record_answer` with the latest returned
   `question_ref`, actual answer `text`, actual `selected_ids` and `source`
   provenance identifying the native question/reply. Never reconstruct answer
   prose from labels; a selected-only answer may have empty text. For unambiguous
   custom acceptance use `accepted_proposal_ids`; exact custom withdrawal uses
   `rejected_proposal_ids`. Do not infer IDs from vague approval. Partial answers
   cover only explicitly accepted proposals; retain all other tasks as unresolved.
   A recommendation, preselection, silence, dismissal or failed tool is not
   agreement. Use `planning_question_record_no_answer` for its actual supported
   outcome, never invent an answer or overwrite an answered revision with it.
6. Save returned `agreement_ref` and `proposal_digest` per packet outside hashed
   sources. Call `planning_packet_check` with `packet_id`, exact `agreement_ref`
   and `expected_proposal_digest`. Only `ready` plus other packet prerequisites
   permits readiness. Missing, stale, blocked or unresolved tasks stay pending.
   Drafts and independent planning may continue, but do not present the complete
   plan as ready while a required task is unresolved. Agreement does not authorize
   implementation, a commit or an external action.

Technical answers use only these planning scenarios, never the behavioral
specification question path. An incompatible or missing capability blocks the
affected operation; name the prerequisite without installing tools or writing
YAML/another journal. MCP cannot authenticate human consent or verify semantic
conformance; the agent must preserve actual answers and route ownership correctly.

## Resume And Reconcile

Read bounded current records, pending questions and the packet. Continue from
the latest returned `question_ref`; answering one member of an older group must
not restore another member superseded by a newer question. Recheck exact agreement
and spec versions before reuse. Explicit rejection withdraws the affected binding;
unrelated answers and tasks retain their own valid agreements.

For material technical changes, checkpoint affected tasks, revise hashed sources,
prepare the replacement with `revises` when correcting that question, show the
changed proposal and obtain a new explicit answer. Shared boundary changes reopen
all affected consumers; unaffected agreements remain reusable. Do not silently
refresh packet references or treat an earlier answer as consent to a new digest.
Behavior, scope or acceptance changes return to separately invoked specification;
mixed or ambiguous ownership stays unresolved. Recheck state after changes.

For a legacy task without qualifying evidence, supplement only the affected task
through planning. Reuse precise existing proposal/answer evidence if it satisfies
this contract; do not demand another answer solely due to age. If exact historical
proposal, task coverage and actual answer provenance are available and still match
current commitments, prepare that exact proposal and record the original answer
with its original source through the planning scenarios; do not claim a fresh
native reply. If that equivalence is uncertain, ask about the unresolved proposal.
Never fabricate managed references from chat. Obtain a managed ready binding
before execution. Preserve existing
work, unrelated plans and completed tasks; no bulk migration is authorized.
