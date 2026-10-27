# Historical Implementation Versus Native Workflow

Status: HISTORICAL MEASUREMENT. The numbers below retain the actual comparison
with the implementation before the changes. The current variant's original
acceptance missed a managed-manifest filesystem read and used a keyword-based
omission oracle. These timing records do not qualify the repaired harness or
its new fully defined fixture corpus. A new speedup cannot be calculated by
mixing those inputs. This comparison replaced the earlier 45% figure.
The earlier figure measured sequential versus parallel scheduling of the new
workflow body, not the historical implementation.

## Actual Baseline And Workload

The historical production source was archived from commit
`4c56a8230dde21f0bbb9a8226296dddfb3369a47`, the repository HEAD preceding the
uncommitted review-throughput and native-workflow changes. Its MCP was compiled
and run from the archive in a private directory, with the existing pinned
dependencies. Production source files in the archive were not changed.

The baseline used the archived generated `completeness-review.md` instruction,
its matching shared guidance and active core-profile reference. One independent
reviewer read every detailed item, saved its own results through the original
strict-context record/batch operations, read the final complete context and
recorded consistency itself. Actual text portions were at most 1024 Unicode
code points. No new review preparation/submission operation or new workflow body
ran in the baseline. A no-model probe first verified the old MCP, old native tool
schemas and child rollback.

The current variant is the retained real `native-omission` run in
[P04 qualification](p04-qualification-result.json): three independent detailed
judges, direct saves and one fresh final judge, executing the generated workflow.
Both variants ran in isolated Harness rc.2 on the same actual
`openai-codex / gpt-6.1-sol / xhigh` route. The parent's and reviewers' request
headers were checked. The full installed web profile was not booted.

Both received the exact same synthetic specification and source texts: 26
requirements, 55 detailed review items and one final consistency item. The
fixture retains CLI-001's identifier but omits its agreed empty-input rejection.
Their specification/source SHA-256 values match. Separate fixture projects and
real MCP processes preserve isolation; the live testing-and-verification review
was not used or modified. This baseline reproduces the canonical single-reviewer
implementation, not an ad hoc manually parallelized review from another chat.

## Measured Results

The common timer runs from the parent's persisted `turn/start` through its
`turn/end`. It includes preparation, dispatch, all reviewer work, direct parent
verification and the final parent response. Both parents awaited their child
work without status polling. Synthetic authoring, runtime setup and external
post-run observers are outside this common timer. The separate driver timers
remain available; the current driver's extra external observation adds about
0.52 seconds. No model review was rerun to adjust that boundary.

| Metric | Archived implementation | Current native workflow |
| --- | ---: | ---: |
| Parent-through-completion time | 725.661 s / 12:05.661 | 456.735 s / 7:36.735 |
| Real model requests / responses | 104 | 67 |
| Model actors | Parent + one reviewer | Parent + three detailed judges + final judge |
| Detailed verdicts | 52 covered, 3 gaps | 52 covered, 3 gaps |
| Final consistency | gap | gap |
| Recorded review items | 56/56 | 56/56 |
| Review-read calls | 88 | 96 |
| Measured MCP tool calls by model actors | 106 | 116 |
| Serialized MCP response bytes to model actors | 439,875 | 618,729 |
| Provider input tokens, including cached input | 7,415,161 | 1,643,682 |
| Cached input, a subset of input | 7,259,648 | 1,443,456 |
| Uncached input | 155,513 | 200,226 |
| Output tokens | 46,781 | 62,386 |

The current run was **1.589 times faster**, with **37.06% less elapsed time**:
268.926 seconds, approximately 4 minutes 29 seconds, saved in this scenario.
This is the measured historical comparison; the earlier 45% result is only a
sequential-control result for the new body.

All 55 detailed verdicts match by item index. Both reviewers found the same
retained empty-input clause at indexes 27, 28 and 54. Final consistency also
matches. Neither models' expected verdicts nor a precomputed finding list were
included in their judging instructions. Successful persistence, exact read
receipts and complete final state were verified through the actual MCP.

The speedup did not come from fewer MCP reads or fewer response bytes: both
increased. There were 35.58% fewer model requests and work ran concurrently in
the current workflow. Actual tools/call handlers took 5,844.45 ms in the archived
run versus 5,692.19 ms in the current instrumentation. Those sums include
instrumentation/startup observers as documented in the structured reports;
they are not wall-clock critical paths or inference time. The aggregate trial
cannot isolate pagination, orchestration, instruction changes and actor layout.

Total provider input fell by 77.83%, primarily through a much smaller amount of
cached conversation history. Uncached input increased by 28.75% and output by
33.36%. Cached input and reasoning output are subsets, not extra totals.
These observations do not establish a monetary saving; no price assumption or
cost calculation was introduced. Cache-write and old server lock-wait metrics
are unavailable, not zero.

## Evidence And Limits

[Structured evidence](historical-comparison-result.json) records both actual MCP
build IDs, the archived commit, source and private-adapter fingerprints, actor
turns/steps, saved findings, exact portion sizes, real tool-call counts, provider
usage and both timing boundaries. Raw traces and session logs remain private.

There is one real sample per implementation. The current sample was retained
from the completed trial; runs were not contemporaneous, randomized or repeated.
Provider latency and cache state can vary. The result applies to this synthetic
workload and the tested Harness composition. It is not a universal percentage,
a historical Codex desktop measurement, a manual three-reviewer benchmark or
a measurement of the actual customer specification from the other chat.

The archived build, no-model transport probe and real historical review all
completed successfully. No production code changed for this comparison;
the already completed 103 current tests were not rerun for documentation-only
changes. Final disclosure, preservation, link and whitespace checks and owned
resource cleanup are recorded in the current handoff. No global installation,
shared MCP restart, commit or publication was performed.
