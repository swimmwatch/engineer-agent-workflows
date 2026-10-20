# Product workflows

This guide describes the implemented local product workflow and its safety
boundaries. The executable tool schemas and `tools/list` output remain the
authority for exact inputs. Every stage and every task workflow is invoked
explicitly; completing one stage never authorizes the next stage, a commit, an
installation, a publication, or a remote action.

## Choose the workflow

Use the narrowest scenario tool or skill that owns the intended state change:

| Intent                                                               | Owner                                                                                |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Refine a durable product idea                                        | `idea-refine`                                                                        |
| Define actors, goals, capabilities, use cases, rules and constraints | `product-definition`                                                                 |
| Choose system boundaries, technologies and policies                  | `technical-design`                                                                   |
| Create stages, epics, stories, tasks and dependencies                | `product-roadmap`                                                                    |
| Create one task specification from selected product inputs           | `spec-driven-development`                                                            |
| Plan or execute that specification                                   | `planning-and-task-breakdown`, then one explicit `incremental-implementation` packet |
| Inspect the shared product store                                     | `product_open`; the published runtime has no general operation-recovery tool         |

The product lineage is Idea → Product Definition (PRD) → Technical Design →
Roadmap. A downstream stage requires the exact ready upstream versions. A task
specification is separate and remains in its workspace; it references selected
product versions rather than copying the global product documents.

Start by opening the caller's absolute workspace. Forward the opaque `context`
from the response unchanged; after any successful mutation, use the newly
returned context.

<!-- product-tool-example: product_open -->

```json
{
  "workspace": "/absolute/path/to/workspace"
}
```

## Storage and configuration

The product store is local to one computer and shared by all registered
workspaces of the same logical project. It lives outside Git and contains Idea,
multi-file PRD and Technical Design documents, Roadmap data, decisions, reviews,
immutable generations and recovery checkpoints. Task specifications, task
decisions, plans, checklists, handoffs and design artifacts remain in their
workspaces.

The server selects the root lazily:

1. A nonempty `EAW_PRODUCT_DATA_DIR` is an explicit absolute-path override.
   Invalid, relative or unsafe values fail product operations with
   `INVALID_CONFIG`; the server never falls back to another store.
2. Linux uses an absolute `XDG_DATA_HOME`, or the standard
   `~/.local/share/engineer-agent-workflows` fallback.
3. macOS uses `Library/Application Support/engineer-agent-workflows` below the
   OS-resolved home directory.
4. Windows uses absolute `LOCALAPPDATA`; if it is unavailable, configuration
   fails instead of guessing another home path.

Changing environment configuration takes effect only after restarting the MCP
process. Root selection does not migrate data or bind an unknown project.
Read-only discovery does not create a missing root. Explicit initialization or
binding may create owned paths, but permission errors never select a replacement
root.

<!-- product-tool-example: product_capabilities -->

```json
{}
```

There is no MCP backup or restore API and no whole-store transaction. A copy of
one document, head, lock or operation file is not a backup. If an operator needs
an external filesystem backup, stop product-store writers and copy the entire
selected root as one operational action; restoration and validation remain the
operator's responsibility. Git history is not product backup storage.

## Artifact and version lifecycle

Authoring occurs in a candidate. A review checks the candidate's fixed inventory
and exact sources. Activation publishes one coherent immutable generation only
after required independent review passes; unchanged objects are reused. Ready
generations, decision revisions and source pins survive MCP restarts and remain
readable by tasks that reference them.

For a bounded task or stage read, ask the server to select the relevant sources.
Finish every `product_context_next` continuation before treating the selection as
complete. An opaque context or digest is not the source text.

<!-- product-tool-example: product_context_prepare -->

```json
{
  "context": "opaque-context-from-product-open",
  "purpose": "implementation",
  "task_id": "TASK-0001",
  "budget_bytes": 8192
}
```

The server keeps one current ready generation per product while retaining
referenced historical evidence. Missing or corrupt pinned content fails closed;
it is never replaced with the latest text. A parent change can make a downstream
artifact non-current for new work without deleting the accepted historical
version.

## Review lifecycle

Product artifact review and specification completeness review are different
protocols.

For a product candidate, `product_review_start` starts `full` review or an
eligible finding-linked `followup`. Read every portion from `product_review_get`,
record detailed verdicts, read and record the whole-artifact consistency result,
then complete the review. A followup may inherit only unchanged evidence whose
impact is bounded; new instructions, changed scope, uncertain influence or
missing historical evidence require a new full review.

<!-- product-tool-example: product_review_start -->

```json
{
  "context": "opaque-context-from-product-open",
  "candidate_ref": {
    "product_id": "11111111-1111-1111-1111-111111111111",
    "candidate_id": "22222222-2222-2222-2222-222222222222"
  },
  "mode": "full"
}
```

