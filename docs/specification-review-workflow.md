# Specification Review Workflow

Use this guide to operate the implemented independent completeness review of a
prepared specification. It covers native scheduling, ordinary fallback and
recovery. It does not grant authority to edit a specification, install a bundle,
change a model route or publish anything.

The specification author enrolls the appropriate enhanced review and supplies
its project, specification slug, `review_ref` and aggregate `source_version`.
Start only for an explicit review request or the review stage of an explicitly
invoked specification workflow. A judging agent never enrolls a competing review,
edits requirements, asks the customer directly, runs application tests or starts
planning/implementation. A review-only request returns findings to the author.

## Choose The Entry

Use the complete matching installed `spec-driven-development` bundle and its
conditional `references/native-specification-review.md` when native review is
explicitly requested. Semantic judging still follows that bundle's
`references/completeness-review.md` and exactly the confirmed active-profile
references. Do not load inactive profiles or substitute the author's summary.

| Host | Existing native artifact and entry | Evidence boundary |
| --- | --- | --- |
| Harness | Read installed `workflows/specification-review.js` and its separate `specification-review.meta.json`. Discover `workflow`, or `run_code.workflow` only if exposed, and inspect the real schema. Pass the unchanged body as `script`, parsed plain JSON as `meta` and prepared input as `args` where supported. | Actual rc.2 engine and Codex models qualified for the isolated composition; pinned design baseline is rc.3. |
| Claude Code | Read installed `workflows/specification-review.js`, including its literal `export const meta`. Use `scriptPath` only if the actual callable schema and permissions support it; otherwise use its supported inline-script field. | Generated structure and controlled protocol evidence; no Claude live-runtime/model qualification. |
| Codex | Use the existing ordinary independent checker with `references/completeness-review.md`. The Codex bundle does not ship native workflow assets. | Do not invent a native tool or copy another host's script into this bundle. |

An absent session-native mechanism selects the documented ordinary independent
checker with an explicit fallback report. It is a separate path using its own
`specification_review_get`, `specification_review_record`/
`specification_review_record_batch`, context
and recovery rules. Do not mix ordinary record operations into native assignments.
A requested native path with missing preparation/direct-submission MCP support
stays blocked even when legacy tools exist. Missing independent checking or
enhanced-review support leaves review incomplete; self-review is not a fallback.

Existing [Harness setup](deepseek-harness.md),
[local development](local-development.md) and
[MCP package procedures](../packages/engineer-agent-workflow-mcp/README.md) own
their installation/provider commands. A generated file or local build does not
prove that an installed bundle or connected MCP server has been updated.

## Prepare Once, Then Check The Host

Resolve logical MCP operations through the current callable tool list and
published schemas. Host prefixes and long-name aliases can differ or be hashed;
never construct or persist a session-specific tool name.

The main agent calls `specification_review_prepare_workflow` with the supplied
absolute `project`, `specification`, exact `review_ref`, aggregate `source_version`
and observed `host_concurrency`. No open/status chain is needed merely to obtain
preparation inputs. Keep the original target for final verification and recovery.
Do not confuse aggregate review `source_version`, requirement-text version and
opaque physical `context`.

| Preparation result | Main-agent action |
| --- | --- |
| `blocked` | Report the actual reasons, next action and owner; launch no workflow. |
| `completed` | Report the saved `reviewed` or `gaps` outcome; launch no workflow. A completed findings review is not a positive review. |
| `ready_to_run`, detailed work | Check the host and routes, then pass the returned bounded allocation to the existing workflow. |
| `ready_to_run`, fresh final assessment | Only the final route is needed when no detailed work remains. The independent final actor still consumes the full required input. |
| `ready_to_run`, `completion_only` | Fresh saved consistency already exists. The main actor uses its fresh strict context for `specification_review_complete`; no new judge is needed. |

Preparation is read-only: it does not enroll a review, reserve work, complete a
review or approve the specification. It checks server prerequisites, not session
capability. It can prepare an enrolled Draft review. A returned allocation is
not a freshness lease; reads, saves and final assessment check their own inputs.

