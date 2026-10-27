# Implementation Packet Review: Source Investigation

Research date: 2026-10-26

This document records source observations and adaptation proposals. It is not an
Approved specification, an implementation plan, or execution authorization.
Confirmed scope and actual answers are maintained by the workflow MCP.

## Confirmed Outcome

Adapt the `kap-app` workflow to review implementations against prepared task
packets. A separate mode for reviewing plans before implementation is excluded.
The confirmed depth is Deep, with core, backend and data profiles, targeting
Codex, Claude Code and DeepSeek Harness. Planning will own the declared MCP
contract and data schemas; this investigation does not create those artifacts.

## Source Identity And Evidence Limits

The source repository is identified here as `kap-app`; paths below are relative
to that repository. Its inspected HEAD was
`b8a461ae7d2a82c0d2ba68b302b2d7394a9d2d33`.

| Source                                             | Inspected Git blob                         |
| -------------------------------------------------- | ------------------------------------------ |
| `.claude/workflows/packet-review.js`               | `7b121bca5155d6ccddc8fa2bab6a3a5422549bd5` |
| `.claude/workflows/scripts/packet_review_facts.py` | `80f031aef4eb2cf3bb6adf06eae8763f99732330` |

The two files had no reported working-tree changes. The workflow and its
verification commands were not executed. Observations below describe inspected
source behavior, not successful end-to-end operation. The JavaScript depends on
an ambient workflow runner exposing `agent`, `parallel`, `phase`, `log` and
`args`; that runner's installation and execution contract were not verified.

## Existing Process

| Stage                | Source behavior                                                                                                                                                                                                                 | Evidence in `kap-app`                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Inputs               | One or more packet IDs, contract paths and Git base/head pairs; plan and handoff paths; finding, parallelism and resource options.                                                                                              | `.claude/workflows/packet-review.js:1-25`           |
| Preflight            | Reject tracked working-tree changes, run the facts script for each packet, inspect available RAM and existing pytest processes. The status command excludes untracked files.                                                    | `.claude/workflows/packet-review.js:161-179`        |
| Facts                | Separate agents inspect acceptance/test coverage, security, and project rules/test quality. The configured default concurrency is two.                                                                                          | `.claude/workflows/packet-review.js:18`, `:182-206` |
| Main review          | A separate reviewer applies five-axis code review and security guidance, receives facts as leads, and produces per-packet verdicts, findings and a criterion-to-test table.                                                     | `.claude/workflows/packet-review.js:208-224`        |
| Finding verification | Separate readers challenge findings. Critical/Required findings can request an executable proof when reading cannot settle the issue.                                                                                           | `.claude/workflows/packet-review.js:230-266`        |
| Executable proof     | One final isolated-worktree agent runs selected pytest cases and, where requested, one mutation at a time. It checks host limits, uses one test worker, forbids full-suite and Docker/Compose runs, and restores changed files. | `.claude/workflows/packet-review.js:268-285`        |
| Report               | Render verdicts, criterion coverage, retained findings and refuted findings; return report text, merged finding records and the main reviewer's verdicts.                                                                       | `.claude/workflows/packet-review.js:288-336`        |

The main reviewer is instructed to cover correctness, readability, architecture,
security and performance. Fact collection and independent verification are
separate responsibilities. Findings carry a failure scenario and evidence rather
than only a preference or severity label.

## Deterministic Facts And Their Limits

The Python helper extracts only `AC-<number><optional letters>-<number>` and
`REQ-<number>` identifiers from the packet contract. It examines added backend
lines for selected project-rule patterns and searches Python test decorators for
criterion references. These checks produce leads, not proof that an assertion
tests the required behavior. Evidence: helper lines 7-8, 15-55 and 58-95.

Change scanning uses the requested base/head range, while test discovery uses
`git grep` in the current checkout. A historical target can therefore be paired
with test references from a different revision. The workflow also fixes the
backend layout, Python runner, Linux resource checks and Opus/Sonnet aliases.
These mechanisms cannot be transferred as portable collection requirements.

## Static Risks To Address In Adaptation

- Missing axis results are filtered out; a missing main review becomes an empty
  finding list. Successful completion and complete coverage need an explicit
  contract rather than inference from an empty array. Source: workflow lines
  198-206, 226 and 257-264.
- The finding list distinguishes refuted results, but entries with no check are
  retained. Verification completeness and unresolved evidence need separate
  observable states. Source: workflow lines 288-295.
- Reporting returns the main reviewer's original verdicts after verification.
  Final verdict consistency with confirmed, refuted and unresolved findings
  needs an explicit rule. Source: workflow lines 307 and 336.
- A prose request for one row per criterion does not itself establish complete
  coverage. A portable implementation needs an authoritative criterion inventory
  and a detectable incomplete result. Source: workflow lines 122-138 and 222.
- The finding cap must not silently discard material defects or imply that
  unreviewed scope passed. Source: workflow lines 17 and 221.
- The source copies environment access through symlinks and relies on
  worktree-local restoration. Review isolation, execution authority, secrets,
  cleanup and preservation of user changes require their own observable
  guarantees. Source: workflow lines 270-282.

These are source-level adaptation concerns. No failure was reproduced against
the original runner, and no source-project repair is included in this task.

## Existing Ecosystem Contracts

`skills/code-review-and-quality/SKILL.md:12-14` already provides an explicit,
read-only review entry point. The user selected a separate packet-review skill;
the existing general review role is preserved.

