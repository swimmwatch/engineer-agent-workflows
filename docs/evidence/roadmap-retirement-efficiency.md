# Roadmap retirement efficiency evidence

Date: 2026-10-20. Measurements use isolated synthetic products and Node 24.20.0.
They do not modify an installed plugin, a consuming project or global configuration.

## Change and verification

The ready generation now identifies its reviewed candidate. Bounded retirement
amendments retain that review basis and compute instruction participants instead
of enumerating every task. Cross-candidate recheck verifies retained evidence,
upstream pins, metadata and actual changes. Unchanged global participants and
unchanged shared upstream pins no longer invalidate independent policies merely
because a related task changed. Actual global policy changes still widen review.
Summaries receive fresh judgment after retirement; stage/gate assertions require
reviewer inspection and explicit scope expansion when their dependencies are
not represented in the graph.

Finding-linked corrections can identify exact document prose keys alongside
element references and the consistency finding. The corrected blocks and final
consistency remain fresh; legacy evidence is never converted into invented
semantic coverage. GFM table validation rejects detached task rows and retired
task entries before review, while preserving fenced examples. Native retirement
also preserves the task and recipients declared by the bounded instruction.

Warm reads use indexed evidence. Immutable bytes are reused only inside one
read-only source audit; later audits and mutation checks get fresh reads.
Predecessor checkpoints detect changes to mutable review/candidate records.
Full source/history audits remain at first access, consistency recording,
completion, activation and predecessor use. Used sources are verified, and no
lock removal or general recovery operation was introduced.

`product_amendment_activation_status` is read-only and accepts the original
activation arguments/context. It distinguishes the operation's published
generation from current head. Exact activation replay returns the original
operation and generation after client restart without another publication.

Verification completed:

- Full repository suite: **988 passed, 0 failed**, 231.224 seconds.
- Focused source/retirement/recheck regressions, native and public stdio paths.
- Followup of an actual synthetic stale task-count statement; one corrected
  prose block, fresh consistency, and inherited unrelated judgments.
- Inspection after a newer head exists, snapshot-stable status/replay, and
  client restart between activation and acknowledgement recovery.
- Corrupt/missing retained evidence, real global changes, exact selectors and
  source corruption between independent read audits remain covered.
- MCP lint, generation check, complete/foundation validation of all 17 skills,
  and Git whitespace checks passed. Documentation checks were rerun after
  restoring the exact ready-PRD/Technical-Design prerequisite wording.
- Six inspected consumer artifacts retained their original SHA-256 digests.
  No consumer mutation, global installation, commit or publication was performed.

## Representative measurements

The fixture has 30 original tasks, ready PRD/Technical Design pins, 120 shared
PRD elements, 60 shared Technical Design elements and 594 shared constraints.
After retirement it has **212 semantic blocks and 814 source atoms**. Existing
TASK-0001 prerequisites remain; only TASK-0002/TASK-0005 edges to TASK-0029 are
removed. Responsibilities stay in existing TASK-0001/TASK-0003. No task is
renumbered or completed by retirement.

Initial fixture construction and its ready baseline review are excluded from
the measured amendment window. The bounded final run includes a detected stale
30-task summary, correction to 29, followup, fresh consistency, activation,
status inspection and exact replay after client restart. The full-review
baseline has no correction cycle, so the wall comparison is conservative about
the extra work in the bounded scenario.

| Metric | Full-review baseline | Bounded retirement plus correction |
| --- | ---: | ---: |
| stdio amendment wall time | 182.896 s | 123.716 s |
| Fresh block judgments | 212 | 36 + 1 correction |
| Retained judgments at retirement / correction | 0 | 176 / 211 |
| Unique source atoms delivered for retirement | 814 | 180 |
| Source atoms reread for correction | Not applicable | 1 |
| Block portions | 452 | 86 + 1 |
| Consistency portions | 31 | 11 + 8 |
| Public tool calls | 745 | 195 |
| Complete MCP result bytes | 5,704,890 | 1,382,921 |
| Structured result bytes | 2,658,161 | 647,496 |

