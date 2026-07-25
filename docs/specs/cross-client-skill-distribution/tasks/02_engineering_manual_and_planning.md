# Packet 02: Engineering Manual And Planning

Requirements: SKILL-002, SKILL-004, MAN-001, MAN-002, PLAN-001, TOK-002,
ACC-008, ACC-009.

## Outcome

Add the single authoritative engineering manual, the generalized standalone
`planning-and-task-breakdown` skill, a generalized task-packet reference, and
deterministic manual-digest verification. Prove symbol-level planning across
object-oriented, functional/procedural, and documentation/configuration tasks.

## Prerequisites

- Packet 01 is complete and its catalog/validation primitives pass.
- The canonical catalog classifies `planning-and-task-breakdown` as standalone.
- Read the current source versions of:
  - `prompt-mcp/.agents/skills/planning-and-task-breakdown/SKILL.md`;
  - `prompt-mcp/.agents/references/task-packets.md`.
- Treat those files as refinement inputs, not text to copy unchanged.

## Scope

- Author the planning skill within the 240-code-point/4,096-byte limits.
- Author the complete engineering manual and task-packet reference.
- Add a portable sibling-aware digest verifier using Node built-ins.
- Extend the fixture harness for architecture completeness, evidence,
  no-mutation planning behavior, and contextual principle application.
- Update only this catalog entry if its final description changes.

## Non-Goals

- Do not create the specification or incremental workflows.
- Do not add project-specific language, framework, package-manager, CI,
  directory, class, or command assumptions.
- Do not generate host plugins or install skills.
- Do not make every plan object-oriented or require every principle in every
  task.
- Do not create implementation artifacts from planning fixtures.

## File And Symbol Boundaries

| File/unit | State | Contract |
| --- | --- | --- |
| `skills/planning-and-task-breakdown/SKILL.md` | Proposed | Explicit-only planning workflow; reads applicable host project guidance, the manual, approved task/spec evidence, and emits review-gated packets without implementation. |
| `skills/planning-and-task-breakdown/references/engineering-principles.md` | Proposed | The one authored manual containing all quality principles and distinct specification, plan, and implementation contracts. |
| `skills/planning-and-task-breakdown/references/task-packets.md` | Proposed | Self-contained packet/bundle contract generalized for arbitrary repositories and languages. |
| `skills/planning-and-task-breakdown/scripts/verify-engineering-manual.mjs` | Proposed | `locateBundleRoot(fromSkillDir)`, `readExpectedDigest(fromSkillDir)`, `verifyEngineeringManual(fromSkillDir)`, `main(argv)`. |
| `skills/planning-and-task-breakdown/engineering-manual.sha256` | Proposed/generated | Lowercase SHA-256 of the exact manual bytes plus LF; no second manual content. |
| `tests/planning-skill.test.mjs` | Proposed | Contract, routing, architecture-unit, conflict, and non-mutation fixtures. |
| `tests/manual-verifier.test.mjs` | Proposed | Copy/symlink/path-separator/digest/missing/manual-error tests. |
| `tests/fixtures/planning/` | Proposed | OO, functional/procedural, docs/config, disproved-boundary, rule-conflict, and incomplete-evidence cases. |
| `catalog/skills.json` | Existing | Only the planning entry's final description/metadata may change; stable name/classification do not. |

## Engineering Manual Contract

The manual must state that approved product requirements and applicable
repository instructions outrank generic advice. It applies principles only
when material and records meaningful deviations or trade-offs.

It must cover:

- correctness, contracts, invariants, validated boundaries;
- KISS, YAGNI, knowledge-oriented DRY, and avoidance of speculative
  abstraction;
- SOLID only where object-oriented responsibilities and dependency boundaries
  make it useful;
- separation of concerns, information hiding, encapsulation, low coupling,
  high cohesion, low cognitive complexity, and composition over inheritance
  where clearer;
- stable dependency direction and inversion at real external boundaries;
- meaningful names, cohesive units, bounded control flow;
- ownership, lifecycle, cancellation, concurrency, and cleanup;
- safe failure, least privilege, privacy, and fail-closed security;
- compatibility, idempotency, retries, and migrations where externally
  observable;
