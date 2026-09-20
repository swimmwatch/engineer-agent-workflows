# Decision Ledger MCP Evidence

## Scope And Provenance

The approved specification is `docs/specs/decision-ledger-mcp/spec.md`.
The user selected a separate read-only TypeScript/npm stdio artifact, retained
YAML with actual parsing, required MCP-only journal access, and replaced the
earlier maintained project allowlist with an absolute project path on every
call. Multiple specifications per project are independent sources. Client roots
support is not required, and fixed-layout validation is not an authorization
sandbox beyond process permissions.

Raw evidence and the pre-change source backup are retained in the private
durable run `2026-09-05-mcp-package.dKbdz0`. The reader and service reports record
Terra implementation checks. The independent native Sol review used CLI
0.153.2 in a fresh read-only context; scoped before/after hashes matched. No
reviewer edited implementation files. This report contains no real journal
answers or personal filesystem paths.

## Observed Failures And Corrections

| Observation | Executable regression and correction |
| --- | --- |
| A schema-valid request around 206 KB closed stdio at a 64 KiB input limit. | Real SDK transport test first reproduced CONNECTION_CLOSED. A bounded 2 MiB request buffer now accepts all filter arrays, including worst-case JSON escaping. Output limits remain separate. |
| Twelve legal 512-character filter IDs produced an unusable cursor longer than 8,192 characters. | Multi-page search asserts round-trip continuation; cursor stores the normalized query digest. |
| The parser accepted an ID that exact retrieval rejected. | A 513-character ID now fails INVALID_LEDGER; a 512-character supersession chain remains retrievable. |
| Valid mapping answers had null previews. | Search asserts the actual answer text and truncation metadata. |
| Inherited object keys corrupted state counts. | Overview tests states named __proto__ and constructor; counts use an own-key-safe container. |
| Catalog returned specification names that other operations rejected. | Real directory discovery filters with the same slug contract. |
| No packed-artifact regression existed. | npm pack inventory, extraction, entrypoint restoration proof and actual packed MCP calls are now exercised. |

Additional regressions cover source size before parsing, nested symlinks,
non-regular journals, relative projects, long real project paths, exact Unicode
record reconstruction, malformed/mismatched cursors and changed source versions.
An old root governance test forbade a lockfile. That assertion represented the
superseded dependency-free repository contract; it now verifies private root
metadata and exact workspace dependency pins against the lockfile.

## Discriminating Evidence

- Reader historical lookup mutation was caught and restored.
- Large-journal fixture has 3,102 real revisions, 37,227 lines and 899,627 bytes,
  not comment padding. One recorded parse took 324.49 ms; this is an observed
  local measurement, not a performance service-level promise. Current and
  history selection and literal matching are asserted independently.
- Temporarily disabling the compiled structured-result guard made its test
  fail (undefined isError instead of true). The guard was restored.
- Disabling the full serialized-result guard separately made the JSON-escaping
  test fail. The guard was restored.
- Disabling startup-argument rejection made the dedicated lifecycle test fail.
  The guard was restored; result/transport checks then passed 8/8.
- The archive test removes the extracted entrypoint, confirms its inventory
  assertion fails, restores it, and then runs the actual stdio server.
- SDK integration verifies multiple projects/specifications, protocol-only
  stdout, legacy handshake, read-only source hashes and bounded error output.

## Verified Snapshot And Remaining Work

At this checkpoint, root npm test passed 193/193, including 23 package tests.
Build, typed lint, foundation validation, generation consistency for 15 skills,
all three affected generated Codex skill validations and git diff --check passed.
Both repository journals were validated through real MCP overview calls; both
manifests were parsed with YAML. The root journal initially warned about a
revision whose explicit successor already existed. Only the predecessor state
was changed to superseded; both answers were preserved. Both journals now have
zero multiple-current warnings.

