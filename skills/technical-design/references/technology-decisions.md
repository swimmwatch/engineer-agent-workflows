# Technology decisions before review

Read after scope confirmation. Inventory existing constraints, accepted choices
and research evidence before asking questions or creating technology records.
Separate user-owned tradeoffs from facts that can be checked in the repository
or current official documentation. Reuse explicit answers with their provenance;
never turn a research recommendation into user consent.

For each material choice, capture the problem, applicable PRD references,
alternatives, evidence, rationale, constraints and conditions for revisiting it.
Ask unresolved material tradeoffs through the host's native question tool and
persist the actual answer. Research only the current decision. Do not manufacture
an exhaustive stack catalogue, introduce frameworks to fill a template, or expand
shared Technical Design into implementation algorithms.

For new and resumed candidates, the owning Technical Design gate applies to
every direct or session-wrapped candidate check and review start. Never use them
to diagnose retained drafts before presenting current architecture and recording
applicable material answers. Inspect saved evidence through read-only scenarios
first; the generic shared authoring check does not override this stage's order.

Before `product_candidate_check` or `product_review_start`, show the architecture
to the user. A proportionate component diagram names responsibilities, boundaries
and dependencies. Explain request/response and data flows, including failure
paths where material. Identify owners of databases and other durable state, and
who reads and mutates each. Keep the presentation inspectable before review;
saved records alone are not a visible architecture presentation.

Treat unverified integrations as assumptions with required validation, evidence
owners and revisit conditions. Do not assert that an integration works from a
recommendation or an untested sketch. N/A needs a concrete reason: a local
stateless formatter needs no database or integration catalogue, but still shows
its component and input/output flow. Do not add infrastructure to fill a checklist.

Finish material choices before final candidate checking and independent review.
An unresolved user-owned tradeoff, omitted relevant diagram/flow or hidden state
owner keeps readiness on hold; record the gap instead of guessing an answer.
Use `technical_define_boundary` for ownership, inputs, outputs, flows and errors;
`technical_define_technology` for supported choices; `technical_define_policy`
for cross-cutting rules with exact authoritative-contract references. Keep stable
upstream PRD pins throughout. If an upstream change is required, return that issue
to its owner and preserve a draft rather than finishing downstream review against
inputs already known to be changing.

The shared product workflow owns the review protocol. Use its semantic blocks
and bounded batch operations; do not create an extra technology-specific review
loop or save a separate verdict for every reference and relation.
