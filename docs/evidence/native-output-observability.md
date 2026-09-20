# Native tool-output observability

## Scope

This is a private qualification-harness correction, not a workflow skill change.
The experiment used Codex CLI 0.153.4, Node.js 24.20.0 and the actual Terra model.
No global configuration, actor permissions, workflow contracts or generated
bundles changed.

## Observed failure

A Lite holdout passed independent behavior and scope checks and a separate
review, but its native read audit could not find three complete references in
ordinary command-execution events. A command naming a file is not evidence
that the model received its complete contents.

A discriminating experiment supplied six files totaling 28,464 bytes. Each
contained unpredictable start, middle and end markers absent from the prompt.
The actor was allowed one prescribed read and no recovery. It returned all
18 markers exactly, while the ordinary event stream retained only 6 in the
first experiment and 9 in the next two. Thus missing observer bytes did not
establish missing model context.

## Correction and verification

The local harness opts into the pinned client's experimental raw events.
It retains only function/custom tool calls and outputs, correlated by call ID,
in a separate evidence stream. Non-tool raw events and internal metadata are
excluded. The ordinary protocol stream is unchanged.

- A test written first failed because no complete tool-output stream existed.
- The same test passed after capture was implemented, including long Unicode
  output, input/output correlation and exclusion of internal/non-tool content.
- A fresh native Terra experiment preserved all six source documents exactly
  and all 18 markers. The source-difference guard confirmed no runner changes
  outside capture and its opt-in flag.
- Filesystem/network and MCP preflight remain inherited and unchanged.

Evidence is retained beneath the private run
`2026-09-06-loopback-permissions`:

- `stdout-observability-terra-appserver-01/marker-AUDIT.json`
- `stdout-observability-terra-appserver-03/capture-AUDIT.json`
- `stdout-observability-harness-capture-01/unit-checks.json`
- `stdout-observability-harness-capture-01/audit-native-capture.mjs`

## Qualification boundary

This establishes capture for the tested client and configuration, not a stable
public API guarantee. A custom execution call may contain several shell
operations; correlate actual returned bytes rather than assuming one raw event
per command. Older missing outputs remain unverified. The affected Lite
implementation is repeated from its exact planning snapshot in a fresh context.
This diagnostic does not count as a stable full workflow-matrix pass.
