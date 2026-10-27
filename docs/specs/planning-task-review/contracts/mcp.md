# Implementation Packet Review MCP Contract

Status: Planned contract v1. The current serving runtime does not advertise these new capabilities.

## Ownership and schemas

This contract covers IPR-003 through IPR-025. Persist progress/evidence in the
existing MCP-owned journal at `extensions.packet_review`, described by
`contracts/schemas/data.schema.json`. PTR-01 promotes its `packetReview*` and
`packetVerification*` definitions to the canonical
`shared/schemas/decisions.schema.json`, with an extension property referring to
the namespace structure. The planning schema is a versioned design snapshot,
not a second runtime journal or per-host validator. Preserve unrelated extensions.

The existing journal requires `schema_version`, `spec_slug` and `decisions`;
it permits additional root properties. Existing mutation code already requires
extension metadata to be an object. If the selected compatible journal is absent,
the owning MCP may initialize only its minimal shape and requested progress;
it must not infer behavioral scope, answers, approval or a product binding.
Incompatible existing data is rejected without automatic migration/backfill.

MCP validates/persists observations and derives judgments. Native investigators
perform semantic assessment and execution. No operation launches agents, tests,
workspace/database lifecycle commands, proof queues, slots or permission changes.
Process permissions bound access; these tools do not establish a new project
authorization sandbox or authenticate consent, independence or semantic truth.

## Common protocol

Resolve logical operation names through the active host's published tools/schema;
never construct an MCP namespace. Inspect `workflow_runtime_info` on the serving
connection before dependent calls. A new disk build does not refresh that process.
Missing capability is a prerequisite, not installation/configuration authority or
permission for direct workflow-YAML access.

Inputs use the latest specification `context` and returned opaque `run_ref`,
`assignment_ref`, `attempt_ref`, source/cursor/read references where required.
A client-generated stable `operation_id` names one intended mutation, not a
server reference. Do not reconstruct returned references or hashes. Preserve the
existing `{protocol_version:2, context, result, replayed}` envelope and use the
returned context after writes. Independent submissions validate logical source,
run and entity under the existing bounded review-submission lock, without requiring
one reviewer to relay every other reviewer's physical context.

The review `source_version` combines exact selected Git bytes/attributes/index
information, packet/criteria/contract/guidance inputs, behavioral specification
versions and exact technical-agreement bindings. It is distinct from the existing
behavioral `source_version` and the Markdown `specification_version`. Progress
appends are excluded from behavioral freshness and proposal hashes. Changing
required input makes affected review evidence stale; no silent rebase.

## Public scenarios

These are proposed logical names. Implementation publishes strict callable
schemas consistent with this table and the record definitions. No new capability
is assumed available merely because this document names it.

| Operation                             | Required inputs                                                                                                                      | Outputs / state effect                                                                                                                          | Requirement mapping            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `task_packet_review_prepare`          | context; explicit packet IDs/paths; comparison/selected paths; effective capability/deadline evidence; normal/diagnostic/auto intent | Resolve exact selection/ecosystem inputs; create source-bound run, inventory and unit refs with actual mode/reasons. No dispatch.               | IPR-003–006, 015, 017, 019–022 |
| `task_packet_review_units`            | context, run_ref, optional matching cursor                                                                                           | Ordered unit/criterion/dependency summaries, totals, complete and next_cursor; read only.                                                       | IPR-006, 015–018               |
| `task_packet_review_source_get`       | context, run_ref, source_ref, assignment_ref for actor-budgeted reads, optional matching cursor                                      | Exact original portion, identity, offsets/totals, complete/next_cursor and terminal complete-read receipt; no write.                            | IPR-004–006, 015, 017, 020     |
| `task_packet_review_assign`           | context, run_ref, phase/axis/scope, unit IDs, actual independent-context/control evidence, operation_id                              | Issue bounded assignment/logical actor reference after stage/source/budget checks. Not an execution slot or permission grant.                   | IPR-006–010, 016, 019          |
| `task_packet_review_record`           | context, run_ref, assignment_ref, operation_id, complete source/coverage evidence, bounded judgment/findings/dispositions            | Append one acknowledged unit/stage assessment and saved IDs/counts. Main-review judgment is not final judgment.                                 | IPR-007–010, 013–018           |
| `task_packet_review_execution_record` | context, run_ref, assignment_ref, operation_id, question/criterion, exact execution observation                                      | Record phase-local new/reused evidence, outcome and applicable mutation/restoration/resource refs. Finding ID is optional.                      | IPR-010–013, 015–020           |
| `task_packet_review_resource_record`  | context, run_ref, assignment_ref, operation_id, conditional resource observation                                                     | Record ownership, safe recovery ref and actual cleanup; no allocation/deletion/admission.                                                       | IPR-011, 012, 016, 019, 020    |
| `task_packet_review_status`           | context, run_ref                                                                                                                     | Read acknowledged stages/units, freshness, missing evidence, known operation effects and known/unknown next-action owner; no mutation.          | IPR-013–020                    |
| `task_packet_review_resume`           | context, run_ref, actual explicit resume provenance, newly verified enforcing control/limits, operation_id                           | Issue fresh finite invocation over unfinished same-source units; retain prior timing/evidence. Changed input requires a new full run.           | IPR-016–020                    |
| `task_packet_review_finalize`         | context, run_ref, invocation_ref, operation_id                                                                                       | Recheck exact input, independent coverage/verification/consistency, propositions, checks, expiry and cleanup; derive per-packet/group judgment. | IPR-009, 010, 013–020          |
| `task_packet_review_report`           | context, run_ref, optional matching cursor                                                                                           | Bounded derived human report with source-bound totals/continuation. No checklist/handoff edit or second editable truth.                         | IPR-009, 013–015, 020, 024     |
| `packet_verification_start`           | context, packet ID, governing spec/agreement/digest, attempt intent, operation_id                                                    | Begin packet attempt with actual required evidence kinds; retain earlier attempts. No implementation authority.                                 | IPR-015, 016, 020, 025         |
| `packet_verification_record`          | context, attempt_ref, operation_id, ordered bounded observation with its actual code/test inputs                                     | Retain RED/GREEN/PROVE/check/restoration when observed. One logical test run is not one write per individual test.                              | IPR-008, 014–016, 020, 025     |
| `packet_verification_get`             | context, packet ID, explicit attempt selection, optional matching cursor                                                             | Exact bounded attempt/observations in a fresh session after handoff replacement; no invented latest selection.                                  | IPR-014–016, 020, 025          |
| `packet_verification_complete`        | context, attempt_ref, operation_id                                                                                                   | Check required observations/order/restoration and acknowledge evidence retention only, never implementation-task completion.                    | IPR-015, 016, 020, 025         |

