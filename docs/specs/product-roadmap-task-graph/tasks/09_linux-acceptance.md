# P09 — Linux cross-surface acceptance and capacity evidence

## Technical proposal

Extend the existing Node test/test-support infrastructure with synthetic product-store and fake-provider fixtures, and use an already available Linux browser automation capability for actual HTTP/viewer interactions. Add required real-GitHub acceptance using one newly created private test repository and one newly created private Projects v2 board, as explicitly requested on 2026-10-26. Existing production/KAP resources, global configuration and runtime architecture remain unchanged. Normalized fixtures preserve opaque IDs, both dependency representations and exact source/graph/specification identities. Use the actual built MCP stdio server and actual local HTTP server, not mocks of their public boundary.

Own the end-to-end and capacity scenarios in `../quality/scenarios.yaml`. Exercise normal, invalid, repeated, interrupted-publication, denied-origin/session, partial, overlapping-sync, cancelled and recovery paths. Compare resulting MCP data and server-generated SVG/list counts/revisions/states. Capture provider invocation types/counts, source-pin/history before/after digests, task/binding absence, listener/child cleanup and redacted diagnostics through safe observation surfaces. Use direct-gh test executables for deterministic faults, not an additional runtime wrapper. Provider writes are confined to the newly created private fixture resources and performed by the test operator/agent through existing GitHub tools or direct gh; EAW's adapter remains read-only. Never use an existing working board or repository as a substitute fixture.

For the real-provider run, resolve the already authenticated owner and required permissions, create uniquely named test-only resources, explicitly set/check repository and Project privacy independently, and record their exact IDs before seeding. Stop if privacy, ownership or required permissions cannot be established; do not refresh authentication/configuration automatically. Seed approximately 12 synthetic Issues, two Milestones, explicit status/Stage options, ordinary/package/shared labels, a native prerequisite diamond, a Backlog task and deliberately unbound/out-of-board items. Bind only selected Issue IDs to an isolated local EAW test product/store. The live test is a separately opted-in `product-graph-github-live.test.mjs`, excluded from ordinary offline test execution and never credited as passed when skipped.

Run `Q-GITHUB-LIVE` against actual GitHub reads and the built MCP/HTTP/browser boundaries: baseline display, title/status/label/Stage/Milestone/dependency changes, status-option rename without an identity change, Backlog transitions, explicit unknown status, repeat-run identity stability and removal from Project membership. Alternate MCP and viewer-button synchronization, compare complete task/binding inventories and dynamically rendered SVG/list output, and preserve filters/viewport. After removal, verify automatic current-record/binding deletion, cleared selection and an external blocking reference if a surviving Issue still requires the removed item; retain specifications/history. Wait only a bounded interval for GitHub read-back to confirm fixture changes before synchronization and report propagation or service failures explicitly. Capture fixture-write calls separately from EAW read calls. Keep 1000/10000 capacity and injected failure checks local; do not bulk-create capacity fixtures on GitHub.

Keep a private run inventory with resource IDs/URLs, visibility proofs, field/option/Issue/Milestone bindings and cleanup status, without credentials or unrelated repository data. Published evidence uses synthetic content and redacted identifiers where needed. Retain the private resources after acceptance; deletion requires a separate explicit request naming the exact created resources, never a prefix-wide cleanup. Resource creation and test execution belong to a later explicit P09 invocation, not this planning amendment. The required live check remains incomplete if unavailable, failed or skipped.

For the documented Linux machine/browser/runtime versions, exercise the synthetic 40-task/8-layer reference and the 1000-task/10000-source-edge boundary. Measure server derivation/rendering separately from remote provider latency; initial local presentation is <=5 seconds after data availability, and p95 of 20 representative search/filter interactions is <=250 ms. Over-limit cases preserve prior valid observations and fail visibly. Keyboard-only, 1024x768, 200% zoom, measured contrast and inert-injection/network-blocked interaction checks remain separate observations, not a screenshot-only claim.

