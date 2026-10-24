# P03 — Read-only GitHub adapter

## Technical proposal

Implement `GitHubRoadmapReader` as a small adapter in a new `packages/engineer-agent-workflow-mcp/src/product/github-roadmap.ts`; its binding methods are `verifyBinding` and `readBoard`. Its inputs are validated GitHub.com Project/repository/Issue/field/option/Milestone IDs, an AbortSignal and an absolute run deadline. Its output is provider-neutral complete-membership evidence, per-task all-required-field observations, Sprint metadata, unbound eligible-item diagnostics and bounded typed failures. No other application module consumes raw GitHub payloads.

Use the installed `gh` executable (`gh.exe` on Windows), asynchronous `node:child_process.spawn` with `shell: false`, piped bounded UTF-8 output, a fixed executable/subcommand/host and trusted constant GraphQL query documents. Submit queries and JSON variables through stdin, never interpolate external text into commands, query syntax, paths or environment settings. Preserve the installed authentication context; disable interactive prompting and debug output. No provider SDK, new runtime dependency, login, configuration write or outbound mutation is introduced.

Read Projects v2 membership and configured single-select field/option IDs, Issue title/labels/repository identity, Milestone metadata and `Issue.blockedBy` connections. Use GraphQL node IDs as opaque strings; never convert external IDs through Number. Include open and closed Milestones. Page every required connection, including nested labels, field values and prerequisites. Batch node reads in bounded groups and request only necessary fields, excluding bodies/comments/rosters. Membership is authoritative only after all Project pages finish without relevant errors; a failed page cannot prove absence. Detect repeated/nonadvancing cursors, inconsistent counts/identity and available changed revision evidence. Missing/unmapped required fields fail that task's observation rather than becoming empty values.

Each gh read has at most 30 seconds and the shared operation at most 120 seconds. Respect a verified rate-limit retry delay only when it fits the remaining budget, with at most one retry of that read. Abort/timeout stops the owned process, waits for close and escalates termination within the five-second cleanup budget; no detached children or background retries. Distinguish missing executable, unsupported capability, missing authentication, denied access, rate limit, malformed/incomplete data, timeout and cancellation. Preserve bounded redacted diagnostics, not raw credentials or responses. Required API capability absence is a clear unsupported result, not a guessed fallback.

Requirement IDs: REQ-004, REQ-005, REQ-006, REQ-010, REQ-012, REQ-021, REQ-022, REQ-028, REQ-029, REQ-033.

