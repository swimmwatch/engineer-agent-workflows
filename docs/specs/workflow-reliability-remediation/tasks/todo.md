# Workflow reliability execution checklist

Status: COMPLETE — I01-I12 and corrected N6/I12-V2 accepted; I11/Q16 exact-snapshot qualification passed all four native combinations; Q14 cancelled / no longer required, never passed. Updated: 2026-10-19.

This is the sole completion checklist. Retained checkmarks use accepted frozen
evidence in its original domain; a scope cancellation is not a passing test.
Current source/spec/review pins are in [plan.md](plan.md#pinned-approved-inputs).

- [x] [I01 — Prove the two existing Technical Design fixes](01_regression-proof.md)
- [x] [I02 — Publish actionable product-scenario diagnostics](02_actionable-diagnostics.md)
- [x] [I03 — Read exact draft evidence through MCP](03_draft-evidence-reader.md)
- [x] [I04 — Report the serving MCP build and capabilities](04_runtime-identity.md)
- [x] [I05 — Separate source and verdict digest representations](05_explicit-review-hashes.md)
- [x] [I06 — Recheck changed product evidence after a successful review](06_review-after-pass.md)
- [x] [I07 — Provide MCP-first sessions and exact read delivery](07_mcp-session-context.md)
- [x] [I08 — Recover session operations without duplicate effects](08_session-recovery.md)
- [x] [I09 — Make architecture readiness explicit in generated skills](09_architecture-checkpoint.md)
- [x] [I10 — Guard exact MCP payloads (retained Q13; Q14 cancelled)](10_lossless-boundary.md)
- [x] [I11 — Qualify the integrated public and packaged workflow](11_integration-qualification.md)
- [x] [I12 — Document verified contracts and operator recovery](12_developer-documentation.md)
- [x] [I11-N6 — Preserve safe actual alias-child failure diagnostics (local checks complete)](11_integration-qualification.md#current-local-correction--i11-n6-2026-10-19)
- [x] [I12-R1 — Local documentation and exact integrity checks complete](12_developer-documentation.md#current-documentation-follow-up--i12-r1-2026-10-19)

All agreed implementation and qualification work is complete. Root accepted the
combined N6/I12-V2 scope after both independent reviews returned PASS_SCOPE.
The explicitly authorized commit `ba1e3afdc019e9ee2251387d1bac884024985cb3`, tree
`e6bd69a668605d393771cceee1313a4d391c4647`, was sent to the qualification branch.
[Run39231775734](https://github.com/swimmwatch/engineer-agent-workflows/actions/runs/39231775734)
completed all four actual macOS15/Windows2025 × Node22.20.0/24.14.0 combinations:
each80/80, zero failures/cancellations/skips, with a passing native CLI on the
correct OS/Node. [Verified results](../../../../artifacts/workflow-reliability-remediation/combined-v2-delivery/verified-results.json)
bind that exact commit/tree. I11 and Q16 are complete within this evidence domain.

Q14 is cancelled, never passed. Model trials were explicitly skipped by this
native run; independently accepted historical I09 evidence remains unchanged.
Historical N5 Windows22 failure/cause uncertainty and older failures/skips remain
unchanged. A green new run does not prove N6 fixed their historical cause.
Retained local Linux11/27 checks,16 mutation controls and38-source/83-runtime
guards retain their original exact-input domains, not new execution claims.

No agreed packet or required qualification gate remains. No PR/merge, release,
global installation/configuration or additional external-service work was requested
or performed. Current bookkeeping preserves exact frozen preimages and introduces
no next execution duty. Historical statements below retain their original context.

## Historical execution evidence

I09 is complete. Local I10/I11 implementation, checks and final independent reviews
remain accepted; the [accepted local I11 report](../../../../artifacts/workflow-reliability-remediation/i11-delimiter-correction/report.md) preserves the original-worktree887/109 results.
The corrected CI candidate has 746 files and112 HEAD delta paths. Both its [final code review](../../../../artifacts/workflow-reliability-remediation/resume16-ci-final-code-review/report.md)
and [final security review](../../../../artifacts/workflow-reliability-remediation/resume16-ci-final-security-review/report.md) pass on the same [corrected freeze](../../../../artifacts/workflow-reliability-remediation/resume16-ci-correction/freeze.json); see the [corrected CI snapshot report](../../../../artifacts/workflow-reliability-remediation/resume16-ci-correction/report.md) and [coordinator run state](../../../../artifacts/workflow-reliability-remediation/coordinator/run-state.json).
It remains a qualification snapshot including inherited prerequisites, not a
remediation-only logical commit. These optional status documents are excluded from
that frozen candidate; bookkeeping does not change its reviewed bytes.

The later explicit authorization restored the required native matrix and allowed
one exact reviewed commit/push/four-job delivery. Commit97b8513a4ea02b690e92bb0aaf90dfab75971865
was pushed; run38942838354 failed all four native acceptance jobs, each8 passed /
53 failed / 0 skipped. Downstream native qualification was skipped, not passed.
The grant is consumed. I11-N1 authorizes only a reversible local correction;
another commit/push/CI run needs authority for its concrete reviewed result.
The additional nine Headroom compress/retrieve pairs executed and passed bounded
selected-body checks, covering38 selectors with29 older confirmed selections.
Nine historical outcomes remain uncertain; cumulative ceiling47 pairs/140081
bytes is consumed and no retry is authorized. Full Q14 serving-MCP identity and
automatic-path qualification remain unverified.
I10/I11 remain unchecked. The [current local revalidation](../../../../artifacts/workflow-reliability-remediation/i11-current-local-revalidation/report.md)
resolves original-worktree provenance with a fresh build,86 exact package bindings
and20/20 focused tests. I12/Q17 documentation acceptance is complete after the independent fresh reader,
code review and security review all passed and root accepted their exact bindings.
See [I12 final acceptance](12_developer-documentation.md#final-documentation-acceptance--2026-10-16)
and the [accepted disposition](../../../../artifacts/workflow-reliability-remediation/coordinator/i12-final-review-disposition.json).
I11-N1 local fixture/packed-launch correction remains pending. I12 completion does not close
external gates or the whole workstream. Follow
[execution-workflow.md](execution-workflow.md); no commit, push, installation,
publication, global configuration or extra Headroom authority is inferred.

Next action and owner: `qualification_ci_delivery` completes the bounded local
I11-N1 correction; root coordinates independent reviews before any concrete new
delivery/native-rerun authorization. Full I10/Q14 and I11/Q16 stay unchecked.
The separate serving-MCP identity/automatic-path execution owner remains unknown.
No extra Headroom call or further public action is authorized by consumed grants.

Current2026-10-18: [I11-N2](11_integration-qualification.md#current-local-correction--i11-n2-2026-10-18) supersedes older N1-pending statements above. Owner windows_native_context_scout prepares the bounded test-only correction and evidence; root coordinates its separate reviews. No further publication/native run or Headroom call is authorized. Full Q14/Q16 remain unchecked.

I11-N2 local author result: final68/68 on both pinned Linux runtimes, actual-helper lifecycle and diagnostic PROVE,750-path input verification pass; [report](../../../../artifacts/workflow-reliability-remediation/windows-native-correction/report.md). I11 remains unchecked because required Windows/Q16 and Q14 gates are open. Next owner root: independently review the frozen local N2 scope, then obtain authority for any concrete further native delivery.

Final source differs from the successful functional preimage only by five whitespace-only blank lines and its manifest hash; token/span equivalence is explicit, final750-path CLI/diff check pass. No functional results were relabeled as matching new hashes.

I11-N3 local author result2026-10-18: six-path tree2939aa9903a76d5142514097d8783d3824567480 prepared and checked. Final coverage71 distinct cases per Linux runtime is mapped as unchanged66 integration cases plus final5 lifecycle cases; both actual after-only CLIs pass. [Evidence](../../../../artifacts/workflow-reliability-remediation/windows-cleanup-budget-correction/report.md). Full I11 and Q16 remain unchecked pending an authorized actual native run; Q14 remains incomplete. Next owner root obtains exact-freeze independent code/security conclusions, then seeks any separate publication authority.

I11-N4 local author result: Local N4 author checks passed on the unchanged five-path candidate:79/79 on each pinned Linux runtime (77 native-CI consumer cases plus2 diagnostic unit cases), both actual after-only CLIs exit0, five PROVE controls detect/restore, build/lint/generate:check/validate and exact-input verifier/negative controls pass. Final independent reviews/root acceptance and separately authorized four native jobs remain pending; I11/Q16 and Q14 stay incomplete. [Evidence](../../../../artifacts/workflow-reliability-remediation/windows-public-recovery-correction/report.md). Root owns exact-freeze reviews and any fresh concrete publication request.

I11-N5 local author result: I11-N5 local diagnostic correction is verified on both pinned Linux runtimes:87/87 six-suite cases per runtime, actual after-only CLI exit0, final32 assertion-producing mutation controls restored, and lint/build/generation/validation/input checks pass. Independent final reviews and separately authorized exact-snapshot native qualification remain pending. The historical Windows22 cleanup cause is unknown; Q16, Q14 and full I11 remain incomplete. [Evidence](../../../../artifacts/workflow-reliability-remediation/windows-cleanup-diagnostics-correction/report.md). Next action and owner: root obtains exact-freeze independent reviews and any fresh concrete publication/native authority; Q14 operational owner remains unknown.
