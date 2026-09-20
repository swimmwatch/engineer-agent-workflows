# UI Planning Handoff

Read only when the confirmed manifest marks `ui` active. Main planning describes
design needs and dependencies; it does not build Penpot designs or invoke another
workflow. Active UI alone does not require new design artifacts.

## Manifest-Driven Design Stage

When `project_artifacts` declares files under root `design/`, record a separate
explicit invocation of `design-planning` after this plan. This includes new
interfaces with no existing design. List affected requirement IDs, screens,
component changes, declared output paths and acceptance checks in the affected
packets. Keep those packets pending design until required outputs are verified.

With no declared design outputs, keep established visual behavior inline or
reference existing read-only sources. Do not load Penpot skills or design schemas
merely because UI is active. Legacy `ui/experience.yaml` declarations or a newly
discovered need for design return to specification; do not silently migrate or
change the manifest.

## Plan Content

Specify the behavior to cover: state transitions, responsive rules, content,
loading/empty/error/offline/permission outcomes, keyboard/focus and accessibility.
Trace material actions through backend operations or events where relevant.
Use the existing design as evidence; do not invent unavailable IDs or snapshots.

`design-planning` owns `experience.yaml`, the shared component catalog, native
snapshots, and warranted design tokens or derived previews. It uses separately
installed Penpot skills and then updates only affected packet references and
handoff evidence. Do not maintain a second API/operation guide here.

The main plan may be complete while design-dependent packets are not executable.
Independent packets need not wait. Preserve separate render, interaction,
accessibility and visual checks: a wireframe or derived preview does not prove
runtime UI or service behavior.

## Platform Applicability

Use agreed platform support to plan browser, device, and input coverage; include
browsers, devices, input methods, and material layout/accessibility differences
in design dependencies and runtime checks. Reference the shared requirement IDs.