Before dispatch, the main agent separately checks actual native hooks
(`agent`, `parallel`, `phase`, `log`, `args`), structured results, independent
agents, file access, permissions, concurrency/turn/context limits and usable
model routes. No inspection child performs these deterministic checks.

For Harness, discover routes with `list_subagent_models` and obtain actual
`provider`/`model` pairs through `ask_user_question` for judging and final roles.
Reuse a confirmed available pair only within the same task/role; a pending answer,
silence, rejected route or missing selection blocks dispatch. Do not infer a
vendor from the Harness name or change the main model. Other hosts follow their
actual native route/consent policy; recommendations are advisory. A cheaper
advertised route is not semantically qualified merely by being available.

The native argument object has these meanings; this is not a fabricated callable
schema or a substitute for inspecting the actual host tool:

| Field | Value to pass |
| --- | --- |
| `target` | Original exact preparation input and observed host budget. |
| `prepared` | Full returned preparation envelope, including its context. |
| `reviewer_reference` | Absolute path to the matching installed completeness-review reference. |
| `host` | Verified availability/concurrency; pagination flags only for supported capabilities. |
| `roles.judge`, `roles.final` | The permitted actual routes needed by remaining work. |

Do not pass copied originals, preselected findings, expected verdicts or an
author-chosen subset. Do not write another workflow for each review or require a
saved/nested-workflow registry. Use the shipped script and matching metadata.

## Launch And Wait

Launch one foreground native call. In Harness omit `run_in_background`, or set
it false where supported. Hand control to that call and await its terminal
result. The main agent does not poll, run sleep/status loops, launch a polling
agent, end its turn awaiting a detached wakeup, or dispose its owning session
mid-run. Host observer events may show progress without model coordination turns.

When the workflow reports `verify_review_completion`, make one direct read-only
preparation call with the original target after return. This integrity check is
distinct from polling during execution. Only the owning MCP observation of
`completed` establishes the actual `reviewed`/`gaps` result. A child's report,
`reported_outcome`, cached replay or schema-valid completion claim cannot replace
that check. Reconcile pending/blocked/stale results instead of reporting success.

## Independent Lanes And Persistence

MCP supplies authoritative counts, weights, whole-item groups and cursors.
For N pending detailed items, let L_i be each item's complete exact text length
in Unicode code points, including linked sources/requirements and history:

```text
w_i = max(1, ceil(L_i / 4096))
W = sum(w_i)
K = 20
R = min(4, actual host concurrency limit, N, ceil(W / K))
N = 0 -> no detailed judge
```

These units estimate reading volume, not tokens, difficulty or duration. For
equal-weight pending items, 15/40/100 select 1/2/4 lanes where the host permits.
Stable groups take the largest next-item prefix within weight K and the 20-item
bound. An item heavier than K goes alone; it is not split between judges or
summarized. MCP owns deterministic balancing and allocation; clients do not
reimplement it or choose a subset. Never create an empty lane.

Each lane advances after its own saved group. There is no shared group barrier,
writer agent, inspection role, agent-side write-turn queue or global cap of 20
outstanding items. The workflow has no separate total-item cap or stop at item
160. Actual host limits still apply and can leave saved progress incomplete.
Final assessment joins every required save.

| Value | What it establishes |
| --- | --- |
| Group/lane cursor or `metadata_cursor` assignment label | Allocation/navigation. Use the actual `cursor` tool argument; metadata does not prove source consumption. |
| Mandatory-result reference | Which current saved result the final actor must read; it is not that actor's read receipt. Follow all reference continuations. |
| `read_receipt` | Terminal exact delivery of that detailed item to its consuming actor; it is not semantic understanding. |
| `consistency_read_receipt` | Terminal delivery of the final context to the final actor. |
| Saved acknowledgment | Owning MCP has persisted that exact batch; not an accepted job awaiting background processing. |

