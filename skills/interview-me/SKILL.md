---
name: interview-me
description: "Run a structured requirements interview when the user explicitly asks to be interviewed, grilled, or guided through unresolved decisions. Use available Prompt MCP tools, checkpoint committed answers, and stop before downstream work."
disable-model-invocation: true
user-invocable: true
---

# Interview Me

Use this workflow only when the user explicitly asks for a structured
requirements interview. The interview gathers decisions; it does not authorize
a specification, plan, implementation, repository mutation, installation, or
publication.

1. In Codex, read the nearest applicable `AGENTS.md`; in Claude Code, read
   applicable `CLAUDE.md`. Do not fabricate the other host's file. Inspect only
   task-relevant code, tests, interfaces, configuration, stable documentation,
   and the user-authorized interview record. Current repository evidence and
   settled decisions outrank generic guidance or stale handoffs.
2. Separate known facts, settled choices, material unknowns, and decisions
   blocked by each unknown. Do not re-ask settled decisions. Keep language,
   commands, tools, directories, policies, and client features `unknown` until
   evidence establishes them.
3. Inspect the active callable-tool list without loading other skill bodies. If
   a suitable Prompt MCP interview operation is callable, read
   `references/prompt-mcp-interview.md` and follow it. If none is callable,
   report that the structured interview is unavailable and stop without a
   fallback questionnaire or fabricated answer.
4. Ask only material questions, explain option implications without steering,
   and use stable question and option IDs. Checkpoint every committed
   non-sensitive answer in the user-authorized interview record before
   continuing. Preserve completed answers across pause or failure and never
   treat a non-committed outcome as an answer.
5. Finish with committed decisions, evidence, remaining uncertainty, and the
   next unanswered material decision. Keep output and diagnostics bounded and
   exclude private paths, prompts, answers, IDs, credentials, personal data,
   and environment values.

Stop when the requested interview is complete or cannot continue. Do not
produce the downstream artifact, invoke another workflow, install, or publish.
