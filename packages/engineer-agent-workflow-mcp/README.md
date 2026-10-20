# engineer-agent-workflow-mcp

A local stdio MCP server with scenario-specific tools for scope confirmation,
interviews, decisions, shared design components, screen behavior and stage checks.
It is a separate TypeScript/npm artifact from the Codex and Claude skill bundles.
Building or packing never installs, registers, commits or publishes anything.
The [product workflow guide](../../docs/product-workflows.md) explains the
verified stage, storage, review, task-pin and recovery lifecycle without
duplicating executable tool schemas.

## Build and connect

From the repository root with Node.js >=22.20.0:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm run lint
npm test
npm pack --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
```

Run `node /absolute/package/location/dist/main.js` through the client's standard
stdio MCP connection. The installed executable is `engineer-agent-workflow-mcp`.
It accepts no startup arguments and exposes no local query-command fallback.
Changing a real client's configuration or global installation requires separate
authorization. This rename does not automatically migrate installed clients.

The archive contains compiled runtime/type files, the four generated schemas,
[tool-contracts.json](dist/tool-contracts.json), README and license. Its exact
dependency graph is pinned in the workspace lockfile. Runtime packages are the
official MCP server SDK, YAML, Zod, Ajv and fflate. Tests use the official MCP
client and Node's test runner, including real stdio and packed-package runs.
Packing tests resolve workspace ancestor dependencies, not a clean registry
installation. Model sessions and live Penpot are not part of npm tests.

## Product reliability tools

The [product workflow guide](../../docs/product-workflows.md) owns the executable
examples and recovery rules. Prefer MCP tools for workflow state; shell commands
are needed only to build/test the package or start its normal stdio connection.
There is no session CLI or general operation-repair endpoint.

- Read a saved draft decision/research record with
  `product_candidate_record_get`, the candidate reference and exact kind/ID/revision;
  consume every text continuation before parsing or judging it.
- Discover registered subjects with `product_document_list` (`limit` 1–50),
  rather than guessing a document name. Read structured validation diagnostics
  and current `tools/list` schemas before correcting a call.
- Use `product_session_open/call/next/status/resume` as separate callable tool
  names for candidate-bound context, complete delivery and bounded recovery.
  Only advertised `supported_scenarios` can run. Unknown effects remain blocked;
  sessions neither choose review verdicts nor manage global installation.
- After a successful review, use `product_review_start` with `mode: "recheck"`
  and its successful `parent_review_ref`, without `fixes`, for eligible changed
  blocks. Independent judgment and fresh final consistency remain required.
- Request `representation: "explicit-v1"` on supported review readers to separate
  source snapshot/content/object digests from `verdict_object_sha256`. The legacy
  consistency `object_sha256` remains the verdict digest alias.
- Query `workflow_runtime_info` on the serving connection. Its captured `build_id`
  and `contract_digest` distinguish same-version builds; rebuilding on disk does
  not refresh an already loaded process. An unavailable identity stays unverified.

Local build and fixture passes do not establish global installation or live host
behavior. The historical required macOS/Windows jobs failed actual acceptance and
downstream native qualification was skipped. Runtime support is unchanged, and
each changed input snapshot still requires actual native qualification; see
[proof limits](../../docs/product-workflows.md#proof-limits-and-compatibility).

Headroom is an external tool, not a repository dependency. Headroom qualification
is outside repository acceptance. Q14 is cancelled and no longer required, never passed.
This does not claim an external compressor fix. Preserve schemas, opaque contexts,
cursors, source references, hashes and receipts losslessly. Obtain exact content
through the owning retrieval path and verify its schema, selected source identity,
revision and digest with complete continuations. If unavailable or inconsistent,
stop the affected read and dependent mutation. Keep MCP response limits and safe
recovery; a summary, truncated JSON or unresolved marker is not an exact response.

## Scenario contract

The machine-readable tool contract is generated from the executable input
schemas during build; it is not a separately maintained YAML description.
MCP `tools/list` is the runtime authority. Use the callable names from the
current client; do not hard-code a generated namespace.

- Open/discover: `specification_list`, `specification_open`, `scope_get`.
- Scope: `scope_propose` saves the proposal and exact confirmation question;
  `scope_confirm` builds the manifest only from its actual recorded confirmation.
  Select `design_tokens` together with `shared_design` to explicitly declare
  `design/system/tokens.tokens.json`; `shared_design` alone does not add tokens.
- Interview: `question_prepare`, `question_record_answer`,
  `question_record_no_answer`, `decision_record_fact`,
  `decision_record_assumption`, `decision_link_requirements`,
  `decision_link_requirements_batch`.
- Decisions: `decision_find`, `decision_get`; protocol-1
  `decisions_catalog/overview/search/get` remain read-only compatibility tools.
- Source capture: `decision_record_instruction`, `decision_mark_context`.
- Exact requirements: `requirement_list`, `requirement_get`.
- Completeness: `specification_review_start/status/get/record/complete`. These register
  a separate checker's source, requirement and active-profile judgments; they
  do not launch models or authenticate correctness or independence.
- Shared library: `design_system_connect`, `component_register/describe`,
  `component_add_variant/update_variant`, `component_set_allowed_overrides`,
  `design_system_register_tokens`, `component_set_tokens`,
  `component_find/get/remove`, `component_variant_remove`,
  `design_system_register_export`.
- Screens: `screen_create/set_requirements`, `screen_add_state/update_state`,
  `screen_add_transition/update_transition`, `screen_place_component/change_component`,
  `screen_set_responsive_rule/set_content_rules`, `screen_find/get`,
  `screen_remove/state_remove/transition_remove/component_remove`,
  `screen_design_register_export`.
- Stage checks: `specification_check_state`, `design_system_check`,
  `screen_design_check`. They do not approve a specification or start a skill.
- Roadmap changes: `roadmap_unlink_dependency` removes an explicit obsolete edge;
  `roadmap_retire_task` excludes a task after consumer resolution, preserving its
  identity, reason and user-answer provenance. Both support exact journal recovery
  with `resume_operation`; see the product workflow guide for bindings and activation.

Slash-separated names above abbreviate distinct tools, not an action parameter.
Inputs are typed scenario parameters, never arbitrary YAML, JSON Patch, field
paths or operation arrays. Creation requires a complete minimum entity: a
component plus first variant, or a screen plus first state. IDs are returned by
the server; existing entities use dedicated update operations.

## Example sequence

1. Open the current absolute project path and specification slug.
2. Propose depth, profiles and warranted named outputs using the returned context.
3. Ask the saved question with the host-native question tool. Record its actual
   answer/source or its non-answer. A correction requires a revised proposal;
   do not normalize a correction or silence into the confirmation selection.
4. Confirm the exact accepted proposal; load only active skill profiles.
5. Query/record decisions and link them to existing behavioral requirements.
6. After separate design-planning authorization, register actual Penpot identities,
   describe components/screens, capture exports and run the corresponding checks.

Every successful context-bearing result returns the next context. Pass it
unchanged to the next sequential write. Independent read-only calls may run in
parallel. `decision_link_requirements` only adds links, preserves their existing
order, reports the previous, added, removed and final sets, and does not create a
revision when every requested link already exists. Use
`decision_link_requirements_batch` for multiple decisions: it validates every
decision and requirement before one atomic journal update.

Tokens bind the project, specification and observed document versions. A write
with stale input returns `CONFLICT` with `operation_applied: false`, a current
context and current decision references when they can be resolved. Stop writes,
reopen, inspect the referenced state and reconcile the intended addition before
retrying; never repeat a write blindly. Repeating start for the same unchanged
unfinished review is a no-op; use read-only `specification_review_status` for
observation.

## Persistence and limits

Completeness sources remain product decisions; the versioned
`specification_reviews` service section stores only refs, findings and observed
status transitions and is excluded from decision search. Initial/follow-up
instructions preserve up to 65,536 characters exactly, including known user
edits and predecessor refs. Existing limits reject oversized input explicitly.

Requirements use real `### <ID>: <title>` Markdown headings parsed by pinned
`mdast-util-from-markdown@2.0.3`. Getters continue exact text and decision refs
without silent truncation. A review covers the server's full source/requirement/
active-profile inventory, including revision ancestry and non-requirement prose.
Findings require concrete counterexamples; covered results require actual refs.
Pending, gaps and stale states cannot successfully complete the new protocol.