The packed executable uses existing ancestor workspace node_modules. A clean
isolated dependency installation is not proved by that test. Configuration
examples were checked against official [Codex MCP documentation](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)
and [Claude Code MCP documentation](https://code.claude.com/docs/en/mcp); this is
documentation evidence, not native-host behavior evidence.

Follow-up native Sol review verified six original fixes but found that the
cursor still embeds a long canonical project path. It also identified unbounded
catalog metadata fan-out. Packet 02 is reopened for discriminating regressions
and corrections. Both were reproduced and corrected: canonical project paths
are now represented by fixed-size digests; catalog uses sequential opendir with
an explicit 100,000-direct-entry limit. A real long escaped POSIX path resumes
successfully, and a private module-hook iterator exercises the actual catalog
limit without creating 100,001 files. The scoped service suite passed 9/9.
The final narrow native Sol recheck (iteration 3, CLI 0.153.2) confirmed both
corrections with no new actionable defect. Scoped before/after hashes matched;
the reviewer changed no files. Seven narrow tests and additional no-write
probes checked all cursor types, identity/version errors and iterator closure
with maximum metadata concurrency one. Packet 02 is verified again.

The subsequent root suite passed 195/195; lint, foundation, generation and
diff checks passed on this corrected runtime. This does not turn the earlier
193-test checkpoint into evidence for newer code. Its other three observations
about workflow pagination and
packet-linked context are hypotheses pending behavioral evidence, not grounds
for automatically adding more mandatory full scans.

The initial native smoke is not skill-behavior evidence. The no-reader runner
disabled project instruction loading and did not explicitly invoke the skill;
its fixture also lacked required state artifacts. The configured-reader actor
was never created because its isolated transport failed initialization. These
are harness failures; no missing-MCP fallback violation is attributed to the
skill. A separate runtime preflight and corrected fixture are required before
fresh native actors. No sandbox bypass is authorized by these failures.

The corrected attempt 7 without-reader native Sol session explicitly loaded
the copied skill and successfully ran its verifier. It named the missing MCP
prerequisite and stopped without direct journal fallback: valid bounded
missing-reader evidence. With-reader initialization and tools/list succeeded,
but the connection was already closed when the actor attempted its first
catalog/overview calls about 82 seconds later. No tools/call reached the trace.
That is unresolved transport/harness evidence, not a successful recovery or a
skill interview failure. Both actor journals, specifications and manifests
remained unchanged. No full matrix pass is claimed.

A 90-second direct replay of the exact legacy native handshake/list sequence
through the same isolated server succeeded, excluding a server/SDK/proxy idle
timeout. In a bounded fresh native comparison, direct bwrap again closed before
tools/call. A stable Node parent supervising the identical isolated bwrap child
kept the connection alive and returned two matching absolute-project overviews
around a successful sleep 15. Initial relative-path guesses were rejected as
UNSAFE_PATH; these are diagnostic actor behavior, not a specification trial.
Network isolation, read-only mounts and die-with-parent were retained. Both
recorded supervisor/bwrap PIDs were absent on readback, but no child_reaped
event was captured; reaping order and the exact kernel/client cause are not
proved. The successful launch arrangement belongs only to the private harness,
not the npm package. A fresh specification smoke is still required.

## SDK Error Boundary Follow-Up

A subsequent real-stdio RED sent four invalid 1,000-item filter arrays. SDK
McpServer validation ran before the callback and returned 245,903 bytes without
the reader's structured error. Unknown long tool names also needed the same
non-reflecting boundary. This reopened Packet 02; previous passes did not cover
this path.

The adapter now uses public Server request handlers. Advertised Zod input and
output schemas remain present; the service validates input before source access
and the adapter validates output before success. Errors have bounded stable
codes. No private SDK methods are patched. Compatibility projection uses the
public SDK API ([upstream source](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/packages/server/src/server/server.ts)).

The discriminating regression passes. Complete calls for all four tools, invalid
arrays, unknown tool names and post-error liveness also pass through raw
2025-06-18 and 2025-11-25 stdio. A separate fresh Sol code-review-and-quality
pass found no actionable issue; build, lint and 26/26 package tests passed.
Root tests passed 196/196; foundation, generation, three Codex validators and
diff check passed. Initial lint diagnostics were fixed without disabling rules.
The bare python alias was unavailable; python3 passed all three validators.
Packet 02 is verified again.

## Final-Adapter Native Recovery

Fresh native Codex 0.153.2 / Sol explicitly invoked the copied specification
skill on a valid journal exceeding 30,000 lines. It verified the resources,
called catalog and overview, searched current needs_user records and retrieved
the exact unresolved record. It found the Stable/Preview question and stopped
without inventing an answer or setting Approved. Only confirmed core guidance
was read. No shell/full-file journal fallback occurred; source, built runtime,
skill and fixture-state hashes stayed unchanged.

This proves bounded next-action recovery, not a complete gap review, multi-page
coverage, planning or Terra implementation. The successful preceding smoke is
historical, not the final runtime identity. The durable adapter-final-MUtIE3
checkpoint retains invocation, raw traffic, before/after hashes, logs and
independent review. Its stable-parent supervisor remains private harness-only
and retains bwrap controls. No global configuration changed.

Ordinary npm test and CI launch no models.
Packet 03 integration and the parent Packet 14 full workflow matrix remain
incomplete. V7 evidence is historical only; complete stable matrix passes: zero.
Claude full scenarios and actual browser 200% zoom remain unverified. No global
installation, client-setting mutation, commit, publication or Packet 10 work
was performed.
