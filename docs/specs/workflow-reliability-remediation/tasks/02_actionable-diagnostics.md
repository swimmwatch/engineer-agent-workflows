# I02 — Publish actionable product-scenario diagnostics

Status: Complete; revision 3 packet checks and both independent reviews passed
Dependencies: I01
Requirements: WR-006, WR-013, WR-014
Quality scenarios: Q03

## Exact inputs and preflight

- Project: this repository; specification slug `workflow-reliability-remediation`.
- source_version: `345c12557dec017f7dba829464bd36932d866eea21f42c37a1f18b40e8e988b1`
- specification_version: `c1b8042c6009a8a5522f9d5e79a5f25cd10f3104aa980f6aa02886eef49f1efa`
- review_ref: `b4668494-2caa-41fe-ae73-d756aa6082e0`

Working directory for every command: repository root. Node.js >=22.20.0 and the
repository's existing pinned dependencies are prerequisites. Before work and
completion call specification_check_state with the pinned source_version; fetch
only WR-006, WR-013, WR-014 through requirement_get using the pinned specification_version,
following every text/reference continuation. Read [C02](../contracts/mcp.md#c02--structured-diagnostics) and only the named entries in [quality/scenarios.yaml](../quality/scenarios.yaml).
These versioned contracts, not chat history, are the acceptance inputs.

Require a usable Git worktree with readable status and scoped tracked, staged and
untracked evidence. No clean tree or existing commit is required. Capture the
pre-edit state, preserve unrelated changes and reverify the source passages below.
Dependency readiness means recorded passing acceptance evidence for I01, not merely a checked label or a commit.
Also update only this packet's execution evidence, todo.md and current handoff.md.

## Outcome, boundary and scope

Owner: Shared diagnostic normalization and the product tool boundary.
Allowed production ownership: `src/diagnostics.ts`, `src/product/tools.ts`, `src/product/technical.ts`, `src/metadata.ts`, `shared/schemas/product.schema.json`, package diagnostic/metadata tests; schema copies only via generation/build.
Paths beginning src/, test/ or test-support/ in this packet are relative to
packages/engineer-agent-workflow-mcp/; all other paths are repository-relative.

Evidence to reverify: `packages/engineer-agent-workflow-mcp/src/product/tools.ts:140` validates JSON-schema inputs but emits a generic failure. `packages/engineer-agent-workflow-mcp/src/diagnostics.ts:76` already bounds field-path/category/limit details. `packages/engineer-agent-workflow-mcp/src/product/technical.ts:845` selects the registered subject.

Implementation boundary: Adapt the installed Ajv error representation to the existing bounded diagnostics contract. Keep parsing and redaction in diagnostics, schema ownership in root shared/schemas, and candidate-specific subject lookup in the Technical Design owner. Describe allowed-subject discovery via product_document_list, not an unbounded embedded registry. Keep existing error codes. Avoid per-caller copies of validation rules.

Non-goals: unrelated worktree changes; changing approved behavior or scope;
global configuration, installation, commits, releases; hand-editing generated
bundles or MCP-owned workflow YAML; executing any next packet. New behavior is
not authorized until this packet is explicitly invoked.

## Test-first acceptance and proof

1. Create table-driven public-tool tests for limit 0/1/50/51/100, wrong types, nested/unknown fields and Unicode; assert exact safe path/range categories.
2. Use a real Overview-only candidate: Architecture must report allowed subject/discovery and no side effect; the corrected call succeeds.
3. Inject credentials/private keys/arbitrary user keys into invalid input; assert neither messages nor structured details expose them. Oversized diagnostics remain bounded with explicit truncation and a usable discovery route.
4. Validate and execute examples against advertised schemas and representative fixture state. Observe RED at the public MCP boundary before wiring the adapter; PROVE redaction/no-write assertions separately.

Tests to create in this packet: `packages/engineer-agent-workflow-mcp/test/product-diagnostics.test.mjs`.
Run the focused command after creating its discriminating checks and before
implementation; new filenames below are planned, not currently existing scripts.
Then implement, correct code until the valid assertions pass, and run required
PROVE. For an absence/structural claim use the stated actual snapshot/counter/trace,
not a copied implementation constant. A harness/import failure is not RED proof.

```sh
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node scripts/run-tests.mjs packages/engineer-agent-workflow-mcp/test/workflow-diagnostics.test.mjs packages/engineer-agent-workflow-mcp/test/tool-metadata.test.mjs packages/engineer-agent-workflow-mcp/test/product-technical.test.mjs packages/engineer-agent-workflow-mcp/test/product-diagnostics.test.mjs
```




Focused pass is necessary, not permission to skip a material shared-boundary test.
Broaden only for changed shared boundaries, new failures or unresolved evidence.
Record actual environment, commands, RED/GREEN/PROVE results and observed side
effects. A missing or failing required check keeps this packet incomplete.

## Compatibility, recovery and manual gates

Additive safe diagnostics only; retain old code/message and payload bounds. Roll back the adapter without altering stored records.

MANUAL GATE: None. Do not change global MCP or logging configuration.

No automatic user answer, reviewer verdict, installation or publication is allowed.
If a check fails, report the concrete next action and its established owner; when
the external owner is unknown, say so. Never assign a new duty to the user or
downgrade the required check merely to mark the packet complete.

## Completion and stop

Read back the changed state through owning public tools. Recheck the exact pinned
specification and review the scoped final diff, including staged/untracked files.
Mark this packet complete in [todo.md](todo.md) only after its required evidence
passes; replace [handoff.md](handoff.md) with the current result and next eligible
packet. Stop. Separate code/security review and commits are optional explicit
invocations, not completion or next-packet gates.

## Execution evidence — 2026-10-11

Executed under [execution-workflow.md](execution-workflow.md); this run requires
both independent reviews before the coordinator advances. Existing dirty work
and I01 were preserved; no staged files were present before or after this packet.

Changes: shared diagnostic normalization now adapts the installed Ajv v6 errors
to safe published paths, categories, expected type/constraint and schema ranges,
retaining `limit` compatibility and existing code/message. Technical Design's
candidate owner supplies bounded safe registered subjects plus a discovery call
using `product_document_list`, artifact `technical-design`, limit 1 and the caller's
latest context. This limit keeps discovery usable for long Unicode subjects within
the existing success budget. Metadata describes subject discovery and actual
page bounds. No persisted record format or root schema changed.

Verification (repository root; Linux, Node v24.20.0):

- Matching engineering-manual verifier: exit 0. Separate Git worktree check: true.
- MCP preflight/completion: pass, Approved, reviewed, exact pins; WR-006, WR-013,
  WR-014 read through all continuations.
- Package build: exit 0. Required focused command above: 21 passed, 0 failed.
- Scoped ESLint and Git whitespace check: exit 0.
- Four public stdio tests exercise 0/1/50/51/100 limits, wrong types, nested and
  missing fields, unknown private keys/values, Unicode length, bounded oversized
  diagnostics, Overview-only lookup, corrected fixture calls, safe subject
  overflow and complete discovery pagination. Examples are validated against
  advertised tool schemas and executed against actual candidate fixture state.
- Initial RED: the first three tests reached public diagnostic assertions and
  failed missing structured details. Further acceptance assertions demonstrated
  missing opposite range bound and a registered private path leak before fixes.
  Discovery at limit 50 failed the unchanged response budget; the suggested call
  was corrected to limit 1. One harness assertion was corrected from `item.subject`
  to the actual public `item.document.subject`; acceptance was preserved.
- Isolated PROVE: separately omit published paths, omit ranges, expose Ajv's
  arbitrary additional-property key, and write a forbidden durable file during
  invalid-input rejection. Each copy rebuilt successfully and exited 1 at its
  corresponding assertion (path lookup, minimum 1, private-key non-reflection,
  durable snapshot equality). Every restoration rebuilt and passed its check.
  All four restored isolated diagnostics tests also passed after the no-write
  mutation. Active-tree source was never mutated for PROVE.

External baseline, exact incremental diff, source/test hashes and mutation logs
are supplied to both reviewers. No full suite or new OS/host qualification was
run; those checks remain assigned to their later packets. No global configuration,
installed copy, commit, publication or external Headroom state changed.

Next action: the coordinator invokes both independent reviewers on the frozen
final diff, then returns any substantiated defect to the I02 implementer.

## Review correction — revision 2

Both independent reviewers reported P2: the subject diagnostic filter only
recognized paths at the beginning of a value and omitted standalone credential
forms. Public synthetic inputs demonstrated reflection of embedded Unix, Windows
and home-relative paths, `sk-proj-` credentials and `Bearer` credentials.

The correction changes only the shared safe-value filter and its diagnostic
tests. Five fixture subtests were written first and each produced public RED.
The filter now suppresses these recognizable forms within registered subjects;
suppression yields `allowed_subjects_complete: false` and `truncated: true` while
retaining the bounded discovery route. Overview, Unicode and ordinary `Input /
Output` subjects are preserved. Exact product-document reading is unchanged.

Revision-2 checks: package build and scoped ESLint exit 0; the required four-file
test slice passed 27 tests, 0 failed. An isolated PROVE restored the original
filter and all five non-reflection assertions failed; after restoration the
six-test targeted run (parent plus five subtests) passed, exit 0. The existing
path/range/private-input/no-write proof evidence remains intact. MCP completion
still passes against the exact approved pins. The checklist records these passed
implementation checks; both reviewers must assess the corrected frozen state
before the coordinator advances.

## Review correction — revision 3

Revision 2 was a partial fix: both reviewers reproduced the same P2 using
`Notes:/home/example-user/secret`, `Notes[C:\Users\example-user\secret]` and
`Owner:~/private`. The recognized path signatures still depended on a preceding
delimiter. The new public cases also include a path inside a word and analogous
credential placement after colon, brackets, parentheses and underscore.

RED reproduced all three reviewer paths plus the undelimited path. The analogous
underscore credential cases independently reproduced the same flaw in regex word
boundaries. The shared filter now recognizes path and credential signatures
regardless of preceding character; no replacement delimiter set was introduced.
Conservative diagnostic omission remains explicit through incomplete/truncated
flags and discovery. Safe Overview, Unicode and `Input / Output` subjects remain
available. No source reader or other production boundary changed.

Revision-3 checks: package build, scoped ESLint and whitespace checks exit 0;
the required four-file focused slice passed 36 tests, 0 failed. Isolated PROVE
restored revision 2's guard and failed the six corresponding non-reflection
assertions (four path forms and two underscore credential forms). Restoration
rebuilt and passed the 15-test targeted run (parent plus fourteen subtests),
exit 0. Prior RED/PROVE records remain available. MCP completion passes against
unchanged approved pins.

Both independent reviewers (`code_i02`, `security_i02`) verified the final hashes
and independently ran the public targeted regressions: 15 passed, 0 failed each.
They confirmed the original P2 and punctuation/embedded/underscore variants are
closed, with safe subjects, explicit incompleteness, discovery and no durable
effects preserved. No new actionable defects were found in the reviewed boundary.
Final diagnostics SHA-256:
`d3685979a70c6be31d3056c92d16a8d71ad2fdcfb23fb9ad06a938a9bc5140cd`.
Final diagnostics test SHA-256:
`4af2993ef0af820c9264263dd0f7c59b8270ca484315207cc9b792365d096bf8`.
The coordinator released I03 after both review results arrived.
