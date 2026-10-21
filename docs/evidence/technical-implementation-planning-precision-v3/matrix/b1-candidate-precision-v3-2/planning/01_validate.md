# Packet 01: shared validation and validate

Packet ID: b1-01-validate. Requirements: B1-001, B1-002, B1-003 (empty validate), B1-004.

## Technical proposal

Adopt `docs/specs/b1/tasks/plan.md` section `Shared validation contract` exactly. Implement exported `parseRecords(bytes)` in new `records.mjs` and add `validate <file>` routing in existing `cli.mjs`. `validate` reads the full input, invokes that parser, then serializes its ordered Number-valued records using JSON.stringify and one LF. Empty input emits `[]\n`. The CLI owns filesystem access, diagnostics and exit status; parser owns every row validation rule. Preserve help and unknown routing. No summarize behavior is implemented in this packet. Functions suffice; no classes or dependencies are needed. Private helpers remain flexible.

Tests use real CLI subprocesses through unchanged `test-process.mjs` runCli(args, { env }); extend `test.mjs`, preserve its existing assertion and exact npm test command. Success/error assertions cover exact stdout/stderr, status and null signal. The complete-input boundary must prevent a valid prefix from leaking on late failure. Requirements and authoritative sections: B1-001, B1-002, B1-003, B1-004 in `docs/specs/b1/spec.md`.

## Technical agreement

Selected proposal_id: b1-01-shared-parser; packet_id: b1-01-validate.
agreement_ref: {"id":"f0ad9771-dd7f-42c3-8cb8-db65ce88517d","revision":2}.
proposal_digest: 31b9b639ff00688bf12e064a0be483606ff15f50c521a784f30a651e56549d2a.
Sources: this file, heading `Technical proposal`; tasks/plan.md, heading `Shared validation contract`.
Provenance: managed question/answer f0ad9771-dd7f-42c3-8cb8-db65ce88517d, revisions 1/2; native frozen simulated respondent selected both proposals. planning_packet_check: ready, issues []. This is technical planning agreement only. Execution is not authorized; packet 02 also awaits completed packet 01.

## Execution details

### Inputs and execution gates

Frozen SIMULATION; Approved spec and confirmed Standard/core scope. Completeness check: pass, reviewed. Pinned inputs:

```text
source_version: da99f1c8f59662d354c8b3dacb99195154570a1cec88906e26ce23c178e88496
specification_version: c1bdb1c7c8031493f0b3874497844574d7df65fda7f4306307163b5f7b6f2877
review_ref: 49ae2b90-6cb1-4f0d-87fd-31003edd8fe5
```

Working directory: application root $TRIAL_ROOT/runs/b1-candidate-precision-v3-2/app. Installed dependency-free Node and npm are the runners; do not install anything. Exact existing command: `rtk proxy npm test` (package.json:4-5 uses `node --test --test-isolation=none test.mjs`). Do not change this command. Before execution, obtain explicit authorization for this specific packet; this plan and the simulated answer do not supply it. Open b1 through MCP, run specification_check_state with the pinned source_version and planning_packet_check with this packet's exact agreement/digest before bulk implementation reads and again before completion. Changed inputs or commitments return affected work to its owner.

Planning-baseline evidence: cli.mjs:2-4 has only help and unknown-command routing, no validator; packet 02 must instead find verified packet 01 additions when rechecking; test.mjs:3-4 uses runCli and asserts existing exact help; test-process.mjs:6-25 owns real subprocess execution, file-descriptor stream capture and cleanup. Preserve that helper byte-for-byte, including actual status/signal and file-based stream capture. Preserve existing exact assertions, never replace CLI tests with imports/mocks. Git status is readable and initial fixture files are staged additions; a clean tree or commit is not required. Read status and scoped staged/unstaged/untracked changes before work; preserve existing staged content and unrelated.txt exactly. Exclude workflow YAML contents from shell searches/diffs and use scenario MCP for their state.

### Test-first method and completion

