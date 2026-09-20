# Adaptive Workflow Loop Evidence

Status: Resumed by explicit user request on 2026-09-05 after preserving the
pause checkpoint. This document does not establish release or complete host
compatibility. Packet 10 and real-profile changes remain outside this work.

## Confirmed Procedure

Specification and planning are authored in fresh strong-model contexts; each
actual implementation packet is executed in another fresh context. Codex uses
Sol, Terra, then an external Sol review; Astra handles difficult or disputed
cases. Claude uses Opus, Sonnet, then an external Opus review. Review is a
separate trial evaluation and never an incremental completion/transition gate.

The fixed matrix contains five Codex cases and Lite/UI-API Claude cases. Two
unchanged full passes plus two new Codex holdouts are required. Synthetic
customer data is explicitly scoped to temporary fixtures. Model sessions are
opt-in and do not run in `npm test` or CI. Exact generated skill paths are
provided on every initial and resumed stage; unrelated history and global
skills are not permitted sources.

The registry and adversarial cases live in `tests/fixtures/workflow-loop/`.
`scripts/verify-workflow-evidence.mjs` checks consistency of captured references,
stage identities, ordering, profile reads, packet boundaries, final checks and
matrix coverage. Its result explicitly reports `behaviorCertified: false`:
synthetic or self-attested traces cannot establish actual agent behavior.
The CLI also hashes captured files. Model roles are checked against independent
trial policy, including Astra escalation. Each implementation invocation has a
distinct session identity. Packet evidence explicitly lists required PROVE
checks and records a discriminating mutation followed by restored GREEN.
Whether that list is sufficient still requires inspection of actual contracts,
checks and native traces.

The operator selects the report root. References below it cannot escape or use
symbolic links. Regular files are hashed through a single descriptor opened
without following final symlinks where supported. Captured trees must be
quiescent: this offline checker is not an isolation boundary against concurrent
ancestor-directory replacement. Malformed-input errors do not repeat contents.

## Baseline And Corrections

| Observation | Correction | Evidence state |
| --- | --- | --- |
| The transition fixture made starting the next packet depend on commit permission. | Separate execution authorization/dependencies from optional review and commit; update the shared packet contract and incremental workflow. | Targeted RED: 6/8; subsequent focused suite: 27/27. |
| A Lite CLI whitespace change proposed `core/contracts.yaml` without a machine-validation or shared-consumer need. | User confirmed inline contracts for this case; registry entries now explicitly name candidates rather than mandatory outputs. | Native initial-stage observation; fresh reruns pending. |
| A fresh resume omitted the exact skill source and consulted unrelated historical instructions. | Reject that trial; bind every resumed prompt to its generated source and allowed fixture roots. | Invalid evaluator trial, not a skill defect; private raw content is not published. |
| The first consistency-checker implementation accidentally reintroduced review/commit gates. | Add a failing two-packet regression and remove those gates; keep evaluation review separate. | Corrected synthetic verifier tests pass; this is not model behavior evidence. |

Further independent review found same-invocation packet transitions, a
self-declared reviewer policy, unbound source checksums and missing PROVE
validation in the checker. Each was reproduced by failing tests before its
correction. Security audit also produced a RED/GREEN diagnostic-canary test.

The latest complete repository suite passed 161/161 before the final
paused-packet regression and correction. The subsequent captured-artifact and
workflow-evidence suites passed 22/22. The full suite was not rerun after that
correction. These are deterministic code checks, not credits toward the model
matrix. No new trial or product validation was started after the user pause.

## Frozen Candidate

Candidate V2 contains regenerated host artifacts after the inline-contract
correction. Its reproducible SHA-256 covers 135 regular files below `plugins/`:
sort relative paths by JavaScript string order, then hash each UTF-8 path, one
NUL byte, file bytes, and one NUL byte. Timestamps and absolute paths do not
participate. The earlier unqualified checksum label is not used as byte evidence.

```text
396dd42eb15a70d697db83de81d9a38198cb3f50a487d11dd51cad42e1ef693a
```

Local client preflights: Codex CLI 0.153.2 and Claude Code 2.1.260 accepted
isolated no-tool model requests. These are preflight results, not workflow
acceptance. Paused model trials used this frozen candidate; no stable pass is
credited yet.

## Observed Trial State