`skills/planning-and-task-breakdown/references/task-packets.md:51-54` supports a
usable Git worktree with tracked, staged and untracked evidence, without a clean
tree or commit prerequisite. Lines 87-92 keep review optional and separate from
packet completion. `skills/incremental-implementation/SKILL.md:40-44` and
`:61-63` preserve the same boundary and separate commit authority.

Packets already reference approved specification evidence and exact technical
agreements. The serving workflow MCP advertises specification reviews,
`planning_packet_check` and product-linked task-input checks. No implementation
packet-review scenario is advertised. Existing specification-review success must
not be presented as code-review success. Whether and how implementation review
can reuse common mechanisms belongs to later planning.

## Verified Host Boundaries

- Codex exposes native subagents and inherits parent permissions. Asking a child
  to avoid edits does not establish a separate read-only sandbox. Capability
  availability and source independence must be checked separately from filesystem
  isolation. See the official [subagent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents#approvals-and-sandbox-controls).
- Claude Code documents separate subagent contexts, scoped tools and temporary
  worktree isolation. A skill should discover callable native capabilities rather
  than require this source workflow's ambient JavaScript runner. See the official
  [subagent documentation](https://code.claude.com/docs/en/sub-agents).
- The repository's pinned Harness baseline is `0.2.1-rc.3`, commit
  `22ddee3792402c3e70ec5f86a63c3e3e895a2f60`. Native delegation returns a child ID
  before completion; provider-dependent capabilities and completion notices are
  documented. A synchronous result or universal wait tool must not be assumed.
  See the pinned [subagent contract](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/packages/subagent/tool-subagent/README.md).

These documentation checks do not prove a live workflow run on any host. Native
qualification must distinguish structural checks from actual agent execution.

## Interview Outcome

The first question batch returned no answers. It was repeated at the user's
request; actual answers and their history are saved in MCP. The selected behavior
is a separate skill, the complete process on every run, and necessary targeted
tests and temporary proof mutations in isolation. Committed ranges and scoped
working-tree changes are supported. Missing or stale ecosystem inputs permit
diagnostic review without a full positive verdict.

Required real native qualification is limited to Codex and DeepSeek Harness.
Claude Code retains generation and structural checks; its native runtime/model
behavior remains explicitly unverified in this delivery. No real model trial was
run during specification authoring.

## Additional Native Workflow Evidence

The official [Claude Code workflow guide](https://code.claude.com/docs/en/workflows)
documents script-controlled orchestration matching the source workflow's general
shape. The pinned [Harness workflow contract](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/packages/workflow/workflow/README.md)
describes a different execution/completion lifecycle and caller-owned cleanup.
Ordinary child failure can be represented by a null result. These facts support
capability-aware orchestration and explicit child outcomes, not a universal
runtime assumption or proof that installed clients support the same interface.

The corresponding behavioral requirements are in [spec.md](spec.md).

## Execution And Proportionate Isolation Amendment: 2026-10-27

Necessary targeted tests and proof mutations are available during specialist
investigation, main review and independent verification. They are not reserved
for a late phase; reading can settle a direction without an artificial test run.

The user rejected a collection-specific execution-slot/queue mechanism and then
qualified resource creation: choose resources according to actual need. Harmless
checks may use existing authorized environments, and sufficient repository
fixtures should be reused without an extra workspace or database. Source/data
mutations or effects that could interfere with other work require adequate
existing isolation or an owned temporary workspace/database. Mere database access
does not force creation when a harmless read-only check or sufficient fixture
already meets the requirement.

Create only needed resources, reproduce the selected target, and remove only what
the investigation created. Reused pre-existing resources retain their existing
owner/lifecycle. Failed or unconfirmed required cleanup stays explicit. Existing
host/repository execution limits apply without a new proof scheduler, slot/grant
protocol or global serialization rule. Valid evidence can be reused across phases
without replacing independent judgment.

The full independent stages, authority boundaries and Codex/Harness native
qualification scope are retained. The source-process table above continues to
describe the inspected original, not this amended design.

## Specification Review Corrections: 2026-10-27

The user authorized fixes from the subsequent specification review. The behavior
now requires normalization of partially confirmed findings so a confirmed
critical/required portion cannot disappear behind the parent status, while a
resolved optional remainder receives the appropriate verdict. Verification also
checks for omitted material concerns even when the main report already contains
other valid findings. The already assigned verifiers perform this bounded check;
it adds no agent, role or phase and does not repeat the full main review. Another
existing reviewer independently assesses new concerns; unavailable independent
assessment leaves material concerns unresolved.

The current producer conventions permit proof observations in packet notes or
current handoff, which later execution replaces. IPR-025 therefore declares a
matching future producer/consumer change: required packet-scoped observations
survive handoff replacement and remain retrievable without a commit. Review-time
tests cannot retroactively establish missing historical RED/TDD chronology. This
specification update does not implement the producer changes.

Finite effective elapsed limits and a bounded cleanup allowance must be resolved
before dependent dispatch. The pinned [Harness PTC workflow contract](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/packages/workflow/workflow-ptc/README.md#known-limitations-and-deferred-work)
has no built-in overall elapsed deadline; caller/runner capabilities must be
verified rather than assumed. Unsupported deadline paths remain prerequisites.

Large selections use bounded, checkpointed review units and bounded stage
handoffs, followed by integrated cross-unit judgment. No criterion or original
evidence can be silently truncated. The complete independent stages,
proportionate isolation, existing native limits and absence of an execution-slot
broker remain unchanged. All changes are requirements for later planning and
implementation, not a live-runtime or performance qualification result.
