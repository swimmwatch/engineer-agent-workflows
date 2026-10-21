# Technical Implementation Planning: Delivery Plan

Status: Complete — P01–P04 verified under separate implementation invocations.

## Reviewed inputs

- Specification: `../spec.md`, TIP-001 through TIP-010, Approved.
- `source_version`: `a46e18b6e78751f8a41ecc662ee507f7b7475e994c9111051d5b1eff3e3b000b`.
- `specification_version`: `a1a2739ae5c8d4ea86cac096da0e84cb5b86ded0f6b09081ca4d01873ae23967`.
- `review_ref`: `a1421d0b-f37b-4b76-a7ca-2a84de7066f3`.
- Confirmed scope: Standard/core; no separate profile or design artifacts.
- Entry check: MCP returned `pass`, `approved`, `reviewed`, and a recorded approval checkpoint.

The agreed plan is not implementation authorization. Each
packet requires its own later explicit invocation. Use the existing Git worktree,
preserve unrelated changes and inspect tracked, staged and untracked changes.
No commit, global installation, host reconfiguration or publication is included.

## Delivery stages

| Packet | Outcome                                                                             | Depends on                                             | Requirement coverage                                                    |
| ------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------- |
| P01    | Managed technical questions, exact proposal bindings and readiness checks           | Current reviewed specification and technical agreement | TIP-004, TIP-007–009; runtime portions of TIP-001, TIP-005–006, TIP-010 |
| P02    | Planning and incremental skills use the new contract, with generated host artifacts | P01 verified                                           | TIP-001–008; workflow portions of TIP-009–010                           |
| P03    | Codex end-to-end speed/quality benchmark, focused scenarios and regression checks   | P01 and P02 verified                                   | TIP-001–010; live Claude behavior remains unverified                    |
| P04    | Durable documentation explains actual behavior and recovery                         | P03 verified                                           | TIP-001, TIP-004–010                                                    |

Packets: [P01](01_managed_technical_agreements.md),
[P02](02_planning_and_execution_skills.md),
[P03](03_behavioral_qualification.md),
[P04](04_developer_documentation.md).
The sole completion checklist is [todo.md](todo.md); current state is in
[handoff.md](handoff.md).

## Shared technical proposal

### Storage and ownership

Recommended: add an optional, schema-validated `planning_decisions` section to
the existing managed `decisions.yaml`. It has its own section version and
append-only question/answer revisions. It is part of the same journal and uses
the same lock, conflict detection, atomic writer, replay receipts, validation,
redaction and bounded reads. Do not add another state file or independent store.

Keep behavioral records in the existing `decisions` array. Preserve the current
specification snapshot formula and inventory over that array. Technical writes
change the physical journal/context version, so callers must use refreshed
opaque contexts, but do not change the reviewed behavioral `source_version`.
Legacy unclassified records keep their current meaning and are never migrated
implicitly. A runtime without the new tools cannot supply the new guarantees.

The alternative is to add a purpose field to every existing decision and filter
behavioral revisions throughout specification review, history and coverage.
That requires broader changes to established review semantics and is not the
recommended solution for this bounded change.

### Runtime units

Use ordinary TypeScript functions and the existing tool-registration pattern.
No class hierarchy, repository abstraction, new dependency or lifecycle CLI is
needed. The new owning module is
`packages/engineer-agent-workflow-mcp/src/planning.ts`; `planningTools` is added
to `workflowTools` in `src/server.ts`.

Significant units in that module:

| Unit                       | Responsibility and contract                                                                                                                                                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `readProposalSources`      | Read exact, uniquely headed Markdown sections from specification-local task files through `readDependency`; return original text and content digests. Reject unsafe paths, missing/duplicate headings and unsupported oversized inputs. |
| `currentPlanningDecisions` | Select the latest non-superseded technical revisions without changing specification decision selection.                                                                                                                                 |
| `appendPlanningRevision`   | Append a technical revision inside the existing `mutate` transaction; retain original question, proposal snapshots, answer provenance and predecessor references.                                                                       |
| `checkPlanningPacket`      | Read-only comparison of specification eligibility, saved answer, task binding, proposal/source digests and current revisions; return readiness and concrete blocking reasons.                                                           |
| `planningTools`            | Validate public arguments and register the six scenarios below; delegate persistence and source access to existing owners.                                                                                                              |

Reuse `state.ts` (`mutate`, `readDependency`, `readConsistent`, `result`, `page`,
`hash`), `requirements.ts` (requirement definitions and bounded `portion`), and
the existing review-state logic. If a reusable read-only eligibility helper is
needed, extract it from the current review calculation and use it in both
consumers; do not perform an approval-checkpoint mutation inside a planning
transaction or maintain a divergent copy of review eligibility rules.

