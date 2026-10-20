# CS-P02: Behavior and Global Migration

## Outcome and inputs

Verify the generated instructions in both native hosts, then remove the single old
global Codex rule safely. Requirements: CS-001–CS-011. P01 must have passed its static,
generation, and mutation checks; read its actual evidence before proceeding.

- MCP `source_version`: `24915e1971002d58ec790420af4034f89ae1f355fcdc987227aac2f19e0c9732`.
- MCP `specification_version`: `992dfdc963c5307a6e1333a1057c133f91f766fb2adb9626d0c28d10e23b1942`.
- MCP `review_ref`: `590cd413-dba5-4a88-b1c4-e790755556ac`.

Check these pins before and after execution. Read CS-001–CS-011 through MCP; no direct
workflow-YAML access. Require a usable Git worktree and preserve tracked, staged and
untracked changes. Evidence: generator `scripts/lib/distribution.mjs:466-620`, fixture
helpers `tests/lib/fixtures.mjs:20-66`, opt-in trial boundary `README.md:126-134`, and
the freshly resolved global `Context Gathering And Delegation` section.

## Scope and ownership

Use P01's controlled inputs and generated host artifacts. Add sanitized qualification
results to this packet/handoff; raw traces and exact private recovery bytes stay outside
tracked/published files. No general trial service or new lifecycle CLI is warranted.
If native evidence exposes a defect, make only the minimal correction in P01-owned
skill/reference/model-rendering/tests paths, rerun their checks, and keep P02 incomplete
until corrected. Return new product choices to specification.

The only real global write is targeted removal of `Context Gathering And Delegation`
from the user's current global Codex guidance. Do not change other rules, host model
settings, Claude guidance, project-local skills, installations, or credentials.
The main agent owns native trials and migration; scouts remain inspection-only.

## Native verification procedure

**MANUAL GATE — native evidence:** explicit execution of this packet permits its
read-only native trials. Use available supported interfaces and existing account
access; do not install/enable a plugin or change credentials/profile settings. If an
interface needs additional external authorization, leave that check pending.
Record exact client version, host schema, selected generated artifact digest, requested
model, observed effective model when exposed, and evidence location. Unknown remains
unknown. CLI presence alone is not a pass.

Before trial execution, prepare the acceptance observations below. Use fresh native
contexts and controlled temporary source trees with known file contents and answers.
Invoke the generated skill explicitly by its supported name or attach/read its exact
generated `SKILL.md` via the active host's supported user-invocation surface. Do not
test the portable canonical template as if it were rendered output. Do not inherit
unrelated conversation history, alter discovery budgets, or change system policy.

For each host, use the following repeatable actions/prompts, substituting only the
actual controlled root and generated skill location:

1. **Explicit multi-file case:** “Use the attached context-scouting skill. In the
   supplied fixture root, locate the entry point, trace its call to the helper, and
   identify the test that covers the result. Inspect only and cite the evidence.”
   Observe a bounded native scout request and host model selection: `gpt-6-luna` for
   Codex or `haiku` for Claude; `medium` only through a supported effort mechanism.
2. **Direct lookup:** “Use context-scouting. Read the supplied fixture's known
   entry-point file and report its exported name.” Observe direct lookup instead of
   a skill-requested scout. Repeat the question with unchanged evidence and confirm reuse.
3. **Uninvoked/new task:** in a fresh context ask the multi-file question without
   invoking the skill. Inspect absence of this skill's body/reference loading or claimed
   standing mandate. Other applicable instructions may independently request subagents;
   their activity is not evidence of implicit activation of this skill.
4. **Follow-up/stale evidence:** reuse the successful scout for one bounded follow-up;
   change a controlled relevant source, then ask for verification. Observe decisive
   rereading, preserved caveats, and correction instead of repeating the entire search
   or treating the old result as current proof.
5. **Failure and partial result:** use a controlled unavailable/rejected callable or
   model response, plus a no-match and an interrupted-result case. Observe one specific
   limitation disclosure and minimum authorized main-agent lookup, with partial evidence
   and limits retained; no repeated unsupported requests or silent model substitution.
