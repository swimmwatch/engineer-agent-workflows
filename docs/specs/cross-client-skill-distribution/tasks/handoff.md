# Cross-Client Skill Distribution Handoff

## State

- Specification: approved, Prompt MCP revision 4.
- Packets 01–04: committed.
- Packet 05: complete and uncommitted.
- Branch: `main`; origin:
  `https://github.com/swimmwatch/engineer-agent-workflows.git`.
- Published, installed, or generated plugin artifacts: none.

## Transition Commits

- `623d96c feat(skills): add code-quality workflows`
- `bd5c18a docs(spec): complete code-quality workflows packet`

Each staged diff was inspected for exact scope and whitespace before commit.
Nothing was pushed.

## Packet 05 Changes

Standalone workflow documents:

- `skills/context-engineering/SKILL.md`
- `skills/idea-refine/SKILL.md`
- `skills/interview-me/SKILL.md`

Conditional progressive-disclosure reference:

- `skills/interview-me/references/prompt-mcp-interview.md`

Tests and fixtures:

- `tests/context-discovery-skills.test.mjs`
- three workflow scenario fixtures under
  `tests/fixtures/context-discovery/<skill-name>/`
- `tests/fixtures/context-discovery/prompt-mcp-outcomes.json`
- `tests/fixtures/context-discovery/progressive-disclosure.json`

Completion records:

- `docs/specs/cross-client-skill-distribution/tasks/todo.md`
- `docs/specs/cross-client-skill-distribution/tasks/handoff.md`

The existing catalog descriptions, standalone classifications, dependencies,
and host policies remain unchanged. No dependency or executable script was
added.

## Contracts Delivered

- All three workflows are standalone and explicit-only for both supported
  hosts. Codex reads the nearest applicable `AGENTS.md`; Claude Code reads
  applicable `CLAUDE.md`; neither fabricates the other host's guidance.
- Current repository evidence and approved rules outrank generic defaults and
  stale handoffs. Unsupported commands, paths, tools, policies, and client
  features remain explicitly unknown.
- `context-engineering` separates transient session context, durable repository
  guidance, host configuration, skills/plugins, live callable-tool data, and
  handoffs. It repairs only the authorized surface and preserves project code.
- `idea-refine` frames goals and evidence, compares two to four materially
  different and reversible directions, uses a callable Prompt MCP schema only
  for material user choices, and stops before specification, planning, or
  implementation.
- `interview-me` uses only advertised callable operations and limits, does not
  re-ask settled decisions, checkpoints committed non-sensitive answers,
  preserves committed partial results, and stops before downstream work.
- When no suitable interview tool is callable, `interview-me` reports the
  unavailable boundary and does not load its Prompt MCP reference or substitute
  a fallback questionnaire.

Exact sizes:

| Artifact | UTF-8 bytes | Description code points |
| --- | ---: | ---: |
| `context-engineering/SKILL.md` | 2,448 | 232 |
| `idea-refine/SKILL.md` | 2,496 | 227 |
| `interview-me/SKILL.md` | 2,315 | 232 |
| `interview-me/references/prompt-mcp-interview.md` | 2,999 | n/a |

## Guidance And Tool Evidence

- Codex fixtures select the nearest available `AGENTS.md`; Claude fixtures
  select `CLAUDE.md`; missing guidance remains unknown without fabrication.
- Conflicting evidence fixtures select current repository facts over a stale
  handoff.
- Context mutation fixtures change only the selected durable guidance and keep
  the modeled project-code digest unchanged; read-only audits change nothing.
- Callable registries use arbitrary fixture-defined tool names. Tests prove
  selected names exist in the registry, batch sizes do not exceed advertised
  schemas, stable semantic IDs are used, and no namespace is constructed.
- Recoverable, single-question, and unavailable tool sets are covered. Settled
  decisions are excluded from later questions.
- Only an explicitly committed durable `answered` result is checkpointed.
  `paused`, `cancelled`, `timed_out`, `unavailable`, `invalid_request`,
  `conflict`, and `failed` are tested as non-answers.

## Progressive Disclosure And Privacy

- Instrumented fixture cases load only the selected workflow body.
- The interview reference sentinel loads only when `interview-me` has a
  callable interview tool; it stays unloaded for context, idea, and unavailable
  interview cases.
- Four synthetic private-value markers and four loading sentinels exist only in
  declarative fixtures. Tests prove modeled outputs exclude private values,
  callers receive copy-isolated fixture state, and production skills contain no
  sentinel.
- Skills and the conditional reference prohibit prompts, answers, stable IDs,
  private paths, credentials, personal data, and environment values in logs,
  diagnostics, generated host metadata, or unrelated fixtures.

## Verification

Environment:

- Node.js: `v24.14.0`
- npm: `11.9.0`

Results:

- `npm test -- --test-name-pattern='context engineering|idea refine|interview'`
  — passed, 22 selected tests.
- `npm test` — passed, 84 tests.
- `node --test` — passed, 84 tests.
- `npm run validate:foundation` — passed, `11/15 skills present`.
- `npm run generate:check -- --allow-incomplete` — passed,
  `4 skills pending`.
- `npm run validate` — expected fail-closed result:
  `E_INCOMPLETE: complete validation requires all 15 skill directories`.
- Static searches found no generated namespace, source-project assumption,
  fixture tool name in production, personal path, credential pattern, or
  production sentinel.
- UTF-8/LF/final-newline/trailing-whitespace validation passed for all 10 new
  files.
- Catalog/frontmatter validation, copied fixture state, unchanged production
  snapshots, no-symlink inspection, and `git diff --check` passed.

## Compatibility And Limitations

- Skills and tests use existing Node.js built-ins only and preserve the declared
  Node.js 22.20.0 floor.
- No real Prompt MCP, global Codex or Claude state, project production code,
  dependency, lockfile, host plugin, marketplace, installation, generated
  distribution, or network service was accessed.
- Generic Prompt MCP references are intentional. No server namespace or
  fixture-defined tool name appears in production workflow content.
- The collection remains incomplete and intentionally unavailable for
  installation or generation.
- Packet 05 remains uncommitted for review.

## Available Next Packets

Packets 06–07 remain independently available:

- [Packet 06 — Documentation workflows](06_documentation_workflows.md)
- [Packet 07 — Delivery workflows](07_delivery_workflows.md)

Packet 06 is the first unchecked packet. Before any next packet, verify Packet
05 against this handoff and obtain explicit authorization to commit its exact
changes. Do not commit, push, install, publish, generate plugins, invoke a real
Prompt MCP, or begin another packet in the current turn.
