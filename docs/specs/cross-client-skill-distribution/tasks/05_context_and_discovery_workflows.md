# Packet 05: Context And Discovery Workflows

Requirements: SKILL-001, SKILL-002, SKILL-005, INT-001, MCP-001, TOK-002,
ACC-001, ACC-004, ACC-007.

## Outcome

Generalize three standalone discovery-oriented workflows:
`context-engineering`, `idea-refine`, and `interview-me`. They must discover
the active project's actual guidance and tools, preserve explicit user control,
use host-native questions for material choices, and treat missing or
non-committed interactions as non-answers.

## Prerequisites

- Packet 01 is complete.
- Read the corresponding source skills and their directly routed references.
- The fixture harness can expose simulated Codex/Claude guidance, callable
  standard question tools, and bounded outcomes without a real user profile.

## Scope

- Author the three bounded, portable skill directories.
- Preserve their distinct goals: durable instruction/context repair, idea
  refinement before commitment, and structured requirements interviewing.
- Add host-native routing for Codex `request_user_input` and Claude Code
  `AskUserQuestion` that follows each active callable schema.
- Add progressive-disclosure and privacy fixtures.
- Update only these catalog descriptions if needed.

## Non-Goals

- Do not require, invoke, install, or configure Prompt MCP.
- Do not assume `AGENTS.md` and `CLAUDE.md` both exist.
- Do not silently turn ideation/interview output into a spec, plan, code, or
  project mutation.
- Do not preload other skill bodies, all project documentation, or all
  references.
- Do not enter plan mode solely to ask a question or misrepresent a dismissed,
  unavailable, or failed interaction as a committed answer.

## File Boundaries

| File/unit | State | Contract |
| --- | --- | --- |
| `skills/context-engineering/SKILL.md` | Proposed | Explicitly requested audit/repair of agent guidance, routing, context size, stale facts, and handoff continuity. |
| `skills/idea-refine/SKILL.md` | Proposed | Explicitly requested exploration/comparison/stress test of a product, architecture, tooling, or workflow idea before commitment. |
| `skills/interview-me/SKILL.md` | Proposed | Explicitly requested structured interview for material unresolved decisions, one adaptive host-native question at a time, with recoverable answers. |
| Skill-local references | Proposed only if required | Optional details named by an exact routing condition; no generic host setup duplication. |
| `tests/context-discovery-skills.test.mjs` | Proposed | Guidance precedence, stale-context, explicit-only, host-native question, progressive-disclosure, and stop-boundary cases. |
| `tests/fixtures/context-discovery/` | Proposed | Codex/Claude projects, missing guidance, conflicting evidence, callable/non-callable tool registries, and all terminal statuses. |
| `catalog/skills.json` | Existing | Only these final descriptions may change; all remain standalone. |

## Shared Discovery Contract

- Both hosts reuse project instructions already supplied in active context.
  Codex reads an additional task-scoped `AGENTS.md` and Claude Code an
  additional `CLAUDE.md` only when absent from active context or when the file
  itself is in scope. Both inspect only task-relevant code, tests, interfaces,
  configuration, and stable docs.
- Current repository evidence outranks generic defaults and stale handoffs.
- Unknown language, commands, tools, directories, policies, or client features
  remain explicitly unknown until evidence establishes them.
- Each workflow loads only its own bounded `SKILL.md`; a reference is loaded
  only at its documented condition.
- Recommendations for another workflow are informational. Never invoke or load
  it on the user's behalf.

## Host-Native Question Contract

- Use callable `request_user_input` in Codex or `AskUserQuestion` in Claude Code
  for material unresolved choices. Follow the exposed schema and limits; do
  not enter plan mode solely to make the tool available.
- `interview-me` asks one material question at a time and includes the agent's
  current guess because each answer shapes the next question. `idea-refine`
  asks only choices required to distinguish or select alternatives.
- Checkpoint explicit non-sensitive answers in the artifact owned by the
  current workflow when it has one. Never infer an answer from a missing,
  dismissed, cancelled, timed-out, unavailable, invalid, or failed interaction.
- If the standard tool is unavailable, ask the exact saved question directly
  in conversation and stop when its answer is required for a sound result.
- Do not place prompts, answer sentinels, IDs, paths, or private decision data
  in logs, diagnostics, fixtures, or generated host metadata.

## Skill-Specific Contract

- `context-engineering` distinguishes transient prompt context, durable
  repository guidance, host config, skills, plugins, live MCP data, and
  handoffs. It repairs only the user-authorized surface, removes stale or
  duplicated guidance, and verifies routing/context impact.
- `idea-refine` frames the problem and success criteria, generates materially
  distinct alternatives, compares trade-offs/risks/reversibility, identifies
  unknowns and experiments, and ends with a recommendation or decisions
  needing explicit user choice.
- `interview-me` identifies material questions, asks them adaptively one at a
  time with a current guess, explains option implications, checkpoints explicit
  answers, avoids re-asking settled decisions, summarizes remaining
  uncertainty, and stops without producing the downstream artifact.

## Acceptance Criteria

- All three names are stable, standalone, explicit-only, and within size
  limits.
- Codex and Claude fixtures reuse host-supplied guidance, read only additional
  scoped guidance when required, and do not fabricate the other host's file.
- Codex and Claude fixtures use their respective callable standard question
  tools in the current interaction mode and never require plan mode.
- Every non-committed status is excluded from the durable answer ledger.
- Context repair changes only the selected durable surface and leaves project
  code unchanged.
- Idea and interview fixtures stop before specification/planning/implementation.
- Instrumented sentinels prove unselected bodies and conditionally irrelevant
  references are not loaded.
- Output and diagnostics contain no private answer/path/environment sentinel.

## Verification

```bash
npm test -- --test-name-pattern='context engineering|idea refine|interview'
npm run validate:foundation
npm run generate:check -- --allow-incomplete
grep -RInE 'Prompt MCP|prompt-mcp|mcp__|internal/|go test|GTK|Zenity' \
  skills/context-engineering skills/idea-refine skills/interview-me
```

The static search must return no active Prompt MCP dependency, generated
namespace, or source-project assumption.

## References

- [Approved specification](../spec.md): repository adaptation, refinement,
  runtime disclosure, host-native questions, retired Prompt MCP integration,
  skill validation, and context-efficiency contracts.
- Initial refinement sources: the three matching skill directories in the
  approved `prompt-mcp` source repository.

## Completion And Handoff

- Mark only packet 05 complete.
- Record final sizes, optional references, tool-status fixtures, sentinel
  evidence, and remaining workflow packets.
- Stop. Do not commit or begin another packet without separate authorization.
