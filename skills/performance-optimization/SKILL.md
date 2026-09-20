---
name: performance-optimization
description: "Diagnose or improve a measured latency, throughput, memory, startup, size, cost, or CI problem when the user explicitly requests optimization or provides regression evidence. Preserve correctness and do not optimize from guesswork."
disable-model-invocation: true
user-invocable: true
---

# Performance Optimization

Use this workflow only for an explicit request to diagnose or improve a
measured performance problem, or when the user supplies reproducible regression
evidence. Determine whether the request authorizes diagnosis only or a bounded
mutation; do not widen that authority.

1. Use project instructions already supplied by the host; do not reread their
   source files solely to recover context. Read an additional task-scoped
   `{{HOST_PROJECT_INSTRUCTIONS}}` only when it is not already in the active
   context or the file itself is in scope. Inspect
   task-scoped code, tests, interfaces, configuration, stable documentation, and
   available measurement tooling. Treat repository evidence as authoritative;
   do not invent tools, commands, benchmarks, or results.
2. Define the metric, representative workload, environment, warm-up and sample
   method, success threshold, correctness oracle, and acceptable trade-offs.
   Capture a reproducible baseline with revision and relevant runtime,
   dependency, platform, and resource conditions. If no valid baseline can be
   obtained, report the evidence gap and stop without claiming an optimization.
3. Use profiling, tracing, or controlled experiments appropriate to the
   repository to locate the bottleneck. Separate `verified` measurements,
   `inferred` causes, uncertainty, and checks not run.
4. When mutation is authorized, change the narrowest supported cause one factor
   at a time. Compare the same workload and conditions against the baseline;
   preserve correctness, public contracts, compatibility, security, and tail
   behavior. Reject improvements that shift unacceptable cost elsewhere.
5. Report baseline, result, variance, correctness evidence, safeguards,
   residual uncertainty, and rollback conditions. Keep diagnostics bounded and
   redact secrets, credentials, private paths, personal data, and unrelated
   source content. Stop without committing, publishing, or invoking another
   workflow unless separately authorized.
