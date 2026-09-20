# Product definition, technical design, and task specification workflow

Date: 2026-09-13

Status: Consolidated research and design proposal; not an Approved specification.

Purpose: Preserve the preceding product-workflow proposal and the subsequent
artifact, identity, MCP, and context design in one input document for a future
specification. Tool names, fields, states, and new paths below are proposals,
not implemented APIs or already accepted schema changes.

## 1. Executive recommendation

Add three focused, separately invoked skills: `product-definition`,
`technical-design`, and `product-roadmap`. Extend the existing `idea-refine`
with a durable result that becomes the required input to Product Definition.
Keep the existing task specification, planning, design, and implementation
workflows instead of introducing a second delivery process.

The required upstream dependency is:

```text
Idea Refine result
  -> Product Definition / PRD
    -> Shared Technical Design
      -> Product Roadmap: stages, epics, stories, independent tasks
        -> One specification per independent task
          -> Task-local plan and verification steps
            -> Explicit design planning, only when declared
              -> Authorized incremental implementation
```

The arrows represent required evidence and lineage, not automatic invocation.
Roadmap consumes both the PRD and Technical Design. Product intent and stage
ambitions may be discussed before Technical Design; concrete delivery ordering
must reflect technical dependencies and risks. Later findings can return to
the upstream owner through an explicit amendment, not an undocumented reverse
dependency or an automatic rewrite.

Keep human-readable substance in Markdown, with stable addressable blocks.
PRD and Technical Design are separate multi-file artifacts from the beginning:
each has a short navigation index and registered thematic documents, not one
growing monolithic file. Keep structured relationships, lifecycle state, and
decision history in YAML.
Use scenario-specific `engineer-agent-workflow-mcp` tools to serialize, find,
validate, update, and assemble these artifacts. The agent supplies meaning and
judgment; MCP supplies deterministic mechanics. Neither YAML generation nor
arbitrary patch construction should be an agent's routine workflow.

## 2. Confirmed requirements and boundaries

These requirements come from the user and the existing repository process:

- Product Definition must be based on saved Idea Refine results. Technical
  Design must be based on saved Product Definition results. The earlier idea
  of making Idea Refine optional is superseded for this product-level chain.
- PRD and Technical Design must each support multiple files from the start.
  Treat them as two logical artifacts with separate document sets, not as two
  fixed Markdown files. This consolidated proposal remains one input file;
  it is not the future product's PRD or Technical Design.
- Every artifact is prepared through questions and answers following
  Spec-Driven Development principles. Known answers are reused, not repeatedly
  requested just to satisfy a checklist.
- Each independent task has its own specification, including technical tasks.
  Do not replace this with one feature specification shared by independent
  tasks. Test commands and RED/GREEN steps inside a task are execution steps,
  not automatically new independent tasks.
- Describe the product globally and support MVP, subsequent MVP iterations,
  production readiness, and other user-defined stages.
- Include epics, user stories, use cases, goals, acceptance evidence, and other
  elements when they carry useful meaning. Do not invent a user story for an
  infrastructure or research task merely to fill a field.
- Adapt depth to complexity and risk; confirm the manifest before loading
  profile instructions and load only active profiles.
- Use one authoritative source per fact, one shared skill-template source,
  and separately generated Codex and Claude artifacts.
- Workflow YAML access requires MCP. Missing capability blocks affected work;
  it does not authorize direct YAML editing, a fallback CLI, installation, or
  global reconfiguration.
- Native question tools collect real answers. MCP records their provenance,
  but cannot authenticate user consent or manufacture approval.
- Existing task specifications retain their approval process: material
  questions resolved, required completeness review passed, then the author
  writes `Approved` without another approval question.
- Planning, design planning, implementation, independent review, commits,
  installation, publication, and tracker synchronization retain their own
  authorization boundaries.

This document recommends a design; it does not approve the proposed new
storage contract, implementation phases, or product-artifact lifecycle names.

## 3. What the current repository provides

The following existing mechanisms make an incremental extension plausible:

| Existing source | Verified boundary or reusable mechanism |
| --- | --- |
| [Idea refinement](../../skills/idea-refine/SKILL.md) | Frames problems, alternatives, trade-offs, evidence, and questions; currently stops before downstream artifacts. A durable mandatory product handoff is an extension. |
| [Specification interview](../../skills/spec-driven-development/references/specification-interview.md) | Confirmed depth/profiles, saved questions and answers, partial amendments, resumption, and completeness checks. |
| [Planning](../../skills/planning-and-task-breakdown/SKILL.md) | Consumes an Approved task specification and confirmed manifest; owns local architecture, contracts, documentation, and test-first packets. |
| [Documentation and ADRs](../../skills/documentation-and-adrs/SKILL.md) | Documents established behavior and significant decisions; distinguishes current and proposed state. |
| [YAML contract rules](../../shared/references/yaml-contracts.md) | Scenario operations, server-owned identity/revisions, conflict recovery, and atomic single-file writes; related files are not one transaction. |
| [Requirement parser](../../packages/engineer-agent-workflow-mcp/src/requirements.ts) | Markdown heading IDs, duplicate detection, exact block offsets, and bounded version-linked reads. |
| [Decision operations](../../packages/engineer-agent-workflow-mcp/src/scope.ts) | Decision references and append-only revisions rather than replacement of historical decisions. |
| [MCP state](../../packages/engineer-agent-workflow-mcp/src/state.ts) | Context validation, locking, retry receipts, and atomic replacement of an individual file. |
| [Review model](../../packages/engineer-agent-workflow-mcp/src/review-model.ts) and [snapshots](../../packages/engineer-agent-workflow-mcp/src/review-snapshots.ts) | Review source versions and saved content; product-level PRD/Technical Design dependencies are not currently included. |
| [Manifest schema](../../shared/schemas/manifest.schema.json) | Existing specification scope contract; the product/task/upstream metadata proposed below is not yet present. |

Do not describe product-level lookup, multi-artifact checkpoints, or upstream
review invalidation as available merely because analogous spec-level code exists.

## 4. Research and what to adopt

These are selective adaptations, not a proposal to copy an entire framework.
The combined contract in this document is our design, not a claim that any
single upstream project implements it.

