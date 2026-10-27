# TASK-0001: Generate the DeepSeek Harness filesystem collection

Requirements: DSH-001, DSH-002, DSH-003, DSH-004.
Authorization: explicit user request to implement the supplied plan.

Implement the third host in the shared renderer and closed catalog. Preserve
canonical ownership and Codex/Claude packaging, render shared instructions before
hashing, and safely manage exports/deepseek-harness without touching siblings.
Keep all 17 complete bundles within established budgets and explicit-only.

RED: new tests must fail on unsupported host, missing export/policy and missing
managed-root behavior. GREEN: pass those tests and the affected existing tests.
PROVE: test tampering and rollback, verify exact upstream provider loading in
temporary state without model calls, then run lint, full tests, validate and
generate:check. Record actual results and limitations in the current handoff.

No installation, MCP configuration, commits or publication is authorized.
