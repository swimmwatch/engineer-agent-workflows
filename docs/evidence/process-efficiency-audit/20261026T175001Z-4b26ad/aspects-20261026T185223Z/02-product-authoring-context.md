# Scope — product-authoring context and current document preflight

- **Finding IDs:** P02-F01, P02-F02 and P09-F01. These are three different ownership points, not one generic caching problem.
- **Affected skills:** [idea-refine](<../../../../../skills/idea-refine/SKILL.md#L21-L38>), [product-definition](<../../../../../skills/product-definition/SKILL.md#L14-L23>), [technical-design](<../../../../../skills/technical-design/SKILL.md#L14-L19>) and [product-roadmap](<../../../../../skills/product-roadmap/SKILL.md#L12-L19>).
- **Direct MCP consumers:** durable product authors call interview/scope and stage tools. P09-F01 directly affects Definition/Technical semantic authoring loaders, **not** all four skills; Idea shares the Definition module but is not thereby proven to have the same duplicate-document scenario. Roadmap is a reuse precedent.
- **Evidence status:** source-confirmed, independently checked, not runtime reproduction. The follow-up reuses evidence after the 2026-10-26 18:52:23Z comparison found all 447 source and 459 distribution hashes unchanged.
- **Basis:** [scope reuse audit](<../audit.md#L170-L195>), [role disclosure audit](<../audit.md#L197-L217>), [snapshot audit](<../audit.md#L441-L463>), [V01 scope qualification](<../V01.json#L102-L128>) and [V02 preflight verification](<../V02.json#L107-L130>).

## P02-F01 — avoid an unnecessary new scope proposal on unchanged resume

### Current flow and conditional failure

1. A durable author opens the product, creates/exactly resumes its candidate where applicable, then calls `product_interview_resume` and reuses applicable actual answers.
2. The next instruction still says `product_scope_propose`, followed by the native question tool, `product_question_answer` or `product_question_no_answer`, then `product_scope_confirm`.
3. Suppose scope was already confirmed, and confirmation or a semantic write has advanced the candidate's current source version. The user only requests continuation, not a scope change.
4. Repeating the proposal with that latest context is a **new** version-bound operation. It opens a new unresolved scope question and clears `confirmed_answer`.
5. The actor may now ask the user to repeat an unchanged choice and cannot use profile guidance until confirmation is restored.

This is a conditional instruction-following risk. The same entries already require answer reuse; a careful actor may avoid the extra proposal. Intentional new proposals resetting confirmation are not an idempotency defect.

**Exact instruction evidence:** [Product Definition:28–35](<../../../../../skills/product-definition/SKILL.md#L28-L35>), [Technical Design:17–19](<../../../../../skills/technical-design/SKILL.md#L17-L19>), [Roadmap:14–17](<../../../../../skills/product-roadmap/SKILL.md#L14-L17>), [Idea:31–38](<../../../../../skills/idea-refine/SKILL.md#L31-L38>) and [shared interview:128–149](<../../../../../shared/references/product-workflow.md#L128-L149>).

**Exact MCP evidence:** [resume:782–835](<../../../../../packages/engineer-agent-workflow-mcp/src/product/interview.ts#L782-L835>) reports unresolved questions or completion, not confirmed scope; [draft replay:865–873](<../../../../../packages/engineer-agent-workflow-mcp/src/product/interview.ts#L865-L873>) returns current candidate context; [proposal:997–1031](<../../../../../packages/engineer-agent-workflow-mcp/src/product/interview.ts#L997-L1031>) distinguishes exact replay from a new proposal. [Replay identity:588–621](<../../../../../packages/engineer-agent-workflow-mcp/src/product/interview.ts#L588-L621>) includes the original selected version.

### Minimal before → after

**Before:** “resume and reuse answers; propose scope” leaves the already-confirmed branch implicit.

**After recommendation:** explicitly reuse the same candidate's applicable current confirmed scope **only with authoritative scope and actual-answer provenance**. Propose/ask/confirm for unresolved or materially changed scope, profiles or applicable upstream inputs.

Example: continuing the same confirmed Standard/core PRD should not itself create another question. Changing to Deep/security is a real new choice and must follow the existing actual-answer path.

**Unresolved dependency:** no cold-context reader has been established by this audit as supplying all required current scope and exact confirmation provenance. [Candidate record retrieval:420–477](<../../../../../packages/engineer-agent-workflow-mcp/src/product/interview.ts#L420-L477>) requires an already-known decision/research identity; [published handlers:270–321](<../../../../../packages/engineer-agent-workflow-mcp/src/product/tools.ts#L270-L321>) do not establish a general scope inventory. This is not proof that every other published route is insufficient. **No new API, scope-get tool or resume-result extension is promised.**

### Guarantees and focused tests

- Never substitute memory, defaults, an upstream pin, another candidate, or decoded opaque context for current confirmation evidence.
- Keep actual native-answer provenance, append-only history, profile gating, source-version conflicts, exact old-request replay and the intentional reset semantics of a genuinely new proposal.
- Extend [interview regression controls](<../../../../../packages/engineer-agent-workflow-mcp/test/product-interview.test.mjs#L240-L323>): show latest-context unchanged reproposal resets confirmation; show exact original replay does not duplicate it; preserve no-answer rejection.
- In [product authoring skill checks](<../../../../../tests/product-authoring-skills.test.mjs#L118-L141>), propose current-context unchanged-resume and cold-context cases. Reuse is allowed only when authoritative evidence is actually available. Include changed profiles, changed upstream pins, pending scope and dismissed answer controls.
- Preserve [Technical Design ordering controls](<../../../../../tests/product-authoring-skills.test.mjs#L409-L467>): architecture/material-answer obligations must not disappear behind resume reuse.
- **Confidence/limit:** high on reset/replay behavior, medium on wording risk; actual reprompt frequency and cold-context route remain unverified.

## P02-F02 — disclose protocol detail to its owning role

### Current exposure in steps

1. Every durable stage author is told to read the entire shared product protocol before stage work. Standalone Idea already avoids that path.
2. A fresh PRD author therefore receives task Specification/Planning/packet reconciliation detail and Roadmap retirement recovery even though it must stop before those operations.
3. The same source also contains detailed independent-review procedures. The author needs the handoff obligation, but the independent reviewer needs its own complete owned procedure and sources.

See [Idea durable routing:21–30](<../../../../../skills/idea-refine/SKILL.md#L21-L30>), [PRD startup:14–23](<../../../../../skills/product-definition/SKILL.md#L14-L23>), [Technical startup:14–16](<../../../../../skills/technical-design/SKILL.md#L14-L16>) and [Roadmap routing:12–19](<../../../../../skills/product-roadmap/SKILL.md#L12-L19>).
The verified shared source combines [consumer/retirement detail:20–124](<../../../../../shared/references/product-workflow.md#L20-L124>), [interview/recovery:128–173](<../../../../../shared/references/product-workflow.md#L128-L173>) and [independent review:180–240](<../../../../../shared/references/product-workflow.md#L180-L240>).

**Before → after:** keep an unconditional shared safety/access/pins/consent/stage-boundary/recovery-stop base and short author-to-reviewer handoff; route detailed task-consumer, retirement and reviewer procedures before their respective owning operations. Prefer reliable section delivery; split canonical references only if necessary. This is instruction routing, not fewer MCP validation calls.

Example: a new durable Idea still receives exact-pin, no-consent-by-default and no-YAML-fallback rules. It does not need task-queue reconciliation instructions merely because those are in the same current source. A later authorized retirement actor must receive those retirement/recovery obligations before acting.

### Guarantees and focused tests

- Move obligations; do not delete or hide prerequisites, untrusted-source rules, secret exclusion, native-answer provenance or current-source requirements.
- Keep explicit-only stage stops and independent reviewer source delivery. Authors cannot consume a reviewer's sources on its behalf.
- Build an obligation-to-role map in [product authoring checks](<../../../../../tests/product-authoring-skills.test.mjs#L118-L141>): ordinary Idea/PRD/Technical/Roadmap, retirement, task consumers and reviewers each reach all owned clauses before first use, including recovery. Missing unconditional safety or reviewer inputs must fail.
- Keep the resource enumeration and digest contracts in [bundle enumeration:15–35](<../../../../../shared/scripts/verify-product-workflow.mjs#L15-L35>) and [digest construction:171–190](<../../../../../shared/scripts/verify-product-workflow.mjs#L171-L190>) coherent with any routing change.
- **Confidence/limit:** high that unrelated instruction exposure is required today; distraction, reasoning latency and net savings were not measured. Do not infer token savings from source line counts.

## P09-F01 — consume the already-built Definition/Technical snapshot

### Different problem: internal same-preflight duplicate work

1. A tool such as `prd_define_capability` or `technical_define_boundary` enters semantic authoring; internal `defineElement` / `defineTechnicalElement` perform exact operation replay lookup and current `loadState` preflight.
2. The current loader calls `listProductDocuments(limit:1)`. Listing builds the **complete** candidate/document snapshot, parses documents and validates draft membership before slicing metadata.
3. That result is discarded. The caller reloads candidate, registry and every draft document and parses them again for its specialized validation.
4. Several registered documents therefore cause duplicate acquisition/parsing in one successful current authoring preflight. `limit:1` does not bound the underlying snapshot work.

Exact evidence: [Definition loader:393–455](<../../../../../packages/engineer-agent-workflow-mcp/src/product/definition.ts#L393-L455>), [Technical loader:373–443](<../../../../../packages/engineer-agent-workflow-mcp/src/product/technical.ts#L373-L443>), [snapshot:534–639](<../../../../../packages/engineer-agent-workflow-mcp/src/product/documents.ts#L534-L639>) and [list slicing:922–955](<../../../../../packages/engineer-agent-workflow-mcp/src/product/documents.ts#L922-L955>).

**Before → after:** discard a full list snapshot, then reload → use existing `loadProductDocumentSnapshot` values inside that same `requireCurrent=true` preflight. [Roadmap's loader:405–479](<../../../../../packages/engineer-agent-workflow-mcp/src/product/roadmap.ts#L405-L479>) is an existing scoped reuse example, not a reason to add a global cache.

Example: defining one PRD capability in a candidate with several documents should reuse the already acquired document/parse values, while still applying PRD-specific registry, digest/direct-edit and provenance checks. It must not reuse that preflight through lock acquisition or a later recovery attempt.

### Guarantees and focused tests

- Keep specialized `validateRegistry`, artifact/identity checks, exact digests, direct-edit rejection, upstream/provenance and complete inventory/membership validation. Generic snapshot validation is not an equivalent substitute.
- Preserve regular-file/path/link/size guards, sensitive-input screening, transaction target freshness, exact replay and unchanged-byte write avoidance.
- Do not force current-snapshot acquisition into `requireCurrent=false` replay/recovery paths; no cross-request mutable cache or sharing through transaction entry.
- Extend [Definition controls:507–558](<../../../../../packages/engineer-agent-workflow-mcp/test/product-definition.test.mjs#L507-L558>) with instrumented multi-document read/parse counts and identical results/operation identity; retain member-order replay, sensitive-input no-write and CRLF cases.
- Extend [Technical controls:573–658](<../../../../../packages/engineer-agent-workflow-mcp/test/product-technical.test.mjs#L573-L658>) with direct edit, malformed registry, unregistered file and stale-target no-write cases; retain missing upstream/foreign reference rejection.
- Preserve [stricter registry regression:125–142](<../../../../../packages/engineer-agent-workflow-mcp/test/product-source-audit.test.mjs#L125-L142>). A faster loader accepting a malformed domain registry is not an improvement.
- **Confidence/limit:** high for discarded-snapshot duplication; runtime magnitude unknown. Later instrument server-only reads/parses and wall/CPU work separately from model time; no measured saving is claimed.

## Change ownership and dependencies

| Finding | Canonical skill text | Shared text | MCP code / other owner |
|---|---|---|---|
| P02-F01 | Four product entries need a clear unchanged-resume branch. | Shared interview must express the same branch. | Product interview/discovery owner must first establish cold-context evidence retrieval. A reader extension remains unproven, not committed scope. |
| P02-F02 | Entries route to the applicable protocol sections. | Product-protocol owner preserves the unconditional base and role obligations. | No new runtime mechanism; distribution owner coordinates resources, digests and generated hosts. Coordinate task-consumer and independent-review owners. |
| P09-F01 | No skill instruction change is required to remove duplicate loader work. | No protocol split or quality-manual change is required. | Definition/Technical and document-snapshot owners retain specialized validation; coordinate the product transaction owner on the freshness boundary. |

All proposed changes, generation and checks require separate implementation authority. This follow-up changed explanation files only; it ran no product tools, tests or benchmarks.