| Source | Useful idea | Adaptation and limit |
| --- | --- | --- |
| [BMad: shared architecture](https://docs.bmad-method.org/plan/design-ux-and-architecture/) | A compact shared architecture document with stable decision IDs aligns independently implemented work. | Record decisions whose independent reinvention would cause incompatibility. Keep task-local detail in planning. Do not import another approval or execution lifecycle. |
| [BMad: decision research](https://docs.bmad-method.org/plan/research-a-decision/) | Research begins with a decision; different questions need different evidence, and focused updates avoid repeating an entire report. | Share a conditional research protocol across skills. Do not make a broad research phase mandatory for every task. |
| [Spec Kit: agentic SDD](https://github.github.com/spec-kit/reference/agentic-sdd.html) | Separate requirements, implementation planning, clarification, and consistency analysis. | Preserve ownership of what/why versus how and check cross-artifact consistency. Keep our explicit task/spec relationship and test-first requirements. |
| [OpenSpec concepts](https://github.com/Fission-AI/OpenSpec/blob/main/docs/concepts.md) | Separate established behavior from proposed changes and scale rigor to risk. | Represent amendments and future-stage intentions without pretending they are current implementation. Do not copy its directory layout or task semantics. |
| [arc42 overview](https://arc42.org/overview/) | Architecture covers context, constraints, structural/runtime views, quality goals, decisions, and risks. | Treat these as a selection menu. A small product does not need twelve substantial chapters. |
| [C4 diagrams](https://c4model.com/diagrams) | Different architectural views answer questions at different levels. | Add a context or container view when prose is insufficient; deeper diagrams need a concrete coordination benefit. |
| [Jeff Patton: story mapping](https://jpattonassociates.com/story-mapping/) | Organize work around users' activities and useful product slices. | Keep stages connected to journeys and outcomes rather than a list of isolated technical components. |
| [Atlassian: PRD template](https://www.atlassian.com/software/confluence/templates/product-requirements) | Objectives, metrics, assumptions, stories, and boundaries make requirements discussable. | Use those concepts in a compact PRD without importing an external tracker or template hierarchy. |
| [Michael Nygard: architecture decisions](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions) | Preserve the context and consequences of significant choices, including superseded choices. | Retain append-only decision history; avoid separate hand-maintained copies of the same rationale. |
| [Shape Up: boundaries](https://basecamp.com/shapeup/1.2-chapter-03) | Bound the effort worth spending before exploring unlimited solutions. | Discuss scope and research effort early. Do not replace the requested roadmap with a different backlog philosophy. |

Research is evidence, not consent. External articles cannot decide the user's
market, budget, deployment obligations, or acceptable product trade-offs.

## 5. Skill responsibilities

### 5.1 `idea-refine`: clarify the opportunity

Input: the user's idea, known context, existing product evidence, and relevant
constraints. For an existing product, distinguish observed reality from a new
direction under consideration.

Persist a compact `idea.md` covering:

- The problem, affected actors, and current workaround or alternative.
- Desired value and the evidence supporting it.
- Meaningfully different directions, including a smaller alternative where
  applicable, and the chosen direction or unresolved choice.
- Assumptions, risks, non-goals, and questions that need research or interviews.
- Confirmed boundaries and references to actual answers and evidence.

Do not select a framework or create a full backlog. If the conversation already
establishes these points, capture and verify them rather than restarting the
interview. A concise result is still a real required upstream artifact.

Unresolved future hypotheses may remain explicit. Unresolved questions that
change the chosen problem, audience, or near-term scope block readiness for
Product Definition. The existing standalone ideation use remains useful, but
only a persisted, ready result can serve this product workflow.

### 5.2 `product-definition`: define product meaning

Required input: the ready Idea Refine result and its exact source references.
Existing research and product evidence supplement it; they do not replace it.

The PRD owns:

- Problem and audience definitions, vocabulary, product value, and goals.
- Success measures, measurement methods, known baselines, and agreed targets.
  Unknown measurements remain unknown; the agent must not invent them.
- Capabilities, use cases, actors, preconditions, main and exceptional outcomes.
- Business rules, product-wide constraints, non-goals, and explicit exclusions.
- Product ambition across horizons, assumptions, risks, and open questions.
- Product-level acceptance intent, distinct from task-specific test commands.

A Product Definition is the activity; `prd/` is its multi-file human-readable
result. `prd/index.md` provides navigation to thematic sources, not a full PRD
copy. Do not create a second `product-definition.md` that restates the bundle.
Concrete stage membership and delivery order belong to the roadmap, not a
competing backlog embedded in PRD documents.

The skill asks questions about meaning and observable outcomes, not framework
preferences disguised as product requirements. A genuinely user-imposed
technology constraint can be recorded as a constraint with provenance.

### 5.3 `technical-design`: define shared technical decisions

Required input: the ready PRD and confirmed product constraints, with preserved
lineage back to Idea Refine. Repository inspection establishes current reality;
research supports choices that current evidence cannot resolve.

The shared Technical Design owns:

- System boundaries, external participants, deployment context, and ownership.
- Architectural units and dependency direction where these matter across tasks.
- Data ownership, important flows, interfaces, and shared contract conventions.
- Technology and stack choices, alternatives, evidence, and significant costs.
- Quality requirements expressed through measurable scenarios where possible.
- Security, privacy, recovery, operations, and portability appropriate to risk.
- Migration strategy, compatibility commitments, known risks, and conditions
  under which a decision should be revisited.

Distinguish three meanings explicitly: implemented/current, accepted target
for a named stage, and hypothetical future option. An accepted design is not
proof that code implements it. Do not create distributed architecture just
because a hypothetical future stage might need it.

Keep this artifact's documents focused: record shared decisions that would
cause conflicts if different task implementers chose independently. The
`technical-design/` bundle separates warranted subjects such as architecture,
stack, data, interfaces and quality, with a short navigation `index.md`.
Planning still owns local
modules, algorithms, exact task-specific contract files, tests, and sequencing.
When a shared exact contract already exists, link its authoritative file or
element; do not reproduce it in Technical Design and every task specification.

### 5.4 `product-roadmap`: turn outcomes into independent work

For a delivery roadmap, required input is ready PRD and Technical Design,
including their known risks. The skill owns stages, epics, stories, independent
tasks, dependencies, and which task specifications should be prepared next.
The narrow research-task bootstrap below can populate draft research entries
before the artifact they are intended to inform is ready; it does not make
the delivery roadmap ready.

It does not immediately generate specifications for all future tasks. It can
identify a technical or research task without fabricating an end-user story.
Such a task still has an outcome, rationale, acceptance intent, dependencies,
and its own specification when prepared for execution.

### 5.5 Existing delivery skills remain distinct

- `spec-driven-development`: interview and specify one task using a selected
  upstream context. Confirm its own scope; product settings are useful defaults,
  not automatic task-level consent.
- `planning-and-task-breakdown`: consume that specification, document warranted
  task-local design, and build executable verification-first packets. If
  breakdown exposes another independent task, create a roadmap candidate and
  obtain the needed scope decision; do not hide it inside the original spec.
- `design-planning`: a separate explicit invocation only for manifest-declared
  design outputs. Use separately installed Penpot skills; keep the shared
  system under root `design/system/` and task screen sets under
  `design/specs/<slug>/`. A UI profile alone does not authorize design writes.
- `incremental-implementation`: one authorized execution packet, usable Git
  worktree, checks before implementation, meaningful RED, then GREEN and
  warranted PROVE. Small packets can be checkpoints within one task, not
  substitutes for the independent task/spec mapping.
- `documentation-and-adrs`: reconcile established documentation and significant
  settled decisions. Do not retroactively invent strategy to justify code.
- Independent code and security reviews remain separate invocations. Neither
  review nor a commit becomes a mandatory next-packet gate.

These dependencies do not enable implicit invocation. Recommendations name the
next skill; the user authorizes its operation separately. Preserve generated
host-specific question tools and explicit-only discovery metadata.

## 6. Shared interview, research, and readiness protocol

### 6.1 Adaptive interview loop

Apply the following protocol separately to Idea Refine, Product Definition,
Technical Design, and Roadmap:

1. Open the artifact's current context through MCP. Inventory supplied facts,
   prior answers, relevant repository evidence, and required upstream sources.
   Distinguish observed facts, user decisions, agent proposals, and hypotheses.
2. Propose `Lite`, `Standard`, or `Deep` and the relevant profiles, explaining
   the choice with a concrete example. Infer obvious UI/backend characteristics
   from the request; ask only when they are materially unclear.
3. Obtain explicit confirmation of this scope before loading profile-specific
   instructions. Load only the confirmed active references. An amendment loads
   newly needed profiles only after its corresponding scope confirmation.
4. Ask the highest-impact unresolved questions first. Each decision question
   presents the observed issue, understandable alternatives, a recommendation
   when supported, and the consequence of choosing it. Use simple examples.
5. Prepare the question in MCP, show the exact question through the host's
   callable native question tool, and record the actual answer or no-answer
   outcome. Use the returned references; never generate consent from defaults.
6. Save small checkpoints after answers. Preserve partial answers, unresolved
   portions, and predecessor references on amendments. Do not repeat settled
   questions unless their source or consequences have materially changed.
7. Run focused research only for an identified uncertainty. Present material
   choices to the user and connect the resulting decision to its evidence.
8. Draft the substantive artifact; MCP performs structured serialization,
   exact placement, link validation, and state updates.
9. Perform a proportionate independent completeness/consistency check against
   current upstream evidence. Structural validation alone cannot determine
   whether the product meaning is complete or technically sound.
10. When material questions are resolved and the required check passes, the
    author records readiness without an additional ceremonial approval round.
    Present the result and the next available workflow, then stop.

Suggested product-artifact readiness terms are `draft`, `ready`, and
`needs_reconciliation`. These are proposals for the future contract, not new
values to insert into today's schemas. Keep implemented/planned/hypothetical
as a separate content attribute, and keep task specification `Approved`
unchanged. An artifact containing well-marked future hypotheses can be ready
for its declared present scope; unresolved present-scope blockers cannot.

### 6.2 Proportional depth

| Depth | Typical product | Expected detail |
| --- | --- | --- |
| Lite | A small CLI or a single well-bounded application | Short idea and PRD, concise stack/boundary decisions, one near-term stage, a small number of tasks; no empty architecture sections. |
| Standard | UI/API product with persistent data and several coordinated features | Important journeys/states, shared contracts, data ownership, quality scenarios, dependencies, evidence-backed technology choices. |
| Deep | High-risk data changes, asynchronous workflows, multiple systems or demanding operational constraints | Failure/recovery scenarios, migrations, compatibility, security boundaries, operational evidence, explicit unresolved-risk treatment. |

Profiles are composable: `core`, `ui`, `backend`, `events`, `data`,
`operations`, `security`, and `cross-surface`. A backend-only artifact must
not load Penpot instructions. Profile activation does not automatically
require a separate file or a complete architecture document.

### 6.3 Focused research

Research is a conditional protocol shared by the new skills, not a mandatory
fourth new skill. Start with a decision and an agreed scope of investigation.

- Product questions may require user evidence, market/domain research, or
  validation of a hypothesis. Public web research cannot replace interviews
  with actual users or prove willingness to pay.
- Technical questions compare viable alternatives against current constraints,
  compatibility, maintenance, security, portability, operational cost, and
  reversibility. Establish relevant versions and use primary documentation.
- Separate known evidence from inference. Preserve source URLs, checked dates,
  version applicability, limitations, and the exact decision supported.
- When documents are insufficient, propose a bounded experiment with a success
  condition and required authority. Do not silently install or operate services.
- Save useful conclusions and exact evidence references. Refresh stale claims
  relevant to the present decision rather than rereading every report.

An independent experiment can be necessary before a PRD or Technical Design
is ready. Requiring that same ready artifact before permitting its research
would create a dependency cycle. Recommended bootstrap:

1. The owning interview identifies the exact unresolved question and proposes
   a bounded research task. Ordinary source lookup within the authorized
   interview is not automatically an independent task.
2. Through an explicit roadmap invocation, record a draft research task with
   its outcome, effort boundary, evidence requirements, and owning question.
   It may be pre-stage work; do not invent a ready stage or feature roadmap.
3. Prepare that research task's own specification, usually Lite, using ready
   upstream evidence where available and exact pins of the unresolved draft
   question. Record which artifact is intentionally not ready and why.
4. Its readiness rule verifies a bounded research objective and applicable
   constraints, not readiness of the artifact it is meant to inform. Its own
   specification still requires the usual confirmed scope and completeness
   check, and planning/execution still require explicit authorization.
5. Return the results to the owning interview. Research evidence does not
   choose the product direction or accept a technical trade-off for the user.

This proposed exception applies only to scoped evidence-gathering work. It
cannot admit feature implementation, publish a production architecture, or
make ordinary delivery tasks bypass Idea Refine, PRD or Technical Design.
MCP must distinguish this task purpose explicitly rather than accepting a
free-text claim that missing prerequisites are irrelevant.

### 6.4 No answer, resumption, and direct edits

A timeout, dismissal, or tool failure leaves a decision unresolved. Continue
only independent authorized work. On resumption, load current scope, pending
questions, changed source references, and the minimal required evidence rather
than the whole conversation or decision journal.

Direct user edits are authoritative expressions of intent. Detect them,
preserve their text, and reconcile their meaning and downstream effects. If an
edit breaks structure, MCP must report the ambiguity without overwriting it.
Do not attribute an unknown filesystem edit to the user or label it consent.

## 7. Product stages, epics, stories, and tasks

Use the following semantic relationship, with optional levels where useful:

```text
Goal -> Capability / Use case -> Epic -> Story -> Independent task -> Specification
                                                        |
                                                     Stage
```

Stage membership is orthogonal to the epic hierarchy. One epic can span
several stages, while a stage delivers outcomes from several epics. A task may
omit a story link if it is a technical enabler, but must have an explicit
reason and the relevant goal, constraint, or technical-decision references.

Stages have stable IDs and user-defined labels, not a hard-coded enumeration
such as `MVP | Production`. Each stage records:

- Intended outcome and how it will be evaluated.
- Included work and explicit exclusions.
- Entry/dependency conditions and exit/readiness criteria.
- Known risks, uncertainty, and the confidence of timing assumptions.

Detail the nearest stage enough to select and specify work. Keep the next
stage at story/capability level and distant stages at outcome/hypothesis level.
Do not prescribe dates, targets, or budgets that the user has not established.

An MVP can already serve real users in production. Required security, privacy,
backup, and data integrity guarantees follow actual exposure and risk; they
cannot be postponed solely because a stage is called MVP.

Stage completion is an integrated outcome check, not merely every task marked
done. For example, a functioning API and a functioning form do not alone prove
that the complete user journey works or that the product goal was achieved.

## 8. Persisted artifacts and ownership

### 8.1 Recommended first-version layout

Start with one product bundle per project and arbitrarily many task
specifications. Multiple projects have different product identities. Supporting
several independently managed products inside one repository is a separate
extension, not an implicit requirement of this layout.

```text
docs/
  product/
    manifest.yaml
    idea.md
    prd/
      index.md                 # derived navigation; no duplicated requirements
      overview.md              # problem, audience, value, goals and metrics
      scenarios.md             # capabilities and use cases, when warranted
      constraints.md           # business rules and constraints, when warranted
    technical-design/
      index.md                 # derived navigation; no duplicated technical rules
      architecture.md          # boundaries, units and shared decisions
      stack.md                 # technology choices, when warranted
      data.md                  # data ownership and flows, when warranted
      interfaces.md            # shared interface rules/refs, when warranted
      quality.md               # quality scenarios, when warranted
      security.md              # security/privacy rules, when warranted
      operations.md            # runtime/recovery obligations, when warranted
    roadmap.yaml
    decisions.yaml
    research/                  # only when research is needed
      <research-id>.md
    changes/                   # only for cross-artifact amendments
      <change-id>.yaml
    snapshots/                 # MCP-owned immutable evidence, created on demand
      <digest>.json
  specs/
    <task-slug>/
      manifest.yaml
      decisions.yaml
      spec.md
      plan.md                  # created by planning, not specification
      todo.md
      handoff.md               # planning and later; current state only
      ...declared contracts and execution packets...
design/
  system/                      # shared Penpot system and verified snapshots
    catalog.yaml
    ...declared system assets...
  specs/
    <task-slug>/
      experience.yaml
      ...declared linked screen sets and evidence...
```

This supersedes the earlier single-file-per-artifact layout. The paths under
`prd/` and `technical-design/` illustrate thematic separation, not a mandatory
list of empty files. Their exact initial names remain a proposal. Documents
are created by their owning stages, not all at project initialization.
Research, change records, and snapshots appear only when warranted.

For Lite, start each bundle with `index.md` and one short substantive document
(`overview.md` or `architecture.md`). Split out additional coherent subjects
when needed. Standard/Deep can start with several warranted thematic documents.
Neither depth changes the multi-file contract. Avoid both one file per paragraph
and an unlimited omnibus file; use subject/ownership and independent consumption
as the split criteria. Large remaining sections still support bounded reads.

### 8.2 One authority per fact

| Artifact | Authoritative content | Not its responsibility |
| --- | --- | --- |
| `idea.md` | Problem framing, alternatives, chosen direction, hypotheses and evidence summary | Full PRD, stack choice, execution backlog |
| `prd/` substantive documents | Product meaning, actors, goals/metrics, capabilities, use cases, business rules and product constraints, each at one thematic owner | Delivery ordering, duplicate API definitions, implementation steps |
| `technical-design/` substantive documents | Shared technical structure, accepted technical rules, quality/operational commitments and their applicability, split by warranted subject | Every local class/algorithm or a second PRD |
| Each bundle's `index.md` | No original product/technical requirements; derived titles, navigation and source references | A full document concatenation, hand-maintained registry or independent readiness decision |
| Product `manifest.yaml` | Product identity, confirmed per-artifact scope, document membership/routing, typed source links, global-constraint membership, readiness checkpoints | Copies of the prose, full decision history, roadmap task bodies |
| `roadmap.yaml` | Stages, epics, stories, tasks, membership, dependencies, task-to-spec binding and delivery evidence references | A second full specification or duplicate use-case text |
| Product `decisions.yaml` | Append-only product interview records and decision revisions, rationale, provenance and affected references | A hand-maintained competing current PRD or TD |
| `research/<id>.md` | A bounded research question, evidence, alternatives, conclusion, uncertainty and relevance | Product approval or unverified claims presented as facts |
| `changes/<id>.yaml` | Accepted change intent, impact assessment, checkpoint/recovery progress and validation receipts | A permanent competing copy of current product meaning |
| `snapshots/<digest>.json` | Immutable exact evidence needed to reproduce a checkpoint/review | Editable current state or an agent-maintained index |
| Task `manifest.yaml` | Existing confirmed scope plus proposed task identity and pinned upstream inputs | Ownership of the product roadmap |
| Task `spec.md` | This task's behavior, boundaries and acceptance requirements | Restating the whole PRD/TD |
| Task `decisions.yaml` | Local decisions and interview evidence, with links to relevant product decisions | Copies of every product decision |
| Task plan/checklist/handoff | Local design, checks, execution sequence and current implementation state | Re-authoring product strategy |
| Existing design artifacts | Shared design system and task-specific experience/screen evidence | A second product/business source of truth |

Short explanatory summaries may reference authoritative elements, but they are
explicitly non-authoritative. A changed implementation does not silently change
a product requirement. Historical snapshots and revisions are evidence, not
additional editable authorities.

### 8.3 Markdown versus structured storage

Recommendation: canonical semantic prose remains in Markdown. YAML owns only
the structured facts assigned to it above. Do not store a full PRD body in YAML
and maintain the same PRD independently in Markdown.

MCP renders and updates uniquely identified Markdown blocks from typed semantic
arguments. This gives human editability without making heading titles, filenames
or line numbers the identity contract. Thematic splitting and bounded block
reads complement each other; neither requires loading the whole artifact into
the agent's context. A parser-derived lookup cache is disposable. The saved
`index.md` is generated navigation, not that cache or another editable authority.

A fully structured source with generated Markdown is a viable alternative for
strictly machine-owned documents, but is not recommended here: it makes normal
user Markdown edits imports/reconciliation operations and adds synchronization
cost. Do not mix the alternatives accidentally.

### 8.4 Document registry and navigation

Use the existing proposed product `manifest.yaml` as the only authoritative
registry of artifact membership. Do not add a second per-directory YAML registry.
Each document record has server-owned identity and structured routing metadata:

- `document_id`: immutable identity within the product, such as `DOC-001`.
- `artifact_kind`: the owning logical artifact, such as `prd` or
  `technical_design`.
- `relative_path`: its validated location within the owning artifact directory.
- `role`: a defined subject or `navigation`; optional subject refs distinguish
  multiple documents of one role when the product genuinely needs them.

The exact schema and routing roles require specification. Membership belongs
to the manifest; semantic blocks and their titles belong to Markdown. Do not
duplicate block bodies or manually maintained byte offsets in this registry.
MCP derives `element_id -> document_id -> parsed block` lookup from registered
source files and invalidates that cache when membership or source bytes change.

The short `index.md` lists registered thematic documents with their titles and
links. Generate it during explicit authoring/checkpoint operations, not on
read-only calls. It contains no independent product decisions, constraints or
acceptance criteria. Detect a stale or manually changed index and reconcile
without silently overwriting edits; index content cannot override source files.

A new thematic file, rename, split, or move must update membership and
navigation through a recoverable checkpoint. A missing registered document or
an unregistered Markdown file inside either artifact directory is reported as
unresolved structure, not silently ignored or automatically adopted. The server
checks only these bounded artifact locations, not the whole filesystem.

### 8.5 Schema and retention boundaries

Define versioned strict schemas for the new product manifest, roadmap,
decision-log extension, and change checkpoints, plus a narrow extension of the
task manifest. Keep them under the existing shared schema ownership and package
them with MCP. The agent does not routinely load these schemas or emit YAML.

Preserve existing specification, decision, catalog, and experience contracts.
Do not silently insert new fields into old bundles. Product-linked workflows
require an explicit compatible schema/version; existing standalone specs remain
usable without fabricated product lineage.

Immutable evidence must survive restart and be referenced from durable
checkpoints, not stored only in temporary directories. Save exact relevant
source blocks, qualified IDs, document membership, provenance, and digests;
deduplicate identical
snapshots. Do not snapshot the entire growing decision journal for every task.
Keep referenced evidence. Automatic pruning, archival of history, or migration
needs a separately specified policy; a disposable index may be rebuilt freely.

## 9. Stable identities and traceability

### 9.1 Identity is separate from location and version

Use an immutable server-generated `product_id` as the namespace. Give each
product-linked specification an immutable `specification_id`, mapped to its
current slug through its task binding. Preserve existing slugs and requirement
IDs; do not migrate them merely to create prettier prefixes.

Within a product, use immutable typed IDs allocated by MCP:

| Kind | Example label | Owner and meaning |
| --- | --- | --- |
| Problem / idea direction | `IDEA-001` | Idea result; the opportunity or chosen direction |
| Actor | `ACTOR-001` | PRD; a user or external participant role |
| Goal / metric | `GOAL-001`, `METRIC-001` | PRD; intended outcome and measurement definition |
| Capability / use case | `CAP-001`, `CASE-001` | PRD; product capability and behavioral scenario |
| Business rule / constraint | `RULE-001`, `CONSTRAINT-001` | PRD; product-wide or explicitly scoped obligation |
| Shared technical rule | `TECH-001` | Technical Design; an accepted technical choice or requirement |
| Architectural unit / contract | `COMP-001`, `CONTRACT-001` | Technical Design; only when another artifact needs to reference the unit or contract |
| Risk / research | `RISK-001`, `RESEARCH-001` | The owning artifact and focused evidence record |
| Stage / epic / story / task | `STAGE-001`, `EPIC-001`, `STORY-001`, `TASK-001` | Roadmap; immutable work identities, independent of stage labels and ordering |
| Requirement | Existing IDs such as `REQ-001` | Qualified by specification identity, not assumed unique across the project |
| Decision / question | Existing server-issued identity and revision conventions | Qualified by product or task log; retain predecessor and answer references |
| Amendment / checkpoint | Server-issued change and checkpoint IDs | Durable update and readiness evidence, not another task ID |
| Physical document | `DOC-001` | Product manifest; stable member identity and routing, independent of its filename |

Examples are illustrative, not IDs to manually allocate. Do not number ordinary
paragraphs or trivial implementation details. Do not add UUIDs to every entity
when the product namespace plus immutable typed ID already provides identity.
Artifact kind plus product identity identifies a logical document set, not a
single fixed document. Its members have stable `document_id` values; titles
and filenames remain display/location data. Renaming a file preserves its
document identity. Splitting can create new document identities, but moving an
element between files within its artifact preserves the element's identity.

IDs never change when titles, priorities, stages, or slugs change and are never
reused after retirement. Removed referenced elements remain identifiable as
retired; replacement and split/merge relationships are explicit. Existing
decision `{id, revision}` references remain intact, with an added qualified
owner where necessary.

### 9.2 Qualified references and pinned versions

Separate an entity reference from a source pin. An illustrative API result is:

```json
{
  "ref": {
    "owner_kind": "product",
    "owner_id": "00000000-0000-4000-8000-000000000001",
    "artifact_kind": "prd",
    "element_id": "CASE-001"
  },
  "source_pin": {
    "checkpoint_id": "checkpoint-001",
    "document_id": "DOC-003",
    "content_digest": "<server-generated SHA-256>",
    "snapshot_ref": "<server-generated immutable evidence reference>"
  }
}
```

For a task requirement, `owner_kind` is `specification`, `owner_id` is its
specification identity, and `element_id` is the existing requirement ID.
Decision pins additionally select the exact decision revision. Neither a
tracker issue number nor an absolute filesystem path is a canonical identity.
External tracker IDs and URLs are aliases; no tracker integration is required.

`document_id` in a source pin records where that revision was captured; it is
not part of the element's canonical `ref`. Thus moving `CASE-001` to another
PRD document does not break task references. The old pin still resolves to its
immutable evidence, while current lookup uses the updated registry. Cross-file
duplicate IDs inside one logical artifact are invalid, even when the files have
different names. Moving an element to a different logical owner is an explicit
ownership change, not an ordinary file move.

Exact byte hashes detect source changes; versions identify checkpoints, not
semantic equivalence. Define encoding and hashing rules explicitly. A CRLF/LF
or formatting change can conservatively require reconciliation; it must not
silently be treated as a semantic approval or silently normalize user files.

### 9.3 Minimal explicit relationship contract

Represent only relationships that support a current workflow:

- PRD elements `derive_from` Idea Refine elements and evidence.
- Technical rules `satisfy` or `are_constrained_by` PRD elements.
- Epics/stories/tasks `advance` goals, capabilities or use cases.
- Tasks `belong_to` a stage and `depend_on` other tasks where required.
- A task `has_specification` with exactly one primary specification identity.
- Task requirements `refine` selected product elements and `must_follow`
  selected technical rules or contract references.
- Decisions `affect` qualified elements; amendments `supersede` revisions.
- Verification evidence `verifies` a requirement or a stage outcome.

Store a relationship at its dependent owner: product prose-element links in
product manifest metadata, roadmap links in the owning roadmap record, and
task requirement upstream links in the task manifest. Generate reverse lookup
from those edges. Do not hand-maintain both directions.

The roadmap owns task-to-spec assignment; the task manifest holds a validated
back-reference, not a competing editable assignment. Binding is a recoverable
cross-artifact operation. A second binding or mismatched product identity is a
conflict, not an invitation to infer which record should win.

A planned task may have `specification_ref: null` while awaiting preparation.
It is not implementation-ready. Before planning/execution, enforce one task to
one specification and one specification to one task. If a task is split, create
new task identities and specs; do not repurpose an old ID or clone its approval.

## 10. Deterministic MCP operations

### 10.1 Responsibility split

The agent decides what the product should do, interprets evidence, proposes
alternatives, and asks the user about material choices. MCP validates structure
and references, allocates identities, serializes files, resolves exact blocks,
assembles bounded context, and reports state. It cannot mechanically prove that
all semantic dependencies or product requirements have been identified.

Use the existing separate TypeScript MCP package and suitable existing parser,
schema, test, and concurrency infrastructure. This design does not require a
graph database, embeddings, a new lifecycle CLI, or a generic YAML patch API.

### 10.2 Scenario tool families

Names below describe proposed contracts. Publish their eventual strict schemas
and discover the active host's callable names; do not hard-code MCP namespaces.
Every writer receives a context, uses existing exact-retry conventions, and
returns the updated context. Semantic arguments are typed fields, not YAML,
JSON Patch, arbitrary key paths, or a replacement document.

| Scenario | Proposed tool(s) | Meaningful input and bounded result |
| --- | --- | --- |
| Open known product | `product_open` | Absolute project path; returns product identity, capability/schema versions, artifact readiness, pending changes, and context. Does not initialize missing files. |
| Inspect an artifact's documents | `product_artifact_documents` | Artifact kind and pagination; returns registered document IDs, roles, source versions and structural blockers, without loading all document bodies or writing an index. |
| Start product discovery | `product_begin` | Absolute project path, product name and supplied idea intent after explicit invocation; creates minimal identity and draft discovery state, not an approved product. |
| Frame opportunity | `idea_problem_define`, `idea_direction_select` | Problem/actors/evidence or chosen alternative and actual decision reference; returns the affected element and its new source pin. |
| Set product outcome | `product_goal_define` | Outcome, actor/problem refs, measurement method and known target or explicit unknown; creates or amends a goal. |
| Describe a use case | `product_use_case_define` | Actor, goal, trigger, preconditions, main and exceptional outcomes; returns the saved use-case ref. |
| Establish a product constraint | `product_constraint_define` | Rule, reason, applicability and decision evidence; makes global versus selected scope explicit. |
| Select shared technology | `technical_choice_record` | Decision question, selected option, alternatives, evidence, consequences and affected PRD refs; never receives an arbitrary TD document body. |
| Describe an architectural boundary | `technical_boundary_define` | Unit purpose, ownership, interfaces, dependency direction and relevant constraints; no forced component catalog for Lite. |
| Record focused research | `research_question_open`, `research_conclusion_record` | The unresolved decision, bounded question, sources, findings, recommendation and limitations. |
| Define a stage | `roadmap_stage_define` | Outcome, referenced goals, entry/exit criteria and label; no fixed MVP/Production enum. |
| Define epic/story | `roadmap_epic_define`, `roadmap_story_define` | Product links and a useful delivery slice; no duplicate full PRD use-case bodies. |
| Define an independent task | `roadmap_task_define` | Purpose, outcome, scope, stage or explicit pre-stage research, source refs, dependencies, acceptance intent, optional story; returns immutable task identity. |
| Bind a task to its spec | `task_specification_bind` | Task ref and existing/new spec intent; checks 1:1 identity and uses a recoverable binding checkpoint. Does not approve the new spec. |
| Read exact product evidence | `product_goal_get`, `product_use_case_get`, `technical_choice_get`, `roadmap_task_get` | A typed ref and continuation if needed; exact source, relationships, pin, and completeness flag. |
| Inspect candidates | `product_context_preview`, `product_context_next` | Purpose, task or artifact refs, and output budget; version-bound proposed input inventory followed by required source pages. |
| Prepare specification context | `task_context_prepare`, `task_context_next` | Task ref and drafting/planning/implementation purpose; manifest-derived profiles, required inputs, pending questions, source pins and complete/blocked state. |
| Interview | Existing prepare/record-answer/no-answer scenario pattern, extended to product owners | Exact question and proposal refs; records actual host outcome, not caller-supplied approval. |
| Check and observe readiness | `product_artifact_check`, `product_artifact_status` | Artifact kind and relevant refs; structural check versus read-only current status, with unresolved or stale evidence explicit. |
| Amend accepted meaning | `product_change_prepare`, `product_change_accept`, `product_change_status`, `product_change_finish` | Changed qualified refs, rationale, impact assessment, actual decision evidence, and checkpoint progress; stage-specific authoring tools apply the accepted content. |

The inventory is intentionally a design vocabulary, not a demand to implement
every operation before the first usable slice. Establish coherent scenario
coverage in the future specification; do not fill gaps with a generic
`update_yaml` or `set_field` escape hatch. A new caller request outside a tool's
contract is an explicit missing capability.

For example, `product_use_case_define` can accept an existing `use_case_ref`
when amending that specific use case. MCP assigns its location, ID on creation,
revision metadata and formatting. The agent supplies the scenario content, not
a Markdown heading template, YAML serializer output, or byte offsets.

For new content, route by its semantic kind and registered subject ownership.
If several destinations are plausible, return bounded subject choices and
request an explicit subject reference; never guess a filename from prose.
Reorganizing existing content uses dedicated PRD/Technical Design organization
scenarios with element and subject refs, not a generic filesystem or YAML patch.
File creation and registry updates are internal recoverable steps of those
scenarios. Their concrete tool schemas remain future specification work.

### 10.3 Exact lookup and safe Markdown edits

Use a versioned Markdown block grammar compatible with the existing approach:

```markdown
### CASE-001: Submit a request

#### Trigger

An authenticated requester submits a completed form.

#### Expected outcome

The request is saved and a confirmation is shown.
```

The heading contains the immutable ID; the title is editable. A block ends at
the next heading of the same or higher level. Required machine-addressed
sections use reserved stable IDs; subheadings belong to their parent block.
Do not parse matches inside fenced code as live identities. Exact grammar and
allowed element kinds belong to the packaged parser/schema contract.

For an edit, MCP:

1. Resolves the logical artifact and element ref through the current document
   registry to a member's validated relative path and parsed block. Validates
   project identity, artifact membership, routing and path rules.
2. Parses the actual current UTF-8 sources needed to validate lookup. Rejects
   duplicate IDs across the artifact's registered files, missing targets or
   members, unregistered source files, invalid structure, or an incompatible
   schema without guessing. Server-side parsing does not require sending every
   source body to the agent.
3. Under the appropriate lock, checks expected context, registry membership,
   target document bytes and referenced inputs. Stale edits conflict before
   writing; a cached offset alone is not sufficient evidence.
4. Renders the scenario's typed content and replaces only the parsed block.
   Rejects overlapping edits or attempts to change unrelated IDs/metadata.
5. Re-parses the candidate, validates references, serializes safely, atomically
   replaces the individual file and verifies the persisted result.
6. Finalizes required metadata/navigation changes through the checkpoint
   protocol, then returns the new context, changed refs, source pins and retry
   receipt. Updating a block must not silently skip coupled metadata changes.

Retain unrelated text, comments, user edits and supported newline formatting.
Use paths, parser offsets and filesystem primitives appropriate to supported
platforms, not shell-specific `sed` replacements or POSIX-only path assumptions.
Case collisions, Unicode, CRLF, renames, symlinks, interrupted writes, duplicate
IDs and malformed documents need executable coverage. Do not claim identical
locking/fsync guarantees on platforms where they have not been verified.

### 10.4 Read-only behavior, concurrency, and retries

Opening, listing, finding, paginating, status inspection, and context preview
do not modify authoritative files, append receipts or invalidate another
reader's context. Disposable internal caches are not workflow mutations.

A normal sequential writer uses the context returned by each successful
response. A real conflicting mutation still fails. On conflict, stop writes,
reopen, inspect what was saved, and reconcile the intended operation. Exact
lost-response retries must recover the original result without a duplicate
decision or record; do not retry arbitrary writes against auto-refreshed state.

Bind reads to a consistent source snapshot. If relevant files change while
assembling pages, report stale/conflict or return a previously captured coherent
immutable snapshot, never a mixture described as current.

Separate two checks:

- An editing operation compares the actual target file and its required input
  versions to avoid overwriting concurrent changes.
- A downstream consumer checks the selected upstream element pins, required
  relationship membership, and global constraints. It does not depend on every
  unrelated historical decision appended anywhere in the product.

Unrelated changes still require deterministic source selection to be refreshed
when relevant membership could change. Known unchanged IDs are not sufficient
to prove that a newly added global rule can be ignored.

### 10.5 Cross-artifact updates are recoverable, not magically atomic

The present MCP provides single-file atomicity. PRD, Technical Design, roadmap,
decision history and task bindings cannot be described as one transaction.
One multi-file PRD or Technical Design also cannot be treated as an atomic
file. Moving a block or splitting a topic can affect the original and target
documents, registry, generated navigation and checkpoint evidence.

For the first product extension, prefer a small durable change checkpoint:

1. Save the accepted intent, source versions, affected refs, planned operations
   and validation conditions in a change record. No acceptance is inferred.
2. Before changing affected current files, mark their product checkpoint as
   applying the change. Consumers of those affected inputs must block or use
   an explicitly selected earlier ready immutable checkpoint.
3. Apply each scenario operation atomically to its own file with an operation
   receipt. Record completed steps durably; preserve prior required evidence.
4. Validate the resulting links, artifact state, source lineage and agreed
   semantic/review evidence. Publish the new ready checkpoint only when the
   complete required set matches the validated hashes.
5. On interruption, inspect receipts and actual hashes to resume exactly or
   report a conflict. Do not silently clear locks, discard user changes, or
   assert success because some files were written.

For a multi-file artifact, the checkpoint records its registered member IDs,
locations, source hashes and derived-navigation state. Validate unique element
IDs across members and completeness of the declared artifact scope; one ready
topic does not make the entire artifact ready. Keep semantic input pins separate
from generated-navigation bytes so a cosmetic index change does not masquerade
as a changed product requirement. Artifact membership still participates in
selection validation, including detection of newly introduced global rules.

Suggested states are `prepared`, `applying`, `validating`, `complete`, and
`blocked`. Recovery checks the active marker and records; a partially applied
change cannot disappear from context after process restart. Normal reads must
never expose partially updated sources as a ready combination. External manual
edits do not obey MCP locks, so detect drift and block affected readiness rather
than promising a filesystem transaction against arbitrary external writers.

This is a proposal for a bounded recovery protocol, not an existing capability
or a general transaction framework. If stronger multi-file atomicity is needed,
specify and test that guarantee separately rather than implying it here.

### 10.6 Access and content safety

Pass the project path from the working context; do not introduce a maintained
project allowlist or scan the user's disk. Resolve only known product/spec/design
locations and validate traversal/symlink behavior. Qualified product IDs prevent
accidental cross-project binding, not authorization attacks by a trusted caller.
The process's filesystem permissions remain the access boundary; this is not a
project authorization sandbox.

Preserve current YAML safeguards and bounded parsing. Treat prose and external
research as data, not instructions to execute commands or expand permissions.
Do not save credentials, personal installation paths, or sensitive answers in
the journal. Absolute paths belong to runtime context, not portable source pins.

## 11. How the agent assembles context

### 11.1 Purpose-based input selection

| Operation | Required evidence | Normally excluded |
| --- | --- | --- |
| Product Definition | Relevant ready idea blocks, confirmed scope, unresolved product questions, referenced research | Detailed implementation plans and inactive technical profile instructions |
| Technical Design | Relevant PRD goals/scenarios/constraints, their idea lineage, current repository reality, decision-oriented technical research | Entire interview history and every future story |
| Roadmap | PRD outcomes/use cases, shared technical dependencies/risks, current stage/task state | Full local plans for all existing tasks |
| Pre-stage research task | Exact unresolved owner question, available ready sources, explicit draft-source pins, research boundaries and applicable constraints | Requiring readiness of the artifact the research must inform; feature implementation scope |
| Task specification | Selected task, stage outcome, relevant epic/story, exact product scenarios/rules, technical rules/contracts, applicable global constraints | Other stages' full backlogs and unrelated decisions |
| Task planning | Approved task requirements, confirmed task manifest, validated upstream pins, necessary exact contracts and design dependencies | Repeating the whole product discovery process |
| Implementation | One authorized packet, addressed requirements/contracts, relevant decisions, current worktree evidence and applicable global constraints | Full product history or independent review instructions |
| Amendment/review | Proposed change, affected exact sources, previous accepted evidence, current global consistency inputs | Unrelated historical revisions unless needed for the decision |

Source selection is not keyword search alone. Starting from task/element refs,
MCP follows declared dependency edges and includes mandatory global constraints.
Search helps find candidates; the agent checks scope and semantic relevance.
Do not infer absence of impact from absence of an edge.

### 11.2 Context assembly sequence

1. Resolve the actual project and product identity. Open existing product and
   task state through MCP, checking capability versions and unfinished changes.
2. Select an explicit artifact/task and purpose. Obtain a small inventory of
   required sources, readiness, active profiles and unanswered questions.
   If the task is ambiguous, ask rather than choosing the first matching title.
   For PRD/Technical Design, MCP resolves registered documents and their roles;
   it does not concatenate the directory or require the agent to read every
   thematic file. The navigation index is a discovery aid, not required evidence
   in place of the referenced source blocks.
3. Validate the upstream chain. A PRD needs ready idea evidence; Technical
   Design needs ready PRD evidence; a task needs its own correct binding.
   Apply the explicit research-only bootstrap when its purpose is to resolve
   a missing upstream input; never weaken the ordinary delivery prerequisites.
4. For a new specification, propose and confirm its scope manifest before
   loading profile instructions. Product scope provides hints, not consent.
5. Assemble mandatory global constraints and the selected local dependency
   closure. Include a compact product purpose/current-stage overview to reduce
   local reasoning detached from the product. Do not claim it replaces exact
   constraints or source content used for acceptance.
6. Fetch exact required blocks across selected member documents in bounded
   pages, with immutable source pins, document IDs, decision refs and provenance.
   Load history only when rationale, conflict or changed decisions require it.
   Follow required continuations to completion. If membership or relevant
   content changes during pagination, reconcile or use a declared coherent
   immutable checkpoint; do not mix pages from different artifact states.
7. Ask the agent to check whether important interactions or missing links make
   the proposed context insufficient. Escalate to additional bounded sources
   or a user question; MCP cannot infer all semantic relationships.
8. Save the consumed input refs and snapshot digest with the resulting artifact
   checkpoint. Revalidate them before completeness review and downstream work.

The response contract should expose `purpose`, selected identity, `context`,
`source_pins`, required/optional items, pending blockers, consumed/remaining
counts, `complete`, and `next_cursor`. These names are proposed fields, not a
claim about current responses. References and exact source bodies are distinct.

If a budget is too small, return an explicit continuation or
`needs_more_context`; never silently omit a global constraint and report
`complete: true`. A read receipt proves which content was supplied, not that
the model understood it. Context quality still needs behavioral trials.

### 11.3 Version propagation and completeness review

Extend review snapshots to include the exact selected upstream source content
or durable immutable references, qualified IDs and required membership/global
constraint versions. Merely attaching PRD links to a task manifest leaves the
current review fingerprint blind to later upstream changes.
Include the selected blocks' document provenance and validate membership of
the logical artifact. Do not mistake a hash of `index.md` for a hash of the
requirements distributed across its documents. A moved unchanged block keeps
its canonical ref; its current location and checkpoint still need validation.

A changed required source makes the affected task's current readiness need
reconciliation. New or changed global constraints require broad candidate
impact assessment. Unrelated history should not restart every review, but
uncertain influence must not be declared irrelevant automatically.

Preserve the existing safe review behavior: observation is read-only, writers
use returned contexts, and real conflicts are reconciled. For follow-up review,
retain the agreed boundary: local rechecking of fixes plus overall consistency;
scope changes, new user requirements or uncertain impact require a full pass.
Do not inherit old verdicts across changed product/technical requirements merely
because a task's own Markdown bytes stayed unchanged.

## 12. Changes discovered during task work

When implementation reveals an inconsistency, classify it before changing
anything: implementation defect, incorrect check, stale task contract,
environment problem, or a genuine upstream product/architecture decision.
Correct checks are not weakened to justify the code.

For an upstream issue:

1. Stop the affected implementation, preserve completed evidence and identify
   exact task and upstream refs. Continue only independent authorized work.
2. Prepare a small change proposal: observed example, intended new behavior or
   technical choice, alternatives, known/uncertain impact, and recommendation.
3. Ask the user when the choice changes scope or has material consequences.
   Record the actual answer and the affected decision revision.
4. Update the owning artifact through its authorized workflow. PRD owns product
   meaning; Technical Design owns shared technical choices. New product meaning
   must remain traceable to the idea, revisiting it when the direction changed.
5. Use the recoverable checkpoint for related updates; determine affected
   tasks/specs from explicit refs and a semantic consistency check.
6. Reconcile and review affected specifications and plans. Do not mechanically
   copy new upstream text into all specs or silently renew their approval.
7. Resume authorized implementation only with current requirements and checks.
   Verify resulting code and relevant documentation, then report the outcome.

If implementation follows unchanged accepted intent, no PRD/TD rewrite is
required. Record completion evidence and local decisions at their proper owner.
The change protocol is not permission to rationalize arbitrary implementation
choices after the fact.

## 13. Worked traceability example

The following is synthetic and illustrates structure, not real product choices
or actual user agreement.

Idea Refine records `IDEA-001`: requesters lose track of service requests.
The user chooses a small request-submission and tracking product instead of a
full service-management platform. Product Definition derives `GOAL-001`
(requesters can determine their request's state) and `CASE-001` (submit a
request), plus an access constraint: people see only their authorized requests.

Technical Design records `TECH-001` for the shared client/service contract and
`TECH-002` for server-enforced access rules, each linked to the relevant PRD
elements. Concrete stack choices require evidence and the appropriate user
decision; none is implied by this example.

`GOAL-001` can live in `prd/overview.md`, `CASE-001` in `prd/scenarios.md`,
and the access constraint in `prd/constraints.md`. `TECH-001` can live in
`technical-design/interfaces.md` and `TECH-002` in
`technical-design/security.md`. These paths illustrate locations; the tasks
refer to stable element IDs. Neither task needs every document in either
bundle, but both must receive the applicable shared constraints.

| Stage and epic | Independent task | Its own spec | Selected sources |
| --- | --- | --- | --- |
| `STAGE-001` / MVP-1; `EPIC-001` request submission | `TASK-001`: implement request-submission API | `docs/specs/submit-request-api/spec.md` | `CASE-001`, access constraint, `TECH-001`, `TECH-002` |
| Same stage and epic | `TASK-002`: implement request-submission UI | `docs/specs/submit-request-ui/spec.md` | `CASE-001`, shared API contract, declared design evidence; dependency on `TASK-001` where needed |
| `STAGE-002` / MVP-2 | Later task for improved request tracking | Created when that independent task is prepared | Tracking use case and then-current technical rules |
| `STAGE-003` / broader operation | Later operational tasks justified by actual risks | One spec for each independent task | Relevant quality/recovery constraints, not a blanket production template |

`REQ-001` in the API spec and `REQ-001` in the UI spec are different qualified
requirements. Renaming either directory does not change its specification
identity. Test authoring, RED, implementation and GREEN for the API task are
steps under `TASK-001`, not four tasks requiring four more specifications.

The stage's integrated acceptance checks the complete submit-and-confirm flow,
including the relevant authorization behavior. Passing the two local task
checklists is necessary but does not by itself establish stage success.

If a later accepted rule changes access from individual to organization-wide,
amend the owning PRD constraint, revise the affected technical rule and record
impact on both specs. Old snapshots remain evidence of the previous accepted
state. MCP flags both as candidates for reconciliation; the agent checks other
scenarios too. If a task was unlinked by mistake, missing linkage must not be
treated as proof that the task is unaffected.

## 14. Alternatives and trade-offs

| Option | Benefit | Cost and recommendation |
| --- | --- | --- |
| Two new skills: PRD plus roadmap together, separate Technical Design | Fewer entry points | Product meaning and frequently changing delivery order share a larger workflow. Reasonable for a very small collection, but not the best fit for distinct lifecycles here. |
| Three new skills: Product Definition, Technical Design, Product Roadmap | Clear ownership, focused context, natural reuse of existing task workflows | Adds one explicit transition and artifact handoff. Recommended. |
| Install a full external planning framework and only adapt integration | Less original interviewing logic | Its statuses, task hierarchy, artifacts and update mechanics may conflict with this MCP process. Borrow principles rather than maintaining parallel sources of truth. |
| Full structured product bodies with generated Markdown | Strong machine control | Direct human editing becomes an import workflow. Not recommended for this first version. |
| Canonical Markdown plus structured YAML relationships/state | Readable documents and deterministic ID-based operations | Requires a strict block parser, drift detection and recoverable related-file writes. Recommended, building on existing mechanisms. |

The main complexity is integrity of references and partial updates, not the
number of Markdown templates. Do not add a graph database, generic workflow
engine, visual roadmap editor, automatic backlog expansion or semantic-vector
index without a demonstrated requirement.

## 15. Suggested implementation slices for a future specification

No slice below is authorized for implementation by this document. Each newly
created independent implementation task must receive its own specification,
consistent with the confirmed task/spec rule.

1. **Artifact and identity contract.** Specify the product layout, ownership,
   multi-file membership/routing, Markdown grammar, source pins, task/spec
   binding, readiness and compatibility. Prove cross-file lookup and
   ambiguous-ID rejection using fixtures first.
2. **Idea-to-PRD vertical slice.** Persist interview checkpoints, ready idea
   evidence, a minimal PRD and selected context. Verify no-answer/resumption and
   the mandatory upstream relationship without generating a full future backlog.
3. **Shared Technical Design and research.** Add evidence-based technical-choice
   scenarios and PRD lineage, maintaining current/target/hypothetical distinctions.
4. **Roadmap-to-specification integration.** Add stage/epic/story/task scenarios,
   1:1 binding, selected upstream pins and review invalidation. Retain standalone
   specification compatibility and current design/implementation boundaries.
5. **Safe amendments and scale.** Complete recoverable multi-artifact changes,
   large-journal context assembly, direct-edit reconciliation and restart/retry
   coverage before describing the product lifecycle as fully supported.
6. **Skill integration and behavioral verification.** Update authoritative
   templates and host generation, run fresh-context end-to-end trials, document
   the actual callable contract, and verify the generated artifact limits.

Design the recovery protocol in the first slice even if its implementation is
staged. Do not ship a ready-state path that exposes inconsistent multi-file
results while deferring correctness to a later slice. Implement only complete
vertical capabilities; unsupported operations must fail explicitly.

Use tests/checks first, observe a discriminating failure, implement the smallest
coherent fix, and rerun the affected scenario before advancing. Independent code
and security review remain outside incremental implementation.

## 16. Acceptance scenarios to carry into specification

- Product Definition cannot become ready without the required ready Idea
  Refine evidence; Technical Design cannot become ready without its PRD input.
- A supplied complete idea needs a concise verification, not a redundant long
  interview. Missing material answers still block readiness.
- Before scope confirmation no profile instructions are loaded; afterwards only
  active ones are loaded, including after resumption and scope amendments.
- A Lite product produces useful short documents, not empty Deep scaffolding.
  UI/API and risky data/event examples retain their substantive constraints.
- PRD and Technical Design each use their own registered multi-file bundle from
  the first version. Lite needs only short navigation and substantive sources;
  optional subjects do not become empty templates or mandatory context reads.
- Duplicate element IDs in different files of one artifact are rejected.
  A move or split preserves canonical element refs and historical source pins.
  Missing members, unregistered sources and stale navigation are detected.
- Interrupted block moves or registry updates cannot expose a partly updated
  bundle as ready. Membership changes during pagination invalidate the affected
  selection; a newly added global rule is not missed because old blocks match.
- Context retrieves required blocks from multiple files without concatenating
  the bundles. Navigation alone never counts as the required semantic evidence.
- Each independent product, technical or research task gets its own spec before
  planning/implementation. A missing or duplicate binding blocks affected work.
- An independent pre-design experiment can obtain its own specification from
  the exact unresolved question and available evidence without pretending that
  its target PRD/Technical Design is ready. The same route rejects feature work.
- IDs survive title, stage, ordering and slug changes. Identical local labels
  in different products/specs cannot cross-bind accidentally.
- Duplicate Markdown IDs, unknown YAML fields, malformed structure, missing
  targets and unsupported contracts cause a precise no-write error.
- Exact block replacement preserves unrelated content, including direct edits,
  supported newline styles and non-ASCII text. Path and lock behavior is tested
  on the supported platforms, not inferred from one Linux run.
- Read-only calls and observation leave authoritative bytes/versions unchanged.
  Sequential writes use returned contexts; true concurrent changes conflict.
- A lost response, exact retry and server restart do not duplicate records.
  Partial multi-artifact updates remain visible and cannot appear ready.
- A large synthetic journal, including tens of thousands of lines, is consumed
  through bounded pages. Record actual returned bytes/context and verify exact
  recovery of required sources; do not count an untested token-saving claim.
- Context includes relevant task sources, their lineage and mandatory global
  constraints, while excluding unrelated history and inactive profiles.
  Budgets never silently truncate required evidence.
- An upstream change during context assembly or review cannot yield a falsely
  current complete snapshot. Changed global rules and dependency membership are
  detected, not only changes to previously selected block bodies.
- Exact snapshots let a review explain what was checked. Unrelated historical
  additions do not invalidate all tasks; uncertain semantic impact escalates.
- User edits are preserved and reconciled; an observed filesystem edit is not
  automatically labeled an authenticated user answer or approval.
- Stage completion checks integrated outcome evidence, not just task counters.
- No design stage is invoked for backend-only work. UI design remains a separate
  authorized stage using existing shared-system and per-spec screen artifacts.
- Fresh-context agents can move from task selection to a bounded specification
  and executable plan without the previous chat. The implementation agent gets
  enough exact evidence without receiving the full product decision history.
- Normal repository checks, MCP tests, strict schema/renderer checks, generation,
  host isolation and skill size limits pass for implemented slices. Model trials
  are explicit and outside ordinary tests/CI; unavailable checks remain unverified.

## 17. Decisions reserved for the future specification

The user has already settled the mandatory upstream chain, interview behavior,
MCP-only workflow data access, multi-file PRD/Technical Design storage, and the
one-spec-per-independent-task rule. Do not ask those questions again unless
the user explicitly changes the requirement.

Before implementation, confirm the material new proposals in this document:

- The three-skill split and durable `idea.md` extension of `idea-refine`.
- The narrow pre-stage research-task bootstrap, without weakening the required
  product-document chain or the independent task/spec relationship.
- One product bundle per project initially, canonical Markdown with YAML
  relationships/state, the exact thematic layout and registry contract, and
  the supported schema/block grammar. Multi-file support itself is settled.
- Product readiness/review semantics and the proportional independent review
  policy, retaining the established task-spec approval boundary.
- The recoverable change-checkpoint guarantee, immutable evidence retention,
  supported platforms, and explicit compatibility/enrollment behavior.
- Which scenario groups form the first complete implementation scope, and which
  remain explicitly unsupported until later tasks.

Do not turn these recommendations into already confirmed decisions simply by
feeding this document into the specification skill. The future specification
must resolve material choices, confirm its own depth/profiles, collect actual
answers, and preserve the distinction between existing behavior and proposals.

## 18. Consolidated outcome

The intended result is one continuous but explicitly authorized process:
clarify the idea, define product meaning, select shared technical decisions,
plan staged outcomes, then specify and implement each independent task.
Stable identities and source pins connect the levels and their multi-file
artifacts without copying entire documents. Scenario-specific MCP tools carry
the deterministic workload, while
the agent concentrates on evidence, questions, design judgment and verification.

This file is the consolidated input for that future specification. It neither
changes existing skills/MCP behavior nor authorizes implementation, migration,
installation, publishing, external tracker changes, or global configuration.
