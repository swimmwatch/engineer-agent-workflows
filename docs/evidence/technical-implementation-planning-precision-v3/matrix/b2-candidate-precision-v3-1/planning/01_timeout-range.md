# b2-01: Expand timeout range

## Technical proposal

Proposal `b2-timeout-existing-boundary` covers B2-001, B2-002, B2-003 and B2-004, defined in `docs/specs/b2/spec.md` under their exact requirement headings. Keep the dependency-free ES module boundary: the binding public symbol is `parseTimeout(raw)` exported by `configuration.mjs`; `cli.mjs` imports it and passes `process.env.TIMEOUT_SECONDS`. No new class, module, dependency or configuration source is needed. Minor local variable names and equivalent statement organization are flexible.

The parser is a synchronous, stateless function. Its supported input is an undefined value or environment string; undefined returns 5000. Preserve ASCII digit validation, accept numeric values 1 through 60 inclusive including leading zeroes, and return seconds multiplied by 1000. Reject zero, above-60 values, fractions, signs, surrounding whitespace, empty and nonnumeric strings by throwing Error with message `INVALID_TIMEOUT`. Retain the existing validation/conversion algorithm and expand its upper bound from 10 to 60. Do not trim, use permissive prefix parsing, or generalize the interface.

The CLI owns environment access, JSON serialization, streams and process exit: success writes exactly `{"timeoutMs":<milliseconds>,"format":"json"}\n`, empty stderr, exit 0; invalid input writes empty stdout and exactly `INVALID_TIMEOUT\n` on stderr, exit 2. Dependency direction remains CLI to configuration, with no parser I/O, persistent state, resource ownership or asynchronous lifecycle. Preserve CLI source unless evidence requires a scoped correction to deliver the approved contract.

Extend `test.mjs` before production edits with direct parser checks and real CLI child-process assertions using the unchanged `test-process.mjs` export `runCli(args, { env })`. Assert actual status, null signal, exact stdout and exact stderr; do not substitute imports or mocks for CLI execution. Preserve the helper's temporary file descriptor capture and cleanup, and preserve `package.json`'s `node --test --test-isolation=none test.mjs` test command. Run new checks to obtain relevant RED evidence, then make the smallest parser change and correct implementation until correct checks pass. Never weaken correct checks for green. Apply PROVE for affected absence guarantees or when RED does not execute the intended assertion.

Allowed implementation edits are `configuration.mjs` and `test.mjs`, with `cli.mjs` only for an evidenced scoped correction; task progress updates belong in this tasks bundle. Preserve all other fixture content, especially `unrelated.txt`, `test-process.mjs`, `package.json`, frozen specification and confirmed scope. This is one implementation packet; no installation, commit, publication, external action or additional workflow is included. Agreement is technical planning evidence only; execution requires a separate explicit packet invocation.

## Technical agreement

Selected proposal_id: `b2-timeout-existing-boundary`; packet_id: `b2-01`.
agreement_ref: `f5be186c-94d8-4ae6-975b-085737b853be`, revision 2.
proposal_digest: `51e85182414c0011b5d165abbc86bd6d6590a016e44b1ac68d28e78d5d5f9e70`.
Source: this file's exact `Technical proposal` heading.
Managed question/answer provenance: the agreement revision above, recorded from native `functions.request_user_input:b2_technical`, frozen simulated respondent, fixture only.
`planning_packet_check`: ready; no issues. Recheck before execution and completion. No implementation authorization is supplied by this result.

## Inputs and prerequisites

- source_version: `881d5c183c7cc641998ce2707666a2a5c04236e3b9e2c88ed39e27065cd0f195`
- specification_version: `4f85f3b995a54ce1e1fdbf8de5895c3b8c9cea70c58f9119a7ea8325efe35862`
- review_ref: `03199ed8-4456-426a-9af3-15c445d586c2`

Completeness check: pass, approved, reviewed; approval checkpoint absent and not written. These are frozen SIMULATION inputs, not independently authenticated approval. Read only the exact B2-001 through B2-004 requirement sections of `docs/specs/b2/spec.md` (lines 7, 11, 15, 19) and their linked decision `e9908c4f-0a6d-4ef5-abcb-1b1e256962d7` revision 1 via MCP if reconciliation is necessary.

Standalone Lite/core scope; no dependent packet, profile artifact, product context or design gate. Future execution needs an explicit invocation for b2-01, installed Node/npm, and a usable Git worktree with readable staged, unstaged and untracked status. Existing status is readable and contains staged fixture files; preserve them without reset or commit. No clean-tree requirement. Re-verify scoped evidence and both MCP gates before implementation; drift returns affected work to planning/specification.

