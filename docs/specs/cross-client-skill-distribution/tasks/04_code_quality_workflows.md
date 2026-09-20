# Packet 04: Code-Quality Workflows

Requirements: SKILL-001, SKILL-002, SKILL-005, QUAL-001, SEC-003, ACC-001,
ACC-007, ACC-010.

## Outcome

Generalize five standalone evidence-driven workflows:
`code-review-and-quality`, `code-simplification`,
`doubt-driven-development`, `performance-optimization`, and
`security-and-hardening`.

## Prerequisites

- Packet 01 is complete.
- Read each corresponding source `SKILL.md` from `prompt-mcp` as a refinement
  input.
- Read the matching KAP project-local Claude skill for later portable
  refinements to `doubt-driven-development`.
- Repository fixture harnesses can assert explicit invocation, output
  boundaries, project discovery, and no unintended mutation.

## Scope

- Author the five portable, explicit-only, standalone skill directories.
- Preserve each workflow's distinct trigger, evidence requirements, authority,
  non-goals, stopping condition, and verification.
- Make doubt review use a fresh-context host-native subagent and reconcile its
  evidence without requiring an external cross-model CLI.
- Add focused declarative fixtures for multiple ecosystems and absent-tool
  cases.
- Update only these five catalog descriptions if needed.

## Non-Goals

- Do not combine the workflows into a generic “quality” skill.
- Do not assume Go, MCP, GTK, GitHub, a package manager, a linter, a benchmark,
  a threat model, or a particular CI system.
- Do not edit during review/doubt/diagnosis unless the user separately asks
  for fixes.
- Do not claim performance or security improvement without measured evidence.
- Do not expose prior conclusions, suspected defects, or the parent agent's
  reasoning to the fresh doubt reviewer unless the evaluation contract needs
  them.
- Do not add references or scripts that are not selectively required.

## File Boundaries

For each name below, create `skills/<name>/SKILL.md` and only the references or
deterministic scripts justified by its routing conditions:

| Skill | Required responsibility |
| --- | --- |
| `code-review-and-quality` | Review an identified change or diff; prioritize correctness, regressions, security, compatibility, maintainability, and missing tests; report evidence by severity; do not edit. |
| `code-simplification` | Perform an explicitly requested behavior-preserving clarity refactor; establish behavior and tests first; avoid scope expansion and speculative abstraction. |
| `doubt-driven-development` | Adversarially challenge a named high-risk product or technical decision through a fresh-context host-native subagent; provide only the artifact and evaluation contract, reconcile evidence, and do not become routine indecision. |
| `performance-optimization` | Diagnose or improve a measured latency, throughput, memory, startup, size, or cost problem; require baseline/profile evidence and preserve correctness. |
| `security-and-hardening` | Audit or harden a concrete trust boundary; model assets/actors/input paths, fail closed, minimize privilege/data exposure, and verify abuse cases. |

Also add:

- `tests/code-quality-skills.test.mjs`;
- `tests/fixtures/code-quality/<skill-name>/` with explicit-invocation,
  incomplete-input, out-of-scope, positive, safety, and outcome-equivalence
  cases;
- optional skill-local references only when a fixture proves the body limit or
  conditional depth requires one.

## Shared Contract

- On invocation, reuse project instructions already supplied by the host. Read
  `AGENTS.md` or `CLAUDE.md` only for additional task-scoped guidance absent
  from active context or when the file itself is in scope, then inspect code,
  tests, interfaces, config, and stable docs.
- Treat repository evidence and approved requirements as authoritative; do not
  invent tools or commands.
- Identify whether the user authorized read-only assessment, diagnosis, or
  mutation. Do not widen that authority.
- Keep findings and diagnostics bounded and redact secrets, credentials,
  private paths, personal data, and unrelated source content.
- Use evidence-specific language: verified, inferred, unknown, not run.
- Stop after the requested artifact and verification; do not invoke another
  skill or publish.

## Skill-Specific Invariants

- Review findings lead with actionable defects and evidence, not a narrative
  summary. An empty finding list must state residual risk and checks run.
- Simplification preserves public behavior, schemas, side effects, error
  behavior, compatibility, and performance-sensitive contracts unless the
  user explicitly authorizes a change.
- Doubt analysis defines the decision and decision deadline, steelmans it,
  starts a fresh-context host-native subagent with only the artifact and
  evaluation contract, reconciles independent findings, identifies
  disconfirming evidence and safe experiments, and ends with a recommendation
  or explicit blocker. An external cross-model CLI is optional, not required.
- Performance changes establish a reproducible baseline, locate a bottleneck,
  change the narrowest cause, compare equivalent workloads, and reject
  regressions in correctness or tail behavior.
- Security work names the trust boundary and abuse cases, checks secrets and
  supply chain where relevant, and never “fixes” a failing control by weakening
  it.

## Acceptance Criteria

- All five stable names are present, standalone, explicit-only, within the
  description/document limits, and contain no `prompt-mcp`, Go, GTK, or fixed
  source-directory assumptions.
- Each passes outcome-equivalence and safety fixtures derived from its source
  workflow.
- At least two distinct repository ecosystems prove runtime discovery rather
  than embedded commands.
- Review and doubt fixtures make no edits.
- Doubt fixtures prove a fresh host-native subagent receives no parent
  conclusion, returns evidence that is reconciled rather than copied, and does
  not require an external CLI.
- Simplification fixtures prove behavior snapshots before/after.
- Performance fixtures reject unmeasured optimization and compare baselines.
- Security fixtures cover input validation, secrets, privilege, filesystem or
  process boundary as applicable and preserve fixed failure controls.
- Unselected skill-body/reference sentinels are not loaded by another skill.

## Verification

```bash
npm test -- --test-name-pattern='code quality|review|simplification|doubt|performance|security'
npm run validate:foundation
npm run generate:check -- --allow-incomplete
```

Run static searches for source-specific assumptions and review every match:

```bash
grep -RInE 'prompt-mcp|internal/|go test|GTK|Zenity|cmd/' \
  skills/code-review-and-quality \
  skills/code-simplification \
  skills/doubt-driven-development \
  skills/performance-optimization \
  skills/security-and-hardening
```

## References

- [Approved specification](../spec.md): initial inventory, repository
  adaptation, refinement, supply-chain/privacy, skill validation, and
  context-efficiency and fresh-reviewer contracts.
- Initial refinement sources: the five matching skill directories in the
  approved `prompt-mcp` source repository and the matching KAP project-local
  Claude workflow.

## Completion And Handoff

- Mark only packet 04 complete.
- Record exact sizes, references/scripts added, fixture ecosystems, checks, and
  remaining workflow packets.
- Stop for review; do not commit, generate plugins, or start another packet
  without separate authorization.
