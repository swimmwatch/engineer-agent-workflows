# b2-01: Expand timeout range

## Technical proposal

Proposal ID: b2-timeout-existing-boundary. Packet ID: b2-01. Covers B2-001, B2-002, B2-003 and B2-004 in docs/specs/b2/spec.md, headings B2-001 through B2-004. These are the authoritative behavior definitions.

Keep the binding export parseTimeout(raw) in configuration.mjs as the synchronous, stateless configuration validator. Its inputs are undefined or TIMEOUT_SECONDS strings; undefined returns 5000. ASCII decimal digit strings representing integers 1..60 inclusive, with leading zeroes accepted, return the numeric seconds multiplied by 1000. All specified invalid strings throw Error with message INVALID_TIMEOUT. Keep the existing digit validation and numeric range algorithm; extend its upper bound from 10 to 60. No classes, modules, dependencies or public signatures are added. Private local names and equivalent statement organization remain flexible.

cli.mjs remains the environment/stream adapter and depends on configuration.mjs. It reads TIMEOUT_SECONDS once per process, calls parseTimeout and writes the existing JSON object with timeoutMs and format:'json', followed by newline. Success exits 0 with empty stderr; errors exit 2 with empty stdout and exactly INVALID_TIMEOUT followed by newline on stderr. No application state, timers, retries or cleanup are introduced.

Add behavior tests in test.mjs using node:test and node:assert/strict. Keep existing regression coverage. Test undefined, the accepted interval including leading zeroes, and invalid classes at the function boundary. Real CLI assertions must use the existing runCli(args, { env }) export from test-process.mjs and assert actual status, signal and exact stdout/stderr. Preserve that helper and package.json's node --test --test-isolation=none test.mjs command; do not substitute imports or mocks for subprocess checks. Test the new range before modifying production behavior; correct implementation rather than weakening correct checks. Apply discriminating mutations where absence assertions require proof.

Implementation writes are bounded to configuration.mjs and test.mjs plus this packet's progress, todo.md and current handoff.md. Preserve cli.mjs, test-process.mjs, package.json and unrelated fixture content, especially unrelated.txt, exactly. No installation, commit, publication, external service or global configuration change. This local adjustment is the only adequate approach needed: a new abstraction adds coordination without an additional responsibility.

## Technical agreement

Selected proposal_id: b2-timeout-existing-boundary; packet_id: b2-01.
Source: docs/specs/b2/tasks/01_timeout-range.md, exact heading Technical proposal.
proposal_digest: daab49321a7152228c2d10b1834306f99bfa51a865a021bd0da7634a9323aa0d.
agreement_ref: {id: 8c6f969d-fc26-4ca4-afd1-30f2b0c8f798, revision: 2}.
Managed question revision 1 and answer revision 2 preserve the native frozen simulated respondent outcome. No implementation authorization is implied. Final planning_packet_check returned ready with no issues for this exact agreement/digest. Final specification_check_state returned pass, approved and reviewed with the pinned versions unchanged. Implementation remains unexecuted and requires a separate explicit invocation.

## Inputs and prerequisites

Approved source: docs/specs/b2/spec.md, B2-001 through B2-004 only.
source_version: 8fd22d8e1bc4855333c95f4a2db4879f0f51f6e0c6e751146948bb603e79cc65.
specification_version: 4f85f3b995a54ce1e1fdbf8de5895c3b8c9cea70c58f9119a7ea8325efe35862.
review_ref: bb488a12-129f-4315-8d22-bd0319d0cad4.
Initial specification_check_state: pass, reviewed, approved; approval checkpoint absent, tool assigns no approval. Confirmed manifest: lite, core active, no profile or root design outputs. Standalone task, no product link or packet dependencies.

Re-verify evidence before execution: configuration.mjs:1 export; :2 default; :3 digit/range validation capped at 10; :4 conversion. cli.mjs:2-4 adapter and error streams. test.mjs:1-4 existing function regression. test-process.mjs:6-26 runCli uses real child process, file-descriptor capture, 5000 ms harness timeout and finally cleanup. package.json:5 owns the installed single-file test driver. No change to harness lifecycle is needed.

Require a separate explicit implementation invocation, readable Git status including staged/untracked work, and existing Node/npm runners. Initial Git status is readable and contains staged fixture additions; preserve them without resetting or committing. Check pinned spec and agreement before bulk implementation reads/edits and again before completion. Missing runners/checks block completion; no installation is authorized. Prefix shell commands with rtk proxy. Working directory for all commands: application root.

## Test-first delivery and acceptance

