# P18: Document the verified product workflow

Status: Complete. Authorization: a separate explicit invocation of this packet.
Requirements: PWF-001, PWF-002, PWF-011, PWF-012, PWF-020, PWF-022, PWF-024, PWF-025, PWF-027, PWF-031, PWF-033–PWF-045.

## Outcome and boundaries

G02 adds PWF-042–PWF-045 documentation after P22–P24 and final P17 evidence.
The inputs below are refreshed from the completed G02 gate in plan.md.
Explain enhanced versus legacy full review, structured navigation versus exact
reading, conservative context corrections, bounded saved progress and classified
conflict recovery. Reuse existing proof-limit/compression explanations; do not
create a second manual or claim that planned tools are already installed.

Document actual runtime flow, automatic root and override, backup boundary, immutable pins, crash recovery, legacy non-enrollment and separate invocations.

Dependencies: [P17](./17_crossplatform_end_to_end_qualification.md).

Include the verified BR-01–BR-11 dispositions from P19/P20/P21: bounded error
recovery, normal revision history versus warnings, managed-artifact listing,
document status versus proof/approval, exact reading despite host compression,
full/followup choice, atomic verdict batches and measured residual journal growth.
Use only the G01/G02-approved and actually implemented contract; do not document proposed
fields as available. Preserve legacy storage/replay limitations, source-changing
full-review policy and the distinction between protocol receipts and actual
reading. Cross-link authoritative workflow guidance rather than duplicate it.

Additional requirement: PWF-034. Document verified supported reader/workflow
selection, context/receipt lifecycle and local-design boundaries from P19 without
duplicating whole tool schemas. Use the current pins below and recheck freshness
before execution.
Require their actual passing evidence in [todo.md](./todo.md) and
[handoff.md](./handoff.md), not their existence or a commit. No clean worktree
or existing commit is required, but Git status and scoped staged/unstaged/untracked
evidence must be available. Preserve all unrelated changes.

Allowed ownership:

- `README.md`
- `packages/engineer-agent-workflow-mcp/README.md`
- `docs/local-development.md`
- `docs/product-workflows.md`
- New focused test: `tests/product-documentation.test.mjs`; related isolated helpers/fixtures under its test directory.
- This packet's notes, todo.md and current-only handoff.md.

These production/test files are **planned**, not created by this planning invocation.
Do not implement another packet, modify Approved requirements, edit legacy workflow
YAML by hand, enroll existing specs, install/configure clients, commit or publish.

For template/catalog changes, edit only canonical sources, run `rtk proxy npm run generate`
inside this authorized packet, then verify both generated hosts. Do not install them.

docs/product-workflows.md is the planned durable behavior guide; existing READMEs and local-development.md link to it and keep their setup/overview ownership. No new installer or runtime behavior is in scope.

## Pinned inputs and minimal read set

- MCP source_version: `19372d90970cee2f81912887f11aeb804d0ea1d850402b279708d93985206a6e`
- MCP specification_version: `6e9aed5d083df98323ba346e28ebfc2f679086dc2399f0ef961520a7409dfa8d`
- MCP review_ref: `ef63de3e-c965-44b0-b4ed-8eaf961d7c8a`
- Open this repository's `product-planning-workflows` spec through callable MCP.
  Require Approved, `status: pass`, `coverage_status: reviewed`, matching source_version.
- Fetch the listed base requirements plus `PWF-035`–`PWF-041` with
  `requirement_get` using the pinned specification_version; consume every continuation.
- Contract: [mcp.md](../contracts/mcp.md), sections `Configuration`,
  `Specification workflow diagnostics`, `Atomic review-verdict batches`,
  and `Acceptance and qualification`.
- Schema: [data.schema.json](../contracts/schemas/data.schema.json), No complete schema read; use only scenario input/output definitions needed by the fixture..
- Quality input: [scenarios.yaml](../quality/scenarios.yaml), Q39–Q47.
- Recheck bounded baseline entrypoints:
  `src/state.ts:79,295`, `src/server.ts:15,47,80`,
  `src/requirements.ts:22` under the MCP package and
  `scripts/lib/distribution.mjs:37,61,68` for any generated assets.
  Existing functions are evidence to inspect, not claims that proposed product
  symbols already exist. Do not reread the full decision journal or all profiles.

## Ownership and lifecycle

Boundary: `existing public documentation`. Proposed entrypoints: `README, MCP README, local-development documentation`.
Typed inputs and exact result fields are owned by the named MCP/schema sections;
this packet must not invent a competing schema or generic edit endpoint.
Dependencies point from the tool adapter into domain functions and then guarded
storage, never from storage into host skills. Only this boundary's state is mutable.
Close owned descriptors/processes and release active-operation resources on success
or failure; preserve recoverable crash state rather than erase it.
Invalid/foreign/stale inputs fail before new effects; partial effects are disclosed
through the operation checkpoint. No caller error is proof that nothing was written.

