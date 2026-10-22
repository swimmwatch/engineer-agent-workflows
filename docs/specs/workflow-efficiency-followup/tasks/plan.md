# Workflow Efficiency Follow-up Plan

Status: Approved, including the P02/P03 startup amendment. All four current
technical bindings are ready. Implementation has not started.

The existing shared boundary remains unchanged. WFE-009 is implemented by the
additional bound `Startup amendment technical proposal` sections in P02/P03.
P01/P04 retain their exact technical choices; their actual historical approval
was reconciled against the updated specification without another user question.

## Shared technical boundary

This Standard/core plan implements WFE-001 through WFE-007 within WFE-008's separately authorized planning boundary. The approved behavior remains in `../spec.md`; no additional profile contract, public API, dependency, persistent cache or configuration is introduced.

Use the existing public MCP operations and their returned opaque context, references, cursors and read receipts. Keep server integrity validation, completion checks, ownership and recovery semantics intact. Optimize consumer progression and instructions at their existing ownership points. Do not move server validation into an agent-side cache.

Before the first implementation edit, retain a private content-addressed baseline of the affected source and generated bundles, including the already present response-budget correction. Preserve that correction identically in baseline and candidate: it is not this workstream's speed improvement. Record staged, tracked and untracked state without resetting unrelated work. Freeze fixture inputs, observation rules and quality oracles before comparison; protect evidence from later edits. Private capture paths and transcripts must not enter committed reports.

Controlled workflow evidence observes actual tool operations and exact delivered source portions. Record actor/context identity, source identity/version/revision and requested portion identity; each reuse observation must refer to a complete prior delivery to the same actor that still has the exact text. Record each check's purpose, input identity and owning transition. Synthetic protocol verdicts establish protocol behavior only. Actual agent behavior requires a fresh-context controlled agent run with raw trace provenance; text matching and scripted assertions are supporting checks, not substitutes.

Testing for this workstream runs only on Linux, on Node.js 22.20.0 and 24.14.0, for the changed implementation snapshot. Preserve macOS/Windows compatibility, but report their native testing as excluded by the user, not passed. Generated Codex and Claude Code artifacts must pass existing structural checks on Linux; do not claim live Claude behavior from generation. Use existing runners and isolated stores/homes. A missing required runner, exact input, model trace or Linux result leaves qualification incomplete. Running remote CI, installing tools, committing or publishing needs its own existing authority; this plan grants none.

Bindings are the algorithms, ownership, existing public operation signatures and the bounded evidence semantics stated here and in each packet's `Technical proposal`. Private helper names and equivalent statement organization remain flexible. Every packet must recheck the pinned specification and its managed technical agreement before and after execution. Each implementation invocation executes only its named packet, updates the checklist/current handoff, and stops.

## Delivery details

The execution outline and startup amendment are approved. All four technical bindings return `ready` with no issues. WFE-009 passed independent specification review; the exact current source, specification and review pins follow. Packet dependencies, separate execution authority and the agreed Linux-only qualification remain in force.

### Approved inputs

- `source_version`: `76293b6d3f506fb927801c3b5f2bbd926b2ed0e03b82208d650ac98ff73af853`.
- `specification_version`: `b6b5db5ac1c359ed36ddcbce59d398ec3e4f49e993e1e14e4d9bd554fc764ff1`.
- `review_ref`: `63aeeff2-66e1-4eb9-bdc8-e624ec02fe52`.
- MCP completeness: `pass`, coverage `reviewed`, document `approved`, approval checkpoint `recorded`.
- Confirmed scope: Standard/core; `planning_artifacts: []`; standalone specification. No product task binding or design stage is required.

### Stages and prerequisites

| Packet | Deliverable | Dependencies | Current state |
| --- | --- | --- | --- |
| [P01](01_serial_review.md) | Existing review consumers advance without per-batch status; public regression/measurement evidence | Technical agreement, explicit invocation, preserved pre-change baseline and local runners | Technical binding ready; first packet, local preflight required |
| [P02](02_workflow_guidance.md) | Source/check reuse, compact authoritative startup guidance and discriminating trace assertions | P01 complete; baseline includes original workflow sources | Technical binding ready; P01 pending |
| [P03](03_qualification.md) | Actual workflow/startup traces, correct phase timing, paired measurements and both Linux runtime results | P01/P02 complete; actual model/capture capability and pinned Linux runtimes | Technical binding ready; P01/P02 and qualification prerequisites pending |
| [P04](04_developer_documentation.md) | Verified developer explanation in the existing guide | P03 complete and evidence verified | Technical binding ready; P03 pending |

