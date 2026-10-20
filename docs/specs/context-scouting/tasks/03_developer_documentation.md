# CS-P03: Developer Documentation

## Outcome and prerequisites

Document verified context-scouting behavior and its operating boundaries in the existing
README and one focused `docs/context-scouting.md` page. Requirements: CS-001, CS-003,
CS-008, CS-009, CS-010, CS-011. P02 must be complete, including native evidence and
the actual global migration/no-op. Describe implemented results, not planned claims.

- MCP `source_version`: `24915e1971002d58ec790420af4034f89ae1f355fcdc987227aac2f19e0c9732`.
- MCP `specification_version`: `992dfdc963c5307a6e1333a1057c133f91f766fb2adb9626d0c28d10e23b1942`.
- MCP `review_ref`: `590cd413-dba5-4a88-b1c4-e790755556ac`.

Check the aggregate pin before and after work; retrieve the listed requirements through
MCP. Require a usable Git worktree and preserve all unrelated staged, tracked and untracked
changes. No new profile artifact is declared. Planning creates only this packet; the
usage page is written during its separately authorized execution.

## Scope, ownership, and evidence

Allowed production paths: `README.md` and `docs/context-scouting.md`. Update this packet,
`todo.md`, and current-only `handoff.md` with actual acceptance evidence. No source,
generator, global guidance, workflow YAML, dependency, or installation change.

Recheck `README.md:19-36` for the maintained inventory, `README.md:75-79` for advisory
workflow model roles, and `README.md:126-134` for model-trial evidence boundaries.
Use the now-implemented skill, `HOST_SCOUT_MODEL` mapping, and P02 results as evidence.
Do not rewrite historical 16-skill evidence or previous workstream handoffs.

Durable documentation is warranted because the task-scoped replacement of a standing
rule is non-obvious and operators can confuse explicit scout model selection, advisory
workflow models, and installed availability. The README remains the entry point; the
focused page explains runtime behavior without duplicating the specification or raw
test transcripts. Maintain English repository documentation.

## Test-first documentation acceptance

Before editing, give a reader who did not author the feature the existing documentation
and the following questions. Record which answers cannot yet be supported; this is the
discriminating initial check, not a claim that Markdown requires a unit-test framework.

The finished page must let that reader correctly explain:

1. How to explicitly select the skill on each verified host and its current-task scope.
2. Why a known-file read may remain in the main agent, and when a scout is useful.
3. Which named model is requested on each host; how `haiku` alias resolution differs
   from a pinned model release; how supported user overrides work.
4. What happens for missing/rejected models, unsupported settings, partial results,
   cancellation, and unavailable native tools.
5. Why read-only instructions are not automatically a technical sandbox; which evidence
   the main agent verifies and why required checks remain its responsibility.
6. What changed after global-rule removal, and why prepared artifacts are not proof of
   installation or authorization to install.
7. Why no numeric token/cost saving is promised without comparable measurements, and
   which runtime environments actually have evidence.

Update the maintained inventory to 17 with the new standalone skill. Add one clear
link to the page, a compact flow in prose, the essential limitations above, and stable
entry points `skills/context-scouting/SKILL.md`, `renderHostTemplate`, and the focused
tests. Explain that scout model selection is operational and distinct from advisory
author/reviewer/implementation suggestions. Reuse existing lifecycle documentation
for installation commands; do not introduce a new installer or duplicate stale commands.

After editing, the independent reader checks those questions against the actual files
and P02 results, validates each example using the verified host surface, and reports
unsupported statements or broken links. Correct the documentation until this acceptance
passes; this reader check is documentation acceptance, not an optional code-review gate.
PROVE any new absence assertion by presenting an intentionally misleading temporary
paragraph (for example, claiming automatic activation) and confirming rejection; restore
the correct text before final checks.

From repository root:

```bash
rtk proxy node_modules/.bin/prettier --check README.md docs/context-scouting.md
rtk proxy npm run generate:check
```

Verify relative links resolve, examples name existing generated skills, and the page
contains no private paths, credentials, raw transcripts, unsupported compatibility
claims, or invented savings. A reader or host check that cannot be performed remains
unrun and keeps this packet incomplete. No mass-formatting outside the allowed paths.

## Completion and recovery

