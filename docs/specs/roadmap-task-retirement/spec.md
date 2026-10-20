# Roadmap task retirement

Status: Approved

The implementation request directly authorizes this bounded change. The
contract uses explicit dependency resolution before task retirement, rather
than a general migration mechanism or replacement identities.

## Behavior

- Add public `roadmap_unlink_dependency` and `roadmap_retire_task` tools with
  strict input schemas and durable typed operation intents.
- Require an actual current answered decision covering affected task identities
  and a bounded reason. Record the change in an immutable decision with that
  answer as predecessor and metadata provenance.
- Unlink one existing dependency. Reassignment links an existing prerequisite
  first, without duplicating links. Retirement rejects active consumers, accepts
  existing redistribution recipients (or none for cancellation), marks the
  original identity retired, removes its section and current relations, and
  preserves immutable historical content and bindings. It never completes work
  or allocates replacement task/specification IDs.
- Preserve candidate isolation, stale-context rejection, idempotent replay,
  source digests, review invalidation, cooperative locking and checkpointed exact
  recovery. Ready generations change only through reviewed activation.
- Reject changes to unfinished bindings; preserve completed historical bindings
  and pins. Recheck compatibility before activation to close authoring-to-activation
  races. Retired tasks cannot reserve new specifications or start active work.
- Incomplete candidate operations retain exclusive ownership of their candidate
  target until exact recovery completes, including when all draft writes already
  finished. They block new writes, Roadmap review and activation. Binding guards
  compare new retirements against the base registry, preserving unchanged
  historical tombstones and frozen work. Reason limits count Unicode code points.

## Acceptance evidence

Domain regressions cover successful redistribution, unresolved consumers,
history and identity preservation, replay, stale contexts, invalid decisions and
references, unfinished and completed bindings, and interrupted-write recovery.
Additional review regressions cover coherent-but-incomplete checkpoints,
historical frozen bindings, Unicode limits, CRLF documents, Unicode paths and
hard-link/symlink rejection. Native platform execution must be reported separately
from portable-path and newline checks.
An isolated stdio MCP fixture reproduces TASK-0029 → TASK-0001,
TASK-0002/TASK-0005 → TASK-0029 and their existing TASK-0001 prerequisites. It
updates TASK-0001/TASK-0003, resolves edges, retires TASK-0029, completes synthetic
review protocol checks and activates a coherent generation while retaining the
old generation. Synthetic verdicts are test data, not independent review claims.

## Boundaries

Do not mutate any real consuming product store, install globally, publish,
provision, or fix unrelated task-binding schema issues. Existing noncooperating
filesystem-writer and power-loss limitations remain. Exact operation recovery
does not authorize changing intent, overwriting unknown bytes or deleting locks.
