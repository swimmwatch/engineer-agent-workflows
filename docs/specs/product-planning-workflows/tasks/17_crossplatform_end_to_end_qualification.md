# P17: Cross-workspace, portable-behavior and fresh-context qualification

Status: Complete under the refreshed PWF-003 qualification
boundary. Authorization: a separate explicit invocation of this packet.
Requirements: PWF-003, PWF-005, PWF-012, PWF-019, PWF-021, PWF-022, PWF-024, PWF-025, PWF-028, PWF-029, PWF-030, PWF-033–PWF-045.

## Outcome and boundaries

Run two real local workspaces and two stdio processes through all four artifact stages, distinct task specs, a compatible change and a safety-blocking change.

Dependencies: [P16](./16_existing_workflow_integration.md), [P19](./19_mcp_tool_discoverability.md), [P20](./20_workflow_diagnostics.md), [P21](./21_review_verdict_batches.md).

## CDP report amendment (G02)

Additional requirements: PWF-042–PWF-045. Dependencies additionally include
[P22](22_full_review_consistency.md), [P23](23_structured_correction_review.md)
and [P24](24_review_conflict_causes.md). Use the current G02 pins in plan.md;
the inputs below are refreshed from the completed G02 gate.

Consume Q48–Q54 focused evidence and include its deterministic cases in the
required Linux qualification. Within the already planned fresh Codex trials, exercise
enhanced full consistency, finding-linked shared-context correction, structured
change navigation and conflict recovery on neutral synthetic data. Include
cross-section normative contradictions and a non-normative example without
revealing expected findings to the agents. Record actual calls/portions,
acknowledged progress, inheritance and final assessments; do not promise one
review will find every semantic defect. No new model/platform matrix is added.
Existing exact host-delivery and proof-limit checks are reused, not duplicated.
Retain previous P17 evidence. The five previously missing native rows are no
longer required and do not block completion. Repeat only affected final-state
checks after the new implementation; do not repeat unrelated completed work
without cause. Missing evidence that remains required still blocks completion.

## Session-report regression extension

