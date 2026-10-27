# Decisions and Requirement Links: Three Different Repeated-Work Paths

## Scope and ownership

Findings: **P08-01, P10-F01, P10-F04**. These are independently accepted/narrowed, source-confirmed opportunities, not reproduced runtime incidents or measured speedups. See the [ledger finding](<../audit.md#L398-L417>), [requirement-link finding](<../audit.md#L505-L529>), [decision-reading finding](<../audit.md#L572-L590>) and [independent verification](<../V02.json>).

Relevant workflow consumers include [spec-driven-development](<../../../../../skills/spec-driven-development/SKILL.md>) for specification decisions and [design-planning](<../../../../../skills/design-planning/SKILL.md>) for design references. The proposed changes belong to MCP internals, not to every consuming skill. The design/experience requirement-link path is a related consumer, not proof that every skill directly calls every tool below.

## 1. P08-01: validate parsed decisions without serializing and parsing them again

### Exact current moment

1. The state loader reads and safely parses the original decision journal into a YAML document and mapping.
2. State validation checks that mapping, then constructs another YAML document from it and serializes it into bytes.
3. `parseLedger` decodes and parses those synthetic bytes, validates decision semantics, sorts revisions, selects current decisions and hashes bytes.
4. The state validator discards the returned read model. Changed mutations repeat validation at working/final-output boundaries.

Evidence: [state validation and load:131–168](<../../../../../packages/engineer-agent-workflow-mcp/src/state.ts#L131-L168>), [mutation validation:388–420](<../../../../../packages/engineer-agent-workflow-mcp/src/state.ts#L388-L420>) and [parseLedger:67–108](<../../../../../packages/engineer-agent-workflow-mcp/src/ledger.ts#L67-L108>).

**What is unnecessary:** a second encode/decode/parse and read-model construction merely to establish the validity of an object already available. The first untrusted-input parse and the final formatted-output validation are not unnecessary.

**Minimal change:** let both entry points call the same internal semantic validator on the parsed data. Actual ledger readers still construct their read model. Preserve the existing byte API and explicitly preserve the synthetic-size acceptance boundary; object validation is not automatically equivalent to the old serialization path.

**Before → after:** `mapping → synthetic YAML bytes → ledger/read model → discard` becomes `mapping → shared semantic validation`. No process-wide source cache is needed.

### Focused verification

Extend [ledger regressions:249–393](<../../../../../packages/engineer-agent-workflow-mcp/test/ledger.test.mjs#L249-L393>) with paired old/new acceptance and error checks for duplicate revisions, broken supersedes links, legacy JSON-compatible fields, aliases/tags, invalid UTF-8 and size/format-expansion limits. Instrument synthetic serialization/parse counts separately from actual safe reads. Test an ordinary changed mutation as well as a read.

Keep comments, append-only revisions, exact error categories, dependency guards, receipt retention, response preflight and synced temp-file replacement. Schema-only AJV validation is not a substitute for ledger semantics. Complexity: medium internal refactor; depends on state/ledger acceptance parity.

## 2. P10-F01: one parse result per exact requirement source, not one parse per batch member

### Exact current moment

1. `decision_link_requirements_batch` prepares its current decision members.
2. Each member calls `verifyRequirements`.
3. Each call reads/decodes the same specification and constructs another Markdown syntax tree.
4. All valid changed revisions are finally appended in one guarded mutation. Experience changes repeat requirement checks for each screen/action too.

Evidence: [per-member validation:79–162](<../../../../../packages/engineer-agent-workflow-mcp/src/decisions.ts#L79-L162>), [requirementSource:46–77](<../../../../../packages/engineer-agent-workflow-mcp/src/requirements.ts#L46-L77>) and [experience checks:17–28](<../../../../../packages/engineer-agent-workflow-mcp/src/experience.ts#L17-L28>).

**Concrete example:** a batch of 20 members can parse the same unchanged specification repeatedly even though batching already saves tool dispatches and writes. The batch API itself is present and is not the missing feature.

**Minimal change:** reuse the parsed representation by exact source identity and strict/legacy parsing mode inside the owning invocation. Preserve the existing dependency-read observation points and member/error order.

**Critical counterexample:** source A changes to B before a middle dependency read, then returns to A before the final guard. The existing middle observation rejects. Reading only at entry and exit could miss that event. The accepted recommendation is parse reuse, **not removal of those reads**. See [read guards:124–129,185–194](<../../../../../packages/engineer-agent-workflow-mcp/src/state.ts#L124-L194>) and the [verifier narrowing](<../audit.md#L505-L528>).

### Focused verification

Use [decision-linking tests:95–173](<../../../../../packages/engineer-agent-workflow-mcp/test/decision-linking.test.mjs#L95-L173>) and [conflict tests:119–170](<../../../../../packages/engineer-agent-workflow-mcp/test/review-conflict-causes.test.mjs#L119-L170>). Compare batches of 1, 2 and 20; count parses separately from reads. Include strict/legacy modes, invalid first/middle/last member, no-op replay, intermediate transient edits and edits before commit. Rejected batches must retain exact diagnostics and perform no write.

No skill-instruction change or new batch API is required. Complexity: small-to-medium, but a different read-observation policy would be a separate contract decision.

## 3. P10-F04: bounded decision output should not allocate the entire text twice

### Exact current moment

`decision_get` reaches the decision read service, serializes the selected revision, creates a full `Array.from(text)` for a bounded portion, then creates another full code-point array for `total_characters`. Search previews also materialize the full string for at most 256 code points. See [portion/preview:162–189](<../../../../../packages/engineer-agent-workflow-mcp/src/service.ts#L162-L189>) and [get:300–326](<../../../../../packages/engineer-agent-workflow-mcp/src/service.ts#L300-L326>).

**Concrete example:** a long emoji-containing decision delivered over several pages repeats full-size temporary arrays on every page, although each page contains at most 4096 code points. This is an allocation observation, not a measured end-to-end bottleneck.

**Minimal change:** iterate code points to obtain boundaries/count without a full array, reuse the count from portion calculation, and stop a preview after its limit plus the truncation check. Do not copy a different stateful cursor protocol from the requirement reader.

### Focused verification

Extend [source-service tests:115–169](<../../../../../packages/engineer-agent-workflow-mcp/test/source-service.test.mjs#L115-L169>): reconstruct exact JSON across ASCII, supplementary Unicode and escaping; verify total/offset/last-page and 256-point preview boundaries; reject foreign/stale cursors; continue after process restart. Measure allocation separately from the retained YAML parse and decision serialization.

## Joint change boundary

These three findings share decision data but require different oracles: semantic acceptance, atomic linking/freshness, and exact Unicode paging. Do not merge them into one untestable rewrite. Make focused changes independently, then run their small combined regression set under separate implementation authority. This document records proposed tests only; none were run for this follow-up.
