# Implementation checkpoints

1. **Scope and storage**: rename the package; bounded specification discovery,
   context, proposal and confirmation; schema-backed safe YAML persistence.
2. **Interview and decisions**: scenario-specific question, answer, non-answer,
   fact, assumption and traceability tools; append-only restart-safe history.
3. **Design system**: shared catalog, components, variants, overrides, tokens,
   export registration and safe removal.
4. **Screen experience**: screens, states, transitions, instances, responsive
   and content rules, export registration and safe removal.
5. **Stage checks**: specification, shared design and screen consistency checks,
   stale exports, partial failures, concurrency and security regressions.
6. **Integration**: tool contracts, narrowly routed skill references, generated
   bundles, package inventory and full repository regressions.
7. **Decision-linking maintenance**: additive single and atomic batch linking,
   conflict recovery metadata, safe project-aware YAML formatting, generated
   guidance and real-fixture regression coverage.

Each checkpoint follows tests first (meaningful RED), implementation, GREEN and
actual stdio E2E. Reopen a failed checkpoint before proceeding. Do not weaken a
correct check. Documentation is part of each checkpoint, not a review gate.
