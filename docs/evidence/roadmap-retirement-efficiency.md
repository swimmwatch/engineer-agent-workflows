# Roadmap retirement efficiency evidence

Date: 2026-10-20. Measurements use isolated synthetic products and Node 24.20.0.
They do not modify an installed plugin, a consuming project or global configuration.

For the subsequent server optimization and repeated samples, see
[Source-audit follow-up](#source-audit-follow-up).

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

## Source-audit follow-up

The follow-up preserves the same retirement, reviewer and activation protocol.
Exact immutable reads, YAML/JSON and Markdown parsing, full generations,
reconstructed review inputs and predecessor audits are reused inside one source
audit. PRD and Technical Design share one fully validated lineage pass. Roadmap
uses the document loader's snapshot while retaining its additional registry
validation; hydration never substitutes a different validation contract.

Transaction entry and immutable writes discard preflight reuse. Under-lock
checks start fresh audits, and mutable candidate/review/head/binding checkpoints
remain in place. Metadata-only inspection cannot satisfy a full generation audit.
Memoized history retains cycle and depth checks. Independent generation reads
run in groups of four, preserving source order and waiting for every current
read before surfacing an error. No persistent cache, migration, public MCP schema
change or new recovery authority was added.

### Repeated measurements

Three native and three instrumented stdio samples were completed before and
after, sequentially in isolated temporary stores. The before snapshot is commit
`c1f55dc`; the after snapshot contains this uncommitted
source-audit change. Both use Node v24.20.0 and the same 30-task fixture
with 594 shared constraints. Initial fixture construction and its ready baseline
review are excluded. The measured window includes responsibility redistribution,
two unlinks, retirement, review, a detected prose finding in the synthetic fixture and its correction,
followup, activation, inspection and exact replay after client restart.

All **12** comparison samples completed. Superseded development measurements
are excluded. The earlier single native result of 120.706 seconds remains above
as historical evidence; the newly reproduced before median is the comparable
reference for this follow-up. Tests and measurement series were not run together
in the final after series.

Values below are seconds: **median (minimum–maximum)**.

| Measurement | Before | After |
| --- | ---: | ---: |
| Native whole scenario | 105.102 (103.863–109.664) | 69.426 (61.467–74.337) |
| stdio whole scenario | 107.067 (106.121–108.410) | 69.402 (66.991–80.890) |
| Native retirement tool | 5.593 (4.960–5.933) | 1.769 (1.471–2.011) |
| stdio retirement tool | 5.219 (4.928–6.115) | 1.729 (1.713–2.370) |

The native scenario median falls **33.9%**, and stdio falls
**35.2%**. These are local server/protocol measurements with scripted
judgments, not a deadline or a measured live-model session.

Native per-stage medians, in seconds:

| Stage | Before | After |
| --- | ---: | ---: |
| Prepare amendment | 2.650 | 1.307 |
| Redistribute responsibilities / accept edit | 6.328 | 2.937 |
| Unlink two obsolete edges | 10.988 | 3.588 |
| Retire task | 5.593 | 1.769 |
| Retirement review | 34.467 | 29.565 |
| Correct prose | 3.490 | 1.669 |
| Followup review | 31.065 | 21.174 |
| Activate | 9.611 | 4.155 |
| Inspect activation | 0.844 | 0.294 |
| Exact activation replay | 0.594 | 0.292 |

Per-stage medians need not sum to the whole-scenario median. The latter also
includes client restart, local edits and benchmark orchestration between calls.

| Native source metric, median per scenario | Before | After |
| --- | ---: | ---: |
| Immutable object validations | 70,046 | 60,477 |
| Object bytes read (MB) | 472.921 | 436.202 |
| Cumulative object-validation time (s) | 60.983 | 72.279 |

Object validations fall **13.7%**. This counter measures `readObject`
validation, including file/path checks, bounded reading and digest verification;
it does not count every generation-metadata or mutable-record read. Cumulative
source durations overlap under parallel I/O and can increase while latency
falls. They must not be subtracted from wall time or treated as exclusive CPU
time. Fresh checks at separate transaction
phases intentionally remain; remaining source and operation-history validation
cost is visible in the per-tool records.

The first after-native sample records these audit-local executions and reuses:

| Input / validation kind | Executions | Reuses |
| --- | ---: | ---: |
| `generation-full` | 80 | 39 |
| `generation-metadata` | 603 | 544 |
| `parse-yaml` | 36,627 | 508 |
| `object` | 59,753 | 9,177 |
| `parse-json-utf8` | 20,274 | 18,607 |
| `parse-markdown` | 90 | 67 |
| `roadmap-lineage` | 3 | 0 |
| `parse-json-buffer` | 6 | 0 |
| `review-inventory` | 32 | 7 |
| `review-audit` | 202 | 0 |
| `review-basis` | 30 | 5 |
| `review-evidence` | 20 | 0 |

Kinds are separate contracts: strict UTF-8 JSON parsing does not borrow the
Buffer-decoding parser's result, and full generation audits do not borrow a
metadata-only success. Before-version parser/reuse counters were unavailable;
no retrospective count is inferred. Each compact sample records per-tool and
per-stage costs, native source counters and available stderr profiling counters.

Protocol work is unchanged: **195 calls**, **212 blocks / 814 atoms**, **36 + 1**
fresh judgments, **176 / 211** inherited judgments, **180 + 1** source atoms
delivered for retirement/correction, **86 + 1** block portions and **11 + 8**
consistency portions. Complete stdio result bytes remain
**1,382,921**. Reviewer evidence and response budgets are preserved.

Response-encoding medians across the stdio samples, in milliseconds:

| Measurement | Before | After |
| --- | ---: | ---: |
| Server protocol-envelope JSON encoding | 1.660 | 1.735 |
| Server JSON-RPC response encoding | 1.640 | 1.781 |
| Client encoding used to count result sizes | 7.349 | 7.191 |

These response timers exclude canonical ledger construction and hosted tool
compression. Client size-counting time is benchmark overhead.

### Verification

- Discriminating RED/GREEN checks cover full-generation and parser reuse,
  metadata/full-audit separation, cross-store isolation, transaction invalidation,
  corruption after preflight, bounded predecessor audits and bounded parallel I/O.
- A regression preserves the Roadmap-specific registry checks when document
  hydration is reused. Parallel failures retain source order and close sibling
  reads before returning.
- Full suite: **999 passed, 0 failed**, 197.644 seconds. Existing
  missing/corrupt evidence, incompatible history, source changes, inheritance and
  concurrent candidate/predecessor cases remain covered.
- An additional public stdio scenario starts with **101 tasks** and verifies the
  exact **100** remaining identifiers after TASK-0029 retirement, prose correction,
  activation, inspection and replay. TASK-0101 and all other surviving identities
  remain unchanged. This size/identity check uses the small upstream fixture
  without the 594-constraint stress workload; its duration is not a latency
  comparison. Its compact result is `source-audit-public-101.json`.
- MCP lint, generation check and complete/foundation collection validation pass.
  No consuming project, global installation, commit or publication is changed.

No new live model author/reviewer trial was performed. Model reasoning time and
hosted transport/compression are outside this benchmark. Semantic correctness
still requires an independent reviewer. Reproduce each sample with the existing
benchmark command above; use `recheck direct 30 --representative --findings` or
`recheck stdio 30 --representative --findings --profile`, three times each. The
additional identity check uses `recheck stdio 101 --findings --profile`.

See `roadmap-retirement-efficiency/source-audit-summary.json` and the twelve
`source-audit-before/after-native/stdio-N.json` compact sample records.

## Independent model qualification

Date: 2026-10-20. The no-live-trial statements above describe the earlier
scripted timing runs. A separate independent model qualification was subsequently
performed on Node 24.20.0 with the current implementation. Its judgments were
made by a real reviewer model in a fresh child context, separate from the author;
they were not generated by the benchmark's automatic `covered` loop. No model
override was requested. This is a semantic qualification, not another latency
sample or a statistical quality comparison.

The author created an isolated Roadmap with 30 meaningful tasks, three shared
policy decisions, two consumers with dependencies on TASK-0001/TASK-0029, and
pinned Idea, PRD and Technical Design elements. The simulated instruction retires
TASK-0029, moves both-host release checks to TASK-0001 and integration-agreement
ownership to TASK-0003, and removes exactly two obsolete dependency edges.
The fixture uses Standard/core; its upstream readiness and product-owner intent
are seeded test prerequisites, not production consent or live product evidence.

The qualification driver uses public stdio MCP tools for review, source delivery,
edits, retirement, scope expansion, activation, inspection and replay. It exports
complete delivered source portions to files. The reviewer reads these exact
sources and supplies per-block explanations and counterexamples. The driver
records those genuine judgments with the delivered receipts and obtains a
separate consistency ledger for the reviewer's fresh whole-artifact judgment.
It never chooses a semantic verdict automatically.

### Results

| Phase | Fresh block judgments | Inherited blocks | Independent result |
| --- | ---: | ---: | --- |
| Initial full review | 35 | 0 | All covered; fresh consistency covered |
| Retirement before reviewer expansion | 8 pending | 26 provisional | Reviewer requested three additional blocks |
| Retirement after expansion | 11 | 23 | Six gap judgments; fresh consistency gap |
| Corrected followup | 6 | 28 | All covered; fresh consistency covered |

The author withheld two semantic negative controls from the reviewer: the
document still claimed 30 active tasks after retirement, and the transferred
task outcomes omitted credential-absence checking and its agreement policy.
The reviewer independently found both problems. It gave concrete counterexamples
in which invocation metadata passes while credentials remain in a host bundle,
and in which the agreement describes invocation but omits the required full policy.
These led to six affected block findings, including consumers and a shared
constraint, rather than six independently planted defects.

The reviewer also requested public `product_review_scope_expand` for TASK-0004,
TASK-0010 and TASK-0015 because its earlier explanations had relied on TASK-0029.
Those three inherited blocks became pending and received fresh judgments.
The remaining 23 independently scoped blocks retained their earlier judgments.

Resolved upstream source text was fetched through `product_sources_get_batch`
using the actual saved ready context. TD-0001 explicitly requires credential
absence checks in template validation and the same complete policy in the
integration agreement. Baseline initially reviewed the upstream pins as seeded
prerequisites; actual source resolution occurred before retirement judgments.
The reviewer recorded a retrospective baseline source check without rewriting
historical verdicts.

The table and activation gates also behaved as intended:

- A retired TASK-0029 row left in the Markdown task index blocked review with
  `BROKEN_REFERENCE`. Removing that row preserved TASK-0030 and the remaining IDs.
- The completed independent gaps review blocked activation with `REVIEW_REQUIRED`;
  the driver asserted that head bytes did not change.
- Correcting only the document count and TASK-0001/TASK-0003 outcomes allowed
  finding-linked `followup`. All six prior findings, including the unchanged
  TASK-0015 block, received fresh judgments; no prior gap was hidden by inheritance.
- After independent consistency became covered, activation succeeded. A new
  client/server process inspected and replayed the original request/context.
  Both returned operation `0f4ad08e-4011-5291-9101-384d61b2a615` and generation
  `5e48e7e871c751d9ede97052615cb8d759eb9b572c73f7c2041adbac555b2b15`.
  The replay asserted unchanged head bytes and an identical saved result.
- An additional full load of the published generation verified the exact 29
  surviving task identifiers, including TASK-0030, the two retained
  TASK-0002/TASK-0005 → TASK-0001 dependencies, and all three unchanged upstream
  object digests.

The lost-response exercise deliberately discards the first acknowledgement for
recovery purposes after saving it as a test oracle. It does not simulate an
uncontrolled network outage. Every driver command starts a new stdio server.

### Procedure corrections and limits

All 63 public tool attempts, including nine rejected attempts, are retained.
The rejected attempts include three observations of the invalid task-table row,
an unsupported `weak` verdict supplied under an incorrect author instruction,
a premature consistency request, a ready-source request using candidate context,
the intentional activation-with-gaps check, and two incomplete correction maps.
The reviewer independently reclassified `weak` using the published verdict enum;
the source request was retried with the saved ready context. The local publication
assertion also initially selected a nonexistent document `artifact` field; the
driver was corrected to select the exact retained document ID, and the assertion
then passed. No production validation was changed to make these checks pass.

The correction maps initially named only edited task outcomes, then dependency
participants. The exact changed semantic blocks also carry historical TASK-0029
provenance in the transfer decision. Including those exact block references made
the existing followup valid. The generic incomplete-impact error suggests full
review even when the caller can instead complete this mapping. This diagnostic
limitation was subsequently fixed as documented below; no full restart was
needed in this trial.

This single controlled trial demonstrates detection and correction of the stated
defects with preserved semantic gates. It does not prove arbitrary future model
judgments or cross-model quality equivalence. The fixture is smaller than the
representative performance fixture. Model inference, author orchestration and
hosted transport time are not separated here and are not attributed to server
speedup. Future amendments still require an independent reviewer.

Production code was not changed during this qualification. The earlier 999-test
suite was not repeated; the new driver was executed through all stages and passed
syntax and whitespace checks. No live WellHelm, global installation, commit or
external publication was changed.

### Evidence and reproduction

[`live-model-review.json`](roadmap-retirement-efficiency/live-model-review.json)
contains exact delivered texts, real reviewer judgments and notes, final ledgers,
source hashes, correction maps, activation/replay results, identifier assertions
and the recorded tool attempts. Machine paths, opaque contexts and continuation
cursors are omitted from this retained copy. Raw sessions remain only in the
temporary qualification directories.

The isolated driver is
[`qualify-roadmap-retirement.mjs`](../../scripts/qualify-roadmap-retirement.mjs).
Build the MCP package first, then start a new temporary fixture:

```bash
qualification_dir="$(mktemp -d)"
rtk proxy node scripts/qualify-roadmap-retirement.mjs init "$qualification_dir"
rtk proxy node scripts/qualify-roadmap-retirement.mjs capture "$qualification_dir" baseline '{"mode":"full"}'
```

For each phase, an independent reviewer must read `packet.json`/`sources.md` and
write `verdicts.json` using the published verdict schema. `submit-blocks` records
the supplied judgments; `consistency` exports the exact whole-artifact ledger.
Only after the reviewer writes `consistency-verdict.json` may `complete` record
that independent consistency judgment. `amend ... negative-control` creates the
two semantic controls and intentionally leaves the retired table row for
`assert-table-rejected`. `edit` accepts explicit replacement pairs; `capture`
accepts an `@file` containing the exact recheck/followup arguments. `refresh`
exports newly pending blocks after reviewer-directed scope expansion.
The recorded call arguments provide the concrete correction/expansion example.
Finally, `assert-blocked`, `activate`, `recover` and `verify-published` exercise
the relevant lifecycle assertions. None of these commands supplies model judgments.

## Followup diagnostics correction

Date: 2026-10-21. The diagnostic limitation observed in the independent model
qualification is fixed. An incomplete, repairable correction map still fails
with `PREREQUISITE_REQUIRED`, but now returns
`error.details.next_action: "complete_correction_mapping"`. Bounded lifecycle
issues identify each omitted `missing_ref` or finding-linked prose
`missing_item_key`. The caller can add these exact values to the appropriate
fixes and retry followup. Shared-block dependency participants and retained
TASK-0029 provenance are included rather than silently accepted or omitted.

The diagnostic reuses the existing common limit of 20 issues / 8 KiB, removes
duplicate references, sorts omissions deterministically and reports truncation.
It contains identifiers rather than source text or machine paths. Requests,
stored formats, error code and recovery authority are unchanged.

Unmappable changes continue to require full review. Prose keys still require a
recorded `__consistency__` finding. Rejected requests write no review state;
supplying a complete map still leaves fresh block judgments, receipts and
whole-artifact consistency mandatory.

The initial regression run reproduced two failures: the misleading full-review
message through public MCP, and absent bounded missing-reference details. The
unmappable-scope guard already passed. After the fix, related regression coverage
passes **98 tests, 0 failed**, including:

- A public stdio retirement fixture that reports missing TASK-0003 and retired
  TASK-0029 references, preserves the store on rejection, and starts followup
  when the exact returned references are supplied.
- Bounded, deduplicated diagnostics for a 30-task shared policy without reflecting
  source markers or local paths.
- Explicit missing-prose-key diagnostics followed by successful correction review.
- Continued rejection of unmappable scope changes and prose mapping without a
  recorded consistency finding.

MCP build and lint, generation check, complete and foundation collection validation
pass. The initial lint run found a missing explicit `URL` import in the new test;
the import was corrected and lint passed. The historical live-model evidence
above remains unchanged; this diagnostic fix is verified by executable regression
tests rather than a second model trial. All product fixtures are temporary.

Final full repository suite: **1003 passed, 0 failed**, 210.678 seconds. Tracked
and new-test whitespace checks also pass. No global installation, live consumer
store, commit or publication was changed.
