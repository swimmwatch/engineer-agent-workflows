# B2 timeout range

Packet ID: `b2-timeout-range`

## Technical proposal

Proposal ID: `b2-existing-boundary`. Covers B2-001, B2-002, B2-003 and B2-004 as defined in `docs/specs/b2/spec.md`, sections B2-001 through B2-004.

Keep the binding exported signature `parseTimeout(raw)` in `configuration.mjs`. Its input remains an environment string or undefined; undefined returns 5000. Preserve ASCII decimal digit validation and the lower bound 1; change the upper bound from 10 to 60 inclusive. Leading zeroes remain valid and the numeric result is seconds multiplied by 1000. Invalid strings throw Error with message `INVALID_TIMEOUT`. Do not trim, accept signs/fractions, or use permissive integer-prefix parsing. Minor private expression organization is flexible.

The function remains pure and synchronous, with no mutable state, resources, dependencies or new abstraction. `cli.mjs` remains the environment/process adapter depending on configuration, never the reverse. It reads TIMEOUT_SECONDS once per process, writes exactly JSON with timeoutMs and format:'json' followed by newline on success, and on invalid input writes exactly `INVALID_TIMEOUT\n` to stderr, empty stdout and exit status 2. Successful processes exit 0 with empty stderr; normal termination has null signal. Preserve the CLI implementation unless repository evidence requires reconciliation.

Extend only `test.mjs` for behavior checks, using direct function assertions and real child-process assertions through the existing `test-process.mjs` export `runCli(args, { env })`. Preserve that helper and the package test command `node --test --test-isolation=none test.mjs` exactly. Never replace subprocess checks with imports or mocks. Before production changes, create and run checks including newly accepted 11 and 60 (also zero-padded forms), existing default/1/10, and invalid 0/61/fractions/signs/whitespace/empty/nonnumeric strings. Assert exact stdout, stderr, status and signal for CLI cases. Correct implementation until correct checks pass; apply required absence-claim mutation proof and restore it before final verification.

One dependency-free packet owns production edits only in `configuration.mjs` and test edits in `test.mjs`, plus its checklist/handoff progress. Preserve unrelated fixture content, `unrelated.txt` byte-for-byte, staged changes, helper and package configuration. No dependency installation, commit, publishing or external action. This keeps the established function/configuration boundary; extracting a parser or adding a package would add complexity without satisfying another approved need.

## Technical agreement

Selected proposal: `b2-existing-boundary`; packet: `b2-timeout-range`.
Source: this file, exact heading `Technical proposal`.
Agreement reference: `{ "id": "576c4f4f-bf4d-403e-a343-36f781caf266", "revision": 2 }`.
Proposal digest: `b5daa423691decaa7206627d1f01d161a8f4879a5a978e2e9b0b5a73ad3d5915`.
Native answer provenance is retained in that managed planning decision, explicitly limited to the frozen simulation. `planning_packet_check` returned `ready`, issues empty. This is planning readiness only; implementation requires a separate explicit invocation.

## Delivery

Inputs pinned by MCP:

- source_version: `a8768504a041a80f0be679675cfc18e982726ce5e8cc8b818cf431531bafbb20`
- specification_version: `4f85f3b995a54ce1e1fdbf8de5895c3b8c9cea70c58f9119a7ea8325efe35862`
- review_ref: `a9e5ac8f-4f46-4c3d-94a7-14470b8863df`

Read only the four requirement definitions B2-001..B2-004 and this packet. Confirmed standalone Lite/core scope has no additional profile or design outputs. No packet dependencies.

Reverify repository evidence before execution: `configuration.mjs:1` exports the pure parser, `configuration.mjs:2` owns default, `configuration.mjs:3` owns validation and upper limit, `configuration.mjs:4` converts seconds. `cli.mjs:2` depends on configuration; `cli.mjs:3` owns environment and successful JSON; `cli.mjs:4` owns error streams/status. `test.mjs:4` covers only default/5/0 currently. `test-process.mjs:6` exposes runCli; lines 15..21 capture real child streams/status/signal through file descriptors, with cleanup at line 22. `package.json:5` declares the existing test runner. Git status is readable and existing files are staged additions: preserve this baseline; do not reset, stage, initialize Git, or assume a clean tree.

Working directory for every shell command is the application root. Prefix commands with `rtk proxy`. Use the already installed Node and npm; no installation is authorized. Execution is blocked until this packet is explicitly invoked. Then recheck `specification_check_state` with the pinned source version and `planning_packet_check` with the exact agreement/digest above before bulk reads or edits. Changed/stale inputs return to their workflow owner.

