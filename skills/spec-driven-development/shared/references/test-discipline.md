# Test Discipline

Use this reference when a specification defines acceptance, a plan creates
execution packets, or an implementation changes behavior. Repository rules and
approved requirements remain authoritative.

## RED, GREEN, PROVE

Write the check first, make it pass with the smallest correct implementation,
then establish that the check can detect the defect it claims to guard.

1. **RED** — derive a test or executable check from the acceptance criterion,
   run it before implementation, and observe a relevant failure.
2. **GREEN** — implement the smallest behavior that satisfies the criterion.
   When a correct check still fails, correct the implementation and repeat;
   do not weaken the check, delete a scenario, or loosen an assertion merely to
   obtain a passing run. Change a check only when requirements or evidence show
   that the check itself is wrong, and record that correction explicitly.
3. **PROVE** — when required below, break one implementation behavior that the
   check should catch, confirm that the assertion fails, and restore the code.

A RED caused only by a missing symbol, import failure, collection error, or
invalid harness does not prove that the intended assertion can fail. Repair the
harness or complete GREEN, then apply PROVE.

For new or changed behavior, PROVE is required when:

- the criterion describes an absence, such as no query, no session, or no
  inherited value;
- RED did not execute the intended assertion;
- the test was written after the behavior it covers;
- the assertion observes structure, wiring, or a call graph rather than a
  returned value.

Unchanged baseline constraints still need ordinary regression checks, but do not
require extra mutations merely because they are listed in a packet or their
checks are newly written. Apply PROVE when the affected boundary puts the
guarantee at risk, or repository rules or approved requirements explicitly
require it. Unchanged wording alone does not make an affected guarantee baseline.

For a direct input-to-output test written first whose assertion failed during
RED, that failure already proves the assertion and no extra mutation is needed.
When mutating, change one behavior at a time so simultaneous changes cannot mask
each other. Record the mutation and the tests it broke in the packet notes or
handoff.

## Adequate Checks

A durable test guards one behavior that project code can accidentally break.

- Test behavior at its owning layer. Use integration tests for boundaries,
  wiring, lifecycle, and cleanup rather than repeating unit behavior.
- Do not test a language, framework, or library contract that remains true with
  all project code removed.
- Prefer one test per behavior over tests shaped around implementation branches.
- Do not mirror declarations, restate constants, or hard-code a bound that
  should be derived from the authoritative constant.
- Prefer an assertion that a plausible incorrect implementation will fail.
- Verify the observation surface itself: a snapshot must not expose protected
  mutable state, and a counter must measure the actual operation being checked.
- Cover material invalid input, failure, recovery, compatibility, security,
  concurrency, and cleanup behavior at the narrowest sufficient layer.

## Tests And Probes

A test guards an approved promise and remains in the repository. A probe answers
a current factual question and is temporary.

Use a bounded probe when a design depends on actual library, runtime, service,
or assertion behavior that repository evidence does not establish. Put it in a
repository-approved scratch location, run it, record the finding where the
decision lives, and delete it. Do not commit or retain a probe merely because it
already exists, and do not promote it to a test without a durable behavior
contract.

## Work Without A Unit-Testable Behavior

A version pin, rendered configuration, rename, documentation update, or similar
slice may have no useful unit test. The test-first step becomes a discriminating
executable check: name it before changing the artifact, show how it distinguishes
correct from incorrect output, run it, and record the result. No slice is
complete from reasoning alone.

## Structured Workflow State

### Workflow YAML: Mandatory Scenario MCP

For manifest, decisions, catalog and experience state, read
`shared/references/yaml-contracts.md` and use its callable scenario tools for
reads, authoring and validation. That reference owns the access and version
contract; do not substitute legacy reader tools, handwritten YAML, shell queries
or a local parser. Missing or incompatible capability blocks affected work
without granting installation or configuration authority.

Use bounded current-state queries and obtain complete exact records where
needed. Request history only when relevant. For the final gap review, enumerate
all current decisions in bounded batches and trace them to requirements; a
filtered result or first page does not establish completeness. Complete all
continuations before treating a record as exact evidence. Bind reads to their
project, specification and source version; restart stale queries and reconcile
changes instead of combining versions.

After a state change or recovery, use the owning workflow's scenario check and
read-back before consuming that state or handing it off. Reconcile reported
conflicts without discarding user edits or history. A valid structure or saved
answer does not independently establish user consent, confirmed scope or a
passed gap review.

### Profile-Specific YAML Contracts

API, event and data contracts retain their declared profile formats. When those
formats use YAML, validate the actual saved bytes with a real YAML parser and
the applicable contract validator before relying on them. This is not a fallback
for the four workflow documents above. Do not load inactive-profile contracts.

Use a serializer or correct quoting for free-text data. Record the validation
command and actual result in ordinary progress evidence. Visual inspection,
regexes and a generated-looking file are not parser evidence. Repair
serialization errors and validate again without discarding user edits or
changing approved requirements merely to pass a check. If a required validator
is unavailable, leave the affected checkpoint incomplete and report the missing
prerequisite; do not claim a pass. Syntax, contract semantics and authorization
remain separate checks.

## Evidence And Assumptions

Every material claim about existing code carries repository-relative
`file:line` evidence and is re-verified before implementation. Mark external
behavior as verified by authoritative evidence or a probe, or as an assumption
with a falsifier. Verify behavior promised to remain compatible; do not promote
an untested runtime or platform assumption to an existing contract. If current
evidence contradicts a plan while approved
requirements remain unchanged, correct the plan and record the discrepancy.
Never silently adapt around stale planning material.