Each packet is a separate invocation. Independent code/security review and commits are optional separate actions, not gates for the next eligible packet. A missing required test/result blocks that packet; it is not silently downgraded to optional.

### Requirement coverage

| Requirement | Owning change or preserved boundary | Verification owner |
| --- | --- | --- |
| WFE-001 | P01 loops, P02 review guidance; existing MCP scan/receipt contract | P01 public traversal tests; P03 equivalent outcomes/call counts |
| WFE-002 | P02 actor/source/portion-completeness reuse rule | P02 negative trace fixtures; P03 actual eligible reuse and required reread cases |
| WFE-003 | P02 purpose/input/owning-transition reuse boundary; runtime validators preserved | P02 assertions; P03 unchanged/changed-input and read-back traces |
| WFE-004 | P01 retained recovery/observer operations, P02 exact retrieval/recovery guidance | Public recovery regressions and P03 controlled interruption/acknowledgement/concurrency cases |
| WFE-005 | Existing preflight/preservation/handoff and bounded-retirement behavior retained | P02/P03 prerequisite, expected transition, external change and content-loss cases |
| WFE-006 | Existing metrics plus bounded trace evaluation | P01 RED/GREEN/PROVE, P03 public comparison and actual-agent evidence with separate timing categories |
| WFE-007 | Existing protocol/storage/budgets and both generated hosts; testing only Linux | P03 Node.js 22.20.0 and 24.14.0; no macOS/Windows pass claim |
| WFE-008 | Scope boundaries, separate authority and preservation of unrelated work | Every packet's scoped diff, managed state checks and current handoff |
| WFE-009 | P02 stage-specific startup instructions and preserved readiness/recovery | P02 obligation/resource checks; P03 matched startup, lost-context, stale/revoked agreement and event-boundary scenarios |

### Architecture and dependency direction

Existing consumer loops call existing MCP operations; the server retains validation, ownership, receipts, consistency and completion. Agent instructions remain in authoritative shared/skill sources and flow through the generator into separate host bundles. Test/capture code observes the public calls and actor traces; it does not drive runtime correctness or create a new persisted cache.

No separate profile contract is warranted because existing public schemas own the protocol. P02 adds authoritative common state-access and implementation-context references through existing resource generation/integrity units. P02/P03 also own the bounded test-side trace evaluator/capture adaptation. It reports actual operation/identity/completeness and startup phase evidence and rejects missing/invalid observations. Private section/helper organization may vary within the agreed boundaries; no runtime API or persistent cache is added.

### Environment and platform coverage

| Environment | Contract | Evidence planned / current limitation |
| --- | --- | --- |
| Linux, Node.js 22.20.0 | Required qualification | P03 public, packed, transport, recovery and affected regression checks; not yet run |
| Linux, Node.js 24.14.0 | Required qualification | Same checks on the exact changed snapshot; not yet run |
| macOS/Windows | Compatibility preserved | Native testing excluded by the explicit user amendment; no verified runtime claim |
| Codex/Claude Code generated artifacts | Matching isolated bundles | Generator/structural checks on Linux; live Claude behavior unclaimed |
| Current planning shell | Discovery only | Node.js 24.20.0, codex-cli 0.163.0; not a substitute for required qualification |

### Documentation, rollout and risks

P04 is warranted by the non-obvious retained scan index, expensive freshness/receipt rules, and interactions across instructions, consumers and runtime validation. It extends the existing guide after verification rather than duplicating the specification.

Primary risks are mistaking scan position for post-write coverage, suppressing continuations or independent reads, treating an identical result as the same validation boundary, and measuring synthetic fixtures as live-agent improvement. Packet checks and controlled counterexamples address each risk. Terminal pending reads and necessary recovery operations are reported explicitly.

Rollout consists only of local source changes and generated artifacts in separately authorized packets. Global installation, remote CI, commits and publication are not included. Rollback restores only identified packet changes while preserving unrelated work, stored sources, verdicts and operation history. A material contract change returns to planning/specification.

### Technical decision checkpoint

Original P01-P04 approval is retained in decision `2f4127eb-0121-457e-bf2f-1625a0cd88f6`, revision 5. Unchanged P01/P04 digests were reconciled using that actual answer in `85c06a5f-eb9c-4edf-9693-3a00b727b345`, revision 2. The user explicitly accepted the new P02/P03 proposals through the native host question; their current agreement is `f114d948-e904-4dff-a75c-086cd1f0b75f`, revision 2. All four current bindings return `ready`; exact digests and sources are recorded in their packets.

Planning is complete. No scope or technical-choice question remains pending. P01 is first eligible under its separate explicit implementation invocation and local preflight. Later packets retain their dependencies. Approval has not executed a packet or authorized installation, commit or publication.