This removes 550 tool round trips and about 76% of result bytes. In this run the
wall time falls about 32%, including the bounded run's additional correction.
The observed full-route duration is the measured reference, not a promised
human/model session deadline. Correctness tests assert scope and integrity,
not a hardware-dependent millisecond threshold.

Native measurements call the same published tool handlers without stdio:

| Native measurement | Full route | Bounded before audit-local reuse | Bounded final |
| --- | ---: | ---: | ---: |
| Wall time | 128.638 s | 126.009 s | 120.706 s |
| Immutable object validations | 56,527 | 91,359 | 70,046 |
| Object bytes read | 1,498,628,057 | 518,346,813 | 472,921,149 |
| Cumulative object-validation duration | 61.227 s | 84.084 s | 65.521 s |

The two bounded columns perform the same retirement and correction. Audit-local
reuse removes 21,313 repeated object reads. The bounded workflow still performs
more small object validations than one full review because it audits historical
inheritance and performs an extra correction review; this cost is not hidden.
Object-validation timing covers path/file checks, reads and digest verification
inside `readObject`. It excludes mutable-record reads, schema parsing and other
native work. Durations are cumulative and can overlap; do not subtract them
from wall time as if they were exclusive CPU categories.

Compact JSON records with counts and per-tool aggregates are adjacent to this
report. The full-route stdio baseline was captured before local source-read
reuse. Measurements are individual runs, not a statistical latency guarantee;
the separate native/stdio runs do not justify attributing their difference
entirely to transport.

An additional instrumented stdio run matched all **195 tool responses** with
server-side profile records: 111.072 seconds wall time, 70,046 immutable-object
validations, 472,921,149 object bytes and 67.025 seconds cumulative object
validation. Server protocol-envelope JSON encoding took 1.598 milliseconds;
final JSON-RPC response encoding took 1.620 milliseconds for 1,389,937 wire
bytes. Thus response JSON encoding was not the dominant cost in this fixture.
Those timers do not include canonical source/ledger construction or hosted
compression. Client-side encoding used only to count result sizes took
7.305 milliseconds and is a separate measurement overhead. See
`roadmap-retirement-efficiency/profiled-stdio.json`. Different wall times across
these individual runs are not evidence that instrumentation accelerates work.

## Reproduction and limits

Run the build first. Each command creates and cleans its own temporary product:

```bash
retirement_results="$(mktemp -d)"
npm run build
node scripts/benchmark-roadmap-retirement.mjs "$retirement_results/full.json" full stdio 30 --representative
node scripts/benchmark-roadmap-retirement.mjs "$retirement_results/bounded.json" recheck stdio 30 --representative --findings
node scripts/benchmark-roadmap-retirement.mjs "$retirement_results/native.json" recheck direct 30 --representative --findings
node scripts/benchmark-roadmap-retirement.mjs "$retirement_results/profile.json" recheck stdio 30 --representative --findings --profile
```

`--profile` preloads instrumentation only into the isolated benchmark server.
It reports server-side protocol-envelope/JSON-RPC response serialization and
source-validation counters through a separate stderr channel, without source
contents or paths. Normal MCP stdout and published response budgets remain
unchanged. The public regression checks that every measured tool response has
one matching profile record.

Scripted judgments are simulation, not independent semantic certification.
There was no new live model author/reviewer trial. The original incident's
63m59s human/agent wall interval included overlapping author/reviewer work,
document mistakes, repeated full review and a lost activation answer. Its
native/transport/model components cannot be reconstructed precisely from yielded
cells. These measurements therefore do not promise a 124-second interactive
session. Hosted tool compression and transport failures are outside the stdio
fixture; the supported inspection/replay path addresses the lost-answer case
without assuming that every transport error means rollback.