The same judge reads all assigned originals, questions/answers, partial amendments,
predecessors and linked requirements through every continuation, evaluates meaning,
then calls `specification_review_submit_batch` itself. Keep identity/version,
complete exact text and matching terminal receipts in that actor's context.
No writer copies another actor's verdicts or receipts. Preserve recorded markers.
`gap`/`conflict` are valid findings; continue collecting the remaining valid
findings instead of stopping at the first semantic problem.

Submissions contain 1–20 items and at most 131,072 UTF-8 argument bytes. A batch
is atomic, but one logical group may need several batches. Retain every actual
saved ACK, distinguish saved/remaining/unknown effects and do not call a partially
saved group complete. Validate each ACK's target, indexes/keys and verdicts before
returning the compact summary required by the shipped body; retain original ACKs
locally rather than returning whole sources or long envelopes.

Responses retain 24 KiB structured / 64 KiB complete serialized limits, including
escaping and both content representations. Exact portions are at most 4096
Unicode code points; smaller portions remain valid. A complete metadata page or
batch page does not make every partial item complete.

Programmatic cursor composition is allowed only when the same consuming actor
has callable MCP composition and adequate execution/context/result budgets.
Verify `same_actor`, `tools`, `context` and `results` capabilities before enabling
their pagination flags. Native orchestration does not give its VM a direct MCP
API. Otherwise read ordinary continuations and report that actual fallback.

## Saved, Unknown And Interrupted Work

MCP serializes physical journal writes across its processes. Judges can submit
independent disjoint batches without relaying changing physical contexts. Other
strict-context tools retain their freshness/conflict rules. Server-side waiting
is still possible: the implemented submission lock waits at most five seconds,
with bounded internal backoff, then returns `BUSY`, `operation_applied: false`
and `inspect_lock_owner`. Do not promise zero waiting or schedule agent write turns.

For a lost submission reply, preserve its exact logical payload and inspect
current owning state before deciding recovery. Identical content/review/source
replay has one durable effect throughout that retained review's lifetime,
including restart and the loss of the original reply. It does not depend on the
generic short retry cache. Do not change a payload to retry an already saved
item. Foreign/stale receipts, changed sources, missing/corrupt retained evidence
or unestablished effects block or conflict rather than permitting a guessed save.

Cancellation, timeout, a failed child or malformed output stops new dispatch and
requires quiescence/accounting for launched work. A committed save can survive
cancellation; cancellation is not rollback. Missing replies remain unknown until
MCP status/exact replay establishes their effects. Never erase saved results,
automatically delete a crash lock or trust cached child output as fresh state.
Surface the next action and its owner when recovery needs human disposition.

For unchanged interrupted input, start a **new native invocation of the same
unfinished review**: repeat preparation and actual host/route checks, preserve
valid saves and schedule only the pending work. Do not reenroll another review.
Pinned Harness does not resume script variables or its old program counter.
Claude replay has not been runtime-qualified here and cannot establish current
MCP freshness. Approval remains with the separate specification author.

## Lost Trust In Saved Review Evidence

If a saved judgment relied on a compressed summary instead of the full required
texts, stop writes and do not treat its `covered` label or earlier read receipt
as semantic assurance. Re-reading alone does not repair the old audit record.
Do not complete a suspect run or change specification text merely to force a
different input hash.

For the latest unfinished FULL review, discover `specification_review_restart`
and pass its exact `review_ref`, current review `source_version`, current context
and a non-sensitive reason. This explicitly withdraws trust from the whole old
generation and creates a new FULL with zero results on unchanged inputs. Retain
the returned new reference and review the full inventory again. Old history and
input snapshots stay intact; status of the old run identifies its successor,
and old writes, completion, read receipts and continuations cannot bypass the
new checks. The successor's status exposes the saved `audit_restart` cause and
previous reference to fresh clients. Enhanced FULL still needs fresh whole-context
consistency, normal completion and the separate author approval checkpoint.

