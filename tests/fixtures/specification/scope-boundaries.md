# Specification Boundary Scenarios

All requests and answers below are SIMULATION data, never actual customer
consent. Run model probes explicitly, outside `npm test`. Give a fresh actor
only the current skill, the applicable raw request/state, and this simulation
restriction. Do not give the actor the evaluator criteria or previous results.
Ask for its next customer response and intended reads/tool calls; stop at the
first unresolved customer choice. These probes test instructions, not real
native-question delivery, implementation, or a completed specification review.

## B01: Compound request

Request: Specify paid subscriptions and payment, limited-use promotion codes,
accounting report exports, and colleague invitations with roles for our existing
web/API service. Linux servers, current Chrome and Firefox, and PostgreSQL are
established. No other decisions have been made.

Evaluator: Explain independent outcomes and propose a compact split with a
recommended first outcome before detailed interviewing or profile reads. Ask
which boundary to select; do not choose silently or create sibling specs.

## B02: One cross-surface outcome

Request: Specify editing notification preferences in our existing web screen
and API. Both edit the same persisted value; stale updates must be rejected and
the screen must retain the saved value after rejection. Existing supported
platforms and authentication remain unchanged.

Evaluator: Keep one observable outcome across UI/API/storage; proceed to ordinary
depth/profile confirmation without a decomposition question. Preserve conflicts,
authorization and failure handling; do not split by technical layer.

## B03: Small request

Request: Specify collapsing repeated spaces in our existing CLI status report.
Preserve tabs, line breaks, empty input, options, exit codes and current supported
platforms. No other feature is requested.

Evaluator: Keep one bounded scope, normally Lite/core, without a new mandatory
intake questionnaire, product roadmap, or extra documents.

## B04: Explicit retained scope

State: The original request is B01. The assistant explained a split. The actual
simulated answer was: "Keep all four outcomes in this one specification; they
are required for our combined launch." No depth/profile proposal is confirmed.

Evaluator: Preserve the answer and continue ordinary scope confirmation with
proportionate depth. Do not ask the same splitting question again or silently
drop outcomes. Revisit only new material evidence.

## B05: New outcome during interview

State: A Draft specification has confirmed Standard/core scope for an existing
CLI export command, with UTF-8 CSV output and preserved exit behavior. Its first
request and answers are saved. New request: "Also add scheduled background
exports and emailed download links."

Evaluator: Preserve the new instruction, assess whether it is another outcome,
ask whether to defer it or expand the current scope, and pause affected work.
Do not treat the new request alone as an answer to the boundary choice or load
new profiles. Accepted scope changes require current confirmation and full
independent review; no previous verdict transfer.

## B06: Interrupted boundary selection

State: B01 was saved verbatim. A boundary question offered subscriptions first
with the other outcomes deferred, or a user-corrected split. The question was
dismissed. There is no confirmed manifest. The session resumes with "continue".

Evaluator: Recover the pending question through MCP, retain the non-answer,
and wait for an explicit boundary answer. Do not silently select the recommended
option, confirm scope, read profiles, or draft.

## B07: Review of an explicitly narrowed request

Raw source: "Add paid subscriptions and payment, limited-use promotion codes,
accounting report exports, and colleague invitations with roles."
Saved boundary question: "Describe subscriptions and payment now, retaining
promotion codes, accounting exports and colleague invitations for later specs?"
Actual simulated answer: "Yes, subscriptions and payment now; keep the rest for
later. Payment must still handle failed and duplicate callbacks safely."
Draft requirements cover subscription/payment success, failed and duplicate
callbacks, and an explicit non-goal covering the other three outcomes. Original
source and answer are linked to the applicable requirement definitions.

Evaluator: Do not demand the deferred features in this specification. Require
the explicit answer, preserved source and non-goal coverage. A control variant
without the answer is an unsupported exclusion, not equivalent coverage. A
control variant dropping duplicate-callback handling is a real omission despite
the permitted deferral. Review still reads all protocol-required evidence.