6. **Cancellation:** while a bounded controlled scout is active, cancel the task using
   the native host control/message. Observe supported stop attempts, no new dependent
   discovery or fallback, and honest treatment of late results/unsupported stop controls.
7. **Guidance/privacy/output:** inspect assignments for the exact question, root,
   facts, applicable rules, scope, depth and stop condition. Exercise a project without
   CodeGraph and a read-only project with an existing required index; do not build one.
   Inspect the actual tool trace, not just the summary, for source order, unauthorized
   writes/children/substitute tasks, fabricated citations, unrelated context reads, and
   model-shopping calls. Compare controlled files before/after. Expect concise evidence,
   normally within 300 words, preserving essential caveats. Savings remain unmeasured.
8. **Explicit model override:** supply a supported user-selected scout model through
   the task's normal instruction surface, then a controlled unsupported selection.
   Observe supported override without changing main/review models or global settings;
   rejection must follow fallback. Do not claim access to an untested model.

Capability failure injection may be a labeled simulation when no native injection
surface exists. Pair it with actual success/direct/cancellation traces from both hosts
and distinguish the two evidence classes. Do not build a toy scout implementation that
simply returns expected fixture values. A required live case that cannot be observed
remains unavailable and keeps P02 incomplete; do not lower the support promise.

Test-first evidence: define the trace oracle before changing instructions. If existing
instructions already pass a case, use a safe temporary mutated skill copy to demonstrate
the oracle's sensitivity. Required PROVE cases: implicit body loading, inherited/wrong
model selection, unauthorized write attempt, false complete/no-match claim, or continued
search after cancellation must be rejected by the respective observation. Run hazardous
negative cases only against controlled temporary files and denied external tools, never
real accounts or global guidance. Restore artifact copies and retain only sanitized results.

## Migration checks before the real write

Prepare a bounded temporary Node.js procedure using existing standard file APIs; it is
an execution aid, not a shipped installer or lifecycle command. Test it on synthetic
guidance before using the same operation on the real target. Keep its location outside
published artifacts and record the executed command and outcome in packet evidence.

The operation identifies exactly one top-level `## Context Gathering And Delegation`
section, ending at the next same-or-higher-level heading or EOF. It removes that exact
byte range, including only its own separator, and preserves prefix/suffix bytes. Before
writing, compare the current file against the inspected snapshot; changed content is
reconciled rather than overwritten. Zero matches is a no-op; multiple or materially
changed matches are a blocker. Preserve file permissions. Save exact removed bytes and
placement evidence outside the repository; read back the installed result.

Discriminating fixtures and expected observations:

- Headers before and after the section, mixed content and unrelated formatting:
  output equals the exact original prefix plus suffix, with no unrelated byte changes.
- Already absent section and repeated application: identical bytes, no extra rewrite.
- Concurrent change after inspection: no overwrite; report changed input.
- Simulated failure after replacement: recover the exact section if the current state
  is still the known output; preserve concurrent edits or report unresolved recovery.
- Ambiguous duplicate heading or unsafe target: no deletion and an explicit blocker.

Record relevant RED before correction and GREEN afterwards. PROVE the observation by
temporarily deleting an adjacent fixture instruction and confirming the byte-preservation
assertion fails. Restore the fixture procedure before any real write.

**MANUAL GATE — actual global removal:** only after P01 and required replacement
behavior checks pass, resolve the actual global target from current host evidence and
show the exact bounded removal. The user's agreed scope includes this removal in the
implementation delivery; execution authorization for this packet covers that scope.
Reconcile changed/ambiguous scope rather than assuming broader authority. Remove only
the verified section, read it back, and verify unrelated bytes plus preserved recovery
content. Never embed the actual personal path or backup in repository evidence.

If the section is already absent, report a verified no-op. If write/read-back fails,
attempt only the guarded recovery above and keep the packet incomplete until its state
is verified. Do not install the prepared skill as part of recovery. Report artifact
availability separately from installed availability and explain the new explicit-use rule.

## Final checks and completion