`task_packet_review_record` accepts bounded `finding`, `disposition`,
`assessment` and `unit_complete` record kinds. Findings/dispositions can be
acknowledged in multiple fragments; only complete-unit acknowledgment may close
coverage after every referenced record and obligation is accounted for.
The 16 KiB actor result budget bounds the returned summary/ACK payload, not the
whole retained finding inventory. Individual wire submissions remain bounded;
full records are retrieved through exact continuations. Storage/delivery failure
leaves the unit incomplete rather than discarding its remaining findings.

## Selection, delivery and limits

Require a usable Git worktree, not a clean tree or first commit. Distinguish
committed ranges, effective working tree, staged-only and explicitly empty
baseline. Include selected untracked additions, deletions, renames, meaningful
modes and non-code/generated outputs. Historical evidence uses its selected tree,
not current tests. Treat links as link evidence without following into private
or out-of-root content. Ambiguous target/packet attribution is unresolved; invalid
selectors cannot become a guessed comparison or expansion to unrelated changes.

Inventory every selected criterion and available requirement/agreement/contract/
check. Parse Markdown candidates using existing dependencies; retain arbitrary
criterion IDs and source-local identities. The acceptance-evidence specialist
reconciles independently testable obligations. A tag or parser match is not
behavioral coverage. Each stable unit includes packet/criteria/source/common
constraints and cross-unit dependencies; the main phase integrates their effects.

Default review-owned bounds: 20 packets, 128 units, 32 KiB original text per unit,
64 KiB cumulative original/common text per assignment, 16 KiB result per assignment.
Smaller actual host limits and host/tool overhead headroom win. Count relevant
common constraints and cumulative actor delivery, not only each response. Unknown
headroom or indivisible oversized obligations return an explicit limit/prerequisite
and next action. A display cap never drops criteria, propositions or blockers.

Lists are ordered by selected packet order then stable unit/criterion identity or
acknowledged event sequence. Every portion names exact owner/source/selection,
offsets/totals, completeness and opaque continuation. Continue with identical
selectors/filters/versions. A changed source/cursor fails rather than silently
rebasing. A terminal receipt proves complete protocol delivery, not understanding.
Exact originals remain retrievable on demand while available; unavailable protected
or historical evidence is a limitation, not fabricated text or approval.

Read-only delivery never persists a per-read progress counter or changes an
acknowledged result. Prepare/assign checks the unit/common-constraint payload
before dispatch. The native coordinator/actor checks cumulative delivered input
before requesting further originals and reports its exact consumed references;
assessment validation recomputes the corresponding source sizes. Repeated reads
do not create evidence or reset a budget. If more necessary context cannot fit,
continue through a smaller bounded assignment or report the limit, never silently
omit it. These are review-payload controls, not resource reservations.

## Lifecycle and judgment