Create behavior tests in test.mjs before implementation and run `rtk proxy npm test`; record which intended assertions fail, then implement and rerun until correct assertions pass. Do not weaken correct checks. All CLI assertions must use existing runCli with real temporary input files beneath app/.tmp; write raw bytes for decoding tests, clean up fixtures in finally. For every result assert status, signal === null, exact stdout and exact stderr. Success means status 0 and stderr ''; failure means status 2, stdout '' and stderr 'INVALID_INPUT\n'. Unknown command retains status 2, stdout '', stderr 'UNKNOWN_COMMAND\n'; help retains its exact stdout and status 0 with stderr ''. Do not merely assert parsed payload shape or nonzero status.

PROVE the affected no-partial-output guarantee by temporarily writing a prefix before late validation, observing that the late-error subprocess test fails on stdout, then restore. For any RED that stops before its intended assertion, apply an equivalent focused mutation after GREEN and restore. Direct output assertions that failed meaningfully during RED need no extra mutation. Record every required mutation result. Run the full existing `rtk proxy npm test` after restoring. A required failed/unavailable check leaves this packet incomplete.

Review only the scoped diff (including staged and untracked paths, excluding workflow YAML contents), confirm agreement and pinned spec again, record actual RED/GREEN/PROVE and final results in handoff.md, check only this packet's completed items in todo.md, and stop. No automatic next packet, review workflow, commit, install, publication or external action. If checks fail, correct scoped implementation; if scope/behavior is ambiguous, stop affected work and return to specification. Recovery removes only this packet's own changes after inspecting overlap; never reset the staged fixture wholesale.

### Scope and acceptance map

Allowed production paths: new records.mjs and cli.mjs; tests: test.mjs; execution metadata: tasks/todo.md and tasks/handoff.md. Temporary fixtures beneath .tmp are cleaned up. Do not implement summarize, modify package.json/test-process.mjs, change unrelated.txt, or edit approved behavior/scope.

| Requirement | Tests to create before implementation | Expected discriminating result |
| --- | --- | --- |
| B1-001, B1-004 | Existing help test plus exact stderr/signal assertions and unknown-command regression | Help remains exactly `record-report: validate <file> \| summarize <file>\n`; unknown behavior remains unchanged |
| B1-001, B1-002 | validate `a,1\nb-2,0002\nU_3,9007199254740991` and same with terminal LF | Ordered JSON records with numeric amounts 1, 2, 9007199254740991; status 0; no stderr |
| B1-003 | Empty file | Exact `[]\n` |
| B1-002 | Valid zero `a,0`, max safe amount, ids containing each allowed character class; distinct case ids | Correct exact serialized records, no coercion of id |
| B1-002 | Parameterized empty id/amount, missing/extra comma, negative, plus, fraction, exponent, whitespace, Unicode digits, CRLF, unsafe 9007199254740992, internal blank row, two trailing LFs, LF-only, invalid id and BOM | Each fails with exact status/streams; never accepts via permissive conversion or trimming |
| B1-002 | Duplicate id both adjacent and after valid rows; valid prefix followed by malformed final row; invalid UTF-8 bytes after a valid row | No partial stdout; exact failure contract; PROVE as above |
| B1-001, B1-002 | Missing/unreadable input file | Exact input acquisition failure diagnostic, no raw exception or partial output |

Successful validate serialization is JSON.stringify of expected ordered objects plus LF; retain exact stream comparisons. Check digit-only leading zeros remain accepted, unsafe values remain rejected. No summarize tests that require summarize success belong to this packet. Baseline currently routes validate to UNKNOWN_COMMAND, so the new success and INVALID_INPUT assertions should produce relevant RED failures.

### Rollout and boundary

No data migration or external rollout: local CLI additions only. Packet 01 can be verified independently while summarize still has existing unknown-command behavior. Capture full passing suite and unchanged helper/package/unrelated content evidence for packet 02. No persistent input state, retries, credentials, network or logs; errors disclose only the bounded diagnostic. Filesystem/UTF-8 boundaries are tested on the installed fixture runtime. The spec defines no additional OS/version matrix; do not invent support claims or treat local checks as cross-platform evidence.

