# 02 — Summarize using shared validation

Status: complete under the explicit packet 02 SIMULATION invocation. Stop after this packet.

## Inputs and prerequisites

Read exact `docs/specs/b1/spec.md` B1-002 (lines 11–14), B1-003 (15–18), B1-004 (19–22), B1-005 (23–26), and B1-001 help compatibility (7–10). No separate profile artifact is declared. Pinned MCP inputs:

- source_version: `c493210d8ae97bc8778c8e27ec1bc68d1bc90d7d25fc46fd4e168560ae825dd8`
- specification_version: `c1bdb1c7c8031493f0b3874497844574d7df65fda7f4306307163b5f7b6f2877`
- review_ref: `259869dd-8417-4bcb-aff9-ac78d891a5b8`

Use specification_open for b1 and specification_check_state with the pinned expected_source_version before work and at completion; require unchanged pass/approved/reviewed. All workflow YAML access is scenario MCP only. Never repair frozen inputs here.

Require packet 01 complete in `todo.md` and handoff evidence for its RED/GREEN/PROVE, exact validator outputs, preservation and source freshness. Reverify the delivered `records.mjs:parseRecords` and CLI validation branch; these are proposed, not existing at planning time. Require readable Git staged/unstaged/untracked status. Initial evidence: `cli.mjs:3` exact help, `test.mjs:3–4` existing subprocess/help assertions, `test-process.mjs:6,15–25` actual child stream/status capture and cleanup, `package.json:5` existing npm test command. Installed Node/npm/rtk only; never install or initialize Git.

## Outcome and scope

Allowed production paths: `cli.mjs` summary dispatch, new `summary.mjs`; tests in `test.mjs` and cleaned temporary fixtures in `.tmp`. Consume packet 01's `records.mjs` unchanged. If its delivered behavior contradicts the approved contract, record a blocker and return correction to that packet; do not add an alternate validator. Update this packet's evidence, sole `todo.md`, and current-only `handoff.md`. Preserve helper, test script, exact assertions, help, validate behavior, unrelated bytes and frozen workflow inputs. No dependencies, third packet, external services, commits, publication or installation.

Shared validation contract: complete fatal UTF-8 decoding of file bytes; zero bytes -> []; LF-only rows with at most one optional terminal LF; exactly `id,amount`; anchored ASCII `[A-Za-z0-9_-]+` case-sensitive unique IDs; anchored ASCII `[0-9]+` amounts with leading zeros allowed, each a nonnegative safe integer Number. No normalization, skipped blank rows or partial results. Either data command rejects malformed/duplicate/unsafe/invalid UTF-8 input with exit 2, null signal, stdout `''`, stderr `INVALID_INPUT\n`. Reuse packet 01's bounded handling for read failures.

`summary.mjs:summarizeRecords(records)` takes only validated record arrays, returns `{count: records.length, total: bigint}`. Local accumulator begins at 0n; add BigInt(amount) individually, never sum in Number first. `summary.mjs:serializeSummary(summary)` emits count and total as JSON numeric tokens using the bigint's decimal digits; never quote total, coerce it to Number or JSON.stringify a bigint. No user strings enter this serializer. CLI shares full read -> parseRecords -> command flow, serializes completed summary, then writes once with LF. Dependency direction is CLI -> records + summary; summary has no file, command or validation dependencies. No global state or cleanup beyond Node's full-file read and test fixture cleanup. B1-003/005 own arithmetic; B1-002/004 own shared validation and compatibility.

## Test-first acceptance and commands

Working directory: `$TRIAL_ROOT/runs/b1-baseline-precision-v3-1/app`. Keep the existing `runCli(args, { env })` helper and real subprocess checks, exact stdout/stderr/status assertions, and npm command. Do not replace them with imports or mocks.

1. Before production edits add summary tests to `test.mjs`, including running packet 01's same valid/invalid corpus through both data commands. Use application `.tmp` fixtures cleaned in finally.
2. Run `rtk proxy npm test`; record relevant RED from summary result assertions against absent summary support. Harness/import failure is insufficient.
3. Implement summary only after RED; fix implementation until correct checks pass, then required PROVE and final verification.

| Acceptance / requirements | Checks to create and expected observations |
| --- | --- |
| Empty B1-003 | Zero bytes -> exact `{"count":0,"total":0}\n`, status 0, null signal, empty stderr. Validate still emits `[]\n`. |
| Ordinary B1-003 | `a,2\nb,003\nc,0` with and without terminal LF -> exact `{"count":3,"total":5}\n`, status 0, empty stderr. |
| Exact total B1-005 | `a,9007199254740991\nb,2\n` -> exact raw stdout `{"count":2,"total":9007199254740993}\n`. Also two maximum safe amounts -> exact total token 18014398509481982. Compare text, never rounded JSON.parse Number values; reject quoted totals as well as rounded tokens. |
| Validation parity B1-002/003/004 | Both commands accept all packet 01 valid fixtures including zero and leading zeros. Both reject its full malformed/duplicate/unsafe/invalid UTF-8/BOM corpus with exact empty stdout, `INVALID_INPUT\n`, status 2/null signal. An individually unsafe amount remains invalid even with bigint aggregation. |
| Atomic summary B1-002 | Valid prefix including maximum safe amount followed by bad final row, duplicate or invalid bytes -> status 2 and exact empty stdout, never an intermediate aggregate. |
| Compatibility B1-001/004 | Keep all validate/help/unknown-command regressions, exact streams and actual exits. Repeat invocations to catch retained total/count state. |

