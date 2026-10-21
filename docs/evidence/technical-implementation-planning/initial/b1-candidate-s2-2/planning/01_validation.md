# B1-P1 — Shared validation and validate

## Technical proposal

Proposal B1-P1-shared-parser covers B1-001, B1-002, B1-003 (empty validate), B1-004. Create records.mjs with the binding parseRecords(text) signature and semantics in plan.md, Shared technical contract. Extend the existing cli.mjs dispatch to implement validate <file> through complete file decoding and that parser. Serialize the resulting records after validation; keep help and unknown-command dispatch behavior. This packet owns shared validation, never summarize implementation. Use built-in Node facilities and existing ESM configuration. A small pure module creates a reusable policy boundary; a streaming parser or class hierarchy adds lifecycle/partial-output complexity without a requirement.

The existing runCli(args, { env }) helper in test-process.mjs remains the real child-process observation boundary. Extend test.mjs using actual temporary input files and exact status, signal, stdout and stderr assertions. Preserve the existing help assertion, helper and npm test command. Parser unit tests may supplement, never substitute for subprocess checks. All production/test work happens only under a later explicit packet invocation.

## Delivery details

## Inputs and execution gates

- source_version: `b2bcc8e86d513972ae604f813b43e61e7b11ee37a0ff41285d5a246d391d884a`
- specification_version: `4b77db1d93030b893e8c9f60f5f9304257569ae2d2c04b515b188e1bccab6007`
- review_ref: `f61a4513-aa51-4915-be31-f3f9675b0b14`

Before bulk implementation reads or edits, reverify the cited repository evidence, call specification_check_state with the pinned source_version, and planning_packet_check with the exact binding below. Require passing reviewed Approved inputs and ready agreement. Use requirement_get with specification_version for the packet-linked IDs; spec.md owns behavior. No profile artifacts are declared, and no product/design workflow applies.

Working directory: /tmp/eaw-tip-p03-df48iZ/runs/b1-candidate-s2-2/app. Readable Git status exists, with fixture files already staged as additions; preserve that baseline and unrelated staged/untracked work. Do not require a clean tree or a commit. Inspect staged, unstaged and untracked scoped changes before and after execution; exclude workflow YAML contents from shell reads/diffs. Read managed state through scenario MCP only. Missing Git/runner capability blocks execution; do not initialize Git or install anything.

Evidence: cli.mjs:2-4 owns help/unknown-command dispatch and has no data commands. test.mjs:1-4 imports runCli and asserts exact help stdout/status. test-process.mjs:6-27 owns actual child processes, temporary file descriptors, captured streams, status/signal and cleanup. package.json:2-5 declares Node ESM and the installed test command. Preserve this helper and command unchanged. Existing AGENTS.md instructions govern the fixture. Node's installed runtime is the execution target in this fixture; no additional OS/version support matrix is approved. Do not claim checks on other environments.

## Scope and prerequisites

Outcome: reusable validated records and validate CLI output (B1-001/002/004; B1-003 empty validate case). No prior implementation packet. Later explicit authorization for B1-P1 is required. Allowed production writes: records.mjs (new), cli.mjs. Allowed test writes: test.mjs; temporary input fixtures under .tmp with cleanup. Planning progress writes: this packet outside frozen sections, todo.md and current handoff.md. Preserve package.json, test-process.mjs, spec.md, unrelated.txt and unrelated fixture content. Summarize is reserved for B1-P2.

## Acceptance and test-first sequence