For task specifications, legacy full review remains supported. An enhanced full review
explicitly requests the final whole-specification consistency gate; a
legacy run is never silently upgraded. Detailed verdict batches are atomic and
bounded to 20 items, but they do not replace exact reading or the final
consistency assessment. Corrections-only review is allowed only for changes
linked to findings with unchanged scope and source meaning.

Use structured change summaries only for navigation. Complete
`specification_review_changes_read` to obtain exact before/after fragments and
the terminal receipt; summaries, eligibility flags and externally compressed
display markers are not evidence of reading. If exact text cannot be recovered,
leave the affected verdict unrecorded.

`specification_check_state` reports document status separately from mechanical
coverage and review state. Observing `Approved` does not authenticate consent,
prove semantic correctness or establish reviewer independence.

Use the read-only product status call to observe saved progress without changing
the candidate or review.

<!-- product-tool-example: product_review_status -->

```json
{
  "context": "opaque-context-from-product-open",
  "review_ref": "44444444-4444-4444-4444-444444444444"
}
```

## Task handoff and pins

A new product-linked task reserves a new workspace specification identity. An
existing standalone specification is not retroactively enrolled. Legacy specifications are not enrolled,
migrated, rebound or rewritten; their absence
of product metadata is not an error.

Before planning or implementation, select the task's product inputs and call
`task_inputs_check`. At the first explicitly authorized implementation start,
the server pins the exact ready inputs. A compatible later product amendment does
not force an already-started task to adopt it. New or not-yet-started work must
reconcile against current applicable product state.

<!-- product-tool-example: task_inputs_check -->

```json
{
  "context": "opaque-context-from-product-open",
  "task_id": "TASK-0001",
  "packet_id": "P01"
}
```

Each packet still needs its own explicit invocation. Review, commit and push are
separate actions and are not packet-completion gates. Completion records the
product version actually implemented, which may differ from the current product
head.

## Recovery and safety

Multi-file changes use named operation checkpoints; they are not advertised as
one filesystem transaction. On interruption, reopen the workspace and inspect
the returned state before deciding whether the original intent can resume.

The current published runtime does not publish a general operation list, status,
resume or abandon tool. If a mutation reports `RECOVERY_REQUIRED`, preserve its
operation reference and effect disclosure, stop the affected workflow and report
the unresolved checkpoint. Do not substitute the similarly named planning-schema
definitions for callable tools. A retained exact request may replay its saved
result, but an unresolved operation still requires owning implementation or
operator recovery rather than a guessed client mutation.

Never delete a lock or retry a write blindly. Active owners, changed lock bytes,
permission-denied liveness checks and uncertain effects remain blocked. A timeout
or lost response can leave applied effects; inspect the operation and current
state. Exact replay can recover a retained result, but an edited or reordered
request is a new mutation.

On `CONFLICT`, `SOURCE_CHANGED` or `STALE_CURSOR`, stop writes, reopen, inspect
saved effects and versions, then continue only if the same operation or review
is still current. Diagnostics distinguish stale workflow context, a dependency
changing during a read, established review-source drift and an unknown cause;
they never execute their suggested recovery action.

Security, incompatibility or uncertain impact creates a visible safety block for
affected tasks. Do not silently keep old pins or substitute new requirements.
Pause the affected work and obtain an explicit disposition; unaffected work may
continue.

## Proof limits and compatibility

Successful receipts prove protocol delivery, not semantic correctness or that a
model actually read externally compressed text. Hashes, counters and eligibility
checks do not prove harmlessness or reviewer independence. Failed or unavailable
checks remain unverified.

The implemented runtime supports Node.js 22.20.0 or newer on Linux, macOS and
Windows. P17 executed Linux with Node.js 24.20.0. macOS and Windows were not executed by that qualification; additional Node.js combinations were not executed either. None may be reported as passed.

The store is local-only: there is no network service, cross-computer
collaboration guarantee, automatic migration, automatic cleanup or power-loss
durability guarantee. Missing MCP capability blocks affected workflow state;
manual YAML edits and shell readers are not fallbacks.

## Operator checklist

1. Start the local stdio MCP with the intended environment and no startup path
   arguments.
2. Call `product_capabilities`, then `product_open` with the absolute workspace.
3. Use the newest returned context after every successful mutation.
4. Complete all exact-read continuations before writing a verdict or consuming a
   selected context.
5. Keep product stages, task specification, planning and each implementation
   packet as separate explicit invocations.
6. On interruption or conflict, inspect operations/reviews and saved effects
   before any retry.
7. Keep explicit product-root backups, client configuration backups and Git
   history conceptually separate.
8. Report unexecuted platforms, model trials and external checks as unverified,
   never passed.