This is deliberate audit recovery, not ordinary interruption recovery with
trusted saves. An identical restart retry does not erase new successor work.
It reports the successor's current progress, including after a server restart.
If inputs changed or another generation replaced that successor, the retry fails;
inspect current status instead of treating a saved reply as fresh authorization.
FOLLOWUP/completed reviews are excluded. If the running server does not advertise
the operation, keep the work incomplete and report that a matching MCP build
and process restart are required; do not substitute journal editing or fake
findings. A receipt binds an exact read to a generation, not the model's retained
context or semantic correctness after compaction.

## Findings, Corrections And Repeat Review

The outer cycle is:

1. Complete the full review and return all saved findings. Review-only execution
   stops without edits.
2. If correction/authoring is authorized, the author makes the source-supported
   fixes together, resolves actual missing user decisions and keeps Draft work
   Draft. Judges do not change or approve the specification.
3. Follow the installed `references/followup-review.md`: call
   `specification_review_changes_summary`, exhaust navigation, then use
   `specification_review_changes_read` at its exact report version through the
   terminal `changes_receipt`. Link each finding to actual changed item keys.
4. Call `specification_review_followup_start` only when the owning eligibility
   checks permit it. MCP selects mandatory fresh items and provisional inherited
   results with `carried_from` provenance. Carried results are historical evidence,
   not newly checked results; the author does not choose the recheck subset.
5. Prepare and invoke the same installed body for that followup. Recalculate
   pending N/W/R from MCP. A new independent final assessment still reads the
   whole latest specification/context and every required current result, not only
   edited paragraphs. It does not reread every unaffected inherited source.

For inherited cross-impact, quiesce and account for in-flight work first. Use the
checker's exact bounded `specification_review_scope_expand` request with fresh
strict context; an already-quiescent final actor may apply it directly. Prepare
the **same unfinished review** again. Expansion invalidates old allocation,
reference cursors and consistency receipts while preserving valid fresh saves.
Additional affected items become mandatory; do not expand locally or discard
saved work to force a restart. Each new assessment consumes the full latest
context and required results again.

Full review is required when eligibility rejects inheritance: new decisions,
changed scope/profiles/meaning, removed items, Approved input, unavailable
snapshots or impact that cannot be bounded. Use the returned reason; an expired
cursor or broader dependency set alone does not authorize full reenrollment.
Missing authority, exact change evidence, capability or established write effects
leaves a concrete incomplete state, next action and owner. There is no raw
manifest/decisions/archive parsing fallback.

## Final Preparation And Completion Recovery

After all required detailed saves, the independent final actor prepares
`stage: "final"` once. For a fresh assessment, exhaust required-result reference
continuations, read every current mandatory saved outcome and the whole latest
specification/context, then assess normative prose, cross-section contracts,
negative obligations, lifecycle, scope and prior findings semantically. Save
consistency with its own terminal receipt before strict completion.

| Fresh owning state | Recovery |
| --- | --- |
| Detailed work pending | Continue pending lanes; final assessment cannot run early. |
| Detailed saves complete, consistency absent/stale | Fresh independent whole-context assessment and strict completion. |
| Current saved consistency, completion absent | Completion only, using fresh strict context; preserve even a negative verdict and do not launch another judge. |
| Completed | Report the actual saved outcome without replaying judges. |
| Blocked/changed source/unknown effect | Follow the owning error and reconcile; never reuse a pass for changed input. |

New detailed results, expansion or changed inputs invalidate dependent final
evidence. A saved semantic verdict differs from cached child output. For a lost
completion reply, inspect fresh owning state: report completed if saved; only use
an exact retry where its actual contract and current evidence establish safety.
After a successful review, the author separately verifies freshness and owns the
ordinary Approved transition. Neither preparation nor workflow completion approves.

## Executable Isolated Example