The run owns source/inventory, assignments, semantic assessments, findings,
execution/resource records, invocations and append-event references. Keep original
claims and acknowledged history; append disposition/normalization rather than
replace them. The required flow is prepare → three independent fact directions
→ independent main unit/integration review → independent verification/omission/
whole-report consistency → finalization/report. Execution is allowed inside each
investigation phase, not a late stage.

Actual native contexts, not role labels, establish operational independence.
MCP refs cannot authenticate it; orchestration and native qualification must
observe the fresh-context controls. Empty completed judgments differ from missing,
null or failed assignments. A new omission claim uses an already participating
non-originator where material to approval; unavailable continuation/capacity keeps
it unresolved. No extra omission agent/role/phase or full main-review repetition.

Normalize materially different confirmed/refuted/unverifiable propositions while
retaining the original partially confirmed finding. Confirmed critical/required
portions remain blockers. An unresolved material portion prevents positive
judgment; a resolved optional remainder may permit approval with comments.

| Current input/process condition                                                                                                           | Derived result                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Diagnostic/stale input, unfinished stage/scope/effect, unknown material proof, expiry/cancellation/failure or unfinished required cleanup | `incomplete`, preserving established defects and next action |
| Complete normal fresh assessment; confirmed critical/required proposition or observed required acceptance assertion failure               | `request_changes`                                            |
| All positive prerequisites; only resolved optional advice remains                                                                         | `approve_with_comments`                                      |
| All positive prerequisites; no surviving concern                                                                                          | `approve`                                                    |

Coverage, confidence, execution status and judgment stay separate. An assertion
that demonstrates a defect differs from an unavailable workflow prerequisite.
Derive both per-packet conclusions and the group's integrated conclusion; retain
all affected packet links for cross-packet defects. Reports show every criterion,
exact target/mode, technical conformance, proof/refutation/limitations, actual
limits and known/unknown action owners. No packet completion, fixes, commits or
external publication/comments follow from review success.

Each finding retains full append-only `disposition_history` payloads, including
the earlier propositions, assessor, evidence, reason and sequence. References
alone are not historical retention. Current disposition/proposition fields are
server-derived projections of that history within the same authoritative record;
recompute and verify them before finalization rather than trust a supplied view.
Domain tests must preserve the original claim and prior payload after later
confirmation, refutation, severity change and partial normalization.

## Phase-local execution and resources

Investigators read first and use authorized project runners for necessary targeted
questions. Harmless checks reuse a sufficient authorized environment/fixture.
Mutating/interfering checks use adequate existing isolation or an owned selected-
target workspace/database. Do not copy private env files, reset original source,
weaken assertions, start unrelated services or silently run a full suite.
One mutation at a time per investigator baseline needs assertion observation and
restoration. Independent safe investigators may execute concurrently.

Reuse earlier execution only for matching source, relevant environment/prerequisites,
command/mutation, purpose and observation, with the consumer's own judgment.
A phase transition alone requires no replay. A question/criterion may justify a
check before any finding; pending/unavailable proof is not successful evidence.

Record owned creation/recovery refs and actual cleanup where resources are created.
Harmless checks require no dummy resource or cleanup. Reused resources retain
external ownership and cannot be deleted as review cleanup. Unknown ownership is
not deletion authority. Preserve success/failure/unknown restoration/cleanup on all
terminal paths. No proof queue, slot/reservation token or extra global serialization.

Default ceilings: 1,800,000 ms per invocation, 120,000 ms targeted check,
30,000 ms cleanup. Actors inherit remaining enforced invocation time or a narrower
actual bound. Resolve actual project/host controls first; smaller limits win.
These are conservative policy choices, not measured latency or completion promises.
A polling timeout, token/turn cap or advisory guest timer alone is insufficient.
An unsupported enforcing/cancellation path prevents dependent dispatch.

On expiry stop dispatch, request actual cancellation/termination, observe its
outcome and use bounded cleanup. Requests are not confirmed disposal. Unknown
activity/cleanup remains incomplete. Retries consume remaining time. Only a fresh
explicit resume creates another finite invocation linked to prior evidence/timing;
new full reviews still run all independent stages.

## Persistence, concurrency and recovery

Use existing canonical-path/schema checks, cooperating-writer lock and atomic file
replacement. Retain the 16 MiB journal limit; a would-exceed write fails before
replacement and leaves required retention/completion pending. Unrelated metadata
and older attempts/results survive. No second global store, stronger durability
promise, protection against arbitrary external races, automatic migration/backfill
or history deletion. Progress is outside behavioral decisions and hashed proposals.

Within the lock revalidate logical source/entity state. Exact duplicates acknowledge
one effect; conflicting content for an acknowledged operation preserves history
and fails. Disjoint same-source unit appends can both succeed. A lost reply requires
status/operation-effect inspection and physical-context reopening as appropriate.
Retry only under the published safe exact replay contract; unknown effects do not
authorize blind replay. Do not repair a crashed lock or immutable archive silently.