- testability, deterministic behavior-focused tests, bounded/redacted
  observability, evidence-driven performance, accessibility, platform
  conventions, scoped diffs, and final review.

It must distinguish:

- specification: observable behavior, interfaces, limits, failure/recovery,
  security, compatibility, non-goals, and acceptance without implementation
  invention;
- plan: evidence-backed architecture, units/symbols, dependency direction,
  verification, migration, rollout, and rollback concerns;
- implementation: simplest adequate scoped design, explicit ownership/errors,
  boundary tests, and contract preservation.

## Planning Skill Contract

- Activate only on explicit user request for planning or decomposition.
- Read `AGENTS.md` in Codex or `CLAUDE.md` in Claude Code, then task-scoped
  code, tests, interfaces, configuration, and stable docs.
- Resolve and verify the contained engineering manual before producing plan
  artifacts.
- For each affected or proposed architectural unit state:
  file/ownership boundary, existing/proposed state, language-appropriate
  symbols, responsibility, inputs/outputs, state/lifecycle, errors/invariants,
  dependency direction/reason, and verification evidence.
- Map every unit to the authorized task requirements; mark uncertainty and
  revise the plan when repository evidence disproves a boundary.
- For substantial work, create compact `plan.md`, linked `todo.md`,
  current-only `handoff.md`, and self-contained numbered packets.
- Each packet includes outcome, prerequisites, scope, non-goals, exact
  file/symbol contracts, acceptance, verification, manual gates, and handoff.
- Never mutate production artifacts, execute a packet, invoke another
  workflow, or treat planning approval as implementation authorization.
- Stop after presenting the plan for review.

## Manual Verification Contract

- The verifier accepts a starting skill directory, not an arbitrary manual
  path.
- It resolves the installed bundle root for direct directories, symlinked
  global installs, copied installs, and native plugin layouts on POSIX and
  Windows path forms.
- It never searches upward beyond a bounded expected layout, follows an
  untrusted network path, fetches content, or writes.
- It compares the exact file SHA-256 to the caller skill's marker.
- Success is silent or bounded. Missing root/manual/marker, unsafe layout, and
  mismatch use fixed content-free diagnostics and nonzero exit.

## Acceptance Criteria

- The manual exists exactly once under authored `skills/`.
- Its digest marker matches exact bytes and repeated generation is stable.
- `SKILL.md` meets both size limits and routes manual/task-packet reads only
  under their documented conditions.
- Planning fixtures expose correct language-appropriate units without forcing
  classes for functional, procedural, declarative, documentation, or config
  work.
- Every fixture includes purpose, inputs/outputs, relevant state/errors,
  dependency direction, requirement mapping, and verification.
- A disproved proposed symbol causes plan revision before any implementation.
- Rule-conflict fixtures prefer repository/approved requirements and record a
  material trade-off without ceremonial patterns.
- Planning fixtures leave production-tree snapshots unchanged.
- Missing or mismatched manual stops before a plan artifact is produced.

## Verification

```bash
npm test -- --test-name-pattern='planning|engineering manual'
node skills/planning-and-task-breakdown/scripts/verify-engineering-manual.mjs \
  skills/planning-and-task-breakdown
npm run validate:foundation
npm run generate:check -- --allow-incomplete
```

Create temporary copy and symlink layouts on the current platform and run the
same verifier against them. Run path-form fixtures for Linux, macOS, and
Windows independent of the host OS. Confirm repository snapshots before and
after planning fixtures are identical.

## References

- [Approved specification](../spec.md): SKILL-002, SKILL-004, MAN-001,
  MAN-002, PLAN-001, TOK-002, ACC-008, and ACC-009.
- Initial refinement sources: `planning-and-task-breakdown/SKILL.md` and
  `task-packets.md` from the approved `prompt-mcp` source repository.

## Completion And Handoff

- Mark only packet 02 complete.
- Record the manual digest, exact skill/reference sizes, verifier layouts,
  fixture results, and packet 03 as next.
- Stop for review. Do not commit, package, install, or begin packet 03 without
  separate authorization.
