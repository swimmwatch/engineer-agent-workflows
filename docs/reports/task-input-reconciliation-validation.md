# Explicit task-input reconciliation validation

## Scope and behavior

Validated on 2026-10-20. The owner explicitly authorized workflow repair and
completion of existing task planning. This is not an implementation-packet
invocation or publication grant.

`task_inputs_reconcile` supports explicit replanning of a paused task with frozen
inputs. It requires a fresh task-wide check reference, current product context,
an Approved reviewed specification, exact existing replacement packet IDs and
actual invocation provenance. A running owner, completed task, stale check or
unresolved safety/recovery issue rejects the transition.

The operation retains the complete previous authoritative execution binding as
an immutable record. `previous_binding_sha256` links that record and preserves
earlier archive links. `active_packet_ids` selects the replacement packets;
current execution progress is cleared and state remains `planned`. Reconciliation
does not approve documents, acquire an implementation owner or start a packet.
Ordinary frozen-input checks retain their SOURCE_CHANGED protection.

The owning implementation is `src/product/tasks.ts` in the MCP package. Tool
registration, operation recovery, capabilities and provenance descriptions use
the existing shared mechanisms. `shared/schemas/product.schema.json` owns the
optional binding fields and new scenario input. Generated host references were
regenerated from `shared/references/product-workflow.md`.

## Verification

| Check | Actual result |
| --- | --- |
| RED before implementation | Three discriminating reconciliation tests failed because the operation was absent |
| Focused task/API regression | History retention, replacement packet completion, exact replay, stale/unknown/duplicate selection rejection, running-owner protection, specification readiness and actual stdio dispatch passed |
| PROVE | Retaining prior completions and disabling the check-reference guard each caused the corresponding test to fail; both mutations were removed |
| Published metadata regression | Missing check-reference provenance description was detected and corrected; the published-tool description check passed |
| Complete `npm test` | PASS: 924 tests, 924 passed, zero failed, cancelled or skipped; Linux, Node.js 24.20.0 |
| `npm run lint` | PASS after the final test-fixture correction |
| `npm run validate:foundation` | PASS: 17/17 skills |
| `npm run generate:check` | PASS: 17 skills |
| Scoped `git diff --check HEAD -- ...` | PASS for this change's source, tests, contracts, guidance and generated artifacts |
| `npm run build:dev` | PASS: `dev-482a7401a60bdd8c486b`; package archive SHA-256 `57b7158aa9176da77f8c12f60316f0002fb3010c45ca2722eb78cf91110c94cd` |

The successful full run used an isolated copy of the current 831-file source
inventory and the same installed dependencies. File hashes matched the main
workspace. Earlier mutable-source attempts failed while qualification helpers
and tests were inconsistent; they are not reported as passing. An early orphan
P03 test imported absent probe files. This invocation did not remove it; it was
absent from the final main-workspace inventory, which matches the validated copy.
The final run has no test exclusions.

The remaining isolated failure identified a removed controlled cleanup probe
still required by the existing qualification test. The existing probe and
resource ownership were restored without discarding the other local packaging
test changes. Its focused check passed, followed by the successful full run.
No macOS or Windows run was performed for this change; Linux results do not
replace the separate native qualification requirements.

## Installed runtime

The private development package was installed without lifecycle scripts. Before
switching the stable MCP path, a fresh standard MCP SDK connection verified
startup, `tools/list` with 147 tools, a harmless `specification_list` call and
`workflow_runtime_info` against the installed artifact's stamp:

- Build: `284aa562ce05175c2dee71c3cb73732669ae724a6a7d29cde62ed0376a6d88fa`.
- Contract digest: `1b71a5b05dbb235ddfed01a791fb22335fc94c92b6cf59fa05ef6157c78c0090`.
- Identity: `verified`; `task_inputs_reconcile` advertised.

The stable MCP path was switched atomically. The local plugin source was updated
from the generated snapshot, retaining a backup, and installed through the
supported `codex plugin add` command. Installed plugin version:
`0.0.0-development+codex.20261020103024`. The new matching engineering-manual
verifier passed. No plugin cache or client configuration was edited directly.

The old native MCP process already loaded in the current chat is not relabelled
by switching the path. Actual workflow calls use a fresh SDK connection to the
updated registration; a fresh host connection is required for subsequent native
interface use. No source commit, push, public package or application execution
was performed by this invocation.

## Actual task reconciliation

The updated installed connection successfully reconciled the explicitly
authorized existing TASK-0001 task with active packets P13/P14:

- Operation: `939fd383-56d2-4f91-a299-d19082f427dc`.
- Immutable prior binding: `6267280f39e50fb847352ef616904daabae8185c3fcd9329d57c7d956d5133f1`.
- Readiness: `pass`, state `planned`, zero issues, 42 product pins and three
  current plan pins. The previous SOURCE_CHANGED failure is resolved.
- Specification: unchanged Approved/reviewed source
  `8f588e30d28a4e8192da00eaaf1342191ba10abc8125626a920babf83cf26852`;
  no new approval checkpoint was written.

No implementation packet was started or completed. The existing Markdown plan,
checklist, handoff and two replacement packets remain the only planning outputs.
