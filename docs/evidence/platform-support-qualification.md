# Platform Support Qualification

Status: complete for the focused platform-support refinement.

## Change

Platform support is shared specification scope, applied conditionally by the
eight existing profiles. Initial triage distinguishes component, development,
build, and runtime targets, reuses established requirements, and asks about
material unknowns before proposing scope. A single-platform product remains
valid. Client support does not imply server support or exhaustive combinations.

The existing decision journal stores answers, `spec.md` owns requirements, and
planning maps supported environments to checks and evidence. No new schema,
manifest field, profile, runtime dependency, or mandatory artifact was added.
Separate design planning inherits relevant devices, browsers, input methods,
and accessibility/layout requirements without claiming runtime verification.

Changes are limited to 20 canonical reference documents, their generated copies
for both hosts, two test files, and these evidence documents. Skill entrypoint
files and global installations are unchanged.

## Iteration history

1. v1 added shared triage, persistence, profile applications, and verification.
2. Actual Terra question batches combined unknown platform support with scope
   confirmation. v2 requires the answer to be recorded before `scope_propose`.
3. A native v2 specification contained correct platforms but omitted decision
   links. v3 explicitly required `decision_link_requirements` before `Approved`,
   but chronological review found that approval still occurred too early.
4. v4 required a temporary `Draft`, links, and a state check before approval. Its
   resume trial linked a new fact after failed searches missed the original answer.
5. v5 adds exact recovery through `decision_find` and preserves the original
   decision ID. Both Terra Medium and Sol High then passed the original-answer
   and approval-order evaluator. The temporary-draft rule is scoped to creation.

The detailed [append-only history](platform-support-change-history.md) preserves
failed observations and harness corrections rather than rewriting them as passes.

## Method

These are focused workflow slices on synthetic projects, not a comparison with
the old prompt and not a full release-qualification campaign. The test customer
uses fixed, non-sensitive answers. Real Codex models ask through the native
question tool; the harness records delivered answers and actual MCP calls.
Setup confirmations are explicitly synthetic and authorize only fixture state.

The existing MCP runtime authors fixture manifests and decisions. Planning inputs
are approved synthetic specifications; one persistence case resumes a scope
actually collected by Terra in an earlier native run. No hand-written workflow
YAML is used as an actor fallback. Setup evidence is outside the actor workspace
in the final planning probes.

The harness uses the documented native [skill input and question/elicitation
protocol](https://learn.chatgpt.com/docs/app-server). Each run uses a fresh isolated
client home, records the effective model/effort and frozen skill bytes, and leaves
the real global instructions unchanged. CLI: 0.153.4; Node.js: v24.20.0.

The final three-skill bundle digest is
`0ef4c35b0bfa1e9df2ce1f134415e5554269aeebdf992e8d57822fe49416e338`.
It hashes the sorted file-path/SHA-256 map recorded with the native evidence.

## Main-cycle observations

All rows below used `gpt-5.6-terra` with `medium` reasoning. Scope and planning
observations made on v2 remain identified as v2; they are not relabeled v5 runs.

| Scenario | Candidate | Observed result |
| --- | --- | --- |
| Unknown Ubuntu/Windows CLI support | v2 | Asked once, saved the supplied target/version answer, then proposed and confirmed scope |
| Already established Windows-only CLI | v2 | Asked only for scope confirmation; retained Windows and excluded Ubuntu/macOS |
| Unknown web browser/device support | v2 | Asked before confirmation; preserved the supplied browser/OS combinations and desktop-only input scope |
| Windows client, Ubuntu server, macOS development | v2 | Preserved the independent roles without repeating the support question |
| No platform answer | v2 | Recorded a non-answer; did not confirm scope or create a specification |
| Ubuntu/Windows verification with Linux-only availability | v2 | Planned both targets; explicitly left target/runtime and Windows evidence unverified |
| Platform decision into completed specification | v5 | Preserved the original decision, wrote Draft, linked its requirement ID, passed the state check, then wrote Approved |

Native client completion alone is not an evaluation pass. Review uses the
questions, MCP results, saved artifacts, and instruction/source provenance.

## Final frozen-candidate checks

All three rows used the unchanged v5 bundle identified above.

| Actual model | Reasoning | Scenario | Result |
| --- | --- | --- | --- |
| `gpt-5.6-terra` | `medium` | Resume the actual earlier scope into a completed specification | Passed; original platform decision linked before approval |
| `gpt-5.6-sol` | `high` | Independent repeat of the resume/persistence scenario | Passed; original decision and both platform requirement IDs retained |
| `gpt-5.6-terra` | `xhigh` | Unknown Ubuntu/Windows support during initial scope | Passed; platform answer recorded before scope proposal and confirmation |

The chronological evaluator observed:

| Run | Draft write | Original decision link | Successful check before approval | Approved write |
| --- | --- | --- | --- | --- |
| `persist-terra-medium-v5` | 116.750 s | 123.186 s | 123.254 s | 133.689 s |
| `persist-sol-high-v5` | 203.547 s | 222.984 s | 228.798 s | 251.166 s |

A later successful readback is allowed. Removing the pre-approval check or the
original-decision link fails the evaluator; the actual v3 and v4 failures remain
rejected. This measures the sequence, not merely the final `Approved` string.

Additional v3 probes qualified the unchanged planning references: Sol High
preserved client/server/build/development roles, and Terra Extra High produced
coverage for all eight profiles, including security, data, event interoperability,
and two explicit cross-platform end-to-end paths without a Cartesian expansion.
These planning observations are explicitly v3 evidence, not v5 native repetitions.

## Recorded resources

- 30 recorded native attempts across iterations and harness repairs; 13 accepted
  focused observations across versions, including the three final v5 checks.
- Native-run window: 51.3 minutes, excluding preparation and report writing.
- All actors: 9,500,378 recorded tokens, including 8,194,688 cached input tokens.
- Three final v5 checks: 1,644,643 recorded actor tokens.
- These totals include unsuccessful attempts and cached input, exclude coordinator
  usage, and are not a monetary-cost estimate. The largest avoidable overhead was
  harness repair and repeated invalid MCP arguments; the final recovery rule
  reduces that failure mode without removing validation.

## Deterministic checks

- Four new contract tests fail against the saved original references and pass
  against the current references. Sequence and linking assertions were observed
  failing before their respective corrections.
- Final `npm test`: 232 passed, zero failures or skips, including package build.
- Generated-host consistency and complete validation: passed, 16/16 skills.
- Workspace lint and `git diff --check`: passed.
- Captured native-question replays verify both protocol method names and exact
  scope-option delivery, including Russian option variants.

## Retained failures and limits

Early native attempts were blocked by isolated-client MCP permissions or harness
protocol handling. Other attempts exposed malformed opaque context copying or
an incorrectly inferred skill directory. These are retained as invalid or
unsuccessful attempts, not successful prompt evidence.

The initial split-platform planning run read a fixture setup journal despite a
README restriction. Its platform content was correct, but it is not a clean
instruction-following pass; a separate repeat uses correctly isolated evidence.
The v2 persistence omission, v3 early approval, and v4 substitute decision are
also excluded as passes. An idle-receive timeout in an early Sol planning probe
was a harness failure; its completed repeat is recorded separately.

No actual Windows/macOS product checks, browser rendering, accessibility runtime
checks, Penpot operations, or native Claude sessions were performed. Generated
Claude artifacts passed local validation; that does not qualify Claude behavior.
These observations establish the tested decisions and handoffs, not universal
instruction adherence or full workflow equivalence. Existing unrelated workflow
qualification gates remain unchanged.