Rollback only this packet's documentation hunks if needed. No external/manual mutation
gate is present. Recheck specification pins, record reader/command outcomes, mark P03
only after its checks pass, replace handoff with the final current state, and stop.
Do not commit, install, publish, or invoke another workflow.

## Execution evidence — 2026-10-08

**CS-P03 complete.** Production changes are limited to `README.md` and
`docs/context-scouting.md`; this packet, checklist and current handoff record the
result. No source, renderer, global guidance, workflow YAML, dependency or
installation change was made. Historical collection evidence was not rewritten.

### Initial acceptance: RED

A fresh independent reader inspected the existing operator documentation before
edits and without reading the feature/specification/P02 answers. The focused page
was absent; README listed 16 workflows and lacked context-scouting. None of the
seven acceptance answers was supported specifically for this skill. Existing
general model recommendations and MCP isolation statements could not substitute
for the scouting contract. This was a relevant documentation-acceptance failure,
not a unit-test import failure. Temporary output-compression difficulties were
resolved through bounded reads before the reader issued its assessment.

### Changes and GREEN

- README now lists 17 workflows including the standalone context-scouting skill,
  links its guide, summarizes the flow and limits, and distinguishes operational
  scout model requests from advisory author/reviewer/implementation suggestions.
- The focused page documents explicit host invocation, current-task scope,
  direct-versus-delegated discovery, named models and aliases, supported overrides,
  unavailable capabilities, partial/stale results and cancellation. It separates
  inspection instructions from enforced sandbox restrictions and preserves main
  verification/check ownership. Migration, generated-versus-installed availability,
  unmeasured savings and exact runtime evidence boundaries are explicit.
- Canonical source, conditional reference, renderer and focused tests are linked;
  installation commands reuse the existing lifecycle documentation. No new CLI
  or duplicated installation command was introduced.

The same independent reader accepted **7/7** questions against actual documents,
generated artifacts, the renderer and P02 evidence. All **25 relative links**,
including local anchors, resolve; maintained inventory and both generated bundles
contain 17 skills. The examples agree with artifact names/metadata and official
host invocation documentation. Codex's generated-artifact-path example matches
P02's native qualification surface. Named invocation examples are checked against
documentation and generated metadata, not claimed as new live installation trials.
Claude examples were checked only statically: the user's cancellation of Claude
runtime testing remains authoritative, with no Claude invocation or installation.

Official invocation pages inspected during documentation acceptance:

- `https://developers.openai.com/codex/skills` (explicit `$`/`/skills` selection).
- `https://code.claude.com/docs/en/plugins` (plugin-qualified skill naming).

### PROVE and final checks

The independent reader rejected an intentionally misleading temporary candidate
paragraph on four separate guarantees: automatic activation, generation implying
installation, inspection instructions enforcing a sandbox, and universal aggregate
token savings. The candidate was supplied only as a reader control; it was never
written to the maintained page. The correct documentation remained in place.

Repository-root commands passed:

```bash
rtk proxy node_modules/.bin/prettier --check README.md docs/context-scouting.md
rtk proxy npm run generate:check
rtk proxy git diff --check -- README.md docs/context-scouting.md
```

The initial Prettier check found formatting differences only in the new page.
Targeted Prettier write corrected them; final checks passed. A bounded Python
probe independently confirmed relative-file links, the exact 17-entry inventory,
and absence of private paths or compressed-output markers. No new durable test
was added for prose; acceptance used the packet's independent reader and executable
checks. Generated parity passed for 17 skills.

P02 prerequisites were reverified: generated Codex artifact digest unchanged,
generated parity passed, and private global read-back still matched P02's output.
Matching implementation-bundle verification and usable Git worktree checks passed.
Tracked/untracked state was inspected and the staged diff was empty; unrelated
work was preserved. All six linked requirements and their continuations were read
through MCP. Initial requirement calls used the aggregate version instead of the
required Markdown version and were rejected; corrected calls succeeded without
changing any pin or workflow state. MCP checks before completion returned `pass`,
`approved`, `reviewed` with the original source/specification/review pins.

All three packets are complete. No required check remains failed or unrun under
the user's revised Claude-testing scope. Reviews, installation, enablement,
commits, push and publication were not performed. There is no next implementation
packet; stop without invoking another workflow.
