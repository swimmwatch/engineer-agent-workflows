# Adaptive Specification Scope

Read before broad repository research or detailed requirements questions. Its
output is a user-confirmed scope shared with the planning workflow.

## Task Boundary Triage

First use the request, saved decisions and already available project evidence to
identify the intended outcome. Inspect only additional evidence needed to decide
its boundary. Several independently acceptable outcomes warrant a split proposal;
length, screen count and profile count alone do not. UI, API and storage serving
one outcome normally stay together, including required safety and recovery.

For a compound request, unclear separation, or material expansion during the
interview, read `references/scope-boundaries.md` before choosing depth or reading
new profiles. Resolve the boundary choice first, then apply the ordinary scope
sequence below to the selected work. For an already bounded request, continue
without a decomposition question or another artifact. Reuse an explicit boundary
answer; do not ask again without new material evidence. Depth measures risk and
required detail, not permission to collect unrelated outcomes into one Deep spec.

## Evidence-First Triage

Infer what the request and repository already establish. Do not ask for facts
already established. Ask only missing facts that can change depth, profiles, or
required coverage, using plain language and simple examples. Typical unknowns
are:

- whether people interact through a visual UI;
- whether a library, CLI, configuration, or internal-tool contract changes;
- whether behavior crosses an HTTP, RPC, event, or external-service boundary;
- whether stored data, migration, retention, or rollback is involved;
- whether concurrency, offline work, multiple deployables, or several teams are involved;
- whether security, privacy, compliance, availability, latency, or irreversible
  effects are material.

Batch only independent questions within the callable tool's advertised limit.
A profile is one of `core`, `ui`, `backend`, `events`, `data`, `operations`,
`security`, or `cross-surface`. `core` covers library, CLI, configuration, and
tooling contracts; it can stand alone or combine with UI and backend profiles.
Give every considered profile a state of `active`, `not_applicable`, or
`needs_user`, plus a short evidence-backed reason.

Do not load any profile reference before the manifest is confirmed. After
confirmation, derive one path per active profile as
`references/<profile>-requirements.md` and load exactly that set. Do not load a
file for an inactive, not-applicable, unresolved, or merely possible profile.
This one-to-one routing is exhaustive; never substitute a grouped profile file.

## Platform Support

Before scope confirmation, establish platform support per component. Reuse
requirements already established by the user or verified project contracts;
include them in the scope proposal without asking again. Otherwise ask which
platforms or environments the result must support through `ask_user_question`
and the existing MCP question/answer sequence. Adapt the question to the task:
OS/runtime for a CLI or service, browsers/devices for a UI. Ask versions and
architectures only when they materially affect support or acceptance.

Resolve and checkpoint an unanswered material platform decision before calling
`scope_propose`. Do not batch that question with scope confirmation. Include the
resolved support in the proposal rationale; revise any earlier proposal affected
by the answer before requesting its confirmation.

Distinguish development, build, and runtime environments when material. A
single-platform target is valid; the current machine alone is not evidence of
the intended support. Keep an unanswered material support question unresolved;
do not infer an answer from silence or a proposed default.

Apply the answer only to relevant active profiles after scope confirmation.
Client support does not imply the same server support. Do not require every
platform combination; identify the combinations that affect observable behavior.
This is shared scope, not a new profile or a reason to load inactive references.

## Compact Artifact Registry

Use this small registry before profile references to name warranted planning
artifacts in the scope proposal:

Entries are candidates, not mandatory output for an active profile. For a Lite
change to an established interface, keep the contract in `spec.md` and its task
packet; pass `artifacts: []` to `scope_propose` unless machine validation, several consumers,
or an explicit requirement needs a separate source. Do not create a contract
file merely because `core` is active. Preserve an existing authoritative schema.

- `core`: `core/contracts.yaml` or an existing repository-native schema;
- `ui`: project-root `design/system/catalog.yaml`, `design/system/library.penpot`,
  `design/specs/<slug>/experience.yaml` and `design/specs/<slug>/screens.penpot`;
  shared tokens and derived previews only when warranted;
