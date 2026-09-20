# Packet 02: Engineering Manual And Planning

Requirements: SKILL-002, SKILL-004, MAN-001, MAN-002, TEST-001, PLAN-001,
PLAN-002, INT-001, TOK-002, DOC-001, ACC-008, ACC-009.

## Outcome

Add the authoritative engineering and test-discipline references, the
generalized standalone `planning-and-task-breakdown` skill, task-packet and
developer-documentation references, and deterministic shared-resource digest
verification. Prove symbol-level, test-first planning across object-oriented,
functional/procedural, and documentation/configuration tasks.

## Prerequisites

- Packet 01 is complete and its catalog/validation primitives pass.
- The canonical catalog classifies `planning-and-task-breakdown` as standalone.
- Read the current source versions of:
  - `prompt-mcp/.agents/skills/planning-and-task-breakdown/SKILL.md`;
  - `prompt-mcp/.agents/references/task-packets.md`;
  - the matching KAP project-local Claude skill and references at commit
    `7ef7e0db`.
- Treat those files as refinement inputs, not text to copy unchanged.

## Scope

- Author the planning skill within the 240-code-point/4,096-byte limits.
- Author the complete engineering manual and test discipline under root
  `shared/`, plus planning-local task-packet and developer-documentation
  references.
- Add a portable digest verifier using Node built-ins and generate
  authenticated local shared-resource copies into every consuming skill.
- Extend the fixture harness for architecture completeness, evidence,
  test-first sequencing, conditional documentation, no-mutation planning
  behavior, and contextual principle application.
- Update only this catalog entry if its final description changes.

## Non-Goals

- Do not create the specification or incremental workflows.
- Do not add project-specific language, framework, package-manager, CI,
  directory, class, or command assumptions.
- Do not generate host plugins or install skills.
- Do not make every plan object-oriented or require every principle in every
  task.
- Do not require a documentation packet when fewer than two usefulness
  criteria apply.
- Do not create implementation artifacts from planning fixtures.

## File And Symbol Boundaries

| File/unit | State | Contract |
| --- | --- | --- |
| `skills/planning-and-task-breakdown/SKILL.md` | Proposed | Explicit-only planning workflow; reuses host-supplied project guidance, reads only additional scoped guidance, the manual, and approved task/spec evidence, then emits review-gated packets without implementation. |
| `shared/references/engineering-principles.md` | Proposed | The one authored manual containing all quality principles and distinct specification, plan, and implementation contracts. |
| `shared/references/test-discipline.md` | Proposed | The one authored RED/GREEN/PROVE and verification discipline used by specification, planning, and implementation. |
| `shared/scripts/verify-engineering-manual.mjs` | Proposed | `locateBundleRoot(fromSkillDir)`, shared-resource digest verification, matching-planning authentication, and `main(argv)`. |
| `skills/planning-and-task-breakdown/shared/` | Proposed/generated | Byte-identical local copies of the authored shared references and verifier. |
| `skills/planning-and-task-breakdown/references/task-packets.md` | Proposed | Self-contained test-first packet/bundle contract generalized for arbitrary repositories and languages. |
| `skills/planning-and-task-breakdown/references/developer-documentation.md` | Proposed | Conditional usefulness threshold, repository-selected language/style, final-packet ordering, and reader-based acceptance. |
| `skills/planning-and-task-breakdown/*.sha256` | Proposed/generated | Lowercase SHA-256 markers for the exact shared reference bytes plus LF. |
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

## Test Discipline Contract

- Derive a durable test or discriminating executable check from each
  behavior-changing acceptance criterion before implementation.
- Observe relevant RED evidence that reaches the intended assertion rather
  than failing only because a symbol, import, or harness is unavailable.
- Implement the smallest correct change, then correct the implementation while
  a correct check fails. Never weaken an assertion or delete a scenario merely
  to obtain green.
- Record a deliberate PROVE mutation when RED cannot establish that an
  absence, structure, post-hoc test, or equivalent assertion can fail.
- Run focused checks during each slice and repository-proportional final
  verification. Record temporary-probe findings and remove probe artifacts.

## Developer Documentation Contract

- Every substantial plan records whether durable developer documentation is
  warranted and the evidence for that decision.
- Create a separate final documentation packet only when at least two
  usefulness criteria in `references/developer-documentation.md` apply.
- Follow the consuming repository's applicable `AGENTS.md` or `CLAUDE.md`,
  documentation location, established language, and style.
- Run the packet after implementation and end-to-end verification. Require an
  objective reader-based acceptance check rather than mere file existence.

## Planning Skill Contract

- Activate only on explicit user request for planning or decomposition.
- Reuse project instructions already supplied by the host. Read `AGENTS.md` in
  Codex or `CLAUDE.md` in Claude Code only for additional scoped guidance not
  in active context or when the file itself is in scope, then inspect
  task-scoped code, tests, interfaces, configuration, and stable docs.
- Resolve and verify the contained engineering manual before producing plan
  artifacts.
- Use callable `request_user_input` in Codex or `AskUserQuestion` in Claude
  Code for material choices not settled by approved requirements or repository
  evidence. Follow the exposed schema in the current mode; do not enter plan
  mode solely to ask a question.
- If the standard tool is unavailable, ask the material question directly in
  the conversation and stop when its answer is required for a sound plan.
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
- Every behavior packet orders work as test/check, relevant RED, implementation,
  implementation correction until correct checks pass, required PROVE, focused
  verification, and repository-proportional final verification.
- Make and record the conditional developer-documentation decision described
  above.
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
- It compares both shared references to the caller skill's digest markers and,
  for bundle-required callers, authenticates the matching planning companion.
- Success is silent or bounded. Missing root/manual/marker, unsafe layout, and
  mismatch use fixed content-free diagnostics and nonzero exit.

## Acceptance Criteria

- Both shared references exist exactly once under authored root `shared/`.
- Their digest markers match exact bytes and repeated generation is stable.
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
- Every behavior packet demonstrates the required test-first order and refuses
  to weaken a correct failing check.
- Documentation fixtures cover both sides of the two-criterion threshold,
  repository-selected language, final-packet ordering, and reader acceptance.
- Missing or mismatched shared resources stop before a plan artifact is
  produced.

## Verification

```bash
npm test -- --test-name-pattern='planning|engineering manual|test discipline'
node skills/planning-and-task-breakdown/shared/scripts/verify-engineering-manual.mjs \
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
  MAN-002, TEST-001, PLAN-001, PLAN-002, INT-001, TOK-002, ACC-008, and
  ACC-009, plus DOC-001.
- Initial refinement sources: `planning-and-task-breakdown/SKILL.md` and
  `task-packets.md` from the approved `prompt-mcp` source repository, plus the
  matching skill and references from the KAP project-local Claude workflows.

## Completion And Handoff

- Mark only packet 02 complete.
- Record both shared-resource digests, exact skill/reference sizes, verifier
  layouts, test-first/documentation fixture results, and packet 03 as next.
- Stop for review. Do not commit, package, install, or begin packet 03 without
  separate authorization.