PROVE: temporarily substitute Number accumulation for bigint and confirm the 9007199254740993 lexical assertion fails, then restore. For changed no-partial-output wiring, temporarily emit a summary before a bad suffix is validated, confirm the empty-stdout assertion fails, then restore. A structure/wiring assertion, if added to establish shared validator use, also requires an isolated bypass mutation; prefer source inspection plus CLI parity tests over brittle structure tests. If RED never reached any intended assertion, apply an appropriate mutation after GREEN. Never loosen correct checks.

Final commands: `rtk proxy npm test`; `rtk proxy node --version`; `rtk proxy sha256sum unrelated.txt test-process.mjs package.json`; `rtk proxy git status --short`. Inspect scoped staged/unstaged/untracked changes for summary/CLI/test/task files only, excluding workflow YAML contents. Preservation hashes: unrelated `66d58c226b7ae1af545c81f3d91e17b0d75f0e91fd9e77b3d4416cd9822ded19`; helper `13575770b94cf15658477d715862b18536156e158d9c4fcfffba624e46b4e665`; package `6ea04556db3f66809279c9107d53991ef71c636ffc42cfc30f94b240909c5279`. Record installed fixture runtime; no unsupported platform claims.

## Completion and recovery

Include a concise code/test rationale that safe individual numbers can have an unsafe aggregate, without a separate durable document. Mark complete only after all checks and pinned MCP recheck pass; unavailable required checks leave this packet incomplete. Record exact RED/GREEN/PROVE and preservation evidence in handoff. Rollout is local files only, no migration or external step. Recover by reverting only packet 02 edits after inspecting overlaps; retain packet 01, initial staged fixture and unrelated work. No blanket reset, commit or automatic review. Stop at packet 02 completion.


## Execution evidence

Packet 01 prerequisite reverified from its checklist/handoff and actual `records.mjs:1–23`, `cli.mjs:2–20`, `test-process.mjs:6–26` and `package.json:5`. Parser bytes remain unchanged (SHA-256 `dabdb6e9b8a7480dac454404bccb43b8339900fd0e99446eb06a70bd8c2b81df`). No plan or contract change was needed. MCP returned complete B1-001–005 definitions and behavior decision revision 1, confirmed Standard/core scope, no profile artifacts or product linkage.

Changed `cli.mjs` to select summary after the same complete parse; added pure bigint accumulation and numeric-token serialization in `summary.mjs`; extended `test.mjs` using the preserved real child helper. Safe individual amounts can sum beyond safe Number precision, so each amount is converted before addition and total digits are serialized directly.

All commands ran in the packet working directory with `rtk proxy`, Node `v24.20.0`. Manual verifier exited 0 and Git worktree check returned true. Before production edits, `npm test` RED exited 1: 35 summary failures (missing dispatch produced UNKNOWN_COMMAND/status 2), 33 passes. GREEN and final restored `npm test` exited 0, 68/68 passed. Existing exact assertions were retained; summary tests cover the full invalid corpus, all packet 01 valid fixtures, ordinary rows with/without LF, repeated invocations, empty input, exact large totals, bounded read errors and atomic bad suffixes.

Required PROVE, each restored before proceeding:

- Number accumulation mutation: `node --test --test-isolation=none --test-name-pattern="exact total above safe integer" test.mjs` exited 1; lexical stdout assertion saw 9007199254740992 instead of 9007199254740993.
- Early valid-prefix summary write before full parse: `node --test --test-isolation=none --test-name-pattern="summarize rejects .*suffix after maximum prefix atomically" test.mjs` exited 1; all three malformed/duplicate/invalid-byte suffix tests failed the empty-stdout assertion, observing a count-1 summary.

Final hashes for unrelated/helper/package match the expected values above. `git diff --check -- cli.mjs test.mjs` passed. Scoped diffs, new summary module, staged fixture state and untracked paths inspected; initial staged contents preserved. Temporary fixture directories cleaned in finally. Initial staged inspection inadvertently included immutable review archive contents; no archive was modified, and authoritative workflow reads used scenario MCP.

Initial and completion MCP pinned checks both returned pass/approved/reviewed, no issues, no approval checkpoint write, with the exact three pinned references above unchanged. No unresolved decisions or blockers. Runtime evidence is limited to this installed fixture. Local uncommitted files are the completed rollout; no commit, installation, external service, global mutation, next packet or automatic review. Both planned packets are complete; no next implementation packet exists.