From this repository root with dependencies and the current compiled MCP already
available, run the following body with `rtk proxy node --input-type=module`.
It exercises real MCP preparation states against a newly created disposable
fixture. It makes no model call, installs nothing and never targets an existing
review. `fixture.finish()` supplies deliberately simulated saved verdicts; the
example then performs completion explicitly. It is **not independent semantic review** and must not be used
to certify a real specification. Cleanup always closes owned clients and removes
only that fixture. Missing compiled MCP is a prerequisite, not permission to
refresh the user's connected server.

```javascript
import assert from "node:assert/strict";
import { reviewWorkflowFixture } from "./packages/engineer-agent-workflow-mcp/test-support/review-workflow-fixture.mjs";

const cleanups = [];
function after(cleanup) { cleanups.push(cleanup); }
try {
  const fixture = await reviewWorkflowFixture({ after }, { requirements: 2 });
  const reader = await fixture.openActor("documentation-fixture-reader");
  const before = await fixture.digest();
  const ready = await fixture.prepare(reader);
  assert.equal(ready.status, "ready_to_run");
  const blocked = await fixture.prepare(reader, { source_version: "0".repeat(64) });
  assert.equal(blocked.status, "blocked");
  assert.equal(await fixture.digest(), before);
  await fixture.finish();
  const completionOnly = await fixture.prepare(reader);
  assert.equal(completionOnly.status, "ready_to_run");
  assert.equal(completionOnly.next_stage, "completion_only");
  await reader.call("specification_review_complete", { review_ref: fixture.review.review_ref });
  const completed = await fixture.prepare(reader);
  assert.equal(completed.status, "completed");
  assert.equal(completed.outcome, "reviewed");
  console.log("isolated states: ready, blocked, completion_only, completed; no model review");
} finally {
  for (const cleanup of cleanups.reverse()) await cleanup();
}
```

For real execution, use the installed host entry above, its published callable
schema and the original author's actual target. This fixture is not a launcher
for real inputs. The main agent loads the already implemented body, prepares
once, checks host/routes, awaits one foreground invocation and directly verifies
its terminal MCP outcome; it never derives a new script from this example.

## Qualification And Measurements

The [P04 report](evidence/specification-review-native-workflow/p04-qualification.md)
separates controlled protocol/native-engine evidence from actual Codex judging.
Actual isolated Harness rc.2 plus Codex Connect alpha.10 passed omission,
equivalent paraphrase, contradiction and cancellation/recovery controls. The
pinned rc.3 declarations/validators were inspected; rc.3 model execution, the
whole global web profile, external MCP integrations and Claude live runtime
remain unqualified. The observed cancellation occurred after durable saves during
acknowledgment, not a complete active-HTTP cancellation matrix.

The qualified composition uses PTC for the parent and native tool presentation
for children (`tools.presentAs("native")`). The Harness PTC SDK had projected
full MCP inputs to `unknown`; native child presentation preserves the actual
constraints. Ordinary exact cursor reads were the observed child fallback, not
programmatic per-page loading. This does not repair the installed global profile
or authorize weakening schemas. A profile that cannot expose the required
child tools must report the blocker rather than guess their arguments.

The [actual historical comparison](evidence/specification-review-native-workflow/historical-comparison.md)
used archived production commit `4c56a82` and matching ordinary-review instructions,
not a sequential wrapper around the new body. On identical synthetic inputs and
`openai-codex / gpt-6.1-sol / xhigh`, parent-turn time was 725.661 s before and
456.735 s after: 1.589 times faster, 37.06% shorter in one sample. All 55 detailed
verdicts matched. Model requests fell from 104 to 67; MCP calls/response bytes,
uncached input and output increased. The earlier 45% figure is only a sequential
control of the new workflow. No universal speed, cheaper-model or monetary saving
is established. Cached input/reasoning output are subsets; unavailable cache-write,
per-actor cache split and lane-idle metrics are unknown, not zero.

Generation, global replacement, MCP registration/reconnection, provider changes,
commits and publication remain separate authorized actions. Neither this guide,
the example nor an existing local qualification grants them.