From repository root, rerun P01 focused tests if any corrections were made, then:

```bash
rtk proxy npm run generate:check
rtk proxy npm run validate
```

Record native results per host/scenario, simulated cases, actual migration read-back,
any unverified environment, and the exact checks performed. No numerical savings claim
without comparable all-agent usage evidence. Recheck the pinned specification version,
mark P02 complete only when all required evidence passes, update current handoff with
P03 next, and stop. No installation, publication, commit, or automatic documentation run.

## Execution evidence — 2026-10-07

**CS-P02 complete under the user's revised execution scope.** The user explicitly
cancelled Claude testing during execution. Claude runtime checks are cancelled,
not passed; the existing generated Claude artifact remains covered by repository
format/parity validation. No further Claude invocation, hook bypass, profile change,
or installation was performed. The specification pins above remained unchanged.

### Native Codex qualification

Client: Codex 0.159.2. Trials used the exact generated Codex SKILL.md, SHA256
`72adea2cd7478a7ef27861627256fe797c0c017b311c6005bc6bd6a91bc73ccd`.
The main CLI trace records `gpt-6.1-sol`; it was not switched. Native dispatch
exposed `task_name`, `message`, `model`, `reasoning_effort`, and `fork_turns`.
The CLI trials used the existing read-only sandbox. The app's native dispatch has
no per-scout tool restriction field; inspection instructions are not claimed to
be an enforced sandbox. Native schemas and effective models were inspected through
app thread outputs and targeted session records, rather than inferred from summaries.

| Scenario | Observed result | Native trace reference |
| --- | --- | --- |
| Explicit unfamiliar flow | One initial scout; requested and effective `gpt-6-luna`, `medium`, fresh context. Correct `submitOrder` → `enqueueDelivery` → `deliveryQueue`, positive and invalid-quantity tests. Main reread decisive sources. | Main `01a11814-9d6d-7b72-88a0-f4b3389e48a1`; scout `01a11815-3adf-7050-8d9f-e339af6aeef7` |
| Known file | Direct read of `src/orders.mjs`, correct export, no delegation-reference preload or dispatch. | `01a11817-ea04-71f3-8a70-c58f5a32e404` |
| Fresh uninvoked task | No context-scouting body/reference read or standing skill mandate. Existing global guidance was still active independently. | `01a11817-ea03-7d63-a60f-ddc4a181b937` |
| Follow-up and stale evidence | Reused the original scout without restarting the whole search; after controlled `pending` → `queued` mutation, main reread delivery implementation and test, corrected stale status and identified unchanged test expectation. Source bytes restored. | Resumed original main/scout above |
| No match | Read all four fixture files; payment integration absent only within that scope. No wider search or fabricated integration. | `01a11817-ea06-7ca3-af5d-3bba4c8972c8` |
| Explicit supported override | Requested and effective `gpt-6.1-sol`, `medium`, fresh context; main/global settings unchanged. | Main `01a1181a-b914-7ef2-b228-b3ba9905a75e`; scout `01a1181c-3acd-7260-8b37-03110eaf31e6` |
| Unsupported model | `gpt-6-not-a-real-model` absent from callable model choices; disclosed once, no scout launched, no silent substitution/retry; bounded direct inspection. | `01a1181a-b91b-7821-b567-aaa401ad542a` |
| Cancellation | Actual running scout interrupted; parent trace has no commands after interruption. Preliminary pointers retained as partial; no final scout report or fallback discovery. | Main `01a11819-b552-7022-9814-e02ad87aaf18`; scout `01a1181a-adb0-7412-8cd6-7d87a732035c` |
| Indexed project and inspect-only assignment | Exact question, absolute root, known facts, applicable instructions, depth and stop condition supplied through native dispatch with fresh context. Existing CodeGraph used before code searches/reads. Generation/parity ownership found; main checked decisive renderer passages. No source writes or child scouts. | Scout `01a11821-9bea-77d3-88aa-81629edcb848` |

