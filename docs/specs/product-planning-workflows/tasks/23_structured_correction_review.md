# P23: Structured changes and safe shared-context corrections

Status: Complete; G02 and prerequisite P22 are complete.
Requirements: PWF-043, PWF-044; preserve PWF-018, PWF-021, PWF-030,
PWF-034, PWF-039–PWF-042. No implementation is authorized here.

## Inputs and boundaries

Use only current G02 pins from
[plan.md](plan.md#cdp-review-efficiency-amendment-2026-09-20); require
Approved/pass/reviewed before starting. Read exact requirements through MCP and
[the review-efficiency contract](../contracts/mcp.md#specification-review-efficiency).
Reverify MCP src/review-followup.ts:42–98 (impact and change identity),
:136 (legacy text projection), :141 onward (mapping and inheritance),
review-snapshots.ts (immutable evidence), and requirements.ts:49 (portion cursor).

Allowed changes: followup impact/read/start owners, local cursor/projection
helpers, strict scenario schemas/metadata, canonical followup guidance and
matching generated host artifacts, focused tests. Keep a single authoritative
impact calculation shared by text and structured readers. Do not modify product
review, retained archives, cleanup policy, external compression or unrelated
readers; do not replace old text output.

## Architectural contract

Add the bounded structured summary/evidence scenarios specified in the MCP
contract. Navigation exposes server-issued finding keys, reasons and exact
reference selectors, not partial JSON requiring source-code inspection.
Exact evidence pages share a report identity and produce a changes_receipt only
after the complete required change/finding sequence. Source text remains exact;
a navigational preview is never sufficient evidence.

Narrow the unconditional context-change rejection only for finding-linked
corrections with unchanged requirement meanings and original sources, unchanged
manifest/profiles, intact latest completed Draft-parent evidence and no removal
or new scope. Keep all pre-existing exclusions and eligible requirement/link
repairs. Always recheck context/profiles and explicit affected closures. The
reviewer judges before/after meaning, expands affected items, or starts a full
review for uncertain influence; the server must not claim semantic safety from
hash equality. Final consistency stays compulsory. No hidden approval/retry.

## Acceptance and test-first execution

Create test/review-structured-changes.test.mjs under the MCP package; reuse
existing followup/snapshot/stdio helpers. Q50–Q52 define discriminating cases.

1. RED: a finding-linked context-only correction with otherwise unchanged sources
   is currently refused; structured navigation is unavailable. Obtain a behavioral
   assertion failure, not only missing-tool detection.
2. GREEN: implement the common typed impact projection, complete paginated reads
   and narrow eligible path. Correct implementation until valid checks pass.
3. PROVE: bypass a complete-evidence receipt or unchanged-source check, observe
   rejection tests fail, restore. Observe journal bytes, versions and receipt
   counts for rejected/readonly calls; no prefixes may be committed.
4. VERIFY: compare old text and new structured reports, long Unicode fields,
   every continuation, wrong source/parent/project cursor, all findings mapped,
   missing snapshot, source changes and real safety-negative examples. Verify
   item inheritance provenance and mandatory fresh consistency, not just counts.

From repository root:

```sh
rtk proxy npm run build
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/review-structured-changes.test.mjs packages/engineer-agent-workflow-mcp/test/review-followup.test.mjs packages/engineer-agent-workflow-mcp/test/review-full-consistency.test.mjs packages/engineer-agent-workflow-mcp/test/transport.test.mjs
rtk proxy npm run generate
rtk proxy npm run generate:check
rtk proxy npm run validate:foundation
rtk proxy npm run lint
rtk proxy npm test
rtk proxy git diff --check
```

The structured-changes test is to create; full-consistency is supplied by P22.
Existing snapshot regressions live in review-followup.test.mjs. All final
checks must exit 0. Measure actual report calls/bytes without a latency promise.
Fresh semantic/model and native-platform cases stay in P17; no new matrix is
added. Refresh MCP state, inspect scoped tracked/staged/untracked changes,
update todo/handoff and stop. Retain old evidence on failure; no migration,
installation, commit, publication or automatic next-packet execution.