| Trial | Observed outcome | Acceptance status |
| --- | --- | --- |
| Claude Lite | Opus specification/plan, Sonnet implementation, 13/13 tests and RED/GREEN/PROVE; separate Opus review reported no findings. | One successful case attempt, not a full matrix pass. |
| Codex Lite | Sol specification/plan and Terra implementation; repeated review/runner disagreements remain. The platform-line-ending requirement also conflicts with the observed baseline behavior. | Unstable and paused; no further correction authorized by a presumed answer. |
| Codex backend | Four Terra packet invocations completed; separate review and Astra adjudication confirmed private-collection and shared-mutable-error contract defects. | No scenario pass. Next-packet invocation without review or commit was observed. A high-severity tenant bypass was not established. |
| Codex UI/API | Sol specification/plan completed; Terra left its packet incomplete when local HTTP binding failed with EPERM. | Required checks failed due to environment; no E2E pass. |
| Claude UI/API | Approved specification and six-packet plan; Sonnet Packet 01 was interrupted at the user pause, exit 130. | Incomplete; no scenario pass. |
| Codex Deep | Stopped during the interview with events, data, operations and security profiles. Detailed fixture answers were created during the trial instead of frozen beforehand. | Incomplete and ineligible for stable-pass credit under the agreed method. |
| Codex Lite holdout | Approved specification and completed planning checkpoint. | Implementation and review were not started. |
| Remaining matrix | Standard UI, second complete passes and the UI/API holdout were not run. | Zero complete stable passes. |

Node child-process restrictions were reproduced before implementation. The user
authorized equivalent direct shell CLI checks with identical stdout, stderr and
exit assertions, preserving the sandbox; earlier EPERM results remain failed.
The user separately authorized local-only HTTP for temporary fixtures through
invocation parameters, without global client-setting changes. Local-only HTTP
enforcement for model-issued Codex commands is not yet qualified. A direct
sandbox smoke test does not substitute for a model trial. No unrestricted
network or sandbox bypass was used to claim a passing trial.

## Pause And Recovery

The private durable checkpoint location is recorded in the
[current handoff](../specs/cross-client-skill-distribution/tasks/handoff.md).
Original temporary artifacts were copied rather than removed. Raw traces,
including rejected evaluator attempts, must not be published or treated as
accepted evidence without inspection.

On resume, the user answered both previously pending choices: unchanged Lite
baseline constraints retain ordinary checks without mandatory extra mutations,
while PROVE remains risk-driven for new and changed guarantees; the educational
full-matrix CLI fixture may be Linux-only with mandatory direct shell
acceptance alongside `npm test`. The separate configuration holdout and the
skills remain portable. Both answers are in `decisions.yaml`.

On resume, predeclare fixture answers, keep evaluator snapshot tests outside
application test discovery, and distinguish reviewer sandbox failures from
product defects. Ephemeral Codex runs cannot be called native resumed sessions;
continuation from durable files is a fresh cold-context invocation.

## Resumed V3 Candidate

Before new instruction changes, the full repository suite passed 162/162.
Reproducible model scenarios were recorded in
`tests/fixtures/workflow-loop/rule-regressions.json` before correcting the
observed baseline-assumption, excessive baseline-PROVE and weakened-runner
rules. These scenarios are not automatic or synthetic proof of model behavior.

V3 adds proportionate PROVE, evidence for preserved behavior, safe observation
surfaces, and runner equivalence that preserves real CLI/HTTP/browser evidence.
Planning wording no longer suggests mandatory review gates. Both bundles were
regenerated, and focused specification/planning/incremental/manual checks
passed. Independent review and fresh forward testing remain in progress.

V3 uses the same 135-file digest recipe as V2:

```text
eff71d234ebef50d726002f73b08a2cb2995fba3cc2aee0bbf333813a3360dd2
```

No complete stable matrix pass is credited. New trial files use persistent
private workspaces so restart does not remove their evidence; the previous
checkpoint remains immutable.

## Latest Resumed Results

The full repository suite passed 162/162 after the V3 instruction changes and
final fixture-protocol correction. Foundation validation passed for 15 skills;
generation checks, affected generated Codex skill validation, YAML parsing and
whitespace checks also passed. Separate read-only Sol review of the V2-to-V3
rules reported no actionable findings and ran 54/54 focused checks. These
results supersede the historical pre-pause validation state above; they do not
count toward model-matrix acceptance.