Evidence: existing Node >=22.20.0 and dependency pins are in `packages/engineer-agent-workflow-mcp/package.json:8`; no existing provider/HTTP implementation appeared in the inspected product module inventory. Official references checked on 2026-10-24: [gh api](https://cli.github.com/manual/gh_api), [Issue blockedBy](https://docs.github.com/en/graphql/reference/issues#issue), [Projects single-select values](https://docs.github.com/en/graphql/reference/projects#projectv2itemfieldsingleselectvalue), [Node 22.20 child processes](https://github.com/nodejs/node/blob/v22.20.0/doc/api/child_process.md). Installed-client capability/response probes remain implementation checks, not already proven behavior.

## Delivery details

### Inputs and eligibility

Packet: **P03**. source_version: `6087eb0c0dfca148e9afc43780651ece85bd5d9660313a049d34071925e8eaa5`; specification_version: `e257fb7b0011d3d9e5e9b0754391b65133e83054bc7327fd2110163f0dab5af8`; review_ref: `fd840f43-b70d-463d-991c-204f891f1b2e`.

Read exactly `REQ-004`, `REQ-005`, `REQ-006`, `REQ-010`, `REQ-012`, `REQ-021`, `REQ-022`, `REQ-028`, `REQ-029`, `REQ-033` through MCP `requirement_get`, using the pinned specification_version as that tool's source_version, following every text/reference continuation. Do not reload the full specification or decisions history. Recheck the aggregate source_version through `specification_check_state`.

Dependencies: [P01](01_graph-kernel.md), [P02](02_graph-store.md) completed with their required checks and current agreement. Required local tools: usable Git worktree/status including staged/untracked evidence, the existing Node >=22.20.0/npm environment and the matching workflow MCP. No clean tree or existing commit is required. Missing installation/browser authority is not supplied by this plan.

Exact contracts/scenarios to read:

- contracts/mcp.md — Operations; Reconciliation and lifecycle; Stable failure causes
- quality/scenarios.yaml — Q-PROVIDER

### Scoped work and acceptance

Allowed ownership areas, plus this specification's linked `tasks/todo.md` and current-only `tasks/handoff.md`:

- packages/engineer-agent-workflow-mcp/src/product/github-roadmap.ts
- packages/engineer-agent-workflow-mcp/test/product-graph-github.test.mjs
- isolated direct fake-gh executable fixtures in test-support

Preserve unrelated modified files and all source/specification/history evidence. The known planning-entry worktree includes unrelated MCP README/metadata/task/tool/schema/test edits and `.local/`; re-inspect their current content and overlap before editing. An unexplained deletion/loss or unknown overlapping change requires disposition, not baseline replacement.

Acceptance observations:

- Capture actual direct gh argv/stdin: fixed GitHub.com read queries only, no shell/extra runtime runner, caller query or executable override.
- Read all Project and nested dependency/label/field pages; closed Milestones are included; wrong scope/incomplete page/missing field never becomes successful emptiness.
- Missing gh/auth, permission, malformed output, rate limit, timeout and cancellation remain distinct bounded causes; owned process closes within five seconds of cancellation.
- Preserve opaque IDs and local supplements; stored normalized fields/diagnostics exclude bodies/comments/rosters/raw credentials.

### Test-first execution and verification

Working directory: repository root. Create/extend the following checks before implementing this packet: `packages/engineer-agent-workflow-mcp/test/product-graph-github.test.mjs`. These are planned files, not claims that scripts/tests already exist.

Use the exact synthetic workloads, observations and mutations in `Q-PROVIDER` from `../quality/scenarios.yaml`. Run RED first; if it only reports a missing import/symbol or invalid harness, repair the harness and require PROVE after GREEN. Implement until every correct check passes; never weaken a correct assertion to obtain green. Perform the named one-behavior PROVE mutations for absence/wiring/late-written assertions, observe each expected failure and restore the implementation before final verification.

Copy-ready local commands (existing build/lint infrastructure; named feature tests are created by this packet):

```bash
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/product-graph-github.test.mjs
rtk proxy npm run lint --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
```

Review scoped tracked, staged and untracked changes; keep workflow YAML out of direct content diffs/parsers. Run whitespace checks on this packet's actual changed textual artifacts, including untracked files. Tests and evidence must show the real owning operation, not merely mirror declarations.

### Recovery and completion

Stop the owned direct child and leave all source/store state untouched. Keep the last valid local graph available; fix the adapter instead of changing provider configuration.

After all required local checks pass and every PROVE mutation is restored, run `specification_check_state` with the pinned aggregate source_version and `planning_packet_check` with the exact agreement_ref/proposal_digest below. Inspect the scoped diff against the agreed units/contracts. A failed/unavailable required check leaves this packet incomplete; report its actual result and concrete next action/owner. Do not run the completion gate while tests remain pending.

Update only this packet's entry in `todo.md` and replace `handoff.md` with current changes, actual RED/GREEN/PROVE evidence, versions, blockers and the next eligible packet. Then stop. Do not execute another packet, invoke code/security review, commit, install, refresh clients or publish automatically. Review and commits are separately authorized optional actions, not next-packet gates.

## Technical agreement

```json
{
  "packet_id": "P03",
  "proposal_id": "P03-github-reader-v1",
  "agreement_ref": {
    "id": "54e2e01d-2f76-42f3-ba38-dc0c4b4212f3",
    "revision": 8
  },
  "proposal_digest": "ba92446840ce5f493806f888bd4d8930ef3e7b76ce0596e40e4ad50c878cd8ae",
  "sources": [
    {
      "path": "docs/specs/product-roadmap-task-graph/tasks/plan.md",
      "heading": "Shared architecture"
    },
    {
      "path": "docs/specs/product-roadmap-task-graph/tasks/03_github-reader.md",
      "heading": "Technical proposal"
    }
  ],
  "planning_packet_check": "ready"
}
```