`specification_check_state` reports `legacy_unverified`, `pending`, `gaps`,
`stale` or `reviewed`. Legacy is not automatically blocked or migrated. New
reviews bind spec content, confirmed scope and source history. Reports do not
invalidate themselves; only standalone Draft-to-Approved is exempt from content
changes. Check-state can write a checkpoint that it observed the author's
Approved status; it never sets it. A later observed downgrade is stale even
after restart. Changes reverted entirely between calls cannot be observed.
Pin aggregate `source_version` for consumers; pass the separate
`specification_version` to requirement_get's `source_version` parameter.

- Four mutable YAML paths: `docs/specs/<slug>/manifest.yaml`,
  `docs/specs/<slug>/decisions.yaml`, `design/system/catalog.yaml` and
  `design/specs/<slug>/experience.yaml`. Requirements, declared API/event
  contracts, token files and native exports are bounded read-only dependencies.
  Review tools additionally publish immutable JSON snapshots as described below.
- YAML is a single UTF-8 mapping, validated against the authoritative shared
  JSON Schema Draft 7. Unknown contract fields, aliases, merge keys, custom
  tags and duplicate keys are rejected. Legacy decision extension fields remain.
- Before a write is installed, the server formats workflow-owned YAML with its
  pinned Prettier `3.9.6` when the project declares Prettier as a dependency or
  provides a supported declarative configuration: `.prettierrc.json`,
  `.prettierrc`, `.prettierrc.yaml`, `.prettierrc.yml`, or the `prettier` field
  in `package.json`. Invalid declarative configuration fails before the write.
  Executable configuration and plugins are never loaded. Projects with neither
  a supported configuration nor a Prettier dependency retain the YAML
  serializer output.
