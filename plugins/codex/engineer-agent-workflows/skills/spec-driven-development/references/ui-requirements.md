# UI Requirements Profile

Read only when `manifest.yaml` marks `ui` active. Specify observable
experience without choosing implementation components or frameworks.

## Coverage By Depth

- **Lite:** the primary actor and goal, entry condition, normal result, material
  validation failure, and one discriminating acceptance observation.
- **Standard:** screen and navigation boundaries; user actions; selected,
  loading, empty, error, offline, permission-denied and recovery states where
  applicable; responsive behavior; content and localization; keyboard, focus,
  accessibility and visible feedback; visual rules that affect acceptance.
- **Deep:** complex or concurrent state transitions, interrupted and resumed
  journeys, destructive actions and undo, multiple roles/devices/platforms,
  sensitive display or capture, strict interaction performance, degraded work.

Ask about a category only when evidence does not settle it and omission could
change behavior or acceptance. Use familiar examples rather than design jargon.

## Project Design System And Specification Screens

Active UI alone does not require separate design artifacts. Apply the artifact
rules below only to warranted design outputs declared in the confirmed manifest.
Without those outputs, keep material UI behavior and acceptance in `spec.md`,
using existing read-only design evidence when needed; skip Penpot authoring and design
planning. If a material design need emerges, resolve and reconfirm artifact
scope before approval rather than silently adding outputs or dropping visual
requirements. Behavioral, accessibility and platform coverage still applies.

For declared design work, use Penpot for editable visual design and verified snapshots in
the project's root `design/`. Reuse one shared component library per project;
each specification gets a separate screen set linked to that library.

After scope confirmation, inspect only the relevant existing catalog entries,
tokens, screens and, when needed and available, Penpot data. For a new interface,
clarify the user journey, visual constraints, devices and required component
states. For a change, identify existing behavior and component contracts to
preserve. Do not invent an observed Penpot file, asset ID or library connection.

Declare exact project-relative outputs in optional `project_artifacts`:
`design/system/catalog.yaml`, `design/system/library.penpot`, warranted
`design/system/tokens.tokens.json`, and
`design/specs/<slug>/experience.yaml` plus `screens.penpot`.
Use `scope_propose.artifacts` selections: `shared_design` for the catalog and
library, `screen_design` for the specification's screens, and `design_tokens`
together with `shared_design` when the token export is required. Shared design
alone does not authorize a token export; confirm the returned exact paths.
Existing shared assets used read-only are inputs, not write authority.
No component library is created for an inactive UI profile.

The specification records visual behavior, component/variant requirements,
allowed overrides, shared-change impact and acceptance in `spec.md`.
Main planning records the design dependency; the separately invoked
`design-planning` workflow creates Penpot designs and local artifacts after the
plan. Specification does not edit the canvas, publish a library or export designs. Penpot access is not a
prerequisite for a purely behavioral interview, but unavailable baseline evidence
must stay unverified and material unknowns must be resolved before Approved.

Screens must use linked instances of shared components. Request only components
and variants actually needed for the task; do not turn a Lite change into a
complete design-system redesign. A shared change affecting other specifications
requires explicit impact discussion, not silent propagation.

## UI And Service Boundary

When a service profile is active, map each material action to its operation or
event, domain state change, failure mapping and resulting UI outcome. Include
negative criteria for double submission, stale state, lost input, inaccessible
focus and hidden errors where applicable.

## Platform Applicability

Apply agreed platform support to browsers, devices, input methods, and material
layout or accessibility differences at every depth. Reuse the shared support
requirements when defining responsive states and observable interaction outcomes.
