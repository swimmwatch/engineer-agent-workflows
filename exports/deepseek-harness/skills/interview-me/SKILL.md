---
name: interview-me
description: "Run a structured requirements interview when the user explicitly asks to be interviewed, grilled, or guided through unresolved decisions. Use host-native questions, checkpoint explicit answers, and stop before downstream work."
disable-model-invocation: true
user-invocable: true
---

# Interview Me

Use this workflow only when the user explicitly asks for a structured
requirements interview. The interview gathers decisions; it does not authorize
a specification, plan, implementation, repository mutation, installation, or
publication.

1. Use project instructions already supplied by the host; do not reread their
   source files solely to recover context. Read an additional task-scoped
   `AGENTS.md` only when it is not already in the active
   context or the file itself is in scope. Do not fabricate
   another host's file. Inspect only
   task-relevant code, tests, interfaces, configuration, stable documentation,
   and the user-authorized interview record. Current repository evidence and
   settled decisions outrank generic guidance or stale handoffs.
2. State a one-sentence hypothesis about the user's intent and an honest
   confidence level. Separate known facts, settled choices, material unknowns,
   and decisions blocked by each unknown. Do not re-ask settled decisions or
   invent project facts.
3. Read `references/host-native-questions.md`. Use `ask_user_question` in
   the current mode; do not enter
   plan mode solely to ask. Ask one material question at a time with the
   agent's current guess and let each answer shape the next question. Use the
   documented conversational fallback when the standard tool is unavailable.
4. Checkpoint each explicit non-sensitive answer in the user-authorized
   interview record before continuing. Preserve explicit partial results after
   dismissal or failure; non-answers never become settled choices.
5. Restate outcome, user, success, binding constraint, and non-goals in the
   user's terms. Require explicit confirmation and revise the restatement when
   corrected. Finish with confirmed decisions, evidence, remaining uncertainty,
   and the
   next unanswered material decision. Keep output and diagnostics bounded and
   exclude private paths, prompts, answers, IDs, credentials, personal data,
   and environment values.

Stop when the intent is explicitly confirmed or the interview cannot continue.
Do not
produce the downstream artifact, invoke another workflow, install, or publish.
