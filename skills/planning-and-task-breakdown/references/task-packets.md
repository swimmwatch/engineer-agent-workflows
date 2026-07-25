# Task Packet Contract

Use task packets when substantial work needs independent review and bounded
execution. A packet must be executable without rereading an entire
specification or relying on conversation history.

## Bundle

Keep one authoritative behavior contract and a compact execution bundle:

```text
docs/specs/<workstream>/
  spec.md
  tasks/
    plan.md
    todo.md
    handoff.md
    01_<packet>.md
```

- `spec.md` owns approved observable behavior, constraints, decisions, and
  acceptance; it does not own delivery order.
- `plan.md` indexes packets, dependencies, risks, and requirement coverage.
- `todo.md` is the sole linked completion checklist.
- `handoff.md` contains current state, exact changes, verification, blockers,
  and the next packet; replace stale history.
- Each numbered file is the complete contract for one independently
  verifiable unit of work.

## Packet Content

Every packet states:

1. Outcome and requirement identifiers.
2. Prerequisites and repository evidence.
3. Scope and explicit non-goals.
4. Affected and proposed ownership boundaries and language-appropriate
   symbols, including responsibilities, inputs, outputs, state or lifecycle,
   errors, invariants, and dependency direction.
5. Compatibility, migration, recovery, rollout, rollback, security, and
   privacy behavior when material.
6. Objective acceptance criteria and exact automated verification.
7. External or irreversible steps as separate `MANUAL GATE` items.
8. Completion updates and the required review stop.

Restate exact local values and failure behavior. Do not write “implement as
described elsewhere.” Keep packets small enough that one explicit invocation
can implement and verify exactly one of them.

## Planning And Execution

- Inspect current project guidance and task-scoped evidence before proposing
  boundaries. Map every material unit to an authorized requirement and revise
  disproved assumptions.
- Planning may create only authorized planning artifacts. It must not change
  production files, execute packets, or imply implementation permission.
- Implementation begins only after explicit authorization for a specific
  packet. Preserve unrelated changes, complete scoped verification, update the
  checklist and handoff, and stop for review.
- A later packet may commit a completed previous packet only when the user
  explicitly authorizes the commit and its exact scope.