### Proposal source contract

Every proposal has a stable proposal identifier, packet identifier, requirement
IDs and one or more exact sources `{path, heading}`. Sources are Markdown files
under this specification's `tasks/` directory. Heading resolution uses the
existing Markdown parser dependency and exact unique headings, including their
subsections up to the next same-or-higher heading. Do not search by substring or
accept arbitrary project paths. Existing safe-path and dependency-read guards
remain authoritative, including symlink escape and concurrent-write protection.

One task can expose multiple complete alternatives as distinct proposals. The
question binds choices to exact proposals. Shared architecture is described
once in a named plan section; every dependent proposal includes that same source
reference in its digest. Editing that section invalidates just its consumers.
Task-specific sources normally use `## Technical proposal`. All binding technical
commitments must live in the referenced sections; other packet prose cannot
silently override them.

The saved question retains immutable proposal text and digests as history. The
current Markdown is the editable planning source. The packet retains the exact
agreement reference and selected proposal digest returned by MCP. Completion
status, test logs and handoff edits outside these sections do not invalidate a
technical agreement. This is an explicit technical-boundary check, not a hash
of every byte of an execution packet.

### Public scenarios

The interfaces below are the agreed P01 commitments. Follow existing public
metadata and diagnostics conventions.

1. `planning_question_prepare`: `context`, `expected_source_version`, standard
   question text/kind/options, `proposals` (IDs, packet IDs, requirement IDs and
   source references), option-to-proposal bindings, optional exact `revises`.
   Require eligible Approved/reviewed specification inputs, read and freeze all
   proposal sources before asking, then return the exact question reference and
   proposal references/digests. It never asks or answers for the user.
2. `planning_question_record_answer`: `context`, exact `question_ref`, actual
   `text`, `source`, selected option IDs and, for an unambiguous custom answer,
   explicitly identified accepted proposal IDs. Optional `rejected_proposal_ids`
   records a custom withdrawal of exact proposals. A selected option with an
   empty binding rejects every proposal in that question; mixing it with
   acceptance is invalid. Rejection revokes the affected saved bindings without
   erasing history or unrelated agreements. Validate membership, uniqueness,
   at most one accepted alternative per packet and consistency with any selected
   option. Store the actual answer unchanged. A correction/rejection is recorded
   without agreement. A partial answer agrees only the covered packets.
3. `planning_question_record_no_answer`: `context`, exact `question_ref`, existing
   supported non-answer outcome. Append the unresolved outcome; never fabricate
   agreement or replace an already answered revision with a non-answer.
4. `planning_decision_find`: `context`, bounded current/history filters, limit
   and cursor; return previews and exact references. Keep planning data distinct
   from existing specification decision queries.
5. `planning_decision_get`: `context`, exact `decision_ref` and optional cursor;
   return complete immutable question, proposal, answer and revision evidence
   through bounded continuations.
6. `planning_packet_check`: `context`, `packet_id`, exact `agreement_ref` and
   `expected_proposal_digest`; return `ready`, `needs_agreement`, `stale` or
   `blocked`, current references and actionable reasons. Validate accepted
   membership, current source bytes, relevant revisions and specification pins.
   A malformed call still returns the existing structured error contract.

Use the current bounded limits: at most 20 options and proposal selections,
4,096-character question/answer text, existing bounded portion delivery and
response-byte ceilings. P01 boundary checks establish a 1 MiB cumulative budget
for unique input files, enforced by the existing reader before allocation or
Markdown parsing, and a separate 128 KiB cumulative proposal-snapshot budget.
Repeated references read the same file once. These are resource bounds, not a
timing promise. No raw proposal bodies in success responses that exceed
the existing response budget. Identical lost-response retries use the existing
receipt contract; stale writes never append an alternative history silently.

The runtime proves structural identity and freshness, not the semantic truth of
prose or human consent. The skill must compare proposals with approved
requirements before using technical scenarios. Mixed or behavioral changes
return to specification. P03 includes an adversarial behavioral-change scenario
to check this routing; no keyword classifier pretends to prove it.

## Shared verification and preservation

All packet commands run at the repository root unless explicitly stated.
Use `rtk` for shell commands. Existing Node.js is v24.20.0; package support is
Node.js >=22.20.0. Node, npm, Git and Codex executables are discoverable;
authentication and native-question availability inside isolated Codex trials
were subsequently verified in the P03 evidence. No global state may be modified to satisfy a
check. Tests use isolated temporary projects/homes.

Runtime tests must observe real managed scenario outcomes and saved read-back,
not hand-edit a real decision journal. Fixture-only corruption may be exercised
inside existing test harnesses. Keep actual state, proposal outputs, tool traces
and produced task artifacts distinct from fixture expectations. Structural
skill checks and passing fixture data do not establish actual host behavior.