Evidence: `configuration.mjs:1` exports the parser, `:2` owns the default, `:3` validates digits and currently caps at 10, `:4` converts seconds. `cli.mjs:2` imports configuration, `:3` serializes output, `:4` owns failure streams/status. `test.mjs:4` covers only default, 5 and zero. `test-process.mjs:6` exposes runCli, `:15` starts a real Node child, `:17` uses file descriptors, `:20` returns status/signal/streams, `:22` cleans up. `package.json:5` defines the installed single-file test runner. Recheck line evidence before changing files.

## Verification and delivery

All shell commands run in the application root:
`$TRIAL_ROOT/runs/b2-candidate-precision-v3-1/app`.
Prefix commands with `rtk proxy`. Tests below are to be added to existing `test.mjs`; the runner and helper already exist.

| Requirement | Owning layer and planned assertion | Expected evidence |
| --- | --- | --- |
| B2-001 | Parser: undefined → 5000, '5' → 5000; CLI default and '5' → exact JSON plus newline, stderr '', status 0, signal null | Compatibility regression |
| B2-002 | Parser: every decimal string 1..60 and zero-prefixed equivalents → seconds × 1000; explicitly include '1', '10', '11', '60', '00060' | Before implementation, >10 assertions fail with INVALID_TIMEOUT; after, exact numeric results |
| B2-002 | CLI via runCli([], {env}): '11', '60', '00060' → exact JSON, stderr '', status 0, signal null | Before implementation, success assertions fail on exit 2; after, exact outputs |
| B2-003 | Parser and CLI: '0', '000', '61', '00061', '999999999999999999999999', '1.5', '+1', '-1', ' 1', '1 ', '\t1', '1\n', '', 'abc', '1x', '１' | Parser throws Error with exact message INVALID_TIMEOUT; child status 2, signal null, stdout '', stderr 'INVALID_TIMEOUT\n' |
| B2-004 | Scoped diff, unchanged helper/runner, unrelated-file digest, no new dependencies | Only authorized paths differ; unrelated bytes unchanged |

Set TIMEOUT_SECONDS explicitly for every child case to isolate the ambient environment. For the default child case pass `env: { TIMEOUT_SECONDS: undefined }` and verify the real resulting default output; a harness failure must be repaired rather than replaced by a mocked CLI. Keep status, signal and both stream assertions exact for all child cases.

1. Recheck specification with pinned expected_source_version and agreement using the exact packet/ref/digest above. Inspect `rtk proxy git status --short`, plus scoped staged/unstaged diffs and relevant untracked files; preserve all pre-existing content.
2. Add the parser and real-child tests before changing production. Focused command: `rtk proxy node --test --test-isolation=none --test-name-pattern=timeout test.mjs` (give new test names the word timeout). Full command: `rtk proxy npm test`. Run and record relevant RED failures for newly accepted values; passing baseline rejection cases are regression evidence, not fabricated RED.
3. Make the smallest upper-bound change. Run focused checks, correct implementation until correct assertions pass, then run `rtk proxy npm test`. Never loosen correct assertions.
4. PROVE: the range expansion affects rejection above the new bound. Temporarily allow 61, confirm the parser and CLI '61' checks fail, then restore. For empty-stdout protection at that affected failure boundary, temporarily emit a sentinel to stdout on CLI failure, confirm the exact stdout assertion fails, then restore. Run the full suite after restoration. These are future packet steps, not executed planning evidence.
5. Inspect scoped staged and unstaged diffs using explicit paths (exclude workflow YAML from content diffs), recheck status and `rtk proxy sha256sum unrelated.txt`. Expected digest: `66d58c226b7ae1af545c81f3d91e17b0d75f0e91fd9e77b3d4416cd9822ded19`. Preserve helper, runner, unrelated content and pre-existing staged entries.
6. Recheck both MCP gates with pinned versions/ref/digest. Update the sole checklist `todo.md` and replace current state in `handoff.md` with actual RED/GREEN/PROVE, commands/results and any blocker. Mark complete only when all checks pass, then stop.

## Compatibility and recovery

Existing 1..10/default behavior and CLI serialization/error handling remain stable. This is a local stateless validation change: no data migration, distributed coordination, credential/privacy changes, new logs, UI or deployment is involved. Runtime verification is planned on the installed fixture Node environment; the approved inputs declare no additional OS/version matrix. Do not claim other-platform passes. Installation is unavailable; missing runners leave execution incomplete.

Rollout consists only of the separately authorized local parser/test edit. If it fails, restore only this packet's own edits from its recorded starting diff, preserving staged and unrelated work; never bulk-reset. Restoring the old limit loses acceptance of 11..60, so record that the packet is incomplete. External and irreversible steps are excluded; no manual external gate is needed.

Durable developer documentation is not warranted: a localized range extension at an established function/CLI boundary meets fewer than two documentation-threshold signals. No separate documentation packet.
