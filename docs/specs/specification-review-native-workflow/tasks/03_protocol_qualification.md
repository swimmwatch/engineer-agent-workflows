# P03: Isolated Multi-Process MCP Protocol Qualification

Status: Technical agreement ready; parent waiting included; implementation not started

## Approved inputs

Reviewed specification: `source_version` = `73f93f290e0ee7f969abc43af3121ea341dbe82a1db897896c27c678d09e7f43`;
`specification_version` = `969d6857c4f6decb623d7b60d841223057289f9dc0fb94f85fa4291f573ade2f`;
`review_ref` = `442a54a2-2c8a-4cf0-b3eb-44e9e77edb05`.
S0 is complete with these reviewed identities. Read exact NWF-001/003/004/005/
006/007/008/009/010/011/013/014/015, plus P00/P01/P02 completion evidence.

## Technical proposal

Candidate `P03-parent-await-protocol-v5`, packet `P03`, includes the
exact `Shared technical commitments` heading of `tasks/plan.md`.

Add `tests/specification-review-protocol.test.mjs`. Run generated P01/P02 bodies
with controlled actor hooks whose protocol actions use real local MCP stdio
servers. Reuse `createSharedStdioHarness` and existing scenario fixture patterns.
Actors read their own exact originals, create simulated semantic findings and
submit their own batches. Simulation is explicitly not semantic qualification.
Do not replace actual MCP validation or synthesize receipts. Write only ordinary
specification Markdown as fixture input; create managed scope/decisions/reviews
through scenarios and never directly parse/edit their YAML or archives.

Use temporary projects and at least two distinct MCP processes sharing one
fixture project for concurrent submissions. Freeze real review/source/receipt
inputs. Coordinate controllable client/process boundaries to overlap batches;
assert both saved effects through public tools and fresh clients. Also test
separate projects/reviews to detect accidental cross-target mutable state.
Single-process promise tests alone do not qualify P00's persistence boundary.

Observe logical tool calls, assignments, source identities, saved responses,
public status/results and complete serialized tool-result bytes in test memory.
Every judge submits its own verdicts; there is no separate writer phase or
worker-to-worker context relay. Hold one submission response while another lane
acknowledges and starts its next group. Final consistency/completion must remain
unstarted until all required saved results are observed after the final JOIN.
Do not inspect protected mutable state to prove these properties.

The fixture's main-agent entry makes one real preparation-scenario call and passes
its bounded weighted-group/lane arguments after separate host checks; it does not require an opener/
status chain or inspection child. Exercise ready-to-run, blocked and completed
results. A server-ready response with missing native hooks/model routes still
must not dispatch. Verify preparation has no enrollment/checkpoint/reservation
side effects. Change source after preparation and before judge reads/submission:
actual MCP must reject stale operations. New invocation prepares again and sees
saved/current progress. This protects freshness without a separate model actor
or assuming native scripts call MCP directly.

The matrix covers a large instruction linked to at least 26 substantial
requirements, two partial corrections retaining earlier obligations, Unicode and
escaping, continuations, split batches/argument limits, invalid atomic members,
partial/repeated reads, stale/foreign contexts/receipts, source changes during
submission, conflicting overlapping content, identical retries after response
loss and server restart, retry retention beyond the generic 64-receipt window,
bounded server contention, in-flight cancellation and unknown effects. Verify
the confirmed K=20 adaptive formula, unequal-weight/lower-host-cap allocation,
bounded stateless lane continuations across process changes, >160-item completion
without a total cap, initial-prefix stability under other saves and saved-item preservation,
full final-context delivery, interruption after acknowledgment or consistency,
and fresh invocation recovery without enrollment/approval side effects.

Reuse existing reader compatibility/byte-budget tests, including real retained
continuations. Do not alter `reviewBody()`, materialization, receipt identity or
read serialization for test convenience. An actual older available runtime may
supply an optional cross-runtime compatibility check; absence is an explicit
limitation, not permission to invent an old cursor. Existing strict-context
recorders must retain their conflict behavior alongside the new submission path.

Establish discriminating RED against missing adapter behavior before completing
the matrix. Apply PROVE to direct-judge submission, no group barrier, target
isolation, saved-ACK ordering and final-gate assertions using disposable variants.
Restore all mutations. Reuse existing Node infrastructure; no general model
simulator, external service or fixture credential copy.

Bind the additional exact `Corrections and repeat-review scenario` heading of
`tasks/plan.md`. Extend the same real-MCP harness with full completed findings,
a single source-supported Draft correction set, exact summary/read/changes_receipt
and fixes, real followup enrollment, provisionally carried evidence, pending-only
native dispatch and fresh final consistency. Assert actual call/item sets against
the MCP's mandatory/candidate decisions, not a fabricated expected pass.