The focused Linux Lite regression completed a fresh native Sol specification,
Sol plan, Terra implementation and separate Sol review. Native headers establish
all four model identities. The trace records test changes, assertion RED,
implementation changes and GREEN in that order. Independent verification in a
read-only filesystem sandbox without network passed 6/6 application tests and
14/14 real CLI stdout, stderr and exit-status cases. The reviewer changed no
files and reported no actionable code findings. Only the active core profile
references were read. Inline simulation scope confirmation did not exercise
native question delivery. The specification omitted a persistent handoff; its
final message reported state, and planning created its own handoff. This
observation still requires comparison with the intended artifact ownership.

That focused fixture is not the frozen full-matrix CLI fixture. Its results
must not be credited as a full-matrix case or a stable pass. The private report
is `lite-forward/trial.gzWvH7/EVALUATION.md` beneath the resumed V3 run root in
the current handoff.

The separate local-HTTP prerequisite established actual loopback binding and a
direct HTTP 200 inside a native sandbox command. A negative proxy request was
blocked. The sibling host sentinel was hidden and unchanged externally, but an
append to that path inside the sandbox returned success; therefore the explicit
write-denial assertion remains failed. These probes do not certify every
filesystem or egress boundary.

The browser prerequisite remains unavailable. Node and Playwright loaded and
the HTTP server started, but Chrome aborted before keyboard, focus or screenshot
checks. Chromium sandboxing was enabled, with no bypass flag. The host sandbox
helper already had mode 4755 and root ownership, so the observed nested-sandbox
failure does not establish a misconfigured host installation. The actual shell
exit was 2 despite a successful outer model-process exit. No global setting,
browser permission or sandbox control was changed to obtain a pass.

After a conversation interruption, coordinators were resumed after checking for
live processes. Full CLI pass 1 for both hosts and Codex backend pass 1 are being
prepared separately; adversarial results are being reconciled. Zero complete
stable matrix passes remain credited.

## V4 Corrections And Freeze

V3 adversarial checks observed safe non-answer handling, a stale-contract stop,
correction of an invalid test with meaningful RED/GREEN, and an unavailable
required check left incomplete. The stale-contract stop did not checkpoint its
blocker, and the contradictory-test trace did not show a recovery-reference
read. In the incomplete-work case, the actor selected a nonexistent verifier
path relative to the collection instead of the skill and stopped before
recovery. Independently running the existing skill-local verifier succeeded.
The last transition case was interrupted with uncertain native start and no
durable result, so it remains incomplete. Native JSON traces did not expose
actual model identifiers; requested model settings are not promoted to observed
identities. None of these results is a complete product-loop pass.

Before V4 changes, two additional reproducible cases were recorded in
`rule-regressions.json`. The user explicitly resolved handoff ownership:
specification persists its existing artifacts; only planning creates
`handoff.md`. V4 applies that decision to the entrypoint and interview reference,
makes the verifier location relative to each `SKILL.md`, and loads conditional
incremental recovery guidance before handling failures or incomplete work.
Material replanning blockers are checkpointed before stopping affected work.
The wrong verifier selection was observed; ambiguous path wording as its cause
remains a hypothesis to test in a fresh actor, not a proven diagnosis.

Both host bundles were regenerated. The focused suite passed 25/25, the full
suite passed 162/162, foundation and generation checks passed for all 15 skills,
and all three affected generated Codex skills passed quick validation. YAML
parsing and `git diff --check` passed. Separate read-only Sol review found no
actionable issues in the four changed instruction files. Runtime workflow
corrections still need the fresh native repeats.

Frozen V4 covers 135 generated files using the same recipe:

```text
bfc790d898d91fad3764f84896f19bc87dae43eb6d1819b8209e37912dfbde2b
```

Full CLI and backend baselines and hidden checks were prepared before any actor
launch, using the existing pinned Node 24.14.0 runtime without changing global
defaults. Their customer answers and matrix protocol are unchanged. The source
binding was explicitly moved to V4 before their first actors. New adversarial
attempts use separate copies; V3 results and inputs remain untouched. Zero
complete stable matrix passes remain credited.

## V4 Native Outcomes And Next Correction

Fresh V4 Terra safeguards reached stale-contract and incorrect-test handling:
the recovery reference was read, the stale-contract blocker was written to the
handoff, and the corrected test passed independent checks over 21 inputs.
However, incomplete-work recovery and the first packet of the transition case
again selected the nonexistent collection-relative verifier path and stopped
before their intended checks. The actual captured skill text matched V4, so
this was not a stale-source read. The path clarification alone did not resolve
the observed failure. A directly executable command is the next proposed
correction; it has not yet been implemented or frozen as V5.

