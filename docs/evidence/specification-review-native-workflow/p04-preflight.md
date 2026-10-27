# P04 Native Qualification Preflight

Status: Initial failed preflight retained. The schema blocker was later
[repaired](schema-compatibility-fix.md); full P04 qualification remains incomplete.

## Approved inputs and isolation

The P04 agreement `P04-harness-parent-await-metrics-v5`, revision 10, was
`ready` against the reviewed Approved specification. P03's real-MCP protocol
qualification remains separate from native engine/model qualification.

The user requested using an isolated copy of the existing Harness and its
plugins with the existing Codex authorization. The discovered installation is
`@deepseek-ai/dsh@0.2.1-rc.2`; the web profile contains six additional plugins,
including `dsh-codex-connect@0.2.0-alpha.10`. The runtime and complete web-profile
plugin tree were copied into a private temporary directory. The copied CLI's
`--version` check passed and returned `0.2.1-rc.2`. Global state was not changed.
Credential files and session history were not copied, and authorization was not
used by these preflight checks. No model request was made.

P04 pins `0.2.1-rc.3` at
`22ddee3792402c3e70ec5f86a63c3e3e895a2f60`. The existing rc.2 installation is
not relabeled as that baseline. Full compatibility reconciliation and actual
native engine/model evidence remain unavailable.

## Recorded blocker before repair

At the workflow fingerprint recorded below, both generated schemas failed Harness's actual
`assertObjectJsonSchema` validator with `UNSUPPORTED_SCHEMA`. The same failure
was observed in three bounded checks:

| Check | Detailed schema | Final schema | Result |
| --- | --- | --- | --- |
| Validator bundled in the pinned rc.3 workflow guest | 5 violations | 3 violations | FAIL |
| Validator exported by the existing installed rc.2 tools package | 5 violations | 3 violations | FAIL |
| Validator exported by the private copied rc.2 tools package | 5 violations | 3 violations | FAIL |

These are executable schema-contract checks, not a complete native engine run
or semantic model qualification. Each probe accepted a minimal object schema;
explicit type-array and `maxItems` negative controls were rejected. The copied
installation check exited 1 at the compatibility assertion, after successful
import and positive controls. The actual generated schemas also compile in the
Ajv validator used by P03; its passing checks do not establish this host contract.

The canonical source is
`skills/spec-driven-development/workflows/specification-review.body.js:117-162`.
It uses nullable `type` arrays in group/cursor/completion/expansion schemas and
`maxItems` in array schemas. The generated Harness artifact preserves them.

The pinned host rejects type arrays and unsupported keywords:

- [Native schema validator](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/packages/core/tools/src/json-schema.ts#L267),
  including its single-type check at lines 302-307.
- [Workflow host validation](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/packages/workflow/workflow-ptc/src/host.ts#L47)
  calls the same assertion before accepting a child request.

A representative diagnostic is
`schema.properties.cursor.type must be a single type string (type arrays are not supported)`.
The acknowledgment schema also reports that `maxItems` is not a supported keyword.
At that revision, the detailed workflow could not start valid native judging
children; final-only assessment was affected independently.

## Reproduction and evidence identity

From the generated body, evaluate only the declarations preceding
`const readingPolicy` to obtain `detailSchema` and `finalSchema`. Pass each
unchanged schema to the actual tools package's exported
`assertObjectJsonSchema`. Test a minimal object schema as a positive control,
then separately test a nullable type array and an array with `maxItems` as
negative controls. This operation needs no credentials, provider, model,
managed workflow documents, or model-generated verdicts.

Private evidence retains the probes, full bounded diagnostics, source copies,
installed/copy manifests, and preservation baseline. Public fingerprints:

- Generated workflow SHA-256:
  `9497630a49a6552983c2b7f019f54c7d18a2cae18787160d7f44aa09a9e5defd`.
- Pinned upstream guest-source module SHA-256:
  `ddeb4c404dfd88ff13518238a7b4fc2acf0da8bcb8deb2e108e41a449946e0a3`.

Raw runtime source, opaque contexts, credentials, private paths and session
transcripts are excluded from this report.

## Disposition

P04 remains incomplete. Its [local opt-in preflight runner and tests](p04-local-preflight.md)
have now been implemented and verified. The full native runner, four-review model
workload, performance comparison and native cleanup acceptance remain outstanding.
The isolated version check is a preflight success; it is not evidence of model
access or workflow compatibility.

The defect belonged to P01's definitions and P02's generated artifacts. Subsequent
explicit user authorization permitted the [verified repair](schema-compatibility-fix.md).
The fresh validator checks pass while retaining required fields and size limits.
This document preserves the earlier failed observation and its original digest.

Next separately invoked work is P04 native qualification and host/model decisions.
The user owns those remaining choices. No installation, global configuration
change, publication or additional model trial is implied by this historical report.
