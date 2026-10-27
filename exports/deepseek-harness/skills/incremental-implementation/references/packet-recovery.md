# Packet Recovery

Read only when a packet's inputs conflict, verification fails, or incomplete
work is resumed. Diagnose before changing either implementation or acceptance.

## Identify The Cause

- **Implementation defect:** the check matches the current approved behavior
  and fails at the intended assertion. Correct implementation within the packet,
  rerun the focused check, and retain unrelated passing behavior.
- **Incorrect check:** current requirements or reproducible evidence contradict
  the check itself. Record the exact contradiction and why the corrected check
  still discriminates good from bad behavior. Correct the check, observe RED or
  PROVE as required, then verify implementation. A failing result alone is not
  evidence that a check is wrong. Ask before choosing between conflicting
  product interpretations; never weaken a correct check to obtain green.
- **Stale or incomplete input:** compare current requirement IDs and contract
  sections with the packet, manifest, and repository evidence. A moved symbol
  with unchanged behavior may be refreshed locally and recorded. Changed
  behavior, scope, dependencies, architecture, or acceptance requires the
  owning specification/planning workflow and separate authorization. Stop the
  affected work without rewriting its contract or generating a replacement plan.
- **Environment or harness failure:** record the command, working directory,
  actual exit/result, and missing prerequisite. A dependency/import/collection
  failure is not a behavioral RED; repair only authorized local prerequisites.
  Never install globally, bypass controls, skip a required check, or report
  an unavailable check as passed. Request new authority directly if needed.
  A replacement runner must preserve the observation layer, assertions,
  platform/dependency contract and required checks. Importing CLI code or
  assigning an exit-code property does not prove a real process exit; a mock
  does not replace required HTTP or browser evidence. If equivalence is not
  established, keep the check unavailable and ask about any material change.

For a missing material technical choice, checkpoint it and return the affected
task to separately invoked planning and its `references/technical-agreement.md`.
Implementation must not redesign or manufacture agreement in the handoff. Scope,
behavior or acceptance changes belong to specification. Continue only independent,
already authorized work that does not depend on the unresolved choice.

For unreadable or abbreviated tool output, use its published exact retrieval or
continuation mechanism. Do not count a summary as the required source read. If
exact content remains unavailable, record that input as unavailable and stop
dependent work. Do not cycle through encodings, character dumps or alternative
shell representations to defeat transport compression. Continue only unaffected
authorized work; output delivery failure does not authorize host reconfiguration.

## Preservation Conflicts

Compare the recorded baseline with actual packet writes, expected native
workflow transitions and independent external changes. Never require the entire
checkout to differ only in checklist/handoff files. Verify native binding
transitions through their owning scenario; do not hand-edit them or exempt the
whole workflow directory. Preserve external edits, inspect their overlap and
recheck affected inputs. An overlapping planned write, unknown content delta or
changed protected data is a blocker; do not silently accept the new baseline.
Git identity/history and file bytes remain protected. A directory timestamp
change alone is not evidence that their contents changed.

Correct a disproved check before rerunning it, record why the replacement still
detects loss, and retain the initial failure and recovery evidence. Do not relax
a valid check or automatically undo another writer's work.

## Resume And Handoff

Before bulk code reads or production edits, call `planning_packet_check` with
the packet's exact `agreement_ref` and `expected_proposal_digest`. Recheck after
implementation alongside the pinned specification check. A missing, stale or
blocked result stops affected work. Compare the scoped diff with the agreed
significant units, contracts, interactions and approach; behavioral tests alone
do not justify an architecture substitution. Record this comparison in handoff.
A private helper within the agreed boundary is flexible. A changed shared
signature, ownership, pattern or binding name returns to planning for a revised
proposal and explicit answer; product changes return to specification. A moved
existing symbol with unchanged meaning may be refreshed as evidence and recorded.

For legacy packets without qualifying agreement, preserve existing work and
return only the affected task to planning. Reuse adequate exact evidence where
possible, but require a managed ready binding before execution. Do not fabricate
references, bulk-migrate plans or rewrite completed tasks. Missing capability is
a concrete prerequisite, never permission to bypass the gate.

Recheck the packet's pinned completeness version through
`specification_check_state` before edits and before marking completion, following
`shared/references/implementation-context.md`. Review metadata alone does not invalidate
the specification; changed requirements, scope or source decisions do. Stale or
incomplete new-review inputs return to the specification owner. Do not silently
refresh a packet's version to conceal changed behavior. Legacy inputs remain
explicitly unverified, not automatically migrated.

Reconcile the current packet, checklist, handoff, scoped diff, and actual
verification evidence. Preserve user edits and unrelated work. Do not restart a
completed slice, assume a stale pass still applies, or trust an unchecked claim
from the previous agent. Reuse checks only while their inputs remain unchanged.
If work exists before its check, apply the shared PROVE rule.

Keep one compact current handoff with links to reusable private evidence, not
repeated inventories, transcripts or workflow instructions. Preserve executable
commands and material results. Replace the handoff's current state with: packet ID; complete/incomplete state;
changed paths; commands and working directories; expected versus actual results;
RED/GREEN/PROVE evidence; unresolved decisions and blocked prerequisites; and
the next eligible packet. A missing result remains unknown. Mark completion only
after every required check passes. Do not introduce an independent-review gate.

After completing or handing off the current packet, stop. User-requested fixes
to a completed packet are rework of that packet, not authority to start the next.
Neither an uncommitted previous packet nor absent optional review prevents a
new explicitly authorized packet whose actual dependencies are satisfied.

## Workflow YAML Access

Follow `shared/references/workflow-state-access.md`. Use `specification_open`,
`scope_get`, `decision_find` and `decision_get` for bounded current inputs.
Do not hand-edit workflow YAML while implementing a packet. A required scope or
design change goes back to its separately authorized owning workflow. Technical
questions and answers belong to planning's `planning_*` scenarios, not the
behavioral journal. Missing MCP blocks affected work, not permission to use a
shell reader or synthesize an answer.