Use stable safe errors and actual `operation_applied` knowledge with `next_action`
and an established/unknown owner. Never invent a false flag from absence of reply.

| Code family                                                              | Meaning and recovery                                                                             |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `INVALID_INPUT`, `UNSAFE_PATH`, `NOT_FOUND`                              | Bad selector/path/ID or unavailable selected input; no invented target.                          |
| `PREREQUISITE_MISSING`, `CAPABILITY_MISSING`                             | Missing runner/MCP/independence/enforcement/isolation; stop dependent work.                      |
| `SOURCE_CHANGED`, `STALE_SOURCE`, `STALE_CURSOR`                         | Changed exact input; inspect/re-prepare/new run, no mixed-source pass.                           |
| `CONFLICT`, `BUSY`                                                       | Logical conflict or held lock; preserve state and inspect/reopen.                                |
| `INVALID_STATE`, `UNSUPPORTED_VERSION`                                   | Corruption or illegal/incompatible state; preserve bytes, no migration.                          |
| `SOURCE_LIMIT`, `RESULT_LIMIT`, `ACTOR_INPUT_LIMIT`, `DEADLINE_EXCEEDED` | Exhausted finite policy; explicit limit/incomplete and next action, no clipping.                 |
| `EVIDENCE_INCOMPLETE`, `OPERATION_FAILED`                                | Missing required observation/assessment/retention or failed operation; no successful completion. |

Changed required sources need a new full review. Restored missing normal inputs
need a new normal run rather than relabelling old diagnostic evidence. Missing
historical originals/chronology remain explicit; current green tests cannot
reconstruct past RED. A producer retains required observation data before task
completion/handoff replacement; handoff only references that attempt. Its failed
required write keeps the producer incomplete without adding a review/commit gate.

## Structural and semantic validation

The schema rejects malformed shapes/version/phase/reuse/ownership records,
structurally impossible positive states and completed attempts missing declared
observation kinds. Domain tests additionally enforce complete unit/criterion sets,
all fact axes, main five-axis/integration and verifier whole-report assessment,
source/reference integrity, logical sequence/idempotency, non-originator assessment,
actual byte/time limits, assertion observation/restoration, current input eligibility
and all finalization conditions. Schema validity cannot prove semantic truth,
authentic consent, native independence/enforcement or cleanup.

### Executable schema examples

This JSON is a schema-test fixture, not callable MCP input, actual consent or a
native-run result. Validate `data` against `schema_ref`. A case can clone an
already resolved `base` and apply its document-local `patches` by path; this
fixture convenience is not a public arbitrary-file mutation capability. Structural
validity still requires the semantic checks above before runtime acknowledgment.

