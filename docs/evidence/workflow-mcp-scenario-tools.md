# Scenario Workflow MCP Checkpoints

The user authorized sequential implementation of six checkpoints. No global
installation/configuration, publication, commits, consuming-project changes or
live Penpot actions are part of this work.

| Checkpoint | Discriminating failure | Verification after correction |
| --- | --- | --- |
| CP1: scope/storage | Scenario tools absent over actual stdio | 28 package tests; scope proposal, exact answer, confirmation, restart replay, isolated contexts and packing |
| CP2: interviews | Interview scenario commands absent | 29 package tests; dismissal recovery, answers, append-only revisions, exact bounded lookup and preserved comments |
| CP3: shared design | Catalog commands absent | 30 package tests; components, variants, overrides, bounded reads and missing-export rejection |
| CP4: screens | Screen scenario commands absent | 31 package tests; states, transitions, linked instances, disallowed overrides and dependency-safe removal |
| CP5: stage checks | Stage tools absent; oversized result could fail after committing; rejected scope still appeared confirmed | 35 package tests; pre-write budget guard, scope gating, native ZIP metadata, tokens, snapshot drift and two-process concurrency |
| CP6: integration | Scenario contract export and generated routes absent; inactive design reads and newly activated unsafe paths; credential-bearing instance URL; incorrect mutation hints | 227/227 full repository tests, including 39 MCP package tests; generated executable contracts and isolated host routes |

Final checks: workspace lint; foundation validation (16/16 skills); generated
distribution check; size limits; four affected Codex skill validators; actual
packed-package stdio regression; and `git diff --check` all passed.

Implementation now exposes 56 concrete scenario tools (15 read-only, 41 write tools),
plus the four compatible legacy read-only decision queries. No model session,
live Penpot operation, clean external dependency installation or global client
registration was run. These are not implied by the passing local checks.

Tests are executable TypeScript/JavaScript checks and real official SDK stdio
calls, not model predictions. Native Penpot exports used by tests are explicitly
synthetic fixtures with fixture-customer answers and fixture evidence references.
They do not establish live Penpot, visual, accessibility or native model quality.

The server validates its four schemas internally. Existing decision-reader
regressions still exercise a synthetic journal exceeding 30,000 lines. Native
archive identity checking follows the
[official Penpot v3 container documentation](https://help.penpot.dev/technical-guide/developer/data-model/penpot-file-format/).
Import/render evidence remains an external observation, never an authenticated
consequence of a structurally valid MCP input.

Baseline and working logs are preserved in the durable local run directory, not
temporary system storage or release artifacts. Parent workflow-loop stability
qualification and previously deferred native model/Claude trials remain separate.

## Post-qualification decision-link and formatting correction

The `docker-headed-mode` report exposed replacement-prone requirement linking,
partial multi-call writes, stale-context recovery gaps and project formatter
incompatibility. Four focused regressions first failed, then passed after the
single-decision operation became additive, the atomic batch operation was added,
and conflict responses gained current context and decision references. A later
extensionless `.prettierrc` regression also failed before its YAML parser fix.

Current evidence is 8/8 focused decision-linking tests, 76/76 MCP package tests
over real stdio, and 261/261 full repository tests. Workspace lint, foundation
validation (13/13 skills), generated distribution check (13 skills), the Codex
skill validator and `git diff --check` pass. The executable contract contains 56
scenario tools; the server also preserves four legacy read-only queries.

An isolated copy of the actual CloakBrowser `docker-headed-mode` specification,
journal, manifest and Prettier configuration accepted a sequential fact write and
requirement link. Repeating the link was a byte-identical no-op, and both copied
workflow YAML files passed CloakBrowser's pinned Prettier check. The source
CloakBrowser project was not modified. No model, Claude or live Penpot trial was
run for this maintenance correction.
