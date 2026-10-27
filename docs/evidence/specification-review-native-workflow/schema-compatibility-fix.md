# Native Workflow Schema Compatibility Repair

Status: Schema repair verified. Full P04 qualification remains incomplete.

The user's explicit follow-up authorized the canonical schema correction,
retention of existing limits, regression coverage and regeneration. This is
bounded P01/P02 rework; it does not execute the remaining P04 model workload.

## Corrected behavior

The canonical source at
`skills/spec-driven-development/workflows/specification-review.body.js` now
uses the pinned Harness JSON Schema subset. Nullable strings use `oneOf` with
string and null branches. Nullable objects put their complete object schema,
required fields and closed-property rules inside the object branch. Native
schema declarations no longer contain type arrays or `maxItems`.

All existing response fields, required fields, enums and null states are retained.
Workflow checks retain the twenty-item group, acknowledgment and expansion-key
bounds. The saved scope-expansion envelope's existing hundred-index bound is
now explicitly enforced after its identity/protocol checks. This bounds the
compact envelope, not the review inventory or total workload. Existing byte
budgets, lane scheduling, freshness, saved-result ownership and main-actor MCP
verification remain unchanged.

The existing generator produced the Harness script and Claude script from the
same canonical source. No generated artifact was hand-edited; Codex still has
no foreign native workflow body. No dependency or production MCP change was made.

## Regression coverage

`tests/specification-review-workflow.test.mjs` adds:

- An always-on declaration check against the pinned host subset, plus actual
  response checks preserving required fields, closed objects, enum/type rejection
  and legitimate null states.
- Both judging stages' twenty/twenty-one expansion-key boundary.
- Zero/hundred/hundred-and-one saved-expansion indices, checking the actual
  workflow recovery branch rather than relying on a schema keyword.
- An opt-in real native-validator check over canonical, Harness and Claude
  bodies, with both detailed and final schemas observed for each body.

Set `EAW_HARNESS_TOOLS_MODULE` to an explicit prepared tools module to execute
the real-validator test. The portable declaration guard runs without an external
runtime; missing native capability is reported as a skip, not a native pass.
No model or native engine is launched by this validator check.

An older saved-expansion test fixture omitted fields already required by the
original schema, including its index list and envelope context. The fixture now
returns a complete protocol envelope and enables schema validation. Its intended
outcome assertions were preserved, strengthening rather than bypassing the check.

## Verification

- RED: before implementation, 31 of 34 workflow tests passed and three relevant
  assertions failed: native declaration compatibility, the hundred-index runtime
  bound and acceptance by the actual native validator.
- GREEN: 61 focused checks passed, including all 34 workflow checks with the
  copied rc.2 validator, packaging and local P04 preflight tests. A further
  94 integration/regression checks passed, including all 14 real-MCP protocol
  scenarios and the owning packaging/export/model-role/specification/efficiency
  checks. The pinned rc.3 validator check also passed. Total: 156 passing test
  executions, zero failures/skips.
- The rc.3 oracle uses the exact bundled validator from upstream commit
  `22ddee3792402c3e70ec5f86a63c3e3e895a2f60`; its inspected guest-source module
  retained SHA-256
  `ddeb4c404dfd88ff13518238a7b4fc2acf0da8bcb8deb2e108e41a449946e0a3`.
  Only an extra private export exposes the unchanged validator. This is not a
  claim of full native runtime qualification.
- PROVE: 8/8 compiling defects were detected in a disposable copy: restored type
  arrays, unsupported keywords, lost hundred-index and twenty-key limits,
  missing required fields, open response objects, misplaced `oneOf` constraints
  and a stale generated Harness artifact. All variants were restored and the
  temporary copy removed; production was not mutated.
- `npm run generate`, `npm run generate:check` and `npm run validate` passed;
  the latter two verified the complete 17-skill distribution.

The [fresh copied-client preflight](schema-compatibility-result.json) now reports
both native schemas as pass with zero violations. It retains `status: incomplete`
because the copied runtime is rc.2 rather than the pinned rc.3 and full native/
model qualification is still outstanding. It selects `reconcile_host_version`,
not `repair_schema_compatibility`. No model requests were made.

## Remaining P04 work

The original [failed preflight](p04-preflight.md) and its fingerprints are retained
as historical evidence. Its schema blocker is resolved by this repair. P04 still
requires host-version reconciliation, completion of its native execution runner,
actual route discovery/user choice, four model reviews, all-actor measurements
and native cancellation/cleanup evidence. P05 is not started. No installation,
global mutation, shared-server refresh, commit or publication occurred.

Next separately invoked implementation work is P04; its host/model decisions
remain with the user. Local schema acceptance is not approval of those trials.
