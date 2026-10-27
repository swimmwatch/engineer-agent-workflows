# DeepSeek Harness filesystem export

The collection generates all 17 skills for DeepSeek Harness from the same
authoritative templates used by Codex and Claude Code. This is a filesystem
export, not a Harness plugin or an MCP server feature. The separate workflow
MCP package remains required by the workflows that use its scenario tools.

## Generate and check

From this repository, run:

```bash
npm run generate
npm run validate
npm run generate:check
```

The provider root is `exports/deepseek-harness/skills`. Each direct child is a
complete `<name>/SKILL.md` bundle with its required references and scripts.
Generated files must not be edited independently. The generator owns only
`exports/deepseek-harness`, preserves sibling exports, checks for unsafe paths,
and restores previous outputs if replacement fails. Check mode is read-only.

## Use in Harness

An already configured Harness filesystem provider can discover this absolute
directory through `customSkillDirs`. A separately authorized global installation
may copy the complete matching collection into `$DSH_HOME/skills` (normally
`~/.dsh/skills`). This project does not change Harness configuration, install
anything automatically or write skills into consuming projects. The pinned
Codex/Claude `skills` CLI commands do not imply Harness lifecycle support.

The registry must load the filesystem provider. Its user-facing skill surface
invokes a skill with `/skill-name`. Every exported skill declares
`disable-model-invocation: true` and `user-invocable: true`: users can invoke it,
while model-facing skill catalogs and loaders must exclude it. Keep the complete
collection together so dependent workflows find matching siblings and digests.

Native questions use `ask_user_question`, following the published runtime schema;
pending or missing answers are not consent. MCP scenario names remain logical
names resolved against the connected callable tools. Do not construct prefixes:
Harness can normalize and hash long names, and server names can differ.

Context scouting first discovers allowed provider/model routes through
`list_subagent_models`, then asks the user to choose through the native
`ask_user_question` tool. The question offers only advertised routes, with exact
provider/model identifiers, a recommended option first and brief reasons. It
follows the callable question schema's option limit; the user may also name
another advertised route or choose direct discovery. Even a single suitable
route requires a choice. Harness itself does not imply a model vendor.

The generated delegation reference includes these starting recommendations:

| Available model family | Suggested use for read-only scouting |
| --- | --- |
| OpenAI `gpt-6-luna` | This collection's preferred scout when advertised and suitable. |
| Anthropic Claude Haiku | Lookup, extraction and concise summaries; offer Sonnet for more involved synthesis. |
| Gemini Flash-Lite / Flash | Flash-Lite for narrow lookup and extraction; Flash for broader multi-file synthesis. |
| DeepSeek Flash | Bounded discovery when an appropriate Flash route is advertised, without requiring DeepSeek. |

An expressed user preference takes priority in recommendations. Otherwise, a
suitable advertised `gpt-6-luna` route is recommended when present. These are
task-based suggestions, not measured quality, speed or cost rankings. Unknown
models require available capability evidence and explicit uncertainty. Do not
invent identifiers or infer a model family from its provider label alone.

Family guidance was checked on 2026-10-26 against the official
[Anthropic model guidance](https://platform.claude.com/docs/en/models/overview),
[Gemini Flash-Lite overview](https://deepmind.google/models/gemini/flash-lite/)
and [DeepSeek API model names](https://api-docs.deepseek.com/quick_start/agent_integrations/).
The Luna preference is the collection's policy. Runtime discovery determines
actual availability; these links do not authorize unavailable routes.

The skill waits for an explicit answer before calling native `subagent` with
the confirmed provider and model together. Silence, a preselected option, a
dismissed question or a pending answer is not consent; pending questions do not
trigger fallback discovery. Reuse a confirmed available route within the same
task, and ask again for a new task or after a route becomes unavailable or is
rejected. Honor direct discovery or cancellation. Request `low` reasoning effort
only when advertised for the selected route; otherwise omit it. If discovery,
the question tool or route selection is unavailable, report that limitation and
use the bounded direct fallback. No global model settings change. Other workflow
model suggestions remain advisory. Completion is asynchronous; no wait tool is
invented. The actual callable schemas remain authoritative.

## Author, implementer and reviewer models

Harness exports do not assign a DeepSeek default to these roles. The main agent
keeps its current model; recommendations never switch it or gate its work.
The general role recommendations do not request a model choice or load a
subagent-selection reference. This applies to design planning, specification,
planning, implementation, code review, security and the completeness checker's
own session. Native Codex and Claude Code artifacts keep their existing
recommendations. Context scouting retains the explicit subagent model selection
described above. Other workflows' existing delegation and independent-review
contracts remain unchanged.

## Compatibility and verification

Reviewed baseline: Harness `0.2.1-rc.3`, upstream commit
[`22ddee3792402c3e70ec5f86a63c3e3e895a2f60`](https://github.com/deepseek-ai/deepseek-harness/commit/22ddee3792402c3e70ec5f86a63c3e3e895a2f60).
See the upstream
[filesystem provider](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/packages/skill/skill-filesystem/README.md)
and [subagent contract](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/packages/subagent/tool-subagent/README.md).

The isolated verifier accepts the absolute path of a real upstream module
exporting `FileSystemSkillProvider`:

```bash
node scripts/verify-deepseek-export.mjs <absolute-provider-module-path>
```

It disables default roots and watching, supplies temporary home paths, discovers
and loads all 17 exported bodies, checks resource bases and invocation policies,
and rejects provider warnings. It neither installs dependencies nor invokes a
model. Provision the pinned provider separately in a temporary runtime; never
use an unreviewed floating version. For exact-source verification, compile the
pinned provider's `src/index.ts` as an ES module using the repository's pinned
TypeScript compiler and its `0.2.1-rc.3` runtime dependencies. Do not substitute a
mock parser for the real provider.

On 2026-10-25, the real provider from that exact source discovered and loaded all
17 exports without warnings, returning `modelInvocable: false` and
`userInvocable: true` for each. Source SHA-256:
`4be3a8f4142b27e07093cff1757876a80a344dd6f664a38775069244b89f4ec4`.
This verifies provider parsing and loading, not native UI behavior, model-facing
tool integration or end-to-end model execution. Those were not exercised.
