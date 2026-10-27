# Skills and Distribution Areas Without a New Source-Confirmed Change

## Why this file exists

Grouping the audit by skill must not turn coverage into a mandate to modify every skill. The six skills below were inspected in the audit, but no new source-confirmed avoidable-check/approval defect was established in their canonical guidance. The conclusion is bounded source evidence, not proof of perfect model behavior.

Evidence: [context and standalone no-finding samples](<../audit.md#L110-L115>), [primary context review](<../P04.json>), [primary maintenance review](<../P05.json>) and [independent sample verification](<../V03.json>).

| Skill | Proposed canonical change from this audit | Boundary to retain |
|---|---|---|
| [context-engineering](<../../../../../skills/context-engineering/SKILL.md>) | None established | Reuse supplied current guidance; load missing task-scoped evidence only when needed |
| [context-scouting](<../../../../../skills/context-scouting/SKILL.md>) | None established | Bounded discovery, advertised route selection and actual user choice; Harness does not imply a model vendor |
| [interview-me](<../../../../../skills/interview-me/SKILL.md>) | None established | Native questions, actual answers/non-answers and explicit downstream boundaries |
| [code-simplification](<../../../../../skills/code-simplification/SKILL.md>) | None established | Behavior-preserving explicit scope and appropriate verification |
| [documentation-and-adrs](<../../../../../skills/documentation-and-adrs/SKILL.md>) | None established | Repository-grounded current/proposed distinction and settled trade-offs |
| [performance-optimization](<../../../../../skills/performance-optimization/SKILL.md>) | None established | Measurement-first claims; source complexity is not measured user-visible savings |

The candidate product interview ambiguity in [product authoring](<02-product-authoring-context.md>) is not automatically a defect in the standalone interview skill. Similarly, [benchmark provenance](<10-development-verification-and-measurements.md>) changes maintenance scripts, not automatically the performance skill. Repeated safety rules across independently invocable skills are not by themselves duplicate execution.

## Canonical sources and host copies

The audit found existing strict rendering, integrity/digest, size, host-isolation and packaging safeguards; see [distribution verification samples](<../audit.md#L116-L123>), [distribution primary](<../P11.json>) and [documentation/evidence primary](<../P13.json>). No separate new distribution-mechanism recommendation was promoted.

If a future authorized change modifies canonical skill/shared text in another note:

1. Own the semantic change in the canonical source once.
2. Keep the existing generator as owner of Codex, Claude Code and Harness copies; do not hand-edit copies.
3. Treat role-routing/resource moves as bundle/digest/fidelity changes where applicable.
4. Select focused canonical instruction tests, then existing generated equality/leakage/dependency checks for the affected bundle.
5. Preserve self-contained installed resources and explicit-only invocation metadata.
6. Do not copy repository development rules into distributed instructions.

This describes future verification boundaries, not generation authorization for this follow-up. Static distribution-byte stability is not a full renderer pass or installed UI/model qualification. No skill was invoked for these explanatory files, and no generator or installation was run.

## Do not invent a change just to make the matrix look complete

No finding here means no specific new remediation is proposed from the saved audit. It does not mean a full fresh-context host trial ran. If later evidence identifies a concrete defect, document its source, trigger, missing behavior and discriminating check before adding a remediation group. Existing test coverage may still need to be rerun if a genuinely shared dependency is changed elsewhere.
