# Incremental Execution Efficiency

Status: Implementation authorized by the user's accepted diagnostic plan.
Workflow scope confirmation and independent specification review are not claimed.

## Authority and boundaries

Implement the accepted P13 investigation plan. Preserve existing worktree changes,
public single-source reads, legacy packets, full task-input integrity checks,
explicit invocation, ownership, recovery and content-loss authorization. Do not
modify WellHelm, real product stores, installed plugins or global configuration.
Commits, installation, publication and performance claims about model reasoning
are outside this invocation.

## Requirements

- IEE-001: Planning may declare exact product roots in the packet's pinned
  Markdown. Implementation selects their transitive inputs, the task identity
  and applicable global constraints. Validate roots against the full task input
  inventory. Missing maps retain the legacy task closure; malformed maps fail.
  Never infer relevance, migrate old plans or narrow task integrity checks.
- IEE-002: Read 1-20 exact element/decision requests in bounded batches. Preserve
  source identity, historical revisions and item continuations. Bind batch
  continuations to request order and context. Limit the result to 24 KiB and the
  MCP response to 64 KiB. Reuse verified generations/documents only within the
  current operation; subsequent operations must detect changed/corrupt bytes.
- IEE-003: Check local prerequisites before expensive context consumption. Keep
  atomic start/completion input validation and required post-mutation read-back.
  Reuse passing local evidence only while its inputs remain unchanged.
- IEE-004: Preservation checks distinguish packet writes, scenario-managed
  binding transitions and independent external edits. Preserve foreign writes;
  reject overlapping writes, unexplained content changes and damaged recovery
  evidence. Directory timestamps alone do not establish Git data loss.
- IEE-005: Keep the handoff current and compact, with reproducible verification,
  decisions, limitations, evidence references and next packet. Avoid repeated
  inventories and instructions. Retain recovery evidence privately.
- IEE-006: Demonstrate exact coverage, byte limits, legacy behavior, corruption
  detection, ownership and frozen-input protection with executable regressions.
  Measure synthetic source-reading work separately from end-to-end agent time.
  Generate both isolated host distributions from authoritative sources.

## Architectural boundary

`product/context.ts` owns selection and exact read batching. `product/tasks.ts`
owns resolving a packet through its validated specification and plan pins. The
published schema and tool adapters expose the contract. No cross-request cache,
new project lifecycle CLI, model-specific implementation or storage migration.
