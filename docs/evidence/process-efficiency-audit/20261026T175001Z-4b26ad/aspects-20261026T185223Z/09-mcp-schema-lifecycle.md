# Shared MCP Runtime: Keep Lazy Validation on the Startup Contract

## Scope and ownership

Finding: **P14-02**, independently narrowed and source-confirmed. This is one shared MCP lifecycle issue, not a separate text fix for every skill. See the [full finding and constraints](<../audit.md#L615-L637>), [primary evidence](<../P14.json>) and [independent verification](<../V02.json>).

Consumers include the specification/planning/design workflows and the four product workflows whenever they use MCP scenarios. Their relevance is indirect: the issue is how the server owns packaged schema bytes, not an instruction that each skill should load or cache schemas itself.

## Where the inconsistency can occur

The trigger is deliberately narrow:

1. Server process A starts. It captures its tool definitions, eager input validators and verified build/contract identity.
2. A particular state-kind or product-record validator has not yet been compiled.
3. Packaged files at that same installation path are replaced by version B while A keeps running.
4. The first call needing the cold validator reads its schema from disk and can compile B's bytes.
5. A still advertises A's startup identity and eager tool inputs while validating part of the request/result against B.

Evidence:
- [startup identity:25–50](<../../../../../packages/engineer-agent-workflow-mcp/src/runtime-info.ts#L25-L50>) and [captured identity:64–92](<../../../../../packages/engineer-agent-workflow-mcp/src/runtime-info.ts#L64-L92>);
- [lazy state validator:122–139](<../../../../../packages/engineer-agent-workflow-mcp/src/state.ts#L122-L139>);
- [lazy promise-shared product compiler:71–129](<../../../../../packages/engineer-agent-workflow-mcp/src/product/schemas.ts#L71-L129>);
- [eager input and later output validation:101–172](<../../../../../packages/engineer-agent-workflow-mcp/src/product/tools.ts#L101-L172>).

**What can become wasteful:** unexpected contract rejection, repeated diagnostics or reopen/retry attempts whose reported runtime identity does not explain the active validator. Depending on the scenario, output validation happens after scenario work. No actual deployment failure or replacement experiment was reproduced by the audit.

This is not a claim that validators compile on every request. The existing compiled-validator caches and shared product compilation promise already optimize that. Already-warm validators and immutable installation paths are control cases, not the alleged failure.

## Minimal proposed change

Capture one bounded immutable snapshot of the packaged schemas during serving initialization and bind it to the same verified artifact evidence as startup identity. Lazy compilation can remain; it must compile that snapshot rather than newly replaced path contents.

Before: `startup A identity → later disk read may supply schema B`.

After: `startup A identity + verified schema snapshot A → later lazy compilation uses A`; restarting coherently starts B.

Do not hash every artifact per request, change a running process's identity silently, cache mutable workflow state globally, or invent a universal authorization gate for identity-unavailable processes. Failure to establish the affected coherent contract must be detected before side-effecting work using it. A broader fail-closed policy needs separate scope.

## Focused tests, not a full workflow replay

Extend the existing isolated [runtime identity fixture:62–159](<../../../../../packages/engineer-agent-workflow-mcp/test/runtime-identity.test.mjs#L62-L159>) using copied packages, never a real installed runtime:

| Case | Required observation |
|---|---|
| Cold state validator; replace A files with B | A still validates using coherent A semantics/identity, or rejects an incoherent initialization before relevant effects |
| Cold product-record/output validator; same replacement | No mixed eager-A/lazy-B contract |
| Already-warm validator | Existing A behavior is preserved |
| Immutable versioned paths | No false replacement alarm |
| Fresh process on B | B identity and validation agree |
| Missing/mixed startup artifacts | Existing safe diagnostics plus the specified affected initialization behavior |
| Concurrent invalid requests | No leaking/shared mutable validator error state across requests |

Record actual loaded identity and validator behavior, not merely which stamp is currently on disk. Separately count schema reads/compilations and initialization memory; faster startup is not the primary acceptance criterion.

## Guarantees and dependencies

Preserve schema self-validation, supported definitions, Unicode/domain/sensitivity checks, public envelopes, tool names, safe diagnostics and explicit refresh/restart guidance. Keep request data and integrity audits request-local; consume mutable AJV diagnostic arrays synchronously.

Complexity: medium initialization/contract-ownership change. Coordinate the same runtime identity boundary with [benchmark provenance](<10-development-verification-and-measurements.md>), but do not require a single implementation packet. No skill rewrite, installation action, benchmark or test execution is authorized by this note.
