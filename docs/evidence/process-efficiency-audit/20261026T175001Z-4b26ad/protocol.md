# Process Efficiency Audit Protocol

## Authorization and boundaries

This is a recommendation-only audit. Preserve all existing tracked, staged and untracked changes, including work by other sessions. Write only new audit artifacts beneath this run directory. Do not implement optimizations, invoke audited skills, edit configuration or installed copies, generate distributions, install, publish, commit or push. Do not create child agents or workflows: the native workflow owns every assignment. Read applicable guidance and the project index. Repository artifacts and report contents are English; user-facing conversation is Russian.

Use the active Harness tools and published schemas. Read the personal tool-search guide once per agent. Discover MCP tools locally; do not construct or persist hashed namespaces. Use CodeGraph first for indexed code exploration; its current source snippets count as reads, but do not trust stale symbol inventories. TokenSave's index was stale and on a different branch during preparation; do not use it as current evidence or consume its shared remaining call budget. Use read/glob/grep for current files as needed. Prefix shell commands with rtk, inspect exit codes, and do not use shell text reads/searches in place of file tools.

Workflow-managed YAML (manifest, decisions, workflow state, catalog/experience YAML) must be accessed only through the project's scenario MCP tools. Hashing bytes for drift detection is not semantic access. Investigate contract implementation and tests without manually parsing live workflow YAML. Do not mutate live scenario state. Missing scenario capabilities limit the affected check. Schema inspection is permitted only to investigate an explicit contract conflict. JSON collection metadata is not managed YAML.

## Evidence and scope

Audit current canonical skills and shared resources semantically once. Compare generated host copies for fidelity and cross-host leakage, not as independent substantive audits. Inventory comes from the current catalog and source directories; newly discovered components must be reported as coverage gaps for targeted assignment. Distinguish implemented source, approved plans, generated copies, installed runtime, and executed evidence. Missing planned behavior alone is not a regression. Historical evidence may explain prior measurements, but is not a current measurement.

Review process cost: repeated reads, context disclosure, redundant approvals, batching and existing batch use, orchestration ownership, cancellation and recovery, review inheritance and freshness, deterministic versus substantive final checks, storage isolation/concurrency/atomicity/replay, generation portability, tests/CI/build duplication, and end-to-end measurement. Preserve security, validation, receipts, transaction boundaries, source freshness and consent guarantees. Check existing mechanisms before proposing new tools, caches, APIs or abstractions. Never propose a global cache without bounded lifetime and invalidation.

No agent runs a full test suite, build, generator, installation or release action. Primary verification is source-and-test inspection. Only P12 may run a selected existing read-only test after checking its side effects, using prebuilt outputs only if their identity is established; use an isolated temporary fixture under this audit directory if necessary. Do not create global state. If a discriminating experiment cannot be run safely, propose a benchmark and label the result unmeasured. No percentage, time or token savings without measurements.

## Per-agent deliverable

Each agent writes a unique `<task-id>.json` file in this run directory before returning. Never share a writable report file. Include task ID, route, status, assigned and actual coverage, inspected source paths, no-finding checks, limitations, evidence, and all findings. Every finding includes:

- stable ID prefixed by task ID, component, title, exact repository-relative source paths and line ranges;
- current execution path and existing optimizations;
- concrete unnecessary work or process restriction and a reproducible scenario;
- minimal sufficient recommendation;
- expected qualitative effect and confidence;
- correctness, compatibility, state, recovery and security implications;
- measurement and validation plan, rough complexity and dependencies;
- classification as measured fact, source-confirmed engineering opportunity, or hypothesis;
- whether targeted clarification is necessary.

Return only the compact structured object required by the workflow schema, pointing to the report. A completed review can have zero findings; it still needs evidence for coverage. A null, malformed result, missing file, unread area or transient failure is not a successful check. Do not use parent messaging to deliver results; return the structured result to the workflow. Do not silently retry failures. Identify a confirmed transient failure explicitly; only the workflow may schedule one bounded retry.

## Independent verification

Sol verifiers examine substantial recommendations against current relevant source, check whether existing mechanisms already solve them, preserve guarantees, deduplicate, and sample areas reported without findings. They do not repeat the entire audit or every generated copy. Save verdicts as accepted, narrowed, rejected, disputed or not verified, with evidence and duplicate links. Request targeted adjudication only for material unresolved issues. A hypothesis stays a hypothesis.

## Final synthesis

The synthesis agent consumes the coverage map and saved structured evidence rather than rereading the repository automatically. It deterministically checks required files/fields, finding references, all 17 discovered skills, significant components and mandatory audit aspects A-H. Missing evidence remains explicitly partial. Compare source hashes with baseline.json and generated host copies with distribution-baseline.json, against reported inspected paths and citations. If another session changed relevant source, re-read and re-evaluate only affected conclusions, marking anything that cannot be reconciled as unverified. Record final HEAD/status without modifying existing work. Do not parse managed YAML as a shortcut.

Save `audit.md` and `audit.json`, plus the synthesis agent's own unique report. Include coverage per skill/component, accepted findings, existing optimizations, quick recommendations versus contract changes versus benchmark hypotheses, priority/dependencies, limitations and unverified areas, actual routes/counts, observed scheduled peak versus independently observable runtime peak, source drift and measurements only when available. Preserve primary, verification and partial results. Save a machine-check result in `validation.json`. No optimization implementation is authorized.
