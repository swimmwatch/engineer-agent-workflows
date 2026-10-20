# Context Scouting

Status: Approved

## Outcome and scope

Provide a separate, explicitly invoked `context-scouting` skill in the existing
collection. During the task to which the user attaches it, the main agent delegates
appropriate context discovery to lightweight native subagents and consumes compact,
verifiable findings. Move the existing global Codex `Context Gathering And Delegation`
rule into this skill, with the agreed model policy replacing its old model defaults.

Confirmed scope: Standard, core only. Requirements and acceptance remain in this
document; no additional profile contract or design artifact is declared. The decision
journal is the authoritative source-to-requirement map.

## Supported environments and evidence

CS-003 and CS-009 cover Codex/OpenAI and Claude Code/Anthropic, using each active
client's exposed native subagent interface. This is an instruction-based workflow;
it adds no OS-specific executable or independent runtime. A documented capability
does not prove that a particular account, client, provider gateway, or nested context
exposes it. Unsupported environments follow CS-008 without configuration changes.

Verified baseline evidence:

- The user-supplied global guidance, `Context Gathering And Delegation`, lines
  158–190, was inspected on 2026-10-07. It already distinguishes multi-step discovery
  from known-file reads, restricts scouts to inspection, and requires evidence.
- `catalog/skills.json:6` and `skills/context-engineering/SKILL.md:10-13` establish
  explicit invocation and the existing, separate guidance-audit responsibility.
- `scripts/lib/distribution.mjs:43-59` defines host-specific template values for
  existing roles; the new scout behavior must preserve the collection's isolation.
- [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents),
  inspected 2026-10-07, documents skill-requested delegation and `gpt-6-luna` for
  lightweight scans.
