# Specification Review Audit Recovery

Status: implementation verified; global activation pending explicit authorization.

## Corrected Contract

`specification_review_restart` accepts the current context, the latest unfinished
FULL `review_ref`, its exact `source_version` and a non-sensitive `reason`.
It appends a new FULL generation with a different identity, the same authoritative
inputs and immutable input snapshot, and zero saved results. The original run,
its exact saved records and snapshots are retained. The cause and predecessor
are persisted as `audit_restart` and can be read through status by a fresh client.
The superseded run reports stale audit state and its successor; further writes
and completion against that old identity are rejected.

The new generation accepts neither old receipts nor old continuation cursors.
It retains the enhanced FULL consistency requirement and ordinary completion and
approval gates. All items must be reviewed again; this change does not selectively
carry forward other saved verdicts. An identical restart retry returns the same
successor without clearing work already saved there. Ordinary trusted-save
interruption recovery is unchanged. FOLLOWUP and completed runs are excluded.
Both exact-request and refreshed-context retries validate the current source and
successor lifecycle. A valid retry reports current progress; a changed source,
another audit restart or an ordinary full-mode replacement rejects the retry.

This repairs the lack of an auditable response to known lost evidence. It does
not detect model compaction or attest that the model still retains full text.
A read receipt remains a generation/content binding, not semantic assurance.

## Evidence

The first executable regression failed because the operation was absent. The
real stdio protocol fixture now reproduces **80/95 -> 0/95** with unchanged source
and specification versions and preserved old history. Other cases cover obsolete
writes/receipts/cursors, pending readiness, independent retrieval of the cause,
idempotent retry, wrong source/review/reason rejection and fresh final consistency.
The semantic fixture verdicts are simulation-only; no live customer review ran.

- Eleven protocol cases pass, including four added during implementation review.
- Current MCP regressions: 132 passed; one optional retained-old-runtime check skipped.
- Initial workflow/schema/packaging regressions: 61 passed; one opt-in native-validator
  check skipped because no prepared validator was supplied.
- Initial implementation: seven deliberate defects were detected in a disposable
  copy and restored.
- TypeScript build, ESLint, source validation and generation checks pass.
- The canonical schema was propagated to 18 derived copies by the
  existing generator; other generated bodies were unchanged.

The initial broad metadata test failed at
`task_packet_review_prepare.selection.baseline_ref`. The same failure was
reproduced on an isolated pre-fix build. It belongs to the separate task-packet
metadata and was not changed or rerun during this bounded implementation review.
This report does not claim an entirely green repository test suite.

## Implementation And Security Review

Two verified retry defects were corrected. The generic saved-response path
returned obsolete progress and bypassed current source/supersession checks on an
exact request replay. Separately, a retry with a fresh context could return an
older successor after an ordinary full-mode replacement.

Four real stdio regression cases failed before the correction and passed after
it. Restart now reconciles saved responses while holding the existing journal
lock, checks read dependencies, and never writes during replay. The same latest
successor check applies to a fresh-context retry. Other operations retain their
existing replay behavior.

The protected assets are the append-only review history and generation-bound
evidence. A client may retry stale requests, lose responses or change review
modes. Such requests must not report obsolete generations as current. The tests
also assert unchanged journal bytes on rejected and successful replay paths.
This is deterministic protocol verification; it does not prove a model retained
full source text. The server remains limited by process permissions, not an
independent authorization sandbox.

## Reviewable Archive And Activation

The packed archive `engineer-agent-workflows-engineer-agent-workflow-mcp-0.0.0-development.tgz` has SHA-256
`0ac761029822473b5e74ddecffe7eee1bee20df2e492216ad83cfb8eacffc23e` and verified build
`e45a863f2aad696328e7cc69bda5b3dc106e25dbf6c722db0fc94e10d0c852f3`.
It supersedes the pre-review archive with build `7be43b15…`.
Fresh stdio servers launched from the corrected archive passed all eleven audit
recovery tests, including restart, full reread, consistency and completion on
temporary projects; the completed fixture specification remained Draft.
The package probe reused the existing pinned workspace dependencies and
is not a clean-registry installation qualification.

The connected global server still advertises build `772847cc…` and lacks the new
operation. No global installation, configuration, process restart, publication,
commit or real consumer review was changed. Root `AGENTS.md` rule 8 requires
explicit scope for global replacement. After authorization, follow the existing
[atomic MCP installation procedure](../local-development.md): install the verified
archive in its own version, validate it, switch `mcp/current`, then restart the
serving process and rediscover capabilities. Until then, the consumer review
must remain incomplete; do not edit its journal or finish it artificially.

[Structured evidence](specification-review-audit-recovery-result.json),
[operator guidance](../specification-review-workflow.md), and
[MCP package guidance](../../packages/engineer-agent-workflow-mcp/README.md).
