# Product-linked task recovery and dependency context

## Scope and evidence

- Findings: **P09-F02** (instruction/implemented-contract mismatch) and
  **P09-F03** (repeated relation scans; benchmark-first materiality).
- Basis: [saved audit findings](<../audit.md#L465-L503>), [P09](<../P09.json>) and
  [independent V02 verification](<../V02.json#L133-L176>).
- Reuse the supplied unchanged-source/distribution verification at 18:52:23Z.
  This explanation did not repeat the audit, execute task recovery, run tests,
  alter managed state, or measure performance.
- The owner-recovery operation already exists. The dependency-index proposal is
  conditional. Neither authorizes a new execution workflow or automatic takeover.

## Which skills actually participate

1. **product-roadmap** owns stages and independent task definitions/dependencies.
   It requires ready PRD/design pins and stops before specification or execution;
   it does not create execution packets. See the [roadmap contract](<../../../../../skills/product-roadmap/SKILL.md#L10-L21>).
2. **spec-driven-development** takes the product-linked branch only for a valid
   binding. Its [entry instruction](<../../../../../skills/spec-driven-development/SKILL.md#L25-L31>)
   routes to the [Specification role](<../../../../../shared/references/product-workflow.md#L26-L39>):
   reserve/register the exact task specification, prepare task context, exhaust
   context and exact source portions, then obtain the task's own confirmed scope.
   Product profiles/evidence do not become task consent.
3. **planning-and-task-breakdown** requires an Approved specification and confirmed
   manifest; for a valid binding it follows the [Planning role](<../../../../../shared/references/product-workflow.md#L41-L81>).
   It creates authorized planning artifacts, checks task inputs and may declare
   exact packet roots. It never starts a packet. See the [planning entry](<../../../../../skills/planning-and-task-breakdown/SKILL.md#L18-L25>).
4. **incremental-implementation** executes exactly one explicitly authorized packet;
   its [conditional product branch](<../../../../../skills/incremental-implementation/SKILL.md#L22-L39>)
   follows [Product-linked execution](<../../../../../shared/references/implementation-context.md#L67-L114>).
   Standalone work without a verified product binding skips product task tools.
5. Planning and implementation preserve separate specification/technical-agreement
   gates and pinned input versions. See [completeness and technical readiness](<../../../../../shared/references/implementation-context.md#L9-L47>).
   No ready artifact, matching hash or owner reference supplies invocation authority.

## P09-F02 — Canonical prose excludes an implemented exact-owner recovery

### Numbered trigger and current behavior

1. A task has a started P01 packet and needs the remaining P01/P02 queue restored.
   The current owner has not completed P01 and must not claim it did.
2. The reader reaches the [canonical reconciliation paragraph](<../../../../../shared/references/product-workflow.md#L72-L81>),
   which says only paused replanning authorizes reconciliation and unconditionally
   says a running owner is rejected.
3. The actual `task_inputs_reconcile` public contract already supports a separately
   explicit active-queue recovery with current `owner_ref`; see the
   [public adapter](<../../../../../packages/engineer-agent-workflow-mcp/src/product/tools.ts#L1103-L1114>)
   and [existing branch](<../../../../../packages/engineer-agent-workflow-mcp/src/product/tasks.ts#L1231-L1315>).
4. The implementation requires that exact owner in **both shared and local
   bindings**, retains the current packet in the requested queue, and checks fresh
   task-wide evidence/readiness. Missing/wrong owner is not a takeover path.
5. On success it archives the prior execution binding, resets state to `planned`,
   clears current owner/frozen execution inputs/progress and retains the requested
   packet queue. Historical Markdown remains unchanged. Restart is separate.
   See [archive/reset effects](<../../../../../packages/engineer-agent-workflow-mcp/src/product/tasks.ts#L1291-L1315>).

### Exact unnecessary restriction and minimal before / after

- **Before:** following the unconditional prose can cause a valid current-owner
  repair to stop, or encourage unnecessary completion/restart work just to restore
  the queue. This is a potential actor consequence, not an observed incident.
- **After proposed documentation alignment:** distinguish explicit paused replanning
  from separately explicit current-owner active-queue recovery; disclose the
  exact-owner/both-binding test, current-packet retention, immutable prior-binding
  archive, progress reset, fresh check and separately authorized restart.
- This is not a new API, a no-op queue edit, automatic input reset, continued use
  of old completion authority, or permission to complete unfinished work.
- A `planned` state alone does not prove absence of prior execution pins.
  `owner_ref` is execution identity evidence, not authenticated human consent;
  actual explicit invocation provenance and existing identity checks remain needed.

### Discriminating follow-up checks, not run here

1. Add a narrow text/contract consistency check for the canonical paragraph:
   both authorized branches and all bounded active-recovery effects must be visible.
2. Retain the [active-owner restore/replay regression](<../../../../../packages/engineer-agent-workflow-mcp/test/product-task-pins.test.mjs#L1047-L1118>):
   archived binding bytes remain exact, old owner cannot complete after reset,
   and a fresh separately invoked start establishes new execution authority.
3. Keep [negative owner/check cases](<../../../../../packages/engineer-agent-workflow-mcp/test/product-task-pins.test.mjs#L1079-L1099>):
   missing/wrong owner, mismatched bindings, omitted current packet and stale
   check reject without mutation. Completed tasks and unresolved review/safety/
   recovery issues remain blocked, not exceptions introduced by the wording.
4. If actor behavior is later studied, compare false-completion attempts and
   unnecessary blocked/clarification turns separately from server semantics.
   Existing tests are inspected evidence, not a test-run claim in this regrouping.

**Ownership:** the shared product-workflow instruction owner corrects one canonical
paragraph, coordinated with P02/P13 documentation ownership. Skill entry files do
not need separate rules: specification/planning already route to this reference;
implementation follows its conditional execution contract and consumes the reset
state on a later invocation. Roadmap remains a task-definition owner, not a reset
or execution owner. Generated/installed copies are separate authorized follow-up.
**Confidence:** high for the direct prose/contract mismatch; its practical frequency
and any saved turns are unknown. See [accepted qualification](<../audit.md#L469-L478>).

## P09-F03 — Dependency closure scans every relation for every selected node

### Numbered trigger and current operations

1. Specification, planning or implementation requests context for an exact bound
   task; implementation may provide validated packet-specific product roots.
2. `prepareProductContext` / `readContextPage` loads the exact selected generation
   and calls `collectContext` for task/packet-root closure.
3. Each newly selected reference scans the **entire** relation array to find
   outgoing targets. Node deduplication already prevents repeated expansion, but
   does not avoid unrelated-edge comparisons. See [task traversal](<../../../../../packages/engineer-agent-workflow-mcp/src/product/context.ts#L432-L473>).
4. After closure, selection includes global constraints and groups exact document
   pins/provenance; output is sorted into deterministic bounded pages. A later
   continuation recomputes closure from validated inputs. See [pin construction](<../../../../../packages/engineer-agent-workflow-mcp/src/product/context.ts#L504-L532>)
   and [page selection](<../../../../../packages/engineer-agent-workflow-mcp/src/product/context.ts#L679-L713>).
5. With R reachable references and E total relations, this part can perform R full
   scans of E, even when most edges are unrelated. This is source-level algorithm
   structure, not measured latency or proof that small tasks need optimization.

### Minimal before / after, only if measurements justify it

- **Before:** full relation scan per expanded reference, repeated on each page.
- **After conditional local change:** build one outgoing map in the task branch
  for that loaded call, keyed by full product/artifact/element `refKey`; preserve
  original relation order and **every relation kind currently traversed**, not
  only `depends_on`. Discard it after the call; no persistent graph/index/cache.
- One O(E) temporary map can avoid repeated comparisons but costs allocation.
  A queue index instead of `shift` is optional only if the same bounded measurement
  justifies it. Tiny closures may not benefit; benchmark-first remains the decision.

### Separate focused equivalence and materiality checks, not run here

1. Reuse [packet-root closure/provenance assertions](<../../../../../packages/engineer-agent-workflow-mcp/test/product-context.test.mjs#L365-L379>)
   and [deterministic repeated preparation](<../../../../../packages/engineer-agent-workflow-mcp/test/product-context.test.mjs#L415-L430>).
   Compare exact selected pins, page bytes, cursor progression and errors.
2. Measure relation comparisons, temporary memory and handler CPU/time for tiny,
   chain, fan-out, cycle, duplicate-edge and many-unrelated-edge fixtures.
3. Negative controls include foreign/broken references, inactive elements, packet
   roots versus legacy task closure, historical/current provenance, globals,
   pagination and changed-generation continuations. Preserve bounds and failures.
4. Evaluate model-inclusive task latency separately; asymptotics alone establish
   neither material server improvement nor fewer model turns/tokens.

**Ownership:** product-context traversal owns the conditional algorithm; existing
`Ref` identity and deterministic page regressions are dependencies. No skill
instruction change is needed, and roadmap semantics do not change. Specification,
planning and implementation are consumers only through their actual bound-context
contracts. Confidence is high in repeated scans; benefit/scale threshold is unknown.

## Source pins and existing gates do not shrink with context

Packet roots narrow semantic reading, not frozen input validation. The
[planning root contract](<../../../../../shared/references/product-workflow.md#L53-L70>)
retains transitive inputs, provenance, task identity and global constraints;
missing maps preserve full legacy context. The [execution contract](<../../../../../shared/references/implementation-context.md#L75-L100>)
selects frozen generations on resume, consumes exact sources, revalidates all task
inputs at start/completion and avoids an immediate duplicate unchanged check.
Neither finding removes those checks, source pins, independent semantics,
safety/recovery gates or one-packet authorization. See also the
[preserved audit guarantees](<../audit.md#L78-L109>).
