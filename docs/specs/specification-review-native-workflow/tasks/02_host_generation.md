# P02: Native Host Artifacts And Explicit Entry

Status: Technical agreement ready; parent waiting included; implementation not started

## Approved inputs

Reviewed specification: `source_version` = `73f93f290e0ee7f969abc43af3121ea341dbe82a1db897896c27c678d09e7f43`;
`specification_version` = `969d6857c4f6decb623d7b60d841223057289f9dc0fb94f85fa4291f573ade2f`;
`review_ref` = `442a54a2-2c8a-4cf0-b3eb-44e9e77edb05`.
S0 is complete with these reviewed identities. Read exact
NWF-001/002/005/006/007/008/009/010/011/013/014/015 through MCP before execution.

## Technical proposal

Candidate `P02-parent-await-entry-v5`, packet `P02`, includes the
exact `Shared technical commitments` heading of `tasks/plan.md`. Inputs are
completed P00's actual preparation/submission scenarios and P01's body/metadata.

Extend existing `collectReleaseSource` and `buildGeneratedFiles` ownership in
`scripts/lib/distribution.mjs` for the canonical pair under
`skills/spec-driven-development/workflows/`. Reuse strict `renderHostTemplate`,
validated asset Maps, unsafe-path rejection and atomic output replacement. A
small native-format assembly helper is sufficient; its private name is flexible.
No separate renderer, generic workflow registry, lifecycle tool or dependency.

Generate matching skill-local resources:

- Claude: `plugins/claude-code/engineer-agent-workflows/skills/spec-driven-development/workflows/specification-review.js`,
  beginning with literal `export const meta = {...}` followed by the common
  rendered body. Use only the actual native invocation schema; `scriptPath`
  requires callable schema/read support, otherwise use its supported exact
  inline-script path. A CLI version alone does not establish native capability.
- Harness: `exports/deepseek-harness/skills/spec-driven-development/workflows/specification-review.js`
  containing the body, with separate `specification-review.meta.json` beside it.
  Pass body/metadata/arguments through real workflow or run_code.workflow fields.
  Do not introduce a saved-workflow registry, native plugin or nested workflow.
- Codex: preserve the existing separate-checker path and omit native body/metadata
  assets. No foreign invocation/model/metadata leakage.

Keep resources in the existing explicitly invoked skill, not a new plugin-root
command surface. Preserve existing explicit-only metadata and manifest ownership.
Add a conditional native-review reference and route to it from
`references/specification-interview.md`. Reconcile the native branch of
`references/completeness-review.md` so the judging actor owns exact reading,
judgment and its own submission; retain the established ordinary review contract
outside that branch. Do not ship contradictory generic no-reader-write guidance
with a direct-submission prompt. Keep `SKILL.md` within 4,096 UTF-8 bytes.

Before invocation the main agent discovers and calls P00's preparation tool once
with the exact target and expected review/source identities plus observed host
concurrency budget; no preceding
open/status chain is required solely for launch preparation. Completed returns
the saved outcome; blocked reports concrete reasons without workflow dispatch.
For ready-to-run, the main agent separately checks the current session's actual
native workflow/schema, permissions and chosen model routes. MCP readiness covers
server prerequisites only. Pass bounded weighted-group/lane arguments through the actual
native schema, without an inspector or copied original source text. P01 validates
arguments; MCP rechecks reads/submissions. Repeat preparation and host checks on
every new/recovery invocation; group continuations are obtained by judging actors,
not a new inspector or repeated parent-driven coordination. No freshness lease, enrollment or approval is added.
Do not hard-code session-specific MCP prefixes, duplicate
public schemas or call legacy batch recording as a native fallback. Missing
preparation or submission support blocks the requested native path. Absent native runtime may
select the existing independent checker through its documented ordinary path;
missing independence/enhanced-review support remains incomplete, never self-review.
No second review enrollment or specification approval is performed.

Reuse current Harness provider/model selection guidance: the parent discovers
routes and obtains the user's actual permitted pairs for judging and final roles
before native children start. The main agent performs preflight in its existing
context; no inspection-model choice or extra child is introduced. Judges do not
ask the customer or wait for write-turn permission. Use declared HOST substitutions
only for real host
differences. Codex receives neutral fallback guidance, not foreign native text.

Add `tests/specification-review-packaging.test.mjs` and extend owning packaging,
Harness export and model-role tests. Before generator changes, establish relevant
RED for native formats, exact common-body equivalence, capability discovery,
direct-judge ownership and target isolation. Observe actual generated files and
entry metadata. Apply PROVE to absence/wiring assertions and restore mutations.
Generation and validation are later P02 execution steps, not authorized here.

Bind the additional exact `Corrections and repeat-review scenario` heading of
`tasks/plan.md`. Conditional native entry preserves existing author/checker
ownership: the author aggregates source-supported fixes, consumes exact change
reports, selects eligible followup or justified full review, and invokes the same
native body again with fresh preparation. Explicit review-only entry returns
findings without spec edits. Reference the existing conditional followup-review
resource, not a duplicate new protocol or custom authoring CLI.

