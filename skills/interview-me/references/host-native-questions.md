# Host-Native Interview Questions

Use this reference only after `interview-me` is explicitly invoked. It defines
question order, host-native interaction, recovery, checkpointing, and privacy;
it does not authorize a downstream artifact.

## Question Interaction

Use callable `{{HOST_QUESTION_TOOL}}`.
Inspect the exposed schema at runtime and follow its current fields and limits.
Do not construct tool namespaces, invent response fields, or enter plan mode
solely to ask.

Ask one question at a time because the next question depends on the preceding
answer. Give each question a stable semantic ID and attach the agent's current
guess with a short basis. A visible guess gives the user something concrete to
correct and exposes the agent's assumptions.

If the standard tool is unavailable, use a conversational fallback: ask the
same saved question directly in the conversation and stop that turn. A later
explicit reply may answer it. Silence or an absent tool result is not an answer.

## Results And Recovery

Treat an answer as authoritative only when it contains the user's explicit
selection or custom text for the saved question. `dismissed`, `cancelled`,
`timed_out`, `unavailable`, `invalid_response`, and `failed` are non-answers.

- Checkpoint each explicit non-sensitive answer immediately in the
  user-authorized interview record.
- Preserve explicit partial results when a later question is dismissed or
  fails.
- Never re-ask settled decisions unless the user reopens them.
- Resume at the first unresolved material question after reloading the record.
- If an answer changes, append a revision and mark the earlier answer
  superseded instead of overwriting history.

## Confirmation

When the agent can state the intended outcome, user, success measure, binding
constraint, and non-goals, present that compact restatement for explicit
confirmation. General encouragement, silence, or delegation is not confirmation.
Fold corrections into a revised restatement and ask again.

## Privacy And Completion

Questions, options, IDs, answers, repository paths, and environment values
belong only in the tool fields and authorized checkpoint that require them.
Never place them in logs, diagnostics, generated host metadata, or unrelated
fixtures.

Summarize confirmed decisions and unresolved questions without exposing private
content. Stop before specification, planning, implementation, another workflow,
installation, or publication.