1. Create subprocess tests in test.mjs before production changes. Use existing runCli(['validate', file], { env }) for real child processes, with node:fs temporary byte files and finally cleanup. Preserve existing help test and extend compatibility checks to exact stderr and signal as well. Use status 0, signal null, empty stderr and exact compact JSON plus LF for success; invalid cases assert status 2, signal null, stdout '' and stderr 'INVALID_INPUT\\n'. The assertions are actual stream strings, never reconstructed imports/mocks.
2. Valid corpus (B1-001/002): empty bytes -> [] (B1-003); 'a,0' -> [{id:'a',amount:0}]; 'A_-9,0007\\nb,9007199254740991\\n' -> both records in order with numeric amounts 7 and Number.MAX_SAFE_INTEGER; accept the same valid rows without a final LF. Encode expected stdout with JSON.stringify(expected) + LF and compare the entire stream.
3. Invalid corpus (B1-002): missing/extra comma, empty ID/amount, spaces in ID or amount, CRLF, interior blank row, two trailing LFs, negative/plus/decimal/exponent/non-ASCII digits, amount 9007199254740992, duplicate IDs with different amounts, illegal ID punctuation, invalid UTF-8 bytes, BOM before a row. Place a valid row before malformed/duplicate final rows to expose partial output. Run all cases as files, asserting exact failure tuple. Repeat separate valid invocations using the same ID to verify uniqueness state does not leak between runs. Unknown commands retain status 2, UNKNOWN_COMMAND plus LF, empty stdout and null signal; help retains original bytes/status and empty stderr/null signal.
4. Run `rtk proxy npm test` before implementing. Current CLI should fail relevant validate output/status assertions because it emits UNKNOWN_COMMAND; record the observed failure, not an assumed RED. If a harness/import failure prevents intended assertions, repair it and apply PROVE after GREEN.
5. Implement the accepted shared parser and validate path. Repeat focused `rtk proxy node --test --test-isolation=none --test-name-pattern=validate test.mjs` (new tests must include validate in their names), then the full suite. Correct implementation until all correct checks pass.
6. PROVE absence guarantees: temporarily bypass final-row rejection/allow an early stdout write and verify the no-partial-output assertion fails, then restore. Temporarily remove uniqueness checking and verify duplicate case failure, then restore. A direct expected-result assertion that already failed meaningfully in RED needs no redundant mutation. Run the full suite after restoration. Read scoped source to confirm CLI -> records.mjs and no duplicated grammar; this structural check requires a discriminating temporary wiring mutation if encoded as an automated structural assertion.

## Completion and recovery

After implementation, run focused checks and then `rtk proxy npm test` from the working directory. A correct failing check requires an implementation correction, never a weakened assertion. Record actual RED/GREEN/PROVE results and environment limitations in handoff.md; unavailable required checks leave the packet incomplete. Recheck specification_check_state with pinned source_version and planning_packet_check with this packet's exact agreement/digest before completion. Compare the bounded diff against accepted technical sections, preserve unrelated.txt byte-for-byte and baseline attributes, then update only this packet's todo.md status and current handoff.md.

Rollout is a local CLI change only, with no deployment, migration, background service, network, credentials, or persisted data. Privacy: do not print file contents or filesystem stack details for invalid records. Keep diagnostics bounded. Recovery means correcting scoped local changes; rollback only this packet's edits, preserving preexisting/staged work, never a broad reset. Do not commit, install, publish, invoke another workflow, execute the next packet or treat agreement as implementation authorization. Stop at this packet boundary. Any external/irreversible step is outside scope, not a pending manual gate.
## Technical agreement

- packet_id: `B1-P1`
- proposal_id: `B1-P1-shared-parser`
- agreement_ref: `f94a22c4-cbf7-4832-ab7c-09dbebec7b80`, revision 2
- proposal_digest: `2ed31209c955f36952e2aa988715510c1bf72481a8cedeeea9cad8c0b038030a`
- Sources: `docs/specs/b1/tasks/plan.md` / `Shared technical contract`; this packet / `Technical proposal`.
- Provenance: managed question revision 1 and actual native simulated response recorded as revision 2. Acceptance is fixture-only and authorizes no execution.
- planning_packet_check: ready, no issues, exact digest and reviewed versions matched at final planning check. Implementation remains unstarted and requires explicit invocation.
