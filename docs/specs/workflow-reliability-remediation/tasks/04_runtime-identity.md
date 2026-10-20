# I04 — Report the serving MCP build and capabilities

Status: Complete; revision 2 checks and both independent reviews passed
Dependencies: I01
Requirements: WR-009, WR-013, WR-014
Quality scenarios: Q05

## Exact inputs and preflight

- Project: this repository; specification slug `workflow-reliability-remediation`.
- source_version: `345c12557dec017f7dba829464bd36932d866eea21f42c37a1f18b40e8e988b1`
- specification_version: `c1b8042c6009a8a5522f9d5e79a5f25cd10f3104aa980f6aa02886eef49f1efa`
- review_ref: `b4668494-2caa-41fe-ae73-d756aa6082e0`

Working directory for every command: repository root. Node.js >=22.20.0 and the
repository's existing pinned dependencies are prerequisites. Before work and
completion call specification_check_state with the pinned source_version; fetch
only WR-009, WR-013, WR-014 through requirement_get using the pinned specification_version,
following every text/reference continuation. Read [C04](../contracts/mcp.md#c04--serving-runtime-identity) and only the named entries in [quality/scenarios.yaml](../quality/scenarios.yaml).
These versioned contracts, not chat history, are the acceptance inputs.

Require a usable Git worktree with readable status and scoped tracked, staged and
untracked evidence. No clean tree or existing commit is required. Capture the
pre-edit state, preserve unrelated changes and reverify the source passages below.
Dependency readiness means recorded passing acceptance evidence for I01, not merely a checked label or a commit.
Also update only this packet's execution evidence, todo.md and current handoff.md.

## Outcome, boundary and scope

Owner: Build identity, bootstrap and read-only runtime diagnostics.
Allowed production ownership: `src/server.ts`, `src/main.ts`, proposed `src/runtime-info.ts`, package build scripts/package.json, `src/product/bindings.ts` capability integration, root product schema and packed/stdio tests.
Paths beginning src/, test/ or test-support/ in this packet are relative to
packages/engineer-agent-workflow-mcp/; all other paths are repository-relative.

Evidence to reverify: `packages/engineer-agent-workflow-mcp/src/server.ts:96` advertises 0.0.0-development. `packages/engineer-agent-workflow-mcp/src/product/bindings.ts:843` reports product capabilities. `packages/engineer-agent-workflow-mcp/package.json:19` owns the package build; `packages/engineer-agent-workflow-mcp/test/packed-artifact.test.mjs` exercises shipped artifacts.

Implementation boundary: Embed a deterministic build stamp from the compiled executable/schema set into a build identity module; exclude only the identity payload itself from its digest domain. Load and freeze identity with the serving process. Report package, build and contract identities via workflow_runtime_info; do not hash the mutable checkout on each request. Validate coherent packaged artifacts and explicitly mark missing/mixed development metadata unavailable. Expose current registry capabilities, without platform paths or automatic restart/install. Keep build-step ownership in the package, not a new lifecycle CLI.

Non-goals: unrelated worktree changes; changing approved behavior or scope;
global configuration, installation, commits, releases; hand-editing generated
bundles or MCP-owned workflow YAML; executing any next packet. New behavior is
not authorized until this packet is explicitly invoked.

## Test-first acceptance and proof

1. Build two isolated fixtures with the same package version and one behavior change; assert different loaded build identities and deterministic repeated builds.
2. Start A, rebuild files to B without restarting A, and show A still reports A (or explicitly unavailable for mixed startup), never B as loaded. Start B separately and compare artifacts/capabilities.
3. Validate packed contents, missing stamp behavior, schema fingerprint changes, and old-server capability absence. Compare store/global-state snapshots on every diagnostic read.
4. Write behavioral subprocess assertions before metadata changes. PROVE the stable-old-process assertion by replacing it with a current-disk lookup in isolation.

Tests to create in this packet: `packages/engineer-agent-workflow-mcp/test/runtime-identity.test.mjs`.
Run the focused command after creating its discriminating checks and before
implementation; new filenames below are planned, not currently existing scripts.
Then implement, correct code until the valid assertions pass, and run required
PROVE. For an absence/structural claim use the stated actual snapshot/counter/trace,
not a copied implementation constant. A harness/import failure is not RED proof.

```sh
rtk proxy npm run build --workspace @engineer-agent-workflows/engineer-agent-workflow-mcp
rtk proxy node scripts/run-tests.mjs packages/engineer-agent-workflow-mcp/test/packed-artifact.test.mjs packages/engineer-agent-workflow-mcp/test/product-bindings.test.mjs packages/engineer-agent-workflow-mcp/test/transport.test.mjs packages/engineer-agent-workflow-mcp/test/runtime-identity.test.mjs
```




Focused pass is necessary, not permission to skip a material shared-boundary test.
Broaden only for changed shared boundaries, new failures or unresolved evidence.
Record actual environment, commands, RED/GREEN/PROVE results and observed side
effects. A missing or failing required check keeps this packet incomplete.

## Compatibility, recovery and manual gates

Runtime diagnostics are additive and read-only. Preserve the previous package build for rollback; never modify or restart the user's installed server in this packet.

MANUAL GATE: Real global installation/restart needs separately explicit scope; isolated subprocesses are authorized packet checks.

No automatic user answer, reviewer verdict, installation or publication is allowed.
If a check fails, report the concrete next action and its established owner; when
the external owner is unknown, say so. Never assign a new duty to the user or
downgrade the required check merely to mark the packet complete.

## Completion and stop

Read back the changed state through owning public tools. Recheck the exact pinned
specification and review the scoped final diff, including staged/untracked files.
Mark this packet complete in [todo.md](todo.md) only after its required evidence
passes; replace [handoff.md](handoff.md) with the current result and next eligible
packet. Stop. Separate code/security review and commits are optional explicit
invocations, not completion or next-packet gates.


## Executed evidence — 2026-10-11

Applied installed incremental-implementation and verified its engineering manual
before writes. Git reported a usable dirty worktree; no staged changes existed.
Pre-edit source, tests, scripts and compiled artifacts were captured outside the
repository. Exact pinned MCP checks passed before work and completion.

Implemented strict-empty-input workflow_runtime_info with bounded output, the
complete serving registry and immutable startup identity. Package build owns the
deterministic stamp. The digest domain includes every compiled .js and runtime
.json artifact plus package metadata, sorted by relative path. Only the
runtime-stamp.json identity payload and embedded data literal are excluded;
validation/reporting code remains included. Type declarations are non-executable.
Startup requires embedded data, packaged stamp and artifacts to agree.
Missing, extra, malformed or mixed metadata returns unavailable with null digests
and an explicit refresh/restart requirement. The stamp is content identity,
not a signature. Diagnostic calls never recompute mutable disk identity.

Actual environment: Linux, Node v24.20.0. Behavioral RED ran real subprocesses
before implementation and failed at "the serving MCP must advertise
workflow_runtime_info". Three tests reached that assertion. The initially absent
stamp fixture also produced ENOENT; that harness failure is not behavioral RED.

GREEN: packet focused checks passed 19/19. Packed startup verifies shipped
stamp and exact registry. Two complete builds produced byte-identical stamp
bytes (cmp, exit 0). Six runtime tests distinguish same-version executable
changes, schema changes, validation-code changes, missing/mixed/incomplete/extra
metadata and unsupported registry absence. They compare actual isolated store/
home trees and enforce existing 24 KiB structured / 64 KiB wire limits.

PROVE used isolated copies. Current-disk digests on every call failed the
running-A assertion by reporting unloaded B. A separate diagnostic read-side
write failed the home-tree digest assertion. Each exited 1 at its intended
assertion. Mutations were removed without touching production. Before/final
snapshots, exact incremental diff, hashes and logs remain in the external
/tmp/workflow-i04-evidence/ directory for independent reviewers.

Broader suite: 290 checks ran, 289 passed and one exposed I03's missing public
record_ref provenance description. Full-run coordination authorized a minimal
existing metadata-owner correction describing exact kind/id/revision. An earlier
focused run also caught I03's stale expected tool inventory and out-of-order
static capability entry. The approved name was added to the expected inventory
and the existing static entry reordered; exact equality was never weakened.

Final build and lint passed. After the metadata correction, 35/35 checks passed
across metadata, runtime identity, packed artifacts, product bindings, draft
records and stdio. The broad suite was not repeated: its sole reproduced failure
was fixed and metadata consumers plus every affected packet check were rerun.
Scoped whitespace and final pinned specification checks passed.

No dependency, lifecycle command, installed server, global configuration, commit
or publication changed. Other OS/Node combinations remain unexecuted I11 work.
The coordinator owns independent code/security reviews of this frozen source
before releasing I05.

Final test refinement checks content, directory/file metadata and
permissions (excluding read atime) around every individual diagnostic read.
The final runtime slice passed 6/6 and both PROVE mutations failed their intended
assertions again against these stricter final tests. All 71 unrelated package
baseline files were verified byte-identical before handoff.

## Revision 2 — Security P2 correction, 2026-10-11

Security review reproduced executable statements after the embedded JSON literal
that executed while retaining verified identity and the original digest. The
whole-line exclusion was incorrect. This revision supersedes the previous claim
that only payload data was excluded.

Preserved the frozen revision-1 source/test/script baseline in
/tmp/workflow-i04-revision2/before/. That directory's compiled artifacts were
not captured before the correction: later compiled bytes are explicitly stored
as green-dist-not-baseline and are not claimed as pre-edit evidence.
The installed manual verifier, usable Git worktree and exact pinned
specification checks passed again.

RED: the new actual-subprocess regression observed verified rather than
unavailable after safe executable suffix injection. An initial fixture anchor
count was wrong because the marker also occurred in normalization code; corrected
the anchor to the actual declaration. That anchor failure is not behavioral RED.

Root fix: shared replaceEmbeddedRuntimeStamp verifies the entire initializer
as one canonical JSON mapping/null and replaces only that data span. Statements,
comments, comma expressions and function calls cannot enter the excluded data
domain. Surrounding executable bytes remain hashed. Runtime validation catches
invalid declaration data and returns unavailable without crashing.
The package generator uses the same verified span and fails before overwriting
module/stamp files on malformed executable initializers. CRLF and punctuation
within quoted JSON data remain supported.

Final Linux/Node v24.20.0 checks: package build and lint passed. The runtime,
packed-artifact, product-bindings, tool-metadata and transport slice passed 29/29.
Nine runtime cases cover five executable initializer/suffix variants, generator
rejection without overwrites, CRLF/data punctuation and all earlier identity
guarantees. Two full builds produced byte-identical stamp bytes (cmp exit 0).
Generator metadata publication and coherent packed stamp tests passed.

PROVE restored the prior broad matcher in an isolated compiled copy and regenerated
its stamp. Both regression assertions failed as intended: false verified identity
and missing generator rejection. Mutation exited 1; isolated files were removed.
Correct final tests ran against unchanged production sources. Full-suite and host
generation were not repeated: no skill templates or additional shared behavior
changed; the relevant runtime/generator/public metadata checks cover this repair.

Revision 2 source/diff/hash/log evidence is in /tmp/workflow-i04-revision2/.
Checklist remains incomplete pending independent code/security review of these
frozen final bytes. The coordinator owns both fresh reviews and final disposition
of P2 before any release of I05.

## Final independent review disposition

Revision 2 passed both run-specific reviews. Code review independently passed
16/16 runtime/metadata tests and six normalization-boundary probes. Security
review passed 9/9 runtime tests and isolated original-injection/coherent-restamp
probes. Both reviewers verified all nine frozen source hashes before and after
their checks; P2 is closed and no remaining findings were confirmed. Evidence:
/tmp/workflow-i04-revision2/. Full-suite and other-platform qualification remain
owned by I11; these scoped reviews do not claim them. I04 is complete.
