# Harness Checks With Actual Codex Models

Status: Three reviews completed; one control blocked. P04 remains incomplete.

The user explicitly requested Codex models. The existing profile's advertised
`openai-codex / gpt-6.1-sol` route was retained for every parent, detailed judge
and final judge. Discovery and actual request headers verified `xhigh` effort.
The runtime used copied Harness `0.2.1-rc.2` packages and
`dsh-codex-connect@0.2.0-alpha.10`; this does not relabel it as pinned rc.3.

## Actual execution and results

The [structured evidence](harness-codex-model-result.json) contains actual
provider usage, per-actor counts, MCP traffic and native lifecycle observations.
These were real model responses and independent Harness child contexts, not
the simulated judgments in the earlier native-engine checks. Each judging
context had its own real local MCP process. Source data and customer answers
were explicitly synthetic fixtures; they grant no production approval.

| Review | Result | Time | Model requests | Provider input tokens, including cached | Cached input | Provider output tokens |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Sequential retained-ID omission | PASS: `gaps` | 831.16 s | 58 | 1,727,202 | 1,504,000 | 44,348 |
| Native workflow, same omission | PASS: `gaps` | 461.46 s | 67 | 1,952,601 | 1,709,952 | 42,534 |
| Native equivalent paraphrase | BLOCKED: `pending` | 221.92 s | 13 | 220,897 | 161,792 | 8,086 |
| Native cross-section conflict | PASS: `gaps`, final `conflict` | 292.64 s | 26 | 375,936 | 290,432 | 15,219 |

The paired inputs have identical specification bytes and semantic-control source
text. Their detailed results both contain 52 covered items and three source-linked
gaps for CLI-001, including its omitted empty-input/error clause. All 55 detailed
items were saved before the independent final assessment.

The sequential baseline used the same pinned body through ordinary sequential
Harness subagent activations in a private adapter. The native run used the actual
foreground `workflow` tool and PTC engine, with three concurrent judges. Parents
used the ready generated script; they did not regenerate its orchestration.
Actual traces show zero parent model steps while any native workflow was pending,
followed by direct owning-MCP verification after return. No background job or
polling agent was used.

This single paired sample was 1.80 times faster in elapsed time. Input tokens and
model-request count increased, so token savings are not established. Provider
input already includes cached input; cached and reasoning tokens are subsets,
not extra totals to add. Cache behavior, model variation and the private baseline
adapter are confounds; no universal or statistically reliable speedup is claimed.

## Concrete PTC presentation blocker

The paraphrase judge completed its exact reads but saved no verdict. It reported
that the callable submission tool had no input schema. The workflow returned
`incomplete` / `incomplete_group`; fresh MCP observation confirmed zero saved
items and pending final consistency. This is not a semantic failure of the
paraphrase control, and it is not a successful review.

No-model inspection confirmed that `tools/list` and the bound MCP tool contain
all required submission fields. The actual Harness PTC SDK projection instead
declares `mcp__eaw__specification_review_submit_batch: unknown`. A discriminating
control using the installed `jsonSchemaToTs` returned a typed object for a plain
string property and `unknown` after adding only valid `minLength: 1`. The actual
MCP submission schema also rendered as `unknown`, even with `$schema` removed.
The problem is the Host PTC type projection, not a missing MCP declaration.
Server constraints were preserved; none were removed to make a check pass.

For the fourth, previously unrun control, child scopes used the Host's supported
`tools.presentAs('native')` setting. The parent still used the foreground ready
workflow, and the actual generated body was unchanged. Native input schemas
remain available with their constraints. Programmatic-pagination capability flags
were false for these children, so final judging used the declared ordinary-read
fallback. The conflict control completed with an actual saved `conflict` verdict.
This is not a PTC type-rendering pass or a paraphrase retry.

Completed reviews also had rejected model tool arguments: 18, 15 and 4
`INVALID_INPUT` responses respectively; the blocked control had one. Models
corrected accepted-review arguments within their existing runs. These rejections
are reported rather than hidden behind the final outcomes.

## Preparation, isolation and remaining work

The copied profile's missing peer imports were linked only to already copied
runtime packages. No package was installed. An initial paid parent-only launch
stopped before any judging agent because the isolated composition lacked session
persistence/query services. Its two model requests are reported separately.
Subsequent no-model creation/rollback checks validated the repaired composition
before the four-case workload. One earlier fixture-enum error made no model call.
No completed semantic review was repeated.

The provider read existing authorization through a private link. Credential-file
copies and new login were not used. Private credential persistence was disabled,
so a refresh could not write the global source. No global profile, MCP
registration, shared server or installed artifact was changed. All runtime
disposals and fixture cleanup completed; raw traces remain private. The private
driver is retained for the one pending control while P04 remains open.

Per-actor model usage and complete serialized MCP response bytes are observed.
Separate scenario-handler time is not exposed by this adapter; missing metrics
are not reported as zero. The ordinary complete-profile launch, actual rc.3
runtime, durable opt-in native/model runner and real-model cancellation remain
outside the completed evidence. Earlier controlled native cancellation remains
separate evidence. No generation, commit or publication occurred.

Next action: the implementation agent can repeat only the blocked paraphrase
control using native child-tool presentation after explicit authority for that
additional billable trial. The agreed
[P04 packet](../../specs/specification-review-native-workflow/tasks/04_native_host_trials.md)
does not authorize repeated billable trials automatically. Host reconciliation,
the durable runner and remaining qualification evidence still belong to P04;
P05 has not started.