```json
[
  {
    "case": "C01",
    "schema_ref": "#",
    "expected_valid": true,
    "data": {
      "schema_version": 1,
      "runs": [],
      "packet_attempts": []
    }
  },
  {
    "case": "C02",
    "schema_ref": "#/definitions/packetReviewRun",
    "expected_valid": true,
    "data": {
      "run_id": "r1",
      "specification": "fixture",
      "packet_ids": ["P1"],
      "mode": "normal",
      "input_issues": [],
      "behavioral_source_version": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "specification_version": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "source_version": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "selection": {
        "mode": "working_tree",
        "baseline_ref": "HEAD",
        "target_ref": "selected-working-tree",
        "paths": ["src/example.mjs"],
        "effective_digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "attributes_digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "index_digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "index_differs": false
      },
      "units": [
        {
          "unit_id": "u1",
          "packet_ids": ["P1"],
          "criterion_ids": ["criterion-one"],
          "source_refs": [
            {
              "path": "src/example.mjs",
              "source_digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
            }
          ],
          "shared_constraint_refs": ["EX-1"],
          "depends_on_units": [],
          "original_bytes": 512,
          "source_version": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        }
      ],
      "criteria": [
        {
          "criterion_id": "criterion-one",
          "packet_id": "P1",
          "location": {
            "path": "tasks/01_example.md",
            "source_digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
          },
          "implementation": "meets",
          "test_sufficiency": "sufficient",
          "required_history": "not_required",
          "required_check": "not_required",
          "explanation": "Synthetic criterion assessed.",
          "evidence_refs": ["source:example"],
          "assessment_refs": [
            "assessment0",
            "assessment1",
            "assessment2",
            "assessment3",
            "assessment4"
          ]
        }
      ],
      "assignments": [
        {
          "assignment_id": "a0",
          "actor_ref": "facts-req",
          "phase": "fact_collection",
          "axis": "requirements",
          "unit_ids": ["u1"],
          "source_version": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "status": "completed",
          "input_bytes": 512,
          "result_bytes": 256,
          "assessment_scope": "unit"
        },
        {
          "assignment_id": "a1",
          "actor_ref": "facts-sec",
          "phase": "fact_collection",
          "axis": "security",
          "unit_ids": ["u1"],
          "source_version": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "status": "completed",
          "input_bytes": 512,
          "result_bytes": 256,
          "assessment_scope": "unit"
        },
        {
          "assignment_id": "a2",
          "actor_ref": "facts-arch",
          "phase": "fact_collection",
          "axis": "architecture",
          "unit_ids": ["u1"],
          "source_version": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "status": "completed",
          "input_bytes": 512,
          "result_bytes": 256,
          "assessment_scope": "unit"
        },
        {
          "assignment_id": "a3",
          "actor_ref": "main",
          "phase": "main_review",
          "unit_ids": ["u1"],
          "source_version": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "status": "completed",
          "input_bytes": 512,
          "result_bytes": 256,
          "assessment_scope": "integration"
        },
        {
          "assignment_id": "a4",
          "actor_ref": "verifier",
          "phase": "verification",
          "unit_ids": ["u1"],
          "source_version": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "status": "completed",
          "input_bytes": 512,
          "result_bytes": 256,
          "assessment_scope": "whole_report"
        }
      ],
      "findings": [],
      "executions": [],
      "resources": [],
      "invocations": [
        {
          "invocation_id": "i1",
          "started_at": "2026-10-27T09:00:00Z",
          "expires_at": "2026-10-27T09:30:00Z",
          "effective_actor_ms": 1800000,
          "status": "completed",
          "limits": {
            "invocation_ms": 1800000,
            "check_ms": 120000,
            "cleanup_ms": 30000,
            "max_packets": 20,
            "max_units": 128,
            "unit_input_bytes": 32768,
            "actor_input_bytes": 65536,
            "actor_result_bytes": 16384
          },
          "enforcement": {
            "kind": "native_caller",
            "control_ref": "fixture-caller",
            "capability_evidence_ref": "native-trial:N07"
          },
          "stop_status": "not_requested",
          "cleanup_status": "not_required"
        }
      ],
      "events": [],
      "finalization": {
        "execution_status": "completed",
        "coverage_status": "complete",
        "freshness": "fresh",
        "consistency_status": "consistent",
        "cleanup_status": "not_required",
        "unresolved_material_refs": [],
        "judgment": "approve",
        "reason": "Schema-only fixture; semantic completeness is checked separately."
      },
      "packet_inputs": [
        {
          "packet_id": "P1",
          "path": "tasks/01_example.md",
          "packet_digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "requirement_ids": ["EX-1"],
          "contract_refs": [],
          "agreement_ref": {
            "id": "fixture-agreement",
            "revision": 1
          },
          "proposal_digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "input_status": "current",
          "issues": []
        }
      ],
      "assessments": [
        {
          "assessment_id": "assessment0",
          "assignment_id": "a0",
          "actor_ref": "facts-req",
          "phase": "fact_collection",
          "scope": "unit",
          "unit_ids": ["u1"],
          "criterion_ids": ["criterion-one"],
          "source_version": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "coverage": "complete",
          "observations": ["Assigned exact scope assessed."],
          "evidence_refs": ["source:example"],
          "finding_refs": [],
          "unresolved_refs": [],
          "reason": "Synthetic structural fixture, not real evidence."
        },
        {
          "assessment_id": "assessment1",
          "assignment_id": "a1",
          "actor_ref": "facts-sec",
          "phase": "fact_collection",
          "scope": "unit",
          "unit_ids": ["u1"],
          "criterion_ids": ["criterion-one"],
          "source_version": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "coverage": "complete",
          "observations": ["Assigned exact scope assessed."],
          "evidence_refs": ["source:example"],
          "finding_refs": [],
          "unresolved_refs": [],
          "reason": "Synthetic structural fixture, not real evidence."
        },
        {
          "assessment_id": "assessment2",
          "assignment_id": "a2",
          "actor_ref": "facts-arch",
          "phase": "fact_collection",
          "scope": "unit",
          "unit_ids": ["u1"],
          "criterion_ids": ["criterion-one"],
          "source_version": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "coverage": "complete",
          "observations": ["Assigned exact scope assessed."],
          "evidence_refs": ["source:example"],
          "finding_refs": [],
          "unresolved_refs": [],
          "reason": "Synthetic structural fixture, not real evidence."
        },
        {
          "assessment_id": "assessment3",
          "assignment_id": "a3",
          "actor_ref": "main",
          "phase": "main_review",
          "scope": "integration",
          "unit_ids": ["u1"],
          "criterion_ids": ["criterion-one"],
          "source_version": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "coverage": "complete",
          "observations": ["Assigned exact scope assessed."],
          "evidence_refs": ["source:example"],
          "finding_refs": [],
          "unresolved_refs": [],
          "reason": "Synthetic structural fixture, not real evidence.",
          "main_axes": {
            "correctness": {
              "outcome": "no_concern",
              "reason": "Assessed in fixture.",
              "evidence_refs": ["source:example"]
            },
            "readability": {
              "outcome": "no_concern",
              "reason": "Assessed in fixture.",
              "evidence_refs": ["source:example"]
            },
            "architecture": {
              "outcome": "no_concern",
              "reason": "Assessed in fixture.",
              "evidence_refs": ["source:example"]
            },
            "security": {
              "outcome": "no_concern",
              "reason": "Assessed in fixture.",
              "evidence_refs": ["source:example"]
            },
            "performance": {
              "outcome": "no_concern",
              "reason": "Assessed in fixture.",
              "evidence_refs": ["source:example"]
            }
          }
        },
        {
          "assessment_id": "assessment4",
          "assignment_id": "a4",
          "actor_ref": "verifier",
          "phase": "verification",
          "scope": "whole_report",
          "unit_ids": ["u1"],
          "criterion_ids": ["criterion-one"],
          "source_version": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "coverage": "complete",
          "observations": ["Assigned exact scope assessed."],
          "evidence_refs": ["source:example"],
          "finding_refs": [],
          "unresolved_refs": [],
          "reason": "Synthetic structural fixture, not real evidence."
        }
      ],
      "integration_assessment_ref": "assessment3",
      "consistency_assessment_ref": "assessment4"
    }
  },
  {
    "case": "C03",
    "schema_ref": "#/definitions/packetReviewRun",
    "expected_valid": false,
    "base": "C02",
    "patches": [
      {
        "path": ["mode"],
        "value": "diagnostic"
      },
      {
        "path": ["input_issues"],
        "value": ["Missing required history."]
      }
    ]
  },
  {
    "case": "C04",
    "schema_ref": "#/definitions/packetReviewExecution",
    "expected_valid": true,
    "data": {
      "execution_id": "e1",
      "operation_id": "op1",
      "actor_ref": "facts-security",
      "phase": "fact_collection",
      "question_ref": "q1",
      "source_version": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "environment_ref": "existing-test-fixture",
      "evidence_kind": "new_execution",
      "command_ref": "node --test test/example.test.mjs",
      "working_directory_ref": ".",
      "source_refs": [
        {
          "path": "src/example.mjs",
          "source_digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "start_line": 1,
          "end_line": 2,
          "file_mode": "100644"
        }
      ],
      "status": "passed",
      "expected": "The assertion is reached.",
      "observed": "The relevant assertion passed.",
      "assertion_observed": true,
      "restoration_status": "not_required",
      "effective_limit_ms": 120000
    }
  },
  {
    "case": "C05",
    "schema_ref": "#/definitions/packetReviewExecution",
    "expected_valid": false,
    "base": "C04",
    "patches": [
      {
        "path": ["phase"],
        "value": "late_execution"
      }
    ]
  },
  {
    "case": "C06",
    "schema_ref": "#/definitions/packetReviewResource",
    "expected_valid": true,
    "data": {
      "resource_id": "res1",
      "resource_kind": "database",
      "ownership": "reused",
      "safe_reference": "fixture-database",
      "cleanup_status": "not_required"
    }
  },
  {
    "case": "C07",
    "schema_ref": "#/definitions/packetReviewResource",
    "expected_valid": false,
    "base": "C06",
    "patches": [
      {
        "path": ["cleanup_status"],
        "value": "completed"
      }
    ]
  },
  {
    "case": "C08",
    "schema_ref": "#",
    "expected_valid": false,
    "data": {
      "schema_version": 2,
      "runs": [],
      "packet_attempts": []
    }
  },
  {
    "case": "C09",
    "schema_ref": "#/definitions/packetReviewRun",
    "expected_valid": true,
    "base": "C02",
    "patches": [
      {
        "path": ["findings"],
        "value": [
          {
            "finding_id": "f1",
            "origin_actor_ref": "main",
            "packet_ids": ["P1"],
            "criterion_ids": ["criterion-one"],
            "original_claim": "Two sinks leak.",
            "failure_scenario": "An untrusted caller observes protected data.",
            "impact": "Unauthorized disclosure.",
            "proposed_correction": "Enforce the authorized boundary.",
            "confidence": "high",
            "original_severity": "required",
            "disposition": "partially_confirmed",
            "propositions": [
              {
                "proposition_id": "f1-p1",
                "parent_finding_id": "f1",
                "claim": "One material sink leaks.",
                "severity": "required",
                "disposition": "confirmed",
                "approval_material": true,
                "origin_actor_ref": "main",
                "assessor_actor_ref": "verifier",
                "affected_packet_ids": ["P1"],
                "criterion_ids": ["criterion-one"],
                "evidence_refs": ["e1"],
                "reason": "Independent exact-source assessment."
              },
              {
                "proposition_id": "f1-p2",
                "parent_finding_id": "f1",
                "claim": "The second sink is safe.",
                "severity": "required",
                "disposition": "refuted",
                "approval_material": true,
                "origin_actor_ref": "main",
                "assessor_actor_ref": "verifier",
                "affected_packet_ids": ["P1"],
                "criterion_ids": ["criterion-one"],
                "evidence_refs": ["e1"],
                "reason": "The exact source rejects this access."
              }
            ],
            "disposition_history_refs": ["disp1"],
            "disposition_history": [
              {
                "disposition_ref": "disp1",
                "sequence": 1,
                "source_version": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "observed_at": "2026-10-27T09:00:00Z",
                "assessor_actor_ref": "verifier",
                "disposition": "partially_confirmed",
                "propositions": [
                  {
                    "proposition_id": "f1-p1",
                    "parent_finding_id": "f1",
                    "claim": "One material sink leaks.",
                    "severity": "required",
                    "disposition": "confirmed",
                    "approval_material": true,
                    "origin_actor_ref": "main",
                    "assessor_actor_ref": "verifier",
                    "affected_packet_ids": ["P1"],
                    "criterion_ids": ["criterion-one"],
                    "evidence_refs": ["e1"],
                    "reason": "Independent exact-source assessment."
                  },
                  {
                    "proposition_id": "f1-p2",
                    "parent_finding_id": "f1",
                    "claim": "The second sink is safe.",
                    "severity": "required",
                    "disposition": "refuted",
                    "approval_material": true,
                    "origin_actor_ref": "main",
                    "assessor_actor_ref": "verifier",
                    "affected_packet_ids": ["P1"],
                    "criterion_ids": ["criterion-one"],
                    "evidence_refs": ["e1"],
                    "reason": "The exact source rejects this access."
                  }
                ],
                "evidence_refs": ["e1"],
                "reason": "Synthetic independently assessed disposition; prior records are retained in real use."
              }
            ]
          }
        ]
      },
      {
        "path": ["finalization", "judgment"],
        "value": "request_changes"
      }
    ]
  },
  {
    "case": "C10",
    "schema_ref": "#/definitions/packetReviewRun",
    "expected_valid": false,
    "base": "C09",
    "patches": [
      {
        "path": ["finalization", "judgment"],
        "value": "approve"
      }
    ]
  },
  {
    "case": "C11",
    "schema_ref": "#/definitions/packetReviewRun",
    "expected_valid": true,
    "base": "C09",
    "patches": [
      {
        "path": ["findings"],
        "value": [
          {
            "finding_id": "f1",
            "origin_actor_ref": "main",
            "packet_ids": ["P1"],
            "criterion_ids": ["criterion-one"],
            "original_claim": "Two sinks leak.",
            "failure_scenario": "An untrusted caller observes protected data.",
            "impact": "Unauthorized disclosure.",
            "proposed_correction": "Enforce the authorized boundary.",
            "confidence": "high",
            "original_severity": "required",
            "disposition": "partially_confirmed",
            "propositions": [
              {
                "proposition_id": "f1-p1",
                "parent_finding_id": "f1",
                "claim": "One material sink leaks.",
                "severity": "optional",
                "disposition": "confirmed",
                "approval_material": false,
                "origin_actor_ref": "main",
                "assessor_actor_ref": "verifier",
                "affected_packet_ids": ["P1"],
                "criterion_ids": ["criterion-one"],
                "evidence_refs": ["e1"],
                "reason": "Only optional advice survives."
              }
            ],
            "disposition_history_refs": ["disp1"],
            "disposition_history": [
              {
                "disposition_ref": "disp1",
                "sequence": 1,
                "source_version": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "observed_at": "2026-10-27T09:00:00Z",
                "assessor_actor_ref": "verifier",
                "disposition": "partially_confirmed",
                "propositions": [
                  {
                    "proposition_id": "f1-p1",
                    "parent_finding_id": "f1",
                    "claim": "One material sink leaks.",
                    "severity": "optional",
                    "disposition": "confirmed",
                    "approval_material": false,
                    "origin_actor_ref": "main",
                    "assessor_actor_ref": "verifier",
                    "affected_packet_ids": ["P1"],
                    "criterion_ids": ["criterion-one"],
                    "evidence_refs": ["e1"],
                    "reason": "Only optional advice survives."
                  }
                ],
                "evidence_refs": ["e1"],
                "reason": "Synthetic independently assessed disposition; prior records are retained in real use."
              }
            ]
          }
        ]
      },
      {
        "path": ["finalization", "judgment"],
        "value": "approve_with_comments"
      }
    ]
  },
  {
    "case": "C12",
    "schema_ref": "#/definitions/packetReviewExecution",
    "expected_valid": false,
    "base": "C04",
    "patches": [
      {
        "path": ["evidence_kind"],
        "value": "valid_reuse"
      }
    ]
  },
  {
    "case": "C13",
    "schema_ref": "#/definitions/packetReviewResource",
    "expected_valid": true,
    "data": {
      "resource_id": "res2",
      "resource_kind": "workspace",
      "ownership": "created",
      "safe_reference": "owned-workspace",
      "creator_actor_ref": "main",
      "creation_evidence_ref": "created-1",
      "cleanup_status": "pending"
    }
  },
  {
    "case": "C14",
    "schema_ref": "#/definitions/packetReviewLocation",
    "expected_valid": false,
    "data": {
      "path": "/private/fixture/example.mjs",
      "source_digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "start_line": 1,
      "end_line": 2,
      "file_mode": "100644"
    }
  },
  {
    "case": "C15",
    "schema_ref": "#/definitions/packetVerificationAttempt",
    "expected_valid": false,
    "data": {
      "attempt_id": "a1",
      "packet_id": "P1",
      "behavioral_source_version": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "specification_version": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "agreement_ref": {
        "id": "fixture-agreement",
        "revision": 1
      },
      "proposal_digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "required_kinds": ["red", "green"],
      "observations": [
        {
          "observation_id": "o1",
          "operation_id": "op-red",
          "sequence": 1,
          "kind": "green",
          "observed_at": "2026-10-27T09:00:00Z",
          "source_identity": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "source_refs": [
            {
              "path": "src/example.mjs",
              "source_digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              "start_line": 1,
              "end_line": 2,
              "file_mode": "100644"
            }
          ],
          "command_ref": "node --test test/example.test.mjs",
          "working_directory_ref": ".",
          "expected": "Relevant assertion passes.",
          "observed": "Relevant assertion passed.",
          "outcome": "passed",
          "assertion_observed": true,
          "restoration_status": "not_required"
        }
      ],
      "completion_state": "completed",
      "required_check_status": "passed",
      "restoration_status": "not_required"
    }
  },
  {
    "case": "C16",
    "schema_ref": "#/definitions/packetVerificationAttempt",
    "expected_valid": true,
    "base": "C15",
    "patches": [
      {
        "path": ["observations"],
        "value": [
          {
            "observation_id": "red1",
            "operation_id": "op-red",
            "sequence": 1,
            "kind": "red",
            "observed_at": "2026-10-27T09:00:00Z",
            "source_identity": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "source_refs": [
              {
                "path": "src/example.mjs",
                "source_digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "start_line": 1,
                "end_line": 2,
                "file_mode": "100644"
              }
            ],
            "command_ref": "node --test test/example.test.mjs",
            "working_directory_ref": ".",
            "expected": "Relevant assertion fails before the fix.",
            "observed": "Relevant assertion failed.",
            "outcome": "expected_failure",
            "assertion_observed": true,
            "restoration_status": "not_required"
          },
          {
            "observation_id": "o1",
            "operation_id": "op-red",
            "sequence": 2,
            "kind": "green",
            "observed_at": "2026-10-27T09:00:00Z",
            "source_identity": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "source_refs": [
              {
                "path": "src/example.mjs",
                "source_digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "start_line": 1,
                "end_line": 2,
                "file_mode": "100644"
              }
            ],
            "command_ref": "node --test test/example.test.mjs",
            "working_directory_ref": ".",
            "expected": "Relevant assertion passes.",
            "observed": "Relevant assertion passed.",
            "outcome": "passed",
            "assertion_observed": true,
            "restoration_status": "not_required"
          }
        ]
      }
    ]
  }
]
```

### Scenario examples requiring runtime checks

- Duplicate/lost reply: one unit judgment survives once; inspect actual effects
  before an exact safe retry. Another payload for that identity conflicts.
- Concurrent results: two disjoint same-source units survive; changing selected
  source before another submission makes that submission stale.
- Interrupted recovery: save unit/owned-resource refs, interrupt, and start a new
  native session/MCP process. Resume unfinished same-source work under new finite
  invocation timing, retaining prior evidence and cleanup limitations.
- Partial required claim: one required leak portion confirmed and one refuted
  yields request-changes in a complete normal run. Missing independent material
  assessment instead remains incomplete.
- Producer retention: execute two fixture packets without commits and replace
  handoff after the second; retrieve unchanged first-attempt observations in a
  fresh session and verify behavioral/technical freshness remains unchanged.
- Cleanup unavailable: retain an owned resource's safe recovery ref and unknown
  cleanup as incomplete; do not delete an unrelated reused fixture.