Exercise cross-impact on inherited C, quiescence before strict scope expansion,
withdrawal of carried/context evidence, rejection of prior cursors/receipts,
fresh preparation on the same followup and preservation of fresh saves. Include
saved-required reference pagination after restart/expansion without reading every
carried source. Cover repeated correction cycles from the latest findings parent,
unknown write effects, review-only no-edit scope, ineligible full fallback and
storage blockers. Observe carried_from and per-run actual reads distinctly; all
semantic actor answers are simulated. Apply the scenario's PROVE controls. Reuse
owning existing review-followup tests alongside the focused protocol test; no
additional real model review or production rewrite belongs to P03.

Bind the exact `Final-stage efficiency and recovery` heading in `tasks/plan.md`.
Extend the real-MCP matrix with read-only final preparation and Unicode/escaped
exact-delivery equivalence between programmatic same-actor loops and ordinary reads.
Interrupt before consistency saving and after saving but before completion; only
the latter can complete after restart with zero new judging children. Cover lost
completion reply, saved negative consistency and source/required-set/result
invalidation. Inspect actual state/calls, never synthesized receipts or semantic
proof from simulated actors. Apply and restore the shared PROVE mutations.

Bind the exact `Workflow ownership and parent waiting` heading in `tasks/plan.md`.
Hold the native invocation pending at the project-owned entry/runner boundary and
observe zero parent-generated status polls or extra coordination turns before its
terminal result. Then verify completion/error/cancellation handling and cleanup.
Inject a parent-polling mutation to prove detection; do not test JavaScript await
in isolation or remove the judges' required MCP integrity operations.

## Technical agreement

Selected `proposal_id`: `P03-parent-await-protocol-v5`; `packet_id`: `P03`.
`proposal_digest`: `519b4ffd8573d1c67275e569158a6bd3db1e202099bcc34e2729d2bdfa08e00c`.
Exact `agreement_ref`: `63b4212a-5120-4e93-8341-0f646c41d61b`, revision 12.
Current managed question: `63b4212a-5120-4e93-8341-0f646c41d61b`, revision 12.
MCP `planning_packet_check`: `ready` against the Approved inputs above.
Exact source headings: `Technical proposal` (03_protocol_qualification.md),
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

Require completed P00/P01/P02 with required checks, S0, exact new agreement and
separate execution authority. Reverify the shared stdio harness at
`packages/engineer-agent-workflow-mcp/test-support/stdio-harness.mjs:14`, existing
`test/review-batch.test.mjs`, `review-concurrency.test.mjs` and
`review-read-efficiency.test.mjs` in that package, and generated P02 resources.
Inspect usable Git status with tracked/staged/untracked overlap. No clean-tree,
commit, host installation or live model prerequisite.

Allowed future writes: the new protocol test, minimal cohesive test-only support
under `tests/lib/` if necessary, and this bundle's checklist/handoff. Fixture
managed changes stay inside temporary projects through scenarios. If a production
bug is found, preserve the failure and return it to the owning packet; do not
silently broaden P03 into MCP or renderer implementation.

### Acceptance and commands

The public trace/status assertions above must pass with real processes and the
new generated bodies. Report known saved/unknown states accurately on each
failure. A test using fabricated receipts or only one MCP process cannot close
concurrency acceptance. Test cleanup closes owned clients/processes and removes
only temporary test resources. Use bounded deadlines, not polling model turns.

Repository root; Node >=22.20.0 and existing dependencies. Create the new test,
observe relevant RED, complete the adapter/checks, apply required PROVE and run:

```bash
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node --test tests/specification-review-protocol.test.mjs
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/review-followup.test.mjs packages/engineer-agent-workflow-mcp/test/review-workflow-preparation.test.mjs packages/engineer-agent-workflow-mcp/test/review-submission.test.mjs packages/engineer-agent-workflow-mcp/test/review-concurrency.test.mjs packages/engineer-agent-workflow-mcp/test/review-batch.test.mjs packages/engineer-agent-workflow-mcp/test/review-read-efficiency.test.mjs
rtk proxy node --test tests/specification-review-workflow.test.mjs tests/specification-review-packaging.test.mjs
rtk proxy git diff --check
```

Recheck revised specification/technical bindings and scoped changes, update
checklist/current handoff, and stop after P03. Failed required checks retain an
incomplete packet with next action/owner. These results do not qualify real native
hooks or model understanding. No `testing-and-verification` target, shared MCP
refresh, global installation, commit or live trial is allowed by this packet.