- Decision history is append-only. YAML syntax trees preserve unchanged nodes
  and comments. Reserved `extensions.workflow_mcp_receipts` retains the latest
  64 successful operation receipts in each file. Repeating an identical request
  is restart-safe; older expired retries fail stale rather than duplicating data.
- Writes use exclusive cooperative locks, temporary sibling files and atomic
  rename. Dependencies are rechecked before install. Separate files are not one
  transaction. A crash can leave a lock or temporary file: inspect it explicitly
  before removal; the server never guesses that a lock is stale.
- Do not run noncooperating external edits concurrently with a write. Ordinary
  prior user changes are caught by content versions; the platform provides no
  atomic compare-and-replace against arbitrary hostile filesystem writers.
- Sources are capped at 16 MiB; decision journals at 100,000 revisions; native
  ZIP expansion at 64 MiB and 100,000 entries. Discovery is bounded. Structured
  replies are at most 24 KiB and complete MCP replies at most 64 KiB. Mutation
  results are budgeted before persistence. Use paging/sections for large reads.
- The stdio request limit remains 2 MiB. Oversized messages close the transport.
  Missing results, failed checks and missing prerequisites never count as passes.

The current confirmed scope is `manifest.yaml`. A `scope.manifest` decision keeps
the immutable proposal snapshot that was presented before confirmation, so its
nested `scope.confirmed: false` is expected. Generic decision-link tools reject
that service record. Completeness review covers the scope source and every active
profile as dedicated inventory items instead.

## Design and evidence boundary

This server never changes Penpot, follows URLs, publishes libraries or creates
native exports. Those operations belong to separately installed official Penpot
skills/MCP and their own explicit checkpoints. Local outputs require confirmed
UI scope and exact declared artifact ownership.

