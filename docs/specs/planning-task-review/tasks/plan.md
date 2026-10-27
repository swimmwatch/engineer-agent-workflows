# Implementation Packet Review Plan

Status: Ready for separately invoked packet implementation. All nine technical agreements are current; no implementation is authorized by this plan alone.

## Approved inputs

- Specification: `docs/specs/planning-task-review/spec.md`, IPR-001 through IPR-025.
- Confirmed depth/profiles: Deep; core, backend and data.
- Behavioral source version: `3da917243e9367c9eec28ebe6662c2787afdde9cc59cd174b45128825e4a62de`.
- Specification version: `7fbb89419df3a1b920b425b161e6cd628f5035fb26ff37437450d521c4d32413`.
- Completeness review: `845484cd-a527-4841-acd1-7e92dc7f4d9b`; reviewed, 51/51, consistent.
- Declared planning contracts: `contracts/mcp.md` and `contracts/schemas/data.schema.json`.
- This standalone plan creates no product binding or design stage.

## Shared state commitments

Use the existing MCP-owned specification journal's `extensions.packet_review`
namespace for implementation-review runs and packet-verification attempts.
Behavioral decisions, technical agreements and specification completeness runs
keep their current owners and meanings. The new records are progress/evidence,
not behavioral decisions, and must not change the reviewed behavioral source
version or technical-proposal digests.

Reuse `state.ts` path safety, bounded schema validation, atomic replacement,
cooperating-writer locking and context/result envelopes. Use logical selected-
source/run/attempt identities for independent evidence appends rather than require
one reviewer to relay every other reviewer's physical journal context. Equivalent
retries acknowledge one saved result; conflicting payloads preserve prior records
and return an actionable conflict. A receipt proves delivery, not semantic truth
or reviewer independence.

Keep bounded observations and immutable prior attempts; do not retain raw tool
transcripts as the required record or duplicate observations in the handoff.
Retain the existing 16 MiB journal limit. A write that would exceed it must fail
before replacement and leave completion pending; no automatic history deletion,
migration, rollover, separate editable journal or global store is introduced.
Use exact scenario reads and continuations. Reports are derived views of the same
acknowledged records. Temporary resource cleanup never deletes retained history.

## Proposed delivery boundaries

These accepted boundaries are detailed in the numbered packets below. Implementation completion is tracked only in `todo.md`.

| Packet | Intended outcome                                                         |
| ------ | ------------------------------------------------------------------------ |
| PTR-01 | Validated progress/evidence state using existing MCP persistence         |
| PTR-02 | Exact Git and ecosystem inputs, bounded inventory and review units       |
| PTR-03 | Durable packet-verification producer and handoff references              |
| PTR-04 | Independent-stage records, finding verification and final verdict        |
| PTR-05 | Phase-local checks, proportional isolation, elapsed budgets and recovery |
| PTR-06 | Canonical skill, native/ordinary routes and generated packaging          |
| PTR-07 | Real Codex qualification and structural acceptance                       |
| PTR-08 | Real DeepSeek Harness qualification and restart acceptance               |
| PTR-09 | Durable developer and user documentation after qualification             |

## Native qualification matrix

PTR-07 and PTR-08 use the same non-sensitive scenario obligations on their actual
native hosts. Deterministic contract/fault checks supplement, but cannot replace,
native model execution. Combine related assertions in a fixture without dropping
their separate observations. Record actual model/provider, source/artifact/runtime
identities, source-bound MCP acknowledgments and PASS/FAIL/NOT TESTED per case.

