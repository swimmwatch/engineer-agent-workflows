# Decision Ledger MCP

Status: Approved

## Scope

A separate local TypeScript MCP package provides bounded read-only access to
versioned YAML decisions for specification, planning and incremental work.
The confirmed manifest selects Standard depth. No HTTP service, UI, database,
writer, global installation, client configuration or publication is authorized.

## Confirmed Requirements

- **PKG-001:** Build a separate npm package artifact in this repository, using
  suitable pinned packages, strict TypeScript, linting and executable tests.
  The server uses stdio; stdout contains protocol traffic only. Build and
  packaging must not include tests, journals, private logs or machine state.
- **SOURCE-001:** Support multiple projects and multiple independent
  specifications per project. Every journal query identifies its project and
  specification; identical decision IDs across journals never collide. Do not
  require a manually maintained project-directory allowlist. Each call accepts
  an absolute project path supplied from the agent's active working context.
  The server may read matching journals anywhere its process permissions allow;
  this is not a project authorization sandbox. It never discovers projects by
  scanning the disk and does not depend on client MCP roots support.
- **READ-001:** YAML stays authoritative. Parse the actual selected source with
  a real parser and validate identity/revision structure. Return a bounded
  overview, filtered current decisions, or exact requested decision/history
  portions rather than the entire journal. Discovery must not read every
  journal. Provide explicit continuation and source-version evidence; malformed
  sources, stale continuation and incomplete results are not successful empty
  searches. Preserve valid legacy optional fields and retired decisions.
- **FLOW-001:** The three dependent workflows require a callable matching MCP
  interface for journal work. If absent, stop that work without shell querying,
  full-file loading or installing/configuring anything. Keep host-native
  question tools and selective profile loading. Review coverage by enumerating
  all current decisions in bounded batches, not by assuming a search is complete.

## Source And Integrity Contract

- **SAFE-001:** Only fixed `docs/specs/<specification>/decisions.yaml` paths beneath
  the supplied project are readable. Reject relative project paths, invalid
  specification names, symlinks beneath the canonical project, non-regular
  journals and changed-file reads. Do not accept arbitrary file paths, write
  methods or network destinations. Canonicalizing the supplied project itself
  is permitted. Native local processes capable of mutating the directory tree
  concurrently are outside the server's authorization boundary; client-selected
  paths and static symlink escapes remain validated.
- **DATA-001:** Support schema version 1, positive safe integer revisions and
  unique `(id, revision)` pairs. Require the document slug to match the selected
  specification. Select the highest non-superseded revision per decision ID;
  an entirely superseded ID has no current record. Diagnose multiple remaining
  current revisions without hiding the newest record. Invalid supersedes links
  are errors. Preserve optional legacy and unknown JSON-compatible fields.
  Reject unsupported YAML tags, aliases, duplicate mapping keys and multiple
  documents, with bounded diagnostics that do not echo source text.
- **PAGE-001:** Catalog and search pages are deterministic and bounded. A cursor
  binds the project/specification, exact source version and normalized query;
  changed sources or another query cannot silently resume it. Exact decision
  retrieval may return explicitly identified JSON-text portions with continuation
  to avoid dropping long answers. Previews are marked as previews, not complete
  requirements. Repeated identical calls on unchanged sources are identical.
- **LIMIT-001:** Initially support journals up to 16 MiB and 100,000 revisions;
  reject larger inputs explicitly before full parsing where possible. Limit
  structured results to 24 KiB and full serialized MCP tool results to 64 KiB.
  Default list limit is 20, maximum 50; exact-record text portions contain at
  most 4,096 Unicode code points. Do not expose partial parse results as success.
  Verify a synthetic journal exceeding 30,000 lines and record measured latency
  and output size without claiming a universal timing guarantee.
- **COMPAT-001:** The separate package works through standard MCP stdio in both
  clients without host-specific protocol forks. `standalone` remains a statement
  about sibling skill dependencies, not absence of external tools. The three
  workflow skills explicitly declare their mandatory decision-reader dependency;
  no Prompt MCP requirement is reintroduced. Client registration and publication
  remain separately authorized actions.

## Evidence And Gap Review

The user confirmed Standard scope, the separate TypeScript artifact, multiple
projects/specifications, MCP-only access and per-call project paths. Native Codex
0.153.2 did not advertise roots and returned an empty roots list; the selected
interface does not rely on that capability. Valid YAML parsing, answered choices,
scope consistency and user/operator/implementer/tester/security/maintainer gap
review are separate from subsequent implementation and host trial evidence.

## Acceptance Direction

Tests must exercise actual YAML parsing, multiple project/spec identities,
revision selection, large journals, bounded results, stale source detection,
filesystem denial, read-only operation, stdio protocol calls and packed-artifact
execution. The MCP dependency must be tested independently from source wording.
Model workflow trials and full Packet 14 stability credit remain separate.
