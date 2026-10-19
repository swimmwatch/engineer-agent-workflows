# Product review efficiency contract

The executable definitions in `shared/schemas/product.schema.json` and the MCP
runtime's generated `tools/list` contract remain authoritative. This change does
not change specification completeness-review semantics.

## Inventory and persistence

- Preserve the existing artifact-specific selection of source atoms. Each selected
  atom has one primary owner; participant blocks also reference shared evidence.
  An unrelated product artifact is not silently added to the selected scope.
- New full reviews report `inventory_contract: semantic-v2`. Legacy inventories
  report `atomic-v1`. Followup retains its parent's contract. Storage version and
  inventory contract are separate axes.
- Review v2 retains immutable inventory identity, source version, review ID and
  parent, replacing `verdict_objects` with `verdict_index`. Each index entry names
  its item, object ID, object digest, verdict kind and UTF-8 byte size.
- A real write migrates legacy storage in the existing atomic review-file
  replacement transaction. Reads and exact no-op replay do not migrate. No
  retained source or verdict object is deleted or converted into invented
  semantic-block evidence.

## Batch tools

| Tool | Inputs | Result and effects |
| --- | --- | --- |
| `product_review_get_batch` | `context`, `review_ref`, `start_index`, optional `limit` (1–20) | Indexed portions and next index; no writes; at most 24 KiB for the structured envelope |
| `product_review_record_batch` | `context`, `review_ref`, `items` (1–20 exact verdict values) | One mutation result and operation reference; all members validate before any verdict is published |

Record arguments are bounded at 131072 compact UTF-8 bytes. Existing transport
checks retain the 64 KiB complete MCP response limit. A partial block has no read
receipt; continue through `product_review_get` using its cursor. Exact batch
input replays the persisted result. A reordered or overlapping batch is not an
exact retry and cannot silently overwrite prior judgment. Invalid members report
a zero-based index. Real source changes and competing writes still fail closed.

## Integrity and final judgment

Warm calls validate metadata and objects they actually use. Source and evidence
checks are repeated under the product mutation lock. Full audits run on review
open/resume, first process access, completion, activation and followup-parent use.
They verify source correspondence, verdict bodies/index agreement and fresh read
receipts. Full-audit cache entries are bounded and never survive process restart.
Corruption of untouched evidence may be detected later, but not accepted through
the final readiness/activation gate.

After judging semantic blocks, the independent reviewer records cross-block
consistency. Full semantic review provides the membership/result ledger without
redelivering every source. Corrections-only followup retains its whole-current-
artifact consistency gate. Changed shared evidence changes every participant
block's text hash; unchanged inherited judgment is never inferred from structural
validation alone.

The published runtime still has no general operation-recovery tool. An interrupted
operation retains its identity and checkpoint; affected workflow must stop for
owner/operator recovery. Internal operator recovery is tested separately from
exact replay after a lost completed response. Neither is permission to delete a
lock or retry arbitrary changed input.