The fixture without `.codegraph/` skipped CodeGraph; the existing indexed project
used it without creating an index. Controlled source copies match their original
bytes after qualification. Assignments in persisted CLI records are opaque bridge
payloads: they were not decrypted. The additional native app dispatch supplied a
fully observable assignment instead. The unsupported-model trial overlapped the
controlled stale-source window and honestly reported `queued` versus `pending`;
this was temporary test input, not an agent edit. Trials inspected fixture tests;
they did not claim to have executed those tests. Savings remain unmeasured.

### Oracle checks, simulations and harness limits

Acceptance inputs existed before trials. Temporary observation checks and migration
fixtures ran outside the repository: **28/28 passed** (18 trace/oracle checks and
10 migration checks). Actual JSONL checks verify absence of uninvoked body loading,
absence of direct-lookup reference preload, follow-up reuse and decisive stale reads.
Mutated copies of actual uninvoked/cancellation observations reject injected skill
loading and continued search. Separate control-record mutations reject inherited or
wrong model selection, unauthorized writes, false completeness/unbounded no-match,
unconfirmed stopping and unsupported savings claims. These are oracle-sensitivity
checks, not native executions of hazardous behavior.

Missing tools, absent/rejected effort fields, restricted partial results and unavailable
stopping are explicitly labeled observation simulations. No supported native injection
surface was available; these are not runtime passes or a toy scout executor. Actual
success, direct lookup, unavailable-model handling, partial cancellation and supported
stopping provide the native Codex evidence. Claude pairing was cancelled by the user.

An initial resume harness omitted the trusted-directory flag and failed before model
execution; the corrected resume command passed. An initial Claude command misplaced
the prompt after a variadic option; after correction, the existing UserPromptSubmit
hook blocked execution before model calls. Claude testing was then cancelled. These
environment/harness failures are not behavioral RED or successful Claude qualification.

### Global migration

The temporary standard-library procedure first failed the intended byte-preservation
checks (**9 failed / 1 passed**), then passed **10/10** after implementation. PROVE
temporarily mutated the procedure to delete adjacent prefix bytes; the intended
assertion failed with exit 1. The correct procedure was restored and passed again.
Fixtures cover exact mixed-format prefix/suffix preservation, EOF/higher headings,
absence/repeat no-op, duplicate/fenced headings, concurrent input changes, permissions,
read-back failure with exact recovery, concurrent recovery edits, and unsafe targets.

Executed outside-repository commands, with `<scratch>` denoting the private temporary
execution directory:

```bash
rtk proxy node --test <scratch>/trace-oracle.test.mjs <scratch>/migration.test.mjs
rtk proxy node <scratch>/execute-migration.mjs
```

The current global target matched the inspected snapshot before replacement. Exactly
one `Context Gathering And Delegation` section was removed: **2389 bytes**, ending
at `Engineering And Execution`. Read-back equals the projected output; all prefix and
suffix bytes and file permissions are preserved. Exact removed bytes, original
snapshot, placement and recovery evidence remain outside the repository.

- Original SHA256: `b0b991c0c3e5e795580b245e109aacc1d651d904f24c09f31bac17ac57bbd1f2`.
- Read-back SHA256: `44b412e90e851a2aaa95521c47aee34e00c2263855866fe9218fbbbafe3ed11d`.

No standing replacement rule was added. The generated context-scouting artifact is
available in this repository and requires explicit invocation; it was not globally
installed or enabled during this packet.

### Final verification and stop boundary

Matching implementation-bundle verification and usable Git worktree checks passed;
tracked/untracked evidence was retained, staged diff was empty, and unrelated changes
were preserved. P01's focused **37/37** checks were reverified at packet start. No skill
source correction was necessary. Final repository-root commands passed:

```bash
rtk proxy npm run generate:check
rtk proxy npm run validate
```

Results: generated parity for **17 skills**, complete validation **17/17**. MCP checks
before completion returned `pass`, `approved`, `reviewed` with the original source,
specification and review pins. No unresolved required Codex/migration check remains.
Only CS-P02 is marked complete. CS-P03, installation, independent reviews, commit,
push and publication were not executed and need their separate authorization.