1. Capture current scoped Git status/diff and preservation hashes; preserve pre-existing work. Inspect only packet inputs. Never shell-read/diff workflow YAML or immutable review archives; use scenario MCP. Read exact requirements with specification_version as requirement_get source_version.
2. Add tests in test.mjs before production edits. Function assertions: undefined -> 5000 (B2-001); every decimal string 1..60 and zero-prefixed forms -> seconds * 1000 (B2-002). Include explicit 1, 10, 11, 59, 60, '0001', '0060'. Invalid cases (B2-003): '0', '00', '61', '0061', a very large digit string, '1.5', '+1', '-1', ' 1', '1 ', '\t1', '1\n', '', 'abc', '1e1', and non-ASCII digits. Assert Error and exact message INVALID_TIMEOUT.
3. Add real CLI checks via runCli([], {env:{TIMEOUT_SECONDS: raw}}). For default, supply TIMEOUT_SECONDS: undefined so the child does not inherit a host timeout. For default, '1', '10', '11', '60', '0060', assert status 0, signal null, stderr exactly empty and stdout exactly JSON.stringify({timeoutMs: expected, format:'json'}) plus '\n'. For each invalid string above, assert status 2, signal null, stdout exactly empty, stderr exactly 'INVALID_TIMEOUT\n'. This covers B2-001 through B2-003 at the environment/process boundary; no mocks or import replacement.
4. Run `rtk proxy npm test` before changing configuration.mjs. Record relevant RED: the new function and subprocess cases for 11/60 fail against the current 10-second limit. Repair a harness failure before treating RED as behavioral evidence. Existing invalid/default cases are compatibility checks, not expected failures.
5. Extend the existing bound to 60 in configuration.mjs, retaining validation/default/conversion/error behavior. Run `rtk proxy npm test`; correct implementation until all correct tests pass. Never weaken a correct assertion to obtain green.
6. PROVE the CLI absence assertion by temporarily making the error path emit a stdout marker in cli.mjs; run `rtk proxy npm test`, confirm the exact empty-stdout assertion fails, restore cli.mjs byte-for-byte, and rerun green. This temporary mutation is verification only, never a retained production change. Direct new-range output tests with relevant RED need no extra mutation. Unchanged baseline guarantees need ordinary regression evidence.
7. Final verification: `rtk proxy npm test`; `rtk proxy sha256sum unrelated.txt`; readable scoped Git status/diff excluding workflow YAML and review archives. Compare with initial fixture state, allowing only configuration.mjs, test.mjs and packet progress/checklist/handoff changes. Preserve helper and runner exactly. B2-004 preservation hash for unrelated.txt: 66d58c226b7ae1af545c81f3d91e17b0d75f0e91fd9e77b3d4416cd9822ded19. Recheck specification and exact technical agreement through MCP. Record actual RED/GREEN/PROVE results, update the sole checklist and current handoff, and stop after b2-01. Any failed or unavailable required check leaves completion pending.

## Applicability and recovery

Target is the supplied isolated dependency-free Node.js fixture and installed driver; no broader OS/runtime support matrix is asserted by the frozen spec. Execution evidence must come from this environment; no tests were run during planning. No migrations, persistent state, deployment, external rollout, security/privacy surface, UI/accessibility, distributed coordination or observability change is warranted. Local rollout is the scoped source update after passing checks; recovery restores only this packet's edits from its pre-edit state, preserving staged fixture content. No reset, commit, installation or external action. Durable developer documentation is unwarranted: this localized range adjustment introduces no vocabulary or multi-layer operational rule meeting the documentation threshold. No extra documentation packet.

## Implementation progress

Completed b2-01 under the explicit simulation invocation. Manual verification passed; Git reported true; runners were Node v24.20.0 and npm 11.19.0. Existing staged fixture additions, untracked task bundle and managed planning history were preserved.

RED: added tests before production edits. `rtk proxy npm test` exited 1: function values 11..60 and their zero-prefixed forms threw INVALID_TIMEOUT; real CLI '11', '60', '0060' returned status 2 instead of 0. Default, existing range and invalid cases passed. GREEN: changed only configuration.mjs:3 upper bound from 10 to 60; all 161 tests passed, exit 0.

PROVE: temporarily emitted 'PROVE_MARKER\n' on CLI error stdout. `rtk proxy npm test` exited 1 with exactly 17 failures at the empty-stdout assertion (actual marker, expected empty). Restored cli.mjs byte-for-byte; final rerun passed all 161 tests, exit 0. No assertions were weakened.

Scoped diff matches the agreed signature, ownership and validation algorithm. Retained writes are configuration.mjs, test.mjs and packet progress/checklist/handoff only. CLI, helper, runner package and unrelated.txt hashes matched their initial values. Scoped Git whitespace check passed. Final specification_check_state returned pass, approved/reviewed with pinned versions unchanged; exact planning_packet_check returned ready with no issues. See current handoff for hashes and evidence limits. No next packet or further workflow was launched.
