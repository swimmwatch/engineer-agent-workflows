# Authorized execution workflow

Authorized on 2026-10-11 by the user's instruction to launch the previously
described full packet cycle. This run-specific instruction supersedes the
planning default that each packet requires a new user invocation and that
independent reviews are optional. It does not change approved product scope.

The coordinating agent selects one eligible packet at a time. An implementation
subagent explicitly applies incremental-implementation to that packet, captures
the pre-edit tracked/staged/untracked state, preserves unrelated work, and records
RED/GREEN/PROVE and all required checks. It stops after the packet.

Changes to MCP tool registration or input contracts also run the existing
`tool-metadata.test.mjs` and `product-bindings.test.mjs` boundary checks in the MCP
package, in addition to the packet's focused tests. These checks detect missing
actionable field descriptions and inconsistent capability inventories.

Separate read-only subagents explicitly apply code-review-and-quality and
security-and-hardening to the packet's final changes and relevant existing fixes.
They may review in parallel while no source writer is active. The implementer
resolves substantiated defects and reruns affected checks. Both reviews must cover
the final state before the coordinator releases the next packet. Optional style
suggestions do not expand approved scope.

An implementation checklist mark records the packet checks; progression also
requires recorded code and security review results. Missing mandatory external
evidence keeps the affected packet incomplete. Independent eligible work may
continue according to the dependency graph. Material requirements conflicts or
new user-owned decisions stop dependent work. No missing check counts as passed.

The scheduling amendment of 2026-10-16 permits I12 after accepted local I11
integration, final independent reviews and its fresh exact-input preflight; full
I11 completion is not an I12 prerequisite. Use I12's packet, checklist and current
handoff for this standalone specification; no product task identity is invented.
Preflight verifies the actual-worktree evidence domain and preserves its input
hashes. The [current local proof](../../../../artifacts/workflow-reliability-remediation/i11-current-local-revalidation/report.md)
resolves actual-tree provenance with a fresh build,86 exact package members and20/20
focused tests; it is not a repeated887-test run. I12/Q17 is complete after its fresh preflight, independent reader and final
code/security reviews. Planned documentation outputs
receive Q17 and new final reviews; preserve their preimages, including the package
README, instead of demanding full86 package equality after its authorized edit.
Unchanged83 runtime members and source/code/schema/test/generation inputs retain
separate drift protection.
Current scope amendment2026-10-19: external Q14 is cancelled / no longer required,
not passed. Retain accepted I10/Q13 generic exact-response safeguards and all Q16
native requirements. Original I12 acceptance is retained; its bounded I12-R1
docs/test/input follow-up uses the same implementation → independent code/security
review → correction cycle. Current N5 native collection and any future changed-tree
qualification remain separate exact input domains. No external service action or
new publication/rerun is authorized by this scope cancellation.

## Historical delivery and external-authority observations (superseded)

The later direct user clarification restored the four native combinations and
permitted exactly one isolated commit of the reviewed112-difference snapshot,
its new-branch push and four CI jobs. This was executed as97b8513a4ea02b690e92bb0aaf90dfab75971865;
run38942838354 failed all four acceptance jobs. That grant is consumed. I11-N1
authorizes only local reversible shared-fixture/packed-launch corrections in a
separate exact97 clone; the main owning MCP source remains authoritative. Root
coordinates independent final reviews and any authority request for a concrete
new commit/push/native rerun. No automatic retry follows a failed native run.

The separately authorized nine additional Headroom pairs also executed once and
passed bounded explicit selected-body checks.38 selectors are covered across two
run envelopes; nine historical outcomes remain uncertain. Conservative ceiling
is47 pairs/140081 bytes, and no extra functional call remains authorized. Full Q14
serving-MCP identity/automatic-path evidence remains unverified. No restart,
configuration/global-state change, credential work, package publication or global
installation is granted. Old cancellation and Linux-only snapshots remain
historical. Current failed checks and their next owners are explicit in I11 and
the current handoff; unrelated work and all prior frozen evidence are preserved.
