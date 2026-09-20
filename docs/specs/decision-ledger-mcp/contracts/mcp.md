# Decision Reader MCP Contract

Behavior is owned by requirement IDs in ../spec.md. This planning contract
defines the initial operation boundaries used by both hosts. All operations are
read-only, idempotent, closed-world stdio tools; no HTTP or writer is present.

## Common Inputs And Results

`project` is an absolute project path obtained from current task context, not a
configured allowlist entry. `specification` is a lowercase kebab-case directory
name of at most 128 characters. The server reads only
`<project>/docs/specs/<specification>/decisions.yaml` after filesystem validation.
No global project catalog, full-disk traversal or implicit default project exists.

Tool names below are protocol-local names; skills discover the callable host
names and current schemas rather than hard-coding MCP namespace prefixes.
Successful results include protocol version 1 and source version (SHA-256),
explicit completion/continuation information where paged, and no absolute paths
from unrelated sources. Errors carry a stable code and bounded non-sensitive
message, never YAML text, filesystem error payloads or stack traces.

## Operations

- `decisions_catalog(project, limit=20, cursor?)`: list specification names only
  under that project's docs/specs, sorted by code-point order. Inspect direct
  entries; do not recursively scan or parse journals. Include only real
  directories with a regular non-symlink decisions.yaml. Missing docs/specs is an
  empty catalog. Cursor version binds the filtered catalog and canonical project.
- `decisions_overview(project, specification)`: parse the selected source, report
  revision/current/retired counts, current counts by workflow state and structural
  warning counts. No answer text or full history is returned.
- `decisions_search(project, specification, ids?, states?, categories?,
  requirement_ids?, text?, history=false, limit=20, cursor?)`: AND across filters,
  OR within each array. Text is case-insensitive literal matching across the
  record's JSON-compatible content, not regex or executable expressions. Default
  selection is current records; history=true includes all revisions. Sort by ID,
  then ascending revision. Return bounded metadata/answer previews with explicit
  preview/truncation indicators. Return matching total and a continuation cursor;
  a complete unfiltered current scan is required for full coverage review.
- `decisions_get(project, specification, id, revision?, cursor?)`: select the
  current record or exact requested revision. Return its deterministic JSON text
  in Unicode-safe portions of at most 4,096 code points, with total length,
  offset, complete flag and continuation. History discovery uses search with an
  ID filter and history=true; get never guesses another revision on a miss.

Limits: 1..50 list items, 16 MiB source, 100,000 revisions, 24 KiB structured
result, 64 KiB entire serialized tool result. IDs are 1..512 UTF-16 code units
in both source records and tool inputs. Filter arrays contain at most 100
values of 1..512 code units each; text is at most 4,096 and cursor at most
8,192. The bounded 2 MiB stdio request buffer accommodates all schema-bounded
filters including worst-case JSON escaping. Oversized wire messages terminate
transport; output budgets are independent of the request buffer.

Oversized records remain retrievable through exact-text portions. Bound inputs
before parsing. Cursor data binds operation, normalized query digest, source
identity and version; it is continuation data, not a new authorization grant.
Malformed or mismatched operation/query/source identity is INVALID_CURSOR;
a changed version of the same source is STALE_CURSOR.

Catalog enumerates direct directory entries with bounded sequential metadata
checks and stops with SOURCE_LIMIT at entry 100,001, including non-journal
entries. It never starts unbounded concurrent filesystem work. Cursors bind
the canonical project identity through a fixed-size digest, so long valid
paths cannot make a generated cursor exceed the input limit.

## Reader Unit Boundary

`packages/decision-ledger-mcp/src/ledger.ts` owns YAML parsing and record
semantics, independent of filesystem and MCP. Exports:

- `LedgerError` with a stable string `code` and bounded message;
- `parseLedger(bytes: Uint8Array, specification: string): Ledger`;
- `searchDecisions(ledger: Ledger, filters: SearchFilters): Decision[]`;
- `findDecision(ledger: Ledger, id: string, revision?: number): Decision`.

`Ledger` exposes `specification`, raw-byte SHA-256 `version`, `decisions`,
`current` and `warningCounts`. `Decision` preserves JSON-compatible fields and
requires nonempty string id/category/state/provenance and a positive safe integer
revision. Validate known optional question/answer/evidence/requirement/status/
supersedes/rationale fields when present; null question/answer is valid.
Category, provenance and host status are not closed enums. Warn on multiple
non-superseded revisions; do not reject valid retired IDs. Return the highest
non-superseded revision and do not mutate source records in query operations.

The filesystem module owns bounded byte reads and catalog enumeration. The
service module owns cursor binding, source identity, result shaping and limits.
The SDK adapter owns MCP schemas and transport only; dependencies point inward
from transport to service to filesystem/parser, never back into host APIs.

## Failure Classes

`INVALID_INPUT`, `NOT_FOUND`, `UNSAFE_PATH`, `SOURCE_CHANGED`, `SOURCE_LIMIT`,
`INVALID_YAML`, `INVALID_LEDGER`, `INVALID_CURSOR`, `STALE_CURSOR`, `RESULT_LIMIT`
and `INTERNAL_ERROR` remain distinct. Syntax positions may be returned but source
snippets may not. MCP errors set isError; no failure is a successful empty page.

Well-formed tools/call requests with invalid tool arguments or unknown tool
names return INVALID_INPUT through the same bounded non-reflecting tool error
boundary. Malformed protocol envelopes remain SDK-level JSON-RPC errors.
The adapter uses public SDK request handlers and result projection; service
input validation and adapter output validation remain mandatory.

## Verification

Unit tests exercise actual parser and queries. Filesystem tests use isolated
projects with repeated slugs/IDs, symlink and corruption cases. MCP tests run the
actual built server through the official client and stdio, including multiple
projects/specifications in one connection. Package tests inspect and execute the
packed artifact without journal/test/private material. A real native host smoke
is recorded separately; unavailable host evidence remains unverified.