Run required Linux Chromium-family and Firefox checks using existing authorized capabilities. Record which exact browser versions actually ran; other target browsers/platforms retain intended compatibility and static/platform-policy evidence only. Linux WebKit, if used, is supplemental and never native Safari proof. Missing required Linux execution capability leaves this packet incomplete without changing support requirements or installing tools automatically.

Run affected unit/integration checks first and repository-proportional final build/lint/test/generation validation after they pass. Apply RED/GREEN/PROVE at the narrowest owning boundary, including absence assertions and source-preservation checks. An environmental failure is not a pass. Preserve failed evidence and name the actual next action/owner; do not weaken a check to finish. A separate optional code/security review, commit or publication is not an acceptance gate.

Requirement IDs: REQ-001 through REQ-040, with individual ownership/check mappings in the plan and scenario IDs, not one undifferentiated pass.

Evidence: the MCP package already uses Node tests and root `scripts/run-tests.mjs`; root/package manifests expose build/lint/test and generation checks. Current planning host reports Node `v24.20.0` and gh `2.92.0`; these observations are not runtime feature acceptance. Reverify actual tool/browser versions at execution.

## Delivery details

### Inputs and eligibility

Packet: **P09**. source_version: `6087eb0c0dfca148e9afc43780651ece85bd5d9660313a049d34071925e8eaa5`; specification_version: `e257fb7b0011d3d9e5e9b0754391b65133e83054bc7327fd2110163f0dab5af8`; review_ref: `fd840f43-b70d-463d-991c-204f891f1b2e`.

Read exactly `REQ-001`, `REQ-002`, `REQ-003`, `REQ-004`, `REQ-005`, `REQ-006`, `REQ-007`, `REQ-008`, `REQ-009`, `REQ-010`, `REQ-011`, `REQ-012`, `REQ-013`, `REQ-014`, `REQ-015`, `REQ-016`, `REQ-017`, `REQ-018`, `REQ-019`, `REQ-020`, `REQ-021`, `REQ-022`, `REQ-023`, `REQ-024`, `REQ-025`, `REQ-026`, `REQ-027`, `REQ-028`, `REQ-029`, `REQ-030`, `REQ-031`, `REQ-032`, `REQ-033`, `REQ-034`, `REQ-035`, `REQ-036`, `REQ-037`, `REQ-038`, `REQ-039`, `REQ-040` through MCP `requirement_get`, using the pinned specification_version as that tool's source_version, following every text/reference continuation. Do not reload the full specification or decisions history. Recheck the aggregate source_version through `specification_check_state`.

Dependencies: [P01](01_graph-kernel.md), [P02](02_graph-store.md), [P03](03_github-reader.md), [P04](04_sync-coordinator.md), [P05](05_mcp-and-spec-signal.md), [P06](06_http-viewer.md), [P07](07_browser-viewer.md), [P08](08_workflow-packaging.md) completed with their required checks and current agreement. Required local tools: usable Git worktree/status including staged/untracked evidence, the existing Node >=22.20.0/npm environment and the matching workflow MCP. No clean tree or existing commit is required. Missing installation/browser authority is not supplied by this plan.

Exact contracts/scenarios to read:

- quality/scenarios.yaml — all scenarios, especially Q-E2E/Q-CAPACITY/Q-GITHUB-LIVE
- contracts/mcp.md and contracts/openapi.yaml — public boundary comparison
- architecture/model.dsl — runtime flow and authority

### Scoped work and acceptance

Allowed ownership areas, plus this specification's linked `tasks/todo.md` and current-only `tasks/handoff.md`:

- packages/engineer-agent-workflow-mcp/test/product-graph-acceptance.test.mjs
- packages/engineer-agent-workflow-mcp/test/product-graph-github-live.test.mjs — explicit opt-in real-provider test
- bounded synthetic acceptance fixtures and existing test-support extensions
- docs/evidence/product-roadmap-task-graph/ — future redacted Linux acceptance records/screenshots only
- external fixture scope: exactly one new private GitHub test repository and one new private Project plus their synthetic Issues/labels/Milestones/field values/dependencies; no existing product resources

