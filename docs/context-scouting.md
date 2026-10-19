# Context scouting

`context-scouting` delegates useful context discovery to native inspection-only
subagents. It is a standalone explicit-only skill, separate from
`context-engineering`, and does not require Workflow MCP. It supports work already
authorized in the current task; invocation grants no editing, installation,
publication or additional workflow authority.

## Invoke for the current task

First make the matching host artifact available through a separately authorized
installation or update. For the personal Codex plugin, follow
[local development](local-development.md); for global skill copies, reuse the
[reviewed pinned lifecycle commands](evidence/skills-cli-1.5.20.md#reviewed-commands).
Do not install both copies of the collection or modify consuming projects.

In Codex CLI or the IDE, type `$` or use `/skills` and select **Context Scouting**.
For a global skill copy, an explicit prompt is:

```text
$context-scouting Find how an order reaches the delivery queue and which tests cover it. Inspect only and cite evidence.
```

For a plugin installation, select its displayed skill entry so the host inserts
the correct plugin-qualified mention. The
[official Codex skill guide](https://developers.openai.com/codex/skills#how-codex-uses-skills)
documents explicit selection. Codex qualification also used an explicit request
to read the exact generated artifact, without installing it:

```text
Use the context-scouting skill at <absolute-generated-skill-path>. In <absolute-fixture-root>, trace order dispatch and identify its tests. Inspect only and cite evidence.
```

Replace both placeholders with actual paths. Use the generated
[Codex SKILL.md](../plugins/codex/engineer-agent-workflows/skills/context-scouting/SKILL.md),
not the canonical template containing host variables.

For Claude Code's native plugin, the documented invocation is:

```text
/engineer-agent-workflows:context-scouting Trace order dispatch and identify its tests. Inspect only and cite evidence.
```

A global standalone copy uses `/context-scouting` instead. This follows
[Claude Code's plugin skill naming](https://code.claude.com/docs/en/plugins) and
the generated user-invocable metadata. **Claude runtime qualification was
cancelled by the user; these Claude examples are documentation/metadata checks,
not successful live trials.**

The policy lasts only for the current task. Completion or cancellation ends its
scope. Repeated invocation reuses still-valid findings; a new task does not
inherit a standing delegation obligation. Generated Codex metadata disables
implicit invocation; Claude metadata disables model invocation while retaining
user invocation. Independently applicable project instructions still apply.

## Discovery and model selection

The main agent first checks whether delegation is useful. A known file, a short
check or sufficient existing evidence uses direct lookup. Unfamiliar multi-file
flows can use one bounded scout when the expected reduction in main-context
material exceeds dispatch and verification overhead and runtime rules permit it.
Additional scouts need substantial independent questions and available capacity.

Only after choosing delegation does the agent load the assignment reference.
It sends the exact question, absolute roots, known facts, applicable instructions,
scope, search depth and stopping condition, preferably in fresh context. The scout
returns concise paths, symbols, source lines and unresolved gaps. The main agent
rereads decisive passages, reconciles stale findings and owns decisions, edits
and required checks. Scout completion is not implementation verification.

| Host        | Requested scout model | Reasoning setting                                      |
| ----------- | --------------------- | ------------------------------------------------------ |
| Codex       | `gpt-6-luna`          | `medium` when exposed and supported                    |
| Claude Code | `haiku`               | `medium` only if exposed and supported; otherwise omit |

`haiku` is an alias, not a pinned underlying model release. An explicit supported
user override applies only to the scout in that task. It does not change the main,
reviewer or implementer model, or global settings. Do not shop for models, silently
inherit a larger parent model or substitute another model. A requested model is
not proof of the effective model; report the latter only when the host exposes it.
Search depth (`quick`, `medium`, `thorough`) is separate from reasoning effort.

These selections are operational requests through callable native schemas.
The collection's author/reviewer/implementation model suggestions remain advisory
and do not switch or gate those models.

## Limits, failures and cancellation

Scouts inspect only: no edits, external mutations, installation, commits or child
agents. Restrict tools when the native interface supports it. An inspection-only
assignment is not an enforced technical sandbox; report actual host restrictions
separately. Preserve applicable source, privacy, RTK and CodeGraph rules without
creating an index or importing unrelated private context. A no-match answer names
its searched scope and limits, rather than claiming absence elsewhere.

- Missing native tools, unavailable/rejected model selection, rejected supported
  settings or unusable results: disclose the specific limitation once and perform
  only the minimum authorized direct discovery. Do not retry unsupported requests,
  silently substitute models, create user-visible tasks or launch nested CLI
  sessions as a scouting fallback.
- An effort field absent from the schema is omitted, never invented or reported as
  applied. Partial results retain verified findings and explicit gaps; use a
  targeted permitted follow-up or direct lookup and report remaining blockers.
- Cancellation or task replacement stops new dependent work and attempts to stop
  outstanding scouts through supported controls. Do no fallback discovery after
  cancellation. Report unavailable/failed stopping honestly and label late or
  partial results. Resumption reassesses changed sources and reuses valid evidence.

## Migration and evidence

The implementation removed the single old global Codex
`Context Gathering And Delegation` section and verified unchanged surrounding
bytes and permissions. No standing replacement rule was added. Explicit invocation
now activates this skill's policy; an unrelated task has no obligation from this
skill. Removal did not install or enable the replacement. Generated files being
present in this repository do not prove that the active host has them installed.

Historical qualification recorded Codex 0.159.2 CLI and native app qualification: effective `gpt-6-luna` with
`medium`, direct lookup, uninvoked task, reuse/stale-source verification, scoped
no-match, supported override and actual interruption. Claude artifacts passed
static generation/format checks; Claude live testing was blocked before model
calls and then cancelled. Missing tools, absent/rejected effort, restricted partial
results and unavailable stopping were labeled observation simulations. Those
simulations are not runtime passes, and this evidence is not a compatibility
promise for every client, schema, account or environment.

Savings remain **unmeasured**. Any numerical claim needs comparable aggregate
usage evidence counting dispatch, scouts, summaries, main-agent verification,
retries and fallback against a comparable baseline. Distinguish main-context
reduction from total tokens, monetary cost and latency; delegation does not
guarantee a reduction in all of them.

## Maintainer entry points

- [Canonical skill](../skills/context-scouting/SKILL.md) and its conditional
  [assignment reference](../skills/context-scouting/references/delegation.md).
- [Host renderer](../scripts/lib/distribution.mjs): `HOST_SCOUT_MODEL` mapping and
  `renderHostTemplate`; generate host artifacts rather than hand-editing them.
- [Focused checks](../tests/context-scouting.test.mjs): portable source, host
  model/metadata contracts and discriminating mutations. Repository
  `npm run generate:check` checks actual generated-file parity.
- Generated [Codex](../plugins/codex/engineer-agent-workflows/skills/context-scouting/SKILL.md)
  and [Claude Code](../plugins/claude-code/engineer-agent-workflows/skills/context-scouting/SKILL.md)
  artifacts contain their respective host instructions and named model choices.