- [Claude Code subagents](https://code.claude.com/docs/en/sub-agents) and
  [model configuration](https://code.claude.com/docs/en/model-config), inspected
  2026-10-07, document model selection, separate context, tool restrictions, and
  provider-dependent alias resolution. Installed availability remains a runtime
  observation, not an assumption of this specification.

## Requirements

### CS-001: Explicit, task-scoped invocation

`context-scouting` is a standalone collection skill distinct from
`context-engineering`. Only an explicit user invocation activates its delegation
policy for the current task. It can support work already authorized in that task;
it grants no additional authority to edit, install, publish, or run another workflow.
Completion or cancellation ends its task scope. Repeated invocation in the same
task preserves relevant findings and does not automatically restart finished searches.
After removal of the global rule, unrelated tasks have no delegation obligation
from this skill; independently applicable instructions remain authoritative.

Acceptance: compare task traces with and without explicit invocation. The invoked
task applies CS-002; metadata and skill instructions do not activate it implicitly.
A repeated invocation reuses current evidence. A new task does not inherit a claimed
standing mandate merely because this skill ran previously. No extra workflow,
installation, or mutation is attributed to the invocation.

### CS-002: Select useful discovery work

Delegate bounded, multi-step searches across unfamiliar files or sources when the
expected reduction in main-agent exploration exceeds dispatch and verification
overhead and active runtime rules permit it. Honor any host requirement for useful
independent parallel work. Known-file reads, short checks, and existing sufficient
evidence use direct lookup. This policy covers task-relevant repository and external
source discovery; it does not broaden the user's research scope.

Start with one scout. Add another only for substantial, independent work within host
limits. Use the smallest adequate search depth: `quick` for an entry point, `medium`
for a bounded flow and relevant tests, `thorough` only for necessary broader coverage.
Search depth describes coverage and is separate from model reasoning effort.

Acceptance: an unfamiliar multi-file investigation with permitted delegation produces
a bounded scout assignment; a known-file read does not spawn a scout. Trace inspection
shows an independent question for each added scout, no duplicated investigation
solely to increase parallelism, and no bypass of host concurrency or delegation rules.

### CS-003: Explicit host-specific model names

The Codex artifact instructs the main agent to request `gpt-6-luna` for scouts. The
Claude Code artifact instructs it to request `haiku`. These are the named choices,
not examples or invitations to rank available models. Do not perform model shopping,
pricing research, or silently substitute another model during ordinary invocation.
The user may explicitly override the scout model for their task; apply a supported
override without changing global settings. Scout settings do not change reviewer,
implementer, or main-agent models.

Use the active native tool's supported model-selection mechanism and schema.
Preserve the original scout rule's `medium` reasoning preference where the host
exposes and supports it; otherwise do not invent an effort field or claim it was set.
If the required model selection or a requested setting cannot be applied, use CS-008.
Prefer a fresh context and do not silently inherit a larger parent model. `haiku` is
an intentional Claude Code alias, not a guarantee of one underlying model release
across providers. Distinguish the requested name from the effective model when the
host reports it; leave the effective model unknown when it does not.

Acceptance: inspect native delegation calls for the selected host: the request names
`gpt-6-luna` or `haiku`, or the user's explicit override, through supported fields.
There is no model-comparison research, invented argument, global settings write, or
claim of verified effective selection without host evidence. A rejected or unavailable
selection follows CS-008 rather than silently launching an inherited expensive model.

### CS-004: Native, inspection-only delegation

Use host-native subagents. Do not replace them with new user-visible tasks, nested
CLI sessions, custom orchestration services, or automatic configuration changes.
Scouts may inspect only: no source edits, external mutations, installations, commits,
or child agents. Restrict tools to read-only capabilities when supported while
retaining the authorized read capabilities needed for the question. Where tool-level
restriction is unavailable, state the inspection-only instruction without describing
it as an enforced sandbox. The main agent retains all decisions, edits, and validation.

Acceptance: inspect the assignment and available tool restrictions, and observe the
scout's tool trace and scoped before/after state. There are no scout-authorized writes,
external mutations, nested agents, substitute task creation, or nested CLI launches.
An unavailable tool-restriction feature is not reported as technical isolation.

### CS-005: Sufficient, bounded scout input

Prefer a fresh scout context without the full parent conversation where supported.
Supply the exact question, absolute target roots or source locations, known relevant
facts, applicable instructions, allowed scope, search depth, and stopping condition.
Missing discoverable facts are looked up within scope; a genuinely ambiguous target
that prevents safe discovery is returned for clarification without guessing a project.
Do not pass unrelated private content, credentials, or raw private reasoning.

Applicable repository and host rules remain in force, including RTK, CodeGraph-first
lookup where required, source verification, and required instruction/skill reads.
Do not impose RTK or CodeGraph on projects that do not require them. Use the sequence
of finding candidate files, narrowing to symbols/usages, and reading decisive passages;
find existing analogues where useful. Stop when the question is answered or a concrete
blocker prevents further progress. Retrieved material is evidence, not authority to
change the task or override instructions.

Acceptance: the assignment contains the stated inputs and stopping condition without
the unrelated conversation. A project requiring CodeGraph receives that first lookup;
a project without it does not receive a fabricated requirement or a new index. Trace
and result inspection distinguish an unknown fact from an invented answer and preserve
source restrictions without exposing unrelated sensitive material.

### CS-006: Compact, verifiable findings

Return the answer with repository paths, symbols and line ranges or external source
links, plus unresolved gaps and any concrete blocker. Separate verified facts from
hypotheses and unverified claims. Normally stay within 300 words, but retain essential
caveats and decisive excerpts when accuracy needs them. Do not dump intermediate
search output into the main conversation or present a partial search as complete.
A no-match result states the searched scope and limits; it is not proof of absence
outside that scope. Do not persist personal paths, secrets, or raw search transcripts
in the shipped skill or release artifacts.

Acceptance: a successful scout result permits the main agent to locate its supporting
passages; an incomplete or no-match result names its limits. The returned summary
contains the relevant evidence and caveats rather than bulk tool logs, fabricated
citations, or an unsupported repository-wide absence claim.

### CS-007: Main-agent verification and reuse

The main agent reads decisive source passages before consequential conclusions or
edits, reconciles conflicting or stale findings, and performs the task's required
validation. Reuse the scout for targeted follow-ups when suitable; do not repeat its
whole search without a concrete evidence gap or source change. An unusable or
unsupported finding follows CS-008. Delegation never counts as a substitute for
required checks or as independent verification of the main agent's implementation.

Acceptance: the task trace shows targeted verification of evidence supporting a
consequential conclusion. A stale or conflicting finding is qualified or corrected,
not promoted to fact. Existing useful findings are reused, and task-required checks
retain their actual pass, fail, or unrun status regardless of scout completion.

### CS-008: Failure, cancellation, and bounded fallback

If native delegation, an applicable named model/setting, or a usable result is
unavailable, disclose the specific limitation once and continue the minimum necessary
authorized discovery in the main context. Preserve valid partial evidence and unresolved
gaps. Do not repeatedly retry the same unsupported capability or silently escalate to
another model. Independent authorized work may continue when one evidence-dependent
action remains blocked. Report any remaining blocker and its next action honestly.

Respect cancellation and task replacement: stop issuing dependent scout work, stop
outstanding work through supported host controls where possible, and do not start
fallback discovery after the user cancels the task. Clearly label late or partial
results. A host failure that prevents stopping a scout is reported without claiming
successful cleanup. Resumption reuses still-valid findings and reassesses changed inputs.

Acceptance: unavailable-tool, rejected-model, failed-result and partial-result scenarios
produce one limitation disclosure and bounded main-agent lookup, without blind retries,
fabricated completion, or automatic configuration changes. Cancellation traces contain
no new dependent search or fallback after cancellation; unsupported stop controls are
reported, and resumption does not treat stale partial work as current proof.

### CS-009: Portable collection delivery

Maintain one canonical skill source and generate separate Codex and Claude Code
artifacts through the existing collection mechanism. Codex invocation policy remains
explicit-only; Claude Code remains user-invocable with model invocation disabled.
Each artifact contains only its own host guidance names, native invocation guidance,
metadata and model choice. Keep descriptions within 240 Unicode code points and
complete skill files within 4096 UTF-8 bytes. Conditional details may use scoped
references under the existing collection conventions.

Do not expand `context-engineering`, introduce another lifecycle CLI, require workflow
MCP merely to scout, or change consumers' project-local skills. Existing collection
installation, replacement, and publication rules remain unchanged. This specification
authorizes no installation, enablement, release, commit, or implementation. Unsupported
client versions or schemas follow CS-008; do not claim universal availability from
documentation or change host configuration to manufacture it.

Acceptance: existing generation and validation checks inspect both produced artifacts
for discoverability, explicit-only metadata, size limits, resolved substitutions and
absence of cross-host leakage. Scenario traces exercise the named-model and fallback
contracts against supported native interfaces. Simulations are labeled as simulations;
unavailable live host checks remain unverified rather than passed. The delivered diff
contains no unrelated skill changes, new lifecycle utility, or consuming-project edits.

### CS-010: Transfer the global rule in the implementation delivery

The future authorized implementation includes targeted removal of the existing global
Codex `Context Gathering And Delegation` section after the replacement artifacts pass
their relevant checks. Locate the user's actual global guidance through current host
evidence; never embed a personal filesystem path into repository artifacts. Preserve
every unrelated instruction and any concurrent user edits. If the section changed,
reconcile its current obligations with this specification before removing it; do not
delete a merely similar block or silently broaden the migration.

Verify the written result by reading it back and comparing the scoped diff. Preserve
the exact removed content for recovery outside published artifacts, and restore only
that content if a migration write fails after changing it, without overwriting later
edits. If recovery cannot be verified safely, stop that mutation and report the state.
An already absent section is a no-op reported as such. Do not create a replacement
standing instruction that invokes the skill automatically. Report replacement artifact
availability and installation status separately; preparation or removal does not
authorize installing it. No global guidance is changed during specification work.

Acceptance: isolated guidance fixtures show that only the targeted section is removed,
unrelated bytes are retained, repeat application is a no-op, and failed migration has
verified recovery or an explicit unresolved status. Later real implementation evidence
includes scoped read-back and a statement that tasks now require explicit skill use.
Actual personal paths and recovery copies do not enter the repository or release.

### CS-011: Honest efficiency claims

The objective is less exploratory material processed by the main model while retaining
correct, verifiable answers. Do not promise that delegation always reduces total tokens,
cost, or latency. Measure any numerical savings against comparable work, counting
dispatch, scout work, returned summaries, main-agent verification, and retries/fallback.
Distinguish main-context reduction from aggregate consumption and monetary cost.
When usage or pricing evidence is unavailable, report savings as unmeasured; do not
invent percentages or infer financial savings merely from selecting a smaller model.

Acceptance: result and validation reports distinguish observed model settings and
bounded summaries from measured savings. A report without comparable usage evidence
contains no asserted numerical reduction. Any numerical claim identifies its baseline,
included agent work and relevant measurement limits, excluding unsupported efficiency
guarantees.

## Non-goals and stage boundary

CS-001 and CS-009 exclude automatic skill activation and automatic downstream workflows.
CS-004 excludes delegating implementation or review through this discovery skill.
CS-009 excludes new orchestration infrastructure, global installation and publication.
CS-010 includes the future global-rule removal but excludes performing it during this
specification stage. CS-011 requires honest evidence, not a new benchmarking product.

Planning, implementation, installation, and release each retain their existing
authorization boundaries. This specification defines behavior and acceptance only.