Durable documentation is warranted by multiple process/storage boundaries, new vocabulary and non-obvious pin/safety/recovery behavior. Extend existing docs only after P17 is genuinely complete. A separate fresh reader, not the implementation author, must verify the documented scenarios.

## Acceptance, RED and PROVE

1. Document actual runtime flow, automatic root and override, backup boundary, immutable pins, crash recovery, legacy non-enrollment and separate invocations.
2. A fresh reader can locate a product, distinguish Draft/ready/pinned task, recover or safely report an interrupted operation, and explain a safety pause.
3. Validate documented tool examples against published schemas and run shell examples only in isolated fixture state; no global setup is executed.

| Case                                 | Discriminating observation                                                           | Explicit excluded outcome                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Q39: Developer documentation handoff | Examples match actual typed schemas and documented safeguards; limitations explicit. | No undocumented backup boundary, unsafe real-home commands or claims of unrun platform checks. |

The matching quality cases specify concrete setup/action and required mutations.
All tests use synthetic data, dedicated temporary product roots and isolated
workspace/Git state. Fixture customer answers are not real user consent.
Never target the operator's existing product root, installed bundles or real home.
Observe actual digests/file inventory, selected inputs, result data and operation
effects; do not expose mutable private state solely to fake an assertion.

1. **RED:** create the focused tests first and run the command below. Expected
   failure is the violated assertion above. A missing implementation/import can
   be preliminary RED only; the discriminating assertion must later be demonstrated.
2. **GREEN:** implement this bounded behavior and repeat while a correct check fails.
   Classify a wrong test, stale contract or environment problem before changing it.
   Do not loosen correct acceptance checks to make the implementation pass.
3. **PROVE:** apply each relevant single-behavior mutation from Q39
   in the isolated implementation, observe the intended assertion fail, restore,
   and rerun. New absence/wiring/post-hoc checks require this evidence.
4. **VERIFY:** run focused plus proportional full regression. Record actual commands,
   exit codes, assertions, environment and source versions. Planned checks are not passes.

## Commands and execution environment

Working directory: repository root. Preconditions: pinned project dependencies
available, supported Node runtime, a usable Git worktree and isolated fixture paths.
The focused file below must be created by this packet; it is not an existing script.

```sh
rtk proxy npm run build
rtk proxy node --test tests/product-documentation.test.mjs
rtk proxy npm run lint
rtk proxy npm test
rtk proxy npm run generate:check
rtk proxy npm run validate:foundation
rtk proxy git diff --check
```

Expected final result: exit 0 and every focused assertion passes; no
failed/unavailable required test. Full npm test is deterministic only.
P17 owns the required Linux qualification and portable-behavior checks. P18
must not claim that unexecuted operating systems or Node.js combinations passed.

## Rollback, gates and completion

Keep failed candidates isolated; leave prior ready input readable or report
explicit corruption/blocking. Do not delete retained versions, rewrite existing
user data, migrate legacy specs or silently reset operation state.
Restoring a test mutation is scoped to the agent's own change, not a worktree reset.

MANUAL GATE: installation, global environment edits, external CI dispatch,
publication and commits require separate explicit authorization. Independent
code/security review is separately invoked and is not a packet-completion gate.

Recheck the pinned specification through MCP before completion. Inspect the
scoped final diff and all newly created files. Mark only this packet in todo.md
when every required check passes, update handoff.md with actual evidence and
the next eligible packet, then stop. Otherwise record the concrete failed check,
next action and owner; do not auto-execute the next packet.

## Implementation checkpoint

Completed the verified product-workflow guide and linked it from the root,
MCP-package and local-development documentation. Q39 validates the documented
tool examples against the packaged product schema and the actual stdio
`tools/list`, while an isolated product root proves read-only discovery creates
no store. The guide distinguishes product and task review lifecycles, exact
reading from navigation summaries, task pins, storage and backup boundaries,
legacy non-enrollment, recovery limits and unexecuted-platform evidence.

RED first observed the missing guide and integration links. GREEN passed both
Q39 assertions. PROVE changed the documented operation-recovery safeguard to
permit unpublished tools; the lifecycle assertion failed, then passed again
after restoration. Final checks passed: build, focused Q39 (2/2), lint, full
`npm test` (436/436), generation check (16 skills), foundation validation
(16/16), Prettier check and `git diff --check`. The final local MCP gate remained
`pass` / `approved` / `reviewed` with no issues and the pinned source,
specification and review references unchanged.
