# Current Handoff

Status: Implementation and bounded qualification complete.

Current change: corrections-only specification followup review. The MCP stores
immutable input snapshots, selects changed/linked items, attributes provisional
inherited verdicts, and requires one fresh whole-specification consistency check.
Scope expansion withdraws old evidence. Unsupported changes require full review.
No-write status/resume, genuine-write conflicts and retry recovery remain intact.

The subsequent P1 review finding is fixed: `specification_review_start` accepts
`mode: "full"` to replace an unfinished followup without inherited verdicts,
including recovery from missing archives using intact current sources. Default
resume is unchanged. An unchanged unfinished full run also resumes in full mode.
Exact retries, restart and stale-context protection have regression coverage.

Four scenario tools are available in the generated MCP contract:
- specification_review_changes
- specification_review_followup_start
- specification_review_scope_expand
- specification_review_consistency_record

Both host bundles are generated from the canonical references. Followup guidance
is loaded only for this correction flow. The schema adds optional metadata;
existing journals are not migrated.

Validation after the P1 fix: full npm test 275/275, zero failures/skips;
focused followup/concurrency 18/18; root lint; foundation
13/13; generation/check; affected Codex skill validator; git diff --check.
Two independent fresh reviewer trials used synthetic data. The valid correction
completed reviewed/consistent, 9/9, with five carried results. The cross-impact
case correctly completed gaps/conflict, 9/9, after withdrawing two inherited
results. Its deliberately contradictory specification is not a product failure
and is not a real customer artifact requiring repair.

The same-input deterministic benchmark used 19 calls / 52,712 response bytes for
followup including preparation, versus 33 / 85,019 for full review. This is one
small fixture, not a general speed claim. Detailed evidence and limitations:
[Specification review followup](../../../evidence/specification-review-followup.md).

Historical completeness/context qualifications, review references and earlier
245-test results remain in
[Specification completeness evidence](../../../evidence/specification-completeness.md)
and the ignored baseline. Those historical source versions do not qualify the
newly amended specification.

No global installation/configuration, commit, publication, live Claude/Penpot,
or previous full model matrix was performed. Runtime tests ran on Linux only.
The author/reviewer trial bridge persists successful contexts automatically;
automated stdio tests separately exercise explicit context conflicts and retry.