The user's qualification correction excludes live Claude trials. Both generated
distributions retain structural isolation/size checks, but live Claude agreement
and readiness behavior remains unverified, including that part of TIP-001. Do not
claim empirical host parity. P03 compares baseline and candidate in real Codex
planning-to-verified-implementation runs, followed by measured repairs and
affected reruns. Preserve the pre-change benchmark baseline described in P03
before P01 changes the runtime or P02 changes templates. The initial eight runs
do not cap reruns after repairs. This changes qualification scope, not
the supported host contract or the reviewed behavioral specification.

Use RED/GREEN/PROVE. New-tool-not-found, import or harness errors do not provide
a behavioral RED; once GREEN is available, deliberately break the relevant
acceptance behavior and establish the required assertion failure, then restore.
Do not weaken correct checks. Required failed/unavailable checks leave a packet
incomplete. Completion includes the final scoped diff and technical-contract
comparison, checklist/handoff updates and a stop after one packet.

Known unrelated dirty areas include roadmap retirement source/tests, product
documentation and evidence. They are outside this plan. The MCP README already
has unrelated edits: P04 must inspect and preserve them. Generated artifacts and
skill-local shared copies are changed only through the existing generator and
must be checked for unrelated drift. Do not hand-edit installed skill copies.

There are no new visual, service, event, persisted application-data, deployment
or accessibility surfaces. Existing privacy/redaction, conflict and host-scope
rules apply to the decision tools and are covered by P01/P03. Rollback consists
of reverting the scoped code/generated artifact change under separate Git
authority; do not delete technical history or downgrade a runtime while assuming
it still validates new agreements. Installation and runtime refresh are separate
explicit user actions, not prerequisites silently performed by these packets.

## Documentation decision

Durable documentation is warranted: the distinction between physical journal
version and reviewed behavioral version is non-obvious and can otherwise look
like a freshness bug; old runtimes and legacy packets can also be misused.
P04 extends the existing authoritative MCP README and shared workflow contract
after P03. It adds no standalone architecture document and requires a fresh
reader check of the actual documented behavior.

## Bootstrap recording limitation

The serving MCP reports `workflow-2/product-1` and no `planning_*` scenarios.
Its current `question_prepare`/answer path appends to the reviewed specification
decision array. Using it for this plan's technical questions would invalidate
the just-reviewed specification. The new mechanism cannot be used before P01.

The user explicitly authorized a one-time bootstrap exception in this chat on
2026-10-21. Collect technical answers with the native user-question tool and
preserve their exact text, provenance and covered proposal sections in these
planning artifacts only, without changing workflow YAML. This overrides the
current skill's MCP checkpoint rule for this plan only. It is not the contract
for future plans and grants no implementation, installation or scope-change
authority.

Question source: `functions.request_user_input_async`, question item
`["request_user_input_async","call_779c6d86f3f94dae80b2eb33d8ba6f00",0]`.

Exact question: «Как сохранить технические согласования этого плана, пока новый
механизм MCP ещё не реализован?»

Exact answer: «Разово разрешить запись точных ответов в карточках задач, без
изменения YAML (рекомендуется)».

## Technical agreement

The bootstrap recording method and all four packet proposals are agreed. P03
includes the user's repair-loop and negative-comparison amendments. P01/P02/P03
were subsequently completed under explicit implementation invocations with their
entry checks. P04 depends on verified P03 and requires its own explicit invocation.

On 2026-10-21, `functions.request_user_input` was called with the three saved
questions below. Its actual result was `{"answers":{}}`. No answer or selection
was returned. The cause was not reported; do not label it a user rejection,
approval or confirmed tool unavailability. That attempt resolved no question.
No default was selected on the user's behalf and no MCP decision was written.

Saved native questions:

- `runtime_architecture` (P01 and Shared technical proposal): «Для P01 какой
  вариант хранения и проверки технических согласований выбираем?» Options:
  «Отдельный раздел (Recommended)» or «Общий список с признаком».
- `skill_structure` (P02 / Technical proposal): «Для P02 согласовать предложенную
  структуру: короткие правила в SKILL.md, подробный протокол в одном reference,
  технический раздел и ссылки на согласование в карточках, проверки до и после
  incremental implementation?» Options: «Принять структуру (Recommended)» or
  «Изменить структуру».
- `qualification_docs` (P03 and P04 / Technical proposal): «Для P03–P04 согласовать
  шесть сфокусированных сценариев для Codex и Claude с реальными трассами, затем
  обновление существующей документации и проверку новым читателем?» Options:
  «Принять оба пакета (Recommended)» or «Скорректировать пакеты».

