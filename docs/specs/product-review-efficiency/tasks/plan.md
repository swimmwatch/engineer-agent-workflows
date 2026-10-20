# Implementation checkpoints

1. Baseline, specification and discriminating regression fixtures.
2. Canonical semantic inventory, indexed storage, staged verification and legacy migration.
3. Bounded batch API, consistency completion, replay and recovery.
4. Authoritative skill instructions, documentation and generated host artifacts.
5. Correctness, performance, isolated agent qualification and final repository checks.

Ownership: product review owns semantic inventory and verdicts; product storage
owns digest-checked immutable reads; product operations owns atomic commits and
recovery. Only review operations may select staged generation verification.
Schemas remain authoritative in shared/schemas; both host bundles are generated.

No checkpoint may silently remove review scope, weaken source checks outside the
agreed staged policy, mutate consumer products, or install globally.
