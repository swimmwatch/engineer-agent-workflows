---
name: spec-driven-development
description: "Define or revise an adaptive-depth implementation-ready specification when explicitly requested. Confirm scope and profiles, persist decisions and manifest, mark the complete specification Approved, and stop before planning."
disable-model-invocation: true
user-invocable: true
---

# Spec-Driven Development

Keep this workflow specification-only.
Model suggestion: {{HOST_AUTHOR_MODEL}}. Never switch or gate on model.

1. Set `skill_dir` to the absolute path of this `spec-driven-development` directory.
   Run `node "$skill_dir/shared/scripts/verify-engineering-manual.mjs" "$skill_dir"`
   The sole argument is the skill directory. If it fails, return exactly: `Install or
   update the complete matching engineer-agent-workflows bundle for
   {{HOST_DISPLAY_NAME}} using the documented pinned global command, then
   retry.` Stop without fetching, copying, approximating, or ignoring the
   manual.
2. Read verified `shared/references/engineering-principles.md` and
   `shared/references/test-discipline.md`. Use host-supplied project instructions;
   do not reread them solely to recover context. Read
   `{{HOST_PROJECT_INSTRUCTIONS}}` only if absent from
   active context or itself in scope. Approved requirements and
   repository evidence outrank generic guidance.
3. Read `references/adaptive-scope.md` and
   `references/specification-interview.md`. Use workflow MCP for decisions and
   manifest state; never read workflow YAML directly.
   Mark evidence verified, assumed, or superseded; do not repeat settled choices.
   For valid product-linked task, read `shared/references/product-workflow.md`
   follow its Specification role; otherwise keep the standalone path and do
   not call product task tools.
4. Infer known scope, then ask only missing high-level questions. Propose and
   confirm the Lite, Standard, or Deep depth and active profiles through the
   callable `{{HOST_QUESTION_TOOL}}` in the current mode. Follow its exposed
   schema and do not enter plan mode solely to ask. Checkpoint the proposal and
   explicit answer in `decisions.yaml`; write only the confirmed scope
   to `manifest.yaml`. If the tool gives no answer, use the saved conversational
   fallback and stop when confirmation is missing.
5. Persist the scope answer and confirmed manifest in `decisions.yaml` and
   `manifest.yaml` before any profile read, including on resume. Load only each
   active profile's `references/<profile>-requirements.md`. Never load
   a reference for an inactive, not-applicable, or unresolved profile. Depth
   controls useful detail, not correctness or mandatory safety coverage.
   Planning owns profile artifacts; record their required names in the manifest
   but do not create them.
6. Ask material decisions plainly with one example. Checkpoint each non-sensitive answer immediately. Resolve
   outcomes, rules, interfaces, data and state contracts, validation, limits,
   alternate flows, failure and recovery, security and privacy, compatibility,
   non-goals, quality scenarios, and objective acceptance applicable to the
   confirmed scope.
7. Give requirements stable `### <ID>: <title>` headings. Each criterion records
   an observation and excluded outcome.
   For absence claims, name an observable signal.
   Map active decisions and planned profile contracts to requirements. Keep
   `spec.md` behavioral: do not invent implementation-local files, symbols,
   frameworks, dependency injection, task order, or estimates.
8. Follow the interview's persisted cycle: Draft, links, mechanical checks and
   separate-context review via `references/completeness-review.md`.
   Only a fresh recorded pass permits `Status: Approved` without a separate
   approval question or `approval.spec`. Treat user edits as authoritative;
   reconcile changes and repeat the cycle before renewed approval.
9. Save specification state, summarize the next step, and stop. Planning owns
   `handoff.md`. Do not plan, implement, install, commit,
   publish, or treat `Approved` as planning or implementation authorization.