| Case | Required native observation                                                                                                                                                                                                                                                                                                                  |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N01  | A clean packet completes all three independent fact directions, main review and verification; a reading-only direction executes no artificial test.                                                                                                                                                                                          |
| N02  | Known defect, ineffective tagged test, false finding, partial required/optional claims and an omitted material defect in a non-empty report receive the correct separate dispositions; existing reviewers perform the omission check. Necessary early, main and verifier checks remain attributable; valid reuse avoids redundant execution. |
| N03  | A selected packet group distinguishes staged/on-disk/untracked/historical inputs, exceeds one assignment's input budget and still assesses cross-unit interactions without dropping criteria.                                                                                                                                                |
| N04  | Stale/missing/legacy inputs and unavailable required proof retain diagnostic/incomplete meaning; a green check now cannot manufacture historical RED.                                                                                                                                                                                        |
| N05  | Two fixture packet executions without commits retain the first attempt after current-handoff replacement; behavioral approval and technical digests remain fresh.                                                                                                                                                                            |
| N06  | Lost reply, duplicate/conflicting submission, partial delivery and concurrent source/evidence changes preserve acknowledged state and require safe recovery rather than blind replay.                                                                                                                                                        |
| N07  | Real hung check/active child/overall expiry use small configured deadlines; actual cancellation/termination and cleanup are distinguished from requests or unknown effects. Harmless/reused fixtures survive; owned mutating workspaces and SQLite databases receive their required cleanup on success/failure/cancellation.                 |
| N08  | A new native session and MCP process resume acknowledged same-source units after interruption; a new full review still runs every independent stage. Secret-marker/private-path fixtures remain absent from emitted evidence.                                                                                                                |

Use repository-owned temporary Git fixtures and Node's built-in `node:sqlite`
for a real disposable database without adding a database service/dependency.
Runtime/runner/authentication capabilities must already be available; missing
capability remains a required qualification prerequisite, not an installation or
account-setup request and not a fixture pass. Fixture customer answers and seeded
stage records are labelled simulation-only. Retain bounded redacted observations;
private raw traces are optional and are never the sole required proof.

## Architecture and ownership

| Existing or proposed unit                                                                                        | Purpose, inputs/outputs and dependency direction                                                                                                | Important invariant / errors                                                                                       |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Existing `api.ts:6-25` and `server.ts:31`                                                                        | Typed tools and AbortSignal → validated domain calls/result envelopes; add the separate packet tool collections here.                           | No guessed namespace or unvalidated arbitrary mutation.                                                            |
| Existing `state.ts:380-497`; proposed `packet-review-state.ts`                                                   | Logical run/attempt/event → validated durable progress via existing lock/atomic replacement. All domain modules depend on this owner.           | Preserve history/metadata; duplicate/conflict distinction; 16 MiB limit; no process/resource execution.            |
| Existing `requirementSource`, `checkPlanningPacket`, `review-model.snapshot`; proposed `packet-review-inputs.ts` | Selected packet/Git/scope/agreements → exact source refs and bounded criterion/unit inventory.                                                  | Correct index/disk/tree identity, no tag-only coverage, stale/unsafe/oversized inputs explicit.                    |
| Proposed `packet-verification.ts`                                                                                | Actual ordered check observations → packet attempt retained independently of current handoff. Depends on state/input identity.                  | Failed required retention blocks producer completion; no fabricated past RED or altered behavioral/technical hash. |
| Proposed `packet-review.ts` and `packet-review-policy.ts`                                                        | Independent stage/unit/finding evidence → complete coverage and deterministic per-packet/group result. Policy is pure; scenario layer owns I/O. | No skipped direction, self-certification, lost required portion or obsolete main verdict.                          |
| Proposed `packet-review-execution.ts`                                                                            | Phase-local execution/resource/budget observations → acknowledged proof/recovery state; depends on state/policy.                                | Recording is not execution permission; only owned cleanup, actual finite control, no slot broker.                  |
| Canonical skill/body/meta; existing host renderer/catalog/shared verifiers                                       | Explicit invocation + actual tools/routes → independent native actors consuming/submitting bounded MCP evidence.                                | One source, three isolated targets; no automatic workflow/implementation; native availability is verified.         |
| Existing JsonlClient/stdio harness; qualification fixture support                                                | Owned real native sessions + shared deterministic seeds/oracles → source-bound actual host evidence.                                            | Native pass needs actual models, enforcement and fresh-session resume; structural results are separate.            |

MCP `src/` paths above are relative to `packages/engineer-agent-workflow-mcp/`.
Canonical guidance/schemas remain under root `shared/`; generators own their
host/skill mirrors. New private helpers may vary inside the accepted boundaries.
There are no new production services, libraries, installers or lifecycle CLIs.
Node's built-in SQLite is fixture infrastructure, not a database requirement on
consuming projects.

## Delivery order and dependencies