The corrected backend V4 invocation used CLI 0.153.2 and actual Sol headers.
It received explicit simulated scope confirmation, then read the correct three
profiles before persisting the answered decision and confirmed manifest. The
first profile reads precede the manifest patch in the native trace. The frozen
checkpoint-order check therefore failed; this is not wrong profile selection
and does not require a second manifest-approval question. The stage stopped
with three saved product questions and no Approved specification or plan.
The earlier accidental CLI 0.144.3 launch was excluded as a runner failure;
absolute executable selection was fixed without changing global defaults.

Full CLI V4 remained at specification. Codex confirmed Lite/core and saved a
material character-set question; no Approved specification exists. Claude's
native metadata confirmed Opus, but source reads were denied and every Bash
attempt failed at `apply-seccomp` with a `/proc/self/setgroups` permission
error. Artifacts written without reading the skill cannot establish use of the
generated workflow. No sandbox relaxation or corrective actor continuation
was used. All these attempts and their frozen baselines remain preserved.

The user requested Cloakbrowser MCP for the browser route. Current-session
tool discovery and MCP resources exposed no Cloakbrowser tools. The available
plugin catalog tools did not include plugin search or suggestion, and the
recommended-install list did not contain Cloakbrowser. No installation or
global client configuration was changed. Browser qualification through that
provider remains pending its callable tools becoming available; this is a
fixture tooling choice, not a new required dependency in published skills.

## V5 Correction And Current Qualification

V5 replaces the ineffective prose-only verifier-path clarification with an
executable command in each affected entrypoint, using the same absolute
skill-directory variable for the executable path and its caller argument.
Before that correction, the new executable regression failed all six generated
host/workflow combinations. Afterward, it passes from an unrelated consumer
working directory and rejects that empty consumer as a workflow caller without
writing to it. The shared verifier implementation is unchanged.

The backend checkpoint-order failure is captured in the frozen reproducible
`persist-confirmation-before-profiles` model case. Specification now explicitly
saves the answered decision and confirmed manifest before any profile read,
including on resume. This is not a second approval of the manifest file.
Fresh native trials must establish whether the correction changes behavior.

V5 deterministic validation passed: focused 31/31, complete `npm test` 168/168,
foundation for 15 skills, generation for 15 skills, quick validation of the
three affected generated Codex skills, and `git diff --check`. These results
supersede earlier repository-test counts but provide no stable-matrix credit.

V5 freezes 135 generated files using the established digest recipe:

```text
3503d92ddb80ba81599b225d5494406f7e35a9552f59665e8db0deb8fd8eed19
```

Separate Sol review initially proposed binding a verifier executable to its
containing skill. Contract and baseline inspection disproved the finding:
Packet 02 defines an explicit starting-directory API; root/shared callers
intentionally verify different workflow directories, and the generated verifier
is byte-identical to V4. The reviewer withdrew the finding. V5 supplies the
correct caller in the workflow command; no speculative API change was made.

The fresh V5 Terra incomplete-packet case selected the correct verifier, finished
only packet 01, demonstrated a discriminating mutation failure and restored
GREEN. Independent checks over 21 inputs passed; the unrelated canary and packet
02 remained unchanged. Its private checkpoint is
`adversarial.Wd42jF/case05-qualified.json` beneath the V5 root. The non-Git
fixture also caused an unavailable optional diff command that the actor did not
mention in its final response; this limitation is retained in the case evidence.
Other safeguards and full stages remain in progress, not presumed successful.

## Cloakbrowser Qualification

The server was already configured. The parent task's initial MCP connection
failed before the local server started, leaving its tool catalog without
Cloakbrowser; a fresh coordinator exposed the existing provider without
installation, restart or global configuration changes. A data-page smoke first
confirmed keyboard, focus, click and screenshot capabilities.

The subsequent real HTTP smoke passed through the existing Cloakbrowser MCP.
A host-owned fixture opened a listener only on loopback and passed that socket
into a protected service in a separate network namespace with no routes.
Nonlocal connection failed with `ENETUNREACH`; root/fixture writes failed with
`EROFS`; a host-only sentinel was unreadable. The fixture used scoped read-only
runtime and content mounts. These are measured fixture boundaries, not a claim
about every native model-issued command.

