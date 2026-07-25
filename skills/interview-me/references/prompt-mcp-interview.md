# Prompt MCP Interview Routing

Read this reference only after `interview-me` has found a suitable Prompt MCP
operation in the active callable-tool list. It governs tool selection,
question identity, batching, recovery, checkpointing, and privacy. It does not
authorize Prompt MCP configuration or a downstream artifact.

## Tool Selection

Inspect callable tool names, descriptions, and input/output schemas at runtime.
Use only operations that are actually callable and only fields, limits,
statuses, and defaults their schemas advertise. Never hard-code or construct a
server namespace.

- Prefer a recoverable persistent interview only when start, batch, resume, and
  read capabilities needed for recovery are callable.
- Otherwise use an advertised bounded batch or single-question operation.
- Never infer a missing operation, field, status, identity format, batch size,
  timeout, persistence guarantee, or retry rule.
- If the callable set cannot represent the required interview safely, report
  the unresolved boundary and stop without plain-chat fallback.

## Questions And Batches

Use stable semantic question IDs and stable option IDs; labels and display order
are not identities. Derive each question from one material unresolved decision.
Explain options neutrally and include custom text only when the schema permits
it.

Keep each batch within every advertised item and payload limit. Prefer the
smallest batch that preserves decision context. Before each call, persist or
retain the bounded question snapshot needed for reconciliation, but never
persist secrets or unrelated personal data.

## Results And Recovery

Treat an answer as authoritative only when the advertised result explicitly
marks it committed or answered. If durability metadata exists, require the
committed durable result before storing it as settled.

`paused`, `cancelled`, `timed_out`, `unavailable`, `invalid_request`,
`conflict`, and `failed` are not answers. Do not copy their selections, text,
diagnostics, or sentinels into the durable answer set.

- Checkpoint each committed non-sensitive answer immediately in the
  user-authorized interview record.
- Preserve committed partial results when a later question pauses or fails.
- Reconcile recovery reads by stable question identity and revision where the
  schema exposes them; never overwrite a newer settled answer.
- Resume only when a callable operation and the user-authorized record provide
  enough evidence. Otherwise report remaining uncertainty and stop.

## Privacy And Completion

Questions, options, stable IDs, answers, project paths, environment values, and
private decision data belong only in the tool fields and authorized checkpoint
that require them. Never place them in logs, diagnostics, generated host
metadata, or unrelated fixtures.

Summarize committed decisions and unresolved questions without exposing
private content. Stop before specification, planning, implementation, another
workflow, installation, or publication.
