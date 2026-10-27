# P04 Local Preflight Implementation

Status: Local preflight verified; P04 qualification remains incomplete.

## Implemented boundary

`scripts/qualify-specification-review.mjs` implements the opt-in preflight phase
of P04. It does not yet execute the native engine or the four model reviews.
Neither import nor invocation without `--run` starts a client or writes a report.
The exported operation also requires `run: true`.

Inputs explicitly identify a prepared private runtime copy, its home, workspace,
workflow artifact and expected SHA-256. Resolved package paths must stay inside
the private client tree. The private root must exclude group/other access.
The utility supports owned POSIX process groups; Windows remains unqualified.
It installs nothing, copies no credentials and selects no provider/model.

The client version process receives only a small environment allowlist and the
private home/workspace paths. Both version and schema probes are bounded by
deadline and output size, accept cancellation, and stop their owned process
groups before returning. Probe stdout/stderr and thrown messages are not copied
to public reports. Successful parent exit also stops any remaining descendant.
The existing product-trial helper was not reused because it closes stdin
immediately and lacks this abort/group-cleanup contract.

Schema declarations are inspected in a bounded child VM using frozen input
bytes; the prepared host's own validator checks the resulting schemas. Each
invocation uses a fresh process. Minimal valid and explicitly unsupported
schemas check the validator observation surface. This is schema-contract
inspection, not a native workflow engine execution or model qualification.
Use an explicitly trusted prepared runtime and the intended workflow digest.

## Inputs and command

The JSON configuration has these fields:

| Field | Meaning |
| --- | --- |
| `privateRoot` | Absolute private directory containing the prepared copy. |
| `clientRoot` | Absolute runtime root containing `node_modules/@deepseek-ai/dsh` and `dsh-tools`. |
| `clientHome` | Absolute copied-client home under the private root. |
| `workspace` | Absolute owned probe directory under the private root. |
| `workflowScript` | Absolute Harness artifact inside the private root or this repository's generated Harness workflow directory. |
| `expectedWorkflowSha256` | Exact reviewed artifact digest; mismatched bytes prevent process launch. |
| `timeoutMs` | Optional per-probe bound from 100 to 30,000 milliseconds; default 10,000. |

This is a preflight command, not a live model invocation. Supply explicit
absolute configuration and report paths through these task-specific variables:

```bash
rtk proxy node scripts/qualify-specification-review.mjs --run --config "$EAW_REVIEW_PREFLIGHT_CONFIG" --output "$EAW_REVIEW_PREFLIGHT_REPORT"
```

The report parent must exist inside the private root or the feature's evidence
directory. Existing reports are rejected before probing; exclusive file creation
also prevents overwrite if a report appears during execution. Reports contain
allowlisted metadata, hashes, checks and recovery codes. They contain no private
paths, source text, opaque contexts or raw diagnostics.

Exit 1 means invalid inputs or failure to write a new safe report. Exit 2 means
an incomplete qualification checkpoint was written. Preflight alone never
returns a qualified/pass packet, even when all local checks pass. Unknown model
turn/token/cache/handler/lock metrics remain null. Measured probe stdio bytes and
elapsed time describe local preflight, not MCP transport or inference savings.

## Verification

- RED: before implementation, the test module could not import the absent
  runner. This collection failure was not treated as proof of its assertions.
- GREEN: all 18 local tests passed, with zero failures/skips on Linux. Initial
  implementation failures exposed schema-prefix whitespace handling and loss
  of the validator-control outcome; the implementation was corrected.
- PROVE: all 15 compiling defects were detected in a disposable copy: missing
  API/CLI opt-in, import-time process launch, escaped client paths, ignored
  workflow identity, inherited ambient secrets, ignored cancellation, leaked
  descendants, raw stderr disclosure, unknown tokens reported as zero, false
  qualification, skipped validator controls, late report-destination validation,
  report overwrite races and missing output bounds. Every variant was restored;
  the disposable copy was removed. Production code was not mutated.

The actual copied rc.2 client was also inspected through the new CLI; its
[structured result](p04-local-preflight-result.json) is redacted. Its version
check passed, but detailed/final schemas still failed with five/three violations.
The CLI wrote `status: incomplete`, returned exit 2 and selected
`repair_schema_compatibility`. Its version differs from the pinned rc.3 baseline
and remains explicitly unreconciled. This run made zero model requests.

That result records the original artifact. The later
[schema repair](schema-compatibility-fix.md) and its
[fresh preflight](schema-compatibility-result.json) resolve the schema failures;
host/native/model qualification remains incomplete.

Run the local suite from the repository root:

```bash
rtk proxy node --test tests/specification-review-qualification.test.mjs
rtk proxy git diff --check
```

## Remaining work

The [original preflight blocker](p04-preflight.md) was subsequently
[repaired](schema-compatibility-fix.md) after an explicit user request. The earlier
unanswered task-choice question was not itself treated as approval. Canonical
schemas and derived native artifacts changed in that separate repair; frozen
technical proposals were preserved. P04's full native execution, model routing/questions,
four semantic reviews, MCP/actor measurements and native cleanup acceptance
remain unimplemented or unverified. A passing local process test does not close
those requirements. P05 is not started.

Next separately invoked work is P04 host reconciliation and completion of the
native runner/trials; actual model choices remain with the user. No implicit trial,
installation, publication or commit authority is introduced.
