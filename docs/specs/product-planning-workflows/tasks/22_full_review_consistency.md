# P22: Enhanced full-review consistency and bounded reviewer progress

Status: Complete; G02 and prerequisites P20/P21 are complete.
Requirements: PWF-042; preserve PWF-018, PWF-021, PWF-034, PWF-038–PWF-041.
Dependencies: completed P20/P21 and G02.

## Inputs and boundaries

Use the G02 source_version, specification_version and review_ref in
[plan.md](plan.md#cdp-review-efficiency-amendment-2026-09-20), after
specification_check_state confirms Approved/pass/reviewed. Historical G01 pins
are not substitutes. Read the linked requirements through MCP and
[the review-efficiency contract](../contracts/mcp.md#specification-review-efficiency).
No full decision-journal read is needed.

Reverify repository evidence: review-model.ts:19 constructs context from
non-requirement prose; reviews.ts:228 reads items and issues receipts;
reviews.ts:273 completes runs; review-followup.ts:109 and its consistency tool
own the existing followup gate. Paths are under the MCP src directory.
Canonical completeness-review.md:93–109 currently requires complete per-item
reads but has no enforced final full-mode whole-spec phase.

Allowed ownership: those review modules, strict runtime schemas/metadata for
their tools, relevant schema packaging if an additive run field needs it,
canonical spec-driven-development references, affected generated Codex/Claude
copies, and focused review tests. No product-review redesign, journal migration,
new storage engine, global client change or actual consumer-spec edit.

## Architectural contract

Extend the existing full start with the optional literal require_consistency=true;
omission preserves the legacy API. Persist the enhanced mode and disclose
consistency_required in start/status. Reuse the existing final context item and
consistency-record scenario, with the strict enhanced-mode rules in the contract.
The context body includes the entire specification and saved detailed outcomes.
Bind final receipt to exact current inputs and verdict set, not just its item ID.
Reject premature final recording and any attempt to batch the consistency item.
Legacy full get/record/complete and completed evidence remain unchanged.
No-op resume must not accidentally downgrade an enhanced run or convert a legacy
run in place; an explicit mode mismatch yields actionable rejection/new-run
guidance and preserves all existing verdicts.

Canonical skill guidance requests the enhanced capability, checkpoints a fully
read single item or supported group of at most 20 before reading the next group,
and checks normative prose, public identifiers and lifecycle ordering during
final semantic assessment. Missing enhanced capability is reported, not silently
substituted with old evidence. Batch absence alone uses singles. Generate both
hosts from their shared source; never edit installed skills.

## Acceptance and test-first execution

Create test/review-full-consistency.test.mjs under the MCP package. Use existing
stdio fixtures, not real journals. Q48 and Q49 in quality/scenarios.yaml own
the exact observations.

1. RED: enhanced completion must fail without fresh final evidence; the current
   full path should demonstrate the missing guard rather than an import error.
2. GREEN: implement mode, bounded final reads, receipt validation and completion.
   Correct implementation, never weaken valid assertions.
3. PROVE: temporarily bypass the completion or receipt guard and observe the
   corresponding failure; restore immediately. Test mode-mismatch no-write,
   legacy compatibility, stale final receipt, long full text and saved findings.
4. VERIFY: synthetic conflicting-order/prose cases and non-normative examples
   distinguish protocol protection from semantic reviewer judgment. Neutral
   fresh-agent semantic evidence belongs to existing P17, not npm test.

From repository root:

```sh
rtk proxy npm run build
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/review-full-consistency.test.mjs packages/engineer-agent-workflow-mcp/test/review-followup.test.mjs packages/engineer-agent-workflow-mcp/test/review-batch.test.mjs packages/engineer-agent-workflow-mcp/test/review-concurrency.test.mjs
rtk proxy npm run generate
rtk proxy npm run generate:check
rtk proxy npm run validate:foundation
rtk proxy npm run lint
rtk proxy npm test
rtk proxy git diff --check
```

The new focused test is to create, not a currently available script. Every final
command must exit 0; check both generated bundles' sizes and host isolation.
Native-platform and model qualification remain P17. Preserve retained legacy
runs; rollback only this packet's changes, never delete user history.
Recheck pinned spec, inspect tracked/staged/untracked changes, update todo and
handoff with real evidence and stop. No automatic review, commit or next packet.