The user explicitly requested a repeat: «Ещё раз задай эти вопросы, последний,
который ты спрашивал.» The repeated `functions.request_user_input` call returned
the following actual answers on 2026-10-21, keyed by the same question IDs:

- `runtime_architecture`: «Отдельный раздел (Recommended)». Agrees P01
  `Technical proposal` and this plan's `Shared technical proposal`.
- `skill_structure`: «Принять структуру (Recommended)». Agrees P02
  `Technical proposal`, with verified P01 as its dependency.
- `qualification_docs`: «Учти, что в claude тестировать не надо, только в кодексе надо тестировать. И надо проверить реальные end-to-end сценарии, сделать мини-бенчмарк, в котором у нас будут проверяться скорость и качество. Нам важно, чтобы был баланс.»
  This corrects P03 and does not approve the earlier both-host trial proposal
  or independently confirm P04. Preserve its requested Codex-only actual runs
  and end-to-end speed/quality comparison in the revised proposal.

Exact answers are also retained in the affected packets under this plan's
authorized Markdown-only bootstrap exception. No workflow YAML was changed.

The revised joint P03/P04 proposal and speed/quality rule were presented through
`functions.request_user_input_async` on 2026-10-21. Exact question items and
answers:

- Item `["request_user_input_async","call_d5321b9c1c384b3c9cdfc113751a2155",0]`.
  Question: «Согласовать обновлённые P03–P04: две задачи × текущий и новый процесс × два повтора (8 сквозных прогонов только Codex), дополнительные проверки незавершённых/устаревших согласований, затем обновление существующей документации и проверка новым читателем?»
  Answer: «Учти, что в нашем бенчмарке проверки мы также должны делать исправления, чтобы как раз увидеть и улучшить работу. То есть если качество будет неприемлемое, то есть слишком долго или некачественно будет, то надо будет исправлять.»
  This adds an explicit repair-and-rerun requirement to the presented P03/P04
  proposal. P03 owns measured quality/speed repairs within the agreed runtime and
  workflow contracts; P04 retains the presented documentation and fresh-reader
  verification. The initial eight runs are followed by affected reruns as needed.
- Item `["request_user_input_async","call_d5321b9c1c384b3c9cdfc113751a2155",1]`.
  Question: «Как оценивать баланс скорости и качества в P03, если все обязательные проверки качества прошли?»
  Answer: «Сравнить измерения; если новый процесс медленнее, согласовать компромисс по результатам».
  Candidate quality checks must pass; measured remaining slowdown requires the
  user's tradeoff decision before P03 closes. No arbitrary timing quota is added.

All planning choices are resolved with the amendments above. No benchmark,
repair, documentation implementation or other packet was executed by that
planning invocation. P01 was subsequently implemented and verified under a
separate invocation; see its packet and the current handoff.

On 2026-10-21 the user explicitly extended P03 to represent a genuinely incomplete
baseline comparison in the existing verifier without marking it successful or
weakening candidate checks. The same answer batch accepted the measured r3
speed/quality tradeoff (B1 +16.5%, B2 +22.5%, two repetitions with the stated
limitations). Exact native questions, answer texts and item IDs are retained in
[P03](03_behavioral_qualification.md) under the authorized Markdown-only bootstrap.
This is a qualification-evidence amendment; requirements, frozen workflow sources,
oracles, original failed attempts and the separate P04 invocation remain unchanged.

## Inspected evidence

- `src` paths below are relative to `packages/engineer-agent-workflow-mcp/`.
- `src/scope.ts:12-29`: existing current-revision selection and append semantics.
- `src/decisions.ts:39-52`: existing question preparation and non-answer writes.
- `src/scope.ts:107-126`: actual-answer validation and provenance.
- `src/review-model.ts:11-28`: reviewed hash and inventory own specification decisions.
- `src/requirements.ts:46-77,80-139`: Markdown requirements, exact portions and mechanical coverage.
- `src/state.ts:123-128,161-180,376-443`: guarded reads and atomic journal mutation.
- `src/server.ts:19-29`: runtime capability discovery and tool registration.
- `test/completeness.test.mjs:1-70`: real stdio fixture with temporary project and scope setup.
- `scripts/verify-workflow-evidence.mjs:1-42`: existing evidence consistency checker, explicitly not a model-behavior certification.
- `skills/planning-and-task-breakdown/references/task-packets.md:41-116`: current packet contract.
- `skills/incremental-implementation/references/packet-recovery.md:17-38`: current ownership and recovery boundaries.

Re-verify affected evidence at each implementation entry. These are inspected
sources, not claims that the proposed behavior has been implemented or tested.