The browser loaded the real page, typed a value, moved focus with Tab and saved
with Enter and a separate click. Two actual POSTs and a state GET returned HTTP
200; server state and rendered count agreed at two. All four captured resource
requests succeeded and the console contained no errors. The test-owned tab was
closed, the validated fixture process stopped and its port no longer listened.
The private report is `cloakbrowser-http-smoke.m7Qeh6/report.md` beneath V4.

This establishes a usable protected HTTP/browser prerequisite. It does not
establish a full UI/API scenario, native actor browser verification, persistence,
or Claude execution. Fresh V5 full backend and UI/API preparations use frozen
realistic inputs; their actual outcomes remain pending. Zero complete stable
matrix passes are credited.


## V5 Claude Capability Recheck

A fresh native Opus read-only preflight used an invocation-scoped source
directory grant and successfully read the complete generated specification
skill. The two Bash probes still failed before execution: working-directory
and pinned Node-version commands each returned tool exit 1 at
`apply-seccomp` with a denied `/proc/self/setgroups` write. The outer native
exit 0 is not a passing command. Before/after fixture file hashes matched.

The private report is `full-matrix-cli-pass1.KAa5mc/CLAUDE-PREFLIGHT.md`
beneath V5. The actor's explanation blaming RTK for namespace creation was
not independently established and is not adopted. An
[upstream reproduction](https://github.com/anthropics/claude-code/issues/81799)
reports this error in native Unix-socket filtering; its broad socket exception
was not applied. Source access is now qualified, but Claude execution remains
unverified. No sandbox bypass or global setting change was made.

## V6 Git Prerequisite And Fixture Revision

The full V5 CLI chain reached an Approved specification and a one-packet plan.
Terra then stopped before implementation because the fixture was not a Git
worktree. The user explicitly chose to require Git rather than support
snapshot-only implementation. This is now an explicit workflow prerequisite,
not a failure to repair by bypassing the Git check.

V6 adds the executable Git worktree preflight to incremental and the prerequisite
to the shared packet contract. It requires inspection of tracked, staged and
untracked changes, but no clean tree, existing commit, review or commit authority.
A missing/bare/unusable worktree blocks implementation; the workflow does not
initialize Git or substitute snapshots. Specification remains standalone.

Two executable host tests first failed 0/2 before the rule change, then passed
for non-Git, bare, initialized zero-commit and untracked-file states. Focused
checks passed 24/24, the full `npm test` passed 170/170 on Node 24.14.0,
foundation/generation validated 15 skills, all three affected generated Codex
skills passed quick validation and whitespace checks passed. A separate Sol
review found no actionable issue; model behavior remains a separate check.

Frozen V6 covers 135 generated files:

```text
5371e2818317ffc2da25526996d8d9d69b5211fb6f821772f57238a9aebbf279
```

The current handoff locates its private `CANDIDATE.json`, subsequent
`FIXTURES.json` and captured full-test logs. New implementation fixtures start
as isolated Git worktrees; an initial staged baseline permits scoped diffs
without creating commits. Preserved V5 actor workspaces are not retrofitted.

The V5 adversarial audit observed all six safeguards in eight fresh contexts,
including a successful separately authorized second packet. It retains all
failed extra Git/reference commands and the required missing-runtime failure;
outer exit 0 was not promoted to a passing unavailable check. Backend confirmed
the corrected persist-before-profile-read ordering, then remained incomplete
at unavailable HTTP. UI/API stopped after three specification contexts with
a saved product question. None is a complete stable matrix pass.

Deep fixture preparation exposed a distinct runtime-corruption observation gap:
invalid startup state does not demonstrate a running replay's source-integrity
error. The user approved a closed test-only process channel. Its exact contract
is now in `customer-answers.json`: explicit environment opt-in and inherited
private IPC, corruption of the real replay-source record and durable bytes
before ordinary selection/validation, no public HTTP control, no fake response
or validation bypass. Startup-corruption checks remain separate. The change
affects frozen fixture conditions, not published skill dependencies.

### V6 Native Git Pair

Two fresh native Terra contexts verified the Git prerequisite against identical
original packet inputs. Without Git, only the blocker handoff changed; the actor
did not initialize Git, change source/tests, or start the next packet. With an
initialized worktree and zero commits, the actor completed the authorized
packet despite the staged baseline and unrelated untracked work. Actual
RED/GREEN/PROVE and an independent passing test were captured. The original
implementation bytes were restored after PROVE; the index, canaries and next
packet were preserved. Neither HEAD, review nor commit became a gate.

The private report is `git-preflight-pair.NRU9BU/REPORT.md` beneath V6. Both
native headers identify Terra and CLI 0.153.2. This is focused safeguard
evidence, not a full product-loop or stable-matrix pass.

### HTTP And Native Browser Qualification

The backend 502 was independently reproduced with a server and client in one
native Node command. The server bound loopback, but Codex's network
proxy could not reach that namespace's ephemeral port and returned synthetic
`502 upstream failure`. The application did not emit that response. Combining
tool calls or replacing the HTTP client is therefore not a demonstrated fix.
The private diagnosis is `http502-diagnosis.Ey2xIg/DIAGNOSIS.md` beneath V6.

A fresh native Terra context reached the existing Cloakbrowser MCP, but creating
a browser tab was rejected because the call required approval while the native
invocation used `approval_policy=never`. No tab or screenshot was created.
Direct loopback HTTP failed; the configured proxy returned the exact fixture
JSON with HTTP 200, confirmed by the service's single recorded request. The
owned server stopped and its port closed. The private report is
`native-cloakbrowser-qualification.zPCGU6/REPORT.md` beneath V6. This failed
browser qualification is distinct from the successful coordinator browser
smoke. No global setting or approval policy was changed for that probe.

The later routing qualification isolated Node 24's environment-proxy behavior.
A fresh native Terra command using exact `NO_PROXY` and `no_proxy` values
`localhost,127.0.0.1` returned the application's HTTP 209 and exact
`same-process-ok` body. Managed proxy, loopback allow rules, upstream prohibition,
`allow_local_binding=false` and the native filesystem sandbox stayed unchanged.
[Node's built-in proxy documentation](https://nodejs.org/download/release/latest-v24.x/docs/api/http.html#built-in-proxy-support)
describes that destination-specific routing. The private report is
`HTTP-TOPOLOGY-QUALIFICATION.md` beneath V6. The exact final runner must qualify
the same probe before backend or Deep implementation; wildcard bypass, disabled
proxy, global settings and unsandboxed command relays are not substitutes.

The existing native CLI also accepts invocation-scoped per-tool MCP approval
configuration, documented in the
[Codex MCP reference](https://learn.chatgpt.com/docs/extend/mcp).
The typed parser accepts `approval_mode="approve"` and rejects the invalid
value `allow` at the exact tool path. The private
`mcp-approval-investigation/REPORT.md` records that parser check. A tool grant
applies to the entire tool, not just a particular argument or fixture tab;
parser acceptance alone is not native dispatch evidence.

The subsequent frozen three-tool smoke passed in an actual fresh Terra context:
diagnostic, new fixture tab, saved accessibility snapshot and owned-tab closure
all completed through native MCP dispatch. Only those three tools received
invocation-specific approval; the server default remained prompt, top-level
approval remained never and the existing native permissions were unchanged.
The service independently recorded one fixture GET with HTTP 200, and its
filesystem/egress boundary probes passed. The snapshot was produced by the
native tool. Tab identity/close-result detail comes from the actor's final,
corroborated by dispatch completions, snapshot and HTTP log; the native text log
does not retain every structured argument/result. Exact PID identity was checked
before stopping the service, and PID/port absence was confirmed afterward.
See V6 `native-mcp-approval-smoke.GEc4NW/REPORT.md`. No keyboard, zoom or full
UI acceptance is claimed by this smoke, and native command-network permissions
are not represented as controls on the separate MCP browser's destinations.

### V6 Full-Case Preparation And Progress

The Deep starter and private evaluator are frozen against V6 and the approved
process-only corruption contract. Baseline npm, real HTTP/restart and actual
IPC/SIGKILL prerequisites passed 3/3. The intentionally absent features failed
all 24 independent acceptance checks as expected. Future-operation checkpoints
are not yet qualified against an implementation. Preparation processes were
stopped. Its private `PREPARATION.md` remains under V5's
`deep-preparation.hKFqfS/`; it was explicitly rebound before any V6 actor launch,
not promoted from a previous actor outcome.

The V6 full CLI specification reached Approved in two fresh Sol contexts. It
used only the confirmed core profile and persisted the scope before that read.
The character-set decision retains actual conversational-fallback provenance;
this is not evidence of native question-tool delivery. Separate Sol planning
created only the four required Lite planning files and one packet. Fresh Terra
completed that packet after meaningful test-first failures and passing checks;
the index remained unchanged. Independent read-only/no-network verification
passed 13/13 application tests and all 30 real CLI stdout/stderr/status cases.
Separate Sol review found missing process-level prefix-limit/CRLF regression
cases and a double-cleanup path after child-process launch error. It changed no
files. Its own npm check failed on a read-only temporary directory; that failed
command remains distinct from the passed independent evaluator. A fresh Terra
repair of the same authorized packet resolved both findings. A coordinator-side
reproduction of the original cleanup handlers independently produced the actual
`EBADF` failure. Final independent checks passed 14/14 application tests and
30/30 CLI cases; a fresh Sol review found no actionable issue and changed no
files. Git metadata remained unchanged across all seven native contexts.
Because this attempt needed reviewer feedback, it is correction evidence rather
than a clean stable-pass credit. Fresh repetitions remain required. The private
report is `EVALUATION.md` in CLI root
`full-matrix-cli-pass1.PsJ00c/` beneath V6.

Deep specification/planning and the backend chain are assigned separately. The
UI-only starter has baseline Node tests passing 3/3 but still requires real
browser baseline/zoom checks and a pre-actor freeze. No V6 complete stable
matrix pass is credited.

The subsequent UI baseline exercised the real existing filters at desktop and
mobile widths; the new dialog/status behavior was absent as expected. Browser
keyboard zoom commands did not change measured device-pixel ratio, viewport or
visual scale, so actual 200 percent zoom remains unverified. The user explicitly
chose to continue other checks with that limitation retained. This is a
sequencing decision, not a waiver, substituted CSS/viewport test or matrix pass.
No frozen customer requirement or generated skill changed for that decision.


## V7 YAML Checkpoint Validation

Two saved Deep specification checkpoints contained unquoted colon-space text
and failed PyYAML 6.0.2 with `ScannerError`. The user explicitly chose to retain
YAML and require real parser validation rather than substitute JSON syntax.
The missing-parser case remains incomplete and cannot set Approved; the decision
does not authorize dependency installation or global changes.

Before the source correction, both captured malformed scalars reproduced the
parser failure. Correct serialization and reparsing preserved the two exact
scalar values. These executable controls establish the serialization defect,
not successful model behavior. `yaml-checkpoints.json` and the corresponding
rule-regression case preserve the scenario independently of wording tests.

V7 adds the shared structured-state gate in `shared/references/test-discipline.md`
and makes automatic approval explicitly depend on it. The rule applies to saved
task-scoped decisions, manifests and declared YAML planning contracts before a
question, handoff, subsequent consumption or completion. It retains semantic
review, confirmed scope and selective profile loading as independent conditions.
No dependency, verifier API or skill entrypoint was added or changed in V7.

The frozen candidate contains 135 generated files with SHA-256:

```text
8a8c23116a42669399f196a5d4bea2fd4c5e1ea7a55d8a7c90c0ac723b8d4993
```

Its private root is
`.local/state/engineer-agent-workflows/runs/2026-09-05-v7.8YDKim/` under the user's
home. `CANDIDATE.json` records the path/NUL/bytes/NUL digest recipe, source hashes
and six fixture hashes. The frozen and live generated trees and all four scoped
source/fixture files were independently checked against that freeze and matched.

Validation completed with exit 0: generation and foundation for 15 skills,
`generate:check -- --allow-incomplete`, full `npm test` (170/170), quick validation
of the three affected generated Codex skills, parsing the 100-entry decision
ledger with PyYAML 6.0.2, and `git diff --check`. The full npm raw logs and result
record remain alongside the candidate. These do not replace empirical trials.

Independent native `gpt-5.6-sol` read-only review using CLI 0.153.2 found no
actionable V7-introduced issue. Before/after hashes were equal; all eight generated
shared copies matched the source, and host-specific interview rendering stayed
within declared substitutions. Both regression JSON fixtures parsed and the two
malformed YAML samples reproduced `ScannerError`. The reviewer changed no files.
Its evidence is in `rule-review-sol.5cbtJf/`; it did not execute the workflow or
claim model adherence to the new gate.

V6 product runs remain held as historical evidence, not V7 results. CLI required
reviewer-assisted repair; backend completed only PKT-01; Deep never reached
planning. A delivered logging-security requirement missing from the final Deep
specification is undergoing separate Astra adjudication. Unasked recovery details
and an independently corrected fixture-response delivery omission are distinct
from this semantic defect and from the YAML failures.

The fresh V7 parser-gate trial completed only `specification-01` before the new
MCP-only design boundary below. Native Sol parsed actual saved decisions and
manifest bytes before the only active core-profile read, then reparsed changed
state before yielding its pending product question. Independent parsing also
passed; the question remained `needs_user`, with no specification or Approved
status. Git baseline and unrelated canary were preserved. The pre-frozen
colon-space reply was not delivered: answer serialization and the final
pre-Approved gate remain unverified. See
`yaml-checkpoint-regression.rNnw8z/EVALUATION.md` beneath V7.

The separate native Astra adjudication confirmed that the delivered logging
obligations were missing from the Deep specification and ledger. It classified
this primarily as failure to follow existing capture/gap-review instructions;
possible ambiguity about normalizing additional obligations in an answer remains
a hypothesis, not an established cause. No new customer logging answer or
automatic semantic patch is justified. See
`deep-contract-adjudication.MZ8CZY/ADJUDICATION.md`. Actual native read-only model
and provenance checks were captured, all input hashes remained unchanged, and
no further product stage ran.

UI-only V7 runner preparation reached syntax validation and baseline/bundle
binding, but launched zero native workflow actors before the new boundary.
Its checkpoint is in `standard-ui-native.dp7Nv9/`. Actual 200 percent browser zoom
and Claude workflow execution remain unverified. Complete stable matrix credit
is still zero.

## Requested MCP-Only Decision Reader: Initial Design Checkpoint

The user identified a context-scaling problem with long YAML decision journals.
Before recording this decision, the real journal had 2,528 lines, 107,347 bytes
and 100 revisions. One observed PyYAML 6.0.2 parse took 78.1 ms; this is a single
local observation, not a performance guarantee or a large-fixture benchmark.
The relevant distinction is whole-file parsing by software versus whole-file
delivery to the model. Existing recovery wording does not enforce bounded reads.

The user explicitly chose mandatory MCP access and rejected both local-command
fallback and a command-only solution. If MCP is unavailable, journal work must
stop rather than silently loading the YAML history into context. This changes
the prior standalone-runtime assumption and requires specification, packaging
and task-plan reconciliation before implementation. V7 is unchanged and its
results cannot be relabeled as verification of the new dependency.

The proposed first scope is a local read-only server over the authoritative
YAML, with bounded overview, current-decision search and per-decision/history
retrieval. Queries should return deterministic revisions, source identity and
explicit pagination/completeness indicators. Final coverage review must enumerate
current decisions in bounded batches; a narrow search alone cannot prove no
requirement was omitted. A separate persistent index, vector store, decision
writer and global installation are not part of this proposal. Exact tool
contracts, access boundaries, dependency delivery and acceptance checks remain
to be designed, not already implemented or approved in detail.

## Decision Reader Package And Current Integration

The initial design checkpoint above is historical. The user subsequently
approved a separate TypeScript/npm artifact and a Standard specification,
then replaced a maintained project allowlist with an absolute project path
supplied in each call. Multiple independent specification journals are
supported per project. The package is implemented with real YAML parsing,
bounded MCP operations, pinned tooling and executable package tests.

The authoritative scope is now
`docs/specs/decision-ledger-mcp/spec.md`; detailed correction evidence and
limitations are in [decision-ledger-mcp.md](decision-ledger-mcp.md). Root tests
passed 193/193 after the package and shared workflow integration. This is
deterministic evidence only. Fresh native workflow smokes and follow-up
independent review remain separate checks. No V7 pass credit transfers to the
new MCP dependency, and full stable matrix passes remain zero.

## Remaining Evidence

- Complete frozen-source full and holdout runs, including executable UI checks.
- Adversarial no-answer, stale-contract, wrong-test, environment, resume and
  no-review/no-commit transition behavior.
- Recheck the corrections from independent code/security review.
- Final complete tests, generation/foundation checks, generated-skill validation,
  YAML parsing, link checks and whitespace checks.

No global installation, client-setting mutation, commit, push, tag or
publication is authorized by these trials.