Preserve unrelated modified files and all source/specification/history evidence. The known planning-entry worktree includes unrelated MCP README/metadata/task/tool/schema/test edits and `.local/`; re-inspect their current content and overlap before editing. An unexplained deletion/loss or unknown overlapping change requires disposition, not baseline replacement.

Acceptance observations:

- Actual MCP/HTTP/browser journeys agree on identities, revisions, counts/states and deletion/error recovery, without hidden workflow or writes from EAW's provider adapter. Fixture preparation/change calls are recorded as a distinct test actor.
- A real private repository/Project run passes Q-GITHUB-LIVE; stored privacy proofs, mapped IDs, GitHub read-backs, MCP results and SVG/list observations establish the actual provider integration. A passing fake-provider suite or skipped live test does not satisfy this requirement.
- The 1000-task/10000-edge fixture displays completely within five seconds after data is available; p95 of 20 representative search/filter updates is <=250 ms.
- Cancellation/ordinary shutdown cleanup <=5 seconds; per-read/run deadlines <=30/120 seconds; retained source data and negative privacy/access assertions pass.
- Required actual Linux Chromium-family and Firefox checks pass with exact versions recorded; static review/WebKit is not claimed as native Safari/macOS/Windows proof.
- All required affected and repository-proportional checks pass and all PROVE mutations are restored; missing required browser capability leaves P09 incomplete.

### Test-first execution and verification

Working directory: repository root. Create/extend the following checks before implementing this packet: `packages/engineer-agent-workflow-mcp/test/product-graph-acceptance.test.mjs` and the explicitly opted-in `packages/engineer-agent-workflow-mcp/test/product-graph-github-live.test.mjs`. These are planned files, not claims that scripts/tests already exist.

Use the exact synthetic workloads, observations and mutations in `Q-E2E`, `Q-CAPACITY`, `Q-INTERACTION`, `Q-PACKAGING`, plus the dedicated real-provider `Q-GITHUB-LIVE` scenario from `../quality/scenarios.yaml`. Run RED first; if it only reports a missing import/symbol or invalid harness, repair the harness and require PROVE after GREEN. Implement until every correct check passes; never weaken a correct assertion to obtain green. Perform the named one-behavior PROVE mutations for absence/wiring/late-written assertions locally, observe each expected failure and restore the implementation before final verification. Do not induce outages, revoke credentials or modify global settings to manufacture live RED evidence.

Copy-ready local commands (existing build/lint infrastructure; named feature tests are created by this packet):

```bash
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node --test packages/engineer-agent-workflow-mcp/test/product-graph-acceptance.test.mjs
rtk proxy npm run lint --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
```

After focused tests pass, run `rtk proxy npm run build`, `rtk proxy npm run lint`, `rtk proxy npm test`, `rtk proxy npm run generate:check` and `rtk proxy npm run validate`. For each required Linux browser, start the isolated HTTP/MCP fixture through the test harness, open its returned URL with an available authorized browser tool, and execute Q-INTERACTION/Q-CAPACITY/Q-E2E actions. Record actual versions, source/evidence revisions, complete counts, timing samples, contrast calculations and screenshots. No new package/script is assumed to be installed.

**MANUAL GATE — capability only:** if required Linux Firefox/Chromium execution is unavailable, preserve evidence and leave P09 incomplete until an authorized capability is supplied. No macOS/Windows/native Safari run is required by this plan.

### Required real-GitHub acceptance

