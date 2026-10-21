# B1-P2 — Summarize through shared validation

## Technical proposal

Proposal B1-P2-shared-consumer covers B1-002, B1-003, B1-004 and regression compatibility B1-001. Depend on completed B1-P1 and plan.md, Shared technical contract. Extend cli.mjs to implement summarize <file> using the exact same records.mjs parseRecords(text) export and file-decoding boundary as validate. Compute {count,total} only from the complete returned array; count is length and total is a zero-initialized sum of amounts. Empty input produces {count:0,total:0}. Keep aggregate logic local to the CLI; no second parsing algorithm, alternate record model, or new public summarize API is needed.

Extend test.mjs with real runCli subprocess cases, reusing the invalid-input corpus for both commands and exact stream/status/signal assertions. Preserve packet 1 checks, help, helper and npm test command. A shared module consumer is the adequate approach because B1-004 requires a single validation contract; duplicated validation would create drift. This packet may not revise the accepted parser contract without returning both affected proposals to planning. Implementation requires a separate explicit invocation.

## Delivery details

## Inputs and execution gates

- source_version: `b2bcc8e86d513972ae604f813b43e61e7b11ee37a0ff41285d5a246d391d884a`
- specification_version: `4b77db1d93030b893e8c9f60f5f9304257569ae2d2c04b515b188e1bccab6007`
- review_ref: `f61a4513-aa51-4915-be31-f3f9675b0b14`

Before bulk implementation reads or edits, reverify the cited repository evidence, call specification_check_state with the pinned source_version, and planning_packet_check with the exact binding below. Require passing reviewed Approved inputs and ready agreement. Use requirement_get with specification_version for the packet-linked IDs; spec.md owns behavior. No profile artifacts are declared, and no product/design workflow applies.

Working directory: /tmp/eaw-tip-p03-df48iZ/runs/b1-candidate-s2-2/app. Readable Git status exists, with fixture files already staged as additions; preserve that baseline and unrelated staged/untracked work. Do not require a clean tree or a commit. Inspect staged, unstaged and untracked scoped changes before and after execution; exclude workflow YAML contents from shell reads/diffs. Read managed state through scenario MCP only. Missing Git/runner capability blocks execution; do not initialize Git or install anything.

Evidence: cli.mjs:2-4 owns help/unknown-command dispatch and has no data commands. test.mjs:1-4 imports runCli and asserts exact help stdout/status. test-process.mjs:6-27 owns actual child processes, temporary file descriptors, captured streams, status/signal and cleanup. package.json:2-5 declares Node ESM and the installed test command. Preserve this helper and command unchanged. Existing AGENTS.md instructions govern the fixture. Node's installed runtime is the execution target in this fixture; no additional OS/version support matrix is approved. Do not claim checks on other environments.

## Scope and prerequisites

Outcome: summarize with the same input contract (B1-002/003/004) and B1-001 compatibility regressions. Depends on completed B1-P1 with shared parser/validate checks passing and actual completion evidence in todo.md and handoff.md. An accepted technical agreement alone does not satisfy that dependency. Later explicit B1-P2 invocation is required. Allowed writes: cli.mjs and test.mjs, temporary input fixtures under .tmp with cleanup, this packet's progress outside frozen sections, todo.md and handoff.md. records.mjs is a consumed contract; changing it requires reconciliation of both affected agreements. Preserve all prior parser/validate checks, package.json, test-process.mjs, unrelated.txt and unrelated work.

## Acceptance and test-first sequence

1. Extend test.mjs before production edits with real runCli(['summarize', file], { env }) tests using cleaned-up temporary files. Success asserts status 0, signal null, empty stderr and exact JSON.stringify({count,total}) plus LF stdout. Empty bytes must yield {count:0,total:0}; 'a,0' yields {count:1,total:0}; 'a,0007\\nb,5\\nc,0\\n' yields {count:3,total:12}, with an equivalent no-final-LF case. A single maximum safe amount yields {count:1,total:9007199254740991}.
2. Run the entire B1-P1 invalid corpus against summarize too (B1-002): status 2, signal null, exact empty stdout and 'INVALID_INPUT\\n' stderr. Include valid-prefix/invalid-last-row and duplicate-last-row cases so a partial total or permissive second parser is detected. Keep all validate/help/unknown-command assertions active. Test multiple records whose individual amounts are safe without imposing an unapproved aggregate input rejection.
3. Run `rtk proxy node --test --test-isolation=none --test-name-pattern=summarize test.mjs` before implementation; name new tests accordingly. Record intended summary assertions failing against the packet-1 CLI. Repair unrelated harness failures and use PROVE if RED never reached an intended assertion.
4. Extend dispatch to consume the shared parser result, count records and sum their amounts before serialization. Do not independently split, filter, normalize or parse input. Run focused checks then `rtk proxy npm test`; correct implementation for every correct failing check.
5. PROVE absence: temporarily emit a total before complete validation (or bypass final-row rejection), confirm the exact empty-stdout/error assertion fails, and restore. Verify shared ownership by source inspection of both dispatch paths calling the same parser; if asserting wiring automatically, temporarily bypass the call and demonstrate that assertion fails. Restore and rerun all tests. Direct summary output assertions with meaningful RED already demonstrate discrimination.

## Completion and recovery

After implementation, run focused checks and then `rtk proxy npm test` from the working directory. A correct failing check requires an implementation correction, never a weakened assertion. Record actual RED/GREEN/PROVE results and environment limitations in handoff.md; unavailable required checks leave the packet incomplete. Recheck specification_check_state with pinned source_version and planning_packet_check with this packet's exact agreement/digest before completion. Compare the bounded diff against accepted technical sections, preserve unrelated.txt byte-for-byte and baseline attributes, then update only this packet's todo.md status and current handoff.md.

Rollout is a local CLI change only, with no deployment, migration, background service, network, credentials, or persisted data. Privacy: do not print file contents or filesystem stack details for invalid records. Keep diagnostics bounded. Recovery means correcting scoped local changes; rollback only this packet's edits, preserving preexisting/staged work, never a broad reset. Do not commit, install, publish, invoke another workflow, execute the next packet or treat agreement as implementation authorization. Stop at this packet boundary. Any external/irreversible step is outside scope, not a pending manual gate.
## Technical agreement

- packet_id: `B1-P2`
- proposal_id: `B1-P2-shared-consumer`
- agreement_ref: `f94a22c4-cbf7-4832-ab7c-09dbebec7b80`, revision 2
- proposal_digest: `aeeb9d19ed43a27325a233d1ad37d1d07353fad9feb2a4383df27a15bb076700`
- Sources: `docs/specs/b1/tasks/plan.md` / `Shared technical contract`; this packet / `Technical proposal`.
- Provenance: managed question revision 1 and actual native simulated response recorded as revision 2. Acceptance is fixture-only and authorizes no execution.
- planning_packet_check: ready, no issues, exact digest and reviewed versions matched at final planning check. Execution remains pending B1-P1 completion and explicit invocation.
