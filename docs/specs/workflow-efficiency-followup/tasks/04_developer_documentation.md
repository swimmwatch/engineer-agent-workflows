# P04: Developer Documentation

## Technical proposal

Requirements: WFE-001, WFE-002, WFE-003, WFE-004, WFE-005, WFE-006, WFE-007, WFE-008. The shared technical boundary in `plan.md` is binding. Complete P03 before documenting the verified behavior.

Extend the existing `docs/product-workflows.md` near its review and efficiency guidance. Document serial pending-only traversal, why an unchanged returned scan index is valid, complete item versus complete page, source-reuse boundaries, distinct owning validation/read-back, and recovery/observer status. Link the evidence report without duplicating transient measurements or packet history. Explain platform qualification limits and synthetic versus actual-agent evidence. Keep workflow instructions authoritative in their existing shared references; this document explains the implementation rather than introducing a competing process or public contract.

A separate documentation packet is warranted because a retained scan index/terminal page can look like a defect, the freshness/receipt rules are costly to reconstruct, and the behavior crosses agent instructions, consumer loops and MCP validation. Validate examples against the verified implementation and use a reader who did not author the change to answer concrete continuation, freshness, recovery and evidence questions. This bounded documentation comprehension check is not an independent code/security-review gate. Do not add new runtime behavior, vocabulary, scripts, dependencies or installation changes.

## Technical agreement

Status: Agreed; current exact `planning_packet_check` returned `ready` with no issues.

- Selected `proposal_id`: `existing-developer-docs`.
- `packet_id`: `P04`.
- `proposal_digest`: `dbd3bbc851d10852c67245911918f837d9f535aea72fa502209d16b84486677f`.
- `agreement_ref`: `{"id":"85c06a5f-eb9c-4edf-9693-3a00b727b345","revision":2}`.
- Managed answer: revision 2 of `85c06a5f-eb9c-4edf-9693-3a00b727b345`. Reused the actual original answer from decision 2f4127eb-0121-457e-bf2f-1625a0cd88f6 revision 5 after MCP confirmed identical proposal digests. This is historical-answer reconciliation, not a new human response.
- Bound sources: `plan.md` / `Shared technical boundary`; this packet / `Technical proposal`.
- Agreement does not authorize execution, commit or publication. Original packet dependencies remain mandatory.

## Execution inputs

- Specification: `../spec.md`, Approved; Standard/core; no extra profile/design artifact.
- `source_version`: `76293b6d3f506fb927801c3b5f2bbd926b2ed0e03b82208d650ac98ff73af853`.
- `specification_version`: `b6b5db5ac1c359ed36ddcbce59d398ec3e4f49e993e1e14e4d9bd554fc764ff1`.
- `review_ref`: `63aeeff2-66e1-4eb9-bdc8-e624ec02fe52`.
- Working directory for commands: repository root. Recheck repository-relative evidence before execution.
- Require a usable Git worktree with readable tracked, staged and untracked state, the complete matching workflow bundle, local Node/npm and separately authorized execution of this exact packet. A clean tree or an existing commit is not required.
- Check required local runners before bulk reading. The planning host reports Node.js 24.20.0 and codex-cli 0.163.0; this is discovery evidence, not qualification of the pinned Linux runtimes or model capability.
- Before edits and before completion, use `specification_check_state` with the pinned source version and `planning_packet_check` with the actual accepted agreement reference and proposal digest. Use the accepted agreement reference and exact proposal digest recorded above.

## Outcome, prerequisites and scope

Give maintainers a concise explanation of verified progression/reuse/recovery behavior. Requires completed P03 and its integrity-checked report; documentation must not turn missing qualification into a success claim. Allowed production path: `docs/product-workflows.md`; link the existing shared instructions and new evidence report. This packet's checklist/handoff updates are also allowed.

## Repository evidence and ownership

`docs/product-workflows.md:655` already explains pending-only reads and bounded retirement, and line 682 gives the benchmark entry point. Extend those sections rather than create another manual. Runtime/public schemas remain authoritative; shared workflow references own agent instructions.

## Acceptance and discriminating check

Before editing, define and run a reader exercise against the current document: explain (1) retained scan index after complete receipt and record, (2) why a complete batch page may still contain incomplete items, (3) when source/check reuse becomes invalid, (4) which status/read-back calls remain necessary, and (5) which outcomes the Linux/public/synthetic/actual-agent evidence proves. Record any missing/incorrect answer as the initial documentation defect; if a rule is already clear, preserve it.

After editing, a reader who did not author the change must answer all five from the document and follow its links. Check commands/examples against P03's verified invocations and the actual public schema; no runtime retest is necessary solely for prose. A reader using only author-provided answers is not this comprehension check. This is documentation acceptance, not a mandatory code/security review.

```bash
rtk proxy npm run validate
rtk proxy git diff --check
```

Also verify local Markdown targets exist and that the report does not claim macOS/Windows execution, live Claude behavior, semantic proof from synthetic verdicts or a universal latency improvement. Keep stable entry-point names; do not duplicate transient line numbers, private captures or journal history in the durable guide.

## Completion and recovery

Preserve unrelated staged/tracked/untracked work and the pre-existing response-budget correction. Inspect expected task writes, native transitions and independent external changes; never accept overlap or unknown content loss as a new baseline. Retain failed evidence and exact recovery notes. A changed source, conflict, lost acknowledgement or resume requires the applicable current check rather than reuse of stale progress.

Run the packet's required checks, compare the scoped diff with the agreed proposal, update only this packet's item in `todo.md` and replace the current `handoff.md`. Stop after the packet. Failed or unavailable required checks leave it incomplete. Revert only this packet's identified changes when rolling back; do not rewrite stored workflow history, restore another writer's files, install, commit or publish. Independent code/security review is optional and separately invoked.
