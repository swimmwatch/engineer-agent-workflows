# Packet 05: Context And Discovery Workflows

Requirements: SKILL-001, SKILL-002, SKILL-005, MCP-001, TOK-002, ACC-001,
ACC-007.

## Outcome

Generalize three standalone discovery-oriented workflows:
`context-engineering`, `idea-refine`, and `interview-me`. They must discover
the active project's actual guidance and tools, preserve explicit user control,
and treat non-committed Prompt MCP outcomes as non-answers.

## Prerequisites

- Packet 01 is complete.
- Read the corresponding source skills and their directly routed references.
- The fixture harness can expose simulated Codex/Claude guidance, callable
  tools, and bounded Prompt MCP results without a real user profile.

## Scope

- Author the three bounded, portable skill directories.
- Preserve their distinct goals: durable instruction/context repair, idea
  refinement before commitment, and structured requirements interviewing.
- Add conditional Prompt MCP routing that follows callable tool names and
  published schemas.
- Add progressive-disclosure and privacy fixtures.
- Update only these catalog descriptions if needed.

## Non-Goals

- Do not hard-code a Prompt MCP server namespace or install/configure Prompt
  MCP.
- Do not assume `AGENTS.md` and `CLAUDE.md` both exist.
- Do not silently turn ideation/interview output into a spec, plan, code, or
  project mutation.
- Do not preload other skill bodies, all project documentation, or all
  references.
- Do not add fallback questionnaires that misrepresent unavailable MCP results
  as committed answers.

## File Boundaries

| File/unit | State | Contract |
| --- | --- | --- |
| `skills/context-engineering/SKILL.md` | Proposed | Explicitly requested audit/repair of agent guidance, routing, context size, stale facts, and handoff continuity. |
| `skills/idea-refine/SKILL.md` | Proposed | Explicitly requested exploration/comparison/stress test of a product, architecture, tooling, or workflow idea before commitment. |
| `skills/interview-me/SKILL.md` | Proposed | Explicitly requested structured interview for material unresolved decisions, with bounded batches and recoverable answers. |
| Skill-local references | Proposed only if required | Optional details named by an exact routing condition; no generic host setup duplication. |
| `tests/context-discovery-skills.test.mjs` | Proposed | Guidance precedence, stale-context, explicit-only, Prompt MCP, progressive-disclosure, and stop-boundary cases. |
| `tests/fixtures/context-discovery/` | Proposed | Codex/Claude projects, missing guidance, conflicting evidence, callable/non-callable tool registries, and all terminal statuses. |
| `catalog/skills.json` | Existing | Only these final descriptions may change; all remain standalone. |

## Shared Discovery Contract

- Codex reads the nearest applicable `AGENTS.md`; Claude Code reads applicable
  `CLAUDE.md`. Both inspect only task-relevant code, tests, interfaces,
  configuration, and stable docs.
- Current repository evidence outranks generic defaults and stale handoffs.
- Unknown language, commands, tools, directories, policies, or client features
  remain explicitly unknown until evidence establishes them.
- Each workflow loads only its own bounded `SKILL.md`; a reference is loaded
  only at its documented condition.
- Recommendations for another workflow are informational. Never invoke or load
  it on the user's behalf.

## Prompt MCP Contract

- Use the globally configured Prompt MCP only when the needed interview tools
  appear in the active callable tool set.
- Follow the exposed schemas exactly and use stable question/option IDs rather
  than labels as identities.
- Use recoverable batches for material decisions when supported; checkpoint
  committed non-sensitive answers in the artifact owned by the current
  workflow.
- `paused`, `cancelled`, `timed_out`, `unavailable`, `invalid_request`,
  `conflict`, and `failed` are not answers. Preserve completed answers, report
  the state, and stop or resume as authorized.
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
- `interview-me` identifies material questions, groups at most the current MCP
  schema permits, explains option implications, checkpoints committed answers,
  avoids re-asking settled decisions, summarizes remaining uncertainty, and
  stops without producing the downstream artifact.

## Acceptance Criteria

- All three names are stable, standalone, explicit-only, and within size
  limits.
- Codex and Claude fixtures apply the correct project guidance and do not
  fabricate the other host's file.
- Prompt MCP fixtures use only callable schema-defined tools and no generated
  namespace string.
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
grep -RInE 'mcp__|prompt-mcp/.agents|internal/|go test|GTK|Zenity' \
  skills/context-engineering skills/idea-refine skills/interview-me
```

Review every static-search match; intentional generic references to Prompt MCP
are allowed, generated namespaces and source-project assumptions are not.

## References

- [Approved specification](../spec.md): repository adaptation, refinement,
  runtime disclosure, Prompt MCP, skill validation, and context-efficiency
  contracts.
- Initial refinement sources: the three matching skill directories in the
  approved `prompt-mcp` source repository.

## Completion And Handoff

- Mark only packet 05 complete.
- Record final sizes, optional references, tool-status fixtures, sentinel
  evidence, and remaining workflow packets.
- Stop. Do not commit, invoke Prompt MCP against a real user, or begin another
  packet without separate authorization.
