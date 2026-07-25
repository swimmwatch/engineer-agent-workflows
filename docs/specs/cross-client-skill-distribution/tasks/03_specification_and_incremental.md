# Packet 03: Specification And Incremental Workflows

Requirements: SKILL-004, SKILL-005, MAN-001, MAN-002, PLAN-001, MCP-001,
ACC-008, ACC-009.

## Outcome

Generalize `spec-driven-development` and `incremental-implementation` as the two
bundle-required workflows. Both must verify the exact sibling engineering
manual before producing artifacts, preserve Prompt MCP decision/approval
semantics, and stop at their review boundaries.

## Prerequisites

- Packets 01 and 02 are complete.
- The planning bundle's manual, digest, verifier, and packet reference pass in
  direct, copied, and symlinked layouts.
- Read the current source versions of both skills and
  `prompt-mcp/.agents/references/specification-interview.md`.

## Scope

- Author both bounded `SKILL.md` files and the generalized specification
  interview reference.
- Add matching digest markers that point to the one sibling manual.
- Preserve the explicit draft approval gate, durable decision ledger,
  recoverable Prompt MCP interview, one-packet execution, and transition
  commit rule.
- Add missing/mismatched/mixed-version bundle fixtures and artifact-specific
  quality fixtures.
- Update only these two catalog entries if final descriptions change.

## Non-Goals

- Do not copy the engineering manual into either skill.
- Do not make one skill invoke planning or another workflow automatically.
- Do not install/configure Prompt MCP or hard-code generated MCP namespaces.
- Do not prescribe a programming language, framework, project layout, test
  command, or Git branch.
- Do not create a specification, plan, implementation, or commit for this
  project as part of fixtures.

## File And Symbol Boundaries

| File/unit | State | Contract |
| --- | --- | --- |
| `skills/spec-driven-development/SKILL.md` | Proposed | Explicit-only, specification-only workflow; durable decisions through callable Prompt MCP; separate approval; no planning/implementation. |
| `skills/spec-driven-development/references/specification-interview.md` | Proposed | Material-decision, batching, checkpoint, recovery, approval, and safe-outcome contract using current callable Prompt MCP schemas. |
| `skills/spec-driven-development/engineering-manual.sha256` | Proposed/generated | Digest marker for the sibling planning manual. |
| `skills/incremental-implementation/SKILL.md` | Proposed | Explicit-only, one-authorized-packet implementation workflow with scoped verification and review stop. |
| `skills/incremental-implementation/engineering-manual.sha256` | Proposed/generated | Same manual digest marker. |
| `tests/specification-skill.test.mjs` | Proposed | Behavioral spec, decision persistence, approval, Prompt MCP outcome, and no-implementation fixtures. |
| `tests/incremental-skill.test.mjs` | Proposed | Packet scope, planning-mode architecture, verification, handoff, transition commit, and stop fixtures. |
| `tests/bundle-required.test.mjs` | Proposed | Missing, mismatch, mixed-release, copy, symlink, plugin, update, and path-form cases. |
| `tests/fixtures/specification/`, `tests/fixtures/incremental/` | Proposed | Declarative project/task/tool responses with sentinels; no private user answers. |
| `catalog/skills.json` | Existing | Only final descriptions/dependency metadata for these two entries may change; both remain bundle-required on planning. |

## Shared Bundle Contract

- Before writing a spec, plan, code, docs, checklist, handoff, or commit, locate
  the sibling `planning-and-task-breakdown` skill and run its manual verifier
  for the calling skill.
- The marker, manual, and calling skill must be from the same release digest.
- Missing sibling, missing marker, missing manual, mismatch, mixed release, or
  unsafe path stops with one fixed instruction to install/update the complete
  matching bundle using the documented global command.
- Do not fetch, copy, embed, approximate, or silently ignore the manual.
- Do not invoke the planning skill on the user's behalf.

## Specification Workflow Contract

- Activate only when the user asks to define/revise a substantial
  implementation-ready specification.
- Discover applicable `AGENTS.md`/`CLAUDE.md` and current repository evidence.
- Keep the specification behavioral: outcomes, interfaces, constraints,
  validation, limits, failures/recovery, security/privacy, compatibility,
  non-goals, and objective acceptance.
- Use globally configured Prompt MCP only when required interview tools are
  callable; follow their exposed schemas and never construct a namespace.
- Checkpoint each non-sensitive committed answer immediately in a
  repository-owned `decisions.yaml`; do not store secrets or rely on chat
  memory as the durable record.
- Cancellation, timeout, unavailable, conflict, invalid, and failure statuses
  are not answers. Preserve recoverable state and resume explicitly.
- Keep `Status: Draft` until a separate Prompt MCP approval returns a committed
  positive decision. Approval of the idea or interview is not approval of the
  draft.
- Stop after approval/rejection handoff. Do not plan or implement.

## Incremental Workflow Contract

- Activate only for a user-authorized self-contained packet.
- In implementation mode, read the current packet, applicable project
  guidance, task-scoped code/tests/references, and verified manual; implement
  exactly one packet.
- In host planning mode, expose the complete symbol-level architecture required
  by PLAN-001 before implementation and keep production unchanged.
- Preserve unrelated work, choose the simplest adequate design, make
  ownership/errors/lifecycle explicit, and run packet-proportional checks.
- Update only that packet's `todo.md` item and `handoff.md`, then stop.
- At the start of the next authorized packet, commit the completed previous
  packet only when the user has explicitly authorized commits; inspect and
  stage exact paths. Never infer commit or publish authority.
- Failure to verify leaves the packet incomplete with exact evidence.

## Acceptance Criteria

- Both skill documents meet identity and size limits and contain no source
  repository assumptions.
- Both resolve the byte-identical manual under direct, copy, symlink, plugin,
  update, Linux, macOS, and Windows fixtures.
- Missing/mismatch/mixed-release cases create no artifacts and emit only the
  fixed complete-bundle instruction.
- Specification fixtures distinguish behavioral contracts from implementation
  design and require separate Prompt MCP approval.
- Prompt MCP cancellation/timeout/unavailable/conflict/invalid/failure never
  enters `decisions.yaml` as an answer.
- Incremental fixtures implement one packet, preserve unrelated files, run
  scoped verification, update checklist/handoff, and stop.
- Transition-commit fixtures require explicit authorization and exact staging.
- Planning-mode incremental fixtures expose language-appropriate architecture
  and do not mutate production.

## Verification

```bash
npm test -- --test-name-pattern='specification|incremental|bundle-required'
npm run validate:foundation
npm run generate:check -- --allow-incomplete
node skills/planning-and-task-breakdown/scripts/verify-engineering-manual.mjs \
  skills/spec-driven-development
node skills/planning-and-task-breakdown/scripts/verify-engineering-manual.mjs \
  skills/incremental-implementation
```

Review fixture snapshots to prove no Prompt MCP sentinel, private answer, or
absolute personal path appears in output or diagnostics.

## References

- [Approved specification](../spec.md): bundle-required, engineering-manual,
  planning-detail, and Prompt MCP contracts listed above.
- Initial refinement sources: `spec-driven-development/SKILL.md`,
  `incremental-implementation/SKILL.md`, and `specification-interview.md` from
  the approved `prompt-mcp` source repository.

## Completion And Handoff

- Mark only packet 03 complete.
- Record the shared digest, skill/reference sizes, every supported layout,
  fixed failure message, Prompt MCP status evidence, and packets 04–07 as
  independently available.
- Stop. Do not commit or begin another packet without separate authorization.