Add bounded guidance for carried provenance, pending-only formula inputs,
checker-requested expansion/quiescence, same-review fresh preparation and renewed
whole-context consistency. Model/route choices retain current host policy; no
extra inspector/writer or global installation. Packaging/entry checks must detect
an unconditional full restart, raw archive fallback, silent approval, author-selected
review subset or loss of the conditional followup reference. Ordinary/Codex paths
and the existing SKILL.md byte ceiling remain unchanged.

Bind the exact `Final-stage efficiency and recovery` heading in `tasks/plan.md`.
Package conditional same-actor tool composition, ordinary cursor fallback and
final-stage recovery for both hosts. Initial preparation can return completion-only
arguments for the existing main actor's strict completion call without another
judge. Host/schema checks still gate actual native/model dispatch. Add no generic
bridge, unsupported VM hook or helper actor. Entry/packaging controls distinguish
fresh assessment, current saved consistency and completed/blocked targets.

Bind the exact `Workflow ownership and parent waiting` heading in `tasks/plan.md`.
Generated entry guidance explicitly launches the workflow, hands over control and
waits without parent status polling. Pinned Harness awaits its parent tool result;
do not promise detached wakeup or end the owning session. Preserve actual host
schema/capability checks and outcome-driven completion/recovery after return.

## Technical agreement

Selected `proposal_id`: `P02-parent-await-entry-v5`; `packet_id`: `P02`.
`proposal_digest`: `27a2d8ca041abbbad69f57d4a16628b3607a6891a275617133eec8df801a82d3`.
Exact `agreement_ref`: `33839337-503d-4067-b0be-5df6f66df9e5`, revision 12.
Current managed question: `33839337-503d-4067-b0be-5df6f66df9e5`, revision 12.
MCP `planning_packet_check`: `ready` against the Approved inputs above.
Exact source headings: `Technical proposal` (02_host_generation.md),
`Shared technical commitments` (plan.md),
`Corrections and repeat-review scenario` (plan.md),
`Final-stage efficiency and recovery` (plan.md),
`Workflow ownership and parent waiting` (plan.md).

The current direct user instruction explicitly requires parent handoff, no
status-polling model turns and foreground waiting for the verified Harness call.
Each managed revision preserves the actual instruction and its provenance;
no new native-question response is claimed. Earlier accepted choices remain in
their immutable history. The four Harness reviews are unchanged. Recheck exact
bindings before/after execution. Technical readiness grants no implementation,
live-trial, installation, shared-runtime refresh, commit or publication authority.

## Delivery details

### Prerequisites and allowed writes

Require S0, completed P00/P01, new current agreement and separate P02 authority.
Inspect Git tracked/staged/untracked overlap, particularly ongoing generator and
Harness route edits; resolve overlapping ownership before writing. No clean-tree
or existing-commit requirement.

Reverify current ownership/line offsets:

- `scripts/lib/distribution.mjs:257`, `:311`, `:420`, `:563`, `:674`: strict
  rendering, release source, asset Maps and generated files.
- `scripts/lib/manifests.mjs:209`: existing Claude manifest, preserved.
- `tests/packaging.test.mjs:72`, `tests/deepseek-export.test.mjs:66`,
  `tests/host-model-roles.test.mjs:7`: target isolation and route-policy checks.
- P01 canonical sources and P00 callable schema; do not recreate their contracts.

Allowed future writes: `scripts/lib/distribution.mjs`, narrowly necessary source
validation in `scripts/validate.mjs` or `scripts/lib/skill-document.mjs`, the new
native reference and native branches of the two reviewer/interview references,
the new/named owning tests, generated matching host artifacts through the
existing generator and this bundle's checklist/handoff. No catalogs, unrelated
skills, root engineering manual, MCP production or installed/global changes.

Keep multi-stage read/parse/validate/render operations named and per-generation
objects isolated. Do not distribute root development rules merely because this
packet changes templates.

### Test-first acceptance

Repository root; existing Node/dependencies/test runner. Create the focused test,
observe relevant RED, implement, then run the named checks. Assert literal Claude
metadata, Harness separate metadata, Codex asset omission, exact common-body
content after legitimate host assembly, unknown-token/unsafe-path rejection,
explicit-only metadata and supported capability/fallback branches. Assert main-agent
preparation is one read-only scenario call, prepared arguments reach the body,
blocked/completed outcomes and missing native/model capability stop dispatch,
weighted-group/lane continuation guidance has no 160-item/child cap, no
inspector role is offered, and recovery repeats preparation/host checks. Mutate one
host-isolation and submission-discovery assertion at a time to prove detection.
Controlled hooks are not real native/model qualification.

Commands for later separately authorized P02 execution:

```bash
rtk proxy node --test tests/specification-review-packaging.test.mjs tests/packaging.test.mjs tests/deepseek-export.test.mjs tests/host-model-roles.test.mjs tests/specification-skill.test.mjs
rtk proxy npm run generate
rtk proxy npm run generate:check
rtk proxy npm run validate
rtk proxy git diff --check
```

### Completion and recovery

Inspect scoped source/generated changes and current specification/agreement.
Required checks must pass before checklist completion. Update current handoff and
stop after P02. Use existing atomic generation recovery or revert only known
packet changes; preserve unrelated outputs. No install, shared server refresh,
live trial, commit or publication follows from a successful disk build.
