# Separate Design Planning And YAML Contracts

## Current Contract

The user requested a separate design-planning skill after the main plan, selected
by the manifest, with separately installed Penpot skills rather than copied API
instructions. The user explicitly limited formal YAML contracts to four common
files; API/event/data profile formats are unchanged.

The collection now has 16 explicit-only workflows. `design-planning` depends on
matching main planning and its specification dependency. Main planning leaves
design-dependent packets pending and does not invoke design work. The new stage
prepares the declared design and updates affected packet sources/checks/handoff,
then stops before implementation. No declared design outputs means no design
stage; existing screenshot or archive presence is not the trigger.

Penpot operation recipes remain upstream. The new reference supplies a bounded
brief, single routing owner, scope limits and return contract. Missing installed
skills or MCP capabilities block dependent work without installation or fallback.
Upstream checkpoints are preserved. No global client instructions are installed.

Root `shared/schemas/` owns four Draft-7 schemas: manifest, decisions, component
catalog and experience. Matching copies are generated into the four connected
workflows. Only relevant schemas are loaded at runtime. The decision schema keeps
protocol-1 extension compatibility; all actual journal inspection/validation
still goes through the MCP. Other schemas reject unknown top-level keys and
provide an explicit `extensions` mapping for task metadata.

Schema checks establish shape, not source truth. Cross-file IDs, current slug,
allowed overrides, source freshness and actual native export hashes still need
verification. Pending snapshots have null digests; examples do not supply consent.
Existing histories and legacy designs are not migrated automatically.

## Verification Scope

The initial separate-stage test failed because the skill was absent. Three schema
tests failed because the four schema files were absent. These RED results and a
pre-edit source snapshot are preserved in private run
`2026-09-05-design-stage.DscFUf`.

Maintenance tests cover invalid scope/type/path cases, malformed decision
questions/answers, incomplete component/transitions and fake verified status.
Existing relationship mutations cover wrong library/component/variant IDs,
transition targets, specification paths and snapshot pins. Bundle tests include
the new dependency chain and both host-local verifier commands.

Root development dependencies pin the already-present Ajv 6.15.0 and YAML 2.9.0
for repeatable schema tests; no runtime dependency or new package version was
added to installed skills. JSON Schema follows the
[Draft-7 validation contract](https://json-schema.org/draft-07/draft-handrews-json-schema-validation-01).
The external routing reference is pinned to the inspected
[Penpot AI Kit router revision](https://github.com/penpot/penpot-ai-kit/blob/c63d8e3717323fad859e794848e5a602b155a7ec/skills/penpot-router/SKILL.md).

No live Penpot operation, native model trial or independent model review has been
run for this candidate. Penpot MCP/skills installation and global configuration
remain outside scope. Earlier parent Packet 14 and MCP Packet 03 remain incomplete;
stable full matrix passes remain 0 of 2. Local tests do not close that campaign.

## Local Results

- `npm test`: 212 passed, 0 failed, 0 skipped, including the MCP package build.
- `npm run lint`: passed (workspace lint).
- `npm run validate:foundation`: passed, 16/16 skills.
- `npm run generate:check`: passed for both generated host bundles.
- Codex quick validators: specification, planning, design planning and incremental
  implementation all passed; the new entrypoint is below the 4,096-byte limit.
- `git diff --check`: passed.
- Actual stdio Decision Ledger MCP read-back passed for
  `ui.separate-design-planning` and `state.four-yaml-contracts`.

The schema and bundle tests do not establish real model routing. On a separately
authorized qualification run, check: backend without design; UI with unchanged
inline contracts; new UI with declared design outputs but no existing files;
missing Penpot skills/MCP; and a completed design stage returning exact verified
references to its pending packets. Main planning must stop before invoking the
design stage, and neither stage may execute production implementation.