| Packet | Complete execution contract                                  | Dependency evidence                         |
| ------ | ------------------------------------------------------------ | ------------------------------------------- |
| PTR-01 | [01_review_state.md](01_review_state.md)                     | None                                        |
| PTR-02 | [02_exact_inputs.md](02_exact_inputs.md)                     | PTR-01                                      |
| PTR-03 | [03_packet_verification.md](03_packet_verification.md)       | PTR-01, PTR-02                              |
| PTR-04 | [04_review_lifecycle.md](04_review_lifecycle.md)             | PTR-01–03                                   |
| PTR-05 | [05_checks_and_limits.md](05_checks_and_limits.md)           | PTR-01, PTR-02, PTR-04                      |
| PTR-06 | [06_skill_and_distribution.md](06_skill_and_distribution.md) | PTR-01–05                                   |
| PTR-07 | [07_codex_qualification.md](07_codex_qualification.md)       | PTR-01–06                                   |
| PTR-08 | [08_harness_qualification.md](08_harness_qualification.md)   | PTR-01–06 + PTR-07 shared fixture artifacts |
| PTR-09 | [09_documentation.md](09_documentation.md)                   | PTR-01–08 required acceptance               |

PTR-07 creates shared fixture/oracle artifacts usable by PTR-08 after their local
checks pass; its native Codex verdict is not a DSH dependency. Both native verdicts
are required before final documentation acceptance. Execute one explicitly
selected packet at a time; local/native prerequisites and actual dependencies
control eligibility, not optional reviews or commits. `todo.md` is the sole
completion checklist; it currently has no implemented packet checked off.

## Requirement and verification coverage

| Requirement | Owning acceptance / qualification                | Observable boundary                                                                 |
| ----------- | ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| IPR-001     | PTR-03-A3; PTR-06-A1; PTR-09-A4                  | Explicit invocation and optional review; producer completion is separate.           |
| IPR-002     | PTR-06-A1/A2/A5/A6; PTR-07-A1; PTR-08-A1/A2      | Three isolated targets, actual capabilities, no assumed parity.                     |
| IPR-003     | PTR-02-A1/A2; N03                                | Explicit packet/group and target attribution.                                       |
| IPR-004     | PTR-02-A1/A2; N03                                | Correct staged/on-disk/untracked/historical bytes and modes.                        |
| IPR-005     | PTR-02-A5; PTR-03-A5; PTR-04-A4; N04             | Current inputs versus diagnostic/unavailable evidence.                              |
| IPR-006     | PTR-02-A3/A4; PTR-04-A1/A6; N03                  | Full criterion inventory, bounded units, integration and continuations.             |
| IPR-007     | PTR-04-A1; PTR-06-A2/A4; N01/N02                 | All three independent fact directions, including empty/null distinctions.           |
| IPR-008     | PTR-04-A1/A3; PTR-06-A2/A3; N02/N03              | Main five-axis assessment and integrated unit interactions.                         |
| IPR-009     | PTR-04-A2/A6; C09–C11; N02                       | Original claims, normalized propositions and complete disclosure.                   |
| IPR-010     | PTR-04-A1/A3; PTR-05-A1/A2; N01/N02              | Independent challenge, omission and whole-report consistency.                       |
| IPR-011     | PTR-05-A1/A2/A4; PTR-06-A3; N02/N07              | Checks in each phase, correct reuse and actual proof.                               |
| IPR-012     | PTR-05-A3/A4; PTR-07-A2; PTR-08-A3; C06/C07/C13  | Proportional isolation and created-versus-reused cleanup.                           |
| IPR-013     | PTR-04-A4; PTR-05-A5/A6; C03/C09–C11             | Separate process/coverage/confidence/judgment and correct finalization.             |
| IPR-014     | PTR-04-A6; PTR-03-A1/A2; PTR-09-A1/A3            | Every criterion, source, proof phase and historical/current distinction.            |
| IPR-015     | PTR-01-A1–A3; PTR-02-A4; PTR-03-A4; PTR-05-A6    | Published scenario/data boundaries and actual serving capabilities.                 |
| IPR-016     | PTR-01-A2; PTR-03-A4; PTR-04-A5; N06/N08         | Acknowledgment, duplicate/conflicting delivery and unit checkpoints.                |
| IPR-017     | PTR-01-A1; PTR-02-A1; PTR-04-A5; N06             | Exact logical source freshness and cooperating writers.                             |
| IPR-018     | PTR-04-A5; PTR-05-A5; PTR-07-A3; PTR-08-A4       | Same-source resume versus new complete review.                                      |
| IPR-019     | PTR-05-A3/A5/A6; PTR-06-A2; PTR-07-A2; PTR-08-A3 | Actual elapsed enforcement/cancellation, no custom proof scheduler.                 |
| IPR-020     | PTR-01-A3/A4; PTR-03-A2/A5; PTR-04-A6; N08       | Integrity, retention, bounded safe disclosure and explicit unknown history.         |
| IPR-021     | PTR-02-A5; PTR-04-A4; N04                        | Standalone path and exact existing product reads without rebinding.                 |
| IPR-022     | Both declared contracts; PTR-01–05; C01–C16      | Machine-checkable records and scenario semantics with valid/invalid/recovery cases. |
| IPR-023     | PTR-06-A5; PTR-07-A1–A5; PTR-08-A1–A5; N01–N08   | Structural all hosts; real Codex/Harness trials; Claude native NOT TESTED.          |
| IPR-024     | PTR-09-A1–A4                                     | Qualified docs, safe examples, output meaning and limits.                           |
| IPR-025     | PTR-01-A1/A4; PTR-03-A1–A6; N05                  | Durable per-attempt producer evidence independent of handoff/commit.                |

