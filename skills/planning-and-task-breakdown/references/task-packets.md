# Task Packet Contract

Use task packets when substantial work needs reviewable, bounded
execution. A packet must be executable without rereading an entire
specification or relying on conversation history.

## Bundle

Keep one authoritative behavior contract and a compact execution bundle:

```text
docs/specs/<workstream>/
  spec.md
  decisions.yaml
  manifest.yaml
  <manifest-listed profile artifacts>
  tasks/
    plan.md
    todo.md
    handoff.md
    01_<packet>.md
```

- `spec.md` owns approved observable behavior, constraints, decisions, and
  acceptance; it does not own delivery order.
- `decisions.yaml` preserves versioned specification decisions; planning queries
  exact bounded records through the mandatory MCP as evidence and does not
  rewrite confirmed scope.
- `manifest.yaml` is the current confirmed depth, profile, and planning-artifact
  contract. Planning creates only listed profile artifacts and returns material
  scope changes to specification. `planning_artifacts` is specification-relative;
  optional `project_artifacts` lists exact project-root UI design outputs, not
  production code or authority over other specifications.
- `plan.md` indexes packets, dependencies, risks, and requirement coverage.
- `todo.md` is the sole linked completion checklist.
- `handoff.md` contains current state, exact changes, verification, blockers,
  and the next packet; replace stale history.
- Each numbered file is the complete contract for one independently
  verifiable unit of work.

## Packet Content

Every packet states:

1. Outcome and requirement identifiers. Pin the MCP `source_version`,
   `specification_version` and `review_ref` from the current completeness check
   in the plan and packet inputs, or explicitly label legacy-unverified scope.
2. Prerequisites and repository evidence. Give every material claim about
   existing code a repository-relative `file:line` and require re-verification.
   Name dependent packet IDs and the evidence that makes each prerequisite ready.
   Incremental execution requires a usable Git worktree with readable status and
   scoped changes, including staged and untracked files. No clean tree or existing
   commit is required. If Git is unavailable, list the blocked prerequisite;
   planning must not initialize Git or substitute file snapshots.
   Name required local generators/runners and existing execution authority.
   Resolve missing runner authority before bulk implementation context reads;
   a declared command alone does not grant installation permission.
3. Scope and explicit non-goals, including allowed production paths or bounded
   ownership areas and the required checklist/handoff updates.
4. Affected and proposed ownership boundaries and language-appropriate
   symbols, including responsibilities, inputs, outputs, state or lifecycle,
   errors, invariants, and dependency direction.
5. Manifest-listed profile contracts and stable requirement mappings, with one
   authoritative location for every schema or design fact. Give exact source
   paths and requirement IDs, sections, or schema selectors to read; do not
   direct the implementer to reload the entire spec or every profile. For UI,
   name relevant catalog and experience entries, Penpot file/component/board IDs
   and verified native snapshot digests. If declared design outputs are pending,
   list the separate `design-planning` prerequisite instead of fabricating IDs
   or calling the packet ready. Design planning fills in those references and
   checks before dependent implementation can start. Check inputs for drift before
   execution. A shared-library change does not authorize changes to its other
   specification consumers; reconcile affected scope instead of silently updating
   them or loading every screen set.
6. Compatibility, migration, recovery, rollout, rollback, security, and
   privacy behavior when material.
7. Objective acceptance criteria and a test plan mapping every criterion to its
   owning layer, test or discriminating check, expected RED evidence, and any
   mutation required by the shared test discipline. Name the working directory,
   prerequisites, copy-ready command or browser actions, test inputs, expected
   assertion/result, and focused plus final verification. Distinguish tests to
   create from commands that already exist; do not invent a repository script.
   For private-state or absence claims, identify a safe observation surface that
   measures the real operation without exposing the protected mutable state.
8. External or irreversible steps as separate `MANUAL GATE` items.
9. Recheck the pinned specification version, update completion and stop after this packet. Mark completion only after
   every required check passes. A failed or unavailable required check keeps the
   packet incomplete, even when implementation is finished and the blocker is
   documented; do not downgrade it to optional because the environment cannot
   run it. Review is optional and separately invoked, never a completion or
   next-packet prerequisite.

For product-linked packets, declare `## Product context roots` followed by one
fenced `json` array of exact native `{product_id, artifact, element_id}` roots
from the validated task inventory. Include every packet-specific product input;
the runtime adds task identity, transitive dependencies and global constraints.
Do not use the task identity alone to hide its dependencies. Missing mappings
retain legacy full context; implementation must not create or repair the map.
The frozen packet remains authoritative, without a second editable sidecar.

For import/preservation work, identify expected packet writes, checklist/handoff
writes and exact scenario-managed workspace transitions before the final check.
Independent external changes are preserved and inspected for overlap; unknown
changes or overlap with a pending packet write require disposition. Check
content and meaningful file attributes; directory mtime alone is not Git data
loss. Keep private inventories outside published artifacts and reference them.

Restate exact local values and failure behavior. Do not write “implement as
described elsewhere.” Keep packets small enough that one explicit invocation
can implement and verify exactly one of them.

Keep reasoning proportional: one compact inline boundary and verification map
can suffice for Lite. Add an example only when it prevents a real ambiguity;
do not prescribe an entire implementation or duplicate authoritative schemas.
If the executor must invent a product decision, choose among architectural
approaches, or discover how acceptance will be measured, the packet is not ready.

## Test-First Execution

Order every behavior packet so the implementer:

1. writes the test or executable check from the criterion before implementation;
2. runs it and records a relevant RED or discriminating failure;
3. implements the smallest behavior that can satisfy the check;
4. corrects the implementation while any correct check fails instead of
   weakening the check;
5. applies PROVE when required and records the mutation result;
6. runs focused and repository-proportional verification.

A criterion with no derivable test or discriminating check is an unfinished
packet. For non-unit-testable work, name the executable evidence before the
artifact changes; “no tests needed” is not a verification plan. Record findings
from deleted throwaway probes in the packet notes or handoff.

## Planning And Execution

- Inspect current project guidance and task-scoped evidence before proposing
  boundaries. Map every material unit to an authorized requirement and revise
  disproved assumptions.
- Planning may create only authorized planning artifacts. It must not change
  production files, execute packets, or imply implementation permission.
- At Lite depth, keep the bundle to `plan.md`, `todo.md`, current-only
  `handoff.md`, and exactly one compact numbered packet unless the confirmed
  manifest explicitly requires another reviewable planning artifact.
- Implementation begins only after explicit authorization for a specific
  packet. Preserve unrelated changes, complete scoped verification, update the
  checklist and handoff, and stop after that packet. Do not launch review or
  execute the next packet automatically. On a new explicit invocation, actual
  dependencies and checks govern eligibility, not optional review or commit.
- A later packet may commit a completed previous packet only when the user
  explicitly authorizes the commit and its exact scope.
