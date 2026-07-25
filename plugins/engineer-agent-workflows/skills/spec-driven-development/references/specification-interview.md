# Specification Interview

Use this reference only after the specification skill has verified the sibling
engineering manual. It defines durable decisions, Prompt MCP interaction,
recovery, coverage, and approval. It does not authorize planning or
implementation.

- [Evidence and scope](#evidence-and-scope)
- [Decision ledger](#decision-ledger)
- [Interview tool interaction](#interview-tool-interaction)
- [Recovery and status handling](#recovery-and-status-handling)
- [Specification contract](#specification-contract)
- [Draft approval](#draft-approval)

## Evidence And Scope

Read applicable host project guidance and establish repository-observable facts
before asking questions. Inspect only task-scoped code, tests, public
interfaces, configuration, and stable documentation. Record facts as
`observed`, with repository-relative evidence. Ask only unresolved decisions
that materially change behavior, interfaces, security, compatibility,
external effects, or acceptance.

Evaluate these categories and mark evidence-backed exclusions
`not_applicable`: outcome and stakeholders; current state and scope; normal and
alternate flows; interfaces and data; state ownership and retention; limits
and failure recovery; security and privacy; operations and observability;
compatibility and evolution; quality and acceptance. Leave implementation-local
file, symbol, framework, and task-order choices to planning.

## Decision Ledger

Create `docs/specs/<slug>/decisions.yaml` before the first material question.
Store normalized, non-sensitive decisions rather than a transcript. Use stable
semantic IDs and append positive integer revisions; never renumber or overwrite
history.

Each decision records:

- stable ID, revision, category, state, and provenance;
- repository-relative evidence and a bounded question/option snapshot;
- normalized selected IDs and text only for a committed answer;
- the last Prompt MCP status and optional superseded revision;
- requirement IDs once the draft is normalized.

Use these states:

- `observed`: established by repository or authoritative evidence;
- `assumed`: low-risk reversible default with an exposed rationale;
- `needs_user`: material question prepared but unanswered;
- `answered`: committed authoritative user answer;
- `not_applicable`: category excluded with a reason;
- `blocked`: material decision cannot currently be resolved;
- `superseded`: earlier revision replaced by an explicit later revision.

Before a Prompt MCP call, persist the new revision, question snapshot, and
`needs_user` state. After the call, persist its status immediately. For a
committed answer, store normalized answer fields, set user provenance, and mark
the revision `answered`. For a changed answer, append a revision, link it to
the prior one, and mark the prior revision `superseded`.

Never persist credentials, secrets, unrelated personal data, raw reasoning, or
diagnostic payloads. If an answer contains sensitive material, omit it, mark
the decision blocked, and request a non-sensitive restatement.

## Interview Tool Interaction

Inspect the callable tool list and schemas at runtime. Do not hard-code an MCP
namespace, invent missing tools, or guess request and response fields.

- Prefer a recoverable workspace interview when start, batch, resume, and read
  operations are callable. Use stable interview, question, batch, category,
  and idempotency identities derived from the specification decision IDs.
- Use bounded batches only within the advertised question and size limits.
  Checkpoint every returned committed answer before advancing.
- Resume an existing interview when recovery tools are callable. Reconcile its
  committed answers with the ledger by stable question identity and revision;
  never replace a newer ledger revision silently.
- When only a single-question Prompt MCP operation is callable, ask one focused
  material decision per call and checkpoint it immediately.
- If no callable Prompt MCP operation can obtain the required user decision,
  mark it blocked and stop. Do not substitute plain chat or another UI.
- Choose single, multiple, or text semantics from the decision. Use concise
  stable option IDs, evidence-backed recommendations, and an explicit bounded
  timeout. Never request secrets.

An answer is authoritative only when the advertised response marks it
answered or committed. When persistent interaction metadata includes
durability, require the committed durable result. Preserve each committed
answer from a partial batch even when later questions pause or fail.

## Recovery And Status Handling

Treat `cancelled`, `timed_out`, `unavailable`, `conflict`,
`invalid_request`, and `failed` as non-answers. Do not copy selected IDs, text,
diagnostics, or sentinel data from those outcomes into an answered decision.

- Correct `invalid_request` against the callable schema without inferring an
  answer.
- Reconcile `conflict` against the ledger and stored interview identity before
  retrying.
- Preserve committed partial results for pause, cancellation, timeout, or
  later failure.
- Mark unresolved material work `blocked`; retry only with user direction or
  evidence that the original transient condition changed.

After compaction or handoff:

1. Reload and validate `decisions.yaml`.
2. Select the highest non-superseded revision per decision ID.
3. Require answers for `answered` records and evidence for `observed` records.
4. Reconcile callable Prompt MCP recovery reads without repeating committed
   questions.
5. Continue from the first unresolved material category.

Do not draft while material decisions, supersession chains, safety choices, or
acceptance prerequisites remain unresolved.

## Specification Contract

Write observable outcomes, interfaces, schemas and state, validation, defaults
and limits, alternate flows, failure and recovery, security and privacy,
compatibility and migration, non-goals, and objective acceptance. Map every
active decision to requirement IDs or a reasoned `not_applicable` result.

Keep the artifact behavioral. Do not invent classes, functions, internal file
layout, dependency injection, task order, estimates, or implementation
packets. Run a final gap review as user, operator, implementer, tester,
security reviewer, and maintainer: identify anything they would still need to
invent or could not verify.

## Draft Approval

Keep `spec.md` at `Status: Draft` until the user can inspect the normalized
contract. Create and checkpoint a separate `approval.spec` decision, then ask
one Prompt MCP approval question with stable choices:

- `approve`: approve this draft as the implementation contract;
- `request-changes`: reopen affected decisions and revise;
- `leave-draft`: stop without approval.

Treat custom text as requested changes. Only an explicitly committed `approve`
answer permits `Status: Approved`; when durability metadata exists it must be
durable. Idea approval, interview completion, or planning authorization is not
draft approval. Finish the specification handoff and stop.