C01–C16 are structural contract examples in `contracts/mcp.md`, not runtime proof.
N01–N08 are the separately bound native matrix above. Each numbered packet
specifies focused new tests/checks and required PROVE mutations before production
changes. The data schema cannot replace the domain semantic/native checks named
in the MCP contract.

For negative qualification fixtures, PASS means that the expected rejection,
request-changes or incomplete result was observed. It does not mean that the
fixture's code was approved or its intentionally failed cleanup succeeded.
Unknown stop/cleanup must never be recorded as a positive workflow result;
the qualification caller must still account for its own fixture cleanup and
report any unexpected unresolved owned effects.

## Compatibility, rollout and recovery

Evolution is additive: preserve existing scenario names/context protocol,
behavioral decisions, planning agreements, specification review and product task
state. New packet-review capability is selected by actual advertised operations
and version-1 namespace support, not a guessed client/package minimum. The current
serving runtime identifies `workflow-2/product-1` and advertises the six required
planning scenarios; it advertises none of the 15 proposed packet scenarios.
Implementation must therefore test new builds through isolated owned MCP processes,
not pretend this currently loaded runtime was upgraded by a disk build.

The existing journal schema permits additional root metadata. PTR-01 adds the
canonical extension definitions/validation while preserving unrelated extensions.
Older incompatible namespace data remains explicit and unchanged; no automatic
migration, backfill, rollback rewrite or history cleanup. On a code rollback,
retain saved attempts/runs; a runtime lacking support must reject dependent calls.
Normal review is possible only with current trusted inputs; legacy history remains
diagnostic rather than being manufactured. New consumer activation requires a
matching bundle/runtime; source implementation and fixture qualification do not
authorize global activation.

No new UI/design, event transport, deployment/availability service, separate
security platform or OS certification is declared. Core/backend/data obligations
are covered by the two manifest-listed contracts and task-local verification.
The native verified-development target stays Linux x64. Preserve the Node.js
22.20.0 maintenance/MCP floor; local planning inspection used Node v24.20.0.

## Manual gates and external authority

| Gate                         | When / established owner                                                                                                           | Required disposition                                                                                                                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native runtime/model/control | Before PTR-07/PTR-08 inference; packet executor verifies the actual permitted environment/route.                                   | Missing prerequisite keeps that qualification incomplete. Installing/provisioning, account setup or raising authority needs separate user scope; no silent fallback.                            |
| Live bundle/MCP activation   | Only if a later consuming invocation needs new capabilities in the real host; caller/host operator verifies its active connection. | A refresh/reconnect/global replacement is a user-visible mutation requiring separate explicit scope. Isolated test processes may load the newly built artifact without modifying the live host. |
| External delivery            | Any future commit/tag/release/plugin publication or external comment; authority remains with the user.                             | No such action belongs to this plan or follows from a packet/review result.                                                                                                                     |

