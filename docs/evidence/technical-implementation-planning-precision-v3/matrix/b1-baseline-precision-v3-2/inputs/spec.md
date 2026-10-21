# B1 Frozen Simulation Specification

Status: Approved

This is SIMULATION data. Authorizations apply only inside its isolated fixture.

### B1-001: Required behavior

Keep the existing help command and its exact text unchanged. Add validate <file>, emitting a JSON array of {id, amount} records after validating the complete UTF-8 input.

### B1-002: Required behavior

Input is zero or more LF-separated rows id,amount, optionally ending with one LF. Each id matches [A-Za-z0-9_-]+ and is unique within the input. Each amount is ASCII decimal digits representing a nonnegative safe integer. Malformed, duplicate or invalid records make either data command exit 2 with empty stdout and INVALID_INPUT on stderr; never emit a partial result.

### B1-003: Required behavior

Add summarize <file>, emitting JSON {count,total} using the same row validation contract as validate. Empty input produces [] for validate and {count:0,total:0} for summarize.

### B1-004: Required behavior

Use dependency-free Node.js. Delivery has two packets: shared validation and validate first, then summarize consuming that same validation contract. Preserve unrelated fixture content and existing compatibility. No commit, installation or external action is authorized.

### B1-005: Required behavior

Aggregate totals must be emitted as exact JSON integer tokens without rounding, including sums above Number.MAX_SAFE_INTEGER. For amounts 9007199254740991 and 2, summarize must emit count 2 and the numeric total token 9007199254740993. The implementation architecture is not prescribed.