G01 approved PWF-035–PWF-041 and supplied refreshed pins in the
[plan amendment](plan.md#session-report-amendment-2026-09-15). After P20/P21,
consume D01–D06, B01–B06 and Q40–Q47 evidence, repeat the deterministic
diagnostic/batch cases in the required Linux qualification environment, and
verify the final registered metadata from P19.

Within the existing explicitly invoked fresh Codex trials, exercise an invalid
saved option, oversized/mixed-stale batch, full versus followup routing, real
lossless source retrieval and a lost batch response with observer reads. Give
agents neutral task inputs, not expected call sequences or hidden verdict hints.
Compare raw stdio bytes, actual model-visible text, successful calls and persisted
results. A synthetic compression adapter tests detection only; it does not prove
real host compatibility. If the actual host hides mandatory text and no callable
lossless recovery works, retain that row as blocked, not passed with receipts.

Report read/write calls, journal bytes and elapsed time separately. Batch write
count reductions are deterministic evidence, not a claimed proportional speedup
of reasoning. No new model matrix, Claude trial, Penpot action or global
compression/client setting change is included. Do not run other operating
systems or additional Node.js combinations for this packet.

Additional requirement: PWF-034. Consume P19's live-discovery and metadata-parity
evidence; include its scenario tests in the Linux qualification. Existing
fresh-context trials use the corrected published metadata. Do not infer an
old/new model improvement from those trials without a controlled comparison.
Use the current pins below and recheck freshness before execution.
Require their actual passing evidence in [todo.md](./todo.md) and
[handoff.md](./handoff.md), not their existence or a commit. No clean worktree
or existing commit is required, but Git status and scoped staged/unstaged/untracked
evidence must be available. Preserve all unrelated changes.

Allowed ownership:

- `scripts/qualify-product-workflows.mjs`
- `tests/fixtures/product-workflows/`
- `docs/evidence/product-planning-workflows.md`
- New focused test: `packages/engineer-agent-workflow-mcp/test/product-e2e.test.mjs`; related isolated helpers/fixtures under its test directory.
- This packet's notes, todo.md and current-only handoff.md.

These production/test files are **planned**, not created by this planning invocation.
Do not implement another packet, modify Approved requirements, edit legacy workflow
YAML by hand, enroll existing specs, install/configure clients, commit or publish.

For template/catalog changes, edit only canonical sources, run `rtk proxy npm run generate`
inside this authorized packet, then verify both generated hosts. Do not install them.

The fixture directory is synthetic qualification input only; docs/evidence/product-planning-workflows.md records actual results. The new qualification script is explicit-run-only. No runtime/skill rewrite or remote CI dispatch is authorized by this qualification packet.

## Pinned inputs and minimal read set

- MCP source_version: `19372d90970cee2f81912887f11aeb804d0ea1d850402b279708d93985206a6e`
- MCP specification_version: `6e9aed5d083df98323ba346e28ebfc2f679086dc2399f0ef961520a7409dfa8d`
- MCP review_ref: `ef63de3e-c965-44b0-b4ed-8eaf961d7c8a`
- Open this repository's `product-planning-workflows` spec through callable MCP.
  Require Approved, `status: pass`, `coverage_status: reviewed`, matching source_version.
- Fetch the listed base requirements plus `PWF-035`–`PWF-045` with
  `requirement_get` using the pinned specification_version; consume every continuation.
- Contract: [mcp.md](../contracts/mcp.md), sections `Specification workflow diagnostics`,
  `Atomic review-verdict batches`, and `Acceptance and qualification`.
- Schema: [data.schema.json](../contracts/schemas/data.schema.json), No complete schema read; use only scenario input/output definitions needed by the fixture..
- Quality input: [scenarios.yaml](../quality/scenarios.yaml), Q36–Q38 and Q40–Q54.
- Recheck bounded baseline entrypoints:
  `src/state.ts:79,295`, `src/server.ts:15,47,80`,
  `src/requirements.ts:22` under the MCP package and
  `scripts/lib/distribution.mjs:37,61,68` for any generated assets.
  Existing functions are evidence to inspect, not claims that proposed product
  symbols already exist. Do not reread the full decision journal or all profiles.

## Ownership and lifecycle

Boundary: `test and qualification harness`. Proposed entrypoints: `product workflow qualification fixtures`.
Typed inputs and exact result fields are owned by the named MCP/schema sections;
this packet must not invent a competing schema or generic edit endpoint.
Dependencies point from the tool adapter into domain functions and then guarded
storage, never from storage into host skills. Only this boundary's state is mutable.
Close owned descriptors/processes and release active-operation resources on success
or failure; preserve recoverable crash state rather than erase it.
Invalid/foreign/stale inputs fail before new effects; partial effects are disclosed
through the operation checkpoint. No caller error is proof that nothing was written.

The qualification script is `scripts/qualify-product-workflows.mjs`, outside
automatic test discovery. It must require an explicit `--run` and do nothing on
import. Preserve the existing manual lifecycle workflow unchanged and do not
dispatch remote jobs. Portable behavior is checked through deterministic path,
case, Unicode, newline, permission, lock and interruption scenarios plus review;
macOS/Windows execution is not required and is not claimed.

## Acceptance, RED and PROVE

1. Run two real local workspaces and two stdio processes through all four artifact stages, distinct task specs, a compatible change and a safety-blocking change.
2. Run deterministic required scenarios in one Linux environment with a
   supported Node.js version. Other operating systems and Node.js combinations
   are not required and must not be reported as executed.
3. Verify the retained isolated fresh-context Sol/Terra evidence against the
   current harness and artifact digests. Rerun a trial only if its relevant
   implementation/input changed or the saved evidence cannot be verified;
   record real calls/read portions and independent review, not regex-only success.

| Case                                    | Discriminating observation                                                                | Explicit excluded outcome                                                                    |
| --------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Q36: Two-workspace full lifecycle       | Independent saved reviews and pinned task outcomes agree across all boundaries.           | No shortcuts via injected ready state, real user projects or global config changes.          |
| Q37: Portable behavior qualification    | Linux results cover restoration/rights behavior, size measurements and portability cases. | No unexecuted environment presented as pass or .pathname-based executable paths.             |
| Q38: Explicit fresh-context model trial | Capture real calls, selected reads, output versions and independent acceptance results.   | No hidden expected verdicts, simulated consent treated real, or model trials in npm test/CI. |

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
3. **PROVE:** apply each relevant single-behavior mutation from Q36, Q37, Q38
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
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/product-e2e.test.mjs
rtk proxy npm run lint
rtk proxy npm test
rtk proxy npm run generate:check
rtk proxy npm run validate:foundation
rtk proxy git diff --check
```

Expected final result: exit 0 and every focused assertion passes; no
failed/unavailable required test. Full npm test is deterministic only.

The existing explicit trial command is
`rtk proxy node scripts/qualify-product-workflows.mjs --run`. Use actual
preceding fixture artifacts in fresh author/reviewer/planner/executor contexts,
advisory Sol/Terra roles and independently collected results. Do not repeat an
unchanged successful trial solely because the qualification matrix changed.
Claude model trials remain deferred; generated Claude checks stay required.
Do not launch additional operating systems or Node.js versions for this packet.

## Implementation checkpoint 2026-09-20

Implemented the public-stdio qualification harness, explicit runner and
synthetic fixture. Q36–Q38 focused checks and their discriminating PROVE
mutations pass after restoration in Linux with a supported Node.js version.
Fresh Sol and Terra trials initially timed out before emitting observable MCP
calls. See [product planning workflow evidence](../../../evidence/product-planning-workflows.md).

The resumed G02 run resolved the model blocker without global installation.
Child Codex processes now ignore user configuration, load the current local MCP
build, and receive only the required read-only product/task tools. The original
`execFile` runner left piped stdin open, so Codex waited for EOF until timeout;
the streaming runner explicitly closes stdin and captures bounded output. Fresh
high-effort Sol and Terra trials now pass with model-visible MCP calls. The
earlier source and specification pins passed the MCP gate; no requirement drift
was detected at that time. Under the refreshed PWF-003 contract, unavailable
macOS, Windows and additional Node-version rows are no longer blockers.

The final invocation rechecked the current Approved/pass/reviewed pins, removed
the obsolete six-row native matrix from the explicit runner, and qualified one
executed Linux / Node.js 24.20.0 environment. The focused suite passed 5/5, the
full suite passed 434/434, both fresh high-effort Sol and Terra trials passed,
and build, lint, generation, foundation and whitespace checks passed. The new
native-row assertion produced a discriminating RED and a targeted PROVE failure
before restoration. See the linked evidence report for commands and metrics.

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
