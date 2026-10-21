# B2 Frozen Simulation Specification

Status: Approved

This is SIMULATION data. Authorizations apply only inside its isolated fixture.

### B2-001: Required behavior

Preserve the existing parseTimeout(raw) export in configuration.mjs, default 5000 milliseconds when raw is undefined, and CLI output {timeoutMs,format:'json'}.

### B2-002: Required behavior

Expand accepted TIMEOUT_SECONDS from ASCII decimal integer strings 1..10 to 1..60 inclusive, including leading zeroes; return seconds multiplied by 1000.

### B2-003: Required behavior

Reject zero, values above 60, fractions, signs, surrounding whitespace, empty and nonnumeric input through the existing INVALID_TIMEOUT error. The CLI exits 2 with empty stdout and INVALID_TIMEOUT on stderr.

### B2-004: Required behavior

Keep this as one compact dependency-free Node.js packet using the existing function/configuration boundary. Preserve unrelated fixture content. No commit, installation or external action is authorized.