Native v3 ZIP layout and IDs are checked using the
[official Penpot format](https://help.penpot.dev/technical-guide/developer/data-model/penpot-file-format/).
Registration computes digests and records supplied export/import/inspection
references; these references are reports, not authenticated proof of external
actions. Local checks cannot reproduce rendering, restoration or accessibility.
Design checks explicitly return `local_status` and `external_status`; a local
pass alone leaves the overall result unverified. Fake or absent evidence is not
a valid way to complete design planning.

DTCG token references use dotted paths to existing `$value` records. Operation
references use `contracts/openapi.yaml#operationId` (OpenAPI 3) or
`contracts/asyncapi.yaml#operationKey` (AsyncAPI 3), only in declared sources.
These checks resolve references; they do not implement those profile formats.

## Security and compatibility

No manual project allowlist or MCP roots capability is required. The caller
supplies an absolute project path at open/discovery time. This is not a project
authorization sandbox: matching artifact paths at any supplied project are
accessible within process permissions. Descendant symlinks, hard-linked files,
nonregular files and traversal are rejected; no whole-disk scan is performed.
Use OS isolation if a hostile process can replace project directories.

Stdout is MCP traffic only. Filesystem exceptions, source snippets, secrets and
stacks are not logged to stderr or echoed in errors. Human confirmation, native
client setup, live model behavior and global installation remain external
responsibilities. Missing this MCP blocks workflow YAML operations; there is no
manual authoring or shell-reader fallback.

## Corrections-only specification review

To abandon inherited evidence, call `specification_review_start` with
`mode: "full"`. This starts a new full run when the current unfinished run is a
followup; it resumes an unchanged unfinished full run. The default call retains
no-write resume for either kind. Exact retries preserve their original request.
Full mode can rebuild a missing current snapshot from intact current sources
without reading the historical chain; it never overwrites a corrupt snapshot.

After a completed review with findings, `specification_review_changes` streams
exact differences and candidates. `specification_review_followup_start` requires
explicit finding-to-change links and unchanged confirmed scope. New original
instructions/answers, Approved changes and uncertain impact require full review.
The checker records required items, expands checks through
`specification_review_scope_expand`, then reads the whole context item once and
uses `specification_review_consistency_record`. It also records the context
verdict; do not duplicate it with `specification_review_record`. Inherited
positive results are provisional, attributed historical evidence, not new work.

New reviews archive immutable exact inputs at
`docs/specs/<slug>/.workflow/review-inputs/<sha256>.json`. Snapshots contain text,
manifest and decision revision hashes; the journal retains only references and
results. Identical inputs deduplicate. These files belong with the specification
in Git; no tool creates commits. Do not edit them or read the whole archive into
agent context. Missing/corrupt archives prevent reuse; legacy reviews use full
review. If an invalid object already occupies the exact target content hash,
even a full review refuses to overwrite it; report the storage fault for explicit
investigation. There is no automatic repair, cleanup, database, global cache or
compression.
File limits and regular-file/symlink protections apply. Snapshots are flushed
before publication under the decisions lock; a failed mutation may leave an
unused snapshot. This does not add a power-loss durability guarantee beyond the
existing platform filesystem behavior.

## Bounded retirement review and activation inspection

For task removal, use `product_amendment_prepare.change_scope` with
`kind: task_retirement`, the exact `task_ref` and existing `redistributed_to`
recipients. This records the actual instruction under a built-in Standard/core
amendment; it does not inherit or authenticate broader profile consent.
Preparation returns `review_basis` when the ready generation identifies its
reviewed candidate. Supply that `parent_candidate_ref` and `parent_review_ref`
to `product_review_start` in `recheck` mode. Legacy inputs without adequate
history use full review. `product_review_get_batch.pending_only` omits already
recorded judgments; explicit rereads and reviewer scope expansion remain valid.

A corrections-only followup can map changed document prose through exact
`fixes[].changed_item_keys` when a recorded `__consistency__` finding owns the
correction. Element changes still use `changed_refs`. Always read corrected
blocks and obtain fresh whole-artifact consistency. The opt-in `compact-v1`
consistency representation retains the inventory hash, impact and exact verdict
object hashes without repeating shared source text. Other read representations
are unchanged.

Before activation, retain its original arguments/context.
`product_amendment_activation_status` accepts those same arguments, is read-only,
and distinguishes the operation's published generation from current head.
Repeat the exact original activation request to retrieve a completed result;
incomplete or blocked operations remain with their existing owner. This does
not extend logical-session support to activation or introduce lock removal.

`node scripts/benchmark-roadmap-retirement.mjs OUTPUT full stdio 30 --representative`
measures the full-review baseline. Replace `full` with `recheck` for bounded
inheritance and `stdio` with `direct` to separate native scenario execution from
transport overhead. Outputs use synthetic judgments, not semantic certification.
