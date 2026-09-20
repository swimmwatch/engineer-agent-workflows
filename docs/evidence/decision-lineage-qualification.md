# Current Decision Lineage Qualification

Status: Narrow correction verified; full workflow qualification remains in progress.
All customer data below is SIMULATION, not real user consent.

## Observed Failure

The retained Deep author09 trace proves two additive-answer failures. The author
read the previous complete event and retention answers, prepared narrower
follow-up questions using `revises` on those same decisions, and then linked old
and new requirements to the current narrow answers. Previous revisions remained
in history: this was loss of current evidence coverage, not deletion or an MCP
persistence failure. The question controller delivered the relevant answers.

Evidence is retained in the durable qualification run under
`deep-current-recovery-evaluator-09/CURRENT-ANSWER-LINEAGE-AUDIT.json`, with native
item IDs and exact MCP-output hashes. Independent review09 reported the same
current-link overclaim. Planning was not started from that specification.

## Discriminating Check And Narrow Correction

Before changing the skill, `current-decision-regression-01/definition-freeze.json`
froze the invariant, scenario answers and two neutral model prompts.
`current-decision-regression-01/RED.json` records two expected failures from the
actual author09 transitions. It checks question revisions, current answer content
and requirement links, not the wording of the skill.

The authoritative specification-interview reference now distinguishes:

- An additive follow-up creates a separate question without `revises`.
- An intentional replacement uses the current reference and presents the complete
  resulting decision, including commitments that remain unchanged.
- Actual replies remain unchanged. Requirement links need support from the
  current question-and-answer pair, not superseded historical answers.

The MCP protocol and runtime are unchanged. Both host bundles are generated from
that single reference. Fresh Sol additive and replacement trials are required;
historical failure detection alone does not demonstrate the correction works.

Candidate05 was frozen at 2026-09-06T12:05:46Z. Its Codex skill digest is
`e98cc17be92cea5d3d073b3738af2c9839809fb378e9f01a51fed96257d9f261`; the Claude
digest is `ae4ec8ef1f1204c1eba93152334c93a5bb6f0a06bd420e2b4e02377999f758a6`.
Only the interview reference changed in each host's skill tree relative to
candidate04. Full `npm test` passed 232/232 with no skips; generation check,
foundation validation (16/16), affected Codex skill validation and
`git diff --check` also passed. An earlier pre-final-edit run failed an existing
wording assertion after the accurate server-owned append/history explanation was
removed. That explanation was retained; no test was weakened.

The two fresh Sol trials started after `execution-freeze.json` at 12:06:35Z.
Their seeded current decisions were authored through MCP, not handwritten YAML.
Both passed the frozen behavioral invariant: additive 7/7 and replacement 6/6.
The additive case retained the earlier answer and its two requirement links,
creating a separate exact clock answer linked only to its new requirement. The
replacement case retained the original decision ID with a complete 852-character
current answer and all four supported requirement links. The final specifications
also passed a full synthesis read. Each actor received the complete updated
interview reference, verified against the native read output byte-for-byte.

Evidence: `current-decision-regression-01/RESULTS.json`, per-case `*-AUDIT.json`
and `SYNTHESIS-REVIEW.md`. Each trial recovered from one invalid `decision_find`
request with limit 100 above the published maximum 50. `history: false` is
supported and was not the invalid parameter. Both trials used exact answers
already present in their explicit simulated prompts; neither is a native-dialog
answer or approval test. No product implementation or full Deep-loop pass is
claimed by this narrow regression.

For the later full Deep recovery, `deep-operator-extension-v8.json` separately
records newly chosen simulated backup discovery/restoration and positive log
signals. These missing details are not retroactively attributed to the old answer
bank. Existing runner environment and IPC contracts were independently observed
in the starter. Internal file-writing algorithms remain planning decisions.

## Qualification Boundaries

The separate stale-planning control04 passed: only the four planning files
changed, while 127 other files, the Approved specification and Git index remained
unchanged. Native application tests returned zero. The plan now preserves a
single internal tab and normalizes only runs of length two or more. Evidence:
`controls-stale-evaluator-04/AUDIT.json`. This is a scoped control, not a full loop.

Stable full-matrix passes remain 0/2. Earlier candidate04 results remain historical
scoped evidence and cannot be combined into a stable pass for candidate05.
Claude execution and actual 200% browser zoom remain unverified as previously
agreed. No global configuration, installation, commit or publication is included.