### Verification map

| Requirements | Checks to add in test.mjs | Expected evidence |
| --- | --- | --- |
| B2-001 | Function undefined/5 returns 5000; CLI unset yields exactly `{\"timeoutMs\":5000,\"format\":\"json\"}\n` | Regression green, status 0, signal null, stderr empty |
| B2-002 | Function and CLI accept every integer 1..60 and zero-padded equivalents, including 0001/0011/0060 | Exact milliseconds; new 11/60 assertions fail against current upper bound 10 |
| B2-003 | Function rejects 0, 00, 61, 0061, a very large digit string, 1.5, +1, -1, leading/trailing spaces, tabs/newlines, empty, abc, 1x and non-ASCII digits | Exact Error message INVALID_TIMEOUT; each CLI case status 2, signal null, stdout empty, stderr exactly `INVALID_TIMEOUT\n` |
| B2-004 | Scoped diff and preservation check | Only configuration/test behavior changes; helper, package and unrelated fixture preserved |

For CLI checks call `runCli([], { env: { TIMEOUT_SECONDS: raw } })`; deliberately unset TIMEOUT_SECONDS for the default case using undefined in the helper environment override and verify the default assertion actually runs. Use exact stream strings, including trailing newline, and actual returned process status/signal. Do not rely on ambient timeout environment values. Function checks assert returned values and exact error messages.

### Ordered execution after separate authorization

1. Preserve/read scoped Git status, including staged and untracked paths. Reverify evidence and prerequisites. Run existing baseline with `rtk proxy npm test`; this has not been run during planning.
2. Add the behavior checks above to `test.mjs` first. Run `rtk proxy npm test`; record relevant RED from the 11/60 range assertions, not a collection/import/harness failure. Existing rejection/default checks may already pass. Repair any harness issue before treating RED as evidence.
3. Change the configuration upper bound to 60 at the existing boundary. Run `rtk proxy npm test`, correcting production implementation while correct checks fail. Do not weaken assertions to obtain green.
4. Prove the empty-stdout error assertion observes the real stream: temporarily add stdout output on the invalid CLI path, run `rtk proxy npm test`, require a failure at the empty-stdout assertion, then restore the CLI exactly. This temporary mutation is the only planned CLI edit. If the prior range RED reached the intended value assertion, it already proves that range check; otherwise temporarily restore upper bound 10 and confirm it fails, then restore 60. Record all mutation evidence and restoration.
5. Run final `rtk proxy npm test`. Check `rtk proxy git diff --check -- configuration.mjs cli.mjs test.mjs docs/specs/b2/tasks` and inspect scoped unstaged and staged diffs, excluding workflow YAML. Verify the preservation hashes below; retain all staged baseline work. Required failed/unavailable checks leave the packet incomplete.
6. Recheck pinned specification and exact technical agreement. Compare the scoped changes with binding commitments; update only the linked execution checklist and current handoff with RED/GREEN/PROVE evidence and any limitations. Stop after this packet. No commit, installation, publishing or external operation.

Preservation reference: `unrelated.txt` SHA-256 `66d58c226b7ae1af545c81f3d91e17b0d75f0e91fd9e77b3d4416cd9822ded19`; `cli.mjs` `22c6387aeb77eed11452a5858f4e756e4b6838df386f700c5bb5da412e9e9a97`; `test-process.mjs` `13575770b94cf15658477d715862b18536156e158d9c4fcfffba624e46b4e665`; `package.json` `6ea04556db3f66809279c9107d53991ef71c636ffc42cfc30f94b240909c5279`. Use `rtk proxy sha256sum unrelated.txt cli.mjs test-process.mjs package.json` at final verification. Reconcile unexpected independent changes; never overwrite them to force a hash match.

### Delivery limits

Run planned checks on the installed Node in this isolated application sandbox. The approved scope names Node.js without an OS/version matrix; do not invent a support expansion or claim other environments passed. Runner execution remains unverified until implementation authorization.

No migration or deployment stage is needed: this pure parser has no persistent state. Rollout is the local configuration edit; recovery restores only this packet's configuration/test changes while preserving staged baseline and independent edits. No network, credentials, privacy, accessibility, concurrency or observability surface is introduced; new controls or telemetry are not applicable. No external/manual operation is scheduled. The only gate is a separate explicit implementation invocation. Durable developer documentation is not warranted for this localized bound change; no documentation packet is added. Track execution solely in [todo.md](todo.md) and current state in [handoff.md](handoff.md).