## Material risks and controls

| Risk                                                    | Planned control / owner                                                                                                                                                                                                                                                |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared journal growth and write overhead                | PTR-01/03 retain compact bounded observations; 16 MiB failure preserves history. PTR-03/07 may measure actual RPC counts/elapsed. No universal latency saving/SLA is claimed; a materially inadequate bound returns to planning rather than silently changing storage. |
| Exact original becomes unavailable or changes           | PTR-02/04 recheck source identity and preserve stale/diagnostic limitations; no permanent historical-source or external-writer atomicity promise.                                                                                                                      |
| A waiting timeout is mistaken for termination           | PTR-05/06 require real enclosing controls; PTR-07/08 exercise actual expiry, native stop/disposal and cleanup separately.                                                                                                                                              |
| Native label/receipt is mistaken for independent review | Actual fresh-context controls and N01/N02/N08 traces establish the operational boundary; MCP does not authenticate it. Missing capability/assessment stays incomplete.                                                                                                 |
| An omitted defect requires more independent capacity    | Existing non-originating participants assess it where supported; no new omission-only agent. Otherwise material uncertainty remains explicit.                                                                                                                          |
| Secrets or adversarial source become authority          | Fixed-argv/path validation, safe references, no private-env copying, owned fixtures and secret-marker native oracles; only active user/host authority permits execution.                                                                                               |
| Generator overlaps unrelated dirty work                 | Executor inventories protected content/attributes and expected source/generated writes. No bulk reset, installed-copy edit or unscoped generated reconciliation.                                                                                                       |
| Producer contract is not active in an old host          | Match actual governing contract/runtime; test the new producer using isolated built MCP/fixture workflows. Never retroactively require or fabricate missing old chronology.                                                                                            |

## Durable documentation decision

A separate final packet is warranted by four concrete signals: skill/native/MCP/
producer boundaries, non-obvious source and historical-proof rules, misconfiguration
risk, and new review-unit/proposition vocabulary. PTR-09 extends nearest existing
authoritative docs and adds one focused guide after end-to-end qualification.
No extra planning ADR, design artifact, operations service or profile file is added.

## Verified evidence and limits

- Repository behavior: `src/state.ts:380-497` supplies bounded submission locking
  and atomic replacement; `src/review-model.ts:11-17` excludes extension progress
  from behavioral source identity; `src/planning.ts:126` owns packet agreement
  readiness. Current exact tool calls returned ready for accepted bindings.
- Codex: [official subagent contract](https://learn.chatgpt.com/docs/agent-configuration/subagents)
  and [App Server turn/skill/interrupt contract](https://learn.chatgpt.com/docs/app-server#turns)
  were fetched. Local `codex-cli 0.163.0`, `codex exec --help` and
  `codex app-server --help` were inspected without model execution. This is not
  native qualification or proof of an elapsed deadline on every client surface.
- Harness: the pinned [workflow contract](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/packages/workflow/workflow/README.md),
  [PTC lifecycle/limits](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/packages/workflow/workflow-ptc/README.md)
  and [foreground tool contract](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/packages/workflow/tool-workflow/README.md)
  establish caller-owned cancellation/disposal and absence of an engine-wide timer.
  An inference from these contracts is that the chosen caller's effective deadline
  must be checked; an advisory guest timer is insufficient. No native trial ran.
- The [Node.js 22.20.0 SQLite contract](https://github.com/nodejs/node/blob/v22.20.0/doc/api/sqlite.md)
  was queried through the exact Context7 version for the dependency-free fixture.
- TokenSave returned a different repository/worktree and was excluded. Current
  repository exploration used CodeGraph and targeted source/configuration reads.

## Planning validation checkpoint

Current work is planning only. Draft 7 schema validation (19 definitions), all 16
expected valid/invalid examples, the 25-row requirement coverage map and all nine
packet structures have passed their authoring checks. All nine managed technical
bindings returned ready; the pinned Approved specification check returned pass.
Formatting is checked on the final saved planning files. Runtime/native behavior
remains NOT TESTED and belongs to the numbered implementation/qualification
packets. No production packet, global install/config, commit, publication, model
trial or provider/account setup was executed here.
