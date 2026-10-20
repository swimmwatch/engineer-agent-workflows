# Penpot Integration Contract

Read only for a confirmed manifest with active UI and declared design outputs.
This collection owns scope, repository contracts and handoff. The separately
installed Penpot AI Kit owns token/component/screen operations and API guidance.

## Independent Installation And Routing

Discover actual installed skill names, descriptions and locations using the host's
skill inventory. Confirm the Penpot MCP is callable and supports the operation.
Do not assume a cloned repository is an installed, self-contained skill bundle.
Missing skills, required references or MCP capabilities block affected work;
report the prerequisite without installation, network loading or a handwritten
replacement workflow.

Use one routing owner. If the host already selected the appropriate Penpot skill,
use it without redispatch. Otherwise use the installed `penpot-router` to select
one bounded operation. Read the chosen skill and its required resources from that
installation, including its own instruction layer when required. Do not copy its
catalog, API recipes or whole workflow into this collection. Keep required
external checkpoints; never silently bypass a conflict with project requirements.

Pass a short brief: goal, requirement IDs, relevant source paths, target
instance/team/project/file, permitted component changes, non-goals, expected
outputs and acceptance checks. Tell the external workflow to return object IDs,
actual changes, checks and blockers, not to expand into implementation or a new
workstream. A selected full-library workflow is not authority to redesign a
library when only one screen is in scope. Ask if routing or scope conflicts.

This routing follows the inspected Penpot AI Kit revision `c63d8e3`; verify the
installed capability rather than assuming that revision is installed. See the
[upstream router](https://github.com/penpot/penpot-ai-kit/blob/c63d8e3717323fad859e794848e5a602b155a7ec/skills/penpot-router/SKILL.md).

Include agreed platform support in that brief: browsers, devices, input methods,
and material platform-specific accessibility or layout requirements, linked to
specification IDs. Preserve them in affected design checks and the plan handoff;
do not repeat settled questions or change support. A Penpot preview or snapshot
does not verify browser or runtime behavior; report unavailable checks explicitly.

## Project-Owned Outputs

Penpot is the editing workspace. Git holds verified snapshots, not a second
editable master. Do not import an older archive over newer human work.

| Project-relative path | Responsibility |
| --- | --- |
| `design/system/catalog.yaml` | Shared library identity and component/variant contracts |
| `design/system/library.penpot` | Actual native shared-library export |
| `design/system/tokens.tokens.json` | Shared token export, only when declared |
| `design/specs/<slug>/experience.yaml` | Behavior, screen/instance links and shared snapshot pin |
| `design/specs/<slug>/screens.penpot` | Actual screen export preserving library links |
| `design/specs/<slug>/previews/` | Optional derived previews; declare exact files |

`project_artifacts` grants only exact local output paths under `design/system/`
or `design/specs/<this-slug>/`. Check normalized paths and real-path containment;
no traversal, wildcards, escaping symlinks or directory-wide writes. Read-only
shared inputs do not grant write scope. Preserve legacy locations until migration
is agreed. Confirm bounded remote write targets and library publication when
needed; local artifact scope does not authorize public sharing or client setup.

Use the workflow MCP scenario tools below. Its packaged schemas define the YAML
shape; agents do not load examples or reconstruct whole files to author them.
Illustrative assets are not approved scope, observed IDs or export evidence.
Read only relevant shared entries and this specification's screen set; inspect
other consumers only when a shared change affects them. Do not auto-update those
consumers or production components. Keep linked instances and declared overrides;
do not accept detached lookalikes as shared-component reuse.

## Return To The Main Plan

- Read back actual target, component, variant, instance and library identities.
  Re-imported files may have different IDs. Preserve human edits and reconcile
  concurrent changes instead of silently adopting or overwriting them.
- Use `design_system_check` and `screen_design_check` for saved schemas,
  references, overrides and snapshot pins. Follow
  `shared/references/yaml-contracts.md`; do not parse workflow YAML as a fallback.
- Obtain actual native exports preserving shared-library links. Flattened renders
  or merged editable library copies are not equivalent. Token snapshots do not
  prove token synchronization; follow the external skill's safe token operations.
- Inspect required rendered states/viewports. Record only observed checks; a
  mockup does not prove keyboard, screen-reader or network behavior in the product.
- Hash saved native bytes, check archive dependencies and recheck for drift during
  capture. Do not promise byte-identical repeated exports. Qualify restoration in
  an authorized isolated target when establishing/changing the export path;
  unavailable restoration remains a verification gap.
- Before marking affected packets ready, replace pending design references with
  exact verified paths, IDs and digests. Record completed scope and checks in the
  existing checklist/handoff, not a second product decision journal in Penpot.
  External technical execution state may aid recovery, but cannot override our
  manifest or confirmed decisions. Missing exports/checks keep affected packets
  blocked. Unrelated implementation packets may remain independently ready.

## Scenario Tool Sequence

Use the callable names and published parameter schemas; do not hard-code a
host-generated MCP namespace. Keep the latest returned context and object IDs.

1. Open the specification with `specification_open`; inspect `scope_get`.
   Work only on the declared design outputs. Missing capability blocks the
   corresponding operation without fallback YAML edits.
2. Use `design_system_connect` once for an authorized new shared library.
   Read existing entries with `component_find` and `component_get`.
3. After actual Penpot operations, use `component_register` with a complete
   first variant, `component_add_variant` or `component_update_variant`.
   Describe purpose/accessibility/content through `component_describe`;
   set allowed overrides through `component_set_allowed_overrides`.
   If tokens are in scope, register their actual JSON export through
   `design_system_register_tokens`, then bind `component_set_tokens`.
4. Use `screen_create` with a real board and initial state. Add/correct behavior
   through `screen_add_state`, `screen_update_state`,
   `screen_add_transition` and `screen_update_transition`.
   Register linked instances using `screen_place_component` or
   `screen_change_component`; describe viewports with
   `screen_set_responsive_rule`, content with `screen_set_content_rules`,
   and traceability with `screen_set_requirements`.
   Use `screen_find`/`screen_get` for bounded reads.
5. Use only the explicit component/variant/screen/state/transition/instance
   removal tool for an authorized removal. Resolve reported dependencies rather
   than bypassing the guard. The tools do not perform remote Penpot deletions.
6. After actual export, restoration and inspection, use
   `design_system_register_export` and `screen_design_register_export` with
   references to the observed evidence. They inspect native saved bytes and
   record external evidence, but cannot reproduce visual or accessibility
   checks. Never supply invented evidence to obtain a verified snapshot flag.
7. Run the two design checks. `local_status: pass` with
   `external_status: not_reproduced` still requires the separately observed
   Penpot evidence before marking design-dependent implementation ready.