1. Inspect the existing gh account/capabilities without login, token export or configuration changes. Default to its personal account unless an explicitly selected owner is supplied. Resolve the exact owner before creating anything.
2. Choose one unique run label, such as `eaw-roadmap-live-<run-id>`, and create a new repository with `gh repo create <owner>/<name> --private`, without `--source` or `--push`. Create the dedicated Project with `gh project create --owner <owner> --title <test-title> --format json`; explicitly set `gh project edit <number> --owner <owner> --visibility PRIVATE`. Read back both independent visibility values before adding data: repository private and Project non-public. These are future command forms, not commands executed during planning.
3. Record exact newly created resource IDs, URLs, creator/run identity and visibility in the private fixture inventory. Create only synthetic test content; leave existing resources untouched. If creation has an uncertain outcome, inspect exact results before retrying rather than duplicating resources.
4. Seed/bind the Q-GITHUB-LIVE dataset and capture a baseline through the actual adapter, MCP graph inventory and dynamic HTTP SVG/list. Change the board through GitHub tools, confirm its read-back, then synchronize through each entry point and assert the expected state/identity/view changes.
5. Complete the removal/unknown-status/repeat-run/unbound-item cases. Save actual browser/version, run timestamps, redacted API observations, revisions, counts and screenshots. Verify no EAW adapter mutation and no source/specification history change.
6. Report created resource identities and whether they are retained. Do not delete them automatically or treat a failed real check as a fixture pass. A later explicit cleanup must validate those exact IDs and leave all other resources untouched.

Create the opted-in test before running this live sequence. Provide its private fixture inventory path through the test-only `EAW_GITHUB_LIVE_FIXTURE` environment variable; ordinary test runs must not provision resources or access the network. Execute the required live check explicitly:

```bash
rtk proxy env EAW_GITHUB_LIVE_TEST=1 node --test packages/engineer-agent-workflow-mcp/test/product-graph-github-live.test.mjs
```

If the opt-in is set but the inventory, permissions, privacy proof or service is unavailable, fail the required check with a safe diagnostic. Do not silently skip or substitute a mock. Setup references checked on 2026-10-26: [repository creation](https://cli.github.com/manual/gh_repo_create), [Project creation](https://cli.github.com/manual/gh_project_create), [Project visibility](https://docs.github.com/en/issues/planning-and-tracking-with-projects/managing-your-project/managing-visibility-of-your-projects).

Review scoped tracked, staged and untracked changes; keep workflow YAML out of direct content diffs/parsers. Run whitespace checks on this packet's actual changed textual artifacts, including untracked files. Tests and evidence must show the real owning operation, not merely mirror declarations.

### Recovery and completion

Stop isolated fixture processes and retain redacted failed evidence. Fix the owning implementation packet under renewed applicable agreement if needed; never weaken assertions or alter support. Confine real-provider fixture changes to the exact newly created private resources, retain their inventory, and do not delete them without separate explicit authority.

After all required local checks pass and every PROVE mutation is restored, run `specification_check_state` with the pinned aggregate source_version and `planning_packet_check` with the exact agreement_ref/proposal_digest below. Inspect the scoped diff against the agreed units/contracts. A failed/unavailable required check leaves this packet incomplete; report its actual result and concrete next action/owner. Do not run the completion gate while tests remain pending.

Update only this packet's entry in `todo.md` and replace `handoff.md` with current changes, actual RED/GREEN/PROVE evidence, versions, blockers and the next eligible packet. Then stop. Do not execute another packet, invoke code/security review, commit, install, refresh clients or publish automatically. Review and commits are separately authorized optional actions, not next-packet gates.

## Technical agreement

```json
{
  "packet_id": "P09",
  "proposal_id": "P09-github-live-acceptance-v2",
  "agreement_ref": {
    "id": "b8d263ab-6516-459a-81df-317828aea304",
    "revision": 2
  },
  "proposal_digest": "452aa60f5965f04b10a2940b702b21b751c5edd33e46e43be4f240edd1f530d5",
  "sources": [
    {
      "path": "docs/specs/product-roadmap-task-graph/tasks/plan.md",
      "heading": "Shared architecture"
    },
    {
      "path": "docs/specs/product-roadmap-task-graph/tasks/09_linux-acceptance.md",
      "heading": "Technical proposal"
    }
  ],
  "planning_packet_check": "ready"
}
```
