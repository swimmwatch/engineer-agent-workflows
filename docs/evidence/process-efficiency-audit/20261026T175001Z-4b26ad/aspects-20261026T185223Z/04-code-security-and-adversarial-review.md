# Scope — source-bound follow-up and independent adversarial review

- **Finding IDs:** P03-F01 and P03-F02. Share a compact identity convention if useful; do not merge deterministic check reuse with independent semantic judgment.
- **Affected skills:** [code-review-and-quality](<../../../../../skills/code-review-and-quality/SKILL.md#L16-L38>), [security-and-hardening](<../../../../../skills/security-and-hardening/SKILL.md#L17-L40>) and [doubt-driven-development](<../../../../../skills/doubt-driven-development/SKILL.md#L26-L44>).
- **Direct MCP consumers:** none established or required by these findings. These are standalone skill instructions. Doubt-driven review uses a fresh-context **host-native** reviewer, not product-review MCP machinery. Shared state/test guidance is precedent, not an automatic dependency or tool-calling actor.
- **Evidence status:** source-confirmed report/freshness omissions, independently verified; no runtime reproduction of broad reruns, stale review or savings. At 2026-10-26 18:52:23Z all 447 source and 459 distribution hashes were reconfirmed unchanged, so this explanation reuses the audit evidence.
- **Basis:** [follow-up audit:244–264](<../audit.md#L244-L264>), [adversarial audit:266–285](<../audit.md#L266-L285>), [V01 follow-up qualification](<../V01.json#L181-L200>) and [V01 independent-review verification](<../V01.json#L204-L222>).

## P03-F01 — enough identity in the existing review report

### What already works

Code review already establishes a comparison range, accepts narrow requested scope, inspects concrete evidence and reports check status. Security review already scopes trust boundaries and returns a bounded report. Neither instruction forces a later correction review to repeat the entire original inspection.

The omission is narrower: the first report does not explicitly preserve sufficient comparison/input identity, check-to-input relevance, exclusions and remaining follow-up scope for a different later invocation.

### Conditional scenario in steps

1. A first explicit code/security review inspects a scoped change and emits prose findings.
2. The implementer changes the relevant source, potentially including dirty or untracked files.
3. A new explicit request asks another reviewer to verify corrections using the old prose report.
4. That reviewer must reconstruct the original comparison, affected boundary, prior checks and which inputs stayed unchanged.
5. Ambiguity can cause unnecessarily broad deterministic rechecking, or inappropriate reliance on an old pass. Existing narrow scoping can already avoid this when the user supplies enough information.

Exact source: [code review:16–38](<../../../../../skills/code-review-and-quality/SKILL.md#L16-L38>) and [security review:17–40](<../../../../../skills/security-and-hardening/SKILL.md#L17-L40>). [Existing evidence reuse:136–147](<../../../../../shared/references/test-discipline.md#L136-L147>) already binds evidence to owner, purpose, inputs and state; it does not make every standalone review depend on that manual.

### Minimal before → after recommendation

**Before:** findings and check results can leave a subsequent actor to infer the comparison/input boundary.

**After:** add a compact identity and exclusions/remaining-findings note to the **existing** bounded report, particularly when follow-up is expected. On an explicitly requested follow-up, inspect the correction and affected interactions; reuse only demonstrably unchanged deterministic evidence and expand when relevant influence is uncertain.

Example of the information, not a new report schema:

> Compared the requested base/target; included the current dirty authorization handler and its untracked regression fixture. The recorded deterministic check covered those exact inputs and the then-current policy configuration. Finding A remains unresolved; deployment configuration was excluded.

A commit identifier alone cannot identify relevant dirty/untracked bytes. Conversely, a small immutable one-shot comparison may need no extra identity mechanism beyond its existing references. Do not require whole-tree hashes, a separate check/input ledger or a new durable artifact.

### Guarantees that cannot be removed

- A prior pass is not inherited across changed inputs or uncertain dependency influence. Fresh substantive judgment of the corrections and interactions remains necessary.
- Changed privilege assumptions, shared policy, configuration, dependency provenance or threat assumptions invalidate affected security evidence even if the local fix is tiny.
- Missing/corrupt old evidence triggers affected-input rereading, not a fabricated inherited pass. Keep unresolved or unverified findings visible.
- Implementation self-checks and another actor's source consumption do not become independent review.
- The report is evidence, not a lock, authorization, workflow state or durable cache. Redact secrets and personal paths.
- Reviews remain optional, explicit invocations. No implementation-completion/next-packet gate, clean-tree requirement, new schema, shared manual or storage service is introduced.

### Focused discriminating checks — proposed only

Use [modeled code-quality checks:119–129](<../../../../../tests/code-quality-skills.test.mjs#L119-L129>) and [evidence/control checks:233–268](<../../../../../tests/code-quality-skills.test.mjs#L233-L268>) as existing test owners, not as proof of actual skill efficiency.

1. **Unchanged deterministic input:** retain scoped input/check identity; allow only that evidence to be reused while freshly judging the correction.
2. **Dirty/untracked drift:** same commit, different relevant bytes; reject inherited evidence and reread affected inputs.
3. **Security assumption drift:** unchanged function, changed authorization policy/configuration; invalidate the affected security pass.
4. **Missing prior report:** perform a useful ordinary scoped review without inventing history or requiring a ledger.
5. **Interacting fix:** a small correction changes a shared boundary; expand review rather than treating line-count size as influence proof.
6. **Tiny one-shot control:** no unnecessary exhaustive identity bookkeeping. Compare its added cost against any multi-round benefit in a later authorized trial.

**Confidence/measurement limit:** high that explicit handoff identity is absent; medium that it helps follow-up. Avoided broad work is a hypothesis, not a demonstrated forced-rerun defect. A later matched trial should compare defect discovery, reconstruction steps, repeated deterministic work, deliveries and wall time, including bookkeeping cost. No numeric saving is claimed.

## P03-F02 — the independent reviewer must judge the same artifact/contract

### Existing flow and source mismatch scenario

1. The parent inspects a decision and extracts the smallest reviewable artifact and applicable contract.
2. The skill dispatches a fresh-context host-native read-only adversarial reviewer, excluding the claim, prior reasoning and desired verdict.
3. While that review runs, a mutable artifact **or its applicable contract** changes.
4. The reviewer consumes one version; the parent reconciles against another. Fresh conversation context alone does not prove equal source identity.
5. The existing reconciliation may notice drift, but dispatch/consumption/reconciliation identity and its recovery rule are not explicit. No actual missed-drift incident was observed.

Exact flow: [neutral packet and reconciliation:26–44](<../../../../../skills/doubt-driven-development/SKILL.md#L26-L44>). [Actor-specific source guidance:118–129](<../../../../../shared/references/workflow-state-access.md#L118-L129>) distinguishes exact delivery from retained names or summaries; it is precedent, not a product-MCP dependency for this standalone skill.

### Minimal before → after recommendation

**Before:** neutral artifact/contract packet plus fresh conversation, with mutable-source identity implicit.

**After:** include an existing immutable reference or sufficient scoped content identity; identify what the reviewer actually consumed; compare relevant identities before the parent's recommendation. Preserve substantive reconciliation of **every** finding.

Example: the artifact is a proposed boundary change and the contract is the allowed privilege transition. If only the privilege contract changes during review, matching artifact bytes do not make the old review current. Retain that review as historical and obtain fresh independent review of the affected scope. Broaden if influence cannot be bounded.

An already immutable supplied artifact/contract can use its existing identity. It does not need another snapshot file, whole-tree hash or storage mechanism.

### Guarantees that cannot be removed

- Source identity is neither semantic correctness, comprehension, independence nor consent. Matching identities never replace judgment or parent reconciliation.
- The reviewer must consume its own artifact/contract. Do not forward the entire prior session, claim, desired verdict or parent's reasoning.
- Preserve the fresh-context host-native requirement. If independent review is unavailable, including after drift, disclose the limitation and stop; do not substitute self-review, implementation checks or an unauthorized external CLI.
- Keep all current material concerns, counterexamples, missing evidence, reversibility and smallest-safe-experiment reasoning. Experiments remain proposals without separate authorization.
- Do not lock or write reviewed sources, impose a clean tree, create a global cache, leak secrets or require a new product-review ledger.
- On drift, old findings remain historical, not silently reinterpreted as current. Stable inputs should not trigger an automatic second review.

### Focused discriminating checks — proposed only

Extend [fresh-context review assertions:147–172](<../../../../../tests/code-quality-skills.test.mjs#L147-L172>) and [modeled neutral packet:75–97](<../../../../../tests/fixtures/code-quality/doubt-driven-development/scenarios.json#L75-L97>):

1. Artifact-only drift between dispatch and reconciliation is detected before a current recommendation.
2. Contract-only drift is detected even when artifact identity matches.
3. Immutable stable control reuses existing identity and does not force another reviewer invocation.
4. Reviewer-consumed identity differs from the parent's assumed input: retain the mismatch, request affected fresh review, and do not claim current independent validation.
5. Fresh reviewer unavailable after drift: report the blocker, preserve historical findings and stop rather than self-review.
6. Seed a cross-contract defect to ensure narrowed rereview expands when impact is uncertain. Keep no-claim/no-prior-reasoning/no-desired-verdict and no-self-review assertions.

**Confidence/measurement limit:** high for missing explicit source binding; drift incidence and net savings are unmeasured. A separately authorized asynchronous trial could compare mismatch detection, false stale flags, clarification rounds and stable-case overhead. Modeled expectations are not runtime outcomes.

## Ownership and dependencies

- **Canonical skill text:** code/security owners add compact follow-up information to their current report conventions; the doubt-driven owner adds dispatch/consumption/reconciliation binding and drift disposition. Neither adds mandatory review invocation.
- **Shared text:** existing deterministic evidence-reuse and actor-source rules provide precedent. Reuse a few consistent terms if useful; no new common framework or automatic dependency is justified.
- **MCP code:** no change required by these findings. Existing product/specification review machinery has different contracts and must not be presented as missing standalone infrastructure.
- **Tests/distributions:** the code-quality fixture owner handles proposed modeled cases; generator/distribution owner handles matching host updates only under separate authority. No tests, generators, builds or reviewer experiments were run here.
- **Dependency distinction:** P03-F01 concerns sequential follow-up and unchanged deterministic evidence; P03-F02 concerns asynchronous independent semantic review. A common compact identity convention may help both, but one cannot substitute for the other.