- `backend`: `contracts/openapi.yaml` for HTTP or the repository's protocol IDL;
- `events`: `contracts/asyncapi.yaml`;
- `data`: `contracts/schemas/` for independently validated data;
- `operations` or `security`: `quality/scenarios.yaml` when measurable scenarios are material;
- `cross-surface` or material architecture: `architecture/model.dsl` and an ADR only when a consequential choice exists.

These paths are routing metadata, not profile guidance. The detailed references
decide content only after confirmation; if they expose a materially different
artifact need, append a decision revision and reconfirm the manifest.

## Depth

Choose the highest applicable depth; do not average away one high-risk signal.

- **Lite** — one bounded, familiar behavior; one ownership boundary; no material
  public contract, migration, distributed coordination, or high-risk control.
  Example: adjust validation inside one established service.
- **Standard** — several interacting states or components, a material UI or API
  contract, persistent state, or moderate compatibility and recovery concerns.
  Example: add a screen backed by an existing HTTP service.
- **Deep** — multiple deployables or external parties, public contract evolution,
  distributed coordination, difficult migration or rollback, complex UI state,
  strict SLO, or security/privacy/compliance-critical behavior. Example: move a
  payment flow while old and new clients run concurrently.

Depth controls interview breadth and planning evidence, never permission to omit
correctness, security, accessibility, or an explicitly required contract. A user
may override the recommendation; record the reason and retain mandatory
high-risk questions.

## Confirmation

Present one compact proposal: depth, active profiles, important exclusions,
rationale, and planned design/contract artifacts. Then ask the user to confirm
or correct it before detailed interviewing. Use `scope_propose` with depth, active/excluded profiles, reasons and required
artifact kinds. It saves the proposal and confirmation question in the journal;
it does not create a confirmed manifest. Ask that saved question using the
callable host-native question tool. Use `question_record_answer` for an explicit
answer or `question_record_no_answer` for a non-answer. Then call `scope_confirm`
with the proposal and answer references only when that exact proposal was
explicitly confirmed. No answer is not confirmation.

For corrections, create a revised proposal and ask again. A free-text correction
is not an acceptance of the earlier proposal. Never map it to the confirmation
option. Use `scope_get` for the current confirmed view and pending changes.

## Manifest Contract

Propose the scope with evidence-backed rationale, then obtain exact confirmation.
The MCP retains proposal/answer history in `decisions.yaml` and derives the
current `manifest.yaml`. It assigns `schema_version` and each profile's state
and reason. `planning_artifacts` names specification-local outputs;
`project_artifacts` names exact project-root design outputs, not directory-wide
authority. These fields are returned state, not an agent-authored YAML template.

The MCP builds `docs/specs/<slug>/manifest.yaml` from the saved proposal and
answer. Do not author YAML, set `confirmed`, compute paths or load the entire
schema during ordinary interviewing. The shared contract reference describes
migration and failure handling.

Treat `manifest.yaml` as the current confirmed scope. The `scope.manifest`
decision retains the immutable proposal snapshot presented before confirmation;
its nested `scope.confirmed: false` is expected and is not a second source of
current state. Do not link this service record with
`decision_link_requirements`. Completeness review inventories the scope source
and every active profile directly, so scope coverage does not depend on generic
decision links.

Choose only warranted named outputs exposed by `scope_propose`: core/API/MCP/
event contracts, data schemas, quality scenarios, architecture model, shared
design or screen design. An unsupported artifact location is a contract gap to
resolve, not permission to hand-edit the manifest. Keep Lite established
interfaces inline when no separate source is warranted.

Specification declares planning outputs but does not create them. Design
outputs are project-root paths under `design/system/` and
`design/specs/<this-slug>/`; their creation belongs to separate design planning.
Read-only existing libraries do not grant authority to alter them. Other profile
outputs remain specification-local. Do not load profile guidance until the
latest scope is explicitly confirmed. Re-propose material depth, profile or
artifact changes instead of silently changing the current manifest.

For `cross-surface`, retain traceability from user action through operation or
event to state change, resulting UI outcome and acceptance observation.
