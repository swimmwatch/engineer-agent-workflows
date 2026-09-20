# CDP completeness-review report: validation and disposition

Date: 2026-09-20. Scope: analysis and the `product-planning-workflows`
specification/plan amendment only. No runtime, installed client, global setting,
or consuming-project artifact was changed by this analysis.

## Evidence boundary

The supplied report describes five 70-item reviews and real retry, authorization,
public-interface and lifecycle contradictions. Those historical counts and
individual verdicts are reported evidence, not a replay independently performed
here. Current repository mechanisms were inspected directly. The installed MCP
and worktree are separate versions: the installed state check did not expose all
P20 fields, and its callable surface did not advertise the worktree's batch tool.
Do not infer that the other session used today's implementation.

In this session a compression marker appeared in displayed shell/MCP output,
while the underlying tool result retained the actual opaque context and source
text. Forwarding that value directly restored MCP reads. Printing bounded source
portions restored inspection. This is one observed recovery path, not evidence
that every host preserves originals. No compression/client setting was changed.

## Disposition

| Report item                                   | Verified mechanism and existing coverage                                                                                                                                                                                                    | Decision                                                                                                                                                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Any shared-context edit forces full review | `src/review-followup.ts:53` rejects `context:specification` changes. P21 explicitly preserves eligibility.                                                                                                                                  | New PWF-043, P23: finding-linked context-only corrections, unchanged source meaning/scope, fresh affected checks and consistency; uncertain impact still full.                                                             |
| 2. No final full-review consistency gate      | `src/review-model.ts:19` removes requirement blocks from the context item; `src/reviews.ts:277` gates consistency only for followup. Existing P11 concerns product review, not this standalone specification path.                          | New PWF-042, P22: explicit compatible enhanced full mode with final complete-spec/verdict evidence after detailed checks.                                                                                                  |
| 3. Change report is serialized JSON text      | `src/review-followup.ts:136` passes the full report to `portion`; `src/requirements.ts:49` emits 1,024-character portions. P19 describes this interface; it does not replace it.                                                            | New PWF-044, P23: typed bounded navigation and exact paginated evidence, explicit finding keys and fixed reason codes; preserve legacy text reads.                                                                         |
| 4. Compression hides required content         | PWF-041, P21 B06 and P17 already require exact delivery and actual host evidence. This session demonstrates display loss is not necessarily loss inside the tool result.                                                                    | No duplicate fix or decoder. Keep existing P17 real-host row incomplete until actually demonstrated.                                                                                                                       |
| 5. CONFLICT despite matching semantic hashes  | `src/state.ts:183` guards actual dependency bytes; verdict/receipt writes change journal bytes without changing semantic review inputs. `state.ts:247` enriches mutation conflicts, while `readConsistent` at line 290 has a separate path. | New PWF-045, P24: distinguish stale context, read-time dependency race and proven review-source drift. This is not evidence that concurrency protection is wrong. Preserve codes and rejection, classify via safe details. |
| 6. Read-all then record-all progress          | P21 already implements bounded atomic writes; canonical `skills/spec-driven-development/references/completeness-review.md:93` still describes single recording without a bounded flush rule.                                                | P22 updates canonical guidance: read a full item or supported bounded group, save acknowledged verdicts, then continue. Do not require one write per item where batches exist.                                             |
| 7. Normative prose outside requirement IDs    | `src/requirements.ts:71` checks links/IDs, not normative meaning. Canonical completeness guidance already says to inspect non-requirement promises at line 105.                                                                             | P22 makes this part of final whole-spec assessment and adds neutral cross-section regression fixtures. No deterministic semantic-contradiction lint.                                                                       |
| 8. False proof flags look like failures       | PWF-034/PWF-037 and P18 already distinguish proof limits from readiness/status.                                                                                                                                                             | No new runtime flags or task. Retain P18's existing explanation and verify it on new examples.                                                                                                                             |

All `src/` references above are relative to
`packages/engineer-agent-workflow-mcp/`. Line evidence must be rechecked before
implementation; it is not an immutable source pin.

## Choices not adopted

- Do not reuse every unchanged-hash verdict automatically. Existing followup
  inheritance is attributed and conservative; implicit dependencies require
  reviewer judgment and a final consistency assessment.
- Do not replace `CONFLICT` with new top-level codes. Existing clients depend on
  them; additive fixed diagnostics suffice and preserve PWF-035 compatibility.
- Do not assert that regexes detect lifecycle contradictions or that every CLI,
  API or environment-name mention is normative. Quotes and examples produce
  false positives, while obligations need not contain MUST/SHALL. No new lint
  engine or public lint tool is justified by this report.
- Do not add batch reads or tunable page sizes now. Structured navigation removes
  the demonstrated API-discovery problem; actual transfer costs remain measured
  under P17/PWF-041/PWF-044 before another optimization is proposed.
- Do not redesign product review, archives, retention or the shared product store
  because a standalone specification review exposed these issues.

## Plan amendment

Add P22 (enhanced full-review consistency and bounded reviewer progress), P23
(structured changes and conservative context corrections), and P24 (conflict
classification). P22/P24 depend on completed P20/P21; P23 depends on P22. Final
P17 qualification consumes all three, then P18 documents verified behavior.
Previously completed packets stay complete with historical evidence. Existing
P17 native-platform/model blockers remain; this report does not clear them.

G02 passed independent completeness review: 88/88 recorded items, 86 covered,
2 non-behavioral not_applicable, no gaps/conflicts. The author restored Approved;
MCP confirmed pass/reviewed and planning pins were refreshed. No implementation
is authorized by that approval. No runtime tests or model qualification passes
are claimed by this analysis.

## Document validation

- YAML parser validation passed for all 54 planned scenarios. The baseline already
  had malformed indentation in Q01–Q04 and Q44–Q47; the amendment corrected those
  offsets and the new scenario offsets. Comparing parsed data against the
  indentation-normalized baseline confirmed all 47 original scenario records
  and all 39 existing schema examples are unchanged.
- All 39 positive/negative data-schema examples passed the actual Ajv validator.
- All 45 requirement IDs have plan coverage; 92 relative links across the ten
  inspected specification/planning documents resolved before final pin refresh.
- Generation check and foundation validation passed for all 16 skills;
  git diff --check passed. No runtime implementation or model qualification was
  performed by the author in this document-only amendment.
