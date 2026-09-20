# Implementation Plan

Verified inputs after the user's controlled-fixture answer:
`review_ref` = `47aff8ca-cbc6-44dd-af27-90a40ff8c104`,
aggregate `source_version` = `cd5364431722ee80015969c951676c8c5890cdb8c5c9b38aee008f1eb4cc600d`,
`specification_version` = `d032355a6993a8ea5057c1ae841efaab8c9bbe8d23e8b172c0e57dca0ff560a5`.
Check-state passed before and after the author-made Draft-to-Approved transition.
Pass the specification version to `requirement_get`; use the aggregate version
for consumer freshness checks. The independent reviewer recorded 20 covered
items and one valid context exclusion, not a machine proof of semantic truth.

The user authorized all four checkpoints in order. Preserve all unrelated worktree changes. Each checkpoint requires discriminating RED, GREEN, and relevant stdio E2E evidence before progressing.

1. Sources, Markdown requirement definitions, bounded reads, and mechanical coverage: SRC-001, SRC-002, REQ-001, REQ-002, COV-001, LEG-001.
2. Persistent version-bound review protocol: REV-001, REV-002, COV-001, LEG-001.
3. Canonical specification/planning/incremental instructions and generated consumers: SKL-001, SKL-002, USE-001, LEG-001.
4. Focused model qualification and final repository checks: VAL-001.

Ownership: MCP parses and validates deterministic state; agents author and judge meaning. The Markdown specification remains editable. The journal owns links and typed review history. No generic YAML editor, model service, or execution registry is introduced.

Run `npm test`, `npm run lint`, `npm run validate:foundation`, `npm run generate:check`, and `git diff --check` for final verification. Generate both bundles only from canonical inputs. Model trials are explicit isolated runs, not npm/CI tests. Unavailable checks remain unverified.


## Final Acceptance

All four checkpoints are complete. Campaign 12 passed two consecutive focused
Astra/high rounds on unchanged skills and MCP: eight scenarios per round,
18 distinct contexts, and 228 persisted judgments. The final live digest check
matches the qualified candidate. Required repository checks passed; the full
frozen-candidate npm run passed 245/245 with no failures or skipped tests.

The separately authorized normative-document reconciliation passed fresh
independent review 4375aeb6-9410-4802-9c67-b743ade60406 (152/152 judgments).
The author restored Approved only after a passing state check and confirmed the
same reviewed source version after that transition. Installation code, skills,
and fixtures were not changed by this document-only addition.

See ../../../evidence/specification-completeness.md for evidence, historical
failures and recovery, and qualification limits. No prior full application
matrix, Sol/Terra implementation, live Claude/Penpot, global setup, commit, or
publication is claimed by this acceptance.
